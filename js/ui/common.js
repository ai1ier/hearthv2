import { html, useEffect, useRef, useState } from '../vendor.js';
import { guideOf, guideLabel } from '../fandom/index.js';
import { store } from '../store.js';
import { CATEGORIES } from '../defaults.js';
import { sheetOf } from '../art/planet.js';

export const keeperLabel = (p) => guideLabel(p);

// The guide's portrait (the chosen group member): the original artwork, scaled smoothly.
// The box is about 20·scale px square (80 px at the small sizes); `crop` zooms in on his face.
export function Portrait({ scale = 4, member = null }) {
  const ref = useRef();
  const m = member || guideOf(store.get().profile);
  const pr = m.portrait, size = Math.round(scale >= 4 ? scale * 20 : 80), dpr = Math.min(3, window.devicePixelRatio || 1), px = Math.round(size * dpr);
  useEffect(() => {
    const c = ref.current.getContext('2d'), sh = sheetOf(pr.src);
    const draw = () => {
      c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high'; c.clearRect(0, 0, px, px);
      const im = sh.img, cr = pr.crop || [0, 0, Math.min(im.width, im.height)];
      c.drawImage(im, cr[0], cr[1], cr[2], cr[2], 0, 0, px, px);
    };
    if (sh.ok) draw(); else sh.img.addEventListener('load', draw, { once: true });
  }, [m.id, px]);
  return html`<canvas class="portrait smooth" ref=${ref} width=${px} height=${px} style=${{ '--ps': size + 'px' }} aria-label=${`${m.name}’s portrait`}></canvas>`;
}

// A glass pixel heart (14×11) that fills up like a little potion bottle: navy outline, pale glass with
// a rim the liquid never touches, a white glint, and the red liquid at any level from 0 to 1.
const HEART = [
  '..oooo..oooo..',
  '.oGGGGooGGGGo.',
  'oGWWGGGGGGGGSo',
  'oGWGGGGGGGGGSo',
  'oGGGGGGGGGGGSo',
  'oGGGGGGGGGGGSo',
  '.oGGGGGGGGGSo.',
  '..oGGGGGGGSo..',
  '...oGGGGGSo...',
  '....oGGGSo....',
  '.....oooo.....',
];
const HW = 14, HH = HEART.length;
const HEART_COL = { o: '#2a2d5a', G: '#e2ecfa', S: '#b4c0e0', W: '#ffffff', R: '#ef5a6c', r: '#cc3e52', p: '#ffc2cb' };
const heartCells = (fill) => {
  const at = (x, y) => HEART[y]?.[x] ?? '.', glass = (x, y) => !'o.'.includes(at(x, y));
  // liquid sits one pixel inside the glass on every side
  const inner = (x, y) => glass(x, y) && glass(x - 1, y) && glass(x + 1, y) && glass(x, y - 1) && glass(x, y + 1);
  let top = HH, bot = -1;
  HEART.forEach((row, y) => [...row].forEach((_, x) => { if (inner(x, y)) { top = Math.min(top, y); bot = Math.max(bot, y); } }));
  const level = Math.round(Math.max(0, Math.min(1, fill)) * (bot - top + 1)), surface = bot - level + 1, out = [];
  HEART.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.') return;
    let t = ch;
    if (inner(x, y) && level > 0 && y >= surface && ch !== 'W') {
      const edge = !inner(x + 1, y) || !inner(x, y + 1);
      t = y === surface && level < bot - top + 1 ? 'p' : edge ? 'r' : 'R';
    }
    out.push([x, y, t]);
  }));
  // a glint on the liquid itself once it's nearly full
  if (fill >= 0.75) out.push([4, Math.max(surface, top) + 1, 'W']);
  return out;
};
const HEART_CACHE = new Map();
export function PixelHeart({ full = true, fill = null, px = 1.5 }) {
  const f = fill ?? (full ? 1 : 0), key = Math.round(f * 8);
  if (!HEART_CACHE.has(key)) HEART_CACHE.set(key, heartCells(key / 8));
  return html`<svg class="pheart" width=${Math.round(HW * px)} height=${Math.round(HH * px)} viewBox=${`0 0 ${HW} ${HH}`} shape-rendering="crispEdges" aria-hidden="true">
    ${HEART_CACHE.get(key).map(([x, y, t]) => html`<rect x=${x} y=${y} width="1" height="1" fill=${HEART_COL[t]} />`)}</svg>`;
}
export function Hearts({ value, max = 5, px = 1.5 }) {
  return html`<span class="hearts" role="img" aria-label=${`${value} of ${max} stamina`}>${Array.from({ length: max }, (_, i) => html`<${PixelHeart} fill=${Math.max(0, Math.min(1, value - i))} px=${px} />`)}</span>`;
}

export function Meter({ value, max = 1, color, label }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return html`<div class="meter" title=${label || ''}><div class="meter-fill" style=${{ width: pct + '%', background: color }}></div></div>`;
}

// a fuller day glows warmer: sky blue, then mint, leafy green, and gold when it's brimming
export function loadColor(x) { return x > 0.58 ? '#f2c14a' : x > 0.4 ? '#8fbf4a' : x > 0.22 ? '#6cc3a0' : '#8ec5dc'; }

export function CatTag({ cat }) {
  const c = CATEGORIES[cat] || CATEGORIES.rest;
  return html`<span class="cat" style=${{ '--c': c.color }}>${c.icon} ${c.label}</span>`;
}

export function Difficulty({ intensity = 0, minutes = 30 }) {
  const n = Math.max(1, Math.min(5, Math.round(intensity + minutes / 50)));
  return html`<span class="stars" title="Difficulty">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</span>`;
}

// tiny global toast
const listeners = new Set();
export function toast(msg) { listeners.forEach((f) => f(msg)); }
export function Toasts() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const f = (msg) => {
      const id = Math.random();
      setItems((x) => [...x, { id, msg }]);
      setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 3800);
    };
    listeners.add(f); return () => listeners.delete(f);
  }, []);
  return html`<div class="toasts" role="status">${items.map((i) => html`<div class="toast" key=${i.id}>${i.msg}</div>`)}</div>`;
}

export function Field({ label, children, hint }) {
  return html`<label class="field"><span class="field-label">${label}</span>${children}${hint ? html`<span class="hint">${hint}</span>` : null}</label>`;
}
