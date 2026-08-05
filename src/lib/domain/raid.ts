import { DIFFICULTIES } from './catalog';
import { clamp } from './physics';
import type { CaptainTrait, Difficulty, RaidState, ResourceId, ResourceStock, SettlementState } from './types';

export interface RaidTarget {
  id: string;
  name: string;
  time: number;
  alarm: number;
  lootMultiplier: number;
  primaryResources: ResourceId[];
}

export const RAID_TARGETS: RaidTarget[] = [
  { id: 'warehouse', name: '항구 창고', time: 34, alarm: 13, lootMultiplier: 1, primaryResources: ['timber', 'cloth', 'rope', 'spices'] },
  { id: 'market', name: '중앙 시장', time: 28, alarm: 18, lootMultiplier: 0.85, primaryResources: ['gold', 'food', 'rum', 'medicine'] },
  { id: 'treasury', name: '세관 금고', time: 48, alarm: 30, lootMultiplier: 1.45, primaryResources: ['gold', 'gems', 'bullion'] },
  { id: 'armory', name: '무기고', time: 42, alarm: 26, lootMultiplier: 1.25, primaryResources: ['powder', 'cannonballs', 'iron', 'blueprints'] },
  { id: 'granary', name: '곡물 저장고', time: 24, alarm: 10, lootMultiplier: 0.9, primaryResources: ['food', 'rum'] },
  { id: 'manor', name: '귀족 저택', time: 44, alarm: 35, lootMultiplier: 1.3, primaryResources: ['gold', 'gems', 'relics'] },
  { id: 'shipyard', name: '조선소', time: 38, alarm: 22, lootMultiplier: 1.1, primaryResources: ['timber', 'iron', 'rope', 'blueprints'] }
];

export function beginRaid(settlement: SettlementState, crewCommitted: number, approach: 'stealth' | 'assault', trait: CaptainTrait): RaidState {
  const scoutBonus = trait === 'raider' ? 18 : 0;
  const baseTime = 145 + crewCommitted * 1.2 + scoutBonus;
  return {
    active: true,
    settlementId: settlement.id,
    phase: 'looting',
    crewCommitted,
    timeRemaining: baseTime,
    alarm: approach === 'stealth' ? Math.max(0, settlement.alert * 0.45 - 8) : settlement.alert + 24,
    selectedTargets: [],
    recoveredLoot: {},
    casualties: approach === 'assault' ? Math.floor(settlement.garrison / Math.max(crewCommitted * 7, 1)) : 0
  };
}

export function lootRaidTarget(
  state: RaidState,
  settlement: SettlementState,
  targetId: string,
  difficulty: Difficulty,
  trait: CaptainTrait,
  random: () => number
): RaidState {
  const target = RAID_TARGETS.find((item) => item.id === targetId);
  if (!state.active || !target || state.selectedTargets.includes(targetId) || state.timeRemaining < target.time) return state;
  const rewardScale = DIFFICULTIES[difficulty].rewards * (trait === 'raider' ? 1.15 : 1);
  const recoveredLoot = { ...state.recoveredLoot };
  for (const resource of target.primaryResources) {
    const available = settlement.loot[resource] ?? 0;
    if (available <= 0) continue;
    const recovered = Math.max(1, Math.floor(available * (0.08 + random() * 0.16) * target.lootMultiplier * rewardScale));
    recoveredLoot[resource] = (recoveredLoot[resource] ?? 0) + recovered;
  }
  const defensePressure = settlement.defense / Math.max(state.crewCommitted * 2.5, 1);
  const casualties = Math.max(0, Math.floor(defensePressure * (0.4 + random()) + state.alarm / 80 - 0.5));
  const timeRemaining = Math.max(0, state.timeRemaining - target.time);
  const alarm = clamp(state.alarm + target.alarm, 0, 100);
  return {
    ...state,
    timeRemaining,
    alarm,
    casualties: state.casualties + casualties,
    selectedTargets: [...state.selectedTargets, targetId],
    recoveredLoot,
    phase: timeRemaining <= 0 || alarm >= 100 ? 'escape' : 'looting'
  };
}

export function raidLootValue(loot: Partial<ResourceStock>): number {
  return Object.values(loot).reduce((sum, amount) => sum + (amount ?? 0), 0);
}
