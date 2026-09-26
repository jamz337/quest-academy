import Phaser from 'phaser';
import { C } from './constants.js';

export function makeConfig(scenes, opts = {}) {
  return {
    type: Phaser.AUTO,
    parent: 'app',
    backgroundColor: C.navy,
    pixelArt: true,
    roundPixels: true,
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.NO_CENTER, width: window.innerWidth, height: window.innerHeight },
    dom: { createContainer: true },
    input: { activePointers: 3 },
    physics: { default: 'arcade', arcade: { debug: false } },
    fps: { forceSetTimeOut: !!opts.keepRunningHidden },
    scene: scenes
  };
}
