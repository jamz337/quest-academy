// Pure helpers for building and editing program ASTs (see interpreter.js for the shape).
import { countBlocks } from './interpreter.js';

let uidCounter = 0;
export const uid = () => 'u' + (++uidCounter).toString(36) + Math.floor(Math.random() * 1e4).toString(36);

/** Concise builders used by level data and generators. Pass an optional uid to pin an id. */
export const B = {
  fwd: (id) => ({ uid: id, op: 'fwd' }),
  left: (id) => ({ uid: id, op: 'left' }),
  right: (id) => ({ uid: id, op: 'right' }),
  pick: (id) => ({ uid: id, op: 'pick' }),
  repeat: (n, body, id) => ({ uid: id, op: 'repeat', n, body }),
  iff: (cond, then, els = null, id) => ({ uid: id, op: 'if', cond, then, else: els }),
  whl: (body, id) => ({ uid: id, op: 'while', cond: 'notGoal', body }),
  call: (id) => ({ uid: id, op: 'call', fn: 'F1' })
};

/** Create a fresh block for the palette id with sensible defaults. */
export function makeBlock(op) {
  switch (op) {
    case 'repeat': return { uid: uid(), op, n: 3, body: [] };
    case 'if': return { uid: uid(), op, cond: 'ahead', then: [], else: null };
    case 'while': return { uid: uid(), op, cond: 'notGoal', body: [] };
    case 'call': return { uid: uid(), op, fn: 'F1' };
    default: return { uid: uid(), op };
  }
}

export const emptyProgram = () => ({ main: [], functions: {} });

export function cloneProgram(p) { return JSON.parse(JSON.stringify(p || emptyProgram())); }

/** Give every block a uid if it has none (mutates, returns the program). prefix keeps hand-written ids readable. */
export function assignUids(program, prefix = 'k') {
  let n = 0;
  const walk = (list) => {
    for (const b of list || []) {
      if (!b.uid) b.uid = prefix + (++n);
      walk(b.body); walk(b.then); walk(b.else);
    }
  };
  walk(program.main);
  for (const fn of Object.values(program.functions || {})) walk(fn);
  return program;
}

export const isContainer = (b) => !!b && (b.op === 'repeat' || b.op === 'if' || b.op === 'while');

/** Root lists are addressed by the ids 'main' and 'F1'. */
export function rootList(program, root) {
  if (root === 'main') return program.main;
  program.functions ||= {};
  program.functions[root] ||= [];
  return program.functions[root];
}

/** Find a block: returns { block, list, index, parentUid, branch } or null. parentUid is a block uid or 'main'/'F1'. */
export function findBlock(program, id) {
  const search = (list, parentUid, branch) => {
    for (let i = 0; i < (list || []).length; i++) {
      const b = list[i];
      if (b.uid === id) return { block: b, list, index: i, parentUid, branch };
      const r = (b.body && search(b.body, b.uid, 'body')) || (b.then && search(b.then, b.uid, 'then')) || (b.else && search(b.else, b.uid, 'else'));
      if (r) return r;
    }
    return null;
  };
  const inMain = search(program.main, 'main', 'body');
  if (inMain) return inMain;
  for (const [name, fn] of Object.entries(program.functions || {})) {
    const r = search(fn, name, 'body');
    if (r) return r;
  }
  return null;
}

/** The list a container (or root) appends into. branch: 'then'|'else' for if blocks. */
export function bodyOf(program, containerUid, branch = 'then') {
  if (containerUid === 'main' || containerUid === 'F1') return rootList(program, containerUid);
  const f = findBlock(program, containerUid);
  if (!f) return rootList(program, 'main');
  const b = f.block;
  if (b.op === 'if') {
    if (branch === 'else') { b.else ||= []; return b.else; }
    return b.then;
  }
  if (b.body) return b.body;
  return f.list; // primitive: append beside it
}

/** Which root ('main' or 'F1') a container uid lives in. */
export function rootOf(program, containerUid) {
  if (containerUid === 'main' || containerUid === 'F1') return containerUid;
  const f = findBlock(program, containerUid);
  if (!f) return 'main';
  return f.parentUid === 'main' || f.parentUid === 'F1' ? f.parentUid : rootOf(program, f.parentUid);
}

/** Insert a block into the container; after `afterUid` if that block is in the same list, else at the end. */
export function insertBlock(program, block, containerUid, branch, afterUid) {
  const list = bodyOf(program, containerUid, branch);
  const idx = afterUid ? list.findIndex((b) => b.uid === afterUid) : -1;
  if (idx >= 0) list.splice(idx + 1, 0, block); else list.push(block);
  return block;
}

export function removeBlock(program, id) {
  const f = findBlock(program, id);
  if (!f) return null;
  f.list.splice(f.index, 1);
  return f.block;
}

/** Move a block up (-1) or down (+1) within its list. */
export function moveBlock(program, id, delta) {
  const f = findBlock(program, id);
  if (!f) return false;
  const j = f.index + delta;
  if (j < 0 || j >= f.list.length) return false;
  [f.list[f.index], f.list[j]] = [f.list[j], f.list[f.index]];
  return true;
}

/** Replace a primitive's op in place (used by Bug Hunt and the cycle button). */
export function setOp(program, id, op) {
  const f = findBlock(program, id);
  if (!f || isContainer(f.block) || op === 'repeat' || op === 'if' || op === 'while') return false;
  f.block.op = op;
  if (op === 'call') f.block.fn = 'F1'; else delete f.block.fn;
  return true;
}

/** Apply a Bug Hunt style fix { uid, op?, n?, cond? } (mutates). */
export function applyFix(program, fix) {
  const f = findBlock(program, fix.uid);
  if (!f) return false;
  if (fix.op !== undefined) f.block.op = fix.op;
  if (fix.n !== undefined) f.block.n = fix.n;
  if (fix.cond !== undefined) f.block.cond = fix.cond;
  return true;
}

/**
 * Flatten a root list into rows for rendering:
 * { kind:'block', block, depth, parentUid, branch } and { kind:'else', block (the if), depth } marker rows.
 */
export function flatten(program, root = 'main') {
  const rows = [];
  const walk = (list, depth, parentUid, branch) => {
    for (const b of list || []) {
      rows.push({ kind: 'block', block: b, depth, parentUid, branch });
      if (b.op === 'if') {
        walk(b.then, depth + 1, b.uid, 'then');
        if (b.else) { rows.push({ kind: 'else', block: b, depth }); walk(b.else, depth + 1, b.uid, 'else'); }
      } else if (b.body) walk(b.body, depth + 1, b.uid, 'body');
    }
  };
  walk(rootList(program, root), 0, root, 'body');
  return rows;
}

export { countBlocks };
