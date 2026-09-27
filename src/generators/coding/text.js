// Program as short lines a child can trace without seeing the grid (shared by the boss, Robot Dance and tests).
export function programText(blocks, depth = 0) {
  const pad = '  '.repeat(depth);
  return blocks.map((b) => {
    if (b.op === 'fwd') return pad + 'Move ▲';
    if (b.op === 'left') return pad + 'Turn ◀';
    if (b.op === 'right') return pad + 'Turn ▶';
    if (b.op === 'repeat') return pad + `Repeat ${b.n}:\n` + programText(b.body, depth + 1);
    return pad + b.op;
  }).join('\n');
}
