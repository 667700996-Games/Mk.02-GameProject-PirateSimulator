import { derived, get, writable } from 'svelte/store';
import { createNewGame, DEFAULT_SETTINGS } from '$lib/domain/initialState';
import { createId } from '$lib/domain/rng';
import { advanceSimulation } from '$lib/domain/simulation';
import type { GameScreen, GameSettings, GameState, NewGameOptions, SaveRecord, ToastMessage } from '$lib/domain/types';
import { listSaves, loadSettings, readSave, removeSave, writeSave, writeSettings } from '$lib/persistence/gameRepository';

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
  autoSaveTimer = setTimeout(() => void saveCurrent('자동 저장됨'), delay);
}

async function refreshSaves(): Promise<void> {
  const saves = await listSaves();
  session.update((current) => ({ ...current, saves }));
}

async function initialize(): Promise<void> {
  try {
    const [saves] = await Promise.all([listSaves()]);
    session.set({ ready: true, game: null, settings: loadSettings(), saves, saving: false });
  } catch (error) {
    session.set({ ...initial, ready: true, error: error instanceof Error ? error.message : '저장소를 열지 못했습니다.' });
  }
}

function startNewGame(options: NewGameOptions): void {
  const game = createNewGame(options);
  session.update((current) => ({ ...current, game, error: undefined }));
  scheduleAutoSave(200);
}

async function load(id: string): Promise<void> {
  try {
    const game = await readSave(id);
    if (!game) throw new Error('저장 슬롯을 찾을 수 없습니다.');
    session.update((current) => ({ ...current, game, error: undefined }));
  } catch (error) {
    session.update((current) => ({ ...current, error: error instanceof Error ? error.message : '불러오기에 실패했습니다.' }));
  }
}

async function saveCurrent(toastDetail = '항해 기록을 안전하게 보관했습니다.'): Promise<void> {
  const current = get(session);
  if (!current.game) return;
  if (current.saving) {
    await new Promise((resolve) => setTimeout(resolve, 80));
    return saveCurrent(toastDetail);
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
    addToast('success', '항해일지', toastDetail);
  } catch (error) {
    session.update((value) => ({ ...value, saving: false, error: error instanceof Error ? error.message : '저장에 실패했습니다.' }));
  }
}

async function deleteSave(id: string): Promise<void> {
  await removeSave(id);
  await refreshSaves();
}

function setScreen(screen: GameScreen): void {
  updateGame((game) => ({ ...game, previousScreen: game.screen, screen }));
}

function returnToTitle(): void {
  session.update((current) => ({ ...current, game: null }));
}

function setPaused(paused: boolean): void {
  updateGame((game) => ({ ...game, paused }));
}

function tickPlayTime(seconds: number): void {
  updateGame((game) => advanceSimulation(game, seconds));
}

function updateSettings(patch: Partial<GameSettings>): void {
  session.update((current) => {
    const settings = { ...current.settings, ...patch, keyBindings: patch.keyBindings ?? current.settings.keyBindings };
    writeSettings(settings);
    return { ...current, settings };
  });
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
  scheduleAutoSave
};

export const activeGame = derived(session, ($session) => $session.game);
export const activeShip = derived(session, ($session) => $session.game?.ships.find((ship) => ship.id === $session.game?.activeShipId));
export const gameSettings = derived(session, ($session) => $session.settings);
