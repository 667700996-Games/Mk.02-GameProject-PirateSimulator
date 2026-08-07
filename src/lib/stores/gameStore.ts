import { derived, get, writable } from 'svelte/store';
import { createNewGame, DEFAULT_SETTINGS } from '$lib/domain/initialState';
import { createId } from '$lib/domain/rng';
import { advanceSimulation } from '$lib/domain/simulation';
import type { GameScreen, GameSettings, GameState, NewGameOptions, SaveRecord, ToastMessage } from '$lib/domain/types';
import { exportSave as serializeSave, importSave as deserializeSave, listSaves, loadSettings, readSave, removeSave, writeSave, writeSettings } from '$lib/persistence/gameRepository';
import { ACTIVE_GAME_SESSION_KEY, readSessionValue, writeSessionValue } from '$lib/persistence/sessionContinuity';

interface SessionState {
  ready: boolean;
  game: GameState | null;
  settings: GameSettings;
  saves: SaveRecord[];
  saving: boolean;
  error?: string;
}

const initial: SessionState = {
  ready: false,
  game: null,
  settings: structuredClone(DEFAULT_SETTINGS),
  saves: [],
  saving: false
};

const session = writable<SessionState>(initial);
let autoSaveTimer: ReturnType<typeof setTimeout> | undefined;
let periodicAutoSaveSeconds = 0;

function readActiveSessionId(): string | undefined {
  return readSessionValue(ACTIVE_GAME_SESSION_KEY);
}

function writeActiveSessionId(saveId?: string): void {
  writeSessionValue(ACTIVE_GAME_SESSION_KEY, saveId);
}

function updateGame(mutator: (state: GameState) => GameState, autosave = false): void {
  session.update((current) => {
    if (!current.game) return current;
    return { ...current, game: mutator(current.game) };
  });
  if (autosave) scheduleAutoSave();
}

function addToast(kind: ToastMessage['kind'], title: string, detail: string): void {
  updateGame((game) => ({
    ...game,
    toasts: [...game.toasts.slice(-3), { id: createId('toast'), kind, title, detail, createdAt: Date.now() }]
  }));
}

function dismissToast(id: string): void {
  updateGame((game) => ({ ...game, toasts: game.toasts.filter((toast) => toast.id !== id) }));
}

function scheduleAutoSave(delay = 900): void {
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => void saveCurrent('자동 저장됨', true), delay);
}

async function refreshSaves(): Promise<void> {
  const saves = await listSaves();
  session.update((current) => ({ ...current, saves }));
}

async function initialize(): Promise<void> {
  try {
    const [saves] = await Promise.all([listSaves()]);
    const activeId = readActiveSessionId();
    let activeGame: GameState | null = null;
    if (activeId) {
      try {
        activeGame = (await readSave(activeId)) ?? null;
      } catch {
        activeGame = null;
      }
      if (!activeGame) writeActiveSessionId();
    }
    session.set({ ready: true, game: activeGame, settings: loadSettings(), saves, saving: false });
  } catch (error) {
    session.set({ ...initial, ready: true, error: error instanceof Error ? error.message : '저장소를 열지 못했습니다.' });
  }
}

function startNewGame(options: NewGameOptions): void {
  const game = createNewGame(options);
  session.update((current) => ({ ...current, game, error: undefined }));
  writeActiveSessionId(game.saveId);
  periodicAutoSaveSeconds = 0;
  scheduleAutoSave(0);
}

async function load(id: string): Promise<void> {
  try {
    const game = await readSave(id);
    if (!game) throw new Error('저장 슬롯을 찾을 수 없습니다.');
    session.update((current) => ({ ...current, game, error: undefined }));
    writeActiveSessionId(game.saveId);
    periodicAutoSaveSeconds = 0;
  } catch (error) {
    session.update((current) => ({ ...current, error: error instanceof Error ? error.message : '불러오기에 실패했습니다.' }));
  }
}

async function saveCurrent(toastDetail = '항해 기록을 안전하게 보관했습니다.', silent = false): Promise<void> {
  const current = get(session);
  if (!current.game) return;
  if (current.saving) {
    await new Promise((resolve) => setTimeout(resolve, 80));
    return saveCurrent(toastDetail, silent);
  }
  session.update((value) => ({ ...value, saving: true }));
  try {
    const record = await writeSave(current.game);
    session.update((value) => ({
      ...value,
      saving: false,
      game: value.game ? { ...value.game, lastSavedAt: record.updatedAt } : null,
      saves: [record, ...value.saves.filter((save) => save.id !== record.id)]
    }));
    if (!silent) addToast('success', '항해일지', toastDetail);
  } catch (error) {
    session.update((value) => ({ ...value, saving: false, error: error instanceof Error ? error.message : '저장에 실패했습니다.' }));
  }
}

async function deleteSave(id: string): Promise<void> {
  await removeSave(id);
  if (readActiveSessionId() === id) writeActiveSessionId();
  await refreshSaves();
}

function setScreen(screen: GameScreen): void {
  updateGame((game) => ({ ...game, previousScreen: game.screen, screen }));
}

function returnToTitle(): void {
  periodicAutoSaveSeconds = 0;
  writeActiveSessionId();
  session.update((current) => ({ ...current, game: null }));
}

function setPaused(paused: boolean): void {
  updateGame((game) => ({ ...game, paused }));
}

function tickPlayTime(seconds: number): void {
  updateGame((game) => advanceSimulation(game, seconds));
  if (!get(session).game) return;
  periodicAutoSaveSeconds += seconds;
  if (periodicAutoSaveSeconds >= 300) {
    periodicAutoSaveSeconds = 0;
    scheduleAutoSave(0);
  }
}

function updateSettings(patch: Partial<GameSettings>): void {
  session.update((current) => {
    const settings = { ...current.settings, ...patch, keyBindings: patch.keyBindings ?? current.settings.keyBindings };
    writeSettings(settings);
    return { ...current, settings };
  });
}

function exportCurrent(): string | undefined {
  const game = get(session).game;
  return game ? serializeSave(game) : undefined;
}

async function importSerialized(serialized: string): Promise<void> {
  try {
    const game = deserializeSave(serialized);
    const record = await writeSave(game, game.saveName);
    session.update((current) => ({ ...current, game: record.state, error: undefined, saves: [record, ...current.saves.filter((save) => save.id !== record.id)] }));
    writeActiveSessionId(record.id);
  } catch (error) {
    session.update((current) => ({ ...current, error: error instanceof Error ? error.message : '저장 파일을 가져오지 못했습니다.' }));
  }
}

function dismissError(): void {
  session.update((current) => ({ ...current, error: undefined }));
}

export const gameSession = {
  subscribe: session.subscribe,
  initialize,
  startNewGame,
  load,
  saveCurrent,
  deleteSave,
  updateGame,
  addToast,
  dismissToast,
  setScreen,
  returnToTitle,
  setPaused,
  tickPlayTime,
  updateSettings,
  exportCurrent,
  importSerialized,
  dismissError,
  scheduleAutoSave
};

export const activeGame = derived(session, ($session) => $session.game);
export const activeShip = derived(session, ($session) => $session.game?.ships.find((ship) => ship.id === $session.game?.activeShipId));
export const gameSettings = derived(session, ($session) => $session.settings);
