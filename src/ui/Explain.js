// "Let's see why": what a child sees after a wrong answer, dressed by each game (the same themes as the New Skill
// page, see ui/SkillIntro.js). The working is revealed one step per tap ("Show me why ▶"), and the step that just
// states the answer is held back: instead the child picks the right answer themselves ("Now you pick it!"). A wrong
// pick is marked and they try again; after two misses the answer is shown. "Next ▶" moves on at any time (small
// while there is more to see, big once it is done).
// The panel redraws only itself (not the whole game), so the game's right / wrong animations do not replay on
// each tap; its progress lives in the plain object from explainState, so a rotation keeps the moment.
import { THEME, hex } from './theme.js';
import { FONT, WEIGHT, T, text } from './TextStyles.js';
import { button, speakButton } from './Button.js';
import { readable } from './ReadableText.js';
import { card } from './Card.js';
import { shake } from './motion.js';
import { grid } from '../systems/Layout.js';
import { Sfx } from '../systems/Audio.js';
import { playStory } from './StoryAnim.js';

export const EXPLAIN_LABELS = { more: 'Show me why ▶', turn: 'Your turn ▶', next: 'Next ▶' };
// Steps that just say the answer ("Here it is …", "So 10 × 2 = 20.", "… so the missing one is 12."): held back
// while the child is asked to pick it.
const ANSWER_STEP = /^(here it is|the answer (is|was)|so\b)|\bso the (missing one|answer) is\b/i;
const MAX_MISSES = 2;

/** Fresh progress for one wrong answer. `q`: { answer, choices? | options? }, `steps`: the working. */
export function explainState(key, steps, q) {
  const all = (steps || []).filter(Boolean);
  const kept = all.filter((s) => !ANSWER_STEP.test(String(s).trim()));
  const choices = (q.choices || q.options || []).map(String), answer = String(q.answer);
  const canPick = choices.length >= 2 && choices.length <= 4 && choices.includes(answer) && choices.every((c) => c.length <= 40 && !c.includes('\n'));
  return {
    key, steps: kept.length ? kept : all.length ? all : [`The answer is ${answer}.`],
    shown: 1, phase: 'steps', choices: canPick ? choices : null, answer, picks: [], solved: false, read: 0, lastPick: null
  };
}

/** One more step, or on to the child's own pick once every step is out. */
export function moreStep(it) {
  if (it.phase !== 'steps') return it;
  if (it.shown < it.steps.length) it.shown += 1;
  else it.phase = it.choices ? 'pick' : 'done';
  return it;
}
export function pickFix(it, i) {
  if (it.phase !== 'pick' || it.solved || it.picks.includes(i)) return it;
  it.picks.push(i); it.lastPick = i;
  if (it.choices[i] === it.answer || it.picks.length >= MAX_MISSES) { it.solved = true; it.phase = 'done'; }
  return it;
}
export const fixedIt = (it) => !!it.choices && it.picks.some((k) => it.choices[k] === it.answer);

/** The default look for games without a theme of their own: a white card with a warm edge. */
export const plainTheme = {
  title: THEME.ink, ink: THEME.ink, ink2: THEME.ink2,
  card(scene, r, f) {
    card(scene, r.x + r.w / 2, r.y + r.h / 2, r.w, r.h, { stroke: THEME.warning, shadow: 'lg' });
    return { x: r.x + 14 * f, y: r.y + 10 * f, w: r.w - 28 * f, h: r.h - 18 * f };
  }
};

const defaultChoice = (scene, x, y, w, h, label, { state, onTap }) => {
  const variant = state === 'right' ? 'success' : state === 'wrong' ? 'danger' : 'secondary';
  const b = button(scene, x, y, w, h, label, { variant, fontSize: label.length > 10 ? 17 : 22, wrap: true, onClick: onTap || (() => {}) });
  if (state === 'dim') b.setAlpha(0.4);
  return b;
};

/**
 * Draw the panel along the bottom of `area`. `on.next()` moves the game on. Returns { redraw }.
 */
export function explainPanel(scene, area, it, theme, on) {
  theme = theme || plainTheme;
  let made = [];
  const draw = () => {
    const start = scene.children && scene.children.list ? scene.children.list.length : 0;
    render(scene, area, it, theme, { redraw, next: on.next, solved: on.solved });
    return scene.children && scene.children.list ? scene.children.list.slice(start) : [];
  };
  function redraw() { made.forEach((o) => o && o.active !== false && o.destroy && o.destroy()); made = draw(); }
  made = draw();
  return { redraw };
}

function render(scene, area, it, theme, on) {
  const ui = scene.ui;
  const f = ui * Math.min(1, Math.max(0.75, area.h / (620 * ui)));
  const picking = it.phase === 'pick' || (it.phase === 'done' && it.choices && it.picks.length);
  const H = Math.min(area.h * (picking ? 0.52 : 0.44), (picking ? 320 : 250) * f);
  const R = theme.card(scene, { x: area.x, y: area.y + area.h - H, w: area.w, h: H }, f);
  const cx = R.x + R.w / 2;
  const makeChoice = theme.choice || defaultChoice;

  // Heading, and what to do now.
  const heading = it.phase === 'done' ? (fixedIt(it) ? 'Yes! That is it.' : it.choices ? `It is ${it.answer}. You will get the next one!` : 'Now you know!')
    : it.phase === 'pick' ? (it.picks.length ? 'Not quite. Try again!' : 'Now you pick it!') : "Let's see why";
  const colour = it.phase === 'done' && fixedIt(it) ? THEME.successDark : it.phase === 'pick' && it.picks.length ? THEME.danger : theme.title;
  text(scene, cx, R.y + 12 * f, heading, { fontFamily: FONT, fontSize: Math.round(18 * f) + 'px', color: hex(colour), fontStyle: WEIGHT.heavy, align: 'center', wordWrap: { width: R.w - 90 * f } });
  const footH = 50 * f;
  let y = R.y + 30 * f;

  // The working so far, numbered; the newest step slides in (and is read aloud in automatic mode).
  const choicesH = picking ? Math.min(58 * f, (R.h - 30 * f - footH) * 0.42) * (it.choices.length === 4 && scene.portrait ? 2 : 1) + 8 * f : 0;
  const bottom = R.y + R.h - footH - choicesH;
  const lines = it.steps.slice(0, it.shown);
  // A Bible passage brings a little moving picture of its story, on the right of the working.
  // (It may use the heading's height too: it sits to the left of the speaker button.)
  const storyTop = R.y + 6 * f, storyH = bottom - storyTop - 2 * f, storyW = it.story && storyH >= 38 * f ? Math.min(R.w * 0.34, 190 * f) : 0;
  if (storyW) playStory(scene, R.x + R.w - 42 * f - storyW / 2, storyTop + storyH / 2, storyW, storyH, it.story);
  let blocks = [];
  for (let size = 16; size >= 14; size -= 1) {
    blocks.forEach((b) => b.destroy());
    blocks = []; let yy = y;
    for (let i = 0; i < lines.length; i++) {
      const b = readable(scene, R.x + 6 * f, yy, `${i + 1}.  ${lines[i]}`, T.at(scene, size, theme.ink, { fontStyle: '600' }), { width: R.w - (storyW ? 50 * f + storyW : 60 * f), align: 'left', lineGap: 4 }).setOrigin(0, 0);
      blocks.push(b); yy += (b.height || size * 1.3 * f) + 4 * f;
    }
    if (yy <= bottom) break;
  }
  const newest = blocks[blocks.length - 1];
  if (newest && it.phase === 'steps' && it.shown > 1 && scene.tweens && it.read < it.shown) { newest.setAlpha(0); newest.x += 10 * f; scene.tweens.add({ targets: newest, alpha: 1, x: newest.x - 10 * f, duration: 260, ease: 'Cubic.Out' }); }
  if (scene.autoReads && it.read < it.shown && newest) { const n = newest; scene.time.delayedCall(250, () => { if (n.active) n.read({ rate: scene.speechRate }); }); }
  it.read = Math.max(it.read, it.shown);
  speakButton(scene, R.x + R.w - 20 * f, R.y + 14 * f, 34 * f, () => `${heading} ${lines.join(' ')}`, { rate: scene.speechRate });

  // The child's own pick.
  if (picking) {
    const n = it.choices.length, cols = n === 4 && scene.portrait ? 2 : n, rows = Math.ceil(n / cols), gap = 8 * f;
    const ch = (choicesH - 8 * f - gap * (rows - 1)) / rows;
    const bw = Math.min(R.w, cols * 240 * f);
    const cells = grid({ x: cx - bw / 2, y: bottom, w: bw, h: choicesH - 8 * f }, cols, rows, gap);
    it.choices.forEach((c, i) => {
      const isAnswer = c === it.answer, picked = it.picks.includes(i);
      const state = it.solved ? (isAnswer ? 'right' : picked ? 'wrong' : 'dim') : picked ? 'wrong' : 'idle';
      const tap = it.solved || picked ? null : () => { pickFix(it, i); if (c === it.answer) Sfx.correct(); else Sfx.wrong(); if (it.solved && on.solved) on.solved(); else on.redraw(); };
      const k = makeChoice(scene, cells[i].x, cells[i].y, cells[i].w, ch, c, { state, onTap: tap, seed: i, f });
      if (scene.answerSpeaker) scene.answerSpeaker(k, cells[i].w, ch, c);
      if (picked && i === it.lastPick && !isAnswer && !it.solved) shake(scene, k, 5);
    });
  }

  // Footer: the walkthrough button on the right, "Next ▶" to move on (big once there is nothing left to do).
  const fy = R.y + R.h - footH / 2;
  const bw = Math.min(210 * f, R.w * 0.5);
  const style = { variant: 'go' };   // the same green step-forward button in every game
  if (it.phase === 'steps') {
    const label = it.shown < it.steps.length ? EXPLAIN_LABELS.more : it.choices ? EXPLAIN_LABELS.turn : null;
    if (label) button(scene, R.x + R.w - bw / 2, fy, bw, 42 * f, label, { ...style, compact: true, fontSize: 16 * (f / ui), onClick: () => { Sfx.click(); moreStep(it); on.redraw(); } });
  }
  const done = it.phase === 'done' || (it.phase === 'steps' && it.shown >= it.steps.length && !it.choices);
  if (done) button(scene, R.x + R.w - bw / 2, fy, bw, 42 * f, EXPLAIN_LABELS.next, { ...style, compact: true, fontSize: 17 * (f / ui), onClick: () => { Sfx.click(); on.next(); } });
  else button(scene, R.x + 40 * f, fy, 84 * f, 36 * f, EXPLAIN_LABELS.next, { variant: 'ghost', compact: true, ...(theme.ink2 !== undefined ? { textColor: theme.ink2 } : {}), fontSize: 14 * (f / ui), onClick: () => { Sfx.click(); on.next(); } });   // readable on dark themes too
}
