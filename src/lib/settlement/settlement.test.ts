import { describe, expect, it } from 'vitest';
import { BUILDINGS, RECIPES, SETTLEMENT_RESOURCE_IDS } from './catalog';
import { beginBuildingUpgrade, buildingUpgradeCost, cancelBuildingWork, moveBuilding, placeBuilding } from './construction';
import { createInitialSettlement } from './initialState';
import { findCachedPath, findPath, validatePlacement } from './island';
import { scheduleLogistics } from './logistics';
import { advanceSettlement } from './simulation';
import { advanceShipConstruction, queueShipConstruction, SHIP_PLANS } from './shipbuilding';
import { advanceExpeditions, beginExpeditionCombat, estimateExpedition, prepareExpedition, resolveExpeditionCombatTurn, resolveExpeditionEvent } from './expeditions';
import { createNewGame } from '$lib/domain/initialState';
import type { SettlementBuilding } from './types';

function advanceMany<T extends ReturnType<typeof createInitialSettlement>>(state: T, seconds: number): T {
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
    const produced = new Set(Object.values(RECIPES).flatMap((recipe) => Object.keys(recipe.outputs)));
    for (const resource of ['navigation-tools', 'medicine', 'powder-kegs', 'cannonballs', 'sails', 'ship-parts']) {
      expect(produced.has(resource)).toBe(true);
    }
    const wreckage = createInitialSettlement(7, 1000).buildings.find((building) => building.definitionId === 'wreckage')!;
    expect(wreckage.outputInventory.medicine).toBeGreaterThanOrEqual(1);
    expect(wreckage.outputInventory.cannonballs).toBeGreaterThanOrEqual(4);
    expect(wreckage.outputInventory.powder).toBeGreaterThanOrEqual(2);
  });

  it('generates a deterministic island with coast, elevation and resource terrain', () => {
    const first = createInitialSettlement(77, 1000).island;
    const second = createInitialSettlement(77, 1000).island;
    expect(first.tiles.map((tile) => `${tile.terrain}:${tile.elevation}`)).toEqual(second.tiles.map((tile) => `${tile.terrain}:${tile.elevation}`));
    expect(first.tiles.some((tile) => tile.terrain === 'forest')).toBe(true);
    expect(first.tiles.some((tile) => tile.terrain === 'iron-vein')).toBe(true);
    expect(Math.max(...first.tiles.map((tile) => tile.elevation))).toBeGreaterThanOrEqual(4);
  });

  it('enforces terrain, elevation and occupied footprints during placement', () => {
    const state = createInitialSettlement(5, 1000);
    expect(validatePlacement(state.island, state.buildings, 'water-collector', 12, 11, 0).valid).toBe(true);
    expect(validatePlacement(state.island, state.buildings, 'fisher-hut', 12, 11, 0).valid).toBe(false);
    expect(validatePlacement(state.island, state.buildings, 'tent', 8, 12, 0).reason).toContain('겹칩니다');
    expect(validatePlacement(state.island, state.buildings, 'watchtower', 12, 11, 0).valid).toBe(false);
  });

  it('uses active bridges to cross blocked terrain and caches repeated routes', () => {
    const state = createInitialSettlement(9, 1000);
    state.island = {
      seed: 99, width: 3, height: 1,
      tiles: [
        { x: 0, y: 0, terrain: 'plain', elevation: 0, discovered: true, fertility: 0 },
        { x: 1, y: 0, terrain: 'ravine', elevation: 0, discovered: true, fertility: 0 },
        { x: 2, y: 0, terrain: 'plain', elevation: 0, discovered: true, fertility: 0 }
      ]
    };
    expect(findPath(state.island, { x: 0, y: 0 }, { x: 2, y: 0 })).toHaveLength(0);
    const bridge: SettlementBuilding = {
      id: 'bridge-test', definitionId: 'bridge', x: 0, y: 0, rotation: 0, level: 1, state: 'ACTIVE', constructionProgress: 1,
      constructionPriority: 3, workers: [], inputInventory: {}, outputInventory: {}, reservedInventory: {}, recipeProgress: 0,
      condition: 100, fire: 0, paused: false, createdAt: 1000
    };
    const first = findCachedPath(state.island, { x: 0, y: 0 }, { x: 2, y: 0 }, [bridge]);
    const second = findCachedPath(state.island, { x: 0, y: 0 }, { x: 2, y: 0 }, [bridge]);
    expect(first.path).toHaveLength(3);
    expect(first.hit).toBe(false);
    expect(second.hit).toBe(true);
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
    const sourceAfterScheduling = scheduled.buildings.find((building) => building.definitionId === 'wreckage')!;
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
    const target = placed.state.island.tiles.find((tile) => validatePlacement(placed.state.island, placed.state.buildings, 'water-collector', tile.x, tile.y, 0, id).valid)!;
    const moved = moveBuilding(placed.state, id, target.x, target.y);
    expect(moved.ok).toBe(true);
    const scheduled = advanceSettlement(moved.state, 1);
    expect(scheduled.transports.some((job) => job.targetBuildingId === id)).toBe(true);
    const sourceBefore = scheduled.buildings.find((building) => building.definitionId === 'wreckage')!;
    expect(Object.values(sourceBefore.reservedInventory).some((value) => (value ?? 0) > 0)).toBe(true);
    const targetReservations = scheduled.transports.filter((job) => job.targetBuildingId === id && job.sourceBuildingId === sourceBefore.id);
    const cancelled = cancelBuildingWork(scheduled, id);
    expect(cancelled.ok).toBe(true);
    expect(cancelled.state.buildings.some((building) => building.id === id)).toBe(false);
    const sourceAfter = cancelled.state.buildings.find((building) => building.definitionId === 'wreckage')!;
    for (const resource of new Set(targetReservations.map((job) => job.resourceId))) {
      const released = targetReservations.filter((job) => job.resourceId === resource).reduce((sum, job) => sum + job.amount, 0);
      expect(sourceAfter.reservedInventory[resource] ?? 0).toBe((sourceBefore.reservedInventory[resource] ?? 0) - released);
    }
    expect(cancelled.state.transports.some((job) => job.targetBuildingId === id && job.state !== 'CANCELLED')).toBe(false);
  });

  it('delivers upgrade materials and changes the building visual level through builder work', () => {
    const initial = createInitialSettlement(41, 1000);
    const tent = initial.buildings.find((building) => building.definitionId === 'tent')!;
    const cost = buildingUpgradeCost('tent', tent.level);
    const wreckage = initial.buildings.find((building) => building.definitionId === 'wreckage')!;
    for (const [resource, amount] of Object.entries(cost)) wreckage.outputInventory[resource as keyof typeof wreckage.outputInventory] = amount;
    const begun = beginBuildingUpgrade(initial, tent.id);
    expect(begun.ok).toBe(true);
    const upgraded = advanceMany(begun.state, 160);
    const completedTent = upgraded.buildings.find((building) => building.id === tent.id)!;
    expect(completedTent.state).toBe('ACTIVE');
    expect(completedTent.level).toBe(2);
    expect(completedTent.upgradeMaterialsCommitted).toBe(false);
  });

  it('runs gathering recipes only after construction, staffing and real storage output exist', () => {
    const initial = createInitialSettlement(19, 1000);
    const result = placeBuilding(initial, 'lumber-camp', 4, 8, 0, 1100);
    expect(result.ok).toBe(true);
    const simulated = advanceMany(result.state, 150);
    const lumberCamp = simulated.buildings.find((building) => building.id === result.buildingId)!;
    expect(lumberCamp.state).toBe('ACTIVE');
    expect(lumberCamp.workers.length).toBeGreaterThan(0);
    expect((lumberCamp.outputInventory.logs ?? 0) + (simulated.statistics.delivered.logs ?? 0)).toBeGreaterThan(0);
    expect(simulated.residents.some((resident) => resident.job === 'logger' && resident.workplaceId === lumberCamp.id)).toBe(true);
    expect(simulated.island.tiles[lumberCamp.y * simulated.island.width + lumberCamp.x].resourceRemaining).toBeLessThan(260);
  });

  it('constructs a ship only after its material manifest reaches a staffed shipyard', () => {
    const state = createInitialSettlement(23, 1000);
    state.progression.unlocked.push('seamanship-shipyard');
    const yard: SettlementBuilding = {
      id: 'yard-test', definitionId: 'shipyard', x: 14, y: 14, rotation: 0, level: 1, state: 'ACTIVE', constructionProgress: 1,
      constructionPriority: 3, workers: state.residents.slice(0, 4).map((resident) => resident.id), inputInventory: {}, outputInventory: {}, reservedInventory: {},
      recipeId: undefined, recipeProgress: 0, condition: 100, fire: 0, paused: false, createdAt: 1000
    };
    state.residents.slice(0, 4).forEach((resident) => { resident.job = 'shipwright'; resident.workplaceId = yard.id; });
    state.buildings.push(yard);
    const source = state.buildings.find((building) => building.definitionId === 'wreckage')!;
    for (const [resource, required] of Object.entries(SHIP_PLANS.boat!.cost)) source.outputInventory[resource as keyof typeof source.outputInventory] = required;
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
      id: 'yard-local-logistics', definitionId: 'shipyard', x: 14, y: 14, rotation: 0, level: 1, state: 'ACTIVE', constructionProgress: 1,
      constructionPriority: 3, workers: [], inputInventory: {}, outputInventory: { 'ship-parts': 4 }, reservedInventory: {},
      recipeId: undefined, recipeProgress: 0, condition: 100, fire: 0, paused: false, createdAt: 1000
    };
    for (const [resource, required] of Object.entries(SHIP_PLANS.sloop!.cost)) {
      if (resource !== 'ship-parts') yard.inputInventory[resource as keyof typeof yard.inputInventory] = required;
    }
    state.buildings.push(yard);
    const queued = queueShipConstruction(state, 'sloop', '검은 갈매기', 1200);
    expect(queued.ok).toBe(true);
    const scheduled = scheduleLogistics(queued.state);
    const localJob = scheduled.transports.find((job) => job.resourceId === 'ship-parts' && job.sourceBuildingId === yard.id && job.targetBuildingId === yard.id);
    expect(localJob).toBeDefined();
    const delivered = advanceMany(scheduled, 40);
    const completedYard = delivered.buildings.find((building) => building.id === yard.id)!;
    expect(completedYard.inputInventory['ship-parts']).toBe(4);
    expect(completedYard.outputInventory['ship-parts']).toBe(0);
  });

  it('prepares, pauses for consequential events, returns and unloads expedition loot', () => {
    const game = createNewGame({ captainName: '원정가', crewName: '검은 해도', shipName: '바람칼', flagMark: '✥', flagColor: '#222222', trait: 'navigator', difficulty: 'captain', seed: 31 }, 1000);
    game.ships[0].hull = game.ships[0].stats.hullMax; game.ships[0].sails = game.ships[0].stats.sailMax; game.ships[0].crew = 14;
    let state = game.settlement;
    state.progression.unlocked.push('seamanship-expeditions');
    const office: SettlementBuilding = {
      id: 'office-test', definitionId: 'expedition-office', x: 12, y: 11, rotation: 0, level: 1, state: 'ACTIVE', constructionProgress: 1,
      constructionPriority: 3, workers: [state.residents[0].id], inputInventory: {}, outputInventory: {}, reservedInventory: {}, recipeProgress: 0,
      condition: 100, fire: 0, paused: false, createdAt: 1000
    };
    state.buildings.push(office);
    const crew = state.residents.slice(0, 8);
    const estimate = estimateExpedition('beginners-bay', [game.ships[0]], crew.length, 'explore');
    office.inputInventory = { ...estimate.supplies };
    const prepared = prepareExpedition(state, game.ships, game.officers, {
      name: '첫 군도 원정', zoneId: 'beginners-bay', purpose: 'explore', shipIds: [game.ships[0].id], captainIds: [game.officers[0].id], crewIds: crew.map((resident) => resident.id)
    });
    expect(prepared.ok).toBe(true);
    state = prepared.state;
    let ships = game.ships;
    for (let guard = 0; guard < 20 && state.expeditions[0].state !== 'EVENT'; guard += 1) {
      const advanced = advanceExpeditions(state, ships, 45, 2000 + guard);
      state = advanced.settlement; ships = advanced.ships;
    }
    expect(state.expeditions[0].state).toBe('EVENT');
    ({ settlement: state, ships } = resolveExpeditionEvent(state, ships, state.expeditions[0].id, 'bold'));
    for (let guard = 0; guard < 20 && state.expeditions[0].state !== 'EVENT'; guard += 1) {
      const advanced = advanceExpeditions(state, ships, 45, 3000 + guard);
      state = advanced.settlement; ships = advanced.ships;
    }
    expect(state.expeditions[0].state).toBe('EVENT');
    ({ settlement: state, ships } = resolveExpeditionEvent(state, ships, state.expeditions[0].id, 'parley'));
    for (let guard = 0; guard < 40 && state.expeditions[0].state !== 'COMPLETED'; guard += 1) {
      const advanced = advanceExpeditions(state, ships, 45, 4000 + guard);
      state = advanced.settlement; ships = advanced.ships;
    }
    expect(state.expeditions[0].state).toBe('COMPLETED');
    expect(Object.values(state.expeditions[0].cargo).reduce((sum, value) => sum + (value ?? 0), 0)).toBeGreaterThan(0);
    expect(Object.values(office.outputInventory).length).toBe(0);
    const persistedOffice = state.buildings.find((building) => building.id === office.id)!;
    expect(Object.values(persistedOffice.outputInventory).reduce((sum, value) => sum + (value ?? 0), 0)).toBeGreaterThan(0);
  });

  it('resolves a turn-based expedition naval battle with range, ammunition and hull damage', () => {
    const game = createNewGame({ captainName: '전술가', crewName: '현측 포대', shipName: '바람칼', flagMark: '◢', flagColor: '#222222', trait: 'gunner', difficulty: 'captain', seed: 51 }, 1000);
    game.ships[0].hull = game.ships[0].stats.hullMax; game.ships[0].sails = game.ships[0].stats.sailMax; game.ships[0].crew = 14;
    const crewIds = game.settlement.residents.slice(0, 10).map((resident) => resident.id);
    game.settlement.expeditions.push({
      id: 'combat-expedition', name: '왕실 항로 습격', state: 'EVENT', zoneId: 'beginners-bay', shipIds: [game.ships[0].id],
      captainIds: [game.officers[0].id], crewIds, supplies: { cannonballs: 32, powder: 14 }, cargo: {}, routeProgress: 0.35,
      durationHours: 12, risk: 40, morale: 74, currentEventId: 'naval-patrol', log: ['왕실 순찰선이 접근한다.']
    });
    let settlement = game.settlement;
    let ships = game.ships;
    const started = beginExpeditionCombat(settlement, ships, 'combat-expedition');
    expect(started.ok).toBe(true);
    settlement = started.settlement;
    ships = started.ships;
    expect(settlement.expeditions[0].state).toBe('COMBAT');
    ({ settlement, ships } = resolveExpeditionCombatTurn(settlement, ships, 'combat-expedition', 'maneuver'));
    expect(settlement.expeditions[0].combat?.range).toBe('broadside');
    for (let turn = 0; turn < 7 && settlement.expeditions[0].state === 'COMBAT'; turn += 1) {
      ({ settlement, ships } = resolveExpeditionCombatTurn(settlement, ships, 'combat-expedition', 'round-shot'));
    }
    expect(settlement.expeditions[0].state).toBe('TRAVELING');
    expect(settlement.expeditions[0].cargo['military-maps']).toBe(1);
    expect(ships[0].hull).toBeLessThan(game.ships[0].hull);
  });
});
