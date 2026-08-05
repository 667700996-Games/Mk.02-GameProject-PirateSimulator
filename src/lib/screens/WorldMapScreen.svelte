<script lang="ts">
  import { ZONES } from '$lib/domain/catalog';
  import { beginRaid } from '$lib/domain/raid';
  import { departForZone } from '$lib/domain/voyage';
  import { gameSession } from '$lib/stores/gameStore';
  import type { GameState, SettlementState, ZoneId } from '$lib/domain/types';

  let { game } = $props<{ game: GameState }>();
  let selectedZone = $state<ZoneId>(game.voyage.zoneId ?? 'beginners-bay');
  let selectedSettlement = $state<SettlementState | null>(null);
  let zone = $derived(ZONES[selectedZone]);
  const positions: Record<ZoneId, { x: number; y: number }> = {
    'beginners-bay': { x: 18, y: 73 }, 'merchant-routes': { x: 35, y: 49 }, 'mist-archipelago': { x: 52, y: 34 }, 'naval-patrol': { x: 68, y: 27 }, 'storm-reach': { x: 73, y: 61 }, 'freeport-waters': { x: 48, y: 62 }, 'imperial-heartway': { x: 84, y: 19 }, 'legend-sea': { x: 91, y: 8 }
  };

  function selectSettlement(settlement: SettlementState): void {
    selectedSettlement = settlement;
    selectedZone = settlement.zoneId;
  }

  function depart(): void {
    gameSession.updateGame((state) => departForZone(state, selectedZone), true);
  }

  function raid(): void {
    if (!selectedSettlement) return;
    gameSession.updateGame((state) => ({ ...state, screen: 'raid', previousScreen: 'world-map', raid: beginRaid(selectedSettlement!, Math.max(6, Math.min(18, state.ships.find((ship) => ship.id === state.activeShipId)?.crew ?? 8)), 'stealth', state.captain.trait) }));
  }
</script>

<section class="map-screen">
  <div class="map-canvas">
    <div class="map-title"><span class="eyebrow">THE SHATTERED ARCHIPELAGO</span><h1>검은 해도</h1><p class="muted">발견한 소문과 항로만 기록됩니다.</p></div>
    {#each Object.values(ZONES) as item}
      {@const discovered = game.world.zones[item.id].discovered}
      <button class:locked={!discovered} class:selected={selectedZone === item.id} class="zone-node" style={`left:${positions[item.id].x}%;top:${positions[item.id].y}%;--zone-color:${item.color};--zone-accent:${item.accent}`} onclick={() => discovered && ((selectedZone = item.id), (selectedSettlement = null))}>
        <b>{discovered ? item.name : '미지의 해역'}</b><small>{discovered ? `위험도 ${item.difficulty}` : '정보 필요'}</small>
      </button>
    {/each}
    {#each game.world.settlements.filter((item) => item.discovered) as settlement}
      <button class="settlement-dot" style={`left:${settlement.position.x}%;top:${settlement.position.y}%`} onclick={() => selectSettlement(settlement)} aria-label={settlement.name}></button>
      <span class="settlement-label" style={`left:${settlement.position.x}%;top:${settlement.position.y}%`}>{settlement.name}</span>
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
        <button class="btn danger-button wide" onclick={raid}>상륙 작전 계획</button>
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
      <button class="btn primary wide" onclick={depart}>이 해역으로 출항</button>
    {/if}
  </aside>
</section>
