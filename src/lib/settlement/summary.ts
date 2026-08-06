import { BUILDINGS } from './catalog';
import { aggregateInventory } from './construction';
import type { FacilityId, HavenState, ResourceStock } from '$lib/domain/types';
import type { SettlementResourceId, SettlementSimulationState } from './types';

export interface SettlementSummary {
  population: number;
  availableWorkers: number;
  morale: number;
  water: number;
  food: number;
  foodDays: number;
  storageUsed: number;
  storageCapacity: number;
  productionActive: number;
  productionBlocked: number;
  housingCapacity: number;
  defense: number;
}

export function settlementSummary(state: SettlementSimulationState): SettlementSummary {
  const inventory = aggregateInventory(state);
  const food = (inventory.hardtack ?? 0) + (inventory['fish-stew'] ?? 0) + (inventory['meat-dish'] ?? 0) + (inventory.fish ?? 0) * 0.45 + (inventory.fruit ?? 0) * 0.4;
  const morale = state.residents.length > 0 ? state.residents.reduce((sum, resident) => sum + resident.morale, 0) / state.residents.length : 0;
  const storageBuildings = state.buildings.filter((building) => building.state === 'ACTIVE');
  const storageCapacity = storageBuildings.reduce((sum, building) => sum + (BUILDINGS[building.definitionId]?.storage ?? 0), 0);
  const storageUsed = state.buildings.reduce((sum, building) => sum + [...Object.values(building.inputInventory), ...Object.values(building.outputInventory)].reduce((subtotal, value) => subtotal + (value ?? 0), 0), 0);
  const housingCapacity = storageBuildings.reduce((sum, building) => sum + Object.values(BUILDINGS[building.definitionId]?.housing ?? {}).reduce((subtotal, value) => subtotal + (value ?? 0), 0), 0);
  const activeJobs = new Set(state.transports.map((job) => job.haulerId));
  const availableWorkers = state.residents.filter((resident) => resident.job === 'unassigned' || (resident.job === 'hauler' && !activeJobs.has(resident.id))).length;
  const batteries = storageBuildings.filter((building) => building.definitionId === 'coastal-battery');
  const watchtowers = storageBuildings.filter((building) => building.definitionId === 'watchtower');
  const walls = storageBuildings.filter((building) => building.definitionId === 'fort-wall');
  const guardPosts = storageBuildings.filter((building) => building.definitionId === 'guard-post');
  const signals = storageBuildings.filter((building) => building.definitionId === 'signal-tower');
  const defense = batteries.reduce((sum, battery) => sum + Math.min(battery.workers.length / 4, 1) * Math.min(battery.inputInventory.cannonballs ?? 0, battery.inputInventory.powder ?? 0) * (0.8 + battery.level * 0.2), 0)
    + watchtowers.reduce((sum, tower) => sum + 8 + tower.level * 4, 0)
    + walls.reduce((sum, wall) => sum + 10 * wall.level * wall.condition / 100, 0)
    + guardPosts.reduce((sum, post) => sum + post.workers.length * (3 + post.level), 0)
    + signals.reduce((sum, signal) => sum + 5 + signal.level * 3, 0);
  return {
    population: state.residents.length,
    availableWorkers,
    morale,
    water: inventory.water ?? 0,
    food,
    foodDays: food / Math.max(1, state.residents.length * 0.65),
    storageUsed,
    storageCapacity,
    productionActive: state.buildings.filter((building) => building.state === 'ACTIVE' && !!building.recipeId && !building.statusReason).length,
    productionBlocked: state.buildings.filter((building) => building.state === 'BLOCKED' || building.statusReason?.includes('대기') || building.statusReason?.includes('부족')).length,
    housingCapacity,
    defense: Math.round(defense)
  };
}

export function settlementLegacyResources(state: SettlementSimulationState, current: ResourceStock): ResourceStock {
  const total = aggregateInventory(state);
  const get = (id: SettlementResourceId) => total[id] ?? 0;
  return {
    ...current,
    gold: Math.floor(get('gold')),
    timber: Math.floor(get('logs') + get('planks')),
    iron: Math.floor(get('iron-ingots') + get('iron-ore') * 0.35),
    stone: Math.floor(get('stone') + get('stone-blocks')),
    powder: Math.floor(get('powder')),
    cannonballs: Math.floor(get('cannonballs')),
    cloth: Math.floor(get('cloth')),
    rope: Math.floor(get('rope')),
    food: Math.floor(get('hardtack') + get('fish-stew') + get('meat-dish')),
    rum: Math.floor(get('rum') + get('aged-rum')),
    medicine: Math.floor(get('medicine') + get('rare-medicine')),
    spices: Math.floor(get('spices')),
    gems: Math.floor(get('jeweled-ornaments')),
    bullion: Math.floor(get('silver') + get('royal-coins')),
    contraband: Math.floor(get('royal-equipment')),
    blueprints: Math.floor(get('rare-blueprints')),
    relics: Math.floor(get('ancient-relics'))
  };
}

export function settlementLegacyHaven(state: SettlementSimulationState, current: HavenState): HavenState {
  const summary = settlementSummary(state);
  const laborers = state.residents.filter((resident) => ['laborer', 'hauler', 'builder', 'logger', 'miner', 'fisher', 'farmer', 'hunter'].includes(resident.job)).length;
  const gunners = state.residents.filter((resident) => resident.job === 'gunner').length;
  const shipwrights = state.residents.filter((resident) => resident.job === 'shipwright').length;
  const doctors = state.residents.filter((resident) => resident.job === 'medic').length;
  const captains = state.residents.filter((resident) => resident.job === 'captain' || resident.tier === 'officer').length;
  const facilityMap: Partial<Record<string, FacilityId>> = {
    'captains-lodge': 'captains-lodge', 'small-dock': 'dock', shipyard: 'shipyard', 'dry-dock': 'shipyard', forge: 'forge',
    'powder-magazine': 'powder-magazine', warehouse: 'warehouse', tavern: 'tavern', infirmary: 'infirmary',
    'intelligence-network': 'intel-den', 'training-yard': 'training-yard', 'coastal-battery': 'coastal-battery',
    watchtower: 'watchtower', 'pirate-council': 'pirate-council'
  };
  const facilities = { ...current.facilities };
  for (const building of state.buildings.filter((item) => item.state === 'ACTIVE')) {
    const legacyId = facilityMap[building.definitionId];
    if (!legacyId) continue;
    const previous = facilities[legacyId];
    if (!previous || building.level >= previous.level) facilities[legacyId] = { id: legacyId, level: building.level, condition: building.condition, workers: building.workers.length };
  }
  const activeBuildings = state.buildings.filter((building) => building.state === 'ACTIVE' && building.definitionId !== 'wreckage').length;
  const growthScore = activeBuildings + summary.population / 8 + state.progression.unlocked.length * 0.6;
  const tier = growthScore >= 90 ? 7 : growthScore >= 58 ? 6 : growthScore >= 36 ? 5 : growthScore >= 23 ? 4 : growthScore >= 13 ? 3 : growthScore >= 6 ? 2 : 1;
  const guardCoverage = state.buildings.filter((building) => ['guard-post', 'watchtower', 'signal-tower'].includes(building.definitionId) && building.state === 'ACTIVE').reduce((sum, building) => sum + building.workers.length + building.level, 0);
  const averageLoyalty = state.residents.reduce((sum, resident) => sum + resident.loyalty, 0) / Math.max(1, state.residents.length);
  return {
    ...current,
    tier: Math.max(current.tier, tier),
    population: summary.population,
    food: summary.food,
    morale: summary.morale,
    defense: summary.defense,
    order: Math.max(0, Math.min(100, averageLoyalty * 0.72 + guardCoverage * 2.2)),
    detectionRisk: Math.max(4, current.detectionRisk - guardCoverage * 0.35),
    production: summary.productionActive,
    storageMax: summary.storageCapacity,
    facilities,
    populationByRole: {
      ...current.populationByRole,
      fighters: state.residents.filter((resident) => ['raider', 'guard'].includes(resident.job)).length,
      sailors: state.residents.filter((resident) => ['navigator', 'shipwright'].includes(resident.job)).length,
      gunners,
      shipwrights,
      doctors,
      laborers,
      civilians: state.residents.filter((resident) => resident.tier === 'castaway').length,
      captains
    }
  };
}
