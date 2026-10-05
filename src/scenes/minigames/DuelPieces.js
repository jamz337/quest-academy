// A duel's answers, shown the way the opponent's own game shows them: stepping stones for Number Dash, balloons
// for Balloon Pop, pizzas for Fraction Pizza, wooden planks for Pattern Bridge and Grammar Gate, lily pads for Frog
// Hop, rune stones for Word Builder, name tags for Word Match and parchment for the Bible games. (The coding duels
// already have their maze and program cards.) A boss uses the pieces of its land.
import { THEME, hex } from '../../ui/theme.js';
import { FONT, WEIGHT } from '../../ui/TextStyles.js';
import { Sfx } from '../../systems/Audio.js';

const BY_GAME = {
  'math-dash': 'stone', 'math-balloons': 'balloon', 'math-pizza': 'pizza', 'math-bridge': 'plank', 'math-count': 'stone',
  'eng-builder': 'rune', 'eng-grammar': 'plank', 'eng-match': 'tag', 'eng-frog': 'pad', 'eng-trace': 'rune',
  'bible-quiz': 'scroll', 'bible-verse': 'scroll', 'bible-match': 'scroll', 'bible-ark': 'scroll'
};
const BY_SUBJECT = { math: 'stone', words: 'pad', bible: 'scroll' };
const BALLOONS = [0xff5c6c, 0x4c8df6, 0xffb627, 0x2ec46a];

/** Which pieces a duel's answers are drawn as, or null for the plain buttons (coding, and anything unknown). */
export function pieceStyle(payload, q) {
  if (!q || q.code) return null;
  const gameId = payload && payload.duel ? payload.duel.gameId : null;
  let style = BY_GAME[gameId] || BY_SUBJECT[payload && payload.subject] || null;
  // Stones and balloons carry numbers; a wordy answer on one would not fit, so it goes on a plank.
  if ((style === 'stone' || style === 'balloon') && q.choices.some((c) => String(c).length > 6)) style = 'plank';
  if (style === 'pizza' && !q.choices.every((c) => fraction(c))) style = 'plank';
  return style;
}

/** "3/4" as { num, den } when it is a proper fraction a pizza can show, else null. */
export function fraction(choice) {
  const m = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(String(choice));
  if (!m) return null;
  const num = Number(m[1]), den = Number(m[2]);
  return den >= 2 && den <= 12 && num >= 0 && num <= den ? { num, den } : null;
}

const fontFor = (label, h, ui, big = 26) => Math.round(Math.min(h * 0.46, (String(label).length > 10 ? 15 : String(label).length > 6 ? 19 : big) * ui));

/**
 * One answer as a game piece, centred on (x, y) in a w x h cell. state: 'idle' | 'right' | 'wrong' | 'dim'.
 * `onTap` makes it tappable. Returns a container with `.label.text` (the answer it stands for).
 */
export function duelPiece(scene, style, x, y, w, h, label, { state = 'idle', seed = 0, onTap = null } = {}) {
  const ui = scene.ui, c = scene.add.container(x, y), g = scene.add.graphics();
  const tint = state === 'right' ? THEME.success : state === 'wrong' ? THEME.danger : null;
  let ink = THEME.ink, ty = 0, size = fontFor(label, h, ui), extra = [];
  if (style === 'stone') {
    // A stepping stone from the Number Trail: white with a blue rim.
    g.fillStyle(0x000000, 0.14); g.fillRoundedRect(-w / 2 + 3, -h / 2 + 5, w - 2, h - 2, h * 0.42);
    g.fillStyle(tint || THEME.subjects.math.dark, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h, h * 0.42);
    g.fillStyle(tint ? 0xffffff : 0xffffff, tint ? 0.25 : 1); g.fillRoundedRect(-w / 2 + 5, -h / 2 + 4, w - 10, h - 11, h * 0.36);
    ink = tint ? 0xffffff : THEME.subjects.math.dark;
  } else if (style === 'balloon') {
    const col = tint || BALLOONS[seed % BALLOONS.length], rx = Math.min(w * 0.36, h * 0.5), ry = h * 0.42;
    g.lineStyle(2, THEME.ink2, 0.5); g.lineBetween(0, ry - 2, 3 * ui, h * 0.5 + 2);
    g.fillStyle(col, 1); g.fillEllipse(0, -h * 0.06, rx * 2, ry * 2); g.fillTriangle(-4 * ui, ry - h * 0.06 - 1, 4 * ui, ry - h * 0.06 - 1, 0, ry - h * 0.06 + 6 * ui);
    g.fillStyle(0xffffff, 0.35); g.fillEllipse(-rx * 0.38, -h * 0.06 - ry * 0.4, rx * 0.4, ry * 0.5);
    ink = 0xffffff; ty = -h * 0.06;
    if (state === 'idle' && scene.tweens) scene.tweens.add({ targets: c, y: y - 4 * ui, duration: 900 + seed * 130, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  } else if (style === 'pizza') {
    // The fraction as a pizza: that many slices of it, with the fraction written beside it.
    const f = fraction(label) || { num: 1, den: 2 }, r = Math.min(h * 0.42, w * 0.26), px = -w / 2 + r + 10 * ui;
    g.fillStyle(0x000000, 0.12); g.fillRoundedRect(-w / 2 + 2, -h / 2 + 4, w, h, 14 * ui);
    g.fillStyle(tint ? (state === 'right' ? THEME.successSoft : THEME.dangerSoft) : 0xfff8ef, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h, 14 * ui);
    g.lineStyle(2.5, tint || 0xe8623f, 1); g.strokeRoundedRect(-w / 2, -h / 2, w, h, 14 * ui);
    g.fillStyle(0xd98a3a, 1); g.fillCircle(px, 0, r);
    g.fillStyle(0xffe9b0, 1); g.fillCircle(px, 0, r * 0.86);
    g.fillStyle(0xe8623f, 1);
    for (let i = 0; i < f.num; i++) { g.slice(px, 0, r * 0.86, -Math.PI / 2 + (i / f.den) * Math.PI * 2, -Math.PI / 2 + ((i + 1) / f.den) * Math.PI * 2, false); g.fillPath(); }
    g.lineStyle(1.5, 0xd98a3a, 1);
    for (let i = 0; i < f.den; i++) { const a = -Math.PI / 2 + (i / f.den) * Math.PI * 2; g.lineBetween(px, 0, px + Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86); }
    ty = 0; size = fontFor(label, h, ui, 24);
    c.textX = px + r + (w / 2 - px - r) / 2;
  } else if (style === 'plank') {
    const wood = tint || 0xf0b36b;
    g.fillStyle(0x000000, 0.14); g.fillRoundedRect(-w / 2 + 2, -h / 2 + 5, w, h - 2, 10 * ui);
    g.fillStyle(tint ? wood : 0xc9853f, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h, 10 * ui);
    g.fillStyle(wood, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h - 5, 10 * ui);
    if (!tint) { g.lineStyle(1.5, 0xc9853f, 0.55); g.lineBetween(-w / 2 + 12, -h * 0.16, w / 2 - 16, -h * 0.18); g.lineBetween(-w / 2 + 18, h * 0.14, w / 2 - 10, h * 0.12); }
    g.fillStyle(0x6e4a28, 0.8); g.fillCircle(-w / 2 + 9 * ui, 0, 2.2 * ui); g.fillCircle(w / 2 - 9 * ui, 0, 2.2 * ui);
    ink = tint ? 0xffffff : THEME.ink; ty = -2;
  } else if (style === 'pad') {
    const pw = w, ph = Math.min(h, w * 0.7);
    g.fillStyle(0x000000, 0.12); g.fillEllipse(3, 6, pw, ph);
    g.fillStyle(tint || 0x2f8a3a, 1); g.fillEllipse(0, 0, pw, ph);
    g.fillStyle(tint ? 0xffffff : 0x6fd07a, tint ? 0.2 : 1); g.fillEllipse(0, -2, pw - 8, ph - 8);
    g.fillStyle(0xffffff, 0.3); g.fillEllipse(-pw * 0.2, -ph * 0.22, pw * 0.28, ph * 0.22);
    ink = tint ? 0xffffff : THEME.ink;
  } else if (style === 'rune') {
    g.fillStyle(0x000000, 0.18); g.fillRoundedRect(-w / 2 + 2, -h / 2 + 5, w, h - 2, 12 * ui);
    g.fillStyle(tint || 0x3b4a63, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h, 12 * ui);
    g.fillStyle(tint ? 0xffffff : 0x56698a, tint ? 0.18 : 1); g.fillRoundedRect(-w / 2 + 4, -h / 2 + 3, w - 8, h - 12, 9 * ui);
    g.lineStyle(1.5, 0x8fe3ff, tint ? 0 : 0.7); g.strokeRoundedRect(-w / 2 + 7, -h / 2 + 6, w - 14, h - 18, 7 * ui);
    ink = 0xffffff; ty = -3;
  } else if (style === 'tag') {
    g.fillStyle(0x000000, 0.12); g.fillRoundedRect(-w / 2 + 2, -h / 2 + 4, w, h, 10 * ui);
    g.fillStyle(tint || 0xfff6e0, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h, 10 * ui);
    g.lineStyle(2.5, tint || THEME.subjects.words.accent, 1); g.strokeRoundedRect(-w / 2, -h / 2, w, h, 10 * ui);
    g.fillStyle(tint ? 0xffffff : THEME.subjects.words.accent, 1); g.fillCircle(-w / 2 + 12 * ui, 0, 4 * ui);
    ink = tint ? 0xffffff : THEME.ink;
  } else {
    // Parchment, for the Bible games.
    g.fillStyle(0x000000, 0.14); g.fillRoundedRect(-w / 2 + 2, -h / 2 + 4, w, h, 8 * ui);
    g.fillStyle(tint ? (state === 'right' ? THEME.successSoft : THEME.dangerSoft) : 0xf6e7c4, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h, 8 * ui);
    g.lineStyle(2.5, tint || 0xb98552, 1); g.strokeRoundedRect(-w / 2, -h / 2, w, h, 8 * ui);
    g.fillStyle(tint || 0xb98552, 1); g.fillRoundedRect(-w / 2, -h / 2, 7 * ui, h, { tl: 8 * ui, bl: 8 * ui, tr: 0, br: 0 }); g.fillRoundedRect(w / 2 - 7 * ui, -h / 2, 7 * ui, h, { tl: 0, bl: 0, tr: 8 * ui, br: 8 * ui });
    ink = THEME.ink;
  }
  const t = scene.add.text(c.textX || 0, ty, String(label), { fontFamily: FONT, fontSize: size + 'px', color: hex(ink), fontStyle: WEIGHT.heavy, align: 'center', wordWrap: { width: (c.textX ? w * 0.5 : w - 22 * ui) } }).setOrigin(0.5);
  c.add([g, t, ...extra]);
  c.setSize(w, h);
  c.label = { text: String(label) };
  if (state === 'dim') c.setAlpha(0.45);
  if (onTap) {
    c.setInteractive({ useHandCursor: true });
    c.on('pointerdown', () => { if (style === 'balloon') Sfx.pop(); if (scene.tweens) scene.tweens.add({ targets: c, scale: 0.94, duration: 70, yoyo: true }); onTap(); });
  }
  return c;
}
