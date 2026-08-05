<script lang="ts">
  import type { GameState, Ship } from '$lib/domain/types';
  import { pursuitTier } from '$lib/domain/factions';

  let { game, saving, onSave, onSettings } = $props<{ game: GameState; saving: boolean; onSave: () => void; onSettings: () => void }>();
  let ship = $derived(game.ships.find((item: Ship) => item.id === game.activeShipId) ?? game.ships[0]);
  let pursuit = $derived(pursuitTier(game.bounty));
</script>

<header class="game-header">
  <div class="captain-id">
    <div class="flag-chip" style={`--flag-color:${game.captain.flagColor}`}>{game.captain.flagMark}</div>
    <div><strong>{game.captain.name}</strong><small>{game.captain.crewName} · 명성 {game.captain.renown}</small></div>
  </div>
  <div class="header-resources">
    <div class="header-stat"><span>●</span><b>{Math.floor(game.resources.gold).toLocaleString()}</b><small>금화</small></div>
    <div class="header-stat"><span>▰</span><b>{Math.floor(game.resources.timber)}</b><small>목재</small></div>
    <div class="header-stat"><span>✦</span><b>{Math.floor(game.resources.powder)}</b><small>화약</small></div>
    <div class="header-stat"><span>◒</span><b>{Math.floor(game.resources.food)}</b><small>식량</small></div>
    <div class="header-stat"><span>⚑</span><b class:danger={game.bounty > 500}>{Math.floor(game.bounty).toLocaleString()}</b><small>{pursuit.name}</small></div>
  </div>
  <div class="header-actions">
    <span class="save-pulse">{saving ? '저장 중…' : ''}</span>
    <span class="tag">{ship.name}</span>
    <button class="btn small" onclick={onSave}>저장</button>
    <button class="btn small ghost" onclick={onSettings} aria-label="설정">⚙</button>
  </div>
</header>
