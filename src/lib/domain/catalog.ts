import type {
  CaptainTrait,
  Difficulty,
  FacilityId,
  FactionId,
  ResourceId,
  ResourceStock,
  SettlementState,
  ShipClass,
  ShipStats,
  ZoneId
} from './types';

export interface TraitDefinition {
  id: CaptainTrait;
  name: string;
  title: string;
  description: string;
  icon: string;
}

export const TRAITS: TraitDefinition[] = [
  { id: 'navigator', name: '항해사', title: '바람을 읽는 자', description: '최고 속도 +8%, 선회 효율 +12%', icon: '✦' },
  { id: 'gunner', name: '포술가', title: '화약의 지휘자', description: '대포 피해 +10%, 재장전 속도 +8%', icon: '✹' },
  { id: 'negotiator', name: '협상가', title: '은빛 혀', description: '거래 가격 +10%, 항복 요구 성공률 증가', icon: '♜' },
  { id: 'raider', name: '약탈자', title: '빈 창고는 없다', description: '약탈 획득량 +15%, 상륙 철수 시간 증가', icon: '⚔' },
  { id: 'agitator', name: '선동가', title: '갑판의 목소리', description: '사기 감소 -25%, 승선 전투력 +8%', icon: '♞' },
  { id: 'smuggler', name: '밀수업자', title: '검은 장부', description: '탐지 위험 -15%, 암시장 가격 +12%', icon: '◆' },
  { id: 'architect', name: '건축가', title: '왕국의 설계자', description: '시설 비용 -12%, 건설 시간 -15%', icon: '⌂' },
  { id: 'admiral', name: '제독', title: '검은 함대', description: '함대 함선 공격·방어 효율 +10%', icon: '♛' }
];

export const DIFFICULTIES: Record<Difficulty, { name: string; description: string; enemy: number; rewards: number; autosave: boolean }> = {
  story: { name: '항해담', description: '관대한 경제와 약한 추격대', enemy: 0.72, rewards: 1.2, autosave: true },
  corsair: { name: '사략선장', description: '이야기와 전투의 균형', enemy: 0.9, rewards: 1.08, autosave: true },
  captain: { name: '해적선장', description: '의도된 전술과 경제 난이도', enemy: 1, rewards: 1, autosave: true },
  'black-flag': { name: '검은 깃발', description: '치명적인 전투와 가혹한 손실', enemy: 1.28, rewards: 0.92, autosave: true }
};

export const RESOURCE_META: Record<ResourceId, { name: string; icon: string; weight: number; basePrice: number; illegal?: boolean }> = {
  gold: { name: '금화', icon: '●', weight: 0, basePrice: 1 },
  timber: { name: '목재', icon: '▰', weight: 2, basePrice: 8 },
  iron: { name: '철', icon: '◆', weight: 2.5, basePrice: 14 },
  stone: { name: '석재', icon: '⬟', weight: 3, basePrice: 7 },
  powder: { name: '화약', icon: '✦', weight: 1, basePrice: 22 },
  cannonballs: { name: '포탄', icon: '●', weight: 1.5, basePrice: 10 },
  cloth: { name: '천', icon: '▧', weight: 0.7, basePrice: 12 },
  rope: { name: '밧줄', icon: '⌁', weight: 0.8, basePrice: 9 },
  food: { name: '식량', icon: '◒', weight: 1, basePrice: 5 },
  rum: { name: '럼주', icon: '♨', weight: 1, basePrice: 11 },
  medicine: { name: '의약품', icon: '✚', weight: 0.4, basePrice: 32 },
  spices: { name: '향신료', icon: '❖', weight: 0.3, basePrice: 46 },
  gems: { name: '보석', icon: '◇', weight: 0.1, basePrice: 95 },
  bullion: { name: '귀금속', icon: '▱', weight: 1, basePrice: 70 },
  contraband: { name: '밀수품', icon: '◈', weight: 0.6, basePrice: 58, illegal: true },
  blueprints: { name: '설계도', icon: '⌘', weight: 0, basePrice: 140, illegal: true },
  relics: { name: '유물', icon: '♢', weight: 0.5, basePrice: 220, illegal: true }
};

export interface ZoneDefinition {
  id: ZoneId;
  name: string;
  subtitle: string;
  difficulty: number;
  weather: string;
  wind: [number, number];
  merchantRate: number;
  navyRate: number;
  rareResources: ResourceId[];
  color: string;
  accent: string;
  musicMood: string;
  description: string;
}

export const ZONES: Record<ZoneId, ZoneDefinition> = {
  'beginners-bay': {
    id: 'beginners-bay', name: '초보자의 만', subtitle: '잔잔한 바다, 값싼 목숨', difficulty: 1, weather: '맑음', wind: [0.65, 1], merchantRate: 0.58, navyRate: 0.08, rareResources: ['rum'], color: '#1b5964', accent: '#8fc0b4', musicMood: 'calm', description: '얕은 바다와 작은 어촌이 흩어진 해적의 첫 사냥터.'
  },
  'merchant-routes': {
    id: 'merchant-routes', name: '상업 항로', subtitle: '비단과 화약의 길', difficulty: 2, weather: '산들바람', wind: [0.8, 1.25], merchantRate: 0.78, navyRate: 0.2, rareResources: ['spices', 'bullion'], color: '#1c6570', accent: '#d8b463', musicMood: 'adventure', description: '호송대를 노리는 자와 지키는 자가 매일 피를 흘리는 항로.'
  },
  'mist-archipelago': {
    id: 'mist-archipelago', name: '안개 군도', subtitle: '지도에 없는 섬들', difficulty: 3, weather: '짙은 해무', wind: [0.45, 0.9], merchantRate: 0.34, navyRate: 0.13, rareResources: ['contraband', 'relics'], color: '#304e50', accent: '#9bb2a3', musicMood: 'mystery', description: '암초와 밀수업자의 등불이 안개 속에서 함께 숨 쉰다.'
  },
  'naval-patrol': {
    id: 'naval-patrol', name: '군함 순찰 해역', subtitle: '제국의 푸른 장벽', difficulty: 4, weather: '강한 측풍', wind: [0.9, 1.4], merchantRate: 0.45, navyRate: 0.62, rareResources: ['powder', 'blueprints'], color: '#173c58', accent: '#d1d8cc', musicMood: 'tension', description: '제국 전투함이 대형을 유지하며 모든 깃발을 심문한다.'
  },
  'storm-reach': {
    id: 'storm-reach', name: '폭풍 해역', subtitle: '천둥이 왕인 곳', difficulty: 5, weather: '폭풍', wind: [1.2, 1.85], merchantRate: 0.18, navyRate: 0.12, rareResources: ['gems', 'relics'], color: '#162e3d', accent: '#9daec8', musicMood: 'storm', description: '번개와 거대한 파도가 난파선의 보물과 함께 기다린다.'
  },
  'freeport-waters': {
    id: 'freeport-waters', name: '자유항 주변', subtitle: '모든 깃발의 피난처', difficulty: 3, weather: '붉은 석양', wind: [0.7, 1.1], merchantRate: 0.5, navyRate: 0.05, rareResources: ['contraband', 'blueprints'], color: '#5b3e32', accent: '#e09b59', musicMood: 'port', description: '밀수선과 해적선이 중립의 횃불 아래 거래하는 혼돈의 항구.'
  },
  'imperial-heartway': {
    id: 'imperial-heartway', name: '제국 중심 항로', subtitle: '왕관의 황금 동맥', difficulty: 7, weather: '변덕스러운 돌풍', wind: [0.85, 1.5], merchantRate: 0.7, navyRate: 0.76, rareResources: ['gems', 'bullion', 'blueprints'], color: '#243c57', accent: '#dfc27d', musicMood: 'war', description: '전열함이 금괴 수송선을 에워싸는 가장 부유하고 위험한 바다.'
  },
  'legend-sea': {
    id: 'legend-sea', name: '전설의 바다', subtitle: '나침반이 거짓말하는 곳', difficulty: 10, weather: '검은 오로라', wind: [0.6, 1.7], merchantRate: 0.2, navyRate: 0.3, rareResources: ['relics', 'gems', 'blueprints'], color: '#251d3d', accent: '#64d7c5', musicMood: 'legend', description: '전설 함선과 보물섬이 살아 돌아온 선장만을 기억한다.'
  }
};

export interface FactionDefinition {
  id: FactionId;
  name: string;
  shortName: string;
  color: string;
  description: string;
}

export const FACTIONS: Record<FactionId, FactionDefinition> = {
  'imperial-navy': { id: 'imperial-navy', name: '아우렐리안 제국 해군', shortName: '제국 해군', color: '#7897b4', description: '해상 질서와 왕관의 무역을 대포로 수호한다.' },
  'merchant-league': { id: 'merchant-league', name: '황금나침반 상업 연합', shortName: '상업 연합', color: '#d0a856', description: '돈으로 함대를 사고 정보로 전쟁을 끝낸다.' },
  'colonial-alliance': { id: 'colonial-alliance', name: '식민 도시 연맹', shortName: '도시 연맹', color: '#b8775e', description: '서로 다투지만 외부 위협에는 하나로 뭉치는 항구 도시들.' },
  'free-pirates': { id: 'free-pirates', name: '검은닻 자유 해적 연합', shortName: '자유 해적', color: '#d1c3a1', description: '자유항의 규약 아래 느슨하게 결속한 해적단.' },
  'smugglers-guild': { id: 'smugglers-guild', name: '밤물결 밀수업자 길드', shortName: '밀수 길드', color: '#8f77ae', description: '국경과 봉쇄는 가격표가 붙은 불편일 뿐이다.' },
  'red-tide': { id: 'red-tide', name: '붉은 파도 해적단', shortName: '붉은 파도', color: '#b24a3c', description: '약한 해적을 사냥하며 세력을 키우는 잔혹한 경쟁자.' },
  'bounty-hunters': { id: 'bounty-hunters', name: '은갈고리 현상금 사냥꾼', shortName: '은갈고리', color: '#a9aa9e', description: '계약이 유효한 동안 바다 끝까지 표적을 뒤쫓는다.' },
  'isle-kin': { id: 'isle-kin', name: '마라카이 독립 섬 부족', shortName: '마라카이', color: '#70a873', description: '오래된 항로와 폭풍의 징조를 기억하는 섬사람들.' }
};

export interface ShipClassDefinition {
  id: ShipClass;
  name: string;
  description: string;
  stats: ShipStats;
  price: number;
  unlockRenown: number;
}

export const SHIP_CLASSES: Record<ShipClass, ShipClassDefinition> = {
  boat: { id: 'boat', name: '소형 보트', description: '눈에 띄지 않지만 전투에는 취약하다.', stats: { hullMax: 70, sailMax: 55, speedMax: 6.4, acceleration: 1.3, turnRate: 1.65, cargoMax: 28, crewMax: 10, cannonSlots: 2, armor: 0, stealth: 80, upkeep: 5 }, price: 400, unlockRenown: 0 },
  sloop: { id: 'sloop', name: '슬루프', description: '빠른 선회와 얕은 흘수로 초반 습격에 이상적이다.', stats: { hullMax: 130, sailMax: 100, speedMax: 7.4, acceleration: 1.15, turnRate: 1.45, cargoMax: 60, crewMax: 24, cannonSlots: 6, armor: 4, stealth: 65, upkeep: 14 }, price: 1200, unlockRenown: 0 },
  schooner: { id: 'schooner', name: '스쿠너', description: '속도와 적재량의 균형이 좋은 장거리 사냥꾼.', stats: { hullMax: 190, sailMax: 140, speedMax: 7.8, acceleration: 1.08, turnRate: 1.3, cargoMax: 95, crewMax: 36, cannonSlots: 10, armor: 6, stealth: 57, upkeep: 24 }, price: 3100, unlockRenown: 80 },
  brig: { id: 'brig', name: '브리그', description: '튼튼하고 직선 속도가 좋은 전투 상선.', stats: { hullMax: 285, sailMax: 195, speedMax: 7, acceleration: 0.92, turnRate: 1.03, cargoMax: 135, crewMax: 58, cannonSlots: 16, armor: 10, stealth: 43, upkeep: 38 }, price: 6500, unlockRenown: 180 },
  brigantine: { id: 'brigantine', name: '브리간틴', description: '강력한 측면 화력과 추격 성능을 갖춘 해적의 칼.', stats: { hullMax: 350, sailMax: 230, speedMax: 7.25, acceleration: 0.9, turnRate: 0.98, cargoMax: 160, crewMax: 72, cannonSlots: 22, armor: 12, stealth: 38, upkeep: 52 }, price: 9800, unlockRenown: 320 },
  frigate: { id: 'frigate', name: '프리깃', description: '해군도 두려워하는 고속 대형 전투함.', stats: { hullMax: 520, sailMax: 310, speedMax: 7.1, acceleration: 0.75, turnRate: 0.76, cargoMax: 210, crewMax: 120, cannonSlots: 34, armor: 18, stealth: 24, upkeep: 90 }, price: 18500, unlockRenown: 600 },
  galleon: { id: 'galleon', name: '갤리온', description: '느리지만 거대한 화물창과 두꺼운 선체를 가졌다.', stats: { hullMax: 720, sailMax: 370, speedMax: 5.7, acceleration: 0.55, turnRate: 0.54, cargoMax: 430, crewMax: 180, cannonSlots: 42, armor: 28, stealth: 10, upkeep: 135 }, price: 32000, unlockRenown: 950 },
  'ship-of-the-line': { id: 'ship-of-the-line', name: '전열함', description: '바다 위의 움직이는 요새.', stats: { hullMax: 1100, sailMax: 520, speedMax: 5.4, acceleration: 0.42, turnRate: 0.4, cargoMax: 320, crewMax: 280, cannonSlots: 74, armor: 42, stealth: 2, upkeep: 240 }, price: 68000, unlockRenown: 1600 },
  legendary: { id: 'legendary', name: '전설 함선', description: '폭풍과 대포를 비웃는 이름 없는 고대 함선.', stats: { hullMax: 1500, sailMax: 760, speedMax: 7.2, acceleration: 0.78, turnRate: 0.75, cargoMax: 500, crewMax: 360, cannonSlots: 88, armor: 52, stealth: 34, upkeep: 320 }, price: 120000, unlockRenown: 3000 }
};

export interface FacilityDefinition {
  id: FacilityId;
  name: string;
  shortDescription: string;
  icon: string;
  maxLevel: number;
  workersPerLevel: number;
  baseCost: Partial<ResourceStock>;
  prerequisite?: { id: FacilityId; level: number };
  unlockTier: number;
  category: 'command' | 'naval' | 'economy' | 'crew' | 'defense' | 'covert';
}

export const FACILITIES: Record<FacilityId, FacilityDefinition> = {
  'captains-lodge': { id: 'captains-lodge', name: '선장 관저', shortDescription: '본거지 정책과 임무를 지휘합니다.', icon: '♜', maxLevel: 7, workersPerLevel: 2, baseCost: { gold: 260, timber: 22, stone: 8 }, unlockTier: 1, category: 'command' },
  dock: { id: 'dock', name: '부두', shortDescription: '함선 정박·보급·함대 편성을 지원합니다.', icon: '⚓', maxLevel: 7, workersPerLevel: 4, baseCost: { gold: 220, timber: 36, rope: 14 }, unlockTier: 1, category: 'naval' },
  shipyard: { id: 'shipyard', name: '조선소', shortDescription: '함선을 수리하고 건조·개조합니다.', icon: '◢', maxLevel: 6, workersPerLevel: 8, baseCost: { gold: 480, timber: 58, iron: 18, rope: 12 }, prerequisite: { id: 'dock', level: 1 }, unlockTier: 2, category: 'naval' },
  forge: { id: 'forge', name: '대장간', shortDescription: '대포와 장비, 탄약을 제작합니다.', icon: '⚒', maxLevel: 6, workersPerLevel: 6, baseCost: { gold: 360, timber: 18, iron: 34, stone: 16 }, unlockTier: 2, category: 'naval' },
  'powder-magazine': { id: 'powder-magazine', name: '화약고', shortDescription: '화약 생산과 특수 탄약을 해금합니다.', icon: '✹', maxLevel: 5, workersPerLevel: 4, baseCost: { gold: 340, timber: 14, stone: 26, iron: 12, powder: 8 }, prerequisite: { id: 'forge', level: 1 }, unlockTier: 2, category: 'naval' },
  warehouse: { id: 'warehouse', name: '창고', shortDescription: '자원 저장량과 화재·도난 저항을 높입니다.', icon: '▤', maxLevel: 7, workersPerLevel: 5, baseCost: { gold: 240, timber: 42, stone: 12, rope: 8 }, unlockTier: 1, category: 'economy' },
  tavern: { id: 'tavern', name: '선술집', shortDescription: '선원과 장교를 모집하고 사기를 회복합니다.', icon: '♨', maxLevel: 7, workersPerLevel: 5, baseCost: { gold: 300, timber: 32, cloth: 12, rum: 8 }, unlockTier: 1, category: 'crew' },
  infirmary: { id: 'infirmary', name: '의무실', shortDescription: '부상과 질병을 치료하고 사망률을 낮춥니다.', icon: '✚', maxLevel: 5, workersPerLevel: 5, baseCost: { gold: 420, timber: 24, cloth: 18, medicine: 6 }, prerequisite: { id: 'tavern', level: 1 }, unlockTier: 2, category: 'crew' },
  'black-market': { id: 'black-market', name: '암시장', shortDescription: '장물과 금지품을 거래합니다.', icon: '◈', maxLevel: 6, workersPerLevel: 6, baseCost: { gold: 520, timber: 22, cloth: 15, contraband: 3 }, prerequisite: { id: 'warehouse', level: 1 }, unlockTier: 2, category: 'economy' },
  'intel-den': { id: 'intel-den', name: '정보상 거점', shortDescription: '항로·방어·추격대 정보를 제공합니다.', icon: '◉', maxLevel: 6, workersPerLevel: 4, baseCost: { gold: 460, timber: 18, cloth: 14, spices: 4 }, unlockTier: 2, category: 'covert' },
  prison: { id: 'prison', name: '포로 수용소', shortDescription: '포로 몸값, 전향과 정보 획득을 지원합니다.', icon: '▥', maxLevel: 5, workersPerLevel: 4, baseCost: { gold: 400, timber: 30, iron: 24, stone: 20 }, unlockTier: 3, category: 'crew' },
  'training-yard': { id: 'training-yard', name: '훈련장', shortDescription: '포술·항해·승선 전투력을 높입니다.', icon: '⚔', maxLevel: 6, workersPerLevel: 7, baseCost: { gold: 540, timber: 36, iron: 20, food: 18 }, prerequisite: { id: 'tavern', level: 2 }, unlockTier: 3, category: 'crew' },
  'coastal-battery': { id: 'coastal-battery', name: '방어 포대', shortDescription: '침공 함대에 해안 포격을 가합니다.', icon: '☄', maxLevel: 7, workersPerLevel: 8, baseCost: { gold: 740, timber: 28, iron: 42, stone: 48, powder: 14 }, prerequisite: { id: 'forge', level: 2 }, unlockTier: 3, category: 'defense' },
  watchtower: { id: 'watchtower', name: '감시탑', shortDescription: '기습을 막고 주변 해역 시야를 넓힙니다.', icon: '♝', maxLevel: 6, workersPerLevel: 3, baseCost: { gold: 310, timber: 38, stone: 14, rope: 10 }, unlockTier: 2, category: 'defense' },
  'hidden-dock': { id: 'hidden-dock', name: '은신 부두', shortDescription: '함선 은폐와 비밀 출항을 지원합니다.', icon: '◒', maxLevel: 5, workersPerLevel: 5, baseCost: { gold: 680, timber: 52, stone: 36, rope: 24, contraband: 4 }, prerequisite: { id: 'dock', level: 3 }, unlockTier: 4, category: 'covert' },
  'pirate-council': { id: 'pirate-council', name: '해적 의회', shortDescription: '동맹·전쟁·세금과 부하 선장을 관리합니다.', icon: '♛', maxLevel: 4, workersPerLevel: 6, baseCost: { gold: 1200, timber: 64, stone: 72, cloth: 28, blueprints: 1 }, prerequisite: { id: 'captains-lodge', level: 4 }, unlockTier: 5, category: 'command' }
};

const price = (multipliers: Partial<Record<ResourceId, number>> = {}): Partial<ResourceStock> =>
  Object.fromEntries(
    Object.entries(RESOURCE_META).map(([id, meta]) => [id, Math.round(meta.basePrice * (multipliers[id as ResourceId] ?? 1))])
  ) as Partial<ResourceStock>;

export const SETTLEMENTS: SettlementState[] = [
  { id: 'blackwake-haven', name: '검은물결 은신처', type: 'player-haven', zoneId: 'beginners-bay', factionId: 'player', population: 18, defense: 12, garrison: 10, economy: 10, produces: ['food', 'timber'], prices: price({ timber: 0.8, food: 0.9 }), loot: {}, alert: 0, attitude: 100, discovered: true, position: { x: 18, y: 72 } },
  { id: 'liberty-cove', name: '자유항 리버티 코브', type: 'freeport', zoneId: 'freeport-waters', factionId: 'free-pirates', population: 8400, defense: 82, garrison: 1100, economy: 92, produces: ['rum', 'contraband', 'blueprints'], prices: price({ contraband: 0.78, rum: 0.75, blueprints: 0.9 }), loot: { gold: 8000, rum: 300, contraband: 120 }, alert: 12, attitude: 25, discovered: true, currentEvent: '검은 돛 경매 주간', position: { x: 49, y: 58 } },
  { id: 'golden-quay', name: '황금부두 산타 벨라', type: 'trade-city', zoneId: 'merchant-routes', factionId: 'merchant-league', population: 16400, defense: 68, garrison: 1800, economy: 100, produces: ['spices', 'cloth', 'bullion'], prices: price({ spices: 0.72, cloth: 0.82, bullion: 0.9, food: 1.35 }), loot: { gold: 12000, spices: 380, cloth: 260, bullion: 90 }, alert: 26, attitude: -10, discovered: false, position: { x: 35, y: 38 } },
  { id: 'crown-fort', name: '왕관항 세인트 오렐', type: 'military-port', zoneId: 'naval-patrol', factionId: 'imperial-navy', population: 11200, defense: 93, garrison: 3200, economy: 76, produces: ['powder', 'cannonballs', 'iron'], prices: price({ powder: 0.65, cannonballs: 0.7, iron: 0.78 }), loot: { gold: 9000, powder: 420, cannonballs: 650, iron: 300, blueprints: 4 }, alert: 56, attitude: -70, discovered: false, position: { x: 67, y: 27 } },
  { id: 'saltwind', name: '소금바람 마을', type: 'coastal-village', zoneId: 'beginners-bay', factionId: 'colonial-alliance', population: 720, defense: 18, garrison: 74, economy: 32, produces: ['food', 'cloth', 'rope'], prices: price({ food: 0.62, cloth: 0.86, rope: 0.8 }), loot: { gold: 260, food: 90, cloth: 28, rope: 35 }, alert: 8, attitude: 5, discovered: true, currentEvent: '추수 축제 준비', position: { x: 28, y: 68 } },
  { id: 'turtle-net', name: '거북그물 어촌', type: 'fishing-village', zoneId: 'beginners-bay', factionId: 'isle-kin', population: 360, defense: 9, garrison: 32, economy: 20, produces: ['food', 'medicine'], prices: price({ food: 0.5, medicine: 0.9 }), loot: { gold: 120, food: 65, medicine: 8 }, alert: 2, attitude: 18, discovered: true, position: { x: 12, y: 82 } },
  { id: 'whisper-key', name: '속삭임 암초 은신처', type: 'smuggler-hideout', zoneId: 'mist-archipelago', factionId: 'smugglers-guild', population: 540, defense: 38, garrison: 150, economy: 61, produces: ['contraband', 'medicine', 'spices'], prices: price({ contraband: 0.68, medicine: 0.8, spices: 0.92 }), loot: { gold: 1900, contraband: 140, medicine: 50 }, alert: 20, attitude: 10, discovered: false, position: { x: 46, y: 34 } },
  { id: 'grey-anvil', name: '회색모루 조선소', type: 'neutral-shipyard', zoneId: 'merchant-routes', factionId: 'neutral', population: 880, defense: 42, garrison: 180, economy: 78, produces: ['timber', 'iron', 'rope'], prices: price({ timber: 0.72, iron: 0.8, rope: 0.76 }), loot: { gold: 2200, timber: 280, iron: 120, rope: 90, blueprints: 2 }, alert: 16, attitude: 0, discovered: false, position: { x: 41, y: 48 } },
  { id: 'hollow-citadel', name: '텅 빈 성채', type: 'abandoned-fort', zoneId: 'mist-archipelago', factionId: 'neutral', population: 0, defense: 54, garrison: 0, economy: 0, produces: [], prices: {}, loot: { stone: 260, iron: 80, relics: 2 }, alert: 0, attitude: 0, discovered: false, currentEvent: '밤마다 포대에 불이 켜진다', position: { x: 54, y: 31 } },
  { id: 'gull-isle', name: '갈매기섬', type: 'deserted-island', zoneId: 'storm-reach', factionId: 'neutral', population: 0, defense: 3, garrison: 0, economy: 0, produces: ['food'], prices: {}, loot: { food: 35, gems: 4 }, alert: 0, attitude: 0, discovered: false, position: { x: 73, y: 62 } },
  { id: 'broken-masts', name: '부러진 돛대 해역', type: 'wreck-site', zoneId: 'storm-reach', factionId: 'neutral', population: 0, defense: 0, garrison: 0, economy: 0, produces: [], prices: {}, loot: { timber: 180, iron: 90, bullion: 28, relics: 1 }, alert: 0, attitude: 0, discovered: false, currentEvent: '폭풍이 오래된 선체를 드러냈다', position: { x: 77, y: 49 } },
  { id: 'admirals-rest', name: '제독의 쉼터 보급기지', type: 'naval-base', zoneId: 'imperial-heartway', factionId: 'imperial-navy', population: 6700, defense: 100, garrison: 4700, economy: 84, produces: ['powder', 'cannonballs', 'food'], prices: price({ powder: 0.7, cannonballs: 0.65, food: 0.82 }), loot: { gold: 16000, powder: 700, cannonballs: 1100, blueprints: 8 }, alert: 80, attitude: -100, discovered: false, position: { x: 83, y: 19 } },
  { id: 'sable-crown', name: '검은 왕관 보물섬', type: 'treasure-island', zoneId: 'legend-sea', factionId: 'neutral', population: 0, defense: 88, garrison: 0, economy: 0, produces: [], prices: {}, loot: { gold: 50000, gems: 280, bullion: 400, relics: 12, blueprints: 5 }, alert: 0, attitude: 0, discovered: false, currentEvent: '일곱 개의 봉인이 길을 막고 있다', position: { x: 92, y: 8 } }
];
