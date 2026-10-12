import { MinigameScene } from './MinigameScene.js';
import { THEME, hex } from '../../ui/theme.js';
import { tuningFor } from '../../data/grades.js';
import { weakSkills, prioritiseWeak } from '../../systems/Practice.js';
import { byDifficulty } from '../../systems/Ramp.js';
import { grid } from '../../systems/Layout.js';
import { T, FONT, WEIGHT } from '../../ui/TextStyles.js';
import { button, speakButton } from '../../ui/Button.js';
import { readable } from '../../ui/ReadableText.js';
import { card } from '../../ui/Card.js';
import { stripe } from '../../ui/Panel.js';
import { enter } from '../../ui/motion.js';
import { plainTheme } from '../../ui/Explain.js';
import { speak } from '../../systems/Speech.js';
import { Sfx } from '../../systems/Audio.js';
import { guideSays } from '../../ui/SkillIntro.js';
import { skillLabel } from '../../data/skills.js';

/**
 * A picture quiz: ten questions with big answer buttons, each read aloud, a second try on a miss and an
 * explanation on a second miss, and (if the subject wants one) a "bench" along the top that fills with what has
 * been learned. A subject extends it with its generators, `makeSet(n, targets)` and `makeOne(d)`, and the hooks:
 * `hasBench`/`drawBench(rect)`/`benchItem(q)`, `afterRight(q)`, `promptHeight(area, q)`, `drawPicture(cx, y, size, q)`,
 * `answerButton(cell, h, choice, i, q, opts)` and `choiceWords(q, choice)` (what the answer's 🔊 says; null for none).
 */
export class PictureQuiz extends MinigameScene {
  get lessonTheme() { return plainTheme; }
  get gameId() { return this.payload.gameId; }
  get hasBench() { return false; }
  makeSet() { return []; }
  makeOne() { return null; }

  initState() {
    const tune = tuningFor(this.payload), n = tune.questions;
    const ramp = this.makeSet(n, this.rampTargets(n));
    const questions = byDifficulty(prioritiseWeak(ramp, () => this.makeSet(12, null), weakSkills(this.profile)));
    return { questions, idx: 0, correct: 0, locked: false, picked: null, right: null, missed: {}, bench: [], parTimeMs: tune.parTimeMs };
  }

  // While a board's New Skill demo is on, its example is the round the board works on (see boardIntroFor).
  get round() { return this.introRound || this.state.questions[this.state.idx]; }
  get total() { return this.state.questions.length; }
  progressLabel() { return `${Math.min(this.state.idx + 1, this.total)} / ${this.total}`; }
  progressRatio() { return this.state.idx / this.total; }
  enterKey() { return this.state.idx; }

  /** A solved example of a skill the child has never met, and another to try (for the New Skill page). */
  exampleFor(skill) {
    const found = [];
    for (let i = 0; i < 80 && found.length < 2; i++) {
      const q = this.makeOne(0.3);
      if (q && q.skill === skill && !found.some((x) => x.prompt === q.prompt)) found.push(q);
    }
    const [q, t] = found;
    if (!q) return null;
    const line = (x) => (x.text || x.prompt).replace('\n', '  ');
    return { problem: `${line(q)}  →  ${q.answer}`, steps: this.steps(q), source: q, practice: t ? { prompt: line(t), choices: t.choices, answer: t.answer, solved: `${line(t)}  →  ${t.answer}`, steps: this.steps(t) } : null };
  }

  promptHeight(area, q) { return Math.min(area.h * 0.42, ((q.pics || []).length ? 150 : 110) * this.ui); }
  /** The question's picture (its emoji, by default), centred on (cx, y) and about `size` tall. */
  drawPicture(cx, y, size, q) { return this.add.text(cx, y, (q.pics || []).join(' '), { fontSize: Math.round(size * 0.8) + 'px', align: 'center' }).setOrigin(0.5); }
  answerButton(c, bh, choice, i, q, opts) { return button(this, c.x, c.y, c.w, bh, choice, opts); }
  choiceWords(q, choice) { return choice; }
  drawBench() {}
  benchItem(q) { return { pic: (q.pics && q.pics[0]) || null }; }
  afterRight() {}

  // ---- Hands-on boards ------------------------------------------------------------------------------------
  // A question can be played on a board instead of picked from buttons (sail the ship, paint the flag...). Its two
  // "choices" are the outcomes (answer first), so a board wins with pick(0) and misses with pick(1), and the second
  // try, explanation, bench and log all work as for any question. Subclasses say which questions have a board.

  /** The function that draws this question's board, (board, q, answered) => void, or null for a button question. */
  boardFor() { return null; }
  /** A board's starting state (kept per question across rebuilds, in state.inter). */
  newInter() { return { hint: null }; }
  interState() {
    const s = this.state, key = this.introRound ? this.introKey : s.idx;
    s.inter ||= {};
    if (!s.inter[key]) s.inter[key] = this.newInter(this.round);
    return s.inter[key];
  }
  /** A board notes where its pieces are (for the New Skill demo's hand): mark('dir:north', x, y). */
  mark(key, x, y) { (this.points ||= {})[key] = { x, y }; }
  /** The next move that solves a board from where it is: { from, to?, run } (subclasses; null when there is none). */
  demoNext() { return null; }
  /** A question that may be a board (History's makeOne leaves boards out, for the plain New Skill page). */
  makeBoardOne(d) { return this.makeOne(d); }

  /** A board question: the bench, the prompt card read aloud, then the board below. */
  buildInteractive(area, q, build) {
    const s = this.state, ui = this.ui;
    if (this.skillIntroFor(area, q.skill, (k) => this.exampleFor(k), plainTheme)) return;
    const cx = area.x + area.w / 2;
    if (this.hasBench) {
      const benchH = Math.min(96 * ui, area.h * 0.17);
      this.drawBench({ x: area.x, y: area.y, w: area.w, h: benchH });
      area = { x: area.x, y: area.y + benchH + 8, w: area.w, h: area.h - benchH - 8 };
    }
    const answered = s.picked !== null;
    const promptH = Math.min(area.h * 0.26, 92 * ui);
    card(this, cx, area.y + promptH / 2, area.w, promptH);
    stripe(this, cx - 24 * ui, area.y + 10 * ui, 48 * ui, this.subject.accent, 5 * ui);
    const colour = answered ? (s.right ? THEME.successDark : THEME.danger) : THEME.ink;
    const said = readable(this, cx, area.y + promptH / 2 + 4 * ui, q.text, T.at(this, q.text.length > 54 ? 15 : 18, colour, { fontStyle: '700' }), { width: area.w - 90 * ui, align: 'center' });
    speakButton(this, area.x + area.w - 30 * ui, area.y + 26 * ui, 40 * ui, said, { rate: this.speechRate });
    this.autoRead(said, null);
    build.call(this, { x: area.x, y: area.y + promptH + 10, w: area.w, h: area.h - promptH - 10 }, q, answered);
    if (answered && !s.right) this.explanationPanel(area, q, () => this.next());
  }

  // ---- A board's New Skill page: watch the hand, then you ------------------------------------------------------
  // The first round of a new skill on a board is taught on the board itself. The villager says what to do while a
  // ghost hand does one (each move from demoNext, its hand going to the points the board marked), then the child
  // does another on the same board; if they wait or slip, the hand points to the next move. Then the game starts.

  /** Two examples of this board for a skill (one to watch, one to do), or null. */
  boardExamples(q, build) {
    const found = [];
    for (let i = 0; i < 160 && found.length < 2; i++) {
      const x = this.makeBoardOne(Math.min(1, 0.2 + (i % 9) * 0.1));
      // Two different ones (some boards have one wording for many puzzles, so the whole question is compared).
      if (x && x.skill === q.skill && this.boardFor(x) === build && ![q, ...found].some((y) => JSON.stringify(y) === JSON.stringify(x))) found.push(x);
    }
    return found.length === 2 ? found : null;
  }

  /** True while the board's New Skill page is on screen (buildGame returns straight after). */
  boardIntroFor(area, q, build) {
    const s = this.state;
    s.introduced ||= {};
    if (!s.boardIntro && !s.introduced[q.skill] && this.needsIntro(q.skill)) {
      const ex = this.boardExamples(q, build);
      if (ex && s.inter) { delete s.inter['intro-demo']; delete s.inter['intro-try']; }   // a fresh board for each new skill
      if (ex) { s.introduced[q.skill] = true; s.boardIntro = { skill: q.skill, phase: 'demo', demo: ex[0], practice: ex[1], guide: this.guide, said: null, missed: 0 }; }
    }
    const bi = s.boardIntro;
    if (!bi) { this.introRound = null; return false; }
    this.drawBoardIntro(area, bi, build);
    return true;
  }

  drawBoardIntro(area, bi, build) {
    const ui = this.ui, watching = bi.phase === 'demo' || bi.phase === 'shown';
    this.introRound = watching ? bi.demo : bi.practice;
    this.introKey = watching ? 'intro-demo' : 'intro-try';
    this.points = {};
    const q = this.introRound, cx = area.x + area.w / 2;
    this.add.text(cx, area.y + 4 * ui, `New skill: ${skillLabel(bi.skill)}`, { fontFamily: FONT, fontSize: Math.round(18 * ui) + 'px', color: hex(this.subject.dark), fontStyle: WEIGHT.heavy }).setOrigin(0.5, 0);
    const line = bi.phase === 'demo' ? `Watch me. ${q.text}` : bi.phase === 'shown' ? 'Now you try one!'
      : bi.phase === 'done' ? 'You have got it! Now for the real thing.' : bi.missed ? `Look where my hand is pointing. ${q.text}` : `Your turn! ${q.text}`;
    const bubbleH = Math.max(48 * ui, Math.min(64 * ui, area.h * 0.12));
    guideSays(this, bi, area.x + 4, area.y + 30 * ui, area.w - 8, bubbleH, line, bi.phase === 'done' ? THEME.successDark : THEME.ink, ui);
    const headH = 30 * ui + bubbleH + (bi.guide && bi.guide.name ? 18 : 8) * ui, footH = 54 * ui;
    const board = { x: area.x, y: area.y + headH, w: area.w, h: area.h - headH - footH };
    build.call(this, board, q, false);
    // While the hand works, and once a board is solved, the child's taps don't reach it.
    if (bi.phase !== 'try') this.add.zone(board.x + board.w / 2, board.y + board.h / 2, board.w, board.h).setInteractive().setDepth(1500);
    const fy = area.y + area.h - footH / 2;
    if (bi.phase !== 'done') button(this, area.x + 44 * ui, fy, 76 * ui, 38 * ui, 'Skip', { variant: 'ghost', compact: true, fontSize: 15, onClick: () => { Sfx.click(); this.finishBoardIntro(); } });
    // Left to right: Skip, Watch again, then the next move, sized to fit a phone.
    const watchW = Math.min(140 * ui, area.w * 0.3), watchX = area.x + 86 * ui + watchW / 2;
    const goW = Math.min(180 * ui, area.x + area.w - (watchX + watchW / 2) - 14), goX = area.x + area.w - goW / 2 - 6;
    if (bi.phase === 'shown' || bi.phase === 'try') button(this, watchX, fy, watchW, 38 * ui, '↺ Watch again', { variant: 'ghost', compact: true, fontSize: 14, onClick: () => { Sfx.click(); this.watchAgain(bi); } });
    if (bi.phase === 'shown') button(this, goX, fy, goW, 46 * ui, 'Your turn ▶', { variant: 'go', compact: true, fontSize: 17, onClick: () => { Sfx.click(); bi.phase = 'try'; this.rebuild(); } });
    if (bi.phase === 'done') button(this, area.x + area.w - Math.min(180 * ui, area.w * 0.5) / 2 - 6, fy, Math.min(180 * ui, area.w * 0.5), 46 * ui, 'Got it! ▶', { variant: 'go', compact: true, fontSize: 17, onClick: () => { Sfx.click(); this.finishBoardIntro(); } });
    if (bi.phase === 'demo') this.demoStep(bi);
    if (bi.phase === 'try') this.hintLater(bi);
  }

  /** The ghost hand's next move: to the piece, a press, along to where it goes, and the move is made. */
  demoStep(bi) {
    const token = (this.demoToken = (this.demoToken || 0) + 1), ui = this.ui;
    const alive = () => this.demoToken === token && this.state.boardIntro === bi && bi.phase === 'demo';
    this.time.delayedCall(650, () => {
      if (!alive()) return;
      const step = this.demoNext(this.introRound, this.interState(), true), from = step && this.points[step.from];
      if (!step || !from) { bi.phase = 'shown'; this.rebuild(); return; }
      const to = step.to ? this.points[step.to] : null, start = this.handPos || { x: from.x + 40 * ui, y: from.y + 60 * ui };
      const hand = this.add.text(start.x, start.y, '👆', { fontSize: Math.round(34 * ui) + 'px' }).setOrigin(0.35, 0.05).setDepth(2000);
      const go = () => { this.handPos = to || from; step.run(); };
      if (!this.tweens) return go();
      this.tweens.add({ targets: hand, x: from.x, y: from.y, duration: 420, ease: 'Sine.InOut', onComplete: () => {
        if (!alive()) return;
        this.tweens.add({ targets: hand, scale: 0.82, duration: 110, yoyo: true, onComplete: () => {
          if (!alive()) return;
          if (!to) return go();
          this.tweens.add({ targets: hand, x: to.x, y: to.y, duration: 620, ease: 'Sine.InOut', onComplete: () => { if (alive()) go(); } });
        } });
      } });
    });
  }

  /** Your turn: if the child waits (or slips), the hand points to the next move, pulsing. */
  hintLater(bi) {
    const token = (this.hintToken = (this.hintToken || 0) + 1), ui = this.ui;
    this.time.delayedCall(bi.missed ? 400 : 5000, () => {
      if (this.hintToken !== token || this.state.boardIntro !== bi || bi.phase !== 'try') return;
      const step = this.demoNext(this.introRound, this.interState(), false), from = step && this.points[step.from];
      if (!from) return;
      const hand = this.add.text(from.x, from.y, '👆', { fontSize: Math.round(32 * ui) + 'px' }).setOrigin(0.35, 0.05).setDepth(2000).setAlpha(0.85);
      bi.hinted = (bi.hinted || 0) + 1;
      if (!this.tweens) return;
      const to = step.to ? this.points[step.to] : null;
      if (to) this.tweens.add({ targets: hand, x: to.x, y: to.y, duration: 900, ease: 'Sine.InOut', repeat: -1, repeatDelay: 300 });
      else this.tweens.add({ targets: hand, scale: 0.85, duration: 420, yoyo: true, repeat: -1 });
    });
  }

  /** A board's win or slip while it is the New Skill page: the demo is over, the try is won, or a hint shows. */
  introPick(i) {
    const bi = this.state.boardIntro;
    if (!bi) { this.introRound = null; return; }
    if (bi.phase === 'demo' && i === 0) { bi.phase = 'shown'; Sfx.pop(); }
    else if (bi.phase === 'try') { if (i === 0) { bi.phase = 'done'; Sfx.correct(); } else { bi.missed += 1; Sfx.wrong(); } }
    this.rebuild();
  }

  watchAgain(bi) {
    const s = this.state;
    if (s.inter) { delete s.inter['intro-demo']; delete s.inter['intro-try']; }
    bi.phase = 'demo'; bi.missed = 0; this.handPos = null;
    this.rebuild();
  }

  /** Into the game: the skill is learnt (or skipped), and the first real round starts. */
  finishBoardIntro() {
    const s = this.state, bi = s.boardIntro;
    if (bi) this.markIntroduced(bi.skill);
    if (s.inter) { delete s.inter['intro-demo']; delete s.inter['intro-try']; }
    s.boardIntro = null; this.introRound = null; this.handPos = null; this.demoToken = (this.demoToken || 0) + 1; this.hintToken = (this.hintToken || 0) + 1;
    this.qStartAt = Date.now();
    if ('qStart' in s) s.qStart = Date.now();
    this.rebuild();
  }

  /** The line under a board: what to do, the last mistake, or the outcome. */
  hintLine(board, y, text, good = null) {
    const ui = this.ui, colour = good === true ? THEME.successDark : good === false ? THEME.danger : THEME.ink2;
    this.add.text(board.x + board.w / 2, y, text, { fontFamily: FONT, fontSize: Math.round(13 * ui) + 'px', color: hex(colour), fontStyle: WEIGHT.bold, wordWrap: { width: board.w - 16 }, align: 'center' }).setOrigin(0.5, 0);
  }
  /** Read a hint aloud for the youngest, who cannot read it. */
  sayHint(text) { if (text && this.payload.grade <= 0) speak(text, { rate: this.speechRate }); }

  buildGame(area) {
    const boardQ = this.state.questions[this.state.idx], build = boardQ && !this.inReview ? this.boardFor(boardQ) : null;
    if (build && this.boardIntroFor(area, boardQ, build)) return;
    if (build) return this.buildInteractive(area, boardQ, build);
    const s = this.state, ui = this.ui, q = this.round;
    if (!q) return;
    if (this.skillIntroFor(area, q.skill, (k) => this.exampleFor(k), plainTheme)) return;
    const cx = area.x + area.w / 2;
    if (this.hasBench) {
      // The bench along the top shows what has been learned so far.
      const benchH = Math.min(96 * ui, area.h * 0.17);
      this.drawBench({ x: area.x, y: area.y, w: area.w, h: benchH });
      area = { x: area.x, y: area.y + benchH + 8, w: area.w, h: area.h - benchH - 8 };
    }

    // The question, read aloud, with its picture big underneath.
    const answered = s.picked !== null;
    const pics = q.pics || [];
    const promptH = this.promptHeight(area, q);
    const k = card(this, cx, area.y + promptH / 2, area.w, promptH);
    stripe(this, cx - 24 * ui, area.y + 10 * ui, 48 * ui, this.subject.accent, 5 * ui);
    const colour = answered ? (s.right ? THEME.successDark : THEME.danger) : THEME.ink;
    const prompt = q.text || q.prompt;
    const said = readable(this, cx, area.y + (pics.length ? 36 : promptH / 2) * (pics.length ? ui : 1), prompt, T.at(this, prompt.length > 60 ? 17 : prompt.length > 34 ? 19 : 23, colour, { fontStyle: '700' }), { width: area.w - 90 * ui, align: 'center' });
    speakButton(this, area.x + area.w - 30 * ui, area.y + 30 * ui, 40 * ui, said, { rate: this.speechRate });
    this.autoRead(said, answered || q.flagChoices ? null : q.choices);
    if (pics.length) {
      const size = Math.min(64 * ui, promptH - 70 * ui);
      this.picture = this.drawPicture(cx, area.y + promptH - size / 2 - 10 * ui, size, q);
    }
    enter(this, k, { from: 'up', distance: 12 });

    // The answers: big buttons, each with its own 🔊.
    const top = area.y + promptH + 12;
    const n = q.choices.length, cols = n === 4 ? 2 : n, rows = Math.ceil(n / cols);
    const longest = Math.max(...q.choices.map((c) => c.length));
    const rect = { x: area.x, y: top, w: area.w, h: Math.min(area.y + area.h - top, rows * (longest > 28 ? 92 : 100) * ui) };
    const cells = grid(rect, cols, rows, 12);
    const reveal = answered && (s.right || this.answerRevealed(q));
    const made = q.choices.map((choice, i) => {
      const c = cells[i];
      let variant = 'secondary';
      if (answered) { if (choice === q.answer && reveal) variant = 'success'; else if (i === s.picked) variant = 'danger'; }
      const bh = Math.max(60 * ui, Math.min(c.h, 100 * ui));
      const size = longest > 40 ? 13 : longest > 24 ? 15 : longest > 14 ? 17 : 20;
      const b = this.answerButton(c, bh, choice, i, q, { variant, fontSize: size, wrap: true, disabled: this.struckChoice() === i && s.picked === null, onClick: () => this.pick(i) });
      const words = this.choiceWords(q, choice);
      if (words) this.answerSpeaker(b, c.w, bh, words);
      if (reveal && choice !== q.answer && i !== s.picked) b.setAlpha(0.45);
      return b;
    });
    enter(this, made, { from: 'pop', delay: 80, stagger: 50 });
    if (answered && !s.right) this.explanationPanel(area, q, () => this.next());
  }

  pick(i) {
    if (this.introRound) return this.introPick(i);
    const s = this.state, q = this.round;
    if (s.locked || !q) return;
    const right = q.choices[i] === q.answer;
    if (!right && this.secondChance(q, i)) { s.missed[q.skill] = (s.missed[q.skill] || 0) + 1; this.rebuild(); return; }
    const second = this.onSecondTry(q);
    s.locked = true; s.picked = i; s.right = right;
    if (!second) this.logQuestion(q, right);
    if (right) { s.correct += 1; this.noteRight(q); this.correctFeedback(); s.bench.push(this.benchItem(q)); }
    else { if (!second) s.missed[q.skill] = (s.missed[q.skill] || 0) + 1; this.wrongFeedback(); }
    this.rebuild();
    if (right) { this.afterRight(q); this.time.delayedCall(1000, () => this.next()); }
  }

  next() {
    const s = this.state;
    if (!s.locked) return;
    s.idx += 1;
    if (s.idx >= s.questions.length) {
      const missedSkills = Object.entries(s.missed).sort((a, b) => b[1] - a[1]).map(([k]) => k);
      return this.finish({ correct: s.correct, total: s.questions.length, parTimeMs: s.parTimeMs, missedSkills });
    }
    s.locked = false; s.picked = null; s.right = null;
    this.rebuild();
  }
}
