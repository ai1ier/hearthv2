// The home scene for v2: a tiny planet floating over a pastel sea of clouds. A dome house with a
// telescope, a rose under a glass bell, a star lamp and the wish board stand on its curve, while
// your guide (a group member) strolls around it. Sky, sun, moon, season and weather still follow
// the real realm, as in the meadow (scene.js), whose engine this extends.
import { Scene, H, BAYER, hx2, mix, css, clamp, rng, frame, heroCanvases, Raster } from './scene.js';
import { moonPhase } from './sky.js';
import { CAT } from './sprites.js';

// sun altitude → [sky top, sky horizon]: periwinkle days, pink twilights, violet nights
// image sheets for the members' sprites, loaded once and shared by every scene
const SHEETS = new Map();
export function sheetOf(src) {
  let sh = SHEETS.get(src);
  if (!sh) { sh = { img: new Image(), ok: false }; sh.img.onload = () => { sh.ok = true; }; sh.img.src = src; SHEETS.set(src, sh); }
  return sh;
}
// how tall the guide stands on the planet, in scene pixels (you are about 25)
export const GUIDE_H = 31;

// Finds every pose on a sprite sheet laid out as a grid (sp.grid = [cols, rows]) once per sheet.
// Each pose is cut out by its own outline, not by the grid box: drawings often spill a little past
// their box, so a box cut would clip a foot or catch a sliver of the next pose. The sheet is split
// into separate blobs of ink; a pose is every blob that lies mostly inside its box. Returns each
// pose's bounds, the centre of its head, a clean cut-out canvas, and a shared frame size.
const POSES = new Map();
export function posesOf(sp, img) {
  let p = POSES.get(sp.src);
  if (p) return p;
  // sp.area = [x, y, w, h] limits the grid to part of the image (e.g. poses beside a portrait)
  const W = img.width, Hh = img.height, [cols, rows] = sp.grid, [ax, ay, aw, ah] = sp.area || [0, 0, W, Hh], cw = aw / cols, ch = ah / rows;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = Hh;
  const c = cv.getContext('2d', { willReadFrequently: true }); c.drawImage(img, 0, 0);
  const d = c.getImageData(0, 0, W, Hh).data, N = W * Hh;
  const ink = new Uint8Array(N);
  for (let k = 0; k < N; k++) ink[k] = d[k * 4 + 3] > 40 ? 1 : 0;
  // label the blobs of ink (8-connected), with a flat stack for speed
  const lab = new Int32Array(N), size = [0], bx0 = [0], bx1 = [0], by0 = [0], by1 = [0], stack = new Int32Array(N);
  for (let k = 0; k < N; k++) {
    if (lab[k] || !ink[k]) continue;
    const id = size.length; let n = 0, sp2 = 0, l0 = W, l1 = 0, t0 = Hh, t1 = 0; lab[k] = id; stack[sp2++] = k;
    while (sp2) {
      const q = stack[--sp2], x = q % W, y = (q - x) / W; n++;
      if (x < l0) l0 = x; if (x > l1) l1 = x; if (y < t0) t0 = y; if (y > t1) t1 = y;
      const up = q >= W, dn = q < N - W, lf = x > 0, rg = x < W - 1;
      const nb = (nk) => { if (!lab[nk] && ink[nk]) { lab[nk] = id; stack[sp2++] = nk; } };
      if (up) { nb(q - W); if (lf) nb(q - W - 1); if (rg) nb(q - W + 1); }
      if (dn) { nb(q + W); if (lf) nb(q + W - 1); if (rg) nb(q + W + 1); }
      if (lf) nb(q - 1); if (rg) nb(q + 1);
    }
    size.push(n); bx0.push(l0); bx1.push(l1); by0.push(t0); by1.push(t1);
  }
  const minBlob = sp.pixel ? 1 : 12; // big drawings ignore stray specks; true pixel art keeps a one-pixel tuft
  const boxes = [];
  for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
    const x0 = Math.round(ax + q * cw), x1 = Math.round(ax + (q + 1) * cw), y0 = Math.round(ay + r * ch), y1 = Math.round(ay + (r + 1) * ch);
    const inCell = new Map();
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const id = lab[y * W + x]; if (id) inCell.set(id, (inCell.get(id) || 0) + 1); }
    // this pose = the blobs that mostly sit in its box (a neighbour's spill-over mostly sits in the neighbour's)
    const keep = new Uint8Array(size.length);
    let l = W, t = Hh, rt = -1, b = -1;
    for (const [id, n] of inCell) if (size[id] >= minBlob && n * 2 >= size[id]) {
      keep[id] = 1; l = Math.min(l, bx0[id]); rt = Math.max(rt, bx1[id]); t = Math.min(t, by0[id]); b = Math.max(b, by1[id]);
    }
    if (rt < 0) { l = x0; rt = x1 - 1; t = y0; b = y1 - 1; }
    // the cut-out: kept ink plus its soft edge (faint pixels within 2 px of it), nothing else
    const bw = rt + 1 - l, bh = b + 1 - t, cut = document.createElement('canvas'); cut.width = bw; cut.height = bh;
    const cc = cut.getContext('2d'), im = cc.createImageData(bw, bh), o = im.data;
    const m = new Uint8Array(bw * bh), g = new Uint8Array(bw * bh);
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) m[y * bw + x] = keep[lab[(y + t) * W + x + l]];
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) { let v = 0; for (let dx = -2; dx <= 2 && !v; dx++) { const nx = x + dx; if (nx >= 0 && nx < bw) v = m[y * bw + nx]; } g[y * bw + x] = v; }
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
      const k = (y + t) * W + x + l, id = lab[k];
      if (id ? !keep[id] : !d[k * 4 + 3]) continue;
      if (!id) { let v = 0; for (let dy = -2; dy <= 2 && !v; dy++) { const ny = y + dy; if (ny >= 0 && ny < bh) v = g[ny * bw + x]; } if (!v) continue; }
      const s4 = k * 4, o4 = (y * bw + x) * 4;
      o[o4] = d[s4]; o[o4 + 1] = d[s4 + 1]; o[o4 + 2] = d[s4 + 2]; o[o4 + 3] = d[s4 + 3];
    }
    cc.putImageData(im, 0, 0);
    // head centre: middle of the kept ink across the top 30%
    const hb = t + Math.round((b - t) * 0.3);
    let hl = rt, hr = l;
    for (let y = t; y <= hb; y++) for (let x = l; x <= rt; x++) if (keep[lab[y * W + x]]) { if (x < hl) hl = x; if (x > hr) hr = x; }
    boxes.push({ t, b, l, r: rt, cut, hc: sp.pixel ? Math.round((hl + hr) / 2) : (hl + hr) / 2 });
  }
  const fh = Math.max(...boxes.map((o) => o.b + 1 - o.t));
  // sp.evenHeight: rows drawn at slightly different scales are evened out to one height, so the
  // figure doesn't grow and shrink (hop) as the frames swap
  for (const o of boxes) o.k = sp.evenHeight ? fh / (o.b + 1 - o.t) : 1;
  const fw = Math.ceil(2 * Math.max(...boxes.map((o) => o.k * Math.max(o.hc - o.l, o.r + 1 - o.hc)))) + 2;
  p = { boxes, fw, fh };
  POSES.set(sp.src, p);
  return p;
}

// a scene's cache key for its guide: changes once his sheet has loaded, so the scene rebuilds with him
export const guideKey = (g) => (g ? g.id + (g.sprite?.src || '') + (g.sprite?.src && sheetOf(g.sprite.src).ok ? '+' : '-') : '');

export const DREAM_SKY = [
  [-18, ['#0c0a2c', '#2b1f5e']], [-9, ['#18144c', '#46317e']], [-4, ['#332a74', '#b4729e']],
  [-0.5, ['#5552aa', '#f0a2b6']], [4, ['#7d98e4', '#fbcfd8']], [12, ['#8bb0f2', '#e6dcff']], [50, ['#83aaf4', '#dcd6ff']],
].map(([a, v]) => [a, v.map(hx2)]);
// how the light tints things: nights stay soft lavender rather than dark
const AMB = [[-18, [0.5, 0.5, 0.78]], [-7, [0.58, 0.56, 0.82]], [-1, [0.9, 0.74, 0.82]], [4, [1.02, 0.92, 0.9]], [12, [1, 1, 1]]];

export function planetPalette(season) {
  return {
    spring: { grass: ['#a6e4cc', '#d2f6e4', '#7cc3aa'], flowers: ['#ffb3d1', '#fff0a0', '#ffffff', '#c9b3ff'] },
    summer: { grass: ['#8cd8ae', '#c0f0d2', '#5eae8a'], flowers: ['#ffd36e', '#ff9fb8', '#ffffff'] },
    autumn: { grass: ['#f2c6a0', '#fce2c4', '#d89e7a'], flowers: ['#ff9a6a', '#f2c14a', '#e86a6a'] },
    winter: { grass: ['#eef1ff', '#ffffff', '#c6cdf0'], flowers: [], snowy: true },
  }[season];
}
const SOIL = ['#8a7ed0', '#6b5eb2', '#aa9fe8', '#574a9a'];

export class PlanetScene extends Scene {
  env() {
    const e = super.env();
    // repaint the sky and light in the dreamy palette, keeping the weather's greying
    let [top, bot] = frame(DREAM_SKY, e.alt);
    const g = [150, 150, 186].map((v) => v * clamp((e.alt + 14) / 20, 0.35, 1));
    top = mix(top, g, e.grey * 0.8); bot = mix(bot, g, e.grey * 0.6);
    let amb = frame(AMB, e.alt);
    if (e.grey) amb = amb.map((v, i) => v * (1 - e.grey * [0.22, 0.2, 0.12][i]));
    return { ...e, top, bot, amb, pal: planetPalette(e.season) };
  }

  frame(dt) {
    const e = this.env();
    this.loadAvatarImage();
    // keep the travel planets clear of the HUD boxes laid over the scene (re-measured now and then)
    if (!this.avoidAt || performance.now() - this.avoidAt > 1000) {
      this.avoidAt = performance.now();
      const r = this.cv.getBoundingClientRect(), k = r.width / (this.W || 1);
      this.avoid = k ? [...(this.cv.parentElement?.querySelectorAll('.hud') || [])].map((el) => { const b = el.getBoundingClientRect(); return { x: (b.left - r.left) / k - 3, y: (b.top - r.top) / k - 3, w: b.width / k + 6, h: b.height / k + 6 }; }).filter((b) => b.w > 6 && b.h > 6) : [];
      this.avoidKey = this.avoid.map((b) => [b.x, b.y, b.w, b.h].map(Math.round).join(',')).join(';');
    }
    const key = [this.W, Math.round(e.alt * 2), e.season, e.weather, e.realm.id, this.input.openQuests, this.input.unlocked, this.avoidKey, Math.floor(+e.date / 120000), JSON.stringify(this.input.avatar || {}), guideKey(this.input.guide), this.avImg?.ok, this.petImg?.ok].join('|');
    if (key !== this.key) { this.build(e); this.key = key; }
    this.drawDynamic(e, dt);
  }

  build(e) {
    const W = this.W, R = new Raster(W, H), rnd = rng(612);
    const tc = new Map();
    const T = (h) => { let c = tc.get(h); if (!c) { const b = hx2(h); c = [clamp(b[0] * e.amb[0], 0, 255), clamp(b[1] * e.amb[1], 0, 255), clamp(b[2] * e.amb[2], 0, 255)]; tc.set(h, c); } return c; };
    const s = (this.spots = { stars: [], windows: [], lights: [] });

    // sky in dithered bands, all the way down (the cloud sea covers the bottom)
    const N = 12, steps = Array.from({ length: N }, (_, i) => mix(e.top, e.bot, i / (N - 1)));
    for (let y = 0; y < H; y++) {
      const v = clamp(y / 96, 0, 1) ** 1.15 * (N - 1), lo = Math.floor(v), fr = v - lo;
      for (let x = 0; x < W; x++) R.put(x, y, steps[Math.min(N - 1, fr * 16 > BAYER[y & 3][x & 3] ? lo + 1 : lo)]);
    }

    // a milky way of soft pink and lilac dust after dark
    if (e.dark > 0.2) {
      const mr = rng(3);
      for (let i = 0; i < W * 1.4; i++) {
        const u = mr(), x = Math.floor(u * W), y = Math.round(8 + u * 50 + (mr() - 0.5) * 18);
        R.put(x, y, mr() < 0.5 ? [255, 190, 230] : [190, 180, 255], (0.08 + mr() * 0.14) * e.dark * (1 - e.grey));
      }
    }
    // stars: a few even by day, as in a dream
    const sr = rng(7), starA = clamp(0.18 + e.dark * 0.85, 0, 1) * (1 - e.grey * 0.8);
    for (let i = 0; i < W * 0.3; i++) {
      const x = Math.floor(sr() * W), y = Math.floor(sr() * 78), b = sr();
      // the brightest ones twinkle (drawn live, see drawDynamic)
      if (b > 0.86) s.stars.push({ x, y, p: sr() * 6, big: b > 0.95 });
      else R.put(x, y, b > 0.6 ? [255, 244, 210] : [220, 214, 255], starA * (0.25 + b * 0.6));
    }

    // sun (a soft pastel glow) and the real moon
    const dayLen = e.rise && e.set ? e.set - e.rise : 12 * 3600000;
    if (e.alt > -5) {
      const f = e.rise ? clamp((e.date - e.rise) / dayLen, 0, 1) : 0.5;
      const sx = Math.round(W * (0.1 + 0.8 * f)), sy = Math.round(clamp(70 - e.alt * 1.4, 10, 74));
      R.disk(sx, sy, 11, (x, y) => R.put(x, y, [255, 236, 214], 0.16 * (1 - e.grey)));
      R.disk(sx, sy, 7, (x, y) => R.put(x, y, [255, 240, 220], 0.3 * (1 - e.grey)));
      R.disk(sx, sy, 4, (x, y) => R.put(x, y, e.alt < 6 ? [255, 214, 170] : [255, 250, 232], 1 - e.grey * 0.7));
      s.sun = { x: sx, y: sy };
    }
    if (e.alt < 3) {
      let since = e.set ? e.date - e.set : 0; if (since < 0) since += 24 * 3600000;
      const f = clamp(since / (24 * 3600000 - dayLen), 0, 1);
      const mx = Math.round(W * (0.14 + 0.72 * f)), my = Math.round(14 + (1 - Math.sin(Math.PI * f)) * 22);
      const ph = moonPhase(e.date), k = Math.cos(2 * Math.PI * ph), south = e.realm.hemisphere === 'south';
      R.disk(mx, my, 9, (x, y) => R.put(x, y, [230, 220, 255], 0.1 * e.dark));
      R.disk(mx, my, 5, (x, y, nx, ny) => {
        const xn = south ? -nx : nx, limb = Math.sqrt(Math.max(0, 1 - ny * ny));
        const lit = ph < 0.5 ? xn > k * limb : xn < -k * limb;
        R.put(x, y, lit ? [255, 246, 220] : mix(e.top, [80, 70, 130], 0.4), (lit ? 1 : 0.8) * clamp(e.dark * 1.4, 0.2, 1) * (1 - e.grey * 0.6));
      });
    }

    // a far ringed planet and two drifting moonlets
    const ringX = Math.round(W * 0.8), ringY = 24;
    const pk = T('#f6b6c8'), pkD = T('#d98aa8'), ring = T('#ffe2a8');
    R.disk(ringX, ringY, 6, (x, y, nx, ny) => R.put(x, y, nx + ny > 0.4 ? pkD : pk, 0.9));
    for (let i = -11; i <= 11; i++) { const y = ringY + Math.round(i * 0.22); if (Math.abs(i) > 5 || i * 0.22 > 0.5) R.put(ringX + i, y + 1, ring, 0.85); }
    const moonlet = (x, y, r, col) => R.disk(x, y, r, (px, py, nx, ny) => R.put(px, py, T(nx + ny > 0.3 ? SOIL[1] : col)));
    moonlet(Math.round(W * 0.12), 40, 3, SOIL[2]);
    moonlet(Math.round(W * 0.9), 58, 2, '#c4b8f4');

    // the sea of clouds below
    const [c0, c1, c2] = ['#fde6f2', '#e6dcfa', '#c8bcf0'].map((h) => mix(T(h), e.bot, 0.25));
    // rows of round puffs, lit on top
    const sea = (yBase, seed, col, shade, hi) => {
      const r0 = rng(seed);
      for (let x = -6; x < W + 6; ) {
        const r = 4 + Math.floor(r0() * 6), cy0 = yBase + Math.floor(r0() * 3);
        R.disk(x, cy0, r, (px, py, nx, ny) => R.put(px, py, ny < -0.55 && nx < 0.3 ? hi : ny > 0.1 ? shade : col));
        for (let y = cy0; y < H; y++) for (let i = -r; i <= r; i++) R.put(x + i, y, y > cy0 + 2 ? shade : col);
        x += r + 1 + Math.floor(r0() * 3);
      }
    };
    sea(98, 5, c1, c2, mix(c1, [255, 255, 255], 0.5));
    sea(107, 9, c0, c1, mix(c0, [255, 255, 255], 0.6));

    // ---- the planet ----
    // a wide, flattened sphere sitting low (lots of sky), its gentle curve still spanning the view;
    // its rim is anti-aliased and the soil shaded in smooth dithered bands
    const cx = Math.round(W / 2), top0 = 86, Rx = Math.max(150, Math.round(W * 0.8)), Ry = Math.round(Rx * 0.3), cy = top0 + Ry, Rad = Rx;
    const surf = (x) => { const d = (x - cx) / Rx; return Math.abs(d) >= 1 ? Infinity : cy - Ry * Math.sqrt(1 - d * d); };
    s.planet = { cx, cy, r: Rx, ry: Ry }; s.surf = surf;
    const [g0, g1, g2] = e.pal.grass.map(T), [sm, sd, sl, sk] = SOIL.map(T);
    const nr = rng(99);
    // soil light from the upper left: 0..4 bands, dithered between them
    const soilAt = (x, y) => {
      const dx = (x - cx) / Rx, dy = (y - cy) / Ry;
      const light = -dx * 0.75 - dy * 0.55, v = clamp((light + 0.55) * 2.4, 0, 3.99), lo = Math.floor(v);
      const k = (v - lo) * 16 > BAYER[y & 3][x & 3] ? lo + 1 : lo;
      return [sd, mix(sd, sm, 0.5), sm, mix(sm, sl, 0.5), sl][k];
    };
    s.soilAt = soilAt;
    for (let x = Math.max(0, cx - Rx); x <= Math.min(W - 1, cx + Rx); x++) {
      const top = surf(x); if (top >= H) continue;
      const t0 = Math.floor(top), cover = 1 - (top - t0);
      R.put(x, t0, g1, cover); // the soft edge of the curve
      for (let y = t0 + 1; y < H; y++) {
        const depth = y - t0;
        R.put(x, y, depth === 1 ? g1 : depth < 5 ? ((x * 7 + y * 3) % 11 === 0 ? g2 : g0) : depth === 5 ? g2 : soilAt(x, y));
      }
    }
    // craters and little crystals in the soil
    for (const [ox, oy, r] of [[-0.45, 0.2, 4], [0.3, 0.16, 3], [0.62, 0.26, 2], [-0.12, 0.3, 3], [-0.75, 0.32, 2], [0.12, 0.22, 2], [-0.3, 0.12, 2]]) {
      const x0 = Math.round(cx + ox * Rx * 0.8), y0 = Math.round(surf(x0) + 9 + oy * 40);
      if (y0 > H - 2) continue;
      R.disk(x0, y0, r, (x, y, nx, ny) => { if (y >= surf(x) + 6) R.put(x, y, ny < -0.3 ? sk : nx + ny > 0.6 ? sl : sd); });
    }
    for (let i = 0; i < Math.round(Rx / 7); i++) { const x = cx + Math.round((rnd() - 0.5) * Rx * 1.4), y = Math.round(surf(x) + 8 + rnd() * 20); if (y < H) { R.put(x, y, T('#e8f4ff')); R.put(x, y - 1, T('#bfe0ff')); } }

    // grass tufts and flowers along the curve
    const fl = e.pal.flowers.map(T);
    for (let x = Math.max(0, cx - Rad + 2); x < Math.min(W, cx + Rad - 2); x++) {
      const top = Math.floor(surf(x)); if (top >= H) continue;
      if (nr() < 0.12) R.put(x, top - 1, g1, 0.8);
      if (fl.length && nr() < (e.season === 'spring' ? 0.2 : 0.09)) { const c = fl[Math.floor(nr() * fl.length)]; R.put(x, top + 2 + Math.floor(nr() * 2), c); }
    }

    // ground under a footprint, so things never float over the curve
    const settle = (x0, w) => { let base = 0; for (let x = x0; x < x0 + w; x++) base = Math.max(base, Math.round(surf(x))); return base; };
    const mound = (x0, w, base) => { for (let x = x0 - 1; x <= x0 + w; x++) for (let y = Math.round(surf(x)) - 1; y > base - 2 && y >= base - 6; y--) R.put(x, y, y === base - 1 ? g1 : g0); };

    // layout along the top of the planet: the rose in the middle, the dome house to the left,
    // and to the right you (between the rose and the wish board), the familiar and the star lamp
    const hero = heroCanvases(this.input, this.avImg, T, e.amb, this.dpx);
    const roseX = cx, houseX = cx - Math.max(Math.round(W * 0.2), 46) - 13;
    const heroX = roseX + 7, boardX = Math.max(cx + Math.max(Math.round(W * 0.09), 20), heroX + hero.w + 4);

    // a rose under a glass bell
    { const b = settle(roseX - 3, 7); mound(roseX - 3, 7, b);
      const glass = T('#e6f2ff');
      for (let y = b - 11; y < b; y++) for (let x = roseX - 3; x <= roseX + 3; x++) {
        const edge = Math.abs(x - roseX) === 3 || y === b - 11 || (y === b - 10 && Math.abs(x - roseX) === 3);
        if (y === b - 11 && Math.abs(x - roseX) > 1) continue;
        if (y === b - 10 && Math.abs(x - roseX) > 2) continue;
        R.put(x, y, glass, edge ? 0.7 : 0.18);
      }
      R.rect(roseX - 4, b - 1, 9, 1, T('#b7a8e0'));
      R.rect(roseX, b - 6, 1, 5, T('#4f9a6a')); R.put(roseX + 1, b - 4, T('#6cc08a')); R.put(roseX - 1, b - 3, T('#6cc08a'));
      R.rect(roseX - 1, b - 9, 3, 3, T('#f07a9a')); R.put(roseX, b - 9, T('#c84a72')); R.put(roseX - 1, b - 9, T('#ff9ab8'));
      R.put(roseX + 1, b - 10, glass); R.put(roseX - 2, b - 8, T('#ffffff'), 0.6);
      s.rose = { x: roseX, y: b - 8 };
    }

    // the dome house: a round cream cottage under a glass observatory dome, with a telescope.
    // It is set into the slope: its floor is level with the downhill side, and on the uphill side
    // the hill's own grass and soil come up over its foundation (painted after the house).
    { const w = 26;
      // the floor sits a little into the hill at the middle: uphill the grass laps over the
      // foundation, downhill a stone footing steps down to meet the slope
      const b = Math.floor(surf(houseX + (w >> 1))) + 3;
      const footing = () => {
        for (let x = houseX - 1; x <= houseX + w; x++) {
          const g = Math.floor(surf(x)); if (g < b) continue;
          for (let y = b; y <= g + 1; y++) R.put(x, y, (x + (y >> 1) * 2) % 5 === 0 || (y - b) % 3 === 2 ? T('#9a8cc8') : T('#c2b6e8'));
          R.put(x - 1 < houseX - 1 ? x - 1 : x, g + 1, g1);
        }
      };
      const embed = () => {
        footing();
        for (let x = houseX - 1; x <= houseX + w; x++) {
          const t0 = Math.floor(surf(x)); if (t0 >= b) continue;
          for (let y = t0 + 1; y <= b; y++) { const depth = y - t0; R.put(x, y, depth === 1 ? g1 : depth < 5 ? g0 : depth === 5 ? g2 : soilAt(x, y)); }
          if (fl.length && (x * 5) % 7 === 0) R.put(x, t0 + 2, fl[x % fl.length]);
        }
      };
      const wall = T('#f4eeff'), wallD = T('#d8cdf2'), wallL = T('#ffffff'), band = T('#8a7ae0'), bandD = T('#6a5ac0');
      for (let y = b - 16; y < b; y++) for (let x = houseX; x < houseX + w; x++) {
        const u = (x - houseX) / (w - 1);
        R.put(x, y, u > 0.78 ? wallD : u < 0.12 ? wallL : wall);
      }
      R.rect(houseX - 1, b - 17, w + 2, 2, band); R.rect(houseX - 1, b - 15, w + 2, 1, bandD);
      R.rect(houseX - 1, b - 2, w + 2, 2, T('#b7a8e0'));
      // glass dome
      const dcx = houseX + 13, dcy = b - 17, dr = 11;
      const lit = e.dark > 0.3;
      for (let y = dcy - dr; y < dcy; y++) for (let x = dcx - dr; x <= dcx + dr; x++) {
        const dx = (x - dcx) / dr, dy = (y - dcy) / dr, d = dx * dx + dy * dy;
        if (d > 1.02) continue;
        const rim = d > 0.8;
        const glass = lit ? mix(T('#9fc4f2'), [255, 220, 160], 0.35) : T('#cfe6ff');
        R.put(x, y, rim ? T('#7f74c8') : (Math.abs(x - dcx) % 6 === 0 ? T('#a8b8ea') : glass), rim ? 1 : 0.92);
      }
      R.put(dcx - 5, dcy - 7, T('#ffffff')); R.put(dcx - 4, dcy - 8, T('#ffffff')); R.put(dcx - 6, dcy - 5, T('#ffffff'));
      // a star finial on the dome
      R.put(dcx, dcy - dr - 1, T('#ffe08a')); R.put(dcx, dcy - dr - 2, T('#ffe08a')); R.put(dcx - 1, dcy - dr - 1, T('#ffe08a')); R.put(dcx + 1, dcy - dr - 1, T('#ffe08a'));
      // the telescope poking out of the dome
      for (let i = 0; i < 9; i++) { R.put(dcx + 4 + i, dcy - 5 - Math.round(i * 0.6), T('#5a5a8a')); R.put(dcx + 4 + i, dcy - 4 - Math.round(i * 0.6), T('#3f3f6a')); }
      R.put(dcx + 8, dcy - 7, T('#ffd86a')); R.put(dcx + 8, dcy - 6, T('#e0b04a'));
      // round door and portholes
      const dx0 = houseX + 11;
      for (let y = b - 11; y < b - 1; y++) for (let x = dx0; x < dx0 + 5; x++) {
        if (y === b - 11 && (x === dx0 || x === dx0 + 4)) continue;
        R.put(x, y, (x - dx0) === 2 ? T('#6a5ac0') : T('#8a7ae0'));
      }
      R.put(dx0 + 3, b - 6, T('#ffe08a'));
      const glassW = lit ? [255, 214, 140] : T('#bcd8ff');
      for (const wx of [houseX + 4, houseX + 20]) {
        R.disk(wx, b - 8, 2, (x, y) => R.put(x, y, T('#8a7ae0')));
        R.disk(wx, b - 8, 1, (x, y) => R.put(x, y, glassW));
        if (!lit) R.put(wx - 1, b - 9, T('#ffffff'));
        s.windows.push({ x: wx, y: b - 8 });
      }
      s.dome = { x: dcx, y: dcy - 4 };
      s.chimney = { x: dcx + 12, y: dcy - 11 }; // the telescope's tip: little sparkles drift up from it
      // a wee flower bed by the door
      if (fl.length) for (let x = houseX + 1; x < houseX + 10; x += 2) { R.put(x, b - 3, fl[(x >> 1) % fl.length]); R.put(x, b - 2, g2); }
      embed();
    }

    // the wish board: a little signboard with a star on top; open quests are notes pinned to it
    const bw = 20;
    { const b = settle(boardX, bw); mound(boardX, bw, b);
      const post = T('#7a6ab8'), frameC = T('#5a4a9a'), face = T('#f8f2ff'), faceD = T('#e6dcfa');
      R.rect(boardX + 1, b - 15, 2, 15, post); R.rect(boardX + bw - 3, b - 15, 2, 15, post);
      R.rect(boardX - 1, b - 20, bw + 2, 13, frameC);
      R.rect(boardX, b - 19, bw, 11, face);
      for (let x = boardX; x < boardX + bw; x += 3) R.put(x, b - 9, faceD);
      const sx = boardX + bw / 2;
      for (const [x, y] of [[0, -24], [-1, -23], [0, -23], [1, -23], [-2, -22], [-1, -22], [0, -22], [1, -22], [2, -22], [-1, -21], [1, -21]]) R.put(sx + x, b + y, T('#ffd86a'));
      const n = Math.min(6, this.input.openQuests || 0);
      s.notes = [];
      const pins = ['#f07a9a', '#7ab0f0', '#b48af0'];
      for (let i = 0; i < n; i++) {
        const px = boardX + 1 + (i % 3) * 6, py = b - 18 + Math.floor(i / 3) * 5 + (i & 1);
        R.rect(px, py, 4, 4, T('#fffbe8')); R.put(px + 1, py + 2, T('#b9b0d8')); R.put(px + 2, py + 2, T('#b9b0d8')); R.put(px + 1, py, T(pins[i % 3])); R.put(px + 2, py, T(pins[i % 3]));
        s.notes.push({ x: px, y: py, w: 4, h: 4 });
      }
      s.board = { x: Math.round(sx), y: b - 31, n, rect: { x: boardX - 2, y: b - 34, w: bw + 4, h: 34 } };
      s.boardBase = b;
    }

    // you, between the rose and the board (unless you've chosen to stay off-screen)
    { const x0 = heroX, b = settle(x0, hero.w); if (!hero.hidden) mound(x0, hero.w, b);
      s.hero = { x: x0, y: b - hero.h, w: hero.w, h: hero.h, hand: hero.hand, hidden: !!hero.hidden }; }
    this.heroCv = hero.cvs; this.heroHi = hero.hi;
    const pet = this.buildPet(e);
    if (pet) {
      this.catCv = null;
      const x0 = boardX + bw + 3, b = settle(x0, pet.w); mound(x0, pet.w, b);
      s.cat = { x: x0, y: b - pet.h, w: pet.w, h: pet.h, pet: true };
    } else if (this.input.avatar?.familiar !== false) {
      const pal = CAT.pal(this.input.avatar?.familiarColor || '#2a2230');
      this.catCv = CAT.frames.map((rows) => {
        const cv = document.createElement('canvas'); cv.width = 8; cv.height = 6;
        const g = cv.getContext('2d');
        rows.forEach((row, j) => { for (let i = 0; i < 8; i++) if (row[i] !== '.') { g.fillStyle = row[i] === 'y' ? pal.y : css(T(pal.k)); g.fillRect(i, j, 1, 1); } });
        return cv;
      });
      const x0 = boardX + bw + 3, b = settle(x0, 8); mound(x0, 8, b);
      s.cat = { x: x0, y: b - 6, w: 8, h: 6 };
    } else { this.catCv = null; s.cat = null; }

    // the star lamp
    { const lampX = Math.min(W - 6, cx + Rad - 20, (s.cat ? s.cat.x + s.cat.w : boardX + bw) + 12), b = settle(lampX - 1, 3); mound(lampX - 1, 3, b);
      const post = T('#6a5aa8');
      R.rect(lampX, b - 18, 1, 18, post); R.rect(lampX - 1, b - 1, 3, 1, post);
      const on = e.dark > 0.3, starC = on ? [255, 226, 130] : T('#f6e7b0');
      for (const [x, y] of [[0, -23], [-1, -22], [0, -22], [1, -22], [-2, -21], [-1, -21], [0, -21], [1, -21], [2, -21], [-1, -20], [0, -20], [1, -20], [-1, -19], [1, -19]]) R.put(lampX + x, b + y, starC);
      s.lamp = { x: lampX, y: b - 21 };
    }

    // the guide: walking frames pre-tinted for this light
    this.buildGuide(T);
    // he strolls between the dome house and you (never in front of you); with you off-screen, up to the board
    { const gw = this.guideCv?.w || 16, lo = houseX + 30, hi = (hero.hidden ? boardX : heroX) - gw - 2; s.walk = { min: Math.min(lo, hi), max: Math.max(lo, hi) }; }

    s.worlds = this.buildWorlds(T, W, surf, houseX - 4, boardX + bw + 2, [s.lamp && { x: s.lamp.x - 4, y: s.lamp.y - 4, w: 9, h: 40 }, s.cat && { x: s.cat.x - 2, y: s.cat.y - 2, w: s.cat.w + 4, h: s.cat.h + 4 }].filter(Boolean));
    s.ground = (x) => Math.min(H, Math.round(surf(x)));
    s.W = W;
    const ctx = this.bg.getContext('2d');
    this.bg.width = W; this.bg.height = H;
    ctx.putImageData(R.img, 0, 0);
    this.T = T; this.e = e;
  }

  // the guide's frames, cut from his original sprite sheet, scaled smoothly to `gh` scene pixels tall
  // and tinted for this light. They are drawn on the fine overlay (see Scene.blitGuide), so `w`/`h`
  // are in scene pixels but each canvas holds device pixels. null until the sheet loads.
  buildGuide(T, gh = GUIDE_H) {
    this.guideCv = null;
    const sp = this.input.guide?.sprite;
    if (!sp?.src) return;
    const sh = sheetOf(sp.src);
    if (!sh.ok) return;
    const P = posesOf(sp, sh.img), k = T('#ffffff').map((v) => v / 255), dpx = this.dpx || 1;
    // true pixel art keeps its own size (one sheet pixel = one scene pixel), drawn crisp
    const h = sp.pixel ? P.fh : gh, w = sp.pixel ? P.fw : Math.max(1, Math.round((P.fw * gh) / P.fh));
    const pw = Math.round(w * dpx), ph = Math.round(h * dpx), sc = ph / P.fh;
    const made = new Map();
    const frame = (f) => {
      const i = typeof f === 'object' ? f.i : f, lift = typeof f === 'object' ? f.dy || 0 : 0, key = i + ':' + lift;
      if (made.has(key)) return made.get(key);
      const o = P.boxes[i], cv = document.createElement('canvas'); cv.width = pw; cv.height = ph;
      const c = cv.getContext('2d', { willReadFrequently: true });
      c.imageSmoothingEnabled = !sp.pixel; c.imageSmoothingQuality = 'high';
      // feet on the bottom edge, head centred: frames swap without the figure jumping
      const sk = sc * o.k;
      let dx = pw / 2 - (o.hc - o.l) * sk, dy = ph - (o.b + 1 - o.t) * sk + lift * sc;
      if (sp.pixel) { dx = Math.round(dx / sc) * sc; dy = Math.round(dy / sc) * sc; }
      c.drawImage(o.cut, dx, dy, (o.r + 1 - o.l) * sk, (o.b + 1 - o.t) * sk);
      if (k.some((v) => v < 0.99)) {
        const im = c.getImageData(0, 0, pw, ph), d = im.data;
        for (let q = 0; q < d.length; q += 4) { d[q] *= k[0]; d[q + 1] *= k[1]; d[q + 2] *= k[2]; }
        c.putImageData(im, 0, 0);
      }
      made.set(key, cv);
      return cv;
    };
    const pick = (ix) => (ix || []).map(frame);
    // sp.mirrorLeft / sp.mirrorRight: one direction is the other mirrored, so both ways match exactly
    const mirror = (cv) => { const m = document.createElement('canvas'); m.width = cv.width; m.height = cv.height; const mc = m.getContext('2d'); mc.scale(-1, 1); mc.drawImage(cv, -cv.width, 0); return m; };
    this.guideCv = {
      // seat: how far to raise him behind desks and counters (big-headed chibi sheets sit lower)
      // stride: scene px walked per frame, so the steps keep pace with the ground (no sliding)
      w, h, seat: sp.seat || 0, stride: sp.stride || 3, side: frame(sp.side), walk: pick(sp.walk), walkLeft: sp.mirrorLeft ? pick(sp.walk).map(mirror) : pick(sp.walkLeft || sp.walk),
      ...(sp.mirrorRight ? { walk: pick(sp.walkLeft).map(mirror) } : {}), front: frame(sp.front), wave: pick(sp.wave),
      frontWalk: pick(sp.frontWalk), back: frame(sp.back), backWalk: pick(sp.backWalk),
    };
  }

  // the guide strolls along the curve, pausing now and then to look at the sky
  stepGuide(dt) {
    const s = this.spots, w = s.walk;
    const g = (this.guide ||= { x: w.min, to: null, wait: 2, dir: 1, ph: 0 });
    g.x = clamp(g.x, w.min, w.max);
    if (this.guideTalk > 0) { this.guideTalk -= dt; return g; }
    if (g.wait > 0) {
      g.wait -= dt;
      if (g.wait <= 0) {
        g.to = w.min + Math.random() * (w.max - w.min);
        // he may pass the rose, but never stops on top of it
        const gw = this.guideCv?.w || 16, r = s.rose?.x;
        if (r != null && g.to + gw > r - 4 && g.to < r + 5) g.to = Math.random() < 0.5 || r + 5 > w.max ? Math.max(w.min, r - 4 - gw) : r + 5;
        g.dir = g.to > g.x ? 1 : -1;
      }
      return g;
    }
    const step = 9 * dt * g.dir;
    if (Math.abs(g.to - g.x) <= Math.abs(step)) { g.x = g.to; g.wait = 3 + Math.random() * 6; }
    else { g.x += step; g.ph += Math.abs(step); }
    return g;
  }

  drawDynamic(e, dt) {
    const c = this.ctx, W = this.W, s = this.spots, t = this.t;
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    c.drawImage(this.bg, 0, 0);

    // twinkling four-point stars (they drift a touch with the cursor, like the travel planets)
    const par = this.parallax(dt), sx = Math.round(par.x * 1.2), sy = Math.round(par.y * 0.6);
    const starA = clamp(0.25 + e.dark, 0, 1) * (1 - e.grey * 0.8);
    for (const st0 of s.stars) {
      const st = { ...st0, x: st0.x + sx, y: st0.y + sy };
      const a = (0.5 + 0.5 * Math.sin(t * 2 + st.p)) * starA;
      if (a < 0.08) continue;
      c.fillStyle = `rgba(255,248,226,${a})`; c.fillRect(st.x, st.y, 1, 1);
      if (a > 0.6 || st.big) { c.fillStyle = `rgba(255,236,250,${a * 0.55})`; c.fillRect(st.x - 1, st.y, 3, 1); c.fillRect(st.x, st.y - 1, 1, 3); }
      if (st.big && a > 0.7) { c.fillStyle = `rgba(255,236,250,${a * 0.25})`; c.fillRect(st.x - 2, st.y, 5, 1); c.fillRect(st.x, st.y - 2, 1, 5); }
    }
    this.drawShootingStar(e, dt);
    this.drawClouds(e, dt);
    this.drawWorlds(c, t);

    if (e.weather === 'fog') for (let i = 0; i < 4; i++) {
      const y = 70 + i * 10, off = (t * (3 + i) + i * 40) % (W + 80) - 40;
      c.fillStyle = css(mix(e.bot, [240, 230, 250], 0.5), 0.26);
      c.fillRect(Math.round(off), y, 70, 3); c.fillRect(Math.round(off) - 120, y + 2, 90, 2);
    }

    // warm glows after dark
    if (e.dark > 0.3) {
      c.globalCompositeOperation = 'lighter';
      const fl = 0.88 + 0.12 * Math.sin(t * 7) * Math.sin(t * 2.3);
      const glow = (x, y, r, a, col = '255,200,120') => {
        const g = c.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(${col},${a * fl})`); g.addColorStop(1, `rgba(${col},0)`);
        c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
      };
      for (const w of s.windows) glow(w.x, w.y, 9, 0.3 * e.dark);
      glow(s.dome.x, s.dome.y, 16, 0.22 * e.dark, '200,190,255');
      glow(s.lamp.x, s.lamp.y, 16, 0.5 * e.dark);
      glow(s.rose.x, s.rose.y, 6, 0.3 * e.dark, '255,150,190');
      if (!s.hero.hidden) glow(s.hero.x + s.hero.hand[0] + 1, s.hero.y + s.hero.hand[1] + 1, 7, 0.4 * e.dark);
      c.globalCompositeOperation = 'source-over';
    }

    this.drawSparkles(e, dt);

    // the guide, strolling (drawn behind you and the board when passing)
    const g = this.stepGuide(dt), gc = this.guideCv;
    if (gc) {
      const gx = Math.round(g.x), base = Math.round(s.surf(g.x + gc.w / 2)) + 1;
      const moving = g.wait <= 0 && !(this.guideTalk > 0);
      const cyc = moving ? (g.dir < 0 ? gc.walkLeft : gc.walk) : null;
      const cv = this.guideTalk > 0 ? gc.wave[Math.floor(t * 3) % 2] : moving ? cyc[Math.floor(g.ph / gc.stride) % cyc.length] : (t % 14) < 3 ? gc.side : gc.front; // a glance along the path now and then, never his back to you
      this.blitGuide(cv, g.x, base - gc.h);
      s.guide = { x: gx, y: base - gc.h, w: gc.w, h: gc.h };
      if (this.hover?.type === 'guide') { c.fillStyle = 'rgba(255,240,180,0.22)'; c.fillRect(gx - 1, base - gc.h - 1, gc.w + 2, gc.h + 2); }
      if (this.guideTalk > 0) { // a little speech star over his head
        const y = base - gc.h - 5 + Math.round(Math.sin(t * 5)), hx = gx + (gc.w >> 1) - 3;
        c.fillStyle = '#ffffff'; c.fillRect(hx - 1, y, 7, 5); c.fillRect(hx, y + 5, 2, 1);
        c.fillStyle = '#f07a9a'; c.fillRect(hx + 1, y + 1, 1, 1); c.fillRect(hx + 3, y + 1, 1, 1); c.fillRect(hx + 1, y + 2, 3, 1); c.fillRect(hx + 2, y + 3, 1, 1);
      }
    } else s.guide = null;

    // you, by the rose and the wish board (with a star lantern after dark), and the familiar
    const bob = Math.floor(t * 1.6) % 2;
    const hcv = this.heroCv[Math.floor(t * 10) % 37 === 0 ? 1 : 0];
    const h = s.hero, legs = Math.min(4, Math.floor(h.h / 6));
    if (h.hidden) this.heroBox = null;
    else if (this.heroHi) this.blitHero(c, hcv, h.x, h.y + bob);
    else {
      this.heroBox = { x: h.x, y: h.y, w: h.w, h: h.h };
      c.drawImage(hcv, 0, 0, h.w, h.h - legs, h.x, h.y + bob, h.w, h.h - legs);
      c.drawImage(hcv, 0, h.h - legs, h.w, legs, h.x, h.y + h.h - legs, h.w, legs);
    }
    if (this.hover?.type === 'hero' && !h.hidden) { c.fillStyle = 'rgba(255,240,180,0.25)'; c.fillRect(h.x - 1, h.y - 1 + bob, h.w + 2, h.h + 2); }
    if (e.dark > 0.3 && !h.hidden) { const [lx, ly] = h.hand; c.fillStyle = '#6a5aa8'; c.fillRect(h.x + lx, h.y + ly - 1 + bob, 2, 1); c.fillStyle = '#ffe08a'; c.fillRect(h.x + lx, h.y + ly + bob, 2, 2); }
    if ((this.catCv || this.pet) && s.cat) {
      const hop = this.catHop > 0 ? Math.round(Math.sin((1 - this.catHop) * Math.PI) * 4) : 0;
      if (this.catHop > 0) this.catHop -= 0.08;
      if (s.cat.pet) this.drawPet(c, s.cat.x, s.cat.y + s.cat.h, hop);
      else c.drawImage(this.catCv[Math.floor(t * 1.3) % 2], s.cat.x, s.cat.y - hop);
      if (hop) { c.fillStyle = '#f07a9a'; const hx = s.cat.x + Math.round(s.cat.w / 2) - 1; c.fillRect(hx - 1, s.cat.y - hop - 4, 1, 1); c.fillRect(hx + 1, s.cat.y - hop - 4, 1, 1); c.fillRect(hx - 1, s.cat.y - hop - 3, 3, 1); c.fillRect(hx, s.cat.y - hop - 2, 1, 1); }
    }

    if (this.hover?.type === 'board' || this.hover?.type === 'note') {
      const r = s.board.rect;
      c.strokeStyle = 'rgba(255,226,140,0.95)'; c.lineWidth = 1;
      c.strokeRect(r.x + 0.5, r.y + 12.5, r.w - 1, r.h - 13);
      if (this.hover.type === 'note') { const nt = s.notes[this.hover.index]; c.fillStyle = 'rgba(255,244,190,0.6)'; c.fillRect(nt.x - 1, nt.y - 1, nt.w + 2, nt.h + 2); }
    }
    // a bobbing star over the board when wishes are waiting
    if (s.board.n > 0) {
      const y = s.board.y - 2 + Math.round(Math.sin(t * 4)), x = s.board.x;
      c.fillStyle = '#5a4a9a'; c.fillRect(x - 3, y - 1, 7, 7);
      c.fillStyle = '#ffe08a'; c.fillRect(x, y, 1, 5); c.fillRect(x - 2, y + 2, 5, 1); c.fillRect(x - 1, y + 1, 3, 3);
    }

    if (e.wet || e.weather === 'snow') this.drawRain(e, dt);
    if (e.weather === 'storm' && Math.random() < 0.006) { c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(0, 0, W, H); }
  }

  // a shooting star every little while: make a wish
  drawShootingStar(e, dt) {
    const c = this.ctx;
    this.shootT = (this.shootT ?? 3) - dt;
    if (this.shootT <= 0 && !this.shot) { this.shot = { x: Math.random() * this.W * 0.7 + this.W * 0.2, y: 4 + Math.random() * 24, age: 0 }; this.shootT = 7 + Math.random() * 12; }
    const sh = this.shot; if (!sh) return;
    sh.age += dt;
    const k = sh.age * 60, a = clamp(1 - sh.age / 0.9, 0, 1) * clamp(0.45 + e.dark, 0, 1) * (1 - e.grey * 0.7);
    for (let i = 0; i < 9; i++) { c.fillStyle = `rgba(255,246,220,${a * (1 - i / 9)})`; c.fillRect(Math.round(sh.x - k + i), Math.round(sh.y + (k - i) * 0.45), 1, 1); }
    if (sh.age > 0.9) this.shot = null;
  }

  // drifting star-dust motes (and falling petals in spring/autumn)
  drawSparkles(e, dt) {
    const c = this.ctx, W = this.W, t = this.t, s = this.spots;
    if (this.parts.length < (e.season === 'spring' || e.season === 'autumn' ? 18 : 10) && Math.random() < 0.25) {
      const petal = (e.season === 'spring' || e.season === 'autumn') && Math.random() < 0.5;
      this.parts.push({ x: Math.random() * W, y: petal ? -2 : 40 + Math.random() * 60, vx: 1 + Math.random() * 3, vy: petal ? 4 + Math.random() * 3 : -1.5 - Math.random() * 2, ph: Math.random() * 6, petal, age: 0, col: petal ? e.pal.flowers[Math.floor(Math.random() * e.pal.flowers.length)] || '#ffffff' : null });
    }
    this.parts = this.parts.filter((p) => p.age < 9 && p.y > -4 && p.y < Math.min(H, s.ground(Math.round(p.x)) + 2) && p.x < W + 4);
    for (const p of this.parts) {
      p.age += dt; p.x += (p.vx + Math.sin(t * 2 + p.ph) * 3) * dt; p.y += p.vy * dt;
      if (p.petal) { c.fillStyle = css(this.T(p.col)); c.fillRect(Math.round(p.x), Math.round(p.y), Math.sin(t * 5 + p.ph) > 0 ? 2 : 1, 1); }
      else { const a = (0.4 + 0.6 * Math.abs(Math.sin(t * 3 + p.ph))) * Math.min(1, (9 - p.age) / 2); c.fillStyle = `rgba(255,240,200,${a})`; c.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); }
    }
  }

  hitTest(clientX, clientY) {
    const s = this.spots; if (!s) return null;
    const r = this.cv.getBoundingClientRect();
    const x = (clientX - r.left) / this.scale, y = (clientY - r.top) / this.scale;
    const inR = (o, pad = 1) => o && x >= o.x - pad && x < o.x + o.w + pad && y >= o.y - pad && y < o.y + o.h + pad;
    const ni = s.notes.findIndex((n) => inR(n, 0.5));
    if (ni >= 0) return { type: 'note', index: ni };
    if (inR(s.board.rect)) return { type: 'board' };
    if (inR(s.cat, 2)) return { type: 'cat' };
    if (!s.hero.hidden && inR(s.hero)) return { type: 'hero' };
    if (inR(s.guide)) return { type: 'guide' };
    const w = (s.worlds || []).find((o) => inR({ x: o.x + (o.dx || 0), y: o.y + (o.dy || 0), w: o.w, h: o.h }, 3));
    if (w) return { type: 'world', id: w.id, locked: w.i >= (this.input.unlocked ?? 0) };
    return null;
  }

  // The travel planets floating behind home (see js/worlds.js), each with a tiny hint of its
  // landscape. They sit in open sky: clear of the HUD boxes, the sun's ringed neighbour and
  // everything standing on the planet. Ones not yet unlocked hide inside little clouds.
  buildWorlds(T, W, surf, busyL, busyR, props = []) {
    const list = this.input.worlds || [], avoid = [...(this.avoid || []), ...props, { x: W * 0.8 - 13, y: 16, w: 26, h: 16 }];
    const free = (x, y) => x > 9 && x < W - 9 && y > 10
      && !avoid.some((b) => x + 8 > b.x && x - 8 < b.x + b.w && y + 8 > b.y && y - 11 < b.y + b.h)
      && (x + 9 < busyL || x - 9 > busyR ? y + 10 < Math.min(96, surf(x) - 4) : y + 10 < surf(x) - 44);
    const cands = [];
    for (let y = 12; y < 92; y += 3) for (let x = 10; x < W - 9; x += 3) if (free(x, y)) cands.push([x, y]);
    const anchors = [[0.3, 24], [0.62, 16], [0.42, 46], [0.72, 44]], taken = [];
    return list.map((w, i) => {
      const [ax, ay] = anchors[i % anchors.length]; let best = null, bd = Infinity;
      // (on narrow screens there may be room for fewer; the rest wait for a wider view)
      for (const [x, y] of cands) {
        if (taken.some(([tx, ty]) => Math.hypot(tx - x, ty - y) < 19)) continue;
        const d = Math.hypot(x - ax * W, (y - ay) * 1.4); if (d < bd) { bd = d; best = [x, y]; }
      }
      if (!best) return null;
      taken.push(best);
      const [cx0, cy0] = best, o = { id: w.id, x: cx0 - 8, y: cy0 - 9, w: 16, h: 17, cx: cx0, cy: cy0, i, depth: 0.6 + (i % 3) * 0.35 };
      const R = new Raster(22, 22), c = 11, r = 6;
      const [body, light, acc] = w.look.map(T), dark = mix(body, [34, 26, 80], 0.45);
      R.disk(c, c, r, (px, py, nx, ny) => { const l = -nx * 0.7 - ny * 0.7; R.put(px, py, l > 0.5 ? light : l < -0.4 ? dark : body); });
      if (w.id === 'forest') { // tall pines with glowing ferns
        for (const [dx, h] of [[-3, 4], [0, 6], [3, 4]]) for (let k = 0; k < h; k++) { R.put(c + dx, c - r + 2 - k, T('#2c5a50')); if (k < h - 2 && k % 2 === 0) { R.put(c + dx - 1, c - r + 2 - k, T('#2c5a50')); R.put(c + dx + 1, c - r + 2 - k, T('#2c5a50')); } }
        R.put(c - 2, c + 1, acc); R.put(c + 2, c + 3, acc); R.put(c + 3, c - 1, T('#e0c8ff'));
      } else if (w.id === 'pool') { // a round pool of water and a striped umbrella
        for (let px = c - 4; px <= c + 2; px++) { R.put(px, c, acc); R.put(px, c + 1, acc); } R.put(c - 2, c, T('#ffffff'));
        for (let k = -3; k <= 3; k++) R.put(c + 3 + k, c - r - 1 + (Math.abs(k) > 2 ? 1 : 0), (k + 3) % 2 ? T('#f4ece0') : T('#e2584a'));
        R.put(c + 3, c - r, T('#8a8278')); R.put(c + 3, c - r + 1, T('#8a8278'));
      } else if (w.id === 'park') { // a little carousel roof and a ring of lights
        for (let k = -4; k <= 4; k++) for (let y = c - r - 4 + Math.abs(k) * 0.5; y <= c - r; y++) R.put(c + k, Math.round(y), (k + 4) % 2 ? T('#fbe6f0') : T('#e87aa8'));
        R.put(c, c - r - 5, acc);
        for (const dx of [-4, -1, 3]) R.put(c + dx, c + 2, acc);
      } else if (w.id === 'sanctuary') { // an open umbrella resting on top
        for (let k = -4; k <= 4; k++) { const top = c - r - Math.round(Math.sqrt(16 - k * k) * 0.6); for (let y = top; y <= c - r; y++) R.put(c + k, y, Math.abs(k) % 3 === 0 ? T('#8aa8e4') : T('#ffffff')); }
        R.put(c + 3, c - r + 1, T('#8a7a6a')); R.put(c + 4, c - r + 2, T('#8a7a6a'));
        R.put(c - 2, c + 2, acc);
      }
      const cv = document.createElement('canvas'); cv.width = 22; cv.height = 22; cv.getContext('2d').putImageData(R.img, 0, 0);
      return { ...o, cv, glow: hexRgb(w.look[2]), cloud: [mix(T('#fdf0f8'), [255, 255, 255], 0.3), T('#e6dcfa'), T('#c8bcf0')].map((v) => css(v)) };
    }).filter(Boolean);
  }

  // a soft drift with the cursor (nearer planets move more), eased so it never jumps
  parallax(dt) {
    const p = this.ptr, W = this.W || 1, tx = p ? -(p.x / W - 0.5) * 2 : 0, ty = p ? -(p.y / H - 0.5) * 2 : 0;
    const q = (this.par ||= { x: 0, y: 0 }), k = Math.min(1, dt * 3);
    q.x += (tx - q.x) * k; q.y += (ty - q.y) * k;
    return q;
  }

  drawWorlds(c, t) {
    const n = this.input.unlocked ?? 0, q = this.par || { x: 0, y: 0 };
    for (const o of this.spots.worlds || []) {
      const i = o.i, bob = Math.sin(t * 0.7 + i * 1.7) * 1.2;
      const ox = Math.round(q.x * 3 * o.depth), oy = Math.round(q.y * 1.5 * o.depth + bob), x = o.cx + ox, y = o.cy + oy;
      o.dx = ox; o.dy = oy;
      if (i >= n) { // coming soon: peeking, faded, over a little cloud that hides most of it
        c.globalAlpha = 0.55; c.drawImage(o.cv, x - 11, y - 12); c.globalAlpha = 1;
        // thin wisps of cloud across it, drifting further than the planet as the cursor moves
        const wx = x + Math.round(q.x * 5 * o.depth + Math.sin(t * 0.3 + i) * 1.5), wy = y + 1 + Math.round(q.y * 1.5);
        for (const [dx, dy, rx, ry] of [[-3, -1, 11, 2.2], [4, 3, 10, 1.8], [-2, 6, 7, 1.4]]) {
          for (let yy = -Math.ceil(ry); yy <= Math.ceil(ry); yy++) {
            const w = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (yy / (ry + 0.5)) ** 2))); if (!w) continue;
            c.fillStyle = yy < 0 ? o.cloud[0] : yy === 0 ? o.cloud[1] : o.cloud[2];
            c.fillRect(wx + dx - w, wy + dy + yy, 2 * w + 1, 1);
          }
        }
        const a = Math.max(0, Math.sin(t * 0.9 + i * 2.1)) * 0.8;
        if (a > 0.05) { c.fillStyle = `rgba(${o.glow},${a})`; c.fillRect(x + 4, y - 4, 1, 1); c.fillStyle = `rgba(255,255,255,${a * 0.6})`; c.fillRect(x + 3, y - 4, 3, 1); c.fillRect(x + 4, y - 5, 1, 3); }
        continue;
      }
      const hov = this.hover?.type === 'world' && this.hover.id === o.id, r = hov ? 14 : 10;
      c.globalCompositeOperation = 'lighter';
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${o.glow},${hov ? 0.5 : 0.22 + 0.06 * Math.sin(t * 2 + i)})`); g.addColorStop(1, `rgba(${o.glow},0)`);
      c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
      c.globalCompositeOperation = 'source-over';
      c.drawImage(o.cv, x - 11, y - 11);
    }
  }

  // the guide stops and turns to you for a few seconds
  tapGuide() { this.guideTalk = 4; }
}

const hexRgb = (h) => { const n = parseInt(h.slice(1), 16); return `${n >> 16},${(n >> 8) & 255},${n & 255}`; };
