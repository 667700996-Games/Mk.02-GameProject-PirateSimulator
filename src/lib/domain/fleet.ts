import { ZONES } from './catalog';
import { clamp } from './physics';
import { createId, hashString, mulberry32, randomInt } from './rng';
import type { FleetAssignment, FleetFormation, FleetOrderType, GameState, Officer, OfficerRole, ResourceStock, Ship, ZoneId } from './types';

const CAPTAIN_NAMES = ['이사벨 로크', '토마스 케인', '누라 알사바', '가브리엘 문', '산티아고 렌', '아니카 볼프', '조나스 핀'];
const CAPTAIN_TRAITS = ['신중한 추격자', '대담한 약탈자', '항로 계산가', '선원들의 친구', '야심 찬 결투가', '폭풍을 읽는 자'];
const ROLES: OfficerRole[] = ['first-mate', 'sailing-master', 'master-gunner', 'boatswain', 'quartermaster'];

export function captainCandidate(seed: number): Officer {
  const random = mulberry32(seed);
  return {
    id: createId('captain'),
    name: CAPTAIN_NAMES[randomInt(random, 0, CAPTAIN_NAMES.length - 1)],
    role: ROLES[randomInt(random, 0, ROLES.length - 1)],
    rank: 1,
    skill: randomInt(random, 34, 62),
    trait: CAPTAIN_TRAITS[randomInt(random, 0, CAPTAIN_TRAITS.length - 1)],
    loyalty: randomInt(random, 42, 76),
    morale: randomInt(random, 58, 82),
    fatigue: 0,
    wounded: false,
    wage: randomInt(random, 24, 42),
    ambition: randomInt(random, 28, 78),
    isCaptain: true
  };
}

export function hireCaptain(state: GameState, candidate: Officer, cost: number): GameState {
  if (state.resources.gold < cost || state.officers.some((officer) => officer.id === candidate.id)) return state;
  return {
    ...state,
    resources: { ...state.resources, gold: state.resources.gold - cost },
    officers: [...state.officers, { ...candidate, isCaptain: true }],
    haven: { ...state.haven, populationByRole: { ...state.haven.populationByRole, captains: state.haven.populationByRole.captains + 1 } }
  };
}

export function assignCaptain(state: GameState, captainId: string, shipId: string): GameState {
  const ship = state.ships.find((vessel) => vessel.id === shipId);
  const captain = state.officers.find((officer) => officer.id === captainId && officer.isCaptain);
  if (!ship || ship.isFlagship || !captain || state.fleet.assignments.some((assignment) => assignment.shipId === shipId && !['complete', 'failed', 'deserted'].includes(assignment.status))) return state;
  return {
    ...state,
    ships: state.ships.map((vessel) => vessel.id === shipId ? { ...vessel, captainId } : vessel),
    officers: state.officers.map((officer) => officer.id === captainId ? { ...officer, assignedShipId: shipId } : officer)
  };
}

export function issueFleetOrder(state: GameState, shipId: string, order: FleetOrderType, zoneId: ZoneId, now = Date.now()): GameState {
  const ship = state.ships.find((vessel) => vessel.id === shipId);
  const captain = state.officers.find((officer) => officer.id === ship?.captainId);
  if (!ship || ship.isFlagship || !captain || ship.crew < 4 || state.fleet.assignments.some((assignment) => assignment.shipId === shipId && !['complete', 'failed', 'deserted'].includes(assignment.status))) return state;
  const zone = ZONES[zoneId];
  const durationMinutes = 2.5 + zone.difficulty * .7 + (order === 'scout' ? -1 : order === 'raid' ? 1.4 : 0);
  const riskModifier: Record<FleetOrderType, number> = { patrol: .9, raid: 1.25, escort: .78, smuggle: .86, scout: .68, defend: .45 };
  const assignment: FleetAssignment = {
    id: createId('fleet-order'),
    shipId,
    captainId: captain.id,
    order,
    zoneId,
    status: 'underway',
    issuedAt: now,
    resolvesAt: now + durationMinutes * 60_000,
    progress: 0,
    risk: clamp(zone.difficulty * 9 * riskModifier[order] - captain.skill * .16 - ship.stats.stealth * .08, 4, 88),
    log: [`${captain.name} 선장이 ${zone.name}으로 출항했다.`],
    reward: {},
    damage: 0
  };
  return { ...state, fleet: { ...state.fleet, assignments: [...state.fleet.assignments, assignment] } };
}

export function updateFleetAssignments(state: GameState, now = Date.now()): GameState {
  let ships = [...state.ships];
  let officers = [...state.officers];
  let shipsLost = state.fleet.shipsLost;
  let victories = state.fleet.victories;
  const assignments = state.fleet.assignments.map((assignment): FleetAssignment => {
    if (['complete', 'failed', 'deserted'].includes(assignment.status)) return assignment;
    const duration = Math.max(1, assignment.resolvesAt - assignment.issuedAt);
    const progress = clamp((now - assignment.issuedAt) / duration * 100, 0, 100);
    if (now < assignment.resolvesAt) return { ...assignment, progress };
    const ship = ships.find((vessel) => vessel.id === assignment.shipId);
    const captain = officers.find((officer) => officer.id === assignment.captainId);
    if (!ship || !captain) return { ...assignment, status: 'failed', progress: 100, log: [...assignment.log, '함대와의 연락이 끊겼다.'] };
    const random = mulberry32(hashString(`${assignment.id}:${state.world.day}:${state.world.seed}`));
    const desertChance = clamp((captain.ambition - captain.loyalty - 18) / 100, 0, .45);
    if (random() < desertChance) {
      ships = ships.filter((vessel) => vessel.id !== ship.id);
      officers = officers.filter((officer) => officer.id !== captain.id);
      shipsLost += 1;
      return { ...assignment, status: 'deserted', progress: 100, log: [...assignment.log, `${captain.name}이(가) 전리품과 함선을 빼돌려 달아났다.`] };
    }
    const formation = formationModifier(state.fleet.formation, assignment.order);
    const shipPower = ship.stats.cannonSlots * 1.5 + ship.crew + ship.stats.hullMax * .08;
    const captainPower = captain.skill * 1.3 + captain.loyalty * .25;
    const challenge = ZONES[assignment.zoneId].difficulty * 34 * assignment.risk / 32;
    const successChance = clamp(.42 + (shipPower + captainPower - challenge) / 340 + formation, .12, .94);
    const success = random() <= successChance;
    const damage = Math.round((success ? assignment.risk * .28 : assignment.risk * .75) * (.7 + random() * .6));
    ships = ships.map((vessel) => vessel.id === ship.id ? { ...vessel, hull: Math.max(1, vessel.hull - damage), morale: clamp(vessel.morale + (success ? 4 : -12), 0, 100) } : vessel);
    officers = officers.map((officer) => officer.id === captain.id ? { ...officer, loyalty: clamp(officer.loyalty + (success ? 2 : -5), 0, 100), morale: clamp(officer.morale + (success ? 5 : -9), 0, 100) } : officer);
    if (!success) return { ...assignment, status: 'failed', progress: 100, damage, log: [...assignment.log, '강한 적과 마주쳐 피해를 입고 빈손으로 귀환했다.'] };
    victories += 1;
    const reward = fleetReward(assignment.order, ZONES[assignment.zoneId].difficulty, random);
    return { ...assignment, status: 'complete', progress: 100, damage, reward, log: [...assignment.log, `${ZONES[assignment.zoneId].name} 작전을 완수하고 귀환했다.`] };
  });
  return { ...state, ships, officers, fleet: { ...state.fleet, assignments, victories, shipsLost } };
}

export function claimFleetAssignment(state: GameState, assignmentId: string): GameState {
  const assignment = state.fleet.assignments.find((item) => item.id === assignmentId);
  if (!assignment || !['complete', 'failed', 'deserted'].includes(assignment.status)) return state;
  const resources = { ...state.resources };
  for (const [id, amount] of Object.entries(assignment.reward) as [keyof ResourceStock, number][]) resources[id] += amount;
  return { ...state, resources, fleet: { ...state.fleet, assignments: state.fleet.assignments.filter((item) => item.id !== assignmentId) } };
}

export function setFleetFormation(state: GameState, formation: FleetFormation): GameState {
  return { ...state, fleet: { ...state.fleet, formation } };
}

export function fleetDefensePower(state: GameState): number {
  const available = state.ships.filter((ship) => !state.fleet.assignments.some((assignment) => assignment.shipId === ship.id && assignment.status === 'underway'));
  const formation = state.fleet.formation === 'line-abreast' ? 1.15 : state.fleet.formation === 'crescent' ? 1.1 : .98;
  return Math.round(available.reduce((sum, ship) => sum + ship.stats.cannonSlots * 1.4 + ship.crew * .45 + ship.hull / 25, 0) * formation);
}

function formationModifier(formation: FleetFormation, order: FleetOrderType): number {
  if (formation === 'wolf-pack' && order === 'raid') return .12;
  if (formation === 'scatter' && (order === 'smuggle' || order === 'scout')) return .13;
  if (formation === 'line-ahead' && (order === 'patrol' || order === 'escort')) return .1;
  if (formation === 'line-abreast' && order === 'defend') return .14;
  if (formation === 'crescent' && (order === 'raid' || order === 'defend')) return .08;
  return 0;
}

function fleetReward(order: FleetOrderType, danger: number, random: () => number): Partial<ResourceStock> {
  const gold = Math.round((35 + danger * 28) * (.8 + random() * .65));
  if (order === 'scout') return { gold: Math.round(gold * .45), blueprints: random() < danger * .05 ? 1 : 0 };
  if (order === 'smuggle') return { gold: Math.round(gold * 1.35), contraband: randomInt(random, 1, Math.max(2, danger)) };
  if (order === 'escort') return { gold, food: randomInt(random, 4, 8 + danger) };
  if (order === 'defend') return { gold: Math.round(gold * .5), cannonballs: randomInt(random, 4, 9 + danger) };
  if (order === 'patrol') return { gold, powder: randomInt(random, 2, 5 + danger) };
  return { gold: Math.round(gold * 1.2), timber: randomInt(random, 6, 12 + danger * 2), spices: randomInt(random, 1, 2 + danger) };
}
