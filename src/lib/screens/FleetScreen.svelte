<script lang="ts">
  import { SHIP_CLASSES, ZONES } from '$lib/domain/catalog';
  import {
    beginExpeditionCombat,
    expeditionEvent,
    estimateExpedition,
    prepareExpedition,
    resolveExpeditionCombatTurn,
    resolveExpeditionEvent,
    type ExpeditionChoice,
    type ExpeditionCombatCommand,
    type ExpeditionPurpose
  } from '$lib/settlement/expeditions';
  import { SETTLEMENT_RESOURCES } from '$lib/settlement/catalog';
  import { aggregateInventory } from '$lib/settlement/construction';
  import { gameSession } from '$lib/stores/gameStore';
  import type { FleetFormation, GameState, Mission, Officer, Ship, ZoneId } from '$lib/domain/types';
  import type { Resident, SettlementBuilding, StrategicExpedition } from '$lib/settlement/types';

  let { game } = $props<{ game: GameState }>();
  let tab = $state<'prepare' | 'active' | 'composition'>('prepare');
  let selectedShipIds = $state<string[]>([]);
  let selectedZone = $state<ZoneId>('beginners-bay');
  let initializedZone = $state(false);
  let purpose = $state<ExpeditionPurpose>('explore');
  let crewCount = $state(8);
  let expeditionName = $state('검은 수평선 원정대');
  const purposes: { id: ExpeditionPurpose; name: string; description: string }[] = [
    { id: 'explore', name: '미지 탐사', description: '섬과 항로를 발견하고 설계도를 찾습니다.' },
    { id: 'raid', name: '약탈 원정', description: '상선과 보급소를 공격해 희귀품을 확보합니다.' },
    { id: 'trade', name: '검은 교역', description: '밀수품과 부족 자원을 교환합니다.' },
    { id: 'rescue', name: '구조 작전', description: '포로와 표류자를 구해 인구와 명성을 얻습니다.' }
  ];
  const formations: { id: FleetFormation; name: string; detail: string }[] = [
    { id: 'line-ahead', name: '종렬진', detail: '항해 속도' },
    { id: 'line-abreast', name: '횡렬진', detail: '포격 집중' },
    { id: 'crescent', name: '초승달진', detail: '포위' },
    { id: 'wolf-pack', name: '늑대떼', detail: '약탈' },
    { id: 'scatter', name: '산개진', detail: '정찰' }
  ];
  let ships: Ship[] = $derived(game.ships);
  let officers: Officer[] = $derived(game.officers);
  let expeditions: StrategicExpedition[] = $derived(game.settlement.expeditions);
  let busyShips = $derived(
    new Set(
      expeditions
        .filter((expedition) => !['COMPLETED', 'LOST'].includes(expedition.state))
        .flatMap((expedition) => expedition.shipIds)
    )
  );
  let selectedShips: Ship[] = $derived(ships.filter((ship) => selectedShipIds.includes(ship.id)));
  let eligibleCrew: Resident[] = $derived(
    game.settlement.residents
      .filter(
        (resident: Resident) =>
          !['builder', 'hauler'].includes(resident.job) && resident.health > 40
      )
      .slice(0, crewCount)
  );
  let estimate = $derived(
    estimateExpedition(selectedZone, selectedShips, eligibleCrew.length, purpose)
  );
  let inventory = $derived(aggregateInventory(game.settlement));
  let hasOffice = $derived(
    game.settlement.buildings.some(
      (building: SettlementBuilding) =>
        building.definitionId === 'expedition-office' && building.state === 'ACTIVE'
    )
  );
  let matchedMission = $derived(game.missions.find((mission: Mission) => mission.status === 'active' && mission.zoneId === selectedZone && (
    purpose === 'raid' ? ['merchant-raid', 'convoy', 'cargo-theft', 'rival-hunt', 'village-raid', 'fort-assault'].includes(mission.type)
      : purpose === 'trade' ? mission.type === 'smuggling'
      : purpose === 'rescue' ? ['rescue', 'kidnap'].includes(mission.type)
      : ['treasure', 'legendary-hunt'].includes(mission.type)
  )));

  $effect(() => {
    if (initializedZone) return;
    selectedZone = game.voyage.zoneId;
    initializedZone = true;
  });

  function toggleShip(id: string): void {
    selectedShipIds = selectedShipIds.includes(id)
      ? selectedShipIds.filter((shipId) => shipId !== id)
      : [...selectedShipIds, id];
  }

  function seaworthy(ship: Ship): boolean {
    return ship.hull >= ship.stats.hullMax * 0.35 && ship.sails >= ship.stats.sailMax * 0.35;
  }

  function dispatch(): void {
    let ok = false;
    let reason = '';
    gameSession.updateGame((state) => {
      const result = prepareExpedition(state.settlement, state.ships, state.officers, {
        name: expeditionName,
        zoneId: selectedZone,
        purpose,
        shipIds: selectedShipIds,
        captainIds: state.officers.slice(0, selectedShipIds.length).map((officer) => officer.id),
        crewIds: eligibleCrew.map((resident) => resident.id),
        missionId: matchedMission?.id
      });
      ok = result.ok;
      reason = result.reason ?? '';
      return ok ? { ...state, settlement: result.state } : state;
    }, true);
    if (ok) {
      tab = 'active';
      selectedShipIds = [];
      gameSession.addToast(
        'success',
        '원정 준비 개시',
        '원정 사무소가 부두 창고에 식수, 건빵, 의약품과 탄약을 요청했습니다.'
      );
    } else gameSession.addToast('warning', '출항 불가', reason);
  }

  function resolve(expeditionId: string, choice: ExpeditionChoice): void {
    gameSession.updateGame((state) => {
      const result = resolveExpeditionEvent(state.settlement, state.ships, expeditionId, choice);
      return { ...state, settlement: result.settlement, ships: result.ships };
    }, true);
  }

  function beginCombat(expeditionId: string): void {
    let reason = '';
    gameSession.updateGame((state) => {
      const result = beginExpeditionCombat(state.settlement, state.ships, expeditionId);
      reason = result.reason ?? '';
      return result.ok ? { ...state, settlement: result.settlement, ships: result.ships } : state;
    }, true);
    if (reason) gameSession.addToast('warning', '교전 불가', reason);
  }

  function combatTurn(expeditionId: string, command: ExpeditionCombatCommand): void {
    let reason = '';
    let outcome: 'victory' | 'retreat' | 'defeat' | undefined;
    gameSession.updateGame((state) => {
      const result = resolveExpeditionCombatTurn(
        state.settlement,
        state.ships,
        expeditionId,
        command
      );
      reason = result.reason ?? '';
      outcome = result.outcome;
      return reason ? state : { ...state, settlement: result.settlement, ships: result.ships };
    }, true);
    if (reason) gameSession.addToast('warning', '명령 실행 불가', reason);
    else if (outcome)
      gameSession.addToast(
        outcome === 'victory' ? 'success' : 'warning',
        outcome === 'victory' ? '전술 해전 승리' : '함대 이탈',
        outcome === 'victory'
          ? '나포품이 원정 화물에 실렸습니다.'
          : '손상된 함대가 본거지로 귀환 중입니다.'
      );
  }
</script>

<section class="management-screen expedition-screen">
  <header class="management-header">
    <div>
      <span class="eyebrow">ARCHIPELAGO COMMAND</span>
      <h1>함대와 전략 원정</h1>
      <p class="muted">
        배를 고르는 것보다 무엇을 싣고, 누구에게 맡기고, 언제 돌아설지를 정하는 일이 중요합니다.
      </p>
    </div>
    <span class="tag"
      >항해 중 {expeditions.filter(
        (expedition) => !['COMPLETED', 'LOST'].includes(expedition.state)
      ).length} · 귀환 {expeditions.filter((expedition) => expedition.state === 'COMPLETED')
        .length}</span
    >
  </header>
  <div class="fleet-tabs">
    <button class:active={tab === 'prepare'} onclick={() => (tab = 'prepare')}>✥ 원정 준비</button
    ><button class:active={tab === 'active'} onclick={() => (tab = 'active')}>◢ 항해 상황</button
    ><button data-testid="fleet-doctrine-tab" class:active={tab === 'composition'} onclick={() => (tab = 'composition')}
      >♛ 함대 교리</button
    >
  </div>

  {#if tab === 'prepare'}
    <div class="expedition-layout">
      <article class="panel fleet-picker">
        <div class="panel-title">
          <div>
            <span class="eyebrow">SELECT VESSELS</span>
            <h2>원정 함선</h2>
          </div>
          <span class="tag">{selectedShips.length}척</span>
        </div>
        <div class="ship-cards">
          {#each ships as ship}<button
              class:selected={selectedShipIds.includes(ship.id)}
              class:busy={busyShips.has(ship.id) || !seaworthy(ship)}
              onclick={() => !busyShips.has(ship.id) && seaworthy(ship) && toggleShip(ship.id)}
              disabled={busyShips.has(ship.id) || !seaworthy(ship)}
              ><span class="ship-mark">{ship.isFlagship ? '♛' : '◢'}</span><span
                ><strong>{ship.name}</strong><small
                  >{SHIP_CLASSES[ship.class].name} · 선체 {Math.round(
                    (ship.hull / ship.stats.hullMax) * 100
                  )}% · 선원 정원 {ship.stats.crewMax}</small
                ></span
              ><b
                >{selectedShipIds.includes(ship.id)
                  ? '선택됨'
                  : busyShips.has(ship.id)
                    ? '원정 중'
                    : !seaworthy(ship)
                      ? '난파 잔해'
                      : '대기'}</b
              ></button
            >{/each}
        </div>
        <div class="field-row">
          <label>작전명<input bind:value={expeditionName} /></label><label
            >목적 해역<select bind:value={selectedZone}
              >{#each Object.values(ZONES) as zone}<option
                  value={zone.id}
                  disabled={!game.world.zones[zone.id].discovered && purpose !== 'explore'}
                  >{game.world.zones[zone.id].discovered ? zone.name : '미탐사 해역'} · 위험 {zone.difficulty}</option
                >{/each}</select
            ></label
          >
        </div>
        <div class="purpose-grid">
          {#each purposes as item}<button
              class:selected={purpose === item.id}
              onclick={() => (purpose = item.id)}
              ><strong>{item.name}</strong><small>{item.description}</small></button
            >{/each}
        </div>
        {#if matchedMission}<div class="mission-link"><span>◆ 활성 임무 연동</span><strong>{matchedMission.title}</strong><small>{matchedMission.description}</small></div>{/if}
      </article>

      <article class="panel manifest">
        <div class="panel-title">
          <div>
            <span class="eyebrow">CREW & STORES</span>
            <h2>승조원과 보급</h2>
          </div>
        </div>
        <label class="crew-slider"
          >원정 인원 <b>{crewCount}명</b><input
            type="range"
            min="1"
            max={Math.max(1, game.settlement.residents.length)}
            bind:value={crewCount}
          /><small
            >선택 함선 최소 인원 {estimate.requiredCrew}명 · 가용 전문 인원 {eligibleCrew.length}명</small
          ></label
        >
        <div class="crew-chips">
          {#each eligibleCrew.slice(0, 12) as resident}<span>{resident.name} · {resident.job}</span
            >{/each}{#if eligibleCrew.length > 12}<span>+{eligibleCrew.length - 12}명</span>{/if}
        </div>
        <h3>자동 산출 보급표</h3>
        <div class="supply-grid">
          {#each Object.entries(estimate.supplies) as [id, required]}<div
              class:missing={(inventory[id as keyof typeof inventory] ?? 0) < required}
            >
              <span>{SETTLEMENT_RESOURCES[id as keyof typeof SETTLEMENT_RESOURCES].icon}</span
              ><small>{SETTLEMENT_RESOURCES[id as keyof typeof SETTLEMENT_RESOURCES].name}</small><b
                >{Math.floor(inventory[id as keyof typeof inventory] ?? 0)} / {required}</b
              >
            </div>{/each}
        </div>
        <div class="estimate-grid">
          <span><small>예상 기간</small><b>{estimate.durationHours}시간</b></span><span
            ><small>위험도</small><b class:danger={estimate.risk > 55}
              >{Math.round(estimate.risk)}%</b
            ></span
          ><span><small>화물 공간</small><b>{estimate.cargoCapacity}</b></span><span
            ><small>장교</small><b
              >{Math.min(officers.length, selectedShips.length)} / {selectedShips.length}</b
            ></span
          >
        </div>
        {#if !hasOffice}<p class="requirement">
            원정 사무소가 없습니다. ‘군도 원정술’을 해금하고 도시의 행정 구역에 건설하십시오.
          </p>{/if}<button
          class="btn primary wide"
          onclick={dispatch}
          disabled={selectedShips.length === 0 || !hasOffice}>보급 요청과 출항 준비</button
        >
      </article>
    </div>
  {:else if tab === 'active'}
    <div class="active-expeditions">
      {#each [...expeditions].reverse() as expedition}
        <article
          class:event={expedition.state === 'EVENT'}
          class:combat={expedition.state === 'COMBAT'}
          class="panel expedition-card"
        >
          <div class="route-visual">
            <div class="route-line">
              <span style={`--progress:${expedition.routeProgress * 100}%`}></span><i
                style={`--progress:${expedition.routeProgress * 100}%`}>◢</i
              >
            </div>
            <span>검은물결 은신처</span><span>{ZONES[expedition.zoneId].name}</span>
          </div>
          <div class="expedition-title">
            <div>
              <span class="eyebrow">{expedition.state} · RISK {Math.round(expedition.risk)}%</span>
              <h2>{expedition.name}</h2>
              <p>
                {expedition.shipIds.length}척 · 선원 {expedition.crewIds.length}명 · 사기 {Math.round(
                  expedition.morale
                )}
              </p>
            </div>
            <b>{Math.round(expedition.routeProgress * 100)}%</b>
          </div>
          {#if expedition.state === 'EVENT'}<div class="event-choice">
              <span class="eyebrow">CAPTAIN'S DECISION</span>
              <h3>
                {expeditionEvent(expedition.currentEventId)?.title ?? '미지의 조우'}
              </h3>
              <p>{expedition.log.at(-1)}</p>
              <div>
                <button onclick={() => resolve(expedition.id, 'cautious')}
                  ><strong>안전 항로</strong><small>시간을 잃지만 피해를 줄인다</small></button
                ><button onclick={() => resolve(expedition.id, 'bold')}
                  ><strong>위험 돌파</strong><small>선체 피해를 감수하고 전리품을 노린다</small
                  ></button
                ><button onclick={() => resolve(expedition.id, 'parley')}
                  ><strong>거짓 깃발</strong><small>협상과 기만으로 통과한다</small></button
                >{#if expeditionEvent(expedition.currentEventId)?.kind === 'combat'}<button
                    class="combat-entry"
                    onclick={() => beginCombat(expedition.id)}
                    ><strong>전술 교전</strong><small>거리·풍향·탄약을 직접 지휘한다</small></button
                  >{/if}
              </div>
            </div>
          {:else if expedition.state === 'COMBAT' && expedition.combat}
            <div class="naval-tactics">
              <div class="combat-sea">
                <div class="combat-horizon"></div>
                <span class="player-fleet">◢ ◢</span><span class="enemy-fleet">▰</span><i
                  class="wind-arrow"
                  style={`--wind:${expedition.combat.windAngle}deg`}>➤</i
                ><b
                  >{expedition.combat.range === 'far'
                    ? '장거리'
                    : expedition.combat.range === 'broadside'
                      ? '현측 사거리'
                      : '승선 거리'}</b
                >
              </div>
              <div class="combat-bars">
                <div>
                  아군 선체 <span
                    >{Math.round(expedition.combat.playerHull)} / {expedition.combat
                      .playerHullMax}</span
                  ><i
                    ><b
                      style={`--value:${(expedition.combat.playerHull / expedition.combat.playerHullMax) * 100}%`}
                    ></b></i
                  >
                </div>
                <div>
                  적 선체 <span
                    >{Math.round(expedition.combat.enemyHull)} / {expedition.combat
                      .enemyHullMax}</span
                  ><i
                    ><b
                      class="enemy"
                      style={`--value:${(expedition.combat.enemyHull / expedition.combat.enemyHullMax) * 100}%`}
                    ></b></i
                  >
                </div>
                <div>
                  적 돛 <span>{Math.round(expedition.combat.enemySails)}%</span><i
                    ><b style={`--value:${expedition.combat.enemySails}%`}></b></i
                  >
                </div>
                <div>
                  적 사기 <span>{Math.round(expedition.combat.enemyMorale)}%</span><i
                    ><b class="morale" style={`--value:${expedition.combat.enemyMorale}%`}></b></i
                  >
                </div>
              </div>
              <div class="combat-meta">
                <span>턴 <b>{expedition.combat.turn}</b></span><span
                  >대포알 <b>{expedition.combat.ammo}</b></span
                ><span>응급 수리 <b>{expedition.combat.repairCharges}</b></span><span
                  >상대 풍각 <b>{expedition.combat.windAngle}°</b></span
                >
              </div>
              <div class="combat-commands">
                <button onclick={() => combatTurn(expedition.id, 'maneuver')}
                  ><strong>기동</strong><small>사거리 전환·회피</small></button
                ><button
                  onclick={() => combatTurn(expedition.id, 'round-shot')}
                  disabled={expedition.combat.ammo < 4}
                  ><strong>일반탄</strong><small>선체 피해 · 4발</small></button
                ><button
                  onclick={() => combatTurn(expedition.id, 'chain-shot')}
                  disabled={expedition.combat.ammo < 3}
                  ><strong>사슬탄</strong><small>돛 손상 · 3발</small></button
                ><button
                  onclick={() => combatTurn(expedition.id, 'grape-shot')}
                  disabled={expedition.combat.ammo < 3}
                  ><strong>산탄</strong><small>사기 공격 · 3발</small></button
                ><button
                  onclick={() => combatTurn(expedition.id, 'repair')}
                  disabled={expedition.combat.repairCharges <= 0}
                  ><strong>응급 수리</strong><small>포화 속 선체 복구</small></button
                ><button
                  onclick={() => combatTurn(expedition.id, 'board')}
                  disabled={expedition.combat.range !== 'boarding'}
                  ><strong>승선</strong><small>약화한 적 갑판 점령</small></button
                ><button class="retreat" onclick={() => combatTurn(expedition.id, 'retreat')}
                  ><strong>후퇴</strong><small>피해를 감수하고 귀환</small></button
                >
              </div>
              <div class="combat-log">
                {#each expedition.combat.log.slice(-4) as entry}<p>{entry}</p>{/each}
              </div>
            </div>
          {/if}
          <div class="expedition-log">
            {#each expedition.log.slice(-4) as entry}<p><span>◆</span>{entry}</p>{/each}
          </div>
          {#if Object.keys(expedition.cargo).length > 0}<div class="cargo-report">
              <strong>원정 화물</strong
              >{#each Object.entries(expedition.cargo) as [id, amount]}<span
                  >{SETTLEMENT_RESOURCES[id as keyof typeof SETTLEMENT_RESOURCES].icon}
                  {SETTLEMENT_RESOURCES[id as keyof typeof SETTLEMENT_RESOURCES].name}
                  {amount}</span
                >{/each}
            </div>{/if}
          {#if (expedition.casualties ?? 0) > 0 || (expedition.lostShipNames?.length ?? 0) > 0}<div class="loss-report">
              <strong>영구 손실</strong><span>전사·실종 {expedition.casualties ?? 0}명</span>{#each expedition.lostShipNames ?? [] as shipName}<span>{shipName} 침몰</span>{/each}
            </div>{/if}
        </article>
      {:else}<div class="panel no-expedition">
          <span>✥</span>
          <h2>수평선 너머에 아군 깃발이 없습니다</h2>
          <p>함선, 장교, 선원과 실제 보급품을 준비해 첫 원정을 편성하십시오.</p>
          <button class="btn primary" onclick={() => (tab = 'prepare')}>원정 계획 열기</button>
        </div>{/each}
    </div>
  {:else}
    <div class="composition-layout">
      <article class="panel formation-panel">
        <span class="eyebrow">FORMATION DOCTRINE</span>
        <h2>함대 진형</h2>
        <div class="formation-grid">
          {#each formations as formation}<button
              class:selected={game.fleet.formation === formation.id}
              onclick={() =>
                gameSession.updateGame(
                  (state) => ({ ...state, fleet: { ...state.fleet, formation: formation.id } }),
                  true
                )}
              ><span
                >{formation.id === 'line-ahead'
                  ? '••••'
                  : formation.id === 'line-abreast'
                    ? '····'
                    : formation.id === 'crescent'
                      ? '⌒'
                      : formation.id === 'wolf-pack'
                        ? '✣'
                        : '⁙'}</span
              ><strong>{formation.name}</strong><small>{formation.detail}</small></button
            >{/each}
        </div>
      </article>
      <article class="panel doctrine-notes">
        <span class="eyebrow">COMMAND CALCULATION</span>
        <h2>함대 능력은 합계가 아니다</h2>
        <div class="doctrine-list">
          <div>
            <b>가장 느린 함선</b>
            <p>함대 전체 항해 속도와 원정 기간을 결정합니다.</p>
          </div>
          <div>
            <b>장교와 전문 선원</b>
            <p>함포 수만큼이나 정찰, 사기와 사건 선택 결과에 중요합니다.</p>
          </div>
          <div>
            <b>보급 상태</b>
            <p>식수와 건빵이 부족하면 출항할 수 없으며 원정 중 사건으로 소모될 수 있습니다.</p>
          </div>
          <div>
            <b>진형과 후퇴 기준</b>
            <p>해전에서 표적 분담, 화력 집중과 생존 확률에 영향을 줍니다.</p>
          </div>
        </div>
      </article>
    </div>
  {/if}
</section>

<style>
  .expedition-screen {
    background:
      radial-gradient(circle at 30% 12%, #1d4a5066, transparent 37%),
      linear-gradient(145deg, #06181e, #030c10);
  }
  .fleet-tabs {
    display: flex;
    border-bottom: 1px solid var(--line);
    margin-bottom: 0.7rem;
  }
  .fleet-tabs button {
    border: 0;
    border-bottom: 2px solid transparent;
    background: #07171a;
    color: var(--ink-muted);
    padding: 0.75rem 1.2rem;
    cursor: pointer;
  }
  .fleet-tabs button.active {
    border-color: var(--brass);
    color: var(--ink);
    background: #1b302f;
  }
  .expedition-layout {
    display: grid;
    grid-template-columns: 1.2fr 0.8fr;
    gap: 0.8rem;
  }
  .expedition-layout > .panel,
  .composition-layout > .panel {
    padding: 1rem;
  }
  .ship-cards {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.4rem;
  }
  .ship-cards button {
    display: grid;
    grid-template-columns: 38px 1fr auto;
    align-items: center;
    text-align: left;
    gap: 0.5rem;
    border: 1px solid var(--line-soft);
    background: #0a2022;
    color: var(--ink);
    padding: 0.65rem;
    cursor: pointer;
  }
  .ship-cards button.selected {
    border-color: var(--brass);
    background: linear-gradient(90deg, #4a3a27, #10282a);
  }
  .ship-cards button.busy {
    opacity: 0.42;
  }
  .ship-mark {
    font-size: 1.25rem;
    color: var(--brass);
  }
  .ship-cards strong,
  .ship-cards small {
    display: block;
  }
  .ship-cards small {
    font-size: 0.55rem;
    color: var(--ink-muted);
  }
  .ship-cards button > b {
    font-size: 0.52rem;
    color: var(--brass);
  }
  .field-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    margin: 0.7rem 0;
  }
  .field-row label,
  .crew-slider {
    display: grid;
    gap: 0.35rem;
    color: var(--brass-light);
    font-size: 0.6rem;
  }
  .field-row input,
  .field-row select {
    background: #061619;
    border: 1px solid var(--line);
    color: var(--ink);
    padding: 0.6rem;
  }
  .purpose-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.35rem;
  }
  .purpose-grid button {
    border: 1px solid var(--line-soft);
    background: #07171a;
    color: var(--ink);
    padding: 0.6rem;
    text-align: left;
    cursor: pointer;
  }
  .purpose-grid button.selected {
    border-color: var(--brass);
    background: #3a3022;
  }
  .purpose-grid strong,
  .purpose-grid small {
    display: block;
  }
  .mission-link{margin-top:.7rem;padding:.7rem;border:1px solid rgba(211,174,96,.38);background:linear-gradient(90deg,rgba(117,76,35,.2),rgba(6,21,24,.5));display:grid;gap:.2rem}.mission-link span{font-size:.56rem;color:var(--brass-light);letter-spacing:.12em}.mission-link strong{font-family:'Gowun Batang',serif}.mission-link small{color:var(--ink-muted);font-size:.64rem}
  .purpose-grid small {
    font-size: 0.5rem;
    color: var(--ink-muted);
    margin-top: 0.2rem;
  }
  .crew-slider > b {
    font-size: 1.2rem;
  }
  .crew-slider small {
    color: var(--ink-faint);
  }
  .crew-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.2rem;
    margin: 0.6rem 0;
  }
  .crew-chips span {
    padding: 0.2rem 0.35rem;
    background: #122a2b;
    border: 1px solid var(--line-soft);
    font-size: 0.5rem;
  }
  .supply-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.3rem;
  }
  .supply-grid > div {
    display: grid;
    grid-template-columns: 18px 1fr;
    padding: 0.4rem;
    background: #07171a;
    border: 1px solid var(--line-soft);
  }
  .supply-grid > div > span {
    grid-row: 1/3;
    color: var(--brass);
  }
  .supply-grid small,
  .supply-grid b {
    font-size: 0.52rem;
  }
  .supply-grid .missing {
    border-color: #8e4439;
    color: #e37a69;
  }
  .estimate-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.3rem;
    margin: 0.65rem 0;
  }
  .estimate-grid span {
    padding: 0.45rem;
    background: #0b2022;
    border: 1px solid var(--line-soft);
  }
  .estimate-grid small,
  .estimate-grid b {
    display: block;
  }
  .estimate-grid small {
    font-size: 0.48rem;
    color: var(--ink-faint);
  }
  .requirement {
    padding: 0.55rem;
    border-left: 2px solid #bc654f;
    background: #321b18;
    color: #d8a897;
    font-size: 0.6rem;
  }
  .active-expeditions {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.7rem;
  }
  .expedition-card {
    padding: 1rem;
  }
  .expedition-card.event {
    border-color: #b75c47;
    box-shadow: 0 0 35px #8f382833;
  }
  .expedition-card.combat {
    grid-column: 1/-1;
    border-color: #bb6b45;
    box-shadow: 0 0 50px #8d3d2538;
  }
  .route-visual {
    display: grid;
    grid-template-columns: 1fr 1fr;
    font-size: 0.52rem;
    color: var(--ink-faint);
    margin-bottom: 0.7rem;
  }
  .route-visual > span:last-child {
    text-align: right;
  }
  .route-line {
    grid-column: 1/-1;
    position: relative;
    height: 24px;
    border-bottom: 1px dashed #6c8983;
    margin-bottom: 0.25rem;
  }
  .route-line > span {
    position: absolute;
    left: 0;
    bottom: -2px;
    width: var(--progress);
    height: 3px;
    background: var(--brass);
  }
  .route-line > i {
    position: absolute;
    left: var(--progress);
    bottom: -7px;
    color: var(--brass-light);
    font-style: normal;
    transform: translateX(-50%);
  }
  .expedition-title {
    display: flex;
    justify-content: space-between;
  }
  .expedition-title h2 {
    margin: 0.1rem 0;
  }
  .expedition-title p {
    font-size: 0.58rem;
    color: var(--ink-muted);
  }
  .expedition-title > b {
    font-size: 1.3rem;
    color: var(--brass);
  }
  .event-choice {
    padding: 0.7rem;
    margin: 0.7rem 0;
    border: 1px solid #a44d3e;
    background: linear-gradient(135deg, #3a1c19, #101e1f);
  }
  .event-choice h3 {
    font-size: 1.25rem;
    margin: 0.15rem 0;
  }
  .event-choice p {
    font-size: 0.62rem;
    color: #d5c3b4;
  }
  .event-choice > div {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.3rem;
  }
  .event-choice button {
    border: 1px solid #805144;
    background: #241c19;
    color: var(--ink);
    text-align: left;
    padding: 0.5rem;
    cursor: pointer;
  }
  .event-choice button.combat-entry {
    border-color: #c2874d;
    background: #49301f;
  }
  .event-choice strong,
  .event-choice small {
    display: block;
  }
  .event-choice small {
    font-size: 0.48rem;
    color: var(--ink-muted);
    margin-top: 0.2rem;
  }
  .naval-tactics {
    display: grid;
    grid-template-columns: 1.1fr 0.9fr;
    gap: 0.7rem;
    margin: 0.7rem 0;
    padding: 0.7rem;
    border: 1px solid #81513b;
    background: #07171c;
  }
  .combat-sea {
    grid-row: span 3;
    position: relative;
    min-height: 250px;
    overflow: hidden;
    background: linear-gradient(#8b58384f 0 26%, #163c46 27% 44%, #092733 45%);
    border: 1px solid #6f4b38;
  }
  .combat-sea::after {
    content: '';
    position: absolute;
    inset: 45% 0 0;
    background: repeating-linear-gradient(168deg, transparent 0 16px, #79aeb319 18px 20px);
  }
  .combat-horizon {
    position: absolute;
    left: 0;
    right: 0;
    top: 42%;
    height: 2px;
    background: #eeb86f55;
    box-shadow: 0 0 35px #e47f45;
  }
  .player-fleet,
  .enemy-fleet {
    position: absolute;
    z-index: 2;
    color: #d9bb79;
    filter: drop-shadow(0 8px 6px #000);
    font-size: 2.1rem;
  }
  .player-fleet {
    left: 12%;
    bottom: 18%;
  }
  .enemy-fleet {
    right: 15%;
    top: 32%;
    color: #c7644e;
  }
  .wind-arrow {
    position: absolute;
    left: 50%;
    top: 12%;
    font-style: normal;
    color: #d7c38e;
    transform: rotate(var(--wind));
    font-size: 1.5rem;
  }
  .combat-sea > b {
    position: absolute;
    bottom: 0.5rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2;
    font-size: 0.55rem;
    color: #d6c294;
  }
  .combat-bars {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.35rem;
  }
  .combat-meta {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.25rem;
  }
  .combat-meta span {
    padding: 0.4rem;
    border: 1px solid var(--line-soft);
    font-size: 0.5rem;
  }
  .combat-meta b {
    display: block;
    color: var(--brass-light);
  }
  .combat-commands {
    grid-column: 1/-1;
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 0.3rem;
  }
  .combat-commands button {
    min-height: 58px;
    border: 1px solid var(--line-soft);
    background: #10272a;
    color: var(--ink);
    text-align: left;
    padding: 0.45rem;
    cursor: pointer;
  }
  .combat-commands button.retreat {
    border-color: #8c463b;
    background: #321b19;
  }
  .combat-commands strong,
  .combat-commands small {
    display: block;
  }
  .combat-commands small {
    font-size: 0.47rem;
    color: var(--ink-muted);
    margin-top: 0.2rem;
  }
  .combat-log {
    grid-column: 1/-1;
    border-left: 2px solid #ae6e43;
    padding: 0.3rem 0.6rem;
    background: #0d2021;
  }
  .combat-log p {
    font-size: 0.52rem;
    color: var(--ink-muted);
    margin: 0.2rem;
  }
  .expedition-log {
    border-top: 1px solid var(--line-soft);
    padding-top: 0.4rem;
  }
  .expedition-log p {
    font-size: 0.55rem;
    color: var(--ink-muted);
    margin: 0.28rem;
  }
  .expedition-log span {
    color: var(--brass);
    margin-right: 0.35rem;
  }
  .cargo-report {
    display: flex;
    gap: 0.35rem;
    flex-wrap: wrap;
    margin-top: 0.5rem;
  }
  .cargo-report strong,
  .cargo-report span {
    padding: 0.25rem 0.4rem;
    border: 1px solid var(--line-soft);
    font-size: 0.52rem;
  }
  .cargo-report span {
    color: var(--brass-light);
  }
  .loss-report {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
    margin-top: 0.5rem;
    padding: 0.45rem;
    border: 1px solid #a94f42;
    background: #361815aa;
    color: #f1b0a4;
    font-size: 0.55rem;
  }
  .no-expedition {
    grid-column: 1/-1;
    padding: 3rem;
    text-align: center;
  }
  .no-expedition > span {
    font-size: 3rem;
    color: var(--brass);
  }
  .no-expedition p {
    color: var(--ink-muted);
  }
  .composition-layout {
    display: grid;
    grid-template-columns: 1.2fr 0.8fr;
    gap: 0.8rem;
  }
  .formation-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.4rem;
  }
  .formation-grid button {
    border: 1px solid var(--line-soft);
    background: #0a2022;
    color: var(--ink);
    padding: 0.7rem;
    cursor: pointer;
  }
  .formation-grid button.selected {
    border-color: var(--brass);
    background: #3a3022;
  }
  .formation-grid span,
  .formation-grid strong,
  .formation-grid small {
    display: block;
  }
  .formation-grid span {
    font-size: 1.35rem;
    color: var(--brass);
  }
  .formation-grid small {
    font-size: 0.52rem;
    color: var(--ink-muted);
  }
  .doctrine-list {
    display: grid;
    gap: 0.45rem;
  }
  .doctrine-list > div {
    padding: 0.55rem;
    border-left: 2px solid var(--brass);
    background: #0b2022;
  }
  .doctrine-list p {
    font-size: 0.58rem;
    color: var(--ink-muted);
    margin: 0.2rem 0 0;
  }
  .combat-bars > div {
    display: grid;
    grid-template-columns: 1fr auto;
    font-size: 0.55rem;
  }
  .combat-bars > div > i {
    grid-column: 1/-1;
    height: 6px;
    background: #041012;
    margin-top: 0.2rem;
  }
  .combat-bars > div > i b {
    display: block;
    width: var(--value);
    height: 100%;
    background: #5e9c82;
  }
  .combat-bars > div > i b.enemy {
    background: #b35747;
  }
  .combat-bars > div > i b.morale {
    background: #bd9454;
  }
  @media (max-width: 980px) {
    .expedition-layout,
    .composition-layout {
      grid-template-columns: 1fr;
    }
    .active-expeditions {
      grid-template-columns: 1fr;
    }
    .naval-tactics {
      grid-template-columns: 1fr;
    }
    .combat-sea {
      grid-row: auto;
    }
    .combat-commands {
      grid-template-columns: repeat(4, 1fr);
    }
  }
  @media (max-width: 650px) {
    .ship-cards,
    .purpose-grid {
      grid-template-columns: 1fr;
    }
    .field-row {
      grid-template-columns: 1fr;
    }
    .supply-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    .formation-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    .event-choice > div {
      grid-template-columns: 1fr 1fr;
    }
    .combat-meta {
      grid-template-columns: 1fr 1fr;
    }
    .combat-commands {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
