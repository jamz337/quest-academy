// Science Springs for Pre-K: touch-and-learn sets, one per game. Six things to touch; each is named and told
// about, then floats to its home panel. When all are home come a few gentle asks, answered by touching a thing
// in its panel. Pure data (see scenes/minigames/TouchPlay.js); the helpers every subject shares live in data/touchPlay.js.
import { targetOf, makePlayAsks, playFoundLine, playOtherLine } from '../touchPlay.js';

export { targetOf, makePlayAsks, playFoundLine, playOtherLine };

export const PLAY_SETS = {
  'sci-habitat': {
    title: 'Where do they live?', intro: 'Touch an animal to hear where it lives!',
    targets: [
      { id: 'ocean', pic: '🌊', name: 'the sea', ask: 'Which animal lives in the sea?' },
      { id: 'desert', pic: '🏜️', name: 'the desert', ask: 'Which animal lives in the hot desert?' },
      { id: 'polar', pic: '❄️', name: 'the ice', ask: 'Which animal lives on the ice?' },
      { id: 'forest', pic: '🌲', name: 'the woods', ask: 'Which animal lives in the woods?' }
    ],
    items: [
      { pic: '🐟', name: 'fish', target: 'ocean', line: 'A fish. It swims in the sea.' },
      { pic: '🐙', name: 'octopus', target: 'ocean', line: 'An octopus. It lives deep in the sea.' },
      { pic: '🐪', name: 'camel', target: 'desert', line: 'A camel. It lives in the hot, dry desert.' },
      { pic: '🦎', name: 'lizard', target: 'desert', line: 'A lizard. It warms itself on desert rocks.' },
      { pic: '🐧', name: 'penguin', target: 'polar', line: 'A penguin. It slides on the ice.' },
      { pic: '🦊', name: 'fox', target: 'forest', line: 'A fox. It lives in the woods.' }
    ]
  },
  'sci-plants': {
    title: 'What a plant needs', intro: 'Touch something to learn about plants!',
    targets: [
      { id: 'needs', pic: '🌱', name: 'what a plant needs', ask: 'Which one does a plant need to grow?' },
      { id: 'parts', pic: '🌸', name: 'parts of a plant', ask: 'Which one is a part of a plant?' }
    ],
    items: [
      { pic: '☀️', name: 'sunlight', target: 'needs', line: 'Sunlight! A plant uses sunlight to make its food.' },
      { pic: '💧', name: 'water', target: 'needs', line: 'Water! A plant drinks water through its roots.' },
      { pic: '🪴', name: 'soil', target: 'needs', line: 'Soil! A plant holds on with its roots in the soil.' },
      { pic: '🫚', name: 'roots', target: 'parts', line: 'Roots! They hold the plant and drink the water.' },
      { pic: '🍃', name: 'leaves', target: 'parts', line: 'Leaves! They catch the sunlight.' },
      { pic: '🌸', name: 'flower', target: 'parts', line: 'A flower! It makes the seeds.' }
    ]
  },
  'sci-float': {
    title: 'Sink or float?', intro: 'Touch something to drop it in the water!',
    targets: [
      { id: 'float', pic: '🛟', name: 'floats', ask: 'Which one floats?' },
      { id: 'sink', pic: '⬇️', name: 'sinks', ask: 'Which one sinks?' }
    ],
    items: [
      { pic: '🪨', name: 'rock', target: 'sink', line: 'A rock. Splash! It sinks.' },
      { pic: '🪵', name: 'wooden block', target: 'float', line: 'A wooden block. It floats!' },
      { pic: '🍎', name: 'apple', target: 'float', line: 'An apple. It bobs on top. It floats!' },
      { pic: '🔑', name: 'key', target: 'sink', line: 'A key. Down it goes. It sinks.' },
      { pic: '🦆', name: 'rubber duck', target: 'float', line: 'A rubber duck. It floats!' },
      { pic: '🪙', name: 'coin', target: 'sink', line: 'A coin. It sinks.' }
    ]
  },
  'sci-matter': {
    title: 'Solid, liquid or gas?', intro: 'Touch something to find out what it is!',
    targets: [
      { id: 'solid', pic: '🧊', name: 'solids', ask: 'Which one is a solid?' },
      { id: 'liquid', pic: '💧', name: 'liquids', ask: 'Which one is a liquid?' },
      { id: 'gas', pic: '💨', name: 'gases', ask: 'Which one is a gas?' }
    ],
    items: [
      { pic: '🧊', name: 'ice', target: 'solid', line: 'Ice. It is hard. It is a solid.' },
      { pic: '🪨', name: 'rock', target: 'solid', line: 'A rock. It keeps its shape. It is a solid.' },
      { pic: '💧', name: 'water', target: 'liquid', line: 'Water. It pours. It is a liquid.' },
      { pic: '🧃', name: 'juice', target: 'liquid', line: 'Juice. It pours into a cup. It is a liquid.' },
      { pic: '♨️', name: 'steam', target: 'gas', line: 'Steam. It floats away. It is a gas.' },
      { pic: '🎈', name: 'air in a balloon', target: 'gas', line: 'The air in a balloon. You cannot see it. It is a gas.' }
    ]
  }
};

export const playSet = (gameId) => PLAY_SETS[gameId] || PLAY_SETS['sci-habitat'];
