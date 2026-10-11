// The Hospital (Health Heights): the facts and generators are checked directly, the building's floor is walked in
// node, and the quiz and the Pre-K play version run headless.
import { describe, it, expect, vi } from 'vitest';
import { installPhaserMock, fakeSystems, findButton, click, flushTimers } from './helpers/phaserMock.js';

installPhaserMock();
vi.mock('../src/systems/Speech.js', async (importOriginal) => ({ ...(await importOriginal()), canSpeak: () => true, speak: vi.fn(), speakWords: () => null, stop: () => {} }));

const { healthQuestion, healthSet, healthMix, HEALTH_GAMES } = await import('../src/generators/health/questions.js');
const F = await import('../src/data/health/facts.js');
const { HEALTH_PLAY_SETS } = await import('../src/data/health/play.js');
const H = await import('../src/data/health/hospital.js');
const { targetOf, makePlayAsks } = await import('../src/data/touchPlay.js');
const { HealthQuiz } = await import('../src/scenes/minigames/health/HealthQuiz.js');
const { HealthPlay } = await import('../src/scenes/minigames/health/HealthPlay.js');
const { MINIGAMES, getGame, gamesForGrade } = await import('../src/data/minigames.js');
const { SUBJECTS } = await import('../src/constants.js');
const { THEME } = await import('../src/ui/theme.js');
const { SKILL_LABELS } = await import('../src/data/skills.js');
const { SKILL_TIPS } = await import('../src/data/explanations.js');
const { NPC_STYLES } = await import('../src/data/avatars.js');
const { bossQuestions } = await import('../src/generators/boss.js');
const { duelQuestions } = await import('../src/generators/duel.js');
const { Rng } = await import('../src/systems/Rng.js');
const { launch } = await import('../src/systems/MinigameLauncher.js');
const Store = await import('../src/systems/Store.js');

globalThis.localStorage = { data: {}, getItem(k) { return this.data[k] ?? null; }, setItem(k, v) { this.data[k] = v; }, removeItem(k) { delete this.data[k]; } };
Store.init();
Store.createProfile({ name: 'Hal', grade: 3 });

const valid = (q) => q.choices.includes(q.answer) && new Set(q.choices).size === q.choices.length && q.choices.length >= 2 && q.choices.length <= 4
  && q.choices.every((c) => !c.includes('\n') && c.length <= 60) && !!q.skill && Array.isArray(q.explain) && q.explain.length >= 2 && !q.ref;

describe('Hospital facts', () => {
  it('every organ belongs to a system, every food to a group, every fact has three distractors and nothing is too long for a button', () => {
    for (const o of F.ORGANS) expect(F.SYSTEMS.find((s) => s.id === o.system), o.name).toBeTruthy();
    for (const f of F.FOODS) expect(F.groupOf(f.group), f.name).toBeTruthy();
    for (const f of [...F.BODY_FACTS, ...F.PLATE_FACTS, ...F.GERM_FACTS, ...F.SAFETY]) { expect(f.pool).toHaveLength(3); expect(['A', 'B', 'C']).toContain(f.band); expect(f.a.length).toBeLessThanOrEqual(60); f.pool.forEach((p) => expect(p.length).toBeLessThanOrEqual(60)); }
    for (const h of F.HABITS) { expect(h.do.length + 3).toBeLessThanOrEqual(60); if (h.good) expect(h.when).toBeTruthy(); else expect(h.why).toBeTruthy(); }
    for (const n of F.NUTRIENTS) { expect(n.does.length).toBeLessThanOrEqual(60); expect(n.from.length).toBeLessThanOrEqual(60); }
  });

  it('the generators make full, valid, varied sets for every game from Pre-K to Grade 8, with and without a drawn plate, and the skills have labels and tips', () => {
    const skills = new Set();
    for (const id of HEALTH_GAMES) for (const g of [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8]) for (let seed = 1; seed <= 5; seed++) {
      const set = healthSet(id, g, new Rng(seed * 31 + g), 10);
      expect(set, `${id} grade ${g}`).toHaveLength(10);
      for (const q of set) { expect(valid(q), `${id} ${g} ${q.prompt}`).toBe(true); skills.add(q.skill); if (g <= -1) expect(q.choices.length).toBeLessThanOrEqual(3); }
      const words = healthSet(id, g, new Rng(seed), 10, null, { drawn: false });
      expect(words, `${id} grade ${g} words only`).toHaveLength(10);
      words.forEach((q) => { expect(q.plate).toBeUndefined(); expect(valid(q)).toBe(true); });
    }
    expect(skills.size).toBe(15);
    for (const k of skills) { expect(SKILL_LABELS[k], k).toBeTruthy(); expect(SKILL_TIPS[k], k).toBeTruthy(); }
    expect(healthSet('hea-plate', 2, new Rng(2), 10).some((q) => q.plate)).toBe(true);
    expect(healthSet('hea-body', 8, new Rng(2), 10).map((q) => q.skill)).toContain('body-systems');
    const p = healthQuestion('hea-plate', 3, new Rng(4), 0.5);
    if (p.plate) expect(p.plate).toHaveLength(3);
  });

  it('feeds the subject mix and a generator for each game in duels, never with a plate to draw', () => {
    const boss = bossQuestions('health', 5, new Rng(2), 12);
    expect(boss).toHaveLength(12); boss.forEach((q) => { expect(valid(q)).toBe(true); expect(q.plate).toBeUndefined(); });
    for (const id of HEALTH_GAMES) { const d = duelQuestions(id, 2, new Rng(3), 8); expect(d).toHaveLength(8); d.forEach((q) => { expect(valid(q)).toBe(true); expect(q.choices.length).toBeGreaterThanOrEqual(3); }); }
    expect(valid(healthMix(4, new Rng(9)))).toBe(true);
  });

  it('is a ninth subject with its own colours and four games in every grade of the Challenge menu', () => {
    expect(SUBJECTS.health).toMatchObject({ id: 'health', title: 'Health', zone: 'The Hospital' });
    expect(THEME.subjects.health.accent).toBeTruthy();
    expect(Object.keys(SUBJECTS)).toHaveLength(9);
    expect(MINIGAMES.filter((g) => g.subject === 'health').map((g) => g.id)).toEqual(HEALTH_GAMES);
    for (const g of [-1, 0, 3, 8]) expect(gamesForGrade('health', g).map((x) => x.id)).toEqual(HEALTH_GAMES);
    for (const id of HEALTH_GAMES) { expect(getGame(id).sceneKey).toBe('MG_HealthQuiz'); expect(getGame(id).playSceneKey).toBe('MG_HealthPlay'); }
  });
});

describe('the hospital building', () => {
  it('has a member of staff for each game, standing on the floor, all reachable from the door mat', () => {
    expect(H.STAFF.map((s) => s.gameId)).toEqual(HEALTH_GAMES);
    for (const s of H.STAFF) {
      expect(MINIGAMES.find((g) => g.npc === s.id)?.id).toBe(s.gameId);
      expect(H.isFloor(s.at.tx, s.at.ty), s.id).toBe(true);
      expect(Number(s.sprite.slice(3))).toBeLessThan(NPC_STYLES.length);   // a look exists for the sprite
    }
    const floor = H.reachableFloor();
    for (const s of H.STAFF) expect([[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => floor.has(`${s.at.tx + dx},${s.at.ty + dy}`)), s.id).toBe(true);
    expect(floor.has(`${H.EXIT.tx},${H.EXIT.ty}`)).toBe(true);
    expect(H.onExit(H.EXIT.tx, H.EXIT.ty)).toBe(true);
    expect(H.onExit(Math.floor(H.SPAWN.tx), Math.floor(H.SPAWN.ty))).toBe(false);   // arriving does not walk straight back out
    expect(H.FLOOR).toHaveLength(H.HOSPITAL_H);
    H.FLOOR.forEach((row) => expect(row).toHaveLength(H.HOSPITAL_W));
    // Staff voices differ from one another.
    expect(new Set(H.STAFF.map((s) => `${s.voice}:${s.pitch}:${s.rate}`)).size).toBe(H.STAFF.length);
  });
});

function makeScene(Cls, payload) {
  const s = new Cls();
  fakeSystems(s);
  s.finish = vi.fn();
  s.needsIntro = () => false;
  s.init({ gameId: 'hea-body', grade: 3, band: 'A', title: 'T', subject: 'health', context: {}, timers: true, ...payload });
  s.create({});
  return s;
}

describe('the Health quiz (headless)', () => {
  it('asks ten questions per game, gives a second try, explains a second miss, beats the monitor and finishes', () => {
    for (const id of HEALTH_GAMES) for (const grade of [1, 6]) {
      const s = makeScene(HealthQuiz, { gameId: id, seed: 4, grade, band: grade < 4 ? 'A' : 'C' });
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
    }
  });
});

describe('the Hospital for Pre-K (headless)', () => {
  it('each set has six things with homes and asks that can be answered', () => {
    for (const id of HEALTH_GAMES) {
      const set = HEALTH_PLAY_SETS[id];
      expect(set.items).toHaveLength(6);
      for (const it of set.items) expect(targetOf(set, it), it.name).toBeTruthy();
      expect(makePlayAsks(set, new Rng(1), 3)).toHaveLength(3);
    }
    expect(Object.keys(HEALTH_PLAY_SETS)).toEqual(HEALTH_GAMES);
  });

  it('Pre-K launches the play version; touching sends each thing home, then the asks are answered', () => {
    Store.updateProfile((p) => { p.grade = -1; });
    const from = { scene: { key: 'ChallengeMenu', pause() {}, launch() {} } };
    expect(launch(from, 'hea-germs', {}).sceneKey).toBe('MG_HealthPlay');
    Store.updateProfile((p) => { p.grade = 3; });
    expect(launch(from, 'hea-germs', {}).sceneKey).toBe('MG_HealthQuiz');

    const s = makeScene(HealthPlay, { gameId: 'hea-germs', grade: -1, band: 'E', early: true, timers: false, seed: 2 });
    const st = s.state;
    st.items.forEach((it, i) => { click(findButton(s, it.name)); expect(st.line).toBe(it.line); flushTimers(s); expect(st.home[i]).toBe(true); });
    expect(st.phase).toBe('ask');
    st.asks.forEach((ask) => {
      const right = ask.kind === 'find' ? ask.item : st.items.find((it) => it.target === ask.item.target);
      click(findButton(s, `home ${right.name}`));
      flushTimers(s);
    });
    expect(st.finale).toBe(true);
    expect(st.line).toContain('helper');
    click(findButton(s, 'Done ✓'));
    expect(s.finish).toHaveBeenCalledWith(expect.objectContaining({ correct: 3, total: 3 }));
  });
});
