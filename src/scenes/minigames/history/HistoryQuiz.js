import { PictureQuiz } from '../PictureQuiz.js';
import { historySet, historyQuestion, countryOfLabel, flagCode, SEA as SEA_MAP, portAt } from '../../../generators/history/questions.js';
import { COUNTRIES, DIRECTIONS, HARBOUR_MAP } from '../../../data/history/facts.js';
import { THEME, hex } from '../../../ui/theme.js';
import { FONT, WEIGHT } from '../../../ui/TextStyles.js';
import { button, speakButton } from '../../../ui/Button.js';
import { readable } from '../../../ui/ReadableText.js';
import { card } from '../../../ui/Card.js';
import { stripe } from '../../../ui/Panel.js';
import { plainTheme } from '../../../ui/Explain.js';
import { T } from '../../../ui/TextStyles.js';
import { pointerPos } from '../../../systems/Layout.js';
import { Sfx } from '../../../systems/Audio.js';
import { draggable, nearestTarget } from '../../../ui/Drag.js';

const cap = (str) => str.charAt(0).toUpperCase() + str.slice(1);
import { flagImage } from '../../../ui/Flags.js';

const SKY = 0xe9eff9, SEA = 0x8fb8e8, SEA_DARK = 0x4f7fc0, SAND = 0xf1dfb0, ROPE = 0x8b6b3e;

/**
 * History Harbor's four games in one quiz: Compass Quest, Community Helpers, Flag Finder and Past & Present.
 * Flags are drawn (ui/Flags.js), never left to the device's emoji. The bench along the top shows the learning:
 * a compass rose whose points light up, a town street filling with helpers, flags hoisted along a rope, and a
 * timeline from long ago to today.
 */
export class HistoryQuiz extends PictureQuiz {
  constructor() { super('MG_HistoryQuiz'); }

  get hasBench() { return true; }
  makeSet(n, targets) { return historySet(this.gameId, this.payload.grade, this.rng, n, targets); }
  /** New Skill pages are words only, so their examples come from the kinds that need no drawn flag or map. */
  makeOne(d) { return historyQuestion(this.gameId, this.payload.grade, this.rng, d, { drawn: false }); }

  promptHeight(area, q) { return q.map || q.flag ? Math.min(area.h * 0.46, 190 * this.ui) : super.promptHeight(area, q); }

  drawPicture(cx, y, size, q) {
    const ui = this.ui;
    if (q.flag) return flagImage(this, cx, y, size * 2.4, size * 1.6, q.flag);
    if (q.map) {
      // The harbour map: the lighthouse in the middle, N E S W marked, the four things around it.
      const c = this.add.container(cx, y), g = this.add.graphics(), r = size * 0.95;
      g.fillStyle(SEA, 0.35); g.fillRoundedRect(-r * 1.9, -r * 1.15, r * 3.8, r * 2.3, 10);
      g.lineStyle(2, SEA_DARK, 0.6); g.lineBetween(-r * 1.3, 0, r * 1.3, 0); g.lineBetween(0, -r * 0.85, 0, r * 0.85);
      const fs = { fontSize: Math.round(size * 0.5) + 'px' };
      c.add([g, this.add.text(0, 0, '🗼', fs).setOrigin(0.5)]);
      const pos = { north: [0, -r * 0.62], south: [0, r * 0.62], east: [r * 1.1, 0], west: [-r * 1.1, 0] };
      for (const s of HARBOUR_MAP) c.add(this.add.text(pos[s.dir][0], pos[s.dir][1], s.pic, fs).setOrigin(0.5));
      const lab = (t, x, yy) => this.add.text(x, yy, t, { fontFamily: FONT, fontSize: Math.round(11 * ui) + 'px', color: hex(SEA_DARK), fontStyle: WEIGHT.heavy }).setOrigin(0.5);
      c.add([lab('N', 0, -r * 1.02), lab('S', 0, r * 1.02), lab('E', r * 1.6, 0), lab('W', -r * 1.6, 0)]);
      return c;
    }
    return super.drawPicture(cx, y, size, q);
  }

  /** Flag-only choices: the button shows the drawn flag and no words (its label is kept, hidden, for tests). */
  answerButton(c, bh, choice, i, q, opts) {
    const b = button(this, c.x, c.y, c.w, bh, choice, opts);
    if (!q.flagChoices) return b;
    const country = countryOfLabel(choice);
    b.label.setVisible(false);
    if (country) b.add(flagImage(this, 0, 0, c.w - 28 * this.ui, bh - 16 * this.ui, country.code));
    return b;
  }
  choiceWords(q, choice) { return q.flagChoices ? null : choice; }

  /** A flags-only question goes into the log (and the later reviews, which show words) as "which country's flag is…?". */
  logQuestion(q, right) {
    if (!q.flagChoices) return super.logQuestion(q, right);
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    const name = (code) => { const c = countryOfLabel(code); return c ? cap(c.name) : code; };
    const ans = countryOfLabel(q.answer);
    const text = ans ? `Which country's flag is ${ans.look}?` : q.text;
    super.logQuestion({ ...q, flagChoices: false, prompt: text, text, pics: [], choices: q.choices.map(name), answer: name(q.answer) }, right);
  }


  // ---- Hands-on questions: sailing round Barbados and turning the needle ------------------------------------

  create(data) {
    super.create(data);
    if (this.input && typeof this.input.on === 'function') {
      this.onNeedleDown = (p) => this.needleDown(p); this.onNeedleMove = (p) => this.needleMove(p); this.onNeedleUp = () => { this.turning = false; };
      this.input.on('pointerdown', this.onNeedleDown); this.input.on('pointermove', this.onNeedleMove); this.input.on('pointerup', this.onNeedleUp);
      this.events.once('shutdown', () => { if (this.input) { this.input.off('pointerdown', this.onNeedleDown); this.input.off('pointermove', this.onNeedleMove); this.input.off('pointerup', this.onNeedleUp); } });
    }
  }

  /** Where this question's ship is, or which way its needle points: kept across rebuilds, per question. */
  interState() {
    const s = this.state, q = this.round;
    s.inter ||= {};
    if (!s.inter[s.idx]) s.inter[s.idx] = q.sail ? { x: q.sail.start.x, y: q.sail.start.y, leg: 0, left: q.sail.orders[0].n } : q.needle ? { angle: q.needle.start }
      : q.call ? { driving: false, hint: null } : q.kit ? { packed: [], hint: null } : { paid: [], hint: null };
    return s.inter[s.idx];
  }

  buildGame(area) {
    const q = this.round;
    if (q && (q.sail || q.needle || q.call || q.kit || q.budget) && !this.inReview) return this.buildInteractive(area, q);
    return super.buildGame(area);
  }

  buildInteractive(area, q) {
    const s = this.state, ui = this.ui;
    if (this.skillIntroFor(area, q.skill, (k) => this.exampleFor(k), plainTheme)) return;
    const cx = area.x + area.w / 2;
    if (this.hasBench) {
      const benchH = Math.min(96 * ui, area.h * 0.17);
      this.drawBench({ x: area.x, y: area.y, w: area.w, h: benchH });
      area = { x: area.x, y: area.y + benchH + 8, w: area.w, h: area.h - benchH - 8 };
    }
    const answered = s.picked !== null;
    const promptH = Math.min(area.h * 0.26, 92 * ui);
    card(this, cx, area.y + promptH / 2, area.w, promptH);
    stripe(this, cx - 24 * ui, area.y + 10 * ui, 48 * ui, this.subject.accent, 5 * ui);
    const colour = answered ? (s.right ? THEME.successDark : THEME.danger) : THEME.ink;
    const said = readable(this, cx, area.y + promptH / 2 + 4 * ui, q.text, T.at(this, q.text.length > 54 ? 15 : 18, colour, { fontStyle: '700' }), { width: area.w - 90 * ui, align: 'center' });
    speakButton(this, area.x + area.w - 30 * ui, area.y + 26 * ui, 40 * ui, said, { rate: this.speechRate });
    this.autoRead(said, null);
    const board = { x: area.x, y: area.y + promptH + 10, w: area.w, h: area.h - promptH - 10 };
    if (q.sail) this.buildSail(board, q, answered); else if (q.needle) this.buildNeedle(board, q, answered);
    else if (q.call) this.buildCall(board, q, answered); else if (q.kit) this.buildKit(board, q, answered); else this.buildBudget(board, q, answered);
    if (answered && !s.right) this.explanationPanel(area, q, () => this.next());
  }

  /** The sea round Barbados: the island, its ports, the rocks, the ship and the treasure, with a compass to steer by. */
  buildSail(board, q, answered) {
    const ui = this.ui, st = this.interState(), sail = q.sail;
    // The compass cross (north above west / south / east) sits beside the map on a wide screen, below it on a tall one.
    const bw = Math.min(104 * ui, Math.max(60, (board.w - 24) / 3.4)), bh = Math.min(44 * ui, 44), gap = 6;
    const crossW = bw * 3 + gap * 2, crossH = bh * 2 + gap, ordersH = 30 * ui;
    const csBelow = Math.min((board.w - 12) / SEA_MAP.cols, (board.h - ordersH - crossH - 24) / SEA_MAP.rows);
    const csBeside = Math.min((board.w - crossW - 28) / SEA_MAP.cols, (board.h - ordersH - 12) / SEA_MAP.rows);
    const beside = csBeside > csBelow;
    const cs = Math.max(18, beside ? csBeside : csBelow);
    const gx = beside ? board.x + 6 : board.x + (board.w - cs * SEA_MAP.cols) / 2, gy = board.y;
    const g = this.add.graphics();
    g.fillStyle(SEA, 1); g.fillRoundedRect(gx - 4, gy - 4, cs * SEA_MAP.cols + 8, cs * SEA_MAP.rows + 8, 10);
    g.lineStyle(1, 0xffffff, 0.35);
    for (let i = 0; i <= SEA_MAP.cols; i++) g.lineBetween(gx + i * cs, gy, gx + i * cs, gy + SEA_MAP.rows * cs);
    for (let j = 0; j <= SEA_MAP.rows; j++) g.lineBetween(gx, gy + j * cs, gx + SEA_MAP.cols * cs, gy + j * cs);
    for (const [lx, ly] of SEA_MAP.land) { g.fillStyle(0x63c765, 1); g.fillRoundedRect(gx + lx * cs + 1, gy + ly * cs + 1, cs - 2, cs - 2, 5); g.fillStyle(0xf1dfb0, 0.5); g.fillRoundedRect(gx + lx * cs + 1, gy + ly * cs + cs - 6, cs - 2, 5, 2); }
    const fs = Math.round(cs * 0.62) + 'px';
    for (const p of SEA_MAP.ports) this.add.text(gx + (p.x + 0.5) * cs, gy + (p.y + 0.5) * cs + cs * 0.3, p.name, { fontFamily: FONT, fontSize: Math.max(8, Math.round(cs * 0.22)) + 'px', color: hex(SEA_DARK), fontStyle: WEIGHT.bold, backgroundColor: '#ffffffb0', padding: { x: 2, y: 1 } }).setOrigin(0.5, 0);
    for (const r of sail.rocks) this.add.text(gx + (r.x + 0.5) * cs, gy + (r.y + 0.5) * cs, '🪨', { fontSize: fs }).setOrigin(0.5);
    const dest = sail.dest;
    this.add.text(gx + (dest.x + 0.5) * cs, gy + (dest.y + 0.5) * cs, portAt(dest.x, dest.y) ? '⭐' : '💰', { fontSize: fs }).setOrigin(0.5);
    this.add.text(gx + SEA_MAP.cols * cs - 4, gy + 4, 'N ▲', { fontFamily: FONT, fontSize: Math.round(11 * ui) + 'px', color: hex(SEA_DARK), fontStyle: WEIGHT.heavy }).setOrigin(1, 0);
    this.ship = this.add.text(gx + (st.x + 0.5) * cs, gy + (st.y + 0.5) * cs, '⛵', { fontSize: Math.round(cs * 0.78) + 'px' }).setOrigin(0.5);
    // The orders, with the ones done ticked and the current one in colour.
    const parts = sail.orders.map((o, i) => (i < st.leg ? `✓ ${o.n} ${o.d}` : i === st.leg ? `▶ ${st.left < o.n ? `${st.left} more` : o.n} ${o.d}` : `${o.n} ${o.d}`));
    const oy = gy + SEA_MAP.rows * cs + 10 * ui;
    this.add.text(gx + (SEA_MAP.cols * cs) / 2, oy, answered ? (this.state.right ? `⭐ Reached ${dest.name}!` : 'Wrecked on the rocks!') : parts.join('   ·   '), { fontFamily: FONT, fontSize: Math.round(14 * ui) + 'px', color: hex(this.state.right === true ? THEME.successDark : THEME.ink), fontStyle: WEIGHT.bold, wordWrap: { width: SEA_MAP.cols * cs + 20 }, align: 'center' }).setOrigin(0.5, 0);
    // The compass: north above, west, south and east below.
    const cx = beside ? gx + cs * SEA_MAP.cols + 14 + crossW / 2 : board.x + board.w / 2;
    const by = beside ? gy + (SEA_MAP.rows * cs) / 2 + bh / 2 + gap / 2 : Math.min(board.y + board.h - bh / 2 - 4, oy + ordersH + bh * 1.5 + gap);
    const opts = { variant: 'secondary', fontSize: 15, compact: true, disabled: answered };
    button(this, cx, by - bh - gap, bw, bh, '▲ north', { ...opts, onClick: () => this.sailStep('north') });
    button(this, cx - bw - gap, by, bw, bh, '◀ west', { ...opts, onClick: () => this.sailStep('west') });
    button(this, cx, by, bw, bh, '▼ south', { ...opts, onClick: () => this.sailStep('south') });
    button(this, cx + bw + gap, by, bw, bh, 'east ▶', { ...opts, onClick: () => this.sailStep('east') });
  }

  /** One square in the direction tapped: the right way moves the ship, the wrong way runs it onto the rocks. */
  sailStep(d) {
    const s = this.state, q = this.round;
    if (!q || !q.sail || s.locked || s.picked !== null) return;
    const st = this.interState(), sail = q.sail, o = sail.orders[st.leg];
    if (!o) return;
    const moves = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] };
    if (d !== o.d) {
      Sfx.wrong && Sfx.wrong();
      if (this.cameras && this.cameras.main && this.cameras.main.shake) this.cameras.main.shake(150, 0.004);
      st.x = sail.start.x; st.y = sail.start.y; st.leg = 0; st.left = sail.orders[0].n;   // back to port for the second try
      return this.pick(1);
    }
    st.x += moves[d][0]; st.y += moves[d][1]; st.left -= 1;
    if (st.left === 0) { st.leg += 1; st.left = sail.orders[st.leg] ? sail.orders[st.leg].n : 0; }
    if (st.leg >= sail.orders.length) { Sfx.pop(); return this.pick(0); }
    Sfx.pop();
    this.rebuild();
  }

  /** The line under a helpers board: what to do, the last mistake, or the outcome. */
  hintLine(board, y, text, good = null) {
    const ui = this.ui, colour = good === true ? THEME.successDark : good === false ? THEME.danger : THEME.ink2;
    this.add.text(board.x + board.w / 2, y, text, { fontFamily: FONT, fontSize: Math.round(13 * ui) + 'px', color: hex(colour), fontStyle: WEIGHT.bold, wordWrap: { width: board.w - 16 }, align: 'center' }).setOrigin(0.5, 0);
  }

  /** Who do you call? A little town: trouble at the house in the middle, the helpers' workplaces around it. */
  buildCall(board, q, answered) {
    const ui = this.ui, st = this.interState(), c = q.call, s = this.state;
    const hintH = 34 * ui, bx = board.x + 4, by = board.y, bw = board.w - 8, bh = Math.max(110, board.h - hintH);
    const g = this.add.graphics();
    g.fillStyle(0x8fd48a, 1); g.fillRoundedRect(bx, by, bw, bh, 14);
    const n = c.buildings.length, cols = Math.ceil(n / 2);
    const house = { x: bx + bw / 2, y: by + bh / 2 };
    const spots = c.buildings.map((b, i) => ({ x: bx + (bw * ((i % cols) + 0.5)) / cols, y: by + (i < cols ? bh * 0.2 : bh * 0.78) }));
    const size = Math.max(20, Math.min(36 * ui, bw / (cols * 2.6), bh * 0.17));
    g.lineStyle(Math.max(8, Math.min(14 * ui, size * 0.4)), 0xc9c3b8, 1);
    spots.forEach((p) => g.lineBetween(p.x, p.y + size * 0.3, house.x, house.y + size * 0.25));
    const right = c.buildings.find((b) => b.id === c.to), ri = c.buildings.indexOf(right);
    if (answered && !s.right) { g.lineStyle(3, 0xffc531, 1); g.strokeCircle(spots[ri].x, spots[ri].y + size * 0.25, size * 1.05); }
    const nameStyle = { fontFamily: FONT, fontSize: Math.round(Math.max(9, 11 * ui)) + 'px', color: hex(THEME.ink), fontStyle: WEIGHT.bold, backgroundColor: '#ffffffb0', padding: { x: 3, y: 1 } };
    c.buildings.forEach((b, i) => {
      const p = spots[i];
      this.add.text(p.x, p.y, b.pic, { fontSize: Math.round(size) + 'px' }).setOrigin(0.5);
      this.add.text(p.x, p.y + size * 0.62, b.name, nameStyle).setOrigin(0.5, 0);
      if (!answered && !st.driving) this.add.zone(p.x, p.y + size * 0.35, size * 2.6, size * 2).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.callTap(b.id));
    });
    this.add.text(house.x, house.y, '🏠', { fontSize: Math.round(size * 1.15) + 'px' }).setOrigin(0.5);
    if (!(answered && s.right)) this.add.text(house.x + size * 0.75, house.y - size * 0.7, c.pic, { fontSize: Math.round(size * 0.75) + 'px' }).setOrigin(0.5);
    if (answered && s.right) this.add.text(house.x - size * 0.95, house.y + size * 0.35, right.car, { fontSize: Math.round(size * 0.85) + 'px' }).setOrigin(0.5);
    this.callSpots = { spots, house, size };
    const line = answered ? (s.right ? `The ${right.who} is here! ⭐` : `Call ${right.name}: that is where the ${right.who} works.`) : st.hint || 'Tap the building to call for help.';
    this.hintLine(board, by + bh + 6 * ui, line, answered ? s.right : st.hint ? false : null);
  }

  /** A tap on a building: the right one sends the helper's vehicle to the house; a wrong one is a try again. */
  callTap(id) {
    const s = this.state, q = this.round;
    if (!q || !q.call || s.locked || s.picked !== null) return;
    const st = this.interState(), c = q.call, b = c.buildings.find((x) => x.id === id);
    if (!b || st.driving) return;
    if (b.id !== c.to) { Sfx.wrong(); st.hint = `The ${b.who} can't help with that. Who can?`; return this.pick(1); }
    st.hint = null; st.driving = true; Sfx.pop();
    const sp = this.callSpots, from = sp.spots[c.buildings.indexOf(b)];
    const car = this.add.text(from.x, from.y + sp.size * 0.3, b.car, { fontSize: Math.round(sp.size * 0.85) + 'px' }).setOrigin(0.5).setDepth(50);
    const arrive = () => { st.driving = false; this.pick(0); };
    if (this.tweens) this.tweens.add({ targets: car, x: sp.house.x - sp.size * 0.95, y: sp.house.y + sp.size * 0.35, duration: 1100, ease: 'Sine.InOut', onComplete: arrive }); else arrive();
  }

  /** Pack the kit: the helper and their bag beside a shelf of six things (the shelf runs along the bottom on a phone); drag or tap two in. */
  buildKit(board, q, answered) {
    const ui = this.ui, st = this.interState(), k = q.kit, s = this.state;
    const hintH = 34 * ui, bh = Math.max(120, board.h - hintH), portrait = bh > board.w * 1.1;
    // The shelf: a column of 2 x 3 on the right, or a row of 3 x 2 along the bottom.
    const shelf = portrait ? { x: board.x + 4, y: board.y + bh * 0.5, w: board.w - 8, h: bh * 0.5, cols: 3, rows: 2 }
      : { x: board.x + board.w - Math.min(board.w * 0.48, 230 * ui) - 4, y: board.y, w: Math.min(board.w * 0.48, 230 * ui), h: bh, cols: 2, rows: 3 };
    const g = this.add.graphics();
    g.fillStyle(0xe9ddc6, 1); g.fillRoundedRect(shelf.x, shelf.y, shelf.w, shelf.h, 12);
    const small = { fontFamily: FONT, fontSize: Math.round(12 * ui) + 'px', color: hex(0x8b6b3e), fontStyle: WEIGHT.bold };
    this.add.text(shelf.x + shelf.w / 2, shelf.y + 6 * ui, 'the shelf', small).setOrigin(0.5, 0);
    // The helper and the bag: stacked on the left, or side by side above the shelf.
    const side = portrait ? { x: board.x + 4, y: board.y, w: board.w - 8, h: bh * 0.5 - 8 } : { x: board.x + 4, y: board.y, w: shelf.x - board.x - 8, h: bh };
    const hx = portrait ? side.x + side.w * 0.27 : side.x + side.w / 2, hy = portrait ? side.y + side.h * 0.42 : side.y + side.h * 0.26;
    const hs = Math.max(28, Math.min(64 * ui, (portrait ? side.h : side.w) * 0.42, side.h * (portrait ? 0.5 : 0.28)));
    this.add.text(hx, hy, k.helper.pic, { fontSize: Math.round(hs) + 'px' }).setOrigin(0.5);
    this.add.text(hx, hy + hs * 0.62, `the ${k.helper.name}`, { fontFamily: FONT, fontSize: Math.round(13 * ui) + 'px', color: hex(THEME.ink), fontStyle: WEIGHT.bold }).setOrigin(0.5, 0);
    const full = st.packed.length >= 2;
    const bag = portrait ? { x: side.x + side.w * 0.7, y: side.y + side.h * 0.46, w: Math.min(side.w * 0.5, 170 * ui), h: Math.min(side.h * 0.6, 90 * ui) }
      : { x: hx, y: side.y + side.h * 0.76, w: Math.min(side.w - 12, 160 * ui), h: Math.min(side.h * 0.3, 84 * ui) };
    g.fillStyle(full ? 0xd7f3df : 0xffe9b8, 1); g.fillRoundedRect(bag.x - bag.w / 2, bag.y - bag.h / 2, bag.w, bag.h, 14);
    g.lineStyle(3, full ? THEME.successDark : 0xb37400, 1); g.strokeRoundedRect(bag.x - bag.w / 2, bag.y - bag.h / 2, bag.w, bag.h, 14);
    this.add.text(bag.x, bag.y + bag.h / 2 + 4 * ui, full ? 'packed!' : 'the bag', { ...small, color: hex(full ? THEME.successDark : 0xb37400) }).setOrigin(0.5, 0);
    const is = Math.max(22, Math.min(36 * ui, (shelf.w / shelf.cols) * 0.55, ((shelf.h - 26 * ui) / shelf.rows) * 0.6));
    st.packed.forEach((i, n) => this.add.text(bag.x - bag.w / 4 + (n * bag.w) / 2, bag.y, k.shelf[i].pic, { fontSize: Math.round(is) + 'px' }).setOrigin(0.5));
    this.bagRect = bag;
    k.shelf.forEach((item, i) => {
      if (st.packed.includes(i)) return;
      const col = i % shelf.cols, row = Math.floor(i / shelf.cols);
      const t = this.add.text(shelf.x + (shelf.w * (col + 0.5)) / shelf.cols, shelf.y + 24 * ui + ((shelf.h - 28 * ui) * (row + 0.5)) / shelf.rows, item.pic, { fontSize: Math.round(is) + 'px' }).setOrigin(0.5);
      if (answered) return;
      const over = (x, y) => Math.abs(x - bag.x) < bag.w / 2 + 12 && Math.abs(y - bag.y) < bag.h / 2 + 12;
      draggable(this, t, { onTap: () => this.kitDrop(i), onDrop: (x, y) => { if (!over(x, y)) return false; this.kitDrop(i); return true; } });
    });
    const line = answered ? (s.right ? `The ${k.helper.name} has everything. Off to work! ⭐` : `A ${k.helper.name} needs ${k.shelf.filter((x) => x.owner === k.helper.name).map((x) => x.name).join(' and ')}.`) : st.hint || 'Drag the two things they need into the bag.';
    this.hintLine(board, board.y + bh + 6 * ui, line, answered ? s.right : st.hint ? false : null);
  }

  /** Something put in the bag: the helper's own things stay in, anything else is a try again. */
  kitDrop(i) {
    const s = this.state, q = this.round;
    if (!q || !q.kit || s.locked || s.picked !== null) return;
    const st = this.interState(), k = q.kit, item = k.shelf[i];
    if (!item || st.packed.includes(i)) return;
    if (item.owner !== k.helper.name) { Sfx.wrong(); st.hint = `${cap(item.name)}? That is what a ${item.owner} uses.`; return this.pick(1); }
    st.packed.push(i); st.hint = null; Sfx.pop();
    if (st.packed.length >= 2) return this.pick(0);
    this.rebuild();
  }

  /** Run the town: six things in boxes, a chest of tax coins below; drag (or tap) a coin onto each public service. */
  buildBudget(board, q, answered) {
    const ui = this.ui, st = this.interState(), b = q.budget, s = this.state;
    const hintH = 34 * ui, chestH = Math.max(48, Math.min(72 * ui, board.h * 0.2)), gridH = board.h - hintH - chestH - 8;
    const cols = 3, cw = (board.w - 8) / cols, ch = gridH / 2;
    const boxes = b.items.map((it, i) => ({ x: board.x + 4 + cw * (i % cols) + cw / 2, y: board.y + ch * Math.floor(i / cols) + ch / 2, w: cw - 8, h: ch - 8 }));
    const g = this.add.graphics();
    const ps = Math.max(18, Math.min(30 * ui, ch * 0.4)), ns = Math.round(Math.max(9, Math.min(12 * ui, cw / 11)));
    b.items.forEach((it, i) => {
      const bx = boxes[i], paid = st.paid.includes(i);
      g.fillStyle(paid ? 0xd7f3df : 0xeef2f8, 1); g.fillRoundedRect(bx.x - bx.w / 2, bx.y - bx.h / 2, bx.w, bx.h, 12);
      g.lineStyle(2, paid ? THEME.successDark : 0xc7d0e0, 1); g.strokeRoundedRect(bx.x - bx.w / 2, bx.y - bx.h / 2, bx.w, bx.h, 12);
      this.add.text(bx.x, bx.y - bx.h * 0.18, it.pic, { fontSize: Math.round(ps) + 'px' }).setOrigin(0.5);
      this.add.text(bx.x, bx.y + bx.h * 0.18, it.name, { fontFamily: FONT, fontSize: ns + 'px', color: hex(THEME.ink), fontStyle: WEIGHT.bold, wordWrap: { width: bx.w - 8 }, align: 'center' }).setOrigin(0.5, 0);
      if (paid) this.add.text(bx.x + bx.w / 2 - 12 * ui, bx.y - bx.h / 2 + 12 * ui, '🪙', { fontSize: Math.round(ps * 0.6) + 'px' }).setOrigin(0.5);
      else if (!answered) this.add.zone(bx.x, bx.y, bx.w, bx.h).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.budgetPay(i));
    });
    const cy = board.y + gridH + 4 + chestH / 2;
    g.fillStyle(0xe9ddc6, 1); g.fillRoundedRect(board.x + 4, cy - chestH / 2, board.w - 8, chestH, 12);
    this.add.text(board.x + board.w - 12 * ui, cy - chestH / 2 + 6 * ui, 'the tax chest', { fontFamily: FONT, fontSize: Math.round(11 * ui) + 'px', color: hex(0x8b6b3e), fontStyle: WEIGHT.bold }).setOrigin(1, 0);
    const left = b.coins - st.paid.length, cs = Math.max(22, Math.min(34 * ui, chestH * 0.6));
    for (let n = 0; n < left; n++) {
      const coin = this.add.text(board.x + 24 * ui + cs / 2 + n * cs * 1.5, cy, '🪙', { fontSize: Math.round(cs) + 'px' }).setOrigin(0.5);
      if (answered) continue;
      draggable(this, coin, { onDrop: (x, y) => { const i = nearestTarget(boxes, x, y, Math.max(boxes[0].w, boxes[0].h) * 0.6); if (i < 0) return false; this.budgetPay(i); return true; } });
    }
    const pub = b.items.filter((x) => x.pub).map((x) => x.name);
    const line = answered ? (s.right ? 'The town is running! Everyone shares what the taxes pay for. ⭐' : `Taxes pay for ${pub.join(', ')}.`) : st.hint || 'Drag a coin onto each thing the town should pay for.';
    this.hintLine(board, cy + chestH / 2 + 6 * ui, line, answered ? s.right : st.hint ? false : null);
  }

  /** A coin on a box: a public service takes it; a private thing sends it back with the reason, as a try again. */
  budgetPay(i) {
    const s = this.state, q = this.round;
    if (!q || !q.budget || s.locked || s.picked !== null) return;
    const st = this.interState(), b = q.budget, it = b.items[i];
    if (!it || st.paid.includes(i)) return;
    if (!it.pub) { Sfx.wrong(); st.hint = `Not ${it.name}. ${it.why}`; return this.pick(1); }
    st.paid.push(i); st.hint = null; Sfx.pop();
    if (st.paid.length >= b.items.filter((x) => x.pub).length) return this.pick(0);
    this.rebuild();
  }

  /** A compass rose with a needle to drag; Check tells whether it points the way the question asked. */
  buildNeedle(board, q, answered) {
    const ui = this.ui, n = q.needle;
    const bh = 44 * ui, R = Math.max(40, Math.min(board.w, board.h - bh - 40 * ui) / 2 - 14 * ui), cx = board.x + board.w / 2, cy = board.y + R + 12 * ui;
    this.rose = { cx, cy, R };
    const g = this.add.graphics();
    g.fillStyle(0xeef2f8, 1); g.fillCircle(cx, cy, R + 8); g.lineStyle(3, this.subject.accent, 1); g.strokeCircle(cx, cy, R + 8);
    g.fillStyle(0xffffff, 1); g.fillCircle(cx, cy, R - 2);
    for (let d = 0; d < 360; d += 15) { const a = ((d - 90) * Math.PI) / 180; g.lineStyle(d % 90 === 0 ? 3 : 1.2, this.subject.accent, 1); g.lineBetween(cx + Math.cos(a) * (R - 10), cy + Math.sin(a) * (R - 10), cx + Math.cos(a) * R, cy + Math.sin(a) * R); }
    const points = [['N', 0], ['NE', 45], ['E', 90], ['SE', 135], ['S', 180], ['SW', 225], ['W', 270], ['NW', 315]];
    for (const [l, deg] of points) { const a = ((deg - 90) * Math.PI) / 180, big = deg % 90 === 0; this.add.text(cx + Math.cos(a) * (R - 24 * ui), cy + Math.sin(a) * (R - 24 * ui), l, { fontFamily: FONT, fontSize: Math.round((big ? 18 : 11) * ui) + 'px', color: hex(big ? this.subject.dark : THEME.ink2), fontStyle: WEIGHT.heavy }).setOrigin(0.5); }
    if (answered) { const a = ((n.target - 90) * Math.PI) / 180; g.lineStyle(4, 0xffc531, 1); g.lineBetween(cx, cy, cx + Math.cos(a) * (R - 12), cy + Math.sin(a) * (R - 12)); }   // where it should point
    this.needleGfx = this.add.graphics();
    this.degText = this.add.text(cx, cy + R + 14 * ui, '', { fontFamily: FONT, fontSize: Math.round(13 * ui) + 'px', color: hex(THEME.ink2), fontStyle: WEIGHT.bold }).setOrigin(0.5, 0);
    this.showDegrees = q.skill === 'compass-degrees' || this.payload.grade >= 4;
    this.drawNeedle();
    button(this, cx, Math.min(board.y + board.h - bh / 2 - 4, cy + R + 44 * ui + bh / 2), Math.min(board.w - 24, 200 * ui), bh, answered ? (this.state.right ? '⭐ Spot on!' : 'Not that way') : 'Check ✓', { variant: answered ? (this.state.right ? 'success' : 'danger') : 'go', fontSize: 16, disabled: answered, onClick: () => this.needleCheck() });
  }

  drawNeedle() {
    const g = this.needleGfx, r = this.rose;
    if (!g || !g.active || !r) return;
    const st = this.interState(), a = ((st.angle - 90) * Math.PI) / 180, L = r.R - 16, wv = 11;
    g.clear();
    g.fillStyle(0xe5383b, 1); g.fillTriangle(r.cx + Math.cos(a) * L, r.cy + Math.sin(a) * L, r.cx + Math.cos(a + Math.PI / 2) * wv, r.cy + Math.sin(a + Math.PI / 2) * wv, r.cx + Math.cos(a - Math.PI / 2) * wv, r.cy + Math.sin(a - Math.PI / 2) * wv);
    g.fillStyle(0x9aa0a8, 1); g.fillTriangle(r.cx - Math.cos(a) * L, r.cy - Math.sin(a) * L, r.cx + Math.cos(a + Math.PI / 2) * wv, r.cy + Math.sin(a + Math.PI / 2) * wv, r.cx + Math.cos(a - Math.PI / 2) * wv, r.cy + Math.sin(a - Math.PI / 2) * wv);
    g.fillStyle(0xffc531, 1); g.fillCircle(r.cx, r.cy, 7); g.lineStyle(1.5, 0xb37400, 1); g.strokeCircle(r.cx, r.cy, 7);
    if (this.degText && this.degText.active) this.degText.setText(this.showDegrees ? `${Math.round(st.angle)}°` : '');
  }

  needleDown(pointer) {
    const q = this.round, r = this.rose;
    if (!q || !q.needle || !r || this.state.locked || this.state.picked !== null) return;
    const { x, y } = pointerPos(this, pointer);
    if (Math.hypot(x - r.cx, y - r.cy) > r.R + 24) return;
    this.turning = true; this.needleMove(pointer);
  }

  needleMove(pointer) {
    if (!this.turning || !this.rose) return;
    const { x, y } = pointerPos(this, pointer), r = this.rose;
    const st = this.interState();
    st.angle = ((Math.atan2(y - r.cy, x - r.cx) * 180) / Math.PI + 90 + 360) % 360;
    this.drawNeedle();
  }

  needleCheck() {
    const s = this.state, q = this.round;
    if (!q || !q.needle || s.locked || s.picked !== null) return;
    const st = this.interState(), diff = Math.abs((((st.angle - q.needle.target) % 360) + 540) % 360 - 180);
    if (diff <= q.needle.tolerance) { Sfx.pop(); return this.pick(0); }
    Sfx.wrong && Sfx.wrong();
    this.pick(1);
  }

  drawBench(r) {
    const ui = this.ui, s = this.state, id = this.gameId, g = this.add.graphics();
    g.fillStyle(SKY, 1); g.fillRoundedRect(r.x, r.y, r.w, r.h, 16);
    g.lineStyle(2, this.subject.soft, 1); g.strokeRoundedRect(r.x, r.y, r.w, r.h, 16);
    const fs = (px) => ({ fontSize: Math.round(px) + 'px' });
    const small = { fontFamily: FONT, fontSize: Math.round(12 * ui) + 'px', color: hex(THEME.ink2), fontStyle: WEIGHT.bold };
    if (id === 'his-compass') {
      // A compass rose whose points light up as directions are found, and a ship sailing across with progress.
      const cx = r.x + r.h * 0.55, cy = r.y + r.h / 2, rad = r.h * 0.34;
      g.fillStyle(0xffffff, 0.9); g.fillCircle(cx, cy, rad + 4 * ui);
      const found = new Set(s.bench.map((b) => b.dir).filter(Boolean));
      for (const d of DIRECTIONS) {
        const a = ((d.degrees - 90) * Math.PI) / 180, on = found.has(d.id);
        g.fillStyle(on ? this.subject.accent : 0xc7d2e3, 1);
        g.fillTriangle(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, cx + Math.cos(a + Math.PI / 2) * rad * 0.2, cy + Math.sin(a + Math.PI / 2) * rad * 0.2, cx + Math.cos(a - Math.PI / 2) * rad * 0.2, cy + Math.sin(a - Math.PI / 2) * rad * 0.2);
        this.add.text(cx + Math.cos(a) * (rad + 11 * ui), cy + Math.sin(a) * (rad + 11 * ui), d.letter, { ...small, color: hex(on ? this.subject.dark : 0x9aa7bd) }).setOrigin(0.5);
      }
      const sx = cx + rad + 30 * ui, sw = r.x + r.w - sx - 16 * ui, sy = cy + r.h * 0.08;
      g.fillStyle(SEA, 0.5); g.fillRoundedRect(sx, sy, sw, r.h * 0.28, 8);
      const t = this.add.text(sx + 12 * ui + (sw - 24 * ui) * (s.idx / Math.max(1, this.total)), sy - 2 * ui, '⛵', fs(Math.min(28 * ui, r.h * 0.42))).setOrigin(0.5, 0.7);
      if (this.tweens) this.tweens.add({ targets: t, y: t.y - 3 * ui, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      this.add.text(sx + sw / 2, sy - r.h * 0.24, `${s.bench.length} found`, small).setOrigin(0.5);
    } else if (id === 'his-helpers') {
      // A street of the town: each right answer brings a helper out to stand along it.
      const road = r.y + r.h - 16 * ui;
      g.fillStyle(SAND, 1); g.fillRoundedRect(r.x + 8 * ui, road - 6 * ui, r.w - 16 * ui, 14 * ui, 6);
      const houses = ['🏥', '🚒', '🏫', '🏤', '🏪', '🏛️'];
      const hs = Math.min(26 * ui, (r.w - 32 * ui) / 10);
      houses.forEach((h, i) => this.add.text(r.x + 20 * ui + (i * (r.w - 40 * ui)) / (houses.length - 1), road - 14 * ui, h, fs(hs)).setOrigin(0.5, 1));
      s.bench.slice(-8).forEach((b, k) => this.add.text(r.x + 24 * ui + k * hs * 1.15, road + 2 * ui, b.pic || '🧑', fs(hs * 0.8)).setOrigin(0.5, 0.75));
    } else if (id === 'his-flags') {
      // A rope between two masts, with a flag hoisted for each right answer.
      const y = r.y + r.h * 0.22, x0 = r.x + 20 * ui, x1 = r.x + r.w - 20 * ui;
      g.lineStyle(3 * ui, ROPE, 1); g.lineBetween(x0, r.y + 10 * ui, x0, r.y + r.h - 8 * ui); g.lineBetween(x1, r.y + 10 * ui, x1, r.y + r.h - 8 * ui);
      g.lineStyle(2, ROPE, 1); g.lineBetween(x0, y, x1, y);
      const flags = s.bench.map((b) => b.flag).filter(Boolean).slice(-8);
      const fw = Math.min(42 * ui, (x1 - x0 - 20 * ui) / 8.5), fh = (fw * 2) / 3;
      flags.forEach((code, k) => flagImage(this, x0 + 16 * ui + fw / 2 + k * (fw + 6 * ui), y + fh / 2 + 3 * ui, fw, fh, code));
      this.add.text(r.x + r.w / 2, r.y + r.h - 10 * ui, `${s.bench.length} flags hoisted`, small).setOrigin(0.5, 1);
    } else {
      // A timeline from long ago to today, with the right answers' pictures pinned along it.
      const y = r.y + r.h * 0.6, x0 = r.x + 20 * ui, x1 = r.x + r.w - 20 * ui;
      g.lineStyle(4 * ui, ROPE, 1); g.lineBetween(x0, y, x1, y);
      this.add.text(x0, y + 8 * ui, 'long ago', small).setOrigin(0, 0);
      this.add.text(x1, y + 8 * ui, 'today', small).setOrigin(1, 0);
      const n = Math.max(1, this.total);
      s.bench.forEach((b, k) => {
        const x = x0 + 16 * ui + ((x1 - x0 - 32 * ui) * k) / Math.max(1, n - 1);
        g.fillStyle(this.subject.accent, 1); g.fillCircle(x, y, 4 * ui);
        this.add.text(x, y - 6 * ui, b.pic || '🕰️', fs(Math.min(22 * ui, r.h * 0.34))).setOrigin(0.5, 1);
      });
    }
  }

  /** What a right answer adds to the bench: its picture, the flag it was about, the direction it found. */
  benchItem(q) {
    if (q.sail || q.needle) return { pic: q.sail ? '⛵' : '🧭', flag: null, dir: q.dir || null };
    if (q.call || q.kit || q.budget) return { pic: q.call ? q.call.buildings.find((b) => b.id === q.call.to).car : q.kit ? q.kit.helper.pic : '🪙', flag: null, dir: null };
    const first = q.answer.split(' ')[0];
    const emoji = /\p{Extended_Pictographic}/u.test(first) ? first : null;
    const pic = emoji || (q.pics && q.pics[0] && !q.map ? q.pics[0] : null);
    const country = q.flag ? COUNTRIES.find((c) => c.code === q.flag) : countryOfLabel(q.answer);
    const dir = DIRECTIONS.find((d) => q.answer === `${d.pic} ${d.name}`) || null;
    return { pic: pic || (country ? flagCode(country) : null), flag: country ? country.code : null, dir: dir ? dir.id : null };
  }
}
