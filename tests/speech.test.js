import { describe, it, expect } from 'vitest';
import { speakable, canSpeak, speak } from '../src/systems/Speech.js';

describe('read aloud', () => {
  it('turns on-screen text into natural speech', () => {
    expect(speakable('The school ____ was very strict.')).toBe('The school blank was very strict.');
    expect(speakable('Fill in the missing word:\n“The Lord is my _____, I shall not want.”')).toBe('Fill in the missing word: The Lord is my blank, I shall not want.');
    expect(speakable('Robot faces North ▲\nMove ▲\nTurn ◀')).toBe('Robot faces North forward Move forward Turn left');
    expect(speakable('7 × 8')).toBe('7 times 8');
    expect(speakable('12 ÷ 4')).toBe('12 divided by 4');
    expect(speakable('9 − 3')).toBe('9 minus 3');
    expect(speakable('')).toBe('');
  });

  it('is unavailable without speech synthesis and speak() fails quietly', () => {
    expect(canSpeak()).toBe(false);
    expect(speak('hello')).toBe(false);
  });
});

describe('word highlighting', () => {
  it('maps spoken character positions back to on-screen words', async () => {
    const { spokenWords, wordAt, rateFor } = await import('../src/systems/Speech.js');
    const { spoken, ranges } = spokenWords(['The', 'school', '____', 'was', 'strict.']);
    expect(spoken).toBe('The school blank was strict.');
    expect(ranges).toEqual([[0, 3], [4, 10], [11, 16], [17, 20], [21, 28]]);
    expect(wordAt(ranges, 0)).toBe(0);
    expect(wordAt(ranges, 11)).toBe(2);   // "blank" lights up the ____ word
    expect(wordAt(ranges, 27)).toBe(4);
    expect(wordAt(ranges, 20)).toBe(3);   // the space after a word still belongs to it
    const arrows = spokenWords(['Move', '▲']);
    expect(arrows.spoken).toBe('Move forward');
    expect(arrows.ranges[1]).toEqual([5, 12]);
    expect(spokenWords(['“', 'hi”']).ranges[0]).toBeNull();   // a lone quote speaks as nothing and is skipped
    expect(rateFor(2)).toBeLessThan(rateFor(5));
  });
});

describe('character voices', () => {
  it('gives every villager and boss a sex, and no two the same pitch and pace', async () => {
    const { NPCS } = await import('../src/data/world/npcs.js');
    const { BOSSES } = await import('../src/data/world/bosses.js');
    const all = [...NPCS, ...BOSSES];
    for (const c of all) expect(['male', 'female']).toContain(c.voice);
    const keys = all.map((c) => `${c.voice}:${c.pitch}:${c.rate}`);
    expect(new Set(keys).size).toBe(all.length);
    const goliath = BOSSES.find((b) => b.id === 'boss-bible');
    expect(goliath.pitch).toBeLessThan(0.7);
    expect(goliath.rate).toBeLessThan(1);
  });
});

describe('voices', () => {
  const v = (name, lang = 'en-US') => ({ name, lang });
  it('tells a voice\'s sex from its name and prefers natural voices', async () => {
    const { voiceSex, voiceScore, chooseVoice, speakerTweak } = await import('../src/systems/Speech.js');
    expect(voiceSex(v('Microsoft Aria Online (Natural) - English (United States)'))).toBe('female');
    expect(voiceSex(v('Microsoft Guy Online (Natural) - English (United States)'))).toBe('male');
    expect(voiceSex(v('Google UK English Female', 'en-GB'))).toBe('female');
    expect(voiceSex(v('Google UK English Male', 'en-GB'))).toBe('male');
    expect(voiceSex(v('Samantha'))).toBe('female');
    expect(voiceSex(v('Daniel', 'en-GB'))).toBe('male');
    expect(voiceSex(v('Google US English'))).toBeNull();
    expect(voiceSex(v('en-us-x-tpd#male_1-local'))).toBe('male');
    expect(voiceSex(v('en-us-x-sfg#female_2-local'))).toBe('female');
    expect(voiceSex(v('en-gb-x-gbb-local', 'en-GB'))).toBe('male');
    expect(voiceSex(v('en-au-x-aua-network', 'en-AU'))).toBe('female');
    expect(voiceSex(v('Gordon', 'en-AU'))).toBe('male');
    expect(voiceSex(v('Martha', 'en-GB'))).toBe('female');
    expect(voiceScore(v('Microsoft Zira Desktop - English (United States)'))).toBeLessThan(voiceScore(v('Microsoft Aria Online (Natural) - English (United States)')));
    expect(voiceScore(v('Google Deutsch', 'de-DE'))).toBe(-Infinity);
    expect(voiceScore(v('Bad News'))).toBeLessThan(0);
    const t = speakerTweak('owl-librarian');
    expect(speakerTweak('owl-librarian')).toEqual(t);
    expect(Math.abs(t.pitch)).toBeLessThanOrEqual(0.1);
  });

  it('picks the best voice of the wanted sex, else the best English voice', async () => {
    const { chooseVoice } = await import('../src/systems/Speech.js');
    const voices = [
      v('Microsoft David Desktop - English (United States)'), v('Microsoft Zira Desktop - English (United States)'),
      v('Microsoft Guy Online (Natural) - English (United States)'), v('Microsoft Jenny Online (Natural) - English (United States)'),
      v('Google Deutsch', 'de-DE')
    ];
    expect(chooseVoice(voices, 'male').name).toMatch(/Guy/);
    expect(chooseVoice(voices, 'female').name).toMatch(/Jenny/);
    expect(chooseVoice(voices.slice(0, 1), 'female').name).toMatch(/David/);   // nothing female: best English wins
    expect(chooseVoice([v('Google Deutsch', 'de-DE')], 'male')).toBeNull();
    expect(chooseVoice([], 'male')).toBeNull();
  });
});
