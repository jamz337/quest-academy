import { MazeGameScene } from './MazeGameScene.js';
import { THEME, hex } from '../../../ui/theme.js';
import { danceRounds } from '../../../generators/coding/dance.js';
import { text, T, FONT, WEIGHT } from '../../../ui/TextStyles.js';
import { button } from '../../../ui/Button.js';
import { card } from '../../../ui/Card.js';
import { enter } from '../../../ui/motion.js';

const ROUNDS = 6;
const FLOOR_TINTS = [0xff6fae, 0x3d8bff, 0xffc531, 0x2ec46a, 0x8b5cf6, 0xff8f3f];
const NOTES = ['♪', '♫', '♩'];

/**
 * Robot Dance: the robot performs a program on a disco floor (notes fly as it moves). Then three programs
 * are shown and the player picks the one it followed. The wrong ones differ by a turn, a repeat count or
 * a move, so the dance has to be watched, not guessed. "Watch again" replays it.
 */
export class RobotDance extends MazeGameScene {
  constructor() { super('MG_RobotDance'); }

  initState() {
    // Longer dances take more remembering, so they come later.
    const rounds = this.rampedRounds((k) => danceRounds(this.rng, this.payload.band, k), ROUNDS, (r) => JSON.stringify(r.program).length);
    return { rounds, idx: 0, phase: 'watch', picked: null, correct: 0, missed: {}, started: false, ...this.robotState(rounds[0].level) };
  }

  round() { return this.state.rounds[this.state.idx]; }
  level() { return this.round().level; }
  program() { return this.round().program; }
  get stepMs() { return 330; }
  progressLabel() { return `${Math.min(this.state.idx + 1, ROUNDS)} / ${ROUNDS}`; }
  progressRatio() { return this.state.idx / ROUNDS; }
  enterKey() { return `${this.state.idx}-${this.state.phase}`; }

  /** A rebuild mid-dance (rotation) stops the dance; the player can watch it again. */
  beforeRebuild() {
    if (this.suppressCancel) return;
    const s = this.state;
    if (s.running || s.busy || s.stepping) { this.resetRobot(); if (s.phase === 'watch') s.phase = 'pick'; }
  }

  buildGame(area) {
    const s = this.state, ui = this.ui, r = this.round();
    const L = this.layout(area, 44 * ui);
    const title = s.phase === 'watch' ? 'Watch the robot dance!' : s.phase === 'pick' ? 'Which program did it follow?' : s.picked !== null && r.choices[s.picked].right ? 'Correct!' : 'Not quite!';
    const hint = s.phase === 'watch' ? 'Count the moves and turns.' : s.phase === 'pick' ? 'Tap a program. Not sure? Watch again.' : `Score ${s.correct} / ${s.idx + 1}`;
    this.drawInfo(L.infoRect, title, hint);
    this.drawMaze(L.mazeRect);
    this.discoFloor();
    // Programs to choose from, stacked in the editor rect with a footer for the button.
    const footH = 56 * ui, gap = 8;
    const er = L.editorRect;
    const n = r.choices.length;
    const ch = (er.h - footH - gap * (n - 1)) / n;
    const made = r.choices.map((c, i) => {
      const cy = er.y + i * (ch + gap) + ch / 2;
      let stroke = THEME.line, color = THEME.surface, faded = false;
      if (s.phase === 'result') { if (c.right) { stroke = THEME.success; color = THEME.successSoft; } else if (i === s.picked) { stroke = THEME.danger; color = THEME.dangerSoft; } else faded = true; }
      const k = card(this, er.x + er.w / 2, cy, er.w, ch, { stroke, color, strokeWidth: 3, shadow: 'sm', onTap: s.phase === 'pick' ? () => this.pick(i) : null });
      const lines = c.text.split('\n').length;
      const size = Math.round(Math.min(15, Math.max(10, (ch - 14) / (lines * 1.35))) * Math.min(ui, 1.2));
      k.add(this.add.text(-er.w / 2 + 14, 0, c.text, { fontFamily: FONT, fontSize: size + 'px', color: hex(THEME.ink), fontStyle: WEIGHT.bold, lineSpacing: 2 }).setOrigin(0, 0.5));
      k.add(this.add.text(er.w / 2 - 12, -ch / 2 + 12, String.fromCharCode(65 + i), T.at(this, 12, THEME.ink3)).setOrigin(1, 0));
      if (faded) k.setAlpha(0.45);
      return k;
    });
    if (s.phase === 'pick') enter(this, made, { from: 'up', stagger: 50 });
    const fx = er.x + er.w / 2, fy = er.y + er.h - footH / 2 + 4;
    if (s.phase === 'watch') text(this, fx, fy, 'Dancing…', T.small(this, THEME.ink2));
    else if (s.phase === 'pick') button(this, fx, fy, Math.min(er.w - 20, 220 * ui), 44 * ui, '▶ Watch again', { variant: 'secondary', fontSize: 15, onClick: () => this.replay() });
    else if (r.choices[s.picked].right) button(this, fx, fy, Math.min(er.w - 20, 220 * ui), 46 * ui, s.idx + 1 >= ROUNDS ? 'Finish' : 'Next ▶', { variant: 'primary', onClick: () => this.next() });
    if (s.phase === 'result' && !r.choices[s.picked].right) {
      const moves = r.steps.filter((st) => st.kind === 'move').length, turns = r.steps.filter((st) => st.kind === 'turn').length;
      this.explanationPanel(area, { skill: r.skill, prompt: 'dance', answer: r.answer, explain: `The robot moved ${moves} ${moves === 1 ? 'square' : 'squares'} and turned ${turns} ${turns === 1 ? 'time' : 'times'}. The green program is the one it followed.` }, () => this.next());
    }
    // The dance starts by itself once the floor is drawn.
    if (s.phase === 'watch' && !s.started) { s.started = true; this.time.delayedCall(600, () => { if (this.state === s && s.phase === 'watch') this.startRun(); }); }
  }

  /** Coloured tiles under the robot so the floor looks like a dance floor. */
  discoFloor() {
    const lv = this.lv(), g = this.add.graphics().setDepth(1);
    for (let y = 0; y < lv.h; y++) for (let x = 0; x < lv.w; x++) {
      if (lv.walls[y][x]) continue;
      g.fillStyle(FLOOR_TINTS[(x * 3 + y * 5 + this.state.idx) % FLOOR_TINTS.length], 0.28);
      g.fillRect(this.mazeOrigin.x + x * this.cell + 2, this.mazeOrigin.y + y * this.cell + 2, this.cell - 4, this.cell - 4);
    }
    if (this.robotSprite) this.robotSprite.setDepth(3);
  }

  /** Every move and turn throws a music note off the robot. */
  applyStep(step, next) {
    if ((step.kind === 'move' || step.kind === 'turn') && this.robotSprite && this.robotSprite.active) {
      const sp = this.robotSprite, ui = this.ui;
      const n = this.add.text(sp.x + (Math.random() - 0.5) * this.cell, sp.y - this.cell * 0.3, NOTES[Math.floor(Math.random() * NOTES.length)], { fontFamily: FONT, fontSize: Math.round(20 * ui) + 'px', color: hex(FLOOR_TINTS[Math.floor(Math.random() * FLOOR_TINTS.length)]), fontStyle: WEIGHT.heavy }).setOrigin(0.5).setDepth(4);
      this.tweens.add({ targets: n, y: n.y - this.cell * 0.9, alpha: 0, angle: (Math.random() - 0.5) * 40, duration: 700, ease: 'Sine.Out', onComplete: () => n.destroy() });
    }
    super.applyStep(step, next);
  }

  onRunEnd() {
    const s = this.state;
    if (s.phase === 'watch') s.phase = 'pick';
    this.rebuild();
  }

  replay() {
    const s = this.state;
    if (s.phase !== 'pick' || s.running || s.busy) return;
    this.startRun();
  }

  pick(i) {
    const s = this.state, r = this.round();
    if (s.phase !== 'pick' || s.running || s.busy) return;
    const right = !!r.choices[i].right;
    s.picked = i; s.phase = 'result';
    this.logQuestion({ skill: r.skill, prompt: 'Which program made the robot dance?', answer: r.answer }, right);
    if (right) { s.correct += 1; this.correctFeedback(); }
    else { s.missed[r.skill] = (s.missed[r.skill] || 0) + 1; this.wrongFeedback(); }
    this.rebuild();
  }

  next() {
    const s = this.state;
    if (s.idx + 1 >= ROUNDS) {
      const stars = s.correct >= 6 ? 3 : s.correct >= 5 ? 2 : s.correct >= 4 ? 1 : 0;
      const missedSkills = Object.entries(s.missed).sort((a, b) => b[1] - a[1]).map(([k]) => k);
      return this.finish({ stars, correct: s.correct, total: ROUNDS, missedSkills });
    }
    s.idx += 1;
    s.phase = 'watch'; s.picked = null; s.started = false;
    Object.assign(s, this.robotState(this.round().level));
    this.runToken += 1; this.gen = null;
    this.rebuild();
  }
}
