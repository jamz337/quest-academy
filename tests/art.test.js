// Studio Summit: the facts and generators are checked directly; the quiz and the Pre-K play version run headless.
import { describe, it, expect, vi } from 'vitest';
import { installPhaserMock, fakeSystems, findButton, click, flushTimers } from './helpers/phaserMock.js';

installPhaserMock();
vi.mock('../src/systems/Speech.js', async (importOriginal) => ({ ...(await importOriginal()), canSpeak: () => true, speak: vi.fn(), speakWords: () => null, stop: () => {} }));

const { artQuestion, artSet, artMix, ART_GAMES } = await import('../src/generators/art/questions.js');
const F = await import('../src/data/art/facts.js');
const { ART_PLAY_SETS } = await import('../src/data/art/play.js');
const { targetOf, makePlayAsks } = await import('../src/data/touchPlay.js');
const { ArtQuiz } = await import('../src/scenes/minigames/art/ArtQuiz.js');
const { ArtPlay } = await import('../src/scenes/minigames/art/ArtPlay.js');
const { MINIGAMES, getGame, gamesForGrade } = await import('../src/data/minigames.js');
const { SUBJECTS } = await import('../src/constants.js');
const { THEME } = await import('../src/ui/theme.js');
const { SKILL_LABELS } = await import('../src/data/skills.js');
const { SKILL_TIPS } = await import('../src/data/explanations.js');
const { bossQuestions } = await import('../src/generators/boss.js');
const { duelQuestions } = await import('../src/generators/duel.js');
const { Rng } = await import('../src/systems/Rng.js');
const { launch } = await import('../src/systems/MinigameLauncher.js');
const Store = await import('../src/systems/Store.js');

globalThis.localStorage = { data: {}, getItem(k) { return this.data[k] ?? null; }, setItem(k, v) { this.data[k] = v; }, removeItem(k) { delete this.data[k]; } };
Store.init();
Store.createProfile({ name: 'Ari', grade: 3 });

const valid = (q) => q.choices.includes(q.answer) && new Set(q.choices).size === q.choices.length && q.choices.length >= 2 && q.choices.length <= 4
  && q.choices.every((c) => !c.includes('\n') && c.length <= 60) && !!q.skill && Array.isArray(q.explain) && q.explain.length >= 2 && !q.ref;

describe('Studio Summit facts', () => {
  it('every colour has a swatch, every secondary colour mixes from two primaries, every shape tells about itself, and every fact has three distractors', () => {
    for (const c of F.COLOURS) expect(c.swatch).toMatch(/^#[0-9a-f]{6}$/);
    for (const s of F.SECONDARY) { expect(s.mix).toHaveLength(2); s.mix.forEach((m) => expect(F.colourOf(m).primary).toBe(true)); }
    for (const t of F.COLOURED_THINGS) expect(F.colourOf(t.colour), t.name).toBeTruthy();
    for (const s of [...F.FLAT_SHAPES, ...F.SOLID_SHAPES]) expect(s.tells.length).toBeGreaterThan(10);
    for (const f of F.ART_FACTS) { expect(f.pool).toHaveLength(3); expect(['B', 'C']).toContain(f.band); expect(f.a.length).toBeLessThanOrEqual(60); }
    for (const w of [...F.COLOUR_WORDS, ...F.SYMMETRY_WORDS, ...F.SCULPT_WORDS, ...F.ART_WORDS]) expect(w.means.length, w.word).toBeLessThanOrEqual(60);
    for (const k of F.ART_KINDS) expect(k.means.length, k.kind).toBeLessThanOrEqual(60);
    expect(F.SYMMETRIC_LETTERS.some((l) => F.LOPSIDED_LETTERS.includes(l))).toBe(false);
  });

  it('the generators make full, valid, varied sets for every game from Pre-K to Grade 8, with and without painting, and the skills have labels and tips', () => {
    const skills = new Set();
    for (const id of ART_GAMES) for (const g of [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8]) for (let seed = 1; seed <= 5; seed++) {
      const set = artSet(id, g, new Rng(seed * 31 + g), 10);
      expect(set, `${id} grade ${g}`).toHaveLength(10);
      for (const q of set) { expect(valid(q), `${id} ${g} ${q.prompt}`).toBe(true); skills.add(q.skill); if (g <= -1) expect(q.choices.length).toBeLessThanOrEqual(3); }
      const words = artSet(id, g, new Rng(seed), 10, null, { drawn: false });
      expect(words, `${id} grade ${g} words only`).toHaveLength(10);
      words.forEach((q) => { expect(q.swatches).toBeUndefined(); expect(q.mirror).toBeUndefined(); expect(valid(q)).toBe(true); });
    }
    expect(skills.size).toBe(13);
    for (const k of skills) { expect(SKILL_LABELS[k], k).toBeTruthy(); expect(SKILL_TIPS[k], k).toBeTruthy(); }
    // The youngest see paint; the oldest read the colour wheel.
    expect(artSet('art-colours', -1, new Rng(2), 10).filter((q) => q.swatches).length).toBeGreaterThanOrEqual(3);
    expect(artSet('art-colours', 8, new Rng(2), 10).map((q) => q.skill)).toContain('colour-words');
    // A mirror question's answer is the row reversed, and never the row itself.
    const m = artQuestion('art-symmetry', 4, new Rng(5), 0.4);
    if (m.mirror) { expect(m.answer).toBe([...m.mirror].reverse().join('')); expect(m.answer).not.toBe(m.mirror.join('')); }
  });

  it('feeds the subject mix for bosses and a generator for each game in duels, never with anything to paint', () => {
    const boss = bossQuestions('studio', 5, new Rng(2), 12);
    expect(boss).toHaveLength(12); boss.forEach((q) => { expect(valid(q)).toBe(true); expect(q.swatches).toBeUndefined(); });
    for (const id of ART_GAMES) { const d = duelQuestions(id, 2, new Rng(3), 8); expect(d).toHaveLength(8); d.forEach((q) => { expect(valid(q)).toBe(true); expect(q.choices.length).toBeGreaterThanOrEqual(3); expect(q.swatches).toBeUndefined(); }); }
    expect(valid(artMix(4, new Rng(9)))).toBe(true);
  });

  it('is an eighth subject with its own colours and four games in every grade of the Challenge menu', () => {
    expect(SUBJECTS.studio).toMatchObject({ id: 'studio', title: 'Art', zone: 'Studio Summit' });
    expect(THEME.subjects.studio.accent).toBeTruthy();
    expect(Object.keys(SUBJECTS)).toHaveLength(8);
    expect(MINIGAMES.filter((g) => g.subject === 'studio').map((g) => g.id)).toEqual(ART_GAMES);
    for (const g of [-1, 0, 3, 8]) expect(gamesForGrade('studio', g).map((x) => x.id)).toEqual(ART_GAMES);
    for (const id of ART_GAMES) { expect(getGame(id).sceneKey).toBe('MG_ArtQuiz'); expect(getGame(id).playSceneKey).toBe('MG_ArtPlay'); }
  });
});

function makeScene(Cls, payload) {
  const s = new Cls();
  fakeSystems(s);
  s.finish = vi.fn();
  s.needsIntro = () => false;
  s.init({ gameId: 'art-colours', grade: 3, band: 'A', title: 'T', subject: 'studio', context: {}, timers: true, ...payload });
  s.create({});
  return s;
}

describe('the Art quiz (headless)', () => {
  it('asks ten questions per game, gives a second try, explains a second miss, fills the canvas and finishes', () => {
    for (const id of ART_GAMES) for (const grade of [1, 6]) {
      const s = makeScene(ArtQuiz, { gameId: id, seed: 4, grade, band: grade < 4 ? 'A' : 'C' });
      expect(s.state.questions).toHaveLength(10);
      const q = () => s.round;
      s.pick(q().choices.indexOf(q().answer));
      expect(s.state.right).toBe(true);
      expect(s.state.bench).toHaveLength(1);
      flushTimers(s);
      expect(s.state.idx).toBe(1);
      const wrong = q().choices.findIndex((c) => c !== q().answer);
      s.pick(wrong);
      expect(s.state.right).toBe(null);
      s.pick(q().choices.indexOf(q().answer));
      expect(s.state.right).toBe(true);
      flushTimers(s);
      expect(s.state.idx).toBe(2);
      const wrongs = q().choices.map((c, i) => (c !== q().answer ? i : -1)).filter((i) => i >= 0);
      s.pick(wrongs[0]); s.pick(wrongs[1 % wrongs.length]);
      expect(s.state.right).toBe(false);
      click(findButton(s, 'Next ▶'));
      expect(s.state.idx).toBe(3);
      while (!s.finish.mock.calls.length) { s.pick(q().choices.indexOf(q().answer)); flushTimers(s); }
      expect(s.finish).toHaveBeenCalledWith(expect.objectContaining({ total: 10, correct: 9 }));
      expect(s.qlog.length).toBeGreaterThanOrEqual(10);
    }
  });
});

describe('Studio Summit for Pre-K (headless)', () => {
  it('each set has six things with homes and asks that can be answered', () => {
    for (const id of ART_GAMES) {
      const set = ART_PLAY_SETS[id];
      expect(set.items).toHaveLength(6);
      for (const it of set.items) expect(targetOf(set, it), it.name).toBeTruthy();
      expect(makePlayAsks(set, new Rng(1), 3)).toHaveLength(3);
    }
    expect(Object.keys(ART_PLAY_SETS)).toEqual(ART_GAMES);
  });

  it('Pre-K launches the play version; touching sends each thing home, then the asks are answered', () => {
    Store.updateProfile((p) => { p.grade = -1; });
    const from = { scene: { key: 'ChallengeMenu', pause() {}, launch() {} } };
    expect(launch(from, 'art-shapes', {}).sceneKey).toBe('MG_ArtPlay');
    Store.updateProfile((p) => { p.grade = 3; });
    expect(launch(from, 'art-shapes', {}).sceneKey).toBe('MG_ArtQuiz');

    const s = makeScene(ArtPlay, { gameId: 'art-shapes', grade: -1, band: 'E', early: true, timers: false, seed: 2 });
    const st = s.state;
    st.items.forEach((it, i) => { click(findButton(s, it.name)); expect(st.line).toBe(it.line); flushTimers(s); expect(st.home[i]).toBe(true); });
    expect(st.phase).toBe('ask');
    st.asks.forEach((ask) => {
      const right = ask.kind === 'find' ? ask.item : st.items.find((it) => it.target === ask.item.target);
      click(findButton(s, `home ${right.name}`));
      flushTimers(s);
    });
    expect(st.finale).toBe(true);
    expect(st.line).toContain('artist');
    click(findButton(s, 'Done ✓'));
    expect(s.finish).toHaveBeenCalledWith(expect.objectContaining({ correct: 3, total: 3 }));
  });
});
