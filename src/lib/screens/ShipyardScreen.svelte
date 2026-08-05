<script lang="ts">
  import { SHIP_CLASSES } from '$lib/domain/catalog';
  import { gameSession } from '$lib/stores/gameStore';
  import type { GameState, ShipUpgrades } from '$lib/domain/types';

  let { game } = $props<{ game: GameState }>();
  let ship = $derived(game.ships.find((item) => item.id === game.activeShipId) ?? game.ships[0]);
  const upgrades: { id: keyof ShipUpgrades; name: string; detail: string; gold: number; timber: number; iron: number }[] = [
    { id: 'hull', name: '강화 선체', detail: '최대 선체 +12%', gold: 380, timber: 24, iron: 8 },
    { id: 'sails', name: '라틴 돛', detail: '최고 속도 +6%', gold: 340, timber: 8, iron: 0 },
    { id: 'rudder', name: '평형 조타', detail: '선회력 +8%', gold: 320, timber: 12, iron: 4 },
    { id: 'cannons', name: '황동 포가', detail: '대포 슬롯 +2', gold: 520, timber: 10, iron: 18 },
    { id: 'hold', name: '확장 화물칸', detail: '적재량 +18%', gold: 290, timber: 28, iron: 5 },
    { id: 'quarters', name: '해먹 갑판', detail: '선원 정원 +10%', gold: 270, timber: 18, iron: 2 }
  ];

  function repair(): void {
    gameSession.updateGame((state) => {
      const active = state.ships.find((item) => item.id === state.activeShipId)!;
      const cost = Math.ceil((active.stats.hullMax - active.hull) * 1.4 + (active.stats.sailMax - active.sails) * .8);
      const timber = Math.ceil((active.stats.hullMax - active.hull) / 18);
      if (state.resources.gold < cost || state.resources.timber < timber) return state;
      return { ...state, resources: { ...state.resources, gold: state.resources.gold - cost, timber: state.resources.timber - timber }, ships: state.ships.map((item) => item.id === active.id ? { ...active, hull: active.stats.hullMax, sails: active.stats.sailMax, fire: 0, flooding: 0, rudderCondition: 100, cannonCondition: 100 } : item) };
    }, true);
  }

  function upgrade(id: keyof ShipUpgrades): void {
    const definition = upgrades.find((item) => item.id === id)!;
    gameSession.updateGame((state) => {
      const active = state.ships.find((item) => item.id === state.activeShipId)!;
      const level = active.upgrades[id];
      const scale = 1 + level * .65;
      const cost = { gold: Math.ceil(definition.gold * scale), timber: Math.ceil(definition.timber * scale), iron: Math.ceil(definition.iron * scale) };
      if (state.resources.gold < cost.gold || state.resources.timber < cost.timber || state.resources.iron < cost.iron || level >= 5) return state;
      const stats = { ...active.stats };
      if (id === 'hull') stats.hullMax = Math.round(stats.hullMax * 1.12);
      if (id === 'sails') stats.speedMax *= 1.06;
      if (id === 'rudder') stats.turnRate *= 1.08;
      if (id === 'cannons') stats.cannonSlots += 2;
      if (id === 'hold') stats.cargoMax = Math.round(stats.cargoMax * 1.18);
      if (id === 'quarters') stats.crewMax = Math.round(stats.crewMax * 1.1);
      return { ...state, resources: { ...state.resources, gold: state.resources.gold - cost.gold, timber: state.resources.timber - cost.timber, iron: state.resources.iron - cost.iron }, ships: state.ships.map((item) => item.id === active.id ? { ...active, stats, hull: id === 'hull' ? stats.hullMax : active.hull, upgrades: { ...active.upgrades, [id]: level + 1 } } : item) };
    }, true);
  }
</script>

<section class="management-screen">
  <header class="management-header"><div><span class="eyebrow">SHIPWRIGHT'S LEDGER</span><h1>함선과 함대</h1><p class="muted">나포한 선체를 개조하고 기함을 다음 사냥에 맞추십시오.</p></div><span class="tag">보유 함선 {game.ships.length}</span></header>
  <div class="management-grid">
    <article class="panel span-5">
      <span class="eyebrow">ACTIVE FLAGSHIP · {SHIP_CLASSES[ship.class].name}</span><h2 style="font-size:2.4rem">{ship.name}</h2><p class="muted">{SHIP_CLASSES[ship.class].description}</p>
      <div class="stat-grid">
        <div class="mini-stat"><small>선체</small><b>{Math.round(ship.hull)} / {ship.stats.hullMax}</b><div class="meter"><span style={`--value:${ship.hull / ship.stats.hullMax * 100}%`}></span></div></div>
        <div class="mini-stat"><small>돛</small><b>{Math.round(ship.sails)} / {ship.stats.sailMax}</b><div class="meter"><span style={`--value:${ship.sails / ship.stats.sailMax * 100}%;--meter-color:#b6a56d`}></span></div></div>
        <div class="mini-stat"><small>속력</small><b>{ship.stats.speedMax.toFixed(1)} kn</b></div><div class="mini-stat"><small>대포</small><b>{ship.stats.cannonSlots}문</b></div><div class="mini-stat"><small>적재</small><b>{Math.round(ship.cargoWeight)} / {ship.stats.cargoMax}</b></div><div class="mini-stat"><small>선원</small><b>{ship.crew} / {ship.stats.crewMax}</b></div>
      </div>
      <button class="btn primary wide" style="margin-top:1rem" onclick={repair} disabled={ship.hull === ship.stats.hullMax && ship.sails === ship.stats.sailMax}>전면 수리</button>
    </article>
    <article class="panel span-7"><div class="panel-title"><div><span class="eyebrow">REFIT OPTIONS</span><h2>기함 개조</h2></div><span class="tag">조선소 {game.haven.facilities.shipyard?.level ?? 0}단계</span></div><div class="resource-list">{#each upgrades as item}<div class="resource-row"><span><strong>{item.name} · {ship.upgrades[item.id]}단계</strong><small style="display:block">{item.detail}</small></span><div class="costs"><span class="cost">● {Math.ceil(item.gold * (1 + ship.upgrades[item.id] * .65))}</span><span class="cost">▰ {Math.ceil(item.timber * (1 + ship.upgrades[item.id] * .65))}</span><span class="cost">◆ {Math.ceil(item.iron * (1 + ship.upgrades[item.id] * .65))}</span></div><button class="btn small" onclick={() => upgrade(item.id)} disabled={ship.upgrades[item.id] >= 5}>개조</button></div>{/each}</div></article>
    <article class="panel span-12"><div class="panel-title"><div><span class="eyebrow">FLEET</span><h2>정박 함선</h2></div></div><div class="resource-list">{#each game.ships as vessel}<div class="resource-row"><span><strong>{vessel.name}</strong><small> · {SHIP_CLASSES[vessel.class].name} · 선원 {vessel.crew}</small></span><span class="tag">{vessel.isFlagship ? '기함' : vessel.isCaptured ? '나포선' : '함대'}</span><button class="btn small" disabled={vessel.isFlagship} onclick={() => gameSession.updateGame((state) => ({ ...state, activeShipId: vessel.id, ships: state.ships.map((item) => ({ ...item, isFlagship: item.id === vessel.id })) }), true)}>기함 지정</button></div>{/each}</div></article>
  </div>
</section>
