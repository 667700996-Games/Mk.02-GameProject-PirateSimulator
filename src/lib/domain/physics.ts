import type { CaptainTrait, Ship } from './types';

export interface SailingInput {
  steer: number;
  sailDelta: number;
  deltaSeconds: number;
}

export interface SailingState {
  x: number;
  y: number;
  heading: number;
  speed: number;
  sailSetting: number;
}

export interface SailingEnvironment {
  windDirection: number;
  windSpeed: number;
  waveDrag: number;
}

export const TAU = Math.PI * 2;

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function normalizeAngle(angle: number): number {
  let normalized = angle % TAU;
  if (normalized > Math.PI) normalized -= TAU;
  if (normalized < -Math.PI) normalized += TAU;
  return normalized;
}

export function relativeWindAngle(heading: number, windDirection: number): number {
  return Math.abs(normalizeAngle(windDirection - heading));
}

export function windEfficiency(relativeAngle: number): number {
  const angle = Math.abs(normalizeAngle(relativeAngle));
  const degrees = (angle * 180) / Math.PI;
  if (degrees < 30) return 0.18 + (degrees / 30) * 0.12;
  if (degrees < 55) return 0.3 + ((degrees - 30) / 25) * 0.52;
  if (degrees < 115) return 0.82 + Math.sin(((degrees - 55) / 60) * Math.PI) * 0.18;
  if (degrees < 155) return 0.9 - ((degrees - 115) / 40) * 0.12;
  return 0.78 - ((degrees - 155) / 25) * 0.12;
}

export function shipPerformance(ship: Ship): { speed: number; turn: number; acceleration: number } {
  const hullRatio = clamp(ship.hull / ship.stats.hullMax, 0, 1);
  const sailRatio = clamp(ship.sails / ship.stats.sailMax, 0, 1);
  const loadRatio = clamp(ship.cargoWeight / Math.max(ship.stats.cargoMax, 1), 0, 1.5);
  const crewRatio = clamp(ship.crew / Math.max(ship.stats.crewMax * 0.55, 1), 0.35, 1);
  const rudderRatio = clamp(ship.rudderCondition / 100, 0.25, 1);
  return {
    speed: clamp((0.32 + sailRatio * 0.68) * (1 - Math.max(0, loadRatio - 0.72) * 0.42) * (0.78 + crewRatio * 0.22), 0.18, 1.12),
    turn: clamp((0.5 + hullRatio * 0.5) * (0.45 + rudderRatio * 0.55) * (1 - Math.max(0, loadRatio - 0.82) * 0.35), 0.2, 1),
    acceleration: clamp(0.55 + sailRatio * 0.28 + crewRatio * 0.17, 0.45, 1)
  };
}

export function expectedMaxSpeed(ship: Ship, heading: number, environment: SailingEnvironment, trait?: CaptainTrait): number {
  const performance = shipPerformance(ship);
  const wind = windEfficiency(relativeWindAngle(heading, environment.windDirection));
  const navigatorBonus = trait === 'navigator' ? 1.08 : 1;
  return ship.stats.speedMax * performance.speed * wind * clamp(environment.windSpeed, 0.35, 1.8) * navigatorBonus * (1 - environment.waveDrag * 0.2);
}

export function tickSailing(
  state: SailingState,
  ship: Ship,
  input: SailingInput,
  environment: SailingEnvironment,
  trait?: CaptainTrait
): SailingState {
  const dt = clamp(input.deltaSeconds, 0, 0.05);
  const sailSetting = clamp(state.sailSetting + input.sailDelta * dt * 0.72, 0, 1);
  const performance = shipPerformance(ship);
  const speedRatio = clamp(Math.abs(state.speed) / Math.max(ship.stats.speedMax, 0.1), 0, 1);
  const steerAuthority = (0.2 + speedRatio * 0.8) * performance.turn;
  const heading = normalizeAngle(state.heading + clamp(input.steer, -1, 1) * ship.stats.turnRate * steerAuthority * dt);
  const targetSpeed = expectedMaxSpeed(ship, heading, environment, trait) * sailSetting;
  const acceleration = ship.stats.acceleration * performance.acceleration * (targetSpeed >= state.speed ? 1 : 1.75);
  const speed = state.speed + clamp(targetSpeed - state.speed, -acceleration * dt, acceleration * dt);
  const drift = Math.sin(environment.windDirection - heading) * environment.windSpeed * 0.035;

  return {
    x: state.x + (Math.cos(heading) * speed + Math.cos(environment.windDirection) * drift) * dt,
    y: state.y + (Math.sin(heading) * speed + Math.sin(environment.windDirection) * drift) * dt,
    heading,
    speed,
    sailSetting
  };
}
