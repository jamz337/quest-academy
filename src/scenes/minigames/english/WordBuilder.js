import { MinigameScene } from '../MinigameScene.js';
import { hex } from '../../../ui/theme.js';
import { generateRounds, roundDifficulty } from '../../../generators/english/words.js';
import { grid } from '../../../systems/Layout.js';
import { Sfx } from '../../../systems/Audio.js';
import { button, speakButton } from '../../../ui/Button.js';
import { readable } from '../../../ui/ReadableText.js';
import { enter, shake } from '../../../ui/motion.js';
import { RUNE, SERIF, drawGlade, scroll, plaque, altar, runeStone, triesPlaque, tabletTrail, owl } from './RuneScenery.js';

const PAR_MS = 120000;
const MAX_TRIES = 3;

/**
 * Word Builder, "ancient runes" style: tap the rune stones into the altar's sockets to spell the word on the scroll.
 * 8 words, 3 tries each, one first-letter help per word. Each word spelled lights a tablet along the top.
 */
export class WordBuilder extends MinigameScene {
  constructor() { super('MG_WordBuilder'); }

  initState() {
    const rounds = this.rampedRounds((k) => generateRounds(this.payload.grade, this.rng, k), 8, roundDifficulty);
    return { rounds, idx: 0, correct: 0, slots: new Array(rounds[0].word.length).fill(null),
      attempts: 0, hinted: false, result: null, locked: false, missed: 0, solved: [] };
  }

  get round() { return this.state.rounds[this.state.idx]; }
  progressLabel() { return `${Math.min(this.state.idx + 1, this.state.rounds.length)} / ${this.state.rounds.length}`; }
  progressRatio() { return this.state.idx / this.state.rounds.length; }
  enterKey() { return this.state.idx; }

  buildGame(area) {
    const s = this.state, ui = this.ui, r = this.round;
    if (!r) return;
    drawGlade(this, area, ui);
    const wide = area.w / ui >= 600;
    const cx = area.x + area.w / 2;
    const n = r.word.length, gap = 8 * ui;

    // Fit everything: the quest plaque goes first when space is short, then everything shrinks a little.
    let L = null;
    for (const [k, withPlaque] of [[1, true], [1, false], [0.88, false], [0.76, false], [0.66, false]]) {
      const f = ui * k;
      let cols = n, size = Math.min(72 * ui, (area.w - 40 * ui - gap * (n - 1)) / n);
      if (size < 46 * ui && n > 6) { cols = Math.ceil(n / 2); size = Math.min(72 * ui, (area.w - 40 * ui - gap * (cols - 1)) / cols); }
      const rows = Math.ceil(n / cols);
      const fixed = f * (10 + 34 + 12 + (withPlaque ? 50 : 0) + 84 + 30 + 34 + 36 + 16 + 20 + 56 + 12) + (rows - 1) * gap * 2;
      L = { k, f, cols, rows, size: Math.min(size, (area.h - fixed) / (2 * rows)), withPlaque };
      if (L.size >= 46 * ui) break;
    }
    const { k, f, cols, rows, withPlaque } = L;
    const size = Math.max(38 * ui, L.size);
    const blockW = cols * size + (cols - 1) * gap, blockH = rows * size + (rows - 1) * gap;
    const rowRect = (y) => ({ x: cx - blockW / 2, y, w: blockW, h: blockH });

    // Found words: a tablet per word across the top, lit as each word is spelled.
    let y = area.y + 10 * f;
    const { tablets } = tabletTrail(this, { x: area.x + 16 * ui, y, w: area.w - 32 * ui, h: 34 * f }, s.solved.length, s.rounds.length, s.idx, f);
    const lit = tablets[s.solved.length - 1];
    if (s.result === 'right' && lit && this.tweens) {
      const spark = this.add.circle(lit.x, lit.y, 8 * f, RUNE.glow, 0.8);
      this.tweens.add({ targets: spark, scale: 3, alpha: 0, duration: 600, onComplete: () => spark.destroy() });
    }
    y += 34 * f + 12 * f;
    if (withPlaque) { plaque(this, cx, y + 20 * f, 'Spell the word with the rune stones!', f, 16); y += 50 * f; }

    // The hint on a parchment scroll, with the owl librarian keeping watch on wide screens.
    const scrollW = wide ? Math.min(area.w * 0.72, 660 * ui) : area.w - 24 * ui, scrollH = 84 * f;
    const scrollCy = y + scrollH / 2;
    const paper = scroll(this, cx, scrollCy, scrollW, scrollH, f);
    let hintText = null;
    for (const px of [21, 18, 16]) {
      if (hintText) hintText.destroy();
      const style = { fontFamily: SERIF, fontSize: Math.round(px * f) + 'px', color: hex(RUNE.ink), fontStyle: 'bold', align: 'center' };
      hintText = readable(this, cx - 18 * f, scrollCy, `Hint: ${r.hint}`, style, { width: scrollW - 130 * f, highlight: RUNE.reveal });
      if (hintText.height <= scrollH - 22 * f) break;
    }
    speakButton(this, cx + scrollW / 2 - 52 * f, scrollCy, 40 * f, hintText, { rate: this.speechRate });
    this.autoRead(hintText);
    if (wide) owl(this, cx + scrollW / 2 - 30 * f, scrollCy - scrollH / 2 - 2 * f, 0.8 * f);
    enter(this, paper, { from: 'up', distance: 12 });
    y += scrollH + 30 * f;

    // Carved sockets on the altar; placed stones sit in them (in a container so a wrong word shakes the row).
    const slotCells = grid(rowRect(y), cols, rows, gap).slice(0, n);   // grid() gives cell centres
    altar(this, slotCells.map((c) => ({ x: c.x - c.w / 2, y: c.y - c.h / 2, w: c.w, h: c.h })), f);
    this.slotBox = this.add.container(0, 0);
    const glow = { right: RUNE.right, wrong: RUNE.wrong, reveal: RUNE.reveal }[s.result] ?? RUNE.glow;
    s.slots.forEach((ti, i) => {
      if (ti === null || !slotCells[i]) return;
      const c = slotCells[i];
      this.slotBox.add(runeStone(this, c.x, c.y, size * 0.94, r.scrambled[ti].toUpperCase(), {
        glow, halo: !!s.result, moss: false, seed: ti, onTap: s.locked ? null : () => this.tapSlot(i)
      }));
    });
    y += blockH + 34 * f;
    triesPlaque(this, cx, y + 18 * f, MAX_TRIES - s.attempts, MAX_TRIES, f);
    y += 36 * f + 16 * f;

    // The rune stones to choose from.
    const tileCells = grid(rowRect(y), cols, rows, gap);
    const letters = r.scrambled.map((letter, ti) => {
      const used = s.slots.includes(ti), c = tileCells[ti];
      const stone = runeStone(this, c.x, c.y, size, letter.toUpperCase(), { seed: ti, onTap: used || s.locked ? null : () => this.tapTile(ti) });
      if (used) stone.setAlpha(0.22);
      return stone;
    });
    enter(this, letters, { from: 'pop', delay: 80, stagger: 30 });

    // Get help (places the first letter) and Start over.
    const by = Math.max(y + blockH + 48 * f, area.y + area.h - 40 * f);
    const bw = Math.min(200 * f, (area.w - 48 * ui) / 2);
    button(this, cx - bw / 2 - 8, by, bw, 56 * f, s.hinted ? 'Help used' : 'Get help!', { color: 0x2f5d62, textColor: 0xe8fff9, emoji: '🔍', fontSize: 19 * k, onClick: () => this.hint(), disabled: s.hinted || s.locked });
    button(this, cx + bw / 2 + 8, by, bw, 56 * f, 'Start over!', { color: 0x5b3f7a, textColor: 0xf6ecff, emoji: '🔄', fontSize: 19 * k, onClick: () => this.clear(), disabled: s.locked });
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
      s.correct += 1; s.result = 'right'; s.solved.push(r.word); this.correctFeedback(); this.rebuild();
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
