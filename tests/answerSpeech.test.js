// Reading answers aloud: a 🔊 on each answer, the answers read after the question in automatic mode, and the
// READ ANSWERS setting that turns both off.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { installPhaserMock, fakeSystems, findButton, click, flushTimers } from './helpers/phaserMock.js';

installPhaserMock();
const speak = vi.fn();
vi.mock('../src/systems/Speech.js', async (importOriginal) => ({ ...(await importOriginal()), canSpeak: () => true, speak: (...a) => speak(...a), speakWords: () => null, stop: () => {} }));

const { answerLine, spokenAnswer, readsAnswers, answerSpeaker, readQuestionThenAnswers } = await import('../src/ui/AnswerSpeech.js');
const { GrammarGate } = await import('../src/scenes/minigames/english/GrammarGate.js');
const { migrate, newProfile } = await import('../src/systems/SaveSystem.js');
const { SAVE_VERSION } = await import('../src/constants.js');
const Store = await import('../src/systems/Store.js');

function boot(fields = {}) {
  const storage = { data: {}, getItem(k) { return this.data[k] ?? null; }, setItem(k, v) { this.data[k] = v; }, removeItem(k) { delete this.data[k]; } };
  globalThis.localStorage = storage;
  Store.init();
  Store.createProfile({ name: 'Maya', grade: 3, ...fields });
}

function grammar() {
  const s = new GrammarGate();
  fakeSystems(s);
  s.finish = vi.fn();
  s.init({ gameId: 'eng-grammar', grade: 3, band: 'A', title: 'Grammar Gate', subject: 'words', context: {}, timers: true, seed: 3 });
  s.create({});
  if (findButton(s, 'Got it!')) click(findButton(s, 'Got it!'));
  return s;
}
const speakers = (s) => s.objs.filter((o) => o.label && o.label.text === '🔊' && o.active);

beforeEach(() => { speak.mockClear(); });

describe('reading answers aloud', () => {
  it('joins answers into one natural line', () => {
    expect(answerLine(['fluff', 'fluffily', 'fluffy'])).toBe('fluff, fluffily, or fluffy');
    expect(answerLine(['yes', 'no'])).toBe('yes, or no');
    expect(answerLine(['only'])).toBe('only');
    expect(answerLine([12, 'two\nlines'])).toBe('12, or two lines');
    expect(answerLine([])).toBe('');
  });

  it('reads punctuation answers by name and leaves words alone', () => {
    expect(spokenAnswer('.')).toBe('full stop');
    expect(spokenAnswer('?')).toBe('question mark');
    expect(spokenAnswer('!')).toBe('exclamation mark');
    expect(answerLine(['!', '.', '?'])).toBe('exclamation mark, full stop, or question mark');
    expect(spokenAnswer("it's")).toBe("it's");
    expect(spokenAnswer('3/4')).toBe('3/4');
  });

  it('is on by default and for older saves, and off only when the player turns it off', () => {
    expect(readsAnswers(null)).toBe(true);
    expect(readsAnswers({})).toBe(true);
    expect(readsAnswers({ readAnswers: 'off' })).toBe(false);
    expect(newProfile({ name: 'A' }).readAnswers).toBe('on');
    expect(migrate({ version: SAVE_VERSION, profiles: { a: { id: 'a' } } }).profiles.a.readAnswers).toBe('on');
    expect(migrate({ version: SAVE_VERSION, profiles: { a: { id: 'a', readAnswers: 'off' } } }).profiles.a.readAnswers).toBe('off');
  });

  it('puts a 🔊 in the corner of an answer that reads just that answer', () => {
    boot();
    const scene = fakeSystems({ ui: 1 });
    const host = { add: vi.fn() };
    const sp = answerSpeaker(scene, host, 200, 80, 'fluffy', { rate: 0.8 });
    expect(host.add).toHaveBeenCalledWith(sp);
    expect(sp.x).toBeGreaterThan(0); expect(sp.y).toBeLessThan(0);   // top-right, in the host's own coordinates
    click(sp);
    expect(speak).toHaveBeenCalledWith('fluffy', expect.objectContaining({ rate: 0.8 }));
    expect(answerSpeaker(scene, host, 200, 80, '')).toBeNull();
  });

  it('reads the answers after the question only when the question ends on its own', () => {
    boot();
    const scene = fakeSystems({ ui: 1 });
    let opts = null;
    const q = { active: true, read: vi.fn((o) => { opts = o; }) };
    readQuestionThenAnswers(scene, q, ['fluff', 'fluffily', 'fluffy'], { rate: 0.9 });
    flushTimers(scene);
    expect(q.read).toHaveBeenCalled();
    opts.onEnd(true); flushTimers(scene);            // cut short (the child tapped something): no answers
    expect(speak).not.toHaveBeenCalled();
    opts.onEnd(false); flushTimers(scene);           // finished: the answers follow
    expect(speak).toHaveBeenCalledWith('fluff, fluffily, or fluffy', { rate: 0.9 });
  });

  it('Grammar Gate: every answer has its own 🔊, tapping it reads the word without choosing it', () => {
    boot();
    const s = grammar();
    expect(speakers(s)).toHaveLength(1 + s.round.options.length);   // the sentence's, then one per answer
    const word = s.round.options[1];
    click(speakers(s)[2]);
    expect(speak).toHaveBeenCalledWith(spokenAnswer(word), expect.any(Object));
    expect(s.state.picked).toBeNull();
  });

  it('Grammar Gate: with READ ANSWERS off only the sentence keeps its 🔊', () => {
    boot({ readAnswers: 'off' });
    const s = grammar();
    expect(speakers(s)).toHaveLength(1);
  });
});
