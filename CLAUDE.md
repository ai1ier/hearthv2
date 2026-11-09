# Planner v2: notes for Claude

This folder is a copy of the **Hearthside Quest Planner** (the original lives in `../00hearth`, made 9 Nov 2026).
The goal here is a **new version in a totally different style and theme**, while sharing the same planner data
as the original. Keep the engine and data; restyle everything you see.

## How the app is built
- No build step: Preact + htm loaded from `js/vendor.js`, plain ES modules, one `styles.css`.
- Hosted on GitHub Pages. The user uploads files by drag-and-drop to GitHub, so after each round list the
  files that changed (and call out any new files, which must be uploaded or the app won't load).
- `js/engine/` (plan.js builds each day's road: events, travel, meals, open slots; suggest.js scores quests;
  index.js assembles views and narration), `js/store.js` (state + localStorage), `js/cloud.js` (Google Drive
  save), `js/calendar/` (Google Calendar, .ics, demo data), `js/focus.js` (pomodoro/study sessions),
  `js/actions.js` (accept/complete quests).
- Look and theme: `js/ui/*` (components), `styles.css`, `js/art/*` (pixel scenes painted on canvas: meadow
  `scene.js`, study `study.js`, outings `outing.js`, Christmas extras `festive.js`, sprites `sprites.js`),
  `js/ui/icons.js` (pixel icons). These are free to redesign or replace.

## The data contract: do not break it
Both versions read and write the same saves, so the user's quests, goals, to-dos and settings appear in either one.
- localStorage key `questplanner.v1` (`js/store.js`). On GitHub Pages both repos share the origin
  `<user>.github.io`, so they share this storage.
- Drive save file `hearthside-save.json` in the app-data folder (`js/cloud.js`), tied to the Google client ID in
  `js/config.js`. Keep that ID so both versions sync the same save.
- Keep the shape of the saved state (see `fresh()` in `js/store.js`: profile, quests, todos, moods, weekMoods,
  diary, library, awake, mealTimes, focus, xp, …). You can **add** new optional fields (with defaults in
  `fresh()`), but don't rename, remove or change the meaning of existing ones, or the original app breaks.
- If v2 truly needs a different format, stop sharing on purpose: change BOTH the localStorage key (e.g.
  `questplanner.v2`) and the Drive file name. Ask the user first.
- Never upload the Claude API key in cloud saves (cloud.js strips `settings.claudeKey`).

## Running and testing
- `python3 serve.py` serves this copy on port **5174** (the original uses 5173). Use the Browser pane on
  `http://127.0.0.1:5174`. That origin starts empty, so the demo data loads.
- The user's real data is at `localhost:5173` / their GitHub Pages site. Never touch it.
- Before changing demo data, back it up: `sessionStorage.bak = localStorage.getItem('questplanner.v1')`, and
  restore it afterwards.
- Google sign-in only works on origins listed in the Google OAuth client. `localhost:5174` isn't listed yet,
  so sign-in won't work locally until the user adds it (GitHub Pages already works).
- `node` isn't installed; check things in the browser. Pane screenshots can lag, so check state with JS too.
- Check phone width (375 px): no sideways scroll.

## Things to change for a separate app identity
`manifest.webmanifest` (name, short_name, colours, icons in `icons/`), `<title>` and meta in `index.html`,
the `CACHE` name in `sw.js`, `README.md`. Without this, both versions installed on a phone look identical.

## User preferences learned so far
- Light-hearted, positive wording throughout; nothing that feels stressful (e.g. the busy-week bar uses calm
  colours and names like "bounty", not "burden").
- They like detailed pixel-art touches, but visible things must not cover buttons or text.
- The owner of uploaded avatar art decides where it goes. Don't move images between slots without asking.
