// The spelling methods added to the Spelling Bee: tricky parts and memory tricks, spaced review, word families,
// Look-Say-Cover-Write-Check, sentence rounds, and writing a missed word right.
import { describe, it, expect, vi } from 'vitest';
import { installPhaserMock, fakeSystems, findButton, click, flushTimers } from './helpers/phaserMock.js';

installPhaserMock();
vi.mock('../src/systems/Speech.js', () => ({ speak: vi.fn(), stop: vi.fn(), rateFor: () => 0.9, canSpeak: () => true, speakWords: () => null, primeSpeech: () => false }));

const { TRICKS, trickFor, trickyIndex } = await import('../src/data/spelling/tricks.js');
const { familyRound, FAMILIES, PATTERNS } = await import('../src/data/spelling/patterns.js');
const { SPELLING_LISTS, listWords } = await import('../src/data/spelling/lists.js');
const Sp = await import('../src/systems/Spelling.js');
const { newProfile } = await import('../src/systems/SaveSystem.js');
const Store = await import('../src/systems/Store.js');
const { SpellingLearnScene } = await import('../src/scenes/SpellingLearnScene.js');
const { SpellingGameScene } = await import('../src/scenes/SpellingGameScene.js');
const { SpellingScene } = await import('../src/scenes/SpellingScene.js');
const { Rng } = await import('../src/systems/Rng.js');

const storage = { data: {}, getItem(k) { return this.data[k] ?? null; }, setItem(k, v) { this.data[k] = v; }, removeItem(k) { delete this.data[k]; } };
globalThis.localStorage = storage;
Store.init();
Store.createProfile({ name: 'Kid', grade: 2 });
const reset = () => Store.updateProfile((p) => { p.grade = 2; p.spelling = { words: {}, lists: {}, sessions: 0, tests: [] }; });
const scene = (Cls, data) => { const s = new Cls(); fakeSystems(s); s.init(data); s.create({}); return s; };

describe('tricky parts and memory tricks', () => {
  it('every class list word has a trick whose tricky letters are really in the word', () => {
    for (const lists of Object.values(SPELLING_LISTS)) for (const l of lists) for (const e of listWords(l)) {
      const t = trickFor(e.w, e);
      expect(t, e.w).toBeTruthy();
      expect(trickyIndex(e.w, t.tricky), e.w).toBeGreaterThanOrEqual(0);
    }
    for (const [w, t] of Object.entries(TRICKS)) expect(trickyIndex(w, t.tricky), w).toBeGreaterThanOrEqual(0);
    expect(trickFor('Caribbean').tricky).toBe('bb');   // keys ignore case
    expect(trickFor('school', { trick: 'Our own trick.' }).trick).toBe('Our own trick.');   // a list's own trick wins
    expect(trickFor('zebra')).toBeNull();
  });

  it('rings the built-in tricky part plus the letters a child has got wrong before', () => {
    const p = newProfile({ name: 'A', grade: 2 });
    expect(Sp.trickySpots(p, 'matter')).toEqual([2, 3]);                 // the tt
    Sp.recordSpelling(p, 'matter', false, 'listen', 'mater');           // m-a-t-e-r: letters 3 onwards are off
    expect(p.spelling.words.matter.miss).toMatchObject({ 3: 1, 4: 1, 5: 1 });
    expect(Sp.trickySpots(p, 'matter')).toEqual([2, 3, 4, 5]);
    Sp.recordSpelling(p, 'matter', false, 'listen');                    // no typed answer: nothing new remembered
    expect(p.spelling.words.matter.miss[3]).toBe(1);
  });
});

describe('spaced review', () => {
  const T0 = 1_000_000_000_000;
  it('a right answer waits longer each time; a miss is due again today', () => {
    const p = newProfile({ name: 'A', grade: 2 });
    let st = Sp.recordSpelling(p, 'school', true, 'look', null, T0);
    expect(st.box).toBe(1); expect(st.due).toBe(T0 + Sp.DAY);
    st = Sp.recordSpelling(p, 'school', true, 'fill', null, T0);
    expect(st.box).toBe(2); expect(st.due).toBe(T0 + 2 * Sp.DAY);
    for (let i = 0; i < 6; i++) st = Sp.recordSpelling(p, 'school', true, 'listen', null, T0);
    expect(st.box).toBe(Sp.REVIEW_DAYS.length - 1); expect(st.due).toBe(T0 + 14 * Sp.DAY);
    st = Sp.recordSpelling(p, 'school', false, 'listen', 'skool', T0);
    expect(st.box).toBe(0); expect(st.due).toBe(T0);
    // Taught on the flash cards: first review tomorrow.
    expect(Sp.recordTaught(p, 'home', T0).due).toBe(T0 + Sp.DAY);
  });

  it('lists the words due today, longest overdue first, and only words already met', () => {
    const p = newProfile({ name: 'A', grade: 2 });
    Sp.recordSpelling(p, 'school', false, 'look', 'scool', T0 - 2 * Sp.DAY);
    Sp.recordSpelling(p, 'home', false, 'look', 'hom', T0 - Sp.DAY);
    Sp.recordSpelling(p, 'learn', true, 'look', null, T0);   // due tomorrow
    const due = Sp.dueWords(p, T0);
    expect(due.map((e) => e.w)).toEqual(['school', 'home']);
    expect(due[0]).toMatchObject({ w: 'school', pic: '🏫' });
    expect(Sp.dueWords(newProfile({ name: 'B', grade: 2 }), T0)).toEqual([]);
    expect(Sp.nextReviewAt(p)).toBe(T0 - 2 * Sp.DAY);
    expect(Sp.nextReviewAt(newProfile({ name: 'C' }))).toBeNull();
  });

  it("the hub shows Today's practice and starts it with the due words", () => {
    reset();
    Store.updateProfile((p) => { Sp.recordSpelling(p, 'school', false, 'look', 'scool'); });
    const hub = scene(SpellingScene, {});
    expect(hub.objs.some((o) => o.text === "📅 Today's practice")).toBe(true);
    const started = [];
    hub.scene.start = (k, d) => started.push([k, d]);
    click(findButton(hub, 'Review now'));
    expect(started[0][1]).toMatchObject({ listKind: 'review', title: "Today's practice" });
    expect(started[0][1].words.map((e) => e.w)).toEqual(['school']);
    const game = scene(SpellingGameScene, started[0][1]);
    expect(game.list).toMatchObject({ id: 'review', title: "Today's practice" });
    expect(game.state.rounds.map((r) => r.word)).toEqual(['school']);
  });
});

describe('word families', () => {
  it('every pattern has a family, and a round mixes new family words with outsiders', () => {
    for (const p of PATTERNS) expect(FAMILIES[p.letters], p.letters).toBeTruthy();
    const rng = new Rng(3);
    const r = familyRound('er', ['teacher', 'matter', 'gender'], (a) => rng.shuffle(a));
    const members = r.words.filter((x) => x.member), others = r.words.filter((x) => !x.member);
    expect(members).toHaveLength(3); expect(others).toHaveLength(3);
    for (const m of members) expect(m.word.endsWith('er')).toBe(true);
    for (const o of others) expect(o.word.includes('er')).toBe(false);
    expect(r.words.some((x) => ['teacher', 'matter', 'gender'].includes(x.word))).toBe(false);
    expect(familyRound('zz', [], (a) => a)).toBeNull();
  });

  it('the teaching runs a find-the-family round after each pattern card', () => {
    reset();
    const s = scene(SpellingLearnScene, { listId: 'g2-1' });
    expect(s.state.stage).toBe('patterns');
    s.advance();
    expect(s.state.pStep).toBe('family');
    expect(findButton(s, 'Skip ▶')).toBeTruthy();
    const f = s.state.family;
    const outsider = f.words.find((x) => !x.member);
    s.tapFamily(outsider);
    expect(f.wrong).toEqual([outsider.word]);
    f.words.filter((x) => x.member).forEach((x) => s.tapFamily(x));
    expect(s.familyDone()).toBe(true);
    expect(findButton(s, 'Next ▶')).toBeTruthy();
    while (s.state.stage === 'patterns') s.advance();
    expect(s.state.step).toBe('card');
  });
});

describe('Look, Say, Cover, Write, Check', () => {
  it('a miss shows the word beside the attempt, Look again goes back, and Next word appears after two tries', () => {
    reset();
    const s = scene(SpellingLearnScene, { listId: 'g2-1' });
    while (s.state.stage === 'patterns') s.advance();
    s.state.step = 'cover'; s.state.cover = 'look'; s.rebuild();
    const word = s.entry.word;
    expect(s.objs.some((o) => o.text === 'Look at the word and say it out loud.')).toBe(true);
    s.coverIt();
    s.type('x'); s.checkCover();
    expect(s.state.cover).toBe('check'); expect(s.state.result).toBe('wrong');
    expect(Store.getProfile().spelling.words[word]).toMatchObject({ wrong: 1, box: 0 });
    expect(findButton(s, '👀 Look again')).toBeTruthy();
    expect(findButton(s, 'Next word ▶')).toBeFalsy();
    click(findButton(s, '👀 Look again'));
    expect(s.state.cover).toBe('look'); expect(s.state.typed).toBe('');
    s.coverIt(); s.type('y'); s.checkCover();
    expect(Store.getProfile().spelling.words[word].wrong).toBe(1);   // only the first try is recorded
    expect(findButton(s, 'Next word ▶')).toBeTruthy();
  });

  it('the flash card shows the memory trick and rings the tricky letters', () => {
    reset();
    const s = scene(SpellingLearnScene, { listId: 'g2-1' });
    while (s.state.stage === 'patterns') s.advance();
    expect(s.objs.some((o) => typeof o.text === 'string' && o.text.startsWith('🧠 '))).toBe(true);
    const letters = s.wordLetters(s.entry);
    expect(letters.some((l) => l.tricky)).toBe(true);
  });
});

describe('practice: sentence rounds and writing a missed word right', () => {
  it('words go look → fill → sentence → listen, and a sentence round shows the sentence with a gap', () => {
    expect(Sp.pickMode({ right: 2, wrong: 0, streak: 2, heardRight: 0 }, true)).toBe('sentence');
    expect(Sp.pickMode({ right: 2, wrong: 0, streak: 2, heardRight: 0 }, false)).toBe('listen');
    expect(Sp.pickMode({ right: 3, wrong: 0, streak: 3, heardRight: 1 }, true)).toBe('listen');
    expect(Sp.blankSentence('The Caribbean Sea is warm.', 'Caribbean')).toBe('The _____ Sea is warm.');
    expect(Sp.blankSentence('No match here.', 'school')).toBeNull();
    reset();
    Store.updateProfile((p) => { Sp.recordSpelling(p, 'school', true, 'look'); Sp.recordSpelling(p, 'school', true, 'fill'); });
    const s = scene(SpellingGameScene, { listId: 'g2-1' });
    const i = s.state.rounds.findIndex((r) => r.word === 'school');
    expect(s.state.rounds[i].mode).toBe('sentence');
    s.state.idx = i; s.state.phase = 'type'; s.rebuild();
    expect(s.objs.some((o) => typeof o.text === 'string' && o.text.includes('We walk to _____ in the morning.'))).toBe(true);
    for (const ch of 'school') s.type(ch);
    s.check();
    expect(s.state.right).toBe(true);
  });

  it('after a miss: the trick shows, Write it right copies the word once, and then the game moves on', () => {
    reset();
    const s = scene(SpellingGameScene, { listId: 'g2-1' });
    if (s.state.phase === 'show') s.hideWord();
    const word = s.round.word;
    s.type('z'); s.check();
    expect(s.state.right).toBe(false);
    expect(Store.getProfile().spelling.words[word].miss[0]).toBe(1);   // the first letter was wrong
    expect(findButton(s, '✍ Write it right')).toBeTruthy();
    expect(findButton(s, 'Next ▶')).toBeTruthy();                      // moving on is still possible
    click(findButton(s, '✍ Write it right'));
    expect(s.state.phase).toBe('fix');
    s.type('q'); s.checkFix();
    expect(s.state.fixed).toBe('wrong');
    for (const ch of word) s.type(ch);   // a fresh attempt clears the wrong one
    s.checkFix();
    expect(s.state.fixed).toBe('right');
    expect(Store.getProfile().spelling.words[word].taught).toBe(1);
    expect(Store.getProfile().spelling.words[word].right).toBe(0);   // copying is practice, not a right answer
    flushTimers(s);
    expect(s.state.idx).toBe(1);
  });

  it('the weekly test offers no trick, no fix and no rings', () => {
    reset();
    const t = scene(SpellingGameScene, { listId: 'g2-1', test: true });
    t.state.typed = 'zz'; t.check();
    expect(findButton(t, '✍ Write it right')).toBeFalsy();
    expect(t.ringed([{ ch: 'a', look: 'shown' }])[0].tricky).toBeUndefined();
  });
});
