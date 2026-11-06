// Tap-timing measurement: the one score the app measures itself.
// Taps are mapped onto the AudioContext clock and compared with the scheduled
// clicks. A saved latency calibration (Bluetooth headphones add a lot) is
// subtracted. "Spread" ignores any constant offset, so it's fair even uncalibrated.
import * as transport from '../transport.js';
import * as store from '../store.js';
import { getCtx } from '../audio.js';
import { html, $ } from '../util.js';

function audioTimeOf(e) {
  const ctx = getCtx();
  if (ctx.getOutputTimestamp) {
    const ts = ctx.getOutputTimestamp();
    if (ts.contextTime > 0 && ts.performanceTime > 0) return ts.contextTime + (e.timeStamp - ts.performanceTime) / 1000;
  }
  return ctx.currentTime - (ctx.outputLatency || ctx.baseLatency || 0) + (e.timeStamp - performance.now()) / 1000;
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0;
};

export function analyse(taps, clicks, beatSec, latencyMs) {
  const offsets = [];
  const silentOffsets = [];
  const used = new Set();
  for (const t of taps) {
    let best = null;
    for (const c of clicks) {
      if (used.has(c)) continue;
      const d = t - c.time;
      if (Math.abs(d) < beatSec / 2 && (!best || Math.abs(d) < Math.abs(best.d))) best = { c, d };
    }
    if (!best) continue;
    used.add(best.c);
    const ms = best.d * 1000 - (latencyMs || 0);
    (best.c.silent ? silentOffsets : offsets).push(ms);
  }
  const all = [...offsets, ...silentOffsets];
  const med = median(all);
  const spread = all.length ? all.reduce((a, x) => a + Math.abs(x - med), 0) / all.length : null;
  const mean = all.length ? all.reduce((a, x) => a + x, 0) / all.length : null;
  const tight = all.length ? all.filter((x) => Math.abs(x) <= 30).length / all.length : 0;
  const drift = silentOffsets.length ? silentOffsets.reduce((a, x) => a + x, 0) / silentOffsets.length : null;
  return { hits: all.length, expected: clicks.length, offsets: all, mean, median: med, spread, tight, drift };
}

export function describeTiming(r, calibrated) {
  if (!r.hits) return 'No taps matched the clicks. Try again, tapping on each click.';
  const parts = [`Spread ±${Math.round(r.spread)} ms`];
  if (calibrated) {
    parts.push(`${Math.round(r.tight * 100)}% within 30 ms of the click`);
    if (Math.abs(r.mean) >= 12) parts.push(`you tend to be a little ${r.mean < 0 ? 'early' : 'late'} (${Math.round(Math.abs(r.mean))} ms)`);
  }
  if (r.drift != null) parts.push(`in the silent bars you drifted ${Math.round(Math.abs(r.drift))} ms ${r.drift < 0 ? 'ahead' : 'behind'}`);
  return `${parts.join(' · ')}. Caught ${r.hits} of ${r.expected} beats.`;
}

/**
 * opts: { bpm, bars = 4, gap = false (2 bars click, 2 bars silent), onDone(result), label }
 */
export function tapGame(host, opts) {
  const root = html(`
    <div class="tapgame">
      <div class="meter" aria-hidden="true"><span class="meter-mid"></span><span class="meter-l">early</span><span class="meter-r">late</span></div>
      <p class="tap-status small muted" aria-live="polite">${opts.gap ? 'Two bars with the click, then two bars of silence: keep tapping the beat.' : 'Tap on every click.'}</p>
      <button class="btn primary wide tap-start" type="button">${opts.label || 'Start'}</button>
      <button class="tap-pad tap-hit" type="button" hidden>Tap<small>or press Space</small></button>
    </div>`);
  host.append(root);
  const meter = $('.meter', root);
  const $status = $('.tap-status', root);
  const $start = $('.tap-start', root);
  const $pad = $('.tap-hit', root);
  const owner = {};
  let taps = [];
  let clicks = [];
  let bpm = opts.bpm;

  const latency = () => store.get().settings.latency;

  function mark(ms) {
    const dot = document.createElement('span');
    dot.className = 'meter-dot';
    const clamped = Math.max(-150, Math.min(150, ms));
    dot.style.left = `${50 + (clamped / 150) * 50}%`;
    meter.append(dot);
    setTimeout(() => dot.classList.add('old'), 600);
  }

  function hit(e) {
    if (!transport.isOwner(owner)) return;
    const t = audioTimeOf(e);
    taps.push(t);
    const beat = 60 / bpm;
    const near = clicks.reduce((b, c) => (!b || Math.abs(t - c.time) < Math.abs(t - b.time) ? c : b), null);
    if (near && Math.abs(t - near.time) < beat / 2) mark((t - near.time) * 1000 - (latency() || 0));
    $pad.classList.remove('pulse');
    void $pad.offsetWidth;
    $pad.classList.add('pulse');
  }

  $pad.addEventListener('pointerdown', (e) => { e.preventDefault(); hit(e); });
  const onKey = (e) => {
    if (e.code === 'Space' && transport.isOwner(owner)) { e.preventDefault(); if (!e.repeat) hit(e); }
  };
  document.addEventListener('keydown', onKey);

  $start.addEventListener('click', () => {
    if (transport.isOwner(owner)) { transport.stop(); return; }
    taps = [];
    clicks = [];
    meter.querySelectorAll('.meter-dot').forEach((d) => d.remove());
    const bars = opts.bars || 4;
    $start.textContent = 'Stop';
    $pad.hidden = false;
    $status.textContent = 'Count-in…';
    transport.start({
      owner, bpm, sub: 1, beatsPerBar: 4, countInBars: 1, stopAfterBars: bars,
      silent: (evt) => opts.gap && !evt.countIn && evt.bar % 4 >= 2,
      onSchedule: (evt) => { if (!evt.countIn) clicks.push({ time: evt.time, silent: opts.gap && evt.bar % 4 >= 2 }); },
      onStep: (evt) => {
        if (evt.countIn) $status.textContent = `Count-in: ${evt.beat + 1}`;
        else $status.textContent = opts.gap && evt.bar % 4 >= 2 ? 'Silent bars: keep going…' : `Bar ${evt.bar + 1} of ${bars}`;
      },
      onStop: ({ natural }) => {
        $start.textContent = 'Go again';
        $pad.hidden = true;
        if (!natural) { $status.textContent = 'Stopped.'; return; }
        const r = analyse(taps, clicks, 60 / bpm, latency());
        r.bpm = bpm;
        $status.textContent = describeTiming(r, latency() != null);
        if (opts.onDone) opts.onDone(r);
      },
    });
  });

  return {
    setBpm(v) { bpm = v; },
    destroy() { document.removeEventListener('keydown', onKey); if (transport.isOwner(owner)) transport.stop(); },
  };
}
