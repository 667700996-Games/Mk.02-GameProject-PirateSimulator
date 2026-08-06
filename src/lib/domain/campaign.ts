import type { GameState } from './types';

export interface CampaignObjective {
  id: string;
  name: string;
  detail: string;
  current: number;
  target: number;
  complete: boolean;
}

const CAPITAL_UNLOCKS = ['infamy-linebreaker', 'prosperity-galleon', 'seamanship-legendary', 'federation-captains'];
const CAPITAL_SHIPS = new Set(['frigate', 'galleon', 'ship-of-the-line', 'legendary']);

export function campaignObjectives(state: GameState): CampaignObjective[] {
  const activeBuildings = state.settlement.buildings.filter((building) => building.state === 'ACTIVE' && building.definitionId !== 'wreckage').length;
  const verticalWorks = state.settlement.buildings.filter((building) => building.state === 'ACTIVE' && ['bridge', 'stairs', 'ramp', 'cargo-lift', 'zipline-post', 'cliff-platform'].includes(building.definitionId)).length;
  const completedExpeditions = state.settlement.expeditions.filter((expedition) => expedition.state === 'COMPLETED').length;
  const legendReached = state.settlement.expeditions.some((expedition) => expedition.state === 'COMPLETED' && expedition.zoneId === 'legend-sea');
  const unlockedCurrents = CAPITAL_UNLOCKS.filter((id) => state.settlement.progression.unlocked.includes(id)).length;
  const capitalShips = state.ships.filter((ship) => CAPITAL_SHIPS.has(ship.class)).length;
  const discoveredZones = Object.values(state.world.zones).filter((zone) => zone.discovered).length;
  return [
    { id: 'capital', name: '절벽 위의 해적 도시', detail: '인구 120명과 가동 시설 36개를 유지한다.', current: Math.min(120, state.settlement.residents.length) + Math.min(36, activeBuildings), target: 156, complete: state.settlement.residents.length >= 120 && activeBuildings >= 36 },
    { id: 'vertical', name: '입체 항만망', detail: '교량·계단·승강기 등 수직 물류 구조 6개를 가동한다.', current: verticalWorks, target: 6, complete: verticalWorks >= 6 },
    { id: 'fleet', name: '검은 함대', detail: '함선 4척과 프리깃급 이상 주력함 1척을 보유한다.', current: Math.min(4, state.ships.length) + Math.min(1, capitalShips), target: 5, complete: state.ships.length >= 4 && capitalShips >= 1 },
    { id: 'archipelago', name: '군도 지배', detail: '8개 해역을 밝히고 원정 6회를 귀환시킨다.', current: Math.min(8, discoveredZones) + Math.min(6, completedExpeditions), target: 14, complete: discoveredZones >= 8 && completedExpeditions >= 6 },
    { id: 'legend', name: '전설의 바다에서 귀환', detail: '전설의 바다 원정을 완료한다.', current: legendReached ? 1 : 0, target: 1, complete: legendReached },
    { id: 'currents', name: '네 물결의 통치', detail: '악명·번영·항해술·해적 연방의 최종 교리를 확립한다.', current: unlockedCurrents, target: 4, complete: unlockedCurrents >= 4 },
    { id: 'defense', name: '왕관을 꺾은 섬', detail: '본거지 침공을 한 차례 방어한다.', current: state.flags.havenDefenseWon ? 1 : 0, target: 1, complete: !!state.flags.havenDefenseWon }
  ];
}

export function evaluateCampaign(state: GameState, now = Date.now()): GameState {
  if (state.flags.campaignVictory) return state;
  const objectives = campaignObjectives(state);
  if (!objectives.every((objective) => objective.complete)) return state;
  return {
    ...state,
    flags: { ...state.flags, campaignVictory: true, campaignVictoryAcknowledged: false },
    toasts: [...state.toasts.slice(-3), {
      id: `toast-campaign-${now}`,
      kind: 'success',
      title: '해적 왕국 선포',
      detail: '군도 전역의 자유 선장들이 당신의 깃발 아래 해적 연방을 선포했습니다.',
      createdAt: now
    }]
  };
}
