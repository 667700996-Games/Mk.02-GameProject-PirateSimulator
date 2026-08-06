import { describe, expect, it } from 'vitest';
import {
  RESIDENT_ACTION_VISUALS,
  RESIDENT_JOB_ART,
  residentActivityGlyph,
  residentActivityPose,
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

  it('defines a bounded readable motion language for every simulated action', () => {
    expect(Object.keys(RESIDENT_ACTION_VISUALS)).toHaveLength(13);
    for (const action of Object.keys(RESIDENT_ACTION_VISUALS) as Array<keyof typeof RESIDENT_ACTION_VISUALS>) {
      const pose = residentActivityPose(action, 2_400, 0.7);
      expect(Math.abs(pose.offsetY)).toBeLessThanOrEqual(1.5);
      expect(Math.abs(pose.rotation)).toBeLessThanOrEqual(0.052);
    }
    expect(residentActivityGlyph('WORKING')).toBe('⚒');
    expect(residentActivityGlyph('MOVING')).toBe('');
    expect(residentActivityPose('FIREFIGHTING', 2_400, 0.7, true)).toEqual({ offsetY: 0, rotation: 0 });
  });
});
