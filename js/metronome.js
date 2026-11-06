import { getCtx, click } from './audio.js';

const LOOKAHEAD = 0.12; // seconds of audio scheduled ahead
const TICK_MS = 25;

// Schedules clicks on the audio clock (sample-accurate) and steps in eighth
// notes so the strumming grids can follow "1 & 2 & ...". Only quarters click.
export function createMetronome({ onStep, onState }) {
  let bpm = 80;
  let running = false;
  let timer = null;
  let nextTime = 0;
  let step = 0;
  const pending = new Set();

  function schedule() {
    const ctx = getCtx();
    while (nextTime < ctx.currentTime + LOOKAHEAD) {
      if (step % 2 === 0) click(nextTime, step === 0);
      const s = step;
      const id = setTimeout(() => { pending.delete(id); onStep(s); }, Math.max(0, (nextTime - ctx.currentTime) * 1000));
      pending.add(id);
      nextTime += 30 / bpm;
      step = (step + 1) % 8;
    }
  }

  return {
    get bpm() { return bpm; },
    get running() { return running; },
    setBpm(v) { bpm = Math.min(220, Math.max(40, Math.round(v))); return bpm; },
    start() {
      if (running) return;
      const ctx = getCtx();
      running = true;
      step = 0;
      nextTime = ctx.currentTime + 0.08;
      schedule();
      timer = setInterval(schedule, TICK_MS);
      onState(true);
    },
    stop() {
      if (!running) return;
      running = false;
      clearInterval(timer);
      pending.forEach(clearTimeout);
      pending.clear();
      onStep(-1);
      onState(false);
    },
    toggle() { running ? this.stop() : this.start(); },
  };
}
