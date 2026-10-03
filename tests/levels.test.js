import { describe, it, expect } from 'vitest';
import { LEVELS, BUG_LEVELS, levelsForBand, getLevel, nextUnsolvedLevel } from '../src/data/coding/levels.js';
import { runToEnd, countBlocks, parseLevel } from '../src/generators/coding/interpreter.js';
import { cloneProgram, applyFix, findBlock } from '../src/generators/coding/ast.js';
import { BLOCKS } from '../src/data/coding/blocks.js';

const usedOps = (program) => {
  const ops = new Set();
  const walk = (list) => (list || []).forEach((b) => { ops.add(b.op); walk(b.body); walk(b.then); walk(b.else); });
  walk(program.main);
  Object.values(program.functions || {}).forEach(walk);
  return ops;
};

describe('Robo Maze levels', () => {
  it('has 12 levels per band (8 first mazes for Pre-K and K) with unique ids', () => {
    expect(LEVELS).toHaveLength(44);
    expect(levelsForBand('E').map((l) => l.id)).toEqual(['E-01', 'E-02', 'E-03', 'E-04', 'E-05', 'E-06', 'E-07', 'E-08']);
    for (const band of ['A', 'B', 'C']) {
      const ids = levelsForBand(band).map((l) => l.id);
      expect(ids).toHaveLength(12);
      ids.forEach((id, i) => expect(id).toBe(`${band}-${String(i + 1).padStart(2, '0')}`));
    }
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(44);
  });

  for (const lv of LEVELS) {
    it(`${lv.id} ${lv.title}: well formed, solvable within par <= maxBlocks`, () => {
      const p = parseLevel(lv);
      expect(p.goal).toBeTruthy();
      expect(p.w).toBeLessThanOrEqual(10); expect(p.h).toBeLessThanOrEqual(10);
      for (const row of lv.grid) {
        expect(row.length).toBe(p.w);
        expect(row[0]).toBe('#'); expect(row[row.length - 1]).toBe('#');
      }
      expect(lv.grid[0]).toMatch(/^#+$/); expect(lv.grid.at(-1)).toMatch(/^#+$/);
      expect(lv.hint).toBeTruthy();
      expect(lv.par).toBe(countBlocks(lv.solution));
      expect(lv.par).toBeLessThanOrEqual(lv.maxBlocks);
      expect(lv.maxBlocks).toBeLessThanOrEqual(12);
      for (const id of lv.blocks) expect(BLOCKS[id]).toBeTruthy();
      for (const op of usedOps(lv.solution)) expect(lv.blocks).toContain(op);
      const r = runToEnd(lv.solution, lv);
      expect(r, `${lv.id} crashed: ${r.reason}`).toMatchObject({ solved: true, crashed: false });
    });
  }

  it('helpers: getLevel and nextUnsolvedLevel', () => {
    expect(getLevel('B-03').title).toBe('Coin Ring');
    expect(getLevel('nope')).toBeNull();
    const profile = { coding: { levels: { 'A-01': { stars: 2 }, 'A-02': { stars: 0 } } } };
    expect(nextUnsolvedLevel(profile, 'A').id).toBe('A-02');
    expect(nextUnsolvedLevel(null, 'B').id).toBe('B-01');
    const all = { coding: { levels: Object.fromEntries(levelsForBand('C').map((l) => [l.id, { stars: 1 }])) } };
    expect(nextUnsolvedLevel(all, 'C').id).toBe('C-12');
  });
});

describe('Bug Hunt puzzles', () => {
  it('has 6 puzzles per band', () => {
    expect(BUG_LEVELS).toHaveLength(18);
    for (const band of ['A', 'B', 'C']) expect(BUG_LEVELS.filter((b) => b.band === band)).toHaveLength(6);
    expect(new Set(BUG_LEVELS.map((b) => b.id)).size).toBe(18);
  });
  for (const bl of BUG_LEVELS) {
    it(`${bl.id}: buggy program fails, fixed program solves`, () => {
      expect(findBlock(bl.program, bl.fix.uid)).toBeTruthy();
      const before = runToEnd(bl.program, bl.level);
      expect(before.solved).toBe(false);
      const fixed = cloneProgram(bl.program);
      applyFix(fixed, bl.fix);
      const after = runToEnd(fixed, bl.level);
      expect(after, `${bl.id} fixed still fails: ${after.reason}`).toMatchObject({ solved: true });
      expect(countBlocks(bl.program)).toBeLessThanOrEqual(bl.level.maxBlocks);
      for (const op of usedOps(fixed)) expect(bl.level.blocks).toContain(op);
    });
  }
});
