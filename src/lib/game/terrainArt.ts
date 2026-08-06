import type { TerrainType } from '$lib/settlement/types';

export const TERRAIN_ATLAS_KEY = 'settlement-terrain-surfaces-v2';
export const TERRAIN_ATLAS_IMAGE = '/art/settlement/terrain-surfaces-atlas-v2.png';
export const TERRAIN_ATLAS_DATA = '/art/settlement/terrain-surfaces-atlas-v2.json';

export interface TerrainArtDefinition {
  frame: TerrainType;
  alpha: number;
}

export const TERRAIN_ART: Record<TerrainType, TerrainArtDefinition> = {
  'deep-water': { frame: 'deep-water', alpha: 0.7 },
  reef: { frame: 'reef', alpha: 0.76 },
  beach: { frame: 'beach', alpha: 0.78 },
  coast: { frame: 'coast', alpha: 0.7 },
  plain: { frame: 'plain', alpha: 0.7 },
  forest: { frame: 'forest', alpha: 0.72 },
  slope: { frame: 'slope', alpha: 0.72 },
  cliff: { frame: 'cliff', alpha: 0.74 },
  highland: { frame: 'highland', alpha: 0.72 },
  cave: { frame: 'cave', alpha: 0.78 },
  ravine: { frame: 'ravine', alpha: 0.78 },
  wetland: { frame: 'wetland', alpha: 0.76 },
  'stone-deposit': { frame: 'stone-deposit', alpha: 0.78 },
  'iron-vein': { frame: 'iron-vein', alpha: 0.78 },
  'copper-vein': { frame: 'copper-vein', alpha: 0.78 }
};

export function terrainDepletionTint(resourceRemaining?: number): number | undefined {
  if (resourceRemaining === undefined || resourceRemaining > 0) return undefined;
  return 0x808983;
}
