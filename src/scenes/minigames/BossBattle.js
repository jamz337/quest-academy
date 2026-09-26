import { MinigameScene } from './MinigameScene.js';
import { THEME } from '../../ui/theme.js';
import { bossQuestions } from '../../generators/boss.js';
import { badgeTexture } from '../../systems/Textures.js';
import { grid } from '../../systems/Layout.js';
import { T, text } from '../../ui/TextStyles.js';
import { button, speakButton } from '../../ui/Button.js';
import { readable } from '../../ui/ReadableText.js';
import { fireworks } from '../../ui/Fireworks.js';
import { card } from '../../ui/Card.js';
import { ProgressBar } from '../../ui/ProgressBar.js';
import { enter } from '../../ui/motion.js';
import { Sfx } from '../../systems/Audio.js';
import * as Store from '../../systems/Store.js';

const POOL = 24;   // more than any fight can use: hp + hearts − 1 questions at most

/**
 * Boss duel: every right answer knocks a point off the boss, every wrong or slow answer costs a heart.
 * Questions mix every generator of the boss's subject (see generators/boss.js) one grade above normal.
 */
export class BossBattle extends MinigameScene {
  constructor() { super('MG_Boss'); }

  initState() {
    const boss = this.payload.boss;
    // A Lucky Charm found in the grass adds a heart to this fight and is spent when it ends.
    const charm = !!Store.getProfile()?.charms?.extraHeart;
    return {
      questions: bossQuestions(boss.subject, this.payload.grade, this.rng, POOL),
      idx: 0, correct: 0, hp: boss.hp, hearts: boss.hearts + (charm ? 1 : 0), maxHearts: boss.hearts + (charm ? 1 : 0), charm,
      locked: false, picked: null, hit: null, qStart: Date.now(), timeLimit: boss.questionTimeMs, missed: {}
    };
  }

  progressLabel() { const s = this.state; return `♥ ${s.hearts}`; }
  progressRatio() { return null; }
  enterKey() { return this.state.idx; }

  buildGame(area) {
    const s = this.state, ui = this.ui, boss = this.payload.boss;
    const q = s.questions[s.idx];
    if (!q) return;
    const cx = area.x + area.w / 2;

    // Boss card: portrait, name, HP bar and the player's hearts.
    const bossH = Math.min(92 * ui, area.h * 0.2);
    const bc = card(this, cx, area.y + bossH / 2, area.w, bossH, { color: THEME.ink, stroke: THEME.danger, shadow: 'md' });
    const px = -area.w / 2 + 16 + 28 * ui;
    const portrait = this.add.image(px, 0, badgeTexture(this, boss.look)).setDisplaySize(56 * ui, 56 * ui);
    if (s.hit === 'boss' && !s.defeated) {
      // A hit: the boss flinches, flashes red and a "−1" floats off the portrait.
      this.tweens.add({ targets: portrait, x: px + 6, yoyo: true, repeat: 3, duration: 40 });
      portrait.setTint(0xff5c6c); this.time.delayedCall(180, () => { if (portrait.active) portrait.clearTint(); });
      const dmg = this.add.text(px + 20 * ui, -20 * ui, '−1', T.at(this, 22, THEME.danger, { fontStyle: '700' })).setOrigin(0.5);
      bc.add(dmg);
      this.tweens.add({ targets: dmg, y: -60 * ui, alpha: 0, duration: 700, ease: 'Cubic.easeOut' });
    }
    if (s.defeated) {
      // Defeat: the boss topples out of the frame while a stamp slams down and fireworks go off.
      this.tweens.add({ targets: portrait, angle: 95, y: 40 * ui, alpha: 0.25, duration: 750, ease: 'Cubic.easeIn' });
      const stamp = this.add.text(cx, area.y + bossH + 70 * ui, 'DEFEATED!', T.at(this, Math.min(44, area.w / 7.5 / ui), THEME.danger, { fontStyle: '700' })).setOrigin(0.5).setAngle(-10).setScale(3).setAlpha(0).setDepth(20);
      this.tweens.add({ targets: stamp, scale: 1, alpha: 1, duration: 320, ease: 'Back.easeOut', delay: 120 });
      text(this, cx, area.y + bossH + 150 * ui, boss.win, { ...T.heading(this, THEME.ink), wordWrap: { width: area.w - 32 } }).setAlpha(0).setDepth(20);
      this.tweens.add({ targets: this.children.list[this.children.list.length - 1], alpha: 1, duration: 300, delay: 500 });
      this.time.delayedCall(250, () => fireworks(this, cx, area.y + bossH + 120 * ui, { bursts: 4, spread: area.w * 0.35 }));
    }
    const tx = px + 40 * ui;
    bc.add([portrait,
      this.add.text(tx, -bossH / 2 + 18 * ui, boss.name, T.bodyBold(this, THEME.onAccent)).setOrigin(0, 0.5),
      this.add.text(tx, -bossH / 2 + 38 * ui, boss.title, T.small(this, THEME.ink3)).setOrigin(0, 0.5),
      new ProgressBar(this, tx + (area.w / 2 - tx - 16) / 2, bossH / 2 - 18 * ui, area.w / 2 - tx - 16, 10 * ui, { value: s.hp / boss.hp, color: THEME.danger }),
      this.add.text(area.w / 2 - 16, -bossH / 2 + 18 * ui, `${s.hp} / ${boss.hp}`, T.small(this, THEME.onAccent)).setOrigin(1, 0.5)
    ]);
    const hearts = this.add.text(area.w / 2 - 16, -bossH / 2 + 38 * ui, '♥'.repeat(s.hearts) + '♡'.repeat(s.maxHearts - s.hearts), T.at(this, 18, THEME.danger)).setOrigin(1, 0.5);
    bc.add(hearts);
    if (s.hit === 'player') this.tweens.add({ targets: hearts, scale: 1.4, yoyo: true, duration: 120 });

    if (s.defeated) { enter(this, bc, { from: 'up', distance: 12 }); return; }   // no more questions once the boss is down

    // Question card with the timer bar.
    const gap = 12;
    const lines = q.prompt.split('\n').length;
    const promptH = Math.min(area.h * (lines > 3 ? 0.46 : 0.32), (lines > 3 ? 260 : 190) * ui);
    const qy = area.y + bossH + gap;
    const prompt = card(this, cx, qy + promptH / 2, area.w, promptH);
    const size = lines > 3 ? 15 : q.prompt.length > 28 ? 20 : q.prompt.length > 12 ? 28 : 40;
    const question = readable(this, cx, qy + promptH / 2 - 10 * ui, q.prompt, T.at(this, size, THEME.ink, { fontStyle: lines > 3 ? '500' : '700' }), { width: area.w - 40, align: lines > 3 ? 'left' : 'center' });
    speakButton(this, area.x + area.w - 30 * ui, qy + 26 * ui, 40 * ui, question, { rate: this.speechRate });
    this.autoRead(question);
    this.timerBar = new ProgressBar(this, cx, qy + promptH - 16 * ui, area.w - 48, 8 * ui, { color: THEME.success, value: 1 });
    if (!Number.isFinite(s.timeLimit)) this.timerBar.setVisible(false);

    // Choices
    const gridTop = qy + promptH + gap;
    const cells = grid({ x: area.x, y: gridTop, w: area.w, h: Math.min(area.h - bossH - promptH - gap * 2, 260 * ui) }, 2, 2, gap);
    this.choiceButtons = q.choices.map((choice, i) => {
      const c = cells[i];
      const opts = { variant: 'secondary', fontSize: choice.length > 8 ? 18 : 26, radius: THEME.radius.lg, onClick: () => this.pick(i) };
      if (s.picked !== null) {
        if (choice === q.answer) opts.variant = 'success';
        else if (i === s.picked) opts.variant = 'danger';
      }
      const b = button(this, c.x, c.y, c.w, Math.min(c.h, 100 * ui), choice, opts);
      if (s.picked !== null && choice !== q.answer && i !== s.picked) b.setAlpha(0.45);
      return b;
    });
    enter(this, [bc, prompt], { from: 'up', distance: 12 });
    enter(this, this.choiceButtons, { from: 'up', delay: 60, stagger: 40 });
    if (s.hit === 'player' && s.hearts > 0) this.explanationPanel(area, q, () => this.next());
  }

  pick(i) {
    const s = this.state;
    if (s.locked) return;
    const q = s.questions[s.idx];
    s.locked = true; s.picked = i;
    if (q.choices[i] === q.answer) this.strike(q); else this.hurt(q);
  }

  timeUp() {
    const s = this.state;
    if (s.locked) return;
    s.locked = true; s.picked = -1;
    this.hurt(s.questions[s.idx]);
  }

  strike(q) {
    const s = this.state;
    s.correct += 1; s.hp -= 1; s.hit = 'boss';
    this.logQuestion(q, true);
    this.correctFeedback();
    this.cameras.main.shake(140, 0.005);
    this.rebuild();
    this.time.delayedCall(600, () => (s.hp <= 0 ? this.end(true) : this.next()));
  }

  /** A wrong answer costs a heart and shows why; the fight continues when the player taps Next. */
  hurt(q) {
    const s = this.state;
    s.hearts -= 1; s.hit = 'player';
    s.missed[q.skill] = (s.missed[q.skill] || 0) + 1;
    this.logQuestion(q, false);
    this.wrongFeedback();
    this.rebuild();
    if (s.hearts <= 0) this.time.delayedCall(1100, () => this.end(false));
  }

  next() {
    const s = this.state;
    if (!s.locked) return;
    s.idx += 1;
    if (s.idx >= s.questions.length) return this.end(s.hp < this.payload.boss.hp / 2);   // pool exhausted: call it on damage dealt
    s.locked = false; s.picked = null; s.hit = null; s.qStart = Date.now();
    this.rebuild();
  }

  end(won) {
    const s = this.state;
    if (won && !s.defeated) {
      // Play the defeat sequence first, then score the fight.
      s.defeated = true; s.locked = true;
      Sfx.fanfare();
      this.rebuild();
      this.time.delayedCall(2800, () => this.end(true));
      return;
    }
    if (s.charm) Store.updateProfile((p) => { if (p.charms) delete p.charms.extraHeart; });
    const missedSkills = Object.entries(s.missed).sort((a, b) => b[1] - a[1]).map(([k]) => k);
    this.finish({ won, hpLeft: Math.max(0, s.hp), heartsLeft: Math.max(0, s.hearts), maxHearts: s.maxHearts, correct: s.correct, total: s.idx + 1, missedSkills, delay: 300 });
  }

  onResumed() { this.state.qStart = Date.now() - Math.min(Date.now() - this.state.qStart, this.state.timeLimit * 0.5); }

  update() {
    const s = this.state;
    if (this.finished || s.locked || !this.timerBar || !this.timerBar.active) return;
    const ratio = 1 - (Date.now() - s.qStart) / s.timeLimit;
    this.timerBar.set(ratio, ratio < 0.3 ? THEME.danger : ratio < 0.6 ? THEME.warning : THEME.success);
    if (ratio <= 0) this.timeUp();
  }
}
