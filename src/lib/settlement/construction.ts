import { createId } from '$lib/domain/rng';
import { BUILDINGS } from './catalog';
import { validatePlacement } from './island';
import type { PartialSettlementInventory, SettlementBuilding, SettlementBuildingId, SettlementResourceId, SettlementSimulationState } from './types';

export interface BuildCommandResult {
  state: SettlementSimulationState;
  ok: boolean;
  reason?: string;
  buildingId?: string;
}

export function aggregateInventory(state: SettlementSimulationState): PartialSettlementInventory {
  const total: PartialSettlementInventory = { ...state.looseInventory };
  for (const building of state.buildings) {
    for (const inventory of [building.inputInventory, building.outputInventory]) {
      for (const [id, amount] of Object.entries(inventory) as [SettlementResourceId, number][]) total[id] = (total[id] ?? 0) + amount;
    }
  }
  return total;
}

export function hasSettlementResources(state: SettlementSimulationState, cost: PartialSettlementInventory): boolean {
  const total = aggregateInventory(state);
  return (Object.entries(cost) as [SettlementResourceId, number][]).every(([id, amount]) => (total[id] ?? 0) >= amount);
}

export function placeBuilding(
  state: SettlementSimulationState,
  definitionId: SettlementBuildingId,
  x: number,
  y: number,
  rotation: 0 | 1 | 2 | 3,
  now = Date.now()
): BuildCommandResult {
  const definition = BUILDINGS[definitionId];
  if (!definition) return { state, ok: false, reason: '아직 사용할 수 없는 설계입니다.' };
  if (definition.unlock && !state.progression.unlocked.includes(definition.unlock)) return { state, ok: false, reason: '발전 항목을 먼저 해금해야 합니다.' };
  const placement = validatePlacement(state.island, state.buildings, definitionId, x, y, rotation);
  if (!placement.valid) return { state, ok: false, reason: placement.reason };
  if (!hasSettlementResources(state, definition.constructionCost)) return { state, ok: false, reason: '정착지 재고가 부족합니다.' };
  const newBuilding: SettlementBuilding = {
    id: createId('building'), definitionId, x, y, rotation, level: 1, state: 'PLANNED', constructionProgress: 0, constructionPriority: 3,
    workers: [], inputInventory: {}, outputInventory: {}, reservedInventory: {}, recipeId: definition.recipes[0], recipeProgress: 0,
    condition: 100, fire: 0, paused: false, createdAt: now, statusReason: '건설 자재 운송 대기'
  };
  return { state: { ...state, buildings: [...state.buildings, newBuilding] }, ok: true, buildingId: newBuilding.id };
}

export function rotateBuilding(state: SettlementSimulationState, id: string): BuildCommandResult {
  const building = state.buildings.find((item) => item.id === id);
  if (!building) return { state, ok: false, reason: '건물을 찾을 수 없습니다.' };
  if (!['PLANNED', 'PAUSED'].includes(building.state)) return { state, ok: false, reason: '계획 또는 정지 상태에서만 회전할 수 있습니다.' };
  const rotation = ((building.rotation + 1) % 4) as 0 | 1 | 2 | 3;
  const validation = validatePlacement(state.island, state.buildings, building.definitionId, building.x, building.y, rotation, id);
  if (!validation.valid) return { state, ok: false, reason: validation.reason };
  return { state: { ...state, buildings: state.buildings.map((item) => item.id === id ? { ...item, rotation } : item) }, ok: true, buildingId: id };
}

export function moveBuilding(state: SettlementSimulationState, id: string, x: number, y: number): BuildCommandResult {
  const building = state.buildings.find((item) => item.id === id);
  if (!building) return { state, ok: false, reason: '건물을 찾을 수 없습니다.' };
  if (!['PLANNED', 'PAUSED'].includes(building.state)) return { state, ok: false, reason: '가동 중인 건물은 먼저 일시정지해야 합니다.' };
  const validation = validatePlacement(state.island, state.buildings, building.definitionId, x, y, building.rotation, id);
  if (!validation.valid) return { state, ok: false, reason: validation.reason };
  return { state: { ...state, buildings: state.buildings.map((item) => item.id === id ? { ...item, x, y } : item) }, ok: true, buildingId: id };
}

export function toggleBuildingPause(state: SettlementSimulationState, id: string): SettlementSimulationState {
  return {
    ...state,
    buildings: state.buildings.map((building) => building.id === id
      ? { ...building, paused: !building.paused, state: !building.paused ? 'PAUSED' : building.constructionProgress >= 1 ? 'ACTIVE' : 'PLANNED', statusReason: !building.paused ? '선장 명령으로 일시정지' : undefined }
      : building)
  };
}

export function demolishBuilding(state: SettlementSimulationState, id: string): SettlementSimulationState {
  const building = state.buildings.find((item) => item.id === id);
  if (!building || building.definitionId === 'wreckage') return state;
  const definition = BUILDINGS[building.definitionId];
  const salvage = { ...state.looseInventory };
  if (definition) for (const [resource, amount] of Object.entries(definition.constructionCost) as [SettlementResourceId, number][]) salvage[resource] = (salvage[resource] ?? 0) + Math.floor(amount * 0.4 * Math.max(0.25, building.condition / 100));
  const residentIds = new Set(building.workers);
  return {
    ...state,
    looseInventory: salvage,
    buildings: state.buildings.filter((item) => item.id !== id),
    residents: state.residents.map((resident) => ({
      ...resident,
      workplaceId: resident.workplaceId === id ? undefined : resident.workplaceId,
      homeId: resident.homeId === id ? undefined : resident.homeId,
      job: residentIds.has(resident.id) ? 'unassigned' : resident.job
    })),
    transports: state.transports.filter((job) => job.sourceBuildingId !== id && job.targetBuildingId !== id)
  };
}
