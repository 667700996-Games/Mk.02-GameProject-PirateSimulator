import { describe, expect, it } from 'vitest';
import { createNewGame } from './initialState';
import { buildFacility, calculateHavenTier, checkFacilityBuild, facilityCost } from './haven';

const game = createNewGame({ captainName: '건축가', crewName: '검은 망치', shipName: '초석', flagMark: 'tower', flagColor: '#80332a', trait: 'architect', difficulty: 'captain', seed: 7 }, 1000);

describe('pirate haven', () => {
  it('discounts facility costs for an architect', () => {
    expect(facilityCost('shipyard', 1, 'architect').gold).toBeLessThan(facilityCost('shipyard', 1, 'gunner').gold as number);
  });

  it('enforces tier prerequisites', () => {
    expect(checkFacilityBuild(game, 'pirate-council').allowed).toBe(false);
    expect(checkFacilityBuild(game, 'pirate-council').reason).toContain('본거지');
  });

  it('builds a facility after resources and workers are available', () => {
    const rich = structuredClone(game);
    rich.resources = { ...rich.resources, gold: 5000, timber: 500, iron: 500, rope: 500 };
    rich.haven = { ...rich.haven, tier: 2, populationByRole: { ...rich.haven.populationByRole, laborers: 30 } };
    rich.settlement.buildings.find((building) => building.definitionId === 'wreckage')!.outputInventory = { gold: 5000, planks: 500, 'iron-ingots': 500, rope: 500 };
    const next = buildFacility(rich, 'shipyard', 2000);
    expect(next.haven.facilities.shipyard?.level).toBe(1);
    expect(next.resources.gold).toBeLessThan(rich.resources.gold);
    expect(next.haven.facilities.shipyard?.constructionEndsAt).toBeGreaterThan(2000);
  });

  it('advances tiers only when renown and population agree', () => {
    expect(calculateHavenTier(500, 80)).toBe(3);
    expect(calculateHavenTier(500, 130)).toBe(4);
  });
});
