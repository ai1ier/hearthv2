// The starlit study: shown while a quest is in focus. White walls over blue kickers, a tall window
// onto the real (dreamy) sky with a Roman blind, little shining planets hanging from the ceiling,
// a pastel fireplace under a star chart, a bookshelf of your library's books, and a long desk where
// you and your star guide study side by side.
import { Scene, H, hx2, mix, css, clamp, rng, frame, Raster, heroCanvases } from './scene.js';
import { DREAM_SKY, planetPalette, PlanetScene, guideKey } from './planet.js';
import { solarAltitude, realmClock } from './sky.js';
import { paintStudyXmas, drawTwinkles } from './festive.js';

const SLEEPY_CAT = ['.k.k....', '.kkkkkk.', 'kkkkkkkk', '.kkkkkkk'];
const SPINES = ['#f29ac0', '#8aa0e0', '#7fcfb4', '#f0c060', '#b49af0', '#f6b6c8', '#7aa8e8', '#9a8ad8', '#e890c8', '#6a7fd0'];
const STAR = [[0, -2], [-1, -1], [0, -1], [1, -1], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [-1, 1], [1, 1]];

export class StudyScene extends Scene {
  env() {
    const { realm, date, season, weather } = this.input;
    const alt = solarAltitude(date, realm.lat, realm.lon);
    const wet = weather === 'rain' || weather === 'storm';
    const grey = wet ? 0.55 : weather === 'cloudy' || weather === 'fog' ? 0.3 : 0;
    let [top, bot] = frame(DREAM_SKY, alt);
    const g = [150, 150, 186].map((v) => v * clamp((alt + 14) / 20, 0.35, 1));
    top = mix(top, g, grey * 0.8); bot = mix(bot, g, grey * 0.6);
    const day = clamp((alt + 4) / 16, 0, 1) * (1 - grey * 0.35);
    // indoors: soft lavender lamplight at night, bright and airy by day
    const amb = mix([0.62, 0.55, 0.78], [1, 0.98, 0.98], day);
    const pal = planetPalette(season);
    return { realm, date, season, weather, alt, top, bot, amb, day, wet, grey, pal, dark: 1 - day, clock: realmClock(realm, date) };
  }

  frame(dt) {
    const e = this.env();
    this.loadAvatarImage();
    const key = [this.W, Math.round(e.alt * 2), e.season, e.weather, e.realm.id, JSON.stringify(this.input.avatar || {}), guideKey(this.input.guide), this.avImg?.ok, this.petImg?.ok, (this.input.books || []).join(), this.input.festive].join('|');
    if (key !== this.key) { this.build(e); this.key = key; }
    this.drawDynamic(e, dt);
  }

  build(e) {
    const W = this.W, R = new Raster(W, H), rnd = rng(77);
    const tc = new Map();
    const T = (h) => { let c = tc.get(h); if (!c) { const b = hx2(h); c = b.map((v, i) => clamp(v * e.amb[i], 0, 255)); tc.set(h, c); } return c; };
    const s = (this.spots = {});
    const cx = Math.round(W * (W > 300 ? 0.44 : 0.5));
    s.cx = cx;

    // white walls with a scatter of tiny pale stars, over blue kickers
    for (let y = 0; y < 96; y++) for (let x = 0; x < W; x++) {
      if (y < 66) R.put(x, y, T(rnd() < 0.04 ? '#f1eefb' : '#fdfcff'));
      else if (y === 66 || y === 67) R.put(x, y, T('#6a90d8'));
      else R.put(x, y, T(x % 18 === 0 || x % 18 === 1 ? '#7aa0e4' : y === 70 || y === 92 ? '#a0c0f2' : '#8ab0f0'));
    }
    for (let y = 14; y < 62; y += 14) for (let x = (y / 14) % 2 ? 9 : 2; x < W; x += 14) { R.put(x, y, T('#f4e4b4')); R.put(x - 1, y, T('#f6eedc')); R.put(x + 1, y, T('#f6eedc')); R.put(x, y - 1, T('#f6eedc')); R.put(x, y + 1, T('#f6eedc')); }
    // ceiling trim
    R.rect(0, 0, W, 5, T('#8ab0f0')); R.rect(0, 5, W, 1, T('#6a90d8'));

    // a tall window onto the dreamy sky, with a sea of clouds below
    const wx0 = cx - 24, wx1 = cx + 24, wy0 = 12, wy1 = 62, blind = wy0 + 13;
    const inArch = (x, y) => x >= wx0 && x <= wx1 && y >= wy0 && y <= wy1;
    const N = 10, steps = Array.from({ length: N }, (_, i) => mix(e.top, e.bot, i / (N - 1)));
    for (let y = wy0; y <= wy1; y++) for (let x = wx0; x <= wx1; x++) {
      const v = clamp((y - wy0) / (wy1 - wy0), 0, 1) * (N - 1), lo = Math.floor(v);
      R.put(x, y, steps[Math.min(N - 1, (v - lo) * 16 > ((x * 7 + y * 3) & 15) ? lo + 1 : lo)]);
    }
    // stars (a few even by day) and a little ringed planet
    { const sr = rng(3), a = clamp(0.2 + (1 - e.day) * 0.8, 0, 1) * (1 - e.grey);
      for (let i = 0; i < 26; i++) { const x = wx0 + Math.floor(sr() * 48), y = blind + Math.floor(sr() * 30); if (inArch(x, y)) R.put(x, y, [255, 250, 230], a * (0.4 + sr() * 0.6)); }
      const px = cx - 13, py = blind + 8;
      R.disk(px, py, 3, (x, y, nx, ny) => R.put(x, y, nx + ny > 0.4 ? [217, 138, 168] : [246, 182, 200], 0.9));
      for (let i = -6; i <= 6; i++) if (Math.abs(i) > 2) R.put(px + i, py + 1, [255, 226, 168], 0.85); }
    if (e.alt > -5) {
      const f = clamp((e.clock.hour - 6) / 12, 0, 1);
      const sx = Math.round(wx0 + 8 + f * 32), sy = Math.round(clamp(46 - e.alt * 1.1, blind + 8, 50));
      R.disk(sx, sy, 8, (x, y) => inArch(x, y) && y > blind && R.put(x, y, [255, 236, 214], 0.2 * (1 - e.grey)));
      R.disk(sx, sy, 4, (x, y) => inArch(x, y) && y > blind && R.put(x, y, e.alt < 8 ? [255, 214, 170] : [255, 250, 232], 1 - e.grey * 0.7));
    } else {
      const mx = cx + 12, my = blind + 9;
      R.disk(mx, my, 4, (x, y, nx) => inArch(x, y) && R.put(x, y, nx > 0.3 ? mix(e.top, [80, 70, 130], 0.4) : [255, 246, 220], 1 - e.grey * 0.6));
    }
    // the cloud sea along the bottom of the window
    const cl = ['#fde6f2', '#e6dcfa', '#c8bcf0'].map((h) => mix(hx2(h), e.bot, 0.3).map((v) => v * clamp(e.day + 0.45, 0.55, 1)));
    for (let x = wx0 - 4, k = 0; x <= wx1 + 4; k++) {
      const r = 3 + ((k * 7) % 4), y0 = 52 + ((k * 5) % 3);
      R.disk(x, y0, r, (px, py, nx, ny) => inArch(px, py) && R.put(px, py, ny < -0.5 ? mix(cl[0], [255, 255, 255], 0.5) : ny > 0.2 ? cl[1] : cl[0]));
      for (let y = y0; y <= wy1; y++) for (let i = -r; i <= r; i++) if (inArch(x + i, y)) R.put(x + i, y, y > y0 + 3 ? cl[2] : cl[1]);
      x += r + 2;
    }
    s.window = { x0: wx0, x1: wx1, y0: blind + 1, y1: wy1, inArch: (x, y) => inArch(x, y) && y > blind };
    // frame & mullions
    const frameC = T('#6a90d8');
    R.rect(wx0 - 2, wy0 - 2, wx1 - wx0 + 5, 2, frameC); R.rect(wx0 - 2, wy1 + 1, wx1 - wx0 + 5, 1, frameC);
    R.rect(wx0 - 2, wy0, 2, wy1 - wy0 + 1, frameC); R.rect(wx1 + 1, wy0, 2, wy1 - wy0 + 1, frameC);
    R.rect(cx, wy0, 1, wy1 - wy0 + 1, frameC); R.rect(wx0, wy0 + 32, wx1 - wx0 + 1, 1, frameC);
    // a soft blue Roman blind, half drawn, with a star on its pull cord
    R.rect(wx0 - 3, wy0 - 4, wx1 - wx0 + 7, 3, T('#6a90d8')); R.rect(wx0 - 3, wy0 - 4, wx1 - wx0 + 7, 1, T('#9cbcf0'));
    for (let y = wy0 - 1; y <= blind; y++) for (let x = wx0 - 1; x <= wx1 + 1; x++) {
      const fold = (y - wy0 + 1) % 5, edge = y === blind;
      R.put(x, y, T(edge ? '#8ab0f0' : fold === 4 ? '#a8c4f0' : fold === 3 ? '#c4d8f8' : (x * 3 + y * 5) % 23 === 0 ? '#ffffff' : '#dbe7fb'));
    }
    for (let y = blind + 1; y < blind + 12; y++) R.put(wx1 - 4, y, T('#b4a6e6'));
    for (const [dx, dy] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) R.put(wx1 - 4 + dx, blind + 13 + dy, T('#ffd86a'));
    // sill with a potted star flower
    R.rect(wx0 - 5, wy1 + 2, 59, 3, T('#e6eefc')); R.rect(wx0 - 5, wy1 + 2, 59, 1, T('#ffffff')); R.rect(wx0 - 5, wy1 + 4, 59, 1, T('#a0c0f2'));
    R.rect(wx1 - 8, wy1 - 3, 6, 5, T('#f29ac0')); R.rect(wx1 - 8, wy1 - 3, 6, 1, T('#f8bcd4'));
    for (const [dx, dy] of [[1, -5], [0, -4], [2, -4], [1, -3], [4, -6], [5, -5], [3, -2]]) R.put(wx1 - 7 + dx, wy1 + dy, T(dy < -4 || (dx === 1 && dy === -4) ? '#ffd86a' : '#6cc08a'));
    if (e.pal.snowy) R.rect(wx0, wy1 - 1, 49, 2, [240, 246, 252]);
    // little planets hanging from the ceiling on threads (drawn live so they sway and shine)
    s.planets = [];
    const pcols = [['#f6b6c8', '#d98aa8', true], ['#8ab0f0', '#5a80c8', false], ['#ffe08a', '#e0b04a', false], ['#c8b4f4', '#9a86d8', true], ['#9fdcc8', '#6cb8a0', false]];
    const spots = [wx0 - 16, wx0 - 30, wx1 + 16, wx1 + 31, wx0 - 46, wx1 + 46];
    if (W > 300) spots.push(Math.round(W * 0.06), Math.round(W * 0.94));
    spots.forEach((x, i) => { if (x > 4 && x < W - 4) { const [c0, c1, ring] = pcols[i % pcols.length]; s.planets.push({ x, len: 10 + ((i * 7) % 4) * 4, r: 2 + (i % 2), c0: T(c0), c1: T(c1), ring, ph: i * 1.7 }); } });
    s.lights = []; for (let x = 4; x < W; x += 5) s.lights.push({ x, y: 7 + Math.round(Math.sin(x * 0.18) * 2) + 3, p: x * 0.8 });

    // pastel fireplace (left) under a star chart, bookshelf (right)
    if (W >= 205) {
      const fx = Math.max(4, Math.round(cx - 26 - 62));
      R.rect(fx, 46, 44, 50, T('#c8bcea'));
      for (let y = 46; y < 96; y += 4) for (let x = fx + ((y / 4) % 2) * 4; x < fx + 44; x += 8) R.rect(x, y, 1, 4, T('#a89ad8'));
      for (let y = 46; y < 96; y += 4) R.rect(fx, y, 44, 1, T('#a89ad8'));
      R.rect(fx - 3, 44, 50, 3, T('#8a7ac8')); R.rect(fx - 3, 44, 50, 1, T('#b4a6e6'));
      R.rect(fx + 8, 64, 28, 32, T('#2a2450'));
      R.rect(fx + 10, 90, 24, 3, T('#6a4a3a')); R.rect(fx + 12, 88, 20, 2, T('#7e5a44'));
      // on the mantel: a candle and a little globe
      R.rect(fx + 4, 38, 3, 6, T('#f6f0ff')); R.disk(fx + 36, 40, 3, (x, y, nx, ny) => R.put(x, y, T(nx + ny > 0.4 ? '#5a7ad0' : (x + y) % 3 ? '#7aa8e8' : '#9fdcc8'))); R.rect(fx + 35, 43, 3, 1, T('#d8b050'));
      // a star chart: a constellation on navy, in a gold frame
      const px0 = fx + 9, py0 = 12;
      R.rect(px0 - 1, py0 - 1, 28, 22, T('#d8b050')); R.rect(px0, py0, 26, 20, T('#2e2670'));
      const pts = [[4, 14], [9, 8], [14, 11], [19, 4], [22, 12]];
      for (let i = 1; i < pts.length; i++) R.line(px0 + pts[i - 1][0], py0 + pts[i - 1][1], px0 + pts[i][0], py0 + pts[i][1], T('#6a5ab0'));
      for (const [x, y] of pts) R.put(px0 + x, py0 + y, T('#ffe08a'));
      for (const [x, y] of [[2, 3], [12, 2], [24, 17], [7, 17]]) R.put(px0 + x, py0 + y, T('#c8c0f0'));
      s.fire = { x: fx + 22, y: 88 };
    }
    let shelfX = null;
    if (W >= 200) {
      const bx = (shelfX = Math.min(W - 54, cx + 26 + 22));
      R.rect(bx, 16, 48, 80, T('#8a7ac8')); R.rect(bx + 2, 18, 44, 76, T('#4a3f8a'));
      const books = this.input.books || [];
      for (let row = 0; row < 4; row++) {
        const sy = 18 + row * 19;
        R.rect(bx + 2, sy + 17, 44, 2, T('#a596dc'));
        let x = bx + 3, k = 0;
        while (x < bx + 44) {
          const w = 2 + Math.floor(rnd() * 3), h = 10 + Math.floor(rnd() * 6);
          if (rnd() < 0.12 && x < bx + 38) { // a little star jar
            R.rect(x, sy + 12, 4, 5, T('#cfe6ff')); R.rect(x, sy + 11, 4, 1, T('#b4a6e6')); R.put(x + 1, sy + 14, T('#ffe08a')); R.put(x + 2, sy + 13, T('#ffe08a'));
            x += 5; continue;
          }
          const c = books.length && rnd() < 0.5 ? SPINES[Math.abs(hashStr(books[(k++) % books.length])) % SPINES.length] : SPINES[Math.floor(rnd() * SPINES.length)];
          R.rect(x, sy + 17 - h, w, h, T(c)); R.put(x, sy + 17 - h + 2, T('#fff4c8'));
          x += w + (rnd() < 0.2 ? 1 : 0);
        }
      }
      for (const [dx, dy] of [[6, -3], [8, -5], [10, -3], [7, -2], [9, -4]]) R.put(bx + dx, 16 + dy, T('#6cc08a'));
      R.rect(bx + 5, 14, 6, 2, T('#f29ac0'));
    }

    // warm brown floorboards
    for (let y = 96; y < H; y++) for (let x = 0; x < W; x++) {
      const row = Math.floor((y - 96) / 6), seam = (y - 96) % 6 === 0 || (x + row * 13) % 29 === 0;
      R.put(x, y, T(seam ? '#7a5236' : (x * 3 + row * 11) % 41 === 0 ? '#94683f' : row % 2 ? '#a87a50' : '#b0825a'));
    }
    // a cream rug with a blue border, a crescent moon and little stars, and tasselled ends
    const rx0 = cx - 46, rx1 = cx + 46, ry0 = 103, ry1 = 116;
    for (let y = ry0; y <= ry1; y++) for (let x = rx0; x <= rx1; x++) {
      const b = Math.min(x - rx0, rx1 - x, y - ry0, ry1 - y);
      R.put(x, y, T(b === 0 ? '#6a90d8' : b === 1 ? '#8ab0f0' : b === 3 ? '#ffd86a' : '#f8f0de'));
    }
    for (let y = ry0 + 1; y < ry1; y += 2) { R.put(rx0 - 1, y, T('#f8f0de')); R.put(rx0 - 2, y, T('#e6dcc4')); R.put(rx1 + 1, y, T('#f8f0de')); R.put(rx1 + 2, y, T('#e6dcc4')); }
    R.disk(cx, 109, 4, (x, y, nx) => R.put(x, y, T(nx > 0.25 ? '#f8f0de' : '#ffd86a')));
    for (const [dx, dy] of [[-30, 108], [24, 111], [-14, 111], [34, 107]]) for (const [sx, sy] of STAR) if (Math.abs(sx) < 2 && Math.abs(sy) < 2) R.put(cx + dx + sx, dy + sy, T('#8ab0f0'));

    s.twinkle = null;
    if (this.input.festive) paintStudyXmas(R, T, { W, cx, fx: s.fire ? s.fire.x - 22 : null, bx: Math.min(W - 54, cx + 26 + 22), hasShelf: W >= 200 }, s);

    // desk
    const dx0 = cx - 50, dx1 = cx + 60;
    R.rect(dx0 + 3, 81, 3, 18, T('#7a6ab8')); R.rect(dx1 - 6, 81, 3, 18, T('#7a6ab8'));
    R.rect(dx0 + 6, 84, dx1 - dx0 - 12, 8, T('#9a8ad0'));
    for (const x of [dx0 + 12, cx - 7, dx1 - 26]) { R.rect(x, 86, 14, 4, T('#c8bcf0')); R.put(x + 7, 88, T('#ffd86a')); }

    // avatar (seated behind the desk; only the upper body shows)
    const hero = heroCanvases(this.input, this.avImg, T, e.amb, this.dpx);
    const showH = Math.round(hero.h * 0.72);
    s.hero = { x: cx - 22 - Math.round(hero.w / 2), y: 75 - showH, w: hero.w, h: showH };
    this.heroCv = hero.cvs; this.heroHi = hero.hi;
    s.desk = { x0: dx0, x1: dx1, y: 78 };
    s.candle = { x: dx0 + 5, y: 70 };
    s.tea = { x: dx1 - 13, y: 74 };
    s.glass = { x: dx1 - 6, y: 66 };

    // your star guide, studying at the other end of the desk (only his upper half shows)
    PlanetScene.prototype.buildGuide.call(this, T);
    s.guide = this.guideCv ? { x: cx + 30 - (this.guideCv.w >> 1), y: 57 - this.guideCv.seat, w: this.guideCv.w, h: 18 + this.guideCv.seat } : null;

    // sleepy cat on the rug (or your own familiar, sitting there)
    const pet = this.buildPet(e);
    if (pet) { this.catCv = null; s.cat = { x: cx - 30 - pet.w, y: 109 - pet.h, w: pet.w, h: pet.h, pet: true }; }
    else if (this.input.avatar?.familiar !== false) {
      const fur = this.input.avatar?.familiarColor || '#2a2230';
      const cv = document.createElement('canvas'); cv.width = 8; cv.height = 4;
      const g = cv.getContext('2d');
      SLEEPY_CAT.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === 'k') { g.fillStyle = css(T(fur)); g.fillRect(i, j, 1, 1); } }));
      this.catCv = cv;
      s.cat = { x: cx - 34, y: 105, w: 8, h: 4 };
    } else { this.catCv = null; s.cat = null; }

    // the desk top, pre-rendered so it can sit in front of the avatar
    const dk = new Raster(dx1 - dx0 + 1, 8);
    for (let y = 0; y < 4; y++) for (let x = 0; x <= dx1 - dx0; x++) dk.put(x, y, T(y === 0 ? '#f0eaff' : y === 3 ? '#8a7ac8' : '#cfc4ef'));
    this.deskCv = document.createElement('canvas'); this.deskCv.width = dx1 - dx0 + 1; this.deskCv.height = 8;
    this.deskCv.getContext('2d').putImageData(dk.img, 0, 0);
    this.T = T;

    const ctx = this.bg.getContext('2d');
    this.bg.width = W; this.bg.height = H;
    ctx.putImageData(R.img, 0, 0);
  }

  drawDynamic(e, dt) {
    const c = this.ctx, s = this.spots, t = this.t, T = this.T;
    const P = (h) => css(T(h));
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    c.drawImage(this.bg, 0, 0);
    const prog = clamp(this.input.progress || 0, 0, 1);

    // weather (or drifting petals) outside the glass
    const win = s.window;
    if (e.wet || e.pal.snowy || e.weather === 'snow' || e.season === 'autumn' || e.season === 'spring') {
      if (!this.flakes) this.flakes = Array.from({ length: 40 }, () => ({ x: Math.random(), y: Math.random(), v: 0.5 + Math.random() }));
      for (const f of this.flakes) {
        const rain = e.wet;
        f.y += (rain ? 1.4 : 0.12) * f.v * dt; f.x += (rain ? -0.05 : Math.sin(t + f.v * 5) * 0.02) * dt;
        if (f.y > 1) { f.y = 0; f.x = Math.random(); }
        const x = Math.round(win.x0 + f.x * (win.x1 - win.x0)), y = Math.round(win.y0 + f.y * (win.y1 - win.y0));
        if (!win.inArch(x, y)) continue;
        if (!rain && (e.season === 'spring' || e.season === 'autumn') && !e.pal.snowy && f.v > 1.1) continue;
        c.fillStyle = rain ? 'rgba(210,215,245,0.55)' : e.season === 'autumn' ? '#f2a07a' : e.season === 'spring' && !e.pal.snowy ? '#f6b8cf' : 'rgba(250,252,255,0.9)';
        c.fillRect(x, y, 1, rain ? 3 : 1);
      }
    }
    // a soft beam of light with star-dust motes
    if (e.day > 0.45 && !e.grey) {
      c.fillStyle = `rgba(255,244,230,${0.08 * e.day})`;
      c.beginPath(); c.moveTo(win.x0, win.y1); c.lineTo(win.x1, win.y1); c.lineTo(win.x1 + 30, 118); c.lineTo(win.x0 + 10, 118); c.fill();
    }
    for (let i = 0; i < 10; i++) { const x = win.x0 + 6 + ((i * 13 + t * 3) % 60), y = win.y1 + 8 + ((i * 7 + t * 2) % 40); c.fillStyle = `rgba(255,240,200,${0.35 + 0.35 * Math.sin(t * 2 + i)})`; c.fillRect(Math.round(x), Math.round(y), 1, 1); }

    // fairy lights under the trim
    const cols = ['255,214,122', '255,170,210', '255,242,176', '190,200,255'];
    s.lights.forEach((l, k) => { const a = 0.55 + 0.45 * Math.sin(t * 2 + l.p); c.fillStyle = `rgba(${cols[k % 4]},${a})`; c.fillRect(l.x, l.y, 1, 1); });
    drawTwinkles(c, s.twinkle, t, Math.max(e.dark, 0.5));

    // little planets dangling from the ceiling, swaying and catching the light
    // (brush past one with the cursor and it swings, then settles back like a pendulum)
    const ptr = this.ptr && performance.now() - this.ptr.t < 160 ? this.ptr : null;
    for (const pl of s.planets) {
      pl.off ??= 0; pl.v ??= 0;
      if (ptr) {
        const dx = ptr.x - (pl.x + pl.off), dy = ptr.y - (6 + pl.len);
        if (dx * dx + dy * dy < (pl.r + 6) ** 2 || (Math.abs(dx) < 2 && ptr.y > 6 && ptr.y < 6 + pl.len)) pl.v += clamp(ptr.vx, -90, 90) * 0.35;
      }
      pl.v += (-16 * pl.off - 1.4 * pl.v) * Math.min(dt, 0.1); pl.off = clamp(pl.off + pl.v * Math.min(dt, 0.1), -9, 9);
      const sw = Math.sin(t * 0.9 + pl.ph) * 1.6 + pl.off, px = Math.round(pl.x + sw), py = 6 + pl.len - Math.round(Math.abs(pl.off) * 0.2);
      c.fillStyle = 'rgba(176,168,214,0.9)';
      for (let j = 0; j < pl.len - pl.r; j++) c.fillRect(Math.round(pl.x + (sw * j) / pl.len), 6 + j, 1, 1);
      for (let dy = -pl.r; dy <= pl.r; dy++) { const w = Math.floor(Math.sqrt(pl.r * pl.r - dy * dy + pl.r * 0.5)); c.fillStyle = css(dy > 0 ? pl.c1 : pl.c0); c.fillRect(px - w, py + dy, 2 * w + 1, 1); }
      if (pl.ring) { c.fillStyle = '#ffe2a8'; c.fillRect(px - pl.r - 2, py, 2, 1); c.fillRect(px + pl.r + 1, py, 2, 1); }
      const sh = 0.5 + 0.5 * Math.sin(t * 2.2 + pl.ph * 3);
      c.fillStyle = `rgba(255,255,255,${0.5 + 0.5 * sh})`; c.fillRect(px - 1, py - pl.r + 1, 1, 1);
      if (sh > 0.85) { c.fillStyle = `rgba(255,250,220,${(sh - 0.85) * 5})`; c.fillRect(px + pl.r, py - pl.r - 1, 1, 1); c.fillRect(px + pl.r - 1, py - pl.r, 3, 1); c.fillRect(px + pl.r, py - pl.r - 2, 1, 3); }
      this.glowAt(px, py, pl.r + 5, (0.08 + 0.18 * e.dark) * (0.7 + 0.3 * sh), '220,210,255');
    }

    // the fire
    if (s.fire) {
      const f = s.fire;
      for (let i = 0; i < 9; i++) {
        const h = 4 + Math.round(4 * Math.abs(Math.sin(t * 6 + i * 1.7)) + (i % 3)), x = f.x - 9 + i * 2;
        c.fillStyle = '#f0607a'; c.fillRect(x, f.y - h, 2, h);
        c.fillStyle = '#ffa86a'; c.fillRect(x, f.y - h + 2, 2, Math.max(1, h - 3));
        c.fillStyle = '#ffe9a0'; c.fillRect(x + (i & 1), f.y - Math.max(1, h - 4), 1, Math.max(1, h - 5));
      }
      this.glowAt(f.x, f.y - 6, 40, 0.2 + 0.05 * Math.sin(t * 8), '255,160,120');
    }

    // your guide, studying at his end of the desk: reading, dipping his head to make notes,
    // looking up now and then with a little star; on a break (or when tapped) he waves
    if (s.guide && this.guideCv) {
      const g = s.guide, gc = this.guideCv, brk = this.input.phase === 'break';
      if (this.guideTalk > 0) this.guideTalk -= dt;
      const wave = brk || this.guideTalk > 0;
      const cv = wave ? gc.wave[Math.floor(t * 3) % 2] : gc.front;
      const nod = !wave && (t % 7) > 3.5 ? 1 : 0;
      this.blitGuide(cv, g.x, g.y + nod, { cropH: g.h - nod });
      if (!wave && (t % 9) < 1.4) {
        const y = g.y - 4 + Math.round(Math.sin(t * 5)), sx = g.x + (gc.w >> 1);
        c.fillStyle = '#ffe08a'; c.fillRect(sx, y - 1, 1, 3); c.fillRect(sx - 1, y, 3, 1);
      }
      if (this.guideTalk > 0) {
        const y = g.y - 6 + Math.round(Math.sin(t * 5)), hx = g.x + (gc.w >> 1) - 3;
        c.fillStyle = '#ffffff'; c.fillRect(hx - 1, y, 7, 5); c.fillRect(hx, y + 5, 2, 1);
        c.fillStyle = '#f07a9a'; c.fillRect(hx + 1, y + 1, 1, 1); c.fillRect(hx + 3, y + 1, 1, 1); c.fillRect(hx + 1, y + 2, 3, 1); c.fillRect(hx + 2, y + 3, 1, 1);
      }
      if (this.hover?.type === 'guide') { c.fillStyle = 'rgba(255,240,180,0.22)'; c.fillRect(g.x - 1, g.y - 1, g.w + 2, g.h + 2); }
    }

    // avatar at the desk, gently bobbing as you write
    const h = s.hero, bob = this.input.phase === 'focus' ? Math.floor(t * 2) % 2 : 0;
    const hcv = this.heroCv[Math.floor(t * 10) % 41 === 0 || this.input.phase === 'break' ? 1 : 0];
    this.blitHero(c, hcv, h.x, h.y + bob, false, h.h);

    // the desk and things on it
    const d = s.desk;
    c.drawImage(this.deskCv, d.x0, d.y);
    c.fillStyle = P('#efe8fb'); c.fillRect(d.x0 + 21, d.y - 2, 9, 2); c.fillRect(d.x0 + 31, d.y - 2, 9, 2);
    c.fillStyle = P('#fffcf4'); c.fillRect(d.x0 + 21, d.y - 3, 9, 1); c.fillRect(d.x0 + 31, d.y - 3, 9, 1);
    c.fillStyle = P('#8a7ac8'); c.fillRect(d.x0 + 30, d.y - 3, 1, 3);
    // a pen with a little star on top
    const qx = d.x0 + 36 + (this.input.phase === 'focus' ? Math.round(Math.sin(t * 5) * 2) : 0);
    c.fillStyle = P('#7aa8e8'); c.fillRect(qx, d.y - 8, 1, 5); c.fillStyle = '#ffe08a'; c.fillRect(qx - 1, d.y - 9, 3, 1); c.fillRect(qx, d.y - 10, 1, 3);
    c.fillStyle = P('#4a3f8a'); c.fillRect(d.x0 + 43, d.y - 3, 3, 3);
    [['#f29ac0', 0], ['#8aa0e0', 2], ['#7fcfb4', 4]].forEach(([col, i]) => { c.fillStyle = P(col); c.fillRect(d.x0 + 9 + (i % 3), d.y - 2 - i, 10, 2); });
    // his open book and a pencil that moves while he makes notes
    if (s.guide && this.guideCv) {
      // (on the fine layer, so they sit in front of him)
      const bx = s.guide.x + (s.guide.w >> 1) - 8, by = d.y - 3, hr = (col, x, y, w, h) => this.hiRect(P(col), x, y, w, h);
      hr('#8ab0f0', bx - 1, by + 1, 18, 2);
      hr('#fffcf4', bx, by, 8, 2); hr('#fffcf4', bx + 9, by, 8, 2);
      hr('#c8bcf0', bx + 8, by, 1, 3); hr('#c8bcf0', bx + 1, by + 1, 5, 1); hr('#c8bcf0', bx + 10, by + 1, 5, 1);
      const writing = this.input.phase !== 'break' && !(this.guideTalk > 0) && (t % 7) > 3.5;
      const px = bx + 13 + (writing ? Math.round(Math.sin(t * 6) * 2) : 0);
      hr('#ffd86a', px, by - 5, 1, 5); hr('#f29ac0', px, by - 6, 1, 1);
    }
    // candle in a star holder
    const cd = s.candle;
    c.fillStyle = P('#fbf6ff'); c.fillRect(cd.x, cd.y + 2, 3, 6);
    c.fillStyle = P('#e0b850'); c.fillRect(cd.x - 1, cd.y + 7, 5, 1); c.fillRect(cd.x + 1, cd.y + 8, 1, 1);
    const fl = Math.sin(t * 11) > 0 ? 1 : 0;
    c.fillStyle = '#ffd27a'; c.fillRect(cd.x + 1, cd.y - 1 - fl, 1, 3); c.fillStyle = '#fff6c8'; c.fillRect(cd.x + 1, cd.y + 1, 1, 1);
    this.glowAt(cd.x + 1, cd.y, 26, (0.16 + 0.22 * e.dark) * (0.9 + 0.1 * Math.sin(t * 9)));
    // tea with steam
    const tea = s.tea;
    c.fillStyle = P('#fbf6ff'); c.fillRect(tea.x, tea.y, 5, 4); c.fillRect(tea.x + 5, tea.y + 1, 1, 2);
    c.fillStyle = P('#f29ac0'); c.fillRect(tea.x, tea.y + 2, 5, 1);
    c.fillStyle = P('#c08a6a'); c.fillRect(tea.x + 1, tea.y, 3, 1);
    for (let i = 0; i < 3; i++) { const p = (t * 0.8 + i / 3) % 1; c.fillStyle = `rgba(245,240,255,${0.5 * (1 - p)})`; c.fillRect(tea.x + 2 + Math.round(Math.sin(p * 6 + i) * 1.5), tea.y - 2 - Math.round(p * 8), 1, 1); }
    // the hourglass fills with gold stardust as you focus
    const gl = s.glass, gh = 12, half = 5;
    c.fillStyle = P('#8a7ac8'); c.fillRect(gl.x - 1, gl.y, 7, 1); c.fillRect(gl.x - 1, gl.y + gh - 1, 7, 1);
    c.fillStyle = 'rgba(225,235,255,0.4)'; c.fillRect(gl.x, gl.y + 1, 5, gh - 2);
    const topSand = Math.round(half * (1 - prog)), botSand = Math.round(half * prog);
    c.fillStyle = '#ffe08a';
    for (let j = 0; j < topSand; j++) c.fillRect(gl.x + (j < 2 ? 0 : 1), gl.y + 1 + (half - topSand) + j, j < 2 ? 5 : 3, 1);
    for (let j = 0; j < botSand; j++) c.fillRect(gl.x + (j > botSand - 3 ? 0 : 1), gl.y + gh - 2 - j, j > botSand - 3 ? 5 : 3, 1);
    if (prog < 1 && this.input.phase === 'focus' && Math.floor(t * 4) % 2) { c.fillStyle = '#ffffff'; c.fillRect(gl.x + 2, gl.y + half + 1, 1, 1); }

    // sleepy cat and its z's
    if (s.cat?.pet) this.drawPet(c, s.cat.x, 109);
    if (this.catCv && s.cat) {
      const breath = Math.floor(t * 0.8) % 2;
      c.drawImage(this.catCv, s.cat.x, s.cat.y - breath, 8, 4 + breath);
      const zp = (t * 0.35) % 1;
      c.fillStyle = `rgba(240,240,255,${1 - zp})`;
      const zx = s.cat.x + 7 + Math.round(zp * 4), zy = s.cat.y - 3 - Math.round(zp * 10);
      c.fillRect(zx, zy, 3, 1); c.fillRect(zx + 1, zy + 1, 1, 1); c.fillRect(zx, zy + 2, 3, 1);
    }
    if (this.hover?.type === 'cat' && s.cat) { c.strokeStyle = 'rgba(255,226,140,0.8)'; c.strokeRect(s.cat.x - 1.5, s.cat.y - 2.5, 11, 8); }
    this.drawCelebration(dt);
  }

  // a soft additive glow (warm gold by default)
  glowAt(x, y, r, a, col = '255,200,120') {
    const c = this.ctx;
    c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`);
    c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
    c.globalCompositeOperation = 'source-over';
  }

  hitTest(clientX, clientY) {
    const s = this.spots; if (!s) return null;
    const r = this.cv.getBoundingClientRect();
    const x = (clientX - r.left) / this.scale, y = (clientY - r.top) / this.scale;
    const inR = (o, pad = 2) => o && x >= o.x - pad && x < o.x + o.w + pad && y >= o.y - pad && y < o.y + o.h + pad;
    if (inR(s.cat, 3)) return { type: 'cat' };
    if (inR(s.guide, 0)) return { type: 'guide' };
    if (inR(s.hero, 0)) return { type: 'hero' };
    return null;
  }

  tapGuide() { this.guideTalk = 3; }
  petCat() { this.input.onPurr?.(); }
}

function hashStr(str) { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return h; }
