import { SAVE_VERSION, type GameState } from '$lib/domain/types';
import { createInitialSettlement } from '$lib/settlement/initialState';

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
  if ((migrated.version ?? 0) === 1) {
    migrated = {
      ...migrated,
      version: 2,
      fleet: migrated.fleet ?? {
        formation: 'line-ahead',
        autoEngage: false,
        retreatHullPercent: 28,
        assignments: [],
        victories: 0,
        shipsLost: 0
      },
      officers: migrated.officers?.map((officer) => ({ ...officer, isCaptain: officer.isCaptain ?? false })),
      missions: migrated.missions?.map((mission) => ({ ...mission, difficulty: mission.difficulty ?? 1, claimed: mission.claimed ?? mission.status === 'complete' })),
      defense: migrated.defense ? {
        ...migrated.defense,
        attackerRemaining: migrated.defense.attackerRemaining ?? migrated.defense.attackStrength,
        preparation: migrated.defense.preparation ?? 0,
        civilianRisk: migrated.defense.civilianRisk ?? 0,
        selectedActions: migrated.defense.selectedActions ?? [],
        log: migrated.defense.log ?? []
      } : migrated.defense
    };
  }
  if ((migrated.version ?? 0) === 2) {
    migrated = {
      ...migrated,
      version: 3,
      settlement: migrated.settlement ?? createInitialSettlement(migrated.world?.seed ?? 1, migrated.lastSavedAt ?? Date.now())
    };
  }
  if ((migrated.version ?? 0) === 3) {
    const fallback = createInitialSettlement(migrated.world?.seed ?? 1, migrated.lastSavedAt ?? Date.now());
    const settlement = migrated.settlement ?? fallback;
    migrated = {
      ...migrated,
      version: 4,
      settlement: {
        ...fallback,
        ...settlement,
        prisoners: settlement.prisoners ?? 0,
        buildings: Array.isArray(settlement.buildings) ? settlement.buildings : fallback.buildings,
        residents: Array.isArray(settlement.residents) ? settlement.residents : fallback.residents,
        transports: Array.isArray(settlement.transports) ? settlement.transports : [],
        expeditions: Array.isArray(settlement.expeditions) ? settlement.expeditions.map((expedition) => ({
          ...expedition,
          purpose: expedition.purpose ?? (expedition.log?.some((entry) => entry.includes('raid')) ? 'raid' : 'explore')
        })) : [],
        warnings: Array.isArray(settlement.warnings) ? settlement.warnings : [],
        statistics: { ...fallback.statistics, ...(settlement.statistics ?? {}) }
      }
    };
  }
  validateRequiredFields(migrated);
  return migrated as GameState;
}

function validateRequiredFields(value: LegacySave): asserts value is GameState {
  if (!value.saveId || !value.captain || !value.haven || !value.settlement || !value.world || !value.ships?.length) {
    throw new SaveMigrationError('저장 파일에 필수 게임 상태가 없습니다.');
  }
  if (!value.activeShipId || !value.resources || !value.factions) {
    throw new SaveMigrationError('저장 파일이 손상되었습니다.');
  }
  if (!Array.isArray(value.settlement.buildings) || !Array.isArray(value.settlement.residents) || !Array.isArray(value.settlement.expeditions)) {
    throw new SaveMigrationError('정착지 시뮬레이션 데이터가 손상되었습니다.');
  }
  if (value.settlement.residents.some((resident) => !resident.id || !resident.name || !resident.needs || !Number.isFinite(resident.health))) {
    throw new SaveMigrationError('주민 데이터가 손상되었습니다.');
  }
  if (value.settlement.buildings.some((building) => !building.id || !building.definitionId || !Number.isFinite(building.x) || !Number.isFinite(building.y))) {
    throw new SaveMigrationError('건물 데이터가 손상되었습니다.');
  }
}
