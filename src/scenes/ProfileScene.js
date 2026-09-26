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
import { resolveLook, sanitizeLook, HAIR_COLORS, CLOTHES_COLORS, BG_COLORS } from '../data/avatars.js';
import { badgeTexture } from '../systems/Textures.js';

// Colour rows in the editor; `key` matches the fields of a profile's look.
const SWATCHES = [
  { key: 'hair', title: 'HAIR', colors: HAIR_COLORS },
  { key: 'top', title: 'CLOTHES', colors: CLOTHES_COLORS },
  { key: 'bg', title: 'BACKGROUND', colors: BG_COLORS }
];

/** Pick, create, edit or delete local player profiles. */
export class ProfileScene extends BaseScene {
  constructor() { super(SCENES.Profile); this.fade = true; }

  init() {
    this.state = { mode: 'list', editing: null, draft: null, confirmDelete: false };
  }

  build() {
    background(this, { accent: THEME.primary, accent2: THEME.pink });
    if (this.state.mode === 'form') return this.buildForm();
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
    const meta = this.add.text(0, c.h * 0.32, `Grade ${p.grade}  ·  Lv ${levelFromXp(p.xp)}`, T.small(this, THEME.ink2)).setOrigin(0.5);
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
    this.state.draft = profile
      ? { name: profile.name, avatar: profile.avatar, look: sanitizeLook(profile.look), grade: profile.grade }
      : { name: '', avatar: Math.floor(Math.random() * AVATAR_COUNT), look: null, grade: 3 };
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
    const maxColors = Math.max(...SWATCHES.map((r) => r.colors.length));
    const labelW = 96 * this.ui;
    const inline = (pw - 48 - labelW) / maxColors >= 30 * this.ui;
    const height = (s) => {
      const extra = editing ? 22 * s + (this.state.confirmDelete ? 76 * s : 20 * s) : 0;
      const swatches = SWATCHES.length * (34 + (inline ? 0 : 18)) * s;
      return 68 * s + 90 * s + 18 * s + aRows * (Math.min(44 * s, (pw - 48) / AVATAR_COUNT - 6) + 12) + 10 * s + swatches + 12 * s + 92 * s + 48 * s + extra + 26 * s;
    };
    const ui = height(this.ui) > h - 24 ? Math.max(0.7, this.ui * (h - 24) / height(this.ui)) : this.ui;
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

    // Colour rows: hair, clothes and badge background
    SWATCHES.forEach(({ key, title, colors }) => {
      if (!inline) { label(title, y + 9 * ui); y += 18 * ui; }
      const cy = y + swatchRow / 2;
      if (inline) label(title, cy);
      const rowW = m.w - 48 - (inline ? labelW : 0);
      const size = Math.min(24 * ui, rowW / colors.length - 4);
      const step = rowW / colors.length;
      colors.forEach((c, i) => {
        const cx = m.x + 24 + (inline ? labelW : 0) + step * i + step / 2;
        const sel = look[key] === c;
        if (sel) this.add.circle(cx, cy, size / 2 + 4, THEME.gold);
        const dot = this.add.circle(cx, cy, size / 2, parseInt(c.slice(1), 16)).setStrokeStyle(2, THEME.line, 0.6).setInteractive({ useHandCursor: true });
        dot.on('pointerup', () => { Sfx.pop(); d.look = { ...(d.look || {}), [key]: c }; this.rebuild(); });
      });
      y += swatchRow;
    });
    y += 12 * ui;

    // Grade picker
    label('GRADE', y); y += 20 * ui;
    const gcells = grid({ x: m.x + 24, y, w: m.w - 48, h: 44 * ui }, GRADES.length, 1, 6);
    GRADES.forEach((g, i) => {
      const c = gcells[i];
      button(this, c.x, c.y, c.w, c.h, String(g), {
        variant: 'secondary', selected: g === d.grade, fontSize: 17, radius: THEME.radius.sm,
        onClick: () => { d.grade = g; this.rebuild(); }
      });
    });
    y += 44 * ui + 28 * ui;

    // Actions
    const bw = Math.min(200 * ui, (m.w - 72) / 2), bh = 48 * ui;
    button(this, w / 2 - bw / 2 - 8, y + bh / 2, bw, bh, 'Cancel', { variant: 'ghost', onClick: () => { this.state.mode = 'list'; this.buildCount = 0; this.rebuild(); } });
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

  saveForm() {
    const d = this.state.draft;
    const name = (d.name || '').trim() || 'Player';
    if (this.state.editing) {
      Store.setActiveProfile(this.state.editing.id);
      Store.updateProfile((p) => { p.name = name; p.avatar = d.avatar; p.look = sanitizeLook(d.look); p.grade = d.grade; });
    } else {
      Store.createProfile({ name, avatar: d.avatar, look: sanitizeLook(d.look), grade: d.grade });
    }
    Sfx.correct();
    this.go(SCENES.ModeSelect);
  }
}
