// TOMORROW X TOGETHER: the dreamy star / little-planet / destiny world.
// The MOA traveller is drawn as rows of palette keys ('.' = transparent); the members use image sheets.
import { shade, blend } from '../art/sprites.js';

// Taehyun's sprite sheet (img/taehyun-sheet.webp): the user's original artwork, a 4×4 grid of poses,
// scaled smoothly to fit each scene (not snapped to a pixel grid). Frames are numbered row by row:
//   row 0: back · three-quarter back · back walk · wave
//   row 1: walk left · walk right · front · wave
//   row 2: walk left · walk right · front walk · front walk
//   row 3: walk left · back walk · front walk · front walk
const TH_SPRITE = {
  src: 'img/taehyun-sheet.webp', grid: [4, 4],
  side: 5, walk: [5, 9], mirrorLeft: true, front: 6, wave: [3, 7],
  frontWalk: [10, 11, 14, 15], back: 0, backWalk: [2, 13],
};
// his portrait (img/taehyun-portrait.webp), the original artwork drawn smoothly at any size
const TH_PORTRAIT = { src: 'img/taehyun-portrait.webp', crop: [215, 120, 830] }; // [x, y, size]: head and shoulders

// Yeonjun's sprite sheet (img/yeonjun-sheet.webp): his portrait on the left and a 4×4 grid of poses
// on the right, laid out like Taehyun's and scaled smoothly. `seat` raises him a little behind desks
// and counters, since his big chibi head sits low in the frame.
const YJ_SPRITE = {
  src: 'img/yeonjun-sheet.webp', grid: [4, 4], area: [776, 0, 760, 1024], seat: 4,
  // walk right: stride, passing, stride, passing (5, 1, 9, 2), evened to one height so he doesn't hop;
  // walking left is the same cycle mirrored
  evenHeight: true, back: 0, side: 5, walk: [5, 1, 9, 2], mirrorLeft: true, front: 6, wave: [3, 7],
  frontWalk: [10, 11, 15, 10], backWalk: [13, 14],
};
const YJ_PORTRAIT = { src: 'img/yeonjun-sheet.webp', crop: [75, 70, 660] };

// Beomgyu: a pixel chibi sheet made with tools/beomgyu.js (48×64 frames on a 4×4 grid)
const BG_SPRITE = {
  src: 'img/beomgyu-sheet.png', grid: [4, 4], seat: 3,
  back: 0, side: 4, walk: [1, 2, 5, 9], mirrorLeft: true, front: 6, wave: [3, 7], frontWalk: [10, 6, 11, 6], backWalk: [13, 14],
};
const BG_PORTRAIT = { src: 'img/beomgyu-portrait.png', crop: [72, 40, 368] };

// ---- The members. Taehyun, Yeonjun and Beomgyu are drawn so far; the rest show as "coming soon".
export const MEMBERS = [
  { id: 'soobin', name: 'Soobin', title: 'the Moonlit Leader', star: '#8ec5f0' },
  {
    id: 'yeonjun', name: 'Yeonjun', title: 'the Shooting Star', star: '#f0a3c8',
    sprite: YJ_SPRITE,
    portrait: YJ_PORTRAIT,
    taps: [
      'Ready? Let’s make today look easy.',
      'Warm up first, then we shine.',
      'One more step. You’ve got the rhythm now.',
      'Shooting stars are quick, but they always show up. Like you.',
      'Nice work! Water break, then the next one.',
      'Stretch your shoulders. Good posture, good mood.',
      'We practise a little every day. That’s how it gets fun.',
    ],
  },
  {
    id: 'beomgyu', name: 'Beomgyu', title: 'the Dream Bard', star: '#b9a3f0',
    sprite: BG_SPRITE,
    portrait: BG_PORTRAIT,
    taps: [
      'Hehe, you found me! Shall we make today a fun one?',
      'I wrote a little song about your to-do list. It’s a happy one.',
      'Headphones on, focus on. Let’s go!',
      'Dreams are just plans that like to sing. Let’s plan yours.',
      'Rest is part of the rhythm too, you know.',
      'You did so well already. I’m cheering the loudest!',
      'Want a snack break after this? I’ll save you one.',
    ],
  },
  {
    id: 'taehyun', name: 'Taehyun', title: 'your Star Navigator', star: '#9fd8ff',
    sprite: TH_SPRITE,
    portrait: TH_PORTRAIT,
    // little things he says when you tap him on the planet
    taps: [
      'Did you know? Light from some stars left them before you were born.',
      'Let’s do our best today, together.',
      'Small steps still count. I’m keeping track.',
      'I mapped the stars for today. They look good for you.',
      'Take a breath first. Then we go.',
      'A clever plan and a good rest: that’s the whole trick.',
      'Even the moon rests half the month. You can rest too.',
    ],
  },
  { id: 'hueningkai', name: 'Huening Kai', title: 'the Sky Melody', star: '#ffd98a' },
];
export const memberById = (id) => MEMBERS.find((m) => m.id === id && m.sprite) || MEMBERS.find((m) => m.sprite);

// ---- The player's own character: a MOA traveller with a star cape and a moon hairclip. 16×25.
const MOA = [
  '................',
  '.....hhhhhh.....',
  '....hhhhhhhhy...',
  '...hhHhhhhhyYy..',
  '..hhHhhhhhhhy...',
  '..hhhhhhhhhhhh..',
  '..hhSShhhhSShh..',
  '..hSSSSSSSSSSh..',
  '..hSEESSSSEESh..',
  '..hSEeSSSSEeSh..',
  '..hhbSSssSSbhh..',
  '..hhSSSSSSSShh..',
  '..hh.SSSSSS.hh..',
  '.....cCyCc......',
  '...cCCOOOOCCc...',
  '..cCCOoOOoOCCc..',
  '..cCSOOOOOOSCc..',
  '..cC.OoOOoO.Cc..',
  '..cC.OOOOOO.Cc..',
  '..cc.ooooooo.cc.',
  '...c.OOOOOOO.c..',
  '.....LL...LL....',
  '.....LL...LL....',
  '.....LL...LL....',
  '....BBB...BBB...',
];
const MOA_BLINK = MOA.map((r, i) => (i === 8 ? '..hSSSSSSSSSSh..' : i === 9 ? '..hSEESSSSEESh..' : r));
export const MOA_PRESET = {
  label: 'MOA traveller', rows: MOA, blink: MOA_BLINK, hand: [13, 16],
  slots: { hair: 'Hair', clip: 'Star clip', skin: 'Skin', eyes: 'Eyes', cape: 'Star cape', outfit: 'Outfit', legs: 'Tights', boots: 'Boots' },
  colors: { hair: '#6a5a9a', clip: '#ffd86a', skin: '#f6dccb', eyes: '#2e2440', cape: '#7aa8e8', outfit: '#f4eefe', legs: '#b9a3e6', boots: '#5a4a8a' },
  pal: (c) => ({
    h: c.hair, H: shade(c.hair, 1.4), y: c.clip, Y: shade(c.clip, 1.35), S: c.skin, s: shade(c.skin, 0.82), b: blend(c.skin, '#f06a8a', 0.45),
    E: c.eyes, e: '#ffffff', C: c.cape, c: shade(c.cape, 0.7), O: c.outfit, o: shade(c.outfit, 0.82), L: c.legs, B: c.boots,
  }),
};

// ---- Group settings: the UI colours, the planet's palette and the words that change with the group.
export const TXT = {
  id: 'txt', name: 'TXT', full: 'TOMORROW X TOGETHER', fandom: 'MOA',
  app: 'Star Chapter', tagline: 'a dreamy pixel planner, written in the stars',
  members: MEMBERS, defaultGuide: 'taehyun',
  // the little planet: grass, flowers, the dome house and the sea of clouds
  planet: {
    soil: ['#8a7ac8', '#6f5fae', '#a796de'], grass: ['#9fdcc8', '#c4f0de', '#78bfae'],
    dome: ['#cfe6ff', '#9fc4f2'], house: ['#f6eefe', '#d9cdf2', '#b7a8e0'], roof: ['#8a7ae0', '#6a5ac0', '#b4a8f4'],
    clouds: ['#fde6f2', '#e6dcfa', '#c8bcf0'], rose: '#f07a9a', star: '#ffe08a',
  },
};
