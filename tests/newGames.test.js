// The four picture games: generators are pure and checked directly; the scenes run headless against the Phaser mock.
import { describe, it, expect, vi } from 'vitest';
import { installPhaserMock, fakeSystems, findButton, click, flushTimers } from './helpers/phaserMock.js';

installPhaserMock();

const { danceRound, danceRounds } = await import('../src/generators/coding/dance.js');
const { runToEnd } = await import('../src/generators/coding/interpreter.js');
const { programText } = await import('../src/generators/coding/text.js');
const { wordsQuestion } = await import('../src/generators/boss.js');
const { Rng } = await import('../src/systems/Rng.js');
const { BalloonPop } = await import('../src/scenes/minigames/math/BalloonPop.js');
const { introFor, introDone } = await import('../src/scenes/minigames/math/BalloonIntro.js');
const { explainParts, explainReveals } = await import('../src/scenes/minigames/math/BalloonExplain.js');
const { FrogHop } = await import('../src/scenes/minigames/english/FrogHop.js');
const { RobotDance } = await import('../src/scenes/minigames/coding/RobotDance.js');
const { ArkAnimals } = await import('../src/scenes/minigames/bible/ArkAnimals.js');
const { MINIGAMES } = await import('../src/data/minigames.js');
const { NPCS } = await import('../src/data/world/npcs.js');
const { NPC_STYLES } = await import('../src/data/avatars.js');
const { ERRANDS } = await import('../src/data/world/errands.js');
const { BADGES } = await import('../src/data/badges.js');
const { newProfile } = await import('../src/systems/SaveSystem.js');

describe('Robot Dance rounds', () => {
  it('offer three programs of which exactly one matches the dance, and the others end elsewhere', () => {
    for (const band of ['A', 'B', 'C']) for (let seed = 0; seed < 12; seed++) {
      const r = danceRound(new Rng(seed * 3 + band.charCodeAt(0)), band);
      expect(r.choices).toHaveLength(3);
      expect(r.choices.filter((c) => c.right)).toHaveLength(1);
      expect(r.choices.find((c) => c.right).text).toBe(programText(r.program.main));
      expect(new Set(r.choices.map((c) => c.text)).size).toBe(3);
      expect(r.steps.some((s) => s.kind === 'move')).toBe(true);
      for (const c of r.choices) if (!c.right) expect(c.text).not.toBe(r.answer);
      const end = runToEnd(r.program, r.level).end;
      expect(end).toEqual(r.end);
    }
    expect(danceRounds(new Rng(1), 'B', 6)).toHaveLength(6);
  });
});

describe('registry', () => {
  it('every new game has a villager with a sprite, a house errand and a scene', () => {
    for (const id of ['math-balloons', 'eng-frog', 'code-dance', 'bible-ark']) {
      const g = MINIGAMES.find((x) => x.id === id);
      expect(g).toBeTruthy();
      const npc = NPCS.find((n) => n.id === g.npc);
      expect(npc?.gameId).toBe(id);
      expect(Number(npc.sprite.replace('npc', ''))).toBeLessThan(NPC_STYLES.length);
      expect(ERRANDS.find((e) => e.npc === npc.id)).toBeTruthy();
    }
    expect(MINIGAMES.filter((g) => g.subject === 'bible')).toHaveLength(4);
    const p = newProfile({ name: 'A' });
    for (const g of MINIGAMES) p.games[g.id] = { bestStars: 3 };
    for (const id of ['math-star', 'word-wizard', 'code-captain', 'bible-scholar']) expect(BADGES.find((b) => b.id === id).test(p, null)).toBe(true);
    p.games['math-balloons'] = { bestStars: 2 };
    expect(BADGES.find((b) => b.id === 'math-star').test(p, null)).toBe(false);
  });

  it('English questions for Frog Hop are valid multiple choice', () => {
    for (const grade of [2, 5, 8]) for (let i = 0; i < 20; i++) {
      const q = wordsQuestion(grade, new Rng(grade * 100 + i));
      expect(q.choices).toContain(q.answer);
      expect(q.choices.length).toBeGreaterThanOrEqual(3);
      expect(q.skill).toBeTruthy();
    }
  });
});

function makeScene(Cls, payload, size) {
  const s = new Cls();
  fakeSystems(s, size);
  s.finish = vi.fn();
  s.init({ gameId: 'x', grade: 3, band: 'A', title: 'T', subject: 'math', context: {}, timers: true, ...payload });
  s.create({});
  return s;
}

describe('Balloon Pop (headless)', () => {
  it('pops the right balloon, deflates a wrong one, times out when the answer floats away, and finishes', () => {
    const s = makeScene(BalloonPop, { gameId: 'math-balloons', seed: 7 });
    expect(s.state.questions).toHaveLength(10);
    const skipIntro = () => { if (findButton(s, 'Got it!')) click(findButton(s, 'Got it!')); };   // a brand-new skill gets its worked example first
    skipIntro();
    // After a miss the working appears a step at a time; Got it! comes once it is all out.
    const walkExplanation = () => {
      flushTimers(s);
      expect(s.state.explain).toBe(1);
      for (let g = 0; g < 10 && findButton(s, 'Next step ▶'); g++) click(findButton(s, 'Next step ▶'));
      click(findButton(s, 'Got it!'));
    };
    expect(s.balloonSprites.filter(Boolean)).toHaveLength(4);
    const q = () => s.state.questions[s.state.idx];
    // right answer
    let i = s.state.balloons.findIndex((b) => String(b.choice) === String(q().answer));
    s.balloonSprites[i].emit('pointerdown');
    expect(s.state.correct).toBe(1);
    expect(s.state.balloons[i].state).toBe('popped');
    flushTimers(s);
    expect(s.state.idx).toBe(1);
    // wrong answer: explanation with Next
    skipIntro();
    i = s.state.balloons.findIndex((b) => String(b.choice) !== String(q().answer));
    s.balloonSprites[i].emit('pointerdown');
    expect(s.state.balloons[i].state).toBe('sad');
    expect(s.state.balloons.find((b) => String(b.choice) === String(q().answer)).state).toBe('glow');
    walkExplanation();
    expect(s.state.idx).toBe(2);
    // a second tap while locked does nothing; the answer floating past the top counts as a miss
    skipIntro();
    s.update(0, 16);
    s.state.balloons.forEach((b) => { b.y = 1.2; });
    s.update(100, 16);
    expect(s.state.locked).toBe(true); expect(s.state.right).toBe(false);
    walkExplanation();
    while (!s.finish.mock.calls.length) {
      skipIntro();
      const j = s.state.balloons.findIndex((b) => String(b.choice) === String(q().answer));
      s.balloonSprites[j].emit('pointerdown'); flushTimers(s);
    }
    expect(s.finish).toHaveBeenCalledWith(expect.objectContaining({ correct: 8, total: 10 }));
    expect(s.qlog).toHaveLength(10);
    expect(s.qlog[1].choices).toHaveLength(4);
  });
});

describe('Balloon Pop new-skill intro', () => {
  it('walks small take-aways on the number line and hides other working behind step balloons', () => {
    const line = introFor({ prompt: '13 − 4', answer: 9, skill: 'sub' }, ['a', 'b']);
    expect(line).toMatchObject({ mode: 'line', a: 13, b: 4, dir: -1, popped: 0 });
    expect(introFor({ prompt: '5 + 6', answer: 11, skill: 'add' }, [])).toMatchObject({ mode: 'line', a: 5, b: 6, dir: 1 });
    expect(introFor({ prompt: '5 + 16', answer: 21, skill: 'add' }, ['x'])).toMatchObject({ mode: 'steps' });
    expect(introDone(line)).toBe(false);
    line.popped = 4;
    expect(introDone(line)).toBe(true);
    const big = introFor({ prompt: '356 − 128', answer: 228, skill: 'sub' }, ['one', 'two', 'three']);
    expect(big).toMatchObject({ mode: 'steps' });
    big.popped = 2; expect(introDone(big)).toBe(false);
    big.popped = 3; expect(introDone(big)).toBe(true);
  });

  it('pops in order, keeps its progress across a rebuild, and Got it! starts the game', () => {
    const s = makeScene(BalloonPop, { gameId: 'math-balloons', grade: 2, seed: 7 });
    s.state.intro = introFor({ prompt: '13 − 4', answer: 9, skill: 'sub' }, []);
    s.rebuild();
    const balloonNamed = (n) => s.objs.find((o) => o.active && o.numText && o.numText.text === String(n) && o.handlers.pointerdown);
    balloonNamed(10).emit('pointerdown');          // out of order: nothing happens
    expect(s.state.intro.popped).toBe(0);
    balloonNamed(12).emit('pointerdown');
    expect(s.state.intro.popped).toBe(1);
    s.rebuild();
    expect(s.state.intro.popped).toBe(1);
    for (const n of [11, 10, 9]) balloonNamed(n).emit('pointerdown');
    expect(introDone(s.state.intro)).toBe(true);
    click(findButton(s, 'Got it!'));
    expect(s.state.intro).toBeNull();
    expect(s.balloonSprites.filter(Boolean)).toHaveLength(4);
  });
});

describe('Balloon Pop explanation', () => {
  it('splits the working from the answer and the check, revealing them in turn', () => {
    const parts = explainParts(['Take away 10 first: 89 − 10 = 79.', 'Now take away 7: 79 − 7 = 72.', 'So 89 − 17 = 72.', 'Check it: 72 + 17 = 89.']);
    expect(parts).toEqual({ work: ['Take away 10 first: 89 − 10 = 79.', 'Now take away 7: 79 − 7 = 72.'], so: '89 − 17 = 72', check: '72 + 17 = 89.' });
    expect(explainReveals(parts)).toBe(3);
    expect(explainReveals(explainParts(['Multiply the tops.', 'Multiply the bottoms.']))).toBe(2);
  });
});

describe('Frog Hop (headless)', () => {
  it('hops to the right pad and splashes on a wrong one', () => {
    const s = makeScene(FrogHop, { gameId: 'eng-frog', subject: 'words', grade: 4, band: 'B', seed: 3 });
    expect(s.state.rounds).toHaveLength(10);
    const q = () => s.state.rounds[s.state.idx];
    let i = q().choices.findIndex((c) => c === q().answer);
    s.padSprites[i].emit('pointerdown');
    expect(s.state.right).toBe(true);
    flushTimers(s);
    expect(s.state.idx).toBe(1);
    i = q().choices.findIndex((c) => c !== q().answer);
    s.padSprites[i].emit('pointerdown');
    expect(s.state.right).toBe(false);
    flushTimers(s);   // splash, then the rebuild that shows the explanation
    expect(findButton(s, 'Next ▶')).toBeTruthy();
    click(findButton(s, 'Next ▶'));
    expect(s.state.idx).toBe(2);
    expect(s.state.correct).toBe(1);
  });
});

describe('Robot Dance (headless)', () => {
  it('dances by itself, then scores the chosen program', () => {
    const s = makeScene(RobotDance, { gameId: 'code-dance', subject: 'code', grade: 5, band: 'B', seed: 11 });
    expect(s.state.phase).toBe('watch');
    flushTimers(s);   // the dance starts, and under the mock plays through at once
    expect(s.state.phase).toBe('pick');
    expect(s.state.robot).toEqual(s.round().end);
    const cards = () => s.objs.filter((o) => typeof o.onTap === 'function' && o.active && !o.label);
    expect(cards()).toHaveLength(3);
    const right = s.round().choices.findIndex((c) => c.right);
    click(cards()[right]);
    expect(s.state.phase).toBe('result');
    expect(s.state.correct).toBe(1);
    click(findButton(s, 'Next ▶'));
    expect(s.state.idx).toBe(1);
    flushTimers(s);
    const wrong = s.round().choices.findIndex((c) => !c.right);
    click(cards()[wrong]);
    expect(findButton(s, 'Next ▶')).toBeTruthy();   // from the explanation panel
    click(findButton(s, 'Next ▶'));
    expect(s.state.idx).toBe(2);
    click(findButton(s, '▶ Watch again') || { emit() {} });
  });
});

describe('All Aboard the Ark (headless)', () => {
  it('boards a pair per right answer and ends with the finale', () => {
    const s = makeScene(ArkAnimals, { gameId: 'bible-ark', subject: 'bible', grade: 3, band: 'A', seed: 5 });
    expect(s.state.questions).toHaveLength(8);
    const q = () => s.state.questions[s.state.idx];
    click(findButton(s, q().answer));
    expect(s.state.right).toBe(true);
    flushTimers(s);
    expect(s.state.boarded).toBe(1);
    expect(s.state.idx).toBe(1);
    click(findButton(s, q().choices.find((c) => c !== q().answer)));
    expect(s.state.right).toBe(false);
    click(findButton(s, 'Next ▶'));
    expect(s.state.boarded).toBe(1);
    while (!s.state.finale) { click(findButton(s, q().answer)); flushTimers(s); }
    expect(s.state.boarded).toBe(7);
    flushTimers(s);
    expect(s.finish).toHaveBeenCalledWith(expect.objectContaining({ correct: 7, total: 8 }));
  });
});
