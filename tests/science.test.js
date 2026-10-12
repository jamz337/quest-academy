// Science Springs: the facts and generators are checked directly; the lab and the Pre-K play version run headless.
import { describe, it, expect, vi } from 'vitest';
import { installPhaserMock, fakeSystems, findButton, click, flushTimers } from './helpers/phaserMock.js';

installPhaserMock();
vi.mock('../src/systems/Speech.js', async (importOriginal) => ({ ...(await importOriginal()), canSpeak: () => true, speak: vi.fn(), speakWords: () => null, stop: () => {} }));

const { scienceQuestion, scienceSet, scienceMix, SCIENCE_GAMES } = await import('../src/generators/science/questions.js');
const F = await import('../src/data/science/facts.js');
const { PLAY_SETS, playSet, makePlayAsks, targetOf } = await import('../src/data/science/play.js');
const { ScienceLab } = await import('../src/scenes/minigames/science/ScienceLab.js');
const { SciencePlay } = await import('../src/scenes/minigames/science/SciencePlay.js');
const { MINIGAMES, getGame, gamesForGrade, ALL_GAMES } = await import('../src/data/minigames.js');
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
Store.createProfile({ name: 'Sprout', grade: 3 });

const valid = (q) => q.choices.includes(q.answer) && new Set(q.choices).size === q.choices.length && q.choices.length >= 2 && q.choices.length <= 4
  && q.choices.every((c) => !c.includes('\n') && c.length <= 60) && !!q.skill && Array.isArray(q.explain) && q.explain.length >= 2 && !q.ref;

describe('Science Springs facts', () => {
  it('every animal has a real habitat, every change of state joins two states, every fact has three distractors', () => {
    for (const a of F.ANIMALS) { expect(F.HABITATS.some((h) => h.id === a.habitat), a.name).toBe(true); expect(['plants', 'meat', 'both']).toContain(a.eats); }
    for (const h of F.HABITATS) expect(F.animalsIn(h.id).length).toBeGreaterThanOrEqual(5);
    for (const c of F.CHANGES) { expect(F.STATES.map((s) => s.id)).toContain(c.from); expect(F.STATES.map((s) => s.id)).toContain(c.to); }
    for (const f of [...F.PLANT_FACTS, ...F.FLOAT_FACTS, ...F.MATTER_FACTS]) { expect(f.pool).toHaveLength(3); expect(['B', 'C']).toContain(f.band); expect(f.pool).not.toContain(f.a); }
    expect(F.OBJECTS.filter((o) => o.floats).length).toBeGreaterThanOrEqual(10);
    expect(F.OBJECTS.filter((o) => !o.floats).length).toBeGreaterThanOrEqual(8);
  });

  it('the generators make full, valid, varied sets for every game from Pre-K to Grade 8, and the skills have labels and tips', () => {
    const skills = new Set();
    for (const id of SCIENCE_GAMES) for (const g of [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8]) for (let seed = 1; seed <= 6; seed++) {
      const set = scienceSet(id, g, new Rng(seed * 31 + g), 10);
      expect(set, `${id} grade ${g}`).toHaveLength(10);
      expect(new Set(set.map((q) => q.prompt)).size).toBe(10);
      for (const q of set) { expect(valid(q), `${id} ${g} ${q.prompt}`).toBe(true); skills.add(q.skill); if (g <= -1) expect(q.choices.length).toBeLessThanOrEqual(3); }
    }
    expect(skills.size).toBeGreaterThanOrEqual(12);
    for (const k of skills) { expect(SKILL_LABELS[k], k).toBeTruthy(); expect(SKILL_TIPS[k], k).toBeTruthy(); }
    // Older grades reach the worded facts; the youngest never do.
    const older = scienceSet('sci-float', 7, new Rng(5), 10).map((q) => q.skill), young = scienceSet('sci-float', 0, new Rng(5), 10).map((q) => q.skill);
    expect(older).toContain('density'); expect(young.every((k) => k === 'sink-float')).toBe(true);
  });

  it('feeds the subject mix for bosses and a generator for each game in duels', () => {
    const boss = bossQuestions('science', 5, new Rng(2), 12);
    expect(boss).toHaveLength(12); boss.forEach((q) => expect(valid(q)).toBe(true));
    expect(new Set(boss.map((q) => q.skill)).size).toBeGreaterThan(2);
    for (const id of SCIENCE_GAMES) { const d = duelQuestions(id, 2, new Rng(3), 8); expect(d).toHaveLength(8); d.forEach((q) => expect(valid(q)).toBe(true)); }
    expect(valid(scienceMix(4, new Rng(9)))).toBe(true);
  });

  it('is a fifth subject with its own colours and four games in every grade of the Challenge menu', () => {
    expect(SUBJECTS.science).toMatchObject({ id: 'science', title: 'Science', zone: 'Science Springs' });
    expect(THEME.subjects.science.accent).toBeTruthy();
    expect(MINIGAMES.filter((g) => g.subject === 'science').map((g) => g.id)).toEqual(SCIENCE_GAMES);
    for (const g of [-1, 0, 3, 8]) expect(gamesForGrade('science', g).map((x) => x.id)).toEqual(SCIENCE_GAMES);
    for (const id of SCIENCE_GAMES) { expect(getGame(id)).toBeTruthy(); expect(ALL_GAMES.some((x) => x.id === id)).toBe(true); expect(getGame(id).playSceneKey).toBe(id === 'sci-habitat' ? undefined : 'MG_SciencePlay'); }   // Pre-K takes animals home in the lab
  });
});

function makeScene(Cls, payload) {
  const s = new Cls();
  fakeSystems(s);
  s.finish = vi.fn();
  s.needsIntro = () => false;
  s.init({ gameId: 'sci-float', grade: 3, band: 'A', title: 'T', subject: 'science', context: {}, timers: true, ...payload });
  s.create({});
  return s;
}

describe('the Science Lab (headless)', () => {
  it('asks ten questions per game, gives a second try, explains a second miss, fills the bench and finishes', () => {
    for (const id of SCIENCE_GAMES) {
      const s = makeScene(ScienceLab, { gameId: id, seed: 4 });
      expect(s.state.questions).toHaveLength(10);
      const q = () => s.round;
      // Right first time.
      s.pick(q().choices.indexOf(q().answer));
      expect(s.state.right).toBe(true);
      expect(s.state.bench).toHaveLength(1);
      flushTimers(s);
      expect(s.state.idx).toBe(1);
      // A miss, then the second try is right.
      const wrong = q().choices.findIndex((c) => c !== q().answer);
      s.pick(wrong);
      expect(s.state.right).toBe(null);
      s.pick(q().choices.indexOf(q().answer));
      expect(s.state.right).toBe(true);
      flushTimers(s);
      expect(s.state.idx).toBe(2);
      // Two misses: the explanation, then Next.
      const wrongs = q().choices.map((c, i) => (c !== q().answer ? i : -1)).filter((i) => i >= 0);
      s.pick(wrongs[0]); s.pick(wrongs[1 % wrongs.length] === wrongs[0] ? wrongs[0] : wrongs[1 % wrongs.length]);
      expect(s.state.right).toBe(false);
      click(findButton(s, 'Next ▶'));
      expect(s.state.idx).toBe(3);
      while (!s.finish.mock.calls.length) { s.pick(q().choices.indexOf(q().answer)); flushTimers(s); }
      expect(s.finish).toHaveBeenCalledWith(expect.objectContaining({ total: 10, correct: 9 }));
      expect(s.qlog.length).toBeGreaterThanOrEqual(10);
    }
  });
});

describe('Habitat Match, hands on (headless)', () => {
  it('release boards show each animal\'s own home (Pre-K: three easy homes); survive trays hold the animal\'s two needs and none that look the same; chains run from a producer; duels and bosses get no boards', async () => {
    const { SURVIVAL, HABITATS, ANIMALS: ANIMALS_ALL } = await import('../src/data/science/facts.js');
    for (const a of SURVIVAL) expect(HABITATS.some((h) => h.id === a.habitat), a.name).toBe(true);
    let releases = 0, survives = 0, chains = 0;
    for (const grade of [-1, 0, 2, 4, 6, 8]) for (let seed = 1; seed <= 8; seed++) {
      for (const q of scienceSet('sci-habitat', grade, new Rng(seed * 7 + grade), 10)) {
        if (q.release) {
          releases++;
          const R = q.release, ids = R.homes.map((h) => h.id);
          for (const a of R.animals) { expect(ids).toContain(a.home); expect(ANIMALS_ALL.every((x) => x.pic !== a.pic || x.habitat === a.home), a.name).toBe(true); }
          expect(new Set(R.animals.map((a) => a.home)).size).toBe(R.animals.length);
          if (grade <= -1) { expect(R.animals).toHaveLength(3); expect(R.homes).toHaveLength(3); for (const id of ids) expect(['ocean', 'desert', 'polar', 'farm', 'forest']).toContain(id); }
        }
        if (q.survive) {
          survives++;
          const T = q.survive.tray;
          expect(T).toHaveLength(6);
          expect(T.filter((t) => t.owner === q.survive.name)).toHaveLength(2);
          expect(new Set(T.map((t) => t.pic)).size).toBe(6); expect(new Set(T.map((t) => t.text)).size).toBe(6);
          const me = SURVIVAL.find((x) => x.name === q.survive.name), its = new Set([...me.needs.map((n) => n[2]), ...me.also]);
          for (const t of T.filter((x) => x.owner !== q.survive.name)) expect(its.has(t.tag), `${t.text} for a ${q.survive.name}`).toBe(false);
        }
        if (q.chain) { chains++; expect(q.chain.links[0].role).toBe('producer'); expect(new Set(q.chain.links.map((l) => l.pic)).size).toBe(q.chain.links.length); expect([...q.chain.cards].sort()).toEqual(q.chain.links.map((_, i) => i)); expect(grade).toBeGreaterThanOrEqual(4); }
        if (grade <= -1) expect(!!q.release).toBe(true);
      }
    }
    expect(releases).toBeGreaterThan(80); expect(survives).toBeGreaterThan(20); expect(chains).toBeGreaterThan(8);
    for (let seed = 1; seed <= 6; seed++) for (const grade of [-1, 2, 6]) for (const q of scienceSet('sci-habitat', grade, new Rng(seed), 10, null, { drawn: false })) expect(!!(q.release || q.survive || q.chain)).toBe(false);
    expect(getGame('sci-habitat').playSceneKey).toBeUndefined();
  });

  it('release: a wrong home is a try again, tapping then a home works, all home wins; survive: the wrong thing is a try again, two right things win; chain: blanks are pointed out, a wrong order is outlined, the right order wins', () => {
    const find = (grade, keys) => { for (let seed = 1; ; seed++) { const sc = makeScene(ScienceLab, { gameId: 'sci-habitat', grade, band: grade >= 4 ? 'B' : 'A', seed }); if (keys.every((k) => sc.state.questions.some((q) => q[k]))) return sc; } };
    let s = find(2, ['release', 'survive']);
    const go = (k) => { s.state.idx = s.state.questions.findIndex((q) => q[k]); s.state.locked = false; s.state.picked = null; s.state.right = null; s.rebuild(); return s.round[k]; };
    const st = () => s.state.inter[s.state.idx];
    const R = go('release'), a0 = R.animals[0], wrongHome = R.homes.find((h) => h.id !== a0.home);
    s.releaseDrop(0, wrongHome.id);
    expect(s.state.picked).toBe(null); expect(st().hint).toContain(wrongHome.name); expect(s.state.missed.habitats).toBe(1);
    s.releasePick(0); expect(st().sel).toBe(0);
    s.releaseDrop(st().sel, a0.home);
    expect(st().home[0]).toBe(true); expect(st().sel).toBe(null);
    R.animals.forEach((a, i) => { if (i) s.releaseDrop(i, a.home); });
    expect(s.state.right).toBe(true); expect(s.state.bench.at(-1).pic).toBe(a0.pic);
    flushTimers(s);

    const S = go('survive'), mine = S.tray.map((t, i) => (t.owner === S.name ? i : -1)).filter((i) => i >= 0), other = S.tray.findIndex((t) => t.owner !== S.name);
    s.surviveGive(other);
    expect(s.state.picked).toBe(null); expect(st().hint).toContain(S.tray[other].owner);
    s.surviveGive(mine[0]); s.surviveGive(mine[0]);
    expect(st().given).toEqual([mine[0]]);
    s.surviveGive(mine[1]);
    expect(s.state.right).toBe(true); expect(s.state.bench.at(-1).pic).toBe(S.pic);
    flushTimers(s);

    s = find(5, ['chain']);
    const C = go('chain'), n = C.links.length;
    s.chainCheck();
    expect(st().hint).toContain('Fill'); expect(s.state.picked).toBe(null);
    // Wrong order: the first two swapped.
    s.chainSelect(1); s.chainPlace(st().sel, 0); s.chainPlace(0, 1);
    for (let i = 2; i < n; i++) s.chainPlace(i, i);
    s.chainCheck();
    expect(s.state.picked).toBe(null); expect(st().wrong).toEqual([0, 1]);
    s.chainPlace(0, 0);   // moves card 0 out of box 1 into box 0
    expect(st().slots[1]).toBe(null);
    s.chainPlace(1, 1);
    s.chainCheck();
    expect(s.state.right).toBe(true);
  });
});

describe('Science Springs for Pre-K (headless)', () => {
  it('each set has six things with homes and asks that can be answered', () => {
    for (const id of Object.keys(PLAY_SETS)) {
      const set = playSet(id);
      expect(set.items).toHaveLength(6);
      for (const it of set.items) expect(targetOf(set, it), it.name).toBeTruthy();
      const asks = makePlayAsks(set, new Rng(1), 3);
      expect(asks).toHaveLength(3);
      expect(new Set(asks.map((a) => a.item.name)).size).toBe(3);
      asks.forEach((a) => expect(a.line.length).toBeGreaterThan(5));
    }
    expect(Object.keys(PLAY_SETS)).toEqual(SCIENCE_GAMES.filter((id) => getGame(id).playSceneKey));
  });

  it('Pre-K launches the play version; touching sends each thing home, then the asks are answered at the panels', () => {
    Store.updateProfile((p) => { p.grade = -1; });
    const from = { scene: { key: 'ChallengeMenu', pause() {}, launch() {} } };
    expect(launch(from, 'sci-matter', {}).sceneKey).toBe('MG_SciencePlay');
    Store.updateProfile((p) => { p.grade = 3; });
    expect(launch(from, 'sci-matter', {}).sceneKey).toBe('MG_ScienceLab');

    const s = makeScene(SciencePlay, { gameId: 'sci-float', grade: -1, band: 'E', early: true, timers: false, seed: 2 });
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
    click(findButton(s, 'Done ✓'));
    expect(s.finish).toHaveBeenCalledWith(expect.objectContaining({ correct: 3, total: 3 }));
    expect(s.qlog).toHaveLength(0);
  });
});
