import { describe, expect, it } from 'vitest';
import { batteryAmmunition, beginDefensePreparation, claimDefenseResult, launchDefense, lureRivalFleet, prepareDefense, resolveLandingStage, resolveNavalStage, tickDefenseCountdown } from './defense';
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
  it('starts a paid rival-lure operation through the normal threat clock', () => {
    const game = attackedGame();
    game.defense.active = false;
    game.settlement.threat.active = false;
    const lured = lureRivalFleet(game, 2000);
    expect(lured.screen).toBe('haven');
    expect(lured.haven.raidThreat).toBe(100);
    expect(lured.settlement.threat.active).toBe(true);
    expect(lured.resources.gold).toBeLessThan(game.resources.gold);
  });

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

  it('automatically launches the defense when preparation time expires', () => {
    const game = { ...attackedGame(), defense: { ...attackedGame().defense, timeToAttack: 2 } };
    const warning = tickDefenseCountdown(game, 1);
    expect(warning.defense.stage).toBe('warning');
    expect(warning.defense.timeToAttack).toBe(1);
    const launched = tickDefenseCountdown(warning, 1);
    expect(launched.defense.stage).toBe('naval');
    expect(launched.defense.log).toContain('준비 시간이 끝났다. 남은 수비대가 즉시 포문을 열었다.');
  });

  it('records permanent resident losses in the authoritative settlement state', () => {
    const game = attackedGame();
    for (const resident of game.settlement.residents.slice(0, 8)) resident.job = 'guard';
    const before = game.settlement.residents.length;
    const battle = resolveLandingStage({
      ...game,
      defense: {
        ...game.defense,
        stage: 'landing',
        attackerRemaining: 300,
        attackStrength: 300,
        civilianRisk: 80,
        losses: { wounded: 0, killed: 0, shipsLost: 0 }
      }
    }, 'counterattack', () => 0);
    expect(battle.settlement.residents.length).toBeLessThan(before);
    expect(battle.haven.population).toBe(battle.settlement.residents.length);
    expect(battle.defense.losses?.killed).toBe(before - battle.settlement.residents.length);
    const livingIds = new Set(battle.settlement.residents.map((resident) => resident.id));
    expect(battle.settlement.buildings.every((building) => building.workers.every((id) => livingIds.has(id)))).toBe(true);
  });
});
