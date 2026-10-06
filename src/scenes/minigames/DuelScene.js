import { MinigameScene } from './MinigameScene.js';
import { THEME, mix } from '../../ui/theme.js';
import { SUBJECTS } from '../../constants.js';
import { duelQuestions, bossDuelQuestions } from '../../generators/duel.js';
import { drawMiniMaze, drawProgram } from '../../ui/CodeView.js';
import { tuningFor } from '../../data/grades.js';
import { DUEL } from '../../data/world/duels.js';
import { badgeTexture, lookSpriteTexture, charScale } from '../../systems/Textures.js';
import { IDLE_FRAMES, LPC_FRAME } from '../../ui/LpcCharacter.js';
import { MONKEY_FRAMES } from '../../ui/FlatCharacter.js';
import { MANGO_CELL } from '../../ui/Mango.js';
import { resolveLook } from '../../data/avatars.js';
import { outfitOf, outfitId, snacksOf, useSnack } from '../../systems/Market.js';
import { grid } from '../../systems/Layout.js';
import { T, text } from '../../ui/TextStyles.js';
import { button, speakButton } from '../../ui/Button.js';
import { readable } from '../../ui/ReadableText.js';
import { fireworks } from '../../ui/Fireworks.js';
import { card } from '../../ui/Card.js';
import { panel } from '../../ui/Panel.js';
import { chip } from '../../ui/Chip.js';
import { ProgressBar } from '../../ui/ProgressBar.js';
import { enter } from '../../ui/motion.js';
import { Sfx } from '../../systems/Audio.js';
import * as Store from '../../systems/Store.js';
import * as Music from '../../systems/Music.js';
import { pieceStyle, duelPiece } from './DuelPieces.js';
import { heartsOf, setHearts, HEARTS_MAX } from '../../systems/Hearts.js';

const POOL = 24;   // more questions than any duel can use
/** Button labels (tests find buttons by these). */
export const LABELS = { solve: 'Solve', logic: 'Logic', items: 'Items', run: 'Run', menu: 'Menu', close: 'Close' };
const CHARMS = [
  { id: 'extraHeart', label: '🍀 Lucky Charm', desc: 'One more heart for you.' },
  { id: 'doubleCoins', label: '🎫 Golden Ticket', desc: 'Double the coins you win.' }
];

/**
 * A duel: the player (with Mango) on the left, a villager or boss on the right, a puzzle between them.
 * Every right answer knocks a point off the opponent; every wrong or slow answer costs a heart, the player's
 * first and then Mango's. SOLVE shows the choices as pieces of the opponent's own game (see DuelPieces.js), LOGIC hides two wrong ones, ITEMS uses charms and market
 * snacks, RUN leaves without a result. Bosses keep their own hp, hearts and clock (see data/world/bosses.js).
 */
export class DuelScene extends MinigameScene {
  constructor() { super('MG_Duel'); }

  initState() {
    const p = this.payload, boss = p.boss, duel = p.duel;
    this.opp = boss
      ? { kind: 'boss', id: boss.id, name: boss.name, title: boss.title, hp: boss.hp, look: boss.look, scale: boss.scale || 1.3, prop: '⚡', voice: boss.voice, pitch: boss.pitch, rate: boss.rate, win: boss.win, lose: boss.lose }
      : { kind: 'villager', id: duel.npcId, name: duel.name, title: null, hp: duel.hp, sprite: duel.sprite, scale: 1, prop: duel.prop, voice: duel.voice, pitch: duel.pitch, rate: duel.rate, win: duel.win, lose: duel.lose };
    const profile = Store.getProfile();
    // A villager's duel is fought with the hearts the player carries (three when full; see systems/Hearts.js).
    const playerHp = boss ? boss.hearts : Math.max(1, heartsOf(profile)), playerMax = boss ? boss.hearts : HEARTS_MAX, mangoHp = boss ? 0 : DUEL.mangoHp;
    const timeLimit = p.timers === false ? Infinity : boss ? boss.questionTimeMs : Math.round(tuningFor(p).questionTimeMs * DUEL.timeFactor);
    return {
      questions: duel ? duelQuestions(duel.gameId, p.grade, this.rng, POOL) : bossDuelQuestions(p.subject, p.grade, this.rng, POOL),
      idx: 0, correct: 0, oppHp: this.opp.hp, phase: 'menu',
      party: [{ id: 'player', name: (profile && profile.name) || 'You', hp: playerHp, max: playerMax }, { id: 'mango', name: 'Mango', hp: mangoHp, max: mangoHp }],
      logic: DUEL.logicUses, hidden: [], logicUsedOn: -1, charmsUsed: {}, useDoubleCoins: false,
      locked: false, picked: null, hit: null, qStart: Date.now(), bonusMs: 0, pausedAt: null, timeLimit,
      defeated: false, lost: false, missed: {}
    };
  }

  create(data) {
    super.create(data);
    Music.play(this.opp.kind === 'boss' ? 'boss' : 'battle');   // the world switches back to the lounge when it resumes
  }

  get partyHp() { return this.state.party.reduce((a, m) => a + Math.max(0, m.hp), 0); }
  get partyMax() { return this.state.party.reduce((a, m) => a + m.max, 0); }
  progressLabel() { return `♥ ${this.partyHp}`; }
  progressRatio() { return null; }
  enterKey() { return `${this.state.idx}:${this.state.phase}`; }

  // ---- Drawing --------------------------------------------------------------------------------------

  buildGame(area) {
    const s = this.state, ui = this.ui, opp = this.opp;
    const q = s.questions[s.idx];
    if (!q) return;
    const cx = area.x + area.w / 2, code = q.code || null;
    // A coding puzzle needs room for its maze: the scenery shrinks and, on a wide screen, the puzzle moves down
    // into the bottom band between the party card and the commands.
    const sceneH = this.portrait ? Math.min(area.h * (code ? 0.25 : 0.34), (code ? 210 : 300) * ui) : Math.min(area.h * (code ? 0.36 : 0.5), (code ? 260 : 360) * ui);
    const px = area.x + area.w * 0.22, ox = area.x + area.w * 0.78;
    this.drawScenery(area, sceneH, ox);
    const gy = area.y + sceneH * 0.86;
    const sc = Math.max(2, Math.floor(sceneH * 0.62 / LPC_FRAME));

    // Shadows on the ground under the three of them (drawn first, so they sit beneath).
    const shadows = this.add.graphics();
    shadows.fillStyle(0x000000, 0.16);
    for (const [sx, sw] of [[px, 16 * sc], [px - 30 * sc, 14 * sc], [ox, 17 * sc * opp.scale]]) shadows.fillEllipse(sx, gy - 2 * sc, sw * 2, 5 * sc);
    // The party: the player faces right with a prop, Mango beside them.
    const profile = this.profile;
    const pKey = lookSpriteTexture(this, resolveLook(profile), outfitOf(profile), outfitId(profile));
    const player = this.add.sprite(px, gy, pKey, IDLE_FRAMES.side).setFlipX(true).setOrigin(0.5, 1);
    player.setScale(charScale(player, sc));
    const pProp = this.add.text(px + 15 * sc, gy - 24 * sc, DUEL.playerProp, { fontSize: Math.round(9 * sc) + 'px' }).setOrigin(0.5);
    const mango = this.add.sprite(px - 30 * sc, gy, 'monkey', s.defeated ? MONKEY_FRAMES.cheer : MONKEY_FRAMES.side).setScale(sc * 58 / MANGO_CELL).setOrigin(0.5, 1);   // the side view faces right, towards the foe
    if (s.party[1].max > 0 && s.party[1].hp <= 0) mango.setTint(0x9a9a9a);
    if (s.defeated) this.tweens.add({ targets: mango, y: gy - 6 * sc, duration: 260, yoyo: true, repeat: -1, ease: 'Sine.Out' });   // cheering hops

    // The opponent faces left with its prop; a name chip and health bar float above.
    const oKey = opp.kind === 'boss' ? lookSpriteTexture(this, opp.look) : opp.sprite;
    const foe = this.add.sprite(ox, gy, oKey, IDLE_FRAMES.side).setScale(sc * opp.scale).setOrigin(0.5, 1);
    const oProp = this.add.text(ox - 15 * sc * opp.scale, gy - 24 * sc * opp.scale, opp.prop, { fontSize: Math.round(9 * sc) + 'px' }).setOrigin(0.5);
    // A gentle breathing bob while nobody is being hit.
    if (!s.hit && !s.defeated && !s.lost && this.tweens) {
      [[player, pProp, 0], [mango, null, 180], [foe, oProp, 90]].forEach(([body, prop, delay]) => {
        this.tweens.add({ targets: prop ? [body, prop] : body, y: '-=' + 2.5 * ui, duration: 900, delay, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      });
    }
    const barW = Math.min(150 * ui, area.w * 0.3);
    chip(this, ox, area.y + 18 * ui, { text: opp.name, originX: 0.5, color: THEME.surface, textColor: THEME.ink, fontSize: 13, height: 26 * ui, shadow: 'sm', stroke: THEME.line });
    const oppBar = new ProgressBar(this, ox, area.y + 40 * ui, barW, 9 * ui, { value: s.oppHp / opp.hp, color: THEME.danger });
    text(this, ox, area.y + 56 * ui, `${s.oppHp} / ${opp.hp}`, T.small(this, THEME.ink));

    // Hits: the striker lunges, the struck one flinches and flashes red, and a −1 floats away.
    if (s.hit === 'opp' && !s.defeated) {
      this.tweens.add({ targets: player, x: px + 26 * ui, yoyo: true, duration: 120, ease: 'Sine.Out' });
      this.tweens.add({ targets: foe, x: ox + 8, yoyo: true, repeat: 3, duration: 40 });
      foe.setTint(0xff5c6c); this.time.delayedCall(220, () => { if (foe.active) foe.clearTint(); });
      this.floatHit(ox, gy - 60 * sc * opp.scale);
      oppBar.animateTo(s.oppHp / opp.hp, THEME.danger);
      this.throwAt({ x: px + 14 * sc, y: gy - 30 * sc }, { x: ox, y: gy - 30 * sc * opp.scale }, { star: true });
    } else if (s.hit && s.hit.startsWith('party')) {
      const victim = s.hit.endsWith('mango') ? mango : player;
      this.tweens.add({ targets: foe, x: ox - 26 * ui, yoyo: true, duration: 120, ease: 'Sine.Out' });
      this.tweens.add({ targets: victim, x: victim.x - 8, yoyo: true, repeat: 3, duration: 40 });
      victim.setTint(0xff5c6c); this.time.delayedCall(220, () => { if (victim.active && !s.lost) victim.clearTint(); });
      this.floatHit(victim.x, victim.y - 50 * sc);
      this.throwAt({ x: ox - 14 * sc, y: gy - 30 * sc }, { x: victim.x, y: gy - 28 * sc }, { emoji: opp.prop, size: 12 * sc });
    }
    if (s.defeated) {
      this.tweens.add({ targets: [foe, oProp], angle: 95, y: '+=' + 30 * ui, alpha: 0.25, duration: 750, ease: 'Cubic.easeIn' });
      const stamp = this.add.text(cx, area.y + sceneH * 0.4, 'DEFEATED!', T.at(this, Math.min(44, area.w / 8 / ui), THEME.danger, { fontStyle: '700' })).setOrigin(0.5).setAngle(-10).setScale(3).setAlpha(0).setDepth(20);
      this.tweens.add({ targets: stamp, scale: 1, alpha: 1, duration: 320, ease: 'Back.easeOut', delay: 120 });
      const line = text(this, cx, area.y + sceneH + 40 * ui, opp.win, { ...T.heading(this, THEME.ink), wordWrap: { width: area.w - 32 } }).setAlpha(0).setDepth(20);
      this.tweens.add({ targets: line, alpha: 1, duration: 300, delay: 500 });
      this.time.delayedCall(250, () => fireworks(this, cx, area.y + sceneH * 0.5, { bursts: 4, spread: area.w * 0.35 }));
      return;
    }
    if (s.lost) {
      player.setTint(0x9a9a9a); mango.setTint(0x9a9a9a);
      text(this, cx, area.y + sceneH + 40 * ui, opp.lose, { ...T.heading(this, THEME.ink), wordWrap: { width: area.w - 32 } }).setDepth(20);
      return;
    }

    // The puzzle box: between the two in landscape, under the scenery on a phone.
    const gap = 10;
    const partyW = this.portrait ? area.w * 0.44 : Math.min(area.w * (code ? 0.24 : 0.34), (code ? 240 : 300) * ui);
    const box = this.portrait
      ? { x: area.x, y: area.y + sceneH + gap, w: area.w, h: code ? Math.min((code.choice === 'program' ? 240 : 300) * ui, area.h * (code.choice === 'program' ? 0.3 : 0.37)) : Math.min(150 * ui, area.h * 0.2) }
      : code ? { x: area.x + partyW + gap, y: area.y + sceneH + gap, w: area.w * 0.4, h: area.y + area.h - (area.y + sceneH + gap) }
        : { x: cx - area.w * 0.22, y: area.y + 66 * ui, w: area.w * 0.44, h: sceneH - 80 * ui };
    panel(this, box.x, box.y, box.w, box.h, { color: THEME.surface, alpha: 0.93, radius: THEME.radius.lg, shadow: 'md' });
    const caption = code ? `${code.title.toUpperCase()} DUEL` : `${(SUBJECTS[this.payload.subject]?.title || 'QUEST').toUpperCase()} DUEL PUZZLE`;
    text(this, box.x + box.w / 2, box.y + 16 * ui, caption, T.caption(this, THEME.ink2));
    let question;
    if (code) {
      // A coding puzzle: the question on one line, then the maze (and the program beside it) like the lesson screens.
      question = readable(this, box.x + box.w / 2 - 12 * ui, box.y + 27 * ui, q.prompt, T.at(this, 14, THEME.ink, { fontStyle: '700' }), { width: box.w - 76 * ui, align: 'center' }).setOrigin(0.5, 0);
      const top = question.y + question.height + 8 * ui, inner = { x: box.x + 10, y: top, w: box.w - 20, h: box.y + box.h - 18 * ui - top };
      if (code.program) {
        const gw = Math.min(inner.h, inner.w * 0.5);
        drawMiniMaze(this, { x: inner.x, y: inner.y, w: gw, h: inner.h }, code);
        drawProgram(this, { x: inner.x + gw + 10, y: inner.y, w: inner.w - gw - 10, h: inner.h }, code.program, { numbered: !!code.numbered });
      } else drawMiniMaze(this, inner, code);
    } else {
      const lines = q.prompt.split('\n').length;
      const size = lines > 3 ? 13 : q.prompt.length > 28 ? 16 : q.prompt.length > 12 ? 22 : 28;
      question = readable(this, box.x + box.w / 2, box.y + box.h / 2 + 4 * ui, q.prompt, T.at(this, size, THEME.ink, { fontStyle: lines > 3 ? '500' : '700' }), { width: box.w - 32, align: lines > 3 ? 'left' : 'center' });
    }
    speakButton(this, box.x + box.w - 22 * ui, box.y + 18 * ui, 34 * ui, question, { rate: this.speechRate * (opp.rate || 1), pitch: opp.pitch || 1, voice: opp.voice, speaker: opp.id });
    this.autoRead(question, s.phase === 'solve' && s.picked === null && !code ? q.choices.filter((_, i) => !s.hidden.includes(i)) : null);
    this.timerBar = new ProgressBar(this, box.x + box.w / 2, box.y + box.h - 10 * ui, box.w - 40, 6 * ui, { color: THEME.success, value: 1 });
    if (!Number.isFinite(s.timeLimit)) this.timerBar.setVisible(false);

    // The bottom band: the party on the left, commands on the right.
    const top = (this.portrait ? box.y + box.h : area.y + sceneH) + gap;
    const bandH = area.y + area.h - top;
    this.drawParty(area.x, top, partyW, bandH);
    const cmdX = code && !this.portrait ? box.x + box.w + gap : area.x + partyW + gap;   // past the puzzle on a wide screen
    const cmd = { x: cmdX, y: top, w: area.x + area.w - cmdX, h: bandH };
    if (s.phase === 'items') this.drawItems(cmd); else this.drawCommands(cmd, q);
    if (s.hit && s.hit.startsWith('party') && this.partyHp > 0 && s.locked) this.explanationPanel(area, q, () => this.next());
  }

  /** A soft sky with a turning sun and drifting clouds, rolling hills, the opponent's house, and a sandy ring to duel in. */
  drawScenery(area, sceneH, houseX) {
    const ui = this.ui, sub = this.subject;
    const g = this.add.graphics();
    const r = THEME.radius.lg, horizon = area.y + sceneH * 0.62;
    // Sky: many thin bands from deep blue to a pale horizon read as one smooth wash.
    const skyH = sceneH * 0.62, bands = 28;
    g.fillStyle(0x8fd3ff, 1); g.fillRoundedRect(area.x, area.y, area.w, skyH, { tl: r, tr: r, bl: 0, br: 0 });
    for (let i = 1; i < bands; i++) {
      const t = i / bands;
      g.fillStyle(mix(0x8fd3ff, 0xeaf8ff, t), 1); g.fillRect(area.x, area.y + r + (skyH - r) * t, area.w, (skyH - r) / bands + 1);
    }
    // The sun, with rays that slowly turn.
    const sx = area.x + area.w * 0.12, sy = area.y + sceneH * 0.2;
    const rays = this.add.graphics({ x: sx, y: sy });
    rays.fillStyle(0xffe27a, 0.45);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; rays.fillTriangle(Math.cos(a - 0.14) * 20 * ui, Math.sin(a - 0.14) * 20 * ui, Math.cos(a + 0.14) * 20 * ui, Math.sin(a + 0.14) * 20 * ui, Math.cos(a) * 34 * ui, Math.sin(a) * 34 * ui); }
    if (this.tweens) this.tweens.add({ targets: rays, angle: 360, duration: 24000, repeat: -1 });
    g.fillStyle(0xfff3b0, 0.6); g.fillCircle(sx, sy, 21 * ui);
    g.fillStyle(0xffd75e, 1); g.fillCircle(sx, sy, 16 * ui);
    // Clouds drift slowly across.
    for (const [fx, fy, k, speed] of [[0.34, 0.15, 1, 26000], [0.66, 0.27, 0.8, 34000]]) {
      const cloud = this.add.graphics({ x: area.x + area.w * fx, y: area.y + sceneH * fy });
      cloud.fillStyle(0xffffff, 0.95);
      for (const [dx, dy, cr] of [[-18, 2, 11], [-4, -4, 15], [12, 0, 12], [24, 4, 8]]) cloud.fillCircle(dx * ui * k, dy * ui * k, cr * ui * k);
      cloud.fillRoundedRect(-26 * ui * k, 2 * ui * k, 56 * ui * k, 12 * ui * k, 6 * ui * k);
      if (this.tweens) this.tweens.add({ targets: cloud, x: cloud.x + area.w * 0.08, duration: speed, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }
    // Far hills in two soft greens.
    g.fillStyle(0xa9e08f, 1); g.fillEllipse(area.x + area.w * 0.28, horizon + sceneH * 0.04, area.w * 0.7, sceneH * 0.3);
    g.fillStyle(0x93d67c, 1); g.fillEllipse(area.x + area.w * 0.8, horizon + sceneH * 0.05, area.w * 0.8, sceneH * 0.26);
    // The house: a rounded roof in the land's dark colour over a soft wall, with a chimney, door and shining windows.
    const hw = Math.min(area.w * 0.34, 210 * ui), hh = sceneH * 0.48, hx = houseX - hw / 2, hy = horizon - hh;
    g.fillStyle(0x8a5a3a, 1); g.fillRoundedRect(hx + hw * 0.7, hy - hh * 0.08, hw * 0.1, hh * 0.3, 3 * ui);
    g.fillStyle(sub.soft, 1); g.fillRoundedRect(hx, hy + hh * 0.3, hw, hh * 0.7, { tl: 0, tr: 0, bl: 6 * ui, br: 6 * ui });
    g.fillStyle(0x000000, 0.07); g.fillRect(hx, hy + hh * 0.3, hw, hh * 0.08);
    g.fillStyle(sub.dark, 1); g.fillRoundedRect(hx - hw * 0.07, hy + hh * 0.02, hw * 1.14, hh * 0.32, { tl: hh * 0.3, tr: hh * 0.3, bl: 6 * ui, br: 6 * ui });
    g.fillStyle(sub.accent, 1); g.fillRoundedRect(hx - hw * 0.07, hy + hh * 0.02, hw * 1.14, hh * 0.22, { tl: hh * 0.3, tr: hh * 0.3, bl: 0, br: 0 });
    g.fillStyle(0x8a5a3a, 1); g.fillRoundedRect(houseX - hw * 0.09, hy + hh * 0.56, hw * 0.18, hh * 0.44, { tl: hw * 0.09, tr: hw * 0.09, bl: 0, br: 0 });
    g.fillStyle(0xffd75e, 1); g.fillCircle(houseX + hw * 0.05, hy + hh * 0.8, 2.2 * ui);
    for (const wx of [hx + hw * 0.12, hx + hw * 0.7]) {
      g.fillStyle(0xffffff, 1); g.fillRoundedRect(wx - 2 * ui, hy + hh * 0.45 - 2 * ui, hw * 0.18 + 4 * ui, hh * 0.24 + 4 * ui, 4 * ui);
      g.fillStyle(0xbfe6ff, 1); g.fillRoundedRect(wx, hy + hh * 0.45, hw * 0.18, hh * 0.24, 3 * ui);
      g.fillStyle(0xffffff, 0.7); g.fillTriangle(wx, hy + hh * 0.45, wx + hw * 0.1, hy + hh * 0.45, wx, hy + hh * 0.57);
    }
    // The meadow, with a darker lip at the horizon, bushes by the house, and the sandy duelling ring.
    g.fillStyle(0x7ed36b, 1); g.fillRoundedRect(area.x, horizon, area.w, sceneH * 0.38, { tl: 0, tr: 0, bl: r, br: r });
    g.fillStyle(0x5cb85c, 0.7); g.fillRect(area.x, horizon, area.w, 3 * ui);
    for (const [bx, br] of [[hx - 8 * ui, 13], [hx + 6 * ui, 9], [hx + hw + 6 * ui, 12]]) { g.fillStyle(0x3fa34d, 1); g.fillCircle(bx, horizon + 2 * ui, br * ui); g.fillStyle(0x58bd63, 1); g.fillCircle(bx - 2 * ui, horizon - 1 * ui, br * 0.7 * ui); }
    g.fillStyle(0xd2ae6c, 1); g.fillEllipse(area.x + area.w / 2, area.y + sceneH * 0.885, area.w * 0.72, sceneH * 0.17);
    g.fillStyle(0xecd09a, 1); g.fillEllipse(area.x + area.w / 2, area.y + sceneH * 0.875, area.w * 0.7, sceneH * 0.155);
    // Flowers nod in the grass.
    for (let i = 0; i < 6; i++) {
      const fx = area.x + area.w * (0.04 + i * 0.185), fy = area.y + sceneH * (0.69 + (i % 2) * 0.26), col = [0xffffff, 0xff8fb8, 0xffd75e][i % 3];
      const f = this.add.graphics({ x: fx, y: fy });
      f.lineStyle(1.5 * ui, 0x3fa34d, 1); f.lineBetween(0, 0, 0, 7 * ui);
      f.fillStyle(col, 1); for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; f.fillCircle(Math.cos(a) * 2.6 * ui, Math.sin(a) * 2.6 * ui, 2 * ui); }
      f.fillStyle(0xffb627, 1); f.fillCircle(0, 0, 1.6 * ui);
      if (this.tweens) this.tweens.add({ targets: f, angle: i % 2 ? 9 : -9, duration: 1300 + i * 110, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }
  }

  /** Portraits, names and hearts for the player and Mango. */
  drawParty(x, y, w, h) {
    const s = this.state, ui = this.ui, boss = this.opp.kind === 'boss';
    const rowH = Math.min(h / 2 - 6, 64 * ui), size = Math.min(44 * ui, rowH - 10);
    h = Math.min(h, rowH * 2 + 16);   // the card hugs its two rows instead of stretching down the band
    const k = card(this, x + w / 2, y + h / 2, w, h, { stroke: THEME.line, shadow: 'md' });
    const profile = this.profile;
    s.party.forEach((m, i) => {
      const ry = -h / 2 + 8 + rowH * i + rowH / 2;
      const key = m.id === 'player' ? badgeTexture(this, resolveLook(profile), outfitOf(profile), outfitId(profile)) : (this.textures.exists('mango-face') ? 'mango-face' : 'monkey');
      const img = this.add.image(-w / 2 + 10 + size / 2, ry, key, 0).setDisplaySize(size, size);
      if (m.max > 0 && m.hp <= 0) img.setTint(0x9a9a9a);
      const tx = -w / 2 + 18 + size;
      const name = this.add.text(tx, ry - rowH * 0.28, m.name.toUpperCase(), T.at(this, 13, THEME.ink, { fontStyle: '700' })).setOrigin(0, 0.5);
      const bw = w - size - 40;
      if (m.max > 0) {
        // A heart for each life; the one just lost bursts.
        const hs = Math.min(22 * ui, (bw + 8) / m.max - 3, rowH * 0.44), hy = ry + rowH * 0.16, left = Math.max(0, m.hp);
        const icons = [];
        for (let j = 0; j < m.max; j++) icons.push(this.add.image(tx + hs / 2 + j * (hs + 3), hy, j < left ? 'heart' : 'heart-off').setDisplaySize(hs, hs));
        k.add([img, name, ...icons]);
        if (s.hit === 'party:' + m.id && icons[left] && this.tweens) {
          const lost = this.add.image(icons[left].x, hy, 'heart').setDisplaySize(hs, hs);
          k.add(lost);
          this.tweens.add({ targets: lost, scale: lost.scale * 2.2, alpha: 0, angle: 20, duration: 520, ease: 'Cubic.Out', onComplete: () => lost.destroy() });
        }
      } else {
        const hint = this.add.text(tx, ry + 2, boss ? `Logic ×${s.logic}` : '', T.at(this, 12, THEME.brandDark)).setOrigin(0, 0.5);
        k.add([img, name, hint]);
      }
    });
    enter(this, k, { from: 'up', distance: 10 });
  }

  /** The command menu, or the choices while solving, with the clock above. */
  drawCommands(cmd, q) {
    const s = this.state, ui = this.ui;
    const headH = 30 * ui;
    this.timerChip = chip(this, cmd.x, cmd.y + headH / 2, { text: this.clockText(), originX: 0, color: THEME.surface, textColor: THEME.ink2, fontSize: 12, height: 26 * ui, shadow: 'none', stroke: THEME.line });
    this.lastSecs = null;
    if (s.phase === 'solve' && !s.locked) button(this, cmd.x + cmd.w - 40 * ui, cmd.y + headH / 2, 76 * ui, 26 * ui, LABELS.menu, { variant: 'ghost', fontSize: 13, onClick: () => this.showMenu() });
    const gh = Math.min(cmd.h - headH - 6, 210 * ui);
    const cells = grid({ x: cmd.x, y: cmd.y + headH + 6, w: cmd.w, h: gh }, 2, 2, 8);
    const items = snacksOf(this.profile).length + CHARMS.filter((c) => this.hasCharm(c.id)).length;
    let buttons;
    if (s.phase === 'solve' && q.code && q.code.choice === 'program') {
      // Programs to choose from, one card each, listed as block rows like the lesson editors.
      const n = q.choices.length, gapY = 6, top = cmd.y + headH + 6, availH = cmd.h - headH - 6;
      const ch = Math.min((availH - gapY * (n - 1)) / n, 120 * ui), ccx = cmd.x + cmd.w / 2;
      buttons = q.choices.map((choice, i) => {
        const cy = top + i * (ch + gapY) + ch / 2;
        if (s.hidden.includes(i)) return button(this, ccx, cy, cmd.w, ch, '—', { variant: 'ghost', disabled: true });
        let stroke = THEME.line, color = THEME.surface, faded = false;
        if (s.picked !== null) { if (choice === q.answer) { stroke = THEME.success; color = THEME.successSoft; } else if (i === s.picked) { stroke = THEME.danger; color = THEME.dangerSoft; } else faded = true; }
        const k = card(this, ccx, cy, cmd.w, ch, { stroke, color, strokeWidth: 3, shadow: 'sm', onTap: s.picked === null && !s.locked ? () => this.pick(i) : null });
        k.label = { text: choice };   // the choice this card stands for (tests find it like a button)
        k.add(this.add.text(cmd.w / 2 - 10, -ch / 2 + 7, String.fromCharCode(65 + i), T.at(this, 12, THEME.ink3)).setOrigin(1, 0));
        drawProgram(this, { x: -cmd.w / 2 + 10, y: -ch / 2 + 6, w: cmd.w - 44, h: ch - 12 }, choice, { into: k });
        if (faded) k.setAlpha(0.45);
        return k;
      });
    } else if (s.phase === 'solve') {
      const reveal = s.picked !== null && (q.choices[s.picked] === q.answer || this.answerRevealed(q));   // hidden while the child works it out
      const style = pieceStyle(this.payload, q);
      buttons = q.choices.map((choice, i) => {
        const c = cells[i]; if (!c) return null;
        if (s.hidden.includes(i)) return button(this, c.x, c.y, c.w, c.h, '—', { variant: 'ghost', disabled: true });
        // The answers are drawn as the opponent's own game draws them (stones, balloons, pizzas, planks, lily pads…).
        if (style) {
          const state = s.picked === null ? 'idle' : choice === q.answer && reveal ? 'right' : i === s.picked ? 'wrong' : reveal ? 'dim' : 'idle';
          const piece = duelPiece(this, style, c.x, c.y, c.w, c.h, choice, { state, seed: i, onTap: s.picked === null && !s.locked ? () => this.pick(i) : null });
          this.answerSpeaker(piece, c.w, c.h, choice);
          return piece;
        }
        const opts = { variant: 'secondary', fontSize: choice.length > 8 ? 15 : 22, radius: THEME.radius.md, onClick: () => this.pick(i) };
        if (s.picked !== null) { if (choice === q.answer && reveal) opts.variant = 'success'; else if (i === s.picked) opts.variant = 'danger'; }
        const b = button(this, c.x, c.y, c.w, c.h, choice, opts);
        if (!q.code) this.answerSpeaker(b, c.w, c.h, choice);
        if (reveal && choice !== q.answer && i !== s.picked) b.setAlpha(0.45);
        return b;
      }).filter(Boolean);
    } else {
      const logicOk = s.logic > 0 && s.logicUsedOn !== s.idx && !s.locked;
      buttons = [
        button(this, cells[0].x, cells[0].y, cells[0].w, cells[0].h, LABELS.solve, { variant: 'primary', fontSize: 18, onClick: () => this.showSolve() }),
        button(this, cells[1].x, cells[1].y, cells[1].w, cells[1].h, LABELS.logic, { variant: 'brand', fontSize: 18, sub: `Mango ×${s.logic}`, disabled: !logicOk, onClick: () => this.useLogic() }),
        button(this, cells[2].x, cells[2].y, cells[2].w, cells[2].h, LABELS.items, { variant: 'secondary', fontSize: 18, sub: items ? `${items} to use` : 'none yet', disabled: s.locked, onClick: () => this.openItems() }),
        button(this, cells[3].x, cells[3].y, cells[3].w, cells[3].h, LABELS.run, { variant: 'danger', fontSize: 18, disabled: s.locked, onClick: () => this.run() })
      ];
    }
    enter(this, buttons, { from: 'up', delay: 40, stagger: 30 });
  }

  /** Charms and snacks to use, one row each, over the command area. */
  drawItems(cmd) {
    const ui = this.ui, profile = this.profile;
    const rows = [
      ...CHARMS.filter((c) => this.hasCharm(c.id)).map((c) => ({ label: c.label, sub: c.desc, onClick: () => this.useItem('charm', c.id) })),
      ...snacksOf(profile).map(({ item, count }) => ({ label: `${item.icon} ${item.name} ×${count}`, sub: item.desc, onClick: () => this.useItem('snack', item.id) }))
    ].slice(0, 6);
    card(this, cmd.x + cmd.w / 2, cmd.y + cmd.h / 2, cmd.w, cmd.h, { stroke: THEME.warning, shadow: 'lg' });
    const closeH = 34 * ui;
    if (!rows.length) text(this, cmd.x + cmd.w / 2, cmd.y + (cmd.h - closeH) / 2, 'No snacks yet.\nAuntie Vee sells them at the market!', { ...T.small(this, THEME.ink2), wordWrap: { width: cmd.w - 32 } });
    else {
      const rowH = Math.min(46 * ui, (cmd.h - closeH - 24) / rows.length);
      rows.forEach((r, i) => button(this, cmd.x + cmd.w / 2, cmd.y + 10 + rowH * i + rowH / 2, cmd.w - 24, rowH - 6, r.label, { variant: 'soft', fontSize: 14, sub: r.sub, onClick: r.onClick }));
    }
    button(this, cmd.x + cmd.w / 2, cmd.y + cmd.h - closeH / 2 - 8, Math.min(140 * ui, cmd.w - 24), closeH, LABELS.close, { variant: 'ghost', fontSize: 14, onClick: () => this.closeItems() });
  }

  /** Something thrown across the arena: a spinning star from the player, the opponent's prop the other way, and a burst where it lands. */
  throwAt(from, to, { star = false, emoji = null, size = 0 } = {}) {
    if (!this.tweens) return;
    const ui = this.ui;
    const shot = star && this.textures.exists('star') ? this.add.image(from.x, from.y, 'star').setDisplaySize(26 * ui, 26 * ui)
      : this.add.text(from.x, from.y, emoji || '✦', { fontSize: Math.round(size || 22 * ui) + 'px' }).setOrigin(0.5);
    shot.setDepth(14);
    this.tweens.add({ targets: shot, x: to.x, duration: 230, ease: 'Sine.In' });
    this.tweens.add({ targets: shot, y: Math.min(from.y, to.y) - 34 * ui, duration: 115, yoyo: true, ease: 'Quad.Out' });
    this.tweens.add({
      targets: shot, angle: star ? 540 : -360, duration: 230,
      onComplete: () => {
        shot.destroy();
        const ring = this.add.circle(to.x, to.y, 8 * ui).setStrokeStyle(4 * ui, star ? THEME.gold : THEME.danger, 1).setDepth(14);
        this.tweens.add({ targets: ring, scale: 4, alpha: 0, duration: 380, ease: 'Cubic.Out', onComplete: () => ring.destroy() });
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2, d = this.add.circle(to.x, to.y, 3.5 * ui, star ? THEME.gold : 0xffffff, 1).setDepth(14);
          this.tweens.add({ targets: d, x: to.x + Math.cos(a) * 42 * ui, y: to.y + Math.sin(a) * 34 * ui, alpha: 0, scale: 0.3, duration: 420, ease: 'Cubic.Out', onComplete: () => d.destroy() });
        }
      }
    });
  }

  floatHit(x, y) {
    const dmg = this.add.text(x, y, '−1', T.at(this, 22, THEME.danger, { fontStyle: '700' })).setOrigin(0.5).setDepth(15);
    this.tweens.add({ targets: dmg, y: y - 50 * this.ui, alpha: 0, duration: 700, ease: 'Cubic.easeOut' });
  }

  /** The clock for the current question: coding puzzles get twice as long, there is a program to read. */
  limitFor(q = this.state.questions[this.state.idx]) { return this.state.timeLimit * (q && q.code ? 2 : 1); }

  clockText() {
    const s = this.state;
    if (!Number.isFinite(s.timeLimit)) return '⏱ no clock';
    const left = Math.max(0, this.limitFor() + s.bonusMs - (Date.now() - s.qStart));
    return `⏱ ${Math.ceil(left / 1000)}s`;
  }

  hasCharm(id) { return !!this.profile?.charms?.[id] && !this.state.charmsUsed[id]; }

  // ---- Commands -------------------------------------------------------------------------------------

  showSolve() { if (this.state.locked) return; Sfx.click(); this.state.phase = 'solve'; this.rebuild(); }
  showMenu() { if (this.state.locked) return; Sfx.pop(); this.state.phase = 'menu'; this.rebuild(); }

  /** Mango's hint: hide up to two wrong choices (one when there are only three), once per question. */
  useLogic() {
    const s = this.state, q = s.questions[s.idx];
    if (s.locked || s.logic <= 0 || s.logicUsedOn === s.idx) return;
    const wrong = q.choices.map((c, i) => (c === q.answer ? -1 : i)).filter((i) => i >= 0);
    const n = Math.min(2, Math.max(0, q.choices.length - 2));
    s.hidden = this.rng.shuffle(wrong).slice(0, n);
    s.logic -= 1; s.logicUsedOn = s.idx;
    Sfx.unlock();
    s.phase = 'solve';
    this.rebuild();
  }

  openItems() { const s = this.state; if (s.locked) return; Sfx.click(); s.pausedAt = Date.now(); s.phase = 'items'; this.rebuild(); }
  closeItems() {
    const s = this.state;
    if (s.pausedAt) { s.qStart += Date.now() - s.pausedAt; s.pausedAt = null; }
    s.phase = 'menu';
    this.rebuild();
  }

  /** Eat a snack or spend a charm. */
  useItem(kind, id) {
    const s = this.state;
    if (kind === 'charm') {
      if (!this.hasCharm(id)) return;
      s.charmsUsed[id] = true;
      if (id === 'extraHeart') { const m = s.party[0]; m.max += 1; m.hp += 1; Store.updateProfile((p) => { if (p.charms) delete p.charms.extraHeart; }); }
      else if (id === 'doubleCoins') s.useDoubleCoins = true;
    } else {
      let item = null;
      Store.updateProfile((p) => { item = useSnack(p, id); });
      if (!item) return;
      const e = item.effect || {};
      if (e.heal) this.heal(e.heal);
      if (e.timeMs) s.bonusMs += e.timeMs;
      if (e.logic) s.logic += e.logic;
    }
    Sfx.coin();
    this.closeItems();
  }

  heal(n) {
    for (const m of this.state.party) while (n > 0 && m.max > 0 && m.hp < m.max) { m.hp += 1; n -= 1; }
  }

  run() { if (this.state.locked) return; Sfx.pop(); this.keepHearts(); this.abort(); }

  /** The hearts left after a villager's duel stay with the player (a boss fight has hearts of its own). */
  keepHearts() {
    if (this.opp.kind === 'boss') return;
    const left = this.state.party[0].hp;
    Store.updateProfile((p) => setHearts(p, left));
  }

  // ---- The duel loop (shared with the old boss fight) ----------------------------------------------

  pick(i) {
    const s = this.state;
    if (s.locked || s.phase !== 'solve') return;
    const q = s.questions[s.idx];
    s.locked = true; s.picked = i;
    if (q.choices[i] === q.answer) this.strike(q); else this.hurt(q);
  }

  timeUp() {
    const s = this.state;
    if (s.locked) return;
    s.locked = true; s.picked = -1; s.phase = 'solve';
    this.hurt(s.questions[s.idx]);
  }

  strike(q) {
    const s = this.state;
    s.correct += 1; s.oppHp -= 1; s.hit = 'opp';
    this.logQuestion(q, true);
    this.correctFeedback();
    this.cameras.main.shake(140, 0.005);
    this.rebuild();
    this.time.delayedCall(600, () => (s.oppHp <= 0 ? this.end(true) : this.next()));
  }

  /** A wrong or slow answer costs a heart (the player's first, then Mango's) and shows why. */
  hurt(q) {
    const s = this.state;
    const victim = s.party.find((m) => m.hp > 0) || s.party[0];
    victim.hp -= 1; s.hit = 'party:' + victim.id;
    s.missed[q.skill] = (s.missed[q.skill] || 0) + 1;
    this.logQuestion(q, false);
    this.wrongFeedback();
    if (this.partyHp <= 0) s.lost = true;
    this.rebuild();
    if (s.lost) this.time.delayedCall(1100, () => this.end(false));
  }

  next() {
    const s = this.state;
    if (!s.locked) return;
    s.idx += 1;
    if (s.idx >= s.questions.length) return this.end(s.oppHp < this.opp.hp / 2);   // pool exhausted: call it on damage dealt
    s.locked = false; s.picked = null; s.hit = null; s.hidden = []; s.bonusMs = 0; s.phase = 'menu'; s.qStart = Date.now();
    this.rebuild();
  }

  end(won) {
    const s = this.state;
    if (won && !s.defeated) {
      s.defeated = true; s.locked = true; s.phase = 'over';
      Sfx.fanfare();
      this.rebuild();
      this.time.delayedCall(2800, () => this.end(true));
      return;
    }
    this.keepHearts();
    const missedSkills = Object.entries(s.missed).sort((a, b) => b[1] - a[1]).map(([k]) => k);
    const base = { won, hpLeft: Math.max(0, s.oppHp), correct: s.correct, total: s.idx + 1, missedSkills, useDoubleCoins: s.useDoubleCoins, delay: 300 };
    if (this.opp.kind === 'boss') this.finish({ ...base, heartsLeft: Math.max(0, s.party[0].hp), maxHearts: s.party[0].max });
    else this.finish({ ...base, partyHp: this.partyHp, partyMax: this.partyMax });
  }

  onResumed() { const s = this.state; if (Number.isFinite(s.timeLimit)) s.qStart = Date.now() - Math.min(Date.now() - s.qStart, s.timeLimit * 0.5); }

  update() {
    const s = this.state;
    if (this.finished || s.locked || s.phase === 'items' || s.phase === 'over' || !Number.isFinite(s.timeLimit)) return;
    const limit = this.limitFor() + s.bonusMs;
    const left = limit - (Date.now() - s.qStart), ratio = left / limit;
    if (this.timerBar && this.timerBar.active) this.timerBar.set(Math.max(0, ratio), ratio < 0.3 ? THEME.danger : ratio < 0.6 ? THEME.warning : THEME.success);
    const secs = Math.max(0, Math.ceil(left / 1000));
    if (secs !== this.lastSecs && this.timerChip && this.timerChip.active) { this.lastSecs = secs; this.timerChip.setText(`⏱ ${secs}s`); }
    if (left <= 0) this.timeUp();
  }
}
