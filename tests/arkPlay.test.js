// All Aboard the Ark for Pre-K: touch-to-learn, then gentle asks, headless against the Phaser mock.
import { describe, it, expect, vi } from 'vitest';
import { installPhaserMock, fakeSystems, findButton, click, flushTimers } from './helpers/phaserMock.js';

installPhaserMock();

const { ArkPlay, ARK_PLAY_COUNT, ARK_PLAY_ASKS } = await import('../src/scenes/minigames/bible/ArkPlay.js');
const { ArkAnimals } = await import('../src/scenes/minigames/bible/ArkAnimals.js');
const { ARK_ANIMALS, pickAnimals, makeAsks, animalLine, askLine, otherLine, aAn } = await import('../src/data/early/animals.js');
const { ANIMAL_SOUND_NAMES, Sfx } = await import('../src/systems/Audio.js');
const { Rng } = await import('../src/systems/Rng.js');
const { getGame } = await import('../src/data/minigames.js');
const { launch } = await import('../src/systems/MinigameLauncher.js');
const Store = await import('../src/systems/Store.js');

globalThis.localStorage = { data: {}, getItem(k) { return this.data[k] ?? null; }, setItem(k, v) { this.data[k] = v; }, removeItem(k) { delete this.data[k]; } };
Store.init();
Store.createProfile({ name: 'Tiny', grade: -1 });

function makeScene(Cls, payload) {
  const s = new Cls();
  fakeSystems(s);
  s.finish = vi.fn();
  s.init({ gameId: 'bible-ark', grade: -1, band: 'E', title: 'Ark', subject: 'bible', context: {}, timers: false, early: true, ...payload });
  s.create({});
  return s;
}
const pair = (a) => `${a.pic}${a.pic}`;

describe('the ark animals', () => {
  it('each has a picture, a name, a sound the speaker can make, and a noise word or a line about being quiet', () => {
    for (const a of ARK_ANIMALS) {
      expect(a.pic && a.name && a.plural).toBeTruthy();
      expect(ANIMAL_SOUND_NAMES).toContain(a.sound);
      expect(!!a.noise || !!a.quiet).toBe(true);
      expect(animalLine(a)).toContain('two by two');
      expect(animalLine(a)).toContain(a.plural);
    }
    expect(aAn('owl')).toBe('an owl'); expect(aAn('lion')).toBe('a lion');
    expect(() => Sfx.animal('roar')).not.toThrow();   // silent without an audio context
    expect(() => Sfx.animal('nothing')).not.toThrow();
  });

  it('a game picks eight with the lion, no two sharing a noise word or a sound, and asks about four of them', () => {
    for (let seed = 1; seed < 30; seed++) {
      const rng = new Rng(seed), set = pickAnimals(rng, 8);
      expect(set).toHaveLength(8);
      expect(set.map((a) => a.name)).toContain('lion');
      const noises = set.map((a) => a.noise).filter(Boolean), sounds = set.map((a) => a.sound);
      expect(new Set(noises).size).toBe(noises.length);
      expect(new Set(sounds).size).toBe(sounds.length);
      const asks = makeAsks(set, rng, 4);
      expect(asks).toHaveLength(4);
      expect(new Set(asks.map((x) => x.animal.name)).size).toBe(4);
      for (const ask of asks) {
        if (ask.kind === 'noise') { expect(ask.animal.noise).toBeTruthy(); expect(askLine(ask)).toContain(ask.animal.noise); } else expect(askLine(ask)).toContain(ask.animal.name);
        const other = set.find((a) => a !== ask.animal);
        expect(otherLine(other, ask)).toContain(other.name);
        expect(otherLine(other, ask)).not.toMatch(/wrong|no\b/i);
      }
    }
  });
});

describe('All Aboard the Ark for Pre-K (headless)', () => {
  it('is what Pre-K launches, while Kindergarten still gets the question game', () => {
    const from = { scene: { key: 'ChallengeMenu', pause() {}, launch() {} } };
    expect(getGame('bible-ark').playSceneKey).toBe('MG_ArkPlay');
    expect(launch(from, 'bible-ark', {})).toMatchObject({ sceneKey: 'MG_ArkPlay', grade: -1, early: true, timers: false });
    Store.updateProfile((p) => { p.grade = 0; });
    expect(launch(from, 'bible-ark', {}).sceneKey).toBe('MG_ArkAnimals');
    Store.updateProfile((p) => { p.grade = -1; });
    expect(new ArkAnimals().sys.settings.key).toBe('MG_ArkAnimals');
    expect(new ArkPlay().sys.settings.key).toBe('MG_ArkPlay');
  });

  it('boards a pair for every touch, then asks gently and never marks a touch wrong, then floods and gives full stars', () => {
    const s = makeScene(ArkPlay, { seed: 3 });
    const st = s.state;
    expect(st.phase).toBe('explore');
    expect(st.kinds).toHaveLength(ARK_PLAY_COUNT);
    expect(st.asks).toHaveLength(ARK_PLAY_ASKS);
    // Touch every animal: it is told about and boards; a second touch of a boarded one does nothing.
    st.kinds.forEach((k, i) => {
      click(findButton(s, pair(k)));
      expect(st.line).toBe(animalLine(k));
      expect(st.locked).toBe(true);
      flushTimers(s);
      expect(st.done[i]).toBe(true);
      expect(st.boarded).toBe(i + 1);
    });
    expect(st.phase).toBe('ask');
    expect(st.line).toContain(askLine(st.asks[0]));
    // Each ask: another animal first (named, not wrong, ask repeated), then the right one (cheered).
    st.asks.forEach((ask, i) => {
      const other = st.kinds.find((k) => k !== ask.animal);
      click(findButton(s, pair(other)));
      expect(st.askI).toBe(i);
      expect(st.line).toBe(otherLine(other, ask));
      expect(st.locked).toBe(false);
      click(findButton(s, pair(ask.animal)));
      expect(st.found).toBe(st.kinds.indexOf(ask.animal));
      expect(st.locked).toBe(true);
      flushTimers(s);
      if (i < st.asks.length - 1) { expect(st.askI).toBe(i + 1); expect(st.line).toBe(askLine(st.asks[i + 1])); }
    });
    expect(st.finale).toBe(true);
    flushTimers(s);
    expect(s.finish).toHaveBeenCalledWith(expect.objectContaining({ correct: ARK_PLAY_ASKS, total: ARK_PLAY_ASKS }));
    expect(s.qlog).toHaveLength(0);   // nothing was a question, so nothing comes back for review
  });
});
