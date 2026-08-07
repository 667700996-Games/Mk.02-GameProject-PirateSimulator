import type { SettlementBuildingId } from '$lib/settlement/types';

export const CORE_BUILDING_ATLAS_KEY = 'settlement-core-buildings';
export const CORE_BUILDING_ATLAS_IMAGE = '/art/settlement/core-buildings-atlas.png';
export const CORE_BUILDING_ATLAS_DATA = '/art/settlement/core-buildings-atlas.json';
export const CORE_BUILDING_FRAME_RATIO = 341 / 384;
export const CORE_BUILDING_TIER2_ATLAS_KEY = 'settlement-core-buildings-tier2';
export const CORE_BUILDING_TIER2_ATLAS_IMAGE = '/art/settlement/core-buildings-tier2-atlas.png';
export const CORE_BUILDING_TIER3_ATLAS_KEY = 'settlement-core-buildings-tier3';
export const CORE_BUILDING_TIER3_ATLAS_IMAGE = '/art/settlement/core-buildings-tier3-atlas.png';
export const INDUSTRY_BUILDING_ATLAS_KEY = 'settlement-industry-buildings';
export const INDUSTRY_BUILDING_ATLAS_IMAGE = '/art/settlement/industry-buildings-atlas.png';
export const INDUSTRY_BUILDING_ATLAS_DATA = '/art/settlement/industry-buildings-atlas.json';
export const INDUSTRY_BUILDING_TIER2_ATLAS_KEY = 'settlement-industry-buildings-tier2';
export const INDUSTRY_BUILDING_TIER2_ATLAS_IMAGE =
  '/art/settlement/industry-buildings-tier2-atlas.png';
export const INDUSTRY_BUILDING_TIER3_ATLAS_KEY = 'settlement-industry-buildings-tier3';
export const INDUSTRY_BUILDING_TIER3_ATLAS_IMAGE =
  '/art/settlement/industry-buildings-tier3-atlas.png';
export const INDUSTRY_BUILDING_FRAME_RATIO = 341 / 512;
export const SOCIETY_BUILDING_ATLAS_KEY = 'settlement-society-buildings';
export const SOCIETY_BUILDING_ATLAS_IMAGE = '/art/settlement/society-buildings-atlas.png';
export const SOCIETY_BUILDING_ATLAS_DATA = '/art/settlement/society-buildings-atlas.json';
export const SOCIETY_BUILDING_TIER2_ATLAS_KEY = 'settlement-society-buildings-tier2';
export const SOCIETY_BUILDING_TIER2_ATLAS_IMAGE =
  '/art/settlement/society-buildings-tier2-atlas.png';
export const SOCIETY_BUILDING_TIER3_ATLAS_KEY = 'settlement-society-buildings-tier3';
export const SOCIETY_BUILDING_TIER3_ATLAS_IMAGE =
  '/art/settlement/society-buildings-tier3-atlas.png';
export const SOCIETY_BUILDING_FRAME_RATIO = 1;
export const LOGISTICS_FLEET_BUILDING_ATLAS_KEY = 'settlement-logistics-fleet-buildings';
export const LOGISTICS_FLEET_BUILDING_ATLAS_IMAGE =
  '/art/settlement/logistics-fleet-buildings-atlas.png';
export const LOGISTICS_FLEET_BUILDING_ATLAS_DATA =
  '/art/settlement/logistics-fleet-buildings-atlas.json';
export const LOGISTICS_FLEET_BUILDING_TIER2_ATLAS_KEY =
  'settlement-logistics-fleet-buildings-tier2';
export const LOGISTICS_FLEET_BUILDING_TIER2_ATLAS_IMAGE =
  '/art/settlement/logistics-fleet-buildings-tier2-atlas.png';
export const LOGISTICS_FLEET_BUILDING_TIER3_ATLAS_KEY =
  'settlement-logistics-fleet-buildings-tier3';
export const LOGISTICS_FLEET_BUILDING_TIER3_ATLAS_IMAGE =
  '/art/settlement/logistics-fleet-buildings-tier3-atlas.png';
export const LOGISTICS_FLEET_BUILDING_FRAME_RATIO = 341 / 384;
export const LIVELIHOOD_SERVICE_BUILDING_ATLAS_KEY = 'settlement-livelihood-service-buildings';
export const LIVELIHOOD_SERVICE_BUILDING_ATLAS_IMAGE =
  '/art/settlement/livelihood-service-buildings-atlas.png';
export const LIVELIHOOD_SERVICE_BUILDING_ATLAS_DATA =
  '/art/settlement/livelihood-service-buildings-atlas.json';
export const LIVELIHOOD_SERVICE_BUILDING_TIER2_ATLAS_KEY =
  'settlement-livelihood-service-buildings-tier2';
export const LIVELIHOOD_SERVICE_BUILDING_TIER2_ATLAS_IMAGE =
  '/art/settlement/livelihood-service-buildings-tier2-atlas.png';
export const LIVELIHOOD_SERVICE_BUILDING_TIER3_ATLAS_KEY =
  'settlement-livelihood-service-buildings-tier3';
export const LIVELIHOOD_SERVICE_BUILDING_TIER3_ATLAS_IMAGE =
  '/art/settlement/livelihood-service-buildings-tier3-atlas.png';
export const LIVELIHOOD_SERVICE_BUILDING_FRAME_RATIO = 512 / 384;
export const CIVIC_DEFENSE_BUILDING_ATLAS_KEY = 'settlement-civic-defense-buildings';
export const CIVIC_DEFENSE_BUILDING_ATLAS_IMAGE =
  '/art/settlement/civic-defense-buildings-atlas.png';
export const CIVIC_DEFENSE_BUILDING_ATLAS_DATA =
  '/art/settlement/civic-defense-buildings-atlas.json';
export const CIVIC_DEFENSE_BUILDING_TIER2_ATLAS_KEY = 'settlement-civic-defense-buildings-tier2';
export const CIVIC_DEFENSE_BUILDING_TIER2_ATLAS_IMAGE =
  '/art/settlement/civic-defense-buildings-tier2-atlas.png';
export const CIVIC_DEFENSE_BUILDING_TIER3_ATLAS_KEY = 'settlement-civic-defense-buildings-tier3';
export const CIVIC_DEFENSE_BUILDING_TIER3_ATLAS_IMAGE =
  '/art/settlement/civic-defense-buildings-tier3-atlas.png';
export const CIVIC_DEFENSE_BUILDING_FRAME_RATIO = 512 / 384;

export const BUILDING_ATLAS_SOURCES = {
  [CORE_BUILDING_ATLAS_KEY]: { image: CORE_BUILDING_ATLAS_IMAGE, data: CORE_BUILDING_ATLAS_DATA },
  [CORE_BUILDING_TIER2_ATLAS_KEY]: {
    image: CORE_BUILDING_TIER2_ATLAS_IMAGE,
    data: CORE_BUILDING_ATLAS_DATA
  },
  [CORE_BUILDING_TIER3_ATLAS_KEY]: {
    image: CORE_BUILDING_TIER3_ATLAS_IMAGE,
    data: CORE_BUILDING_ATLAS_DATA
  },
  [INDUSTRY_BUILDING_ATLAS_KEY]: {
    image: INDUSTRY_BUILDING_ATLAS_IMAGE,
    data: INDUSTRY_BUILDING_ATLAS_DATA
  },
  [INDUSTRY_BUILDING_TIER2_ATLAS_KEY]: {
    image: INDUSTRY_BUILDING_TIER2_ATLAS_IMAGE,
    data: INDUSTRY_BUILDING_ATLAS_DATA
  },
  [INDUSTRY_BUILDING_TIER3_ATLAS_KEY]: {
    image: INDUSTRY_BUILDING_TIER3_ATLAS_IMAGE,
    data: INDUSTRY_BUILDING_ATLAS_DATA
  },
  [SOCIETY_BUILDING_ATLAS_KEY]: {
    image: SOCIETY_BUILDING_ATLAS_IMAGE,
    data: SOCIETY_BUILDING_ATLAS_DATA
  },
  [SOCIETY_BUILDING_TIER2_ATLAS_KEY]: {
    image: SOCIETY_BUILDING_TIER2_ATLAS_IMAGE,
    data: SOCIETY_BUILDING_ATLAS_DATA
  },
  [SOCIETY_BUILDING_TIER3_ATLAS_KEY]: {
    image: SOCIETY_BUILDING_TIER3_ATLAS_IMAGE,
    data: SOCIETY_BUILDING_ATLAS_DATA
  },
  [LOGISTICS_FLEET_BUILDING_ATLAS_KEY]: {
    image: LOGISTICS_FLEET_BUILDING_ATLAS_IMAGE,
    data: LOGISTICS_FLEET_BUILDING_ATLAS_DATA
  },
  [LOGISTICS_FLEET_BUILDING_TIER2_ATLAS_KEY]: {
    image: LOGISTICS_FLEET_BUILDING_TIER2_ATLAS_IMAGE,
    data: LOGISTICS_FLEET_BUILDING_ATLAS_DATA
  },
  [LOGISTICS_FLEET_BUILDING_TIER3_ATLAS_KEY]: {
    image: LOGISTICS_FLEET_BUILDING_TIER3_ATLAS_IMAGE,
    data: LOGISTICS_FLEET_BUILDING_ATLAS_DATA
  },
  [LIVELIHOOD_SERVICE_BUILDING_ATLAS_KEY]: {
    image: LIVELIHOOD_SERVICE_BUILDING_ATLAS_IMAGE,
    data: LIVELIHOOD_SERVICE_BUILDING_ATLAS_DATA
  },
  [LIVELIHOOD_SERVICE_BUILDING_TIER2_ATLAS_KEY]: {
    image: LIVELIHOOD_SERVICE_BUILDING_TIER2_ATLAS_IMAGE,
    data: LIVELIHOOD_SERVICE_BUILDING_ATLAS_DATA
  },
  [LIVELIHOOD_SERVICE_BUILDING_TIER3_ATLAS_KEY]: {
    image: LIVELIHOOD_SERVICE_BUILDING_TIER3_ATLAS_IMAGE,
    data: LIVELIHOOD_SERVICE_BUILDING_ATLAS_DATA
  },
  [CIVIC_DEFENSE_BUILDING_ATLAS_KEY]: {
    image: CIVIC_DEFENSE_BUILDING_ATLAS_IMAGE,
    data: CIVIC_DEFENSE_BUILDING_ATLAS_DATA
  },
  [CIVIC_DEFENSE_BUILDING_TIER2_ATLAS_KEY]: {
    image: CIVIC_DEFENSE_BUILDING_TIER2_ATLAS_IMAGE,
    data: CIVIC_DEFENSE_BUILDING_ATLAS_DATA
  },
  [CIVIC_DEFENSE_BUILDING_TIER3_ATLAS_KEY]: {
    image: CIVIC_DEFENSE_BUILDING_TIER3_ATLAS_IMAGE,
    data: CIVIC_DEFENSE_BUILDING_ATLAS_DATA
  }
} as const;

export type BuildingAtlasKey = keyof typeof BUILDING_ATLAS_SOURCES;

export const BUILDING_TIER_ATLAS_KEYS: Partial<
  Record<BuildingAtlasKey, { tier2: BuildingAtlasKey; tier3: BuildingAtlasKey }>
> = {
  [CORE_BUILDING_ATLAS_KEY]: {
    tier2: CORE_BUILDING_TIER2_ATLAS_KEY,
    tier3: CORE_BUILDING_TIER3_ATLAS_KEY
  },
  [INDUSTRY_BUILDING_ATLAS_KEY]: {
    tier2: INDUSTRY_BUILDING_TIER2_ATLAS_KEY,
    tier3: INDUSTRY_BUILDING_TIER3_ATLAS_KEY
  },
  [SOCIETY_BUILDING_ATLAS_KEY]: {
    tier2: SOCIETY_BUILDING_TIER2_ATLAS_KEY,
    tier3: SOCIETY_BUILDING_TIER3_ATLAS_KEY
  },
  [LOGISTICS_FLEET_BUILDING_ATLAS_KEY]: {
    tier2: LOGISTICS_FLEET_BUILDING_TIER2_ATLAS_KEY,
    tier3: LOGISTICS_FLEET_BUILDING_TIER3_ATLAS_KEY
  },
  [LIVELIHOOD_SERVICE_BUILDING_ATLAS_KEY]: {
    tier2: LIVELIHOOD_SERVICE_BUILDING_TIER2_ATLAS_KEY,
    tier3: LIVELIHOOD_SERVICE_BUILDING_TIER3_ATLAS_KEY
  },
  [CIVIC_DEFENSE_BUILDING_ATLAS_KEY]: {
    tier2: CIVIC_DEFENSE_BUILDING_TIER2_ATLAS_KEY,
    tier3: CIVIC_DEFENSE_BUILDING_TIER3_ATLAS_KEY
  }
};

export interface CoreBuildingArt {
  frame: string;
  displayWidth: number;
  atlasKey?: BuildingAtlasKey;
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
  quarry: {
    frame: 'quarry',
    displayWidth: 168,
    atlasKey: INDUSTRY_BUILDING_ATLAS_KEY,
    frameRatio: INDUSTRY_BUILDING_FRAME_RATIO
  },
  'iron-mine': {
    frame: 'iron-mine',
    displayWidth: 174,
    atlasKey: INDUSTRY_BUILDING_ATLAS_KEY,
    frameRatio: INDUSTRY_BUILDING_FRAME_RATIO
  },
  'copper-mine': {
    frame: 'copper-mine',
    displayWidth: 174,
    atlasKey: INDUSTRY_BUILDING_ATLAS_KEY,
    frameRatio: INDUSTRY_BUILDING_FRAME_RATIO
  },
  farm: {
    frame: 'farm',
    displayWidth: 176,
    atlasKey: INDUSTRY_BUILDING_ATLAS_KEY,
    frameRatio: INDUSTRY_BUILDING_FRAME_RATIO
  },
  smelter: {
    frame: 'smelter',
    displayWidth: 166,
    atlasKey: INDUSTRY_BUILDING_ATLAS_KEY,
    frameRatio: INDUSTRY_BUILDING_FRAME_RATIO
  },
  forge: {
    frame: 'forge',
    displayWidth: 168,
    atlasKey: INDUSTRY_BUILDING_ATLAS_KEY,
    frameRatio: INDUSTRY_BUILDING_FRAME_RATIO
  },
  mill: {
    frame: 'mill',
    displayWidth: 162,
    atlasKey: INDUSTRY_BUILDING_ATLAS_KEY,
    frameRatio: INDUSTRY_BUILDING_FRAME_RATIO
  },
  bakery: {
    frame: 'bakery',
    displayWidth: 154,
    atlasKey: INDUSTRY_BUILDING_ATLAS_KEY,
    frameRatio: INDUSTRY_BUILDING_FRAME_RATIO
  },
  distillery: {
    frame: 'distillery',
    displayWidth: 168,
    atlasKey: INDUSTRY_BUILDING_ATLAS_KEY,
    frameRatio: INDUSTRY_BUILDING_FRAME_RATIO
  },
  bunkhouse: {
    frame: 'bunkhouse',
    displayWidth: 172,
    atlasKey: SOCIETY_BUILDING_ATLAS_KEY,
    frameRatio: SOCIETY_BUILDING_FRAME_RATIO
  },
  barracks: {
    frame: 'barracks',
    displayWidth: 184,
    atlasKey: SOCIETY_BUILDING_ATLAS_KEY,
    frameRatio: SOCIETY_BUILDING_FRAME_RATIO
  },
  'skilled-house': {
    frame: 'skilled-house',
    displayWidth: 160,
    atlasKey: SOCIETY_BUILDING_ATLAS_KEY,
    frameRatio: SOCIETY_BUILDING_FRAME_RATIO
  },
  'officer-quarters': {
    frame: 'officer-quarters',
    displayWidth: 170,
    atlasKey: SOCIETY_BUILDING_ATLAS_KEY,
    frameRatio: SOCIETY_BUILDING_FRAME_RATIO
  },
  tavern: {
    frame: 'tavern',
    displayWidth: 174,
    atlasKey: SOCIETY_BUILDING_ATLAS_KEY,
    frameRatio: SOCIETY_BUILDING_FRAME_RATIO
  },
  infirmary: {
    frame: 'infirmary',
    displayWidth: 168,
    atlasKey: SOCIETY_BUILDING_ATLAS_KEY,
    frameRatio: SOCIETY_BUILDING_FRAME_RATIO
  },
  'powder-magazine': {
    frame: 'powder-magazine',
    displayWidth: 158,
    atlasKey: SOCIETY_BUILDING_ATLAS_KEY,
    frameRatio: SOCIETY_BUILDING_FRAME_RATIO
  },
  'captains-lodge': {
    frame: 'captains-lodge',
    displayWidth: 186,
    atlasKey: SOCIETY_BUILDING_ATLAS_KEY,
    frameRatio: SOCIETY_BUILDING_FRAME_RATIO
  },
  'expedition-office': {
    frame: 'expedition-office',
    displayWidth: 178,
    atlasKey: SOCIETY_BUILDING_ATLAS_KEY,
    frameRatio: SOCIETY_BUILDING_FRAME_RATIO
  },
  'local-storage': {
    frame: 'local-storage',
    displayWidth: 128,
    atlasKey: LOGISTICS_FLEET_BUILDING_ATLAS_KEY,
    frameRatio: LOGISTICS_FLEET_BUILDING_FRAME_RATIO
  },
  'distribution-depot': {
    frame: 'distribution-depot',
    displayWidth: 170,
    atlasKey: LOGISTICS_FLEET_BUILDING_ATLAS_KEY,
    frameRatio: LOGISTICS_FLEET_BUILDING_FRAME_RATIO
  },
  'dock-warehouse': {
    frame: 'dock-warehouse',
    displayWidth: 186,
    atlasKey: LOGISTICS_FLEET_BUILDING_ATLAS_KEY,
    frameRatio: LOGISTICS_FLEET_BUILDING_FRAME_RATIO
  },
  'cargo-lift': {
    frame: 'cargo-lift',
    displayWidth: 144,
    atlasKey: LOGISTICS_FLEET_BUILDING_ATLAS_KEY,
    frameRatio: LOGISTICS_FLEET_BUILDING_FRAME_RATIO
  },
  'zipline-post': {
    frame: 'zipline-post',
    displayWidth: 120,
    atlasKey: LOGISTICS_FLEET_BUILDING_ATLAS_KEY,
    frameRatio: LOGISTICS_FLEET_BUILDING_FRAME_RATIO
  },
  bridge: {
    frame: 'bridge',
    displayWidth: 178,
    atlasKey: LOGISTICS_FLEET_BUILDING_ATLAS_KEY,
    frameRatio: LOGISTICS_FLEET_BUILDING_FRAME_RATIO
  },
  stairs: {
    frame: 'stairs',
    displayWidth: 136,
    atlasKey: LOGISTICS_FLEET_BUILDING_ATLAS_KEY,
    frameRatio: LOGISTICS_FLEET_BUILDING_FRAME_RATIO
  },
  ramp: {
    frame: 'ramp',
    displayWidth: 162,
    atlasKey: LOGISTICS_FLEET_BUILDING_ATLAS_KEY,
    frameRatio: LOGISTICS_FLEET_BUILDING_FRAME_RATIO
  },
  'cliff-platform': {
    frame: 'cliff-platform',
    displayWidth: 168,
    atlasKey: LOGISTICS_FLEET_BUILDING_ATLAS_KEY,
    frameRatio: LOGISTICS_FLEET_BUILDING_FRAME_RATIO
  },
  'dry-dock': {
    frame: 'dry-dock',
    displayWidth: 206,
    atlasKey: LOGISTICS_FLEET_BUILDING_ATLAS_KEY,
    frameRatio: LOGISTICS_FLEET_BUILDING_FRAME_RATIO
  },
  'supply-depot': {
    frame: 'supply-depot',
    displayWidth: 184,
    atlasKey: LOGISTICS_FLEET_BUILDING_ATLAS_KEY,
    frameRatio: LOGISTICS_FLEET_BUILDING_FRAME_RATIO
  },
  'cannon-foundry': {
    frame: 'cannon-foundry',
    displayWidth: 186,
    atlasKey: LOGISTICS_FLEET_BUILDING_ATLAS_KEY,
    frameRatio: LOGISTICS_FLEET_BUILDING_FRAME_RATIO
  },
  'hunter-hut': {
    frame: 'hunter-hut',
    displayWidth: 144,
    atlasKey: LIVELIHOOD_SERVICE_BUILDING_ATLAS_KEY,
    frameRatio: LIVELIHOOD_SERVICE_BUILDING_FRAME_RATIO
  },
  cookhouse: {
    frame: 'cookhouse',
    displayWidth: 164,
    atlasKey: LIVELIHOOD_SERVICE_BUILDING_ATLAS_KEY,
    frameRatio: LIVELIHOOD_SERVICE_BUILDING_FRAME_RATIO
  },
  weaver: {
    frame: 'weaver',
    displayWidth: 164,
    atlasKey: LIVELIHOOD_SERVICE_BUILDING_ATLAS_KEY,
    frameRatio: LIVELIHOOD_SERVICE_BUILDING_FRAME_RATIO
  },
  'powder-workshop': {
    frame: 'powder-workshop',
    displayWidth: 170,
    atlasKey: LIVELIHOOD_SERVICE_BUILDING_ATLAS_KEY,
    frameRatio: LIVELIHOOD_SERVICE_BUILDING_FRAME_RATIO
  },
  'ammunition-workshop': {
    frame: 'ammunition-workshop',
    displayWidth: 168,
    atlasKey: LIVELIHOOD_SERVICE_BUILDING_ATLAS_KEY,
    frameRatio: LIVELIHOOD_SERVICE_BUILDING_FRAME_RATIO
  },
  'gambling-den': {
    frame: 'gambling-den',
    displayWidth: 164,
    atlasKey: LIVELIHOOD_SERVICE_BUILDING_ATLAS_KEY,
    frameRatio: LIVELIHOOD_SERVICE_BUILDING_FRAME_RATIO
  },
  bathhouse: {
    frame: 'bathhouse',
    displayWidth: 168,
    atlasKey: LIVELIHOOD_SERVICE_BUILDING_ATLAS_KEY,
    frameRatio: LIVELIHOOD_SERVICE_BUILDING_FRAME_RATIO
  },
  'bounty-board': {
    frame: 'bounty-board',
    displayWidth: 126,
    atlasKey: LIVELIHOOD_SERVICE_BUILDING_ATLAS_KEY,
    frameRatio: LIVELIHOOD_SERVICE_BUILDING_FRAME_RATIO
  },
  arena: {
    frame: 'arena',
    displayWidth: 194,
    atlasKey: CIVIC_DEFENSE_BUILDING_ATLAS_KEY,
    frameRatio: CIVIC_DEFENSE_BUILDING_FRAME_RATIO
  },
  'festival-square': {
    frame: 'festival-square',
    displayWidth: 180,
    atlasKey: CIVIC_DEFENSE_BUILDING_ATLAS_KEY,
    frameRatio: CIVIC_DEFENSE_BUILDING_FRAME_RATIO
  },
  'training-yard': {
    frame: 'training-yard',
    displayWidth: 188,
    atlasKey: CIVIC_DEFENSE_BUILDING_ATLAS_KEY,
    frameRatio: CIVIC_DEFENSE_BUILDING_FRAME_RATIO
  },
  'fort-wall': {
    frame: 'fort-wall',
    displayWidth: 200,
    atlasKey: CIVIC_DEFENSE_BUILDING_ATLAS_KEY,
    frameRatio: CIVIC_DEFENSE_BUILDING_FRAME_RATIO
  },
  'guard-post': {
    frame: 'guard-post',
    displayWidth: 132,
    atlasKey: CIVIC_DEFENSE_BUILDING_ATLAS_KEY,
    frameRatio: CIVIC_DEFENSE_BUILDING_FRAME_RATIO
  },
  'signal-tower': {
    frame: 'signal-tower',
    displayWidth: 126,
    atlasKey: CIVIC_DEFENSE_BUILDING_ATLAS_KEY,
    frameRatio: CIVIC_DEFENSE_BUILDING_FRAME_RATIO
  },
  'pirate-council': {
    frame: 'pirate-council',
    displayWidth: 202,
    atlasKey: CIVIC_DEFENSE_BUILDING_ATLAS_KEY,
    frameRatio: CIVIC_DEFENSE_BUILDING_FRAME_RATIO
  },
  'intelligence-network': {
    frame: 'intelligence-network',
    displayWidth: 168,
    atlasKey: CIVIC_DEFENSE_BUILDING_ATLAS_KEY,
    frameRatio: CIVIC_DEFENSE_BUILDING_FRAME_RATIO
  }
};

export function coreBuildingDisplayHeight(art: CoreBuildingArt): number {
  return art.displayWidth * (art.frameRatio ?? CORE_BUILDING_FRAME_RATIO);
}

export function buildingAtlasKey(art: CoreBuildingArt): BuildingAtlasKey {
  return art.atlasKey ?? CORE_BUILDING_ATLAS_KEY;
}

export function buildingAtlasKeyForLevel(art: CoreBuildingArt, level: number): BuildingAtlasKey {
  const baseKey = buildingAtlasKey(art);
  const tierKeys = BUILDING_TIER_ATLAS_KEYS[baseKey];
  if (!tierKeys) return baseKey;
  if (level >= 3) return tierKeys.tier3;
  if (level === 2) return tierKeys.tier2;
  return baseKey;
}

export function buildingAtlasKeysForIds(ids: Iterable<SettlementBuildingId>): BuildingAtlasKey[] {
  const keys = new Set<BuildingAtlasKey>([CORE_BUILDING_ATLAS_KEY]);
  for (const id of ids) {
    const art = CORE_BUILDING_ART[id];
    if (art) keys.add(buildingAtlasKey(art));
  }
  return [...keys];
}

export function buildingAtlasKeysForBuildings(
  buildings: Iterable<
    Pick<{ definitionId: SettlementBuildingId; level: number }, 'definitionId' | 'level'>
  >
): BuildingAtlasKey[] {
  const keys = new Set<BuildingAtlasKey>([CORE_BUILDING_ATLAS_KEY]);
  for (const building of buildings) {
    const art = CORE_BUILDING_ART[building.definitionId];
    if (!art) continue;
    keys.add(buildingAtlasKey(art));
    keys.add(buildingAtlasKeyForLevel(art, building.level));
  }
  return [...keys];
}
