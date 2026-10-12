// Hands-on lessons for the youngest maths, shown on the New Skill page instead of reading the working (ui/SkillIntro.js):
// counting (tap each one to count it), adding (tap 3 into the basket, tap 2 more, how many?) and taking away (tap 2
// to eat them, how many are left?). Built from the solved example, so the lesson does the same sum the child just saw.
// Pure: lessonFor(question, grade) -> { kind: 'count' | 'add' | 'sub', n | a, b, pic } or null.

const ADD_SKILLS = ['add-pictures', 'add'], SUB_SKILLS = ['take-away', 'sub'];
const MAX = 12;   // more than this is too many to tap

/** The first whole picture in a string ("🥭🥭🥭" -> "🥭"), keeping joined emoji in one piece. */
function firstPic(s) {
  try { return [...new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(s)][0].segment; } catch { return Array.from(s)[0]; }
}
/** The picture to count with: the question's own (a mango, a fish), else an apple. */
function picOf(q) {
  const pic = (q.pics || []).find((p) => /\p{Extended_Pictographic}/u.test(p) && !/[➕➖]/u.test(p));
  return pic ? firstPic(pic) : '🍎';
}

export function lessonFor(q, grade) {
  if (!q || (grade ?? 0) > 2) return null;
  const nums = (String(q.text || q.prompt || '').match(/\d+/g) || []).map(Number);
  const pic = picOf(q);
  if (q.skill === 'counting') {
    const n = Number(q.answer);
    return Number.isInteger(n) && n >= 1 && n <= MAX ? { kind: 'count', n, pic } : null;
  }
  const [a, b] = nums;
  if (ADD_SKILLS.includes(q.skill) && a >= 1 && b >= 1 && a + b <= MAX) return { kind: 'add', a, b, pic };
  if (SUB_SKILLS.includes(q.skill) && a >= 2 && b >= 1 && b < a && a <= MAX) return { kind: 'sub', a, b, pic };
  return null;
}
