import { SAVE_VERSION, type GameState } from '$lib/domain/types';

export class SaveMigrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SaveMigrationError';
  }
}

type LegacySave = Partial<GameState> & { version?: number };

export function migrateGameState(input: unknown): GameState {
  if (!input || typeof input !== 'object') throw new SaveMigrationError('저장 데이터 형식이 올바르지 않습니다.');
  const legacy = structuredClone(input) as LegacySave;
  const version = Number(legacy.version ?? 0);
  if (version > SAVE_VERSION) throw new SaveMigrationError('이 저장 파일은 더 새로운 게임 버전에서 만들어졌습니다.');

  let migrated = legacy;
  if (version === 0) {
    migrated = {
      ...migrated,
      version: 1,
      heat: migrated.heat ?? 0,
      paused: migrated.paused ?? false,
      flags: migrated.flags ?? {},
      toasts: migrated.toasts ?? [],
      playTimeSeconds: migrated.playTimeSeconds ?? 0
    };
  }
  validateRequiredFields(migrated);
  return migrated as GameState;
}

function validateRequiredFields(value: LegacySave): asserts value is GameState {
  if (!value.saveId || !value.captain || !value.haven || !value.world || !value.ships?.length) {
    throw new SaveMigrationError('저장 파일에 필수 게임 상태가 없습니다.');
  }
  if (!value.activeShipId || !value.resources || !value.factions) {
    throw new SaveMigrationError('저장 파일이 손상되었습니다.');
  }
}
