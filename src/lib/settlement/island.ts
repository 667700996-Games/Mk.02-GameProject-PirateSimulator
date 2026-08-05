import { BUILDINGS } from './catalog';
import type { GridPoint, IslandMapState, IslandTile, SettlementBuilding, SettlementBuildingId, TerrainType } from './types';

const BLOCKED_TERRAIN: TerrainType[] = ['deep-water', 'reef', 'cliff', 'ravine'];

export function tileAt(island: IslandMapState, x: number, y: number): IslandTile | undefined {
  if (x < 0 || y < 0 || x >= island.width || y >= island.height) return undefined;
  return island.tiles[y * island.width + x];
}

export function rotatedFootprint(definitionId: SettlementBuildingId, rotation: 0 | 1 | 2 | 3): [number, number] {
  const footprint = BUILDINGS[definitionId]?.footprint ?? [1, 1];
  return rotation % 2 === 0 ? footprint : [footprint[1], footprint[0]];
}

export function buildingCells(building: Pick<SettlementBuilding, 'definitionId' | 'x' | 'y' | 'rotation'>): GridPoint[] {
  const [width, height] = rotatedFootprint(building.definitionId, building.rotation);
  const cells: GridPoint[] = [];
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) cells.push({ x: building.x + x, y: building.y + y });
  return cells;
}

export function occupiedCells(buildings: SettlementBuilding[], excludedId?: string): Set<string> {
  const cells = new Set<string>();
  for (const building of buildings) {
    if (building.id === excludedId || building.state === 'DESTROYED') continue;
    for (const cell of buildingCells(building)) cells.add(`${cell.x},${cell.y}`);
  }
  return cells;
}

export interface PlacementValidation {
  valid: boolean;
  reason?: string;
  cells: GridPoint[];
  elevationBonus: number;
}

export function validatePlacement(
  island: IslandMapState,
  buildings: SettlementBuilding[],
  definitionId: SettlementBuildingId,
  x: number,
  y: number,
  rotation: 0 | 1 | 2 | 3,
  excludedId?: string
): PlacementValidation {
  const definition = BUILDINGS[definitionId];
  if (!definition) return { valid: false, reason: '아직 해독되지 않은 건축 설계입니다.', cells: [], elevationBonus: 0 };
  const preview = { definitionId, x, y, rotation };
  const cells = buildingCells(preview);
  const occupied = occupiedCells(buildings, excludedId);
  const elevations: number[] = [];
  for (const cell of cells) {
    const tile = tileAt(island, cell.x, cell.y);
    if (!tile) return { valid: false, reason: '섬의 경계를 벗어났습니다.', cells, elevationBonus: 0 };
    if (!tile.discovered) return { valid: false, reason: '먼저 이 구역을 탐사해야 합니다.', cells, elevationBonus: 0 };
    if (!definition.terrainRules.includes(tile.terrain)) return { valid: false, reason: `${tile.terrain} 지형에는 건설할 수 없습니다.`, cells, elevationBonus: 0 };
    if (definition.minElevation !== undefined && tile.elevation < definition.minElevation) return { valid: false, reason: `고도 ${definition.minElevation} 이상이 필요합니다.`, cells, elevationBonus: 0 };
    if (definition.maxElevation !== undefined && tile.elevation > definition.maxElevation) return { valid: false, reason: `고도 ${definition.maxElevation} 이하만 가능합니다.`, cells, elevationBonus: 0 };
    if (occupied.has(`${cell.x},${cell.y}`)) return { valid: false, reason: '다른 건물 또는 구조물과 겹칩니다.', cells, elevationBonus: 0 };
    elevations.push(tile.elevation);
  }
  const elevationDifference = Math.max(...elevations) - Math.min(...elevations);
  if (elevationDifference > 1 && definition.category !== 'infrastructure') return { valid: false, reason: '지면 고저차가 너무 큽니다.', cells, elevationBonus: 0 };
  const elevationBonus = elevations.reduce((sum, value) => sum + value, 0) / Math.max(1, elevations.length);
  return { valid: true, cells, elevationBonus };
}

function movementCost(tile: IslandTile): number {
  if (BLOCKED_TERRAIN.includes(tile.terrain)) return Infinity;
  if (tile.terrain === 'wetland') return 3;
  if (tile.terrain === 'slope') return 2.1;
  if (tile.terrain === 'forest') return 1.55;
  if (tile.terrain === 'beach') return 1.25;
  return 1;
}

const PATH_INFRASTRUCTURE: SettlementBuildingId[] = ['bridge', 'stairs', 'ramp', 'cargo-lift', 'cliff-platform'];
const pathCache = new Map<string, GridPoint[]>();

function infrastructureAt(buildings: SettlementBuilding[], x: number, y: number): SettlementBuilding | undefined {
  return buildings.find((building) => building.state === 'ACTIVE' && PATH_INFRASTRUCTURE.includes(building.definitionId) && buildingCells(building).some((cell) => cell.x === x && cell.y === y));
}

function infrastructureSignature(buildings: SettlementBuilding[]): string {
  return buildings.filter((building) => building.state === 'ACTIVE' && PATH_INFRASTRUCTURE.includes(building.definitionId)).map((building) => `${building.definitionId}:${building.x}:${building.y}:${building.rotation}`).sort().join('|');
}

export function findPath(island: IslandMapState, start: GridPoint, goal: GridPoint, buildings: SettlementBuilding[] = []): GridPoint[] {
  const startX = Math.round(start.x);
  const startY = Math.round(start.y);
  const goalX = Math.round(goal.x);
  const goalY = Math.round(goal.y);
  const startTile = tileAt(island, startX, startY);
  const goalTile = tileAt(island, goalX, goalY);
  if (!startTile || !goalTile) return [];
  const key = (x: number, y: number) => `${x},${y}`;
  const frontier: { x: number; y: number; score: number }[] = [{ x: startX, y: startY, score: 0 }];
  const cameFrom = new Map<string, string>();
  const costs = new Map<string, number>([[key(startX, startY), 0]]);
  const pointByKey = new Map<string, GridPoint>([[key(startX, startY), { x: startX, y: startY }]]);
  while (frontier.length > 0) {
    frontier.sort((a, b) => a.score - b.score);
    const current = frontier.shift();
    if (!current) break;
    if (current.x === goalX && current.y === goalY) break;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      const tile = tileAt(island, nx, ny);
      if (!tile) continue;
      const infrastructure = infrastructureAt(buildings, nx, ny);
      let step = movementCost(tile);
      if (!Number.isFinite(step) && !infrastructure && !(nx === goalX && ny === goalY)) continue;
      if (!Number.isFinite(step)) step = 2;
      if (infrastructure) step = infrastructure.definitionId === 'cargo-lift' ? 0.45 : infrastructure.definitionId === 'bridge' ? 0.65 : 0.8;
      const currentTile = tileAt(island, current.x, current.y);
      const elevationPenalty = infrastructure && ['stairs', 'ramp', 'cargo-lift'].includes(infrastructure.definitionId) ? 0.12 : 0.7;
      step += Math.abs(tile.elevation - (currentTile?.elevation ?? tile.elevation)) * elevationPenalty;
      const nextCost = (costs.get(key(current.x, current.y)) ?? 0) + step;
      const nextKey = key(nx, ny);
      if (nextCost >= (costs.get(nextKey) ?? Infinity)) continue;
      costs.set(nextKey, nextCost);
      cameFrom.set(nextKey, key(current.x, current.y));
      pointByKey.set(nextKey, { x: nx, y: ny });
      frontier.push({ x: nx, y: ny, score: nextCost + Math.abs(goalX - nx) + Math.abs(goalY - ny) });
    }
  }
  const goalKey = key(goalX, goalY);
  if (!costs.has(goalKey)) return [];
  const path: GridPoint[] = [];
  let cursor = goalKey;
  while (cursor !== key(startX, startY)) {
    const point = pointByKey.get(cursor);
    if (!point) return [];
    path.push(point);
    const previous = cameFrom.get(cursor);
    if (!previous) return [];
    cursor = previous;
  }
  path.push({ x: startX, y: startY });
  return path.reverse();
}

export function findCachedPath(island: IslandMapState, start: GridPoint, goal: GridPoint, buildings: SettlementBuilding[] = []): { path: GridPoint[]; hit: boolean } {
  const key = `${island.seed}:${Math.round(start.x)},${Math.round(start.y)}>${Math.round(goal.x)},${Math.round(goal.y)}:${infrastructureSignature(buildings)}`;
  const cached = pathCache.get(key);
  if (cached) {
    pathCache.delete(key);
    pathCache.set(key, cached);
    return { path: cached.map((point) => ({ ...point })), hit: true };
  }
  const path = findPath(island, start, goal, buildings);
  if (pathCache.size >= 500) pathCache.delete(pathCache.keys().next().value ?? '');
  pathCache.set(key, path.map((point) => ({ ...point })));
  return { path, hit: false };
}

export function pathDistance(path: GridPoint[]): number {
  if (path.length < 2) return 0;
  let distance = 0;
  for (let index = 1; index < path.length; index += 1) distance += Math.hypot(path[index].x - path[index - 1].x, path[index].y - path[index - 1].y);
  return distance;
}
