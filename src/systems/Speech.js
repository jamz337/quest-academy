// Read-aloud through the browser's speech synthesis: no audio files, works offline, and helps early readers
// with sentences and questions. Anything that cannot speak simply shows no button.
// Words can be lit up as they are spoken: the browser reports word boundaries while speaking, and where it
// does not, a timed fallback steps through the words at the speaking rate.
// Voices: the most natural English voices the device offers are preferred (neural/online voices on Windows
// and Android, premium voices on Apple devices), one per sex, so villagers can sound like themselves.

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

// ---- Voice choice ------------------------------------------------------------------------------------------

const FEMALE_NAMES = /\b(aria|jenny|zira|samantha|karen|moira|tessa|fiona|victoria|susan|hazel|ava|allison|emma|libby|sonia|natasha|clara|michelle|ana|olivia|abbi|bella|hollie|maisie|molly|nicole|joanna|salli|kimberly|kendra|ivy|amy|raveena|catherine|linda|heather|serena|ellen|kate|zoe|nora|freya|luna|leah|monica|sara|elizabeth|jane|ashley|cora|nancy|emily|amber|aditi|ruth|sarah|lisa|anna|martha|nicky|shelley|flo|sandy|grandma|princess|siri female)\b/i;
const MALE_NAMES = /\b(guy|davis|david|mark|daniel|alex|fred|tom|arthur|george|ryan|christopher|eric|roger|steffan|rishi|thomas|william|brandon|jason|liam|connor|oliver|noah|ethan|matthew|james|andrew|brian|kevin|justin|joey|russell|geraint|lee|oscar|jacob|elliot|ollie|alfie|richard|reed|rory|aaron|prabhat|neerja male|duke|jerry|tony|sean|adam|ben|paul|kyle|gordon|evan|nathan|reed|rocko|eddy|grandpa|siri male)\b/i;

// Google's Android voices carry no names, only codes: en-us-x-sfg, en-gb-x-gbb and so on.
const GOOGLE_FEMALE = /\b(en-[a-z]{2}-x-(sfg|tpf|iog|iob|gba|gbc|fis|aua|auc|ena|ene|nda|nzc|zaa|zac|ind))\b/i;
const GOOGLE_MALE = /\b(en-[a-z]{2}-x-(tpd|tpc|iom|gbb|gbd|rjs|aub|aud|enc|end|ndb|nzb|zab|zad|ind-m))\b/i;

/** 'female' | 'male' | null from a voice's name; the explicit words win over first names and codes. */
export function voiceSex(v) {
  const n = String(v?.name || '');
  if (/female|woman|girl/i.test(n)) return 'female';
  if (/(^|[^a-z])(male|man|boy)([^a-z]|$)/i.test(n)) return 'male';
  if (GOOGLE_FEMALE.test(n)) return 'female';
  if (GOOGLE_MALE.test(n)) return 'male';
  if (FEMALE_NAMES.test(n)) return 'female';
  if (MALE_NAMES.test(n)) return 'male';
  return null;
}

/** How human a voice is likely to sound, from its name and language. Higher is better; non-English is -Infinity. */
export function voiceScore(v) {
  const n = String(v?.name || ''), lang = String(v?.lang || '');
  if (!/^en([-_]|$)/i.test(lang)) return -Infinity;
  let s = 0;
  if (/natural|neural/i.test(n)) s += 50;
  if (/premium|enhanced|hd\b/i.test(n)) s += 40;
  if (/online/i.test(n)) s += 20;
  if (/google/i.test(n)) s += 25;
  if (/siri/i.test(n)) s += 30;
  if (/^(samantha|daniel|karen|moira|tessa|fiona|ava|allison|tom|oliver|kate|serena|zoe|evan|nathan|aaron)( \(.*\))?$/i.test(n)) s += 15;   // Apple's better voices
  if (/microsoft/i.test(n) && !/natural|online/i.test(n)) s += 5;
  if (/desktop|compact|espeak|eloquence|festival|pico|novelty|whisper|bad news|bells|boing|bubbles|cellos|deranged|hysterical|organ|trinoids|zarvox|albert|jester|junior|ralph|wobble|superstar|good news|kathy|fred\b/i.test(n)) s -= 40;
  if (/^en[-_](us|gb)/i.test(lang)) s += 10;
  else if (/^en[-_](au|ca|ie|nz|za|in)/i.test(lang)) s += 5;
  return s;
}

/** The best-sounding voice of a sex from a list, then the best of any sex. Pure, so tests can check it. */
export function chooseVoice(voices, sex = null) {
  const ranked = (voices || []).map((v) => ({ v, score: voiceScore(v), sex: voiceSex(v) })).filter((r) => Number.isFinite(r.score)).sort((a, b) => b.score - a.score);
  if (!ranked.length) return null;
  const match = sex ? ranked.find((r) => r.sex === sex) : null;
  return (match || ranked[0]).v;
}

const chosen = { female: undefined, male: undefined, any: undefined };
function pickVoice(s, sex) {
  const key = sex || 'any';
  if (chosen[key] !== undefined) return chosen[key];
  const voices = s.getVoices ? s.getVoices() : [];
  if (!voices.length) return null;   // not loaded yet: try again next time
  chosen[key] = chooseVoice(voices, sex);
  return chosen[key];
}
if (typeof window !== 'undefined' && window.speechSynthesis && typeof window.speechSynthesis.addEventListener === 'function') {
  window.speechSynthesis.addEventListener('voiceschanged', () => { chosen.female = chosen.male = chosen.any = undefined; });
}

/** Stable pitch/rate offsets per speaker so villagers sharing a voice still sound like different people. */
export function speakerTweak(speaker) {
  if (!speaker) return { pitch: 0, rate: 0 };
  let h = 0; for (const ch of String(speaker)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return { pitch: ((h % 7) - 3) * 0.05, rate: (((h >> 3) % 5) - 2) * 0.03 };
}

/** How far to bend the pitch when the device has no voice of the wanted sex (a real male voice beats any bend). */
const SEX_BEND = { male: -0.3, female: 0.2 };

let announced = false;
function announce(s) {
  if (announced || typeof console === 'undefined') return;
  const voices = s.getVoices ? s.getVoices() : [];
  if (!voices.length) return;
  announced = true;
  const f = chooseVoice(voices, 'female'), m = chooseVoice(voices, 'male');
  console.info(`[read aloud] ${voices.length} voices; female: ${f ? f.name : 'none'}; male: ${m ? m.name : 'none'}`);
}

let current = null;   // { cancel } for whatever is being read, so a new reading clears the old highlight

/**
 * Speak `words` (on-screen words) and call onWord(i) as each is reached and onEnd() when finished or cancelled.
 * opts: { rate, pitch, voice: 'female'|'male'|null (the narrator is female), speaker (id for a stable tweak), onWord, onEnd }
 * Returns a handle with cancel(), or null when speech is unavailable.
 */
export function speakWords(words, { rate = 0.9, pitch = 1, voice = 'female', speaker = null, onWord = null, onEnd = null } = {}) {
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
    const v = pickVoice(s, voice);
    announce(s);
    const tweak = speakerTweak(speaker);
    // When no voice of the wanted sex exists, bend the pitch of whatever we have in that direction.
    const bend = voice && v && voiceSex(v) !== voice ? SEX_BEND[voice] || 0 : 0;
    u.lang = (v && v.lang) || 'en-US';
    u.rate = Math.max(0.7, Math.min(1.5, rate + tweak.rate));   // never slower than a patient adult
    u.pitch = Math.max(0.5, Math.min(2, pitch + tweak.pitch + bend));
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
          t += Math.max(180, 55 * (r[1] - r[0])) / u.rate;
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
