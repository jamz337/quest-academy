// Short Barbados facts read out by the furniture: the television, the fridge and the bookshelves.
export const TV_FACTS = [
  'Barbados is the most easterly island in the Caribbean.',
  'Bajans sometimes call the island "Bim".',
  'Two Barbados dollars are always worth one US dollar.',
  'About 280,000 people live in Barbados.',
  'Bridgetown and its Garrison are a UNESCO World Heritage Site.',
  'Kensington Oval in Bridgetown hosted the final of the 2007 Cricket World Cup.',
  'Barbados has no big rivers: most of its water comes from under the ground.',
  'Green monkeys came to Barbados from West Africa hundreds of years ago.',
  'A tram carries visitors through Harrison\'s Cave, deep under St. Thomas.',
  'Flying fish leap out of the sea and glide above the waves on their wing-like fins.'
];

export const FRIDGE_FACTS = [
  'Bajan pepper sauce is made with Scotch bonnet peppers and mustard.',
  'Pudding and souse is a Saturday tradition: pickled pork with sweet potato pudding.',
  'Mauby is a drink made from the bark of the mauby tree.',
  'A cutter is a sandwich in salt bread, often with a fish cake inside.',
  'Sorrel is a red, spicy drink that Bajans make at Christmas.',
  'Golden apples, guavas and soursops all grow on the island.',
  'Flying fish are caught mostly between December and June.',
  'Macaroni pie is on almost every Sunday lunch table.'
];

export const BOOK_FACTS = [
  'Barbados got its name from Portuguese sailors who saw its bearded fig trees.',
  'English settlers landed at Holetown in 1627.',
  'Sugar cane was the island\'s biggest crop for more than three hundred years.',
  'Slavery ended in the British colonies in 1834, with full freedom in 1838.',
  'The Barbados Parliament first met in 1639. It is one of the oldest in the world.',
  'Barbados became independent on 30 November 1966 and a republic on 30 November 2021.',
  'The Emancipation Statue at Haggatt Hall is known to everyone as Bussa.',
  'Errol Barrow was the first Prime Minister of Barbados.'
];

/** A fact from a pool, avoiding the one shown last time when there is a choice. */
export function pickFact(pool, rnd, last = null) {
  if (!pool.length) return '';
  let f = pool[Math.floor(rnd() * pool.length)];
  if (pool.length > 1 && f === last) f = pool[(pool.indexOf(f) + 1) % pool.length];
  return f;
}
