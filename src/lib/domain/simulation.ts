import { calculateHavenDefense, calculateHavenTier, completeConstructions, facilityEfficiency, tickHavenDay } from './haven';
import { clamp } from './physics';
import { createId } from './rng';
import { updateFleetAssignments } from './fleet';
import { expireAndRefreshMissions } from './missions';
import type { GameState } from './types';

export function advanceSimulation(state: GameState, realSeconds: number, now = Date.now()): GameState {
  if (state.paused) return state;
  const previousDay = state.world.day;
  const elapsedGameHours = realSeconds / 60;
  const absoluteHours = (state.world.day - 1) * 24 + state.world.hour + elapsedGameHours;
  const day = Math.floor(absoluteHours / 24) + 1;
  const hour = absoluteHours % 24;
  let next: GameState = expireAndRefreshMissions(updateFleetAssignments({
    ...state,
    playTimeSeconds: state.playTimeSeconds + realSeconds,
    haven: completeConstructions(state.haven, now),
    world: { ...state.world, day, hour }
  }, now), now);

  if (day > previousDay) {
    for (let elapsedDay = previousDay; elapsedDay < day; elapsedDay += 1) next = advanceDay(next);
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

function advanceDay(state: GameState): GameState {
  const daily = tickHavenDay(state.haven);
  const foodSurplus = daily.haven.food > daily.haven.population * 1.2;
  const safe = daily.haven.order > 52 && daily.haven.morale > 48;
  const capacity = daily.haven.tier * daily.haven.tier * 22 + (daily.haven.facilities.warehouse?.level ?? 0) * 18;
  const growth = foodSurplus && safe && daily.haven.population < capacity ? Math.max(1, Math.floor(daily.haven.population * .025)) : 0;
  const population = daily.haven.population + growth;
  const tier = calculateHavenTier(state.captain.renown, population);
  const laborerGrowth = Math.ceil(growth * .35);
  const sailorsGrowth = Math.ceil(growth * .2);
  const timber = Math.round((4 + daily.haven.populationByRole.laborers * .18) * (0.65 + facilityEfficiency(daily.haven, 'warehouse') * .35));
  const powder = Math.round((daily.haven.facilities['powder-magazine']?.level ?? 0) * 3 * facilityEfficiency(daily.haven, 'powder-magazine'));
  const gold = Math.round((daily.haven.facilities['black-market']?.level ?? 0) * 16 * facilityEfficiency(daily.haven, 'black-market'));
  const foodProduction = Math.round(8 + daily.haven.tier * 3 + daily.haven.populationByRole.civilians * .08);
  return {
    ...state,
    haven: {
      ...daily.haven,
      tier,
      population,
      food: daily.haven.food + foodProduction,
      populationByRole: {
        ...daily.haven.populationByRole,
        laborers: daily.haven.populationByRole.laborers + laborerGrowth,
        sailors: daily.haven.populationByRole.sailors + sailorsGrowth,
        civilians: daily.haven.populationByRole.civilians + Math.max(0, growth - laborerGrowth - sailorsGrowth)
      }
    },
    resources: {
      ...state.resources,
      gold: state.resources.gold + gold,
      timber: state.resources.timber + timber,
      powder: state.resources.powder + powder,
      food: state.resources.food + foodProduction
    },
    world: { ...state.world, marketCycle: state.world.marketCycle + 1, recentEvents: [...daily.events, ...state.world.recentEvents].slice(0, 6) },
    toasts: daily.events.length > 0 ? [...state.toasts, { id: createId('toast'), kind: 'warning', title: `${state.world.day}일차 본거지 보고`, detail: daily.events[0], createdAt: Date.now() }] : state.toasts
  };
}
