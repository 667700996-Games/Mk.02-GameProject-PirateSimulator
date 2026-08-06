import type { JobId, PopulationTier } from '$lib/settlement/types';

export const RESIDENT_ATLAS_KEY = 'settlement-resident-roles';
export const RESIDENT_ATLAS_IMAGE = '/art/settlement/resident-roles-atlas.png';
export const RESIDENT_ATLAS_DATA = '/art/settlement/resident-roles-atlas.json';
export const RESIDENT_FRAME_RATIO = 512 / 384;

export type ResidentArtFrame =
  | 'laborer'
  | 'hauler'
  | 'builder'
  | 'logger'
  | 'fisher'
  | 'shipwright'
  | 'guard'
  | 'officer';

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
  const width = frame === 'officer' ? 36 : frame === 'hauler' ? 35 : 34;
  return { width, height: width * RESIDENT_FRAME_RATIO };
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
