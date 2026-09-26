import { BaseScene } from './BaseScene.js';
import { SCENES, SUBJECTS } from '../constants.js';
import { THEME, subjectOf } from '../ui/theme.js';
import { T, text } from '../ui/TextStyles.js';
import { button } from '../ui/Button.js';
import { background } from '../ui/Panel.js';
import { modal } from '../ui/Modal.js';
import { chip } from '../ui/Chip.js';
import { StarRow } from '../ui/StarRow.js';
import { toast } from '../ui/Toast.js';
import { enter } from '../ui/motion.js';
import { Sfx } from '../systems/Audio.js';
import * as Launcher from '../systems/MinigameLauncher.js';
import { getBadge } from '../data/badges.js';
import { skillLabel } from '../data/skills.js';
import { MASTERY_LABEL } from '../systems/Progression.js';

const HEADLINES = ['Keep practising!', 'Good try!', 'Great job!', 'Amazing!'];

/** Shown after every mini-game: stars, rewards, badges and unlocks. */
export class ResultsScene extends BaseScene {
  constructor() { super(SCENES.Results); this.fade = true; }

  create(data) {
    super.create(data);
    this.scene.bringToTop();
    const { result } = this.sceneData;
    if (result.stars >= 2) Sfx.fanfare(); else if (result.stars === 1) Sfx.correct(); else Sfx.wrong();
    this.announced = true;
    let delay = 900;
    for (const id of result.newBadges || []) {
      const b = getBadge(id);
      if (b) this.time.delayedCall(delay, () => toast(this, `New badge: ${b.title}`, { icon: 'star', accent: THEME.brand })); delay += 1400;
    }
    for (const z of result.newUnlocks || []) {
      const zone = SUBJECTS[z]?.zone || z;
      this.time.delayedCall(delay, () => { Sfx.unlock(); toast(this, `${zone} unlocked!`, { icon: 'coin', accent: THEME.success }); }); delay += 1400;
    }
    const subject = SUBJECTS[this.sceneData.payload.subject]?.title || 'Your';
    if (result.masteryChange > 0) {
      this.time.delayedCall(delay, () => { Sfx.unlock(); toast(this, `Level up! ${subject} questions get harder: ${MASTERY_LABEL[result.mastery]}`, { icon: 'star', accent: THEME.brand }); });
    } else if (result.masteryChange < 0) {
      this.time.delayedCall(delay, () => toast(this, `Easing off a little: ${subject} is back to ${MASTERY_LABEL[result.mastery]}`, { accent: THEME.ink3 }));
    }
  }

  build() {
    const { w, ui } = this;
    const { payload, result } = this.sceneData;
    const subject = subjectOf(payload.subject);
    background(this, { accent: subject.accent, accent2: THEME.gold, dots: false });
    const m = modal(this, { w: 460 * ui, h: 540 * ui, accent: subject.accent, dim: false });
    let y = m.y + 44 * ui;
    const boss = payload.boss;
    const headline = boss ? (result.won ? boss.win : boss.lose) : HEADLINES[result.stars] || HEADLINES[0];
    const head = text(this, w / 2, y, headline, { ...T.title(this), wordWrap: { width: m.w - 40 } });
    y += 34 * ui;
    const tag = chip(this, w / 2, y, { text: payload.title, originX: 0.5, color: subject.soft, textColor: subject.dark, shadow: 'none' });
    y += 46 * ui;
    const stars = new StarRow(this, w / 2, y, 0, 56 * ui);
    if (!this.starsShown) { this.starsShown = true; stars.reveal(result.stars, this); } else stars.set(result.stars);
    y += 54 * ui;
    enter(this, [head, tag], { from: 'up', distance: 10 });

    const line = (label, value, color = THEME.ink) => {
      text(this, m.x + 28, y, label, T.body(this, THEME.ink2)).setOrigin(0, 0.5);
      text(this, m.x + m.w - 28, y, value, T.bodyBold(this, color)).setOrigin(1, 0.5);
      y += 30 * ui;
    };
    if (result.total !== undefined) line('Correct answers', `${result.correct} / ${result.total}`);
    if (boss) {
      line('Boss health left', `${result.hpLeft} / ${boss.hp}`, result.won ? THEME.successDark : THEME.danger);
      line('Hearts left', '♥'.repeat(result.heartsLeft || 0) + '♡'.repeat(boss.hearts - (result.heartsLeft || 0)), THEME.danger);
    }
    if (result.levelId) line('Level', `${result.levelId}${result.solved ? '  solved' : ''}`, result.solved ? THEME.successDark : THEME.danger);
    if (result.blocksUsed !== undefined && result.par !== undefined) line('Blocks used', `${result.blocksUsed}  (par ${result.par})`);
    line('Time', formatTime(result.timeMs) + (result.timeBonus ? '  ⚡ bonus' : ''), result.timeBonus ? THEME.successDark : THEME.ink);
    line('Coins earned', `+${result.coins}`, THEME.warningDark);
    line('XP earned', `+${result.xp}`, THEME.successDark);
    if (result.newBest) { chip(this, w / 2, y, { text: '★ New best score!', originX: 0.5, color: THEME.warningSoft, textColor: THEME.warningDark, shadow: 'none' }); y += 30 * ui; }
    if (result.missedSkills && result.missedSkills.length) {
      text(this, w / 2, y, 'Practise: ' + result.missedSkills.slice(0, 3).map(skillLabel).join(', '), T.small(this, THEME.ink2)); y += 26 * ui;
    }

    const bw = Math.min((m.w - 72) / 2, 200 * ui), bh = 50 * ui, by = m.y + m.h - 46 * ui;
    button(this, w / 2 - bw / 2 - 8, by, bw, bh, 'Play again', { variant: 'secondary', onClick: () => this.playAgain() });
    button(this, w / 2 + bw / 2 + 8, by, bw, bh, 'Continue', { variant: 'primary', onClick: () => this.continueOn() });
  }

  playAgain() {
    const { payload } = this.sceneData;
    this.scene.start(payload.sceneKey, { ...payload, seed: undefined });
  }

  continueOn() {
    const { payload, result } = this.sceneData;
    Launcher.returnToCaller(this, payload, result);
  }
}

function formatTime(ms) {
  const s = Math.round((ms || 0) / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
