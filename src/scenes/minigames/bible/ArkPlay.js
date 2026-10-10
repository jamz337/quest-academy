import { ArkAnimals } from './ArkAnimals.js';
import { pickAnimals, makeAsks, animalLine, askLine, foundLine, otherLine, capital } from '../../../data/early/animals.js';
import { VILLAGE, drawBackdrop, glassPanel } from './VillageScenery.js';
import { hex } from '../../../ui/theme.js';
import { FONT, WEIGHT } from '../../../ui/TextStyles.js';
import { speakButton } from '../../../ui/Button.js';
import { readable } from '../../../ui/ReadableText.js';
import { grid } from '../../../systems/Layout.js';
import { enter } from '../../../ui/motion.js';
import { Sfx } from '../../../systems/Audio.js';
import { speak, stop as stopSpeech } from '../../../systems/Speech.js';
import { fireworks } from '../../../ui/Fireworks.js';

export const ARK_PLAY_COUNT = 8, ARK_PLAY_ASKS = 4;

/**
 * All Aboard the Ark for Pre-K: learning and touching, no questions. Eight pairs of animals wait on the road; touch
 * a pair and it makes its noise, Noah says its name and that two of them went into the ark, and the pair walks up
 * the ramp. When every animal is aboard come a few gentle asks ("Can you find the lion?", "Which animal says
 * Moo?"): touching the right one is cheered, touching another just names it and asks again. Then the flood, the
 * rainbow and full stars. Everything is read aloud.
 */
export class ArkPlay extends ArkAnimals {
  constructor() { super('MG_ArkPlay'); this.noQueue = true; }

  initState() {
    const kinds = pickAnimals(this.rng, ARK_PLAY_COUNT);
    return {
      kinds, animals: kinds.map((k) => k.pic), done: kinds.map(() => false), boarded: 0,
      phase: 'explore', line: 'Touch an animal to hear it!', spoken: false, asks: makeAsks(kinds, this.rng, ARK_PLAY_ASKS), askI: 0, found: null,
      locked: false, finale: false, timeLimit: Infinity, correct: 0, streak: 0, missed: {}, questions: []
    };
  }

  progressLabel() { const s = this.state; return s.phase === 'ask' ? `${Math.min(s.askI + 1, s.asks.length)} / ${s.asks.length}` : `${s.boarded} / ${ARK_PLAY_COUNT}`; }
  progressRatio() { const s = this.state; return s.phase === 'explore' ? s.boarded / ARK_PLAY_COUNT : s.phase === 'ask' ? s.askI / s.asks.length : 1; }
  enterKey() { const s = this.state; return s.finale ? 'finale' : `${s.phase}-${s.boarded}-${s.askI}-${s.found}`; }
  finaleMessage() { return 'All aboard! Every animal is safe and dry.\nThe rain came, and then the rainbow.'; }
  onResumed() {}
  update() {}

  /** Noah's line: shown on the glass and read aloud (Pre-K hears everything). */
  say(line) {
    this.state.line = line;
    stopSpeech();
    speak(line, { rate: this.speechRate });
  }

  buildGame(area) {
    const s = this.state, ui = this.ui;
    const f = ui * Math.min(1, Math.max(0.72, area.h / (680 * ui)));
    drawBackdrop(this, area);
    if (s.finale) return this.buildFinale(area, f);
    const wide = area.w / ui >= 600, cx = area.x + area.w / 2;
    const px = area.x + 6 * f, pw = area.w - 12 * f;

    // Noah's words on dark glass, with a 🔊 to hear them again.
    const top = area.y + 8 * f, panelH = 92 * f;
    const panel = glassPanel(this, px, top, pw, panelH, f);
    const said = readable(this, cx - 18 * f, top + panelH / 2, s.line, { fontFamily: FONT, fontSize: Math.round(wide ? 22 * f : 19 * f) + 'px', color: hex(VILLAGE.text), fontStyle: WEIGHT.heavy, align: 'center' }, { width: pw - 104 * f });
    speakButton(this, px + pw - 32 * f, top + panelH / 2, 42 * f, said, { rate: this.speechRate });
    enter(this, panel, { from: 'up', distance: 12 });
    if (!s.spoken) { s.spoken = true; this.say(s.line); }

    // The animals: two of each on a card, in rows under the ark.
    const cols = wide ? 4 : 3, rows = Math.ceil(ARK_PLAY_COUNT / cols), gap = 10 * f;
    const sy = top + panelH + 10 * f;
    const cardH = Math.max(72 * f, Math.min(112 * f, (area.y + area.h - sy - 120 * f - gap * (rows - 1) - 12 * f) / rows));
    const gridH = rows * cardH + (rows - 1) * gap;
    const sh = Math.max(100 * f, Math.min(area.h * 0.34, 250 * f, area.y + area.h - sy - gridH - 12 * f));
    this.drawScene({ x: px, y: sy, w: pw, h: sh }, f, false);

    const gTop = sy + sh + 12 * f;
    const cells = grid({ x: px, y: gTop, w: pw, h: gridH }, cols, rows, gap);
    this.cards = [];
    const made = [];
    s.kinds.forEach((k, i) => {
      const c = cells[i];
      if (!c) return;
      const aboard = s.done[i];
      const tappable = !s.locked && !(s.phase === 'explore' && aboard);
      const card = this.animalCard(c.x, c.y, c.w, c.h, k, f, { aboard, found: s.found === i, dim: s.phase === 'explore' && aboard, onTap: tappable ? () => this.tap(i) : null });
      this.cards[i] = card;
      made.push(card);
    });
    enter(this, made, { from: 'up', delay: 60, stagger: 40 });
  }

  /** A card with the pair of animals big and the name underneath; a tick once they are aboard. */
  animalCard(x, y, w, h, k, f, { aboard = false, found = false, dim = false, onTap = null } = {}) {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    const r = 14 * f;
    g.fillStyle(found ? VILLAGE.glow : VILLAGE.glow, found ? 0.35 : 0.12); g.fillRoundedRect(-w / 2 - 4 * f, -h / 2 - 4 * f + (found ? 0 : 3 * f), w + 8 * f, h + 8 * f, r + 4 * f);
    g.fillStyle(found ? VILLAGE.rightEdge : 0x4a5373, 1); g.fillRoundedRect(-w / 2 - 1.5, -h / 2 - 1.5, w + 3, h + 3, r + 1);
    g.fillStyle(found ? 0x7e56ee : aboard ? 0x2b3350 : 0x353d57, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    const pics = this.add.text(0, -h * 0.12, `${k.pic}${k.pic}`, { fontSize: Math.round(Math.min(h * 0.42, w * 0.3)) + 'px' }).setOrigin(0.5);
    const name = this.add.text(0, h * 0.3, capital(k.name), { fontFamily: FONT, fontSize: Math.round(Math.min(16 * f, h * 0.17)) + 'px', color: hex(VILLAGE.text), fontStyle: WEIGHT.heavy }).setOrigin(0.5);
    c.add([g, pics, name]);
    if (aboard && !found) c.add(this.add.text(w / 2 - 12 * f, -h / 2 + 12 * f, '✓', { fontFamily: FONT, fontSize: Math.round(16 * f) + 'px', color: hex(VILLAGE.glowSoft), fontStyle: WEIGHT.heavy }).setOrigin(0.5));
    c.setSize(w, h);
    c.label = pics;   // tests know a card by its pair of pictures
    c.pics = pics;
    if (dim) c.setAlpha(0.45);
    if (onTap) {
      c.setInteractive({ useHandCursor: true });
      c.on('pointerdown', () => { if (this.tweens) this.tweens.add({ targets: c, scale: 0.96, duration: 80, yoyo: true }); });
      c.on('pointerup', () => onTap());
    }
    return c;
  }

  /** An animal was touched. */
  tap(i) {
    const s = this.state, k = s.kinds[i];
    if (s.locked || s.finale || !k) return;
    if (s.phase === 'explore') return this.board(i);
    const ask = s.asks[s.askI];
    if (!ask) return;
    Sfx.animal(k.sound);
    if (k !== ask.animal) {
      // Not the one asked for: it is named, never marked wrong, and the ask is said again.
      this.say(otherLine(k, ask));
      this.rebuild();
      const card = this.cards[i];
      if (card && card.active) this.tweens.add({ targets: card, angle: 4, duration: 70, yoyo: true, repeat: 3 });
      return;
    }
    s.locked = true; s.found = i; s.correct += 1;
    this.correctFeedback();
    this.say(foundLine(k));
    this.rebuild();
    this.time.delayedCall(1500, () => {
      s.askI += 1; s.found = null; s.locked = false;
      if (s.askI >= s.asks.length) return this.endPlay();
      this.say(askLine(s.asks[s.askI]));
      this.rebuild();
    });
  }

  /** A pair makes its noise, Noah tells about it, and it walks up the ramp into the ark. */
  board(i) {
    const s = this.state, k = s.kinds[i];
    if (s.done[i]) return;
    s.locked = true;
    Sfx.animal(k.sound);
    this.say(animalLine(k));
    this.rebuild();
    const card = this.cards[i];
    if (card && card.active && this.door && card.pics) {
      const pair = this.add.text(card.x, card.y - 8 * this.ui, `${k.pic}${k.pic}`, { fontSize: card.pics.style ? card.pics.style.fontSize : '28px' }).setOrigin(0.5).setDepth(5);
      this.tweens.add({ targets: card, scale: 1.06, duration: 120, yoyo: true });
      this.tweens.add({ targets: pair, x: this.door.x, y: this.door.y - 6 * this.ui, duration: 1000, delay: 250, ease: 'Sine.InOut' });
      this.tweens.add({ targets: pair, scale: 0.6, duration: 1000, delay: 250, ease: 'Sine.In' });
      this.tweens.add({ targets: pair, alpha: 0, delay: 1150, duration: 180, onComplete: () => pair.destroy() });
    }
    this.time.delayedCall(1400, () => {
      s.done[i] = true;
      // Boarding order, for the animals peeking over the rail.
      const at = s.animals.indexOf(k.pic);
      if (at >= 0) { s.animals.splice(at, 1); s.animals.splice(s.boarded, 0, k.pic); }
      s.boarded += 1; s.locked = false;
      Sfx.unlock();
      if (s.boarded >= ARK_PLAY_COUNT) { s.phase = 'ask'; this.say(`All the animals are aboard! ${askLine(s.asks[0])}`); }
      this.rebuild();
    });
  }

  /** Every ask answered: the flood, the rainbow and full stars. */
  endPlay() {
    const s = this.state;
    s.finale = true;
    this.rebuild();
    Sfx.fanfare();
    this.say('All aboard! The rain came, and then the rainbow.');
    this.time.delayedCall(1800, () => fireworks(this, this.w / 2, this.h * 0.3, { bursts: 3, spread: this.w * 0.3 }));
    this.time.delayedCall(3200, () => this.finish({ correct: s.asks.length, total: s.asks.length, delay: 0 }));
  }
}
