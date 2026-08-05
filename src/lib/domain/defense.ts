import { FACTIONS } from './catalog';
import { fleetDefensePower } from './fleet';
import { progressMissions } from './missions';
import { clamp } from './physics';
import type { FacilityId, GameState, ResourceId, ResourceStock } from './types';
import { aggregateInventory, spendSettlementResources } from '$lib/settlement/construction';
import { settlementSummary } from '$lib/settlement/summary';
import type { PartialSettlementInventory, SettlementResourceId, SettlementSimulationState } from '$lib/settlement/types';

export type PreparationAction = 'muster' | 'powder' | 'barricades' | 'evacuate';
export type NavalAction = 'crossfire' | 'fleet-charge' | 'fire-ships';
export type LandingAction = 'beach-ambush' | 'hold-walls' | 'counterattack';
export type InteriorAction = 'last-stand' | 'powder-trap' | 'organized-retreat';

export function beginDefensePreparation(state: GameState): GameState {
  if (!state.defense.active || state.defense.stage !== 'warning') return state;
  return { ...state, defense: { ...state.defense, stage: 'preparation', attackerRemaining: state.defense.attackStrength, preparation: 0, civilianRisk: 55, selectedActions: [], log: [...(state.defense.log ?? []), `${attackerName(state)} 함대가 만 입구로 접근한다.`] } };
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
  const batteryReadiness = Math.min(1, batteryAmmunition(state.settlement) / 24);
  const batteryResult = action === 'fleet-charge' ? state.settlement : consumeBatteryAmmunition(state.settlement, 10, 5);
  const batteryFactor = action === 'fleet-charge' ? 1 : 0.35 + batteryReadiness * 0.65;
  const power = (state.defense.defenseStrength * .58 * batteryFactor + fleetDefensePower(state) * .42) * choice.attack;
  const damage = Math.max(8, Math.round(power * (.48 + random() * .34)));
  const attackerRemaining = Math.max(0, remaining - damage);
  const shipDamage = Math.round(remaining * choice.shipRisk * (.35 + random() * .45));
  const havenDamage = Math.round(remaining * choice.havenRisk * (.22 + random() * .4));
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
  const casualties = Math.round(remaining * choice.casualty * (.18 + random() * .34));
  const injured = new Set(state.settlement.residents.filter((resident) => ['guard', 'gunner', 'raider'].includes(resident.job)).slice(0, casualties).map((resident) => resident.id));
  const settlement = { ...state.settlement, residents: state.settlement.residents.map((resident) => injured.has(resident.id) ? { ...resident, health: Math.max(1, resident.health - 45), morale: Math.max(0, resident.morale - 12) } : resident) };
  const haven = { ...state.haven, population: Math.max(1, state.haven.population - casualties), morale: clamp(state.haven.morale + (attackerRemaining <= 0 ? 8 : -6), 0, 100), populationByRole: { ...state.haven.populationByRole, fighters: Math.max(0, state.haven.populationByRole.fighters - casualties) } };
  const civilianRisk = clamp((state.defense.civilianRisk ?? 50) + choice.civilian, 0, 100);
  if (attackerRemaining <= 0) return finishDefense({ ...state, settlement, haven, defense: { ...state.defense, attackerRemaining, civilianRisk, log: [...(state.defense.log ?? []), choice.label, '상륙대가 해변에서 무너졌다.'] } }, true);
  return { ...state, settlement, haven, defense: { ...state.defense, stage: 'interior', attackerRemaining, civilianRisk, selectedActions: [...(state.defense.selectedActions ?? []), action], log: [...(state.defense.log ?? []), choice.label, '남은 적이 부두를 넘어 본거지 내부로 침투했다.'] } };
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
  const power = (state.crew.roles.marine * 4 + state.haven.order * .7 + state.captain.level * 8) * choice.power * (.72 + random() * .38);
  const victory = power >= remaining;
  const resourceDamage = victory ? Math.round(remaining * choice.damage * .2) : Math.round(remaining * choice.damage + 35);
  const civilianRisk = clamp((state.defense.civilianRisk ?? 50) + choice.civilian, 0, 100);
  const resources = applyRaidLoss(state.resources, resourceDamage);
  const facilities = damageFacilities(state, victory ? Math.ceil(resourceDamage / 12) : Math.ceil(resourceDamage / 5));
  const settlement = damageSettlementBuildings(state.settlement, victory ? Math.ceil(resourceDamage / 14) : Math.ceil(resourceDamage / 6));
  const prepared = { ...state, settlement, resources, haven: { ...state.haven, facilities }, defense: { ...state.defense, attackerRemaining: victory ? 0 : remaining, civilianRisk, log: [...(state.defense.log ?? []), choice.label] } };
  return finishDefense(prepared, victory);
}

function finishDefense(state: GameState, victory: boolean): GameState {
  let next: GameState = {
    ...state,
    defense: {
      ...state.defense,
      active: false,
      stage: 'resolved',
      outcome: victory ? 'victory' : 'defeat',
      damage: victory ? ['해안 방어선 일부 손상', '부상자 치료 필요'] : ['창고 약탈', '시설 파손', '주민 이탈'],
      reward: victory ? { gold: Math.round(state.defense.attackStrength * 2.2), iron: Math.max(2, Math.round(state.defense.attackStrength / 35)) } : {}
    },
    haven: { ...state.haven, raidThreat: 0, morale: clamp(state.haven.morale + (victory ? 12 : -18), 0, 100), order: clamp(state.haven.order + (victory ? 6 : -14), 0, 100) },
    captain: { ...state.captain, renown: state.captain.renown + (victory ? 18 : 0) }
  };
  if (victory) next = progressMissions(next, { kind: 'haven-defended', zoneId: 'beginners-bay' });
  return next;
}

export function claimDefenseResult(state: GameState): GameState {
  if (state.defense.stage !== 'resolved') return state;
  const resources = { ...state.resources };
  for (const [id, amount] of Object.entries(state.defense.reward ?? {}) as [ResourceId, number][]) resources[id] += amount;
  const settlement = structuredClone(state.settlement);
  const salvageStore = settlement.buildings.find((building) => building.definitionId === 'warehouse' && building.state === 'ACTIVE') ?? settlement.buildings.find((building) => building.definitionId === 'wreckage');
  if (salvageStore) {
    salvageStore.outputInventory.gold = (salvageStore.outputInventory.gold ?? 0) + (state.defense.reward?.gold ?? 0);
    salvageStore.outputInventory['iron-ingots'] = (salvageStore.outputInventory['iron-ingots'] ?? 0) + (state.defense.reward?.iron ?? 0);
  }
  return { ...state, settlement: { ...settlement, threat: { ...settlement.threat, active: false, discovered: false, strength: 0, etaHours: 0, fleetDescription: '' } }, resources, screen: 'haven', defense: { ...state.defense, reward: {}, log: [] } };
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

function applyRaidLoss(resources: ResourceStock, damage: number): ResourceStock {
  return { ...resources, gold: Math.max(0, resources.gold - damage * 4), food: Math.max(0, resources.food - Math.ceil(damage * .45)), timber: Math.max(0, resources.timber - Math.ceil(damage * .3)), powder: Math.max(0, resources.powder - Math.ceil(damage * .12)) };
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
