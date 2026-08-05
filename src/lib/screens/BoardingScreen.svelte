<script lang="ts">
  import { resolveBoardingRound, type BoardingAction } from '$lib/domain/boarding';
  import { addCargo } from '$lib/domain/economy';
  import { finishEncounter } from '$lib/domain/voyage';
  import { gameSession } from '$lib/stores/gameStore';
  import type { GameState, ResourceId, Ship } from '$lib/domain/types';

  let { game } = $props<{ game: GameState }>();
  let boarding = $derived(game.boarding);
  let player = $derived(game.ships.find((ship: Ship) => ship.id === game.activeShipId) ?? game.ships[0]);
  const actions: { id: BoardingAction; name: string; detail: string }[] = [
    { id: 'charge', name: '정면 돌격', detail: '높은 피해와 높은 사상 위험' },
    { id: 'flank', name: '측면 침투', detail: '안전하게 전열을 무너뜨림' },
    { id: 'captain', name: '선장 집중 공격', detail: '적 사기를 크게 낮춤' },
    { id: 'magazine', name: '화약고 점거', detail: '위험하지만 강력한 일격' },
    { id: 'intimidate', name: '항복 유도', detail: '인명 손실을 줄이는 압박' },
    { id: 'retreat', name: '갈고리 절단', detail: '본선으로 후퇴' }
  ];

  function act(action: BoardingAction): void {
    gameSession.updateGame((state) => {
      const result = resolveBoardingRound(state.boarding, action, Math.random);
      return {
        ...state,
        boarding: result.state,
        ships: state.ships.map((ship) => ship.id === state.activeShipId ? { ...ship, crew: Math.max(1, ship.crew - result.playerCasualties), morale: Math.max(0, ship.morale - result.playerCasualties * .8) } : ship)
      };
    });
  }

  function settle(choice: 'loot' | 'capture' | 'recruit' | 'sink'): void {
    gameSession.updateGame((state) => {
      const enemy = state.boarding.enemyShip!;
      let active = state.ships.find((ship) => ship.id === state.activeShipId) ?? state.ships[0];
      const recovered: Partial<Record<ResourceId, number>> = {};
      for (const [id, amount] of Object.entries(enemy.cargo) as [ResourceId, number][]) {
        const transfer = addCargo(active, id, amount);
        active = transfer.ship;
        recovered[id] = transfer.added;
      }
      let ships: Ship[] = state.ships.map((ship) => ship.id === active.id ? active : ship);
      if (choice === 'capture' && active.crew >= 8) {
        const prizeCrew = 4;
        active = { ...active, crew: active.crew - prizeCrew };
        ships = ships.map((ship) => ship.id === active.id ? active : ship);
        ships.push({ ...enemy, id: `prize-${Date.now()}`, name: `${enemy.name} (나포선)`, crew: prizeCrew, morale: 38, isCaptured: true, isFlagship: false, cargo: {}, cargoWeight: 0 });
      }
      if (choice === 'recruit') {
        const recruits = Math.min(5, Math.floor(enemy.crew * .35));
        active = { ...active, crew: Math.min(active.stats.crewMax, active.crew + recruits), morale: Math.min(100, active.morale + 2) };
        ships = ships.map((ship) => ship.id === active.id ? active : ship);
      }
      const next = finishEncounter({ ...state, ships }, choice === 'capture' ? 'captured' : 'victory', enemy, recovered);
      return {
        ...next,
        screen: 'world-map',
        boarding: { ...next.boarding, active: false },
        tutorialStep: Math.max(next.tutorialStep, 4)
      };
    }, true);
  }
</script>

<section class="event-screen">
  <article class="event-card panel">
    <div style="text-align:center"><span class="eyebrow">BOARDING ACTION · ROUND {boarding.round}</span><h1 style="font-size:clamp(2.2rem,5vw,4rem)">갈고리와 강철</h1><p class="muted">두 선체가 부딪히고, 화약 연기 속에서 갑판의 운명이 결정됩니다.</p></div>
    <div class="versus">
      <div class="force-card"><span class="eyebrow">{game.captain.crewName}</span><div class="force-number">{boarding.committedCrew}</div><div class="meter"><span style={`--value:${Math.min(100, boarding.playerStrength / Math.max(boarding.enemyStrength + boarding.playerStrength, 1) * 100)}%;--meter-color:#7faf94`}></span></div><small class="muted">투입 전력 {Math.round(boarding.playerStrength)}</small></div>
      <div class="versus-mark">⚔</div>
      <div class="force-card" style="text-align:right"><span class="eyebrow danger">{boarding.enemyShip?.name}</span><div class="force-number">{boarding.enemyShip?.crew ?? 0}</div><div class="meter"><span style={`--value:${Math.min(100, boarding.enemyStrength / Math.max(boarding.enemyStrength + boarding.playerStrength, 1) * 100)}%;--meter-color:#aa4c42`}></span></div><small class="muted">저항 전력 {Math.round(boarding.enemyStrength)}</small></div>
    </div>
    <div class="battle-log">{#each boarding.log as line}<div>› {line}</div>{/each}</div>
    {#if !boarding.outcome}
      <div class="action-grid">{#each actions as action}<button class:danger-button={action.id === 'retreat'} class="btn" onclick={() => act(action.id)}><strong>{action.name}</strong><small style="display:block;opacity:.58">{action.detail}</small></button>{/each}</div>
    {:else if boarding.outcome === 'victory'}
      <div style="text-align:center"><span class="eyebrow success">ENEMY DECK SECURED</span><h2>적선이 무릎 꿇었다</h2><p class="muted">화물, 함선, 살아남은 선원의 운명을 결정하십시오.</p></div>
      <div class="action-grid">
        <button class="btn primary" onclick={() => settle('loot')}>화물만 약탈</button>
        <button class="btn" onclick={() => settle('capture')} disabled={player.crew < 8}>함선 나포 · 선원 4명</button>
        <button class="btn" onclick={() => settle('recruit')}>적 선원 전향</button>
        <button class="btn danger-button" onclick={() => settle('sink')}>함선 침몰</button>
      </div>
    {:else}
      <div style="text-align:center"><h2>{boarding.outcome === 'retreat' ? '갈고리를 끊었다' : '공격대가 무너졌다'}</h2><button class="btn" onclick={() => gameSession.setScreen('sailing')}>본선으로 복귀</button></div>
    {/if}
  </article>
</section>
