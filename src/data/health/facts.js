// The Hospital (Health Heights): the facts its four games draw on, from Pre-K body parts and foods to Grade 8
// body systems, nutrients and first aid. Pure data, no Phaser.

// ---- Body Map ----------------------------------------------------------------------------------------------

export const BODY_PARTS = [
  { name: 'eyes', pic: '👀', does: 'see', sense: 'sight' },
  { name: 'ears', pic: '👂', does: 'hear', sense: 'hearing' },
  { name: 'nose', pic: '👃', does: 'smell', sense: 'smell' },
  { name: 'tongue', pic: '👅', does: 'taste', sense: 'taste' },
  { name: 'hands', pic: '🤲', does: 'touch and hold', sense: 'touch' },
  { name: 'feet', pic: '🦶', does: 'walk and run' },
  { name: 'legs', pic: '🦵', does: 'walk, jump and kick' },
  { name: 'arms', pic: '💪', does: 'lift and carry' },
  { name: 'teeth', pic: '🦷', does: 'bite and chew' },
  { name: 'mouth', pic: '👄', does: 'eat and talk' }
];
export const ORGANS = [
  { name: 'heart', pic: '❤️', does: 'pumps blood round the body', system: 'circulatory', band: 'A' },
  { name: 'lungs', pic: '🫁', does: 'take in air and breathe out', system: 'respiratory', band: 'A' },
  { name: 'brain', pic: '🧠', does: 'thinks and tells the body what to do', system: 'nervous', band: 'A' },
  { name: 'stomach', pic: '🫃', does: 'mashes up food with juices', system: 'digestive', band: 'A' },
  { name: 'bones', pic: '🦴', does: 'hold the body up and protect it', system: 'skeletal', band: 'A' },
  { name: 'muscles', pic: '💪', does: 'pull on bones to move the body', system: 'muscular', band: 'B' },
  { name: 'skin', pic: '🖐️', does: 'covers and protects the whole body', system: 'integumentary', band: 'B' },
  { name: 'kidneys', pic: '🫘', does: 'clean the blood and make urine', system: 'urinary', band: 'C' },
  { name: 'liver', pic: '🟤', does: 'cleans the blood and stores energy', system: 'digestive', band: 'C' },
  { name: 'intestines', pic: '🌀', does: 'take the goodness out of food', system: 'digestive', band: 'B' }
];
export const SYSTEMS = [
  { id: 'circulatory', name: 'circulatory system', does: 'moves blood round the body', parts: 'the heart, blood and blood vessels' },
  { id: 'respiratory', name: 'respiratory system', does: 'breathes air in and out', parts: 'the lungs and windpipe' },
  { id: 'digestive', name: 'digestive system', does: 'breaks food down', parts: 'the stomach and intestines' },
  { id: 'nervous', name: 'nervous system', does: 'carries messages round the body', parts: 'the brain, spinal cord and nerves' },
  { id: 'skeletal', name: 'skeletal system', does: 'holds the body up', parts: 'all 206 bones' },
  { id: 'muscular', name: 'muscular system', does: 'moves the body', parts: 'about 600 muscles' },
  { id: 'integumentary', name: 'integumentary system', does: 'covers and protects the body', parts: 'the skin, hair and nails' },
  { id: 'urinary', name: 'urinary system', does: 'cleans waste out of the blood', parts: 'the kidneys and bladder' }
];
export const BODY_FACTS = [
  { q: 'How many bones does a grown-up have?', a: '206', pool: ['12', '50', '1,000'], explain: 'Babies are born with about 300, and some join together as they grow.', band: 'B' },
  { q: 'Which is the biggest organ of the body?', a: 'the skin', pool: ['the heart', 'the brain', 'the liver'], explain: 'The skin covers the whole body and keeps germs out.', band: 'B' },
  { q: 'How many times a minute does a resting heart beat, roughly?', a: 'about 70', pool: ['about 7', 'about 700', 'about 7,000'], explain: 'Run around and it beats faster to send more blood to the muscles.', band: 'B' },
  { q: 'Where is the smallest bone in the body?', a: 'in the ear', pool: ['in the toe', 'in the nose', 'in the knee'], explain: 'The stirrup bone in the ear is smaller than a grain of rice.', band: 'C' },
  { q: 'What carries oxygen round the body?', a: 'red blood cells', pool: ['white blood cells', 'bones', 'tears'], explain: 'Red blood cells pick up oxygen in the lungs and carry it everywhere.', band: 'C' },
  { q: 'What do white blood cells do?', a: 'fight germs', pool: ['carry oxygen', 'make bones', 'digest food'], explain: 'White blood cells are the body\'s soldiers against infection.', band: 'C' },
  { q: 'Which muscle works all day and all night without resting?', a: 'the heart', pool: ['the tongue', 'the biceps', 'the thigh'], explain: 'The heart is a muscle that never stops pumping.', band: 'B' },
  { q: 'How many baby teeth do children grow?', a: '20', pool: ['10', '32', '50'], explain: 'Twenty baby teeth fall out and 32 grown-up teeth take their place.', band: 'B' },
  { q: 'What does the brain sit inside?', a: 'the skull', pool: ['the ribs', 'the spine', 'the hips'], explain: 'The skull is a hard bone helmet that protects the brain.', band: 'B' },
  { q: 'What protects the heart and lungs?', a: 'the ribs', pool: ['the skull', 'the knees', 'the fingers'], explain: 'The ribs make a cage round the heart and lungs.', band: 'B' }
];

// ---- Plate Planner -----------------------------------------------------------------------------------------

export const FOOD_GROUPS = [
  { id: 'fruit', name: 'fruit', pic: '🍎', gives: 'vitamins to keep you well', colour: '#e5383b' },
  { id: 'veg', name: 'vegetables', pic: '🥦', gives: 'vitamins and fibre', colour: '#3fb24d' },
  { id: 'grains', name: 'grains and starches', pic: '🍞', gives: 'energy to run and play', colour: '#e0a040' },
  { id: 'protein', name: 'protein', pic: '🍗', gives: 'the building blocks for muscles', colour: '#b5651d' },
  { id: 'dairy', name: 'dairy', pic: '🥛', gives: 'calcium for strong bones and teeth', colour: '#8fb8e8' },
  { id: 'treats', name: 'sometimes foods', pic: '🍬', gives: 'sugar and fat: only now and then', colour: '#d58aff' }
];
export const groupOf = (id) => FOOD_GROUPS.find((g) => g.id === id);
export const FOODS = [
  { name: 'apple', pic: '🍎', group: 'fruit' }, { name: 'banana', pic: '🍌', group: 'fruit' }, { name: 'mango', pic: '🥭', group: 'fruit' }, { name: 'watermelon', pic: '🍉', group: 'fruit' }, { name: 'orange', pic: '🍊', group: 'fruit' },
  { name: 'carrot', pic: '🥕', group: 'veg' }, { name: 'broccoli', pic: '🥦', group: 'veg' }, { name: 'sweet potato', pic: '🍠', group: 'veg' }, { name: 'pumpkin', pic: '🎃', group: 'veg' }, { name: 'cucumber', pic: '🥒', group: 'veg' },
  { name: 'bread', pic: '🍞', group: 'grains' }, { name: 'rice', pic: '🍚', group: 'grains' }, { name: 'macaroni', pic: '🍝', group: 'grains' }, { name: 'cereal', pic: '🥣', group: 'grains' },
  { name: 'fish', pic: '🐟', group: 'protein' }, { name: 'chicken', pic: '🍗', group: 'protein' }, { name: 'eggs', pic: '🥚', group: 'protein' }, { name: 'beans', pic: '🫘', group: 'protein' }, { name: 'peanuts', pic: '🥜', group: 'protein' },
  { name: 'milk', pic: '🥛', group: 'dairy' }, { name: 'cheese', pic: '🧀', group: 'dairy' }, { name: 'yoghurt', pic: '🍦', group: 'dairy' },
  { name: 'sweets', pic: '🍬', group: 'treats' }, { name: 'cake', pic: '🍰', group: 'treats' }, { name: 'fizzy drink', pic: '🥤', group: 'treats' }, { name: 'chips', pic: '🍟', group: 'treats' }, { name: 'doughnut', pic: '🍩', group: 'treats' }
];
export const NUTRIENTS = [
  { name: 'protein', does: 'builds and repairs muscles', from: 'fish, chicken, eggs and beans', band: 'B' },
  { name: 'carbohydrates', does: 'give energy', from: 'bread, rice and sweet potato', band: 'B' },
  { name: 'calcium', does: 'makes bones and teeth strong', from: 'milk, cheese and yoghurt', band: 'B' },
  { name: 'vitamin C', does: 'helps the body heal and fight colds', from: 'oranges, mangoes and peppers', band: 'B' },
  { name: 'fibre', does: 'keeps food moving through the body', from: 'vegetables, fruit and oats', band: 'C' },
  { name: 'iron', does: 'helps the blood carry oxygen', from: 'meat, beans and green leaves', band: 'C' },
  { name: 'vitamin D', does: 'helps the body use calcium', from: 'sunshine, eggs and oily fish', band: 'C' },
  { name: 'water', does: 'keeps every part of the body working', from: 'drinks, fruit and soups', band: 'B' }
];
export const PLATE_FACTS = [
  { q: 'How much of your plate should be fruit and vegetables?', a: 'about half', pool: ['a tiny corner', 'all of it', 'none'], explain: 'Half the plate fruit and veg, a quarter grains, a quarter protein.', band: 'B' },
  { q: 'What is the best drink when you are thirsty?', a: 'water', pool: ['fizzy drink', 'juice with sugar', 'coffee'], explain: 'Water has no sugar and the body is mostly water.', band: 'B' },
  { q: 'Which meal gives you energy to start the day?', a: 'breakfast', pool: ['supper', 'a midnight snack', 'dessert'], explain: 'Breakfast breaks the night\'s fast and wakes up the brain.', band: 'B' },
  { q: 'How many portions of fruit and veg a day are good?', a: 'at least five', pool: ['one', 'twenty', 'none'], explain: 'Five a day: a banana, some carrots, a mango, peas and an apple would do it.', band: 'B' },
  { q: 'What is the national dish of Barbados?', a: 'cou-cou and flying fish', pool: ['pizza', 'sushi', 'fish and chips'], explain: 'Cou-cou is cornmeal and okra, served with steamed flying fish.', band: 'B' },
  { q: 'Which food is highest in sugar?', a: 'a fizzy drink', pool: ['a carrot', 'an egg', 'brown rice'], explain: 'One can of fizzy drink can hold nine spoons of sugar.', band: 'B' },
  { q: 'Too much sugar is bad for your…', a: 'teeth', pool: ['hair', 'ears', 'fingernails'], explain: 'Sugar feeds the germs that make holes in teeth.', band: 'A' },
  { q: 'Which part of a food label tells you what is inside it?', a: 'the ingredients list', pool: ['the barcode', 'the price', 'the picture'], explain: 'Ingredients are listed biggest amount first: sugar near the top means lots of sugar.', band: 'C' },
  { q: 'Bajan sweet potato, yam and breadfruit are mostly…', a: 'carbohydrates', pool: ['protein', 'dairy', 'fat'], explain: 'Ground provisions are starchy foods that give energy.', band: 'C' },
  { q: 'Why eat different coloured fruit and vegetables?', a: 'each colour has different vitamins', pool: ['it looks pretty', 'colours taste sweeter', 'no reason'], explain: 'Eat a rainbow: orange carrots, green spinach, purple grapes, red tomatoes.', band: 'C' }
];

// ---- Germ Zapper -------------------------------------------------------------------------------------------

export const HABITS = [
  { do: 'wash your hands with soap', pic: '🧼', when: 'before eating and after the toilet', good: true },
  { do: 'brush your teeth twice a day', pic: '🪥', when: 'morning and bedtime', good: true },
  { do: 'cough or sneeze into your elbow', pic: '🤧', when: 'whenever you cough or sneeze', good: true },
  { do: 'drink plenty of water', pic: '💧', when: 'all through the day', good: true },
  { do: 'use a tissue once and bin it', pic: '🧻', when: 'when your nose runs', good: true },
  { do: 'wash fruit before eating it', pic: '🍎', when: 'before every snack', good: true },
  { do: 'cover a cut with a clean plaster', pic: '🩹', when: 'when you get a scrape', good: true },
  { do: 'share a toothbrush', pic: '🪥', good: false, why: 'germs pass from mouth to mouth' },
  { do: 'bite your nails', pic: '💅', good: false, why: 'germs live under nails' },
  { do: 'eat food dropped on the floor', pic: '🍪', good: false, why: 'the floor is full of germs' },
  { do: 'rub your eyes with dirty hands', pic: '👀', good: false, why: 'germs get into the eyes' },
  { do: 'drink from a friend\'s cup', pic: '🥤', good: false, why: 'colds pass through spit' }
];
export const GERM_FACTS = [
  { q: 'How long should you wash your hands with soap?', a: 'about 20 seconds', pool: ['2 seconds', '2 minutes', 'an hour'], explain: 'Sing Happy Birthday twice: that is about 20 seconds.', band: 'A' },
  { q: 'Germs are…', a: 'tiny living things too small to see', pool: ['big green monsters', 'a kind of dirt', 'insects'], explain: 'Bacteria and viruses are so small you need a microscope.', band: 'A' },
  { q: 'What does a vaccine do?', a: 'teaches the body to fight a germ', pool: ['makes you sleepy', 'cleans your teeth', 'feeds you'], explain: 'A vaccine shows the body a harmless bit of a germ so it is ready for the real one.', band: 'B' },
  { q: 'Which germ causes a cold?', a: 'a virus', pool: ['a bacterium', 'a fungus', 'a worm'], explain: 'Colds are caused by viruses, so antibiotics do not help them.', band: 'C' },
  { q: 'Antibiotics kill…', a: 'bacteria', pool: ['viruses', 'all germs', 'nothing'], explain: 'Antibiotics fight bacteria, like the ones in an ear infection, but not viruses.', band: 'C' },
  { q: 'Who should give you medicine?', a: 'a grown-up you trust', pool: ['a friend', 'nobody', 'yourself'], explain: 'Medicine is only safe in the right amount, so a trusted grown-up gives it.', band: 'A' },
  { q: 'Mosquitoes in Barbados can spread…', a: 'dengue fever', pool: ['a cold', 'chickenpox', 'toothache'], explain: 'Empty standing water in pots and tyres so mosquitoes cannot breed.', band: 'B' },
  { q: 'Why do we cover our mouth when we cough?', a: 'to stop germs flying out', pool: ['to be polite only', 'to keep warm', 'to stop hiccups'], explain: 'A cough sprays tiny droplets full of germs across the room.', band: 'A' },
  { q: 'How often should you see the dentist?', a: 'about twice a year', pool: ['never', 'every day', 'once in your life'], explain: 'The dentist spots little holes before they become big ones.', band: 'B' },
  { q: 'What temperature is a healthy body, roughly?', a: '37 °C', pool: ['20 °C', '50 °C', '100 °C'], explain: 'A fever is when the body is hotter than about 38 °C.', band: 'C' },
  { q: 'What is the first thing to do for a small burn?', a: 'cool it under running water', pool: ['rub butter on it', 'pop the blister', 'ignore it'], explain: 'Cool water for ten minutes takes the heat out of the skin.', band: 'B' },
  { q: 'Which number calls an ambulance in Barbados?', a: '511', pool: ['911', '999', '211'], explain: 'In Barbados: 511 ambulance, 311 fire, 211 police.', band: 'B' },
  { q: 'A nosebleed: what should you do?', a: 'lean forward and pinch the soft part of the nose', pool: ['lean back', 'lie down flat', 'blow hard'], explain: 'Pinch for ten minutes and lean forward so blood does not run down the throat.', band: 'C' }
];
export const HELPERS = [
  { name: 'doctor', pic: '🩺', does: 'finds out what is wrong and how to fix it' },
  { name: 'nurse', pic: '💉', does: 'cares for patients and gives medicine' },
  { name: 'dentist', pic: '🦷', does: 'looks after teeth' },
  { name: 'pharmacist', pic: '💊', does: 'prepares and explains medicines' },
  { name: 'paramedic', pic: '🚑', does: 'gives first aid and drives the ambulance' },
  { name: 'optician', pic: '👓', does: 'tests eyes and makes glasses' }
];

// ---- Feel Good ---------------------------------------------------------------------------------------------

export const FEELINGS = [
  { name: 'happy', pic: '😀', when: 'a friend comes to play' }, { name: 'sad', pic: '😢', when: 'a pet is poorly' },
  { name: 'angry', pic: '😠', when: 'someone breaks your toy' }, { name: 'scared', pic: '😨', when: 'there is a big storm' },
  { name: 'surprised', pic: '😲', when: 'a party you did not know about' }, { name: 'tired', pic: '🥱', when: 'you stayed up too late' },
  { name: 'proud', pic: '😌', when: 'you finish something hard' }, { name: 'worried', pic: '😟', when: 'a test is coming' }
];
export const CALM_DOWNS = ['take five slow, deep breaths', 'tell a grown-up how you feel', 'count slowly to ten', 'go for a walk or a run', 'draw how you feel', 'hug someone you love'];
export const NOT_CALM = ['hit something', 'shout at a friend', 'hold your breath', 'hide it and say nothing'];
export const SLEEP_HOURS = [
  { who: 'a 4-year-old', hours: 'about 11', pool: ['about 4', 'about 6', 'about 16'] },
  { who: 'a 9-year-old', hours: 'about 10', pool: ['about 5', 'about 7', 'about 15'] },
  { who: 'a 13-year-old', hours: 'about 9', pool: ['about 4', 'about 6', 'about 14'] },
  { who: 'a grown-up', hours: 'about 8', pool: ['about 3', 'about 5', 'about 12'] }
];
export const ACTIVE = [
  { what: 'swimming', pic: '🏊', active: true }, { what: 'football', pic: '⚽', active: true }, { what: 'skipping', pic: '🪢', active: true },
  { what: 'dancing', pic: '💃', active: true }, { what: 'cycling', pic: '🚴', active: true }, { what: 'cricket', pic: '🏏', active: true },
  { what: 'watching TV all afternoon', pic: '📺', active: false }, { what: 'playing on a tablet for hours', pic: '📱', active: false }, { what: 'lying on the sofa', pic: '🛋️', active: false }
];
export const SAFETY = [
  { q: 'When you ride a bike you should wear…', a: 'a helmet', pool: ['a hat', 'sunglasses', 'nothing'], explain: 'A helmet protects the brain if you fall.', band: 'A' },
  { q: 'In the car, always…', a: 'wear a seat belt', pool: ['sit on the roof', 'open the door', 'stand up'], explain: 'A seat belt holds you safe if the car stops suddenly.', band: 'A' },
  { q: 'On a sunny day at the beach, put on…', a: 'sunscreen and a hat', pool: ['a coat', 'nothing', 'oil'], explain: 'The Bajan sun is strong; sunscreen stops burns and skin damage.', band: 'A' },
  { q: 'Before crossing the road…', a: 'stop, look and listen', pool: ['run fast', 'close your eyes', 'shout'], explain: 'Stop at the kerb, look both ways, listen, then walk across.', band: 'A' },
  { q: 'When swimming at the beach you should…', a: 'stay where a grown-up can see you', pool: ['swim out as far as you can', 'swim alone', 'swim at night'], explain: 'Swim with a grown-up watching, and never where the red flags fly.', band: 'B' },
  { q: 'A stranger online asks where you live. You should…', a: 'say no and tell a grown-up', pool: ['tell them', 'send a photo', 'keep it secret'], explain: 'Personal details stay private; a trusted grown-up should know.', band: 'B' },
  { q: 'If someone is choking and cannot breathe, you should…', a: 'shout for a grown-up at once', pool: ['give them water', 'wait and see', 'laugh'], explain: 'Get help fast; grown-ups know the back blows that clear the throat.', band: 'B' },
  { q: 'During a hurricane warning you should…', a: 'stay inside away from windows', pool: ['go to the beach', 'climb a tree', 'fly a kite'], explain: 'Hurricane season in Barbados is June to November; stay in and keep a torch handy.', band: 'C' },
  { q: 'How many minutes of exercise should children get a day?', a: 'about 60', pool: ['about 5', 'about 15', 'about 600'], explain: 'An hour of running, playing or sport, most days.', band: 'C' },
  { q: 'Screens before bed make it harder to…', a: 'fall asleep', pool: ['wake up', 'eat', 'read'], explain: 'Bright screens tell the brain it is still daytime.', band: 'C' }
];
