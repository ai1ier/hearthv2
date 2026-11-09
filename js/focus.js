// Focus sessions: starting a quest turns the meadow into the study and runs a timer.
// Training, fellowship, wilds and homestead quests are "outings" instead: their own scene,
// no timer, just a button to mark them done. The session lives in the store, so a reload
// picks up where you left off.
import { store } from './store.js';
import { toast } from './ui/common.js';
import { completeQuest } from './actions.js';
import { questXP } from './engine/suggest.js';
import { HERE } from './engine/plan.js';
import { iso } from './time.js';

const MIN = 60000;
export const POMOS = { '25/5': { focus: 25, rest: 5 }, '50/10': { focus: 50, rest: 10 } };
// the session's pomodoro rhythm, or null (older sessions stored `true` for 25/5)
export const pomoOf = (f) => (f.pomodoro === true ? POMOS['25/5'] : POMOS[f.pomodoro] || null);
// category -> the scene shown while you are out on that quest
export const OUTINGS = {
  fitness: { scene: 'training', where: 'At the training grounds', icon: '🏃' },
  social: { scene: 'tavern', where: 'At the Lantern Tavern', icon: '🍻' },
  outdoors: { scene: 'woods', where: 'In the wild woods', icon: '🌲' },
  chores: { scene: 'cottage', where: 'Tending the cottage', icon: '🧹' },
};

// minutes the session has been running, not counting pauses
const elapsed = (f, now = Date.now()) => Math.max(0, (now - f.startedAt - f.pausedMs - (f.pausedAt ? now - f.pausedAt : 0)) / MIN);

// Walks the session forward from its last turning point (`f.anchor`: a skipped or saved tea
// break, a tea break taken from the jar, another round, a change of rhythm) to now:
// focus rounds and tea breaks take turns until the focus minutes are used up.
export function focusStatus(f, now = Date.now()) {
  const el = elapsed(f, now);
  const P = pomoOf(f) || { focus: Infinity, rest: 0 };
  const a = f.anchor || { at: 0, focused: 0, phase: 'focus', round: 1 };
  let t = a.at, focused = a.focused, phase = a.phase, round = a.round, len = a.len ?? null;
  const done = () => ({ focused: Math.min(focused, f.minutes), phase: 'done', left: 0, progress: 1, round, el });
  for (let i = 0; i < 1000; i++) {
    if (phase === 'focus') {
      const L = Math.min(len ?? P.focus, f.minutes - focused);
      if (L <= 0) return done();
      if (el < t + L) { focused += el - t; return { focused, phase, left: t + L - el, progress: focused / f.minutes, round, el }; }
      focused += L; t += L; len = null;
      if (focused >= f.minutes - 1e-6 || !P.rest) return done();
      phase = 'break';
    } else {
      const L = len ?? P.rest;
      if (el < t + L) return { focused, phase, left: t + L - el, progress: focused / f.minutes, round, el };
      t += L; len = null; phase = 'focus'; round += 1;
    }
  }
  return done();
}
const reanchor = (f, st, patch) => ({ anchor: { at: st.el, focused: Math.min(st.focused, f.minutes), phase: 'focus', round: st.round, ...patch } });

// Start (or restart) an accepted quest now. `mode` forces the study (or an outing) regardless of category.
export function startFocus(questId, mode = null) {
  const s = store.get();
  if (s.focus) { toast('Finish or end your current quest first'); return; }
  const q = s.quests.find((x) => x.id === questId);
  if (!q) return;
  const now = Date.now();
  store.set((st) => ({
    quests: st.quests.map((x) => (x.id === questId ? { ...x, start: new Date(now).toISOString(), end: new Date(now + (x.minutes + (x.shower || 0)) * MIN).toISOString(), date: iso(new Date(now)) } : x)),
    focus: { questId, title: q.title, icon: q.icon, category: q.category, goalId: q.goalId, itemId: q.itemId, minutes: q.minutes, startedAt: now, pausedAt: null, pausedMs: 0, pomodoro: q.minutes >= 100 ? '50/10' : q.minutes >= 50 ? '25/5' : false, notes: '', mode: mode || (OUTINGS[q.category] ? 'outing' : 'study') },
  }));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// An errand from the scroll, done now at the study desk; finishing it ticks the errand off.
export function startErrand(todo, mins) {
  if (store.get().focus) { toast('Finish or end your current focus first'); return; }
  const now = Date.now();
  const q = {
    id: `q-${now.toString(36)}`, date: iso(new Date(now)), start: new Date(now).toISOString(), end: new Date(now + mins * MIN).toISOString(),
    title: todo.text, flavor: 'Errand', icon: '📜', category: 'chores', activityId: null, goalId: null, itemId: null, todoId: todo.id,
    place: HERE, intensity: 0, sweat: false, minutes: mins, shower: 0, xp: questXP(mins), done: false,
  };
  store.set((s) => ({ quests: [...s.quests, q] }));
  startFocus(q.id, 'study');
}

// A study session straight from a long-term goal (or one of its prep tasks).
export function startGoalSession(goal, item = null, minutes = null) {
  if (store.get().focus) { toast('Finish or end your current focus first'); return; }
  const mins = minutes || item?.minutes || goal.sessionMin || 45;
  const now = Date.now();
  const q = {
    id: `q-${now.toString(36)}`, date: iso(new Date(now)), start: new Date(now).toISOString(), end: new Date(now + mins * MIN).toISOString(),
    title: item ? item.text : goal.type === 'deadline' ? `Study: ${goal.title}` : goal.title, flavor: item ? (goal.type === 'event' ? 'Preparation' : goal.title) : 'Main Quest',
    icon: goal.type === 'event' ? '🧭' : goal.type === 'deadline' ? '✍️' : '🌱', category: 'main', activityId: goal.linkedActivityId || null, goalId: goal.id, itemId: item?.id || null,
    place: HERE, intensity: 0, sweat: false, minutes: mins, shower: 0, xp: questXP(mins, 0, true), done: false,
  };
  store.set((s) => ({ quests: [...s.quests, q] }));
  startFocus(q.id);
}

const patch = (p) => store.set((s) => (s.focus ? { focus: { ...s.focus, ...(typeof p === 'function' ? p(s.focus) : p) } } : {}));
export const pauseFocus = () => patch({ pausedAt: Date.now() });
export const resumeFocus = () => patch((f) => ({ pausedAt: null, pausedMs: f.pausedMs + (Date.now() - f.pausedAt) }));
export const extendFocus = (m = 5) => patch((f) => {
  const st = focusStatus(f);
  // once a session is done the clock has kept running, so the extra minutes start from now
  return st.phase === 'done' ? { minutes: f.minutes + m, ...reanchor(f, st, { round: st.round + 1 }) } : { minutes: f.minutes + m };
});
// "another round": one more focus round of the session's rhythm (25 minutes without one)
export const anotherRound = () => extendFocus(pomoOf(store.get().focus || {})?.focus || 25);
export const setPomodoro = (kind) => patch((f) => ({ pomodoro: POMOS[kind] ? kind : false, ...reanchor(f, focusStatus(f)) }));
// end a tea break early and go straight into the next round; `save` keeps the leftover tea for later
export const skipBreak = (save) => patch((f) => {
  const st = focusStatus(f);
  if (st.phase !== 'break') return {};
  return { ...reanchor(f, st, { round: st.round + 1 }), teaSaved: save ? (f.teaSaved || 0) + st.left : f.teaSaved || 0 };
});
// take the saved-up tea now (the next focus round starts fresh afterwards)
export const takeSavedTea = () => patch((f) => {
  const st = focusStatus(f);
  if (st.phase !== 'focus' || !f.teaSaved) return {};
  return { ...reanchor(f, st, { phase: 'break', len: f.teaSaved }), teaSaved: 0 };
});
export const setNotes = (notes) => patch({ notes });

export function finishFocus() {
  const f = store.get().focus;
  if (!f) return;
  const st = focusStatus(f);
  const mins = Math.max(1, Math.round(st.focused));
  const q = store.get().quests.find((x) => x.id === f.questId);
  store.set((s) => ({
    focus: null,
    quests: s.quests.map((x) => (x.id === f.questId ? { ...x, minutes: mins, end: new Date(new Date(x.start).getTime() + mins * MIN).toISOString(), xp: questXP(mins, x.intensity, x.category === 'main') } : x)),
    diary: f.notes.trim() ? [...s.diary, { id: 'd' + Date.now().toString(36), date: iso(new Date()), text: `${f.icon} ${f.title} (${mins}m): ${f.notes.trim()}`, at: Date.now() }] : s.diary,
  }));
  if (q) completeQuest(f.questId);
}

// Outings: mark done, let the scene celebrate for a moment, then head home to the meadow.
export function finishOuting() {
  const f = store.get().focus;
  if (!f || f.doneAt) return;
  const q = store.get().quests.find((x) => x.id === f.questId);
  store.set((s) => ({
    focus: { ...s.focus, doneAt: Date.now() },
    quests: s.quests.map((x) => (x.id === f.questId ? { ...x, notes: f.notes } : x)),
    diary: f.notes.trim() ? [...s.diary, { id: 'd' + Date.now().toString(36), date: iso(new Date()), text: `${f.icon} ${f.title}: ${f.notes.trim()}`, at: Date.now() }] : s.diary,
  }));
  if (q) completeQuest(f.questId);
  setTimeout(() => { if (store.get().focus?.doneAt) store.set({ focus: null }); }, 3200);
}

// Logging a quest after the fact: mark it done and play its scene's little celebration,
// just like setting out on it.
export function celebrateQuest(questId) {
  const s = store.get(), q = s.quests.find((x) => x.id === questId);
  if (!q) return;
  completeQuest(questId);
  if (s.focus) return; // a session is running; the toast will do
  const now = Date.now();
  store.set({ focus: { questId, title: q.title, icon: q.icon, category: q.category, minutes: q.minutes, startedAt: now, pausedAt: null, pausedMs: 0, pomodoro: false, notes: '', mode: OUTINGS[q.category] ? 'outing' : 'study', doneAt: now, logged: true } });
  window.scrollTo({ top: 0, behavior: 'smooth' });
  setTimeout(() => { if (store.get().focus?.logged) store.set({ focus: null }); }, 3600);
}

export function endFocus() { store.set({ focus: null }); toast('The quest waits for you on the road'); }
