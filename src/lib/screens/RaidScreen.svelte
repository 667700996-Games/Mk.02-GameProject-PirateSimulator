<script lang="ts">
  import { RESOURCE_META } from '$lib/domain/catalog';
  import { addCargo } from '$lib/domain/economy';
  import { applyNotoriety, NOTORIETY_EVENTS } from '$lib/domain/factions';
  import { progressMissions } from '$lib/domain/missions';
  import { completeRaidScouting, configureRaid, launchPreparedRaid, lootRaidTarget, RAID_TARGETS } from '$lib/domain/raid';
  import { gameSession } from '$lib/stores/gameStore';
  import { canAffordGameResources, spendGameResources } from '$lib/settlement/economyBridge';
  import type { GameState, RaidState, ResourceId, SettlementState, Ship } from '$lib/domain/types';

  let { game } = $props<{ game: GameState }>();
  let settlement = $derived(game.world.settlements.find((item: SettlementState) => item.id === game.raid.settlementId));
  let activeShip = $derived(game.ships.find((ship: Ship) => ship.id === game.activeShipId) ?? game.ships[0]);
  let availableCrew = $derived(activeShip.crew);

  const approaches: { id: NonNullable<RaidState['approach']>; name: string; detail: string }[] = [
    { id: 'stealth', name: '은밀 침투', detail: '낮은 경보·사상 위험, 느린 진입' },
    { id: 'assault', name: '정면 공격', detail: '빠른 약탈, 높은 경보·사상 위험' }
  ];
  const landings: { id: NonNullable<RaidState['landingPoint']>; name: string; detail: string }[] = [
    { id: 'hidden-cove', name: '숨겨진 샌만', detail: '시간 +18초 · 경보 -10' },
    { id: 'main-dock', name: '중앙 부두', detail: '시간 -12초 · 경보 +14' },
    { id: 'cliffs', name: '절벽 산로', detail: '시간 +28초 · 경보 -4' }
  ];
  const equipment: { id: NonNullable<RaidState['equipment']>; name: string; detail: string; cost: Partial<Record<ResourceId, number>> }[] = [
    { id: 'grapples', name: '갈고리·밧줄', detail: '약탈 시간 -18%', cost: { rope: 3 } },
    { id: 'muskets', name: '머스킷 사수대', detail: '사상자 감소 · 경보 증가', cost: { powder: 2, cannonballs: 6 } },
    { id: 'smoke-bombs', name: '연막 폭탄', detail: '경보 증가량 -38%', cost: { powder: 5, cloth: 2 } }
  ];

  function configure(options: Parameters<typeof configureRaid>[1]): void {
    gameSession.updateGame((state) => ({ ...state, raid: configureRaid(state.raid, options, state.ships.find((ship) => ship.id === state.activeShipId)?.crew ?? 8) }));
  }

  function scout(): void {
    gameSession.updateGame((state) => ({ ...state, raid: completeRaidScouting(state.raid) }));
  }

  function equipmentCost(): Partial<Record<ResourceId, number>> {
    return equipment.find((item) => item.id === game.raid.equipment)?.cost ?? {};
  }

  function canAfford(cost = equipmentCost()): boolean {
    return canAffordGameResources(game, cost);
  }

  function costLabel(cost: Partial<Record<ResourceId, number>>): string {
    return (Object.entries(cost) as [ResourceId, number][]).map(([id, amount]) => `${RESOURCE_META[id].name} ${amount}`).join(' · ');
  }

  function launch(): void {
    if (!settlement) return;
    gameSession.updateGame((state) => {
      const cost = equipment.find((item) => item.id === state.raid.equipment)?.cost ?? {};
      const paid = spendGameResources(state, cost);
      return paid ? { ...paid, raid: launchPreparedRaid(paid.raid, settlement!, paid.captain.trait) } : state;
    }, true);
  }

  function loot(targetId: string): void {
    if (!settlement) return;
    gameSession.updateGame((state) => {
      const nextRaid = lootRaidTarget(state.raid, settlement!, targetId, state.captain.difficulty, state.captain.trait, Math.random);
      const casualties = Math.max(0, nextRaid.casualties - state.raid.casualties);
      return { ...state, raid: nextRaid, ships: state.ships.map((ship) => ship.id === state.activeShipId ? { ...ship, crew: Math.max(1, ship.crew - casualties), morale: Math.max(0, ship.morale - casualties) } : ship) };
    });
  }

  function withdraw(): void {
    gameSession.updateGame((state) => {
      let active = state.ships.find((ship) => ship.id === state.activeShipId) ?? state.ships[0];
      for (const [id, amount] of Object.entries(state.raid.recoveredLoot) as [ResourceId, number][]) active = addCargo(active, id, amount).ship;
      let next: GameState = { ...state, ships: state.ships.map((ship) => ship.id === active.id ? active : ship), raid: { ...state.raid, active: false, phase: 'complete' as const }, screen: 'haven' as const, voyage: { ...state.voyage, active: false }, tutorialStep: Math.max(state.tutorialStep, 5), world: { ...state.world, settlements: state.world.settlements.map((item) => item.id === settlement?.id ? { ...item, alert: Math.min(100, item.alert + 24), attitude: Math.max(-100, item.attitude - 20) } : item) } };
      next = applyNotoriety(next, NOTORIETY_EVENTS.villageRaid);
      next = progressMissions(next, { kind: 'raid-complete', zoneId: settlement!.zoneId, targetId: settlement!.id });
      return next;
    }, true);
    gameSession.addToast('success', '상륙대 귀환', '전리품이 함선 화물칸에 실렸습니다. 자유항이나 암시장에서 판매하십시오.');
  }
</script>

<section class="event-screen">
  {#if game.raid.phase === 'scouting'}
    <article class="event-card panel raid-plan"><div class="panel-title"><div><span class="eyebrow">PHASE I · RECONNAISSANCE</span><h1>{settlement?.name} 정찰</h1><p class="muted">해안선, 망루, 주둔 병력과 지원군 시간을 확인합니다.</p></div><span class="tag danger">경계 {settlement?.alert}%</span></div><div class="intel-grid"><div class="force-card"><span class="eyebrow">COASTAL DEFENSE</span><div class="force-number">{settlement?.defense}</div><small>해안 포대와 감시탑</small></div><div class="force-card"><span class="eyebrow">GARRISON</span><div class="force-number">{settlement?.garrison}</div><small>민병과 주둔 병력</small></div><div class="force-card"><span class="eyebrow">REINFORCEMENTS</span><div class="force-number">{Math.max(70, 190 - (settlement?.alert ?? 0))}초</div><small>예상 지원군 도착</small></div></div><div class="scout-report"><strong>망원경 보고</strong><p>{settlement?.currentEvent ?? '항구는 평소와 같은 주기로 교대하고 있다.'}</p><p>주요 약탈물: {Object.keys(settlement?.loot ?? {}).map((id) => RESOURCE_META[id as ResourceId].name).join(' · ')}</p></div><div class="raid-footer"><button class="btn ghost" onclick={() => gameSession.updateGame((state) => ({ ...state, screen: 'world-map', raid: { ...state.raid, active: false } }))}>작전 취소</button><button class="btn primary" onclick={scout}>상륙 계획 수립</button></div></article>
  {:else if game.raid.phase === 'planning'}
    <article class="event-card panel raid-plan"><div class="panel-title"><div><span class="eyebrow">PHASE II · LANDING PLAN</span><h1>상륙대 편성</h1><p class="muted">속도, 은밀성과 화력 사이에서 이번 습격의 우선순위를 정하십시오.</p></div><span class="tag">함선 잔류 3명 필수</span></div><div class="planning-block"><span class="eyebrow">BOARDING PARTY</span><h3>투입 선원 · {game.raid.crewCommitted}명 / {availableCrew - 3}명</h3><input aria-label="투입 선원" type="range" min="6" max={Math.max(6, availableCrew - 3)} value={game.raid.crewCommitted} oninput={(event) => configure({ crewCommitted: Number(event.currentTarget.value) })} /></div><div class="planning-block"><span class="eyebrow">APPROACH</span><div class="choice-grid two">{#each approaches as item}<button class:selected={game.raid.approach === item.id} class="trait-card" onclick={() => configure({ approach: item.id })}><strong>{item.name}</strong><small>{item.detail}</small></button>{/each}</div></div><div class="planning-block"><span class="eyebrow">LANDING POINT</span><div class="choice-grid">{#each landings as item}<button class:selected={game.raid.landingPoint === item.id} class="trait-card" onclick={() => configure({ landingPoint: item.id })}><strong>{item.name}</strong><small>{item.detail}</small></button>{/each}</div></div><div class="planning-block"><span class="eyebrow">EQUIPMENT</span><div class="choice-grid">{#each equipment as item}<button class:selected={game.raid.equipment === item.id} class="trait-card" onclick={() => configure({ equipment: item.id })}><strong>{item.name}</strong><small>{item.detail}</small><em>{costLabel(item.cost)}</em></button>{/each}</div></div><button class="btn primary wide" onclick={launch} disabled={!canAfford()}>상륙 작전 개시 · {costLabel(equipmentCost())}</button></article>
  {:else}
    <article class="event-card panel">
      <div class="panel-title"><div><span class="eyebrow danger">SHORE RAID · ALARM {Math.round(game.raid.alarm)}%</span><h1 style="font-size:clamp(2.2rem,5vw,4rem)">{settlement?.name}</h1><p class="muted">지원군이 도착하기 전에 가장 가치 있는 목표를 골라 약탈하고 해안으로 철수하십시오.</p></div><div style="text-align:right"><span class="eyebrow">남은 시간</span><div class="force-number">{Math.floor(game.raid.timeRemaining)}초</div><small class="danger">사상자 {game.raid.casualties}명</small></div></div>
      <div class="operation-tags"><span class="tag">{approaches.find((item) => item.id === game.raid.approach)?.name}</span><span class="tag">{landings.find((item) => item.id === game.raid.landingPoint)?.name}</span><span class="tag">{equipment.find((item) => item.id === game.raid.equipment)?.name}</span></div><div class="meter" style="height:10px"><span style={`--value:${game.raid.alarm}%;--meter-color:#ae4538`}></span></div>
      <div class="raid-targets">{#each RAID_TARGETS as target}{@const looted = game.raid.selectedTargets.includes(target.id)}<button class:looted class="raid-target" onclick={() => loot(target.id)} disabled={looted || game.raid.phase === 'escape' || game.raid.timeRemaining < target.time}><span class="eyebrow">{target.time}초 · 경보 +{target.alarm}</span><h3>{target.name}</h3><p class="muted" style="font-size:.7rem">{target.primaryResources.map((id) => RESOURCE_META[id].name).join(' · ')}</p></button>{/each}</div>
      <div class="panel" style="padding:1rem;margin:1rem 0;background:rgba(0,0,0,.2)"><span class="eyebrow">RECOVERED LOOT</span><div class="costs" style="margin-top:.55rem">{#if Object.keys(game.raid.recoveredLoot).length === 0}<span class="muted">아직 확보한 전리품이 없습니다.</span>{:else}{#each Object.entries(game.raid.recoveredLoot) as [id, amount]}<span class="cost">{RESOURCE_META[id as ResourceId].icon} {RESOURCE_META[id as ResourceId].name} {amount}</span>{/each}{/if}</div></div>
      <div style="display:flex;justify-content:flex-end"><button class="btn primary" onclick={withdraw}>{game.raid.phase === 'escape' ? '지원군 도착 — 즉시 철수' : '약탈를 마치고 철수'}</button></div>
    </article>
  {/if}
</section>

<style>
  .raid-plan h1{font-size:clamp(2.4rem,5vw,4.5rem)}.intel-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.7rem}.scout-report,.planning-block{margin:1rem 0;padding:1rem;border:1px solid var(--line-soft);background:rgba(0,0,0,.2)}.raid-footer{display:flex;justify-content:space-between;gap:1rem}.choice-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.6rem;margin-top:.65rem}.choice-grid.two{grid-template-columns:repeat(2,1fr)}.choice-grid .trait-card{min-height:88px}.choice-grid small,.choice-grid em{display:block;margin-top:.35rem}.choice-grid em{color:var(--brass);font-style:normal;font-size:.64rem}.planning-block input[type='range']{width:100%}.operation-tags{display:flex;gap:.4rem;margin:.6rem 0}@media(max-width:700px){.intel-grid,.choice-grid,.choice-grid.two{grid-template-columns:1fr}.raid-footer{display:grid}}
</style>
