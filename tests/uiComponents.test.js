// Smoke tests for the shared UI components against the Phaser mock: they must construct, keep the Button
// contract the coding-scene tests rely on (`.label`, pointerdown + pointerup), and never throw on the mock's stubs.
import { describe, it, expect, vi } from 'vitest';
import { installPhaserMock, fakeSystems, findButton, click, flushTimers } from './helpers/phaserMock.js';

installPhaserMock();
vi.mock('../src/systems/Audio.js', () => ({ Sfx: { click() {}, pop() {}, correct() {}, wrong() {} }, setMuted() {}, unlockAudio() {} }));

const { button, iconButton } = await import('../src/ui/Button.js');
const { panel, dimmer, background, stripe } = await import('../src/ui/Panel.js');
const { card, tile, plank } = await import('../src/ui/Card.js');
const { chip } = await import('../src/ui/Chip.js');
const { topBar } = await import('../src/ui/TopBar.js');
const { modal } = await import('../src/ui/Modal.js');
const { ProgressBar } = await import('../src/ui/ProgressBar.js');
const { StarRow } = await import('../src/ui/StarRow.js');
const { toast } = await import('../src/ui/Toast.js');
const { enter, shake, pulse } = await import('../src/ui/motion.js');
const { textInput } = await import('../src/ui/Input.js');
const { signpost, SIGN_BOARDS } = await import('../src/ui/Signpost.js');
const { BaseScene } = await import('../src/scenes/BaseScene.js');
const { THEME, textOn, mix, hex } = await import('../src/ui/theme.js');

const scene = () => fakeSystems({ animateEnter: true });

describe('theme helpers', () => {
  it('picks readable text colours and blends', () => {
    expect(textOn(0xffffff)).toBe(THEME.ink);
    expect(textOn(THEME.primary)).toBe(THEME.onAccent);
    expect(hex(mix(0x000000, 0xffffff, 0.5))).toBe('#808080');
  });
});

describe('Button', () => {
  it('constructs every variant and keeps the .label contract', () => {
    const s = scene();
    for (const variant of ['primary', 'secondary', 'ghost', 'danger', 'success', 'warning', 'brand', 'subject', 'soft']) {
      const b = button(s, 0, 0, 100, 40, variant, { variant, subject: 'math' });
      expect(b.label.text).toBe(variant);
    }
    expect(findButton(s, 'primary')).toBeTruthy();
  });
  it('fires onClick on press + release, not when disabled', () => {
    const s = scene();
    let n = 0;
    const b = button(s, 0, 0, 100, 40, 'Go', { onClick: () => n++ });
    click(b); expect(n).toBe(1);
    b.setEnabled(false); click(b); expect(n).toBe(1);
    b.setEnabled(true); click(b); expect(n).toBe(2);
  });
  it('supports custom colours, selection, labels, emoji and sub text', () => {
    const s = scene();
    const b = button(s, 0, 0, 200, 80, 'Explore', { color: 0x123456, emoji: 'x', sub: 'sub' });
    b.setLabel('Hi').setColor(0xabcdef).setSelected(true).setSub('s2');
    expect(b.label.text).toBe('Hi'); expect(b.sub.text).toBe('s2'); expect(b.selected).toBe(true);
  });
  it('iconButton is a real Button that tests can find', () => {
    const s = scene();
    let back = 0;
    iconButton(s, 0, 0, 44, '←', { onClick: () => back++ });
    click(findButton(s, '←'));
    expect(back).toBe(1);
  });
});

describe('surfaces', () => {
  it('panel, dimmer, background, stripe and modal construct', () => {
    const s = scene();
    panel(s, 0, 0, 100, 50, { stroke: THEME.line });
    panel(s, 0, 0, 100, 50, { alpha: 0.5, shadow: 'lg' });
    dimmer(s); background(s); background(s, { accent: THEME.brand, dots: false }); stripe(s, 0, 0, 40, THEME.gold);
    const m = modal(s, { w: 300, h: 200, title: 'Hi', accent: THEME.primary });
    expect(m.title.text).toBe('Hi');
    expect(m.contentTop).toBeGreaterThan(m.y);
    modal(s, { w: 300, h: 200, y: 40, dim: false, depth: 600 });
  });
  it('card never exposes .label and taps when asked', () => {
    const s = scene();
    let taps = 0;
    const k = card(s, 0, 0, 100, 60, { onTap: () => taps++ });
    expect(k.label).toBeUndefined();
    click(k); expect(taps).toBe(1);
    k.setLook({ color: THEME.successSoft, stroke: THEME.success });
    const t = tile(s, 0, 0, 40, 'A', { onTap: () => taps++ });
    expect(t.label).toBeUndefined(); expect(t.text.text).toBe('A');
    t.setText('B'); expect(t.text.text).toBe('B');
    tile(s, 0, 0, 40, '', { empty: true });
    plank(s, 0, 0, 80, 40, '12', { color: THEME.gold });
  });
  it('chip lays out and re-lays out on setText', () => {
    const s = scene();
    const c = chip(s, 0, 0, { text: '3 / 10', icon: 'coin', originX: 1 });
    expect(c.w).toBeGreaterThan(0);
    c.setText('4 / 10'); expect(c.text.text).toBe('4 / 10');
  });
  it('topBar wires the back button', () => {
    const s = scene();
    let back = 0;
    const bar = topBar(s, { title: 'T', onBack: () => back++, subtitle: 'sub', right: (x, y) => chip(s, x, y, { text: 'r' }) });
    click(findButton(s, '←'));
    expect(back).toBe(1); expect(bar.bottom).toBeGreaterThan(bar.h);
  });
});

describe('widgets', () => {
  it('ProgressBar sets and animates', () => {
    const s = scene();
    const p = new ProgressBar(s, 0, 0, 100, 10, { value: 0.2 });
    p.set(0.5, THEME.danger); expect(p.ratio).toBe(0.5);
    p.animateTo(1.5); expect(p.ratio).toBeLessThanOrEqual(1);
  });
  it('StarRow reveals through timers', () => {
    const s = scene();
    const r = new StarRow(s, 0, 0, 0, 30);
    r.reveal(3, s); flushTimers(s);
    r.set(2);
  });
  it('toast, motion helpers and text input construct', () => {
    const s = scene();
    toast(s, 'hi'); toast(s, 'hi', { icon: 'star', accent: THEME.brand }); toast(s, 'hi', { bg: THEME.danger });
    const o = s.add.text(0, 10, 'x');
    enter(s, [o, null], { from: 'up' }); enter(s, o, { from: 'pop' }); enter(s, o, { from: 'fade' });
    s.animateEnter = false; enter(s, o);
    shake(s, o); pulse(s, o);
    const d = textInput(s, 0, 0, 100, 40, { value: 'v', onInput() {}, onEnter() {} });
    expect(d.input.value).toBe('v');
  });
});

describe('signpost', () => {
  it('draws one labelled board per land with no button label', () => {
    const scene = fakeSystems();
    const s = signpost(scene, 100, 200);
    expect(s.labels.map((t) => t.text)).toEqual(SIGN_BOARDS.map((b) => b.label));
    expect(s.label).toBeUndefined();
    expect(s.height).toBeGreaterThan(40);
  });
});

describe('BaseScene', () => {
  class S extends BaseScene { constructor() { super('S'); this.fade = true; this.built = 0; } build() { this.built++; } }
  it('animates on first build only, and go() starts the next scene synchronously under the mock', () => {
    const sc = fakeSystems(new S());
    const started = [];
    sc.scene.start = (k, d) => started.push([k, d]);
    sc.create({});
    expect(sc.animateEnter).toBe(true);
    sc.rebuild();
    expect(sc.animateEnter).toBe(false);
    sc.go('Next', { a: 1 }); sc.go('Again');
    expect(started).toEqual([['Next', { a: 1 }]]);
  });
});
