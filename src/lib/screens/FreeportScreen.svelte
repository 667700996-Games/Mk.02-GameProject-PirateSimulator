<script lang="ts">
  import { RESOURCE_META } from '$lib/domain/catalog';
  import { addCargo, cargoSpace, cargoWeight, marketPrice } from '$lib/domain/economy';
  import { gameSession } from '$lib/stores/gameStore';
  import { progressMissions } from '$lib/domain/missions';
  import type { GameState, ResourceId, SettlementState, Ship } from '$lib/domain/types';

  let { game } = $props<{ game: GameState }>();
  let port = $derived(game.world.settlements.find((item: SettlementState) => item.id === 'liberty-cove')!);
  let ship = $derived(game.ships.find((item: Ship) => item.id === game.activeShipId) ?? game.ships[0]);
  const supplies: ResourceId[] = ['food', 'rum', 'medicine', 'timber', 'powder', 'cannonballs'];

  function buy(resource: ResourceId, amount: number): void {
    gameSession.updateGame((state) => {
      const active = state.ships.find((item) => item.id === state.activeShipId) ?? state.ships[0];
      const price = marketPrice(port, resource, 'buy', state.world.marketCycle, port.attitude, state.captain.trait) * amount;
      if (state.resources.gold < price) return state;
      const transfer = addCargo(active, resource, amount);
      if (transfer.added === 0) return state;
      const actualPrice = Math.ceil(price * (transfer.added / amount));
      return { ...state, resources: { ...state.resources, gold: state.resources.gold - actualPrice }, ships: state.ships.map((item) => item.id === active.id ? transfer.ship : item) };
    }, true);
  }

  function sell(resource: ResourceId): void {
    gameSession.updateGame((state) => {
      const active = state.ships.find((item) => item.id === state.activeShipId) ?? state.ships[0];
      const amount = active.cargo[resource] ?? 0;
      if (amount <= 0) return state;
      const price = marketPrice(port, resource, 'sell', state.world.marketCycle, port.attitude, state.captain.trait);
      const cargo = { ...active.cargo, [resource]: 0 };
      let next = { ...state, resources: { ...state.resources, gold: state.resources.gold + price * amount }, ships: state.ships.map((item) => item.id === active.id ? { ...active, cargo, cargoWeight: cargoWeight(cargo) } : item) };
      if (resource === 'contraband') next = progressMissions(next, { kind: 'contraband-delivered', zoneId: 'freeport-waters', targetId: port.id, amount });
      return next;
    }, true);
  }

  function recruit(): void {
    gameSession.updateGame((state) => {
      const active = state.ships.find((item) => item.id === state.activeShipId) ?? state.ships[0];
      const count = Math.min(5, active.stats.crewMax - active.crew);
      const cost = count * 32;
      if (count <= 0 || state.resources.gold < cost) return state;
      return { ...state, resources: { ...state.resources, gold: state.resources.gold - cost }, ships: state.ships.map((item) => item.id === active.id ? { ...active, crew: active.crew + count } : item), crew: { ...state.crew, roles: { ...state.crew.roles, deckhand: state.crew.roles.deckhand + count }, morale: Math.min(100, state.crew.morale + 2) } };
    }, true);
  }

  function drink(): void {
    gameSession.updateGame((state) => state.resources.gold < 45 ? state : ({ ...state, resources: { ...state.resources, gold: state.resources.gold - 45 }, crew: { ...state.crew, morale: Math.min(100, state.crew.morale + 14), fatigue: Math.max(0, state.crew.fatigue - 12) } }), true);
  }

  function gamble(): void {
    gameSession.updateGame((state) => {
      if (state.resources.gold < 50) return state;
      const winnings = Math.random() < .46 ? 115 : 0;
      gameSession.addToast(winnings ? 'success' : 'warning', winnings ? '주사위 승리' : '빈 주머니', winnings ? '은화 더미를 끌어당겼습니다.' : '딜러가 당신의 금화를 쓸어갔습니다.');
      return { ...state, resources: { ...state.resources, gold: state.resources.gold - 50 + winnings } };
    }, true);
  }
</script>

<section class="management-screen">
  <header class="management-header"><div><span class="eyebrow">NEUTRAL PIRATE SOCIETY</span><h1>자유항 리버티 코브</h1><p class="muted">오늘의 소문: {port.currentEvent}</p></div><div class="tag">화물 여유 {Math.floor(cargoSpace(ship))}</div></header>
  <div class="management-grid">
    <article class="panel span-7">
      <div class="panel-title"><div><span class="eyebrow">BLACK MARKET</span><h2>장물 매입소</h2></div><span class="tag">시장 주기 {game.world.marketCycle + 1}</span></div>
      <div class="resource-list">
        {#each (Object.entries(ship.cargo) as [ResourceId, number][]).filter(([, amount]) => amount > 0) as [id, amount]}
          <div class="resource-row"><span><span class="icon">{RESOURCE_META[id].icon}</span> <strong>{RESOURCE_META[id].name}</strong><small> · {amount}개 {RESOURCE_META[id].illegal ? '· 금지품' : ''}</small></span><b>{marketPrice(port, id, 'sell', game.world.marketCycle, port.attitude, game.captain.trait) * amount} 금화</b><button class="btn small" onclick={() => sell(id)}>전량 판매</button></div>
        {:else}<div class="muted" style="padding:2rem;text-align:center">판매할 화물이 없습니다. 바다는 빈손으로 돌아온 선장을 기억하지 않습니다.</div>{/each}
      </div>
    </article>
    <article class="panel span-5">
      <div class="panel-title"><div><span class="eyebrow">DOCK MARKET</span><h2>보급 상인</h2></div></div>
      <div class="resource-list">{#each supplies as id}<div class="resource-row"><span><span class="icon">{RESOURCE_META[id].icon}</span> <strong>{RESOURCE_META[id].name}</strong></span><b>{marketPrice(port, id, 'buy', game.world.marketCycle, port.attitude, game.captain.trait) * 5}</b><button class="btn small" onclick={() => buy(id, 5)}>5개 구매</button></div>{/each}</div>
    </article>
    <article class="panel span-4"><span class="eyebrow">THE DROWNED CROW</span><h2>익사한 까마귀 선술집</h2><p class="muted">신참, 탈영병, 망한 항해사가 다음 배를 기다립니다.</p><button class="btn wide" onclick={recruit} disabled={ship.crew >= ship.stats.crewMax}>선원 5명 모집 · 160 금화</button><button class="btn ghost wide" style="margin-top:.5rem" onclick={drink}>모두에게 한 잔 · 45 금화</button></article>
    <article class="panel span-4"><span class="eyebrow">BONES & DICE</span><h2>검은 뼈 도박장</h2><p class="muted">승률은 공평하지 않지만, 보상은 실제입니다.</p><button class="btn wide" onclick={gamble}>주사위 승부 · 판돈 50</button></article>
    <article class="panel span-4"><span class="eyebrow">AUCTION HOUSE</span><h2>검은 돛 경매장</h2><p class="muted">희귀 함포 설계도가 오늘 밤 공개됩니다.</p><button class="btn wide" onclick={() => gameSession.updateGame((state) => state.resources.gold < 900 ? state : ({ ...state, resources: { ...state.resources, gold: state.resources.gold - 900, blueprints: state.resources.blueprints + 1 } }), true)} disabled={game.resources.gold < 900}>설계도 낙찰 · 900 금화</button></article>
  </div>
</section>
