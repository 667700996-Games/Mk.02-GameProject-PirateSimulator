<script lang="ts">
  import { FACTIONS, RESOURCE_META } from '$lib/domain/catalog';
  import {
    declareFactionWar,
    formAlliance,
    notorietyActionQuotes,
    performNotorietyAction,
    pursuitTier,
    sendFactionGift
  } from '$lib/domain/factions';
  import { gameSession } from '$lib/stores/gameStore';
  import type { FactionId, FactionRelation, GameState, ResourceId } from '$lib/domain/types';
  import type { SettlementBuilding } from '$lib/settlement/types';

  let { game } = $props<{ game: GameState }>();
  let pursuit = $derived(pursuitTier(game.bounty));
  let relations = $derived(Object.values(game.factions) as FactionRelation[]);
  let quotes = $derived(notorietyActionQuotes(game));
  let selectedFaction = $state<FactionId>('free-pirates');
  let councilLevel = $derived(
    Math.max(
      game.haven.facilities['pirate-council']?.level ?? 0,
      ...game.settlement.buildings
        .filter(
          (building: SettlementBuilding) =>
            building.definitionId === 'pirate-council' && building.state === 'ACTIVE'
        )
        .map((building: SettlementBuilding) => building.level),
      0
    )
  );
  let selectedRelation = $derived(game.factions[selectedFaction]);
  let selectedDefinition = $derived(FACTIONS[selectedFaction]);

  function costLabel(cost: Partial<Record<ResourceId, number>>): string {
    return (Object.entries(cost) as [ResourceId, number][])
      .map(([id, amount]) => `${RESOURCE_META[id].name} ${amount}`)
      .join(' · ');
  }
</script>

<section class="management-screen factions-screen">
  <header class="management-header">
    <div>
      <span class="eyebrow">INFLUENCE & NOTORIETY</span>
      <h1>세력과 현상금</h1>
      <p class="muted">뇌물과 외교, 공포와 존경이 항구의 문과 바다의 포를 움직입니다.</p>
    </div>
    <span class="tag danger">{pursuit.name} · {Math.round(game.bounty).toLocaleString()} 금화</span>
  </header>
  <div class="management-grid">
    <article class="panel span-8">
      <div class="panel-title">
        <div>
          <span class="eyebrow">RELATIONS</span>
          <h2>군도의 세력</h2>
        </div>
        <span class="tag">해적 의회 {councilLevel}레벨</span>
      </div>
      <div class="list-stack">
        {#each relations as relation}
          {@const faction = FACTIONS[relation.factionId]}
          {@const allied = game.flags[`alliance:${relation.factionId}`]}
          {@const atWar = game.flags[`war:${relation.factionId}`]}
          <button
            class="list-row faction-row"
            class:selected={selectedFaction === relation.factionId}
            onclick={() => (selectedFaction = relation.factionId)}
          >
            <div>
              <span style={`color:${faction.color}`}>◆</span> <strong>{faction.name}</strong><small
                class="muted">{faction.description}</small
              ><span class="relation-state" class:war={atWar}
                >{allied
                  ? '◈ 동맹'
                  : atWar
                    ? '☠ 전쟁 중'
                    : relation.tradeAllowed
                      ? '교역 가능'
                      : '항구 봉쇄'}</span
              >
            </div>
            <div class="stat-grid">
              <div class="mini-stat"><small>우호</small><b>{Math.round(relation.favor)}</b></div>
              <div class="mini-stat">
                <small>적대</small><b class:danger={relation.hostility > 60}
                  >{Math.round(relation.hostility)}</b
                >
              </div>
              <div class="mini-stat"><small>공포</small><b>{Math.round(relation.fear)}</b></div>
              <div class="mini-stat"><small>존경</small><b>{Math.round(relation.respect)}</b></div>
            </div>
          </button>
        {/each}
      </div>
    </article>

    <article class="panel span-4 wanted-poster">
      <span class="eyebrow">WANTED DEAD OR ALIVE</span>
      <h2>{game.captain.name}</h2>
      <div class="force-number danger">{Math.round(game.bounty).toLocaleString()}</div>
      <p class="muted">열기 {Math.round(game.heat)}% · 해군 순찰 ×{pursuit.patrolMultiplier}</p>
      <div class="meter"><span style={`--value:${game.heat}%;--meter-color:#ac4538`}></span></div>
      <div class="map-details">
        <div class="map-row">
          <span>사냥꾼 조우율</span><b>{Math.round(pursuit.hunterChance * 100)}%</b>
        </div>
        <div class="map-row">
          <span>본거지 탐지</span><b>{Math.round(game.haven.detectionRisk)}%</b>
        </div>
        <div class="map-row"><span>악명</span><b>{game.captain.infamy}</b></div>
      </div>
    </article>

    <article class="panel span-7">
      <div class="panel-title">
        <div>
          <span class="eyebrow">ERASE THE LEDGER</span>
          <h2>추격 제거 공작</h2>
        </div>
      </div>
      <div class="notoriety-actions">
        {#each quotes as quote}
          <div class="covert-card">
            <div>
              <strong>{quote.name}</strong>
              <p>{quote.description}</p>
              {#if quote.requirement}<small class="muted">{quote.requirement}</small>{/if}
            </div>
            <div class="covert-result">
              <span>현상금 -{quote.bountyReduction}</span><span>열기 -{quote.heatReduction}</span>
            </div>
            <button
              class="btn small"
              onclick={() =>
                gameSession.updateGame(
                  (state) => performNotorietyAction(state, quote.action),
                  true
                )}
              disabled={!quote.available}>{costLabel(quote.cost)}</button
            >
          </div>
        {/each}
      </div>
    </article>

    <article class="panel span-5 diplomacy-card">
      <span class="eyebrow">PIRATE COUNCIL</span>
      <h2 style={`color:${selectedDefinition.color}`}>{selectedDefinition.shortName}</h2>
      <p class="muted">
        선물은 적대를 낮추고 교역로를 엽니다. 동맹과 전쟁 선포는 해적 의회가 필요합니다.
      </p>
      <div class="map-details">
        <div class="map-row">
          <span>외교 조건</span><b
            >{selectedRelation.favor >= 55 &&
            selectedRelation.respect >= 30 &&
            selectedRelation.hostility <= 25
              ? '동맹 협상 가능'
              : '신뢰 부족'}</b
          >
        </div>
        <div class="map-row">
          <span>현재 상태</span><b
            >{game.flags[`war:${selectedFaction}`]
              ? '전쟁'
              : game.flags[`alliance:${selectedFaction}`]
                ? '동맹'
                : selectedRelation.tradeAllowed
                  ? '교역'
                  : '봉쇄'}</b
          >
        </div>
      </div>
      <div class="diplomacy-actions">
        <button
          class="btn"
          onclick={() =>
            gameSession.updateGame((state) => sendFactionGift(state, selectedFaction), true)}
          disabled={game.resources.gold < 240 ||
            selectedRelation.hostility >= 85 ||
            ['imperial-navy', 'bounty-hunters', 'red-tide'].includes(selectedFaction)}
          >선물 사절 · 240 금화</button
        ><button
          class="btn primary"
          onclick={() =>
            gameSession.updateGame((state) => formAlliance(state, selectedFaction), true)}
          disabled={councilLevel < 1 ||
            selectedRelation.favor < 55 ||
            selectedRelation.respect < 30 ||
            selectedRelation.hostility > 25 ||
            ['imperial-navy', 'bounty-hunters'].includes(selectedFaction) ||
            !!game.flags[`alliance:${selectedFaction}`]}>동맹 체결</button
        ><button
          class="btn danger-button"
          onclick={() =>
            gameSession.updateGame((state) => declareFactionWar(state, selectedFaction), true)}
          disabled={councilLevel < 1 || !!game.flags[`war:${selectedFaction}`]}
          >검은 전쟁 선포</button
        >
      </div>
      {#if councilLevel < 1}<p class="faint">
          본거지에 해적 의회를 건설하면 동맹과 전쟁을 선포할 수 있습니다.
        </p>{/if}
    </article>
  </div>
</section>

<style>
  .faction-row {
    width: 100%;
    grid-template-columns: 1.15fr 1fr;
    text-align: left;
    background: rgba(5, 13, 16, 0.28);
    color: inherit;
    cursor: pointer;
  }
  .faction-row.selected {
    border-color: var(--brass);
    background: rgba(174, 129, 65, 0.09);
  }
  .faction-row small {
    display: block;
    margin: 0.25rem 0;
  }
  .relation-state {
    display: inline-block;
    font-size: 0.65rem;
    letter-spacing: 0.09em;
    color: #7fb09b;
  }
  .relation-state.war {
    color: #d06957;
  }
  .notoriety-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.65rem;
  }
  .covert-card {
    border: 1px solid var(--line);
    padding: 0.85rem;
    background: rgba(5, 12, 14, 0.4);
    display: grid;
    gap: 0.65rem;
  }
  .covert-card p {
    font-size: 0.75rem;
    color: var(--muted);
    margin: 0.25rem 0;
  }
  .covert-result {
    display: flex;
    gap: 0.65rem;
    color: #86ad9b;
    font-size: 0.68rem;
  }
  .covert-card button {
    justify-self: start;
  }
  .diplomacy-actions {
    display: grid;
    gap: 0.55rem;
    margin-top: 1rem;
  }
  .danger-button {
    border-color: #783b36;
    color: #d77a69;
  }
  .wanted-poster {
    background: linear-gradient(145deg, rgba(88, 58, 32, 0.25), rgba(9, 15, 17, 0.9));
  }
  @media (max-width: 760px) {
    .faction-row {
      grid-template-columns: 1fr;
    }
    .notoriety-actions {
      grid-template-columns: 1fr;
    }
  }
</style>
