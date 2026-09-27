// Robot Dance rounds: the robot performs a program on a small floor; the player picks which of three
// programs it followed. The two wrong programs are small edits of the right one (a flipped turn, a changed
// repeat count, a move more or less) that provably end somewhere else, so watching carefully always decides it.
import { generateRound } from './programGen.js';
import { runToEnd } from './interpreter.js';
import { cloneProgram, assignUids } from './ast.js';
import { programText } from './text.js';

const flip = (op) => (op === 'left' ? 'right' : 'left');

/** All blocks of a program (main only; the generator never uses functions), depth first. */
function allBlocks(program) {
  const out = [];
  const walk = (list) => { for (const b of list || []) { out.push({ block: b, list }); walk(b.body); } };
  walk(program.main);
  return out;
}

/** One random edit of a copy of the program, or null when the edit was not possible. */
function mutate(program, rng) {
  const p = cloneProgram(program);
  const blocks = allBlocks(p);
  const kind = rng.pick(['turn', 'turn', 'repeat', 'addMove', 'dropMove', 'swap']);
  if (kind === 'turn') {
    const turns = blocks.filter((x) => x.block.op === 'left' || x.block.op === 'right');
    if (!turns.length) return null;
    const t = rng.pick(turns); t.block.op = flip(t.block.op);
  } else if (kind === 'repeat') {
    const reps = blocks.filter((x) => x.block.op === 'repeat');
    if (!reps.length) return null;
    const r = rng.pick(reps); r.block.n = Math.max(2, r.block.n + (r.block.n >= 4 || rng.chance(0.5) ? -1 : 1));
  } else if (kind === 'addMove') {
    const at = rng.int(0, p.main.length);
    p.main.splice(at, 0, { op: 'fwd' });
  } else if (kind === 'dropMove') {
    const moves = p.main.map((b, i) => (b.op === 'fwd' ? i : -1)).filter((i) => i >= 0);
    if (moves.length < 2) return null;
    p.main.splice(rng.pick(moves), 1);
  } else {
    if (p.main.length < 2) return null;
    const i = rng.int(0, p.main.length - 2);
    if (p.main[i].op === p.main[i + 1].op) return null;
    [p.main[i], p.main[i + 1]] = [p.main[i + 1], p.main[i]];
  }
  return assignUids(p, 'd');
}

const sameEnd = (a, b) => a.x === b.x && a.y === b.y && a.dir === b.dir;

/**
 * A round: { level, program, steps, end, choices: [{ text, right }], answer } with three programs to pick from.
 * Every wrong choice is a valid program (no crash) that ends on a different cell or facing another way.
 */
export function danceRound(rng, band = 'A') {
  for (let attempt = 0; attempt < 30; attempt++) {
    const r = generateRound(rng, band);
    const right = programText(r.program.main);
    const wrongs = [];
    for (let i = 0; i < 40 && wrongs.length < 2; i++) {
      const m = mutate(r.program, rng);
      if (!m) continue;
      const out = runToEnd(m, r.level);
      const t = programText(m.main);
      if (out.crashed || sameEnd(out.end, r.end) || t === right || wrongs.some((w) => w.text === t)) continue;
      wrongs.push({ text: t, right: false });
    }
    if (wrongs.length < 2) continue;
    const choices = rng.shuffle([{ text: right, right: true }, ...wrongs]);
    return { level: r.level, program: r.program, steps: r.steps, end: r.end, choices, answer: right, skill: band === 'A' ? 'sequence_code' : band === 'B' ? 'repeat' : 'conditional' };
  }
  // Practically unreachable: a corridor, two moves, and two obviously different programs.
  const level = { id: 'dance', grid: ['#######', '#S....#', '#.....#', '#######'], startDir: 'E' };
  const program = assignUids({ main: [{ op: 'fwd' }, { op: 'fwd' }], functions: {} }, 'p');
  const r = runToEnd(program, level);
  const right = programText(program.main);
  return { level, program, steps: r.steps, end: r.end, answer: right, skill: 'sequence_code', choices: rng.shuffle([{ text: right, right: true }, { text: programText([{ op: 'fwd' }]), right: false }, { text: programText([{ op: 'fwd' }, { op: 'right' }]), right: false }]) };
}

export const danceRounds = (rng, band, n = 6) => Array.from({ length: n }, () => danceRound(rng, band));
