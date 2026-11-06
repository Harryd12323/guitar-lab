import * as store from '../store.js';
import * as transport from '../transport.js';
import { LEVELS } from '../curriculum.js';
import { CHORDS, OPEN_CHORDS } from '../chords.js';
import { strum, chuck } from '../audio.js';
import { applyLevel, setRecord, bestChanges } from '../skills.js';
import { changeDrill } from '../components/changes.js';
import { strumLane } from '../components/lane.js';
import { chordViewer } from '../components/chordviewer.js';
import { tapGame, describeTiming } from '../components/timing.js';
import { $, esc, fmtDay, toast } from '../util.js';

const HARD_PAIRS = [['G', 'C'], ['C', 'F'], ['Am', 'F'], ['D', 'G'], ['E', 'F']];
const LADDERS = [
  { id: 'eighths-gc', name: 'Down-up eighths, G ↔ C', chords: ['G', 'C'], pattern: 'DUDUDUDU' },
  { id: 'everyday', name: 'Everyday pattern, C–G–Am–F', chords: ['C', 'G', 'Am', 'F'], pattern: 'D.DU.UDU' },
  { id: 'chucks', name: 'Muted strums, Em ↔ G', chords: ['Em', 'G'], pattern: 'DUXUDUXU' },
  { id: 'palm', name: 'Palm-muted power chords', chords: ['E5', 'G5', 'A5', 'G5'], pattern: 'DDDDDDDD' },
];

const rec = (k) => store.get().records[k];
const recText = (k, unit) => (rec(k) ? `Record: ${rec(k).v}${unit} (${fmtDay(rec(k).d)})` : 'No record yet');

export function challengesView(el, [tab]) {
  const st = store.get();
  const current = ['speed', 'ladder', 'timing'].includes(tab) ? tab : 'speed';
  el.innerHTML = `
    <section class="page-head">
      ${st.level === 'pro' ? '<p class="eyebrow">Pro · challenge mode</p>' : '<a class="back" href="#/trainer">← Trainer</a>'}
      <h1>Challenges</h1>
      <p class="muted">Personal records only, no leaderboards. ${st.level === 'pro' ? 'Lessons are still on the <a href="#/path">Path</a> whenever you want them.' : ''}</p>
    </section>
    <div class="seg wide-seg" role="tablist">
      ${[['speed', 'Speed changes'], ['ladder', 'Tempo ladder'], ['timing', 'Timing']].map(([k, l]) => `<a role="tab" href="#/challenges/${k}" aria-selected="${k === current}">${l}</a>`).join('')}
    </div>
    <div class="ch-body"></div>`;
  const body = $('.ch-body', el);
  if (current === 'speed') return speed(body);
  if (current === 'ladder') return ladder(body);
  return timing(body);
}

/* ---------- Speed changes ---------- */
function speed(body) {
  body.innerHTML = `
    <div class="card">
      <p class="small muted">Hard pairs</p>
      <div class="chip-row">${HARD_PAIRS.map(([a, b]) => `<button class="chip" type="button" data-pair="${a},${b}">${a} ⇄ ${b}<small class="pb">${bestChanges(a, b) || ''}</small></button>`).join('')}
        <button class="chip" type="button" data-pair="roulette">Random roulette</button></div>
    </div>
    <div class="card speed-host"></div>
    <p class="small muted roulette-rec"></p>`;
  let drill = null;
  const host = $('.speed-host', body);
  function load(val) {
    if (drill) drill.destroy();
    host.replaceChildren();
    body.querySelectorAll('[data-pair]').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.pair === val)));
    if (val === 'roulette') {
      host.insertAdjacentHTML('afterbegin', '<p><strong>Random roulette:</strong> after each clean change the next chord is random. No pattern to memorise.</p>');
      $('.roulette-rec', body).textContent = recText('roulette', ' changes');
      drill = changeDrill(host, {
        a: 'C', b: 'G', save: false,
        pick: (cur) => { const pool = OPEN_CHORDS.filter((c) => c !== cur); return pool[Math.floor(Math.random() * pool.length)]; },
        onDone: (n) => {
          const r = setRecord('roulette', n);
          if (r.isPB && r.prev != null) toast(`New roulette record: ${n}!`);
          $('.roulette-rec', body).textContent = recText('roulette', ' changes');
        },
      });
    } else {
      $('.roulette-rec', body).textContent = '';
      const [a, b] = val.split(',');
      drill = changeDrill(host, { a, b });
    }
  }
  body.addEventListener('click', (e) => { const c = e.target.closest('[data-pair]'); if (c) load(c.dataset.pair); });
  load('G,C');
  return () => drill && drill.destroy();
}

/* ---------- Tempo ladder: +4 BPM per clean rung until you miss ---------- */
function ladder(body) {
  body.innerHTML = `
    <div class="card">
      <label class="field">Pattern <select class="lad-sel">${LADDERS.map((l) => `<option value="${l.id}">${esc(l.name)}</option>`).join('')}</select></label>
      <label class="field">Start at <select class="lad-start">${[60, 70, 80, 90, 100, 110, 120].map((b) => `<option${b === 80 ? ' selected' : ''}>${b}</option>`).join('')}</select> BPM</label>
      <p class="small muted lad-rec"></p>
    </div>
    <div class="card lad-card">
      <div class="lad-viewer"></div>
      <div class="lad-lane"></div>
      <p class="lad-rung center"><strong class="lad-bpm">80</strong> BPM · rung <span class="lad-n">1</span></p>
      <label class="check-row"><input type="checkbox" class="lad-guide"> <span>Guide sound</span></label>
      <button class="btn primary wide lad-go" type="button">Start rung (2 bars)</button>
      <div class="btn-row lad-verdict" hidden>
        <button class="btn primary" type="button" data-v="1">Clean: up 4 BPM</button>
        <button class="btn" type="button" data-v="0">Missed: finish</button>
      </div>
      <p class="lad-result" aria-live="polite"></p>
    </div>`;
  const sel = $('.lad-sel', body);
  const startSel = $('.lad-start', body);
  const owner = {};
  let cfg = LADDERS[0];
  let bpm = 80;
  let rung = 1;
  let maxClean = 0;
  let viewer = chordViewer($('.lad-viewer', body), { chord: cfg.chords[0], controls: false });
  const lane = strumLane($('.lad-lane', body), cfg.pattern);
  const recKey = () => `ladder:${cfg.name}`;
  const showRec = () => { $('.lad-rec', body).textContent = recText(recKey(), ' BPM'); };

  function reset() {
    transport.stop();
    cfg = LADDERS.find((l) => l.id === sel.value);
    bpm = +startSel.value;
    rung = 1;
    maxClean = 0;
    $('.lad-viewer', body).replaceChildren();
    viewer = chordViewer($('.lad-viewer', body), { chord: cfg.chords[0], controls: false });
    lane.setPattern(cfg.pattern);
    $('.lad-verdict', body).hidden = true;
    $('.lad-go', body).hidden = false;
    $('.lad-result', body).textContent = '';
    paint();
    showRec();
  }
  const paint = () => { $('.lad-bpm', body).textContent = bpm; $('.lad-n', body).textContent = rung; };

  function finish() {
    $('.lad-verdict', body).hidden = true;
    $('.lad-go', body).hidden = false;
    $('.lad-go', body).textContent = 'Start a new ladder';
    if (maxClean) {
      const r = setRecord(recKey(), maxClean);
      $('.lad-result', body).textContent = `Top clean rung: ${maxClean} BPM.${r.isPB && r.prev != null ? ' New record!' : ''}`;
      if (r.isPB && r.prev != null) toast(`New tempo record: ${maxClean} BPM`);
    } else {
      $('.lad-result', body).textContent = 'No clean rung this time. Try starting slower.';
    }
    showRec();
    rung = 0;
  }

  $('.lad-go', body).addEventListener('click', () => {
    if (rung === 0) { reset(); }
    $('.lad-go', body).hidden = true;
    $('.lad-result', body).textContent = '';
    const guide = $('.lad-guide', body).checked;
    transport.start({
      owner, bpm, sub: 2, beatsPerBar: 4, countInBars: 1, stopAfterBars: 2,
      onSchedule: (evt) => {
        if (!guide || evt.countIn) return;
        const c = cfg.chords[evt.bar % cfg.chords.length];
        const t = cfg.pattern[evt.stepInBar];
        if (t === '.') return;
        if (t === 'X') chuck({ when: evt.time });
        else strum(CHORDS[c], { when: evt.time, dir: t === 'U' ? 'up' : 'down', length: cfg.id === 'palm' ? evt.duration * 0.5 : undefined });
      },
      onStep: (evt) => { if (!evt.countIn && evt.stepInBar === 0) viewer.show(cfg.chords[evt.bar % cfg.chords.length]); },
      onFrame: (pos) => { if (pos.evt) lane.update(pos.evt.stepInBar + pos.frac); },
      onStop: ({ natural }) => {
        lane.update(null);
        if (natural) $('.lad-verdict', body).hidden = false;
        else $('.lad-go', body).hidden = false;
      },
    });
  });
  $('.lad-verdict', body).addEventListener('click', (e) => {
    const b = e.target.closest('[data-v]');
    if (!b) return;
    if (b.dataset.v === '1') {
      maxClean = bpm;
      bpm += 4;
      rung++;
      paint();
      $('.lad-verdict', body).hidden = true;
      $('.lad-go', body).hidden = false;
      $('.lad-go', body).textContent = `Next rung: ${bpm} BPM`;
      if (bpm > 220) finish();
    } else finish();
  });
  sel.addEventListener('change', reset);
  startSel.addEventListener('change', reset);
  showRec();
  return () => transport.stop();
}

/* ---------- Timing games ---------- */
function timing(body) {
  const cal = store.get().settings.latency != null;
  body.innerHTML = `
    ${cal ? '' : '<p class="note-box small">For early/late scores, <a href="#/settings">calibrate tap latency</a> first. Spread (how consistent you are) is fair either way.</p>'}
    <div class="card">
      <h2>Tap along</h2>
      <p class="small muted">Tap with the click for 8 bars. Lower spread = steadier.</p>
      <label class="field">Tempo <select class="ta-bpm">${[60, 80, 100, 120, 140, 160, 180].map((b) => `<option${b === 100 ? ' selected' : ''}>${b}</option>`).join('')}</select> BPM</label>
      <div class="ta-host"></div>
      <p class="small muted ta-rec">${recText('timing:along', ' ms spread')}</p>
    </div>
    <div class="card">
      <h2>Keep the beat</h2>
      <p class="small muted">The click plays for 2 bars, then goes silent for 2. Keep tapping: how far do you drift?</p>
      <label class="field">Tempo <select class="gap-bpm">${[60, 80, 100, 120].map((b) => `<option${b === 80 ? ' selected' : ''}>${b}</option>`).join('')}</select> BPM</label>
      <div class="gap-host"></div>
      <p class="small muted gap-rec">${recText('timing:gap', ' ms drift')}</p>
    </div>`;
  const along = tapGame($('.ta-host', body), {
    bpm: 100, bars: 8, label: 'Start tap-along',
    onDone: (r) => {
      if (r.hits < 16) return;
      const v = Math.round(r.spread);
      const res = setRecord('timing:along', v, (a, b) => a < b);
      if (res.isPB && res.prev != null) toast(`New timing record: ±${v} ms`);
      $('.ta-rec', body).textContent = recText('timing:along', ' ms spread');
    },
  });
  const gap = tapGame($('.gap-host', body), {
    bpm: 80, bars: 8, gap: true, label: 'Start keep-the-beat',
    onDone: (r) => {
      if (r.drift == null || r.hits < 16) return;
      const v = Math.round(Math.abs(r.drift));
      const res = setRecord('timing:gap', v, (a, b) => a < b);
      if (res.isPB && res.prev != null) toast(`New keep-the-beat record: ${v} ms`);
      $('.gap-rec', body).textContent = recText('timing:gap', ' ms drift');
    },
  });
  $('.ta-bpm', body).addEventListener('change', (e) => along.setBpm(+e.target.value));
  $('.gap-bpm', body).addEventListener('change', (e) => gap.setBpm(+e.target.value));
  return () => { along.destroy(); gap.destroy(); };
}

/* ---------- Placement check ---------- */
export function placementView(el) {
  const back = store.get().level ? '#/settings' : '#/welcome';
  el.innerHTML = `
    <a class="back" href="${back}">← Back</a>
    <section class="page-head"><h1>Placement check</h1>
    <p class="muted">About two minutes. It only suggests a level: you choose.</p></section>
    <div class="pl-body"></div>`;
  const body = $('.pl-body', el);
  const result = { changes: null, steady: null };
  let cleanup = null;

  function suggest(level, reason) {
    if (cleanup) cleanup();
    body.innerHTML = `
      <div class="card">
        <p class="eyebrow">Suggested level</p>
        <h2>${LEVELS[level].label}</h2>
        <p>${reason}</p>
        <div class="btn-row"><button class="btn primary" type="button" data-use="${level}">Use ${LEVELS[level].label}</button></div>
      </div>
      <p class="small muted">Or pick a different one:</p>
      <div class="chip-row">${Object.entries(LEVELS).filter(([k]) => k !== level).map(([k, l]) => `<button class="chip" type="button" data-use="${k}">${l.label}</button>`).join('')}</div>`;
  }
  body.addEventListener('click', (e) => {
    const b = e.target.closest('[data-use]');
    if (!b) return;
    applyLevel(b.dataset.use);
    toast(`Level set: ${LEVELS[b.dataset.use].label}`);
    location.hash = '#/today';
  });

  function step1() {
    body.innerHTML = `
      <div class="card">
        <p class="eyebrow">Step 1 of 3</p>
        <h2>Can you play C and G?</h2>
        <div class="stack">
          <button class="btn wide" type="button" data-q="none">Not yet: I’m new to chords</button>
          <button class="btn wide" type="button" data-q="some">I know a few chords, but not C and G</button>
          <button class="btn primary wide" type="button" data-q="yes">Yes, C and G</button>
        </div>
      </div>`;
    body.querySelector('.stack').addEventListener('click', (e) => {
      const q = e.target.closest('[data-q]')?.dataset.q;
      if (q === 'none') suggest('beginner', 'Start from day 1. The first weeks go quickly if parts are familiar.');
      else if (q === 'some') suggest('novice', 'You’ll skip the orientation and start at week 2, with A and D. C and G come soon after.');
      else if (q === 'yes') step2();
    });
  }

  function step2() {
    body.innerHTML = '<div class="card"><p class="eyebrow">Step 2 of 3</p><h2>One minute of C ↔ G</h2><p class="small">Tap for every clean change. Be honest.</p><div class="pl-drill"></div></div>';
    const d = changeDrill($('.pl-drill', body), {
      a: 'C', b: 'G',
      onDone: (n) => { result.changes = n; d.destroy(); step3(); },
    });
    cleanup = d.destroy;
  }

  const TEMPOS = [80, 110, 140];
  function step3(i = 0) {
    const bpm = TEMPOS[i];
    body.innerHTML = `<div class="card"><p class="eyebrow">Step 3 of 3 · tempo ${i + 1} of ${TEMPOS.length}</p><h2>Tap along at ${bpm} BPM</h2><p class="small">Two bars of tapping on every click.</p><div class="pl-tap"></div></div>`;
    const g = tapGame($('.pl-tap', body), {
      bpm, bars: 2, label: `Start (${bpm} BPM)`,
      onDone: (r) => {
        g.destroy();
        const steady = r.hits >= 6 && r.spread <= 35;
        if (steady) result.steady = bpm;
        if (steady && i < TEMPOS.length - 1) setTimeout(() => step3(i + 1), 800);
        else setTimeout(conclude, 800);
        $('.pl-tap', body).insertAdjacentHTML('beforeend', `<p class="small">${describeTiming(r, false)}</p>`);
      },
    });
    cleanup = g.destroy;
  }

  function conclude() {
    const n = result.changes || 0;
    const steady = result.steady;
    const why = `${n} clean C↔G changes, steady ${steady ? `up to ${steady} BPM` : 'below 80 BPM'}`;
    if (n < 20) suggest('novice', `${why}. Week 2 onward builds clean, quick changes, and you can skip ahead anytime.`);
    else if (n < 35 || !steady) suggest('intermediate', `${why}. Start at day 31: G, F, strumming patterns and riffs.`);
    else if (n < 50 || steady < 140) suggest('advanced', `${why}. Start at day 61: power chords, palm muting and the pentatonic.`);
    else suggest('pro', `${why}. That’s fast and tight. Challenge mode it is.`);
  }

  step1();
  return () => cleanup && cleanup();
}
