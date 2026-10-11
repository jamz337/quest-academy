// Studio Summit for Pre-K: touch-and-learn sets, one per game (scenes/minigames/TouchPlay.js). Pure data.

export const ART_PLAY_SETS = {
  'art-colours': {
    title: 'What colour?', intro: 'Touch something to hear its colour!',
    targets: [
      { id: 'red', pic: '🔴', name: 'red things', ask: 'Which one is red?' },
      { id: 'yellow', pic: '🟡', name: 'yellow things', ask: 'Which one is yellow?' },
      { id: 'blue', pic: '🔵', name: 'blue things', ask: 'Which one is blue?' },
      { id: 'green', pic: '🟢', name: 'green things', ask: 'Which one is green?' }
    ],
    items: [
      { pic: '🍓', name: 'strawberry', target: 'red', line: 'A strawberry! It is red.' },
      { pic: '🚒', name: 'fire engine', target: 'red', line: 'A fire engine! It is red.' },
      { pic: '🍌', name: 'banana', target: 'yellow', line: 'A banana! It is yellow.' },
      { pic: '☀️', name: 'sun', target: 'yellow', line: 'The sun! It is yellow.' },
      { pic: '🐳', name: 'whale', target: 'blue', line: 'A whale! It is blue.' },
      { pic: '🐸', name: 'frog', target: 'green', line: 'A frog! It is green.' }
    ]
  },
  'art-symmetry': {
    title: 'Same both sides?', intro: 'Touch something to see if its two sides match!',
    targets: [
      { id: 'same', pic: '🦋', name: 'same both sides', ask: 'Which one is the same on both sides?' },
      { id: 'different', pic: '🐟', name: 'different sides', ask: 'Which one has two different sides?' }
    ],
    items: [
      { pic: '🦋', name: 'butterfly', target: 'same', line: 'A butterfly! Both wings match. Same on both sides!' },
      { pic: '❤️', name: 'heart', target: 'same', line: 'A heart! Fold it down the middle and the halves match.' },
      { pic: '⭐', name: 'star', target: 'same', line: 'A star! The same on both sides.' },
      { pic: '🐟', name: 'fish', target: 'different', line: 'A fish! Its head is at one end and its tail at the other. Different sides!' },
      { pic: '🚩', name: 'flag', target: 'different', line: 'A flag! The pole is on one side only. Different sides!' },
      { pic: '🥾', name: 'boot', target: 'different', line: 'A boot! The toe points one way. Different sides!' }
    ]
  },
  'art-shapes': {
    title: 'Round, pointy or square?', intro: 'Touch something to hear its shape!',
    targets: [
      { id: 'round', pic: '🔵', name: 'round', ask: 'Which one is round?' },
      { id: 'pointy', pic: '🔺', name: 'pointy', ask: 'Which one is pointy, like a triangle?' },
      { id: 'square', pic: '🟥', name: 'square', ask: 'Which one is square?' }
    ],
    items: [
      { pic: '⚽', name: 'ball', target: 'round', line: 'A ball! Round all over. It rolls.' },
      { pic: '🍊', name: 'orange', target: 'round', line: 'An orange! Round like a ball.' },
      { pic: '🍕', name: 'pizza slice', target: 'pointy', line: 'A slice of pizza! Pointy, like a triangle.' },
      { pic: '🍦', name: 'ice cream cone', target: 'pointy', line: 'An ice cream cone! Pointy at the bottom.' },
      { pic: '🎲', name: 'dice', target: 'square', line: 'A dice! Every side is a square.' },
      { pic: '📦', name: 'box', target: 'square', line: 'A box! Flat sides and square corners.' }
    ]
  },
  'art-gallery': {
    title: 'Draw or build?', intro: 'Touch a tool to hear what artists do with it!',
    targets: [
      { id: 'draw', pic: '🖌️', name: 'drawing and painting', ask: 'Which one do you paint or draw with?' },
      { id: 'build', pic: '✂️', name: 'cutting and building', ask: 'Which one do you cut or build with?' }
    ],
    items: [
      { pic: '🖌️', name: 'paintbrush', target: 'draw', line: 'A paintbrush! Dip it in paint and swish.' },
      { pic: '🖍️', name: 'crayon', target: 'draw', line: 'A crayon! Colour with it.' },
      { pic: '✏️', name: 'pencil', target: 'draw', line: 'A pencil! Draw with it.' },
      { pic: '✂️', name: 'scissors', target: 'build', line: 'Scissors! Cut paper with them.' },
      { pic: '🏺', name: 'clay', target: 'build', line: 'Clay! Squash it and shape it into a pot.' },
      { pic: '🧴', name: 'glue', target: 'build', line: 'Glue! Stick the pieces together.' }
    ]
  }
};
