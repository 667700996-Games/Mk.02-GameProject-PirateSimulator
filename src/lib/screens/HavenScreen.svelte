<script lang="ts">
  import { FACILITIES, RESOURCE_META } from '$lib/domain/catalog';
  import { checkFacilityBuild, buildFacility, HAVEN_TIERS } from '$lib/domain/haven';
  import { gameSession } from '$lib/stores/gameStore';
  import type { FacilityId, GameScreen, GameState, ResourceId, Ship } from '$lib/domain/types';

  let { game, navigate } = $props<{ game: GameState; navigate: (screen: GameScreen) => void }>();
  let selectedFacility = $state<FacilityId>('shipyard');
  let tier = $derived(HAVEN_TIERS[game.haven.tier - 1]);
  let selectedDefinition = $derived(FACILITIES[selectedFacility]);
  let buildCheck = $derived(checkFacilityBuild(game, selectedFacility));
  let ship = $derived(game.ships.find((item: Ship) => item.id === game.activeShipId) ?? game.ships[0]);

  function construct(): void {
    if (!buildCheck.allowed) return;
    gameSession.updateGame((state) => buildFacility(state, selectedFacility), true);
    gameSession.addToast('success', `${selectedDefinition.name} 건설 시작`, '배정된 노동자들이 자재를 옮기기 시작했습니다.');
  }
</script>

<section class="haven-screen" style={`--haven-tier:${game.haven.tier}`}>
  <div class="haven-backdrop"></div>
  <div class="haven-tier-banner">
    <span class="eyebrow">HAVEN TIER {game.haven.tier} · {tier.name}</span>
    <h1>{game.haven.name}</h1>
    <p>{game.haven.tier < 3 ? '파도와 절벽에 가려진 작은 은신처. 아직 왕관의 눈은 이곳을 모릅니다.' : game.haven.tier < 5 ? '돛과 망치 소리가 밤새 이어지는 해적 항구.' : '대포와 성벽이 검은 깃발 아래 바다를 지배합니다.'}</p>
  </div>

  <div class="haven-dashboard">
    <article class="panel">
      <div class="panel-title"><div><span class="eyebrow">SETTLEMENT</span><h3>본거지 운영</h3></div><span class="tag">인구 {game.haven.population}</span></div>
      <div class="stat-grid">
        <div class="mini-stat"><small>식량</small><b class:danger={game.haven.food < game.haven.population}>{Math.floor(game.haven.food)}</b><div class="meter"><span style={`--value:${Math.min(100, game.haven.food / Math.max(game.haven.population, 1) * 50)}%;--meter-color:#b9a35e`}></span></div></div>
        <div class="mini-stat"><small>치안</small><b>{Math.floor(game.haven.order)}</b><div class="meter"><span style={`--value:${game.haven.order}%;--meter-color:#688f82`}></span></div></div>
        <div class="mini-stat"><small>사기</small><b>{Math.floor(game.haven.morale)}</b><div class="meter"><span style={`--value:${game.haven.morale}%;--meter-color:#b87b50`}></span></div></div>
        <div class="mini-stat"><small>방어력</small><b>{Math.floor(game.haven.defense)}</b><div class="meter"><span style={`--value:${Math.min(100, game.haven.defense)}%;--meter-color:#7897a5`}></span></div></div>
        <div class="mini-stat"><small>위생</small><b>{Math.floor(game.haven.sanitation)}</b></div>
        <div class="mini-stat"><small>탐지 위험</small><b class:danger={game.haven.detectionRisk > 60}>{Math.floor(game.haven.detectionRisk)}%</b></div>
      </div>
    </article>

    <article class="panel">
      <div class="panel-title">
        <div><span class="eyebrow">FACILITIES</span><h3>시설 구획</h3></div>
        <div><strong>{selectedDefinition.icon} {selectedDefinition.name}</strong><small class="muted" style="display:block">{selectedDefinition.shortDescription}</small></div>
      </div>
      <div class="facility-scroll">
        {#each Object.values(FACILITIES) as facility}
          {@const state = game.haven.facilities[facility.id]}
          <button class:locked={game.haven.tier < facility.unlockTier} class:building={!!state?.constructionEndsAt} class="facility-card" onclick={() => (selectedFacility = facility.id)}>
            <span class="icon">{facility.icon}</span><strong>{facility.name}</strong>
            <p>{facility.shortDescription}</p>
            <small>{state?.constructionEndsAt ? '건설 중' : state ? `${state.level}단계` : `본거지 ${facility.unlockTier}단계`}</small>
          </button>
        {/each}
      </div>
      <div style="display:flex;justify-content:space-between;gap:1rem;align-items:center;margin-top:.7rem">
        <div class="costs">{#each Object.entries(buildCheck.cost) as [id, amount]}<span class="cost">{RESOURCE_META[id as ResourceId].icon} {amount}</span>{/each}</div>
        <button class="btn small primary" onclick={construct} disabled={!buildCheck.allowed}>{buildCheck.allowed ? `${game.haven.facilities[selectedFacility] ? '업그레이드' : '건설'} 시작` : buildCheck.reason}</button>
      </div>
    </article>

    <article class="panel">
      <div class="panel-title"><div><span class="eyebrow">CAPTAIN'S ORDERS</span><h3>다음 명령</h3></div></div>
      <div class="haven-actions">
        <button class="btn primary" onclick={() => navigate('world-map')}>⚓ 출항 준비</button>
        <button class="btn" onclick={() => navigate('freeport')}>자유항으로 이동</button>
        <button class="btn" onclick={() => navigate('shipyard')}>함선 관리 · {ship.name}</button>
        <button class="btn" onclick={() => navigate('crew')}>선원단 점호 · {ship.crew}명</button>
      </div>
      <div class="threat-block">
        <div style="display:flex;justify-content:space-between"><small class="muted">침공 위협</small><b class:danger={game.haven.raidThreat > 45}>{Math.floor(game.haven.raidThreat)}%</b></div>
        <div class="meter"><span style={`--value:${game.haven.raidThreat}%;--meter-color:#a93f35`}></span></div>
        <p class="faint" style="font-size:.68rem;margin:.6rem 0 0">현상금과 탐지 위험이 높아지면 해군과 경쟁 해적단이 이곳을 공격합니다.</p>
      </div>
    </article>
  </div>
</section>
