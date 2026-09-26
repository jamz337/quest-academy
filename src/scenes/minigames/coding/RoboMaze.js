import { MazeGameScene } from './MazeGameScene.js';
import { BlockEditor, newEditorState } from './BlockEditor.js';
import { THEME } from '../../../ui/theme.js';
import * as Store from '../../../systems/Store.js';
import { starsForMaze } from '../../../systems/Progression.js';
import { getLevel, nextUnsolvedLevel } from '../../../data/coding/levels.js';
import { paletteFor } from '../../../data/coding/blocks.js';
import { emptyProgram, countBlocks } from '../../../generators/coding/ast.js';
import { toast } from '../../../ui/Toast.js';

/** Robo Maze: build a block program that walks the robot to the flag (collecting every coin). */
export class RoboMaze extends MazeGameScene {
  constructor() { super('MG_RoboMaze'); }

  initState() {
    const ctx = this.payload.context || {};
    const level = getLevel(ctx.levelId) || nextUnsolvedLevel(Store.getProfile(), this.payload.band);
    return { level, program: emptyProgram(), editor: newEditorState(), attempts: 0, ...this.robotState(level) };
  }

  progressLabel() { return `Level ${this.state.level.id}`; }
  level() { return this.state.level; }
  palette() { return paletteFor(this.state.level, this.payload.band); }
  maxBlocks() { return this.state.level.maxBlocks; }

  buildGame(area) {
    const s = this.state, lv = s.level;
    const L = this.layout(area);
    this.drawInfo(L.infoRect, `${lv.id} · ${lv.title}`, lv.hint);
    this.drawMaze(L.mazeRect);
    this.editor = new BlockEditor(this, L.editorRect, {
      program: s.program, editor: s.editor, palette: this.palette(), maxBlocks: this.maxBlocks(),
      locked: s.running || s.busy, runningUid: s.runningUid,
      onChange: () => this.onEditorChange(),
      controls: this.editorControls()
    });
  }

  onRunEnd(outcome) {
    if (!outcome.solved) return super.onRunEnd(outcome);
    const s = this.state, lv = s.level;
    const blocksUsed = countBlocks(s.program);
    const stars = starsForMaze({ solved: true, blocksUsed, par: lv.par, attempts: s.attempts });
    this.correctFeedback();
    toast(this, blocksUsed <= lv.par ? 'Goal! Perfect program!' : 'Goal!', { icon: 'star', accent: THEME.success });
    this.finish({ stars, levelId: lv.id, solved: true, blocksUsed, par: lv.par, attempts: s.attempts, delay: 1100 });
  }
}
