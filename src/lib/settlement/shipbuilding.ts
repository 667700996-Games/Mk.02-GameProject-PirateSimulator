import { SHIP_CLASSES } from '$lib/domain/catalog';
import { createId } from '$lib/domain/rng';
import type { Ship, ShipClass, ShipUpgrades } from '$lib/domain/types';
import { aggregateInventory } from './construction';
import type { PartialSettlementInventory, SettlementResourceId, SettlementSimulationState, ShipConstructionOrder } from './types';

export interface ShipPlan {
  shipClass: ShipClass;
  name: string;
  durationMinutes: number;
  shipwrights: number;
  shipyardLevel: number;
  cost: PartialSettlementInventory;
  unlock?: string;
}

export const SHIP_PLANS: Partial<Record<ShipClass, ShipPlan>> = {
  boat: { shipClass: 'boat', name: '정찰 보트', durationMinutes: 55, shipwrights: 2, shipyardLevel: 1, cost: { planks: 14, rope: 5, cloth: 2, 'iron-ingots': 2, tools: 2 } },
  sloop: { shipClass: 'sloop', name: '연안 슬루프', durationMinutes: 110, shipwrights: 4, shipyardLevel: 1, cost: { planks: 30, rope: 10, sails: 2, 'iron-ingots': 5, 'ship-parts': 4, cannons: 2, 'navigation-tools': 1 } },
  schooner: { shipClass: 'schooner', name: '원정 스쿠너', durationMinutes: 175, shipwrights: 6, shipyardLevel: 2, cost: { planks: 46, rope: 14, sails: 3, 'iron-ingots': 9, 'ship-parts': 7, cannons: 4, 'navigation-tools': 2 }, unlock: 'seamanship-schooner' },
  brig: { shipClass: 'brig', name: '전투 브리그', durationMinutes: 260, shipwrights: 8, shipyardLevel: 3, cost: { planks: 70, rope: 20, sails: 4, 'iron-ingots': 16, 'ship-parts': 12, cannons: 8, 'navigation-tools': 3 }, unlock: 'seamanship-brig' },
  brigantine: { shipClass: 'brigantine', name: '약탈 브리간틴', durationMinutes: 330, shipwrights: 10, shipyardLevel: 3, cost: { planks: 92, rope: 26, sails: 5, 'iron-ingots': 22, 'ship-parts': 16, cannons: 12, 'navigation-tools': 4 }, unlock: 'infamy-raiders' },
  frigate: { shipClass: 'frigate', name: '해적 프리깃', durationMinutes: 480, shipwrights: 14, shipyardLevel: 4, cost: { planks: 145, rope: 38, sails: 8, 'iron-ingots': 38, 'ship-parts': 26, cannons: 22, 'precision-instruments': 2 }, unlock: 'seamanship-frigate' },
  galleon: { shipClass: 'galleon', name: '보물 갤리온', durationMinutes: 620, shipwrights: 18, shipyardLevel: 5, cost: { planks: 210, rope: 52, sails: 11, 'iron-ingots': 52, 'ship-parts': 38, cannons: 28, figureheads: 1 }, unlock: 'prosperity-galleon' },
  'ship-of-the-line': { shipClass: 'ship-of-the-line', name: '검은 전열함', durationMinutes: 900, shipwrights: 26, shipyardLevel: 6, cost: { planks: 340, rope: 80, sails: 16, 'iron-ingots': 96, 'ship-parts': 62, cannons: 48, 'rare-blueprints': 2 }, unlock: 'infamy-linebreaker' },
  legendary: { shipClass: 'legendary', name: '전설 함선 복원', durationMinutes: 1400, shipwrights: 34, shipyardLevel: 7, cost: { planks: 420, rope: 90, sails: 20, 'rare-metal': 40, 'legendary-parts': 6, 'ancient-relics': 2, figureheads: 2 }, unlock: 'seamanship-legendary' }
};

const EMPTY_UPGRADES: ShipUpgrades = { hull: 0, sails: 0, mast: 0, rudder: 0, cannons: 0, magazine: 0, quarters: 0, hold: 0, armor: 0, figurehead: 0, cabin: 0 };

export interface QueueShipResult { state: SettlementSimulationState; ok: boolean; reason?: string; orderId?: string }

export function queueShipConstruction(state: SettlementSimulationState, shipClass: ShipClass, shipName: string, now = Date.now()): QueueShipResult {
  const plan = SHIP_PLANS[shipClass];
  if (!plan) return { state, ok: false, reason: '해독된 건조 설계가 없습니다.' };
  if (plan.unlock && !state.progression.unlocked.includes(plan.unlock)) return { state, ok: false, reason: '해당 선급 발전 항목이 필요합니다.' };
  const shipyard = state.buildings.find((building) => building.definitionId === 'shipyard' && building.state === 'ACTIVE' && building.level >= plan.shipyardLevel);
  if (!shipyard) return { state, ok: false, reason: `가동 중인 ${plan.shipyardLevel}단계 조선소가 필요합니다.` };
  if (state.shipConstruction.some((order) => order.shipyardId === shipyard.id && !['COMPLETE'].includes(order.state))) return { state, ok: false, reason: '이 조선소는 이미 함선을 건조하고 있습니다.' };
  const inventory = aggregateInventory(state);
  const enough = (Object.entries(plan.cost) as [SettlementResourceId, number][]).every(([resource, required]) => (inventory[resource] ?? 0) >= required);
  if (!enough) return { state, ok: false, reason: '정착지 전체 재고가 건조 요구량보다 부족합니다.' };
  const order: ShipConstructionOrder = {
    id: createId('ship-order'), shipClass, shipName: shipName.trim() || plan.name, shipyardId: shipyard.id,
    state: 'QUEUED', progress: 0, reserved: { ...plan.cost }, assignedShipwrights: [], createdAt: now
  };
  return { state: { ...state, shipConstruction: [...state.shipConstruction, order] }, ok: true, orderId: order.id };
}

function hasInputs(inventory: PartialSettlementInventory, cost: PartialSettlementInventory): boolean {
  return (Object.entries(cost) as [SettlementResourceId, number][]).every(([resource, required]) => (inventory[resource] ?? 0) >= required);
}

function consumeInputs(inventory: PartialSettlementInventory, cost: PartialSettlementInventory): void {
  for (const [resource, required] of Object.entries(cost) as [SettlementResourceId, number][]) inventory[resource] = Math.max(0, (inventory[resource] ?? 0) - required);
}

function createBuiltShip(order: ShipConstructionOrder): Ship {
  const stats = structuredClone(SHIP_CLASSES[order.shipClass].stats);
  return {
    id: createId('ship'), name: order.shipName, class: order.shipClass, stats, upgrades: { ...EMPTY_UPGRADES }, hull: stats.hullMax, sails: stats.sailMax,
    crew: 0, morale: 60, cargo: {}, cargoWeight: 0, cannonCondition: 100, rudderCondition: 100, fire: 0, flooding: 0, isFlagship: false, isCaptured: false
  };
}

export function advanceShipConstruction(
  input: SettlementSimulationState,
  ships: Ship[],
  gameMinutes: number
): { settlement: SettlementSimulationState; ships: Ship[]; completed: string[] } {
  if (gameMinutes <= 0 || input.shipConstruction.length === 0) return { settlement: input, ships, completed: [] };
  const settlement = structuredClone(input);
  const nextShips = [...ships];
  const completed: string[] = [];
  for (const order of settlement.shipConstruction) {
    if (order.state === 'COMPLETE' || order.state === 'PAUSED') continue;
    const plan = SHIP_PLANS[order.shipClass];
    const shipyard = settlement.buildings.find((building) => building.id === order.shipyardId);
    if (!plan || !shipyard || shipyard.state !== 'ACTIVE') {
      order.state = 'BLOCKED';
      continue;
    }
    const shipwrights = shipyard.workers.map((id) => settlement.residents.find((resident) => resident.id === id)).filter((resident) => resident?.job === 'shipwright' && resident.health > 25);
    order.assignedShipwrights = shipwrights.map((resident) => resident!.id);
    if (order.state !== 'BUILDING') {
      if (!hasInputs(shipyard.inputInventory, plan.cost)) {
        order.state = 'QUEUED';
        continue;
      }
      if (shipwrights.length < Math.max(1, Math.ceil(plan.shipwrights * 0.5))) {
        order.state = 'BLOCKED';
        continue;
      }
      consumeInputs(shipyard.inputInventory, plan.cost);
      order.state = 'BUILDING';
    }
    if (shipwrights.length === 0) {
      order.state = 'BLOCKED';
      continue;
    }
    const efficiency = shipwrights.reduce((sum, resident) => sum + (0.55 + resident!.morale / 150) * (1 - resident!.fatigue / 180), 0);
    order.progress = Math.min(1, order.progress + gameMinutes * efficiency / plan.durationMinutes);
    if (order.progress < 1) continue;
    order.state = 'COMPLETE';
    const ship = createBuiltShip(order);
    nextShips.push(ship);
    completed.push(ship.id);
    settlement.progression.points.seamanship += Math.ceil(SHIP_CLASSES[order.shipClass].stats.crewMax / 10);
  }
  return { settlement, ships: nextShips, completed };
}
