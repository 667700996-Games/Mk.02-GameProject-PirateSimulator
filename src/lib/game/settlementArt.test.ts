import { describe, expect, it } from 'vitest';
import { BUILDINGS } from '$lib/settlement/catalog';
import {
  BUILDING_ATLAS_SOURCES,
  BUILDING_TIER_ATLAS_KEYS,
  CIVIC_DEFENSE_BUILDING_ATLAS_DATA,
  CIVIC_DEFENSE_BUILDING_ATLAS_IMAGE,
  CIVIC_DEFENSE_BUILDING_ATLAS_KEY,
  CIVIC_DEFENSE_BUILDING_TIER2_ATLAS_IMAGE,
  CIVIC_DEFENSE_BUILDING_TIER2_ATLAS_KEY,
  CIVIC_DEFENSE_BUILDING_TIER3_ATLAS_IMAGE,
  CIVIC_DEFENSE_BUILDING_TIER3_ATLAS_KEY,
  CORE_BUILDING_ART,
  CORE_BUILDING_ATLAS_DATA,
  CORE_BUILDING_ATLAS_IMAGE,
  CORE_BUILDING_ATLAS_KEY,
  CORE_BUILDING_TIER2_ATLAS_IMAGE,
  CORE_BUILDING_TIER2_ATLAS_KEY,
  CORE_BUILDING_TIER3_ATLAS_IMAGE,
  CORE_BUILDING_TIER3_ATLAS_KEY,
  INDUSTRY_BUILDING_ATLAS_DATA,
  INDUSTRY_BUILDING_ATLAS_IMAGE,
  INDUSTRY_BUILDING_ATLAS_KEY,
  INDUSTRY_BUILDING_TIER2_ATLAS_IMAGE,
  INDUSTRY_BUILDING_TIER2_ATLAS_KEY,
  INDUSTRY_BUILDING_TIER3_ATLAS_IMAGE,
  INDUSTRY_BUILDING_TIER3_ATLAS_KEY,
  LOGISTICS_FLEET_BUILDING_ATLAS_DATA,
  LOGISTICS_FLEET_BUILDING_ATLAS_IMAGE,
  LOGISTICS_FLEET_BUILDING_ATLAS_KEY,
  LOGISTICS_FLEET_BUILDING_TIER2_ATLAS_IMAGE,
  LOGISTICS_FLEET_BUILDING_TIER2_ATLAS_KEY,
  LOGISTICS_FLEET_BUILDING_TIER3_ATLAS_IMAGE,
  LOGISTICS_FLEET_BUILDING_TIER3_ATLAS_KEY,
  LIVELIHOOD_SERVICE_BUILDING_ATLAS_DATA,
  LIVELIHOOD_SERVICE_BUILDING_ATLAS_IMAGE,
  LIVELIHOOD_SERVICE_BUILDING_ATLAS_KEY,
  LIVELIHOOD_SERVICE_BUILDING_TIER2_ATLAS_IMAGE,
  LIVELIHOOD_SERVICE_BUILDING_TIER2_ATLAS_KEY,
  LIVELIHOOD_SERVICE_BUILDING_TIER3_ATLAS_IMAGE,
  LIVELIHOOD_SERVICE_BUILDING_TIER3_ATLAS_KEY,
  SOCIETY_BUILDING_ATLAS_DATA,
  SOCIETY_BUILDING_ATLAS_IMAGE,
  SOCIETY_BUILDING_ATLAS_KEY,
  SOCIETY_BUILDING_TIER2_ATLAS_IMAGE,
  SOCIETY_BUILDING_TIER2_ATLAS_KEY,
  SOCIETY_BUILDING_TIER3_ATLAS_IMAGE,
  SOCIETY_BUILDING_TIER3_ATLAS_KEY,
  buildingAtlasKey,
  buildingAtlasKeyForLevel,
  buildingAtlasKeysForBuildings,
  buildingAtlasKeysForIds,
  coreBuildingDisplayHeight
} from './settlementArt';

const TEXTURED_BUILDINGS = [
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
  'coastal-battery',
  'quarry',
  'iron-mine',
  'copper-mine',
  'farm',
  'smelter',
  'forge',
  'mill',
  'bakery',
  'distillery',
  'bunkhouse',
  'barracks',
  'skilled-house',
  'officer-quarters',
  'tavern',
  'infirmary',
  'powder-magazine',
  'captains-lodge',
  'expedition-office',
  'local-storage',
  'distribution-depot',
  'dock-warehouse',
  'cargo-lift',
  'zipline-post',
  'bridge',
  'stairs',
  'ramp',
  'cliff-platform',
  'dry-dock',
  'supply-depot',
  'cannon-foundry',
  'hunter-hut',
  'cookhouse',
  'weaver',
  'powder-workshop',
  'ammunition-workshop',
  'gambling-den',
  'bathhouse',
  'bounty-board',
  'arena',
  'festival-square',
  'training-yard',
  'fort-wall',
  'guard-post',
  'signal-tower',
  'pirate-council',
  'intelligence-network'
] as const;

describe('settlement building art', () => {
  it('covers all 58 settlement building types with unique atlas and frame pairs', () => {
    const frames = TEXTURED_BUILDINGS.map((id) => {
      const art = CORE_BUILDING_ART[id];
      return art ? `${buildingAtlasKey(art)}:${art.frame}` : undefined;
    });

    expect(frames.every(Boolean)).toBe(true);
    expect(new Set(frames).size).toBe(TEXTURED_BUILDINGS.length);
    expect(TEXTURED_BUILDINGS).toHaveLength(58);
    expect([...TEXTURED_BUILDINGS].sort()).toEqual(Object.keys(BUILDINGS).sort());
  });

  it('provides valid gameplay display dimensions and public atlas URLs', () => {
    for (const id of TEXTURED_BUILDINGS) {
      const art = CORE_BUILDING_ART[id];
      expect(art).toBeDefined();
      expect(art!.displayWidth).toBeGreaterThanOrEqual(100);
      expect(coreBuildingDisplayHeight(art!)).toBeGreaterThan(80);
    }

    expect(CORE_BUILDING_ATLAS_IMAGE).toMatch(/^\/art\/settlement\/.*\.png$/);
    expect(CORE_BUILDING_ATLAS_DATA).toMatch(/^\/art\/settlement\/.*\.json$/);
    expect(CORE_BUILDING_TIER2_ATLAS_IMAGE).toMatch(/^\/art\/settlement\/.*\.png$/);
    expect(CORE_BUILDING_TIER3_ATLAS_IMAGE).toMatch(/^\/art\/settlement\/.*\.png$/);
    expect(INDUSTRY_BUILDING_ATLAS_IMAGE).toMatch(/^\/art\/settlement\/.*\.png$/);
    expect(INDUSTRY_BUILDING_ATLAS_DATA).toMatch(/^\/art\/settlement\/.*\.json$/);
    expect(INDUSTRY_BUILDING_TIER2_ATLAS_IMAGE).toMatch(/^\/art\/settlement\/.*\.png$/);
    expect(INDUSTRY_BUILDING_TIER3_ATLAS_IMAGE).toMatch(/^\/art\/settlement\/.*\.png$/);
    expect(SOCIETY_BUILDING_ATLAS_IMAGE).toMatch(/^\/art\/settlement\/.*\.png$/);
    expect(SOCIETY_BUILDING_ATLAS_DATA).toMatch(/^\/art\/settlement\/.*\.json$/);
    expect(SOCIETY_BUILDING_TIER2_ATLAS_IMAGE).toMatch(/^\/art\/settlement\/.*\.png$/);
    expect(SOCIETY_BUILDING_TIER3_ATLAS_IMAGE).toMatch(/^\/art\/settlement\/.*\.png$/);
    expect(LOGISTICS_FLEET_BUILDING_ATLAS_IMAGE).toMatch(/^\/art\/settlement\/.*\.png$/);
    expect(LOGISTICS_FLEET_BUILDING_ATLAS_DATA).toMatch(/^\/art\/settlement\/.*\.json$/);
    expect(LOGISTICS_FLEET_BUILDING_TIER2_ATLAS_IMAGE).toMatch(/^\/art\/settlement\/.*\.png$/);
    expect(LOGISTICS_FLEET_BUILDING_TIER3_ATLAS_IMAGE).toMatch(/^\/art\/settlement\/.*\.png$/);
    expect(LIVELIHOOD_SERVICE_BUILDING_ATLAS_IMAGE).toMatch(/^\/art\/settlement\/.*\.png$/);
    expect(LIVELIHOOD_SERVICE_BUILDING_ATLAS_DATA).toMatch(/^\/art\/settlement\/.*\.json$/);
    expect(LIVELIHOOD_SERVICE_BUILDING_TIER2_ATLAS_IMAGE).toMatch(/^\/art\/settlement\/.*\.png$/);
    expect(LIVELIHOOD_SERVICE_BUILDING_TIER3_ATLAS_IMAGE).toMatch(/^\/art\/settlement\/.*\.png$/);
    expect(CIVIC_DEFENSE_BUILDING_ATLAS_IMAGE).toMatch(/^\/art\/settlement\/.*\.png$/);
    expect(CIVIC_DEFENSE_BUILDING_ATLAS_DATA).toMatch(/^\/art\/settlement\/.*\.json$/);
    expect(CIVIC_DEFENSE_BUILDING_TIER2_ATLAS_IMAGE).toMatch(/^\/art\/settlement\/.*\.png$/);
    expect(CIVIC_DEFENSE_BUILDING_TIER3_ATLAS_IMAGE).toMatch(/^\/art\/settlement\/.*\.png$/);
  });

  it('routes each building set to its dedicated atlas', () => {
    const atlasCounts = TEXTURED_BUILDINGS.reduce<Record<string, number>>((counts, id) => {
      const art = CORE_BUILDING_ART[id]!;
      const key = buildingAtlasKey(art);
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {});

    expect(atlasCounts).toEqual({
      [CORE_BUILDING_ATLAS_KEY]: 12,
      [INDUSTRY_BUILDING_ATLAS_KEY]: 9,
      [SOCIETY_BUILDING_ATLAS_KEY]: 9,
      [LOGISTICS_FLEET_BUILDING_ATLAS_KEY]: 12,
      [LIVELIHOOD_SERVICE_BUILDING_ATLAS_KEY]: 8,
      [CIVIC_DEFENSE_BUILDING_ATLAS_KEY]: 8
    });
  });

  it('selects only the core atlas at a fresh settlement and adds atlases on demand', () => {
    expect(buildingAtlasKeysForIds(['wreckage', 'campfire', 'tent'])).toEqual([
      CORE_BUILDING_ATLAS_KEY
    ]);
    expect(
      buildingAtlasKeysForIds([
        'wreckage',
        'quarry',
        'tavern',
        'local-storage',
        'hunter-hut',
        'signal-tower'
      ])
    ).toEqual([
      CORE_BUILDING_ATLAS_KEY,
      INDUSTRY_BUILDING_ATLAS_KEY,
      SOCIETY_BUILDING_ATLAS_KEY,
      LOGISTICS_FLEET_BUILDING_ATLAS_KEY,
      LIVELIHOOD_SERVICE_BUILDING_ATLAS_KEY,
      CIVIC_DEFENSE_BUILDING_ATLAS_KEY
    ]);
    expect(Object.keys(BUILDING_ATLAS_SOURCES)).toHaveLength(18);
    expect(Object.keys(BUILDING_TIER_ATLAS_KEYS)).toEqual([
      CORE_BUILDING_ATLAS_KEY,
      INDUSTRY_BUILDING_ATLAS_KEY,
      SOCIETY_BUILDING_ATLAS_KEY,
      LOGISTICS_FLEET_BUILDING_ATLAS_KEY,
      LIVELIHOOD_SERVICE_BUILDING_ATLAS_KEY,
      CIVIC_DEFENSE_BUILDING_ATLAS_KEY
    ]);
    for (const source of Object.values(BUILDING_ATLAS_SOURCES)) {
      expect(source.image).toMatch(/^\/art\/settlement\/.*\.png$/);
      expect(source.data).toMatch(/^\/art\/settlement\/.*\.json$/);
    }
  });

  it('selects dedicated tier art for every upgradeable building family', () => {
    const shipyard = CORE_BUILDING_ART.shipyard!;
    const quarry = CORE_BUILDING_ART.quarry!;
    const tavern = CORE_BUILDING_ART.tavern!;
    const localStorage = CORE_BUILDING_ART['local-storage']!;
    const hunterHut = CORE_BUILDING_ART['hunter-hut']!;
    const signalTower = CORE_BUILDING_ART['signal-tower']!;

    expect(buildingAtlasKeyForLevel(shipyard, 1)).toBe(CORE_BUILDING_ATLAS_KEY);
    expect(buildingAtlasKeyForLevel(shipyard, 2)).toBe(CORE_BUILDING_TIER2_ATLAS_KEY);
    expect(buildingAtlasKeyForLevel(shipyard, 3)).toBe(CORE_BUILDING_TIER3_ATLAS_KEY);
    expect(buildingAtlasKeyForLevel(shipyard, 7)).toBe(CORE_BUILDING_TIER3_ATLAS_KEY);
    expect(buildingAtlasKeyForLevel(quarry, 1)).toBe(INDUSTRY_BUILDING_ATLAS_KEY);
    expect(buildingAtlasKeyForLevel(quarry, 2)).toBe(INDUSTRY_BUILDING_TIER2_ATLAS_KEY);
    expect(buildingAtlasKeyForLevel(quarry, 3)).toBe(INDUSTRY_BUILDING_TIER3_ATLAS_KEY);
    expect(buildingAtlasKeyForLevel(quarry, 7)).toBe(INDUSTRY_BUILDING_TIER3_ATLAS_KEY);
    expect(buildingAtlasKeyForLevel(tavern, 1)).toBe(SOCIETY_BUILDING_ATLAS_KEY);
    expect(buildingAtlasKeyForLevel(tavern, 2)).toBe(SOCIETY_BUILDING_TIER2_ATLAS_KEY);
    expect(buildingAtlasKeyForLevel(tavern, 3)).toBe(SOCIETY_BUILDING_TIER3_ATLAS_KEY);
    expect(buildingAtlasKeyForLevel(tavern, 7)).toBe(SOCIETY_BUILDING_TIER3_ATLAS_KEY);
    expect(buildingAtlasKeyForLevel(localStorage, 1)).toBe(LOGISTICS_FLEET_BUILDING_ATLAS_KEY);
    expect(buildingAtlasKeyForLevel(localStorage, 2)).toBe(
      LOGISTICS_FLEET_BUILDING_TIER2_ATLAS_KEY
    );
    expect(buildingAtlasKeyForLevel(localStorage, 3)).toBe(
      LOGISTICS_FLEET_BUILDING_TIER3_ATLAS_KEY
    );
    expect(buildingAtlasKeyForLevel(localStorage, 7)).toBe(
      LOGISTICS_FLEET_BUILDING_TIER3_ATLAS_KEY
    );
    expect(buildingAtlasKeyForLevel(hunterHut, 1)).toBe(LIVELIHOOD_SERVICE_BUILDING_ATLAS_KEY);
    expect(buildingAtlasKeyForLevel(hunterHut, 2)).toBe(
      LIVELIHOOD_SERVICE_BUILDING_TIER2_ATLAS_KEY
    );
    expect(buildingAtlasKeyForLevel(hunterHut, 3)).toBe(
      LIVELIHOOD_SERVICE_BUILDING_TIER3_ATLAS_KEY
    );
    expect(buildingAtlasKeyForLevel(hunterHut, 7)).toBe(
      LIVELIHOOD_SERVICE_BUILDING_TIER3_ATLAS_KEY
    );
    expect(buildingAtlasKeyForLevel(signalTower, 1)).toBe(CIVIC_DEFENSE_BUILDING_ATLAS_KEY);
    expect(buildingAtlasKeyForLevel(signalTower, 2)).toBe(CIVIC_DEFENSE_BUILDING_TIER2_ATLAS_KEY);
    expect(buildingAtlasKeyForLevel(signalTower, 3)).toBe(CIVIC_DEFENSE_BUILDING_TIER3_ATLAS_KEY);
    expect(buildingAtlasKeyForLevel(signalTower, 7)).toBe(CIVIC_DEFENSE_BUILDING_TIER3_ATLAS_KEY);

    expect(
      buildingAtlasKeysForBuildings([
        { definitionId: 'wreckage', level: 1 },
        { definitionId: 'campfire', level: 2 },
        { definitionId: 'tent', level: 3 },
        { definitionId: 'quarry', level: 3 },
        { definitionId: 'tavern', level: 2 },
        { definitionId: 'local-storage', level: 3 },
        { definitionId: 'hunter-hut', level: 2 },
        { definitionId: 'signal-tower', level: 3 }
      ])
    ).toEqual([
      CORE_BUILDING_ATLAS_KEY,
      CORE_BUILDING_TIER2_ATLAS_KEY,
      CORE_BUILDING_TIER3_ATLAS_KEY,
      INDUSTRY_BUILDING_ATLAS_KEY,
      INDUSTRY_BUILDING_TIER3_ATLAS_KEY,
      SOCIETY_BUILDING_ATLAS_KEY,
      SOCIETY_BUILDING_TIER2_ATLAS_KEY,
      LOGISTICS_FLEET_BUILDING_ATLAS_KEY,
      LOGISTICS_FLEET_BUILDING_TIER3_ATLAS_KEY,
      LIVELIHOOD_SERVICE_BUILDING_ATLAS_KEY,
      LIVELIHOOD_SERVICE_BUILDING_TIER2_ATLAS_KEY,
      CIVIC_DEFENSE_BUILDING_ATLAS_KEY,
      CIVIC_DEFENSE_BUILDING_TIER3_ATLAS_KEY
    ]);
    expect(
      buildingAtlasKeysForBuildings([
        { definitionId: 'quarry', level: 2 },
        { definitionId: 'smelter', level: 3 },
        { definitionId: 'bunkhouse', level: 2 },
        { definitionId: 'captains-lodge', level: 3 },
        { definitionId: 'local-storage', level: 2 },
        { definitionId: 'dry-dock', level: 3 },
        { definitionId: 'cookhouse', level: 2 },
        { definitionId: 'bathhouse', level: 3 },
        { definitionId: 'arena', level: 2 },
        { definitionId: 'pirate-council', level: 3 }
      ])
    ).toEqual([
      CORE_BUILDING_ATLAS_KEY,
      INDUSTRY_BUILDING_ATLAS_KEY,
      INDUSTRY_BUILDING_TIER2_ATLAS_KEY,
      INDUSTRY_BUILDING_TIER3_ATLAS_KEY,
      SOCIETY_BUILDING_ATLAS_KEY,
      SOCIETY_BUILDING_TIER2_ATLAS_KEY,
      SOCIETY_BUILDING_TIER3_ATLAS_KEY,
      LOGISTICS_FLEET_BUILDING_ATLAS_KEY,
      LOGISTICS_FLEET_BUILDING_TIER2_ATLAS_KEY,
      LOGISTICS_FLEET_BUILDING_TIER3_ATLAS_KEY,
      LIVELIHOOD_SERVICE_BUILDING_ATLAS_KEY,
      LIVELIHOOD_SERVICE_BUILDING_TIER2_ATLAS_KEY,
      LIVELIHOOD_SERVICE_BUILDING_TIER3_ATLAS_KEY,
      CIVIC_DEFENSE_BUILDING_ATLAS_KEY,
      CIVIC_DEFENSE_BUILDING_TIER2_ATLAS_KEY,
      CIVIC_DEFENSE_BUILDING_TIER3_ATLAS_KEY
    ]);
  });
});
