import { describe, it, expect, vi } from 'vitest';
import { installPhaserMock, fakeSystems, findButton, click, flushTimers } from './helpers/phaserMock.js';

installPhaserMock();
vi.mock('../src/systems/Speech.js', () => ({ speak: vi.fn(), stop: vi.fn(), rateFor: () => 0.9, canSpeak: () => true, speakWords: () => null, primeSpeech: () => false }));

const { SPELLING_LISTS, SPELLING_GRADES, spellingGradeFor, listsForGrade, getList, listWords } = await import('../src/data/spelling/lists.js');
const { planSession, pickMode, blankPositions, markSpelling, recordSpelling, finishSession, listProgress, isLearned, sessionReward, LEARNED_STREAK } = await import('../src/systems/Spelling.js');
const { newProfile, migrate, defaultSave } = await import('../src/systems/SaveSystem.js');
const { spellingSummary } = await import('../api/_lib/summary.js');
const Store = await import('../src/systems/Store.js');
const { SpellingGameScene } = await import('../src/scenes/SpellingGameScene.js');
const { SpellingScene } = await import('../src/scenes/SpellingScene.js');
const { Rng } = await import('../src/systems/Rng.js');

describe('spelling lists', () => {
  it('exist for grades 2 and 4, with lowercase unique words, and map every grade to one of them', () => {
    expect(SPELLING_GRADES).toEqual([2, 4]);
    for (const g of SPELLING_GRADES) for (const l of SPELLING_LISTS[g]) {
      const words = listWords(l).map((e) => e.w);
      expect(words.length).toBeGreaterThanOrEqual(5);
      expect(new Set(words).size).toBe(words.length);
      for (const w of words) expect(w).toMatch(/^[a-z'-]+$/);
      expect(getList(l.id)).toBe(l);
    }
    expect(spellingGradeFor(2)).toBe(2); expect(spellingGradeFor(3)).toBe(2); expect(spellingGradeFor(4)).toBe(4); expect(spellingGradeFor(8)).toBe(4);
    expect(listsForGrade(6)).toBe(SPELLING_LISTS[4]);
    expect(listWords({ words: ['co-co-nut', { w: 'Because', s: 'A sentence.' }] })).toEqual([{ w: 'coconut', syl: 'co-co-nut', s: null }, { w: 'because', syl: 'because', s: 'A sentence.' }]);
    expect(listWords(SPELLING_LISTS[4][0]).map((e) => e.w)).toContain('caribbean');
  });
});

describe('spelling progress', () => {
  it('moves a word from look to fill to listen and marks it learned after three heard successes', () => {
    const p = newProfile({ name: 'A', grade: 2 });
    const list = SPELLING_LISTS[2][0];
    const w = listWords(list)[0].w;
    expect(pickMode({ right: 0, wrong: 0, streak: 0, heardRight: 0 })).toBe('look');
    let st = recordSpelling(p, w, true, 'look');
    expect(pickMode(st)).toBe('fill');
    st = recordSpelling(p, w, true, 'fill');
    expect(pickMode(st)).toBe('listen');
    recordSpelling(p, w, false, 'listen');
    expect(pickMode(p.spelling.words[w])).toBe('fill');   // a miss drops it back
    expect(p.skills.spelling.missed).toBe(1);
    for (let i = 0; i < LEARNED_STREAK; i++) recordSpelling(p, w, true, 'listen');
    expect(isLearned(p, w)).toBe(true);
    expect(listProgress(p, list)).toMatchObject({ learned: 1, total: 8, tricky: [] });
    recordSpelling(p, 'teacher', false, 'look');
    expect(listProgress(p, list).tricky).toEqual(['teacher']);
  });

  it('plans sessions that put unlearned words first, blanks a sensible number of letters, and marks letters', () => {
    const p = newProfile({ name: 'A', grade: 4 });
    const list = SPELLING_LISTS[4][0];
    for (let i = 0; i < LEARNED_STREAK; i++) recordSpelling(p, 'coconut', true, 'listen');
    const rounds = planSession(p, list, new Rng(3).next);
    expect(rounds).toHaveLength(7);
    expect(rounds.filter((r) => r.mode === 'look')).toHaveLength(6);
    expect(rounds.find((r) => r.word === 'coconut')).toMatchObject({ mode: 'listen', syllables: 'co-co-nut' });
    expect(planSession(p, { id: 'x', words: ['cat', 'dog'] }, new Rng(1).next)).toHaveLength(2);
    const rnd = new Rng(5).next;
    expect(blankPositions('cat', rnd)).toHaveLength(1);
    expect(blankPositions('believe', rnd)).toHaveLength(2);
    expect(blankPositions('knowledge', rnd)).toHaveLength(3);
    expect(new Set(blankPositions("don't", rnd)).size).toBe(2);
    expect(markSpelling('becuase', 'because')).toMatchObject({ right: false });
    expect(markSpelling('becuase', 'because').marks.map((m) => m.ok)).toEqual([true, true, true, false, false, true, true]);
    expect(markSpelling('cat', 'cats').marks.at(-1)).toMatchObject({ ch: 's', missing: true });
    expect(markSpelling('CATS', 'cats').right).toBe(true);
  });

  it('pays session rewards, keeps list bests and survives a save round-trip; the dashboard summarises it', () => {
    const p = newProfile({ name: 'A', grade: 2 });
    expect(sessionReward(10, 10)).toEqual({ coins: 30, xp: 70, stars: 3 });
    expect(sessionReward(7, 10)).toEqual({ coins: 14, xp: 35, stars: 2 });
    const r = finishSession(p, 'g2-1', 9, 10);
    expect(r.stars).toBe(3); expect(p.coins).toBe(18); expect(p.spelling.lists['g2-1']).toEqual({ best: 3, plays: 1 });
    const save = defaultSave(); save.profiles[p.id] = p;
    const back = migrate(JSON.parse(JSON.stringify(save)));
    expect(back.profiles[p.id].spelling.sessions).toBe(1);
    const old = migrate({ version: 1, profiles: { x: { id: 'x', name: 'Old' } } });
    expect(old.profiles.x.spelling).toEqual({ words: {}, lists: {}, sessions: 0 });
    for (let i = 0; i < 3; i++) recordSpelling(p, 'again', true, 'listen');
    recordSpelling(p, 'always', false, 'look');
    expect(spellingSummary(p)).toMatchObject({ practised: 2, learned: 1, tricky: ['always'], sessions: 1, tests: [] });
  });
});

describe('Spelling Bee scenes (headless)', () => {
  const storage = { data: {}, getItem(k) { return this.data[k] ?? null; }, setItem(k, v) { this.data[k] = v; }, removeItem(k) { delete this.data[k]; } };
  globalThis.localStorage = storage;
  Store.init();
  Store.createProfile({ name: 'Kid', grade: 2 });

  function game(data) {
    const s = new SpellingGameScene();
    fakeSystems(s);
    s.init(data);
    s.create({});
    return s;
  }

  it('shows a new word, hides it, marks the typed answer and pays out at the end', () => {
    const s = game({ listId: 'g2-1' });
    expect(s.state.rounds).toHaveLength(8);
    expect(s.state.phase).toBe('show');
    expect(s.objs.some((o) => typeof o.text === 'string' && o.text.includes(' · ') || s.round.syllables === s.round.word)).toBe(true);
    click(findButton(s, "I've got it!"));
    expect(s.state.phase).toBe('type');
    const word = s.round.word;
    for (const ch of word) s.type(ch);
    s.type('x'); s.type('⌫');
    click(findButton(s, 'Check ✓'));
    expect(s.state.phase).toBe('result'); expect(s.state.right).toBe(true);
    flushTimers(s);   // right answers move on by themselves
    expect(s.state.idx).toBe(1);
    // A wrong answer waits for Next and shows the word.
    if (s.state.phase === 'show') s.hideWord();
    s.keyDown({ key: 'z' }); s.keyDown({ key: 'Enter' });
    expect(s.state.right).toBe(false);
    expect(s.objs.some((o) => o.text && String(o.text).startsWith('It is spelt'))).toBe(true);
    s.keyDown({ key: 'Enter' });
    expect(s.state.idx).toBe(2);
    // Finish the rest quickly.
    while (!s.state.done) {
      if (s.state.phase === 'show') s.hideWord();
      s.state.typed = s.target(); s.check();
      if (s.state.phase === 'result') s.next();
    }
    expect(s.state.correct).toBe(7);
    expect(s.state.reward.stars).toBe(2);
    expect(Store.getProfile().spelling.sessions).toBe(1);
    expect(findButton(s, 'Done')).toBeTruthy();
  });

  it('fill rounds only take the missing letters, and the hub lists the grade with progress', () => {
    Store.updateProfile((p) => { p.spelling = { words: {}, lists: {}, sessions: 0 }; recordSpelling(p, 'school', true, 'look'); });
    const s = game({ listId: 'g2-1' });
    const fill = s.state.rounds.find((r) => r.mode === 'fill');
    expect(fill.word).toBe('school'); expect(fill.blanks).toHaveLength(2);
    const hub = new SpellingScene();
    fakeSystems(hub);
    hub.init({});
    hub.create({});
    expect(findButton(hub, 'Grade 2')).toBeTruthy();
    expect(hub.objs.some((o) => o.text === 'Words 1–8')).toBe(true);
    const tricky = game({ listId: null, words: ['school', 'home'] });
    expect(tricky.list.id).toBe('tricky');
    expect(tricky.state.rounds).toHaveLength(2);
  });
});

const { SpellingLearnScene } = await import('../src/scenes/SpellingLearnScene.js');
const { chunkChips, letterRow, fitTile, keyFromEvent } = await import('../src/ui/SpellingWidgets.js');

describe('Spelling Bee teaching (headless)', () => {

  function learn(data) {
    const s = new SpellingLearnScene();
    fakeSystems(s);
    s.init(data);
    s.create({});
    return s;
  }

  it('walks a word through the flash card, building it from chunks and copying it, then offers the test', () => {
    const s = learn({ listId: 'g4-1' });
    while (s.state.stage === 'patterns') s.advance();
    expect(s.state.words[0].chunks.length).toBeGreaterThan(1);
    expect(s.state.step).toBe('card');
    expect(findButton(s, '🔊 Sound it out')).toBeTruthy();
    click(findButton(s, 'Next ▶'));
    expect(s.state.step).toBe('trace');
    click(findButton(s, 'Skip ▶'));
    expect(s.state.step).toBe('build');
    const e = s.entry;
    // Tapping chunks out of order is refused; in order they fill the word.
    s.tapChunk(e.chunks.length - 1);
    expect(s.state.placed).toEqual([]);
    e.chunks.forEach((_, i) => s.tapChunk(i));
    expect(s.state.result).toBe('right');
    flushTimers(s);
    expect(s.state.step).toBe('copy');
    s.keyDown({ key: 'x' }); s.keyDown({ key: 'Enter' });
    expect(s.state.result).toBe('wrong');
    for (const ch of e.word) s.type(ch);   // a fresh attempt clears the wrong one
    expect(s.state.typed).toBe(e.word);
    s.checkCopy();
    expect(s.state.result).toBe('right');
    expect(Store.getProfile().spelling.words[e.word].taught).toBe(1);
    flushTimers(s);
    expect(s.state.idx).toBe(1);
    expect(s.state.step).toBe('card');
    // Run the rest through quickly.
    while (!s.state.done) {
      if (s.state.step === 'card') s.advance();
      if (s.state.step === 'trace') s.advance();
      if (s.state.step === 'build') { s.entry.chunks.forEach((_, i) => s.tapChunk(i)); s.advance(); }
      if (s.state.step === 'copy') { s.state.typed = s.entry.word; s.checkCopy(); s.advance(); }
    }
    expect(findButton(s, 'Start the test ▶')).toBeTruthy();
    const started = [];
    s.scene.start = (k, d) => started.push([k, d]);
    click(findButton(s, 'Start the test ▶'));
    expect(started[0][0]).toBe('SpellingGame');
    expect(started[0][1].listId).toBe('g4-1');
  });

  it('skips the build step for one-chunk words and the widgets lay out at any size', () => {
    const s = learn({ listId: 'g2-1' });
    const one = s.state.words.find((w) => w.chunks.length === 1);
    s.state.stage = 'words'; s.state.idx = s.state.words.indexOf(one); s.state.step = 'card'; s.prepare(); s.rebuild();
    s.advance(); s.advance();
    expect(s.state.step).toBe('copy');
    const scene = fakeSystems({ ui: 1 });
    expect(chunkChips(scene, { cx: 100, cy: 20, chunks: ['cul', 'ti', 'va', 'ted'], maxW: 120, state: ['done'] })).toHaveLength(4);
    expect(letterRow(scene, { cx: 100, cy: 20, letters: [{ ch: 'a', look: 'ok' }, { ch: '', look: 'blank' }], size: 30, gap: 4 })).toHaveLength(2);
    expect(fitTile(11, 300, 6, 44, 18)).toBeCloseTo((300 - 60) / 11, 5);
    expect(fitTile(2, 300, 6, 44, 18)).toBe(44);
    expect(keyFromEvent({ key: 'Q' })).toBe('q'); expect(keyFromEvent({ key: 'Backspace' })).toBe('⌫'); expect(keyFromEvent({ key: 'Shift' })).toBeNull();
  });
});

const { findPatterns, patternIndex } = await import('../src/data/spelling/patterns.js');
const { recordTest } = await import('../src/systems/Spelling.js');

describe('sentences, patterns, tracing and the weekly test', () => {
  const learn = (data) => { const s = new SpellingLearnScene(); fakeSystems(s); s.init(data); s.create({}); return s; };
  const game = (data) => { const s = new SpellingGameScene(); fakeSystems(s); s.init(data); s.create({}); return s; };
  it('every list word has a sentence that uses it, and shared letter patterns are found', () => {
    for (const g of SPELLING_GRADES) for (const l of SPELLING_LISTS[g]) for (const e of listWords(l)) {
      expect(e.s, e.w).toBeTruthy();
      expect(e.s.toLowerCase(), e.w).toContain(e.w);
    }
    const g2 = findPatterns(listWords(SPELLING_LISTS[2][0]).map((e) => e.w));
    expect(g2.map((p) => p.letters)).toContain('er');
    expect(g2.find((p) => p.letters === 'er').words.map((h) => h.word)).toEqual(['teacher', 'matter', 'gender']);
    expect(g2.find((p) => p.letters === 'ea')).toBeUndefined();   // 'teacher' already belongs to the er group, and 'learn' alone is not a group
    const g4 = findPatterns(listWords(SPELLING_LISTS[4][1]).map((e) => e.w));
    expect(g4.length).toBeGreaterThan(0);
    const all = g4.flatMap((p) => p.words.map((h) => h.word));
    expect(new Set(all).size).toBe(all.length);   // a word belongs to one pattern only
    expect(patternIndex('teacher', { letters: 'er', where: 'end' })).toBe(5);
    expect(patternIndex('learn', { letters: 'er', where: 'end' })).toBe(-1);
    expect(findPatterns(['cat'])).toEqual([]);
  });

  it('opens the teaching with pattern cards, then traces each word with the finger', () => {
    const s = learn({ listId: 'g2-1' });
    expect(s.state.stage).toBe('patterns');
    expect(findButton(s, 'Next ▶')).toBeTruthy();
    while (s.state.stage === 'patterns') s.advance();
    expect(s.state.step).toBe('card');
    s.advance();
    expect(s.state.step).toBe('trace');
    expect(s.traceRects).toHaveLength(s.entry.word.length);
    expect(findButton(s, 'Skip ▶')).toBeTruthy();
    // Ink over every letter's box until each has enough samples; then Next appears.
    s.traceDown({ x: s.traceRects[0].x0 + 1, y: (s.traceRects[0].y0 + s.traceRects[0].y1) / 2 });
    s.traceRects.forEach((r) => { for (let i = 0; i < 6; i++) s.traceMove({ isDown: true, x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2 }); });
    s.traceUp();
    expect(s.traceDone()).toBe(true);
    expect(findButton(s, 'Next ▶')).toBeTruthy();
    expect(s.state.strokes[0].length).toBeGreaterThan(6);
    click(findButton(s, 'Clear'));
    expect(s.state.strokes).toEqual([]);
    s.advance();
    expect(['build', 'copy']).toContain(s.state.step);
  });

  it('the weekly test asks every word from hearing, reveals nothing until the end, and is recorded', () => {
    Store.updateProfile((p) => { p.spelling = { words: {}, lists: {}, sessions: 0, tests: [] }; });
    const s = game({ listId: 'g2-1', test: true });
    expect(s.testMode).toBe(true);
    expect(s.state.rounds).toHaveLength(8);
    expect(s.state.rounds.every((r) => r.mode === 'listen')).toBe(true);
    expect(s.state.phase).toBe('type');
    s.state.typed = 'zzz'; s.check();
    expect(s.state.phase).toBe('result');
    expect(s.objs.some((o) => typeof o.text === 'string' && o.text.startsWith('It is spelt'))).toBe(false);
    flushTimers(s);
    expect(s.state.idx).toBe(1);
    while (!s.state.done) { s.state.typed = s.round.word; s.check(); flushTimers(s); }
    expect(s.state.correct).toBe(7);
    const p = Store.getProfile();
    expect(p.spelling.tests).toHaveLength(1);
    expect(p.spelling.tests[0]).toMatchObject({ listId: 'g2-1', correct: 7, total: 8 });
    expect(findButton(s, 'Learn again')).toBeTruthy();
    expect(spellingSummary(p).tests[0]).toMatchObject({ listId: 'g2-1', correct: 7 });
    for (let i = 0; i < 35; i++) recordTest(p, 'g2-1', i, 8, i);
    expect(p.spelling.tests.length).toBe(30);
  });
});
