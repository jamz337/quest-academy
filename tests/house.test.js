import { describe, it, expect, vi } from 'vitest';
import { installPhaserMock, fakeSystems, findButton, click } from './helpers/phaserMock.js';

installPhaserMock();
vi.mock('../src/systems/Speech.js', () => ({ speak: vi.fn(), stop: vi.fn(), rateFor: () => 0.9, canSpeak: () => true, speakWords: () => null, primeSpeech: () => false }));

const { ROOMS, getRoom, roomGameId, roomFromGameId, pageText } = await import('../src/data/social/barbados.js');
const { HOUSE_W, HOUSE_H, HOUSE_ROOMS, EXHIBITS, FURNITURE, SIGNS, EXIT, SPAWN, DOORWAYS, wallTiles, roomAt, furnitureAt, isFloor, onExit, reachableFloor } = await import('../src/data/social/house.js');
const { RECIPES, DISTRACTORS, stepChoices } = await import('../src/data/social/recipes.js');
const { TV_FACTS, FRIDGE_FACTS, BOOK_FACTS, pickFact } = await import('../src/data/social/facts.js');
const { ISLAND, MAP_SPOTS, FLAG_NAMES, isDrawnPicture } = await import('../src/ui/Pictures.js');
const { ensureSocial, markRead, roomReward, finishRoom, roomRecord, socialProgress, cookedToday, recordCooked } = await import('../src/systems/Social.js');
const { newProfile, migrate } = await import('../src/systems/SaveSystem.js');
const { BADGES } = await import('../src/data/badges.js');
const { socialSummary, summarize } = await import('../api/_lib/summary.js');
const Store = await import('../src/systems/Store.js');
const { HouseRoomScene } = await import('../src/scenes/HouseRoomScene.js');

describe('Barbados rooms', () => {
  it('five rooms, each with a story of short pages and a quiz of five questions whose answers are in the story', () => {
    expect(ROOMS.map((r) => r.id)).toEqual(['flag', 'heroes', 'parishes', 'symbols', 'culture']);
    for (const r of ROOMS) {
      expect(r.title && r.item && r.intro, r.id).toBeTruthy();
      expect(r.story.length).toBeGreaterThanOrEqual(4);
      for (const p of r.story) {
        expect(p.pic).toBeTruthy(); expect(p.text.length).toBeGreaterThan(80); expect(p.text.length).toBeLessThan(330);
        // The short telling for grades 2 and 3: present, shorter, and under 200 characters.
        expect(p.short, `${r.id} short`).toBeTruthy(); expect(p.short.length).toBeLessThan(p.text.length); expect(p.short.length).toBeLessThan(200);
        expect(pageText(p, 2)).toBe(p.short); expect(pageText(p, 3)).toBe(p.short); expect(pageText(p, 4)).toBe(p.text); expect(pageText(p, undefined)).toBe(p.text);
      }
      expect(r.quiz).toHaveLength(5);
      const text = r.story.map((p) => p.text.toLowerCase()).join(' ');
      const shortText = r.story.map((p) => p.short.toLowerCase()).join(' ');
      for (const q of r.quiz) {
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.why.length).toBeGreaterThan(10);
        if (q.pics) { expect(q.pics).toHaveLength(4); for (const pic of q.pics) if (isDrawnPicture(pic)) { const [kind, id] = pic.split(':'); expect(kind === 'flag' ? FLAG_NAMES[id] : MAP_SPOTS[id], pic).toBeTruthy(); } }
        // The answer (the first choice) can be found in the story, so a careful reader always has it.
        const key = q.choices[0].toLowerCase().replace(/^the /, '').split(/[ ,]/)[0];
        expect(text, `${r.id}: ${q.q}`).toContain(key);
        expect(shortText, `${r.id} (short): ${q.q}`).toContain(key);
      }
    }
    expect(ROOMS.filter((r) => r.quiz.some((q) => q.pics)).length).toBe(5);   // every room has a picture question
    expect(ISLAND.length).toBeGreaterThan(10);
    expect(getRoom('flag').title).toBe('The Flag Room');
    expect(roomGameId('flag')).toBe('social-flag');
    expect(roomFromGameId('social-heroes')).toBe(getRoom('heroes'));
    expect(roomFromGameId('math-dash')).toBeNull();
  });
});

describe('the house layout', () => {
  const walls = wallTiles();
  const seen = reachableFloor();
  it('rooms have names and do not overlap, furniture sits inside its room, and everything usable is reachable from the front door', () => {
    for (const a of HOUSE_ROOMS) {
      expect(a.name, a.id).toBeTruthy();
      expect(a.x >= 1 && a.y >= 1 && a.x + a.w <= HOUSE_W - 1 && a.y + a.h <= HOUSE_H - 1, a.id).toBe(true);
      for (const b of HOUSE_ROOMS) if (a !== b) expect(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y, `${a.id} vs ${b.id}`).toBe(true);
      for (let y = a.y; y < a.y + a.h; y++) for (let x = a.x; x < a.x + a.w; x++) { expect(walls.has(`${x},${y}`), `${a.id} ${x},${y}`).toBe(false); expect(roomAt(x, y).id).toBe(a.id); }
    }
    expect(HOUSE_ROOMS.map((r) => r.id)).toEqual(['living', 'bedroom', 'study', 'corridor', 'dining', 'hall', 'kitchen']);
    expect(walls.has('0,0')).toBe(true); expect(walls.has(`${HOUSE_W - 1},${HOUSE_H - 1}`)).toBe(true);
    for (const d of DOORWAYS) { expect(walls.has(`${d.x},${d.y}`)).toBe(false); expect(furnitureAt(d.x, d.y), `doorway ${d.x},${d.y}`).toBeNull(); }
    expect(seen.has(`${Math.floor(SPAWN.tx)},${Math.floor(SPAWN.ty)}`)).toBe(true);
    // Furniture: inside its room, never overlapping another piece, never on a doorway, the mat or an exhibit's spot.
    for (const f of FURNITURE) {
      const room = HOUSE_ROOMS.find((r) => r.id === f.room);
      expect(room, f.id).toBeTruthy();
      for (let y = f.y; y < f.y + f.h; y++) for (let x = f.x; x < f.x + f.w; x++) {
        expect(roomAt(x, y)?.id, `${f.id} at ${x},${y}`).toBe(f.room);
        expect(furnitureAt(x, y).id, `${f.id} overlaps at ${x},${y}`).toBe(f.id);
        expect(onExit(x, y), f.id).toBe(false);
      }
      if (f.use) { expect(f.at, f.id).toBeTruthy(); expect(isFloor(f.at.tx, f.at.ty), `${f.id} standing spot`).toBe(true); expect(seen.has(`${f.at.tx},${f.at.ty}`), `${f.id} reachable`).toBe(true); }
    }
    expect(FURNITURE.filter((f) => f.use).map((f) => f.use).sort()).toEqual(['bed', 'books', 'books', 'books', 'cook', 'desk', 'fridge', 'trophy', 'tv', 'wardrobe']);
    expect(FURNITURE.find((f) => f.kind === 'stove').room).toBe('kitchen');
    expect(FURNITURE.find((f) => f.kind === 'bed').room).toBe('bedroom');
    for (const e of EXHIBITS) {
      expect(isFloor(e.front.tx, e.front.ty), e.id).toBe(true);
      expect(seen.has(`${e.front.tx},${e.front.ty}`), e.id).toBe(true);
      expect(walls.has(`${Math.floor(e.tx)},${Math.floor(e.ty)}`), `${e.id} hangs on the wall`).toBe(true);
      expect(HOUSE_ROOMS.find((r) => r.id === e.room).exhibit).toBe(e.id);
    }
    // Signs hang on the back wall of their room, away from the exhibit.
    for (const sg of SIGNS) {
      const room = HOUSE_ROOMS.find((r) => r.id === sg.room);
      expect(Math.floor(sg.ty)).toBe(room.y - 1);
      const ex = EXHIBITS.find((e) => e.room === sg.room);
      if (ex) expect(Math.abs(ex.tx - sg.tx)).toBeGreaterThanOrEqual(1.5);
    }
    for (let x = EXIT.x; x < EXIT.x + EXIT.w; x++) { expect(seen.has(`${x},${EXIT.y}`)).toBe(true); expect(onExit(x, EXIT.y)).toBe(true); }
    expect(onExit(EXIT.x, EXIT.y - 1)).toBe(false);
    expect(EXHIBITS.map((e) => e.id)).toEqual(ROOMS.map((r) => r.id));
    expect(seen.size).toBeGreaterThan(90);
  });

  it('the stove has five Bajan recipes; each step offers the right ingredient among two distractors', () => {
    expect(RECIPES).toHaveLength(5);
    for (const r of RECIPES) {
      expect(r.steps).toHaveLength(3);
      expect(r.about.length).toBeGreaterThan(20);
      for (let i = 0; i < 3; i++) {
        const ch = stepChoices(r, i, Math.random);
        expect(ch).toHaveLength(3);
        expect(ch.filter((c) => c.right)).toHaveLength(1);
        expect(ch.find((c) => c.right).name).toBe(r.steps[i][0]);
        for (const c of ch) if (!c.right) expect(DISTRACTORS.map((d) => d[0])).toContain(c.name);
      }
    }
    const p = newProfile({ name: 'C', grade: 3 });
    expect(cookedToday(p, 'coucou')).toBe(false);
    recordCooked(p, 'coucou');
    expect(cookedToday(p, 'coucou')).toBe(true); expect(p.house.dishes).toBe(1);
    expect(cookedToday(p, 'coucou', Date.now() + 2 * 86400000)).toBe(false);
    for (const pool of [TV_FACTS, FRIDGE_FACTS, BOOK_FACTS]) { expect(pool.length).toBeGreaterThanOrEqual(8); expect(pickFact(pool, () => 0, pool[0])).toBe(pool[1]); }
  });
});

describe('social studies progress', () => {
  it('records stories read and quiz results, pays out, and feeds the badges and the dashboard', () => {
    const p = newProfile({ name: 'A', grade: 4 });
    expect(p.social).toEqual({ rooms: {} });
    expect(migrate({ version: 1, profiles: { x: { id: 'x', name: 'Old' } } }).profiles.x.social).toEqual({ rooms: {} });
    expect(roomRecord(p, 'flag')).toMatchObject({ read: false, plays: 0, best: 0 });
    markRead(p, 'flag');
    expect(roomRecord(p, 'flag').read).toBe(true);
    expect(roomReward(5, 5)).toEqual({ coins: 15, xp: 30, stars: 3 });
    expect(roomReward(4, 5)).toEqual({ coins: 8, xp: 16, stars: 2 });
    expect(roomReward(3, 5).stars).toBe(1); expect(roomReward(2, 5).stars).toBe(0);
    const r = finishRoom(p, 'flag', 4, 5);
    expect(r.stars).toBe(2); expect(p.coins).toBe(8); expect(p.xp).toBe(16);
    finishRoom(p, 'flag', 5, 5);
    expect(roomRecord(p, 'flag')).toMatchObject({ read: true, plays: 2, best: 3, lastCorrect: 5 });
    expect(socialProgress(p)).toEqual({ read: 1, total: 5, stars: 3, maxStars: 15, mastered: 1 });
    expect(p.skills.barbados).toBeTruthy();
    const reader = BADGES.find((b) => b.id === 'bajan-reader'), scholar = BADGES.find((b) => b.id === 'bajan-scholar');
    expect(reader.test(p)).toBe(false); expect(scholar.test(p)).toBe(false);
    for (const room of ROOMS) { markRead(p, room.id); finishRoom(p, room.id, 5, 5); }
    expect(reader.test(p)).toBe(true); expect(scholar.test(p)).toBe(true);
    const sum = socialSummary(p);
    expect(sum).toMatchObject({ read: 5, total: 5, stars: 15, maxStars: 15 });
    expect(sum.rooms[0]).toMatchObject({ id: 'flag', title: 'The Flag Room', read: true, best: 3, plays: 3 });
    const card = summarize({ profiles: { [p.id]: p } }, [])[0];
    expect(card.social.read).toBe(5);
    ensureSocial({});   // tolerates a bare object
  });
});

describe('a room of the house (headless)', () => {
  const storage = { data: {}, getItem(k) { return this.data[k] ?? null; }, setItem(k, v) { this.data[k] = v; }, removeItem(k) { delete this.data[k]; } };
  globalThis.localStorage = storage;
  Store.init();
  Store.createProfile({ name: 'Kid', grade: 3 });

  function room(data) {
    const s = new HouseRoomScene();
    fakeSystems(s);
    Object.assign(s.scene, { isSleeping: () => false, wake() {}, restart() {} });
    s.events = { emit: vi.fn(), on() {}, once() {}, off() {} };
    s.init(data);
    s.create({});
    return s;
  }

  it('turns the story pages, marks the room read, runs the quiz with explanations and pays out stars', () => {
    const s = room({ roomId: 'flag', returnTo: 'House' });
    expect(s.state.phase).toBe('story');
    expect(s.objs.some((o) => o.text === '🎉')).toBe(true);
    expect(findButton(s, 'Leave the room')).toBeTruthy();
    click(findButton(s, 'Next ▶'));
    expect(s.state.page).toBe(1);
    expect(findButton(s, '◀ Back')).toBeTruthy();
    s.keyDown({ key: 'ArrowLeft' }); expect(s.state.page).toBe(0);
    while (s.state.phase === 'story') s.nextPage();
    expect(roomRecord(Store.getProfile(), 'flag').read).toBe(true);
    expect(s.state.phase).toBe('quiz');
    const q = s.question;
    expect(q.choices).toContain(q.answer);
    expect(q.choices).toHaveLength(4);
    if (q.pics) expect(q.pics[q.choices.indexOf(q.answer)]).toBe(getRoom('flag').quiz[s.state.qIdx].pics[0]);   // pictures shuffle with their choices
    // A wrong answer is explained, then Next; the right ones count.
    const wrong = q.choices.findIndex((c) => c !== q.answer);
    click(findButton(s, q.choices[wrong]));
    expect(s.state.right).toBe(false);
    expect(s.objs.some((o) => typeof o.text === 'string' && o.text.startsWith('The answer is'))).toBe(true);
    expect(s.objs.some((o) => typeof o.text === 'string' && o.text === q.why)).toBe(true);
    click(findButton(s, 'Next question ▶'));
    while (!s.state.done) {
      const cur = s.question;
      s.pick(cur.choices.indexOf(cur.answer));
      s.next();
    }
    expect(s.state.correct).toBe(4);
    expect(s.state.reward).toMatchObject({ stars: 2, coins: 8, xp: 16 });
    expect(s.state.log).toHaveLength(5);
    expect(s.state.log[0]).toMatchObject({ skill: 'barbados', right: false });
    expect(findButton(s, 'Back to the house')).toBeTruthy();
    expect(roomRecord(Store.getProfile(), 'flag')).toMatchObject({ plays: 1, best: 2 });
    // Leaving hands the result back to the house.
    const caller = { events: { emit: vi.fn() } };
    s.scene.get = () => caller;
    s.scene.isPaused = () => true;
    click(findButton(s, 'Back to the house'));
    expect(caller.events.emit).toHaveBeenCalledWith('room:done', expect.objectContaining({ roomId: 'flag', result: expect.objectContaining({ stars: 2, correct: 4, total: 5 }) }));
  });

  it('a room already read can skip straight to the quiz, and the keyboard answers 1-4', () => {
    const s = room({ roomId: 'heroes', returnTo: 'House' });
    expect(findButton(s, 'Skip to the quiz')).toBeFalsy();   // not read yet
    while (s.state.phase === 'story') s.nextPage();
    const t = room({ roomId: 'heroes', returnTo: 'House' });
    expect(findButton(t, 'Skip to the quiz')).toBeTruthy();
    click(findButton(t, 'Skip to the quiz'));
    expect(t.state.phase).toBe('quiz');
    // The flag room's last question is answered with pictures: four drawn flags, one per card.
    const f = room({ roomId: 'flag', returnTo: 'House' });
    while (f.state.phase === 'story') f.nextPage();
    f.state.qIdx = 4; f.state.picked = null; f.rebuild();
    expect(f.question.pics).toHaveLength(4);
    expect(f.question.pics[f.question.choices.indexOf('Jamaica')]).toBe('flag:jamaica');
    expect(f.objs.filter((o) => o.active !== false && typeof o.text === 'string' && ['Barbados', 'Jamaica', 'Trinidad and Tobago', 'The Bahamas'].includes(o.text))).toHaveLength(4);
    f.pick(f.question.choices.indexOf('Barbados'));
    expect(f.state.right).toBe(true);
    const i = t.question.choices.indexOf(t.question.answer);
    t.keyDown({ key: String(i + 1) });
    expect(t.state.right).toBe(true);
    t.keyDown({ key: 'Enter' });
    expect(t.state.qIdx).toBe(1);
  });
});
