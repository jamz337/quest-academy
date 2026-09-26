// Why an answer is what it is, in one or two child-sized sentences. Generators keep their prompts; this
// module reads them back (arithmetic prompts are regular) or falls back to a per-skill explanation.
import { skillLabel } from './skills.js';

const n = (s) => Number(String(s).replace(/[()]/g, ''));
const fmt = (v) => (Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100));

/** Arithmetic: parse the prompt ("12 × 3", "x + 4 = 9\nx = ?", "25% of 80" …) and show the working. */
export function mathExplanation(prompt, answer) {
  const p = String(prompt || '').replace(/\s+/g, ' ').trim();
  const a = String(answer);
  let m;
  const N = '(\\(?-?[\\d.]+\\)?)';   // an operand: 12, 3.5, -4 or (-4)
  const re = (s) => new RegExp('^' + s.replace(/N/g, N) + '$');
  if ((m = p.match(re('N \\+ N × N')))) {
    const [x, y, z] = [n(m[1]), n(m[2]), n(m[3])];
    return `Multiply before you add: ${y} × ${z} = ${y * z}, then ${x} + ${y * z} = ${a}.`;
  }
  if ((m = p.match(re('N \\+ N')))) {
    const [x, y] = [n(m[1]), n(m[2])];
    if (x < 0 || y < 0) return `Adding a negative number is like taking away: ${fmt(x)} + ${fmt(y)} = ${a}.`;
    if (!Number.isInteger(x) || !Number.isInteger(y)) return `Line up the decimal points, then add: ${fmt(x)} + ${fmt(y)} = ${a}.`;
    if (x + y <= 20) return `Start at ${x} and count on ${y}: ${x} + ${y} = ${a}.`;
    return `Add the tens, then the ones: ${x} + ${y} = ${a}.`;
  }
  if ((m = p.match(re('N − N')))) {
    const [x, y] = [n(m[1]), n(m[2])];
    if (x < 0 || y < 0) return `Taking away a negative is the same as adding: ${fmt(x)} − ${fmt(y)} = ${a}.`;
    if (!Number.isInteger(x) || !Number.isInteger(y)) return `Line up the decimal points, then subtract: ${fmt(x)} − ${fmt(y)} = ${a}.`;
    return `Take ${y} away from ${x}: ${x} − ${y} = ${a}. Check: ${a} + ${y} = ${x}.`;
  }
  if ((m = p.match(re('N × N')))) {
    const [x, y] = [n(m[1]), n(m[2])];
    if (x < 0 || y < 0) return `Two signs the same make a positive, different signs make a negative: ${fmt(x)} × ${fmt(y)} = ${a}.`;
    const groups = Math.min(Math.abs(y), 6);
    const list = Array.from({ length: groups }, (_, i) => x * (i + 1)).join(', ');
    return `${x} × ${y} means ${y} groups of ${x}: ${list}${Math.abs(y) > 6 ? '…' : ''} = ${a}.`;
  }
  if ((m = p.match(/^(\d+) ÷ (\d+)$/))) {
    const [x, y] = [n(m[1]), n(m[2])];
    return `Ask "how many ${y}s make ${x}?" ${y} × ${a} = ${x}, so ${x} ÷ ${y} = ${a}.`;
  }
  if ((m = p.match(/^(\d+)% of (\d+)$/))) {
    const [pc, base] = [n(m[1]), n(m[2])];
    return `10% of ${base} is ${fmt(base / 10)}, so ${pc}% is ${pc / 10} of those: ${a}.`;
  }
  if ((m = p.match(/^x \+ (\d+) = (\d+) x = \?$/))) return `Undo the + ${m[1]}: x = ${m[2]} − ${m[1]} = ${a}.`;
  if ((m = p.match(/^(\d+)x = (\d+) x = \?$/))) return `Undo the × ${m[1]}: x = ${m[2]} ÷ ${m[1]} = ${a}.`;
  if ((m = p.match(/^(\d+)²$/))) return `${m[1]}² means ${m[1]} × ${m[1]} = ${a}.`;
  return null;
}

/** Number patterns: from the round's terms, step and rule. */
export function patternExplanation(r) {
  if (!r || !r.terms) return null;
  const shown = r.terms.join(', ');
  if (r.rule) return `${r.rule.replace('Find term 5', '')} Put n = ${r.missingIndex + 1} into the rule and you get ${r.answer}. Sequence: ${shown}.`;
  const step = r.terms[1] - r.terms[0];
  if (r.skill === 'doubling') return `Each number is double the one before: ${shown}. So the missing one is ${r.answer}.`;
  if (r.skill === 'geometric') return `Each number is multiplied by ${r.terms[1] / r.terms[0]}: ${shown}. The missing one is ${r.answer}.`;
  if (r.skill === 'squares') return `These are square numbers (1×1, 2×2, 3×3…): ${shown}. The missing one is ${r.answer}.`;
  if (r.skill === 'sequence' && r.terms.length > 2 && r.terms[2] - r.terms[1] !== step) return `The pattern goes up and down by turns: ${shown}. The missing one is ${r.answer}.`;
  return `Each number goes ${step >= 0 ? 'up' : 'down'} by ${Math.abs(step)}: ${shown}. The missing one is ${r.answer}.`;
}

// Per-skill explanations for banks that have no working to show. {a} is the correct answer.
const BY_SKILL = {
  verb: 'The verb has to match who is doing it: one person or thing takes -s (she runs), more than one does not (they run). Here it is "{a}".',
  article: 'Use "an" before a vowel sound (an apple) and "a" before a consonant sound (a bike). Here it is "{a}".',
  pronoun: 'A pronoun stands in for a name. Use I/he/she/they for the doer and me/him/her/them for who it happens to. Here it is "{a}".',
  homophone: 'These words sound the same but mean different things, so think about the meaning. Here it is "{a}".',
  tense: 'Past tense tells what already happened (walked); present tells what happens now (walks). Here it is "{a}".',
  adjective: 'An adjective describes a noun (a red hat). Here it is "{a}".',
  adverb: 'An adverb tells how something is done and often ends in -ly (walked slowly). Here it is "{a}".',
  agreement: 'The subject and verb must agree: singular with singular, plural with plural. Here it is "{a}".',
  vocab: 'Read the whole sentence and pick the word that makes the meaning work. Here it is "{a}".',
  punctuation: 'Questions end with ?, strong feelings with !, and most sentences with a full stop. Here it is "{a}".',
  plural: 'Most plurals add -s or -es; some change (child → children). Here it is "{a}".',
  spelling: 'Say the word slowly and listen for each sound. It is spelt "{a}".',
  synonym: 'Synonyms mean the same thing. The pair here is "{a}".',
  antonym: 'Antonyms are opposites. The pair here is "{a}".',
  definition: 'Match the word to its meaning. Here it is "{a}".',
  fractions: 'The bottom number says how many equal slices; the top says how many to take. The answer is {a}.',
  equivalent: 'Multiply or divide the top and bottom by the same number and the fraction stays equal. The answer is {a}.',
  compare: 'With the same bottom number, the bigger top wins; otherwise make the bottoms the same first. The answer is {a}.',
  'fraction-add': 'Make the bottom numbers the same, then add the tops. The answer is {a}.',
  convert: 'Divide the top by the bottom to get a decimal (×100 for a percent). The answer is {a}.',
  sequence_code: 'Read the program one block at a time and act it out. The answer is {a}.',
  repeat: 'A Repeat block runs everything inside it that many times, so count the moves inside and multiply. The answer is {a}.',
  conditional: 'An If block only runs its inside when the condition is true. The answer is {a}.',
  people: 'Remember who did what. The answer is {a}.',
  stories: 'Think back to the story. The answer is {a}.',
  places: 'Picture where the story happens. The answer is {a}.',
  books: 'Remember the order and names of the books. The answer is {a}.',
  verses: 'Say the verse aloud a few times and the missing word will stick. The word is "{a}".'
};

/** Explanation for any question: { prompt, answer, skill, terms?, ref? }. Never empty. */
export function explainQuestion(q, subject = null) {
  if (!q) return '';
  if (q.explain) return q.explain;
  if (q.terms) return patternExplanation(q) || '';
  const math = (subject === 'math' || /[+−×÷²%]|x = \?/.test(q.prompt || '')) ? mathExplanation(q.prompt, q.answer) : null;
  if (math) return math;
  const base = BY_SKILL[q.skill];
  let out = base ? base.replace('{a}', String(q.answer)) : `The answer is ${q.answer}.`;
  if (q.ref) out += ` You can read it in ${q.ref}.`;
  return out;
}

/** What a parent can do at home about a weak skill. */
export const SKILL_TIPS = {
  add: 'Add up the shopping or the dice at board games.', sub: 'Ask "how many more?" when sharing snacks.', mult: 'Skip-count out loud in the car: 3, 6, 9, 12…',
  div: 'Share sweets equally between family members and count the groups.', decimal: 'Read prices and add two items together.', integers: 'Talk about temperatures below zero.',
  'order-of-operations': 'Say the rule together: multiply before you add.', percent: 'Find 10% of the bill first, then work up.', equations: 'Play "I am thinking of a number".',
  squares: 'Build squares with blocks: 2×2, 3×3, 4×4.', fractions: 'Cut a pizza or a sandwich and name the parts.', equivalent: 'Show that half a pizza is the same as two quarters.',
  compare: 'Ask which is more: a third or a quarter of a cake?', 'fraction-add': 'Add slices of the same pizza together.', convert: 'Turn coins into decimals of a dollar or pound.',
  'skip-count': 'Count in twos, fives and tens while climbing stairs.', doubling: 'Double the numbers on a car’s number plate.', sequence: 'Spot patterns in house numbers.',
  geometric: 'Fold paper in half again and again and count the layers.', rule: 'Make a number machine: "put a number in, I add 3".',
  spelling: 'Play hangman or a word game at bedtime.', verb: 'Catch each other saying "he run" instead of "he runs".', article: 'Point at things: "an apple, a banana".',
  pronoun: 'Retell a story swapping names for he, she and they.', homophone: 'Hunt for their/there/they’re in a book.', tense: 'Tell what you did today, then what you will do tomorrow.',
  adjective: 'Describe a pet with five words.', adverb: 'Act out walking quickly, slowly, quietly.', agreement: 'Read sentences aloud and listen for what sounds right.',
  vocab: 'Read together and talk about new words.', punctuation: 'Read aloud with big pauses at full stops and rising voices at questions.', plural: 'Count things: one child, two children.',
  synonym: 'Play "say it another way".', antonym: 'Play the opposites game: hot… cold!', definition: 'Guess a word from its meaning.',
  sequence_code: 'Give each other step-by-step directions to the kitchen.', repeat: 'Say "clap three times" and count the claps.', conditional: 'Play "if it is raining, take an umbrella".',
  people: 'Tell a Bible story at bedtime and ask who was in it.', stories: 'Read one story a night and retell it in the morning.', places: 'Find the places on a Bible map.',
  books: 'Sing a books-of-the-Bible song.', verses: 'Put the verse on the fridge and say it at breakfast.'
};

export const skillTip = (id) => SKILL_TIPS[id] || `Practise ${skillLabel(id)} together for a few minutes.`;
