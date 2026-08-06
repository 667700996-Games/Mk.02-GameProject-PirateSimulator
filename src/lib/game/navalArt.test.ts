import { describe, expect, it } from 'vitest';
import { SHIP_ART, shipDamageStage } from './navalArt';
import { SHIP_CLASSES } from '$lib/domain/catalog';

describe('naval class art', () => {
  it('covers every playable ship class with increasing fleet scale', () => {
    expect(Object.keys(SHIP_ART).sort()).toEqual(Object.keys(SHIP_CLASSES).sort());
    const sizes = Object.values(SHIP_ART).map((art) => art.displaySize);
    expect(sizes).toEqual([...sizes].sort((a, b) => a - b));
    expect(new Set(Object.values(SHIP_ART).map((art) => art.frame))).toHaveLength(9);
  });

  it('converts hull condition into four unambiguous visual damage stages', () => {
    expect(shipDamageStage(100, 100)).toBe(0);
    expect(shipDamageStage(72, 100)).toBe(1);
    expect(shipDamageStage(48, 100)).toBe(2);
    expect(shipDamageStage(22, 100)).toBe(3);
    expect(shipDamageStage(0, 100)).toBe(3);
  });
});
