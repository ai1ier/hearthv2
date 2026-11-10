// Avatar studio: recolour a preset, toggle the familiar, upload your own pixel sprite
// (and keep the ones you like as styles), and choose which member is your star guide.
// v2 keeps its avatar in profile.fandom.avatar, so the original app's witch is left as it was.
import { html, useEffect, useRef, useState } from '../vendor.js';
import { store } from '../store.js';
import { PRESETS, CAT, resolveAvatar, pixelateUpload, AVATAR_H } from '../art/sprites.js';
import { Portrait, toast } from './common.js';
import { avatarOf, guideOf, groupOf, patchAvatar, patchFandom, defaultFandomAvatar } from '../fandom/index.js';
import { PET_H } from '../art/scene.js';

const setAv = (patch) => patchAvatar(store, patch);

function Preview({ av, scale = 8, only = null }) {
  const ref = useRef();
  useEffect(() => {
    const cv = ref.current, g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, cv.width, cv.height);
    // a little patch of planet under a pastel sky, with the star lamp for scale
    const sky = g.createLinearGradient(0, 0, 0, cv.height); sky.addColorStop(0, '#8bb0f2'); sky.addColorStop(1, '#e6dcff');
    g.fillStyle = sky; g.fillRect(0, 0, cv.width, cv.height);
    g.fillStyle = '#ffffff'; for (const [x, y] of [[3, 4], [27, 3], [9, 12], [30, 14], [20, 7]]) g.fillRect(x * scale, y * scale, scale, scale);
    g.fillStyle = '#a6e4cc'; g.fillRect(0, cv.height - 4 * scale, cv.width, scale);
    g.fillStyle = '#8a7ed0'; g.fillRect(0, cv.height - 3 * scale, cv.width, 3 * scale);
    const groundY = cv.height - 4 * scale;
    if (only !== 'familiar') {
      g.fillStyle = '#6a5aa8'; g.fillRect(cv.width - 5 * scale, groundY - 18 * scale, scale, 18 * scale);
      g.fillStyle = '#ffe08a'; g.fillRect(cv.width - 6 * scale, groundY - 22 * scale, 3 * scale, 3 * scale); g.fillRect(cv.width - 5 * scale, groundY - 23 * scale, scale, 5 * scale); g.fillRect(cv.width - 7 * scale, groundY - 21 * scale, 5 * scale, scale);
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
    <${GuidePanel} state=${state} />
  </div>`;
}

function AvatarPanel({ state }) {
  const av = avatarOf(state.profile);
  const designs = state.profile.avatarDesigns || [];
  const preset = PRESETS[av.preset] || PRESETS.moa;
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
    store.setProfile((p) => ({ avatarDesigns: [...(p.avatarDesigns || []), d] })); setAv({ designId: d.id });
    toast(`✨ “${d.name}” added to your styles`);
  };
  const remove = (d) => {
    if (!confirm(`Remove “${d.name}” from your styles?`)) return;
    store.setProfile((p) => ({ avatarDesigns: p.avatarDesigns.filter((x) => x.id !== d.id) })); if (av.designId === d.id) setAv({ designId: null });
  };
  const setSize = (size) => {
    setAv({ size });
    if (av.designId) store.setProfile((p) => ({ avatarDesigns: p.avatarDesigns.map((d) => (d.id === av.designId ? { ...d, size } : d)) }));
  };

  return html`<div class="cols avatar-studio">
    <div class="panel">
      <h3>⭐ Your avatar</h3>
      <${Preview} av=${av} />
      <p class="muted">You stand between the rose and the star board on the little planet. Click yourself there to come back here; click your familiar for a surprise.</p>
      <label class="inline"><input type="checkbox" checked=${!av.hidden} onChange=${(e) => setAv({ hidden: !e.target.checked })} /> Show me in the scenes</label>
      ${av.hidden ? html`<p class="hint">You’re resting off-screen for now. Your familiar and guide keep the place cosy.</p>` : null}
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
      ${av.image && html`<label class="field size-field"><span class="field-label">Size in the scenes · about ${av.size || AVATAR_H} px tall (the MOA traveller is 25) — your pixels are kept, just drawn smaller</span>
        <input type="range" min="14" max="32" value=${av.size || AVATAR_H} onInput=${(e) => setSize(+e.target.value)} /></label>`}
      ${trying && html`<div class="try-on">
        <b>Trying it on.</b> Not saved yet — keep it as a style only if it turned out nicely.
        <div class="row"><input type="text" value=${name} maxlength="24" placeholder="Name this design" aria-label="Design name" onInput=${(e) => setName(e.target.value)} />
          <button class="btn sm gold" onClick=${save}>Save to my styles</button>
          <button class="btn sm ghost" onClick=${() => setAv({ image: null, designId: null })}>Discard</button></div>
      </div>`}

      <h4>Upload your own avatar</h4>
      <p class="muted">Draw a character in any pixel editor — <a href="https://www.piskelapp.com" target="_blank" rel="noopener">Piskel</a> (free, in the browser), Aseprite or Pixilart — on a <b>transparent background</b>, about <b>16×24 px</b>, with the feet on the bottom row. Export as PNG and upload it here. It’s drawn smaller to match the MOA traveller’s height while keeping every pixel you drew (adjust with the size slider), and the scene re-lights it for dawn, dusk and night automatically. Uploads are only tried on until you save them.</p>
      <div class="row">
        <label class="btn sm">⭐ Upload avatar PNG<input type="file" accept="image/png,image/gif,image/webp" hidden onChange=${upload} /></label>
        <button class="btn sm ghost" onClick=${() => setAv({ ...defaultFandomAvatar(), ...familiarOf(av) })}>Restore the MOA traveller</button>
      </div>
    </div>
  </div>`;
}

function FamiliarPanel({ state }) {
  const av = avatarOf(state.profile);
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
      <p class="muted">Your companion follows you everywhere — the little planet, the study and every outing. Click it on the planet for a surprise.</p>
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

// Pick which member of the group is your star guide (the one who greets you, cheers you on
// and strolls around the planet). Members without a drawing yet show as "coming soon".
function GuidePanel({ state }) {
  const grp = groupOf(state.profile), g = guideOf(state.profile);
  return html`<div class="cols avatar-studio">
    <div class="panel">
      <h3>🌟 Your star guide</h3>
      <div class="keeper-preview"><${Portrait} scale=${8} /></div>
      <p class="muted"><b>${g.name}</b> greets you each morning, cheers you on in the study, writes your chronicle and wanders around the little planet. Tap ${g.name} there to say hi.</p>
    </div>
    <div class="panel">
      <h3>${grp.full}</h3>
      <p class="muted">Choose your guide from the members. More members are being drawn; other groups (with their own colours and worlds) can come later too.</p>
      <div class="member-row">
        ${grp.members.map((m) => m.sprite
          ? html`<button class=${'member' + (m.id === g.id ? ' on' : '')} onClick=${() => { patchFandom(store, { guide: m.id }); toast(`⭐ ${m.name} is your star guide`); }} aria-pressed=${m.id === g.id}><${Portrait} scale=${3} member=${m} /><b>${m.name}</b><small>${m.id === g.id ? 'your guide' : 'choose'}</small></button>`
          : html`<button class="member" disabled title="Coming soon"><span class="soon" style=${{ color: m.star }}>✦</span><b>${m.name}</b><small>coming soon</small></button>`)}
      </div>
    </div>
  </div>`;
}
