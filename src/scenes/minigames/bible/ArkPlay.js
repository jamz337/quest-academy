import { MinigameScene } from '../MinigameScene.js';
import { pickAnimals, makeAsks, nameLine, twoLine, askLine, foundLine, otherLine } from '../../../data/early/animals.js';
import { drawSky, drawShore, drawFlood, drawRainbow, drawArk, drawNoah, speechBubble, animalPair, ARK } from './ArkScenery.js';
import { animalKey } from '../../../ui/AnimalArt.js';
import { hex } from '../../../ui/theme.js';
import { FONT, WEIGHT } from '../../../ui/TextStyles.js';
import { button, speakButton } from '../../../ui/Button.js';
import { enter } from '../../../ui/motion.js';
import { Sfx, isMuted } from '../../../systems/Audio.js';
import { speak, stop as stopSpeech } from '../../../systems/Speech.js';
import { fireworks } from '../../../ui/Fireworks.js';

export const ARK_PLAY_COUNT = 8, ARK_PLAY_ASKS = 4;
export const callKey = (key) => `call-${key}`;

/**
 * All Aboard the Ark for Pre-K: a daylight picture book, no questions. Eight pairs of animals wait on the shore.
 * Touch a pair: it bounces, its real call plays, Noah names it, the two walk up the ramp while the voice counts
 * "one, two", and a window lights with its face. The sky clouds over as the ark fills. With everyone aboard come a
 * few gentle asks ("Can you find the lion?", "Which animal says Moo?") answered by touching a window: the right one
 * is cheered, any other is simply named and the ask repeated. Then the rain, the flood, the rainbow, and the windows
 * stay open for free play until Done. Everything is read aloud. Full stars every time.
 */
export class ArkPlay extends MinigameScene {
  constructor() { super('MG_ArkPlay'); }

  initState() {
    const kinds = pickAnimals(this.rng, ARK_PLAY_COUNT);
    return {
      kinds, done: kinds.map(() => false), aboard: [], phase: 'explore', line: 'Touch an animal to hear it!', spoken: false,
      asks: makeAsks(kinds, this.rng, ARK_PLAY_ASKS), askI: 0, found: null, locked: false, finale: false, correct: 0
    };
  }

  get boarded() { return this.state.aboard.length; }
  progressLabel() { const s = this.state; return s.finale ? '🌈' : s.phase === 'ask' ? `${Math.min(s.askI + 1, s.asks.length)} / ${s.asks.length}` : `${this.boarded} / ${ARK_PLAY_COUNT}`; }
  progressRatio() { const s = this.state; return s.finale ? 1 : s.phase === 'explore' ? this.boarded / ARK_PLAY_COUNT : s.askI / s.asks.length; }
  enterKey() { const s = this.state; return `${s.phase}-${this.boarded}-${s.askI}-${s.found}-${s.finale}`; }
  update() {}

  /** Noah's line: in the bubble and read aloud (Pre-K hears everything); his mouth moves while he talks. */
  say(line) {
    this.state.line = line;
    if (this.bubbleText && this.bubbleText.active) this.bubbleText.setText(line);
    stopSpeech();
    speak(line, { rate: this.speechRate });
    if (this.noah && this.noah.mouth && this.tweens) this.tweens.add({ targets: this.noah.mouth, scaleY: 0.25, duration: 110, yoyo: true, repeat: Math.min(24, Math.ceil(line.length / 4)) });
  }

  /** An animal's recorded call (or the code-made stand-in when the file is not there, as in tests). */
  call(animal) {
    const key = callKey(animal.key);
    const sm = this.sound;
    if (sm && typeof sm.play === 'function' && this.cache && this.cache.audio && this.cache.audio.exists(key)) { if (!isMuted()) sm.play(key, { volume: 0.9 }); return; }
    Sfx.animal(animal.sound);
  }

  buildGame(area) {
    const s = this.state, ui = this.ui;
    const f = ui * Math.min(1, Math.max(0.7, area.h / (640 * ui)));
    const wide = area.w / ui >= 600;
    // The whole play area is the picture: sky, hills, shore.
    const r = { x: area.x - 14, y: area.y - 8, w: area.w + 28, h: area.h + 22 };
    const mood = s.finale ? 0.15 : s.phase === 'ask' ? 1 : this.boarded / ARK_PLAY_COUNT;
    const rain = s.finale ? 0 : s.phase === 'ask' ? 0.8 : this.boarded >= ARK_PLAY_COUNT - 1 ? 0.3 : 0;
    drawSky(this, r, f, { mood, rain });
    const groundY = drawShore(this, r, f);
    if (s.finale) drawFlood(this, r, groundY, f, 1);

    // Noah and his speech bubble along the top.
    const top = area.y + 4 * f, bh = 92 * f, noahH = 104 * f;
    this.noah = drawNoah(this, area.x + 34 * f, top + bh + 6 * f, noahH);
    const bx = area.x + 74 * f, bw = area.w - 74 * f;
    const { text: said } = speechBubble(this, bx, top, bw, bh, s.line, f);
    this.bubbleText = said;
    speakButton(this, bx + bw - 26 * f, top + bh / 2, 40 * f, said, { rate: this.speechRate });
    if (!s.spoken) { s.spoken = true; this.say(s.line); }

    // The ark, with a window per pair (lit as they board) and the ramp.
    const arkRect = { x: area.x, y: top + bh + 10 * f, w: area.w, h: groundY - (top + bh + 10 * f) + 20 * f };
    const built = drawArk(this, arkRect, groundY, f, { windows: ARK_PLAY_COUNT, lit: s.aboard, afloat: s.finale });
    this.ark = built.ark; this.door = built.door; this.rampBase = built.rampBase; this.windows = built.windows;
    if (s.finale && this.tweens) this.tweens.add({ targets: this.ark, y: -16 * f, angle: 1.5, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    // Windows are touchable once animals are aboard (the asks, and free play after the rainbow).
    this.windows.forEach((w, i) => {
      if (!w.key) return;
      const zone = this.add.zone(w.x, w.y, w.w + 10 * f, w.w + 10 * f).setInteractive({ useHandCursor: true });
      zone.label = { text: `window ${w.key}` };
      zone.on('pointerup', () => this.tapWindow(i));
      this.ark.add(zone);
      if (s.phase === 'ask' && s.found === w.key && w.face) this.tweens.add({ targets: w.face, scale: w.face.scale * 1.3, duration: 160, yoyo: true, repeat: 2 });
    });

    // The animals waiting on the shore (those not yet aboard), in a loose crowd.
    this.pairs = [];
    if (!s.finale) {
      const cols = wide ? 4 : 4, rows = Math.ceil(ARK_PLAY_COUNT / cols);
      const bandTop = groundY + 16 * f, bandH = area.y + area.h - bandTop - 4 * f;
      const size = Math.max(30 * f, Math.min(52 * f, area.w / (cols * 2.3), bandH / (rows * 1.5)));
      const made = [];
      s.kinds.forEach((k, i) => {
        if (s.done[i]) return;
        const col = i % cols, row = Math.floor(i / cols);
        const x = area.x + (area.w / cols) * (col + 0.5) + (row % 2 ? 10 * f : -10 * f), y = bandTop + (bandH / rows) * (row + 0.5) + (col % 2 ? 6 * f : -4 * f);
        const pair = animalPair(this, x, y, size, k, f);
        pair.setInteractive({ useHandCursor: true });
        pair.on('pointerdown', () => { if (this.tweens) this.tweens.add({ targets: pair, scale: 0.94, duration: 70, yoyo: true }); });
        pair.on('pointerup', () => this.tap(i));
        if (this.tweens) this.tweens.add({ targets: pair, y: y - 3 * f, duration: 900 + (i % 4) * 160, yoyo: true, repeat: -1, ease: 'Sine.InOut', delay: i * 120 });
        this.pairs[i] = pair; made.push(pair);
      });
      enter(this, made, { from: 'up', delay: 80, stagger: 50 });
    }

    if (s.finale) {
      const bow = drawRainbow(this, { x: area.x, y: area.y + bh, w: area.w, h: groundY - area.y - bh }, f);
      if (this.tweens) this.tweens.add({ targets: bow, alpha: 1, delay: 1200, duration: 900 });
      button(this, area.x + area.w / 2, area.y + area.h - 34 * f, Math.min(area.w - 40, 240 * f), 52 * f, 'Done ✓', { variant: 'success', fontSize: 20, onClick: () => this.endPlay() });
    }
  }

  /** A waiting pair was touched: its call, its name, the walk up the ramp with the count, then its window lights. */
  tap(i) {
    const s = this.state, k = s.kinds[i];
    if (s.locked || s.finale || !k || s.done[i] || s.phase !== 'explore') return;
    s.locked = true;
    this.call(k);
    this.say(nameLine(k));
    const pair = this.pairs[i];
    if (pair && pair.active && this.tweens) {
      this.tweens.killTweensOf(pair);
      this.tweens.add({ targets: pair, scale: 1.18, duration: 140, yoyo: true, repeat: 1 });
      this.bubbleOver(pair, k.noise ? `${k.noise}!` : '…', 1.2);
      // Up the ramp: to its foot, then to the door, shrinking as it goes; "one", "two" as each steps in.
      const d = this.door, base = this.rampBase;
      this.tweens.add({ targets: pair, x: base.x, y: base.y - 10 * this.ui, duration: 600, delay: 900, ease: 'Sine.InOut' });
      this.tweens.add({ targets: pair, x: d.x, y: d.y - 8 * this.ui, scale: 0.55, duration: 900, delay: 1500, ease: 'Sine.InOut' });
      this.tweens.add({ targets: pair, alpha: 0, duration: 200, delay: 2350 });
    }
    this.time.delayedCall(1500, () => this.countPop(pair, 1));
    this.time.delayedCall(2100, () => this.countPop(pair, 2));
    this.time.delayedCall(2700, () => {
      s.done[i] = true; s.aboard.push(k.key); s.locked = false;
      Sfx.unlock();
      if (this.boarded >= ARK_PLAY_COUNT) { s.phase = 'ask'; this.state.line = `All the animals are aboard! ${askLine(s.asks[0])}`; this.rebuild(); this.say(this.state.line); }
      else { this.state.line = twoLine(k); this.rebuild(); this.say(this.state.line); }
    });
  }

  /** "1", "2" popping up as the pair steps aboard, spoken too. */
  countPop(pair, n) {
    const x = pair && pair.active ? pair.x : this.door.x, y = pair && pair.active ? pair.y : this.door.y;
    const t = this.add.text(x + (n === 1 ? -12 : 12) * this.ui, y - 20 * this.ui, String(n), { fontFamily: FONT, fontSize: Math.round(26 * this.ui) + 'px', color: hex(ARK.text), fontStyle: WEIGHT.heavy, stroke: '#ffffff', strokeThickness: 6 }).setOrigin(0.5).setDepth(30);
    Sfx.note(n === 1 ? 3 : 5);
    stopSpeech(); speak(n === 1 ? 'one' : 'two', { rate: this.speechRate });
    if (this.tweens) this.tweens.add({ targets: t, y: t.y - 34 * this.ui, alpha: 0, duration: 800, ease: 'Quad.Out', onComplete: () => t.destroy() });
  }

  /** A little bubble over an animal with its noise word. */
  bubbleOver(pair, str, seconds = 1) {
    const ui = this.ui;
    const t = this.add.text(pair.x, pair.y - 46 * ui, str, { fontFamily: FONT, fontSize: Math.round(18 * ui) + 'px', color: hex(ARK.text), fontStyle: WEIGHT.heavy, backgroundColor: '#ffffff', padding: { x: 10 * ui, y: 5 * ui } }).setOrigin(0.5).setDepth(31).setAlpha(0);
    if (this.tweens) { this.tweens.add({ targets: t, alpha: 1, y: t.y - 8 * ui, duration: 180 }); this.tweens.add({ targets: t, alpha: 0, delay: seconds * 1000, duration: 250, onComplete: () => t.destroy() }); }
  }

  /** A lit window was touched: in the asks it answers; after the rainbow it just plays the animal again. */
  tapWindow(i) {
    const s = this.state, w = this.windows[i], k = w && s.kinds.find((a) => a.key === w.key);
    if (!k || s.locked) return;
    if (w.face && this.tweens) this.tweens.add({ targets: w.face, scale: w.face.scale * 1.35, duration: 150, yoyo: true });
    this.call(k);
    if (s.phase !== 'ask') { this.say(nameLine(k)); return; }   // free play after the rainbow
    const ask = s.asks[s.askI];
    if (!ask) return;
    if (k !== ask.animal) { this.say(otherLine(k, ask)); return; }   // named, never "wrong", asked again
    s.locked = true; s.found = k.key; s.correct += 1;
    this.correctFeedback();
    this.say(foundLine(k));
    this.rebuild();
    this.time.delayedCall(1600, () => {
      s.askI += 1; s.found = null; s.locked = false;
      if (s.askI >= s.asks.length) return this.flood();
      this.state.line = askLine(s.asks[s.askI]);
      this.rebuild(); this.say(this.state.line);
    });
  }

  /** Every ask answered: the rain stops, the flood lifts the ark, the rainbow comes, and the windows stay open to play. */
  flood() {
    const s = this.state;
    s.finale = true; s.phase = 'free';
    this.state.line = 'The rain came, the ark floated, and then the rainbow! Touch the windows to hear the animals again.';
    this.rebuild();
    Sfx.fanfare();
    this.say(this.state.line);
    this.time.delayedCall(1500, () => fireworks(this, this.w / 2, this.h * 0.3, { bursts: 3, spread: this.w * 0.3 }));
  }

  endPlay() {
    const s = this.state;
    if (!s.finale) return;
    this.finish({ correct: s.asks.length, total: s.asks.length, delay: 0 });
  }
}

export { animalKey };
