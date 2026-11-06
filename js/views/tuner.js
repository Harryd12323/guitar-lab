// Mic tuner. Advice only: it never blocks progress and never says "wrong".
import { getCtx, pluck, midiToFreq, setSessionType } from '../audio.js';
import { detectPitch, freqToNote, centsBetween } from '../pitch.js';
import { OPEN_MIDI } from '../chords.js';
import { $, $$ } from '../util.js';

const STRINGS = [['E', '6th'], ['A', '5th'], ['D', '4th'], ['G', '3rd'], ['B', '2nd'], ['e', '1st']];
const STABLE_FRAMES = 5;     // frames that must agree before the shown note changes
const MIN_CONFIDENCE = 0.88;
const IN_TUNE = 5;           // ± cents

export function tunerView(el) {
  el.innerHTML = `
    <section class="page-head"><h1>Tuner</h1>
    <p class="muted">Standard tuning, thick to thin: E A D G B E.</p></section>
    <div class="card tuner">
      <div class="tuner-intro">
        <p>The tuner listens through your microphone to hear which note you’re playing. The sound is analysed on this device and never recorded or sent anywhere.</p>
        <button class="btn primary wide mic-start" type="button">Allow microphone and start</button>
        <p class="small muted">Your browser will ask for permission. On iPhone, tap <em>Allow</em>.</p>
      </div>
      <div class="tuner-live" hidden>
        <p class="tuner-heard small muted" aria-live="polite">Pluck one string and let it ring…</p>
        <div class="tuner-note"><span class="tn-name">–</span><small class="tn-oct"></small></div>
        <div class="gauge" aria-hidden="true">
          <div class="gauge-scale"><span>−50</span><span>0</span><span>+50</span></div>
          <div class="gauge-track"><span class="gauge-zone"></span><span class="gauge-needle"></span></div>
        </div>
        <p class="tuner-advice" aria-live="polite"></p>
        <button class="link-btn mic-stop" type="button">Stop listening</button>
      </div>
      <p class="tuner-error note-box" hidden></p>
    </div>
    <section class="section">
      <h2>Target string</h2>
      <div class="string-row targets" role="radiogroup" aria-label="Target string">
        <button class="note-btn" type="button" role="radio" aria-checked="true" data-target="auto">Auto<small>closest</small></button>
        ${STRINGS.map(([n, num], i) => `<button class="note-btn" type="button" role="radio" aria-checked="false" data-target="${i}">${n}<small>${num}</small></button>`).join('')}
      </div>
      <p class="small muted">Tap a string to pick it as the target and hear its reference note.</p>
    </section>`;

  const live = $('.tuner-live', el);
  const intro = $('.tuner-intro', el);
  const errBox = $('.tuner-error', el);
  const nameEl = $('.tn-name', el);
  const octEl = $('.tn-oct', el);
  const needle = $('.gauge-needle', el);
  const advice = $('.tuner-advice', el);
  const heard = $('.tuner-heard', el);

  let target = 'auto';
  let stream = null;
  let analyser = null;
  let raf = 0;
  let buf = null;
  let candidate = null;
  let candidateCount = 0;
  let shown = null;
  let cents = 0;
  let lastHeard = 0;
  let frame = 0;

  function closestString(freq) {
    let best = 0;
    OPEN_MIDI.forEach((m, i) => {
      if (Math.abs(centsBetween(freq, midiToFreq(m))) < Math.abs(centsBetween(freq, midiToFreq(OPEN_MIDI[best])))) best = i;
    });
    return best;
  }

  function render(freq) {
    const n = freqToNote(freq);
    const s = target === 'auto' ? closestString(freq) : target;
    const c = centsBetween(freq, midiToFreq(OPEN_MIDI[s]));
    const key = `${n.midi}|${s}`;
    if (key === candidate) candidateCount++;
    else { candidate = key; candidateCount = 1; }
    if (candidateCount < STABLE_FRAMES && shown !== key) return;
    if (shown !== key) cents = c;
    shown = key;
    cents = cents * 0.7 + c * 0.3;
    lastHeard = performance.now();

    nameEl.textContent = n.name;
    octEl.textContent = n.octave;
    live.classList.remove('stale');
    const [sName, sNum] = STRINGS[s];
    const sameNote = n.midi === OPEN_MIDI[s];
    heard.textContent = `Sounds like ${n.name}${n.octave} · target: ${sName} string (${sNum})`;
    const shownC = Math.max(-50, Math.min(50, cents));
    needle.style.left = `${50 + shownC}%`;
    const abs = Math.abs(cents);
    live.classList.toggle('in-tune', abs <= IN_TUNE);
    if (abs <= IN_TUNE) advice.textContent = `In tune ✓ (${sName})`;
    else if (!sameNote && abs > 50) advice.textContent = cents < 0 ? `Quite a bit below ${sName}: tighten slowly` : `Quite a bit above ${sName}: loosen it a little`;
    else advice.textContent = cents < 0 ? `A little low (${Math.round(cents)} cents): tighten slightly` : `A little high (+${Math.round(cents)} cents): loosen slightly`;
  }

  function loop() {
    raf = requestAnimationFrame(loop);
    if (frame++ % 2) return;
    if (analyser.getFloatTimeDomainData) analyser.getFloatTimeDomainData(buf);
    else {
      const bytes = new Uint8Array(buf.length);
      analyser.getByteTimeDomainData(bytes);
      for (let i = 0; i < bytes.length; i++) buf[i] = (bytes[i] - 128) / 128;
    }
    const p = detectPitch(buf, analyser.context.sampleRate);
    if (p && p.confidence >= MIN_CONFIDENCE && p.freq > 60 && p.freq < 1000) render(p.freq);
    else if (performance.now() - lastHeard > 1500) live.classList.add('stale');
  }

  async function startMic() {
    errBox.hidden = true;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      errBox.hidden = false;
      errBox.textContent = 'This browser can’t use the microphone here. You can still tune by ear with the reference notes below.';
      return;
    }
    try {
      setSessionType('play-and-record');
      const ctx = getCtx();
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      const src = ctx.createMediaStreamSource(stream);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1400;
      analyser = ctx.createAnalyser();
      analyser.fftSize = 4096;
      buf = new Float32Array(analyser.fftSize);
      src.connect(lp);
      lp.connect(analyser);
      intro.hidden = true;
      live.hidden = false;
      loop();
    } catch (err) {
      setSessionType('playback');
      errBox.hidden = false;
      errBox.textContent = err && err.name === 'NotAllowedError'
        ? 'Microphone access was blocked. On iPhone: Settings → Apps → Safari → Microphone (or tap “aA” in the address bar → Website Settings). You can still tune by ear with the reference notes below.'
        : 'Couldn’t start the microphone. You can still tune by ear with the reference notes below.';
    }
  }

  function stopMic() {
    cancelAnimationFrame(raf);
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null;
    setSessionType('playback');
    live.hidden = true;
    intro.hidden = false;
    shown = null;
  }

  $('.mic-start', el).addEventListener('click', startMic);
  $('.mic-stop', el).addEventListener('click', stopMic);
  $('.targets', el).addEventListener('click', (e) => {
    const b = e.target.closest('[data-target]');
    if (!b) return;
    target = b.dataset.target === 'auto' ? 'auto' : +b.dataset.target;
    $$('[data-target]', el).forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    shown = null;
    if (target !== 'auto') pluck(OPEN_MIDI[target]);
  });
  return stopMic;
}
