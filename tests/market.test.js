import { describe, it, expect, vi } from 'vitest';
import { installPhaserMock, fakeSystems, findButton, click } from './helpers/phaserMock.js';

installPhaserMock();
vi.mock('../src/systems/Speech.js', () => ({ speak: vi.fn(), stop: vi.fn(), rateFor: () => 0.9, canSpeak: () => true, speakWords: () => null, primeSpeech: () => false }));

const { ITEMS, CARD_SETS, TABS, getItem, itemsOfKind, cardsOfSet, LOOK_KINDS } = await import('../src/data/market/items.js');
const { ensureInventory, owns, equipped, buyBlock, buy, equip, outfitOf, outfitId, applyDecor, roomDecor, cardSets, anySetComplete, purchases, marketSummary, snackCount, snacksOf, useSnack, SNACK_MAX } = await import('../src/systems/Market.js');
const { newProfile, migrate } = await import('../src/systems/SaveSystem.js');
const { BADGES } = await import('../src/data/badges.js');
const { NPCS } = await import('../src/data/world/npcs.js');
const { NPC_STYLES } = await import('../src/data/avatars.js');
const { buildMap, zoneAt, isWalkable, reachableFrom } = await import('../src/data/world/map.js');
const { drawOutfitFront, drawOutfitBack } = await import('../src/ui/LpcCharacter.js');
const { summarize } = await import('../api/_lib/summary.js');
const Store = await import('../src/systems/Store.js');
const { MarketScene } = await import('../src/scenes/MarketScene.js');

describe('the market catalogue', () => {
  it('has unique ids, sensible prices, three tabs, and cards with a fact each', () => {
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(ITEMS.length);
    for (const it of ITEMS) {
      expect(it.price).toBeGreaterThan(0); expect(it.price).toBeLessThanOrEqual(250);
      expect(it.name && it.icon && it.desc, it.id).toBeTruthy();
      if (LOOK_KINDS.includes(it.kind)) expect(it.style && it.style.shape, it.id).toBeTruthy();
      if (it.kind === 'paint') expect(typeof it.colour).toBe('number');
      if (it.kind === 'floor') expect(['oak', 'walnut', 'carpet', 'tiles', 'checker', 'parquet', 'stone']).toContain(it.floor);
    }
    expect(TABS.map((t) => t.id)).toEqual(['looks', 'house', 'cards', 'snacks']);
    for (const t of TABS) expect(t.kinds.flatMap((k) => itemsOfKind(k)).length).toBeGreaterThan(3);
    expect(CARD_SETS.map((s) => s.cards.length)).toEqual([11, 11, 6]);
    for (const set of CARD_SETS) for (const c of cardsOfSet(set.id)) { expect(c.desc.length).toBeGreaterThan(30); expect(c.price).toBe(set.price); }
    expect(itemsOfKind('hat').length).toBeGreaterThanOrEqual(5);
    // The vendor stands on the plaza with a stall beside her.
    const vee = NPCS.find((n) => n.market);
    expect(vee).toMatchObject({ id: 'vendor', zone: 'hub', gameId: null, sprite: 'npc18' });
    expect(NPC_STYLES[18].outfit.hat.shape).toBe('sun');
    const map = buildMap();
    const spot = map.npcSpots.vendor;
    expect(isWalkable(map.data[spot.ty][spot.tx])).toBe(true);
    expect(zoneAt(map, spot.tx, spot.ty)).toBe('hub');
    expect(reachableFrom(map).has(`${spot.tx},${spot.ty}`)).toBe(true);
    expect(map.marketSpot).toEqual({ tx: 28, ty: 34, w: 2, h: 2 });
  });
});

describe('snacks', () => {
  it('stack up to nine, are eaten one at a time and never count as owned', () => {
    const p = newProfile({ name: 'A', grade: 3 });
    p.coins = 200;
    expect(buy(p, 'snack-mango-juice').ok).toBe(true);
    expect(buy(p, 'snack-mango-juice').ok).toBe(true);
    expect(snackCount(p, 'snack-mango-juice')).toBe(2);
    expect(owns(p, 'snack-mango-juice')).toBe(false);
    expect(p.coins).toBe(170); expect(p.inventory.spent).toBe(30);
    expect(buyBlock(p, 'snack-mango-juice')).toBeNull();
    expect(snacksOf(p)).toEqual([{ item: getItem('snack-mango-juice'), count: 2 }]);
    expect(useSnack(p, 'snack-mango-juice').effect).toEqual({ heal: 1 });
    expect(useSnack(p, 'snack-mango-juice').effect).toEqual({ heal: 1 });
    expect(useSnack(p, 'snack-mango-juice')).toBeNull();
    expect(p.inventory.snacks).toEqual({});
    p.inventory.snacks['snack-hourglass'] = SNACK_MAX;
    expect(buyBlock(p, 'snack-hourglass')).toBe('full');
    p.coins = 1;
    expect(buyBlock(p, 'snack-coconut')).toBe('coins');
    expect(marketSummary(p).snacks).toBe(SNACK_MAX);
  });
});

describe('buying, wearing and using', () => {
  it('takes coins, keeps what was bought, wears looks, paints rooms and completes card sets', () => {
    const p = newProfile({ name: 'A', grade: 3 });
    expect(p.inventory).toEqual({ owned: [], equipped: {}, decor: {}, spent: 0, visited: false, snacks: {} });
    expect(migrate({ version: 1, profiles: { x: { id: 'x', name: 'Old' } } }).profiles.x.inventory).toEqual({ owned: [], equipped: {}, decor: {}, spent: 0, visited: false, snacks: {} });
    p.coins = 100;
    expect(buyBlock(p, 'hat-crown')).toBe('coins');
    expect(buy(p, 'hat-crown').ok).toBe(false);
    expect(buyBlock(p, 'nope')).toBe('unknown');
    const r = buy(p, 'hat-cap');
    expect(r.ok).toBe(true); expect(p.coins).toBe(40); expect(owns(p, 'hat-cap')).toBe(true);
    expect(equipped(p, 'hat')).toBe('hat-cap');   // put on straight away
    expect(buyBlock(p, 'hat-cap')).toBe('owned');
    expect(outfitOf(p).hat).toEqual({ shape: 'cap', colour: '#3d8bff' });
    expect(outfitId(p)).toBe('hat-cap,,');
    expect(equip(p, 'hat', null)).toBe(true); expect(equipped(p, 'hat')).toBeNull(); expect(outfitId(p)).toBe('');
    expect(equip(p, 'hat', 'hat-sun')).toBe(false);   // not owned
    expect(equip(p, 'glasses', 'hat-cap')).toBe(false);   // wrong kind
    expect(equip(p, 'hat', 'hat-cap')).toBe(true); expect(equip(p, 'hat', 'hat-cap')).toBe(false);
    // Paint a room.
    p.coins = 100;
    expect(buy(p, 'paint-mint').ok).toBe(true);
    expect(applyDecor(p, 'living', 'paint-mint')).toBe(true);
    expect(applyDecor(p, 'living', 'paint-mint')).toBe(false);
    expect(applyDecor(p, 'living', 'floor-checker')).toBe(false);   // not owned
    expect(roomDecor(p, 'living')).toEqual({ wall: 0xdcf5e4, floor: undefined });
    expect(buy(p, 'floor-checker').ok).toBe(true);
    expect(applyDecor(p, 'kitchen', 'floor-checker')).toBe(true);
    expect(roomDecor(p, 'kitchen').floor).toBe('checker');
    expect(roomDecor(p, 'study')).toEqual({ wall: undefined, floor: undefined });
    // Cards and badges.
    expect(BADGES.find((b) => b.id === 'shopper').test(p)).toBe(true);
    expect(BADGES.find((b) => b.id === 'collector').test(p)).toBe(false);
    p.coins = 1000;
    for (const c of cardsOfSet('symbols')) expect(buy(p, c.id).ok).toBe(true);
    expect(cardSets(p).find((s) => s.id === 'symbols')).toMatchObject({ owned: 6, total: 6, done: true });
    expect(anySetComplete(p)).toBe(true);
    expect(BADGES.find((b) => b.id === 'collector').test(p)).toBe(true);
    expect(purchases(p)).toBe(9);
    const sum = marketSummary(p);
    expect(sum).toMatchObject({ items: 9, spent: 60 + 40 + 60 + 6 * 20 });
    expect(sum.byKind).toEqual({ hat: 1, paint: 1, floor: 1, card: 6 });
    expect(summarize({ profiles: { [p.id]: p } }, [])[0].market.items).toBe(9);
    ensureInventory({});
  });

  it('every look draws over the sprite sheet frames', () => {
    const calls = [];
    const ctx = { imageSmoothingEnabled: true, fillStyle: null, fillRect: (...a) => calls.push(a) };
    for (const kind of LOOK_KINDS) for (const it of itemsOfKind(kind)) {
      calls.length = 0;
      drawOutfitBack(ctx, { [kind]: it.style }); drawOutfitFront(ctx, { [kind]: it.style });
      expect(calls.length, it.id).toBeGreaterThanOrEqual(36);
    }
    calls.length = 0; drawOutfitFront(ctx, { hat: getItem('hat-crown').style, glasses: getItem('glasses-sun').style });
    expect(calls.length).toBeGreaterThan(36 * 4);
  });
});

describe('the market screen (headless)', () => {
  const storage = { data: {}, getItem(k) { return this.data[k] ?? null; }, setItem(k, v) { this.data[k] = v; }, removeItem(k) { delete this.data[k]; } };
  globalThis.localStorage = storage;
  Store.init();
  Store.createProfile({ name: 'Kid', grade: 3 });
  Store.updateProfile((p) => { p.coins = 150; });

  function market(data) {
    const s = new MarketScene();
    fakeSystems(s);
    Object.assign(s.scene, { isSleeping: () => false, wake() {} });
    s.textures = { exists: () => true, get: () => ({ setFilter() {} }), createCanvas: () => ({ getContext: () => null, add() {}, refresh() {}, setFilter() {} }) };
    s.anims = { exists: () => true, create() {}, generateFrameNumbers: () => [] };
    s.events = { emit: vi.fn(), on() {}, once() {}, off() {} };
    s.init(data);
    s.create({});
    return s;
  }

  it('shows the tabs, buys and wears a hat, refuses what cannot be afforded, and hands back to the world', () => {
    const s = market({ returnTo: 'World' });
    expect(Store.getProfile().inventory.visited).toBe(true);
    expect(findButton(s, '🧢 Looks')).toBeTruthy(); expect(findButton(s, '🏠 House')).toBeTruthy(); expect(findButton(s, '🃏 Cards')).toBeTruthy(); expect(findButton(s, '🥭 Snacks')).toBeTruthy();
    click(findButton(s, '🥭 Snacks'));
    expect(s.state.tab).toBe('snacks');
    expect(findButton(s, 'Buy · 15 🪙')).toBeTruthy();   // mango juice
    click(findButton(s, 'Buy · 15 🪙'));
    expect(snackCount(Store.getProfile(), 'snack-mango-juice')).toBe(1);
    expect(findButton(s, 'Buy · 15 🪙')).toBeTruthy();   // still for sale: snacks stack
    click(findButton(s, '🧢 Looks'));
    Store.updateProfile((p) => { p.coins += 15; });
    s.rebuild();
    expect(findButton(s, 'Buy · 60 🪙')).toBeTruthy();   // the blue cap
    click(findButton(s, 'Buy · 60 🪙'));
    const p = Store.getProfile();
    expect(p.coins).toBe(90); expect(owns(p, 'hat-cap')).toBe(true); expect(equipped(p, 'hat')).toBe('hat-cap');
    expect(findButton(s, 'Take off')).toBeTruthy();
    click(findButton(s, 'Take off'));
    expect(equipped(Store.getProfile(), 'hat')).toBeNull();
    expect(findButton(s, 'Wear')).toBeTruthy();
    // The crown costs 250: its button is disabled and buying is refused.
    const crown = s.objs.find((o) => o.active !== false && o.label && o.label.text === 'Buy · 250 🪙');
    expect(crown).toBeTruthy();
    s.buyItem(getItem('hat-crown'));
    expect(Store.getProfile().coins).toBe(90);
    // Cards: buying shows the fact.
    click(findButton(s, '🃏 Cards'));
    expect(s.state.tab).toBe('cards');
    s.buyItem(getItem('card-symbols-1'));
    expect(s.state.fact).toBe('card-symbols-1');
    expect(s.objs.some((o) => o.active !== false && typeof o.text === 'string' && o.text.includes('broken trident'))).toBe(true);
    click(findButton(s, 'Close'));
    expect(s.state.fact).toBeNull();
    // House: paint, then pick the room.
    click(findButton(s, '🏠 House'));
    s.buyItem(getItem('paint-sky'));
    expect(owns(Store.getProfile(), 'paint-sky')).toBe(true);
    s.state.room = 'paint-sky'; s.rebuild();
    expect(findButton(s, 'Bedroom')).toBeTruthy();
    click(findButton(s, 'Bedroom'));
    expect(roomDecor(Store.getProfile(), 'bedroom').wall).toBe(0xd9e9ff);
    // Leaving resumes the caller.
    const caller = { events: { emit: vi.fn() } };
    s.scene.get = () => caller; s.scene.isPaused = () => true;
    s.close();
    expect(caller.events.emit).toHaveBeenCalledWith('market:done', { bought: expect.any(Array) });
  });
});

describe('the shelf', () => {
  it('holds a few of each snack a day, and fills up again next morning', async () => {
    const { stockLeft, STOCK_PER_DAY } = await import('../src/systems/Market.js');
    const p = newProfile({ name: 'A', grade: 3 });
    p.coins = 500;
    expect(stockLeft(p, 'snack-mango-juice')).toBe(STOCK_PER_DAY);
    for (let i = 0; i < STOCK_PER_DAY; i++) expect(buy(p, 'snack-mango-juice').ok).toBe(true);
    expect(stockLeft(p, 'snack-mango-juice')).toBe(0);
    expect(buyBlock(p, 'snack-mango-juice')).toBe('stock');
    expect(buy(p, 'snack-mango-juice')).toMatchObject({ ok: false, reason: 'stock' });
    expect(buyBlock(p, 'snack-coconut')).toBeNull();                 // each snack has its own shelf
    expect(stockLeft(p, 'snack-mango-juice', '2099-01-01')).toBe(STOCK_PER_DAY);   // a new day, a full shelf
    expect(stockLeft(p, 'hat-cap')).toBe(Infinity);                 // hats are bought once, not stocked
  });
});
