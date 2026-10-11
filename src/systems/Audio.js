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

/**
 * A creature's call: an oscillator sliding from `from` to `to` Hz over `dur` seconds through a low-pass filter, with
 * optional vibrato (`vib` Hz deep at `vibRate`) and a breath of noise (`noise` 0..1). Cartoon noises, not recordings.
 */
function creature({ wave = 'sawtooth', from = 200, to = from, dur = 0.4, vol = 0.08, vib = 0, vibRate = 8, noise = 0, cutoff = 1200, when = 0 } = {}) {
  const a = ac(); if (!a || muted) return;
  const t0 = a.currentTime + when, t1 = t0 + dur;
  const filt = a.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.setValueAtTime(cutoff, t0);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.03, dur / 4)); g.gain.exponentialRampToValueAtTime(0.0001, t1);
  filt.connect(g).connect(a.destination);
  const o = a.createOscillator(); o.type = wave;
  o.frequency.setValueAtTime(from, t0); o.frequency.exponentialRampToValueAtTime(Math.max(30, to), t1);
  if (vib) { const l = a.createOscillator(), lg = a.createGain(); l.frequency.value = vibRate; lg.gain.value = vib; l.connect(lg).connect(o.frequency); l.start(t0); l.stop(t1 + 0.02); }
  o.connect(filt); o.start(t0); o.stop(t1 + 0.02);
  if (noise) {
    const n = Math.max(1, Math.ceil(a.sampleRate * dur)), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * noise;
    const src = a.createBufferSource(); src.buffer = buf; src.connect(filt); src.start(t0); src.stop(t1);
  }
}

/** The ark's animals (data/early/animals.js name these by `sound`). */
export const ANIMAL_SOUNDS = {
  roar: () => creature({ from: 120, to: 70, dur: 0.9, vol: 0.12, vib: 6, vibRate: 9, noise: 0.5, cutoff: 700 }),
  growl: () => creature({ from: 95, to: 70, dur: 0.8, vol: 0.11, vib: 5, vibRate: 7, noise: 0.4, cutoff: 500 }),
  trumpet: () => creature({ from: 320, to: 720, dur: 0.6, vol: 0.09, vib: 24, vibRate: 12, cutoff: 2200 }),
  moo: () => { creature({ wave: 'triangle', from: 170, to: 210, dur: 0.25, vol: 0.12, cutoff: 900 }); creature({ wave: 'triangle', from: 210, to: 130, dur: 0.65, vol: 0.12, vib: 6, vibRate: 6, cutoff: 900, when: 0.25 }); },
  baa: () => creature({ wave: 'triangle', from: 330, to: 300, dur: 0.7, vol: 0.1, vib: 35, vibRate: 14, cutoff: 1500 }),
  neigh: () => creature({ from: 760, to: 300, dur: 0.75, vol: 0.08, vib: 45, vibRate: 16, cutoff: 2000 }),
  oink: () => [0, 0.2].forEach((t) => creature({ wave: 'square', from: 190, to: 120, dur: 0.13, vol: 0.09, noise: 0.5, cutoff: 900, when: t })),
  quack: () => [0, 0.2].forEach((t) => creature({ wave: 'square', from: 430, to: 300, dur: 0.15, vol: 0.08, cutoff: 1600, when: t })),
  hoot: () => [0, 0.3].forEach((t) => creature({ wave: 'sine', from: 440, to: 370, dur: 0.26, vol: 0.12, cutoff: 1000, when: t })),
  meow: () => { creature({ wave: 'sine', from: 480, to: 820, dur: 0.22, vol: 0.1, cutoff: 1800 }); creature({ wave: 'sine', from: 820, to: 420, dur: 0.4, vol: 0.1, vib: 10, vibRate: 7, cutoff: 1800, when: 0.22 }); },
  woof: () => creature({ from: 220, to: 120, dur: 0.2, vol: 0.12, noise: 0.5, cutoff: 900 }),
  yip: () => [0, 0.16].forEach((t) => creature({ from: 900, to: 600, dur: 0.1, vol: 0.08, noise: 0.3, cutoff: 2400, when: t })),
  ribbit: () => [0, 0.22].forEach((t) => creature({ wave: 'square', from: 140, to: 95, dur: 0.16, vol: 0.09, vib: 20, vibRate: 30, cutoff: 700, when: t })),
  hiss: () => creature({ wave: 'sine', from: 60, to: 60, dur: 0.9, vol: 0.001, noise: 0.9, cutoff: 6000 }),
  cluck: () => [0, 0.13, 0.26, 0.42].forEach((t) => creature({ wave: 'square', from: 900, to: 620, dur: 0.06, vol: 0.07, cutoff: 2200, when: t })),
  chatter: () => [0, 0.12, 0.24, 0.36, 0.5].forEach((t, i) => creature({ wave: 'square', from: i % 2 ? 1150 : 820, to: i % 2 ? 900 : 1200, dur: 0.09, vol: 0.07, cutoff: 2600, when: t })),
  squawk: () => creature({ from: 620, to: 900, dur: 0.32, vol: 0.08, noise: 0.4, cutoff: 2600 }),
  thump: () => [0, 0.28].forEach((t) => creature({ wave: 'sine', from: 95, to: 50, dur: 0.2, vol: 0.14, cutoff: 400, when: t })),
  hum: () => creature({ wave: 'sine', from: 180, to: 170, dur: 0.6, vol: 0.05, vib: 4, vibRate: 5, cutoff: 600 }),
  sniff: () => [0, 0.12, 0.24].forEach((t) => creature({ wave: 'sine', from: 80, to: 80, dur: 0.05, vol: 0.001, noise: 0.5, cutoff: 3000, when: t })),
  tick: () => [0, 0.5].forEach((t) => creature({ wave: 'triangle', from: 700, to: 500, dur: 0.05, vol: 0.05, cutoff: 1600, when: t }))
};
export const ANIMAL_SOUND_NAMES = Object.keys(ANIMAL_SOUNDS);

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
  lift: () => tone(520, 0.05, 'triangle', 0.05, 0, 120),
  /** An animal's call by name (see ANIMAL_SOUNDS); unknown names are silent. */
  animal: (kind) => { const fn = ANIMAL_SOUNDS[kind]; if (fn) fn(); }
};

// ---- Melody Market: notes by name, a little drum kit, and whole tunes and rhythms, all from the synth ------------
export const NOTE_HZ = { C3: 131, D3: 147, E3: 165, F3: 175, G3: 196, A3: 220, B3: 247, C4: 262, D4: 294, E4: 330, F4: 349, G4: 392, A4: 440, B4: 494, C5: 523, D5: 587, E5: 659, F5: 698, G5: 784, A5: 880, B5: 988, C6: 1047 };
export const Music = {
  /** One note by name ('C4' is middle C), `dur` seconds long, `when` seconds from now. */
  note: (name, dur = 0.45, when = 0, wave = 'triangle') => tone(NOTE_HZ[name] || Number(name) || 440, dur, wave, 0.12, when),
  /** Notes in turn, `gap` seconds apart ('-' is a rest). Returns how long the whole thing lasts. */
  notes: (names, gap = 0.5, dur = 0.42) => { names.forEach((n, i) => { if (n && n !== '-') Music.note(n, dur, i * gap); }); return names.length * gap; },
  /** One drum hit: 'boom' (the big drum), 'tak' (the small drum), 'shake' (a shaker) or 'ding' (a triangle). */
  drum: (kind = 'tak', when = 0) => {
    if (kind === 'boom') tone(110, 0.24, 'sine', 0.22, when, -60);
    else if (kind === 'shake') creature({ wave: 'square', from: 3200, to: 2400, dur: 0.09, vol: 0.05, noise: 1, cutoff: 7000, when });
    else if (kind === 'ding') { tone(2093, 0.7, 'sine', 0.08, when); tone(3136, 0.4, 'sine', 0.03, when); }
    else tone(420, 0.09, 'triangle', 0.16, when, -200);
  },
  /** A rhythm: one hit (or '-' for a rest) per beat, `gap` seconds apart. Returns how long it lasts. */
  rhythm: (beats, gap = 0.4) => { beats.forEach((b, i) => { if (b && b !== '-') Music.drum(b, i * gap); }); return beats.length * gap; },
  /** Play a sound descriptor from a question or a play set: { kind: 'notes', notes, gap } or { kind: 'rhythm', beats, gap }. */
  play: (sound) => {
    if (!sound) return 0;
    if (sound.kind === 'rhythm') return Music.rhythm(sound.beats, sound.gap);
    return Music.notes(sound.notes, sound.gap, sound.dur);
  }
};
