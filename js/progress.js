// Progress lives only in this browser's localStorage. Every access is wrapped
// in try/catch so the site still works when storage is blocked or full.
const KEY = 'guitar-lab:progress:v1';

export let storageOk = true;
let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    const d = raw ? JSON.parse(raw) : null;
    if (d && typeof d === 'object') {
      return {
        done: d.done && typeof d.done === 'object' ? d.done : {},
        days: Array.isArray(d.days) ? d.days.filter((x) => typeof x === 'string') : [],
      };
    }
  } catch (e) {
    storageOk = false;
  }
  return { done: {}, days: [] };
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    storageOk = true;
  } catch (e) {
    storageOk = false;
  }
}

function dayKey(date) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export const isDone = (id) => state.done[id] === true;

export function setDone(id, done) {
  if (done) state.done[id] = true;
  else delete state.done[id];
  if (done) logPractice(); else save();
}

export const doneCount = () => Object.keys(state.done).length;

export function logPractice() {
  const today = dayKey(new Date());
  if (!state.days.includes(today)) state.days = [...state.days, today].slice(-400);
  save();
}

export const practicedToday = () => state.days.includes(dayKey(new Date()));

// Consecutive practice days ending today, or yesterday if today isn't logged yet.
export function streak() {
  const days = new Set(state.days);
  const d = new Date();
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(dayKey(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export function reset() {
  state = { done: {}, days: [] };
  try { localStorage.removeItem(KEY); } catch (e) { storageOk = false; }
}
