<script lang="ts">
  import { onMount } from 'svelte';
  import type Phaser from 'phaser';
  import type { SettlementScene } from '$lib/game/SettlementScene';
  import { BUILDING_LIST, BUILDINGS, RECIPES, SETTLEMENT_RESOURCES, SETTLEMENT_RESOURCE_IDS } from '$lib/settlement/catalog';
  import { aggregateInventory, beginBuildingUpgrade, buildingMaxLevel, buildingUpgradeCost, cancelBuildingWork, demolishBuilding, moveBuilding, placeBuilding, rotateBuilding, setBuildingPriority, setBuildingRecipe, toggleBuildingPause } from '$lib/settlement/construction';
  import { settlementSummary, type SettlementSummary } from '$lib/settlement/summary';
  import { gameSession } from '$lib/stores/gameStore';
  import { soundEngine } from '$lib/audio/SoundEngine';
  import type { BuildingCategory, PartialSettlementInventory, SettlementBuilding, SettlementBuildingId, SettlementOverlay, SettlementResourceId, SettlementWarning, TransportJob } from '$lib/settlement/types';
  import type { GameScreen, GameState } from '$lib/domain/types';

  let { game, navigate } = $props<{ game: GameState; navigate: (screen: GameScreen) => void }>();
  let host = $state<HTMLElement>();
  let phaser = $state<Phaser.Game | null>(null);
  let buildTool = $state<SettlementBuildingId>();
  let movingBuildingId = $state<string>();
  let selectedBuildingId = $state<string>();
  let selectedCategory = $state<BuildingCategory>('gathering');
  let hoverTile = $state<{ x: number; y: number }>();
  let rightTab = $state<'selection' | 'warnings' | 'statistics' | 'mission'>('selection');
  let buildMenuOpen = $state(true);

  const categories: { id: BuildingCategory; name: string; icon: string }[] = [
    { id: 'gathering', name: '채집', icon: '♣' }, { id: 'processing', name: '가공', icon: '⚒' }, { id: 'logistics', name: '물류', icon: '⇄' },
    { id: 'housing', name: '주거', icon: '⌂' }, { id: 'welfare', name: '복지', icon: '♨' }, { id: 'fleet', name: '함대', icon: '⚓' },
    { id: 'military', name: '방어', icon: '♜' }, { id: 'administration', name: '행정', icon: '♛' }, { id: 'infrastructure', name: '지형', icon: '⌁' }
  ];
  const overlays: { id: SettlementOverlay; name: string; icon: string }[] = [
    { id: 'none', name: '기본', icon: '◈' }, { id: 'logistics', name: '물류', icon: '⇄' }, { id: 'traffic', name: '혼잡', icon: '⌁' },
    { id: 'food', name: '식량', icon: '◒' }, { id: 'storage', name: '창고', icon: '▣' }, { id: 'construction', name: '건설', icon: '⚒' },
    { id: 'needs', name: '욕구', icon: '♨' }, { id: 'workers', name: '인력', icon: '♟' }, { id: 'fire', name: '화재', icon: '▲' },
    { id: 'ship-supply', name: '함선', icon: '⚓' }, { id: 'defense', name: '방어', icon: '✹' }
  ];
  const severityWeight = { emergency: 4, danger: 3, caution: 2, info: 1 } as const;

  let summary: SettlementSummary = $derived(settlementSummary(game.settlement));
  let inventory: PartialSettlementInventory = $derived(aggregateInventory(game.settlement));
  let selectedBuilding: SettlementBuilding | undefined = $derived(game.settlement.buildings.find((building: SettlementBuilding) => building.id === selectedBuildingId));
  let selectedDefinition = $derived(selectedBuilding ? BUILDINGS[selectedBuilding.definitionId] : undefined);
  let categoryBuildings = $derived(BUILDING_LIST.filter((building) => building.category === selectedCategory));
  let activeWarnings: SettlementWarning[] = $derived(game.settlement.warnings.filter((warning: SettlementWarning) => !warning.acknowledged).sort((a: SettlementWarning, b: SettlementWarning) => severityWeight[b.severity] - severityWeight[a.severity]));
  let activeTransports = $derived(game.settlement.transports.filter((job: TransportJob) => !['COMPLETED', 'CANCELLED'].includes(job.state)).length);
  let waitingTransports = $derived(game.settlement.transports.filter((job: TransportJob) => job.state === 'WAITING').length);
  let selectedInventoryEntries: [SettlementResourceId, number][] = $derived(selectedBuilding
    ? ([...Object.entries(selectedBuilding.inputInventory), ...Object.entries(selectedBuilding.outputInventory)] as [SettlementResourceId, number][]).filter(([, value]) => value > 0)
    : []);
  let day = $derived(Math.floor(game.settlement.simulationMinutes / 1440) + 1);
  let hour = $derived(Math.floor((game.settlement.simulationMinutes / 60) % 24));
  let elapsedHours = $derived(Math.max(1, game.settlement.simulationMinutes / 60));
  let statisticRows = $derived(SETTLEMENT_RESOURCE_IDS.map((id) => ({
    id, produced: game.settlement.statistics.produced[id] ?? 0, consumed: game.settlement.statistics.consumed[id] ?? 0,
    delivered: game.settlement.statistics.delivered[id] ?? 0
  })).filter((row) => row.produced + row.consumed + row.delivered > 0).sort((a, b) => (b.produced + b.consumed + b.delivered) - (a.produced + a.consumed + a.delivered)).slice(0, 10));

  function scene(): SettlementScene | undefined {
    return phaser?.scene.getScene('settlement') as SettlementScene | undefined;
  }

  function setTool(id?: SettlementBuildingId): void {
    buildTool = id;
    movingBuildingId = undefined;
    scene()?.setBuildTool(id);
  }

  function startPlacement(id: SettlementBuildingId): void {
    setTool(id);
    buildMenuOpen = true;
    soundEngine.play('ui');
  }

  function place(id: SettlementBuildingId, x: number, y: number, rotation: 0 | 1 | 2 | 3): void {
    let ok = false;
    let reason = '';
    let placedId: string | undefined;
    gameSession.updateGame((state) => {
      const result = placeBuilding(state.settlement, id, x, y, rotation);
      ok = result.ok;
      reason = result.reason ?? '';
      placedId = result.buildingId;
      if (!ok) return state;
      return { ...state, settlement: result.state };
    }, true);
    if (ok) {
      selectedBuildingId = placedId;
      gameSession.addToast('success', `${BUILDINGS[id]?.name} 계획 배치`, '운반자들이 난파선과 저장소에서 건설 자재를 가져옵니다.');
    } else gameSession.addToast('warning', '건설 불가', reason);
  }

  function startMoveSelected(): void {
    if (!selectedBuilding || !['PLANNED', 'PAUSED'].includes(selectedBuilding.state)) return;
    buildTool = undefined;
    movingBuildingId = selectedBuilding.id;
    scene()?.setMoveTool(selectedBuilding.id);
    gameSession.addToast('info', '시설 이동', '새 위치를 선택하십시오. ESC로 이동 명령을 취소합니다.');
  }

  function movePlaced(id: string, x: number, y: number): void {
    let reason = '';
    let ok = false;
    gameSession.updateGame((state) => {
      const result = moveBuilding(state.settlement, id, x, y);
      ok = result.ok;
      reason = result.reason ?? '';
      return ok ? { ...state, settlement: result.state } : state;
    }, true);
    movingBuildingId = undefined;
    if (!ok) gameSession.addToast('warning', '이동 불가', reason);
  }

  function upgradeSelected(): void {
    if (!selectedBuilding) return;
    let reason = '';
    gameSession.updateGame((state) => {
      const result = beginBuildingUpgrade(state.settlement, selectedBuilding!.id);
      reason = result.reason ?? '';
      return result.ok ? { ...state, settlement: result.state } : state;
    }, true);
    if (reason) gameSession.addToast('warning', '확장 불가', reason);
    else gameSession.addToast('success', '시설 확장 지시', '필요 자재가 실제 물류망을 통해 현장으로 운송됩니다.');
  }

  function cancelSelectedWork(): void {
    if (!selectedBuilding) return;
    let ok = false;
    let reason = '';
    const wasUpgrade = selectedBuilding.state === 'UPGRADING' || selectedBuilding.pausedFrom === 'UPGRADING' || !!selectedBuilding.upgradeMaterialsCommitted;
    gameSession.updateGame((state) => {
      const result = cancelBuildingWork(state.settlement, selectedBuilding!.id);
      ok = result.ok;
      reason = result.reason ?? '';
      return ok ? { ...state, settlement: result.state } : state;
    }, true);
    if (!ok) gameSession.addToast('warning', '공사 취소 불가', reason);
    else {
      if (!wasUpgrade) selectedBuildingId = undefined;
      gameSession.addToast('info', '공사 취소', wasUpgrade ? '확장을 중단하고 시설 가동 상태로 복구했습니다.' : '현장 자재를 회수하고 건설 계획을 제거했습니다.');
    }
  }

  function changePriority(priority: 1 | 2 | 3 | 4 | 5): void {
    if (!selectedBuilding) return;
    gameSession.updateGame((state) => ({ ...state, settlement: setBuildingPriority(state.settlement, selectedBuilding!.id, priority) }));
  }

  function changeRecipe(recipeId: string): void {
    if (!selectedBuilding) return;
    gameSession.updateGame((state) => ({ ...state, settlement: setBuildingRecipe(state.settlement, selectedBuilding!.id, recipeId || undefined) }));
  }

  function setSpeed(speed: 0 | 1 | 2 | 3): void {
    gameSession.updateGame((state) => ({ ...state, settlement: { ...state.settlement, speed } }));
  }

  function setOverlay(overlay: SettlementOverlay): void {
    gameSession.updateGame((state) => ({ ...state, settlement: { ...state.settlement, overlay } }));
  }

  function pauseSelected(): void {
    if (!selectedBuilding) return;
    gameSession.updateGame((state) => ({ ...state, settlement: toggleBuildingPause(state.settlement, selectedBuilding.id) }));
  }

  function rotateSelected(): void {
    if (!selectedBuilding) return;
    let reason = '';
    gameSession.updateGame((state) => {
      const result = rotateBuilding(state.settlement, selectedBuilding.id);
      reason = result.reason ?? '';
      return result.ok ? { ...state, settlement: result.state } : state;
    });
    if (reason) gameSession.addToast('warning', '회전 불가', reason);
  }

  function demolishSelected(): void {
    if (!selectedBuilding || selectedBuilding.definitionId === 'wreckage') return;
    const name = selectedDefinition?.name ?? '건물';
    gameSession.updateGame((state) => ({ ...state, settlement: demolishBuilding(state.settlement, selectedBuilding.id) }), true);
    selectedBuildingId = undefined;
    gameSession.addToast('info', `${name} 철거`, '상태에 따라 건설 자재의 40%를 회수했습니다.');
  }

  function focusWarning(buildingId?: string): void {
    if (!buildingId) return;
    selectedBuildingId = buildingId;
    rightTab = 'selection';
    scene()?.focusBuilding(buildingId);
  }

  onMount(() => {
    if (!host) return;
    let disposed = false;
    void import('$lib/game/SettlementGame').then(({ createSettlementGame }) => {
      if (disposed || !host) return;
      phaser = createSettlementGame(host, {
        getState: () => game.settlement,
        onPlace: place,
        onMoveBuilding: movePlaced,
        onSelectBuilding: (id) => { selectedBuildingId = id; rightTab = 'selection'; },
        onHoverTile: (x, y) => { hoverTile = x === undefined || y === undefined ? undefined : { x, y }; },
        onCancelTool: () => { buildTool = undefined; movingBuildingId = undefined; },
        onSound: (sound) => soundEngine.play(sound)
      });
    });
    const keydown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.matches('input,select,textarea')) return;
      if (event.code === 'Space') { event.preventDefault(); setSpeed(game.settlement.speed === 0 ? 1 : 0); }
      else if (event.code === 'Digit1') setSpeed(1);
      else if (event.code === 'Digit2') setSpeed(2);
      else if (event.code === 'Digit3') setSpeed(3);
      else if (event.code === 'KeyB') buildMenuOpen = !buildMenuOpen;
      else if (event.code === 'KeyP') { selectedCategory = 'processing'; buildMenuOpen = true; }
      else if (event.code === 'KeyL') setOverlay(game.settlement.overlay === 'logistics' ? 'none' : 'logistics');
      else if (event.code === 'KeyC') navigate('crew');
      else if (event.code === 'KeyF') navigate('fleet');
      else if (event.code === 'KeyM') navigate('world-map');
    };
    window.addEventListener('keydown', keydown);
    return () => { disposed = true; window.removeEventListener('keydown', keydown); phaser?.destroy(true); phaser = null; };
  });

  $effect(() => {
    scene()?.syncSnapshot(game.settlement);
  });
</script>

<section class="settlement-screen" data-testid="settlement-screen">
  <div class="settlement-host" bind:this={host}></div>
  <div class="city-vignette"></div>

  <div class="city-status-bar panel">
    <div class="city-identity"><span class="eyebrow">DAY {day} · {String(hour).padStart(2, '0')}:00</span><strong>{game.haven.name}</strong><small>{hoverTile ? `구역 ${hoverTile.x}:${hoverTile.y}` : '파도절벽 군도 · 정착지 시야'}</small></div>
    <div class="city-metric"><span>♟</span><b>{summary.population}</b><small>인구 / 주거 {summary.housingCapacity}</small></div>
    <div class="city-metric"><span>◉</span><b class:danger={summary.water < summary.population}>{Math.floor(summary.water)}</b><small>식수</small></div>
    <div class="city-metric"><span>◒</span><b class:danger={summary.foodDays < 2}>{summary.foodDays.toFixed(1)}일</b><small>식량 잔여</small></div>
    <div class="city-metric"><span>♨</span><b>{Math.round(summary.morale)}%</b><small>사기</small></div>
    <div class="city-metric"><span>⇄</span><b class:danger={waitingTransports > 3}>{activeTransports}</b><small>운송 중 / 대기 {waitingTransports}</small></div>
    <div class="city-metric"><span>✹</span><b>{summary.defense}</b><small>해안 방어</small></div>
    <div class="city-metric"><span>⚑</span><b class:danger={game.settlement.threat.active}>{game.settlement.threat.active ? `${game.settlement.threat.etaHours.toFixed(1)}h` : '안전'}</b><small>해군 위협</small></div>
    <div class="speed-control" aria-label="게임 속도">
      <button class:active={game.settlement.speed === 0} onclick={() => setSpeed(0)} title="일시정지">Ⅱ</button>
      {#each [1, 2, 3] as speed}<button class:active={game.settlement.speed === speed} onclick={() => setSpeed(speed as 1 | 2 | 3)}>{speed}×</button>{/each}
    </div>
  </div>

  <aside class:collapsed={!buildMenuOpen} class="build-panel panel" data-testid="build-panel">
    <button class="collapse-button" onclick={() => (buildMenuOpen = !buildMenuOpen)}>{buildMenuOpen ? '‹' : 'B'}</button>
    {#if buildMenuOpen}
      <div class="panel-title"><div><span class="eyebrow">CONSTRUCTION</span><h2>도시 건설</h2></div>{#if buildTool || movingBuildingId}<button class="btn small ghost" onclick={() => setTool()}>취소 · ESC</button>{/if}</div>
      <div class="category-tabs">
        {#each categories as category}<button class:active={selectedCategory === category.id} onclick={() => (selectedCategory = category.id)} title={category.name}><span>{category.icon}</span><small>{category.name}</small></button>{/each}
      </div>
      <div class="building-list">
        {#each categoryBuildings as definition}
          {@const locked = !!definition.unlock && !game.settlement.progression.unlocked.includes(definition.unlock)}
          <button class:selected={buildTool === definition.id} class:locked class="building-option" onclick={() => !locked && startPlacement(definition.id)} disabled={locked} data-testid={`build-${definition.id}`}>
            <span class="building-icon">{definition.icon}</span>
            <span><strong>{definition.name}</strong><small>{definition.description}</small><span class="compact-cost">{#each Object.entries(definition.constructionCost).slice(0, 4) as [id, cost]}<i class:missing={(inventory[id as keyof typeof inventory] ?? 0) < cost}>{SETTLEMENT_RESOURCES[id as keyof typeof SETTLEMENT_RESOURCES].icon}{cost}</i>{/each}</span></span>
            {#if locked}<em>발전 필요</em>{/if}
          </button>
        {/each}
      </div>
      <div class="build-help"><kbd>클릭</kbd> 배치 · <kbd>R</kbd> 회전 · <kbd>드래그</kbd> 카메라 · <kbd>휠</kbd> 확대</div>
    {/if}
  </aside>

  <aside class="city-inspector panel">
    <div class="inspector-tabs">
      <button class:active={rightTab === 'selection'} onclick={() => (rightTab = 'selection')}>선택</button>
      <button class:active={rightTab === 'warnings'} onclick={() => (rightTab = 'warnings')}>경고 <span class:urgent={activeWarnings.length > 0}>{activeWarnings.length}</span></button>
      <button class:active={rightTab === 'statistics'} onclick={() => (rightTab = 'statistics')}>통계</button>
      <button class:active={rightTab === 'mission'} onclick={() => (rightTab = 'mission')}>표류 일지</button>
    </div>
    {#if rightTab === 'selection'}
      {#if selectedBuilding && selectedDefinition}
        <div class="selection-head"><div class="selection-icon">{selectedDefinition.icon}</div><div><span class="eyebrow">{selectedDefinition.category}</span><h2>{selectedDefinition.name}</h2><small class="muted">구역 {selectedBuilding.x}:{selectedBuilding.y} · 높이 {game.settlement.island.tiles[selectedBuilding.y * game.settlement.island.width + selectedBuilding.x]?.elevation}</small></div></div>
        <div class="state-banner" class:blocked={selectedBuilding.state === 'BLOCKED'}><b>{selectedBuilding.state}</b><span>{selectedBuilding.statusReason ?? '정상 운영 중'}</span></div>
        {#if selectedBuilding.state !== 'ACTIVE'}<div class="meter large"><span style={`--value:${selectedBuilding.constructionProgress * 100}%;--meter-color:#c49b53`}></span></div>{/if}
        <div class="inspector-grid">
          <div><small>작업자</small><b>{selectedBuilding.workers.length} / {selectedDefinition.workerSlots}</b></div>
          <div><small>내구도</small><b>{Math.floor(selectedBuilding.condition)}%</b></div>
          <div><small>우선순위</small><b>{selectedBuilding.constructionPriority}</b></div>
          <div><small>레벨</small><b>{selectedBuilding.level}</b></div>
        </div>
        <div class="priority-control"><small>건설·운송 우선순위</small><div>{#each [1,2,3,4,5] as priority}<button class:active={selectedBuilding.constructionPriority === priority} onclick={() => changePriority(priority as 1|2|3|4|5)}>{priority}</button>{/each}</div></div>
        {#if selectedDefinition.recipes.length > 0}
          <label class="recipe-select">생산법<select value={selectedBuilding.recipeId ?? ''} onchange={(event) => changeRecipe(event.currentTarget.value)}><option value="">생산 중단</option>{#each selectedDefinition.recipes as recipeId}<option value={recipeId}>{RECIPES[recipeId]?.name}</option>{/each}</select></label>
        {/if}
        {#if ['lumber-camp','quarry','iron-mine','copper-mine'].includes(selectedBuilding.definitionId)}<p class="deposit-readout">천연자원 잔량 <b>{Math.floor(game.settlement.island.tiles[selectedBuilding.y * game.settlement.island.width + selectedBuilding.x]?.resourceRemaining ?? 0)}</b></p>{/if}
        <h3 class="subheading">현장 재고</h3>
        <div class="inventory-grid">
          {#each selectedInventoryEntries as [id, value]}
            <span><i>{SETTLEMENT_RESOURCES[id].icon}</i>{SETTLEMENT_RESOURCES[id].name}<b>{Math.floor(value * 10) / 10}</b></span>
          {:else}<p class="faint">운송되거나 생산된 물자가 없습니다.</p>{/each}
        </div>
        {#if selectedBuilding.state === 'ACTIVE' && selectedBuilding.level < buildingMaxLevel(selectedBuilding.definitionId)}<div class="upgrade-cost"><small>{selectedBuilding.level + 1}단계 확장</small>{#each Object.entries(buildingUpgradeCost(selectedBuilding.definitionId, selectedBuilding.level)) as [id,cost]}<span class:missing={(inventory[id as SettlementResourceId] ?? 0) < cost}>{SETTLEMENT_RESOURCES[id as SettlementResourceId].icon}{cost}</span>{/each}</div>{/if}
        <div class="inspector-actions"><button class="btn small" onclick={pauseSelected}>{selectedBuilding.paused ? '재개' : '일시정지'}</button><button class="btn small" onclick={rotateSelected} disabled={!['PLANNED', 'PAUSED'].includes(selectedBuilding.state)}>회전</button><button class="btn small" onclick={startMoveSelected} disabled={!['PLANNED', 'PAUSED'].includes(selectedBuilding.state)}>이동</button><button class="btn small" onclick={upgradeSelected} disabled={selectedBuilding.state !== 'ACTIVE' || selectedBuilding.level >= buildingMaxLevel(selectedBuilding.definitionId)}>확장</button>{#if ['PLANNED','CONSTRUCTING','UPGRADING','BLOCKED'].includes(selectedBuilding.state) || selectedBuilding.pausedFrom === 'UPGRADING'}<button class="btn small danger-button" onclick={cancelSelectedWork}>공사 취소</button>{/if}<button class="btn small danger-button" onclick={demolishSelected} disabled={selectedBuilding.definitionId === 'wreckage'}>철거</button></div>
      {:else}
        <div class="empty-selection"><span>✥</span><h2>섬을 살펴보십시오</h2><p>건물을 선택하면 작업자, 현장 재고, 생산 중단 원인과 명령이 표시됩니다.</p><div class="legend"><i class="terrain plain"></i>평지 <i class="terrain coast"></i>해안 <i class="terrain high"></i>고지대 <i class="terrain resource"></i>자원 지대</div></div>
      {/if}
    {:else if rightTab === 'warnings'}
      <div class="panel-title"><div><span class="eyebrow">WATCH REPORT</span><h2>정착지 경고</h2></div></div>
      <div class="warning-list">{#each activeWarnings as warning}<button class:emergency={warning.severity === 'emergency'} class:danger-warning={warning.severity === 'danger'} onclick={() => focusWarning(warning.buildingId)}><span>{warning.severity === 'emergency' ? '!' : warning.severity === 'danger' ? '▲' : '◆'}</span><div><strong>{warning.title}</strong><small>{warning.detail}</small></div></button>{:else}<div class="all-clear"><span>✓</span><strong>중대한 경고 없음</strong><small>망보는 자들이 섬과 수평선을 감시하고 있습니다.</small></div>{/each}</div>
    {:else if rightTab === 'statistics'}
      <div class="panel-title"><div><span class="eyebrow">FLOW LEDGER</span><h2>생산·물류 통계</h2></div></div>
      <div class="stat-summary"><span><small>완공</small><b>{game.settlement.statistics.completedBuildings}</b></span><span><small>활성 운송</small><b>{activeTransports}</b></span><span><small>생산 병목</small><b>{summary.productionBlocked}</b></span></div>
      <div class="flow-table"><header><span>상품</span><b>생산/h</b><b>소비/h</b><b>운송/h</b></header>{#each statisticRows as row}<div><span>{SETTLEMENT_RESOURCES[row.id].icon} {SETTLEMENT_RESOURCES[row.id].name}</span><b>{(row.produced / elapsedHours).toFixed(1)}</b><b>{(row.consumed / elapsedHours).toFixed(1)}</b><b>{(row.delivered / elapsedHours).toFixed(1)}</b></div>{:else}<p class="faint">첫 생산 또는 운송이 끝나면 흐름 기록이 표시됩니다.</p>{/each}</div>
      <p class="analysis-note">경고에서 병목 시설을 선택하고, 물류·창고·인력 오버레이를 겹쳐 원인을 추적하십시오.</p>
    {:else}
      <div class="mission-card"><span class="eyebrow">THE WRECKED CROWN · {game.settlement.tutorialStep + 1}/5</span><h2>{game.settlement.tutorialStep === 0 ? '첫 물 한 모금' : game.settlement.tutorialStep === 1 ? '숲을 깨우는 도끼' : game.settlement.tutorialStep === 2 ? '흩어진 짐을 한곳에' : game.settlement.tutorialStep === 3 ? '오늘 잡은 생선' : '부두를 되찾아라'}</h2><p>{game.settlement.tutorialStep === 0 ? '빗물 집수장을 평지에 배치하십시오. 자재가 난파선에서 직접 운반됩니다.' : game.settlement.tutorialStep === 1 ? '서쪽 숲 위에 벌목장을 배치하고 원목 생산을 시작하십시오.' : game.settlement.tutorialStep === 2 ? '생산지와 해안 사이 평지에 중앙 창고를 세워 물류 거리를 줄이십시오.' : game.settlement.tutorialStep === 3 ? '해안에 어업소를 세워 생존자들의 첫 식량망을 만드십시오.' : '판자, 밧줄과 도구를 생산해 폐허가 된 항만을 다시 일으키십시오.'}</p><div class="objective-progress"><span style={`--progress:${game.settlement.tutorialStep * 25}%`}></span></div><small class="muted">임무 안내는 실제 건설·생산 결과로만 진행됩니다.</small></div>
    {/if}
  </aside>

  <div class="overlay-toolbar panel">
    <span class="eyebrow">OVERLAYS</span>
    {#each overlays as overlay}<button class:active={game.settlement.overlay === overlay.id} onclick={() => setOverlay(overlay.id)} title={`${overlay.name} 오버레이`}><span>{overlay.icon}</span>{overlay.name}</button>{/each}
    <i></i>
    <button onclick={() => navigate('crew')}>♟ 주민</button><button onclick={() => navigate('fleet')}>⚓ 함대</button><button onclick={() => navigate('world-map')}>✥ 군도 지도</button>
  </div>
</section>

<style>
  .settlement-screen{height:calc(100vh - 126px);min-height:650px;position:relative;overflow:hidden;background:#061b23;isolation:isolate}.settlement-host{position:absolute;inset:0}.settlement-host :global(canvas){display:block}.city-vignette{position:absolute;inset:0;pointer-events:none;z-index:2;box-shadow:inset 0 0 150px 28px #010a0dbd;background:linear-gradient(180deg,#03111544,transparent 18% 76%,#020a0ebd)}
  .city-status-bar{position:absolute;z-index:10;left:1rem;right:1rem;top:1rem;height:66px;display:flex;align-items:stretch;padding:0;background:linear-gradient(90deg,#07191dec,#0d2528e8 55%,#071619ef);backdrop-filter:blur(12px);pointer-events:auto}.city-identity{min-width:250px;padding:.66rem 1rem;border-right:1px solid var(--line)}.city-identity strong{display:block;font-family:'Gowun Batang',serif;font-size:1.06rem}.city-identity small{color:var(--ink-faint);font-size:.6rem}.city-metric{display:grid;grid-template-columns:auto auto;grid-template-rows:1fr 1fr;column-gap:.48rem;align-items:end;padding:.68rem clamp(.55rem,1.2vw,1rem);border-right:1px solid var(--line-soft);min-width:90px}.city-metric>span{grid-row:1/3;color:var(--brass-light);align-self:center;font-size:1.1rem}.city-metric b{font-size:.85rem}.city-metric small{align-self:start;color:var(--ink-faint);font-size:.56rem;white-space:nowrap}.speed-control{margin-left:auto;display:flex;align-items:center;padding:0 .55rem;gap:.2rem}.speed-control button{width:33px;height:34px;border:1px solid var(--line-soft);background:#07171b;color:var(--ink-muted);cursor:pointer}.speed-control button.active{color:#fff1cf;border-color:var(--brass);background:#79502c}
  .build-panel{position:absolute;z-index:11;left:1rem;top:88px;bottom:76px;width:318px;padding:1rem;background:linear-gradient(145deg,#071a1ef2,#041114f5);backdrop-filter:blur(12px);transition:width .18s ease}.build-panel.collapsed{width:42px;padding:0;background:#071a1ee8}.collapse-button{position:absolute;right:-20px;top:12px;width:22px;height:48px;border:1px solid var(--line);background:#10272a;color:var(--brass-light);cursor:pointer}.build-panel h2,.city-inspector h2{font-size:1.45rem;margin:.08rem 0}.category-tabs{display:grid;grid-template-columns:repeat(5,1fr);gap:.22rem;padding-bottom:.7rem;border-bottom:1px solid var(--line-soft)}.category-tabs button{border:1px solid transparent;background:#07171a;color:var(--ink-faint);padding:.35rem .2rem;cursor:pointer}.category-tabs button span{display:block;font-size:1rem;color:var(--brass)}.category-tabs button small{font-size:.55rem}.category-tabs button.active{border-color:var(--line);background:#253b38;color:var(--ink)}.building-list{display:grid;gap:.4rem;overflow-y:auto;max-height:calc(100% - 150px);padding:.65rem .15rem .4rem 0}.building-option{position:relative;display:grid;grid-template-columns:38px 1fr;gap:.6rem;text-align:left;border:1px solid var(--line-soft);background:linear-gradient(135deg,#173034aa,#07171bd9);color:var(--ink);padding:.58rem;cursor:pointer;transition:.14s ease}.building-option:hover:not(:disabled),.building-option.selected{border-color:var(--brass);transform:translateX(2px);background:linear-gradient(135deg,#4b3d29c4,#0d2527e8)}.building-option.locked{opacity:.38}.building-option .building-icon{width:36px;height:36px;display:grid;place-items:center;border:1px solid var(--line);color:var(--brass-light);font-size:1.15rem;background:#071517}.building-option strong{font-size:.72rem;display:block}.building-option small{font-size:.57rem;color:var(--ink-muted);display:-webkit-box;-webkit-line-clamp:2;line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.35}.building-option em{position:absolute;right:.4rem;top:.3rem;font-size:.5rem;color:#df956e}.compact-cost{display:flex;gap:.28rem;margin-top:.32rem}.compact-cost i{font-style:normal;font-size:.55rem;color:#cbb579}.compact-cost i.missing{color:#e07464}.build-help{position:absolute;left:1rem;right:1rem;bottom:.55rem;color:var(--ink-faint);font-size:.58rem}.build-help kbd{border:1px solid var(--line);padding:.12rem .25rem;color:var(--brass-light);background:#030e11}
  .city-inspector{position:absolute;z-index:11;right:1rem;top:88px;width:326px;max-height:calc(100% - 164px);padding:1rem;background:linear-gradient(145deg,#071a1ef3,#041114f7);backdrop-filter:blur(12px);overflow-y:auto}.inspector-tabs{display:grid;grid-template-columns:repeat(4,1fr);margin:-1rem -1rem 1rem}.inspector-tabs button{border:0;border-right:1px solid var(--line-soft);border-bottom:1px solid var(--line);background:#071518;color:var(--ink-muted);padding:.7rem .25rem;cursor:pointer;font-size:.62rem}.inspector-tabs button.active{background:#203633;color:var(--ink);box-shadow:inset 0 -2px var(--brass)}.inspector-tabs span{display:inline-grid;place-items:center;min-width:18px;height:18px;border-radius:50%;background:#243637;font-size:.55rem}.inspector-tabs span.urgent{background:#9d4038;color:white}.selection-head{display:flex;gap:.8rem;align-items:center}.selection-icon{width:52px;height:52px;display:grid;place-items:center;border:1px solid var(--brass);background:#223b39;color:var(--brass-light);font-size:1.5rem;clip-path:polygon(7px 0,100% 0,100% calc(100% - 7px),calc(100% - 7px) 100%,0 100%,0 7px)}.state-banner{display:flex;justify-content:space-between;margin:.9rem 0 .5rem;padding:.55rem;border:1px solid #4a665f;background:#15302e;font-size:.62rem}.state-banner.blocked{border-color:#934f42;background:#3c201c}.meter.large{height:9px;margin-bottom:.8rem}.inspector-grid{display:grid;grid-template-columns:1fr 1fr;gap:.4rem;margin:.8rem 0}.inspector-grid>div{padding:.55rem;border:1px solid var(--line-soft);background:#041215}.inspector-grid small{display:block;color:var(--ink-faint);font-size:.56rem}.inspector-grid b{font-size:.85rem}.priority-control,.recipe-select,.deposit-readout,.upgrade-cost{display:flex;justify-content:space-between;align-items:center;gap:.35rem;margin:.5rem 0;padding:.45rem;background:#061518;border:1px solid var(--line-soft);font-size:.56rem}.priority-control>div{display:flex}.priority-control button{width:24px;height:22px;border:1px solid var(--line-soft);background:#102325;color:var(--ink-faint)}.priority-control button.active{background:#946238;color:white;border-color:var(--brass)}.recipe-select select{max-width:180px;background:#07171a;border:1px solid var(--line);color:var(--ink);padding:.35rem}.deposit-readout b{color:var(--brass-light)}.upgrade-cost{justify-content:flex-start;flex-wrap:wrap}.upgrade-cost small{margin-right:auto}.upgrade-cost span{color:#9ed1ae}.upgrade-cost span.missing{color:#e47b68}.subheading{font-size:.8rem;margin:.8rem 0 .45rem;border-bottom:1px solid var(--line-soft);padding-bottom:.4rem}.inventory-grid{display:grid;gap:.25rem;max-height:125px;overflow:auto}.inventory-grid span{display:grid;grid-template-columns:18px 1fr auto;align-items:center;font-size:.62rem;padding:.35rem;background:#07181b}.inventory-grid i{color:var(--brass-light);font-style:normal}.inspector-actions{display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.85rem}.stat-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:.3rem;margin-bottom:.7rem}.stat-summary span{padding:.55rem;background:#07171a;border:1px solid var(--line-soft)}.stat-summary small,.stat-summary b{display:block}.stat-summary small{font-size:.48rem;color:var(--ink-faint)}.flow-table{display:grid;gap:.18rem}.flow-table header,.flow-table>div{display:grid;grid-template-columns:1.5fr repeat(3,.55fr);gap:.25rem;align-items:center;padding:.4rem;background:#061518;font-size:.52rem}.flow-table header{color:var(--ink-faint);border-bottom:1px solid var(--line)}.flow-table b{text-align:right}.flow-table>div>span{color:var(--brass-light)}.analysis-note{font-size:.57rem;line-height:1.5;color:var(--ink-muted);border-left:2px solid var(--brass);padding:.5rem;margin-top:.7rem}.empty-selection{text-align:center;padding:1.5rem .5rem}.empty-selection>span{font-size:2.7rem;color:var(--brass)}.empty-selection p{color:var(--ink-muted);font-size:.72rem;line-height:1.6}.legend{display:flex;flex-wrap:wrap;justify-content:center;gap:.5rem;font-size:.55rem;color:var(--ink-faint)}.terrain{width:14px;height:8px;display:inline-block;transform:skewY(-25deg)}.terrain.plain{background:#3f694e}.terrain.coast{background:#82966a}.terrain.high{background:#596c48}.terrain.resource{background:#807769}.warning-list{display:grid;gap:.45rem}.warning-list button{display:grid;grid-template-columns:28px 1fr;gap:.5rem;text-align:left;border:1px solid #73553a;background:#2c241a;color:var(--ink);padding:.6rem;cursor:pointer}.warning-list button.danger-warning,.warning-list button.emergency{border-color:#a94e42;background:#3a1d1b}.warning-list button>span{font-size:1rem;color:#e78b68}.warning-list strong,.warning-list small{display:block}.warning-list small{color:var(--ink-muted);font-size:.6rem;margin-top:.2rem}.all-clear{display:grid;text-align:center;padding:2rem;gap:.5rem}.all-clear>span{font-size:2rem;color:#84b89b}.all-clear small{color:var(--ink-muted)}.mission-card p{font-size:.72rem;color:var(--ink-muted);line-height:1.6}.objective-progress{height:7px;background:#071214;border:1px solid var(--line);margin:1rem 0}.objective-progress span{display:block;width:var(--progress);height:100%;background:linear-gradient(90deg,#81502d,#d3aa5b)}
  .overlay-toolbar{position:absolute;z-index:12;left:50%;transform:translateX(-50%);bottom:.75rem;display:flex;align-items:center;gap:.18rem;padding:.38rem .5rem;background:#06171bed;backdrop-filter:blur(10px);white-space:nowrap}.overlay-toolbar>.eyebrow{padding:0 .5rem}.overlay-toolbar button{border:1px solid transparent;background:transparent;color:var(--ink-muted);padding:.42rem .58rem;cursor:pointer;font-size:.62rem}.overlay-toolbar button span{color:var(--brass);margin-right:.25rem}.overlay-toolbar button:hover,.overlay-toolbar button.active{color:var(--ink);border-color:var(--line);background:#203431}.overlay-toolbar>i{width:1px;height:25px;background:var(--line);margin:0 .3rem}
  @media(max-width:1100px){.city-status-bar{right:.5rem;left:.5rem}.city-metric:nth-of-type(n+6){display:none}.city-identity{min-width:190px}.build-panel{left:.5rem;width:280px}.city-inspector{right:.5rem;width:290px}.overlay-toolbar button{padding:.4rem}.overlay-toolbar>.eyebrow{display:none}}
  @media(max-width:760px){.settlement-screen{height:calc(100vh - 126px);min-height:620px}.city-status-bar{top:.4rem;height:58px;overflow-x:auto}.city-identity{min-width:155px;padding:.5rem}.city-identity small{display:none}.city-metric{min-width:74px;padding:.48rem}.city-metric:nth-of-type(n+5){display:none}.speed-control{position:fixed;right:.65rem;top:135px;background:#071619dd;padding:.25rem}.build-panel{top:68px;bottom:64px;width:min(290px,82vw)}.city-inspector{top:auto;left:.5rem;right:.5rem;bottom:62px;width:auto;max-height:38%;padding:.75rem}.city-inspector:has(.empty-selection){display:none}.overlay-toolbar{left:.5rem;right:.5rem;transform:none;bottom:.3rem;overflow-x:auto;justify-content:flex-start}.overlay-toolbar>i,.overlay-toolbar button:nth-last-child(-n+3){display:none}}
</style>
