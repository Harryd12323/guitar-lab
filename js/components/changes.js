// One-minute chord change drill. Tap the pad (or press Space) for each CLEAN
// change; the diagram flips to the other chord each time.
import { chordViewer } from './chordviewer.js';
import { saveChanges, dailyBests } from '../skills.js';
import { chime, getCtx } from '../audio.js';
import { html, $, fmtDay, dayKey, toast } from '../util.js';

export function comparisonText(a, b, todayN) {
  const days = dailyBests(a, b);
  const today = dayKey();
  const prev = [...days].reverse().find((x) => x.d !== today);
  const name = `${a}→${b}`;
  if (todayN == null) {
    return prev ? `${fmtDay(prev.d)}: ${prev.n} clean ${name} changes. Can you beat it?` : `First time on ${name}. Any number is a good start.`;
  }
  return prev
    ? `${fmtDay(prev.d)}: ${prev.n} clean ${name} changes. Today: ${todayN}.`
    : `Today: ${todayN} clean ${name} changes. Come back tomorrow to compare.`;
}

/**
 * opts: { a, b, seconds = 60, save = true, onDone(n, result), pick: () => [a, b] }
 * `pick` (roulette) chooses a new target chord after each change.
 */
export function changeDrill(host, opts) {
  let { a, b } = opts;
  const seconds = opts.seconds || 60;
  const save = opts.save !== false;
  const root = html(`
    <div class="drill">
      <div class="drill-viewer"></div>
      <p class="drill-compare small"></p>
      <div class="drill-stats">
        <div><span class="drill-time">${seconds}</span><small>seconds</small></div>
        <div><span class="drill-count">0</span><small>clean changes</small></div>
      </div>
      <button class="btn primary wide drill-start" type="button">Start ${seconds}-second round</button>
      <button class="tap-pad drill-pad" type="button" hidden>Clean change<small>tap, or press Space</small></button>
      <button class="link-btn drill-cancel" type="button" hidden>Cancel round</button>
    </div>`);
  host.append(root);
  const viewer = chordViewer($('.drill-viewer', root), { chord: a });
  const $time = $('.drill-time', root);
  const $count = $('.drill-count', root);
  const $start = $('.drill-start', root);
  const $pad = $('.drill-pad', root);
  const $cancel = $('.drill-cancel', root);
  const $compare = $('.drill-compare', root);
  const updateCompare = (n) => { $compare.textContent = opts.pick ? '' : comparisonText(a, b, n); };
  updateCompare(null);

  let running = false;
  let count = 0;
  let endAt = 0;
  let raf = 0;
  let countdown = 0;

  function tap() {
    if (!running) return;
    count++;
    $count.textContent = count;
    if (opts.pick) {
      const next = opts.pick(viewer.key);
      viewer.show(next);
    } else {
      viewer.show(viewer.key === a ? b : a);
    }
    $pad.classList.remove('pulse');
    void $pad.offsetWidth;
    $pad.classList.add('pulse');
  }

  function tick() {
    const left = Math.max(0, endAt - performance.now());
    $time.textContent = Math.ceil(left / 1000);
    if (left <= 0) { finish(); return; }
    raf = requestAnimationFrame(tick);
  }

  function reset() {
    running = false;
    cancelAnimationFrame(raf);
    clearInterval(countdown);
    $pad.hidden = true;
    $cancel.hidden = true;
    $start.hidden = false;
    $time.textContent = seconds;
  }

  function finish() {
    reset();
    chime();
    $start.textContent = 'Go again';
    let result = { isPB: false };
    if (save) {
      result = saveChanges(a, b, count);
      if (result.isPB) toast(`New personal best: ${count} clean ${a}→${b} changes!`);
    }
    updateCompare(count);
    if (opts.onDone) opts.onDone(count, result);
  }

  $start.addEventListener('click', () => {
    getCtx();
    count = 0;
    $count.textContent = '0';
    viewer.show(a, { animate: false });
    $start.hidden = true;
    $cancel.hidden = false;
    let n = 3;
    $time.textContent = `${n}…`;
    countdown = setInterval(() => {
      n--;
      if (n > 0) { $time.textContent = `${n}…`; return; }
      clearInterval(countdown);
      running = true;
      $pad.hidden = false;
      $pad.focus({ preventScroll: true });
      endAt = performance.now() + seconds * 1000;
      tick();
    }, 700);
  });
  $pad.addEventListener('pointerdown', (e) => { e.preventDefault(); tap(); });
  $pad.addEventListener('click', (e) => { if (e.detail === 0) tap(); }); // keyboard "click"
  $cancel.addEventListener('click', reset);

  const onKey = (e) => {
    if (e.code === 'Space' && running) { e.preventDefault(); if (!e.repeat) tap(); }
  };
  document.addEventListener('keydown', onKey);

  return {
    el: root,
    setPair(na, nb) { a = na; b = nb; reset(); $start.textContent = `Start ${seconds}-second round`; viewer.show(a, { animate: true }); updateCompare(null); },
    destroy() { reset(); document.removeEventListener('keydown', onKey); },
  };
}
