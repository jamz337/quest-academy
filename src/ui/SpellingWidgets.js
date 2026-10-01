// Pieces shared by the spelling teach and test screens: a row of letter tiles, syllable chips and the
// on-screen keyboard. Everything draws from plain values so a rebuild redraws the same picture.
import { THEME } from './theme.js';
import { plank, tile, card } from './Card.js';
import { button } from './Button.js';
import { enter } from './motion.js';

/** One colour per syllable chunk, cycling; used on the flash card letters and the chunk chips alike. */
export const CHUNK_COLOURS = [0x3d8bff, 0xff6fae, 0x2ec46a, 0xff8f3f, 0x8b5cf6, 0xffc531];

const ROWS = ['qwertyuiop', 'asdfghjkl', "zxcvbnm'-"];
const WIDE = 1.3;   // shift and backspace keys, in letter-key widths

/** Tile looks: fill and ink colours by state. */
const LOOKS = {
  shown: [THEME.surface, THEME.ink], typed: [THEME.subjects.words.soft, THEME.ink], blank: [THEME.sunken, THEME.ink3],
  ok: [THEME.success, THEME.onAccent], bad: [THEME.danger, THEME.onAccent], missing: [THEME.dangerSoft, THEME.danger],
  case: [THEME.warning, THEME.ink]   // the right letter in the wrong case
};

/**
 * A centred row of letter tiles, each letter in its own case (a capital stays a capital). letters:
 * [{ ch, look, colour?, tricky? }] where look is a key of LOOKS; `colour` (a chunk colour) tints a shown letter's ink;
 * `tricky` rings the tile in amber (the part of the word to watch).
 * Returns the tiles.
 */
export function letterRow(scene, { cx, cy, letters, size, gap }) {
  const x0 = cx - ((size + gap) * letters.length - gap) / 2 + size / 2;
  return letters.map((l, i) => {
    const [fill, ink] = LOOKS[l.look] || LOOKS.shown;
    return tile(scene, x0 + i * (size + gap), cy, size, String(l.ch || ''), {
      color: fill, textColor: l.colour ?? ink, empty: l.look === 'blank', fontSize: size * 0.58, stroke: l.tricky ? THEME.warning : l.look === 'shown' ? THEME.line : null, strokeWidth: l.tricky ? Math.max(3, size * 0.09) : undefined, shadow: 'sm'
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
 * Three rows of letter keys plus shift, backspace and a Check button, laid out inside `rect`. The keys show
 * the case they type: lowercase, or capitals while shift (⇧) is on. opts: { onKey(ch), onCheck(), onShift(),
 * shift, ready, ui, checkLabel }. Without onShift there is no shift key. Returns { keys, check }.
 */
export function letterKeyboard(scene, rect, { onKey, onCheck, onShift = null, shift = false, ready = true, ui = 1, checkLabel = 'Check ✓' }) {
  const gap = 5 * ui;
  const lastRow = ROWS[ROWS.length - 1], lastUnits = lastRow.length + WIDE + (onShift ? WIDE : 0), lastGaps = lastRow.length + (onShift ? 1 : 0);
  const keyW = Math.min(40 * ui, (rect.w - gap * 9) / 10, (rect.w - gap * lastGaps) / lastUnits), keyH = Math.min(46 * ui, (rect.h - 70 * ui - gap * 2) / 3);
  const top = rect.y + 6 * ui;
  const keys = [];
  ROWS.forEach((row, ri) => {
    const y = top + ri * (keyH + gap) + keyH / 2;
    const last = ri === ROWS.length - 1, wideW = keyW * WIDE;
    const rowW = row.length * keyW + (row.length - 1) * gap + (last ? gap + wideW + (onShift ? gap + wideW : 0) : 0);
    let x = rect.x + (rect.w - rowW) / 2;
    if (last && onShift) {
      keys.push(plank(scene, x + wideW / 2, y, wideW, keyH, '⇧', { color: shift ? THEME.subjects.words.accent : THEME.sunken, textColor: shift ? THEME.onAccent : THEME.ink, fontSize: keyW * 0.5, onTap: onShift, shadow: 'sm' }));
      x += wideW + gap;
    }
    [...row].forEach((ch) => {
      const typed = shift ? ch.toUpperCase() : ch;
      keys.push(plank(scene, x + keyW / 2, y, keyW, keyH, typed, { fontSize: keyW * 0.5, onTap: () => onKey(typed), shadow: 'sm' }));
      x += keyW + gap;
    });
    if (last) keys.push(plank(scene, x + wideW / 2, y, wideW, keyH, '⌫', { color: THEME.sunken, fontSize: keyW * 0.5, onTap: () => onKey('⌫'), shadow: 'sm' }));
  });
  enter(scene, keys, { from: 'up', delay: 60, stagger: 8 });
  const by = top + 3 * (keyH + gap) + 30 * ui;
  const check = button(scene, rect.x + rect.w / 2, by, Math.min(rect.w - 40, 240 * ui), 48 * ui, checkLabel, { variant: 'primary', disabled: !ready, onClick: onCheck });
  return { keys, check };
}

/** A word's picture: its emoji on a soft rounded tile, `size` px square. Returns the container (it can pulse). */
export function wordPicture(scene, x, y, size, pic, opts = {}) {
  const c = card(scene, x, y, size, size, { color: opts.color ?? THEME.warningSoft, stroke: opts.stroke ?? null, shadow: 'none', radius: size * 0.24 });
  c.add(scene.add.text(0, size * 0.03, pic, { fontSize: Math.round(size * 0.56) + 'px' }).setOrigin(0.5));
  return c;
}

/**
 * A bee that flies from (x, y) to (tx, ty) in a little arc and vanishes, calling onArrive() as it lands: the
 * honey being carried to the pot after a right answer. Returns the bee (null without a display list).
 */
export function beeFly(scene, x, y, tx, ty, onArrive = null, ui = 1) {
  if (!scene.add || !scene.tweens) { if (onArrive) onArrive(); return null; }
  const bee = scene.add.text(x, y, '🐝', { fontSize: Math.round(26 * ui) + 'px' }).setOrigin(0.5).setDepth(900);
  const dur = 700;
  scene.tweens.add({ targets: bee, x: tx, duration: dur, ease: 'Sine.InOut' });
  scene.tweens.add({
    targets: bee, y: Math.min(y, ty) - 36 * ui, duration: dur / 2, ease: 'Sine.Out',
    onComplete: () => scene.tweens.add({
      targets: bee, y: ty, duration: dur / 2, ease: 'Sine.In',
      onComplete: () => { if (onArrive) onArrive(); scene.tweens.add({ targets: bee, alpha: 0, scaleX: 0.5, scaleY: 0.5, duration: 160, onComplete: () => { if (bee.active !== false) bee.destroy(); } }); }
    })
  });
  return bee;
}

/** Maps a typed key event to a keyboard action, or null. Letters keep their case (a real keyboard has shift). */
export function keyFromEvent(e) {
  const key = String(e.key || '');
  if (key === 'Backspace') return '⌫';
  if (key === 'Enter') return 'Enter';
  if (/^[a-zA-Z'-]$/.test(key)) return key;
  return null;
}
