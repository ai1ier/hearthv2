// Little pixel icons for the tabs, drawn from rows of palette keys like the scene sprites.
import { html } from '../vendor.js';

const ICONS = {
  candle: {
    pal: { o: '#f2a03a', y: '#ffe08a', k: '#3e2818', w: '#f6eedc', W: '#d8c8a8', b: '#c08a48', B: '#8a5a30' },
    rows: ['......o.....', '.....oyo....', '.....oyo....', '......o.....', '......k.....', '.....wwW....', '.....wwW....', '.....wwW....', '.....wwW....', '...bbbbbbb..', '....BBBBB...', '............'],
  },
  map: {
    pal: { p: '#f4e4c1', q: '#dcc38f', r: '#c0392b', k: '#9a7a50' },
    rows: ['............', '.pppqqqqppp.', '.pppqqqqrpr.', '.pppqqqqprp.', '.pppqqqqrpr.', '.pppqqrqppp.', '.pppqqqqppp.', '.ppprqqqppp.', '.prpqqqqppp.', '.pppqqqqppp.', '.kkkkkkkkkk.', '............'],
  },
  scroll: {
    pal: { R: '#a8784a', r: '#7a4a2a', p: '#f4e4c1', l: '#9a7a50', s: '#c0392b' },
    rows: ['............', '.RRRRRRRRRR.', '.RrrrrrrrrR.', '..pppppppp..', '..pllllllp..', '..pppppppp..', '..plllllpp..', '..ppppppsp..', '..plllllss..', '.RRRRRRRRRR.', '.RrrrrrrrrR.', '............'],
  },
  books: {
    pal: { A: '#c0563a', a: '#f2c14a', B: '#3a6fb0', b: '#f2c14a', C: '#4f8f3a', c: '#f2c14a', k: '#7a4a2a' },
    rows: ['............', '.AA.........', '.AA..BBB....', '.aA..BBB.CC.', '.AA..bbb.CC.', '.AA..BBB.cC.', '.aA..BBB.CC.', '.AA..bbb.CC.', '.AA..BBB.CC.', '.AA..BBB.cC.', 'kkkkkkkkkkkk', '............'],
  },
  gear: {
    pal: { g: '#c8b8a0', G: '#8a7a64' },
    rows: ['............', '.....gg.....', '..gg.gg.gg..', '..gggggggg..', '...gg..gG...', '.gggg..gGGG.', '.gggg..gGGG.', '...gg..gG...', '..ggggGGGG..', '..gg.gG.GG..', '.....GG.....', '............'],
  },
  hat: {
    pal: { h: '#6a4a9a', H: '#4a3070', b: '#e0a83a' },
    rows: ['............', '.......h....', '......hh....', '.....hhH....', '.....hhHH...', '....hhhHH...', '....bbbbb...', '...hhhhhHH..', '.hhhhhhhhHH.', '............', '............', '............'],
  },
  hero: {
    pal: { h: '#7a4a2a', s: '#f2c9a0', e: '#2a1a14', g: '#4f8f3a', b: '#c08a48' },
    rows: ['............', '....hhhh....', '...hhhhhh...', '...hesseh...', '...hssssh...', '....ssss....', '...gggggg...', '..gggggggg..', '..ggbbbbgg..', '..gggggggg..', '..gg....gg..', '............'],
  },
  star: {
    pal: { y: '#e0a83a', Y: '#ffe08a' },
    rows: ['............', '.....yy.....', '.....yy.....', '....yYyy....', '.yyyyYyyyyy.', '..yyyyyyyy..', '...yyyyyy...', '...yyyyyy...', '..yyy..yyy..', '..yy....yy..', '.y........y.', '............'],
  },
  // a curly vine bracket, for all-day events (vineR is its mirror image)
  vineL: {
    pal: { v: '#3f7a35', l: '#68aa48', p: '#f29ac0', y: '#f7d24a' },
    rows: ['...vvv.', '..v..ll', '..v....', '..vl...', '..v....', '..v....', '.v.....', 'v......', '.v.....', '..v....', '..vl...', '..v....', '..v.p..', '..v.py.', '..v..ll', '...vvv.'],
  },
};
ICONS.vineR = { pal: ICONS.vineL.pal, rows: ICONS.vineL.rows.map((r) => [...r].reverse().join('')) };
// the same brackets at Christmas: pine with holly berries
const XMAS_VINE = { v: '#1f5a3c', l: '#3f8a52', p: '#d0303a', y: '#ff8a80' };
ICONS.vineLXmas = { pal: XMAS_VINE, rows: ICONS.vineL.rows };
ICONS.vineRXmas = { pal: XMAS_VINE, rows: ICONS.vineR.rows };
let festive = false;
export const setFestiveIcons = (on) => { festive = on; };

const cache = {};
function uri(name) {
  if (cache[name]) return cache[name];
  const { pal, rows } = ICONS[name];
  let rects = '';
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (pal[ch]) rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${pal[ch]}"/>`; }));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${rows[0].length} ${rows.length}" shape-rendering="crispEdges">${rects}</svg>`;
  return (cache[name] = `data:image/svg+xml,${encodeURIComponent(svg)}`);
}

// size is the height in CSS px; the width follows the icon's own shape
export function PixelIcon({ name, size = 24, cls = '' }) {
  if (festive && ICONS[name + 'Xmas']) name += 'Xmas';
  const { rows } = ICONS[name];
  return html`<img class=${'pix ' + cls} src=${uri(name)} width=${Math.round((size * rows[0].length) / rows.length)} height=${size} alt="" />`;
}
