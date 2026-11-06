import * as transport from '../transport.js';
import * as store from '../store.js';
import { $, $$, clamp } from '../util.js';

let bpm = 80;
let beatsPerBar = 4;
let sub = 1;

export function metronomeView(el) {
  el.innerHTML = `
    <section class="page-head"><h1>Metronome</h1>
    <p class="muted">Clicks are scheduled on the audio clock, so they stay steady. A minute of practice with it counts toward your streak.</p></section>
    <div class="card metro">
      <div class="beats" aria-hidden="true"></div>
      <div class="bpm-readout"><output class="bpm-value">${bpm}</output> <span>BPM</span></div>
      <div class="bpm-controls">
        <button class="icon-btn round" type="button" data-d="-1" aria-label="Slower">−</button>
        <input type="range" class="bpm-range" min="40" max="220" step="1" value="${bpm}" aria-label="Tempo in beats per minute">
        <button class="icon-btn round" type="button" data-d="1" aria-label="Faster">+</button>
      </div>
      <div class="metro-options">
        <label class="field">Beats per bar <select class="sel-beats">${[2, 3, 4, 6].map((n) => `<option${n === beatsPerBar ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
        <label class="field">Click <select class="sel-sub"><option value="1"${sub === 1 ? ' selected' : ''}>Quarter notes</option><option value="2"${sub === 2 ? ' selected' : ''}>Eighth notes</option></select></label>
      </div>
      <div class="btn-row center">
        <button class="btn primary metro-toggle" type="button">Start</button>
        <button class="btn tap" type="button">Tap tempo</button>
      </div>
      <p class="small muted">Beat 1 is accented. Start slow (60–70 BPM) and only speed up once it feels easy.</p>
    </div>`;
  const beats = $('.beats', el);
  const drawBeats = () => { beats.innerHTML = Array.from({ length: beatsPerBar }, () => '<span></span>').join(''); };
  drawBeats();
  const out = $('.bpm-value', el);
  const range = $('.bpm-range', el);
  const toggle = $('.metro-toggle', el);
  const owner = {};
  const setBpm = (v) => {
    bpm = clamp(Math.round(v), 40, 220);
    out.textContent = bpm;
    range.value = bpm;
    transport.setBpm(bpm);
  };

  let practiceMs = 0;
  let last = 0;
  let timer = 0;
  function start() {
    toggle.textContent = 'Stop';
    toggle.classList.add('active');
    last = performance.now();
    timer = setInterval(() => {
      const now = performance.now();
      practiceMs += now - last;
      last = now;
      if (practiceMs >= 60000) store.logPractice();
    }, 1000);
    transport.start({
      owner, bpm, sub, beatsPerBar, clickSubs: sub > 1,
      onStep: (evt) => {
        if (!evt.isBeat) return;
        $$('span', beats).forEach((d, i) => d.classList.toggle('on', i === evt.beat));
      },
      onStop: () => {
        clearInterval(timer);
        toggle.textContent = 'Start';
        toggle.classList.remove('active');
        $$('span', beats).forEach((d) => d.classList.remove('on'));
      },
    });
  }
  const restart = () => { if (transport.isOwner(owner)) { transport.stop(); start(); } };

  toggle.addEventListener('click', () => (transport.isOwner(owner) ? transport.stop() : start()));
  range.addEventListener('input', () => setBpm(+range.value));
  el.addEventListener('click', (e) => { const b = e.target.closest('[data-d]'); if (b) setBpm(bpm + +b.dataset.d); });
  $('.sel-beats', el).addEventListener('change', (e) => { beatsPerBar = +e.target.value; drawBeats(); restart(); });
  $('.sel-sub', el).addEventListener('change', (e) => { sub = +e.target.value; restart(); });

  let taps = [];
  $('.tap', el).addEventListener('click', () => {
    const now = performance.now();
    taps = taps.filter((t) => now - t < 2500);
    taps.push(now);
    if (taps.length >= 2) {
      const recent = taps.slice(-5);
      setBpm(60000 / ((recent[recent.length - 1] - recent[0]) / (recent.length - 1)));
    }
  });
  return () => clearInterval(timer);
}
