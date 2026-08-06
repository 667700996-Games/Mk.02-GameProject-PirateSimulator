import { describe, expect, it } from 'vitest';
import {
  CORE_BUILDING_ART,
  CORE_BUILDING_ATLAS_DATA,
  CORE_BUILDING_ATLAS_IMAGE,
  CORE_BUILDING_ATLAS_KEY,
  INDUSTRY_BUILDING_ATLAS_DATA,
  INDUSTRY_BUILDING_ATLAS_IMAGE,
  INDUSTRY_BUILDING_ATLAS_KEY,
  SOCIETY_BUILDING_ATLAS_DATA,
  SOCIETY_BUILDING_ATLAS_IMAGE,
  SOCIETY_BUILDING_ATLAS_KEY,
  buildingAtlasKey,
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
  'expedition-office'
] as const;

describe('settlement building art', () => {
  it('covers 30 settlement buildings with unique atlas and frame pairs', () => {
    const frames = TEXTURED_BUILDINGS.map((id) => {
      const art = CORE_BUILDING_ART[id];
      return art ? `${buildingAtlasKey(art)}:${art.frame}` : undefined;
    });

    expect(frames.every(Boolean)).toBe(true);
    expect(new Set(frames).size).toBe(TEXTURED_BUILDINGS.length);
    expect(TEXTURED_BUILDINGS).toHaveLength(30);
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
    expect(INDUSTRY_BUILDING_ATLAS_IMAGE).toMatch(/^\/art\/settlement\/.*\.png$/);
    expect(INDUSTRY_BUILDING_ATLAS_DATA).toMatch(/^\/art\/settlement\/.*\.json$/);
    expect(SOCIETY_BUILDING_ATLAS_IMAGE).toMatch(/^\/art\/settlement\/.*\.png$/);
    expect(SOCIETY_BUILDING_ATLAS_DATA).toMatch(/^\/art\/settlement\/.*\.json$/);
  });

  it('routes the core, industry and society building sets to their own atlases', () => {
    const atlasCounts = TEXTURED_BUILDINGS.reduce<Record<string, number>>((counts, id) => {
      const art = CORE_BUILDING_ART[id]!;
      const key = buildingAtlasKey(art);
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {});

    expect(atlasCounts).toEqual({
      [CORE_BUILDING_ATLAS_KEY]: 12,
      [INDUSTRY_BUILDING_ATLAS_KEY]: 9,
      [SOCIETY_BUILDING_ATLAS_KEY]: 9
    });
  });
});
