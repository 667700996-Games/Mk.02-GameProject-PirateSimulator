import { clamp } from './physics';
import type { BoardingState, CaptainTrait, Ship } from './types';

export type BoardingAction = 'charge' | 'flank' | 'captain' | 'magazine' | 'intimidate' | 'retreat';

export interface BoardingRoundResult {
  state: BoardingState;
  playerCasualties: number;
  enemyCasualties: number;
  message: string;
}

export function beginBoarding(player: Ship, enemy: Ship, committedCrew: number, trait: CaptainTrait): BoardingState {
  const committed = Math.max(4, Math.min(committedCrew, Math.max(4, player.crew - 3)));
  const moraleBonus = 0.65 + player.morale / 100;
  const traitBonus = trait === 'agitator' ? 1.08 : trait === 'raider' ? 1.05 : 1;
  const playerStrength = committed * moraleBonus * traitBonus * (1 + (1 - enemy.hull / enemy.stats.hullMax) * 0.18);
  const enemyStrength = enemy.crew * (0.55 + enemy.morale / 100) * (0.88 + enemy.hull / enemy.stats.hullMax * 0.12);
  return {
    active: true,
    enemyShip: structuredClone(enemy),
    committedCrew: committed,
    playerStrength,
    enemyStrength,
    round: 1,
    log: [`갈고리가 걸렸다. ${committed}명의 선원이 적선으로 뛰어든다.`]
  };
}

export function resolveBoardingRound(state: BoardingState, action: BoardingAction, random: () => number): BoardingRoundResult {
  if (!state.active || state.outcome || !state.enemyShip) return { state, playerCasualties: 0, enemyCasualties: 0, message: '승선 전투가 진행 중이 아닙니다.' };
  if (action === 'retreat') {
    const next = { ...state, active: false, outcome: 'retreat' as const, log: [...state.log, '갈고리를 끊고 본선으로 후퇴했다.'] };
    return { state: next, playerCasualties: 0, enemyCasualties: 0, message: '후퇴했다.' };
  }

  const modifiers: Record<Exclude<BoardingAction, 'retreat'>, { attack: number; risk: number; morale: number; label: string }> = {
    charge: { attack: 1.15, risk: 1.15, morale: 0, label: '정면 돌격' },
    flank: { attack: 1.05, risk: 0.78, morale: 0, label: '측면 침투' },
    captain: { attack: 0.92, risk: 1.02, morale: 0.22, label: '적 선장 집중 공격' },
    magazine: { attack: 1.28, risk: 1.35, morale: 0.08, label: '화약고 점거' },
    intimidate: { attack: 0.72, risk: 0.58, morale: 0.42, label: '항복 유도' }
  };
  const choice = modifiers[action];
  const playerRoll = state.playerStrength * choice.attack * (0.76 + random() * 0.48);
  const enemyRoll = state.enemyStrength * (0.76 + random() * 0.48);
  const enemyCasualties = Math.max(1, Math.round((playerRoll / Math.max(enemyRoll, 1)) * 2.4 + random() * 2));
  const playerCasualties = Math.max(0, Math.round((enemyRoll / Math.max(playerRoll, 1)) * 1.7 * choice.risk + random() * 1.6 - 0.8));
  const enemyStrength = Math.max(0, state.enemyStrength - enemyCasualties * (1.35 + choice.morale));
  const playerStrength = Math.max(0, state.playerStrength - playerCasualties * 1.65);
  const enemyCrew = Math.max(0, state.enemyShip.crew - enemyCasualties);
  const playerCommitted = Math.max(0, state.committedCrew - playerCasualties);
  const outcome = enemyStrength <= 4 || enemyCrew <= 0 ? 'victory' : playerStrength <= 4 || playerCommitted <= 2 ? 'defeat' : undefined;
  const message = `${choice.label}: 적 ${enemyCasualties}명, 아군 ${playerCasualties}명 손실.`;
  const next: BoardingState = {
    ...state,
    active: outcome === undefined,
    playerStrength,
    enemyStrength,
    committedCrew: playerCommitted,
    round: state.round + 1,
    enemyShip: { ...state.enemyShip, crew: enemyCrew, morale: clamp(state.enemyShip.morale - enemyCasualties * (1.1 + choice.morale), 0, 100) },
    log: [...state.log, message],
    outcome
  };
  return { state: next, playerCasualties, enemyCasualties, message };
}
