import { MinigameScene } from '../MinigameScene.js';
import { THEME, hex } from '../../../ui/theme.js';
import { generateRounds, ROUNDS, PAIRS_PER_ROUND } from '../../../generators/english/match.js';
import { PAIRS as BIBLE_PAIRS } from '../../../data/bible/bank.js';
import { bandFor } from '../../../data/grades.js';
import { grid } from '../../../systems/Layout.js';
import { Sfx } from '../../../systems/Audio.js';
import { T, text } from '../../../ui/TextStyles.js';
import { card } from '../../../ui/Card.js';
import { enter } from '../../../ui/motion.js';
import { weakSkills } from '../../../systems/Practice.js';
import { trail } from '../../../ui/Scenery.js';
import { RUNE, drawGlade, plaque, runeSlab, tabletTrail } from './RuneScenery.js';

const PAR_MS = 120000;
const TITLES = { synonym: 'Match the words that mean the same', antonym: 'Match the opposites', definition: 'Match each word to its meaning', people: 'Match each person to what they did' };

/**
 * Word Match: two columns of 5 cards; pair them up. 3 rounds. A pair counts if it took at most one mistake. Also runs
 * "Who Am I?" from the Bible bank. The English game wears Word Builder's "ancient runes" look (glowing word slabs in
 * a moonlit glade, a rune tablet lit per pair); the Bible game keeps its parade of creatures.
 */
export class WordMatch extends MinigameScene {
  constructor() { super('MG_WordMatch'); }

  initState() {
    const bank = this.payload.gameId === 'bible-match' ? BIBLE_PAIRS[bandFor(this.payload.grade)] : undefined;
    // Rounds with shorter words (less to read) come first.
    const load = (r) => r.pairs.reduce((sum, p) => sum + String(p.l).length + String(p.r).length, 0);
    const rounds = generateRounds(this.payload.grade, this.rng, bank, weakSkills(this.profile)).sort((a, b) => load(a) - load(b));
    return { rounds, rIdx: 0, done: [], mistakes: {}, left: null, right: null,
      first: null, flash: null, busy: false };
  }

  get round() { return this.state.rounds[this.state.rIdx]; }
  progressLabel() { return `Round ${Math.min(this.state.rIdx + 1, ROUNDS)} / ${ROUNDS}`; }
  progressRatio() { return this.state.rIdx / ROUNDS; }
  enterKey() { return this.state.rIdx; }
  key(pairIdx) { return `${this.state.rIdx}-${pairIdx}`; }

  get runes() { return this.payload.gameId !== 'bible-match'; }

  buildGame(area) {
    const s = this.state, ui = this.ui, r = this.round;
    if (!r) return;
    if (this.runes) return this.buildRunes(area);
    // The trail above: every matched pair adds a creature to the parade.
    const stripH = Math.min(72 * ui, area.h * 0.14);
    const { stamps } = trail(this, { x: area.x, y: area.y, w: area.w, h: stripH }, { count: s.done.length, theme: this.payload.subject === 'bible' ? 'bible' : 'safari', ui });
    if (s.pop && stamps.length) { const t = stamps[stamps.length - 1]; t.setScale(0); this.tweens.add({ targets: t, scale: 1, duration: 360, ease: 'Back.Out' }); s.pop = false; }
    area = { x: area.x, y: area.y + stripH + 8, w: area.w, h: area.h - stripH - 8 };
    const headH = 44 * ui;
    text(this, area.x + area.w / 2, area.y + headH / 2, TITLES[r.pairs[0].k] || 'Match the pairs', { ...T.bodyBold(this, THEME.ink2), wordWrap: { width: area.w - 16 } });
    const gap = 10 * ui;
    const colW = Math.min((area.w - gap) / 2, 340 * ui);
    const x0 = area.x + (area.w - (colW * 2 + gap)) / 2;
    const availH = area.y + area.h - (area.y + headH);
    const cardH = Math.max(48 * ui, Math.min(76 * ui, (availH - gap * (PAIRS_PER_ROUND - 1)) / PAIRS_PER_ROUND));
    const rect = { x: x0, y: area.y + headH, w: colW * 2 + gap, h: cardH * PAIRS_PER_ROUND + gap * (PAIRS_PER_ROUND - 1) };
    const cells = grid(rect, 2, PAIRS_PER_ROUND, gap);
    const made = [];
    // Ropes join the pairs already matched, from the left card to wherever its partner sits on the right.
    const rope = this.add.graphics();
    for (let row = 0; row < PAIRS_PER_ROUND; row++) {
      const lp = row, rp = r.right[row];
      made.push(this.makeCard(cells[row * 2], r.pairs[lp].l, this.cardStyle('L', lp), () => this.tap('L', lp)));
      made.push(this.makeCard(cells[row * 2 + 1], r.pairs[rp].r, this.cardStyle('R', rp), () => this.tap('R', rp)));
      if (s.done.includes(this.key(lp))) {
        const partnerRow = r.right.indexOf(lp);
        const a = cells[row * 2], b = cells[partnerRow * 2 + 1];
        rope.lineStyle(4 * ui, THEME.gold, 1); rope.lineBetween(a.x + colW / 2 - 6, a.y, b.x - colW / 2 + 6, b.y);
        rope.fillStyle(THEME.warningDark, 1); rope.fillCircle(a.x + colW / 2 - 6, a.y, 4 * ui); rope.fillCircle(b.x - colW / 2 + 6, b.y, 4 * ui);
      }
    }
    enter(this, made, { from: 'up', stagger: 30 });
  }

  /** The rune look: tablets for matched pairs, the task on a stone plaque, two columns of glowing word slabs. */
  buildRunes(area) {
    const s = this.state, ui = this.ui, r = this.round;
    drawGlade(this, area, ui);
    const cx = area.x + area.w / 2;
    const f = ui * Math.min(1, Math.max(0.72, area.h / (620 * ui)));
    let y = area.y + 10 * f;
    const total = ROUNDS * PAIRS_PER_ROUND;
    const { tablets } = tabletTrail(this, { x: area.x + 16 * ui, y, w: area.w - 32 * ui, h: 30 * f }, s.done.length, total, s.done.length, f);
    if (s.pop && tablets[s.done.length - 1] && this.tweens) {
      const t = tablets[s.done.length - 1], spark = this.add.circle(t.x, t.y, 8 * f, RUNE.glow, 0.8);
      this.tweens.add({ targets: spark, scale: 3, alpha: 0, duration: 600, onComplete: () => spark.destroy() });
      s.pop = false;
    }
    y += 30 * f + 12 * f;
    const title = plaque(this, cx, y + 20 * f, TITLES[r.pairs[0].k] || 'Match the pairs', f, area.w < 420 * ui ? 14 : 16);
    y += Math.max(50 * f, title.h + 14 * f);

    const gap = 12 * f, colGap = Math.max(22 * f, 28 * ui);   // room between the columns for the glowing links
    const colW = Math.min((area.w - 20 * ui - colGap) / 2, 360 * ui);
    const x0 = cx - (colW * 2 + colGap) / 2;
    const slabH = Math.max(52 * f, Math.min(84 * f, (area.y + area.h - y - 8 * f - gap * (PAIRS_PER_ROUND - 1)) / PAIRS_PER_ROUND));
    const rowY = (row) => y + row * (slabH + gap) + slabH / 2;
    const leftX = x0 + colW / 2, rightX = x0 + colW + colGap + colW / 2;
    // Glowing links join the pairs already matched, from the left slab to wherever its partner sits on the right.
    const links = this.add.graphics();
    const made = [];
    for (let row = 0; row < PAIRS_PER_ROUND; row++) {
      const lp = row, rp = r.right[row];
      made.push(this.makeSlab(leftX, rowY(row), colW, slabH, r.pairs[lp].l, this.cardStyle('L', lp), () => this.tap('L', lp), row, f));
      made.push(this.makeSlab(rightX, rowY(row), colW, slabH, r.pairs[rp].r, this.cardStyle('R', rp), () => this.tap('R', rp), row + 5, f));
      if (s.done.includes(this.key(lp))) {
        const a = { x: leftX + colW / 2 - 4, y: rowY(row) }, b = { x: rightX - colW / 2 + 4, y: rowY(r.right.indexOf(lp)) };
        links.lineStyle(9 * f, RUNE.right, 0.25); links.lineBetween(a.x, a.y, b.x, b.y);
        links.lineStyle(3.5 * f, RUNE.right, 1); links.lineBetween(a.x, a.y, b.x, b.y);
        links.fillStyle(RUNE.right, 1); links.fillCircle(a.x, a.y, 5 * f); links.fillCircle(b.x, b.y, 5 * f);
      }
    }
    if (this.children && typeof this.children.bringToTop === 'function') this.children.bringToTop(links);
    enter(this, made, { from: 'pop', stagger: 30 });
  }

  /** One glowing word slab for the rune look, coloured by its state (see cardStyle). */
  makeSlab(x, y, w, h, label, style, onTap, seed, f) {
    const glow = style.state === 'done' ? RUNE.right : style.state === 'wrong' ? RUNE.wrong : style.state === 'picked' ? RUNE.reveal : RUNE.glow;
    const slab = runeSlab(this, x, y, w, h, label, { glow, halo: style.state === 'picked' || style.state === 'wrong', dim: style.state === 'done', seed, ui: f, fontSize: label.length > 14 ? 18 : label.length > 9 ? 21 : 24, onTap: style.active ? onTap : null });
    this.answerSpeaker(slab, w, h, label);
    return slab;
  }

  /** Colour + interactivity for a card, derived purely from state. */
  cardStyle(side, pairIdx) {
    const s = this.state;
    if (s.done.includes(this.key(pairIdx))) return { state: 'done', color: THEME.successSoft, stroke: THEME.success, textColor: THEME.successDark, active: false };
    if (s.flash && s.flash[side] === pairIdx) return { state: 'wrong', color: THEME.dangerSoft, stroke: THEME.danger, textColor: THEME.dangerDark, active: false };
    const sel = side === 'L' ? s.left : s.right;
    if (sel === pairIdx) return { state: 'picked', color: THEME.warningSoft, stroke: THEME.gold, textColor: THEME.ink, active: !s.busy };
    return { state: 'idle', color: THEME.surface, stroke: THEME.line, textColor: THEME.ink, active: !s.busy };
  }

  makeCard(cell, label, style, onTap) {
    const ui = this.ui;
    const c = card(this, cell.x, cell.y, cell.w, cell.h, { color: style.color, stroke: style.stroke, strokeWidth: 2, shadow: 'sm', onTap: style.active ? onTap : null });
    const fontSize = Math.round((label.length > 14 ? 15 : label.length > 9 ? 18 : 22) * ui) + 'px';
    c.add(this.add.text(0, 0, label, { ...T.bodyBold(this), fontSize, color: hex(style.textColor), wordWrap: { width: cell.w - 16 } }).setOrigin(0.5));
    this.answerSpeaker(c, cell.w, cell.h, label);
    return c;
  }

  tap(side, pairIdx) {
    const s = this.state;
    if (s.busy || s.done.includes(this.key(pairIdx))) return;
    const prop = side === 'L' ? 'left' : 'right';
    if (s[prop] === pairIdx) { s[prop] = null; s.first = null; this.rebuild(); return; }
    s[prop] = pairIdx;
    if (s.left === null || s.right === null) { s.first = side; this.rebuild(); return; }
    if (s.left === s.right) {
      s.done.push(this.key(pairIdx)); s.left = s.right = null; s.first = null; s.pop = true;
      Sfx.correct(); this.rebuild();
      const roundDone = this.round.pairs.every((_, i) => s.done.includes(this.key(i)));
      if (roundDone) { s.busy = true; this.time.delayedCall(700, () => this.nextRound()); }
      return;
    }
    // Wrong: the mistake goes to the pair the player was trying to match (the first card tapped).
    const k = this.key(s.first === 'R' ? s.right : s.left);
    s.mistakes[k] = (s.mistakes[k] || 0) + 1;
    s.flash = { L: s.left, R: s.right }; s.busy = true;
    this.wrongFeedback(); this.rebuild();
    this.time.delayedCall(500, () => { s.flash = null; s.left = s.right = null; s.first = null; s.busy = false; this.rebuild(); });
  }

  nextRound() {
    const s = this.state;
    s.rIdx += 1; s.busy = false; s.left = s.right = null; s.first = null; s.flash = null;
    if (s.rIdx >= s.rounds.length) {
      let correct = 0;
      const missedBySkill = {};
      s.rounds.forEach((r, ri) => r.pairs.forEach((p, pi) => {
        const m = s.mistakes[`${ri}-${pi}`] || 0;
        if (m <= 1) correct += 1; else missedBySkill[p.k] = (missedBySkill[p.k] || 0) + 1;
      }));
      const missedSkills = Object.entries(missedBySkill).sort((a, b) => b[1] - a[1]).map(([k]) => k);
      return this.finish({ correct, total: ROUNDS * PAIRS_PER_ROUND, parTimeMs: PAR_MS, missedSkills });
    }
    Sfx.fanfare();
    this.rebuild();
  }
}
