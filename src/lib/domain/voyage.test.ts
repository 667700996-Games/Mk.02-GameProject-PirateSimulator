import { describe, expect, it } from 'vitest';
import { createNewGame } from './initialState';
import { createEnemyShip, departForZone, finishEncounter, recoverEncounterLoot } from './voyage';
import type { GameState } from './types';

function seaworthyGame(): GameState {
  const game = createNewGame({
    captainName: 'Anne', crewName: 'Tide', shipName: 'Gull', flagMark: 'skull', flagColor: '#fff',
    trait: 'navigator', difficulty: 'captain', seed: 41
  }, 1000);
  game.ships[0].hull = game.ships[0].stats.hullMax;
  game.ships[0].sails = game.ships[0].stats.sailMax;
  game.ships[0].crew = 8;
  return game;
}

describe('direct voyages', () => {
  it('requires a seaworthy, crewed active ship', () => {
    const wrecked = createNewGame({
      captainName: 'Anne', crewName: 'Tide', shipName: 'Gull', flagMark: 'skull', flagColor: '#fff',
      trait: 'navigator', difficulty: 'captain', seed: 41
    }, 1000);
    expect(departForZone(wrecked, 'beginners-bay')).toBe(wrecked);

    const departed = departForZone(seaworthyGame(), 'beginners-bay');
    expect(departed.screen).toBe('sailing');
    expect(departed.voyage).toMatchObject({ active: true, zoneId: 'beginners-bay' });
    expect(departed.combat.active).toBe(true);
  });

  it('does not let one flagship join a strategic expedition and direct sortie simultaneously', () => {
    const game = seaworthyGame();
    game.settlement.expeditions.push({
      id: 'active-expedition', name: '겹친 항로', state: 'TRAVELING', zoneId: 'merchant-routes', purpose: 'raid',
      shipIds: [game.activeShipId], captainIds: [], crewIds: [], supplies: {}, cargo: {}, routeProgress: .4,
      durationHours: 8, risk: 20, morale: 60, log: []
    });
    expect(departForZone(game, 'beginners-bay')).toBe(game);

    game.settlement.expeditions[0].state = 'COMPLETED';
    expect(departForZone(game, 'beginners-bay').screen).toBe('sailing');
  });

  it('loads only cargo that fits and records the recovered amount', () => {
    const game = seaworthyGame();
    const ship = game.ships[0];
    ship.cargo = { timber: (ship.stats.cargoMax - 2) / 2 };
    ship.cargoWeight = ship.stats.cargoMax - 2;

    const recovery = recoverEncounterLoot(game, { timber: 8, iron: 3, food: Number.NaN });
    expect(recovery.recovered).toEqual({ timber: 1 });
    expect(recovery.state.ships[0].cargo.timber).toBe(ship.stats.cargoMax / 2);
    expect(recovery.state.ships[0].cargoWeight).toBe(ship.stats.cargoMax);
  });

  it('persists victory loot, notoriety and encounter resolution together', () => {
    const sailing = departForZone(seaworthyGame(), 'merchant-routes');
    const enemy = createEnemyShip('merchant-routes', 'merchant', 17);
    const recovery = recoverEncounterLoot(sailing, { timber: 8, iron: 3 });
    const finished = finishEncounter(recovery.state, 'victory', enemy, recovery.recovered);

    expect(finished.ships[0].cargo).toMatchObject({ timber: 8, iron: 3 });
    expect(finished.combat.lastResult).toMatchObject({ outcome: 'victory', loot: { timber: 8, iron: 3 } });
    expect(finished.voyage.currentEncounter?.resolved).toBe(true);
    expect(finished.bounty).toBeGreaterThan(sailing.bounty);
    expect(finished.heat).toBeGreaterThan(sailing.heat);
  });
});
