import { describe, expect, it } from 'vitest';
import { SETTLEMENTS } from './catalog';
import { addCargo, cargoSpace, cargoWeight, marketPrice, removeCargo } from './economy';
import { createNewGame } from './initialState';

function testShip() {
  const game = createNewGame(
    {
      captainName: '장부',
      crewName: '화물단',
      shipName: '저울호',
      flagMark: '▣',
      flagColor: '#111111',
      trait: 'negotiator',
      difficulty: 'captain',
      seed: 44
    },
    1000
  );
  return { ...game.ships[0], cargo: {}, cargoWeight: 0 };
}

describe('ship cargo and market economy', () => {
  it('caps weighted cargo at hold capacity and keeps cached weight synchronized', () => {
    const ship = testShip();
    const loaded = addCargo(ship, 'timber', 1000);

    expect(loaded.added).toBe(Math.floor(ship.stats.cargoMax / 2));
    expect(cargoWeight(loaded.ship.cargo)).toBe(ship.stats.cargoMax);
    expect(loaded.ship.cargoWeight).toBe(ship.stats.cargoMax);
    expect(cargoSpace(loaded.ship)).toBe(0);

    const rejected = addCargo(loaded.ship, 'food', 5);
    expect(rejected.added).toBe(0);
    expect(rejected.ship.cargoWeight).toBe(ship.stats.cargoMax);

    const unloaded = removeCargo(loaded.ship, 'timber', 4);
    expect(unloaded.removed).toBe(4);
    expect(unloaded.ship.cargoWeight).toBe(ship.stats.cargoMax - 8);
    expect(cargoSpace(unloaded.ship)).toBe(8);
  });

  it('allows weightless valuables without corrupting capacity and rejects negative transfers', () => {
    const ship = testShip();
    const valuables = addCargo(ship, 'blueprints', 3);
    const negativeLoad = addCargo(valuables.ship, 'food', -4);
    const negativeUnload = removeCargo(valuables.ship, 'blueprints', -2);

    expect(valuables.added).toBe(3);
    expect(valuables.ship.cargoWeight).toBe(0);
    expect(cargoSpace(valuables.ship)).toBe(ship.stats.cargoMax);
    expect(negativeLoad.added).toBe(0);
    expect(negativeUnload.removed).toBe(0);
  });

  it('applies buy/sell spread and the advertised negotiator and smuggler advantages', () => {
    const port = SETTLEMENTS.find((settlement) => settlement.id === 'liberty-cove')!;
    const regularBuy = marketPrice(port, 'medicine', 'buy', 3, port.attitude, 'navigator');
    const regularSell = marketPrice(port, 'medicine', 'sell', 3, port.attitude, 'navigator');
    const negotiatorBuy = marketPrice(port, 'medicine', 'buy', 3, port.attitude, 'negotiator');
    const negotiatorSell = marketPrice(port, 'medicine', 'sell', 3, port.attitude, 'negotiator');
    const regularContrabandBuy = marketPrice(
      port,
      'contraband',
      'buy',
      3,
      port.attitude,
      'navigator'
    );
    const regularContrabandSell = marketPrice(
      port,
      'contraband',
      'sell',
      3,
      port.attitude,
      'navigator'
    );
    const smugglerBuy = marketPrice(port, 'contraband', 'buy', 3, port.attitude, 'smuggler');
    const smugglerSell = marketPrice(port, 'contraband', 'sell', 3, port.attitude, 'smuggler');

    expect(regularBuy).toBeGreaterThan(regularSell);
    expect(negotiatorBuy).toBeLessThan(regularBuy);
    expect(negotiatorSell).toBeGreaterThan(regularSell);
    expect(smugglerBuy).toBeLessThan(regularContrabandBuy);
    expect(smugglerSell).toBeGreaterThan(regularContrabandSell);
  });
});
