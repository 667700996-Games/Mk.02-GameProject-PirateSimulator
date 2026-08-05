<script lang="ts">
  import { RAID_TARGETS, lootRaidTarget } from '$lib/domain/raid';
  import { addCargo } from '$lib/domain/economy';
  import { applyNotoriety, NOTORIETY_EVENTS } from '$lib/domain/factions';
  import { RESOURCE_META } from '$lib/domain/catalog';
  import { gameSession } from '$lib/stores/gameStore';
  import type { GameState, ResourceId, SettlementState } from '$lib/domain/types';

  let { game } = $props<{ game: GameState }>();
  let settlement = $derived(game.world.settlements.find((item: SettlementState) => item.id === game.raid.settlementId));

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
      return next;
    }, true);
    gameSession.addToast('success', '상륙대 귀환', '전리품이 함선 화물칸에 실렸습니다. 자유항이나 암시장에서 판매하십시오.');
  }
</script>

<section class="event-screen">
  <article class="event-card panel">
    <div class="panel-title">
      <div><span class="eyebrow danger">SHORE RAID · ALARM {Math.round(game.raid.alarm)}%</span><h1 style="font-size:clamp(2.2rem,5vw,4rem)">{settlement?.name}</h1><p class="muted">지원군이 도착하기 전에 가장 가치 있는 목표를 골라 약탈하고 해안으로 철수하십시오.</p></div>
      <div style="text-align:right"><span class="eyebrow">남은 시간</span><div class="force-number">{Math.floor(game.raid.timeRemaining)}초</div><small class="danger">사상자 {game.raid.casualties}명</small></div>
    </div>
    <div class="meter" style="height:10px"><span style={`--value:${game.raid.alarm}%;--meter-color:#ae4538`}></span></div>
    <div class="raid-targets">
      {#each RAID_TARGETS as target}
        {@const looted = game.raid.selectedTargets.includes(target.id)}
        <button class:looted class="raid-target" onclick={() => loot(target.id)} disabled={looted || game.raid.phase === 'escape' || game.raid.timeRemaining < target.time}>
          <span class="eyebrow">{target.time}초 · 경보 +{target.alarm}</span><h3>{target.name}</h3><p class="muted" style="font-size:.7rem">{target.primaryResources.map((id) => RESOURCE_META[id].name).join(' · ')}</p>
        </button>
      {/each}
    </div>
    <div class="panel" style="padding:1rem;margin:1rem 0;background:rgba(0,0,0,.2)">
      <span class="eyebrow">RECOVERED LOOT</span>
      <div class="costs" style="margin-top:.55rem">{#if Object.keys(game.raid.recoveredLoot).length === 0}<span class="muted">아직 확보한 전리품이 없습니다.</span>{:else}{#each Object.entries(game.raid.recoveredLoot) as [id, amount]}<span class="cost">{RESOURCE_META[id as ResourceId].icon} {RESOURCE_META[id as ResourceId].name} {amount}</span>{/each}{/if}</div>
    </div>
    <div style="display:flex;justify-content:flex-end"><button class="btn primary" onclick={withdraw}>{game.raid.phase === 'escape' ? '지원군 도착 — 즉시 철수' : '약탈을 마치고 철수'}</button></div>
  </article>
</section>
