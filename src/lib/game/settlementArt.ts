import type { SettlementBuildingId } from '$lib/settlement/types';

export const CORE_BUILDING_ATLAS_KEY = 'settlement-core-buildings';
export const CORE_BUILDING_ATLAS_IMAGE = '/art/settlement/core-buildings-atlas.png';
export const CORE_BUILDING_ATLAS_DATA = '/art/settlement/core-buildings-atlas.json';
export const CORE_BUILDING_FRAME_RATIO = 341 / 384;

export interface CoreBuildingArt {
  frame: string;
  displayWidth: number;
  originY?: number;
  offsetY?: number;
}

export const CORE_BUILDING_ART: Partial<Record<SettlementBuildingId, CoreBuildingArt>> = {
  wreckage: { frame: 'wreckage', displayWidth: 152 },
  campfire: { frame: 'campfire', displayWidth: 108, originY: 0.84, offsetY: 9 },
  tent: { frame: 'tent', displayWidth: 112 },
  'water-collector': { frame: 'water-collector', displayWidth: 122 },
  'fisher-hut': { frame: 'fisher-hut', displayWidth: 144 },
  'lumber-camp': { frame: 'lumber-camp', displayWidth: 130 },
  warehouse: { frame: 'warehouse', displayWidth: 172 },
  sawmill: { frame: 'sawmill', displayWidth: 154 },
  'small-dock': { frame: 'small-dock', displayWidth: 146, originY: 0.84, offsetY: 9 },
  shipyard: { frame: 'shipyard', displayWidth: 190 },
  watchtower: { frame: 'watchtower', displayWidth: 118 },
  'coastal-battery': { frame: 'coastal-battery', displayWidth: 160 }
};

export function coreBuildingDisplayHeight(art: CoreBuildingArt): number {
  return art.displayWidth * CORE_BUILDING_FRAME_RATIO;
}
