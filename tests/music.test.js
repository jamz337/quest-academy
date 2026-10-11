// Melody Market: the facts and generators are checked directly; the quiz and the Pre-K play version run headless.
import { describe, it, expect, vi } from 'vitest';
import { installPhaserMock, fakeSystems, findButton, click, flushTimers } from './helpers/phaserMock.js';

installPhaserMock();
vi.mock('../src/systems/Speech.js', async (importOriginal) => ({ ...(await importOriginal()), canSpeak: () => true, speak: vi.fn(), speakWords: () => null, stop: () => {} }));

const { musicQuestion, musicSet, musicMix, MUSIC_GAMES } = await import('../src/generators/music/questions.js');
const F = await import('../src/data/music/facts.js');
const { MUSIC_PLAY_SETS } = await import('../src/data/music/play.js');
const { targetOf, makePlayAsks } = await import('../src/data/touchPlay.js');
const { MusicQuiz } = await import('../src/scenes/minigames/music/MusicQuiz.js');
const { MusicPlay } = await import('../src/scenes/minigames/music/MusicPlay.js');
const { Music, NOTE_HZ } = await import('../src/systems/Audio.js');
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
Store.createProfile({ name: 'Mel', grade: 3 });

const valid = (q) => q.choices.includes(q.answer) && new Set(q.choices).size === q.choices.length && q.choices.length >= 2 && q.choices.length <= 4
  && q.choices.every((c) => !c.includes('\n') && c.length <= 60) && !!q.skill && Array.isArray(q.explain) && q.explain.length >= 2 && !q.ref;
const soundOk = (s) => !s || (s.kind === 'rhythm' ? s.beats.every((b) => ['boom', 'tak', 'shake', 'ding', '-'].includes(b)) : s.notes.every((n) => n === '-' || NOTE_HZ[n]));

describe('Melody Market facts', () => {
  it('every instrument has a family and a way of playing, every sound names real notes and drums, every fact has three distractors', () => {
    for (const i of F.INSTRUMENTS) { expect(F.familyOf(i.family), i.name).toBeTruthy(); expect(F.HOW_WORDS[i.how], i.name).toBeTruthy(); expect(F.GROUPS).toContain(i.group); }
    for (const fam of F.FAMILIES) expect(F.instrumentsIn(fam.id).length).toBeGreaterThanOrEqual(3);
    for (const h of F.HIGH_LOW) { expect(NOTE_HZ[h.note]).toBeTruthy(); expect(['high', 'low']).toContain(h.pitch); }
    for (const f of [...F.CARIBBEAN_FACTS, ...F.MUSIC_FACTS]) { expect(f.pool).toHaveLength(3); expect(['B', 'C']).toContain(f.band); expect(f.a.length).toBeLessThanOrEqual(60); }
    for (const w of [...F.TEMPO_WORDS, ...F.NOTE_WORDS, ...F.PITCH_WORDS]) expect(w.means.length).toBeLessThanOrEqual(60);
    for (const set of Object.values(MUSIC_PLAY_SETS)) for (const it of set.items) expect(soundOk(it.sound), it.name).toBe(true);
    // The synth's helpers never throw without an audio context (tests, muted devices).
    expect(() => { Music.note('C4'); Music.rhythm(['boom', '-', 'tak']); Music.play({ kind: 'notes', notes: ['E4', 'G4'] }); }).not.toThrow();
  });

  it('the generators make full, valid, varied sets for every game from Pre-K to Grade 8, with and without sounds, and the skills have labels and tips', () => {
    const skills = new Set();
    for (const id of MUSIC_GAMES) for (const g of [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8]) for (let seed = 1; seed <= 5; seed++) {
      const set = musicSet(id, g, new Rng(seed * 31 + g), 10);
      expect(set, `${id} grade ${g}`).toHaveLength(10);
      for (const q of set) { expect(valid(q), `${id} ${g} ${q.prompt}`).toBe(true); expect(soundOk(q.sound)).toBe(true); skills.add(q.skill); if (g <= -1) expect(q.choices.length).toBeLessThanOrEqual(3); }
      const words = musicSet(id, g, new Rng(seed), 10, null, { drawn: false });
      expect(words, `${id} grade ${g} words only`).toHaveLength(10);
      words.forEach((q) => { expect(q.sound).toBeUndefined(); expect(valid(q)).toBe(true); });
    }
    expect(skills.size).toBe(13);
    for (const k of skills) { expect(SKILL_LABELS[k], k).toBeTruthy(); expect(SKILL_TIPS[k], k).toBeTruthy(); }
    // The youngest hear sounds; the oldest read about them.
    expect(musicSet('mus-pitch', -1, new Rng(2), 10).filter((q) => q.sound).length).toBeGreaterThanOrEqual(5);
    expect(musicSet('mus-pitch', 8, new Rng(2), 10).map((q) => q.skill)).toContain('voices');
  });

  it('feeds the subject mix for bosses and a generator for each game in duels, never with a sound to play', () => {
    const boss = bossQuestions('music', 5, new Rng(2), 12);
    expect(boss).toHaveLength(12); boss.forEach((q) => { expect(valid(q)).toBe(true); expect(q.sound).toBeUndefined(); });
    for (const id of MUSIC_GAMES) { const d = duelQuestions(id, 2, new Rng(3), 8); expect(d).toHaveLength(8); d.forEach((q) => { expect(valid(q)).toBe(true); expect(q.choices.length).toBeGreaterThanOrEqual(3); expect(q.sound).toBeUndefined(); }); }
    expect(valid(musicMix(4, new Rng(9)))).toBe(true);
  });

  it('is a seventh subject with its own colours and four games in every grade of the Challenge menu', () => {
    expect(SUBJECTS.music).toMatchObject({ id: 'music', title: 'Music', zone: 'Melody Market' });
    expect(THEME.subjects.music.accent).toBeTruthy();
    expect(Object.keys(SUBJECTS).length).toBeGreaterThanOrEqual(7);
    expect(MINIGAMES.filter((g) => g.subject === 'music').map((g) => g.id)).toEqual(MUSIC_GAMES);
    for (const g of [-1, 0, 3, 8]) expect(gamesForGrade('music', g).map((x) => x.id)).toEqual(MUSIC_GAMES);
    for (const id of MUSIC_GAMES) { expect(getGame(id).sceneKey).toBe('MG_MusicQuiz'); expect(getGame(id).playSceneKey).toBe('MG_MusicPlay'); }
  });
});

function makeScene(Cls, payload) {
  const s = new Cls();
  fakeSystems(s);
  s.finish = vi.fn();
  s.needsIntro = () => false;
  s.init({ gameId: 'mus-rhythm', grade: 3, band: 'A', title: 'T', subject: 'music', context: {}, timers: true, ...payload });
  s.create({});
  return s;
}

describe('the Music quiz (headless)', () => {
  it('asks ten questions per game, gives a second try, explains a second miss, fills the staff and finishes; sound questions get a play button', () => {
    for (const id of MUSIC_GAMES) {
      const s = makeScene(MusicQuiz, { gameId: id, seed: 4, grade: 1, band: 'A' });
      expect(s.state.questions).toHaveLength(10);
      const q = () => s.round;
      if (q().sound) expect(findButton(s, 'Play it again')).toBeTruthy();
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

describe('Melody Market for Pre-K (headless)', () => {
  it('each set has six things with homes, each with a sound, and asks that can be answered', () => {
    for (const id of MUSIC_GAMES) {
      const set = MUSIC_PLAY_SETS[id];
      expect(set.items).toHaveLength(6);
      for (const it of set.items) { expect(targetOf(set, it), it.name).toBeTruthy(); expect(it.sound).toBeTruthy(); }
      expect(makePlayAsks(set, new Rng(1), 3)).toHaveLength(3);
    }
    expect(Object.keys(MUSIC_PLAY_SETS)).toEqual(MUSIC_GAMES);
  });

  it('Pre-K launches the play version; touching plays a sound and sends each thing home, then the asks are answered', () => {
    Store.updateProfile((p) => { p.grade = -1; });
    const from = { scene: { key: 'ChallengeMenu', pause() {}, launch() {} } };
    expect(launch(from, 'mus-pitch', {}).sceneKey).toBe('MG_MusicPlay');
    Store.updateProfile((p) => { p.grade = 3; });
    expect(launch(from, 'mus-pitch', {}).sceneKey).toBe('MG_MusicQuiz');

    const s = makeScene(MusicPlay, { gameId: 'mus-pitch', grade: -1, band: 'E', early: true, timers: false, seed: 2 });
    const played = [];
    s.onTap = (item) => played.push(item.name);
    const st = s.state;
    st.items.forEach((it, i) => { click(findButton(s, it.name)); expect(st.line).toBe(it.line); flushTimers(s); expect(st.home[i]).toBe(true); });
    expect(played).toEqual(st.items.map((it) => it.name));
    expect(st.phase).toBe('ask');
    st.asks.forEach((ask) => {
      const right = ask.kind === 'find' ? ask.item : st.items.find((it) => it.target === ask.item.target);
      click(findButton(s, `home ${right.name}`));
      flushTimers(s);
    });
    expect(st.finale).toBe(true);
    expect(st.line).toContain('musician');
    click(findButton(s, 'Done ✓'));
    expect(s.finish).toHaveBeenCalledWith(expect.objectContaining({ correct: 3, total: 3 }));
  });
});
