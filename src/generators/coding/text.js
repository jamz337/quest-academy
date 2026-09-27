// Program as short lines a child can trace without seeing the grid (shared by the boss, Robot Dance, the duels
// and tests). Nested bodies are indented two spaces per level.
export function programText(blocks, depth = 0) {
  const pad = '  '.repeat(depth);
  const body = (list) => { const t = programText(list || [], depth + 1); return t ? '\n' + t : ''; };
  return blocks.map((b) => {
    if (b.op === 'fwd') return pad + 'Move ▲';
    if (b.op === 'left') return pad + 'Turn ◀';
    if (b.op === 'right') return pad + 'Turn ▶';
    if (b.op === 'pick') return pad + 'Pick up';
    if (b.op === 'repeat') return pad + `Repeat ${b.n}:` + body(b.body);
    if (b.op === 'if') return pad + `If path ${b.cond || 'ahead'}:` + body(b.then) + (b.else && b.else.length ? `\n${pad}Else:` + body(b.else) : '');
    if (b.op === 'while') return pad + 'Until goal:' + body(b.body);
    if (b.op === 'call') return pad + `Do ${b.fn || 'F1'}`;
    return pad + b.op;
  }).join('\n');
}
