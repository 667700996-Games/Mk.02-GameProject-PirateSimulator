import { ZONES } from './catalog';
import { createId, mulberry32, pickOne, randomInt } from './rng';
import type { FactionId, GameState, Mission, MissionType, ResourceStock, ZoneId } from './types';
import { creditGameResources } from '$lib/settlement/economyBridge';

export interface MissionEvent {
  kind: 'settlement-milestone' | 'ship-defeated' | 'ship-captured' | 'cargo-stolen' | 'raid-complete' | 'contraband-delivered' | 'treasure-found' | 'survivor-rescued' | 'haven-defended';
  zoneId: ZoneId;
  targetId?: string;
  amount?: number;
  opponent?: 'merchant' | 'navy' | 'pirate';
}

export const STORY_MISSION_IDS = [
  'story-first-prize',
  'story-liberty-ledger',
  'story-red-tide-debt',
  'story-crown-cipher',
  'story-blackwake-siege'
] as const;

const STORY_SEQUELS: Record<string, Mission> = {
  'story-first-prize': {
    id: 'story-liberty-ledger', title: '자유항의 검은 장부',
    description: '자유항의 밀수 연락망에 금지품 6묶을 넘겨 왕실 검문망의 빈틈을 확보하라.',
    type: 'smuggling', status: 'active', zoneId: 'freeport-waters', targetId: 'liberty-cove',
    reward: { gold: 320, medicine: 6, contraband: 2 }, renownReward: 25,
    progress: 0, goal: 6, story: true, difficulty: 2, claimed: false
  },
  'story-liberty-ledger': {
    id: 'story-red-tide-debt', title: '붉은 파도의 빚',
    description: '상업 항로에서 우리 깃발을 사칭하는 경쟁 해적선을 찾아 침몵시켜라.',
    type: 'rival-hunt', status: 'active', zoneId: 'merchant-routes',
    reward: { gold: 520, powder: 12, cannonballs: 24 }, renownReward: 34,
    progress: 0, goal: 1, story: true, difficulty: 3, claimed: false
  },
  'story-red-tide-debt': {
    id: 'story-crown-cipher', title: '왕관의 암호문',
    description: '군함 순찰 해역을 밝히고 왕실 호송선 두 척을 무너뜨려 본거지를 찾는 암호문을 빼앗아라.',
    type: 'convoy', status: 'active', zoneId: 'naval-patrol',
    reward: { gold: 760, blueprints: 1, iron: 18 }, renownReward: 48,
    progress: 0, goal: 2, story: true, difficulty: 4, claimed: false
  },
  'story-crown-cipher': {
    id: 'story-blackwake-siege', title: '검은물결의 새벽',
    description: '훈련된 수비대와 포대, 함대를 준비하고 암호문을 따라온 침공군을 본거지 해안에서 격파하라.',
    type: 'haven-defense', status: 'active', zoneId: 'beginners-bay',
    reward: { gold: 1200, bullion: 8, blueprints: 2 }, renownReward: 70,
    progress: 0, goal: 1, story: true, difficulty: 5, claimed: false
  }
};

export function storyChapter(missionId: string): number | undefined {
  const index = STORY_MISSION_IDS.indexOf(missionId as (typeof STORY_MISSION_IDS)[number]);
  return index >= 0 ? index + 1 : undefined;
}

export function storySequelAfter(missionId: string): Mission | undefined {
  const sequel = STORY_SEQUELS[missionId];
  return sequel ? structuredClone(sequel) : undefined;
}

const MISSION_TITLES: Record<MissionType, string[]> = {
  'merchant-raid': ['황금 돛의 마지막 항해', '보험 없는 화물', '상단의 피 묻은 장부'],
  convoy: ['왕관의 호송대를 깨라', '세 척이 함께 침몰한다', '보급선 분리 작전'],
  'cargo-theft': ['붉은 봉인의 화물', '향신료는 주인을 모른다', '사라진 은괴'],
  rescue: ['쇠창살 너머의 동료', '교수대 전날 밤', '표류한 항해장'],
  treasure: ['소금에 젖은 지도', '일곱 번째 봉인', '죽은 측량사의 좌표'],
  'rival-hunt': ['붉은 파도에 피를', '배신자의 검은 돛', '현상금 사냥꾼 사냥'],
  kidnap: ['제독의 저녁 식사', '살아 있는 협상 카드', '총독의 비밀'],
  smuggling: ['검문소 사이의 밤', '의약품은 국경을 모른다', '밤물결의 계약'],
  'haven-defense': ['우리의 해안을 지켜라', '새벽의 침공 경보', '포대에 불을 밝혀라'],
  'freeport-dispute': ['선술집의 세 깃발', '부두세 분쟁', '의회가 칼을 뽑기 전에'],
  'village-raid': ['곡물 창고를 비워라', '종이 울리기 전에', '해안의 빠른 습격'],
  'fort-assault': ['성벽 아래 화약', '왕관의 포문을 닫아라', '버려진 성채의 주인'],
  'legendary-hunt': ['지도 끝의 검은 선체', '폭풍 속의 유령함', '전설은 침몰하지 않는다']
};

const TYPES_BY_DANGER: MissionType[][] = [
  ['merchant-raid', 'cargo-theft', 'village-raid', 'rescue'],
  ['merchant-raid', 'smuggling', 'rival-hunt', 'freeport-dispute'],
  ['convoy', 'treasure', 'kidnap', 'haven-defense'],
  ['fort-assault', 'convoy', 'rival-hunt', 'legendary-hunt']
];

export function generateMissionBoard(state: GameState, count = 4, now = Date.now()): Mission[] {
  const existing = state.missions.filter((mission) => mission.story || mission.status === 'available' || mission.status === 'active' || (mission.status === 'complete' && !mission.claimed));
  const random = mulberry32(state.world.seed + state.world.day * 7919 + state.world.marketCycle * 31);
  const discoveredZones = (Object.values(state.world.zones).filter((zone) => zone.discovered).map((zone) => zone.id) as ZoneId[]);
  const generated: Mission[] = [];
  const signatures = new Set(existing.map((mission) => `${mission.zoneId}:${mission.title}`));
  const desired = Math.max(0, count - existing.filter((mission) => mission.status === 'available').length);
  let attempts = 0;
  while (generated.length < desired && attempts < Math.max(16, desired * 12)) {
    attempts += 1;
    const zoneId = pickOne(random, discoveredZones);
    const danger = ZONES[zoneId].difficulty;
    const typePool = TYPES_BY_DANGER[Math.min(3, Math.floor((danger - 1) / 2))];
    const type = pickOne(random, typePool);
    const settlements = state.world.settlements.filter((settlement) => settlement.zoneId === zoneId && settlement.discovered);
    const target = settlements.length ? pickOne(random, settlements) : undefined;
    const issuerFactionId = issuerFor(type);
    const rewardGold = Math.round((110 + danger * 95) * (.85 + random() * .35));
    const reward: Partial<ResourceStock> = { gold: rewardGold };
    if (type === 'smuggling') reward.contraband = randomInt(random, 2, 4 + danger);
    if (type === 'fort-assault' || type === 'legendary-hunt') reward.blueprints = 1;
    if (type === 'treasure') reward.gems = randomInt(random, 3, 7 + danger);
    const title = pickOne(random, MISSION_TITLES[type]);
    const signature = `${zoneId}:${title}`;
    if (signatures.has(signature)) continue;
    signatures.add(signature);
    generated.push({
      id: createId('mission'),
      title,
      description: missionDescription(type, zoneId, target?.name),
      type,
      status: 'available',
      zoneId,
      targetId: target?.id,
      reward,
      renownReward: 8 + danger * 5,
      expiresAt: now + (8 + danger * 2) * 60_000,
      progress: 0,
      goal: missionGoal(type, danger),
      story: false,
      issuerFactionId,
      difficulty: danger,
      claimed: false
    });
  }
  return [...existing, ...generated].slice(0, 10);
}

export function acceptMission(state: GameState, missionId: string): GameState {
  if (state.missions.filter((mission) => mission.status === 'active').length >= 4) return state;
  return { ...state, missions: state.missions.map((mission) => mission.id === missionId && mission.status === 'available' ? { ...mission, status: 'active' as const } : mission) };
}

export function progressMissions(state: GameState, event: MissionEvent): GameState {
  return {
    ...state,
    missions: state.missions.map((mission) => {
      if (mission.status !== 'active' || mission.zoneId !== event.zoneId) return mission;
      if (mission.id === 'story-first-prize') {
        const advancesSettlement = event.kind === 'settlement-milestone';
        const completesVoyage = event.kind === 'raid-complete' && mission.progress >= 5;
        if (!advancesSettlement && !completesVoyage) return mission;
        const progress = Math.min(
          mission.goal,
          mission.progress + (advancesSettlement ? Math.max(1, event.amount ?? 1) : 1)
        );
        return {
          ...mission,
          progress,
          status: progress >= mission.goal ? 'complete' as const : mission.status
        };
      }
      if (!missionMatches(mission, event)) return mission;
      if (mission.targetId && event.targetId && mission.targetId !== event.targetId) return mission;
      const progress = Math.min(mission.goal, mission.progress + Math.max(1, event.amount ?? 1));
      return { ...mission, progress, status: progress >= mission.goal ? 'complete' as const : mission.status };
    })
  };
}

export function claimMissionReward(state: GameState, missionId: string): GameState {
  const mission = state.missions.find((item) => item.id === missionId);
  if (!mission || mission.status !== 'complete' || mission.claimed) return state;
  const credited = creditGameResources(state, mission.reward);
  const factions = { ...credited.factions };
  if (mission.issuerFactionId) {
    const relation = factions[mission.issuerFactionId];
    factions[mission.issuerFactionId] = { ...relation, favor: Math.min(100, relation.favor + 5 + (mission.difficulty ?? 1)), respect: Math.min(100, relation.respect + 3), lastChangedAt: Date.now() };
  }
  const claimedMissions = credited.missions.map((item) =>
    item.id === missionId ? { ...item, claimed: true } : item
  );
  const sequel = storySequelAfter(mission.id);
  const unlocksSequel = sequel && !claimedMissions.some((item) => item.id === sequel.id);
  const storyComplete = mission.id === STORY_MISSION_IDS.at(-1);
  const storyDetail = unlocksSequel
    ? `${sequel.title}이(가) 선장의 장부에 추가되었다.`
    : storyComplete
      ? '왕실 침공함대가 물러나고 검은물결 은신처가 자유 항구로 일어섰다.'
      : undefined;
  return {
    ...credited,
    factions,
    captain: { ...credited.captain, renown: credited.captain.renown + mission.renownReward, experience: credited.captain.experience + mission.renownReward * 4 },
    missions: unlocksSequel ? [...claimedMissions, sequel] : claimedMissions,
    flags: storyComplete ? { ...credited.flags, storyArcComplete: true } : credited.flags,
    world: storyDetail
      ? {
          ...credited.world,
          recentEvents: [storyDetail, ...credited.world.recentEvents].slice(0, 8)
        }
      : credited.world,
    toasts: storyDetail
      ? [...credited.toasts.slice(-3), {
          id: `toast-story-${mission.id}-${Date.now()}`,
          kind: 'success',
          title: storyComplete ? '검은물결 연대기 완결' : '새 이야기 장',
          detail: storyDetail,
          createdAt: Date.now()
        }]
      : credited.toasts
  };
}

export function expireAndRefreshMissions(state: GameState, now = Date.now()): GameState {
  const missions = state.missions.map((mission) => !mission.story && mission.status === 'available' && mission.expiresAt && mission.expiresAt < now ? { ...mission, status: 'failed' as const } : mission).filter((mission) => mission.story || mission.status !== 'failed');
  return { ...state, missions: generateMissionBoard({ ...state, missions }, 5, now) };
}

function issuerFor(type: MissionType): FactionId {
  if (type === 'smuggling') return 'smugglers-guild';
  if (type === 'merchant-raid' || type === 'convoy' || type === 'rival-hunt') return 'free-pirates';
  if (type === 'rescue' || type === 'freeport-dispute' || type === 'haven-defense') return 'free-pirates';
  if (type === 'treasure') return 'isle-kin';
  if (type === 'kidnap' || type === 'cargo-theft') return 'merchant-league';
  return 'red-tide';
}

function missionGoal(type: MissionType, danger: number): number {
  if (type === 'cargo-theft' || type === 'smuggling') return 5 + danger * 2;
  if (type === 'convoy') return Math.min(3, 1 + Math.floor(danger / 3));
  return 1;
}

function missionMatches(mission: Mission, event: MissionEvent): boolean {
  if (event.kind === 'settlement-milestone') return false;
  if (mission.type === 'merchant-raid') return event.kind === 'ship-defeated' && event.opponent === 'merchant';
  if (mission.type === 'convoy') return event.kind === 'ship-defeated' && (event.opponent === 'merchant' || event.opponent === 'navy');
  if (mission.type === 'cargo-theft') return event.kind === 'cargo-stolen';
  if (mission.type === 'rival-hunt') return event.kind === 'ship-defeated' && event.opponent === 'pirate';
  if (mission.type === 'village-raid' || mission.type === 'fort-assault') return event.kind === 'raid-complete';
  if (mission.type === 'smuggling') return event.kind === 'contraband-delivered';
  if (mission.type === 'treasure' || mission.type === 'legendary-hunt') return event.kind === 'treasure-found';
  if (mission.type === 'rescue' || mission.type === 'kidnap') return event.kind === 'survivor-rescued' || event.kind === 'ship-captured';
  if (mission.type === 'haven-defense') return event.kind === 'haven-defended';
  return event.kind === 'raid-complete';
}

function missionDescription(type: MissionType, zoneId: ZoneId, target?: string): string {
  const location = target ?? ZONES[zoneId].name;
  const descriptions: Record<MissionType, string> = {
    'merchant-raid': `${ZONES[zoneId].name}의 상선을 격파하고 화물을 확보하라.`, convoy: `${ZONES[zoneId].name}을 지나는 호송대를 분리해 격파하라.`, 'cargo-theft': `${location}으로 향하는 지정 화물을 빼앗아라.`, rescue: `${location} 부근에서 붙잡힌 선원을 구출하라.`, treasure: `${ZONES[zoneId].name}에 숨겨진 보물 단서를 완성하라.`, 'rival-hunt': `${ZONES[zoneId].name}을 위협하는 경쟁 해적선을 제거하라.`, kidnap: `${location}의 중요 인물을 생포하라.`, smuggling: `${ZONES[zoneId].name} 검문망을 뚫고 금지품을 전달하라.`, 'haven-defense': '다가오는 침공에서 해적 본거지를 지켜라.', 'freeport-dispute': '자유항 분쟁을 해결하고 어느 편에 설지 결정하라.', 'village-raid': `${location}에 상륙해 지정 목표를 약탈하라.`, 'fort-assault': `${location}의 방어선을 무너뜨리고 무기고를 점령하라.`, 'legendary-hunt': `${ZONES[zoneId].name}에서 전설 함선의 흔적을 찾아라.`
  };
  return descriptions[type];
}
