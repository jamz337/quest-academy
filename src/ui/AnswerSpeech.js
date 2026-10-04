// Reading answers aloud: a small 🔊 in the corner of each answer that reads just that answer, and, when the
// player chose "Read everything to me", the answers read after the question ("fluff, fluffily, or fluffy?").
// Both can be switched off with the READ ANSWERS setting on the player's profile (on by default).
import * as Store from '../systems/Store.js';
import { speak } from '../systems/Speech.js';
import { speakButton } from './Button.js';
import { uiScale } from '../systems/Layout.js';
import { picturesSaid } from '../data/early/pictures.js';

/** Whether this player wants answers read (the profile's READ ANSWERS setting; on unless turned off). */
export const readsAnswers = (profile = Store.getProfile()) => (profile?.readAnswers || 'on') !== 'off';

const MARKS = { '.': 'full stop', '?': 'question mark', '!': 'exclamation mark', ',': 'comma', "'": 'apostrophe', '’': 'apostrophe', ':': 'colon', ';': 'semicolon', '"': 'speech marks', '-': 'dash' };

/** How an answer should sound: punctuation on its own (Grammar Gate's ".", "?") is read by name, as the game names it. */
export function spokenAnswer(answer) {
  const s = String(answer ?? '').replace(/\n+/g, ' ').trim();
  const pics = picturesSaid(s);   // "🥭🥭🥭" is said "three mangoes", "🔺" "a triangle"
  if (pics) return pics;
  const marks = [...s.replace(/\s+/g, '')];
  if (marks.length && marks.every((ch) => MARKS[ch])) return marks.map((ch) => MARKS[ch]).join(' ');
  return s;
}

/** The answers as one spoken line: "fluff, fluffily, or fluffy". */
export function answerLine(choices) {
  const list = (choices || []).map(spokenAnswer).filter(Boolean);
  if (list.length <= 1) return list.join('');
  if (list.length === 2) return `${list[0]}, or ${list[1]}`;
  return `${list.slice(0, -1).join(', ')}, or ${list[list.length - 1]}`;
}

/**
 * Put a small 🔊 in the top-right corner of an answer (a Button, Card or Container of size w x h centred on its
 * position) that reads `words`. It is a child of the answer, so it moves and fades with it, and it sits on top,
 * so tapping it reads the answer without choosing it. Returns the speaker, or null (setting off, no speech).
 */
export function answerSpeaker(scene, host, w, h, words, { rate = 0.9, inset = 4 } = {}) {
  if (!host || !readsAnswers() || words === undefined || words === null || String(words).trim() === '') return null;
  const ui = uiScale(scene);
  // Big enough for a small finger, never so big that it covers the answer.
  const size = Math.max(38 * ui, Math.min(42 * ui, h * 0.45, w * 0.32));   // never smaller than a fingertip
  const sp = speakButton(scene, w / 2 - size / 2 - inset, -h / 2 + size / 2 + inset, size, spokenAnswer(words), { rate });
  if (!sp) return null;
  sp.setAlpha(0.9);
  if (typeof host.add === 'function') host.add(sp);
  return sp;
}

/**
 * In automatic read-aloud mode: read `readableText` (the question), then, if it ends on its own and the answers
 * are still on screen, read the answers. Returns true when it scheduled anything.
 */
export function readQuestionThenAnswers(scene, readableText, choices, { rate = 0.9, delay = 350 } = {}) {
  if (!readableText) return false;
  scene.time.delayedCall(delay, () => {
    if (!readableText.active) return;
    readableText.read({
      rate,
      onEnd: (cancelled) => {
        if (cancelled || !readableText.active || !choices || !choices.length || !readsAnswers()) return;
        scene.time.delayedCall(250, () => { if (readableText.active) speak(answerLine(choices), { rate }); });
      }
    });
  });
  return true;
}
