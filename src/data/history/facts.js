// History Harbor: the facts the four games draw on, from Pre-K pictures to Grade 8 vocabulary. Pure data, no
// Phaser: a generator turns these into picture questions for the youngest and worded questions for older players.

// ---- Compass Quest ---------------------------------------------------------------------------------------------

export const DIRECTIONS = [
  { id: 'north', name: 'north', pic: '⬆️', letter: 'N', opposite: 'south', right: 'east', left: 'west', degrees: 0, tells: 'North is at the top of a map. A compass needle points north.' },
  { id: 'east', name: 'east', pic: '➡️', letter: 'E', opposite: 'west', right: 'south', left: 'north', degrees: 90, tells: 'East is on the right of a map. The sun rises in the east.' },
  { id: 'south', name: 'south', pic: '⬇️', letter: 'S', opposite: 'north', right: 'west', left: 'east', degrees: 180, tells: 'South is at the bottom of a map.' },
  { id: 'west', name: 'west', pic: '⬅️', letter: 'W', opposite: 'east', right: 'north', left: 'south', degrees: 270, tells: 'West is on the left of a map. The sun sets in the west.' }
];
export const BETWEEN = [
  { name: 'north-east', pic: '↗️', between: ['north', 'east'], degrees: 45 }, { name: 'south-east', pic: '↘️', between: ['south', 'east'], degrees: 135 },
  { name: 'south-west', pic: '↙️', between: ['south', 'west'], degrees: 225 }, { name: 'north-west', pic: '↖️', between: ['north', 'west'], degrees: 315 }
];
export const dirOf = (id) => DIRECTIONS.find((d) => d.id === id);

/** Things with a direction: for "which way?" questions. */
export const DIRECTION_CLUES = [
  { clue: 'The sun rises in the…', answer: 'east', pic: '🌅' },
  { clue: 'The sun sets in the…', answer: 'west', pic: '🌇' },
  { clue: 'A compass needle always points…', answer: 'north', pic: '🧭' },
  { clue: 'The top of a map is usually…', answer: 'north', pic: '🗺️' },
  { clue: 'Penguins live far to the…', answer: 'south', pic: '🐧' },
  { clue: 'Polar bears live far to the…', answer: 'north', pic: '🐻‍❄️' },
  { clue: 'At noon the sun is high in the… (for people north of the equator)', answer: 'south', pic: '☀️' },
  { clue: 'The bottom of a map is…', answer: 'south', pic: '🗺️' }
];

/** A little harbour map for map-reading questions: where things are from the lighthouse. */
export const HARBOUR_MAP = [
  { thing: 'the ship', pic: '⛵', dir: 'east' }, { thing: 'the fish market', pic: '🐟', dir: 'west' },
  { thing: 'the town', pic: '🏘️', dir: 'north' }, { thing: 'the open sea', pic: '🌊', dir: 'south' }
];

/** Map and globe words for older players. */
export const MAP_WORDS = [
  { word: 'compass rose', means: 'the symbol on a map that shows north, south, east and west', band: 'B' },
  { word: 'map key (legend)', means: 'the box that explains the map\'s symbols and colours', band: 'B' },
  { word: 'scale', means: 'the bar or ratio that tells how far a map distance really is', band: 'B' },
  { word: 'equator', means: 'the imaginary line around the middle of the Earth', band: 'B' },
  { word: 'hemisphere', means: 'one half of the Earth, north or south of the equator', band: 'B' },
  { word: 'latitude', means: 'east-west lines: how far north or south a place is', band: 'C' },
  { word: 'longitude', means: 'pole-to-pole lines: how far east or west a place is', band: 'C' },
  { word: 'prime meridian', means: 'the zero line of longitude, through Greenwich in London', band: 'C' },
  { word: 'North Pole', means: 'the very top of the Earth, where every direction is south', band: 'C' },
  { word: 'grid reference', means: 'the letters and numbers that pin a spot on a map', band: 'C' },
  { word: 'tropics', means: 'the warm band of the Earth either side of the equator', band: 'C' }
];

// ---- Community Helpers ----------------------------------------------------------------------------------------

export const HELPERS = [
  { name: 'doctor', pic: '👩‍⚕️', does: 'helps people get better when they are ill', tool: 'a stethoscope', toolPic: '🩺', place: 'the hospital', placePic: '🏥' },
  { name: 'nurse', pic: '🧑‍⚕️', does: 'cares for people in hospital', tool: 'a thermometer', toolPic: '🌡️', place: 'the hospital', placePic: '🏥' },
  { name: 'firefighter', pic: '👨‍🚒', does: 'puts out fires and rescues people', tool: 'a hose', toolPic: '🧯', place: 'the fire station', placePic: '🚒' },
  { name: 'police officer', pic: '👮', does: 'keeps people safe and helps when there is trouble', tool: 'a radio', toolPic: '📻', place: 'the police station', placePic: '🚔' },
  { name: 'teacher', pic: '👩‍🏫', does: 'helps children learn', tool: 'a whiteboard', toolPic: '📋', place: 'the school', placePic: '🏫' },
  { name: 'postal worker', pic: '📫', does: 'delivers letters and parcels', tool: 'a mail bag', toolPic: '✉️', place: 'the post office', placePic: '🏤' },
  { name: 'farmer', pic: '👩‍🌾', does: 'grows the food we eat', tool: 'a tractor', toolPic: '🚜', place: 'the farm', placePic: '🌾' },
  { name: 'fisher', pic: '🎣', does: 'catches fish for the market', tool: 'a net', toolPic: '🪢', place: 'the harbour', placePic: '⚓' },
  { name: 'bus driver', pic: '🚌', does: 'drives people around town', tool: 'a bus', toolPic: '🚍', place: 'the bus station', placePic: '🚏' },
  { name: 'chef', pic: '👨‍🍳', does: 'cooks meals for people', tool: 'a frying pan', toolPic: '🍳', place: 'the restaurant', placePic: '🍽️' },
  { name: 'librarian', pic: '📚', does: 'looks after the books and helps you find one', tool: 'a library card', toolPic: '🪪', place: 'the library', placePic: '🏛️' },
  { name: 'dentist', pic: '🦷', does: 'keeps teeth healthy', tool: 'a toothbrush', toolPic: '🪥', place: 'the dental clinic', placePic: '🏥' },
  { name: 'builder', pic: '👷', does: 'builds houses and roads', tool: 'a hammer', toolPic: '🔨', place: 'the building site', placePic: '🏗️' },
  { name: 'vet', pic: '🐾', does: 'looks after sick animals', tool: 'a bandage', toolPic: '🩹', place: 'the animal clinic', placePic: '🐕' },
  { name: 'pilot', pic: '✈️', does: 'flies aeroplanes', tool: 'a flight map', toolPic: '🗺️', place: 'the airport', placePic: '🛫' },
  { name: 'lifeguard', pic: '🏊', does: 'keeps swimmers safe at the beach', tool: 'a float', toolPic: '🛟', place: 'the beach', placePic: '🏖️' }
];

/** How a town runs, for Grades 4-8. */
export const COMMUNITY_FACTS = [
  { q: 'Who is chosen to lead a town or city?', a: 'the mayor', pool: ['the librarian', 'the lifeguard', 'the chef'], explain: 'A mayor leads the town council and speaks for the town.', band: 'B' },
  { q: 'What do taxes pay for?', a: 'roads, schools, hospitals and other services everyone shares', pool: ['presents for the mayor', 'only the police station', 'nothing, they are a fine'], explain: 'People pay taxes together so the town can run the things all of them use.', band: 'B' },
  { q: 'What is a law?', a: 'a rule that everyone in a country must follow', pool: ['a rule only for children', 'a suggestion', 'a game'], explain: 'Laws are rules made by a country\'s leaders; breaking one has a penalty.', band: 'B' },
  { q: 'Who decides who the leaders will be in a democracy?', a: 'the people, by voting in elections', pool: ['the richest person', 'the police', 'whoever is tallest'], explain: 'In a democracy, citizens vote, and the person with the most votes leads.', band: 'B' },
  { q: 'Which of these is a public service?', a: 'the fire service', pool: ['a sweet shop', 'a birthday party', 'a football team'], explain: 'Public services are run for everyone and paid for with taxes.', band: 'B' },
  { q: 'What is a citizen?', a: 'someone who belongs to a country, with rights and duties', pool: ['a person who works for the mayor', 'a tourist', 'a child under ten'], explain: 'Citizens have rights, such as voting, and responsibilities, such as following the laws.', band: 'B' },
  { q: 'What is a responsibility?', a: 'something you should do, like keeping the town clean', pool: ['something you are allowed to have', 'a kind of tax', 'a job at the harbour'], explain: 'Rights are what you may have; responsibilities are what you ought to do.', band: 'B' },
  { q: 'In Barbados, who leads the government?', a: 'the Prime Minister', pool: ['the King', 'the Governor', 'the Chief Judge'], explain: 'Barbados is a republic with a President as head of state and a Prime Minister who leads the government.', band: 'C' },
  { q: 'Where do a country\'s elected leaders meet to make laws?', a: 'in parliament', pool: ['at the post office', 'in a hospital', 'on a ship'], explain: 'Parliament (or congress) is where laws are debated and passed.', band: 'C' },
  { q: 'What is a constitution?', a: 'the set of basic rules that says how a country is governed', pool: ['a list of all the citizens', 'a map of the country', 'a tax bill'], explain: 'A constitution sets out the powers of the government and the rights of the people.', band: 'C' },
  { q: 'What does "independence" mean for a country?', a: 'it governs itself instead of being ruled by another country', pool: ['it has no laws', 'it has no neighbours', 'it is an island'], explain: 'Barbados became independent from Britain on 30 November 1966.', band: 'C' },
  { q: 'Which is a right rather than a responsibility?', a: 'going to school', pool: ['paying taxes', 'obeying the law', 'keeping the beach clean'], explain: 'Education is a right every child has; the others are things citizens must do.', band: 'C' }
];

// ---- Flag Finder -----------------------------------------------------------------------------------------------

/** Countries with flags drawn in code (ui/Flags.js, keyed by `code`). `look` describes the flag in words. */
export const COUNTRIES = [
  { code: 'bb', name: 'Barbados', capital: 'Bridgetown', continent: 'the Caribbean', look: 'blue, gold and blue with a black trident', fact: 'Barbados is an island in the Caribbean Sea, famous for its beaches and flying fish.', island: true },
  { code: 'jm', name: 'Jamaica', capital: 'Kingston', continent: 'the Caribbean', look: 'a gold cross on green and black', fact: 'Jamaica is the home of reggae music.', island: true },
  { code: 'tt', name: 'Trinidad and Tobago', capital: 'Port of Spain', continent: 'the Caribbean', look: 'red with a black diagonal stripe', fact: 'Trinidad and Tobago gave the world the steelpan.', island: true },
  { code: 'gy', name: 'Guyana', capital: 'Georgetown', continent: 'South America', look: 'a golden arrow on green, with red and black', fact: 'Guyana has one of the world\'s tallest waterfalls, Kaieteur Falls.', island: false },
  { code: 'lc', name: 'Saint Lucia', capital: 'Castries', continent: 'the Caribbean', look: 'a blue flag with a gold and black triangle', fact: 'Saint Lucia\'s twin peaks, the Pitons, rise straight out of the sea.', island: true },
  { code: 'us', name: 'the United States', capital: 'Washington, D.C.', continent: 'North America', look: 'stars and stripes', fact: 'The fifty stars stand for its fifty states.', island: false },
  { code: 'ca', name: 'Canada', capital: 'Ottawa', continent: 'North America', look: 'a red maple leaf on white, between red bands', fact: 'Canada is the second-largest country in the world.', island: false },
  { code: 'gb', name: 'the United Kingdom', capital: 'London', continent: 'Europe', look: 'red and white crosses on blue', fact: 'Its flag, the Union Jack, joins the crosses of England, Scotland and Ireland.', island: true },
  { code: 'fr', name: 'France', capital: 'Paris', continent: 'Europe', look: 'blue, white and red stripes', fact: 'The Eiffel Tower in Paris was built in 1889.', island: false },
  { code: 'de', name: 'Germany', capital: 'Berlin', continent: 'Europe', look: 'black, red and gold bands', fact: 'Germany is known for its cars and its castles.', island: false },
  { code: 'it', name: 'Italy', capital: 'Rome', continent: 'Europe', look: 'green, white and red stripes', fact: 'Rome was the centre of the Roman Empire two thousand years ago.', island: false },
  { code: 'es', name: 'Spain', capital: 'Madrid', continent: 'Europe', look: 'red and yellow bands', fact: 'Spanish is spoken in more than twenty countries.', island: false },
  { code: 'br', name: 'Brazil', capital: 'Brasília', continent: 'South America', look: 'a blue globe on a yellow diamond on green', fact: 'Most of the Amazon rainforest is in Brazil.', island: false },
  { code: 'mx', name: 'Mexico', capital: 'Mexico City', continent: 'North America', look: 'green, white and red with an eagle', fact: 'Mexico gave the world chocolate and tomatoes.', island: false },
  { code: 'jp', name: 'Japan', capital: 'Tokyo', continent: 'Asia', look: 'a red circle on white', fact: 'The red circle is the rising sun.', island: true },
  { code: 'cn', name: 'China', capital: 'Beijing', continent: 'Asia', look: 'red with five gold stars', fact: 'China has more people than any other country but India.', island: false },
  { code: 'in', name: 'India', capital: 'New Delhi', continent: 'Asia', look: 'orange, white and green with a blue wheel', fact: 'The wheel in the middle has twenty-four spokes.', island: false },
  { code: 'au', name: 'Australia', capital: 'Canberra', continent: 'Australia (Oceania)', look: 'blue with the Southern Cross stars', fact: 'Australia is a country and a continent, home to kangaroos.', island: true },
  { code: 'ke', name: 'Kenya', capital: 'Nairobi', continent: 'Africa', look: 'black, red and green with a shield', fact: 'Kenya\'s savanna is famous for lions, elephants and the great wildebeest migration.', island: false },
  { code: 'ng', name: 'Nigeria', capital: 'Abuja', continent: 'Africa', look: 'green, white and green', fact: 'Nigeria has more people than any other African country.', island: false },
  { code: 'za', name: 'South Africa', capital: 'Pretoria', continent: 'Africa', look: 'a sideways Y in six colours', fact: 'Its six colours stand for its many peoples coming together.', island: false },
  { code: 'eg', name: 'Egypt', capital: 'Cairo', continent: 'Africa', look: 'red, white and black with a gold eagle', fact: 'The pyramids of Egypt are more than four thousand years old.', island: false },
  { code: 'gh', name: 'Ghana', capital: 'Accra', continent: 'Africa', look: 'red, gold and green with a black star', fact: 'Ghana was the first African country south of the Sahara to become independent, in 1957.', island: false }
];
export const countryOf = (code) => COUNTRIES.find((c) => c.code === code);
export const CONTINENTS = ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Australia (Oceania)', 'the Caribbean'];

/** World geography for Grades 4-8. */
export const WORLD_FACTS = [
  { q: 'How many continents are there?', a: 'seven', pool: ['five', 'nine', 'twelve'], explain: 'Africa, Antarctica, Asia, Australia, Europe, North America and South America.', band: 'B' },
  { q: 'Which is the largest ocean?', a: 'the Pacific', pool: ['the Atlantic', 'the Indian', 'the Arctic'], explain: 'The Pacific Ocean is bigger than all the land on Earth put together.', band: 'B' },
  { q: 'Which ocean washes the beaches of Barbados?', a: 'the Atlantic', pool: ['the Pacific', 'the Indian', 'the Arctic'], explain: 'Barbados sits where the Caribbean Sea meets the Atlantic Ocean.', band: 'B' },
  { q: 'Which is the largest continent?', a: 'Asia', pool: ['Africa', 'Europe', 'Australia'], explain: 'Asia holds about six in every ten people on Earth.', band: 'B' },
  { q: 'Which continent is frozen and has no countries?', a: 'Antarctica', pool: ['Australia', 'Africa', 'Europe'], explain: 'Antarctica is shared by scientists from many nations, with no towns at all.', band: 'B' },
  { q: 'The Caribbean islands lie between North America and…', a: 'South America', pool: ['Africa', 'Europe', 'Asia'], explain: 'The Caribbean Sea is cupped between the two American continents.', band: 'B' },
  { q: 'What is the longest river in the world?', a: 'the Nile', pool: ['the Amazon', 'the Thames', 'the Mississippi'], explain: 'The Nile runs over 6,600 kilometres through Africa; the Amazon carries the most water.', band: 'C' },
  { q: 'What is the highest mountain on Earth?', a: 'Mount Everest', pool: ['Mount Kilimanjaro', 'Ben Nevis', 'Mount Fuji'], explain: 'Everest, in the Himalayas, stands about 8,849 metres tall.', band: 'C' },
  { q: 'Which is the largest hot desert?', a: 'the Sahara', pool: ['the Gobi', 'the Mojave', 'the Kalahari'], explain: 'The Sahara covers most of North Africa; Antarctica is the largest desert of all, but a cold one.', band: 'C' },
  { q: 'What do we call a group of islands?', a: 'an archipelago', pool: ['a peninsula', 'a delta', 'a plateau'], explain: 'The Caribbean islands together form an archipelago.', band: 'C' },
  { q: 'A piece of land with water on three sides is a…', a: 'peninsula', pool: ['strait', 'canyon', 'glacier'], explain: 'Italy and Florida are peninsulas.', band: 'C' },
  { q: 'What is a country\'s capital?', a: 'the city where its government sits', pool: ['its biggest beach', 'its oldest town', 'any city with an airport'], explain: 'Bridgetown is the capital of Barbados.', band: 'B' }
];

// ---- Past & Present ---------------------------------------------------------------------------------------------

/** Pairs of then and now. */
export const THEN_NOW = [
  { then: { name: 'candle', pic: '🕯️' }, now: { name: 'light bulb', pic: '💡' }, use: 'to light a room' },
  { then: { name: 'horse and cart', pic: '🐎' }, now: { name: 'car', pic: '🚗' }, use: 'to travel' },
  { then: { name: 'quill pen', pic: '🪶' }, now: { name: 'computer', pic: '💻' }, use: 'to write' },
  { then: { name: 'washboard', pic: '🧺' }, now: { name: 'washing machine', pic: '🫧' }, use: 'to wash clothes' },
  { then: { name: 'letter by post', pic: '✉️' }, now: { name: 'video call', pic: '📱' }, use: 'to talk to someone far away' },
  { then: { name: 'sailing ship', pic: '⛵' }, now: { name: 'aeroplane', pic: '✈️' }, use: 'to cross the ocean' },
  { then: { name: 'ice box', pic: '📦' }, now: { name: 'fridge', pic: '🧊' }, use: 'to keep food cold' },
  { then: { name: 'abacus', pic: '🧮' }, now: { name: 'calculator', pic: '🔢' }, use: 'to do sums' },
  { then: { name: 'record player', pic: '📀' }, now: { name: 'music app', pic: '🎧' }, use: 'to play music' },
  { then: { name: 'map and compass', pic: '🧭' }, now: { name: 'satnav', pic: '🛰️' }, use: 'to find the way' },
  { then: { name: 'water well', pic: '🪣' }, now: { name: 'tap', pic: '🚰' }, use: 'to get water' },
  { then: { name: 'town crier', pic: '📣' }, now: { name: 'news website', pic: '📰' }, use: 'to hear the news' }
];

/** Events in order, for "which came first?" and timeline questions. */
export const EVENTS = [
  { year: -2500, name: 'the pyramids of Egypt were built', pic: '🏺', band: 'C' },
  { year: 1492, name: 'Columbus sailed across the Atlantic', pic: '⛵', band: 'B' },
  { year: 1627, name: 'the first English settlers arrived in Barbados', pic: '🏝️', band: 'B' },
  { year: 1816, name: 'Bussa led the great rebellion against slavery in Barbados', pic: '✊', band: 'B' },
  { year: 1834, name: 'slavery was abolished in Barbados', pic: '🕊️', band: 'B' },
  { year: 1876, name: 'the telephone was invented', pic: '☎️', band: 'B' },
  { year: 1903, name: 'the Wright brothers made the first aeroplane flight', pic: '🛩️', band: 'B' },
  { year: 1928, name: 'penicillin was discovered', pic: '💊', band: 'C' },
  { year: 1966, name: 'Barbados became independent', pic: '🇧🇧', band: 'B' },
  { year: 1969, name: 'people first walked on the Moon', pic: '🌙', band: 'B' },
  { year: 1991, name: 'the World Wide Web opened to everyone', pic: '🌐', band: 'C' },
  { year: 2007, name: 'the first smartphone with a touch screen came out', pic: '📱', band: 'C' },
  { year: 2021, name: 'Barbados became a republic', pic: '🏛️', band: 'C' }
];

export const HISTORY_WORDS = [
  { word: 'historian', means: 'a person who studies the past', band: 'B' },
  { word: 'artefact', means: 'an old object made by people, kept to learn about the past', band: 'B' },
  { word: 'century', means: 'a hundred years', band: 'B' },
  { word: 'decade', means: 'ten years', band: 'B' },
  { word: 'timeline', means: 'a line that shows events in the order they happened', band: 'B' },
  { word: 'ancestor', means: 'a family member from long ago, like a great-grandparent', band: 'B' },
  { word: 'archaeologist', means: 'a person who digs up and studies things people left behind', band: 'C' },
  { word: 'primary source', means: 'something made at the time, like a letter, photo or diary', band: 'C' },
  { word: 'secondary source', means: 'something written later about the past, like a history book', band: 'C' },
  { word: 'emancipation', means: 'being set free from slavery', band: 'C' },
  { word: 'colony', means: 'a land ruled by another, faraway country', band: 'C' },
  { word: 'republic', means: 'a country whose leader is chosen by the people, not a king', band: 'C' },
  { word: 'heritage', means: 'the buildings, stories and customs handed down from the past', band: 'C' }
];

export const HISTORY_FACTS = [
  { q: 'How many years are in a century?', a: '100', pool: ['10', '50', '1,000'], explain: 'A century is a hundred years; a decade is ten.', band: 'B' },
  { q: 'Which century is the year 1850 in?', a: 'the 19th century', pool: ['the 18th century', 'the 20th century', 'the 15th century'], explain: 'The 1800s are the nineteenth century, because the first century was the years 1 to 100.', band: 'C' },
  { q: 'Which century are we in now?', a: 'the 21st century', pool: ['the 20th century', 'the 19th century', 'the 22nd century'], explain: 'The years 2001 to 2100 are the twenty-first century.', band: 'B' },
  { q: 'What does "BC" mean after a date?', a: 'before the birth of Christ', pool: ['before cars', 'British calendar', 'beginning of the century'], explain: 'Dates count down to the year 1 BC, then AD counts up: we are in AD 2026.', band: 'C' },
  { q: 'On what date does Barbados celebrate Independence Day?', a: '30 November', pool: ['1 January', '4 July', '25 December'], explain: 'Barbados became independent from Britain on 30 November 1966, and a republic on the same date in 2021.', band: 'B' },
  { q: 'What is the capital of Barbados?', a: 'Bridgetown', pool: ['Speightstown', 'Holetown', 'Oistins'], explain: 'Bridgetown, on the south-west coast, is the capital; its Garrison is a World Heritage site.', band: 'B' },
  { q: 'Who led the 1816 rebellion against slavery in Barbados?', a: 'Bussa', pool: ['Columbus', 'Nelson', 'Napoleon'], explain: 'Bussa is one of Barbados\'s National Heroes; the rebellion helped bring slavery to an end.', band: 'C' },
  { q: 'Which is a primary source about a hurricane in 1831?', a: 'a letter written by someone who lived through it', pool: ['a school textbook', 'a film made last year', 'a poster at the museum'], explain: 'A primary source was made at the time by someone who was there.', band: 'C' },
  { q: 'What did people use before fridges to keep food cold?', a: 'ice boxes and cool cellars', pool: ['microwaves', 'solar panels', 'plastic bags'], explain: 'Blocks of ice were delivered to houses and kept in an insulated box.', band: 'B' },
  { q: 'What was the Industrial Revolution?', a: 'when machines and factories changed how things were made', pool: ['a war between two kings', 'the invention of the wheel', 'the first flight to the Moon'], explain: 'From the 1700s, steam engines and factories moved work from homes and fields to towns.', band: 'C' },
  { q: 'What is a museum for?', a: 'keeping and showing objects from the past', pool: ['selling old things', 'storing food', 'building new houses'], explain: 'Museums look after artefacts so everyone can learn from them.', band: 'B' },
  { q: 'Why do we study history?', a: 'to understand how the past shaped today', pool: ['to learn to tell the time', 'to grow food', 'to build ships'], explain: 'Knowing what happened, and why, helps us make better choices now.', band: 'B' }
];
