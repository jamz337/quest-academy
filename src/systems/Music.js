// Background music without audio files, played by a small Web Audio band. Two scores: a slow lounge loop for
// exploring (soft electric piano, round bass, brushed hats, a sparse melody) and a driving battle loop for
// duels (power-chord stabs, an eighth-note bass, kick, snare and hats, and an arpeggio), with a harder boss
// take of the battle. Scenes call play(track); games duck it; the sound setting mutes it. Everything degrades
// to silence when Web Audio is missing, so tests and old browsers are unaffected.
import { audioContext, isMuted, onMuted } from './Audio.js';
import { mulberry32 } from './Rng.js';

const DUCKED = 0.1;

// ---- Lounge: eight bars, one chord each (the last bar walks ii-V back home); rootless voicings, the bass plays roots.
export const LOUNGE = {
  bars: [
    { root: 48, chord: [64, 67, 71, 74] },   // Cmaj9
    { root: 45, chord: [60, 64, 67, 71] },   // Am9
    { root: 41, chord: [64, 67, 69, 72] },   // Fmaj9
    { root: 43, chord: [59, 62, 65, 69] },   // G9
    { root: 48, chord: [64, 67, 71, 74] },   // Cmaj9
    { root: 40, chord: [62, 64, 67, 71] },   // Em9
    { root: 41, chord: [64, 67, 69, 72] },   // Fmaj9
    { root: 43, chord: [60, 62, 65, 69], half: { root: 43, chord: [59, 62, 65, 69] } }   // Dm9 -> G9
  ],
  scale: [72, 74, 76, 79, 81, 84, 86, 88]   // C major pentatonic, two octaves
};

// ---- Battle: eight bars in A minor with a lift to F, G and a tense E at the turn; power chords over a running bass.
export const BATTLE = {
  bars: [
    { root: 45, chord: [57, 64, 69] },   // Am
    { root: 45, chord: [57, 64, 69] },
    { root: 41, chord: [53, 60, 65] },   // F
    { root: 43, chord: [55, 62, 67] },   // G
    { root: 45, chord: [57, 64, 69] },   // Am
    { root: 48, chord: [60, 67, 72] },   // C
    { root: 41, chord: [53, 60, 65] },   // F
    { root: 40, chord: [52, 59, 64] }    // E
  ],
  arp: { 45: [69, 72, 76, 81], 41: [65, 69, 72, 77], 43: [67, 71, 74, 79], 48: [72, 76, 79, 84], 40: [64, 68, 71, 76] }
};

const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

/**
 * Lounge events for one bar: { at (beats from bar start), dur (beats), midi, part, vel }.
 * Pure and seeded per bar so the loop varies a little without ever surprising anyone; tests read it directly.
 */
export function barEvents(barIndex, seed = 7) {
  const rnd = mulberry32(seed * 1000 + barIndex);
  const bar = LOUNGE.bars[barIndex % LOUNGE.bars.length];
  const ev = [];
  const push = (part, at, dur, midi, vel) => ev.push({ part, at, dur, midi, vel });

  // Chords: a long hit on 1, and a soft push on the "and" of 2 or on 4 (bossa feel); the ii-V bar splits at 3.
  const late = bar.half ? bar.half.chord : bar.chord;
  bar.chord.forEach((m, i) => push('chord', 0, bar.half ? 1.9 : 2.6, m, 0.9 - i * 0.05));
  if (bar.half) late.forEach((m, i) => push('chord', 2, 1.8, m, 0.8 - i * 0.05));
  else if (rnd() < 0.7) { const at = rnd() < 0.5 ? 1.5 : 3; bar.chord.forEach((m, i) => push('chord', at, 0.9, m, 0.55 - i * 0.05)); }

  // Bass: root on 1, fifth on 3 (or the new root in the split bar), sometimes an approach note before the next bar.
  push('bass', 0, 1.6, bar.root, 1);
  push('bass', 2, 1.2, bar.half ? bar.half.root : bar.root + 7, 0.8);
  if (rnd() < 0.5) push('bass', 3.5, 0.45, bar.root + (rnd() < 0.5 ? 5 : -2), 0.55);

  // Brushed hats on the eighths with the off-beats a touch louder, a few dropped; shaker on 2 and 4.
  for (let e = 0; e < 8; e++) if (rnd() > 0.15) push('hat', e / 2, 0.08, 0, e % 2 ? 0.7 : 0.45);
  push('shaker', 1, 0.12, 0, 0.6); push('shaker', 3, 0.12, 0, 0.6);

  // Lead: about every other bar, a short phrase of three to five pentatonic notes drifting up or down.
  if (rnd() < 0.5) {
    let idx = Math.floor(rnd() * 5) + 1, at = rnd() < 0.5 ? 0.5 : 1;
    const n = 3 + Math.floor(rnd() * 3);
    for (let i = 0; i < n && at < 3.6; i++) {
      push('lead', at, 0.7 + rnd() * 0.6, LOUNGE.scale[Math.max(0, Math.min(LOUNGE.scale.length - 1, idx))], 0.7 - i * 0.08);
      idx += rnd() < 0.55 ? 1 : -1;
      at += rnd() < 0.3 ? 1 : 0.5;
    }
  }
  return ev;
}

/**
 * Battle events for one bar: power-chord stabs on 1, the "and" of 2 and 4; a running eighth-note bass that
 * jumps the octave; kick on 1 and 3 (plus a pickup), snare on 2 and 4, hats on every eighth; and in the second
 * half of the loop (always, for a boss) a sixteenth-note arpeggio over the chord.
 */
export function battleEvents(barIndex, seed = 11, { boss = false } = {}) {
  const rnd = mulberry32(seed * 1000 + barIndex);
  const bar = BATTLE.bars[barIndex % BATTLE.bars.length];
  const ev = [];
  const push = (part, at, dur, midi, vel) => ev.push({ part, at, dur, midi, vel });
  for (const at of [0, 1.5, 3]) bar.chord.forEach((m, i) => push('stab', at, at === 0 ? 0.9 : 0.45, m, (at === 0 ? 1 : 0.75) - i * 0.08));
  if (rnd() < 0.5) bar.chord.forEach((m) => push('stab', 3.75, 0.2, m, 0.5));
  for (let e = 0; e < 8; e++) push('bass', e / 2, 0.42, bar.root + (e % 4 === 3 ? 12 : e === 6 && rnd() < 0.5 ? 7 : 0), e % 2 ? 0.8 : 1);
  push('kick', 0, 0.2, 0, 1); push('kick', 2, 0.2, 0, 0.9);
  if (rnd() < 0.6) push('kick', 2.5, 0.2, 0, 0.7);
  push('snare', 1, 0.2, 0, 1); push('snare', 3, 0.2, 0, 1);
  if ((barIndex % 8) === 7) { push('snare', 3.5, 0.15, 0, 0.7); push('snare', 3.75, 0.15, 0, 0.8); }   // a fill into the turn
  for (let e = 0; e < 8; e++) push('hat', e / 2, 0.07, 0, e % 2 ? 0.55 : 0.8);
  push('ohat', 3.5, 0.3, 0, 0.6);
  const arpOn = boss || (barIndex % 16) >= 8;
  if (arpOn) {
    const notes = BATTLE.arp[bar.root] || bar.chord;
    for (let s = 0; s < 16; s++) push('arp', s / 4, 0.22, notes[s % 2 === 0 ? (s / 2) % notes.length : notes.length - 1 - ((s - 1) / 2) % notes.length], 0.6 + (s % 4 === 0 ? 0.25 : 0));
  }
  return ev;
}

/** The scores scenes can ask for. */
export const TRACKS = {
  lounge: { bpm: 72, events: (bar) => barEvents(bar), master: 0.42, echo: 0.75, verb: 0.28, tone: 4200 },
  battle: { bpm: 138, events: (bar) => battleEvents(bar), master: 0.52, echo: 0.5, verb: 0.16, tone: 6000 },
  boss: { bpm: 150, events: (bar) => battleEvents(bar, 13, { boss: true }), master: 0.54, echo: 0.5, verb: 0.16, tone: 6500 }
};

let band = null;     // live graph while playing: { master, bus, echo, hatNoise, shakeNoise, track, beat, bar }
let timer = null, nextBar = 0, nextBarTime = 0, ducked = false, wanted = false, current = null;

function noiseBuffer(a, seconds, decay = 0) {
  const len = Math.floor(a.sampleRate * seconds), buf = a.createBuffer(2, len, a.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (decay ? Math.pow(1 - i / len, decay) : 1);
  }
  return buf;
}

function buildBand(a, name) {
  const t = TRACKS[name] || TRACKS.lounge;
  const beat = 60 / t.bpm;
  const master = a.createGain(); master.gain.value = 0;
  const comp = a.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
  const tone = a.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = t.tone;
  const dry = a.createGain(); dry.gain.value = 0.8;
  const verb = a.createConvolver(); verb.buffer = noiseBuffer(a, name === 'lounge' ? 2.2 : 1.2, 3);
  const wet = a.createGain(); wet.gain.value = t.verb;
  const bus = a.createGain();
  bus.connect(dry).connect(tone); bus.connect(verb).connect(wet).connect(tone);
  tone.connect(comp).connect(master).connect(a.destination);
  const echo = a.createDelay(1); echo.delayTime.value = beat * t.echo;
  const fb = a.createGain(); fb.gain.value = 0.28;
  echo.connect(fb).connect(echo); echo.connect(bus);
  const hatNoise = noiseBuffer(a, 0.25), shakeNoise = noiseBuffer(a, 0.3);
  return { master, bus, echo, hatNoise, shakeNoise, track: name, beat, bar: beat * 4, events: t.events, level: t.master };
}

function playEvent(a, b, e, t0) {
  const BEAT = b.beat;
  const t = t0 + e.at * BEAT, dur = e.dur * BEAT;
  const env = (g, peak, attack, release) => {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.setValueAtTime(peak, t + Math.max(attack, dur - release));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
  };
  if (e.part === 'chord' || e.part === 'lead') {
    const hz = midiHz(e.midi);
    const o = a.createOscillator(), o2 = a.createOscillator(), g = a.createGain(), g2 = a.createGain();
    o.type = 'sine'; o.frequency.value = hz;
    o2.type = 'triangle'; o2.frequency.value = hz * 2; g2.gain.value = e.part === 'lead' ? 0.12 : 0.07;
    if (e.part === 'lead') {   // slow vibrato
      const lfo = a.createOscillator(), lg = a.createGain(); lfo.frequency.value = 5; lg.gain.value = hz * 0.006;
      lfo.connect(lg).connect(o.frequency); lfo.start(t); lfo.stop(t + dur + 0.1);
    }
    env(g, (e.part === 'lead' ? 0.07 : 0.05) * e.vel, e.part === 'lead' ? 0.03 : 0.02, 0.35);
    o.connect(g); o2.connect(g2).connect(g);
    g.connect(b.bus); if (e.part === 'lead') g.connect(b.echo);
    o.start(t); o2.start(t); o.stop(t + dur + 0.1); o2.stop(t + dur + 0.1);
  } else if (e.part === 'stab' || e.part === 'arp') {
    // Two detuned saws (stab) or a soft square (arp) through a lowpass: chunky but never harsh.
    const hz = midiHz(e.midi);
    const o = a.createOscillator(), g = a.createGain(), f = a.createBiquadFilter();
    o.type = e.part === 'arp' ? 'square' : 'sawtooth'; o.frequency.value = hz;
    f.type = 'lowpass'; f.frequency.value = e.part === 'arp' ? 2600 : 1800; f.Q.value = 0.8;
    env(g, (e.part === 'arp' ? 0.035 : 0.045) * e.vel, 0.01, 0.12);
    o.connect(f).connect(g).connect(b.bus); if (e.part === 'arp') g.connect(b.echo);
    o.start(t); o.stop(t + dur + 0.1);
    if (e.part === 'stab') { const o2 = a.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = hz * 1.006; o2.connect(f); o2.start(t); o2.stop(t + dur + 0.1); }
  } else if (e.part === 'bass') {
    const o = a.createOscillator(), g = a.createGain(), f = a.createBiquadFilter();
    const battle = b.track !== 'lounge';
    o.type = battle ? 'sawtooth' : 'triangle'; o.frequency.value = midiHz(e.midi);
    f.type = 'lowpass'; f.frequency.value = battle ? 700 : 320;
    env(g, (battle ? 0.13 : 0.16) * e.vel, 0.01, battle ? 0.08 : 0.25);
    o.connect(f).connect(g).connect(b.bus); o.start(t); o.stop(t + dur + 0.1);
  } else if (e.part === 'kick') {
    const o = a.createOscillator(), g = a.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(0.5 * e.vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g).connect(b.bus); o.start(t); o.stop(t + 0.25);
  } else if (e.part === 'snare') {
    const src = a.createBufferSource(), g = a.createGain(), f = a.createBiquadFilter();
    src.buffer = b.shakeNoise; f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.9;
    g.gain.setValueAtTime(0.16 * e.vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    src.connect(f).connect(g).connect(b.bus); src.start(t); src.stop(t + 0.2);
    const o = a.createOscillator(), g2 = a.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(120, t + 0.08);
    g2.gain.setValueAtTime(0.12 * e.vel, t); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    o.connect(g2).connect(b.bus); o.start(t); o.stop(t + 0.12);
  } else {
    // hat, ohat and shaker: filtered noise.
    const src = a.createBufferSource(), g = a.createGain(), f = a.createBiquadFilter();
    src.buffer = e.part === 'shaker' ? b.shakeNoise : b.hatNoise;
    f.type = e.part === 'shaker' ? 'bandpass' : 'highpass'; f.frequency.value = e.part === 'shaker' ? 3200 : 7000; f.Q.value = e.part === 'shaker' ? 1.4 : 0.7;
    const peak = e.part === 'shaker' ? 0.04 : e.part === 'ohat' ? 0.035 : 0.028;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak * e.vel, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(b.bus); src.start(t); src.stop(t + dur + 0.02);
  }
}

function targetGain() { return isMuted() || !wanted || !band ? 0 : ducked ? DUCKED : band.level; }

function schedule() {
  const a = audioContext();
  if (!a || !band) return;
  while (nextBarTime < a.currentTime + 0.8) {
    if (nextBarTime < a.currentTime - band.bar) nextBarTime = a.currentTime + 0.05;   // the tab slept: skip ahead
    for (const e of band.events(nextBar)) playEvent(a, band, e, nextBarTime);
    nextBar += 1; nextBarTime += band.bar;
  }
}

function ramp(gain, seconds = 0.8) {
  const a = audioContext(); if (!a || !band) return;
  const g = band.master.gain, now = a.currentTime;
  g.cancelScheduledValues(now); g.setValueAtTime(Math.max(0.0001, g.value), now);
  gain > 0 ? g.linearRampToValueAtTime(gain, now + seconds) : g.exponentialRampToValueAtTime(0.0001, now + seconds);
}

/** Which score is playing (or wanted), or null. */
export const currentTrack = () => (wanted ? current : null);

/**
 * Start a score ('lounge' | 'battle' | 'boss'; idempotent for the same one, a quick crossfade to another).
 * Safe to call before the audio context is unlocked: it just stays silent until a gesture resumes it.
 */
export function play(track = 'lounge') {
  const name = TRACKS[track] ? track : 'lounge';
  if (band && band.track !== name) { stop(0.35); ducked = false; }   // stop() clears the flags, so set them after it
  wanted = true;
  current = name;
  const a = audioContext();
  if (!a) return false;
  if (a.state === 'suspended') { try { a.resume(); } catch { /* unlocked later by a gesture */ } }
  if (!band) {
    try { band = buildBand(a, name); } catch { band = null; return false; }
    nextBar = 0; nextBarTime = a.currentTime + 0.1;
    timer = setInterval(schedule, 200);
    schedule();
  }
  ramp(targetGain(), band.track === 'lounge' ? 1.5 : 0.6);
  return true;
}

/** Fade out and free the band. */
export function stop(fade = 0.6) {
  wanted = false; ducked = false; current = null;
  if (!band) return;
  const b = band; band = null;
  if (timer) { clearInterval(timer); timer = null; }
  const a = audioContext();
  if (a) {
    const now = a.currentTime;
    b.master.gain.cancelScheduledValues(now); b.master.gain.setValueAtTime(Math.max(0.0001, b.master.gain.value), now);
    b.master.gain.exponentialRampToValueAtTime(0.0001, now + fade);
    setTimeout(() => { try { b.master.disconnect(); } catch { /* already gone */ } }, fade * 1000 + 100);
  } else { try { b.master.disconnect(); } catch { /* ignore */ } }
}

/** Turn the music down (a mini-game or dialog is on top) or back up. */
export function duck(on) { ducked = !!on; ramp(targetGain(), on ? 0.5 : 1.2); }

export const isPlaying = () => !!band && wanted;

/**
 * Render `seconds` of a score offline and report how loud it is: a check that the band actually makes
 * sound on this browser (used by the headless smoke test; handy from the console too).
 */
export async function render(seconds = 8, track = 'lounge') {
  const Offline = typeof window !== 'undefined' && (window.OfflineAudioContext || window.webkitOfflineAudioContext);
  if (!Offline) return null;
  const a = new Offline(2, Math.ceil(44100 * seconds), 44100);
  const b = buildBand(a, TRACKS[track] ? track : 'lounge');
  b.master.gain.value = b.level;
  for (let bar = 0, t = 0.05; t < seconds; bar++, t += b.bar) for (const e of b.events(bar)) playEvent(a, b, e, t);
  const buf = await a.startRendering();
  const d = buf.getChannelData(0);
  let sum = 0, peak = 0;
  for (let i = 0; i < d.length; i++) { sum += d[i] * d[i]; peak = Math.max(peak, Math.abs(d[i])); }
  return { rms: Math.sqrt(sum / d.length), peak, buffer: buf };
}

onMuted(() => ramp(targetGain(), 0.3));
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (!document.hidden && band) schedule(); });
