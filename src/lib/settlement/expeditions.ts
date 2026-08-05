import { createId, hashString, mulberry32 } from '$lib/domain/rng';
import { ZONES } from '$lib/domain/catalog';
import type { Officer, Ship, ZoneId } from '$lib/domain/types';
import { aggregateInventory } from './construction';
import type { PartialSettlementInventory, Resident, SettlementResourceId, SettlementSimulationState, StrategicExpedition } from './types';

export type ExpeditionPurpose = 'explore' | 'raid' | 'trade' | 'rescue';
export type ExpeditionChoice = 'cautious' | 'bold' | 'parley';

export interface ExpeditionEstimate {
  durationHours: number;
  risk: number;
  requiredCrew: number;
  supplies: PartialSettlementInventory;
  cargoCapacity: number;
}

export function estimateExpedition(zoneId: ZoneId, ships: Ship[], crewCount: number, purpose: ExpeditionPurpose): ExpeditionEstimate {
  const zone = ZONES[zoneId];
  const slowest = ships.length > 0 ? Math.min(...ships.map((ship) => ship.stats.speedMax)) : 1;
  const distanceFactor = 1 + zone.difficulty * 0.34;
  const durationHours = Math.ceil((7 + distanceFactor * 5) * (7 / Math.max(2.8, slowest)) * (purpose === 'explore' ? 1.2 : 1));
  const requiredCrew = ships.reduce((sum, ship) => sum + Math.max(4, Math.ceil(ship.stats.crewMax * 0.32)), 0);
  const combatPower = ships.reduce((sum, ship) => sum + ship.stats.cannonSlots + ship.stats.hullMax / 35, 0) + crewCount * 0.45;
  const purposeRisk = purpose === 'raid' ? 13 : purpose === 'rescue' ? 6 : purpose === 'trade' ? -4 : 2;
  const risk = Math.max(5, Math.min(92, zone.difficulty * 11 + purposeRisk - combatPower * 0.42));
  return {
    durationHours,
    risk,
    requiredCrew,
    supplies: {
      water: Math.ceil(crewCount * durationHours / 24 * 0.75),
      hardtack: Math.ceil(crewCount * durationHours / 24 * 0.55),
      medicine: Math.max(1, Math.ceil(crewCount / 18)),
      cannonballs: purpose === 'raid' ? Math.max(12, ships.reduce((sum, ship) => sum + ship.stats.cannonSlots, 0)) : Math.max(4, ships.length * 4),
      powder: purpose === 'raid' ? Math.max(6, ships.reduce((sum, ship) => sum + Math.ceil(ship.stats.cannonSlots * 0.45), 0)) : Math.max(2, ships.length * 2)
    },
    cargoCapacity: ships.reduce((sum, ship) => sum + ship.stats.cargoMax, 0)
  };
}

export interface PrepareExpeditionOptions {
  name: string;
  zoneId: ZoneId;
  purpose: ExpeditionPurpose;
  shipIds: string[];
  captainIds: string[];
  crewIds: string[];
}

export function prepareExpedition(
  state: SettlementSimulationState,
  ships: Ship[],
  officers: Officer[],
  options: PrepareExpeditionOptions
): { state: SettlementSimulationState; ok: boolean; reason?: string; expeditionId?: string } {
  if (!state.progression.unlocked.includes('seamanship-expeditions')) return { state, ok: false, reason: '군도 원정술 발전이 필요합니다.' };
  const office = state.buildings.find((building) => building.definitionId === 'expedition-office' && building.state === 'ACTIVE');
  if (!office) return { state, ok: false, reason: '가동 중인 원정 사무소가 필요합니다.' };
  const selectedShips = ships.filter((ship) => options.shipIds.includes(ship.id));
  if (selectedShips.length === 0) return { state, ok: false, reason: '원정에 보낼 함선을 선택하십시오.' };
  if (selectedShips.some((ship) => ship.hull < ship.stats.hullMax * 0.35 || ship.sails < ship.stats.sailMax * 0.35)) return { state, ok: false, reason: '파손이 심한 함선이 포함되어 있습니다.' };
  if (state.expeditions.some((expedition) => !['COMPLETED', 'LOST'].includes(expedition.state) && expedition.shipIds.some((id) => options.shipIds.includes(id)))) return { state, ok: false, reason: '선택한 함선이 이미 원정 중입니다.' };
  const crew = state.residents.filter((resident) => options.crewIds.includes(resident.id));
  const estimate = estimateExpedition(options.zoneId, selectedShips, crew.length, options.purpose);
  if (crew.length < estimate.requiredCrew) return { state, ok: false, reason: `${estimate.requiredCrew - crew.length}명의 원정 선원이 더 필요합니다.` };
  if (options.captainIds.length < selectedShips.length || !options.captainIds.every((id) => officers.some((officer) => officer.id === id))) return { state, ok: false, reason: '함선마다 지휘할 장교가 필요합니다.' };
  const inventory = aggregateInventory(state);
  if (!(Object.entries(estimate.supplies) as [SettlementResourceId, number][]).every(([id, required]) => (inventory[id] ?? 0) >= required)) return { state, ok: false, reason: '원정 보급품이 정착지에 부족합니다.' };
  const expedition: StrategicExpedition = {
    id: createId('expedition'), name: options.name.trim() || `${ZONES[options.zoneId].name} 원정`, state: 'PREPARING', zoneId: options.zoneId,
    shipIds: options.shipIds, captainIds: options.captainIds, crewIds: options.crewIds, supplies: estimate.supplies, cargo: {}, routeProgress: 0,
    durationHours: estimate.durationHours, risk: estimate.risk, morale: crew.reduce((sum, resident) => sum + resident.morale, 0) / Math.max(1, crew.length),
    log: [`${ZONES[options.zoneId].name} 항로와 보급표를 작성했다.`, `작전 교리: ${options.purpose}`]
  };
  return { state: { ...state, expeditions: [...state.expeditions, expedition] }, ok: true, expeditionId: expedition.id };
}

function hasSupplies(inventory: PartialSettlementInventory, supplies: PartialSettlementInventory): boolean {
  return (Object.entries(supplies) as [SettlementResourceId, number][]).every(([id, required]) => (inventory[id] ?? 0) >= required);
}

function consumeSupplies(inventory: PartialSettlementInventory, supplies: PartialSettlementInventory): void {
  for (const [id, required] of Object.entries(supplies) as [SettlementResourceId, number][]) inventory[id] = Math.max(0, (inventory[id] ?? 0) - required);
}

function expeditionLoot(expedition: StrategicExpedition): PartialSettlementInventory {
  const random = mulberry32(hashString(expedition.id));
  const zone = ZONES[expedition.zoneId];
  const loot: PartialSettlementInventory = { 'royal-coins': Math.floor((12 + zone.difficulty * 9) * (0.75 + random() * 0.6)) };
  const rare: SettlementResourceId[] = zone.difficulty >= 7 ? ['rare-metal', 'military-maps', 'naval-ciphers'] : zone.difficulty >= 4 ? ['spices', 'silver', 'foreign-textiles'] : ['fruit', 'tobacco', 'wine'];
  loot[rare[Math.floor(random() * rare.length)]] = 2 + Math.floor(random() * (4 + zone.difficulty));
  if (random() > 0.78 - zone.difficulty * 0.025) loot['rare-blueprints'] = 1;
  return loot;
}

export function advanceExpeditions(
  input: SettlementSimulationState,
  ships: Ship[],
  gameMinutes: number,
  now = Date.now()
): { settlement: SettlementSimulationState; ships: Ship[] } {
  if (gameMinutes <= 0 || input.expeditions.length === 0) return { settlement: input, ships };
  const settlement = structuredClone(input);
  const nextShips = structuredClone(ships);
  const office = settlement.buildings.find((building) => building.definitionId === 'expedition-office' && building.state === 'ACTIVE');
  for (const expedition of settlement.expeditions) {
    if (['COMPLETED', 'LOST', 'EVENT', 'COMBAT'].includes(expedition.state)) continue;
    if (expedition.state === 'PREPARING') {
      if (!office || !hasSupplies(office.inputInventory, expedition.supplies)) continue;
      consumeSupplies(office.inputInventory, expedition.supplies);
      expedition.state = 'DEPARTING';
      expedition.departedAt = now;
      expedition.routeProgress = 0;
      expedition.log.push('부두 창고의 보급품을 선적하고 닻을 올렸다.');
      for (const resident of settlement.residents.filter((person) => expedition.crewIds.includes(person.id))) resident.action = 'BOARDING';
      continue;
    }
    const step = gameMinutes / Math.max(30, expedition.durationHours * 60 * 0.5);
    expedition.routeProgress = Math.min(1, expedition.routeProgress + step);
    if (expedition.state === 'DEPARTING' && expedition.routeProgress >= 0.04) {
      expedition.state = 'TRAVELING';
      expedition.log.push('본거지의 마지막 횃불이 수평선 아래로 사라졌다.');
    }
    if (expedition.state === 'TRAVELING') {
      const firstResolved = expedition.log.some((entry) => entry.startsWith('사건 1 해결'));
      const secondResolved = expedition.log.some((entry) => entry.startsWith('사건 2 해결'));
      if (expedition.routeProgress >= 0.32 && !firstResolved) {
        expedition.state = 'EVENT';
        expedition.currentEventId = expedition.risk > 55 ? 'naval-patrol' : 'merchant-sails';
        expedition.log.push(expedition.currentEventId === 'naval-patrol' ? '왕실 순찰함이 바람 위쪽에서 접근한다.' : '깃발을 내린 상선이 망원경에 잡혔다.');
      } else if (expedition.routeProgress >= 0.66 && !secondResolved) {
        expedition.state = 'EVENT';
        expedition.currentEventId = expedition.zoneId === 'storm-reach' ? 'black-squall' : 'uncharted-island';
        expedition.log.push(expedition.currentEventId === 'black-squall' ? '검은 돌풍이 함대를 집어삼킨다.' : '해도에 없는 섬에서 불빛이 보인다.');
      } else if (expedition.routeProgress >= 1) {
        const earned = expeditionLoot(expedition);
        for (const [id, cargo] of Object.entries(earned) as [SettlementResourceId, number][]) expedition.cargo[id] = (expedition.cargo[id] ?? 0) + cargo;
        expedition.state = 'RETURNING';
        expedition.routeProgress = 0;
        expedition.log.push('목표 해역의 작전을 마치고 귀환 항로에 올랐다.');
      }
    } else if (expedition.state === 'RETURNING' && expedition.routeProgress >= 1) {
      expedition.state = 'COMPLETED';
      expedition.returnsAt = now;
      const landing = settlement.buildings.find((building) => building.definitionId === 'dock-warehouse' && building.state === 'ACTIVE') ?? office;
      if (landing) for (const [id, cargo] of Object.entries(expedition.cargo) as [SettlementResourceId, number][]) landing.outputInventory[id] = (landing.outputInventory[id] ?? 0) + cargo;
      for (const resident of settlement.residents.filter((person) => expedition.crewIds.includes(person.id))) {
        resident.action = 'IDLE';
        resident.morale = Math.min(100, resident.morale + 6);
      }
      expedition.log.push('부두에 닻을 내리고 전리품을 창고로 옮겼다.');
      settlement.progression.points.seamanship += 4;
      settlement.progression.points.infamy += Math.ceil(expedition.risk / 18);
    }
  }
  return { settlement, ships: nextShips };
}

export function resolveExpeditionEvent(
  input: SettlementSimulationState,
  ships: Ship[],
  expeditionId: string,
  choice: ExpeditionChoice
): { settlement: SettlementSimulationState; ships: Ship[] } {
  const settlement = structuredClone(input);
  const nextShips = structuredClone(ships);
  const expedition = settlement.expeditions.find((item) => item.id === expeditionId);
  if (!expedition || expedition.state !== 'EVENT') return { settlement: input, ships };
  const eventNumber = expedition.routeProgress < 0.6 ? 1 : 2;
  if (choice === 'cautious') {
    expedition.routeProgress = Math.max(0, expedition.routeProgress - 0.04);
    expedition.morale = Math.min(100, expedition.morale + 2);
    expedition.log.push(`사건 ${eventNumber} 해결 · 돛을 줄이고 안전한 항로를 택했다.`);
  } else if (choice === 'bold') {
    const damage = Math.max(3, Math.round(expedition.risk * 0.22));
    for (const ship of nextShips.filter((item) => expedition.shipIds.includes(item.id))) ship.hull = Math.max(1, ship.hull - damage);
    expedition.cargo['royal-coins'] = (expedition.cargo['royal-coins'] ?? 0) + Math.ceil(expedition.risk * 0.8);
    expedition.morale = Math.max(0, expedition.morale - 3);
    expedition.log.push(`사건 ${eventNumber} 해결 · 위험을 돌파해 왕실 금화와 정보를 빼앗았다. 선체 피해 ${damage}.`);
  } else {
    expedition.cargo.spices = (expedition.cargo.spices ?? 0) + 3;
    expedition.cargo.wine = (expedition.cargo.wine ?? 0) + 2;
    expedition.log.push(`사건 ${eventNumber} 해결 · 거짓 깃발과 거래로 향신료와 포도주를 얻었다.`);
  }
  expedition.currentEventId = undefined;
  expedition.state = 'TRAVELING';
  return { settlement, ships: nextShips };
}
