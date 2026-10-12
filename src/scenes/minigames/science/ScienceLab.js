import { PictureQuiz } from '../PictureQuiz.js';
import { THEME, hex } from '../../../ui/theme.js';
import { scienceSet, scienceQuestion } from '../../../generators/science/questions.js';
import { grid } from '../../../systems/Layout.js';
import { FONT, WEIGHT } from '../../../ui/TextStyles.js';
import { Sfx } from '../../../systems/Audio.js';
import { button } from '../../../ui/Button.js';
import { draggable, nearestTarget } from '../../../ui/Drag.js';

const WATER = 0x5ec8e6, WATER_DARK = 0x2f9bc4, TUB = 0xe9f6f9, SOIL = 0x8a5a2b, POT = 0xc9714a, SKY = 0xe4f6f8;
const PLANT_STAGES = ['🌰', '🌱', '🌿', '🪴', '🌻', '🍎'];
// How each home looks on Habitat Match's boards: sky colour, ground colour, a thing that grows there, and whether its name needs dark ink.
const HOME_LOOK = {
  ocean: [0x4f8fd6, 0x2c5f9e, '🪸', false], desert: [0xf7d58a, 0xe3a857, '🌵', true], rainforest: [0x3fae5a, 0x1f7a3a, '🌴', false], polar: [0xe6f3ff, 0xb9dcf5, '🧊', true],
  savanna: [0xe8d37a, 0xb9a24a, '🌳', true], pond: [0x8fd4c3, 0x4fa894, '🪷', true], forest: [0x4f9a4f, 0x2f6b34, '🌲', false], farm: [0xcfe39a, 0xa8c46a, '🌾', true]
};
const cap = (str) => str.charAt(0).toUpperCase() + str.slice(1);

/**
 * Science Springs' four games in one lab: Habitat Match, Plant Power, Sink or Float and States of Matter. Each is a
 * picture question with big answers, read aloud, a second try on a miss and an explanation; a "bench" along the top
 * shows the learning happening: animals settling into their habitats, a plant growing a stage per right answer,
 * things dropping into a tub and sinking or floating, items sorted into solid, liquid and gas.
 */
export class ScienceLab extends PictureQuiz {
  constructor() { super('MG_ScienceLab'); }

  get hasBench() { return true; }
  makeSet(n, targets) { return scienceSet(this.gameId, this.payload.grade, this.rng, n, targets); }
  makeOne(d) { return scienceQuestion(this.gameId, this.payload.grade, this.rng, d); }

  /** The bench: a different little scene per game, filled by the right answers so far (`state.bench`). */
  drawBench(r) {
    const ui = this.ui, s = this.state, id = this.gameId;
    const g = this.add.graphics();
    g.fillStyle(SKY, 1); g.fillRoundedRect(r.x, r.y, r.w, r.h, 16);
    g.lineStyle(2, this.subject.soft, 1); g.strokeRoundedRect(r.x, r.y, r.w, r.h, 16);
    const fs = (px) => ({ fontSize: Math.round(px) + 'px' });
    if (id === 'sci-float') {
      // A tub of water: floaters bob on top, sinkers lie on the bottom.
      const tx = r.x + 16 * ui, tw = r.w - 32 * ui, ty = r.y + 14 * ui, th = r.h - 22 * ui;
      g.fillStyle(TUB, 1); g.fillRoundedRect(tx, ty, tw, th, 10 * ui);
      g.fillStyle(WATER, 0.85); g.fillRoundedRect(tx + 4 * ui, ty + th * 0.3, tw - 8 * ui, th * 0.7 - 4 * ui, { tl: 2, tr: 2, bl: 8 * ui, br: 8 * ui });
      g.lineStyle(2 * ui, WATER_DARK, 0.6); g.lineBetween(tx + 6 * ui, ty + th * 0.3, tx + tw - 6 * ui, ty + th * 0.3);
      const floats = s.bench.filter((b) => b.floats), sinks = s.bench.filter((b) => !b.floats);
      const size = Math.min(24 * ui, tw / 12);
      floats.forEach((b, i) => { const t = this.add.text(tx + 14 * ui + i * size * 1.2, ty + th * 0.3 - 2 * ui, b.pic, fs(size)).setOrigin(0.5, 0.75); if (this.tweens) this.tweens.add({ targets: t, y: t.y - 3 * ui, duration: 700 + i * 90, yoyo: true, repeat: -1, ease: 'Sine.InOut' }); });
      sinks.forEach((b, i) => this.add.text(tx + 14 * ui + i * size * 1.2, ty + th - 10 * ui, b.pic, fs(size)).setOrigin(0.5, 0.8));
      this.tub = { x: tx, y: ty, w: tw, h: th, surface: ty + th * 0.3 };
    } else if (id === 'sci-plants') {
      // A plant that grows a stage with each right answer.
      const stage = Math.min(PLANT_STAGES.length - 1, Math.floor((s.bench.length / Math.max(1, this.total)) * (PLANT_STAGES.length - 1) + 0.001));
      const px = r.x + r.w / 2, base = r.y + r.h - 10 * ui;
      g.fillStyle(POT, 1); g.fillRoundedRect(px - 22 * ui, base - 18 * ui, 44 * ui, 18 * ui, { tl: 4, tr: 4, bl: 8, br: 8 });
      g.fillStyle(SOIL, 1); g.fillRect(px - 20 * ui, base - 20 * ui, 40 * ui, 5 * ui);
      this.add.text(px, base - 22 * ui, PLANT_STAGES[stage], fs(Math.min(44 * ui, r.h - 30 * ui))).setOrigin(0.5, 1);
      this.add.text(r.x + 16 * ui, r.y + r.h / 2, `🌞 ${s.bench.length} right`, { fontFamily: FONT, fontSize: Math.round(13 * ui) + 'px', color: hex(THEME.ink2), fontStyle: WEIGHT.bold }).setOrigin(0, 0.5);
      this.add.text(r.x + r.w - 16 * ui, r.y + r.h / 2, `${'💧'.repeat(Math.min(5, s.bench.length))}`, fs(14 * ui)).setOrigin(1, 0.5);
    } else if (id === 'sci-matter') {
      // Three jars: solid, liquid, gas.
      const names = [['solid', '🧊'], ['liquid', '💧'], ['gas', '💨']];
      const cells = grid({ x: r.x + 10 * ui, y: r.y + 8 * ui, w: r.w - 20 * ui, h: r.h - 16 * ui }, 3, 1, 8 * ui);
      names.forEach(([st, pic], i) => {
        const c = cells[i];
        g.fillStyle(0xffffff, 0.9); g.fillRoundedRect(c.x - c.w / 2, c.y - c.h / 2, c.w, c.h, 10 * ui);
        this.add.text(c.x, c.y - c.h / 2 + 10 * ui, `${pic} ${st}`, { fontFamily: FONT, fontSize: Math.round(12 * ui) + 'px', color: hex(THEME.ink2), fontStyle: WEIGHT.bold }).setOrigin(0.5, 0);
        const mine = s.bench.filter((b) => b.state === st).slice(-5);
        mine.forEach((b, k) => this.add.text(c.x + (k - (mine.length - 1) / 2) * 20 * ui, c.y + c.h * 0.22, b.pic, fs(18 * ui)).setOrigin(0.5));
      });
    } else {
      // Habitats: a row of homes, each gathering the animals matched to it.
      const homes = ['🌊', '🏜️', '🌴', '❄️', '🌾', '🪷', '🌲', '🚜'];
      const cells = grid({ x: r.x + 8 * ui, y: r.y + 6 * ui, w: r.w - 16 * ui, h: r.h - 12 * ui }, homes.length, 1, 4 * ui);
      homes.forEach((h, i) => {
        const c = cells[i];
        g.fillStyle(0xffffff, 0.9); g.fillRoundedRect(c.x - c.w / 2, c.y - c.h / 2, c.w, c.h, 8 * ui);
        this.add.text(c.x, c.y - c.h / 2 + 4 * ui, h, fs(Math.min(18 * ui, c.w * 0.6))).setOrigin(0.5, 0);
        const mine = s.bench.filter((b) => b.homePic === h).slice(-3);
        mine.forEach((b, k) => this.add.text(c.x, c.y + c.h / 2 - 6 * ui - k * 12 * ui, b.pic, fs(Math.min(14 * ui, c.w * 0.5))).setOrigin(0.5, 1));
      });
    }
  }

  // ---- Habitat Match, hands on --------------------------------------------------------------------------------

  boardFor(q) { return q.release ? this.buildRelease : q.survive ? this.buildSurvive : q.chain ? this.buildChain : null; }
  newInter(q) {
    return q.release ? { home: q.release.animals.map(() => false), sel: null, hint: null }
      : q.survive ? { given: [], hint: null } : q.chain ? { slots: q.chain.links.map(() => null), sel: null, wrong: [], hint: null } : { hint: null };
  }

  /** The next move that solves each board, for the New Skill demo's hand (and its pointing when a child waits). */
  demoNext(q, st) {
    if (q.release) { const i = q.release.animals.findIndex((a, k) => !st.home[k]); if (i < 0) return null; const a = q.release.animals[i]; return { from: `animal:${i}`, to: `home:${a.home}`, run: () => this.releaseDrop(i, a.home) }; }
    if (q.survive) { const i = q.survive.tray.findIndex((t, k) => t.owner === q.survive.name && !st.given.includes(k)); return i < 0 ? null : { from: `tray:${i}`, to: 'animal', run: () => this.surviveGive(i) }; }
    if (q.chain) { const i = st.slots.findIndex((v, k) => v !== k); return i < 0 ? { from: 'check', run: () => this.chainCheck() } : { from: `card:${i}`, to: `slot:${i}`, run: () => this.chainPlace(i, i) }; }
    return null;
  }

  /** A home drawn as a little scene: its sky, its ground, something that grows there and its name. */
  drawHome(g, home, x, y, w, h) {
    const ui = this.ui, look = HOME_LOOK[home.id] || HOME_LOOK.farm;
    g.fillStyle(look[0], 1); g.fillRoundedRect(x, y, w, h, 12);
    g.fillStyle(look[1], 1); g.fillRoundedRect(x, y + h * 0.62, w, h * 0.38, { tl: 0, tr: 0, bl: 12, br: 12 });
    this.add.text(x + Math.min(20 * ui, w * 0.18), y + h - Math.min(18 * ui, h * 0.2), look[2], { fontSize: Math.round(Math.min(24 * ui, h * 0.26)) + 'px' }).setOrigin(0.5);
    this.add.text(x + w / 2, y + 6 * ui, home.name, { fontFamily: FONT, fontSize: Math.round(Math.max(10, Math.min(13 * ui, w / 9))) + 'px', color: look[3] ? hex(THEME.ink) : '#ffffff', fontStyle: WEIGHT.bold }).setOrigin(0.5, 0);
  }

  /** Rescue and release: the homes above, Ranger Rio's truck of animals below; drag (or tap, then tap a home) each one home. */
  buildRelease(board, q, answered) {
    const ui = this.ui, st = this.interState(), R = q.release, s = this.state;
    const hintH = 34 * ui, crateH = Math.max(64, Math.min(86 * ui, board.h * 0.2)), gap = 6 * ui;
    const n = R.homes.length, cols = n <= 3 ? n : n === 4 ? 2 : 3, rows = Math.ceil(n / cols);
    const gh = board.h - hintH - crateH - 10, cw = (board.w - 8 - gap * (cols - 1)) / cols, ch = (gh - gap * (rows - 1)) / rows;
    const g = this.add.graphics();
    const cells = R.homes.map((home, i) => ({ home, x: board.x + 4 + (i % cols) * (cw + gap), y: board.y + Math.floor(i / cols) * (ch + gap) }));
    cells.forEach((c) => {
      this.mark(`home:${c.home.id}`, c.x + cw / 2, c.y + ch / 2);
      this.drawHome(g, c.home, c.x, c.y, cw, ch);
      if (!answered) this.add.zone(c.x + cw / 2, c.y + ch / 2, cw, ch).setInteractive({ useHandCursor: true }).on('pointerdown', () => { if (st.sel !== null) this.releaseDrop(st.sel, c.home.id); });
    });
    // The animals already home move about in it (all of them once the round is over).
    const size = Math.round(Math.max(24, Math.min(40 * ui, ch * 0.42)));
    R.animals.forEach((a, i) => {
      if (!st.home[i] && !answered) return;
      const c = cells.find((x) => x.home.id === a.home);
      if (!c) return;
      const t = this.add.text(c.x + cw / 2, c.y + ch * 0.55, a.pic, { fontSize: size + 'px' }).setOrigin(0.5);
      if (!this.tweens) return;
      if (a.move === 'swing') { t.y = c.y + ch * 0.42; this.tweens.add({ targets: t, angle: { from: -18, to: 18 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' }); }
      else if (a.move === 'hop') this.tweens.add({ targets: t, y: t.y - ch * 0.14, duration: 380, yoyo: true, repeat: -1, ease: 'Quad.Out' });
      else if (a.move === 'fly') { t.y = c.y + ch * 0.4; this.tweens.add({ targets: t, y: t.y - ch * 0.1, x: t.x + cw * 0.2, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.InOut' }); }
      else this.tweens.add({ targets: t, x: t.x + cw * 0.22 * (a.move === 'swim' ? 1 : 0.7), duration: a.move === 'swim' ? 1500 : 2200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    });
    // Ranger Rio's truck.
    const ty = board.y + gh + 6;
    g.fillStyle(0xc9a26b, 1); g.fillRoundedRect(board.x + 4, ty, board.w - 8, crateH, 12);
    this.add.text(board.x + 14 * ui, ty + 5 * ui, "Ranger Rio's truck", { fontFamily: FONT, fontSize: Math.round(11 * ui) + 'px', color: hex(0x5b4630), fontStyle: WEIGHT.bold });
    const waiting = R.animals.map((a, i) => i).filter((i) => !st.home[i]);
    if (!answered) waiting.forEach((i) => {
      // Each animal keeps its own spot in the truck, so the others don't slide about as they leave.
      const m = R.animals.length, a = R.animals[i], x = board.x + board.w / 2 + (i - (m - 1) / 2) * Math.min(90 * ui, (board.w - 40) / m), y = ty + crateH * 0.58;
      this.mark(`animal:${i}`, x, y);
      if (st.sel === i) { g.fillStyle(0xffffff, 0.75); g.fillCircle(x, y, size * 0.75); g.lineStyle(3, this.subject.accent, 1); g.strokeCircle(x, y, size * 0.75); }
      const t = this.add.text(x, y - 6 * ui, a.pic, { fontSize: Math.round(size * 1.05) + 'px' }).setOrigin(0.5);
      this.add.text(x, ty + crateH - 4 * ui, a.name, { fontFamily: FONT, fontSize: Math.round(11 * ui) + 'px', color: hex(0x3d2e1f), fontStyle: WEIGHT.bold }).setOrigin(0.5, 1);
      draggable(this, t, {
        onTap: () => this.releasePick(i),
        onDrop: (px, py) => { const c = cells.find((cc) => px > cc.x && px < cc.x + cw && py > cc.y && py < cc.y + ch); if (!c) return false; this.releaseDrop(i, c.home.id); return true; }
      });
    });
    const line = answered ? (s.right ? 'Every animal is home! ⭐' : 'Here is where each animal lives.') : st.hint || (st.sel !== null ? `Now tap the ${R.animals[st.sel].name}'s home.` : 'Drag each animal to its home, or tap it, then tap its home.');
    this.hintLine(board, ty + crateH + 6 * ui, line, answered ? s.right : st.hint ? false : null);
  }

  releasePick(i) {
    const s = this.state, q = this.round;
    if (!q || !q.release || s.locked || s.picked !== null) return;
    const st = this.interState();
    st.sel = st.sel === i ? null : i; st.hint = null;
    if (st.sel !== null) this.sayHint(`The ${q.release.animals[i].name}.`);
    Sfx.lift(); this.rebuild();
  }

  /** An animal put in a home: its own home keeps it; any other is a try again, with what that home is like. */
  releaseDrop(i, homeId) {
    const s = this.state, q = this.round;
    if (!q || !q.release || s.locked || s.picked !== null) return;
    const st = this.interState(), R = q.release, a = R.animals[i];
    if (!a || st.home[i]) return;
    st.sel = null;
    if (a.home === homeId) {
      st.home[i] = true; st.hint = null; Sfx.pop();
      if (st.home.every(Boolean)) return this.pick(0);
      return this.rebuild();
    }
    const h = R.homes.find((x) => x.id === homeId);
    st.hint = `Not ${h.name}: that is ${h.desc}. Where does the ${a.name} live?`;
    this.sayHint(st.hint);
    this.pick(1);
  }

  /** Help it survive: the animal in its new home with a thermometer, and a tray of things; drag (or tap) the two it needs onto it. */
  buildSurvive(board, q, answered) {
    const ui = this.ui, st = this.interState(), S = q.survive, s = this.state;
    const hintH = 34 * ui, itemH = Math.max(34, 40 * ui), gap = 6 * ui, cols = 2, rows = Math.ceil(S.tray.length / cols);
    const trayH = rows * itemH + (rows - 1) * gap, sceneH = Math.max(110, board.h - hintH - trayH - 14);
    const sx = board.x + 4, sw = board.w - 8, look = HOME_LOOK[S.home.id] || HOME_LOOK.farm;
    const g = this.add.graphics();
    g.fillStyle(look[0], 1); g.fillRoundedRect(sx, board.y, sw, sceneH, 14);
    g.fillStyle(look[1], 1); g.fillRoundedRect(sx, board.y + sceneH * 0.66, sw, sceneH * 0.34, { tl: 0, tr: 0, bl: 14, br: 14 });
    this.add.text(sx + 26 * ui, board.y + sceneH - 22 * ui, look[2], { fontSize: Math.round(Math.min(30 * ui, sceneH * 0.2)) + 'px' }).setOrigin(0.5);
    this.add.text(sx + 10 * ui, board.y + 8 * ui, S.home.name, { fontFamily: FONT, fontSize: Math.round(12 * ui) + 'px', color: look[3] ? hex(THEME.ink) : '#ffffff', fontStyle: WEIGHT.bold });
    // The thermometer.
    const tx = sx + sw - 22 * ui, tTop = board.y + 18 * ui, tH = sceneH * 0.62, f = Math.max(0.06, Math.min(1, (S.temp + 40) / 90));
    g.fillStyle(0xffffff, 1); g.fillRoundedRect(tx - 8 * ui, tTop, 16 * ui, tH, 8 * ui); g.lineStyle(1.5, 0x9aa3ad, 1); g.strokeRoundedRect(tx - 8 * ui, tTop, 16 * ui, tH, 8 * ui);
    g.fillStyle(S.temp < 0 ? 0x3f8fe0 : S.temp > 35 ? 0xe5383b : 0xf0a030, 1); g.fillRoundedRect(tx - 5 * ui, tTop + tH - 4 * ui - f * (tH - 8 * ui), 10 * ui, f * (tH - 8 * ui), 5 * ui);
    this.add.text(tx, tTop + tH + 4 * ui, `${S.temp}°C`, { fontFamily: FONT, fontSize: Math.round(11 * ui) + 'px', color: look[3] ? hex(THEME.ink) : '#ffffff', fontStyle: WEIGHT.bold }).setOrigin(0.5, 0);
    // The animal, cheerful once it has what it needs.
    const happy = st.given.length >= 2 || (answered && s.right), acx = sx + sw * 0.45, acy = board.y + sceneH * 0.42, asz = Math.round(Math.min(sceneH * 0.42, 86 * ui));
    const animal = this.add.text(acx, acy, S.pic, { fontSize: asz + 'px' }).setOrigin(0.5);
    this.mark('animal', acx, acy);
    if (happy && this.tweens) this.tweens.add({ targets: animal, y: acy - 6 * ui, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.add.text(acx + asz * 0.62, acy - asz * 0.5, happy ? '😊' : S.temp < 0 ? '🥶' : S.temp > 35 ? '🥵' : '😟', { fontSize: Math.round(asz * 0.32) + 'px' }).setOrigin(0.5);
    const shown = answered ? S.tray.map((t, i) => i).filter((i) => S.tray[i].owner === S.name) : st.given;
    shown.forEach((i, k) => {
      const t = S.tray[i], w = Math.min(sw * 0.42, 170 * ui), x = acx + (k - (shown.length - 1) / 2) * (w + 6 * ui), y = board.y + sceneH * 0.82;
      g.fillStyle(0xffffff, 0.9); g.fillRoundedRect(x - w / 2, y - 14 * ui, w, 28 * ui, 10);
      this.add.text(x, y, `${t.pic} ${t.text}`, { fontFamily: FONT, fontSize: Math.round(Math.max(9, 11 * ui)) + 'px', color: hex(THEME.ink), fontStyle: WEIGHT.bold, wordWrap: { width: w - 8 }, align: 'center' }).setOrigin(0.5);
    });
    const onAnimal = (x, y) => x > sx && x < sx + sw && y > board.y && y < board.y + sceneH;
    // The tray.
    const iw = (sw - gap) / cols, ty = board.y + sceneH + 8;
    S.tray.forEach((t, i) => {
      if (st.given.includes(i) || answered) return;
      const x = sx + (i % cols) * (iw + gap) + iw / 2, y = ty + Math.floor(i / cols) * (itemH + gap) + itemH / 2;
      this.mark(`tray:${i}`, x, y);
      const bg = this.add.graphics(); bg.fillStyle(0xeef2f8, 1); bg.fillRoundedRect(-iw / 2, -itemH / 2, iw, itemH, 10); bg.lineStyle(1.5, 0xc7d0e0, 1); bg.strokeRoundedRect(-iw / 2, -itemH / 2, iw, itemH, 10);
      const pic = this.add.text(-iw / 2 + 18 * ui, 0, t.pic, { fontSize: Math.round(Math.min(20 * ui, itemH * 0.5)) + 'px' }).setOrigin(0.5);
      const words = this.add.text(-iw / 2 + 34 * ui, 0, t.text, { fontFamily: FONT, fontSize: Math.round(Math.max(9, Math.min(12 * ui, iw / 15))) + 'px', color: hex(THEME.ink), fontStyle: WEIGHT.bold, wordWrap: { width: iw - 40 * ui } }).setOrigin(0, 0.5);
      const box = this.add.container(x, y, [bg, pic, words]).setSize(iw, itemH);
      draggable(this, box, { onTap: () => this.surviveGive(i), onDrop: (px, py) => { if (!onAnimal(px, py)) return false; this.surviveGive(i); return true; } });
    });
    const line = answered ? (s.right ? `The ${S.name} can live in ${S.home.name}! ⭐` : `A ${S.name} needs these to live in ${S.home.name}.`) : st.hint || `Drag the two things a ${S.name} needs onto it, or tap them.`;
    this.hintLine(board, ty + trayH + 6 * ui, line, answered ? s.right : st.hint ? false : null);
  }

  surviveGive(i) {
    const s = this.state, q = this.round;
    if (!q || !q.survive || s.locked || s.picked !== null) return;
    const st = this.interState(), S = q.survive, t = S.tray[i];
    if (!t || st.given.includes(i)) return;
    if (t.owner === S.name) {
      st.given.push(i); st.hint = null; Sfx.pop();
      if (st.given.length >= 2) return this.pick(0);
      return this.rebuild();
    }
    st.hint = `${cap(t.text)} helps a ${t.owner} in ${t.home}, not a ${S.name} in ${S.home.name}.`;
    this.sayHint(st.hint);
    this.pick(1);
  }

  /** Build the food chain: the sun, then empty boxes joined by arrows; drag (or tap, then tap a box) each living thing into place, then Check. */
  buildChain(board, q, answered) {
    const ui = this.ui, st = this.interState(), C = q.chain, s = this.state, n = C.links.length;
    const hintH = 34 * ui, btnH = 42 * ui, step = (board.w - 8) / (n + 1), box = Math.min(step - 12 * ui, 84 * ui, board.h * 0.24);
    // Centred a little high in the space, so a tall phone screen isn't all gap below.
    const cardH0 = Math.max(52, Math.min(66 * ui, box * 0.9)), content = box + 34 * ui + cardH0 + 12 * ui + btnH + hintH + 30 * ui;
    const rowY = board.y + 8 * ui + box / 2 + Math.max(0, (board.h - content) / 3), x0 = board.x + 4 + step / 2;
    const g = this.add.graphics();
    const order = answered ? C.links.map((_, i) => i) : st.slots;
    // The sun, the arrows (gold once the chain is built), and the boxes.
    this.add.text(x0, rowY - 6 * ui, '☀️', { fontSize: Math.round(box * 0.55) + 'px' }).setOrigin(0.5);
    this.add.text(x0, rowY + box / 2 + 4 * ui, 'the sun', { fontFamily: FONT, fontSize: Math.round(11 * ui) + 'px', color: hex(0xb37400), fontStyle: WEIGHT.bold }).setOrigin(0.5, 0);
    for (let i = 0; i < n; i++) {
      const a = x0 + step * i + (i === 0 ? box * 0.36 : box / 2), b = x0 + step * (i + 1) - box / 2 - 2;
      const flow = answered && s.right;
      g.lineStyle(5 * ui, flow ? 0xffb000 : 0xc7d0e0, 1); g.lineBetween(a, rowY, b - 9 * ui, rowY);
      g.fillStyle(flow ? 0xffb000 : 0xc7d0e0, 1); g.fillTriangle(b, rowY, b - 11 * ui, rowY - 7 * ui, b - 11 * ui, rowY + 7 * ui);
    }
    const slots = C.links.map((_, i) => ({ x: x0 + step * (i + 1), y: rowY }));
    slots.forEach((sl, i) => {
      const ci = order[i], bad = !answered && st.wrong.includes(i);
      this.mark(`slot:${i}`, sl.x, sl.y);
      if (ci !== null) this.mark(`card:${ci}`, sl.x, sl.y);
      g.fillStyle(ci !== null ? 0xffffff : 0xeef2f8, 1); g.fillRoundedRect(sl.x - box / 2, sl.y - box / 2, box, box, 12);
      g.lineStyle(bad ? 4 : 2, bad ? THEME.danger : 0xc7d0e0, 1); g.strokeRoundedRect(sl.x - box / 2, sl.y - box / 2, box, box, 12);
      this.add.text(sl.x, sl.y + box / 2 + 4 * ui, C.links[i].role, { fontFamily: FONT, fontSize: Math.round(Math.max(9, 11 * ui)) + 'px', color: hex(THEME.ink2), fontStyle: WEIGHT.bold }).setOrigin(0.5, 0);
      if (ci !== null) {
        const l = C.links[ci];
        this.add.text(sl.x, sl.y - box * 0.1, l.pic, { fontSize: Math.round(box * 0.42) + 'px' }).setOrigin(0.5);
        this.add.text(sl.x, sl.y + box * 0.3, l.name, { fontFamily: FONT, fontSize: Math.round(Math.max(8, Math.min(11 * ui, box / 7))) + 'px', color: hex(THEME.ink), fontStyle: WEIGHT.bold, wordWrap: { width: box - 6 }, align: 'center' }).setOrigin(0.5);
      }
      if (!answered) this.add.zone(sl.x, sl.y, box, box).setInteractive({ useHandCursor: true }).on('pointerdown', () => { if (st.sel !== null) this.chainPlace(st.sel, i); else if (st.slots[i] !== null) this.chainTake(i); });
    });
    // The cards still to place.
    const cardsY = rowY + box / 2 + 34 * ui, cardW = Math.min((board.w - 8 - 8 * ui * (n - 1)) / n, 110 * ui), cardH = cardH0;
    const loose = answered ? [] : C.cards.filter((ci) => !st.slots.includes(ci));
    loose.forEach((ci) => {
      // Each card keeps its own spot in the row, so the others don't slide about as cards are placed.
      const k = C.cards.indexOf(ci), l = C.links[ci], x = board.x + board.w / 2 + (k - (n - 1) / 2) * (cardW + 8 * ui), y = cardsY + cardH / 2;
      this.mark(`card:${ci}`, x, y);
      const bg = this.add.graphics(); bg.fillStyle(st.sel === ci ? 0xfff3c4 : 0xeef2f8, 1); bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 12);
      bg.lineStyle(st.sel === ci ? 3 : 1.5, st.sel === ci ? 0xb37400 : 0xc7d0e0, 1); bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 12);
      const pic = this.add.text(0, -cardH * 0.14, l.pic, { fontSize: Math.round(cardH * 0.4) + 'px' }).setOrigin(0.5);
      const name = this.add.text(0, cardH * 0.28, l.name, { fontFamily: FONT, fontSize: Math.round(Math.max(8, Math.min(11 * ui, cardW / 8))) + 'px', color: hex(THEME.ink), fontStyle: WEIGHT.bold, wordWrap: { width: cardW - 6 }, align: 'center' }).setOrigin(0.5);
      const cardObj = this.add.container(x, y, [bg, pic, name]).setSize(cardW, cardH);
      draggable(this, cardObj, {
        onTap: () => this.chainSelect(ci),
        onDrop: (px, py) => { const si = nearestTarget(slots, px, py, box * 0.8); if (si < 0) return false; this.chainPlace(ci, si); return true; }
      });
    });
    const by = cardsY + cardH + 12 * ui + btnH / 2;
    this.mark('check', board.x + board.w / 2, by);
    button(this, board.x + board.w / 2, by, Math.min(board.w - 24, 200 * ui), btnH, answered ? (s.right ? '⭐ Energy flows!' : 'The right order') : 'Check ✓',
      { variant: answered ? (s.right ? 'success' : 'secondary') : 'go', fontSize: 16, disabled: answered, onClick: () => this.chainCheck() });
    const line = answered ? (s.right ? `The sun feeds the ${C.links[0].name}, and the energy passes along the chain. ⭐` : 'This is the right order, from the sun.') : st.hint || 'Drag each living thing into its box, or tap it, then tap a box.';
    this.hintLine(board, by + btnH / 2 + 6 * ui, line, answered ? s.right : st.hint ? false : null);
  }

  chainSelect(ci) {
    const s = this.state, q = this.round;
    if (!q || !q.chain || s.locked || s.picked !== null) return;
    const st = this.interState();
    st.sel = st.sel === ci ? null : ci; Sfx.lift(); this.rebuild();
  }

  /** A card into a box: a card already there goes back to the row. */
  chainPlace(ci, si) {
    const s = this.state, q = this.round;
    if (!q || !q.chain || s.locked || s.picked !== null) return;
    const st = this.interState();
    st.slots = st.slots.map((v) => (v === ci ? null : v));
    st.slots[si] = ci; st.sel = null; st.hint = null; st.wrong = st.wrong.filter((j) => j !== si);
    Sfx.pop(); this.rebuild();
  }

  chainTake(si) {
    const s = this.state, q = this.round;
    if (!q || !q.chain || s.locked || s.picked !== null) return;
    const st = this.interState();
    st.slots[si] = null; this.rebuild();
  }

  /** Check the chain: every box right wins; otherwise the wrong boxes are outlined for a second try. */
  chainCheck() {
    const s = this.state, q = this.round;
    if (!q || !q.chain || s.locked || s.picked !== null) return;
    const st = this.interState();
    if (st.slots.some((v) => v === null)) { st.hint = 'Fill every box first.'; return this.rebuild(); }
    const wrong = st.slots.map((v, i) => (v !== i ? i : -1)).filter((i) => i >= 0);
    if (!wrong.length) { Sfx.pop(); return this.pick(0); }
    st.wrong = wrong;
    st.hint = 'The boxes outlined in red are in the wrong place. Who makes food from sunlight? Who eats plants? Who hunts?';
    this.pick(1);
  }

  /** What a right answer adds to the bench. */
  benchItem(q) {
    const id = this.gameId, pic = (q.pics && q.pics[0]) || null;
    if (id === 'sci-float') { const floats = q.answer.includes('float') || (!q.answer.includes('sink') && /floats/.test(q.text || '')); return { pic: pic || q.answer.split(' ')[0], floats: q.skill === 'sink-float' ? (q.answer === '🛟 float' || /floats\?$/.test(q.text || '')) : floats }; }
    if (id === 'sci-matter') { const st = ['solid', 'liquid', 'gas'].find((x) => q.answer.includes(x)) || null; return { pic: pic || q.answer.split(' ')[0], state: st }; }
    if (q.release) { const a = q.release.animals[0], h = q.release.homes.find((x) => x.id === a.home); return { pic: a.pic, homePic: h ? h.pic : null }; }
    if (q.survive) return { pic: q.survive.pic, homePic: q.survive.home.pic };
    if (q.chain) return { pic: q.chain.links[q.chain.links.length - 1].pic, homePic: { savanna: '🌾', ocean: '🌊', pond: '🪷', forest: '🌲', garden: '🚜' }[q.chain.where] || null };
    if (id === 'sci-habitat') { const homePic = (q.answer.match(/\p{Extended_Pictographic}/u) || [])[0] || null; return { pic: pic || (q.answer.match(/\p{Extended_Pictographic}/u) || ['🐾'])[0], homePic: pic ? homePic : (q.pics && q.pics[0]) }; }
    return { pic: pic || '🌱' };
  }

  afterRight(q) { this.splash(q); }

  /** Sink or Float's answer-by-doing: the object drops into the tub and sinks or bobs. */
  splash(q) {
    if (this.gameId !== 'sci-float' || !this.tub || !this.picture || !this.tweens) return;
    const floats = q.answer === '🛟 float' || (q.skill !== 'sink-float' && /floats/.test(q.text || ''));
    const t = this.add.text(this.picture.x, this.picture.y, (q.pics && q.pics[0]) || '🪨', { fontSize: this.picture.style ? this.picture.style.fontSize : '32px' }).setOrigin(0.5).setDepth(20);
    const endY = floats ? this.tub.surface - 2 * this.ui : this.tub.y + this.tub.h - 10 * this.ui;
    this.tweens.add({ targets: t, x: this.tub.x + this.tub.w / 2, y: this.tub.surface - 30 * this.ui, duration: 420, ease: 'Sine.In', onComplete: () => Sfx.gulp() });
    this.tweens.add({ targets: t, y: endY, scale: 0.6, duration: floats ? 500 : 420, delay: 420, ease: floats ? 'Bounce.Out' : 'Quad.In' });
    this.tweens.add({ targets: t, alpha: 0, delay: 1000, duration: 150, onComplete: () => t.destroy() });
  }
}
