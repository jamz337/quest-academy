import { PictureQuiz } from '../PictureQuiz.js';
import { THEME, hex } from '../../../ui/theme.js';
import { scienceSet, scienceQuestion } from '../../../generators/science/questions.js';
import { grid } from '../../../systems/Layout.js';
import { FONT, WEIGHT } from '../../../ui/TextStyles.js';
import { Sfx } from '../../../systems/Audio.js';

const WATER = 0x5ec8e6, WATER_DARK = 0x2f9bc4, TUB = 0xe9f6f9, SOIL = 0x8a5a2b, POT = 0xc9714a, SKY = 0xe4f6f8;
const PLANT_STAGES = ['🌰', '🌱', '🌿', '🪴', '🌻', '🍎'];

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

  /** What a right answer adds to the bench. */
  benchItem(q) {
    const id = this.gameId, pic = (q.pics && q.pics[0]) || null;
    if (id === 'sci-float') { const floats = q.answer.includes('float') || (!q.answer.includes('sink') && /floats/.test(q.text || '')); return { pic: pic || q.answer.split(' ')[0], floats: q.skill === 'sink-float' ? (q.answer === '🛟 float' || /floats\?$/.test(q.text || '')) : floats }; }
    if (id === 'sci-matter') { const st = ['solid', 'liquid', 'gas'].find((x) => q.answer.includes(x)) || null; return { pic: pic || q.answer.split(' ')[0], state: st }; }
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
