import { describe, expect, it } from 'vitest';
import { createNewGame } from '$lib/domain/initialState';
import { advanceSimulation } from '$lib/domain/simulation';
import { claimMissionReward } from '$lib/domain/missions';
import { canAffordGameResources, spendGameResources } from './economyBridge';

function game() {
  return createNewGame(
    {
      captainName: '장부 검증',
      crewName: '하나의 금고',
      shipName: '파도 장부',
      flagMark: '✥',
      flagColor: '#182126',
      trait: 'negotiator',
      difficulty: 'captain',
      seed: 91
    },
    1_000
  );
}

describe('authoritative settlement economy', () => {
  it('credits mission rewards into spatial storage and keeps them after simulation advances', () => {
    const initial = game();
    initial.missions[0] = { ...initial.missions[0], status: 'complete', claimed: false };
    const rewarded = claimMissionReward(initial, initial.missions[0].id);
    const store = rewarded.settlement.buildings.find(
      (building) => building.definitionId === 'wreckage'
    )!;
    expect(store.outputInventory.gold).toBe(760);
    expect(rewarded.resources.gold).toBe(760);

    const advanced = advanceSimulation(rewarded, 1, 2_000);
    expect(advanced.resources.gold).toBe(760);
    expect(
      advanced.settlement.buildings.find((building) => building.definitionId === 'wreckage')
        ?.outputInventory.gold
    ).toBe(760);
  });

  it('never spends cargo reserved for an active physical transport', () => {
    const initial = game();
    const wreckage = initial.settlement.buildings.find(
      (building) => building.definitionId === 'wreckage'
    )!;
    wreckage.reservedInventory.gold = 510;
    expect(canAffordGameResources(initial, { gold: 11 })).toBe(false);
    expect(spendGameResources(initial, { gold: 11 })).toBeUndefined();

    const spent = spendGameResources(initial, { gold: 10 });
    expect(spent).toBeDefined();
    const persisted = spent!.settlement.buildings.find((building) => building.id === wreckage.id)!;
    expect(persisted.outputInventory.gold).toBe(510);
    expect(persisted.reservedInventory.gold).toBe(510);
    expect(spent!.resources.gold).toBe(510);
  });
});
