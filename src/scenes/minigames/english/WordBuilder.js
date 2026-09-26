import { MinigameScene } from '../MinigameScene.js';
import { C, hex } from '../../../constants.js';
import { generateRounds } from '../../../generators/english/words.js';
import { grid } from '../../../systems/Layout.js';
import { Sfx } from '../../../systems/Audio.js';
import { T, text } from '../../../ui/TextStyles.js';
import { button } from '../../../ui/Button.js';
import { panel } from '../../../ui/Panel.js';

const PAR_MS = 120000;
const MAX_TRIES = 3;

/** Word Builder: unscramble letter tiles into slots. 8 words, 3 tries each, one first-letter hint per word. */
export class WordBuilder extends MinigameScene {
  constructor() { super('MG_WordBuilder'); }

  initState() {
    const rounds = generateRounds(this.payload.grade, this.rng, 8);
    return { rounds, idx: 0, correct: 0, slots: new Array(rounds[0].word.length).fill(null),
      attempts: 0, hinted: false, result: null, locked: false, missed: 0 };
  }

  get round() { return this.state.rounds[this.state.idx]; }
  progressLabel() { return `${Math.min(this.state.idx + 1, this.state.rounds.length)} / ${this.state.rounds.length}`; }

  buildGame(area) {
    const s = this.state, ui = this.ui, r = this.round;
    if (!r) return;
    const hintH = 76 * ui;
    panel(this, area.x, area.y, area.w, hintH, { color: C.panelDark, stroke: C.lime });
    text(this, area.x + area.w / 2, area.y + hintH / 2, `Hint: ${r.hint}`, { ...T.body(this), wordWrap: { width: area.w - 24 } });

    const n = r.word.length, gap = 6 * ui;
    let cols = n, size = Math.min(64 * ui, (area.w - gap * (n - 1)) / n);
    if (size < 44 * ui && n > 6) { cols = Math.ceil(n / 2); size = Math.min(64 * ui, (area.w - gap * (cols - 1)) / cols); }
    const rows = Math.ceil(n / cols);
    size = Math.max(40 * ui, Math.min(size, (area.h - hintH - 130 * ui) / (2 * rows + 0.5))); // fit slots + tiles + buttons
    const blockH = rows * size + (rows - 1) * gap;
    const rowRect = (y) => ({ x: area.x + (area.w - (cols * size + (cols - 1) * gap)) / 2, y, w: cols * size + (cols - 1) * gap, h: blockH });

    // Slots (inside a container so a wrong answer can shake the whole row)
    const slotsY = area.y + hintH + 18 * ui;
    this.slotBox = this.add.container(0, 0);
    const slotCells = grid(rowRect(slotsY), cols, rows, gap);
    const slotColor = s.result === 'right' ? C.lime : s.result === 'wrong' ? C.red : C.panel;
    s.slots.forEach((ti, i) => {
      if (i >= n) return;
      const letter = ti === null ? '' : r.scrambled[ti];
      const tile = this.makeTile(slotCells[i].x, slotCells[i].y, size, letter, ti === null ? C.panelDark : slotColor, ti !== null && !s.locked ? () => this.tapSlot(i) : null, C.white);
      this.slotBox.add(tile);
    });
    text(this, area.x + area.w / 2, slotsY + blockH + 14 * ui, `Tries left: ${MAX_TRIES - s.attempts}`, T.small(this, s.attempts ? C.orange : C.grey));

    // Letter tiles
    const tilesY = slotsY + blockH + 30 * ui;
    const tileCells = grid(rowRect(tilesY), cols, rows, gap);
    r.scrambled.forEach((letter, ti) => {
      const used = s.slots.includes(ti);
      const t = this.makeTile(tileCells[ti].x, tileCells[ti].y, size, letter, C.yellow, used || s.locked ? null : () => this.tapTile(ti), C.navy);
      if (used) t.setAlpha(0.22);
    });

    // Controls
    const by = Math.max(tilesY + blockH + 40 * ui, area.y + area.h - 36 * ui);
    const bw = Math.min(170 * ui, area.w / 2 - 8);
    button(this, area.x + area.w / 2 - bw / 2 - 6, by, bw, 52 * ui, s.hinted ? 'Hint used' : 'Hint', { color: C.purple, fontSize: 18, onClick: () => this.hint(), disabled: s.hinted || s.locked });
    button(this, area.x + area.w / 2 + bw / 2 + 6, by, bw, 52 * ui, 'Clear', { color: C.dark, fontSize: 18, onClick: () => this.clear(), disabled: s.locked });
  }

  makeTile(x, y, size, letter, color, onTap, textColor) {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.3); g.fillRoundedRect(-size / 2, -size / 2 + 4, size, size, 10);
    g.fillStyle(color, 1); g.fillRoundedRect(-size / 2, -size / 2, size, size, 10);
    if (!letter) { g.lineStyle(2, C.grey, 0.5); g.strokeRoundedRect(-size / 2, -size / 2, size, size, 10); }
    c.add(g);
    if (letter) c.add(this.add.text(0, 0, letter.toUpperCase(), { ...T.heading(this), fontSize: Math.round(size * 0.5) + 'px', color: hex(textColor) }).setOrigin(0.5));
    c.setSize(size, size);
    if (onTap) { c.setInteractive({ useHandCursor: true }); c.on('pointerup', onTap); }
    return c;
  }

  tapTile(ti) {
    const s = this.state;
    if (s.locked || s.slots.includes(ti)) return;
    const free = s.slots.indexOf(null);
    if (free < 0) return;
    s.slots[free] = ti;
    Sfx.pop();
    this.rebuild();
    if (!s.slots.includes(null)) this.checkWord();
  }

  tapSlot(i) {
    const s = this.state;
    if (s.locked || s.slots[i] === null) return;
    s.slots[i] = null;
    Sfx.click();
    this.rebuild();
  }

  clear() { const s = this.state; if (s.locked) return; s.slots.fill(null); this.rebuild(); }

  hint() {
    const s = this.state, r = this.round;
    if (s.hinted || s.locked) return;
    s.hinted = true;
    const first = r.word[0];
    if (s.slots[0] === null || r.scrambled[s.slots[0]] !== first) {
      const free = r.scrambled.findIndex((l, i) => l === first && !s.slots.includes(i));
      const ti = free >= 0 ? free : r.scrambled.indexOf(first);
      s.slots = s.slots.map((v) => (v === ti ? null : v)); // pull that tile back if it sits in another slot
      s.slots[0] = ti;
    }
    Sfx.coin();
    this.rebuild();
    if (!s.slots.includes(null)) this.checkWord();
  }

  checkWord() {
    const s = this.state, r = this.round;
    const typed = s.slots.map((ti) => r.scrambled[ti]).join('');
    s.locked = true;
    if (typed === r.word) {
      s.correct += 1; s.result = 'right'; this.correctFeedback(); this.rebuild();
      this.time.delayedCall(600, () => this.next());
      return;
    }
    s.attempts += 1; s.result = 'wrong'; this.wrongFeedback();
    if (s.attempts >= MAX_TRIES) {
      // Reveal: place the tiles in the correct order and count the word as missed.
      s.missed += 1;
      const used = new Set();
      s.slots = r.word.split('').map((ch) => { const ti = r.scrambled.findIndex((l, i) => l === ch && !used.has(i)); used.add(ti); return ti; });
      s.result = 'reveal';
      this.rebuild();
      this.time.delayedCall(1400, () => this.next());
      return;
    }
    this.rebuild();
    if (this.slotBox) this.tweens.add({ targets: this.slotBox, x: 8, duration: 45, yoyo: true, repeat: 5 });
    this.time.delayedCall(800, () => { s.slots.fill(null); s.result = null; s.locked = false; this.rebuild(); });
  }

  next() {
    const s = this.state;
    s.idx += 1;
    if (s.idx >= s.rounds.length) {
      return this.finish({ correct: s.correct, total: s.rounds.length, parTimeMs: PAR_MS, missedSkills: s.missed ? ['spelling'] : [] });
    }
    s.slots = new Array(this.round.word.length).fill(null);
    s.attempts = 0; s.hinted = false; s.result = null; s.locked = false;
    this.rebuild();
  }
}
