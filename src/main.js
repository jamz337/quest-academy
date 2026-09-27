import Phaser from 'phaser';
import { registerSW } from 'virtual:pwa-register';
import { makeConfig } from './config.js';
import { unlockAudio, audioReady } from './systems/Audio.js';
import { primeSpeech } from './systems/Speech.js';
import { scenes } from './scenes/index.js';
import { dpr } from './systems/Layout.js';

// Keep full error stacks reachable for on-device debugging (chrome://inspect or a console).
window.__errors = [];
window.addEventListener('error', (e) => window.__errors.push((e.error && e.error.stack) || e.message));
window.addEventListener('unhandledrejection', (e) => window.__errors.push(String(e.reason && e.reason.stack || e.reason)));

// URL flags: ?bg keeps the game loop running while the tab is hidden (automated testing), ?canvas forces
// the Canvas renderer (to rule out a GPU/WebGL problem on a device), ?debug shows a live diagnostics box.
const params = new URLSearchParams(location.search);
const keepRunningHidden = params.has('bg');

// HiDPI text: every Text rasterises at the device pixel ratio unless a style says otherwise.
const setStyle = Phaser.GameObjects.TextStyle.prototype.setStyle;
Phaser.GameObjects.TextStyle.prototype.setStyle = function (style, updateText, setDefaults) {
  const out = setStyle.call(this, style, updateText, setDefaults);
  if (!this.resolution) this.resolution = dpr();
  return out;
};

const game = new Phaser.Game(makeConfig(scenes, { keepRunningHidden, forceCanvas: params.has('canvas') }));
if (keepRunningHidden) { game.events.off('hidden'); game.events.off('blur'); }

// Keep the canvas at DPR times the window size, shown at window size (rotation, on-screen keyboard, resize).
const fit = () => {
  if (!game.canvas) return;   // not booted yet
  const d = dpr(), w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);
  game.scale.setZoom(1 / d);
  game.scale.resize(Math.round(w * d), Math.round(h * d));
  game.canvas.style.width = w + 'px'; game.canvas.style.height = h + 'px';
  // A pixel-ratio change (browser zoom, moving between screens) fires no resize event; watch for it.
  try { matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener('change', fit, { once: true }); } catch { /* not supported */ }
};
window.addEventListener('resize', fit);
window.addEventListener('orientationchange', () => setTimeout(fit, 100));
game.events.once('ready', fit);
setTimeout(fit, 0);   // in case 'ready' already fired during construction

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

// Mobile browsers only start audio after a user gesture, and iOS Safari is picky about which one: it wants a
// sound started inside a touchend or click. Keep trying on every kind of gesture until the context runs, and
// prime speech synthesis in the same gesture so read-aloud works without a tap on the speaker button.
const GESTURES = ['pointerdown', 'touchend', 'click', 'keydown'];
const unlock = () => {
  primeSpeech();
  if (!unlockAudio()) return;
  for (const ev of GESTURES) window.removeEventListener(ev, unlock);
};
if (!audioReady()) for (const ev of GESTURES) window.addEventListener(ev, unlock, { passive: true });

// Service worker: precache the whole app and switch to new builds automatically (the page reloads once
// a new worker takes control, so nobody is left on a stale bundle).
registerSW({ immediate: true });

window.__game = game;
