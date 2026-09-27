// Bajan dishes cooked on the kitchen stove: each is three ingredients added in order. The stove asks for the
// next one among distractors, so the child learns what goes into the food they eat.
export const RECIPES = [
  { id: 'coucou', name: 'Cou-cou and flying fish', pic: '🐟', steps: [['cornmeal', '🌽'], ['okra', '🥒'], ['flying fish', '🐟']], about: 'The national dish: cornmeal and okra stirred into soft cou-cou, served with flying fish in gravy.' },
  { id: 'fishcakes', name: 'Fish cakes', pic: '🍤', steps: [['salted cod', '🐟'], ['flour', '🌾'], ['herbs and pepper', '🌿']], about: 'Crispy fried balls of salt fish and herbs, sold at every fish fry.' },
  { id: 'conkies', name: 'Conkies', pic: '🍠', steps: [['cornmeal', '🌽'], ['pumpkin', '🎃'], ['coconut', '🥥']], about: 'Steamed in banana leaves, a treat around Independence time in November.' },
  { id: 'macaroni', name: 'Macaroni pie', pic: '🧀', steps: [['macaroni', '🍝'], ['cheese', '🧀'], ['egg and milk', '🥚']], about: 'Baked cheesy pasta that goes with almost every Sunday lunch.' },
  { id: 'sweetbread', name: 'Bajan sweet bread', pic: '🍞', steps: [['grated coconut', '🥥'], ['flour', '🌾'], ['sugar and spice', '🍬']], about: 'A rich coconut bread baked in a loaf and cut in thick slices.' }
];

/** Things that never go in the pot. */
export const DISTRACTORS = [['ice cream', '🍦'], ['chocolate', '🍫'], ['pizza', '🍕'], ['banana', '🍌'], ['candy', '🍭'], ['soap', '🧼'], ['broccoli', '🥦'], ['lemon', '🍋'], ['popcorn', '🍿'], ['doughnut', '🍩']];

export const COOK_COINS = 3;   // per dish, once a day
export const getRecipe = (id) => RECIPES.find((r) => r.id === id) || null;

/** The choices for one step: the right ingredient and two distractors, in a shuffled order. rnd: () => [0,1). */
export function stepChoices(recipe, step, rnd) {
  const right = recipe.steps[step];
  const pool = DISTRACTORS.filter((d) => !recipe.steps.some((s) => s[0] === d[0]));
  const picks = [];
  while (picks.length < 2 && pool.length) picks.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  const out = [right, ...picks];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out.map(([name, pic]) => ({ name, pic, right: name === right[0] }));
}
