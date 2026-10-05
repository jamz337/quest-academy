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

// C major from middle C up to E an octave above: one note per stepping stone.
const SCALE = [262, 294, 330, 349, 392, 440, 494, 523, 587, 659];

export const Sfx = {
  click: () => tone(660, 0.06, 'square', 0.05),
  /** Right answer: a bright chime climbing three notes, with a sparkle on top. */
  correct: () => { tone(1047, 0.14, 'triangle', 0.1); tone(1319, 0.14, 'triangle', 0.1, 0.08); tone(1568, 0.26, 'triangle', 0.1, 0.16); tone(2093, 0.3, 'sine', 0.04, 0.18); },
  /** Note `n` (1 to 10) of a rising scale, for the Number Trail's stepping stones. */
  note: (n) => tone(SCALE[Math.max(1, Math.min(SCALE.length, n | 0)) - 1], 0.4, 'triangle', 0.13),
  /** The whole scale as a quick run (down when `down`), ending on a held chord. */
  scale: (down = false) => {
    const run = down ? [...SCALE].reverse() : SCALE;
    run.forEach((f, i) => tone(f, 0.16, 'triangle', 0.1, i * 0.11));
    [run[run.length - 1], run[run.length - 1] * 1.25, run[run.length - 1] * 1.5].forEach((f) => tone(f, 0.6, 'triangle', 0.07, run.length * 0.11));
  },
  /** Three little swallows, for a drink. */
  gulp: () => { [0, 0.2, 0.4].forEach((t) => tone(170, 0.13, 'sine', 0.14, t, 150)); },
  /** Wrong answer: a soft, low "uh-oh" (two falling notes): clearly not the chime, but never harsh. */
  wrong: () => { tone(330, 0.16, 'triangle', 0.11); tone(233, 0.32, 'triangle', 0.11, 0.17, -30); },
  coin: () => { tone(988, 0.07, 'square', 0.06); tone(1319, 0.14, 'square', 0.06, 0.07); },
  step: () => tone(440, 0.04, 'triangle', 0.04),
  crash: () => tone(120, 0.3, 'sawtooth', 0.09, 0, -80),
  fanfare: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i === 3 ? 0.4 : 0.14, 'square', 0.07, i * 0.12)),
  unlock: () => [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, 'triangle', 0.08, i * 0.08)),
  pop: () => tone(880, 0.05, 'sine', 0.06, 0, 300),
  /** A church bell: two strikes, each a low note with a bright ringing overtone. */
  bell: () => [0, 0.7].forEach((t) => { tone(659, 1.2, 'sine', 0.09, t); tone(1318, 0.8, 'sine', 0.035, t); tone(1975, 0.4, 'sine', 0.015, t); }),
  /** Picking a stone or card up to drag it. */
  lift: () => tone(520, 0.05, 'triangle', 0.05, 0, 120)
};
