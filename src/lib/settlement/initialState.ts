import { createId, mulberry32 } from '$lib/domain/rng';
import { BUILDINGS, SETTLEMENT_RESOURCE_IDS } from './catalog';
import type {
  IslandMapState,
  IslandTile,
  JobId,
  PopulationTier,
  Resident,
  SettlementBuilding,
  SettlementBuildingId,
  SettlementInventory,
  SettlementSimulationState,
  TerrainType,
  WorkforceRule
} from './types';

const FIRST_NAMES = ['마라', '엘리', '토마스', '나디아', '핀', '아마라', '로완', '이네스', '바스코', '사비', '메이', '칼로', '오린', '셀라', '브램', '키라', '루카', '네브'];
const LAST_NAMES = ['벨', '해로', '모로', '베인', '퀼', '드레이크', '리드', '블랙', '코브', '솔트', '크로우', '플린'];

export function emptySettlementInventory(): SettlementInventory {
  return Object.fromEntries(SETTLEMENT_RESOURCE_IDS.map((id) => [id, 0])) as SettlementInventory;
}

function hash(seed: number, x: number, y: number): number {
  let value = (seed ^ Math.imul(x + 31, 374761393) ^ Math.imul(y + 17, 668265263)) >>> 0;
  value = Math.imul(value ^ (value >>> 13), 1274126177) >>> 0;
  return ((value ^ (value >>> 16)) >>> 0) / 4_294_967_295;
}

export function createIslandMap(seed: number, width = 24, height = 18): IslandMapState {
  const tiles: IslandTile[] = [];
  const centerX = (width - 1) / 2;
  const centerY = (height - 1) / 2;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const nx = (x - centerX) / (width * 0.47);
      const ny = (y - centerY) / (height * 0.5);
      const distance = Math.sqrt(nx * nx + ny * ny);
      const noise = (hash(seed, x, y) - 0.5) * 0.13;
      const coastDistance = distance + noise;
      let terrain: TerrainType = 'deep-water';
      let elevation = 0;
      if (coastDistance < 1.08) terrain = 'reef';
      if (coastDistance < 0.98) terrain = 'beach';
      if (coastDistance < 0.88) terrain = 'coast';
      if (coastDistance < 0.78) terrain = 'plain';
      if (coastDistance < 0.58) {
        elevation = Math.min(4, Math.max(1, Math.floor((0.66 - coastDistance) * 11) + (y < height * 0.44 ? 1 : 0)));
        terrain = elevation >= 4 ? 'highland' : elevation >= 2 ? 'slope' : 'plain';
      }
      if (coastDistance < 0.72 && hash(seed + 19, x, y) > 0.66 && elevation < 3) terrain = 'forest';
      if (coastDistance < 0.6 && hash(seed + 37, x, y) > 0.91) terrain = 'stone-deposit';
      if (coastDistance < 0.52 && hash(seed + 71, x, y) > 0.94) terrain = 'iron-vein';
      if (coastDistance < 0.5 && hash(seed + 101, x, y) > 0.965) terrain = 'copper-vein';
      if (elevation >= 3 && y > 4 && y < 9 && hash(seed + 83, x, y) > 0.72) terrain = 'cliff';
      if (coastDistance < 0.64 && hash(seed + 113, x, y) > 0.965) terrain = 'ravine';
      const resourceRemaining = ['forest', 'stone-deposit', 'iron-vein', 'copper-vein'].includes(terrain) ? 140 + Math.floor(hash(seed + 149, x, y) * 180) : undefined;
      tiles.push({ x, y, terrain, elevation, discovered: distance < 0.9, fertility: terrain === 'plain' ? 60 + Math.floor(hash(seed + 7, x, y) * 35) : 0, resourceRemaining });
    }
  }

  const set = (x: number, y: number, terrain: TerrainType, elevation = 0): void => {
    tiles[y * width + x] = { x, y, terrain, elevation, discovered: true, fertility: terrain === 'plain' ? 82 : 0, resourceRemaining: terrain === 'forest' ? 260 : undefined };
  };
  for (let y = 11; y <= 13; y += 1) for (let x = 7; x <= 14; x += 1) set(x, y, 'plain', 1);
  for (let y = 14; y <= 16; y += 1) for (let x = 9; x <= 15; x += 1) set(x, y, y === 16 ? 'beach' : 'coast', 0);
  for (let y = 8; y <= 11; y += 1) for (let x = 4; x <= 7; x += 1) set(x, y, 'forest', 1);
  set(17, 8, 'stone-deposit', 2);
  set(18, 8, 'stone-deposit', 2);
  set(15, 5, 'iron-vein', 3);
  set(16, 5, 'iron-vein', 3);
  for (let x = 8; x <= 13; x += 1) set(x, 6, 'cliff', 3);
  for (let x = 8; x <= 13; x += 1) set(x, 5, 'highland', 4);
  return { seed, width, height, tiles };
}

function building(definitionId: SettlementBuildingId, x: number, y: number, now: number, state: SettlementBuilding['state'] = 'ACTIVE'): SettlementBuilding {
  const definition = BUILDINGS[definitionId];
  if (!definition) throw new Error(`정의되지 않은 건물: ${definitionId}`);
  return {
    id: createId('building'), definitionId, x, y, rotation: 0, level: 1, state,
    constructionProgress: state === 'ACTIVE' ? 1 : 0, constructionPriority: 3, workers: [], inputInventory: {}, outputInventory: {}, reservedInventory: {},
    recipeId: definition.recipes[0], recipeProgress: 0, condition: 100, fire: 0, paused: false, createdAt: now
  };
}

function resident(index: number, seed: number, now: number, position: { x: number; y: number }, tier: PopulationTier = 'castaway'): Resident {
  const random = mulberry32(seed + index * 97);
  const name = `${FIRST_NAMES[Math.floor(random() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(random() * LAST_NAMES.length)]}`;
  return {
    id: createId('resident'), name, tier, job: index < 4 ? 'builder' : index < 8 ? 'hauler' : 'unassigned',
    health: 72 + Math.floor(random() * 22), morale: 56 + Math.floor(random() * 18), loyalty: 48 + Math.floor(random() * 20), fatigue: 18 + Math.floor(random() * 18), experience: Math.floor(random() * 12),
    needs: { water: 72, food: 68, housing: 54, clothing: 36, health: 65, leisure: 42, pirateCulture: 24, equipment: 22 },
    equipment: {}, position: { x: position.x + (index % 3) * 0.25, y: position.y + (index % 2) * 0.2 }, path: [], pathProgress: 0,
    action: index < 8 ? 'WORKING' : 'IDLE', actionUntil: now
  };
}

function workforceRules(): WorkforceRule[] {
  const jobs: JobId[] = ['builder', 'hauler', 'logger', 'fisher', 'miner', 'farmer', 'cook', 'laborer', 'shipwright', 'guard', 'gunner'];
  return jobs.map((job, index) => ({ job, priority: job === 'builder' || job === 'hauler' ? 5 : 3, minimum: job === 'builder' || job === 'hauler' ? 2 : 0, maximum: index < 2 ? 8 : 6, autoAssign: true, preferSkilled: job !== 'hauler' }));
}

export function createInitialSettlement(seed: number, now = Date.now()): SettlementSimulationState {
  const wreckage = building('wreckage', 11, 14, now);
  wreckage.outputInventory = { logs: 24, stone: 12, fiber: 18, water: 20, hardtack: 16, tools: 6, rope: 5, cloth: 4 };
  const campfire = building('campfire', 10, 12, now);
  const tents = [building('tent', 8, 12, now), building('tent', 9, 12, now), building('tent', 8, 13, now), building('tent', 9, 13, now)];
  const residents = Array.from({ length: 16 }, (_, index) => resident(index, seed, now, { x: 10, y: 12 }, index < 12 ? 'castaway' : 'laborer'));
  tents.forEach((tent, tentIndex) => {
    residents.slice(tentIndex * 4, tentIndex * 4 + 4).forEach((person) => { person.homeId = tent.id; });
  });
  return {
    schemaVersion: 1,
    simulationMinutes: 7 * 60,
    speed: 1,
    lastTickAt: now,
    island: createIslandMap(seed),
    buildings: [wreckage, campfire, ...tents],
    residents,
    transports: [],
    workforce: workforceRules(),
    looseInventory: { gold: 180 },
    shipConstruction: [],
    expeditions: [],
    progression: { points: { infamy: 0, prosperity: 0, seamanship: 0, federation: 0 }, unlocked: [] },
    policies: { active: { loot: 'equal-shares', labor: 'free-labor', food: 'equal-rations', prisoners: 'ransom', diplomacy: 'smuggler-favor' } },
    threat: { active: false, source: 'red-tide', discovered: false, strength: 0, etaHours: 0, fleetDescription: '' },
    warnings: [],
    overlay: 'none',
    statistics: { produced: {}, consumed: {}, delivered: {}, lost: {}, completedBuildings: 0, cacheHits: 0, cacheMisses: 0 },
    tutorialStep: 0,
    weather: 'clear'
  };
}
