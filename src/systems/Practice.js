// Skill memory: what each player has seen, missed and got right, so games can revisit weak skills over
// the following days (spaced practice), introduce brand-new skills with a worked example, and show progress.

/** Skills a game asked about (and which were missed) folded into profile.skills. */
export function recordSkills(profile, { seen = [], missed = [] } = {}, now = Date.now()) {
  profile.skills ||= {};
  const missedSet = new Set(missed);
  for (const id of new Set([...seen, ...missed])) {
    const rec = profile.skills[id] || { seen: 0, missed: 0, correct: 0, sinceMiss: 0, lastMissedAt: null, lastAt: null };
    rec.seen += 1; rec.lastAt = now;
    if (missedSet.has(id)) { rec.missed += 1; rec.sinceMiss = 0; rec.lastMissedAt = now; }
    else { rec.correct += 1; rec.sinceMiss += 1; }
    profile.skills[id] = rec;
  }
}

/** A skill counts as weak from its first miss until it has been answered right in 3 later games. */
export const isWeak = (rec) => !!rec && rec.missed > 0 && rec.sinceMiss < 3;

/** Weak skills, most recently missed first. */
export function weakSkills(profile) {
  return Object.entries(profile?.skills || {}).filter(([, r]) => isWeak(r)).sort((a, b) => (b[1].lastMissedAt || 0) - (a[1].lastMissedAt || 0)).map(([id]) => id);
}

export const isNewSkill = (profile, skill) => !!skill && !(profile?.skills || {})[skill]?.introduced;

export function markIntroduced(profile, skill) {
  profile.skills ||= {};
  profile.skills[skill] = { ...(profile.skills[skill] || { seen: 0, missed: 0, correct: 0, sinceMiss: 0, lastMissedAt: null, lastAt: null }), introduced: true };
}

/**
 * Put up to n questions on weak skills at the front of a round list. `makeMore()` returns extra candidate
 * questions (same shape, with .skill); candidates on weak skills replace questions that are not.
 */
export function prioritiseWeak(questions, makeMore, weak, n = 3) {
  const weakSet = new Set(weak || []);
  if (!weakSet.size || !questions.length) return questions;
  const out = questions.slice();
  const already = out.filter((q) => weakSet.has(q.skill)).length;
  let need = Math.min(n, out.length) - already;
  if (need <= 0) return out;
  const prompts = new Set(out.map((q) => q.prompt ?? q.sentence ?? JSON.stringify(q)));
  const extra = (makeMore() || []).filter((q) => weakSet.has(q.skill) && !prompts.has(q.prompt ?? q.sentence ?? JSON.stringify(q)));
  for (let i = out.length - 1; i >= 0 && need > 0 && extra.length; i--) {
    if (weakSet.has(out[i].skill)) continue;
    out[i] = extra.shift(); need -= 1;
  }
  // Weak-skill questions come first so they are met while the child is fresh.
  return [...out.filter((q) => weakSet.has(q.skill)), ...out.filter((q) => !weakSet.has(q.skill))];
}

/** Progress per skill for the skills view: 0..5 dots from the recent hit rate, plus counts. */
export function skillProgress(profile) {
  return Object.entries(profile?.skills || {}).filter(([, r]) => r.correct + r.missed > 0).map(([id, r]) => {
    const total = r.correct + r.missed;
    const dots = Math.max(1, Math.round((r.correct / total) * 5));
    return { id, dots, weak: isWeak(r), seen: r.seen, missed: r.missed, correct: r.correct };
  }).sort((a, b) => Number(b.weak) - Number(a.weak) || a.id.localeCompare(b.id));
}
