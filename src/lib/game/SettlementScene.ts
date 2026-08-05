import Phaser from 'phaser';
import { BUILDINGS, SETTLEMENT_RESOURCES } from '$lib/settlement/catalog';
import { buildingCells, tileAt, validatePlacement } from '$lib/settlement/island';
import type { SettlementBuilding, SettlementBuildingId, SettlementOverlay, SettlementSimulationState, TerrainType } from '$lib/settlement/types';

export interface SettlementSceneBridge {
  getState: () => SettlementSimulationState;
  onPlace: (definitionId: SettlementBuildingId, x: number, y: number, rotation: 0 | 1 | 2 | 3) => void;
  onSelectBuilding: (id?: string) => void;
  onHoverTile: (x?: number, y?: number) => void;
  onCancelTool: () => void;
  onSound: (sound: 'ui' | 'impact' | 'critical') => void;
}

interface SceneData { bridge: SettlementSceneBridge }

const TILE_W = 80;
const TILE_H = 40;
const ELEVATION_H = 14;
const ORIGIN_X = 1100;
const ORIGIN_Y = 170;

const TERRAIN_COLORS: Record<TerrainType, number> = {
  'deep-water': 0x082b38, reef: 0x15505a, beach: 0xa99668, coast: 0x6f835d, plain: 0x3f694e, forest: 0x294d3d,
  slope: 0x445d46, cliff: 0x4e5047, highland: 0x536746, cave: 0x252c2d, ravine: 0x252d2c, wetland: 0x355a4f,
  'stone-deposit': 0x68675d, 'iron-vein': 0x5d5b55, 'copper-vein': 0x5d6654
};

const CATEGORY_COLORS = {
  gathering: 0x6d6740, processing: 0x785039, logistics: 0x355d61, housing: 0x6e583e, welfare: 0x8a6439,
  fleet: 0x375465, military: 0x653c37, administration: 0x695747, infrastructure: 0x4f5350
};

export class SettlementScene extends Phaser.Scene {
  private bridge!: SettlementSceneBridge;
  private snapshot!: SettlementSimulationState;
  private terrainLayer!: Phaser.GameObjects.Container;
  private buildingLayer!: Phaser.GameObjects.Container;
  private residentLayer!: Phaser.GameObjects.Container;
  private overlayLayer!: Phaser.GameObjects.Container;
  private weatherLayer!: Phaser.GameObjects.Container;
  private preview!: Phaser.GameObjects.Graphics;
  private buildTool?: SettlementBuildingId;
  private rotation: 0 | 1 | 2 | 3 = 0;
  private selectedBuildingId?: string;
  private dragging = false;
  private dragDistance = 0;
  private dragStart = { x: 0, y: 0, scrollX: 0, scrollY: 0 };
  private hoverTile?: { x: number; y: number };
  private waveSprites: Phaser.GameObjects.Ellipse[] = [];

  constructor() { super('settlement'); }

  init(data: SceneData): void {
    this.bridge = data.bridge;
    this.snapshot = structuredClone(this.bridge.getState());
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#041820');
    this.cameras.main.setBounds(0, 0, 2200, 1450);
    this.cameras.main.centerOn(1080, 620);
    this.cameras.main.setZoom(0.82);
    this.terrainLayer = this.add.container(0, 0).setDepth(0);
    this.buildingLayer = this.add.container(0, 0).setDepth(100);
    this.residentLayer = this.add.container(0, 0).setDepth(200);
    this.overlayLayer = this.add.container(0, 0).setDepth(300);
    this.weatherLayer = this.add.container(0, 0).setDepth(500);
    this.preview = this.add.graphics().setDepth(450);
    this.drawOceanAtmosphere();
    this.drawTerrain();
    this.drawDynamicLayers();
    this.bindInput();
  }

  public syncSnapshot(snapshot: SettlementSimulationState): void {
    this.snapshot = structuredClone(snapshot);
    if (!this.scene.isActive()) return;
    this.drawDynamicLayers();
  }

  public setBuildTool(definitionId?: SettlementBuildingId): void {
    this.buildTool = definitionId;
    this.rotation = 0;
    this.drawPreview();
  }

  public rotateBuildTool(): void {
    if (!this.buildTool) return;
    this.rotation = ((this.rotation + 1) % 4) as 0 | 1 | 2 | 3;
    this.drawPreview();
  }

  public focusBuilding(id: string): void {
    const building = this.snapshot.buildings.find((item) => item.id === id);
    if (!building) return;
    this.selectedBuildingId = id;
    const point = this.iso(building.x, building.y, tileAt(this.snapshot.island, building.x, building.y)?.elevation ?? 0);
    this.cameras.main.pan(point.x, point.y, 320, 'Sine.easeInOut');
    this.drawDynamicLayers();
  }

  private iso(x: number, y: number, elevation = 0): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(ORIGIN_X + (x - y) * TILE_W / 2, ORIGIN_Y + (x + y) * TILE_H / 2 - elevation * ELEVATION_H);
  }

  private diamond(point: Phaser.Math.Vector2): Phaser.Types.Math.Vector2Like[] {
    return [
      { x: point.x, y: point.y - TILE_H / 2 }, { x: point.x + TILE_W / 2, y: point.y },
      { x: point.x, y: point.y + TILE_H / 2 }, { x: point.x - TILE_W / 2, y: point.y }
    ];
  }

  private drawOceanAtmosphere(): void {
    for (let index = 0; index < 32; index += 1) {
      const wave = this.add.ellipse(80 + (index * 193) % 2040, 120 + (index * 97) % 1180, 46 + (index % 5) * 18, 3, 0x77b2b2, 0.09).setRotation(-0.35).setDepth(-20);
      this.tweens.add({ targets: wave, x: wave.x + 55, alpha: { from: 0.03, to: 0.15 }, duration: 3500 + (index % 7) * 380, yoyo: true, repeat: -1, delay: index * 90 });
      this.waveSprites.push(wave);
    }
    const fog = this.add.rectangle(1100, 760, 2200, 1450, 0x06151b, 0.08).setDepth(-10);
    this.tweens.add({ targets: fog, alpha: { from: 0.04, to: 0.12 }, duration: 8000, yoyo: true, repeat: -1 });
  }

  private drawTerrain(): void {
    this.terrainLayer.removeAll(true);
    const graphics = this.add.graphics();
    for (const tile of [...this.snapshot.island.tiles].sort((a, b) => (a.x + a.y) - (b.x + b.y))) {
      const point = this.iso(tile.x, tile.y, tile.elevation);
      if (tile.elevation > 0 && !['deep-water', 'reef'].includes(tile.terrain)) {
        graphics.fillStyle(0x252f2c, 1);
        graphics.fillPoints([{ x: point.x - TILE_W / 2, y: point.y }, { x: point.x, y: point.y + TILE_H / 2 }, { x: point.x, y: point.y + TILE_H / 2 + tile.elevation * ELEVATION_H }, { x: point.x - TILE_W / 2, y: point.y + tile.elevation * ELEVATION_H }], true);
        graphics.fillStyle(0x303a34, 1);
        graphics.fillPoints([{ x: point.x + TILE_W / 2, y: point.y }, { x: point.x, y: point.y + TILE_H / 2 }, { x: point.x, y: point.y + TILE_H / 2 + tile.elevation * ELEVATION_H }, { x: point.x + TILE_W / 2, y: point.y + tile.elevation * ELEVATION_H }], true);
      }
      const color = TERRAIN_COLORS[tile.terrain];
      graphics.fillStyle(color, tile.discovered ? 1 : 0.34).fillPoints(this.diamond(point), true);
      graphics.lineStyle(1, tile.terrain === 'deep-water' ? 0x17414b : 0x071a18, tile.terrain === 'deep-water' ? 0.2 : 0.42).strokePoints(this.diamond(point), true);
    }
    this.terrainLayer.add(graphics);
    for (const tile of this.snapshot.island.tiles) {
      const point = this.iso(tile.x, tile.y, tile.elevation);
      if (tile.terrain === 'forest') {
        const trees = this.add.container(point.x, point.y - 12);
        for (let index = 0; index < 3; index += 1) {
          const trunk = this.add.rectangle(-12 + index * 11, 3 - (index % 2) * 3, 3, 12, 0x3a2c20, 0.9);
          const crown = this.add.triangle(-12 + index * 11, -7 - (index % 2) * 3, -9, 9, 0, -12, 9, 9, 0x23483a, 1).setStrokeStyle(1, 0x51705a, 0.45);
          trees.add([trunk, crown]);
        }
        this.terrainLayer.add(trees);
      } else if (['stone-deposit', 'iron-vein', 'copper-vein'].includes(tile.terrain)) {
        const oreColor = tile.terrain === 'copper-vein' ? 0xa16c45 : tile.terrain === 'iron-vein' ? 0x666a67 : 0x88877c;
        const rocks = this.add.container(point.x, point.y - 5);
        rocks.add([this.add.polygon(-9, 0, [-10, 8, -4, -8, 6, -11, 12, 7], oreColor, 1), this.add.polygon(10, 3, [-8, 5, -2, -6, 7, -3, 9, 6], oreColor, 0.85)]);
        this.terrainLayer.add(rocks);
      }
    }
  }

  private drawDynamicLayers(): void {
    this.buildingLayer.removeAll(true);
    this.residentLayer.removeAll(true);
    this.overlayLayer.removeAll(true);
    for (const building of [...this.snapshot.buildings].sort((a, b) => (a.x + a.y) - (b.x + b.y))) this.drawBuilding(building);
    this.drawResidents();
    this.drawOverlay(this.snapshot.overlay);
    this.drawWeather();
    this.drawPreview();
  }

  private drawBuilding(building: SettlementBuilding): void {
    const definition = BUILDINGS[building.definitionId];
    if (!definition) return;
    const tile = tileAt(this.snapshot.island, building.x, building.y);
    const point = this.iso(building.x, building.y, tile?.elevation ?? 0);
    const [width, height] = definition.footprint;
    const scale = Math.max(0.85, Math.min(1.5, (width + height) / 3));
    const container = this.add.container(point.x, point.y - 12).setDepth(100 + building.x + building.y);
    const selected = building.id === this.selectedBuildingId;
    const shadow = this.add.ellipse(2, 14, 48 * scale, 18 * scale, 0x031013, 0.6);
    const baseColor = CATEGORY_COLORS[definition.category];
    const wallColor = building.state === 'DAMAGED' ? 0x4b403a : building.state === 'BURNING' ? 0x70382e : baseColor;
    const wallHeight = building.definitionId === 'watchtower' ? 48 : building.definitionId === 'coastal-battery' ? 24 : 25 + building.level * 3;
    const wall = this.add.polygon(0, 0, [-24 * scale, 0, 0, 11 * scale, 24 * scale, 0, 24 * scale, -wallHeight, 0, -wallHeight + 10 * scale, -24 * scale, -wallHeight], wallColor, building.state === 'PLANNED' ? 0.35 : 1)
      .setStrokeStyle(selected ? 3 : 1, selected ? 0xf0c873 : 0x1b201c, selected ? 1 : 0.72);
    const roof = this.add.polygon(0, -wallHeight, [-28 * scale, 0, 0, 15 * scale, 28 * scale, 0, 0, -14 * scale], definition.category === 'military' ? 0x2d3332 : 0x4f3829, building.state === 'PLANNED' ? 0.35 : 1).setStrokeStyle(1, 0xa08255, 0.55);
    container.add([shadow, wall, roof]);
    if (['small-dock', 'shipyard', 'dock-warehouse'].includes(building.definitionId)) {
      for (let plank = 0; plank < 4; plank += 1) container.add(this.add.rectangle(12 + plank * 10, 10 + plank * 5, 45, 5, 0x553a27).setRotation(0.46));
      if (building.definitionId === 'shipyard') {
        container.add(this.add.polygon(45, 5, [-30, 0, 28, 0, 18, 13, -20, 13], 0x5e3928, 1));
        container.add(this.add.rectangle(42, -17, 3, 48, 0x31231d));
        container.add(this.add.triangle(53, -26, 0, 0, 26, 7, 0, 21, 0xb9a77e, 0.76));
      }
    }
    if (building.definitionId === 'coastal-battery') {
      container.add(this.add.rectangle(-10, -wallHeight - 4, 28, 7, 0x1b2020).setRotation(-0.2));
      container.add(this.add.circle(4, -wallHeight + 1, 6, 0x2b2e2c));
    }
    if (building.state === 'CONSTRUCTING' || building.state === 'PLANNED') {
      for (let scaffold = -1; scaffold <= 1; scaffold += 1) container.add(this.add.rectangle(scaffold * 18, -10, 3, 50, 0x9a7445, 0.9));
      const progress = this.add.rectangle(0, 22, 50, 5, 0x0b1717).setStrokeStyle(1, 0xd3b06c, 0.6);
      const fill = this.add.rectangle(-25, 22, 50 * building.constructionProgress, 3, 0xd3a754).setOrigin(0, 0.5);
      container.add([progress, fill]);
    }
    if (definition.category === 'processing' && building.state === 'ACTIVE' && !building.statusReason) {
      const smoke = this.add.circle(8, -wallHeight - 17, 5, 0xb8b4a9, 0.22);
      container.add(smoke);
      this.tweens.add({ targets: smoke, y: smoke.y - 22, x: smoke.x + 7, alpha: 0, scale: 1.8, duration: 2400, repeat: -1 });
    }
    if (building.state === 'BURNING') {
      const fire = this.add.triangle(0, -wallHeight - 10, -9, 10, 0, -13, 9, 10, 0xef6b2e, 0.95);
      container.add(fire);
      this.tweens.add({ targets: fire, scaleX: { from: 0.8, to: 1.25 }, alpha: { from: 0.7, to: 1 }, duration: 230, yoyo: true, repeat: -1 });
    }
    const icon = this.add.text(0, -wallHeight + 2, definition.icon, { fontFamily: 'serif', fontSize: `${Math.round(14 * scale)}px`, color: '#f2d291', stroke: '#101816', strokeThickness: 3 }).setOrigin(0.5);
    container.add(icon);
    if (building.statusReason) {
      const warning = this.add.text(22 * scale, -wallHeight - 12, building.state === 'BLOCKED' ? '!' : '…', { fontFamily: 'sans-serif', fontSize: '13px', color: '#ffe2a0', backgroundColor: '#713d24', padding: { x: 5, y: 2 } }).setOrigin(0.5);
      container.add(warning);
    }
    this.buildingLayer.add(container);
  }

  private drawResidents(): void {
    const camera = this.cameras.main;
    const visibleLimit = this.snapshot.residents.length > 180 ? 120 : this.snapshot.residents.length;
    let drawn = 0;
    for (const resident of this.snapshot.residents) {
      if (drawn >= visibleLimit) break;
      const tile = tileAt(this.snapshot.island, Math.round(resident.position.x), Math.round(resident.position.y));
      const point = this.iso(resident.position.x, resident.position.y, tile?.elevation ?? 0);
      if (point.x < camera.worldView.x - 80 || point.x > camera.worldView.right + 80 || point.y < camera.worldView.y - 80 || point.y > camera.worldView.bottom + 80) continue;
      const color = resident.job === 'hauler' ? 0xd7ad64 : resident.job === 'builder' ? 0xb9764f : resident.tier === 'officer' ? 0xdfd2ad : 0x93aca0;
      const container = this.add.container(point.x, point.y - 8).setDepth(210 + resident.position.x + resident.position.y);
      container.add([this.add.ellipse(0, 6, 10, 4, 0x031013, 0.6), this.add.circle(0, -5, 3.2, 0xc9aa83), this.add.rectangle(0, 1, 5, 10, color)]);
      if (resident.action === 'HAULING') {
        const job = this.snapshot.transports.find((item) => item.haulerId === resident.id && item.state === 'DELIVERING');
        if (job) container.add(this.add.text(5, -11, SETTLEMENT_RESOURCES[job.resourceId].icon, { fontSize: '10px', color: '#f2d28e', stroke: '#071414', strokeThickness: 2 }));
      }
      this.residentLayer.add(container);
      drawn += 1;
    }
  }

  private drawOverlay(overlay: SettlementOverlay): void {
    if (overlay === 'none') return;
    if (overlay === 'logistics' || overlay === 'traffic') {
      for (const job of this.snapshot.transports.filter((item) => !['COMPLETED', 'CANCELLED'].includes(item.state))) {
        const line = this.add.graphics().lineStyle(3 + Math.min(4, job.amount / 3), job.state === 'WAITING' ? 0xd26a4c : 0xe9c56f, job.state === 'WAITING' ? 0.5 : 0.8);
        const points = job.path.map((point) => {
          const tile = tileAt(this.snapshot.island, point.x, point.y);
          return this.iso(point.x, point.y, tile?.elevation ?? 0);
        });
        if (points.length > 1) line.strokePoints(points, false);
        this.overlayLayer.add(line);
      }
    }
    for (const building of this.snapshot.buildings) {
      const tile = tileAt(this.snapshot.island, building.x, building.y);
      const point = this.iso(building.x, building.y, tile?.elevation ?? 0);
      let color = 0x6fb69f;
      let alpha = 0;
      if (overlay === 'storage' && ['warehouse', 'local-storage', 'dock-warehouse', 'distribution-depot'].includes(building.definitionId)) {
        const used = [...Object.values(building.inputInventory), ...Object.values(building.outputInventory)].reduce((sum, value) => sum + (value ?? 0), 0);
        const capacity = BUILDINGS[building.definitionId]?.storage ?? 1;
        color = used / capacity > 0.85 ? 0xd45d4b : used / capacity > 0.6 ? 0xd8a957 : 0x69ad8b;
        alpha = 0.28;
      } else if (overlay === 'workers') {
        const definition = BUILDINGS[building.definitionId];
        if (definition?.workerSlots) {
          color = building.workers.length < definition.workerSlots / 2 ? 0xd45d4b : 0x69ad8b;
          alpha = 0.22;
        }
      } else if (overlay === 'defense' && ['coastal-battery', 'watchtower'].includes(building.definitionId)) {
        color = 0xb25747;
        alpha = 0.17;
        const radius = (BUILDINGS[building.definitionId]?.range ?? 5) * TILE_W * 0.55;
        const range = this.add.ellipse(point.x, point.y, radius * 2, radius, color, alpha).setStrokeStyle(2, color, 0.6);
        this.overlayLayer.add(range);
      } else if (overlay === 'fire') {
        const hazardous = ['powder-workshop', 'powder-magazine', 'distillery', 'smelter'].includes(building.definitionId);
        color = hazardous ? 0xe26945 : 0x63a889;
        alpha = 0.18;
      }
      if (alpha > 0) this.overlayLayer.add(this.add.polygon(point.x, point.y, this.diamond(new Phaser.Math.Vector2(0, 0)), color, alpha).setStrokeStyle(2, color, 0.7));
    }
  }

  private drawWeather(): void {
    this.weatherLayer.removeAll(true);
    const hour = (this.snapshot.simulationMinutes / 60) % 24;
    const night = hour < 6 || hour > 19 ? 0.34 : hour < 8 || hour > 17 ? 0.14 : 0;
    if (night > 0) this.weatherLayer.add(this.add.rectangle(1100, 725, 2200, 1450, 0x071026, night).setScrollFactor(0));
    if (this.snapshot.weather === 'rain' || this.snapshot.weather === 'storm') {
      const count = this.snapshot.weather === 'storm' ? 80 : 42;
      for (let index = 0; index < count; index += 1) {
        const drop = this.add.line((index * 83) % 1800, (index * 47) % 950, 0, 0, -9, 24, 0x9bbbc3, 0.24).setScrollFactor(0);
        this.weatherLayer.add(drop);
        this.tweens.add({ targets: drop, x: drop.x - 130, y: drop.y + 480, duration: 900 + (index % 5) * 90, repeat: -1 });
      }
    }
  }

  private bindInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.dragging = true;
      this.dragDistance = 0;
      this.dragStart = { x: pointer.x, y: pointer.y, scrollX: this.cameras.main.scrollX, scrollY: this.cameras.main.scrollY };
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const tile = this.pickTile(pointer);
      if (!this.hoverTile || tile?.x !== this.hoverTile.x || tile?.y !== this.hoverTile.y) {
        this.hoverTile = tile;
        this.bridge.onHoverTile(tile?.x, tile?.y);
        this.drawPreview();
      }
      if (!this.dragging || !pointer.isDown) return;
      const dx = pointer.x - this.dragStart.x;
      const dy = pointer.y - this.dragStart.y;
      this.dragDistance = Math.max(this.dragDistance, Math.hypot(dx, dy));
      if (this.dragDistance > 5 && !this.buildTool) this.cameras.main.setScroll(this.dragStart.scrollX - dx / this.cameras.main.zoom, this.dragStart.scrollY - dy / this.cameras.main.zoom);
    });
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      this.dragging = false;
      if (this.dragDistance > 7) return;
      const tile = this.pickTile(pointer);
      if (!tile) return;
      if (this.buildTool) {
        const validation = validatePlacement(this.snapshot.island, this.snapshot.buildings, this.buildTool, tile.x, tile.y, this.rotation);
        if (validation.valid) {
          this.bridge.onPlace(this.buildTool, tile.x, tile.y, this.rotation);
          this.bridge.onSound('impact');
        } else this.bridge.onSound('critical');
        return;
      }
      const building = [...this.snapshot.buildings].reverse().find((item) => buildingCells(item).some((cell) => cell.x === tile.x && cell.y === tile.y));
      this.selectedBuildingId = building?.id;
      this.bridge.onSelectBuilding(building?.id);
      this.drawDynamicLayers();
    });
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _objects: unknown[], _dx: number, dy: number) => {
      this.cameras.main.zoomTo(Phaser.Math.Clamp(this.cameras.main.zoom - dy * 0.0007, 0.55, 1.35), 120);
    });
    this.input.keyboard?.on('keydown-R', () => this.rotateBuildTool());
    this.input.keyboard?.on('keydown-ESC', () => {
      if (!this.buildTool) return;
      this.buildTool = undefined;
      this.preview.clear();
      this.bridge.onCancelTool();
    });
  }

  private pickTile(pointer: Phaser.Input.Pointer): { x: number; y: number } | undefined {
    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    let best: { x: number; y: number; score: number } | undefined;
    for (const tile of this.snapshot.island.tiles) {
      const point = this.iso(tile.x, tile.y, tile.elevation);
      const score = Math.abs(world.x - point.x) / (TILE_W / 2) + Math.abs(world.y - point.y) / (TILE_H / 2);
      if (score <= 1.12 && (!best || score < best.score)) best = { x: tile.x, y: tile.y, score };
    }
    return best ? { x: best.x, y: best.y } : undefined;
  }

  private drawPreview(): void {
    this.preview?.clear();
    if (!this.buildTool || !this.hoverTile || !this.preview) return;
    const validation = validatePlacement(this.snapshot.island, this.snapshot.buildings, this.buildTool, this.hoverTile.x, this.hoverTile.y, this.rotation);
    const color = validation.valid ? 0x62d39d : 0xe45549;
    this.preview.lineStyle(3, color, 0.95).fillStyle(color, 0.18);
    for (const cell of validation.cells) {
      const tile = tileAt(this.snapshot.island, cell.x, cell.y);
      if (!tile) continue;
      const point = this.iso(cell.x, cell.y, tile.elevation);
      this.preview.fillPoints(this.diamond(point), true).strokePoints(this.diamond(point), true);
    }
  }
}
