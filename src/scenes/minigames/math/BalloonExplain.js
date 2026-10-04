import { THEME, hex } from '../../../ui/theme.js';
import { FONT, WEIGHT } from '../../../ui/TextStyles.js';
import { button, speakButton } from '../../../ui/Button.js';
import { enter } from '../../../ui/motion.js';
import { Sfx } from '../../../systems/Audio.js';
import { speak } from '../../../systems/Speech.js';
import { drawSky, cloudCard, makeBalloon, balloonDog, EQ_NUMS, EQ_OP, EQ_EQUALS, EQ_ANSWER } from './BalloonIntro.js';

// After a wrong answer in Balloon Pop: the working on a cloud card, one step at a time. "Let's solve: 89 − 17",
// then each step with a numbered balloon, then "So: 89 − 17 = 72" in big candy numbers and a ✓ check.

const BULLETS = [0xff4d5e, 0xff9f1c, 0x9b5cf6, 0x2ec46a, 0x3d8bff];
// A sum inside a sentence: "89 − 10 = 79." or "89 − 17" (numbers may be negative, bracketed or decimal).
const NUM = '\\(?-?\\d[\\d.,]*\\)?';
const SUM = new RegExp(`${NUM}(?:\\s*[−+×÷]\\s*${NUM})+(?:\\s*=\\s*${NUM})?`, 'g');

/**
 * Split explanation steps into the working, the "So …" answer and the "Check it" line, so each can be shown its own
 * way. Anything that does not follow that pattern is simply working.
 */
export function explainParts(steps) {
  const parts = { work: [], so: null, check: null };
  for (const st of steps) {
    if (!parts.so && /^So\b/i.test(st)) parts.so = st.replace(/^So,?\s*/i, '').replace(/\.$/, '');
    else if (/^Check it:/i.test(st)) parts.check = st.replace(/^Check it:\s*/i, '');
    else parts.work.push(st);
  }
  return parts;
}

/** How many reveals the explanation has: one per working step, then the answer with its check. */
export const explainReveals = (parts) => parts.work.length + (parts.so || parts.check ? 1 : 0);

/** Everything the card says, for the read-aloud button. */
const spoken = (ex) => [`Let's solve ${ex.problem}.`, ...ex.parts.work, ex.parts.so ? `So ${ex.parts.so}.` : '', ex.parts.check ? `Check it: ${ex.parts.check}` : ''].filter(Boolean).join(' ');

/**
 * A line of text with its sums in candy colours (first number green, second orange, operators red, "=" green, the
 * result blue), wrapped at `width`, as a Container whose top-left is (0, 0). Returns { c, w, h }.
 */
function richLine(scene, str, width, size, f, { heavy = false, mathScale = 1.12 } = {}) {
  const spans = [];
  for (const m of str.matchAll(SUM)) spans.push([m.index, m.index + m[0].length]);
  const spanAt = (i) => spans.findIndex(([a, b]) => i >= a && i < b);
  const c = scene.add.container(0, 0);
  const lineH = size * mathScale * 1.3 * f, gap = size * 0.3 * f;
  let span = -1, nums = 0, afterEq = false;
  const words = [];
  for (const m of str.matchAll(/\S+/g)) {
    const tok = m[0], si = spanAt(m.index);
    if (si !== span) { span = si; nums = 0; afterEq = false; }
    let colour = THEME.ink;
    if (si >= 0) {
      if (tok === '=') { colour = EQ_EQUALS; afterEq = true; }
      else if (/^[−+×÷]$/.test(tok)) colour = EQ_OP;
      else colour = afterEq ? EQ_ANSWER : EQ_NUMS[nums++ % 2];
    }
    const t = scene.add.text(0, 0, tok, {
      fontFamily: FONT, fontSize: Math.round(size * (si >= 0 ? mathScale : 1) * f) + 'px', color: hex(colour),
      fontStyle: si >= 0 || heavy ? WEIGHT.heavy : WEIGHT.bold,
      ...(si >= 0 ? { stroke: '#ffffff', strokeThickness: Math.max(2, Math.round(3 * f)) } : {})
    }).setOrigin(0, 0.5);
    words.push({ t, si });
  }
  // Wrap between words, but keep each sum on one row so its answer never ends up alone on the next line.
  let x = 0, y = 0, maxW = 0;
  words.forEach(({ t, si }, j) => {
    const startsSum = si >= 0 && (j === 0 || words[j - 1].si !== si);
    const need = startsSum ? words.filter((w) => w.si === si).reduce((sum, w) => sum + w.t.width + gap, -gap) : t.width;
    if (x > 0 && (si < 0 || startsSum) && x + need > width) { x = 0; y += lineH; }
    t.setPosition(x, y + lineH / 2);
    c.add(t);
    x += t.width + gap;
    maxW = Math.max(maxW, x - gap);
  });
  return { c, w: maxW, h: y + lineH };
}

/** Small numbered balloon used as a list bullet. */
const bullet = (scene, x, y, n, f) => makeBalloon(scene, x, y, 16 * f, BULLETS[(n - 1) % BULLETS.length], n, f, 0);

/**
 * The explanation card. `ex` is { problem, parts } (see explainParts); `shown` is how many reveals the child has asked
 * for (at least 1). "Next step ▶" reveals the next line; once everything is out, "Got it!" moves on. Progress lives
 * in the caller's state, so a rebuild (rotation, resize) comes back to the same moment.
 */
export function balloonExplain(scene, area, ex, shown, { onReveal, onDone }) {
  const first = scene.children && scene.children.list ? scene.children.list.length : 0;
  const ui = scene.ui;
  const { parts } = ex;
  const done = shown >= explainReveals(parts);
  const workShown = parts.work.slice(0, Math.min(shown, parts.work.length));
  const showSo = shown > parts.work.length;
  const cardW = Math.min(area.w - 20, 880 * ui);
  const wide = cardW / ui >= 600;

  drawSky(scene, area, ui);

  // Build the lines first to measure them, shrinking everything until the card fits.
  let k = 1, built = null;
  const destroy = (b) => [b.head, ...b.rows, b.so, b.check].forEach((l) => l && l.c.destroy());
  for (const tryK of [1, 0.9, 0.8, 0.7, 0.62, 0.55]) {
    k = tryK;
    const f = ui * k;
    if (built) destroy(built);
    const inner = cardW - 80 * f, textW = inner - 44 * f;
    const btnW = wide ? Math.min(250 * f, cardW * 0.3) : 0;
    const head = richLine(scene, `Let's solve: ${ex.problem}`, inner, 30, f, { heavy: true, mathScale: 1.25 });
    const rows = workShown.map((st, i) => richLine(scene, `${i + 1}. ${st}`, textW, 22, f));
    // The answer line stays on one row: it shrinks rather than wrapping the answer away from its sum.
    let so = null;
    if (showSo && parts.so) {
      for (const size of [28, 24, 21, 18]) {
        if (so) so.c.destroy();
        so = richLine(scene, `${parts.work.length + 1}. So:  ${parts.so}`, textW, size, f, { heavy: true, mathScale: 1.4 });
        if (so.h <= size * 1.4 * 1.3 * f + 1) break;
      }
    }
    const check = showSo && parts.check ? richLine(scene, `Check it: ${parts.check}`, textW - (wide ? btnW + 20 * f : 0), 22, f, { heavy: true }) : null;
    const rowsH = rows.reduce((sum, r) => sum + r.h + 10 * f, 0);
    const soH = so ? so.h + 14 * f : 0;
    const bottomH = wide ? Math.max(check ? check.h : 0, 64 * f) : (check ? check.h + 14 * f : 0) + 60 * f;
    const h = 22 * f + 26 * f + 12 * f + head.h + 16 * f + rowsH + soH + bottomH + 28 * f;
    built = { f, head, rows, so, check, btnW, h };
    if (h <= area.h - 72 * ui * tryK) break;   // room for the cloud bumps above and below
  }
  const { f, head, rows, so, check, btnW, h } = built;
  const cx = area.x + area.w / 2;
  const cy = area.y + 36 * f + Math.max(0, (area.h - 72 * f - h) / 2) + h / 2;
  const top = cy - h / 2, left = cx - cardW / 2, right = cx + cardW / 2;
  const bulletX = left + 56 * f, textLeft = left + 84 * f;

  cloudCard(scene, cx, cy, cardW, h, f);
  const lift = (c) => { if (scene.children && typeof scene.children.bringToTop === 'function') scene.children.bringToTop(c); };

  let y = top + 35 * f;
  scene.add.text(cx, y, 'Watch how this one is done:', { fontFamily: FONT, fontSize: Math.round(20 * f) + 'px', color: hex(THEME.ink), fontStyle: WEIGHT.bold }).setOrigin(0.5);
  // The dog sits in the top-right corner on wide cards, so the read-aloud button moves to the left there.
  speakButton(scene, wide ? left + 40 * f : right - 40 * f, top + 40 * f, 46 * f, () => spoken(ex), { rate: scene.speechRate });
  if (wide) balloonDog(scene, right - 30 * f, top - 6 * f, f, area);
  y += 25 * f;

  head.c.setPosition(cx - head.w / 2, y); lift(head.c);
  y += head.h + 16 * f;
  rows.forEach((r, i) => {
    bullet(scene, bulletX, y + 18 * f, i + 1, f);
    r.c.setPosition(textLeft, y); lift(r.c);
    y += r.h + 10 * f;
  });
  if (so) {
    bullet(scene, bulletX, y + so.h / 2, parts.work.length + 1, f);
    so.c.setPosition(textLeft, y); lift(so.c);
    y += so.h + 14 * f;
  }

  const tick = (ty) => scene.add.text(bulletX, ty, '✓', { fontFamily: FONT, fontSize: Math.round(30 * f) + 'px', color: hex(THEME.success), fontStyle: WEIGHT.heavy, stroke: '#ffffff', strokeThickness: Math.round(4 * f) }).setOrigin(0.5);
  const label = done ? 'Got it!' : 'Next step ▶';
  const opts = { variant: 'go', onClick: () => { Sfx.click(); if (done) onDone(); else onReveal(); } };
  let action;
  if (wide) {
    const rowY = y + Math.max(check ? check.h : 0, 64 * f) / 2;
    if (check) { tick(rowY); check.c.setPosition(textLeft, rowY - check.h / 2); lift(check.c); }
    action = check
      ? button(scene, right - 36 * f - btnW / 2, rowY, btnW, 60 * f, label, { ...opts, fontSize: 24 * k })
      : button(scene, cx, rowY, Math.min(300 * f, cardW * 0.4), 60 * f, label, { ...opts, fontSize: 24 * k });
  } else {
    if (check) { tick(y + check.h / 2); check.c.setPosition(textLeft, y); lift(check.c); y += check.h + 14 * f; }
    action = button(scene, cx, y + 28 * f, Math.min(cardW - 64 * f, 300 * f), 54 * f, label, { ...opts, fontSize: 22 * k });
  }
  if (done && action && scene.tweens) scene.tweens.add({ targets: action, scale: 1.05, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

  if (scene.animateEnter) {
    const made = scene.children && scene.children.list ? scene.children.list.slice(first) : [];
    enter(scene, made, { from: 'fade', stagger: 0, duration: 240 });
  }
  // The newest line slides in, and in read-aloud mode it is spoken.
  const newest = showSo ? so?.c : rows[rows.length - 1]?.c;
  if (newest && shown > 1 && scene.tweens) {
    const x0 = newest.x;
    newest.x = x0 + 24 * f; newest.setAlpha(0);
    scene.tweens.add({ targets: newest, x: x0, alpha: 1, duration: 260, ease: 'Cubic.Out' });
  }
  if (scene.autoReads) {
    const said = showSo ? [parts.so ? `So ${parts.so}.` : '', parts.check ? `Check it: ${parts.check}` : ''].join(' ') : workShown[workShown.length - 1];
    if (said) scene.time.delayedCall(300, () => speak(shown === 1 ? `Let's solve ${ex.problem}. ${said}` : said, { rate: scene.speechRate }));
  }
}
