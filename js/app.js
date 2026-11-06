import { CHORDS, CHORD_ORDER, describeChord } from './chords.js';
import { createFretboard } from './fretboard.js';
import { strum, pluck } from './audio.js';
import { createMetronome } from './metronome.js';
import * as progress from './progress.js';
import { LESSONS } from './lessons.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* ---------- Theme ---------- */
const root = document.documentElement;
$('#theme-toggle').addEventListener('click', () => {
  const current = root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const next = current === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  try { localStorage.setItem('guitar-lab:theme', next); } catch (e) { /* not saved, still applied */ }
});

/* ---------- Lessons ---------- */
const list = $('#lesson-list');
LESSONS.forEach((lesson, i) => {
  const li = document.createElement('li');
  li.className = 'lesson';
  li.dataset.lesson = lesson.id;
  li.innerHTML = `
    <details data-scope>
      <summary>
        <span class="lesson-num" aria-hidden="true">${i + 1}</span>
        <span class="lesson-title">${lesson.title}<small>${lesson.minutes} min</small></span>
        <span class="chev" aria-hidden="true"></span>
      </summary>
      <div class="lesson-body">
        ${lesson.body}
        <button class="btn done-btn" type="button" data-done="${lesson.id}"></button>
      </div>
    </details>`;
  list.appendChild(li);
});
$('#lesson-total').textContent = LESSONS.length;

/* ---------- Chord diagrams ---------- */
$('#chord-picker').innerHTML = CHORD_ORDER
  .map((k) => `<button class="chip" type="button" data-chord="${k}">${k}</button>`).join('');

const boards = new Map(); // scope element -> board api

function mountBoard(host) {
  const fb = createFretboard();
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'board-btn';
  btn.append(fb.svg);
  const caption = document.createElement('p');
  caption.className = 'board-caption';
  host.append(btn, caption);
  const scope = host.closest('[data-scope]');
  let current = null;

  const api = {
    show(key, play) {
      fb.set(key);
      current = key;
      caption.innerHTML = `<strong>${CHORDS[key].name}</strong> · tap diagram to hear`;
      btn.setAttribute('aria-label', `${describeChord(key)} Play chord.`);
      $$('.chip[data-chord]', scope).forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.chord === key)));
      if (play) strum(CHORDS[key]);
    },
  };
  btn.addEventListener('click', () => strum(CHORDS[current]));
  api.show(host.dataset.board, false);
  boards.set(scope, api);
}
$$('.board-host').forEach(mountBoard);

/* ---------- Strumming grids ---------- */
const COUNTS = ['1', '&', '2', '&', '3', '&', '4', '&'];
$$('.strum').forEach((grid) => {
  const pattern = grid.dataset.pattern;
  const spoken = [];
  grid.innerHTML = COUNTS.map((count, i) => {
    const p = pattern[i];
    const arrow = p === 'D' ? '↓' : p === 'U' ? '↑' : '';
    if (arrow) spoken.push(`${count} ${p === 'D' ? 'down' : 'up'}`);
    return `<span class="cell${arrow ? '' : ' rest'}"><b>${arrow || '·'}</b><i>${count}</i></span>`;
  }).join('');
  grid.setAttribute('role', 'img');
  grid.setAttribute('aria-label', `Strum on: ${spoken.join(', ')}`);
});

/* ---------- Metronome ---------- */
const range = $('#bpm-range');
const bpmOut = $('#bpm-value');
const beatDots = $$('#beats span');
const gridCells = $$('.strum').map((g) => [...g.children]);

const metro = createMetronome({
  onStep(step) {
    beatDots.forEach((d, i) => d.classList.toggle('on', step >= 0 && step % 2 === 0 && i === step / 2));
    gridCells.forEach((cells) => cells.forEach((c, i) => c.classList.toggle('now', i === step)));
  },
  onState(running) {
    $$('[data-action="metronome"]').forEach((b) => {
      b.textContent = running ? 'Stop metronome' : 'Start metronome';
      b.classList.toggle('active', running);
    });
    running ? startPracticeTimer() : stopPracticeTimer();
  },
});
function setBpm(v) {
  const bpm = metro.setBpm(v);
  range.value = bpm;
  bpmOut.textContent = bpm;
}
range.addEventListener('input', () => setBpm(+range.value));
$('#bpm-down').addEventListener('click', () => setBpm(metro.bpm - 1));
$('#bpm-up').addEventListener('click', () => setBpm(metro.bpm + 1));

let taps = [];
$('#tap').addEventListener('click', () => {
  const now = performance.now();
  taps = taps.filter((t) => now - t < 2500);
  taps.push(now);
  if (taps.length >= 2) {
    const recent = taps.slice(-5);
    const avg = (recent[recent.length - 1] - recent[0]) / (recent.length - 1);
    setBpm(60000 / avg);
  }
});

// One minute of metronome time in a day counts as practice for the streak.
let practiceTimer = null;
let practiceMs = 0;
let lastTick = 0;
function startPracticeTimer() {
  lastTick = performance.now();
  practiceTimer = setInterval(() => {
    const now = performance.now();
    practiceMs += now - lastTick;
    lastTick = now;
    if (practiceMs >= 60000 && !progress.practicedToday()) {
      progress.logPractice();
      renderProgress();
    }
  }, 1000);
}
function stopPracticeTimer() { clearInterval(practiceTimer); }

/* ---------- 1-minute drill ---------- */
let drill = null;
function toggleDrill(btn) {
  if (drill) {
    clearInterval(drill);
    drill = null;
    btn.textContent = 'Start 1-minute timer';
    btn.classList.remove('active');
    return;
  }
  let left = 60;
  btn.classList.add('active');
  btn.textContent = `${left}s left · tap to stop`;
  drill = setInterval(() => {
    left--;
    if (left > 0) {
      btn.textContent = `${left}s left · tap to stop`;
      return;
    }
    clearInterval(drill);
    drill = null;
    btn.classList.remove('active');
    btn.textContent = "Time's up! Start again";
    pluck(76);
    progress.logPractice();
    renderProgress();
  }, 1000);
}

/* ---------- Clicks (one delegated handler) ---------- */
document.addEventListener('click', (e) => {
  const t = e.target.closest('button');
  if (!t) return;
  if (t.dataset.chord) {
    const board = boards.get(t.closest('[data-scope]'));
    if (board) board.show(t.dataset.chord, true);
    else strum(CHORDS[t.dataset.chord]);
  } else if (t.dataset.note) {
    pluck(+t.dataset.note);
  } else if (t.dataset.action === 'metronome') {
    metro.toggle();
  } else if (t.dataset.action === 'drill') {
    toggleDrill(t);
  } else if (t.dataset.done) {
    progress.setDone(t.dataset.done, !progress.isDone(t.dataset.done));
    renderProgress();
  }
});

$('#reset').addEventListener('click', () => {
  if (!confirm('Reset all lesson progress and your streak?')) return;
  progress.reset();
  renderProgress();
});

/* ---------- Progress UI ---------- */
function renderProgress() {
  const done = progress.doneCount();
  const pct = Math.round((done / LESSONS.length) * 100);
  $('#done-count').textContent = done;
  $('#progress-fill').style.width = `${pct}%`;
  $('#progressbar').setAttribute('aria-valuenow', pct);

  const streak = progress.streak();
  $('#streak').textContent = streak;
  $('#today-status').textContent = progress.practicedToday()
    ? "You've practised today. Nice work, see you tomorrow."
    : streak > 0
      ? 'Practise today to keep your streak going.'
      : 'Finish a lesson or practise with the metronome for a minute to start your streak.';
  $('#storage-warning').hidden = progress.storageOk;

  LESSONS.forEach(({ id }) => {
    const li = $(`[data-lesson="${id}"]`);
    const isDone = progress.isDone(id);
    li.classList.toggle('is-done', isDone);
    const btn = $('[data-done]', li);
    btn.textContent = isDone ? '✓ Completed · undo' : 'Mark lesson done';
    btn.classList.toggle('primary', !isDone);
  });
}
renderProgress();

// Open the first unfinished lesson so returning users land where they left off.
const next = LESSONS.find((l) => !progress.isDone(l.id));
if (next) $(`[data-lesson="${next.id}"] details`).open = true;
