// The New Skill page for a board (sail the ship, paint the flag, release the animals...): the villager's ghost hand
// solves one, the child does another on the same board (the hand points when they wait), then the game starts.
// Every board's demo must run to the end without getting stuck, and the real game must be untouched by it.
import { describe, it, expect, vi } from 'vitest';
import { installPhaserMock, fakeSystems, findButton, click, flushTimers } from './helpers/phaserMock.js';

installPhaserMock();
vi.mock('../src/systems/Speech.js', async (importOriginal) => ({ ...(await importOriginal()), canSpeak: () => true, speak: vi.fn(), speakWords: () => null, stop: () => {} }));

const { HistoryQuiz } = await import('../src/scenes/minigames/history/HistoryQuiz.js');
const { ScienceLab } = await import('../src/scenes/minigames/science/ScienceLab.js');
const Store = await import('../src/systems/Store.js');

globalThis.localStorage = { data: {}, getItem(k) { return this.data[k] ?? null; }, setItem(k, v) { this.data[k] = v; }, removeItem(k) { delete this.data[k]; } };
Store.init();
Store.createProfile({ name: 'Pip', grade: 3 });

function makeScene(Cls, payload) {
  const s = new Cls();
  fakeSystems(s);
  s.finish = vi.fn();
  s.needsIntro = () => true;          // every skill is new for this player
  s.markIntroduced = vi.fn();
  s.init({ title: 'T', context: {}, timers: true, band: 'A', ...payload });
  s.create({});
  return s;
}

/** A game with a round on this board, jumped to it with its New Skill page fresh. */
function sceneWith(Cls, gameId, subject, grade, key) {
  for (let seed = 1; seed < 60; seed++) {
    const s = makeScene(Cls, { gameId, subject, grade, seed });
    const i = s.state.questions.findIndex((q) => q[key]);
    if (i < 0) continue;
    s.state.idx = i; s.state.intro = null; s.state.boardIntro = null; s.state.introduced = {}; s.introRound = null;
    s.rebuild();
    if (s.state.boardIntro) return s;
  }
  throw new Error(`no ${key} board for ${gameId} at grade ${grade}`);
}

const CASES = [
  [HistoryQuiz, 'his-compass', 'history', 4, 'sail'], [HistoryQuiz, 'his-compass', 'history', 4, 'needle'],
  [HistoryQuiz, 'his-helpers', 'history', 2, 'call'], [HistoryQuiz, 'his-helpers', 'history', 2, 'kit'], [HistoryQuiz, 'his-helpers', 'history', 5, 'budget'],
  [HistoryQuiz, 'his-flags', 'history', 3, 'paint'], [HistoryQuiz, 'his-flags', 'history', 3, 'fly'], [HistoryQuiz, 'his-flags', 'history', 3, 'pairs'],
  [ScienceLab, 'sci-habitat', 'science', 2, 'release'], [ScienceLab, 'sci-habitat', 'science', 2, 'survive'], [ScienceLab, 'sci-habitat', 'science', 5, 'chain']
];

describe('a board teaches itself: watch the hand, then you', () => {
  for (const [Cls, gameId, subject, grade, key] of CASES) {
    it(`${gameId}: ${key}`, () => {
      const s = sceneWith(Cls, gameId, subject, grade, key);
      const bi = s.state.boardIntro, idx = s.state.idx, real = s.state.questions[idx];
      expect(bi.phase).toBe('demo');
      expect(bi.demo[key]).toBeTruthy(); expect(bi.practice[key]).toBeTruthy();
      expect(JSON.stringify(bi.demo)).not.toBe(JSON.stringify(bi.practice));
      expect(s.round).toBe(bi.demo);
      expect(findButton(s, 'Skip')).toBeTruthy();
      // The hand plays the demo to its end.
      for (let n = 0; n < 300 && bi.phase === 'demo'; n++) flushTimers(s);
      expect(bi.phase).toBe('shown');
      click(findButton(s, 'Your turn ▶'));
      expect(bi.phase).toBe('try');
      expect(s.round).toBe(bi.practice);
      // Waiting brings the pointing hand (except on pairs before a card is turned).
      flushTimers(s);
      if (key !== 'pairs') expect(bi.hinted).toBeGreaterThan(0);
      // The child's own moves (here, the moves the hand would point to) win the try.
      for (let n = 0; n < 80 && bi.phase === 'try'; n++) {
        const st = s.interState(), step = s.demoNext(s.round, st, false);
        if (step) step.run();
        else if (key === 'pairs') s.pairsTap(s.round.pairs.cards.findIndex((c) => !st.matched.includes(c.code)));
        flushTimers(s);
      }
      expect(bi.phase).toBe('done');
      click(findButton(s, 'Got it! ▶'));
      expect(s.state.boardIntro).toBeNull();
      expect(s.introRound).toBeNull();
      expect(s.markIntroduced).toHaveBeenCalledWith(real.skill);
      // The game is where it was: the same round, nothing scored, nothing logged.
      expect(s.state.idx).toBe(idx); expect(s.round).toBe(real);
      expect(s.state.correct).toBe(0); expect(s.state.picked).toBe(null);
      expect(s.qlog || []).toHaveLength(0);
    });
  }

  it('a slip on your turn is not scored, and the hand points at once; Watch again replays; Skip goes straight to the game', () => {
    const s = sceneWith(ScienceLab, 'sci-habitat', 'science', 2, 'release');
    const bi = s.state.boardIntro;
    for (let n = 0; n < 300 && bi.phase === 'demo'; n++) flushTimers(s);
    click(findButton(s, 'Your turn ▶'));
    const R = s.round.release, a = R.animals[0], wrong = R.homes.find((h) => h.id !== a.home);
    s.releaseDrop(0, wrong.id);
    expect(bi.missed).toBe(1); expect(bi.phase).toBe('try'); expect(s.state.missed).toEqual({});
    flushTimers(s);
    expect(bi.hinted).toBeGreaterThan(0);
    click(findButton(s, '↺ Watch again'));
    expect(bi.phase).toBe('demo'); expect(s.round).toBe(bi.demo);
    expect(s.interState().home.every((h) => !h)).toBe(true);
    click(findButton(s, 'Skip'));
    expect(s.state.boardIntro).toBeNull();
    expect(s.markIntroduced).toHaveBeenCalled();
  });
});
