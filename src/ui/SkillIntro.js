// The interactive "New skill" page, dressed by each game. Two phases, all progress in a plain object so a rebuild
// (rotation, resize) comes back to the same moment:
//   watch: a solved example, its working revealed one step per tap ("Next step ▶"), then "Your turn ▶";
//   try:   a fresh question of the same skill to answer. A wrong pick is marked and the child tries again (after
//          two misses the answer is shown); once it is answered, "Got it!" starts the game.
// "Skip" is always there for a child who already knows it. The look comes from a theme:
//   { backdrop(scene, area, f) -> content rect, card(scene, rect, f) -> inner rect,
//     title, ink, ink2, soft (colours); its buttons are the shared green 'go' / ghost ones, the same in every game,
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
  // The example sits on a soft tinted panel, green once it is solved: the question on top and the answer on a line
  // of its own in a pill beneath it, each shrunk until it fits, so no line breaks in the middle of the arrow.
  const g = scene.add.graphics(), pw = Math.min(r.w - 12 * f, 460 * f), cx = r.x + r.w / 2;
  g.fillStyle(solved ? THEME.success : theme.ink, solved ? 0.12 : 0.07); g.fillRoundedRect(cx - pw / 2, r.y + 3 * f, pw, r.h - 6 * f, 18 * f);
  const colour = hex(solved ? THEME.successDark : theme.ink);
  const m = /^([\s\S]*?)\s+→\s+([\s\S]+)$/.exec(String(str));
  const question = m ? m[1].trim() : String(str), answer = m ? m[2].trim() : null;
  const innerW = pw - 24 * f, innerH = r.h - 14 * f;
  const fit = (words, sizes, room, width, weight) => {
    let t = null;
    for (const size of sizes) {
      if (t) t.destroy();
      t = readable(scene, cx, 0, words, { fontFamily: FONT, fontSize: Math.round(size * f) + 'px', color: colour, fontStyle: weight, align: 'center' }, { width });
      if ((t.height || 0) <= room) break;
    }
    return t;
  };
  if (!answer) { const t = fit(question, [30, 26, 22, 19, 16], innerH, innerW, WEIGHT.heavy); t.setPosition(cx, r.y + r.h / 2); return t; }
  const pill = fit(answer, [26, 22, 19], innerH * 0.5, innerW - 28 * f, WEIGHT.heavy);
  const pillH = (pill.height || 24 * f) + 10 * f, pillW = (pill.width || 60) + 28 * f;
  const q = fit(question, [24, 21, 18, 16, 14], innerH - pillH - 6 * f, innerW, WEIGHT.bold);
  const qH = q.height || 20 * f, total = qH + 6 * f + pillH, top = r.y + r.h / 2 - total / 2;
  q.setOrigin(0.5, 0).setPosition(cx, top);
  const py = top + qH + 6 * f;
  g.fillStyle(solved ? THEME.success : theme.title, solved ? 0.22 : 0.16); g.fillRoundedRect(cx - pillW / 2, py, pillW, pillH, pillH / 2);
  pill.setOrigin(0.5, 0).setPosition(cx, py + 5 * f);
  return q;
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
    : it.phase === 'ready' ? 'Ready to play!' : 'Watch how this one is done';
  text(scene, cx, y + 8 * f, sub, { ...T.small(scene, trying && it.picks.length && !it.solved ? THEME.danger : trying && it.solved && gotItRight(it) ? THEME.successDark : theme.ink2 || THEME.ink2), fontSize: Math.round(14 * f) + 'px', wordWrap: { width: R.w - 20 } });
  // A dot for every step of the working: filled as each one is shown.
  if (!trying && it.phase !== 'ready' && it.steps.length > 1) {
    const dots = scene.add.graphics(), n = it.steps.length, gapX = 14 * f, x0 = cx - ((n - 1) * gapX) / 2;
    for (let i = 0; i < n; i++) { dots.fillStyle(i < it.shown ? theme.title : theme.ink, i < it.shown ? 1 : 0.2); dots.fillCircle(x0 + i * gapX, y + 24 * f, (i === it.shown - 1 ? 4.5 : 3.5) * f); }
    y += 8 * f;
  }
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
    // Each step is a card with its number on a badge; the newest one is tinted.
    const lines = it.steps.slice(0, it.shown);
    const rows = scene.add.graphics();   // made first, so the cards sit under the words
    const padY = 7 * f, gapY = 7 * f, textX = R.x + 46 * f, textW = R.w - 60 * f;
    let size = 17;
    let blocks = [];
    for (; size >= 13; size -= 1) {
      blocks.forEach((b) => b.destroy());
      blocks = []; let yy = y + padY;
      for (let i = 0; i < lines.length; i++) {
        const b = readable(scene, textX, yy, lines[i], T.at(scene, size, theme.ink, { fontStyle: '600' }), { width: textW, align: 'left', lineGap: 4 }).setOrigin(0, 0);
        blocks.push(b); yy += (b.height || size * 1.4 * f) + padY * 2 + gapY;
      }
      if (yy - padY - gapY <= bodyBottom) break;
    }
    const light = ((theme.title >> 16) & 255) * 0.3 + ((theme.title >> 8) & 255) * 0.59 + (theme.title & 255) * 0.11 > 150;   // a pale badge takes dark numbers
    blocks.forEach((b, i) => {
      const last = i === blocks.length - 1, rh = (b.height || size * 1.4 * f) + padY * 2, ry = b.y - padY;
      rows.fillStyle(last ? theme.title : theme.ink, last ? 0.14 : 0.06); rows.fillRoundedRect(R.x + 6 * f, ry, R.w - 12 * f, rh, Math.min(14 * f, rh / 2));
      rows.fillStyle(theme.title, 1); rows.fillCircle(R.x + 26 * f, ry + rh / 2, 12 * f);
      made.push(scene.add.text(R.x + 26 * f, ry + rh / 2, String(i + 1), { fontFamily: FONT, fontSize: Math.round(14 * f) + 'px', color: light ? '#1e1b4b' : '#ffffff', fontStyle: WEIGHT.heavy }).setOrigin(0.5));
    });
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
    const b = button(scene, R.x + R.w - bw / 2 - 6 * f, fy, bw, 46 * f, action, { variant: 'go', compact: true, fontSize: 18 * (f / ui), onClick });
    if (action === INTRO_LABELS.done && it.solved) enter(scene, b, { from: 'pop' });
  }
  if (!canFinish(it)) button(scene, R.x + 44 * f, fy, 76 * f, 38 * f, INTRO_LABELS.skip, { variant: 'ghost', compact: true, ...(theme.ink2 !== undefined ? { textColor: theme.ink2 } : {}), fontSize: 15 * (f / ui), onClick: () => { Sfx.click(); on.done(); } });
  return made;
}
