<script lang="ts">
  import type { GameState, Ship } from '$lib/domain/types';
  import { pursuitTier } from '$lib/domain/factions';
  import { aggregateInventory } from '$lib/settlement/construction';
  import { settlementSummary } from '$lib/settlement/summary';

  let { game, saving, onSave, onSettings } = $props<{ game: GameState; saving: boolean; onSave: () => void; onSettings: () => void }>();
  let ship = $derived(game.ships.find((item: Ship) => item.id === game.activeShipId) ?? game.ships[0]);
  let pursuit = $derived(pursuitTier(game.bounty));
  let cityInventory = $derived(aggregateInventory(game.settlement));
  let city = $derived(settlementSummary(game.settlement));
</script>

<header class="game-header">
  <div class="captain-id">
    <div class="flag-chip" style={`--flag-color:${game.captain.flagColor}`}>{game.captain.flagMark}</div>
    <div><strong>{game.captain.name}</strong><small>{game.captain.crewName} · 명성 {game.captain.renown}</small></div>
  </div>
  <div class="header-resources">
    <div class="header-stat"><span>●</span><b>{Math.floor(cityInventory.gold ?? 0).toLocaleString()}</b><small>금화</small></div>
    <div class="header-stat"><span>▰</span><b>{Math.floor((cityInventory.logs ?? 0) + (cityInventory.planks ?? 0))}</b><small>목재</small></div>
    <div class="header-stat"><span>✦</span><b>{Math.floor(cityInventory.powder ?? 0)}</b><small>화약</small></div>
    <div class="header-stat"><span>◒</span><b class:danger={city.foodDays < 2}>{city.foodDays.toFixed(1)}일</b><small>식량</small></div>
    <div class="header-stat"><span>⚑</span><b class:danger={game.bounty > 500}>{Math.floor(game.bounty).toLocaleString()}</b><small>{pursuit.name}</small></div>
  </div>
  <div class="header-actions">
    <span class="save-pulse">{saving ? '저장 중…' : ''}</span>
    <span class="tag">{ship.name}</span>
    <button class="btn small" onclick={onSave}>저장</button>
    <button class="btn small ghost" onclick={onSettings} aria-label="설정">⚙</button>
  </div>
</header>
