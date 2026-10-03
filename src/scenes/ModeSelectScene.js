import { BaseScene } from './BaseScene.js';
import { outfitOf, outfitId } from '../systems/Market.js';
import { SCENES } from '../constants.js';
import { THEME } from '../ui/theme.js';
import * as Store from '../systems/Store.js';
import { levelFromXp, xpForLevel } from '../systems/SaveSystem.js';
import { safeArea } from '../systems/Layout.js';
import { T, text } from '../ui/TextStyles.js';
import { button } from '../ui/Button.js';
import { background } from '../ui/Panel.js';
import { card } from '../ui/Card.js';
import { chip } from '../ui/Chip.js';
import { ProgressBar } from '../ui/ProgressBar.js';
import { enter } from '../ui/motion.js';
import * as Cloud from '../systems/Cloud.js';
import { claimStreak, currentStreak } from '../systems/Streak.js';
import { dailyGoal, familyGoal } from '../systems/Goals.js';
import { getGame } from '../data/minigames.js';
import { toast } from '../ui/Toast.js';
import { Sfx, audioReady, onUnlocked } from '../systems/Audio.js';
import { resolveLook } from '../data/avatars.js';
import { badgeTexture } from '../systems/Textures.js';
import { gradeLabel, isEarly, gradeOf } from '../data/grades.js';

const EMOJI = { map: '\u{1F5FA}️', trophy: '\u{1F3C6}', bee: '\u{1F41D}', medal: '\u{1F3C5}', cloud: '☁️', family: '\u{1F46A}', swap: '\u{1F501}', soundOn: '\u{1F50A}', soundOff: '\u{1F507}' };

/** Home screen: profile summary and the two big mode buttons. */
export class ModeSelectScene extends BaseScene {
  constructor() { super(SCENES.ModeSelect); this.fade = true; }

  /** First visit of the day: bank the streak bonus and say so (once; rebuilds on resize must not repeat it). */
  claimDailyStreak(p) {
    let claim = null;
    Store.updateProfile((prof) => { claim = claimStreak(prof); });
    if (!claim || !claim.claimed || this.streakShown) return;
    this.streakShown = true;
    this.time.delayedCall(700, () => {
      Sfx.coin();
      toast(this, `${claim.count > 1 ? `🔥 Day ${claim.count} streak!` : 'Welcome back!'}  +${claim.coins} coins`, { icon: 'coin', accent: THEME.warning });
      if (claim.count > 1) this.rebuild();   // the profile card shows the streak; coins are read fresh on rebuild
    });
  }

  build() {
    const { w, h, ui } = this;
    const p = Store.getProfile();
    if (!p) return this.scene.start(SCENES.Profile);
    this.claimDailyStreak(p);
    background(this, { accent: THEME.primary, accent2: THEME.subjects.code.accent });
    const top0 = safeArea().top;
    const title = text(this, w / 2, top0 + 40 * ui, 'Quest Academy', T.display(this));
    enter(this, title, { from: 'down', distance: 12 });

    // Profile card
    const chipW = Math.min(w - 32, 420 * ui), chipH = 80 * ui, chipY = top0 + 40 * ui + 40 * ui;
    const pc = card(this, w / 2, chipY + chipH / 2, chipW, chipH, { onTap: () => this.go(SCENES.Profile) });
    const lvl = levelFromXp(p.xp), lo = xpForLevel(lvl), hi = xpForLevel(lvl + 1);
    const ax = -chipW / 2 + 42 * ui, tx = -chipW / 2 + 82 * ui;
    pc.add(this.add.circle(ax, 0, 30 * ui, THEME.primarySoft));
    pc.add(this.add.image(ax, 0, badgeTexture(this, resolveLook(p), outfitOf(p), outfitId(p))).setDisplaySize(52 * ui, 52 * ui));
    pc.add(this.add.text(tx, -20 * ui, `${p.name}  ·  ${gradeLabel(p.grade)}`, T.bodyBold(this)).setOrigin(0, 0.5));
    const streak = currentStreak(p);
    const coins = chip(this, chipW / 2 - 14 * ui, 0, { text: String(p.coins), icon: 'coin', color: THEME.warningSoft, textColor: THEME.warningDark, originX: 1, shadow: 'none' });
    // Text and the XP bar each get their own line, sized to the room left of the coin chip so a long streak never overlaps.
    const roomW = chipW / 2 - 14 * ui - coins.w - 12 - tx;
    pc.add(this.add.text(tx, 3 * ui, `Level ${lvl}${streak > 1 ? `  ·  🔥 ${streak}-day streak` : ''}`, { ...T.small(this, THEME.ink2), wordWrap: { width: roomW } }).setOrigin(0, 0.5));
    const barW = Math.max(60 * ui, Math.min(180 * ui, roomW));
    pc.add(new ProgressBar(this, tx + barW / 2, 24 * ui, barW, 8 * ui, { value: (p.xp - lo) / (hi - lo), color: THEME.primary }));
    pc.add(coins);

    // Today's goal and the family's weekly goal, under the profile card
    const goal = dailyGoal(p), game = getGame(goal.gameId);
    const fam = familyGoal(Store.getSave());
    const goalText = goal.done ? `🎯 Today's goal done!` : `🎯 Today: ${'★'.repeat(goal.stars)} in ${game ? game.title : goal.gameId}`;
    const famText = `👨‍👩‍👧 Family: ${Math.min(fam.stars, fam.target)}/${fam.target} ★ this week`;
    const gy = chipY + chipH + 18 * ui;
    // Side by side when there is room; stacked on narrow phones (a chip's origin is fixed at creation).
    const narrow = w < 520;
    const goalStyle = { text: goalText, color: goal.done ? THEME.successSoft : THEME.warningSoft, textColor: goal.done ? THEME.successDark : THEME.warningDark, fontSize: 13, height: 26 * ui, shadow: 'none' };
    const famStyle = { text: famText, color: THEME.sunken, textColor: THEME.ink2, fontSize: 13, height: 26 * ui, shadow: 'none' };
    if (narrow) {
      chip(this, w / 2, gy, { ...goalStyle, originX: 0.5 });
      chip(this, w / 2, gy + 30 * ui, { ...famStyle, originX: 0.5 });
    } else {
      chip(this, w / 2 - 6, gy, { ...goalStyle, originX: 1 });
      chip(this, w / 2 + 6, gy, { ...famStyle, originX: 0 });
    }
    Store.persist();   // dailyGoal / familyGoal may have created today's records

    // Mode buttons: two big ones, and the Spelling Bee underneath them.
    const rowH = 46 * ui, row2Y = h - 36 * ui - safeArea().bottom, row1Y = row2Y - rowH - 10;
    const areaTop = chipY + chipH + 22 * ui + (narrow ? 52 : 22) * ui, areaBottom = row1Y - rowH / 2 - 16;
    const beeH = Math.min(60 * ui, Math.max(40 * ui, (areaBottom - areaTop) * 0.24));
    const areaH = areaBottom - areaTop - beeH - 12;
    const bw = Math.min(this.portrait ? w - 40 : (w - 64) / 2, this.portrait ? 380 * ui : 300 * ui);
    const bh = Math.min(this.portrait ? areaH / 2 - 12 : areaH, 140 * ui);
    const positions = this.portrait
      ? [{ x: w / 2, y: areaTop + areaH / 2 - bh / 2 - 8 }, { x: w / 2, y: areaTop + areaH / 2 + bh / 2 + 8 }]
      : [{ x: w / 2 - bw / 2 - 12, y: areaTop + areaH / 2 }, { x: w / 2 + bw / 2 + 12, y: areaTop + areaH / 2 }];
    // Label sizes follow the button they sit in: the text scale can hit its ceiling on a mid-sized window
    // while the buttons stay short and narrow, and the words must never outgrow the box.
    const fit = (size, label, sub, bwid, bhei) => {
      const byH = bhei / (2.3 * ui), byLabel = (bwid - 70 * ui) / (label.length * 0.6 * ui), bySub = (bwid - 30) / (sub.length * 0.44 * ui);
      const fs = Math.max(11, Math.min(size, byH, byLabel, bySub));
      return { fontSize: fs, sub: fs >= 13 ? sub : null };
    };
    const early = isEarly(p.grade);   // the world opens at Grade 1; Pre-K and K play from the Challenge menu
    const exploreFit = fit(22, 'Explore the World', early ? 'Opens in Grade 1' : 'Walk around, meet friends, play games', bw, bh);
    const explore = button(this, positions[0].x, positions[0].y, bw, bh, 'Explore the World', {
      color: THEME.success, ...exploreFit, radius: THEME.radius.lg, emoji: early ? '🔒' : EMOJI.map, disabled: early,
      onClick: () => { if (early) return; Store.setSetting('lastMode', 'roam'); this.go(SCENES.World); }
    });
    const challengeFit = fit(22, 'Challenge Mode', 'Pick any game and earn stars', bw, bh);
    const challenge = button(this, positions[1].x, positions[1].y, bw, bh, 'Challenge Mode', {
      color: THEME.subjects.code.accent, ...challengeFit, radius: THEME.radius.lg, emoji: EMOJI.trophy,
      onClick: () => { Store.setSetting('lastMode', 'challenge'); this.go(SCENES.ChallengeMenu); }
    });
    const beeW = Math.min(this.portrait ? w - 40 : bw * 2 + 24, 640 * ui);
    const preK = gradeOf(p.grade) < 0;   // Pre-K learns letters and sounds first; the Spelling Bee opens in Kindergarten
    const beeFit = fit(18, 'Spelling Bee', preK ? 'Opens in Kindergarten' : 'Learn to spell your class words', beeW, beeH);
    const bee = button(this, w / 2, areaBottom - beeH / 2, beeW, beeH, 'Spelling Bee', {
      color: THEME.gold, textColor: THEME.ink, ...beeFit, radius: THEME.radius.lg, emoji: preK ? '🔒' : EMOJI.bee, disabled: preK,
      onClick: () => { if (!preK) this.go(SCENES.Spelling); }
    });

    // Bottom rows: online features, then device settings
    const sw = Math.min(180 * ui, (w - 48) / 2), sh = rowH;
    const lb = button(this, w / 2 - sw / 2 - 8, row1Y, sw, sh, 'Leaderboard', { variant: 'secondary', fontSize: 15, emoji: EMOJI.medal, onClick: () => this.go(SCENES.Leaderboard) });
    const cloud = Cloud.info();
    const cloudLabel = !cloud.signedIn ? 'Family account' : cloud.status === 'offline' ? 'Account: offline' : cloud.status === 'syncing' ? 'Account: syncing…' : 'Account: synced';
    const acc = button(this, w / 2 + sw / 2 + 8, row1Y, sw, sh, cloudLabel, { variant: 'secondary', fontSize: 14, emoji: cloud.signedIn ? EMOJI.cloud : EMOJI.family, onClick: () => this.go(SCENES.Account) });
    const sw2 = button(this, w / 2 - sw / 2 - 8, row2Y, sw, sh, 'Switch player', { variant: 'secondary', fontSize: 15, emoji: EMOJI.swap, onClick: () => this.go(SCENES.Profile) });
    const sound = Store.settings().sound;
    const snd = button(this, w / 2 + sw / 2 + 8, row2Y, sw, sh, sound ? 'Sound: on' : 'Sound: off', {
      variant: 'secondary', fontSize: 15, emoji: sound ? EMOJI.soundOn : EMOJI.soundOff,
      onClick: (b) => {
        const on = !Store.settings().sound; Store.setSetting('sound', on);
        b.setLabel(on ? 'Sound: on' : 'Sound: off'); if (b.emoji) b.emoji.setText(on ? EMOJI.soundOn : EMOJI.soundOff);
      }
    });
    enter(this, [pc, explore, challenge, bee], { from: 'up', delay: 60, stagger: 70 });
    enter(this, [lb, acc, sw2, snd], { from: 'fade', delay: 260, stagger: 30 });
    const cr = text(this, w / 2, h - 8 * ui - safeArea().bottom, 'Art credits', T.small(this, THEME.ink3)).setOrigin(0.5, 1).setInteractive({ useHandCursor: true });
    cr.on('pointerup', () => this.go(SCENES.Credits));

    // Phones keep sound off until a tap: say so, and take the hint down as soon as the first tap unlocks it.
    if (sound && !audioReady() && typeof window !== 'undefined') {
      const hint = chip(this, w / 2, row1Y - rowH / 2 - 14 * ui, { text: `${EMOJI.soundOff} Tap anywhere to turn on sound`, originX: 0.5, color: THEME.warningSoft, textColor: THEME.warningDark, fontSize: 12, height: 24 * ui, shadow: 'none' });
      const off = onUnlocked(() => { if (hint.active) hint.destroy(); });
      this.events.once('shutdown', off);
    }
  }
}
