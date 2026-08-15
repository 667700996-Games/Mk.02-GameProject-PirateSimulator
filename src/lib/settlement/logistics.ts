import { createId } from '$lib/domain/rng';
import type { CaptainTrait } from '$lib/domain/types';
import { BUILDINGS, RECIPES } from './catalog';
import { buildingConstructionCost, buildingUpgradeCost } from './construction';
import { SHIP_PLANS } from './shipbuilding';
import { buildingCells, findCachedPath, pathTravelCost } from './island';
import type {
  PartialSettlementInventory,
  Resident,
  SettlementBuilding,
  SettlementResourceId,
  SettlementSimulationState,
  TransportJob
} from './types';

function amount(inventory: PartialSettlementInventory, resource: SettlementResourceId): number {
  return inventory[resource] ?? 0;
}

function deployedCrewIds(state: SettlementSimulationState): Set<string> {
  return new Set(
    state.expeditions
      .filter((expedition) => !['COMPLETED', 'LOST'].includes(expedition.state))
      .flatMap((expedition) => expedition.crewIds)
  );
}

function route(
  state: SettlementSimulationState,
  start: { x: number; y: number },
  goal: { x: number; y: number }
): { x: number; y: number }[] {
  const result = findCachedPath(state.island, start, goal, state.buildings);
  if (result.hit) state.statistics.cacheHits += 1;
  else state.statistics.cacheMisses += 1;
  return result.path;
}

function incomingAmount(
  state: SettlementSimulationState,
  targetId: string,
  resourceId: SettlementResourceId
): number {
  return state.transports
    .filter(
      (job) =>
        job.targetBuildingId === targetId &&
        job.resourceId === resourceId &&
        !['COMPLETED', 'CANCELLED'].includes(job.state)
    )
    .reduce((sum, job) => sum + job.amount, 0);
}

function findSource(
  state: SettlementSimulationState,
  resourceId: SettlementResourceId,
  target: SettlementBuilding
): { source: SettlementBuilding; available: number } | undefined {
  return state.buildings
    .filter((building) => building.state !== 'DESTROYED')
    .map((source) => ({
      source,
      available:
        amount(source.outputInventory, resourceId) - amount(source.reservedInventory, resourceId)
    }))
    .filter((candidate) => candidate.available > 0)
    .sort(
      (a, b) =>
        Math.hypot(a.source.x - target.x, a.source.y - target.y) -
        Math.hypot(b.source.x - target.x, b.source.y - target.y)
    )[0];
}

function requestResource(
  state: SettlementSimulationState,
  target: SettlementBuilding,
  resourceId: SettlementResourceId,
  requested: number,
  priority: number
): void {
  let remaining = requested - incomingAmount(state, target.id, resourceId);
  while (remaining > 0) {
    const candidate = findSource(state, resourceId, target);
    if (!candidate) break;
    const transfer = Math.min(6, remaining, candidate.available);
    const path = route(
      state,
      { x: candidate.source.x, y: candidate.source.y },
      { x: target.x, y: target.y }
    );
    if (path.length === 0) break;
    candidate.source.reservedInventory[resourceId] =
      amount(candidate.source.reservedInventory, resourceId) + transfer;
    state.transports.push({
      id: createId('transport'),
      resourceId,
      amount: transfer,
      sourceBuildingId: candidate.source.id,
      targetBuildingId: target.id,
      state: 'WAITING',
      priority,
      path,
      progress: 0,
      createdAt: state.simulationMinutes
    });
    remaining -= transfer;
  }
}

export function scheduleLogistics(
  state: SettlementSimulationState,
  copyState = true,
  trait?: CaptainTrait
): SettlementSimulationState {
  const next = copyState ? structuredClone(state) : state;
  const targets = [...next.buildings].sort(
    (a, b) => b.constructionPriority - a.constructionPriority
  );
  for (const building of targets) {
    const definition = BUILDINGS[building.definitionId];
    if (!definition || building.paused || building.state === 'DESTROYED') continue;
    if (building.state === 'DAMAGED') {
      requestResource(
        next,
        building,
        'planks',
        Math.max(0, 3 - amount(building.inputInventory, 'planks')),
        86
      );
      requestResource(
        next,
        building,
        'stone-blocks',
        Math.max(0, 2 - amount(building.inputInventory, 'stone-blocks')),
        82
      );
    }
    if (!['ACTIVE', 'DAMAGED', 'BURNING'].includes(building.state)) {
      if (building.constructionMaterialsCommitted || building.upgradeMaterialsCommitted) continue;
      const constructionCost =
        building.state === 'UPGRADING' || building.pausedFrom === 'UPGRADING'
          ? buildingUpgradeCost(building.definitionId, building.level, trait)
          : buildingConstructionCost(building.definitionId, trait);
      for (const [resourceId, required] of Object.entries(constructionCost) as [
        SettlementResourceId,
        number
      ][]) {
        const missing = Math.max(0, required - amount(building.inputInventory, resourceId));
        if (missing > 0)
          requestResource(
            next,
            building,
            resourceId,
            missing,
            80 + building.constructionPriority * 4
          );
      }
      continue;
    }
    const recipe = building.recipeId ? RECIPES[building.recipeId] : undefined;
    if (recipe) {
      for (const [resourceId, required] of Object.entries(recipe.inputs) as [
        SettlementResourceId,
        number
      ][]) {
        const desired = required * 3;
        const missing = Math.max(0, desired - amount(building.inputInventory, resourceId));
        if (missing > 0) requestResource(next, building, resourceId, missing, 55);
      }
    }
    if (definition.housing) {
      const occupants = next.residents.filter((resident) => resident.homeId === building.id);
      const capacity = Math.max(
        occupants.length,
        Object.values(definition.housing).reduce((sum, value) => sum + (value ?? 0), 0)
      );
      requestResource(
        next,
        building,
        'water',
        Math.max(0, Math.ceil(capacity * 0.5) - amount(building.inputInventory, 'water')),
        72
      );
      const foodStored =
        amount(building.inputInventory, 'hardtack') + amount(building.inputInventory, 'fish-stew');
      if (foodStored < capacity * 0.4) {
        const preferred = findSource(next, 'fish-stew', building) ? 'fish-stew' : 'hardtack';
        requestResource(next, building, preferred, Math.ceil(capacity * 0.5 - foodStored), 70);
      }
      if (occupants.some((resident) => ['laborer', 'skilled'].includes(resident.tier))) {
        requestResource(
          next,
          building,
          'clothes',
          Math.max(
            0,
            Math.ceil(occupants.length * 0.15) - amount(building.inputInventory, 'clothes')
          ),
          58
        );
        requestResource(
          next,
          building,
          'boots',
          Math.max(
            0,
            Math.ceil(occupants.length * 0.08) - amount(building.inputInventory, 'boots')
          ),
          48
        );
      }
      if (occupants.some((resident) => resident.tier === 'skilled'))
        requestResource(
          next,
          building,
          'tools',
          Math.max(0, 2 - amount(building.inputInventory, 'tools')),
          52
        );
      if (occupants.some((resident) => resident.tier === 'pirate'))
        requestResource(
          next,
          building,
          'cutlasses',
          Math.max(0, 2 - amount(building.inputInventory, 'cutlasses')),
          58
        );
      if (occupants.some((resident) => resident.tier === 'elite'))
        requestResource(
          next,
          building,
          'pistols',
          Math.max(0, 2 - amount(building.inputInventory, 'pistols')),
          62
        );
      if (occupants.some((resident) => resident.tier === 'officer'))
        requestResource(
          next,
          building,
          'officer-pistols',
          Math.max(0, 1 - amount(building.inputInventory, 'officer-pistols')),
          66
        );
    }
    if (['tavern', 'gambling-den', 'festival-square'].includes(building.definitionId)) {
      requestResource(
        next,
        building,
        'rum',
        Math.max(0, 8 - amount(building.inputInventory, 'rum')),
        64
      );
      if (building.definitionId === 'tavern')
        requestResource(
          next,
          building,
          'beer',
          Math.max(0, 4 - amount(building.inputInventory, 'beer')),
          45
        );
    }
    if (building.definitionId === 'infirmary')
      requestResource(
        next,
        building,
        'medicine',
        Math.max(0, 8 - amount(building.inputInventory, 'medicine')),
        82
      );
    if (building.definitionId === 'bathhouse')
      requestResource(
        next,
        building,
        'water',
        Math.max(0, 14 - amount(building.inputInventory, 'water')),
        68
      );
    if (building.definitionId === 'powder-magazine') {
      requestResource(
        next,
        building,
        'powder',
        Math.max(0, 30 - amount(building.inputInventory, 'powder')),
        76
      );
      requestResource(
        next,
        building,
        'powder-kegs',
        Math.max(0, 8 - amount(building.inputInventory, 'powder-kegs')),
        74
      );
    }
    if (building.definitionId === 'coastal-battery') {
      requestResource(
        next,
        building,
        'cannonballs',
        Math.max(0, 20 - amount(building.inputInventory, 'cannonballs')),
        95
      );
      requestResource(
        next,
        building,
        'powder',
        Math.max(0, 10 - amount(building.inputInventory, 'powder')),
        95
      );
    }
  }

  for (const order of next.shipConstruction.filter(
    (item) => !['COMPLETE', 'PAUSED'].includes(item.state)
  )) {
    const shipyard = next.buildings.find((building) => building.id === order.shipyardId);
    const plan = SHIP_PLANS[order.shipClass];
    if (!shipyard || !plan) continue;
    for (const [resourceId, required] of Object.entries(plan.cost) as [
      SettlementResourceId,
      number
    ][]) {
      const missing = Math.max(0, required - amount(shipyard.inputInventory, resourceId));
      if (missing > 0) requestResource(next, shipyard, resourceId, missing, 88);
    }
  }

  const expeditionOffice = next.buildings.find(
    (building) => building.definitionId === 'expedition-office' && building.state === 'ACTIVE'
  );
  if (expeditionOffice) {
    for (const expedition of next.expeditions.filter((item) => item.state === 'PREPARING')) {
      for (const [resourceId, required] of Object.entries(expedition.supplies) as [
        SettlementResourceId,
        number
      ][]) {
        const missing = Math.max(0, required - amount(expeditionOffice.inputInventory, resourceId));
        if (missing > 0) requestResource(next, expeditionOffice, resourceId, missing, 92);
      }
    }
  }

  const warehouses = next.buildings.filter(
    (building) =>
      building.state === 'ACTIVE' &&
      ['warehouse', 'local-storage', 'dock-warehouse', 'distribution-depot'].includes(
        building.definitionId
      )
  );
  if (warehouses.length > 0) {
    for (const source of next.buildings) {
      const sourceDefinition = BUILDINGS[source.definitionId];
      if (
        !sourceDefinition ||
        sourceDefinition.category === 'logistics' ||
        source.state !== 'ACTIVE'
      )
        continue;
      for (const [resourceId, stored] of Object.entries(source.outputInventory) as [
        SettlementResourceId,
        number
      ][]) {
        const available = stored - amount(source.reservedInventory, resourceId);
        if (available <= 10) continue;
        const target = warehouses.sort(
          (a, b) =>
            Math.hypot(a.x - source.x, a.y - source.y) - Math.hypot(b.x - source.x, b.y - source.y)
        )[0];
        requestResource(next, target, resourceId, Math.min(available - 6, 12), 25);
      }
    }
  }
  return assignWaitingHaulers(next);
}

function assignWaitingHaulers(state: SettlementSimulationState): SettlementSimulationState {
  const busy = new Set(state.transports.map((job) => job.haulerId).filter(Boolean));
  const deployed = deployedCrewIds(state);
  const available = state.residents.filter(
    (resident) => resident.job === 'hauler' && !busy.has(resident.id) && !deployed.has(resident.id)
  );
  for (const job of state.transports
    .filter((item) => item.state === 'WAITING')
    .sort((a, b) => b.priority - a.priority)) {
    const source = state.buildings.find((building) => building.id === job.sourceBuildingId);
    if (!source || available.length === 0) break;
    available.sort(
      (a, b) =>
        Math.hypot(a.position.x - source.x, a.position.y - source.y) -
        Math.hypot(b.position.x - source.x, b.position.y - source.y)
    );
    const hauler = available.shift();
    if (!hauler) break;
    job.haulerId = hauler.id;
    job.state = 'PICKING_UP';
    job.path = route(state, hauler.position, { x: source.x, y: source.y });
    job.progress = 0;
    hauler.action = 'HAULING';
    hauler.path = job.path;
    hauler.pathProgress = 0;
  }
  return state;
}

function releaseJob(state: SettlementSimulationState, job: TransportJob): void {
  const hauler = state.residents.find((resident) => resident.id === job.haulerId);
  if (hauler?.action === 'HAULING') {
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

function trafficLoad(transports: TransportJob[]): Map<string, number> {
  const load = new Map<string, number>();
  for (const job of transports.filter((item) =>
    ['PICKING_UP', 'DELIVERING'].includes(item.state)
  )) {
    for (const point of job.path) {
      const key = `${point.x},${point.y}`;
      load.set(key, (load.get(key) ?? 0) + 1);
    }
  }
  return load;
}

function routeCapacity(buildings: SettlementBuilding[], x: number, y: number): number {
  const infrastructure = buildings.find(
    (building) =>
      building.state === 'ACTIVE' &&
      ['bridge', 'stairs', 'ramp', 'cargo-lift', 'cliff-platform'].includes(
        building.definitionId
      ) &&
      buildingCells(building).some((cell) => cell.x === x && cell.y === y)
  );
  if (!infrastructure) return 2;
  if (['bridge', 'cargo-lift'].includes(infrastructure.definitionId)) return 1;
  return 3;
}

export function transportCongestionMultiplier(
  job: TransportJob,
  load: Map<string, number>,
  buildings: SettlementBuilding[]
): number {
  if (job.path.length === 0) return 1;
  let totalRatio = 0;
  let peakRatio = 1;
  for (const point of job.path) {
    const ratio =
      (load.get(`${point.x},${point.y}`) ?? 1) / routeCapacity(buildings, point.x, point.y);
    totalRatio += ratio;
    peakRatio = Math.max(peakRatio, ratio);
  }
  const averageRatio = totalRatio / job.path.length;
  return Math.min(
    2.75,
    1 + Math.max(0, averageRatio - 1) * 0.28 + Math.max(0, peakRatio - 1) * 0.18
  );
}

function weatherTravelMultiplier(state: SettlementSimulationState): number {
  if (state.weather === 'storm') return 1.38;
  if (state.weather === 'rain') return 1.16;
  if (state.weather === 'fog') return 1.08;
  return 1;
}

export function advanceTransports(
  state: SettlementSimulationState,
  gameMinutes: number,
  copyState = true
): SettlementSimulationState {
  const next = copyState ? structuredClone(state) : state;
  const load = trafficLoad(next.transports);
  const deployed = deployedCrewIds(next);
  for (const job of next.transports.filter((item) =>
    ['PICKING_UP', 'DELIVERING'].includes(item.state)
  )) {
    const resident = next.residents.find((person) => person.id === job.haulerId);
    const source = next.buildings.find((building) => building.id === job.sourceBuildingId);
    const target = next.buildings.find((building) => building.id === job.targetBuildingId);
    if (!resident || !source || !target) {
      job.state = 'CANCELLED';
      if (source)
        source.reservedInventory[job.resourceId] = Math.max(
          0,
          amount(source.reservedInventory, job.resourceId) - job.amount
        );
      releaseJob(next, job);
      continue;
    }
    if (deployed.has(resident.id)) {
      source.reservedInventory[job.resourceId] = Math.max(
        0,
        amount(source.reservedInventory, job.resourceId) - job.amount
      );
      job.state = 'CANCELLED';
      continue;
    }
    const logisticsBonus = next.progression.unlocked.includes('prosperity-logistics') ? 1.1 : 1;
    const congestion = transportCongestionMultiplier(job, load, next.buildings);
    const duration = Math.max(
      1.2,
      (pathTravelCost(next.island, job.path, next.buildings) *
        1.15 *
        congestion *
        weatherTravelMultiplier(next)) /
        logisticsBonus
    );
    job.progress = Math.min(1, job.progress + gameMinutes / duration);
    updateResidentAlongPath(resident, job);
    if (job.progress < 1) continue;
    if (job.state === 'PICKING_UP') {
      const available = amount(source.outputInventory, job.resourceId);
      if (available < job.amount) {
        source.reservedInventory[job.resourceId] = Math.max(
          0,
          amount(source.reservedInventory, job.resourceId) - job.amount
        );
        job.state = 'CANCELLED';
        releaseJob(next, job);
        continue;
      }
      source.outputInventory[job.resourceId] = available - job.amount;
      source.reservedInventory[job.resourceId] = Math.max(
        0,
        amount(source.reservedInventory, job.resourceId) - job.amount
      );
      job.state = 'DELIVERING';
      job.progress = 0;
      job.path = route(next, { x: source.x, y: source.y }, { x: target.x, y: target.y });
      resident.path = job.path;
    } else {
      const targetDefinition = BUILDINGS[target.definitionId];
      const inventory =
        targetDefinition?.category === 'logistics' ? target.outputInventory : target.inputInventory;
      inventory[job.resourceId] = amount(inventory, job.resourceId) + job.amount;
      next.statistics.delivered[job.resourceId] =
        amount(next.statistics.delivered, job.resourceId) + job.amount;
      job.state = 'COMPLETED';
      releaseJob(next, job);
    }
  }
  next.transports = next.transports.filter(
    (job) =>
      !['COMPLETED', 'CANCELLED'].includes(job.state) || next.simulationMinutes - job.createdAt < 30
  );
  return assignWaitingHaulers(next);
}
