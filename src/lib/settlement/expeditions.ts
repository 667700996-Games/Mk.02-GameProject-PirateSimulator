import { createId, hashString, mulberry32 } from '$lib/domain/rng';
import { ZONES } from '$lib/domain/catalog';
import type { Officer, Ship, ZoneId } from '$lib/domain/types';
import { aggregateInventory } from './construction';
import type { PartialSettlementInventory, SettlementResourceId, SettlementSimulationState, StrategicExpedition } from './types';
import { policyModifiers } from './progression';

export type ExpeditionPurpose = 'explore' | 'raid' | 'trade' | 'rescue';
export type ExpeditionChoice = 'cautious' | 'bold' | 'parley';
export type ExpeditionCombatCommand = 'maneuver' | 'round-shot' | 'chain-shot' | 'grape-shot' | 'repair' | 'board' | 'retreat';

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
  missionId?: string;
}

export function prepareExpedition(
  state: SettlementSimulationState,
  ships: Ship[],
  officers: Officer[],
  options: PrepareExpeditionOptions
): { state: SettlementSimulationState; ok: boolean; reason?: string; expeditionId?: string } {
  if (!state.progression.unlocked.includes('seamanship-expeditions')) return { state, ok: false, reason: '군도 원정술 발전이 필요합니다.' };
  const activeLimit = state.progression.unlocked.includes('federation-captains') ? 3 : 1;
  if (state.expeditions.filter((expedition) => !['COMPLETED', 'LOST'].includes(expedition.state)).length >= activeLimit) return { state, ok: false, reason: activeLimit === 1 ? '복수 함대를 운용하려면 「여러 깃발, 하나의 항구」 발전이 필요합니다.' : '현재 지휘 가능한 원정 함대가 모두 출항 중입니다.' };
  const office = state.buildings.find((building) => building.definitionId === 'expedition-office' && building.state === 'ACTIVE');
  if (!office) return { state, ok: false, reason: '가동 중인 원정 사무소가 필요합니다.' };
  const selectedShips = ships.filter((ship) => options.shipIds.includes(ship.id));
  if (selectedShips.length === 0) return { state, ok: false, reason: '원정에 보낼 함선을 선택하십시오.' };
  if (selectedShips.some((ship) => ship.hull < ship.stats.hullMax * 0.35 || ship.sails < ship.stats.sailMax * 0.35)) return { state, ok: false, reason: '파손이 심한 함선이 포함되어 있습니다.' };
  if (state.expeditions.some((expedition) => !['COMPLETED', 'LOST'].includes(expedition.state) && expedition.shipIds.some((id) => options.shipIds.includes(id)))) return { state, ok: false, reason: '선택한 함선이 이미 원정 중입니다.' };
  const crew = state.residents.filter((resident) => options.crewIds.includes(resident.id));
  const baseEstimate = estimateExpedition(options.zoneId, selectedShips, crew.length, options.purpose);
  const modifiers = policyModifiers(state);
  const estimate = { ...baseEstimate, risk: Math.max(3, Math.min(95, baseEstimate.risk * modifiers.patrolRisk)) };
  if (crew.length < estimate.requiredCrew) return { state, ok: false, reason: `${estimate.requiredCrew - crew.length}명의 원정 선원이 더 필요합니다.` };
  if (options.captainIds.length < selectedShips.length || !options.captainIds.every((id) => officers.some((officer) => officer.id === id))) return { state, ok: false, reason: '함선마다 지휘할 장교가 필요합니다.' };
  const inventory = aggregateInventory(state);
  if (!(Object.entries(estimate.supplies) as [SettlementResourceId, number][]).every(([id, required]) => (inventory[id] ?? 0) >= required)) return { state, ok: false, reason: '원정 보급품이 정착지에 부족합니다.' };
  const expedition: StrategicExpedition = {
    id: createId('expedition'), name: options.name.trim() || `${ZONES[options.zoneId].name} 원정`, state: 'PREPARING', zoneId: options.zoneId, purpose: options.purpose, missionId: options.missionId,
    shipIds: options.shipIds, captainIds: options.captainIds, crewIds: options.crewIds, supplies: estimate.supplies, cargo: {}, routeProgress: 0,
    durationHours: estimate.durationHours, risk: estimate.risk, morale: Math.min(100, crew.reduce((sum, resident) => sum + resident.morale, 0) / Math.max(1, crew.length) + modifiers.expeditionMorale),
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

function expeditionLoot(expedition: StrategicExpedition, state: SettlementSimulationState): PartialSettlementInventory {
  const random = mulberry32(hashString(expedition.id));
  const zone = ZONES[expedition.zoneId];
  const modifiers = policyModifiers(state);
  const purposeFactor = expedition.purpose === 'raid' ? 1.25 : expedition.purpose === 'trade' ? 1.05 : expedition.purpose === 'rescue' ? 0.72 : 0.88;
  const gold = Math.floor((18 + zone.difficulty * 12) * (0.75 + random() * 0.6) * purposeFactor * modifiers.allLoot * modifiers.goldLoot);
  const loot: PartialSettlementInventory = { gold, 'royal-coins': Math.floor(gold * 0.28) };
  const rare: SettlementResourceId[] = expedition.purpose === 'explore'
    ? (zone.difficulty >= 6 ? ['military-maps', 'naval-ciphers', 'ancient-relics'] : ['foreign-textiles', 'wine', 'spices'])
    : zone.difficulty >= 7 ? ['rare-metal', 'military-maps', 'naval-ciphers'] : zone.difficulty >= 4 ? ['spices', 'silver', 'foreign-textiles'] : ['fruit', 'tobacco', 'wine'];
  loot[rare[Math.floor(random() * rare.length)]] = Math.max(1, Math.floor((2 + random() * (4 + zone.difficulty)) * modifiers.allLoot));
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
        const earned = expeditionLoot(expedition, settlement);
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
      if (expedition.purpose === 'raid') settlement.prisoners = (settlement.prisoners ?? 0) + Math.max(1, Math.floor(ZONES[expedition.zoneId].difficulty / 3));
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

export function beginExpeditionCombat(
  input: SettlementSimulationState,
  ships: Ship[],
  expeditionId: string
): { settlement: SettlementSimulationState; ships: Ship[]; ok: boolean; reason?: string } {
  const settlement = structuredClone(input);
  const nextShips = structuredClone(ships);
  const expedition = settlement.expeditions.find((item) => item.id === expeditionId);
  if (!expedition || expedition.state !== 'EVENT' || !['naval-patrol', 'merchant-sails'].includes(expedition.currentEventId ?? '')) {
    return { settlement: input, ships, ok: false, reason: '전술 해전을 시작할 수 있는 조우가 아닙니다.' };
  }
  const fleet = nextShips.filter((ship) => expedition.shipIds.includes(ship.id));
  const playerHull = fleet.reduce((sum, ship) => sum + ship.hull, 0);
  const playerHullMax = fleet.reduce((sum, ship) => sum + ship.stats.hullMax, 0);
  const enemyHullMax = Math.round(72 + expedition.risk * 1.7 + ZONES[expedition.zoneId].difficulty * 12);
  expedition.combat = {
    turn: 1, playerHull, playerHullMax, enemyHull: enemyHullMax, enemyHullMax, enemySails: 100, enemyMorale: 82,
    ammo: Math.max(4, expedition.supplies.cannonballs ?? 4), windAngle: Math.round((hashString(expedition.id) % 150) - 75),
    range: 'far', repairCharges: Math.max(1, Math.floor(fleet.length + expedition.crewIds.length / 18)),
    log: ['전투 깃발을 올리고 함포를 준비한다. 풍향과 거리를 읽어 첫 명령을 내리라.']
  };
  expedition.state = 'COMBAT';
  expedition.log.push('전술 해전 개시 · 왕실 함대가 포문을 열었다.');
  return { settlement, ships: nextShips, ok: true };
}

function distributeFleetDamage(ships: Ship[], shipIds: string[], damage: number): void {
  const fleet = ships.filter((ship) => shipIds.includes(ship.id) && ship.hull > 0);
  if (fleet.length === 0) return;
  let remaining = damage;
  for (let index = 0; index < fleet.length && remaining > 0; index += 1) {
    const share = index === fleet.length - 1 ? remaining : Math.ceil(damage / fleet.length);
    const applied = Math.min(Math.max(0, fleet[index].hull - 1), share);
    fleet[index].hull -= applied;
    remaining -= applied;
  }
}

function repairFleet(ships: Ship[], shipIds: string[], amount: number): void {
  const fleet = ships.filter((ship) => shipIds.includes(ship.id));
  let remaining = amount;
  for (const ship of fleet.sort((a, b) => a.hull / a.stats.hullMax - b.hull / b.stats.hullMax)) {
    const repaired = Math.min(remaining, ship.stats.hullMax - ship.hull);
    ship.hull += repaired;
    remaining -= repaired;
    if (remaining <= 0) break;
  }
}

export function resolveExpeditionCombatTurn(
  input: SettlementSimulationState,
  ships: Ship[],
  expeditionId: string,
  command: ExpeditionCombatCommand
): { settlement: SettlementSimulationState; ships: Ship[]; outcome?: 'victory' | 'retreat' | 'defeat'; reason?: string } {
  const settlement = structuredClone(input);
  const nextShips = structuredClone(ships);
  const expedition = settlement.expeditions.find((item) => item.id === expeditionId);
  const combat = expedition?.combat;
  if (!expedition || expedition.state !== 'COMBAT' || !combat) return { settlement: input, ships, reason: '진행 중인 해전이 없습니다.' };
  const fleet = nextShips.filter((ship) => expedition.shipIds.includes(ship.id));
  const firepower = fleet.reduce((sum, ship) => sum + ship.stats.cannonSlots * (ship.cannonCondition / 100), 0);
  const rng = mulberry32(hashString(`${expedition.id}:${combat.turn}:${command}`));
  const rangeFactor = combat.range === 'broadside' ? 1.25 : combat.range === 'far' ? 0.68 : 0.48;
  let maneuverEvasion = 1;
  if (command === 'retreat') {
    distributeFleetDamage(nextShips, expedition.shipIds, Math.ceil(4 + expedition.risk * 0.08));
    expedition.state = 'RETURNING'; expedition.routeProgress = 0; expedition.currentEventId = undefined; expedition.combat = undefined;
    expedition.log.push('연막과 사슬탄을 뿌리며 귀환 항로로 이탈했다.');
    return { settlement, ships: nextShips, outcome: 'retreat' };
  }
  if (command === 'maneuver') {
    combat.range = combat.range === 'far' ? 'broadside' : combat.range === 'broadside' ? 'boarding' : 'far';
    combat.windAngle = Math.max(-90, Math.min(90, combat.windAngle + Math.round((rng() - 0.42) * 38)));
    maneuverEvasion = 0.42;
    combat.log.push(`제${combat.turn}턴 · 바람을 타고 ${combat.range === 'far' ? '장거리' : combat.range === 'broadside' ? '현측 포격' : '승선'} 거리로 기동했다.`);
  } else if (command === 'repair') {
    if (combat.repairCharges <= 0) return { settlement: input, ships, reason: '응급 수리 자재가 남지 않았습니다.' };
    const repaired = Math.ceil(combat.playerHullMax * 0.09);
    combat.repairCharges -= 1;
    combat.playerHull = Math.min(combat.playerHullMax, combat.playerHull + repaired);
    repairFleet(nextShips, expedition.shipIds, repaired);
    combat.log.push(`제${combat.turn}턴 · 목수들이 포화 속에서 선체 ${repaired}을 복구했다.`);
  } else if (command === 'board') {
    const vulnerable = combat.range === 'boarding' && (combat.enemyHull / combat.enemyHullMax < 0.66 || combat.enemyMorale < 48 || combat.enemySails < 35);
    if (!vulnerable) return { settlement: input, ships, reason: '승선 거리와 적의 손상·사기 조건이 충족되지 않았습니다.' };
    const boardingPower = expedition.crewIds.length * (expedition.morale / 100) * (0.75 + rng() * 0.55);
    const resistance = (10 + expedition.risk * 0.16) * (combat.enemyMorale / 100);
    if (boardingPower >= resistance) {
      combat.enemyMorale = 0;
      combat.log.push(`제${combat.turn}턴 · 갈고리를 걸고 적 갑판을 장악했다.`);
    } else {
      expedition.morale = Math.max(0, expedition.morale - 10);
      combat.playerHull = Math.max(1, combat.playerHull - 10);
      distributeFleetDamage(nextShips, expedition.shipIds, 10);
      combat.log.push(`제${combat.turn}턴 · 승선대가 밀려나 사상자가 발생했다.`);
    }
  } else {
    const ammoCost = command === 'round-shot' ? 4 : 3;
    if (combat.ammo < ammoCost) return { settlement: input, ships, reason: '전술 사격에 필요한 대포알이 부족합니다.' };
    combat.ammo -= ammoCost;
    const baseDamage = (20 + firepower * 1.45) * rangeFactor * (0.82 + rng() * 0.34) * (1 - Math.abs(combat.windAngle) / 420);
    if (command === 'round-shot') {
      const damage = Math.max(5, Math.round(baseDamage));
      combat.enemyHull = Math.max(0, combat.enemyHull - damage);
      combat.enemyMorale = Math.max(0, combat.enemyMorale - Math.ceil(damage * 0.12));
      combat.log.push(`제${combat.turn}턴 · 일반탄 현측 사격, 적 선체 ${damage} 피해.`);
    } else if (command === 'chain-shot') {
      const damage = Math.max(8, Math.round(baseDamage * 1.35));
      combat.enemySails = Math.max(0, combat.enemySails - damage);
      combat.enemyMorale = Math.max(0, combat.enemyMorale - Math.ceil(damage * 0.1));
      combat.log.push(`제${combat.turn}턴 · 사슬탄이 돛과 삭구를 찢어 ${damage} 손상.`);
    } else {
      const shock = Math.max(10, Math.round(baseDamage * 1.1));
      combat.enemyMorale = Math.max(0, combat.enemyMorale - shock);
      combat.log.push(`제${combat.turn}턴 · 산탄이 갑판을 휩쓸어 적 사기 ${shock} 감소.`);
    }
  }
  if (combat.enemyHull <= 0 || combat.enemyMorale <= 0) {
    const eventNumber = expedition.routeProgress < 0.6 ? 1 : 2;
    expedition.cargo['royal-coins'] = (expedition.cargo['royal-coins'] ?? 0) + Math.ceil(28 + expedition.risk * 1.4);
    expedition.cargo['military-maps'] = (expedition.cargo['military-maps'] ?? 0) + 1;
    expedition.log.push(`사건 ${eventNumber} 해결 · 전술 해전 승리, 왕실 금화와 군사 지도를 확보했다.`);
    expedition.state = 'TRAVELING'; expedition.currentEventId = undefined; expedition.combat = undefined;
    settlement.progression.points.infamy += 4;
    return { settlement, ships: nextShips, outcome: 'victory' };
  }
  const enemyDamage = Math.max(3, Math.round((5 + expedition.risk * 0.11 + rng() * 7) * maneuverEvasion * (combat.enemySails < 35 ? 0.68 : 1)));
  combat.playerHull = Math.max(0, combat.playerHull - enemyDamage);
  distributeFleetDamage(nextShips, expedition.shipIds, enemyDamage);
  combat.log.push(`적의 응사로 함대 선체 ${enemyDamage} 피해.`);
  combat.turn += 1;
  if (combat.playerHull <= combat.playerHullMax * 0.12) {
    expedition.state = 'RETURNING'; expedition.routeProgress = 0; expedition.currentEventId = undefined; expedition.combat = undefined;
    expedition.morale = Math.max(0, expedition.morale - 18);
    expedition.log.push('함대가 붕괴 직전에서 전장을 이탈했다.');
    return { settlement, ships: nextShips, outcome: 'defeat' };
  }
  if (combat.turn > 14) {
    const eventNumber = expedition.routeProgress < 0.6 ? 1 : 2;
    expedition.state = 'TRAVELING'; expedition.currentEventId = undefined; expedition.combat = undefined;
    expedition.log.push(`사건 ${eventNumber} 해결 · 양측이 탄약을 소모한 뒤 전장을 이탈했다.`);
  }
  return { settlement, ships: nextShips };
}
