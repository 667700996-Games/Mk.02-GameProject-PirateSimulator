import type { ShipClass } from '$lib/domain/types';

export const NAVAL_ATLAS_KEY = 'naval-fleet-classes';
export const NAVAL_ATLAS_IMAGE = '/art/naval/fleet-classes-atlas.png';
export const NAVAL_ATLAS_DATA = '/art/naval/fleet-classes-atlas.json';

export interface ShipArtDefinition {
  frame: ShipClass;
  displaySize: number;
  shadowWidth: number;
  wakeOffset: number;
}

export const SHIP_ART: Record<ShipClass, ShipArtDefinition> = {
  boat: { frame: 'boat', displaySize: 112, shadowWidth: 82, wakeOffset: 40 },
  sloop: { frame: 'sloop', displaySize: 148, shadowWidth: 112, wakeOffset: 54 },
  schooner: { frame: 'schooner', displaySize: 166, shadowWidth: 132, wakeOffset: 62 },
  brig: { frame: 'brig', displaySize: 182, shadowWidth: 146, wakeOffset: 69 },
  brigantine: { frame: 'brigantine', displaySize: 194, shadowWidth: 158, wakeOffset: 75 },
  frigate: { frame: 'frigate', displaySize: 214, shadowWidth: 176, wakeOffset: 84 },
  galleon: { frame: 'galleon', displaySize: 234, shadowWidth: 194, wakeOffset: 92 },
  'ship-of-the-line': { frame: 'ship-of-the-line', displaySize: 260, shadowWidth: 216, wakeOffset: 102 },
  legendary: { frame: 'legendary', displaySize: 270, shadowWidth: 226, wakeOffset: 106 }
};

export function shipDamageStage(hull: number, hullMax: number): 0 | 1 | 2 | 3 {
  const ratio = hull / Math.max(1, hullMax);
  if (ratio <= 0.22) return 3;
  if (ratio <= 0.48) return 2;
  if (ratio <= 0.72) return 1;
  return 0;
}
