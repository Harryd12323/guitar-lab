import { OPEN_MIDI } from './chords.js';

let ctx = null;
let out = null;
const buffers = new Map();
let ringing = [];

// iOS mutes Web Audio when the ring/silent switch is on silent unless the
// session is "playback" (Safari 17+). The tuner switches to play-and-record.
export function setSessionType(type) {
  try { if (navigator.audioSession) navigator.audioSession.type = type; } catch (e) { /* unsupported */ }
}

// Created lazily on the first tap: browsers only allow audio after a user gesture.
export function getCtx() {
  if (!ctx) {
    setSessionType('playback');
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC({ latencyHint: 'interactive' });
    const comp = ctx.createDynamicsCompressor();
    out = ctx.createGain();
    out.gain.value = 0.9;
    out.connect(comp);
    comp.connect(ctx.destination);
  }
  if (ctx.state !== 'running') ctx.resume();
  return ctx;
}
export const now = () => getCtx().currentTime;

export const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

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
    prev = prev * 0.45 + (Math.random() * 2 - 1) * 0.55; // softened noise = softer pick attack
    d[i] = prev;
  }
  for (let i = N; i < len; i++) d[i] = 0.4985 * (d[i - N] + d[i - N + 1]);
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

function voice(midi, when, volume, length) {
  const src = ctx.createBufferSource();
  src.buffer = pluckBuffer(midi);
  const g = ctx.createGain();
  g.gain.setValueAtTime(volume, when);
  src.connect(g);
  g.connect(out);
  src.start(when);
  if (length) {
    g.gain.setTargetAtTime(0, when + length, 0.03);
    src.stop(when + length + 0.3);
  }
  const v = { src, g, when };
  ringing.push(v);
  src.onended = () => { ringing = ringing.filter((x) => x !== v); };
}

// A new strum damps what's still ringing, like a real hand would.
function damp(at) {
  for (const v of ringing) {
    if (v.when >= at) continue;
    v.g.gain.cancelScheduledValues(at);
    v.g.gain.setTargetAtTime(0, at, 0.015);
  }
  ringing = ringing.filter((v) => v.when >= at);
}

// dir: 'down' (thick→thin) or 'up' (thin strings only, lighter).
export function strum(chord, { when, dir = 'down', volume = 0.32, length } = {}) {
  getCtx();
  const t0 = when ?? ctx.currentTime + 0.02;
  damp(t0);
  let strings = chord.frets.map((f, s) => [s, f]).filter(([, f]) => f >= 0);
  if (dir === 'up') strings = strings.reverse().slice(0, 4);
  const gap = dir === 'up' ? 0.018 : 0.03;
  strings.forEach(([s, f], i) => voice(OPEN_MIDI[s] + f, t0 + i * gap, dir === 'up' ? volume * 0.7 : volume, length));
}

// Muted "chuck": a short percussive noise burst through a band-pass filter.
export function chuck({ when } = {}) {
  getCtx();
  const t0 = when ?? ctx.currentTime + 0.01;
  damp(t0);
  const len = Math.floor(ctx.sampleRate * 0.06);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1400;
  bp.Q.value = 0.8;
  const g = ctx.createGain();
  g.gain.value = 0.7;
  src.connect(bp);
  bp.connect(g);
  g.connect(out);
  src.start(t0);
}

// One note: string index 0-5 (thick→thin) and fret.
export function note(string, fret, { when, length, volume = 0.5 } = {}) {
  getCtx();
  const t0 = when ?? ctx.currentTime + 0.01;
  damp(t0);
  voice(OPEN_MIDI[string] + fret, t0, volume, length);
}

export function pluck(midi) {
  getCtx();
  const t0 = ctx.currentTime + 0.01;
  damp(t0);
  voice(midi, t0, 0.6);
}

export function click(when, accent, volume = 1) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.frequency.value = accent ? 1760 : 1100;
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime((accent ? 0.9 : 0.5) * volume, when + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
  o.connect(g);
  g.connect(out);
  o.start(when);
  o.stop(when + 0.06);
}

export function chime() {
  getCtx();
  const t = ctx.currentTime + 0.01;
  [76, 83].forEach((m, i) => voice(m, t + i * 0.12, 0.35));
}
