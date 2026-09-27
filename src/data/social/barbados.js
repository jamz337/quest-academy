// Social studies inside the player's house: every room tells one story about Barbados (a few short pages,
// read aloud) and ends with one quiz of five questions whose answers are all in the story.
// pic: the emoji shown big on a page; item: what hangs in the room; quiz choices: 4, the first is the answer
// (they are shuffled on screen); why: the line shown after answering. A question may carry `pics`, one per
// choice: an emoji, or a drawn picture key from ui/Pictures.js ('flag:jamaica', 'map:sw'), shown as picture cards.
// Every page also has a `short` telling for grades 2 and 3 (see pageText); the facts the quiz needs are in both.

export const ROOMS = [
  {
    id: 'flag', title: 'The Flag Room', short: 'Flag', item: '🔱', colour: 0x3d8bff, floor: 0xd9e9ff,   // the house draws the real flag; flag emoji are letters on Windows
    intro: 'Learn about the flag of Barbados and Independence Day.',
    story: [
      { pic: '🎉', text: 'Barbados became an independent country on 30 November 1966. That night the new flag was raised for the very first time. Every year, 30 November is Independence Day, a big holiday with parades, music and lights.', short: 'Barbados became its own country on 30 November 1966. Every year that day is Independence Day, with parades and lights.' },
      { pic: '🏖️', text: 'The flag has three tall stripes: ultramarine blue, gold, and ultramarine blue. The blue stands for the sea and the sky around the island. The gold stands for the sand on the beaches.', short: 'The flag has three stripes: blue, gold, blue. Blue is the sea and the sky. Gold is the sand.' },
      { pic: '🔱', text: 'In the middle is a black trident with three points. It is broken from its handle to show that Barbados broke away from being ruled by Britain. The three points stand for government of the people, for the people and by the people.', short: 'In the middle is a black trident with three points. It is broken to show Barbados is free from British rule.' },
      { pic: '🎨', text: 'The flag was designed by Grantley Prescod, an art teacher. His design won a competition with more than a thousand entries. Bajans fly the flag with pride, especially in November.', short: 'An art teacher called Grantley Prescod drew the flag. It won a big competition.' }
    ],
    quiz: [
      { q: 'When is Independence Day in Barbados?', choices: ['30 November', '1 January', '1 August', '25 December'], why: 'Barbados became independent on 30 November 1966.' },
      { q: 'What do the blue stripes on the flag stand for?', choices: ['The sea and the sky', 'The mountains', 'Sugar cane', 'The night'], why: 'Blue is for the sea and sky; gold is for the sand.' },
      { q: 'What is in the middle of the flag?', choices: ['A broken trident', 'A pelican', 'A star', 'A palm tree'], why: 'A black trident with three points sits on the gold stripe.' },
      { q: 'Why is the trident broken?', choices: ['Barbados broke away from British rule', 'The artist ran out of paint', 'It shows a storm at sea', 'It was copied from a fork'], why: 'The broken handle shows the break from being ruled by Britain.' },
      { q: 'Which of these is the flag of Barbados?', choices: ['Barbados', 'Jamaica', 'Trinidad and Tobago', 'The Bahamas'], pics: ['flag:barbados', 'flag:jamaica', 'flag:trinidad', 'flag:bahamas'], why: 'Blue, gold, blue, with the broken trident in the middle.' }
    ]
  },
  {
    id: 'heroes', title: 'The Heroes Gallery', short: 'Heroes', item: '🖼️', colour: 0xff8f3f, floor: 0xffe6d3,
    intro: 'Meet the National Heroes of Barbados.',
    story: [
      { pic: '🏅', text: 'Barbados has eleven National Heroes. They are people who did brave and important things for the country. National Heroes Day is on 28 April, the birthday of Sir Grantley Adams.', short: 'Barbados has eleven National Heroes. They did brave things for the country. National Heroes Day is 28 April.' },
      { pic: '✊', text: 'Bussa was an enslaved African who led a great rebellion for freedom in 1816. Today a tall statue of a man breaking his chains, called the Emancipation Statue, reminds everyone of him.', short: 'Bussa led a fight for freedom in 1816. A big statue of him breaking his chains stands near Bridgetown.' },
      { pic: '🏛️', text: 'Sir Grantley Adams and Errol Barrow were leaders who worked for a fairer Barbados. Errol Barrow led the country to independence in 1966 and became its first Prime Minister. He is called the Father of Independence.', short: 'Errol Barrow led Barbados to independence and was the first Prime Minister. People call him the Father of Independence.' },
      { pic: '📜', text: 'Sarah Ann Gill stood up for her church when it was not safe to do so. Samuel Jackman Prescod was the first person of colour elected to the House of Assembly. Clement Payne, Charles Duncan O\'Neal, Sir Hugh Springer and Sir Frank Walcott fought for workers and the poor.', short: 'Sarah Ann Gill was brave for her church. Samuel Jackman Prescod was the first person of colour in the House of Assembly. Others fought for workers.' },
      { pic: '🏏', text: 'Sir Garfield Sobers is one of the greatest cricketers the world has ever seen. Rihanna, the singer from Barbados, became the newest National Hero on 30 November 2021, the day Barbados became a republic.', short: 'Sir Garfield Sobers is a cricket star. Rihanna the singer became a National Hero in 2021.' }
    ],
    quiz: [
      { q: 'How many National Heroes does Barbados have?', choices: ['Eleven', 'Five', 'Twenty', 'Two'], why: 'There are eleven National Heroes of Barbados.' },
      { q: 'Who led a rebellion for freedom in 1816?', choices: ['Bussa', 'Rihanna', 'Errol Barrow', 'Sir Garfield Sobers'], why: 'Bussa led the 1816 rebellion; the Emancipation Statue remembers him.' },
      { q: 'Who is called the Father of Independence?', choices: ['Errol Barrow', 'Bussa', 'Clement Payne', 'Sir Hugh Springer'], why: 'Errol Barrow led Barbados to independence and was its first Prime Minister.' },
      { q: 'Sir Garfield Sobers was a star of which sport?', choices: ['Cricket', 'Football', 'Basketball', 'Tennis'], pics: ['🏏', '⚽', '🏀', '🎾'], why: 'Sir Garfield Sobers is one of the greatest cricketers ever.' },
      { q: 'Who became a National Hero in 2021?', choices: ['Rihanna', 'Bussa', 'Errol Barrow', 'Sir Grantley Adams'], why: 'Rihanna was named a National Hero on 30 November 2021.' }
    ]
  },
  {
    id: 'parishes', title: 'The Map Room', short: 'Parishes', item: '🗺️', colour: 0x2ec46a, floor: 0xdcf5e4,
    intro: 'Explore the land of Barbados and its eleven parishes.',
    story: [
      { pic: '🏝️', text: 'Barbados is a small island in the Caribbean. It is about 34 kilometres long and 23 kilometres wide. Most of it is made of coral limestone, so the land is quite flat with gentle hills.', short: 'Barbados is a small island in the Caribbean. Most of the land is flat, with small hills.' },
      { pic: '📍', text: 'The island is divided into eleven parishes. Most are named after saints: St. Michael, St. James, St. Peter, St. Lucy, St. Andrew, St. Joseph, St. John, St. Philip, St. George, St. Thomas, and Christ Church.', short: 'The island has eleven parishes. Most are named after saints, like St. Michael and St. Lucy. One is called Christ Church.' },
      { pic: '🏙️', text: 'Bridgetown, the capital city, is in St. Michael on the south-west coast. Many people live and work there, and big ships come into its port. St. Philip is the largest parish, in the south-east corner of the island.', short: 'Bridgetown is the capital city. It is in St. Michael, on the south-west coast. Big ships come into its port.' },
      { pic: '🌊', text: 'The east coast faces the Atlantic Ocean, where the waves are big and the land is hilly. This hilly part is called the Scotland District. Mount Hillaby in St. Andrew is the highest point, about 336 metres high. The west coast faces the calm Caribbean Sea.', short: 'The east coast faces the Atlantic Ocean, with big waves and hills. Mount Hillaby is the highest point. The west coast has the calm Caribbean Sea.' },
      { pic: '💎', text: 'Under the ground there are caves! Harrison\'s Cave in St. Thomas has streams and shining stone shapes. At the far north, in St. Lucy, the Animal Flower Cave opens right onto the sea.', short: 'Under the ground there are caves. Harrison\'s Cave has streams and shining stones.' }
    ],
    quiz: [
      { q: 'How many parishes does Barbados have?', choices: ['Eleven', 'Three', 'Seven', 'Fifteen'], why: 'Barbados has eleven parishes.' },
      { q: 'Which map shows where Bridgetown is?', choices: ['In the south-west', 'In the north', 'On the east coast', 'In the middle'], pics: ['map:sw', 'map:n', 'map:e', 'map:c'], why: 'Bridgetown is on the south-west coast, in St. Michael.' },
      { q: 'Which ocean is on the east coast of Barbados?', choices: ['The Atlantic Ocean', 'The Pacific Ocean', 'The Indian Ocean', 'The Arctic Ocean'], why: 'The rough Atlantic is to the east; the calm Caribbean Sea is to the west.' },
      { q: 'What is the highest point in Barbados?', choices: ['Mount Hillaby', 'Bridgetown', 'Harrison\'s Cave', 'Oistins'], why: 'Mount Hillaby in St. Andrew is about 336 metres high.' },
      { q: 'Which parish is NOT named after a saint?', choices: ['Christ Church', 'St. James', 'St. Lucy', 'St. John'], why: 'Christ Church is the one parish not named after a saint.' }
    ]
  },
  {
    id: 'symbols', title: 'The Symbols Room', short: 'Symbols', item: '🛡️', colour: 0x8b5cf6, floor: 0xeee6ff,
    intro: 'The coat of arms, the anthem, the flower and the dish.',
    story: [
      { pic: '🛡️', text: 'Every country has symbols that tell its story. Barbados has a coat of arms, a national anthem, a national flower and a national dish. Each one says something about the island and its people.', short: 'Barbados has special symbols: a coat of arms, an anthem, a flower and a dish.' },
      { pic: '🌳', text: 'The coat of arms shows a bearded fig tree. Long ago, Portuguese sailors saw these trees with their hanging roots and called the island "Los Barbados", the bearded ones. That is how Barbados got its name!', short: 'The coat of arms shows a bearded fig tree. Sailors saw these trees and called the island "the bearded ones". That is how Barbados got its name.' },
      { pic: '🐟', text: 'Beside the shield stand a dolphin fish and a pelican. Above it, a hand holds two sugar canes crossed like an X. The motto underneath says "Pride and Industry".', short: 'A dolphin fish and a pelican stand beside the shield. The motto says "Pride and Industry".' },
      { pic: '🌺', text: 'The national flower is the Pride of Barbados, with bright red, orange and yellow petals. The national anthem is "In Plenty and In Time of Need". The national dish is cou-cou and flying fish.', short: 'The national flower is the Pride of Barbados. The national dish is cou-cou and flying fish.' },
      { pic: '🏛️', text: 'On 30 November 2021 Barbados became a republic. Now the head of the country is a Barbadian President, chosen in Barbados, instead of the King or Queen of Britain. The first President was Dame Sandra Mason.', short: 'In 2021 Barbados became a republic. Now a President from Barbados is the head of the country.' }
    ],
    quiz: [
      { q: 'Which tree is on the coat of arms?', choices: ['The bearded fig tree', 'The coconut palm', 'The mango tree', 'The oak tree'], why: 'The bearded fig tree gave the island its name.' },
      { q: 'What does "Los Barbados" mean?', choices: ['The bearded ones', 'The sunny ones', 'The small ones', 'The fishermen'], why: 'Portuguese sailors named the island after the "bearded" fig trees.' },
      { q: 'What is the motto of Barbados?', choices: ['Pride and Industry', 'In Plenty and In Time of Need', 'Land of the Flying Fish', 'Peace and Love'], why: '"Pride and Industry" is written under the coat of arms.' },
      { q: 'What is the national flower?', choices: ['The Pride of Barbados', 'The rose', 'The sunflower', 'The hibiscus'], why: 'The Pride of Barbados has red, orange and yellow petals.' },
      { q: 'What is the national dish?', choices: ['Cou-cou and flying fish', 'Pizza', 'Rice and peas', 'Fish and chips'], pics: ['🐟', '🍕', '🍛', '🍟'], why: 'Cou-cou and flying fish is the national dish.' }
    ]
  },
  {
    id: 'culture', title: 'The Festival Kitchen', short: 'Culture', item: '🥁', colour: 0xff6fae, floor: 0xffe1ee,
    intro: 'Crop Over, cricket, Bajan food and Bajan words.',
    story: [
      { pic: '🌾', text: 'Long ago, when the sugar cane harvest ended, workers on the plantations celebrated with music and dancing. That party became Crop Over, the biggest festival in Barbados. It happens every summer.', short: 'When the sugar cane harvest ended, workers had a big party. That party became Crop Over, the biggest festival in Barbados.' },
      { pic: '🎭', text: 'Crop Over ends with Grand Kadooment on the first Monday in August. Bands parade through the streets in bright costumes with feathers and sparkles, dancing to calypso and soca music.', short: 'Crop Over ends with Grand Kadooment on the first Monday in August. People dance in bright costumes.' },
      { pic: '🍽️', text: 'Bajans love their food. Flying fish and cou-cou is the national dish. Cou-cou is made from cornmeal and okra. On Friday nights, people gather at Oistins to eat fresh fried fish.', short: 'Bajans love flying fish and cou-cou. Cou-cou is made from cornmeal and okra. On Fridays people eat fish at Oistins.' },
      { pic: '🏏', text: 'Cricket is the most loved sport on the island. Children play it on beaches and in the streets, and Barbados has given the world some of its best players, like Sir Garfield Sobers.', short: 'Cricket is the most loved sport. Children play it on the beach and in the street.' },
      { pic: '🥁', text: 'The tuk band plays lively music with a kettle drum, a bass drum and a tin flute. Bajans also have their own sayings: "wuh loss!" means "oh no!" and "cheese on bread!" means "wow!"', short: 'The tuk band plays drums and a tin flute. "Cheese on bread!" is a Bajan way to say "wow!"' }
    ],
    quiz: [
      { q: 'What is the biggest festival in Barbados?', choices: ['Crop Over', 'Halloween', 'The Winter Fair', 'The Kite Festival'], why: 'Crop Over is the biggest festival, every summer.' },
      { q: 'Crop Over began as a celebration of what?', choices: ['The end of the sugar cane harvest', 'The first day of school', 'A cricket match', 'A new king'], why: 'Plantation workers celebrated when the sugar cane harvest was over.' },
      { q: 'When is Grand Kadooment?', choices: ['The first Monday in August', '30 November', '1 January', 'Christmas Day'], why: 'Grand Kadooment, the big parade, is on the first Monday in August.' },
      { q: 'Which of these plays in a tuk band?', choices: ['A drum', 'A violin', 'A piano', 'A trumpet'], pics: ['🥁', '🎻', '🎹', '🎺'], why: 'The tuk band has a kettle drum, a bass drum and a tin flute.' },
      { q: 'What is the most loved sport in Barbados?', choices: ['Cricket', 'Ice hockey', 'Skiing', 'Baseball'], why: 'Cricket is played on beaches and streets all over the island.' }
    ]
  }
];

/** Grades 2 and 3 read the short telling of a page; older readers get the full one. */
export const SHORT_TEXT_GRADE = 3;
export const pageText = (page, grade) => ((Number(grade) || 4) <= SHORT_TEXT_GRADE && page.short ? page.short : page.text);

export const getRoom = (id) => ROOMS.find((r) => r.id === id) || null;
export const ROOM_GAME_PREFIX = 'social-';
export const roomGameId = (id) => ROOM_GAME_PREFIX + id;
export const roomFromGameId = (gameId) => (typeof gameId === 'string' && gameId.startsWith(ROOM_GAME_PREFIX) ? getRoom(gameId.slice(ROOM_GAME_PREFIX.length)) : null);
