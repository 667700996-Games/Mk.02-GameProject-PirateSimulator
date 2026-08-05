import { describe, expect, it } from 'vitest';
import { SETTLEMENTS } from './catalog';
import { beginRaid, beginRaidPlanning, completeRaidScouting, configureRaid, launchPreparedRaid, lootRaidTarget } from './raid';

describe('settlement raids', () => {
  it('connects scouting and tactical preparation to the live raid', () => {
    const settlement = SETTLEMENTS.find((item) => item.id === 'saltwind')!;
    let raid = beginRaidPlanning(settlement, 14);
    expect(raid.phase).toBe('scouting');
    raid = completeRaidScouting(raid);
    raid = configureRaid(raid, { approach: 'stealth', landingPoint: 'hidden-cove', equipment: 'smoke-bombs', crewCommitted: 10 }, 14);
    raid = launchPreparedRaid(raid, settlement, 'raider');
    expect(raid.phase).toBe('looting');
    expect(raid.alarm).toBeLessThan(settlement.alert);
    expect(raid.timeRemaining).toBeGreaterThan(140);
  });

  it('spends limited time and recovers target-specific loot', () => {
    const settlement = SETTLEMENTS.find((item) => item.id === 'saltwind')!;
    const raid = beginRaid(settlement, 12, 'stealth', 'raider');
    const next = lootRaidTarget(raid, settlement, 'granary', 'captain', 'raider', () => 0.5);
    expect(next.timeRemaining).toBeLessThan(raid.timeRemaining);
    expect(next.selectedTargets).toContain('granary');
    expect(next.recoveredLoot.food).toBeGreaterThan(0);
  });
});
