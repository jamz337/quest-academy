import { describe, it, expect } from 'vitest';
import { barEvents, LOUNGE, play, stop, isPlaying } from '../src/systems/Music.js';

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
    expect(isPlaying()).toBe(false);
    stop();
  });
});
