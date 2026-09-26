// Grade bands: A = grades 2-3, B = 4-5, C = 6-8. Generators also receive the exact grade for finer ramps.
export const BANDS = ['A', 'B', 'C'];
export const BAND_LABEL = { A: 'Grades 2-3', B: 'Grades 4-5', C: 'Grades 6-8' };

export function bandFor(grade) {
  const g = Number(grade) || 3;
  if (g <= 3) return 'A';
  if (g <= 5) return 'B';
  return 'C';
}

/** Per-band tuning knobs used by several games. */
export const TUNING = {
  A: { questionTimeMs: 20000, questions: 10, parTimeMs: 90000 },
  B: { questionTimeMs: 15000, questions: 10, parTimeMs: 75000 },
  C: { questionTimeMs: 15000, questions: 10, parTimeMs: 75000 }
};

/** Tuning for a launch payload: the band's knobs with timers tightened 12% per mastery level. */
export function tuningFor(payload) {
  const t = TUNING[payload?.band] || TUNING.A;
  const f = 1 - 0.12 * Math.max(0, Math.min(3, payload?.mastery | 0));
  return { ...t, questionTimeMs: Math.round(t.questionTimeMs * f), parTimeMs: Math.round(t.parTimeMs * f) };
}
