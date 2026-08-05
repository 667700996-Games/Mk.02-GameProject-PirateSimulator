<script lang="ts">
  import { DIFFICULTIES, TRAITS } from '$lib/domain/catalog';
  import type { CaptainTrait, Difficulty, NewGameOptions } from '$lib/domain/types';

  let { onCreate, onBack } = $props<{ onCreate: (options: NewGameOptions) => void; onBack: () => void }>();

  let captainName = $state('에드워드 베인');
  let crewName = $state('검은물결 해적단');
  let shipName = $state('붉은 갈매기');
  let havenName = $state('검은물결 은신처');
  let flagMark = $state('☠');
  let flagColor = $state('#8f3028');
  let trait = $state<CaptainTrait>('navigator');
  let difficulty = $state<Difficulty>('captain');

  const marks = ['☠', '⚔', '♛', '⚓', '✦', '♜'];
  const colors = ['#8f3028', '#15191a', '#244c58', '#5b3570', '#7c5b24', '#31553b'];

  function submit(): void {
    if (!captainName.trim() || !crewName.trim() || !shipName.trim()) return;
    onCreate({ captainName, crewName, shipName, havenName, flagMark, flagColor, trait, difficulty });
  }
</script>

<main class="creation-screen screen">
  <div class="creation-shell">
    <header class="creation-header">
      <div>
        <div class="eyebrow">A CAPTAIN'S BEGINNING</div>
        <h1>당신의 전설을 새기십시오</h1>
        <p class="muted">깃발과 이름은 항로마다 공포와 존경으로 기억됩니다.</p>
      </div>
      <button class="btn ghost" onclick={onBack}>← 타이틀로</button>
    </header>

    <div class="creation-grid">
      <section class="panel creation-form">
        <div class="panel-title"><div><span class="eyebrow">01 · IDENTITY</span><h2>선장과 깃발</h2></div></div>
        <div class="field"><label for="captain-name">선장 이름</label><input id="captain-name" maxlength="24" bind:value={captainName} /></div>
        <div class="field"><label for="crew-name">해적단 이름</label><input id="crew-name" maxlength="28" bind:value={crewName} /></div>
        <div class="field"><label for="ship-name">시작 함선 이름</label><input id="ship-name" maxlength="24" bind:value={shipName} /></div>
        <div class="field"><label for="haven-name">은신처 이름</label><input id="haven-name" maxlength="28" bind:value={havenName} /></div>
        <div class="field">
          <span class="eyebrow">해적기 문양</span>
          <div class="flag-palette">{#each marks as mark}<button class:selected={flagMark === mark} class="flag-option" onclick={() => (flagMark = mark)} aria-label={`문양 ${mark}`}>{mark}</button>{/each}</div>
        </div>
        <div class="field">
          <span class="eyebrow">깃발 색상</span>
          <div class="flag-palette">{#each colors as color}<button class:selected={flagColor === color} class="color-option" style={`--flag-color:${color}`} onclick={() => (flagColor = color)} aria-label={`색상 ${color}`}></button>{/each}</div>
        </div>
        <div class="field">
          <label for="difficulty">난이도</label>
          <select id="difficulty" bind:value={difficulty}>
            {#each Object.entries(DIFFICULTIES) as [id, value]}<option value={id}>{value.name} — {value.description}</option>{/each}
          </select>
        </div>
      </section>

      <section class="panel trait-panel">
        <div class="panel-title"><div><span class="eyebrow">02 · LEGACY</span><h2>선장의 시작 특성</h2><p class="muted">플레이 스타일을 바꾸는 영구 특성입니다.</p></div></div>
        <div class="trait-grid">
          {#each TRAITS as item}
            <button class:selected={trait === item.id} class="trait-card" onclick={() => (trait = item.id)}>
              <div class="trait-top"><span class="trait-icon">{item.icon}</span><div><strong>{item.name}</strong><div class="eyebrow" style="font-size:.55rem">{item.title}</div></div></div>
              <small>{item.description}</small>
            </button>
          {/each}
        </div>
      </section>

      <div class="creation-footer">
        <button class="btn" onclick={onBack}>취소</button>
        <button class="btn primary" onclick={submit} disabled={!captainName.trim() || !crewName.trim() || !shipName.trim()}>검은 깃발을 올린다 →</button>
      </div>
    </div>
  </div>
</main>
