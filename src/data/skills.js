// Human-readable names for the skill tags that generators attach to questions.
export const SKILL_LABELS = {
  add: 'adding', sub: 'subtracting', mult: 'times tables', div: 'dividing', decimal: 'decimals',
  integers: 'negative numbers', 'order-of-operations': 'order of operations', percent: 'percentages',
  equations: 'solving for x', squares: 'square numbers',
  fractions: 'fractions', equivalent: 'equivalent fractions', compare: 'comparing fractions', 'fraction-add': 'adding fractions', convert: 'fractions to decimals',
  'skip-count': 'skip counting', doubling: 'doubling', sequence: 'number patterns', geometric: 'multiplying patterns', rule: 'pattern rules',
  spelling: 'spelling', verb: 'verbs', article: 'a / an / the', pronoun: 'pronouns', homophone: 'homophones', tense: 'past and present tense',
  adjective: 'adjectives', adverb: 'adverbs', agreement: 'subject-verb agreement', vocab: 'vocabulary', punctuation: 'punctuation', plural: 'plurals',
  synonym: 'synonyms', antonym: 'opposites', definition: 'word meanings',
  sequence_code: 'step-by-step instructions', repeat: 'repeat loops', conditional: 'if blocks', loops: 'loops'
};
export const skillLabel = (id) => SKILL_LABELS[id] || String(id).replace(/[-_]/g, ' ');
