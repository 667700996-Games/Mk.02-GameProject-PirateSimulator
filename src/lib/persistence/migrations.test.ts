import { describe, expect, it } from 'vitest';
import { createNewGame } from '$lib/domain/initialState';
import { SAVE_VERSION } from '$lib/domain/types';
import { migrateGameState, SaveMigrationError } from './migrations';

describe('save migrations', () => {
  it('loads a current save', () => {
    const game = createNewGame(
      {
        captainName: '저장',
        crewName: '기록단',
        shipName: '잉크',
        flagMark: 'quill',
        flagColor: '#222222',
        trait: 'negotiator',
        difficulty: 'story',
        seed: 1
      },
      1000
    );
    expect(migrateGameState(game).version).toBe(SAVE_VERSION);
  });

  it('rejects malformed save data', () => {
    expect(() => migrateGameState({ version: 0 })).toThrow(SaveMigrationError);
  });

  it('rejects future save versions', () => {
    expect(() => migrateGameState({ version: SAVE_VERSION + 1 })).toThrow('더 새로운');
  });

  it('migrates a version 1 voyage with fleet and defense defaults', () => {
    const game = createNewGame(
      {
        captainName: '구형',
        crewName: '기록단',
        shipName: '오래된 돛',
        flagMark: 'X',
        flagColor: '#222222',
        trait: 'navigator',
        difficulty: 'captain',
        seed: 2
      },
      1000
    );
    const legacy = structuredClone(game) as unknown as Record<string, unknown>;
    legacy.version = 1;
    delete legacy.fleet;
    const defense = legacy.defense as Record<string, unknown>;
    delete defense.preparation;
    delete defense.attackerRemaining;
    const migrated = migrateGameState(legacy);
    expect(migrated.version).toBe(SAVE_VERSION);
    expect(migrated.fleet.formation).toBe('line-ahead');
    expect(migrated.defense.preparation).toBe(0);
    expect(migrated.officers.every((officer) => officer.isCaptain === false)).toBe(true);
    expect(migrated.settlement.residents).toHaveLength(16);
  });

  it('migrates v3 settlement fields and gives legacy expeditions an explicit purpose', () => {
    const game = createNewGame(
      {
        captainName: '3세대',
        crewName: '연결단',
        shipName: '새 해도',
        flagMark: '◇',
        flagColor: '#222222',
        trait: 'navigator',
        difficulty: 'captain',
        seed: 3
      },
      1000
    );
    const legacy = structuredClone(game) as unknown as Record<string, unknown>;
    legacy.version = 3;
    const settlement = legacy.settlement as Record<string, unknown>;
    delete settlement.prisoners;
    settlement.expeditions = [
      {
        id: 'legacy-expedition',
        name: '예전 탐사',
        state: 'TRAVELING',
        zoneId: 'beginners-bay',
        shipIds: [],
        captainIds: [],
        crewIds: [],
        supplies: {},
        cargo: {},
        routeProgress: 0.2,
        durationHours: 8,
        risk: 10,
        morale: 70,
        log: []
      }
    ];
    const migrated = migrateGameState(legacy);
    expect(migrated.version).toBe(4);
    expect(migrated.settlement.prisoners).toBe(0);
    expect(migrated.settlement.expeditions[0].purpose).toBe('explore');
  });

  it('rejects corrupted nested resident and building records', () => {
    const game = createNewGame(
      {
        captainName: '손상',
        crewName: '검증단',
        shipName: '깨진 기록',
        flagMark: '×',
        flagColor: '#222222',
        trait: 'architect',
        difficulty: 'story',
        seed: 4
      },
      1000
    );
    game.settlement.residents[0].health = Number.NaN;
    expect(() => migrateGameState(game)).toThrow('주민 데이터');
    const second = createNewGame(
      {
        captainName: '손상',
        crewName: '검증단',
        shipName: '깨진 기록',
        flagMark: '×',
        flagColor: '#222222',
        trait: 'architect',
        difficulty: 'story',
        seed: 5
      },
      1000
    );
    second.settlement.buildings[0].x = Number.NaN;
    expect(() => migrateGameState(second)).toThrow('건물 데이터');
  });

  it('rejects negative inventory and broken cross references', () => {
    const game = createNewGame(
      {
        captainName: '교차 검증', crewName: '장부단', shipName: '정상 참조', flagMark: '□',
        flagColor: '#222222', trait: 'architect', difficulty: 'story', seed: 6
      },
      1000
    );
    game.settlement.buildings[0].outputInventory.gold = -1;
    expect(() => migrateGameState(game)).toThrow('수치가 손상');

    const broken = createNewGame(
      {
        captainName: '교차 검증', crewName: '장부단', shipName: '깨진 참조', flagMark: '□',
        flagColor: '#222222', trait: 'architect', difficulty: 'story', seed: 7
      },
      1000
    );
    broken.settlement.residents[0].homeId = 'missing-home';
    expect(() => migrateGameState(broken)).toThrow('주거 참조');
  });
});
