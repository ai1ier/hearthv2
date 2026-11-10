// The Star Log's week sky and postcard album: every finished focus session lights a star in this
// week's constellation and sends home a postcard from wherever it happened (see js/worlds.js).
import { html, useState } from '../vendor.js';
import { worldById, placeLabel } from '../worlds.js';
import { startOfWeek, addDays, hash } from '../time.js';
import { memberById } from '../fandom/txt.js';

// colours for each place: [sky, ground, accent]
const PLACE_LOOK = { study: ['#e6dcfa', '#b4a6e6', '#f2c14a'], training: ['#fbe6f0', '#e8a0c0', '#ffffff'], tavern: ['#f8e4cc', '#c89a7a', '#ffd27a'], woods: ['#d8e8ff', '#8ac8a8', '#f6a8c8'], cottage: ['#efe6ff', '#a89ad8', '#ffe2a8'] };
const lookOf = (p) => { const w = worldById(p); return w ? w.look : PLACE_LOOK[p] || PLACE_LOOK.study; };
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function WeekSky({ state }) {
  const from = +startOfWeek(new Date()), to = +addDays(new Date(from), 7);
  const cards = (state.postcards || []).filter((c) => c.at >= from && c.at < to).sort((a, b) => a.at - b.at);
  const W = 350, Hh = 120;
  const stars = cards.map((c) => {
    const d = Math.floor((c.at - from) / 86400000);
    return { c, x: Math.round(18 + d * 50 + (hash(c.id) - 0.5) * 30), y: Math.round(14 + hash(c.id + '*') * 76), r: c.minutes >= 50 ? 3.2 : c.minutes >= 25 ? 2.4 : 1.7 };
  });
  const mins = cards.reduce((n, c) => n + (c.minutes || 0), 0);
  return html`<div class="panel week-sky">
    <h3>🌠 This week’s constellation</h3>
    <p class="muted">${cards.length ? `${cards.length} ${cards.length === 1 ? 'star' : 'stars'} so far · ${Math.round(mins / 6) / 10}h of focus. Each finished session lights one.` : 'Finish a focus session and the first star of this week’s constellation lights up.'}</p>
    <svg viewBox=${`0 0 ${W} ${Hh}`} class="sky-svg" role="img" aria-label=${`This week's constellation: ${cards.length} stars`}>
      ${DAYS.map((d, i) => html`<text x=${25 + i * 50} y=${Hh - 6} class="sky-day">${d}</text>`)}
      ${stars.slice(1).map((s, i) => html`<line x1=${stars[i].x} y1=${stars[i].y} x2=${s.x} y2=${s.y} class="sky-line" />`)}
      ${stars.map((s) => html`<g class="sky-star"><title>${placeLabel(s.c.place)} · ${s.c.title} · ${s.c.minutes}m</title>
        <circle cx=${s.x} cy=${s.y} r=${s.r * 2.6} fill=${lookOf(s.c.place)[2]} opacity="0.18" />
        <path d=${`M${s.x} ${s.y - s.r * 1.8}L${s.x + s.r * 0.45} ${s.y - s.r * 0.45}L${s.x + s.r * 1.8} ${s.y}L${s.x + s.r * 0.45} ${s.y + s.r * 0.45}L${s.x} ${s.y + s.r * 1.8}L${s.x - s.r * 0.45} ${s.y + s.r * 0.45}L${s.x - s.r * 1.8} ${s.y}L${s.x - s.r * 0.45} ${s.y - s.r * 0.45}Z`} fill="#fff6dc" /></g>`)}
    </svg>
  </div>`;
}

export function Postcards({ state }) {
  const [all, setAll] = useState(false);
  const cards = [...(state.postcards || [])].reverse();
  const shown = all ? cards : cards.slice(0, 8);
  return html`<div class="panel">
    <h3>💌 Postcards</h3>
    ${cards.length ? html`<div class="postcards">${shown.map((c) => {
      const [sky, ground, acc] = lookOf(c.place), g = c.guide ? memberById(c.guide) : null;
      return html`<figure class="postcard" key=${c.id}>
        <div class="pc-pic" style=${`--sky:${sky};--ground:${ground};--acc:${acc}`}><span>${placeLabel(c.place).split(' ')[0]}</span><i class="pc-stamp">✦</i></div>
        <figcaption><b>${placeLabel(c.place).replace(/^\S+\s/, '')}</b><span>${c.icon || '✨'} ${c.title}</span>
          <small>${c.minutes}m · ${new Date(c.at).toLocaleDateString([], { day: 'numeric', month: 'short' })}${g ? ` · with ${g.name}` : ''}</small></figcaption>
      </figure>`;
    })}</div>
    ${cards.length > 8 && html`<button class="btn sm ghost" onClick=${() => setAll(!all)}>${all ? 'Show fewer' : `Show all ${cards.length}`}</button>`}`
    : html`<p class="muted">Postcards arrive after each focus session, from the study, the café or a little travel planet. Tap one of the small planets in the sky to visit.</p>`}
  </div>`;
}
