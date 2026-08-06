<script lang="ts">
  import { onMount } from 'svelte';
  import GameHeader from './GameHeader.svelte';
  import GameNav from './GameNav.svelte';
  import ToastStack from './ToastStack.svelte';
  import HavenScreen from '$lib/screens/HavenScreen.svelte';
  import { gameSession } from '$lib/stores/gameStore';
  import type { GameScreen, GameSettings, GameState, SaveRecord } from '$lib/domain/types';
  import { campaignObjectives } from '$lib/domain/campaign';
  import type { Component } from 'svelte';
  import { focusTrap } from '$lib/actions/focusTrap';

  let { game, settings, saves, saving } = $props<{ game: GameState; settings: GameSettings; saves: SaveRecord[]; saving: boolean }>();
  type ScreenModule = { default: Component<Record<string, unknown>> };
  const screenLoaders: Partial<Record<GameScreen, () => Promise<ScreenModule>>> = {
    'world-map': () => import('$lib/screens/WorldMapScreen.svelte') as Promise<ScreenModule>,
    sailing: () => import('$lib/screens/SeaScreen.svelte') as Promise<ScreenModule>,
    boarding: () => import('$lib/screens/BoardingScreen.svelte') as Promise<ScreenModule>,
    raid: () => import('$lib/screens/RaidScreen.svelte') as Promise<ScreenModule>,
    freeport: () => import('$lib/screens/FreeportScreen.svelte') as Promise<ScreenModule>,
    trade: () => import('$lib/screens/FreeportScreen.svelte') as Promise<ScreenModule>,
    shipyard: () => import('$lib/screens/ShipyardScreen.svelte') as Promise<ScreenModule>,
    fleet: () => import('$lib/screens/FleetScreen.svelte') as Promise<ScreenModule>,
    crew: () => import('$lib/screens/CrewScreen.svelte') as Promise<ScreenModule>,
    missions: () => import('$lib/screens/MissionsScreen.svelte') as Promise<ScreenModule>,
    factions: () => import('$lib/screens/FactionsScreen.svelte') as Promise<ScreenModule>,
    settings: () => import('$lib/screens/SettingsScreen.svelte') as Promise<ScreenModule>,
    defense: () => import('$lib/screens/DefenseScreen.svelte') as Promise<ScreenModule>,
    progression: () => import('$lib/screens/ProgressionScreen.svelte') as Promise<ScreenModule>
  };
  let LoadedScreen = $state<Component<Record<string, unknown>>>();
  let loadedFor = $state<GameScreen>();
  let loadingFor = $state<GameScreen>();
  let loadSequence = 0;

  function hasScreenLoader(screen: GameScreen): boolean {
    return !!screenLoaders[screen];
  }

  $effect(() => {
    const requested = game.screen as GameScreen;
    if (requested === 'haven') {
      LoadedScreen = undefined;
      loadedFor = 'haven';
      loadingFor = undefined;
      return;
    }
    if (loadedFor === requested && LoadedScreen) return;
    if (loadingFor === requested) return;
    const loader = screenLoaders[requested];
    if (!loader) return;
    const sequence = ++loadSequence;
    loadingFor = requested;
    loadedFor = undefined;
    LoadedScreen = undefined;
    void loader().then((module: ScreenModule) => {
      if (sequence !== loadSequence) return;
      LoadedScreen = module.default;
      loadedFor = requested;
      loadingFor = undefined;
    }).catch(() => {
      if (sequence === loadSequence) loadingFor = undefined;
    });
  });

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
    {#if game.screen === 'haven'}<HavenScreen {game} {settings} {navigate} />
    {:else if LoadedScreen && loadedFor === game.screen}<LoadedScreen {game} {settings} {saves} {saving} {navigate} onUpdate={gameSession.updateSettings} onLoad={gameSession.load} onDelete={gameSession.deleteSave} onExport={gameSession.exportCurrent} onImport={gameSession.importSerialized} onBack={backFromSettings} onTitle={title} />
    {:else if hasScreenLoader(game.screen as GameScreen)}<div class="screen-loading" role="status"><span>✥</span><b>해도를 펼치는 중</b></div>
    {:else}<HavenScreen {game} {settings} {navigate} />{/if}
  </main>
  {#if game.screen !== 'settings'}<GameNav screen={game.screen} onNavigate={navigate} />{/if}
  <ToastStack toasts={game.toasts} onDismiss={gameSession.dismissToast} />
  {#if game.paused}
    <div class="modal-backdrop pause-backdrop" role="dialog" aria-modal="true" aria-labelledby="pause-title">
      <section class="modal panel pause-panel" tabindex="-1" use:focusTrap><span class="eyebrow">CAPTAIN'S RESPITE</span><h2 id="pause-title">일시정지</h2><p class="muted">파도와 추격, 본거지 시계가 멈췄습니다.</p><div class="pause-actions"><button class="btn primary" onclick={() => gameSession.setPaused(false)}>항해 계속 · ESC</button><button class="btn" onclick={() => { gameSession.setPaused(false); navigate('settings'); }}>설정</button><button class="btn" onclick={() => gameSession.saveCurrent()}>수동 저장</button><button class="btn danger-button" onclick={title}>저장 후 타이틀로</button></div></section>
    </div>
  {/if}
  {#if game.flags.campaignVictory && !game.flags.campaignVictoryAcknowledged}
    <div class="modal-backdrop victory-backdrop" role="dialog" aria-modal="true" aria-labelledby="victory-title">
      <section class="modal panel victory-panel" tabindex="-1" use:focusTrap><span class="eyebrow">THE FREE CROWN</span><h2 id="victory-title">해적 왕국이 일어섰습니다</h2><p>난파선 곁의 작은 모닥불은 이제 왕실 함대도 함부로 넘보지 못하는 자유 도시가 되었습니다. 네 물결의 선장들이 당신을 첫 번째 군도 군주로 인정합니다.</p><div class="victory-seal">♛</div><div class="victory-objectives">{#each campaignObjectives(game) as objective}<span><i>✓</i>{objective.name}</span>{/each}</div><p class="muted">캠페인은 완결되었지만 정착지는 계속 운영할 수 있습니다. 더 큰 함대와 완전한 자급망을 건설하십시오.</p><div class="pause-actions"><button class="btn primary" onclick={() => gameSession.updateGame((state) => ({ ...state, flags: { ...state.flags, campaignVictoryAcknowledged: true } }), true)}>자유 통치 계속</button><button class="btn" onclick={() => { gameSession.updateGame((state) => ({ ...state, flags: { ...state.flags, campaignVictoryAcknowledged: true } })); navigate('progression'); }}>왕국 기록 보기</button><button class="btn" onclick={() => gameSession.saveCurrent('해적 왕국 선포 기록을 저장했습니다.')}>승리 기록 저장</button></div></section>
    </div>
  {/if}
</div>

<style>
  .screen-loading{min-height:calc(100vh - 126px);display:grid;place-content:center;justify-items:center;gap:.7rem;background:radial-gradient(circle,#173839,#061316 48%);color:var(--ink-muted)}.screen-loading span{font-size:2.4rem;color:var(--brass);animation:loading-chart 1.2s ease-in-out infinite alternate}.screen-loading b{font-size:.72rem;letter-spacing:.15em}@keyframes loading-chart{to{transform:rotate(45deg) scale(1.12);filter:drop-shadow(0 0 15px #d2ae62)}}
  .victory-backdrop{background:radial-gradient(circle at 50% 42%,#2c756d66,transparent 38%),#02090de8}.victory-panel{position:relative;max-width:760px;text-align:center;padding:2rem;overflow:hidden;border-color:#d3ac5f;box-shadow:0 0 80px #4eb2a244,inset 0 0 60px #b68b3a12}.victory-panel::before{content:'';position:absolute;inset:8px;border:1px solid #d3ac5f55;pointer-events:none}.victory-panel h2{font-size:2.2rem;color:#f1d18c;margin:.4rem}.victory-panel>p{max-width:620px;margin:.8rem auto;line-height:1.7}.victory-seal{font-size:4rem;color:#e4bd6b;text-shadow:0 0 30px #64d7c5;animation:seal-glow 2.4s ease-in-out infinite alternate}.victory-objectives{display:grid;grid-template-columns:repeat(2,1fr);gap:.35rem;text-align:left;margin:1rem 0}.victory-objectives span{border:1px solid var(--line-soft);background:#0d2626;padding:.55rem;font-size:.62rem}.victory-objectives i{font-style:normal;color:#75c8ae;margin-right:.45rem}@keyframes seal-glow{to{transform:scale(1.08);text-shadow:0 0 48px #64d7c5}}@media(max-width:700px){.victory-panel{margin:.6rem;padding:1.2rem}.victory-panel h2{font-size:1.45rem}.victory-objectives{grid-template-columns:1fr;max-height:34vh;overflow:auto}}
</style>
