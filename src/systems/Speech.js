// Read-aloud through the browser's speech synthesis: no audio files, works offline, and helps early readers
// with sentences and questions. Anything that cannot speak simply shows no button.
// Words can be lit up as they are spoken: the browser reports word boundaries while speaking, and where it
// does not, a timed fallback steps through the words at the speaking rate.

const synth = () => (typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined' ? window.speechSynthesis : null);

export const canSpeak = () => !!synth();

/** Turn on-screen text into something natural to hear: blanks become "blank", arrows become words. */
export function speakable(text) {
  return String(text || '')
    .replace(/_{2,}/g, ' blank ')
    .replace(/[“”"]/g, '')
    .replace(/▲/g, ' forward').replace(/◀/g, ' left').replace(/▶/g, ' right').replace(/▼/g, ' down')
    .replace(/×/g, ' times ').replace(/÷/g, ' divided by ').replace(/−/g, ' minus ').replace(/²/g, ' squared')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.!?;:])/g, '$1')
    .trim();
}

/**
 * Spoken form of a list of on-screen words plus, for each word, its character range in the spoken string,
 * so a boundary event's charIndex can be mapped back to the word on screen. Words that speak as nothing
 * (e.g. a lone arrow) get an empty range and are skipped.
 */
export function spokenWords(words) {
  let spoken = '';
  const ranges = [];
  for (const w of words) {
    const s = speakable(w);
    if (!s) { ranges.push(null); continue; }
    if (spoken) spoken += ' ';
    ranges.push([spoken.length, spoken.length + s.length]);
    spoken += s;
  }
  return { spoken, ranges };
}

/** Index of the on-screen word being spoken at charIndex, or -1. */
export function wordAt(ranges, charIndex) {
  for (let i = 0; i < ranges.length; i++) { const r = ranges[i]; if (r && charIndex >= r[0] && charIndex < r[1]) return i; }
  // Between words (or trailing punctuation): the last word that started before this point.
  let best = -1;
  for (let i = 0; i < ranges.length; i++) if (ranges[i] && ranges[i][0] <= charIndex) best = i;
  return best;
}

/** Speaking rate by grade: a little slower for the youngest readers. */
export const rateFor = (grade) => ((Number(grade) || 3) <= 3 ? 0.85 : 0.95);

let voice = null;
function pickVoice(s) {
  if (voice) return voice;
  const voices = s.getVoices ? s.getVoices() : [];
  voice = voices.find((v) => /^en[-_]/i.test(v.lang) && /child|kid|female|samantha|zira|google uk english female/i.test(v.name))
    || voices.find((v) => /^en[-_]/i.test(v.lang)) || null;
  return voice;
}

let current = null;   // { cancel } for whatever is being read, so a new reading clears the old highlight

/**
 * Speak `words` (on-screen words) and call onWord(i) as each is reached and onEnd() when finished or cancelled.
 * Returns a handle with cancel(), or null when speech is unavailable.
 */
export function speakWords(words, { rate = 0.9, pitch = 1.05, onWord = null, onEnd = null } = {}) {
  const s = synth();
  if (!s) return null;
  const { spoken, ranges } = spokenWords(words);
  if (!spoken) return null;
  stop();
  const timers = [];
  let done = false, sawBoundary = false, last = -1;
  const say = (i) => { if (done || i === last || i < 0) return; last = i; if (onWord) onWord(i); };
  const finish = () => { if (done) return; done = true; timers.forEach(clearTimeout); if (onEnd) onEnd(); if (current === handle) current = null; };
  const handle = { cancel: () => { finish(); try { s.cancel(); } catch { /* ignore */ } } };
  try {
    const u = new SpeechSynthesisUtterance(spoken);
    u.lang = 'en-US'; u.rate = rate; u.pitch = pitch;
    const v = pickVoice(s);
    if (v) u.voice = v;
    u.onboundary = (e) => { if (e.name && e.name !== 'word') return; sawBoundary = true; say(wordAt(ranges, e.charIndex)); };
    u.onstart = () => {
      say(wordAt(ranges, 0));
      // Fallback: if no boundary events arrive shortly, step through the words on an estimated clock.
      timers.push(setTimeout(() => {
        if (sawBoundary || done) return;
        let t = 0;
        ranges.forEach((r, i) => {
          if (!r) return;
          timers.push(setTimeout(() => { if (!sawBoundary) say(i); }, t));
          t += Math.max(180, 55 * (r[1] - r[0])) / rate;
        });
      }, 450));
    };
    u.onend = finish; u.onerror = finish;
    current = handle;
    s.speak(u);
    return handle;
  } catch { finish(); return null; }
}

/** Speak plain text (no highlighting). Slightly slow for young listeners. */
export function speak(text, opts = {}) {
  return !!speakWords(String(text || '').split(/\s+/), opts);
}

export function stop() {
  if (current) { const c = current; current = null; c.cancel(); return; }
  const s = synth();
  if (s) { try { s.cancel(); } catch { /* ignore */ } }
}
