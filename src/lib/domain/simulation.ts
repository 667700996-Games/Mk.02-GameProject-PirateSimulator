import { clamp } from './physics';
import { createId } from './rng';
import { updateFleetAssignments } from './fleet';
import { expireAndRefreshMissions, progressMissions } from './missions';
import { applyNotoriety, NOTORIETY_EVENTS } from './factions';
import type { GameState } from './types';
import { advanceSettlement } from '$lib/settlement/simulation';
import {
  settlementLegacyHaven,
  settlementLegacyResources,
  settlementSummary
} from '$lib/settlement/summary';
import { advanceShipConstruction } from '$lib/settlement/shipbuilding';
import { advanceExpeditions } from '$lib/settlement/expeditions';
import { tickDefenseCountdown } from './defense';
import { evaluateCampaign } from './campaign';
import { DIFFICULTIES } from './catalog';

export function advanceSimulation(state: GameState, realSeconds: number, now = Date.now()): GameState {
  if (state.paused) return state;
  const previousDay = state.world.day;
  const elapsedGameHours = realSeconds / 60;
  const absoluteHours = (state.world.day - 1) * 24 + state.world.hour + elapsedGameHours;
  const day = Math.floor(absoluteHours / 24) + 1;
  const hour = absoluteHours % 24;
  const difficulty = DIFFICULTIES[state.captain.difficulty];
  const advancedSettlement = advanceSettlement(state.settlement, realSeconds, {
    captainTrait: state.captain.trait,
    productionMultiplier: difficulty.production,
    consumptionMultiplier: difficulty.consumption
  });
  const shipbuilding = advanceShipConstruction(advancedSettlement, state.ships, realSeconds * advancedSettlement.speed);
  const expeditions = advanceExpeditions(
    shipbuilding.settlement,
    shipbuilding.ships,
    realSeconds * shipbuilding.settlement.speed,
    now,
    { trait: state.captain.trait, difficulty: state.captain.difficulty }
  );
  const settlement = expeditions.settlement;
  let next: GameState = expireAndRefreshMissions(updateFleetAssignments({
    ...state,
    playTimeSeconds: state.playTimeSeconds + realSeconds,
    settlement,
    haven: settlementLegacyHaven(settlement, state.haven),
    resources: settlementLegacyResources(settlement),
    ships: expeditions.ships,
    world: { ...state.world, day, hour }
  }, now), now);

  const settlementMilestones = Math.max(
    0,
    settlement.tutorialStep - state.settlement.tutorialStep
  );
  if (settlementMilestones > 0)
    next = progressMissions(next, {
      kind: 'settlement-milestone',
      zoneId: 'beginners-bay',
      amount: settlementMilestones
    });

  const newlyCompleted = settlement.expeditions.filter((expedition) => expedition.state === 'COMPLETED' && state.settlement.expeditions.find((previous) => previous.id === expedition.id)?.state !== 'COMPLETED');
  if (newlyCompleted.length > 0) {
    const zones = { ...next.world.zones };
    for (const expedition of newlyCompleted) {
      zones[expedition.zoneId] = { ...zones[expedition.zoneId], discovered: true, intel: Math.min(100, zones[expedition.zoneId].intel + 24) };
      if (expedition.purpose === 'raid') {
        const opponent = ['naval-patrol', 'imperial-heartway'].includes(expedition.zoneId) ? 'navy' as const : 'merchant' as const;
        next = progressMissions(next, { kind: 'ship-defeated', zoneId: expedition.zoneId, opponent });
        next = progressMissions(next, { kind: 'cargo-stolen', zoneId: expedition.zoneId, amount: Math.max(1, Object.values(expedition.cargo).reduce((sum, value) => sum + (value ?? 0), 0)) });
        next = progressMissions(next, { kind: 'raid-complete', zoneId: expedition.zoneId });
        next = applyNotoriety(next, opponent === 'navy' ? NOTORIETY_EVENTS.navySink : NOTORIETY_EVENTS.merchantRaid, now);
      } else if (expedition.purpose === 'explore') next = progressMissions(next, { kind: 'treasure-found', zoneId: expedition.zoneId });
      else if (expedition.purpose === 'trade') next = progressMissions(next, { kind: 'contraband-delivered', zoneId: expedition.zoneId, amount: Math.max(1, expedition.cargo['royal-equipment'] ?? 3) });
      else next = progressMissions(next, { kind: 'survivor-rescued', zoneId: expedition.zoneId });
    }
    next = { ...next, world: { ...next.world, zones, recentEvents: [`${newlyCompleted[0].name}이 새로운 항로와 섬을 해도에 기록했다.`, ...next.world.recentEvents].slice(0, 6) } };
  }

  if (day > previousDay) {
    next = { ...next, world: { ...next.world, marketCycle: next.world.marketCycle + (day - previousDay) } };
  }

  const havenSummary = settlementSummary(next.settlement);
  const detectionFactor = next.captain.trait === 'smuggler' ? 0.85 : 1;
  const threatGain =
    realSeconds *
    (next.bounty / 10000 + havenSummary.detectionRisk / 5000) *
    difficulty.pursuit *
    detectionFactor;
  const raidThreat = clamp(next.haven.raidThreat + threatGain, 0, 100);
  let invasion = { ...next.settlement.threat };
  if (raidThreat >= 65 && !invasion.active) {
    const watchtower = next.settlement.buildings.some((building) => ['watchtower', 'signal-tower', 'intelligence-network'].includes(building.definitionId) && building.state === 'ACTIVE' && building.workers.length > 0);
    invasion = {
      active: true,
      source: next.bounty > 1600 ? 'imperial-navy' : 'red-tide',
      discovered: watchtower,
      strength: Math.round(48 + havenSummary.tier * 32 + next.bounty / 85),
      etaHours: watchtower ? 18 : 7,
      fleetDescription: next.bounty > 1600 ? '프리깃과 해병 수송선' : '무장 브리그와 화공선'
    };
  } else if (invasion.active) invasion.etaHours = Math.max(0, invasion.etaHours - elapsedGameHours);
  next = {
    ...next,
    settlement: { ...next.settlement, threat: invasion },
    haven: { ...next.haven, raidThreat, defense: havenSummary.defense }
  };
  if ((raidThreat >= 100 || (invasion.active && invasion.etaHours <= 0)) && !next.defense.active && next.screen === 'haven') {
    next = {
      ...next,
      screen: 'defense',
      defense: {
        active: true,
        attacker: next.bounty > 1600 ? 'imperial-navy' : 'red-tide',
        stage: 'warning',
        attackStrength: invasion.strength || Math.round(48 + havenSummary.tier * 32 + next.bounty / 85),
        defenseStrength: havenSummary.defense,
        timeToAttack: 90,
        attackerRemaining: invasion.strength || Math.round(48 + havenSummary.tier * 32 + next.bounty / 85),
        preparation: 0,
        civilianRisk: 55,
        selectedActions: [],
        log: []
      },
      toasts: [...next.toasts, { id: createId('toast'), kind: 'danger', title: '본거지 공격 경보', detail: '감시탑이 수평선 위의 적 함대를 발견했습니다.', createdAt: now }]
    };
  }
  return evaluateCampaign(tickDefenseCountdown(next, realSeconds), now);
}
