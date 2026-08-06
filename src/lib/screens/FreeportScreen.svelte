<script lang="ts">
  import { RESOURCE_META } from '$lib/domain/catalog';
  import { addCargo, cargoSpace, cargoWeight, marketPrice } from '$lib/domain/economy';
  import { gameSession } from '$lib/stores/gameStore';
  import { progressMissions } from '$lib/domain/missions';
  import { creditGameResources, spendGameResources } from '$lib/settlement/economyBridge';
  import { policyModifiers } from '$lib/settlement/progression';
  import { availableSettlementInventory, spendSettlementResources } from '$lib/settlement/construction';
  import { SETTLEMENT_RESOURCES } from '$lib/settlement/catalog';
  import type { SettlementResourceId } from '$lib/settlement/types';
  import type { GameState, ResourceId, SettlementState, Ship } from '$lib/domain/types';

  let { game } = $props<{ game: GameState }>();
  let port = $derived(game.world.settlements.find((item: SettlementState) => item.id === 'liberty-cove')!);
  let ship = $derived(game.ships.find((item: Ship) => item.id === game.activeShipId) ?? game.ships[0]);
  let recruitCount = $derived(Math.min(5, ship.stats.crewMax - ship.crew));
  let recruitCost = $derived(recruitCount * 32);
  const supplies: ResourceId[] = ['food', 'rum', 'medicine', 'timber', 'powder', 'cannonballs'];
  const settlementLootIds: SettlementResourceId[] = ['royal-coins', 'silver', 'spices', 'wine', 'foreign-textiles', 'rare-metal', 'royal-equipment', 'ancient-relics', 'monster-materials'];
  const lootValues: Partial<Record<SettlementResourceId, number>> = { 'royal-coins': 18, silver: 28, spices: 35, wine: 22, 'foreign-textiles': 44, 'rare-metal': 95, 'royal-equipment': 72, 'ancient-relics': 180, 'monster-materials': 210 };
  let settlementInventory = $derived(availableSettlementInventory(game.settlement));
  let settlementLoot = $derived(settlementLootIds.filter((id) => (settlementInventory[id] ?? 0) > 0));

  function adjustedPrice(state: GameState, resource: ResourceId, side: 'buy' | 'sell'): number {
    const base = marketPrice(port, resource, side, state.world.marketCycle, port.attitude, state.captain.trait);
    const policy = policyModifiers(state.settlement).tradePrice;
    return Math.max(1, Math.round(side === 'buy' ? base / policy : base * policy));
  }
  function supplyPrice(resource: ResourceId): number { return adjustedPrice(game, resource, 'buy') * 5; }
  function canBuy(resource: ResourceId): boolean { return game.resources.gold >= supplyPrice(resource) && cargoSpace(ship) >= RESOURCE_META[resource].weight * 5; }

  function buy(resource: ResourceId, amount: number): void {
    gameSession.updateGame((state) => {
      const active = state.ships.find((item) => item.id === state.activeShipId) ?? state.ships[0];
      const price = adjustedPrice(state, resource, 'buy') * amount;
      if (state.resources.gold < price) return state;
      const transfer = addCargo(active, resource, amount);
      if (transfer.added === 0) return state;
      const actualPrice = Math.ceil(price * (transfer.added / amount));
      const paid = spendGameResources(state, { gold: actualPrice });
      return paid ? { ...paid, ships: paid.ships.map((item) => item.id === active.id ? transfer.ship : item) } : state;
    }, true);
  }

  function sell(resource: ResourceId): void {
    gameSession.updateGame((state) => {
      const active = state.ships.find((item) => item.id === state.activeShipId) ?? state.ships[0];
      const amount = active.cargo[resource] ?? 0;
      if (amount <= 0) return state;
      const price = adjustedPrice(state, resource, 'sell');
      const cargo = { ...active.cargo, [resource]: 0 };
      let next = creditGameResources({ ...state, ships: state.ships.map((item) => item.id === active.id ? { ...active, cargo, cargoWeight: cargoWeight(cargo) } : item) }, { gold: price * amount });
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
      const paid = spendGameResources(state, { gold: cost });
      return paid ? { ...paid, ships: paid.ships.map((item) => item.id === active.id ? { ...active, crew: active.crew + count } : item), crew: { ...paid.crew, roles: { ...paid.crew.roles, deckhand: paid.crew.roles.deckhand + count }, morale: Math.min(100, paid.crew.morale + 2) } } : state;
    }, true);
  }

  function drink(): void {
    gameSession.updateGame((state) => {
      const paid = spendGameResources(state, { gold: 45 });
      return paid ? { ...paid, crew: { ...paid.crew, morale: Math.min(100, paid.crew.morale + 14), fatigue: Math.max(0, paid.crew.fatigue - 12) } } : state;
    }, true);
  }

  function gamble(): void {
    gameSession.updateGame((state) => {
      const paid = spendGameResources(state, { gold: 50 });
      if (!paid) return state;
      const winnings = Math.random() < .46 ? 115 : 0;
      gameSession.addToast(winnings ? 'success' : 'warning', winnings ? '주사위 승리' : '빈 주머니', winnings ? '은화 더미를 끌어당겼습니다.' : '딜러가 당신의 금화를 쓸어갔습니다.');
      return winnings ? creditGameResources(paid, { gold: winnings }) : paid;
    }, true);
  }

  function buyBlueprint(): void {
    gameSession.updateGame((state) => {
      const paid = spendGameResources(state, { gold: 900 });
      return paid ? creditGameResources(paid, { blueprints: 1 }) : state;
    }, true);
  }

  function sellSettlementLoot(resource: SettlementResourceId): void {
    gameSession.updateGame((state) => {
      const stock = availableSettlementInventory(state.settlement)[resource] ?? 0;
      const amount = Math.floor(stock);
      if (amount <= 0) return state;
      const settlement = spendSettlementResources(state.settlement, { [resource]: amount });
      if (!settlement) return state;
      let next = creditGameResources({ ...state, settlement }, { gold: Math.round(amount * (lootValues[resource] ?? 12) * policyModifiers(state.settlement).tradePrice) });
      if (resource === 'royal-equipment') next = progressMissions(next, { kind: 'contraband-delivered', zoneId: 'freeport-waters', targetId: port.id, amount });
      return next;
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
          <div class="resource-row"><span><span class="icon">{RESOURCE_META[id].icon}</span> <strong>{RESOURCE_META[id].name}</strong><small> · {amount}개 {RESOURCE_META[id].illegal ? '· 금지품' : ''}</small></span><b>{adjustedPrice(game, id, 'sell') * amount} 금화</b><button class="btn small" onclick={() => sell(id)}>전량 판매</button></div>
        {:else}<div class="muted" style="padding:2rem;text-align:center">판매할 화물이 없습니다. 바다는 빈손으로 돌아온 선장을 기억하지 않습니다.</div>{/each}
      </div>
      <div class="panel-title" style="margin-top:1rem"><div><span class="eyebrow">SETTLEMENT LEDGER</span><h3>본거지 원정 전리품</h3></div><span class="tag">창고 직송</span></div>
      <div class="resource-list">
        {#each settlementLoot as id}
          <div class="resource-row"><span><span class="icon">{SETTLEMENT_RESOURCES[id].icon}</span> <strong>{SETTLEMENT_RESOURCES[id].name}</strong><small> · {Math.floor(settlementInventory[id] ?? 0)}개</small></span><b>{Math.round((settlementInventory[id] ?? 0) * (lootValues[id] ?? 12) * policyModifiers(game.settlement).tradePrice)} 금화</b><button class="btn small" onclick={() => sellSettlementLoot(id)}>창고분 판매</button></div>
        {:else}<div class="muted" style="padding:1rem;text-align:center">원정 전리품이 부두 창고에 도착하면 이곳에서 매입합니다.</div>{/each}
      </div>
    </article>
    <article class="panel span-5">
      <div class="panel-title"><div><span class="eyebrow">DOCK MARKET</span><h2>보급 상인</h2></div></div>
      <div class="resource-list">{#each supplies as id}<div class="resource-row"><span><span class="icon">{RESOURCE_META[id].icon}</span> <strong>{RESOURCE_META[id].name}</strong></span><b>{supplyPrice(id)}</b><button class="btn small" onclick={() => buy(id, 5)} disabled={!canBuy(id)}>5개 구매</button></div>{/each}</div>
    </article>
    <article class="panel span-4"><span class="eyebrow">THE DROWNED CROW</span><h2>익사한 까마귀 선술집</h2><p class="muted">신참, 탈영병, 망한 항해사가 다음 배를 기다립니다.</p><button class="btn wide" onclick={recruit} disabled={recruitCount <= 0 || game.resources.gold < recruitCost}>선원 {recruitCount}명 모집 · {recruitCost} 금화</button><button class="btn ghost wide" style="margin-top:.5rem" onclick={drink} disabled={game.resources.gold < 45}>모두에게 한 잔 · 45 금화</button></article>
    <article class="panel span-4"><span class="eyebrow">BONES & DICE</span><h2>검은 뼈 도박장</h2><p class="muted">승률은 공평하지 않지만, 보상은 실제입니다.</p><button class="btn wide" onclick={gamble} disabled={game.resources.gold < 50}>주사위 승부 · 판돈 50</button></article>
    <article class="panel span-4"><span class="eyebrow">AUCTION HOUSE</span><h2>검은 돛 경매장</h2><p class="muted">희귀 함포 설계도가 오늘 밤 공개됩니다.</p><button class="btn wide" onclick={buyBlueprint} disabled={game.resources.gold < 900}>설계도 낙찰 · 900 금화</button></article>
  </div>
</section>
