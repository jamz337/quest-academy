// Pure robot-program interpreter. No Phaser here so it runs in tests and in the scenes alike.
//
// Program AST: { main: Block[], functions: { F1?: Block[] } }
//   { uid, op: 'fwd'|'left'|'right'|'pick' }
//   { uid, op: 'repeat', n, body: [] }
//   { uid, op: 'if', cond: 'ahead'|'left'|'right', then: [], else: [] | null }
//   { uid, op: 'while', cond: 'notGoal', body: [] }
//   { uid, op: 'call', fn: 'F1' }
// Level grid strings: '#' wall, '.' floor, 'S' start, 'G' goal, '*' coin.
// Directions: 0 = N, 1 = E, 2 = S, 3 = W.

export const DIRS = [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }];
export const DIR_INDEX = { N: 0, E: 1, S: 2, W: 3 };
export const DIR_NAME = ['N', 'E', 'S', 'W'];
export const MAX_STEPS = 300;      // primitive steps before a 'steps' crash
const MAX_OPS = 5000;              // any block visits, guards empty infinite loops

/** Turn a level ({ grid, startDir }) into a parsed level. Already-parsed levels pass through. */
export function parseLevel(level) {
  if (level && level.walls && level.start && typeof level.w === 'number') return level;
  const grid = level.grid;
  const h = grid.length;
  const w = Math.max(...grid.map((r) => r.length));
  const walls = [];
  const coins = [];
  let start = null, goal = null;
  for (let y = 0; y < h; y++) {
    walls[y] = [];
    for (let x = 0; x < w; x++) {
      const ch = grid[y][x] ?? '#';
      walls[y][x] = ch === '#';
      if (ch === 'S') start = { x, y };
      else if (ch === 'G') goal = { x, y };
      else if (ch === '*') coins.push({ x, y });
    }
  }
  if (!start) throw new Error(`Level ${level.id || ''} has no start cell`);
  const dir = typeof level.startDir === 'number' ? level.startDir : (DIR_INDEX[level.startDir] ?? 0);
  return { id: level.id, w, h, walls, start, dir, goal, coins };
}

export function isWall(lv, x, y) {
  return x < 0 || y < 0 || x >= lv.w || y >= lv.h || !!lv.walls[y][x];
}

const coinKey = (x, y) => x + ',' + y;

function relDir(dir, cond) {
  if (cond === 'ahead') return dir;
  if (cond === 'left') return (dir + 3) % 4;
  if (cond === 'right') return (dir + 1) % 4;
  return dir;
}

export function evalCond(cond, lv, st) {
  if (cond === 'notGoal') return !(lv.goal && st.x === lv.goal.x && st.y === lv.goal.y);
  const d = DIRS[relDir(st.dir, cond)];
  return !isWall(lv, st.x + d.dx, st.y + d.dy);
}

function* crash(st, uid, reason) {
  st.done = true; st.crashed = true; st.reason = reason;
  yield { kind: 'crash', uid, reason, at: { x: st.x, y: st.y }, dir: st.dir };
}

function* primitive(st, b) {
  if (st.steps >= MAX_STEPS) { yield* crash(st, b.uid, 'steps'); return false; }
  st.steps += 1;
  return true;
}

function* runList(list, program, lv, st) {
  for (const b of list || []) {
    if (st.done) return;
    yield* runBlock(b, program, lv, st);
  }
}

function* runBlock(b, program, lv, st) {
  if (st.done || !b) return;
  st.ops += 1;
  if (st.ops > MAX_OPS) { yield* crash(st, b.uid, 'steps'); return; }
  switch (b.op) {
    case 'fwd': {
      if (!(yield* primitive(st, b))) return;
      const d = DIRS[st.dir];
      const nx = st.x + d.dx, ny = st.y + d.dy;
      if (isWall(lv, nx, ny)) { yield* crash(st, b.uid, 'wall'); return; }
      const from = { x: st.x, y: st.y };
      st.x = nx; st.y = ny;
      yield { kind: 'move', uid: b.uid, from, to: { x: nx, y: ny }, dir: st.dir };
      const key = coinKey(nx, ny);
      if (st.coins.has(key)) { st.coins.delete(key); yield { kind: 'pick', uid: b.uid, at: { x: nx, y: ny } }; }
      if (lv.goal && nx === lv.goal.x && ny === lv.goal.y) {
        st.done = true; st.goal = true;
        yield { kind: 'goal', uid: b.uid, at: { x: nx, y: ny } };
      }
      return;
    }
    case 'left':
    case 'right': {
      if (!(yield* primitive(st, b))) return;
      st.dir = (st.dir + (b.op === 'left' ? 3 : 1)) % 4;
      yield { kind: 'turn', uid: b.uid, dir: st.dir, turn: b.op };
      return;
    }
    case 'pick': {
      // Coins are picked up automatically when stepping on them, so this is a harmless no-op step.
      if (!(yield* primitive(st, b))) return;
      yield { kind: 'pick', uid: b.uid, at: { x: st.x, y: st.y }, empty: true };
      return;
    }
    case 'repeat': {
      const n = Math.max(0, Math.min(99, Math.floor(Number(b.n) || 0)));
      for (let i = 0; i < n && !st.done; i++) yield* runList(b.body, program, lv, st);
      return;
    }
    case 'if': {
      const ok = evalCond(b.cond || 'ahead', lv, st);
      yield* runList(ok ? b.then : b.else, program, lv, st);
      return;
    }
    case 'while': {
      while (!st.done && evalCond(b.cond || 'notGoal', lv, st)) {
        st.ops += 1;
        if (st.ops > MAX_OPS) { yield* crash(st, b.uid, 'steps'); return; }
        yield* runList(b.body, program, lv, st);
      }
      return;
    }
    case 'call': {
      const fn = program.functions && program.functions[b.fn || 'F1'];
      if (!fn) return;
      if (st.depth >= 16) { yield* crash(st, b.uid, 'steps'); return; }
      st.depth += 1;
      yield* runList(fn, program, lv, st);
      st.depth -= 1;
      return;
    }
    default:
      return;
  }
}

/** Generator of execution steps. Stops after the goal is reached or a crash. */
export function* execute(program, levelIn) {
  const lv = parseLevel(levelIn);
  const st = {
    x: lv.start.x, y: lv.start.y, dir: lv.dir, steps: 0, ops: 0, depth: 0,
    coins: new Set(lv.coins.map((c) => coinKey(c.x, c.y))), done: false, crashed: false, reason: null, goal: false
  };
  yield* runList(program.main, program, lv, st);
}

/** Run a whole program and summarise the outcome. */
export function runToEnd(program, levelIn) {
  const lv = parseLevel(levelIn);
  const steps = [];
  const end = { x: lv.start.x, y: lv.start.y, dir: lv.dir };
  let crashed = false, reason = null, goalReached = false, coinsLeft = lv.coins.length;
  for (const s of execute(program, lv)) {
    steps.push(s);
    if (s.kind === 'move') { end.x = s.to.x; end.y = s.to.y; }
    else if (s.kind === 'turn') end.dir = s.dir;
    else if (s.kind === 'pick' && !s.empty) coinsLeft -= 1;
    else if (s.kind === 'crash') { crashed = true; reason = s.reason; }
    else if (s.kind === 'goal') goalReached = true;
  }
  return { solved: goalReached && coinsLeft === 0, goalReached, crashed, reason, steps, end, coinsLeft };
}

/** Count every block instance in the program, including nested ones and function bodies. */
export function countBlocks(program) {
  const countList = (list) => (list || []).reduce((n, b) => n + countBlock(b), 0);
  const countBlock = (b) => {
    if (!b) return 0;
    let n = 1;
    if (b.body) n += countList(b.body);
    if (b.then) n += countList(b.then);
    if (b.else) n += countList(b.else);
    return n;
  };
  if (!program) return 0;
  let n = countList(program.main);
  for (const fn of Object.values(program.functions || {})) n += countList(fn);
  return n;
}
