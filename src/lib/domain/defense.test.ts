import { describe, expect, it } from 'vitest';
import { beginDefensePreparation, claimDefenseResult, launchDefense, prepareDefense, resolveNavalStage } from './defense';
import { createNewGame } from './initialState';

function attackedGame() {
  const game = createNewGame({ captainName: '성벽', crewName: '수비대', shipName: '포대', flagMark: '♜', flagColor: '#333', trait: 'admiral', difficulty: 'captain', seed: 1 }, 1000);
  return { ...game, defense: { ...game.defense, active: true, stage: 'warning' as const, attackStrength: 35, defenseStrength: 0, attackerRemaining: 35 } };
}

describe('haven defense', () => {
  it('moves through preparation into naval defense with spent supplies', () => {
    let game = beginDefensePreparation(attackedGame());
    const food = game.resources.food;
    game = prepareDefense(game, 'muster');
    expect(game.resources.food).toBe(food - 10);
    expect(game.defense.preparation).toBeGreaterThan(0);
    game = launchDefense(game);
    expect(game.defense.stage).toBe('naval');
    expect(game.defense.defenseStrength).toBeGreaterThan(game.haven.defense);
  });

  it('can stop a weak fleet at sea and claim salvage', () => {
    let game = launchDefense(beginDefensePreparation(attackedGame()));
    game = resolveNavalStage(game, 'fleet-charge', () => .9);
    expect(game.defense.stage).toBe('resolved');
    expect(game.defense.outcome).toBe('victory');
    const gold = game.resources.gold;
    game = claimDefenseResult(game);
    expect(game.resources.gold).toBeGreaterThan(gold);
    expect(game.screen).toBe('haven');
  });
});
