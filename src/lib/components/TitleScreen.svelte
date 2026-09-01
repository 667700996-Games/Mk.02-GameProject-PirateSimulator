<script lang="ts">
  import type { SaveRecord } from '$lib/domain/types';

  let { saves, onNew, onContinue, onOpenSaves, onSettings } = $props<{
    saves: SaveRecord[];
    onNew: () => void;
    onContinue: (id: string) => void;
    onOpenSaves: () => void;
    onSettings: () => void;
  }>();

  const formatHours = (seconds: number) => `${Math.floor(seconds / 3600)}시간 ${Math.floor((seconds % 3600) / 60)}분`;
</script>

<svelte:head><title>검은물결: 해적 군주</title></svelte:head>

<main class="title-screen screen">
  <div class="title-bg"></div>
  <section class="title-content">
    <div class="title-mark" aria-hidden="true"><span>☠</span></div>
    <div class="ornament-line">ORCA CREW PRESENTS</div>
    <h1 class="game-title">검은물결 <span class="accent">Pirate Sovereign</span></h1>
    <p class="title-copy">돛을 올리고, 왕관의 항로를 불태우고, 빼앗은 모든 것으로 당신만의 해적 왕국을 세우십시오.</p>
    <div class="title-actions">
      {#if saves.length > 0}
        <button class="btn primary wide" onclick={() => onContinue(saves[0].id)}>
          항해 계속하기 · {saves[0].captainName}
          <small style="display:block;opacity:.7;margin-top:3px">{saves[0].shipName} · {formatHours(saves[0].playTimeSeconds)}</small>
        </button>
      {/if}
      <button class:primary={saves.length === 0} class="btn wide" onclick={onNew}>새로운 전설 시작</button>
      <button class="btn ghost wide" onclick={onOpenSaves} disabled={saves.length === 0}>항해일지 불러오기</button>
      <button class="btn ghost wide" onclick={onSettings}>설정</button>
    </div>
  </section>
  <div class="title-version">MK.03 · BUILD 0.1.0 · SINGLE PLAYER</div>
</main>
