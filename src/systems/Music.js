// Background music without audio files: a slow lounge loop played by a small Web Audio band (soft electric
// piano chords, a round bass, brushed hats and an occasional pentatonic melody line) through a light reverb.
// Explore mode starts it, mini-games duck it, the sound setting mutes it. Everything degrades to silence
// when Web Audio is missing, so tests and old browsers are unaffected.
import { audioContext, isMuted, onMuted } from './Audio.js';
import { mulberry32 } from './Rng.js';

const BPM = 72, BEAT = 60 / BPM, BAR = BEAT * 4;
const MASTER = 0.42, DUCKED = 0.1;

// Eight bars, one chord each (the last bar walks ii-V back home). Voicings are rootless (the bass plays the root).
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

const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

/**
 * Note events for one bar: { at (beats from bar start), dur (beats), midi, part: 'chord'|'bass'|'hat'|'shaker'|'lead', vel }.
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

let band = null;     // live graph while playing
let timer = null, nextBar = 0, nextBarTime = 0, ducked = false, wanted = false;

function noiseBuffer(a, seconds, decay = 0) {
  const len = Math.floor(a.sampleRate * seconds), buf = a.createBuffer(2, len, a.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (decay ? Math.pow(1 - i / len, decay) : 1);
  }
  return buf;
}

function buildBand(a) {
  const master = a.createGain(); master.gain.value = 0;
  const comp = a.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
  const tone = a.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 4200;
  const dry = a.createGain(); dry.gain.value = 0.8;
  const verb = a.createConvolver(); verb.buffer = noiseBuffer(a, 2.2, 3);
  const wet = a.createGain(); wet.gain.value = 0.28;
  const bus = a.createGain();
  bus.connect(dry).connect(tone); bus.connect(verb).connect(wet).connect(tone);
  tone.connect(comp).connect(master).connect(a.destination);
  const echo = a.createDelay(1); echo.delayTime.value = BEAT * 0.75;
  const fb = a.createGain(); fb.gain.value = 0.28;
  echo.connect(fb).connect(echo); echo.connect(bus);
  const hatNoise = noiseBuffer(a, 0.25), shakeNoise = noiseBuffer(a, 0.3);
  return { master, bus, echo, hatNoise, shakeNoise };
}

function playEvent(a, b, e, t0) {
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
  } else if (e.part === 'bass') {
    const o = a.createOscillator(), g = a.createGain(), f = a.createBiquadFilter();
    o.type = 'triangle'; o.frequency.value = midiHz(e.midi);
    f.type = 'lowpass'; f.frequency.value = 320;
    env(g, 0.16 * e.vel, 0.01, 0.25);
    o.connect(f).connect(g).connect(b.bus); o.start(t); o.stop(t + dur + 0.1);
  } else {
    const src = a.createBufferSource(), g = a.createGain(), f = a.createBiquadFilter();
    src.buffer = e.part === 'hat' ? b.hatNoise : b.shakeNoise;
    f.type = e.part === 'hat' ? 'highpass' : 'bandpass'; f.frequency.value = e.part === 'hat' ? 7000 : 3200; f.Q.value = e.part === 'hat' ? 0.7 : 1.4;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime((e.part === 'hat' ? 0.028 : 0.04) * e.vel, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(b.bus); src.start(t); src.stop(t + dur + 0.02);
  }
}

function targetGain() { return isMuted() || !wanted ? 0 : ducked ? DUCKED : MASTER; }

function schedule() {
  const a = audioContext();
  if (!a || !band) return;
  while (nextBarTime < a.currentTime + 0.8) {
    if (nextBarTime < a.currentTime - BAR) nextBarTime = a.currentTime + 0.05;   // the tab slept: skip ahead
    for (const e of barEvents(nextBar)) playEvent(a, band, e, nextBarTime);
    nextBar += 1; nextBarTime += BAR;
  }
}

function ramp(gain, seconds = 0.8) {
  const a = audioContext(); if (!a || !band) return;
  const g = band.master.gain, now = a.currentTime;
  g.cancelScheduledValues(now); g.setValueAtTime(Math.max(0.0001, g.value), now);
  gain > 0 ? g.linearRampToValueAtTime(gain, now + seconds) : g.exponentialRampToValueAtTime(0.0001, now + seconds);
}

/** Start the lounge loop (idempotent). Safe to call before the audio context is unlocked: it just stays silent. */
export function play() {
  wanted = true;
  const a = audioContext();
  if (!a) return false;
  if (a.state === 'suspended') { try { a.resume(); } catch { /* unlocked later by a gesture */ } }
  if (!band) {
    try { band = buildBand(a); } catch { band = null; return false; }
    nextBar = 0; nextBarTime = a.currentTime + 0.1;
    timer = setInterval(schedule, 200);
    schedule();
  }
  ramp(targetGain(), 1.5);
  return true;
}

/** Fade out and free the band. */
export function stop(fade = 0.6) {
  wanted = false; ducked = false;
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
 * Render `seconds` of the loop offline and report how loud it is: a check that the band actually makes
 * sound on this browser (used by the headless smoke test; handy from the console too).
 */
export async function render(seconds = 8) {
  const Offline = typeof window !== 'undefined' && (window.OfflineAudioContext || window.webkitOfflineAudioContext);
  if (!Offline) return null;
  const a = new Offline(2, Math.ceil(44100 * seconds), 44100);
  const b = buildBand(a);
  b.master.gain.value = MASTER;
  for (let bar = 0, t = 0.05; t < seconds; bar++, t += BAR) for (const e of barEvents(bar)) playEvent(a, b, e, t);
  const buf = await a.startRendering();
  const d = buf.getChannelData(0);
  let sum = 0, peak = 0;
  for (let i = 0; i < d.length; i++) { sum += d[i] * d[i]; peak = Math.max(peak, Math.abs(d[i])); }
  return { rms: Math.sqrt(sum / d.length), peak, buffer: buf };
}

onMuted(() => ramp(targetGain(), 0.3));
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (!document.hidden && band) schedule(); });
