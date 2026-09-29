import { THEME, hex, darken, mix } from '../../../ui/theme.js';
import { FONT, WEIGHT } from '../../../ui/TextStyles.js';
import { button, speakButton } from '../../../ui/Button.js';
import { enter, shake, pulse } from '../../../ui/motion.js';
import { Sfx } from '../../../systems/Audio.js';
import { speak } from '../../../systems/Speech.js';
import { skillLabel } from '../../../data/skills.js';

const POP_COLOURS = [0x9b5cf6, 0x2ec46a, 0xff9f1c, 0xff4d5e, 0xff6fae, 0x3d8bff];
// At most this many hops, so the knots stay far enough apart for finger-sized balloons on a phone.
const MAX_HOPS = 6;
const SKY_TOP = 0x1b2f66, SKY_BOTTOM = 0x3f6cc4;
const CARD = 0xfff4e6, CARD_EDGE = 0xa8d2ff;
const ROPE = 0xb07a3f, ARC = 0x2a4f9e;
export const EQ_NUMS = [0x2ec46a, 0xff9f1c, 0x9b5cf6], EQ_OP = 0xff5c6c, EQ_EQUALS = 0x2ec46a, EQ_ANSWER = 0x3d8bff;

/**
 * Worked example for a brand-new skill, Balloon Pop style: a cream cloud card on a night-blue sky.
 * Small sums ("13 − 4", "5 + 6") are walked on a rope number line: the child taps one balloon per step and the big
 * balloon hops a knot back (take away) or on (add). Anything else shows its working steps, one hidden behind each balloon.
 * All progress lives in the plain `intro` object, so a rebuild (rotation, resize) redraws the same moment.
 */
export function introFor(q, steps) {
  const problem = String(q.prompt).replace('\n', ' ').trim();
  const base = { skill: q.skill, problem, answer: q.answer, steps: steps.length ? steps : [`The answer is ${q.answer}.`], popped: 0 };
  const m = /^(\d+)\s*([−+])\s*(\d+)$/.exec(problem);
  if (m) {
    const a = Number(m[1]), b = Number(m[3]), dir = m[2] === '+' ? 1 : -1;
    if (b >= 1 && b <= MAX_HOPS && a + dir * b >= 0) return { ...base, mode: 'line', a, b, dir };
  }
  return { ...base, mode: 'steps' };
}

/** The pops the child has to make before the example is complete. */
const popsNeeded = (it) => (it.mode === 'line' ? it.b : it.steps.length);
export const introDone = (it) => it.popped >= popsNeeded(it);

/** Step lines in kid language for the number line, filled in as balloons are tapped. */
function lineSteps(it) {
  const { a, b, dir, popped } = it, ans = a + dir * b;
  const counted = Array.from({ length: popped }, (_, i) => a + dir * (i + 1)).join(', ');
  const plural = (n) => (n === 1 ? '' : 's');
  if (dir > 0) {
    return [
      `Start with ${a} balloon${plural(a)}.`,
      `Add ${b} more: ${counted}${popped >= b ? '.' : popped ? ', …' : '…'}`,
      `Look, there ${ans === 1 ? 'is' : 'are'} ${ans} now! So ${a} + ${b} = ${ans}.`,
      `Take them away to check: ${ans} − ${b} = ${a}.`
    ];
  }
  return [
    `Start with ${a} balloon${plural(a)}.`,
    `Pop ${b} balloon${plural(b)}: ${counted}${popped >= b ? ' left.' : popped ? ', …' : '…'}`,
    `Look, ${ans} ${ans === 1 ? 'is' : 'are'} left! So ${a} − ${b} = ${ans}.`,
    `Add them back to check: ${ans} + ${b} = ${a}.`
  ];
}

/** Full text for reading aloud (always the whole example, whatever has been popped so far). */
function spokenText(it) {
  const lines = it.mode === 'line' ? lineSteps({ ...it, popped: it.b }) : it.steps;
  return `New skill: ${skillLabel(it.skill)}. ${lines.join(' ')}`;
}

/**
 * Draw the intro into `area`. `onPop` is called after each successful pop (the caller updates state and rebuilds),
 * `onReplay` resets the pops, `onDone` is the "Got it!" button.
 */
export function balloonIntro(scene, area, it, { onPop, onReplay, onDone }) {
  const first = scene.children && scene.children.list ? scene.children.list.length : 0;
  const ui = scene.ui;
  scene.introBusy = false;   // a rebuild mid-hop kills its tween, so never stay locked
  const done = introDone(it);
  const cardW = Math.min(area.w - 20, 880 * ui);
  const wide = cardW / ui >= 600;
  const line = it.mode === 'line';

  drawSky(scene, area, ui);

  // Lay the step lines out first, shrinking everything until the card fits the play area.
  const lines = line ? lineSteps(it) : it.steps;
  let k = 1, rows, layout;
  for (const tryK of [1, 0.92, 0.84, 0.76, 0.68, 0.6, 0.52]) {
    k = tryK;
    const f = ui * k;
    if (rows) rows.forEach((r) => { r.star.destroy(); r.text.destroy(); });
    const btnW = wide ? Math.min(300 * f, cardW * 0.32) : 0;
    const stepsW = cardW - 64 * f - (wide ? btnW + 32 * f : 0) - 34 * f;
    rows = lines.map((str, i) => stepRow(scene, str, i, it, f, stepsW));
    const stepsH = rows.reduce((sum, r) => sum + r.text.height, 0) + (rows.length - 1) * 8 * f;
    const stageH = (line ? 178 : 118) * f;
    const footH = wide ? Math.max(stepsH, 118 * f) : stepsH + 16 * f + 60 * f;
    const h = 20 * f + 42 * f + 30 * f + stageH + 70 * f + footH + 26 * f;
    layout = { f, btnW, stepsW, stepsH, stageH, footH, h };
    if (h <= area.h - 72 * ui * tryK) break;   // room for the cloud bumps above and below
  }
  const { f, btnW, stageH, h } = layout;
  const cx = area.x + area.w / 2;
  const cy = area.y + 36 * f + Math.max(0, (area.h - 72 * f - h) / 2) + h / 2;
  const top = cy - h / 2, left = cx - cardW / 2, right = cx + cardW / 2;

  cloudCard(scene, cx, cy, cardW, h, f);
  rows.forEach((r) => { if (scene.children && typeof scene.children.bringToTop === 'function') { scene.children.bringToTop(r.star); scene.children.bringToTop(r.text); } });

  // Title and a line that tells the child what to do next.
  let y = top + 20 * f + 21 * f;
  const title = scene.add.text(cx, y, `New skill: ${skillLabel(it.skill)}`, {
    fontFamily: FONT, fontSize: Math.round(34 * f) + 'px', color: hex(0x2f6fe0), fontStyle: WEIGHT.heavy,
    stroke: '#ffffff', strokeThickness: Math.round(6 * f), shadow: { offsetX: 0, offsetY: 3 * f, color: '#1b2f6655', blur: 0, fill: true, stroke: true }
  }).setOrigin(0.5);
  if (title.width > cardW - 130 * f) title.setScale((cardW - 130 * f) / title.width);
  y += 21 * f + 16 * f;
  const need = popsNeeded(it);
  const adding = line && it.dir > 0;
  const hint = done
    ? (line ? `You did it! That is how you ${adding ? 'add' : 'take away'}.` : 'All popped! That is how it is done.')
    : line
      ? (it.popped ? `${adding ? 'Added' : 'Popped'} ${it.popped} of ${need}. Keep going!` : adding ? 'Tap the balloons to count on:' : 'Pop the balloons to count back:')
      : (it.popped ? `Step ${it.popped} of ${need}. Pop the next balloon!` : 'Pop each balloon to see the next step:');
  scene.add.text(cx, y, hint, { fontFamily: FONT, fontSize: Math.round(20 * f) + 'px', color: hex(THEME.ink), fontStyle: WEIGHT.bold }).setOrigin(0.5);
  // The dog sits in the top-right corner on wide cards, so the read-aloud button moves to the left there.
  speakButton(scene, wide ? left + 40 * f : right - 40 * f, top + 44 * f, 46 * f, () => spokenText(it), { rate: scene.speechRate });
  if (wide) balloonDog(scene, right - 30 * f, top - 6 * f, f, area);

  // The stage: rope number line, or a row of step balloons.
  const stageTop = y + 14 * f;
  if (line) numberLine(scene, it, { left: left + 40 * f, right: right - 40 * f, top: stageTop, h: stageH }, f, onPop);
  else stepBalloons(scene, it, { left: left + 40 * f, right: right - 40 * f, top: stageTop, h: stageH }, f, onPop);

  // The sum itself, answer hidden until the last pop.
  equation(scene, it, cx, stageTop + stageH + 32 * f, cardW - 80 * f, f, done);

  // Steps, and the buttons: side by side on a wide card, stacked on a narrow one.
  const footTop = stageTop + stageH + 70 * f;
  const stepsLeft = left + 34 * f;
  let ry = footTop + (wide ? Math.max(0, (layout.footH - layout.stepsH) / 2) : 0);
  rows.forEach((r) => {
    r.star.setPosition(stepsLeft, ry + 1 * f);
    r.text.setPosition(stepsLeft + 34 * f, ry);
    ry += r.text.height + 8 * f;
  });
  let got;
  if (wide) {
    const bx = right - 32 * f - btnW / 2, by = footTop + layout.footH / 2 - (done ? 18 * f : 0);
    got = button(scene, bx, by, btnW, 68 * f, 'Got it!', { variant: 'success', fontSize: 28 * k, onClick: () => { Sfx.click(); onDone(); } });
    if (done) button(scene, bx, by + 58 * f, btnW * 0.7, 36 * f, '↺  Pop again', { variant: 'ghost', fontSize: 15 * k, onClick: () => { Sfx.click(); onReplay(); } });
  } else {
    const by = footTop + layout.stepsH + 16 * f + 30 * f;
    const inner = cardW - 64 * f;
    if (done) {
      button(scene, left + 32 * f + inner * 0.2, by, inner * 0.38, 54 * f, '↺  Again', { variant: 'secondary', fontSize: 17 * k, onClick: () => { Sfx.click(); onReplay(); } });
      got = button(scene, right - 32 * f - inner * 0.29, by, inner * 0.58, 58 * f, 'Got it!', { variant: 'success', fontSize: 24 * k, onClick: () => { Sfx.click(); onDone(); } });
    } else {
      got = button(scene, cx, by, Math.min(inner, 300 * f), 58 * f, 'Got it!', { variant: 'success', fontSize: 24 * k, onClick: () => { Sfx.click(); onDone(); } });
    }
  }
  // Once everything is popped, the button gently calls for attention.
  if (done && got && scene.tweens) {
    scene.tweens.add({ targets: got, scale: 1.05, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  if (scene.animateEnter) {
    const made = scene.children && scene.children.list ? scene.children.list.slice(first) : [];
    enter(scene, made, { from: 'fade', stagger: 0, duration: 240 });
    if (scene.autoReads) scene.time.delayedCall(350, () => speak(spokenText(it), { rate: scene.speechRate }));
  }
}

/** One step: a gold star and the sentence. Steps not reached yet are faded (or hidden, for step balloons). */
function stepRow(scene, str, i, it, f, width) {
  let shown = str, alpha = 1;
  if (it.mode === 'line') {
    const reached = introDone(it) ? 4 : it.popped ? 2 : 1;
    if (i >= reached) alpha = 0.3;
  } else if (i >= it.popped) {
    shown = `Pop balloon ${i + 1} to see this step.`; alpha = 0.35;
  }
  const star = scene.add.text(0, 0, '★', {
    fontFamily: FONT, fontSize: Math.round(24 * f) + 'px', color: hex(THEME.gold), fontStyle: WEIGHT.heavy, stroke: hex(THEME.warningDark), strokeThickness: Math.max(1, Math.round(2 * f))
  }).setOrigin(0, 0).setAlpha(alpha);
  const text = scene.add.text(0, 0, `${i + 1}. ${shown}`, {
    fontFamily: FONT, fontSize: Math.round(21 * f) + 'px', color: hex(THEME.ink), fontStyle: WEIGHT.bold, align: 'left',
    wordWrap: { width, useAdvancedWrap: true }
  }).setOrigin(0, 0).setAlpha(alpha);
  return { star, text };
}

/** Night-blue sky with soft clouds, filling the play area (rounded corners drawn strip by strip). */
export function drawSky(scene, r, ui) {
  const g = scene.add.graphics();
  const rad = 22, step = 4;
  for (let y = 0; y < r.h; y += step) {
    const d = Math.min(y, r.h - y - step);
    const inset = d < rad ? rad - Math.sqrt(Math.max(0, rad * rad - (rad - d) * (rad - d))) : 0;
    g.fillStyle(mix(SKY_TOP, SKY_BOTTOM, y / r.h), 1);
    g.fillRect(r.x + inset, r.y + y, r.w - inset * 2, Math.min(step, r.h - y));
  }
  const cloud = (x, y, s, a) => {
    g.fillStyle(0xffffff, a);
    g.fillEllipse(x, y, 120 * s, 44 * s); g.fillEllipse(x - 40 * s, y + 8 * s, 70 * s, 34 * s); g.fillEllipse(x + 44 * s, y + 10 * s, 80 * s, 36 * s);
  };
  cloud(r.x + r.w * 0.12, r.y + r.h * 0.2, ui, 0.14); cloud(r.x + r.w * 0.9, r.y + r.h * 0.3, ui * 0.9, 0.12);
  cloud(r.x + r.w * 0.08, r.y + r.h * 0.82, ui * 1.2, 0.18); cloud(r.x + r.w * 0.85, r.y + r.h * 0.88, ui * 1.3, 0.2);
  // Hot-air balloons drifting at the edges, where the card leaves room.
  const air = (x, y, s, c1, c2) => {
    g.fillStyle(c1, 0.9); g.fillEllipse(x, y, 44 * s, 52 * s);
    g.fillStyle(c2, 0.9); g.fillEllipse(x, y, 16 * s, 52 * s);
    g.lineStyle(1.5 * s, 0x2a2440, 0.6); g.lineBetween(x - 12 * s, y + 22 * s, x - 6 * s, y + 38 * s); g.lineBetween(x + 12 * s, y + 22 * s, x + 6 * s, y + 38 * s);
    g.fillStyle(0x8a5a2b, 0.95); g.fillRect(x - 7 * s, y + 37 * s, 14 * s, 10 * s);
  };
  if (r.w / ui > 900) {
    air(r.x + 50 * ui, r.y + r.h * 0.34, ui * 1.1, 0xff8a3d, 0xffd166);
    air(r.x + r.w - 46 * ui, r.y + r.h * 0.6, ui, 0xef476f, 0x7bdff2);
    air(r.x + 36 * ui, r.y + r.h * 0.7, ui * 0.8, 0x7b5cff, 0x2ec46a);
  }
  return g;
}

/** Cream card with a light-blue rim and cloud bumps along the top and bottom edges. */
export function cloudCard(scene, cx, cy, w, h, f) {
  const g = scene.add.graphics();
  const r = 34 * f, bw = 6 * f, top = cy - h / 2, bottom = cy + h / 2;
  const n = Math.max(3, Math.round(w / (130 * f)));
  const bumps = [];
  for (let i = 0; i < n; i++) {
    const x = cx - w / 2 + w * (i + 0.5) / n;
    bumps.push([x, top + 6 * f, (i % 2 ? 22 : 30) * f]);
    if (i < n - 1) bumps.push([x + w / (2 * n), bottom - 6 * f, (i % 2 ? 26 : 20) * f]);
  }
  g.fillStyle(0x0b1a40, 0.28); g.fillRoundedRect(cx - w / 2 - bw + 3 * f, top - bw + 10 * f, w + bw * 2, h + bw * 2, r + bw);
  g.fillStyle(CARD_EDGE, 1);
  bumps.forEach(([x, y, br]) => g.fillCircle(x, y, br + bw));
  g.fillRoundedRect(cx - w / 2 - bw, top - bw, w + bw * 2, h + bw * 2, r + bw);
  g.fillStyle(CARD, 1);
  bumps.forEach(([x, y, br]) => g.fillCircle(x, y, br));
  g.fillRoundedRect(cx - w / 2, top, w, h, r);
  return g;
}

/** A shaded party balloon with a number on it, as a Container centred on the balloon's middle. */
export function makeBalloon(scene, x, y, rx, colour, label, f, stringLen = 30) {
  const ry = rx * 1.18;
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  if (stringLen) {
    g.lineStyle(Math.max(1, 2 * f), 0x6b6788, 0.7);
    g.beginPath(); g.moveTo(0, ry + 6 * f); g.lineTo(3 * f, ry + stringLen * 0.5 * f); g.lineTo(-1 * f, ry + stringLen * f); g.strokePath();
  }
  g.fillStyle(darken(colour, 0.78), 1); g.fillEllipse(0, 1.5 * f, rx * 2, ry * 2);
  g.fillStyle(colour, 1); g.fillEllipse(0, -1 * f, rx * 2 - 4 * f, ry * 2 - 5 * f);
  g.fillStyle(0xffffff, 0.4); g.fillEllipse(-rx * 0.38, -ry * 0.42, rx * 0.55, ry * 0.5);
  g.fillStyle(0xffffff, 0.85); g.fillCircle(-rx * 0.45, -ry * 0.52, Math.max(1.5, rx * 0.1));
  g.fillStyle(darken(colour, 0.82), 1); g.fillTriangle(-6 * f, ry + 7 * f, 6 * f, ry + 7 * f, 0, ry - 2 * f);
  const t = scene.add.text(0, -2 * f, String(label), {
    fontFamily: FONT, fontSize: Math.round(rx * (String(label).length > 2 ? 0.7 : 0.95)) + 'px', color: '#ffffff', fontStyle: WEIGHT.heavy,
    stroke: hex(darken(colour, 0.55)), strokeThickness: Math.max(2, Math.round(rx * 0.09))
  }).setOrigin(0.5);
  c.add([g, t]);
  c.setSize(rx * 2 + 12, ry * 2 + 12);
  c.rx = rx; c.ry = ry; c.numText = t;
  return c;
}

/** Burst a balloon into confetti of its own colour. */
function burst(scene, c, colour, f) {
  Sfx.pop();
  if (scene.add.particles && scene.textures.exists('px')) {
    const em = scene.add.particles(c.x, c.y, 'px', {
      speed: { min: 80, max: 240 }, angle: { min: 0, max: 360 }, scale: { start: 5 * f, end: 0 }, alpha: { start: 1, end: 0 },
      lifespan: 550, gravityY: 280, tint: [colour, 0xffffff], emitting: false
    }).setDepth(20);
    em.explode(20, 0, 0);
    scene.time.delayedCall(800, () => { if (em.active) em.destroy(); });
  }
  c.destroy();
}

/** Gentle bob so the balloons feel alive. */
function bob(scene, c, i, f) {
  if (!scene.tweens) return;
  scene.tweens.add({ targets: c, y: c.y - 5 * f, duration: 1100 + i * 90, yoyo: true, repeat: -1, ease: 'Sine.InOut', delay: i * 70 });
}

/** A wrong-order tap: the balloon wiggles and the one to pop next pulses. */
function nudge(scene, tapped, next) {
  Sfx.click();
  shake(scene, tapped, 6);
  if (next && next.active) pulse(scene, next, 1.15);
}

/**
 * Rope number line one knot either side of the sum. The big balloon sits on the current knot; one small balloon
 * floats above each knot it still has to hop to. Tapping the next one pops it (take away) or flies it onto the big
 * balloon (add), and the big balloon hops a knot.
 */
function numberLine(scene, it, r, f, onPop) {
  const { a, b, dir } = it;
  const lo = Math.max(0, Math.min(a, a + dir * b) - 1), hi = Math.max(a, a + dir * b) + 1;
  const n = hi - lo;
  const spacing = (r.right - r.left) / Math.max(1, n);
  const xOf = (v) => r.left + (v - lo) * spacing;
  const ropeY = r.top + r.h - 46 * f;
  const sag = 8 * f;
  const yOf = (x) => ropeY + sag * Math.sin(Math.PI * (x - r.left) / (r.right - r.left));
  const cur = a + dir * it.popped;

  const g = scene.add.graphics();
  // Hops already made: blue arcs with arrowheads, from a back to the current knot.
  for (let i = 0; i < it.popped; i++) {
    const x0 = xOf(a + dir * i), x1 = xOf(a + dir * (i + 1));
    const pts = [];
    for (let s = 0; s <= 14; s++) {
      const t = s / 14;
      const x = x0 + (x1 - x0) * t;
      pts.push({ x, y: yOf(x) - 14 * f - Math.sin(Math.PI * t) * 26 * f });
    }
    g.lineStyle(Math.max(2, 4 * f), ARC, 1); g.strokePoints(pts);
    const end = pts[pts.length - 1];
    g.fillStyle(ARC, 1); g.fillTriangle(end.x - 2 * f, end.y + 9 * f, end.x - 9 * f, end.y - 5 * f, end.x + 6 * f, end.y - 4 * f);
  }
  // The rope, with a tied loop at the left end.
  const rope = [];
  for (let s = 0; s <= 40; s++) { const x = r.left - 14 * f + (r.right - r.left + 28 * f) * s / 40; rope.push({ x, y: yOf(Math.max(r.left, Math.min(r.right, x))) }); }
  g.lineStyle(Math.max(3, 7 * f), ROPE, 1); g.strokePoints(rope);
  g.lineStyle(Math.max(1, 2 * f), 0xe8bf8a, 1); g.strokePoints(rope.map((p) => ({ x: p.x, y: p.y - 1.5 * f })));
  g.lineStyle(Math.max(2, 4 * f), ROPE, 1); g.strokeCircle(r.left - 22 * f, ropeY - 6 * f, 7 * f);
  // Knots and numbers.
  for (let v = lo; v <= hi; v++) {
    const x = xOf(v), y = yOf(x);
    const kc = v === cur ? ARC : [0xff9f1c, 0x3d8bff, 0xff4d5e][v % 3];
    g.fillStyle(kc, 1); g.fillTriangle(x - 7 * f, y + 5 * f, x + 7 * f, y + 5 * f, x, y - 7 * f); g.fillCircle(x, y + 5 * f, 5 * f);
    const here = v === cur;
    scene.add.text(x, y + 30 * f, String(v), {
      fontFamily: FONT, fontSize: Math.round((here ? 30 : 25) * f) + 'px', color: hex(here ? ARC : THEME.ink), fontStyle: WEIGHT.heavy
    }).setOrigin(0.5);
  }

  // The big balloon on the current knot.
  const bigRx = Math.min(44 * f, spacing * 0.6);
  const big = makeBalloon(scene, xOf(cur), yOf(xOf(cur)) - bigRx * 1.18 - 16 * f, bigRx, 0x2f8cff, cur, f, 14);

  // One small balloon above each knot still to visit, labelled with the number you land on. They float level with
  // the big one's top half (it only ever sits on knots they have left), so the stage stays short.
  const popRx = Math.min(28 * f, spacing * 0.42);
  const popY = Math.max(r.top + popRx * 1.18 + 6 * f, big.y - bigRx * 0.6);
  const smalls = [];
  for (let i = it.popped; i < b; i++) {
    const v = a + dir * (i + 1);
    const c = makeBalloon(scene, xOf(v), popY + (i % 2) * 6 * f, popRx, POP_COLOURS[i % POP_COLOURS.length], v, f, 22);
    smalls.push({ c, i, v });
  }
  smalls.forEach(({ c, i, v }, j) => {
    bob(scene, c, j, f);
    c.setInteractive({ useHandCursor: true });
    c.on('pointerdown', () => {
      if (scene.introBusy) return;
      if (i !== it.popped) return nudge(scene, c, smalls[0] && smalls[0].c);
      scene.introBusy = true;
      const x1 = xOf(v), y1 = yOf(x1) - bigRx * 1.18 - 16 * f, x0 = big.x, y0 = big.y;
      const hopOn = () => {
        const hop = { t: 0 };
        scene.tweens.add({
          targets: hop, t: 1, duration: 380, ease: 'Sine.InOut',
          onUpdate: () => { big.x = x0 + (x1 - x0) * hop.t; big.y = y0 + (y1 - y0) * hop.t - Math.sin(Math.PI * hop.t) * 28 * f; },
          onComplete: () => { big.numText.setText(String(v)); scene.introBusy = false; onPop(); }
        });
      };
      if (dir < 0) { burst(scene, c, POP_COLOURS[i % POP_COLOURS.length], f); hopOn(); return; }
      // Adding: the balloon floats down and joins the big one, which then hops on.
      Sfx.click();
      scene.tweens.killTweensOf(c);
      scene.tweens.add({ targets: c, x: big.x, y: big.y, scale: 0.2, alpha: 0, duration: 260, ease: 'Quad.In', onComplete: () => { c.destroy(); Sfx.pop(); hopOn(); } });
    });
  });
}

/** A row of numbered balloons; each pop uncovers the next working step. */
function stepBalloons(scene, it, r, f, onPop) {
  const n = it.steps.length;
  const spacing = (r.right - r.left) / n;
  const rx = Math.min(32 * f, spacing * 0.38);
  const y = r.top + r.h / 2 - 8 * f;
  const list = [];
  for (let i = it.popped; i < n; i++) {
    const c = makeBalloon(scene, r.left + spacing * (i + 0.5), y + (i % 2) * 6 * f, rx, POP_COLOURS[i % POP_COLOURS.length], i + 1, f, 26);
    list.push({ c, i });
  }
  if (!list.length) {
    scene.add.text((r.left + r.right) / 2, y, 'Pop! Pop! Pop!', { fontFamily: FONT, fontSize: Math.round(30 * f) + 'px', color: hex(0xff4d5e), fontStyle: WEIGHT.heavy, stroke: '#ffffff', strokeThickness: Math.round(5 * f) }).setOrigin(0.5);
  }
  list.forEach(({ c, i }, j) => {
    bob(scene, c, j, f);
    c.setInteractive({ useHandCursor: true });
    c.on('pointerdown', () => {
      if (scene.introBusy) return;
      if (i !== it.popped) return nudge(scene, c, list[0] && list[0].c);
      scene.introBusy = true;
      burst(scene, c, POP_COLOURS[i % POP_COLOURS.length], f);
      // Rebuild just after the tap, not inside it, so the pop shows and the next tap is not swallowed.
      scene.time.delayedCall(140, () => { scene.introBusy = false; onPop(); });
    });
  });
}

/** "13 − 4 = 9" in chunky candy colours, with "?" for the answer until the example is finished. */
function equation(scene, it, cx, y, maxW, f, done) {
  const parts = [...it.problem.split(/\s+/), '=', done ? String(it.answer) : '?'];
  let nums = 0;
  const colourOf = (p, i) => {
    if (i === parts.length - 1) return EQ_ANSWER;
    if (p === '=') return EQ_EQUALS;
    if (/^[−+×÷]$/.test(p)) return EQ_OP;
    return EQ_NUMS[nums++ % EQ_NUMS.length];
  };
  const texts = parts.map((p, i) => scene.add.text(0, y, p, {
    fontFamily: FONT, fontSize: Math.round(50 * f) + 'px', color: hex(colourOf(p, i)),
    fontStyle: WEIGHT.heavy, stroke: '#ffffff', strokeThickness: Math.round(5 * f),
    shadow: { offsetX: 0, offsetY: 4 * f, color: '#00000030', blur: 0, fill: true, stroke: true }
  }).setOrigin(0.5));
  const gap = 14 * f;
  let total = texts.reduce((s, t) => s + t.width, 0) + gap * (texts.length - 1);
  const sc = total > maxW ? maxW / total : 1;
  total *= sc;
  let x = cx - total / 2;
  texts.forEach((t) => { t.setScale(sc); t.setPosition(x + (t.width * sc) / 2, y); x += t.width * sc + gap * sc; });
}

/** The balloon-animal dog peeking over the top-right corner of the card. */
export function balloonDog(scene, x, y, f, area) {
  const s = 0.72 * f;
  if (y - 136 * s < area.y) y = area.y + 136 * s;   // ear tips stay below the header
  const g = scene.add.graphics();
  const col = 0xffa62b, rim = 0xd9780f;
  const parts = [
    [30, 34, 20, 50], [-26, 36, 20, 50], [0, 6, 100, 36], [52, -18, 18, 48],
    [-44, -24, 26, 56], [-48, -66, 58, 44], [-84, -60, 42, 26], [-40, -104, 22, 50], [-60, -108, 20, 46]
  ];
  parts.forEach(([px, py, w, h]) => { g.fillStyle(rim, 1); g.fillEllipse(px * s, py * s, (w + 5) * s, (h + 5) * s); });
  parts.forEach(([px, py, w, h]) => {
    g.fillStyle(col, 1); g.fillEllipse(px * s, py * s, w * s, h * s);
    g.fillStyle(0xffffff, 0.35); g.fillEllipse((px - w * 0.18) * s, (py - h * 0.22) * s, w * 0.35 * s, h * 0.3 * s);
  });
  g.fillStyle(0xffffff, 1); g.fillCircle(-60 * s, -72 * s, 11 * s); g.fillCircle(-38 * s, -74 * s, 11 * s);
  g.fillStyle(0x2d2a4a, 1); g.fillCircle(-62 * s, -71 * s, 5.5 * s); g.fillCircle(-40 * s, -73 * s, 5.5 * s);
  g.fillStyle(0xd9480f, 1); g.fillCircle(-104 * s, -62 * s, 6 * s);
  g.lineStyle(Math.max(1.5, 3 * s), 0x8a3b12, 1); g.beginPath(); g.arc(-74 * s, -54 * s, 10 * s, 0.2, Math.PI - 0.6); g.strokePath();
  g.setPosition(x - 10 * s, y);
  if (scene.tweens) scene.tweens.add({ targets: g, y: y - 6 * f, angle: -3, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  return g;
}
