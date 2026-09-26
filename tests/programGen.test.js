import { describe, it, expect } from 'vitest';
import { Rng } from '../src/systems/Rng.js';
import { generateRound, generateRounds } from '../src/generators/coding/programGen.js';
import { runToEnd, parseLevel, countBlocks } from '../src/generators/coding/interpreter.js';

const ops = (list, acc = []) => { for (const b of list || []) { acc.push(b.op); ops(b.body, acc); ops(b.then, acc); ops(b.else, acc); } return acc; };

describe('predict program generator', () => {
  for (const band of ['A', 'B', 'C']) {
    it(`band ${band}: never crashes, ends away from start, uses the band block`, () => {
      const rng = new Rng(1234 + band.charCodeAt(0));
      for (let i = 0; i < 200; i++) {
        const round = generateRound(rng, band);
        const lv = parseLevel(round.level);
        expect(lv.w).toBeGreaterThanOrEqual(5); expect(lv.w).toBeLessThanOrEqual(7); expect(lv.h).toBe(lv.w);
        expect(round.level.grid[0]).toMatch(/^#+$/);
        for (const row of round.level.grid) { expect(row[0]).toBe('#'); expect(row.at(-1)).toBe('#'); }
        const r = runToEnd(round.program, round.level);
        expect(r.crashed).toBe(false);
        expect(r.end).toEqual(round.end);
        expect(r.end.x !== lv.start.x || r.end.y !== lv.start.y).toBe(true);
        expect(lv.walls[r.end.y][r.end.x]).toBe(false);
        const used = ops(round.program.main);
        if (band === 'A') expect(used.every((o) => ['fwd', 'left', 'right'].includes(o))).toBe(true);
        if (band === 'B') expect(used).toContain('repeat');
        if (band === 'C') expect(used).toContain('if');
        expect(countBlocks(round.program)).toBeLessThanOrEqual(8);
      }
    });
  }
  it('is reproducible from a seed and makes 6 rounds', () => {
    const a = generateRounds(new Rng(5), 'B');
    const b = generateRounds(new Rng(5), 'B');
    expect(a).toHaveLength(6);
    expect(a.map((r) => r.level.grid.join('/'))).toEqual(b.map((r) => r.level.grid.join('/')));
  });
});
