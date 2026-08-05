import Phaser from 'phaser';
import { SettlementScene, type SettlementSceneBridge } from './SettlementScene';

export function createSettlementGame(parent: HTMLElement, bridge: SettlementSceneBridge): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: parent.clientWidth || 1280,
    height: parent.clientHeight || 720,
    backgroundColor: '#061c24',
    render: { antialias: true, pixelArt: false, roundPixels: false, powerPreference: 'high-performance' },
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    audio: { disableWebAudio: false },
    scene: []
  });
  game.scene.add('settlement', SettlementScene, true, { bridge });
  return game;
}
