import { BaseScene } from './BaseScene.js';
import { SCENES, GRADES, AVATAR_COUNT } from '../constants.js';
import { THEME } from '../ui/theme.js';
import * as Store from '../systems/Store.js';
import { levelFromXp } from '../systems/SaveSystem.js';
import { grid, safeArea } from '../systems/Layout.js';
import { T, text } from '../ui/TextStyles.js';
import { button, iconButton } from '../ui/Button.js';
import { background } from '../ui/Panel.js';
import { card } from '../ui/Card.js';
import { modal } from '../ui/Modal.js';
import { textInput } from '../ui/Input.js';
import { enter } from '../ui/motion.js';
import { Sfx } from '../systems/Audio.js';
import { resolveLook, sanitizeLook, BG_COLORS, SEXES, HAIR_STYLES, TOPS, BOTTOMS, SKIN_TONES, HAIR_COLOURS, CLOTH_COLOURS, EYE_COLOURS } from '../data/avatars.js';
import { lookSpriteTexture, IDLE_FRAMES } from '../systems/Textures.js';
import { swatch, HAIR_STYLES as LPC_HAIR, TOP_STYLES, BOTTOM_STYLES } from '../ui/LpcCharacter.js';
import { badgeTexture } from '../systems/Textures.js';
import { gradeLabel } from '../data/grades.js';

// Colour rows in the editor; `key` matches the fields of a profile's look.
// Colour rows in the editor; `key` matches the fields of a profile's look. Palette rows list variant names and
// show each one's swatch colour; the background row lists colours directly.
const SWATCHES = [
  { key: 'skin', title: 'SKIN', material: 'body', options: SKIN_TONES },
  { key: 'hair', title: 'HAIR COLOUR', material: 'hair', options: HAIR_COLOURS },
  { key: 'top', title: 'TOP COLOUR', material: 'cloth', options: CLOTH_COLOURS },
  { key: 'bottom', title: 'BOTTOM COLOUR', material: 'cloth', options: CLOTH_COLOURS },
  { key: 'eyes', title: 'EYES', material: 'eye', options: EYE_COLOURS },
  { key: 'bg', title: 'BACKGROUND', colors: BG_COLORS }
];
// Style rows: buttons rather than swatches.
const STYLE_ROWS = [
  { key: 'sex', title: 'BOY OR GIRL', options: SEXES, label: (v) => (v === 'boy' ? '👦 Boy' : '👧 Girl'), perRow: 2 },
  { key: 'hairStyle', title: 'HAIR STYLE', options: HAIR_STYLES, label: (v) => LPC_HAIR[v].name, perRow: 6 },
  { key: 'topStyle', title: 'TOP', options: TOPS, label: (v) => TOP_STYLES[v].name, perRow: 3 },
  { key: 'bottomStyle', title: 'BOTTOM', options: BOTTOMS, label: (v) => BOTTOM_STYLES[v].name, perRow: 3 }
];

/** Pick, create, edit or delete local player profiles. */
export class ProfileScene extends BaseScene {
  constructor() { super(SCENES.Profile); this.fade = true; }

  init(data) {
    this.state = { mode: 'list', page: 'details', editing: null, draft: null, confirmDelete: false };
    const edit = data && data.edit && Store.listProfiles().find((p) => p.id === data.edit);
    if (edit) { this.state.mode = 'form'; this.state.editing = edit; this.state.draft = this.draftFor(edit); }
  }

  draftFor(profile) {
    return profile
      ? { name: profile.name, avatar: profile.avatar, look: sanitizeLook(profile.look), grade: profile.grade, readAloud: profile.readAloud || 'auto', readAnswers: profile.readAnswers || 'on', timers: profile.timers || 'on' }
      : { name: '', avatar: Math.floor(Math.random() * AVATAR_COUNT), look: null, grade: 3, readAloud: 'auto', readAnswers: 'on', timers: 'on' };
  }

  build() {
    background(this, { accent: THEME.primary, accent2: THEME.pink });
    if (this.state.mode === 'form') return this.state.page === 'look' ? this.buildLookPage() : this.buildForm();
    this.buildList();
  }

  buildList() {
    const { w, h, ui } = this;
    const top0 = safeArea().top;
    const title = text(this, w / 2, top0 + 50 * ui, 'Quest Academy', T.display(this));
    const sub = text(this, w / 2, top0 + 50 * ui + 36 * ui, 'Who is playing?', T.body(this, THEME.ink2));
    enter(this, [title, sub], { from: 'down', distance: 12 });
    const profiles = Store.listProfiles();
    const items = [...profiles, { isNew: true }];
    const cols = this.portrait ? 2 : Math.min(4, items.length);
    const rows = Math.ceil(items.length / cols);
    const top = top0 + 50 * ui + 70 * ui;
    const areaW = Math.min(w - 32, 220 * ui * cols + 12 * (cols - 1));
    const cellH = Math.min(150 * ui, (h - top - 24 - 12 * (rows - 1)) / rows);
    const cells = grid({ x: (w - areaW) / 2, y: top, w: areaW, h: (cellH + 12) * rows - 12 }, cols, rows, 12);
    const cards = [];
    items.forEach((p, i) => {
      const c = cells[i]; if (!c) return;
      cards.push(p.isNew ? this.newCard(c) : this.profileCard(p, c));
    });
    enter(this, cards, { from: 'up', delay: 100, stagger: 60 });
  }

  profileCard(p, c) {
    const { ui } = this;
    const k = card(this, c.x, c.y, c.w, c.h, { stroke: THEME.line, onTap: () => { Store.setActiveProfile(p.id); this.go(SCENES.ModeSelect); } });
    const disc = this.add.circle(0, -c.h * 0.22, 36 * ui, THEME.primarySoft);
    const img = this.add.image(0, -c.h * 0.22, badgeTexture(this, resolveLook(p))).setDisplaySize(56 * ui, 56 * ui);
    const name = this.add.text(0, c.h * 0.14, p.name, T.bodyBold(this)).setOrigin(0.5);
    const meta = this.add.text(0, c.h * 0.32, `${gradeLabel(p.grade)}  ·  Lv ${levelFromXp(p.xp)}`, T.small(this, THEME.ink2)).setOrigin(0.5);
    k.add([disc, img, name, meta]);
    const edit = iconButton(this, c.x + c.w / 2 - 22 * ui, c.y - c.h / 2 + 22 * ui, 32 * ui, '✎', { variant: 'ghost', onClick: () => this.openForm(p) });
    edit.setDepth(2);
    return k;
  }

  newCard(c) {
    const { ui } = this;
    const k = card(this, c.x, c.y, c.w, c.h, { color: THEME.sunken, stroke: THEME.lineStrong, shadow: 'none', onTap: () => this.openForm(null) });
    const plus = this.add.text(0, -12 * ui, '+', T.big(this, THEME.primary)).setOrigin(0.5);
    const lbl = this.add.text(0, 30 * ui, 'New player', T.bodyBold(this, THEME.primary)).setOrigin(0.5);
    k.add([plus, lbl]);
    return k;
  }

  openForm(profile) {
    this.state.mode = 'form';
    this.state.editing = profile;
    this.state.confirmDelete = false;
    this.state.draft = this.draftFor(profile);
    this.buildCount = 0;   // animate the form in
    this.rebuild();
  }

  buildForm() {
    const { w, h } = this;
    const d = this.state.draft;
    const editing = !!this.state.editing;
    const pw = Math.min(w - 24, 520 * this.ui);
    const aCols = this.portrait && pw < 400 ? 4 : AVATAR_COUNT;
    const aRows = Math.ceil(AVATAR_COUNT / aCols);
    // The form is tall, so its spacing shrinks below the normal UI scale on short screens (landscape phones,
    // tablets) until the whole modal fits; text keeps its size.
    // On narrow screens the colour labels sit above their swatches so the swatches stay big enough to tap.
    const maxColors = Math.max(...SWATCHES.map((r) => (r.colors || r.options).length));
    const labelW = 96 * this.ui;
    const inline = (pw - 48 - labelW) / maxColors >= 30 * this.ui;
    const height = (s) => {
      const extra = editing ? 22 * s + (this.state.confirmDelete ? 76 * s : 20 * s) : 0;
      const swatches = SWATCHES.length * (34 + (inline ? 0 : 18)) * s;
      return 68 * this.ui + 90 * s + 18 * s + aRows * (Math.min(44 * s, (pw - 48) / AVATAR_COUNT - 6) + 12) + 10 * s + 60 * s + 92 * s + 50 * s + 92 * s + 92 * s + 92 * s + 48 * s + extra + 26 * s;
    };
    let ui = this.ui;
    for (let k = 0; k < 6 && height(ui) > h - 24; k++) ui = Math.max(0.6, ui * (h - 24) / height(ui));
    const aSize = Math.min(44 * ui, (pw - 48) / AVATAR_COUNT - 6);
    const swatchRow = 34 * ui;
    const need = height(ui);
    const m = modal(this, { w: pw, h: need, title: editing ? 'Edit player' : 'New player', accent: THEME.primary, dim: false });
    const label = (str, y) => text(this, m.x + 24, y, str, T.caption(this)).setOrigin(0, 0.5);
    const look = resolveLook(d);
    let y = m.contentTop;

    // Name (DOM input so the on-screen keyboard works on Android) with a live preview of the badge beside it
    label('NAME', y); y += 22 * ui;
    const prev = 52 * ui, inW = m.w - 48 - prev - 12;
    textInput(this, m.x + 24 + inW / 2, y + 22 * ui, inW, 44 * ui, {
      value: d.name, placeholder: 'Type a name', maxLength: 14, autocapitalize: 'words', fontSize: 18,
      onInput: (v) => { d.name = v; }, onEnter: () => this.saveForm()
    });
    this.add.image(m.x + m.w - 24 - prev / 2, y + 22 * ui, badgeTexture(this, look)).setDisplaySize(prev, prev);
    y += 44 * ui + 24 * ui;

    // Preset picker: sets the face (skin) and the default colours; picking one clears any custom colours
    label('AVATAR', y); y += 18 * ui;
    const cells = grid({ x: m.x + 24, y, w: m.w - 48, h: aRows * (aSize + 12) }, aCols, aRows, 6);
    for (let i = 0; i < AVATAR_COUNT; i++) {
      const c = cells[i];
      const sel = i === d.avatar;
      this.add.circle(c.x, c.y, aSize / 2 + 5, sel ? THEME.gold : THEME.sunken);
      const img = this.add.image(c.x, c.y, 'avatar', i).setDisplaySize(aSize, aSize).setInteractive({ useHandCursor: true });
      img.on('pointerup', () => { Sfx.pop(); d.avatar = i; d.look = null; this.rebuild(); });
      if (!sel) img.setAlpha(0.8);
    }
    y += aRows * (aSize + 12) + 10 * ui;

    // The look (boy or girl, hair, clothes, colours) has a page of its own with a big preview.
    button(this, w / 2, y + 22 * ui, Math.min(m.w - 48, 300 * ui), 44 * ui, '🎨 Change the look', { variant: 'secondary', fontSize: 15, onClick: () => { Sfx.click(); this.state.page = 'look'; this.rebuild(); } });
    y += 60 * ui;

    // Grade picker
    label('GRADE', y); y += 20 * ui;
    const gcols = Math.ceil(GRADES.length / 2);
    const gcells = grid({ x: m.x + 24, y, w: m.w - 48, h: 44 * ui * 2 + 6 }, gcols, 2, 6);
    GRADES.forEach((g, i) => {
      const c = gcells[i];
      button(this, c.x, c.y, c.w, c.h, gradeLabel(g, true), {
        variant: 'secondary', selected: g === d.grade, fontSize: g < 0 ? 15 : 17, radius: THEME.radius.sm,
        onClick: () => { d.grade = g; this.rebuild(); }
      });
    });
    y += 44 * ui * 2 + 6 + 28 * ui;

    // Read aloud: tap the 🔊 button when wanted, or have every question and villager line read automatically
    label('READ ALOUD', y); y += 20 * ui;
    const rcells = grid({ x: m.x + 24, y, w: m.w - 48, h: 44 * ui }, 2, 1, 6);
    [['tap', 'Tap 🔊 to hear it'], ['auto', 'Read everything to me']].forEach(([v, lbl], i) => {
      const c = rcells[i];
      button(this, c.x, c.y, c.w, c.h, lbl, { variant: 'secondary', selected: d.readAloud === v, fontSize: 15, radius: THEME.radius.sm, onClick: () => { d.readAloud = v; this.rebuild(); } });
    });
    y += 44 * ui + 28 * ui;

    // Read answers: a 🔊 on every answer (and, with "Read everything", the answers read after the question)
    label('READ ANSWERS', y); y += 20 * ui;
    const acells = grid({ x: m.x + 24, y, w: m.w - 48, h: 44 * ui }, 2, 1, 6);
    [['on', '🔊 On every answer'], ['off', 'Off']].forEach(([v, lbl], i) => {
      const c = acells[i];
      button(this, c.x, c.y, c.w, c.h, lbl, { variant: 'secondary', selected: (d.readAnswers || 'on') === v, fontSize: 15, radius: THEME.radius.sm, onClick: () => { d.readAnswers = v; this.rebuild(); } });
    });
    y += 44 * ui + 28 * ui;

    // Timers: some children guess when a clock is running; turning it off keeps every game untimed
    label('TIMERS', y); y += 20 * ui;
    const tcells = grid({ x: m.x + 24, y, w: m.w - 48, h: 44 * ui }, 2, 1, 6);
    [['on', 'On'], ['off', 'Off  (no rush)']].forEach(([v, lbl], i) => {
      const c = tcells[i];
      button(this, c.x, c.y, c.w, c.h, lbl, { variant: 'secondary', selected: (d.timers || 'on') === v, fontSize: 15, radius: THEME.radius.sm, onClick: () => { d.timers = v; this.rebuild(); } });
    });
    y += 44 * ui + 28 * ui;

    // Actions
    const bw = Math.min(200 * ui, (m.w - 72) / 2), bh = 48 * ui;
    button(this, w / 2 - bw / 2 - 8, y + bh / 2, bw, bh, 'Cancel', { variant: 'ghost', onClick: () => { this.state.mode = 'list'; this.state.page = 'details'; this.buildCount = 0; this.rebuild(); } });
    button(this, w / 2 + bw / 2 + 8, y + bh / 2, bw, bh, 'Save', { variant: 'primary', onClick: () => this.saveForm() });

    if (editing) {
      y += bh + 22 * ui;
      if (!this.state.confirmDelete) {
        const del = text(this, w / 2, y, 'Delete this player', T.small(this, THEME.danger)).setInteractive({ useHandCursor: true });
        del.on('pointerup', () => { this.state.confirmDelete = true; this.rebuild(); });
      } else {
        text(this, w / 2, y, 'Delete all progress for ' + this.state.editing.name + '?', T.small(this, THEME.danger));
        button(this, w / 2, y + 36 * ui, bw, 40 * ui, 'Yes, delete', {
          variant: 'danger', fontSize: 15, onClick: () => { Store.deleteProfile(this.state.editing.id); this.state.mode = 'list'; this.rebuild(); }
        });
      }
    }
  }

  /** The look editor: the character large on the left (or top), rows of choices beside it. */
  buildLookPage() {
    const { w, h, ui } = this;
    const d = this.state.draft;
    const look = resolveLook(d);
    const pw = Math.min(w - 24, 620 * ui);
    const m = modal(this, { w: pw, h: h - 24, title: 'Change the look', accent: THEME.primary, dim: false });
    const label = (str, y) => text(this, m.x + 24, y, str, T.caption(this)).setOrigin(0, 0.5);
    // Preview: the standing sprite, big and crisp.
    const key = lookSpriteTexture(this, look);
    const wide = pw >= 520 * ui, pv = wide ? 150 * ui : 96 * ui;
    const px = wide ? m.x + 24 + pv / 2 : m.x + m.w / 2, py = m.contentTop + 6 * ui + pv / 2;
    this.add.circle(px, py, pv / 2, parseInt((look.bg || '#3d8bff').slice(1), 16), 1);
    const img = this.add.image(px, py + pv * 0.06, key, IDLE_FRAMES.down).setDisplaySize(pv * 0.95, pv * 0.95);
    img.texture.setFilter(1);   // nearest: keep the pixels crisp
    const left = wide ? m.x + 24 + pv + 20 : m.x + 24, rowW = wide ? m.w - 48 - pv - 20 : m.w - 48;
    let y = wide ? m.contentTop + 4 * ui : py + pv / 2 + 12 * ui;
    const rowsBottom = m.y + m.h - 60 * ui;
    // Compress the rows to what fits: the available height shared out over every row.
    const styleLines = STYLE_ROWS.reduce((n, r) => n + Math.ceil(r.options.length / r.perRow), 0);
    const units = STYLE_ROWS.length * 0.5 + styleLines + SWATCHES.length * 1.5;   // labels are half a unit, swatch rows one and a half
    const unit = Math.max(12, Math.min(30 * ui, (rowsBottom - y) / units));   // rows shrink to fit short screens
    for (const row of STYLE_ROWS) {
      text(this, left, y + unit * 0.25, row.title, T.caption(this)).setOrigin(0, 0.5); y += unit * 0.5;
      const lines = Math.ceil(row.options.length / row.perRow);
      const cells = grid({ x: left, y, w: rowW, h: lines * unit - 3 }, row.perRow, lines, 3);
      row.options.forEach((v, i) => {
        const c = cells[i];
        button(this, c.x, c.y, c.w, c.h, row.label(v), { variant: 'secondary', selected: look[row.key] === v, fontSize: Math.max(9, Math.min(13, c.h * 0.42)), radius: THEME.radius.xs, onClick: () => { Sfx.pop(); d.look = { ...(d.look || {}), [row.key]: v }; this.rebuild(); } });
      });
      y += lines * unit;
    }
    for (const { key: k, title, colors, material, options } of SWATCHES) {
      const values = colors || options;
      text(this, left, y + unit * 0.3, title, T.caption(this)).setOrigin(0, 0.5); y += unit * 0.5;
      const cy = y + unit * 0.5, step = rowW / values.length, size = Math.min(unit * 0.8, step - 4);
      values.forEach((v, i) => {
        const cx = left + step * i + step / 2, colour = colors ? v : swatch(material, v), sel = look[k] === v;
        if (sel) this.add.circle(cx, cy, size / 2 + 3, THEME.gold);
        const dot = this.add.circle(cx, cy, size / 2, parseInt(colour.slice(1), 16)).setStrokeStyle(2, THEME.line, 0.6).setInteractive({ useHandCursor: true });
        dot.on('pointerup', () => { Sfx.pop(); d.look = { ...(d.look || {}), [k]: v }; this.rebuild(); });
      });
      y += unit;
    }
    void label;
    button(this, w / 2, m.y + m.h - 32 * ui, Math.min(m.w - 48, 220 * ui), 44 * ui, 'Done ✓', { variant: 'primary', onClick: () => { Sfx.click(); this.state.page = 'details'; this.rebuild(); } });
  }

  saveForm() {
    const d = this.state.draft;
    const name = (d.name || '').trim() || 'Player';
    if (this.state.editing) {
      Store.setActiveProfile(this.state.editing.id);
      Store.updateProfile((p) => { p.name = name; p.avatar = d.avatar; p.look = sanitizeLook(d.look); p.grade = d.grade; p.readAloud = d.readAloud; p.readAloudChosen = true; p.readAnswers = d.readAnswers || 'on'; p.timers = d.timers; });
    } else {
      Store.createProfile({ name, avatar: d.avatar, look: sanitizeLook(d.look), grade: d.grade, readAloud: d.readAloud, readAnswers: d.readAnswers || 'on', timers: d.timers });
      Store.updateProfile((p) => { p.readAloudChosen = true; });
    }
    Sfx.correct();
    this.go(SCENES.ModeSelect);
  }
}
