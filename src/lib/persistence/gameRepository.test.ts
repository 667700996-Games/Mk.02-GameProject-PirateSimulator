import { afterEach, describe, expect, it } from 'vitest';
import { createNewGame, DEFAULT_SETTINGS } from '$lib/domain/initialState';
import { exportSave, importSave, loadSettings, writeSettings } from './gameRepository';

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

afterEach(() => localStorage.clear());

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
});
