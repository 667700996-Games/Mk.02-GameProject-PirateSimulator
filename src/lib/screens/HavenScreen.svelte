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

<section class="haven-screen" style={`--haven-tier:${game.haven.tier};--growth-opacity:${.34 + game.haven.tier * .085};--ship-opacity:${.42 + game.haven.tier * .07}`}>
  <div class="haven-backdrop"></div>
  <div class="haven-evolution" aria-hidden="true">
    <div class="harbor-docks">{#each Array.from({ length: Math.min(5, 1 + Math.floor(game.haven.tier / 2)) }) as _, index}<i style={`--left:${10 + index * 18}%;--angle:${-4 + index * 2}deg`}></i>{/each}</div>
    <div class="harbor-buildings">{#each Array.from({ length: game.haven.tier * 2 }) as _, index}<i class:large={index % 4 === 0} style={`--x:${index * 9.1 + 2}%;--bottom:${(index % 3) * 4}px;--height:${24 + (index % 4) * 7}px`}></i>{/each}</div>
    <div class="harbor-ships">{#each Array.from({ length: Math.min(7, game.ships.length + game.haven.tier - 1) }) as _, index}<i style={`--left:${7 + index * 13}%;--bottom:${(index % 3) * 13}px`}><b></b></i>{/each}</div>
    {#if game.haven.tier >= 4}<div class="watch-tower left"><i></i></div><div class="watch-tower right"><i></i></div>{/if}
    {#if game.haven.tier >= 5}<div class="fort-wall"><i></i><i></i><i></i></div>{/if}
    {#if game.haven.tier >= 7}<div class="pirate-citadel"><i></i><b style={`--flag:${game.captain.flagColor}`}>{game.captain.flagMark}</b></div>{/if}
    <div class="haven-lights">{#each Array.from({ length: game.haven.tier * 5 }) as _, index}<i style={`--x:${(index * 17.3) % 96}%;--y:${(index * 23) % 85}%;--flicker:${1.1 + (index % 4) * .3}s`}></i>{/each}</div>
  </div>
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

<style>
  .haven-evolution{position:absolute;inset:0;z-index:1;pointer-events:none;overflow:hidden;filter:drop-shadow(0 8px 9px #0009)}.harbor-buildings{position:absolute;left:32%;right:8%;bottom:28%;height:19%}.harbor-buildings i{position:absolute;left:var(--x);bottom:var(--bottom);width:clamp(18px,2.6vw,44px);height:var(--height);background:linear-gradient(90deg,#171c19,#3c3227 55%,#161a17);border:1px solid #76624655;clip-path:polygon(0 24%,22% 24%,22% 10%,50% 0,78% 10%,78% 24%,100% 24%,100% 100%,0 100%);opacity:var(--growth-opacity)}.harbor-buildings i.large{width:clamp(28px,3.7vw,62px);height:clamp(46px,6vw,76px)}.harbor-docks{position:absolute;left:25%;right:4%;bottom:23%;height:11%}.harbor-docks i{position:absolute;left:var(--left);bottom:0;width:clamp(65px,11vw,180px);height:7px;background:#4d3826;transform:rotate(var(--angle));transform-origin:left;box-shadow:0 5px #071518}.harbor-ships{position:absolute;left:19%;right:8%;bottom:15%;height:14%}.harbor-ships i{position:absolute;left:var(--left);bottom:var(--bottom);width:clamp(32px,5vw,76px);height:13px;background:#352218;clip-path:polygon(0 0,100% 0,80% 100%,18% 100%);opacity:var(--ship-opacity)}.harbor-ships i::before{content:'';position:absolute;width:2px;height:35px;background:#241b16;left:47%;bottom:5px}.harbor-ships b{position:absolute;left:48%;bottom:15px;border-left:19px solid #9e8c6877;border-top:7px solid transparent;border-bottom:14px solid transparent}.watch-tower{position:absolute;bottom:28%;width:34px;height:82px;background:linear-gradient(90deg,#202421,#514434,#202421);clip-path:polygon(14% 13%,0 13%,0 0,100% 0,100% 13%,86% 13%,86% 100%,14% 100%);opacity:.9}.watch-tower.left{left:29%}.watch-tower.right{right:9%}.watch-tower i{position:absolute;left:9px;top:15px;width:16px;height:10px;background:#ef9a3b;box-shadow:0 0 22px #e36d29}.fort-wall{position:absolute;left:27%;right:5%;bottom:25%;height:26px;background:linear-gradient(#534b3e,#242a27);border-top:3px solid #736955;opacity:.86}.fort-wall i{position:relative;display:inline-block;margin:-13px 13%;width:32px;height:39px;background:#3c3c35;clip-path:polygon(0 14%,15% 14%,15% 0,35% 0,35% 14%,65% 14%,65% 0,85% 0,85% 14%,100% 14%,100% 100%,0 100%)}.pirate-citadel{position:absolute;right:22%;bottom:28%;width:115px;height:140px;background:linear-gradient(90deg,#171b1b,#504739,#181c1b);clip-path:polygon(0 22%,13% 22%,13% 10%,29% 10%,29% 20%,42% 20%,42% 0,58% 0,58% 20%,72% 20%,72% 10%,88% 10%,88% 22%,100% 22%,100% 100%,0 100%);filter:drop-shadow(0 0 20px #d8762633)}.pirate-citadel i{position:absolute;inset:45% 35% 10%;background:#ef973d;box-shadow:0 0 35px #e9762a}.pirate-citadel b{position:absolute;left:52%;top:5%;padding:6px 13px;background:var(--flag);font-size:1rem;clip-path:polygon(0 0,100% 0,84% 100%,0 75%)}.haven-lights{position:absolute;left:27%;right:4%;bottom:24%;height:22%}.haven-lights i{position:absolute;left:var(--x);bottom:var(--y);width:3px;height:3px;border-radius:50%;background:#ffb055;box-shadow:0 0 9px 3px #e9752a88;animation:haven-flicker var(--flicker) infinite alternate}.haven-lights i:nth-child(3n){background:#ffc77c}@keyframes haven-flicker{to{opacity:.48;transform:scale(.72)}}@media(max-width:760px){.haven-evolution{opacity:.72}.harbor-buildings{left:12%;right:1%}.harbor-docks{left:8%}.harbor-ships{left:2%}.fort-wall{left:9%}.watch-tower.left{left:11%}.pirate-citadel{right:8%;transform:scale(.75);transform-origin:bottom}}
</style>
