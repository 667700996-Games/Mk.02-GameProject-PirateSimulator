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
  boat: { frame: 'boat', displaySize: 92, shadowWidth: 68, wakeOffset: 34 },
  sloop: { frame: 'sloop', displaySize: 120, shadowWidth: 92, wakeOffset: 44 },
  schooner: { frame: 'schooner', displaySize: 136, shadowWidth: 108, wakeOffset: 51 },
  brig: { frame: 'brig', displaySize: 150, shadowWidth: 120, wakeOffset: 57 },
  brigantine: { frame: 'brigantine', displaySize: 160, shadowWidth: 130, wakeOffset: 62 },
  frigate: { frame: 'frigate', displaySize: 178, shadowWidth: 146, wakeOffset: 70 },
  galleon: { frame: 'galleon', displaySize: 194, shadowWidth: 162, wakeOffset: 76 },
  'ship-of-the-line': { frame: 'ship-of-the-line', displaySize: 220, shadowWidth: 184, wakeOffset: 86 },
  legendary: { frame: 'legendary', displaySize: 226, shadowWidth: 190, wakeOffset: 88 }
};

export function shipDamageStage(hull: number, hullMax: number): 0 | 1 | 2 | 3 {
  const ratio = hull / Math.max(1, hullMax);
  if (ratio <= 0.22) return 3;
  if (ratio <= 0.48) return 2;
  if (ratio <= 0.72) return 1;
  return 0;
}
