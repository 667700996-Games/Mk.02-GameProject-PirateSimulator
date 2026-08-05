<script lang="ts">
  import { onMount } from 'svelte';
  import type Phaser from 'phaser';
  import { AMMO } from '$lib/domain/combat';
  import { beginBoarding } from '$lib/domain/boarding';
  import { finishEncounter } from '$lib/domain/voyage';
  import type { SeaHudSnapshot, SeaScene } from '$lib/game/SeaScene';
  import { gameSession } from '$lib/stores/gameStore';
  import type { AmmoType, GameState, Ship } from '$lib/domain/types';

  let { game } = $props<{ game: GameState }>();
  let host = $state<HTMLElement>();
  let phaser = $state<Phaser.Game | null>(null);
  let snapshot = $state<SeaHudSnapshot | null>(null);
  let outcome = $state<'victory' | 'defeat' | null>(null);
  let defeatedEnemy = $state<Ship | null>(null);

  const ammoTypes: AmmoType[] = ['round-shot', 'chain-shot', 'grape-shot', 'incendiary', 'piercing'];

  function scene(): SeaScene | undefined {
    return phaser?.scene.getScene('sea') as SeaScene | undefined;
  }

  function updateShip(updated: Ship): void {
    gameSession.updateGame((state) => ({ ...state, ships: state.ships.map((ship) => ship.id === updated.id ? updated : ship) }));
  }

  function board(player: Ship, enemy: Ship): void {
    gameSession.updateGame((state) => ({
      ...state,
      ships: state.ships.map((ship) => ship.id === player.id ? player : ship),
      boarding: beginBoarding(player, enemy, Math.max(6, Math.floor(player.crew * .72)), state.captain.trait),
      screen: 'boarding',
      previousScreen: 'sailing'
    }));
  }

  onMount(() => {
    if (!host) return;
    let disposed = false;
    void import('$lib/game/SeaGame').then(({ createSeaGame }) => {
      if (disposed || !host) return;
      phaser = createSeaGame(host, {
        getState: () => game,
        onSnapshot: (value) => (snapshot = value),
        onPlayerChanged: updateShip,
        onEnemyChanged: (enemy) => gameSession.updateGame((state) => ({ ...state, voyage: { ...state.voyage, currentEncounter: state.voyage.currentEncounter ? { ...state.voyage.currentEncounter, enemyShip: enemy } : undefined } })),
        onCombatEnd: (result, player, enemy) => { updateShip(player); outcome = result; defeatedEnemy = enemy; },
        onBoard: board,
        onOpenMap: () => gameSession.setScreen('world-map')
      });
    });
    return () => { disposed = true; phaser?.destroy(true); phaser = null; };
  });

  function resolveResult(): void {
    if (!outcome || !defeatedEnemy) return;
    gameSession.updateGame((state) => {
      const next = finishEncounter(state, outcome, defeatedEnemy!, outcome === 'victory' ? { timber: 8, iron: 3 } : {});
      return { ...next, screen: outcome === 'victory' ? 'world-map' : 'haven', voyage: { ...next.voyage, active: false } };
    }, true);
  }
</script>

<section class="sea-screen">
  <div class="phaser-host" bind:this={host}></div>
  <div class="sea-vignette"></div>
  {#if snapshot}
    <div class="combat-hud">
      <div class="hud-top">
        <div class="ship-hud">
          <div class="hud-name"><strong>{snapshot.player.name}</strong><span class="tag">{snapshot.player.class}</span></div>
          <div class="hud-bars">
            <div class="hud-bar"><span>선체</span><div class="meter"><span style={`--value:${snapshot.player.hull / snapshot.player.stats.hullMax * 100}%;--meter-color:#78a08f`}></span></div><b>{Math.ceil(snapshot.player.hull)}</b></div>
            <div class="hud-bar"><span>돛</span><div class="meter"><span style={`--value:${snapshot.player.sails / snapshot.player.stats.sailMax * 100}%;--meter-color:#c4b075`}></span></div><b>{Math.ceil(snapshot.player.sails)}</b></div>
            <div class="hud-bar"><span>선원</span><div class="meter"><span style={`--value:${snapshot.player.crew / snapshot.player.stats.crewMax * 100}%;--meter-color:#a56c55`}></span></div><b>{snapshot.player.crew}</b></div>
          </div>
        </div>
        <div class="hud-center">
          <div class="compass"><span class="compass-needle" style={`--wind-angle:${snapshot.windDirection}rad`}>➤</span></div>
          <div class="speed-readout"><small class="eyebrow">KNOTS</small><b>{snapshot.speed.toFixed(1)}</b><small>돛 {Math.round(snapshot.sailSetting * 100)}%</small></div>
        </div>
        {#if snapshot.enemy}
          <div class="ship-hud enemy">
            <div class="hud-name"><strong>{snapshot.enemy.name}</strong><span class="tag">{Math.round(snapshot.distance)}m</span></div>
            <div class="hud-bars">
              <div class="hud-bar"><span>선체</span><div class="meter"><span style={`--value:${snapshot.enemy.hull / snapshot.enemy.stats.hullMax * 100}%;--meter-color:#b24e42`}></span></div><b>{Math.ceil(snapshot.enemy.hull)}</b></div>
              <div class="hud-bar"><span>돛</span><div class="meter"><span style={`--value:${snapshot.enemy.sails / snapshot.enemy.stats.sailMax * 100}%;--meter-color:#a87c54`}></span></div><b>{Math.ceil(snapshot.enemy.sails)}</b></div>
              <div class="hud-bar"><span>선원</span><div class="meter"><span style={`--value:${snapshot.enemy.crew / snapshot.enemy.stats.crewMax * 100}%;--meter-color:#994b47`}></span></div><b>{snapshot.enemy.crew}</b></div>
            </div>
          </div>
        {/if}
      </div>

      <div class="hud-bottom">
        <div class="ammo-rack">
          {#each ammoTypes as ammo, index}<button class:selected={snapshot.selectedAmmo === ammo} class="ammo-button" onclick={() => scene()?.selectAmmo(ammo)}><b>{index + 1}</b><small>{AMMO[ammo].name}</small></button>{/each}
        </div>
        <div class="combat-message">{snapshot.message}</div>
        <div class="fire-controls">
          <button class:selected={snapshot.selectedSide === 'port'} class="btn small" onclick={() => scene()?.selectBroadside('port')}>Q · 좌현<div class="reload-line"><span style={`--reload:${Math.max(0, 100 - snapshot.portReload / 7 * 100)}%`}></span></div></button>
          <button class:selected={snapshot.selectedSide === 'starboard'} class="btn small" onclick={() => scene()?.selectBroadside('starboard')}>E · 우현<div class="reload-line"><span style={`--reload:${Math.max(0, 100 - snapshot.starboardReload / 7 * 100)}%`}></span></div></button>
          <button class="btn primary fire" onclick={() => scene()?.fireSelected()}>SPACE · 포격</button>
        </div>
      </div>
      {#if snapshot.canBoard}<div class="boarding-prompt"><strong>승선 거리 확보</strong><p class="muted">속도를 맞추고 갈고리를 던지십시오.</p><button class="btn primary" onclick={() => scene()?.attemptBoard()}>F · 승선 작전</button></div>{/if}
    </div>
  {/if}

  {#if outcome}
    <div class="modal-backdrop">
      <div class="modal panel" style="text-align:center">
        <span class="eyebrow">{outcome === 'victory' ? 'ENEMY VESSEL DESTROYED' : 'THE SEA CLAIMS ITS DUE'}</span>
        <h2 style="font-size:2.6rem">{outcome === 'victory' ? '바다가 조용해졌다' : '전투에서 패배했다'}</h2>
        <p class="muted">{outcome === 'victory' ? `${defeatedEnemy?.name}의 잔해에서 쓸 만한 자재를 건졌습니다. 다음에는 선체를 약화시킨 뒤 승선해 더 많은 전리품과 함선을 빼앗을 수 있습니다.` : '살아남은 선원들이 파손된 함선을 끌고 은신처로 후퇴합니다.'}</p>
        <button class="btn primary" onclick={resolveResult}>{outcome === 'victory' ? '해도로 돌아가기' : '본거지에서 회복'}</button>
      </div>
    </div>
  {/if}
</section>
