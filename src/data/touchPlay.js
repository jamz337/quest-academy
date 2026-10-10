// Touch-and-learn sets, the Pre-K version of a game: six things to touch, each named and told about, then sent
// to its home panel; when all are home come a few gentle asks, answered by touching a thing in its panel.
// The helpers every subject's sets share (see scenes/minigames/TouchPlay.js). Pure functions.

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export const targetOf = (set, item) => set.targets.find((t) => t.id === item.target);
/** "the fish", but "Barbados": a proper name (`proper`) takes no article. */
export const named = (item) => (item.proper ? item.name : `the ${item.name}`);

/** The gentle asks after everything is home: `n` of them, half by home and half by name, never the same thing twice. */
export function makePlayAsks(set, rng, n = 3) {
  return rng.shuffle(set.items).slice(0, n).map((item, i) => (i % 2 === 0 ? { item, kind: 'target', line: targetOf(set, item).ask } : { item, kind: 'find', line: `Can you find ${named(item)}?` }));
}
export const playFoundLine = (set, item) => `Yes! ${cap(named(item))}. ${cap(targetOf(set, item).name)}!`;
export const playOtherLine = (set, item, ask) => `That is ${named(item)}. ${ask.line}`;
