// One shared transport for the metronome, exercises, loops and timing games.
//
// Timing: every click is scheduled on AudioContext.currentTime, at most
// LOOKAHEAD seconds ahead. A worker only wakes the scheduler up. The UI reads
// the audio clock each animation frame, so visuals follow the sound, not timers.
import { getCtx, click } from './audio.js';

const LOOKAHEAD = 0.12;

let worker = null;
let fallbackTimer = null;
let running = false;
let opts = null;
let nextTime = 0;
let index = 0;
let queue = [];
let current = null;
let raf = 0;
let owner = null;
const stepListeners = new Set();

function wake(on) {
  if (!worker && typeof Worker !== 'undefined') {
    try {
      worker = new Worker('js/tick-worker.js');
      worker.onmessage = schedule;
    } catch (e) { worker = null; }
  }
  if (worker) worker.postMessage(on ? 'start' : 'stop');
  else {
    clearInterval(fallbackTimer);
    if (on) fallbackTimer = setInterval(schedule, 25);
  }
}

const stepDur = () => 60 / opts.bpm / opts.sub;

function makeEvent(i, time) {
  const stepsPerBar = opts.beatsPerBar * opts.sub;
  const countInSteps = opts.countInBars * stepsPerBar;
  const countIn = i < countInSteps;
  const rel = countIn ? i : i - countInSteps;
  const bar = countIn ? -1 : Math.floor(rel / stepsPerBar);
  const stepInBar = rel % stepsPerBar;
  return {
    time, index: i, countIn, bar, stepInBar,
    beat: Math.floor(stepInBar / opts.sub),
    isBeat: stepInBar % opts.sub === 0,
    duration: stepDur(),
  };
}

function schedule() {
  if (!running) return;
  const ctx = getCtx();
  while (nextTime < ctx.currentTime + LOOKAHEAD) {
    const evt = makeEvent(index, nextTime);
    if (opts.stopAfterBars && evt.bar >= opts.stopAfterBars) { stopAt(evt.time); return; }
    const audible = opts.click && (evt.isBeat || opts.clickSubs) && !(opts.silent && opts.silent(evt));
    if (audible) click(evt.time, evt.stepInBar === 0 && opts.accent, evt.isBeat ? (evt.countIn ? 0.8 : 1) : 0.4);
    if (opts.onSchedule) opts.onSchedule(evt);
    queue.push(evt);
    nextTime += stepDur();
    index++;
  }
}

function stopAt(time) {
  running = false;
  wake(false);
  opts.endTime = time;
}

function frame() {
  const ctx = getCtx();
  const t = ctx.currentTime;
  while (queue.length && queue[0].time <= t) {
    current = queue.shift();
    stepListeners.forEach((l) => l(current));
    if (opts.onStep) opts.onStep(current);
  }
  if (opts.onFrame) opts.onFrame(position(t));
  if (!running && opts.endTime != null && t >= opts.endTime) {
    finish(true);
    return;
  }
  raf = requestAnimationFrame(frame);
}

// Continuous position in steps (e.g. 3.5 = halfway between step 3 and 4).
function position(t) {
  if (!current) return { step: -1, evt: null };
  const frac = Math.min(1, Math.max(0, (t - current.time) / current.duration));
  return { step: current.index + frac, evt: current, frac };
}

function finish(natural) {
  cancelAnimationFrame(raf);
  raf = 0;
  running = false;
  wake(false);
  queue = [];
  current = null;
  const o = opts;
  opts = null;
  owner = null;
  stepListeners.forEach((l) => l(null));
  if (o && o.onStop) o.onStop({ natural });
}

/**
 * start({ bpm, beatsPerBar=4, sub=1|2, countInBars=0, accent=true, click=true,
 *         clickSubs, silent(evt), onSchedule(evt), onStep(evt), onFrame(pos), onStop(),
 *         stopAfterBars, owner })
 */
export function start(o) {
  stop();
  const ctx = getCtx();
  opts = { beatsPerBar: 4, sub: 1, countInBars: 0, accent: true, click: true, ...o };
  owner = o.owner || null;
  index = 0;
  queue = [];
  current = null;
  nextTime = ctx.currentTime + 0.1;
  running = true;
  schedule();
  wake(true);
  raf = requestAnimationFrame(frame);
}

export function stop() {
  if (opts) finish(false);
}

export const isRunning = () => !!opts;
export const isOwner = (o) => !!opts && owner === o;
export const getBpm = () => (opts ? opts.bpm : null);
// Tempo changes apply from the next scheduled step.
export function setBpm(bpm) { if (opts) opts.bpm = bpm; }
export function onStep(fn) {
  stepListeners.add(fn);
  return () => stepListeners.delete(fn);
}
