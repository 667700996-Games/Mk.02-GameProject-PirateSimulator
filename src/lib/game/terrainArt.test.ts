import { describe, expect, it } from 'vitest';
import { TERRAIN_ART, terrainDepletionTint } from './terrainArt';

const TERRAIN_TYPES = [
  'deep-water', 'reef', 'beach', 'coast', 'plain', 'forest', 'slope', 'cliff',
  'highland', 'cave', 'ravine', 'wetland', 'stone-deposit', 'iron-vein', 'copper-vein'
] as const;

describe('settlement terrain art', () => {
  it('maps every simulation terrain to one unique production frame', () => {
    expect(Object.keys(TERRAIN_ART)).toEqual(TERRAIN_TYPES);
    expect(new Set(Object.values(TERRAIN_ART).map((art) => art.frame))).toHaveLength(TERRAIN_TYPES.length);
    expect(Object.values(TERRAIN_ART).every((art) => art.alpha >= 0.68 && art.alpha <= 0.8)).toBe(true);
  });

  it('only desaturates depleted deposits', () => {
    expect(terrainDepletionTint()).toBeUndefined();
    expect(terrainDepletionTint(100)).toBeUndefined();
    expect(terrainDepletionTint(1)).toBeUndefined();
    expect(terrainDepletionTint(0)).toBe(0x808983);
  });
});
