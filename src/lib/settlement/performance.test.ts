import { describe, expect, it } from 'vitest';
import { createInitialSettlement } from './initialState';
import { advanceSettlement } from './simulation';
import type { Resident } from './types';

function largeSettlement(population = 500) {
  const state = createInitialSettlement(501, 1_700_000_000_000);
  const templates = state.residents;
  state.residents = Array.from({ length: population }, (_, index): Resident => {
    const source = templates[index % templates.length];
    return {
      ...structuredClone(source),
      id: `resident-benchmark-${index}`,
      name: `부하 ${index + 1}`,
      job: index < 24 ? 'builder' : index < 72 ? 'hauler' : 'unassigned',
      workplaceId: undefined,
      position: { x: 8 + (index % 12) * 0.25, y: 11 + (index % 9) * 0.2 },
      path: [],
      pathProgress: 0
    };
  });
  for (const building of state.buildings) building.workers = [];
  return state;
}

describe('large-settlement performance contract', () => {
  it('advances 500 residents without frame-sized simulation spikes or invalid state', () => {
    let state = largeSettlement();
    const samples: number[] = [];
    const startedAt = performance.now();
    for (let tick = 0; tick < 180; tick += 1) {
      const tickStartedAt = performance.now();
      state = advanceSettlement(state, 1);
      samples.push(performance.now() - tickStartedAt);
    }
    const elapsed = performance.now() - startedAt;
    const p95 = [...samples].sort((a, b) => a - b)[Math.floor(samples.length * 0.95)];

    expect(state.residents).toHaveLength(500);
    expect(state.residentUpdateCursor).toBeGreaterThanOrEqual(0);
    expect(state.residentUpdateCursor).toBeLessThan(state.residents.length);
    expect(state.residents.every((resident) => Number.isFinite(resident.position.x))).toBe(true);
    expect(state.buildings.every((building) => Number.isFinite(building.condition))).toBe(true);
    expect(p95).toBeLessThan(50);
    expect(elapsed).toBeLessThan(5_000);
  }, 10_000);
});
