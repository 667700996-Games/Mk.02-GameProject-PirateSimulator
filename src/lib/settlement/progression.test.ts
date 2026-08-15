import { describe, expect, it } from 'vitest';
import { createInitialSettlement } from './initialState';
import { enactPolicy, policyModifiers, unlockProgression } from './progression';

describe('progression and policy commands', () => {
  it('rejects unknown, duplicate, gated and unaffordable progression nodes', () => {
    const state = createInitialSettlement(61, 1000);

    expect(unlockProgression(state, 'missing-node')).toMatchObject({
      state,
      ok: false,
      reason: '발전 항목을 찾을 수 없습니다.'
    });
    expect(unlockProgression(state, 'seamanship-docks')).toMatchObject({
      state,
      ok: false,
      reason: '이미 해금한 발전입니다.'
    });
    expect(unlockProgression(state, 'seamanship-expeditions')).toMatchObject({
      state,
      ok: false,
      reason: '선행 발전이 필요합니다.'
    });
    expect(unlockProgression(state, 'prosperity-foundry')).toMatchObject({
      state,
      ok: false,
      reason: '5 발전점이 더 필요합니다.'
    });
  });

  it('deducts the correct axis points without mutating the source state', () => {
    const state = createInitialSettlement(62, 1000);
    const unlocked = unlockProgression(state, 'seamanship-shipyard');

    expect(unlocked.ok).toBe(true);
    expect(unlocked.state.progression.unlocked).toContain('seamanship-shipyard');
    expect(unlocked.state.progression.points.seamanship).toBe(0);
    expect(state.progression.points.seamanship).toBe(6);
    expect(state.progression.unlocked).not.toContain('seamanship-shipyard');
  });

  it('changes only the selected policy category and ignores unknown laws', () => {
    const state = createInitialSettlement(63, 1000);
    const unchanged = enactPolicy(state, 'unknown-law');
    const merit = enactPolicy(state, 'battle-merit');
    const rationed = enactPolicy(merit, 'worker-rations');

    expect(unchanged).toBe(state);
    expect(merit.policies.active.loot).toBe('battle-merit');
    expect(merit.policies.active.food).toBe(state.policies.active.food);
    expect(rationed.policies.active.loot).toBe('battle-merit');
    expect(rationed.policies.active.food).toBe('worker-rations');
    expect(state.policies.active.loot).toBe('equal-shares');
  });

  it('applies the remaining policy trade-offs and the council civic bonus', () => {
    let state = createInitialSettlement(64, 1000);
    state = enactPolicy(state, 'battle-merit');
    state = enactPolicy(state, 'merit-pay');
    state = enactPolicy(state, 'worker-rations');
    state = enactPolicy(state, 'smuggler-favor');
    const withoutCouncil = policyModifiers(state);
    const civicState = createInitialSettlement(65, 1000);
    const civicBaseline = policyModifiers(civicState);
    const councilState = structuredClone(civicState);
    councilState.progression.unlocked.push('federation-council');
    const withCouncil = policyModifiers(councilState);

    expect(withoutCouncil.pirateExperience).toBeGreaterThan(1);
    expect(withoutCouncil.laborerMoralePerHour).toBeLessThan(0);
    expect(withoutCouncil.skilledProduction).toBeGreaterThan(1);
    expect(withoutCouncil.wageGoldPerResident).toBeGreaterThan(0);
    expect(withoutCouncil.workerFatigueRecovery).toBeGreaterThan(0);
    expect(withoutCouncil.officerMoralePerHour).toBeLessThan(0);
    expect(withoutCouncil.tradePrice).toBeGreaterThan(1);
    expect(withoutCouncil.patrolRisk).toBeGreaterThan(1);
    expect(withCouncil.loyaltyPerHour).toBeGreaterThan(civicBaseline.loyaltyPerHour);
    expect(withCouncil.moralePerHour).toBeGreaterThan(civicBaseline.moralePerHour);
  });
});
