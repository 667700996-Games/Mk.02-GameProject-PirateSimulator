<script lang="ts">
  import { ZONES } from '$lib/domain/catalog';
  import { departForZone } from '$lib/domain/voyage';
  import { gameSession } from '$lib/stores/gameStore';
  import type { GameState, SettlementState, Ship, ZoneId } from '$lib/domain/types';
  import type { StrategicExpedition } from '$lib/settlement/types';

  let { game } = $props<{ game: GameState }>();
  let selectedZone = $state<ZoneId>('beginners-bay');
  let selectedSettlement = $state<SettlementState | null>(null);
  let zone = $derived(ZONES[selectedZone]);
  let activeExpeditions: StrategicExpedition[] = $derived(
    game.settlement.expeditions.filter((expedition: StrategicExpedition) => !['COMPLETED', 'LOST'].includes(expedition.state))
  );
  let activeShip = $derived(game.ships.find((ship: Ship) => ship.id === game.activeShipId) ?? game.ships[0]);
  let canDirectSortie = $derived(
    !!activeShip && activeShip.hull >= activeShip.stats.hullMax * .35 && activeShip.sails >= activeShip.stats.sailMax * .35 && activeShip.crew >= 4
  );
  const positions: Record<ZoneId, { x: number; y: number }> = {
    'beginners-bay': { x: 17, y: 70 }, 'merchant-routes': { x: 31, y: 43 }, 'mist-archipelago': { x: 48, y: 21 }, 'naval-patrol': { x: 73, y: 19 }, 'storm-reach': { x: 12, y: 17 }, 'freeport-waters': { x: 81, y: 46 }, 'imperial-heartway': { x: 52, y: 79 }, 'legend-sea': { x: 83, y: 76 }
  };

  function selectSettlement(settlement: SettlementState): void {
    selectedSettlement = settlement;
    selectedZone = settlement.zoneId;
  }

  function planExpedition(): void {
    gameSession.updateGame((state) => ({ ...state, screen: 'fleet', previousScreen: 'world-map', voyage: { ...state.voyage, zoneId: selectedZone, destinationId: selectedSettlement?.id } }));
  }

  function directSortie(): void {
    if (!canDirectSortie) return;
    gameSession.updateGame((state) => departForZone(state, selectedZone), true);
  }

</script>

<section class="map-screen">
  <div class="map-canvas">
    <div class="chart-vignette" aria-hidden="true"></div>
    <div class="map-title"><span class="eyebrow">THE SHATTERED ARCHIPELAGO</span><h1>검은 해도</h1><p class="muted">정착지의 함대가 발견한 항로와 왕실 순찰 정보가 기록됩니다.</p></div>
    {#each Object.values(ZONES) as item}
      {@const discovered = game.world.zones[item.id].discovered}
      <button class:locked={!discovered} class:selected={selectedZone === item.id} class="zone-node" style={`left:${positions[item.id].x}%;top:${positions[item.id].y}%;--zone-color:${item.color};--zone-accent:${item.accent}`} onclick={() => discovered && ((selectedZone = item.id), (selectedSettlement = null))}>
        <b>{discovered ? item.name : '미지의 해역'}</b><small>{discovered ? `위험도 ${item.difficulty}` : '정보 필요'}</small>
      </button>
    {/each}
    {#each game.world.settlements.filter((item: SettlementState) => item.discovered) as settlement, index}
      <button class="settlement-dot" style={`left:${settlement.position.x}%;top:${settlement.position.y}%`} onclick={() => selectSettlement(settlement)} aria-label={settlement.name}></button>
      <span class="settlement-label" style={`left:${settlement.position.x}%;top:${settlement.position.y}%;--label-x:${index % 2 === 0 ? -8 : 8}px;--label-y:${12 + (index % 3) * 9}px`}>{settlement.name}</span>
    {/each}
    {#each activeExpeditions as expedition}
      {@const destination = positions[expedition.zoneId as ZoneId]}
      {@const progress = expedition.state === 'RETURNING' ? 1 - expedition.routeProgress : expedition.routeProgress}
      <span class="expedition-marker" style={`left:${18 + (destination.x - 18) * progress}%;top:${73 + (destination.y - 73) * progress}%`} title={expedition.name}>◢</span>
    {/each}
  </div>

  <aside class="map-sidebar">
    {#if selectedSettlement}
      <span class="eyebrow">{selectedSettlement.type.replaceAll('-', ' ')}</span>
      <h2>{selectedSettlement.name}</h2>
      <p class="muted">{selectedSettlement.currentEvent ?? '평소와 다르지 않은 하루가 이어지고 있다.'}</p>
      <div class="map-details">
        <div class="map-row"><span>소속</span><b>{selectedSettlement.factionId}</b></div>
        <div class="map-row"><span>인구</span><b>{selectedSettlement.population.toLocaleString()}</b></div>
        <div class="map-row"><span>방어</span><b>{selectedSettlement.defense}</b></div>
        <div class="map-row"><span>주둔 병력</span><b>{selectedSettlement.garrison.toLocaleString()}</b></div>
        <div class="map-row"><span>경계 수준</span><b>{selectedSettlement.alert}%</b></div>
      </div>
      {#if ['coastal-village', 'fishing-village', 'trade-city', 'military-port'].includes(selectedSettlement.type)}
        <button class="btn danger-button wide" onclick={planExpedition}>이 거점 약탈 원정 편성</button>
        <button class="btn ghost wide direct-sortie" onclick={directSortie} disabled={!canDirectSortie}>기함으로 전술 출격</button>
      {:else if selectedSettlement.type === 'freeport'}
        <button class="btn primary wide" onclick={() => gameSession.setScreen('freeport')}>자유항 입항</button>
      {:else if selectedSettlement.type === 'player-haven'}
        <button class="btn wide" onclick={() => gameSession.setScreen('haven')}>본거지 귀환</button>
      {/if}
      <button class="btn ghost wide" style="margin-top:.5rem" onclick={() => (selectedSettlement = null)}>해역 정보로</button>
    {:else}
      <span class="eyebrow">ZONE · DANGER {zone.difficulty}</span>
      <h2>{zone.name}</h2>
      <p class="brass">{zone.subtitle}</p>
      <p class="muted" style="line-height:1.7">{zone.description}</p>
      <div class="map-details">
        <div class="map-row"><span>날씨</span><b>{zone.weather}</b></div>
        <div class="map-row"><span>풍속</span><b>{zone.wind[0]}–{zone.wind[1]}</b></div>
        <div class="map-row"><span>상선 출현</span><b>{Math.round(zone.merchantRate * 100)}%</b></div>
        <div class="map-row"><span>군함 출현</span><b class:danger={zone.navyRate > .5}>{Math.round(zone.navyRate * 100)}%</b></div>
        <div class="map-row"><span>정보 수준</span><b>{game.world.zones[selectedZone].intel}%</b></div>
      </div>
      <p class="faint" style="font-size:.72rem">희귀 자원: {zone.rareResources.join(' · ')}</p>
      <button class="btn primary wide" onclick={planExpedition}>이 해역 원정 편성</button>
      <button class="btn ghost wide direct-sortie" onclick={directSortie} disabled={!canDirectSortie}>기함으로 전술 출격</button>
      <p class:danger={!canDirectSortie} class="sortie-requirement">
        {canDirectSortie
          ? `${activeShip.name} · 실시간 포격과 승선 지휘`
          : '선체·돛 35% 이상, 선원 4명 이상의 기함이 필요합니다.'}
      </p>
    {/if}
  </aside>
</section>

<style>
  .expedition-marker{position:absolute;z-index:8;transform:translate(-50%,-50%);display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:#172c2c;border:1px solid #e2bd6d;color:#f0ce82;box-shadow:0 0 20px #df9e4d88;animation:map-fleet-pulse 1.6s infinite alternate}@keyframes map-fleet-pulse{to{transform:translate(-50%,-50%) scale(1.14);box-shadow:0 0 32px #df9e4daa}}
  .direct-sortie{margin-top:.5rem}.sortie-requirement{margin:.55rem 0 0;font-size:.66rem;line-height:1.5;color:#9fb0aa}.sortie-requirement.danger{color:#c98c7f}
</style>
