import { DIFFICULTIES, SHIP_CLASSES, ZONES } from './catalog';
import { cargoWeight } from './economy';
import { applyNotoriety, NOTORIETY_EVENTS, pursuitTier } from './factions';
import { clamp } from './physics';
import { progressMissions } from './missions';
import { createId, mulberry32, pickOne, randomBetween, randomInt } from './rng';
import type { EncounterState, GameState, ResourceId, Ship, ShipClass, ZoneId } from './types';

const SHIP_BY_DANGER: ShipClass[][] = [
  ['boat', 'sloop'],
  ['sloop', 'schooner'],
  ['schooner', 'brig'],
  ['brig', 'brigantine'],
  ['brigantine', 'frigate'],
  ['frigate', 'galleon'],
  ['galleon', 'ship-of-the-line']
];

const MERCHANT_NAMES = ['새벽의 종', '청동 갈매기', '성 엘라의 은총', '동방의 별', '푸른 제비', '황금 낫'];
const NAVY_NAMES = ['왕관의 창', '불굴의 맹세', '아우렐리아', '감시자의 눈', '법의 심판'];
const PIRATE_NAMES = ['피 묻은 이빨', '부러진 왕관', '붉은 상어', '밤의 갈고리'];

export function createEnemyShip(zoneId: ZoneId, type: 'merchant' | 'navy' | 'pirate', seed: number): Ship {
  const random = mulberry32(seed);
  const danger = ZONES[zoneId].difficulty;
  const pool = SHIP_BY_DANGER[Math.min(SHIP_BY_DANGER.length - 1, Math.max(0, Math.floor((danger - 1) / 1.4)))];
  const shipClass = pickOne(random, pool);
  const base = SHIP_CLASSES[shipClass].stats;
  const combatMultiplier = type === 'navy' ? 1.16 : type === 'merchant' ? 0.86 : 1.04;
  const stats = {
    ...structuredClone(base),
    hullMax: Math.round(base.hullMax * combatMultiplier),
    armor: Math.round(base.armor * combatMultiplier),
    cannonSlots: Math.max(2, Math.round(base.cannonSlots * combatMultiplier))
  };
  const cargoResources: ResourceId[] = type === 'merchant' ? ['spices', 'cloth', 'rum', 'food', 'bullion'] : type === 'navy' ? ['powder', 'cannonballs', 'medicine'] : ['contraband', 'rum', 'gold'];
  const cargo = Object.fromEntries(cargoResources.map((resource) => [resource, randomInt(random, 4 + danger * 2, 12 + danger * 7)]));
  const names = type === 'merchant' ? MERCHANT_NAMES : type === 'navy' ? NAVY_NAMES : PIRATE_NAMES;
  return {
    id: createId('enemy'),
    name: pickOne(random, names),
    class: shipClass,
    stats,
    upgrades: { hull: 0, sails: 0, mast: 0, rudder: 0, cannons: 0, magazine: 0, quarters: 0, hold: 0, armor: 0, figurehead: 0, cabin: 0 },
    hull: stats.hullMax,
    sails: stats.sailMax,
    crew: Math.round(stats.crewMax * randomBetween(random, 0.58, 0.88)),
    morale: type === 'navy' ? 82 : randomInt(random, 48, 74),
    cargo,
    cargoWeight: cargoWeight(cargo),
    cannonCondition: randomInt(random, 72, 100),
    rudderCondition: 100,
    fire: 0,
    flooding: 0,
    isFlagship: false,
    isCaptured: false
  };
}

export function createEncounter(state: GameState, forcedType?: 'merchant' | 'navy' | 'pirate'): EncounterState {
  const seed = state.world.seed + Math.floor(state.voyage.gameMinutes * 17) + state.world.day * 1049;
  const random = mulberry32(seed);
  const zone = ZONES[state.voyage.zoneId];
  const roll = random();
  const pursuit = pursuitTier(state.bounty);
  const forgedModifier = state.flags.forgedIdentity ? .58 : 1;
  const hunterChance = pursuit.hunterChance * forgedModifier;
  const navyRate = clamp(zone.navyRate * pursuit.patrolMultiplier * (state.flags['war:imperial-navy'] ? 1.2 : 1), 0, .88);
  const merchantRate = clamp(zone.merchantRate / Math.max(1, pursuit.patrolMultiplier * .7), .08, .78);
  const hunterEncounter = !forcedType && roll < hunterChance;
  const adjustedRoll = hunterEncounter ? 1 : (roll - hunterChance) / Math.max(.01, 1 - hunterChance);
  const type = forcedType ?? (hunterEncounter ? 'navy' : adjustedRoll < navyRate ? 'navy' : adjustedRoll < navyRate + merchantRate ? 'merchant' : 'pirate');
  const enemyShip = createEnemyShip(state.voyage.zoneId, type, seed);
  return {
    id: createId('encounter'),
    type,
    title: hunterEncounter ? `${enemyShip.name} — 현상금 추격함` : type === 'merchant' ? `${enemyShip.name} — 상선` : type === 'navy' ? `${enemyShip.name} — 제국 순찰함` : `${enemyShip.name} — 정체불명의 해적선`,
    description: hunterEncounter ? `당신의 ${Math.round(state.bounty)} 금화 현상금을 노린 추격함이 포문을 열었다.` : type === 'merchant' ? '화물로 낮게 가라앉은 선체. 호위함은 보이지 않는다.' : type === 'navy' ? '대포문이 열리고 제국기가 바람을 받는다.' : '검은 깃발 아래 선원들이 무기를 들고 있다.',
    threat: zone.difficulty * (type === 'navy' ? 1.3 : type === 'merchant' ? 0.75 : 1),
    enemyShip,
    distance: 680,
    resolved: false
  };
}

export function departForZone(state: GameState, zoneId: ZoneId): GameState {
  const firstTutorial = state.tutorialStep < 2 && zoneId === 'beginners-bay';
  return {
    ...state,
    screen: 'sailing',
    previousScreen: state.screen,
    tutorialStep: Math.max(state.tutorialStep, 1),
    voyage: {
      ...state.voyage,
      active: true,
      zoneId,
      speed: 0,
      sailSetting: 0.25,
      weather: zoneId === 'storm-reach' ? 'storm' : zoneId === 'mist-archipelago' ? 'fog' : 'clear',
      windSpeed: (ZONES[zoneId].wind[0] + ZONES[zoneId].wind[1]) / 2,
      pursuit: Math.round(pursuitTier(state.bounty).hunterChance * 100),
      currentEncounter: createEncounter({ ...state, voyage: { ...state.voyage, zoneId } }, firstTutorial ? 'merchant' : undefined)
    },
    combat: { ...state.combat, active: true, enemyShipId: undefined, lastResult: undefined }
  };
}

export function finishEncounter(state: GameState, outcome: 'victory' | 'defeat' | 'escaped' | 'captured', enemy: Ship, loot: Partial<Record<ResourceId, number>> = {}): GameState {
  let next = {
    ...state,
    combat: { ...state.combat, active: false, lastResult: { outcome, enemyName: enemy.name, loot, casualties: 0, renown: outcome === 'victory' || outcome === 'captured' ? 12 : 0, bounty: outcome === 'victory' || outcome === 'captured' ? 85 : 0 } },
    voyage: { ...state.voyage, currentEncounter: state.voyage.currentEncounter ? { ...state.voyage.currentEncounter, enemyShip: enemy, resolved: true } : undefined },
    tutorialStep: outcome === 'victory' || outcome === 'captured' ? Math.max(state.tutorialStep, 3) : state.tutorialStep
  } as GameState;
  if (outcome === 'victory' || outcome === 'captured') {
    const event = state.voyage.currentEncounter?.type === 'navy' ? NOTORIETY_EVENTS.navySink : NOTORIETY_EVENTS.merchantRaid;
    next = applyNotoriety(next, event);
    const opponent = state.voyage.currentEncounter?.type;
    if (opponent === 'merchant' || opponent === 'navy' || opponent === 'pirate') {
      next = progressMissions(next, { kind: 'ship-defeated', zoneId: state.voyage.zoneId, opponent });
      if (outcome === 'captured') next = progressMissions(next, { kind: 'ship-captured', zoneId: state.voyage.zoneId, opponent });
    }
  }
  return next;
}

export function enemyCombatMultiplier(state: GameState): number {
  return DIFFICULTIES[state.captain.difficulty].enemy * (0.8 + ZONES[state.voyage.zoneId].difficulty * 0.04);
}

export function escapeChance(playerSpeed: number, enemySpeed: number, distance: number): number {
  return clamp(0.25 + (playerSpeed - enemySpeed) * 0.12 + distance / 1800, 0.05, 0.92);
}
