import { describe, expect, it } from 'vitest';
import {
  RESIDENT_ATLAS_DATA,
  RESIDENT_ATLAS_IMAGE,
  RESIDENT_ATLAS_KEY,
  RESIDENT_ACTION_VISUALS,
  RESIDENT_JOB_ART,
  RESIDENT_REAR_ATLAS_DATA,
  RESIDENT_REAR_ATLAS_IMAGE,
  RESIDENT_REAR_ATLAS_KEY,
  RESIDENT_WALK_ATLAS_DATA,
  RESIDENT_WALK_FRONT_ATLAS_IMAGE,
  RESIDENT_WALK_FRONT_ATLAS_KEY,
  RESIDENT_WALK_REAR_ATLAS_IMAGE,
  RESIDENT_WALK_REAR_ATLAS_KEY,
  residentActivityGlyph,
  residentActivityPose,
  residentAtlasKey,
  residentArtFrame,
  residentCrowdOffset,
  residentDisplaySize,
  residentFacingFlipX,
  residentFacingForMovement,
  residentWalkAtlasKey,
  residentWalkFrame,
  residentWalkFrameIndex
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

  it('selects four diagonal directions from stable screen-space movement', () => {
    expect(residentAtlasKey('front-right')).toBe(RESIDENT_ATLAS_KEY);
    expect(residentAtlasKey('rear-left')).toBe(RESIDENT_REAR_ATLAS_KEY);
    expect(residentWalkAtlasKey('front-left')).toBe(RESIDENT_WALK_FRONT_ATLAS_KEY);
    expect(residentWalkAtlasKey('rear-right')).toBe(RESIDENT_WALK_REAR_ATLAS_KEY);
    expect(residentFacingForMovement(-0.19, -0.19, 'front-right')).toBe('rear-left');
    expect(residentFacingForMovement(0.19, 0.19, 'rear-left')).toBe('front-right');
    expect(residentFacingForMovement(-0.1, -0.1, 'front-right')).toBe('front-right');
    expect(residentFacingForMovement(0, -0.2, 'front-left')).toBe('rear-left');
    expect(residentFacingFlipX('front-left')).toBe(true);
    expect(residentFacingFlipX('rear-right')).toBe(false);
  });

  it('uses a contact-passing-contact walk loop with a neutral reduced-motion frame', () => {
    expect(residentWalkFrame('hauler', 2)).toBe('hauler-walk-2');
    expect([0, 145, 290, 435, 580].map((time) => residentWalkFrameIndex(time, 0, true)))
      .toEqual([0, 1, 2, 1, 0]);
    expect(residentWalkFrameIndex(290, 0, false)).toBe(1);
    expect(residentWalkFrameIndex(290, 0, true, true)).toBe(1);
  });

  it('publishes idle and walk atlases from the settlement art path', () => {
    for (const path of [
      RESIDENT_ATLAS_IMAGE,
      RESIDENT_ATLAS_DATA,
      RESIDENT_REAR_ATLAS_IMAGE,
      RESIDENT_REAR_ATLAS_DATA,
      RESIDENT_WALK_FRONT_ATLAS_IMAGE,
      RESIDENT_WALK_REAR_ATLAS_IMAGE,
      RESIDENT_WALK_ATLAS_DATA
    ]) expect(path).toMatch(/^\/art\/settlement\/.*\.(png|json)$/);
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
