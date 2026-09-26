import Phaser from 'phaser';
import { registerSW } from 'virtual:pwa-register';
import { makeConfig } from './config.js';
import { unlockAudio } from './systems/Audio.js';
import { scenes } from './scenes/index.js';

// Keep full error stacks reachable for on-device debugging (chrome://inspect or a console).
window.__errors = [];
window.addEventListener('error', (e) => window.__errors.push((e.error && e.error.stack) || e.message));
window.addEventListener('unhandledrejection', (e) => window.__errors.push(String(e.reason && e.reason.stack || e.reason)));

// ?bg keeps the game loop running while the tab is hidden (handy for automated testing only).
const keepRunningHidden = new URLSearchParams(location.search).has('bg');
const game = new Phaser.Game(makeConfig(scenes, { keepRunningHidden }));
if (keepRunningHidden) { game.events.off('hidden'); game.events.off('blur'); }

// Mobile browsers only start audio after a user gesture.
const unlock = () => { unlockAudio(); window.removeEventListener('pointerdown', unlock); };
window.addEventListener('pointerdown', unlock);

// Service worker: precache the whole app; show a small toast when a new build is ready.
const updateSW = registerSW({
  onNeedRefresh() {
    const el = document.getElementById('update-toast');
    if (!el) return;
    el.style.display = 'block';
    document.getElementById('update-btn').onclick = () => updateSW(true);
  }
});

window.__game = game;
