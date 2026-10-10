// All Aboard the Ark for Pre-K: touch-to-learn on the shore, then gentle asks at the windows, headless against the mock.
import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import { installPhaserMock, fakeSystems, findButton, click, flushTimers } from './helpers/phaserMock.js';

installPhaserMock();

const { ArkPlay, ARK_PLAY_COUNT, ARK_PLAY_ASKS } = await import('../src/scenes/minigames/bible/ArkPlay.js');
const { ArkAnimals } = await import('../src/scenes/minigames/bible/ArkAnimals.js');
const { ARK_ANIMALS, pickAnimals, makeAsks, animalLine, nameLine, twoLine, askLine, otherLine, aAn } = await import('../src/data/early/animals.js');
const { ANIMAL_FILES, drawLion } = await import('../src/ui/AnimalArt.js');
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
const Name = (a) => a.name.charAt(0).toUpperCase() + a.name.slice(1);

describe('the ark animals', () => {
  it('each has a picture file (the lion is drawn), a recorded call, a stand-in sound, and a noise word or a quiet line', () => {
    for (const a of ARK_ANIMALS) {
      expect(a.key && a.name && a.plural).toBeTruthy();
      expect(fs.existsSync(`public/sounds/animals/${a.key}.mp3`), a.key).toBe(true);
      if (a.key !== 'lion') { expect(ANIMAL_FILES).toContain(a.key); expect(fs.existsSync(`public/sprites/animals/${a.key}.png`), a.key).toBe(true); }
      expect(ANIMAL_SOUND_NAMES).toContain(a.sound);
      expect(!!a.noise || !!a.quiet).toBe(true);
      expect(animalLine(a)).toBe(`${nameLine(a)} ${twoLine(a)}`);
      expect(twoLine(a)).toContain(a.plural);
    }
    expect(aAn('owl')).toBe('an owl'); expect(aAn('lion')).toBe('a lion');
    expect(() => Sfx.animal('roar')).not.toThrow();
    expect(typeof drawLion).toBe('function');
    expect(fs.existsSync('public/sounds/animals/SOURCES.txt')).toBe(true);
  });

  it('a game picks eight with the lion, no two sharing a noise word or a sound, and asks about four of them', () => {
    for (let seed = 1; seed < 30; seed++) {
      const rng = new Rng(seed), set = pickAnimals(rng, 8);
      expect(set).toHaveLength(8);
      expect(set.map((a) => a.key)).toContain('lion');
      const noises = set.map((a) => a.noise).filter(Boolean), sounds = set.map((a) => a.sound);
      expect(new Set(noises).size).toBe(noises.length);
      expect(new Set(sounds).size).toBe(sounds.length);
      const asks = makeAsks(set, rng, 4);
      expect(asks).toHaveLength(4);
      expect(new Set(asks.map((x) => x.animal.key)).size).toBe(4);
      for (const ask of asks) {
        if (ask.kind === 'noise') { expect(ask.animal.noise).toBeTruthy(); expect(askLine(ask)).toContain(ask.animal.noise); } else expect(askLine(ask)).toContain(ask.animal.name);
        const other = set.find((a) => a !== ask.animal);
        expect(otherLine(other, ask)).toContain(other.name);
        expect(otherLine(other, ask)).not.toMatch(/\bwrong\b|\bno\b/i);
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

  it('boards a pair per touch with its name and the count, asks at the windows without ever marking a touch wrong, floods, and gives full stars on Done', () => {
    const s = makeScene(ArkPlay, { seed: 3 });
    const st = s.state;
    expect(st.phase).toBe('explore');
    expect(st.kinds).toHaveLength(ARK_PLAY_COUNT);
    expect(st.asks).toHaveLength(ARK_PLAY_ASKS);
    // Touch every pair: Noah names it, the count pops, and it is aboard with its window lit.
    st.kinds.forEach((k, i) => {
      click(findButton(s, Name(k)));
      expect(st.line).toBe(nameLine(k));
      expect(st.locked).toBe(true);
      click(findButton(s, Name(k)) || { emit() {} });   // a second touch while it walks does nothing
      flushTimers(s);
      expect(st.done[i]).toBe(true);
      expect(st.aboard).toHaveLength(i + 1);
      expect(st.aboard[i]).toBe(k.key);
      if (i < ARK_PLAY_COUNT - 1) expect(st.line).toBe(twoLine(k));
      expect(findButton(s, `window ${k.key}`)).toBeTruthy();   // its window is lit and touchable
    });
    expect(st.phase).toBe('ask');
    expect(st.line).toContain(askLine(st.asks[0]));
    // Each ask: another window first (named, not wrong, ask repeated), then the right window (cheered).
    st.asks.forEach((ask, i) => {
      const other = st.kinds.find((k) => k !== ask.animal);
      click(findButton(s, `window ${other.key}`));
      expect(st.askI).toBe(i);
      expect(st.line).toBe(otherLine(other, ask));
      expect(st.locked).toBe(false);
      click(findButton(s, `window ${ask.animal.key}`));
      expect(st.found).toBe(ask.animal.key);
      expect(st.locked).toBe(true);
      flushTimers(s);
      if (i < st.asks.length - 1) { expect(st.askI).toBe(i + 1); expect(st.line).toBe(askLine(st.asks[i + 1])); }
    });
    expect(st.finale).toBe(true);
    expect(st.line).toContain('rainbow');
    // Free play: a window still plays and names its animal; Done finishes with full marks.
    const w = st.kinds[0];
    click(findButton(s, `window ${w.key}`));
    expect(st.line).toBe(nameLine(w));
    expect(s.finish).not.toHaveBeenCalled();
    click(findButton(s, 'Done ✓'));
    expect(s.finish).toHaveBeenCalledWith(expect.objectContaining({ correct: ARK_PLAY_ASKS, total: ARK_PLAY_ASKS }));
    expect(s.qlog).toHaveLength(0);   // nothing was a question, so nothing comes back for review
  });
});
