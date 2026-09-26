// Minimal Phaser stand-in so scene logic can be smoke-tested in node. Display objects are inert stubs.
import { vi } from 'vitest';

function stubObject(extra = {}) {
  const o = {
    active: true, x: 0, y: 0, angle: 0, scale: 1, alpha: 1, text: '', handlers: {},
    setOrigin() { return o; }, setText(t) { o.text = t; return o; }, setDisplaySize() { return o; }, setAngle(a) { o.angle = a; return o; },
    setTint() { return o; }, clearTint() { return o; }, play() { return o; }, stop() { return o; }, setFrame() { return o; },
    setScale() { return o; }, setAlpha() { return o; }, setDepth() { return o; }, setTexture() { return o; }, setSize() { return o; },
    setInteractive() { return o; }, add() { return o; }, destroy() { o.active = false; },
    on(ev, fn) { (o.handlers[ev] ||= []).push(fn); return o; }, once(ev, fn) { return o.on(ev, fn); },
    emit(ev, ...a) { (o.handlers[ev] || []).forEach((f) => f(...a)); },
    clear() { return o; }, fillStyle() { return o; }, fillRoundedRect() { return o; }, fillRect() { return o; }, lineStyle() { return o; },
    strokeRoundedRect() { return o; }, strokeRect() { return o; }, lineBetween() { return o; }, fillCircle() { return o; },
    strokeCircle() { return o; }, fillTriangle() { return o; }, fillGradientStyle() { return o; }, fillEllipse() { return o; },
    beginPath() { return o; }, moveTo() { return o; }, lineTo() { return o; }, closePath() { return o; }, fillPath() { return o; }, strokePath() { return o; },
    width: 10, height: 10, ...extra
  };
  return o;
}

export function installPhaserMock() {
  vi.mock('phaser', () => {
    class Scene { constructor(key) { this.key = key; } }
    class Container {
      constructor(scene, x, y) { Object.assign(this, stubObject({ x, y, scene, list: [] })); }
    }
    return {
      default: {
        Scene, GameObjects: { Container },
        Display: { Color: { IntegerToColor: () => ({ red: 0, green: 0, blue: 0 }), GetColor: () => 0 } }
      }
    };
  });
}

/** Attach fake Phaser systems to a scene instance (or return a bare fake scene for helpers). */
export function fakeSystems(target = {}, { width = 400, height = 700, syncTweens = true } = {}) {
  const objs = [];
  const mk = (extra) => { const o = stubObject(extra); objs.push(o); return o; };
  const timers = [];
  Object.assign(target, {
    objs, timers,
    scale: { width, height, on() {}, off() {} },
    add: {
      graphics: () => mk(), text: (x, y, str) => mk({ x, y, text: str }), zone: (x, y, w, h) => mk({ x, y, w, h, kind: 'zone' }),
      image: () => mk(), sprite: (x, y) => mk({ x, y, kind: 'sprite' }), rectangle: () => mk(), container: () => mk(),
      existing: (o) => { objs.push(o); return o; }
    },
    children: { list: objs },
    tweens: {
      killAll() {},
      add(cfg) { if (syncTweens && cfg.onComplete) cfg.onComplete(); return {}; }
    },
    time: { delayedCall(ms, fn) { const t = { ms, fn, remove() {} }; timers.push(t); return t; } },
    cameras: { main: { shake() {} } },
    events: { on() {}, once() {}, emit() {} },
    scene: { bringToTop() {}, pause() {}, launch() {}, start() {}, key: 'X' },
    anims: { exists: () => true }
  });
  return target;
}

/** Run every pending delayedCall (in order) and clear them. */
export function flushTimers(scene) {
  const t = scene.timers.splice(0);
  t.forEach((x) => x.fn());
}

/** Find a Button by its label text among the created objects. */
export function findButton(scene, label) {
  return scene.objs.find((o) => o.label && o.label.text === label && o.active);
}

export function click(btn) { btn.emit('pointerdown'); btn.emit('pointerup'); }
