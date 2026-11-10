# Star Chapter · TXT Planner

A dreamy pixel planner for MOA, the new look of the Hearthside Quest Planner. It reads your calendar, finds the free stretches between engagements (after commute, meals and buffers), and offers **star quests** for them, weighed against your mood, how busy the week is, your weekly targets, training side-effects and long-term goals.

The world is a tiny star planet floating over a sea of clouds: a dome house with a telescope, a rose under a glass bell, a star lamp and the star board where today's quests are pinned. Your **star guide** (Taehyun, for now) strolls around the planet, greets you each morning and cheers you on. You are a **MOA traveller** standing by the board, fully recolourable, or swap in your own uploaded pixel sprite.

It shares its saves with the original Hearthside app (same browser storage and the same Google Drive file), so your quests, goals, to-dos and settings appear in both. Its own character choices live in a separate `fandom` field, so the original keeps its witch and owl.

## Run it

No install needed — just Python 3 (already on macOS).

```bash
python3 serve.py
```

Then open http://localhost:5174. Or double-click `start.command`.

## Pages

| Page | What it does |
|---|---|
| **Today** | Today's orbit (events, travel, meals, open time) and the star quests for the selected slot. Accept, complete or abandon quests. |
| **Week** | How busy the week is (Open Sky → Constellation), your outlook, quest balance, and a 7-day map. |
| **Star Log** | Long-term commitments: deadlines, trips with prep tasks, ongoing habits. |
| **Library** | Diary, books/shows/films, and your guide's chronicle. |
| **Settings** | Calendar & stars (Google Calendar, `.ics`, cloud save, Claude), Avatar & guide (your MOA, familiar, which member guides you), Character (every planning preference). |

## Groups and members

`js/fandom/` holds the idol-group layer. `txt.js` defines TXT: members, the Taehyun sprite and portrait, the MOA traveller and the planet's colours. Only Taehyun is drawn so far; the other members show as "coming soon". Another group can be added later as its own file listed in `GROUPS` (`js/fandom/index.js`).

## Star readings (optional)

Paste an Anthropic API key in Settings → Calendar & stars and enable it. "Ask the stars" sends that day's timeline, preferences, mood and goals to Claude (`claude-opus-5-5`), which re-ranks the engine's already-valid candidates and narrates the day in your guide's voice.

## Art

Everything is drawn procedurally: the real sun and moon (with phase) for your realm, pastel skies through the day, a violet milky way at night, shooting stars, live weather from Open-Meteo and seasons on the planet's grass. Use **🔭 Stargaze** to preview any hour, season or weather.

## Data

Saved in your browser's localStorage (key `questplanner.v1`, shared with Hearthside). Use Character → Export save to back it up.
