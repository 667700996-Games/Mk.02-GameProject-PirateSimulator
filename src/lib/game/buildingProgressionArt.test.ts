import { describe, expect, it } from 'vitest';
import type { BuildingState } from '$lib/settlement/types';
import {
  BUILDING_PROGRESSION_ART,
  BUILDING_PROGRESSION_ATLAS_DATA,
  BUILDING_PROGRESSION_ATLAS_IMAGE,
  buildingProgressionDisplaySize,
  buildingProgressionVisual
} from './buildingProgressionArt';

describe('building progression art', () => {
  it('provides six unique production overlay frames and public atlas URLs', () => {
    const frames = Object.values(BUILDING_PROGRESSION_ART).map((visual) => visual.frame);
    expect(frames).toHaveLength(6);
    expect(new Set(frames)).toHaveLength(6);
    expect(BUILDING_PROGRESSION_ATLAS_IMAGE).toMatch(/^\/art\/settlement\/.*\.png$/);
    expect(BUILDING_PROGRESSION_ATLAS_DATA).toMatch(/^\/art\/settlement\/.*\.json$/);
  });

  it('prioritizes physical worksite and damage states over level dressing', () => {
    const expected: Partial<Record<BuildingState, string>> = {
      PLANNED: 'construction-scaffold',
      CONSTRUCTING: 'construction-scaffold',
      UPGRADING: 'upgrade-derrick',
      DAMAGED: 'damage-debris',
      BURNING: 'damage-debris',
      DESTROYED: 'damage-debris',
      PAUSED: 'halted-worksite',
      BLOCKED: 'halted-worksite'
    };
    for (const [state, frame] of Object.entries(expected) as [BuildingState, string][]) {
      expect(buildingProgressionVisual({ state, level: 4 })?.frame).toBe(frame);
    }
  });

  it('makes completed level-two and level-three buildings visibly distinct', () => {
    expect(buildingProgressionVisual({ state: 'ACTIVE', level: 1 })).toBeUndefined();
    expect(buildingProgressionVisual({ state: 'ACTIVE', level: 2 })?.frame).toBe('veteran-expansion');
    expect(buildingProgressionVisual({ state: 'ACTIVE', level: 3 })?.frame).toBe('master-expansion');
    expect(buildingProgressionVisual({ state: 'ACTIVE', level: 7 })?.frame).toBe('master-expansion');
  });

  it('keeps generic overlays readable without overwhelming large buildings', () => {
    for (const visual of Object.values(BUILDING_PROGRESSION_ART)) {
      expect(buildingProgressionDisplaySize(80, visual)).toBeGreaterThanOrEqual(132);
      expect(buildingProgressionDisplaySize(320, visual)).toBeLessThanOrEqual(280);
    }
  });
});
