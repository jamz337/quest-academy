// Pure generator for "Predict the Robot": a random open grid plus a random program that never crashes
// and ends somewhere other than the start. Verified with the interpreter.
import { runToEnd, DIR_NAME } from './interpreter.js';
import { B, assignUids } from './ast.js';

const { fwd, left, right, repeat, iff } = B;
const TURNS = ['left', 'right'];

function randomGrid(rng) {
  const n = rng.int(5, 7);
  const cells = [];
  for (let y = 0; y < n; y++) {
    const row = [];
    for (let x = 0; x < n; x++) row.push(x === 0 || y === 0 || x === n - 1 || y === n - 1 ? '#' : '.');
    cells.push(row);
  }
  const interior = [];
  for (let y = 1; y < n - 1; y++) for (let x = 1; x < n - 1; x++) interior.push({ x, y });
  const start = rng.pick(interior);
  const others = interior.filter((c) => c.x !== start.x || c.y !== start.y);
  for (const c of rng.sample(others, rng.int(2, 5))) cells[c.y][c.x] = '#';
  cells[start.y][start.x] = 'S';
  return { id: 'predict', grid: cells.map((r) => r.join('')), startDir: DIR_NAME[rng.int(0, 3)] };
}

const turn = (rng) => (rng.pick(TURNS) === 'left' ? left() : right());
const prim = (rng) => (rng.chance(0.6) ? fwd() : turn(rng));

function randomProgram(rng, band) {
  let main;
  if (band === 'B') {
    const body = rng.chance(0.5) ? [fwd()] : rng.chance(0.5) ? [fwd(), turn(rng)] : [turn(rng), fwd()];
    main = [];
    if (rng.chance(0.5)) main.push(prim(rng));
    main.push(repeat(rng.int(2, 4), body));
    if (rng.chance(0.6)) main.push(prim(rng));
    if (rng.chance(0.3)) main.push(prim(rng));
  } else if (band === 'C') {
    main = [];
    const before = rng.int(0, 2);
    for (let i = 0; i < before; i++) main.push(prim(rng));
    main.push(iff('ahead', [fwd()], [turn(rng)]));
    const after = rng.int(1, 2);
    for (let i = 0; i < after; i++) main.push(i === 0 && rng.chance(0.5) ? fwd() : prim(rng));
  } else {
    const k = rng.int(3, 5);
    main = [];
    for (let i = 0; i < k; i++) main.push(i === 0 ? fwd() : prim(rng));
  }
  return assignUids({ main, functions: {} }, 'p');
}

/** A round: { level, program, end, steps }. Never crashes; end cell differs from start. */
export function generateRound(rng, band = 'A') {
  for (let attempt = 0; attempt < 400; attempt++) {
    const level = randomGrid(rng);
    const program = randomProgram(rng, band);
    const r = runToEnd(program, level);
    const s = level.grid.findIndex((row) => row.includes('S'));
    const sx = level.grid[s].indexOf('S');
    if (r.crashed || (r.end.x === sx && r.end.y === s)) continue;
    if (!r.steps.some((st) => st.kind === 'move')) continue;
    return { level, program, end: r.end, steps: r.steps };
  }
  // Practically unreachable fallback: an open corridor and two moves.
  const level = { id: 'predict', grid: ['#######', '#S....#', '#.....#', '#######'], startDir: 'E' };
  const program = assignUids({ main: band === 'B' ? [repeat(2, [fwd()])] : band === 'C' ? [iff('ahead', [fwd()], [left()]), fwd()] : [fwd(), fwd()], functions: {} }, 'p');
  const r = runToEnd(program, level);
  return { level, program, end: r.end, steps: r.steps };
}

export const generateRounds = (rng, band, n = 6) => Array.from({ length: n }, () => generateRound(rng, band));
