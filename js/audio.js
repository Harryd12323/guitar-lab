import { OPEN_MIDI } from './chords.js';

let ctx = null;
let out = null;
const buffers = new Map();
let ringing = [];

// Created lazily on the first tap: mobile browsers only allow audio after a user gesture.
export function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    out = ctx.createGain();
    out.gain.value = 0.9;
    out.connect(comp);
    comp.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Karplus-Strong plucked string, rendered once per pitch and cached.
function pluckBuffer(midi) {
  if (buffers.has(midi)) return buffers.get(midi);
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * 2.5);
  const buf = ctx.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  const N = Math.round(sr / midiToFreq(midi));
  let prev = 0;
  for (let i = 0; i < N; i++) {
    prev = prev * 0.45 + (Math.random() * 2 - 1) * 0.55; // softened noise burst = softer pick attack
    d[i] = prev;
  }
  for (let i = N; i < len; i++) {
    d[i] = 0.4985 * (d[i - N] + d[i - N + 1]);
  }
  let peak = 0;
  for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(d[i]));
  const fade = Math.floor(sr * 0.3);
  for (let i = 0; i < len; i++) {
    d[i] /= peak || 1;
    if (i > len - fade) d[i] *= (len - i) / fade;
  }
  buffers.set(midi, buf);
  return buf;
}

function playNote(midi, when, volume) {
  const src = ctx.createBufferSource();
  src.buffer = pluckBuffer(midi);
  const g = ctx.createGain();
  g.gain.value = volume;
  src.connect(g);
  g.connect(out);
  src.start(when);
  const voice = { src, g };
  ringing.push(voice);
  src.onended = () => { ringing = ringing.filter((v) => v !== voice); };
}

// A new strum damps whatever is still ringing, like a real hand would.
function damp() {
  const t = ctx.currentTime;
  for (const v of ringing) {
    v.g.gain.cancelScheduledValues(t);
    v.g.gain.setTargetAtTime(0, t, 0.02);
    try { v.src.stop(t + 0.2); } catch (e) { /* already stopped */ }
  }
  ringing = [];
}

export function strum(chord) {
  getCtx();
  damp();
  let t = ctx.currentTime + 0.02;
  chord.frets.forEach((f, s) => {
    if (f < 0) return;
    playNote(OPEN_MIDI[s] + f, t, 0.32);
    t += 0.035;
  });
}

export function pluck(midi) {
  getCtx();
  damp();
  playNote(midi, ctx.currentTime + 0.01, 0.6);
}

export function click(when, accent) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.frequency.value = accent ? 1760 : 1100;
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(accent ? 0.9 : 0.5, when + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
  o.connect(g);
  g.connect(out);
  o.start(when);
  o.stop(when + 0.06);
}
