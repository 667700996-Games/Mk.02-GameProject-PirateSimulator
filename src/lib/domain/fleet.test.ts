import { describe, expect, it } from 'vitest';
import { captainCandidate, assignCaptain, issueFleetOrder, updateFleetAssignments, claimFleetAssignment, fleetDefensePower, hireCaptain, setFleetFormation } from './fleet';
import { createNewGame } from './initialState';
import { hashString, mulberry32 } from './rng';
import { createEnemyShip } from './voyage';

function fleetGame() {
  const game = createNewGame({ captainName: '제독', crewName: '검은 함대', shipName: '기함', flagMark: '♛', flagColor: '#111', trait: 'admiral', difficulty: 'captain', seed: 40 }, 1000);
  const prize = { ...createEnemyShip('beginners-bay', 'merchant', 2), id: 'prize', isCaptured: true, crew: 8, hull: 120 };
  const captain = { ...captainCandidate(9), id: 'subcaptain', loyalty: 90, ambition: 20 };
  return { ...game, ships: [...game.ships, prize], officers: [...game.officers, captain] };
}

describe('fleet operations', () => {
  it('gives admirals the advertised fleet defense efficiency', () => {
    const admiral = fleetGame();
    const navigator = structuredClone(admiral);
    navigator.captain.trait = 'navigator';
    expect(fleetDefensePower(admiral)).toBeGreaterThan(fleetDefensePower(navigator));
  });

  it('assigns a captain and resolves an independent order', () => {
    let game = assignCaptain(fleetGame(), 'subcaptain', 'prize');
    game = setFleetFormation(game, 'wolf-pack');
    game = issueFleetOrder(game, 'prize', 'raid', 'beginners-bay', 1000);
    expect(game.fleet.assignments).toHaveLength(1);
    game = updateFleetAssignments(game, 1_000_000);
    expect(['complete', 'failed']).toContain(game.fleet.assignments[0].status);
  });

  it('charges authoritative gold once when hiring a unique captain', () => {
    const game = fleetGame();
    const candidate = { ...captainCandidate(72), id: 'new-captain' };
    const hired = hireCaptain(game, candidate, 120);
    expect(hired.resources.gold).toBe(game.resources.gold - 120);
    expect(hired.officers).toContainEqual(expect.objectContaining({ id: 'new-captain', isCaptain: true }));
    expect(hireCaptain(hired, candidate, 120)).toBe(hired);
  });

  it('enforces one captain per ship and releases a replaced captain', () => {
    const game = fleetGame();
    const secondPrize = { ...game.ships[1], id: 'second-prize', captainId: undefined };
    const replacement = { ...captainCandidate(84), id: 'replacement' };
    let assigned = assignCaptain({ ...game, ships: [...game.ships, secondPrize], officers: [...game.officers, replacement] }, 'subcaptain', 'prize');

    const rejected = assignCaptain(assigned, 'subcaptain', 'second-prize');
    expect(rejected).toBe(assigned);
    assigned = assignCaptain(assigned, 'replacement', 'prize');
    expect(assigned.ships.find((ship) => ship.id === 'prize')?.captainId).toBe('replacement');
    expect(assigned.officers.find((officer) => officer.id === 'subcaptain')?.assignedShipId).toBeUndefined();
  });

  it('refuses orders from damaged ships and reports progress before resolution', () => {
    const game = assignCaptain(fleetGame(), 'subcaptain', 'prize');
    game.ships.find((ship) => ship.id === 'prize')!.sails = 0;
    expect(issueFleetOrder(game, 'prize', 'escort', 'beginners-bay', 1000)).toBe(game);

    game.ships.find((ship) => ship.id === 'prize')!.sails = game.ships.find((ship) => ship.id === 'prize')!.stats.sailMax;
    const ordered = issueFleetOrder(game, 'prize', 'escort', 'beginners-bay', 1000);
    const midpoint = (ordered.fleet.assignments[0].issuedAt + ordered.fleet.assignments[0].resolvesAt) / 2;
    const underway = updateFleetAssignments(ordered, midpoint);
    expect(underway.fleet.assignments[0]).toMatchObject({ status: 'underway', progress: 50 });
  });

  it('makes desertion permanently remove the disloyal captain and their ship', () => {
    let game = assignCaptain(fleetGame(), 'subcaptain', 'prize');
    game = issueFleetOrder(game, 'prize', 'raid', 'beginners-bay', 1000);
    game.officers.find((officer) => officer.id === 'subcaptain')!.loyalty = 0;
    game.officers.find((officer) => officer.id === 'subcaptain')!.ambition = 100;
    const assignment = game.fleet.assignments[0];
    const deterministicId = Array.from({ length: 500 }, (_, index) => `desert-${index}`).find((id) =>
      mulberry32(hashString(`${id}:${game.world.day}:${game.world.seed}`))() < .45
    )!;
    assignment.id = deterministicId;

    const deserted = updateFleetAssignments(game, assignment.resolvesAt + 1);
    expect(deserted.fleet.assignments[0].status).toBe('deserted');
    expect(deserted.ships.some((ship) => ship.id === 'prize')).toBe(false);
    expect(deserted.officers.some((officer) => officer.id === 'subcaptain')).toBe(false);
    expect(deserted.fleet.shipsLost).toBe(game.fleet.shipsLost + 1);
  });

  it('claims completed expedition rewards', () => {
    let game = assignCaptain(fleetGame(), 'subcaptain', 'prize');
    game = issueFleetOrder(game, 'prize', 'escort', 'beginners-bay', 1000);
    game.fleet.assignments[0] = { ...game.fleet.assignments[0], status: 'complete', reward: { gold: 100 } };
    const next = claimFleetAssignment(game, game.fleet.assignments[0].id);
    expect(next.resources.gold).toBe(game.resources.gold + 100);
    expect(next.fleet.assignments).toHaveLength(0);
  });

  it('closes failed assignments without inventing rewards', () => {
    let game = assignCaptain(fleetGame(), 'subcaptain', 'prize');
    game = issueFleetOrder(game, 'prize', 'escort', 'beginners-bay', 1000);
    game.fleet.assignments[0] = { ...game.fleet.assignments[0], status: 'failed', reward: {} };
    const next = claimFleetAssignment(game, game.fleet.assignments[0].id);
    expect(next.resources).toEqual(game.resources);
    expect(next.fleet.assignments).toHaveLength(0);
  });
});
