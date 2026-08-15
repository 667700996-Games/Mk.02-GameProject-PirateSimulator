import { SAVE_VERSION, type GameState } from '$lib/domain/types';
import { createInitialSettlement } from '$lib/settlement/initialState';
import { BUILDINGS, RECIPES, SETTLEMENT_RESOURCE_IDS } from '$lib/settlement/catalog';
import { storySequelAfter } from '$lib/domain/missions';

export class SaveMigrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SaveMigrationError';
  }
}

type LegacySave = Partial<GameState> & { version?: number };

export function migrateGameState(input: unknown): GameState {
  if (!input || typeof input !== 'object')
    throw new SaveMigrationError('저장 데이터 형식이 올바르지 않습니다.');
  const legacy = structuredClone(input) as LegacySave;
  const version = Number(legacy.version ?? 0);
  if (version > SAVE_VERSION)
    throw new SaveMigrationError('이 저장 파일은 더 새로운 게임 버전에서 만들어졌습니다.');

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
      officers: migrated.officers?.map((officer) => ({
        ...officer,
        isCaptain: officer.isCaptain ?? false
      })),
      missions: migrated.missions?.map((mission) => ({
        ...mission,
        difficulty: mission.difficulty ?? 1,
        claimed: mission.claimed ?? mission.status === 'complete'
      })),
      defense: migrated.defense
        ? {
            ...migrated.defense,
            attackerRemaining:
              migrated.defense.attackerRemaining ?? migrated.defense.attackStrength,
            preparation: migrated.defense.preparation ?? 0,
            civilianRisk: migrated.defense.civilianRisk ?? 0,
            selectedActions: migrated.defense.selectedActions ?? [],
            log: migrated.defense.log ?? [],
            losses: migrated.defense.losses ?? { wounded: 0, killed: 0, shipsLost: 0 }
          }
        : migrated.defense
    };
  }
  if ((migrated.version ?? 0) === 2) {
    migrated = {
      ...migrated,
      version: 3,
      settlement:
        migrated.settlement ??
        createInitialSettlement(migrated.world?.seed ?? 1, migrated.lastSavedAt ?? Date.now())
    };
  }
  if ((migrated.version ?? 0) === 3) {
    const fallback = createInitialSettlement(
      migrated.world?.seed ?? 1,
      migrated.lastSavedAt ?? Date.now()
    );
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
        expeditions: Array.isArray(settlement.expeditions)
          ? settlement.expeditions.map((expedition) => ({
              ...expedition,
              purpose:
                expedition.purpose ??
                (expedition.log?.some((entry) => entry.includes('raid')) ? 'raid' : 'explore')
            }))
          : [],
        warnings: Array.isArray(settlement.warnings) ? settlement.warnings : [],
        statistics: { ...fallback.statistics, ...(settlement.statistics ?? {}) }
      }
    };
  }
  if (migrated.defense) migrated.defense.losses ??= { wounded: 0, killed: 0, shipsLost: 0 };
  if (migrated.settlement) migrated.settlement.residentUpdateCursor ??= 0;
  if (migrated.missions && migrated.settlement) {
    const opening = migrated.missions.find((mission) => mission.id === 'story-first-prize');
    if (opening) {
      opening.goal = 6;
      opening.difficulty ??= 1;
      opening.claimed ??= false;
      if (opening.status === 'complete' || opening.claimed) opening.progress = 6;
      else
        opening.progress = Math.max(
          opening.progress,
          Math.min(5, migrated.settlement.tutorialStep)
        );
      if (
        opening.claimed &&
        !migrated.missions.some((mission) => mission.id === 'story-liberty-ledger')
      ) {
        const sequel = storySequelAfter(opening.id);
        if (sequel) migrated.missions.push(sequel);
      }
    }
  }
  validateRequiredFields(migrated);
  return migrated as GameState;
}

function validateRequiredFields(value: LegacySave): asserts value is GameState {
  if (
    !value.saveId ||
    !value.captain ||
    !value.haven ||
    !value.settlement ||
    !value.world ||
    !value.ships?.length
  ) {
    throw new SaveMigrationError('저장 파일에 필수 게임 상태가 없습니다.');
  }
  if (!value.activeShipId || !value.resources || !value.factions) {
    throw new SaveMigrationError('저장 파일이 손상되었습니다.');
  }
  if (
    !Array.isArray(value.settlement.buildings) ||
    !Array.isArray(value.settlement.residents) ||
    !Array.isArray(value.settlement.expeditions)
  ) {
    throw new SaveMigrationError('정착지 시뮬레이션 데이터가 손상되었습니다.');
  }
  if (
    value.settlement.residents.some(
      (resident) =>
        !resident.id || !resident.name || !resident.needs || !Number.isFinite(resident.health)
    )
  ) {
    throw new SaveMigrationError('주민 데이터가 손상되었습니다.');
  }
  if (
    value.settlement.buildings.some(
      (building) =>
        !building.id ||
        !building.definitionId ||
        !Number.isFinite(building.x) ||
        !Number.isFinite(building.y)
    )
  ) {
    throw new SaveMigrationError('건물 데이터가 손상되었습니다.');
  }
  validateIdentifiers(value as GameState);
  validateSettlement(value as GameState);
  validateGameNumbers(value as GameState);
}

function assertUnique(values: string[], label: string): void {
  if (
    values.some((id) => typeof id !== 'string' || id.length === 0) ||
    new Set(values).size !== values.length
  ) {
    throw new SaveMigrationError(`${label} 식별자가 중복되거나 손상되었습니다.`);
  }
}

function assertFinite(
  value: number,
  label: string,
  minimum = 0,
  maximum = Number.MAX_SAFE_INTEGER
): void {
  if (!Number.isFinite(value) || value < minimum || value > maximum)
    throw new SaveMigrationError(`${label} 수치가 손상되었습니다.`);
}

const settlementResourceIds = new Set<string>(SETTLEMENT_RESOURCE_IDS);

function validateInventory(inventory: unknown, label: string): void {
  if (!inventory || typeof inventory !== 'object' || Array.isArray(inventory))
    throw new SaveMigrationError(`${label} 재고가 손상되었습니다.`);
  for (const [id, quantity] of Object.entries(inventory)) {
    if (!settlementResourceIds.has(id) || typeof quantity !== 'number')
      throw new SaveMigrationError(`${label}에 알 수 없는 자원이 있습니다.`);
    assertFinite(quantity, `${label} ${id}`, 0, 1_000_000_000);
  }
}

function validateIdentifiers(state: GameState): void {
  assertUnique(
    state.ships.map((ship) => ship.id),
    '함선'
  );
  assertUnique(
    state.officers.map((officer) => officer.id),
    '장교'
  );
  assertUnique(
    state.settlement.residents.map((resident) => resident.id),
    '주민'
  );
  assertUnique(
    state.settlement.buildings.map((building) => building.id),
    '건물'
  );
  assertUnique(
    state.settlement.transports.map((transport) => transport.id),
    '운송'
  );
  assertUnique(
    state.settlement.expeditions.map((expedition) => expedition.id),
    '원정'
  );
  if (!state.ships.some((ship) => ship.id === state.activeShipId))
    throw new SaveMigrationError('활성 함선 참조가 손상되었습니다.');
}

function validateSettlement(state: GameState): void {
  const settlement = state.settlement;
  if (
    settlement.residents.length > 5_000 ||
    settlement.buildings.length > 5_000 ||
    settlement.transports.length > 20_000 ||
    settlement.expeditions.length > 200
  ) {
    throw new SaveMigrationError('저장 데이터의 시뮬레이션 개체 수가 안전 한도를 초과했습니다.');
  }
  const island = settlement.island;
  assertFinite(island.width, '섬 너비', 1, 256);
  assertFinite(island.height, '섬 높이', 1, 256);
  if (
    !Number.isInteger(island.width) ||
    !Number.isInteger(island.height) ||
    island.tiles.length !== island.width * island.height
  )
    throw new SaveMigrationError('섬 지도 크기가 손상되었습니다.');
  for (const tile of island.tiles) {
    assertFinite(tile.x, '타일 X', 0, island.width - 1);
    assertFinite(tile.y, '타일 Y', 0, island.height - 1);
    assertFinite(tile.elevation, '타일 고도', 0, 20);
    assertFinite(tile.fertility, '타일 비옥도', 0, 100);
    if (tile.resourceRemaining !== undefined)
      assertFinite(tile.resourceRemaining, '천연자원 잔량', 0, 1_000_000);
  }
  const residentIds = new Set(settlement.residents.map((resident) => resident.id));
  const buildingIds = new Set(settlement.buildings.map((building) => building.id));
  const shipIds = new Set(state.ships.map((ship) => ship.id));
  const officerIds = new Set(state.officers.map((officer) => officer.id));
  for (const resident of settlement.residents) {
    for (const [label, number] of Object.entries({
      health: resident.health,
      morale: resident.morale,
      loyalty: resident.loyalty,
      fatigue: resident.fatigue,
      experience: resident.experience
    }))
      assertFinite(number, `주민 ${label}`, 0, 1_000_000);
    for (const [need, score] of Object.entries(resident.needs))
      assertFinite(score, `주민 욕구 ${need}`, 0, 100);
    if (resident.homeId && !buildingIds.has(resident.homeId))
      throw new SaveMigrationError('주민 주거 참조가 손상되었습니다.');
    if (resident.workplaceId && !buildingIds.has(resident.workplaceId))
      throw new SaveMigrationError('주민 근무지 참조가 손상되었습니다.');
    if (Boolean(resident.activityAction) !== Boolean(resident.activityTargetId))
      throw new SaveMigrationError('주민 활동 예약 데이터가 불완전합니다.');
    if (resident.activityTargetId && !buildingIds.has(resident.activityTargetId))
      throw new SaveMigrationError('주민 활동 목적지 참조가 손상되었습니다.');
    assertFinite(resident.actionUntil, '주민 행동 종료 시각', 0, Number.MAX_SAFE_INTEGER);
    assertFinite(resident.position.x, '주민 위치 X', -1, island.width);
    assertFinite(resident.position.y, '주민 위치 Y', -1, island.height);
    validateInventory(resident.equipment, '주민 장비');
  }
  for (const building of settlement.buildings) {
    if (!BUILDINGS[building.definitionId])
      throw new SaveMigrationError('알 수 없는 건물 정의가 저장되어 있습니다.');
    assertFinite(building.x, '건물 X', 0, island.width - 1);
    assertFinite(building.y, '건물 Y', 0, island.height - 1);
    assertFinite(building.level, '건물 단계', 1, 20);
    assertFinite(building.condition, '건물 상태', 0, 100);
    assertFinite(building.fire, '건물 화재', 0, 100);
    assertFinite(building.constructionProgress, '건설 진행도', 0, 1);
    assertFinite(building.recipeProgress, '생산 진행도', 0, 1);
    if (
      building.recipeId &&
      (!RECIPES[building.recipeId] ||
        !BUILDINGS[building.definitionId]?.recipes.includes(building.recipeId))
    )
      throw new SaveMigrationError('건물 생산법 참조가 손상되었습니다.');
    if (building.workers.some((id) => !residentIds.has(id)))
      throw new SaveMigrationError('건물 작업자 참조가 손상되었습니다.');
    validateInventory(building.inputInventory, '건물 입력');
    validateInventory(building.outputInventory, '건물 출력');
    validateInventory(building.reservedInventory, '건물 예약');
    for (const [id, reserved] of Object.entries(building.reservedInventory)) {
      if (
        (reserved ?? 0) >
        (building.outputInventory[id as keyof typeof building.outputInventory] ?? 0) + 0.001
      )
        throw new SaveMigrationError('예약 재고가 실제 출력 재고를 초과했습니다.');
    }
  }
  for (const transport of settlement.transports) {
    if (
      !buildingIds.has(transport.sourceBuildingId) ||
      !buildingIds.has(transport.targetBuildingId)
    )
      throw new SaveMigrationError('운송 건물 참조가 손상되었습니다.');
    if (transport.haulerId && !residentIds.has(transport.haulerId))
      throw new SaveMigrationError('운송 인력 참조가 손상되었습니다.');
    if (!settlementResourceIds.has(transport.resourceId))
      throw new SaveMigrationError('운송 자원 참조가 손상되었습니다.');
    assertFinite(transport.amount, '운송 수량', 0.0001, 1_000_000);
    assertFinite(transport.progress, '운송 진행도', 0, 1);
  }
  for (const expedition of settlement.expeditions) {
    if (
      expedition.shipIds.some((id) => !shipIds.has(id)) ||
      expedition.captainIds.some((id) => !officerIds.has(id)) ||
      expedition.crewIds.some((id) => !residentIds.has(id))
    )
      throw new SaveMigrationError('원정 편성 참조가 손상되었습니다.');
    assertFinite(expedition.routeProgress, '원정 진행도', 0, 1);
    assertFinite(expedition.durationHours, '원정 기간', 1, 100_000);
    assertFinite(expedition.risk, '원정 위험도', 0, 100);
    assertFinite(expedition.morale, '원정 사기', 0, 100);
    validateInventory(expedition.supplies, '원정 보급');
    validateInventory(expedition.cargo, '원정 화물');
  }
  validateInventory(settlement.looseInventory, '정착지 임시');
}

function validateGameNumbers(state: GameState): void {
  assertFinite(state.playTimeSeconds, '플레이 시간', 0);
  assertFinite(state.bounty, '현상금', 0);
  assertFinite(state.heat, '추격도', 0, 100);
  for (const [id, quantity] of Object.entries(state.resources))
    assertFinite(quantity, `게임 자원 ${id}`, 0, 1_000_000_000);
  for (const ship of state.ships) {
    assertFinite(ship.hull, '함선 선체', 0, ship.stats.hullMax);
    assertFinite(ship.sails, '함선 돛', 0, ship.stats.sailMax);
    assertFinite(ship.crew, '함선 선원', 0, ship.stats.crewMax);
  }
  assertFinite(state.defense.timeToAttack, '방어 준비 시간', 0, 86_400);
  assertFinite(state.settlement.simulationMinutes, '정착지 시간', 0);
  assertFinite(
    state.settlement.residentUpdateCursor,
    '주민 갱신 커서',
    0,
    Math.max(0, state.settlement.residents.length)
  );
}
