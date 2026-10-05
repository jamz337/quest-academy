// The Cheapside market: everything coins can buy. Nothing here changes how the games play; it is looks for the
// character, paint and floors for the house, and Bajan collector cards that each teach one fact.
// kind: 'hat' | 'glasses' | 'back' (looks, drawn by ui/FlatCharacter.js from `style`), 'paint' | 'floor' (house
// decor), 'card' (a set and a fact), 'snack' (stackable treats used in duels, see data/world/duels.js). `icon` is
// shown in the shop; looks are also previewed on the character.

export const LOOK_KINDS = ['hat', 'glasses', 'back'];
/** Kinds bought many times over and kept as counts (profile.inventory.snacks) rather than owned once. */
export const STACKABLE_KINDS = ['snack'];

/** Treats for duels: `effect` is { heal } hearts, { timeMs } on the clock, or { logic } extra hints. */
const SNACKS = [
  { id: 'snack-mango-juice', kind: 'snack', name: 'Mango juice', price: 15, icon: '🥭', desc: 'Heals 1 heart in a duel.', effect: { heal: 1 }, drink: true },
  { id: 'snack-coconut', kind: 'snack', name: 'Coconut water', price: 30, icon: '🥥', desc: 'Heals 2 hearts in a duel.', effect: { heal: 2 }, drink: true },
  { id: 'snack-hourglass', kind: 'snack', name: 'Hourglass', price: 20, icon: '⏳', desc: '10 more seconds on the duel clock.', effect: { timeMs: 10000 } },
  { id: 'snack-fishcake', kind: 'snack', name: 'Fish cake', price: 25, icon: '🐟', desc: 'Mango gets one more Logic hint.', effect: { logic: 1 } },
  // New stock, October 2026.
  { id: 'snack-sorrel', kind: 'snack', name: 'Sorrel drink', price: 45, icon: '🧃', desc: 'Heals 3 hearts in a duel.', effect: { heal: 3 }, drink: true },
  { id: 'snack-lime', kind: 'snack', name: 'Lime squash', price: 28, icon: '🍋', desc: '15 more seconds on the duel clock.', effect: { timeMs: 15000 }, drink: true },
  { id: 'snack-sweetbread', kind: 'snack', name: 'Sweet bread', price: 45, icon: '🍞', desc: 'Mango gets two more Logic hints.', effect: { logic: 2 } }
];

const LOOKS = [
  { id: 'hat-cap', kind: 'hat', name: 'Blue cap', price: 60, icon: '🧢', desc: 'A sporty cap with a brim.', style: { shape: 'cap', colour: '#3d8bff' } },
  { id: 'hat-sun', kind: 'hat', name: 'Sun hat', price: 80, icon: '👒', desc: 'Wide and shady, for the beach.', style: { shape: 'sun', colour: '#ffc531' } },
  { id: 'hat-beanie', kind: 'hat', name: 'Pink beanie', price: 70, icon: '🧶', desc: 'Warm and woolly, with a pompom.', style: { shape: 'beanie', colour: '#ff6fae' } },
  { id: 'hat-party', kind: 'hat', name: 'Party hat', price: 50, icon: '🎉', desc: 'Every day is a party.', style: { shape: 'party', colour: '#8b5cf6' } },
  { id: 'hat-feathers', kind: 'hat', name: 'Kadooment feathers', price: 150, icon: '🪶', desc: 'A Crop Over headdress in bright feathers.', style: { shape: 'feathers', colour: '#ff5c6c' } },
  { id: 'hat-crown', kind: 'hat', name: 'Golden crown', price: 250, icon: '👑', desc: 'For a true hero of the Academy.', style: { shape: 'crown', colour: '#ffc531' } },
  { id: 'glasses-round', kind: 'glasses', name: 'Round glasses', price: 40, icon: '👓', desc: 'Very clever-looking.', style: { shape: 'round' } },
  { id: 'glasses-sun', kind: 'glasses', name: 'Sunglasses', price: 60, icon: '🕶️', desc: 'Cool in the Caribbean sun.', style: { shape: 'sun' } },
  { id: 'back-pack', kind: 'back', name: 'School backpack', price: 90, icon: '🎒', desc: 'Room for all your books.', style: { shape: 'backpack', colour: '#2ec46a' } },
  { id: 'back-cape', kind: 'back', name: 'Hero cape', price: 120, icon: '🦸', desc: 'It flutters when you run.', style: { shape: 'cape', colour: '#ff5c6c' } },
  { id: 'back-wings', kind: 'back', name: 'Fairy wings', price: 140, icon: '🧚', desc: 'Light as a flying fish.', style: { shape: 'wings', colour: '#9fdcff' } },
  // New stock, October 2026: the same shapes in fresh colours.
  { id: 'hat-cap-red', kind: 'hat', name: 'Red cap', price: 60, icon: '🧢', desc: 'A bright red cap for match day.', style: { shape: 'cap', colour: '#e8623f' } },
  { id: 'hat-beanie-green', kind: 'hat', name: 'Green beanie', price: 70, icon: '🧶', desc: 'Leafy green, with a pompom.', style: { shape: 'beanie', colour: '#249762' } },
  { id: 'hat-sun-pink', kind: 'hat', name: 'Pink sun hat', price: 80, icon: '👒', desc: 'Shade with a splash of pink.', style: { shape: 'sun', colour: '#ff8fb8' } },
  { id: 'back-pack-blue', kind: 'back', name: 'Blue backpack', price: 90, icon: '🎒', desc: 'Sea blue, with space for snacks.', style: { shape: 'backpack', colour: '#4c8df6' } },
  { id: 'back-cape-purple', kind: 'back', name: 'Royal cape', price: 130, icon: '🦸', desc: 'A purple cape fit for a champion.', style: { shape: 'cape', colour: '#8566ee' } },
  { id: 'back-wings-gold', kind: 'back', name: 'Golden wings', price: 160, icon: '🧚', desc: 'They shimmer like the morning sun.', style: { shape: 'wings', colour: '#ffd75e' } }
];

const HOUSE = [
  { id: 'paint-sky', kind: 'paint', name: 'Sky blue paint', price: 40, icon: '🎨', desc: 'Cool blue walls.', colour: 0xd9e9ff },
  { id: 'paint-mint', kind: 'paint', name: 'Mint paint', price: 40, icon: '🎨', desc: 'Fresh green walls.', colour: 0xdcf5e4 },
  { id: 'paint-peach', kind: 'paint', name: 'Peach paint', price: 40, icon: '🎨', desc: 'Warm sunset walls.', colour: 0xffe6d3 },
  { id: 'paint-lilac', kind: 'paint', name: 'Lilac paint', price: 40, icon: '🎨', desc: 'Soft purple walls.', colour: 0xeee6ff },
  { id: 'paint-rose', kind: 'paint', name: 'Rose paint', price: 40, icon: '🎨', desc: 'Pretty pink walls.', colour: 0xffe1ee },
  { id: 'floor-oak', kind: 'floor', name: 'Oak floorboards', price: 50, icon: '🪵', desc: 'Light wooden boards.', floor: 'oak' },
  { id: 'floor-walnut', kind: 'floor', name: 'Walnut floorboards', price: 50, icon: '🪵', desc: 'Dark wooden boards.', floor: 'walnut' },
  { id: 'floor-carpet', kind: 'floor', name: 'Soft carpet', price: 50, icon: '🧶', desc: 'Cosy underfoot.', floor: 'carpet' },
  { id: 'floor-tiles', kind: 'floor', name: 'Lilac tiles', price: 50, icon: '🟪', desc: 'Cool tiles for hot days.', floor: 'tiles' },
  { id: 'floor-checker', kind: 'floor', name: 'Checkerboard', price: 60, icon: '🏁', desc: 'Black and white squares.', floor: 'checker' },
  { id: 'floor-parquet', kind: 'floor', name: 'Parquet', price: 60, icon: '🪵', desc: 'Little wooden squares.', floor: 'parquet' },
  // New stock, October 2026.
  { id: 'paint-sun', kind: 'paint', name: 'Sunshine paint', price: 40, icon: '🎨', desc: 'Cheerful yellow walls.', colour: 0xfff3c4 },
  { id: 'paint-sea', kind: 'paint', name: 'Sea green paint', price: 40, icon: '🎨', desc: 'Walls the colour of the shallows.', colour: 0xd3f0ea },
  { id: 'paint-cloud', kind: 'paint', name: 'Cloud white paint', price: 40, icon: '🎨', desc: 'Clean, bright white walls.', colour: 0xf7f7fb },
  { id: 'floor-stone', kind: 'floor', name: 'Stone flags', price: 60, icon: '🪨', desc: 'Cool grey stone slabs.', floor: 'stone' }
];

/** Collector cards: three sets, each card one fact about Barbados. */
export const CARD_SETS = [
  { id: 'parishes', name: 'The Parishes', icon: '🗺️', price: 20, cards: [
    ['St. Michael', 'Home of Bridgetown, the capital, and the busiest port on the island.'],
    ['Christ Church', 'Where the airport is, and the Oistins fish fry every Friday night.'],
    ['St. James', 'Holetown, where the first English settlers landed in 1627, and the calm west coast.'],
    ['St. Peter', 'Speightstown was once such a busy port that it was called "Little Bristol".'],
    ['St. Lucy', 'The northern tip of the island, with the Animal Flower Cave by the sea.'],
    ['St. Andrew', 'The hilly Scotland District and Mount Hillaby, the highest point in Barbados.'],
    ['St. Joseph', 'Bathsheba and the Soup Bowl, where big Atlantic waves bring surfers.'],
    ['St. John', 'Codrington College on the cliffs, one of the oldest colleges in the Caribbean.'],
    ['St. Philip', 'The largest parish, in the south-east corner, with Sam Lord\'s Castle.'],
    ['St. George', 'Farmland in the middle of the island and the Gun Hill Signal Station.'],
    ['St. Thomas', 'Harrison\'s Cave, deep under the ground, and Welchman Hall Gully.']
  ] },
  { id: 'heroes', name: 'National Heroes', icon: '🏅', price: 25, cards: [
    ['Bussa', 'Led the 1816 rebellion for freedom. The Emancipation Statue remembers him.'],
    ['Sarah Ann Gill', 'Stood up for her Methodist church when it was dangerous to do so.'],
    ['Samuel Jackman Prescod', 'The first person of colour elected to the House of Assembly, in 1843.'],
    ['Charles Duncan O\'Neal', 'A doctor who started the Democratic League to help working people.'],
    ['Clement Payne', 'A trade unionist whose deportation in 1937 sparked calls for fairness.'],
    ['Sir Grantley Adams', 'The first Premier of Barbados. National Heroes Day is his birthday, 28 April.'],
    ['Sir Hugh Springer', 'A trade unionist and teacher who became Governor-General.'],
    ['Errol Barrow', 'Led Barbados to independence in 1966. The Father of Independence.'],
    ['Sir Frank Walcott', 'Led the Barbados Workers\' Union for many years.'],
    ['Sir Garfield Sobers', 'One of the greatest cricketers the world has ever seen.'],
    ['Rihanna', 'The singer named a National Hero on 30 November 2021, Republic Day.']
  ] },
  { id: 'symbols', name: 'National Symbols', icon: '🛡️', price: 20, cards: [
    ['The flag', 'Blue, gold, blue, with a broken trident: raised for the first time on 30 November 1966.'],
    ['The coat of arms', 'A bearded fig tree, a dolphin fish and a pelican, and the motto "Pride and Industry".'],
    ['Pride of Barbados', 'The national flower, with red, orange and yellow petals.'],
    ['The anthem', '"In Plenty and In Time of Need", sung at Independence and on National Heroes Day.'],
    ['Cou-cou and flying fish', 'The national dish: cornmeal and okra, with flying fish in gravy.'],
    ['The trident', 'Three points for government of the people, by the people and for the people.']
  ] }
];

const CARDS = CARD_SETS.flatMap((set) => set.cards.map(([name, fact], i) => ({
  id: `card-${set.id}-${i + 1}`, kind: 'card', set: set.id, name, price: set.price, icon: set.icon, desc: fact
})));

export const ITEMS = [...LOOKS, ...HOUSE, ...CARDS, ...SNACKS];
export const getItem = (id) => ITEMS.find((it) => it.id === id) || null;
export const itemsOfKind = (kind) => ITEMS.filter((it) => it.kind === kind);
export const cardsOfSet = (setId) => CARDS.filter((c) => c.set === setId);

/** Shop tabs: which kinds each shows. */
export const TABS = [
  { id: 'looks', title: 'Looks', icon: '🧢', kinds: ['hat', 'glasses', 'back'] },
  { id: 'house', title: 'House', icon: '🏠', kinds: ['paint', 'floor'] },
  { id: 'cards', title: 'Cards', icon: '🃏', kinds: ['card'] },
  { id: 'snacks', title: 'Snacks', icon: '🥭', kinds: ['snack'] }
];
