<script lang="ts">
  import { SHIP_CLASSES } from '$lib/domain/catalog';
  import { aggregateInventory } from '$lib/settlement/construction';
  import { SETTLEMENT_RESOURCES } from '$lib/settlement/catalog';
  import { queueShipConstruction, SHIP_PLANS, type ShipPlan } from '$lib/settlement/shipbuilding';
  import { gameSession } from '$lib/stores/gameStore';
  import type { SettlementBuilding, SettlementResourceId, ShipConstructionOrder } from '$lib/settlement/types';
  import type { GameState, Ship, ShipClass } from '$lib/domain/types';

  let { game } = $props<{ game: GameState }>();
  let selectedClass = $state<ShipClass>('boat');
  let shipName = $state('들물의 칼날');
  const visualSlots = [0, 1, 2, 3, 4, 5, 6, 7];
  let selectedShipId = $state<string>();
  let inventory = $derived(aggregateInventory(game.settlement));
  let shipyards: SettlementBuilding[] = $derived(game.settlement.buildings.filter((building: SettlementBuilding) => building.definitionId === 'shipyard'));
  let activeShipyard: SettlementBuilding | undefined = $derived(shipyards.find((building: SettlementBuilding) => building.state === 'ACTIVE'));
  let plans: ShipPlan[] = $derived(Object.values(SHIP_PLANS).filter((plan): plan is ShipPlan => !!plan));
  let selectedPlan: ShipPlan = $derived(SHIP_PLANS[selectedClass] ?? SHIP_PLANS.boat!);
  let orders: ShipConstructionOrder[] = $derived(game.settlement.shipConstruction);
  let ships: Ship[] = $derived(game.ships);
  let selectedShip: Ship = $derived(game.ships.find((ship: Ship) => ship.id === selectedShipId) ?? game.ships.find((ship: Ship) => ship.id === game.activeShipId) ?? game.ships[0]);

  function canQueue(plan: ShipPlan): boolean {
    if (!activeShipyard || activeShipyard.level < plan.shipyardLevel) return false;
    if (plan.unlock && !game.settlement.progression.unlocked.includes(plan.unlock)) return false;
    if (orders.some((order) => order.shipyardId === activeShipyard?.id && order.state !== 'COMPLETE')) return false;
    return (Object.entries(plan.cost) as [SettlementResourceId, number][]).every(([resource, required]) => (inventory[resource] ?? 0) >= required);
  }

  function queue(): void {
    let ok = false;
    let reason = '';
    gameSession.updateGame((state) => {
      const result = queueShipConstruction(state.settlement, selectedClass, shipName);
      ok = result.ok;
      reason = result.reason ?? '';
      return ok ? { ...state, settlement: result.state } : state;
    }, true);
    if (ok) gameSession.addToast('success', `${shipName} 건조 명령`, '조선소가 창고에 판자, 밧줄, 돛과 함포 운송을 요청했습니다.');
    else gameSession.addToast('warning', '건조 불가', reason);
  }
</script>

<section class="management-screen shipbuilding-screen">
  <header class="management-header"><div><span class="eyebrow">THE BLACK DRYDOCK</span><h1>조선소와 함선 건조</h1><p class="muted">함선은 금화로 나타나지 않습니다. 숲, 제련소, 직조소, 대포 주조소와 조선공의 시간이 선체를 만듭니다.</p></div><span class="tag">정박 {game.ships.length}척 · 조선소 {activeShipyard ? `${activeShipyard.level}단계` : '없음'}</span></header>
  <div class="shipyard-layout">
    <article class="panel yard-visual">
      <div class="ship-silhouette" class:building={orders.some((order) => order.state === 'BUILDING')}><div class="keel"></div><div class="ribs">{#each visualSlots as index}<i style={`--rib:${index}`}></i>{/each}</div><div class="mast"></div><div class="scaffold left"></div><div class="scaffold right"></div><div class="workers">{#each visualSlots.slice(0, Math.min(7, activeShipyard?.workers.length ?? 0)) as index}<i style={`--x:${12 + index * 12}%`}></i>{/each}</div></div>
      <div class="yard-status"><span class="eyebrow">SHIPYARD FLOOR</span><h2>{activeShipyard ? '용골 위로 도시의 산업이 모인다' : '해안에 조선소를 세우십시오'}</h2><p>{activeShipyard ? `조선공 ${activeShipyard.workers.length}명 · 현장 물자 ${Object.values(activeShipyard.inputInventory).reduce((sum, value) => sum + (value ?? 0), 0).toFixed(0)}단위` : '발전 화면에서 ‘늑골과 용골’을 해금한 뒤 넓은 해안에 조선소를 배치해야 합니다.'}</p>{#if !activeShipyard}<button class="btn primary" onclick={() => gameSession.setScreen('haven')}>도시 건설로 돌아가기</button>{/if}</div>
    </article>

    <article class="panel plan-ledger">
      <div class="panel-title"><div><span class="eyebrow">NAVAL ARCHITECTURE</span><h2>건조 설계</h2></div><span class="tag">{SHIP_CLASSES[selectedClass].name}</span></div>
      <div class="plan-tabs">{#each plans as plan}<button class:selected={selectedClass === plan.shipClass} class:locked={!!plan.unlock && !game.settlement.progression.unlocked.includes(plan.unlock)} onclick={() => (selectedClass = plan.shipClass)}><span>{plan.shipClass === 'boat' ? '◒' : plan.shipClass === 'sloop' ? '◢' : plan.shipClass === 'schooner' ? '◩' : plan.shipClass === 'brig' ? '◫' : '▰'}</span><strong>{SHIP_CLASSES[plan.shipClass].name}</strong><small>조선소 {plan.shipyardLevel}</small></button>{/each}</div>
      <div class="selected-plan"><div><span class="eyebrow">{selectedPlan.durationMinutes} MINUTES · {selectedPlan.shipwrights} SHIPWRIGHTS</span><h3>{selectedPlan.name}</h3><p>{SHIP_CLASSES[selectedClass].description}</p></div><div class="plan-stats"><span><small>선체</small><b>{SHIP_CLASSES[selectedClass].stats.hullMax}</b></span><span><small>속력</small><b>{SHIP_CLASSES[selectedClass].stats.speedMax}</b></span><span><small>선원</small><b>{SHIP_CLASSES[selectedClass].stats.crewMax}</b></span><span><small>대포</small><b>{SHIP_CLASSES[selectedClass].stats.cannonSlots}</b></span></div></div>
      <div class="ship-costs">{#each Object.entries(selectedPlan.cost) as [id, required]}<div class:missing={(inventory[id as SettlementResourceId] ?? 0) < required}><span>{SETTLEMENT_RESOURCES[id as SettlementResourceId].icon}</span><small>{SETTLEMENT_RESOURCES[id as SettlementResourceId].name}</small><b>{Math.floor(inventory[id as SettlementResourceId] ?? 0)} / {required}</b></div>{/each}</div>
      <label class="ship-name">함명<input bind:value={shipName} maxlength="30" /></label><button class="btn primary wide" onclick={queue} disabled={!canQueue(selectedPlan)}>건조 대기열에 등록</button>
    </article>

    <article class="panel build-queue">
      <div class="panel-title"><div><span class="eyebrow">CONSTRUCTION QUEUE</span><h2>건조 현황</h2></div></div>
      {#each orders as order}
        {@const plan = SHIP_PLANS[order.shipClass]}
        {@const yard = shipyards.find((building: SettlementBuilding) => building.id === order.shipyardId)}
        <div class="order-card"><div class="order-title"><span><strong>{order.shipName}</strong><small>{SHIP_CLASSES[order.shipClass].name} · {order.state}</small></span><b>{Math.floor(order.progress * 100)}%</b></div><div class="meter"><span style={`--value:${order.progress * 100}%;--meter-color:${order.state === 'BLOCKED' ? '#b64d42' : '#6f9f8b'}`}></span></div><div class="order-meta"><span>조선공 {order.assignedShipwrights.length} / {plan?.shipwrights}</span><span>{order.state === 'QUEUED' ? '자재 운송 대기' : order.state === 'BLOCKED' ? '조선공 또는 조선소 부족' : order.state === 'COMPLETE' ? '진수 완료' : '선체 조립 중'}</span></div>{#if yard && order.state === 'QUEUED'}<div class="delivery-grid">{#each Object.entries(order.reserved) as [id, required]}<span class:ready={(yard.inputInventory[id as SettlementResourceId] ?? 0) >= required}>{SETTLEMENT_RESOURCES[id as SettlementResourceId].icon} {Math.floor(yard.inputInventory[id as SettlementResourceId] ?? 0)}/{required}</span>{/each}</div>{/if}</div>
      {:else}<div class="empty-queue"><span>⚓</span><strong>빈 건선거</strong><small>건조 명령을 내리면 생산시설과 창고에서 조선소로 실제 화물 운송이 시작됩니다.</small></div>{/each}
    </article>

    <article class="panel docked-fleet"><div class="panel-title"><div><span class="eyebrow">MOORED VESSELS</span><h2>정박 함선과 난파선</h2></div></div><div class="vessel-tabs">{#each ships as ship}<button class:active={selectedShip.id === ship.id} onclick={() => (selectedShipId = ship.id)}><span>{ship.hull < ship.stats.hullMax * .35 ? '⌁' : ship.isFlagship ? '♛' : '⚓'}</span><strong>{ship.name}</strong><small>{ship.hull < ship.stats.hullMax * .35 ? '복구 불능 난파 잔해' : SHIP_CLASSES[ship.class].name}</small></button>{/each}</div><div class="vessel-detail"><div><span class="eyebrow">{selectedShip.hull < selectedShip.stats.hullMax * .35 ? 'SHIPWRECK · SALVAGE LANDMARK' : selectedShip.isFlagship ? 'FLAGSHIP' : 'FLEET VESSEL'}</span><h2>{selectedShip.name}</h2><p>{selectedShip.hull < selectedShip.stats.hullMax * .35 ? '폭풍에서 살아남은 선체 일부입니다. 이 잔해 대신 조선소에서 첫 항해 가능한 함선을 건조해야 합니다.' : SHIP_CLASSES[selectedShip.class].description}</p></div><div class="plan-stats"><span><small>선체</small><b>{Math.round(selectedShip.hull)}/{selectedShip.stats.hullMax}</b></span><span><small>선원</small><b>{selectedShip.crew}/{selectedShip.stats.crewMax}</b></span><span><small>화물</small><b>{Math.round(selectedShip.cargoWeight)}/{selectedShip.stats.cargoMax}</b></span><span><small>사기</small><b>{selectedShip.morale}</b></span></div><button class="btn small" disabled={selectedShip.isFlagship || selectedShip.hull < selectedShip.stats.hullMax * .35} onclick={() => gameSession.updateGame((state) => ({ ...state, activeShipId: selectedShip.id, ships: state.ships.map((ship) => ({ ...ship, isFlagship: ship.id === selectedShip.id })) }), true)}>기함 지정</button></div></article>
  </div>
</section>

<style>
  .shipbuilding-screen{background:radial-gradient(circle at 28% 26%,#21495266,transparent 35%),linear-gradient(140deg,#07191f,#030c10)}.shipyard-layout{display:grid;grid-template-columns:minmax(380px,.9fr) minmax(540px,1.25fr);gap:.8rem}.shipyard-layout>.panel{padding:1rem}.yard-visual{position:relative;min-height:360px;overflow:hidden;background:linear-gradient(0deg,#071418ed,#0e3337bb),radial-gradient(ellipse at 50% 80%,#2c5c63,#071a20 70%)}.yard-visual::before{content:'';position:absolute;left:0;right:0;bottom:22%;height:22%;background:repeating-linear-gradient(90deg,#4f3526 0 10px,#2d211b 10px 13px);clip-path:polygon(0 22%,100% 0,100% 100%,0 100%)}.ship-silhouette{position:absolute;left:8%;right:8%;top:10%;height:190px;filter:drop-shadow(0 16px 16px #0009)}.keel{position:absolute;left:10%;right:10%;bottom:20%;height:30px;background:#493024;clip-path:polygon(0 0,100% 0,88% 100%,12% 100%)}.ribs{position:absolute;left:15%;right:15%;bottom:24%;display:flex;justify-content:space-around}.ribs i{width:4px;height:70px;border:4px solid #86603e;border-bottom:0;border-radius:50% 50% 0 0;transform:scaleX(1.5)}.mast{position:absolute;left:50%;bottom:30%;width:5px;height:120px;background:#60432d}.scaffold{position:absolute;bottom:8%;width:30%;height:120px;border:4px solid #75563a;background:repeating-linear-gradient(0deg,transparent 0 24px,#75563a 25px 29px)}.scaffold.left{left:0;transform:skewY(-12deg)}.scaffold.right{right:0;transform:skewY(12deg)}.ship-silhouette:not(.building){opacity:.38;filter:grayscale(.7)}.workers{position:absolute;left:0;right:0;bottom:3%}.workers i{position:absolute;left:var(--x);width:7px;height:16px;background:#d09a5b;border-radius:50% 50% 2px 2px;animation:worker-hammer .8s infinite alternate}.workers i:nth-child(2n){animation-delay:.35s}@keyframes worker-hammer{to{transform:translateY(-5px) rotate(8deg)}}.yard-status{position:absolute;left:1rem;right:1rem;bottom:1rem;z-index:2;text-shadow:0 2px 6px #000}.yard-status h2{font-size:1.6rem;margin:.1rem 0}.yard-status p{font-size:.67rem;color:#b9c4bd}.plan-tabs{display:flex;gap:.3rem;overflow-x:auto;padding-bottom:.55rem}.plan-tabs button{min-width:76px;border:1px solid var(--line-soft);background:#07171a;color:var(--ink-muted);padding:.5rem;cursor:pointer}.plan-tabs span,.plan-tabs strong,.plan-tabs small{display:block}.plan-tabs span{color:var(--brass);font-size:1.1rem}.plan-tabs strong{font-size:.62rem}.plan-tabs small{font-size:.48rem}.plan-tabs button.selected{border-color:var(--brass);background:#413524;color:var(--ink)}.plan-tabs button.locked{filter:grayscale(1);opacity:.45}.selected-plan{display:grid;grid-template-columns:1fr 1fr;gap:.7rem;padding:.7rem;border:1px solid var(--line-soft);background:#0c2325}.selected-plan h3{font-size:1.25rem;margin:.15rem 0}.selected-plan p{font-size:.6rem;color:var(--ink-muted)}.plan-stats{display:grid;grid-template-columns:repeat(2,1fr);gap:.3rem}.plan-stats span{padding:.4rem;background:#061518;border:1px solid var(--line-soft)}.plan-stats small,.plan-stats b{display:block}.plan-stats small{font-size:.48rem;color:var(--ink-faint)}.plan-stats b{font-size:.72rem}.ship-costs{display:grid;grid-template-columns:repeat(4,1fr);gap:.3rem;margin:.6rem 0}.ship-costs>div{display:grid;grid-template-columns:18px 1fr;padding:.35rem;border:1px solid var(--line-soft);background:#07171a}.ship-costs>div>span{grid-row:1/3;color:var(--brass)}.ship-costs small,.ship-costs b{display:block;font-size:.5rem}.ship-costs .missing{border-color:#863e36;color:#e47a68}.ship-name{display:grid;grid-template-columns:50px 1fr;align-items:center;gap:.4rem;font-size:.6rem;color:var(--brass-light);margin-bottom:.5rem}.ship-name input{background:#061518;border:1px solid var(--line);padding:.6rem;color:var(--ink)}.order-card{padding:.7rem;border:1px solid var(--line);background:#091e21;margin-bottom:.45rem}.order-title{display:flex;justify-content:space-between}.order-title strong,.order-title small{display:block}.order-title small{font-size:.55rem;color:var(--ink-muted)}.order-title>b{color:var(--brass-light)}.order-meta{display:flex;justify-content:space-between;font-size:.55rem;color:var(--ink-faint);margin-top:.35rem}.delivery-grid{display:flex;flex-wrap:wrap;gap:.2rem;margin-top:.45rem}.delivery-grid span{padding:.18rem .3rem;border:1px solid #673d35;color:#d67a67;font-size:.5rem}.delivery-grid span.ready{border-color:#4f7968;color:#8cc0a5}.empty-queue{display:grid;text-align:center;gap:.3rem;padding:2rem}.empty-queue>span{font-size:2rem;color:var(--brass)}.empty-queue small{color:var(--ink-muted)}.docked-fleet{grid-column:1/-1}.vessel-tabs{display:flex;gap:.35rem;overflow-x:auto}.vessel-tabs button{min-width:140px;display:grid;grid-template-columns:24px 1fr;text-align:left;border:1px solid var(--line-soft);background:#07171a;color:var(--ink);padding:.55rem}.vessel-tabs button span{grid-row:1/3;color:var(--brass)}.vessel-tabs small{font-size:.5rem;color:var(--ink-muted)}.vessel-tabs button.active{border-color:var(--brass);background:#3b3224}.vessel-detail{display:grid;grid-template-columns:1fr 330px auto;align-items:center;gap:1rem;margin-top:.7rem;padding:.7rem;background:#0c2224}.vessel-detail h2{margin:.1rem 0}.vessel-detail p{font-size:.6rem;color:var(--ink-muted);margin:0}
  @media(max-width:950px){.shipyard-layout{grid-template-columns:1fr}.docked-fleet{grid-column:auto}.yard-visual{min-height:320px}}@media(max-width:650px){.selected-plan,.vessel-detail{grid-template-columns:1fr}.ship-costs{grid-template-columns:repeat(2,1fr)}}
</style>
