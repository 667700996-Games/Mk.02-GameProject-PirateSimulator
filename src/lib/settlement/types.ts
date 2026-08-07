import type { ShipClass, ZoneId } from '$lib/domain/types';

export type SettlementResourceCategory =
  'basic' | 'processed' | 'living' | 'military' | 'luxury' | 'loot';

export type SettlementResourceId =
  | 'gold'
  | 'logs'
  | 'stone'
  | 'iron-ore'
  | 'copper-ore'
  | 'fiber'
  | 'water'
  | 'fish'
  | 'fruit'
  | 'grain'
  | 'sulfur'
  | 'raw-meat'
  | 'planks'
  | 'stone-blocks'
  | 'iron-ingots'
  | 'copper-ingots'
  | 'rope'
  | 'cloth'
  | 'leather'
  | 'charcoal'
  | 'powder'
  | 'glass'
  | 'flour'
  | 'hardtack'
  | 'fish-stew'
  | 'meat-dish'
  | 'rum'
  | 'beer'
  | 'clothes'
  | 'boots'
  | 'hats'
  | 'medicine'
  | 'tobacco'
  | 'cannonballs'
  | 'powder-kegs'
  | 'pistols'
  | 'muskets'
  | 'cutlasses'
  | 'armor'
  | 'navigation-tools'
  | 'telescopes'
  | 'sails'
  | 'ship-parts'
  | 'cannons'
  | 'tools'
  | 'jeweled-ornaments'
  | 'fine-clothes'
  | 'aged-rum'
  | 'precision-instruments'
  | 'prosthetics'
  | 'officer-pistols'
  | 'rare-medicine'
  | 'figureheads'
  | 'royal-coins'
  | 'military-maps'
  | 'naval-ciphers'
  | 'ancient-relics'
  | 'rare-blueprints'
  | 'legendary-parts'
  | 'monster-materials'
  | 'silver'
  | 'spices'
  | 'wine'
  | 'whale-oil'
  | 'rare-metal'
  | 'royal-equipment'
  | 'foreign-textiles';

export type SettlementInventory = Record<SettlementResourceId, number>;
export type PartialSettlementInventory = Partial<SettlementInventory>;

export type TerrainType =
  | 'deep-water'
  | 'reef'
  | 'beach'
  | 'coast'
  | 'plain'
  | 'forest'
  | 'slope'
  | 'cliff'
  | 'highland'
  | 'cave'
  | 'ravine'
  | 'wetland'
  | 'stone-deposit'
  | 'iron-vein'
  | 'copper-vein';

export interface IslandTile {
  x: number;
  y: number;
  terrain: TerrainType;
  elevation: number;
  discovered: boolean;
  fertility: number;
  resourceRemaining?: number;
}

export interface IslandMapState {
  seed: number;
  width: number;
  height: number;
  tiles: IslandTile[];
}

export type BuildingCategory =
  | 'gathering'
  | 'processing'
  | 'logistics'
  | 'housing'
  | 'welfare'
  | 'fleet'
  | 'military'
  | 'administration'
  | 'infrastructure';
export type BuildingState =
  | 'PLANNED'
  | 'CONSTRUCTING'
  | 'ACTIVE'
  | 'PAUSED'
  | 'BLOCKED'
  | 'DAMAGED'
  | 'BURNING'
  | 'DESTROYED'
  | 'UPGRADING';

export type SettlementBuildingId =
  | 'wreckage'
  | 'campfire'
  | 'tent'
  | 'water-collector'
  | 'fisher-hut'
  | 'lumber-camp'
  | 'quarry'
  | 'iron-mine'
  | 'copper-mine'
  | 'farm'
  | 'hunter-hut'
  | 'sawmill'
  | 'smelter'
  | 'forge'
  | 'mill'
  | 'bakery'
  | 'cookhouse'
  | 'distillery'
  | 'weaver'
  | 'powder-workshop'
  | 'ammunition-workshop'
  | 'warehouse'
  | 'local-storage'
  | 'distribution-depot'
  | 'dock-warehouse'
  | 'cargo-lift'
  | 'zipline-post'
  | 'bridge'
  | 'stairs'
  | 'ramp'
  | 'cliff-platform'
  | 'bunkhouse'
  | 'barracks'
  | 'skilled-house'
  | 'officer-quarters'
  | 'tavern'
  | 'gambling-den'
  | 'arena'
  | 'infirmary'
  | 'bathhouse'
  | 'festival-square'
  | 'small-dock'
  | 'shipyard'
  | 'dry-dock'
  | 'supply-depot'
  | 'cannon-foundry'
  | 'training-yard'
  | 'watchtower'
  | 'coastal-battery'
  | 'fort-wall'
  | 'powder-magazine'
  | 'guard-post'
  | 'signal-tower'
  | 'captains-lodge'
  | 'pirate-council'
  | 'intelligence-network'
  | 'bounty-board'
  | 'expedition-office';

export interface SettlementBuilding {
  id: string;
  definitionId: SettlementBuildingId;
  x: number;
  y: number;
  rotation: 0 | 1 | 2 | 3;
  level: number;
  state: BuildingState;
  constructionProgress: number;
  constructionPriority: 1 | 2 | 3 | 4 | 5;
  workers: string[];
  inputInventory: PartialSettlementInventory;
  outputInventory: PartialSettlementInventory;
  reservedInventory: PartialSettlementInventory;
  recipeId?: string;
  recipeProgress: number;
  condition: number;
  fire: number;
  paused: boolean;
  pausedFrom?: BuildingState;
  constructionMaterialsCommitted?: boolean;
  upgradeMaterialsCommitted?: boolean;
  createdAt: number;
  statusReason?: string;
}

export type PopulationTier = 'castaway' | 'laborer' | 'skilled' | 'pirate' | 'elite' | 'officer';
export type JobId =
  | 'unassigned'
  | 'laborer'
  | 'logger'
  | 'miner'
  | 'fisher'
  | 'farmer'
  | 'hunter'
  | 'hauler'
  | 'builder'
  | 'smelter'
  | 'blacksmith'
  | 'powder-maker'
  | 'tailor'
  | 'cook'
  | 'distiller'
  | 'medic'
  | 'shipwright'
  | 'gunner'
  | 'navigator'
  | 'raider'
  | 'informant'
  | 'guard'
  | 'officer'
  | 'captain';
export type ResidentAction =
  | 'IDLE'
  | 'SLEEPING'
  | 'WORKING'
  | 'HAULING'
  | 'EATING'
  | 'DRINKING'
  | 'HEALING'
  | 'RESTING'
  | 'TRAINING'
  | 'BOARDING'
  | 'FIREFIGHTING'
  | 'DEFENDING'
  | 'MOVING';
export type ResidentActivityAction = Extract<
  ResidentAction,
  'SLEEPING' | 'EATING' | 'DRINKING' | 'HEALING' | 'RESTING' | 'TRAINING'
>;

export interface ResidentNeeds {
  water: number;
  food: number;
  housing: number;
  clothing: number;
  health: number;
  leisure: number;
  pirateCulture: number;
  equipment: number;
}

export interface GridPoint {
  x: number;
  y: number;
}

export interface Resident {
  id: string;
  name: string;
  tier: PopulationTier;
  job: JobId;
  homeId?: string;
  workplaceId?: string;
  health: number;
  morale: number;
  loyalty: number;
  fatigue: number;
  experience: number;
  needs: ResidentNeeds;
  equipment: PartialSettlementInventory;
  position: GridPoint;
  path: GridPoint[];
  pathProgress: number;
  action: ResidentAction;
  actionUntil: number;
  activityAction?: ResidentActivityAction;
  activityTargetId?: string;
}

export type TransportState =
  'WAITING' | 'ASSIGNED' | 'PICKING_UP' | 'DELIVERING' | 'COMPLETED' | 'CANCELLED';

export interface TransportJob {
  id: string;
  resourceId: SettlementResourceId;
  amount: number;
  sourceBuildingId: string;
  targetBuildingId: string;
  haulerId?: string;
  state: TransportState;
  priority: number;
  path: GridPoint[];
  progress: number;
  createdAt: number;
}

export interface WorkforceRule {
  job: JobId;
  priority: 1 | 2 | 3 | 4 | 5;
  minimum: number;
  maximum: number;
  autoAssign: boolean;
  preferSkilled: boolean;
}

export type SettlementOverlay =
  | 'none'
  | 'logistics'
  | 'food'
  | 'construction'
  | 'military'
  | 'consumer'
  | 'ship-supply'
  | 'storage'
  | 'traffic'
  | 'needs'
  | 'workers'
  | 'fire'
  | 'defense'
  | 'housing';
export type WarningSeverity = 'info' | 'caution' | 'danger' | 'emergency';

export interface SettlementWarning {
  id: string;
  code: string;
  severity: WarningSeverity;
  title: string;
  detail: string;
  buildingId?: string;
  residentId?: string;
  createdAt: number;
  acknowledged: boolean;
}

export interface ShipConstructionOrder {
  id: string;
  shipClass: ShipClass;
  shipName: string;
  shipyardId: string;
  state: 'QUEUED' | 'BUILDING' | 'PAUSED' | 'BLOCKED' | 'COMPLETE';
  progress: number;
  reserved: PartialSettlementInventory;
  assignedShipwrights: string[];
  createdAt: number;
}

export type ExpeditionState =
  'PREPARING' | 'DEPARTING' | 'TRAVELING' | 'EVENT' | 'COMBAT' | 'RETURNING' | 'COMPLETED' | 'LOST';

export interface ExpeditionNavalCombat {
  turn: number;
  playerHull: number;
  playerHullMax: number;
  enemyHull: number;
  enemyHullMax: number;
  enemySails: number;
  enemyMorale: number;
  ammo: number;
  windAngle: number;
  range: 'far' | 'broadside' | 'boarding';
  repairCharges: number;
  log: string[];
}

export interface StrategicExpedition {
  id: string;
  name: string;
  state: ExpeditionState;
  zoneId: ZoneId;
  purpose?: 'explore' | 'raid' | 'trade' | 'rescue';
  missionId?: string;
  shipIds: string[];
  captainIds: string[];
  crewIds: string[];
  supplies: PartialSettlementInventory;
  cargo: PartialSettlementInventory;
  routeProgress: number;
  durationHours: number;
  risk: number;
  morale: number;
  currentEventId?: string;
  combat?: ExpeditionNavalCombat;
  casualties?: number;
  lostShipNames?: string[];
  log: string[];
  departedAt?: number;
  returnsAt?: number;
}

export type ProgressAxis = 'infamy' | 'prosperity' | 'seamanship' | 'federation';
export type PolicyCategory = 'loot' | 'labor' | 'food' | 'prisoners' | 'diplomacy';

export interface SettlementProgression {
  points: Record<ProgressAxis, number>;
  unlocked: string[];
}

export interface SettlementPolicies {
  active: Partial<Record<PolicyCategory, string>>;
}

export interface InvasionThreat {
  active: boolean;
  source: 'imperial-navy' | 'red-tide' | 'bounty-hunters';
  discovered: boolean;
  strength: number;
  etaHours: number;
  fleetDescription: string;
}

export interface SettlementStatistics {
  produced: PartialSettlementInventory;
  consumed: PartialSettlementInventory;
  delivered: PartialSettlementInventory;
  lost: PartialSettlementInventory;
  completedBuildings: number;
  cacheHits: number;
  cacheMisses: number;
}

export interface SettlementSimulationState {
  schemaVersion: 1;
  simulationMinutes: number;
  speed: 0 | 1 | 2 | 3;
  lastTickAt: number;
  island: IslandMapState;
  buildings: SettlementBuilding[];
  residents: Resident[];
  prisoners: number;
  transports: TransportJob[];
  workforce: WorkforceRule[];
  looseInventory: PartialSettlementInventory;
  shipConstruction: ShipConstructionOrder[];
  expeditions: StrategicExpedition[];
  progression: SettlementProgression;
  policies: SettlementPolicies;
  threat: InvasionThreat;
  warnings: SettlementWarning[];
  residentUpdateCursor: number;
  overlay: SettlementOverlay;
  statistics: SettlementStatistics;
  tutorialStep: number;
  weather: 'clear' | 'rain' | 'storm' | 'fog';
}
