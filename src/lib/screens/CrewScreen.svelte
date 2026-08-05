<script lang="ts">
  import { JOB_NAMES, POPULATION_TIERS } from '$lib/settlement/catalog';
  import { aggregateInventory, spendSettlementResources } from '$lib/settlement/construction';
  import { setResidentJob } from '$lib/settlement/simulation';
  import { gameSession } from '$lib/stores/gameStore';
  import type { JobId, PopulationTier, Resident, SettlementBuilding, WorkforceRule } from '$lib/settlement/types';
  import type { CrewRole, GameState } from '$lib/domain/types';

  let { game } = $props<{ game: GameState }>();
  let selectedId = $state<string>();
  let tierFilter = $state<PopulationTier | 'all'>('all');
  let jobFilter = $state<JobId | 'all'>('all');
  let search = $state('');
  const shipRoleNames: Record<CrewRole, string> = { deckhand: '일반 선원', gunner: '포수', navigator: '항해사', marine: '전투원', carpenter: '수리공', medic: '의무병', cook: '조리사' };
  const allJobs = Object.keys(JOB_NAMES) as JobId[];
  let residents: Resident[] = $derived(game.settlement.residents.filter((resident: Resident) =>
    (tierFilter === 'all' || resident.tier === tierFilter) &&
    (jobFilter === 'all' || resident.job === jobFilter) &&
    (!search.trim() || resident.name.includes(search.trim()))));
  let selected: Resident | undefined = $derived(game.settlement.residents.find((resident: Resident) => resident.id === selectedId) ?? residents[0]);
  let inventory = $derived(aggregateInventory(game.settlement));
  let averageMorale = $derived(game.settlement.residents.reduce((sum: number, resident: Resident) => sum + resident.morale, 0) / Math.max(1, game.settlement.residents.length));
  let unemployed = $derived(game.settlement.residents.filter((resident: Resident) => resident.job === 'unassigned').length);
  let wages = $derived(Math.ceil(game.settlement.residents.reduce((sum: number, resident: Resident) => sum + ({ castaway: 0, laborer: 1, skilled: 2, pirate: 4, elite: 7, officer: 12 }[resident.tier]), 0)));
  let workforce: WorkforceRule[] = $derived(game.settlement.workforce);
  let hasHome = $derived(!!selected && game.settlement.buildings.some((building: SettlementBuilding) => building.id === selected?.homeId));
  let hasWorkplace = $derived(!!selected && game.settlement.buildings.some((building: SettlementBuilding) => building.id === selected?.workplaceId));

  function assignJob(residentId: string, job: JobId): void {
    gameSession.updateGame((state) => ({ ...state, settlement: setResidentJob(state.settlement, residentId, job) }), true);
  }

  function updateRule(job: JobId, patch: Partial<WorkforceRule>): void {
    gameSession.updateGame((state) => ({
      ...state,
      settlement: { ...state.settlement, workforce: state.settlement.workforce.map((rule) => rule.job === job ? { ...rule, ...patch } : rule) }
    }), true);
  }

  function pay(): void {
    if ((inventory.gold ?? 0) < wages) return;
    gameSession.updateGame((state) => {
      const paid = spendSettlementResources(state.settlement, { gold: wages });
      if (!paid) return state;
      return { ...state, settlement: { ...paid, residents: paid.residents.map((resident) => ({ ...resident, morale: Math.min(100, resident.morale + 4), loyalty: Math.min(100, resident.loyalty + 6) })) } };
    }, true);
  }
</script>

<section class="management-screen resident-screen">
  <header class="management-header"><div><span class="eyebrow">THE LIVING MUSTER</span><h1>주민과 노동력</h1><p class="muted">모든 망치와 손수레에는 이름, 잠자리와 불만이 있습니다.</p></div><div class="header-tags"><span class="tag">인구 {game.settlement.residents.length}</span><span class="tag">미배치 {unemployed}</span><span class="tag">평균 사기 {Math.round(averageMorale)}</span></div></header>
  <div class="resident-layout">
    <article class="panel resident-roster">
      <div class="panel-title"><div><span class="eyebrow">RESIDENT LEDGER</span><h2>정착민 명부</h2></div><span class="tag">표시 {residents.length}</span></div>
      <div class="resident-filters"><input aria-label="주민 검색" placeholder="이름 검색" bind:value={search}/><select aria-label="계층 필터" bind:value={tierFilter}><option value="all">모든 계층</option>{#each Object.entries(POPULATION_TIERS) as [id, tier]}<option value={id}>{tier.name}</option>{/each}</select><select aria-label="직업 필터" bind:value={jobFilter}><option value="all">모든 직업</option>{#each allJobs as job}<option value={job}>{JOB_NAMES[job]}</option>{/each}</select></div>
      <div class="resident-list">
        {#each residents as resident}
          {@const needs = Object.values(resident.needs).reduce((sum, value) => sum + value, 0) / Object.values(resident.needs).length}
          <button class:selected={selected?.id === resident.id} onclick={() => (selectedId = resident.id)}>
            <span class={`portrait tier-${resident.tier}`}>{resident.name[0]}</span>
            <span><strong>{resident.name}</strong><small>{POPULATION_TIERS[resident.tier].name} · {JOB_NAMES[resident.job]}</small></span>
            <span class="resident-bars"><i><b style={`--value:${resident.health}%`}></b></i><i><b style={`--value:${resident.morale}%;--bar:#bd8954`}></b></i><small>욕구 {Math.round(needs)}</small></span>
            <em>{resident.action}</em>
          </button>
        {:else}<div class="muted" style="padding:2rem;text-align:center">조건에 맞는 주민이 없습니다.</div>{/each}
      </div>
    </article>

    <article class="panel resident-detail">
      {#if selected}
        <div class="resident-profile"><div class={`large-portrait tier-${selected.tier}`}>{selected.name[0]}</div><div><span class="eyebrow">{POPULATION_TIERS[selected.tier].name}</span><h2>{selected.name}</h2><p>{JOB_NAMES[selected.job]} · 현재 {selected.action}</p></div></div>
        <label class="job-select">직업 배치<select value={selected.job} onchange={(event) => assignJob(selected.id, event.currentTarget.value as JobId)}>{#each allJobs as job}<option value={job}>{JOB_NAMES[job]}</option>{/each}</select></label>
        <div class="detail-stats"><div><small>건강</small><b>{Math.round(selected.health)}</b></div><div><small>사기</small><b>{Math.round(selected.morale)}</b></div><div><small>충성</small><b>{Math.round(selected.loyalty)}</b></div><div><small>피로</small><b>{Math.round(selected.fatigue)}</b></div><div><small>경험</small><b>{Math.round(selected.experience)}</b></div><div><small>위치</small><b>{selected.position.x.toFixed(1)}:{selected.position.y.toFixed(1)}</b></div></div>
        <h3>욕구 진단</h3><div class="needs-list">{#each Object.entries(selected.needs) as [need, value]}<div><span>{({ water:'식수',food:'식량',housing:'주거',clothing:'의복',health:'의료',leisure:'휴식',pirateCulture:'해적 문화',equipment:'장비' } as Record<string,string>)[need]}</span><div class="meter"><span style={`--value:${value}%;--meter-color:${value < 35 ? '#b64d42' : value < 60 ? '#b28249' : '#6e9f84'}`}></span></div><b class:danger={value < 35}>{Math.round(value)}</b></div>{/each}</div>
        <div class="assignment-map"><span><small>숙소</small><b>{hasHome ? '배정됨' : '노숙'}</b></span><span><small>근무지</small><b>{hasWorkplace ? '배정됨' : '없음'}</b></span></div>
      {/if}
    </article>

    <article class="panel workforce-panel">
      <div class="panel-title"><div><span class="eyebrow">LABOR PRIORITIES</span><h2>자동 배치 규칙</h2></div></div>
      <div class="workforce-list">{#each workforce as rule}<div class="workforce-row"><span><strong>{JOB_NAMES[rule.job]}</strong><small>최소 {rule.minimum} · 최대 {rule.maximum}</small></span><div class="priority-buttons" aria-label={`${JOB_NAMES[rule.job]} 우선순위`}>{#each [1,2,3,4,5] as priority}<button class:active={rule.priority === priority} onclick={() => updateRule(rule.job, { priority: priority as 1|2|3|4|5 })}>{priority}</button>{/each}</div><label><input type="checkbox" checked={rule.autoAssign} onchange={(event) => updateRule(rule.job, { autoAssign: event.currentTarget.checked })}/> 자동</label></div>{/each}</div>
      <div class="payroll"><span><strong>정착지 급여</strong><small>계층과 전문성에 따른 정기 몫</small></span><b>{wages} 금화</b><button class="btn primary small" onclick={pay} disabled={(inventory.gold ?? 0) < wages}>분배</button></div>
    </article>

    <article class="panel ship-roster"><div class="panel-title"><div><span class="eyebrow">EXPEDITION RESERVE</span><h2>함선 승조원 예비대</h2></div></div><div class="ship-role-grid">{#each (Object.entries(game.crew.roles) as [CrewRole, number][]) as [role, count]}<div><small>{shipRoleNames[role]}</small><b>{count}</b></div>{/each}</div><h3>장교</h3>{#each game.officers as officer}<div class="officer-line"><span class="portrait">{officer.name[0]}</span><span><strong>{officer.name}</strong><small>{officer.role} · {officer.trait}</small></span><em>충성 {officer.loyalty}</em></div>{/each}</article>
  </div>
</section>

<style>
  .resident-screen{background:radial-gradient(circle at 68% 18%,#173a3a55,transparent 38%),linear-gradient(135deg,#07191e,#040d11)}.header-tags{display:flex;gap:.4rem;flex-wrap:wrap;justify-content:flex-end}.resident-layout{display:grid;grid-template-columns:minmax(430px,1.3fr) minmax(300px,.8fr) minmax(330px,.9fr);gap:.8rem}.resident-layout>.panel{padding:1rem}.resident-roster{grid-row:span 2}.resident-filters{display:grid;grid-template-columns:1fr .8fr .8fr;gap:.35rem}.resident-filters input,.resident-filters select,.job-select select{background:#051417;border:1px solid var(--line-soft);color:var(--ink);padding:.55rem}.resident-list{display:grid;gap:.3rem;margin-top:.65rem;max-height:610px;overflow:auto}.resident-list>button{display:grid;grid-template-columns:42px 1fr 100px auto;align-items:center;gap:.55rem;border:1px solid var(--line-soft);background:#0b2023b8;color:var(--ink);text-align:left;padding:.48rem;cursor:pointer}.resident-list>button:hover,.resident-list>button.selected{border-color:var(--brass);background:linear-gradient(90deg,#4b3b29a6,#10292a)}.portrait,.large-portrait{display:grid;place-items:center;background:#314b48;border:1px solid #709084;color:#ead6ae;font-family:'Gowun Batang',serif}.portrait{width:36px;height:36px}.large-portrait{width:72px;height:72px;font-size:2rem}.tier-pirate,.tier-elite{background:#5d3a30}.tier-officer{background:#665637;border-color:#d2ac66}.resident-list strong,.resident-list small{display:block}.resident-list small{font-size:.6rem;color:var(--ink-muted);margin-top:.2rem}.resident-list em{font-size:.52rem;color:var(--ink-faint);font-style:normal}.resident-bars{display:grid;gap:.2rem}.resident-bars i{height:4px;background:#061012}.resident-bars i b{display:block;width:var(--value);height:100%;background:var(--bar,#70a18b)}.resident-bars small{font-size:.5rem}.resident-profile{display:flex;gap:.8rem;align-items:center}.resident-profile h2{font-size:1.8rem;margin:.08rem 0}.resident-profile p{font-size:.65rem;color:var(--ink-muted)}.job-select{display:grid;gap:.35rem;margin:1rem 0;color:var(--brass-light);font-size:.62rem}.detail-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:.35rem}.detail-stats>div{padding:.55rem;background:#061619;border:1px solid var(--line-soft)}.detail-stats small,.detail-stats b{display:block}.detail-stats small{font-size:.55rem;color:var(--ink-faint)}.needs-list{display:grid;gap:.4rem}.needs-list>div{display:grid;grid-template-columns:70px 1fr 28px;align-items:center;gap:.4rem;font-size:.6rem}.needs-list .meter{height:5px}.assignment-map{display:grid;grid-template-columns:1fr 1fr;gap:.4rem;margin-top:1rem}.assignment-map span{padding:.55rem;border:1px solid var(--line-soft)}.assignment-map small,.assignment-map b{display:block}.assignment-map small{font-size:.54rem;color:var(--ink-faint)}.workforce-list{display:grid;gap:.28rem;max-height:330px;overflow:auto}.workforce-row{display:grid;grid-template-columns:1fr auto 48px;align-items:center;gap:.4rem;padding:.42rem;border-bottom:1px solid var(--line-soft)}.workforce-row strong,.workforce-row small{display:block}.workforce-row small{font-size:.52rem;color:var(--ink-faint)}.workforce-row label{font-size:.55rem}.priority-buttons{display:flex}.priority-buttons button{width:23px;height:23px;border:1px solid var(--line-soft);background:#07171a;color:var(--ink-faint);font-size:.55rem}.priority-buttons button.active{background:#936338;color:white;border-color:#d0a45b}.payroll{display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:.6rem;padding:.8rem;margin-top:.6rem;border:1px solid var(--line);background:#102623}.payroll strong,.payroll small{display:block}.payroll small{font-size:.55rem;color:var(--ink-muted)}.ship-role-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:.35rem}.ship-role-grid>div{padding:.5rem;background:#07171a;border:1px solid var(--line-soft)}.ship-role-grid small,.ship-role-grid b{display:block}.ship-role-grid small{font-size:.5rem;color:var(--ink-faint)}.officer-line{display:grid;grid-template-columns:42px 1fr auto;align-items:center;gap:.5rem;padding:.35rem;border-top:1px solid var(--line-soft)}.officer-line strong,.officer-line small{display:block}.officer-line small{font-size:.55rem;color:var(--ink-muted)}.officer-line em{font-style:normal;font-size:.58rem;color:var(--brass)}
  @media(max-width:1100px){.resident-layout{grid-template-columns:1.2fr .8fr}.workforce-panel,.ship-roster{grid-column:auto}.resident-roster{grid-row:span 2}}@media(max-width:760px){.resident-layout{grid-template-columns:1fr}.resident-roster{grid-row:auto}.resident-list{max-height:420px}.resident-filters{grid-template-columns:1fr}.resident-list>button{grid-template-columns:42px 1fr 75px}.resident-list em{display:none}}
</style>
