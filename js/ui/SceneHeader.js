import { html, useEffect, useRef, useState } from '../vendor.js';
import { PlanetScene } from '../art/planet.js';
import { avatarOf, guideOf, fandomOf } from '../fandom/index.js';
import { StudyScene } from '../art/study.js';
import { OutingScene } from '../art/outing.js';
import { focusStatus, OUTINGS, pauseFocus, resumeFocus, finishFocus, finishOuting, skipBreak, anotherRound } from '../focus.js';
import { mmss } from './Focus.js';
import { REALMS } from '../defaults.js';
import { fetchWeather, weatherKind, seasonOf, realmDateAt, sunTimes, solarAltitude, phaseName, realmClock } from '../art/sky.js';
import { store, levelFor } from '../store.js';
import { Meter, toast } from './common.js';
import { Reminders } from './Reminders.js';
import { THEMES, festiveOn } from '../art/festive.js';
import { WORLDS, worldById, unlockedWorlds, breakLine } from '../worlds.js';
import { TravelModal } from './Travel.js';

const SEASON_ICON = { spring: '🌸', summer: '☀️', autumn: '🍂', winter: '❄️' };
const WEATHER_LABEL = { clear: '☀️ Clear', partly: '🌤️ Fair', cloudy: '☁️ Cloudy', fog: '🌫️ Mist', rain: '🌧️ Rain', storm: '⛈️ Storm', snow: '🌨️ Snow' };

export function SceneHeader({ state, openQuests, onBoard, onAvatar }) {
  const ref = useRef(), sceneRef = useRef();
  const [now, setNow] = useState(new Date());
  const [weather, setWeather] = useState(null);
  const [scryOpen, setScryOpen] = useState(false);
  const [big, setBig] = useState(false); // the enlarged, full-screen focus view
  const [travel, setTravel] = useState(null); // the travel planet being visited (its id)
  const realm = REALMS[state.profile.realm] || REALMS.melbourne;
  const scry = state.scry;

  const outing = state.focus?.mode === 'outing' ? OUTINGS[state.focus.category] : null;
  const studying = !!state.focus && !outing;
  const world = studying ? worldById(state.focus.world) : null;
  const kind = world ? world.id : outing ? outing.scene : studying ? 'study' : 'meadow';
  useEffect(() => {
    const cv = ref.current;
    const sc = kind === 'meadow' ? new PlanetScene(cv) : kind === 'study' ? new StudyScene(cv) : new OutingScene(cv, kind);
    sc.big = big;
    sceneRef.current = sc; sc.start();
    // a soft fade between places
    for (const el of cv.parentElement.querySelectorAll('canvas')) el.animate?.([{ opacity: 0, filter: 'brightness(1.8) blur(2px)' }, { opacity: 1, filter: 'none' }], { duration: 650, easing: 'ease-out' });
    return () => sc.stop();
  }, [kind]);
  // enlarge: true full screen where the browser allows it, a fixed overlay otherwise
  const canBig = !!state.focus && !state.focus.logged;
  useEffect(() => { if (!canBig && big) setBig(false); }, [canBig]);
  useEffect(() => {
    const wrap = ref.current.parentElement;
    if (big && !document.fullscreenElement) wrap.requestFullscreen?.().catch(() => {});
    if (!big && document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    const sc = sceneRef.current; if (sc) { sc.big = big; requestAnimationFrame(() => sc.resize()); }
    const onFs = () => { if (!document.fullscreenElement) setBig(false); };
    const onKey = (e) => e.key === 'Escape' && setBig(false);
    document.addEventListener('fullscreenchange', onFs); addEventListener('keydown', onKey);
    return () => { document.removeEventListener('fullscreenchange', onFs); removeEventListener('keydown', onKey); };
  }, [big]);
  useEffect(() => { const id = setInterval(() => setNow(new Date()), state.focus ? 1000 : 20000); return () => clearInterval(id); }, [!!state.focus]);
  useEffect(() => { fetchWeather(realm).then(setWeather).catch(() => setWeather(null)); }, [realm.id, Math.floor(+now / 1800000)]);

  const st = sunTimes(realm, now);
  const local = (d) => (d ? (d - realmDateAt(realm, now, 0)) / 3600000 : null);
  const presets = { dawn: (local(st.rise) ?? 6) - 0.15, noon: 12.5, dusk: (local(st.set) ?? 19) + 0.1, night: 22.5 };
  const date = scry.time === 'live' ? now : realmDateAt(realm, now, presets[scry.time]);
  const season = scry.season === 'auto' ? seasonOf(realm, date) : scry.season;
  const wk = scry.weather === 'live' ? weatherKind(weather?.code, weather?.cloud) : scry.weather;
  const alt = solarAltitude(date, realm.lat, realm.lon);
  const phase = phaseName(alt, realmClock(realm, date).hour < 12);

  const fs = studying ? focusStatus(state.focus) : null;
  useEffect(() => {
    sceneRef.current?.update({
      realm, date, season, weather: wk, openQuests, worlds: WORLDS, unlocked: unlockedWorlds(state.xp).length, avatar: avatarOf(state.profile), guide: guideOf(state.profile),
      progress: fs?.progress, phase: state.focus?.pausedAt ? 'paused' : fs?.phase, books: state.library.map((b) => b.title), celebrate: !!state.focus?.doneAt, festive: festiveOn(state.profile.settings, now),
      onPurr: () => toast('🐈 Purrrr… your familiar curls up on the warm stardust'),
    });
  });
  useEffect(() => { document.body.dataset.phase = phase; }, [phase]);
  // a burst of sparkle around you whenever you earn XP (a finished quest, task or session)
  const xpSeen = useRef(state.xp);
  useEffect(() => { if (state.xp > xpSeen.current) sceneRef.current?.heal?.(); xpSeen.current = state.xp; }, [state.xp]);

  // a new travel planet appearing in the sky
  const nWorlds = unlockedWorlds(state.xp).length, wSeen = useRef(nWorlds);
  useEffect(() => { if (nWorlds > wSeen.current) { const w = unlockedWorlds(state.xp)[nWorlds - 1]; toast(`🪐 A new little planet appeared: ${w.icon} ${w.name}! Tap it in the sky to visit.`); } wSeen.current = nWorlds; }, [nWorlds]);

  const hit = (e) => sceneRef.current?.hitTest(e.clientX, e.clientY);
  const onMove = (e) => {
    sceneRef.current?.pointer?.(e.clientX, e.clientY);
    const h = hit(e);
    if (sceneRef.current) sceneRef.current.hover = h;
    e.currentTarget.style.cursor = h ? 'pointer' : 'default';
    e.currentTarget.title = !h ? '' : h.type === 'note' ? 'Open this wish' : h.type === 'board' ? 'Read the wish board' : h.type === 'cat' ? 'Pet the familiar' : h.type === 'guide' ? `Say hi to ${guideOf(state.profile).name}` : h.type === 'world' ? (h.locked ? `${worldById(h.id)?.name}: comes out of the clouds at ${worldById(h.id)?.xp} XP` : `Travel to ${worldById(h.id)?.name}`) : 'Customise your avatar';
  };
  const onClick = (e) => {
    const h = hit(e);
    if (!h) return;
    if (h.type === 'note') onBoard(h.index);
    else if (h.type === 'board') onBoard(null);
    else if (h.type === 'cat') sceneRef.current.petCat();
    else if (h.type === 'hero') onAvatar();
    else if (h.type === 'world') { if (h.locked) toast(`☁️ ${worldById(h.id).icon} ${worldById(h.id).name} is waiting in the clouds. It comes out at ${worldById(h.id).xp} XP (you have ${state.xp}) ✦`); else setTravel(h.id); }
    else if (h.type === 'guide') { const g = guideOf(state.profile); sceneRef.current.tapGuide?.(); toast(`⭐ ${g.name}: “${g.taps[Math.floor(Math.random() * g.taps.length)]}”`); }
  };
  const lv = levelFor(state.xp);
  const t = (d) => d?.toLocaleTimeString([], { timeZone: realm.tz, hour: 'numeric', minute: '2-digit' });
  const setScry = (k, v) => store.set((s) => ({ scry: { ...s.scry, [k]: v } }));

  return html`
    <header class=${'scene-wrap' + (big ? ' big' : '')}>
      <canvas ref=${ref} class="scene" onMouseMove=${onMove} onMouseLeave=${() => { if (sceneRef.current) { sceneRef.current.hover = null; sceneRef.current.pointer(null); } }} onClick=${onClick} aria-label=${outing ? `Pixel scene: ${outing.where.toLowerCase()}` : world ? `Pixel scene: ${world.where.toLowerCase()}` : studying ? 'Pixel scene of a cosy study: your avatar writing at a desk by the window' : `Pixel scene of a tiny star planet over ${realm.label}: ${season}, ${phase}, ${wk}`}></canvas>
      <div class="hud hud-left">
        ${state.profile.name ? html`<div class="hero-name">${state.profile.name}</div>`
          : html`<button class="btn xs hero-name-ask" onClick=${() => { const n = prompt(`What should ${guideOf(state.profile).name} call you?`)?.trim(); if (n) store.setProfile({ name: n.slice(0, 24) }); }}>✎ Tell us your name</button>`}
        ${outing ? html`<div class="hero-title">${state.focus.doneAt ? '✨ Quest complete!' : `${outing.icon} ${outing.where} · ${Math.max(1, Math.round((Date.now() - state.focus.startedAt) / 60000))}m`}</div>`
        : studying && state.focus.doneAt ? html`<div class="hero-title">✨ Quest complete!</div>`
        : studying ? html`<div class="hero-title">${fs.phase === 'break' ? '☕ Tea break' : fs.phase === 'done' ? '✨ Quest complete' : world ? `${world.icon} ${world.name}` : '📖 In the study'} · ${fs.phase === 'done' ? '' : mmss(fs.left)}</div>
          <${Meter} value=${fs.progress} color=${fs.phase === 'break' ? '#7ab0c0' : '#f2c14a'} label="Focus progress" />`
        : html`<div class="hero-title">${fandomOf(state.profile).title} · Lv ${lv.level}</div>
          <${Meter} value=${lv.into} max=${lv.need} color="#f2c14a" label=${`${lv.into}/${lv.need} XP to next level`} />`}
      </div>
      <div class="hud hud-right">
        <div class="clock">${realm.label} · ${t(date)}</div>
        <div class="hud-row">${SEASON_ICON[season]} ${season[0].toUpperCase() + season.slice(1)} · ${WEATHER_LABEL[wk] || wk}${weather && scry.weather === 'live' ? ` ${Math.round(weather.temp)}°` : ''}</div>
        <div class="hud-row small">🌅 ${t(st.rise) || '—'} · 🌇 ${t(st.set) || '—'}</div>
        <div class="hud-btns">
          ${canBig && html`<button class="hud-btn" onClick=${() => setBig(!big)} aria-pressed=${big}>${big ? '⤡ Shrink' : '⛶ Enlarge'}</button>`}
          ${!big && html`<button class="hud-btn" onClick=${() => setScryOpen(!scryOpen)} aria-expanded=${scryOpen}>🔭 Stargaze</button>`}
        </div>
        ${scryOpen && html`
          <div class="scry">
            <label>Hour <select value=${scry.time} onChange=${(e) => setScry('time', e.target.value)}>
              ${['live', 'dawn', 'noon', 'dusk', 'night'].map((v) => html`<option value=${v}>${v}</option>`)}</select></label>
            <label>Season <select value=${scry.season} onChange=${(e) => setScry('season', e.target.value)}>
              ${['auto', 'spring', 'summer', 'autumn', 'winter'].map((v) => html`<option value=${v}>${v}</option>`)}</select></label>
            <label>Sky <select value=${scry.weather} onChange=${(e) => setScry('weather', e.target.value)}>
              ${['live', 'clear', 'partly', 'cloudy', 'fog', 'rain', 'storm', 'snow'].map((v) => html`<option value=${v}>${v}</option>`)}</select></label>
            <label>Realm <select value=${state.profile.realm} onChange=${(e) => store.setProfile({ realm: e.target.value })}>
              ${Object.values(REALMS).map((r) => html`<option value=${r.id}>${r.label}</option>`)}</select></label>
            <label>Theme <select value=${state.profile.settings.theme || 'classic'} onChange=${(e) => store.setProfile((p) => ({ settings: { ...p.settings, theme: e.target.value } }))}>
              ${THEMES.map(([v, label]) => html`<option value=${v}>${label}</option>`)}</select></label>
          </div>`}
      </div>
      ${big && state.focus && html`<div class="big-hud">
        ${outing ? html`<div class="big-phase">${state.focus.icon} ${state.focus.title}</div>
          <div class="big-time">${state.focus.doneAt ? '✨' : `${Math.max(1, Math.round((Date.now() - state.focus.startedAt) / 60000))}m`}</div>
          ${!state.focus.doneAt && html`<div class="row"><button class="btn sm gold" onClick=${finishOuting}>✓ Mark done</button><button class="btn sm ghost" onClick=${() => setBig(false)}>⤡ Shrink</button></div>`}`
        : html`${world && fs.phase === 'break' && html`<div class="big-phase">${breakLine(world, fs.round, guideOf(state.profile).name)}</div>`}<div class="big-phase">${fs.phase === 'break' ? '☕ Tea break' : fs.phase === 'done' ? '✨ Complete' : state.focus.pausedAt ? '⏸ Paused' : `${state.focus.icon} ${state.focus.title}`}</div>
          <div class="big-time">${fs.phase === 'done' ? 'DONE' : mmss(fs.left)}</div>
          <div class="row">
            ${fs.phase === 'done' ? html`<button class="btn sm gold" onClick=${finishFocus}>✨ Claim reward</button><button class="btn sm" onClick=${anotherRound}>▶ Round ${fs.round + 1}</button>`
              : fs.phase === 'break' ? html`<button class="btn sm gold" onClick=${() => skipBreak(false)}>▶ Round ${fs.round + 1} now</button><button class="btn sm" onClick=${() => skipBreak(true)}>🫖 Save tea</button>`
              : state.focus.pausedAt ? html`<button class="btn sm gold" onClick=${resumeFocus}>▶ Resume</button>` : html`<button class="btn sm" onClick=${pauseFocus}>⏸ Pause</button>`}
            <button class="btn sm ghost" onClick=${() => setBig(false)}>⤡ Shrink</button>
          </div>`}
      </div>`}
      <${Reminders} state=${state} />
      ${travel && html`<${TravelModal} state=${state} worldId=${travel} onClose=${() => setTravel(null)} />`}
    </header>`;
}
