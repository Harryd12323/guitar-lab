// Strings are listed thickest (low E) to thinnest (high e).
// frets: -1 = muted, 0 = open, n = fret number. fingers: 0 = none, 1-4 = finger.
// A finger number on two strings at the same fret is a barre.
export const STRING_NAMES = ['E', 'A', 'D', 'G', 'B', 'e'];
export const OPEN_MIDI = [40, 45, 50, 55, 59, 64];

export const CHORDS = {
  Em: { name: 'E minor', frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0] },
  A:  { name: 'A major', frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0] },
  D:  { name: 'D major', frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2] },
  E:  { name: 'E major', frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0] },
  Am: { name: 'A minor', frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0] },
  C:  { name: 'C major', frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0] },
  G:  { name: 'G major', frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3] },
  F:  { name: 'F major (simplified)', frets: [-1, -1, 3, 2, 1, 1], fingers: [0, 0, 3, 2, 1, 1] },
  E5: { name: 'E5 power chord', frets: [0, 2, 2, -1, -1, -1], fingers: [0, 1, 3, 0, 0, 0] },
  A5: { name: 'A5 power chord', frets: [-1, 0, 2, 2, -1, -1], fingers: [0, 0, 1, 3, 0, 0] },
  G5: { name: 'G5 power chord', frets: [3, 5, 5, -1, -1, -1], fingers: [1, 3, 4, 0, 0, 0] },
  C5: { name: 'C5 power chord', frets: [-1, 3, 5, 5, -1, -1], fingers: [0, 1, 3, 4, 0, 0] },
  D5: { name: 'D5 power chord', frets: [-1, 5, 7, 7, -1, -1], fingers: [0, 1, 3, 4, 0, 0] },
};

// Curriculum order: the order chords are introduced.
export const CHORD_ORDER = ['Em', 'A', 'D', 'E', 'Am', 'C', 'G', 'F', 'E5', 'A5', 'G5', 'C5', 'D5'];
export const OPEN_CHORDS = CHORD_ORDER.slice(0, 8);

// Canonical key for an unordered pair, so D→A and A→D share one history.
export function pairKey(a, b) {
  return [a, b].sort((x, y) => CHORD_ORDER.indexOf(x) - CHORD_ORDER.indexOf(y)).join('-');
}

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

// Scale shapes: [string index, fret, finger, isRoot].
export const SCALES = {
  'am-pent-1': {
    name: 'A minor pentatonic, box 1',
    notes: [
      [0, 5, 1, true], [0, 8, 4], [1, 5, 1], [1, 7, 3], [2, 5, 1], [2, 7, 3, true],
      [3, 5, 1], [3, 7, 3], [4, 5, 1], [4, 8, 4], [5, 5, 1, true], [5, 8, 4],
    ],
  },
  'am-pent-2': {
    name: 'A minor pentatonic, box 2',
    notes: [
      [0, 8, 2], [0, 10, 4], [1, 7, 1], [1, 10, 4], [2, 7, 1, true], [2, 10, 4],
      [3, 7, 1], [3, 9, 3], [4, 8, 2], [4, 10, 4, true], [5, 8, 2], [5, 10, 4],
    ],
  },
};
