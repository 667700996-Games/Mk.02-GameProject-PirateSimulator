import { describe, expect, it } from 'vitest';
import { createNewGame } from './initialState';
import { acceptMission, claimMissionReward, expireAndRefreshMissions, generateMissionBoard, progressMissions } from './missions';

describe('mission system', () => {
  it('tracks the opening settlement milestones and unlocks a five-chapter story arc', () => {
    let game = createNewGame({ captainName: '연대기', crewName: '검은 물결', shipName: '첫 깃발', flagMark: '✥', flagColor: '#222', trait: 'navigator', difficulty: 'captain', seed: 8 }, 1000);
    game = progressMissions(game, {
      kind: 'settlement-milestone', zoneId: 'beginners-bay', amount: 5
    });
    expect(game.missions[0].progress).toBe(5);
    expect(game.missions[0].status).toBe('active');
    game = progressMissions(game, {
      kind: 'ship-defeated', zoneId: 'beginners-bay', opponent: 'merchant'
    });
    expect(game.missions[0].status).toBe('active');
    game = progressMissions(game, { kind: 'raid-complete', zoneId: 'beginners-bay' });
    expect(game.missions[0].status).toBe('complete');

    const claimed = claimMissionReward(game, 'story-first-prize');
    const sequel = claimed.missions.find((mission) => mission.id === 'story-liberty-ledger');
    expect(sequel?.status).toBe('active');
    expect(sequel?.story).toBe(true);
    expect(claimed.world.recentEvents[0]).toContain(sequel?.title);
  });

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

  it('replenishes the board without duplicating a zone and title pair', () => {
    let game = createNewGame({ captainName: '계약', crewName: '장부', shipName: '서명', flagMark: '▤', flagColor: '#222', trait: 'negotiator', difficulty: 'captain', seed: 8 }, 1000);
    game = { ...game, missions: generateMissionBoard(game, 5, 2000) };
    const available = game.missions.find((mission) => mission.status === 'available')!;
    game = acceptMission(game, available.id);
    game = expireAndRefreshMissions(game, 3000);
    const signatures = game.missions.map((mission) => `${mission.zoneId}:${mission.title}`);
    expect(new Set(signatures).size).toBe(signatures.length);
  });
});
