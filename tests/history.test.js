// History Harbor: the facts, flags and generators are checked directly; the quiz and the Pre-K play version run headless.
import { describe, it, expect, vi } from 'vitest';
import { installPhaserMock, fakeSystems, findButton, click, flushTimers } from './helpers/phaserMock.js';

installPhaserMock();
vi.mock('../src/systems/Speech.js', async (importOriginal) => ({ ...(await importOriginal()), canSpeak: () => true, speak: vi.fn(), speakWords: () => null, stop: () => {} }));

const { historyQuestion, historySet, historyMix, HISTORY_GAMES, countryOfLabel, flagCode, MAP_PIC } = await import('../src/generators/history/questions.js');
const F = await import('../src/data/history/facts.js');
const { HISTORY_PLAY_SETS } = await import('../src/data/history/play.js');
const { targetOf, makePlayAsks, playFoundLine, playOtherLine } = await import('../src/data/touchPlay.js');
const { FLAG_CODES, drawFlag, ensureFlag, flagImage, flagKey } = await import('../src/ui/Flags.js');
const { HistoryQuiz } = await import('../src/scenes/minigames/history/HistoryQuiz.js');
const { HistoryPlay } = await import('../src/scenes/minigames/history/HistoryPlay.js');
const { MINIGAMES, getGame, gamesForGrade } = await import('../src/data/minigames.js');
const { SUBJECTS } = await import('../src/constants.js');
const { THEME } = await import('../src/ui/theme.js');
const { SKILL_LABELS } = await import('../src/data/skills.js');
const { SKILL_TIPS } = await import('../src/data/explanations.js');
const { bossQuestions } = await import('../src/generators/boss.js');
const { duelQuestions } = await import('../src/generators/duel.js');
const { speakable } = await import('../src/systems/Speech.js');
const { Rng } = await import('../src/systems/Rng.js');
const { launch } = await import('../src/systems/MinigameLauncher.js');
const Store = await import('../src/systems/Store.js');

globalThis.localStorage = { data: {}, getItem(k) { return this.data[k] ?? null; }, setItem(k, v) { this.data[k] = v; }, removeItem(k) { delete this.data[k]; } };
Store.init();
Store.createProfile({ name: 'Pip', grade: 3 });

const valid = (q) => q.choices.includes(q.answer) && new Set(q.choices).size === q.choices.length && q.choices.length >= 2 && q.choices.length <= 4
  && q.choices.every((c) => !c.includes('\n') && c.length <= 60) && !!q.skill && Array.isArray(q.explain) && q.explain.length >= 2 && !q.ref;

describe('History Harbor facts', () => {
  it('directions turn properly, every country has a drawn flag and a continent, events are in order, facts have three distractors', () => {
    for (const d of F.DIRECTIONS) { expect(F.dirOf(d.opposite).opposite).toBe(d.id); expect(F.dirOf(d.right).left).toBe(d.id); expect(F.DIRECTIONS.map((x) => x.id)).toContain(d.left); }
    for (const c of F.DIRECTION_CLUES) expect(F.dirOf(c.answer)).toBeTruthy();
    expect(F.HARBOUR_MAP.map((s) => s.dir).sort()).toEqual(['east', 'north', 'south', 'west']);
    for (const c of F.COUNTRIES) { expect(FLAG_CODES, c.name).toContain(c.code); expect(F.CONTINENTS).toContain(c.continent); expect(c.capital).toBeTruthy(); }
    expect(new Set(F.COUNTRIES.map((c) => c.code)).size).toBe(F.COUNTRIES.length);
    expect(new Set(F.HELPERS.map((h) => h.name)).size).toBe(F.HELPERS.length);
    for (let i = 1; i < F.EVENTS.length; i++) expect(F.EVENTS[i].year).toBeGreaterThan(F.EVENTS[i - 1].year);
    for (const f of [...F.COMMUNITY_FACTS, ...F.WORLD_FACTS, ...F.HISTORY_FACTS]) { expect(f.pool).toHaveLength(3); expect(['B', 'C']).toContain(f.band); expect(f.pool).not.toContain(f.a); expect(f.a.length).toBeLessThanOrEqual(60); }
    for (const w of [...F.MAP_WORDS, ...F.HISTORY_WORDS]) expect(w.means.length).toBeLessThanOrEqual(60);
    expect(MAP_PIC.split('\n')).toHaveLength(3);
  });

  it('draws every flag without complaint and makes each texture once', () => {
    const s = fakeSystems();
    for (const code of FLAG_CODES) expect(() => drawFlag(s.add.graphics(), code)).not.toThrow();
    const made = [];
    const g = s.add.graphics();
    g.generateTexture = (key) => { made.push(key); return g; };
    s.make.graphics = () => g;
    s.textures.exists = (key) => made.includes(key);
    expect(ensureFlag(s, 'bb')).toBe(flagKey('bb'));
    ensureFlag(s, 'bb');
    expect(made).toEqual(['flag-bb']);
    expect(flagImage(s, 10, 10, 60, 60, 'jm')).toBeTruthy();
    expect(made).toEqual(['flag-bb', 'flag-jm']);
  });

  it('the generators make full, valid, varied sets for every game from Pre-K to Grade 8, and the skills have labels and tips', () => {
    const skills = new Set();
    for (const id of HISTORY_GAMES) for (const g of [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8]) for (let seed = 1; seed <= 6; seed++) {
      const set = historySet(id, g, new Rng(seed * 31 + g), 10);
      expect(set, `${id} grade ${g}`).toHaveLength(10);
      expect(new Set(set.map((q) => q.prompt)).size).toBe(10);
      for (const q of set) { expect(valid(q), `${id} ${g} ${q.prompt}`).toBe(true); skills.add(q.skill); if (g <= -1) expect(q.choices.length).toBeLessThanOrEqual(3); }
    }
    expect(skills.size).toBe(15);
    for (const k of skills) { expect(SKILL_LABELS[k], k).toBeTruthy(); expect(SKILL_TIPS[k], k).toBeTruthy(); }
    // The youngest get pictures and people; the oldest reach how a town is run.
    const young = historySet('his-helpers', 0, new Rng(5), 10).map((q) => q.skill), older = historySet('his-helpers', 7, new Rng(5), 10).map((q) => q.skill);
    expect(young.every((k) => k === 'helpers')).toBe(true); expect(older).toContain('community');
    expect(historySet('his-compass', 8, new Rng(2), 10).map((q) => q.skill)).toContain('compass-degrees');
  });

  it('flag questions: the flags-only kind names nothing, the text kind describes the flag, and flag letters are never read aloud', () => {
    const q = historyQuestion('his-flags', -1, new Rng(1), 0);
    expect(q.flagChoices).toBe(true);
    expect(q.choices).toHaveLength(3);
    for (const c of q.choices) { expect(countryOfLabel(c)).toBeTruthy(); expect(c).toBe(flagCode(countryOfLabel(c))); }
    expect(q.text).toMatch(/^Which flag is /);
    for (let i = 0; i < 30; i++) {
      const t = historyQuestion('his-flags', 2, new Rng(i), 1, { drawn: false });
      expect(t.flagChoices).toBeFalsy();
      if (t.skill === 'flags' && !t.text.startsWith('Which part')) expect(t.text).toMatch(/flag is/);
    }
    expect(speakable('🇧🇧 Barbados')).toBe('Barbados');
    expect(speakable(flagCode(F.countryOf('de')))).toBe('');
  });

  it('feeds the subject mix for bosses and a generator for each game in duels, never with drawn flags', () => {
    const boss = bossQuestions('history', 5, new Rng(2), 12);
    expect(boss).toHaveLength(12); boss.forEach((q) => { expect(valid(q)).toBe(true); expect(q.flagChoices).toBeFalsy(); });
    expect(new Set(boss.map((q) => q.skill)).size).toBeGreaterThan(2);
    for (const id of HISTORY_GAMES) { const d = duelQuestions(id, 2, new Rng(3), 8); expect(d).toHaveLength(8); d.forEach((q) => { expect(valid(q)).toBe(true); expect(q.choices.length).toBeGreaterThanOrEqual(3); expect(q.flagChoices).toBeFalsy(); }); }
    expect(valid(historyMix(4, new Rng(9)))).toBe(true);
  });

  it('is a sixth subject with its own colours and four games in every grade of the Challenge menu', () => {
    expect(SUBJECTS.history).toMatchObject({ id: 'history', title: 'History', zone: 'History Harbor' });
    expect(THEME.subjects.history.accent).toBeTruthy();
    expect(Object.keys(SUBJECTS)).toHaveLength(6);
    expect(MINIGAMES.filter((g) => g.subject === 'history').map((g) => g.id)).toEqual(HISTORY_GAMES);
    for (const g of [-1, 0, 3, 8]) expect(gamesForGrade('history', g).map((x) => x.id)).toEqual(HISTORY_GAMES);
    for (const id of HISTORY_GAMES) { expect(getGame(id).sceneKey).toBe('MG_HistoryQuiz'); expect(getGame(id).playSceneKey).toBe('MG_HistoryPlay'); }
  });
});

function makeScene(Cls, payload) {
  const s = new Cls();
  fakeSystems(s);
  s.finish = vi.fn();
  s.needsIntro = () => false;
  s.init({ gameId: 'his-compass', grade: 3, band: 'A', title: 'T', subject: 'history', context: {}, timers: true, ...payload });
  s.create({});
  return s;
}

describe('the History quiz (headless)', () => {
  it('asks ten questions per game, gives a second try, explains a second miss, fills the bench and finishes', () => {
    for (const id of HISTORY_GAMES) {
      const s = makeScene(HistoryQuiz, { gameId: id, seed: 4 });
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

  it('shows flag-only choices as drawn flags with their labels hidden, and logs them as a worded question', () => {
    const s = makeScene(HistoryQuiz, { gameId: 'his-flags', grade: -1, band: 'E', early: true, timers: false, seed: 1 });
    const q = s.round;
    expect(q.flagChoices).toBe(true);
    for (const c of q.choices) { const b = findButton(s, c); expect(b).toBeTruthy(); expect(b.label.visible).toBe(false); }
    s.pick(q.choices.indexOf(q.answer));
    const logged = s.qlog[s.qlog.length - 1];
    expect(logged.answer).toBe(countryOfLabel(q.answer).name.replace(/^the /, (m) => m.charAt(0).toUpperCase() + m.slice(1)));
    expect(logged.prompt).toMatch(/flag is/);
    expect(s.state.bench[0].flag).toBe(countryOfLabel(q.answer).code);
  });
});

describe('History Harbor for Pre-K (headless)', () => {
  it('each set has six things with homes and asks that can be answered; proper names take no article', () => {
    for (const id of HISTORY_GAMES) {
      const set = HISTORY_PLAY_SETS[id];
      expect(set.items).toHaveLength(6);
      for (const it of set.items) expect(targetOf(set, it), it.name).toBeTruthy();
      const asks = makePlayAsks(set, new Rng(1), 3);
      expect(asks).toHaveLength(3);
      expect(new Set(asks.map((a) => a.item.name)).size).toBe(3);
    }
    expect(Object.keys(HISTORY_PLAY_SETS)).toEqual(HISTORY_GAMES);
    const flags = HISTORY_PLAY_SETS['his-flags'];
    const bb = flags.items.find((i) => i.flag === 'bb');
    expect(playFoundLine(flags, bb)).toBe('Yes! Barbados. Island countries!');
    expect(playOtherLine(flags, bb, { line: 'Which flag is from a big country?' })).toBe('That is Barbados. Which flag is from a big country?');
    const time = HISTORY_PLAY_SETS['his-time'];
    expect(playFoundLine(time, time.items[0])).toBe('Yes! The candle. Long ago!');
  });

  it('Pre-K launches the play version; touching sends each thing home, then the asks are answered at the panels', () => {
    Store.updateProfile((p) => { p.grade = -1; });
    const from = { scene: { key: 'ChallengeMenu', pause() {}, launch() {} } };
    expect(launch(from, 'his-flags', {}).sceneKey).toBe('MG_HistoryPlay');
    Store.updateProfile((p) => { p.grade = 3; });
    expect(launch(from, 'his-flags', {}).sceneKey).toBe('MG_HistoryQuiz');

    for (const id of ['his-flags', 'his-time']) {
      const s = makeScene(HistoryPlay, { gameId: id, grade: -1, band: 'E', early: true, timers: false, seed: 2 });
      const st = s.state;
      expect(st.phase).toBe('explore');
      st.items.forEach((it, i) => {
        click(findButton(s, it.name));
        expect(st.line).toBe(it.line);
        flushTimers(s);
        expect(st.home[i]).toBe(true);
        expect(findButton(s, `home ${it.name}`)).toBeTruthy();
      });
      expect(st.phase).toBe('ask');
      st.asks.forEach((ask, i) => {
        const other = st.items.find((it) => (ask.kind === 'find' ? it !== ask.item : it.target !== ask.item.target));
        click(findButton(s, `home ${other.name}`));
        expect(st.askI).toBe(i);
        expect(st.line).toContain(other.name);
        const right = ask.kind === 'find' ? ask.item : st.items.find((it) => it.target === ask.item.target);
        click(findButton(s, `home ${right.name}`));
        expect(st.locked).toBe(true);
        flushTimers(s);
      });
      expect(st.finale).toBe(true);
      expect(st.line).toContain('explorer');
      click(findButton(s, 'Done ✓'));
      expect(s.finish).toHaveBeenCalledWith(expect.objectContaining({ correct: 3, total: 3 }));
      expect(s.qlog).toHaveLength(0);
    }
  });
});
