// Melody Market for Pre-K: touch-and-learn sets, one per game (scenes/minigames/TouchPlay.js). Each thing has a
// sound the scene plays when it is touched (systems/Audio.js's Music). Pure data.

export const MUSIC_PLAY_SETS = {
  'mus-rhythm': {
    title: 'Hit or shake?', intro: 'Touch a drum or a shaker to hear it!',
    targets: [
      { id: 'hit', pic: '🥁', name: 'things you hit', ask: 'Which one do you hit?' },
      { id: 'shake', pic: '🎶', name: 'things you shake', ask: 'Which one do you shake?' }
    ],
    items: [
      { pic: '🥁', name: 'big drum', target: 'hit', line: 'The big drum! BOOM. You hit it.', sound: { kind: 'rhythm', beats: ['boom', 'boom'], gap: 0.45 } },
      { pic: '🥁', name: 'bongos', target: 'hit', line: 'Bongos! Tak tak tak. You hit them with your hands.', sound: { kind: 'rhythm', beats: ['tak', 'tak', 'tak'], gap: 0.25 } },
      { pic: '🔺', name: 'triangle', target: 'hit', line: 'A triangle! Ding. You tap it.', sound: { kind: 'rhythm', beats: ['ding'], gap: 0.5 } },
      { pic: '🪘', name: 'tambourine', target: 'shake', line: 'A tambourine! Shh shh shh. You shake it.', sound: { kind: 'rhythm', beats: ['shake', 'shake', 'shake'], gap: 0.2 } },
      { pic: '🎶', name: 'shak-shaks', target: 'shake', line: 'Shak-shaks! Shake, shake. Seeds rattle inside.', sound: { kind: 'rhythm', beats: ['shake', 'shake', '-', 'shake', 'shake'], gap: 0.18 } },
      { pic: '🔔', name: 'cowbell', target: 'hit', line: 'A cowbell! Ding ding. You hit it with a stick.', sound: { kind: 'rhythm', beats: ['ding', 'ding'], gap: 0.35 } }
    ]
  },
  'mus-notes': {
    title: 'Long or short?', intro: 'Touch something to hear its sound!',
    targets: [
      { id: 'long', pic: '〰️', name: 'long sounds', ask: 'Which one makes a long sound?' },
      { id: 'short', pic: '▪️', name: 'short sounds', ask: 'Which one makes a short sound?' }
    ],
    items: [
      { pic: '🔔', name: 'bell', target: 'long', line: 'A bell! Dooong. A long sound.', sound: { kind: 'notes', notes: ['E5'], gap: 1.4, dur: 1.4 } },
      { pic: '🎻', name: 'violin', target: 'long', line: 'A violin! Its note sings on and on.', sound: { kind: 'notes', notes: ['A4'], gap: 1.6, dur: 1.6 } },
      { pic: '🎺', name: 'trumpet', target: 'long', line: 'A trumpet! Taaaa. A long, bright sound.', sound: { kind: 'notes', notes: ['G4'], gap: 1.4, dur: 1.4 } },
      { pic: '🥁', name: 'drum', target: 'short', line: 'A drum! Tak. A short sound.', sound: { kind: 'rhythm', beats: ['tak'], gap: 0.3 } },
      { pic: '👏', name: 'clap', target: 'short', line: 'A clap! Clap clap. Short sounds.', sound: { kind: 'rhythm', beats: ['tak', 'tak'], gap: 0.3 } },
      { pic: '🪵', name: 'woodblock', target: 'short', line: 'A woodblock! Tok. A short, hard sound.', sound: { kind: 'rhythm', beats: ['tak', '-', 'tak'], gap: 0.25 } }
    ]
  },
  'mus-pitch': {
    title: 'High or low?', intro: 'Touch an animal to hear if its sound is high or low!',
    targets: [
      { id: 'high', pic: '⬆️', name: 'high sounds', ask: 'Which one makes a high sound?' },
      { id: 'low', pic: '⬇️', name: 'low sounds', ask: 'Which one makes a low sound?' }
    ],
    items: [
      { pic: '🐦', name: 'bird', target: 'high', line: 'A bird! Tweet tweet. A high sound.', sound: { kind: 'notes', notes: ['C6', 'E5', 'C6'], gap: 0.18, dur: 0.15 } },
      { pic: '🐭', name: 'mouse', target: 'high', line: 'A mouse! Squeak! A high sound.', sound: { kind: 'notes', notes: ['B5', 'C6'], gap: 0.14, dur: 0.12 } },
      { pic: '🔔', name: 'little bell', target: 'high', line: 'A little bell! Ting. A high sound.', sound: { kind: 'notes', notes: ['G5'], gap: 0.8, dur: 0.8 } },
      { pic: '🐄', name: 'cow', target: 'low', line: 'A cow! Moooo. A low sound.', sound: { kind: 'notes', notes: ['D3', 'C3'], gap: 0.5, dur: 0.6 } },
      { pic: '🦁', name: 'lion', target: 'low', line: 'A lion! Roar. A low sound.', sound: { kind: 'notes', notes: ['C3'], gap: 0.9, dur: 0.9 } },
      { pic: '🎺', name: 'tuba', target: 'low', line: 'A tuba! Oom pah. A low sound.', sound: { kind: 'notes', notes: ['C3', 'G3'], gap: 0.45, dur: 0.4 } }
    ]
  },
  'mus-instruments': {
    title: 'Which family?', intro: 'Touch an instrument to hear how it is played!',
    targets: [
      { id: 'percussion', pic: '🥁', name: 'drums', ask: 'Which one is a drum?' },
      { id: 'strings', pic: '🎸', name: 'strings', ask: 'Which one has strings?' },
      { id: 'wind', pic: '🎺', name: 'blown', ask: 'Which one do you blow?' },
      { id: 'keys', pic: '🎹', name: 'keys', ask: 'Which one has keys to press?' }
    ],
    items: [
      { pic: '🥁', name: 'drum', target: 'percussion', line: 'A drum! You hit it. Boom boom.', sound: { kind: 'rhythm', beats: ['boom', 'boom'], gap: 0.4 } },
      { pic: '🎸', name: 'guitar', target: 'strings', line: 'A guitar! You strum its strings.', sound: { kind: 'notes', notes: ['C4', 'E4', 'G4', 'C5'], gap: 0.12, dur: 0.6 } },
      { pic: '🎻', name: 'violin', target: 'strings', line: 'A violin! You play its strings with a bow.', sound: { kind: 'notes', notes: ['A4', 'B4', 'C5'], gap: 0.5, dur: 0.6 } },
      { pic: '🎺', name: 'trumpet', target: 'wind', line: 'A trumpet! You blow into it. Ta-daa!', sound: { kind: 'notes', notes: ['G4', 'C5'], gap: 0.3, dur: 0.6 } },
      { pic: '🎷', name: 'saxophone', target: 'wind', line: 'A saxophone! You blow into it too.', sound: { kind: 'notes', notes: ['E4', 'G4', 'A4'], gap: 0.3, dur: 0.5 } },
      { pic: '🎹', name: 'piano', target: 'keys', line: 'A piano! You press its keys.', sound: { kind: 'notes', notes: ['C4', 'D4', 'E4', 'F4', 'G4'], gap: 0.2, dur: 0.35 } }
    ]
  }
};
