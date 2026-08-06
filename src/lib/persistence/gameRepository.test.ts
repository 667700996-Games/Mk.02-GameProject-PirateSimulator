import { afterEach, describe, expect, it, vi } from 'vitest';
import { createNewGame, DEFAULT_SETTINGS } from '$lib/domain/initialState';
import type { SaveRecord } from '$lib/domain/types';
import { exportSave, importSave, listSaveBackups, loadSettings, recoverSaveState, removeSave, writeSave, writeSettings, type SaveBackupRecord } from './gameRepository';

function createGame() {
  return createNewGame(
    {
      captainName: '기록관',
      crewName: '잉크 해적단',
      shipName: '복구의 돛',
      flagMark: '✦',
      flagColor: '#202a2e',
      trait: 'architect',
      difficulty: 'story',
      seed: 77
    },
    1_000
  );
}

afterEach(() => {
  localStorage.clear();
  vi.useRealTimers();
});

describe('portable saves and settings', () => {
  it('exports and imports the complete versioned settlement state', () => {
    const original = createGame();
    original.settlement.prisoners = 3;
    original.settlement.buildings[0].outputInventory.gold = 913;
    const restored = importSave(exportSave(original));
    expect(restored.version).toBe(4);
    expect(restored.saveId).toBe(original.saveId);
    expect(restored.settlement.prisoners).toBe(3);
    expect(restored.settlement.buildings[0].outputInventory.gold).toBe(913);
    expect(() => importSave('{"format":"unknown"}')).toThrow('지원하지 않는');
  });

  it('merges partial settings and recovers from corrupted local storage', () => {
    writeSettings({ ...structuredClone(DEFAULT_SETTINGS), uiScale: 'large', highContrast: true });
    expect(loadSettings().uiScale).toBe('large');
    expect(loadSettings().highContrast).toBe(true);
    localStorage.setItem('blackwake-settings-v1', '{broken');
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps only the three newest rolling recovery points', async () => {
    const game = createGame();
    await removeSave(game.saveId);
    vi.useFakeTimers();
    for (let index = 0; index < 5; index += 1) {
      vi.setSystemTime(10_000 + index * 1_000);
      game.playTimeSeconds = index;
      await writeSave(game);
    }
    const backups = await listSaveBackups(game.saveId);
    expect(backups).toHaveLength(3);
    expect(backups.map((backup) => backup.playTimeSeconds)).toEqual([3, 2, 1]);
    await removeSave(game.saveId);
    expect(await listSaveBackups(game.saveId)).toHaveLength(0);
  });

  it('selects a valid recovery point when the primary record fails integrity', () => {
    const game = createGame();
    const record = (state = game): SaveRecord => ({
      id: game.saveId, name: game.saveName, version: game.version, updatedAt: 2_000,
      playTimeSeconds: state.playTimeSeconds, captainName: game.captain.name,
      shipName: game.ships[0].name, havenTier: game.haven.tier, state
    });
    const corrupt = { ...record(structuredClone(game)), integrity: 'fnv1a-corrupt' };
    const backup: SaveBackupRecord = { ...record(structuredClone(game)), id: 'backup-1', saveId: game.saveId, updatedAt: 1_000 };
    const recovered = recoverSaveState(corrupt, [backup]);
    expect(recovered.recovered).toBe(true);
    expect(recovered.state?.captain.name).toBe('기록관');
  });

  it('rejects oversized portable save files before parsing', () => {
    expect(() => importSave('x'.repeat(8 * 1024 * 1024 + 1))).toThrow('8MB');
  });
});
