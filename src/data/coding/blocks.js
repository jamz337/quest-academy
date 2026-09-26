// Block definitions for the touch program editor. Pure data, no Phaser.
import { C } from '../../constants.js';

export const BLOCKS = {
  fwd: { id: 'fwd', label: 'Move ▲', color: C.blue, kind: 'primitive' },
  left: { id: 'left', label: 'Turn ◀', color: C.lavender, kind: 'primitive' },
  right: { id: 'right', label: 'Turn ▶', color: C.lavender, kind: 'primitive' },
  pick: { id: 'pick', label: 'Pick up', color: C.yellow, kind: 'primitive' },
  repeat: { id: 'repeat', label: 'Repeat N', color: C.orange, kind: 'container', hasCount: true },
  if: { id: 'if', label: 'If path …', color: C.green, kind: 'container', hasCond: true, hasElse: true },
  while: { id: 'while', label: 'Until goal', color: C.purple, kind: 'container' },
  call: { id: 'call', label: 'Do F1', color: C.pink, kind: 'primitive' }
};

export const BLOCK_LIST = Object.values(BLOCKS);

/** Default palette per grade band. A level's own `blocks` list overrides this. */
export const BLOCKS_BY_BAND = {
  A: ['fwd', 'left', 'right', 'repeat'],
  B: ['fwd', 'left', 'right', 'repeat', 'if'],
  C: ['fwd', 'left', 'right', 'repeat', 'if', 'while', 'call']
};

export const COND_LABEL = { ahead: 'ahead', left: 'left', right: 'right', notGoal: 'not at goal' };
export const CONDS = ['ahead', 'left', 'right'];

export const blockDef = (id) => BLOCKS[id];
export const paletteFor = (level, band) => (level && level.blocks) || BLOCKS_BY_BAND[band] || BLOCKS_BY_BAND.A;
