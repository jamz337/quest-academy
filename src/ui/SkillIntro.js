// The interactive "New skill" page, dressed by each game and taught by the game's own villager. All progress lives
// in a plain object, so a rebuild (rotation, resize) comes back to the same moment. Its phases:
//   do:    a hands-on lesson for the youngest maths (tap 3 apples, tap 2 more, how many?): see data/lessons.js;
//   spot:  for Grade 3 and up, the villager's working with one step gone wrong: find it, then pick what it should say;
//   watch: otherwise, a solved example, its working revealed one step per tap ("Next step ▶");
//   try:   a fresh question of the same skill, with a ladder of three hints the child climbs only if they want one
//          (the rule, then the working started, then one wrong answer crossed out); fewer hints, more stars (on this
//          page only). A wrong pick is marked and the child tries again; after two misses the answer is shown.
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
import { speak } from '../systems/Speech.js';
import { skillLabel } from '../data/skills.js';
import { answerLine, spokenAnswer } from './AnswerSpeech.js';
import { IDLE_FRAMES } from './LpcCharacter.js';

export const INTRO_LABELS = { next: 'Next step ▶', turn: 'Your turn ▶', done: 'Got it!', skip: 'Skip' };
const MAX_MISSES = 2;
export const HINT_LABELS = ['💡 Hint 1', '💡 Hint 2', '💡 Hint 3'];

/**
 * The page's state for a skill. `example`: { problem (the solved example, as shown), steps: [..],
 * practice?: { prompt, choices, answer, solved? (how the prompt reads once answered), steps? (its own working) },
 * lesson? (a hands-on lesson, data/lessons.js) }. opts: { grade, guide: { name, sprite, voice, pitch } }.
 */
export function introState(skill, example, opts = {}) {
  const steps = (example.steps || []).filter(Boolean);
  const it = {
    skill, problem: example.problem || '', steps: steps.length ? steps : ['Watch how it is done.'],
    practice: example.practice && example.practice.choices && example.practice.choices.length ? { ...example.practice, choices: example.practice.choices.map(String), answer: String(example.practice.answer) } : null,
    phase: 'watch', shown: 1, read: 0, picks: [], solved: false, lastPick: null,
    guide: opts.guide || null, hintsUsed: 0, crossed: null, said: null
  };
  if (example.lesson) { it.lesson = { ...example.lesson, step: 0, lit: [], eaten: [], picks: [], done: false }; it.phase = 'do'; }
  else if ((opts.grade ?? 0) >= 3) {
    const m = makeMistake(it.steps);
    if (m) { it.mistake = { ...m, found: false, fixed: false, okSteps: [], badFixes: [] }; it.phase = 'spot'; }
  }
  if (it.practice) it.practice.hints = hintsFor(it);
  return it;
}

/** Pure steps of the flow (the scene rebuilds after each). */
export function revealStep(it) { if (it.phase === 'watch' && it.shown < it.steps.length) it.shown += 1; return it; }
export function startTry(it) {
  if (it.phase === 'watch' || it.phase === 'do' || it.phase === 'spot') { it.shown = it.steps.length; it.phase = it.practice ? 'try' : 'ready'; }
  return it;
}
export function pickAnswer(it, i) {
  const p = it.practice;
  if (!p || it.phase !== 'try' || it.solved || it.picks.includes(i) || it.crossed === i) return it;
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

// ---- The hint ladder ----------------------------------------------------------------------------------------

const givesAway = (st, answer) => /answer is|so it is|so the answer/i.test(st) || (String(answer).length > 0 && String(st).includes(String(answer)));
/** Three hints: the rule; the start of this question's own working (never its answer); then crossing out a wrong answer. */
export function hintsFor(it) {
  const p = it.practice;
  if (!p) return [];
  const rule = tipFor(it).replace(/^Tip: /, '');   // a quoted example keeps its "Remember:"
  const own = (p.steps || []).filter((st) => st && !givesAway(st, p.answer)).slice(0, 2).join(' ');
  const work = own || it.steps.filter((st) => !givesAway(st, p.answer) && st !== rule).slice(0, 1).join(' ') || 'Look back at how the example was done, and do the same.';
  return [rule, work === rule ? 'Look back at how the example was done, and do the same.' : work, 'One wrong answer is crossed out.'];
}
/** Climb one rung of the ladder; the third rung crosses out a wrong answer the child has not already tried. */
export function useHint(it) {
  if (it.phase !== 'try' || it.solved || !it.practice || it.hintsUsed >= 3) return it;
  it.hintsUsed += 1;
  if (it.hintsUsed === 3) {
    const p = it.practice, k = p.choices.findIndex((c, i) => c !== p.answer && !it.picks.includes(i));
    it.crossed = k >= 0 ? k : null;
  }
  return it;
}
/** Stars for this page (never counted in the game): three, less one for each hint, at least one. */
export const starsFor = (it) => Math.max(1, 3 - (it.hintsUsed || 0));

// ---- Spot the mistake ---------------------------------------------------------------------------------------

/**
 * One step of the working gone wrong: the last step with a number has that number changed. Returns
 * { index, wrong (the step as shown), right, fixes: [3 versions, one right] } or null when no step has a number.
 */
export function makeMistake(steps) {
  if (!steps || steps.length < 2) return null;
  for (let i = steps.length - 1; i >= 0; i--) {
    const st = String(steps[i]), nums = [...st.matchAll(/\d+/g)];
    if (!nums.length) continue;
    const last = nums[nums.length - 1], n = Number(last[0]);
    const alts = [...new Set([n >= 10 ? n + 10 : n + 1, n >= 10 ? n - 10 : n + 2, n + 1, n - 1, n + 2, n * 10])].filter((v) => v >= 0 && v !== n);
    if (alts.length < 3) continue;
    const swap = (v) => st.slice(0, last.index) + v + st.slice(last.index + last[0].length);
    const fixes = [st, swap(alts[1]), swap(alts[2])];
    const turn = i % 3;   // where the right one sits, so it is not always first
    return { index: i, wrong: swap(alts[0]), right: st, fixes: [...fixes.slice(3 - turn), ...fixes.slice(0, 3 - turn)] };
  }
  return null;
}
/** A tap on a step: the wrong one is found; any other is marked right. */
export function spotTap(it, i) {
  const m = it.mistake;
  if (it.phase !== 'spot' || !m || m.found) return it;
  if (i === m.index) m.found = true; else if (!m.okSteps.includes(i)) m.okSteps.push(i);
  return it;
}
/** A pick of what the step should say: the right one fixes it; a wrong one is crossed off. */
export function spotFix(it, k) {
  const m = it.mistake;
  if (it.phase !== 'spot' || !m || !m.found || m.fixed || m.badFixes.includes(k)) return it;
  if (m.fixes[k] === m.right) m.fixed = true; else m.badFixes.push(k);
  if (m.badFixes.length >= 2) m.fixed = true;   // never stuck
  return it;
}

// ---- The hands-on lesson ------------------------------------------------------------------------------------

/** The lesson's items and what each step asks: see data/lessons.js for the kinds. */
export function lessonPlan(L) {
  if (L.kind === 'count') return { pool: L.n, steps: [`Tap each ${L.pic} to count it.`, 'How many are there?'], answer: L.n };
  if (L.kind === 'add') return { pool: Math.min(14, L.a + L.b + 2), steps: [`Tap ${L.a} to put ${L.a === 1 ? 'it' : 'them'} in the basket.`, `Now tap ${L.b} more.`, 'How many are in the basket altogether?'], answer: L.a + L.b };
  return { pool: L.a, steps: [`Take away ${L.b}: tap ${L.b === 1 ? 'one' : L.b} to eat ${L.b === 1 ? 'it' : 'them'}.`, 'How many are left?'], answer: L.a - L.b };
}
export const lessonAsking = (L) => L.step === lessonPlan(L).steps.length - 1;
export function lessonChoices(L) {
  const a = lessonPlan(L).answer, set = [...new Set([a - 1, a, a + 1, a + 2].filter((v) => v >= 0))].slice(0, 3);
  return set.map((_, i, arr) => arr[(i + a) % arr.length]);
}
/** A tap on item i of the pool. */
export function lessonTap(it, i) {
  const L = it.lesson;
  if (it.phase !== 'do' || !L || lessonAsking(L)) return it;
  if (L.kind === 'sub') {
    if (L.eaten.includes(i) || L.eaten.length >= L.b) return it;
    L.eaten.push(i);
    if (L.eaten.length === L.b) L.step = 1;
    return it;
  }
  if (L.lit.includes(i)) return it;
  if (L.kind === 'add' && L.step === 0 && L.lit.length >= L.a) return it;
  L.lit.push(i);
  if (L.kind === 'count' && L.lit.length === L.n) L.step = 1;
  if (L.kind === 'add' && L.step === 0 && L.lit.length === L.a) L.step = 1;
  else if (L.kind === 'add' && L.step === 1 && L.lit.length === L.a + L.b) L.step = 2;
  return it;
}
/** The child's answer to the lesson's question: right finishes it; a wrong one is crossed off. */
export function lessonPick(it, value) {
  const L = it.lesson;
  if (it.phase !== 'do' || !L || !lessonAsking(L) || L.done || L.picks.includes(value)) return it;
  L.picks.push(value);
  if (value === lessonPlan(L).answer || L.picks.length >= MAX_MISSES) L.done = true;
  return it;
}

// ---- The guide ----------------------------------------------------------------------------------------------

/** The villager who teaches this game: their picture (the world sprite, facing us), or a teacher emoji without one. */
export function drawGuide(scene, x, y, size, guide) {
  if (guide && guide.sprite && scene.textures && scene.textures.exists(guide.sprite)) {
    const s = scene.add.sprite(x, y, guide.sprite, IDLE_FRAMES.down);
    if (typeof s.setDisplaySize === 'function') s.setDisplaySize(size * 1.5, size * 1.5);
    return s;
  }
  return scene.add.text(x, y, guide && guide.emoji ? guide.emoji : '🧑‍🏫', { fontSize: Math.round(size * 0.8) + 'px' }).setOrigin(0.5);
}
/** The guide's line in a speech bubble beside their picture; said aloud (in their voice) when it changes, if auto-read is on. */
export function guideSays(scene, it, x, y, w, h, line, colour, f) {
  const g = scene.add.graphics();
  const px = x + h / 2;
  g.fillStyle(0x1e1b4b, 0.06); g.fillRoundedRect(x + h + 6 * f, y, w - h - 6 * f, h, 14 * f);
  g.fillTriangle(x + h + 6 * f, y + h / 2 - 7 * f, x + h + 6 * f, y + h / 2 + 7 * f, x + h - 2 * f, y + h / 2);
  drawGuide(scene, px, y + h / 2, h * 0.9, it.guide);
  const t = readable(scene, x + h + 16 * f, y + h / 2, line, T.at(scene, 15, colour, { fontStyle: '700' }), { width: w - h - 30 * f, align: 'left' }).setOrigin(0, 0.5);
  if (it.guide && it.guide.name && h > 40 * f) {
    const name = scene.add.text(px, y + h + 2 * f, it.guide.name, { fontFamily: FONT, fontSize: Math.round(10 * f) + 'px', color: hex(THEME.ink2), fontStyle: WEIGHT.bold }).setOrigin(0.5, 0);
    if (name.width && px - name.width / 2 < x) name.setX(x + name.width / 2);   // kept on screen at the left edge
  }
  if (scene.autoReads && it.said !== line) {
    it.said = line;
    const voice = it.guide ? { voice: it.guide.voice || 'female', pitch: it.guide.pitch || 1 } : {};
    scene.time.delayedCall(250, () => speak(line, { rate: scene.speechRate, ...voice }));
  }
  return t;
}

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

/** The question part of a solved example ("47 + 38 = 85" -> "47 + 38 = ?"), for spotting the mistake. */
export function unsolved(problem) {
  const str = String(problem).replace(/\[|\]/g, '');
  const arrow = /^([\s\S]*?)\s+→\s+[\s\S]+$/.exec(str);
  if (arrow) return `${arrow[1].trim()}  →  ?`;
  const i = str.lastIndexOf(' = ');
  return i > 0 ? `${str.slice(0, i)} = ?` : str;
}

/** What the guide says at this moment. */
function guideLine(it) {
  const p = it.practice, L = it.lesson, m = it.mistake;
  if (it.phase === 'do') return L.done ? (L.picks.includes(lessonPlan(L).answer) ? `Yes! ${lessonPlan(L).answer}. You did it yourself!` : `It is ${lessonPlan(L).answer}. Count with me next time!`) : L.picks.length ? 'Not quite. Count them again!' : lessonPlan(L).steps[L.step];
  if (it.phase === 'spot') return m.fixed ? 'Thank you! Now you try one.' : m.found ? (m.badFixes.length ? 'Not that one. Look at the steps before it.' : 'You found it! What should it say?') : m.okSteps.length ? 'That step is right. Keep looking!' : 'I worked this one out, but one step is wrong. Can you find it?';
  if (it.phase === 'try') return it.solved ? (gotItRight(it) ? 'Yes! You have got it.' : `The answer is ${p.answer}. You will get the next one!`) : it.picks.length ? 'Not quite. Try a hint if you like!' : 'Your turn! Tap the answer.';
  if (it.phase === 'ready') return 'Ready to play!';
  return 'Watch how I do this one.';
}

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
  const ink2 = theme.ink2 || THEME.ink2;

  // Title, then the guide with what they are saying.
  let y = R.y + 4 * f;
  const title = text(scene, cx, y + 14 * f, `New skill: ${skillLabel(it.skill)}`, { ...T.heading(scene, theme.title), fontSize: Math.round(21 * f) + 'px' });
  if (title.width > R.w - 110 * f) title.setFontSize(Math.round(17 * f));
  y += 32 * f;
  const line = guideLine(it);
  const lineColour = /^(Not quite|Not that|That step is right)/.test(line) ? (line.startsWith('That step') ? THEME.successDark : THEME.danger) : /^(Yes!|Thank you)/.test(line) ? THEME.successDark : theme.ink;
  const bubbleH = Math.max(44 * f, Math.min(58 * f, R.h * 0.11));
  guideSays(scene, it, R.x + 6 * f, y, R.w - 12 * f, bubbleH, line, lineColour, f);
  y += bubbleH + (it.guide && it.guide.name ? 16 : 8) * f;
  // A dot for every step of the working: filled as each one is shown.
  if (it.phase === 'watch' && it.steps.length > 1) {
    const dots = scene.add.graphics(), n = it.steps.length, gapX = 14 * f, x0 = cx - ((n - 1) * gapX) / 2;
    for (let i = 0; i < n; i++) { dots.fillStyle(i < it.shown ? theme.title : theme.ink, i < it.shown ? 1 : 0.2); dots.fillCircle(x0 + i * gapX, y + 4 * f, (i === it.shown - 1 ? 4.5 : 3.5) * f); }
    y += 14 * f;
  }

  const footH = 56 * f;
  const bodyBottom = R.y + R.h - footH - 6 * f;
  const made = [];
  let reader = null;

  if (it.phase === 'do') {
    reader = drawLesson(scene, it, { x: R.x, y, w: R.w, h: bodyBottom - y }, theme, f, on, made);
  } else {
    // The problem: the solved example while watching, the question alone while spotting, the practice question while trying.
    const problemH = Math.min(theme.problemH ? theme.problemH * f : 76 * f, (bodyBottom - y) * 0.3);
    const problemStr = trying ? (it.solved && p.solved ? p.solved : p.prompt) : it.phase === 'spot' && !it.mistake.fixed ? unsolved(it.problem) : it.problem;
    if (problemStr) drawProblem(scene, { x: R.x, y, w: R.w, h: problemH }, problemStr, { solved: trying ? it.solved : it.phase !== 'spot' || it.mistake.fixed, f, theme, it });
    y += problemH + 8 * f;
    if (it.phase === 'watch' || it.phase === 'spot' || it.phase === 'ready') reader = drawSteps(scene, it, { x: R.x, y, w: R.w, h: bodyBottom - y }, theme, f, on, made);
    else reader = drawTry(scene, it, { x: R.x, y, w: R.w, h: bodyBottom - y }, theme, f, on, made, makeChoice, problemStr);
  }
  if (reader) speakButton(scene, R.x + R.w - 24 * f, R.y + 18 * f, 36 * f, reader, { rate: scene.speechRate });

  // Footer: Skip on the left, the next move on the right.
  const fy = R.y + R.h - footH / 2 - 2 * f;
  const bw = Math.min(220 * f, R.w * 0.52);
  const lessonOver = it.phase === 'do' && it.lesson.done, spotOver = it.phase === 'spot' && it.mistake.fixed;
  const action = canFinish(it) ? INTRO_LABELS.done
    : lessonOver || spotOver ? (it.practice ? INTRO_LABELS.turn : INTRO_LABELS.done)
    : it.phase === 'watch' ? (it.shown < it.steps.length ? INTRO_LABELS.next : it.practice ? INTRO_LABELS.turn : INTRO_LABELS.done) : null;
  if (action) {
    const onClick = () => {
      Sfx.click();
      if (action === INTRO_LABELS.next) { revealStep(it); on.change(); }
      else if (action === INTRO_LABELS.turn) { startTry(it); on.change(); }
      else if (!canFinish(it) && it.phase !== 'watch') { startTry(it); if (canFinish(it)) on.done(); else on.change(); }
      else on.done();
    };
    const b = button(scene, R.x + R.w - bw / 2 - 6 * f, fy, bw, 46 * f, action, { variant: 'go', compact: true, fontSize: 18 * (f / ui), onClick });
    if ((action === INTRO_LABELS.done && it.solved) || lessonOver || spotOver) enter(scene, b, { from: 'pop' });
  }
  if (!canFinish(it)) button(scene, R.x + 44 * f, fy, 76 * f, 38 * f, INTRO_LABELS.skip, { variant: 'ghost', compact: true, ...(theme.ink2 !== undefined ? { textColor: ink2 } : {}), fontSize: 15 * (f / ui), onClick: () => { Sfx.click(); on.done(); } });
  return made;
}

/** The working as numbered cards: revealed a step at a time while watching; all of them, one wrong, while spotting. */
function drawSteps(scene, it, r, theme, f, on, made) {
  const spotting = it.phase === 'spot', m = it.mistake;
  if (spotting && m.found && !m.fixed) return drawFix(scene, it, r, theme, f, on, made);
  const lines = spotting ? it.steps.map((st, i) => (i === m.index && !m.fixed ? m.wrong : st)) : it.steps.slice(0, it.shown);
  const bottom = r.y + r.h;
  const rows = scene.add.graphics();   // made first, so the cards sit under the words
  const padY = 7 * f, gapY = 7 * f, textX = r.x + 46 * f, textW = r.w - 60 * f;
  let size = 17, blocks = [];
  for (; size >= 12; size -= 1) {
    blocks.forEach((b) => b.destroy());
    blocks = []; let yy = r.y + padY;
    for (let i = 0; i < lines.length; i++) {
      const b = readable(scene, textX, yy, lines[i], T.at(scene, size, theme.ink, { fontStyle: '600' }), { width: textW, align: 'left', lineGap: 4 }).setOrigin(0, 0);
      blocks.push(b); yy += (b.height || size * 1.4 * f) + padY * 2 + gapY;
    }
    if (yy - padY - gapY <= bottom) break;
  }
  const light = ((theme.title >> 16) & 255) * 0.3 + ((theme.title >> 8) & 255) * 0.59 + (theme.title & 255) * 0.11 > 150;   // a pale badge takes dark numbers
  blocks.forEach((b, i) => {
    const last = !spotting && i === blocks.length - 1, rh = (b.height || size * 1.4 * f) + padY * 2, ry = b.y - padY;
    const bad = spotting && m.found && i === m.index && !m.fixed, good = spotting && (m.okSteps.includes(i) || (m.fixed && i === m.index));
    rows.fillStyle(bad ? THEME.danger : good ? THEME.success : last ? theme.title : theme.ink, bad || good ? 0.16 : last ? 0.14 : 0.06);
    rows.fillRoundedRect(r.x + 6 * f, ry, r.w - 12 * f, rh, Math.min(14 * f, rh / 2));
    if (bad || good) { rows.lineStyle(2, bad ? THEME.danger : THEME.success, 1); rows.strokeRoundedRect(r.x + 6 * f, ry, r.w - 12 * f, rh, Math.min(14 * f, rh / 2)); }
    rows.fillStyle(theme.title, 1); rows.fillCircle(r.x + 26 * f, ry + rh / 2, 12 * f);
    made.push(scene.add.text(r.x + 26 * f, ry + rh / 2, String(i + 1), { fontFamily: FONT, fontSize: Math.round(14 * f) + 'px', color: light ? '#1e1b4b' : '#ffffff', fontStyle: WEIGHT.heavy }).setOrigin(0.5));
    // While spotting, every step is a button to tap.
    if (spotting && !m.found) {
      const z = scene.add.zone(r.x + r.w / 2, ry + rh / 2, r.w - 12 * f, rh).setInteractive({ useHandCursor: true });
      z.on('pointerdown', () => { spotTap(it, i); if (i === it.mistake.index) Sfx.correct(); else Sfx.click(); on.change(); });
      z.label = { text: `step ${i + 1}`, active: true }; made.push(z);
    }
  });
  const newest = blocks[blocks.length - 1];
  if (!spotting && newest && it.shown > 1 && scene.tweens) { newest.setAlpha(0); newest.x += 12 * f; scene.tweens.add({ targets: newest, alpha: 1, x: newest.x - 12 * f, duration: 280, ease: 'Cubic.Out' }); }
  made.push(...blocks);
  if (!spotting && scene.autoReads && it.read < it.shown && newest) { it.read = it.shown; scene.time.delayedCall(300, () => { if (newest.active) newest.read({ rate: scene.speechRate }); }); }
  return spotting ? () => lines.map((l, i) => `Step ${i + 1}. ${l}`).join(' ') : newest;
}

/** The wrong step, found: it alone in red, with the three things it could say beneath it. */
function drawFix(scene, it, r, theme, f, on, made) {
  const m = it.mistake, g = scene.add.graphics();
  const card = readable(scene, r.x + 46 * f, r.y + 8 * f, m.wrong, T.at(scene, 16, theme.ink, { fontStyle: '600' }), { width: r.w - 60 * f, align: 'left' }).setOrigin(0, 0);
  const ch = (card.height || 22 * f) + 16 * f;
  g.fillStyle(THEME.danger, 0.14); g.fillRoundedRect(r.x + 6 * f, r.y, r.w - 12 * f, ch, Math.min(14 * f, ch / 2));
  g.lineStyle(2, THEME.danger, 1); g.strokeRoundedRect(r.x + 6 * f, r.y, r.w - 12 * f, ch, Math.min(14 * f, ch / 2));
  g.fillStyle(theme.title, 1); g.fillCircle(r.x + 26 * f, r.y + ch / 2, 12 * f);
  made.push(card, scene.add.text(r.x + 26 * f, r.y + ch / 2, String(m.index + 1), { fontFamily: FONT, fontSize: Math.round(14 * f) + 'px', color: '#ffffff', fontStyle: WEIGHT.heavy }).setOrigin(0.5));
  const top = r.y + ch + 12 * f, gap = 8 * f, fh = Math.max(40 * f, Math.min(58 * f, (r.y + r.h - top - gap * 2) / 3)), fw = r.w - 20 * f;
  m.fixes.forEach((fixText, k) => {
    const bad = m.badFixes.includes(k);
    const b = button(scene, r.x + r.w / 2, top + k * (fh + gap) + fh / 2, fw, fh, fixText, { variant: bad ? 'danger' : 'secondary', fontSize: 15, wrap: true, disabled: bad, onClick: () => { spotFix(it, k); if (m.fixes[k] === m.right) Sfx.correct(); else Sfx.wrong(); on.change(); } });
    if (bad) b.setAlpha(0.45);
    made.push(b);
  });
  return () => `Step ${m.index + 1} says: ${m.wrong} What should it say? ${m.fixes.join(' Or: ')}`;
}

/** Your turn: the hint ladder, the hints climbed so far, the answers (one crossed out after the last hint), and stars. */
function drawTry(scene, it, r, theme, f, on, made, makeChoice, problemStr) {
  const p = it.practice, cx = r.x + r.w / 2, ink2 = theme.ink2 || THEME.ink2;
  let y = r.y;
  // The ladder: each rung opens once the one before it is used.
  const hw = Math.min(120 * f, (r.w - 24 * f) / 3), hh = 34 * f;
  HINT_LABELS.forEach((lab, k) => {
    const used = k < it.hintsUsed, open = k === it.hintsUsed && !it.solved;
    const b = button(scene, cx + (k - 1) * (hw + 6 * f), y + hh / 2, hw, hh, lab, { variant: open ? 'secondary' : 'ghost', compact: true, fontSize: 13 * (f / scene.ui), disabled: !open, ...(theme.ink2 !== undefined ? { textColor: ink2 } : {}), onClick: () => { useHint(it); Sfx.click(); on.change(); } });
    if (!open && !used) b.setAlpha(0.45);
    made.push(b);
  });
  y += hh + 6 * f;
  const hints = (p.hints || []).slice(0, it.hintsUsed).map((h, k) => `${k + 1}. ${h}`).join('\n');
  if (hints) {
    const t = readable(scene, cx, y, hints, T.at(scene, 13, ink2, { fontStyle: '600' }), { width: r.w - 24 * f, align: 'left' }).setOrigin(0.5, 0);
    y += (t.height || 20 * f) + 8 * f; made.push(t);
  }
  const starsH = 22 * f;
  const n = p.choices.length, cols = n === 4 ? 2 : scene.portrait ? 1 : n, rows = Math.ceil(n / cols), gap = 10 * f;
  const ch = Math.max(42 * f, Math.min(70 * f, (r.y + r.h - starsH - y - gap * (rows - 1)) / rows));
  const bw = Math.min(r.w - 16 * f, cols === 1 ? 420 * f : r.w);
  const cells = grid({ x: cx - bw / 2, y, w: bw, h: ch * rows + gap * (rows - 1) }, cols, rows, gap);
  p.choices.forEach((c, i) => {
    const isAnswer = c === p.answer, picked = it.picks.includes(i), crossed = it.crossed === i;
    const state = it.solved ? (isAnswer ? 'right' : picked ? 'wrong' : 'dim') : picked ? 'wrong' : crossed ? 'dim' : 'idle';
    const tap = it.solved || picked || crossed ? null : () => { pickAnswer(it, i); if (p.choices[i] === p.answer) Sfx.correct(); else Sfx.wrong(); on.change(); };
    const k = makeChoice(scene, cells[i].x, cells[i].y, cells[i].w, ch, c, { state, onTap: tap, seed: i, f });
    if (crossed && !it.solved) { const x = scene.add.graphics(); x.lineStyle(4 * f, THEME.danger, 0.8); x.lineBetween(cells[i].x - cells[i].w * 0.35, cells[i].y, cells[i].x + cells[i].w * 0.35, cells[i].y); }
    if (scene.answerSpeaker) scene.answerSpeaker(k, cells[i].w, ch, c);
    if (picked && i === it.lastPick && !isAnswer && !it.solved) shake(scene, k, 5);
    made.push(k);
  });
  y += ch * rows + gap * (rows - 1) + 6 * f;
  const stars = starsFor(it);
  made.push(text(scene, cx, y + starsH / 2, `${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}${it.solved && gotItRight(it) ? '  well done!' : ''}`, { ...T.small(scene, ink2), fontSize: Math.round(16 * f) + 'px' }));
  return () => `${String(problemStr).replace(/[|]/g, '')}. ${it.solved ? `The answer is ${spokenAnswer(p.answer)}.` : answerLine(p.choices)}`;
}

/** The hands-on lesson: the things to tap above, the basket below, and the question once the tapping is done. */
function drawLesson(scene, it, r, theme, f, on, made) {
  const L = it.lesson, plan = lessonPlan(L), asking = lessonAsking(L);
  const g = scene.add.graphics(), cx = r.x + r.w / 2;
  const choicesH = asking ? Math.min(60 * f, r.h * 0.22) : 0;
  const boardH = r.h - choicesH - (asking ? 10 * f : 0);
  g.fillStyle(0x1e1b4b, 0.05); g.fillRoundedRect(r.x + 6 * f, r.y, r.w - 12 * f, boardH, 16 * f);
  // The pool: things still to tap, in up to two rows across the top.
  const perRow = Math.min(plan.pool, 7), rowsN = Math.ceil(plan.pool / perRow);
  const cell = Math.min((r.w - 30 * f) / perRow, (boardH * 0.5) / rowsN), size = Math.round(Math.min(46 * f, cell * 0.8));
  const at = (i) => ({ x: cx + ((i % perRow) - (perRow - 1) / 2) * cell, y: r.y + 14 * f + cell / 2 + Math.floor(i / perRow) * cell });
  // The basket.
  const by = r.y + boardH * 0.58, bh = boardH * 0.36, bw = Math.min(r.w - 30 * f, 360 * f);
  g.fillStyle(0xe9c48a, 1); g.fillRoundedRect(cx - bw / 2, by, bw, bh, 16 * f);
  made.push(scene.add.text(cx, by + bh - 6 * f, L.kind === 'count' ? 'counted' : 'the basket', { fontFamily: FONT, fontSize: Math.round(11 * f) + 'px', color: hex(0x8b6b3e), fontStyle: WEIGHT.bold }).setOrigin(0.5, 1));
  const inBasket = L.kind === 'sub' ? [...Array(L.a).keys()].filter((i) => !L.eaten.includes(i)) : L.lit;
  const bs = Math.round(Math.min(size * 0.8, (bw - 20 * f) / Math.max(5, inBasket.length + (L.kind === 'sub' ? L.eaten.length : 0))));
  const slot = (k, total) => ({ x: cx + (k - (total - 1) / 2) * bs * 1.1, y: by + bh * 0.45 });
  if (L.kind === 'sub') {
    // Everything starts in the basket; tapping one eats it (it fades with a bite).
    [...Array(L.a).keys()].forEach((i, k) => {
      const p = slot(k, L.a), eaten = L.eaten.includes(i);
      const t = scene.add.text(p.x, p.y, L.pic, { fontSize: bs + 'px' }).setOrigin(0.5).setAlpha(eaten ? 0.25 : 1);
      if (eaten) made.push(scene.add.text(p.x, p.y, '✖', { fontFamily: FONT, fontSize: Math.round(bs * 0.8) + 'px', color: hex(THEME.danger), fontStyle: WEIGHT.heavy }).setOrigin(0.5));
      if (!eaten && !asking) { t.setInteractive({ useHandCursor: true }); t.on('pointerdown', () => { lessonTap(it, i); Sfx.pop(); on.change(); }); t.label = { text: `item ${i + 1}`, active: true }; }
      made.push(t);
    });
  } else {
    for (let i = 0; i < plan.pool; i++) {
      if (L.lit.includes(i)) continue;
      const p = at(i), t = scene.add.text(p.x, p.y, L.pic, { fontSize: size + 'px' }).setOrigin(0.5);
      if (!asking) { t.setInteractive({ useHandCursor: true }); t.on('pointerdown', () => { lessonTap(it, i); Sfx.pop(); on.change(); }); t.label = { text: `item ${i + 1}`, active: true }; }
      made.push(t);
    }
    L.lit.forEach((i, k) => {
      const p = slot(k, L.lit.length);
      made.push(scene.add.text(p.x, p.y, L.pic, { fontSize: bs + 'px' }).setOrigin(0.5));
      // Each one counted gets its number; the second group in another colour, so "3 and 2 more" shows.
      made.push(scene.add.text(p.x, p.y - bs * 0.75, String(k + 1), { fontFamily: FONT, fontSize: Math.round(Math.max(11, bs * 0.4)) + 'px', color: hex(L.kind === 'add' && k >= L.a ? THEME.successDark : theme.title), fontStyle: WEIGHT.heavy }).setOrigin(0.5));
    });
  }
  // The question, once the tapping is done.
  if (asking) {
    const opts = lessonChoices(L), w = Math.min(110 * f, (r.w - 30 * f) / opts.length), y = r.y + boardH + 10 * f + choicesH / 2;
    opts.forEach((v, k) => {
      const right = v === plan.answer, picked = L.picks.includes(v);
      const variant = L.done ? (right ? 'success' : picked ? 'danger' : 'secondary') : picked ? 'danger' : 'secondary';
      const b = button(scene, cx + (k - (opts.length - 1) / 2) * (w + 8 * f), y, w, choicesH - 4 * f, String(v), { variant, fontSize: 24, disabled: L.done || picked, onClick: () => { lessonPick(it, v); if (right) Sfx.correct(); else Sfx.wrong(); on.change(); } });
      if (L.done && !right && !picked) b.setAlpha(0.4);
      made.push(b);
    });
  }
  return () => guideLine(it);
}
