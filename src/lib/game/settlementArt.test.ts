import { describe, expect, it } from 'vitest';
import {
  CORE_BUILDING_ART,
  CORE_BUILDING_ATLAS_DATA,
  CORE_BUILDING_ATLAS_IMAGE,
  coreBuildingDisplayHeight
} from './settlementArt';

const CORE_VERTICAL_SLICE = [
  'wreckage',
  'campfire',
  'tent',
  'water-collector',
  'fisher-hut',
  'lumber-camp',
  'warehouse',
  'sawmill',
  'small-dock',
  'shipyard',
  'watchtower',
  'coastal-battery'
] as const;

describe('settlement core building art', () => {
  it('covers the full playable settlement vertical slice with unique atlas frames', () => {
    const frames = CORE_VERTICAL_SLICE.map((id) => CORE_BUILDING_ART[id]?.frame);

    expect(frames.every(Boolean)).toBe(true);
    expect(new Set(frames).size).toBe(CORE_VERTICAL_SLICE.length);
  });

  it('provides valid gameplay display dimensions and public atlas URLs', () => {
    for (const id of CORE_VERTICAL_SLICE) {
      const art = CORE_BUILDING_ART[id];
      expect(art).toBeDefined();
      expect(art!.displayWidth).toBeGreaterThanOrEqual(100);
      expect(coreBuildingDisplayHeight(art!)).toBeGreaterThan(80);
    }

    expect(CORE_BUILDING_ATLAS_IMAGE).toMatch(/^\/art\/settlement\/.*\.png$/);
    expect(CORE_BUILDING_ATLAS_DATA).toMatch(/^\/art\/settlement\/.*\.json$/);
  });
});
