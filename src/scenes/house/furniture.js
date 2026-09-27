// Furniture and wall exhibits for the house, drawn flat with soft shadows straight into the interior's baked
// texture. (x, y) is the top-left in pixels, (w, h) the footprint. `accent` is the room's colour.
import { drawFlag, drawIsland } from '../../ui/Pictures.js';

const WOOD = 0xb07a4f, WOOD_DARK = 0x7a5033, CREAM = 0xfff8ef, INK = 0x2d2a4a, METAL = 0xd9dde3, METAL_DARK = 0x9aa3ad;

const shadow = (g, x, y, w, h, r = 6) => { g.fillStyle(0x000000, 0.14); g.fillRoundedRect(x + 2, y + 4, w, h, r); };
const rr = (g, colour, x, y, w, h, r = 5, a = 1) => { g.fillStyle(colour, a); g.fillRoundedRect(x, y, w, h, r); };

function books(g, x, y, w, h) {
  const colours = [0xff6fae, 0x3d8bff, 0x2ec46a, 0xffc531, 0x8b5cf6, 0xff8f3f];
  let bx = x;
  for (let i = 0; bx < x + w - 3; i++) { const bw = 4 + (i % 3); const bh = h - (i % 2) * 3; rr(g, colours[i % colours.length], bx, y + h - bh, bw, bh, 1); bx += bw + 1; }
}

export function drawFurniture(g, kind, x, y, w, h, accent = 0xff6fae) {
  switch (kind) {
    case 'bed': {
      shadow(g, x + 3, y + 2, w - 6, h - 6, 8);
      rr(g, WOOD, x + 3, y + 2, w - 6, h - 6, 8);
      rr(g, CREAM, x + 7, y + 10, w - 14, h - 18, 5);
      rr(g, accent, x + 7, y + h * 0.42, w - 14, h * 0.58 - 12, 5);
      rr(g, 0xffffff, x + 7, y + h * 0.42, w - 14, 4, 2, 0.6);
      rr(g, 0xffffff, x + 11, y + 12, (w - 26) / 2, 12, 4); rr(g, 0xffffff, x + w / 2 + 2, y + 12, (w - 26) / 2, 12, 4);
      rr(g, WOOD_DARK, x + 3, y + 2, w - 6, 7, 3);
      break;
    }
    case 'nightstand': {
      shadow(g, x + 6, y + 8, w - 12, h - 12);
      rr(g, WOOD, x + 6, y + 8, w - 12, h - 12, 4); rr(g, WOOD_DARK, x + 6, y + 8, w - 12, 3, 2);
      rr(g, 0xffc531, x + w / 2 - 6, y + 12, 12, 8, 3); rr(g, 0xffffff, x + w / 2 - 1, y + 20, 2, 5, 1);   // a little lamp
      break;
    }
    case 'wardrobe': {
      shadow(g, x + 3, y + 1, w - 6, h - 4, 4);
      rr(g, WOOD_DARK, x + 3, y + 1, w - 6, h - 4, 4); rr(g, WOOD, x + 5, y + 4, (w - 12) / 2, h - 10, 3); rr(g, WOOD, x + w / 2 + 1, y + 4, (w - 12) / 2, h - 10, 3);
      rr(g, 0xffc531, x + w / 2 - 4, y + h / 2 - 2, 2, 5, 1); rr(g, 0xffc531, x + w / 2 + 2, y + h / 2 - 2, 2, 5, 1);
      break;
    }
    case 'sofa': {
      shadow(g, x + 2, y + 4, w - 4, h - 8, 8);
      rr(g, accent, x + 2, y + 2, w - 4, h - 6, 8);
      rr(g, 0xffffff, x + 6, y + 10, w / 2 - 8, h - 16, 5, 0.35); rr(g, 0xffffff, x + w / 2 + 2, y + 10, w / 2 - 8, h - 16, 5, 0.35);
      rr(g, 0x000000, x + 2, y + 2, w - 4, 6, 3, 0.12);
      break;
    }
    case 'coffeeTable': {
      shadow(g, x + 5, y + 8, w - 10, h - 14, 10);
      rr(g, WOOD, x + 5, y + 8, w - 10, h - 14, 10); rr(g, 0xffffff, x + 9, y + 12, w - 18, h - 22, 6, 0.25);
      rr(g, 0x2ec46a, x + w / 2 - 4, y + h / 2 - 5, 8, 6, 3);   // a bowl of fruit
      break;
    }
    case 'lamp': {
      shadow(g, x + 8, y + h - 12, w - 16, 8, 4);
      rr(g, INK, x + w / 2 - 2, y + 12, 4, h - 20, 2); rr(g, INK, x + 8, y + h - 12, w - 16, 5, 3);
      g.fillStyle(0xffe08a, 1); g.fillTriangle(x + w / 2 - 12, y + 14, x + w / 2 + 12, y + 14, x + w / 2, y + 2);
      rr(g, 0xffe08a, x + w / 2 - 12, y + 12, 24, 4, 2);
      break;
    }
    case 'tv': {
      shadow(g, x + 4, y + 6, w - 8, h - 10, 6);
      rr(g, WOOD, x + 4, y + h - 10, w - 8, 6, 3);
      rr(g, INK, x + 6, y + 3, w - 12, h - 12, 4); rr(g, 0x3d8bff, x + 9, y + 6, w - 18, h - 18, 3);
      rr(g, 0xffffff, x + 12, y + 8, w * 0.3, 3, 1, 0.5);
      break;
    }
    case 'bookshelf': {
      shadow(g, x + 3, y + 1, w - 6, h - 4, 4);
      rr(g, WOOD_DARK, x + 3, y + 1, w - 6, h - 4, 4);
      books(g, x + 6, y + 4, w - 12, 9); books(g, x + 6, y + 16, w - 12, 9);
      break;
    }
    case 'desk': {
      shadow(g, x + 3, y + 6, w - 6, h - 10, 5);
      rr(g, WOOD, x + 3, y + 6, w - 6, h - 10, 5); rr(g, WOOD_DARK, x + 3, y + 6, w - 6, 3, 2);
      rr(g, 0x3d8bff, x + w - 22, y + 2, 14, 14, 7); rr(g, 0x2ec46a, x + w - 18, y + 5, 6, 8, 3); rr(g, INK, x + w - 16, y + 16, 2, 6, 1);   // the globe
      rr(g, CREAM, x + 8, y + 12, 18, 12, 2); rr(g, INK, x + 10, y + 15, 12, 1, 0); rr(g, INK, x + 10, y + 18, 9, 1, 0);   // papers
      break;
    }
    case 'plant': {
      shadow(g, x + 9, y + 16, w - 18, h - 20, 5);
      rr(g, 0xc45a3c, x + 9, y + 18, w - 18, h - 22, 4);
      g.fillStyle(0x2ec46a, 1); g.fillCircle(x + w / 2, y + 12, 9); g.fillCircle(x + w / 2 - 8, y + 16, 6); g.fillCircle(x + w / 2 + 8, y + 16, 6);
      g.fillStyle(0x1f8f4c, 1); g.fillCircle(x + w / 2 + 3, y + 9, 4);
      break;
    }
    case 'table': {
      // Chairs tucked in on both sides, table in the middle with a runner and plates.
      rr(g, WOOD_DARK, x + 2, y + h / 2 - 12, 8, 24, 3); rr(g, WOOD_DARK, x + w - 10, y + h / 2 - 12, 8, 24, 3);
      shadow(g, x + 10, y + 8, w - 20, h - 16, 8);
      rr(g, WOOD, x + 10, y + 8, w - 20, h - 16, 8); rr(g, accent, x + w / 2 - 6, y + 10, 12, h - 20, 3, 0.7);
      g.fillStyle(0xffffff, 1); g.fillCircle(x + w / 2 - 14, y + h / 2 - 12, 5); g.fillCircle(x + w / 2 + 14, y + h / 2 + 12, 5);
      g.fillCircle(x + w / 2 + 14, y + h / 2 - 12, 5); g.fillCircle(x + w / 2 - 14, y + h / 2 + 12, 5);
      break;
    }
    case 'smallTable': {
      shadow(g, x + 6, y + 8, w - 12, h - 14, 6);
      rr(g, WOOD, x + 6, y + 8, w - 12, h - 14, 6); g.fillStyle(0xffffff, 1); g.fillCircle(x + w * 0.3, y + h / 2, 5); g.fillCircle(x + w * 0.7, y + h / 2, 5);
      break;
    }
    case 'cabinet': {
      shadow(g, x + 3, y + 2, w - 6, h - 6, 4);
      rr(g, WOOD, x + 3, y + 2, w - 6, h - 6, 4); rr(g, WOOD_DARK, x + 3, y + 2, w - 6, 3, 2);
      for (let i = 0; i < 3; i++) { g.fillStyle(0xffffff, 1); g.fillCircle(x + 12 + i * ((w - 24) / 2), y + 12, 5); g.fillStyle(accent, 0.7); g.fillCircle(x + 12 + i * ((w - 24) / 2), y + 12, 2); }
      rr(g, 0xffc531, x + w / 2 - 6, y + h - 10, 4, 3, 1); rr(g, 0xffc531, x + w / 2 + 2, y + h - 10, 4, 3, 1);
      break;
    }
    case 'trophyCase': {
      shadow(g, x + 3, y + 2, w - 6, h - 6, 4);
      rr(g, WOOD_DARK, x + 3, y + 2, w - 6, h - 6, 4); rr(g, 0xdff3ff, x + 6, y + 5, w - 12, h - 12, 3, 0.9);
      for (let i = 0; i < 3; i++) { const cx = x + 14 + i * ((w - 28) / 2); rr(g, 0xffc531, cx - 5, y + 9, 10, 8, 3); rr(g, 0xe09a12, cx - 2, y + 17, 4, 4, 1); rr(g, 0xe09a12, cx - 5, y + 21, 10, 2, 1); }
      break;
    }
    case 'coatRack': {
      shadow(g, x + 8, y + h - 10, w - 16, 6, 3);
      rr(g, WOOD_DARK, x + w / 2 - 2, y + 4, 4, h - 10, 2); rr(g, WOOD_DARK, x + 8, y + h - 8, w - 16, 4, 2);
      rr(g, 0xff6fae, x + 6, y + 8, 9, 14, 4); rr(g, 0x3d8bff, x + w - 15, y + 10, 9, 14, 4);   // two coats
      rr(g, 0xffc531, x + w / 2 - 4, y + 3, 8, 4, 2);   // a hat
      break;
    }
    case 'stove': {
      shadow(g, x + 2, y + 2, w - 4, h - 6, 4);
      rr(g, METAL, x + 2, y + 2, w - 4, h - 6, 4); rr(g, METAL_DARK, x + 2, y + 2, w - 4, 4, 2);
      g.fillStyle(INK, 1); g.fillCircle(x + 10, y + 12, 5); g.fillCircle(x + w - 10, y + 12, 5); g.fillCircle(x + 10, y + 22, 5); g.fillCircle(x + w - 10, y + 22, 5);
      g.fillStyle(0xff8f3f, 1); g.fillCircle(x + 10, y + 12, 2); g.fillCircle(x + w - 10, y + 22, 2);
      rr(g, 0xffc531, x + 6, y + h - 8, w - 12, 2, 1);   // the oven handle
      break;
    }
    case 'counter': {
      shadow(g, x + 2, y + 4, w - 4, h - 8, 4);
      rr(g, 0xe8dcc8, x + 2, y + 4, w - 4, h - 8, 4); rr(g, WOOD, x + 2, y + 14, w - 4, h - 18, 3);
      rr(g, METAL, x + 6, y + 7, w / 2 - 8, 8, 3); rr(g, METAL_DARK, x + w / 4 + 1, y + 3, 2, 6, 1);   // the sink and tap
      rr(g, 0x2ec46a, x + w / 2 + 6, y + 7, 8, 8, 4); rr(g, 0xff004d, x + w / 2 + 16, y + 7, 8, 8, 4);   // fruit on the side
      break;
    }
    case 'fridge': {
      shadow(g, x + 4, y + 1, w - 8, h - 4, 4);
      rr(g, METAL, x + 4, y + 1, w - 8, h - 4, 4); rr(g, METAL_DARK, x + 4, y + 12, w - 8, 1, 0);
      rr(g, METAL_DARK, x + w - 10, y + 4, 2, 6, 1); rr(g, METAL_DARK, x + w - 10, y + 15, 2, 9, 1);
      rr(g, 0xff6fae, x + 8, y + 16, 5, 5, 1); rr(g, 0x3d8bff, x + 14, y + 18, 4, 4, 1);   // fridge magnets
      break;
    }
    default: rr(g, 0xcccccc, x + 4, y + 4, w - 8, h - 8, 4);
  }
}

/** The Barbados exhibits on the walls, centred at (cx, cy). */
export function drawExhibit(g, id, cx, cy) {
  if (id === 'flag') {
    shadow(g, cx - 15, cy - 10, 30, 20, 2);
    drawFlag(g, 'barbados', cx - 15, cy - 10, 30, 20);
    g.lineStyle(1, 0xffffff, 0.8); g.strokeRect(cx - 15, cy - 10, 30, 20);
  } else if (id === 'heroes') {
    // Three gold portrait frames.
    [-13, 0, 13].forEach((dx, i) => {
      rr(g, 0xe09a12, cx + dx - 6, cy - 8, 12, 16, 2); rr(g, [0xdff3ff, 0xffe1ee, 0xfff0cc][i], cx + dx - 4, cy - 6, 8, 12, 1);
      g.fillStyle([0x6b4a33, 0x2d2a4a, 0x8a5a3c][i], 1); g.fillCircle(cx + dx, cy - 2, 2.5); rr(g, [0x3d8bff, 0xff6fae, 0x2ec46a][i], cx + dx - 3, cy + 1, 6, 5, 2);
    });
  } else if (id === 'parishes') {
    rr(g, 0x7a5033, cx - 16, cy - 12, 32, 24, 2); rr(g, 0xfff8ef, cx - 14, cy - 10, 28, 20, 1);
    drawIsland(g, cx - 8, cy - 8, 16, 16);
    g.fillStyle(0xff004d, 1); g.fillCircle(cx - 8 + 0.2 * 16, cy - 8 + 0.8 * 16, 1.6);
  } else if (id === 'symbols') {
    // A shield: blue and gold, a small bearded fig tree, gold border.
    const pts = [{ x: cx - 12, y: cy - 11 }, { x: cx + 12, y: cy - 11 }, { x: cx + 12, y: cy + 2 }, { x: cx, y: cy + 12 }, { x: cx - 12, y: cy + 2 }];
    g.fillStyle(0xffc531, 1); g.fillPoints(pts, true);
    g.fillStyle(0x00267f, 1); g.fillRect(cx - 10, cy - 9, 20, 9);
    rr(g, 0x7a5033, cx - 1.5, cy - 4, 3, 10, 1); g.fillStyle(0x2ec46a, 1); g.fillCircle(cx, cy - 5, 5);
    g.lineStyle(1.5, 0xe09a12, 1); g.strokePoints(pts, true);
  } else if (id === 'culture') {
    // A tuk-band kettle drum.
    shadow(g, cx - 11, cy - 8, 22, 18, 4);
    rr(g, 0xc45a3c, cx - 11, cy - 6, 22, 16, 4); g.fillStyle(0xfff8ef, 1); g.fillEllipse(cx, cy - 6, 22, 8);
    g.lineStyle(1, 0xffc531, 1); for (let i = -8; i <= 8; i += 4) g.lineBetween(cx + i, cy - 3, cx + i + 2, cy + 8);
  }
}
