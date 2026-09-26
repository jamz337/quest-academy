import { MazeGameScene } from './MazeGameScene.js';
import { BlockEditor, newEditorState } from './BlockEditor.js';
import { THEME } from '../../../ui/theme.js';
import { generateRounds } from '../../../generators/coding/programGen.js';
import { text, T } from '../../../ui/TextStyles.js';
import { button } from '../../../ui/Button.js';
import { Sfx } from '../../../systems/Audio.js';
import { pointerPos } from '../../../systems/Layout.js';

const ROUNDS = 6;

/** Predict the Robot: read a program, tap where the robot will stop, then watch it run. */
export class PredictRobot extends MazeGameScene {
  constructor() { super('MG_PredictRobot'); }

  initState() {
    const rounds = generateRounds(this.rng, this.payload.band, ROUNDS);
    return { rounds, idx: 0, phase: 'guess', guess: null, correct: 0, wasRight: null, editor: newEditorState(), ...this.robotState(rounds[0].level) };
  }

  round() { return this.state.rounds[this.state.idx]; }
  progressLabel() { return `${Math.min(this.state.idx + 1, ROUNDS)} / ${ROUNDS}`; }
  progressRatio() { return this.state.idx / ROUNDS; }
  level() { return this.round().level; }
  program() { return this.round().program; }

  /** A rebuild during the reveal skips the animation: the outcome is precomputed. */
  beforeRebuild() {
    const s = this.state;
    if (this.suppressCancel) return;
    if (s.phase === 'reveal' && (s.running || s.busy)) {
      this.runToken += 1; this.gen = null;
      s.running = false; s.busy = false; s.runningUid = null;
      s.robot = { ...this.round().end };
      this.judge();
    }
  }

  buildGame(area) {
    const s = this.state;
    const L = this.layout(area);
    const title = s.phase === 'guess' ? 'Where will the robot stop?' : s.phase === 'reveal' ? 'Watch…' : s.wasRight ? 'Correct!' : 'Not quite!';
    this.drawInfo(L.infoRect, title, s.phase === 'guess' ? 'Read the program, then tap the cell where the robot ends up.' : s.phase === 'result' ? `Score ${s.correct} / ${s.idx + 1}` : '');
    this.drawMaze(L.mazeRect);
    const g = this.add.graphics();
    if (s.guess) {
      const p = this.cellCenter(s.guess.x, s.guess.y);
      g.lineStyle(4, s.phase === 'result' ? (s.wasRight ? THEME.success : THEME.danger) : THEME.gold, 1);
      g.strokeCircle(p.x, p.y, this.cell * 0.34);
    }
    if (s.phase === 'result' && !s.wasRight) {
      const e = this.cellCenter(this.round().end.x, this.round().end.y);
      g.lineStyle(4, THEME.success, 1); g.strokeCircle(e.x, e.y, this.cell * 0.42);
    }
    if (s.phase === 'guess') {
      const lv = this.lv();
      const z = this.add.zone(this.mazeOrigin.x + lv.w * this.cell / 2, this.mazeOrigin.y + lv.h * this.cell / 2, lv.w * this.cell, lv.h * this.cell).setInteractive({ useHandCursor: true });
      z.on('pointerup', (pointer) => { const p = pointerPos(this, pointer); this.tapCell(p.x, p.y); });
    }
    const { ui } = this;
    const footH = 60 * ui;
    const er = { ...L.editorRect, h: L.editorRect.h - footH };
    this.editor = new BlockEditor(this, er, { program: this.program(), editor: s.editor, readOnly: true, runningUid: s.runningUid });
    const fx = er.x + er.w / 2, fy = er.y + er.h + footH / 2;
    if (s.phase === 'result') {
      button(this, fx, fy, Math.min(er.w - 20, 220 * ui), 48 * ui, s.idx + 1 >= ROUNDS ? 'Finish' : 'Next ▶', { variant: 'primary', onClick: () => this.next() });
    } else if (s.phase === 'reveal') text(this, fx, fy, 'Running the program…', T.small(this, THEME.ink2));
    else text(this, fx, fy, 'Tap a floor cell on the maze', T.small(this, THEME.ink2));
  }

  tapCell(px, py) {
    const s = this.state;
    if (s.phase !== 'guess') return;
    const c = this.cellAt(px, py);
    const lv = this.lv();
    if (!c || lv.walls[c.y][c.x]) return;
    Sfx.click();
    s.guess = c;
    s.phase = 'reveal';
    this.startRun();
  }

  judge() {
    const s = this.state, end = this.round().end;
    s.wasRight = !!s.guess && s.guess.x === end.x && s.guess.y === end.y;
    if (s.wasRight) s.correct += 1;
    s.phase = 'result';
  }

  onRunEnd() {
    const s = this.state;
    if (s.phase !== 'reveal') return this.rebuild();
    this.judge();
    if (s.wasRight) this.correctFeedback(); else this.wrongFeedback();
    this.rebuild();
  }

  next() {
    const s = this.state;
    if (s.idx + 1 >= ROUNDS) {
      const stars = s.correct >= 6 ? 3 : s.correct >= 5 ? 2 : s.correct >= 4 ? 1 : 0;
      return this.finish({ stars, correct: s.correct, total: ROUNDS });
    }
    s.idx += 1;
    s.phase = 'guess'; s.guess = null; s.wasRight = null;
    Object.assign(s, this.robotState(this.round().level));
    this.runToken += 1; this.gen = null;
    this.rebuild();
  }
}
