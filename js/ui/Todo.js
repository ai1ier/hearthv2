// The errand scroll (a to-do list): little things to remember that don't need a time on the road.
// Any errand can get a reminder, or be started straight away at the study desk.
import { html, useState } from '../vendor.js';
import { store } from '../store.js';
import { setReminder, whenLabel } from './Reminders.js';
import { startErrand } from '../focus.js';
import { iso, hhmm, addDays } from '../time.js';
import { Grip, moveItem } from './Sortable.js';

const setTodos = (fn) => store.set((s) => ({ todos: fn(s.todos || []) }));
const local = (ms) => { const d = new Date(ms); return `${iso(d)}T${hhmm(d)}`; }; // for <input type="datetime-local">
const at = (days, h) => { const d = addDays(new Date(), days); d.setHours(h, 0, 0, 0); return +d; };

export function TodoList({ state, onStart }) {
  const [text, setText] = useState('');
  const [bell, setBell] = useState(null); // id of the errand whose reminder is being set
  const [go, setGo] = useState(null); // id of the errand being started now
  const todos = state.todos || [];
  const open = todos.filter((t) => !t.done), done = todos.filter((t) => t.done).sort((a, b) => b.doneAt - a.doneAt);
  const add = (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setTodos((ts) => [...ts, { id: 't-' + Date.now().toString(36), text: t, done: false, at: Date.now() }]);
    setText('');
  };
  const toggle = (id, on) => setTodos((ts) => ts.map((t) => (t.id === id ? { ...t, done: on, doneAt: on ? Date.now() : null, rang: false } : t)));
  const remind = (id, ms) => { setReminder(id, ms); setBell(null); };
  const quick = [['In 15m', () => Date.now() + 15 * 60000], ['In 1h', () => Date.now() + 60 * 60000], ['This evening', () => at(new Date().getHours() >= 18 ? 1 : 0, 18)], ['Tomorrow 9am', () => at(1, 9)]];
  const row = (t) => html`<li key=${t.id} class=${t.done ? 'done' : ''} data-sort=${t.done ? null : t.id}>
    <div class="todo-row">
      ${!t.done && open.length > 1 ? html`<${Grip} id=${t.id} label=${t.text} onMove=${(a, b, after) => setTodos((ts) => moveItem(ts, a, b, after))} />` : null}
      <label><input type="checkbox" checked=${t.done} onChange=${(e) => toggle(t.id, e.target.checked)} /><span>${t.text}</span></label>
      ${!t.done && t.remindAt ? html`<button class=${'tag rem-tag' + (t.rang ? ' ringing' : '')} title="Change reminder" onClick=${() => { setBell(bell === t.id ? null : t.id); setGo(null); }}>🔔 ${whenLabel(t.remindAt)}</button>` : null}
      ${!t.done && !t.remindAt ? html`<button class="btn xs ghost" aria-label=${`Remind me about ${t.text}`} title="Set a reminder" onClick=${() => { setBell(bell === t.id ? null : t.id); setGo(null); }}>🔔</button>` : null}
      ${!t.done && html`<button class="btn xs ghost" aria-label=${`Start ${t.text} now`} title="Start this now in the study" onClick=${() => { setGo(go === t.id ? null : t.id); setBell(null); }}>▶</button>`}
      <button class="btn xs ghost" aria-label=${`Remove ${t.text}`} onClick=${() => setTodos((ts) => ts.filter((x) => x.id !== t.id))}>✕</button>
    </div>
    ${go === t.id && html`<div class="rem-set"><span class="muted">Head to the study for</span>
      ${[15, 25, 45, 60].map((m) => html`<button class="btn xs gold" onClick=${() => { setGo(null); startErrand(t, m); onStart?.(); }}>${m === 60 ? '1h' : m + 'm'}</button>`)}
    </div>`}
    ${bell === t.id && html`<div class="rem-set">
      ${quick.map(([label, fn]) => html`<button class="btn xs" onClick=${() => remind(t.id, fn())}>${label}</button>`)}
      <input type="datetime-local" step="300" value=${t.remindAt ? local(t.remindAt) : ''} min=${local(Date.now())} aria-label="Reminder time"
        onChange=${(e) => e.target.value && remind(t.id, +new Date(e.target.value))} />
      ${t.remindAt ? html`<button class="btn xs ghost" onClick=${() => remind(t.id, null)}>No reminder</button>` : null}
    </div>`}
  </li>`;

  return html`<div class="todo">
    <form class="todo-add" onSubmit=${add}>
      <input type="text" placeholder="Add an errand…" value=${text} onInput=${(e) => setText(e.target.value)} aria-label="New errand" />
      <button class="btn sm" type="submit">+ Add</button>
    </form>
    ${todos.length ? html`<ul class="todos">${open.map(row)}${done.map(row)}</ul>` : html`<p class="muted">The scroll is blank. Jot down errands, emails, little odds and ends. Press 🔔 for a reminder or ▶ to start one now.</p>`}
    ${done.length ? html`<div class="todo-foot"><span class="muted">${open.length} left</span><button class="link" onClick=${() => setTodos((ts) => ts.filter((t) => !t.done))}>Clear ${done.length} done</button></div>` : null}
  </div>`;
}
