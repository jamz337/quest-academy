// Block definitions for the touch program editor. Pure data, no Phaser.
import { THEME } from '../../ui/theme.js';

export const BLOCKS = {
  fwd: { id: 'fwd', label: 'Move ▲', color: THEME.block.fwd, kind: 'primitive' },
  left: { id: 'left', label: 'Turn ◀', color: THEME.block.left, kind: 'primitive' },
  right: { id: 'right', label: 'Turn ▶', color: THEME.block.right, kind: 'primitive' },
  pick: { id: 'pick', label: 'Pick up', color: THEME.block.pick, kind: 'primitive' },
  repeat: { id: 'repeat', label: 'Repeat N', color: THEME.block.repeat, kind: 'container', hasCount: true },
  if: { id: 'if', label: 'If path …', color: THEME.block.if, kind: 'container', hasCond: true, hasElse: true },
  while: { id: 'while', label: 'Until goal', color: THEME.block.while, kind: 'container' },
  call: { id: 'call', label: 'Do F1', color: THEME.block.call, kind: 'primitive' }
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
