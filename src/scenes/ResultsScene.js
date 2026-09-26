import { BaseScene } from './BaseScene.js';
import { C, SCENES, SUBJECTS } from '../constants.js';
import { T, text } from '../ui/TextStyles.js';
import { button } from '../ui/Button.js';
import { panel, background } from '../ui/Panel.js';
import { StarRow } from '../ui/StarRow.js';
import { toast } from '../ui/Toast.js';
import { Sfx } from '../systems/Audio.js';
import * as Launcher from '../systems/MinigameLauncher.js';
import { getBadge } from '../data/badges.js';
import { skillLabel } from '../data/skills.js';

const HEADLINES = ['Keep practising!', 'Good try!', 'Great job!', 'Amazing!'];

/** Shown after every mini-game: stars, rewards, badges and unlocks. */
export class ResultsScene extends BaseScene {
  constructor() { super(SCENES.Results); }

  create(data) {
    super.create(data);
    this.scene.bringToTop();
    const { result } = this.sceneData;
    if (result.stars >= 2) Sfx.fanfare(); else if (result.stars === 1) Sfx.correct(); else Sfx.wrong();
    this.announced = true;
    let delay = 900;
    for (const id of result.newBadges || []) {
      const b = getBadge(id);
      if (b) this.time.delayedCall(delay, () => toast(this, `New badge: ${b.title}`, { bg: C.purple, icon: 'star' })); delay += 1400;
    }
    for (const z of result.newUnlocks || []) {
      const zone = SUBJECTS[z]?.zone || z;
      this.time.delayedCall(delay, () => { Sfx.unlock(); toast(this, `${zone} unlocked!`, { bg: C.green, icon: 'coin' }); }); delay += 1400;
    }
  }

  build() {
    const { w, h, ui } = this;
    const { payload, result } = this.sceneData;
    background(this);
    const pw = Math.min(w - 24, 460 * ui), ph = Math.min(h - 24, 520 * ui);
    const px = (w - pw) / 2, py = (h - ph) / 2;
    panel(this, px, py, pw, ph, { color: C.panel, stroke: SUBJECTS[payload.subject]?.color ?? C.blue });
    let y = py + 36 * ui;
    text(this, w / 2, y, HEADLINES[result.stars] || HEADLINES[0], T.heading(this, C.yellow));
    y += 30 * ui;
    text(this, w / 2, y, payload.title, T.small(this, C.grey));
    y += 46 * ui;
    const stars = new StarRow(this, w / 2, y, 0, 56 * ui);
    if (!this.starsShown) { this.starsShown = true; stars.reveal(result.stars, this); } else stars.set(result.stars);
    y += 54 * ui;

    const line = (label, value, color = C.white) => {
      text(this, px + 28, y, label, T.body(this, C.grey)).setOrigin(0, 0.5);
      text(this, px + pw - 28, y, value, T.bodyBold(this, color)).setOrigin(1, 0.5);
      y += 30 * ui;
    };
    if (result.total !== undefined) line('Correct answers', `${result.correct} / ${result.total}`);
    if (result.levelId) line('Level', `${result.levelId}${result.solved ? '  solved' : ''}`, result.solved ? C.lime : C.red);
    if (result.blocksUsed !== undefined && result.par !== undefined) line('Blocks used', `${result.blocksUsed}  (par ${result.par})`);
    line('Time', formatTime(result.timeMs) + (result.timeBonus ? '  ⚡ bonus' : ''), result.timeBonus ? C.lime : C.white);
    line('Coins earned', `+${result.coins}`, C.yellow);
    line('XP earned', `+${result.xp}`, C.lime);
    if (result.newBest) { text(this, w / 2, y, 'New best score!', T.bodyBold(this, C.orange)); y += 28 * ui; }
    if (result.missedSkills && result.missedSkills.length) {
      text(this, w / 2, y, 'Practise: ' + result.missedSkills.slice(0, 3).map(skillLabel).join(', '), T.small(this, C.peach)); y += 26 * ui;
    }

    const bw = Math.min((pw - 72) / 2, 200 * ui), bh = 50 * ui, by = py + ph - 44 * ui;
    button(this, w / 2 - bw / 2 - 8, by, bw, bh, 'Play again', { color: C.blue, onClick: () => this.playAgain() });
    button(this, w / 2 + bw / 2 + 8, by, bw, bh, 'Continue', { color: C.lime, textColor: C.navy, onClick: () => this.continueOn() });
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
