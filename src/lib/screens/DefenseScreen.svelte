<script lang="ts">
  import { FACTIONS } from '$lib/domain/catalog';
  import {
    beginDefensePreparation,
    batteryAmmunition,
    claimDefenseResult,
    launchDefense,
    prepareDefense,
    resolveInteriorStage,
    resolveLandingStage,
    resolveNavalStage,
    type InteriorAction,
    type LandingAction,
    type NavalAction,
    type PreparationAction
  } from '$lib/domain/defense';
  import { fleetDefensePower } from '$lib/domain/fleet';
  import { gameSession } from '$lib/stores/gameStore';
  import { aggregateInventory } from '$lib/settlement/construction';
  import { SETTLEMENT_RESOURCES } from '$lib/settlement/catalog';
  import type { PartialSettlementInventory, SettlementResourceId } from '$lib/settlement/types';
  import type { FactionId, GameState } from '$lib/domain/types';

  let { game } = $props<{ game: GameState }>();
  let attacker = $derived(FACTIONS[game.defense.attacker as FactionId]);
  let fleetPower = $derived(fleetDefensePower(game));
  let remaining = $derived(game.defense.attackerRemaining ?? game.defense.attackStrength);
  let inventory = $derived(aggregateInventory(game.settlement));
  let batteryAmmo = $derived(batteryAmmunition(game.settlement));

  const stageLabels = [
    ['preparation', '준비'], ['naval', '해상 방어'], ['landing', '상륙 저지'], ['interior', '본거지 내부'], ['resolved', '결과']
  ] as const;
  const prepActions: { id: PreparationAction; name: string; detail: string; cost: PartialSettlementInventory }[] = [
    { id: 'muster', name: '민병 소집', detail: '방어 +16 · 민간 위험 -4', cost: { hardtack: 10, rum: 4 } },
    { id: 'powder', name: '포대 장전 확인', detail: '방어 +24 · 현장 탄약 18 이상 필요', cost: {} },
    { id: 'barricades', name: '목책 강화', detail: '방어 +20 · 민간 위험 -8', cost: { planks: 18, 'iron-ingots': 5 } },
    { id: 'evacuate', name: '주민 대피', detail: '방어 +6 · 민간 위험 -30', cost: { hardtack: 8 } }
  ];
  const navalActions: { id: NavalAction; name: string; detail: string }[] = [
    { id: 'crossfire', name: '포대 교차 사격', detail: '균형 전술 · 함선과 본거지 위험 보통' },
    { id: 'fleet-charge', name: '함대 중앙 돌파', detail: '강력한 화력 · 주둔 함선 손상 위험' },
    { id: 'fire-ships', name: '화공선 투입', detail: '최대 화력 · 항구 시설 피해 위험' }
  ];
  const landingActions: { id: LandingAction; name: string; detail: string }[] = [
    { id: 'beach-ambush', name: '해변 매복', detail: '균형적 소모전 · 사수대 활용' },
    { id: 'hold-walls', name: '목책 사수', detail: '낮은 사상 위험 · 적을 내부로 끌어들임' },
    { id: 'counterattack', name: '해적단 역습', detail: '최대 타격 · 전투원과 주민 위험' }
  ];
  const interiorActions: { id: InteriorAction; name: string; detail: string }[] = [
    { id: 'last-stand', name: '관저 최후 방어', detail: '핵심 시설을 지키며 총력전' },
    { id: 'powder-trap', name: '화약 덫', detail: '승리 확률 최대 · 시설과 민간 피해 위험' },
    { id: 'organized-retreat', name: '조직적 후퇴', detail: '주민 보호 우선 · 저장 자원 손실 위험' }
  ];

  function update(transform: (state: GameState) => GameState, save = false): void {
    gameSession.updateGame(transform, save);
  }

  function canAfford(action: (typeof prepActions)[number]): boolean {
    if (action.id === 'powder') return batteryAmmo >= 18;
    return (Object.entries(action.cost) as [SettlementResourceId, number][]).every(([id, amount]) => (inventory[id] ?? 0) >= amount);
  }

  function costLabel(action: (typeof prepActions)[number]): string {
    if (action.id === 'powder') return `포대 현장 탄약 ${Math.floor(batteryAmmo)} / 18`;
    return (Object.entries(action.cost) as [SettlementResourceId, number][]).map(([id, amount]) => `${SETTLEMENT_RESOURCES[id].name} ${amount}`).join(' · ');
  }
</script>

<section class="event-screen defense-screen">
  <article class="event-card panel defense-card">
    <header class="defense-header">
      <div><span class="eyebrow danger">HAVEN UNDER ATTACK</span><h1>검은 깃발을 지켜라</h1><p class="muted">{attacker.name} 침공군이 만을 넘어오고 있습니다. 선택한 전술에 따라 함대, 시설과 주민의 운명이 달라집니다.</p></div>
      <span class="tag danger">{attacker.name}</span>
    </header>

    <nav class="defense-stages" aria-label="방어전 단계">
      {#each stageLabels as stage, index}
        {@const current = stageLabels.findIndex((item) => item[0] === game.defense.stage)}
        <span class:active={stage[0] === game.defense.stage} class:passed={index < current}>{index + 1} · {stage[1]}</span>
      {/each}
    </nav>

    <div class="versus compact">
      <div class="force-card"><span class="eyebrow">BLACKWAKE DEFENSE</span><div class="force-number">{Math.round(game.defense.defenseStrength || game.haven.defense + fleetPower + (game.defense.preparation ?? 0))}</div><small>포대 {game.haven.defense} · 함대 {fleetPower}</small></div>
      <div class="versus-mark">⚔</div>
      <div class="force-card"><span class="eyebrow danger">INVASION FORCE</span><div class="force-number danger">{Math.round(remaining)}</div><small>초기 전력 {game.defense.attackStrength}</small></div>
      <div class="force-card"><span class="eyebrow">CIVILIAN RISK</span><div class="force-number">{Math.round(game.defense.civilianRisk ?? 55)}%</div><small>주민 {game.haven.population}명 · 전투원 {game.haven.populationByRole.fighters}명</small></div>
    </div>

    {#if game.defense.stage === 'warning'}
      <div class="stage-copy"><span class="eyebrow">ALARM BELLS</span><h2>적 접근 경보</h2><p>감시탑의 종소리가 울립니다. 남은 시간 동안 자원을 투입해 방어선을 준비하십시오.</p><button class="btn primary" onclick={() => update(beginDefensePreparation)}>방어 준비 지휘</button></div>
    {:else if game.defense.stage === 'preparation'}
      <div class="stage-copy"><span class="eyebrow">MUSTER THE COVE</span><h2>전투 준비</h2><p>모든 준비는 실제 비축물을 소모합니다. 민간인을 대피시키지 않으면 전투 중 큰 피해가 날 수 있습니다.</p></div>
      <div class="action-grid defense-actions">
        {#each prepActions as action}
          {@const selected = game.defense.selectedActions?.includes(action.id)}
          <button class="btn tactical" class:selected onclick={() => update((state) => prepareDefense(state, action.id), true)} disabled={selected || !canAfford(action)}><strong>{selected ? '✓ ' : ''}{action.name}</strong><small>{action.detail}</small><em>{costLabel(action)}</em></button>
        {/each}
      </div>
      <button class="btn primary wide" onclick={() => update(launchDefense, true)}>해안 포대 발사 · 방어전 개시</button>
    {:else if game.defense.stage === 'naval'}
      <div class="stage-copy"><span class="eyebrow">THE BAY BURNS</span><h2>해상 방어전</h2><p>적 함대가 포연 사이로 전진합니다. 화력과 함선 손실, 항구 피해 사이에서 선택하십시오.</p></div>
      <div class="action-grid defense-actions">{#each navalActions as action}<button class="btn tactical" onclick={() => update((state) => resolveNavalStage(state, action.id), true)}><strong>{action.name}</strong><small>{action.detail}</small></button>{/each}</div>
    {:else if game.defense.stage === 'landing'}
      <div class="stage-copy"><span class="eyebrow">BOOTS ON THE SHORE</span><h2>상륙대 저지</h2><p>살아남은 적이 해변에 다당했습니다. 수비대의 사상자와 민간 위험을 감수하고 저지선을 고르십시오.</p></div>
      <div class="action-grid defense-actions">{#each landingActions as action}<button class="btn tactical" onclick={() => update((state) => resolveLandingStage(state, action.id), true)}><strong>{action.name}</strong><small>{action.detail}</small></button>{/each}</div>
    {:else if game.defense.stage === 'interior'}
      <div class="stage-copy"><span class="eyebrow danger">THE WALL IS BREACHED</span><h2>본거지 내부 전투</h2><p>부두와 목책이 뚫겼습니다. 자원과 시설, 주민 중 무엇을 지킬지 최종 명령을 내리십시오.</p></div>
      <div class="action-grid defense-actions">{#each interiorActions as action}<button class="btn tactical" onclick={() => update((state) => resolveInteriorStage(state, action.id), true)}><strong>{action.name}</strong><small>{action.detail}</small></button>{/each}</div>
    {:else}
      <div class="result-banner" class:victory={game.defense.outcome === 'victory'}><span class="eyebrow">AFTER ACTION REPORT</span><h2>{game.defense.outcome === 'victory' ? '검은물결이 침공자를 삼켰습니다' : '본거지는 살아남았지만 대가를 치렀습니다'}</h2><p>{game.defense.damage?.join(' · ')}</p>{#if Object.keys(game.defense.reward ?? {}).length}<p class="brass">전리품: {Object.entries(game.defense.reward ?? {}).map(([id, amount]) => `${id} ${amount}`).join(' · ')}</p>{/if}<button class="btn primary" onclick={() => update(claimDefenseResult, true)}>손상 점검 후 본거지로</button></div>
    {/if}

    {#if game.defense.log?.length}
      <aside class="battle-log"><span class="eyebrow">BATTLE LOG</span>{#each game.defense.log.slice(-6) as entry}<p>{entry}</p>{/each}</aside>
    {/if}
  </article>
</section>

<style>
  .defense-screen{padding:1rem;overflow:auto}.defense-card{width:min(1160px,100%);margin:auto;text-align:left;padding:1.4rem}.defense-header{display:flex;justify-content:space-between;gap:2rem;align-items:flex-start}.defense-header h1{font-size:clamp(2.7rem,6vw,5rem);line-height:.86;margin:.35rem 0 1rem}.defense-stages{display:grid;grid-template-columns:repeat(5,1fr);gap:.35rem;margin:1.25rem 0}.defense-stages span{padding:.55rem .35rem;text-align:center;border:1px solid var(--line);color:var(--muted);font-size:.7rem;letter-spacing:.08em}.defense-stages span.active{border-color:var(--brass);color:var(--brass);background:rgba(197,151,82,.11)}.defense-stages span.passed{color:#789f8d;border-color:#46685a}.versus.compact{margin:1rem 0;grid-template-columns:1fr auto 1fr 1fr}.versus.compact .force-card{padding:1rem}.versus.compact .force-number{font-size:2.1rem}.stage-copy{text-align:center;max-width:760px;margin:1.35rem auto}.stage-copy h2{font-size:2rem;margin:.25rem}.defense-actions{grid-template-columns:repeat(3,1fr);margin:1rem 0}.defense-actions:has(.tactical:nth-child(4)){grid-template-columns:repeat(4,1fr)}.tactical{min-height:104px;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;text-align:left}.tactical strong{font-family:var(--font-display);font-size:1.15rem}.tactical small{margin-top:.3rem;white-space:normal}.tactical em{margin-top:.45rem;color:var(--brass);font-style:normal;font-size:.67rem}.tactical.selected{border-color:#789f8d;background:rgba(79,120,102,.17)}.result-banner{text-align:center;padding:2rem;border:1px solid #8d433b;background:linear-gradient(135deg,rgba(132,39,35,.2),rgba(0,0,0,.14))}.result-banner.victory{border-color:#648e79;background:linear-gradient(135deg,rgba(58,112,83,.2),rgba(0,0,0,.14))}.result-banner h2{font-size:2.4rem}.battle-log{margin-top:1.15rem;padding:1rem;border-left:2px solid var(--brass);background:rgba(4,10,13,.52)}.battle-log p{font-size:.78rem;color:var(--muted);margin:.35rem 0}.battle-log p:last-child{color:var(--paper)}@media(max-width:800px){.defense-card{padding:.8rem}.defense-header{display:block}.defense-stages{grid-template-columns:1fr}.versus.compact{grid-template-columns:1fr 1fr}.versus-mark{display:none}.defense-actions,.defense-actions:has(.tactical:nth-child(4)){grid-template-columns:1fr 1fr}}@media(max-width:520px){.defense-actions,.defense-actions:has(.tactical:nth-child(4)),.versus.compact{grid-template-columns:1fr}}
</style>
