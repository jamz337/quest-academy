// Grass encounters: a pop quiz, a treasure chest or a mystery gift in a modal. `hud` is the HudScene;
// the encounter's state is hud.state.encounter = { kind, q?, coins?, gift?, subject?, picked, right, onAnswer?, onClose? }.
import { THEME } from '../../ui/theme.js';
import { grid } from '../../systems/Layout.js';
import { T, text } from '../../ui/TextStyles.js';
import { button, speakButton } from '../../ui/Button.js';
import { readable } from '../../ui/ReadableText.js';
import { modal } from '../../ui/Modal.js';
import { explainQuestion } from '../../data/explanations.js';

export function buildEncounter(hud, e) {
  const { w, ui } = hud;
  const quiz = e.kind === 'quiz';
  const accent = quiz ? THEME.subjects[e.subject]?.accent ?? THEME.primary : e.kind === 'chest' ? THEME.gold : THEME.pink;
  const title = quiz ? 'Pop quiz!' : e.kind === 'chest' ? 'Treasure chest!' : 'Mystery gift!';
  const mw = Math.min(w - 24, 440 * ui);
  const bh = 44 * ui, gap = 8, cols = 2;
  const rows = quiz ? Math.ceil(e.q.choices.length / cols) : 0;
  // Quiz prompts vary from one line to a short program listing, so the modal is sized from the measured text.
  const lines = quiz ? e.q.prompt.split('\n').length : 0;
  const prompt = quiz ? readable(hud, 0, 0, e.q.prompt, T.at(hud, lines > 6 ? 13 : e.q.prompt.length > 60 || lines > 3 ? 15 : 18, THEME.ink, { fontStyle: '700' }), { width: mw - 48 }).setOrigin(0.5, 0).setDepth(603) : null;
  if (prompt && e.picked === null) hud.autoRead(prompt);
  const why = quiz && e.picked !== null && !e.right ? readable(hud, 0, 0, explainQuestion(e.q, e.subject), T.at(hud, 14, THEME.ink2), { width: mw - 48 }).setOrigin(0.5, 0).setDepth(603) : null;
  const mh = quiz ? 68 * ui + 8 * ui + prompt.height + 20 * ui + rows * bh + (rows - 1) * gap + 14 * ui + 28 * ui + (why ? why.height + 10 * ui : 0) + 74 * ui : 250 * ui;
  const m = modal(hud, { look: 'storybook', w: mw, h: mh, title, accent, depth: 600, dimAlpha: 0.4 });
  let y = m.contentTop;
  if (quiz) {
    const q = e.q;
    prompt.setPosition(w / 2, y + 8 * ui);
    const sb = speakButton(hud, m.x + m.w - 34 * ui, m.y + 40 * ui, 40 * ui, prompt, { rate: hud.speechRate }); if (sb) sb.setDepth(603);
    y += prompt.height + 20 * ui;
    const cells = grid({ x: m.x + 24, y, w: m.w - 48, h: rows * bh + (rows - 1) * gap }, cols, rows, gap);
    q.choices.forEach((choice, i) => {
      const c = cells[i];
      const opts = { variant: 'secondary', fontSize: choice.length > 14 ? 14 : 17, radius: THEME.radius.sm, onClick: () => hud.answerEncounter(i) };
      if (e.picked !== null) { if (choice === q.answer) opts.variant = 'success'; else if (i === e.picked) opts.variant = 'danger'; }
      button(hud, c.x, c.y, c.w, c.h, choice, opts).setDepth(603);
    });
    y += rows * bh + (rows - 1) * gap + 14 * ui;
    if (e.picked !== null) {
      const msg = e.right ? `Correct!  +${e.reward.coins} coins  +${e.reward.xp} XP` : `The answer was ${q.answer}. No harm done!`;
      text(hud, w / 2, y, msg, T.bodyBold(hud, e.right ? THEME.successDark : THEME.ink2)).setDepth(603);
      if (why) { why.setPosition(w / 2, y + 16 * ui); hud.autoRead(why); }
    }
  } else {
    const msg = e.kind === 'chest' ? `You found ${e.coins} coins hidden in the grass!` : `${e.gift.title}\n${e.gift.desc}`;
    text(hud, w / 2, y + 30 * ui, msg, { ...T.bodyBold(hud), align: 'center', wordWrap: { width: m.w - 48 } }).setDepth(603);
  }
  if (!quiz || e.picked !== null) {
    button(hud, w / 2, m.y + m.h - 38 * ui, Math.min(m.w - 48, 200 * ui), 46 * ui, 'Continue', { variant: 'primary', onClick: () => hud.closeEncounter() }).setDepth(603);
  }
}
