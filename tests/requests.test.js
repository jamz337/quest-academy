import { describe, it, expect, vi } from 'vitest';

vi.mock('phaser', () => ({ default: {} }));
const { REQUESTS, todaysRequests, pendingRequest, openRequests, fillRequest, REQUEST_REWARD, REQUESTS_PER_DAY } = await import('../src/data/world/requests.js');
const { NPCS } = await import('../src/data/world/npcs.js');

const fresh = () => ({ id: 'p1', grade: 3, coins: 0, xp: 0, world: {} });

describe("villagers' orders", () => {
  it('every villager with a game has an order written', () => {
    for (const n of NPCS.filter((x) => x.gameId)) expect(REQUESTS[n.id], n.id).toBeTruthy();
    for (const r of Object.values(REQUESTS)) { expect(r.ask.length).toBeGreaterThan(30); expect(r.thanks.length).toBeGreaterThan(10); }
  });

  it('three villagers have an order each day, the same all day and different across days', () => {
    const p = fresh();
    const a = todaysRequests(p, '2026-10-05');
    expect(a).toHaveLength(REQUESTS_PER_DAY);
    expect(new Set(a).size).toBe(REQUESTS_PER_DAY);
    expect(todaysRequests(p, '2026-10-05')).toEqual(a);
    const days = new Set(['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09'].map((d) => todaysRequests(p, d).join()));
    expect(days.size).toBeGreaterThan(1);
  });

  it('only asks the youngest for games they can play', () => {
    const p = { ...fresh(), grade: -1 };
    for (const id of todaysRequests(p, '2026-10-05')) expect(['math-pizza', 'eng-grammar', 'code-bug', 'code-predict', 'bible-verse', 'eng-builder']).not.toContain(NPCS.find((n) => n.id === id).gameId);
  });

  it('two stars fill an order once and pay the reward; fewer leave it open', () => {
    const p = fresh(), day = '2026-10-05';
    const [npc] = todaysRequests(p, day);
    expect(pendingRequest(p, npc, day)).toBeTruthy();
    expect(fillRequest(p, npc, 1, day)).toMatchObject({ done: false });
    expect(p.coins).toBe(0);
    expect(fillRequest(p, npc, 2, day)).toMatchObject({ done: true, coins: REQUEST_REWARD.coins });
    expect(p.coins).toBe(REQUEST_REWARD.coins);
    expect(pendingRequest(p, npc, day)).toBe(null);
    expect(fillRequest(p, npc, 3, day)).toBe(null);
    expect(openRequests(p, day)).toHaveLength(REQUESTS_PER_DAY - 1);
    expect(openRequests(p, '2026-10-06')).toHaveLength(REQUESTS_PER_DAY);   // a new day, new orders
    expect(fillRequest(p, 'signpost', 3, day)).toBe(null);
  });
});
