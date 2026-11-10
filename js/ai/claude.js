// Optional "Oracle": Claude re-ranks the rule engine's candidates and writes the story.
// It may only choose from candidates the engine already checked for time, travel and showers.
import { fmtTime, fmtDur } from '../time.js';
import { placeName } from '../engine/plan.js';
import { store } from '../store.js';
import { guideOf, groupOf } from '../fandom/index.js';

// Speak as the player's chosen star guide (a member of their group, Taehyun by default).
function persona(text) {
  const p = store.get().profile, g = guideOf(p), grp = groupOf(p);
  return text.replace(/\{GUIDE\}/g, g.name).replace(/\{GROUP\}/g, grp.name).replace(/\{FANDOM\}/g, grp.fandom);
}

const SDK = 'https://esm.sh/@anthropic-ai/sdk@0.39.0';

const SYSTEM = `You are the star guide of a dreamy, starlit pixel day planner (little planets, wishes, destiny). The player's free time slots are "quests".
For each open slot you receive candidate activities that already fit the slot (duration, travel, wash-up time).
Pick up to 3 candidates per slot, best first, and give each a short quest title (max 5 words), one sentence of dreamy, starry flavour, and one plain-language sentence explaining why it suits the player right now.
Balance the whole day and week: respect energy and mood, avoid stacking hard training, protect rest in busy weeks, keep long-term goals moving, and remember training affects later plans (showers, sleep, big events tomorrow).
Only use candidateKey values given for that slot. Also write a 2-3 sentence narration for the day in the voice of {GUIDE}, the player's friendly star guide (a fan-made character inspired by {GUIDE} of {GROUP}; the player is a {FANDOM}). Address the player by name: friendly, clever, quietly encouraging, a little playful. Keep it wholesome and casual, like a friend (no pet names such as "dear", nothing gushy or romantic) and never claim to be the real person. Never recite hours, free time, or how many quests there are — the planner already shows those.`;

const SCHEMA = {
  type: 'object', additionalProperties: false, required: ['narration', 'slots'],
  properties: {
    narration: { type: 'string' },
    slots: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['slotId', 'quests'], properties: {
      slotId: { type: 'string' },
      quests: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['candidateKey', 'title', 'flavor', 'why'], properties: {
        candidateKey: { type: 'string' }, title: { type: 'string' }, flavor: { type: 'string' }, why: { type: 'string' },
      } } },
    } } },
  },
};

export function buildOracleContext(state, dayPlan, week, offers, mood, weekMood) {
  const p = state.profile;
  return {
    player: { name: p.name || 'MOA', title: p.title, realm: p.realm, wake: p.day.wake, sleep: p.day.sleep, travel: p.travelMode },
    preferences: p.activities.filter((a) => a.enabled !== false).map((a) => ({ name: a.name, category: a.category, liking: a.weight, weeklyTarget: a.weeklyTarget, intensity: a.intensity })),
    mood, weekOutlook: weekMood.outlook || 'unknown',
    week: { level: week.level.name, avgLoad: Math.round(week.avgLoad * 100) + '%', days: week.days.map((d) => ({ day: d.date.toLocaleDateString('en', { weekday: 'short' }), busy: fmtDur(d.busy), free: fmtDur(d.free) })) },
    goals: p.goals.filter((g) => !g.done).map((g) => ({ title: g.title, type: g.type, due: g.due, hoursLeft: g.type === 'deadline' ? g.hoursNeeded - g.hoursDone : undefined })),
    date: dayPlan.date.toDateString(),
    timeline: dayPlan.items.filter((i) => i.kind !== 'slot').map((i) => ({ kind: i.kind, title: i.title || `${placeName(p, i.from)} → ${placeName(p, i.to)}`, start: fmtTime(i.start), end: fmtTime(i.end) })),
    slots: Object.values(offers).filter((o) => !o.past).map(({ slot, ranked }) => ({
      slotId: slot.id, start: fmtTime(slot.start), end: fmtTime(slot.end), at: placeName(p, slot.from), next: slot.next?.title || null,
      candidates: ranked.slice(0, 8).map((r) => ({ candidateKey: r.key, name: r.c.name, category: r.c.category, minutes: r.minutes, engineScore: +r.score.toFixed(2), notes: r.reasons.map((x) => x.t) })),
    })),
  };
}

export async function consultOracle(apiKey, context) {
  const { default: Anthropic } = await import(SDK);
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const res = await client.beta.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
    system: persona(SYSTEM),
    messages: [{ role: 'user', content: JSON.stringify(context) }],
  });
  if (res.stop_reason === 'refusal') throw new Error('The Oracle declined to read the stars for this day.');
  if (res.stop_reason === 'max_tokens') throw new Error('The Oracle was cut off mid-prophecy — try again.');
  const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  return JSON.parse(text);
}

const CHRONICLE = `You are {GUIDE}, the player's friendly star guide in a dreamy, starlit pixel planner (a fan-made character inspired by {GUIDE} of {GROUP}; the player is a {FANDOM}). Keep it wholesome and never claim to be the real person.
Write a short chronicle (120-200 words) of the given period in second person, like a fond letter written under the stars.
Weave in real highlights from their diary entries, what they read or watched, and the quests they completed. Be encouraging and specific; never invent events that are not in the data.
Plain prose paragraphs only — no headings or lists.`;

export async function writeChronicle(apiKey, payload) {
  const { default: Anthropic } = await import(SDK);
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const res = await client.beta.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium' },
    system: persona(CHRONICLE),
    messages: [{ role: 'user', content: JSON.stringify(payload) }],
  });
  if (res.stop_reason === 'refusal') throw new Error('The oracle could not write this chronicle.');
  return res.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
}
