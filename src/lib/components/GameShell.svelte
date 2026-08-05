<script lang="ts">
  import { onMount } from 'svelte';
  import GameHeader from './GameHeader.svelte';
  import GameNav from './GameNav.svelte';
  import ToastStack from './ToastStack.svelte';
  import HavenScreen from '$lib/screens/HavenScreen.svelte';
  import WorldMapScreen from '$lib/screens/WorldMapScreen.svelte';
  import SeaScreen from '$lib/screens/SeaScreen.svelte';
  import BoardingScreen from '$lib/screens/BoardingScreen.svelte';
  import RaidScreen from '$lib/screens/RaidScreen.svelte';
  import FreeportScreen from '$lib/screens/FreeportScreen.svelte';
  import ShipyardScreen from '$lib/screens/ShipyardScreen.svelte';
  import FleetScreen from '$lib/screens/FleetScreen.svelte';
  import CrewScreen from '$lib/screens/CrewScreen.svelte';
  import MissionsScreen from '$lib/screens/MissionsScreen.svelte';
  import FactionsScreen from '$lib/screens/FactionsScreen.svelte';
  import SettingsScreen from '$lib/screens/SettingsScreen.svelte';
  import DefenseScreen from '$lib/screens/DefenseScreen.svelte';
  import { gameSession } from '$lib/stores/gameStore';
  import type { GameScreen, GameSettings, GameState, SaveRecord } from '$lib/domain/types';

  let { game, settings, saves, saving } = $props<{ game: GameState; settings: GameSettings; saves: SaveRecord[]; saving: boolean }>();

  function navigate(screen: GameScreen): void { gameSession.setScreen(screen); }
  function backFromSettings(): void { gameSession.setScreen(game.previousScreen && game.previousScreen !== 'settings' ? game.previousScreen : 'haven'); }
  async function title(): Promise<void> { await gameSession.saveCurrent('타이틀로 돌아가기 전에 저장했습니다.'); gameSession.returnToTitle(); }

  onMount(() => {
    const keydown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.matches('input,select,textarea')) return;
      const bindings = settings.keyBindings;
      if (event.code === bindings.pause) { event.preventDefault(); gameSession.setPaused(!game.paused); return; }
      if (game.paused) return;
      const destinations: Partial<Record<string, GameScreen>> = { [bindings.map]: 'world-map', [bindings.ship]: 'shipyard', [bindings.crew]: 'crew', [bindings.haven]: 'haven' };
      const destination = destinations[event.code];
      if (destination && game.screen !== 'boarding' && game.screen !== 'raid' && game.screen !== 'defense') gameSession.setScreen(destination);
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  });
</script>

<div class="game-shell">
  <a class="skip-link" href="#game-content">게임 내용으로 건너뛰기</a>
  <GameHeader {game} {saving} onSave={() => gameSession.saveCurrent()} onSettings={() => navigate('settings')} />
  <main class="main-viewport" id="game-content" tabindex="-1">
    {#if game.screen === 'haven'}<HavenScreen {game} {navigate} />
    {:else if game.screen === 'world-map'}<WorldMapScreen {game} />
    {:else if game.screen === 'sailing'}<SeaScreen {game} {settings} />
    {:else if game.screen === 'boarding'}<BoardingScreen {game} />
    {:else if game.screen === 'raid'}<RaidScreen {game} />
    {:else if game.screen === 'freeport' || game.screen === 'trade'}<FreeportScreen {game} />
    {:else if game.screen === 'shipyard'}<ShipyardScreen {game} />
    {:else if game.screen === 'fleet'}<FleetScreen {game} />
    {:else if game.screen === 'crew'}<CrewScreen {game} />
    {:else if game.screen === 'missions'}<MissionsScreen {game} />
    {:else if game.screen === 'factions'}<FactionsScreen {game} />
    {:else if game.screen === 'settings'}<SettingsScreen {settings} {saves} onUpdate={gameSession.updateSettings} onLoad={gameSession.load} onDelete={gameSession.deleteSave} onBack={backFromSettings} onTitle={title} />
    {:else if game.screen === 'defense'}<DefenseScreen {game} />
    {:else}<HavenScreen {game} {navigate} />{/if}
  </main>
  {#if game.screen !== 'settings'}<GameNav screen={game.screen} onNavigate={navigate} />{/if}
  <ToastStack toasts={game.toasts} onDismiss={gameSession.dismissToast} />
  {#if game.paused}
    <div class="modal-backdrop pause-backdrop" role="dialog" aria-modal="true" aria-labelledby="pause-title">
      <section class="modal panel pause-panel"><span class="eyebrow">CAPTAIN'S RESPITE</span><h2 id="pause-title">일시정지</h2><p class="muted">파도와 추격, 본거지 시계가 멈췄습니다.</p><div class="pause-actions"><button class="btn primary" onclick={() => gameSession.setPaused(false)}>항해 계속 · ESC</button><button class="btn" onclick={() => { gameSession.setPaused(false); navigate('settings'); }}>설정</button><button class="btn" onclick={() => gameSession.saveCurrent()}>수동 저장</button><button class="btn danger-button" onclick={title}>저장 후 타이틀로</button></div></section>
    </div>
  {/if}
</div>
