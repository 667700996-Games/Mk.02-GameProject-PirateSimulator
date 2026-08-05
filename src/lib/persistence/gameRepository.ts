import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { DEFAULT_SETTINGS } from '$lib/domain/initialState';
import { SAVE_VERSION, type GameSettings, type GameState, type SaveRecord } from '$lib/domain/types';
import { migrateGameState } from './migrations';

const DB_NAME = 'blackwake-pirate-simulator';
const DB_VERSION = 1;
const SETTINGS_KEY = 'blackwake-settings-v1';

interface PirateDatabase extends DBSchema {
  saves: {
    key: string;
    value: SaveRecord;
    indexes: { 'by-updated': number };
  };
}

let databasePromise: Promise<IDBPDatabase<PirateDatabase>> | undefined;
const memorySaves = new Map<string, SaveRecord>();

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
  const normalizedState = { ...state, version: SAVE_VERSION, lastSavedAt: updatedAt, saveName: name };
  const activeShip = normalizedState.ships.find((ship) => ship.id === normalizedState.activeShipId) ?? normalizedState.ships[0];
  const record: SaveRecord = {
    id: normalizedState.saveId,
    name,
    version: SAVE_VERSION,
    updatedAt,
    playTimeSeconds: normalizedState.playTimeSeconds,
    captainName: normalizedState.captain.name,
    shipName: activeShip.name,
    havenTier: normalizedState.haven.tier,
    state: structuredClone(normalizedState)
  };
  if (!hasIndexedDb()) memorySaves.set(record.id, record);
  else (await database()).put('saves', record);
  return record;
}

export async function readSave(id: string): Promise<GameState | undefined> {
  const record = hasIndexedDb() ? await (await database()).get('saves', id) : memorySaves.get(id);
  if (!record) return undefined;
  return migrateGameState(record.state);
}

export async function removeSave(id: string): Promise<void> {
  if (!hasIndexedDb()) memorySaves.delete(id);
  else await (await database()).delete('saves', id);
}

export function exportSave(state: GameState): string {
  return JSON.stringify({ format: 'blackwake-save', version: SAVE_VERSION, exportedAt: Date.now(), state }, null, 2);
}

export function importSave(serialized: string): GameState {
  const parsed = JSON.parse(serialized) as { format?: string; state?: unknown };
  if (parsed.format !== 'blackwake-save' || !parsed.state) throw new Error('지원하지 않는 저장 파일입니다.');
  return migrateGameState(parsed.state);
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
