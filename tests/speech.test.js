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
