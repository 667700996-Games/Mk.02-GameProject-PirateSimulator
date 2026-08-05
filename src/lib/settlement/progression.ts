import type { PolicyCategory, ProgressAxis, SettlementSimulationState } from './types';

export interface ProgressionNode {
  id: string;
  axis: ProgressAxis;
  name: string;
  cost: number;
  prerequisites: string[];
  description: string;
  effect: string;
}

export const PROGRESSION_NODES: ProgressionNode[] = [
  { id: 'infamy-black-powder', axis: 'infamy', name: '검은 화약 규약', cost: 5, prerequisites: [], description: '위험을 감수하고 화약 생산을 조직한다.', effect: '화약·탄약 공방, 화약고' },
  { id: 'infamy-raiders', axis: 'infamy', name: '갈고리 형제단', cost: 8, prerequisites: ['infamy-black-powder'], description: '전문 약탈자를 훈련하고 막사를 운영한다.', effect: '해적 막사·훈련장·브리간틴' },
  { id: 'infamy-coastal-guns', axis: 'infamy', name: '절벽의 천둥', cost: 10, prerequisites: ['infamy-black-powder'], description: '고지대 사격표와 포대 교리를 확립한다.', effect: '해안 포대' },
  { id: 'infamy-heavy-guns', axis: 'infamy', name: '왕관 파쇄포', cost: 14, prerequisites: ['infamy-coastal-guns'], description: '대구경 함포를 직접 주조한다.', effect: '대포 주조소' },
  { id: 'infamy-linebreaker', axis: 'infamy', name: '전열을 부수는 깃발', cost: 48, prerequisites: ['infamy-heavy-guns', 'seamanship-frigate'], description: '왕실 전열과 정면으로 맞설 함대를 만든다.', effect: '전열함 건조' },
  { id: 'prosperity-foundry', axis: 'prosperity', name: '불꽃 산업', cost: 5, prerequisites: [], description: '광석, 숯과 숙련공을 하나의 금속 생산망으로 묶는다.', effect: '철광산·제련소·대장간' },
  { id: 'prosperity-distilling', axis: 'prosperity', name: '숙성고의 비밀', cost: 6, prerequisites: [], description: '술을 사기와 교역의 핵심 상품으로 만든다.', effect: '증류소·고급 럼' },
  { id: 'prosperity-logistics', axis: 'prosperity', name: '붉은 장부 물류', cost: 8, prerequisites: [], description: '운송 수요를 지역별로 묶어 병목을 줄인다.', effect: '배분소·운반 효율 +10%' },
  { id: 'prosperity-vertical', axis: 'prosperity', name: '절벽 위의 도르래', cost: 12, prerequisites: ['prosperity-logistics'], description: '고저차를 이득으로 바꾸는 화물 기술.', effect: '화물 승강기·집라인' },
  { id: 'prosperity-galleon', axis: 'prosperity', name: '떠다니는 금고', cost: 30, prerequisites: ['prosperity-logistics', 'seamanship-brig'], description: '대량 수송과 장거리 교역을 위한 거대 선체.', effect: '갤리온 건조' },
  { id: 'seamanship-docks', axis: 'seamanship', name: '천연 항구 읽기', cost: 0, prerequisites: [], description: '암초와 조수를 읽어 작은 부두를 세운다.', effect: '소형 부두·부두 창고' },
  { id: 'seamanship-shipyard', axis: 'seamanship', name: '늑골과 용골', cost: 6, prerequisites: ['seamanship-docks'], description: '난파선 기술을 정식 조선 작업으로 발전시킨다.', effect: '조선소·보트·슬루프 건조' },
  { id: 'seamanship-expeditions', axis: 'seamanship', name: '군도 원정술', cost: 8, prerequisites: ['seamanship-shipyard'], description: '보급과 항로 위험을 계산해 함대를 멀리 보낸다.', effect: '원정 사무소·전략 원정' },
  { id: 'seamanship-schooner', axis: 'seamanship', name: '두 돛대의 바람', cost: 10, prerequisites: ['seamanship-shipyard'], description: '장거리 정찰과 약탈에 적합한 선체.', effect: '스쿠너 건조' },
  { id: 'seamanship-brig', axis: 'seamanship', name: '철제 삭구', cost: 18, prerequisites: ['seamanship-schooner'], description: '더 무거운 함포를 견디는 리깅.', effect: '브리그 건조' },
  { id: 'seamanship-frigate', axis: 'seamanship', name: '푸른 수평선 교리', cost: 32, prerequisites: ['seamanship-brig'], description: '왕실 순양함과 맞먹는 고속 전투함.', effect: '프리깃 건조' },
  { id: 'seamanship-legendary', axis: 'seamanship', name: '별 없는 바다', cost: 80, prerequisites: ['seamanship-frigate'], description: '고대 부품과 해도를 이용해 전설의 선체를 복원한다.', effect: '전설 함선 복원' },
  { id: 'federation-housing', axis: 'federation', name: '공동 해먹 규약', cost: 0, prerequisites: [], description: '노숙자에게 공동 숙소와 책임을 제공한다.', effect: '공동 숙소' },
  { id: 'federation-care', axis: 'federation', name: '부상자는 동료다', cost: 6, prerequisites: ['federation-housing'], description: '약품과 의무관을 공동 자산으로 취급한다.', effect: '의무실·사망률 감소' },
  { id: 'federation-council', axis: 'federation', name: '검은 깃발 의회', cost: 12, prerequisites: ['federation-housing'], description: '선장, 노동자와 약탈자의 이해를 협상한다.', effect: '해적 의회·정책 슬롯 강화' },
  { id: 'federation-captains', axis: 'federation', name: '여러 깃발, 하나의 항구', cost: 20, prerequisites: ['federation-council', 'seamanship-expeditions'], description: '부하 선장에게 정식 권리와 의무를 부여한다.', effect: '복수 함대·동맹 작전' }
];

export interface PolicyDefinition {
  id: string;
  category: PolicyCategory;
  name: string;
  benefit: string;
  drawback: string;
}

export const POLICIES: PolicyDefinition[] = [
  { id: 'captains-tithe', category: 'loot', name: '선장 몫 우선', benefit: '원정 금화 +15%', drawback: '주민 충성도 감소' },
  { id: 'equal-shares', category: 'loot', name: '균등 분배', benefit: '사기와 충성도 증가', drawback: '정착지 금화 수익 -10%' },
  { id: 'battle-merit', category: 'loot', name: '전투 공헌 분배', benefit: '전문 해적 경험 +20%', drawback: '비전투 노동자 불만' },
  { id: 'free-labor', category: 'labor', name: '자유 노동', benefit: '충성도 증가', drawback: '생산 효율 기준값' },
  { id: 'forced-quota', category: 'labor', name: '강제 할당', benefit: '생산 속도 +18%', drawback: '사기와 충성도 감소' },
  { id: 'merit-pay', category: 'labor', name: '성과 보상', benefit: '숙련자 생산 +12%', drawback: '급여 비용 증가' },
  { id: 'equal-rations', category: 'food', name: '균등 배급', benefit: '모든 계층 사기 안정', drawback: '함대 보급 우선권 없음' },
  { id: 'worker-rations', category: 'food', name: '노동자 우선', benefit: '생산 노동자 피로 회복', drawback: '장교 불만' },
  { id: 'fleet-rations', category: 'food', name: '함대 우선', benefit: '원정 사기 +12', drawback: '정착지 식량 욕구 악화' },
  { id: 'reserve-rations', category: 'food', name: '비축 우선', benefit: '소비량 -12%', drawback: '전체 사기 감소' },
  { id: 'ransom', category: 'prisoners', name: '몸값 협상', benefit: '금화 수익', drawback: '석방된 적이 정보 제공' },
  { id: 'prison-labor', category: 'prisoners', name: '포로 노동', benefit: '기초 노동력 증가', drawback: '치안·충성도 위험' },
  { id: 'crew-conversion', category: 'prisoners', name: '선원 편입', benefit: '약탈자 모집', drawback: '초기 충성도 낮음' },
  { id: 'raid-all', category: 'diplomacy', name: '모든 깃발 약탈', benefit: '표적과 전리품 증가', drawback: '모든 세력 적대 증가' },
  { id: 'protected-traders', category: 'diplomacy', name: '보호 상단 지정', benefit: '안정적인 무역', drawback: '약탈 표적 감소' },
  { id: 'smuggler-favor', category: 'diplomacy', name: '밀수업자 우대', benefit: '희귀품 가격 개선', drawback: '해군 탐지 위험 증가' }
];

export function unlockProgression(state: SettlementSimulationState, nodeId: string): { state: SettlementSimulationState; ok: boolean; reason?: string } {
  const node = PROGRESSION_NODES.find((item) => item.id === nodeId);
  if (!node) return { state, ok: false, reason: '발전 항목을 찾을 수 없습니다.' };
  if (state.progression.unlocked.includes(node.id)) return { state, ok: false, reason: '이미 해금한 발전입니다.' };
  if (!node.prerequisites.every((id) => state.progression.unlocked.includes(id))) return { state, ok: false, reason: '선행 발전이 필요합니다.' };
  if (state.progression.points[node.axis] < node.cost) return { state, ok: false, reason: `${node.cost - state.progression.points[node.axis]} 발전점이 더 필요합니다.` };
  return {
    state: {
      ...state,
      progression: {
        points: { ...state.progression.points, [node.axis]: state.progression.points[node.axis] - node.cost },
        unlocked: [...state.progression.unlocked, node.id]
      }
    },
    ok: true
  };
}

export function enactPolicy(state: SettlementSimulationState, policyId: string): SettlementSimulationState {
  const policy = POLICIES.find((item) => item.id === policyId);
  if (!policy) return state;
  return { ...state, policies: { active: { ...state.policies.active, [policy.category]: policy.id } } };
}
