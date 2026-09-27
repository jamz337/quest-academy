// The Cheapside market: everything coins can buy. Nothing here changes how the games play; it is looks for the
// character, paint and floors for the house, and Bajan collector cards that each teach one fact.
// kind: 'hat' | 'glasses' | 'back' (looks, drawn by ui/FlatCharacter.js from `style`), 'paint' | 'floor' (house
// decor), 'card' (a set and a fact). `icon` is shown in the shop; looks are also previewed on the character.

export const LOOK_KINDS = ['hat', 'glasses', 'back'];

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
  { id: 'back-wings', kind: 'back', name: 'Fairy wings', price: 140, icon: '🧚', desc: 'Light as a flying fish.', style: { shape: 'wings', colour: '#9fdcff' } }
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
  { id: 'floor-parquet', kind: 'floor', name: 'Parquet', price: 60, icon: '🪵', desc: 'Little wooden squares.', floor: 'parquet' }
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

export const ITEMS = [...LOOKS, ...HOUSE, ...CARDS];
export const getItem = (id) => ITEMS.find((it) => it.id === id) || null;
export const itemsOfKind = (kind) => ITEMS.filter((it) => it.kind === kind);
export const cardsOfSet = (setId) => CARDS.filter((c) => c.set === setId);

/** Shop tabs: which kinds each shows. */
export const TABS = [
  { id: 'looks', title: 'Looks', icon: '🧢', kinds: ['hat', 'glasses', 'back'] },
  { id: 'house', title: 'House', icon: '🏠', kinds: ['paint', 'floor'] },
  { id: 'cards', title: 'Cards', icon: '🃏', kinds: ['card'] }
];
