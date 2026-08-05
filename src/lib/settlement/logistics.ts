import { createId } from '$lib/domain/rng';
import { BUILDINGS, RECIPES } from './catalog';
import { findPath, pathDistance } from './island';
import type { PartialSettlementInventory, Resident, SettlementBuilding, SettlementResourceId, SettlementSimulationState, TransportJob } from './types';

function amount(inventory: PartialSettlementInventory, resource: SettlementResourceId): number {
  return inventory[resource] ?? 0;
}

function incomingAmount(state: SettlementSimulationState, targetId: string, resourceId: SettlementResourceId): number {
  return state.transports
    .filter((job) => job.targetBuildingId === targetId && job.resourceId === resourceId && !['COMPLETED', 'CANCELLED'].includes(job.state))
    .reduce((sum, job) => sum + job.amount, 0);
}

function findSource(state: SettlementSimulationState, resourceId: SettlementResourceId, target: SettlementBuilding): { source: SettlementBuilding; available: number } | undefined {
  return state.buildings
    .filter((building) => building.id !== target.id && building.state !== 'DESTROYED')
    .map((source) => ({ source, available: amount(source.outputInventory, resourceId) - amount(source.reservedInventory, resourceId) }))
    .filter((candidate) => candidate.available > 0)
    .sort((a, b) => Math.hypot(a.source.x - target.x, a.source.y - target.y) - Math.hypot(b.source.x - target.x, b.source.y - target.y))[0];
}

function requestResource(state: SettlementSimulationState, target: SettlementBuilding, resourceId: SettlementResourceId, requested: number, priority: number): void {
  let remaining = requested - incomingAmount(state, target.id, resourceId);
  while (remaining > 0) {
    const candidate = findSource(state, resourceId, target);
    if (!candidate) break;
    const transfer = Math.min(6, remaining, candidate.available);
    const path = findPath(state.island, { x: candidate.source.x, y: candidate.source.y }, { x: target.x, y: target.y });
    if (path.length === 0) break;
    candidate.source.reservedInventory[resourceId] = amount(candidate.source.reservedInventory, resourceId) + transfer;
    state.transports.push({
      id: createId('transport'), resourceId, amount: transfer, sourceBuildingId: candidate.source.id, targetBuildingId: target.id,
      state: 'WAITING', priority, path, progress: 0, createdAt: state.simulationMinutes
    });
    remaining -= transfer;
  }
}

export function scheduleLogistics(state: SettlementSimulationState): SettlementSimulationState {
  const next = structuredClone(state);
  const targets = [...next.buildings].sort((a, b) => b.constructionPriority - a.constructionPriority);
  for (const building of targets) {
    const definition = BUILDINGS[building.definitionId];
    if (!definition || building.paused || building.state === 'DESTROYED') continue;
    if (!['ACTIVE', 'DAMAGED', 'BURNING'].includes(building.state)) {
      for (const [resourceId, required] of Object.entries(definition.constructionCost) as [SettlementResourceId, number][]) {
        const missing = Math.max(0, required - amount(building.inputInventory, resourceId));
        if (missing > 0) requestResource(next, building, resourceId, missing, 80 + building.constructionPriority * 4);
      }
      continue;
    }
    const recipe = building.recipeId ? RECIPES[building.recipeId] : undefined;
    if (recipe) {
      for (const [resourceId, required] of Object.entries(recipe.inputs) as [SettlementResourceId, number][]) {
        const desired = required * 3;
        const missing = Math.max(0, desired - amount(building.inputInventory, resourceId));
        if (missing > 0) requestResource(next, building, resourceId, missing, 55);
      }
    }
    if (definition.housing) {
      const capacity = Object.values(definition.housing).reduce((sum, value) => sum + (value ?? 0), 0);
      requestResource(next, building, 'water', Math.max(0, Math.ceil(capacity * 0.5) - amount(building.inputInventory, 'water')), 72);
      const foodStored = amount(building.inputInventory, 'hardtack') + amount(building.inputInventory, 'fish-stew');
      if (foodStored < capacity * 0.4) {
        const preferred = findSource(next, 'fish-stew', building) ? 'fish-stew' : 'hardtack';
        requestResource(next, building, preferred, Math.ceil(capacity * 0.5 - foodStored), 70);
      }
    }
    if (building.definitionId === 'coastal-battery') {
      requestResource(next, building, 'cannonballs', Math.max(0, 20 - amount(building.inputInventory, 'cannonballs')), 95);
      requestResource(next, building, 'powder', Math.max(0, 10 - amount(building.inputInventory, 'powder')), 95);
    }
  }

  const warehouses = next.buildings.filter((building) => building.state === 'ACTIVE' && ['warehouse', 'local-storage', 'dock-warehouse', 'distribution-depot'].includes(building.definitionId));
  if (warehouses.length > 0) {
    for (const source of next.buildings) {
      const sourceDefinition = BUILDINGS[source.definitionId];
      if (!sourceDefinition || sourceDefinition.category === 'logistics' || source.state !== 'ACTIVE') continue;
      for (const [resourceId, stored] of Object.entries(source.outputInventory) as [SettlementResourceId, number][]) {
        const available = stored - amount(source.reservedInventory, resourceId);
        if (available <= 10) continue;
        const target = warehouses.sort((a, b) => Math.hypot(a.x - source.x, a.y - source.y) - Math.hypot(b.x - source.x, b.y - source.y))[0];
        requestResource(next, target, resourceId, Math.min(available - 6, 12), 25);
      }
    }
  }
  return assignWaitingHaulers(next);
}

function assignWaitingHaulers(state: SettlementSimulationState): SettlementSimulationState {
  const busy = new Set(state.transports.map((job) => job.haulerId).filter(Boolean));
  const available = state.residents.filter((resident) => resident.job === 'hauler' && !busy.has(resident.id));
  for (const job of state.transports.filter((item) => item.state === 'WAITING').sort((a, b) => b.priority - a.priority)) {
    const source = state.buildings.find((building) => building.id === job.sourceBuildingId);
    if (!source || available.length === 0) break;
    available.sort((a, b) => Math.hypot(a.position.x - source.x, a.position.y - source.y) - Math.hypot(b.position.x - source.x, b.position.y - source.y));
    const hauler = available.shift();
    if (!hauler) break;
    job.haulerId = hauler.id;
    job.state = 'PICKING_UP';
    job.path = findPath(state.island, hauler.position, { x: source.x, y: source.y });
    job.progress = 0;
    hauler.action = 'HAULING';
    hauler.path = job.path;
    hauler.pathProgress = 0;
  }
  return state;
}

function releaseJob(state: SettlementSimulationState, job: TransportJob): void {
  const hauler = state.residents.find((resident) => resident.id === job.haulerId);
  if (hauler) {
    hauler.action = 'IDLE';
    hauler.path = [];
    hauler.pathProgress = 0;
  }
}

function updateResidentAlongPath(resident: Resident, job: TransportJob): void {
  if (job.path.length === 0) return;
  const scaled = Math.min(job.path.length - 1, job.progress * (job.path.length - 1));
  const index = Math.floor(scaled);
  const nextIndex = Math.min(job.path.length - 1, index + 1);
  const local = scaled - index;
  resident.position = {
    x: job.path[index].x + (job.path[nextIndex].x - job.path[index].x) * local,
    y: job.path[index].y + (job.path[nextIndex].y - job.path[index].y) * local
  };
  resident.pathProgress = job.progress;
}

export function advanceTransports(state: SettlementSimulationState, gameMinutes: number): SettlementSimulationState {
  const next = structuredClone(state);
  for (const job of next.transports.filter((item) => ['PICKING_UP', 'DELIVERING'].includes(item.state))) {
    const resident = next.residents.find((person) => person.id === job.haulerId);
    const source = next.buildings.find((building) => building.id === job.sourceBuildingId);
    const target = next.buildings.find((building) => building.id === job.targetBuildingId);
    if (!resident || !source || !target) {
      job.state = 'CANCELLED';
      if (source) source.reservedInventory[job.resourceId] = Math.max(0, amount(source.reservedInventory, job.resourceId) - job.amount);
      releaseJob(next, job);
      continue;
    }
    const duration = Math.max(1.2, pathDistance(job.path) * 1.15);
    job.progress = Math.min(1, job.progress + gameMinutes / duration);
    updateResidentAlongPath(resident, job);
    if (job.progress < 1) continue;
    if (job.state === 'PICKING_UP') {
      const available = amount(source.outputInventory, job.resourceId);
      if (available < job.amount) {
        source.reservedInventory[job.resourceId] = Math.max(0, amount(source.reservedInventory, job.resourceId) - job.amount);
        job.state = 'CANCELLED';
        releaseJob(next, job);
        continue;
      }
      source.outputInventory[job.resourceId] = available - job.amount;
      source.reservedInventory[job.resourceId] = Math.max(0, amount(source.reservedInventory, job.resourceId) - job.amount);
      job.state = 'DELIVERING';
      job.progress = 0;
      job.path = findPath(next.island, { x: source.x, y: source.y }, { x: target.x, y: target.y });
      resident.path = job.path;
    } else {
      const targetDefinition = BUILDINGS[target.definitionId];
      const inventory = targetDefinition?.category === 'logistics' ? target.outputInventory : target.inputInventory;
      inventory[job.resourceId] = amount(inventory, job.resourceId) + job.amount;
      next.statistics.delivered[job.resourceId] = amount(next.statistics.delivered, job.resourceId) + job.amount;
      job.state = 'COMPLETED';
      releaseJob(next, job);
    }
  }
  next.transports = next.transports.filter((job) => !['COMPLETED', 'CANCELLED'].includes(job.state) || next.simulationMinutes - job.createdAt < 30);
  return assignWaitingHaulers(next);
}
