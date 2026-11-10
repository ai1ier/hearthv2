import { html, render, useState, useEffect, useMemo } from './vendor.js';
import { guideOf } from './fandom/index.js';
import { store, useStore } from './store.js';
import { iso, startOfDay, sameDay } from './time.js';
import { computeDay } from './engine/index.js';
import { buildOracleContext, consultOracle } from './ai/claude.js';
import { SceneHeader } from './ui/SceneHeader.js';
import { Checkin } from './ui/Checkin.js';
import { Today } from './ui/Today.js';
import { Week } from './ui/Week.js';
import { QuestLog } from './ui/QuestLog.js';
import { Library } from './ui/Library.js';
import { Character } from './ui/Character.js';
import { Scrolls } from './ui/Scrolls.js';
import { AvatarStudio } from './ui/Avatar.js';
import { BoardModal } from './ui/BoardModal.js';
import { Toasts, toast } from './ui/common.js';
import { useCloud, syncNow } from './cloud.js';
import { PixelIcon, setFestiveIcons } from './ui/icons.js';
import { FocusPanel } from './ui/Focus.js';
import { festiveOn } from './art/festive.js';

const TABS = [
  { id: 'today', label: 'Today', icon: 'candle' },
  { id: 'week', label: 'Week', icon: 'map' },
  { id: 'log', label: 'Star Log', icon: 'scroll' },
  { id: 'library', label: 'Library', icon: 'books' },
];
const SETTINGS = [
  { id: 'scrolls', label: 'Calendar & stars', icon: 'star' },
  { id: 'avatar', label: 'Avatar & guide', icon: 'hat' },
  { id: 'char', label: 'Character', icon: 'hero' },
];
const parseHash = () => {
  const [t, sub] = location.hash.slice(1).split(':');
  if (t === 'settings') return { tab: 'settings', sub: SETTINGS.some((x) => x.id === sub) ? sub : SETTINGS[0].id };
  return { tab: TABS.some((x) => x.id === t) ? t : 'today', sub: null };
};

function App() {
  const state = useStore();
  const [route, setRoute] = useState(parseHash);
  const { tab, sub } = route;
  const go = (t, s = null) => setRoute({ tab: t, sub: t === 'settings' ? s || sub || SETTINGS[0].id : null });
  const [day, setDay] = useState(() => startOfDay(new Date()));
  const [sel, setSel] = useState(null);
  const [board, setBoard] = useState(null); // null = closed, else { focus }
  const [minute, setMinute] = useState(0);
  const [checkin, setCheckin] = useState(() => !store.get().moods[iso(new Date())]);
  const [oracleBusy, setOracleBusy] = useState(false);

  useEffect(() => { const id = setInterval(() => setMinute((m) => m + 1), 60000); return () => clearInterval(id); }, []);
  // note when you're first up and about each day, so an early start shows on the road
  useEffect(() => {
    const mark = () => {
      const now = new Date(), key = iso(now);
      if (document.hidden || now.getHours() < 4 || store.get().awake?.[key]) return;
      const keep = Object.entries(store.get().awake || {}).filter(([k]) => k >= iso(new Date(+now - 14 * 86400000)));
      store.set({ awake: Object.fromEntries([...keep, [key, +now]]) });
    };
    mark();
    const evs = ['pointerdown', 'keydown', 'visibilitychange'];
    evs.forEach((e) => document.addEventListener(e, mark, { passive: true }));
    return () => evs.forEach((e) => document.removeEventListener(e, mark));
  }, []);
  useEffect(() => { history.replaceState(null, '', '#' + (tab === 'settings' ? `settings:${sub}` : tab)); }, [tab, sub]);
  useEffect(() => {
    const f = () => setRoute(parseHash());
    addEventListener('hashchange', f); return () => removeEventListener('hashchange', f);
  }, []);

  useEffect(cursorGlow, []);
  const festive = festiveOn(state.profile.settings);
  setFestiveIcons(festive);
  useEffect(() => { document.body.dataset.theme = festive ? 'christmas' : ''; }, [festive]);

  const events = store.events();
  const data = useMemo(() => computeDay(state, events, day), [state, events, iso(day), minute]);
  const todayData = useMemo(() => (sameDay(day, new Date()) ? data : computeDay(state, events, new Date())), [data, state, events, minute]);
  const openToday = todayData.dayPlan.slots.filter((s) => !s.past).length;
  const offersFor = (d) => (sameDay(d.date, day) ? data.offers : computeDay(state, events, d.date).offers);

  const openSlot = (id) => { setBoard(null); setDay(startOfDay(new Date())); setSel(id); go('today'); };

  const oracle = async () => {
    setOracleBusy(true);
    try {
      const ctx = buildOracleContext(state, data.dayPlan, data.week, data.offers, data.ctx.mood, data.ctx.weekMood);
      const reading = await consultOracle(state.profile.settings.claudeKey, ctx);
      store.set((s) => ({ oracle: { ...s.oracle, [data.dayPlan.key]: { ...reading, at: Date.now() } } }));
      toast(`✨ ${guideOf(store.get().profile).name} has read the stars`);
    } catch (e) { toast(`Stars: ${e.message}`); }
    setOracleBusy(false);
  };

  return html`
    <${SceneHeader} state=${state} openQuests=${openToday}
      onBoard=${(i) => { const s = todayData.dayPlan.slots.filter((x) => !x.past)[i]; if (s) openSlot(s.id); else setBoard({ focus: null }); }}
      onAvatar=${() => go('settings', 'avatar')} />
    <nav class="tabs" role="tablist">
      ${TABS.map((t) => html`<button role="tab" aria-selected=${tab === t.id} class=${'tab' + (tab === t.id ? ' on' : '')} onClick=${() => go(t.id)}><${PixelIcon} name=${t.icon} /> ${t.label}</button>`)}
      <button role="tab" aria-selected=${tab === 'settings'} class=${'tab gear' + (tab === 'settings' ? ' on' : '')} onClick=${() => go('settings')} aria-label="Settings"><${PixelIcon} name="gear" /> Settings</button>
    </nav>
    ${festive && html`<div class="xmas-bush" aria-hidden="true"></div>`}
    <main>
      <${CloudBanner} />
      ${state.focus && html`<${FocusPanel} state=${state} />`}
      ${tab === 'today' && html`<${Today} state=${state} data=${data} day=${day} setDay=${(d) => setDay(startOfDay(d))} sel=${sel} setSel=${setSel} onCheckin=${() => setCheckin(true)} onOracle=${oracle} oracleBusy=${oracleBusy} />`}
      ${tab === 'week' && html`<${Week} state=${state} events=${events} week=${data.week} day=${day} setDay=${(d) => setDay(startOfDay(d))} offersFor=${offersFor} onPickDay=${(d) => { setDay(startOfDay(d)); go('today'); }} />`}
      ${tab === 'log' && html`<${QuestLog} state=${state} />`}
      ${tab === 'library' && html`<${Library} state=${state} />`}
      ${tab === 'settings' && html`
        <div class="subtabs">${SETTINGS.map((t) => html`<button class=${'btn sm' + (sub === t.id ? ' on' : '')} onClick=${() => go('settings', t.id)}><${PixelIcon} name=${t.icon} size=${18} /> ${t.label}</button>`)}</div>
        ${sub === 'avatar' && html`<${AvatarStudio} state=${state} />`}
        ${sub === 'char' && html`<${Character} state=${state} />`}
        ${sub === 'scrolls' && html`<${Scrolls} state=${state} />`}`}
    </main>
    <footer class="foot">Star Chapter · a MOA’s pixel planner · your data stays in this browser and, if you choose, your own Google Drive</footer>
    ${board && html`<${BoardModal} state=${state} data=${todayData} focus=${board.focus} onOpen=${openSlot} onClose=${() => setBoard(null)} />`}
    ${checkin && html`<${Checkin} state=${state} week=${todayData.week} onClose=${() => setCheckin(false)} />`}
    <${Toasts} />`;
}

// a gentle nudge when cloud saving is on but Google needs a click to carry on
function CloudBanner() {
  const c = useCloud();
  if (!['signin', 'paused', 'error'].includes(c.state)) return null;
  const go = async () => { try { await syncNow(); } catch (e) { toast(`Google: ${e.message}`); } };
  return html`<div class="cloud-banner" role="status">
    <span>${c.state === 'signin' ? '☁️ Cloud save is waiting — sign in to keep your progress backed up.' : c.state === 'paused' ? '☁️ Cloud save is paused: this device and your Drive have different saves.' : `☁️ Cloud save hit a snag: ${c.msg}`}</span>
    <button class="btn xs gold" onClick=${go}>${c.state === 'signin' ? 'Sign in with Google' : c.state === 'paused' ? 'Choose a save' : 'Try again'}</button>
  </div>`;
}

render(html`<${App} />`, document.getElementById('app'));

// A soft glow that drifts after the cursor behind the planner (only with a mouse or trackpad):
// it eases towards the pointer, breathes a little, and fades out when the pointer leaves.
function cursorGlow() {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const el = document.createElement('div');
  el.className = 'cursor-glow'; el.setAttribute('aria-hidden', 'true');
  document.body.appendChild(el);
  let tx = innerWidth / 2, ty = innerHeight / 3, x = tx, y = ty, raf = 0;
  const step = () => {
    x += (tx - x) * 0.14; y += (ty - y) * 0.14;
    el.style.transform = `translate(${x}px, ${y}px)`;
    raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.5 ? requestAnimationFrame(step) : 0;
  };
  const move = (e) => { tx = e.clientX; ty = e.clientY; el.classList.add('on'); if (!raf) raf = requestAnimationFrame(step); };
  const leave = () => el.classList.remove('on');
  addEventListener('pointermove', move, { passive: true });
  document.documentElement.addEventListener('pointerleave', leave);
  return () => { removeEventListener('pointermove', move); document.documentElement.removeEventListener('pointerleave', leave); cancelAnimationFrame(raf); el.remove(); };
}
