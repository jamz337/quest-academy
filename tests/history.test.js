// History Harbor: the facts, flags and generators are checked directly; the quiz and the Pre-K play version run headless.
import { describe, it, expect, vi } from 'vitest';
import { installPhaserMock, fakeSystems, findButton, click, flushTimers } from './helpers/phaserMock.js';

installPhaserMock();
vi.mock('../src/systems/Speech.js', async (importOriginal) => ({ ...(await importOriginal()), canSpeak: () => true, speak: vi.fn(), speakWords: () => null, stop: () => {} }));

const { historyQuestion, historySet, historyMix, HISTORY_GAMES, countryOfLabel, flagCode, MAP_PIC, SEA, sailPath, atSea, portAt } = await import('../src/generators/history/questions.js');
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
    expect(young.every((k) => k === 'helpers' || k === 'helper-tools')).toBe(true); expect(older).toContain('community');
    expect(historySet('his-compass', 8, new Rng(2), 10).map((q) => q.skill)).toContain('compass-degrees');
  });

  it('flag questions: the flags-only kind names nothing, the text kind describes the flag, and flag letters are never read aloud', () => {
    // Kindergarten's "which flag" kind (Pre-K paints flags instead).
    let q = null;
    for (let i = 1; !q || !q.flagChoices; i++) q = historyQuestion('his-flags', 0, new Rng(i), 1);
    expect(q.flagChoices).toBe(true);
    expect(q.choices).toHaveLength(4);
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
    expect(Object.keys(SUBJECTS).length).toBeGreaterThanOrEqual(6);
    expect(MINIGAMES.filter((g) => g.subject === 'history').map((g) => g.id)).toEqual(HISTORY_GAMES);
    for (const g of [-1, 0, 3, 8]) expect(gamesForGrade('history', g).map((x) => x.id)).toEqual(HISTORY_GAMES);
    for (const id of HISTORY_GAMES) { expect(getGame(id).sceneKey).toBe('MG_HistoryQuiz'); expect(getGame(id).playSceneKey).toBe(id === 'his-time' ? 'MG_HistoryPlay' : undefined); }   // Pre-K sails, calls for help and paints flags in the quiz itself
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
    const s = makeScene(HistoryQuiz, { gameId: 'his-flags', grade: 0, band: 'E', early: true, timers: false, seed: 1 });
    s.state.idx = s.state.questions.findIndex((x) => x.flagChoices); s.rebuild();
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

describe('Compass Quest, hands on (headless)', () => {
  it('sailing orders stay at sea and end where they say; Pre-K gets one order and no rocks; needles have a target; bosses and duels get neither', () => {
    for (const p of SEA.ports) expect(atSea(p.x, p.y)).toBe(true);
    let sails = 0, needles = 0;
    for (const grade of [-1, 0, 1, 2, 4, 6, 8]) for (let seed = 1; seed <= 8; seed++) {
      for (const q of historySet('his-compass', grade, new Rng(seed * 7 + grade), 10)) {
        if (q.sail) {
          sails++;
          const path = sailPath(q.sail.start, q.sail.orders);
          expect(path).not.toBeNull();
          expect(path.at(-1)).toEqual({ x: q.sail.dest.x, y: q.sail.dest.y });
          expect(q.sail.dest.name).toBe(portAt(q.sail.dest.x, q.sail.dest.y) ? portAt(q.sail.dest.x, q.sail.dest.y).name : 'the treasure');
          for (const r of q.sail.rocks) { expect(atSea(r.x, r.y)).toBe(true); expect(path.some((c) => c.x === r.x && c.y === r.y)).toBe(false); }
          if (grade <= -1) { expect(q.sail.orders).toHaveLength(1); expect(q.sail.rocks).toHaveLength(0); }
          if (grade <= 1) expect(q.sail.rocks).toHaveLength(0);
          expect(q.text).toContain(`Sail from ${q.sail.start.name}`);
        }
        if (q.needle) { needles++; expect(q.needle.target).toBeGreaterThanOrEqual(0); expect(q.needle.target).toBeLessThan(360); expect(q.text).toContain(q.needle.label); }
      }
    }
    expect(sails).toBeGreaterThan(100);
    expect(needles).toBeGreaterThan(30);
    for (let seed = 1; seed <= 6; seed++) for (const q of historySet('his-compass', 4, new Rng(seed), 10, null, { drawn: false })) expect(!!(q.sail || q.needle)).toBe(false);
    expect(getGame('his-compass').playSceneKey).toBeUndefined();   // Pre-K plays the quiz: it sails with one order at a time
  });

  it('the compass buttons steer the ship: a wrong turn is a try again back at port, the right orders reach the treasure; the needle is checked within its tolerance', () => {
    const s = makeScene(HistoryQuiz, { gameId: 'his-compass', grade: 4, band: 'B', seed: 4 });
    const sailIdx = s.state.questions.findIndex((q) => q.sail), needleIdx = s.state.questions.findIndex((q) => q.needle);
    expect(sailIdx).toBeGreaterThanOrEqual(0); expect(needleIdx).toBeGreaterThanOrEqual(0);
    s.state.idx = sailIdx; s.rebuild();
    const sail = s.round.sail, st = () => s.state.inter[sailIdx];
    expect(st()).toEqual({ x: sail.start.x, y: sail.start.y, leg: 0, left: sail.orders[0].n });
    const wrong = ['north', 'east', 'south', 'west'].find((d) => d !== sail.orders[0].d);
    const arrows = { north: '▲ north', west: '◀ west', south: '▼ south', east: 'east ▶' };
    click(findButton(s, arrows[wrong]));
    expect(s.state.picked).toBe(null);   // second try
    expect(s.state.missed.directions).toBe(1);
    expect(st()).toEqual({ x: sail.start.x, y: sail.start.y, leg: 0, left: sail.orders[0].n });
    for (const o of sail.orders) for (let i = 0; i < o.n; i++) click(findButton(s, arrows[o.d]));
    expect(s.state.right).toBe(true);
    expect(st()).toMatchObject({ x: sail.dest.x, y: sail.dest.y, leg: sail.orders.length });
    expect(s.state.bench.at(-1)).toMatchObject({ pic: '⛵' });
    flushTimers(s);
    s.state.idx = needleIdx; s.state.locked = false; s.state.picked = null; s.state.right = null; s.rebuild();
    const n = s.round.needle;
    s.state.inter[needleIdx].angle = (n.target + n.tolerance + 5) % 360;
    click(findButton(s, 'Check ✓'));
    expect(s.state.picked).toBe(null);   // a second try
    s.state.inter[needleIdx].angle = (n.target - n.tolerance + 1 + 360) % 360;
    click(findButton(s, 'Check ✓'));
    expect(s.state.right).toBe(true);
    expect(s.state.bench.at(-1)).toMatchObject({ pic: '🧭' });
  });
});

describe('Community Helpers, hands on (headless)', () => {
  it('calls name a building that is there, kits hold exactly two of the helper\'s things, budgets four public and two private; Pre-K gets calls only with four buildings', () => {
    let calls = 0, kits = 0, budgets = 0;
    for (const grade of [-1, 0, 1, 3, 4, 6, 8]) for (let seed = 1; seed <= 8; seed++) {
      for (const q of historySet('his-helpers', grade, new Rng(seed * 5 + grade), 10)) {
        if (q.call) {
          calls++;
          const right = q.call.buildings.filter((b) => b.id === q.call.to);
          expect(right).toHaveLength(1);
          expect(new Set(q.call.buildings.map((b) => b.name)).size).toBe(q.call.buildings.length);
          expect(new Set(q.call.buildings.map((b) => b.pic)).size).toBe(q.call.buildings.length);
          expect(q.call.buildings).toHaveLength(grade <= -1 ? 4 : 6);
          expect(right[0].car).toBeTruthy();
        }
        if (q.kit) { kits++; expect(q.kit.shelf).toHaveLength(6); expect(q.kit.shelf.filter((t) => t.owner === q.kit.helper.name)).toHaveLength(2); expect(new Set(q.kit.shelf.map((t) => t.pic)).size).toBe(6); }
        if (q.budget) { budgets++; expect(q.budget.items.filter((t) => t.pub)).toHaveLength(4); expect(q.budget.items.filter((t) => !t.pub && t.why)).toHaveLength(2); expect(q.budget.coins).toBe(4); }
        if (grade <= -1) expect(!!q.call).toBe(true);
      }
    }
    expect(calls).toBeGreaterThan(60); expect(kits).toBeGreaterThan(40); expect(budgets).toBeGreaterThan(20);
    for (let seed = 1; seed <= 6; seed++) for (const grade of [-1, 2, 6]) for (const q of historySet('his-helpers', grade, new Rng(seed), 10, null, { drawn: false })) expect(!!(q.call || q.kit || q.budget)).toBe(false);
    expect(getGame('his-helpers').playSceneKey).toBeUndefined();
  });

  it('a wrong building is a try again and the right one drives the helper over; the bag takes two right things; coins pay only for public services', () => {
    const s = makeScene(HistoryQuiz, { gameId: 'his-helpers', grade: 5, band: 'C', seed: 6 });
    const idx = (k) => s.state.questions.findIndex((q) => q[k]);
    const go = (k) => { s.state.idx = idx(k); s.state.locked = false; s.state.picked = null; s.state.right = null; s.rebuild(); return s.round[k]; };
    // Calls come from a lower grade's set.
    const s2 = makeScene(HistoryQuiz, { gameId: 'his-helpers', grade: 2, band: 'A', seed: 6 });
    s2.state.idx = s2.state.questions.findIndex((q) => q.call); s2.rebuild();
    const c = s2.round.call, wrongB = c.buildings.find((b) => b.id !== c.to);
    s2.callTap(wrongB.id);
    expect(s2.state.picked).toBe(null); expect(s2.state.missed.helpers).toBe(1);
    expect(s2.state.inter[s2.state.idx].hint).toContain(wrongB.who);
    s2.callTap(c.to);
    expect(s2.state.right).toBe(true);
    expect(s2.state.bench.at(-1).pic).toBe(c.buildings.find((b) => b.id === c.to).car);

    const k = go('kit');
    const mine = k.shelf.map((t, i) => (t.owner === k.helper.name ? i : -1)).filter((i) => i >= 0), other = k.shelf.findIndex((t) => t.owner !== k.helper.name);
    s.kitDrop(other);
    expect(s.state.picked).toBe(null); expect(s.state.inter[s.state.idx].hint).toContain(k.shelf[other].owner);
    s.kitDrop(mine[0]);
    expect(s.state.picked).toBe(null); expect(s.state.inter[s.state.idx].packed).toEqual([mine[0]]);
    s.kitDrop(mine[0]);   // already in the bag: nothing happens
    expect(s.state.inter[s.state.idx].packed).toEqual([mine[0]]);
    s.kitDrop(mine[1]);
    expect(s.state.right).toBe(true);
    expect(s.state.bench.at(-1).pic).toBe(k.helper.pic);

    const b = go('budget');
    const pubs = b.items.map((t, i) => (t.pub ? i : -1)).filter((i) => i >= 0), priv = b.items.findIndex((t) => !t.pub);
    s.budgetPay(priv);
    expect(s.state.picked).toBe(null); expect(s.state.inter[s.state.idx].hint).toContain(b.items[priv].why);
    pubs.slice(0, 3).forEach((i) => s.budgetPay(i));
    expect(s.state.picked).toBe(null); expect(s.state.inter[s.state.idx].paid).toEqual(pubs.slice(0, 3));
    s.budgetPay(priv);   // a second wrong coin: the round is missed and explained
    expect(s.state.right).toBe(false); expect(s.state.locked).toBe(true);
    expect(findButton(s, 'Next ▶')).toBeTruthy();
  });
});

describe('Flag Finder, hands on (headless)', () => {
  it('paint flags have parts with pots for every colour (Pre-K: Caribbean and Japan, with the flag to copy); fly flags know their part of the world and spot; pairs hold each flag and its word once', async () => {
    const { FLAG_PARTS, PREK_PAINT, partAt } = await import('../src/data/history/flagParts.js');
    const { COUNTRY_AT, landAt } = await import('../src/data/history/worldMap.js');
    // Every country's spot is in its own part of the world, and every part of every paintable flag can be tapped.
    for (const c of F.COUNTRIES) expect(landAt(...COUNTRY_AT[c.code]), c.code).toBe(c.continent);
    for (const [code, parts] of Object.entries(FLAG_PARTS)) {
      expect(F.COUNTRIES.some((c) => c.code === code), code).toBe(true);
      parts.forEach((p, i) => { let hit = false; for (let x = 1; x < 150 && !hit; x += 2) for (let y = 1; y < 100 && !hit; y += 2) hit = partAt(parts, x, y) === i; expect(hit, `${code} part ${i}`).toBe(true); });
    }
    let paints = 0, flies = 0, pairs = 0;
    for (const grade of [-1, 0, 1, 3, 5, 8]) for (let seed = 1; seed <= 8; seed++) {
      for (const q of historySet('his-flags', grade, new Rng(seed * 3 + grade), 10)) {
        if (q.paint) {
          paints++;
          for (const p of q.paint.parts) expect(q.paint.pots).toContain(p.paint);
          if (grade <= -1) { expect(PREK_PAINT).toContain(q.paint.code); expect(q.paint.model).toBe(true); expect(q.paint.pots.length).toBe(new Set(q.paint.parts.map((p) => p.paint)).size + 1); }
          else expect(q.paint.model).toBe(false);
        }
        if (q.fly) { flies++; expect(landAt(...q.fly.at)).toBe(q.fly.where); }
        if (q.pairs) {
          pairs++;
          const codes = q.pairs.cards.map((c) => c.code);
          expect(q.pairs.cards).toHaveLength(grade <= 0 ? 8 : 12);
          for (const code of new Set(codes)) { expect(q.pairs.cards.filter((c) => c.code === code && c.kind === 'flag')).toHaveLength(1); expect(q.pairs.cards.filter((c) => c.code === code && c.kind === 'word')).toHaveLength(1); }
        }
        if (grade <= -1) expect(!!q.paint).toBe(true);
      }
    }
    expect(paints).toBeGreaterThan(80); expect(flies).toBeGreaterThan(30); expect(pairs).toBeGreaterThan(20);
    for (let seed = 1; seed <= 6; seed++) for (const grade of [-1, 2, 6]) for (const q of historySet('his-flags', grade, new Rng(seed), 10, null, { drawn: false })) expect(!!(q.paint || q.fly || q.pairs)).toBe(false);
    expect(getGame('his-flags').playSceneKey).toBeUndefined();
  });

  it('painting: blank parts are pointed out, wrong colours are a second try, right colours win; flying: the wrong part of the world is a try again; pairs: a match stays, a miss turns back, finishing wins', () => {
    // A game that holds all three boards.
    let s = null;
    for (let seed = 1; !s || !['paint', 'fly', 'pairs'].every((k) => s.state.questions.some((q) => q[k])); seed++) s = makeScene(HistoryQuiz, { gameId: 'his-flags', grade: 3, band: 'A', seed });
    const go = (k) => { s.state.idx = s.state.questions.findIndex((q) => q[k]); s.state.locked = false; s.state.picked = null; s.state.right = null; s.rebuild(); return s.round[k]; };
    const P = go('paint'), st = () => s.state.inter[s.state.idx];
    s.paintCheck();
    expect(st().hint).toContain('blank'); expect(s.state.picked).toBe(null); expect(s.state.missed.flags).toBeUndefined();
    const wrongPot = P.pots.find((k) => k !== P.parts[0].paint);
    P.parts.forEach((p, i) => { s.paintPot(i === 0 ? wrongPot : p.paint); s.paintPart(i); });
    s.paintCheck();
    expect(s.state.picked).toBe(null); expect(st().wrong).toEqual([0]); expect(s.state.missed.flags).toBe(1);
    s.paintPot(P.parts[0].paint); s.paintPart(0);
    expect(st().wrong).toEqual([]);
    s.paintCheck();
    expect(s.state.right).toBe(true); expect(s.state.bench.at(-1).flag).toBe(P.code);
    flushTimers(s);

    const Fq = go('fly'), other = ['Asia', 'Europe', 'Africa'].find((w) => w !== Fq.where);
    s.flyDrop(other);
    expect(s.state.picked).toBe(null); expect(s.state.inter[s.state.idx].hint).toContain(other);
    s.flyDrop(Fq.where);
    expect(s.state.right).toBe(true); expect(s.state.bench.at(-1).flag).toBe(Fq.code);
    flushTimers(s);

    const Pq = go('pairs'), cards = Pq.cards, idxOf = (code, kind) => cards.findIndex((c) => c.code === code && c.kind === kind);
    const a = cards[0].code, b = cards.find((c) => c.code !== a).code;
    s.pairsTap(idxOf(a, 'flag')); s.pairsTap(idxOf(b, 'word'));
    expect(st().busy).toBe(true); expect(st().turns).toBe(1);
    s.pairsTap(idxOf(a, 'word'));   // ignored while the miss is showing
    expect(st().open).toHaveLength(2);
    flushTimers(s);
    expect(st().open).toEqual([]); expect(st().busy).toBe(false);
    for (const code of new Set(cards.map((c) => c.code))) { s.pairsTap(idxOf(code, 'flag')); s.pairsTap(idxOf(code, 'word')); }
    expect(st().matched).toHaveLength(cards.length / 2);
    expect(s.state.right).toBe(true);
  });

  it('pairs finished with too many turns count as a miss and are explained', () => {
    let s = null;
    for (let seed = 1; !s || !s.state.questions.some((q) => q.pairs); seed++) s = makeScene(HistoryQuiz, { gameId: 'his-flags', grade: 3, band: 'A', seed });
    s.state.idx = s.state.questions.findIndex((q) => q.pairs); s.rebuild();
    const P = s.round.pairs, st = s.state.inter[s.state.idx];
    st.turns = P.limit;   // pretend many misses already
    const idxOf = (code, kind) => P.cards.findIndex((c) => c.code === code && c.kind === kind);
    for (const code of new Set(P.cards.map((c) => c.code))) { s.pairsTap(idxOf(code, 'flag')); s.pairsTap(idxOf(code, 'word')); }
    expect(s.state.right).toBe(false); expect(s.state.locked).toBe(true);
    expect(findButton(s, 'Next ▶')).toBeTruthy();
  });
});

describe('History Harbor for Pre-K (headless)', () => {
  it('each set has six things with homes and asks that can be answered; proper names take no article', () => {
    for (const id of Object.keys(HISTORY_PLAY_SETS)) {
      const set = HISTORY_PLAY_SETS[id];
      expect(set.items).toHaveLength(6);
      for (const it of set.items) expect(targetOf(set, it), it.name).toBeTruthy();
      const asks = makePlayAsks(set, new Rng(1), 3);
      expect(asks).toHaveLength(3);
      expect(new Set(asks.map((a) => a.item.name)).size).toBe(3);
    }
    expect(Object.keys(HISTORY_PLAY_SETS)).toEqual(HISTORY_GAMES.filter((id) => getGame(id).playSceneKey));
    const time = HISTORY_PLAY_SETS['his-time'];
    expect(playFoundLine(time, time.items[0])).toBe('Yes! The candle. Long ago!');
  });

  it('Pre-K launches the play version; touching sends each thing home, then the asks are answered at the panels', () => {
    Store.updateProfile((p) => { p.grade = -1; });
    const from = { scene: { key: 'ChallengeMenu', pause() {}, launch() {} } };
    expect(launch(from, 'his-time', {}).sceneKey).toBe('MG_HistoryPlay');
    expect(launch(from, 'his-flags', {}).sceneKey).toBe('MG_HistoryQuiz');   // Pre-K paints flags in the quiz
    Store.updateProfile((p) => { p.grade = 3; });
    expect(launch(from, 'his-time', {}).sceneKey).toBe('MG_HistoryQuiz');

    for (const id of ['his-time']) {
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
