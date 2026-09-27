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
import { enter, shake } from '../ui/motion.js';
import { Sfx } from '../systems/Audio.js';
import { speak, stop as stopSpeech, rateFor, canSpeak } from '../systems/Speech.js';
import { safeArea, pointerPos } from '../systems/Layout.js';
import { Rng } from '../systems/Rng.js';
import { getList, listWords } from '../data/spelling/lists.js';
import { findPatterns } from '../data/spelling/patterns.js';
import { markSpelling, recordTaught } from '../systems/Spelling.js';
import { letterRow, fitTile, chunkChips, letterKeyboard, keyFromEvent, CHUNK_COLOURS } from '../ui/SpellingWidgets.js';

const STEPS = ['card', 'trace', 'build', 'copy'];
const STEP_TITLE = { card: 'Look and listen', trace: 'Trace the word with your finger', build: 'Build it from the chunks', copy: 'Now copy it' };
const TRACE_HITS = 6;   // ink samples a letter needs before it counts as traced

/**
 * Teaching before the test. First the spelling patterns the list shares (ea, tion, doubled letters…), one card
 * each with the letters lit up inside the words. Then every word: a flash card that shows it in colour-coded
 * syllable chunks and sounds it out with its sentence; tracing it with a finger; building it from shuffled
 * chunks; and copying it while it stays on screen. Then the test (SpellingGameScene).
 */
export class SpellingLearnScene extends BaseScene {
  constructor() { super(SCENES.SpellingLearn); this.fade = true; }

  init(data) {
    this.listId = data.listId;
    this.grade = data.grade || null;
    this.customWords = data.words || null;
    const list = data.words ? { id: 'tricky', title: 'Tricky words', words: data.words } : getList(data.listId);
    this.list = list || { id: 'none', title: 'Spelling', words: [] };
    this.rng = new Rng();
    const words = listWords(this.list).map((e) => ({ word: e.w, chunks: e.syl.split('-').filter(Boolean), sentence: e.s }));
    const patterns = findPatterns(words.map((w) => w.word));
    this.state = { stage: patterns.length ? 'patterns' : 'words', patterns, pIdx: 0, words, idx: 0, step: 'card', typed: '', result: null, placed: [], order: [], strokes: [], traced: {}, done: false, tries: 0 };
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
  enterKey() { const s = this.state; return s.done ? 'done' : s.stage === 'patterns' ? `p${s.pIdx}` : `${s.idx}-${s.step}`; }
  get speechRate() { return rateFor(Store.getProfile()?.grade); }

  /** Shuffled chunk order for the build step (never the right order when there is more than one chunk). */
  prepare() {
    const s = this.state, e = this.entry;
    if (!e) return;
    const ids = e.chunks.map((_, i) => i);
    let order = this.rng.shuffle(ids);
    if (ids.length > 1) for (let g = 0; g < 10 && order.every((v, i) => v === i); g++) order = this.rng.shuffle(ids);
    if (ids.length > 1 && order.every((v, i) => v === i)) order = [...ids.slice(1), ids[0]];
    s.order = order; s.placed = []; s.typed = ''; s.result = null; s.tries = 0; s.strokes = []; s.traced = {};
  }

  /** Read out whatever is on screen: the pattern with its words, or the word, its chunks and its sentence. */
  sayCurrent() {
    const s = this.state;
    if (!canSpeak()) return;
    if (s.stage === 'patterns') {
      const p = this.pattern;
      if (p) speak(`${[...p.letters].join(', ')}. As in ${p.words.map((h) => h.word).join(', ')}.`, { rate: Math.max(0.7, this.speechRate - 0.15) });
      return;
    }
    const e = this.entry;
    if (!e) return;
    const chunks = e.chunks.length > 1 ? e.chunks.join(', ') + '. ' : '';
    speak(`${e.word}. ${chunks}${e.word}.${e.sentence ? ' ' + e.sentence : ''}`, { rate: Math.max(0.7, this.speechRate - 0.15) });
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
    new ProgressBar(this, w / 2, sa.top + 60 * ui, w - 32, 6 * ui, { value: at / Math.max(1, total), color: THEME.subjects.words.accent });
    const area = { x: 14 + sa.left, y: sa.top + 76 * ui, w: w - 28 - sa.left - sa.right, h: h - sa.top - 76 * ui - 14 - sa.bottom };
    if (s.stage === 'patterns') return this.buildPattern(area, this.pattern);
    const e = this.entry;
    if (!e) return this.buildReady();
    if (s.step === 'card') this.buildCard(area, e);
    else if (s.step === 'trace') this.buildTrace(area, e);
    else if (s.step === 'build') this.buildChunks(area, e);
    else this.buildCopy(area, e);
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
    text(this, cx, area.y + 58 * ui, p.letters.toUpperCase(), T.at(this, 34, colour, { fontStyle: '700' }));
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

  /** The flash card: the word in chunk colours, the chunk chips, the sound button. */
  buildCard(area, e) {
    const { ui } = this;
    const cx = area.x + area.w / 2;
    const gap = 6 * ui, size = fitTile(e.word.length, area.w - 40, gap, 52 * ui, 18 * ui);
    const cardH = Math.min(area.h - 70 * ui, 44 * ui + size + 96 * ui);
    const k = card(this, cx, area.y + cardH / 2, area.w, cardH);
    stripe(this, cx - 24 * ui, area.y + 10 * ui, 48 * ui, THEME.subjects.words.accent, 5 * ui);
    text(this, cx, area.y + 28 * ui, STEP_TITLE.card, T.small(this, THEME.ink2));
    // Letters take the colour of their chunk so the chunks can be seen inside the word.
    const letters = [];
    e.chunks.forEach((c, ci) => { for (const ch of c) letters.push({ ch, look: 'shown', colour: hex(CHUNK_COLOURS[ci % CHUNK_COLOURS.length]) }); });
    const tiles = letterRow(this, { cx, cy: area.y + 44 * ui + size / 2, letters, size, gap });
    enter(this, tiles, { from: 'pop', stagger: 40 });
    if (e.chunks.length > 1) chunkChips(this, { cx, cy: area.y + 44 * ui + size + 34 * ui, chunks: e.chunks, ui, maxW: area.w - 32 });
    else text(this, cx, area.y + 44 * ui + size + 34 * ui, 'One chunk: say it slowly and listen to each sound.', T.small(this, THEME.ink3));
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
    this.traceLabel = text(this, cx, area.y + 28 * ui, done ? 'Beautiful tracing!' : `${STEP_TITLE.trace}  ·  ${tracedN} of ${n} letters`, T.small(this, done ? THEME.successDark : THEME.ink2));
    const x0 = cx - (letterW * n) / 2, ly = area.y + 44 * ui + fontPx / 2;
    this.traceRects = [];
    [...e.word].forEach((ch, i) => {
      const lx = x0 + i * letterW + letterW / 2;
      const traced = (s.traced[i] | 0) >= TRACE_HITS;
      this.add.text(lx, ly, ch.toUpperCase(), { fontFamily: FONT, fontSize: fontPx + 'px', color: hex(traced ? THEME.success : THEME.ink3), fontStyle: WEIGHT.heavy }).setOrigin(0.5).setAlpha(traced ? 0.55 : 0.3);
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
    text(this, cx, area.y + 28 * ui, s.result === 'right' ? 'That is the word!' : STEP_TITLE.build, T.small(this, s.result === 'right' ? THEME.successDark : THEME.ink2));
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
      if (s.placed.length === e.chunks.length) { s.result = 'right'; Sfx.correct(); if (canSpeak()) speak(e.word, { rate: this.speechRate }); this.rebuild(); this.time.delayedCall(1000, () => { if (s.step === 'build' && s.result === 'right') this.advance(); }); return; }
      this.rebuild();
      return;
    }
    Sfx.wrong();
    if (canSpeak()) speak(e.chunks[s.placed.length], { rate: this.speechRate });
    if (this.wordTiles && this.wordTiles[0]) shake(this, this.wordTiles[0], 4);
  }

  /** Copy it: the word (with chunks) stays on screen and is typed underneath. */
  buildCopy(area, e) {
    const { ui } = this, s = this.state;
    const cx = area.x + area.w / 2;
    const gap = 6 * ui, size = fitTile(Math.max(e.word.length, s.typed.length), area.w - 40, gap, 40 * ui, 16 * ui);
    const cardH = Math.min(area.h * 0.5, 44 * ui + size * 2 + 60 * ui);
    const k = card(this, cx, area.y + cardH / 2, area.w, cardH);
    stripe(this, cx - 24 * ui, area.y + 10 * ui, 48 * ui, THEME.subjects.words.accent, 5 * ui);
    const msg = s.result === 'right' ? 'Copied perfectly!' : s.result === 'wrong' ? 'Look at the red letters and try again' : STEP_TITLE.copy;
    text(this, cx, area.y + 28 * ui, msg, T.small(this, s.result === 'right' ? THEME.successDark : s.result === 'wrong' ? THEME.danger : THEME.ink2));
    const shown = [];
    e.chunks.forEach((c, ci) => { for (const ch of c) shown.push({ ch, look: 'shown', colour: hex(CHUNK_COLOURS[ci % CHUNK_COLOURS.length]) }); });
    letterRow(this, { cx, cy: area.y + 44 * ui + size / 2, letters: shown, size, gap });
    let typedLetters;
    if (s.result) typedLetters = markSpelling(s.typed, e.word).marks.map((m) => ({ ch: m.ch, look: m.ok ? 'ok' : m.missing ? 'missing' : 'bad' }));
    else typedLetters = Array.from({ length: Math.max(e.word.length, s.typed.length) }, (_, i) => ({ ch: s.typed[i] || '', look: s.typed[i] ? 'typed' : 'blank' }));
    this.wordTiles = letterRow(this, { cx, cy: area.y + 44 * ui + size * 1.5 + 14 * ui, letters: typedLetters, size, gap });
    if (canSpeak()) iconButton(this, area.x + area.w - 30 * ui, area.y + 28 * ui, 40 * ui, '🔊', { variant: 'ghost', onClick: () => this.sayCurrent() });
    enter(this, k, { from: 'up', distance: 12 });
    if (s.result === 'right') { button(this, cx, area.y + cardH + 30 * ui, Math.min(area.w - 40, 240 * ui), 48 * ui, s.idx + 1 >= s.words.length ? 'Ready for the test ▶' : 'Next word ▶', { variant: 'primary', onClick: () => this.advance() }); return; }
    letterKeyboard(this, { x: area.x, y: area.y + cardH + 12, w: area.w, h: area.h - cardH - 12 }, { onKey: (ch) => this.type(ch), onCheck: () => this.checkCopy(), ready: s.typed.length > 0, ui });
  }

  type(ch) {
    const s = this.state, e = this.entry;
    if (s.step !== 'copy' || s.result === 'right') return;
    if (s.result === 'wrong') { s.result = null; s.typed = ''; }
    if (ch === '⌫') { if (!s.typed) return; s.typed = s.typed.slice(0, -1); }
    else { if (s.typed.length >= e.word.length + 3) return; s.typed += ch; }
    Sfx.pop();
    this.rebuild();
  }

  checkCopy() {
    const s = this.state, e = this.entry;
    if (s.step !== 'copy' || !s.typed || s.result === 'right') return;
    const right = s.typed.toLowerCase() === e.word;
    s.result = right ? 'right' : 'wrong'; s.tries += 1;
    if (right) { Sfx.correct(); Store.updateProfile((p) => recordTaught(p, e.word)); if (canSpeak()) speak(e.word, { rate: this.speechRate }); }
    else { Sfx.wrong(); this.cameras.main.shake(120, 0.004); }
    this.rebuild();
    if (right) this.time.delayedCall(1000, () => { if (s.step === 'copy' && s.result === 'right') this.advance(); });
  }

  keyDown(e) {
    const s = this.state;
    if (s.done) return;
    const k = keyFromEvent(e);
    if (s.stage === 'patterns' || s.step === 'card' || s.step === 'trace') { if (k === 'Enter') this.advance(); return; }
    if (s.step === 'build') return;
    if (k === 'Enter') return this.checkCopy();
    if (k) this.type(k);
  }

  /** Pattern cards → for each word: card → trace → build (skipped for one-chunk words) → copy → the test. */
  advance() {
    const s = this.state;
    stopSpeech();
    if (s.stage === 'patterns') {
      s.pIdx += 1;
      if (s.pIdx >= s.patterns.length) { s.stage = 'words'; s.pIdx = 0; }
      this.rebuild(); this.sayCurrent();
      return;
    }
    const e = this.entry;
    if (s.step === 'card') { s.step = 'trace'; s.strokes = []; s.traced = {}; this.rebuild(); return; }
    if (s.step === 'trace') { s.step = e.chunks.length > 1 ? 'build' : 'copy'; s.result = null; this.rebuild(); return; }
    if (s.step === 'build') { s.step = 'copy'; s.typed = ''; s.result = null; this.rebuild(); return; }
    s.idx += 1;
    if (s.idx >= s.words.length) { s.done = true; Sfx.fanfare(); this.rebuild(); return; }
    s.step = 'card';
    this.prepare();
    this.rebuild();
    this.sayCurrent();
  }

  buildReady() {
    const { w, ui } = this, s = this.state;
    const cx = w / 2;
    const k = card(this, cx, this.h / 2 + 10 * ui, Math.min(w - 28, 420 * ui), 280 * ui);
    text(this, cx, this.h / 2 - 70 * ui, '🐝', { fontSize: Math.round(44 * ui) + 'px' });
    text(this, cx, this.h / 2 - 20 * ui, `You have learned ${s.words.length} ${s.words.length === 1 ? 'word' : 'words'}!`, T.heading(this));
    text(this, cx, this.h / 2 + 10 * ui, 'Ready to be tested? The words will hide this time.', { ...T.small(this, THEME.ink2), wordWrap: { width: Math.min(w - 60, 380 * ui) } });
    button(this, cx, this.h / 2 + 62 * ui, Math.min(w - 60, 260 * ui), 50 * ui, 'Start the test ▶', { variant: 'primary', onClick: () => this.startTest() });
    button(this, cx, this.h / 2 + 118 * ui, Math.min(w - 60, 200 * ui), 38 * ui, 'Back to the lists', { variant: 'ghost', fontSize: 14, onClick: () => this.quit() });
    enter(this, k, { from: 'pop' });
  }

  startTest() { stopSpeech(); this.scene.start(SCENES.SpellingGame, { listId: this.listId, words: this.customWords, grade: this.grade }); }
  quit() { stopSpeech(); this.scene.start(SCENES.Spelling, { grade: this.grade }); }
}
