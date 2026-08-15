<script lang="ts">
  import { onMount } from 'svelte';
  import type Phaser from 'phaser';
  import { AMMO } from '$lib/domain/combat';
  import { beginBoarding } from '$lib/domain/boarding';
  import { finishEncounter, recoverEncounterLoot } from '$lib/domain/voyage';
  import type { SeaHudSnapshot, SeaScene } from '$lib/game/SeaScene';
  import { gameSession } from '$lib/stores/gameStore';
  import { soundEngine } from '$lib/audio/SoundEngine';
  import type { AmmoType, GameSettings, GameState, Ship } from '$lib/domain/types';

  let { game, settings } = $props<{ game: GameState; settings: GameSettings }>();
  let host = $state<HTMLElement>();
  let phaser = $state<Phaser.Game | null>(null);
  let snapshot = $state<SeaHudSnapshot | null>(null);
  let outcome = $state<'victory' | 'defeat' | null>(null);
  let defeatedEnemy = $state<Ship | null>(null);

  const ammoTypes: AmmoType[] = ['round-shot', 'chain-shot', 'grape-shot', 'incendiary', 'piercing'];

  type ConditionTone = 'stable' | 'warning' | 'danger';

  function shipConditions(ship: Ship): { label: string; tone: ConditionTone }[] {
    const conditions: { label: string; tone: ConditionTone }[] = [];
    if (ship.fire > 1) conditions.push({ label: `화재 ${Math.ceil(ship.fire)}%`, tone: ship.fire >= 45 ? 'danger' : 'warning' });
    if (ship.flooding > 1) conditions.push({ label: `침수 ${Math.ceil(ship.flooding)}%`, tone: ship.flooding >= 45 ? 'danger' : 'warning' });
    if (ship.hull / Math.max(1, ship.stats.hullMax) <= .35) conditions.push({ label: '선체 위기', tone: 'danger' });
    if (ship.sails / Math.max(1, ship.stats.sailMax) <= .35) conditions.push({ label: '돛 파손', tone: 'warning' });
    if (ship.rudderCondition < 60) conditions.push({ label: `조타 ${Math.ceil(ship.rudderCondition)}%`, tone: ship.rudderCondition < 30 ? 'danger' : 'warning' });
    if (ship.cannonCondition < 60) conditions.push({ label: `포대 ${Math.ceil(ship.cannonCondition)}%`, tone: ship.cannonCondition < 30 ? 'danger' : 'warning' });
    if (ship.morale < 35) conditions.push({ label: '사기 저하', tone: 'warning' });
    return conditions.length ? conditions : [{ label: '전투 태세 정상', tone: 'stable' }];
  }

  function selectedReload(value: SeaHudSnapshot): number {
    if (value.selectedSide === 'port') return value.portReload;
    if (value.selectedSide === 'starboard') return value.starboardReload;
    if (value.selectedSide === 'bow') return value.bowReload;
    return value.sternReload;
  }

  function hasAmmo(ship: Ship, ammo: AmmoType): boolean {
    const cost = AMMO[ammo].cost;
    return (ship.cargo.cannonballs ?? 0) >= cost.cannonballs && (ship.cargo.powder ?? 0) >= cost.powder;
  }

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
        getSettings: () => settings,
        onSnapshot: (value) => (snapshot = value),
        onPlayerChanged: updateShip,
        onEnemyChanged: (enemy) => gameSession.updateGame((state) => ({ ...state, voyage: { ...state.voyage, currentEncounter: state.voyage.currentEncounter ? { ...state.voyage.currentEncounter, enemyShip: enemy } : undefined } })),
        onCombatEnd: (result, player, enemy) => { updateShip(player); outcome = result; defeatedEnemy = enemy; },
        onBoard: board,
        onOpenMap: () => gameSession.setScreen('world-map'),
        onSound: (sound) => soundEngine.play(sound)
      });
    });
    return () => { disposed = true; phaser?.destroy(true); phaser = null; };
  });

  function resolveResult(): void {
    if (!outcome || !defeatedEnemy) return;
    const finalOutcome = outcome;
    const enemy = defeatedEnemy;
    gameSession.updateGame((state) => {
      const recovery = recoverEncounterLoot(state, finalOutcome === 'victory' ? { timber: 8, iron: 3 } : {});
      const next = finishEncounter(recovery.state, finalOutcome, enemy, recovery.recovered);
      return { ...next, screen: finalOutcome === 'victory' ? 'world-map' : 'haven', voyage: { ...next.voyage, active: false } };
    }, true);
  }
</script>

<section class="sea-screen" data-testid="sea-screen" aria-label="해상 전투">
  <div class="phaser-host" data-testid="naval-canvas-host" aria-label="함선 항해 전술 화면" bind:this={host}></div>
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
          <div class="ship-statuses" aria-label="아군 함선 상태">
            {#each shipConditions(snapshot.player) as condition}<span class:stable={condition.tone === 'stable'} class:warning={condition.tone === 'warning'} class:danger={condition.tone === 'danger'}>{condition.label}</span>{/each}
          </div>
        </div>
        <div class="hud-center">
          <div class="compass" aria-label={`풍향 ${Math.round(snapshot.windDirection * 180 / Math.PI)}도`}><span class="compass-mark north">N</span><span class="compass-mark east">E</span><span class="compass-mark south">S</span><span class="compass-mark west">W</span><span class="compass-needle" style={`--wind-angle:${snapshot.windDirection}rad`}>➤</span></div>
          <div class="speed-readout"><small class="eyebrow">KNOTS</small><b>{snapshot.speed.toFixed(1)}</b><small>최대 {snapshot.maxSpeed.toFixed(1)}</small><small>돛 {Math.round(snapshot.sailSetting * 100)}% · 풍속 {snapshot.windSpeed.toFixed(1)}</small></div>
        </div>
        {#if snapshot.enemy}
          <div class="ship-hud enemy">
            <div class="hud-name"><strong>{snapshot.enemy.name}</strong><span class="tag">{Math.round(snapshot.distance)}m</span></div>
            <div class="hud-bars">
              <div class="hud-bar"><span>선체</span><div class="meter"><span style={`--value:${snapshot.enemy.hull / snapshot.enemy.stats.hullMax * 100}%;--meter-color:#b24e42`}></span></div><b>{Math.ceil(snapshot.enemy.hull)}</b></div>
              <div class="hud-bar"><span>돛</span><div class="meter"><span style={`--value:${snapshot.enemy.sails / snapshot.enemy.stats.sailMax * 100}%;--meter-color:#a87c54`}></span></div><b>{Math.ceil(snapshot.enemy.sails)}</b></div>
              <div class="hud-bar"><span>선원</span><div class="meter"><span style={`--value:${snapshot.enemy.crew / snapshot.enemy.stats.crewMax * 100}%;--meter-color:#994b47`}></span></div><b>{snapshot.enemy.crew}</b></div>
            </div>
            <div class="ship-statuses enemy-statuses" aria-label="적 함선 상태">
              {#each shipConditions(snapshot.enemy) as condition}<span class:stable={condition.tone === 'stable'} class:warning={condition.tone === 'warning'} class:danger={condition.tone === 'danger'}>{condition.label}</span>{/each}
            </div>
          </div>
        {/if}
      </div>

      <div class="hud-bottom">
        <div class="ammo-panel">
          <div class="ammo-stock"><span>포탄 <b>{snapshot.player.cargo.cannonballs ?? 0}</b></span><span>화약 <b>{snapshot.player.cargo.powder ?? 0}</b></span></div>
          <div class="ammo-rack" aria-label="탄종 선택">
            {#each ammoTypes as ammo, index}
              <button
                class:selected={snapshot.selectedAmmo === ammo}
                class="ammo-button"
                onclick={() => scene()?.selectAmmo(ammo)}
                disabled={!hasAmmo(snapshot.player, ammo)}
                aria-pressed={snapshot.selectedAmmo === ammo}
                aria-label={`${index + 1}번 ${AMMO[ammo].name}, 포탄 ${AMMO[ammo].cost.cannonballs}, 화약 ${AMMO[ammo].cost.powder}`}
              ><b>{index + 1}</b><small>{AMMO[ammo].name}</small><em>{AMMO[ammo].cost.cannonballs}/{AMMO[ammo].cost.powder}</em></button>
            {/each}
          </div>
        </div>
        <div class="combat-message" role="status" aria-live="polite">{snapshot.message}</div>
        <div class="fire-controls">
          <button class:selected={snapshot.selectedSide === 'port'} class="btn small" onclick={() => scene()?.selectBroadside('port')} aria-pressed={snapshot.selectedSide === 'port'}>Q · 좌현 <small>{snapshot.portReload > 0 ? `${snapshot.portReload.toFixed(1)}초` : '준비'}</small><div class="reload-line"><span style={`--reload:${Math.max(0, 100 - snapshot.portReload / 7 * 100)}%`}></span></div></button>
          <button class:selected={snapshot.selectedSide === 'starboard'} class="btn small" onclick={() => scene()?.selectBroadside('starboard')} aria-pressed={snapshot.selectedSide === 'starboard'}>E · 우현 <small>{snapshot.starboardReload > 0 ? `${snapshot.starboardReload.toFixed(1)}초` : '준비'}</small><div class="reload-line"><span style={`--reload:${Math.max(0, 100 - snapshot.starboardReload / 7 * 100)}%`}></span></div></button>
          <button class:selected={snapshot.selectedSide === 'bow'} class="btn small" onclick={() => scene()?.selectBroadside('bow')} aria-pressed={snapshot.selectedSide === 'bow'}>▲ · 선수포 <small>{snapshot.bowReload > 0 ? `${snapshot.bowReload.toFixed(1)}초` : '준비'}</small><div class="reload-line"><span style={`--reload:${Math.max(0, 100 - snapshot.bowReload / 7 * 100)}%`}></span></div></button>
          <button class:selected={snapshot.selectedSide === 'stern'} class="btn small" onclick={() => scene()?.selectBroadside('stern')} aria-pressed={snapshot.selectedSide === 'stern'}>▼ · 선미포 <small>{snapshot.sternReload > 0 ? `${snapshot.sternReload.toFixed(1)}초` : '준비'}</small><div class="reload-line"><span style={`--reload:${Math.max(0, 100 - snapshot.sternReload / 7 * 100)}%`}></span></div></button>
          <button
            class="btn primary fire"
            class:ready={selectedReload(snapshot) <= 0 && hasAmmo(snapshot.player, snapshot.selectedAmmo)}
            class:reloading={selectedReload(snapshot) > 0}
            onclick={() => scene()?.fireSelected()}
            disabled={selectedReload(snapshot) > 0 || !hasAmmo(snapshot.player, snapshot.selectedAmmo)}
          ><span>{selectedReload(snapshot) > 0 ? '재장전 중' : hasAmmo(snapshot.player, snapshot.selectedAmmo) ? 'SPACE · 포격' : '탄약 부족'}</span><small>{selectedReload(snapshot) > 0 ? `${selectedReload(snapshot).toFixed(1)}초` : AMMO[snapshot.selectedAmmo].name}</small></button>
        </div>
      </div>
      {#if snapshot.canBoard}<div class="boarding-prompt"><strong>승선 거리 확보</strong><p class="muted">속도를 맞추고 갈고리를 던지십시오.</p><button class="btn primary" onclick={() => scene()?.attemptBoard()}>F · 승선 작전</button></div>{/if}
      <div class="mobile-helm" aria-label="터치 항해 조작">
        <div><button aria-label="좌현 조타" onpointerdown={() => scene()?.setHelm(-1)} onpointerup={() => scene()?.setHelm(0)} onpointercancel={() => scene()?.setHelm(0)} onpointerleave={() => scene()?.setHelm(0)}>◀</button><button aria-label="우현 조타" onpointerdown={() => scene()?.setHelm(1)} onpointerup={() => scene()?.setHelm(0)} onpointercancel={() => scene()?.setHelm(0)} onpointerleave={() => scene()?.setHelm(0)}>▶</button></div>
        <div><button aria-label="돛 펼치기" onpointerdown={() => scene()?.setSailControl(1)} onpointerup={() => scene()?.setSailControl(0)} onpointercancel={() => scene()?.setSailControl(0)} onpointerleave={() => scene()?.setSailControl(0)}>▲</button><button aria-label="돛 접기" onpointerdown={() => scene()?.setSailControl(-1)} onpointerup={() => scene()?.setSailControl(0)} onpointercancel={() => scene()?.setSailControl(0)} onpointerleave={() => scene()?.setSailControl(0)}>▼</button></div>
      </div>
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
