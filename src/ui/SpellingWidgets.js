// Pieces shared by the spelling teach and test screens: a row of letter tiles, syllable chips and the
// on-screen keyboard. Everything draws from plain values so a rebuild redraws the same picture.
import { THEME } from './theme.js';
import { plank, tile } from './Card.js';
import { button } from './Button.js';
import { enter } from './motion.js';

/** One colour per syllable chunk, cycling; used on the flash card letters and the chunk chips alike. */
export const CHUNK_COLOURS = [0x3d8bff, 0xff6fae, 0x2ec46a, 0xff8f3f, 0x8b5cf6, 0xffc531];

const ROWS = ['qwertyuiop', 'asdfghjkl', "zxcvbnm'-"];

/** Tile looks: fill and ink colours by state. */
const LOOKS = {
  shown: [THEME.surface, THEME.ink], typed: [THEME.subjects.words.soft, THEME.ink], blank: [THEME.sunken, THEME.ink3],
  ok: [THEME.success, THEME.onAccent], bad: [THEME.danger, THEME.onAccent], missing: [THEME.dangerSoft, THEME.danger]
};

/**
 * A centred row of letter tiles. letters: [{ ch, look, colour? }] where look is a key of LOOKS; `colour`
 * (a chunk colour) tints a shown letter's ink. Returns the tiles.
 */
export function letterRow(scene, { cx, cy, letters, size, gap }) {
  const x0 = cx - ((size + gap) * letters.length - gap) / 2 + size / 2;
  return letters.map((l, i) => {
    const [fill, ink] = LOOKS[l.look] || LOOKS.shown;
    return tile(scene, x0 + i * (size + gap), cy, size, String(l.ch || '').toUpperCase(), {
      color: fill, textColor: l.colour ?? ink, empty: l.look === 'blank', fontSize: size * 0.52, stroke: l.look === 'shown' ? THEME.line : null, shadow: 'sm'
    });
  });
}

/** Tile size that fits `n` letters in `width` and no taller than `maxSize`. */
export const fitTile = (n, width, gap, maxSize, minSize) => Math.max(minSize, Math.min(maxSize, (width - gap * (Math.max(1, n) - 1)) / Math.max(1, n)));

/**
 * Syllable chunks as coloured pills in a row. chunks: strings; `state[i]` may be 'done' (faded, placed) or
 * 'active'; onTap(i) makes them tappable. Returns the chips.
 */
export function chunkChips(scene, { cx, cy, chunks, ui = 1, onTap = null, state = [], maxW = 400 }) {
  const gap = 8 * ui, h = 40 * ui;
  const widths = chunks.map((c) => Math.max(48 * ui, c.length * 13 * ui + 22 * ui));
  let total = widths.reduce((s, w) => s + w, 0) + gap * (chunks.length - 1);
  const k = total > maxW ? maxW / total : 1;
  total *= k;
  let x = cx - total / 2;
  return chunks.map((c, i) => {
    const w = widths[i] * k, colour = CHUNK_COLOURS[i % CHUNK_COLOURS.length];
    const done = state[i] === 'done';
    const p = plank(scene, x + w / 2, cy, w, h, c, { color: done ? THEME.sunken : colour, textColor: done ? THEME.ink3 : THEME.onAccent, fontSize: Math.min(18 * ui, w / (c.length * 0.62 + 1)), radius: h / 2, onTap: onTap && !done ? () => onTap(i) : null, shadow: done ? 'none' : 'sm' });
    x += w + gap;
    return p;
  });
}

/**
 * Three rows of letter keys plus backspace and a Check button, laid out inside `rect`.
 * opts: { onKey(ch), onCheck(), ready, ui, checkLabel }. Returns { keys, check }.
 */
export function letterKeyboard(scene, rect, { onKey, onCheck, ready = true, ui = 1, checkLabel = 'Check ✓' }) {
  const gap = 5 * ui;
  const keyW = Math.min(40 * ui, (rect.w - gap * 9) / 10), keyH = Math.min(46 * ui, (rect.h - 70 * ui - gap * 2) / 3);
  const top = rect.y + 6 * ui;
  const keys = [];
  ROWS.forEach((row, ri) => {
    const y = top + ri * (keyH + gap) + keyH / 2;
    const last = ri === ROWS.length - 1, backW = keyW * 1.5;
    const rowW = row.length * keyW + (row.length - 1) * gap + (last ? gap + backW : 0);
    const x0 = rect.x + (rect.w - rowW) / 2 + keyW / 2;
    [...row].forEach((ch, i) => keys.push(plank(scene, x0 + i * (keyW + gap), y, keyW, keyH, ch.toUpperCase(), { fontSize: keyW * 0.5, onTap: () => onKey(ch), shadow: 'sm' })));
    if (last) keys.push(plank(scene, x0 + row.length * (keyW + gap) - keyW / 2 + backW / 2, y, backW, keyH, '⌫', { color: THEME.sunken, fontSize: keyW * 0.5, onTap: () => onKey('⌫'), shadow: 'sm' }));
  });
  enter(scene, keys, { from: 'up', delay: 60, stagger: 8 });
  const by = top + 3 * (keyH + gap) + 30 * ui;
  const check = button(scene, rect.x + rect.w / 2, by, Math.min(rect.w - 40, 240 * ui), 48 * ui, checkLabel, { variant: 'primary', disabled: !ready, onClick: onCheck });
  return { keys, check };
}

/** Maps a typed key event to a keyboard action, or null. */
export function keyFromEvent(e) {
  const key = String(e.key || '');
  if (key === 'Backspace') return '⌫';
  if (key === 'Enter') return 'Enter';
  if (/^[a-zA-Z'-]$/.test(key)) return key.toLowerCase();
  return null;
}
