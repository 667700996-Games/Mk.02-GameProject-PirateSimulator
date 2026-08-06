import type { SettlementBuildingId } from '$lib/settlement/types';

export const CORE_BUILDING_ATLAS_KEY = 'settlement-core-buildings';
export const CORE_BUILDING_ATLAS_IMAGE = '/art/settlement/core-buildings-atlas.png';
export const CORE_BUILDING_ATLAS_DATA = '/art/settlement/core-buildings-atlas.json';
export const CORE_BUILDING_FRAME_RATIO = 341 / 384;
export const INDUSTRY_BUILDING_ATLAS_KEY = 'settlement-industry-buildings';
export const INDUSTRY_BUILDING_ATLAS_IMAGE = '/art/settlement/industry-buildings-atlas.png';
export const INDUSTRY_BUILDING_ATLAS_DATA = '/art/settlement/industry-buildings-atlas.json';
export const INDUSTRY_BUILDING_FRAME_RATIO = 341 / 512;
export const SOCIETY_BUILDING_ATLAS_KEY = 'settlement-society-buildings';
export const SOCIETY_BUILDING_ATLAS_IMAGE = '/art/settlement/society-buildings-atlas.png';
export const SOCIETY_BUILDING_ATLAS_DATA = '/art/settlement/society-buildings-atlas.json';
export const SOCIETY_BUILDING_FRAME_RATIO = 1;
export const LOGISTICS_FLEET_BUILDING_ATLAS_KEY = 'settlement-logistics-fleet-buildings';
export const LOGISTICS_FLEET_BUILDING_ATLAS_IMAGE = '/art/settlement/logistics-fleet-buildings-atlas.png';
export const LOGISTICS_FLEET_BUILDING_ATLAS_DATA = '/art/settlement/logistics-fleet-buildings-atlas.json';
export const LOGISTICS_FLEET_BUILDING_FRAME_RATIO = 341 / 384;

export interface CoreBuildingArt {
  frame: string;
  displayWidth: number;
  atlasKey?: string;
  frameRatio?: number;
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
  'coastal-battery': { frame: 'coastal-battery', displayWidth: 160 },
  quarry: { frame: 'quarry', displayWidth: 168, atlasKey: INDUSTRY_BUILDING_ATLAS_KEY, frameRatio: INDUSTRY_BUILDING_FRAME_RATIO },
  'iron-mine': { frame: 'iron-mine', displayWidth: 174, atlasKey: INDUSTRY_BUILDING_ATLAS_KEY, frameRatio: INDUSTRY_BUILDING_FRAME_RATIO },
  'copper-mine': { frame: 'copper-mine', displayWidth: 174, atlasKey: INDUSTRY_BUILDING_ATLAS_KEY, frameRatio: INDUSTRY_BUILDING_FRAME_RATIO },
  farm: { frame: 'farm', displayWidth: 176, atlasKey: INDUSTRY_BUILDING_ATLAS_KEY, frameRatio: INDUSTRY_BUILDING_FRAME_RATIO },
  smelter: { frame: 'smelter', displayWidth: 166, atlasKey: INDUSTRY_BUILDING_ATLAS_KEY, frameRatio: INDUSTRY_BUILDING_FRAME_RATIO },
  forge: { frame: 'forge', displayWidth: 168, atlasKey: INDUSTRY_BUILDING_ATLAS_KEY, frameRatio: INDUSTRY_BUILDING_FRAME_RATIO },
  mill: { frame: 'mill', displayWidth: 162, atlasKey: INDUSTRY_BUILDING_ATLAS_KEY, frameRatio: INDUSTRY_BUILDING_FRAME_RATIO },
  bakery: { frame: 'bakery', displayWidth: 154, atlasKey: INDUSTRY_BUILDING_ATLAS_KEY, frameRatio: INDUSTRY_BUILDING_FRAME_RATIO },
  distillery: { frame: 'distillery', displayWidth: 168, atlasKey: INDUSTRY_BUILDING_ATLAS_KEY, frameRatio: INDUSTRY_BUILDING_FRAME_RATIO },
  bunkhouse: { frame: 'bunkhouse', displayWidth: 172, atlasKey: SOCIETY_BUILDING_ATLAS_KEY, frameRatio: SOCIETY_BUILDING_FRAME_RATIO },
  barracks: { frame: 'barracks', displayWidth: 184, atlasKey: SOCIETY_BUILDING_ATLAS_KEY, frameRatio: SOCIETY_BUILDING_FRAME_RATIO },
  'skilled-house': { frame: 'skilled-house', displayWidth: 160, atlasKey: SOCIETY_BUILDING_ATLAS_KEY, frameRatio: SOCIETY_BUILDING_FRAME_RATIO },
  'officer-quarters': { frame: 'officer-quarters', displayWidth: 170, atlasKey: SOCIETY_BUILDING_ATLAS_KEY, frameRatio: SOCIETY_BUILDING_FRAME_RATIO },
  tavern: { frame: 'tavern', displayWidth: 174, atlasKey: SOCIETY_BUILDING_ATLAS_KEY, frameRatio: SOCIETY_BUILDING_FRAME_RATIO },
  infirmary: { frame: 'infirmary', displayWidth: 168, atlasKey: SOCIETY_BUILDING_ATLAS_KEY, frameRatio: SOCIETY_BUILDING_FRAME_RATIO },
  'powder-magazine': { frame: 'powder-magazine', displayWidth: 158, atlasKey: SOCIETY_BUILDING_ATLAS_KEY, frameRatio: SOCIETY_BUILDING_FRAME_RATIO },
  'captains-lodge': { frame: 'captains-lodge', displayWidth: 186, atlasKey: SOCIETY_BUILDING_ATLAS_KEY, frameRatio: SOCIETY_BUILDING_FRAME_RATIO },
  'expedition-office': { frame: 'expedition-office', displayWidth: 178, atlasKey: SOCIETY_BUILDING_ATLAS_KEY, frameRatio: SOCIETY_BUILDING_FRAME_RATIO },
  'local-storage': { frame: 'local-storage', displayWidth: 128, atlasKey: LOGISTICS_FLEET_BUILDING_ATLAS_KEY, frameRatio: LOGISTICS_FLEET_BUILDING_FRAME_RATIO },
  'distribution-depot': { frame: 'distribution-depot', displayWidth: 170, atlasKey: LOGISTICS_FLEET_BUILDING_ATLAS_KEY, frameRatio: LOGISTICS_FLEET_BUILDING_FRAME_RATIO },
  'dock-warehouse': { frame: 'dock-warehouse', displayWidth: 186, atlasKey: LOGISTICS_FLEET_BUILDING_ATLAS_KEY, frameRatio: LOGISTICS_FLEET_BUILDING_FRAME_RATIO },
  'cargo-lift': { frame: 'cargo-lift', displayWidth: 144, atlasKey: LOGISTICS_FLEET_BUILDING_ATLAS_KEY, frameRatio: LOGISTICS_FLEET_BUILDING_FRAME_RATIO },
  'zipline-post': { frame: 'zipline-post', displayWidth: 120, atlasKey: LOGISTICS_FLEET_BUILDING_ATLAS_KEY, frameRatio: LOGISTICS_FLEET_BUILDING_FRAME_RATIO },
  bridge: { frame: 'bridge', displayWidth: 178, atlasKey: LOGISTICS_FLEET_BUILDING_ATLAS_KEY, frameRatio: LOGISTICS_FLEET_BUILDING_FRAME_RATIO },
  stairs: { frame: 'stairs', displayWidth: 136, atlasKey: LOGISTICS_FLEET_BUILDING_ATLAS_KEY, frameRatio: LOGISTICS_FLEET_BUILDING_FRAME_RATIO },
  ramp: { frame: 'ramp', displayWidth: 162, atlasKey: LOGISTICS_FLEET_BUILDING_ATLAS_KEY, frameRatio: LOGISTICS_FLEET_BUILDING_FRAME_RATIO },
  'cliff-platform': { frame: 'cliff-platform', displayWidth: 168, atlasKey: LOGISTICS_FLEET_BUILDING_ATLAS_KEY, frameRatio: LOGISTICS_FLEET_BUILDING_FRAME_RATIO },
  'dry-dock': { frame: 'dry-dock', displayWidth: 206, atlasKey: LOGISTICS_FLEET_BUILDING_ATLAS_KEY, frameRatio: LOGISTICS_FLEET_BUILDING_FRAME_RATIO },
  'supply-depot': { frame: 'supply-depot', displayWidth: 184, atlasKey: LOGISTICS_FLEET_BUILDING_ATLAS_KEY, frameRatio: LOGISTICS_FLEET_BUILDING_FRAME_RATIO },
  'cannon-foundry': { frame: 'cannon-foundry', displayWidth: 186, atlasKey: LOGISTICS_FLEET_BUILDING_ATLAS_KEY, frameRatio: LOGISTICS_FLEET_BUILDING_FRAME_RATIO }
};

export function coreBuildingDisplayHeight(art: CoreBuildingArt): number {
  return art.displayWidth * (art.frameRatio ?? CORE_BUILDING_FRAME_RATIO);
}

export function buildingAtlasKey(art: CoreBuildingArt): string {
  return art.atlasKey ?? CORE_BUILDING_ATLAS_KEY;
}
