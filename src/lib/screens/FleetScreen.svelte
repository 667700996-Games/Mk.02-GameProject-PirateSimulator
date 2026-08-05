<script lang="ts">
  import { SHIP_CLASSES, ZONES } from '$lib/domain/catalog';
  import { assignCaptain, captainCandidate, claimFleetAssignment, hireCaptain, issueFleetOrder, setFleetFormation } from '$lib/domain/fleet';
  import { gameSession } from '$lib/stores/gameStore';
  import type { FleetFormation, FleetOrderType, GameState, Officer, Ship, ZoneId } from '$lib/domain/types';

  let { game } = $props<{ game: GameState }>();
  let order = $state<FleetOrderType>('raid');
  let zoneId = $state<ZoneId>('beginners-bay');
  let candidate = $derived(captainCandidate(game.world.seed + game.world.marketCycle * 97));
  let captains = $derived(game.officers.filter((officer: Officer) => officer.isCaptain));
  let fleetShips = $derived(game.ships.filter((ship: Ship) => !ship.isFlagship));
  const formations: { id: FleetFormation; name: string; detail: string }[] = [
    { id: 'line-ahead', name: '종렬진', detail: '순찰·호위 효율' }, { id: 'line-abreast', name: '횡렬진', detail: '본거지 방어 효율' }, { id: 'crescent', name: '초승달진', detail: '포위와 방어 균형' }, { id: 'wolf-pack', name: '늑대떼', detail: '함대 약탈 효율' }, { id: 'scatter', name: '산개진', detail: '정찰·밀수 효율' }
  ];
  const orders: { id: FleetOrderType; name: string }[] = [{ id: 'patrol', name: '해역 순찰' }, { id: 'raid', name: '독립 약탈' }, { id: 'escort', name: '호송 계약' }, { id: 'smuggle', name: '밀수 운송' }, { id: 'scout', name: '정찰' }, { id: 'defend', name: '본거지 방어' }];

  function hire(): void {
    gameSession.updateGame((state) => hireCaptain(state, candidate, 420), true);
  }

  function assign(shipId: string, captainId: string): void {
    gameSession.updateGame((state) => assignCaptain(state, captainId, shipId), true);
  }

  function dispatch(shipId: string): void {
    gameSession.updateGame((state) => issueFleetOrder(state, shipId, order, zoneId), true);
  }
</script>

<section class="management-screen">
  <header class="management-header"><div><span class="eyebrow">BLACK FLEET COMMAND</span><h1>함대와 부하 선장</h1><p class="muted">나포선에 선장을 임명하고 독립 작전을 명령하십시오. 충성보다 야망이 커지면 함선째 사라질 수 있습니다.</p></div><span class="tag">승전 {game.fleet.victories} · 손실 {game.fleet.shipsLost}</span></header>
  <div class="management-grid">
    <article class="panel span-7">
      <div class="panel-title"><div><span class="eyebrow">FORMATION</span><h2>함대 진형</h2></div><span class="tag">{formations.find((item) => item.id === game.fleet.formation)?.name}</span></div>
      <div class="trait-grid">{#each formations as formation}<button class:selected={game.fleet.formation === formation.id} class="trait-card" style="min-height:82px" onclick={() => gameSession.updateGame((state) => setFleetFormation(state, formation.id), true)}><strong>{formation.name}</strong><small style="display:block;margin-top:.3rem">{formation.detail}</small></button>{/each}</div>
      <div class="resource-row" style="margin-top:1rem"><span><strong>자동 교전</strong><small style="display:block">부하 선장이 위협도에 따라 표적을 선택합니다.</small></span><input type="checkbox" checked={game.fleet.autoEngage} onchange={(event) => gameSession.updateGame((state) => ({ ...state, fleet: { ...state.fleet, autoEngage: event.currentTarget.checked } }), true)} /></div>
    </article>
    <article class="panel span-5">
      <span class="eyebrow">TAVERN CANDIDATE</span><h2>{candidate.name}</h2><p class="brass">{candidate.trait}</p><div class="stat-grid"><div class="mini-stat"><small>기술</small><b>{candidate.skill}</b></div><div class="mini-stat"><small>충성</small><b>{candidate.loyalty}</b></div><div class="mini-stat"><small>야망</small><b class:danger={candidate.ambition > candidate.loyalty}>{candidate.ambition}</b></div><div class="mini-stat"><small>급여</small><b>{candidate.wage}</b></div></div><button class="btn primary wide" style="margin-top:1rem" onclick={hire} disabled={game.officers.some((officer) => officer.id === candidate.id)}>부하 선장 고용 · 420 금화</button>
    </article>
    <article class="panel span-12">
      <div class="panel-title"><div><span class="eyebrow">FLEET ORDERS</span><h2>정박 함선과 명령</h2></div><div style="display:flex;gap:.5rem"><select bind:value={order}>{#each orders as item}<option value={item.id}>{item.name}</option>{/each}</select><select bind:value={zoneId}>{#each Object.values(ZONES) as zone}<option value={zone.id} disabled={!game.world.zones[zone.id].discovered}>{zone.name}</option>{/each}</select></div></div>
      {#if fleetShips.length === 0}<div class="muted" style="text-align:center;padding:2rem">나포하거나 건조한 두 번째 함선이 필요합니다. 해상전에서 적선의 선체를 약화시킨 뒤 승선하십시오.</div>{/if}
      <div class="resource-list">{#each fleetShips as ship}{@const captain = captains.find((officer) => officer.id === ship.captainId)}{@const active = game.fleet.assignments.find((assignment) => assignment.shipId === ship.id && !['complete','failed','deserted'].includes(assignment.status))}<div class="resource-row" style="grid-template-columns:1fr 1fr auto"><span><strong>{ship.name}</strong><small style="display:block">{SHIP_CLASSES[ship.class].name} · 선체 {Math.round(ship.hull)}/{ship.stats.hullMax} · 선원 {ship.crew}</small></span>{#if captain}<span><strong>{captain.name}</strong><small style="display:block" class:danger={captain.loyalty < captain.ambition}>충성 {captain.loyalty} · 야망 {captain.ambition}</small></span>{:else}<select aria-label={`${ship.name} 선장`} onchange={(event) => assign(ship.id, event.currentTarget.value)}><option value="">선장 임명…</option>{#each captains.filter((officer) => !officer.assignedShipId) as officer}<option value={officer.id}>{officer.name} · 기술 {officer.skill}</option>{/each}</select>{/if}<button class="btn small" onclick={() => dispatch(ship.id)} disabled={!captain || !!active}>{active ? '작전 수행 중' : '명령 하달'}</button></div>{/each}</div>
    </article>
    <article class="panel span-12">
      <div class="panel-title"><div><span class="eyebrow">EXPEDITION REPORTS</span><h2>작전 보고</h2></div></div>
      {#if game.fleet.assignments.length === 0}<p class="muted">진행 중인 독립 작전이 없습니다.</p>{/if}
      <div class="resource-list">{#each game.fleet.assignments as assignment}{@const ship = game.ships.find((item) => item.id === assignment.shipId)}<div class="resource-row" style="grid-template-columns:1fr 1.3fr auto"><span><strong>{ship?.name ?? '탈주 함선'} · {orders.find((item) => item.id === assignment.order)?.name}</strong><small style="display:block">{ZONES[assignment.zoneId].name} · 위험 {Math.round(assignment.risk)}%</small></span><span><div class="meter"><span style={`--value:${assignment.progress}%;--meter-color:${assignment.status === 'failed' || assignment.status === 'deserted' ? '#ae4538' : '#789f8d'}`}></span></div><small class="muted">{assignment.log.at(-1)}</small></span><button class="btn small" disabled={!['complete','failed','deserted'].includes(assignment.status)} onclick={() => gameSession.updateGame((state) => claimFleetAssignment(state, assignment.id), true)}>{['complete','failed','deserted'].includes(assignment.status) ? '보고 확인' : `${Math.round(assignment.progress)}%`}</button></div>{/each}</div>
    </article>
  </div>
</section>
