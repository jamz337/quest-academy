// Minimal Phaser stand-in so scene logic can be smoke-tested in node. Display objects are inert stubs.
import { vi } from 'vitest';

function stubObject(extra = {}) {
  const o = {
    active: true, x: 0, y: 0, angle: 0, scale: 1, alpha: 1, text: '', visible: true, handlers: {}, data: {},
    setOrigin() { return o; }, setText(t) { o.text = t; return o; }, setDisplaySize() { return o; }, setAngle(a) { o.angle = a; return o; },
    setTint() { return o; }, clearTint() { return o; }, play() { return o; }, stop() { return o; }, setFrame() { return o; },
    setScale(s) { if (s !== undefined) o.scale = s; return o; }, setAlpha(a) { if (a !== undefined) o.alpha = a; return o; }, setDepth() { return o; },
    setTexture() { return o; }, setSize() { return o; }, setPosition(x, y) { if (x !== undefined) o.x = x; if (y !== undefined) o.y = y; return o; },
    setVisible(v) { o.visible = v; return o; }, setScrollFactor() { return o; }, setRotation() { return o; }, setBlendMode() { return o; },
    setStrokeStyle() { return o; }, setFillStyle() { return o; }, setStyle() { return o; }, setColor() { return o; }, setPadding() { return o; },
    setWordWrapWidth() { return o; }, setFixedSize() { return o; }, setData(k, v) { o.data[k] = v; return o; }, getData(k) { return o.data[k]; },
    setInteractive() { return o; }, disableInteractive() { return o; }, removeInteractive() { return o; }, add() { return o; },
    destroy() { o.active = false; },
    on(ev, fn) { (o.handlers[ev] ||= []).push(fn); return o; }, once(ev, fn) { return o.on(ev, fn); }, off() { return o; },
    emit(ev, ...a) { (o.handlers[ev] || []).forEach((f) => f(...a)); },
    clear() { return o; }, fillStyle() { return o; }, fillRoundedRect() { return o; }, fillRect() { return o; }, lineStyle() { return o; },
    strokeRoundedRect() { return o; }, strokeRect() { return o; }, lineBetween() { return o; }, fillCircle() { return o; },
    strokeCircle() { return o; }, fillTriangle() { return o; }, fillGradientStyle() { return o; }, fillEllipse() { return o; }, strokeEllipse() { return o; },
    beginPath() { return o; }, moveTo() { return o; }, lineTo() { return o; }, closePath() { return o; }, fillPath() { return o; }, strokePath() { return o; },
    slice() { return o; }, arc() { return o; }, fillPoints() { return o; }, strokePoints() { return o; }, generateTexture() { return o; },
    width: 10, height: 10, ...extra
  };
  return o;
}

export function installPhaserMock() {
  vi.mock('phaser', () => {
    class Scene { constructor(key) { this.key = key; } }
    class Container {
      // Copy the inert stub onto the instance, but never shadow methods a subclass (Button, Card...) defines itself.
      constructor(scene, x, y) {
        const stub = stubObject({ x, y, scene, list: [] });
        for (const k of Object.keys(stub)) if (!(k in this)) this[k] = stub[k];
      }
    }
    return {
      default: {
        Scene, GameObjects: { Container },
        Display: { Color: { IntegerToColor: () => ({ red: 0, green: 0, blue: 0 }), GetColor: () => 0 } },
        Textures: { FilterMode: { NEAREST: 0, LINEAR: 1 } }
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
      image: () => mk(), sprite: (x, y) => mk({ x, y, kind: 'sprite' }), rectangle: () => mk(), circle: () => mk(), container: () => mk(),
      dom: () => mk({ node: { value: '', focus() {}, addEventListener() {} } }),
      existing: (o) => { objs.push(o); return o; }
    },
    children: { list: objs },
    tweens: {
      killAll() {}, killTweensOf() {}, getTweensOf() { return []; },
      add(cfg) {
        if (!syncTweens) return {};
        if (cfg.onStart) cfg.onStart();
        if (cfg.onUpdate) cfg.onUpdate();
        if (cfg.onComplete) cfg.onComplete();
        return {};
      },
      chain(cfg) { (cfg.tweens || []).forEach((t) => { if (t.onComplete) t.onComplete(); }); return {}; }
    },
    time: { delayedCall(ms, fn) { const t = { ms, fn, remove() {} }; timers.push(t); return t; } },
    cameras: { main: { shake() {}, flash() {}, fadeIn() {}, fadeOut(d, r, g, b, cb) { if (cb) cb(null, 1); }, on() {}, once() {}, setRoundPixels() {} } },
    events: { on() {}, once() {}, emit() {} },
    scene: { bringToTop() {}, pause() {}, launch() {}, start() {}, stop() {}, resume() {}, isActive() { return true; }, isPaused() { return false; }, get() { return null; }, key: 'X' },
    anims: { exists: () => true },
    textures: { exists: () => true, get: () => ({ setFilter() {} }) }
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
