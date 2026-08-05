import { RESOURCE_META } from './catalog';
import { clamp } from './physics';
import type { CaptainTrait, ResourceId, ResourceStock, SettlementState, Ship } from './types';

export function cargoWeight(cargo: Partial<ResourceStock>): number {
  return (Object.entries(cargo) as [ResourceId, number][]).reduce((sum, [id, amount]) => sum + RESOURCE_META[id].weight * Math.max(0, amount), 0);
}

export function cargoSpace(ship: Ship): number {
  return Math.max(0, ship.stats.cargoMax - cargoWeight(ship.cargo));
}

export function addCargo(ship: Ship, resource: ResourceId, requestedAmount: number): { ship: Ship; added: number } {
  const weight = RESOURCE_META[resource].weight;
  const allowed = weight === 0 ? requestedAmount : Math.floor(cargoSpace(ship) / weight);
  const added = Math.max(0, Math.min(requestedAmount, allowed));
  const cargo = { ...ship.cargo, [resource]: (ship.cargo[resource] ?? 0) + added };
  return { ship: { ...ship, cargo, cargoWeight: cargoWeight(cargo) }, added };
}

export function removeCargo(ship: Ship, resource: ResourceId, requestedAmount: number): { ship: Ship; removed: number } {
  const removed = Math.max(0, Math.min(requestedAmount, ship.cargo[resource] ?? 0));
  const cargo = { ...ship.cargo, [resource]: Math.max(0, (ship.cargo[resource] ?? 0) - removed) };
  return { ship: { ...ship, cargo, cargoWeight: cargoWeight(cargo) }, removed };
}

export function marketPrice(
  settlement: SettlementState,
  resource: ResourceId,
  mode: 'buy' | 'sell',
  marketCycle: number,
  attitude: number,
  trait?: CaptainTrait
): number {
  const listed = settlement.prices[resource] ?? RESOURCE_META[resource].basePrice;
  const fluctuation = 1 + Math.sin(marketCycle * 0.71 + resource.length * 1.37 + settlement.id.length) * 0.12;
  const attitudeFactor = clamp(1 - attitude / 500, 0.78, 1.25);
  const negotiatorFactor = trait === 'negotiator' ? (mode === 'buy' ? 0.9 : 1.1) : 1;
  const smugglerFactor = trait === 'smuggler' && RESOURCE_META[resource].illegal ? (mode === 'buy' ? 0.88 : 1.12) : 1;
  const spread = mode === 'buy' ? 1.12 : 0.78;
  return Math.max(1, Math.round(listed * fluctuation * attitudeFactor * negotiatorFactor * smugglerFactor * spread));
}

export function canTradeResource(settlement: SettlementState, resource: ResourceId): boolean {
  if (!RESOURCE_META[resource].illegal) return true;
  return settlement.type === 'freeport' || settlement.type === 'smuggler-hideout';
}

export function transferStock(stock: ResourceStock, costs: Partial<ResourceStock>, multiplier = -1): ResourceStock {
  const next = { ...stock };
  for (const [id, amount] of Object.entries(costs) as [ResourceId, number][]) {
    next[id] = Math.max(0, next[id] + amount * multiplier);
  }
  return next;
}

export function hasResources(stock: ResourceStock, costs: Partial<ResourceStock>): boolean {
  return (Object.entries(costs) as [ResourceId, number][]).every(([id, amount]) => stock[id] >= amount);
}
