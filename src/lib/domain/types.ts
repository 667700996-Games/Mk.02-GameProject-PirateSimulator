export const SAVE_VERSION = 2;

export type GameScreen =
  | 'title'
  | 'captain-creation'
  | 'haven'
  | 'freeport'
  | 'world-map'
  | 'sailing'
  | 'boarding'
  | 'raid'
  | 'defense'
  | 'shipyard'
  | 'fleet'
  | 'crew'
  | 'trade'
  | 'missions'
  | 'factions'
  | 'settings';

export type Difficulty = 'story' | 'corsair' | 'captain' | 'black-flag';
export type CaptainTrait =
  | 'navigator'
  | 'gunner'
  | 'negotiator'
  | 'raider'
  | 'agitator'
  | 'smuggler'
  | 'architect'
  | 'admiral';

export type ResourceId =
  | 'gold'
  | 'timber'
  | 'iron'
  | 'stone'
  | 'powder'
  | 'cannonballs'
  | 'cloth'
  | 'rope'
  | 'food'
  | 'rum'
  | 'medicine'
  | 'spices'
  | 'gems'
  | 'bullion'
  | 'contraband'
  | 'blueprints'
  | 'relics';

export type ResourceStock = Record<ResourceId, number>;
export type FactionId =
  | 'imperial-navy'
  | 'merchant-league'
  | 'colonial-alliance'
  | 'free-pirates'
  | 'smugglers-guild'
  | 'red-tide'
  | 'bounty-hunters'
  | 'isle-kin';
export type ZoneId =
  | 'beginners-bay'
  | 'merchant-routes'
  | 'mist-archipelago'
  | 'naval-patrol'
  | 'storm-reach'
  | 'freeport-waters'
  | 'imperial-heartway'
  | 'legend-sea';

export interface CaptainProfile {
  id: string;
  name: string;
  crewName: string;
  flagMark: string;
  flagColor: string;
  trait: CaptainTrait;
  difficulty: Difficulty;
  level: number;
  experience: number;
  renown: number;
  infamy: number;
  createdAt: number;
}

export type ShipClass =
  | 'boat'
  | 'sloop'
  | 'schooner'
  | 'brig'
  | 'brigantine'
  | 'frigate'
  | 'galleon'
  | 'ship-of-the-line'
  | 'legendary';

export interface ShipStats {
  hullMax: number;
  sailMax: number;
  speedMax: number;
  acceleration: number;
  turnRate: number;
  cargoMax: number;
  crewMax: number;
  cannonSlots: number;
  armor: number;
  stealth: number;
  upkeep: number;
}

export interface ShipUpgrades {
  hull: number;
  sails: number;
  mast: number;
  rudder: number;
  cannons: number;
  magazine: number;
  quarters: number;
  hold: number;
  armor: number;
  figurehead: number;
  cabin: number;
}

export interface Ship {
  id: string;
  name: string;
  class: ShipClass;
  stats: ShipStats;
  upgrades: ShipUpgrades;
  hull: number;
  sails: number;
  crew: number;
  morale: number;
  cargo: Partial<ResourceStock>;
  cargoWeight: number;
  cannonCondition: number;
  rudderCondition: number;
  fire: number;
  flooding: number;
  captainId?: string;
  isFlagship: boolean;
  isCaptured: boolean;
}

export type CrewRole = 'deckhand' | 'gunner' | 'navigator' | 'marine' | 'carpenter' | 'medic' | 'cook';
export type OfficerRole = 'first-mate' | 'sailing-master' | 'master-gunner' | 'boatswain' | 'surgeon' | 'quartermaster' | 'spymaster';

export interface CrewRoster {
  roles: Record<CrewRole, number>;
  morale: number;
  fatigue: number;
  loyalty: number;
  wounded: number;
  unpaidDays: number;
  shareRate: number;
}

export interface Officer {
  id: string;
  name: string;
  role: OfficerRole;
  rank: number;
  skill: number;
  trait: string;
  loyalty: number;
  morale: number;
  fatigue: number;
  wounded: boolean;
  wage: number;
  ambition: number;
  isCaptain?: boolean;
  assignedShipId?: string;
}

export type FleetFormation = 'line-ahead' | 'line-abreast' | 'crescent' | 'wolf-pack' | 'scatter';
export type FleetOrderType = 'patrol' | 'raid' | 'escort' | 'smuggle' | 'scout' | 'defend';

export interface FleetAssignment {
  id: string;
  shipId: string;
  captainId: string;
  order: FleetOrderType;
  zoneId: ZoneId;
  status: 'preparing' | 'underway' | 'returning' | 'complete' | 'failed' | 'deserted';
  issuedAt: number;
  resolvesAt: number;
  progress: number;
  risk: number;
  log: string[];
  reward: Partial<ResourceStock>;
  damage: number;
}

export interface FleetState {
  formation: FleetFormation;
  autoEngage: boolean;
  retreatHullPercent: number;
  assignments: FleetAssignment[];
  victories: number;
  shipsLost: number;
}

export type FacilityId =
  | 'captains-lodge'
  | 'dock'
  | 'shipyard'
  | 'forge'
  | 'powder-magazine'
  | 'warehouse'
  | 'tavern'
  | 'infirmary'
  | 'black-market'
  | 'intel-den'
  | 'prison'
  | 'training-yard'
  | 'coastal-battery'
  | 'watchtower'
  | 'hidden-dock'
  | 'pirate-council';

export interface FacilityState {
  id: FacilityId;
  level: number;
  condition: number;
  workers: number;
  constructionEndsAt?: number;
}

export interface HavenState {
  name: string;
  tier: number;
  population: number;
  populationByRole: {
    fighters: number;
    sailors: number;
    gunners: number;
    shipwrights: number;
    smiths: number;
    doctors: number;
    merchants: number;
    smugglers: number;
    laborers: number;
    prisoners: number;
    civilians: number;
    captains: number;
  };
  food: number;
  order: number;
  morale: number;
  sanitation: number;
  defense: number;
  production: number;
  storageMax: number;
  detectionRisk: number;
  treasury: number;
  facilities: Partial<Record<FacilityId, FacilityState>>;
  assignedDefenders: string[];
  raidThreat: number;
  nextUpkeepAt: number;
}

export interface FactionRelation {
  factionId: FactionId;
  favor: number;
  hostility: number;
  fear: number;
  respect: number;
  tradeAllowed: boolean;
  lastChangedAt: number;
}

export type SettlementType =
  | 'player-haven'
  | 'freeport'
  | 'trade-city'
  | 'military-port'
  | 'coastal-village'
  | 'fishing-village'
  | 'smuggler-hideout'
  | 'neutral-shipyard'
  | 'abandoned-fort'
  | 'deserted-island'
  | 'wreck-site'
  | 'naval-base'
  | 'treasure-island';

export interface SettlementState {
  id: string;
  name: string;
  type: SettlementType;
  zoneId: ZoneId;
  factionId: FactionId | 'player' | 'neutral';
  population: number;
  defense: number;
  garrison: number;
  economy: number;
  produces: ResourceId[];
  prices: Partial<ResourceStock>;
  loot: Partial<ResourceStock>;
  alert: number;
  attitude: number;
  discovered: boolean;
  currentEvent?: string;
  position: { x: number; y: number };
}

export interface ZoneState {
  id: ZoneId;
  discovered: boolean;
  intel: number;
  dangerModifier: number;
}

export type MissionType =
  | 'merchant-raid'
  | 'convoy'
  | 'cargo-theft'
  | 'rescue'
  | 'treasure'
  | 'rival-hunt'
  | 'kidnap'
  | 'smuggling'
  | 'haven-defense'
  | 'freeport-dispute'
  | 'village-raid'
  | 'fort-assault'
  | 'legendary-hunt';

export interface Mission {
  id: string;
  title: string;
  description: string;
  type: MissionType;
  status: 'available' | 'active' | 'complete' | 'failed';
  zoneId: ZoneId;
  targetId?: string;
  reward: Partial<ResourceStock>;
  renownReward: number;
  expiresAt?: number;
  progress: number;
  goal: number;
  story: boolean;
  issuerFactionId?: FactionId;
  difficulty?: number;
  claimed?: boolean;
}

export interface VoyageState {
  active: boolean;
  zoneId: ZoneId;
  originId: string;
  destinationId?: string;
  shipPosition: { x: number; y: number };
  heading: number;
  speed: number;
  sailSetting: number;
  windDirection: number;
  windSpeed: number;
  weather: 'clear' | 'rain' | 'fog' | 'storm';
  gameMinutes: number;
  provisionsConsumed: number;
  pursuit: number;
  currentEncounter?: EncounterState;
}

export type EncounterType = 'merchant' | 'navy' | 'pirate' | 'wreck' | 'storm' | 'survivor' | 'smuggler' | 'ambush';

export interface EncounterState {
  id: string;
  type: EncounterType;
  title: string;
  description: string;
  threat: number;
  enemyShip?: Ship;
  distance: number;
  resolved: boolean;
}

export interface CombatSnapshot {
  active: boolean;
  enemyShipId?: string;
  selectedAmmo: AmmoType;
  portReload: number;
  starboardReload: number;
  bowReload: number;
  sternReload: number;
  lastResult?: CombatResult;
}

export type AmmoType = 'round-shot' | 'chain-shot' | 'grape-shot' | 'incendiary' | 'piercing';

export interface CombatResult {
  outcome: 'victory' | 'defeat' | 'escaped' | 'surrendered' | 'captured';
  enemyName: string;
  loot: Partial<ResourceStock>;
  casualties: number;
  renown: number;
  bounty: number;
}

export interface BoardingState {
  active: boolean;
  enemyShip?: Ship;
  committedCrew: number;
  playerStrength: number;
  enemyStrength: number;
  round: number;
  log: string[];
  outcome?: 'victory' | 'defeat' | 'retreat';
}

export interface RaidState {
  active: boolean;
  settlementId?: string;
  phase: 'scouting' | 'planning' | 'assault' | 'looting' | 'escape' | 'complete';
  crewCommitted: number;
  timeRemaining: number;
  alarm: number;
  selectedTargets: string[];
  recoveredLoot: Partial<ResourceStock>;
  casualties: number;
}

export interface DefenseState {
  active: boolean;
  attacker: FactionId | 'red-tide';
  stage: 'warning' | 'preparation' | 'naval' | 'landing' | 'interior' | 'resolved';
  attackStrength: number;
  defenseStrength: number;
  timeToAttack: number;
  outcome?: 'victory' | 'defeat';
  damage?: string[];
  attackerRemaining?: number;
  preparation?: number;
  civilianRisk?: number;
  selectedActions?: string[];
  log?: string[];
  reward?: Partial<ResourceStock>;
}

export interface WorldState {
  day: number;
  hour: number;
  seed: number;
  zones: Record<ZoneId, ZoneState>;
  settlements: SettlementState[];
  marketCycle: number;
  recentEvents: string[];
}

export interface KeyBindings {
  sailUp: string;
  sailDown: string;
  steerLeft: string;
  steerRight: string;
  aimPort: string;
  aimStarboard: string;
  fire: string;
  nextTarget: string;
  map: string;
  ship: string;
  crew: string;
  haven: string;
  pause: string;
}

export interface GameSettings {
  masterVolume: number;
  musicVolume: number;
  effectsVolume: number;
  ambienceVolume: number;
  reducedMotion: boolean;
  screenShake: boolean;
  quality: 'low' | 'medium' | 'high';
  showDamageNumbers: boolean;
  keyBindings: KeyBindings;
}

export interface ToastMessage {
  id: string;
  kind: 'info' | 'success' | 'warning' | 'danger';
  title: string;
  detail: string;
  createdAt: number;
}

export interface GameState {
  version: number;
  saveId: string;
  saveName: string;
  lastSavedAt: number;
  playTimeSeconds: number;
  screen: GameScreen;
  previousScreen?: GameScreen;
  paused: boolean;
  captain: CaptainProfile;
  resources: ResourceStock;
  crew: CrewRoster;
  officers: Officer[];
  ships: Ship[];
  activeShipId: string;
  fleet: FleetState;
  haven: HavenState;
  factions: Record<FactionId, FactionRelation>;
  bounty: number;
  heat: number;
  missions: Mission[];
  voyage: VoyageState;
  combat: CombatSnapshot;
  boarding: BoardingState;
  raid: RaidState;
  defense: DefenseState;
  world: WorldState;
  tutorialStep: number;
  flags: Record<string, boolean>;
  toasts: ToastMessage[];
}

export interface NewGameOptions {
  captainName: string;
  crewName: string;
  shipName: string;
  havenName?: string;
  flagMark: string;
  flagColor: string;
  trait: CaptainTrait;
  difficulty: Difficulty;
  seed?: number;
}

export interface SaveRecord {
  id: string;
  name: string;
  version: number;
  updatedAt: number;
  playTimeSeconds: number;
  captainName: string;
  shipName: string;
  havenTier: number;
  state: GameState;
}
