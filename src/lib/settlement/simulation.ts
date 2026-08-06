import { BUILDINGS, POPULATION_TIERS, RECIPES } from './catalog';
import { advanceTransports, scheduleLogistics } from './logistics';
import type { JobId, Resident, SettlementBuilding, SettlementResourceId, SettlementSimulationState } from './types';
import { aggregateInventory, buildingUpgradeCost } from './construction';
import { createId } from '$lib/domain/rng';
import { findCachedPath, pathTravelCost } from './island';
import { policyModifiers } from './progression';

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
    const upgrading = building.state === 'UPGRADING' || (building.state === 'BLOCKED' && !!building.upgradeMaterialsCommitted);
    const constructionCost = upgrading ? buildingUpgradeCost(building.definitionId, building.level) : definition.constructionCost;
    const materialsCommitted = upgrading ? !!building.upgradeMaterialsCommitted : !!building.constructionMaterialsCommitted;
    if (!materialsCommitted && !hasInputs(building, constructionCost)) {
      building.state = 'PLANNED';
      if (upgrading) building.state = 'UPGRADING';
      building.statusReason = upgrading ? `${building.level + 1}단계 확장 자재 운송 대기` : '건설 자재 운송 대기';
      continue;
    }
    if (builders.length === 0) {
      building.state = 'BLOCKED';
      building.statusReason = '건설 노동자 부족';
      continue;
    }
    if (!materialsCommitted) {
      consumeInputs(building, constructionCost);
      if (upgrading) building.upgradeMaterialsCommitted = true;
      else { building.state = 'CONSTRUCTING'; building.constructionMaterialsCommitted = true; }
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
    building.constructionProgress = Math.min(1, building.constructionProgress + gameMinutes * assignedBuilders.length / Math.max(1, definition.constructionMinutes * (upgrading ? 2.8 : 2)));
    building.statusReason = `${upgrading ? '확장' : '건설'} ${Math.floor(building.constructionProgress * 100)}%`;
    if (building.constructionProgress >= 1) {
      building.state = 'ACTIVE';
      if (upgrading) building.level += 1;
      building.constructionMaterialsCommitted = false;
      building.upgradeMaterialsCommitted = false;
      building.statusReason = undefined;
      building.workers = [];
      state.statistics.completedBuildings += 1;
      if (definition.category === 'gathering' || definition.category === 'processing' || definition.category === 'logistics') state.progression.points.prosperity += 2;
      if (definition.category === 'housing' || definition.category === 'welfare' || definition.category === 'administration') state.progression.points.federation += 2;
      if (definition.category === 'fleet' || definition.category === 'infrastructure') state.progression.points.seamanship += 2;
      if (definition.category === 'military') state.progression.points.infamy += 2;
      if (!upgrading) {
        const completedStep = building.definitionId === 'water-collector' ? 1 : building.definitionId === 'lumber-camp' ? 2 : building.definitionId === 'warehouse' ? 3 : building.definitionId === 'fisher-hut' ? 4 : ['small-dock', 'shipyard'].includes(building.definitionId) ? 5 : state.tutorialStep;
        state.tutorialStep = Math.max(state.tutorialStep, completedStep);
      }
      for (const resident of assignedBuilders) {
        resident.experience += upgrading ? 1.5 : 1;
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
    const depositTile = state.island.tiles[building.y * state.island.width + building.x];
    const depletesDeposit = ['lumber-camp', 'quarry', 'iron-mine', 'copper-mine'].includes(building.definitionId);
    if (depletesDeposit && (depositTile?.resourceRemaining ?? 0) <= 0) {
      building.statusReason = '주변 천연자원 고갈';
      continue;
    }
    const needed = requiredWorkers(recipe.id);
    const healthyWorkers = building.workers.map((id) => state.residents.find((resident) => resident.id === id)).filter((resident): resident is Resident => !!resident && resident.health > 25 && Math.hypot(resident.position.x - building.x, resident.position.y - building.y) <= 1.5);
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
    const modifiers = policyModifiers(state);
    const workerEfficiency = healthyWorkers.reduce((sum, worker) => {
      const skilled = ['skilled', 'pirate', 'elite', 'officer'].includes(worker.tier) ? modifiers.skilledProduction : 1;
      return sum + POPULATION_TIERS[worker.tier].productivity * skilled * (0.55 + worker.morale / 220) * (1 - worker.fatigue / 180);
    }, 0) / Math.max(1, needed) * modifiers.production;
    building.recipeProgress += gameMinutes * Math.max(0.25, workerEfficiency) / recipe.durationMinutes;
    building.statusReason = `생산 ${Math.floor(Math.min(1, building.recipeProgress) * 100)}%`;
    if (building.recipeProgress < 1) continue;
    consumeInputs(building, recipe.inputs);
    for (const [resource, output] of Object.entries(recipe.outputs) as [SettlementResourceId, number][]) {
      building.outputInventory[resource] = amount(building.outputInventory, resource) + output;
      state.statistics.produced[resource] = amount(state.statistics.produced, resource) + output;
    }
    if (depletesDeposit && depositTile?.resourceRemaining !== undefined) {
      const extracted = Object.values(recipe.outputs).reduce((sum, output) => sum + (output ?? 0), 0);
      depositTile.resourceRemaining = Math.max(0, depositTile.resourceRemaining - extracted);
    }
    building.recipeProgress %= 1;
    building.statusReason = undefined;
    for (const worker of healthyWorkers) {
      worker.experience += 0.25 * (['pirate', 'elite', 'officer'].includes(worker.tier) ? modifiers.pirateExperience : 1);
      worker.fatigue = Math.min(100, worker.fatigue + 0.25);
    }
    const fireProtection = state.buildings.some((item) => item.definitionId === 'powder-magazine' && item.state === 'ACTIVE' && Math.hypot(item.x - building.x, item.y - building.y) <= 5) ? 0.65 : 1;
    building.fire = Math.min(100, building.fire + Math.max(0, recipe.danger - 12) * 0.08 * fireProtection);
    if (building.fire >= 60) { building.state = 'BURNING'; building.statusReason = '화재 발생 — 진압 인력과 식수 필요'; }
  }
}

function advanceResidentMovement(state: SettlementSimulationState, gameMinutes: number): void {
  const busyHaulers = new Set(state.transports.filter((job) => ['PICKING_UP', 'DELIVERING'].includes(job.state)).map((job) => job.haulerId));
  for (const resident of state.residents) {
    if (busyHaulers.has(resident.id) || resident.job === 'builder') continue;
    const workplace = resident.workplaceId ? state.buildings.find((building) => building.id === resident.workplaceId && building.state === 'ACTIVE') : undefined;
    const home = resident.homeId ? state.buildings.find((building) => building.id === resident.homeId && building.state === 'ACTIVE') : undefined;
    const target = workplace ?? home;
    if (!target) { resident.action = 'IDLE'; continue; }
    const distance = Math.hypot(resident.position.x - target.x, resident.position.y - target.y);
    if (distance <= 0.15) {
      resident.position = { x: target.x, y: target.y };
      resident.path = [];
      resident.pathProgress = 0;
      resident.action = workplace ? 'WORKING' : 'RESTING';
      continue;
    }
    const last = resident.path[resident.path.length - 1];
    if (resident.path.length < 2 || last?.x !== target.x || last?.y !== target.y) {
      const result = findCachedPath(state.island, resident.position, { x: target.x, y: target.y }, state.buildings);
      if (result.hit) state.statistics.cacheHits += 1;
      else state.statistics.cacheMisses += 1;
      resident.path = result.path;
      resident.pathProgress = 0;
    }
    if (resident.path.length < 2) continue;
    const duration = Math.max(1, pathTravelCost(state.island, resident.path, state.buildings) * (1.55 - POPULATION_TIERS[resident.tier].productivity * 0.18));
    resident.pathProgress = Math.min(1, resident.pathProgress + gameMinutes / duration);
    const scaled = Math.min(resident.path.length - 1, resident.pathProgress * (resident.path.length - 1));
    const index = Math.floor(scaled);
    const nextIndex = Math.min(resident.path.length - 1, index + 1);
    const local = scaled - index;
    resident.position = {
      x: resident.path[index].x + (resident.path[nextIndex].x - resident.path[index].x) * local,
      y: resident.path[index].y + (resident.path[nextIndex].y - resident.path[index].y) * local
    };
    resident.action = 'MOVING';
  }
}

function needScore(resident: Resident): number {
  const required = POPULATION_TIERS[resident.tier].needs;
  return required.reduce((sum, need) => sum + resident.needs[need], 0) / Math.max(1, required.length);
}

function serviceNear(state: SettlementSimulationState, resident: Resident, ids: SettlementBuilding['definitionId'][]): SettlementBuilding | undefined {
  const origin = state.buildings.find((building) => building.id === resident.homeId) ?? { x: resident.position.x, y: resident.position.y };
  return state.buildings
    .filter((building) => ids.includes(building.definitionId) && building.state === 'ACTIVE' && !building.paused)
    .filter((building) => (BUILDINGS[building.definitionId]?.workerSlots ?? 0) === 0 || building.workers.length > 0)
    .filter((building) => Math.hypot(building.x - origin.x, building.y - origin.y) <= (BUILDINGS[building.definitionId]?.range ?? 5))
    .sort((a, b) => Math.hypot(a.x - origin.x, a.y - origin.y) - Math.hypot(b.x - origin.x, b.y - origin.y))[0];
}

function consumeStored(building: SettlementBuilding | undefined, resource: SettlementResourceId, quantity: number): boolean {
  if (!building || amount(building.inputInventory, resource) < quantity) return false;
  building.inputInventory[resource] = amount(building.inputInventory, resource) - quantity;
  return true;
}

function consumeAnywhere(state: SettlementSimulationState, resource: SettlementResourceId, quantity: number): boolean {
  let remaining = quantity;
  const loose = Math.min(state.looseInventory[resource] ?? 0, remaining);
  state.looseInventory[resource] = (state.looseInventory[resource] ?? 0) - loose;
  remaining -= loose;
  for (const building of state.buildings) {
    if (remaining <= 0) break;
    const stored = amount(building.outputInventory, resource);
    const reserved = amount(building.reservedInventory, resource);
    const spent = Math.min(Math.max(0, stored - reserved), remaining);
    building.outputInventory[resource] = stored - spent;
    remaining -= spent;
  }
  return remaining <= 0;
}

function consumeAtHome(state: SettlementSimulationState): void {
  const modifiers = policyModifiers(state);
  const consumption = modifiers.foodConsumption;
  for (const resident of state.residents) {
    const home = state.buildings.find((building) => building.id === resident.homeId);
    if (!home) {
      resident.needs.housing = Math.max(0, resident.needs.housing - 8);
      resident.morale = Math.max(0, resident.morale - 2);
      continue;
    }
    const requiredNeeds = new Set(POPULATION_TIERS[resident.tier].needs);
    for (const need of requiredNeeds) resident.needs[need] = Math.max(0, resident.needs[need] - 2.4);
    const waterUse = 0.25 * consumption;
    if (amount(home.inputInventory, 'water') >= waterUse) {
      home.inputInventory.water = amount(home.inputInventory, 'water') - waterUse;
      resident.needs.water = Math.min(100, resident.needs.water + 8);
      state.statistics.consumed.water = amount(state.statistics.consumed, 'water') + waterUse;
    } else resident.needs.water = Math.max(0, resident.needs.water - 9);
    const meal: SettlementResourceId | undefined = amount(home.inputInventory, 'meat-dish') >= 0.18 * consumption ? 'meat-dish' : amount(home.inputInventory, 'fish-stew') >= 0.2 * consumption ? 'fish-stew' : amount(home.inputInventory, 'hardtack') >= 0.25 * consumption ? 'hardtack' : undefined;
    if (meal) {
      const consumed = (meal === 'meat-dish' ? 0.18 : meal === 'fish-stew' ? 0.2 : 0.25) * consumption;
      home.inputInventory[meal] = amount(home.inputInventory, meal) - consumed;
      resident.needs.food = Math.min(100, resident.needs.food + (meal === 'meat-dish' ? 11 : meal === 'fish-stew' ? 9 : 6) * modifiers.foodSatisfaction);
      state.statistics.consumed[meal] = amount(state.statistics.consumed, meal) + consumed;
    } else resident.needs.food = Math.max(0, resident.needs.food - 8);
    resident.needs.housing = Math.min(100, resident.needs.housing + 4);

    if (requiredNeeds.has('clothing')) {
      const clothing = consumeStored(home, 'clothes', 0.04 * consumption) || consumeStored(home, 'boots', 0.03 * consumption);
      resident.needs.clothing = Math.max(0, Math.min(100, resident.needs.clothing + (clothing ? 7 : -5)));
    }
    if (requiredNeeds.has('health')) {
      const infirmary = serviceNear(state, resident, ['infirmary']);
      const bathhouse = serviceNear(state, resident, ['bathhouse']);
      const treated = consumeStored(infirmary, 'medicine', 0.035 * consumption);
      const washed = consumeStored(bathhouse, 'water', 0.08 * consumption);
      const recovery = treated ? 9 : washed ? 5 : -4;
      resident.needs.health = Math.max(0, Math.min(100, resident.needs.health + recovery));
      const careFactor = state.progression.unlocked.includes('federation-care') ? 0.65 : 1;
      resident.health = Math.max(1, Math.min(100, resident.health + (treated ? 2.5 : washed ? 0.7 : resident.needs.health < 30 ? -1.2 * careFactor : 0.1)));
      if (treated) resident.action = 'HEALING';
    }
    if (requiredNeeds.has('leisure')) {
      const tavern = serviceNear(state, resident, ['tavern', 'gambling-den']);
      const publicSpace = serviceNear(state, resident, ['campfire', 'festival-square', 'arena']);
      const drink = consumeStored(tavern, 'rum', 0.04 * consumption) || consumeStored(tavern, 'beer', 0.05 * consumption);
      resident.needs.leisure = Math.max(0, Math.min(100, resident.needs.leisure + (drink ? 8 : publicSpace ? 4 : -5)));
      if (drink) resident.action = 'DRINKING';
    }
    if (requiredNeeds.has('pirateCulture')) {
      const culture = serviceNear(state, resident, ['tavern', 'arena', 'festival-square', 'training-yard', 'pirate-council']);
      resident.needs.pirateCulture = Math.max(0, Math.min(100, resident.needs.pirateCulture + (culture ? 6 : -5)));
    }
    if (requiredNeeds.has('equipment')) {
      const equipment: SettlementResourceId = resident.tier === 'officer' ? 'officer-pistols' : resident.tier === 'elite' ? 'pistols' : resident.tier === 'pirate' ? 'cutlasses' : 'tools';
      const equipped = consumeStored(home, equipment, 0.018 * consumption) || consumeStored(home, 'tools', 0.02 * consumption);
      resident.needs.equipment = Math.max(0, Math.min(100, resident.needs.equipment + (equipped ? 7 : -5)));
    }
    const averageNeeds = needScore(resident);
    const tierMorale = resident.tier === 'officer' ? modifiers.officerMoralePerHour : ['castaway', 'laborer'].includes(resident.tier) ? modifiers.laborerMoralePerHour : 0;
    resident.morale = Math.max(0, Math.min(100, resident.morale + (averageNeeds - 55) * 0.025 + modifiers.moralePerHour + tierMorale));
    resident.loyalty = Math.max(0, Math.min(100, resident.loyalty + (resident.morale - 50) * 0.006 + modifiers.loyaltyPerHour));
    const laborRecovery = ['laborer', 'logger', 'miner', 'fisher', 'farmer', 'hunter', 'builder', 'hauler'].includes(resident.job) ? modifiers.workerFatigueRecovery : 0;
    resident.fatigue = Math.max(0, resident.fatigue - 2 - laborRecovery);
  }
  const payroll = state.residents.length * modifiers.wageGoldPerResident;
  if (payroll > 0 && !consumeAnywhere(state, 'gold', payroll)) for (const resident of state.residents) resident.morale = Math.max(0, resident.morale - 0.5);
}

function populationTierPromotion(state: SettlementSimulationState): void {
  const trainingActive = state.buildings.some((building) => building.definitionId === 'training-yard' && building.state === 'ACTIVE' && building.workers.length > 0);
  for (const resident of state.residents) {
    const averageNeeds = needScore(resident);
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

function advanceHazards(state: SettlementSimulationState, gameMinutes: number): void {
  for (const building of state.buildings) {
    if (building.state === 'BURNING') {
      const responders = state.residents.filter((resident) => ['builder', 'guard', 'laborer'].includes(resident.job) && resident.health > 25)
        .sort((a, b) => Math.hypot(a.position.x - building.x, a.position.y - building.y) - Math.hypot(b.position.x - building.x, b.position.y - building.y)).slice(0, 3);
      const waterNeeded = Math.min(0.3 * responders.length * gameMinutes, building.fire / 8);
      const supplied = waterNeeded > 0 && consumeAnywhere(state, 'water', waterNeeded);
      for (const resident of responders) { resident.action = 'FIREFIGHTING'; resident.position.x += (building.x - resident.position.x) * Math.min(1, gameMinutes * 0.08); resident.position.y += (building.y - resident.position.y) * Math.min(1, gameMinutes * 0.08); }
      building.fire = Math.max(0, building.fire - (supplied ? responders.length * gameMinutes * 0.8 : gameMinutes * 0.08));
      building.condition = Math.max(0, building.condition - gameMinutes * (supplied ? 0.08 : 0.55));
      if (building.condition <= 0) { building.state = 'DESTROYED'; building.statusReason = '화재로 붕괴됨'; }
      else if (building.fire <= 1) { building.state = 'DAMAGED'; building.statusReason = '화재 진압 — 수리 필요'; }
    } else if (building.state === 'DAMAGED') {
      const builder = state.residents.find((resident) => resident.job === 'builder' && resident.health > 25);
      if (builder && amount(building.inputInventory, 'planks') >= 0.03 * gameMinutes && amount(building.inputInventory, 'stone-blocks') >= 0.015 * gameMinutes) {
        building.inputInventory.planks = amount(building.inputInventory, 'planks') - 0.03 * gameMinutes;
        building.inputInventory['stone-blocks'] = amount(building.inputInventory, 'stone-blocks') - 0.015 * gameMinutes;
        building.condition = Math.min(100, building.condition + gameMinutes * 0.45);
        building.statusReason = `수리 ${Math.floor(building.condition)}%`;
        builder.action = 'WORKING';
        if (building.condition >= 100) { building.state = 'ACTIVE'; building.statusReason = undefined; }
      } else building.statusReason = '수리용 판자·석재 블록 또는 건설자 부족';
    } else if (building.fire > 0) building.fire = Math.max(0, building.fire - gameMinutes * 0.03);
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
  const lodgeActive = state.buildings.some((building) => building.definitionId === 'captains-lodge' && building.state === 'ACTIVE' && building.workers.length > 0);
  const trainingActive = state.buildings.some((building) => ['training-yard', 'arena'].includes(building.definitionId) && building.state === 'ACTIVE' && building.workers.length > 0);
  for (const resident of state.residents) {
    if (lodgeActive) resident.loyalty = Math.min(100, resident.loyalty + 0.5);
    if (trainingActive && ['guard', 'gunner', 'raider'].includes(resident.job)) resident.experience += 1.5;
  }
  if ((state.prisoners ?? 0) > 0 && state.policies.active.prisoners === 'ransom') {
    state.prisoners -= 1;
    state.looseInventory.gold = (state.looseInventory.gold ?? 0) + 70;
  }
  if ((state.prisoners ?? 0) > 0 && state.policies.active.prisoners === 'crew-conversion' && settlementHousingCapacity(state) > state.residents.length) {
    state.prisoners -= 1;
    const converted: Resident = {
      id: createId('resident'), name: `전향자 ${state.residents.length + 1}`, tier: 'laborer', job: 'raider', health: 68, morale: 48, loyalty: 28,
      fatigue: 30, experience: 14, needs: { water: 55, food: 55, housing: 42, clothing: 35, health: 52, leisure: 38, pirateCulture: 46, equipment: 30 },
      equipment: {}, position: { x: 10, y: 14 }, path: [], pathProgress: 0, action: 'IDLE', actionUntil: state.simulationMinutes
    };
    state.residents.push(converted);
    assignAvailableHome(state, converted);
  }
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
  const unmetLiving = state.residents.filter((resident) => POPULATION_TIERS[resident.tier].needs.some((need) => !['water', 'food', 'housing'].includes(need) && resident.needs[need] < 30)).length;
  if (unmetLiving > 0) add('resident-needs', unmetLiving > state.residents.length * .35 ? 'danger' : 'caution', '생활 상품·복지 부족', `${unmetLiving}명의 의복, 의료, 오락 또는 장비 욕구가 충족되지 않았습니다.`);
  const sick = state.residents.filter((resident) => resident.health < 35).length;
  if (sick > 0) add('disease-risk', sick > 3 ? 'danger' : 'caution', '부상·질병 확산', `${sick}명이 의무실 치료를 필요로 합니다.`);
  const unrest = state.residents.filter((resident) => resident.morale < 28 || resident.loyalty < 24).length;
  if (unrest > 0) add('mutiny-risk', unrest > 4 ? 'emergency' : 'danger', '이탈과 반란 위험', `${unrest}명의 사기 또는 충성도가 위험 수준입니다.`);
  const blocked = state.buildings.filter((building) => building.state === 'BLOCKED' || building.statusReason?.includes('대기'));
  if (blocked.length > 0) add('blocked-production', 'caution', '생산·건설 병목', `${blocked.length}개 시설이 자재 또는 인력을 기다립니다.`, blocked[0].id);
  const waiting = state.transports.filter((job) => job.state === 'WAITING').length;
  if (waiting > 3) add('hauler-shortage', 'caution', '운반 인력 부족', `${waiting}건의 화물이 운반자를 기다립니다.`);
  const unstaffed = state.buildings.filter((building) => building.state === 'ACTIVE' && (BUILDINGS[building.definitionId]?.workerSlots ?? 0) > 0 && building.workers.length === 0);
  if (unstaffed.length > 0) add('worker-shortage', 'caution', '시설 인력 부족', `${unstaffed.length}개 시설이 배치된 작업자 없이 정지했습니다.`, unstaffed[0].id);
  const fire = state.buildings.find((building) => building.state === 'BURNING');
  if (fire) add('active-fire', 'emergency', '정착지 화재', `${BUILDINGS[fire.definitionId]?.name ?? '시설'}에 불이 났습니다. 식수와 진압 인력이 필요합니다.`, fire.id);
  const dangerousPowder = state.buildings.find((building) => ['powder-workshop', 'powder-magazine'].includes(building.definitionId) && building.state === 'ACTIVE' && state.buildings.some((home) => !!BUILDINGS[home.definitionId]?.housing && Math.hypot(home.x - building.x, home.y - building.y) < 4));
  if (dangerousPowder) add('powder-housing-risk', 'danger', '화약 시설 주거 밀집', '화약 시설의 폭발 영향권 안에 주거지가 있습니다.', dangerousPowder.id);
  const storageBuildings = state.buildings.filter((building) => building.state === 'ACTIVE' && (BUILDINGS[building.definitionId]?.storage ?? 0) > 0);
  const fullStorage = storageBuildings.find((building) => [...Object.values(building.inputInventory), ...Object.values(building.outputInventory)].reduce((sum, value) => sum + (value ?? 0), 0) >= (BUILDINGS[building.definitionId]?.storage ?? Infinity) * .92);
  if (fullStorage) add('storage-full', 'caution', '저장 공간 포화', `${BUILDINGS[fullStorage.definitionId]?.name ?? '창고'}의 이용률이 92%를 넘었습니다.`, fullStorage.id);
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
  advanceResidentMovement(state, gameMinutes);
  advanceProduction(state, gameMinutes);
  advanceHazards(state, gameMinutes);
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
