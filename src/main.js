import Phaser from 'phaser';
import { registerSW } from 'virtual:pwa-register';
import { makeConfig } from './config.js';
import { unlockAudio } from './systems/Audio.js';
import { scenes } from './scenes/index.js';

// Keep full error stacks reachable for on-device debugging (chrome://inspect or a console).
window.__errors = [];
window.addEventListener('error', (e) => window.__errors.push((e.error && e.error.stack) || e.message));
window.addEventListener('unhandledrejection', (e) => window.__errors.push(String(e.reason && e.reason.stack || e.reason)));

// URL flags: ?bg keeps the game loop running while the tab is hidden (automated testing), ?canvas forces
// the Canvas renderer (to rule out a GPU/WebGL problem on a device), ?debug shows a live diagnostics box.
const params = new URLSearchParams(location.search);
const keepRunningHidden = params.has('bg');
const game = new Phaser.Game(makeConfig(scenes, { keepRunningHidden, forceCanvas: params.has('canvas') }));
if (keepRunningHidden) { game.events.off('hidden'); game.events.off('blur'); }

if (params.has('debug')) {
  const box = document.createElement('pre');
  box.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;z-index:9999;margin:0;padding:10px;background:rgba(45,42,74,.92);color:#fff;font:12px/1.4 monospace;border-radius:10px;white-space:pre-wrap;word-break:break-word;pointer-events:none;';
  document.body.appendChild(box);
  const report = () => {
    try {
      const c = game.canvas, r = game.renderer, gl = r && r.gl;
      const active = game.scene.getScenes(true).map((s) => `${s.scene.key}(${s.children ? s.children.length : '-'})`).join(' ');
      const cam = game.scene.getScenes(true)[0]?.cameras?.main;
      const lines = [
        `ua ${navigator.userAgent.slice(0, 90)}`,
        `window ${window.innerWidth}x${window.innerHeight} dpr ${window.devicePixelRatio} screen ${screen.width}x${screen.height}`,
        `app ${document.getElementById('app')?.clientWidth}x${document.getElementById('app')?.clientHeight}`,
        `game.scale ${game.scale.width}x${game.scale.height} canvas ${c?.width}x${c?.height} css ${c?.clientWidth}x${c?.clientHeight}`,
        `renderer ${r ? (gl ? 'WebGL' : 'Canvas') : '-'}${gl ? ` maxTex ${gl.getParameter(gl.MAX_TEXTURE_SIZE)} lost ${gl.isContextLost()}` : ''}`,
        `scenes ${active || '(none)'}${cam ? ` cam ${cam.width}x${cam.height} zoom ${cam.zoom} scroll ${Math.round(cam.scrollX)},${Math.round(cam.scrollY)}` : ''}`,
        `errors ${window.__errors.length ? window.__errors.map((e) => String(e).split('\n')[0]).join(' | ').slice(0, 300) : 'none'}`
      ];
      box.textContent = lines.join('\n');
    } catch (e) { box.textContent = 'debug: ' + e; }
  };
  setInterval(report, 1000); report();
}

// Mobile browsers only start audio after a user gesture.
const unlock = () => { unlockAudio(); window.removeEventListener('pointerdown', unlock); };
window.addEventListener('pointerdown', unlock);

// Service worker: precache the whole app and switch to new builds automatically (the page reloads once
// a new worker takes control, so nobody is left on a stale bundle).
registerSW({ immediate: true });

window.__game = game;
