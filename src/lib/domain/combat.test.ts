import { describe, expect, it } from 'vitest';
import { applyShot, canBoard, resolveShot } from './combat';
import { createNewGame } from './initialState';

const options = { captainName: '포수', crewName: '뇌성', shipName: '천둥', flagMark: 'cannon', flagColor: '#111111', trait: 'gunner' as const, difficulty: 'captain' as const, seed: 12 };

describe('naval combat', () => {
  it('fires a valid broadside and applies component damage', () => {
    const game = createNewGame(options, 1000);
    const attacker = game.ships[0];
    const target = structuredClone(attacker);
    target.id = 'enemy';
    const result = resolveShot({ attacker, target, ammo: 'round-shot', distance: 120, bearingToTarget: Math.PI / 2, attackerHeading: 0, attackerSpeed: 2, targetSpeed: 2, broadside: 'starboard', difficulty: 'captain', captainIsGunner: true, random: () => 0.01 });
    expect(result.fired).toBe(true);
    expect(result.hit).toBe(true);
    expect(result.hullDamage).toBeGreaterThan(0);
    expect(applyShot(target, result).hull).toBeLessThan(target.hull);
  });

  it('refuses to fire outside the broadside arc', () => {
    const game = createNewGame(options, 1000);
    const result = resolveShot({ attacker: game.ships[0], target: game.ships[0], ammo: 'round-shot', distance: 120, bearingToTarget: 0, attackerHeading: 0, attackerSpeed: 0, targetSpeed: 0, broadside: 'port', difficulty: 'captain', captainIsGunner: false, random: () => 0 });
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
});
