// Read-aloud through the browser's speech synthesis: no audio files, works offline, and helps early readers
// with sentences and questions. Anything that cannot speak simply shows no button.

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

let voice = null;
function pickVoice(s) {
  if (voice) return voice;
  const voices = s.getVoices ? s.getVoices() : [];
  voice = voices.find((v) => /^en[-_]/i.test(v.lang) && /child|kid|female|samantha|zira|google uk english female/i.test(v.name))
    || voices.find((v) => /^en[-_]/i.test(v.lang)) || null;
  return voice;
}

/** Speak `text`, cancelling anything still being read. Slightly slow for young listeners. */
export function speak(text, { rate = 0.9, pitch = 1.05 } = {}) {
  const s = synth();
  if (!s) return false;
  const spoken = speakable(text);
  if (!spoken) return false;
  try {
    s.cancel();
    const u = new SpeechSynthesisUtterance(spoken);
    u.lang = 'en-US'; u.rate = rate; u.pitch = pitch;
    const v = pickVoice(s);
    if (v) u.voice = v;
    s.speak(u);
    return true;
  } catch { return false; }
}

export function stop() {
  const s = synth();
  if (s) { try { s.cancel(); } catch { /* ignore */ } }
}
