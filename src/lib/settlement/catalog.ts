import type {
  BuildingCategory,
  JobId,
  PartialSettlementInventory,
  PopulationTier,
  SettlementBuildingId,
  SettlementResourceCategory,
  SettlementResourceId,
  TerrainType
} from './types';

export interface SettlementResourceDefinition {
  id: SettlementResourceId;
  name: string;
  category: SettlementResourceCategory;
  icon: string;
  stackSize: number;
  value: number;
  expeditionOnly?: boolean;
}

const resourceRows: SettlementResourceDefinition[] = [
  ['gold', '금화', 'basic', '●', 99999, 1], ['logs', '원목', 'basic', '▰', 120, 5], ['stone', '석재', 'basic', '⬟', 120, 5], ['iron-ore', '철광석', 'basic', '◆', 100, 8],
  ['copper-ore', '구리광석', 'basic', '◇', 100, 9], ['fiber', '섬유', 'basic', '⌁', 140, 5], ['water', '식수', 'basic', '◉', 180, 2], ['fish', '생선', 'basic', '◒', 100, 4],
  ['fruit', '과일', 'basic', '●', 100, 5], ['grain', '곡물', 'basic', '⋮', 120, 4], ['sulfur', '유황', 'basic', '✦', 80, 12], ['raw-meat', '생고기', 'basic', '◐', 80, 7],
  ['planks', '판자', 'processed', '▥', 100, 12], ['stone-blocks', '석재 블록', 'processed', '▦', 100, 12], ['iron-ingots', '철괴', 'processed', '▰', 80, 22],
  ['copper-ingots', '구리괴', 'processed', '▱', 80, 24], ['rope', '밧줄', 'processed', '⌁', 100, 13], ['cloth', '천', 'processed', '▧', 100, 16], ['leather', '가죽', 'processed', '▤', 80, 14],
  ['charcoal', '숯', 'processed', '◼', 100, 9], ['powder', '화약', 'processed', '✦', 80, 30], ['glass', '유리', 'processed', '◇', 60, 32], ['flour', '밀가루', 'processed', '◌', 100, 8],
  ['hardtack', '건빵', 'living', '◈', 120, 9], ['fish-stew', '생선 스튜', 'living', '♨', 80, 12], ['meat-dish', '육류 요리', 'living', '♨', 80, 16], ['rum', '럼', 'living', '♨', 80, 16],
  ['beer', '맥주', 'living', '♨', 80, 12], ['clothes', '의복', 'living', '♙', 60, 20], ['boots', '장화', 'living', '♟', 60, 22], ['hats', '모자', 'living', '⌂', 60, 18],
  ['medicine', '약품', 'living', '✚', 50, 34], ['tobacco', '담배', 'living', '≈', 60, 26],
  ['cannonballs', '대포알', 'military', '●', 100, 15], ['powder-kegs', '화약통', 'military', '▣', 50, 48], ['pistols', '권총', 'military', '⌐', 30, 62], ['muskets', '장총', 'military', '╾', 30, 72],
  ['cutlasses', '커틀러스', 'military', '⚔', 40, 52], ['armor', '갑옷', 'military', '♜', 30, 76], ['navigation-tools', '항해 도구', 'military', '✥', 30, 65], ['telescopes', '망원경', 'military', '⌕', 20, 88],
  ['sails', '돛', 'military', '◢', 30, 58], ['ship-parts', '선박 부품', 'military', '⚙', 40, 70], ['cannons', '대포', 'military', '♝', 20, 130], ['tools', '도구', 'military', '⌘', 50, 32],
  ['jeweled-ornaments', '보석 장식', 'luxury', '✧', 20, 125], ['fine-clothes', '고급 의복', 'luxury', '♛', 25, 110], ['aged-rum', '숙성 럼', 'luxury', '♨', 30, 105],
  ['precision-instruments', '정밀 항해 장비', 'luxury', '✥', 15, 175], ['prosthetics', '의수와 의족', 'luxury', '⚙', 20, 140], ['officer-pistols', '장교용 권총', 'luxury', '⌐', 15, 190],
  ['rare-medicine', '희귀 의약품', 'luxury', '✚', 20, 210], ['figureheads', '장식용 선수상', 'luxury', '♞', 10, 260],
  ['royal-coins', '왕실 금화', 'loot', '●', 200, 85, true], ['military-maps', '군사 지도', 'loot', '▧', 20, 160, true], ['naval-ciphers', '해군 암호문', 'loot', '⌘', 20, 190, true],
  ['ancient-relics', '고대 유물', 'loot', '♢', 10, 320, true], ['rare-blueprints', '희귀 설계도', 'loot', '⌑', 20, 280, true], ['legendary-parts', '전설 함선 부품', 'loot', '✹', 10, 480, true],
  ['monster-materials', '괴수 소재', 'loot', '◉', 20, 390, true], ['silver', '은', 'loot', '◐', 80, 58, true], ['spices', '향신료', 'loot', '❖', 60, 62, true], ['wine', '포도주', 'loot', '♨', 50, 54, true],
  ['whale-oil', '고래 기름', 'loot', '◒', 50, 78, true], ['rare-metal', '희귀 금속', 'loot', '◆', 30, 145, true], ['royal-equipment', '왕실 장비', 'loot', '♜', 20, 180, true], ['foreign-textiles', '외국산 직물', 'loot', '▧', 40, 92, true]
].map(([id, name, category, icon, stackSize, value, expeditionOnly]) => ({ id, name, category, icon, stackSize, value, expeditionOnly })) as SettlementResourceDefinition[];

export const SETTLEMENT_RESOURCES = Object.fromEntries(resourceRows.map((resource) => [resource.id, resource])) as Record<SettlementResourceId, SettlementResourceDefinition>;
export const SETTLEMENT_RESOURCE_IDS = resourceRows.map((resource) => resource.id);

export interface RecipeDefinition {
  id: string;
  name: string;
  buildingType: SettlementBuildingId;
  inputs: PartialSettlementInventory;
  outputs: PartialSettlementInventory;
  durationMinutes: number;
  workers: Partial<Record<JobId, number>>;
  fuel?: PartialSettlementInventory;
  danger: number;
}

export const RECIPES: Record<string, RecipeDefinition> = Object.fromEntries(([
  { id: 'cut-logs', name: '벌목', buildingType: 'lumber-camp', inputs: {}, outputs: { logs: 4 }, durationMinutes: 12, workers: { logger: 2 }, danger: 4 },
  { id: 'collect-water', name: '빗물 정수', buildingType: 'water-collector', inputs: {}, outputs: { water: 5 }, durationMinutes: 10, workers: { laborer: 1 }, danger: 0 },
  { id: 'catch-fish', name: '연안 어획', buildingType: 'fisher-hut', inputs: {}, outputs: { fish: 4 }, durationMinutes: 13, workers: { fisher: 2 }, danger: 3 },
  { id: 'quarry-stone', name: '석재 채굴', buildingType: 'quarry', inputs: {}, outputs: { stone: 4 }, durationMinutes: 14, workers: { miner: 2 }, danger: 5 },
  { id: 'mine-iron', name: '철광석 채굴', buildingType: 'iron-mine', inputs: {}, outputs: { 'iron-ore': 3 }, durationMinutes: 16, workers: { miner: 3 }, danger: 8 },
  { id: 'mine-copper', name: '구리광석 채굴', buildingType: 'copper-mine', inputs: {}, outputs: { 'copper-ore': 3 }, durationMinutes: 18, workers: { miner: 3 }, danger: 8 },
  { id: 'grow-grain', name: '곡물 재배', buildingType: 'farm', inputs: { water: 1 }, outputs: { grain: 5 }, durationMinutes: 24, workers: { farmer: 2 }, danger: 1 },
  { id: 'hunt-game', name: '야생 짐승 사냥', buildingType: 'hunter-hut', inputs: {}, outputs: { 'raw-meat': 3, leather: 1 }, durationMinutes: 20, workers: { hunter: 2 }, danger: 7 },
  { id: 'saw-planks', name: '판자 제재', buildingType: 'sawmill', inputs: { logs: 3 }, outputs: { planks: 2 }, durationMinutes: 12, workers: { laborer: 2 }, danger: 4 },
  { id: 'dress-stone', name: '석재 다듬기', buildingType: 'quarry', inputs: { stone: 3 }, outputs: { 'stone-blocks': 2 }, durationMinutes: 15, workers: { miner: 2 }, danger: 3 },
  { id: 'smelt-iron', name: '철 제련', buildingType: 'smelter', inputs: { 'iron-ore': 3, charcoal: 1 }, outputs: { 'iron-ingots': 2 }, durationMinutes: 18, workers: { smelter: 2 }, danger: 12 },
  { id: 'smelt-copper', name: '구리 제련', buildingType: 'smelter', inputs: { 'copper-ore': 3, charcoal: 1 }, outputs: { 'copper-ingots': 2 }, durationMinutes: 20, workers: { smelter: 2 }, danger: 11 },
  { id: 'burn-charcoal', name: '숯 굽기', buildingType: 'smelter', inputs: { logs: 2 }, outputs: { charcoal: 2 }, durationMinutes: 12, workers: { smelter: 1 }, danger: 8 },
  { id: 'forge-tools', name: '도구 제작', buildingType: 'forge', inputs: { 'iron-ingots': 1, planks: 1 }, outputs: { tools: 2 }, durationMinutes: 18, workers: { blacksmith: 2 }, danger: 7 },
  { id: 'forge-cutlasses', name: '커틀러스 제작', buildingType: 'forge', inputs: { 'iron-ingots': 2, leather: 1 }, outputs: { cutlasses: 2 }, durationMinutes: 24, workers: { blacksmith: 2 }, danger: 7 },
  { id: 'mill-flour', name: '곡물 제분', buildingType: 'mill', inputs: { grain: 3 }, outputs: { flour: 3 }, durationMinutes: 10, workers: { laborer: 2 }, danger: 2 },
  { id: 'bake-hardtack', name: '건빵 굽기', buildingType: 'bakery', inputs: { flour: 2, water: 1 }, outputs: { hardtack: 4 }, durationMinutes: 12, workers: { cook: 2 }, danger: 4 },
  { id: 'cook-fish-stew', name: '생선 스튜', buildingType: 'cookhouse', inputs: { fish: 2, water: 1 }, outputs: { 'fish-stew': 3 }, durationMinutes: 12, workers: { cook: 2 }, danger: 3 },
  { id: 'distill-rum', name: '과일 럼 증류', buildingType: 'distillery', inputs: { fruit: 3, water: 1 }, outputs: { rum: 2 }, durationMinutes: 20, workers: { distiller: 2 }, danger: 9 },
  { id: 'weave-cloth', name: '천 직조', buildingType: 'weaver', inputs: { fiber: 3 }, outputs: { cloth: 2 }, durationMinutes: 15, workers: { tailor: 2 }, danger: 2 },
  { id: 'sew-clothes', name: '기본 의복', buildingType: 'weaver', inputs: { cloth: 2, leather: 1 }, outputs: { clothes: 2 }, durationMinutes: 20, workers: { tailor: 2 }, danger: 2 },
  { id: 'twist-rope', name: '밧줄 꼬기', buildingType: 'weaver', inputs: { fiber: 2 }, outputs: { rope: 2 }, durationMinutes: 13, workers: { tailor: 2 }, danger: 2 },
  { id: 'mix-powder', name: '화약 배합', buildingType: 'powder-workshop', inputs: { sulfur: 1, charcoal: 2 }, outputs: { powder: 2 }, durationMinutes: 22, workers: { 'powder-maker': 2 }, danger: 24 },
  { id: 'cast-shot', name: '대포알 주조', buildingType: 'ammunition-workshop', inputs: { 'iron-ingots': 2, charcoal: 1 }, outputs: { cannonballs: 4 }, durationMinutes: 18, workers: { blacksmith: 2 }, danger: 10 },
  { id: 'forge-cannon', name: '함포 주조', buildingType: 'cannon-foundry', inputs: { 'iron-ingots': 6, planks: 2, rope: 1 }, outputs: { cannons: 1 }, durationMinutes: 55, workers: { blacksmith: 3 }, danger: 15 },
  { id: 'make-sails', name: '돛 제작', buildingType: 'weaver', inputs: { cloth: 5, rope: 2 }, outputs: { sails: 1 }, durationMinutes: 38, workers: { tailor: 3 }, danger: 2 },
  { id: 'make-ship-parts', name: '선박 부품', buildingType: 'shipyard', inputs: { planks: 4, 'iron-ingots': 2, rope: 1 }, outputs: { 'ship-parts': 2 }, durationMinutes: 42, workers: { shipwright: 3 }, danger: 6 }
] satisfies RecipeDefinition[]).map((recipe) => [recipe.id, recipe])) as Record<string, RecipeDefinition>;

export interface BuildingDefinition {
  id: SettlementBuildingId;
  name: string;
  category: BuildingCategory;
  icon: string;
  footprint: [number, number];
  terrainRules: TerrainType[];
  minElevation?: number;
  maxElevation?: number;
  constructionCost: PartialSettlementInventory;
  constructionMinutes: number;
  workerJob?: JobId;
  workerSlots: number;
  storage: number;
  recipes: string[];
  housing?: Partial<Record<PopulationTier, number>>;
  range?: number;
  unlock?: string;
  description: string;
}

const LAND: TerrainType[] = ['beach', 'coast', 'plain', 'forest', 'slope', 'highland', 'stone-deposit', 'iron-vein', 'copper-vein'];
const FLAT: TerrainType[] = ['beach', 'coast', 'plain', 'forest', 'stone-deposit'];
const COAST: TerrainType[] = ['beach', 'coast'];
const HIGH: TerrainType[] = ['slope', 'cliff', 'highland'];

const buildingRows: BuildingDefinition[] = [
  { id: 'wreckage', name: '난파선 잔해', category: 'gathering', icon: '⚓', footprint: [2, 2], terrainRules: COAST, constructionCost: {}, constructionMinutes: 0, workerSlots: 0, storage: 80, recipes: [], description: '생존자들이 건져 올린 초기 자재와 보급품.' },
  { id: 'campfire', name: '공동 화톳불', category: 'welfare', icon: '♨', footprint: [1, 1], terrainRules: LAND, constructionCost: { logs: 3, stone: 2 }, constructionMinutes: 8, workerSlots: 0, storage: 10, recipes: [], range: 5, description: '추위와 공포를 누그러뜨리는 정착지의 첫 중심.' },
  { id: 'tent', name: '임시 천막', category: 'housing', icon: '⌂', footprint: [1, 1], terrainRules: LAND, constructionCost: { logs: 2, fiber: 3 }, constructionMinutes: 10, workerSlots: 0, storage: 8, recipes: [], housing: { castaway: 4, laborer: 2 }, description: '표류자를 위한 비바람 막이.' },
  { id: 'water-collector', name: '빗물 집수장', category: 'gathering', icon: '◉', footprint: [2, 1], terrainRules: FLAT, constructionCost: { logs: 6, fiber: 4 }, constructionMinutes: 16, workerJob: 'laborer', workerSlots: 2, storage: 24, recipes: ['collect-water'], description: '빗물과 샘물을 모아 식수로 정화한다.' },
  { id: 'fisher-hut', name: '어업소', category: 'gathering', icon: '◒', footprint: [2, 1], terrainRules: COAST, constructionCost: { logs: 8, rope: 2 }, constructionMinutes: 18, workerJob: 'fisher', workerSlots: 3, storage: 24, recipes: ['catch-fish'], description: '연안 어획과 그물 손질을 담당한다.' },
  { id: 'lumber-camp', name: '벌목장', category: 'gathering', icon: '▰', footprint: [2, 2], terrainRules: ['forest'], constructionCost: { logs: 7, stone: 2 }, constructionMinutes: 18, workerJob: 'logger', workerSlots: 4, storage: 32, recipes: ['cut-logs'], description: '숲에서 원목을 베어낸다.' },
  { id: 'quarry', name: '채석장', category: 'gathering', icon: '⬟', footprint: [2, 2], terrainRules: ['stone-deposit'], constructionCost: { logs: 10, tools: 2 }, constructionMinutes: 26, workerJob: 'miner', workerSlots: 4, storage: 36, recipes: ['quarry-stone', 'dress-stone'], description: '노출된 암반에서 석재를 채굴한다.' },
  { id: 'iron-mine', name: '철광산', category: 'gathering', icon: '◆', footprint: [2, 2], terrainRules: ['iron-vein'], constructionCost: { logs: 12, planks: 8, tools: 4 }, constructionMinutes: 40, workerJob: 'miner', workerSlots: 6, storage: 40, recipes: ['mine-iron'], unlock: 'prosperity-foundry', description: '철광맥을 파고 지지대를 세운다.' },
  { id: 'farm', name: '계단식 농장', category: 'gathering', icon: '⋮', footprint: [3, 2], terrainRules: ['plain'], maxElevation: 2, constructionCost: { logs: 8, tools: 2 }, constructionMinutes: 24, workerJob: 'farmer', workerSlots: 5, storage: 36, recipes: ['grow-grain'], description: '비옥한 평지에서 곡물을 재배한다.' },
  { id: 'hunter-hut', name: '사냥꾼 오두막', category: 'gathering', icon: '♞', footprint: [1, 1], terrainRules: ['forest', 'highland'], constructionCost: { logs: 7, rope: 2 }, constructionMinutes: 18, workerJob: 'hunter', workerSlots: 3, storage: 24, recipes: ['hunt-game'], description: '숲의 고기와 가죽을 확보한다.' },
  { id: 'sawmill', name: '제재소', category: 'processing', icon: '▥', footprint: [2, 2], terrainRules: FLAT, constructionCost: { logs: 12, stone: 4, tools: 2 }, constructionMinutes: 28, workerJob: 'laborer', workerSlots: 4, storage: 36, recipes: ['saw-planks'], description: '원목을 건축과 조선용 판자로 켠다.' },
  { id: 'smelter', name: '제련소', category: 'processing', icon: '♨', footprint: [2, 2], terrainRules: FLAT, constructionCost: { planks: 10, stone: 12, tools: 3 }, constructionMinutes: 42, workerJob: 'smelter', workerSlots: 5, storage: 36, recipes: ['burn-charcoal', 'smelt-iron'], unlock: 'prosperity-foundry', description: '광석과 숯을 사용해 금속을 제련한다.' },
  { id: 'forge', name: '대장간', category: 'processing', icon: '⚒', footprint: [2, 2], terrainRules: FLAT, constructionCost: { planks: 12, 'stone-blocks': 8, 'iron-ingots': 4 }, constructionMinutes: 46, workerJob: 'blacksmith', workerSlots: 5, storage: 36, recipes: ['forge-tools', 'forge-cutlasses'], unlock: 'prosperity-foundry', description: '도구와 무기를 제작한다.' },
  { id: 'mill', name: '제분소', category: 'processing', icon: '✣', footprint: [2, 2], terrainRules: FLAT, constructionCost: { planks: 10, stone: 4 }, constructionMinutes: 28, workerJob: 'laborer', workerSlots: 3, storage: 30, recipes: ['mill-flour'], description: '곡물을 오래 보관할 수 있는 밀가루로 만든다.' },
  { id: 'bakery', name: '제빵소', category: 'processing', icon: '◈', footprint: [2, 1], terrainRules: FLAT, constructionCost: { planks: 10, stone: 8 }, constructionMinutes: 30, workerJob: 'cook', workerSlots: 3, storage: 30, recipes: ['bake-hardtack'], description: '원정에 적합한 건빵을 굽는다.' },
  { id: 'cookhouse', name: '공동 조리소', category: 'processing', icon: '♨', footprint: [2, 1], terrainRules: FLAT, constructionCost: { logs: 8, stone: 6 }, constructionMinutes: 22, workerJob: 'cook', workerSlots: 3, storage: 30, recipes: ['cook-fish-stew'], description: '정착민에게 따뜻한 식사를 공급한다.' },
  { id: 'distillery', name: '증류소', category: 'processing', icon: '♨', footprint: [2, 2], terrainRules: FLAT, constructionCost: { planks: 16, stone: 8, 'copper-ingots': 3 }, constructionMinutes: 48, workerJob: 'distiller', workerSlots: 4, storage: 36, recipes: ['distill-rum'], unlock: 'prosperity-distilling', description: '과일을 해적 사회의 피인 럼으로 증류한다.' },
  { id: 'weaver', name: '직조소', category: 'processing', icon: '▧', footprint: [2, 2], terrainRules: FLAT, constructionCost: { planks: 12, rope: 4 }, constructionMinutes: 34, workerJob: 'tailor', workerSlots: 4, storage: 36, recipes: ['weave-cloth', 'twist-rope', 'make-sails'], description: '섬유로 밧줄, 천과 돛을 제작한다.' },
  { id: 'powder-workshop', name: '화약 공방', category: 'processing', icon: '✦', footprint: [2, 2], terrainRules: FLAT, constructionCost: { planks: 10, 'stone-blocks': 10, tools: 4 }, constructionMinutes: 48, workerJob: 'powder-maker', workerSlots: 4, storage: 24, recipes: ['mix-powder'], range: 3, unlock: 'infamy-black-powder', description: '위험한 화약을 배합한다. 주거지와 거리를 두어야 한다.' },
  { id: 'ammunition-workshop', name: '탄약 공방', category: 'processing', icon: '●', footprint: [2, 2], terrainRules: FLAT, constructionCost: { planks: 12, stone: 8, 'iron-ingots': 4 }, constructionMinutes: 44, workerJob: 'blacksmith', workerSlots: 4, storage: 30, recipes: ['cast-shot'], unlock: 'infamy-black-powder', description: '해안 포대와 함선에 필요한 탄약을 만든다.' },
  { id: 'warehouse', name: '중앙 창고', category: 'logistics', icon: '▣', footprint: [3, 2], terrainRules: FLAT, constructionCost: { logs: 14, stone: 6 }, constructionMinutes: 26, workerJob: 'hauler', workerSlots: 6, storage: 280, recipes: [], description: '정착지의 물자를 분류하고 보관한다.' },
  { id: 'local-storage', name: '지역 보관소', category: 'logistics', icon: '▤', footprint: [1, 1], terrainRules: LAND, constructionCost: { logs: 6 }, constructionMinutes: 12, workerSlots: 0, storage: 70, recipes: [], description: '가까운 생산품을 임시로 모아 운송 거리를 줄인다.' },
  { id: 'distribution-depot', name: '배분소', category: 'logistics', icon: '⌘', footprint: [2, 2], terrainRules: FLAT, constructionCost: { planks: 12, stone: 4, tools: 2 }, constructionMinutes: 32, workerJob: 'hauler', workerSlots: 8, storage: 140, recipes: [], unlock: 'prosperity-logistics', description: '운반 작업을 묶고 우선순위를 조절한다.' },
  { id: 'dock-warehouse', name: '부두 창고', category: 'logistics', icon: '⚓', footprint: [3, 2], terrainRules: COAST, constructionCost: { planks: 18, stone: 8, rope: 4 }, constructionMinutes: 38, workerJob: 'hauler', workerSlots: 6, storage: 220, recipes: [], unlock: 'seamanship-docks', description: '함선 보급과 원정 화물을 처리한다.' },
  { id: 'cargo-lift', name: '화물 승강기', category: 'infrastructure', icon: '⇅', footprint: [1, 2], terrainRules: HIGH, constructionCost: { planks: 16, rope: 8, 'iron-ingots': 3 }, constructionMinutes: 46, workerJob: 'hauler', workerSlots: 2, storage: 20, recipes: [], unlock: 'prosperity-vertical', description: '절벽 상하단 물류 경로를 크게 단축한다.' },
  { id: 'bridge', name: '목재 교량', category: 'infrastructure', icon: '═', footprint: [3, 1], terrainRules: ['ravine', 'wetland', 'coast'], constructionCost: { planks: 12, rope: 3 }, constructionMinutes: 24, workerSlots: 0, storage: 0, recipes: [], description: '협곡과 습지를 가로지르는 운송로.' },
  { id: 'stairs', name: '절벽 계단', category: 'infrastructure', icon: '⌁', footprint: [1, 2], terrainRules: ['slope', 'cliff'], constructionCost: { planks: 8, stone: 4 }, constructionMinutes: 20, workerSlots: 0, storage: 0, recipes: [], description: '고저차 이동 비용을 낮춘다.' },
  { id: 'bunkhouse', name: '공동 숙소', category: 'housing', icon: '⌂', footprint: [2, 2], terrainRules: FLAT, constructionCost: { planks: 16, stone: 5 }, constructionMinutes: 32, workerSlots: 0, storage: 16, recipes: [], housing: { castaway: 8, laborer: 12, skilled: 4 }, unlock: 'federation-housing', description: '잡역부와 숙련 노동자의 안정적인 거처.' },
  { id: 'barracks', name: '해적 막사', category: 'housing', icon: '♜', footprint: [3, 2], terrainRules: FLAT, constructionCost: { planks: 24, 'stone-blocks': 8, 'iron-ingots': 4 }, constructionMinutes: 44, workerSlots: 0, storage: 24, recipes: [], housing: { pirate: 16, elite: 4 }, unlock: 'infamy-raiders', description: '전문 해적을 수용하고 장비를 보관한다.' },
  { id: 'tavern', name: '선술집', category: 'welfare', icon: '♨', footprint: [2, 2], terrainRules: FLAT, constructionCost: { planks: 14, stone: 5 }, constructionMinutes: 34, workerJob: 'cook', workerSlots: 4, storage: 40, recipes: [], range: 7, description: '럼, 식사, 소문과 음악이 모이는 사회의 심장.' },
  { id: 'infirmary', name: '의무실', category: 'welfare', icon: '✚', footprint: [2, 2], terrainRules: FLAT, constructionCost: { planks: 16, cloth: 4, medicine: 2 }, constructionMinutes: 40, workerJob: 'medic', workerSlots: 4, storage: 28, recipes: [], range: 8, unlock: 'federation-care', description: '부상과 질병을 치료한다.' },
  { id: 'small-dock', name: '소형 부두', category: 'fleet', icon: '⚓', footprint: [3, 2], terrainRules: COAST, constructionCost: { planks: 24, rope: 8, 'stone-blocks': 4 }, constructionMinutes: 48, workerJob: 'shipwright', workerSlots: 4, storage: 60, recipes: [], unlock: 'seamanship-docks', description: '소형 함선의 정박과 보급을 지원한다.' },
  { id: 'shipyard', name: '조선소', category: 'fleet', icon: '◢', footprint: [4, 3], terrainRules: COAST, constructionCost: { planks: 42, rope: 14, 'iron-ingots': 8, tools: 6 }, constructionMinutes: 78, workerJob: 'shipwright', workerSlots: 10, storage: 100, recipes: ['make-ship-parts'], unlock: 'seamanship-shipyard', description: '자원과 전문 조선공으로 함선을 건조한다.' },
  { id: 'cannon-foundry', name: '대포 주조소', category: 'fleet', icon: '♝', footprint: [3, 2], terrainRules: FLAT, constructionCost: { 'stone-blocks': 18, 'iron-ingots': 10, tools: 5 }, constructionMinutes: 66, workerJob: 'blacksmith', workerSlots: 7, storage: 60, recipes: ['forge-cannon'], unlock: 'infamy-heavy-guns', description: '함선과 포대에 장착할 대포를 주조한다.' },
  { id: 'training-yard', name: '선원 훈련소', category: 'fleet', icon: '⚔', footprint: [3, 3], terrainRules: FLAT, constructionCost: { planks: 24, stone: 12, cutlasses: 4 }, constructionMinutes: 52, workerJob: 'officer', workerSlots: 5, storage: 30, recipes: [], range: 5, unlock: 'infamy-raiders', description: '선원과 포수를 전문 해적으로 훈련한다.' },
  { id: 'watchtower', name: '고지대 감시탑', category: 'military', icon: '♜', footprint: [1, 1], terrainRules: HIGH, minElevation: 2, constructionCost: { planks: 14, rope: 4 }, constructionMinutes: 34, workerJob: 'guard', workerSlots: 2, storage: 12, recipes: [], range: 10, description: '높이에 비례해 적 함대를 더 일찍 발견한다.' },
  { id: 'coastal-battery', name: '해안 포대', category: 'military', icon: '✹', footprint: [3, 2], terrainRules: ['coast', 'slope', 'cliff', 'highland'], minElevation: 1, constructionCost: { 'stone-blocks': 20, planks: 14, cannons: 2 }, constructionMinutes: 72, workerJob: 'gunner', workerSlots: 7, storage: 50, recipes: [], range: 12, unlock: 'infamy-coastal-guns', description: '현장 대포알과 화약, 포수가 있어야 발사한다.' },
  { id: 'powder-magazine', name: '화약고', category: 'military', icon: '✦', footprint: [2, 2], terrainRules: FLAT, constructionCost: { 'stone-blocks': 16, planks: 8 }, constructionMinutes: 42, workerJob: 'guard', workerSlots: 2, storage: 100, recipes: [], range: 4, unlock: 'infamy-black-powder', description: '군수 화약을 안전하게 보관한다. 화재는 치명적이다.' },
  { id: 'captains-lodge', name: '선장 관저', category: 'administration', icon: '♛', footprint: [3, 2], terrainRules: FLAT, constructionCost: { planks: 24, 'stone-blocks': 10, cloth: 4 }, constructionMinutes: 54, workerJob: 'officer', workerSlots: 4, storage: 36, recipes: [], range: 8, description: '정책, 발전과 정착지 통계를 지휘한다.' },
  { id: 'expedition-office', name: '원정 사무소', category: 'administration', icon: '✥', footprint: [2, 2], terrainRules: FLAT, constructionCost: { planks: 18, cloth: 4, 'navigation-tools': 1 }, constructionMinutes: 48, workerJob: 'navigator', workerSlots: 4, storage: 30, recipes: [], unlock: 'seamanship-expeditions', description: '함대 원정의 보급, 경로와 위험을 계산한다.' },
  { id: 'copper-mine', name: '구리 광산', category: 'gathering', icon: '◇', footprint: [2, 2], terrainRules: ['copper-vein'], constructionCost: { planks: 10, tools: 3 }, constructionMinutes: 38, workerJob: 'miner', workerSlots: 5, storage: 36, recipes: ['mine-copper'], unlock: 'prosperity-foundry', description: '증류기와 정밀 장비에 쓰이는 구리를 채굴한다.' },
  { id: 'zipline-post', name: '집라인 거점', category: 'infrastructure', icon: '⌁', footprint: [1, 1], terrainRules: HIGH, minElevation: 2, constructionCost: { planks: 8, rope: 8, 'iron-ingots': 2 }, constructionMinutes: 30, workerJob: 'hauler', workerSlots: 1, storage: 12, recipes: [], unlock: 'prosperity-vertical', description: '고지대에서 저지대로 소형 화물을 빠르게 보낸다.' },
  { id: 'ramp', name: '목재 경사로', category: 'infrastructure', icon: '╱', footprint: [1, 2], terrainRules: ['slope', 'coast', 'plain'], constructionCost: { planks: 8, rope: 2 }, constructionMinutes: 18, workerSlots: 0, storage: 0, recipes: [], description: '손수레가 고저차를 통과하게 한다.' },
  { id: 'cliff-platform', name: '절벽 발판', category: 'infrastructure', icon: '═', footprint: [2, 1], terrainRules: ['cliff', 'slope'], minElevation: 2, constructionCost: { planks: 14, rope: 6, 'iron-ingots': 2 }, constructionMinutes: 34, workerSlots: 0, storage: 8, recipes: [], unlock: 'prosperity-vertical', description: '건설 불가능한 절벽에 제한된 작업 면을 만든다.' },
  { id: 'skilled-house', name: '숙련자 주택', category: 'housing', icon: '⌂', footprint: [2, 2], terrainRules: FLAT, constructionCost: { planks: 22, 'stone-blocks': 6, cloth: 3 }, constructionMinutes: 42, workerSlots: 0, storage: 20, recipes: [], housing: { skilled: 10, pirate: 2 }, unlock: 'federation-housing', description: '숙련공 가족과 개인 도구를 위한 질 좋은 주거.' },
  { id: 'officer-quarters', name: '장교 숙소', category: 'housing', icon: '♛', footprint: [2, 2], terrainRules: FLAT, constructionCost: { planks: 28, 'stone-blocks': 10, 'fine-clothes': 2 }, constructionMinutes: 56, workerSlots: 0, storage: 22, recipes: [], housing: { officer: 6, elite: 4 }, unlock: 'federation-council', description: '선장과 장교의 명예, 사생활과 정치적 영향력을 수용한다.' },
  { id: 'gambling-den', name: '도박장', category: 'welfare', icon: '◆', footprint: [2, 2], terrainRules: FLAT, constructionCost: { planks: 16, cloth: 4, rum: 4 }, constructionMinutes: 38, workerJob: 'laborer', workerSlots: 3, storage: 24, recipes: [], range: 6, unlock: 'prosperity-distilling', description: '금화가 돌고 불만이 잠시 잊히는 위험한 오락 시설.' },
  { id: 'arena', name: '투기장', category: 'welfare', icon: '⚔', footprint: [3, 3], terrainRules: FLAT, constructionCost: { planks: 24, stone: 12, rope: 6 }, constructionMinutes: 50, workerJob: 'guard', workerSlots: 4, storage: 20, recipes: [], range: 7, unlock: 'infamy-raiders', description: '결투와 훈련으로 해적 문화 욕구와 전투 경험을 채운다.' },
  { id: 'bathhouse', name: '목욕 시설', category: 'welfare', icon: '≈', footprint: [2, 2], terrainRules: FLAT, constructionCost: { planks: 16, 'stone-blocks': 12, 'copper-ingots': 3 }, constructionMinutes: 46, workerJob: 'laborer', workerSlots: 3, storage: 40, recipes: [], range: 7, unlock: 'federation-care', description: '식수를 소비해 위생과 질병 저항을 높인다.' },
  { id: 'festival-square', name: '축제 광장', category: 'welfare', icon: '✣', footprint: [3, 3], terrainRules: FLAT, constructionCost: { planks: 18, cloth: 8, rum: 8 }, constructionMinutes: 44, workerSlots: 2, storage: 30, recipes: [], range: 9, unlock: 'federation-council', description: '전리품 귀환과 해적 연방의 날을 주민이 함께 축하한다.' },
  { id: 'dry-dock', name: '건선거', category: 'fleet', icon: '▱', footprint: [5, 3], terrainRules: COAST, constructionCost: { planks: 60, 'stone-blocks': 24, rope: 16, 'iron-ingots': 12 }, constructionMinutes: 100, workerJob: 'shipwright', workerSlots: 12, storage: 120, recipes: [], unlock: 'seamanship-brig', description: '대형 함선 수리와 다중 건조를 지원한다.' },
  { id: 'supply-depot', name: '함선 보급소', category: 'fleet', icon: '▣', footprint: [3, 2], terrainRules: COAST, constructionCost: { planks: 22, rope: 6, 'stone-blocks': 6 }, constructionMinutes: 44, workerJob: 'hauler', workerSlots: 6, storage: 180, recipes: [], unlock: 'seamanship-expeditions', description: '함대 식수, 식량, 의약품과 탄약을 선적한다.' },
  { id: 'fort-wall', name: '요새벽', category: 'military', icon: '▰', footprint: [3, 1], terrainRules: LAND, constructionCost: { 'stone-blocks': 24, planks: 6, 'iron-ingots': 2 }, constructionMinutes: 52, workerSlots: 0, storage: 0, recipes: [], unlock: 'infamy-coastal-guns', description: '상륙 병력의 이동을 막고 내부 시설 피해를 줄인다.' },
  { id: 'guard-post', name: '경비초소', category: 'military', icon: '♟', footprint: [1, 1], terrainRules: LAND, constructionCost: { planks: 8, stone: 4 }, constructionMinutes: 24, workerJob: 'guard', workerSlots: 3, storage: 16, recipes: [], range: 5, description: '치안 사건과 침투를 조기에 발견한다.' },
  { id: 'signal-tower', name: '신호탑', category: 'military', icon: '✦', footprint: [1, 1], terrainRules: HIGH, minElevation: 2, constructionCost: { planks: 16, rope: 4, cloth: 3 }, constructionMinutes: 38, workerJob: 'guard', workerSlots: 2, storage: 16, recipes: [], range: 14, unlock: 'seamanship-expeditions', description: '함대 귀환과 침공 경보를 섬 전체에 전달한다.' },
  { id: 'pirate-council', name: '해적 의회', category: 'administration', icon: '♛', footprint: [3, 3], terrainRules: FLAT, constructionCost: { planks: 32, 'stone-blocks': 16, 'fine-clothes': 2 }, constructionMinutes: 72, workerJob: 'officer', workerSlots: 8, storage: 30, recipes: [], range: 10, unlock: 'federation-council', description: '정책, 동맹, 세금과 전리품 분배를 토론한다.' },
  { id: 'intelligence-network', name: '정보망 거점', category: 'administration', icon: '⌕', footprint: [2, 2], terrainRules: FLAT, constructionCost: { planks: 18, gold: 80, 'military-maps': 1 }, constructionMinutes: 52, workerJob: 'informant', workerSlots: 5, storage: 24, recipes: [], unlock: 'seamanship-expeditions', description: '해군 이동, 상선 항로와 방어 정보를 수집한다.' },
  { id: 'bounty-board', name: '현상금 게시판', category: 'administration', icon: '▤', footprint: [1, 1], terrainRules: LAND, constructionCost: { planks: 8, cloth: 2 }, constructionMinutes: 20, workerJob: 'informant', workerSlots: 2, storage: 8, recipes: [], unlock: 'infamy-raiders', description: '위험한 표적과 특별 임무를 주민과 선장에게 공개한다.' }
];

export const BUILDINGS = Object.fromEntries(buildingRows.map((building) => [building.id, building])) as Partial<Record<SettlementBuildingId, BuildingDefinition>>;
export const BUILDING_LIST = buildingRows.filter((building) => !['wreckage'].includes(building.id));

export const POPULATION_TIERS: Record<PopulationTier, { name: string; productivity: number; needs: (keyof import('./types').ResidentNeeds)[] }> = {
  castaway: { name: '표류자', productivity: 0.65, needs: ['water', 'food', 'housing'] },
  laborer: { name: '잡역부', productivity: 0.82, needs: ['water', 'food', 'housing', 'clothing', 'leisure'] },
  skilled: { name: '숙련 노동자', productivity: 1, needs: ['water', 'food', 'housing', 'clothing', 'health', 'leisure'] },
  pirate: { name: '전문 해적', productivity: 1.14, needs: ['water', 'food', 'housing', 'health', 'leisure', 'pirateCulture', 'equipment'] },
  elite: { name: '정예 해적', productivity: 1.3, needs: ['food', 'housing', 'health', 'pirateCulture', 'equipment'] },
  officer: { name: '장교와 선장', productivity: 1.45, needs: ['food', 'housing', 'health', 'leisure', 'pirateCulture', 'equipment'] }
};

export const JOB_NAMES: Record<JobId, string> = {
  unassigned: '미배치', laborer: '생산 노동자', logger: '벌목꾼', miner: '광부', fisher: '어부', farmer: '농부', hunter: '사냥꾼', hauler: '운반꾼', builder: '건설자', smelter: '제련공', blacksmith: '대장장이',
  'powder-maker': '화약 제조공', tailor: '재단사', cook: '조리사', distiller: '증류사', medic: '의무관', shipwright: '조선공', gunner: '포수', navigator: '항해사', raider: '약탈자',
  informant: '정보원', guard: '경비병', officer: '장교', captain: '선장'
};
