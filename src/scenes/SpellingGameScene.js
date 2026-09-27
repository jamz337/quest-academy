import { BaseScene } from './BaseScene.js';
import { SCENES } from '../constants.js';
import { THEME } from '../ui/theme.js';
import * as Store from '../systems/Store.js';
import * as Cloud from '../systems/Cloud.js';
import { T, text } from '../ui/TextStyles.js';
import { background, stripe } from '../ui/Panel.js';
import { card } from '../ui/Card.js';
import { chip } from '../ui/Chip.js';
import { button, iconButton } from '../ui/Button.js';
import { modal } from '../ui/Modal.js';
import { StarRow } from '../ui/StarRow.js';
import { ProgressBar } from '../ui/ProgressBar.js';
import { enter, shake } from '../ui/motion.js';
import { letterRow, letterKeyboard, keyFromEvent } from '../ui/SpellingWidgets.js';
import { fireworks } from '../ui/Fireworks.js';
import { Sfx } from '../systems/Audio.js';
import { speak, stop as stopSpeech, rateFor, canSpeak } from '../systems/Speech.js';
import { safeArea } from '../systems/Layout.js';
import { Rng } from '../systems/Rng.js';
import { getList, listWords } from '../data/spelling/lists.js';
import { planSession, markSpelling, recordSpelling, finishSession, recordTest } from '../systems/Spelling.js';

const LOOK_MS = 3500;   // how long a "look" word stays before it hides

/**
 * One spelling session: 10 words from a list. New words are shown and read, then hidden and typed back;
 * seen words come with a few letters missing; nearly-learned words are spelled from hearing alone.
 * Letters are typed on an on-screen keyboard (or a real one) and marked letter by letter.
 */
export class SpellingGameScene extends BaseScene {
  constructor() { super(SCENES.SpellingGame); this.fade = true; }

  init(data) {
    this.listId = data.listId;
    this.grade = data.grade || null;
    const list = data.words ? { id: 'tricky', title: 'Tricky words', words: data.words } : getList(data.listId);
    this.list = list || { id: 'none', title: 'Spelling', words: [] };
    const rng = new Rng();
    // The weekly test: every word of the list, from hearing alone, no hints and nothing revealed until the end.
    this.testMode = !!data.test;
    const rounds = this.testMode
      ? rng.shuffle(listWords(this.list)).map((e) => ({ word: e.w, syllables: e.syl, sentence: e.s, mode: 'listen', blanks: [] }))
      : planSession(Store.getProfile() || {}, this.list, () => rng.float());
    this.state = { rounds, idx: 0, typed: '', phase: rounds.length && rounds[0].mode === 'look' ? 'show' : 'type', right: null, correct: 0, results: [], done: false, reward: null };
    this.startedAt = Date.now();
  }

  create(data) {
    super.create(data);
    this.scene.bringToTop();
    const kb = this.input && this.input.keyboard;
    if (kb && typeof kb.on === 'function') {
      this.onKey = (e) => this.keyDown(e);
      kb.on('keydown', this.onKey);
      this.events.once('shutdown', () => { kb.off('keydown', this.onKey); stopSpeech(); });
    }
    this.startRound();
  }

  get round() { return this.state.rounds[this.state.idx]; }
  enterKey() { const s = this.state; return s.done ? 'done' : `${s.idx}-${s.phase}`; }
  get speechRate() { return rateFor(Store.getProfile()?.grade); }

  /** What the player must type: the whole word, or just the missing letters in a fill round. */
  target() { const r = this.round; return r.mode === 'fill' ? r.blanks.map((i) => r.word[i]).join('') : r.word; }

  /** Say the word (and its sentence), for the round's start and the hear-again button. */
  say(withSentence = true) {
    const r = this.round;
    if (!r || !canSpeak()) return;
    const parts = [r.word];
    if (withSentence && r.sentence) parts.push(r.sentence);
    speak(parts.join('. '), { rate: this.speechRate });
  }

  startRound() {
    const s = this.state, r = this.round;
    if (!r) return;
    this.say(true);
    if (s.phase === 'show') {
      const idx = s.idx;
      this.time.delayedCall(LOOK_MS, () => { if (s.idx === idx && s.phase === 'show') this.hideWord(); });
    }
  }

  hideWord() { const s = this.state; if (s.phase !== 'show') return; s.phase = 'type'; s.typed = ''; this.rebuild(); }

  build() {
    const { w, h, ui } = this;
    const s = this.state;
    background(this, { accent: THEME.subjects.words.accent, accent2: THEME.gold, dots: false });
    if (s.done) return this.buildSummary();
    const r = this.round;
    if (!r) return;
    const sa = safeArea();
    const cy = sa.top + 28 * ui + 2;
    iconButton(this, 12 + sa.left + 22 * ui, cy, 44 * ui, '←', { onClick: () => this.quit() });
    text(this, w / 2, cy, this.list.title, T.heading(this));
    chip(this, w - 12 - sa.right, cy, { text: `${s.idx + 1} / ${s.rounds.length}`, originX: 1, color: THEME.subjects.words.soft, textColor: THEME.subjects.words.dark, shadow: 'none' });
    new ProgressBar(this, w / 2, sa.top + 60 * ui, w - 32, 6 * ui, { value: s.idx / s.rounds.length, color: THEME.subjects.words.accent });
    const area = { x: 14 + sa.left, y: sa.top + 76 * ui, w: w - 28 - sa.left - sa.right, h: h - sa.top - 76 * ui - 14 - sa.bottom };

    // The word card: shown, hidden, with blanks, or marked. Its height follows the tile row it has to hold
    // (hint line, tiles, then the syllables or the correct spelling), so short landscape windows still fit.
    const tileSize = this.tileSize(area);
    const cardH = Math.min(area.h * 0.5, Math.max(44 * ui + tileSize + 56 * ui, Math.min(area.h * 0.36, 200 * ui)));
    const k = card(this, area.x + area.w / 2, area.y + cardH / 2, area.w, cardH);
    stripe(this, area.x + area.w / 2 - 24 * ui, area.y + 10 * ui, 48 * ui, THEME.subjects.words.accent, 5 * ui);
    const hint = this.testMode ? 'Weekly test: listen, then spell the word' : { look: 'Look carefully, then spell it when it hides', fill: 'Fill in the missing letters', listen: 'Listen, then spell the word' }[r.mode];
    text(this, area.x + area.w / 2, area.y + 28 * ui, s.phase === 'result' ? (this.testMode ? 'Saved. Next word…' : s.right ? 'Spot on!' : 'Not quite. Look at the red letters.') : hint, T.small(this, s.phase === 'result' && !this.testMode ? (s.right ? THEME.successDark : THEME.danger) : THEME.ink2));
    if (canSpeak()) iconButton(this, area.x + area.w - 30 * ui, area.y + 28 * ui, 40 * ui, '🔊', { variant: 'ghost', onClick: () => this.say(true) });
    this.drawWord(area, cardH);
    enter(this, k, { from: 'up', distance: 12 });

    if (s.phase === 'show') {
      button(this, area.x + area.w / 2, area.y + cardH + 34 * ui, Math.min(area.w - 40, 240 * ui), 48 * ui, "I've got it!", { variant: 'primary', onClick: () => { Sfx.click(); this.hideWord(); } });
      return;
    }
    if (s.phase === 'result') {
      const last = s.idx + 1 >= s.rounds.length;
      button(this, area.x + area.w / 2, area.y + cardH + 34 * ui, Math.min(area.w - 40, 240 * ui), 48 * ui, last ? 'Finish' : 'Next ▶', { variant: 'primary', onClick: () => this.next() });
      return;
    }
    this.drawKeyboard({ x: area.x, y: area.y + cardH + 12, w: area.w, h: area.h - cardH - 12 });
  }

  /** Letter tile size for the current word: fits the card width, and never taller than a short screen allows. */
  tileSize(area) {
    const r = this.round, ui = this.ui;
    const n = Math.max(r.word.length, this.state.typed.length, 1), gap = 6 * ui;
    const byWidth = (area.w - 40 - gap * (n - 1)) / n;
    const byHeight = Math.min(area.h * 0.5, 200 * ui) - 44 * ui - 56 * ui;
    return Math.max(18 * ui, Math.min(44 * ui, byWidth, byHeight));
  }

  /** The word as letter tiles: full (show), blanks and typed letters (fill/listen), or marked (result). */
  drawWord(area, cardH) {
    const s = this.state, r = this.round, ui = this.ui;
    const cx = area.x + area.w / 2;
    let letters;
    if (s.phase === 'show') letters = [...r.word].map((ch) => ({ ch, look: 'shown' }));
    else if (s.phase === 'result' && this.testMode) letters = [...s.typed].map((ch) => ({ ch, look: 'typed' }));
    else if (s.phase === 'result') {
      const { marks } = markSpelling(r.mode === 'fill' ? this.filled() : s.typed, r.word);
      letters = marks.map((m) => ({ ch: m.ch, look: m.ok ? 'ok' : m.missing ? 'missing' : 'bad' }));
    } else if (r.mode === 'fill') {
      let t = 0;
      letters = [...r.word].map((ch, i) => (r.blanks.includes(i) ? { ch: s.typed[t++] || '', look: s.typed[t - 1] ? 'typed' : 'blank' } : { ch, look: 'shown' }));
    } else {
      const n = Math.max(r.word.length, s.typed.length);
      letters = Array.from({ length: n }, (_, i) => ({ ch: s.typed[i] || '', look: s.typed[i] ? 'typed' : 'blank' }));
    }
    const gap = 6 * ui, size = this.tileSize(area);
    const cy = area.y + 44 * ui + size / 2;   // under the hint line; the extra lines go beneath the tiles
    this.wordTiles = letterRow(this, { cx, cy, letters, size, gap });
    const below = cy + size / 2 + 16 * ui;
    if (s.phase === 'result' && !s.right && !this.testMode) {
      text(this, cx, below, `It is spelt  ${r.word.toUpperCase()}`, T.at(this, 15, THEME.ink, { fontStyle: '700' }));
    }
    // Syllables help the word stick: shown under it while it is on screen, and again after a miss.
    const syl = r.syllables && r.syllables.includes('-') ? r.syllables.split('-').join(' · ') : null;
    if (syl && !this.testMode && (s.phase === 'show' || (s.phase === 'result' && !s.right))) {
      text(this, cx, below + (s.phase === 'show' ? 0 : 20 * ui), syl, T.at(this, 14, THEME.subjects.words.dark, { fontStyle: '600' }));
    }
  }

  /** On-screen keyboard (shared with the teaching screen) and the Check button. */
  drawKeyboard(rect) {
    const s = this.state, r = this.round;
    const ready = s.typed.length >= (r.mode === 'fill' ? this.target().length : 1);
    this.checkButton = letterKeyboard(this, rect, { onKey: (ch) => this.type(ch), onCheck: () => this.check(), ready, ui: this.ui }).check;
  }

  /** The whole word with the typed letters dropped into the blanks (fill rounds). */
  filled() {
    const r = this.round, s = this.state;
    let t = 0;
    return [...r.word].map((ch, i) => (r.blanks.includes(i) ? (s.typed[t++] || '_') : ch)).join('');
  }

  type(ch) {
    const s = this.state, r = this.round;
    if (s.phase !== 'type') return;
    if (ch === '⌫') { if (!s.typed) return; s.typed = s.typed.slice(0, -1); }
    else {
      const max = r.mode === 'fill' ? r.blanks.length : Math.max(r.word.length + 3, 12);
      if (s.typed.length >= max) return;
      s.typed += ch;
    }
    Sfx.pop();
    this.rebuild();
  }

  keyDown(e) {
    const s = this.state;
    if (s.done) return;
    const k = keyFromEvent(e);
    if (s.phase === 'show' && (k === 'Enter' || e.key === ' ')) return this.hideWord();
    if (s.phase === 'result' && k === 'Enter') return this.next();
    if (s.phase !== 'type' || !k) return;
    if (k === 'Enter') return this.check();
    this.type(k);
  }

  check() {
    const s = this.state, r = this.round;
    if (s.phase !== 'type' || !s.typed) return;
    const answer = r.mode === 'fill' ? this.filled() : s.typed;
    const right = answer === r.word;
    s.phase = 'result'; s.right = right;
    if (right) s.correct += 1;
    s.results.push({ word: r.word, right, typed: answer });
    Store.updateProfile((p) => recordSpelling(p, r.word, right, r.mode));
    if (this.testMode) {
      // In the test nothing is marked on screen: a click, and on to the next word. The summary shows the results.
      Sfx.click();
      this.rebuild();
      const idx = s.idx;
      this.time.delayedCall(500, () => { if (s.idx === idx && s.phase === 'result') this.next(); });
      return;
    }
    if (right) { Sfx.correct(); this.say(false); } else { Sfx.wrong(); this.cameras.main.shake(120, 0.004); }
    this.rebuild();
    if (!right && this.wordTiles) shake(this, this.wordTiles[0], 4);
    if (!right) this.time.delayedCall(600, () => this.say(false));
    if (right) { const idx = s.idx; this.time.delayedCall(1100, () => { if (s.idx === idx && s.phase === 'result') this.next(); }); }
  }

  next() {
    const s = this.state;
    if (s.phase !== 'result') return;
    s.idx += 1; s.typed = ''; s.right = null;
    if (s.idx >= s.rounds.length) return this.finishAll();
    s.phase = this.round.mode === 'look' ? 'show' : 'type';
    this.rebuild();
    this.startRound();
  }

  finishAll() {
    const s = this.state;
    let reward = null;
    Store.updateProfile((p) => { reward = finishSession(p, this.list.id, s.correct, s.rounds.length); if (this.testMode) recordTest(p, this.list.id, s.correct, s.rounds.length); });
    s.reward = reward; s.done = true;
    const p = Store.getProfile();
    if (p && reward) Cloud.postResult(p, { gameId: this.testMode ? 'spelling-test' : 'spelling', band: null }, { stars: reward.stars, correct: s.correct, total: s.rounds.length, xp: reward.xp, coins: reward.coins, timeMs: Date.now() - this.startedAt, missedSkills: s.correct < s.rounds.length ? ['spelling'] : [] });
    if (reward && reward.stars >= 2) Sfx.fanfare(); else Sfx.correct();
    this.rebuild();
    if (reward && reward.stars >= 1) this.time.delayedCall(400, () => fireworks(this, this.w / 2, this.h * 0.25, { bursts: 1 + reward.stars, spread: this.w * 0.3 }));
  }

  buildSummary() {
    const { w, ui } = this;
    const s = this.state, r = s.reward || { coins: 0, xp: 0, stars: 0 };
    const rows = Math.min(s.results.length, 10);
    const title = this.testMode ? `Weekly test: ${s.correct} of ${s.rounds.length}` : `${this.list.title}: ${s.correct} of ${s.rounds.length}`;
    const m = modal(this, { w: 440 * ui, h: (250 + rows * 24 + (this.testMode ? 22 : 0)) * ui, title, accent: THEME.subjects.words.accent, dim: false });
    let y = m.contentTop + 6 * ui;
    const stars = new StarRow(this, w / 2, y + 12 * ui, 0, 40 * ui);
    if (!this.starsShown) { this.starsShown = true; stars.reveal(r.stars, this); } else stars.set(r.stars);
    y += 46 * ui;
    text(this, w / 2, y, `+${r.coins} coins   +${r.xp} XP`, T.bodyBold(this, THEME.warningDark)); y += 26 * ui;
    if (this.testMode) { text(this, w / 2, y, 'Your score is saved for the parent dashboard.', T.small(this, THEME.ink2)); y += 22 * ui; }
    s.results.slice(0, 10).forEach((res) => {
      text(this, m.x + 28, y, res.right ? '✓' : '✗', T.bodyBold(this, res.right ? THEME.successDark : THEME.danger)).setOrigin(0, 0.5);
      text(this, m.x + 52, y, res.word, T.body(this, THEME.ink)).setOrigin(0, 0.5);
      if (!res.right) text(this, m.x + m.w - 28, y, `you wrote ${res.typed}`, T.small(this, THEME.ink3)).setOrigin(1, 0.5);
      y += 24 * ui;
    });
    const bw = Math.min((m.w - 72) / 2, 190 * ui), bh = 48 * ui, by = m.y + m.h - 40 * ui;
    button(this, w / 2 - bw / 2 - 8, by, bw, bh, this.testMode ? 'Learn again' : 'Practise again', { variant: 'secondary', onClick: () => this.scene.start(this.testMode ? SCENES.SpellingLearn : SCENES.SpellingGame, { listId: this.listId, words: this.list.id === 'tricky' ? this.list.words : null, grade: this.grade }) });
    button(this, w / 2 + bw / 2 + 8, by, bw, bh, 'Done', { variant: 'primary', onClick: () => this.scene.start(SCENES.Spelling, { grade: this.grade }) });
  }

  quit() { stopSpeech(); this.scene.start(SCENES.Spelling, { grade: this.grade }); }
}
