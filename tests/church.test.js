// The Village Church: lesson modules built from the Bible banks, the church interior, the map, progress and the
// lesson screen (headless).
import { describe, it, expect, vi } from 'vitest';
import { installPhaserMock, fakeSystems, findButton, click, flushTimers } from './helpers/phaserMock.js';

installPhaserMock();
vi.mock('../src/systems/Speech.js', () => ({ speak: vi.fn(), stop: vi.fn(), rateFor: () => 0.9, canSpeak: () => true, speakWords: () => null, primeSpeech: () => false }));

const { MODULES, getModule, moduleItems, moduleBlocks, blockTopic, cardFaces, practiceQuestion, BLOCK_SIZE, MAX_BLOCKS } = await import('../src/data/bible/lessons.js');
const { CHURCH_W, CHURCH_H, EXIT, SPAWN, STATIONS, LECTERN, isSolid, onExit, reachableFloor } = await import('../src/data/bible/church.js');
const { blockStars, blockOpen, blockReward, finishBlock, moduleProgress, churchProgress, COINS_FIRST_BLOCK } = await import('../src/systems/Church.js');
const { buildMap, reachableFrom, isWalkable, zoneAt, TID } = await import('../src/data/world/map.js');
const { isNewSkill } = await import('../src/systems/Practice.js');
const { Rng } = await import('../src/systems/Rng.js');
const Store = await import('../src/systems/Store.js');
const { ChurchLessonScene } = await import('../src/scenes/ChurchLessonScene.js');

describe('church lessons', () => {
  it('five modules, one per Bible skill the games use, each feeding named Bible games', () => {
    expect(MODULES.map((m) => m.skill)).toEqual(['people', 'stories', 'places', 'books', 'verses']);
    for (const m of MODULES) { expect(m.title && m.icon && m.intro).toBeTruthy(); expect(m.games.length).toBeGreaterThan(0); expect(getModule(m.id)).toBe(m); }
  });

  it('every band has blocks of 3-6 facts for every module, with two faces per card and a valid practice question', () => {
    const rng = new Rng(4);
    for (const band of ['A', 'B', 'C']) for (const m of MODULES) {
      const blocks = moduleBlocks(m.id, band), pool = moduleItems(m.id, band);
      expect(blocks.length, `${m.id} ${band}`).toBeGreaterThan(0);
      expect(blocks.length).toBeLessThanOrEqual(MAX_BLOCKS);
      for (const items of blocks) {
        expect(items.length).toBeGreaterThanOrEqual(3); expect(items.length).toBeLessThanOrEqual(BLOCK_SIZE + 2);
        expect(blockTopic(items).length).toBeGreaterThan(2);
        for (const it of items) {
          const faces = cardFaces(it);
          expect(faces.front && faces.back).toBeTruthy(); expect(faces.back).not.toBe(faces.front);
          const q = practiceQuestion(it, pool, rng);
          expect(q.prompt).toBeTruthy();
          expect(q.choices).toContain(q.answer);
          expect(new Set(q.choices).size).toBe(q.choices.length);
          expect(q.choices.length).toBeGreaterThanOrEqual(3);
          expect(q.skill).toBe(m.skill);
        }
      }
    }
  });

  it('grades 2-3 still learn the books of the Bible (borrowed from the next band up) and stories mix in story order', () => {
    expect(moduleBlocks('books', 'A').length).toBeGreaterThan(0);
    expect(moduleItems('stories', 'A').some((it) => it.kind === 'order')).toBe(true);
    const verse = moduleItems('verses', 'A')[0];
    expect(cardFaces(verse).back).toContain(verse.a.toUpperCase());
  });
});

describe('the church building', () => {
  it('has a station under each of five windows, a lectern and a door mat, all reachable from the door', () => {
    const floor = reachableFloor();
    expect(STATIONS.map((s) => s.module)).toEqual(MODULES.map((m) => m.id));
    for (const s of [...STATIONS.map((st) => st.at), LECTERN.at, EXIT]) {
      expect(isSolid(s.tx, s.ty), `${s.tx},${s.ty}`).toBe(false);
      expect(floor.has(`${s.tx},${s.ty}`), `${s.tx},${s.ty}`).toBe(true);
    }
    expect(onExit(EXIT.tx, EXIT.ty)).toBe(true);
    expect(onExit(Math.floor(SPAWN.tx), Math.floor(SPAWN.ty))).toBe(false);   // arriving does not walk straight back out
    expect(CHURCH_W).toBeGreaterThan(10); expect(CHURCH_H).toBeGreaterThan(10);
  });

  it('stands in Bible Village with its door on the path network', () => {
    const map = buildMap();
    const c = map.church;
    expect(zoneAt(map, c.door.tx, c.door.ty)).toBe('bible');
    expect(map.data[c.door.ty][c.door.tx]).toBe(TID.doorBible);
    expect(map.data[c.front.ty][c.front.tx]).toBe(TID.path);
    const seen = reachableFrom(map);
    expect(seen.has(`${c.door.tx},${c.door.ty}`)).toBe(true);
    expect(isWalkable(map.data[c.front.ty][c.front.tx])).toBe(true);
    // It does not sit on any other building.
    const others = map.buildings.filter((b) => b.style !== 'church');
    for (const b of others) expect(c.x + c.w <= b.x || b.x + b.w <= c.x || c.y + c.h <= b.y || b.y + b.h <= c.y, `${b.zone} ${b.style}`).toBe(true);
  });
});

describe('church progress', () => {
  it('opens blocks in order, pays the first time, keeps the best stars, and teaches the skill to the games', () => {
    const p = { coins: 0, xp: 0 };
    expect(blockOpen(p, 'people', 'A', 0)).toBe(true);
    expect(blockOpen(p, 'people', 'A', 1)).toBe(false);
    expect(isNewSkill(p, 'people')).toBe(true);
    const r1 = finishBlock(p, 'people', 'A', 0, 2, 4);
    expect(r1).toMatchObject({ stars: 1, first: true, coins: COINS_FIRST_BLOCK });
    expect(blockOpen(p, 'people', 'A', 1)).toBe(true);
    expect(isNewSkill(p, 'people')).toBe(false);
    const r2 = finishBlock(p, 'people', 'A', 0, 4, 4);
    expect(r2).toMatchObject({ stars: 3, first: false, improved: true });
    expect(r2.coins).toBeGreaterThan(0);                       // the three-star bonus, once
    expect(finishBlock(p, 'people', 'A', 0, 4, 4).coins).toBe(0);
    expect(blockStars(p, 'people', 'A', 0)).toBe(3);
    expect(blockReward(3, 4)).toBe(2);
    expect(moduleProgress(p, 'people', 'A')).toMatchObject({ done: 1, stars: 3 });
    expect(moduleProgress(p, 'people', 'B').done).toBe(0);   // progress is per grade band
    const all = churchProgress(p, 'A');
    expect(all.done).toBe(1); expect(all.total).toBeGreaterThan(10);
  });
});

describe('a church lesson (headless)', () => {
  const storage = { data: {}, getItem(k) { return this.data[k] ?? null; }, setItem(k, v) { this.data[k] = v; }, removeItem(k) { delete this.data[k]; } };
  globalThis.localStorage = storage;
  Store.init();
  Store.createProfile({ name: 'Kid', grade: 3 });

  function lesson(data) {
    const s = new ChurchLessonScene();
    fakeSystems(s);
    Object.assign(s.scene, { isSleeping: () => false, wake() {}, isPaused: () => true, resume: vi.fn(), get: () => ({ events: { emit: s.emitted } }) });
    s.emitted = vi.fn();
    s.init(data);
    s.create({});
    return s;
  }

  it('finishing the last block of a module lights the whole window and rings the bell', () => {
    const s = lesson({ moduleId: 'places', returnTo: 'Church' });
    for (let b = 0; b < s.blocks.length; b++) {
      s.startBlock(b);
      s.blocks[b].forEach((_, i) => s.flip(i));
      s.startPractice();
      while (s.state.view === 'practice') { const q = s.question; s.pick(q.choices.indexOf(q.answer)); flushTimers(s); }
      expect(s.state.finishedModule).toBe(b === s.blocks.length - 1);
    }
    expect(s.state.earned.completed).toBe(true);
    expect(s.objs.some((o) => o.active && typeof o.text === 'string' && o.text.includes('The whole window is lit'))).toBe(true);
  });

  it('shows the blocks, learns one with flip cards, practises it and banks the stars', () => {
    const s = lesson({ moduleId: 'people', returnTo: 'Church' });
    expect(s.state.view).toBe('blocks');
    expect(findButton(s, 'Block 1')).toBeTruthy();
    s.startBlock(1);                                   // locked until block 1 is learned
    expect(s.state.view).toBe('blocks');
    s.startBlock(0);
    expect(s.state.view).toBe('learn');
    const n = s.blocks[0].length;
    expect(s.objs.filter((o) => o.active && o.face === 'front')).toHaveLength(n);
    s.startPractice();                                 // not before every card is turned
    expect(s.state.view).toBe('learn');
    for (let i = 0; i < n; i++) s.flip(i);
    expect(s.objs.filter((o) => o.active && o.face === 'back')).toHaveLength(n);
    click(findButton(s, 'Test yourself ▶'));
    expect(s.state.view).toBe('practice');
    // First question: one miss (a reminder appears), then the right one.
    const q = s.question;
    s.pick(q.choices.findIndex((c) => c !== q.answer));
    expect(s.objs.some((o) => o.active && typeof o.text === 'string' && o.text.startsWith('Hint:'))).toBe(true);
    s.pick(q.choices.indexOf(q.answer));
    flushTimers(s);
    while (s.state.view === 'practice') { const cur = s.question; s.pick(cur.choices.indexOf(cur.answer)); flushTimers(s); }
    expect(s.state.view).toBe('done');
    expect(s.state.firstTry).toBe(n - 1);
    const p = Store.getProfile();
    expect(blockStars(p, 'people', 'B', 0) || blockStars(p, 'people', 'A', 0)).toBeGreaterThan(0);
    expect(findButton(s, 'Next block ▶')).toBeTruthy();
    click(findButton(s, 'Next block ▶'));
    expect(s.state).toMatchObject({ view: 'learn', block: 1 });
    s.close();
    expect(s.emitted).toHaveBeenCalledWith('church:done', expect.objectContaining({ moduleId: 'people', earned: expect.objectContaining({ blocks: 1 }) }));
  });
});
