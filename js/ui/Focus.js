// The focus panel: timer, controls, ambience and session notes.
import { html, useState, useEffect, useRef } from '../vendor.js';
import { focusStatus, pauseFocus, resumeFocus, extendFocus, anotherRound, skipBreak, takeSavedTea, setPomodoro, setNotes, finishFocus, finishOuting, endFocus, POMOS, pomoOf, OUTINGS } from '../focus.js';
import { setAmbience, setVolume, chime, teaChime } from '../ambience.js';
import { Portrait, Meter, keeperLabel } from './common.js';
import { hash, fmtDur } from '../time.js';
import { worldById, breakLine } from '../worlds.js';
import { guideOf } from '../fandom/index.js';

const CHEER = {
  focus: ['Good pace. One page at a time.', 'Steady and focused. Nice.', 'Every minute here is a stone on the path.', 'The candle’s still burning, and so is your focus.', 'Small, patient steps make the grandest quests.'],
  break: ['Tea break! Stretch, sip, and look out the window.', 'Rest your eyes for a bit. The book will wait.', 'A little wander around the room does wonders.'],
  done: ['Quest complete! Nice work. Claim your reward.', 'You did it! The hourglass is full.'],
  paused: ['Paused. Take all the time you need.'],
};

export const mmss = (min) => { const t = Math.max(0, Math.round(min * 60)); return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };

const OUT_CHEER = {
  fitness: ['Five, six, seven, eight! Move at your own pace.', 'Every step counts, and so does the cool-down.', 'Breathe deep and feel the beat. You’re shining!'],
  social: ['Good company is the best kind of magic.', 'Laugh loudly, stay late if you like. Rest is part of the quest.', 'Raise a milk tea to friendship!'],
  outdoors: ['Listen: the garden is saying hello.', 'No hurry out here. Notice one small thing you like.', 'Fresh air and starlit paths. Just what the stars ordered.'],
  chores: ['A tidy planet is a happy planet.', 'One shelf at a time. Look how it sparkles!', 'Put on a song and let the broom dance.'],
};

function OutingPanel({ state }) {
  const f = state.focus, o = OUTINGS[f.category];
  const [, tick] = useState(0);
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 15000); return () => clearInterval(id); }, []);
  const mins = Math.max(1, Math.round((Date.now() - f.startedAt) / 60000));
  const q = state.quests.find((x) => x.id === f.questId);
  const lines = OUT_CHEER[f.category] || OUT_CHEER.chores;
  const cheer = f.doneAt ? `Wonderful! Quest complete${q ? ` — +${q.xp} XP` : ''}. Let’s fly home to the planet.` : lines[Math.floor(hash(f.questId + Math.floor(mins / 10)) * lines.length)];
  return html`<section class="panel focus-panel outing-panel" aria-live="polite">
    <div class="focus-top">
      <div class="focus-quest">
        <small>${o.icon} ${o.where} · ${mins}m so far</small>
        <h3>${f.icon} ${f.title}</h3>
        <small>Planned for ${f.minutes} min — come back and mark it done whenever you finish.</small>
      </div>
    </div>
    <div class="row">
      ${f.doneAt ? html`<span class="tag gold">✨ Complete</span>` : html`
        <button class="btn gold" onClick=${finishOuting}>✓ Mark done</button>
        <button class="btn sm ghost" onClick=${endFocus} title="Stop without completing; the quest stays on your road">Head home without finishing</button>`}
    </div>
    <div class="keeper-row">
      <${Portrait} scale=${3} />
      <div class="speech"><div class="speaker">${keeperLabel(state.profile)}</div><p>${cheer}</p></div>
    </div>
    ${!f.doneAt && html`<label class="field"><span class="field-label">A note for your diary (optional)</span>
      <textarea rows="2" value=${f.notes} placeholder="Who did you see? How did it feel?" onInput=${(e) => setNotes(e.target.value)}></textarea></label>`}
  </section>`;
}

function LoggedPanel({ state }) {
  const f = state.focus, q = state.quests.find((x) => x.id === f.questId);
  return html`<section class="panel focus-panel outing-panel" aria-live="polite">
    <div class="keeper-row">
      <${Portrait} scale=${3} />
      <div class="speech"><div class="speaker">${keeperLabel(state.profile)}</div>
        <p>✨ “${f.icon} ${f.title}” is in the chronicle${q ? ` — +${q.xp} XP` : ''}. Well done, even if the ink is a little late!</p></div>
    </div>
  </section>`;
}

export function FocusPanel({ state }) {
  if (state.focus.logged) return html`<${LoggedPanel} state=${state} />`;
  if (state.focus.mode === 'outing' && OUTINGS[state.focus.category]) return html`<${OutingPanel} state=${state} />`;
  return html`<${StudyPanel} state=${state} />`;
}

function StudyPanel({ state }) {
  const f = state.focus;
  const [, tick] = useState(0);
  const [sound, setSound] = useState(null);
  const [vol, setVol] = useState(0.5);
  const chimed = useRef(false);
  const lastPhase = useRef(null);
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(id); }, []);
  useEffect(() => () => setAmbience(null), []);
  const st = focusStatus(f);
  const paused = !!f.pausedAt;
  const mood = paused ? 'paused' : st.phase;
  useEffect(() => {
    if (st.phase === 'done' && !chimed.current) { chimed.current = true; chime(); }
    if (st.phase !== 'done') chimed.current = false; // ready to ring again after another round
    // tea time (and back to the desk) gets its own gentler bell
    if (lastPhase.current && lastPhase.current !== st.phase && !paused) {
      if (st.phase === 'break') teaChime();
      else if (st.phase === 'focus' && lastPhase.current === 'break') teaChime(true);
    }
    lastPhase.current = st.phase;
    document.title = st.phase === 'done' ? '✨ Quest complete · Star Chapter' : `${paused ? '⏸ ' : st.phase === 'break' ? '☕ ' : ''}${mmss(st.left)} · ${f.title}`;
  });
  useEffect(() => () => { document.title = 'Star Chapter'; }, []);
  const goal = f.goalId ? state.profile.goals.find((g) => g.id === f.goalId) : null;
  const world = worldById(f.world);
  // on a travel planet, the break is a little moment with your guide
  const cheer = world && mood === 'break' ? breakLine(world, st.round, guideOf(state.profile).name) : CHEER[mood][Math.floor(hash(f.questId + Math.floor(st.focused / 5)) * CHEER[mood].length)];
  const toggleSound = (k) => { const next = sound === k ? null : k; setSound(next); setAmbience(next, vol); };

  return html`<section class="panel focus-panel" aria-live="polite">
    <div class="focus-top">
      <div class="focus-quest">
        <small>${st.phase === 'break' ? '☕ Tea break' : st.phase === 'done' ? '✨ Complete' : paused ? '⏸ Paused' : f.pomodoro ? `Focus · round ${st.round}` : 'Focusing'}</small>
        <h3>${f.icon} ${f.title}</h3>
        ${world ? html`<small>${world.icon} ${world.where}</small>` : null}
        ${goal && goal.type === 'deadline' ? html`<small>${goal.title}: ${(goal.hoursDone + st.focused / 60).toFixed(1)}/${goal.hoursNeeded}h prepared</small>` : null}
      </div>
      <div class=${'timer' + (st.phase === 'break' ? ' rest' : '') + (paused ? ' paused' : '')}>${st.phase === 'done' ? 'DONE' : mmss(st.left)}</div>
    </div>
    <${Meter} value=${st.progress} color=${st.phase === 'break' ? '#7ab0c0' : '#f2c14a'} label=${`${Math.round(st.focused)} of ${f.minutes} focus minutes`} />
    <div class="focus-meta"><span>${Math.round(st.focused)} / ${f.minutes} min focused</span>${f.pomodoro ? html`<span>${pomoOf(f).focus}m focus · ${pomoOf(f).rest}m tea${f.teaSaved ? ` · 🫖 ${Math.round(f.teaSaved)}m saved` : ''}</span>` : null}</div>

    <div class="row">
      ${st.phase === 'done'
        ? html`<button class="btn gold" onClick=${finishFocus}>✨ Claim reward</button>
          <button class="btn sm" onClick=${() => { chimed.current = false; anotherRound(); }}>▶ Start round ${st.round + 1} (${fmtDur(pomoOf(f)?.focus || 25)})</button>
          <button class="btn sm ghost" onClick=${() => { chimed.current = false; extendFocus(10); }}>+10m</button>`
        : st.phase === 'break' ? html`
          <button class="btn sm gold" onClick=${() => skipBreak(false)} title="Skip the rest of this tea break">▶ Start round ${st.round + 1} now</button>
          <button class="btn sm" onClick=${() => skipBreak(true)} title="Skip it now and keep the minutes for a longer break later">🫖 Save ${Math.ceil(st.left)}m of tea for later</button>
          ${paused ? html`<button class="btn sm" onClick=${resumeFocus}>▶ Resume</button>` : html`<button class="btn sm" onClick=${pauseFocus}>⏸ Pause</button>`}
          <button class="btn sm ghost" onClick=${finishFocus} title="Complete now and keep the minutes you focused">✓ Finish</button>`
        : html`
          ${f.teaSaved ? html`<button class="btn sm" onClick=${takeSavedTea} title="Take your saved-up tea break now">☕ Take saved tea (${Math.round(f.teaSaved)}m)</button>` : null}
          ${paused ? html`<button class="btn sm gold" onClick=${resumeFocus}>▶ Resume</button>` : html`<button class="btn sm" onClick=${pauseFocus}>⏸ Pause</button>`}
          <button class="btn sm" onClick=${() => extendFocus(5)}>+5 min</button>
          <button class="btn sm gold" onClick=${finishFocus} title="Complete now and keep the minutes you focused">✓ Finish early</button>
          <button class="btn sm ghost" onClick=${endFocus} title="Stop without completing; the quest stays on your road">Leave the study</button>`}
    </div>

    <div class="focus-grid">
      <div class="keeper-row">
        <${Portrait} scale=${3} />
        <div class="speech"><div class="speaker">${keeperLabel(state.profile)}</div><p>${cheer}</p></div>
      </div>
      <div class="focus-opts">
        <div class="row"><span class="field-label">Tea breaks</span>
          ${[['', 'Off'], ...Object.keys(POMOS).map((k) => [k, k])].map(([k, label]) => html`<button class=${'btn xs' + ((pomoOf(f) ? Object.keys(POMOS).find((x) => POMOS[x] === pomoOf(f)) : '') === k ? ' on' : '')} onClick=${() => setPomodoro(k)}>${label}</button>`)}
        </div>
        <div class="row">
          <span class="field-label">Ambience</span>
          <button class=${'btn xs' + (sound === 'rain' ? ' on' : '')} onClick=${() => toggleSound('rain')}>🌧️ Rain</button>
          <button class=${'btn xs' + (sound === 'hearth' ? ' on' : '')} onClick=${() => toggleSound('hearth')}>🔥 Fireside</button>
          ${sound && html`<input type="range" min="0" max="1" step="0.05" value=${vol} aria-label="Volume" onInput=${(e) => { setVol(+e.target.value); setVolume(+e.target.value); }} />`}
        </div>
      </div>
    </div>
    <label class="field"><span class="field-label">Session notes — saved to your diary when you finish</span>
      <textarea rows="2" value=${f.notes} placeholder="What did you cover? Anything to remember next time?" onInput=${(e) => setNotes(e.target.value)}></textarea></label>
  </section>`;
}
