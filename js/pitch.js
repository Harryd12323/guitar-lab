// YIN pitch detection (de Cheveigné & Kawahara, 2002), hand-written.
// Returns { freq, confidence } or null for silence / no clear pitch.
const MIN_HZ = 60;
const MAX_HZ = 1000;
const THRESHOLD = 0.15;

let diff = null;

export function detectPitch(buf, sampleRate) {
  let rms = 0;
  for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / buf.length);
  if (rms < 0.008) return null;

  const tauMin = Math.floor(sampleRate / MAX_HZ);
  const tauMax = Math.min(Math.floor(sampleRate / MIN_HZ), Math.floor(buf.length / 2));
  const W = buf.length - tauMax;
  if (!diff || diff.length !== tauMax + 1) diff = new Float32Array(tauMax + 1);

  // Steps 1–2: difference function.
  for (let tau = 1; tau <= tauMax; tau++) {
    let sum = 0;
    for (let i = 0; i < W; i++) {
      const d = buf[i] - buf[i + tau];
      sum += d * d;
    }
    diff[tau] = sum;
  }
  // Step 3: cumulative mean normalised difference.
  diff[0] = 1;
  let running = 0;
  for (let tau = 1; tau <= tauMax; tau++) {
    running += diff[tau];
    diff[tau] = running ? (diff[tau] * tau) / running : 1;
  }
  // Step 4: first dip under the threshold, then walk to its local minimum.
  let tau = -1;
  for (let t = tauMin; t <= tauMax; t++) {
    if (diff[t] < THRESHOLD) {
      while (t + 1 <= tauMax && diff[t + 1] < diff[t]) t++;
      tau = t;
      break;
    }
  }
  if (tau < 0) return null;
  // Step 5: parabolic interpolation for sub-sample accuracy.
  let better = tau;
  if (tau > 1 && tau < tauMax) {
    const a = diff[tau - 1], b = diff[tau], c = diff[tau + 1];
    const denom = a + c - 2 * b;
    if (denom) better = tau + (a - c) / (2 * denom);
  }
  return { freq: sampleRate / better, confidence: 1 - diff[tau] };
}

const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
export function freqToNote(freq) {
  const midiF = 69 + 12 * Math.log2(freq / 440);
  const midi = Math.round(midiF);
  return { midi, name: NOTE_NAMES[((midi % 12) + 12) % 12], octave: Math.floor(midi / 12) - 1, cents: (midiF - midi) * 100 };
}
export const centsBetween = (freq, targetFreq) => 1200 * Math.log2(freq / targetFreq);
