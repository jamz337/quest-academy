import { MazeGameScene } from './MazeGameScene.js';
import { BlockEditor, newEditorState } from './BlockEditor.js';
import { THEME } from '../../../ui/theme.js';
import { bugLevelsForBand } from '../../../data/coding/levels.js';
import { cloneProgram } from '../../../generators/coding/ast.js';
import { toast } from '../../../ui/Toast.js';

const PUZZLES = 5;

/** Bug Hunt: a program with one wrong block is pre-loaded; fix it so the robot reaches the flag. */
export class BugHunt extends MazeGameScene {
  constructor() { super('MG_BugHunt'); }

  initState() {
    const pool = bugLevelsForBand(this.payload.band);
    const puzzles = this.rng.sample(pool, Math.min(PUZZLES, pool.length));
    return {
      puzzles, idx: 0, program: cloneProgram(puzzles[0].program), editor: newEditorState(),
      attempts: 0, puzzleRuns: 0, solvedCount: 0, ...this.robotState(puzzles[0].level)
    };
  }

  puzzle() { return this.state.puzzles[this.state.idx]; }
  progressLabel() { return `${Math.min(this.state.idx + 1, this.state.puzzles.length)} / ${this.state.puzzles.length}`; }
  progressRatio() { return this.state.idx / this.state.puzzles.length; }
  level() { return this.puzzle().level; }
  palette() { return this.puzzle().level.blocks; }
  maxBlocks() { return this.puzzle().level.maxBlocks; }

  buildGame(area) {
    const s = this.state, p = this.puzzle();
    const L = this.layout(area);
    this.drawInfo(L.infoRect, `\u{1F41B} ${p.level.title}`, p.hint);
    this.drawMaze(L.mazeRect);
    const extra = s.puzzleRuns >= 3 ? [{ label: 'Skip', variant: 'brand', onClick: () => this.skip() }] : [];
    this.editor = new BlockEditor(this, L.editorRect, {
      program: s.program, editor: s.editor, palette: this.palette(), maxBlocks: this.maxBlocks(),
      locked: s.running || s.busy, runningUid: s.runningUid,
      onChange: () => this.onEditorChange(),
      controls: this.editorControls(extra)
    });
  }

  onRunEnd(outcome) {
    const s = this.state;
    if (outcome.solved) {
      s.solvedCount += 1;
      this.correctFeedback();
      toast(this, 'Bug fixed!', { icon: 'star', accent: THEME.success });
      const token = this.runToken;
      this.time.delayedCall(1000, () => { if (token === this.runToken && !this.finished) this.nextPuzzle(); });
      return;
    }
    s.puzzleRuns += 1;
    super.onRunEnd(outcome);
  }

  skip() {
    toast(this, 'Skipped. On to the next bug!', { accent: THEME.brand });
    this.nextPuzzle();
  }

  nextPuzzle() {
    const s = this.state;
    s.idx += 1;
    if (s.idx >= s.puzzles.length) {
      const solvedAll = s.solvedCount === s.puzzles.length;
      let stars = 0;
      if (s.solvedCount > 0) stars = s.attempts <= 5 ? 3 : s.attempts <= 8 ? 2 : solvedAll ? 1 : 0;
      return this.finish({ stars, correct: s.solvedCount, total: s.puzzles.length, attempts: s.attempts });
    }
    s.program = cloneProgram(this.puzzle().program);
    s.editor = newEditorState();
    s.puzzleRuns = 0;
    Object.assign(s, this.robotState(this.puzzle().level));
    this.runToken += 1; this.gen = null;
    this.rebuild();
  }
}
