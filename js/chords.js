// Strings are listed thickest (low E) to thinnest (high e).
// frets: -1 = muted, 0 = open, n = fret number. fingers: 0 = none, 1-4 = finger.
export const STRING_NAMES = ['E', 'A', 'D', 'G', 'B', 'e'];
export const OPEN_MIDI = [40, 45, 50, 55, 59, 64];

export const CHORDS = {
  Em: { name: 'E minor', frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0] },
  Am: { name: 'A minor', frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0] },
  C:  { name: 'C major', frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0] },
  G:  { name: 'G major', frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3] },
  D:  { name: 'D major', frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2] },
  E:  { name: 'E major', frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0] },
  A:  { name: 'A major', frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0] },
};

export const CHORD_ORDER = ['Em', 'Am', 'C', 'G', 'D', 'E', 'A'];

const FINGER_NAMES = ['', 'index', 'middle', 'ring', 'pinky'];

export function describeChord(key) {
  const c = CHORDS[key];
  const parts = c.frets.map((f, s) => {
    const str = `${STRING_NAMES[s]} string`;
    if (f === -1) return `${str} muted`;
    if (f === 0) return `${str} open`;
    return `${str} fret ${f} with ${FINGER_NAMES[c.fingers[s]]} finger`;
  });
  return `${c.name}: ${parts.join(', ')}.`;
}
