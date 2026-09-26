import { describe, it, expect, vi } from 'vitest';
import { installPhaserMock, fakeSystems, findButton, click, flushTimers } from './helpers/phaserMock.js';

installPhaserMock();

const { BlockEditor, newEditorState } = await import('../src/scenes/minigames/coding/BlockEditor.js');
const { RoboMaze } = await import('../src/scenes/minigames/coding/RoboMaze.js');
const { BugHunt } = await import('../src/scenes/minigames/coding/BugHunt.js');
const { PredictRobot } = await import('../src/scenes/minigames/coding/PredictRobot.js');
const { emptyProgram, countBlocks, flatten } = await import('../src/generators/coding/ast.js');
const { getLevel } = await import('../src/data/coding/levels.js');

describe('BlockEditor (headless)', () => {
  function make(opts = {}) {
    const scene = fakeSystems({ ui: 1 });
    const program = opts.program || emptyProgram();
    const editor = newEditorState();
    const state = { program, editor };
    let ed;
    const draw = () => { scene.objs.length = 0; ed = new BlockEditor(scene, { x: 0, y: 0, w: 380, h: 300 }, {
      program: state.program, editor: state.editor, palette: opts.palette || ['fwd', 'left', 'right', 'repeat', 'if'], maxBlocks: opts.maxBlocks || 6,
      onChange: draw, controls: { onRun() {}, onStep() {}, onReset() {}, onClear() {}, onSpeed() {} }, ...opts.editorOpts
    }); };
    draw();
    return { scene, state, get ed() { return ed; } };
  }

  it('adds blocks, enters containers, edits counts and conditions', () => {
    const t = make();
    click(findButton(t.scene, 'Repeat N'));
    expect(t.state.program.main).toHaveLength(1);
    const rep = t.state.program.main[0];
    expect(t.state.editor.containerUid).toBe(rep.uid);
    click(findButton(t.scene, 'Move ▲'));
    expect(rep.body).toHaveLength(1);
    expect(findButton(t.scene, '+')).toBeUndefined(); // the Move is selected, not the repeat
    t.ed.tapRow(flatten(t.state.program, 'main')[0]);
    click(findButton(t.scene, '+'));
    expect(rep.n).toBe(4);
    click(findButton(t.scene, 'Done'));
    expect(t.state.editor.containerUid).toBe('main');
    click(findButton(t.scene, 'Turn ▶'));
    expect(t.state.program.main.map((b) => b.op)).toEqual(['repeat', 'right']);
    // select the turn and cycle its op, then move it up
    const rows = flatten(t.state.program, 'main');
    t.ed.tapRow(rows[2]);
    expect(t.state.editor.selectedUid).toBe(t.state.program.main[1].uid);
    click(findButton(t.scene, '⟳'));
    expect(t.state.program.main[1].op).toBe('fwd');
    click(findButton(t.scene, '▲'));
    expect(t.state.program.main.map((b) => b.op)).toEqual(['fwd', 'repeat']);
    // if block: cond cycles, else toggles and receives blocks
    click(findButton(t.scene, 'If path …'));
    expect(t.state.program.main.map((b) => b.op)).toEqual(['fwd', 'if', 'repeat']); // inserted after the selected block
    const iff = t.state.program.main[1];
    click(findButton(t.scene, 'ahead'));
    expect(iff.cond).toBe('left');
    click(findButton(t.scene, 'else'));
    expect(iff.else).toEqual([]);
    expect(t.state.editor.branch).toBe('else');
    click(findButton(t.scene, 'Turn ◀'));
    expect(iff.else.map((b) => b.op)).toEqual(['left']);
    expect(countBlocks(t.state.program)).toBe(5);
    click(findButton(t.scene, 'Move ▲'));
    expect(countBlocks(t.state.program)).toBe(6);
    // full: palette disabled, count stays
    click(findButton(t.scene, 'Move ▲'));
    expect(countBlocks(t.state.program)).toBe(6);
    click(findButton(t.scene, '✕'));
    expect(countBlocks(t.state.program)).toBe(5);
  });

  it('edits F1 through the function tab and highlights a running block', () => {
    const t = make({ palette: ['fwd', 'left', 'right', 'repeat', 'call'] });
    click(findButton(t.scene, 'F1'));
    expect(t.state.editor.view).toBe('F1');
    click(findButton(t.scene, 'Move ▲'));
    expect(t.state.program.functions.F1).toHaveLength(1);
    click(findButton(t.scene, 'Main'));
    click(findButton(t.scene, 'Do F1'));
    expect(t.state.program.main[0].op).toBe('call');
    t.ed.highlight(t.state.program.main[0].uid);
    t.ed.highlight('nope');
  });

  it('read-only editor draws without palette or toolbar', () => {
    const scene = fakeSystems({ ui: 1 });
    const program = { main: [{ uid: 'a', op: 'fwd' }, { uid: 'b', op: 'repeat', n: 2, body: [{ uid: 'c', op: 'left' }] }], functions: {} };
    const ed = new BlockEditor(scene, { x: 0, y: 0, w: 300, h: 200 }, { program, editor: newEditorState(), readOnly: true, runningUid: 'c' });
    expect(findButton(scene, 'Move ▲')).toBeUndefined();
    expect(Object.keys(ed.rowRects)).toEqual(['a', 'b', 'c']);
  });
});

function makeScene(Cls, payload, size) {
  const s = new Cls();
  fakeSystems(s, size);
  s.finish = vi.fn();
  s.init({ gameId: 'x', grade: 4, band: 'B', title: 'T', subject: 'code', context: {}, ...payload });
  s.create({});
  return s;
}

describe('RoboMaze (headless)', () => {
  it('runs a program to the goal and finishes with maze stars', () => {
    const s = makeScene(RoboMaze, { context: { levelId: 'A-01' } });
    expect(s.state.level.id).toBe('A-01');
    expect(findButton(s, 'Move ▲')).toBeTruthy();
    for (let i = 0; i < 4; i++) click(findButton(s, 'Move ▲'));
    expect(countBlocks(s.state.program)).toBe(4);
    click(findButton(s, '▶ Run'));
    expect(s.state.attempts).toBe(1);
    expect(s.state.robot).toEqual({ x: 5, y: 1, dir: 1 });
    expect(s.finish).toHaveBeenCalledWith(expect.objectContaining({ stars: 3, levelId: 'A-01', solved: true, blocksUsed: 4, par: 4, attempts: 1 }));
  });

  it('crashes into walls, resets, and cancels a run on rebuild', () => {
    const s = makeScene(RoboMaze, { context: { levelId: 'A-02' } }, { width: 800, height: 400 });
    click(findButton(s, 'Turn ◀'));
    click(findButton(s, 'Move ▲'));
    click(findButton(s, '▶ Run'));
    expect(s.state.status).toBe('crashed');
    expect(s.state.busy).toBe(true);
    flushTimers(s); // crash delay -> onRunEnd -> rebuild
    expect(s.state.busy).toBe(false);
    expect(s.state.robot).toEqual({ x: 1, y: 1, dir: 0 });
    click(findButton(s, 'Reset'));
    expect(s.state.status).toBe('idle');
    expect(s.state.robot.dir).toBe(1);
    // step mode: one primitive per press
    click(findButton(s, 'Step'));
    expect(s.state.robot.dir).toBe(0);
    expect(s.state.attempts).toBe(2);
    // rebuild mid step-session cancels and returns to start
    s.rebuild();
    expect(s.state.stepping).toBe(false);
    expect(s.state.robot).toEqual({ x: 1, y: 1, dir: 1 });
    click(findButton(s, 'Clear'));
    expect(countBlocks(s.state.program)).toBe(0);
    click(findButton(s, '1x'));
    expect(s.state.editor.speed).toBe(2);
  });
});

describe('BugHunt (headless)', () => {
  it('loads 5 puzzles, solves after a fix, skips after 3 failed runs', () => {
    const s = makeScene(BugHunt, { band: 'A', seed: 3 });
    expect(s.state.puzzles).toHaveLength(5);
    click(findButton(s, '▶ Run'));
    flushTimers(s);
    expect(s.state.solvedCount).toBe(0);
    expect(s.state.puzzleRuns).toBe(1);
    click(findButton(s, '▶ Run')); flushTimers(s);
    click(findButton(s, '▶ Run')); flushTimers(s);
    expect(findButton(s, 'Skip')).toBeTruthy();
    click(findButton(s, 'Skip'));
    expect(s.state.idx).toBe(1);
    // apply the real fix to the second puzzle and run
    const { applyFix } = { applyFix: (p, f) => { const walk = (l) => l && l.forEach((b) => { if (b.uid === f.uid) Object.assign(b, f); walk(b.body); walk(b.then); walk(b.else); }); walk(p.main); Object.values(p.functions || {}).forEach(walk); } };
    applyFix(s.state.program, s.state.puzzles[1].fix);
    click(findButton(s, '▶ Run'));
    expect(s.state.solvedCount).toBe(1);
    flushTimers(s);
    expect(s.state.idx).toBe(2);
    // finish the rest by skipping
    for (let p = 2; p < 5; p++) {
      for (let k = 0; k < 3; k++) { click(findButton(s, '▶ Run')); flushTimers(s); }
      click(findButton(s, 'Skip'));
    }
    expect(s.finish).toHaveBeenCalledWith(expect.objectContaining({ correct: 1, total: 5 }));
  });
});

describe('PredictRobot (headless)', () => {
  it('reveals after a tap and scores the guess', () => {
    const s = makeScene(PredictRobot, { band: 'C', seed: 11 });
    expect(s.state.rounds).toHaveLength(6);
    const end = s.state.rounds[0].end;
    const p = s.cellCenter(end.x, end.y);
    s.tapCell(p.x, p.y);
    expect(s.state.phase).toBe('result');
    expect(s.state.wasRight).toBe(true);
    expect(s.state.correct).toBe(1);
    click(findButton(s, 'Next ▶'));
    expect(s.state.idx).toBe(1);
    // wrong guess: tap the start cell, and rebuild mid-reveal is safe
    const lv = s.lv();
    const sp = s.cellCenter(lv.start.x, lv.start.y);
    s.tweens.add = (cfg) => { s.rebuild(); return {}; }; // rebuild before the first tween completes
    s.tapCell(sp.x, sp.y);
    expect(s.state.phase).toBe('result');
    expect(s.state.wasRight).toBe(false);
    expect(s.state.robot.x).toBe(s.state.rounds[1].end.x);
  });
});

describe('LevelSelectScene (headless)', () => {
  it('shows the profile band, switches tabs and launches a level', async () => {
    const Store = await import('../src/systems/Store.js');
    const { LevelSelectScene } = await import('../src/scenes/LevelSelectScene.js');
    globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
    Store.init();
    Store.createProfile({ name: 'Kid', grade: 5 });
    Store.getProfile().coding.levels['B-01'] = { stars: 2, bestBlocks: 2 };
    const s = new LevelSelectScene();
    fakeSystems(s);
    s.scene.pause = vi.fn(); s.scene.launch = vi.fn(); s.scene.start = vi.fn();
    s.init({ gameId: 'code-maze' });
    s.create({ gameId: 'code-maze' });
    expect(s.band).toBe('B');
    expect(s.objs.filter((o) => o.text === 'B-01')).toHaveLength(1);
    click(findButton(s, 'A · Grades 2-3'));
    expect(s.band).toBe('A');
    expect(s.objs.filter((o) => o.text === 'A-12')).toHaveLength(1);
    const card = s.objs.find((o) => o.kind === 'zone' && o.active);
    card.emit('pointerup');
    expect(s.scene.pause).toHaveBeenCalled();
    expect(s.scene.launch).toHaveBeenCalledWith('MG_RoboMaze', expect.objectContaining({ gameId: 'code-maze', context: { levelId: 'A-01' } }));
    click(findButton(s, '←'));
    expect(s.scene.start).toHaveBeenCalledWith('ChallengeMenu');
  });
});
