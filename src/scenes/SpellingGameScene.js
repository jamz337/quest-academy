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
import { toast } from '../ui/Toast.js';
import { StarRow } from '../ui/StarRow.js';
import { ProgressBar } from '../ui/ProgressBar.js';
import { enter, shake, pulse } from '../ui/motion.js';
import { letterRow, letterKeyboard, keyFromEvent, wordPicture, beeFly } from '../ui/SpellingWidgets.js';
import { fireworks } from '../ui/Fireworks.js';
import { Sfx } from '../systems/Audio.js';
import { speak, stop as stopSpeech, rateFor, canSpeak } from '../systems/Speech.js';
import { safeArea } from '../systems/Layout.js';
import { Rng } from '../systems/Rng.js';
import { checkBadges } from '../systems/Progression.js';
import { getBadge } from '../data/badges.js';
import { getList, listWords, spellingGradeFor } from '../data/spelling/lists.js';
import { planSession, markSpelling, recordSpelling, recordTaught, finishSession, recordTest, comboBonus, blankSentence, trickySpots } from '../systems/Spelling.js';
import { trickFor } from '../data/spelling/tricks.js';
import { gradeOf } from '../data/grades.js';

const LOOK_MS = 3500;   // how long a "look" word stays before it hides

/**
 * One spelling session: 10 words from a list. New words are shown and read, then hidden and typed back;
 * seen words come with a few letters missing, then are written into their sentence; nearly-learned words are
 * spelled from hearing alone. After a miss the right spelling is shown with its tricky part ringed and a memory
 * trick, and the child writes it right once ("Write it right") before moving on.
 * Letters are typed on an on-screen keyboard (or a real one), capitals included, and marked letter by letter.
 * Every right answer sends a bee with honey to the pot; runs of right answers pay bonus coins.
 */
export class SpellingGameScene extends BaseScene {
  constructor() { super(SCENES.SpellingGame); this.fade = true; }

  init(data) {
    this.listId = data.listId;
    this.grade = data.grade ?? null;
    const list = data.words ? { id: data.listKind || 'tricky', title: data.title || 'Tricky words', words: data.words } : getList(data.listId);
    this.list = list || { id: 'none', title: 'Spelling', words: [] };
    const rng = new Rng();
    // The weekly test: every word of the list, from hearing alone, no hints and nothing revealed until the end.
    this.testMode = !!data.test;
    const rounds = this.testMode
      ? rng.shuffle(listWords(this.list)).map((e) => ({ word: e.w, syllables: e.syl, sentence: e.s, pic: e.pic, mode: 'listen', blanks: [] }))
      : planSession(Store.getProfile() || {}, this.list, () => rng.float());
    this.state = {
      rounds, idx: 0, typed: '', shift: false, phase: rounds.length && rounds[0].mode === 'look' ? 'show' : 'type', right: null, caseOnly: false, fixed: null,
      correct: 0, combo: 0, bestCombo: 0, bonus: 0, results: [], done: false, reward: null, newBadges: []
    };
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

  /** Grade 2 hears every letter as it is typed (the player's grade, or the list's, whichever is lower). */
  get saysLetters() {
    const p = Store.getProfile();
    return Math.min(gradeOf(p?.grade, 9), this.grade ?? spellingGradeFor(p?.grade)) <= 2;
  }

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

  /** Say one typed letter: "b", or "capital C". */
  sayLetter(ch) {
    if (!this.saysLetters || !canSpeak() || !/^[a-zA-Z]$/.test(ch)) return;
    speak(ch === ch.toUpperCase() ? `capital ${ch}` : ch.toUpperCase(), { rate: 1 });
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

  hideWord() { const s = this.state; if (s.phase !== 'show') return; s.phase = 'type'; s.typed = ''; s.shift = false; this.rebuild(); }

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
    // Second row: how far through the words, and (outside the test) the honey pot and the current run.
    const y2 = sa.top + 60 * ui;
    this.honey = null;
    if (this.testMode) new ProgressBar(this, w / 2, y2, w - 32, 6 * ui, { value: s.idx / s.rounds.length, color: THEME.subjects.words.accent });
    else {
      this.honey = chip(this, w - 12 - sa.right, y2, { text: `🍯 ${s.correct}`, originX: 1, color: THEME.warningSoft, textColor: THEME.warningDark, fontSize: 13, height: 24 * ui, shadow: 'none' });
      let right = this.honey.w + 8;
      if (s.combo >= 2) { const c = chip(this, w - 12 - sa.right - right, y2, { text: `🔥 ${s.combo} in a row`, originX: 1, color: THEME.dangerSoft, textColor: THEME.danger, fontSize: 13, height: 24 * ui, shadow: 'none' }); right += c.w + 8; }
      const barW = Math.max(40, w - 32 - right - sa.left - sa.right);
      new ProgressBar(this, 16 + sa.left + barW / 2, y2, barW, 6 * ui, { value: s.idx / s.rounds.length, color: THEME.subjects.words.accent });
    }
    const area = { x: 14 + sa.left, y: sa.top + 76 * ui, w: w - 28 - sa.left - sa.right, h: h - sa.top - 76 * ui - 14 - sa.bottom };

    // The word card: shown, hidden, with blanks, or marked. Its height follows the tile row it has to hold
    // (hint line, tiles, then the syllables or the correct spelling), so short landscape windows still fit.
    const tileSize = this.tileSize(area);
    const extra = s.phase === 'fix' ? tileSize + 40 * ui : r.mode === 'sentence' && s.phase !== 'result' ? 30 * ui : s.phase === 'result' && !s.right && !this.testMode && this.trickText() ? 26 * ui : 0;
    const cardH = Math.min(area.h * (s.phase === 'fix' ? 0.56 : 0.5), Math.max(44 * ui + tileSize + 56 * ui + extra, Math.min(area.h * 0.36, 200 * ui)));
    const k = card(this, area.x + area.w / 2, area.y + cardH / 2, area.w, cardH);
    stripe(this, area.x + area.w / 2 - 24 * ui, area.y + 10 * ui, 48 * ui, THEME.subjects.words.accent, 5 * ui);
    const hint = this.testMode ? 'Weekly test: listen, then spell the word' : { look: 'Look carefully, then spell it when it hides', fill: 'Fill in the missing letters', sentence: 'Write the missing word', listen: 'Listen, then spell the word' }[r.mode];
    const msg = s.phase === 'fix' ? (s.fixed === 'right' ? 'Now you have got it!' : s.fixed === 'wrong' ? 'Look again and copy it exactly.' : 'Copy it. Watch the ringed letters!')
      : s.phase !== 'result' ? hint : this.testMode ? 'Saved. Next word…' : s.right ? 'Spot on!' : s.caseOnly ? 'Nearly! Check the capital letters.' : 'Not quite. Look at the red letters.';
    const colour = s.phase === 'fix' ? (s.fixed === 'right' ? THEME.successDark : s.fixed === 'wrong' ? THEME.danger : THEME.ink2) : s.phase === 'result' && !this.testMode ? (s.right ? THEME.successDark : THEME.danger) : THEME.ink2;
    // The word's picture sits at the top left of the card; the hint wraps beside it.
    this.pic = r.pic ? wordPicture(this, area.x + 12 + 22 * ui, area.y + 28 * ui, 40 * ui, r.pic) : null;
    const side = (this.pic ? 56 * ui : 0) + (canSpeak() ? 52 * ui : 0);
    text(this, area.x + area.w / 2, area.y + 28 * ui, msg, { ...T.small(this, colour), wordWrap: { width: Math.max(120, area.w - 24 - side * 2) }, align: 'center' });
    if (canSpeak()) iconButton(this, area.x + area.w - 30 * ui, area.y + 28 * ui, 40 * ui, '🔊', { variant: 'ghost', onClick: () => this.say(true) });
    this.drawWord(area, cardH);
    enter(this, k, { from: 'up', distance: 12 });

    if (s.phase === 'show') {
      button(this, area.x + area.w / 2, area.y + cardH + 34 * ui, Math.min(area.w - 40, 240 * ui), 48 * ui, "I've got it!", { variant: 'primary', onClick: () => { Sfx.click(); this.hideWord(); } });
      return;
    }
    if (s.phase === 'result') {
      const last = s.idx + 1 >= s.rounds.length;
      const cx = area.x + area.w / 2, by = area.y + cardH + 34 * ui;
      if (!s.right && !this.testMode) {
        // Write it right once before moving on (the recommended way), or move on.
        const bw = Math.min((area.w - 20) / 2, 220 * ui);
        button(this, cx - bw / 2 - 6, by, bw, 48 * ui, '✍ Write it right', { variant: 'go', onClick: () => this.startFix() });
        button(this, cx + bw / 2 + 6, by, bw, 48 * ui, last ? 'Finish' : 'Next ▶', { variant: 'ghost', onClick: () => this.next() });
        return;
      }
      button(this, cx, by, Math.min(area.w - 40, 240 * ui), 48 * ui, last ? 'Finish' : 'Next ▶', { variant: 'go', onClick: () => this.next() });
      return;
    }
    if (s.phase === 'fix' && s.fixed === 'right') return;
    this.drawKeyboard({ x: area.x, y: area.y + cardH + 12, w: area.w, h: area.h - cardH - 12 });
  }

  /** Letter tile size for the current word: fits the card width, and never taller than a short screen allows. */
  tileSize(area) {
    const r = this.round, ui = this.ui;
    const n = Math.max(r.word.length, this.state.typed.length, 1), gap = 6 * ui;
    const byWidth = (area.w - 40 - gap * (n - 1)) / n;
    const byHeight = (Math.min(area.h * 0.5, 200 * ui) - 44 * ui - 56 * ui) * (this.state.phase === 'fix' ? 0.75 : 1);
    return Math.max(18 * ui, Math.min(44 * ui, byWidth, byHeight));
  }

  /** The word as letter tiles: full (show), blanks and typed letters (fill/listen), or marked (result). */
  drawWord(area, cardH) {
    const s = this.state, r = this.round, ui = this.ui;
    const cx = area.x + area.w / 2;
    let letters;
    if (s.phase === 'fix') return this.drawFix(area);
    if (s.phase === 'show') letters = this.ringed([...r.word].map((ch) => ({ ch, look: 'shown' })));
    else if (s.phase === 'result' && this.testMode) letters = [...s.typed].map((ch) => ({ ch, look: 'typed' }));
    else if (s.phase === 'result') {
      const { marks } = markSpelling(r.mode === 'fill' ? this.filled() : s.typed, r.word);
      letters = marks.map((m) => ({ ch: m.ch, look: m.ok ? 'ok' : m.missing ? 'missing' : m.wrongCase ? 'case' : 'bad' }));
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
      text(this, cx, below, `It is spelt  ${r.word}`, T.at(this, 15, THEME.ink, { fontStyle: '700' }));
      const trick = this.trickText();
      if (trick) text(this, cx, below + 44 * ui, trick, { ...T.small(this, THEME.warningDark), wordWrap: { width: area.w - 32 }, align: 'center' });
    }
    // A sentence round: the sentence with the word missing, under the tiles.
    if (r.mode === 'sentence' && s.phase === 'type') {
      const line = blankSentence(r.sentence, r.word);
      if (line) text(this, cx, below + 4 * ui, `“${line}”`, { ...T.at(this, 16, THEME.ink, { fontStyle: '600' }), wordWrap: { width: area.w - 32 }, align: 'center' });
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
    const ready = s.typed.length >= (r.mode === 'fill' && s.phase === 'type' ? this.target().length : 1);
    this.checkButton = letterKeyboard(this, rect, { onKey: (ch) => this.type(ch), onCheck: () => (s.phase === 'fix' ? this.checkFix() : this.check()), onShift: () => this.type('⇧'), shift: s.shift, ready, ui: this.ui }).check;
  }

  /** The whole word with the typed letters dropped into the blanks (fill rounds). */
  filled() {
    const r = this.round, s = this.state;
    let t = 0;
    return [...r.word].map((ch, i) => (r.blanks.includes(i) ? (s.typed[t++] || '_') : ch)).join('');
  }

  /** A key press: a letter (in the case shown on the key), shift for the next letter, or backspace. */
  type(ch) {
    const s = this.state, r = this.round;
    if (s.phase !== 'type' && !(s.phase === 'fix' && s.fixed !== 'right')) return;
    if (s.phase === 'fix' && s.fixed === 'wrong' && ch !== '⇧') { s.fixed = null; s.typed = ''; }
    if (ch === '⇧') { s.shift = !s.shift; Sfx.click(); this.rebuild(); return; }
    if (ch === '⌫') { if (!s.typed) return; s.typed = s.typed.slice(0, -1); }
    else {
      const max = r.mode === 'fill' && s.phase === 'type' ? r.blanks.length : Math.max(r.word.length + 3, 12);
      if (s.typed.length >= max) return;
      s.typed += ch; s.shift = false;
      this.sayLetter(ch);
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
    if (s.phase === 'fix' && s.fixed !== 'right' && k) { if (k === 'Enter') return this.checkFix(); return this.type(k); }
    if (s.phase !== 'type' || !k) return;
    if (k === 'Enter') return this.check();
    this.type(k);
  }

  check() {
    const s = this.state, r = this.round;
    if (s.phase !== 'type' || !s.typed) return;
    const answer = r.mode === 'fill' ? this.filled() : s.typed;
    const { right, caseOnly } = markSpelling(answer, r.word);
    s.phase = 'result'; s.right = right; s.caseOnly = !right && caseOnly;
    let bonus = 0;
    if (right) { s.correct += 1; s.combo += 1; s.bestCombo = Math.max(s.bestCombo, s.combo); bonus = comboBonus(s.combo); s.bonus += bonus; }
    else s.combo = 0;
    s.results.push({ word: r.word, right, typed: answer });
    Store.updateProfile((p) => recordSpelling(p, r.word, right, r.mode, answer));
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
    if (right) this.celebrate(bonus);
    if (!right && this.wordTiles) shake(this, this.wordTiles[0], 4);
    if (!right) this.time.delayedCall(600, () => this.say(false));
    if (right) { const idx = s.idx; this.time.delayedCall(bonus ? 1600 : 1100, () => { if (s.idx === idx && s.phase === 'result') this.next(); }); }
  }

  /** Ring the tricky part of the round's word (built-in, or letters this child has missed before). */
  ringed(letters) {
    const r = this.round;
    if (this.testMode) return letters;
    const spots = new Set(trickySpots(Store.getProfile(), r.word, r));
    return letters.map((l, i) => ({ ...l, tricky: spots.has(i) }));
  }

  /** The memory trick for the round's word ("🧠 …"), or null. */
  trickText() {
    const t = trickFor(this.round.word, this.round);
    return t && t.trick ? `🧠 ${t.trick}` : null;
  }

  /** After a miss: copy the right spelling once, with the tricky letters ringed. */
  startFix() {
    const s = this.state;
    if (s.phase !== 'result' || s.right || this.testMode) return;
    Sfx.click(); s.phase = 'fix'; s.fixed = null; s.typed = ''; s.shift = false;
    this.rebuild();
    if (canSpeak()) speak(this.round.word, { rate: this.speechRate });
  }

  /** The fix rows: the word (tricky part ringed) and what is being typed under it, marked once checked. */
  drawFix(area) {
    const s = this.state, r = this.round, ui = this.ui;
    const cx = area.x + area.w / 2, gap = 6 * ui, size = this.tileSize(area);
    const y1 = area.y + 44 * ui + size / 2;
    letterRow(this, { cx, cy: y1, letters: this.ringed([...r.word].map((ch) => ({ ch, look: 'shown' }))), size, gap });
    let row;
    if (s.fixed) row = markSpelling(s.typed, r.word).marks.map((m) => ({ ch: m.ch, look: m.ok ? 'ok' : m.missing ? 'missing' : m.wrongCase ? 'case' : 'bad' }));
    else row = Array.from({ length: Math.max(r.word.length, s.typed.length) }, (_, i) => ({ ch: s.typed[i] || '', look: s.typed[i] ? 'typed' : 'blank' }));
    this.wordTiles = letterRow(this, { cx, cy: y1 + size + 12 * ui, letters: row, size, gap });
    const trick = this.trickText();
    if (trick) text(this, cx, y1 + size * 1.5 + 30 * ui, trick, { ...T.small(this, THEME.warningDark), wordWrap: { width: area.w - 32 }, align: 'center' });
  }

  /** Check the copied word. Right: on to the next word (it counts as practice, not as a right answer). */
  checkFix() {
    const s = this.state, r = this.round;
    if (s.phase !== 'fix' || !s.typed || s.fixed === 'right') return;
    if (s.typed === r.word) {
      s.fixed = 'right'; Sfx.correct();
      Store.updateProfile((p) => recordTaught(p, r.word));
      this.rebuild();
      const idx = s.idx;
      this.time.delayedCall(900, () => { if (s.idx === idx && s.phase === 'fix') this.next(); });
    } else { s.fixed = 'wrong'; Sfx.wrong(); this.rebuild(); if (this.wordTiles && this.wordTiles[0]) shake(this, this.wordTiles[0], 4); }
  }

  /** A right answer: the picture pops, a bee carries honey to the pot, and a run of three pays out. */
  celebrate(bonus) {
    const s = this.state, ui = this.ui;
    const from = this.pic || (this.wordTiles && this.wordTiles[0]);
    if (this.pic) pulse(this, this.pic, 1.15);
    if (from && this.honey) {
      const pot = this.honey;
      beeFly(this, from.x, from.y, pot.x - pot.w / 2, pot.y, () => { Sfx.coin(); if (pot.active !== false) pulse(this, pot, 1.2); }, ui);
    }
    if (bonus) this.time.delayedCall(600, () => toast(this, `🔥 ${s.combo} in a row!  +${bonus} bonus coins`, { icon: 'coin', accent: THEME.warning }));
  }

  next() {
    const s = this.state;
    if (s.phase !== 'result' && s.phase !== 'fix') return;
    s.idx += 1; s.typed = ''; s.shift = false; s.right = null; s.caseOnly = false; s.fixed = null;
    if (s.idx >= s.rounds.length) return this.finishAll();
    s.phase = this.round.mode === 'look' ? 'show' : 'type';
    this.rebuild();
    this.startRound();
  }

  finishAll() {
    const s = this.state;
    let reward = null, newBadges = [];
    Store.updateProfile((p) => {
      reward = finishSession(p, this.list.id, s.correct, s.rounds.length, s.bonus);
      if (this.testMode) recordTest(p, this.list.id, s.correct, s.rounds.length);
      newBadges = checkBadges(p, { correct: s.correct, total: s.rounds.length, spellingCombo: s.bestCombo, spelling: true });
    });
    s.reward = reward; s.done = true; s.newBadges = newBadges;
    const p = Store.getProfile();
    if (p && reward) Cloud.postResult(p, { gameId: this.testMode ? 'spelling-test' : 'spelling', band: null }, { stars: reward.stars, correct: s.correct, total: s.rounds.length, xp: reward.xp, coins: reward.coins, timeMs: Date.now() - this.startedAt, missedSkills: s.correct < s.rounds.length ? ['spelling'] : [] });
    if (reward && reward.stars >= 2) Sfx.fanfare(); else Sfx.correct();
    this.rebuild();
    if (reward && reward.stars >= 1) this.time.delayedCall(400, () => fireworks(this, this.w / 2, this.h * 0.25, { bursts: 1 + reward.stars, spread: this.w * 0.3 }));
    let delay = 1200;
    for (const id of newBadges) {
      const b = getBadge(id);
      if (b) { this.time.delayedCall(delay, () => { Sfx.unlock(); toast(this, `New badge: ${b.title}`, { icon: 'star', accent: THEME.brand }); }); delay += 1400; }
    }
  }

  buildSummary() {
    const { w, ui } = this;
    const s = this.state, r = s.reward || { coins: 0, bonus: 0, xp: 0, stars: 0 };
    const rows = Math.min(s.results.length, 10);
    const title = this.testMode ? `Weekly test: ${s.correct} of ${s.rounds.length}` : `${this.list.title}: ${s.correct} of ${s.rounds.length}`;
    const extra = (this.testMode ? 22 : 0) + (!this.testMode && s.bestCombo >= 2 ? 22 : 0);
    const m = modal(this, { w: 440 * ui, h: (250 + rows * 24 + extra) * ui, title, accent: THEME.subjects.words.accent, dim: false });
    let y = m.contentTop + 6 * ui;
    const stars = new StarRow(this, w / 2, y + 12 * ui, 0, 40 * ui);
    if (!this.starsShown) { this.starsShown = true; stars.reveal(r.stars, this); } else stars.set(r.stars);
    y += 46 * ui;
    text(this, w / 2, y, `+${r.coins} coins   +${r.xp} XP`, T.bodyBold(this, THEME.warningDark)); y += 26 * ui;
    if (this.testMode) { text(this, w / 2, y, 'Your score is saved for the parent dashboard.', T.small(this, THEME.ink2)); y += 22 * ui; }
    else if (s.bestCombo >= 2) { text(this, w / 2, y, `🍯 ${s.correct} honey   🔥 best run ${s.bestCombo} in a row${r.bonus ? `   +${r.bonus} bonus coins` : ''}`, T.small(this, THEME.ink2)); y += 22 * ui; }
    s.results.slice(0, 10).forEach((res) => {
      text(this, m.x + 28, y, res.right ? '✓' : '✗', T.bodyBold(this, res.right ? THEME.successDark : THEME.danger)).setOrigin(0, 0.5);
      text(this, m.x + 52, y, res.word, T.body(this, THEME.ink)).setOrigin(0, 0.5);
      if (!res.right) text(this, m.x + m.w - 28, y, `you wrote ${res.typed}`, T.small(this, THEME.ink3)).setOrigin(1, 0.5);
      y += 24 * ui;
    });
    const bw = Math.min((m.w - 72) / 2, 190 * ui), bh = 48 * ui, by = m.y + m.h - 40 * ui;
    button(this, w / 2 - bw / 2 - 8, by, bw, bh, this.testMode ? 'Learn again' : 'Practise again', { variant: 'secondary', onClick: () => this.scene.start(this.testMode ? SCENES.SpellingLearn : SCENES.SpellingGame, { listId: this.listId, words: this.list.id === 'tricky' || this.list.id === 'review' ? this.list.words : null, listKind: this.list.id, title: this.list.title, grade: this.grade }) });
    button(this, w / 2 + bw / 2 + 8, by, bw, bh, 'Done', { variant: 'primary', onClick: () => this.scene.start(SCENES.Spelling, { grade: this.grade }) });
  }

  quit() { stopSpeech(); this.scene.start(SCENES.Spelling, { grade: this.grade }); }
}
