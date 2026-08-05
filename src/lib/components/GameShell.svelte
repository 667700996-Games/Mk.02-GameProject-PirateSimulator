<script lang="ts">
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
</script>

<div class="game-shell">
  <GameHeader {game} {saving} onSave={() => gameSession.saveCurrent()} onSettings={() => navigate('settings')} />
  <main class="main-viewport">
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
</div>
