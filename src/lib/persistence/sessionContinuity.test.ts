import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ACTIVE_GAME_SESSION_KEY,
  readSessionValue,
  writeSessionValue
} from './sessionContinuity';

describe('same-tab session continuity', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it('writes, reads and clears the active session marker', () => {
    writeSessionValue(ACTIVE_GAME_SESSION_KEY, 'save-anne');
    expect(readSessionValue(ACTIVE_GAME_SESSION_KEY)).toBe('save-anne');
    writeSessionValue(ACTIVE_GAME_SESSION_KEY);
    expect(readSessionValue(ACTIVE_GAME_SESSION_KEY)).toBeUndefined();
  });

  it('degrades safely when browser storage is unavailable', () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => {
        throw new DOMException('blocked');
      },
      setItem: () => {
        throw new DOMException('blocked');
      },
      removeItem: () => {
        throw new DOMException('blocked');
      }
    });

    expect(readSessionValue(ACTIVE_GAME_SESSION_KEY)).toBeUndefined();
    expect(() => writeSessionValue(ACTIVE_GAME_SESSION_KEY, 'save-anne')).not.toThrow();
    expect(() => writeSessionValue(ACTIVE_GAME_SESSION_KEY)).not.toThrow();
  });
});
