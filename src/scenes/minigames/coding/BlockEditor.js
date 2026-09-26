// Touch program editor drawn into a rect of a scene. It renders entirely from the program AST and the
// editor state object it is given (both live in scene.state), so the scene can rebuild at any time.
import { C, hex } from '../../../constants.js';
import { BLOCKS, CONDS } from '../../../data/coding/blocks.js';
import { text, T, FONT } from '../../../ui/TextStyles.js';
import { button } from '../../../ui/Button.js';
import { panel } from '../../../ui/Panel.js';
import { toast } from '../../../ui/Toast.js';
import { Sfx } from '../../../systems/Audio.js';
import { clamp } from '../../../systems/Layout.js';
import {
  countBlocks, flatten, findBlock, bodyOf, rootOf, insertBlock, removeBlock, moveBlock, setOp, makeBlock, isContainer
} from '../../../generators/coding/ast.js';

/** Fresh editor state to keep in scene.state. */
export const newEditorState = () => ({ selectedUid: null, containerUid: 'main', branch: 'then', view: 'main', speed: 1 });


function rowLabel(b) {
  switch (b.op) {
    case 'repeat': return `Repeat ${b.n}×`;
    case 'if': return `If path ${b.cond}`;
    case 'while': return 'Until goal';
    case 'call': return 'Do F1';
    default: return BLOCKS[b.op] ? BLOCKS[b.op].label : b.op;
  }
}

/**
 * opts: {
 *   program, editor (state from newEditorState), palette: string[], maxBlocks,
 *   readOnly?, locked? (running: no edits), runningUid?,
 *   onChange(), controls?: { onRun, onStep, onReset, onClear, onSpeed, running, extra?: [{ label, color, onClick }] }
 * }
 */
export class BlockEditor {
  constructor(scene, rect, opts) {
    this.scene = scene; this.rect = rect; this.o = opts;
    this.ui = scene.ui;
    this.program = opts.program;
    this.ed = opts.editor;
    this.rowRects = {};
    this.hl = null;
    this.draw();
  }

  get maxBlocks() { return this.o.maxBlocks || 12; }
  get canEdit() { return !this.o.readOnly && !this.o.locked; }
  get showFunctions() { return (this.o.palette || []).includes('call') || Object.keys(this.program.functions || {}).length > 0; }

  changed() { Sfx.pop(); if (this.o.onChange) this.o.onChange(); }

  // ───────────── drawing ─────────────
  draw() {
    const { rect, ui } = this;
    let y = rect.y;
    if (this.o.controls && !this.o.readOnly) { this.drawControls(rect.x, y, rect.w); y += 46 * ui; }
    const headH = 26 * ui;
    this.drawHeader(rect.x, y, rect.w, headH);
    y += headH;
    const bodyH = rect.y + rect.h - y;
    if (this.o.readOnly) {
      this.drawProgram({ x: rect.x, y, w: rect.w, h: bodyH });
      return;
    }
    const gap = 8;
    const progW = Math.round((rect.w - gap) * 0.6);
    this.drawProgram({ x: rect.x, y, w: progW, h: bodyH });
    this.drawPalette({ x: rect.x + progW + gap, y, w: rect.w - progW - gap, h: bodyH });
  }

  drawControls(x, y, w) {
    const { scene, ui } = this, c = this.o.controls;
    const items = [
      { label: '▶ Run', color: C.lime, textColor: C.navy, onClick: c.onRun, disabled: c.running },
      { label: 'Step', color: C.blue, onClick: c.onStep, disabled: c.running },
      { label: 'Reset', color: C.orange, textColor: C.navy, onClick: c.onReset },
      { label: 'Clear', color: C.red, onClick: c.onClear, disabled: c.running || this.o.locked },
      { label: `${this.ed.speed || 1}x`, color: C.dark, onClick: c.onSpeed },
      ...(c.extra || [])
    ];
    const gap = 6, bw = (w - gap * (items.length - 1)) / items.length, bh = 40 * ui;
    items.forEach((it, i) => {
      button(scene, x + i * (bw + gap) + bw / 2, y + bh / 2, bw, bh, it.label, {
        color: it.color, textColor: it.textColor ?? C.white, fontSize: bw < 70 ? 13 : 15, disabled: !!it.disabled, onClick: it.onClick
      });
    });
  }

  drawHeader(x, y, w, h) {
    const { scene, ui } = this;
    const n = countBlocks(this.program);
    const over = n > this.maxBlocks;
    const label = this.o.readOnly ? 'Program' : `Blocks ${n} / ${this.maxBlocks}`;
    text(scene, x + 4, y + h / 2, label, T.small(scene, over ? C.red : C.grey)).setOrigin(0, 0.5);
    if (this.showFunctions && !this.o.readOnly) {
      const tw = 56 * ui, th = h - 2;
      ['main', 'F1'].forEach((v, i) => {
        const active = this.ed.view === v;
        button(scene, x + w - tw / 2 - (1 - i) * (tw + 4), y + h / 2, tw, th, v === 'main' ? 'Main' : 'F1', {
          color: active ? C.pink : C.panel, fontSize: 12, radius: 8, onClick: () => this.setView(v)
        });
      });
    }
  }

  drawProgram(r) {
    const { scene, ui } = this;
    const view = this.showFunctions ? (this.ed.view || 'main') : 'main';
    const rows = flatten(this.program, view);
    const sel = this.ed.selectedUid ? findBlock(this.program, this.ed.selectedUid) : null;
    const showToolbar = this.canEdit && (sel || (this.ed.containerUid !== 'main' && this.ed.containerUid !== 'F1'));
    const tbH = showToolbar ? 40 * ui : 0;
    panel(scene, r.x, r.y, r.w, r.h, { color: C.panelDark, stroke: C.panel, radius: 10 });
    const listH = r.h - tbH - 8;
    const marker = this.canEdit ? this.insertionPoint(rows, view) : null;
    const total = rows.length + (marker ? 1 : 0);
    const rh = clamp(listH / Math.max(total, 1), 14, 38 * ui);
    const indent = Math.min(16 * ui, rh * 0.6);
    const fontPx = Math.round(clamp(rh * 0.5, 10, 16 * ui));
    this.rowRects = {};
    this.rowGfx = scene.add.graphics();
    let y = r.y + 4;
    const rowsDrawn = []; // { row, x, y, w, h }
    const drawRowAt = (row, x, w, y) => rowsDrawn.push({ row, x, y, w, h: rh - 3 });
    if (rows.length === 0 && !marker) {
      text(scene, r.x + r.w / 2, r.y + Math.min(r.h / 2, 40 * ui), this.o.readOnly ? '(empty)' : 'Tap blocks to add →', T.small(scene, C.grey));
    }
    let placedMarker = false;
    rows.forEach((row, i) => {
      if (marker && marker.index === i) { this.drawMarker(r, y, rh, indent, marker.depth); y += rh; placedMarker = true; }
      const x = r.x + 6 + row.depth * indent, w = r.w - 12 - row.depth * indent;
      drawRowAt(row, x, w, y);
      y += rh;
    });
    if (marker && !placedMarker) this.drawMarker(r, y, rh, indent, marker.depth);
    // brackets first (under rows)
    rowsDrawn.forEach((d, i) => {
      const b = d.row.block;
      if (d.row.kind !== 'block' || !isContainer(b)) return;
      let j = i + 1;
      while (j < rowsDrawn.length && (rowsDrawn[j].row.depth > d.row.depth || (rowsDrawn[j].row.kind === 'else' && rowsDrawn[j].row.block === b))) j++;
      const last = rowsDrawn[j - 1];
      const active = this.ed.containerUid === b.uid;
      const bx = d.x + Math.min(6, indent / 2);
      this.rowGfx.lineStyle(active ? 4 : 2, active ? C.white : BLOCKS[b.op].color, active ? 0.9 : 0.6);
      this.rowGfx.lineBetween(bx, d.y + d.h, bx, last.y + last.h + 2);
      this.rowGfx.lineBetween(bx, last.y + last.h + 2, bx + indent * 0.7, last.y + last.h + 2);
    });
    rowsDrawn.forEach((d) => this.drawRow(d.row, d.x, d.y, d.w, d.h, fontPx));
    this.hl = scene.add.graphics();
    if (this.o.runningUid) this.highlight(this.o.runningUid);
    if (showToolbar) this.drawToolbar({ x: r.x + 4, y: r.y + r.h - tbH - 2, w: r.w - 8, h: tbH }, sel);
  }

  drawMarker(r, y, rh, indent, depth) {
    const g = this.rowGfx, ui = this.ui;
    const x = r.x + 6 + depth * indent, w = r.w - 12 - depth * indent;
    g.lineStyle(2, C.yellow, 0.8);
    g.strokeRoundedRect(x, y + 1, w, rh - 4, 6);
    this.scene.add.text(x + 8, y + (rh - 3) / 2, '▸ add here', { fontFamily: FONT, fontSize: Math.round(clamp(rh * 0.45, 9, 13 * ui)) + 'px', color: hex(C.yellow), fontStyle: 'normal' }).setOrigin(0, 0.5);
  }

  drawRow(row, x, y, w, h, fontPx) {
    const { scene } = this;
    const b = row.block;
    const isElse = row.kind === 'else';
    const color = isElse ? C.green : BLOCKS[b.op].color;
    const selected = this.ed.selectedUid === b.uid && (!isElse || this.ed.branch === 'else') && !this.o.readOnly;
    const g = this.rowGfx;
    g.fillStyle(color, this.o.locked && !this.o.readOnly ? 0.6 : 1);
    g.fillRoundedRect(x, y, w, h, 6);
    g.fillStyle(0xffffff, 0.15);
    g.fillRoundedRect(x + 2, y + 1, w - 4, h * 0.4, 5);
    if (selected) { g.lineStyle(3, C.white, 1); g.strokeRoundedRect(x, y, w, h, 6); }
    const label = isElse ? 'else' : rowLabel(b);
    const dark = color === C.yellow || color === C.grey || color === C.peach;
    scene.add.text(x + 8, y + h / 2, label, { fontFamily: FONT, fontSize: fontPx + 'px', color: hex(dark ? C.navy : C.white), fontStyle: 'bold' }).setOrigin(0, 0.5);
    if (!isElse) this.rowRects[b.uid] = { x, y, w, h };
    if (this.canEdit) {
      const z = scene.add.zone(x + w / 2, y + h / 2, w, h).setInteractive({ useHandCursor: true });
      z.on('pointerup', () => this.tapRow(row));
    }
  }

  drawToolbar(r, sel) {
    const { scene, ui } = this;
    const b = sel ? sel.block : null;
    const items = [];
    if (b) {
      items.push({ label: '✕', color: C.red, onClick: () => this.deleteSelected() });
      items.push({ label: '▲', color: C.dark, onClick: () => this.moveSelected(-1) });
      items.push({ label: '▼', color: C.dark, onClick: () => this.moveSelected(1) });
      if (b.op === 'repeat') {
        items.push({ label: '−', color: C.orange, textColor: C.navy, onClick: () => this.bumpCount(-1) });
        items.push({ label: '+', color: C.orange, textColor: C.navy, onClick: () => this.bumpCount(1) });
      } else if (b.op === 'if') {
        items.push({ label: b.cond, color: C.green, onClick: () => this.cycleCond() });
        items.push({ label: b.else ? 'else ✓' : 'else', color: b.else ? C.green : C.panel, onClick: () => this.toggleElse() });
      } else if (!isContainer(b)) {
        items.push({ label: '⟳', color: C.blue, onClick: () => this.cycleOp() });
      }
    }
    const inContainer = this.ed.containerUid !== 'main' && this.ed.containerUid !== 'F1';
    if (inContainer) items.push({ label: 'Done', color: C.lime, textColor: C.navy, onClick: () => this.done() });
    if (!items.length) return;
    const gap = 4, bw = Math.min(48 * ui, (r.w - gap * (items.length - 1)) / items.length), bh = r.h - 4;
    const total = bw * items.length + gap * (items.length - 1);
    const x0 = r.x + (r.w - total) / 2;
    items.forEach((it, i) => button(scene, x0 + i * (bw + gap) + bw / 2, r.y + r.h / 2, bw, bh, it.label, {
      color: it.color, textColor: it.textColor ?? C.white, fontSize: it.label.length > 3 ? 12 : 15, radius: 8, onClick: it.onClick
    }));
  }

  drawPalette(r) {
    const { scene, ui } = this;
    const ids = this.o.palette || [];
    panel(scene, r.x, r.y, r.w, r.h, { color: C.panel, alpha: 0.5, radius: 10 });
    const cols = ids.length > 4 ? 2 : 1;
    const rowsN = Math.ceil(ids.length / cols);
    const gap = 6;
    const bw = (r.w - 12 - gap * (cols - 1)) / cols;
    const bh = clamp((r.h - 12 - gap * (rowsN - 1)) / rowsN, 30 * ui, 50 * ui);
    const full = countBlocks(this.program) >= this.maxBlocks;
    ids.forEach((id, i) => {
      const def = BLOCKS[id];
      if (!def) return;
      const col = i % cols, row = Math.floor(i / cols);
      const dark = def.color === C.yellow;
      button(scene, r.x + 6 + col * (bw + gap) + bw / 2, r.y + 6 + row * (bh + gap) + bh / 2, bw, bh, def.label, {
        color: def.color, textColor: dark ? C.navy : C.white, fontSize: bw < 90 ? 12 : 14, radius: 8,
        disabled: !this.canEdit || full, onClick: () => this.addBlock(id)
      });
    });
  }

  /** Where the next block will be inserted in the flattened rows: { index, depth }. */
  insertionPoint(rows, view) {
    const cUid = this.ed.containerUid;
    if (rootOf(this.program, cUid) !== view) return null;
    const list = bodyOf(this.program, cUid, this.ed.branch);
    const selInList = this.ed.selectedUid && list.some((b) => b.uid === this.ed.selectedUid) ? this.ed.selectedUid : null;
    const afterUid = selInList || (list.length ? list[list.length - 1].uid : null);
    const depth = cUid === 'main' || cUid === 'F1' ? 0 : (findBlock(this.program, cUid) ? this.depthOf(rows, cUid) + 1 : 0);
    if (!afterUid) {
      if (cUid === 'main' || cUid === 'F1') return { index: 0, depth: 0 };
      // empty container body: right after the container row (or after its else row)
      const i = rows.findIndex((r) => r.block.uid === cUid && (this.ed.branch === 'else' ? r.kind === 'else' : r.kind === 'block'));
      return i < 0 ? null : { index: i + 1, depth };
    }
    const i = rows.findIndex((r) => r.kind === 'block' && r.block.uid === afterUid);
    if (i < 0) return null;
    const b = rows[i].block, d = rows[i].depth;
    let j = i + 1;
    while (j < rows.length && (rows[j].depth > d || (rows[j].kind === 'else' && rows[j].block === b))) j++;
    return { index: j, depth: d };
  }

  depthOf(rows, uid) { const r = rows.find((x) => x.kind === 'block' && x.block.uid === uid); return r ? r.depth : 0; }

  /** Outline the block being executed. Safe to call every step without a rebuild. */
  highlight(uid) {
    if (!this.hl || !this.hl.active) return;
    this.hl.clear();
    const rr = uid ? this.rowRects[uid] : null;
    if (!rr) return;
    this.hl.lineStyle(4, C.yellow, 1);
    this.hl.strokeRoundedRect(rr.x - 1, rr.y - 1, rr.w + 2, rr.h + 2, 7);
  }

  // ───────────── editing ─────────────
  tapRow(row) {
    if (!this.canEdit) return;
    Sfx.click();
    const b = row.block;
    if (row.kind === 'else') { this.ed.selectedUid = b.uid; this.ed.containerUid = b.uid; this.ed.branch = 'else'; }
    else if (isContainer(b)) { this.ed.selectedUid = b.uid; this.ed.containerUid = b.uid; this.ed.branch = 'then'; }
    else { this.ed.selectedUid = b.uid; this.ed.containerUid = row.parentUid; this.ed.branch = row.branch === 'else' ? 'else' : 'then'; }
    if (this.o.onChange) this.o.onChange();
  }

  addBlock(op) {
    if (!this.canEdit) return;
    if (countBlocks(this.program) >= this.maxBlocks) { toast(this.scene, `Only ${this.maxBlocks} blocks allowed!`, { bg: C.red }); return; }
    const block = makeBlock(op);
    const list = bodyOf(this.program, this.ed.containerUid, this.ed.branch);
    const after = this.ed.selectedUid && list.some((x) => x.uid === this.ed.selectedUid) ? this.ed.selectedUid : null;
    insertBlock(this.program, block, this.ed.containerUid, this.ed.branch, after);
    this.ed.selectedUid = block.uid;
    if (isContainer(block)) { this.ed.containerUid = block.uid; this.ed.branch = 'then'; }
    this.changed();
  }

  deleteSelected() {
    const f = findBlock(this.program, this.ed.selectedUid);
    if (!f) return;
    removeBlock(this.program, f.block.uid);
    this.ed.selectedUid = null;
    this.ed.containerUid = f.parentUid;
    this.ed.branch = f.branch === 'else' ? 'else' : 'then';
    this.changed();
  }

  moveSelected(delta) { if (moveBlock(this.program, this.ed.selectedUid, delta)) this.changed(); }

  bumpCount(delta) {
    const f = findBlock(this.program, this.ed.selectedUid);
    if (!f || f.block.op !== 'repeat') return;
    f.block.n = clamp((f.block.n || 2) + delta, 2, 9);
    this.changed();
  }

  cycleCond() {
    const f = findBlock(this.program, this.ed.selectedUid);
    if (!f || f.block.op !== 'if') return;
    f.block.cond = CONDS[(CONDS.indexOf(f.block.cond) + 1) % CONDS.length];
    this.changed();
  }

  toggleElse() {
    const f = findBlock(this.program, this.ed.selectedUid);
    if (!f || f.block.op !== 'if') return;
    if (f.block.else) { f.block.else = null; this.ed.branch = 'then'; }
    else { f.block.else = []; this.ed.branch = 'else'; this.ed.containerUid = f.block.uid; }
    this.changed();
  }

  cycleOp() {
    const f = findBlock(this.program, this.ed.selectedUid);
    if (!f || isContainer(f.block)) return;
    const prims = (this.o.palette || []).filter((id) => BLOCKS[id] && BLOCKS[id].kind === 'primitive');
    if (prims.length < 2) return;
    const next = prims[(prims.indexOf(f.block.op) + 1) % prims.length];
    setOp(this.program, f.block.uid, next);
    this.changed();
  }

  done() {
    const f = findBlock(this.program, this.ed.containerUid);
    this.ed.selectedUid = null;
    this.ed.containerUid = f ? f.parentUid : 'main';
    this.ed.branch = f && f.branch === 'else' ? 'else' : 'then';
    Sfx.click();
    if (this.o.onChange) this.o.onChange();
  }

  setView(v) {
    this.ed.view = v; this.ed.containerUid = v; this.ed.selectedUid = null; this.ed.branch = 'then';
    Sfx.click();
    if (this.o.onChange) this.o.onChange();
  }
}
