// History Harbor for Pre-K: the touch-and-learn set for Past & Present (see scenes/minigames/TouchPlay.js). Compass Quest, Community
// Helpers and Flag Finder have no touch version: Pre-K sails, calls for help and paints flags in the quiz itself. Pure data.

export const HISTORY_PLAY_SETS = {
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
