// Rasterize public/icon.svg into the PNG icons Android Chrome needs for PWA install.
import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(join(root, 'public', 'icon.svg'));
const outDir = join(root, 'public', 'icons');
mkdirSync(outDir, { recursive: true });
const out = (name) => join(outDir, name);

await sharp(svg).resize(192, 192).png().toFile(out('icon-192.png'));
await sharp(svg).resize(512, 512).png().toFile(out('icon-512.png'));
// Maskable: shrink the artwork to 80% and pad with the background colour so Android can crop any shape.
const inner = await sharp(svg).resize(410, 410).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#1d2b53' } })
  .composite([{ input: inner, gravity: 'centre' }])
  .png()
  .toFile(out('icon-512-maskable.png'));
console.log('icons written to public/icons/');
