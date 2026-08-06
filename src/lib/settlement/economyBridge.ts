import type { GameState, ResourceId, ResourceStock } from '$lib/domain/types';
import { availableSettlementInventory, creditSettlementResources } from './construction';
import { settlementLegacyResources } from './summary';
import type { PartialSettlementInventory, SettlementResourceId, SettlementSimulationState } from './types';

const RESOURCE_CHANNELS: Partial<Record<ResourceId, SettlementResourceId[]>> = {
  gold: ['gold'],
  timber: ['planks', 'logs'],
  iron: ['iron-ingots', 'iron-ore'],
  stone: ['stone-blocks', 'stone'],
  powder: ['powder'],
  cannonballs: ['cannonballs'],
  cloth: ['cloth'],
  rope: ['rope'],
  food: ['hardtack', 'fish-stew', 'meat-dish', 'fish', 'fruit'],
  rum: ['rum', 'aged-rum'],
  medicine: ['medicine', 'rare-medicine'],
  spices: ['spices'],
  blueprints: ['rare-blueprints'],
  relics: ['ancient-relics'],
  gems: ['jeweled-ornaments'],
  bullion: ['silver', 'royal-coins'],
  contraband: ['royal-equipment']
};

const CREDIT_RESOURCE: Record<ResourceId, SettlementResourceId> = {
  gold: 'gold', timber: 'planks', iron: 'iron-ingots', stone: 'stone-blocks', powder: 'powder', cannonballs: 'cannonballs',
  cloth: 'cloth', rope: 'rope', food: 'hardtack', rum: 'rum', medicine: 'medicine', spices: 'spices', gems: 'jeweled-ornaments',
  bullion: 'silver', contraband: 'royal-equipment', blueprints: 'rare-blueprints', relics: 'ancient-relics'
};

function channelAmount(inventory: PartialSettlementInventory, id: ResourceId): number {
  return (RESOURCE_CHANNELS[id] ?? []).reduce((sum, resource) => sum + (inventory[resource] ?? 0), 0);
}

export function canAffordGameResources(state: GameState, cost: Partial<ResourceStock>): boolean {
  const available = availableSettlementInventory(state.settlement);
  return (Object.entries(cost) as [ResourceId, number][]).every(([id, required]) => channelAmount(available, id) >= required);
}

function debitFromInventory(inventory: PartialSettlementInventory, resource: SettlementResourceId, amount: number): number {
  const stored = inventory[resource] ?? 0;
  const spent = Math.min(stored, amount);
  inventory[resource] = stored - spent;
  return amount - spent;
}

function debitSettlementChannel(state: SettlementSimulationState, id: ResourceId, required: number): void {
  let remaining = required;
  for (const resource of RESOURCE_CHANNELS[id] ?? []) {
    remaining = debitFromInventory(state.looseInventory, resource, remaining);
    if (remaining <= 0) return;
    for (const building of state.buildings) {
      if (remaining <= 0) return;
      const reserved = building.reservedInventory[resource] ?? 0;
      const stored = building.outputInventory[resource] ?? 0;
      const spendable = Math.max(0, stored - reserved);
      const spent = Math.min(spendable, remaining);
      building.outputInventory[resource] = stored - spent;
      remaining -= spent;
    }
  }
}

export function spendGameResources(state: GameState, cost: Partial<ResourceStock>): GameState | undefined {
  if (!canAffordGameResources(state, cost)) return undefined;
  const settlement = structuredClone(state.settlement);
  for (const [id, required] of Object.entries(cost) as [ResourceId, number][]) debitSettlementChannel(settlement, id, required);
  return { ...state, settlement, resources: settlementLegacyResources(settlement, state.resources) };
}

export function creditGameResources(state: GameState, reward: Partial<ResourceStock>): GameState {
  const mapped: PartialSettlementInventory = {};
  for (const [id, value] of Object.entries(reward) as [ResourceId, number][]) {
    if (!Number.isFinite(value) || value <= 0) continue;
    const target = CREDIT_RESOURCE[id];
    mapped[target] = (mapped[target] ?? 0) + value;
  }
  const settlement = creditSettlementResources(state.settlement, mapped);
  return { ...state, settlement, resources: settlementLegacyResources(settlement, state.resources) };
}
