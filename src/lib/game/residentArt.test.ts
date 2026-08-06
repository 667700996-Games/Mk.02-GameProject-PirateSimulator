import { describe, expect, it } from 'vitest';
import {
  RESIDENT_JOB_ART,
  residentArtFrame,
  residentCrowdOffset,
  residentDisplaySize
} from './residentArt';
import { JOB_NAMES } from '$lib/settlement/catalog';

describe('settlement resident art', () => {
  it('maps every simulated job to a production sprite frame', () => {
    expect(Object.keys(RESIDENT_JOB_ART).sort()).toEqual(Object.keys(JOB_NAMES).sort());
    expect(new Set(Object.values(RESIDENT_JOB_ART))).toHaveLength(8);
  });

  it('prioritizes command silhouettes and keeps resident scale gameplay-readable', () => {
    expect(residentArtFrame('laborer', 'officer')).toBe('officer');
    expect(residentArtFrame('captain', 'elite')).toBe('officer');

    for (const frame of new Set(Object.values(RESIDENT_JOB_ART))) {
      const size = residentDisplaySize(frame);
      expect(size.width).toBeGreaterThanOrEqual(34);
      expect(size.height).toBeGreaterThan(44);
    }
  });

  it('assigns stable bounded crowd spacing without changing simulation coordinates', () => {
    const first = residentCrowdOffset('resident-blackwake-01');
    expect(residentCrowdOffset('resident-blackwake-01')).toEqual(first);
    expect(residentCrowdOffset('resident-blackwake-02')).not.toEqual(first);
    expect(Math.hypot(first.x, first.y)).toBeGreaterThanOrEqual(0.18);
    expect(Math.hypot(first.x, first.y)).toBeLessThanOrEqual(0.61);
  });
});
