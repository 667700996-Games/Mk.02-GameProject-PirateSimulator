export const ACTIVE_GAME_SESSION_KEY = 'blackwake-active-game-v1';
export const CAPTAIN_CREATION_SESSION_KEY = 'blackwake-captain-creation-v1';
export const CAPTAIN_DRAFT_SESSION_KEY = 'blackwake-captain-draft-v1';

export function readSessionValue(key: string): string | undefined {
  if (typeof sessionStorage === 'undefined') return undefined;
  try {
    return sessionStorage.getItem(key) ?? undefined;
  } catch {
    return undefined;
  }
}

export function writeSessionValue(key: string, value?: string): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    if (value === undefined) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    // Session continuity is best-effort when storage is unavailable.
  }
}
