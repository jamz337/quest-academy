import { MinigameScene } from './MinigameScene.js';
import { THEME, mix } from '../../ui/theme.js';
import { SUBJECTS } from '../../constants.js';
import { bossQuestions } from '../../generators/boss.js';
import { duelQuestions } from '../../generators/duel.js';
import { tuningFor } from '../../data/grades.js';
import { DUEL } from '../../data/world/duels.js';
import { badgeTexture, lookSpriteTexture } from '../../systems/Textures.js';
import { IDLE_FRAMES, LPC_FRAME } from '../../ui/LpcCharacter.js';
import { MONKEY_FRAMES } from '../../ui/FlatCharacter.js';
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
 * first and then Mango's. SOLVE shows the choices, LOGIC hides two wrong ones, ITEMS uses charms and market
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
    const playerHp = boss ? boss.hearts : DUEL.playerHp, mangoHp = boss ? 0 : DUEL.mangoHp;
    const timeLimit = p.timers === false ? Infinity : boss ? boss.questionTimeMs : Math.round(tuningFor(p).questionTimeMs * DUEL.timeFactor);
    return {
      questions: duel ? duelQuestions(duel.gameId, p.grade, this.rng, POOL) : bossQuestions(p.subject, p.grade, this.rng, POOL),
      idx: 0, correct: 0, oppHp: this.opp.hp, phase: 'menu',
      party: [{ id: 'player', name: (profile && profile.name) || 'You', hp: playerHp, max: playerHp }, { id: 'mango', name: 'Mango', hp: mangoHp, max: mangoHp }],
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
    const cx = area.x + area.w / 2;
    const sceneH = this.portrait ? Math.min(area.h * 0.34, 300 * ui) : Math.min(area.h * 0.5, 360 * ui);
    const px = area.x + area.w * 0.22, ox = area.x + area.w * 0.78;
    this.drawScenery(area, sceneH, ox);
    const gy = area.y + sceneH * 0.86;
    const sc = Math.max(2, Math.floor(sceneH * 0.62 / LPC_FRAME));

    // The party: the player faces right with a prop, Mango beside them.
    const profile = this.profile;
    const pKey = lookSpriteTexture(this, resolveLook(profile), outfitOf(profile), outfitId(profile));
    const player = this.add.sprite(px, gy, pKey, IDLE_FRAMES.side).setFlipX(true).setScale(sc).setOrigin(0.5, 1);
    const pProp = this.add.text(px + 15 * sc, gy - 24 * sc, DUEL.playerProp, { fontSize: Math.round(9 * sc) + 'px' }).setOrigin(0.5);
    const mango = this.add.sprite(px - 30 * sc, gy, 'monkey', s.defeated ? MONKEY_FRAMES.cheer : MONKEY_FRAMES.side).setScale(sc).setFlipX(!s.defeated).setOrigin(0.5, 1);   // side view faces left; flipped to face the foe
    if (s.party[1].max > 0 && s.party[1].hp <= 0) mango.setTint(0x9a9a9a);
    if (s.defeated) this.tweens.add({ targets: mango, y: gy - 6 * sc, duration: 260, yoyo: true, repeat: -1, ease: 'Sine.Out' });   // cheering hops

    // The opponent faces left with its prop; a name chip and health bar float above.
    const oKey = opp.kind === 'boss' ? lookSpriteTexture(this, opp.look) : opp.sprite;
    const foe = this.add.sprite(ox, gy, oKey, IDLE_FRAMES.side).setScale(sc * opp.scale).setOrigin(0.5, 1);
    const oProp = this.add.text(ox - 15 * sc * opp.scale, gy - 24 * sc * opp.scale, opp.prop, { fontSize: Math.round(9 * sc) + 'px' }).setOrigin(0.5);
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
    } else if (s.hit && s.hit.startsWith('party')) {
      const victim = s.hit.endsWith('mango') ? mango : player;
      this.tweens.add({ targets: foe, x: ox - 26 * ui, yoyo: true, duration: 120, ease: 'Sine.Out' });
      this.tweens.add({ targets: victim, x: victim.x - 8, yoyo: true, repeat: 3, duration: 40 });
      victim.setTint(0xff5c6c); this.time.delayedCall(220, () => { if (victim.active && !s.lost) victim.clearTint(); });
      this.floatHit(victim.x, victim.y - 50 * sc);
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
    const box = this.portrait
      ? { x: area.x, y: area.y + sceneH + gap, w: area.w, h: Math.min(150 * ui, area.h * 0.2) }
      : { x: cx - area.w * 0.22, y: area.y + 66 * ui, w: area.w * 0.44, h: sceneH - 80 * ui };
    panel(this, box.x, box.y, box.w, box.h, { color: THEME.surface, alpha: 0.93, radius: THEME.radius.lg, shadow: 'md' });
    text(this, box.x + box.w / 2, box.y + 16 * ui, `${(SUBJECTS[this.payload.subject]?.title || 'QUEST').toUpperCase()} DUEL PUZZLE`, T.caption(this, THEME.ink2));
    const lines = q.prompt.split('\n').length;
    const size = lines > 3 ? 13 : q.prompt.length > 28 ? 16 : q.prompt.length > 12 ? 22 : 28;
    const question = readable(this, box.x + box.w / 2, box.y + box.h / 2 + 4 * ui, q.prompt, T.at(this, size, THEME.ink, { fontStyle: lines > 3 ? '500' : '700' }), { width: box.w - 32, align: lines > 3 ? 'left' : 'center' });
    speakButton(this, box.x + box.w - 22 * ui, box.y + 18 * ui, 34 * ui, question, { rate: this.speechRate * (opp.rate || 1), pitch: opp.pitch || 1, voice: opp.voice, speaker: opp.id });
    this.autoRead(question);
    this.timerBar = new ProgressBar(this, box.x + box.w / 2, box.y + box.h - 10 * ui, box.w - 40, 6 * ui, { color: THEME.success, value: 1 });
    if (!Number.isFinite(s.timeLimit)) this.timerBar.setVisible(false);

    // The bottom band: the party on the left, commands on the right.
    const top = (this.portrait ? box.y + box.h : area.y + sceneH) + gap;
    const bandH = area.y + area.h - top;
    const partyW = this.portrait ? area.w * 0.44 : Math.min(area.w * 0.34, 300 * ui);
    this.drawParty(area.x, top, partyW, bandH);
    const cmd = { x: area.x + partyW + gap, y: top, w: area.w - partyW - gap, h: bandH };
    if (s.phase === 'items') this.drawItems(cmd); else this.drawCommands(cmd, q);
    if (s.hit && s.hit.startsWith('party') && this.partyHp > 0 && s.locked) this.explanationPanel(area, q, () => this.next());
  }

  /** Sky, meadow, sun and clouds, and the opponent's house behind them. */
  drawScenery(area, sceneH, houseX) {
    const ui = this.ui, sub = this.subject;
    const g = this.add.graphics();
    const r = THEME.radius.lg;
    // Sky: a rounded top in the deepest blue, then horizontal bands fading to the horizon (a gradient fill would
    // show a diagonal seam across the rounded rect).
    const skyH = sceneH * 0.62, bands = 8;
    g.fillStyle(0x9fdcff, 1); g.fillRoundedRect(area.x, area.y, area.w, skyH, { tl: r, tr: r, bl: 0, br: 0 });
    for (let i = 1; i < bands; i++) {
      const t = i / bands;
      g.fillStyle(mix(0x9fdcff, 0xe6f7ff, t), 1); g.fillRect(area.x, area.y + r + (skyH - r) * t, area.w, (skyH - r) / bands + 1);
    }
    g.fillStyle(0xffe27a, 1); g.fillCircle(area.x + area.w * 0.12, area.y + sceneH * 0.2, 16 * ui);
    g.fillStyle(0xffffff, 0.9);
    for (const [fx, fy, fr] of [[0.32, 0.16, 12], [0.36, 0.18, 16], [0.41, 0.16, 11], [0.62, 0.26, 10], [0.66, 0.27, 14], [0.7, 0.25, 9]]) g.fillCircle(area.x + area.w * fx, area.y + sceneH * fy, fr * ui);
    // The house: wall in the subject's soft colour, roof in its dark one.
    const hw = Math.min(area.w * 0.36, 220 * ui), hh = sceneH * 0.5, hx = houseX - hw / 2, hy = area.y + sceneH * 0.62 - hh;
    g.fillStyle(sub.dark, 1); g.fillTriangle(hx - 10, hy + hh * 0.3, houseX, hy - 8, hx + hw + 10, hy + hh * 0.3);
    g.fillStyle(sub.soft, 1); g.fillRect(hx, hy + hh * 0.3, hw, hh * 0.7);
    g.fillStyle(0x8a5a3a, 1); g.fillRoundedRect(houseX - hw * 0.09, hy + hh * 0.55, hw * 0.18, hh * 0.45, { tl: 8, tr: 8, bl: 0, br: 0 });
    g.fillStyle(0xbfe6ff, 1); g.fillRect(hx + hw * 0.12, hy + hh * 0.45, hw * 0.18, hh * 0.22); g.fillRect(hx + hw * 0.7, hy + hh * 0.45, hw * 0.18, hh * 0.22);
    g.lineStyle(2, THEME.ink, 0.25); g.strokeRect(hx + hw * 0.12, hy + hh * 0.45, hw * 0.18, hh * 0.22); g.strokeRect(hx + hw * 0.7, hy + hh * 0.45, hw * 0.18, hh * 0.22);
    // The meadow and a sandy path.
    g.fillStyle(0x7ed36b, 1); g.fillRoundedRect(area.x, area.y + sceneH * 0.62, area.w, sceneH * 0.38, { tl: 0, tr: 0, bl: r, br: r });
    g.fillStyle(0x5cb85c, 1); g.fillRect(area.x, area.y + sceneH * 0.62, area.w, 4 * ui);
    g.fillStyle(0xe8c986, 1); g.fillEllipse(area.x + area.w / 2, area.y + sceneH * 0.88, area.w * 0.7, sceneH * 0.16);
    g.fillStyle(0xffffff, 0.8);
    for (let i = 0; i < 7; i++) g.fillCircle(area.x + area.w * (0.05 + i * 0.15), area.y + sceneH * (0.7 + (i % 2) * 0.24), 2.5 * ui);
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
      const key = m.id === 'player' ? badgeTexture(this, resolveLook(profile), outfitOf(profile), outfitId(profile)) : 'monkey-face';
      const img = this.add.image(-w / 2 + 10 + size / 2, ry, key, 0).setDisplaySize(size, size);
      if (m.max > 0 && m.hp <= 0) img.setTint(0x9a9a9a);
      const tx = -w / 2 + 18 + size;
      const name = this.add.text(tx, ry - rowH * 0.28, m.name.toUpperCase(), T.at(this, 13, THEME.ink, { fontStyle: '700' })).setOrigin(0, 0.5);
      const bw = w - size - 40;
      if (m.max > 0) {
        const ratio = Math.max(0, m.hp) / m.max;
        const hp = this.add.text(tx, ry, `♥ ${Math.max(0, m.hp)}/${m.max}`, T.at(this, 12, THEME.ink2)).setOrigin(0, 0.5);
        const bar = new ProgressBar(this, tx + bw / 2, ry + rowH * 0.28, bw, 8 * ui, { value: ratio, color: ratio > 0.6 ? THEME.success : ratio > 0.3 ? THEME.warning : THEME.danger });
        k.add([img, name, hp, bar]);
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
    if (s.phase === 'solve') {
      buttons = q.choices.map((choice, i) => {
        const c = cells[i]; if (!c) return null;
        if (s.hidden.includes(i)) return button(this, c.x, c.y, c.w, c.h, '—', { variant: 'ghost', disabled: true });
        const opts = { variant: 'secondary', fontSize: choice.length > 8 ? 15 : 22, radius: THEME.radius.md, onClick: () => this.pick(i) };
        if (s.picked !== null) { if (choice === q.answer) opts.variant = 'success'; else if (i === s.picked) opts.variant = 'danger'; }
        const b = button(this, c.x, c.y, c.w, c.h, choice, opts);
        if (s.picked !== null && choice !== q.answer && i !== s.picked) b.setAlpha(0.45);
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

  floatHit(x, y) {
    const dmg = this.add.text(x, y, '−1', T.at(this, 22, THEME.danger, { fontStyle: '700' })).setOrigin(0.5).setDepth(15);
    this.tweens.add({ targets: dmg, y: y - 50 * this.ui, alpha: 0, duration: 700, ease: 'Cubic.easeOut' });
  }

  clockText() {
    const s = this.state;
    if (!Number.isFinite(s.timeLimit)) return '⏱ no clock';
    const left = Math.max(0, s.timeLimit + s.bonusMs - (Date.now() - s.qStart));
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

  run() { if (this.state.locked) return; Sfx.pop(); this.abort(); }

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
    const missedSkills = Object.entries(s.missed).sort((a, b) => b[1] - a[1]).map(([k]) => k);
    const base = { won, hpLeft: Math.max(0, s.oppHp), correct: s.correct, total: s.idx + 1, missedSkills, useDoubleCoins: s.useDoubleCoins, delay: 300 };
    if (this.opp.kind === 'boss') this.finish({ ...base, heartsLeft: Math.max(0, s.party[0].hp), maxHearts: s.party[0].max });
    else this.finish({ ...base, partyHp: this.partyHp, partyMax: this.partyMax });
  }

  onResumed() { const s = this.state; if (Number.isFinite(s.timeLimit)) s.qStart = Date.now() - Math.min(Date.now() - s.qStart, s.timeLimit * 0.5); }

  update() {
    const s = this.state;
    if (this.finished || s.locked || s.phase === 'items' || s.phase === 'over' || !Number.isFinite(s.timeLimit)) return;
    const limit = s.timeLimit + s.bonusMs;
    const left = limit - (Date.now() - s.qStart), ratio = left / limit;
    if (this.timerBar && this.timerBar.active) this.timerBar.set(Math.max(0, ratio), ratio < 0.3 ? THEME.danger : ratio < 0.6 ? THEME.warning : THEME.success);
    const secs = Math.max(0, Math.ceil(left / 1000));
    if (secs !== this.lastSecs && this.timerChip && this.timerChip.active) { this.lastSecs = secs; this.timerChip.setText(`⏱ ${secs}s`); }
    if (left <= 0) this.timeUp();
  }
}
