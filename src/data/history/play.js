// History Harbor for Pre-K: touch-and-learn sets for Flag Finder and Past & Present (see scenes/minigames/TouchPlay.js); Compass Quest and
// Community Helpers have no touch version, Pre-K sails and calls for help in the quiz itself. Pure data.

export const HISTORY_PLAY_SETS = {
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
