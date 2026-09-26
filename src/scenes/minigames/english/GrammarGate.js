import { MinigameScene } from '../MinigameScene.js';
import { C } from '../../../constants.js';
import { generateRounds, fillBlank } from '../../../generators/english/grammar.js';
import { skillLabel } from '../../../data/skills.js';
import { grid } from '../../../systems/Layout.js';
import { T, text } from '../../../ui/TextStyles.js';
import { button } from '../../../ui/Button.js';
import { panel } from '../../../ui/Panel.js';

const PAR_MS = 90000;

/** Grammar Gate: fill the blank in 10 sentences from 3 choices. */
export class GrammarGate extends MinigameScene {
  constructor() { super('MG_GrammarGate'); }

  initState() {
    return { rounds: generateRounds(this.payload.grade, this.rng, 10), idx: 0, correct: 0, locked: false, picked: null, missed: {} };
  }

  get round() { return this.state.rounds[this.state.idx]; }
  progressLabel() { return `${Math.min(this.state.idx + 1, this.state.rounds.length)} / ${this.state.rounds.length}`; }

  buildGame(area) {
    const s = this.state, ui = this.ui, r = this.round;
    if (!r) return;
    const gap = 12;
    const promptH = Math.min(area.h * 0.42, 260 * ui);
    panel(this, area.x, area.y, area.w, promptH, { color: C.panelDark, stroke: C.lime });
    text(this, area.x + area.w / 2, area.y + 22 * ui, `Which word fits? (${skillLabel(r.skill)})`, T.small(this, C.grey));
    const shown = s.picked === null ? fillBlank(r.sentence) : fillBlank(r.sentence, r.options[r.answer]);
    const long = shown.length > 40;
    text(this, area.x + area.w / 2, area.y + promptH / 2 + 10 * ui, shown,
      { ...T.heading(this, s.picked === null ? C.white : C.lime), fontSize: Math.round((long ? 22 : 28) * ui) + 'px', wordWrap: { width: area.w - 32 } });

    const top = area.y + promptH + gap;
    const rect = { x: area.x, y: top, w: area.w, h: Math.min(area.y + area.h - top, (this.portrait ? 260 : 130) * ui) };
    const cells = this.portrait ? grid(rect, 1, 3, gap) : grid(rect, 3, 1, gap);
    r.options.forEach((opt, i) => {
      const c = cells[i];
      let color = C.blue;
      if (s.picked !== null) color = i === r.answer ? C.lime : i === s.picked ? C.red : C.dark;
      button(this, c.x, c.y, c.w, Math.max(56 * ui, Math.min(c.h, 96 * ui)), opt, { color, fontSize: opt.length > 10 ? 20 : 26, wrap: true, onClick: () => this.pick(i) });
    });
  }

  pick(i) {
    const s = this.state, r = this.round;
    if (s.locked) return;
    s.locked = true; s.picked = i;
    const right = i === r.answer;
    if (right) { s.correct += 1; this.correctFeedback(); }
    else { s.missed[r.skill] = (s.missed[r.skill] || 0) + 1; this.wrongFeedback(); }
    this.rebuild();
    this.time.delayedCall(right ? 600 : 1300, () => this.next());
  }

  next() {
    const s = this.state;
    s.idx += 1;
    if (s.idx >= s.rounds.length) {
      const missedSkills = Object.entries(s.missed).sort((a, b) => b[1] - a[1]).map(([k]) => k);
      return this.finish({ correct: s.correct, total: s.rounds.length, parTimeMs: PAR_MS, missedSkills });
    }
    s.locked = false; s.picked = null;
    this.rebuild();
  }
}
