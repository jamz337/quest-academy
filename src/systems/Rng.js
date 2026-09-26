// Small seeded RNG (mulberry32) so question sets and maps are reproducible in tests.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Rng {
  constructor(seed = Date.now() ^ Math.floor(Math.random() * 1e9)) {
    this.seed = seed;
    this.next = mulberry32(seed);
  }
  /** random float in [0,1) */
  float() { return this.next(); }
  /** random integer in [min, max] inclusive */
  int(min, max) { return Math.floor(this.next() * (max - min + 1)) + min; }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  chance(p) { return this.next() < p; }
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  /** pick n distinct items */
  sample(arr, n) { return this.shuffle(arr).slice(0, n); }
}
