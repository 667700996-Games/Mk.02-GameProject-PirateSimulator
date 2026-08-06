import type { BuildingState, SettlementBuilding } from '$lib/settlement/types';

export const BUILDING_PROGRESSION_ATLAS_KEY = 'settlement-building-progression';
export const BUILDING_PROGRESSION_ATLAS_IMAGE = '/art/settlement/building-progression-overlays-atlas.png';
export const BUILDING_PROGRESSION_ATLAS_DATA = '/art/settlement/building-progression-overlays-atlas.json';

export type BuildingProgressionFrame =
  | 'construction-scaffold'
  | 'upgrade-derrick'
  | 'veteran-expansion'
  | 'master-expansion'
  | 'damage-debris'
  | 'halted-worksite';

export interface BuildingProgressionVisual {
  frame: BuildingProgressionFrame;
  displayScale: number;
  alpha: number;
  originY: number;
  offsetY: number;
  lanternGlowPoints?: ReadonlyArray<{ x: number; y: number }>;
}

export const BUILDING_PROGRESSION_ART = {
  'construction-scaffold': { frame: 'construction-scaffold', displayScale: 1.45, alpha: 0.98, originY: 0.88, offsetY: 14 },
  'upgrade-derrick': { frame: 'upgrade-derrick', displayScale: 1.4, alpha: 0.98, originY: 0.87, offsetY: 14 },
  'veteran-expansion': {
    frame: 'veteran-expansion', displayScale: 1.24, alpha: 0.94, originY: 0.88, offsetY: 14,
    lanternGlowPoints: [{ x: 0.31, y: -0.31 }]
  },
  'master-expansion': {
    frame: 'master-expansion', displayScale: 1.32, alpha: 0.98, originY: 0.86, offsetY: 14,
    lanternGlowPoints: [{ x: -0.31, y: -0.27 }, { x: 0.31, y: -0.27 }]
  },
  'damage-debris': { frame: 'damage-debris', displayScale: 1.2, alpha: 0.98, originY: 0.85, offsetY: 16 },
  'halted-worksite': { frame: 'halted-worksite', displayScale: 1.32, alpha: 0.92, originY: 0.87, offsetY: 15 }
} satisfies Record<BuildingProgressionFrame, BuildingProgressionVisual>;

type ProgressionBuilding = Pick<SettlementBuilding, 'state' | 'level'>;

export function buildingProgressionVisual(building: ProgressionBuilding): BuildingProgressionVisual | undefined {
  const stateFrame: Partial<Record<BuildingState, BuildingProgressionFrame>> = {
    PLANNED: 'construction-scaffold',
    CONSTRUCTING: 'construction-scaffold',
    UPGRADING: 'upgrade-derrick',
    DAMAGED: 'damage-debris',
    BURNING: 'damage-debris',
    DESTROYED: 'damage-debris',
    PAUSED: 'halted-worksite',
    BLOCKED: 'halted-worksite'
  };
  const stateVisual = stateFrame[building.state];
  if (stateVisual) return BUILDING_PROGRESSION_ART[stateVisual];
  if (building.state !== 'ACTIVE') return undefined;
  if (building.level >= 3) return BUILDING_PROGRESSION_ART['master-expansion'];
  if (building.level === 2) return BUILDING_PROGRESSION_ART['veteran-expansion'];
  return undefined;
}

export function buildingProgressionDisplaySize(baseWidth: number, visual: BuildingProgressionVisual): number {
  return Math.round(Math.max(132, Math.min(280, baseWidth * visual.displayScale)));
}
