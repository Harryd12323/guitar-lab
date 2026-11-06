import * as store from '../store.js';
import { LESSONS, PHASES, lessonById, phaseById, lessonIndex } from '../curriculum.js';
import { CHORDS, CHORD_ORDER, SCALES } from '../chords.js';
import { scaleDiagram } from '../fretboard.js';
import { pluck, note } from '../audio.js';
import {
  status, mastery, MASTERY_LABELS, rate, setDone, phaseProgress, nextLesson, lessonAfter,
  checkItem, setRecord,
} from '../skills.js';
import { chordViewer } from '../components/chordviewer.js';
import { exercise } from '../components/exercise.js';
import { changeDrill } from '../components/changes.js';
import { ratingRow } from '../components/rating.js';
import { quiz } from '../components/quiz.js';
import { tapGame } from '../components/timing.js';
import { html, $, esc, toast } from '../util.js';

/* ---------- Path ---------- */
export function pathView(el) {
  const st = store.get();
  const next = nextLesson();
  const phases = phaseProgress();
  const totalDone = phases.reduce((a, p) => a + p.done, 0);
  const totalSkipped = phases.reduce((a, p) => a + p.skipped, 0);
  el.innerHTML = `
    <section class="page-head">
      <h1>Your 90-day path</h1>
      <p class="muted">${totalDone} of ${LESSONS.length} lessons done${totalSkipped ? ` · ${totalSkipped} skipped (you can still open them)` : ''}. Milestones are goals, not deadlines.</p>
      <div class="btn-row">
        ${next ? `<a class="btn primary" href="#/lesson/${next.id}">Up next: ${esc(next.title)}</a>` : ''}
        <a class="btn" href="#/chords">Chord library</a>
      </div>
    </section>
    <div class="phases"></div>`;
  const host = $('.phases', el);
  phases.forEach((p) => {
    const lessons = LESSONS.filter((l) => l.phase === p.id);
    const open = next ? next.phase === p.id : false;
    const d = html(`
      <details class="phase card"${open ? ' open' : ''}>
        <summary>
          <div class="phase-head">
            <span class="phase-title">${p.title} <small>${p.days}</small></span>
            <span class="phase-sub">${p.sub}</span>
          </div>
          <span class="phase-count">${p.done}/${p.total}</span>
          <span class="chev" aria-hidden="true"></span>
        </summary>
        <p class="phase-goal small"><strong>Goal:</strong> ${p.goal}</p>
        <ol class="lesson-rows"></ol>
      </details>`);
    const ol = $('.lesson-rows', d);
    lessons.forEach((l) => {
      const s = status(l.id);
      const m = mastery(l.id);
      const isNext = next && next.id === l.id;
      const badge = s === 'skipped' && !m ? '<span class="badge">Skipped</span>'
        : m ? `<span class="badge m${m}">${MASTERY_LABELS[m]}</span>` : '';
      const icon = s === 'done' ? '✓' : s === 'skipped' ? '↷' : isNext ? '●' : lessonIndex(l.id) + 1;
      ol.append(html(`
        <li class="lesson-row ${s || ''}${isNext ? ' next' : ''}">
          <a href="#/lesson/${l.id}">
            <span class="row-icon" aria-hidden="true">${icon}</span>
            <span class="row-title">${esc(l.title)}<small>${l.minutes} min${isNext ? ' · up next' : ''}${s === 'done' ? ' · done' : s === 'skipped' ? ' · skipped' : ''}</small></span>
            ${badge}
          </a>
        </li>`));
    });
    host.append(d);
  });
  if (st.level === 'pro') host.insertAdjacentHTML('beforebegin', '<p class="card small">You’re on Pro, so lessons are skipped and Today shows challenges. Open any lesson here whenever you like.</p>');
}

/* ---------- Lesson ---------- */
const REF_STRINGS = [['E', 40, '6th'], ['A', 45, '5th'], ['D', 50, '4th'], ['G', 55, '3rd'], ['B', 59, '2nd'], ['e', 64, '1st']];

export function lessonView(el, [id, from, itemKey]) {
  const lesson = lessonById[id];
  if (!lesson) { el.innerHTML = '<p>Lesson not found. <a href="#/path">Back to the path</a></p>'; return null; }
  const phase = phaseById[lesson.phase];
  const s = status(id);
  const fromToday = from === 'today';
  el.innerHTML = `
    <a class="back" href="${fromToday ? '#/today' : '#/path'}">← ${fromToday ? 'Today' : 'Path'}</a>
    <article class="lesson">
      <p class="eyebrow">${phase.title} · ${phase.days} · ${lesson.minutes} min</p>
      <h1>${esc(lesson.title)}</h1>
      <p class="goal">${lesson.goal}</p>
      ${s === 'skipped' ? '<p class="note-box">You skipped this lesson when you chose your level. It’s here whenever you want it.</p>' : ''}
      ${lesson.intro ? `<p>${lesson.intro}</p>` : ''}
      ${lesson.steps ? `<ol class="steps">${lesson.steps.map((x) => `<li>${x}</li>`).join('')}</ol>` : ''}
      <div class="practice"></div>
      ${lesson.tips ? `<ul class="tips">${lesson.tips.map((x) => `<li>${x}</li>`).join('')}</ul>` : ''}
      ${lesson.exercise ? `<p class="exercise"><strong>Exercise:</strong> ${lesson.exercise}</p>` : ''}
      <div class="finish"></div>
    </article>`;
  const practice = $('.practice', el);
  const finish = $('.finish', el);
  const cleanups = [];

  function completed() {
    if (fromToday && itemKey) checkItem(itemKey);
    const nxt = lessonAfter(id);
    finish.querySelector('.after')?.remove();
    finish.append(html(`
      <div class="after card">
        <p><strong>Saved.</strong> ${fromToday ? 'Nice. Back to your session?' : ''}</p>
        <div class="btn-row">
          ${fromToday ? '<a class="btn primary" href="#/today">Back to Today</a>' : ''}
          ${nxt && !fromToday ? `<a class="btn primary" href="#/lesson/${nxt.id}">Next: ${esc(nxt.title)}</a>` : ''}
          <a class="btn" href="#/path">Path</a>
        </div>
      </div>`));
  }
  const rateAndFinish = (r) => {
    rate(id, r);
    toast(`Saved: ${['Struggled', 'Mostly', 'Clean'][r]}`);
    completed();
  };
  const doneButton = () => {
    const isDone = status(id) === 'done';
    const b = html(`<button class="btn ${isDone ? '' : 'primary'} wide" type="button">${isDone ? '✓ Done · mark not done' : 'Mark lesson done'}</button>`);
    b.addEventListener('click', () => {
      const nowDone = status(id) !== 'done';
      setDone(id, nowDone);
      b.textContent = nowDone ? '✓ Done · mark not done' : 'Mark lesson done';
      b.classList.toggle('primary', !nowDone);
      if (nowDone) completed();
    });
    finish.append(b);
  };

  switch (lesson.kind) {
    case 'read':
      doneButton();
      break;
    case 'tune': {
      practice.append(html(`
        <div class="card">
          <a class="btn primary wide" href="#/tuner">Open the tuner</a>
          <p class="small muted center">Or match these reference notes by ear:</p>
          <div class="string-row">${REF_STRINGS.map(([n, m, num]) => `<button class="note-btn" type="button" data-midi="${m}">${n}<small>${num}</small></button>`).join('')}</div>
        </div>`));
      practice.addEventListener('click', (e) => { const b = e.target.closest('[data-midi]'); if (b) pluck(+b.dataset.midi); });
      ratingRow(finish, { prompt: 'Did you get all six strings in tune?', onRate: rateAndFinish });
      break;
    }
    case 'quiz-strings':
    case 'quiz-frets': {
      quiz(practice, lesson.kind, {
        onDone: (score) => {
          setRecord(`quiz:${id}`, score);
          rateAndFinish(score >= 9 ? 2 : score >= 7 ? 1 : 0);
        },
      });
      break;
    }
    case 'form': {
      const v = chordViewer(practice, { chord: lesson.chord });
      const c = CHORDS[lesson.chord];
      const check = html('<button class="btn wide" type="button">Hear it string by string</button>');
      check.addEventListener('click', () => {
        let i = 0;
        c.frets.forEach((f, s) => { if (f >= 0) { setTimeout(() => note(s, f, { length: 0.9 }), i * 450); i++; } });
      });
      practice.append(check);
      if (lesson.chord === 'G5') {
        const more = html(`<div class="chip-row center">${['G5', 'E5', 'A5', 'C5', 'D5'].map((k) => `<button class="chip" type="button" data-chord="${k}">${k}</button>`).join('')}</div>`);
        more.addEventListener('click', (e) => { const b = e.target.closest('[data-chord]'); if (b) v.show(b.dataset.chord, { sound: true }); });
        practice.prepend(more);
      }
      if (lesson.chord === 'E') {
        const more = html(`<div class="chip-row center">${['Em', 'E'].map((k) => `<button class="chip" type="button" data-chord="${k}">${k}</button>`).join('')}</div>`);
        more.addEventListener('click', (e) => { const b = e.target.closest('[data-chord]'); if (b) v.show(b.dataset.chord, { sound: true }); });
        practice.prepend(more);
      }
      ratingRow(finish, { prompt: 'Could you form it with every string ringing?', onRate: rateAndFinish });
      break;
    }
    case 'changes': {
      const [a, b] = lesson.pair;
      let rr = null;
      const drill = changeDrill(practice, {
        a, b,
        onDone: (n) => rr.suggest(n >= 30 ? 2 : n >= 15 ? 1 : 0),
      });
      cleanups.push(drill.destroy);
      rr = ratingRow(finish, { prompt: 'How clean were your changes?', onRate: rateAndFinish });
      break;
    }
    case 'rhythm':
    case 'notes': {
      const x = exercise(practice, lesson, { memory: !!lesson.memory });
      const rr = ratingRow(finish, { prompt: 'How did this session go overall?', onRate: rateAndFinish });
      const timer = setInterval(() => rr.suggest(x.suggestion()), 1000);
      cleanups.push(() => clearInterval(timer), x.stop);
      break;
    }
    case 'mix':
      mixRounds(practice, lesson.ex.pairs, cleanups);
      ratingRow(finish, { prompt: 'How did the mixed changes go?', onRate: rateAndFinish });
      break;
    case 'pulse': {
      let rr = null;
      const g = tapGame(practice, {
        bpm: 70, bars: 4, label: 'Start: tap along for 4 bars',
        onDone: (r) => {
          if (r.hits) setRecord('pulse:spread', Math.round(r.spread), (x, y) => x < y);
          rr.suggest(r.hits >= 12 && r.spread <= 30 ? 2 : r.hits >= 8 && r.spread <= 60 ? 1 : 0);
        },
      });
      cleanups.push(g.destroy);
      rr = ratingRow(finish, { prompt: 'Measured above. Save how it felt:', onRate: rateAndFinish });
      break;
    }
    case 'check':
      checkList(practice, lesson);
      doneButton();
      break;
    default:
      doneButton();
  }
  return () => cleanups.forEach((f) => f && f());
}

function checkList(host, lesson) {
  const key = `check:${lesson.id}`;
  const saved = store.get().records[key]?.v || [];
  const ul = html(`<ul class="checklist card">${lesson.tasks.map((t, i) => `
    <li><label><input type="checkbox" data-i="${i}"${saved[i] ? ' checked' : ''}> <span>${esc(t.text)}</span></label>
    ${t.link ? `<a class="small" href="${t.link}">Practise</a>` : ''}</li>`).join('')}</ul>`);
  ul.addEventListener('change', () => {
    const v = [...ul.querySelectorAll('input')].map((x) => x.checked);
    store.update((s) => { s.records[key] = { v, d: s.records[key]?.d }; });
    if (v.every(Boolean)) toast('Milestone reached. Well played!');
  });
  host.append(ul);
}

// Interleaved rounds: a different pair every 40 s instead of one pair forever.
export function mixRounds(host, pairs, cleanups, { onFinish } = {}) {
  let i = 0;
  const wrap = html(`
    <div class="mix card">
      <p class="mix-step small muted"></p>
      <div class="mix-body"></div>
      <div class="btn-row"><button class="btn mix-next" type="button">Next round →</button></div>
    </div>`);
  host.append(wrap);
  let drill = null;
  function show() {
    if (drill) drill.destroy();
    const body = $('.mix-body', wrap);
    body.replaceChildren();
    const round = pairs[i];
    $('.mix-step', wrap).textContent = `Round ${i + 1} of ${pairs.length}${round.length > 2 ? ': progression' : ''}`;
    if (round.length > 2) {
      body.append(html(`<p>Play <strong>${round.join(' → ')}</strong>, four downstrokes per chord, round and round for about a minute. Tap each chord to see and hear it.</p>`));
      const v = chordViewer(body, { chord: round[0], controls: false });
      const chips = html(`<div class="chip-row center">${round.map((c, j) => `<button class="chip" type="button" data-j="${j}">${c}</button>`).join('')}</div>`);
      chips.addEventListener('click', (e) => { const b = e.target.closest('[data-j]'); if (b) v.show(round[+b.dataset.j], { sound: true }); });
      body.prepend(chips);
      drill = null;
    } else {
      drill = changeDrill(body, { a: round[0], b: round[1], seconds: 40, save: false });
    }
    const last = i === pairs.length - 1;
    $('.mix-next', wrap).textContent = last ? 'Finish' : 'Next round →';
  }
  $('.mix-next', wrap).addEventListener('click', () => {
    if (i < pairs.length - 1) { i++; show(); return; }
    if (drill) drill.destroy();
    $('.mix-body', wrap).innerHTML = '<p><strong>All rounds done.</strong> Mixing pairs like this is harder than repeating one, and that’s why it works.</p>';
    $('.mix-next', wrap).hidden = true;
    $('.mix-step', wrap).textContent = 'Finished';
    if (onFinish) onFinish();
  });
  cleanups.push(() => drill && drill.destroy());
  show();
}

/* ---------- Chord library ---------- */
export function chordsView(el, [initial]) {
  const first = CHORDS[initial] ? initial : 'Em';
  el.innerHTML = `
    <a class="back" href="#/path">← Path</a>
    <section class="page-head">
      <h1>Chord library</h1>
      <p class="muted">Pick a chord and watch each finger travel from the last one. Use ¼× to see it in slow motion. Tap the diagram to hear it.</p>
    </section>
    <div class="card">
      <div class="chip-row center chord-picker">${CHORD_ORDER.map((k) => `<button class="chip" type="button" data-chord="${k}">${k}</button>`).join('')}</div>
      <div class="lib-viewer"></div>
      <ul class="legend">
        <li><span class="legend-dot">1</span>finger number (1 index · 2 middle · 3 ring · 4 pinky)</li>
        <li><span class="legend-anchor"></span>anchor: this finger stays put</li>
        <li><span class="legend-open"></span>play string open <span class="legend-muted">×</span>don’t play it</li>
      </ul>
    </div>
    <section class="section">
      <h2>Scale shapes</h2>
      <div class="scale-grid">${Object.entries(SCALES).map(([k, s]) => `<figure class="card scale-card" data-scale="${k}"><figcaption>${s.name}</figcaption></figure>`).join('')}</div>
    </section>`;
  const v = chordViewer($('.lib-viewer', el), { chord: first, help: 0 });
  const picker = $('.chord-picker', el);
  const mark = (k) => picker.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.chord === k)));
  mark(first);
  picker.addEventListener('click', (e) => {
    const b = e.target.closest('[data-chord]');
    if (!b) return;
    v.show(b.dataset.chord, { sound: true });
    mark(b.dataset.chord);
  });
  el.querySelectorAll('[data-scale]').forEach((f) => f.prepend(scaleDiagram(f.dataset.scale)));
  return null;
}

