// Outing scenes: shown while you are out on a fitness, social, outdoors or chores quest.
// In the star world these are the dance practice room, the Starlight Café, the star garden and
// the inside of the dome house. Each follows the real sky, season and weather like the planet does,
// and your star guide comes along.
import { drawFestoon } from './festive.js';
import { Scene, H, BAYER, hx2, mix, css, clamp, rng, Raster, heroCanvases } from './scene.js';
import { StudyScene } from './study.js';
import { PlanetScene, guideKey } from './planet.js';
import { CAT } from './sprites.js';
import { WORLD_KINDS } from './worlds.js';

// ping-pong along [x0, x1] at `speed` px/s -> [x, direction]
const pingPong = (t, speed, x0, x1) => {
  const span = Math.max(1, x1 - x0), d = (t * speed) % (2 * span);
  return d < span ? [x0 + d, 1] : [x1 - (d - span), -1];
};

// dithered sky in a box (optionally clipped to a window shape), with stars, sun or moon
function paintSky(R, e, x0, y0, x1, y1, clip = null) {
  const N = 12, steps = Array.from({ length: N }, (_, i) => mix(e.top, e.bot, i / (N - 1)));
  const inside = (x, y) => !clip || clip(x, y);
  for (let y = y0; y < y1; y++) {
    const v = clamp((y - y0) / (y1 - y0), 0, 1) ** 1.2 * (N - 1), lo = Math.floor(v), fr = v - lo;
    for (let x = x0; x < x1; x++) if (inside(x, y)) R.put(x, y, steps[Math.min(N - 1, fr * 16 > BAYER[y & 3][x & 3] ? lo + 1 : lo)]);
  }
  // stars: a few even by day, as in a dream
  const sr = rng(7), a = clamp(0.15 + e.dark * 0.85, 0, 1) * (1 - e.grey);
  for (let i = 0; i < (x1 - x0) * (y1 - y0) * 0.012; i++) {
    const x = x0 + Math.floor(sr() * (x1 - x0)), y = y0 + Math.floor(sr() * (y1 - y0) * 0.75), b = sr();
    if (inside(x, y)) R.put(x, y, b > 0.5 ? [255, 246, 214] : [222, 216, 255], a * (0.3 + b * 0.6));
  }
  if (e.alt > -3 && !e.grey) {
    const sx = Math.round(x0 + (x1 - x0) * 0.78), sy = Math.round(clamp(y1 - 8 - e.alt * 1.1, y0 + 6, y1 - 4));
    R.disk(sx, sy, 7, (x, y) => inside(x, y) && R.put(x, y, [255, 230, 214], 0.2));
    R.disk(sx, sy, 4, (x, y) => inside(x, y) && R.put(x, y, e.alt < 6 ? [255, 210, 176] : [255, 250, 232]));
  } else if (e.dark > 0.5) {
    const mx = Math.round(x0 + (x1 - x0) * 0.22), my = y0 + 9;
    R.disk(mx, my, 3, (x, y, nx) => inside(x, y) && R.put(x, y, nx > 0.35 ? mix(e.top, [80, 70, 130], 0.4) : [255, 246, 220], (1 - e.grey * 0.6)));
  }
}

// soft pastel cloud colours for the light: [lit, mid, deep]
const cloudCols = (e) => ['#fde6f2', '#e6dcfa', '#c8bcf0'].map((h) => mix(hx2(h), e.bot, 0.35).map((v) => v * clamp((e.day ?? 1 - e.dark) + 0.45, 0.55, 1)));

// a rectangular window onto the real sky and its sea of clouds, with a sill
function paintWindow(R, T, e, x0, y0, w, h) {
  const x1 = x0 + w, y1 = y0 + h;
  paintSky(R, e, x0, y0, x1, y1);
  const cl = cloudCols(e);
  for (let x = x0; x < x1; x++) { const top = Math.round(y1 - h * 0.24 + 1.5 * Math.sin(x * 0.55)); for (let y = top; y < y1; y++) R.put(x, y, y === top ? cl[0] : y < top + 3 ? cl[1] : cl[2]); }
  const fr = T('#8a7ac8');
  R.rect(x0 - 2, y0 - 2, w + 4, 2, fr); R.rect(x0 - 2, y1, w + 4, 2, fr);
  R.rect(x0 - 2, y0, 2, h, fr); R.rect(x1, y0, 2, h, fr);
  R.rect(x0 + Math.floor(w / 2), y0, 1, h, fr); R.rect(x0, y0 + Math.floor(h / 2), w, 1, fr);
  R.rect(x0 - 3, y1 + 2, w + 6, 2, T('#b4a6e6')); R.rect(x0 - 3, y1 + 2, w + 6, 1, T('#d4ccf2'));
  if (e.pal.snowy) R.rect(x0, y1 - 1, w, 1, [240, 246, 252]);
  return { x0, y0, x1, y1 };
}

// a plus-shaped little star
function star(R, x, y, col, big = false) {
  R.put(x, y, col); R.put(x - 1, y, col); R.put(x + 1, y, col); R.put(x, y - 1, col); R.put(x, y + 1, col);
  if (big) { R.put(x - 2, y, col); R.put(x + 2, y, col); R.put(x, y - 2, col); R.put(x, y + 2, col); }
}

function toCanvas(R) {
  const cv = document.createElement('canvas'); cv.width = R.w; cv.height = R.h;
  cv.getContext('2d').putImageData(R.img, 0, 0);
  return cv;
}

function catCanvases(T, fur) {
  const pal = CAT.pal(fur);
  return CAT.frames.map((rows) => {
    const cv = document.createElement('canvas'); cv.width = 8; cv.height = 6;
    const g = cv.getContext('2d');
    rows.forEach((row, j) => { for (let i = 0; i < 8; i++) if (row[i] !== '.') { g.fillStyle = row[i] === 'y' ? pal.y : css(T(pal.k)); g.fillRect(i, j, 1, 1); } });
    return cv;
  });
}

// pastel blossom trees, coloured by season, with little star fruit
const CANOPY = {
  spring: ['#f29ac0', '#f8bcd4', '#fde6ef'], summer: ['#5eae8a', '#8cd8ae', '#c0f0d2'],
  autumn: ['#e88a6a', '#f6b08a', '#fcd8b8'], winter: ['#a89ad8', '#d4ccf2', '#ffffff'],
};
// A full, cloud-shaped blossom tree about 2r wide: a tapered trunk that forks into branches, a canopy of
// overlapping puffs (each lit from the top left, so it reads as clumps of flowers), a soft dark rim,
// little five-petal blooms sprinkled over it, and petals fallen on the grass beneath.
function blossom(R, T, e, x, base, r, rnd) {
  const can = CANOPY[e.pal.snowy ? 'winter' : e.season].map(T);
  const rim = mix(can[0], [96, 64, 120], 0.38), bark = T('#7e5e80'), barkL = T('#a888aa'), barkD = T('#5a405e');
  const th = Math.round(r * 1.05), top = base - th;
  // trunk with a root flare
  for (let y = top; y <= base; y++) {
    const w = y >= base - 1 ? 7 : y > base - th * 0.5 ? 4 : 3, x0 = x - (w >> 1);
    R.rect(x0, y, w, 1, bark); R.put(x0, y, barkL); R.put(x0 + w - 1, y, barkD);
  }
  // branches reaching up into the canopy
  const br = [[-0.6, -0.35], [0.62, -0.45], [-0.15, -0.8], [0.25, -0.75]];
  for (const [dx, dy] of br) R.line(x, top + 3, x + Math.round(dx * r), top + Math.round(dy * r), bark);
  // the canopy: puffs drawn bottom first, so the upper ones overlap
  const cy = top - Math.round(r * 0.2);
  const puffs = [[-0.95, 0.12, 0.44], [0.95, 0.08, 0.46], [-0.55, -0.18, 0.6], [0.58, -0.25, 0.62], [0, -0.3, 0.66],
    [-0.32, -0.82, 0.55], [0.36, -0.86, 0.55], [0, -1.15, 0.42], [-1.15, -0.45, 0.32], [1.12, -0.5, 0.34]]
    .map(([dx, dy, k]) => [x + Math.round(dx * r), cy + Math.round(dy * r), Math.max(3, Math.round(k * r + (rnd() - 0.5) * 2))])
    .sort((a, b) => b[1] - a[1]);
  for (const [px, py, pr] of puffs) R.disk(px, py, pr + 1, (qx, qy) => R.put(qx, qy, rim));
  const leaf = [];
  for (const [px, py, pr] of puffs) R.disk(px, py, pr, (qx, qy, nx, ny) => {
    const lit = -(ny * 0.85 + nx * 0.45) + (rnd() - 0.5) * 0.35;
    R.put(qx, qy, lit > 0.42 ? can[2] : lit < -0.42 ? can[0] : can[1]);
    leaf.push([qx, qy, lit]);
  });
  // little blooms: a pale centre with four petals, mostly on the lit side
  const bloom = mix(can[2], [255, 255, 255], 0.55), heart = T('#ffe08a');
  for (let k = 0; k < r * 2.2 && leaf.length; k++) {
    const [bx, by, lit] = leaf[Math.floor(rnd() * leaf.length)];
    if (lit < -0.2 && rnd() < 0.7) continue;
    R.put(bx, by, rnd() < 0.3 ? heart : bloom);
    if (rnd() < 0.55) { R.put(bx - 1, by, can[2]); R.put(bx + 1, by, can[2]); R.put(bx, by - 1, can[2]); R.put(bx, by + 1, can[2]); }
  }
  if (e.pal.snowy) for (const [qx, qy, lit] of leaf) if (lit > 0.5 && rnd() < 0.8) R.put(qx, qy, [250, 252, 255]);
  // petals on the grass around the roots
  for (let k = 0; k < r * 1.4; k++) R.put(x + Math.round((rnd() - 0.5) * r * 2.6), base + Math.floor(rnd() * 5) - 1, rnd() < 0.5 ? can[1] : can[2]);
}

// a little pixel sprite: rows of palette keys ('.' is clear), pre-tinted for the light
function sprite(T, rows, pal) {
  const cv = document.createElement('canvas'); cv.width = rows[0].length; cv.height = rows.length;
  const g = cv.getContext('2d');
  rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] !== '.' && pal[row[i]]) { g.fillStyle = css(T(pal[row[i]])); g.fillRect(i, j, 1, 1); } });
  return cv;
}

// The café's two regulars, from the user's own pixel designs: a hamster and a fox in pink scarves.
// k outline · o fur · y light fur · c cream · p scarf pink · q blush · w white
const HAMSTER = [
  '...kkk........kkk...',
  '..koook.kkkk.koook..',
  '.kockookooookookcok.',
  '.koppkooooooookppok.',
  '..kcqooooooooooqck..',
  '..kooooooooooooook..',
  '.koooooooccoooooook.',
  '.koooccooccooccoook.',
  'kooockccccccckccoook',
  'kyccckccckccckccccok',
  'kccppcccqqqcccpppcok',
  '.kcccccccccccccccck.',
  'kpkkcccccccccccckkpk',
  'kpppkkkkkkkkkkkkpppk',
  'kppppppppppppppppppk',
  '.kpppppppppppppppkk.',
  'kokkppppppppppkkkpkk',
  'kocckkkkkkkkkkppkook',
  'koccccccccckpkppkpok',
  '.kocccccccckpkppkok.',
  '..kocccccccckkkkok..',
  '...kcckkkkkkkcckk...',
  '....kk.......kk.....',
];
const FOX = [
  '..kk...........kk.....',
  '.kkokk.......kkokk....',
  '.kcook.kkkkk.koock....',
  '.kcwookoooookoocck....',
  '.kywwooooooooowwyk....',
  '.kykoooooooooookyk....',
  '..koooooooooooook.....',
  '..koooooooooooook.....',
  '.koooooooooooooook....',
  '.koookoooooookoook....',
  'koccckocckccokcccok...',
  '.kcppccccpccccppck....',
  'kpkccccccccccccckpk...',
  'kpppkkkkkkkkkkkkppk.k.',
  'kkppppppppppppppppkkk.',
  '.kppppppppppppppkkccck',
  '..kkppppppppppkkpkowck',
  '..kokkkkkkkkkkpppkoock',
  '..koooccccckpkpppkook.',
  '..kookocccckpkppkkook.',
  '..kkokoocccokkkkookk..',
  '....kkookkkokcookk....',
  '.....kkk...kkkkk......',
];
// a happy face for the toast: eyes closed into little arcs
const happy = (rows, ey) => {
  const g = rows.map((r) => [...r]), r = rows[ey];
  for (let x = 1; x < r.length - 1; x++) if (r[x] === 'k' && r[x - 1] !== 'k' && r[x + 1] !== 'k' && r[x - 1] !== '.') {
    g[ey + 1][x] = rows[ey + 1][x - 1]; g[ey + 1][x - 1] = 'k'; g[ey + 1][x + 1] = 'k';
  }
  return g.map((row) => row.join(''));
};
function critterFrames(T, rows, eyeRow, fur, light) {
  const pal = { k: '#2a2030', o: fur, y: light, c: '#fff8d8', p: '#f6a8b8', q: '#f7c6c8', w: '#ffffff' };
  return [sprite(T, rows, pal), sprite(T, happy(rows, eyeRow), pal)];
}

const MILK = ['.bbb.', '.www.', '.www.', 'wwwww', 'wwwww', 'wbbbw', 'wbwbw', 'wwwww', '.www.'];
const FLOUR = ['..t..t..', '...tt...', '.ssssss.', 'ssssssss', 'ssFFFFss', 'ssFssFss', 'ssFFsFss', 'ssssssss', '.ssssss.'];
const EGG = ['.ee.', 'eeeE', 'eeeE', 'eeeE', '.eE.'];
const BOWL = ['kkkkkkkkkkkkkk', '.KKKKKKKKKKKK.', '.KKwKKKKKKKKK.', '..KKKKKKKKKK..', '...KKKKKKKK...', '....kkkkkk....'];
const CAKE = [
  '.......g........',
  '..oo..goo...oo..',
  '..oh.c.oh.c.oh..',
  '.FFFFFFFFFFFFFF.',
  '.FFFFFFFFFFFFFF.',
  '.FsFsssFssssFsF.',
  '.Fsssssssssssss.',
  '.ssssssssssssss.',
  '.cccccccccccccc.',
  '.ssssssssssssss.',
  '.ssssssssssssss.',
  '.SSSSSSSSSSSSSS.',
  'pppppppppppppppp',
  '......PPPP......',
  '.....PPPPPP.....',
];

// a tiny heart
function heart(c, x, y, col = '#f07a9a') { c.fillStyle = col; c.fillRect(x, y, 1, 1); c.fillRect(x + 2, y, 1, 1); c.fillRect(x, y + 1, 3, 1); c.fillRect(x + 1, y + 2, 1, 1); }
// a twinkling four-point star
function twinkle(c, x, y, a, col = '255,240,180') {
  c.fillStyle = `rgba(${col},${a})`; c.fillRect(x, y, 1, 1);
  if (a > 0.6) { c.fillStyle = `rgba(${col},${a * 0.6})`; c.fillRect(x - 1, y, 3, 1); c.fillRect(x, y - 1, 1, 3); }
}
// a filled pixel disc, drawn live
function dot(c, x, y, r) { for (let dy = -r; dy <= r; dy++) { const w = Math.floor(Math.sqrt(r * r - dy * dy + r * 0.5)); c.fillRect(x - w, y + dy, 2 * w + 1, 1); } }

const KINDS = {
  // ---- the dance practice room ----------------------------------------------
  training: {
    build(R, T, e, W, s, rnd) {
      const cx = Math.round(W / 2);
      // soft lilac-white walls and a periwinkle ceiling trim with spotlights
      for (let y = 0; y < 96; y++) for (let x = 0; x < W; x++) R.put(x, y, T(x % 24 === 0 ? '#e4dcf6' : '#efe9fb'));
      R.rect(0, 0, W, 4, T('#6a5aa8')); R.rect(0, 4, W, 1, T('#5a4a98'));
      s.lamps = [];
      for (let x = 14; x < W - 6; x += 36) { R.rect(x - 2, 5, 5, 2, T('#4a3f8a')); R.rect(x - 1, 7, 3, 1, T('#fff6d0')); s.lamps.push(x); }
      // the mirror wall, with diagonal shine
      const m = { x0: 22, x1: W - 22, y0: 12, y1: 92 };
      for (let y = m.y0; y < m.y1; y++) for (let x = m.x0; x < m.x1; x++) {
        const d = (((x - y * 0.6) % 46) + 46) % 46;
        R.put(x, y, T(d < 3 ? '#f6f7ff' : d < 5 ? '#e9edfd' : y > 80 ? '#cfd6f2' : '#dce2f8'));
      }
      R.rect(m.x0, 80, m.x1 - m.x0, 1, T('#c4cbee'));
      R.rect(m.x0 - 1, m.y0 - 1, m.x1 - m.x0 + 2, 1, T('#b4a6e6')); R.rect(m.x0 - 1, m.y0, 1, m.y1 - m.y0, T('#b4a6e6')); R.rect(m.x1, m.y0, 1, m.y1 - m.y0, T('#b4a6e6'));
      // the barre
      R.rect(m.x0 - 2, 68, m.x1 - m.x0 + 4, 2, T('#f0d4a8')); R.rect(m.x0 - 2, 68, m.x1 - m.x0 + 4, 1, T('#fbe8c8'));
      for (let x = m.x0 + 6; x < m.x1; x += 30) R.rect(x, 70, 1, 3, T('#b4a6e6'));
      // little windows above the speakers, then the speakers
      s.wins = [paintWindow(R, T, e, 3, 16, 16, 22), paintWindow(R, T, e, W - 19, 16, 16, 22)];
      R.rect(0, 92, W, 4, T('#c8bcea')); R.rect(0, 92, W, 1, T('#b4a6e6'));
      s.speakers = [];
      for (const x0 of [3, W - 19]) {
        R.rect(x0, 62, 16, 34, T('#3a3458')); R.rect(x0, 62, 16, 1, T('#5a5278')); R.rect(x0, 62, 1, 34, T('#4a4268'));
        R.rect(x0 + 6, 65, 4, 1, T('#9fdcc8'));
        s.speakers.push({ x: x0 + 8, y: [74, 87] });
      }
      // pastel wooden floor
      for (let y = 96; y < H; y++) for (let x = 0; x < W; x++) R.put(x, y, T((y - 96) % 5 === 0 ? '#e2c4a8' : (x + Math.floor((y - 96) / 5) * 17) % 31 === 0 ? '#e2c4a8' : y < 100 ? '#f8e6d2' : '#f2d9c0'));
      // a water bottle and a towel by the right speaker
      const bx = W - 30;
      R.rect(bx, 100, 3, 7, T('#8ab0f0')); R.rect(bx, 102, 3, 2, T('#cfe0ff')); R.rect(bx, 99, 3, 1, T('#fbf6ff'));
      for (let i = 0; i < 7; i++) R.rect(bx - 10 + i, 104, 1, 3, T(i % 3 === 1 ? '#fbf6ff' : '#f6b6c8'));
      s.mirror = m; s.floorY = 110;
      s.danceX = [cx - 22, cx + 6];
    },
    draw(c, sc, e, t, s, P) {
      // 120 beats a minute: a step on every beat, a little hop, and a turn every four
      const beat = t * 2, b = Math.floor(beat), ph = beat - b, pulse = ph < 0.18;
      // spotlights sweeping the floor in pastel
      s.lamps.forEach((x, i) => {
        const fx = x + Math.sin(t * 0.9 + i * 1.7) * 14, col = ['255,170,210', '170,190,255', '190,255,220'][i % 3];
        c.fillStyle = `rgba(${col},0.07)`; c.beginPath(); c.moveTo(x - 1, 8); c.lineTo(x + 2, 8); c.lineTo(fx + 12, 106); c.lineTo(fx - 12, 106); c.fill();
        sc.glow(fx, 106, 18, 0.12 + (pulse ? 0.06 : 0), col);
      });
      // speakers thump on the beat
      for (const sp of s.speakers) for (const cy of sp.y) {
        c.fillStyle = P('#2a2440'); dot(c, sp.x, cy, pulse ? 5 : 4);
        c.fillStyle = P('#5a5278'); dot(c, sp.x, cy, 2);
        c.fillStyle = P('#f29ac0'); c.fillRect(sp.x, cy, 1, 1);
      }
      // music notes drifting up
      for (let i = 0; i < 4; i++) {
        const p = (t * 0.3 + i / 4) % 1, sp = s.speakers[i % 2], nx = Math.round(sp.x + Math.sin(p * 8 + i) * 4 + (i % 2 ? -4 : 4)), ny = Math.round(58 - p * 40);
        c.fillStyle = `rgba(${['242,154,192', '138,176,240', '127,207,180', '180,154,240'][i]},${1 - p})`;
        c.fillRect(nx, ny, 2, 2); c.fillRect(nx + 1, ny - 4, 1, 4); c.fillRect(nx + 2, ny - 4, 1, 1);
      }
      const step = [0, 3, 0, -3][b % 4], face = Math.floor(b / 4) % 2 === 1, hop = ph < 0.2 ? 2 : ph < 0.35 ? 1 : 0;
      const hx = s.danceX[0] + step, gx = s.danceX[1] + step, m = s.mirror, gc = sc.guideCv;
      const pose = gc && [gc.front, gc.frontWalk[0], gc.wave[0], gc.frontWalk[2]][b % 4];
      // faded reflections in the mirror (not for uploaded sprites, which draw on their own layer)
      if (!sc.heroHi) sc.ghost(c, sc.heroCv[0], hx, 88 - sc.hh - hop, !face, 0.28, m);
      if (gc) sc.blitGuide(pose, gx, 88 - gc.h - hop, { flip: !face, alpha: 0.28, clip: m });
      // sparkles on the glass
      for (let i = 0; i < 4; i++) twinkle(c, Math.round(m.x0 + ((i * 47 + t * 6) % (m.x1 - m.x0))), m.y0 + 6 + ((i * 17) % 50), 0.5 + 0.5 * Math.sin(t * 3 + i), '255,255,255');
      // soft shadows, then the two of you dancing in sync
      c.fillStyle = 'rgba(106,90,168,0.2)'; c.fillRect(hx + 2, s.floorY - 1, sc.hw - 4, 2);
      if (gc) c.fillRect(gx + 2, s.floorY - 1, gc.w - 4, 2);
      sc.drawHero(c, hx, s.floorY - sc.hh - hop, face, 0);
      if (gc) sc.drawGuide(c, gx, s.floorY - gc.h - hop, pose, face);
      // the familiar nods along by the speaker
      sc.drawFamiliar(c, b % 2, s.speakers[0].x + 10, 116 - (pulse ? 1 : 0));
      for (const w of s.wins) sc.windowWeather(c, e, t, w);
    },
  },

  // ---- the star garden --------------------------------------------------------
  woods: {
    outdoor: true, clouds: true,
    build(R, T, e, W, s, rnd) {
      paintSky(R, e, 0, 0, W, 96);
      const haze = (h, k) => mix(T(h), e.bot, k);
      // little floating islands, far away
      const isl = (x, y, r) => {
        x = Math.round(x);
        for (let i = -r; i <= r; i++) {
          const top = y - Math.round(Math.sqrt(1 - (i / r) ** 2) * 2), deep = Math.round((1 - Math.abs(i) / r) * r * 0.9);
          for (let j = top; j <= y + deep; j++) R.put(x + i, j, haze(j === top ? e.pal.grass[1] : j === top + 1 ? e.pal.grass[0] : j < y + 2 ? '#aa9fe8' : '#8a7ed0', 0.4));
        }
        R.rect(x, y - 5, 1, 3, haze('#8a6a8a', 0.4));
        R.disk(x, y - 6, 2, (px, py) => R.put(px, py, haze(CANOPY[e.pal.snowy ? 'winter' : e.season][1], 0.4)));
      };
      isl(W * 0.18, 44, 9); isl(W * 0.72, 30, 6); if (W > 200) isl(W * 0.92, 54, 4);
      // a band of cloud sea on the horizon
      const cl = cloudCols(e);
      for (let x = -4, k = 0; x < W + 6; k++) { const r = 4 + ((k * 7) % 5), y0 = 85 + ((k * 5) % 3); R.disk(x, y0, r, (px, py, nx, ny) => R.put(px, py, ny < -0.5 ? cl[0] : ny > 0.3 ? cl[1] : cl[0])); x += r + 3; }
      R.rect(0, 89, W, 4, cl[2]);
      // the garden's lawn
      const [g0, g1, g2] = e.pal.grass.map(T);
      const edge = (x) => 91 + Math.round(Math.sin(x * 0.07) * 1.5);
      for (let x = 0; x < W; x++) for (let y = edge(x); y < H; y++) { const n = rnd(); R.put(x, y, y === edge(x) ? g1 : n < 0.08 ? g1 : n > 0.92 ? g2 : g0); }
      // a starlight brook on the right
      if (W > 180) {
        const sx = Math.round(W * 0.8), wc = mix(e.bot, [150, 170, 245], 0.55);
        for (let y = 93; y < H; y++) { const x0 = sx + Math.round((y - 93) * 0.4 + Math.sin(y * 0.3) * 2); for (let i = -2; i <= 2 + Math.floor((y - 93) / 12); i++) R.put(x0 + i, y, i === -2 ? mix(wc, [255, 255, 255], 0.3) : wc); }
        s.stream = { x: sx, y: 93 };
      }
      // the stepping-stone trail
      const trail = (x) => Math.round(106 + 3 * Math.sin(x * 0.04));
      for (let x = 2; x < W; x += 9) {
        const y = trail(x + 3);
        for (let i = 0; i < 7; i++) for (let j = -1; j <= 1; j++) if (!(Math.abs(j) === 1 && (i === 0 || i === 6))) R.put(x + i, y + j, T(j === 1 ? '#c8bcea' : e.pal.snowy ? '#f6f4ff' : '#ece6fa'));
      }
      s.trail = trail;
      // blossom trees
      if (W > 360) for (const f of [0.3, 0.74]) blossom(R, T, e, Math.round(W * f), 94 + Math.floor(rnd() * 2), 10 + Math.floor(rnd() * 3), rnd);
      if (W > 150) blossom(R, T, e, Math.round(W * 0.06), 99, 19, rnd);
      blossom(R, T, e, Math.round(W * 0.56), 97, 15, rnd);
      if (W > 240) blossom(R, T, e, Math.round(W * 0.95), 100, 21, rnd);
      s.petal = CANOPY[e.pal.snowy ? 'winter' : e.season];
      // glowing mushrooms, sprouts and flowers
      s.shrooms = [];
      const fl = e.pal.flowers;
      for (let i = 0; i < W / 8; i++) {
        const x = Math.floor(rnd() * W), y = rnd() < 0.5 ? 95 + Math.floor(rnd() * 6) : 112 + Math.floor(rnd() * 6), k = rnd();
        if (s.stream && Math.abs(x - s.stream.x - (y - 93) * 0.4) < 6) continue;
        if (k < 0.18) { const cap = ['#8ab0f0', '#f29ac0', '#b49af0'][i % 3]; R.rect(x, y - 2, 1, 2, T('#fbf6ff')); R.rect(x - 1, y - 4, 3, 2, T(cap)); R.put(x, y - 4, T('#ffffff')); s.shrooms.push({ x, y: y - 3 }); }
        else if (k < 0.32 && !e.pal.snowy) { const f = T('#5eae8a'); R.line(x, y, x - 2, y - 3, f); R.line(x, y, x + 2, y - 3, f); R.put(x, y - 1, f); }
        else if (fl.length) { R.put(x, y, T('#5eae8a')); R.put(x, y - 1, T(fl[i % fl.length])); R.put(x - 1, y - 1, T(fl[i % fl.length])); R.put(x + 1, y - 1, T(fl[i % fl.length])); R.put(x, y - 2, T(fl[i % fl.length])); }
        else R.put(x, y, T('#ffffff'));
      }
      s.walk = [Math.round(W * 0.06) + 30, Math.round(W * 0.68)];
    },
    draw(c, sc, e, t, s, P) {
      // soft rays of light
      if (e.dark < 0.4 && !e.grey) {
        c.fillStyle = `rgba(255,236,230,${0.08 * (1 - e.dark)})`;
        for (let k = 0; k < 3; k++) { const x = sc.W * (0.15 + k * 0.32); c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 7, 0); c.lineTo(x + 34, 112); c.lineTo(x + 18, 112); c.fill(); }
      }
      // petals drifting down on the breeze
      for (let i = 0; i < 12; i++) {
        const p = (t * 0.07 + i / 12) % 1, x = Math.round(((i * 97) % sc.W) - p * 60 + Math.sin(t * 1.3 + i) * 4), y = Math.round(44 + p * 70);
        if (x < 0) continue;
        c.fillStyle = P(s.petal[i % 2 ? 1 : 2]); c.fillRect(x, y, 2, 1); if (i % 3 === 0) c.fillRect(x + 1, y + 1, 1, 1);
      }
      // a shooting star after dark
      if (e.dark > 0.5) { const p = (t % 9) / 1.2; if (p < 1) for (let k = 0; k < 7; k++) { c.fillStyle = `rgba(255,246,210,${(1 - k / 7) * (1 - p)})`; c.fillRect(Math.round(sc.W * 0.85 - p * 50 + k * 2), Math.round(10 + p * 22 - k), 1, 1); } }
      // the brook glitters (with little stars at night)
      if (s.stream) for (let i = 0; i < 6; i++) { const y = 95 + ((i * 5 + Math.floor(t * 8)) % 24); twinkle(c, s.stream.x + Math.round((y - 93) * 0.4 + Math.sin(y * 0.3) * 2), y, e.dark > 0.4 ? 0.9 : 0.5, e.dark > 0.4 ? '255,240,180' : '255,255,255'); }
      // mushrooms glow, more so at night
      for (const m of s.shrooms) sc.glow(m.x, m.y, 6, (0.1 + 0.35 * e.dark) * (0.8 + 0.2 * Math.sin(t * 2 + m.x)), '200,190,255');
      // a slow stroll along the stones with a star lantern, your guide a step behind
      const [x, dir] = pingPong(t, 6, s.walk[0], s.walk[1]);
      const xi = Math.round(x), base = s.trail(xi + (sc.hw >> 1)) + 1, bob = Math.floor(t * 3) % 2;
      const gc = sc.guideCv;
      let back = dir > 0 ? xi - 4 : xi + sc.hw + 4;
      if (gc) {
        const gx = dir > 0 ? xi - gc.w - 5 : xi + sc.hw + 5, gb = s.trail(gx + (gc.w >> 1)) + 1;
        const cyc = dir < 0 ? gc.walkLeft : gc.walk;
        sc.drawGuide(c, gx, gb - gc.h, cyc[Math.floor(Math.abs(gx) / gc.stride) % cyc.length]);
        back = dir > 0 ? gx - 4 : gx + gc.w + 4;
      }
      sc.drawHero(c, xi, base - sc.hh - bob, dir < 0, 0);
      const lx = dir > 0 ? xi + sc.hw - 1 : xi - 2, ly = base - Math.round(sc.hh * 0.45) - bob, sw = Math.round(Math.sin(t * 3) * 0.6);
      c.fillStyle = P('#8a7ac8'); c.fillRect(lx + 1, ly, 1, 3);
      c.fillStyle = '#ffe08a'; c.fillRect(lx + sw, ly + 4, 3, 1); c.fillRect(lx + 1 + sw, ly + 3, 1, 3);
      sc.glow(lx + 1, ly + 4, 10 + 6 * e.dark, 0.18 + 0.35 * e.dark, '255,230,150');
      sc.drawFamiliar(c, Math.floor(t * 3) % 2, dir > 0 ? back - sc.petW : back, base);
      // butterflies by day, star fireflies by night
      for (let i = 0; i < (e.dark > 0.4 ? 12 : e.season === 'winter' ? 0 : 4); i++) {
        const fx = (i * 53 + Math.sin(t * 0.6 + i) * 20 + t * 3) % sc.W, fy = 66 + (i * 13) % 34 + Math.cos(t * 0.8 + i * 2) * 5;
        if (e.dark > 0.4) twinkle(c, Math.round(fx), Math.round(fy), 0.5 + 0.5 * Math.sin(t * 3 + i), i % 2 ? '255,236,160' : '220,210,255');
        else { const flap = Math.floor(t * 8 + i) % 2; c.fillStyle = P(['#f2c14a', '#f29ac0', '#ffffff', '#b49af0'][i % 4]); c.fillRect(Math.round(fx) - flap, Math.round(fy), flap ? 3 : 1, 1); }
      }
      // a bunny hops past now and then
      const rp = (t % 14) / 14;
      if (rp < 0.35 && sc.W > 160) {
        const rx = Math.round(sc.W * 0.88 - rp * 60), hop = Math.round(Math.abs(Math.sin(rp * 40)) * 2);
        c.fillStyle = P('#fbf8ff'); c.fillRect(rx, 112 - hop, 4, 3); c.fillRect(rx, 110 - hop, 2, 2); c.fillRect(rx, 107 - hop, 1, 3); c.fillRect(rx + 1, 108 - hop, 1, 2);
        c.fillStyle = P('#f6b6c8'); c.fillRect(rx, 108 - hop, 1, 1); c.fillRect(rx + 4, 112 - hop, 1, 1);
      }
    },
  },

  // ---- the Starlight Café -----------------------------------------------------
  tavern: {
    build(R, T, e, W, s, rnd) {
      const cx = Math.round(W / 2);
      // a plain, warm wall (a touch deeper towards the ceiling) over a plain sage panel
      for (let y = 0; y < 96; y++) for (let x = 0; x < W; x++) {
        if (y < 64) R.put(x, y, mix(T('#f2dcd8'), T('#fbefe6'), Math.min(1, y / 40)));
        else R.put(x, y, T(y < 65 ? '#8a6a7a' : y < 67 ? '#7fbfa8' : y > 92 ? '#6aa890' : '#a8d8c4'));
      }
      R.rect(0, 0, W, 4, T('#c9a6b4')); R.rect(0, 4, W, 1, T('#a07a8c'));
      // round windows onto the sky
      const port = (x, y, r) => {
        const clip = (px, py) => (px - x) ** 2 + (py - y) ** 2 <= r * r;
        paintSky(R, e, x - r, y - r, x + r + 1, y + r + 1, clip);
        const cl = cloudCols(e);
        for (let px = x - r; px <= x + r; px++) { const top = Math.round(y + r * 0.4 + Math.sin(px * 0.6) * 1.5); for (let py = top; py <= y + r; py++) if (clip(px, py)) R.put(px, py, py === top ? cl[0] : py < top + 3 ? cl[1] : cl[2]); }
        for (let py = y - r - 2; py <= y + r + 2; py++) for (let px = x - r - 2; px <= x + r + 2; px++) { const d = Math.hypot(px - x, py - y); if (d > r + 0.4 && d <= r + 2.2) R.put(px, py, T(d > r + 1.3 ? '#2f7f68' : '#5cb394')); }
        return { x0: x - r, y0: y - r, x1: x + r + 1, y1: y + r + 1, clip };
      };
      s.win = port(Math.max(15, cx - 60), 34, 11);
      if (W > 300) s.win2 = port(Math.round(W * 0.1), 34, 11);
      const flags = ['#f29ac0', '#7fcfb0', '#b49af0', '#ffd86a', '#8ab0f0'];
      // the counter (right): menu board, cups, and a front that the barista stands behind
      const bx = Math.min(W - 46, cx + 64);
      R.rect(bx + 2, 18, 38, 22, T('#d8b050')); R.rect(bx + 3, 19, 36, 20, T('#3c3488'));
      for (let k = 0; k < 4; k++) { R.rect(bx + 6, 22 + k * 4, 10 + (k % 2) * 6, 1, T(flags[k])); R.rect(bx + 30, 22 + k * 4, 5, 1, T('#fbf6ff')); }
      star(R, bx + 35, 36, T('#ffd86a'));
      R.rect(bx, 50, 42, 2, T('#8a6a9a')); R.rect(bx, 52, 42, 1, T('#5a4470'));
      for (let i = 0; i < 6; i++) { R.rect(bx + 3 + i * 7, 46, 4, 4, T(flags[i % 5])); R.put(bx + 7 + i * 7, 47, T(flags[i % 5])); R.rect(bx + 3 + i * 7, 46, 4, 1, T('#fbf6ff')); }
      const ox = bx - 2, oy = 56, cr = new Raster(46, 40);
      const cp = (x, y, w, h, col) => cr.rect(x - ox, y - oy, w, h, T(col));
      // (about waist high on the barista: its top is at y 80)
      cp(ox, 79, 46, 1, '#4a3a6e'); cp(ox, 80, 46, 1, '#fbf6ff'); cp(ox, 81, 46, 2, '#e8dcff'); cp(ox, 83, 46, 1, '#5a4a8a');
      cp(ox, 84, 46, 12, '#a892e4'); cp(ox, 84, 1, 12, '#4a3a6e'); cp(ox + 45, 84, 1, 12, '#4a3a6e');
      for (let x = ox; x < ox + 46; x += 2) cp(x, 84, 1, 1, '#f29ac0');
      for (let x = ox + 4; x < ox + 42; x += 10) { cp(x, 87, 7, 7, '#8a74cc'); cp(x, 87, 7, 1, '#6a54b0'); cp(x + 3, 90, 1, 1, '#ffd86a'); }
      // a cake under a glass dome (left) and a pink coffee machine (right)
      cp(bx + 3, 74, 10, 5, '#f29ac0'); cp(bx + 3, 74, 10, 1, '#fffaf2'); cp(bx + 3, 76, 10, 1, '#fffaf2'); cp(bx + 7, 73, 2, 1, '#e0405a');
      cp(bx + 1, 78, 14, 1, '#7a6ab8');
      for (let px = -7; px <= 7; px++) for (let py = -7; py <= 0; py++) { const d = Math.hypot(px, py); if (d > 6.4 && d <= 7.4) cp(bx + 8 + px, 78 + py, 1, 1, '#b8cdf0'); }
      cp(bx + 33, 66, 10, 13, '#4a3a6e'); cp(bx + 34, 67, 8, 11, '#e86a9e'); cp(bx + 35, 68, 6, 3, '#fbf6ff'); cp(bx + 37, 72, 2, 2, '#3a2a5e'); cp(bx + 36, 75, 4, 3, '#fbf6ff');
      s.counterCv = toCanvas(cr); s.counter = { x: ox, y: oy, w: 46, bx };
      // a plain wooden floor
      for (let y = 96; y < H; y++) { const row = Math.floor((y - 97) / 6); for (let x = 0; x < W; x++) R.put(x, y, T(y === 96 ? '#7a5a5a' : (y - 97) % 6 === 5 ? '#c49a74' : (x + row * 37) % 97 === 0 ? '#c49a74' : '#dcb48c')); }
      // a potted plant by the door
      if (W > 200) { R.rect(5, 86, 8, 10, T('#f29ac0')); R.rect(4, 86, 10, 2, T('#f8bcd4')); for (const [dx, dy] of [[2, -3], [4, -6], [6, -4], [3, -8], [8, -7], [5, -2], [1, -5], [7, -2]]) R.rect(4 + dx, 86 + dy, 2, 2, T(dy < -6 ? '#8cd8ae' : '#5eae8a')); }
      // the hamster and the fox, on cushions either side of a little round table, with milk tea
      s.table = { x0: cx - 14, x1: cx + 14, y: 94 };
      s.critters = [
        { cv: critterFrames(T, HAMSTER, 8, '#efb86e', '#fcdb9e'), x: cx - 14 - 21, w: 20, cup: '#f29ac0' },
        { cv: critterFrames(T, FOX, 9, '#f8a63a', '#fcd98a'), x: cx + 14 - 1, w: 22, cup: '#8ab0f0' },
      ];
      for (const cr of s.critters) { const x0 = cr.x + 1, w = cr.w - 2; R.rect(x0, 104, w, 3, T('#c88aa8')); R.rect(x0 + 1, 103, w - 2, 1, T('#e8aac4')); R.rect(x0, 107, w, 1, T('#9a6a84')); }
      // star lanterns hanging from the ceiling (clear of the windows and the menu)
      s.lanterns = [];
      const clear = (x) => !(x > bx - 4 && x < bx + 46) && ![s.win, s.win2].some((w) => w && x > w.x0 - 6 && x < w.x1 + 6);
      for (let x = cx + 2 - Math.floor((cx - 4) / 76) * 76; x < W - 4; x += 76) if (x > 4 && clear(x)) s.lanterns.push({ x, y: 20 });
      for (const l of s.lanterns) R.rect(l.x, 5, 1, 13, T('#a07a8c'));
      s.walk = null;
    },
    draw(c, sc, e, t, s, P) {
      for (const l of s.lanterns) {
        const tw = Math.sin(t * 3 + l.x) > 0.6;
        c.fillStyle = '#ffd86a'; c.fillRect(l.x - 2, 21, 5, 1); c.fillRect(l.x - 1, 20, 3, 3); c.fillRect(l.x, 18, 1, 6);
        c.fillStyle = tw ? '#ffffff' : '#fff2b0'; c.fillRect(l.x, 21, 1, 1);
        sc.glow(l.x, 21, 22, 0.16 + 0.26 * e.dark, '255,220,160');
      }
      // your guide, behind the counter, shakes up a drink now and then
      const ct = s.counter, gc = sc.guideCv;
      // (he stands on a little step behind it, so his face and shoulders show over the top)
      c.drawImage(s.counterCv, ct.x, ct.y);
      if (gc) {
        const shake = t % 7 < 2.4, gx = ct.bx + 24 - gc.w / 2, gy = 79 - Math.round(gc.h * 0.64) - gc.seat - (shake ? Math.floor(t * 8) % 2 : 0);
        sc.drawGuide(c, gx, gy, shake ? gc.frontWalk[1] : gc.front, false, 79 - gy);
        if (s.guideBox) s.guideBox.h = 79 - gy;
        // the shaker he's mixing a drink in, held over the counter
        const sy = 74 + (shake ? Math.round(Math.sin(t * 22) * 1.5) : 0), sx = ct.bx + 29;
        sc.hiRect(P('#4a3a6e'), sx - 1, sy - 2, 5, 7); sc.hiRect(P('#e6dcfa'), sx, sy, 3, 4); sc.hiRect(P('#e86a9e'), sx, sy - 1, 3, 1);
        if (shake) twinkle(c, sx + 5, sy + Math.round(Math.sin(t * 9) * 2), 0.8);
      }
      // the hamster and the fox raise their milk teas and clink them together
      const tb = s.table, mid = Math.round((tb.x0 + tb.x1) / 2);
      const cyc = t % 4.2, up = cyc < 0.5 ? cyc / 0.5 : cyc < 1.5 ? 1 : cyc < 2 ? 1 - (cyc - 1.5) / 0.5 : 0;
      const ease = up * up * (3 - 2 * up), clink = cyc >= 0.5 && cyc < 1.5;
      s.critters.forEach((cr, i) => {
        const bob = clink ? -1 : Math.round(Math.sin(t * 2 + i * 2.4) * 0.6), y = 105 - 23 + bob;
        c.drawImage(cr.cv[clink ? 1 : 0], cr.x, y);
      });
      // the little round table, with a star flower in a vase
      c.fillStyle = P('#7a5a6a'); c.fillRect(tb.x0 - 1, tb.y - 1, tb.x1 - tb.x0 + 2, 4);
      c.fillStyle = P('#fbf6f0'); c.fillRect(tb.x0, tb.y, tb.x1 - tb.x0, 2); c.fillStyle = P('#e6a8bc'); c.fillRect(tb.x0, tb.y + 2, tb.x1 - tb.x0, 1);
      c.fillStyle = P('#9a7a8a'); c.fillRect(mid - 1, tb.y + 3, 3, 11); c.fillRect(mid - 5, tb.y + 13, 11, 2);
      c.fillStyle = P('#7fcfb0'); c.fillRect(mid - 1, tb.y - 3, 3, 3); c.fillStyle = P('#4a9a6a'); c.fillRect(mid, tb.y - 6, 1, 3);
      c.fillStyle = P('#ffd86a'); c.fillRect(mid - 1, tb.y - 7, 3, 1); c.fillRect(mid, tb.y - 8, 1, 3);
      // their cups: resting on the table, then lifted to meet in the middle
      s.critters.forEach((cr, i) => {
        const restX = i === 0 ? tb.x0 + 2 : tb.x1 - 6, meetX = i === 0 ? mid - 5 : mid + 1, restY = tb.y - 5, meetY = tb.y - 16;
        const mx = Math.round(restX + (meetX - restX) * ease), my = Math.round(restY + (meetY - restY) * ease);
        c.fillStyle = P('#7a5a6a'); c.fillRect(mx - 1, my - 1, 6, 7);
        c.fillStyle = P('#fbf6ff'); c.fillRect(mx, my, 4, 5);
        c.fillStyle = P('#e6c4a0'); c.fillRect(mx, my + 1, 4, 3);
        c.fillStyle = P('#5a4050'); c.fillRect(mx, my + 3, 1, 1); c.fillRect(mx + 2, my + 3, 1, 1);
        c.fillStyle = P(cr.cup); c.fillRect(mx, my + 4, 4, 1); c.fillRect(mx + (i ? 1 : 2), my - 3, 1, 3);
      });
      if (clink) {
        const k = (cyc - 0.5) / 1, y0 = tb.y - 20;
        c.fillStyle = '#fff6dc';
        for (let j = 0; j < 6; j++) c.fillRect(mid - 1 + Math.round(Math.cos(j * 1.05) * k * 8), y0 - Math.round(Math.abs(Math.sin(j * 1.05 + 0.4)) * k * 6) + Math.round(k * k * 7), 1, 1);
        c.fillStyle = '#ffe08a'; c.fillRect(mid - 1, y0 - 2, 1, 3); c.fillRect(mid - 2, y0 - 1, 3, 1);
        s.critters.forEach((cr, j) => { c.globalAlpha = 1 - k * 0.6; heart(c, cr.x + (cr.w >> 1) - 1, 80 - Math.round(k * 6) - j); c.globalAlpha = 1; });
      }
      sc.glow(mid, tb.y - 7, 26, 0.12 + 0.12 * e.dark, '255,220,170');
      // music drifting from somewhere
      for (let i = 0; i < 3; i++) {
        const p = (t * 0.25 + i / 3) % 1, nx = Math.round(sc.W * 0.2 + p * 30 + Math.sin(p * 9) * 3), ny = Math.round(58 - p * 34);
        c.fillStyle = `rgba(${['180,154,240', '242,154,192', '127,190,170'][i]},${1 - p})`; c.fillRect(nx, ny, 2, 2); c.fillRect(nx + 1, ny - 4, 1, 4); c.fillRect(nx + 2, ny - 4, 1, 1);
      }
      sc.drawFamiliar(c, Math.floor(t * 1.3) % 2, Math.min(s.critters[1].x + s.critters[1].w + 6, ct.x - sc.petW - 2), 116);
      sc.windowWeather(c, e, t, s.win);
      if (s.win2) sc.windowWeather(c, e, t, s.win2);
    },
  },

  // ---- inside the dome house --------------------------------------------------
  cottage: {
    build(R, T, e, W, s, rnd) {
      const cx = Math.round(W / 2);
      // the glass dome overhead shows the real sky
      paintSky(R, e, 0, 0, W, 64);
      // its ribs and rings go on a layer of their own, drawn over the drifting clouds
      const rb = new Raster(W, 68), rib = T('#fbf6ff'), ribD = T('#c8bcea');
      for (let k = -8; k <= 8; k++) for (let y = 0; y < 64; y++) { const x = Math.round(cx + k * 22 * Math.sqrt((y + 24) / 88)); rb.put(x, y, rib); rb.put(x + 1, y, ribD); }
      for (const Y of [20, 42]) for (let x = 0; x < W; x++) { const y = Y - Math.round((1 - ((x - cx) / (W / 2)) ** 2) * 4); rb.put(x, y, rib); rb.put(x, y + 1, ribD); }
      rb.rect(0, 62, W, 2, T('#b4a6e6')); rb.rect(0, 64, W, 2, T('#8a7ac8'));
      s.ribCv = toCanvas(rb);
      // mint walls and a pink tiled backsplash
      for (let y = 66; y < 96; y++) for (let x = 0; x < W; x++) R.put(x, y, T(y < 74 ? '#e4f4ec' : (x % 6 === 0 || (y - 74) % 6 === 0) ? '#f0d4e2' : '#fdf0f6'));
      R.rect(0, 74, W, 1, T('#c8e4d6'));
      // a shelf of star jars
      const sx = Math.min(W - 48, cx + 8);
      R.rect(sx, 78, 40, 2, T('#c8bcea'));
      for (let i = 0; i < 6; i++) { const c = ['#f8bcd4', '#cfe0ff', '#c8f0dc', '#fff0b8', '#e0d4fa', '#fcd8b8'][i]; R.rect(sx + 2 + i * 6, 72, 4, 6, T(c)); R.rect(sx + 2 + i * 6, 71, 4, 1, T('#b4a6e6')); R.put(sx + 3 + i * 6, 74, T('#ffd86a')); R.put(sx + 4 + i * 6, 75, T('#ffffff')); }
      // little polaroids of the sky on the left
      for (let k = 0; k < 3; k++) { const px = 6 + k * 11; if (px + 9 > cx - 70) break; R.rect(px, 76 + (k % 2) * 2, 9, 10, T('#fbf6ff')); R.rect(px + 1, 77 + (k % 2) * 2, 7, 6, T(['#3c3488', '#f6b6c8', '#8ab0f0'][k])); R.put(px + 3, 79 + (k % 2) * 2, T('#ffd86a')); }
      // a mint stove (right) for the kettle
      const kx = Math.min(W - 26, sx + 46);
      if (kx + 22 < W) {
        R.rect(kx, 68, 22, 28, T('#9fdcc8')); R.rect(kx, 68, 22, 2, T('#c8f0dc')); R.rect(kx + 4, 78, 14, 12, T('#f6fffb')); R.rect(kx + 5, 79, 12, 7, T('#3a3458'));
        R.rect(kx + 6, 84, 10, 2, T('#f29ac0')); R.rect(kx + 3, 72, 2, 2, T('#f29ac0')); R.rect(kx + 17, 72, 2, 2, T('#f29ac0'));
        s.kettle = { x: kx + 7, y: 62 };
      }
      // peachy floorboards and a round rainbow rug
      for (let y = 96; y < H; y++) for (let x = 0; x < W; x++) R.put(x, y, T((y - 96) % 6 === 0 ? '#e8c8b4' : (x + Math.floor((y - 96) / 6) * 13) % 29 === 0 ? '#e8c8b4' : '#f4dccc'));
      for (let y = 105; y < 118; y++) for (let x = cx - 50; x <= cx + 50; x++) {
        const d = ((x - cx) / 50) ** 2 + ((y - 111.5) / 6.5) ** 2;
        if (d <= 1) R.put(x, y, T(['#f8bcd4', '#fff0b8', '#c8f0dc', '#cfe0ff', '#e0d4fa'][Math.min(4, Math.floor(d * 5))]));
      }
      s.cx = cx;
      s.sp = {
        milk: sprite(T, MILK, { b: '#8ab0f0', w: '#fbfaff' }),
        flour: sprite(T, FLOUR, { t: '#c8a0d8', s: '#fdf4e4', F: '#f6b6c8' }),
        egg: sprite(T, EGG, { e: '#fffaf0', E: '#eadcc8' }),
        bowl: sprite(T, BOWL, { k: '#e07aa8', K: '#f29ac0', w: '#fde0ee' }),
        cake: sprite(T, CAKE, { g: '#7fcfb4', o: '#8a7ad8', h: '#c8b8f8', c: '#fffaf2', F: '#f6b6d0', s: '#fde4b0', S: '#f0c890', p: '#fbf6ff', P: '#d8ccf0' }),
      };
    },
    draw(c, sc, e, t, s, P) {
      // clouds drift over the glass, then the dome's ribs
      c.save(); c.beginPath(); c.rect(0, 0, sc.W, 63); c.clip(); sc.drawClouds(e, 1 / 12); c.restore();
      sc.windowWeather(c, e, t, { x0: 0, y0: 0, x1: sc.W, y1: 62 });
      c.drawImage(s.ribCv, 0, 0);
      const cx = s.cx, sp = s.sp, T0 = t % 10, bowlY = 88;
      // a star mobile turning slowly under the dome
      const mx = cx - 60;
      if (mx > 6) {
        c.fillStyle = P('#c8bcea'); c.fillRect(mx - 12, 8, 25, 1); c.fillRect(mx, 0, 1, 8);
        [[-12, 14, '#ffd86a'], [0, 22, '#f6b6c8'], [12, 16, '#8ab0f0']].forEach(([dx, len, col], i) => {
          const sw = Math.round(Math.sin(t * 1.1 + i * 2) * 2), x = mx + dx + sw, y = 8 + len;
          c.fillStyle = P('#c8bcea'); for (let j = 0; j < len; j++) c.fillRect(mx + dx + Math.round((sw * j) / len), 9 + j, 1, 1);
          c.fillStyle = col; c.fillRect(x - 2, y, 5, 1); c.fillRect(x - 1, y - 1, 3, 3); c.fillRect(x, y - 2, 1, 5);
        });
      }
      if (s.kettle) {
        const k = s.kettle;
        c.fillStyle = P('#f29ac0'); c.fillRect(k.x, k.y, 8, 6); c.fillRect(k.x + 8, k.y + 1, 2, 1); c.fillStyle = P('#f8bcd4'); c.fillRect(k.x + 1, k.y, 3, 1); c.fillRect(k.x + 3, k.y - 1, 2, 1);
        for (let i = 0; i < 4; i++) { const p = (t * 0.9 + i / 4) % 1; c.fillStyle = `rgba(250,246,255,${0.6 * (1 - p)})`; c.fillRect(k.x + 10 + Math.round(p * 4 + Math.sin(p * 7) * 1.5), k.y - Math.round(p * 12), 1, 1); }
        sc.glow(k.x + 5, 86, 16, 0.12 + 0.2 * e.dark, '255,170,210');
      }
      // your guide watches the kitchen magic, and cheers when the cake appears
      const gc = sc.guideCv, gx = cx - 94;
      if (gc && gx >= 2) {
        const cheer = T0 > 6.4 && T0 < 9.4;
        sc.drawGuide(c, gx, 112 - gc.h - (cheer ? Math.floor(t * 6) % 2 * 2 : 0), cheer ? gc.wave[Math.floor(t * 4) % 2] : gc.front, false);
        if (cheer && T0 < 8.2 && !(sc.guideTalk > 0)) heart(c, gx + 11, 112 - gc.h - 4 - Math.round((T0 - 6.4) * 3));
      }
      // a little kitchen magic: milk, flour and eggs float up, tumble into the bowl,
      // swirl, and (poof!) a blueberry cake. The table and its magic are drawn at double size.
      const sm = (x) => x * x * (3 - 2 * x), seg = (a0, a1) => clamp((T0 - a0) / (a1 - a0), 0, 1);
      const items = [
        { cv: sp.milk, from: [cx - 30, 84], hover: [cx - 17, 72], dive: [2.6, 3.2] },
        { cv: sp.flour, from: [cx + 24, 70], hover: [cx + 8, 68], dive: [3.1, 3.7] },
        { cv: sp.egg, from: [cx - 24, 72], hover: [cx - 7, 64], dive: [3.6, 4.1] },
        { cv: sp.egg, from: [cx + 26, 84], hover: [cx + 2, 62], dive: [4.0, 4.5] },
      ];
      sc.zoom2(cx - 34, 60, 70, 54, cx, 114, (c) => {
        // a worktable with a lilac checked cloth
        c.fillStyle = P('#f6e6ff'); c.fillRect(cx - 22, 94, 44, 2); c.fillStyle = P('#c8bcea'); c.fillRect(cx - 22, 96, 44, 1);
        for (let x = cx - 22; x < cx + 22; x += 2) for (let y = 97; y < 101; y += 2) { c.fillStyle = P(((x >> 1) + (y >> 1)) % 2 ? '#c8b8f0' : '#fbf8ff'); c.fillRect(x, y, 2, 2); }
        c.fillStyle = P('#b4a6e6'); c.fillRect(cx - 19, 101, 3, 12); c.fillRect(cx + 16, 101, 3, 12);
        let inBowl = 0;
        const spark = (x, y, a) => { c.fillStyle = `rgba(255,236,150,${a})`; c.fillRect(x, y, 1, 1); if (a > 0.7) { c.fillRect(x - 1, y, 3, 1); c.fillRect(x, y - 1, 1, 3); } };
        if (T0 < 6.4) {
          for (const [k, it] of items.entries()) {
            const d = seg(it.dive[0], it.dive[1]);
            if (d >= 1) { inBowl++; const pf = (T0 - it.dive[1]) / 0.5; if (pf < 1) for (let j = 0; j < 5; j++) { c.fillStyle = k === 1 ? `rgba(250,248,240,${1 - pf})` : `rgba(255,236,150,${1 - pf})`; c.fillRect(cx + Math.round(Math.cos(j * 1.3 + k) * pf * 9), bowlY - 1 - Math.round(Math.abs(Math.sin(j * 1.3 + k)) * pf * 6), 1, 1); } continue; }
            const f = sm(seg(0.2 + k * 0.25, 2.4 + k * 0.1)), bob = Math.round(Math.sin(t * 3 + k) * 1.5 * (1 - d));
            let x = it.from[0] + (it.hover[0] - it.from[0]) * f, y = it.from[1] + (it.hover[1] - it.from[1]) * f + bob;
            if (d > 0) { x += (cx - it.cv.width / 2 - x) * sm(d); y += (bowlY - 2 - y) * sm(d); }
            if (f <= 0) continue;
            c.drawImage(it.cv, Math.round(x), Math.round(y));
            for (let j = 1; j <= 3; j++) spark(Math.round(x + it.cv.width / 2 + Math.sin(t * 5 + j + k) * 3), Math.round(y + it.cv.height + j * 2), 0.8 - j * 0.2);
          }
          if (T0 < 6.3) c.drawImage(sp.bowl, cx - 7, bowlY);
          if (inBowl) { c.fillStyle = P('#fdeedd'); c.fillRect(cx - 5, bowlY + 1, 10, 1); }
          const sw = seg(4.5, 6.2);
          if (sw > 0) for (let j = 0; j < 8; j++) { const a = t * 6 + (j * Math.PI) / 4; spark(Math.round(cx + Math.cos(a) * (12 - sw * 4)), Math.round(bowlY + 2 + Math.sin(a) * 4 - sw * 3), 0.5 + 0.5 * Math.sin(t * 9 + j)); }
        }
        const pf = seg(6.1, 6.7);
        if (pf > 0 && pf < 1) for (let j = 0; j < 14; j++) { const a = (j * Math.PI * 2) / 14; spark(Math.round(cx + Math.cos(a) * pf * 18), Math.round(86 + Math.sin(a) * pf * 12), 1 - pf); }
        if (T0 >= 6.3) {
          c.globalAlpha = Math.min(seg(6.3, 6.7), 1 - seg(9.5, 10));
          c.drawImage(sp.cake, cx - 8, 94 - sp.cake.height);
          for (let j = 0; j < 5; j++) spark(Math.round(cx - 10 + ((j * 7) % 21)), 78 + ((j * 5) % 12), 0.5 + 0.5 * Math.sin(t * 4 + j * 2));
          const hp = (T0 - 6.6) / 3;
          if (hp > 0) heart(c, cx + 9, Math.round(80 - hp * 16));
          c.globalAlpha = 1;
        }
        // the lilac wand that does it all, drifting beside the table
        const wx = Math.round(cx + 22 + Math.sin(t * 1.3) * 3), wy = Math.round(72 + Math.cos(t * 1.7) * 3);
        c.fillStyle = P('#b49af0'); for (let j = 0; j < 7; j++) c.fillRect(wx + j, wy + 7 - j, 1, 1);
        c.fillStyle = '#ffe08a'; c.fillRect(wx + 6, wy, 3, 1); c.fillRect(wx + 7, wy - 1, 1, 3);
        spark(wx + 7, wy, 0.6 + 0.4 * Math.sin(t * 8));
      });
      sc.drawFamiliar(c, Math.floor(t * 1.2) % 2, cx - 50 - sc.petW, 114);
    },
  },
};

export class OutingScene extends Scene {
  constructor(canvas, kind) { super(canvas); this.kind = KINDS[kind] ? kind : 'training'; }

  env() {
    const m = KINDS[this.kind].mood;
    if (m) { // a travel world keeps its own signature light
      const e = StudyScene.prototype.env.call(this), o = m(e);
      return { ...e, ...o, day: 1 - o.dark, pal: { ...e.pal, snowy: false } };
    }
    if (KINDS[this.kind].outdoor) { const e = PlanetScene.prototype.env.call(this); e.day = 1 - e.dark; return e; }
    return StudyScene.prototype.env.call(this);
  }

  frame(dt) {
    const e = this.env();
    this.loadAvatarImage();
    const key = [this.W, Math.round(e.alt * 2), e.season, e.weather, e.realm.id, JSON.stringify(this.input.avatar || {}), guideKey(this.input.guide), this.avImg?.ok, this.petImg?.ok].join('|');
    if (key !== this.key) { this.build(e); this.key = key; }
    this.drawDynamic(e, dt);
    if (this.input.festive) drawFestoon(this.ctx, this.W, e.dark);
  }

  build(e) {
    const W = this.W, R = new Raster(W, H), rnd = rng(31);
    const tc = new Map();
    const T = (h) => { let c = tc.get(h); if (!c) { const b = hx2(h); c = b.map((v, i) => clamp(v * e.amb[i], 0, 255)); tc.set(h, c); } return c; };
    this.T = T;
    const s = (this.spots = { stars: [], windows: [] });
    KINDS[this.kind].build(R, T, e, W, s, rnd);
    const hero = heroCanvases(this.input, this.avImg, T, e.amb, this.dpx);
    this.heroCv = hero.cvs; this.heroHi = hero.hi; this.hw = hero.w; this.hh = hero.h;
    PlanetScene.prototype.buildGuide.call(this, T);
    const pet = this.buildPet(e);
    this.catCv = this.input.avatar?.familiar !== false && !pet ? catCanvases(T, this.input.avatar?.familiarColor || '#2a2230') : null;
    this.bg.width = W; this.bg.height = H;
    this.bg.getContext('2d').putImageData(R.img, 0, 0);
  }

  // the cat (frame f), or your uploaded familiar, standing with its feet on row `bottom`
  drawFamiliar(c, f, x, bottom) {
    if (this.pet) this.drawPet(c, x, bottom);
    else if (this.catCv) c.drawImage(this.catCv[f], x, bottom - 6);
  }
  get petW() { return this.pet ? this.pet.w : 8; }

  drawHero(c, x, y, flip, blink) {
    const cv = this.heroCv[blink || Math.floor(this.t * 10) % 37 === 0 ? 1 : 0];
    this.blitHero(c, cv, x, y, flip);
  }

  // your star guide, in pose `cv` (one of his frames), on the fine overlay; cropH keeps his top rows
  drawGuide(c, x, y, cv, flip = false, cropH = null) {
    const gc = this.guideCv; if (!gc || !cv) return;
    this.blitGuide(cv, x, y, { flip, cropH });
    this.spots.guideBox = { x, y, w: gc.w, h: gc.h };
    if (this.hover?.type === 'guide') { c.fillStyle = 'rgba(255,240,180,0.22)'; c.fillRect(x - 1, y - 1, gc.w + 2, gc.h + 2); }
    if (this.guideTalk > 0) { // a little speech heart over his head
      const by = y - 5 + Math.round(Math.sin(this.t * 5)), hx = x + (gc.w >> 1) - 3;
      c.fillStyle = '#ffffff'; c.fillRect(hx - 1, by, 7, 5); c.fillRect(hx, by + 5, 2, 1);
      heart(c, hx + 1, by + 1);
    }
  }

  // a faded, clipped copy of a sprite (for mirrors)
  ghost(c, cv, x, y, flip, a, box) {
    c.save();
    c.beginPath(); c.rect(box.x0, box.y0, box.x1 - box.x0, box.y1 - box.y0); c.clip();
    c.globalAlpha = a;
    if (flip) { c.translate(x + cv.width, y); c.scale(-1, 1); c.drawImage(cv, 0, 0); } else c.drawImage(cv, x, y);
    c.restore();
  }

  glow(x, y, r, a, col = '255,190,120') {
    const c = this.ctx;
    c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${col},${a * (0.9 + 0.1 * Math.sin(this.t * 9))})`); g.addColorStop(1, `rgba(${col},0)`);
    c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
    c.globalCompositeOperation = 'source-over';
  }

  // Draws one part of the scene at double size: fn paints the box (ox, oy, w, h) in scene
  // coordinates, Scale2x smooths the steps so it still reads as pixel art, and the anchor
  // (ax, ay) — a spot on the floor — stays put. Returns a scene -> screen point mapper.
  zoom2(ox, oy, w, h, ax, ay, fn) {
    const z = (this.z2 ||= {});
    if (z.w !== w || z.h !== h) {
      z.w = w; z.h = h;
      z.src = document.createElement('canvas'); z.src.width = w; z.src.height = h;
      z.dst = document.createElement('canvas'); z.dst.width = w * 2; z.dst.height = h * 2;
      z.g = z.src.getContext('2d', { willReadFrequently: true }); z.out = z.dst.getContext('2d'); z.img = z.out.createImageData(w * 2, h * 2);
    }
    const g = z.g;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.clearRect(0, 0, w, h); g.translate(-ox, -oy);
    fn(g);
    const a = new Uint32Array(g.getImageData(0, 0, w, h).data.buffer), o = new Uint32Array(z.img.data.buffer), w2 = w * 2;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const p = a[y * w + x], A = y ? a[(y - 1) * w + x] : p, D = y < h - 1 ? a[(y + 1) * w + x] : p;
      const C = x ? a[y * w + x - 1] : p, B = x < w - 1 ? a[y * w + x + 1] : p, i = y * 2 * w2 + x * 2;
      o[i] = C === A && C !== D && A !== B ? A : p;
      o[i + 1] = A === B && A !== C && B !== D ? B : p;
      o[i + w2] = D === C && D !== B && C !== A ? C : p;
      o[i + w2 + 1] = B === D && B !== A && D !== C ? D : p;
    }
    // a dark rim around everything drawn, so the big props read clearly against pale walls
    const h2 = h * 2, edge = (z.edge && z.edge.length === o.length) ? z.edge : (z.edge = new Uint8Array(o.length));
    edge.fill(0);
    for (let y = 0; y < h2; y++) for (let x = 0; x < w2; x++) {
      const i = y * w2 + x;
      if (o[i] >>> 24) continue;
      if ((x && o[i - 1] >>> 24) || (x < w2 - 1 && o[i + 1] >>> 24) || (y && o[i - w2] >>> 24) || (y < h2 - 1 && o[i + w2] >>> 24)) edge[i] = 1;
    }
    for (let i = 0; i < o.length; i++) if (edge[i]) o[i] = 0xff6e3a4a;
    z.out.putImageData(z.img, 0, 0);
    const dx = ax - (ax - ox) * 2, dy = ay - (ay - oy) * 2;
    this.ctx.drawImage(z.dst, dx, dy);
    return (x, y) => [dx + (x - ox) * 2, dy + (y - oy) * 2];
  }

  // rain or snow on a window (optionally clipped to its shape)
  windowWeather(c, e, t, w) {
    if (!(e.wet || e.pal.snowy || e.weather === 'snow')) return;
    if (!w.flakes) w.flakes = Array.from({ length: Math.max(12, Math.round((w.x1 - w.x0) / 4)) }, () => ({ x: Math.random(), y: Math.random(), v: 0.5 + Math.random() }));
    c.fillStyle = e.wet ? 'rgba(210,215,245,0.6)' : 'rgba(250,252,255,0.9)';
    for (const f of w.flakes) {
      f.y += (e.wet ? 1.4 : 0.12) * f.v * (1 / 12); if (f.y > 1) { f.y = 0; f.x = Math.random(); }
      const x = Math.round(w.x0 + f.x * (w.x1 - w.x0 - 1)), y = Math.round(w.y0 + f.y * (w.y1 - w.y0 - 2));
      if (w.clip && !w.clip(x, y)) continue;
      c.fillRect(x, y, 1, e.wet ? 2 : 1);
    }
  }

  drawDynamic(e, dt) {
    const c = this.ctx, t = this.t, s = this.spots, T = this.T;
    const P = (h) => css(T(h));
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    c.drawImage(this.bg, 0, 0);
    if (this.guideTalk > 0) this.guideTalk -= dt;
    s.guideBox = null;
    const k = KINDS[this.kind];
    if (k.clouds) this.drawClouds(e, dt);
    k.draw(c, this, e, t, s, P);
    if (k.outdoor && (e.wet || e.weather === 'snow' || e.pal.snowy)) this.drawRain(e, dt);
    // drifting petals outdoors in spring and autumn
    const drift = k.outdoor && !e.pal.snowy ? { spring: ['#f6a8c8', '#fbc8dc', '#ffffff'], autumn: ['#f2a07a', '#f8c49a', '#f2c14a'] }[e.season] : null;
    if (drift) {
      if (!this.leaves) this.leaves = Array.from({ length: 14 }, () => ({ x: Math.random() * this.W, y: Math.random() * H, ph: Math.random() * 6 }));
      for (const p of this.leaves) {
        p.x += (3 + Math.sin(t * 2 + p.ph) * 4) * dt; p.y += 5 * dt;
        if (p.y > H || p.x > this.W) { p.y = -2; p.x = Math.random() * this.W; }
        c.fillStyle = P(drift[Math.floor(p.ph) % drift.length]); c.fillRect(Math.round(p.x), Math.round(p.y), Math.sin(t * 5 + p.ph) > 0 ? 2 : 1, 1);
      }
    }
    this.drawCelebration(dt);
  }

  hitTest(clientX, clientY) {
    const g = this.spots?.guideBox; if (!g) return null;
    const r = this.cv.getBoundingClientRect();
    const x = (clientX - r.left) / this.scale, y = (clientY - r.top) / this.scale;
    return x >= g.x && x < g.x + g.w && y >= g.y && y < g.y + g.h ? { type: 'guide' } : null;
  }

  tapGuide() { this.guideTalk = 3; }
}

// the travel planets' landscapes join the outing kinds
Object.assign(KINDS, WORLD_KINDS);
export { paintSky, twinkle, heart, toCanvas, star, dot, pingPong };
