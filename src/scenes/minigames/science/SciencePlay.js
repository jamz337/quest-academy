import { MinigameScene } from '../MinigameScene.js';
import { playSet, targetOf, makePlayAsks, playFoundLine, playOtherLine } from '../../../data/science/play.js';
import { THEME, hex } from '../../../ui/theme.js';
import { FONT, WEIGHT } from '../../../ui/TextStyles.js';
import { button, speakButton } from '../../../ui/Button.js';
import { grid } from '../../../systems/Layout.js';
import { enter } from '../../../ui/motion.js';
import { Sfx } from '../../../systems/Audio.js';
import { speak, stop as stopSpeech } from '../../../systems/Speech.js';
import { fireworks } from '../../../ui/Fireworks.js';

const SKY = 0xd6f3f5, PANEL = 0xffffff, EDGE = 0x9fd9dc, TEXT = 0x1e1b4b;

/**
 * Science Springs for Pre-K: touch and learn, no questions. Six things wait at the bottom; touch one and it is
 * named and told about, then it floats up to its home panel (the sea, the desert…; floats or sinks; solid, liquid
 * or gas; what a plant needs or its parts). When everything is home come three gentle asks answered by touching a
 * thing in its panel: the right one is cheered, any other is just named and the ask repeated. Full stars on Done.
 */
export class SciencePlay extends MinigameScene {
  constructor() { super('MG_SciencePlay'); }

  initState() {
    const set = playSet(this.payload.gameId);
    const items = this.rng.shuffle(set.items);
    return { set, items, home: items.map(() => false), phase: 'explore', line: set.intro, spoken: false, asks: makePlayAsks(set, this.rng, 3), askI: 0, found: null, locked: false, finale: false, correct: 0 };
  }

  get placed() { return this.state.home.filter(Boolean).length; }
  progressLabel() { const s = this.state; return s.finale ? '⭐' : s.phase === 'ask' ? `${Math.min(s.askI + 1, s.asks.length)} / ${s.asks.length}` : `${this.placed} / ${s.items.length}`; }
  progressRatio() { const s = this.state; return s.finale ? 1 : s.phase === 'explore' ? this.placed / s.items.length : s.askI / s.asks.length; }
  enterKey() { const s = this.state; return `${s.phase}-${this.placed}-${s.askI}-${s.found}-${s.finale}`; }
  update() {}

  say(line) {
    this.state.line = line;
    if (this.bubbleText && this.bubbleText.active) this.bubbleText.setText(line);
    stopSpeech();
    speak(line, { rate: this.speechRate });
  }

  buildGame(area) {
    const s = this.state, ui = this.ui, set = s.set;
    const f = ui * Math.min(1, Math.max(0.7, area.h / (640 * ui)));
    const bg = this.add.graphics();
    bg.fillStyle(SKY, 1); bg.fillRoundedRect(area.x, area.y, area.w, area.h, 18 * f);

    // The guide's words along the top, read aloud.
    const top = area.y + 8 * f, bh = 80 * f;
    const g = this.add.graphics();
    g.fillStyle(EDGE, 1); g.fillRoundedRect(area.x + 8 * f - 2, top - 2, area.w - 16 * f + 4, bh + 4, 18 * f);
    g.fillStyle(PANEL, 1); g.fillRoundedRect(area.x + 8 * f, top, area.w - 16 * f, bh, 16 * f);
    const said = this.add.text(area.x + area.w / 2 - 16 * f, top + bh / 2, s.line, { fontFamily: FONT, fontSize: Math.round(20 * f) + 'px', color: hex(TEXT), fontStyle: WEIGHT.heavy, align: 'center', wordWrap: { width: area.w - 110 * f } }).setOrigin(0.5);
    for (const size of [20, 18, 16, 14]) { if ((said.height || 0) <= bh - 8 * f) break; said.setFontSize(Math.round(size * f)); }
    this.bubbleText = said;
    speakButton(this, area.x + area.w - 36 * f, top + bh / 2, 40 * f, () => this.state.line, { rate: this.speechRate });
    if (!s.spoken) { s.spoken = true; this.say(s.line); }

    // Home panels: one per target, holding the things already placed there (touchable for the asks and free play).
    const pTop = top + bh + 12 * f, pH = Math.min(area.h * 0.36, 230 * f);
    const cells = grid({ x: area.x + 8 * f, y: pTop, w: area.w - 16 * f, h: pH }, set.targets.length <= 2 ? set.targets.length : 2, Math.ceil(set.targets.length / 2), 10 * f);
    this.slots = [];
    set.targets.forEach((t, ti) => {
      const c = cells[ti];
      if (!c) return;
      const pg = this.add.graphics();
      pg.fillStyle(EDGE, 1); pg.fillRoundedRect(c.x - c.w / 2 - 2, c.y - c.h / 2 - 2, c.w + 4, c.h + 4, 16 * f);
      pg.fillStyle(PANEL, 0.92); pg.fillRoundedRect(c.x - c.w / 2, c.y - c.h / 2, c.w, c.h, 14 * f);
      this.add.text(c.x, c.y - c.h / 2 + 14 * f, `${t.pic} ${t.name}`, { fontFamily: FONT, fontSize: Math.round(15 * f) + 'px', color: hex(TEXT), fontStyle: WEIGHT.heavy }).setOrigin(0.5);
      const mine = s.items.map((it, i) => ({ it, i })).filter(({ it, i }) => s.home[i] && it.target === t.id);
      const size = Math.min(44 * f, (c.w - 16 * f) / Math.max(3, mine.length));
      mine.forEach(({ it, i }, k) => {
        const x = c.x + (k - (mine.length - 1) / 2) * size, y = c.y + 12 * f;
        const pic = this.add.text(x, y, it.pic, { fontSize: Math.round(size * 0.8) + 'px' }).setOrigin(0.5);
        const zone = this.add.zone(x, y, size, size).setInteractive({ useHandCursor: true });
        zone.label = { text: `home ${it.name}` };
        zone.on('pointerup', () => this.tapHome(i));
        this.slots[i] = { pic, x, y };
        if (s.phase === 'ask' && s.found === i && this.tweens) this.tweens.add({ targets: pic, scale: 1.3, duration: 160, yoyo: true, repeat: 2 });
      });
      this.slots[`target-${t.id}`] = { x: c.x, y: c.y + 12 * f };
    });

    // The things waiting to be touched.
    this.things = [];
    if (!s.finale) {
      const bTop = pTop + pH + 12 * f, bH = area.y + area.h - bTop - 8 * f;
      const waiting = s.items.map((it, i) => ({ it, i })).filter(({ i }) => !s.home[i]);
      const cols = 3, rows = Math.ceil(s.items.length / cols);
      const tcells = grid({ x: area.x + 8 * f, y: bTop, w: area.w - 16 * f, h: bH }, cols, rows, 8 * f);
      const made = [];
      s.items.forEach((it, i) => {
        if (s.home[i]) return;
        const c = tcells[i];
        if (!c) return;
        const card = this.add.container(c.x, c.y);
        const cg = this.add.graphics();
        cg.fillStyle(EDGE, 1); cg.fillRoundedRect(-c.w / 2 - 2, -c.h / 2 - 2, c.w + 4, c.h + 4, 14 * f);
        cg.fillStyle(PANEL, 1); cg.fillRoundedRect(-c.w / 2, -c.h / 2, c.w, c.h, 12 * f);
        const pic = this.add.text(0, -c.h * 0.12, it.pic, { fontSize: Math.round(Math.min(c.h * 0.45, 44 * f)) + 'px' }).setOrigin(0.5);
        const name = this.add.text(0, c.h * 0.3, it.name, { fontFamily: FONT, fontSize: Math.round(Math.min(14 * f, c.h * 0.16)) + 'px', color: hex(TEXT), fontStyle: WEIGHT.heavy }).setOrigin(0.5);
        card.add([cg, pic, name]);
        card.setSize(c.w, c.h);
        card.label = name; card.pic = pic;
        card.setInteractive({ useHandCursor: true });
        card.on('pointerdown', () => { if (this.tweens) this.tweens.add({ targets: card, scale: 0.95, duration: 70, yoyo: true }); });
        card.on('pointerup', () => this.tap(i));
        if (this.tweens) this.tweens.add({ targets: card, y: c.y - 3 * f, duration: 900 + (i % 3) * 160, yoyo: true, repeat: -1, ease: 'Sine.InOut', delay: i * 120 });
        this.things[i] = card; made.push(card);
      });
      void waiting;
      enter(this, made, { from: 'up', delay: 60, stagger: 50 });
    } else {
      button(this, area.x + area.w / 2, area.y + area.h - 36 * f, Math.min(area.w - 40, 240 * f), 52 * f, 'Done ✓', { variant: 'success', fontSize: 20, onClick: () => this.endPlay() });
    }
  }

  /** A waiting thing was touched: named, told about, and sent to its home panel. */
  tap(i) {
    const s = this.state, it = s.items[i];
    if (s.locked || s.finale || !it || s.home[i] || s.phase !== 'explore') return;
    s.locked = true;
    Sfx.pop();
    this.say(it.line);
    const card = this.things[i], home = this.slots[`target-${it.target}`];
    if (card && card.active && this.tweens && home) {
      this.tweens.killTweensOf(card);
      this.tweens.add({ targets: card, scale: 1.12, duration: 140, yoyo: true });
      this.tweens.add({ targets: card, x: home.x, y: home.y, scale: 0.5, duration: 900, delay: 700, ease: 'Sine.InOut' });
      this.tweens.add({ targets: card, alpha: 0, duration: 200, delay: 1550 });
    }
    this.time.delayedCall(1900, () => {
      s.home[i] = true; s.locked = false;
      Sfx.unlock();
      if (this.placed >= s.items.length) { s.phase = 'ask'; this.state.line = `Everything is home! ${s.asks[0].line}`; }
      this.rebuild();
      if (s.phase === 'ask') this.say(this.state.line);
    });
  }

  /** A thing in its home panel was touched: in the asks it answers; afterwards it is just named again. */
  tapHome(i) {
    const s = this.state, it = s.items[i];
    if (!it || s.locked) return;
    const slot = this.slots[i];
    if (slot && slot.pic && this.tweens) this.tweens.add({ targets: slot.pic, scale: 1.35, duration: 150, yoyo: true });
    Sfx.pop();
    if (s.phase !== 'ask') { this.say(it.line); return; }
    const ask = s.asks[s.askI];
    if (!ask) return;
    const right = ask.kind === 'find' ? it === ask.item : it.target === ask.item.target;
    if (!right) { this.say(playOtherLine(s.set, it, ask)); return; }
    s.locked = true; s.found = i; s.correct += 1;
    this.correctFeedback();
    this.say(playFoundLine(s.set, it));
    this.rebuild();
    this.time.delayedCall(1500, () => {
      s.askI += 1; s.found = null; s.locked = false;
      if (s.askI >= s.asks.length) return this.celebrateEnd();
      this.state.line = s.asks[s.askI].line;
      this.rebuild(); this.say(this.state.line);
    });
  }

  celebrateEnd() {
    const s = this.state;
    s.finale = true; s.phase = 'free';
    this.state.line = 'Well done, scientist! Touch anything to hear about it again.';
    this.rebuild();
    Sfx.fanfare();
    this.say(this.state.line);
    this.time.delayedCall(1200, () => fireworks(this, this.w / 2, this.h * 0.3, { bursts: 3, spread: this.w * 0.3 }));
  }

  endPlay() {
    const s = this.state;
    if (!s.finale) return;
    this.finish({ correct: s.asks.length, total: s.asks.length, delay: 0 });
  }
}

export { THEME };
