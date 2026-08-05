import { describe, expect, it } from 'vitest';
import { captainCandidate, assignCaptain, issueFleetOrder, updateFleetAssignments, claimFleetAssignment, setFleetFormation } from './fleet';
import { createNewGame } from './initialState';
import { createEnemyShip } from './voyage';

function fleetGame() {
  const game = createNewGame({ captainName: '제독', crewName: '검은 함대', shipName: '기함', flagMark: '♛', flagColor: '#111', trait: 'admiral', difficulty: 'captain', seed: 40 }, 1000);
  const prize = { ...createEnemyShip('beginners-bay', 'merchant', 2), id: 'prize', isCaptured: true, crew: 8, hull: 120 };
  const captain = { ...captainCandidate(9), id: 'subcaptain', loyalty: 90, ambition: 20 };
  return { ...game, ships: [...game.ships, prize], officers: [...game.officers, captain] };
}

describe('fleet operations', () => {
  it('assigns a captain and resolves an independent order', () => {
    let game = assignCaptain(fleetGame(), 'subcaptain', 'prize');
    game = setFleetFormation(game, 'wolf-pack');
    game = issueFleetOrder(game, 'prize', 'raid', 'beginners-bay', 1000);
    expect(game.fleet.assignments).toHaveLength(1);
    game = updateFleetAssignments(game, 1_000_000);
    expect(['complete', 'failed']).toContain(game.fleet.assignments[0].status);
  });

  it('claims completed expedition rewards', () => {
    let game = assignCaptain(fleetGame(), 'subcaptain', 'prize');
    game = issueFleetOrder(game, 'prize', 'escort', 'beginners-bay', 1000);
    game.fleet.assignments[0] = { ...game.fleet.assignments[0], status: 'complete', reward: { gold: 100 } };
    const next = claimFleetAssignment(game, game.fleet.assignments[0].id);
    expect(next.resources.gold).toBe(game.resources.gold + 100);
    expect(next.fleet.assignments).toHaveLength(0);
  });
});
