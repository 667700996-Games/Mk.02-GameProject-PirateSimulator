import { DIFFICULTIES, FACTIONS } from './catalog';
import { fleetDefensePower } from './fleet';
import { progressMissions } from './missions';
import { clamp } from './physics';
import type { FacilityId, GameState } from './types';
import { spendSettlementResources } from '$lib/settlement/construction';
import { creditGameResources, spendGameResources } from '$lib/settlement/economyBridge';
import { settlementSummary } from '$lib/settlement/summary';
import type { PartialSettlementInventory, SettlementSimulationState } from '$lib/settlement/types';
import { createId } from './rng';

export type PreparationAction = 'muster' | 'powder' | 'barricades' | 'evacuate';
export type NavalAction = 'crossfire' | 'fleet-charge' | 'fire-ships';
export type LandingAction = 'beach-ambush' | 'hold-walls' | 'counterattack';
export type InteriorAction = 'last-stand' | 'powder-trap' | 'organized-retreat';

export function lureRivalFleet(state: GameState, now = Date.now()): GameState {
  if (state.defense.active || state.settlement.threat.active) return state;
  const paid = spendGameResources(state, { gold: 80, rum: 4 });
  if (!paid) return state;
  return {
    ...paid,
    screen: 'haven',
    previousScreen: state.screen,
    haven: { ...paid.haven, raidThreat: 100 },
    settlement: {
      ...paid.settlement,
      threat: { active: true, source: 'red-tide', discovered: true, strength: 92, etaHours: 0, fleetDescription: '유인 신호를 쫓는 붉은 파도 무장 브리그' }
    },
    toasts: [...paid.toasts.slice(-3), { id: createId('toast'), kind: 'danger', title: '검은 미끼 작전', detail: '럼주와 거짓 해도를 흘려 붉은 파도 함대를 방어 수역으로 유인했습니다.', createdAt: now }]
  };
}

export function tickDefenseCountdown(state: GameState, realSeconds: number): GameState {
  if (!state.defense.active || !['warning', 'preparation'].includes(state.defense.stage) || realSeconds <= 0) return state;
  const timeToAttack = Math.max(0, state.defense.timeToAttack - realSeconds);
  const counted = { ...state, defense: { ...state.defense, timeToAttack } };
  if (timeToAttack > 0) return counted;
  const prepared = counted.defense.stage === 'warning' ? beginDefensePreparation(counted) : counted;
  const launched = launchDefense(prepared);
  return {
    ...launched,
    defense: {
      ...launched.defense,
      log: [...(launched.defense.log ?? []), '준비 시간이 끝났다. 남은 수비대가 즉시 포문을 열었다.']
    }
  };
}

export function beginDefensePreparation(state: GameState): GameState {
  if (!state.defense.active || state.defense.stage !== 'warning') return state;
  return { ...state, defense: { ...state.defense, stage: 'preparation', attackerRemaining: state.defense.attackStrength, preparation: 0, civilianRisk: 55, selectedActions: [], losses: state.defense.losses ?? { wounded: 0, killed: 0, shipsLost: 0 }, log: [...(state.defense.log ?? []), `${attackerName(state)} 함대가 만 입구로 접근한다.`] } };
}

export function prepareDefense(state: GameState, action: PreparationAction): GameState {
  if (!state.defense.active || state.defense.stage !== 'preparation' || state.defense.selectedActions?.includes(action)) return state;
  const costs: Record<PreparationAction, PartialSettlementInventory> = {
    muster: { hardtack: 10, rum: 4 }, powder: {}, barricades: { planks: 18, 'iron-ingots': 5 }, evacuate: { hardtack: 8 }
  };
  const cost = costs[action];
  if (action === 'powder' && batteryAmmunition(state.settlement) < 18) return state;
  const settlement = spendSettlementResources(state.settlement, cost);
  if (!settlement) return state;
  const preparationGain: Record<PreparationAction, number> = { muster: 16, powder: 24, barricades: 20, evacuate: 6 };
  const riskChange: Record<PreparationAction, number> = { muster: -4, powder: 3, barricades: -8, evacuate: -30 };
  const messages: Record<PreparationAction, string> = { muster: '전투 선원과 민병대를 해안 성벽에 집결시켰다.', powder: '화약과 포탄을 모든 포대에 배치했다.', barricades: '부두와 골목에 목책과 쇠사슬을 설치했다.', evacuate: '민간인과 부상자를 절벽 동굴로 대피시켰다.' };
  return {
    ...state,
    settlement,
    defense: {
      ...state.defense,
      preparation: (state.defense.preparation ?? 0) + preparationGain[action],
      civilianRisk: clamp((state.defense.civilianRisk ?? 55) + riskChange[action], 0, 100),
      selectedActions: [...(state.defense.selectedActions ?? []), action],
      log: [...(state.defense.log ?? []), messages[action]]
    }
  };
}

export function launchDefense(state: GameState): GameState {
  if (!state.defense.active || state.defense.stage !== 'preparation') return state;
  const defenseStrength = settlementSummary(state.settlement).defense + fleetDefensePower(state) + (state.defense.preparation ?? 0);
  return { ...state, defense: { ...state.defense, stage: 'naval', defenseStrength, attackerRemaining: state.defense.attackStrength, log: [...(state.defense.log ?? []), '해안 포대가 일제히 불을 뿜으며 해상 방어전이 시작됐다.'] } };
}

export function resolveNavalStage(state: GameState, action: NavalAction, random: () => number = Math.random): GameState {
  if (state.defense.stage !== 'naval') return state;
  const remaining = state.defense.attackerRemaining ?? state.defense.attackStrength;
  const modifiers: Record<NavalAction, { attack: number; shipRisk: number; havenRisk: number; label: string }> = {
    crossfire: { attack: 1.08, shipRisk: .18, havenRisk: .12, label: '해안 포대가 교차 사격으로 선두함을 분쇄했다.' },
    'fleet-charge': { attack: 1.3, shipRisk: .42, havenRisk: .05, label: '주둔 함대가 적 전열의 중앙을 돌파했다.' },
    'fire-ships': { attack: 1.48, shipRisk: .12, havenRisk: .24, label: '불붙은 폐선을 조류에 실어 적 함대에 충돌시켰다.' }
  };
  const choice = modifiers[action];
  const lossMultiplier = DIFFICULTIES[state.captain.difficulty].losses;
  const batteryReadiness = Math.min(1, batteryAmmunition(state.settlement) / 24);
  const batteryResult = action === 'fleet-charge' ? state.settlement : consumeBatteryAmmunition(state.settlement, 10, 5);
  const batteryFactor = action === 'fleet-charge' ? 1 : 0.35 + batteryReadiness * 0.65;
  const power = (state.defense.defenseStrength * .58 * batteryFactor + fleetDefensePower(state) * .42) * choice.attack;
  const damage = Math.max(8, Math.round(power * (.48 + random() * .34)));
  const attackerRemaining = Math.max(0, remaining - damage);
  const shipDamage = Math.round(remaining * choice.shipRisk * (.35 + random() * .45) * lossMultiplier);
  const havenDamage = Math.round(remaining * choice.havenRisk * (.22 + random() * .4) * lossMultiplier);
  const ships = damageFleet(state, shipDamage);
  const haven = { ...state.haven, defense: Math.max(0, state.haven.defense - havenDamage) };
  if (attackerRemaining <= 0) return finishDefense({ ...state, settlement: batteryResult, ships, haven, defense: { ...state.defense, attackerRemaining, log: [...(state.defense.log ?? []), choice.label, '적 함대가 상륙하기 전에 퇴각했다.'] } }, true);
  return { ...state, settlement: batteryResult, ships, haven, defense: { ...state.defense, stage: 'landing', attackerRemaining, selectedActions: [...(state.defense.selectedActions ?? []), action], log: [...(state.defense.log ?? []), choice.label, batteryReadiness < .4 ? '포대 탄약이 바닥나 화망이 끊겼다.' : `${Math.round(attackerRemaining)} 전력의 상륙대가 해변에 도달했다.`] } };
}

export function resolveLandingStage(state: GameState, action: LandingAction, random: () => number = Math.random): GameState {
  if (state.defense.stage !== 'landing') return state;
  const remaining = state.defense.attackerRemaining ?? 0;
  const modifiers: Record<LandingAction, { attack: number; casualty: number; civilian: number; label: string }> = {
    'beach-ambush': { attack: 1.18, casualty: .22, civilian: -5, label: '바위 뒤에 숨은 사수들이 상륙정을 향해 일제 사격했다.' },
    'hold-walls': { attack: .92, casualty: .12, civilian: -12, label: '수비대가 목책 뒤에서 좁은 진입로를 지켰다.' },
    counterattack: { attack: 1.38, casualty: .4, civilian: 9, label: '해적 전투원들이 해변으로 돌진해 적의 대형을 무너뜨렸다.' }
  };
  const choice = modifiers[action];
  const fighterPower = (state.haven.populationByRole.fighters * 2.2 + state.crew.roles.marine * 3 + (state.defense.preparation ?? 0) * .65) * choice.attack;
  const damage = Math.max(5, Math.round(fighterPower * (.58 + random() * .35)));
  const attackerRemaining = Math.max(0, remaining - damage);
  const wallProtection = Math.min(.38, state.settlement.buildings.filter((building) => building.definitionId === 'fort-wall' && building.state === 'ACTIVE').reduce((sum, wall) => sum + wall.level * wall.condition / 2500, 0));
  const civilianRisk = clamp((state.defense.civilianRisk ?? 50) + choice.civilian, 0, 100);
  const lossMultiplier = DIFFICULTIES[state.captain.difficulty].losses;
  const casualties = Math.round(remaining * choice.casualty * (.18 + random() * .34) * (1 - wallProtection) * lossMultiplier);
  const fatalityRate = clamp((.08 + civilianRisk / 500) * lossMultiplier, .05, .42);
  const lossResult = applyResidentLosses(state.settlement, casualties, fatalityRate, random, true);
  const settlement = lossResult.settlement;
  const losses = mergeLosses(state, lossResult.wounded, lossResult.killed);
  const haven = {
    ...state.haven,
    population: settlement.residents.length,
    morale: clamp(state.haven.morale + (attackerRemaining <= 0 ? 8 : -6), 0, 100),
    populationByRole: {
      ...state.haven.populationByRole,
      fighters: settlement.residents.filter((resident) => ['guard', 'gunner', 'raider'].includes(resident.job)).length
    }
  };
  if (attackerRemaining <= 0) return finishDefense({ ...state, settlement, haven, defense: { ...state.defense, losses, attackerRemaining, civilianRisk, log: [...(state.defense.log ?? []), choice.label, '상륙대가 해변에서 무너졌다.'] } }, true);
  return { ...state, settlement, haven, defense: { ...state.defense, losses, stage: 'interior', attackerRemaining, civilianRisk, selectedActions: [...(state.defense.selectedActions ?? []), action], log: [...(state.defense.log ?? []), choice.label, lossResult.killed > 0 ? `수비대 ${lossResult.killed}명이 전사하고 ${lossResult.wounded}명이 부상했다.` : `${lossResult.wounded}명의 수비대가 부상했다.`, '남은 적이 부두를 넘어 본거지 내부로 침투했다.'] } };
}

export function resolveInteriorStage(state: GameState, action: InteriorAction, random: () => number = Math.random): GameState {
  if (state.defense.stage !== 'interior') return state;
  const remaining = state.defense.attackerRemaining ?? 0;
  const modifiers: Record<InteriorAction, { power: number; damage: number; civilian: number; label: string }> = {
    'last-stand': { power: 1.25, damage: .2, civilian: 8, label: '선장 관저 앞에서 마지막 방어선을 세웠다.' },
    'powder-trap': { power: 1.55, damage: .38, civilian: 15, label: '비워 둔 창고의 화약 덫이 골목 전체를 뒤흔들었다.' },
    'organized-retreat': { power: .62, damage: .08, civilian: -28, label: '주민을 비밀 통로로 빼내며 핵심 시설만 지켰다.' }
  };
  const choice = modifiers[action];
  const lossMultiplier = DIFFICULTIES[state.captain.difficulty].losses;
  const power = (state.crew.roles.marine * 4 + state.haven.order * .7 + state.captain.level * 8) * choice.power * (.72 + random() * .38);
  const victory = power >= remaining;
  const resourceDamage = (victory ? Math.round(remaining * choice.damage * .2) : Math.round(remaining * choice.damage + 35)) * lossMultiplier;
  const civilianRisk = clamp((state.defense.civilianRisk ?? 50) + choice.civilian, 0, 100);
  const facilities = damageFacilities(state, victory ? Math.ceil(resourceDamage / 12) : Math.ceil(resourceDamage / 5));
  let settlement = damageSettlementBuildings(state.settlement, victory ? Math.ceil(resourceDamage / 14) : Math.ceil(resourceDamage / 6));
  const interiorCasualties = Math.min(
    Math.max(0, settlement.residents.length - 1),
    Math.round(remaining * (victory ? .025 : .075) * (0.45 + civilianRisk / 100) * lossMultiplier)
  );
  const interiorLosses = applyResidentLosses(settlement, interiorCasualties, (victory ? .12 : .28) * lossMultiplier, random, false);
  settlement = interiorLosses.settlement;
  const loss = { gold: Math.min(state.resources.gold, resourceDamage * 4), food: Math.min(state.resources.food, Math.ceil(resourceDamage * .45)), timber: Math.min(state.resources.timber, Math.ceil(resourceDamage * .3)), powder: Math.min(state.resources.powder, Math.ceil(resourceDamage * .12)) };
  const damagedState = { ...state, settlement };
  const paid = spendGameResources(damagedState, loss) ?? damagedState;
  const losses = mergeLosses(paid, interiorLosses.wounded, interiorLosses.killed);
  const prepared = { ...paid, haven: { ...paid.haven, population: settlement.residents.length, facilities }, defense: { ...paid.defense, losses, attackerRemaining: victory ? 0 : remaining, civilianRisk, log: [...(paid.defense.log ?? []), choice.label, interiorLosses.killed > 0 ? `내부 전투에서 ${interiorLosses.killed}명이 목숨을 잃었다.` : '주민 대피로 추가 사망을 피했다.'] } };
  return finishDefense(prepared, victory);
}

function finishDefense(state: GameState, victory: boolean): GameState {
  const losses = state.defense.losses ?? { wounded: 0, killed: 0, shipsLost: 0 };
  let next: GameState = {
    ...state,
    defense: {
      ...state.defense,
      active: false,
      stage: 'resolved',
      outcome: victory ? 'victory' : 'defeat',
      damage: victory
        ? ['해안 방어선 일부 손상', `부상 ${losses.wounded}명`, `전사 ${losses.killed}명`]
        : ['창고 약탈', '시설 파손', `부상 ${losses.wounded}명 · 사망·이탈 ${losses.killed}명`],
      reward: victory ? { gold: Math.round(state.defense.attackStrength * 2.2), iron: Math.max(2, Math.round(state.defense.attackStrength / 35)) } : {}
    },
    haven: { ...state.haven, raidThreat: 0, morale: clamp(state.haven.morale + (victory ? 12 : -18), 0, 100), order: clamp(state.haven.order + (victory ? 6 : -14), 0, 100) },
    captain: { ...state.captain, renown: state.captain.renown + (victory ? 18 : 0) },
    flags: victory ? { ...state.flags, havenDefenseWon: true } : state.flags
  };
  if (victory) next = progressMissions(next, { kind: 'haven-defended', zoneId: 'beginners-bay' });
  return next;
}

function mergeLosses(state: GameState, wounded: number, killed: number): NonNullable<GameState['defense']['losses']> {
  const current = state.defense.losses ?? { wounded: 0, killed: 0, shipsLost: 0 };
  return { ...current, wounded: current.wounded + wounded, killed: current.killed + killed };
}

function applyResidentLosses(
  input: SettlementSimulationState,
  casualties: number,
  fatalityRate: number,
  random: () => number,
  defendersOnly: boolean
): { settlement: SettlementSimulationState; wounded: number; killed: number } {
  if (casualties <= 0) return { settlement: input, wounded: 0, killed: 0 };
  const settlement = structuredClone(input);
  const away = new Set(
    settlement.expeditions
      .filter((expedition) => !['COMPLETED', 'LOST'].includes(expedition.state))
      .flatMap((expedition) => expedition.crewIds)
  );
  const candidates = settlement.residents.filter((resident) =>
    !away.has(resident.id) && (!defendersOnly || ['guard', 'gunner', 'raider'].includes(resident.job))
  );
  candidates.sort((a, b) => a.health - b.health || a.id.localeCompare(b.id));
  const affected = candidates.slice(0, Math.min(casualties, candidates.length));
  const killedIds = new Set<string>();
  const injuredIds = new Set<string>();
  for (const resident of affected) {
    if (random() < fatalityRate && settlement.residents.length - killedIds.size > 1) killedIds.add(resident.id);
    else injuredIds.add(resident.id);
  }
  settlement.residents = settlement.residents
    .filter((resident) => !killedIds.has(resident.id))
    .map((resident) => injuredIds.has(resident.id)
      ? { ...resident, health: Math.max(1, resident.health - 45), morale: Math.max(0, resident.morale - 12), action: 'HEALING' as const }
      : resident);
  for (const building of settlement.buildings) building.workers = building.workers.filter((id) => !killedIds.has(id));
  for (const transport of settlement.transports) {
    if (transport.haulerId && killedIds.has(transport.haulerId)) {
      transport.haulerId = undefined;
      transport.state = 'WAITING';
      transport.progress = 0;
    }
  }
  return { settlement, wounded: injuredIds.size, killed: killedIds.size };
}

export function claimDefenseResult(state: GameState): GameState {
  if (state.defense.stage !== 'resolved') return state;
  const credited = creditGameResources(state, state.defense.reward ?? {});
  return { ...credited, settlement: { ...credited.settlement, threat: { ...credited.settlement.threat, active: false, discovered: false, strength: 0, etaHours: 0, fleetDescription: '' } }, screen: 'haven', defense: { ...credited.defense, reward: {}, log: [] } };
}

export function batteryAmmunition(settlement: SettlementSimulationState): number {
  return settlement.buildings.filter((building) => building.definitionId === 'coastal-battery' && building.state === 'ACTIVE' && building.workers.length > 0)
    .reduce((sum, battery) => sum + Math.min(battery.inputInventory.cannonballs ?? 0, (battery.inputInventory.powder ?? 0) * 2), 0);
}

function consumeBatteryAmmunition(input: SettlementSimulationState, cannonballs: number, powder: number): SettlementSimulationState {
  const settlement = structuredClone(input);
  let ballsRemaining = cannonballs;
  let powderRemaining = powder;
  for (const battery of settlement.buildings.filter((building) => building.definitionId === 'coastal-battery' && building.state === 'ACTIVE' && building.workers.length > 0)) {
    const balls = Math.min(ballsRemaining, battery.inputInventory.cannonballs ?? 0);
    const charge = Math.min(powderRemaining, battery.inputInventory.powder ?? 0);
    battery.inputInventory.cannonballs = (battery.inputInventory.cannonballs ?? 0) - balls;
    battery.inputInventory.powder = (battery.inputInventory.powder ?? 0) - charge;
    ballsRemaining -= balls;
    powderRemaining -= charge;
    if (ballsRemaining <= 0 && powderRemaining <= 0) break;
  }
  return settlement;
}

function damageSettlementBuildings(input: SettlementSimulationState, damage: number): SettlementSimulationState {
  const settlement = structuredClone(input);
  const targets = settlement.buildings.filter((building) => building.definitionId !== 'wreckage' && building.state !== 'DESTROYED');
  for (let index = 0; index < Math.min(targets.length, Math.max(1, damage)); index += 1) {
    const building = targets[(index * 7 + settlement.tutorialStep) % targets.length];
    building.condition = Math.max(0, building.condition - 8 - damage * 2);
    building.state = building.condition <= 0 ? 'DESTROYED' : 'DAMAGED';
    building.statusReason = building.state === 'DESTROYED' ? '침공으로 파괴됨' : '침공 피해 수리 필요';
  }
  return settlement;
}

function attackerName(state: GameState): string {
  return FACTIONS[state.defense.attacker].name;
}


function damageFleet(state: GameState, damage: number): GameState['ships'] {
  const targets = state.ships.filter((ship) => !state.fleet.assignments.some((assignment) => assignment.shipId === ship.id && assignment.status === 'underway'));
  if (!targets.length || damage <= 0) return state.ships;
  const perShip = damage / targets.length;
  return state.ships.map((ship) => targets.some((target) => target.id === ship.id) ? { ...ship, hull: Math.max(1, ship.hull - perShip), morale: clamp(ship.morale - perShip * .15, 0, 100) } : ship);
}

function damageFacilities(state: GameState, damage: number): GameState['haven']['facilities'] {
  const facilities = { ...state.haven.facilities };
  const ids = Object.keys(facilities) as FacilityId[];
  for (let index = 0; index < Math.min(ids.length, Math.max(1, damage)); index += 1) {
    const id = ids[(index + state.world.day) % ids.length];
    const facility = facilities[id];
    if (facility) facilities[id] = { ...facility, condition: Math.max(10, facility.condition - 8 - damage * 2) };
  }
  return facilities;
}
