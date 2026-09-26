import { MinigameScene } from '../MinigameScene.js';
import { THEME } from '../../../ui/theme.js';
import { generateRounds } from '../../../generators/english/words.js';
import { grid } from '../../../systems/Layout.js';
import { Sfx } from '../../../systems/Audio.js';
import { T, text } from '../../../ui/TextStyles.js';
import { button, speakButton } from '../../../ui/Button.js';
import { card, tile } from '../../../ui/Card.js';
import { enter, shake } from '../../../ui/motion.js';

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
  progressRatio() { return this.state.idx / this.state.rounds.length; }
  enterKey() { return this.state.idx; }

  buildGame(area) {
    const s = this.state, ui = this.ui, r = this.round;
    if (!r) return;
    const hintH = 76 * ui;
    const hint = card(this, area.x + area.w / 2, area.y + hintH / 2, area.w, hintH);
    text(this, area.x + area.w / 2 - 16 * ui, area.y + hintH / 2, `Hint: ${r.hint}`, { ...T.body(this), wordWrap: { width: area.w - 80 * ui } });
    speakButton(this, area.x + area.w - 30 * ui, area.y + hintH / 2, 40 * ui, () => `Hint: ${r.hint}`);
    enter(this, hint, { from: 'up', distance: 12 });

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
    const slotColor = s.result === 'right' ? THEME.success : s.result === 'wrong' ? THEME.danger : this.subject.accent;
    s.slots.forEach((ti, i) => {
      if (i >= n) return;
      const letter = ti === null ? '' : r.scrambled[ti].toUpperCase();
      const t = tile(this, slotCells[i].x, slotCells[i].y, size, letter, {
        empty: ti === null, color: slotColor, textColor: THEME.onAccent, onTap: ti !== null && !s.locked ? () => this.tapSlot(i) : null
      });
      this.slotBox.add(t);
    });
    text(this, area.x + area.w / 2, slotsY + blockH + 14 * ui, `Tries left: ${MAX_TRIES - s.attempts}`, T.small(this, s.attempts ? THEME.warningDark : THEME.ink2));

    // Letter tiles
    const tilesY = slotsY + blockH + 30 * ui;
    const tileCells = grid(rowRect(tilesY), cols, rows, gap);
    const letters = r.scrambled.map((letter, ti) => {
      const used = s.slots.includes(ti);
      const t = tile(this, tileCells[ti].x, tileCells[ti].y, size, letter.toUpperCase(), { onTap: used || s.locked ? null : () => this.tapTile(ti) });
      if (used) t.setAlpha(0.25);
      return t;
    });
    enter(this, letters, { from: 'pop', delay: 80, stagger: 30 });

    // Controls
    const by = Math.max(tilesY + blockH + 40 * ui, area.y + area.h - 36 * ui);
    const bw = Math.min(170 * ui, area.w / 2 - 8);
    button(this, area.x + area.w / 2 - bw / 2 - 6, by, bw, 52 * ui, s.hinted ? 'Hint used' : 'Hint', { variant: 'secondary', fontSize: 18, onClick: () => this.hint(), disabled: s.hinted || s.locked });
    button(this, area.x + area.w / 2 + bw / 2 + 6, by, bw, 52 * ui, 'Clear', { variant: 'ghost', fontSize: 18, onClick: () => this.clear(), disabled: s.locked });
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
    shake(this, this.slotBox);
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
