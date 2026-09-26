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
