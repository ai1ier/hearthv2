// The Christmas theme: a decorated tree, wreaths, ribboned pine swags, stockings, gifts and hanging
// ornaments for the pixel scenes, kept to red, green and white trimmed with gold. Everything is painted
// in the scene's own light (via T), except the tree's soft lights.
import { rng } from './scene.js';

export const THEMES = [['classic', 'Classic'], ['december', 'Every December'], ['christmas', 'Christmas']];
export const festiveOn = (settings, now = new Date()) => settings?.theme === 'christmas' || (settings?.theme === 'december' && now.getMonth() === 11);

const BAUBLES = ['#e6cf8e', '#f0d68a', '#f4efe4', '#6cc9ac'];
const BULBS = ['255,226,150', '255,250,230', '150,236,206'];

// a little cross of gold
function star(R, T, x, y, r = 2) {
  for (let i = -r; i <= r; i++) { R.put(x + i, y, T('#f0d68a')); R.put(x, y + i, T('#f0d68a')); }
  R.put(x, y, T('#fff3b0'));
  if (r > 1) for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) R.put(x + a, y + b, T('#d8bc70'));
}

function bauble(R, T, x, y, col, big) {
  if (!big) { R.put(x, y, T(col)); return; }
  R.rect(x, y, 2, 2, T(col)); R.put(x, y, T('#ffffff'), 0.65);
}

export function paintXmasTree(R, T, x0, base, h, lights) {
  const big = h > 40, top = base - h, maxW = h * 0.36, tiers = big ? 5 : 3, nr = rng(h * 7 + 3);
  const dark = T('#3e9a80'), mid = T('#5cb89c'), lite = T('#8edcc2');
  const width = (j) => { const p = j / h, f = (p * tiers) % 1; return Math.max(0, Math.round(maxW * (p * 0.72 + (0.28 * (Math.floor(p * tiers) + f)) / tiers))); };
  for (let j = 0; j <= h; j++) {
    const w = width(j);
    for (let i = -w; i <= w; i++) {
      const n = nr() + (i / (w + 1)) * 0.45;
      R.put(x0 + i, top + j, n < 0.28 ? lite : n > 0.85 ? dark : mid);
    }
    R.put(x0 - w, top + j, dark); R.put(x0 + w, top + j, dark);
  }
  R.rect(x0 - 1, base + 1, 3, big ? 4 : 2, T('#5a3a22'));
  // tinsel winding down the branches, and a string of lights
  for (let k = 1; k < tiers; k++) {
    const yy = Math.round((k + 0.15) * (h / tiers)), w = width(yy);
    for (let i = -w + 1; i < w; i++) {
      const y = top + yy + Math.round((i / w) * (big ? 4 : 2));
      R.put(x0 + i, y, T(i % 3 ? '#ecd590' : '#fff3b0'));
      if ((i + w) % (big ? 5 : 4) === 0) lights.push({ x: x0 + i, y: y + 1, p: i * 1.7 + k * 2, k: Math.abs(i + k) });
    }
  }
  // baubles
  const n = big ? 22 : 8, br = rng(h + 11);
  for (let i = 0; i < n; i++) {
    const j = Math.round(h * (0.16 + br() * 0.8)), w = width(j);
    bauble(R, T, x0 + Math.round((br() * 2 - 1) * (w - 1)), top + j, BAUBLES[i % BAUBLES.length], big);
  }
  star(R, T, x0, top - (big ? 2 : 1), big ? 3 : 2);
}

export function paintWreath(R, T, cx, cy, r, lights) {
  const nr = rng(r * 13 + cx), g = [T('#3e9a80'), T('#5cb89c'), T('#8edcc2')];
  for (let y = -r - 1; y <= r + 1; y++) for (let x = -r - 1; x <= r + 1; x++) {
    const d = Math.hypot(x, y), inner = Math.max(1.2, r * 0.48);
    if (d <= r + 0.3 && d >= inner) R.put(cx + x, cy + y, g[Math.floor(nr() * 3)]);
  }
  const berries = r >= 6 ? 8 : 4;
  for (let i = 0; i < berries; i++) {
    const a = (i / berries) * Math.PI * 2 + 0.4, x = cx + Math.round(Math.cos(a) * r * 0.74), y = cy + Math.round(Math.sin(a) * r * 0.74);
    R.put(x, y, T('#e6cf8e'));
    if (lights && r >= 6 && i % 2) lights.push({ x: cx + Math.round(Math.sin(a) * r * 0.9), y: cy + Math.round(Math.cos(a) * r * 0.9), p: i * 2, k: 1 });
  }
  // the bow
  const by = cy + r, bw = r >= 6 ? 3 : 2;
  R.rect(cx - bw, by - 1, bw, 2, T('#e6cf8e')); R.rect(cx + 1, by - 1, bw, 2, T('#e6cf8e')); R.rect(cx, by - 1, 1, 2, T('#f6e2a8'));
  R.put(cx - 1, by + 1, T('#e6cf8e')); R.put(cx + 1, by + 1, T('#e6cf8e'));
  if (r >= 6) { R.put(cx - 2, by + 2, T('#c4a660')); R.put(cx + 2, by + 2, T('#c4a660')); }
}

// a red bow with two tails
export function paintBow(R, T, x, y, big) {
  const red = T('#e6cf8e'), dk = T('#c4a660'), lt = T('#f6e2a8');
  R.rect(x - 3, y - 1, 3, 2, red); R.rect(x + 1, y - 1, 3, 2, red); R.put(x - 3, y - 1, lt); R.put(x + 3, y - 1, lt);
  if (big) { R.put(x - 4, y - 2, red); R.put(x - 4, y + 1, dk); R.put(x + 4, y - 2, red); R.put(x + 4, y + 1, dk); }
  R.rect(x, y - 1, 1, 2, T('#f0d68a'));
  for (let i = 1; i <= (big ? 4 : 3); i++) { R.put(x - 1 - (i >> 1), y + i, i % 2 ? red : dk); R.put(x + 1 + (i >> 1), y + i, i % 2 ? red : dk); }
}

// a small bauble with a gold cap, hanging off a swag
function trinket(R, T, x, y, col) {
  R.put(x, y, T('#f0d68a'));
  R.rect(x - 1, y + 1, 3, 2, T(col)); R.put(x - 1, y + 1, T('#ffffff'), 0.65);
}

// a bushy pine swag between two points: a red ribbon wound through it, baubles hanging beneath
export function paintSwag(R, T, x0, y0, x1, y1, sag = 0, { ribbon = 6, orn = 9 } = {}) {
  const n = Math.max(1, Math.abs(x1 - x0) + Math.abs(y1 - y0)), nr = rng(x0 * 3 + y0 + 5), g = [T('#3e9a80'), T('#5cb89c'), T('#8edcc2')];
  const at = (i) => { const f = i / n; return [Math.round(x0 + (x1 - x0) * f), Math.round(y0 + (y1 - y0) * f + Math.sin(f * Math.PI) * sag)]; };
  for (let i = 0; i <= n; i++) {
    const [x, y] = at(i);
    for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) if (Math.abs(j) + Math.abs(k) < 2 || nr() < 0.45) R.put(x + j, y + k, g[Math.floor(nr() * 3)]);
    if (nr() < 0.3) R.put(x + (nr() < 0.5 ? -2 : 2), y, g[1]);
  }
  if (ribbon) for (let i = 2; i < n; i += ribbon) {
    const [x, y] = at(i);
    R.put(x, y - 1, T('#e6cf8e')); R.put(x, y, T('#f6e2a8')); R.put(x + 1, y, T('#e6cf8e')); R.put(x + 1, y + 1, T('#c4a660'));
  }
  if (orn) for (let i = Math.round(orn / 2), k = 0; i < n; i += orn, k++) {
    const [x, y] = at(i);
    trinket(R, T, x, y + 2, BAUBLES[k % BAUBLES.length]);
  }
}

// a round garden bush tied up in ribbon and hung with baubles
function paintRibbonBush(R, T, x, y, r) {
  const nr = rng(x * 5 + y);
  R.disk(x, y, r, (px, py, nx, ny) => { const n = nr(); R.put(px, py, T(ny < -0.3 && n < 0.5 ? '#8edcc2' : ny > 0.4 || n < 0.15 ? '#3e9a80' : '#5cb89c')); });
  for (let i = -r; i <= r; i++) R.put(x + i, y + Math.round(i * 0.3), T(i % 2 ? '#e6cf8e' : '#f6e2a8'));
  R.put(x - 2, y + 2, T('#f0d68a')); R.put(x + 2, y - 2, T('#f4efe4')); R.put(x - 1, y - 2, T('#e6cf8e')); R.put(x + 3, y + 2, T('#f4efe4'));
  paintBow(R, T, x, y - r + 1, false);
}

export function paintStocking(R, T, x, y, col) {
  R.rect(x, y + 2, 4, 7, T(col));
  R.rect(x, y + 8, 7, 3, T(col));
  R.rect(x + 5, y + 10, 2, 1, T('#f4efe4')); R.rect(x, y + 10, 2, 1, T('#f4efe4'));
  R.rect(x - 1, y, 6, 2, T('#f4efe4'));
}

export function paintGift(R, T, x, base, w, h, col, ribbon) {
  R.rect(x, base - h, w, h, T(col));
  R.rect(x + Math.floor(w / 2), base - h, 1, h, T(ribbon)); R.rect(x, base - h + Math.floor(h / 2), w, 1, T(ribbon));
  R.put(x + Math.floor(w / 2) - 1, base - h - 1, T(ribbon)); R.put(x + Math.floor(w / 2) + 1, base - h - 1, T(ribbon));
}

// A Christmas ornament on a gold thread, red, green or white and always trimmed in gold.
const ORNAMENT = { red: ['#e6cf8e', '#b89a52', '#f6e2a8'], green: ['#6cc9ac', '#3e9a80', '#a6ead2'], white: ['#f6f2e6', '#cfc8b4', '#ffffff'] };
export function paintOrnament(R, T, x, y0, len, colour, style) {
  const [base, dk, hi] = ORNAMENT[colour].map(T), gold = T('#f0d68a'), goldD = T('#c4a560'), goldL = T('#fff3b0');
  R.rect(x, y0, 1, len, gold);
  const r = style === 'drop' ? 4 : 5, cy = y0 + len + 2 + r;
  R.rect(x - 1, y0 + len, 3, 2, gold); R.put(x, y0 + len - 1, goldD); R.put(x + 1, y0 + len, goldD);
  const shape = (dx, dy) => (style === 'drop' ? (dy < 0 ? Math.abs(dx) <= (r + dy + 1) * 0.7 + 1 : dx * dx + dy * dy <= r * r + 2) : dx * dx + dy * dy <= r * r + 2);
  const topY = style === 'drop' ? -r - 3 : -r;
  for (let dy = topY; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (!shape(dx, dy)) continue;
    R.put(x + dx, cy + dy, dx + dy > r - 2 ? dk : dx + dy < -r + 1 ? hi : base);
  }
  if (style === 'band' || style === 'drop') {
    for (let dx = -r; dx <= r; dx++) if (shape(dx, 0)) { R.put(x + dx, cy, gold); if (shape(dx, 1) && (dx & 1)) R.put(x + dx, cy + 1, goldL); if (shape(dx, -1) && !(dx & 1)) R.put(x + dx, cy - 1, goldD); }
  } else if (style === 'star') {
    for (let i = -2; i <= 2; i++) { R.put(x + i, cy, gold); R.put(x, cy + i, gold); }
    R.put(x, cy, goldL); for (const [a, b] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) R.put(x + a, cy + b, gold);
  } else {
    for (let dx = -r; dx <= r; dx++) { const dy = (dx + 20) % 4 < 2 ? -1 : 1; if (shape(dx, dy)) R.put(x + dx, cy + dy, gold); if ((dx + 20) % 4 === 1 && shape(dx, 3)) R.put(x + dx, cy + 3, goldL); }
  }
  R.put(x - 2, cy - 3, T('#ffffff'), 0.7);
}

// The meadow: a little tree by the fence, swags along the gables, a wreath on the door.
export function paintMeadowXmas(R, T, e, { hx, doorX, boardX, bw, lampX, tree }, s) {
  const L = (s.twinkle = []);
  s.lights = [];
  // the big tree gets dressed too
  const br = rng(21);
  for (let i = 0; i < 18; i++) {
    const a = br() * Math.PI * 2, rr = br();
    bauble(R, T, tree.x + Math.round(Math.cos(a) * rr * 18), tree.y + Math.round(Math.sin(a) * rr * 11), BAUBLES[i % BAUBLES.length], true);
  }
  paintXmasTree(R, T, hx - 14, 98, 27, L);
  for (const [x, c, r] of [[hx - 21, '#e6cf8e', '#f0d68a'], [hx - 9, '#f4efe4', '#e6cf8e']]) paintGift(R, T, x, 102, 5, 4, c, r);
  // along the triangle roofs
  paintSwag(R, T, hx + 15, 47, hx - 7, 75, 0, { ribbon: 7, orn: 11 });
  paintSwag(R, T, hx + 15, 47, hx + 29, 64, 0, { ribbon: 7, orn: 0 });
  paintSwag(R, T, hx + 36, 56, hx + 29, 64, 0, { ribbon: 0, orn: 0 });
  paintSwag(R, T, hx + 36, 56, hx + 52, 75, 0, { ribbon: 7, orn: 11 });
  paintBow(R, T, hx + 15, 47, true); paintBow(R, T, hx + 36, 56, false);
  // door
  paintSwag(R, T, doorX - 10, 81, doorX, 71, 0, { ribbon: 5, orn: 0 });
  paintSwag(R, T, doorX, 71, doorX + 10, 81, 0, { ribbon: 5, orn: 0 });
  paintBow(R, T, doorX, 71, false);
  paintWreath(R, T, doorX, 88, 3);
  // ribboned bushes either side of the cottage
  paintRibbonBush(R, T, hx + 11, 96, 5); paintRibbonBush(R, T, hx + 35, 96, 5);
  // board and lamp post
  paintSwag(R, T, boardX - 2, 80, boardX + bw + 2, 80, 1, { ribbon: 6, orn: 8 });
  paintBow(R, T, boardX + Math.floor(bw / 2), 80, false);
  for (let y = 86; y < 102; y += 3) { R.put(lampX, y, T('#e6cf8e')); R.put(lampX, y + 1, T('#f4efe4')); }
}

// The study: a tree by the shelves, a wreath over the hearth, stockings, gifts, a ribboned swag on the
// beam and ornaments hanging all along it.
export function paintStudyXmas(R, T, { W, cx, fx, bx, hasShelf }, s) {
  const L = (s.twinkle = []);
  const shelfEnd = hasShelf ? bx + 48 : cx + 42;
  const tx = shelfEnd + 28 <= W - 16 ? shelfEnd + 28 : W - 22;
  if (fx != null) {
    paintWreath(R, T, fx + 22, 25, 8);
    paintSwag(R, T, fx - 3, 44, fx + 47, 44, 3, { ribbon: 8, orn: 0 });
    [['#e6cf8e', 8], ['#5cb89c', 20], ['#f4efe4', 32]].forEach(([c, dx]) => paintStocking(R, T, fx + dx, 49, c));
  } else paintWreath(R, T, cx, 24, 6);
  paintXmasTree(R, T, tx, 104, 64, L);
  [[-22, 7, 6, '#e6cf8e', '#f0d68a'], [-13, 6, 8, '#f4efe4', '#e6cf8e'], [5, 8, 5, '#5cb89c', '#f0d68a'], [14, 6, 7, '#e6cf8e', '#f4efe4']].forEach(([dx, w, h, c, r]) => paintGift(R, T, tx + dx, 112, w, h, c, r));
  // ornaments: longer threads on open wall, short ones in front of the window, shelves and tree
  const colours = ['red', 'white', 'green'], styles = ['band', 'star', 'drop', 'zig'], lens = [14, 6, 22, 9, 18, 4];
  let i = 0;
  for (let x = 9; x < W - 6; x += 17, i++) {
    const nearWindow = Math.abs(x - cx) < 32, overHearth = fx != null && x > fx - 6 && x < fx + 50, overShelf = hasShelf && x > bx - 8 && x < bx + 56, overTree = Math.abs(x - tx) < 22;
    const len = nearWindow || overHearth || overShelf || overTree ? 3 + (i % 2) * 2 : lens[i % lens.length];
    paintOrnament(R, T, x, 6, len, colours[i % 3], styles[i % 4]);
  }
  // the swag goes on last, so every thread comes out from behind it
  for (let x = 0; x < W; x += 34) paintSwag(R, T, x, 6, x + 34, 6, 3, { ribbon: 6, orn: 0 });
  for (let x = 0; x <= W; x += 34) paintBow(R, T, x, 7, true);
}

// the tree's lights breathing softly, with a small halo after dark
export function drawTwinkles(c, lights, t, dark) {
  if (!lights) return;
  for (const l of lights) {
    const col = BULBS[Math.floor(l.k) % BULBS.length], a = 0.6 + 0.4 * Math.sin(t * 1.1 + l.k * 2.1);
    if (dark > 0.25) { c.fillStyle = `rgba(${col},${0.22 * a * dark})`; c.fillRect(l.x - 1, l.y - 1, 3, 3); }
    c.fillStyle = `rgba(${col},${a})`; c.fillRect(l.x, l.y, 1, 1);
  }
}

// outings: ribboned pine swags across the top of the view, redrawn only as the light changes
let swagCache = null;
export function drawFestoon(c, W, dark) {
  const shade = Math.round(dark * 8), key = W + '|' + shade;
  if (swagCache?.key !== key) {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = 26;
    const g = cv.getContext('2d'), k = 1 - (shade / 8) * 0.55;
    const T = (hex) => [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * k));
    const R = {
      put(x, y, col, alpha = 1) { g.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${alpha})`; g.fillRect(x, y, 1, 1); },
      rect(x, y, w, h, col) { g.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`; g.fillRect(x, y, w, h); },
    };
    for (let x = 0; x < W; x += 56) paintSwag(R, T, x, 2, x + 56, 2, 8, { ribbon: 7, orn: 12 });
    for (let x = 0; x <= W; x += 56) paintBow(R, T, x, 3, true);
    swagCache = { key, cv };
  }
  c.drawImage(swagCache.cv, 0, 0);
}
