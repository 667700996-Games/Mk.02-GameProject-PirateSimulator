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
});
