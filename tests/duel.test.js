// The duel screen, headless against the Phaser mock: villagers and bosses, the four commands, items and the clock.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { installPhaserMock, fakeSystems, findButton, click, flushTimers } from './helpers/phaserMock.js';

installPhaserMock();
vi.mock('../src/systems/Speech.js', () => ({ speak: vi.fn(), stop: vi.fn(), rateFor: () => 0.9, canSpeak: () => false, speakWords: () => null, primeSpeech: () => false }));

const { DuelScene, LABELS } = await import('../src/scenes/minigames/DuelScene.js');
const { duelFor, DUEL } = await import('../src/data/world/duels.js');
const { duelQuestions, bossDuelQuestions, BY_GAME, fractionQuestion, bugQuestion, danceQuestion, mazeQuestion, predictQuestion, skillOf } = await import('../src/generators/duel.js');
const { runToEnd, parseLevel } = await import('../src/generators/coding/interpreter.js');
const { getLevel } = await import('../src/data/coding/levels.js');
const { programText } = await import('../src/generators/coding/text.js');
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
    'code-maze': ['sequence_code', 'repeat', 'conditional'], 'code-bug': ['sequence_code', 'repeat', 'conditional'], 'code-predict': ['sequence_code', 'repeat', 'conditional'], 'code-dance': ['sequence_code', 'repeat', 'conditional'],
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
    expect(d.prompt).toMatch(/Which program/); expect(d.choices).toContain(d.answer);
  });
});

/** programText lines back into a program (Move, Turn, Repeat with two-space nesting), for checking answers by running them. */
function parseProgram(text) {
  const lines = text.split('\n');
  let i = 0;
  const list = (depth) => {
    const out = [];
    while (i < lines.length) {
      const line = lines[i], d = (line.match(/^ */) || [''])[0].length / 2, t = line.trim();
      if (d < depth) break;
      i += 1;
      if (t === 'Move ▲') out.push({ op: 'fwd' });
      else if (t === 'Turn ◀') out.push({ op: 'left' });
      else if (t === 'Turn ▶') out.push({ op: 'right' });
      else if (/^Repeat \d+:$/.test(t)) out.push({ op: 'repeat', n: Number(t.match(/\d+/)[0]), body: list(depth + 1) });
      else if (/^If path \w+:$/.test(t)) {
        const b = { op: 'if', cond: t.split(' ')[2].slice(0, -1), then: list(depth + 1), else: null };
        if (i < lines.length && lines[i].trim() === 'Else:' && (lines[i].match(/^ */) || [''])[0].length / 2 === depth) { i += 1; b.else = list(depth + 1); }
        out.push(b);
      } else if (t === 'Until goal:') out.push({ op: 'while', cond: 'notGoal', body: list(depth + 1) });
      else throw new Error('unknown line ' + t);
    }
    return out;
  };
  return { main: list(0), functions: {} };
}

describe('code duels match the four coding lessons', () => {
  it('Robo Maze: the right program reaches the flag and the wrong ones do not, on a level drawn in the puzzle', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const q = mazeQuestion(seed % 2 ? 2 : 5, new Rng(seed));
      expect(q.code.kind).toBe('maze'); expect(q.code.choice).toBe('program'); expect(q.choices).toHaveLength(3);
      const lv = getLevel(q.code.level.id);
      expect(programText(lv.solution.main)).toBe(q.answer);
      for (const c of q.choices) expect(runToEnd(parseProgram(c), lv).solved, c).toBe(c === q.answer);
      expect(q.explain).toContain(lv.hint);
    }
  });
  it('Predict the Robot: lettered markers on the floor, and the answer letter sits where the program really stops', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const q = predictQuestion(seed % 2 ? 3 : 5, new Rng(seed * 7));
      expect(q.code.kind).toBe('predict'); expect(q.code.choice).toBe('letter');
      expect(q.choices.length).toBeGreaterThanOrEqual(3);
      expect(q.choices).toEqual(q.code.markers.map((m) => m.letter));
      const lv = parseLevel(q.code.level);
      const end = runToEnd(parseProgram(q.code.program), q.code.level).end;
      const hit = q.code.markers.find((m) => m.letter === q.answer);
      expect([hit.x, hit.y]).toEqual([end.x, end.y]);
      for (const m of q.code.markers) { expect(lv.walls[m.y][m.x]).toBe(false); expect(m.x === lv.start.x && m.y === lv.start.y).toBe(false); }
      expect(q.code.robot).toEqual({ x: lv.start.x, y: lv.start.y, dir: lv.dir });
    }
  });
  it('Bug Hunt: the numbered listing beside its maze, and the answer names a real line', () => {
    const q = bugQuestion(4, new Rng(3));
    expect(q.code.kind).toBe('bug'); expect(q.code.numbered).toBe(true); expect(q.code.choice).toBe('line');
    const n = q.code.program.split('\n').length;
    expect(n).toBeGreaterThanOrEqual(4);
    expect(Number(q.answer.slice(5))).toBeLessThanOrEqual(n);
    expect(q.prompt).toBe('Which line has the bug?');   // the listing is drawn, not spoken; the hint waits for the explanation
    expect(q.explain).toContain(q.answer);
  });
  it('Robot Dance: the path the robot walked is drawn and ends where the answer program ends', () => {
    const q = danceQuestion(3, new Rng(9));
    expect(q.code.kind).toBe('dance'); expect(q.code.path.length).toBeGreaterThan(0);
    const end = runToEnd(parseProgram(q.answer), q.code.level).end;
    expect(q.code.robot).toEqual(end);
    expect(q.code.path[q.code.path.length - 1].to).toEqual({ x: end.x, y: end.y });
  });
  it('the code boss mixes all four kinds without repeats; other bosses are unchanged', () => {
    const qs = bossDuelQuestions('code', 4, new Rng(11), 24);
    expect(new Set(qs.map((q) => q.code.kind)).size).toBe(4);
    expect(new Set(qs.map((q) => q.key)).size).toBe(24);
    expect(bossDuelQuestions('math', 4, new Rng(11), 6).every((q) => !q.code)).toBe(true);
    expect(skillOf({ main: [{ op: 'if', cond: 'ahead', then: [{ op: 'fwd' }], else: null }] })).toBe('conditional');
  });
  it('the duel screen shows program choices as cards, doubles the clock for coding puzzles, and Logic hides one of three', () => {
    boot();
    const s = makeScene({ gameId: 'duel:robo-mechanic', duel: duelFor('robo-mechanic'), subject: 'code', title: 'Robo Mechanic' });
    expect(q(s).code.kind).toBe('maze');
    expect(s.limitFor()).toBe(s.state.timeLimit * 2);
    click(findButton(s, LABELS.solve));
    expect(q(s).choices.map((c) => findButton(s, c)).every(Boolean)).toBe(true);
    s.state.qStart = Date.now() - s.state.timeLimit * 1.5; s.update();
    expect(s.state.locked).toBe(false);   // still inside the doubled clock
    click(findButton(s, LABELS.menu)); click(findButton(s, LABELS.logic));
    expect(s.state.hidden).toHaveLength(1);
    const hp = s.state.oppHp;
    s.pick(right(s));
    expect(s.state.oppHp).toBe(hp - 1);
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
