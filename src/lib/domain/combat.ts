import { DIFFICULTIES } from './catalog';
import { clamp, normalizeAngle } from './physics';
import type { AmmoType, Difficulty, Ship } from './types';

export interface AmmoProfile {
  name: string;
  range: number;
  velocity: number;
  hull: number;
  sails: number;
  crew: number;
  fire: number;
  penetration: number;
  cost: { cannonballs: number; powder: number };
}

export const AMMO: Record<AmmoType, AmmoProfile> = {
  'round-shot': { name: '일반 포탄', range: 620, velocity: 320, hull: 1, sails: 0.25, crew: 0.28, fire: 0.02, penetration: 0.35, cost: { cannonballs: 1, powder: 1 } },
  'chain-shot': { name: '사슬탄', range: 470, velocity: 255, hull: 0.28, sails: 1.35, crew: 0.16, fire: 0, penetration: 0.05, cost: { cannonballs: 1, powder: 1 } },
  'grape-shot': { name: '산탄', range: 260, velocity: 230, hull: 0.08, sails: 0.2, crew: 1.7, fire: 0, penetration: 0, cost: { cannonballs: 1, powder: 1 } },
  incendiary: { name: '소이탄', range: 430, velocity: 260, hull: 0.44, sails: 0.58, crew: 0.38, fire: 0.34, penetration: 0.08, cost: { cannonballs: 1, powder: 2 } },
  piercing: { name: '관통탄', range: 560, velocity: 350, hull: 1.18, sails: 0.12, crew: 0.2, fire: 0.05, penetration: 0.88, cost: { cannonballs: 2, powder: 2 } }
};

export type Broadside = 'port' | 'starboard' | 'bow' | 'stern';

export interface ShotContext {
  attacker: Ship;
  target: Ship;
  ammo: AmmoType;
  distance: number;
  bearingToTarget: number;
  attackerHeading: number;
  attackerSpeed: number;
  targetSpeed: number;
  broadside: Broadside;
  difficulty: Difficulty;
  captainIsGunner: boolean;
  random: () => number;
}

export interface ShotResult {
  fired: boolean;
  hit: boolean;
  hitChance: number;
  flightTime: number;
  hullDamage: number;
  sailDamage: number;
  crewCasualties: number;
  fire: number;
  flooding: number;
  rudderDamage: number;
  cannonDamage: number;
  critical: boolean;
  reason?: string;
}

export function broadsideBearing(heading: number, side: Broadside): number {
  if (side === 'port') return normalizeAngle(heading - Math.PI / 2);
  if (side === 'starboard') return normalizeAngle(heading + Math.PI / 2);
  if (side === 'stern') return normalizeAngle(heading + Math.PI);
  return normalizeAngle(heading);
}

export function firingArcError(heading: number, bearing: number, side: Broadside): number {
  return Math.abs(normalizeAngle(bearing - broadsideBearing(heading, side)));
}

export function resolveShot(context: ShotContext): ShotResult {
  const profile = AMMO[context.ammo];
  const arc = firingArcError(context.attackerHeading, context.bearingToTarget, context.broadside);
  const maxArc = context.broadside === 'port' || context.broadside === 'starboard' ? 0.58 : 0.35;
  if (arc > maxArc) return emptyShot('표적이 사격각 밖에 있습니다.');
  if (context.distance > profile.range) return emptyShot('표적이 사거리 밖에 있습니다.');
  if (context.attacker.cannonCondition <= 5) return emptyShot('대포가 작동하지 않습니다.');

  const cannonCount = Math.max(1, Math.floor(context.attacker.stats.cannonSlots * (context.broadside === 'port' || context.broadside === 'starboard' ? 0.45 : 0.05)));
  const rangeFalloff = clamp(1 - context.distance / profile.range, 0, 1);
  const motionPenalty = clamp((Math.abs(context.attackerSpeed) + Math.abs(context.targetSpeed)) / 22, 0, 0.28);
  const condition = context.attacker.cannonCondition / 100;
  const gunnerBonus = context.captainIsGunner ? 0.08 : 0;
  const hitChance = clamp(0.24 + rangeFalloff * 0.58 + condition * 0.08 + gunnerBonus - motionPenalty - arc * 0.18, 0.08, 0.94);
  const hit = context.random() <= hitChance;
  const critical = hit && context.random() < 0.055 + profile.penetration * 0.06;
  if (!hit) {
    return { ...emptyShot(), fired: true, hitChance, flightTime: context.distance / profile.velocity };
  }

  const armorMitigation = clamp((context.target.stats.armor * (1 - profile.penetration)) / 100, 0, 0.66);
  const difficultyScale = context.difficulty === 'story' ? 1.16 : context.difficulty === 'black-flag' ? 0.92 : 1;
  const volley = cannonCount * (0.82 + context.random() * 0.38) * difficultyScale;
  const criticalScale = critical ? 1.75 : 1;
  const hullDamage = Math.round(volley * profile.hull * (1 - armorMitigation) * criticalScale);
  const sailDamage = Math.round(volley * profile.sails * (0.82 + context.random() * 0.35) * criticalScale);
  const crewCasualties = Math.min(context.target.crew, Math.floor(volley * profile.crew * (0.45 + context.random() * 0.6) * (critical ? 1.35 : 1)));
  return {
    fired: true,
    hit: true,
    hitChance,
    flightTime: context.distance / profile.velocity,
    hullDamage,
    sailDamage,
    crewCasualties,
    fire: context.random() < profile.fire ? 12 + context.random() * 18 : 0,
    flooding: context.random() < 0.06 + profile.penetration * 0.12 ? 5 + context.random() * 12 : 0,
    rudderDamage: critical && context.random() < 0.32 ? 10 + context.random() * 24 : 0,
    cannonDamage: critical && context.random() < 0.38 ? 8 + context.random() * 20 : 0,
    critical
  };
}

function emptyShot(reason?: string): ShotResult {
  return { fired: false, hit: false, hitChance: 0, flightTime: 0, hullDamage: 0, sailDamage: 0, crewCasualties: 0, fire: 0, flooding: 0, rudderDamage: 0, cannonDamage: 0, critical: false, reason };
}

export function applyShot(ship: Ship, result: ShotResult): Ship {
  if (!result.hit) return ship;
  return {
    ...ship,
    hull: clamp(ship.hull - result.hullDamage, 0, ship.stats.hullMax),
    sails: clamp(ship.sails - result.sailDamage, 0, ship.stats.sailMax),
    crew: Math.max(0, ship.crew - result.crewCasualties),
    morale: clamp(ship.morale - result.crewCasualties * 0.8 - (result.critical ? 8 : 0), 0, 100),
    fire: clamp(ship.fire + result.fire, 0, 100),
    flooding: clamp(ship.flooding + result.flooding, 0, 100),
    rudderCondition: clamp(ship.rudderCondition - result.rudderDamage, 0, 100),
    cannonCondition: clamp(ship.cannonCondition - result.cannonDamage, 0, 100)
  };
}

export function tickDamage(ship: Ship, deltaSeconds: number, carpenterCount: number): Ship {
  const dt = clamp(deltaSeconds, 0, 1);
  const repair = carpenterCount * 0.018 * dt;
  const fire = clamp(ship.fire - (0.3 + carpenterCount * 0.08) * dt, 0, 100);
  const flooding = clamp(ship.flooding - repair, 0, 100);
  const hullDamage = (fire * 0.012 + flooding * 0.018) * dt;
  const sailDamage = fire * 0.014 * dt;
  return { ...ship, fire, flooding, hull: clamp(ship.hull - hullDamage, 0, ship.stats.hullMax), sails: clamp(ship.sails - sailDamage, 0, ship.stats.sailMax) };
}

export function enemyDamageScale(difficulty: Difficulty): number {
  return DIFFICULTIES[difficulty].enemy;
}

export function isShipDisabled(ship: Ship): boolean {
  return ship.hull <= 0 || ship.crew <= 0;
}

export function canBoard(attacker: Ship, target: Ship, distance: number, relativeSpeed: number): boolean {
  return distance <= 78 && relativeSpeed <= 1.35 && target.hull / target.stats.hullMax <= 0.65 && target.crew > 0 && attacker.crew >= 4;
}

export function surrenderChance(attacker: Ship, target: Ship, negotiator: boolean): number {
  const damagePressure = 1 - target.hull / target.stats.hullMax;
  const crewPressure = 1 - target.crew / target.stats.crewMax;
  const moralePressure = 1 - target.morale / 100;
  const threatRatio = clamp((attacker.stats.cannonSlots + attacker.crew) / Math.max(target.stats.cannonSlots + target.crew, 1), 0.25, 3);
  return clamp(damagePressure * 0.32 + crewPressure * 0.25 + moralePressure * 0.3 + (threatRatio - 1) * 0.12 + (negotiator ? 0.12 : 0), 0.02, 0.9);
}
