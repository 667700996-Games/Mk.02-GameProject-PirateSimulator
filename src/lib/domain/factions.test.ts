import { describe, expect, it } from 'vitest';
import { createNewGame } from './initialState';
import { declareFactionWar, formAlliance, notorietyActionQuotes, performNotorietyAction, sendFactionGift } from './factions';
import { departForZone } from './voyage';

describe('faction diplomacy and notoriety', () => {
  it('quotes and applies a bribe using real resources', () => {
    const state = createNewGame({ captainName: 'Anne', crewName: 'Tide', shipName: 'Gull', flagMark: 'skull', flagColor: '#fff', trait: 'negotiator', difficulty: 'captain' });
    state.bounty = 500;
    state.heat = 70;
    state.resources.gold = 1000;
    state.settlement.buildings.find((building) => building.definitionId === 'wreckage')!.outputInventory.gold = 1000;
    const quote = notorietyActionQuotes(state).find((item) => item.action === 'bribe')!;
    const next = performNotorietyAction(state, 'bribe');
    expect(next.resources.gold).toBe(state.resources.gold - (quote.cost.gold ?? 0));
    expect(next.bounty).toBeLessThan(state.bounty);
    expect(next.heat).toBeLessThan(state.heat);
  });

  it('requires real diplomatic standing and a council for an alliance', () => {
    const state = createNewGame({ captainName: 'Anne', crewName: 'Tide', shipName: 'Gull', flagMark: 'skull', flagColor: '#fff', trait: 'negotiator', difficulty: 'captain' });
    state.settlement.buildings.push({
      id: 'diplomacy-council', definitionId: 'pirate-council', x: 12, y: 11, rotation: 0,
      level: 1, state: 'ACTIVE', constructionProgress: 1, constructionPriority: 3,
      workers: [], inputInventory: {}, outputInventory: {}, reservedInventory: {},
      recipeProgress: 0, condition: 100, fire: 0, paused: false, createdAt: 1000
    });
    state.factions['free-pirates'] = { ...state.factions['free-pirates'], favor: 60, respect: 40, hostility: 10 };
    const allied = formAlliance(state, 'free-pirates');
    expect(allied.flags['alliance:free-pirates']).toBe(true);
    const war = declareFactionWar(allied, 'merchant-league');
    expect(war.flags['war:merchant-league']).toBe(true);
    expect(war.factions['merchant-league'].tradeAllowed).toBe(false);
  });

  it('spends gold to improve an eligible relation', () => {
    const state = createNewGame({ captainName: 'Anne', crewName: 'Tide', shipName: 'Gull', flagMark: 'skull', flagColor: '#fff', trait: 'negotiator', difficulty: 'captain' });
    state.resources.gold = 500;
    state.settlement.buildings.find((building) => building.definitionId === 'wreckage')!.outputInventory.gold = 500;
    const next = sendFactionGift(state, 'isle-kin');
    expect(next.resources.gold).toBe(260);
    expect(next.factions['isle-kin'].favor).toBeGreaterThan(state.factions['isle-kin'].favor);
  });

  it('turns a high bounty into active voyage pursuit pressure', () => {
    const state = createNewGame({ captainName: 'Anne', crewName: 'Tide', shipName: 'Gull', flagMark: 'skull', flagColor: '#fff', trait: 'negotiator', difficulty: 'captain', seed: 4 });
    state.bounty = 8_000;
    state.ships[0].hull = state.ships[0].stats.hullMax;
    state.ships[0].sails = state.ships[0].stats.sailMax;
    state.ships[0].crew = 8;
    const departed = departForZone(state, 'merchant-routes');
    expect(departed.voyage.pursuit).toBe(42);
    expect(departed.haven.raidThreat).toBe(state.haven.raidThreat);
  });
});
