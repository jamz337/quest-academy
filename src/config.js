import Phaser from 'phaser';
import { THEME } from './ui/theme.js';
import { dpr } from './systems/Layout.js';

export function makeConfig(scenes, opts = {}) {
  return {
    type: opts.forceCanvas ? Phaser.CANVAS : Phaser.AUTO,
    parent: 'app',
    backgroundColor: THEME.bg,
    // UI text and shapes are anti-aliased; pixel-art world textures opt in to NEAREST filtering in Textures.js.
    pixelArt: false,
    antialias: true,
    roundPixels: true,
    // The canvas is DPR times the window size and displayed at window size (zoom 1/DPR) so phones are sharp;
    // main.js keeps it in step with the window and Layout.js keeps scene layout in CSS pixels.
    scale: { mode: Phaser.Scale.NONE, autoCenter: Phaser.Scale.NO_CENTER, width: Math.round(window.innerWidth * dpr()), height: Math.round(window.innerHeight * dpr()), zoom: 1 / dpr() },
    dom: { createContainer: true },
    input: { activePointers: 3 },
    physics: { default: 'arcade', arcade: { debug: false } },
    fps: { forceSetTimeOut: !!opts.keepRunningHidden },
    scene: scenes
  };
}
