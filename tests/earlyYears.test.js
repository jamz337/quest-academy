// Pre-K, Kindergarten and Grade 1: grades, which games each sees, listen-and-tap, and the early content.
import { describe, it, expect, vi } from 'vitest';
import { installPhaserMock, fakeSystems, findButton, click, flushTimers } from './helpers/phaserMock.js';

installPhaserMock();
vi.mock('../src/systems/Speech.js', async (importOriginal) => ({ ...(await importOriginal()), canSpeak: () => true, speak: vi.fn(), speakWords: () => null, stop: () => {} }));

const G = await import('../src/data/grades.js');
const { GRADES } = await import('../src/constants.js');
const { MINIGAMES, EARLY_GAMES, gamesForGrade, getGame } = await import('../src/data/minigames.js');
const { gameGrade, effectiveGrade } = await import('../src/systems/Progression.js');
const { earlyQuestion, earlySet, picturePattern } = await import('../src/generators/math/early.js');
const { generateQuestion } = await import('../src/generators/math/arithmetic.js');
const { generateRound: patternRound } = await import('../src/generators/math/patterns.js');
const { earlyReadingQuestion, earlyMatchRounds } = await import('../src/generators/english/early.js');
const { wordsQuestion } = await import('../src/generators/boss.js');
const { bibleQuestion, generateRounds: bibleRounds } = await import('../src/generators/bible/quiz.js');
const { danceRound } = await import('../src/generators/coding/dance.js');
const { levelsForBand } = await import('../src/data/coding/levels.js');
const { runToEnd } = await import('../src/generators/coding/interpreter.js');
const { speakable, speak } = await import('../src/systems/Speech.js');
const { spokenAnswer } = await import('../src/ui/AnswerSpeech.js');
const { listsForGrade, listWords } = await import('../src/data/spelling/lists.js');
const { newProfile } = await import('../src/systems/SaveSystem.js');
const { Rng } = await import('../src/systems/Rng.js');
const Store = await import('../src/systems/Store.js');
const { CountIt } = await import('../src/scenes/minigames/math/CountIt.js');
const { LetterTrace } = await import('../src/scenes/minigames/english/LetterTrace.js');
const { ModeSelectScene } = await import('../src/scenes/ModeSelectScene.js');
const { ChallengeMenuScene } = await import('../src/scenes/ChallengeMenuScene.js');
const { launch } = await import('../src/systems/MinigameLauncher.js');

globalThis.localStorage = { data: {}, getItem(k) { return this.data[k] ?? null; }, setItem(k, v) { this.data[k] = v; }, removeItem(k) { delete this.data[k]; } };
Store.init();
Store.createProfile({ name: 'Tiny', grade: -1 });
const setGrade = (g) => Store.updateProfile((p) => { p.grade = g; });

describe('grades', () => {
  it('run from Pre-K to Grade 8, with Kindergarten kept as grade 0 (never defaulted away)', () => {
    expect(GRADES).toEqual([-1, 0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(G.gradeOf(0)).toBe(0); expect(G.gradeOf(undefined)).toBe(3); expect(G.gradeOf('x', 4)).toBe(4); expect(G.gradeOf(-1)).toBe(-1);
    expect(G.bandFor(-1)).toBe('E'); expect(G.bandFor(0)).toBe('E'); expect(G.bandFor(1)).toBe('A'); expect(G.bandFor(4)).toBe('B');
    expect(G.isEarly(0)).toBe(true); expect(G.isEarly(1)).toBe(false);
    expect([-1, 0, 1, 5].map((g) => G.gradeLabel(g))).toEqual(['Pre-K', 'Kindergarten', 'Grade 1', 'Grade 5']);
    expect(G.gradeLabel(0, true)).toBe('K');
    expect(G.tuningFor({ band: 'E' }).questionTimeMs).toBe(Infinity);
    const k = newProfile({ name: 'K', grade: 0 });
    expect(gameGrade(k, 'math-dash')).toBe(0);                 // not Grade 3!
    k.games['math-dash'] = { gradeUp: 1 };
    expect(gameGrade(k, 'math-dash')).toBe(1);
    expect(gameGrade(newProfile({ name: 'P', grade: -1 }), 'math-dash', -5)).toBe(-1);   // never below Pre-K
    expect(effectiveGrade(k, 'math')).toBe(0);
  });

  it('each grade sees the games that suit it: early games for the youngest, reading-heavy ones from Grade 1', () => {
    const ids = (subject, g) => gamesForGrade(subject, g).map((x) => x.id);
    expect(ids('math', -1)).toEqual(['math-count', 'math-dash', 'math-bridge', 'math-balloons']);
    expect(ids('words', -1)).toEqual(['eng-trace', 'eng-match', 'eng-frog']);
    expect(ids('words', 0)).toEqual(['eng-trace', 'eng-builder', 'eng-match', 'eng-frog']);
    expect(ids('code', 0)).toEqual(['code-maze', 'code-dance']);
    expect(ids('bible', 0)).toEqual(['bible-quiz', 'bible-match', 'bible-ark']);
    expect(ids('words', 1)).toContain('eng-grammar'); expect(ids('words', 1)).toContain('eng-trace');
    expect(ids('math', 2)).not.toContain('math-count');            // Grade 2 and up: the world's games only
    expect(gamesForGrade('math', 2)).toHaveLength(4);
    expect(MINIGAMES.some((x) => x.id === 'math-count')).toBe(false);   // early games stay out of quests and badges
    expect(getGame('eng-trace').sceneKey).toBe('MG_LetterTrace');
    expect(EARLY_GAMES.every((x) => x.maxGrade === 1)).toBe(true);
  });
});

describe('early maths', () => {
  it('Pre-K, K and Grade 1 questions are well formed, explained, and pictures-first for the youngest', () => {
    for (const g of [-1, 0, 1]) for (let seed = 1; seed <= 60; seed++) {
      const q = earlyQuestion(g, new Rng(seed * 13 + g), (seed % 10) / 9);
      expect(q.choices, `${g} ${q.prompt}`).toContain(q.answer);
      expect(new Set(q.choices).size, q.prompt).toBe(q.choices.length);
      expect(q.choices.length).toBeLessThanOrEqual(g <= -1 ? 3 : 4);
      expect(q.explain.length).toBeGreaterThan(1);
      expect(q.ask).toBe(true);
      if (q.skill === 'counting') { expect(q.pics.length).toBe(Number(q.answer)); if (g <= -1) expect(Number(q.answer)).toBeLessThanOrEqual(7); }
    }
    expect(new Set(earlySet(0, new Rng(5), 8).map((q) => q.prompt)).size).toBe(8);
    // Number Dash and Balloon Pop: Pre-K and K get these, Grade 1 adds and takes away within 20.
    expect(generateQuestion(0, new Rng(2), 0.1).ask).toBe(true);
    for (let i = 0; i < 30; i++) { const q = generateQuestion(1, new Rng(i), i / 29); expect(['add', 'sub']).toContain(q.skill); expect(Number(q.answer)).toBeLessThanOrEqual(20); }
  });

  it('Pattern Bridge has picture patterns for Pre-K and K, counting on for Grade 1', () => {
    for (let s = 1; s <= 20; s++) {
      const r = picturePattern(s % 2 ? -1 : 0, new Rng(s));
      expect(r.terms[r.missingIndex]).toBe(r.answer);
      expect(r.choices).toContain(r.answer);
    }
    expect(patternRound(0, new Rng(3)).skill).toBe('picture-patterns');
    const g1 = patternRound(1, new Rng(3));
    expect(g1.skill).toBe('skip-count'); expect(Math.max(...g1.terms)).toBeLessThanOrEqual(100);
  });
});

describe('early reading, Bible and coding', () => {
  it('letters, sounds, rhymes and sight words; Frog Hop asks them; Word Match has one kind per round', () => {
    for (const g of [-1, 0, 1]) for (let s = 1; s <= 40; s++) {
      const q = earlyReadingQuestion(g, new Rng(s * 7 + g), (s % 8) / 7);
      expect(q.choices, q.prompt).toContain(q.answer);
      expect(new Set(q.choices).size, q.prompt).toBe(q.choices.length);
    }
    expect(wordsQuestion(-1, new Rng(1)).ask).toBe(true);
    for (const g of [-1, 0, 1]) {
      const rounds = earlyMatchRounds(g, new Rng(4));
      expect(rounds).toHaveLength(3);
      for (const r of rounds) { expect(r.pairs).toHaveLength(5); expect(new Set(r.pairs.map((p) => p.k)).size).toBe(1); expect(new Set(r.pairs.map((p) => p.r)).size).toBe(5); }
    }
    expect(earlyMatchRounds(-1, new Rng(4))[0].pairs[0].k).toBe('letter-case');
  });

  it('Bible questions have pictures and the Ark asks for the matching animal; no verses before Grade 1', () => {
    const kinds = new Set();
    for (let s = 1; s <= 40; s++) { const q = bibleQuestion(0, new Rng(s)); expect(q.choices).toContain(q.answer); expect(q.skill).not.toBe('verses'); kinds.add(q.prompt.startsWith('Find the other') ? 'animal' : 'other'); }
    expect(kinds.has('animal')).toBe(true);
    expect(bibleRounds(-1, new Rng(2), 8).length).toBe(8);
  });

  it('first mazes solve and dances are two or three steps', () => {
    for (const lv of levelsForBand('E')) expect(runToEnd(lv.solution, lv).solved, lv.id).toBe(true);
    for (let s = 1; s <= 10; s++) { const d = danceRound(new Rng(s), 'E'); expect(d.steps.filter((x) => x.kind === 'move' || x.kind === 'turn').length).toBeLessThanOrEqual(3); }
  });

  it('Spelling Bee lists for Kindergarten and Grade 1', () => {
    expect(listsForGrade(0).map((l) => l.id)).toEqual(['k-1', 'k-2']);
    expect(listsForGrade(-1).map((l) => l.id)).toEqual(['k-1', 'k-2']);
    expect(listsForGrade(1).map((l) => l.id)).toEqual(['g1-1', 'g1-2']);
    expect(listWords(listsForGrade(0)[0]).map((e) => e.w)).toContain('I');
  });

  it('pictures are seen, not said, and picture answers are said by name', () => {
    expect(speakable('How many mangoes?\n🥭🥭🥭')).toBe('How many mangoes?');
    expect(speakable('Move ▲ Turn ◀')).toBe('Move forward Turn left');
    expect(spokenAnswer('🥭🥭🥭')).toBe('three mangoes');
    expect(spokenAnswer('🔺')).toBe('a triangle');
    expect(spokenAnswer('🦒🦒 two by two')).toBe('🦒🦒 two by two');   // words: read as written (the pictures are skipped)
  });
});

describe('listen and tap', () => {
  it('Pre-K and K play without a clock and hear everything', () => {
    setGrade(0);
    const from = { scene: { key: 'ChallengeMenu', pause: vi.fn(), launch: vi.fn() } };
    const pay = launch(from, 'math-count', {});
    expect(pay).toMatchObject({ sceneKey: 'MG_CountIt', grade: 0, band: 'E', timers: false, early: true });
    setGrade(1);
    expect(launch(from, 'math-dash', {})).toMatchObject({ early: false, band: 'A' });
  });

  it('the world opens in Grade 1 and the Spelling Bee in Kindergarten', () => {
    const menu = () => { const s = new ModeSelectScene(); fakeSystems(s); s.go = vi.fn(); s.create({}); return s; };
    setGrade(-1);
    let s = menu();
    expect(findButton(s, 'Explore the World').disabledState).toBe(true);
    expect(findButton(s, 'Spelling Bee').disabledState).toBe(true);
    setGrade(0);
    s = menu();
    expect(findButton(s, 'Explore the World').disabledState).toBe(true);
    expect(findButton(s, 'Spelling Bee').disabledState).toBeFalsy();
    setGrade(1);
    s = menu();
    expect(findButton(s, 'Explore the World').disabledState).toBeFalsy();
  });

  it("a Pre-K child's Challenge menu shows Count It and Letter Trace, not Grammar Gate", () => {
    setGrade(-1);
    const s = new ChallengeMenuScene(); fakeSystems(s); s.create({});
    const titles = s.objs.map((o) => o.text).filter((t) => typeof t === 'string');
    expect(titles).toContain('Count It'); expect(titles).toContain('Letter Trace');
    expect(titles).not.toContain('Grammar Gate'); expect(titles).not.toContain('Fraction Pizza');
  });
});

function makeGame(Cls, payload) {
  const s = new Cls();
  fakeSystems(s);
  s.finish = vi.fn();
  s.needsIntro = () => false;
  s.init({ gameId: 'x', grade: 0, band: 'E', early: true, title: 'T', subject: 'math', context: {}, timers: false, seed: 3, ...payload });
  s.create({});
  return s;
}

describe('the two new games', () => {
  it('Count It: tap the pictures to count them, pick the answer, fill the basket, and finish', () => {
    const s = makeGame(CountIt, { gameId: 'math-count' });
    expect(s.state.questions).toHaveLength(8);
    const i = s.state.questions.findIndex((q) => q.skill === 'counting');
    if (i >= 0) {
      s.state.idx = i; s.rebuild();
      speak.mockClear();
      s.countOne(0); s.countOne(0); s.countOne(1 % s.round.pics.length);
      expect(s.state.tapped.length).toBe(Math.min(2, s.round.pics.length));
      expect(speak).toHaveBeenCalledWith('one', expect.anything());
    }
    s.state.idx = 0; s.state.tapped = []; s.rebuild();
    s.pick(s.round.choices.indexOf(s.round.answer));
    expect(s.state.correct).toBe(1);
    flushTimers(s);
    expect(s.state.idx).toBe(1);
    for (let k = 0; k < 2; k++) s.pick(s.round.choices.findIndex((c) => c !== s.round.answer)); /* twice: the first miss is a second try */
    expect(s.explainIt).toBeTruthy();                        // "Let's see why"
    click(findButton(s, 'Next ▶'));
    while (s.state.idx < 8 && !s.finish.mock.calls.length) { s.pick(s.round.choices.indexOf(s.round.answer)); flushTimers(s); }
    expect(s.finish).toHaveBeenCalledWith(expect.objectContaining({ total: 8 }));
  });

  it('Letter Trace: capitals for Pre-K, small letters for K, words for Grade 1; tracing finishes a round', () => {
    expect(makeGame(LetterTrace, { gameId: 'eng-trace', grade: -1 }).state.items[0].glyph).toMatch(/^[A-Z]$/);
    expect(makeGame(LetterTrace, { gameId: 'eng-trace', grade: 1 }).state.items[0].glyph.length).toBe(3);
    const s = makeGame(LetterTrace, { gameId: 'eng-trace', grade: 0 });
    expect(s.item.glyph).toMatch(/^[a-z]$/);
    expect(findButton(s, 'Skip ▶')).toBeTruthy();
    const r = s.traceRects[0];
    s.traceDown({ x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2 });
    for (let k = 0; k < 10; k++) s.traceMove({ isDown: true, x: (r.x0 + r.x1) / 2 + k, y: (r.y0 + r.y1) / 2 });
    expect(s.traceDone()).toBe(true);
    expect(s.state.finished).toEqual([0]);
    click(findButton(s, 'Next ▶'));
    expect(s.state.idx).toBe(1);
    while (s.state.idx < 6 && !s.finish.mock.calls.length) s.next();
    expect(s.finish).toHaveBeenCalledWith(expect.objectContaining({ correct: 1, total: 6 }));
  });

  it("Letter Trace: with the letter's shape, a quick swipe is not enough; the whole letter has to be traced", () => {
    const s = makeGame(LetterTrace, { gameId: 'eng-trace', grade: -1 });
    const r = s.traceRects[0], f = s.fontPx, cx = (r.x0 + r.x1) / 2;
    // A straight stem of checkpoints, as a browser reads from an "I".
    r.points = Array.from({ length: 20 }, (_, k) => ({ key: `0,${k}`, x: cx, y: r.y0 + f * 0.2 + k * f * 0.03 }));
    s.traceDown({ x: cx, y: r.y0 + f * 0.2 });
    for (let k = 0; k < 4; k++) s.traceMove({ isDown: true, x: cx, y: r.y0 + f * 0.2 + k * f * 0.03 });
    expect(s.traceDone()).toBe(false);
    expect(s.coverage(0)).toBeLessThan(0.75);
    expect(s.label.text).toMatch(/Keep going/);
    for (let k = 4; k < 20; k++) s.traceMove({ isDown: true, x: cx, y: r.y0 + f * 0.2 + k * f * 0.03 });
    expect(s.traceDone()).toBe(true);
    expect(s.state.finished).toEqual([0]);
  });
});
