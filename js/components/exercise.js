// Looping rhythm / note exercise with a tempo ladder.
// After each loop ("rep") you say whether it was clean; 3 clean reps at a
// tempo offer +4 BPM. The max clean tempo is saved per exercise.
import * as transport from '../transport.js';
import { strum, chuck, note } from '../audio.js';
import { CHORDS } from '../chords.js';
import { scaleDiagram } from '../fretboard.js';
import { skill, logRep, acceptOffer } from '../skills.js';
import { chordViewer } from './chordviewer.js';
import { strumLane } from './lane.js';
import { tabView, parseNote } from './tab.js';
import { html, $, clamp, toast } from '../util.js';

export function exercise(host, lesson, { memory = false } = {}) {
  const { id, ex } = lesson;
  const isNotes = !!ex.seq;
  const chords = ex.chords || [];
  const bpc = ex.barsPerChord || 1;
  const repBars = ex.repBars || 4;
  let bpm = skill(id).bpm || ex.bpm;
  const owner = {};
  const session = { reps: 0, clean: 0 };

  const root = html(`
    <div class="ex-card card">
      <div class="offer" hidden></div>
      ${chords.length > 1 ? `<div class="prog-strip">${chords.map((c, i) => `<span class="prog-chip" data-i="${i}">${c || 'solo'}</span>`).join('')}</div>` : ''}
      <div class="ex-visual"></div>
      <div class="ex-lane"></div>
      <div class="tempo-row">
        <button class="icon-btn round" type="button" data-t="-4" aria-label="4 BPM slower">−</button>
        <div class="tempo-readout"><strong class="ex-bpm">${bpm}</strong> BPM<small class="ex-best"></small></div>
        <button class="icon-btn round" type="button" data-t="4" aria-label="4 BPM faster">+</button>
      </div>
      <label class="check-row"><input type="checkbox" class="ex-guide"> <span>Play along with me (guide sound)</span></label>
      <button class="btn primary wide ex-start" type="button">Start loop</button>
      <div class="rep-prompt" hidden>
        <p class="rep-q"></p>
        <div class="btn-row"><button class="btn primary" type="button" data-rep="1">Clean ✓</button><button class="btn" type="button" data-rep="0">Not yet</button></div>
      </div>
      <p class="ex-status small muted" aria-live="polite"></p>
      <p class="small muted honesty">You decide what “clean” means: the app can’t hear you. Every string ringing, no stopping, in time.</p>
    </div>`);
  host.append(root);

  const $bpm = $('.ex-bpm', root);
  const $best = $('.ex-best', root);
  const $start = $('.ex-start', root);
  const $prompt = $('.rep-prompt', root);
  const $status = $('.ex-status', root);
  const $offer = $('.offer', root);
  const guide = $('.ex-guide', root);
  const visual = $('.ex-visual', root);

  let viewer = null;
  if (lesson.scale) visual.append(scaleDiagram(lesson.scale));
  else if (!isNotes && chords.some(Boolean)) viewer = chordViewer(visual, { chord: chords.find(Boolean), controls: false, help: memory ? 2 : 'auto' });
  else if (!isNotes) visual.innerHTML = '<p class="open-note">Open strings: no fingers on the neck.</p>';

  const lane = isNotes ? null : strumLane($('.ex-lane', root), ex.pattern);
  const tab = isNotes ? tabView($('.ex-lane', root), ex.seq, { chordsLabel: ex.chordsLabel }) : null;

  function renderBest() {
    const sk = skill(id);
    const parts = [];
    if (sk.best) parts.push(`best clean ${sk.best}`);
    if (ex.target) parts.push(`goal ${ex.target}`);
    $best.textContent = parts.length ? ` · ${parts.join(' · ')}` : '';
  }
  function setBpm(v) {
    bpm = clamp(v, 40, 220);
    $bpm.textContent = bpm;
    transport.setBpm(bpm);
  }
  function showOffer(next) {
    $offer.hidden = false;
    $offer.innerHTML = `<p><strong>3 clean reps at ${next - 4} BPM.</strong> Ready for ${next}?</p>
      <div class="btn-row"><button class="btn primary" type="button" data-offer="1">Go to ${next} BPM</button><button class="btn" type="button" data-offer="0">Stay at ${next - 4}</button></div>`;
  }
  const pending = skill(id).offer;
  if (pending) showOffer(pending);
  renderBest();

  const chordAt = (bar) => chords[Math.floor(bar / bpc) % chords.length];
  const seqAt = (evt) => ex.seq[(evt.bar * 8 + evt.stepInBar) % ex.seq.length];

  function onSchedule(evt) {
    if (!guide.checked || evt.countIn) return;
    const len = evt.duration * 0.9;
    if (isNotes) {
      const n = parseNote(seqAt(evt));
      if (n) note(n.string, n.fret, { when: evt.time, length: evt.duration * 1.8 });
      return;
    }
    const c = chordAt(evt.bar);
    const t = ex.pattern[evt.stepInBar];
    if (!c || t === '.') return;
    if (t === 'X' || t === 'x') { chuck({ when: evt.time }); return; }
    const palm = ex.palm === true || (ex.palm === 'accent' && !(evt.stepInBar === 0 && evt.bar % bpc === 0));
    strum(CHORDS[c], { when: evt.time, dir: t === 'U' ? 'up' : 'down', length: palm ? len * 0.6 : undefined });
  }

  let lastRepBar = 0;
  function onStep(evt) {
    if (evt.countIn) {
      $status.textContent = `Count-in: ${evt.beat + 1}…`;
      return;
    }
    if (evt.stepInBar === 0) {
      $status.textContent = `Bar ${(evt.bar % repBars) + 1} of ${repBars} · rep ${Math.floor(evt.bar / repBars) + 1}`;
      if (viewer) {
        const c = chordAt(evt.bar);
        if (c && c !== viewer.key) viewer.show(c);
      }
      root.querySelectorAll('.prog-chip').forEach((chip) => chip.classList.toggle('now', +chip.dataset.i === Math.floor(evt.bar / bpc) % chords.length));
      if (evt.bar > 0 && evt.bar % repBars === 0 && evt.bar !== lastRepBar) {
        lastRepBar = evt.bar;
        askRep(evt.bar / repBars);
      }
    }
    if (evt.stepInBar === 6 && chords.length > 1) {
      const nowI = Math.floor(evt.bar / bpc) % chords.length;
      const nextI = Math.floor((evt.bar + 1) / bpc) % chords.length;
      root.querySelectorAll('.prog-chip').forEach((chip) => chip.classList.toggle('next', nextI !== nowI && +chip.dataset.i === nextI));
    }
    if (tab) tab.highlight((evt.bar * 8 + evt.stepInBar) % ex.seq.length);
  }

  function askRep(n) {
    $prompt.hidden = false;
    $('.rep-q', root).textContent = `Rep ${n} at ${bpm} BPM: was it clean?`;
    $prompt.dataset.bpm = bpm;
  }

  function stopUI() {
    $start.textContent = 'Start loop';
    $start.classList.remove('active');
    if (lane) lane.update(null);
    if (tab) tab.highlight(-1);
    root.querySelectorAll('.prog-chip').forEach((c) => c.classList.remove('now', 'next'));
    $status.textContent = session.reps ? `This session: ${session.clean} of ${session.reps} reps clean.` : '';
  }

  $start.addEventListener('click', () => {
    if (transport.isOwner(owner)) { transport.stop(); return; }
    lastRepBar = 0;
    $start.textContent = 'Stop';
    $start.classList.add('active');
    transport.start({
      owner, bpm, sub: 2, beatsPerBar: 4, countInBars: 1,
      onSchedule, onStep,
      onFrame: (pos) => {
        if (!lane || !pos.evt) return;
        lane.update(pos.evt.stepInBar + pos.frac);
      },
      onStop: stopUI,
    });
  });

  root.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.t) setBpm(bpm + +t.dataset.t);
    if (t.dataset.rep) {
      const clean = t.dataset.rep === '1';
      const at = +$prompt.dataset.bpm;
      session.reps++;
      if (clean) session.clean++;
      $prompt.hidden = true;
      const prevBest = skill(id).best || 0;
      const offer = logRep(id, at, clean);
      if (clean && at > prevBest && prevBest) toast(`New max clean tempo: ${at} BPM`);
      renderBest();
      if (offer) showOffer(offer);
      if (!transport.isOwner(owner)) stopUI();
    }
    if (t.dataset.offer) {
      const take = t.dataset.offer === '1';
      const next = skill(id).offer;
      acceptOffer(id, take);
      if (take && next) setBpm(next);
      $offer.hidden = true;
    }
  });

  return {
    // Suggested self-rating from this session's reps: 2 clean, 1 mostly, 0 struggled.
    suggestion: () => (session.reps ? (session.clean / session.reps >= 0.67 ? 2 : session.clean / session.reps >= 0.34 ? 1 : 0) : null),
    stop: () => transport.isOwner(owner) && transport.stop(),
  };
}
