import { describe, it, expect } from 'vitest';
import { barEvents, battleEvents, LOUNGE, BATTLE, TRACKS, play, stop, isPlaying, currentTrack } from '../src/systems/Music.js';

describe('lounge loop', () => {
  it('writes a full band for every bar of the progression, in time and in key', () => {
    for (let bar = 0; bar < LOUNGE.bars.length; bar++) {
      const ev = barEvents(bar);
      const parts = new Set(ev.map((e) => e.part));
      expect(parts.has('chord')).toBe(true);
      expect(parts.has('bass')).toBe(true);
      expect(parts.has('hat')).toBe(true);
      for (const e of ev) {
        expect(e.at).toBeGreaterThanOrEqual(0);
        expect(e.at).toBeLessThan(4);
        expect(e.dur).toBeGreaterThan(0);
        expect(e.vel).toBeGreaterThan(0);
      }
      const chordNotes = ev.filter((e) => e.part === 'chord' && e.at === 0).map((e) => e.midi);
      expect(chordNotes).toEqual(LOUNGE.bars[bar].chord);
      expect(ev.find((e) => e.part === 'bass' && e.at === 0).midi).toBe(LOUNGE.bars[bar].root);
      for (const e of ev.filter((x) => x.part === 'lead')) expect(LOUNGE.scale).toContain(e.midi);
    }
  });

  it('is deterministic per bar and varies between bars', () => {
    expect(barEvents(2)).toEqual(barEvents(2));
    const bars = Array.from({ length: LOUNGE.bars.length }, (_, i) => JSON.stringify(barEvents(i)));
    expect(new Set(bars).size).toBeGreaterThan(1);
  });

  it('stays silent without Web Audio', () => {
    expect(play()).toBe(false);
    expect(play('battle')).toBe(false);
    expect(isPlaying()).toBe(false);
    expect(currentTrack()).toBe('battle');   // remembered, so the world can switch back to the lounge
    stop();
    expect(currentTrack()).toBeNull();
  });
});

describe('battle loop', () => {
  it('drives every bar with stabs, a running bass and drums, adds the arpeggio in the second half and always for a boss', () => {
    expect(Object.keys(TRACKS)).toEqual(['lounge', 'battle', 'boss']);
    expect(TRACKS.battle.bpm).toBeGreaterThan(TRACKS.lounge.bpm);
    for (let bar = 0; bar < 16; bar++) {
      const ev = battleEvents(bar);
      const parts = new Set(ev.map((e) => e.part));
      for (const p of ['stab', 'bass', 'kick', 'snare', 'hat']) expect(parts.has(p), p).toBe(true);
      expect(parts.has('arp')).toBe(bar >= 8);
      expect(ev.filter((e) => e.part === 'bass')).toHaveLength(8);
      const chord = BATTLE.bars[bar % 8];
      expect(ev.filter((e) => e.part === 'stab' && e.at === 0).map((e) => e.midi)).toEqual(chord.chord);
      for (const e of ev) { expect(e.at).toBeGreaterThanOrEqual(0); expect(e.at).toBeLessThan(4); expect(e.dur).toBeGreaterThan(0); }
      for (const e of ev.filter((x) => x.part === 'bass')) expect([chord.root, chord.root + 7, chord.root + 12]).toContain(e.midi);
    }
    expect(battleEvents(0, 13, { boss: true }).some((e) => e.part === 'arp')).toBe(true);
    expect(battleEvents(3)).toEqual(battleEvents(3));
  });
});
