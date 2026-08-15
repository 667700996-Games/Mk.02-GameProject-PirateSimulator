import { describe, expect, it } from 'vitest';
import { campaignObjectives, evaluateCampaign } from './campaign';
import { createNewGame } from './initialState';

function matureKingdom() {
  const game = createNewGame({
    captainName: '군도 군주', crewName: '자유 연방', shipName: '첫 깃발', flagMark: '♛',
    flagColor: '#151515', trait: 'architect', difficulty: 'captain', seed: 701
  }, 1000);
  const residentTemplate = game.settlement.residents[0];
  game.settlement.residents = Array.from({ length: 120 }, (_, index) => ({
    ...structuredClone(residentTemplate), id: `kingdom-resident-${index}`, name: `시민 ${index + 1}`,
    homeId: undefined, workplaceId: undefined
  }));
  const buildingTemplate = game.settlement.buildings.find((building) => building.definitionId === 'tent')!;
  game.settlement.buildings = Array.from({ length: 36 }, (_, index) => ({
    ...structuredClone(buildingTemplate), id: `kingdom-building-${index}`, workers: [],
    definitionId: index < 6 ? (['bridge', 'stairs', 'ramp', 'cargo-lift', 'zipline-post', 'cliff-platform'][index] as typeof buildingTemplate.definitionId) : 'tent',
    x: 4 + (index % 12), y: 4 + Math.floor(index / 12), state: 'ACTIVE' as const
  }));
  game.ships = Array.from({ length: 4 }, (_, index) => ({
    ...structuredClone(game.ships[0]), id: `kingdom-ship-${index}`, name: `검은 함선 ${index + 1}`,
    class: index === 0 ? 'frigate' as const : game.ships[0].class,
    isFlagship: index === 0
  }));
  game.activeShipId = game.ships[0].id;
  game.settlement.expeditions = Array.from({ length: 6 }, (_, index) => ({
    id: `kingdom-expedition-${index}`, name: `군도 원정 ${index + 1}`, state: 'COMPLETED' as const,
    zoneId: index === 5 ? 'legend-sea' as const : 'beginners-bay' as const, purpose: 'explore' as const,
    shipIds: [], captainIds: [], crewIds: [], supplies: {}, cargo: {}, routeProgress: 1,
    durationHours: 24, risk: 30, morale: 80, log: []
  }));
  for (const zone of Object.values(game.world.zones)) zone.discovered = true;
  game.settlement.progression.unlocked.push('infamy-linebreaker', 'prosperity-galleon', 'seamanship-legendary', 'federation-captains');
  game.flags.havenDefenseWon = true;
  game.flags.storyArcComplete = true;
  return game;
}

describe('campaign endgame', () => {
  it('publishes explicit long-term objectives and declares a persistent victory', () => {
    const game = matureKingdom();
    expect(campaignObjectives(game).every((objective) => objective.complete)).toBe(true);
    const victory = evaluateCampaign(game, 5000);
    expect(victory.flags.campaignVictory).toBe(true);
    expect(victory.flags.campaignVictoryAcknowledged).toBe(false);
    expect(victory.toasts.at(-1)?.title).toContain('해적 왕국');
    expect(evaluateCampaign(victory, 6000).toasts).toHaveLength(victory.toasts.length);
  });
});
