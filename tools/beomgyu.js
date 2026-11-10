// Draws Beomgyu's chibi pixel sprite sheet (a dev tool, run in the browser; not loaded by the app).
// Each frame is 48×64: black shaggy hair with bangs over the eyes, blue-grey eyes, a soft blush,
// headphones round the neck. `outfit` picks the clothes. Light comes from the upper left, and a
// dark outline is added round the whole figure at the end.
//   import('/tools/beomgyu.js').then((m) => m.sheet('denim'))  ->  a 192×256 canvas (4×4 poses)
export const OUTFITS = {
  denim: { name: 'Denim & headphones', jacket: '#3e4e72', jacketL: '#5a6c94', jacketD: '#2a3656', inner: '#1e1a26', pants: '#2a2836', pantsD: '#1c1a26', shoes: '#ece6f0', shoesD: '#b8b0c8', cross: true },
  knit: { name: 'Cosy knit', jacket: '#efe2c8', jacketL: '#fff6e4', jacketD: '#cdb998', inner: '#b8a8e8', pants: '#7e9cc8', pantsD: '#5e7aa8', shoes: '#ffffff', shoesD: '#c8c4d4', cross: false, knit: true },
  stage: { name: 'Stage black', jacket: '#24222c', jacketL: '#4a4658', jacketD: '#16141c', inner: '#f4f2fa', pants: '#24222c', pantsD: '#16141c', shoes: '#2e2a36', shoesD: '#16141c', cross: true, zips: true },
};
const SKIN = '#fde8e2', SKIN_D = '#f0c8c4', HAIR = '#1c1824', HAIR_L = '#3e3654', HAIR_S = '#5e5478', EYE = '#4a6a9a', EYE_L = '#8aa8d8', LASH = '#1a1424', BLUSH = '#f6a8b8', MOUTH = '#c8687a', PHONES = '#24202c', PHONES_L = '#5a5468', LINE = '#16121e';
const FW = 48, FH = 64;

function frame(pose, o) {
  const buf = new Map(), put = (x, y, c) => { if (x >= 0 && y >= 0 && x < FW && y < FH) buf.set(y * FW + x, c); };
  const rect = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, c); };
  const { face, p = 0, wave = 0, lift = 0 } = pose; // face: front | side | back; p: walk phase -1..1
  const bob = Math.abs(p) < 0.5 && pose.walk ? -1 : 0, y0 = bob;

  // ---- legs and shoes
  const leg = (x, len, sh, flip) => { rect(x, 52 + y0, 6, len, o.pants); rect(x + (flip ? 0 : 4), 52 + y0, 2, len, o.pantsD); rect(x - (face === 'side' ? 0 : 1), 52 + y0 + len, face === 'side' ? 8 : 7, 3, o.shoes); rect(x - (face === 'side' ? 0 : 1), 52 + y0 + len + 2, face === 'side' ? 8 : 7, 1, o.shoesD); };
  if (face === 'side') { const d = Math.round(p * 4); leg(21 - d, 7, 0, true); leg(22 + d, 7 - (Math.abs(p) > 0.5 ? 0 : 1), 0, false); }
  else { leg(17, 7 - (lift === -1 ? 2 : 0), 0, true); leg(26, 7 - (lift === 1 ? 2 : 0), 0, false); }

  // ---- arms (behind the torso for the side view's far arm)
  const sleeve = (x, y, w, h) => { rect(x, y, w, h, o.jacket); rect(x, y, 1, h, o.jacketL); rect(x + w - 1, y, 1, h, o.jacketD); };
  if (face === 'side') { const d = Math.round(-p * 3); sleeve(23 + Math.round(d / 2), 40 + y0, 5, 9); rect(23 + d, 49 + y0, 4, 3, SKIN); }
  else {
    sleeve(11, 40 + y0 + (lift === 1 ? 1 : 0), 4, 10); rect(11, 50 + y0 + (lift === 1 ? 1 : 0), 4, 3, SKIN);
    if (wave) { for (let k = 0; k < 9; k++) sleeve(33 + Math.round(k * 0.5), 40 - k + y0, 4, 1); }
    else { sleeve(33, 40 + y0 + (lift === -1 ? 1 : 0), 4, 10); rect(33, 50 + y0 + (lift === -1 ? 1 : 0), 4, 3, SKIN); }
  }

  // ---- torso
  const tw = face === 'side' ? [18, 31] : [15, 33];
  for (let y = 39; y < 53; y++) for (let x = tw[0] - (y > 47 ? 1 : 0); x <= tw[1] + (y > 47 ? 1 : 0); x++) {
    const u = (x - tw[0]) / (tw[1] - tw[0]);
    put(x, y + y0, u < 0.15 ? o.jacketL : u > 0.85 ? o.jacketD : o.jacket);
  }
  if (o.knit) for (let y = 41; y < 53; y += 2) for (let x = tw[0] + 1; x < tw[1]; x += 3) put(x, y + y0, o.jacketD);
  if (face === 'front') {
    rect(21, 40 + y0, 7, 13, o.inner); // the open front
    for (let y = 40; y < 45; y++) { put(20 - (y - 40 >> 1), y + y0, o.jacketL); put(28 + (y - 40 >> 1), y + y0, o.jacketD); } // collar
    if (o.cross) { rect(24, 43 + y0, 1, 5, '#d8dce8'); rect(23, 44 + y0, 3, 1, '#d8dce8'); put(24, 42 + y0, '#a8acbc'); }
    if (o.zips) { put(19, 46 + y0, '#c8c8d8'); put(29, 46 + y0, '#c8c8d8'); }
    rect(15, 52 + y0, 19, 1, o.jacketD);
  } else if (face === 'side') { rect(28, 40 + y0, 3, 12, o.inner); put(27, 40 + y0, o.jacketL); }

  // ---- neck and headphones
  rect(21, 36 + y0, 7, 4, SKIN_D);
  if (face !== 'back') { for (let x = 15; x <= 33; x++) { const yy = 39 + Math.round(((x - 24) / 9) ** 2 * -2); put(x, yy + y0, PHONES); } }
  const cup = (x) => { rect(x, 36 + y0, 4, 6, PHONES); rect(x + 1, 37 + y0, 1, 3, PHONES_L); };
  if (face === 'side') cup(21); else { cup(13); cup(32); }

  // ---- head: the face, then hair over it
  const hx = face === 'side' ? 25 : 24, hy = 24 + y0;
  const inHead = (x, y) => ((x - hx) / 14.5) ** 2 + ((y - hy) / 13) ** 2 <= 1;
  for (let y = hy - 13; y <= hy + 13; y++) for (let x = hx - 15; x <= hx + 15; x++) if (inHead(x, y)) put(x, y, (x - hx) > 9 || (y - hy) > 10 ? SKIN_D : SKIN);
  // bangs: shaggy points falling to the eyes, one strand between them
  const BANG = [3, 1, 4, 2, 0, 3, 5, 2, 1, 4, 2, 0, 3, 5, 1, 3, 2, 4, 1, 0, 3, 2, 4, 1, 3, 0, 2, 4, 1, 3, 2];
  const bangY = (x) => hy + (face === 'side' ? -2 : -1) + (BANG[(x - hx + 15 + 31) % BANG.length] || 0) - (face === 'side' && x > hx + 8 ? 2 : 0);
  const inHair = (x, y) => {
    const top = ((x - hx) / 16.5) ** 2 + ((y - (hy - 3)) / 14) ** 2 <= 1;
    if (!top) {
      // locks hanging past the cheeks and nape, ending in points
      const side = face === 'back' ? Math.abs(x - hx) <= 16 && y <= hy + 12 - (x * 7 % 3)
        : face === 'side' ? x <= hx + 2 && x >= hx - 16 && y <= hy + 11 - ((x * 5) % 4)
        : (x <= hx - 11 || x >= hx + 11) && Math.abs(x - hx) <= 16 && y <= hy + 9 - ((x * 3) % 4);
      return side && y > hy - 4;
    }
    if (face === 'back') return true;
    if (face === 'side') return x < hx + 1 || y < bangY(x);
    return y < bangY(x) || Math.abs(x - hx) >= 11;
  };
  for (let y = hy - 18; y <= hy + 14; y++) for (let x = hx - 18; x <= hx + 18; x++) if (inHair(x, y)) {
    const shine = ((x - hx + 6) ** 2 / 30 + (y - hy + 11) ** 2 / 6) < 1 && face !== 'back';
    // soft strands falling from the crown, and a ring of shine
    const strand = ((x - hx) * 2 + Math.round((y - hy) * 0.5) + 40) % 9 === 0 && y > hy - 13;
    put(x, y, shine ? HAIR_S : strand ? HAIR_L : HAIR);
  }
  // a cowlick tuft
  put(hx + 2, hy - 18, HAIR); put(hx + 3, hy - 19, HAIR); put(hx + 1, hy - 17, HAIR);

  // ---- the face
  if (face !== 'back') {
    const eye = (x, w) => {
      for (let i = 0; i < w; i++) { put(x + i, hy + 1, LASH); put(x + i, hy + 2, i === 0 || i === w - 1 ? LASH : EYE); put(x + i, hy + 3, EYE); put(x + i, hy + 4, i === 0 ? EYE : EYE_L); }
      put(x + w, hy + 1, LASH); put(x - 1, hy + 1, LASH); put(x + 1, hy + 2, '#ffffff'); put(x + 2, hy + 3, '#e8f0ff');
      // a bang strand over the corner of the eye, as in his portrait
      if (!inHair(x + w - 1, hy + 1)) put(x + w - 1, hy, HAIR);
    };
    if (face === 'front') { eye(hx - 8, 5); eye(hx + 4, 5); rect(hx - 10, hy + 6, 3, 1, BLUSH); rect(hx + 9, hy + 6, 3, 1, BLUSH); put(hx - 1, hy + 8, MOUTH); put(hx, hy + 9, MOUTH); put(hx + 1, hy + 8, MOUTH); put(hx, hy + 4, SKIN_D); }
    else { eye(hx + 6, 4); rect(hx + 9, hy + 6, 3, 1, BLUSH); put(hx + 12, hy + 8, MOUTH); put(hx + 11, hy + 9, MOUTH); put(hx + 14, hy + 4, SKIN_D); }
  }

  // the waving hand, raised beside the head (drawn over the hair)
  if (wave) { const wx = 38 + wave, wy = 27 + y0; rect(wx, wy, 4, 4, SKIN); put(wx, wy - 1, SKIN); put(wx + 2, wy - 1, SKIN); put(wx + 3, wy - 2, SKIN); rect(wx, wy + 4, 4, 1, SKIN_D); }

  // ---- outline round the figure
  const out = new Map(buf);
  for (const k of buf.keys()) {
    const x = k % FW, y = (k - x) / FW;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= FW || ny >= FH) continue; const nk = ny * FW + nx; if (!buf.has(nk)) out.set(nk, LINE); }
  }
  return out;
}

const POSES = {
  back: { face: 'back' }, side: { face: 'side' }, front: { face: 'front' },
  w1: { face: 'side', p: 1, walk: true }, w2: { face: 'side', p: 0, walk: true }, w3: { face: 'side', p: -1, walk: true }, w4: { face: 'side', p: 0.01, walk: true },
  wave1: { face: 'front', wave: -1 }, wave2: { face: 'front', wave: 1 },
  fw1: { face: 'front', lift: 1 }, fw2: { face: 'front', lift: -1 },
  bw1: { face: 'back', lift: 1 }, bw2: { face: 'back', lift: -1 },
};
// the sheet's 4×4 layout (see BG_SPRITE in js/fandom/txt.js)
export const LAYOUT = ['back', 'w1', 'w2', 'wave1', 'side', 'w3', 'front', 'wave2', 'front', 'w4', 'fw1', 'fw2', 'side', 'bw1', 'bw2', 'back'];

export function sheet(outfit = 'denim') {
  const o = OUTFITS[outfit], cv = document.createElement('canvas'); cv.width = FW * 4; cv.height = FH * 4;
  const c = cv.getContext('2d');
  LAYOUT.forEach((name, i) => {
    const px = frame(POSES[name], o), ox = (i % 4) * FW, oy = Math.floor(i / 4) * FH;
    for (const [k, col] of px) { const x = k % FW, y = (k - x) / FW; c.fillStyle = col; c.fillRect(ox + x, oy + y, 1, 1); }
  });
  return cv;
}

// a preview strip of a few poses, scaled up crisply, on a soft background
export function preview(outfit, scale = 4) {
  const sh = sheet(outfit), names = ['front', 'side', 'w1', 'w2', 'w3', 'back', 'wave1'];
  const cv = document.createElement('canvas'); cv.width = names.length * FW * scale; cv.height = FH * scale;
  const c = cv.getContext('2d'); c.imageSmoothingEnabled = false; c.fillStyle = '#e8e2f6'; c.fillRect(0, 0, cv.width, cv.height);
  names.forEach((n, i) => { const j = LAYOUT.indexOf(n); c.drawImage(sh, (j % 4) * FW, Math.floor(j / 4) * FH, FW, FH, i * FW * scale, 0, FW * scale, FH * scale); });
  return cv;
}
