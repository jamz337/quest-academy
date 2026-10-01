import { BaseScene } from './BaseScene.js';
import { SCENES } from '../constants.js';
import { THEME, hex } from '../ui/theme.js';
import * as Store from '../systems/Store.js';
import { T, text, FONT, WEIGHT } from '../ui/TextStyles.js';
import { background, stripe } from '../ui/Panel.js';
import { card } from '../ui/Card.js';
import { chip } from '../ui/Chip.js';
import { button, iconButton } from '../ui/Button.js';
import { ProgressBar } from '../ui/ProgressBar.js';
import { enter, shake, pulse } from '../ui/motion.js';
import { Sfx } from '../systems/Audio.js';
import { speak, stop as stopSpeech, rateFor, canSpeak } from '../systems/Speech.js';
import { safeArea, pointerPos } from '../systems/Layout.js';
import { Rng } from '../systems/Rng.js';
import { getList, listWords, spellingGradeFor } from '../data/spelling/lists.js';
import { findPatterns, familyRound } from '../data/spelling/patterns.js';
import { trickFor } from '../data/spelling/tricks.js';
import { markSpelling, recordTaught, recordSpelling, trickySpots } from '../systems/Spelling.js';
import { letterRow, fitTile, chunkChips, letterKeyboard, keyFromEvent, wordPicture, beeFly, CHUNK_COLOURS } from '../ui/SpellingWidgets.js';

const STEPS = ['card', 'trace', 'build', 'copy', 'cover'];
const STEP_TITLE = { card: 'Look and listen', trace: 'Trace the word with your finger', build: 'Build it from the chunks', copy: 'Now copy it', cover: 'Look, say, cover, write, check' };
/** The five parts of the Look-Say-Cover-Write-Check step, lit as the child moves through them. */
const LSCWC = ['Look', 'Say', 'Cover', 'Write', 'Check'];
const COVER_TRIES = 2;   // after this many misses "Next word" is offered as well as "Look again"
const TRACE_HITS = 6;   // ink samples a letter needs before it counts as traced

/**
 * Teaching before the test. First the spelling patterns the list shares (ea, tion, doubled letters…), one card
 * each with the letters lit up inside the words, then a "find the family" round where the child spots new words
 * with the same letters. Then every word: a flash card with its picture that shows it in colour-coded syllable
 * chunks, rings its tricky part (and any letter the child has missed before) and gives a memory trick; tracing it
 * with a finger; building it from shuffled chunks; copying it, capitals included, while it stays on screen; and
 * Look-Say-Cover-Write-Check, where it is covered and written from memory, then checked letter by letter. Each word
 * copied sends a bee with honey to the pot. Then the test (SpellingGameScene).
 */
export class SpellingLearnScene extends BaseScene {
  constructor() { super(SCENES.SpellingLearn); this.fade = true; }

  init(data) {
    this.listId = data.listId;
    this.grade = data.grade || null;
    this.customWords = data.words || null;
    const list = data.words ? { id: data.listKind || 'tricky', title: data.title || 'Tricky words', words: data.words } : getList(data.listId);
    this.listKind = data.listKind || null; this.listTitle = data.title || null;
    this.list = list || { id: 'none', title: 'Spelling', words: [] };
    this.rng = new Rng();
    const words = listWords(this.list).map((e) => ({ word: e.w, chunks: e.syl.split('-').filter(Boolean), sentence: e.s, pic: e.pic, entry: e, trick: trickFor(e.w, e) }));
    const patterns = findPatterns(words.map((w) => w.word));
    this.state = { stage: patterns.length ? 'patterns' : 'words', patterns, pIdx: 0, pStep: 'card', family: null, words, idx: 0, step: 'card', typed: '', shift: false, result: null, placed: [], order: [], strokes: [], traced: {}, done: false, tries: 0, honey: 0, firstTries: 0, cover: 'look', coverTries: 0, remembered: 0 };
    this.prepare();
  }

  create(data) {
    super.create(data);
    this.scene.bringToTop();
    const kb = this.input && this.input.keyboard;
    if (kb && typeof kb.on === 'function') {
      this.onKey = (e) => this.keyDown(e);
      kb.on('keydown', this.onKey);
    }
    if (this.input && typeof this.input.on === 'function') {
      this.onDown = (p) => this.traceDown(p); this.onMove = (p) => this.traceMove(p); this.onUp = () => this.traceUp();
      this.input.on('pointerdown', this.onDown); this.input.on('pointermove', this.onMove); this.input.on('pointerup', this.onUp);
    }
    this.events.once('shutdown', () => {
      if (kb && this.onKey) kb.off('keydown', this.onKey);
      if (this.onDown && this.input) { this.input.off('pointerdown', this.onDown); this.input.off('pointermove', this.onMove); this.input.off('pointerup', this.onUp); }
      stopSpeech();
    });
    this.sayCurrent();
  }

  get entry() { return this.state.words[this.state.idx]; }
  get pattern() { return this.state.patterns[this.state.pIdx]; }
  enterKey() { const s = this.state; return s.done ? 'done' : s.stage === 'patterns' ? `p${s.pIdx}-${s.pStep}` : `${s.idx}-${s.step}${s.step === 'cover' ? '-' + s.cover : ''}`; }
  get speechRate() { return rateFor(Store.getProfile()?.grade); }

  /** Grade 2 hears every letter as it is typed (the player's grade, or the list's, whichever is lower). */
  get saysLetters() {
    const p = Store.getProfile();
    return Math.min(Number(p?.grade) || 9, this.grade || spellingGradeFor(p?.grade)) <= 2;
  }

  /** Shuffled chunk order for the build step (never the right order when there is more than one chunk). */
  prepare() {
    const s = this.state, e = this.entry;
    if (!e) return;
    const ids = e.chunks.map((_, i) => i);
    let order = this.rng.shuffle(ids);
    if (ids.length > 1) for (let g = 0; g < 10 && order.every((v, i) => v === i); g++) order = this.rng.shuffle(ids);
    if (ids.length > 1 && order.every((v, i) => v === i)) order = [...ids.slice(1), ids[0]];
    s.order = order; s.placed = []; s.typed = ''; s.shift = false; s.result = null; s.tries = 0; s.strokes = []; s.traced = {}; s.cover = 'look'; s.coverTries = 0;
  }

  /** Read out whatever is on screen: the pattern with its words, or the word, its chunks and its sentence. */
  sayCurrent() {
    const s = this.state;
    if (!canSpeak()) return;
    if (s.stage === 'patterns') {
      const p = this.pattern;
      if (p) speak(`${[...p.letters.toUpperCase()].join(', ')}. As in ${p.words.map((h) => h.word).join(', ')}.`, { rate: Math.max(0.7, this.speechRate - 0.15) });
      return;
    }
    const e = this.entry;
    if (!e) return;
    const chunks = e.chunks.length > 1 ? e.chunks.join(', ') + '. ' : '';
    if (s.step === 'cover') { speak(`${e.word}. ${chunks}${e.word}. Now you say it.`, { rate: Math.max(0.7, this.speechRate - 0.15) }); return; }
    speak(`${e.word}. ${chunks}${e.word}.${e.sentence ? ' ' + e.sentence : ''}`, { rate: Math.max(0.7, this.speechRate - 0.15) });
  }

  /** Say one typed letter: "b", or "capital C". */
  sayLetter(ch) {
    if (!this.saysLetters || !canSpeak() || !/^[a-zA-Z]$/.test(ch)) return;
    speak(ch === ch.toUpperCase() ? `capital ${ch}` : ch.toUpperCase(), { rate: 1 });
  }

  build() {
    const { w, h, ui } = this;
    const s = this.state;
    background(this, { accent: THEME.subjects.words.accent, accent2: THEME.gold, dots: false });
    if (s.done) return this.buildReady();
    const sa = safeArea();
    const cy = sa.top + 28 * ui + 2;
    iconButton(this, 12 + sa.left + 22 * ui, cy, 44 * ui, '←', { onClick: () => this.quit() });
    text(this, w / 2, cy, `${this.list.title}: learn`, T.heading(this));
    const total = s.patterns.length + s.words.length * STEPS.length;
    const at = s.stage === 'patterns' ? s.pIdx : s.patterns.length + s.idx * STEPS.length + STEPS.indexOf(s.step);
    chip(this, w - 12 - sa.right, cy, { text: s.stage === 'patterns' ? `Pattern ${s.pIdx + 1} / ${s.patterns.length}` : `${s.idx + 1} / ${s.words.length}`, originX: 1, color: THEME.subjects.words.soft, textColor: THEME.subjects.words.dark, shadow: 'none' });
    // Second row: progress through the teaching, and the honey pot (one drop per word copied right).
    const y2 = sa.top + 60 * ui;
    this.honey = chip(this, w - 12 - sa.right, y2, { text: `🍯 ${s.honey}`, originX: 1, color: THEME.warningSoft, textColor: THEME.warningDark, fontSize: 13, height: 24 * ui, shadow: 'none' });
    const barW = Math.max(40, w - 32 - this.honey.w - 8 - sa.left - sa.right);
    new ProgressBar(this, 16 + sa.left + barW / 2, y2, barW, 6 * ui, { value: at / Math.max(1, total), color: THEME.subjects.words.accent });
    const area = { x: 14 + sa.left, y: sa.top + 76 * ui, w: w - 28 - sa.left - sa.right, h: h - sa.top - 76 * ui - 14 - sa.bottom };
    if (s.stage === 'patterns') return s.pStep === 'family' && s.family ? this.buildFamily(area, s.family) : this.buildPattern(area, this.pattern);
    const e = this.entry;
    if (!e) return this.buildReady();
    if (s.step === 'card') this.buildCard(area, e);
    else if (s.step === 'trace') this.buildTrace(area, e);
    else if (s.step === 'build') this.buildChunks(area, e);
    else if (s.step === 'copy') this.buildCopy(area, e);
    else this.buildCover(area, e);
  }

  /** The step's title line with the word's small picture at its left (the hint wraps beside it). */
  hintLine(area, e, msg, colour) {
    const { ui } = this;
    this.pic = e.pic ? wordPicture(this, area.x + 12 + 22 * ui, area.y + 28 * ui, 40 * ui, e.pic) : null;
    const side = (this.pic ? 56 * ui : 0) + (canSpeak() ? 52 * ui : 0);
    return text(this, area.x + area.w / 2, area.y + 28 * ui, msg, { ...T.small(this, colour), wordWrap: { width: Math.max(120, area.w - 24 - side * 2) }, align: 'center' });
  }

  /** A pattern card: the shared letters big, then each word with those letters lit up. */
  buildPattern(area, p) {
    const { ui } = this, cx = area.x + area.w / 2;
    const colour = THEME.pink;
    const rows = p.words.length;
    const gap = 5 * ui, size = fitTile(Math.max(...p.words.map((h) => h.word.length)), area.w - 40, gap, 40 * ui, 16 * ui);
    const cardH = Math.min(area.h - 70 * ui, 100 * ui + rows * (size + 10 * ui) + 24 * ui);
    const k = card(this, cx, area.y + cardH / 2, area.w, cardH);
    stripe(this, cx - 24 * ui, area.y + 10 * ui, 48 * ui, colour, 5 * ui);
    text(this, cx, area.y + 28 * ui, 'Spelling pattern', T.small(this, THEME.ink2));
    text(this, cx, area.y + 58 * ui, p.letters, T.at(this, 34, colour, { fontStyle: '700' }));
    text(this, cx, area.y + 84 * ui, `${p.words.length} words share these letters: ${p.note}`, { ...T.small(this, THEME.ink2), wordWrap: { width: area.w - 32 } });
    p.words.forEach((h, i) => {
      const letters = [...h.word].map((ch, j) => ({ ch, look: 'shown', colour: j >= h.at && j < h.at + p.letters.length ? hex(colour) : undefined }));
      const tiles = letterRow(this, { cx, cy: area.y + 100 * ui + 16 * ui + i * (size + 10 * ui) + size / 2, letters, size, gap });
      enter(this, tiles, { from: 'pop', delay: i * 120, stagger: 25 });
    });
    enter(this, k, { from: 'up', distance: 12 });
    const by = area.y + cardH + 30 * ui, bw = Math.min((area.w - 20) / 2, 220 * ui);
    if (canSpeak()) button(this, cx - bw / 2 - 6, by, bw, 48 * ui, '🔊 Say it', { variant: 'secondary', onClick: () => this.sayCurrent() });
    button(this, canSpeak() ? cx + bw / 2 + 6 : cx, by, bw, 48 * ui, 'Next ▶', { variant: 'primary', onClick: () => this.advance() });
  }

  /** The flash card: the word's picture, the word in chunk colours, the chunk chips, the sound button. */
  buildCard(area, e) {
    const { ui } = this;
    const cx = area.x + area.w / 2;
    const gap = 6 * ui, size = fitTile(e.word.length, area.w - 40, gap, 52 * ui, 18 * ui);
    const picSize = e.pic ? Math.min(84 * ui, Math.max(44 * ui, area.h * 0.15)) : 0;
    const top = area.y + 44 * ui + (e.pic ? picSize + 10 * ui : 0);   // the tiles' top edge
    const cardH = Math.min(area.h - 70 * ui, top - area.y + size + (this.hasTrickLine(e) ? 130 : 96) * ui);
    const k = card(this, cx, area.y + cardH / 2, area.w, cardH);
    stripe(this, cx - 24 * ui, area.y + 10 * ui, 48 * ui, THEME.subjects.words.accent, 5 * ui);
    text(this, cx, area.y + 28 * ui, STEP_TITLE.card, T.small(this, THEME.ink2));
    if (e.pic) { this.pic = wordPicture(this, cx, area.y + 40 * ui + picSize / 2, picSize, e.pic); enter(this, this.pic, { from: 'pop' }); }
    // Letters take the colour of their chunk so the chunks can be seen inside the word; the tricky part is ringed.
    const tiles = letterRow(this, { cx, cy: top + size / 2, letters: this.wordLetters(e), size, gap });
    enter(this, tiles, { from: 'pop', stagger: 40 });
    if (e.chunks.length > 1) chunkChips(this, { cx, cy: top + size + 34 * ui, chunks: e.chunks, ui, maxW: area.w - 32 });
    else text(this, cx, top + size + 34 * ui, 'One chunk: say it slowly and listen to each sound.', T.small(this, THEME.ink3));
    this.trickLine(cx, top + size + 66 * ui, area.w - 32, e);
    enter(this, k, { from: 'up', distance: 12 });
    if (e.sentence) text(this, cx, area.y + cardH + 12 * ui, `“${e.sentence}”`, { ...T.small(this, THEME.ink2), wordWrap: { width: area.w - 24 } }).setOrigin(0.5, 0);
    const by = area.y + cardH + (e.sentence ? 58 : 30) * ui, bw = Math.min((area.w - 20) / 2, 220 * ui);
    if (canSpeak()) button(this, cx - bw / 2 - 6, by, bw, 48 * ui, '🔊 Sound it out', { variant: 'secondary', onClick: () => this.sayCurrent() });
    button(this, canSpeak() ? cx + bw / 2 + 6 : cx, by, bw, 48 * ui, 'Next ▶', { variant: 'primary', onClick: () => this.advance() });
    button(this, cx, by + 60 * ui, Math.min(area.w - 40, 220 * ui), 38 * ui, 'Skip to the test', { variant: 'ghost', fontSize: 14, onClick: () => this.startTest() });
  }

  // ---- Tracing --------------------------------------------------------------------------------

  /** Big faint letters to trace over; ink strokes live in state so a rebuild keeps them. */
  buildTrace(area, e) {
    const { ui } = this, s = this.state;
    const cx = area.x + area.w / 2;
    const n = e.word.length;
    const letterW = Math.min(64 * ui, (area.w - 40) / n), fontPx = Math.round(letterW * 1.3);
    const cardH = Math.min(area.h - 70 * ui, 44 * ui + fontPx + 60 * ui);
    const k = card(this, cx, area.y + cardH / 2, area.w, cardH);
    stripe(this, cx - 24 * ui, area.y + 10 * ui, 48 * ui, THEME.subjects.words.accent, 5 * ui);
    const done = this.traceDone();
    const tracedN = [...e.word].filter((_, i) => (s.traced[i] | 0) >= TRACE_HITS).length;
    this.traceLabel = this.hintLine(area, e, done ? 'Beautiful tracing!' : `${STEP_TITLE.trace}  ·  ${tracedN} of ${n} letters`, done ? THEME.successDark : THEME.ink2);
    const x0 = cx - (letterW * n) / 2, ly = area.y + 44 * ui + fontPx / 2;
    this.traceRects = [];
    [...e.word].forEach((ch, i) => {
      const lx = x0 + i * letterW + letterW / 2;
      const traced = (s.traced[i] | 0) >= TRACE_HITS;
      this.add.text(lx, ly, ch, { fontFamily: FONT, fontSize: fontPx + 'px', color: hex(traced ? THEME.success : THEME.ink3), fontStyle: WEIGHT.heavy }).setOrigin(0.5).setAlpha(traced ? 0.55 : 0.3);
      this.traceRects.push({ x0: lx - letterW / 2, x1: lx + letterW / 2, y0: ly - fontPx * 0.6, y1: ly + fontPx * 0.6 });
    });
    this.traceArea = { x: area.x, y: area.y, w: area.w, h: cardH };
    this.ink = this.add.graphics();
    this.drawStrokes();
    enter(this, k, { from: 'up', distance: 12 });
    const by = area.y + cardH + 30 * ui, bw = Math.min((area.w - 20) / 2, 220 * ui);
    button(this, cx - bw / 2 - 6, by, bw, 48 * ui, 'Clear', { variant: 'secondary', onClick: () => { s.strokes = []; s.traced = {}; this.rebuild(); } });
    button(this, cx + bw / 2 + 6, by, bw, 48 * ui, done ? 'Next ▶' : 'Skip ▶', { variant: done ? 'primary' : 'ghost', onClick: () => this.advance() });
  }

  drawStrokes() {
    const g = this.ink;
    if (!g || !g.active) return;
    g.clear();
    g.lineStyle(7 * this.ui, THEME.subjects.words.accent, 0.9);
    for (const st of this.state.strokes) {
      if (st.length < 2) { if (st.length) { g.fillStyle(THEME.subjects.words.accent, 0.9); g.fillCircle(st[0].x, st[0].y, 3.5 * this.ui); } continue; }
      g.beginPath(); g.moveTo(st[0].x, st[0].y);
      for (let i = 1; i < st.length; i++) g.lineTo(st[i].x, st[i].y);
      g.strokePath();
    }
  }

  inTraceArea(p) { const a = this.traceArea; return !!a && p.x >= a.x && p.x <= a.x + a.w && p.y >= a.y && p.y <= a.y + a.h; }
  traceDone() { const s = this.state, e = this.entry; return !!e && [...e.word].every((_, i) => (s.traced[i] | 0) >= TRACE_HITS); }

  /** Add an ink point: extends the current stroke and credits the letter under it. */
  addInk(p, fresh) {
    const s = this.state;
    if (fresh || !s.strokes.length) s.strokes.push([]);
    s.strokes[s.strokes.length - 1].push({ x: p.x, y: p.y });
    const wasDone = this.traceDone();
    (this.traceRects || []).forEach((r, i) => { if (p.x >= r.x0 && p.x <= r.x1 && p.y >= r.y0 && p.y <= r.y1) s.traced[i] = (s.traced[i] | 0) + 1; });
    this.drawStrokes();
    if (!wasDone && this.traceDone()) { Sfx.correct(); this.rebuild(); return; }
    // Keep the letter count live without redrawing the whole screen mid-stroke.
    const e = this.entry;
    if (e && this.traceLabel && this.traceLabel.active) {
      const tracedN = [...e.word].filter((_, i) => (s.traced[i] | 0) >= TRACE_HITS).length;
      this.traceLabel.setText(`${STEP_TITLE.trace}  ·  ${tracedN} of ${e.word.length} letters`);
    }
  }

  traceDown(pointer) {
    if (this.state.stage !== 'words' || this.state.step !== 'trace' || this.traceDone()) return;
    const p = pointerPos(this, pointer);
    if (!this.inTraceArea(p)) return;
    this.tracing = true;
    this.addInk(p, true);
  }

  traceMove(pointer) {
    if (!this.tracing || this.state.step !== 'trace') return;
    if (pointer && pointer.isDown === false) { this.tracing = false; return; }
    const p = pointerPos(this, pointer);
    if (!this.inTraceArea(p)) return;
    this.addInk(p, false);
  }

  traceUp() { this.tracing = false; }

  // ---- Build it and copy it ---------------------------------------------------------------------

  /** Build it: tap the chunks in order. Placed chunks fill the word from the left. */
  buildChunks(area, e) {
    const { ui } = this, s = this.state;
    const cx = area.x + area.w / 2;
    const gap = 6 * ui, size = fitTile(e.word.length, area.w - 40, gap, 52 * ui, 18 * ui);
    const cardH = Math.min(area.h - 60 * ui, 44 * ui + size + 110 * ui);
    const k = card(this, cx, area.y + cardH / 2, area.w, cardH);
    stripe(this, cx - 24 * ui, area.y + 10 * ui, 48 * ui, THEME.subjects.words.accent, 5 * ui);
    this.hintLine(area, e, s.result === 'right' ? 'That is the word!' : STEP_TITLE.build, s.result === 'right' ? THEME.successDark : THEME.ink2);
    const placedText = s.placed.map((i) => e.chunks[i]).join('');
    const letters = [...e.word].map((ch, i) => (i < placedText.length ? { ch, look: s.result === 'right' ? 'ok' : 'typed' } : { ch: '', look: 'blank' }));
    this.wordTiles = letterRow(this, { cx, cy: area.y + 44 * ui + size / 2, letters, size, gap });
    const state = s.order.map((ci) => (s.placed.includes(ci) ? 'done' : 'active'));
    chunkChips(this, { cx, cy: area.y + 44 * ui + size + 40 * ui, chunks: s.order.map((ci) => e.chunks[ci]), ui, maxW: area.w - 32, state, onTap: s.result === 'right' ? null : (pos) => this.tapChunk(s.order[pos]) });
    if (canSpeak()) iconButton(this, area.x + area.w - 30 * ui, area.y + 28 * ui, 40 * ui, '🔊', { variant: 'ghost', onClick: () => this.sayCurrent() });
    enter(this, k, { from: 'up', distance: 12 });
    if (s.result === 'right') button(this, cx, area.y + cardH + 30 * ui, Math.min(area.w - 40, 240 * ui), 48 * ui, 'Next ▶', { variant: 'primary', onClick: () => this.advance() });
  }

  tapChunk(ci) {
    const s = this.state, e = this.entry;
    if (s.step !== 'build' || s.result === 'right' || s.placed.includes(ci)) return;
    if (ci === s.placed.length) {
      s.placed.push(ci); Sfx.pop();
      if (s.placed.length === e.chunks.length) { s.result = 'right'; Sfx.correct(); if (canSpeak()) speak(e.word, { rate: this.speechRate }); this.rebuild(); if (this.pic) pulse(this, this.pic, 1.15); this.time.delayedCall(1000, () => { if (s.step === 'build' && s.result === 'right') this.advance(); }); return; }
      this.rebuild();
      return;
    }
    Sfx.wrong();
    if (canSpeak()) speak(e.chunks[s.placed.length], { rate: this.speechRate });
    if (this.wordTiles && this.wordTiles[0]) shake(this, this.wordTiles[0], 4);
  }

  /** Copy it: the word (with chunks) stays on screen and is typed underneath, capitals and all. */
  buildCopy(area, e) {
    const { ui } = this, s = this.state;
    const cx = area.x + area.w / 2;
    const gap = 6 * ui, size = fitTile(Math.max(e.word.length, s.typed.length), area.w - 40, gap, 40 * ui, 16 * ui);
    const cardH = Math.min(area.h * 0.5, 44 * ui + size * 2 + 60 * ui);
    const k = card(this, cx, area.y + cardH / 2, area.w, cardH);
    stripe(this, cx - 24 * ui, area.y + 10 * ui, 48 * ui, THEME.subjects.words.accent, 5 * ui);
    const marks = s.result ? markSpelling(s.typed, e.word) : null;
    const msg = s.result === 'right' ? (s.tries === 1 ? '⚡ Copied first time!' : 'Copied perfectly!') : s.result === 'wrong' ? (marks.caseOnly ? 'Nearly! Check the capital letters.' : 'Look at the red letters and try again') : STEP_TITLE.copy;
    this.hintLine(area, e, msg, s.result === 'right' ? THEME.successDark : s.result === 'wrong' ? THEME.danger : THEME.ink2);
    const shown = [];
    e.chunks.forEach((c, ci) => { for (const ch of c) shown.push({ ch, look: 'shown', colour: hex(CHUNK_COLOURS[ci % CHUNK_COLOURS.length]) }); });
    letterRow(this, { cx, cy: area.y + 44 * ui + size / 2, letters: shown, size, gap });
    let typedLetters;
    if (marks) typedLetters = marks.marks.map((m) => ({ ch: m.ch, look: m.ok ? 'ok' : m.missing ? 'missing' : m.wrongCase ? 'case' : 'bad' }));
    else typedLetters = Array.from({ length: Math.max(e.word.length, s.typed.length) }, (_, i) => ({ ch: s.typed[i] || '', look: s.typed[i] ? 'typed' : 'blank' }));
    this.wordTiles = letterRow(this, { cx, cy: area.y + 44 * ui + size * 1.5 + 14 * ui, letters: typedLetters, size, gap });
    if (canSpeak()) iconButton(this, area.x + area.w - 30 * ui, area.y + 28 * ui, 40 * ui, '🔊', { variant: 'ghost', onClick: () => this.sayCurrent() });
    enter(this, k, { from: 'up', distance: 12 });
    if (s.result === 'right') { button(this, cx, area.y + cardH + 30 * ui, Math.min(area.w - 40, 240 * ui), 48 * ui, 'Now cover it ▶', { variant: 'primary', onClick: () => this.advance() }); return; }
    letterKeyboard(this, { x: area.x, y: area.y + cardH + 12, w: area.w, h: area.h - cardH - 12 }, { onKey: (ch) => this.type(ch), onCheck: () => this.checkCopy(), onShift: () => this.type('⇧'), shift: s.shift, ready: s.typed.length > 0, ui });
  }

  /** A key press: a letter (in the case shown on the key), shift for the next letter, or backspace. */
  type(ch) {
    const s = this.state, e = this.entry;
    if (!this.typing()) return;
    if (ch === '⇧') { s.shift = !s.shift; Sfx.click(); this.rebuild(); return; }
    if (s.result === 'wrong') { s.result = null; s.typed = ''; }
    if (ch === '⌫') { if (!s.typed) return; s.typed = s.typed.slice(0, -1); }
    else { if (s.typed.length >= e.word.length + 3) return; s.typed += ch; s.shift = false; this.sayLetter(ch); }
    Sfx.pop();
    this.rebuild();
  }

  checkCopy() {
    const s = this.state, e = this.entry;
    if (s.step !== 'copy' || !s.typed || s.result === 'right') return;
    const right = s.typed === e.word;
    s.result = right ? 'right' : 'wrong'; s.tries += 1;
    if (right) {
      Sfx.correct(); Store.updateProfile((p) => recordTaught(p, e.word)); if (canSpeak()) speak(e.word, { rate: this.speechRate });
      s.honey += 1; if (s.tries === 1) s.firstTries += 1;
    } else { Sfx.wrong(); this.cameras.main.shake(120, 0.004); }
    this.rebuild();
    if (right) {
      // The bee carries the word's honey to the pot.
      const from = this.pic || (this.wordTiles && this.wordTiles[0]), pot = this.honey;
      if (this.pic) pulse(this, this.pic, 1.15);
      if (from && pot) beeFly(this, from.x, from.y, pot.x - pot.w / 2, pot.y, () => { Sfx.coin(); if (pot.active !== false) pulse(this, pot, 1.2); }, this.ui);
      this.time.delayedCall(1100, () => { if (s.step === 'copy' && s.result === 'right') this.advance(); });   // on to Look-Say-Cover-Write-Check
    }
  }

  keyDown(e) {
    const s = this.state;
    if (s.done) return;
    const k = keyFromEvent(e);
    if (s.stage === 'patterns' || s.step === 'card' || s.step === 'trace') { if (k === 'Enter' && !(s.stage === 'patterns' && s.pStep === 'family' && !this.familyDone())) this.advance(); return; }
    if (s.step === 'build') return;
    if (s.step === 'cover' && s.cover !== 'write') {
      if (k === 'Enter') { if (s.cover === 'look') this.coverIt(); else if (s.result === 'right' || s.coverTries >= COVER_TRIES) this.advance(); else this.lookAgain(); }
      return;
    }
    if (k === 'Enter') return s.step === 'cover' ? this.checkCover() : this.checkCopy();
    if (k) this.type(k);
  }

  /** Pattern cards → for each word: card → trace → build (skipped for one-chunk words) → copy → the test. */
  advance() {
    const s = this.state;
    stopSpeech();
    if (s.stage === 'patterns') {
      // Each pattern card is followed by its "find the family" round (when there are enough family words).
      if (s.pStep === 'card') {
        const p = this.pattern;
        s.family = p ? familyRound(p.letters, s.words.map((x) => x.word), (a) => this.rng.shuffle(a)) : null;
        if (s.family) { s.family.found = []; s.family.wrong = []; s.pStep = 'family'; this.rebuild(); this.sayFamily(); return; }
      }
      s.pStep = 'card'; s.family = null;
      s.pIdx += 1;
      if (s.pIdx >= s.patterns.length) { s.stage = 'words'; s.pIdx = 0; }
      this.rebuild(); this.sayCurrent();
      return;
    }
    const e = this.entry;
    if (s.step === 'card') { s.step = 'trace'; s.strokes = []; s.traced = {}; this.rebuild(); return; }
    if (s.step === 'trace') { s.step = e.chunks.length > 1 ? 'build' : 'copy'; s.result = null; this.rebuild(); return; }
    if (s.step === 'build') { s.step = 'copy'; s.typed = ''; s.shift = false; s.result = null; this.rebuild(); return; }
    if (s.step === 'copy') { s.step = 'cover'; s.cover = 'look'; s.typed = ''; s.shift = false; s.result = null; s.coverTries = 0; this.rebuild(); this.sayCurrent(); return; }
    s.idx += 1;
    if (s.idx >= s.words.length) { s.done = true; Sfx.fanfare(); this.rebuild(); return; }
    s.step = 'card';
    this.prepare();
    this.rebuild();
    this.sayCurrent();
  }

  // ---- Tricky part and memory trick ---------------------------------------------------------------

  /** The word's letters in chunk colours, with its tricky part (and letters missed before) ringed. */
  wordLetters(e, look = 'shown') {
    const spots = new Set(trickySpots(Store.getProfile(), e.word, e.entry));
    const out = [];
    let i = 0;
    e.chunks.forEach((c, ci) => { for (const ch of c) { out.push({ ch, look, colour: hex(CHUNK_COLOURS[ci % CHUNK_COLOURS.length]), tricky: spots.has(i) }); i += 1; } });
    return out;
  }

  hasTrickLine(e) { return !!(e.trick && e.trick.trick) || trickySpots(Store.getProfile(), e.word, e.entry).length > 0; }

  /** "Watch the ringed letters" and the memory trick, under the word. */
  trickLine(cx, y, width, e) {
    if (!this.hasTrickLine(e)) return null;
    const trick = e.trick && e.trick.trick;
    const str = trick ? `🧠 ${trick}` : '⚠ Watch the ringed letters: that is the tricky part.';
    return text(this, cx, y, str, { ...T.small(this, THEME.warningDark), wordWrap: { width }, align: 'center' });
  }

  // ---- Find the family ------------------------------------------------------------------------------

  familyDone() { const f = this.state.family; return !!f && f.words.filter((x) => x.member).every((x) => f.found.includes(x.word)); }

  sayFamily() {
    const f = this.state.family;
    if (f && canSpeak()) speak(`Find the words with ${[...f.letters.toUpperCase()].join(', ')}.`, { rate: this.speechRate });
  }

  /** Tap the new words that share the pattern's letters; the others shake. */
  buildFamily(area, f) {
    const { ui } = this, cx = area.x + area.w / 2;
    const done = this.familyDone();
    const members = f.words.filter((x) => x.member).length;
    const rows = Math.ceil(f.words.length / 2), chipH = 52 * ui, gap = 10 * ui;
    const cardH = Math.min(area.h - 70 * ui, 112 * ui + rows * (chipH + gap));
    const k = card(this, cx, area.y + cardH / 2, area.w, cardH);
    stripe(this, cx - 24 * ui, area.y + 10 * ui, 48 * ui, THEME.pink, 5 * ui);
    text(this, cx, area.y + 28 * ui, done ? 'You found the whole family!' : `Find the family: tap the ${members} words with these letters`, { ...T.small(this, done ? THEME.successDark : THEME.ink2), wordWrap: { width: area.w - 32 } });
    text(this, cx, area.y + 62 * ui, f.letters, T.at(this, 34, THEME.pink, { fontStyle: '700' }));
    const cw = Math.min((area.w - 40 - gap) / 2, 220 * ui);
    const made = f.words.map((x, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const bx = cx + (col === 0 ? -1 : 1) * (cw / 2 + gap / 2), by = area.y + 96 * ui + row * (chipH + gap) + chipH / 2;
      const found = f.found.includes(x.word), wrong = f.wrong.includes(x.word);
      const variant = found ? 'success' : wrong ? 'danger' : 'secondary';
      const b = button(this, bx, by, cw, chipH, x.word, { variant, fontSize: 20, onClick: () => this.tapFamily(x) });
      if (wrong) b.setAlpha(0.5);
      return b;
    });
    enter(this, k, { from: 'up', distance: 12 });
    enter(this, made, { from: 'pop', stagger: 40 });
    const by = area.y + cardH + 30 * ui, bw = Math.min((area.w - 20) / 2, 220 * ui);
    if (canSpeak()) button(this, cx - bw / 2 - 6, by, bw, 48 * ui, '🔊 Say it', { variant: 'secondary', onClick: () => this.sayFamily() });
    button(this, canSpeak() ? cx + bw / 2 + 6 : cx, by, bw, 48 * ui, done ? 'Next ▶' : 'Skip ▶', { variant: done ? 'primary' : 'ghost', onClick: () => this.advance() });
  }

  tapFamily(x) {
    const f = this.state.family;
    if (!f || f.found.includes(x.word) || f.wrong.includes(x.word)) return;
    if (canSpeak()) speak(x.word, { rate: this.speechRate });
    if (x.member) { f.found.push(x.word); if (this.familyDone()) Sfx.correct(); else Sfx.pop(); }
    else { f.wrong.push(x.word); Sfx.wrong(); }
    this.rebuild();
  }

  // ---- Look, Say, Cover, Write, Check ------------------------------------------------------------------

  typing() { const s = this.state; return (s.step === 'copy' && s.result !== 'right') || (s.step === 'cover' && s.cover === 'write'); }

  /** Look at it and say it; cover it and write it from memory; check it against the word, letter by letter. */
  buildCover(area, e) {
    const { ui } = this, s = this.state;
    const cx = area.x + area.w / 2;
    const gap = 6 * ui, size = fitTile(Math.max(e.word.length, s.typed.length), area.w - 40, gap, 44 * ui, 16 * ui);
    const rowsH = s.cover === 'check' ? size * 2 + 14 * ui : size;
    const cardH = Math.min(area.h * 0.58, 92 * ui + rowsH + (s.cover === 'look' && this.hasTrickLine(e) ? 40 : 20) * ui);
    const k = card(this, cx, area.y + cardH / 2, area.w, cardH);
    stripe(this, cx - 24 * ui, area.y + 10 * ui, 48 * ui, THEME.subjects.words.accent, 5 * ui);
    // The five parts, lit as the child goes: Look + Say, then Cover + Write, then Check.
    const lit = s.cover === 'look' ? [0, 1] : s.cover === 'write' ? [2, 3] : [4];
    const pw = Math.min(78 * ui, (area.w - 40 - 44 * ui) / 5 - 4 * ui), ph = 24 * ui, chipsX = cx - 22 * ui;   // clear of the speaker on the right
    LSCWC.forEach((label, i) => {
      const on = lit.includes(i), past = i < lit[0];
      chip(this, chipsX + (i - 2) * (pw + 4 * ui), area.y + 26 * ui, { text: (past ? '✓ ' : '') + label, originX: 0.5, color: on ? THEME.subjects.words.accent : past ? THEME.successSoft : THEME.sunken, textColor: on ? THEME.onAccent : past ? THEME.successDark : THEME.ink3, fontSize: 12, height: ph, shadow: 'none' });
    });
    const marks = s.cover === 'check' ? markSpelling(s.typed, e.word) : null;
    const msg = s.cover === 'look' ? 'Look at the word and say it out loud.'
      : s.cover === 'write' ? 'It is covered. Write it from memory.'
        : marks.right ? '🧠 You remembered it!' : marks.caseOnly ? 'Nearly! Check the capital letters.' : 'Check the red letters, then look again.';
    text(this, cx, area.y + 54 * ui, msg, { ...T.small(this, s.cover === 'check' ? (marks.right ? THEME.successDark : THEME.danger) : THEME.ink2), wordWrap: { width: area.w - 32 }, align: 'center' });
    const rowY = area.y + 78 * ui + size / 2;
    if (s.cover === 'look') {
      this.wordTiles = letterRow(this, { cx, cy: rowY, letters: this.wordLetters(e), size, gap });
      this.trickLine(cx, rowY + size / 2 + 18 * ui, area.w - 32, e);
    } else if (s.cover === 'write') {
      // The covered word: one tile per letter typed so far (no letters given away).
      const n = Math.max(e.word.length, s.typed.length);
      this.wordTiles = letterRow(this, { cx, cy: rowY, letters: Array.from({ length: n }, (_, i) => ({ ch: s.typed[i] || '', look: s.typed[i] ? 'typed' : 'blank' })), size, gap });
    } else {
      letterRow(this, { cx, cy: rowY, letters: this.wordLetters(e), size, gap });
      this.wordTiles = letterRow(this, { cx, cy: rowY + size + 14 * ui, letters: marks.marks.map((m) => ({ ch: m.ch, look: m.ok ? 'ok' : m.missing ? 'missing' : m.wrongCase ? 'case' : 'bad' })), size, gap });
    }
    if (canSpeak()) iconButton(this, area.x + area.w - 30 * ui, area.y + 26 * ui, 36 * ui, '🔊', { variant: 'ghost', onClick: () => this.sayCurrent() });
    enter(this, k, { from: 'up', distance: 12 });
    const by = area.y + cardH + 30 * ui, bw = Math.min((area.w - 20) / 2, 220 * ui);
    if (s.cover === 'look') {
      if (canSpeak()) button(this, cx - bw / 2 - 6, by, bw, 48 * ui, '🔊 Say it with me', { variant: 'secondary', onClick: () => this.sayCurrent() });
      button(this, canSpeak() ? cx + bw / 2 + 6 : cx, by, bw, 48 * ui, 'Cover it ▶', { variant: 'primary', onClick: () => this.coverIt() });
      return;
    }
    if (s.cover === 'write') {
      letterKeyboard(this, { x: area.x, y: area.y + cardH + 12, w: area.w, h: area.h - cardH - 12 }, { onKey: (ch) => this.type(ch), onCheck: () => this.checkCover(), onShift: () => this.type('⇧'), shift: s.shift, ready: s.typed.length > 0, ui });
      return;
    }
    const last = s.idx + 1 >= s.words.length;
    if (marks.right) { button(this, cx, by, Math.min(area.w - 40, 240 * ui), 48 * ui, last ? 'Ready for the test ▶' : 'Next word ▶', { variant: 'primary', onClick: () => this.advance() }); return; }
    button(this, s.coverTries >= COVER_TRIES ? cx - bw / 2 - 6 : cx, by, bw, 48 * ui, '👀 Look again', { variant: 'primary', onClick: () => this.lookAgain() });
    if (s.coverTries >= COVER_TRIES) button(this, cx + bw / 2 + 6, by, bw, 48 * ui, last ? 'Ready for the test ▶' : 'Next word ▶', { variant: 'ghost', onClick: () => this.advance() });
  }

  coverIt() { const s = this.state; if (s.step !== 'cover' || s.cover !== 'look') return; stopSpeech(); Sfx.click(); s.cover = 'write'; s.typed = ''; s.shift = false; this.rebuild(); }
  lookAgain() { const s = this.state; if (s.step !== 'cover') return; Sfx.click(); s.cover = 'look'; s.typed = ''; this.rebuild(); this.sayCurrent(); }

  /** Check the word written from memory. The first try counts as real practice (a miss remembers its letters). */
  checkCover() {
    const s = this.state, e = this.entry;
    if (s.step !== 'cover' || s.cover !== 'write' || !s.typed) return;
    const right = s.typed === e.word;
    s.coverTries += 1; s.cover = 'check'; s.result = right ? 'right' : 'wrong';
    if (s.coverTries === 1) { const typed = s.typed; Store.updateProfile((p) => recordSpelling(p, e.word, right, 'cover', typed)); }
    if (right) {
      Sfx.correct(); s.remembered += 1; if (canSpeak()) speak(e.word, { rate: this.speechRate });
      this.rebuild();
      this.time.delayedCall(1300, () => { if (s.step === 'cover' && s.cover === 'check' && s.result === 'right') this.advance(); });
    } else { Sfx.wrong(); this.cameras.main.shake(120, 0.004); this.rebuild(); }
  }

  buildReady() {
    const { w, ui } = this, s = this.state;
    const cx = w / 2;
    const k = card(this, cx, this.h / 2 + 10 * ui, Math.min(w - 28, 420 * ui), 300 * ui);
    text(this, cx, this.h / 2 - 80 * ui, '🐝', { fontSize: Math.round(44 * ui) + 'px' });
    text(this, cx, this.h / 2 - 32 * ui, `You have learned ${s.words.length} ${s.words.length === 1 ? 'word' : 'words'}!`, T.heading(this));
    text(this, cx, this.h / 2 - 6 * ui, `🍯 ${s.honey} honey collected${s.remembered ? `   🧠 ${s.remembered} remembered from memory` : ''}`, T.small(this, THEME.warningDark));
    text(this, cx, this.h / 2 + 18 * ui, 'Ready to be tested? The words will hide this time.', { ...T.small(this, THEME.ink2), wordWrap: { width: Math.min(w - 60, 380 * ui) } });
    button(this, cx, this.h / 2 + 70 * ui, Math.min(w - 60, 260 * ui), 50 * ui, 'Start the test ▶', { variant: 'primary', onClick: () => this.startTest() });
    button(this, cx, this.h / 2 + 126 * ui, Math.min(w - 60, 200 * ui), 38 * ui, 'Back to the lists', { variant: 'ghost', fontSize: 14, onClick: () => this.quit() });
    enter(this, k, { from: 'pop' });
  }

  startTest() { stopSpeech(); this.scene.start(SCENES.SpellingGame, { listId: this.listId, words: this.customWords, listKind: this.listKind, title: this.listTitle, grade: this.grade }); }
  quit() { stopSpeech(); this.scene.start(SCENES.Spelling, { grade: this.grade }); }
}
