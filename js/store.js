// All progress lives in this browser's localStorage. Every access is wrapped in
// try/catch so the site keeps working (unsaved) when storage is blocked or full.
import { dayKey, addDays, weekKey } from './util.js';

const KEY = 'guitar-lab:v2';
const V1_KEY = 'guitar-lab:progress:v1';
export const LEVELS = ['beginner', 'novice', 'intermediate', 'advanced', 'pro'];

export let storageOk = true;
let state = null;
const listeners = new Set();

function blank() {
  return {
    v: 2,
    level: null,
    lessons: {},   // id -> { status: 'done' | 'skipped', at }
    skills: {},    // id -> { reps, ratings: [{d, r}], interval, due, last, bpm, best, clean, offer }
    days: [],      // practice days
    sessions: 0,   // "Day N" = practice sessions, not calendar days
    lastSession: null,
    today: null,   // cached plan for the current day
    changes: {},   // pair key -> [{ d, n }]
    records: {},   // challenge records
    settings: { help: 'auto', latency: null, tipDismissed: false },
    migratedFromV1: false,
  };
}

const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);

function normalize(d) {
  const b = blank();
  if (!isObj(d)) return b;
  return {
    ...b,
    level: LEVELS.includes(d.level) ? d.level : null,
    lessons: isObj(d.lessons) ? d.lessons : {},
    skills: isObj(d.skills) ? d.skills : {},
    days: Array.isArray(d.days) ? d.days.filter((x) => typeof x === 'string').slice(-500) : [],
    sessions: Number.isFinite(d.sessions) ? d.sessions : 0,
    lastSession: typeof d.lastSession === 'string' ? d.lastSession : null,
    today: isObj(d.today) ? d.today : null,
    changes: isObj(d.changes) ? d.changes : {},
    records: isObj(d.records) ? d.records : {},
    settings: { ...b.settings, ...(isObj(d.settings) ? d.settings : {}) },
    migratedFromV1: !!d.migratedFromV1,
  };
}

// v1 had 7 lessons; map each to the v2 lessons that cover the same skills.
const V1_MAP = {
  tuning: ['w1-tuning'],
  pick: ['w1-posture', 'w1-pick'],
  'em-am': ['w1-em', 'w3-am'],
  'c-g-d': ['w2-d', 'w4-c', 'm2-g'],
  'e-a': ['w2-a', 'w3-e'],
  switching: ['w2-a-d'],
  strumming: ['w1-em-strum', 'w3-eighths'],
};

function migrateV1(raw) {
  const s = blank();
  try {
    const old = JSON.parse(raw);
    const days = Array.isArray(old.days) ? old.days.filter((x) => typeof x === 'string') : [];
    s.days = days;
    s.sessions = days.length;
    s.lastSession = days[days.length - 1] || null;
    for (const id of Object.keys(old.done || {})) {
      for (const nid of V1_MAP[id] || []) s.lessons[nid] = { status: 'done', at: s.lastSession || dayKey() };
    }
    s.migratedFromV1 = true;
  } catch (e) { /* unreadable v1 data: start fresh */ }
  return s;
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      state = normalize(JSON.parse(raw));
    } else {
      const v1 = localStorage.getItem(V1_KEY);
      state = v1 ? migrateV1(v1) : blank();
      if (v1) save(); // keep the v1 key untouched as a fallback
    }
  } catch (e) {
    storageOk = false;
    state = blank();
  }
  return state;
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    storageOk = true;
  } catch (e) {
    storageOk = false;
  }
}

export const get = () => state;

export function update(fn) {
  fn(state);
  save();
  listeners.forEach((l) => l(state));
}
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/* ---------- Practice days, sessions and streak ---------- */
export function logPractice() {
  const today = dayKey();
  if (state.days.includes(today)) return;
  update((s) => {
    s.days = [...s.days, today].slice(-500);
    s.sessions += 1;
    s.lastSession = today;
  });
}
export const practicedToday = () => state.days.includes(dayKey());
// Day N of the path: the session you're in (today counts once you start).
export const dayNumber = () => state.sessions + (practicedToday() ? 0 : 1);

// Forgiving streak: one missed day per calendar week (Mon–Sun) is covered by a
// freeze. Today never breaks the streak; it's still in progress.
export function streakInfo() {
  const days = new Set(state.days);
  const today = dayKey();
  let d = days.has(today) ? today : addDays(today, -1);
  let count = 0;
  const usedWeeks = new Set();
  let pending = [];
  const frozen = [];
  for (let i = 0; i < 500; i++) {
    if (days.has(d)) {
      count++;
      frozen.push(...pending);
      pending = [];
    } else {
      const wk = weekKey(d);
      if (usedWeeks.has(wk)) break;
      usedWeeks.add(wk);
      pending.push(d);
    }
    d = addDays(d, -1);
  }
  const thisWeek = weekKey(today);
  return {
    count,
    frozen,
    freezeAvailable: !frozen.some((f) => weekKey(f) === thisWeek),
  };
}

/* ---------- Backup codes ---------- */
export function exportCode() {
  const bytes = new TextEncoder().encode(JSON.stringify(state));
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return `GL2-${btoa(bin)}`;
}

export function importCode(code) {
  const trimmed = String(code).trim().replace(/\s+/g, '');
  if (!trimmed.startsWith('GL2-')) throw new Error('That doesn’t look like a Guitar Lab backup code.');
  const bin = atob(trimmed.slice(4));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  const data = JSON.parse(new TextDecoder().decode(bytes));
  if (!isObj(data) || data.v !== 2) throw new Error('That backup code is from an unknown version.');
  update((s) => Object.assign(s, normalize(data)));
}

export function resetAll() {
  update((s) => Object.assign(s, blank()));
  try { localStorage.removeItem(V1_KEY); } catch (e) { /* ignore */ }
}
