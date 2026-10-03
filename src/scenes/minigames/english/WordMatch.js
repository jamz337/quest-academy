import { MinigameScene } from '../MinigameScene.js';
import { THEME, hex } from '../../../ui/theme.js';
import { generateRounds, ROUNDS, PAIRS_PER_ROUND } from '../../../generators/english/match.js';
import { PAIRS as BIBLE_PAIRS } from '../../../data/bible/bank.js';
import { bandFor, bankFor } from '../../../data/grades.js';
import { Sfx } from '../../../systems/Audio.js';
import { FONT, WEIGHT } from '../../../ui/TextStyles.js';
import { enter } from '../../../ui/motion.js';
import { weakSkills } from '../../../systems/Practice.js';
import { LANTERN, drawFestival, lightString, paperLantern, ribbon, lanternSky } from './LanternScenery.js';
import { earlyMatchRounds } from '../../../generators/english/early.js';
import { gradeOf } from '../../../data/grades.js';
import { VILLAGE, drawBackdrop, drawVillage, glassPanel, statsBar, matchCard, lightning, villageLessonTheme } from '../bible/VillageScenery.js';

const PAR_MS = 120000;
const TITLES = {
  synonym: 'Match the words that mean the same', antonym: 'Match the opposites', definition: 'Match each word to its meaning', people: 'Match each person to what they did',
  'letter-case': 'Match each big letter to its small letter', 'first-sounds': 'Match each picture to its first letter', rhyming: 'Match the words that rhyme'
};

/**
 * Word Match: two columns of 5 cards; pair them up. 3 rounds. A pair counts if it took at most one mistake. Also runs
 * "Who Am I?" from the Bible bank. The English game is a lantern festival, a cousin of Word Builder's glade and Grammar
 * Gate's castle: the words are paper lanterns on strings of lights over a lake, a golden thread ties each matched pair,
 * and a sky lantern floats up for every pair. "Who Am I?" wears Bible Quiz's village look (see buildVillage).
 */
export class WordMatch extends MinigameScene {
  constructor() { super('MG_WordMatch'); }

  initState() {
    const bank = this.payload.gameId === 'bible-match' ? bankFor(BIBLE_PAIRS, bandFor(this.payload.grade)) : undefined;
    // Rounds with shorter words (less to read) come first.
    const load = (r) => r.pairs.reduce((sum, p) => sum + String(p.l).length + String(p.r).length, 0);
    // Pre-K to Grade 1 match letters, first sounds and rhymes (one kind per round) in the English game.
    const early = this.payload.gameId !== 'bible-match' && gradeOf(this.payload.grade) <= 1;
    const rounds = early ? earlyMatchRounds(gradeOf(this.payload.grade), this.rng) : generateRounds(this.payload.grade, this.rng, bank, weakSkills(this.profile)).sort((a, b) => load(a) - load(b));
    return { rounds, rIdx: 0, done: [], mistakes: {}, left: null, right: null,
      first: null, flash: null, busy: false };
  }

  get round() { return this.state.rounds[this.state.rIdx]; }
  progressLabel() { return `Round ${Math.min(this.state.rIdx + 1, ROUNDS)} / ${ROUNDS}`; }
  progressRatio() { return this.state.rIdx / ROUNDS; }
  enterKey() { return this.state.rIdx; }
  key(pairIdx) { return `${this.state.rIdx}-${pairIdx}`; }

  get festival() { return this.payload.gameId !== 'bible-match'; }
  get lessonTheme() { return this.festival ? null : villageLessonTheme; }

  buildGame(area) {
    const s = this.state, ui = this.ui, r = this.round;
    if (!r) return;
    if (this.festival) return this.buildFestival(area);
    return this.buildVillage(area);
  }

  /**
   * "Who Am I?" in the Bible Village look: the night street behind, people on purple cards and what they did on blue
   * ones, a crackle of light joining each matched pair, and a window lit in the village for every pair.
   */
  buildVillage(area) {
    const s = this.state, ui = this.ui, r = this.round;
    const cx = area.x + area.w / 2;
    const f = ui * Math.min(1, Math.max(0.72, area.h / (640 * ui)));
    const wide = area.w / ui >= 600;
    drawBackdrop(this, area);
    const bannerH = Math.min(area.h * 0.42, 300 * f);
    const { windows } = drawVillage(this, { x: area.x, y: area.y, w: area.w, h: bannerH }, f, s.done.length - (s.pop ? 1 : 0));
    const fade = this.add.graphics();   // the street melts into the dark floor under the cards
    for (let i = 0; i < 10; i++) { fade.fillStyle(VILLAGE.bg, 0.1 * (i + 1)); fade.fillRect(area.x, area.y + bannerH - 50 * f + i * 5 * f, area.w, 5 * f); }
    const lit = windows[s.done.length - 1];
    if (s.pop && lit && this.tweens) {
      const win = this.add.rectangle(lit.x, lit.y, lit.ww, lit.wh, VILLAGE.window, 1);
      const halo = this.add.circle(lit.x, lit.y, lit.wh, VILLAGE.window, 0.5);
      win.setScale(0); this.tweens.add({ targets: win, scale: 1, duration: 380, ease: 'Back.Out' });
      this.tweens.add({ targets: halo, scale: 2.4, alpha: 0, duration: 700, onComplete: () => halo.destroy() });
    }

    // The task on a glass strip, the stats along the bottom, and the two columns between.
    const title = TITLES[r.pairs[0].k] || 'Match the pairs';
    const titleY = area.y + 26 * f;
    const tt = this.add.text(cx, titleY, title, { fontFamily: FONT, fontSize: Math.round((area.w < 420 * ui ? 16 : 20) * f) + 'px', color: hex(VILLAGE.text), fontStyle: WEIGHT.heavy, align: 'center', wordWrap: { width: area.w - 40 * f } }).setOrigin(0.5);
    const tw = Math.min(area.w - 16 * f, (tt.width || 200) + 44 * f), th = (tt.height || 24) + 16 * f;
    glassPanel(this, cx - tw / 2, titleY - th / 2, tw, th, f);
    if (this.children && typeof this.children.bringToTop === 'function') this.children.bringToTop(tt);
    const statsH = 40 * f, statsY = area.y + area.h - statsH;
    const n = PAIRS_PER_ROUND, gap = 12 * f;
    const top = titleY + th / 2 + 18 * f, room = statsY - 14 * f - top;
    const cardH = Math.max(48 * f, Math.min(84 * f, (room - gap * (n - 1)) / n));
    const colGap = wide ? 90 * f : 26 * f;
    const colW = Math.min((area.w - 20 * f - colGap) / 2, 440 * f);
    const leftX = cx - colGap / 2 - colW / 2, rightX = cx + colGap / 2 + colW / 2;
    const rowsTop = top + Math.max(0, (room - (cardH * n + gap * (n - 1))) / 2);
    const rowY = (row) => rowsTop + row * (cardH + gap) + cardH / 2;

    const made = [];
    for (let row = 0; row < n; row++) {
      const lp = row, rp = r.right[row];
      made.push(this.makeVillageCard(leftX, rowY(row), colW, cardH, r.pairs[lp].l, 'purple', this.cardStyle('L', lp), () => this.tap('L', lp), f, true));
      made.push(this.makeVillageCard(rightX, rowY(row), colW, cardH, r.pairs[rp].r, 'blue', this.cardStyle('R', rp), () => this.tap('R', rp), f, false));
    }
    // Light crackles between each matched pair; the newest one flashes in.
    const links = this.add.graphics();
    for (let row = 0; row < n; row++) {
      if (!s.done.includes(this.key(row))) continue;
      lightning(links, { x: leftX + colW / 2, y: rowY(row) }, { x: rightX - colW / 2, y: rowY(r.right.indexOf(row)) }, f, s.rIdx * 7 + row);
    }
    if (this.children && typeof this.children.bringToTop === 'function') this.children.bringToTop(links);
    if (s.pop && this.tweens) { links.setAlpha(0.3); this.tweens.add({ targets: links, alpha: 1, duration: 260, ease: 'Quad.Out' }); }
    s.pop = false;

    const coins = (this.profile && this.profile.coins) || 0;
    statsBar(this, cx, statsY, Math.min(area.w - 16 * f, 540 * f), statsH, [`🔥 Streak: ${s.streak || 0}`, `⭐ ${s.done.length} / ${ROUNDS * n}`, `💰 ${coins}`], f);
    enter(this, made, { from: 'up', stagger: 30 });
  }

  makeVillageCard(x, y, w, h, label, tone, style, onTap, f, medallion) {
    const state = { done: 'done', wrong: 'wrong', picked: 'picked' }[style.state] || 'idle';
    const c = matchCard(this, x, y, w, h, label, { tone, state, medallion, f, onTap: style.active ? onTap : null });
    this.answerSpeaker(c, w, h, label);
    return c;
  }

  /** The lantern festival: sky lanterns for pairs matched, the task on a ribbon, two columns of paper lanterns. */
  buildFestival(area) {
    const s = this.state, ui = this.ui, r = this.round;
    const cx = area.x + area.w / 2;
    const f = ui * Math.min(1, Math.max(0.72, area.h / (620 * ui)));
    const skyH = 56 * f, top = area.y + 6 * f;
    // The lake starts under the last row, so the lanterns are reflected in it.
    const titleY = top + skyH + 20 * f;
    const titleSize = area.w < 420 * ui ? 14 : 16;
    const colGap = Math.max(22 * f, 28 * ui);
    // Rows share the space under the ribbon: lanterns up to 84 px tall, the spare room goes into the gaps (so each
    // row's string of lights has air above it) and what is left centres the rows over the lake.
    const room = area.y + area.h - (titleY + 26 * f) - 14 * f, n = PAIRS_PER_ROUND;
    const lanternH = Math.max(54 * f, Math.min(84 * f, (room - 20 * f * n) / n));
    const gap = Math.max(18 * f, Math.min(44 * f, (room - lanternH * n) / n));
    const rowsTop = titleY + 26 * f + gap + Math.max(0, (room - lanternH * n - gap * n) / 2);
    const rowY = (row) => rowsTop + row * (lanternH + gap) + lanternH / 2;
    drawFestival(this, area, Math.min(area.y + area.h - 24 * f, rowY(PAIRS_PER_ROUND - 1) + lanternH * 0.2), f);

    // Progress: a sky lantern for every pair matched in the whole game.
    const total = ROUNDS * PAIRS_PER_ROUND;
    const sky = lanternSky(this, { x: area.x + 20 * ui, y: top, w: area.w - 40 * ui, h: skyH }, s.done.length, total, f);
    sky.lanterns.forEach((l, i) => this.tweens && this.tweens.add({ targets: l, y: l.y - 3 * f, duration: 1400 + (i % 4) * 250, yoyo: true, repeat: -1, ease: 'Sine.InOut' }));
    const task = ribbon(this, cx, titleY, TITLES[r.pairs[0].k] || 'Match the pairs', f, titleSize);

    const colW = Math.min((area.w - 24 * ui - colGap) / 2, 360 * ui, lanternH * 3.4);   // wide enough for a word, still lantern-shaped
    const x0 = cx - (colW * 2 + colGap) / 2;
    const leftX = x0 + colW / 2, rightX = x0 + colW + colGap + colW / 2;
    const made = [];
    for (let row = 0; row < PAIRS_PER_ROUND; row++) {
      const lp = row, rp = r.right[row];
      // Each row hangs from its own string of lights, sagging a little across the whole width.
      const str = lightString(this, area.x + 10 * ui, area.x + area.w - 10 * ui, rowY(row) - lanternH / 2 - 12 * f, 8 * f, f);
      made.push(this.makeLantern(leftX, rowY(row), colW, lanternH, r.pairs[lp].l, this.cardStyle('L', lp), () => this.tap('L', lp), row, str.yAt(leftX), f));
      made.push(this.makeLantern(rightX, rowY(row), colW, lanternH, r.pairs[rp].r, this.cardStyle('R', rp), () => this.tap('R', rp), row + 2, str.yAt(rightX), f));
    }
    // Golden threads tie the pairs already matched.
    const threads = this.add.graphics();
    for (let row = 0; row < PAIRS_PER_ROUND; row++) {
      if (!s.done.includes(this.key(row))) continue;
      const a = { x: leftX + colW / 2 - 2, y: rowY(row) }, b = { x: rightX - colW / 2 + 2, y: rowY(r.right.indexOf(row)) };
      threads.lineStyle(8 * f, LANTERN.gold, 0.22); threads.lineBetween(a.x, a.y, b.x, b.y);
      threads.lineStyle(3 * f, LANTERN.gold, 1); threads.lineBetween(a.x, a.y, b.x, b.y);
      threads.fillStyle(LANTERN.gold, 1); threads.fillCircle(a.x, a.y, 4.5 * f); threads.fillCircle(b.x, b.y, 4.5 * f);
    }
    if (this.children && typeof this.children.bringToTop === 'function') this.children.bringToTop(threads);
    // A new pair sends its lantern up from between the two words to its place in the sky.
    const newest = sky.lanterns[sky.lanterns.length - 1];
    if (s.pop && newest && s.lastMatch !== undefined && s.lastMatch !== null && this.tweens) {
      const slot = sky.slots[sky.lanterns.length - 1];
      newest.setPosition(cx, (rowY(s.lastMatch) + rowY(r.right.indexOf(s.lastMatch))) / 2).setScale(1.8);
      this.tweens.add({ targets: newest, x: slot.x, y: slot.y, scale: 1, duration: 1100, ease: 'Sine.InOut' });
    }
    s.pop = false;
    enter(this, made, { from: 'pop', stagger: 30 });
    enter(this, [task.g, task.t], { from: 'up', distance: 8 });
  }

  /** One paper lantern for the festival, coloured by its state (see cardStyle). */
  makeLantern(x, y, w, h, label, style, onTap, seed, hangY, f) {
    const state = { done: 'done', wrong: 'wrong', picked: 'picked' }[style.state] || 'idle';
    const lantern = paperLantern(this, x, y, w, h, label, { state, seed, hangY, ui: f, fontSize: label.length > 14 ? 18 : label.length > 9 ? 21 : 24, onTap: style.active ? onTap : null });
    this.answerSpeaker(lantern, w, h, label);
    return lantern;
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

  tap(side, pairIdx) {
    const s = this.state;
    if (s.busy || s.done.includes(this.key(pairIdx))) return;
    const prop = side === 'L' ? 'left' : 'right';
    if (s[prop] === pairIdx) { s[prop] = null; s.first = null; this.rebuild(); return; }
    s[prop] = pairIdx;
    if (s.left === null || s.right === null) { s.first = side; this.rebuild(); return; }
    if (s.left === s.right) {
      s.done.push(this.key(pairIdx)); s.left = s.right = null; s.first = null; s.pop = true; s.lastMatch = pairIdx;
      s.streak = (s.streak || 0) + 1;
      Sfx.correct(); this.rebuild();
      const roundDone = this.round.pairs.every((_, i) => s.done.includes(this.key(i)));
      if (roundDone) { s.busy = true; this.time.delayedCall(700, () => this.nextRound()); }
      return;
    }
    // Wrong: the mistake goes to the pair the player was trying to match (the first card tapped).
    const k = this.key(s.first === 'R' ? s.right : s.left);
    s.mistakes[k] = (s.mistakes[k] || 0) + 1;
    s.flash = { L: s.left, R: s.right }; s.busy = true; s.streak = 0;
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
