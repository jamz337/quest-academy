// Tiny Web Audio synth. No sound files; everything is an oscillator envelope.
let ctx = null;
let muted = false;
const muteListeners = new Set();

function ac() {
  if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; } }
  return ctx;
}

const unlockListeners = new Set();
let unlockedOnce = false;

/**
 * Call from a user gesture so mobile browsers allow audio. iOS Safari only unlocks when a sound is actually
 * started inside the gesture, so a silent buffer is played as well as resuming the context. Returns true
 * once the context is running.
 */
export function unlockAudio() {
  const a = ac(); if (!a) return false;
  try {
    if (a.state === 'suspended') a.resume();
    const buf = a.createBuffer(1, 1, a.sampleRate), src = a.createBufferSource();
    src.buffer = buf; src.connect(a.destination); src.start(0);
  } catch { /* ignore */ }
  const ready = a.state === 'running';
  if (ready && !unlockedOnce) { unlockedOnce = true; for (const fn of unlockListeners) { try { fn(); } catch { /* ignore */ } } }
  return ready;
}
/** True once the audio context is running (sound and music can be heard). */
export const audioReady = () => { const a = ctx; return !!a && a.state === 'running'; };
/** Called once, the first time audio is unlocked. */
export function onUnlocked(fn) { if (unlockedOnce) fn(); else unlockListeners.add(fn); return () => unlockListeners.delete(fn); }
export function setMuted(m) { muted = !!m; for (const fn of muteListeners) { try { fn(muted); } catch { /* ignore */ } } }
export function isMuted() { return muted; }
/** Music and other long-running sounds subscribe here to follow the sound setting. */
export function onMuted(fn) { muteListeners.add(fn); return () => muteListeners.delete(fn); }
/** The shared AudioContext (null where Web Audio is unavailable). */
export const audioContext = () => ac();

function tone(freq, dur = 0.12, type = 'square', vol = 0.08, when = 0, slide = 0) {
  const a = ac(); if (!a || muted) return;
  const t0 = a.currentTime + when;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + dur + 0.02);
}

export const Sfx = {
  click: () => tone(660, 0.06, 'square', 0.05),
  correct: () => { tone(523, 0.1, 'square', 0.07); tone(784, 0.16, 'square', 0.07, 0.09); },
  wrong: () => tone(200, 0.25, 'sawtooth', 0.07, 0, -120),
  coin: () => { tone(988, 0.07, 'square', 0.06); tone(1319, 0.14, 'square', 0.06, 0.07); },
  step: () => tone(440, 0.04, 'triangle', 0.04),
  crash: () => tone(120, 0.3, 'sawtooth', 0.09, 0, -80),
  fanfare: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i === 3 ? 0.4 : 0.14, 'square', 0.07, i * 0.12)),
  unlock: () => [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, 'triangle', 0.08, i * 0.08)),
  pop: () => tone(880, 0.05, 'sine', 0.06, 0, 300)
};
