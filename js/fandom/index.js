// The idol-group layer. v2 keeps its own character choices in `profile.fandom`
// ({ group, guide, avatar }), so the original Hearthside app keeps its witch and owl untouched.
// To add a group later: write js/fandom/<group>.js like txt.js and list it in GROUPS.
import { TXT, MOA_PRESET, memberById } from './txt.js';
import { PRESETS } from '../art/sprites.js';

PRESETS.moa = MOA_PRESET; // the MOA traveller joins the avatar styles

export const GROUPS = { txt: TXT };

export function defaultFandomAvatar(old = {}) {
  // bring along the familiar chosen in the original app, if any
  return {
    preset: 'moa', colors: { ...MOA_PRESET.colors }, image: null,
    familiar: old.familiar ?? true, familiarColor: old.familiarColor || '#2a2230', familiarImage: old.familiarImage || null, familiarSize: old.familiarSize,
  };
}

export function fandomOf(profile) {
  const f = profile?.fandom || {};
  return { group: f.group || 'txt', guide: f.guide || (GROUPS[f.group] || TXT).defaultGuide, title: f.title ?? 'MOA Traveller', avatar: f.avatar || defaultFandomAvatar(profile?.avatar) };
}
export const groupOf = (profile) => GROUPS[fandomOf(profile).group] || TXT;
export const guideOf = (profile) => memberById(fandomOf(profile).guide);
export const avatarOf = (profile) => fandomOf(profile).avatar;
export const guideLabel = (profile) => guideOf(profile).name;

// store helpers: write only into profile.fandom
export const patchFandom = (store, patch) => store.setProfile((p) => ({ fandom: { ...fandomOf(p), ...(typeof patch === 'function' ? patch(fandomOf(p)) : patch) } }));
export const patchAvatar = (store, patch) => patchFandom(store, (f) => ({ avatar: { ...f.avatar, ...patch } }));
