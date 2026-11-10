// The travel planets' landscapes, where you focus with your guide (see js/worlds.js):
// the Moonglow Forest, the Summer Pool, the Blue Hour Fair and the Star Sanctuary.
// Each is a scene kind for OutingScene (outing.js) with its own fixed light (`mood`), so every
// world keeps its signature hour whatever the real sky is doing. During a tea break your guide
// does a little break moment (the planner shows a matching prompt for you).
import { H, mix, clamp, Raster, hx2, BAYER } from './scene.js';
import { paintSky, twinkle, heart, toCanvas, pingPong } from './outing.js';

const lerp = (a, b, k) => a + (b - a) * k;
// you, sitting behind something (a log, a bench, the pool's rim): only rows above `cut` show
function sitBehind(sc, c, x, cut, lift = 0) {
  const blink = Math.floor(sc.t * 10) % 37 === 0 ? 1 : 0, cv = sc.heroCv[blink];
  const y = cut - Math.round(sc.hh * 0.62) - lift;
  sc.blitHero(c, cv, x, y, false, cut - y);
  return { x, y, w: sc.hw, h: cut - y };
}
// your guide's pose for this moment: focus, an occasional glance, or the break moment
function guidePose(sc, t, moving = false) {
  const gc = sc.guideCv, brk = sc.input.phase === 'break' || sc.guideTalk > 0 || sc.input.celebrate;
  if (brk) return { cv: gc.wave[Math.floor(t * 3) % gc.wave.length], brk };
  if (moving) return { cv: gc.frontWalk[Math.floor(t * 4) % gc.frontWalk.length], brk };
  return { cv: (t % 11) < 2 ? gc.side : gc.front, brk };
}
const breaking = (sc) => sc.input.phase === 'break' || sc.input.celebrate;

// a carousel horse, facing right (13×10): h body, m mane and tail, e eye, s saddle, l legs
const HORSE = [
  '.........hh..',
  '........mhhh.',
  '.......mmhehh',
  '.......mhhhhh',
  't.....mhh....',
  'tt.sssshh....',
  '.thhhhhhhh...',
  '..hhhhhhhh...',
  '..l.l...l.l..',
  '.l..l....l.l.',
];
const HORSE_COLS = [['#ffffff', '#f08ab0', '#e85a6a'], ['#fff0d8', '#e8b850', '#6a8ad8'], ['#f0e0ff', '#a88ae8', '#f0c860'], ['#e8f4ff', '#7ab0e8', '#e85a6a'], ['#fff4f0', '#f4a8c8', '#8a6ad0'], ['#f8f0d8', '#d89a5a', '#4aa88a']];
function drawHorse(c, x, y, [body, mane, saddle], flip, a) {
  c.globalAlpha = a;
  HORSE.forEach((row, j) => { for (let i = 0; i < row.length; i++) {
    const ch = row[i]; if (ch === '.') continue;
    c.fillStyle = ch === 'h' ? body : ch === 'm' || ch === 't' ? mane : ch === 's' ? saddle : ch === 'e' ? '#3a2a4a' : '#d8ccd8';
    c.fillRect(flip ? x + 6 - i : x - 6 + i, y + j, 1, 1);
  } });
  c.globalAlpha = 1;
}

// a toy duck facing right (10×7): y body, e eye, o beak, w shine; the bottom rows sit under water
const DUCK = [
  '.....yyy..',
  '....yyeyoo',
  'y...yyyy..',
  'yy.yywyy..',
  'yyyyyyyyy.',
  '.yyyyyyyy.',
  '..yyyyyy..',
];

export const WORLD_KINDS = {
  // ---- Moonglow Forest: a snug clearing in a thick wood, a campfire, a carpet of violet flowers ---
  forest: {
    mood: () => ({ top: hx2('#2a2a6a'), bot: hx2('#6a5aa8'), amb: [0.92, 0.9, 1.04], dark: 0.6, alt: -6, grey: 0, wet: false, weather: 'clear' }),
    build(R, T, e, W, s, rnd) {
      paintSky(R, e, 0, 0, W, 96);
      const mid = Math.round(W / 2), floorY = 92;
      const haze = (h, k) => mix(T(h), T('#8a70c0'), k);
      // a trunk with bark streaks and a flared foot; light catches its left edge
      const trunk = (x, w, foot, col, lit, dark, bark) => {
        for (let y = 0; y < foot; y++) {
          const flare = y > foot - 8 ? Math.round(((y - foot + 8) / 8) ** 2 * 4) : 0;
          for (let i = -flare; i < w + flare; i++) {
            const u = (i + flare) / (w + 2 * flare - 1);
            let c = u < 0.18 ? lit : u > 0.78 ? dark : col;
            if (bark && (i * 7 + Math.floor(y / 5) * 3) % 9 === 0 && u > 0.15 && u < 0.85) c = mix(c, dark, 0.6);
            R.put(x + i, y, c);
          }
        }
      };
      // far, hazy trunks packed close
      for (let x = -4; x < W; x += 9 + Math.floor(rnd() * 7)) trunk(x, 3 + Math.floor(rnd() * 3), floorY + 2, haze('#3e3878', 0.5), haze('#5e58a0', 0.5), haze('#2e2a64', 0.5), false);
      // middle trunks, thicker
      for (let x = -6; x < W; x += 22 + Math.floor(rnd() * 14)) { if (Math.abs(x - mid) < 22) continue; trunk(x, 6 + Math.floor(rnd() * 5), floorY + 4, haze('#4a3c74', 0.22), haze('#7a6aa8', 0.2), haze('#30285a', 0.2), true); }
      // the great old tree behind the camp
      const gx = mid + Math.round(Math.min(46, W * 0.16)), gw = Math.round(clamp(W * 0.07, 16, 30));
      trunk(gx, gw, floorY + 6, T('#6a5a8a'), T('#a898c0'), T('#3e3460'), true);
      for (let k = 0; k < 3; k++) R.line(gx + gw - 2, 40 + k * 14, gx + gw + 10 + k * 3, 30 + k * 12, T('#4e4270'));
      // a dense canopy, layered leaf clouds
      for (const [y0, cols] of [[2, ['#24405a', '#2e5466']], [10, ['#2c4a5a', '#3a6470']]]) for (let x = -6; x < W + 6; x += 5 + Math.floor(rnd() * 4)) R.disk(x, y0 + Math.floor(rnd() * 5), 6 + Math.floor(rnd() * 4), (px, py, nx, ny) => R.put(px, py, T(ny < -0.4 && nx < 0.3 ? cols[1] : cols[0])));
      // thick near trunks framing the clearing
      const nw = Math.round(clamp(W * 0.05, 10, 20));
      trunk(-2, nw, H, T('#3a3062'), T('#5a4e88'), T('#241e46'), true);
      trunk(W - nw + 2, nw, H, T('#3a3062'), T('#5a4e88'), T('#241e46'), true);
      // the violet flower carpet
      const fl = [T('#5a4688'), T('#6e58a4'), T('#9a7ad8'), T('#c8a8f0'), T('#7a5ab8'), T('#4a3a76')];
      for (let x = 0; x < W; x++) { const top = floorY + Math.round(Math.sin(x * 0.07) * 1.5); for (let y = top; y < H; y++) { const v = (y - top) / 26 * 2 + 0.3, lo = Math.min(2, Math.floor(v)); R.put(x, y, y === top ? fl[4] : [fl[5], fl[0], fl[1]][(v - lo) * 16 > BAYER[y & 3][x & 3] ? Math.min(2, lo + 1) : lo]); } }
      // little flowers in clumps, smaller and denser toward the back
      for (let i = 0; i < W * 1.6; i++) {
        const x = Math.floor(rnd() * W), y = floorY + 1 + Math.floor(rnd() ** 1.4 * (H - floorY)), big = y > 104 && rnd() < 0.5, c0 = rnd() < 0.35 ? fl[3] : fl[2];
        R.put(x, y, c0); if (big) { R.put(x - 1, y, fl[4]); R.put(x + 1, y, fl[4]); R.put(x, y - 1, c0); R.put(x, y + 1, fl[5]); }
      }
      s.floor = (x) => floorY + Math.round(Math.sin(x * 0.07) * 1.5);
      // bushes and ferns crowding the sides, tall pale grasses
      const bush = (x, y, r) => R.disk(x, y, r, (px, py, nx, ny) => R.put(px, py, T(ny < -0.4 && nx < 0.3 ? '#4f8a6a' : ny > 0.3 ? '#1f3e3a' : '#2f5e4e')));
      for (let x = 0; x < W; x += 6 + Math.floor(rnd() * 6)) { if (Math.abs(x - mid) < Math.min(70, W * 0.36)) continue; bush(x, floorY + 2 + Math.floor(rnd() * 4), 4 + Math.floor(rnd() * 4)); }
      const grass = (x, y, h) => { for (let k = 0; k < 5; k++) { const lean = (k - 2) * 0.35; for (let i = 0; i < h - Math.abs(k - 2) * 3; i++) R.put(x + Math.round(lean * i * 0.4), y - i, i > h - 8 ? T('#f0e0c0') : T('#c8b090'), 0.85); } };
      for (const x of [nw + 4, nw + 14, W - nw - 8, W - nw - 18]) grass(x, floorY + 6, 26 + Math.floor(rnd() * 10));
      // glowing plants scattered through the flowers (they twinkle in draw())
      s.sparks = [];
      for (let i = 0; i < W / 7; i++) { const x = 4 + Math.floor(rnd() * (W - 8)), y = floorY + 3 + Math.floor(rnd() * 24); if (Math.abs(x - mid) < 14 && y < 112) continue; R.put(x, y, T(rnd() < 0.5 ? '#e8d8ff' : '#a8f0d8')); s.sparks.push({ x, y, c: rnd() < 0.5 ? '230,210,255' : '170,255,220', p: rnd() * 6, d: 0.4 + rnd() * 0.8 }); }
      // the telescope on its tripod, looking up through a gap in the leaves
      const tx = Math.min(W - nw - 12, gx + gw + 6), ty = floorY + 2;
      R.line(tx, ty - 14, tx - 5, ty, T('#c8c8d8')); R.line(tx, ty - 14, tx + 5, ty, T('#c8c8d8')); R.line(tx, ty - 14, tx, ty, T('#9898b0'));
      for (let i = 0; i < 12; i++) { R.put(tx - 6 + i, ty - 14 - Math.round(i * 0.55), T('#e8e8f4')); R.put(tx - 6 + i, ty - 13 - Math.round(i * 0.55), T('#a8a8c4')); }
      R.put(tx + 6, ty - 20, T('#4a4a6a')); R.put(tx + 6, ty - 21, T('#4a4a6a'));
      // the campfire: a ring of stones and stacked logs (flames in draw())
      const fy = 106;
      for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2; R.rect(mid + Math.round(Math.cos(a) * 7) - 1, fy + Math.round(Math.sin(a) * 2.5), 3, 2, T(k % 2 ? '#8a84a0' : '#a8a2bc')); }
      R.line(mid - 6, fy + 1, mid + 4, fy - 6, T('#8a5a3a')); R.line(mid + 6, fy + 1, mid - 4, fy - 6, T('#a86a40')); R.line(mid - 1, fy + 1, mid, fy - 8, T('#7a4a30'));
      s.fire = { x: mid, y: fy - 2 };
      // two logs to sit on (drawn in front of you and your guide)
      const log = (w) => { const L = new Raster(w, 7); for (let y = 0; y < 7; y++) for (let x = 0; x < w; x++) { const end = x < 2 || x > w - 3; if (end && (y === 0 || y === 6)) continue; L.put(x, y, end ? (x === 0 || x === w - 1 ? T('#8a6a5a') : T('#d8b890')) : y === 0 ? T('#b08a70') : y < 3 ? T('#8a6650') : y > 4 ? T('#4e3a3a') : T('#6e5040')); } for (let x = 4; x < w - 4; x += 6) L.put(x, 2, T('#5a4a3a')); return toCanvas(L); };
      const lw = 26;
      s.logs = [{ cv: log(lw), x: mid - 14 - lw, y: 102 }, { cv: log(lw - 2), x: mid + 14, y: 102 }];
      // fairy lights strung between the trees
      s.bulbs = [];
      for (let x = nw; x < W - nw; x += 5) { const u = (x - nw) / (W - 2 * nw), y = 30 + Math.round(Math.sin(u * Math.PI * 3) ** 2 * 12); s.bulbs.push({ x, y, p: rnd() * 6 }); }
      s.flies = Array.from({ length: Math.round(W / 16) }, (_, i) => ({ x: rnd() * W, y: 40 + rnd() * 55, p: rnd() * 6, i, vx: 0, vy: 0 }));
    },
    draw(c, sc, e, t, s, P) {
      const ptr = sc.ptr, par = ptr ? { x: (ptr.x / sc.W - 0.5) * 2, y: (ptr.y / H - 0.5) * 2 } : { x: 0, y: 0 };
      // moonbeams slanting through the leaves
      c.fillStyle = 'rgba(220,210,255,0.06)';
      for (let k = 0; k < 3; k++) { const x = sc.W * (0.12 + k * 0.16); c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 7, 0); c.lineTo(x + 40, 96); c.lineTo(x + 24, 96); c.fill(); }
      // fairy lights
      c.fillStyle = 'rgba(40,30,60,0.6)'; for (const b of s.bulbs) c.fillRect(b.x - 2, b.y - 1, 5, 1);
      for (const b of s.bulbs) { const a = 0.6 + 0.4 * Math.sin(t * 2 + b.p); c.fillStyle = `rgba(255,214,150,${a})`; c.fillRect(b.x, b.y, 1, 1); sc.glow(b.x, b.y, 3, 0.12 * a, '255,200,130'); }
      // glowing plants: they lean away from the cursor a touch, sparkling
      for (const p of s.sparks) twinkle(c, p.x - Math.round(par.x * p.d * 1.5), p.y - Math.round(par.y * p.d * 0.6), 0.45 + 0.55 * Math.sin(t * 3 + p.p), p.c);
      // the campfire: flickering flames, a warm glow and sparks drifting up
      const f = s.fire;
      sc.glow(f.x, f.y, 34, 0.32 + 0.05 * Math.sin(t * 11), '255,170,90');
      for (let k = 0; k < 7; k++) { const h = 4 + Math.round(3 * Math.abs(Math.sin(t * 7 + k * 1.9))), x = f.x - 3 + k; c.fillStyle = '#ff9a4a'; c.fillRect(x, f.y - h + 1, 1, h); }
      c.fillStyle = '#ffd86a'; for (let k = 1; k < 6; k++) { const h = 2 + Math.round(2 * Math.abs(Math.sin(t * 9 + k * 2.3))); c.fillRect(f.x - 3 + k, f.y - h + 1, 1, h); }
      c.fillStyle = '#fff6d0'; c.fillRect(f.x, f.y - 1, 1, 2);
      for (let k = 0; k < 6; k++) { const a = (t * 0.6 + k / 6) % 1, x = f.x + Math.round(Math.sin(k * 2.1 + a * 6) * 4), y = f.y - 4 - Math.round(a * 30); c.fillStyle = `rgba(255,200,120,${1 - a})`; c.fillRect(x, y, 1, 1); }
      // you on the left log, your guide on the right, both facing the fire
      const [L1, L2] = s.logs;
      sitBehind(sc, c, L1.x + 6, L1.y + 1);
      c.drawImage(L1.cv, L1.x, L1.y);
      const gc = sc.guideCv, br = breaking(sc);
      if (gc) {
        const cut = L2.y + 1, gy = cut - Math.round(gc.h * 0.62) - gc.seat + (br ? -Math.abs(Math.round(Math.sin(t * 5) * 2)) : 0), gx = L2.x + 2;
        const cv = br ? guidePose(sc, t).cv : (t % 13) < 3 ? gc.side : gc.front;
        sc.drawGuide(c, gx, gy, cv, !br && (t % 13) < 3, cut - gy);
        if (sc.spots.guideBox) sc.spots.guideBox.h = cut - gy;
      }
      c.drawImage(L2.cv, L2.x, L2.y);
      sc.drawFamiliar(c, Math.floor(t * 1.3) % 2, L1.x - sc.petW - 2, 110);
      // fireflies: drifting, curious about the cursor; on a break they circle your guide
      for (const fl of s.flies) {
        let tx = fl.x + Math.sin(t * 0.6 + fl.p) * 10, ty = fl.y + Math.cos(t * 0.8 + fl.p * 1.3) * 6;
        if (br && gc) { const a = t * 1.5 + fl.i, r = 10 + (fl.i % 4) * 3, b = sc.spots.guideBox; if (b) { tx = b.x + b.w / 2 + Math.cos(a) * r; ty = b.y + 6 + Math.sin(a) * r * 0.5; } }
        else if (ptr && Math.hypot(ptr.x - fl.x, ptr.y - fl.y) < 50) { const a = t * 2 + fl.i; tx = ptr.x + Math.cos(a) * (6 + (fl.i % 3) * 3); ty = ptr.y + Math.sin(a) * 4; }
        fl.cx = fl.cx == null ? tx : fl.cx + (tx - fl.cx) * 0.06; fl.cy = fl.cy == null ? ty : fl.cy + (ty - fl.cy) * 0.06;
        twinkle(c, Math.round(fl.cx), Math.round(fl.cy), 0.4 + 0.6 * Math.abs(Math.sin(t * 2.5 + fl.p)), fl.i % 3 ? '230,255,170' : '255,220,160');
      }
    },
  },

  // ---- Summer Pool: a sunlit old pool hall with tall steel windows and a yellow tub --------
  pool: {
    mood: () => ({ top: hx2('#f2c890'), bot: hx2('#fde8c4'), amb: [1.02, 0.98, 0.9], dark: 0, alt: 8, grey: 0, wet: false, weather: 'clear' }),
    build(R, T, e, W, s, rnd) {
      // the view through the windows: warm sky, soft hills and treetops
      for (let y = 0; y < 74; y++) for (let x = 0; x < W; x++) R.put(x, y, mix(T('#f6d8a8'), T('#fff2d8'), y / 74));
      const hill = (x) => 50 + Math.round(Math.sin(x * 0.03) * 5 + Math.sin(x * 0.011 + 1) * 6);
      for (let x = 0; x < W; x++) for (let y = hill(x); y < 74; y++) R.put(x, y, mix(T('#a8b494'), T('#f4e0bc'), 0.45 - (y - hill(x)) * 0.01));
      for (let x = 0; x < W; x += 3) { const y = 62 + Math.round(Math.sin(x * 0.2) * 2); R.disk(x, y, 3, (px, py) => py < 74 && R.put(px, py, mix(T('#8a9a6a'), T('#f4e0bc'), 0.3))); }
      // steel window grid, with concrete pillars every so often
      const steel = T('#4e4a50'), steelL = T('#77707a');
      for (let x = 0; x < W; x += 13) R.rect(x, 4, 1, 70, steel);
      for (const y of [4, 20, 34, 50, 73]) R.rect(0, y, W, y === 4 || y === 73 ? 2 : 1, steel);
      for (let x = 6; x < W; x += 26) R.rect(x, 20, 1, 14, steelL);
      for (let x = 0; x < W; x += 104) { R.rect(x, 0, 9, 92, T('#cdbfa6')); R.rect(x, 0, 2, 92, T('#e2d6c0')); R.rect(x + 7, 0, 2, 92, T('#b2a48c')); }
      R.rect(0, 0, W, 4, T('#c4b49a'));
      // a band of wall below the windows, and the tiled floor
      for (let y = 75; y < 92; y++) for (let x = 0; x < W; x++) R.put(x, y, y === 75 ? T('#e8dcc6') : (x % 9 === 0 || y % 6 === 0) ? T('#c8bca6') : T('#ddd0b8'));
      for (let y = 92; y < H; y++) for (let x = 0; x < W; x++) R.put(x, y, y === 92 ? T('#b8a890') : ((x + (y >> 2) * 3) % 12 === 0 || y % 7 === 0) ? T('#cfc2aa') : T('#e4d8c2'));
      // the yellow above-ground pool (its front wall is drawn over you and your guide)
      const pw = clamp(Math.round(W * 0.46), 110, 230), px0 = Math.round(W / 2 - pw / 2), rim = 84;
      for (let x = px0; x < px0 + pw; x++) { const u = (x - px0) / (pw - 1); const d = Math.round(Math.sqrt(Math.max(0, 1 - (2 * u - 1) ** 2)) * 4); for (let y = rim - d; y <= rim; y++) R.put(x, y, y === rim - d ? T('#bfe8f2') : T('#7cc6e0')); }
      const F = new Raster(pw + 4, 22);
      for (let x = 0; x < pw + 4; x++) for (let y = 0; y < 22; y++) {
        const post = (x - 2) % 22 === 0 || (x - 2) % 22 === 1, top = y < 3;
        F.put(x, y, top ? (y === 0 ? T('#ffe9a0') : T('#f2c860')) : post ? T('#c8962a') : x < 6 ? T('#f0c45a') : x > pw - 3 ? T('#c89432') : y > 18 ? T('#cf9c38') : T('#e8b84a'));
      }
      s.pool = { cv: toCanvas(F), x: px0 - 2, y: rim - 1, w: pw, x0: px0 };
      // the striped umbrella in the corner, the ladder, sun loungers and a red bucket
      const ux = Math.round(W * 0.06), uy = 6;
      for (let i = -24; i <= 24; i++) { const y = uy + Math.round(Math.abs(i) * 0.45); for (let j = 0; j < 7 - Math.floor(Math.abs(i) / 8); j++) R.put(ux + i, y + j, (Math.floor((i + 24) / 6) % 2) ? T('#f4ece0') : T('#e2584a')); }
      R.rect(ux, uy + 6, 1, 86, T('#8a8278'));
      const lx = px0 - 16;
      for (const dx of [0, 7]) R.rect(lx + dx, 70, 1, 22, T('#a8b0b8'));
      for (let y = 74; y < 92; y += 5) R.rect(lx, y, 8, 1, T('#c8d0d8'));
      const lounger = (x) => { R.rect(x, 86, 18, 2, T('#e8c050')); R.line(x + 13, 86, x + 18, 78, T('#e8c050')); R.line(x + 14, 86, x + 19, 78, T('#c8a040')); R.rect(x + 1, 88, 1, 4, T('#a08030')); R.rect(x + 16, 88, 1, 4, T('#a08030')); };
      if (W > 260) lounger(px0 + pw + 18); if (W > 340) lounger(px0 + pw + 44);
      const bx = Math.min(W - 12, px0 + pw + 8); R.rect(bx, 85, 6, 6, T('#e04848')); R.rect(bx - 1, 84, 8, 1, T('#f06a6a')); R.rect(bx + 1, 86, 1, 4, T('#f08080'));
      s.sun = Array.from({ length: Math.ceil(W / 26) }, (_, i) => i * 26 + 4);
    },
    draw(c, sc, e, t, s, P) {
      // warm light falling through the windows onto the floor
      c.fillStyle = 'rgba(255,226,170,0.16)';
      for (const x of s.sun) { c.beginPath(); c.moveTo(x, 74); c.lineTo(x + 10, 74); c.lineTo(x + 22, 120); c.lineTo(x + 8, 120); c.fill(); }
      const p = s.pool, rim = p.y + 1, gc = sc.guideCv;
      // you and your guide in the water, arms on the rim
      const bob = Math.round(Math.sin(t * 1.4) * 0.6);
      const hx = p.x0 + Math.round(p.w * 0.3);
      sitBehind(sc, c, hx, rim, 4 + bob);
      if (gc) {
        const br = breaking(sc), gx = p.x0 + Math.round(p.w * 0.62), gy = rim - Math.round(gc.h * 0.62) - gc.seat - 3 + (br ? Math.round(Math.sin(t * 6)) : bob);
        sc.drawGuide(c, gx, gy, guidePose(sc, t).cv, false, rim - gy);
        if (sc.spots.guideBox) sc.spots.guideBox.h = rim - gy;
        // splashes on a break
        if (br) for (let i = 0; i < 6; i++) { const a = (t * 3 + i) % 1, dx = (i - 2.5) * 4; c.fillStyle = `rgba(220,248,255,${1 - a})`; c.fillRect(Math.round(gx + gc.w / 2 + dx * (1 + a)), Math.round(rim - 2 - Math.sin(a * Math.PI) * 8), 1, 2); }
      }
      // toy ducks bobbing about on the water (the pool's wall hides their bottoms)
      for (let k = 0; k < 3; k++) {
        const [dx, dir] = pingPong(t + k * 37, 2.2 + k * 0.6, p.x0 + 6, p.x0 + p.w - 16), x = Math.round(dx), y = rim - 6 + Math.round(Math.sin(t * 2 + k * 2));
        DUCK.forEach((row, j) => { for (let i = 0; i < 10; i++) { const ch = row[dir > 0 ? i : 9 - i]; if (ch === '.') continue; c.fillStyle = ch === 'y' ? (k === 1 ? '#ffe9a0' : '#ffd43a') : ch === 'o' ? '#ff8a3a' : ch === 'w' ? '#ffffff' : '#2a2030'; c.fillRect(x + i, y + j, 1, 1); } });
      }
      c.drawImage(p.cv, p.x, p.y);
      // sun glints on the water and the rim
      for (let i = 0; i < 5; i++) twinkle(c, Math.round(p.x0 + ((i * 37 + t * 6) % p.w)), rim - 2 + (i % 2), 0.5 + 0.5 * Math.sin(t * 4 + i), '255,255,240');
      sc.drawFamiliar(c, Math.floor(t * 1.2) % 2, p.x0 - sc.petW - 22, 112);
      // a beach ball rolling lazily on the floor
      const bx = Math.round(p.x0 + p.w + 6 + Math.sin(t * 0.4) * 6), by = 108;
      c.fillStyle = '#ffffff'; c.fillRect(bx - 2, by - 2, 5, 5); c.fillStyle = '#f2685a'; c.fillRect(bx - 2, by - 2, 2, 5); c.fillStyle = '#5ab0e8'; c.fillRect(bx + 1, by - 2, 2, 5);
    },
  },

  // ---- Blue Hour Fair: a grand carousel on a white stage above pink clouds, a wheel far off ----
  park: {
    mood: () => ({ top: hx2('#16285a'), bot: hx2('#3e5a96'), amb: [0.9, 0.92, 1.02], dark: 0.6, alt: -4, grey: 0, wet: false, weather: 'clear' }),
    build(R, T, e, W, s, rnd) {
      paintSky(R, e, 0, 0, W, 100);
      const mid = Math.round(W / 2), cw = Math.min(W - 24, clamp(Math.round(W * 0.42), 104, 230)), hw = cw >> 1;
      // the Ferris wheel, far away and hazy, half sunk in the cloud sea
      const fx = W > 300 ? mid + hw + Math.round((W / 2 - hw) * 0.55) : Math.round(W * 0.9), fy = 46, fr = W > 300 ? 18 : 11;
      const far = (h) => mix(T(h), e.bot, 0.55);
      for (let a = 0; a < Math.PI * 2; a += 0.03) R.put(fx + Math.round(Math.cos(a) * fr), fy + Math.round(Math.sin(a) * fr), far('#c8ccf8'));
      for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; R.line(fx, fy, fx + Math.round(Math.cos(a) * fr), fy + Math.round(Math.sin(a) * fr), far('#7a80c0')); }
      R.line(fx, fy, fx - 9, fy + 30, far('#9aa0e0')); R.line(fx, fy, fx + 9, fy + 30, far('#9aa0e0'));
      s.wheel = { x: fx, y: fy, r: fr };
      // pink clouds rolling in on both sides, below the stage
      const ck = [T('#f6b8c8'), T('#e290a8'), T('#c06a8a'), T('#ffd8e2')];
      const puffs = (x0, x1, y0) => { for (let x = x0; x < x1; x += 5 + Math.floor(rnd() * 5)) { const r = 7 + Math.floor(rnd() * 9), y = y0 + Math.floor(rnd() * 12); R.disk(x, y, r, (px, py, nx, ny) => R.put(px, py, ny < -0.6 && nx < 0.2 ? ck[3] : ny < -0.1 ? ck[0] : ny < 0.5 ? ck[1] : ck[2])); } };
      puffs(-8, mid - hw + 10, 68); puffs(mid + hw - 10, W + 8, 68);
      puffs(-8, W + 8, 104);
      // the white stage, widening toward you
      for (let y = 84; y < H; y++) { const half = hw + 6 + Math.round((y - 84) * 1.6); for (let x = mid - half; x <= mid + half; x++) R.put(x, y, y === 84 ? T('#ffffff') : mix(T('#f4f2fa'), T('#d8d4ea'), (y - 84) / 40)); }
      puffs(-10, mid - hw - 8, 110); puffs(mid + hw + 8, W + 10, 110);
      // ---- the carousel. Open all round: between its brass poles you see the sky and clouds.
      // Its round shape shows in the curve of the board, the fringe and the deck (lower in front).
      const bow = (x) => Math.round(3 * (1 - ((x - mid) / (hw + 3)) ** 2));
      const apex = 7, eave = 28;
      // finial and a little pennant
      R.rect(mid, apex - 6, 1, 6, T('#e8b850')); R.disk(mid, apex - 7, 1, (x, y) => R.put(x, y, T('#fff0b0')));
      for (let i = 0; i < 6; i++) for (let j = 0; j <= Math.floor((6 - i) / 2); j++) R.put(mid + 1 + i, apex - 6 + j, T(i < 3 ? '#e85a6a' : '#f08a98'));
      // the striped roof, bell-curved, each stripe lit on its left and ending in a rounded lobe
      const stripes = ['#d84a5c', '#f4e4d0', '#8a6ad0', '#f4c4d4', '#e8a85a', '#6a8ad8'];
      for (let y = apex; y <= eave + 3; y++) {
        const kk = Math.min(1, (y - apex) / (eave - apex)), half = Math.max(1, Math.round((hw + 2) * Math.pow(kk, 0.7)));
        for (let x = mid - half; x <= mid + half; x++) {
          const u = (x - mid) / half, f = (u + 1) * 6, si = Math.floor(f), fr = f - si;
          const lobeBottom = eave + bow(x) + Math.round(3 * Math.sin(fr * Math.PI));
          if (y > lobeBottom) continue;
          let c = T(stripes[si % stripes.length]);
          if (fr < 0.14) c = mix(c, [255, 255, 255], 0.3); else if (fr > 0.86) c = mix(c, [40, 30, 70], 0.2);
          if (u > 0.5) c = mix(c, [30, 24, 70], (u - 0.5) * 0.35); // the roof turns away into shade on the right
          R.put(x, y, c);
        }
      }
      for (let k = 1; k < 12; k++) { const u = k / 6 - 1, x = Math.round(mid + u * (hw + 2)); R.put(x, eave + bow(x) - 1, T('#ffe8a0')); }
      // the rounding board: gold rails, a teal band with oval mirrors and gold scrolls
      const bt = eave + 4, bh = 9;
      for (let x = mid - hw - 2; x <= mid + hw + 2; x++) {
        const o = bow(x);
        R.put(x, bt + o, T('#fff0b0')); R.put(x, bt + 1 + o, T('#e0a840'));
        for (let y = bt + 2; y < bt + 2 + bh; y++) R.put(x, y + o, (x - mid + 400) % 14 === 7 && (y === bt + 4 || y === bt + 8) ? T('#e0b050') : T('#2e5068'));
        R.put(x, bt + 2 + bh + o, T('#e0a840')); R.put(x, bt + 3 + bh + o, T('#a87428'));
        // the fringe: little pointed pennants hanging under the board
        const ph = (x - mid + 400) % 6, drop = ph < 3 ? ph : 6 - ph;
        for (let j = 0; j < drop + 1; j++) R.put(x, bt + 4 + bh + o + j, T(((x - mid + 400) % 12) < 6 ? '#f4c4d4' : '#e8b850'));
      }
      for (let x = mid - hw + 4; x <= mid + hw - 4; x += 14) { const o = bow(x), cy0 = bt + 6 + o; R.disk(x, cy0, 3, (px, py, nx, ny) => R.put(px, py, nx * nx + ny * ny > 0.55 ? T('#f0c860') : nx + ny < -0.3 ? T('#ffffff') : T('#f6e8d8'))); }
      for (let x = mid - hw + 11; x <= mid + hw - 8; x += 14) { const o = bow(x), y = bt + 6 + o; R.put(x - 2, y - 1, T('#e0b050')); R.put(x - 1, y - 2, T('#e0b050')); R.put(x, y - 1, T('#e0b050')); R.put(x, y, T('#e0b050')); R.put(x + 1, y + 1, T('#e0b050')); R.put(x + 2, y, T('#e0b050')); }
      // the ceiling under the roof, seen just past the fringe: dark boards fanning from the middle
      const ceil = bt + bh + 5;
      // the centre column: a mirrored drum on top, painted panels, gold trim (drawn between the far and near horses)
      const deck = 84, ch = deck - ceil;
      const Cm = new Raster(20, ch);
      for (let y = 0; y < ch; y++) for (let x = 0; x < 20; x++) Cm.put(x, y, x < 2 ? T('#f8e0a0') : x > 17 ? T('#9a6a30') : y < 9 ? (x % 4 === 1 ? T('#e0b050') : T('#d86a7a')) : T('#c89a5a'));
      for (let x = 0; x < 20; x++) { Cm.put(x, 9, T('#fff0b0')); Cm.put(x, ch - 1, T('#8a5a2a')); }
      for (const [ox, oy] of [[5, 15], [14, 15], [5, 26], [14, 26]]) if (oy + 4 < ch) for (let j = -4; j <= 4; j++) for (let i = -3; i <= 3; i++) if ((i * i) / 9 + (j * j) / 16 <= 1) Cm.put(ox + i, oy + j, (i * i) / 9 + (j * j) / 16 > 0.6 ? T('#f0c860') : i + j < -2 ? T('#ffffff') : T('#dfe8f4'));
      s.column = { cv: toCanvas(Cm), x: mid - 10, y: ceil };
      // the deck: a cream top edge and a skirt of gold-trimmed panels with little mirrors
      for (let x = mid - hw - 3; x <= mid + hw + 3; x++) {
        const o = bow(x);
        R.put(x, deck + o, T('#fff4dc')); R.put(x, deck + 1 + o, T('#f0d8b0'));
        for (let y = deck + 2; y < deck + 7; y++) R.put(x, y + o, (x - mid + 400) % 10 === 0 ? T('#f0c860') : y === deck + 6 ? T('#6a3a3a') : T('#9a4a5a'));
        if ((x - mid + 400) % 10 === 5) R.put(x, deck + 4 + o, T('#ffe8c0'));
      }
      s.carousel = { x: mid, hw, top: ceil, deck, eave, bt, bh, bow };
      // a bench at the front of the stage (drawn in front of you)
      const bnx = mid - hw + 4;
      const B = new Raster(24, 9);
      B.rect(0, 0, 24, 2, T('#f0d0e0')); B.rect(0, 3, 24, 2, T('#e0b0c8')); B.rect(0, 6, 24, 1, T('#c890a8')); B.rect(2, 7, 1, 2, T('#8a6a8a')); B.rect(21, 7, 1, 2, T('#8a6a8a'));
      s.bench = { cv: toCanvas(B), x: Math.max(4, bnx - 8), y: 98 };
    },
    draw(c, sc, e, t, s, P) {
      const cr = s.carousel, mid = cr.x;
      // the faraway wheel turns slowly, its cabins softly lit
      const wl = s.wheel;
      for (let k = 0; k < 8; k++) { const a = t * 0.1 + (k / 8) * Math.PI * 2; c.fillStyle = `rgba(255,220,170,${0.45 + 0.2 * Math.sin(t + k)})`; c.fillRect(Math.round(wl.x + Math.cos(a) * wl.r) - 1, Math.round(wl.y + Math.sin(a) * wl.r), 2, 2); }
      // the inside glows warm under the roof
      sc.glow(mid, cr.top + 6, cr.hw * 0.8, 0.2, '255,214,150');
      // horses going round on their brass poles: the far ones dimmer and facing the other way,
      // then the centre column, then the near ones
      const hs = HORSE_COLS.map((col, k) => { const ph = t * 0.4 + (k / HORSE_COLS.length) * Math.PI * 2; return { x: Math.round(mid + Math.sin(ph) * (cr.hw - 9)), z: Math.cos(ph), lift: Math.round(Math.sin(t * 2.2 + k * 1.3) * 2), col }; });
      const pole = (x, a) => { c.fillStyle = `rgba(240,200,96,${a})`; c.fillRect(x, cr.top, 1, cr.deck - cr.top); c.fillStyle = `rgba(255,246,210,${a})`; c.fillRect(x, cr.top, 1, 2); };
      for (const h of hs.filter((h) => h.z < 0).sort((a, b) => a.z - b.z)) { pole(h.x, 0.6); drawHorse(c, h.x, cr.deck - 18 + h.lift - 2, h.col, true, 0.6); }
      c.drawImage(s.column.cv, s.column.x, s.column.y);
      for (const h of hs.filter((h) => h.z >= 0).sort((a, b) => a.z - b.z)) { pole(h.x, 1); drawHorse(c, h.x, cr.deck - 16 + h.lift, h.col, false, 1); }
      // chasing bulbs on the board's rails, the fringe and the deck
      const B = (x, y, i, n) => { const on = (i + Math.floor(t * 5)) % n !== 0; c.fillStyle = on ? '#fff4c0' : '#c89040'; c.fillRect(x, y, 1, 1); if (on) sc.glow(x, y, 3, 0.16, '255,226,150'); };
      let i = 0; for (let x = mid - cr.hw - 1; x <= mid + cr.hw + 1; x += 3) B(x, cr.bt + cr.bow(x), i++, 4);
      i = 0; for (let x = mid - cr.hw; x <= mid + cr.hw; x += 6) B(x, cr.bt + cr.bh + 6 + cr.bow(x), i++, 3);
      i = 0; for (let x = mid - cr.hw; x <= mid + cr.hw; x += 5) B(x, cr.deck + 1 + cr.bow(x), i++, 3);
      // you on the bench at the front of the stage; your guide dancing beside you on a break
      const b = s.bench, cut = b.y + 2;
      sitBehind(sc, c, b.x + 4, cut);
      c.drawImage(b.cv, b.x, b.y);
      const gc = sc.guideCv;
      if (gc) {
        const gx = b.x + 28, gb = 106, br = breaking(sc), hop = br ? Math.abs(Math.round(Math.sin(t * 6) * 2)) : 0;
        sc.drawGuide(c, gx, gb - gc.h - hop, guidePose(sc, t).cv, br && Math.sin(t * 3) > 0);
      }
      sc.drawFamiliar(c, Math.floor(t * 1.2) % 2, b.x + 26 + (gc ? gc.w : 10), 108);
    },
  },

  // ---- Star Sanctuary: a quiet white hall, a chandelier, open umbrellas on the floor ----
  sanctuary: {
    mood: () => ({ top: hx2('#f6f2ff'), bot: hx2('#fff6ea'), amb: [1, 1, 1], dark: 0, alt: 20, grey: 0, wet: false, weather: 'clear' }),
    build(R, T, e, W, s, rnd) {
      // walls with tall panels and pilasters, an arched doorway glowing in the middle
      for (let y = 0; y < 90; y++) for (let x = 0; x < W; x++) R.put(x, y, T('#f6f1ea'));
      const mid = Math.round(W / 2);
      for (let x = (mid % 40) - 40; x < W; x += 40) {
        if (Math.abs(x + 15 - mid) < 30) continue;
        R.rect(x + 6, 14, 20, 66, T('#efe8de')); R.rect(x + 6, 14, 20, 1, T('#ddd2c2')); R.rect(x + 6, 14, 1, 66, T('#ddd2c2')); R.rect(x + 25, 14, 1, 66, T('#ffffff'));
        R.rect(x + 30, 0, 6, 90, T('#fbf8f2')); R.rect(x + 30, 0, 1, 90, T('#ffffff')); R.rect(x + 35, 0, 1, 90, T('#e2d8ca')); R.rect(x + 29, 8, 8, 3, T('#eae2d4'));
      }
      // the arch: warm light beyond
      for (let y = 16; y < 90; y++) for (let x = mid - 16; x <= mid + 16; x++) {
        const top = 30 - Math.sqrt(Math.max(0, 256 - (x - mid) ** 2)) * 0.9;
        if (y < top) continue;
        R.put(x, y, Math.abs(x - mid) > 14 || y < top + 2 ? T('#e6dccc') : mix(T('#ffe2b8'), T('#fff6e2'), (y - 16) / 74));
      }
      R.rect(0, 0, W, 6, T('#eee6da')); R.rect(0, 6, W, 1, T('#ddd2c2'));
      // the chandelier (its crystals sparkle in draw())
      R.rect(mid, 0, 1, 10, T('#c8a860'));
      for (let i = -9; i <= 9; i++) R.put(mid + i, 12 + Math.round((i * i) / 18), T('#e0c070'));
      s.crystals = [];
      for (let i = -9; i <= 9; i += 3) { const y = 13 + Math.round((i * i) / 18); R.rect(mid + i, y, 1, 3, T('#f4f8ff')); s.crystals.push({ x: mid + i, y: y + 3 }); }
      // the marble floor with soft reflections
      for (let y = 90; y < H; y++) for (let x = 0; x < W; x++) R.put(x, y, y === 90 ? T('#ddd2c0') : ((x * 3 + y * 7) % 41 === 0) ? T('#e8dfd0') : T('#f4eee4'));
      for (let y = 91; y < 100; y++) for (let x = mid - 14; x <= mid + 14; x++) R.put(x, y, T('#fff0d8'), 0.35 * (1 - (y - 91) / 9));
      // gold chairs in the back
      for (let x = 10; x < W - 6; x += 15) { if (Math.abs(x - mid) < 22) continue; R.rect(x, 82, 1, 9, T('#d8b860')); R.rect(x + 5, 82, 1, 9, T('#d8b860')); R.rect(x, 86, 6, 1, T('#e8c870')); for (let i = 1; i < 5; i += 2) R.rect(x + i, 82, 1, 4, T('#e8cc80')); }
      // open umbrellas resting on the floor: blue and white, big ones in front
      s.umbrellas = [];
      // an open umbrella, drawn like a pixel-art umbrella icon: a dome of four panels in two shades
      // between dark ribs, pointed tips round the rim, a tip on top and a brown shaft ending in a J
      // hook. `tilt` (radians) leans it: small tilts stand it on its hook, big ones lay it on its
      // side. It is set down so its lowest pixel rests on row yF. Blue or white, as in the hall.
      const BROLLY = {
        blue: { a: '#4a78dc', b: '#6a98f0', shade: '#3a62c0', rib: '#2c3e78', line: '#28304e' },
        white: { a: '#e6ebf8', b: '#f8faff', shade: '#cfd8ee', rib: '#9aa6c8', line: '#7a84a6' },
      };
      const brolly = (x, yF, r, blue, tilt) => {
        const k = BROLLY[blue ? 'blue' : 'white'], src = new Map(), put = (u, v, c) => src.set(u + ',' + v, c);
        const hd = Math.max(3, Math.round(r * 0.62)), panel = r / 2;
        const rimAt = (u) => { const f = ((u + r) / panel) % 1; return hd + 1 - Math.round(1.6 * Math.sin(f * Math.PI)); };
        for (let v = 0; v <= hd + 1; v++) for (let u = -r; u <= r; u++) {
          if ((u / r) ** 2 + ((v - hd) / hd) ** 2 > 1.04 && v <= hd) continue;
          if (v > rimAt(u)) continue;
          const pi = Math.min(3, Math.floor((u + r) / panel)), lo = v >= rimAt(u) - 1;
          put(u, v, T(lo ? k.shade : pi % 2 ? k.b : k.a));
        }
        for (const ue of [-panel, 0, panel]) { const n = hd + 1; for (let i = 1; i <= n; i++) { const u = Math.round((ue * i) / n), v = i; if (src.has(u + ',' + v)) put(u, v, T(k.rib)); } }
        put(0, -1, T(k.rib)); put(0, -2, T(k.rib));
        const L = Math.round(r * 1.25) + 2, end = hd + L;
        for (let v = hd + 1; v <= end; v++) put(0, v, T(v % 3 ? '#8a6448' : '#a8805c'));
        put(-1, end + 1, T('#8a6448')); put(-2, end + 1, T('#8a6448')); put(-3, end, T('#8a6448')); put(-3, end - 1, T('#a8805c'));
        // lean it about its hook
        const ca = Math.cos(tilt), sa = Math.sin(tilt), px = 0, py = end + 1, rot = new Map();
        const pts = [...src.keys()].map((q) => q.split(',').map(Number));
        let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
        for (const [u, v] of pts) { const X = px + (u - px) * ca - (v - py) * sa, Y = py + (u - px) * sa + (v - py) * ca; u0 = Math.min(u0, X); u1 = Math.max(u1, X); v0 = Math.min(v0, Y); v1 = Math.max(v1, Y); }
        for (let Y = Math.floor(v0) - 1; Y <= Math.ceil(v1) + 1; Y++) for (let X = Math.floor(u0) - 1; X <= Math.ceil(u1) + 1; X++) {
          const u = Math.round(px + (X - px) * ca + (Y - py) * sa), v = Math.round(py - (X - px) * sa + (Y - py) * ca), c = src.get(u + ',' + v);
          if (c) rot.set(X + ',' + Y, c);
        }
        const out = new Map(rot);
        for (const q of rot.keys()) { const [u, v] = q.split(',').map(Number); for (const [du, dv] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = (u + du) + ',' + (v + dv); if (!rot.has(n)) out.set(n, T(k.line)); } }
        let maxV = -1e9, minU = 1e9, maxU = -1e9; for (const q of out.keys()) { const [u, v] = q.split(',').map(Number); maxV = Math.max(maxV, v); minU = Math.min(minU, u); maxU = Math.max(maxU, u); }
        const cx0 = Math.round((minU + maxU) / 2);
        for (let u = minU; u <= maxU; u++) R.put(x + u - cx0, yF + 1, T('#d2c6b2'), 0.45);
        for (const [q, c] of out) { const [u, v] = q.split(',').map(Number); R.put(x + u - cx0, yF - (maxV - v), c); }
      };
      // far ones first, then bigger ones nearer; never on the clear aisle or by your table
      const spots = [];
      const place = (n, y0, ys, r0, rs, gap) => { for (let i = 0; i < n * 3 && spots.length < 99; i++) { const x = 8 + Math.floor(rnd() * (W - 16)), r = r0 + Math.floor(rnd() * rs); if (Math.abs(x - mid) < 30 + r || (x > mid - 60 && x < mid - 14) || spots.some((p) => Math.abs(p.x - x) < gap + r + p.r && Math.abs(p.y - y0) < 10)) continue; spots.push({ x, y: y0 + Math.floor(rnd() * ys), r, blue: rnd() < 0.55, tilt: (rnd() < 0.5 ? (rnd() - 0.5) * 0.4 : (rnd() < 0.5 ? -1 : 1) * (1.15 + rnd() * 0.35)) }); if (spots.filter((p) => p.y >= y0 && p.y < y0 + ys + 1).length >= n) break; } };
      place(Math.round(W / 46), 96, 4, 5, 2, 8);
      place(Math.round(W / 70), 108, 7, 7, 3, 12);
      for (const p of spots.sort((a, b) => a.y - b.y)) brolly(p.x, p.y, p.r, p.blue, p.tilt);
      // a little white reading table (drawn in front of you)
      const tx = mid - 46;
      const Tb = new Raster(24, 14);
      Tb.rect(0, 0, 24, 2, T('#ffffff')); Tb.rect(0, 2, 24, 1, T('#e2d8ca')); Tb.rect(11, 3, 2, 10, T('#e8dccb')); Tb.rect(7, 13, 10, 1, T('#d8ccb8'));
      s.table = { cv: toCanvas(Tb), x: tx, y: 96 };
      s.motes = Array.from({ length: 16 }, () => ({ x: mid - 14 + rnd() * 28, y: 30 + rnd() * 60, p: rnd() * 6 }));
    },
    draw(c, sc, e, t, s, P) {
      for (const m of s.motes) { const y = 30 + ((m.y - 30 + t * 2) % 60); c.fillStyle = `rgba(255,236,200,${0.4 + 0.3 * Math.sin(t * 2 + m.p)})`; c.fillRect(Math.round(m.x + Math.sin(t * 0.8 + m.p) * 3), Math.round(y), 1, 1); }
      for (const [i, k] of s.crystals.entries()) if (Math.sin(t * 2.4 + i * 1.3) > 0.7) twinkle(c, k.x, k.y, 0.9, '255,250,230');
      sc.glow(Math.round(sc.W / 2), 14, 16, 0.18, '255,236,190');
      // you reading at the little table
      const tb = s.table, cut = tb.y + 1;
      sitBehind(sc, c, tb.x + 4, cut, -1);
      c.drawImage(tb.cv, tb.x, tb.y);
      if (!sc.input.avatar?.hidden) sc.hiRect(P('#f8f2ff'), tb.x + 6, tb.y - 2, 8, 2); sc.hiRect(P('#8aa8e4'), tb.x + 9, tb.y - 2, 1, 2);
      // your guide in the middle of the hall: arms open and a twirl on a break
      const gc = sc.guideCv;
      if (gc) { const gx = Math.round(sc.W / 2 - gc.w / 2), gb = 102; sc.drawGuide(c, gx, gb - gc.h, guidePose(sc, t).cv); if (breaking(sc)) for (let i = 0; i < 3; i++) heart(c, gx + 4 + i * 8, gb - gc.h - 6 - Math.round(((t * 8 + i * 5) % 10)), i % 2 ? '#8aa8e4' : '#f6a8c8'); }
      sc.drawFamiliar(c, Math.floor(t * 1.2) % 2, tb.x - sc.petW - 4, 112);
    },
  },
};
