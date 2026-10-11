// The Hospital for Pre-K: touch-and-learn sets, one per game (scenes/minigames/TouchPlay.js). Pure data.

export const HEALTH_PLAY_SETS = {
  'hea-body': {
    title: 'My body', intro: 'Touch a part of the body to hear what it does!',
    targets: [
      { id: 'see', pic: '👀', name: 'seeing and hearing', ask: 'Which part do you see with?' },
      { id: 'move', pic: '🦵', name: 'moving', ask: 'Which part do you run with?' },
      { id: 'eat', pic: '👄', name: 'eating', ask: 'Which part do you chew with?' }
    ],
    items: [
      { pic: '👀', name: 'eyes', target: 'see', line: 'Eyes! You see with your eyes.' },
      { pic: '👂', name: 'ears', target: 'see', line: 'Ears! You hear with your ears.' },
      { pic: '🦵', name: 'legs', target: 'move', line: 'Legs! You run and jump with your legs.' },
      { pic: '💪', name: 'arms', target: 'move', line: 'Arms! You lift and carry with your arms.' },
      { pic: '🦷', name: 'teeth', target: 'eat', line: 'Teeth! You bite and chew with your teeth.' },
      { pic: '👅', name: 'tongue', target: 'eat', line: 'Tongue! You taste with your tongue.' }
    ]
  },
  'hea-plate': {
    title: 'Plate Planner', intro: 'Touch a food to hear if it is an every-day food or a sometimes food!',
    targets: [
      { id: 'everyday', pic: '🍎', name: 'every-day foods', ask: 'Which one is an every-day food?' },
      { id: 'sometimes', pic: '🍬', name: 'sometimes foods', ask: 'Which one is a sometimes food?' }
    ],
    items: [
      { pic: '🍎', name: 'apple', target: 'everyday', line: 'An apple! Crunchy fruit, full of goodness. An every-day food.' },
      { pic: '🥕', name: 'carrot', target: 'everyday', line: 'A carrot! Good for your eyes. An every-day food.' },
      { pic: '🥛', name: 'milk', target: 'everyday', line: 'Milk! Makes your bones strong. An every-day food.' },
      { pic: '🐟', name: 'fish', target: 'everyday', line: 'Fish! Builds your muscles. An every-day food.' },
      { pic: '🍬', name: 'sweets', target: 'sometimes', line: 'Sweets! Lots of sugar. A sometimes food.' },
      { pic: '🍩', name: 'doughnut', target: 'sometimes', line: 'A doughnut! Sugar and fat. A sometimes food.' }
    ]
  },
  'hea-germs': {
    title: 'Germ Zapper', intro: 'Touch something to hear if it zaps germs or spreads them!',
    targets: [
      { id: 'zap', pic: '🧼', name: 'germ zappers', ask: 'Which one zaps germs?' },
      { id: 'spread', pic: '🦠', name: 'germ spreaders', ask: 'Which one spreads germs?' }
    ],
    items: [
      { pic: '🧼', name: 'soap', target: 'zap', line: 'Soap! Wash your hands and the germs slide away.' },
      { pic: '🪥', name: 'toothbrush', target: 'zap', line: 'A toothbrush! Brush twice a day to zap tooth germs.' },
      { pic: '🧻', name: 'tissue', target: 'zap', line: 'A tissue! Catch the sneeze, then bin it.' },
      { pic: '🤧', name: 'sneeze in the air', target: 'spread', line: 'Atishoo! A sneeze in the air sprays germs everywhere. Use your elbow!' },
      { pic: '🍪', name: 'biscuit off the floor', target: 'spread', line: 'A biscuit off the floor! Floor germs stuck to it. Leave it!' },
      { pic: '👃', name: 'finger up the nose', target: 'spread', line: 'A finger up the nose! Germs get on your fingers. Use a tissue!' }
    ]
  },
  'hea-feel': {
    title: 'Feel Good', intro: 'Touch something to hear how it makes you feel!',
    targets: [
      { id: 'happy', pic: '😀', name: 'happy things', ask: 'Which one makes you feel happy?' },
      { id: 'rest', pic: '😴', name: 'rest and calm', ask: 'Which one helps you rest?' },
      { id: 'active', pic: '⚽', name: 'getting active', ask: 'Which one gets your body moving?' }
    ],
    items: [
      { pic: '🤗', name: 'hug', target: 'happy', line: 'A hug! Warm and happy.' },
      { pic: '🎈', name: 'party', target: 'happy', line: 'A party! Balloons and friends. Happy!' },
      { pic: '🛏️', name: 'bed', target: 'rest', line: 'Bed! A good sleep makes you strong for tomorrow.' },
      { pic: '🌬️', name: 'deep breath', target: 'rest', line: 'A deep breath! In… and out. Calm.' },
      { pic: '⚽', name: 'football', target: 'active', line: 'Football! Run and kick. Your heart beats faster.' },
      { pic: '🏊', name: 'swimming', target: 'active', line: 'Swimming! Splash and kick. Great for your whole body.' }
    ]
  }
};
