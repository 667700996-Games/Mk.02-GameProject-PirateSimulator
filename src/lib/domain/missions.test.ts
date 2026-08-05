import { describe, expect, it } from 'vitest';
import { createNewGame } from './initialState';
import { acceptMission, claimMissionReward, generateMissionBoard, progressMissions } from './missions';

describe('mission system', () => {
  it('generates faction-backed procedural missions', () => {
    const game = createNewGame({ captainName: '계약', crewName: '장부', shipName: '서명', flagMark: '▤', flagColor: '#222', trait: 'negotiator', difficulty: 'captain', seed: 8 }, 1000);
    const missions = generateMissionBoard(game, 5, 2000);
    expect(missions.length).toBeGreaterThanOrEqual(5);
    expect(missions.some((mission) => !mission.story && mission.issuerFactionId)).toBe(true);
  });

  it('progresses and claims a matching mission reward once', () => {
    let game = createNewGame({ captainName: '계약', crewName: '장부', shipName: '서명', flagMark: '▤', flagColor: '#222', trait: 'negotiator', difficulty: 'captain', seed: 8 }, 1000);
    game = { ...game, missions: [{ ...game.missions[0], id: 'test', status: 'available', goal: 1, reward: { gold: 100 }, claimed: false }] };
    game = acceptMission(game, 'test');
    game = progressMissions(game, { kind: 'ship-defeated', zoneId: 'beginners-bay', opponent: 'merchant' });
    expect(game.missions[0].status).toBe('complete');
    const claimed = claimMissionReward(game, 'test');
    expect(claimed.resources.gold).toBe(game.resources.gold + 100);
    expect(claimMissionReward(claimed, 'test').resources.gold).toBe(claimed.resources.gold);
  });
});
