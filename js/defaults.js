// The starting profile. Everything here is editable from the Character sheet;
// it is seeded for the first user (Melbourne-based, travels home to Taiwan, public transit).
import { addDays, iso } from './time.js';
import { defaultAvatar, defaultKeeper } from './art/sprites.js';

export const REALMS = {
  melbourne: { id: 'melbourne', label: 'Melbourne', lat: -37.81, lon: 144.96, tz: 'Australia/Melbourne', hemisphere: 'south', climate: 'temperate', spring: 'jacaranda' },
  taipei: { id: 'taipei', label: 'Taipei', lat: 25.03, lon: 121.56, tz: 'Asia/Taipei', hemisphere: 'north', climate: 'subtropical', spring: 'sakura' },
  // more cities (v2). climate: temperate | cold | mild | dry | subtropical (see palette() in js/art/scene.js)
  seoul: { id: 'seoul', label: 'Seoul', lat: 37.57, lon: 126.98, tz: 'Asia/Seoul', hemisphere: 'north', climate: 'cold', spring: 'sakura' },
  tokyo: { id: 'tokyo', label: 'Tokyo', lat: 35.68, lon: 139.69, tz: 'Asia/Tokyo', hemisphere: 'north', climate: 'cold', spring: 'sakura' },
  osaka: { id: 'osaka', label: 'Osaka', lat: 34.69, lon: 135.5, tz: 'Asia/Tokyo', hemisphere: 'north', climate: 'mild', spring: 'sakura' },
  hongkong: { id: 'hongkong', label: 'Hong Kong', lat: 22.32, lon: 114.17, tz: 'Asia/Hong_Kong', hemisphere: 'north', climate: 'subtropical', spring: 'sakura' },
  shanghai: { id: 'shanghai', label: 'Shanghai', lat: 31.23, lon: 121.47, tz: 'Asia/Shanghai', hemisphere: 'north', climate: 'mild', spring: 'sakura' },
  singapore: { id: 'singapore', label: 'Singapore', lat: 1.35, lon: 103.82, tz: 'Asia/Singapore', hemisphere: 'north', climate: 'subtropical', spring: 'jacaranda' },
  kualalumpur: { id: 'kualalumpur', label: 'Kuala Lumpur', lat: 3.14, lon: 101.69, tz: 'Asia/Kuala_Lumpur', hemisphere: 'north', climate: 'subtropical', spring: 'jacaranda' },
  bangkok: { id: 'bangkok', label: 'Bangkok', lat: 13.75, lon: 100.5, tz: 'Asia/Bangkok', hemisphere: 'north', climate: 'subtropical', spring: 'jacaranda' },
  manila: { id: 'manila', label: 'Manila', lat: 14.6, lon: 120.98, tz: 'Asia/Manila', hemisphere: 'north', climate: 'subtropical', spring: 'jacaranda' },
  jakarta: { id: 'jakarta', label: 'Jakarta', lat: -6.21, lon: 106.85, tz: 'Asia/Jakarta', hemisphere: 'south', climate: 'subtropical', spring: 'jacaranda' },
  sydney: { id: 'sydney', label: 'Sydney', lat: -33.87, lon: 151.21, tz: 'Australia/Sydney', hemisphere: 'south', climate: 'mild', spring: 'jacaranda' },
  brisbane: { id: 'brisbane', label: 'Brisbane', lat: -27.47, lon: 153.03, tz: 'Australia/Brisbane', hemisphere: 'south', climate: 'subtropical', spring: 'jacaranda' },
  perth: { id: 'perth', label: 'Perth', lat: -31.95, lon: 115.86, tz: 'Australia/Perth', hemisphere: 'south', climate: 'dry', spring: 'jacaranda' },
  adelaide: { id: 'adelaide', label: 'Adelaide', lat: -34.93, lon: 138.6, tz: 'Australia/Adelaide', hemisphere: 'south', climate: 'dry', spring: 'jacaranda' },
  auckland: { id: 'auckland', label: 'Auckland', lat: -36.85, lon: 174.76, tz: 'Pacific/Auckland', hemisphere: 'south', climate: 'mild', spring: 'jacaranda' },
  london: { id: 'london', label: 'London', lat: 51.51, lon: -0.13, tz: 'Europe/London', hemisphere: 'north', climate: 'cold', spring: 'sakura' },
  paris: { id: 'paris', label: 'Paris', lat: 48.86, lon: 2.35, tz: 'Europe/Paris', hemisphere: 'north', climate: 'cold', spring: 'sakura' },
  berlin: { id: 'berlin', label: 'Berlin', lat: 52.52, lon: 13.4, tz: 'Europe/Berlin', hemisphere: 'north', climate: 'cold', spring: 'sakura' },
  newyork: { id: 'newyork', label: 'New York', lat: 40.71, lon: -74.01, tz: 'America/New_York', hemisphere: 'north', climate: 'cold', spring: 'sakura' },
  toronto: { id: 'toronto', label: 'Toronto', lat: 43.65, lon: -79.38, tz: 'America/Toronto', hemisphere: 'north', climate: 'cold', spring: 'sakura' },
  vancouver: { id: 'vancouver', label: 'Vancouver', lat: 49.28, lon: -123.12, tz: 'America/Vancouver', hemisphere: 'north', climate: 'mild', spring: 'sakura' },
  sanfrancisco: { id: 'sanfrancisco', label: 'San Francisco', lat: 37.77, lon: -122.42, tz: 'America/Los_Angeles', hemisphere: 'north', climate: 'mild', spring: 'jacaranda' },
  losangeles: { id: 'losangeles', label: 'Los Angeles', lat: 34.05, lon: -118.24, tz: 'America/Los_Angeles', hemisphere: 'north', climate: 'dry', spring: 'jacaranda' },
};

export const CATEGORIES = {
  fitness:  { label: 'Stardust Training', icon: '💫', color: '#d0607a' },
  outdoors: { label: 'Wanderlust',        icon: '🌠', color: '#3f9a74' },
  creative: { label: 'Dreamcraft',        icon: '🎨', color: '#9a5ad0' },
  learning: { label: 'Star Study',        icon: '📖', color: '#4a72c8' },
  social:   { label: 'Together',          icon: '💌', color: '#d07a4a' },
  rest:     { label: 'Moonlight Rest',    icon: '🌙', color: '#6a62a0' },
  chores:   { label: 'Planet Care',       icon: '🪴', color: '#3a8a90' },
  main:     { label: 'Main Chapter',      icon: '👑', color: '#b8892a' },
};

// intensity: 0 restful … 3 hard training. sweat: needs a wash-up afterwards.
const A = (id, name, category, icon, minMin, maxMin, o = {}) => ({
  id, name, category, icon, minMin, maxMin,
  intensity: 0, sweat: false, place: 'any', times: ['morning', 'afternoon', 'evening'],
  weeklyTarget: 0, weight: 3, enabled: true, ...o,
});

export function defaultProfile() {
  const today = new Date();
  return {
    version: 2,
    name: '', // asked for on first visit (and editable in Settings)
    title: 'Hearth Witch',
    avatar: defaultAvatar(),
    avatarDesigns: [], // uploads you chose to keep: {id, name, image, size}
    keeper: defaultKeeper(),
    fandom: null, // v2 only: { group, guide, avatar }, see js/fandom/index.js
    realm: 'melbourne',
    day: { wake: '07:30', sleep: '23:30' },
    minSlot: 30,          // shortest gap worth a quest
    bufferMin: 10,        // breathing room around events
    defaultTravelMin: 30, // events at unknown locations
    travelMode: 'transit',
    meals: [
      { name: 'Lunch', at: '12:30', min: 40 },
      { name: 'Dinner', at: '19:00', min: 50 },
    ],
    fitness: {
      showerMin: 20,              // wash-up after sweaty quests
      noIntenseBeforeSleepMin: 150, // keeps hard training away from bedtime
      recoveryHours: 20,          // between hard sessions
      importantKeywords: ['interview', 'presentation', 'exam', 'meeting', 'date', 'dinner', 'party', 'wedding'],
    },
    places: [
      { id: 'home', name: 'Home', realm: 'melbourne', isHome: true, fromHome: 0, keywords: ['home'], hasShower: true },
      { id: 'campus', name: 'Campus / Work', realm: 'melbourne', fromHome: 35, keywords: ['uni', 'campus', 'university', 'unimelb', 'rmit', 'monash', 'swinburne', 'deakin', 'lecture', 'tutorial', 'class', 'office', 'work', 'library'] },
      { id: 'gym', name: 'Gym', realm: 'melbourne', fromHome: 15, keywords: ['gym', 'fitness', 'pilates studio', 'climbing'], hasShower: true },
      { id: 'city', name: 'City centre', realm: 'melbourne', fromHome: 30, keywords: ['cbd', 'city', 'flinders', 'swanston', 'bourke st', 'collins st', 'melbourne central', 'lygon st', 'queen victoria market', 'restaurant', 'cafe', 'café', 'bar', 'cinema'] },
      { id: 'coast', name: 'Bayside / beach', realm: 'melbourne', fromHome: 40, keywords: ['beach', 'st kilda', 'brighton', 'williamstown', 'elwood', 'bayside', 'coastal'] },
      { id: 'park', name: 'Neighbourhood park', realm: 'melbourne', fromHome: 8, keywords: ['park', 'gardens', 'tan track', 'yarra'] },
      { id: 'tp-home', name: 'Family home', realm: 'taipei', isHome: true, fromHome: 0, keywords: ['home', '家'], hasShower: true },
      { id: 'tp-city', name: 'Xinyi / city', realm: 'taipei', fromHome: 25, keywords: ['xinyi', '信義', 'taipei 101', 'restaurant', 'cafe', 'mall'] },
      { id: 'tp-river', name: 'Riverside park', realm: 'taipei', fromHome: 15, keywords: ['riverside', '河濱', 'park'] },
      { id: 'tp-gym', name: 'Sports centre', realm: 'taipei', fromHome: 12, keywords: ['gym', '運動中心', 'sports centre'], hasShower: true },
    ],
    routes: [], // optional overrides: { a: placeId, b: placeId, min }
    activities: [
      A('gym', 'Strength session', 'fitness', '🏋️', 60, 75, { intensity: 3, sweat: true, place: 'gym', times: ['morning', 'afternoon', 'evening'], weeklyTarget: 2, weight: 4, matches: ['gym', 'workout', 'weights'] }),
      A('run', 'Easy run', 'fitness', '🏃', 30, 45, { intensity: 2, sweat: true, place: 'park', times: ['morning', 'evening'], weeklyTarget: 1, weight: 3, matches: ['run', 'parkrun', 'jog'] }),
      A('stretch', 'Yoga & stretch', 'fitness', '🧘', 20, 40, { intensity: 1, place: 'home', times: ['morning', 'evening', 'night'], weeklyTarget: 2, weight: 3, matches: ['yoga', 'pilates', 'stretch'] }),
      A('coastwalk', 'Bayside walk', 'outdoors', '🌊', 75, 150, { intensity: 1, place: 'coast', times: ['morning', 'afternoon'], weeklyTarget: 1, weight: 4 }),
      A('stroll', 'Stroll & fresh air', 'outdoors', '🚶', 20, 40, { intensity: 1, place: 'any', times: ['morning', 'afternoon', 'evening'], weight: 3 }),
      A('pixelart', 'Pixel art / drawing', 'creative', '🎨', 45, 120, { place: 'home', times: ['afternoon', 'evening', 'night'], weeklyTarget: 2, weight: 4 }),
      A('journal', 'Journaling', 'creative', '📓', 15, 30, { place: 'any', times: ['morning', 'night'], weight: 3 }),
      A('read', 'Read a book', 'learning', '📖', 30, 60, { place: 'any', times: ['afternoon', 'evening', 'night'], weeklyTarget: 3, weight: 4 }),
      A('course', 'Online course / skill', 'learning', '💻', 45, 90, { place: 'any', times: ['morning', 'afternoon'], weeklyTarget: 1, weight: 3 }),
      A('callfam', 'Call family in Taiwan', 'social', '📞', 20, 45, { place: 'home', times: ['evening'], weeklyTarget: 1, weight: 5, note: 'Melbourne evening ≈ Taipei afternoon', matches: ['mum', 'dad', 'mom', 'parents', 'family call', '媽', '爸'] }),
      A('coffee', 'Coffee with a friend', 'social', '☕', 60, 90, { place: 'city', times: ['morning', 'afternoon'], weight: 3 }),
      A('nap', 'Power nap', 'rest', '💤', 20, 30, { place: 'home', times: ['afternoon'], weight: 2, restores: true }),
      A('cozy', 'Tea & a cozy show', 'rest', '🍵', 30, 90, { place: 'home', times: ['evening', 'night'], weight: 3, restores: true }),
      A('mealprep', 'Meal prep', 'chores', '🍱', 60, 90, { place: 'home', times: ['afternoon', 'evening'], weeklyTarget: 1, weight: 3 }),
      A('tidy', 'Laundry & tidy', 'chores', '🧺', 30, 45, { place: 'home', times: ['morning', 'afternoon', 'evening'], weeklyTarget: 1, weight: 2 }),
      A('groceries', 'Groceries', 'chores', '🛒', 30, 45, { place: 'any', times: ['afternoon', 'evening'], weeklyTarget: 1, weight: 2 }),
    ],
    // Sample long-term goals — edit them into your own in the Quest Log.
    goals: [
      { id: 'g-final', type: 'deadline', title: 'Final project / exam prep', due: iso(addDays(today, 18)), hoursNeeded: 12, hoursDone: 2, sessionMin: 90, place: 'any', sample: true },
      { id: 'g-taiwan', type: 'event', title: 'Trip back to Taiwan', due: iso(addDays(today, 40)), sample: true, items: [
        { id: 'i1', text: 'Book flights', daysBefore: 30, minutes: 45, done: false },
        { id: 'i2', text: 'Buy gifts for family', daysBefore: 12, minutes: 90, done: false, place: 'city' },
        { id: 'i3', text: 'Sort phone roaming & cards', daysBefore: 5, minutes: 30, done: false },
        { id: 'i4', text: 'Pack luggage', daysBefore: 2, minutes: 60, done: false },
      ] },
      { id: 'g-5k', type: 'ongoing', title: 'Run a comfortable 5k', weeklyTarget: 2, sessionMin: 30, linkedActivityId: 'run', sample: true },
      { id: 'g-books', type: 'ongoing', title: 'Read 2 books a month', weeklyTarget: 3, sessionMin: 30, linkedActivityId: 'read', sample: true },
    ],
    settings: {
      googleClientId: '',
      calendars: [],      // selected Google calendar ids
      claudeKey: '',
      useClaude: false,
    },
  };
}
