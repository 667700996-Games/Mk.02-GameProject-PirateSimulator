import { FACILITIES } from './catalog';
import { hasResources, transferStock } from './economy';
import { clamp } from './physics';
import type { CaptainTrait, FacilityId, GameState, HavenState, ResourceId, ResourceStock } from './types';

export interface BuildCheck {
  allowed: boolean;
  reason?: string;
  cost: Partial<ResourceStock>;
  nextLevel: number;
}

export const HAVEN_TIERS = [
  { tier: 1, name: '숨겨진 해안 야영지', renown: 0, population: 0 },
  { tier: 2, name: '소형 해적 은신처', renown: 70, population: 24 },
  { tier: 3, name: '해적 전초기지', renown: 190, population: 55 },
  { tier: 4, name: '해적 항구', renown: 420, population: 110 },
  { tier: 5, name: '요새화된 해적 본거지', renown: 820, population: 210 },
  { tier: 6, name: '해적 도시', renown: 1450, population: 420 },
  { tier: 7, name: '전설적인 해적 왕국', renown: 2600, population: 800 }
];

export function facilityCost(id: FacilityId, nextLevel: number, trait?: CaptainTrait): Partial<ResourceStock> {
  const definition = FACILITIES[id];
  const levelScale = Math.pow(1.62, Math.max(0, nextLevel - 1));
  const architect = trait === 'architect' ? 0.88 : 1;
  return Object.fromEntries(
    (Object.entries(definition.baseCost) as [ResourceId, number][]).map(([resource, value]) => [resource, Math.max(1, Math.ceil(value * levelScale * architect))])
  ) as Partial<ResourceStock>;
}

export function checkFacilityBuild(state: GameState, id: FacilityId): BuildCheck {
  const definition = FACILITIES[id];
  const current = state.haven.facilities[id]?.level ?? 0;
  const nextLevel = current + 1;
  const cost = facilityCost(id, nextLevel, state.captain.trait);
  if (nextLevel > definition.maxLevel) return { allowed: false, reason: '최대 단계입니다.', cost, nextLevel };
  if (state.haven.tier < definition.unlockTier) return { allowed: false, reason: `본거지 ${definition.unlockTier}단계가 필요합니다.`, cost, nextLevel };
  if (definition.prerequisite) {
    const prerequisite = state.haven.facilities[definition.prerequisite.id]?.level ?? 0;
    if (prerequisite < definition.prerequisite.level) {
      return { allowed: false, reason: `${FACILITIES[definition.prerequisite.id].name} ${definition.prerequisite.level}단계가 필요합니다.`, cost, nextLevel };
    }
  }
  if (!hasResources(state.resources, cost)) return { allowed: false, reason: '건설 자원이 부족합니다.', cost, nextLevel };
  const availableWorkers = state.haven.populationByRole.laborers - assignedWorkers(state.haven);
  if (availableWorkers < Math.max(1, Math.ceil(definition.workersPerLevel / 2))) return { allowed: false, reason: '가용 노동자가 부족합니다.', cost, nextLevel };
  return { allowed: true, cost, nextLevel };
}

export function assignedWorkers(haven: HavenState): number {
  return Object.values(haven.facilities).reduce((sum, facility) => sum + (facility?.workers ?? 0), 0);
}

export function buildFacility(state: GameState, id: FacilityId, now = Date.now()): GameState {
  const check = checkFacilityBuild(state, id);
  if (!check.allowed) return state;
  const definition = FACILITIES[id];
  const current = state.haven.facilities[id];
  const workers = Math.min(definition.workersPerLevel * check.nextLevel, Math.max(definition.workersPerLevel, state.haven.populationByRole.laborers));
  const baseMinutes = 18 + check.nextLevel * 12;
  const duration = baseMinutes * 60_000 * (state.captain.trait === 'architect' ? 0.85 : 1);
  return {
    ...state,
    resources: transferStock(state.resources, check.cost),
    haven: {
      ...state.haven,
      facilities: {
        ...state.haven.facilities,
        [id]: {
          id,
          level: check.nextLevel,
          condition: current?.condition ?? 100,
          workers,
          constructionEndsAt: now + duration
        }
      }
    }
  };
}

export function completeConstructions(haven: HavenState, now = Date.now()): HavenState {
  const facilities = Object.fromEntries(
    Object.entries(haven.facilities).map(([id, facility]) => [id, facility && facility.constructionEndsAt && facility.constructionEndsAt <= now ? { ...facility, constructionEndsAt: undefined } : facility])
  ) as HavenState['facilities'];
  return { ...haven, facilities };
}

export function facilityEfficiency(haven: HavenState, id: FacilityId): number {
  const facility = haven.facilities[id];
  if (!facility || facility.constructionEndsAt) return 0;
  const required = FACILITIES[id].workersPerLevel * facility.level;
  const staffing = clamp(facility.workers / Math.max(required, 1), 0, 1);
  return staffing * (facility.condition / 100) * (0.55 + haven.morale / 220) * (0.68 + haven.order / 310);
}

export function calculateHavenDefense(haven: HavenState): number {
  const battery = (haven.facilities['coastal-battery']?.level ?? 0) * 34 * facilityEfficiency(haven, 'coastal-battery');
  const tower = (haven.facilities.watchtower?.level ?? 0) * 12 * facilityEfficiency(haven, 'watchtower');
  const trained = (haven.facilities['training-yard']?.level ?? 0) * 8;
  const fighters = haven.populationByRole.fighters * (0.75 + trained / 100);
  return Math.round(10 + haven.tier * 8 + battery + tower + fighters + haven.assignedDefenders.length * 26);
}

export function tickHavenDay(haven: HavenState): { haven: HavenState; events: string[] } {
  const events: string[] = [];
  const foodNeed = Math.ceil(haven.population * 0.7);
  const food = Math.max(0, haven.food - foodNeed);
  let morale = haven.morale;
  let order = haven.order;
  let sanitation = haven.sanitation;
  let population = haven.population;
  if (haven.food < foodNeed) {
    morale -= 9;
    order -= 5;
    events.push('식량 부족으로 주민과 선원 사이에 불만이 퍼졌다.');
    if (haven.food === 0) population = Math.max(1, population - Math.max(1, Math.floor(population * 0.03)));
  } else {
    morale += facilityEfficiency(haven, 'tavern') * 2;
  }
  sanitation += facilityEfficiency(haven, 'infirmary') * 2 - population / Math.max(120, haven.tier * 160);
  order += (haven.facilities.prison?.level ?? 0) * 0.5 - Math.max(0, population - haven.tier * 100) * 0.015;
  if (order < 30 && Math.random() < 0.2) {
    events.push('창고에서 물자가 사라졌다. 낮은 치안이 도둑을 불러들였다.');
    morale -= 3;
  }
  return {
    haven: {
      ...haven,
      food,
      population,
      morale: clamp(morale, 0, 100),
      order: clamp(order, 0, 100),
      sanitation: clamp(sanitation, 0, 100),
      defense: calculateHavenDefense(haven),
      detectionRisk: clamp(haven.detectionRisk + haven.tier * 0.45 - facilityEfficiency(haven, 'hidden-dock') * 2, 0, 100)
    },
    events
  };
}

export function calculateHavenTier(renown: number, population: number): number {
  let tier = 1;
  for (const definition of HAVEN_TIERS) {
    if (renown >= definition.renown && population >= definition.population) tier = definition.tier;
  }
  return tier;
}
