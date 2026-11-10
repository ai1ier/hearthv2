// To-do reminders: rings when one comes due and pins a note over the scene (meadow, study or
// outing) until it's ticked off, snoozed or dismissed. Rung reminders survive a reload.
import { html, useEffect } from '../vendor.js';
import { store } from '../store.js';
import { reminderBell } from '../ambience.js';
import { fmtTime, sameDay, addDays } from '../time.js';
import { toast } from './common.js';

const patchTodo = (id, patch) => store.set((s) => ({ todos: (s.todos || []).map((t) => (t.id === id ? { ...t, ...patch } : t)) }));

export const setReminder = (id, at) => {
  patchTodo(id, { remindAt: at, rang: false });
  // ask once, so reminders can also reach you while the planner is in another tab
  if (at && 'Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
};

// "3:30 PM", "Tomorrow 9:00 AM" or "Tue 4 Nov 9:00 AM"
export function whenLabel(ms) {
  const d = new Date(ms), now = new Date();
  if (sameDay(d, now)) return fmtTime(d);
  if (sameDay(d, addDays(now, 1))) return `Tomorrow ${fmtTime(d)}`;
  return `${d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })} ${fmtTime(d)}`;
}

function check() {
  const due = (store.get().todos || []).filter((t) => t.remindAt && !t.done && !t.rang && t.remindAt <= Date.now());
  if (!due.length) return;
  store.set((s) => ({ todos: s.todos.map((t) => (due.some((d) => d.id === t.id) ? { ...t, rang: true } : t)) }));
  for (const t of due) toast(`🔔 Reminder: ${t.text}`); // in case the scene is scrolled out of view
  try { reminderBell(); } catch { /* sound blocked until the page is clicked */ }
  if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
    for (const t of due) new Notification('🔔 Star Chapter reminder', { body: t.text, icon: 'icons/icon-192.png', tag: t.id });
  }
}

export function Reminders({ state }) {
  useEffect(() => { check(); const id = setInterval(check, 5000); return () => clearInterval(id); }, []);
  const ringing = (state.todos || []).filter((t) => t.rang && t.remindAt && !t.done);
  if (!ringing.length) return null;
  return html`<div class="reminders" role="alert">
    ${ringing.map((t) => html`<div class="reminder" key=${t.id}>
      <span class="pin"></span>
      <div class="rem-head">🔔 Reminder <small>${whenLabel(t.remindAt)}</small></div>
      <b>${t.text}</b>
      <div class="row">
        <button class="btn xs gold" onClick=${() => patchTodo(t.id, { done: true, doneAt: Date.now(), rang: false, remindAt: null })}>✓ Done</button>
        <button class="btn xs" onClick=${() => patchTodo(t.id, { remindAt: Date.now() + 10 * 60000, rang: false })}>Snooze 10m</button>
        <button class="btn xs ghost" onClick=${() => patchTodo(t.id, { rang: false, remindAt: null })}>Dismiss</button>
      </div>
    </div>`)}
  </div>`;
}
