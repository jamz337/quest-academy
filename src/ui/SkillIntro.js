// The interactive "New skill" page, dressed by each game. Two phases, all progress in a plain object so a rebuild
// (rotation, resize) comes back to the same moment:
//   watch: a solved example, its working revealed one step per tap ("Next step ▶"), then "Your turn ▶";
//   try:   a fresh question of the same skill to answer. A wrong pick is marked and the child tries again (after
//          two misses the answer is shown); once it is answered, "Got it!" starts the game.
// "Skip" is always there for a child who already knows it. The look comes from a theme:
//   { backdrop(scene, area, f) -> content rect, card(scene, rect, f) -> inner rect,
//     title, ink, soft (colours), button: { color, textColor },
//     drawProblem?(scene, rect, text, { solved, f }) (default: big text),
//     choice?(scene, x, y, w, h, label, { state, onTap, seed, f }) (default: a Button) }
import { THEME, hex } from './theme.js';
import { FONT, WEIGHT, T, text } from './TextStyles.js';
import { button, speakButton } from './Button.js';
import { readable } from './ReadableText.js';
import { enter, shake } from './motion.js';
import { grid } from '../systems/Layout.js';
import { Sfx } from '../systems/Audio.js';
import { skillLabel } from '../data/skills.js';
import { answerLine, spokenAnswer } from './AnswerSpeech.js';

export const INTRO_LABELS = { next: 'Next step ▶', turn: 'Your turn ▶', done: 'Got it!', skip: 'Skip' };
const MAX_MISSES = 2;

/**
 * The page's state for a skill. `example`: { problem (the solved example, as shown), steps: [..],
 * practice?: { prompt, choices, answer, solved? (how the prompt reads once answered) } }.
 */
export function introState(skill, example) {
  const steps = (example.steps || []).filter(Boolean);
  return {
    skill, problem: example.problem || '', steps: steps.length ? steps : ['Watch how it is done.'],
    practice: example.practice && example.practice.choices && example.practice.choices.length ? { ...example.practice, choices: example.practice.choices.map(String), answer: String(example.practice.answer) } : null,
    phase: 'watch', shown: 1, read: 0, picks: [], solved: false, lastPick: null
  };
}

/** Pure steps of the flow (the scene rebuilds after each). */
export function revealStep(it) { if (it.phase === 'watch' && it.shown < it.steps.length) it.shown += 1; return it; }
export function startTry(it) { if (it.phase === 'watch') { it.shown = it.steps.length; it.phase = it.practice ? 'try' : 'ready'; } return it; }
export function pickAnswer(it, i) {
  const p = it.practice;
  if (!p || it.phase !== 'try' || it.solved || it.picks.includes(i)) return it;
  it.picks.push(i); it.lastPick = i;
  // Right: done. Wrong twice: the answer is shown so the child is never stuck.
  if (p.choices[i] === p.answer || it.picks.length >= MAX_MISSES) it.solved = true;
  return it;
}
export const gotItRight = (it) => !!it.practice && it.picks.some((k) => it.practice.choices[k] === it.practice.answer);
/**
 * The tip beside the practice question: the first step that states a rule (no numbers of its own), or else the
 * finished example to look back at, so a tip never quotes numbers that are not in the question.
 */
export function tipFor(it) {
  const rule = it.steps.find((st) => !/\d/.test(st) && !/\?/.test(st) && !/here it is|the answer is/i.test(st));
  return rule ? `Tip: ${rule}` : `Remember: ${String(it.problem).replace(/\[|\]/g, '')}`;
}
export const canFinish = (it) => it.phase === 'ready' || (it.phase === 'try' && it.solved);

const defaultProblem = (scene, r, str, { solved, f, theme }) => {
  const style = { fontFamily: FONT, fontSize: Math.round(Math.min(34 * f, r.h * 0.5)) + 'px', color: hex(solved ? THEME.successDark : theme.ink), fontStyle: WEIGHT.heavy, align: 'center', wordWrap: { width: r.w - 16 } };
  return readable(scene, r.x + r.w / 2, r.y + r.h / 2, str, style, { width: r.w - 16 });
};

const defaultChoice = (scene, x, y, w, h, label, { state, onTap, f }) => {
  const variant = state === 'right' ? 'success' : state === 'wrong' ? 'danger' : 'secondary';
  const b = button(scene, x, y, w, h, label, { variant, fontSize: label.length > 10 ? 18 : 26, wrap: true, disabled: !onTap && state === 'idle', onClick: onTap || (() => {}) });
  if (state === 'dim') b.setAlpha(0.4);
  return b;
};

/**
 * Draw the page into `area`. `on.change()` rebuilds after the state moved on, `on.done()` starts the game.
 * Returns the objects it made (for tests).
 */
export function skillIntro(scene, area, it, theme, on) {
  const ui = scene.ui;
  const f = ui * Math.min(1, Math.max(0.72, area.h / (620 * ui)));
  const content = theme.backdrop ? theme.backdrop(scene, area, f) : area;
  const R = theme.card(scene, content, f);
  const cx = R.x + R.w / 2;
  const trying = it.phase === 'try', p = it.practice;
  const drawProblem = theme.drawProblem || defaultProblem;
  const makeChoice = theme.choice || defaultChoice;

  // Title and the speaker (reads what is on the page right now).
  let y = R.y + 4 * f;
  const title = text(scene, cx, y + 16 * f, `New skill: ${skillLabel(it.skill)}`, { ...T.heading(scene, theme.title), fontSize: Math.round(22 * f) + 'px' });
  if (title.width > R.w - 110 * f) title.setFontSize(Math.round(17 * f));
  y += 36 * f;
  const sub = trying ? (it.solved ? (gotItRight(it) ? 'Yes! You have got it.' : `The answer is ${p.answer}. You will get the next one!`) : it.picks.length ? 'Not quite. Look at the tip and try again!' : 'Your turn! Tap the answer.')
    : it.phase === 'ready' ? 'Ready to play!' : `Watch how this one is done  ·  step ${it.shown} of ${it.steps.length}`;
  text(scene, cx, y + 8 * f, sub, { ...T.small(scene, trying && it.picks.length && !it.solved ? THEME.danger : trying && it.solved && gotItRight(it) ? THEME.successDark : theme.ink2 || THEME.ink2), fontSize: Math.round(14 * f) + 'px', wordWrap: { width: R.w - 20 } });
  y += 26 * f;

  // The problem: the solved example while watching, the practice question (answered once solved) while trying.
  const footH = 56 * f;
  const problemH = Math.min(theme.problemH ? theme.problemH * f : 76 * f, (R.y + R.h - y - footH) * 0.36);
  const problemStr = trying ? (it.solved && p.solved ? p.solved : p.prompt) : it.problem;
  const problem = problemStr ? drawProblem(scene, { x: R.x, y, w: R.w, h: problemH }, problemStr, { solved: trying ? it.solved : true, f, theme, it }) : null;
  y += problemH + 8 * f;

  const made = [];
  const bodyBottom = R.y + R.h - footH - 6 * f;
  let reader = null;
  if (!trying) {
    // The working, one numbered step per line; the newest slides in.
    const lines = it.steps.slice(0, it.shown);
    let size = 17;
    let blocks = [];
    for (; size >= 12; size -= 1) {
      blocks.forEach((b) => b.destroy());
      blocks = []; let yy = y;
      for (let i = 0; i < lines.length; i++) {
        const b = readable(scene, R.x + 12 * f, yy, `${i + 1}.  ${lines[i]}`, T.at(scene, size, theme.ink, { fontStyle: '600' }), { width: R.w - 24 * f, align: 'left', lineGap: 6 }).setOrigin(0, 0);
        blocks.push(b); yy += (b.height || size * 1.4 * f) + 8 * f;
      }
      if (yy <= bodyBottom) break;
    }
    const newest = blocks[blocks.length - 1];
    if (newest && it.shown > 1 && scene.tweens) { newest.setAlpha(0); newest.x += 12 * f; scene.tweens.add({ targets: newest, alpha: 1, x: newest.x - 12 * f, duration: 280, ease: 'Cubic.Out' }); }
    made.push(...blocks);
    reader = newest;
    // Read each new step aloud in automatic mode.
    if (scene.autoReads && it.read < it.shown && newest) { it.read = it.shown; scene.time.delayedCall(300, () => { if (newest.active) newest.read({ rate: scene.speechRate }); }); }
  } else {
    // A tip from the working, then the answers.
    const tip = readable(scene, cx, y, tipFor(it), T.at(scene, 14, theme.ink2 || THEME.ink2, { fontStyle: '600' }), { width: R.w - 24 * f, align: 'center' }).setOrigin(0.5, 0);
    y += (tip.height || 20 * f) + 10 * f;
    const n = p.choices.length, cols = n === 4 ? 2 : scene.portrait ? 1 : n, rows = Math.ceil(n / cols), gap = 10 * f;
    const ch = Math.max(46 * f, Math.min(74 * f, (bodyBottom - y - gap * (rows - 1)) / rows));
    const bw = Math.min(R.w - 16 * f, cols === 1 ? 420 * f : R.w);
    const cells = grid({ x: cx - bw / 2, y, w: bw, h: ch * rows + gap * (rows - 1) }, cols, rows, gap);
    p.choices.forEach((c, i) => {
      const isAnswer = c === p.answer, picked = it.picks.includes(i);
      const state = it.solved ? (isAnswer ? 'right' : picked ? 'wrong' : 'dim') : picked ? 'wrong' : 'idle';
      const tap = it.solved || picked ? null : () => { pickAnswer(it, i); if (p.choices[i] === p.answer) Sfx.correct(); else Sfx.wrong(); on.change(); };
      const k = makeChoice(scene, cells[i].x, cells[i].y, cells[i].w, ch, c, { state, onTap: tap, seed: i, f });
      if (scene.answerSpeaker) scene.answerSpeaker(k, cells[i].w, ch, c);
      if (picked && i === it.lastPick && !isAnswer && !it.solved) shake(scene, k, 5);
      made.push(k);
    });
    made.push(tip);
    // The speaker reads the question and then the answers.
    reader = () => `${String(problemStr).replace(/[|]/g, '')}. ${it.solved ? `The answer is ${spokenAnswer(p.answer)}.` : answerLine(p.choices)}`;
  }
  if (reader) speakButton(scene, R.x + R.w - 24 * f, R.y + 20 * f, 38 * f, reader, { rate: scene.speechRate });

  // Footer: Skip on the left, the next move on the right.
  const fy = R.y + R.h - footH / 2 - 2 * f;
  const bw = Math.min(220 * f, R.w * 0.52);
  const action = canFinish(it) ? INTRO_LABELS.done : trying ? null : it.shown < it.steps.length ? INTRO_LABELS.next : it.practice ? INTRO_LABELS.turn : INTRO_LABELS.done;
  if (action) {
    const onClick = () => {
      Sfx.click();
      if (action === INTRO_LABELS.next) { revealStep(it); on.change(); }
      else if (action === INTRO_LABELS.turn) { startTry(it); on.change(); }
      else on.done();
    };
    const b = button(scene, R.x + R.w - bw / 2 - 6 * f, fy, bw, 46 * f, action, { ...(theme.button ? { color: theme.button.color, textColor: theme.button.textColor } : { variant: 'primary' }), fontSize: 18 * (f / ui), onClick });
    if (action === INTRO_LABELS.done && it.solved) enter(scene, b, { from: 'pop' });
  }
  if (!canFinish(it)) button(scene, R.x + 44 * f, fy, 76 * f, 38 * f, INTRO_LABELS.skip, { variant: 'ghost', fontSize: 14 * (f / ui), onClick: () => { Sfx.click(); on.done(); } });
  return made;
}
