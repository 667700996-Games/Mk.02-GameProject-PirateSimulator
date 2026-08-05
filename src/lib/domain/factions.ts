import { clamp } from './physics';
import type { FactionId, FactionRelation, GameState, ResourceId, ResourceStock } from './types';

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

export type NotorietyAction = 'bribe' | 'forge-identity' | 'destroy-records' | 'lay-low';

export interface NotorietyActionQuote {
  action: NotorietyAction;
  name: string;
  description: string;
  cost: Partial<ResourceStock>;
  bountyReduction: number;
  heatReduction: number;
  requirement?: string;
  available: boolean;
}

export function notorietyActionQuotes(state: GameState): NotorietyActionQuote[] {
  const intelLevel = state.haven.facilities['intel-den']?.level ?? 0;
  const hiddenDockLevel = state.haven.facilities['hidden-dock']?.level ?? 0;
  const bribeCost = Math.max(120, Math.round(state.bounty * .16));
  return [
    { action: 'bribe', name: '관리 매수', description: '제국 세관의 최근 신고서를 밀봉합니다.', cost: { gold: bribeCost }, bountyReduction: Math.max(80, Math.round(state.bounty * .24)), heatReduction: 18, available: state.bounty > 0 && state.resources.gold >= bribeCost },
    { action: 'forge-identity', name: '위조 신분', description: '새 선적과 통관 증서를 만듭니다.', cost: { gold: 260, contraband: 3, cloth: 4 }, bountyReduction: Math.max(140, Math.round(state.bounty * .34)), heatReduction: 28, requirement: '정보상 거점 1레벨', available: intelLevel >= 1 && state.bounty > 0 && hasResources(state.resources, { gold: 260, contraband: 3, cloth: 4 }) },
    { action: 'destroy-records', name: '수배 기록 소각', description: '잠입조가 해군 문서고의 현상수배 장부를 없앩니다.', cost: { gold: 440, powder: 5, medicine: 2 }, bountyReduction: Math.max(260, Math.round(state.bounty * .48)), heatReduction: 14, requirement: '정보상 거점 2레벨', available: intelLevel >= 2 && state.bounty > 0 && hasResources(state.resources, { gold: 440, powder: 5, medicine: 2 }) },
    { action: 'lay-low', name: '비밀 부두에서 은신', description: '함선을 숨기고 일주일 동안 출항을 중단합니다.', cost: { food: 18, rum: 6 }, bountyReduction: 35 + hiddenDockLevel * 30, heatReduction: 30 + hiddenDockLevel * 8, requirement: '은신 부두 1레벨', available: hiddenDockLevel >= 1 && !state.voyage.atSea && hasResources(state.resources, { food: 18, rum: 6 }) }
  ];
}

export function performNotorietyAction(state: GameState, action: NotorietyAction): GameState {
  const quote = notorietyActionQuotes(state).find((item) => item.action === action);
  if (!quote?.available) return state;
  const resources = spendResources(state.resources, quote.cost);
  const navy = state.factions['imperial-navy'];
  const isIllegalManipulation = action === 'forge-identity' || action === 'destroy-records';
  return {
    ...state,
    resources,
    bounty: Math.max(0, state.bounty - quote.bountyReduction),
    heat: clamp(state.heat - quote.heatReduction, 0, 100),
    world: action === 'lay-low' ? { ...state.world, day: state.world.day + 7, recentEvents: [`${state.captain.name} 선장이 은신해 추격대의 눈을 피했다.`, ...state.world.recentEvents].slice(0, 8) } : state.world,
    factions: { ...state.factions, 'imperial-navy': { ...navy, hostility: clamp(navy.hostility + (isIllegalManipulation ? 3 : -2), 0, 100), lastChangedAt: Date.now() } },
    flags: { ...state.flags, forgedIdentity: action === 'forge-identity' ? true : state.flags.forgedIdentity ?? false }
  };
}

export function sendFactionGift(state: GameState, factionId: FactionId): GameState {
  const relation = state.factions[factionId];
  if (factionId === 'imperial-navy' || factionId === 'bounty-hunters' || factionId === 'red-tide' || state.resources.gold < 240 || relation.hostility >= 85) return state;
  return {
    ...state,
    resources: { ...state.resources, gold: state.resources.gold - 240 },
    factions: { ...state.factions, [factionId]: { ...relation, favor: clamp(relation.favor + 10, -100, 100), hostility: clamp(relation.hostility - 7, 0, 100), respect: clamp(relation.respect + 3, 0, 100), tradeAllowed: relation.hostility - 7 < 70, lastChangedAt: Date.now() } }
  };
}

export function formAlliance(state: GameState, factionId: FactionId): GameState {
  const relation = state.factions[factionId];
  const councilLevel = state.haven.facilities['pirate-council']?.level ?? 0;
  if (councilLevel < 1 || relation.favor < 55 || relation.respect < 30 || relation.hostility > 25 || factionId === 'imperial-navy' || factionId === 'bounty-hunters') return state;
  return {
    ...state,
    flags: { ...state.flags, [`alliance:${factionId}`]: true, [`war:${factionId}`]: false },
    factions: { ...state.factions, [factionId]: { ...relation, favor: clamp(relation.favor + 8, -100, 100), respect: clamp(relation.respect + 12, 0, 100), tradeAllowed: true, lastChangedAt: Date.now() } },
    captain: { ...state.captain, renown: state.captain.renown + 20 }
  };
}

export function declareFactionWar(state: GameState, factionId: FactionId): GameState {
  const councilLevel = state.haven.facilities['pirate-council']?.level ?? 0;
  if (councilLevel < 1 || state.flags[`war:${factionId}`]) return state;
  const relation = state.factions[factionId];
  return {
    ...state,
    flags: { ...state.flags, [`war:${factionId}`]: true, [`alliance:${factionId}`]: false },
    factions: { ...state.factions, [factionId]: { ...relation, favor: -100, hostility: 100, fear: clamp(relation.fear + 12, 0, 100), respect: clamp(relation.respect + 5, 0, 100), tradeAllowed: false, lastChangedAt: Date.now() } },
    bounty: factionId === 'imperial-navy' ? state.bounty + 350 : state.bounty,
    heat: clamp(state.heat + 14, 0, 100),
    captain: { ...state.captain, infamy: state.captain.infamy + 12 }
  };
}

function hasResources(resources: ResourceStock, cost: Partial<ResourceStock>): boolean {
  return (Object.entries(cost) as [ResourceId, number][]).every(([id, amount]) => resources[id] >= amount);
}

function spendResources(resources: ResourceStock, cost: Partial<ResourceStock>): ResourceStock {
  const next = { ...resources };
  for (const [id, amount] of Object.entries(cost) as [ResourceId, number][]) next[id] -= amount;
  return next;
}
