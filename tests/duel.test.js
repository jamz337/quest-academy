// The duel screen, headless against the Phaser mock: villagers and bosses, the four commands, items and the clock.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { installPhaserMock, fakeSystems, findButton, click, flushTimers } from './helpers/phaserMock.js';

installPhaserMock();
vi.mock('../src/systems/Speech.js', () => ({ speak: vi.fn(), stop: vi.fn(), rateFor: () => 0.9, canSpeak: () => false, speakWords: () => null, primeSpeech: () => false }));

const { DuelScene, LABELS } = await import('../src/scenes/minigames/DuelScene.js');
const { duelFor, DUEL } = await import('../src/data/world/duels.js');
const { duelQuestions, BY_GAME, fractionQuestion, bugQuestion, danceQuestion } = await import('../src/generators/duel.js');
const { MINIGAMES } = await import('../src/data/minigames.js');
const { Rng } = await import('../src/systems/Rng.js');
const { bossForZone } = await import('../src/data/world/bosses.js');
const { launch, DUEL_SCENE, BOSS_SCENE } = await import('../src/systems/MinigameLauncher.js');
const { applyResult, gameGrade, mastery } = await import('../src/systems/Progression.js');
const { newProfile } = await import('../src/systems/SaveSystem.js');
const { snackCount } = await import('../src/systems/Market.js');
const { BADGES } = await import('../src/data/badges.js');
const Store = await import('../src/systems/Store.js');

function boot(fields = {}) {
  const storage = { data: {}, getItem(k) { return this.data[k] ?? null; }, setItem(k, v) { this.data[k] = v; }, removeItem(k) { delete this.data[k]; } };
  globalThis.localStorage = storage;
  Store.init();
  Store.createProfile({ name: 'Maya', grade: 3 });
  Store.updateProfile((p) => Object.assign(p, fields));
  return Store.getProfile();
}

function makeScene(payload, size) {
  const s = new DuelScene();
  fakeSystems(s, size);
  s.finish = vi.fn();
  s.abort = vi.fn();
  s.init({ gameId: 'duel:prof-plus', duel: duelFor('prof-plus'), grade: 3, band: 'A', title: 'Professor Plus', subject: 'math', context: {}, timers: true, seed: 7, ...payload });
  s.create({});
  return s;
}
const q = (s) => s.state.questions[s.state.idx];
const right = (s) => q(s).choices.indexOf(q(s).answer);
const wrongIdx = (s) => q(s).choices.findIndex((c) => c !== q(s).answer);

describe('duel questions follow the villager\'s own game', () => {
  const TOPIC = {
    'math-dash': ['add', 'sub', 'mult', 'div', 'decimal', 'integers', 'order-of-operations', 'percent', 'equations', 'squares', 'add100', 'sub100', 'decAdd', 'decSub'],
    'math-pizza': ['fractions', 'compare', 'equivalent', 'fraction-add', 'convert'],
    'math-bridge': ['skip-count', 'doubling', 'sequence', 'geometric', 'rule', 'squares'],
    'eng-grammar': ['verb', 'article', 'pronoun', 'homophone', 'tense', 'adjective', 'adverb', 'agreement', 'vocab', 'punctuation', 'plural'],
    'eng-builder': ['spelling'], 'eng-match': ['synonym', 'antonym', 'definition'],
    'code-maze': ['sequence_code', 'repeat'], 'code-bug': ['sequence_code', 'repeat'], 'code-dance': ['sequence_code', 'repeat', 'conditional'],
    'bible-verse': ['verses'], 'bible-quiz': ['stories', 'people', 'places', 'books'], 'bible-match': ['stories', 'people', 'places', 'books']
  };
  it('every villager game has a generator whose questions are well formed and on topic', () => {
    for (const g of MINIGAMES) {
      expect(BY_GAME[g.id], g.id).toBeTypeOf('function');
      for (const grade of [2, 4, 7]) {
        const qs = duelQuestions(g.id, grade, new Rng(grade * 31 + g.id.length), 6);
        expect(qs.length, g.id).toBe(6);
        for (const q of qs) {
          expect(q.prompt, g.id).toBeTruthy();
          expect(q.choices.length, g.id).toBeGreaterThanOrEqual(3);
          expect(q.choices, g.id + ' ' + q.prompt).toContain(q.answer);
          expect(new Set(q.choices).size, g.id + ' ' + q.prompt).toBe(q.choices.length);
          if (TOPIC[g.id]) expect(TOPIC[g.id], g.id + ' ' + q.skill).toContain(q.skill);
        }
      }
    }
  });
  it('fractions, bugs and dances read as questions', () => {
    const rng = new Rng(5);
    expect(fractionQuestion(2, rng).prompt).toMatch(/pizza|bigger/);
    expect(fractionQuestion(7, rng).prompt).toMatch(/=|equals|percent|decimal/);
    const b = bugQuestion(3, rng);
    expect(b.prompt).toMatch(/Which line has the bug/); expect(b.answer).toMatch(/^Line \d+$/); expect(b.explain).toContain(b.answer);
    const d = danceQuestion(3, rng);
    expect(d.prompt).toMatch(/Which dance/); expect(d.choices).toContain(d.answer);
  });
});

describe('a villager duel', () => {
  beforeEach(() => boot());

  it('opens on the command menu with the party at full health, and Solve shows the choices', () => {
    const s = makeScene();
    expect(s.opp).toMatchObject({ kind: 'villager', name: 'Professor Plus', hp: DUEL.npcHp, prop: '🧮' });
    for (const qq of s.state.questions) expect(qq.prompt).toMatch(/^[\d.()−\-]+ [+−×÷] |x = \?|²|% of/);   // the Professor asks sums only
    const chef = makeScene({ gameId: 'duel:chef-fraction', duel: duelFor('chef-fraction'), title: 'Chef Fraction' });
    for (const qq of chef.state.questions) expect(['fractions', 'compare', 'equivalent', 'fraction-add', 'convert']).toContain(qq.skill);
    expect(s.state.party.map((m) => m.hp)).toEqual([DUEL.playerHp, DUEL.mangoHp]);
    expect(s.state.timeLimit).toBe(30000);   // band A 20 s × 1.5
    for (const l of [LABELS.solve, LABELS.logic, LABELS.items, LABELS.run]) expect(findButton(s, l), l).toBeTruthy();
    expect(findButton(s, q(s).answer)).toBeUndefined();
    click(findButton(s, LABELS.solve));
    expect(s.state.phase).toBe('solve');
    expect(findButton(s, q(s).answer)).toBeTruthy();
    expect(findButton(s, LABELS.menu)).toBeTruthy();
    click(findButton(s, LABELS.menu));
    expect(s.state.phase).toBe('menu');
  });

  it('a right answer hurts the opponent and moves on; five of them win the duel', () => {
    const s = makeScene();
    for (let i = 0; i < DUEL.npcHp; i++) {
      click(findButton(s, LABELS.solve));
      click(findButton(s, q(s).answer));
      expect(s.state.locked).toBe(true);
      expect(s.state.oppHp).toBe(DUEL.npcHp - 1 - i);
      flushTimers(s);   // the 600 ms beat, then next() or the defeat sequence
    }
    expect(s.state.defeated).toBe(true);
    expect(s.state.correct).toBe(DUEL.npcHp);
    flushTimers(s);   // the defeat sequence ends and the duel is scored
    expect(s.finish).toHaveBeenCalledWith(expect.objectContaining({ won: true, hpLeft: 0, partyHp: 5, partyMax: 5, correct: 5, total: 5, useDoubleCoins: false }));
  });

  it('wrong answers hit the player first, then Mango, until the party is out', () => {
    const s = makeScene();
    const miss = () => { click(findButton(s, LABELS.solve)); s.pick(wrongIdx(s)); };
    miss();
    expect(s.state.party[0].hp).toBe(2);
    expect(s.state.hit).toBe('party:player');
    expect(findButton(s, 'Next ▶')).toBeTruthy();   // the explanation
    click(findButton(s, 'Next ▶'));
    expect(s.state.idx).toBe(1); expect(s.state.phase).toBe('menu');
    miss(); click(findButton(s, 'Next ▶'));
    miss(); click(findButton(s, 'Next ▶'));
    expect(s.state.party[0].hp).toBe(0);
    miss();
    expect(s.state.party[1].hp).toBe(1); expect(s.state.hit).toBe('party:mango');
    click(findButton(s, 'Next ▶'));
    miss();
    expect(s.state.lost).toBe(true);
    expect(findButton(s, 'Next ▶')).toBeUndefined();
    flushTimers(s);
    expect(s.finish).toHaveBeenCalledWith(expect.objectContaining({ won: false, partyHp: 0, correct: 0, total: 5 }));
  });

  it('Logic hides two wrong choices once per question, three times a duel', () => {
    const s = makeScene();
    click(findButton(s, LABELS.logic));
    expect(s.state.phase).toBe('solve');
    expect(s.state.hidden).toHaveLength(2);
    expect(s.state.hidden).not.toContain(right(s));
    expect(s.state.logic).toBe(2);
    expect(findButton(s, '—')).toBeTruthy();
    s.useLogic();
    expect(s.state.logic).toBe(2);   // already used on this question
    click(findButton(s, q(s).answer));
    flushTimers(s);
    expect(s.state.hidden).toEqual([]);
    click(findButton(s, LABELS.logic)); flushTimers(s); click(findButton(s, q(s).answer)); flushTimers(s);
    click(findButton(s, LABELS.logic)); click(findButton(s, q(s).answer)); flushTimers(s);
    expect(s.state.logic).toBe(0);
    expect(findButton(s, LABELS.logic).disabledState).toBe(true);
  });

  it('Items heal with snacks and charms, add time, and Close returns to the menu', () => {
    boot({ charms: { extraHeart: true, doubleCoins: true }, inventory: { owned: [], equipped: {}, decor: {}, spent: 0, visited: true, snacks: { 'snack-mango-juice': 2, 'snack-hourglass': 1 } } });
    const s = makeScene();
    click(findButton(s, LABELS.solve)); s.pick(wrongIdx(s)); click(findButton(s, 'Next ▶'));
    click(findButton(s, LABELS.solve)); s.pick(wrongIdx(s)); click(findButton(s, 'Next ▶'));
    expect(s.state.party[0].hp).toBe(1);
    click(findButton(s, LABELS.items));
    expect(s.state.phase).toBe('items');
    expect(findButton(s, '🥭 Mango juice ×2')).toBeTruthy();
    click(findButton(s, '🥭 Mango juice ×2'));
    expect(s.state.party[0].hp).toBe(2);
    expect(snackCount(Store.getProfile(), 'snack-mango-juice')).toBe(1);
    expect(s.state.phase).toBe('menu');
    click(findButton(s, LABELS.items)); click(findButton(s, '⏳ Hourglass ×1'));
    expect(s.state.bonusMs).toBe(10000);
    click(findButton(s, LABELS.items)); click(findButton(s, '🍀 Lucky Charm'));
    expect(s.state.party[0]).toMatchObject({ hp: 3, max: 4 });
    expect(Store.getProfile().charms.extraHeart).toBeUndefined();
    click(findButton(s, LABELS.items)); click(findButton(s, '🎫 Golden Ticket'));
    expect(s.state.useDoubleCoins).toBe(true);
    click(findButton(s, LABELS.items));
    expect(findButton(s, '🎫 Golden Ticket')).toBeUndefined();   // spent for this duel
    click(findButton(s, LABELS.close));
    expect(s.state.phase).toBe('menu');
  });

  it('Run leaves without a result', () => {
    const s = makeScene();
    click(findButton(s, LABELS.run));
    expect(s.abort).toHaveBeenCalled();
    expect(s.finish).not.toHaveBeenCalled();
  });

  it('the clock costs a heart when it runs out, and never runs with timers off', () => {
    const s = makeScene();
    s.state.qStart = Date.now() - 999999;
    s.update();
    expect(s.state.locked).toBe(true); expect(s.state.picked).toBe(-1); expect(s.state.party[0].hp).toBe(2);
    const off = makeScene({ timers: false });
    expect(off.state.timeLimit).toBe(Infinity);
    off.state.qStart = Date.now() - 999999;
    off.update();
    expect(off.state.locked).toBe(false);
    // Opening Items pauses the clock.
    const t = makeScene();
    t.state.qStart = Date.now() - 5000;
    click(findButton(t, LABELS.items));
    t.update();
    expect(t.state.locked).toBe(false);
  });
});

describe('a boss fight on the duel screen', () => {
  beforeEach(() => boot());

  it('keeps the boss rules and result shape', () => {
    const boss = bossForZone('math');
    const s = makeScene({ gameId: boss.id, duel: undefined, boss, title: boss.name });
    expect(s.opp).toMatchObject({ kind: 'boss', hp: 8, name: boss.name });
    expect(s.state.party[0]).toMatchObject({ hp: 3, max: 3 });
    expect(s.state.party[1].max).toBe(0);
    expect(s.state.timeLimit).toBe(boss.questionTimeMs);
    for (let i = 0; i < 8; i++) { click(findButton(s, LABELS.solve)); click(findButton(s, q(s).answer)); flushTimers(s); }
    flushTimers(s);
    expect(s.finish).toHaveBeenCalledWith(expect.objectContaining({ won: true, hpLeft: 0, heartsLeft: 3, maxHearts: 3, correct: 8 }));
    expect(makeScene({ gameId: boss.id, duel: undefined, boss, timers: false }).state.timeLimit).toBe(Infinity);
  });
});

describe('launching and scoring duels', () => {
  beforeEach(() => boot());

  it('routes duel ids and boss ids to the duel scene with the right grade', () => {
    const fake = { scene: { key: 'World', pause: vi.fn(), launch: vi.fn() } };
    const p = Store.getProfile();
    const pl = launch(fake, 'duel:chef-fraction', { source: 'roam' });
    expect(pl).toMatchObject({ sceneKey: DUEL_SCENE, title: 'Chef Fraction', subject: 'math', noReview: true, grade: gameGrade(p, 'math-pizza') });
    expect(pl.duel.npcId).toBe('chef-fraction');
    expect(pl.level).toBeUndefined();
    expect(fake.scene.launch).toHaveBeenCalledWith('MG_Duel', pl);
    expect(launch(fake, 'boss-math', {}).sceneKey).toBe(BOSS_SCENE);
    expect(() => launch(fake, 'duel:signpost', {})).toThrow();
  });

  it('scores a win by the party health left, records the first win, and doubles coins with a Golden Ticket', () => {
    const p = newProfile({ name: 'A', grade: 3 });
    const payload = { gameId: 'duel:prof-plus', subject: 'math', band: 'A', duel: duelFor('prof-plus') };
    const r = applyResult(p, payload, { won: true, hpLeft: 0, partyHp: 5, partyMax: 5, correct: 5, total: 5, timeMs: 1000 });
    expect(r).toMatchObject({ stars: 3, coins: 30, xp: 100, passed: true, newDuelWin: true });
    expect(p.world.duels['prof-plus']).toMatchObject({ won: true, attempts: 1, bestHp: 5 });
    expect(p.badges).toContain('duelist');
    expect(mastery(p, 'math').level).toBe(0); expect(r.masteryChange).toBeUndefined();
    const lost = applyResult(p, payload, { won: false, hpLeft: 3, partyHp: 0, partyMax: 5, correct: 2, total: 7, timeMs: 1000 });
    expect(lost.stars).toBe(0); expect(lost.newDuelWin).toBeUndefined();
    expect(p.world.duels['prof-plus']).toMatchObject({ won: true, attempts: 2, bestHp: 5 });
    expect(applyResult(p, payload, { won: true, hpLeft: 0, partyHp: 2, partyMax: 5, correct: 5, total: 8, timeMs: 1 }).stars).toBe(1);
    expect(applyResult(p, payload, { won: true, hpLeft: 0, partyHp: 3, partyMax: 5, correct: 5, total: 7, timeMs: 1 }).stars).toBe(2);
    p.charms = { doubleCoins: true };
    const doubled = applyResult(p, payload, { won: true, hpLeft: 0, partyHp: 5, partyMax: 5, correct: 5, total: 5, timeMs: 1, useDoubleCoins: true });
    expect(doubled).toMatchObject({ coins: 60, doubledCoins: true });
    expect(p.charms.doubleCoins).toBeUndefined();
    expect(BADGES.find((b) => b.id === 'duel-master').test(p)).toBe(false);
  });
});
