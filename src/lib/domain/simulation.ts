import { calculateHavenDefense, completeConstructions } from './haven';
import { clamp } from './physics';
import { createId } from './rng';
import { updateFleetAssignments } from './fleet';
import { expireAndRefreshMissions } from './missions';
import type { GameState } from './types';
import { advanceSettlement } from '$lib/settlement/simulation';
import { settlementLegacyHaven, settlementLegacyResources } from '$lib/settlement/summary';

export function advanceSimulation(state: GameState, realSeconds: number, now = Date.now()): GameState {
  if (state.paused) return state;
  const previousDay = state.world.day;
  const elapsedGameHours = realSeconds / 60;
  const absoluteHours = (state.world.day - 1) * 24 + state.world.hour + elapsedGameHours;
  const day = Math.floor(absoluteHours / 24) + 1;
  const hour = absoluteHours % 24;
  const settlement = advanceSettlement(state.settlement, realSeconds);
  let next: GameState = expireAndRefreshMissions(updateFleetAssignments({
    ...state,
    playTimeSeconds: state.playTimeSeconds + realSeconds,
    settlement,
    haven: settlementLegacyHaven(settlement, completeConstructions(state.haven, now)),
    resources: settlementLegacyResources(settlement, state.resources),
    world: { ...state.world, day, hour }
  }, now), now);

  if (day > previousDay) {
    next = { ...next, world: { ...next.world, marketCycle: next.world.marketCycle + (day - previousDay) } };
  }

  const threatGain = realSeconds * (next.bounty / 10000 + next.haven.detectionRisk / 5000);
  const raidThreat = clamp(next.haven.raidThreat + threatGain, 0, 100);
  next = { ...next, haven: { ...next.haven, raidThreat, defense: calculateHavenDefense(next.haven) } };
  if (raidThreat >= 100 && !next.defense.active && next.screen === 'haven') {
    next = {
      ...next,
      screen: 'defense',
      defense: {
        active: true,
        attacker: next.bounty > 1600 ? 'imperial-navy' : 'red-tide',
        stage: 'warning',
        attackStrength: Math.round(48 + next.haven.tier * 32 + next.bounty / 85),
        defenseStrength: calculateHavenDefense(next.haven),
        timeToAttack: 90,
        attackerRemaining: Math.round(48 + next.haven.tier * 32 + next.bounty / 85),
        preparation: 0,
        civilianRisk: 55,
        selectedActions: [],
        log: []
      },
      toasts: [...next.toasts, { id: createId('toast'), kind: 'danger', title: '본거지 공격 경보', detail: '감시탑이 수평선 위의 적 함대를 발견했습니다.', createdAt: now }]
    };
  }
  return next;
}
