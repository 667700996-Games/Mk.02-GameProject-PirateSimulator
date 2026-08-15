import { describe, expect, it } from 'vitest';
import { soundscapeMix } from './SoundEngine';

describe('adaptive soundscape mix', () => {
  it('raises harbor detail with settlement activity and emergencies', () => {
    const quiet = soundscapeMix('haven', {
      population: 16,
      activeProduction: 1,
      weather: 'clear',
      fireCount: 0
    });
    const crowded = soundscapeMix('haven', {
      population: 180,
      activeProduction: 32,
      weather: 'storm',
      fireCount: 2
    });

    expect(crowded.harbor).toBeGreaterThan(quiet.harbor);
    expect(crowded.harborCutoff).toBeGreaterThan(quiet.harborCutoff);
    expect(crowded.weather).toBeGreaterThan(quiet.weather);
  });

  it('moves from port detail to ocean and weather layers at sea', () => {
    const settlement = {
      population: 80,
      activeProduction: 14,
      weather: 'clear' as const,
      fireCount: 0
    };
    const freeport = soundscapeMix('freeport', settlement);
    const sea = soundscapeMix('sea', settlement);
    const storm = soundscapeMix('storm', settlement);

    expect(freeport.harbor).toBeGreaterThan(sea.harbor);
    expect(sea.ocean).toBeGreaterThan(freeport.ocean);
    expect(storm.ocean).toBeGreaterThan(sea.ocean);
    expect(storm.weather).toBeGreaterThan(0);
  });
});
