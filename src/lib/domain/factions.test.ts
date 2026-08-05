import { describe, expect, it } from 'vitest';
import { createNewGame } from './initialState';
import { declareFactionWar, formAlliance, notorietyActionQuotes, performNotorietyAction, sendFactionGift } from './factions';

describe('faction diplomacy and notoriety', () => {
  it('quotes and applies a bribe using real resources', () => {
    const state = createNewGame({ captainName: 'Anne', crewName: 'Tide', shipName: 'Gull', flagMark: 'skull', flagColor: '#fff', trait: 'negotiator', difficulty: 'captain' });
    state.bounty = 500;
    state.heat = 70;
    state.resources.gold = 1000;
    const quote = notorietyActionQuotes(state).find((item) => item.action === 'bribe')!;
    const next = performNotorietyAction(state, 'bribe');
    expect(next.resources.gold).toBe(state.resources.gold - (quote.cost.gold ?? 0));
    expect(next.bounty).toBeLessThan(state.bounty);
    expect(next.heat).toBeLessThan(state.heat);
  });

  it('requires real diplomatic standing and a council for an alliance', () => {
    const state = createNewGame({ captainName: 'Anne', crewName: 'Tide', shipName: 'Gull', flagMark: 'skull', flagColor: '#fff', trait: 'negotiator', difficulty: 'captain' });
    state.haven.facilities['pirate-council'] = { id: 'pirate-council', level: 1, condition: 100, workers: 2 };
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
    const next = sendFactionGift(state, 'isle-kin');
    expect(next.resources.gold).toBe(260);
    expect(next.factions['isle-kin'].favor).toBeGreaterThan(state.factions['isle-kin'].favor);
  });
});
