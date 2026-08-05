import { describe, expect, it } from 'vitest';
import { createNewGame } from '$lib/domain/initialState';
import { SAVE_VERSION } from '$lib/domain/types';
import { migrateGameState, SaveMigrationError } from './migrations';

describe('save migrations', () => {
  it('loads a current save', () => {
    const game = createNewGame({ captainName: '저장', crewName: '기록단', shipName: '잉크', flagMark: 'quill', flagColor: '#222222', trait: 'negotiator', difficulty: 'story', seed: 1 }, 1000);
    expect(migrateGameState(game).version).toBe(SAVE_VERSION);
  });

  it('rejects malformed save data', () => {
    expect(() => migrateGameState({ version: 0 })).toThrow(SaveMigrationError);
  });

  it('rejects future save versions', () => {
    expect(() => migrateGameState({ version: SAVE_VERSION + 1 })).toThrow('더 새로운');
  });

  it('migrates a version 1 voyage with fleet and defense defaults', () => {
    const game = createNewGame({ captainName: '구형', crewName: '기록단', shipName: '오래된 돛', flagMark: 'X', flagColor: '#222222', trait: 'navigator', difficulty: 'captain', seed: 2 }, 1000);
    const legacy = structuredClone(game) as unknown as Record<string, unknown>;
    legacy.version = 1;
    delete legacy.fleet;
    const defense = legacy.defense as Record<string, unknown>;
    delete defense.preparation;
    delete defense.attackerRemaining;
    const migrated = migrateGameState(legacy);
    expect(migrated.version).toBe(2);
    expect(migrated.fleet.formation).toBe('line-ahead');
    expect(migrated.defense.preparation).toBe(0);
    expect(migrated.officers.every((officer) => officer.isCaptain === false)).toBe(true);
  });
});
