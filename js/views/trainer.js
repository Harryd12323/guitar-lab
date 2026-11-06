import { OPEN_CHORDS, CHORD_ORDER } from '../chords.js';
import { suggestPairs, dailyBests, bestChanges, knownChords } from '../skills.js';
import { changeDrill } from '../components/changes.js';
import { lineChart } from '../components/chart.js';
import { $ } from '../util.js';

export function trainerView(el, [pa, pb]) {
  const known = knownChords();
  const suggested = suggestPairs(3, known.length >= 2 ? known.filter((c) => OPEN_CHORDS.includes(c)) : OPEN_CHORDS.slice(0, 3));
  let [a, b] = pa && pb ? [pa, pb] : suggested[0] || ['Em', 'A'];

  el.innerHTML = `
    <section class="page-head">
      <h1>Chord change trainer</h1>
      <p class="muted">60 seconds, two chords. Tap for every <strong>clean</strong> change: all strings ringing, no stopping. Watch your number climb day by day.</p>
    </section>
    <div class="card">
      <p class="small muted">Suggested for you</p>
      <div class="chip-row suggested"></div>
      <div class="pair-pick">
        <label class="field">From <select class="sel-a"></select></label>
        <span aria-hidden="true">⇄</span>
        <label class="field">To <select class="sel-b"></select></label>
      </div>
    </div>
    <div class="card drill-host"></div>
    <section class="section">
      <h2>History</h2>
      <p class="pb-line"></p>
      <div class="card history"></div>
    </section>
    <a class="card link-card" href="#/challenges"><span><strong>Want a challenge?</strong><br><span class="small muted">Speed rounds, random-pair roulette, tempo ladder, timing games</span></span><span aria-hidden="true">→</span></a>`;

  const selA = $('.sel-a', el);
  const selB = $('.sel-b', el);
  const opts = (sel, v) => { sel.innerHTML = CHORD_ORDER.map((c) => `<option${c === v ? ' selected' : ''}>${c}</option>`).join(''); };
  opts(selA, a);
  opts(selB, b);
  $('.suggested', el).innerHTML = suggested.length
    ? suggested.map(([x, y]) => `<button class="chip" type="button" data-pair="${x},${y}">${x} ⇄ ${y}</button>`).join('')
    : '<span class="small muted">Learn a couple of chords on the Path and suggestions appear here.</span>';

  const drill = changeDrill($('.drill-host', el), { a, b, onDone: drawHistory });

  function drawHistory() {
    const host = $('.history', el);
    host.replaceChildren();
    lineChart(host, dailyBests(a, b), { label: 'clean changes', caption: `Best clean ${a}↔${b} changes per day` });
    const best = bestChanges(a, b);
    $('.pb-line', el).textContent = best ? `Personal best for ${a}↔${b}: ${best} clean changes.` : '';
    el.querySelectorAll('[data-pair]').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.pair === `${a},${b}`)));
  }

  function setPair(x, y) {
    if (x === y) return;
    a = x; b = y;
    selA.value = a; selB.value = b;
    drill.setPair(a, b);
    history.replaceState(null, '', `#/trainer/${a}/${b}`);
    drawHistory();
  }

  el.addEventListener('click', (e) => {
    const c = e.target.closest('[data-pair]');
    if (c) setPair(...c.dataset.pair.split(','));
  });
  const onSel = () => { if (selA.value === selB.value) { selB.value = b === selA.value ? a : b; } setPair(selA.value, selB.value); };
  selA.addEventListener('change', onSel);
  selB.addEventListener('change', onSel);
  drawHistory();
  return drill.destroy;
}
