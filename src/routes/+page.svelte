<script lang="ts">
  import { onMount } from 'svelte';
  import TitleScreen from '$lib/components/TitleScreen.svelte';
  import CaptainCreation from '$lib/components/CaptainCreation.svelte';
  import GameShell from '$lib/components/GameShell.svelte';
  import { gameSession } from '$lib/stores/gameStore';
  import { soundEngine } from '$lib/audio/SoundEngine';
  import type { NewGameOptions } from '$lib/domain/types';
  import { focusTrap } from '$lib/actions/focusTrap';
  import { CAPTAIN_CREATION_SESSION_KEY, CAPTAIN_DRAFT_SESSION_KEY } from '$lib/persistence/sessionContinuity';

  let creating = $state(false);
  let showSaves = $state(false);
  let showSettings = $state(false);

  onMount(() => {
    creating = sessionStorage.getItem(CAPTAIN_CREATION_SESSION_KEY) === '1';
    void gameSession.initialize();
    const timer = window.setInterval(() => gameSession.tickPlayTime(1), 1000);
    const unlock = () => void soundEngine.unlock($gameSession.settings);
    const uiClick = (event: MouseEvent) => { if ((event.target as HTMLElement)?.closest('button,select')) soundEngine.play('ui'); };
    const saveWhenHidden = () => { if (document.visibilityState === 'hidden' && $gameSession.game) gameSession.scheduleAutoSave(0); };
    const serviceWorkerUpdated = () => gameSession.addToast('info', '새 항해 규칙 적용', '게임 셸이 최신 버전으로 교체되었습니다. 진행 상태는 그대로 유지됩니다.');
    const wentOffline = () => gameSession.addToast('info', '오프라인 항해', '핵심 게임 자산과 저장소를 기기에서 계속 사용합니다.');
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    window.addEventListener('click', uiClick);
    document.addEventListener('visibilitychange', saveWhenHidden);
    navigator.serviceWorker?.addEventListener('controllerchange', serviceWorkerUpdated);
    window.addEventListener('offline', wentOffline);
    return () => { window.clearInterval(timer); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); window.removeEventListener('click', uiClick); window.removeEventListener('offline', wentOffline); navigator.serviceWorker?.removeEventListener('controllerchange', serviceWorkerUpdated); document.removeEventListener('visibilitychange', saveWhenHidden); };
  });

  $effect(() => {
    soundEngine.configure($gameSession.settings);
    const game = $gameSession.game;
    const mood = !game ? 'title' : game.screen === 'sailing' ? (game.voyage.weather === 'storm' ? 'storm' : game.voyage.currentEncounter?.enemyShip ? 'battle' : 'sea') : game.screen === 'freeport' || game.screen === 'trade' ? 'freeport' : game.screen === 'boarding' || game.screen === 'raid' || game.screen === 'defense' ? 'battle' : game.screen === 'haven' ? 'haven' : 'aftermath';
    soundEngine.setMood(mood);
    document.documentElement.dataset.reducedMotion = String($gameSession.settings.reducedMotion);
    document.documentElement.dataset.uiScale = $gameSession.settings.uiScale;
    document.documentElement.dataset.colorVision = $gameSession.settings.colorVision;
    document.documentElement.dataset.highContrast = String($gameSession.settings.highContrast);
  });

  function create(options: NewGameOptions): void {
    gameSession.startNewGame(options);
    closeCreation();
  }

  function openCreation(): void {
    creating = true;
    sessionStorage.setItem(CAPTAIN_CREATION_SESSION_KEY, '1');
  }

  function closeCreation(): void {
    creating = false;
    sessionStorage.removeItem(CAPTAIN_CREATION_SESSION_KEY);
    sessionStorage.removeItem(CAPTAIN_DRAFT_SESSION_KEY);
  }

  async function load(id: string): Promise<void> {
    await gameSession.load(id);
    showSaves = false;
  }
</script>

{#if !$gameSession.ready}
  <main class="title-screen screen" style="place-items:center"><div class="title-bg"></div><div style="text-align:center"><div class="title-mark"><span>☠</span></div><span class="eyebrow">항해일지를 펼치는 중…</span></div></main>
{:else if $gameSession.game}
  <GameShell game={$gameSession.game} settings={$gameSession.settings} saves={$gameSession.saves} saving={$gameSession.saving} />
{:else if creating}
  <CaptainCreation onCreate={create} onBack={closeCreation} />
{:else}
  <TitleScreen saves={$gameSession.saves} onNew={openCreation} onContinue={load} onOpenSaves={() => (showSaves = true)} onSettings={() => (showSettings = true)} />
  {#if showSaves}
    <div class="modal-backdrop"><div class="modal panel" role="dialog" aria-modal="true" aria-labelledby="save-dialog-title" tabindex="-1" use:focusTrap><div class="panel-title"><div><span class="eyebrow">VOYAGE LOGS</span><h2 id="save-dialog-title">항해일지 불러오기</h2></div><button class="btn small ghost" onclick={() => (showSaves = false)}>닫기</button></div>{#each $gameSession.saves as save}<div class="save-card"><div><strong>{save.name}</strong><small class="muted" style="display:block">{save.captainName} · {save.shipName} · {new Date(save.updatedAt).toLocaleString('ko-KR')}</small></div><button class="btn small primary" onclick={() => load(save.id)}>계속</button></div>{/each}</div></div>
  {/if}
  {#if showSettings}
    <div class="modal-backdrop"><div class="modal panel" role="dialog" aria-modal="true" aria-labelledby="title-settings-title" tabindex="-1" use:focusTrap><div class="panel-title"><div><span class="eyebrow">SETTINGS</span><h2 id="title-settings-title">타이틀 설정</h2></div><button class="btn small ghost" onclick={() => (showSettings = false)}>닫기</button></div><div class="field"><label for="title-volume">전체 음량 · {Math.round($gameSession.settings.masterVolume * 100)}%</label><input id="title-volume" type="range" min="0" max="1" step=".05" value={$gameSession.settings.masterVolume} oninput={(event) => gameSession.updateSettings({ masterVolume: Number(event.currentTarget.value) })} /></div><div class="field"><label for="title-quality">렌더링 품질</label><select id="title-quality" value={$gameSession.settings.quality} onchange={(event) => gameSession.updateSettings({ quality: event.currentTarget.value as 'low' | 'medium' | 'high' })}><option value="low">낮음</option><option value="medium">중간</option><option value="high">높음</option></select></div></div></div>
  {/if}
{/if}
{#if $gameSession.error}
  <div class="session-error" role="alert"><strong>항해일지 오류</strong><span>{$gameSession.error}</span><button onclick={gameSession.dismissError} aria-label="오류 닫기">×</button></div>
{/if}
