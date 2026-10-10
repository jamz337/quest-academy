// Science Springs: the facts the four games draw on, from Pre-K pictures to Grade 8 vocabulary. Pure data, no
// Phaser. Each table is written so a generator can turn it into picture questions for the youngest and worded
// questions for older players, with distractors drawn from the same table.

// ---- Habitat Match --------------------------------------------------------------------------------------------

/** Where animals live. `kids` is the Pre-K wording; `desc` the fuller description used from Grade 1. */
export const HABITATS = [
  { id: 'ocean', name: 'the ocean', pic: '🌊', kids: 'in the sea', desc: 'salty water that covers most of the Earth' },
  { id: 'desert', name: 'the desert', pic: '🏜️', kids: 'in the hot, dry desert', desc: 'dry land with very little rain, hot days and cold nights' },
  { id: 'rainforest', name: 'the rainforest', pic: '🌴', kids: 'in the wet, green rainforest', desc: 'hot, wet forest with more kinds of living things than anywhere else' },
  { id: 'polar', name: 'the icy poles', pic: '❄️', kids: 'on the ice and snow', desc: 'frozen lands and seas at the top and bottom of the world' },
  { id: 'savanna', name: 'the savanna', pic: '🌾', kids: 'on the wide grassland', desc: 'warm grassland with few trees, wet and dry seasons' },
  { id: 'pond', name: 'the pond', pic: '🪷', kids: 'by the pond', desc: 'still fresh water with reeds and lily pads' },
  { id: 'forest', name: 'the forest', pic: '🌲', kids: 'in the woods', desc: 'woodland with four seasons, where many trees drop their leaves' },
  { id: 'farm', name: 'the farm', pic: '🚜', kids: 'on the farm', desc: 'fields and barns where people keep animals' }
];

/**
 * Animals, their homes and one thing that helps them live there (`adapt`), with the kind of eater they are
 * (`eats`: plants | meat | both) for food-chain questions.
 */
export const ANIMALS = [
  { name: 'fish', pic: '🐟', habitat: 'ocean', adapt: 'gills to breathe under water', eats: 'both' },
  { name: 'whale', pic: '🐳', habitat: 'ocean', adapt: 'thick blubber to keep warm and a blowhole to breathe air', eats: 'meat' },
  { name: 'octopus', pic: '🐙', habitat: 'ocean', adapt: 'eight arms and a squirt of ink to escape', eats: 'meat' },
  { name: 'dolphin', pic: '🐬', habitat: 'ocean', adapt: 'a smooth body and a tail that pushes it fast through water', eats: 'meat' },
  { name: 'shark', pic: '🦈', habitat: 'ocean', adapt: 'rows of sharp teeth and a great sense of smell', eats: 'meat' },
  { name: 'crab', pic: '🦀', habitat: 'ocean', adapt: 'a hard shell and claws', eats: 'both' },
  { name: 'sea turtle', pic: '🐢', habitat: 'ocean', adapt: 'flippers for swimming and a shell for safety', eats: 'both' },
  { name: 'camel', pic: '🐪', habitat: 'desert', adapt: 'a hump that stores fat and long eyelashes against the sand', eats: 'plants' },
  { name: 'lizard', pic: '🦎', habitat: 'desert', adapt: 'scaly skin that keeps water in', eats: 'meat' },
  { name: 'snake', pic: '🐍', habitat: 'desert', adapt: 'resting in the shade by day and hunting at night', eats: 'meat' },
  { name: 'scorpion', pic: '🦂', habitat: 'desert', adapt: 'hiding under rocks away from the sun', eats: 'meat' },
  { name: 'fennec fox', pic: '🦊', habitat: 'desert', adapt: 'huge ears that let heat out', eats: 'both' },
  { name: 'monkey', pic: '🐒', habitat: 'rainforest', adapt: 'a long tail and strong arms for swinging through trees', eats: 'both' },
  { name: 'parrot', pic: '🦜', habitat: 'rainforest', adapt: 'a strong hooked beak for cracking nuts', eats: 'plants' },
  { name: 'jaguar', pic: '🐆', habitat: 'rainforest', adapt: 'spotted fur that hides it in the shadows', eats: 'meat' },
  { name: 'sloth', pic: '🦥', habitat: 'rainforest', adapt: 'moving slowly and hanging from branches with long claws', eats: 'plants' },
  { name: 'tree frog', pic: '🐸', habitat: 'rainforest', adapt: 'sticky toes for climbing wet leaves', eats: 'meat' },
  { name: 'butterfly', pic: '🦋', habitat: 'rainforest', adapt: 'a long tongue for sipping nectar from flowers', eats: 'plants' },
  { name: 'polar bear', pic: '🐻‍❄️', habitat: 'polar', adapt: 'thick white fur and a layer of fat', eats: 'meat' },
  { name: 'penguin', pic: '🐧', habitat: 'polar', adapt: 'waterproof feathers and huddling together for warmth', eats: 'meat' },
  { name: 'seal', pic: '🦭', habitat: 'polar', adapt: 'blubber under the skin and flippers for swimming', eats: 'meat' },
  { name: 'reindeer', pic: '🦌', habitat: 'polar', adapt: 'wide hooves for walking on snow', eats: 'plants' },
  { name: 'snowy owl', pic: '🦉', habitat: 'polar', adapt: 'white feathers that hide it in the snow', eats: 'meat' },
  { name: 'lion', pic: '🦁', habitat: 'savanna', adapt: 'sandy fur that hides it in the dry grass', eats: 'meat' },
  { name: 'giraffe', pic: '🦒', habitat: 'savanna', adapt: 'a long neck to reach the high leaves', eats: 'plants' },
  { name: 'elephant', pic: '🐘', habitat: 'savanna', adapt: 'a trunk for drinking, and big ears that fan it cool', eats: 'plants' },
  { name: 'zebra', pic: '🦓', habitat: 'savanna', adapt: 'stripes that confuse hunters in a running herd', eats: 'plants' },
  { name: 'cheetah', pic: '🐆', habitat: 'savanna', adapt: 'being the fastest runner on land', eats: 'meat' },
  { name: 'rhino', pic: '🦏', habitat: 'savanna', adapt: 'thick skin and a strong horn', eats: 'plants' },
  { name: 'ostrich', pic: '🪶', habitat: 'savanna', adapt: 'long legs that run fast instead of flying', eats: 'both' },
  { name: 'frog', pic: '🐸', habitat: 'pond', adapt: 'webbed feet and skin that breathes under water', eats: 'meat' },
  { name: 'duck', pic: '🦆', habitat: 'pond', adapt: 'webbed feet and waterproof feathers', eats: 'both' },
  { name: 'dragonfly', pic: '🪰', habitat: 'pond', adapt: 'four wings that hover and dart over the water', eats: 'meat' },
  { name: 'beaver', pic: '🦫', habitat: 'pond', adapt: 'big teeth for cutting trees and a flat tail for swimming', eats: 'plants' },
  { name: 'heron', pic: '🐦', habitat: 'pond', adapt: 'long legs for wading and a spear of a beak', eats: 'meat' },
  { name: 'goldfish', pic: '🐠', habitat: 'pond', adapt: 'gills and fins', eats: 'both' },
  { name: 'deer', pic: '🦌', habitat: 'forest', adapt: 'brown fur that hides it among the trees', eats: 'plants' },
  { name: 'owl', pic: '🦉', habitat: 'forest', adapt: 'big eyes for hunting at night and silent wings', eats: 'meat' },
  { name: 'fox', pic: '🦊', habitat: 'forest', adapt: 'sharp hearing and a bushy tail for warmth', eats: 'both' },
  { name: 'squirrel', pic: '🐿️', habitat: 'forest', adapt: 'storing nuts for the winter', eats: 'plants' },
  { name: 'bear', pic: '🐻', habitat: 'forest', adapt: 'sleeping through the winter (hibernating)', eats: 'both' },
  { name: 'rabbit', pic: '🐰', habitat: 'forest', adapt: 'long ears for listening and fast legs for running', eats: 'plants' },
  { name: 'hedgehog', pic: '🦔', habitat: 'forest', adapt: 'rolling into a ball of spines', eats: 'meat' },
  { name: 'woodpecker', pic: '🐦', habitat: 'forest', adapt: 'a strong beak that drums holes in bark for insects', eats: 'meat' },
  { name: 'cow', pic: '🐄', habitat: 'farm', adapt: 'four stomach parts for digesting grass', eats: 'plants' },
  { name: 'sheep', pic: '🐑', habitat: 'farm', adapt: 'a thick woolly coat', eats: 'plants' },
  { name: 'pig', pic: '🐷', habitat: 'farm', adapt: 'a strong snout for digging in the mud', eats: 'both' },
  { name: 'chicken', pic: '🐔', habitat: 'farm', adapt: 'scratching the ground with its feet to find seeds', eats: 'both' },
  { name: 'horse', pic: '🐴', habitat: 'farm', adapt: 'strong legs and hooves for running', eats: 'plants' },
  { name: 'goat', pic: '🐐', habitat: 'farm', adapt: 'sure feet for climbing rocky places', eats: 'plants' }
];
export const animalsIn = (habitatId) => ANIMALS.filter((a) => a.habitat === habitatId);
export const habitatOf = (animal) => HABITATS.find((h) => h.id === animal.habitat);

/** Food chains, in order from the sun: producer, then the eaters. Grades 4 and up. */
export const FOOD_CHAINS = [
  { where: 'savanna', links: [{ name: 'grass', pic: '🌾', role: 'producer' }, { name: 'zebra', pic: '🦓', role: 'herbivore' }, { name: 'lion', pic: '🦁', role: 'carnivore' }] },
  { where: 'ocean', links: [{ name: 'tiny plants (plankton)', pic: '🦠', role: 'producer' }, { name: 'small fish', pic: '🐟', role: 'herbivore' }, { name: 'shark', pic: '🦈', role: 'carnivore' }] },
  { where: 'pond', links: [{ name: 'water plants', pic: '🌿', role: 'producer' }, { name: 'tadpole', pic: '🐸', role: 'herbivore' }, { name: 'heron', pic: '🐦', role: 'carnivore' }] },
  { where: 'forest', links: [{ name: 'acorns', pic: '🌰', role: 'producer' }, { name: 'squirrel', pic: '🐿️', role: 'herbivore' }, { name: 'owl', pic: '🦉', role: 'carnivore' }] },
  { where: 'garden', links: [{ name: 'leaves', pic: '🍃', role: 'producer' }, { name: 'caterpillar', pic: '🐛', role: 'herbivore' }, { name: 'bird', pic: '🐦', role: 'carnivore' }] }
];
export const DECOMPOSERS = [{ name: 'mushrooms', pic: '🍄' }, { name: 'worms', pic: '🪱' }, { name: 'bacteria', pic: '🦠' }];

/** Words older players learn in Habitat Match, each with its meaning and an example (the choices for a word are other meanings). */
export const ECOLOGY_WORDS = [
  { word: 'habitat', means: 'the place where a living thing makes its home', example: 'a pond is a frog\'s habitat' },
  { word: 'adaptation', means: 'a body part or habit that helps a living thing survive', example: 'a camel\'s hump' },
  { word: 'camouflage', means: 'colours or patterns that hide an animal', example: 'the arctic fox\'s white winter coat' },
  { word: 'migration', means: 'moving to another place when the seasons change', example: 'birds flying south for winter' },
  { word: 'hibernation', means: 'a deep winter sleep that saves energy', example: 'a bear in its den' },
  { word: 'nocturnal', means: 'awake and active at night', example: 'an owl' },
  { word: 'producer', means: 'a living thing that makes its own food from sunlight', example: 'grass' },
  { word: 'consumer', means: 'a living thing that eats other living things', example: 'a zebra or a lion' },
  { word: 'decomposer', means: 'a living thing that breaks down dead plants and animals', example: 'mushrooms and worms' },
  { word: 'herbivore', means: 'an animal that eats only plants', example: 'a giraffe' },
  { word: 'carnivore', means: 'an animal that eats only other animals', example: 'a shark' },
  { word: 'omnivore', means: 'an animal that eats both plants and animals', example: 'a bear' },
  { word: 'ecosystem', means: 'the living things of a place with its water, soil and air', example: 'a coral reef' },
  { word: 'biome', means: 'a huge area with its own climate and living things', example: 'the desert' },
  { word: 'food chain', means: 'who eats whom, in order, starting with a producer', example: 'grass, zebra, lion' },
  { word: 'predator', means: 'an animal that hunts other animals', example: 'a cheetah' },
  { word: 'prey', means: 'an animal that is hunted and eaten', example: 'a rabbit' },
  { word: 'extinct', means: 'gone for ever, with none left alive', example: 'the dinosaurs' }
];

/** Biome facts for Grades 6-8: each a true statement with the biome it describes. */
export const BIOME_FACTS = [
  { biome: 'rainforest', fact: 'hot and wet all year, and home to more kinds of living things than any other land biome' },
  { biome: 'desert', fact: 'gets less than 25 centimetres of rain in a year' },
  { biome: 'tundra', fact: 'has frozen ground (permafrost) and only a short, cool summer' },
  { biome: 'savanna', fact: 'is warm grassland with a wet season and a dry season' },
  { biome: 'temperate forest', fact: 'has four clear seasons, and most of its trees drop their leaves in autumn' },
  { biome: 'ocean', fact: 'covers about seven tenths of the Earth\'s surface' },
  { biome: 'coral reef', fact: 'is built by tiny animals in warm, shallow, sunny seas' },
  { biome: 'wetland', fact: 'is land soaked with water for much of the year, filtering the water that flows through it' }
];

// ---- Plant Power -----------------------------------------------------------------------------------------------

export const PLANT_NEEDS = [
  { name: 'sunlight', pic: '☀️', why: 'to make its food' },
  { name: 'water', pic: '💧', why: 'to carry food around and stay firm' },
  { name: 'air', pic: '💨', why: 'for the carbon dioxide its leaves breathe in' },
  { name: 'soil', pic: '🪴', why: 'to hold its roots and give it minerals' }
];
export const NOT_PLANT_NEEDS = [{ name: 'milk', pic: '🥛' }, { name: 'a blanket', pic: '🧣' }, { name: 'sweets', pic: '🍬' }, { name: 'a television', pic: '📺' }, { name: 'shoes', pic: '👟' }, { name: 'pizza', pic: '🍕' }];

export const PLANT_PARTS = [
  { name: 'roots', pic: '🫚', job: 'take in water from the soil and hold the plant in place' },
  { name: 'stem', pic: '🎋', job: 'carries water up to the leaves and holds the plant up' },
  { name: 'leaves', pic: '🍃', job: 'make food for the plant using sunlight' },
  { name: 'flower', pic: '🌸', job: 'makes seeds, and attracts bees with colour and scent' },
  { name: 'fruit', pic: '🍎', job: 'protects the seeds inside it' },
  { name: 'seed', pic: '🌰', job: 'grows into a brand-new plant' }
];

/** The life cycle in order. */
export const LIFE_CYCLE = [
  { name: 'seed', pic: '🌰', tells: 'A seed waits in the soil.' },
  { name: 'sprout', pic: '🌱', tells: 'With water and warmth the seed sprouts: a root goes down and a shoot comes up.' },
  { name: 'young plant', pic: '🪴', tells: 'Leaves open and start making food from sunlight.' },
  { name: 'flower', pic: '🌻', tells: 'The grown plant makes flowers.' },
  { name: 'fruit with seeds', pic: '🍎', tells: 'Pollinated flowers turn into fruit, with new seeds inside.' }
];

/** How seeds travel. */
export const SEED_TRAVEL = [
  { how: 'the wind', pic: '💨', plant: 'dandelion', plantPic: '🌼', because: 'its seeds have fluffy parachutes' },
  { how: 'animals', pic: '🐦', plant: 'berry bush', plantPic: '🫐', because: 'birds eat the berries and drop the seeds far away' },
  { how: 'water', pic: '🌊', plant: 'coconut palm', plantPic: '🥥', because: 'coconuts float across the sea' },
  { how: 'sticking to fur', pic: '🐕', plant: 'burdock', plantPic: '🌿', because: 'its hooked burrs catch on passing animals' },
  { how: 'bursting open', pic: '💥', plant: 'pea pod', plantPic: '🫛', because: 'the dry pod pops and flings the seeds out' }
];

/** Worded plant facts for Grades 4-8: a statement with a blank-free question and its answer; distractors come from `pool`. */
export const PLANT_FACTS = [
  { q: 'What gas do leaves take in from the air to make food?', a: 'carbon dioxide', pool: ['oxygen', 'helium', 'steam'], explain: 'Leaves take in carbon dioxide through tiny holes; with water and light they make sugar, and give out oxygen.', band: 'B' },
  { q: 'What gas do plants give out when they make food?', a: 'oxygen', pool: ['carbon dioxide', 'smoke', 'helium'], explain: 'Photosynthesis makes sugar for the plant and oxygen for the air we breathe.', band: 'B' },
  { q: 'What is the name for the way plants make food from sunlight?', a: 'photosynthesis', pool: ['digestion', 'pollination', 'germination'], explain: '"Photo" means light and "synthesis" means making: plants make food using light.', band: 'B' },
  { q: 'What makes leaves green and catches the sunlight?', a: 'chlorophyll', pool: ['sap', 'pollen', 'bark'], explain: 'Chlorophyll is the green chemical in leaves that soaks up light energy.', band: 'B' },
  { q: 'What do we call pollen moving from one flower to another?', a: 'pollination', pool: ['germination', 'photosynthesis', 'hibernation'], explain: 'Bees, butterflies and the wind carry pollen between flowers, so the flowers can make seeds.', band: 'B' },
  { q: 'What do we call a seed starting to grow?', a: 'germination', pool: ['pollination', 'evaporation', 'migration'], explain: 'A seed germinates when it has water, warmth and air: the root pushes down and the shoot pushes up.', band: 'B' },
  { q: 'Which three things does a seed need to germinate?', a: 'water, warmth and air', pool: ['light, music and soil', 'sugar, salt and sand', 'shade, cold and stones'], explain: 'A seed does not need light to sprout; it needs water, warmth and air. It needs light once its leaves open.', band: 'B' },
  { q: 'Where is food made in a plant?', a: 'in the leaves', pool: ['in the roots', 'in the flowers', 'in the seeds'], explain: 'Leaves are the plant\'s kitchen: they catch light and make sugar.', band: 'B' },
  { q: 'Which part of a carrot plant do we eat?', a: 'the root', pool: ['the leaf', 'the flower', 'the seed'], explain: 'A carrot is a root that stores food for the plant.', band: 'B' },
  { q: 'Which part of an apple tree is the apple?', a: 'the fruit', pool: ['the root', 'the stem', 'the leaf'], explain: 'A fruit grows from a pollinated flower and holds the seeds.', band: 'B' },
  { q: 'Which plant part do bees visit to collect nectar?', a: 'the flower', pool: ['the root', 'the stem', 'the seed'], explain: 'Flowers make sweet nectar to draw bees, which carry pollen as they go.', band: 'B' },
  { q: 'A tree that drops all its leaves in autumn is called…', a: 'deciduous', pool: ['evergreen', 'tropical', 'aquatic'], explain: 'Deciduous trees drop their leaves for winter; evergreens keep theirs all year.', band: 'B' },
  { q: 'What carries water from the roots up to the leaves?', a: 'xylem tubes in the stem', pool: ['phloem tubes in the stem', 'the petals', 'the bark'], explain: 'Xylem carries water up; phloem carries the sugar made in the leaves to the rest of the plant.', band: 'C' },
  { q: 'What carries sugar from the leaves to the rest of the plant?', a: 'phloem', pool: ['xylem', 'chlorophyll', 'stomata'], explain: 'Phloem tubes move the food the leaves make down to roots, flowers and fruit.', band: 'C' },
  { q: 'What are the tiny holes in a leaf that let gases in and out called?', a: 'stomata', pool: ['pores of bark', 'petals', 'roots'], explain: 'Stomata open to let carbon dioxide in and oxygen and water vapour out.', band: 'C' },
  { q: 'What do we call water vapour leaving a plant through its leaves?', a: 'transpiration', pool: ['condensation', 'germination', 'precipitation'], explain: 'Transpiration pulls water up from the roots like a drinking straw.', band: 'C' },
  { q: 'Which word equation shows photosynthesis?', a: 'carbon dioxide + water → sugar + oxygen (using light)', pool: ['sugar + oxygen → carbon dioxide + water (using light)', 'water + oxygen → carbon dioxide + sugar', 'soil + water → leaves + flowers'], explain: 'Light energy joins carbon dioxide and water into sugar, and oxygen is left over.', band: 'C' },
  { q: 'Why do plants need nitrogen and other minerals from the soil?', a: 'to build proteins and healthy leaves', pool: ['to make sunlight', 'to turn green at night', 'to grow fruit without flowers'], explain: 'Minerals from the soil are the building blocks; sunlight is the energy.', band: 'C' },
  { q: 'What is the male part of a flower that makes pollen?', a: 'the stamen', pool: ['the stigma', 'the sepal', 'the root cap'], explain: 'Stamens make pollen; the stigma catches it so seeds can form in the ovary.', band: 'C' },
  { q: 'Which plants make seeds inside cones instead of flowers?', a: 'conifers, such as pine trees', pool: ['grasses', 'daisies', 'apple trees'], explain: 'Conifers keep their seeds in cones; flowering plants keep theirs in fruit.', band: 'C' }
];

// ---- Sink or Float ---------------------------------------------------------------------------------------------

/** Things dropped in water. `floats` is the answer; `why` the reason in children's words. */
export const OBJECTS = [
  { name: 'rock', pic: '🪨', floats: false, why: 'it is heavy for its size' },
  { name: 'wooden block', pic: '🪵', floats: true, why: 'wood is light for its size' },
  { name: 'apple', pic: '🍎', floats: true, why: 'an apple has lots of tiny air pockets inside' },
  { name: 'coin', pic: '🪙', floats: false, why: 'metal is heavy for its size' },
  { name: 'leaf', pic: '🍃', floats: true, why: 'it is light and wide' },
  { name: 'key', pic: '🔑', floats: false, why: 'it is solid metal' },
  { name: 'rubber duck', pic: '🦆', floats: true, why: 'it is full of air' },
  { name: 'ice cube', pic: '🧊', floats: true, why: 'ice is a little lighter than the same amount of water' },
  { name: 'nail', pic: '🔩', floats: false, why: 'it is solid metal' },
  { name: 'cork', pic: '🍾', floats: true, why: 'cork is very light for its size' },
  { name: 'feather', pic: '🪶', floats: true, why: 'it is very light' },
  { name: 'marble', pic: '🔮', floats: false, why: 'glass is heavy for its size' },
  { name: 'banana', pic: '🍌', floats: true, why: 'it is light for its size' },
  { name: 'grape', pic: '🍇', floats: false, why: 'a grape is a little heavier than the same amount of water' },
  { name: 'metal spoon', pic: '🥄', floats: false, why: 'it is solid metal' },
  { name: 'pencil', pic: '✏️', floats: true, why: 'it is mostly wood' },
  { name: 'sponge', pic: '🧽', floats: true, why: 'it is full of air holes' },
  { name: 'crayon', pic: '🖍️', floats: false, why: 'wax crayons are heavier than water for their size' },
  { name: 'toy boat', pic: '⛵', floats: true, why: 'its shape pushes aside lots of water' },
  { name: 'egg', pic: '🥚', floats: false, why: 'it is a little heavier than fresh water' },
  { name: 'beach ball', pic: '🏖️', floats: true, why: 'it is full of air' },
  { name: 'bottle of oil', pic: '🫙', floats: true, why: 'oil is lighter than water' },
  { name: 'golf ball', pic: '⛳', floats: false, why: 'it is solid and heavy for its size' },
  { name: 'empty plastic bottle with its lid on', pic: '🧴', floats: true, why: 'it is full of air' },
  { name: 'orange', pic: '🍊', floats: true, why: 'its peel is full of tiny air pockets (peeled, it sinks)' },
  { name: 'paper boat', pic: '📄', floats: true, why: 'it is light and spreads across the water' },
  { name: 'horseshoe', pic: '🧲', floats: false, why: 'it is solid iron' },
  { name: 'tennis ball', pic: '🎾', floats: true, why: 'it is full of air' }
];

/** Why things float, for Grades 4-8 (density and buoyancy). */
export const FLOAT_FACTS = [
  { q: 'Something floats in water when it is…', a: 'less dense than water', pool: ['bigger than a cup', 'made of metal', 'heavier than a brick'], explain: 'Density is how much stuff is packed into a space. Less dense than water: floats. More dense: sinks.', band: 'B' },
  { q: 'Why does a huge steel ship float?', a: 'a hollow hull full of air makes it less dense than water', pool: ['steel is lighter than water', 'the sea pushes it up with wind', 'it is painted'], explain: 'A solid lump of steel sinks, but spread into a hollow hull it pushes aside a lot of water and floats.', band: 'B' },
  { q: 'An egg sinks in tap water. What happens in very salty water?', a: 'it floats, because salt water is denser', pool: ['it sinks faster', 'it dissolves', 'nothing changes'], explain: 'Dissolving salt makes the water denser, so it pushes up harder on the egg.', band: 'B' },
  { q: 'What is the upward push of water on an object called?', a: 'buoyancy (the buoyant force)', pool: ['gravity', 'friction', 'magnetism'], explain: 'Water pushes up on anything in it. If that push is as big as the object\'s weight, the object floats.', band: 'B' },
  { q: 'A ball of clay sinks. How could you make the same clay float?', a: 'shape it into a wide bowl so it pushes aside more water', pool: ['squash it into a tighter ball', 'make it heavier', 'add salt to the clay'], explain: 'Changing the shape changes how much water it pushes aside, not how heavy it is.', band: 'B' },
  { q: 'Oil floats on water because…', a: 'oil is less dense than water', pool: ['oil is warmer', 'water is sticky', 'oil is a solid'], explain: 'A litre of oil weighs less than a litre of water, so it rides on top.', band: 'B' },
  { q: 'Which has the greatest density?', a: 'a steel nail', pool: ['a cork', 'an ice cube', 'a wooden spoon'], explain: 'Steel packs a lot of mass into a small space: about 7.8 grams in every cubic centimetre.', band: 'B' },
  { q: 'Density is…', a: 'mass divided by volume', pool: ['mass times volume', 'weight minus size', 'how big something is'], explain: 'Density = mass ÷ volume, often in grams per cubic centimetre (g/cm³).', band: 'C' },
  { q: 'Water has a density of about 1 g/cm³. A block with a density of 0.6 g/cm³ will…', a: 'float, with about six tenths of it under water', pool: ['sink to the bottom', 'float completely out of the water', 'hover in the middle'], explain: 'Less dense than water, so it floats; the fraction under water equals its density compared with water: 0.6.', band: 'C' },
  { q: 'A block has a mass of 200 g and a volume of 100 cm³. Will it float in water?', a: 'no, its density is 2 g/cm³, more than water', pool: ['yes, its density is 0.5 g/cm³', 'yes, because 200 is bigger than 100', 'only if it is wooden'], explain: 'Density = 200 ÷ 100 = 2 g/cm³. That is twice water\'s density, so it sinks.', band: 'C' },
  { q: 'Archimedes\' principle says the buoyant force on an object equals…', a: 'the weight of the water the object pushes aside', pool: ['the weight of the object', 'the depth of the water', 'the object\'s volume in litres'], explain: 'Push aside more water and the water pushes back harder. A ship pushes aside its whole weight in water.', band: 'C' },
  { q: 'How does a submarine dive and rise?', a: 'it takes water into tanks to sink and blows it out to rise', pool: ['it spins propellers downwards', 'it gets smaller', 'it drops its anchor'], explain: 'Changing how much water is in its tanks changes the submarine\'s overall density.', band: 'C' },
  { q: 'Ice floats on water because, as water freezes, it…', a: 'expands and becomes less dense', pool: ['shrinks and becomes heavier', 'turns into salt', 'loses its mass'], explain: 'Ice is about 9% less dense than liquid water, so about a tenth of an iceberg shows above the sea.', band: 'C' },
  { q: 'Why is it easier to float in the Dead Sea than in a swimming pool?', a: 'its water is extremely salty, so it is much denser', pool: ['it is warmer', 'it is deeper', 'it has no waves'], explain: 'The Dead Sea is about ten times saltier than the ocean; the dense water pushes up strongly on a swimmer.', band: 'C' }
];

// ---- States of Matter -----------------------------------------------------------------------------------------

export const STATES = [
  { id: 'solid', name: 'solid', pic: '🧊', keeps: 'keeps its own shape', particles: 'packed tightly together, only wobbling in place' },
  { id: 'liquid', name: 'liquid', pic: '💧', keeps: 'takes the shape of its container but keeps its amount', particles: 'close together but able to slide past one another' },
  { id: 'gas', name: 'gas', pic: '💨', keeps: 'spreads out to fill all the space it is given', particles: 'far apart and zooming about' }
];

export const MATTER_ITEMS = [
  { name: 'ice', pic: '🧊', state: 'solid' }, { name: 'water', pic: '💧', state: 'liquid' }, { name: 'steam', pic: '♨️', state: 'gas' },
  { name: 'rock', pic: '🪨', state: 'solid' }, { name: 'juice', pic: '🧃', state: 'liquid' }, { name: 'the air in a balloon', pic: '🎈', state: 'gas' },
  { name: 'milk', pic: '🥛', state: 'liquid' }, { name: 'wooden block', pic: '🪵', state: 'solid' }, { name: 'honey', pic: '🍯', state: 'liquid' },
  { name: 'book', pic: '📖', state: 'solid' }, { name: 'the air in bubbles', pic: '🫧', state: 'gas' }, { name: 'metal spoon', pic: '🥄', state: 'solid' },
  { name: 'rain', pic: '🌧️', state: 'liquid' }, { name: 'brick', pic: '🧱', state: 'solid' }, { name: 'the air we breathe out', pic: '😮‍💨', state: 'gas' },
  { name: 'cooking oil', pic: '🫙', state: 'liquid' }, { name: 'snowman', pic: '⛄', state: 'solid' }, { name: 'soup', pic: '🍲', state: 'liquid' },
  { name: 'apple', pic: '🍎', state: 'solid' }, { name: 'the smell of baking spreading through a house', pic: '🥐', state: 'gas' }
];

/** Changes of state: from one state to another, with its name and an everyday example. */
export const CHANGES = [
  { from: 'solid', to: 'liquid', name: 'melting', pic: '🧊➡️💧', example: 'an ice lolly dripping in the sun', needs: 'heat' },
  { from: 'liquid', to: 'solid', name: 'freezing', pic: '💧➡️🧊', example: 'water turning to ice in the freezer', needs: 'cold' },
  { from: 'liquid', to: 'gas', name: 'evaporation', pic: '💧➡️💨', example: 'a puddle drying up on a sunny day', needs: 'heat' },
  { from: 'gas', to: 'liquid', name: 'condensation', pic: '💨➡️💧', example: 'drops forming on the outside of a cold glass', needs: 'cold' },
  { from: 'liquid', to: 'gas', name: 'boiling', pic: '🫖', example: 'bubbles of steam rising fast in a kettle', needs: 'heat' },
  { from: 'solid', to: 'gas', name: 'sublimation', pic: '🧊➡️💨', example: 'dry ice turning straight into fog', needs: 'heat' }
];

export const MATTER_FACTS = [
  { q: 'At what temperature does water freeze?', a: '0 °C (32 °F)', pool: ['100 °C (212 °F)', '50 °C', '-100 °C'], explain: 'Water freezes to ice at 0 degrees Celsius, which is 32 degrees Fahrenheit.', band: 'B' },
  { q: 'At what temperature does water boil?', a: '100 °C (212 °F)', pool: ['0 °C (32 °F)', '37 °C', '1000 °C'], explain: 'At sea level water boils at 100 degrees Celsius, 212 Fahrenheit.', band: 'B' },
  { q: 'What happens to the particles in a solid when it is heated until it melts?', a: 'they gain energy and start to slide past one another', pool: ['they disappear', 'they get colder', 'they stop moving'], explain: 'Heat gives particles energy; in a liquid they are still close but can slide about.', band: 'B' },
  { q: 'Which state of matter has particles that are far apart and moving fast?', a: 'gas', pool: ['solid', 'liquid', 'all three'], explain: 'Gas particles zoom about freely, which is why a gas spreads out to fill any space.', band: 'B' },
  { q: 'Which can be squashed into a smaller space easily?', a: 'a gas', pool: ['a solid', 'a liquid', 'none of them'], explain: 'Gas particles have lots of empty space between them, so a gas can be compressed; solids and liquids hardly at all.', band: 'B' },
  { q: 'In the water cycle, what forms when water vapour cools high in the sky?', a: 'clouds (condensation)', pool: ['ice cubes', 'steam', 'oceans'], explain: 'Water evaporates, rises, cools and condenses into tiny drops: a cloud. Then it falls as rain or snow.', band: 'B' },
  { q: 'Which is NOT a state of matter?', a: 'energy', pool: ['solid', 'liquid', 'gas'], explain: 'Matter is anything that takes up space and has mass. Energy is not stuff; it is what makes stuff move and change.', band: 'B' },
  { q: 'What do we call the temperature at which a solid turns into a liquid?', a: 'its melting point', pool: ['its boiling point', 'its freezing cost', 'its density'], explain: 'Every pure substance has its own melting point. For ice it is 0 °C; for iron, about 1,538 °C.', band: 'C' },
  { q: 'Why does a puddle dry faster on a warm, windy day?', a: 'warmth speeds the particles and wind carries the vapour away', pool: ['wind pushes the water into the ground', 'warm water is heavier', 'the sun soaks it up like a sponge'], explain: 'Evaporation happens at the surface; heat and moving air both speed it up.', band: 'C' },
  { q: 'Frost forming on a cold window is an example of…', a: 'deposition: water vapour turning straight into ice', pool: ['melting', 'boiling', 'sublimation'], explain: 'Deposition is the reverse of sublimation: gas straight to solid, skipping the liquid.', band: 'C' },
  { q: 'When you heat a sealed balloon, it swells because…', a: 'the gas particles move faster and push harder on the inside', pool: ['new gas is made', 'the rubber melts', 'the air becomes a liquid'], explain: 'Heating a gas makes its particles move faster, so they hit the walls harder and more often.', band: 'C' },
  { q: 'Which is a physical change rather than a chemical change?', a: 'ice melting into water', pool: ['wood burning to ash', 'iron rusting', 'a cake baking'], explain: 'In a physical change the substance stays the same stuff, just in a different state. Burning, rusting and baking make new substances.', band: 'C' },
  { q: 'Most substances get denser when they freeze. Water is unusual because…', a: 'ice takes up more space than the water it came from', pool: ['ice is heavier than water', 'water never freezes fully', 'ice has no particles'], explain: 'Water molecules lock into an open pattern as ice, so it expands and floats. Pipes can burst for this reason.', band: 'C' },
  { q: 'What is the fourth state of matter found in stars and lightning?', a: 'plasma', pool: ['foam', 'steam', 'jelly'], explain: 'Plasma is a gas so hot that its particles have lost electrons. The Sun is mostly plasma.', band: 'C' }
];
