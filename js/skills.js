// Per-skill records, spaced review, mastery and the adaptive daily plan.
// One lesson = one skill; the skill id is the lesson id.
import * as store from './store.js';
import { LESSONS, LEVELS, PHASES, lessonById, lessonIndex, formLessonForChord, PROGRESSIONS, FUN } from './curriculum.js';
import { pairKey, CHORD_ORDER, OPEN_CHORDS } from './chords.js';
import { dayKey, addDays, daysBetween } from './util.js';

export const RATING_LABELS = ['Struggled', 'Mostly', 'Clean'];
export const MASTERY_LABELS = ['New', 'Learning', 'Solid', 'Mastered'];
const PRACTICE_KINDS = new Set(['form', 'changes', 'rhythm', 'notes', 'mix', 'quiz-strings', 'quiz-frets', 'pulse', 'tune']);

export function skill(id) {
  return store.get().skills[id] || { reps: 0, ratings: [], interval: 0, due: null, last: null, bpm: null, best: null, clean: 0 };
}
const ensure = (s, id) => (s.skills[id] ||= { reps: 0, ratings: [], interval: 0, due: null, last: null, bpm: null, best: null, clean: 0 });

export const status = (id) => store.get().lessons[id]?.status || null;

// Rating 2 = clean, 1 = mostly, 0 = struggled. Clean doubles the review gap
// (1, 2, 4, 8 … 60 days), mostly keeps it, struggled resets it to 1 day.
export function rate(id, r, { markDone = true } = {}) {
  const today = dayKey();
  store.update((s) => {
    const sk = ensure(s, id);
    sk.reps += 1;
    sk.ratings = [...sk.ratings, { d: today, r }].slice(-20);
    sk.last = today;
    sk.interval = r === 2 ? Math.min(60, Math.max(2, sk.interval * 2)) : r === 1 ? Math.max(1, sk.interval) : 1;
    sk.due = addDays(today, sk.interval);
    if (markDone && lessonById[id]) s.lessons[id] = { status: 'done', at: today };
  });
  store.logPractice();
}

export function setDone(id, done) {
  store.update((s) => {
    if (done) s.lessons[id] = { status: 'done', at: dayKey() };
    else delete s.lessons[id];
  });
  if (done) store.logPractice();
}

const recentAvg = (sk, n = 3) => {
  const last = sk.ratings.slice(-n);
  return last.length ? last.reduce((a, x) => a + x.r, 0) / last.length : null;
};

// 0 New · 1 Learning · 2 Solid · 3 Mastered, from your own ratings and tempo.
export function mastery(id) {
  const sk = skill(id);
  if (!sk.ratings.length) return 0;
  const last3 = sk.ratings.slice(-3);
  const ex = lessonById[id]?.ex;
  const atTarget = !ex?.target || (sk.best || 0) >= ex.target;
  if (last3.length === 3 && last3.every((x) => x.r === 2) && atTarget) return 3;
  return recentAvg(sk) >= 1.5 ? 2 : 1;
}

// Assistance fading for chord diagrams: 0 finger numbers, 1 dots only, 2 name only.
export function helpLevel(chord) {
  if (store.get().settings.help === 'always') return 0;
  const id = formLessonForChord[chord];
  if (!id) return 0;
  const m = mastery(id);
  if (m === 3) return 2;
  if (m === 2) return 1;
  if (m === 0 && status(id) === 'skipped') return 1;
  return 0;
}

/* ---------- Levels ---------- */
export function startIndex(level) {
  const start = LEVELS[level]?.start;
  if (start === null) return LESSONS.length;
  const i = LESSONS.findIndex((l) => l.phase === start);
  return i < 0 ? 0 : i;
}

// Moving up marks unstarted earlier lessons as skipped (assumed known, reviewed
// now and then). Moving down clears "skipped" from the new start onward.
export function applyLevel(level) {
  const start = startIndex(level);
  const today = dayKey();
  store.update((s) => {
    s.level = level;
    LESSONS.forEach((l, i) => {
      const cur = s.lessons[l.id];
      if (i < start) {
        if (!cur) {
          s.lessons[l.id] = { status: 'skipped', at: today };
          if (PRACTICE_KINDS.has(l.kind)) {
            const sk = ensure(s, l.id);
            if (!sk.due) { sk.interval = 4; sk.due = addDays(today, 2 + (i % 12)); }
          }
        }
      } else if (cur && cur.status === 'skipped') {
        delete s.lessons[l.id];
      }
    });
    s.today = null;
  });
}

/* ---------- Known chords ---------- */
export function knownChords() {
  const st = store.get();
  return CHORD_ORDER.filter((c) => {
    const id = formLessonForChord[c];
    return id && (st.lessons[id] || st.skills[id]?.ratings.length);
  });
}

export function changeHistory(a, b) {
  return store.get().changes[pairKey(a, b)] || [];
}
export function bestChanges(a, b) {
  return changeHistory(a, b).reduce((m, x) => Math.max(m, x.n), 0);
}

// Pairs to practise, weakest first, favouring the newest chord.
export function suggestPairs(count = 3, pool = knownChords().filter((c) => OPEN_CHORDS.includes(c))) {
  if (pool.length < 2) return [];
  const newest = pool[pool.length - 1];
  const pairs = [];
  for (let i = 0; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) pairs.push([pool[i], pool[j]]);
  }
  const score = ([a, b]) => {
    const hist = changeHistory(a, b);
    const best = hist.reduce((m, x) => Math.max(m, x.n), 0);
    const age = hist.length ? daysBetween(hist[hist.length - 1].d, dayKey()) : 30;
    return best - age * 0.5 - (a === newest || b === newest ? 8 : 0);
  };
  return pairs.sort((x, y) => score(x) - score(y)).slice(0, count);
}

function progressionFor(known) {
  const p = [...PROGRESSIONS].reverse().find((x) => x.chords.every((c) => known.includes(c)));
  if (p) return p;
  const open = known.filter((c) => OPEN_CHORDS.includes(c)).slice(-4);
  return open.length >= 3 ? { name: 'Your chords so far', chords: open } : null;
}

/* ---------- Today plan ---------- */
const practicable = (l) => PRACTICE_KINDS.has(l.kind) && l.kind !== 'tune';

export function buildPlan() {
  const st = store.get();
  const today = dayKey();
  const used = new Set();

  const next = LESSONS.find((l) => !st.lessons[l.id]) || null;
  if (next) used.add(next.id);

  const pool = LESSONS.filter((l) => practicable(l) && !used.has(l.id) && (st.lessons[l.id] || st.skills[l.id]?.ratings.length));

  // Weak: lowest recent rating (or a tempo far below target); else the stalest.
  const rated = pool.filter((l) => skill(l.id).ratings.length);
  const weakness = (l) => {
    const sk = skill(l.id);
    const tempoGap = l.ex?.target && sk.best ? Math.max(0, (l.ex.target - sk.best) / l.ex.target) : 0;
    return recentAvg(sk) - tempoGap;
  };
  let weak = rated.filter((l) => weakness(l) < 1.5).sort((a, b) => weakness(a) - weakness(b))[0];
  let weakReason = 'weak';
  if (!weak && rated.length) {
    weak = [...rated].sort((a, b) => (skill(a.id).last || '').localeCompare(skill(b.id).last || ''))[0];
    weakReason = 'stale';
  }
  if (weak) used.add(weak.id);

  // Review: most overdue; else the one due soonest.
  const reviewPool = pool.filter((l) => !used.has(l.id) && skill(l.id).due);
  const byDue = [...reviewPool].sort((a, b) => skill(a.id).due.localeCompare(skill(b.id).due));
  const review = byDue[0] || null;

  // Interleaved chord pairs + a progression from what you already know.
  const known = knownChords();
  const pairs = suggestPairs(3);
  const prog = progressionFor(known);
  // e.g. C→G, Am→F, C→Am, a progression, back to C→G (only when there's something to mix).
  const rounds = [...pairs, ...(prog ? [prog.chords] : [])];
  if (pairs.length > 1) rounds.push(pairs[0]);
  const mix = rounds.length > 1 ? rounds : null;

  const unlocked = FUN.filter((f) => !f.after || st.lessons[f.after]);
  const fun = unlocked[(st.sessions + 7) % unlocked.length];

  const items = [
    { key: 'tune', block: 'Tune up', minutes: 2, title: 'Tune all six strings', link: '#/tuner' },
    next && { key: 'new', block: 'New skill', minutes: 5, lesson: next.id },
    weak && { key: 'weak', block: weakReason === 'weak' ? 'Weak spot' : 'Keep it fresh', minutes: 4, lesson: weak.id },
    mix && { key: 'mix', block: 'Mixed changes', minutes: 4, pairs: mix, progName: prog?.name || null },
    review && { key: 'review', block: 'Review', minutes: 3, lesson: review.id, due: skill(review.id).due },
    { key: 'fun', block: 'Play something fun', minutes: 2, title: fun.text, link: fun.link || null },
  ].filter(Boolean);

  return { day: today, items, checked: {} };
}

export function todayPlan() {
  const st = store.get();
  if (st.today && st.today.day === dayKey()) return st.today;
  const plan = buildPlan();
  store.update((s) => { s.today = plan; });
  return plan;
}

export function checkItem(key, on = true) {
  todayPlan();
  store.update((s) => { s.today.checked[key] = on; });
  if (on) store.logPractice();
}

export function phaseProgress() {
  const st = store.get();
  return PHASES.map((p) => {
    const ls = LESSONS.filter((l) => l.phase === p.id);
    return {
      ...p,
      total: ls.length,
      done: ls.filter((l) => st.lessons[l.id]?.status === 'done').length,
      skipped: ls.filter((l) => st.lessons[l.id]?.status === 'skipped').length,
    };
  });
}

export const nextLesson = () => LESSONS.find((l) => !store.get().lessons[l.id]) || null;
export const lessonAfter = (id) => LESSONS[lessonIndex(id) + 1] || null;

/* ---------- Tempo ladder ---------- */
// A clean rep counts toward the ladder; after 3 clean reps at a tempo the
// next step (+4 BPM) is offered. Max clean tempo is kept per exercise.
export function logRep(id, bpm, clean) {
  let offer = null;
  store.update((s) => {
    const sk = ensure(s, id);
    if (clean) {
      sk.clean = sk.bpm === bpm ? sk.clean + 1 : 1;
      sk.bpm = bpm;
      sk.best = Math.max(sk.best || 0, bpm);
      if (sk.clean >= 3) { offer = bpm + 4; sk.offer = offer; }
    } else {
      sk.bpm = bpm;
      sk.clean = 0;
    }
  });
  return offer;
}

export function acceptOffer(id, take) {
  store.update((s) => {
    const sk = ensure(s, id);
    if (take && sk.offer) { sk.bpm = sk.offer; sk.clean = 0; }
    sk.offer = null;
  });
}

export function saveChanges(a, b, n) {
  const key = pairKey(a, b);
  const prev = changeHistory(a, b);
  const best = prev.reduce((m, x) => Math.max(m, x.n), 0);
  store.update((s) => { s.changes[key] = [...(s.changes[key] || []), { d: dayKey(), n }].slice(-60); });
  store.logPractice();
  return { isPB: n > best && prev.length > 0, best };
}

// Best result per day for the comparison line and chart.
export function dailyBests(a, b) {
  const byDay = new Map();
  for (const x of changeHistory(a, b)) byDay.set(x.d, Math.max(byDay.get(x.d) || 0, x.n));
  return [...byDay.entries()].map(([d, n]) => ({ d, n }));
}

export function setRecord(key, value, better = (a, b) => a > b) {
  const cur = store.get().records[key];
  const isPB = cur == null || better(value, cur.v);
  if (isPB) store.update((s) => { s.records[key] = { v: value, d: dayKey() }; });
  return { isPB, prev: cur ? cur.v : null };
}
