// Avatar studio: recolour a preset, toggle the familiar, upload your own pixel sprite
// (and keep the ones you like as styles), and dress up your oracle.
import { html, useEffect, useRef, useState } from '../vendor.js';
import { store } from '../store.js';
import { PRESETS, CAT, KEEPERS, resolveAvatar, defaultAvatar, defaultKeeper, pixelateUpload, AVATAR_H } from '../art/sprites.js';
import { Portrait, toast } from './common.js';
import { PET_H } from '../art/scene.js';

const setAv = (patch) => store.setProfile((p) => ({ avatar: { ...p.avatar, ...patch } }));
const setKeeper = (patch) => store.setProfile((p) => ({ keeper: { ...p.keeper, ...patch } }));

function Preview({ av, scale = 8, only = null }) {
  const ref = useRef();
  useEffect(() => {
    const cv = ref.current, g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, cv.width, cv.height);
    // little meadow backdrop, with a door for scale
    g.fillStyle = '#9cc8e8'; g.fillRect(0, 0, cv.width, cv.height);
    g.fillStyle = '#5f9e47'; g.fillRect(0, cv.height - 4 * scale, cv.width, 4 * scale);
    const groundY = cv.height - 4 * scale;
    if (only !== 'familiar') {
      g.fillStyle = '#e8dcc0'; g.fillRect(cv.width - 9 * scale, groundY - 20 * scale, 9 * scale, 20 * scale);
      g.fillStyle = '#6a3f22'; g.fillRect(cv.width - 7 * scale, groundY - 13 * scale, 5 * scale, 13 * scale);
    }
    const drawCat = () => {
      if (av.familiar === false || only === 'avatar') return;
      if (av.familiarImage) {
        const pi = new Image();
        pi.onload = () => { const p = Math.max(1, Math.min(scale, Math.round((scale * (av.familiarSize || PET_H)) / pi.height))); g.drawImage(pi, only ? Math.round(cv.width / 2 - (pi.width * p) / 2) : scale, groundY - pi.height * p, pi.width * p, pi.height * p); };
        pi.src = av.familiarImage;
        return;
      }
      const pal = CAT.pal(av.familiarColor || '#2a2230');
      CAT.frames[0].forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.') { g.fillStyle = pal[ch]; g.fillRect((only ? cv.width / 2 - 4 * scale : scale) + i * scale, groundY - 6 * scale + j * scale, scale, scale); } }));
    };
    if (only === 'familiar') drawCat();
    else if (av.image) {
      const img = new Image();
      // every uploaded pixel stays a whole block, just smaller, as in the scenes
      img.onload = () => { const p = Math.max(1, Math.min(scale, Math.round((scale * (av.size || AVATAR_H)) / img.height))); g.drawImage(img, Math.round(cv.width / 2 - (img.width * p) / 2), groundY - img.height * p, img.width * p, img.height * p); drawCat(); };
      img.src = av.image;
    } else {
      const sp = resolveAvatar(av);
      const x0 = cv.width / 2 - (sp.w * scale) / 2, y0 = groundY - sp.h * scale;
      sp.rows.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.' && sp.pal[ch]) { g.fillStyle = sp.pal[ch]; g.fillRect(x0 + i * scale, y0 + j * scale, scale, scale); } }));
      drawCat();
    }
  }, [JSON.stringify(av), scale, only]);
  return html`<canvas ref=${ref} class="avatar-preview" width=${34 * scale} height=${34 * scale} aria-label="Avatar preview"></canvas>`;
}

const imageHeight = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i.height); i.onerror = () => ok(0); i.src = src; });
const familiarOf = (a) => ({ familiar: a.familiar, familiarColor: a.familiarColor, familiarImage: a.familiarImage, familiarSize: a.familiarSize });

export function AvatarStudio({ state }) {
  return html`<div class="studio-stack">
    <${AvatarPanel} state=${state} />
    <${FamiliarPanel} state=${state} />
    <${KeeperPanel} state=${state} />
  </div>`;
}

function AvatarPanel({ state }) {
  const av = state.profile.avatar;
  const designs = state.profile.avatarDesigns || [];
  const preset = PRESETS[av.preset] || PRESETS.witch;
  const colors = { ...preset.colors, ...av.colors };
  const trying = av.image && !designs.some((d) => d.id === av.designId);
  const [name, setName] = useState('');
  const upload = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const image = await pixelateUpload(f);
      const h = await imageHeight(image);
      if (h <= 14 && confirm(`This picture is only ${h} px tall — about the size of a familiar.\n\nOK — make it your familiar\nCancel — use it as your avatar anyway`)) {
        setAv({ familiar: true, familiarImage: await pixelateUpload(f, 24), familiarSize: av.familiarSize || PET_H }); toast('🐾 Added as your familiar instead');
      } else { setAv({ image, designId: null, size: AVATAR_H }); setName(f.name.replace(/\.[a-z0-9]+$/i, '').slice(0, 24)); toast('🖼️ Trying on your design — save it if you like it'); }
    }
    catch (err) { toast(err.message); }
    e.target.value = '';
  };
  const save = () => {
    const d = { id: 'av' + Date.now().toString(36), name: name.trim() || `Design ${designs.length + 1}`, image: av.image, size: av.size || AVATAR_H };
    store.setProfile((p) => ({ avatarDesigns: [...(p.avatarDesigns || []), d], avatar: { ...p.avatar, designId: d.id } }));
    toast(`✨ “${d.name}” added to your styles`);
  };
  const remove = (d) => {
    if (!confirm(`Remove “${d.name}” from your styles?`)) return;
    store.setProfile((p) => ({ avatarDesigns: p.avatarDesigns.filter((x) => x.id !== d.id), avatar: p.avatar.designId === d.id ? { ...p.avatar, designId: null } : p.avatar }));
  };
  const setSize = (size) => {
    setAv({ size });
    if (av.designId) store.setProfile((p) => ({ avatarDesigns: p.avatarDesigns.map((d) => (d.id === av.designId ? { ...d, size } : d)) }));
  };

  return html`<div class="cols avatar-studio">
    <div class="panel">
      <h3>🧙 Your avatar</h3>
      <${Preview} av=${av} />
      <p class="muted">She stands by the quest board in the meadow. Click her there to come back here; click the cat for a surprise.</p>
    </div>
    <div class="panel">
      <h3>Style</h3>
      <div class="row style-row">
        ${Object.entries(PRESETS).map(([k, p]) => html`<button class=${'btn sm' + (av.preset === k && !av.image ? ' on' : '')} onClick=${() => setAv({ preset: k, colors: { ...p.colors }, image: null, designId: null })}>${p.label}</button>`)}
        ${designs.map((d) => html`<span class=${'design-chip' + (av.designId === d.id && av.image ? ' on' : '')}>
          <button class="btn sm" onClick=${() => setAv({ image: d.image, size: d.size, designId: d.id })} title=${`Wear ${d.name}`}><img src=${d.image} alt="" />${d.name}</button>
          <button class="chip-x" onClick=${() => remove(d)} aria-label=${`Remove ${d.name}`}>✕</button>
        </span>`)}
      </div>
      ${!av.image && html`<div class="swatches">
        ${Object.entries(preset.slots).map(([k, label]) => html`<label class="swatch-field"><input type="color" value=${colors[k]} onInput=${(e) => setAv({ colors: { ...colors, [k]: e.target.value } })} /><span>${label}</span></label>`)}
      </div>
      <button class="link" onClick=${() => setAv({ colors: { ...preset.colors } })}>Reset colours</button>`}
      ${av.image && html`<label class="field size-field"><span class="field-label">Size in the scenes · about ${av.size || AVATAR_H} px tall (the witch is 25) — your pixels are kept, just drawn smaller</span>
        <input type="range" min="14" max="32" value=${av.size || AVATAR_H} onInput=${(e) => setSize(+e.target.value)} /></label>`}
      ${trying && html`<div class="try-on">
        <b>Trying it on.</b> Not saved yet — keep it as a style only if it turned out nicely.
        <div class="row"><input type="text" value=${name} maxlength="24" placeholder="Name this design" aria-label="Design name" onInput=${(e) => setName(e.target.value)} />
          <button class="btn sm gold" onClick=${save}>Save to my styles</button>
          <button class="btn sm ghost" onClick=${() => setAv({ image: null, designId: null })}>Discard</button></div>
      </div>`}

      <h4>Upload your own avatar</h4>
      <p class="muted">Draw a character in any pixel editor — <a href="https://www.piskelapp.com" target="_blank" rel="noopener">Piskel</a> (free, in the browser), Aseprite or Pixilart — on a <b>transparent background</b>, about <b>16×24 px</b>, with the feet on the bottom row. Export as PNG and upload it here. It’s drawn smaller to match the witch’s height while keeping every pixel you drew (adjust with the size slider), and the scene re-lights it for dawn, dusk and night automatically. Uploads are only tried on until you save them.</p>
      <div class="row">
        <label class="btn sm">🧙 Upload avatar PNG<input type="file" accept="image/png,image/gif,image/webp" hidden onChange=${upload} /></label>
        <button class="btn sm ghost" onClick=${() => store.setProfile((p) => ({ avatar: { ...defaultAvatar(), ...familiarOf(p.avatar) } }))}>Restore the witch</button>
      </div>
    </div>
  </div>`;
}

function FamiliarPanel({ state }) {
  const av = state.profile.avatar;
  const on = av.familiar !== false;
  const uploadPet = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { setAv({ familiar: true, familiarImage: await pixelateUpload(f, 24), familiarSize: av.familiarSize || PET_H }); toast('🐾 Your familiar has arrived'); }
    catch (err) { toast(err.message); }
    e.target.value = '';
  };
  return html`<div class="cols avatar-studio">
    <div class="panel">
      <h3>🐾 Your familiar</h3>
      <${Preview} av=${av} only="familiar" scale=${12} />
      <p class="muted">Your companion follows you everywhere — the meadow, the study, the training grounds, the tavern and the kitchen. Click it in the meadow for a surprise.</p>
    </div>
    <div class="panel">
      <h3>Companion</h3>
      <div class="row">
        <label class="inline"><input type="checkbox" checked=${on} onChange=${(e) => setAv({ familiar: e.target.checked })} /> Bring a familiar along</label>
        ${on && !av.familiarImage && html`<label class="swatch-field"><input type="color" value=${av.familiarColor || '#2a2230'} onInput=${(e) => setAv({ familiarColor: e.target.value })} /><span>Cat’s fur</span></label>`}
      </div>
      ${on && av.familiarImage && html`<label class="field size-field"><span class="field-label">Size in the scenes · about ${av.familiarSize || PET_H} px tall (the cat is 6)</span>
        <input type="range" min="5" max="20" value=${av.familiarSize || PET_H} onInput=${(e) => setAv({ familiarSize: +e.target.value })} /></label>`}
      <h4>Upload your own familiar</h4>
      <p class="muted">A fox, a frog, a little dragon — a pixel PNG on a transparent background, about <b>12×12 px</b> (24 max), facing right with its feet on the bottom row. Every pixel is kept, just drawn smaller.</p>
      <div class="row">
        <label class="btn sm">🐾 Upload familiar PNG<input type="file" accept="image/png,image/gif,image/webp" hidden onChange=${uploadPet} /></label>
        ${av.familiarImage && html`<button class="btn sm ghost" onClick=${() => setAv({ familiarImage: null })}>Back to the cat</button>`}
      </div>
    </div>
  </div>`;
}

function KeeperPanel({ state }) {
  const k = state.profile.keeper || defaultKeeper();
  const preset = KEEPERS[k.preset] || KEEPERS.owl;
  const colors = { ...preset.colors, ...(k.colors || {}) };
  const upload = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { setKeeper({ image: await pixelateUpload(f, 32) }); toast('🖼️ Your oracle has a new look'); }
    catch (err) { toast(err.message); }
    e.target.value = '';
  };
  return html`<div class="cols avatar-studio">
    <div class="panel">
      <h3>🔮 Your oracle</h3>
      <div class="keeper-preview"><${Portrait} keeper=${k} scale=${8} /></div>
      <p class="muted">Your innkeeper and oracle greets you each morning, cheers you on in the study, and writes your chronicle.</p>
    </div>
    <div class="panel">
      <h3>Name</h3>
      <div class="row">
        <label class="field"><span class="field-label">Name</span><input type="text" value=${k.name} maxlength="20" onInput=${(e) => setKeeper({ name: e.target.value })} /></label>
        <label class="field"><span class="field-label">Title</span><input type="text" value=${k.title} maxlength="32" placeholder="the Hearth Oracle" onInput=${(e) => setKeeper({ title: e.target.value })} /></label>
      </div>
      <h4>Kind</h4>
      <div class="row">${Object.entries(KEEPERS).map(([id, p]) => html`<button class=${'btn sm' + (k.preset === id && !k.image ? ' on' : '')} onClick=${() => setKeeper({ preset: id, colors: { ...p.colors }, image: null })}>${p.label}</button>`)}</div>
      ${!k.image && html`<div class="swatches">
        ${Object.entries(preset.slots).map(([id, label]) => html`<label class="swatch-field"><input type="color" value=${colors[id]} onInput=${(e) => setKeeper({ colors: { ...colors, [id]: e.target.value } })} /><span>${label}</span></label>`)}
      </div>
      <button class="link" onClick=${() => setKeeper({ colors: { ...preset.colors } })}>Reset colours</button>`}
      <h4>Upload a portrait</h4>
      <p class="muted">A square pixel portrait on a transparent background, about <b>16×16 px</b> (32 max). It’s shown framed beside the oracle’s words.</p>
      <div class="row">
        <label class="btn sm">Upload PNG<input type="file" accept="image/png,image/gif,image/webp" hidden onChange=${upload} /></label>
        ${k.image && html`<button class="btn sm ghost" onClick=${() => setKeeper({ image: null })}>Back to the ${preset.label.toLowerCase()}</button>`}
        <button class="btn sm ghost" onClick=${() => store.setProfile({ keeper: defaultKeeper() })}>Restore Hoot</button>
      </div>
    </div>
  </div>`;
}
