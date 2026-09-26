import Phaser from 'phaser';
import { THEME } from './ui/theme.js';

export function makeConfig(scenes, opts = {}) {
  return {
    type: Phaser.AUTO,
    parent: 'app',
    backgroundColor: THEME.bg,
    // UI text and shapes are anti-aliased; pixel-art world textures opt in to NEAREST filtering in Textures.js.
    pixelArt: false,
    antialias: true,
    roundPixels: true,
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.NO_CENTER, width: window.innerWidth, height: window.innerHeight },
    dom: { createContainer: true },
    input: { activePointers: 3 },
    physics: { default: 'arcade', arcade: { debug: false } },
    fps: { forceSetTimeOut: !!opts.keepRunningHidden },
    scene: scenes
  };
}
