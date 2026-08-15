import { createId } from '$lib/domain/rng';
import type { CaptainTrait } from '$lib/domain/types';
import { BUILDINGS } from './catalog';
import { validatePlacement } from './island';
import type { BuildingState, PartialSettlementInventory, SettlementBuilding, SettlementBuildingId, SettlementResourceId, SettlementSimulationState } from './types';

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

/** Resources that are not already committed to a building input or a transport job. */
export function availableSettlementInventory(state: SettlementSimulationState): PartialSettlementInventory {
  const total: PartialSettlementInventory = { ...state.looseInventory };
  for (const building of state.buildings) {
    for (const [id, stored] of Object.entries(building.outputInventory) as [SettlementResourceId, number][]) {
      const available = Math.max(0, stored - (building.reservedInventory[id] ?? 0));
      total[id] = (total[id] ?? 0) + available;
    }
  }
  return total;
}

export function hasSettlementResources(state: SettlementSimulationState, cost: PartialSettlementInventory): boolean {
  const total = availableSettlementInventory(state);
  return (Object.entries(cost) as [SettlementResourceId, number][]).every(([id, amount]) => (total[id] ?? 0) >= amount);
}

export function creditSettlementResources(
  state: SettlementSimulationState,
  resources: PartialSettlementInventory
): SettlementSimulationState {
  const next = structuredClone(state);
  const store = next.buildings.find((building) => building.definitionId === 'warehouse' && building.state === 'ACTIVE')
    ?? next.buildings.find((building) => building.definitionId === 'dock-warehouse' && building.state === 'ACTIVE')
    ?? next.buildings.find((building) => building.definitionId === 'wreckage');
  const inventory = store?.outputInventory ?? next.looseInventory;
  for (const [resource, value] of Object.entries(resources) as [SettlementResourceId, number][]) {
    if (!Number.isFinite(value) || value <= 0) continue;
    inventory[resource] = (inventory[resource] ?? 0) + value;
  }
  return next;
}

function applyArchitectDiscount(
  cost: PartialSettlementInventory,
  trait?: CaptainTrait
): PartialSettlementInventory {
  const factor = trait === 'architect' ? 0.88 : 1;
  return Object.fromEntries(
    (Object.entries(cost) as [SettlementResourceId, number][]).map(([resource, value]) => [
      resource,
      Math.max(1, Math.ceil(value * factor))
    ])
  ) as PartialSettlementInventory;
}

export function buildingConstructionCost(
  definitionId: SettlementBuildingId,
  trait?: CaptainTrait
): PartialSettlementInventory {
  const definition = BUILDINGS[definitionId];
  return definition ? applyArchitectDiscount(definition.constructionCost, trait) : {};
}

export function buildingUpgradeCost(
  definitionId: SettlementBuildingId,
  currentLevel: number,
  trait?: CaptainTrait
): PartialSettlementInventory {
  const definition = BUILDINGS[definitionId];
  if (!definition) return {};
  const factor = 0.45 + currentLevel * 0.2;
  return applyArchitectDiscount(Object.fromEntries(
    (Object.entries(definition.constructionCost) as [SettlementResourceId, number][]).map(([resource, value]) => [resource, Math.max(1, Math.ceil(value * factor))])
  ) as PartialSettlementInventory, trait);
}

export function buildingMaxLevel(definitionId: SettlementBuildingId): number {
  return ['shipyard', 'dry-dock', 'coastal-battery', 'captains-lodge', 'pirate-council'].includes(definitionId) ? 7 : 3;
}

export function spendSettlementResources(state: SettlementSimulationState, cost: PartialSettlementInventory): SettlementSimulationState | undefined {
  if (!hasSettlementResources(state, cost)) return undefined;
  const next = structuredClone(state);
  for (const [resource, required] of Object.entries(cost) as [SettlementResourceId, number][]) {
    let remaining = required;
    const loose = next.looseInventory[resource] ?? 0;
    const looseSpent = Math.min(loose, remaining);
    next.looseInventory[resource] = loose - looseSpent;
    remaining -= looseSpent;
    const stores = next.buildings.filter((building) => building.state === 'ACTIVE' || building.definitionId === 'wreckage');
    for (const building of stores) {
      if (remaining <= 0) break;
      const stored = building.outputInventory[resource] ?? 0;
      const reserved = building.reservedInventory[resource] ?? 0;
      const available = Math.max(0, stored - reserved);
      const spent = Math.min(available, remaining);
      building.outputInventory[resource] = stored - spent;
      remaining -= spent;
    }
  }
  return next;
}

export function placeBuilding(
  state: SettlementSimulationState,
  definitionId: SettlementBuildingId,
  x: number,
  y: number,
  rotation: 0 | 1 | 2 | 3,
  now = Date.now(),
  trait?: CaptainTrait
): BuildCommandResult {
  const definition = BUILDINGS[definitionId];
  if (!definition) return { state, ok: false, reason: '아직 사용할 수 없는 설계입니다.' };
  if (definition.unlock && !state.progression.unlocked.includes(definition.unlock)) return { state, ok: false, reason: '발전 항목을 먼저 해금해야 합니다.' };
  const placement = validatePlacement(state.island, state.buildings, definitionId, x, y, rotation);
  if (!placement.valid) return { state, ok: false, reason: placement.reason };
  if (!hasSettlementResources(state, buildingConstructionCost(definitionId, trait))) return { state, ok: false, reason: '정착지 재고가 부족합니다.' };
  const newBuilding: SettlementBuilding = {
    id: createId('building'), definitionId, x, y, rotation, level: 1, state: 'PLANNED', constructionProgress: 0, constructionPriority: 3,
    workers: [], inputInventory: {}, outputInventory: {}, reservedInventory: {}, recipeId: definition.recipes[0], recipeProgress: 0,
    condition: 100, fire: 0, paused: false, constructionMaterialsCommitted: false, createdAt: now, statusReason: '건설 자재 운송 대기'
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
      ? building.paused
        ? { ...building, paused: false, state: building.pausedFrom ?? (building.constructionProgress >= 1 ? 'ACTIVE' : 'PLANNED'), pausedFrom: undefined, statusReason: undefined }
        : { ...building, paused: true, pausedFrom: building.state, state: 'PAUSED', statusReason: '선장 명령으로 일시정지' }
      : building)
  };
}

export function setBuildingPriority(state: SettlementSimulationState, id: string, priority: 1 | 2 | 3 | 4 | 5): SettlementSimulationState {
  return { ...state, buildings: state.buildings.map((building) => building.id === id ? { ...building, constructionPriority: priority } : building) };
}

export function setBuildingRecipe(state: SettlementSimulationState, id: string, recipeId?: string): SettlementSimulationState {
  const building = state.buildings.find((item) => item.id === id);
  const definition = building ? BUILDINGS[building.definitionId] : undefined;
  if (!building || (recipeId && !definition?.recipes.includes(recipeId))) return state;
  return { ...state, buildings: state.buildings.map((item) => item.id === id ? { ...item, recipeId, recipeProgress: 0, statusReason: recipeId ? '새 생산법 준비' : '생산 중단' } : item) };
}

export function beginBuildingUpgrade(state: SettlementSimulationState, id: string): BuildCommandResult {
  const next = structuredClone(state);
  const building = next.buildings.find((item) => item.id === id);
  if (!building) return { state, ok: false, reason: '건물을 찾을 수 없습니다.' };
  if (building.definitionId === 'wreckage' || building.level >= buildingMaxLevel(building.definitionId)) return { state, ok: false, reason: '더 이상 확장할 수 없는 시설입니다.' };
  if (building.state !== 'ACTIVE' || building.paused) return { state, ok: false, reason: '정상 가동 중인 시설만 업그레이드할 수 있습니다.' };
  for (const residentId of building.workers) {
    const resident = next.residents.find((person) => person.id === residentId);
    if (resident) { resident.workplaceId = undefined; resident.action = 'IDLE'; }
  }
  building.workers = [];
  building.state = 'UPGRADING';
  building.constructionProgress = 0;
  building.upgradeMaterialsCommitted = false;
  building.statusReason = `${building.level + 1}단계 확장 자재 운송 대기`;
  return { state: next, ok: true, buildingId: id };
}

function releaseTransportReservations(state: SettlementSimulationState, buildingId: string): void {
  for (const job of state.transports.filter((item) => item.targetBuildingId === buildingId && !['COMPLETED', 'CANCELLED'].includes(item.state))) {
    const source = state.buildings.find((item) => item.id === job.sourceBuildingId);
    if (source) source.reservedInventory[job.resourceId] = Math.max(0, (source.reservedInventory[job.resourceId] ?? 0) - job.amount);
    const hauler = state.residents.find((resident) => resident.id === job.haulerId);
    if (hauler) { hauler.action = 'IDLE'; hauler.path = []; hauler.pathProgress = 0; }
    job.state = 'CANCELLED';
  }
}

export function cancelBuildingWork(
  state: SettlementSimulationState,
  id: string,
  trait?: CaptainTrait
): BuildCommandResult {
  const building = state.buildings.find((item) => item.id === id);
  if (!building || building.definitionId === 'wreckage') return { state, ok: false, reason: '취소할 공사를 찾을 수 없습니다.' };
  const effectiveState: BuildingState | undefined = building.state === 'PAUSED'
    ? building.pausedFrom
    : building.state === 'BLOCKED' && building.upgradeMaterialsCommitted ? 'UPGRADING'
    : building.state;
  if (!effectiveState || !['PLANNED', 'CONSTRUCTING', 'UPGRADING', 'BLOCKED'].includes(effectiveState)) return { state, ok: false, reason: '진행 중인 공사가 아닙니다.' };
  const next = structuredClone(state);
  const target = next.buildings.find((item) => item.id === id)!;
  releaseTransportReservations(next, id);
  for (const [resource, value] of Object.entries(target.inputInventory) as [SettlementResourceId, number][]) next.looseInventory[resource] = (next.looseInventory[resource] ?? 0) + value;
  if (effectiveState === 'UPGRADING') {
    if (target.upgradeMaterialsCommitted) {
      for (const [resource, value] of Object.entries(buildingUpgradeCost(target.definitionId, target.level, trait)) as [SettlementResourceId, number][]) next.looseInventory[resource] = (next.looseInventory[resource] ?? 0) + Math.floor(value * 0.6);
    }
    target.inputInventory = {};
    target.state = 'ACTIVE';
    target.paused = false;
    target.pausedFrom = undefined;
    target.constructionProgress = 1;
    target.upgradeMaterialsCommitted = false;
    target.statusReason = undefined;
  } else {
    if (effectiveState === 'CONSTRUCTING') {
      for (const [resource, value] of Object.entries(buildingConstructionCost(target.definitionId, trait)) as [SettlementResourceId, number][]) next.looseInventory[resource] = (next.looseInventory[resource] ?? 0) + Math.floor(value * 0.6);
    }
    next.buildings = next.buildings.filter((item) => item.id !== id);
  }
  return { state: next, ok: true, buildingId: id };
}

export function demolishBuilding(
  state: SettlementSimulationState,
  id: string,
  trait?: CaptainTrait
): SettlementSimulationState {
  const building = state.buildings.find((item) => item.id === id);
  if (!building || building.definitionId === 'wreckage') return state;
  const salvage = { ...state.looseInventory };
  for (const [resource, amount] of Object.entries(buildingConstructionCost(building.definitionId, trait)) as [SettlementResourceId, number][]) salvage[resource] = (salvage[resource] ?? 0) + Math.floor(amount * 0.4 * Math.max(0.25, building.condition / 100));
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
