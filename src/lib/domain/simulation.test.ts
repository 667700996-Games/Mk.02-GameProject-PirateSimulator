import { describe, expect, it } from 'vitest';
import { createNewGame } from './initialState';
import { advanceSimulation } from './simulation';
import { exportSave, importSave } from '$lib/persistence/gameRepository';
import { creditSettlementResources, placeBuilding } from '$lib/settlement/construction';
import { findPath, validatePlacement } from '$lib/settlement/island';
import type { SettlementBuildingId } from '$lib/settlement/types';

function openingSettlement() {
  const game = createNewGame(
    {
      captainName: '장기 항해',
      crewName: '검은물결',
      shipName: '새벽호',
      flagMark: '☠',
      flagColor: '#111111',
      trait: 'architect',
      difficulty: 'captain',
      seed: 812
    },
    1_700_000_000_000
  );
  let settlement = creditSettlementResources(game.settlement, {
    logs: 240,
    fiber: 120,
    stone: 160,
    rope: 100,
    planks: 160,
    'stone-blocks': 80,
    hardtack: 600,
    water: 600,
    clothes: 100,
    tools: 80
  });
  const source = settlement.buildings.find((building) => building.definitionId === 'wreckage')!;
  const openingBuildings: SettlementBuildingId[] = [
    'water-collector',
    'lumber-camp',
    'warehouse',
    'fisher-hut',
    'small-dock'
  ];

  for (const definitionId of openingBuildings) {
    let connectedPlacement: ReturnType<typeof placeBuilding> | undefined;
    for (const candidate of settlement.island.tiles) {
      if (
        !validatePlacement(
          settlement.island,
          settlement.buildings,
          definitionId,
          candidate.x,
          candidate.y,
          0
        ).valid
      )
        continue;
      const placed = placeBuilding(
        settlement,
        definitionId,
        candidate.x,
        candidate.y,
        0,
        1_700_000_000_000,
        game.captain.trait
      );
      if (
        placed.ok &&
        placed.state.buildings
          .filter((building) => building.state === 'PLANNED')
          .every(
            (building) =>
              findPath(
                placed.state.island,
                { x: source.x, y: source.y },
                { x: building.x, y: building.y },
                placed.state.buildings
              ).length > 0
          )
      ) {
        connectedPlacement = placed;
        break;
      }
    }
    expect(connectedPlacement, `${definitionId} 연결 가능 배치`).toBeDefined();
    settlement = connectedPlacement!.state;
  }
  game.settlement = settlement;
  return game;
}

function everyNumberIsFinite(value: unknown): boolean {
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(everyNumberIsFinite);
  if (value && typeof value === 'object')
    return Object.values(value as Record<string, unknown>).every(everyNumberIsFinite);
  return true;
}

describe('world simulation', () => {
  it('advances game time and play time', () => {
    const game = createNewGame({ captainName: '시계', crewName: '날짜', shipName: '모래', flagMark: '⌛', flagColor: '#222222', trait: 'navigator', difficulty: 'captain', seed: 4 }, 1000);
    const next = advanceSimulation(game, 60, 2000);
    expect(next.playTimeSeconds).toBe(60);
    expect(next.world.hour).toBeCloseTo(8.5);
  });

  it('triggers a defense when raid threat reaches the limit at home', () => {
    const game = createNewGame({ captainName: '수비', crewName: '성벽', shipName: '보루', flagMark: '♜', flagColor: '#222222', trait: 'admiral', difficulty: 'captain', seed: 4 }, 1000);
    game.haven.raidThreat = 99.99;
    game.bounty = 10000;
    const next = advanceSimulation(game, 2, 2000);
    expect(next.defense.active).toBe(true);
    expect(next.screen).toBe('defense');
  });

  it('applies difficulty pursuit pressure and the smuggler detection reduction', () => {
    const game = createNewGame({ captainName: '추격', crewName: '해무', shipName: '은신', flagMark: '◆', flagColor: '#222222', trait: 'navigator', difficulty: 'story', seed: 9 }, 1000);
    game.screen = 'world-map';
    game.bounty = 10_000;
    game.haven.raidThreat = 0;
    game.haven.detectionRisk = 0;
    game.settlement.speed = 0;
    const story = advanceSimulation(structuredClone(game), 1, 2000);
    const blackFlagGame = structuredClone(game);
    blackFlagGame.captain.difficulty = 'black-flag';
    const blackFlag = advanceSimulation(blackFlagGame, 1, 2000);
    const smugglerGame = structuredClone(game);
    smugglerGame.captain.difficulty = 'captain';
    smugglerGame.captain.trait = 'smuggler';
    const smuggler = advanceSimulation(smugglerGame, 1, 2000);
    const regularGame = structuredClone(smugglerGame);
    regularGame.captain.trait = 'navigator';
    const regular = advanceSimulation(regularGame, 1, 2000);

    expect(blackFlag.haven.raidThreat).toBeGreaterThan(story.haven.raidThreat);
    expect(smuggler.haven.raidThreat).toBeLessThan(regular.haven.raidThreat);
  });

  it('keeps a representative 90-minute session bounded, finite and save-compatible', () => {
    let game = openingSettlement();
    const startedAt = performance.now();
    const samples: number[] = [];
    let largestSave = 0;

    for (let second = 1; second <= 90 * 60; second += 1) {
      const tickStartedAt = performance.now();
      game = advanceSimulation(game, 1, 1_700_000_000_000 + second * 1_000);
      samples.push(performance.now() - tickStartedAt);
      if (second % 300 === 0) {
        const serialized = exportSave(game);
        largestSave = Math.max(largestSave, new TextEncoder().encode(serialized).byteLength);
        game = importSave(serialized);
      }
    }

    const elapsed = performance.now() - startedAt;
    const p95 = [...samples].sort((a, b) => a - b)[Math.floor(samples.length * 0.95)];
    const openingMission = game.missions.find((mission) => mission.id === 'story-first-prize');
    const openingBuildingStates = Object.fromEntries(
      ['water-collector', 'lumber-camp', 'warehouse', 'fisher-hut', 'small-dock'].map(
        (definitionId) => [
          definitionId,
          game.settlement.buildings.find((building) => building.definitionId === definitionId)
            ?.state
        ]
      )
    );

    expect(game.playTimeSeconds).toBe(90 * 60);
    expect(game.world.day).toBe(5);
    expect(game.settlement.simulationMinutes).toBe(7 * 60 + 90 * 60);
    expect(game.settlement.tutorialStep).toBe(5);
    expect(openingMission?.progress).toBe(5);
    expect(openingBuildingStates).toEqual({
      'water-collector': 'ACTIVE',
      'lumber-camp': 'ACTIVE',
      warehouse: 'ACTIVE',
      'fisher-hut': 'ACTIVE',
      'small-dock': 'ACTIVE'
    });
    expect(game.settlement.transports.length).toBeLessThan(100);
    expect(game.settlement.transports.every((transport) => transport.amount >= 0.001)).toBe(true);
    expect(game.settlement.warnings.length).toBeLessThanOrEqual(20);
    expect(game.missions.length).toBeLessThanOrEqual(10);
    expect(game.settlement.residents.length).toBeGreaterThan(0);
    expect(
      game.settlement.residents.every((resident) =>
        Object.values(resident.needs).every((need) => need >= 0 && need <= 100)
      )
    ).toBe(true);
    expect(Object.values(game.resources).every((quantity) => quantity >= 0)).toBe(true);
    expect(everyNumberIsFinite(game)).toBe(true);
    expect(largestSave).toBeLessThan(8 * 1024 * 1024);
    expect(p95).toBeLessThan(50);
    expect(elapsed).toBeLessThan(20_000);
  }, 30_000);
});
