import Phaser from 'phaser';
import { SeaScene, type SeaSceneBridge } from './SeaScene';

export function createSeaGame(parent: HTMLElement, bridge: SeaSceneBridge): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: parent.clientWidth || 1280,
    height: parent.clientHeight || 720,
    backgroundColor: '#061b24',
    render: { antialias: true, pixelArt: false, roundPixels: false, powerPreference: 'high-performance' },
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    audio: { disableWebAudio: false },
    scene: []
  });
  game.scene.add('sea', SeaScene, true, { bridge });
  return game;
}
