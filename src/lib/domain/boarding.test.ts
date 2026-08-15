import { describe, expect, it } from 'vitest';
import { beginBoarding, resolveBoardingRound } from './boarding';
import { createNewGame } from './initialState';
import { createEnemyShip } from './voyage';

describe('boarding combat contracts', () => {
  it('makes negotiator intimidation more effective and difficulty scale losses', () => {
    const game = createNewGame({ captainName: '협상가', crewName: '은빛 혀', shipName: '협정', flagMark: '♜', flagColor: '#222', trait: 'negotiator', difficulty: 'captain', seed: 12 }, 1000);
    const enemy = createEnemyShip('merchant-routes', 'merchant', 2);
    const boarding = beginBoarding(game.ships[0], enemy, 12, 'negotiator');
    const regular = resolveBoardingRound(boarding, 'intimidate', () => 0.5);
    const negotiated = resolveBoardingRound(boarding, 'intimidate', () => 0.5, { trait: 'negotiator' });
    expect(negotiated.state.enemyStrength).toBeLessThan(regular.state.enemyStrength);

    const story = resolveBoardingRound(boarding, 'charge', () => 0.9, { difficulty: 'story' });
    const blackFlag = resolveBoardingRound(boarding, 'charge', () => 0.9, { difficulty: 'black-flag' });
    expect(blackFlag.playerCasualties).toBeGreaterThanOrEqual(story.playerCasualties);
  });
});
