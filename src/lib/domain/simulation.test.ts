import { describe, expect, it } from 'vitest';
import { createNewGame } from './initialState';
import { advanceSimulation } from './simulation';

describe('world simulation', () => {
  it('advances game time and play time', () => {
    const game = createNewGame({ captainName: '시계', crewName: '날짜', shipName: '모래', flagMark: '⌛', flagColor: '#222222', trait: 'navigator', difficulty: 'captain', seed: 4 }, 1000);
    const next = advanceSimulation(game, 60, 2000);
    expect(next.playTimeSeconds).toBe(60);
    expect(next.world.hour).toBeCloseTo(8.5);
  });

  it('triggers a defense when raid threat reaches the limit at home', () => {
    const game = createNewGame({ captainName: '수비', crewName: '성벽', shipName: '보루', flagMark: '♜', flagColor: '#222222', trait: 'admiral', difficulty: 'captain', seed: 4 }, 1000);
    game.haven.raidThreat = 99.99;
    game.bounty = 10000;
    const next = advanceSimulation(game, 2, 2000);
    expect(next.defense.active).toBe(true);
    expect(next.screen).toBe('defense');
  });
});
