import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { DEFAULT_SETTINGS } from '$lib/domain/initialState';
import { SAVE_VERSION, type GameSettings, type GameState, type SaveRecord } from '$lib/domain/types';
import { settlementSummary } from '$lib/settlement/summary';
import { migrateGameState } from './migrations';

const DB_NAME = 'blackwake-pirate-simulator';
const DB_VERSION = 2;
const SETTINGS_KEY = 'blackwake-settings-v1';
const MAX_IMPORT_BYTES = 8 * 1024 * 1024;
const MAX_BACKUPS = 3;

export interface SaveBackupRecord extends SaveRecord {
  saveId: string;
}

interface PirateDatabase extends DBSchema {
  saves: {
    key: string;
    value: SaveRecord;
    indexes: { 'by-updated': number };
  };
  backups: {
    key: string;
    value: SaveBackupRecord;
    indexes: { 'by-save': string; 'by-updated': number };
  };
}

let databasePromise: Promise<IDBPDatabase<PirateDatabase>> | undefined;
const memorySaves = new Map<string, SaveRecord>();
const memoryBackups = new Map<string, SaveBackupRecord>();

function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined';
}

function database(): Promise<IDBPDatabase<PirateDatabase>> {
  if (!databasePromise) {
    databasePromise = openDB<PirateDatabase>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('saves')) {
          const saves = db.createObjectStore('saves', { keyPath: 'id' });
          saves.createIndex('by-updated', 'updatedAt');
        }
        if (!db.objectStoreNames.contains('backups')) {
          const backups = db.createObjectStore('backups', { keyPath: 'id' });
          backups.createIndex('by-save', 'saveId');
          backups.createIndex('by-updated', 'updatedAt');
        }
      }
    });
  }
  return databasePromise;
}

export async function listSaves(): Promise<SaveRecord[]> {
  if (!hasIndexedDb()) return [...memorySaves.values()].sort((a, b) => b.updatedAt - a.updatedAt);
  const db = await database();
  return (await db.getAllFromIndex('saves', 'by-updated')).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function writeSave(state: GameState, name = state.saveName): Promise<SaveRecord> {
  const updatedAt = Date.now();
  const normalizedState = migrateGameState({ ...state, version: SAVE_VERSION, lastSavedAt: updatedAt, saveName: name });
  const activeShip = normalizedState.ships.find((ship) => ship.id === normalizedState.activeShipId) ?? normalizedState.ships[0];
  const record: SaveRecord = {
    id: normalizedState.saveId,
    name,
    version: SAVE_VERSION,
    updatedAt,
    playTimeSeconds: normalizedState.playTimeSeconds,
    captainName: normalizedState.captain.name,
    shipName: activeShip.name,
    havenTier: settlementSummary(normalizedState.settlement).tier,
    state: structuredClone(normalizedState),
    integrity: checksumState(normalizedState)
  };
  if (!hasIndexedDb()) {
    const previous = memorySaves.get(record.id);
    if (previous) memoryBackups.set(`${record.id}:${previous.updatedAt}`, { ...structuredClone(previous), id: `${record.id}:${previous.updatedAt}`, saveId: record.id });
    memorySaves.set(record.id, record);
    trimMemoryBackups(record.id);
  } else {
    const db = await database();
    const previous = await db.get('saves', record.id);
    const transaction = db.transaction(['saves', 'backups'], 'readwrite');
    if (previous) await transaction.objectStore('backups').put({ ...structuredClone(previous), id: `${record.id}:${previous.updatedAt}`, saveId: record.id });
    await transaction.objectStore('saves').put(record);
    await transaction.done;
    await trimIndexedBackups(record.id);
  }
  return record;
}

export async function readSave(id: string): Promise<GameState | undefined> {
  const record = hasIndexedDb() ? await (await database()).get('saves', id) : memorySaves.get(id);
  if (!record) return undefined;
  const backups = await listSaveBackups(id);
  const recovered = recoverSaveState(record, backups);
  if (!recovered.state) throw new Error('저장 파일과 복구 지점이 모두 손상되었습니다.');
  if (recovered.recovered && recovered.source) {
    const state = {
      ...recovered.state,
      flags: { ...recovered.state.flags, 'save-recovered': true },
      toasts: [...recovered.state.toasts, { id: `recovery-${Date.now()}`, kind: 'warning' as const, title: '항해일지 복구', detail: '손상된 저장 대신 최근 정상 복구 지점을 불러왔습니다.', createdAt: Date.now() }]
    };
    const repaired: SaveRecord = { ...recovered.source, id, state, integrity: checksumState(state) };
    if (hasIndexedDb()) await (await database()).put('saves', repaired);
    else memorySaves.set(id, repaired);
    return state;
  }
  return recovered.state;
}

export async function removeSave(id: string): Promise<void> {
  if (!hasIndexedDb()) {
    memorySaves.delete(id);
    for (const [backupId, backup] of memoryBackups) if (backup.saveId === id) memoryBackups.delete(backupId);
  } else {
    const db = await database();
    const transaction = db.transaction(['saves', 'backups'], 'readwrite');
    await transaction.objectStore('saves').delete(id);
    const backupKeys = await transaction.objectStore('backups').index('by-save').getAllKeys(id);
    await Promise.all(backupKeys.map((key) => transaction.objectStore('backups').delete(key)));
    await transaction.done;
  }
}

export async function listSaveBackups(id: string): Promise<SaveBackupRecord[]> {
  if (!hasIndexedDb()) return [...memoryBackups.values()].filter((backup) => backup.saveId === id).sort((a, b) => b.updatedAt - a.updatedAt);
  const records = await (await database()).getAllFromIndex('backups', 'by-save', id);
  return records.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function exportSave(state: GameState): string {
  return JSON.stringify({ format: 'blackwake-save', version: SAVE_VERSION, exportedAt: Date.now(), state }, null, 2);
}

export function importSave(serialized: string): GameState {
  const bytes = new TextEncoder().encode(serialized).byteLength;
  if (bytes > MAX_IMPORT_BYTES) throw new Error('저장 파일이 8MB 안전 한도를 초과했습니다.');
  const parsed = JSON.parse(serialized) as { format?: string; state?: unknown };
  if (parsed.format !== 'blackwake-save' || !parsed.state) throw new Error('지원하지 않는 저장 파일입니다.');
  return migrateGameState(parsed.state);
}

export function recoverSaveState(primary: SaveRecord | undefined, backups: SaveBackupRecord[]): { state?: GameState; source?: SaveRecord; recovered: boolean } {
  const candidates: SaveRecord[] = [...(primary ? [primary] : []), ...backups.sort((a, b) => b.updatedAt - a.updatedAt)];
  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    try {
      if (candidate.integrity && candidate.integrity !== checksumState(candidate.state)) continue;
      return { state: migrateGameState(candidate.state), source: candidate, recovered: index > 0 || !primary };
    } catch {
      // Try the next rolling recovery point.
    }
  }
  return { recovered: false };
}

function checksumState(state: GameState): string {
  const serialized = JSON.stringify(state);
  let hash = 2166136261;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function trimMemoryBackups(saveId: string): void {
  const backups = [...memoryBackups.values()].filter((backup) => backup.saveId === saveId).sort((a, b) => b.updatedAt - a.updatedAt);
  for (const backup of backups.slice(MAX_BACKUPS)) memoryBackups.delete(backup.id);
}

async function trimIndexedBackups(saveId: string): Promise<void> {
  const db = await database();
  const backups = (await db.getAllFromIndex('backups', 'by-save', saveId)).sort((a, b) => b.updatedAt - a.updatedAt);
  if (backups.length <= MAX_BACKUPS) return;
  const transaction = db.transaction('backups', 'readwrite');
  await Promise.all(backups.slice(MAX_BACKUPS).map((backup) => transaction.store.delete(backup.id)));
  await transaction.done;
}

export function loadSettings(): GameSettings {
  if (typeof localStorage === 'undefined') return structuredClone(DEFAULT_SETTINGS);
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (!stored) return structuredClone(DEFAULT_SETTINGS);
    const parsed = JSON.parse(stored) as Partial<GameSettings>;
    return {
      ...structuredClone(DEFAULT_SETTINGS),
      ...parsed,
      keyBindings: { ...DEFAULT_SETTINGS.keyBindings, ...parsed.keyBindings }
    };
  } catch {
    return structuredClone(DEFAULT_SETTINGS);
  }
}

export function writeSettings(settings: GameSettings): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
