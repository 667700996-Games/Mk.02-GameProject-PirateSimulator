import { describe, expect, it } from 'vitest';
import { applyShot, canBoard, enemyDamageScale, isShipDisabled, resolveShot, surrenderChance, tickDamage } from './combat';
import { createNewGame } from './initialState';

const options = { captainName: '포수', crewName: '뇌성', shipName: '천둥', flagMark: 'cannon', flagColor: '#111111', trait: 'gunner' as const, difficulty: 'captain' as const, seed: 12 };

describe('naval combat', () => {
  it('fires a valid broadside and applies component damage', () => {
    const game = createNewGame(options, 1000);
    const attacker = game.ships[0];
    const target = structuredClone(attacker);
    target.id = 'enemy';
    const result = resolveShot({ attacker, target, ammo: 'round-shot', distance: 120, bearingToTarget: Math.PI / 2, attackerHeading: 0, attackerSpeed: 2, targetSpeed: 2, broadside: 'starboard', difficulty: 'captain', attackerIsEnemy: false, captainIsGunner: true, random: () => 0.01 });
    expect(result.fired).toBe(true);
    expect(result.hit).toBe(true);
    expect(result.hullDamage).toBeGreaterThan(0);
    expect(applyShot(target, result).hull).toBeLessThan(target.hull);
  });

  it('refuses to fire outside the broadside arc', () => {
    const game = createNewGame(options, 1000);
    const result = resolveShot({ attacker: game.ships[0], target: game.ships[0], ammo: 'round-shot', distance: 120, bearingToTarget: 0, attackerHeading: 0, attackerSpeed: 0, targetSpeed: 0, broadside: 'port', difficulty: 'captain', attackerIsEnemy: false, captainIsGunner: false, random: () => 0 });
    expect(result.fired).toBe(false);
    expect(result.reason).toContain('사격각');
  });

  it('allows boarding only after the target is weakened and close', () => {
    const game = createNewGame(options, 1000);
    const attacker = { ...game.ships[0], hull: game.ships[0].stats.hullMax, sails: game.ships[0].stats.sailMax, crew: 14, morale: 72 };
    const target = { ...attacker, hull: 50, crew: 3, morale: 18 };
    expect(canBoard(attacker, target, 50, 0.4)).toBe(true);
    expect(canBoard(attacker, target, 120, 0.4)).toBe(false);
  });

  it('rejects out-of-range or disabled cannon fire and preserves ships on misses', () => {
    const game = createNewGame(options, 1000);
    const attacker = { ...game.ships[0], stats: { ...game.ships[0].stats, cannonSlots: 40 }, cannonCondition: 100 };
    const context = { attacker, target: game.ships[0], ammo: 'round-shot' as const, bearingToTarget: Math.PI / 2, attackerHeading: 0, attackerSpeed: 0, targetSpeed: 0, broadside: 'starboard' as const, difficulty: 'captain' as const, attackerIsEnemy: false, captainIsGunner: false };
    expect(resolveShot({ ...context, distance: 700, random: () => 0 }).reason).toContain('사거리');
    expect(resolveShot({ ...context, attacker: { ...attacker, cannonCondition: 5 }, distance: 100, random: () => 0 }).reason).toContain('작동하지');

    const miss = resolveShot({ ...context, distance: 420, random: () => 0.99 });
    expect(miss).toMatchObject({ fired: true, hit: false });
    expect(applyShot(game.ships[0], miss)).toBe(game.ships[0]);
  });

  it('makes enemy fire easier on story and deadlier on black flag', () => {
    const game = createNewGame(options, 1000);
    const attacker = { ...game.ships[0], stats: { ...game.ships[0].stats, cannonSlots: 40 }, cannonCondition: 100 };
    const target = { ...game.ships[0], id: 'target' };
    const shot = { attacker, target, ammo: 'round-shot' as const, distance: 80, bearingToTarget: Math.PI / 2, attackerHeading: 0, attackerSpeed: 0, targetSpeed: 0, broadside: 'starboard' as const, captainIsGunner: false, random: () => 0.5 };
    const storyEnemy = resolveShot({ ...shot, difficulty: 'story', attackerIsEnemy: true });
    const blackFlagEnemy = resolveShot({ ...shot, difficulty: 'black-flag', attackerIsEnemy: true });
    const storyPlayer = resolveShot({ ...shot, difficulty: 'story', attackerIsEnemy: false });
    const blackFlagPlayer = resolveShot({ ...shot, difficulty: 'black-flag', attackerIsEnemy: false });

    expect(enemyDamageScale('story')).toBeLessThan(enemyDamageScale('black-flag'));
    expect(storyEnemy.hullDamage).toBeLessThan(blackFlagEnemy.hullDamage);
    expect(storyPlayer.hullDamage).toBeGreaterThan(blackFlagPlayer.hullDamage);
  });

  it('clamps component damage and applies ongoing fire and flooding', () => {
    const game = createNewGame(options, 1000);
    const ship = { ...game.ships[0], hull: 12, sails: 9, crew: 2, morale: 5, fire: 92, flooding: 96, rudderCondition: 4, cannonCondition: 3 };
    const damaged = applyShot(ship, {
      fired: true, hit: true, hitChance: 1, flightTime: 0, hullDamage: 90, sailDamage: 80, crewCasualties: 8,
      fire: 20, flooding: 20, rudderDamage: 20, cannonDamage: 20, critical: true
    });
    expect(damaged).toMatchObject({ hull: 0, sails: 0, crew: 0, morale: 0, fire: 100, flooding: 100, rudderCondition: 0, cannonCondition: 0 });
    expect(isShipDisabled(damaged)).toBe(true);

    const burning = tickDamage({ ...game.ships[0], hull: 100, sails: 80, fire: 50, flooding: 40 }, 4, 2);
    expect(burning.fire).toBeLessThan(50);
    expect(burning.flooding).toBeLessThan(40);
    expect(burning.hull).toBeLessThan(100);
    expect(burning.sails).toBeLessThan(80);
  });

  it('requires every boarding condition and rewards negotiator pressure', () => {
    const game = createNewGame(options, 1000);
    const attacker = { ...game.ships[0], hull: 100, crew: 12 };
    const target = { ...game.ships[0], id: 'target', hull: 40, crew: 5, morale: 20 };
    expect(canBoard(attacker, target, 40, 0.5)).toBe(true);
    expect(canBoard({ ...attacker, crew: 3 }, target, 40, 0.5)).toBe(false);
    expect(canBoard(attacker, { ...target, crew: 0 }, 40, 0.5)).toBe(false);
    expect(canBoard(attacker, target, 40, 2)).toBe(false);
    expect(surrenderChance(attacker, target, true)).toBeGreaterThan(surrenderChance(attacker, target, false));
    expect(surrenderChance(attacker, { ...target, hull: 0, crew: 1, morale: 0 }, true)).toBeLessThanOrEqual(.9);
  });
});
