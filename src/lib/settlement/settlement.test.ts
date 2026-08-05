import { describe, expect, it } from 'vitest';
import { BUILDINGS, RECIPES, SETTLEMENT_RESOURCE_IDS } from './catalog';
import { placeBuilding } from './construction';
import { createInitialSettlement } from './initialState';
import { validatePlacement } from './island';
import { advanceSettlement } from './simulation';

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
});
