import { BaseScene } from './BaseScene.js';
import { SCENES } from '../constants.js';
import { hex } from '../ui/theme.js';
import * as Store from '../systems/Store.js';
import { FONT, WEIGHT } from '../ui/TextStyles.js';
import { button, iconButton, speakButton } from '../ui/Button.js';
import { readable } from '../ui/ReadableText.js';
import { StarRow } from '../ui/StarRow.js';
import { enter, shake } from '../ui/motion.js';
import { fireworks } from '../ui/Fireworks.js';
import { Sfx } from '../systems/Audio.js';
import { rateFor, stop as stopSpeech } from '../systems/Speech.js';
import { safeArea, grid } from '../systems/Layout.js';
import { Rng } from '../systems/Rng.js';
import { bandFor } from '../data/grades.js';
import { effectiveGrade } from '../systems/Progression.js';
import { skillLabel } from '../data/skills.js';
import { MINIGAMES } from '../data/minigames.js';
import { getModule, moduleBlocks, moduleItems, blockTopic, cardFaces, practiceQuestion } from '../data/bible/lessons.js';
import { blockStars, blockOpen, finishBlock, moduleProgress } from '../systems/Church.js';
import { VILLAGE, drawBackdrop, glassPanel, answerCard, bindLetterKeys } from './minigames/bible/VillageScenery.js';

const MAX_MISSES = 2;
const gameTitle = (id) => (MINIGAMES.find((g) => g.id === id) || {}).title || id;

/**
 * One window of the Village Church: a module's building blocks. The blocks stack up like the stones of a wall, from
 * the first (always open) upwards; each opens once the one below it is learned. A block is learned in two steps:
 *   learn:    flip cards, one per fact (tap to turn over, read aloud with 🔊), until every card has been turned;
 *   practice: a question per fact, asked the way the games ask it. A wrong pick is marked and a reminder of the
 *             fact is shown; the child tries again (after two misses the answer is shown).
 * Then the stars, coins and "ready for" games. Launched over ChurchScene, which is resumed (with 'church:done').
 */
export class ChurchLessonScene extends BaseScene {
  constructor() { super(SCENES.ChurchLesson); this.fade = true; }

  init(data) {
    this.moduleId = data.moduleId;
    this.returnTo = data.returnTo || SCENES.Church;
    this.module = getModule(data.moduleId);
    const p = Store.getProfile();
    this.band = bandFor(effectiveGrade(p, 'bible'));
    this.blocks = this.module ? moduleBlocks(this.module.id, this.band) : [];
    this.pool = this.module ? moduleItems(this.module.id, this.band) : [];
    this.rng = new Rng();
    this.state = { view: 'blocks', block: null, flipped: [], seen: [], lastFlip: null, quiz: [], qIdx: 0, picks: [], firstTry: 0, reward: null, earned: { coins: 0, blocks: 0 } };
  }

  create(data) {
    super.create(data);
    this.scene.bringToTop();
    bindLetterKeys(this, (i) => { const s = this.state; if (s.view === 'practice' && this.question && i < this.question.choices.length) this.pick(i); });
    this.events.once('shutdown', () => stopSpeech());
  }

  get speechRate() { return rateFor(Store.getProfile()?.grade); }
  get question() { return this.state.quiz[this.state.qIdx]; }
  enterKey() { const s = this.state; return `${s.view}${s.block}${s.view === 'practice' ? s.qIdx : ''}`; }

  build() {
    const { w, h, ui } = this;
    const sa = safeArea();
    const s = this.state, mod = this.module;
    const area = { x: 12 + sa.left, y: 0, w: w - 24 - sa.left - sa.right, h };
    drawBackdrop(this, { x: 0, y: 0, w, h });
    if (!mod) { iconButton(this, 34, 34, 44 * ui, '←', { onClick: () => this.close() }); return; }
    const f = ui * Math.min(1, Math.max(0.75, h / (720 * ui)));

    // Header: a strip of stained glass in the module's colour, the title, and how many blocks are learned.
    const headH = 64 * f + sa.top;
    const g = this.add.graphics();
    const panes = 12;
    for (let i = 0; i < panes; i++) {
      g.fillStyle(mod.glass, 0.2 + ((i * 7) % 5) * 0.08);
      g.fillRect((w / panes) * i, 0, w / panes - 2, headH - 4);
    }
    g.fillStyle(0xffc531, 0.8); g.fillRect(0, headH - 4, w, 3);
    const cy = sa.top + 32 * f;
    iconButton(this, 12 + sa.left + 22 * ui, cy, 44 * ui, '←', { onClick: () => (s.view === 'blocks' ? this.close() : this.toBlocks()) });
    this.add.text(w / 2, cy, `${mod.icon}  ${mod.title}`, { fontFamily: FONT, fontSize: Math.round(24 * f) + 'px', color: hex(VILLAGE.text), fontStyle: WEIGHT.heavy }).setOrigin(0.5);
    const prog = moduleProgress(Store.getProfile(), mod.id, this.band);
    this.add.text(w - 16 - sa.right, cy, `🧱 ${prog.done} / ${prog.total}`, { fontFamily: FONT, fontSize: Math.round(16 * f) + 'px', color: hex(VILLAGE.question), fontStyle: WEIGHT.heavy }).setOrigin(1, 0.5);

    const body = { x: area.x, y: headH + 12 * f, w: area.w, h: h - headH - 12 * f - 12 - sa.bottom };
    if (s.view === 'blocks') this.buildBlocks(body, f, prog);
    else if (s.view === 'learn') this.buildLearn(body, f);
    else if (s.view === 'practice') this.buildPractice(body, f);
    else this.buildDone(body, f);
  }

  // ---- The building blocks ------------------------------------------------------------------------

  /** The module's blocks stacked as a wall of stones, first at the bottom; learned ones golden, the next one glowing. */
  buildBlocks(r, f, prog) {
    const p = Store.getProfile(), mod = this.module, cx = r.x + r.w / 2;
    const intro = this.add.text(cx, r.y + 4 * f, mod.intro, { fontFamily: FONT, fontSize: Math.round(16 * f) + 'px', color: hex(VILLAGE.text), fontStyle: WEIGHT.bold, align: 'center', wordWrap: { width: Math.min(r.w - 20, 640 * f) } }).setOrigin(0.5, 0);
    let y = r.y + 4 * f + (intro.height || 20) + 8 * f;
    this.add.text(cx, y, `Helps you in: ${mod.games.map(gameTitle).join(' · ')}`, { fontFamily: FONT, fontSize: Math.round(15 * f) + 'px', color: hex(VILLAGE.glowSoft), fontStyle: WEIGHT.bold, align: 'center', wordWrap: { width: r.w - 20 } }).setOrigin(0.5, 0);
    y += 28 * f;
    const n = this.blocks.length;
    const footH = prog.complete ? 40 * f : 0;
    const room = r.y + r.h - footH - y;
    const gap = 10 * f, bh = Math.max(48 * f, Math.min(78 * f, (room - gap * (n - 1)) / n));
    const bw = Math.min(r.w - 48 * f, 560 * f);   // room for the masonry stagger either side
    const lift = Math.max(0, (room - (n * bh + (n - 1) * gap)) / 2);   // the stack sits in the middle of the space
    const made = [];
    // Bottom-up, each stone nudged left or right like courses of masonry.
    this.blocks.forEach((items, i) => {
      const by = y + room - lift - (i + 1) * bh - i * gap + bh / 2;
      const bx = cx + (i % 2 ? 14 : -14) * f;
      const stars = blockStars(p, mod.id, this.band, i), open = blockOpen(p, mod.id, this.band, i);
      made.push(this.stone(bx, by, bw, bh, i, items, { stars, open, next: open && !stars }, f));
    });
    enter(this, made, { from: 'up', stagger: 50 });
    if (prog.complete) this.add.text(cx, r.y + r.h - 18 * f, `✓ You have learned all of ${mod.title}!`, { fontFamily: FONT, fontSize: Math.round(17 * f) + 'px', color: hex(VILLAGE.ok), fontStyle: WEIGHT.heavy }).setOrigin(0.5);
  }

  /** One block's stone: sandstone with stars once learned, glowing when it is the next to learn, grey and locked above. */
  stone(x, y, w, h, i, items, { stars, open, next }, f) {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    const r = 10 * f;
    if (next) { [10, 6, 3].forEach((p, k) => { g.fillStyle(this.module.glass, 0.12 * (k + 1)); g.fillRoundedRect(-w / 2 - p * f, -h / 2 - p * f, w + p * 2 * f, h + p * 2 * f, r + p * f); }); }
    const [face, edge, ink] = stars ? [0xe9d3a4, 0xb08a4e, 0x3b2412] : open ? [0x4a4270, this.module.glass, 0xffffff] : [0x3a3f52, 0x2a2e3d, 0x8d93a8];
    g.fillStyle(edge, 1); g.fillRoundedRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, r + 2);
    g.fillStyle(face, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    g.fillStyle(0xffffff, stars ? 0.25 : 0.06); g.fillRoundedRect(-w / 2 + 4, -h / 2 + 3, w - 8, 5, 2);
    g.lineStyle(1, 0x000000, 0.12); g.lineBetween(-w * 0.2, -h / 2 + 8, -w * 0.18, h / 2 - 6); g.lineBetween(w * 0.25, -h / 2 + 6, w * 0.24, h / 2 - 8);
    const title = this.add.text(-w / 2 + 16 * f, -h * 0.16, `Block ${i + 1}`, { fontFamily: FONT, fontSize: Math.round(17 * f) + 'px', color: hex(ink), fontStyle: WEIGHT.heavy }).setOrigin(0, 0.5);
    const topic = this.add.text(-w / 2 + 16 * f, h * 0.2, open || stars ? blockTopic(items) : 'Learn the block below first', { fontFamily: FONT, fontSize: Math.round(15 * f) + 'px', color: hex(ink), fontStyle: WEIGHT.bold, wordWrap: { width: w * 0.62 } }).setOrigin(0, 0.5).setAlpha(0.85);
    const parts = [g, title, topic];
    const right = w / 2 - 16 * f;
    if (stars) {
      for (let k = 0; k < 3; k++) parts.push(this.add.image(right - (2 - k) * 22 * f - 8 * f, 0, k < stars ? 'star' : 'star-off').setDisplaySize(18 * f, 18 * f));
    } else {
      parts.push(this.add.text(right, 0, open ? 'Learn ▶' : '🔒', { fontFamily: FONT, fontSize: Math.round((open ? 17 : 20) * f) + 'px', color: hex(open ? 0xffffff : ink), fontStyle: WEIGHT.heavy }).setOrigin(1, 0.5));
    }
    c.add(parts);
    c.setSize(w, h);
    c.label = title;   // a button: tests find it by "Block n"
    c.setInteractive({ useHandCursor: open });
    if (open) {
      c.on('pointerdown', () => { if (this.tweens) this.tweens.add({ targets: c, scale: 0.98, duration: 80, yoyo: true }); });
      c.on('pointerup', () => this.startBlock(i));
    } else c.on('pointerup', () => { Sfx.wrong(); shake(this, c, 5); });   // locked: a little wiggle
    return c;
  }

  // ---- Learn: flip cards --------------------------------------------------------------------------

  buildLearn(r, f) {
    const s = this.state, items = this.blocks[s.block], cx = r.x + r.w / 2;
    const turned = s.seen.filter(Boolean).length, all = turned === items.length;
    this.add.text(cx, r.y + 6 * f, `Block ${s.block + 1} · Learn`, { fontFamily: FONT, fontSize: Math.round(20 * f) + 'px', color: hex(VILLAGE.question), fontStyle: WEIGHT.heavy }).setOrigin(0.5, 0);
    this.add.text(cx, r.y + 34 * f, all ? 'Well done! Ready to test yourself?' : `Tap each card to turn it over  ·  ${turned} of ${items.length} turned`, { fontFamily: FONT, fontSize: Math.round(14 * f) + 'px', color: hex(VILLAGE.text), fontStyle: WEIGHT.bold }).setOrigin(0.5, 0);
    const top = r.y + 64 * f, footH = 66 * f;
    const wide = r.w / this.ui >= 620;
    const cols = wide ? 2 : 1, rows = Math.ceil(items.length / cols), gap = 12 * f;
    const cellH = Math.min(150 * f, (r.y + r.h - footH - top - gap * (rows - 1)) / rows);
    const gw = Math.min(r.w, cols * 420 * f + gap);
    const cells = grid({ x: cx - gw / 2, y: top, w: gw, h: cellH * rows + gap * (rows - 1) }, cols, rows, gap);
    const made = items.map((it, i) => this.flipCard(cells[i], it, i, f));
    if (s.lastFlip === null) enter(this, made, { from: 'pop', stagger: 60 });
    s.lastFlip = null;
    const by = r.y + r.h - footH / 2;
    const bw = Math.min(260 * f, r.w * 0.6);
    button(this, cx, by, bw, 52 * f, all ? 'Test yourself ▶' : 'Turn every card first', { variant: all ? 'go' : 'helper', fontSize: 18 * (f / this.ui), disabled: !all, onClick: () => this.startPractice() });
  }

  /** One flip card: the question side is dark glass, the answer side warm parchment; a tap turns it (with a flip). */
  flipCard(cell, it, i, f) {
    const s = this.state, back = !!s.flipped[i];
    const faces = cardFaces(it);
    const c = this.add.container(cell.x, cell.y);
    const g = this.add.graphics();
    const w = cell.w, h = cell.h, r = 14 * f;
    if (back) {
      g.fillStyle(0xb08a4e, 1); g.fillRoundedRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, r + 2);
      g.fillStyle(0xf3e2b8, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    } else {
      g.fillStyle(this.module.glass, 0.8); g.fillRoundedRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, r + 2);
      g.fillStyle(0x2f2a4e, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
      g.fillStyle(this.module.glass, 0.18); g.fillRoundedRect(-w / 2 + 6, -h / 2 + 6, w - 12, h - 12, r - 4);
    }
    const str = back ? faces.back : faces.front;
    const colour = back ? 0x3b2412 : VILLAGE.text;
    let t = null;
    for (const px of [24, 21, 19, 17, 16]) {
      if (t) t.destroy();
      t = this.add.text(0, faces.ref && back ? -8 * f : 0, str, { fontFamily: FONT, fontSize: Math.round(px * f) + 'px', color: hex(colour), fontStyle: WEIGHT.heavy, align: 'center', wordWrap: { width: w - 70 * f } }).setOrigin(0.5);
      if ((t.height || 0) <= h - (faces.ref && back ? 40 : 20) * f) break;
    }
    const parts = [g, t];
    if (back && faces.ref) parts.push(this.add.text(0, h / 2 - 14 * f, faces.ref, { fontFamily: FONT, fontSize: Math.round(14 * f) + 'px', color: '#7a5a2e', fontStyle: WEIGHT.bold }).setOrigin(0.5));
    parts.push(this.add.text(-w / 2 + 14 * f, -h / 2 + 12 * f, back ? '↺' : '?', { fontFamily: FONT, fontSize: Math.round(14 * f) + 'px', color: hex(back ? 0x7a5a2e : VILLAGE.glowSoft), fontStyle: WEIGHT.heavy }).setOrigin(0.5));
    c.add(parts);
    c.setSize(w, h);
    c.face = back ? 'back' : 'front'; c.cardIndex = i;
    const sp = speakButton(this, w / 2 - 24 * f, -h / 2 + 22 * f, 34 * f, () => (back ? faces.back.replace(/\n/g, '. ') : faces.front), { rate: this.speechRate });
    if (sp) c.add(sp);
    c.setInteractive({ useHandCursor: true });
    c.on('pointerup', () => this.flip(i));
    if (s.lastFlip === i && this.tweens) { c.scaleX = 0; this.tweens.add({ targets: c, scaleX: 1, duration: 180, ease: 'Back.Out' }); }
    return c;
  }

  flip(i) {
    const s = this.state;
    if (s.view !== 'learn') return;
    s.flipped[i] = !s.flipped[i];
    s.seen[i] = true;
    s.lastFlip = i;
    Sfx.click();
    this.rebuild();
  }

  // ---- Practice -----------------------------------------------------------------------------------

  buildPractice(r, f) {
    const s = this.state, q = this.question, cx = r.x + r.w / 2;
    if (!q) return;
    this.add.text(cx, r.y + 6 * f, `Block ${s.block + 1} · Practice  ·  ${s.qIdx + 1} of ${s.quiz.length}`, { fontFamily: FONT, fontSize: Math.round(18 * f) + 'px', color: hex(VILLAGE.question), fontStyle: WEIGHT.heavy }).setOrigin(0.5, 0);
    const pw = Math.min(r.w, 760 * f), px = cx - pw / 2;
    const top = r.y + 36 * f, panelH = 128 * f;
    glassPanel(this, px, top, pw, panelH, f);
    let prompt = null;
    for (const size of [24, 21, 18, 16]) {
      if (prompt) prompt.destroy();
      prompt = readable(this, cx - 16 * f, top + panelH / 2, q.prompt, { fontFamily: FONT, fontSize: Math.round(size * f) + 'px', color: hex(VILLAGE.text), fontStyle: WEIGHT.heavy, align: 'center' }, { width: pw - 110 * f });
      if ((prompt.height || 0) <= panelH - 20 * f) break;
    }
    speakButton(this, px + pw - 32 * f, top + 30 * f, 40 * f, prompt, { rate: this.speechRate });
    // After a miss: a reminder of the fact, from the card they turned over.
    const missed = s.picks.some((k) => q.choices[k] !== q.answer), solved = this.solved;
    let y = top + panelH + 12 * f;
    if (missed && !solved) {
      // A nudge, not the answer: its first letter and where to read it (the answer itself comes after two misses).
      const it = this.blocks[s.block][s.qIdx];
      const first = String(q.answer).replace(/^(the|a|an) /i, '').charAt(0).toUpperCase();
      const hint = it.kind === 'order' ? 'Hint: think how the story begins.' : `Hint: it starts with “${first}”${q.ref ? `  ·  read ${q.ref}` : ''}`;
      const t = this.add.text(cx, y, s.picks.length >= MAX_MISSES ? `The answer is ${q.answer}.` : 'Not quite. Try again!', { fontFamily: FONT, fontSize: Math.round(16 * f) + 'px', color: hex(VILLAGE.wrongEdge), fontStyle: WEIGHT.heavy }).setOrigin(0.5, 0);
      y += (t.height || 20) + 4 * f;
      const hh = this.add.text(cx, y, hint, { fontFamily: FONT, fontSize: Math.round(14 * f) + 'px', color: hex(VILLAGE.window), fontStyle: WEIGHT.bold, align: 'center', wordWrap: { width: pw - 30 * f } }).setOrigin(0.5, 0);
      y += (hh.height || 20) + 8 * f;
    } else y += 8 * f;
    const n = q.choices.length, cols = 2, rows = Math.ceil(n / cols), gap = 12 * f;
    const ch = Math.min(96 * f, (r.y + r.h - 12 * f - y - gap * (rows - 1)) / rows);
    const cells = grid({ x: px, y, w: pw, h: ch * rows + gap * (rows - 1) }, cols, rows, gap);
    const made = q.choices.map((choice, i) => {
      const picked = s.picks.includes(i), isAnswer = choice === q.answer;
      const state = solved ? (isAnswer ? 'right' : picked ? 'wrong' : 'dim') : picked ? 'wrong' : 'idle';
      const card = answerCard(this, cells[i].x, cells[i].y, cells[i].w, cells[i].h, choice, { state, letter: 'ABCD'[i], f, onTap: solved || picked ? null : () => this.pick(i) });
      if (picked && i === s.picks[s.picks.length - 1] && !isAnswer && !solved) shake(this, card, 5);
      return card;
    });
    if (!s.picks.length) enter(this, made, { from: 'up', delay: 60, stagger: 40 });
  }

  /** The question is settled: picked right, or shown after two misses. */
  get solved() { const s = this.state, q = this.question; return !!q && (s.picks.some((k) => q.choices[k] === q.answer) || s.picks.length >= MAX_MISSES); }

  pick(i) {
    const s = this.state, q = this.question;
    if (!q || this.solved || s.picks.includes(i)) return;
    s.picks.push(i);
    const right = q.choices[i] === q.answer;
    if (right) { Sfx.correct(); if (s.picks.length === 1) s.firstTry += 1; } else Sfx.wrong();
    this.rebuild();
    if (this.solved) this.time.delayedCall(right ? 700 : 1600, () => this.nextQuestion());
  }

  nextQuestion() {
    const s = this.state;
    if (s.view !== 'practice' || !this.solved) return;
    s.qIdx += 1; s.picks = [];
    if (s.qIdx >= s.quiz.length) return this.finishBlockRun();
    this.rebuild();
  }

  finishBlockRun() {
    const s = this.state;
    let reward = null;
    const wasComplete = moduleProgress(Store.getProfile(), this.module.id, this.band).complete;
    Store.updateProfile((p) => { reward = finishBlock(p, this.module.id, this.band, s.block, s.firstTry, s.quiz.length); });
    s.reward = reward; s.view = 'done';
    s.finishedModule = !wasComplete && moduleProgress(Store.getProfile(), this.module.id, this.band).complete;
    if (reward) { s.earned.coins += reward.coins; if (reward.first) s.earned.blocks += 1; }
    if (s.finishedModule) { s.earned.completed = true; Sfx.bell(); }
    else if (reward && reward.stars === 3) Sfx.fanfare(); else Sfx.correct();
    this.rebuild();
    if (reward && reward.stars === 3) this.time.delayedCall(400, () => fireworks(this, this.w / 2, this.h * 0.3, { bursts: 3, spread: this.w * 0.3 }));
  }

  // ---- Done ---------------------------------------------------------------------------------------

  buildDone(r, f) {
    const s = this.state, rw = s.reward || { stars: 1, coins: 0, xp: 0 }, cx = r.x + r.w / 2, mod = this.module;
    const pw = Math.min(r.w, 560 * f), ph = Math.min(r.h - 10 * f, 310 * f), top = r.y + (r.h - ph) / 2;
    glassPanel(this, cx - pw / 2, top, pw, ph, f);
    let y = top + 34 * f;
    this.add.text(cx, y, `Block ${s.block + 1} learned!`, { fontFamily: FONT, fontSize: Math.round(26 * f) + 'px', color: hex(VILLAGE.question), fontStyle: WEIGHT.heavy }).setOrigin(0.5);
    y += 50 * f;
    const stars = new StarRow(this, cx, y, 0, 40 * f);
    if (!this.starsShown) { this.starsShown = true; stars.reveal(rw.stars, this); } else stars.set(rw.stars);
    y += 44 * f;
    this.add.text(cx, y, `${s.firstTry} of ${s.quiz.length} right first time${rw.coins ? `   ·   +${rw.coins} coins` : ''}`, { fontFamily: FONT, fontSize: Math.round(16 * f) + 'px', color: hex(VILLAGE.text), fontStyle: WEIGHT.bold }).setOrigin(0.5);
    y += 34 * f;
    if (s.finishedModule) {
      this.add.text(cx, y - 2 * f, `🔔 The whole window is lit! You finished ${mod.title}.`, { fontFamily: FONT, fontSize: Math.round(14 * f) + 'px', color: hex(VILLAGE.window), fontStyle: WEIGHT.heavy, align: 'center', wordWrap: { width: pw - 40 * f } }).setOrigin(0.5);
      y += 24 * f;
    }
    this.add.text(cx, y, `✓ ${skillLabel(mod.skill)} — ready for ${mod.games.map(gameTitle).join(', ')}`, { fontFamily: FONT, fontSize: Math.round(14 * f) + 'px', color: hex(VILLAGE.ok), fontStyle: WEIGHT.heavy, align: 'center', wordWrap: { width: pw - 40 * f } }).setOrigin(0.5);
    const nextOpen = s.block + 1 < this.blocks.length;
    const bw = Math.min((pw - 60 * f) / 2, 220 * f), by = top + ph - 44 * f;
    button(this, cx - bw / 2 - 8, by, bw, 50 * f, 'Back to the blocks', { variant: 'helper', fontSize: 16 * (f / this.ui), onClick: () => this.toBlocks() });
    button(this, cx + bw / 2 + 8, by, bw, 50 * f, nextOpen ? 'Next block ▶' : 'Back to church', { variant: 'go', fontSize: 16 * (f / this.ui), onClick: () => (nextOpen ? this.startBlock(s.block + 1) : this.close()) });
  }

  // ---- Flow ---------------------------------------------------------------------------------------

  startBlock(i) {
    const p = Store.getProfile();
    if (!blockOpen(p, this.module.id, this.band, i) || !this.blocks[i]) return;
    Sfx.click();
    const s = this.state;
    Object.assign(s, { view: 'learn', block: i, flipped: [], seen: [], lastFlip: null, quiz: [], qIdx: 0, picks: [], firstTry: 0, reward: null });
    this.starsShown = false;
    this.rebuild();
  }

  startPractice() {
    const s = this.state, items = this.blocks[s.block];
    if (s.seen.filter(Boolean).length < items.length) return;
    Sfx.click();
    s.quiz = items.map((it) => practiceQuestion(it, this.pool, this.rng));
    Object.assign(s, { view: 'practice', qIdx: 0, picks: [], firstTry: 0 });
    this.rebuild();
  }

  toBlocks() { Sfx.click(); this.state.view = 'blocks'; this.state.block = null; this.rebuild(); }

  /** Stop, wake the Hud and hand control back to the church with what was earned. */
  close() {
    if (this.closing) return;
    this.closing = true;
    stopSpeech();
    const mgr = this.scene, to = this.returnTo;
    mgr.stop(SCENES.ChurchLesson);
    if (mgr.isSleeping(SCENES.Hud)) mgr.wake(SCENES.Hud);
    const caller = mgr.get(to);
    if (caller) caller.events.emit('church:done', { moduleId: this.moduleId, earned: this.state.earned });
    if (mgr.isPaused(to)) mgr.resume(to);
    else if (!mgr.isActive(to)) mgr.start(to);
  }
}
