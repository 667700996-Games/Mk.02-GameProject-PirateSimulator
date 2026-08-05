import { clamp } from './physics';
import type { FactionId, FactionRelation, GameState } from './types';

export interface NotorietyEvent {
  bounty: number;
  heat: number;
  infamy: number;
  renown: number;
  relations: Partial<Record<FactionId, { favor?: number; hostility?: number; fear?: number; respect?: number }>>;
}

export const NOTORIETY_EVENTS = {
  merchantRaid: { bounty: 85, heat: 12, infamy: 8, renown: 5, relations: { 'merchant-league': { favor: -8, hostility: 12 }, 'imperial-navy': { hostility: 5 }, 'free-pirates': { respect: 3 } } },
  navySink: { bounty: 240, heat: 24, infamy: 18, renown: 16, relations: { 'imperial-navy': { favor: -16, hostility: 22, fear: 8 }, 'free-pirates': { respect: 10 }, 'bounty-hunters': { hostility: 10 } } },
  villageRaid: { bounty: 130, heat: 18, infamy: 14, renown: 7, relations: { 'colonial-alliance': { favor: -14, hostility: 16 }, 'isle-kin': { favor: -6 } } },
  spareCrew: { bounty: -15, heat: -3, infamy: -2, renown: 2, relations: { 'free-pirates': { respect: 2 } } },
  smuggling: { bounty: 35, heat: 7, infamy: 3, renown: 2, relations: { 'smugglers-guild': { favor: 7, respect: 4 }, 'imperial-navy': { hostility: 2 } } }
} satisfies Record<string, NotorietyEvent>;

export function applyNotoriety(state: GameState, event: NotorietyEvent, now = Date.now()): GameState {
  const factions = { ...state.factions };
  for (const [id, change] of Object.entries(event.relations) as [FactionId, NonNullable<NotorietyEvent['relations'][FactionId]>][]) {
    const current = factions[id];
    const next: FactionRelation = {
      ...current,
      favor: clamp(current.favor + (change.favor ?? 0), -100, 100),
      hostility: clamp(current.hostility + (change.hostility ?? 0), 0, 100),
      fear: clamp(current.fear + (change.fear ?? 0), 0, 100),
      respect: clamp(current.respect + (change.respect ?? 0), 0, 100),
      lastChangedAt: now,
      tradeAllowed: current.hostility + (change.hostility ?? 0) < 70
    };
    factions[id] = next;
  }
  return {
    ...state,
    captain: { ...state.captain, infamy: Math.max(0, state.captain.infamy + event.infamy), renown: Math.max(0, state.captain.renown + event.renown) },
    bounty: Math.max(0, state.bounty + event.bounty),
    heat: clamp(state.heat + event.heat, 0, 100),
    factions
  };
}

export function pursuitTier(bounty: number): { tier: number; name: string; patrolMultiplier: number; hunterChance: number } {
  if (bounty >= 8000) return { tier: 6, name: '제국의 최우선 표적', patrolMultiplier: 2.8, hunterChance: 0.42 };
  if (bounty >= 4000) return { tier: 5, name: '검은 함대령', patrolMultiplier: 2.25, hunterChance: 0.3 };
  if (bounty >= 1800) return { tier: 4, name: '악명 높은 해적', patrolMultiplier: 1.8, hunterChance: 0.2 };
  if (bounty >= 700) return { tier: 3, name: '수배 선장', patrolMultiplier: 1.45, hunterChance: 0.12 };
  if (bounty >= 220) return { tier: 2, name: '현상금 표적', patrolMultiplier: 1.2, hunterChance: 0.06 };
  if (bounty > 0) return { tier: 1, name: '경계 대상', patrolMultiplier: 1.05, hunterChance: 0.02 };
  return { tier: 0, name: '알려지지 않음', patrolMultiplier: 1, hunterChance: 0 };
}

export function decayHeat(state: GameState, days: number, hiddenDockLevel = 0): GameState {
  const heatReduction = days * (2.5 + hiddenDockLevel * 1.2);
  const bountyReduction = days * (hiddenDockLevel > 0 ? 4 + hiddenDockLevel * 2 : 1);
  return { ...state, heat: clamp(state.heat - heatReduction, 0, 100), bounty: Math.max(0, state.bounty - bountyReduction) };
}
