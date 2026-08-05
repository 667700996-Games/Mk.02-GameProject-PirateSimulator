import { describe, expect, it } from 'vitest';
import { SETTLEMENTS } from './catalog';
import { beginRaid, lootRaidTarget } from './raid';

describe('settlement raids', () => {
  it('spends limited time and recovers target-specific loot', () => {
    const settlement = SETTLEMENTS.find((item) => item.id === 'saltwind')!;
    const raid = beginRaid(settlement, 12, 'stealth', 'raider');
    const next = lootRaidTarget(raid, settlement, 'granary', 'captain', 'raider', () => 0.5);
    expect(next.timeRemaining).toBeLessThan(raid.timeRemaining);
    expect(next.selectedTargets).toContain('granary');
    expect(next.recoveredLoot.food).toBeGreaterThan(0);
  });
});
