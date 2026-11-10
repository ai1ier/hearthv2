// The travel planets: little worlds floating behind the home planet. Tap one to focus there,
// on any task (or a free session), with your guide along. They appear one by one as you earn XP
// (nothing is ever taken away), and every finished session sends home a postcard.
import { store } from './store.js';
import { startFocus } from './focus.js';
import { questXP } from './engine/suggest.js';
import { HERE } from './engine/plan.js';
import { iso } from './time.js';
import { toast } from './ui/common.js';

// `look` colours the little planet in the sky: [body, light side, accent]
export const WORLDS = [
  {
    id: 'forest', name: 'Moonglow Forest', icon: '🌲', xp: 0, where: 'In the Moonglow Forest',
    blurb: 'A secluded, enchanted world where we find belonging: our own Neverland.', look: ['#3f7a74', '#7cc8a8', '#c8f4a8'],
    breaks: ['{g} stretches up toward the treetops. Reach up high together!', 'The fireflies are dancing. Take three slow breaths with {g}.', '{g} is counting glowing ferns. Rest your eyes on something green for a moment.'],
  },
  {
    id: 'pool', name: 'Summer Pool', icon: '🏊', xp: 60, where: 'By the summer pool',
    blurb: 'A pocket of paradise in a crumbling world, where we find freedom and happiness.', look: ['#e8b84a', '#ffe08a', '#7ac8e8'],
    breaks: ['{g} is splashing about. Have a sip of water too!', 'Roll your shoulders back like {g} floating in the pool.', '{g} waves from the water. Stand up and shake out your legs!'],
  },
  {
    id: 'park', name: 'Blue Hour Fair', icon: '🎡', xp: 160, where: 'At the Blue Hour Fair',
    blurb: 'A fleeting playground that opens only at blue hour, where we treasure the last carefree moments of youth.', look: ['#4a5ab8', '#8aa0f0', '#ffd27a'],
    breaks: ['{g} bought you cotton candy. Treat yourself to a little snack!', 'Ride the Ferris wheel with {g}: look out a window for a minute.', '{g} is dancing to the carousel music. Wiggle along!'],
  },
  {
    id: 'sanctuary', name: 'Star Sanctuary', icon: '☂️', xp: 320, where: 'In the Star Sanctuary',
    blurb: 'Not a place beyond reality, but a connection worth staying for: a promise to face tomorrow together.', look: ['#9ab4e8', '#eef2ff', '#ffe6a8'],
    breaks: ['{g} opens both arms wide in the quiet hall. Open yours and stretch!', 'Listen to the hush with {g}: close your eyes for ten slow seconds.', '{g} twirls an umbrella. Stand up and turn around once!'],
  },
];
export const worldById = (id) => WORLDS.find((w) => w.id === id) || null;
export const unlockedWorlds = (xp) => WORLDS.filter((w) => (xp || 0) >= w.xp);
export const nextWorld = (xp) => WORLDS.find((w) => (xp || 0) < w.xp) || null;
// a break prompt for this session's break round, with the guide's name in it
export const breakLine = (w, round, guideName) => w.breaks[(round - 1) % w.breaks.length].replaceAll('{g}', guideName);

const MIN = 60000;

// Focus on a world: on one of your accepted quests, or a free session of `minutes`.
export function startWorldSession(worldId, questId = null, minutes = 25) {
  const w = worldById(worldId);
  if (!w) return;
  if (store.get().focus) { toast('Finish or end your current focus first'); return; }
  let id = questId;
  if (!id) {
    const now = Date.now();
    const q = {
      id: `q-${now.toString(36)}`, date: iso(new Date(now)), start: new Date(now).toISOString(), end: new Date(now + minutes * MIN).toISOString(),
      title: `Focus time ${w.icon}`, flavor: w.name, icon: w.icon, category: 'learning', activityId: null, goalId: null, itemId: null,
      place: HERE, intensity: 0, sweat: false, minutes, shower: 0, xp: questXP(minutes), done: false,
    };
    store.set((s) => ({ quests: [...s.quests, q] }));
    id = q.id;
  }
  startFocus(id, 'study');
  // `free`: a free session made just for this trip (ending it early tidies its quest away)
  store.set((s) => (s.focus ? { focus: { ...s.focus, world: w.id, ...(questId ? {} : { free: true }) } } : {}));
}

// where a session took place, for its postcard
export const placeOf = (f, outings) => f.world || (f.mode === 'outing' ? outings[f.category]?.scene || 'outing' : 'study');
export const PLACE_LABEL = { study: '📖 The study', training: '💃 The practice room', tavern: '☕ The Starlight Café', woods: '🌟 The star garden', cottage: '🧹 The dome house' };
export const placeLabel = (p) => (worldById(p) ? `${worldById(p).icon} ${worldById(p).name}` : PLACE_LABEL[p] || '✨ Somewhere starry');

// a postcard for a finished session (kept to the latest 300)
export function postcardFor(f, minutes, place, guideId) {
  return { id: 'pc-' + Date.now().toString(36), place, title: f.title, icon: f.icon, minutes, at: Date.now(), guide: guideId || null };
}
export const addPostcard = (s, card) => ({ postcards: [...(s.postcards || []), card].slice(-300) });
