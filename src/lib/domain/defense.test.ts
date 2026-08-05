import { describe, expect, it } from 'vitest';
import { batteryAmmunition, beginDefensePreparation, claimDefenseResult, launchDefense, prepareDefense, resolveNavalStage } from './defense';
import { createNewGame } from './initialState';
import type { GameState } from './types';

function attackedGame(): GameState {
  const game = createNewGame({ captainName: '성벽', crewName: '수비대', shipName: '포대', flagMark: '♜', flagColor: '#333', trait: 'admiral', difficulty: 'captain', seed: 1 }, 1000);
  game.ships[0].hull = game.ships[0].stats.hullMax;
  game.ships[0].sails = game.ships[0].stats.sailMax;
  game.ships[0].crew = 14;
  const wreckage = game.settlement.buildings.find((building) => building.definitionId === 'wreckage')!;
  wreckage.outputInventory.rum = 8;
  return { ...game, defense: { ...game.defense, active: true, stage: 'warning' as const, attackStrength: 35, defenseStrength: 0, attackerRemaining: 35 } };
}

describe('haven defense', () => {
  it('moves through preparation into naval defense with spent supplies', () => {
    let game = beginDefensePreparation(attackedGame());
    const wreckage = game.settlement.buildings.find((building) => building.definitionId === 'wreckage')!;
    const food = wreckage.outputInventory.hardtack ?? 0;
    game = prepareDefense(game, 'muster');
    expect(game.settlement.buildings.find((building) => building.definitionId === 'wreckage')!.outputInventory.hardtack).toBe(food - 10);
    expect(game.defense.preparation).toBeGreaterThan(0);
    game = launchDefense(game);
    expect(game.defense.stage).toBe('naval');
    expect(game.defense.defenseStrength).toBeGreaterThan(game.haven.defense);
  });

  it('can stop a weak fleet at sea and claim salvage', () => {
    let game = attackedGame();
    game = { ...game, defense: { ...game.defense, attackStrength: 15, attackerRemaining: 15 } };
    game = launchDefense(beginDefensePreparation(game));
    game = resolveNavalStage(game, 'fleet-charge', () => .9);
    expect(game.defense.stage).toBe('resolved');
    expect(game.defense.outcome).toBe('victory');
    const gold = game.resources.gold;
    game = claimDefenseResult(game);
    expect(game.resources.gold).toBeGreaterThan(gold);
    expect(game.screen).toBe('haven');
  });

  it('counts only staffed coastal batteries with locally delivered ammunition', () => {
    const game = attackedGame();
    game.settlement.buildings.push({
      id: 'battery-test', definitionId: 'coastal-battery', x: 8, y: 5, rotation: 0, level: 1, state: 'ACTIVE', constructionProgress: 1,
      constructionPriority: 4, workers: [game.settlement.residents[0].id], inputInventory: { cannonballs: 22, powder: 12 }, outputInventory: {}, reservedInventory: {},
      recipeProgress: 0, condition: 100, fire: 0, paused: false, createdAt: 1000
    });
    expect(batteryAmmunition(game.settlement)).toBe(22);
    let battle = launchDefense(beginDefensePreparation(game));
    battle = resolveNavalStage(battle, 'crossfire', () => 0.5);
    const battery = battle.settlement.buildings.find((building) => building.id === 'battery-test')!;
    expect(battery.inputInventory.cannonballs).toBe(12);
    expect(battery.inputInventory.powder).toBe(7);
  });
});
