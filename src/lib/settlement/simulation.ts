import { BUILDINGS, POPULATION_TIERS, RECIPES } from './catalog';
import { advanceTransports, scheduleLogistics } from './logistics';
import type { JobId, Resident, SettlementBuilding, SettlementResourceId, SettlementSimulationState } from './types';
import { aggregateInventory } from './construction';
import { createId } from '$lib/domain/rng';

function amount(inventory: Partial<Record<SettlementResourceId, number>>, id: SettlementResourceId): number {
  return inventory[id] ?? 0;
}

function requiredWorkers(recipeId?: string): number {
  const recipe = recipeId ? RECIPES[recipeId] : undefined;
  return recipe ? Object.values(recipe.workers).reduce((sum, value) => sum + (value ?? 0), 0) : 0;
}

function autoAssign(state: SettlementSimulationState): void {
  const assigned = new Set(state.buildings.flatMap((building) => building.workers));
  const available = state.residents.filter((resident) => !assigned.has(resident.id) && !['builder', 'hauler'].includes(resident.job));
  const priority = (job?: JobId) => state.workforce.find((rule) => rule.job === job)?.priority ?? 3;
  const buildings = [...state.buildings].sort((a, b) => priority(BUILDINGS[b.definitionId]?.workerJob) - priority(BUILDINGS[a.definitionId]?.workerJob));
  for (const building of buildings) {
    const definition = BUILDINGS[building.definitionId];
    if (!definition?.workerJob || building.state !== 'ACTIVE') continue;
    const rule = state.workforce.find((item) => item.job === definition.workerJob);
    if (rule && !rule.autoAssign) continue;
    building.workers = building.workers.filter((id) => state.residents.some((resident) => resident.id === id));
    const target = Math.min(definition.workerSlots, rule?.maximum ?? definition.workerSlots);
    while (building.workers.length < target) {
      let resident = rule?.preferSkilled ? available.find((person) => person.job === definition.workerJob && ['skilled', 'pirate', 'elite', 'officer'].includes(person.tier)) : undefined;
      resident ??= available.find((person) => person.job === definition.workerJob);
      resident ??= available.find((person) => person.job === 'unassigned');
      if (!resident) break;
      available.splice(available.indexOf(resident), 1);
      resident.job = definition.workerJob;
      resident.workplaceId = building.id;
      resident.action = 'WORKING';
      building.workers.push(resident.id);
    }
  }
}

function hasInputs(building: SettlementBuilding, inputs: Partial<Record<SettlementResourceId, number>>): boolean {
  return (Object.entries(inputs) as [SettlementResourceId, number][]).every(([resource, required]) => amount(building.inputInventory, resource) >= required);
}

function consumeInputs(building: SettlementBuilding, inputs: Partial<Record<SettlementResourceId, number>>): void {
  for (const [resource, required] of Object.entries(inputs) as [SettlementResourceId, number][]) building.inputInventory[resource] = Math.max(0, amount(building.inputInventory, resource) - required);
}

function advanceConstruction(state: SettlementSimulationState, gameMinutes: number): void {
  const builders = state.residents.filter((resident) => resident.job === 'builder' && resident.health > 20);
  const allocatedBuilders = new Set(state.buildings.filter((building) => building.state === 'CONSTRUCTING').flatMap((building) => building.workers));
  for (const building of state.buildings) {
    if (building.paused || ['ACTIVE', 'DESTROYED', 'BURNING'].includes(building.state)) continue;
    const definition = BUILDINGS[building.definitionId];
    if (!definition) continue;
    if (building.state === 'UPGRADING') continue;
    if (building.state !== 'CONSTRUCTING' && !hasInputs(building, definition.constructionCost)) {
      building.state = 'PLANNED';
      building.statusReason = '건설 자재 운송 대기';
      continue;
    }
    if (builders.length === 0) {
      building.state = 'BLOCKED';
      building.statusReason = '건설 노동자 부족';
      continue;
    }
    if (building.state !== 'CONSTRUCTING') {
      consumeInputs(building, definition.constructionCost);
      building.state = 'CONSTRUCTING';
    }
    let assignedBuilders = building.workers.map((id) => builders.find((resident) => resident.id === id)).filter((resident): resident is Resident => !!resident);
    if (assignedBuilders.length === 0) {
      assignedBuilders = builders.filter((resident) => !allocatedBuilders.has(resident.id)).slice(0, Math.max(1, Math.min(4, building.constructionPriority)));
      assignedBuilders.forEach((resident) => allocatedBuilders.add(resident.id));
    }
    if (assignedBuilders.length === 0) {
      building.state = 'CONSTRUCTING';
      building.statusReason = '다른 공사에 건설자가 투입됨';
      continue;
    }
    building.workers = assignedBuilders.map((resident) => resident.id);
    for (const resident of assignedBuilders) {
      resident.action = 'WORKING';
      resident.workplaceId = building.id;
      resident.position.x += (building.x - resident.position.x) * Math.min(1, gameMinutes * 0.1);
      resident.position.y += (building.y - resident.position.y) * Math.min(1, gameMinutes * 0.1);
    }
    building.constructionProgress = Math.min(1, building.constructionProgress + gameMinutes * assignedBuilders.length / Math.max(1, definition.constructionMinutes * 2));
    building.statusReason = `건설 ${Math.floor(building.constructionProgress * 100)}%`;
    if (building.constructionProgress >= 1) {
      building.state = 'ACTIVE';
      building.statusReason = undefined;
      building.workers = [];
      state.statistics.completedBuildings += 1;
      if (definition.category === 'gathering' || definition.category === 'processing' || definition.category === 'logistics') state.progression.points.prosperity += 2;
      if (definition.category === 'housing' || definition.category === 'welfare' || definition.category === 'administration') state.progression.points.federation += 2;
      if (definition.category === 'fleet' || definition.category === 'infrastructure') state.progression.points.seamanship += 2;
      if (definition.category === 'military') state.progression.points.infamy += 2;
      for (const resident of assignedBuilders) {
        resident.workplaceId = undefined;
        resident.action = 'IDLE';
      }
    }
  }
}

function advanceProduction(state: SettlementSimulationState, gameMinutes: number): void {
  for (const building of state.buildings) {
    if (building.state !== 'ACTIVE' || building.paused || !building.recipeId) continue;
    const recipe = RECIPES[building.recipeId];
    if (!recipe) continue;
    const needed = requiredWorkers(recipe.id);
    const healthyWorkers = building.workers.map((id) => state.residents.find((resident) => resident.id === id)).filter((resident): resident is Resident => !!resident && resident.health > 25);
    if (healthyWorkers.length < Math.max(1, Math.ceil(needed * 0.5))) {
      building.statusReason = '작업자 부족';
      continue;
    }
    if (!hasInputs(building, recipe.inputs)) {
      building.statusReason = '입력 자원 운송 대기';
      continue;
    }
    const outputStored = Object.values(building.outputInventory).reduce((sum, value) => sum + (value ?? 0), 0);
    const capacity = BUILDINGS[building.definitionId]?.storage ?? 0;
    if (outputStored >= capacity) {
      building.statusReason = '출력 보관 공간 포화';
      continue;
    }
    const laborPolicy = state.policies.active.labor;
    const policyFactor = laborPolicy === 'forced-quota' ? 1.18 : laborPolicy === 'merit-pay' ? 1.12 : 1;
    const workerEfficiency = healthyWorkers.reduce((sum, worker) => sum + POPULATION_TIERS[worker.tier].productivity * (0.55 + worker.morale / 220) * (1 - worker.fatigue / 180), 0) / Math.max(1, needed) * policyFactor;
    building.recipeProgress += gameMinutes * Math.max(0.25, workerEfficiency) / recipe.durationMinutes;
    building.statusReason = `생산 ${Math.floor(Math.min(1, building.recipeProgress) * 100)}%`;
    if (building.recipeProgress < 1) continue;
    consumeInputs(building, recipe.inputs);
    for (const [resource, output] of Object.entries(recipe.outputs) as [SettlementResourceId, number][]) {
      building.outputInventory[resource] = amount(building.outputInventory, resource) + output;
      state.statistics.produced[resource] = amount(state.statistics.produced, resource) + output;
    }
    building.recipeProgress %= 1;
    building.statusReason = undefined;
    for (const worker of healthyWorkers) {
      worker.experience += 0.25;
      worker.fatigue = Math.min(100, worker.fatigue + 0.25);
    }
  }
}

function consumeAtHome(state: SettlementSimulationState): void {
  for (const resident of state.residents) {
    const home = state.buildings.find((building) => building.id === resident.homeId);
    if (!home) {
      resident.needs.housing = Math.max(0, resident.needs.housing - 8);
      resident.morale = Math.max(0, resident.morale - 2);
      continue;
    }
    if (amount(home.inputInventory, 'water') >= 0.25) {
      home.inputInventory.water = amount(home.inputInventory, 'water') - 0.25;
      resident.needs.water = Math.min(100, resident.needs.water + 8);
      state.statistics.consumed.water = amount(state.statistics.consumed, 'water') + 0.25;
    } else resident.needs.water = Math.max(0, resident.needs.water - 9);
    const meal: SettlementResourceId | undefined = amount(home.inputInventory, 'fish-stew') >= 0.2 ? 'fish-stew' : amount(home.inputInventory, 'hardtack') >= 0.25 ? 'hardtack' : undefined;
    if (meal) {
      const consumed = meal === 'fish-stew' ? 0.2 : 0.25;
      home.inputInventory[meal] = amount(home.inputInventory, meal) - consumed;
      resident.needs.food = Math.min(100, resident.needs.food + (meal === 'fish-stew' ? 9 : 6));
      state.statistics.consumed[meal] = amount(state.statistics.consumed, meal) + consumed;
    } else resident.needs.food = Math.max(0, resident.needs.food - 8);
    resident.needs.housing = Math.min(100, resident.needs.housing + 2);
    const averageNeeds = Object.values(resident.needs).reduce((sum, value) => sum + value, 0) / Object.values(resident.needs).length;
    const policyMorale = state.policies.active.labor === 'forced-quota' ? -0.8 : state.policies.active.loot === 'equal-shares' ? 0.35 : 0;
    const rationMorale = state.policies.active.food === 'reserve-rations' ? -0.4 : 0;
    resident.morale = Math.max(0, Math.min(100, resident.morale + (averageNeeds - 55) * 0.02 + policyMorale + rationMorale));
    resident.loyalty = Math.max(0, Math.min(100, resident.loyalty + (resident.morale - 50) * 0.006));
    resident.fatigue = Math.max(0, resident.fatigue - 2);
  }
}

function populationTierPromotion(state: SettlementSimulationState): void {
  const trainingActive = state.buildings.some((building) => building.definitionId === 'training-yard' && building.state === 'ACTIVE' && building.workers.length > 0);
  for (const resident of state.residents) {
    const averageNeeds = Object.values(resident.needs).reduce((sum, value) => sum + value, 0) / Object.values(resident.needs).length;
    if (resident.tier === 'castaway' && resident.homeId && resident.experience >= 8 && resident.needs.food > 55 && resident.needs.water > 55) {
      resident.tier = 'laborer';
      resident.morale = Math.min(100, resident.morale + 8);
    } else if (resident.tier === 'laborer' && resident.experience >= 28 && averageNeeds > 62) {
      resident.tier = 'skilled';
      resident.morale = Math.min(100, resident.morale + 6);
    } else if (resident.tier === 'skilled' && trainingActive && resident.experience >= 60 && averageNeeds > 68) {
      resident.tier = 'pirate';
      resident.morale = Math.min(100, resident.morale + 7);
    } else if (resident.tier === 'pirate' && resident.experience >= 130 && resident.loyalty > 72 && averageNeeds > 74) resident.tier = 'elite';
  }
}

function settlementHousingCapacity(state: SettlementSimulationState): number {
  return state.buildings.filter((building) => building.state === 'ACTIVE').reduce((sum, building) => sum + Object.values(BUILDINGS[building.definitionId]?.housing ?? {}).reduce((subtotal, value) => subtotal + (value ?? 0), 0), 0);
}

function assignAvailableHome(state: SettlementSimulationState, resident: Resident): void {
  const homes = state.buildings.filter((building) => building.state === 'ACTIVE' && BUILDINGS[building.definitionId]?.housing);
  for (const home of homes) {
    const capacity = Object.values(BUILDINGS[home.definitionId]?.housing ?? {}).reduce((sum, value) => sum + (value ?? 0), 0);
    if (state.residents.filter((person) => person.homeId === home.id).length >= capacity) continue;
    resident.homeId = home.id;
    resident.position = { x: home.x, y: home.y };
    return;
  }
}

function advancePopulationDay(state: SettlementSimulationState): void {
  populationTierPromotion(state);
  const capacity = settlementHousingCapacity(state);
  const inventory = aggregateInventory(state);
  const food = (inventory.hardtack ?? 0) + (inventory['fish-stew'] ?? 0) + (inventory['meat-dish'] ?? 0);
  const morale = state.residents.reduce((sum, resident) => sum + resident.morale, 0) / Math.max(1, state.residents.length);
  if (state.residents.length >= capacity || food < state.residents.length * 0.8 || (inventory.water ?? 0) < state.residents.length * 0.7 || morale < 58) return;
  const arrivals = Math.min(capacity - state.residents.length, Math.max(1, Math.floor(state.residents.length * 0.04)));
  const firstNames = ['아샤', '핀', '로완', '마티', '이네스', '카엘', '세라', '오린'];
  const lastNames = ['솔트', '베인', '코브', '리드', '해로', '벨'];
  for (let index = 0; index < arrivals; index += 1) {
    const person: Resident = {
      id: createId('resident'), name: `${firstNames[(state.residents.length + index) % firstNames.length]} ${lastNames[(Math.floor(state.simulationMinutes / 1440) + index) % lastNames.length]}`,
      tier: 'castaway', job: 'unassigned', health: 72, morale: 58, loyalty: 46, fatigue: 28, experience: 0,
      needs: { water: 60, food: 58, housing: 45, clothing: 30, health: 62, leisure: 38, pirateCulture: 20, equipment: 18 },
      equipment: {}, position: { x: 10, y: 14 }, path: [], pathProgress: 0, action: 'IDLE', actionUntil: state.simulationMinutes
    };
    state.residents.push(person);
    assignAvailableHome(state, person);
  }
}

function updateWarnings(state: SettlementSimulationState): void {
  const activeCodes = new Set<string>();
  const add = (code: string, severity: 'info' | 'caution' | 'danger' | 'emergency', title: string, detail: string, buildingId?: string) => {
    activeCodes.add(code);
    const existing = state.warnings.find((warning) => warning.code === code && !warning.acknowledged);
    if (!existing) state.warnings.push({ id: `warning-${code}-${Math.floor(state.simulationMinutes)}`, code, severity, title, detail, buildingId, createdAt: state.simulationMinutes, acknowledged: false });
  };
  const thirsty = state.residents.filter((resident) => resident.needs.water < 30).length;
  const hungry = state.residents.filter((resident) => resident.needs.food < 30).length;
  if (thirsty > 0) add('water-shortage', thirsty > 4 ? 'emergency' : 'danger', '식수 부족', `${thirsty}명이 식수를 공급받지 못하고 있습니다.`);
  if (hungry > 0) add('food-shortage', hungry > 4 ? 'emergency' : 'danger', '식량 부족', `${hungry}명이 식사를 거르고 있습니다.`);
  const blocked = state.buildings.filter((building) => building.state === 'BLOCKED' || building.statusReason?.includes('대기'));
  if (blocked.length > 0) add('blocked-production', 'caution', '생산·건설 병목', `${blocked.length}개 시설이 자재 또는 인력을 기다립니다.`, blocked[0].id);
  const waiting = state.transports.filter((job) => job.state === 'WAITING').length;
  if (waiting > 3) add('hauler-shortage', 'caution', '운반 인력 부족', `${waiting}건의 화물이 운반자를 기다립니다.`);
  if (state.threat.active && state.threat.discovered) add('invasion-warning', state.threat.etaHours < 5 ? 'emergency' : 'danger', '적 함대 접근', `${state.threat.fleetDescription} · 도착까지 ${state.threat.etaHours.toFixed(1)}시간`);
  state.warnings = state.warnings.filter((warning) => activeCodes.has(warning.code) || state.simulationMinutes - warning.createdAt < 90).slice(-20);
}

export function advanceSettlement(input: SettlementSimulationState, realSeconds: number): SettlementSimulationState {
  if (input.speed === 0 || realSeconds <= 0) return input;
  const gameMinutes = realSeconds * input.speed;
  const previousHour = Math.floor(input.simulationMinutes / 60);
  const previousDay = Math.floor(input.simulationMinutes / 1440);
  let state = structuredClone(input);
  state.simulationMinutes += gameMinutes;
  state.lastTickAt = Date.now();
  advanceConstruction(state, gameMinutes);
  autoAssign(state);
  advanceProduction(state, gameMinutes);
  state = scheduleLogistics(state);
  state = advanceTransports(state, gameMinutes);
  if (Math.floor(state.simulationMinutes / 60) > previousHour) consumeAtHome(state);
  if (Math.floor(state.simulationMinutes / 1440) > previousDay) advancePopulationDay(state);
  updateWarnings(state);
  return state;
}

export function setResidentJob(state: SettlementSimulationState, residentId: string, job: JobId): SettlementSimulationState {
  const next = structuredClone(state);
  const resident = next.residents.find((person) => person.id === residentId);
  if (!resident) return state;
  if (resident.workplaceId) {
    const building = next.buildings.find((item) => item.id === resident.workplaceId);
    if (building) building.workers = building.workers.filter((id) => id !== resident.id);
  }
  resident.job = job;
  resident.workplaceId = undefined;
  resident.action = 'IDLE';
  return next;
}
