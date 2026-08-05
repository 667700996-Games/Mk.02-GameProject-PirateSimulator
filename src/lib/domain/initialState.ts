import { SETTLEMENTS, SHIP_CLASSES } from './catalog';
import { createId } from './rng';
import {
  SAVE_VERSION,
  type CaptainProfile,
  type FactionId,
  type FactionRelation,
  type GameSettings,
  type GameState,
  type Mission,
  type NewGameOptions,
  type ResourceStock,
  type Ship,
  type ShipUpgrades,
  type ZoneId,
  type ZoneState
} from './types';

export const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 0.8,
  musicVolume: 0.58,
  effectsVolume: 0.82,
  ambienceVolume: 0.72,
  reducedMotion: false,
  screenShake: true,
  quality: 'high',
  showDamageNumbers: true,
  keyBindings: {
    sailUp: 'KeyW',
    sailDown: 'KeyS',
    steerLeft: 'KeyA',
    steerRight: 'KeyD',
    aimPort: 'KeyQ',
    aimStarboard: 'KeyE',
    fire: 'Space',
    nextTarget: 'Tab',
    map: 'KeyM',
    ship: 'KeyI',
    crew: 'KeyC',
    haven: 'KeyB',
    pause: 'Escape'
  }
};

const STARTING_RESOURCES: ResourceStock = {
  gold: 520,
  timber: 24,
  iron: 8,
  stone: 6,
  powder: 16,
  cannonballs: 38,
  cloth: 8,
  rope: 12,
  food: 64,
  rum: 12,
  medicine: 3,
  spices: 0,
  gems: 0,
  bullion: 0,
  contraband: 0,
  blueprints: 0,
  relics: 0
};

const EMPTY_UPGRADES: ShipUpgrades = {
  hull: 0,
  sails: 0,
  mast: 0,
  rudder: 0,
  cannons: 0,
  magazine: 0,
  quarters: 0,
  hold: 0,
  armor: 0,
  figurehead: 0,
  cabin: 0
};

function cloneStartingShip(name: string): Ship {
  const stats = structuredClone(SHIP_CLASSES.sloop.stats);
  return {
    id: createId('ship'),
    name,
    class: 'sloop',
    stats,
    upgrades: { ...EMPTY_UPGRADES },
    hull: stats.hullMax,
    sails: stats.sailMax,
    crew: 14,
    morale: 72,
    cargo: { food: 24, cannonballs: 24, powder: 10, rum: 4 },
    cargoWeight: 64,
    cannonCondition: 100,
    rudderCondition: 100,
    fire: 0,
    flooding: 0,
    isFlagship: true,
    isCaptured: false
  };
}

function createFactions(now: number): Record<FactionId, FactionRelation> {
  const relation = (factionId: FactionId, favor = 0, hostility = 0, respect = 0): FactionRelation => ({
    factionId,
    favor,
    hostility,
    fear: 0,
    respect,
    tradeAllowed: hostility < 70,
    lastChangedAt: now
  });
  return {
    'imperial-navy': relation('imperial-navy', -15, 18),
    'merchant-league': relation('merchant-league', -5, 5),
    'colonial-alliance': relation('colonial-alliance'),
    'free-pirates': relation('free-pirates', 18, 0, 8),
    'smugglers-guild': relation('smugglers-guild', 8),
    'red-tide': relation('red-tide', -20, 28),
    'bounty-hunters': relation('bounty-hunters', -8, 10),
    'isle-kin': relation('isle-kin', 10)
  };
}

function createZones(): Record<ZoneId, ZoneState> {
  return {
    'beginners-bay': { id: 'beginners-bay', discovered: true, intel: 72, dangerModifier: 1 },
    'merchant-routes': { id: 'merchant-routes', discovered: true, intel: 34, dangerModifier: 1 },
    'mist-archipelago': { id: 'mist-archipelago', discovered: false, intel: 0, dangerModifier: 1 },
    'naval-patrol': { id: 'naval-patrol', discovered: false, intel: 0, dangerModifier: 1 },
    'storm-reach': { id: 'storm-reach', discovered: false, intel: 0, dangerModifier: 1 },
    'freeport-waters': { id: 'freeport-waters', discovered: true, intel: 45, dangerModifier: 1 },
    'imperial-heartway': { id: 'imperial-heartway', discovered: false, intel: 0, dangerModifier: 1 },
    'legend-sea': { id: 'legend-sea', discovered: false, intel: 0, dangerModifier: 1 }
  };
}

function createMissions(): Mission[] {
  return [
    {
      id: 'story-first-prize',
      title: '첫 번째 전리품',
      description: '소금바람 마을로 가는 무장하지 않은 상선을 찾아 화물을 빼앗고 살아서 귀환하라.',
      type: 'merchant-raid',
      status: 'active',
      zoneId: 'beginners-bay',
      reward: { gold: 240, timber: 20, food: 25 },
      renownReward: 22,
      progress: 0,
      goal: 1,
      story: true
    },
    {
      id: 'rum-for-liberty',
      title: '자유의 술값',
      description: '자유항의 선술집 주인에게 럼주 8통을 전달하라.',
      type: 'smuggling',
      status: 'available',
      zoneId: 'freeport-waters',
      targetId: 'liberty-cove',
      reward: { gold: 180, medicine: 4 },
      renownReward: 10,
      progress: 0,
      goal: 8,
      story: false
    }
  ];
}

export function createNewGame(options: NewGameOptions, now = Date.now()): GameState {
  const captain: CaptainProfile = {
    id: createId('captain'),
    name: options.captainName.trim(),
    crewName: options.crewName.trim(),
    flagMark: options.flagMark,
    flagColor: options.flagColor,
    trait: options.trait,
    difficulty: options.difficulty,
    level: 1,
    experience: 0,
    renown: 0,
    infamy: 0,
    createdAt: now
  };
  const ship = cloneStartingShip(options.shipName.trim());
  const seed = options.seed ?? Math.floor(Math.random() * 2_147_483_647);
  const saveId = createId('save');

  return {
    version: SAVE_VERSION,
    saveId,
    saveName: `${captain.name} 선장의 항해`,
    lastSavedAt: now,
    playTimeSeconds: 0,
    screen: 'haven',
    paused: false,
    captain,
    resources: { ...STARTING_RESOURCES },
    crew: {
      roles: { deckhand: 5, gunner: 3, navigator: 1, marine: 3, carpenter: 1, medic: 0, cook: 1 },
      morale: 72,
      fatigue: 8,
      loyalty: 58,
      wounded: 0,
      unpaidDays: 0,
      shareRate: 18
    },
    officers: [
      { id: createId('officer'), name: '마라 벨', role: 'first-mate', rank: 1, skill: 32, trait: '냉정한 판단', loyalty: 64, morale: 70, fatigue: 6, wounded: false, wage: 18, ambition: 42 }
    ],
    ships: [ship],
    activeShipId: ship.id,
    fleet: {
      formation: 'line-ahead',
      autoEngage: false,
      retreatHullPercent: 28,
      assignments: [],
      victories: 0,
      shipsLost: 0
    },
    haven: {
      name: options.havenName?.trim() || '검은물결 은신처',
      tier: 1,
      population: 18,
      populationByRole: { fighters: 8, sailors: 4, gunners: 2, shipwrights: 1, smiths: 0, doctors: 0, merchants: 0, smugglers: 1, laborers: 2, prisoners: 0, civilians: 0, captains: 0 },
      food: 64,
      order: 58,
      morale: 61,
      sanitation: 42,
      defense: 12,
      production: 9,
      storageMax: 240,
      detectionRisk: 7,
      treasury: 220,
      facilities: {
        'captains-lodge': { id: 'captains-lodge', level: 1, condition: 100, workers: 2 },
        dock: { id: 'dock', level: 1, condition: 92, workers: 4 },
        warehouse: { id: 'warehouse', level: 1, condition: 88, workers: 3 },
        tavern: { id: 'tavern', level: 1, condition: 84, workers: 3 }
      },
      assignedDefenders: [],
      raidThreat: 0,
      nextUpkeepAt: now + 86_400_000
    },
    factions: createFactions(now),
    bounty: 0,
    heat: 0,
    missions: createMissions(),
    voyage: {
      active: false,
      zoneId: 'beginners-bay',
      originId: 'blackwake-haven',
      shipPosition: { x: 18, y: 72 },
      heading: -0.55,
      speed: 0,
      sailSetting: 0,
      windDirection: 1.9,
      windSpeed: 0.82,
      weather: 'clear',
      gameMinutes: 0,
      provisionsConsumed: 0,
      pursuit: 0
    },
    combat: { active: false, selectedAmmo: 'round-shot', portReload: 0, starboardReload: 0, bowReload: 0, sternReload: 0 },
    boarding: { active: false, committedCrew: 0, playerStrength: 0, enemyStrength: 0, round: 0, log: [] },
    raid: { active: false, phase: 'scouting', crewCommitted: 0, timeRemaining: 0, alarm: 0, selectedTargets: [], recoveredLoot: {}, casualties: 0 },
    defense: { active: false, attacker: 'red-tide', stage: 'warning', attackStrength: 0, defenseStrength: 0, timeToAttack: 0, attackerRemaining: 0, preparation: 0, civilianRisk: 0, selectedActions: [], log: [] },
    world: {
      day: 1,
      hour: 7.5,
      seed,
      zones: createZones(),
      settlements: structuredClone(SETTLEMENTS),
      marketCycle: 0,
      recentEvents: ['붉은 파도 해적단이 초보자의 만 북쪽에서 목격되었다.']
    },
    tutorialStep: 0,
    flags: { firstLaunch: true, metFreeport: false, builtShipyard: false },
    toasts: [
      { id: createId('toast'), kind: 'info', title: '첫 임무', detail: '부두에서 출항 준비를 마치고 초보자의 만으로 나가십시오.', createdAt: now }
    ]
  };
}
