import { describe, it, expect } from 'vitest';
import { FRAME, WORLD_SCALE, drawMonkey } from '../src/ui/FlatCharacter.js';

function fakeCtx() {
  const calls = [];
  const rec = (name) => (...args) => { calls.push([name, ...args]); };
  return {
    calls, fillStyle: null, strokeStyle: null, lineWidth: 1, lineCap: 'butt',
    save: rec('save'), restore: rec('restore'), translate: rec('translate'), scale: rec('scale'),
    beginPath: rec('beginPath'), closePath: rec('closePath'), moveTo: rec('moveTo'), lineTo: rec('lineTo'),
    arc: rec('arc'), arcTo: rec('arcTo'), ellipse: rec('ellipse'), quadraticCurveTo: rec('quadraticCurveTo'), roundRect: rec('roundRect'),
    fill: rec('fill'), stroke: rec('stroke'), fillRect: rec('fillRect'), clip: rec('clip')
  };
}

describe('Mango, drawn flat', () => {
  it('draws both frames one tile tall in the world, with the arc fallback for old browsers', () => {
    expect(WORLD_SCALE * FRAME).toBe(32);
    for (const step of [0, 1]) { const m = fakeCtx(); drawMonkey(m, 0, 0, { step }); expect(m.calls.filter((c) => c[0] === 'fill').length).toBeGreaterThan(10); expect(m.calls.filter((c) => c[0] === 'save').length).toBe(m.calls.filter((c) => c[0] === 'restore').length); }
    const old = fakeCtx(); delete old.roundRect; drawMonkey(old, 0, 0, { step: 1 });
    expect(old.calls.some((c) => c[0] === 'arcTo')).toBe(true);
  });
});
