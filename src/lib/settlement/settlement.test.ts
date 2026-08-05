import { describe, expect, it } from 'vitest';
import { BUILDINGS, RECIPES, SETTLEMENT_RESOURCE_IDS } from './catalog';
import { placeBuilding } from './construction';
import { createInitialSettlement } from './initialState';
import { validatePlacement } from './island';
import { advanceSettlement } from './simulation';
import { advanceShipConstruction, queueShipConstruction, SHIP_PLANS } from './shipbuilding';
import { advanceExpeditions, estimateExpedition, prepareExpedition, resolveExpeditionEvent } from './expeditions';
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

  it('moves construction material with haulers before builders can complete a building', () => {
    const initial = createInitialSettlement(12, 1000);
    const result = placeBuilding(initial, 'water-collector', 12, 11, 0, 1100);
    expect(result.ok).toBe(true);
    const planned = result.state.buildings.find((building) => building.id === result.buildingId)!;
    expect(planned.inputInventory.logs ?? 0).toBe(0);
    expect(planned.state).toBe('PLANNED');

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
  });

  it('constructs a ship only after its material manifest reaches a staffed shipyard', () => {
    let state = createInitialSettlement(23, 1000);
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

  it('prepares, pauses for consequential events, returns and unloads expedition loot', () => {
    const game = createNewGame({ captainName: '원정가', crewName: '검은 해도', shipName: '바람칼', flagMark: '✥', flagColor: '#222222', trait: 'navigator', difficulty: 'captain', seed: 31 }, 1000);
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
});
