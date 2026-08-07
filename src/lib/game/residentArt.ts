import type { JobId, PopulationTier, ResidentAction } from '$lib/settlement/types';

export const RESIDENT_ATLAS_KEY = 'settlement-resident-roles';
export const RESIDENT_ATLAS_IMAGE = '/art/settlement/resident-roles-atlas.png';
export const RESIDENT_ATLAS_DATA = '/art/settlement/resident-roles-atlas.json';
export const RESIDENT_REAR_ATLAS_KEY = 'settlement-resident-roles-rear';
export const RESIDENT_REAR_ATLAS_IMAGE = '/art/settlement/resident-roles-rear-atlas.png';
export const RESIDENT_REAR_ATLAS_DATA = '/art/settlement/resident-roles-rear-atlas.json';
export const RESIDENT_WALK_FRONT_ATLAS_KEY = 'settlement-resident-walk-front';
export const RESIDENT_WALK_FRONT_ATLAS_IMAGE = '/art/settlement/resident-walk-front-atlas.png';
export const RESIDENT_WALK_REAR_ATLAS_KEY = 'settlement-resident-walk-rear';
export const RESIDENT_WALK_REAR_ATLAS_IMAGE = '/art/settlement/resident-walk-rear-atlas.png';
export const RESIDENT_WALK_ATLAS_DATA = '/art/settlement/resident-walk-atlas.json';
export const RESIDENT_FRAME_RATIO = 341 / 192;
export const RESIDENT_WALK_FRAME_MS = 145;
export const RESIDENT_WALK_SEQUENCE = [0, 1, 2, 1] as const;
export type ResidentFacing = 'front-left' | 'front-right' | 'rear-left' | 'rear-right';

export type ResidentArtFrame =
  | 'laborer'
  | 'hauler'
  | 'builder'
  | 'logger'
  | 'fisher'
  | 'shipwright'
  | 'guard'
  | 'officer';

export interface ResidentActionVisual {
  bob: number;
  sway: number;
  frequency: number;
  glyph?: string;
}

export const RESIDENT_ACTION_VISUALS: Record<ResidentAction, ResidentActionVisual> = {
  IDLE: { bob: 0.34, sway: 0.006, frequency: 0.8 },
  SLEEPING: { bob: 0.16, sway: 0.004, frequency: 0.45, glyph: 'Z' },
  WORKING: { bob: 0.72, sway: 0.052, frequency: 2.6, glyph: '⚒' },
  HAULING: { bob: 1.5, sway: 0.024, frequency: 2.2 },
  EATING: { bob: 0.28, sway: 0.01, frequency: 1, glyph: '◒' },
  DRINKING: { bob: 0.3, sway: 0.015, frequency: 1.1, glyph: '♨' },
  HEALING: { bob: 0.2, sway: 0.006, frequency: 0.7, glyph: '✚' },
  RESTING: { bob: 0.2, sway: 0.005, frequency: 0.55 },
  TRAINING: { bob: 0.9, sway: 0.04, frequency: 2.1, glyph: '⚔' },
  BOARDING: { bob: 1.35, sway: 0.03, frequency: 2.4, glyph: '⚓' },
  FIREFIGHTING: { bob: 1.05, sway: 0.045, frequency: 2.8, glyph: '◉' },
  DEFENDING: { bob: 0.82, sway: 0.032, frequency: 1.9, glyph: '◆' },
  MOVING: { bob: 1.4, sway: 0.025, frequency: 2.25 }
};

export function residentActivityPose(
  action: ResidentAction,
  elapsedMs: number,
  phase: number,
  reducedMotion = false
): { offsetY: number; rotation: number } {
  if (reducedMotion) return { offsetY: 0, rotation: 0 };
  const visual = RESIDENT_ACTION_VISUALS[action];
  const wave = Math.sin(elapsedMs / 1000 * visual.frequency * Math.PI * 2 + phase);
  return { offsetY: -Math.abs(wave) * visual.bob, rotation: wave * visual.sway };
}

export function residentActivityGlyph(action: ResidentAction): string {
  return RESIDENT_ACTION_VISUALS[action].glyph ?? '';
}

export const RESIDENT_JOB_ART: Record<JobId, ResidentArtFrame> = {
  unassigned: 'laborer',
  laborer: 'laborer',
  miner: 'laborer',
  farmer: 'laborer',
  hunter: 'laborer',
  smelter: 'laborer',
  blacksmith: 'shipwright',
  'powder-maker': 'shipwright',
  tailor: 'laborer',
  cook: 'laborer',
  distiller: 'laborer',
  medic: 'fisher',
  navigator: 'officer',
  informant: 'officer',
  hauler: 'hauler',
  builder: 'builder',
  logger: 'logger',
  fisher: 'fisher',
  shipwright: 'shipwright',
  gunner: 'guard',
  raider: 'guard',
  guard: 'guard',
  officer: 'officer',
  captain: 'officer'
};

export function residentArtFrame(job: JobId, tier: PopulationTier): ResidentArtFrame {
  if (tier === 'officer' || job === 'captain') return 'officer';
  return RESIDENT_JOB_ART[job];
}

export function residentDisplaySize(frame: ResidentArtFrame): { width: number; height: number } {
  const width = frame === 'officer' ? 37 : frame === 'hauler' ? 36 : 35;
  return { width, height: width * RESIDENT_FRAME_RATIO };
}

export function residentAtlasKey(facing: ResidentFacing): string {
  return facing.startsWith('rear') ? RESIDENT_REAR_ATLAS_KEY : RESIDENT_ATLAS_KEY;
}

export function residentWalkAtlasKey(facing: ResidentFacing): string {
  return facing.startsWith('rear') ? RESIDENT_WALK_REAR_ATLAS_KEY : RESIDENT_WALK_FRONT_ATLAS_KEY;
}

export function residentFacingFlipX(facing: ResidentFacing): boolean {
  return facing.endsWith('left');
}

export function residentWalkFrame(frame: ResidentArtFrame, index: 0 | 1 | 2): string {
  return `${frame}-walk-${index}`;
}

export function residentWalkFrameIndex(
  elapsedMs: number,
  phaseOffsetMs: number,
  moving: boolean,
  reducedMotion = false
): 0 | 1 | 2 {
  if (!moving || reducedMotion) return 1;
  const step = Math.floor(Math.max(0, elapsedMs + phaseOffsetMs) / RESIDENT_WALK_FRAME_MS);
  return RESIDENT_WALK_SEQUENCE[step % RESIDENT_WALK_SEQUENCE.length];
}

export function residentFacingForMovement(
  deltaScreenX: number,
  deltaScreenY: number,
  current: ResidentFacing,
  threshold = 0.18
): ResidentFacing {
  let vertical: 'front' | 'rear' = current.startsWith('rear') ? 'rear' : 'front';
  let horizontal: 'left' | 'right' = current.endsWith('left') ? 'left' : 'right';
  if (deltaScreenY < -threshold) vertical = 'rear';
  else if (deltaScreenY > threshold) vertical = 'front';
  if (deltaScreenX < -threshold) horizontal = 'left';
  else if (deltaScreenX > threshold) horizontal = 'right';
  return `${vertical}-${horizontal}`;
}

export function residentCrowdOffset(id: string): { x: number; y: number } {
  let hash = 2166136261;
  for (const character of id) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const angle = ((hash >>> 0) % 24) / 24 * Math.PI * 2;
  const radius = 0.18 + ((hash >>> 8) % 4) * 0.14;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}
