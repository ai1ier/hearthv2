// The travel window: tap a little planet behind home to focus there, on one of today's quests
// or a free session, with your guide along.
import { html, useState } from '../vendor.js';
import { WORLDS, worldById, nextWorld, startWorldSession } from '../worlds.js';
import { guideOf } from '../fandom/index.js';
import { iso } from '../time.js';

export function TravelModal({ state, worldId, onClose }) {
  const w = worldById(worldId);
  const [pick, setPick] = useState('free25');
  if (!w) return null;
  const today = iso(new Date());
  const quests = state.quests.filter((q) => !q.done && q.date === today);
  const nx = nextWorld(state.xp);
  const g = guideOf(state.profile).name;
  const go = () => {
    if (pick.startsWith('free')) startWorldSession(w.id, null, pick === 'free50' ? 50 : 25);
    else startWorldSession(w.id, pick);
    onClose();
  };
  return html`<div class="modal-back" role="dialog" aria-modal="true" aria-label=${`Travel to ${w.name}`} onClick=${(e) => e.target === e.currentTarget && onClose()}>
    <div class="modal panel travel" style=${`--w-body:${w.look[0]};--w-light:${w.look[1]};--w-accent:${w.look[2]}`}>
      <div class="travel-head">
        <span class="travel-planet" aria-hidden="true"></span>
        <div><h2>${w.icon} ${w.name}</h2><p class="hint">${w.blurb}</p></div>
      </div>
      <p class="field-label">What shall we focus on there?</p>
      <div class="travel-picks" role="radiogroup">
        <label class=${'travel-pick' + (pick === 'free25' ? ' on' : '')}><input type="radio" name="tp" checked=${pick === 'free25'} onChange=${() => setPick('free25')} /> ✨ Free session · 25 min</label>
        <label class=${'travel-pick' + (pick === 'free50' ? ' on' : '')}><input type="radio" name="tp" checked=${pick === 'free50'} onChange=${() => setPick('free50')} /> ✨ Free session · 50 min, with a break</label>
        ${quests.map((q) => html`<label class=${'travel-pick' + (pick === q.id ? ' on' : '')}><input type="radio" name="tp" checked=${pick === q.id} onChange=${() => setPick(q.id)} /> ${q.icon} ${q.title} · ${q.minutes} min</label>`)}
      </div>
      ${!quests.length && html`<p class="hint">No quests accepted for today yet, so a free session it is. Lovely.</p>`}
      ${nx && html`<div class="travel-soon"><span class="field-label">Waiting in the clouds</span>
        ${WORLDS.filter((x) => x.xp > (state.xp || 0)).map((x) => html`<div class="soon-row"><span>${x.icon} ${x.name}</span><small>${x.xp - (state.xp || 0)} XP to go</small></div>`)}</div>`}
      <div class="modal-foot">
        <small class="hint">${nx ? 'Earn XP from quests and focus sessions ✦' : 'Every planet is yours to visit ✦'}</small>
        <div class="row">
          <button class="btn sm ghost" onClick=${onClose}>Not now</button>
          <button class="btn sm gold" onClick=${go} disabled=${!!state.focus}>${state.focus ? 'Finish your focus first' : `🚀 Go with ${g}`}</button>
        </div>
      </div>
    </div>
  </div>`;
}
