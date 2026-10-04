import { MinigameScene } from '../MinigameScene.js';
import { THEME } from '../../../ui/theme.js';
import { generateRounds, roundDifficulty } from '../../../generators/math/patterns.js';
import { grid } from '../../../systems/Layout.js';
import { T, text } from '../../../ui/TextStyles.js';
import { button } from '../../../ui/Button.js';
import { card, plank } from '../../../ui/Card.js';
import { enter } from '../../../ui/motion.js';
import { readable } from '../../../ui/ReadableText.js';
import { speak } from '../../../systems/Speech.js';

const PAR_MS = 90000;
const WOOD = 0xf0b36b, POST = 0xc99a6b;
/** True when a pattern is made of pictures (Pre-K and K) rather than numbers. */
const isPicture = (list) => list.some((t) => /\p{Extended_Pictographic}/u.test(String(t)));

/**
 * Pattern Bridge's New Skill page: a card over the water, the example laid out on bridge planks (the answer plank
 * green once it is in place) and the practice answers as planks to drop into the gap.
 */
const bridgeIntroTheme = {
  title: THEME.subjects.math.dark, ink: THEME.ink, ink2: THEME.ink2,
  problemH: 104,
  backdrop(scene, area, f) {
    const g = scene.add.graphics();
    const wy = area.y + area.h * 0.62;
    g.fillStyle(THEME.subjects.math.soft, 1); g.fillRoundedRect(area.x, wy, area.w, area.y + area.h - wy, 18);
    g.fillStyle(THEME.primary, 0.2);
    for (let i = 0; i < 8; i++) g.fillEllipse(area.x + 24 + ((i * 173) % Math.max(40, area.w - 48)), wy + 16 + ((i * 47) % Math.max(20, area.y + area.h - wy - 30)), 36 * f, 6 * f);
    return area;
  },
  card(scene, r, f) {
    const w = Math.min(r.w, 640 * f);
    card(scene, r.x + r.w / 2, r.y + r.h / 2, w, r.h, { stroke: POST });
    const g = scene.add.graphics();
    g.fillStyle(WOOD, 1); g.fillRoundedRect(r.x + r.w / 2 - w / 2 + 14 * f, r.y + 8 * f, w - 28 * f, 8 * f, 4 * f);
    return { x: r.x + r.w / 2 - w / 2 + 14 * f, y: r.y + 22 * f, w: w - 28 * f, h: r.h - 30 * f };
  },
  /** "2, 4, [6], 8" (solved, the answer in brackets) or "2, 4, ?, 8" (to fill), laid out as planks between posts. */
  drawProblem(scene, r, str, { solved, f }) {
    const terms = str.split(',').map((t) => t.trim());
    const n = terms.length, gap = 6 * f;
    const pw = Math.min((r.w - 40 * f - gap * (n - 1)) / n, 84 * f), ph = Math.min(52 * f, r.h * 0.55);
    const rowW = pw * n + gap * (n - 1), x0 = r.x + (r.w - rowW) / 2, py = r.y + r.h * 0.6;
    const g = scene.add.graphics();
    g.fillStyle(POST, 1); g.fillRoundedRect(x0 - 14 * f, py - ph / 2 - 14 * f, 10 * f, ph + 26 * f, 3); g.fillRoundedRect(x0 + rowW + 4 * f, py - ph / 2 - 14 * f, 10 * f, ph + 26 * f, 3);
    g.lineStyle(4 * f, POST, 1); g.lineBetween(x0 - 9 * f, py - ph / 2 - 10 * f, x0 + rowW + 9 * f, py - ph / 2 - 10 * f);
    const fontSize = isPicture(terms) ? Math.round(Math.min(pw, ph) * 0.6) : Math.round((n > 5 && pw < 56 * f ? 16 : 22) * f);
    terms.forEach((t, i) => {
      const x = x0 + i * (pw + gap) + pw / 2;
      const answer = /^\[.*\]$/.test(t);
      if (t === '?') plank(scene, x, py, pw, ph, '?', { empty: true, stroke: THEME.warning, textColor: THEME.warningDark, fontSize });
      else plank(scene, x, py, pw, ph, answer ? t.slice(1, -1) : t, { color: answer ? THEME.success : WOOD, textColor: answer ? THEME.onAccent : THEME.ink, fontSize, radius: 10 });
    });
    // A caption the speaker button can read.
    const words = solved ? `The missing plank is ${(terms.find((t) => /^\[/.test(t)) || '').replace(/[[\]]/g, '')}.` : `Which number fills the gap? ${terms.join(', ')}`;
    return readable(scene, r.x + r.w / 2, r.y + 12 * f, solved ? 'The missing plank is in!' : 'Which plank fills the gap?', T.small(scene, THEME.ink2), { width: r.w - 60 * f }) && { read: (o) => speak(words, o), active: true };
  },
  choice(scene, x, y, w, h, label, { state, onTap, f }) {
    const color = state === 'right' ? THEME.success : state === 'wrong' ? THEME.danger : WOOD;
    const k = plank(scene, x, y, w, h, label, { color, textColor: state === 'right' || state === 'wrong' ? THEME.onAccent : THEME.ink, fontSize: Math.round(26 * f), radius: 12, onTap: onTap || null });
    if (state === 'dim') k.setAlpha(0.4);
    return k;
  }
};

/** Pattern Bridge: a row of numbered planks over water with one missing; pick the plank that fits. 8 bridges. */
export class PatternBridge extends MinigameScene {
  constructor() { super('MG_PatternBridge'); }

  initState() {
    const grade = this.payload.grade;
    const rounds = this.rampedRounds((k) => generateRounds(grade, this.rng, k), 8, roundDifficulty, () => generateRounds(grade, this.rng, 10));
    return { rounds, idx: 0, correct: 0, locked: false, picked: null, missed: {}, introduced: {} };
  }

  /** A solved bridge of a pattern skill the player has never met, and a second bridge for the child to try. */
  exampleFor(skill) {
    const found = [];
    for (let i = 0; i < 80 && found.length < 2; i++) {
      const r = generateRounds(this.payload.grade, this.rng, 1)[0];
      if (r.skill === skill && !found.some((x) => x.terms.join() === r.terms.join())) found.push(r);
    }
    const [r, t] = found;
    if (!r) return null;
    const show = (x, fill) => x.terms.map((v, j) => (j === x.missingIndex ? fill(v) : v)).join(', ');
    return {
      problem: show(r, (v) => `[${v}]`), steps: this.steps(r),
      practice: t ? { prompt: show(t, () => '?'), choices: t.choices, answer: t.answer, solved: show(t, (v) => `[${v}]`) } : null
    };
  }

  get lessonTheme() { return bridgeIntroTheme; }

  get round() { return this.state.rounds[this.state.idx]; }
  progressLabel() { return `${Math.min(this.state.idx + 1, this.state.rounds.length)} / ${this.state.rounds.length}`; }
  progressRatio() { return this.state.idx / this.state.rounds.length; }
  enterKey() { return this.state.idx; }

  buildGame(area) {
    const s = this.state, ui = this.ui, r = this.round;
    if (!r) return;
    if (this.skillIntroFor(area, r.skill, (k) => this.exampleFor(k), bridgeIntroTheme)) return;
    const promptH = 56 * ui;
    const prompt = card(this, area.x + area.w / 2, area.y + promptH / 2, area.w, promptH);
    text(this, area.x + area.w / 2, area.y + promptH / 2, r.rule || 'Which number is missing from the bridge?',
      T.at(this, 20, THEME.ink, { wordWrap: { width: area.w - 20 } }));
    enter(this, prompt, { from: 'up', distance: 12 });

    const gap = 10;
    const sceneH = Math.min(area.h * 0.42, 240 * ui);
    const sceneRect = { x: area.x, y: area.y + promptH + gap, w: area.w, h: sceneH };
    const asked = { ...r, prompt: r.terms.map((t, j) => (j === r.missingIndex ? '?' : t)).join(', ') };
    // After a miss the right plank stays hidden until the child has picked it in "Let's see why".
    this.reveal = s.picked !== null && (r.choices[s.picked] === r.answer || this.answerRevealed(asked));
    const planks = this.drawBridge(sceneRect, r, s);
    enter(this, planks, { from: 'pop', delay: 80, stagger: 40 });

    const gridTop = sceneRect.y + sceneH + gap;
    const gridH = Math.min(area.y + area.h - gridTop, 300 * ui);
    const cells = grid({ x: area.x, y: gridTop, w: area.w, h: gridH }, this.portrait ? 2 : 4, this.portrait ? 2 : 1, gap);
    const made = r.choices.map((choice, i) => {
      const c = cells[i];
      let variant = 'secondary', faded = false;
      if (s.picked !== null) { if (choice === r.answer && this.reveal) variant = 'success'; else if (i === s.picked) variant = 'danger'; else faded = this.reveal; }
      const b = button(this, c.x, c.y, c.w, Math.max(56 * ui, Math.min(c.h, 110 * ui)), choice, { variant, fontSize: isPicture(r.choices) ? 44 : 28, onClick: () => this.pick(i) });
      if (faded) b.setAlpha(0.45);
      return b;
    });
    enter(this, made, { from: 'up', delay: 200, stagger: 40 });
    if (s.picked !== null && r.choices[s.picked] !== r.answer) this.explanationPanel(area, asked, () => this.next());
  }

  /** Water, two posts, a rail and the plank row. The missing plank is a sunken slot with a "?" until answered. Returns the planks. */
  drawBridge(rect, r, s) {
    const ui = this.ui, g = this.add.graphics();
    const n = r.terms.length;
    const waterTop = rect.y + rect.h * 0.55;
    g.fillStyle(THEME.subjects.math.soft, 1); g.fillRoundedRect(rect.x, waterTop, rect.w, rect.y + rect.h - waterTop, 16);
    g.fillStyle(THEME.primary, 0.22);
    for (let i = 0; i < 6; i++) g.fillEllipse(rect.x + 20 + ((i * 173) % (rect.w - 40)), waterTop + 18 + ((i * 41) % Math.max(20, rect.h * 0.3)), 34 * ui, 6 * ui);

    const gap = 8 * ui;
    const plankW = Math.min((rect.w - 24 * ui - gap * (n - 1)) / n, 96 * ui);
    const plankH = Math.min(56 * ui, rect.h * 0.3);
    const rowW = plankW * n + gap * (n - 1);
    const x0 = rect.x + (rect.w - rowW) / 2;
    const py = waterTop - plankH * 0.4;

    g.fillStyle(POST, 1);
    g.fillRoundedRect(x0 - 16 * ui, py - 30 * ui, 12 * ui, rect.y + rect.h - py + 14 * ui, 4);
    g.fillRoundedRect(x0 + rowW + 4 * ui, py - 30 * ui, 12 * ui, rect.y + rect.h - py + 14 * ui, 4);
    g.lineStyle(4 * ui, POST, 1); g.lineBetween(x0 - 10 * ui, py - 26 * ui, x0 + rowW + 10 * ui, py - 26 * ui);

    // Picture patterns (Pre-K and K) draw the pictures as big as the plank allows.
    const fontSize = isPicture(r.terms) ? Math.round(Math.min(plankW, plankH) * 0.6) : Math.round((n > 5 && plankW < 60 * ui ? 16 : 22) * ui);
    return r.terms.map((t, i) => {
      const x = x0 + i * (plankW + gap) + plankW / 2, y = py + plankH / 2;
      if (i === r.missingIndex && s.picked === null) {
        return plank(this, x, y, plankW, plankH, '?', { empty: true, stroke: THEME.warning, textColor: THEME.warningDark, fontSize });
      }
      const isMissing = i === r.missingIndex;
      const right = isMissing && r.choices[s.picked] === r.answer;
      // A wrong plank shows the child's number in red until the right one has been found, then the right one in green.
      const shownRight = right || (isMissing && this.reveal);
      const color = isMissing ? (shownRight ? THEME.success : THEME.danger) : WOOD;
      return plank(this, x, y, plankW, plankH, isMissing && !shownRight ? String(r.choices[s.picked]) : String(t), { color, fontSize, radius: 10, textColor: isMissing ? THEME.onAccent : THEME.ink });
    });
  }

  pick(i) {
    const s = this.state, r = this.round;
    if (s.locked) return;
    s.locked = true; s.picked = i;
    const right = r.choices[i] === r.answer;
    this.logQuestion({ skill: r.skill, prompt: (r.rule ? r.rule + '\n' : '') + r.terms.map((t, j) => (j === r.missingIndex ? '?' : t)).join(', '), answer: r.answer, choices: r.choices }, right);
    if (right) { s.correct += 1; this.correctFeedback(); }
    else { s.missed[r.skill] = (s.missed[r.skill] || 0) + 1; this.wrongFeedback(); }
    this.rebuild();
    if (right) this.time.delayedCall(600, () => this.next());   // wrong answers wait for "Next" after the explanation
  }

  next() {
    const s = this.state;
    if (!s.locked) return;
    s.idx += 1;
    if (s.idx >= s.rounds.length) {
      const missedSkills = Object.entries(s.missed).sort((a, b) => b[1] - a[1]).map(([k]) => k);
      return this.finish({ correct: s.correct, total: s.rounds.length, parTimeMs: PAR_MS, missedSkills });
    }
    s.locked = false; s.picked = null;
    this.rebuild();
  }
}
