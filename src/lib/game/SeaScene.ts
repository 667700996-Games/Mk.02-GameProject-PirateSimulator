import Phaser from 'phaser';
import { AMMO, applyShot, broadsideBearing, canBoard, resolveShot, tickDamage, type Broadside } from '$lib/domain/combat';
import { removeCargo } from '$lib/domain/economy';
import { clamp, normalizeAngle, tickSailing, type SailingState } from '$lib/domain/physics';
import type { AmmoType, GameSettings, GameState, Ship } from '$lib/domain/types';
import {
  NAVAL_ATLAS_DATA,
  NAVAL_ATLAS_IMAGE,
  NAVAL_ATLAS_KEY,
  SHIP_ART,
  shipDamageStage
} from './navalArt';

export interface SeaHudSnapshot {
  speed: number;
  maxSpeed: number;
  heading: number;
  sailSetting: number;
  windDirection: number;
  windSpeed: number;
  player: Ship;
  enemy?: Ship;
  distance: number;
  selectedSide: Broadside;
  selectedAmmo: AmmoType;
  portReload: number;
  starboardReload: number;
  bowReload: number;
  sternReload: number;
  canBoard: boolean;
  message?: string;
}

export interface SeaSceneBridge {
  getState: () => GameState;
  getSettings: () => GameSettings;
  onSnapshot: (snapshot: SeaHudSnapshot) => void;
  onPlayerChanged: (ship: Ship) => void;
  onEnemyChanged: (ship: Ship) => void;
  onCombatEnd: (outcome: 'victory' | 'defeat', player: Ship, enemy: Ship) => void;
  onBoard: (player: Ship, enemy: Ship) => void;
  onOpenMap: () => void;
  onSound: (sound: 'cannon' | 'impact' | 'critical' | 'boarding') => void;
}

interface SceneData {
  bridge: SeaSceneBridge;
}

interface ShipVisual {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  floodRing: Phaser.GameObjects.Ellipse;
  scorchPort: Phaser.GameObjects.Ellipse;
  scorchStarboard: Phaser.GameObjects.Ellipse;
  fireGlow: Phaser.GameObjects.Ellipse;
  flamePort: Phaser.GameObjects.Triangle;
  flameStarboard: Phaser.GameObjects.Triangle;
  smoke: Phaser.GameObjects.Ellipse;
}

export class SeaScene extends Phaser.Scene {
  private bridge!: SeaSceneBridge;
  private player!: Ship;
  private enemy?: Ship;
  private playerMotion!: SailingState;
  private enemyMotion!: SailingState;
  private playerVisual!: ShipVisual;
  private enemyVisual?: ShipVisual;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private selectedSide: Broadside = 'starboard';
  private selectedAmmo: AmmoType = 'round-shot';
  private reloads: Record<Broadside, number> = { port: 0, starboard: 0, bow: 0, stern: 0 };
  private enemyReload = 2.4;
  private ended = false;
  private lastSnapshot = 0;
  private water?: Phaser.GameObjects.TileSprite;
  private windDirection = 1.9;
  private windSpeed = 0.9;
  private weather: GameState['voyage']['weather'] = 'clear';
  private wakeTimer = 0;
  private message = 'W/S로 돛을 펼치고 A/D로 조타하십시오.';
  private touchSteer = 0;
  private touchSail = 0;

  constructor() {
    super('sea');
  }

  init(data: SceneData): void {
    this.bridge = data.bridge;
    const state = this.bridge.getState();
    this.player = structuredClone(state.ships.find((ship) => ship.id === state.activeShipId) ?? state.ships[0]);
    this.enemy = state.voyage.currentEncounter?.enemyShip ? structuredClone(state.voyage.currentEncounter.enemyShip) : undefined;
    this.windDirection = state.voyage.windDirection;
    this.windSpeed = state.voyage.windSpeed;
    this.weather = state.voyage.weather;
    this.selectedAmmo = state.combat.selectedAmmo;
  }

  preload(): void {
    if (!this.textures.exists(NAVAL_ATLAS_KEY)) {
      this.load.atlas(NAVAL_ATLAS_KEY, NAVAL_ATLAS_IMAGE, NAVAL_ATLAS_DATA);
    }
  }

  create(): void {
    this.createTextures();
    this.cameras.main.setBackgroundColor('#061b24');
    this.cameras.main.setBounds(0, 0, 3200, 2200);
    this.water = this.add.tileSprite(1600, 1100, 3200, 2200, 'ocean-tile').setDepth(-20);
    this.createDepthLayers();
    this.playerMotion = { x: 1280, y: 1180, heading: -0.18, speed: 0, sailSetting: 0.26 };
    this.playerVisual = this.createShipVisual(this.player, this.playerMotion.x, this.playerMotion.y, false);
    if (this.enemy) {
      const compactTheatre = this.scale.width < 700;
      this.enemyMotion = { x: compactTheatre ? 1510 : 1760, y: compactTheatre ? 1040 : 1120, heading: 2.7, speed: this.enemy.stats.speedMax * 0.52, sailSetting: 0.86 };
      this.enemyVisual = this.createShipVisual(this.enemy, this.enemyMotion.x, this.enemyMotion.y, true);
    }
    this.cameras.main.startFollow(this.playerVisual.container, true, 0.07, 0.07);
    this.cameras.main.setZoom(this.scale.width < 700 ? 0.62 : this.scale.width < 1000 ? 0.78 : 0.92);
    this.createWeather();
    this.bindControls();
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _objects: unknown[], _dx: number, dy: number) => {
      this.cameras.main.zoomTo(clamp(this.cameras.main.zoom - dy * 0.0005, 0.62, 1.28), 120);
    });
  }

  update(time: number, deltaMs: number): void {
    if (this.ended || this.bridge.getState().paused) return;
    const dt = Math.min(deltaMs / 1000, 0.05);
    this.updateWater(time);
    this.updatePlayer(dt);
    this.updateEnemy(dt);
    this.updateReloads(dt);
    this.updateDamage(dt);
    this.updateShipDamageVisual(this.playerVisual, this.player, time);
    if (this.enemy && this.enemyVisual) this.updateShipDamageVisual(this.enemyVisual, this.enemy, time);
    this.createWake(dt);
    if (time - this.lastSnapshot > 90) {
      this.lastSnapshot = time;
      this.emitSnapshot();
    }
  }

  public selectAmmo(ammo: AmmoType): void {
    this.selectedAmmo = ammo;
    this.message = `${AMMO[ammo].name} 장전 준비`;
    this.emitSnapshot();
  }

  public selectBroadside(side: Broadside): void {
    this.selectedSide = side;
    const labels: Record<Broadside, string> = { port: '좌현 포대', starboard: '우현 포대', bow: '선수포', stern: '선미포' };
    this.message = `${labels[side]} 선택`;
    this.emitSnapshot();
  }

  public fireSelected(): void {
    this.firePlayer();
  }

  public attemptBoard(): void {
    this.requestBoard();
  }

  public setHelm(value: -1 | 0 | 1): void {
    this.touchSteer = value;
  }

  public setSailControl(value: -1 | 0 | 1): void {
    this.touchSail = value;
  }

  private createTextures(): void {
    if (!this.textures.exists('ocean-tile')) {
      const canvas = this.textures.createCanvas('ocean-tile', 256, 256)!;
      const context = canvas.context;
      context.fillStyle = '#082f3a';
      context.fillRect(0, 0, 256, 256);
      const glow = context.createRadialGradient(128, 128, 8, 128, 128, 180);
      glow.addColorStop(0, 'rgba(34,91,101,.18)');
      glow.addColorStop(1, 'rgba(3,20,29,.18)');
      context.fillStyle = glow;
      context.fillRect(0, 0, 256, 256);
      for (let index = 0; index < 80; index += 1) {
        const x = (index * 73) % 256;
        const y = (index * 41) % 256;
        const length = 12 + (index % 5) * 7;
        context.strokeStyle = index % 3 === 0 ? 'rgba(111,190,192,.17)' : 'rgba(2,15,24,.28)';
        context.lineWidth = index % 4 === 0 ? 2 : 1;
        context.beginPath();
        context.moveTo(x, y);
        context.quadraticCurveTo(x + length * 0.45, y - 3, x + length, y + 1);
        context.stroke();
      }
      canvas.refresh();
    }
    if (!this.textures.exists('wake-dot')) {
      const graphics = this.make.graphics({ x: 0, y: 0 });
      graphics.fillStyle(0xbfe0dd, 0.8).fillEllipse(7, 4, 14, 8);
      graphics.generateTexture('wake-dot', 14, 8);
      graphics.destroy();
    }
    if (!this.textures.exists('cannonball')) {
      const graphics = this.make.graphics({ x: 0, y: 0 });
      graphics.fillStyle(0xf5d080, 0.8).fillCircle(5, 5, 5).fillStyle(0x1a1714, 1).fillCircle(5, 5, 2.5);
      graphics.generateTexture('cannonball', 10, 10);
      graphics.destroy();
    }
  }

  private createDepthLayers(): void {
    const quality = this.bridge.getSettings().quality;
    const rockCount = quality === 'low' ? 10 : quality === 'medium' ? 17 : 24;
    const swellCount = quality === 'low' ? 12 : quality === 'medium' ? 22 : 34;
    for (let index = 0; index < rockCount; index += 1) {
      const x = 120 + ((index * 547) % 2980);
      const y = 100 + ((index * 313) % 2000);
      const radius = 24 + (index % 5) * 18;
      const shadow = this.add.ellipse(x + 8, y + 12, radius * 2.3, radius * 0.8, 0x001019, 0.36).setDepth(-9);
      const rock = this.add.polygon(x, y, [0, radius, radius * 0.35, radius * 0.12, radius * 0.7, -radius * 0.35, radius * 0.1, -radius, -radius * 0.55, -radius * 0.46, -radius, radius * 0.2], index % 2 ? 0x243d38 : 0x34473d, 0.96).setDepth(-8);
      shadow.setRotation(index * 0.41);
      rock.setRotation(index * 0.41);
    }
    for (let index = 0; index < swellCount; index += 1) {
      this.add.ellipse((index * 307) % 3200, (index * 173) % 2200, 90 + (index % 4) * 40, 5, 0x9ec7bf, 0.045).setRotation(index * 0.37).setDepth(-12);
    }
  }

  private createShipVisual(ship: Ship, x: number, y: number, enemy: boolean): ShipVisual {
    const art = SHIP_ART[ship.class];
    const container = this.add.container(x, y).setDepth(5);
    const targetRing = this.add.ellipse(0, 8, art.shadowWidth * 1.08, art.shadowWidth * 0.44, enemy ? 0xa53f35 : 0xd5b66d, enemy ? 0.09 : 0.045)
      .setStrokeStyle(enemy ? 2 : 1, enemy ? 0xcc5c4d : 0xd4b36b, enemy ? 0.44 : 0.2);
    const shadow = this.add.ellipse(5, 14, art.shadowWidth, Math.max(22, art.shadowWidth * 0.28), 0x001016, 0.55);
    const floodRing = this.add.ellipse(0, 12, art.shadowWidth * 1.04, Math.max(24, art.shadowWidth * 0.34), 0x8fc8c5, 0)
      .setStrokeStyle(3, 0xc8efeb, 0).setVisible(false);
    const sprite = this.add.image(0, 0, NAVAL_ATLAS_KEY, art.frame)
      .setDisplaySize(art.displaySize, art.displaySize)
      .setOrigin(0.5);
    const scorchPort = this.add.ellipse(-art.displaySize * 0.08, -8, art.displaySize * 0.18, art.displaySize * 0.075, 0x160f0d, 0.72)
      .setRotation(-0.2).setVisible(false);
    const scorchStarboard = this.add.ellipse(art.displaySize * 0.12, 10, art.displaySize * 0.2, art.displaySize * 0.08, 0x130d0c, 0.8)
      .setRotation(0.18).setVisible(false);
    const fireGlow = this.add.ellipse(0, -3, art.displaySize * 0.3, art.displaySize * 0.18, 0xf07b32, 0)
      .setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
    const flamePort = this.add.triangle(-art.displaySize * 0.08, -12, -7, 9, 0, -14, 7, 9, 0xf28535, 0.95).setVisible(false);
    const flameStarboard = this.add.triangle(art.displaySize * 0.09, -7, -6, 8, 0, -12, 6, 8, 0xffba48, 0.94).setVisible(false);
    const smoke = this.add.ellipse(0, -24, art.displaySize * 0.22, art.displaySize * 0.13, 0x252627, 0).setVisible(false);
    const flagColor = enemy ? 0xa33c32 : parseInt(this.bridge.getState().captain.flagColor.slice(1), 16);
    const flagPole = this.add.rectangle(-art.displaySize * 0.25, -art.displaySize * 0.15, 2, art.displaySize * 0.22, 0x2e211a, 0.92);
    const flag = this.add.triangle(-art.displaySize * 0.18, -art.displaySize * 0.23, 0, 0, art.displaySize * 0.14, art.displaySize * 0.04, 0, art.displaySize * 0.08, flagColor, 0.96);
    const lantern = this.add.circle(-art.displaySize * 0.28, 3, 3.2, 0xf0a84c, 0.9).setBlendMode(Phaser.BlendModes.ADD);
    container.add([
      targetRing,
      shadow,
      floodRing,
      sprite,
      scorchPort,
      scorchStarboard,
      flagPole,
      flag,
      lantern,
      fireGlow,
      smoke,
      flamePort,
      flameStarboard
    ]);
    container.setRotation(enemy ? this.enemyMotion?.heading ?? 2.7 : this.playerMotion?.heading ?? -0.18);
    const visual = { container, sprite, floodRing, scorchPort, scorchStarboard, fireGlow, flamePort, flameStarboard, smoke };
    this.updateShipDamageVisual(visual, ship, 0);
    return visual;
  }

  private updateShipDamageVisual(visual: ShipVisual, ship: Ship, time: number): void {
    const stage = shipDamageStage(ship.hull, ship.stats.hullMax);
    const sailRatio = ship.sails / Math.max(1, ship.stats.sailMax);
    visual.sprite.clearTint();
    if (stage === 1 || sailRatio < 0.72) visual.sprite.setTint(0xe0d5c0);
    if (stage === 2 || sailRatio < 0.48) visual.sprite.setTint(0xc4a78f);
    if (stage === 3 || sailRatio < 0.24) visual.sprite.setTint(0x9f735d);
    visual.scorchPort.setVisible(stage >= 1).setAlpha(stage >= 2 ? 0.82 : 0.52);
    visual.scorchStarboard.setVisible(stage >= 2).setAlpha(stage >= 3 ? 0.9 : 0.62);

    const flooding = ship.flooding > 1;
    visual.floodRing.setVisible(flooding).setFillStyle(0x8fc8c5, flooding ? 0.05 + ship.flooding / 900 : 0)
      .setStrokeStyle(3, 0xc8efeb, flooding ? 0.25 + ship.flooding / 180 : 0);
    if (flooding && !this.bridge.getSettings().reducedMotion) {
      const pulse = 1 + Math.sin(time * 0.006) * 0.08;
      visual.floodRing.setScale(pulse, pulse);
    } else visual.floodRing.setScale(1);

    const burning = ship.fire > 1;
    const fireStrength = clamp(ship.fire / 100, 0.18, 1);
    const flicker = this.bridge.getSettings().reducedMotion ? 1 : 0.86 + Math.sin(time * 0.019) * 0.14;
    visual.fireGlow.setVisible(burning).setAlpha(burning ? 0.12 + fireStrength * 0.34 : 0).setScale(flicker);
    visual.flamePort.setVisible(burning).setAlpha(burning ? 0.72 + fireStrength * 0.28 : 0).setScale(0.75 + fireStrength * flicker);
    visual.flameStarboard.setVisible(ship.fire > 20).setAlpha(ship.fire > 20 ? 0.7 + fireStrength * 0.3 : 0).setScale(0.65 + fireStrength * (2 - flicker));
    visual.smoke.setVisible(burning).setAlpha(burning ? 0.18 + fireStrength * 0.42 : 0);
  }

  private createWeather(): void {
    const settings = this.bridge.getSettings();
    const weatherDensity = settings.quality === 'low' ? .45 : settings.quality === 'medium' ? .72 : 1;
    if (this.weather === 'fog' || this.weather === 'storm') {
      for (let index = 0; index < Math.ceil(18 * weatherDensity); index += 1) {
        this.add.ellipse((index * 247) % 3200, (index * 379) % 2200, 520, 190, 0xb5c2ba, this.weather === 'fog' ? 0.08 : 0.035).setDepth(18).setScrollFactor(0.88);
      }
    }
    if (this.weather === 'storm') {
      const rain = this.add.particles(0, 0, 'wake-dot', {
        x: { min: 0, max: 3200 }, y: -40, lifespan: 1500, speedY: { min: 540, max: 760 }, speedX: -160, scaleX: 0.12, scaleY: 1.8, alpha: { start: 0.38, end: 0 }, quantity: settings.quality === 'low' ? 1 : settings.quality === 'medium' ? 2 : 4, frequency: settings.reducedMotion ? 70 : 20
      });
      rain.setDepth(30);
    }
  }

  private bindControls(): void {
    const keyboard = this.input.keyboard!;
    const bindings = this.bridge.getSettings().keyBindings;
    const keyName = (code: string): string => code === 'Space' ? 'SPACE' : code === 'Tab' ? 'TAB' : code === 'Escape' ? 'ESC' : code.startsWith('Key') ? code.slice(3) : code.startsWith('Digit') ? code.slice(5) : code;
    this.keys = keyboard.addKeys({ up: keyName(bindings.sailUp), down: keyName(bindings.sailDown), left: keyName(bindings.steerLeft), right: keyName(bindings.steerRight), port: keyName(bindings.aimPort), starboard: keyName(bindings.aimStarboard), fire: keyName(bindings.fire), board: 'F', map: keyName(bindings.map), ammo1: 'ONE', ammo2: 'TWO', ammo3: 'THREE', ammo4: 'FOUR', ammo5: 'FIVE' }) as Record<string, Phaser.Input.Keyboard.Key>;
    this.keys.port.on('down', () => { this.selectedSide = 'port'; this.message = '좌현 포대 선택'; });
    this.keys.starboard.on('down', () => { this.selectedSide = 'starboard'; this.message = '우현 포대 선택'; });
    this.keys.fire.on('down', () => this.firePlayer());
    this.keys.board.on('down', () => this.requestBoard());
    this.keys.map.on('down', () => this.bridge.onOpenMap());
    this.keys.ammo1.on('down', () => (this.selectedAmmo = 'round-shot'));
    this.keys.ammo2.on('down', () => (this.selectedAmmo = 'chain-shot'));
    this.keys.ammo3.on('down', () => (this.selectedAmmo = 'grape-shot'));
    this.keys.ammo4.on('down', () => (this.selectedAmmo = 'incendiary'));
    this.keys.ammo5.on('down', () => (this.selectedAmmo = 'piercing'));
  }

  private updatePlayer(dt: number): void {
    const steer = clamp((this.keys.left.isDown ? -1 : 0) + (this.keys.right.isDown ? 1 : 0) + this.touchSteer, -1, 1);
    const sailDelta = clamp((this.keys.up.isDown ? 1 : 0) + (this.keys.down.isDown ? -1 : 0) + this.touchSail, -1, 1);
    const before = this.playerMotion;
    this.playerMotion = tickSailing(before, this.player, { steer, sailDelta, deltaSeconds: dt }, { windDirection: this.windDirection, windSpeed: this.windSpeed, waveDrag: this.weather === 'storm' ? 0.35 : 0.08 }, this.bridge.getState().captain.trait);
    const dx = (this.playerMotion.x - before.x) * 24;
    const dy = (this.playerMotion.y - before.y) * 24;
    this.playerMotion.x = clamp(before.x + dx, 80, 3120);
    this.playerMotion.y = clamp(before.y + dy, 80, 2120);
    this.playerVisual.container.setPosition(this.playerMotion.x, this.playerMotion.y).setRotation(this.playerMotion.heading);
  }

  private updateEnemy(dt: number): void {
    if (!this.enemy || !this.enemyVisual || !this.enemyMotion) return;
    const targetBearing = Math.atan2(this.playerMotion.y - this.enemyMotion.y, this.playerMotion.x - this.enemyMotion.x);
    const distance = Phaser.Math.Distance.Between(this.playerMotion.x, this.playerMotion.y, this.enemyMotion.x, this.enemyMotion.y);
    const desired = distance > 520 ? targetBearing : normalizeAngle(targetBearing - Math.PI / 2);
    const headingError = normalizeAngle(desired - this.enemyMotion.heading);
    const steer = clamp(headingError * 1.8, -1, 1);
    const before = this.enemyMotion;
    this.enemyMotion = tickSailing(before, this.enemy, { steer, sailDelta: distance > 260 ? 0.2 : -0.2, deltaSeconds: dt }, { windDirection: this.windDirection, windSpeed: this.windSpeed, waveDrag: 0.08 });
    const dx = (this.enemyMotion.x - before.x) * 22;
    const dy = (this.enemyMotion.y - before.y) * 22;
    this.enemyMotion.x = clamp(before.x + dx, 80, 3120);
    this.enemyMotion.y = clamp(before.y + dy, 80, 2120);
    this.enemyVisual.container.setPosition(this.enemyMotion.x, this.enemyMotion.y).setRotation(this.enemyMotion.heading);
    this.enemyReload -= dt;
    if (this.enemyReload <= 0 && distance < AMMO['round-shot'].range) this.fireEnemy(targetBearing, distance);
  }

  private updateReloads(dt: number): void {
    for (const side of Object.keys(this.reloads) as Broadside[]) this.reloads[side] = Math.max(0, this.reloads[side] - dt);
  }

  private updateDamage(dt: number): void {
    const carpenters = this.bridge.getState().crew.roles.carpenter;
    this.player = tickDamage(this.player, dt, carpenters);
    if (this.enemy) this.enemy = tickDamage(this.enemy, dt, 1);
    if (this.enemy && this.enemy.hull <= 0) this.endCombat('victory');
    if (this.player.hull <= 0 || this.player.crew <= 0) this.endCombat('defeat');
  }

  private firePlayer(): void {
    if (!this.enemy || !this.enemyMotion || this.reloads[this.selectedSide] > 0) return;
    const ammo = AMMO[this.selectedAmmo];
    if ((this.player.cargo.cannonballs ?? 0) < ammo.cost.cannonballs || (this.player.cargo.powder ?? 0) < ammo.cost.powder) {
      this.message = '선택한 탄약을 발사할 화약과 포탄이 부족합니다.';
      return;
    }
    const distance = Phaser.Math.Distance.Between(this.playerMotion.x, this.playerMotion.y, this.enemyMotion.x, this.enemyMotion.y);
    const bearing = Math.atan2(this.enemyMotion.y - this.playerMotion.y, this.enemyMotion.x - this.playerMotion.x);
    const result = resolveShot({ attacker: this.player, target: this.enemy, ammo: this.selectedAmmo, distance, bearingToTarget: bearing, attackerHeading: this.playerMotion.heading, attackerSpeed: this.playerMotion.speed, targetSpeed: this.enemyMotion.speed, broadside: this.selectedSide, difficulty: this.bridge.getState().captain.difficulty, attackerIsEnemy: false, captainIsGunner: this.bridge.getState().captain.trait === 'gunner', random: Math.random });
    if (!result.fired) { this.message = result.reason ?? '지금은 발사할 수 없습니다.'; return; }
    this.player = removeCargo(this.player, 'cannonballs', ammo.cost.cannonballs).ship;
    this.player = removeCargo(this.player, 'powder', ammo.cost.powder).ship;
    this.reloads[this.selectedSide] = Math.max(2.8, 7.2 - this.player.stats.cannonSlots * 0.035) * (this.bridge.getState().captain.trait === 'gunner' ? 0.92 : 1);
    this.animateShot(this.playerMotion, this.enemyMotion, this.selectedSide, result.hit, () => {
      if (!this.enemy) return;
      this.enemy = applyShot(this.enemy, result);
      this.bridge.onEnemyChanged(this.enemy);
      this.message = result.hit ? (this.bridge.getSettings().showDamageNumbers ? `${result.critical ? '치명타! ' : ''}선체 ${result.hullDamage}, 돛 ${result.sailDamage} 피해` : `${result.critical ? '치명타! ' : ''}포탄이 적선을 강타했다.`) : '포탄이 파도 위로 빗나갔다.';
      if (result.hit) {
        this.impactEffect(this.enemyMotion.x, this.enemyMotion.y, result.critical);
        if (this.bridge.getSettings().showDamageNumbers) {
          this.damageNumber(this.enemyMotion.x, this.enemyMotion.y, result.hullDamage, result.critical, false);
        }
        this.bridge.onSound(result.critical ? 'critical' : 'impact');
      }
    });
    this.bridge.onPlayerChanged(this.player);
    this.bridge.onSound('cannon');
    this.message = `${AMMO[this.selectedAmmo].name} 발사!`;
  }

  private fireEnemy(bearing: number, distance: number): void {
    if (!this.enemy || !this.enemyMotion) return;
    const portError = Math.abs(normalizeAngle(bearing - broadsideBearing(this.enemyMotion.heading, 'port')));
    const side: Broadside = portError < Math.PI / 2 ? 'port' : 'starboard';
    const result = resolveShot({ attacker: this.enemy, target: this.player, ammo: 'round-shot', distance, bearingToTarget: bearing, attackerHeading: this.enemyMotion.heading, attackerSpeed: this.enemyMotion.speed, targetSpeed: this.playerMotion.speed, broadside: side, difficulty: this.bridge.getState().captain.difficulty, attackerIsEnemy: true, captainIsGunner: false, random: Math.random });
    this.enemyReload = 5.5 + Math.random() * 2.5;
    if (!result.fired) return;
    this.bridge.onSound('cannon');
    this.animateShot(this.enemyMotion, this.playerMotion, side, result.hit, () => {
      this.player = applyShot(this.player, result);
      this.bridge.onPlayerChanged(this.player);
      if (result.hit) {
        this.message = this.bridge.getSettings().showDamageNumbers ? `피격! 선체 ${result.hullDamage}, 선원 ${result.crewCasualties}명 손실` : '적 포탄이 선체를 강타했다!';
        this.impactEffect(this.playerMotion.x, this.playerMotion.y, result.critical);
        if (this.bridge.getSettings().showDamageNumbers) {
          this.damageNumber(this.playerMotion.x, this.playerMotion.y, result.hullDamage, result.critical, true);
        }
        this.bridge.onSound(result.critical ? 'critical' : 'impact');
        if (this.bridge.getSettings().screenShake && !this.bridge.getSettings().reducedMotion) this.cameras.main.shake(140, result.critical ? 0.009 : 0.004);
      }
    });
  }

  private animateShot(from: SailingState, to: SailingState, side: Broadside, hit: boolean, complete: () => void): void {
    const originAngle = broadsideBearing(from.heading, side);
    const isBroadside = side === 'port' || side === 'starboard';
    const shotCount = this.bridge.getSettings().reducedMotion ? (isBroadside ? 2 : 1) : (isBroadside ? 5 : 2);
    const alongAngle = from.heading;
    const missX = to.x + (Math.random() - 0.5) * 190;
    const missY = to.y + (Math.random() - 0.5) * 190;

    for (let index = 0; index < shotCount; index += 1) {
      const alongOffset = isBroadside ? (index - (shotCount - 1) / 2) * 13 : (index - 0.5) * 8;
      const startX = from.x + Math.cos(originAngle) * 39 + Math.cos(alongAngle) * alongOffset;
      const startY = from.y + Math.sin(originAngle) * 39 + Math.sin(alongAngle) * alongOffset;
      this.time.delayedCall(index * 44, () => {
        const flash = this.add.circle(startX, startY, 11 + (index % 2) * 3, 0xffb24c, 0.92)
          .setDepth(12)
          .setBlendMode(Phaser.BlendModes.ADD);
        const smoke = this.add.ellipse(startX, startY, 25, 13, 0xd8d2c4, 0.48)
          .setDepth(11)
          .setRotation(originAngle);
        this.tweens.add({ targets: flash, alpha: 0, scale: 2.7, duration: 170, onComplete: () => flash.destroy() });
        this.tweens.add({
          targets: smoke,
          x: startX + Math.cos(originAngle) * 24,
          y: startY + Math.sin(originAngle) * 24,
          alpha: 0,
          scaleX: 2.2,
          scaleY: 1.4,
          duration: 520,
          onComplete: () => smoke.destroy()
        });

        const ball = this.add.image(startX, startY, 'cannonball').setDepth(13);
        const spread = hit ? 26 : 52;
        const targetX = (hit ? to.x : missX) + (Math.random() - 0.5) * spread;
        const targetY = (hit ? to.y : missY) + (Math.random() - 0.5) * spread;
        const distance = Phaser.Math.Distance.Between(startX, startY, targetX, targetY);
        this.tweens.add({
          targets: ball,
          x: targetX,
          y: targetY,
          scale: { from: 1.25, to: 0.62 },
          duration: clamp(distance * 1.4, 260, 1100),
          ease: 'Sine.easeIn',
          onComplete: () => {
            ball.destroy();
            if (!hit) this.waterSplash(targetX, targetY, index === shotCount - 1);
            if (index === shotCount - 1) complete();
          }
        });
      });
    }
  }

  private impactEffect(x: number, y: number, critical: boolean): void {
    const burst = this.add.particles(x, y, 'wake-dot', { lifespan: 550, speed: { min: 45, max: critical ? 190 : 120 }, angle: { min: 0, max: 360 }, scale: { start: 0.9, end: 0 }, tint: [0xf0c37b, 0x6b4b32, 0xe5ded0], quantity: critical ? 20 : 11, emitting: false }).setDepth(14);
    burst.explode(critical ? 20 : 11);
    const ring = this.add.ellipse(x, y, 38, 18, 0x000000, 0)
      .setStrokeStyle(critical ? 4 : 2, critical ? 0xffd07a : 0xd7b77d, 0.88)
      .setDepth(13);
    this.tweens.add({ targets: ring, alpha: 0, scaleX: critical ? 3.8 : 2.8, scaleY: 2.2, duration: 420, onComplete: () => ring.destroy() });
    this.time.delayedCall(700, () => burst.destroy());
  }

  private waterSplash(x: number, y: number, prominent: boolean): void {
    const scale = prominent ? 1 : 0.66;
    const column = this.add.ellipse(x, y - 7, 8 * scale, 28 * scale, 0xd7eeea, 0.82).setDepth(12);
    const ring = this.add.ellipse(x, y, 20 * scale, 8 * scale, 0x000000, 0)
      .setStrokeStyle(2, 0xc7e2df, 0.74)
      .setDepth(11);
    this.tweens.add({ targets: column, y: y + 4, alpha: 0, scaleY: 0.3, duration: 430, onComplete: () => column.destroy() });
    this.tweens.add({ targets: ring, alpha: 0, scaleX: 3.2, scaleY: 2.1, duration: 700, onComplete: () => ring.destroy() });
  }

  private damageNumber(x: number, y: number, damage: number, critical: boolean, playerHit: boolean): void {
    const label = this.add.text(x, y - 42, `${critical ? '✶ ' : ''}-${damage}`, {
      color: critical ? '#ffd27b' : playerHit ? '#ff8a73' : '#f2e1b7',
      fontFamily: 'Gowun Batang, serif',
      fontSize: critical ? '26px' : '20px',
      fontStyle: 'bold',
      stroke: '#120b08',
      strokeThickness: 5
    }).setOrigin(0.5).setDepth(40);
    this.tweens.add({
      targets: label,
      y: y - (critical ? 106 : 88),
      alpha: 0,
      scale: critical ? 1.28 : 1.08,
      duration: critical ? 1050 : 820,
      ease: 'Cubic.easeOut',
      onComplete: () => label.destroy()
    });
  }

  private createWake(dt: number): void {
    this.wakeTimer -= dt;
    if (this.wakeTimer > 0 || this.playerMotion.speed < 0.6) return;
    const settings = this.bridge.getSettings();
    this.wakeTimer = settings.reducedMotion ? 0.28 : settings.quality === 'low' ? 0.18 : settings.quality === 'medium' ? 0.12 : 0.08;
    const wakeOffset = SHIP_ART[this.player.class].wakeOffset;
    const x = this.playerMotion.x - Math.cos(this.playerMotion.heading) * wakeOffset;
    const y = this.playerMotion.y - Math.sin(this.playerMotion.heading) * wakeOffset;
    const wake = this.add.image(x, y, 'wake-dot').setRotation(this.playerMotion.heading).setAlpha(0.48).setDepth(1).setScale(0.6 + this.playerMotion.speed * 0.04);
    this.tweens.add({ targets: wake, alpha: 0, scaleX: 2.8, scaleY: 0.3, duration: 1600, onComplete: () => wake.destroy() });
  }

  private updateWater(time: number): void {
    if (!this.water) return;
    this.water.tilePositionX = time * 0.012 * this.windSpeed;
    this.water.tilePositionY = time * 0.005;
  }

  private requestBoard(): void {
    if (!this.enemy || !this.enemyMotion) return;
    const distance = Phaser.Math.Distance.Between(this.playerMotion.x, this.playerMotion.y, this.enemyMotion.x, this.enemyMotion.y);
    if (!canBoard(this.player, this.enemy, distance, Math.abs(this.playerMotion.speed - this.enemyMotion.speed))) {
      this.message = '승선하려면 적선의 선체를 약화시키고 속도를 맞춘 채 78m 이내로 접근하십시오.';
      return;
    }
    this.ended = true;
    this.bridge.onSound('boarding');
    this.bridge.onBoard(this.player, this.enemy);
  }

  private emitSnapshot(): void {
    const distance = this.enemyMotion ? Phaser.Math.Distance.Between(this.playerMotion.x, this.playerMotion.y, this.enemyMotion.x, this.enemyMotion.y) : 9999;
    this.bridge.onSnapshot({ speed: this.playerMotion.speed, maxSpeed: this.player.stats.speedMax, heading: this.playerMotion.heading, sailSetting: this.playerMotion.sailSetting, windDirection: this.windDirection, windSpeed: this.windSpeed, player: this.player, enemy: this.enemy, distance, selectedSide: this.selectedSide, selectedAmmo: this.selectedAmmo, portReload: this.reloads.port, starboardReload: this.reloads.starboard, bowReload: this.reloads.bow, sternReload: this.reloads.stern, canBoard: !!this.enemy && canBoard(this.player, this.enemy, distance, Math.abs(this.playerMotion.speed - (this.enemyMotion?.speed ?? 0))), message: this.message });
  }

  private endCombat(outcome: 'victory' | 'defeat'): void {
    if (this.ended || !this.enemy) return;
    this.ended = true;
    const defeated = outcome === 'victory' ? this.enemyVisual : this.playerVisual;
    if (defeated) this.sinkingEffect(defeated);
    this.time.delayedCall(1150, () => this.bridge.onCombatEnd(outcome, this.player, this.enemy!));
  }

  private sinkingEffect(visual: ShipVisual): void {
    const { x, y } = visual.container;
    const ring = this.add.ellipse(x, y + 8, 70, 26, 0x000000, 0)
      .setStrokeStyle(4, 0xbcd9d5, 0.82)
      .setDepth(4);
    const debris = this.add.particles(x, y, 'wake-dot', {
      lifespan: 1200,
      speed: { min: 30, max: 125 },
      angle: { min: 0, max: 360 },
      gravityY: 38,
      scale: { start: 0.8, end: 0.12 },
      tint: [0x3d291e, 0x795137, 0xd0c3aa],
      quantity: 22,
      emitting: false
    }).setDepth(12);
    debris.explode(22);
    this.tweens.add({ targets: ring, alpha: 0, scaleX: 4.4, scaleY: 3.2, duration: 1050, onComplete: () => ring.destroy() });
    this.tweens.add({
      targets: visual.container,
      y: y + 28,
      alpha: 0,
      scaleX: 0.76,
      scaleY: 0.46,
      rotation: visual.container.rotation + 0.12,
      duration: 980,
      ease: 'Quad.easeIn'
    });
    this.time.delayedCall(1350, () => debris.destroy());
  }
}
