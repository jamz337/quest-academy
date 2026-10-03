// Grades run from Pre-K (-1) and Kindergarten (0) to Grade 8. Bands: E = early years (Pre-K and K, listen and
// tap: everything read aloud, pictures first, no typing, no timers), A = grades 1-3, B = 4-5, C = 6-8. Generators
// also receive the exact grade for finer ramps. A grade of 0 is a real grade (K), so never default it with `||`:
// use gradeOf.
export const PRE_K = -1, KINDER = 0;
export const BANDS = ['E', 'A', 'B', 'C'];
export const BAND_LABEL = { E: 'Pre-K & K', A: 'Grades 1-3', B: 'Grades 4-5', C: 'Grades 6-8' };

/** The grade as a number, or `fallback` when it is missing or not a number (0, Kindergarten, is kept). */
export function gradeOf(grade, fallback = 3) {
  if (grade === null || grade === undefined || grade === '') return fallback;
  const n = Number(grade);
  return Number.isFinite(n) ? n : fallback;
}

export function bandFor(grade) {
  const g = gradeOf(grade);
  if (g <= 0) return 'E';
  if (g <= 3) return 'A';
  if (g <= 5) return 'B';
  return 'C';
}

/** Pre-K and Kindergarten: listen and tap. */
export const isEarly = (grade) => gradeOf(grade) <= 0;

/** "Pre-K", "Kindergarten" (or "K" when short), "Grade 3" (or "3"). */
export function gradeLabel(grade, short = false) {
  const g = gradeOf(grade);
  if (g <= PRE_K) return 'Pre-K';
  if (g === KINDER) return short ? 'K' : 'Kindergarten';
  return short ? String(g) : `Grade ${g}`;
}

/** A band-keyed bank's entry for `band`, falling back to band A (for banks without early-years content yet). */
export const bankFor = (bank, band) => (bank && (bank[band] || bank.A)) || [];

/** Per-band tuning knobs used by several games. */
export const TUNING = {
  E: { questionTimeMs: Infinity, questions: 8, parTimeMs: 180000 },   // no clock for the youngest
  A: { questionTimeMs: 20000, questions: 10, parTimeMs: 90000 },
  B: { questionTimeMs: 15000, questions: 10, parTimeMs: 75000 },
  C: { questionTimeMs: 15000, questions: 10, parTimeMs: 75000 }
};

/**
 * Tuning for a launch payload: the band's knobs with timers tightened 12% per mastery level. A player who
 * turned timers off (payload.timers === false) gets no per-question limit at all.
 */
export function tuningFor(payload) {
  const t = TUNING[payload?.band] || TUNING.A;
  const f = (1 - 0.12 * Math.max(0, Math.min(3, payload?.mastery | 0))) * (1 - 0.08 * Math.max(0, Math.min(2, (payload?.level | 0) - 1)));
  const questionTimeMs = payload?.timers === false ? Infinity : Math.round(t.questionTimeMs * f);
  return { ...t, questionTimeMs, parTimeMs: Math.round(t.parTimeMs * f) };
}
