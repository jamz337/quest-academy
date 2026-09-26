import { describe, it, expect } from 'vitest';
import { parseLevel, execute, runToEnd, countBlocks, MAX_STEPS } from '../src/generators/coding/interpreter.js';
import { B, assignUids, makeBlock, insertBlock, removeBlock, moveBlock, findBlock, flatten, cloneProgram, applyFix, setOp } from '../src/generators/coding/ast.js';

const { fwd, left, right, repeat, iff, whl, call } = B;
const prog = (main, functions = {}) => assignUids({ main, functions }, 't');

const corridor = { id: 'T', grid: ['#######', '#S...G#', '#######'], startDir: 'E' };
const corner = { id: 'T2', grid: ['######', '#S...#', '####.#', '####G#', '######'], startDir: 'E' };

describe('parseLevel', () => {
  it('reads walls, start, goal, coins and direction', () => {
    const lv = parseLevel({ grid: ['#####', '#S*G#', '#####'], startDir: 'W' });
    expect(lv.w).toBe(5); expect(lv.h).toBe(3);
    expect(lv.start).toEqual({ x: 1, y: 1 });
    expect(lv.goal).toEqual({ x: 3, y: 1 });
    expect(lv.coins).toEqual([{ x: 2, y: 1 }]);
    expect(lv.dir).toBe(3);
    expect(lv.walls[0][0]).toBe(true);
    expect(lv.walls[1][1]).toBe(false);
  });
  it('passes parsed levels through unchanged', () => {
    const lv = parseLevel(corridor);
    expect(parseLevel(lv)).toBe(lv);
  });
});

describe('movement and turns', () => {
  it('moves forward and yields move steps with from/to', () => {
    const steps = [...execute(prog([fwd(), fwd()]), corridor)];
    expect(steps.map((s) => s.kind)).toEqual(['move', 'move']);
    expect(steps[0].from).toEqual({ x: 1, y: 1 });
    expect(steps[1].to).toEqual({ x: 3, y: 1 });
    expect(steps[0].uid).toBe('t1');
  });
  it('turns change direction (0=N,1=E,2=S,3=W)', () => {
    const r = runToEnd(prog([left(), left(), left()]), corridor);
    expect(r.steps.map((s) => s.dir)).toEqual([0, 3, 2]);
    expect(r.end.dir).toBe(2);
    expect(runToEnd(prog([right()]), corridor).end.dir).toBe(2);
  });
  it('reaches the goal and stops there', () => {
    const r = runToEnd(prog([fwd(), fwd(), fwd(), fwd(), fwd(), fwd(), fwd()]), corridor);
    expect(r.solved).toBe(true);
    expect(r.steps.at(-1).kind).toBe('goal');
    expect(r.steps.filter((s) => s.kind === 'move')).toHaveLength(4);
    expect(r.end).toEqual({ x: 5, y: 1, dir: 1 });
  });
  it('does not reach the goal when the program is too short', () => {
    const r = runToEnd(prog([fwd()]), corridor);
    expect(r.solved).toBe(false); expect(r.crashed).toBe(false);
  });
});

describe('crashes', () => {
  it('crashes into walls and stops', () => {
    const r = runToEnd(prog([left(), fwd(), fwd()]), corridor);
    expect(r.crashed).toBe(true); expect(r.reason).toBe('wall');
    expect(r.steps.at(-1)).toMatchObject({ kind: 'crash', reason: 'wall', uid: 't2' });
    expect(r.steps).toHaveLength(2);
    expect(r.end).toEqual({ x: 1, y: 1, dir: 0 });
  });
  it('caps primitive steps with a steps crash', () => {
    const lv = { grid: ['#####', '#S..#', '#...#', '#..G#', '#####'], startDir: 'E' };
    const r = runToEnd(prog([repeat(99, [repeat(99, [left()])])]), lv);
    expect(r.crashed).toBe(true); expect(r.reason).toBe('steps');
    expect(r.steps.filter((s) => s.kind === 'turn')).toHaveLength(MAX_STEPS);
  });
  it('while with an empty body cannot hang', () => {
    const r = runToEnd(prog([whl([])]), corridor);
    expect(r.crashed).toBe(true); expect(r.reason).toBe('steps');
  });
});

describe('containers', () => {
  it('repeat runs the body n times and does not yield itself', () => {
    const r = runToEnd(prog([repeat(3, [fwd()])]), corridor);
    expect(r.steps.map((s) => s.kind)).toEqual(['move', 'move', 'move']);
    expect(r.end.x).toBe(4);
  });
  it('nested repeat', () => {
    const lv = { grid: ['#######', '#S....#', '#####.#', '#####.#', '#####.#', '#####G#', '#######'], startDir: 'E' };
    const r = runToEnd(prog([repeat(2, [repeat(4, [fwd()]), right()])]), lv);
    expect(r.solved).toBe(true);
    expect(r.steps.filter((s) => s.kind === 'turn')).toHaveLength(1);
  });
  it('if/else with ahead, left and right conditions', () => {
    const r = runToEnd(prog([repeat(6, [iff('ahead', [fwd()], [right()])])]), corner);
    expect(r.solved).toBe(true);
    expect(r.steps.map((s) => s.kind)).toEqual(['move', 'move', 'move', 'turn', 'move', 'move', 'goal']);
    const lv = { grid: ['#####', '#S..#', '#.#.#', '#G#.#', '#####'], startDir: 'E' };
    // at start: left is a wall, right is open (down)
    expect(runToEnd(prog([iff('left', [fwd()], [right()])]), lv).end.dir).toBe(2);
    expect(runToEnd(prog([iff('right', [right()], [fwd()])]), lv).end.dir).toBe(2);
    expect(runToEnd(prog([iff('right', [right()], null), fwd(), fwd()]), lv).solved).toBe(true);
  });
  it('while until goal', () => {
    const r = runToEnd(prog([whl([iff('ahead', [fwd()], [right()])])]), corner);
    expect(r.solved).toBe(true);
    expect(r.steps.filter((s) => s.kind === 'move')).toHaveLength(5);
  });
  it('call runs F1 and missing functions are ignored', () => {
    const p = prog([call(), call()], { F1: [fwd(), fwd()] });
    expect(runToEnd(p, corridor).solved).toBe(true);
    expect(runToEnd(prog([call(), fwd()]), corridor).end.x).toBe(2);
  });
  it('recursive functions crash with steps instead of hanging', () => {
    const r = runToEnd(prog([call()], { F1: [call()] }), corridor);
    expect(r.crashed).toBe(true); expect(r.reason).toBe('steps');
  });
});

describe('coins', () => {
  const lv = { grid: ['#######', '#S*.*G#', '#######'], startDir: 'E' };
  it('are picked up automatically and required for solved', () => {
    const r = runToEnd(prog([repeat(4, [fwd()])]), lv);
    expect(r.solved).toBe(true); expect(r.coinsLeft).toBe(0);
    expect(r.steps.filter((s) => s.kind === 'pick')).toHaveLength(2);
  });
  it('goal with coins left is not solved', () => {
    const lv2 = { grid: ['#######', '#S.G.*#', '#######'], startDir: 'E' };
    const r = runToEnd(prog([repeat(4, [fwd()])]), lv2);
    expect(r.goalReached).toBe(true); expect(r.solved).toBe(false); expect(r.coinsLeft).toBe(1);
  });
  it('pick block is a harmless no-op', () => {
    const r = runToEnd(prog([B.pick(), repeat(4, [fwd()])]), lv);
    expect(r.solved).toBe(true);
    expect(r.steps[0]).toMatchObject({ kind: 'pick', empty: true });
  });
});

describe('countBlocks', () => {
  it('counts nested blocks and function bodies', () => {
    expect(countBlocks(prog([]))).toBe(0);
    expect(countBlocks(prog([fwd(), left()]))).toBe(2);
    expect(countBlocks(prog([repeat(3, [fwd(), repeat(2, [left()])])]))).toBe(4);
    expect(countBlocks(prog([iff('ahead', [fwd()], [right(), left()])]))).toBe(4);
    expect(countBlocks(prog([whl([call()])], { F1: [fwd(), fwd()] }))).toBe(4);
  });
});

describe('ast helpers', () => {
  it('insert / find / move / remove', () => {
    const p = { main: [], functions: {} };
    const r = insertBlock(p, makeBlock('repeat'), 'main', 'then');
    insertBlock(p, makeBlock('fwd'), r.uid, 'then');
    const t = insertBlock(p, makeBlock('left'), r.uid, 'then');
    expect(countBlocks(p)).toBe(3);
    expect(findBlock(p, t.uid)).toMatchObject({ index: 1, parentUid: r.uid });
    expect(moveBlock(p, t.uid, -1)).toBe(true);
    expect(r.body[0].uid).toBe(t.uid);
    expect(moveBlock(p, t.uid, -1)).toBe(false);
    removeBlock(p, t.uid);
    expect(countBlocks(p)).toBe(2);
    // insert after a sibling
    const m = insertBlock(p, makeBlock('right'), 'main', 'then');
    insertBlock(p, makeBlock('fwd'), 'main', 'then', r.uid);
    expect(p.main[1].op).toBe('fwd'); expect(p.main[2].uid).toBe(m.uid);
  });
  it('if else branch, flatten rows and setOp', () => {
    const p = { main: [], functions: {} };
    const i = insertBlock(p, makeBlock('if'), 'main', 'then');
    insertBlock(p, makeBlock('fwd'), i.uid, 'then');
    insertBlock(p, makeBlock('right'), i.uid, 'else');
    const rows = flatten(p, 'main');
    expect(rows.map((r) => r.kind)).toEqual(['block', 'block', 'else', 'block']);
    expect(rows[3].depth).toBe(1);
    expect(setOp(p, i.then[0].uid, 'left')).toBe(true);
    expect(i.then[0].op).toBe('left');
    expect(setOp(p, i.uid, 'left')).toBe(false);
  });
  it('applyFix and cloneProgram', () => {
    const p = prog([repeat(2, [fwd()], 'bug')]);
    const c = cloneProgram(p);
    applyFix(c, { uid: 'bug', n: 4 });
    expect(c.main[0].n).toBe(4); expect(p.main[0].n).toBe(2);
  });
});
