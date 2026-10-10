// History Harbor for Pre-K: touch-and-learn sets, one per game (see scenes/minigames/TouchPlay.js). Pure data.

export const HISTORY_PLAY_SETS = {
  'his-compass': {
    title: 'Which way?', intro: 'Touch something to find its direction!',
    targets: [
      { id: 'north', pic: '⬆️', name: 'north', ask: 'Which one is up north?' },
      { id: 'south', pic: '⬇️', name: 'south', ask: 'Which one is down south?' },
      { id: 'east', pic: '➡️', name: 'east', ask: 'Which one is in the east?' },
      { id: 'west', pic: '⬅️', name: 'west', ask: 'Which one is in the west?' }
    ],
    items: [
      { pic: '🌅', name: 'sunrise', target: 'east', line: 'Sunrise! The sun comes up in the east.' },
      { pic: '🌇', name: 'sunset', target: 'west', line: 'Sunset! The sun goes down in the west.' },
      { pic: '🧭', name: 'compass', target: 'north', line: 'A compass! Its needle always points north.' },
      { pic: '🐻‍❄️', name: 'polar bear', target: 'north', line: 'A polar bear! It lives far up north, on the ice.' },
      { pic: '🐧', name: 'penguin', target: 'south', line: 'A penguin! It lives far down south.' },
      { pic: '🗺️', name: 'map', target: 'north', line: 'A map! The top of a map is north.' }
    ]
  },
  'his-helpers': {
    title: 'Who works where?', intro: 'Touch a helper to hear what they do!',
    targets: [
      { id: 'hospital', pic: '🏥', name: 'the hospital', ask: 'Who works at the hospital?' },
      { id: 'fire', pic: '🚒', name: 'the fire station', ask: 'Who works at the fire station?' },
      { id: 'school', pic: '🏫', name: 'the school', ask: 'Who works at the school?' },
      { id: 'post', pic: '🏤', name: 'the post office', ask: 'Who works at the post office?' }
    ],
    items: [
      { pic: '👩‍⚕️', name: 'doctor', target: 'hospital', line: 'A doctor! Doctors help you get better.' },
      { pic: '🧑‍⚕️', name: 'nurse', target: 'hospital', line: 'A nurse! Nurses look after people in hospital.' },
      { pic: '👨‍🚒', name: 'firefighter', target: 'fire', line: 'A firefighter! Firefighters put out fires.' },
      { pic: '👩‍🏫', name: 'teacher', target: 'school', line: 'A teacher! Teachers help you learn.' },
      { pic: '🚌', name: 'bus driver', target: 'school', line: 'A bus driver! The school bus brings children to school.' },
      { pic: '📫', name: 'postal worker', target: 'post', line: 'A postal worker! They bring the letters.' }
    ]
  },
  'his-flags': {
    title: 'Flags', intro: 'Touch a flag to hear its country!',
    targets: [
      { id: 'island', pic: '🏝️', name: 'island countries', ask: 'Which flag is from an island?' },
      { id: 'big', pic: '🌎', name: 'big countries', ask: 'Which flag is from a big country?' }
    ],
    items: [
      { pic: '🇧🇧', flag: 'bb', name: 'Barbados', proper: true, target: 'island', line: 'Barbados! Our flag: blue, gold and the trident.' },
      { pic: '🇯🇲', flag: 'jm', name: 'Jamaica', proper: true, target: 'island', line: 'Jamaica! Green, black and gold.' },
      { pic: '🇹🇹', flag: 'tt', name: 'Trinidad and Tobago', proper: true, target: 'island', line: 'Trinidad and Tobago! Red with a black stripe.' },
      { pic: '🇺🇸', flag: 'us', name: 'the United States', proper: true, target: 'big', line: 'The United States! Stars and stripes.' },
      { pic: '🇨🇦', flag: 'ca', name: 'Canada', proper: true, target: 'big', line: 'Canada! A red maple leaf.' },
      { pic: '🇧🇷', flag: 'br', name: 'Brazil', proper: true, target: 'big', line: 'Brazil! Green and yellow.' }
    ]
  },
  'his-time': {
    title: 'Long ago and today', intro: 'Touch something to find out if it is from long ago or today!',
    targets: [
      { id: 'then', pic: '🕰️', name: 'long ago', ask: 'Which one is from long ago?' },
      { id: 'now', pic: '📱', name: 'today', ask: 'Which one is from today?' }
    ],
    items: [
      { pic: '🕯️', name: 'candle', target: 'then', line: 'A candle! Long ago, candles lit the house at night.' },
      { pic: '🐎', name: 'horse and cart', target: 'then', line: 'A horse and cart! Long ago, that is how people travelled.' },
      { pic: '🪶', name: 'quill pen', target: 'then', line: 'A quill pen! Long ago, people wrote with a feather.' },
      { pic: '💡', name: 'light bulb', target: 'now', line: 'A light bulb! Today we flick a switch.' },
      { pic: '🚗', name: 'car', target: 'now', line: 'A car! Today we drive.' },
      { pic: '💻', name: 'computer', target: 'now', line: 'A computer! Today we type.' }
    ]
  }
};
