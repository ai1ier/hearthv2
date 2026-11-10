// Little pixel icons for the tabs, drawn from rows of palette keys like the scene sprites.
import { html } from '../vendor.js';

const ICONS = {
  // Star Chapter icons: the tab names stay, the pictures are dreamier
  candle: {
    pal: { y: '#e0a83a', Y: '#ffe08a', s: '#ffffff', S: '#fff3c0' },
    rows: ['............', '.........s..', '...yy...sSs.', '..yy.....s..', '.yyY........', '.yYY........', '.yYY.......s', '.yYYY.......', '.yyYYY......', '..yyYYYyy...', '...yyyyy....', '............'],
  },
  map: {
    pal: { k: '#5a4ab0', b: '#2e2670', l: '#9a8ad0', Y: '#ffe08a', w: '#ffffff' },
    rows: ['............', '.kkkkkkkkkk.', '.kbbbbbbbbk.', '.kbwbbbbYbk.', '.kbbbYbblbk.', '.kbblbllbbk.', '.kbblbbYbbk.', '.kbYbbbbbbk.', '.kbbbbbwbbk.', '.kbbbbbbbbk.', '.kkkkkkkkkk.', '............'],
  },
  scroll: {
    pal: { P: '#b49af0', p: '#7f72c8', w: '#ffffff', Y: '#ffe08a', y: '#fff6c8' },
    rows: ['............', '..pPPPPPPP..', '..pPPPPPPPw.', '..pPPPYPPPw.', '..pPPYYYPPw.', '..pPYYyYYPw.', '..pPPYYYPPw.', '..pPPYPYPPw.', '..pPPPPPPPw.', '..pPPPPPPPw.', '..pppppppp..', '............'],
  },
  books: {
    pal: { A: '#f29ac0', a: '#ffffff', B: '#8aa0e0', b: '#ffe08a', C: '#b49af0', c: '#ffffff', k: '#7f72c8' },
    rows: ['............', '.AA.........', '.AA..BBB....', '.aA..BBB.CC.', '.AA..bbb.CC.', '.AA..BBB.cC.', '.aA..BBB.CC.', '.AA..bbb.CC.', '.AA..BBB.CC.', '.AA..BBB.cC.', 'kkkkkkkkkkkk', '............'],
  },
  gear: {
    pal: { g: '#e6e0fa', G: '#a89ad8' },
    rows: ['............', '.....gg.....', '..gg.gg.gg..', '..gggggggg..', '...gg..gG...', '.gggg..gGGG.', '.gggg..gGGG.', '...gg..gG...', '..ggggGGGG..', '..gg.gG.GG..', '.....GG.....', '............'],
  },
  hat: {
    pal: { S: '#9a8ad0', s: '#c8bcf0', Y: '#ffd36e', y: '#ffffff', w: '#ffffff' },
    rows: ['...........w', '....w...Y...', '.......YYY..', '......YYyYY.', '.......YYY..', '......sY.Y..', '.....S.....w', '....s.......', '...S........', '..s.........', '.S..........', '............'],
  },
  hero: {
    pal: { h: '#6a5a9a', s: '#f6dccb', e: '#2e2440', g: '#7aa8e8', b: '#ffd86a' },
    rows: ['............', '....hhhhb...', '...hhhhhbb..', '...hesseh...', '...hssssh...', '....ssss....', '...gggggg...', '..gggbgggg..', '..gggggggg..', '..gggggggg..', '..gg....gg..', '............'],
  },
  star: {
    pal: { y: '#ffd36e', Y: '#fff3c0' },
    rows: ['............', '.....yy.....', '.....yy.....', '....yYyy....', '.yyyyYyyyyy.', '..yyyyyyyy..', '...yyyyyy...', '...yyyyyy...', '..yyy..yyy..', '..yy....yy..', '.y........y.', '............'],
  },
  // a constellation bracket for all-day events: a gold star, a dotted trail, a pink star (vineR is its mirror image)
  vineL: {
    pal: { v: '#8a7ac8', l: '#ffe08a', y: '#ffd36e', Y: '#fff8d8', p: '#f29ac0', P: '#ffe0ee' },
    rows: ['....y..', '...yYy.', '..v.y..', '..v....', '..l....', '..v....', '.v.....', 'v......', '.v.....', '..v....', '..l....', '..v....', '..v.p..', '...pPp.', '....p..', '.......'],
  },
};
ICONS.vineR = { pal: ICONS.vineL.pal, rows: ICONS.vineL.rows.map((r) => [...r].reverse().join('')) };
// the same brackets at Christmas: pine with holly berries
const XMAS_VINE = { v: '#3e9a80', l: '#6cc9ac', p: '#e6cf8e', P: '#fff0c8', y: '#ffd36e', Y: '#fff8d8' };
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
