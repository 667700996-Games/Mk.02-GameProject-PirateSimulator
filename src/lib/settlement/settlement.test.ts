import { describe, expect, it } from 'vitest';
import { BUILDINGS, RECIPES, SETTLEMENT_RESOURCE_IDS } from './catalog';
import {
  beginBuildingUpgrade,
  buildingUpgradeCost,
  cancelBuildingWork,
  moveBuilding,
  placeBuilding
} from './construction';
import { createInitialSettlement } from './initialState';
import { findCachedPath, findPath, pathTravelCost, validatePlacement } from './island';
import { transportCongestionMultiplier } from './logistics';
import { scheduleLogistics } from './logistics';
import { advanceSettlement, revealIslandFromServices, settlementWeatherAt } from './simulation';
import { advanceShipConstruction, queueShipConstruction, SHIP_PLANS } from './shipbuilding';
import {
  advanceExpeditions,
  beginExpeditionCombat,
  estimateExpedition,
  prepareExpedition,
  resolveExpeditionCombatTurn,
  resolveExpeditionEvent,
  EXPEDITION_EVENTS
} from './expeditions';
import { createNewGame } from '$lib/domain/initialState';
import type { SettlementBuilding } from './types';
import { policyModifiers } from './progression';

function advanceMany<T extends ReturnType<typeof createInitialSettlement>>(
  state: T,
  seconds: number
): T {
  let next = state;
  for (let index = 0; index < seconds; index += 1) next = advanceSettlement(next, 1) as T;
  return next;
}

describe('settlement simulation', () => {
  it('defines an extensible catalog with more than forty spatial resources', () => {
    expect(SETTLEMENT_RESOURCE_IDS.length).toBeGreaterThanOrEqual(40);
    expect(Object.keys(RECIPES).length).toBeGreaterThanOrEqual(20);
    expect(BUILDINGS.shipyard?.terrainRules).toContain('coast');
  });

  it('keeps the first expedition and advanced ship supply chains reachable', () => {
    const produced = new Set(
      Object.values(RECIPES).flatMap((recipe) => Object.keys(recipe.outputs))
    );
    for (const resource of [
      'navigation-tools',
      'medicine',
      'powder-kegs',
      'cannonballs',
      'sails',
      'ship-parts'
    ]) {
      expect(produced.has(resource)).toBe(true);
    }
    const wreckage = createInitialSettlement(7, 1000).buildings.find(
      (building) => building.definitionId === 'wreckage'
    )!;
    expect(wreckage.outputInventory.medicine).toBeGreaterThanOrEqual(1);
    expect(wreckage.outputInventory.cannonballs).toBeGreaterThanOrEqual(4);
    expect(wreckage.outputInventory.powder).toBeGreaterThanOrEqual(2);
  });

  it('generates a deterministic island with coast, elevation and resource terrain', () => {
    const first = createInitialSettlement(77, 1000).island;
    const second = createInitialSettlement(77, 1000).island;
    expect(first.tiles.map((tile) => `${tile.terrain}:${tile.elevation}`)).toEqual(
      second.tiles.map((tile) => `${tile.terrain}:${tile.elevation}`)
    );
    expect(first.tiles.some((tile) => tile.terrain === 'forest')).toBe(true);
    expect(first.tiles.some((tile) => tile.terrain === 'iron-vein')).toBe(true);
    expect(first.tiles.some((tile) => tile.terrain === 'cave')).toBe(true);
    expect(first.tiles.some((tile) => tile.terrain === 'wetland')).toBe(true);
    expect(first.tiles.some((tile) => !tile.discovered)).toBe(true);
    expect(Math.max(...first.tiles.map((tile) => tile.elevation))).toBeGreaterThanOrEqual(4);
  });

  it('changes weather deterministically and reveals terrain from staffed watch services', () => {
    const weatherSequence = Array.from({ length: 20 }, (_, index) =>
      settlementWeatherAt(41, index * 360)
    );
    expect(new Set(weatherSequence).size).toBeGreaterThan(1);
    expect(weatherSequence).toEqual(
      Array.from({ length: 20 }, (_, index) => settlementWeatherAt(41, index * 360))
    );
    const state = createInitialSettlement(41, 1000);
    const hiddenBefore = state.island.tiles.filter((tile) => !tile.discovered).length;
    state.buildings.push({
      id: 'survey-watchtower',
      definitionId: 'watchtower',
      x: 12,
      y: 6,
      rotation: 0,
      level: 1,
      state: 'ACTIVE',
      constructionProgress: 1,
      constructionPriority: 3,
      workers: [state.residents[0].id],
      inputInventory: {},
      outputInventory: {},
      reservedInventory: {},
      recipeProgress: 0,
      condition: 100,
      fire: 0,
      paused: false,
      createdAt: 1000
    });
    expect(revealIslandFromServices(state)).toBeGreaterThan(0);
    expect(state.island.tiles.filter((tile) => !tile.discovered).length).toBeLessThan(hiddenBefore);
  });

  it('uses a data-driven expedition event deck with varied encounter kinds', () => {
    expect(EXPEDITION_EVENTS.length).toBeGreaterThanOrEqual(12);
    expect(new Set(EXPEDITION_EVENTS.map((event) => event.kind)).size).toBeGreaterThanOrEqual(5);
  });

  it('enforces terrain, elevation and occupied footprints during placement', () => {
    const state = createInitialSettlement(5, 1000);
    expect(
      validatePlacement(state.island, state.buildings, 'water-collector', 12, 11, 0).valid
    ).toBe(true);
    expect(validatePlacement(state.island, state.buildings, 'fisher-hut', 12, 11, 0).valid).toBe(
      false
    );
    expect(validatePlacement(state.island, state.buildings, 'tent', 8, 12, 0).reason).toContain(
      '겹칩니다'
    );
    expect(validatePlacement(state.island, state.buildings, 'watchtower', 12, 11, 0).valid).toBe(
      false
    );
  });

  it('uses active bridges to cross blocked terrain and caches repeated routes', () => {
    const state = createInitialSettlement(9, 1000);
    state.island = {
      seed: 99,
      width: 3,
      height: 1,
      tiles: [
        { x: 0, y: 0, terrain: 'plain', elevation: 0, discovered: true, fertility: 0 },
        { x: 1, y: 0, terrain: 'ravine', elevation: 0, discovered: true, fertility: 0 },
        { x: 2, y: 0, terrain: 'plain', elevation: 0, discovered: true, fertility: 0 }
      ]
    };
    expect(findPath(state.island, { x: 0, y: 0 }, { x: 2, y: 0 })).toHaveLength(0);
    const bridge: SettlementBuilding = {
      id: 'bridge-test',
      definitionId: 'bridge',
      x: 0,
      y: 0,
      rotation: 0,
      level: 1,
      state: 'ACTIVE',
      constructionProgress: 1,
      constructionPriority: 3,
      workers: [],
      inputInventory: {},
      outputInventory: {},
      reservedInventory: {},
      recipeProgress: 0,
      condition: 100,
      fire: 0,
      paused: false,
      createdAt: 1000
    };
    const first = findCachedPath(state.island, { x: 0, y: 0 }, { x: 2, y: 0 }, [bridge]);
    const second = findCachedPath(state.island, { x: 0, y: 0 }, { x: 2, y: 0 }, [bridge]);
    expect(first.path).toHaveLength(3);
    expect(first.hit).toBe(false);
    expect(second.hit).toBe(true);
  });

  it('routes around occupied buildings and refuses undiscovered shortcuts', () => {
    const state = createInitialSettlement(9, 1000);
    state.island = {
      seed: 100,
      width: 5,
      height: 3,
      tiles: Array.from({ length: 15 }, (_, index) => ({
        x: index % 5,
        y: Math.floor(index / 5),
        terrain: 'plain' as const,
        elevation: 0,
        discovered: index !== 7,
        fertility: 0
      }))
    };
    const blocker: SettlementBuilding = {
      id: 'blocked-house',
      definitionId: 'tent',
      x: 2,
      y: 0,
      rotation: 0,
      level: 1,
      state: 'ACTIVE',
      constructionProgress: 1,
      constructionPriority: 3,
      workers: [],
      inputInventory: {},
      outputInventory: {},
      reservedInventory: {},
      recipeProgress: 0,
      condition: 100,
      fire: 0,
      paused: false,
      createdAt: 1000
    };
    const path = findPath(state.island, { x: 0, y: 0 }, { x: 4, y: 0 }, [blocker]);
    expect(path).not.toContainEqual({ x: 2, y: 0 });
    expect(path).not.toContainEqual({ x: 2, y: 1 });
    expect(path.length).toBeGreaterThan(5);
  });

  it('slows haulers when a narrow route is congested', () => {
    const job = {
      id: 'traffic-a',
      resourceId: 'logs' as const,
      amount: 2,
      sourceBuildingId: 'a',
      targetBuildingId: 'b',
      state: 'DELIVERING' as const,
      priority: 50,
      path: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 }
      ],
      progress: 0,
      createdAt: 0
    };
    const light = new Map([
      ['0,0', 1],
      ['1,0', 1],
      ['2,0', 1]
    ]);
    const crowded = new Map([
      ['0,0', 5],
      ['1,0', 5],
      ['2,0', 5]
    ]);
    expect(transportCongestionMultiplier(job, light, [])).toBe(1);
    expect(transportCongestionMultiplier(job, crowded, [])).toBeGreaterThan(1.5);
  });

  it('makes vertical infrastructure reduce actual travel time across elevation', () => {
    const state = createInitialSettlement(10, 1000);
    state.island = {
      seed: 101,
      width: 3,
      height: 1,
      tiles: [
        { x: 0, y: 0, terrain: 'plain', elevation: 0, discovered: true, fertility: 0 },
        { x: 1, y: 0, terrain: 'slope', elevation: 2, discovered: true, fertility: 0 },
        { x: 2, y: 0, terrain: 'highland', elevation: 4, discovered: true, fertility: 0 }
      ]
    };
    const route = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 }
    ];
    const stairs: SettlementBuilding = {
      id: 'stairs-test',
      definitionId: 'stairs',
      x: 1,
      y: 0,
      rotation: 0,
      level: 1,
      state: 'ACTIVE',
      constructionProgress: 1,
      constructionPriority: 3,
      workers: [],
      inputInventory: {},
      outputInventory: {},
      reservedInventory: {},
      recipeProgress: 0,
      condition: 100,
      fire: 0,
      paused: false,
      createdAt: 1000
    };
    expect(pathTravelCost(state.island, route, [stairs])).toBeLessThan(
      pathTravelCost(state.island, route)
    );
  });

  it('moves construction material with haulers before builders can complete a building', () => {
    const initial = createInitialSettlement(12, 1000);
    const result = placeBuilding(initial, 'water-collector', 12, 11, 0, 1100);
    expect(result.ok).toBe(true);
    const planned = result.state.buildings.find((building) => building.id === result.buildingId)!;
    expect(planned.inputInventory.logs ?? 0).toBe(0);
    expect(planned.state).toBe('PLANNED');
    expect(result.state.tutorialStep).toBe(0);

    const scheduled = advanceSettlement(result.state, 1);
    expect(scheduled.transports.some((job) => job.targetBuildingId === planned.id)).toBe(true);
    const sourceAfterScheduling = scheduled.buildings.find(
      (building) => building.definitionId === 'wreckage'
    )!;
    expect(sourceAfterScheduling.outputInventory.logs).toBe(24);

    const completed = advanceMany(scheduled, 80);
    const building = completed.buildings.find((item) => item.id === planned.id)!;
    const source = completed.buildings.find((item) => item.definitionId === 'wreckage')!;
    expect(building.state).toBe('ACTIVE');
    expect(source.outputInventory.logs).toBeLessThan(24);
    expect(completed.statistics.delivered.logs).toBeGreaterThanOrEqual(6);
    expect(completed.statistics.completedBuildings).toBe(1);
    expect(completed.tutorialStep).toBe(1);
  });

  it('moves and cancels a building plan without duplicating reserved cargo', () => {
    const initial = createInitialSettlement(12, 1000);
    const placed = placeBuilding(initial, 'water-collector', 12, 11, 0, 1100);
    expect(placed.ok).toBe(true);
    const id = placed.buildingId!;
    const target = placed.state.island.tiles.find(
      (tile) =>
        validatePlacement(
          placed.state.island,
          placed.state.buildings,
          'water-collector',
          tile.x,
          tile.y,
          0,
          id
        ).valid
    )!;
    const moved = moveBuilding(placed.state, id, target.x, target.y);
    expect(moved.ok).toBe(true);
    const scheduled = advanceSettlement(moved.state, 1);
    expect(scheduled.transports.some((job) => job.targetBuildingId === id)).toBe(true);
    const sourceBefore = scheduled.buildings.find(
      (building) => building.definitionId === 'wreckage'
    )!;
    expect(Object.values(sourceBefore.reservedInventory).some((value) => (value ?? 0) > 0)).toBe(
      true
    );
    const targetReservations = scheduled.transports.filter(
      (job) => job.targetBuildingId === id && job.sourceBuildingId === sourceBefore.id
    );
    const cancelled = cancelBuildingWork(scheduled, id);
    expect(cancelled.ok).toBe(true);
    expect(cancelled.state.buildings.some((building) => building.id === id)).toBe(false);
    const sourceAfter = cancelled.state.buildings.find(
      (building) => building.definitionId === 'wreckage'
    )!;
    for (const resource of new Set(targetReservations.map((job) => job.resourceId))) {
      const released = targetReservations
        .filter((job) => job.resourceId === resource)
        .reduce((sum, job) => sum + job.amount, 0);
      expect(sourceAfter.reservedInventory[resource] ?? 0).toBe(
        (sourceBefore.reservedInventory[resource] ?? 0) - released
      );
    }
    expect(
      cancelled.state.transports.some(
        (job) => job.targetBuildingId === id && job.state !== 'CANCELLED'
      )
    ).toBe(false);
  });

  it('delivers upgrade materials and changes the building visual level through builder work', () => {
    const initial = createInitialSettlement(41, 1000);
    const tent = initial.buildings.find((building) => building.definitionId === 'tent')!;
    const cost = buildingUpgradeCost('tent', tent.level);
    const wreckage = initial.buildings.find((building) => building.definitionId === 'wreckage')!;
    for (const [resource, amount] of Object.entries(cost))
      wreckage.outputInventory[resource as keyof typeof wreckage.outputInventory] = amount;
    const begun = beginBuildingUpgrade(initial, tent.id);
    expect(begun.ok).toBe(true);
    const upgraded = advanceMany(begun.state, 160);
    const completedTent = upgraded.buildings.find((building) => building.id === tent.id)!;
    expect(completedTent.state).toBe('ACTIVE');
    expect(completedTent.level).toBe(2);
    expect(completedTent.upgradeMaterialsCommitted).toBe(false);

    const tierThree = beginBuildingUpgrade(upgraded, tent.id);
    expect(tierThree.ok).toBe(true);
    const completedTierThree = advanceMany(tierThree.state, 160);
    const finalTent = completedTierThree.buildings.find((building) => building.id === tent.id)!;
    expect(finalTent.state).toBe('ACTIVE');
    expect(finalTent.level).toBe(3);
  });

  it('runs gathering recipes only after construction, staffing and real storage output exist', () => {
    const initial = createInitialSettlement(19, 1000);
    const result = placeBuilding(initial, 'lumber-camp', 4, 8, 0, 1100);
    expect(result.ok).toBe(true);
    const simulated = advanceMany(result.state, 240);
    const lumberCamp = simulated.buildings.find((building) => building.id === result.buildingId)!;
    expect(lumberCamp.state).toBe('ACTIVE');
    expect(lumberCamp.workers.length).toBeGreaterThan(0);
    expect(
      (lumberCamp.outputInventory.logs ?? 0) + (simulated.statistics.delivered.logs ?? 0)
    ).toBeGreaterThan(0);
    expect(
      simulated.residents.some(
        (resident) => resident.job === 'logger' && resident.workplaceId === lumberCamp.id
      )
    ).toBe(true);
    expect(
      simulated.island.tiles[lumberCamp.y * simulated.island.width + lumberCamp.x].resourceRemaining
    ).toBeLessThan(260);
  });

  it('consumes staffed welfare services and equipment to satisfy advanced resident needs', () => {
    const state = createInitialSettlement(20, 1000);
    const resident = state.residents[0];
    resident.tier = 'pirate';
    resident.needs = {
      water: 40,
      food: 40,
      housing: 40,
      clothing: 40,
      health: 40,
      leisure: 40,
      pirateCulture: 40,
      equipment: 40
    };
    resident.position = { x: 8, y: 12 };
    const home = state.buildings.find((building) => building.id === resident.homeId)!;
    home.inputInventory = { water: 5, hardtack: 5, cutlasses: 2 };
    const service = (
      id: SettlementBuilding['definitionId'],
      x: number,
      inventory: SettlementBuilding['inputInventory']
    ): SettlementBuilding => ({
      id: `${id}-test`,
      definitionId: id,
      x,
      y: 11,
      rotation: 0,
      level: 1,
      state: 'ACTIVE',
      constructionProgress: 1,
      constructionPriority: 3,
      workers: [state.residents[x].id],
      inputInventory: inventory,
      outputInventory: {},
      reservedInventory: {},
      recipeProgress: 0,
      condition: 100,
      fire: 0,
      paused: false,
      createdAt: 1000
    });
    state.buildings.push(
      service('tavern', 9, { rum: 2 }),
      service('infirmary', 10, { medicine: 2 })
    );

    const advanced = advanceSettlement(state, 60);
    const person = advanced.residents.find((item) => item.id === resident.id)!;
    expect(person.needs.health).toBeGreaterThan(40);
    expect(person.needs.leisure).toBeGreaterThan(40);
    expect(person.needs.pirateCulture).toBeGreaterThan(40);
    expect(person.needs.equipment).toBeGreaterThan(40);
    expect(person.activityAction).toBe('HEALING');
    expect(person.activityTargetId).toBe('infirmary-test');
    expect(person.actionUntil).toBeGreaterThan(advanced.simulationMinutes);
    expect(['MOVING', 'HEALING']).toContain(person.action);
    expect(
      advanced.buildings.find((building) => building.definitionId === 'infirmary')?.inputInventory
        .medicine
    ).toBeLessThan(2);

    const visiting = advanceSettlement(advanced, 8);
    const visitor = visiting.residents.find((item) => item.id === resident.id)!;
    expect(visitor.activityAction).toBe('HEALING');
    expect(visitor.position).not.toEqual(person.position);
  });

  it('promotes a satisfied laborer and resolves prisoner policies on the daily cycle', () => {
    const state = createInitialSettlement(21, 1000);
    state.simulationMinutes = 1439;
    state.prisoners = 2;
    state.policies.active.prisoners = 'ransom';
    const resident = state.residents[0];
    resident.tier = 'laborer';
    resident.experience = 30;
    Object.keys(resident.needs).forEach((need) => {
      resident.needs[need as keyof typeof resident.needs] = 85;
    });
    const home = state.buildings.find((building) => building.id === resident.homeId)!;
    home.inputInventory = { water: 5, hardtack: 5, clothes: 2 };
    const goldBefore = state.looseInventory.gold ?? 0;

    const advanced = advanceSettlement(state, 1);
    expect(advanced.residents.find((person) => person.id === resident.id)?.tier).toBe('skilled');
    expect(advanced.prisoners).toBe(1);
    expect(advanced.looseInventory.gold).toBe(goldBefore + 70);
  });

  it('applies explicit trade-offs for every governance axis', () => {
    const state = createInitialSettlement(22, 1000);
    state.prisoners = 8;
    state.policies.active = {
      loot: 'captains-tithe',
      labor: 'forced-quota',
      food: 'fleet-rations',
      prisoners: 'prison-labor',
      diplomacy: 'raid-all'
    };
    const harsh = policyModifiers(state);
    expect(harsh.production).toBeGreaterThan(1.18);
    expect(harsh.goldLoot).toBeGreaterThan(1);
    expect(harsh.expeditionMorale).toBe(12);
    expect(harsh.foodSatisfaction).toBeLessThan(1);
    expect(harsh.patrolRisk).toBeGreaterThan(1);
    expect(harsh.loyaltyPerHour).toBeLessThan(0);

    state.policies.active = {
      loot: 'equal-shares',
      labor: 'free-labor',
      food: 'reserve-rations',
      prisoners: 'ransom',
      diplomacy: 'protected-traders'
    };
    const communal = policyModifiers(state);
    expect(communal.foodConsumption).toBeLessThan(1);
    expect(communal.tradePrice).toBeGreaterThan(1);
    expect(communal.patrolRisk).toBeLessThan(1);
    expect(communal.loyaltyPerHour).toBeGreaterThan(0);
  });

  it('constructs a ship only after its material manifest reaches a staffed shipyard', () => {
    const state = createInitialSettlement(23, 1000);
    state.progression.unlocked.push('seamanship-shipyard');
    const yard: SettlementBuilding = {
      id: 'yard-test',
      definitionId: 'shipyard',
      x: 14,
      y: 14,
      rotation: 0,
      level: 1,
      state: 'ACTIVE',
      constructionProgress: 1,
      constructionPriority: 3,
      workers: state.residents.slice(0, 4).map((resident) => resident.id),
      inputInventory: {},
      outputInventory: {},
      reservedInventory: {},
      recipeId: undefined,
      recipeProgress: 0,
      condition: 100,
      fire: 0,
      paused: false,
      createdAt: 1000
    };
    state.residents.slice(0, 4).forEach((resident) => {
      resident.job = 'shipwright';
      resident.workplaceId = yard.id;
    });
    state.buildings.push(yard);
    const source = state.buildings.find((building) => building.definitionId === 'wreckage')!;
    for (const [resource, required] of Object.entries(SHIP_PLANS.boat!.cost))
      source.outputInventory[resource as keyof typeof source.outputInventory] = required;
    const queued = queueShipConstruction(state, 'boat', '물수리', 1200);
    expect(queued.ok).toBe(true);
    expect(advanceShipConstruction(queued.state, [], 200).ships).toHaveLength(0);

    let settlement = queued.state;
    let ships: ReturnType<typeof createNewGame>['ships'] = [];
    for (let index = 0; index < 130; index += 1) {
      settlement = advanceSettlement(settlement, 1);
      const construction = advanceShipConstruction(settlement, ships, 1);
      settlement = construction.settlement;
      ships = construction.ships;
    }
    expect(ships).toHaveLength(1);
    expect(ships[0].name).toBe('물수리');
    expect(settlement.shipConstruction[0].state).toBe('COMPLETE');
  });

  it('physically transfers ship parts produced inside a shipyard into its construction berth', () => {
    const state = createInitialSettlement(29, 1000);
    const yard: SettlementBuilding = {
      id: 'yard-local-logistics',
      definitionId: 'shipyard',
      x: 14,
      y: 14,
      rotation: 0,
      level: 1,
      state: 'ACTIVE',
      constructionProgress: 1,
      constructionPriority: 3,
      workers: [],
      inputInventory: {},
      outputInventory: { 'ship-parts': 4 },
      reservedInventory: {},
      recipeId: undefined,
      recipeProgress: 0,
      condition: 100,
      fire: 0,
      paused: false,
      createdAt: 1000
    };
    for (const [resource, required] of Object.entries(SHIP_PLANS.sloop!.cost)) {
      if (resource !== 'ship-parts')
        yard.inputInventory[resource as keyof typeof yard.inputInventory] = required;
    }
    state.buildings.push(yard);
    const queued = queueShipConstruction(state, 'sloop', '검은 갈매기', 1200);
    expect(queued.ok).toBe(true);
    const scheduled = scheduleLogistics(queued.state);
    const localJob = scheduled.transports.find(
      (job) =>
        job.resourceId === 'ship-parts' &&
        job.sourceBuildingId === yard.id &&
        job.targetBuildingId === yard.id
    );
    expect(localJob).toBeDefined();
    const delivered = advanceMany(scheduled, 40);
    const completedYard = delivered.buildings.find((building) => building.id === yard.id)!;
    expect(completedYard.inputInventory['ship-parts']).toBe(4);
    expect(completedYard.outputInventory['ship-parts']).toBe(0);
  });

  it('prepares, pauses for consequential events, returns and unloads expedition loot', () => {
    const game = createNewGame(
      {
        captainName: '원정가',
        crewName: '검은 해도',
        shipName: '바람칼',
        flagMark: '✥',
        flagColor: '#222222',
        trait: 'navigator',
        difficulty: 'captain',
        seed: 31
      },
      1000
    );
    game.ships[0].hull = game.ships[0].stats.hullMax;
    game.ships[0].sails = game.ships[0].stats.sailMax;
    game.ships[0].crew = 14;
    let state = game.settlement;
    state.progression.unlocked.push('seamanship-expeditions');
    const office: SettlementBuilding = {
      id: 'office-test',
      definitionId: 'expedition-office',
      x: 12,
      y: 11,
      rotation: 0,
      level: 1,
      state: 'ACTIVE',
      constructionProgress: 1,
      constructionPriority: 3,
      workers: [state.residents[0].id],
      inputInventory: {},
      outputInventory: {},
      reservedInventory: {},
      recipeProgress: 0,
      condition: 100,
      fire: 0,
      paused: false,
      createdAt: 1000
    };
    state.buildings.push(office);
    const crew = state.residents.slice(0, 8);
    const estimate = estimateExpedition('beginners-bay', [game.ships[0]], crew.length, 'explore');
    office.inputInventory = { ...estimate.supplies };
    const prepared = prepareExpedition(state, game.ships, game.officers, {
      name: '첫 군도 원정',
      zoneId: 'beginners-bay',
      purpose: 'explore',
      shipIds: [game.ships[0].id],
      captainIds: [game.officers[0].id],
      crewIds: crew.map((resident) => resident.id)
    });
    expect(prepared.ok).toBe(true);
    state = prepared.state;
    let ships = game.ships;
    ({ settlement: state, ships } = advanceExpeditions(state, ships, 1, 1999));
    const boardingPositions = new Map(
      state.residents
        .filter((resident) => crew.some((member) => member.id === resident.id))
        .map((resident) => [resident.id, { ...resident.position }])
    );
    state = advanceSettlement(state, 1);
    for (const crewMember of crew) {
      const resident = state.residents.find((person) => person.id === crewMember.id)!;
      expect(resident.action).toBe('BOARDING');
      expect(resident.position).toEqual(boardingPositions.get(crewMember.id));
    }
    for (let guard = 0; guard < 20 && state.expeditions[0].state !== 'EVENT'; guard += 1) {
      const advanced = advanceExpeditions(state, ships, 45, 2000 + guard);
      state = advanced.settlement;
      ships = advanced.ships;
    }
    expect(state.expeditions[0].state).toBe('EVENT');
    ({ settlement: state, ships } = resolveExpeditionEvent(
      state,
      ships,
      state.expeditions[0].id,
      'bold'
    ));
    for (let guard = 0; guard < 20 && state.expeditions[0].state !== 'EVENT'; guard += 1) {
      const advanced = advanceExpeditions(state, ships, 45, 3000 + guard);
      state = advanced.settlement;
      ships = advanced.ships;
    }
    expect(state.expeditions[0].state).toBe('EVENT');
    ({ settlement: state, ships } = resolveExpeditionEvent(
      state,
      ships,
      state.expeditions[0].id,
      'parley'
    ));
    for (let guard = 0; guard < 40 && state.expeditions[0].state !== 'COMPLETED'; guard += 1) {
      const advanced = advanceExpeditions(state, ships, 45, 4000 + guard);
      state = advanced.settlement;
      ships = advanced.ships;
    }
    expect(state.expeditions[0].state).toBe('COMPLETED');
    expect(
      Object.values(state.expeditions[0].cargo).reduce((sum, value) => sum + (value ?? 0), 0)
    ).toBeGreaterThan(0);
    expect(Object.values(office.outputInventory).length).toBe(0);
    const persistedOffice = state.buildings.find((building) => building.id === office.id)!;
    expect(
      Object.values(persistedOffice.outputInventory).reduce((sum, value) => sum + (value ?? 0), 0)
    ).toBeGreaterThan(0);
  });

  it('resolves a turn-based expedition naval battle with range, ammunition and hull damage', () => {
    const game = createNewGame(
      {
        captainName: '전술가',
        crewName: '현측 포대',
        shipName: '바람칼',
        flagMark: '◢',
        flagColor: '#222222',
        trait: 'gunner',
        difficulty: 'captain',
        seed: 51
      },
      1000
    );
    game.ships[0].hull = game.ships[0].stats.hullMax;
    game.ships[0].sails = game.ships[0].stats.sailMax;
    game.ships[0].crew = 14;
    const crewIds = game.settlement.residents.slice(0, 10).map((resident) => resident.id);
    game.settlement.expeditions.push({
      id: 'combat-expedition',
      name: '왕실 항로 습격',
      state: 'EVENT',
      zoneId: 'beginners-bay',
      shipIds: [game.ships[0].id],
      captainIds: [game.officers[0].id],
      crewIds,
      supplies: { cannonballs: 32, powder: 14 },
      cargo: {},
      routeProgress: 0.35,
      durationHours: 12,
      risk: 40,
      morale: 74,
      currentEventId: 'naval-patrol',
      log: ['왕실 순찰선이 접근한다.']
    });
    let settlement = game.settlement;
    let ships = game.ships;
    const started = beginExpeditionCombat(settlement, ships, 'combat-expedition');
    expect(started.ok).toBe(true);
    settlement = started.settlement;
    ships = started.ships;
    expect(settlement.expeditions[0].state).toBe('COMBAT');
    ({ settlement, ships } = resolveExpeditionCombatTurn(
      settlement,
      ships,
      'combat-expedition',
      'maneuver'
    ));
    expect(settlement.expeditions[0].combat?.range).toBe('broadside');
    for (let turn = 0; turn < 7 && settlement.expeditions[0].state === 'COMBAT'; turn += 1) {
      ({ settlement, ships } = resolveExpeditionCombatTurn(
        settlement,
        ships,
        'combat-expedition',
        'round-shot'
      ));
    }
    expect(settlement.expeditions[0].state).toBe('TRAVELING');
    expect(settlement.expeditions[0].cargo['military-maps']).toBe(1);
    expect(ships[0].hull).toBeLessThan(game.ships[0].hull);
  });

  it('persists crew deaths and non-flagship loss after a fleet defeat', () => {
    const game = createNewGame(
      {
        captainName: '생존자',
        crewName: '부서진 돛',
        shipName: '기함',
        flagMark: '☠',
        flagColor: '#111111',
        trait: 'admiral',
        difficulty: 'captain',
        seed: 91
      },
      1000
    );
    const escort = {
      ...structuredClone(game.ships[0]),
      id: 'escort-loss-test',
      name: '회색 돛',
      isFlagship: false
    };
    const crewIds = game.settlement.residents.slice(0, 12).map((resident) => resident.id);
    game.settlement.expeditions.push({
      id: 'defeat-expedition',
      name: '실패한 돌파',
      state: 'COMBAT',
      zoneId: 'naval-patrol',
      purpose: 'raid',
      shipIds: [game.ships[0].id, escort.id],
      captainIds: [game.officers[0].id],
      crewIds,
      supplies: { cannonballs: 20, powder: 10 },
      cargo: { spices: 10 },
      routeProgress: 0.35,
      durationHours: 12,
      risk: 88,
      morale: 42,
      currentEventId: 'naval-patrol',
      log: [],
      combat: {
        turn: 2,
        playerHull: 3,
        playerHullMax: 200,
        enemyHull: 180,
        enemyHullMax: 180,
        enemySails: 90,
        enemyMorale: 90,
        ammo: 20,
        windAngle: 10,
        range: 'far',
        repairCharges: 0,
        log: []
      }
    });
    const residentCount = game.settlement.residents.length;
    const result = resolveExpeditionCombatTurn(
      game.settlement,
      [...game.ships, escort],
      'defeat-expedition',
      'maneuver'
    );
    const expedition = result.settlement.expeditions[0];
    expect(result.outcome).toBe('defeat');
    expect(result.ships.some((ship) => ship.id === escort.id)).toBe(false);
    expect(expedition.lostShipNames).toContain('회색 돛');
    expect(expedition.casualties).toBeGreaterThan(0);
    expect(result.settlement.residents.length).toBeLessThan(residentCount);
  });
});
