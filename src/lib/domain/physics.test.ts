import { describe, expect, it } from 'vitest';
import { createNewGame } from './initialState';
import { expectedMaxSpeed, relativeWindAngle, tickSailing, windEfficiency } from './physics';

const game = createNewGame({ captainName: '테스트', crewName: '검은 돛', shipName: '물결', flagMark: 'skull', flagColor: '#b43b2b', trait: 'navigator', difficulty: 'captain', seed: 42 }, 1000);
const ship = game.ships[0];

describe('sailing physics', () => {
  it('gives a beam reach more speed than sailing directly into wind', () => {
    expect(windEfficiency(Math.PI / 2)).toBeGreaterThan(windEfficiency(0));
    const environment = { windDirection: 0, windSpeed: 1, waveDrag: 0 };
    expect(expectedMaxSpeed(ship, Math.PI / 2, environment)).toBeGreaterThan(expectedMaxSpeed(ship, 0, environment));
  });

  it('normalizes relative wind angles', () => {
    expect(relativeWindAngle(Math.PI * 1.9, 0)).toBeCloseTo(Math.PI * 0.1);
  });

  it('accelerates and turns gradually', () => {
    let state = { x: 0, y: 0, heading: 0, speed: 0, sailSetting: 0 };
    for (let index = 0; index < 120; index += 1) {
      state = tickSailing(state, ship, { steer: 1, sailDelta: 1, deltaSeconds: 1 / 60 }, { windDirection: Math.PI / 2, windSpeed: 1, waveDrag: 0 }, 'navigator');
    }
    expect(state.speed).toBeGreaterThan(0);
    expect(state.sailSetting).toBeGreaterThan(0.9);
    expect(state.heading).toBeGreaterThan(0);
    expect(state.heading).toBeLessThan(Math.PI);
  });
});
