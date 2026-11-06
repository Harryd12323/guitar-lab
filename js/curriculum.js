// The 90-day path. All text, exercises and riffs are original. Progressions
// are generic (I–IV–V, I–V–vi–IV); no songs, lyrics or tabs from anyone else.
//
// Each lesson trains ONE motor problem. `kind` picks the practice widget:
//   read · tune · quiz-strings · quiz-frets · form · changes · rhythm · notes · mix · check
// Patterns are 8 eighth-note slots: D down, U up, X muted down, x muted up, . ghost (hand moves, no hit).
// Note sequences use "string:fret" with guitar string numbers (6 = thick low E), "-" = rest.

export const PHASES = [
  { id: 'w1', title: 'Week 1', days: 'Days 1–7', sub: 'Orientation and your first chord',
    goal: 'Tune up, sit comfortably, and strum E minor in time with a click.' },
  { id: 'w2', title: 'Week 2', days: 'Days 8–14', sub: 'A and D',
    goal: 'Form A and D so every string rings, and switch between them on the beat.' },
  { id: 'w3', title: 'Week 3', days: 'Days 15–21', sub: 'E, Am and down-up strumming',
    goal: 'Keep your strumming hand moving down and up without stopping.' },
  { id: 'w4', title: 'Week 4', days: 'Days 22–30', sub: 'C, progressions and your month 1 check',
    goal: 'Play a three-chord progression without stopping.' },
  { id: 'm2', title: 'Month 2', days: 'Days 31–60', sub: 'G, F, patterns, riffs and a first scale',
    goal: 'Play I–V–vi–IV with a real strumming pattern, and your first riff and scale.' },
  { id: 'm3', title: 'Month 3', days: 'Days 61–90', sub: 'Power chords, palm muting and improvising',
    goal: 'Play power-chord riffs, improvise a little with the pentatonic, and play from memory.' },
];

export const LEVELS = {
  beginner: { label: 'Complete beginner', desc: 'Never played, or only tried a little.', start: 'w1' },
  novice: { label: 'Novice', desc: 'Can tune up and know the string names. Starts at week 2.', start: 'w2' },
  intermediate: { label: 'Intermediate', desc: 'Know the basic open chords. Starts at day 31: G, F, patterns and riffs.', start: 'm2' },
  advanced: { label: 'Advanced', desc: 'Comfortable with open chords and strumming. Starts at day 61: power chords, palm muting, pentatonic.', start: 'm3' },
  pro: { label: 'Pro', desc: 'Skip the lessons. Go straight to speed, tempo and timing challenges.', start: null },
};

const pentUpDown = (notes) => [...notes, ...[...notes].reverse().slice(1), '-'];
const BOX1 = ['6:5', '6:8', '5:5', '5:7', '4:5', '4:7', '3:5', '3:7', '2:5', '2:8', '1:5', '1:8'];
const BOX2 = ['6:8', '6:10', '5:7', '5:10', '4:7', '4:10', '3:7', '3:9', '2:8', '2:10', '1:8', '1:10'];
const pad8 = (a) => [...a, ...Array((8 - (a.length % 8)) % 8).fill('-')];
const threes = (notes) => pad8(notes.slice(0, -2).flatMap((_, i) => notes.slice(i, i + 3)));

export const LESSONS = [
  /* ---------- Week 1 ---------- */
  {
    id: 'w1-welcome', phase: 'w1', kind: 'read', minutes: 3,
    title: 'How Guitar Lab works',
    goal: 'Know what a daily session looks like.',
    intro: 'Short, focused practice every day beats long sessions once a week. Each day the <strong>Today</strong> tab gives you about 20 minutes: tune up, learn one new thing, fix one weak spot, and review something from before you forget it.',
    steps: [
      'Each lesson trains <strong>one</strong> movement. Forming a chord and switching to it in time are separate lessons.',
      'After practising, rate yourself honestly: <em>Clean</em>, <em>Mostly</em> or <em>Struggled</em>. The app can’t hear you, so your rating is what it uses to plan your next sessions.',
      'Finger numbers: 1 index, 2 middle, 3 ring, 4 pinky. As you get better, the diagrams show less help. You can always peek.',
      'Milestones are goals, not deadlines. Everyone’s hands learn at their own pace.',
    ],
  },
  {
    id: 'w1-tuning', phase: 'w1', kind: 'tune', minutes: 5,
    title: 'Tune your guitar',
    goal: 'Get all six strings to standard tuning: E A D G B E.',
    intro: 'From the <strong>thickest</strong> string to the <strong>thinnest</strong>: <strong>E A D G B E</strong>. One way to remember it: <em>Every Amateur Does Get Better Eventually.</em>',
    steps: [
      'Open the Tuner tab and allow the microphone, or tap the reference notes below and match them by ear.',
      'Pluck one string, then turn its peg slowly. Watch or listen as you turn.',
      'If a string is too high, loosen it a little below the note, then tighten up to it. Tuning upward holds better.',
    ],
    tips: ['Check your tuning every time you pick up the guitar. Strings drift, especially new ones.'],
  },
  {
    id: 'w1-posture', phase: 'w1', kind: 'read', minutes: 4,
    title: 'Posture',
    goal: 'Sit so that neither hand has to fight the guitar.',
    steps: [
      'Sit on the front half of a chair without arms. Back straight, shoulders relaxed.',
      'Rest the guitar’s waist on your right thigh (left thigh if you play left-handed), with the neck angled slightly up.',
      'Your strumming forearm rests on the top edge of the body. It holds the guitar in place, so your fretting hand doesn’t have to.',
      'Fretting hand: thumb behind the neck, roughly behind your middle finger. Wrist loose, not bent hard.',
    ],
    exercise: 'Hold this position for two minutes while you breathe slowly. Notice any tension in your shoulders, wrist or thumb and let it go.',
  },
  {
    id: 'w1-pick', phase: 'w1', kind: 'rhythm', minutes: 5,
    title: 'Pick grip and open strums',
    goal: 'Hold the pick so it neither slips nor clamps.',
    steps: [
      'Curl your index finger. Lay the pick on the side of its top joint, pointing away from you.',
      'Press your thumb flat on top. About a fingernail’s width of tip should poke out.',
      'Strum from the wrist, like shaking water off your hand. Your arm barely moves.',
    ],
    tips: ['If the pick spins, grip a little firmer. If your hand aches, grip a little looser.'],
    exercise: 'No fingers on the neck. Strum all six open strings, one downstroke per click.',
    ex: { chords: [null], pattern: 'D.D.D.D.', bpm: 60, target: 80, repBars: 4 },
  },
  {
    id: 'w1-strings', phase: 'w1', kind: 'quiz-strings', minutes: 4,
    title: 'String names',
    goal: 'Name any string without counting from the top.',
    intro: 'Strings are named by the note they play open: <strong>E A D G B e</strong>, thick to thin. They’re also numbered <strong>6 to 1</strong>: the thick low E is string 6, the thin high e is string 1.',
    exercise: 'Quiz: the diagram highlights a string. Tap its name. Aim for 9 out of 10.',
  },
  {
    id: 'w1-frets', phase: 'w1', kind: 'quiz-frets', minutes: 4,
    title: 'Fret numbers',
    goal: 'Read a fret number off a diagram instantly.',
    intro: 'Frets are numbered from the headstock: the space just behind the first metal bar is <strong>fret 1</strong>. "Open" (0) means no finger at all. Press just <em>behind</em> the metal fret, not on top of it.',
    exercise: 'Quiz: a dot appears on the diagram. Tap its fret number. Aim for 9 out of 10.',
  },
  {
    id: 'w1-single-notes', phase: 'w1', kind: 'notes', minutes: 6,
    title: 'Single-note picking',
    goal: 'Hit one string on purpose, without touching its neighbours.',
    steps: [
      'Rest the side of your picking hand lightly on the bridge for support.',
      'Use small downstrokes. The pick should travel only a few millimetres past the string.',
      'Each string gets one bar of four notes, from the thickest string to the thinnest.',
    ],
    exercise: 'Pick each open string four times on the click. Only the string you aim at should ring.',
    ex: { seq: ['6', '5', '4', '3', '2', '1'].flatMap((s) => [`${s}:0`, '-', `${s}:0`, '-', `${s}:0`, '-', `${s}:0`, '-']), bpm: 60, target: 90, repBars: 6 },
  },
  {
    id: 'w1-pulse', phase: 'w1', kind: 'pulse', minutes: 4,
    title: 'Feel the quarter-note pulse',
    goal: 'Move exactly with the click.',
    intro: 'Most music you know has a steady pulse you can tap your foot to. Those taps are <strong>quarter notes</strong>: "1, 2, 3, 4". Being with the click matters more than being fast.',
    exercise: 'Tap the pad on every click for 16 beats. This one is measured: it shows how close your taps were to the click.',
  },
  {
    id: 'w1-em', phase: 'w1', kind: 'form', chord: 'Em', minutes: 6,
    title: 'Form E minor cleanly',
    goal: 'All six strings ring clearly with Em.',
    steps: [
      'Middle finger (2) on the A string, 2nd fret. Ring finger (3) on the D string, 2nd fret.',
      'Come down on your fingertips, arched like a bridge, so the open strings below can ring.',
      'Pick each string one at a time, thick to thin. Any buzz? Press closer to the fret.',
    ],
    exercise: 'Place the shape, check it string by string, lift off completely, and place it again. Ten times.',
  },
  {
    id: 'w1-em-strum', phase: 'w1', kind: 'rhythm', minutes: 5,
    title: 'Strum E minor on the beat',
    goal: 'One clean downstroke on every click.',
    exercise: 'Hold Em and strum down once per click. Keep your fretting hand still while your strumming hand works.',
    ex: { chords: ['Em'], pattern: 'D.D.D.D.', bpm: 60, target: 80, repBars: 4 },
  },

  /* ---------- Week 2 ---------- */
  {
    id: 'w2-a', phase: 'w2', kind: 'form', chord: 'A', minutes: 6,
    title: 'Form A cleanly',
    goal: 'Three fingers in one fret, all strings from A down ringing.',
    steps: [
      'Fingers 1, 2 and 3 all go in the 2nd fret, on the D, G and B strings.',
      'They can’t all sit right behind the fret, so angle them slightly. That’s fine.',
      'Skip the thick low E string (marked ×).',
    ],
    exercise: 'Place, check string by string, lift. Ten times. Watch for finger 3 muting the high e string.',
  },
  {
    id: 'w2-d', phase: 'w2', kind: 'form', chord: 'D', minutes: 6,
    title: 'Form D cleanly',
    goal: 'A small triangle on the thin strings, four strings ringing.',
    steps: [
      'Index (1) on G string fret 2, ring (3) on B string fret 3, middle (2) on high e fret 2.',
      'Strum only the four thinnest strings. Start your strum on the open D string.',
    ],
    exercise: 'Place, check, lift. Ten times. Then strum four times, aiming only at the four thin strings.',
  },
  {
    id: 'w2-clean', phase: 'w2', kind: 'notes', minutes: 6,
    title: 'Clean fretting, string by string',
    goal: 'Catch buzzing or muted strings in A and D.',
    intro: 'Strumming hides problems. Picking one string at a time shows them.',
    exercise: 'Hold A for two bars and D for two bars, picking one string per click from the lowest string the chord uses. Fix any string that doesn’t ring before moving on.',
    ex: { seq: ['5:0', '-', '4:2', '-', '3:2', '-', '2:2', '-', '1:0', '-', '2:2', '-', '3:2', '-', '4:2', '-',
      '4:0', '-', '3:2', '-', '2:3', '-', '1:2', '-', '2:3', '-', '3:2', '-', '4:0', '-', '-', '-'], chordsLabel: ['A', 'A', 'D', 'D'], bpm: 60, target: 90, repBars: 4 },
  },
  {
    id: 'w2-a-d', phase: 'w2', kind: 'changes', pair: ['A', 'D'], minutes: 5,
    title: 'A ↔ D changes',
    goal: 'Switch between A and D as one movement.',
    steps: [
      'Watch the diagram: going A → D, every finger moves, but only a short distance.',
      'Lift all fingers together, move the shape, and land all fingers at the same time.',
      'Slow and clean beats fast and messy. Only count changes where every string rings.',
    ],
    exercise: 'One-minute changes: tap the button for each clean change.',
  },
  {
    id: 'w2-down60', phase: 'w2', kind: 'rhythm', minutes: 6,
    title: 'Downstrokes at 60 BPM: A and D',
    goal: 'Change chords without breaking the pulse.',
    exercise: 'Four downstrokes on A, four on D. The change happens in the gap after beat 4. Start leaving early.',
    tips: ['Lift your fingers on beat 4 if you need to. A few open strings during the change are normal and fine.'],
    ex: { chords: ['A', 'D'], barsPerChord: 1, pattern: 'D.D.D.D.', bpm: 60, target: 80, repBars: 4 },
  },

  /* ---------- Week 3 ---------- */
  {
    id: 'w3-e', phase: 'w3', kind: 'form', chord: 'E', minutes: 5,
    title: 'Form E major cleanly',
    goal: 'E major is Em plus one finger.',
    steps: [
      'Make Em, then add your index (1) on the G string, 1st fret.',
      'All six strings ring.',
    ],
    exercise: 'Switch between Em and E slowly. Only your index finger should move.',
  },
  {
    id: 'w3-am', phase: 'w3', kind: 'form', chord: 'Am', minutes: 5,
    title: 'Form A minor cleanly',
    goal: 'Same shape as E, one string thinner.',
    steps: [
      'Take the E shape and move it one string thinner, onto the D, G and B strings.',
      'Skip the low E string.',
    ],
    exercise: 'Place, check string by string, lift. Ten times.',
  },
  {
    id: 'w3-e-am', phase: 'w3', kind: 'changes', pair: ['E', 'Am'], minutes: 5,
    title: 'E ↔ Am: move the whole shape',
    goal: 'Move a shape across strings without rebuilding it.',
    intro: 'E and Am use the exact same shape. Watch the diagram: every finger moves one string thinner, together.',
    exercise: 'One-minute changes. Keep the shape frozen as it moves.',
  },
  {
    id: 'w3-mixed', phase: 'w3', kind: 'mix', minutes: 6,
    title: 'Mixed changes',
    goal: 'Switch between any two chords you know.',
    intro: 'Real music doesn’t repeat one pair forever. Mixing pairs trains your hands to find each shape from anywhere.',
    ex: { pairs: [['Em', 'A'], ['A', 'D'], ['E', 'Am'], ['D', 'Em'], ['Am', 'A']] },
  },
  {
    id: 'w3-eighths', phase: 'w3', kind: 'rhythm', minutes: 6,
    title: 'Down-up eighth notes',
    goal: 'Hand moves down on the numbers and up on the "and", without stopping.',
    steps: [
      'Count "1 & 2 & 3 & 4 &" out loud.',
      'Down on the numbers, up on every "&". The upstroke is lighter and only catches the thin strings.',
      'Your hand is a pendulum. It never stops, even when it misses the strings.',
    ],
    ex: { chords: ['Em'], pattern: 'DUDUDUDU', bpm: 60, target: 90, repBars: 4 },
  },
  {
    id: 'w3-eighths-change', phase: 'w3', kind: 'rhythm', minutes: 6,
    title: 'Eighths with chord changes',
    goal: 'Keep the pendulum going through a chord change.',
    tips: ['Use the last upstroke before a change to move. That stroke can hit open strings.'],
    ex: { chords: ['A', 'D', 'E', 'A'], barsPerChord: 1, pattern: 'DUDUDUDU', bpm: 60, target: 85, repBars: 4 },
  },

  /* ---------- Week 4 ---------- */
  {
    id: 'w4-c', phase: 'w4', kind: 'form', chord: 'C', minutes: 7,
    title: 'Form C cleanly',
    goal: 'Stretch across three frets with the G string ringing.',
    steps: [
      'Ring (3) A string fret 3, middle (2) D string fret 2, index (1) B string fret 1.',
      'Keep your ring finger upright. Its fleshy side likes to mute the D string.',
      'Skip the low E string.',
    ],
    exercise: 'Place, check string by string, lift. Ten times. C usually takes longer than the others. That’s expected.',
  },
  {
    id: 'w4-c-am', phase: 'w4', kind: 'changes', pair: ['C', 'Am'], minutes: 5,
    title: 'C ↔ Am in time',
    goal: 'Use anchor fingers so only one finger travels.',
    intro: 'Watch the diagram: fingers 1 and 2 don’t move at all. Only your ring finger travels. Keep the anchors pressed down.',
    exercise: 'One-minute changes.',
  },
  {
    id: 'w4-prog-a', phase: 'w4', kind: 'rhythm', minutes: 6,
    title: 'Three-chord progression: I–IV–V in A',
    goal: 'Play A, D and E in order without stopping.',
    intro: 'I–IV–V is the most common progression in popular music. In the key of A, it’s A, D and E.',
    ex: { chords: ['A', 'D', 'E', 'A'], barsPerChord: 1, pattern: 'D.D.D.D.', bpm: 60, target: 90, repBars: 4 },
  },
  {
    id: 'w4-prog-am', phase: 'w4', kind: 'rhythm', minutes: 6,
    title: 'Minor progression: Am, C, D, Am',
    goal: 'Mix the C change into a progression.',
    ex: { chords: ['Am', 'C', 'D', 'Am'], barsPerChord: 1, pattern: 'DUDUDUDU', bpm: 60, target: 85, repBars: 4 },
  },
  {
    id: 'w4-check', phase: 'w4', kind: 'check', minutes: 10,
    title: 'Month 1 check',
    goal: 'A checkpoint, not an exam.',
    intro: 'If you can’t do all of these yet, keep going. Your Today plan will keep working on whatever is still hard.',
    tasks: [
      { text: 'Tune all six strings', link: '#/tuner' },
      { text: 'Form Em, A, D and C so every string rings', link: '#/chords' },
      { text: 'Play 16 bars of downstrokes on the click without stopping', link: '#/metronome' },
      { text: 'Play A–D–E–A once through without stopping', link: '#/lesson/w4-prog-a' },
    ],
  },

  /* ---------- Month 2 ---------- */
  {
    id: 'm2-g', phase: 'm2', kind: 'form', chord: 'G', minutes: 6,
    title: 'Form G cleanly',
    goal: 'Stretch from the thickest string to the thinnest.',
    steps: [
      'Middle (2) low E fret 3, index (1) A string fret 2, ring (3) high e fret 3.',
      'Let your wrist drop a little behind the neck for the stretch.',
      'All six strings ring.',
    ],
    exercise: 'Place, check string by string, lift. Ten times.',
  },
  {
    id: 'm2-g-c', phase: 'm2', kind: 'changes', pair: ['G', 'C'], minutes: 5,
    title: 'G ↔ C in time',
    goal: 'A big move done as one shape.',
    intro: 'Every finger moves here. Lead with your ring finger: it has the farthest to go.',
    exercise: 'One-minute changes.',
  },
  {
    id: 'm2-g-prog', phase: 'm2', kind: 'rhythm', minutes: 6,
    title: 'I–V–vi–IV in G: G, D, Em, C',
    goal: 'Play four chords in a loop.',
    intro: 'I–V–vi–IV is a generic four-chord loop used in countless songs. Here it’s in G.',
    ex: { chords: ['G', 'D', 'Em', 'C'], barsPerChord: 1, pattern: 'D.D.D.D.', bpm: 60, target: 90, repBars: 4 },
  },
  {
    id: 'm2-f', phase: 'm2', kind: 'form', chord: 'F', minutes: 7,
    title: 'Form simplified F',
    goal: 'Your first mini-barre: index across two strings.',
    steps: [
      'Lay your index (1) flat across the B and high e strings at fret 1.',
      'Middle (2) on G string fret 2, ring (3) on D string fret 3.',
      'Strum only the four thinnest strings. Roll your index slightly onto its bony edge for a cleaner barre.',
    ],
    tips: ['The full six-string F barre comes much later. This version sounds good and builds the strength for it.'],
    exercise: 'Place, check string by string, lift. Ten times. The high e is usually the string that buzzes.',
  },
  {
    id: 'm2-c-f', phase: 'm2', kind: 'changes', pair: ['C', 'F'], minutes: 5,
    title: 'C ↔ F changes',
    goal: 'Keep the index finger as a pivot.',
    intro: 'Your index stays on fret 1 and flattens into the barre. Middle and ring each move one string.',
    exercise: 'One-minute changes.',
  },
  {
    id: 'm2-am-f', phase: 'm2', kind: 'changes', pair: ['Am', 'F'], minutes: 5,
    title: 'Am ↔ F changes',
    goal: 'Flatten and lift the index without losing the shape.',
    exercise: 'One-minute changes.',
  },
  {
    id: 'm2-pattern', phase: 'm2', kind: 'rhythm', minutes: 7,
    title: 'The everyday pattern: D · D U · U D U',
    goal: 'Skip strings while the hand keeps moving.',
    intro: 'The gaps are <strong>ghost strokes</strong>: your hand still moves, it just misses the strings. That keeps everything in time.',
    ex: { chords: ['G'], pattern: 'D.DU.UDU', bpm: 60, target: 90, repBars: 4 },
  },
  {
    id: 'm2-pattern-prog', phase: 'm2', kind: 'rhythm', minutes: 7,
    title: 'Everyday pattern over C, G, Am, F',
    goal: 'Hold the pattern through four changes.',
    ex: { chords: ['C', 'G', 'Am', 'F'], barsPerChord: 1, pattern: 'D.DU.UDU', bpm: 60, target: 90, repBars: 4 },
  },
  {
    id: 'm2-mute', phase: 'm2', kind: 'rhythm', minutes: 6,
    title: 'Muted strums',
    goal: 'Add a percussive "chuck" on beats 2 and 4.',
    steps: [
      'Right after a downstroke, relax your fretting fingers so they touch the strings without pressing them down. Strum: you get a dry click instead of a chord.',
      'The pattern: chord on 1 and 3, chuck (×) on 2 and 4, upstrokes in between.',
    ],
    ex: { chords: ['Em', 'G'], barsPerChord: 1, pattern: 'DUXUDUXU', bpm: 60, target: 90, repBars: 4 },
  },
  {
    id: 'm2-riff1', phase: 'm2', kind: 'notes', minutes: 6,
    title: 'Riff: low string walk',
    goal: 'Play a short single-note riff on the two thickest strings.',
    intro: 'An original riff in E minor. Index plays fret 2, ring plays fret 3.',
    ex: { seq: ['6:0', '6:0', '6:2', '6:3', '5:0', '5:2', '5:0', '6:3', '6:0', '6:0', '6:2', '6:3', '5:2', '5:0', '6:3', '6:2'], bpm: 60, target: 100, repBars: 4 },
  },
  {
    id: 'm2-riff2', phase: 'm2', kind: 'notes', minutes: 6,
    title: 'Riff: string-skipping groove',
    goal: 'Jump between strings without looking.',
    intro: 'Another original E minor riff. The low E is the anchor you keep coming back to.',
    ex: { seq: ['6:0', '6:0', '5:2', '6:0', '4:2', '6:0', '5:2', '5:0', '6:0', '6:0', '5:2', '6:0', '4:0', '4:2', '5:2', '5:0'], bpm: 60, target: 100, repBars: 4 },
  },
  {
    id: 'm2-pent1', phase: 'm2', kind: 'notes', scale: 'am-pent-1', minutes: 6,
    title: 'A minor pentatonic, box 1',
    goal: 'Play a five-note scale up and down with one finger per fret.',
    intro: 'Five notes (A C D E G) in one hand position at the 5th fret. Highlighted dots are A, the root.',
    ex: { seq: pentUpDown(BOX1), bpm: 60, target: 100, repBars: 3 },
  },
  {
    id: 'm2-pent-threes', phase: 'm2', kind: 'notes', scale: 'am-pent-1', minutes: 6,
    title: 'Pentatonic in groups of three',
    goal: 'Break the scale into patterns so it stops sounding like a scale.',
    ex: { seq: threes(BOX1), bpm: 60, target: 100, repBars: 4 },
  },
  {
    id: 'm2-check', phase: 'm2', kind: 'check', minutes: 10,
    title: 'Month 2 check',
    goal: 'A checkpoint, not an exam.',
    intro: 'Missing some? Keep going. Your Today plan will keep working on them.',
    tasks: [
      { text: 'G ↔ C: 20 or more clean changes in a minute', link: '#/trainer' },
      { text: 'C–G–Am–F with the everyday pattern, four times through', link: '#/lesson/m2-pattern-prog' },
      { text: 'One of the riffs at 80 BPM', link: '#/lesson/m2-riff1' },
      { text: 'Pentatonic box 1 up and down without looking', link: '#/lesson/m2-pent1' },
    ],
  },

  /* ---------- Month 3 ---------- */
  {
    id: 'm3-power', phase: 'm3', kind: 'form', chord: 'G5', minutes: 6,
    title: 'Power chords',
    goal: 'A two- or three-note shape that works anywhere on the neck.',
    steps: [
      'Index (1) on the low E string, fret 3. Ring (3) and pinky (4) two frets higher on the next two strings.',
      'Only strum those three strings. Let the underside of your index finger lightly touch the other strings to keep them quiet.',
    ],
    exercise: 'Place, strum, lift. Ten times. Then try E5 and A5, which use open strings.',
  },
  {
    id: 'm3-power-move', phase: 'm3', kind: 'rhythm', minutes: 6,
    title: 'Moving power chords',
    goal: 'Slide one shape between strings and frets.',
    intro: 'The shape never changes. Only its position does.',
    ex: { chords: ['G5', 'C5', 'D5', 'C5'], barsPerChord: 1, pattern: 'D.D.D.D.', bpm: 70, target: 110, repBars: 4 },
  },
  {
    id: 'm3-palm', phase: 'm3', kind: 'rhythm', minutes: 6,
    title: 'Palm muting',
    goal: 'A tight, chugging sound.',
    steps: [
      'Rest the edge of your picking hand on the strings right where they leave the bridge.',
      'Too far forward and the notes disappear. Too far back and they ring fully. Find the middle.',
      'All downstrokes, eighth notes.',
    ],
    ex: { chords: ['E5'], pattern: 'DDDDDDDD', palm: true, bpm: 70, target: 120, repBars: 4 },
  },
  {
    id: 'm3-palm-accent', phase: 'm3', kind: 'rhythm', minutes: 6,
    title: 'Palm mute with open accents',
    goal: 'Switch between muted and ringing without losing time.',
    intro: 'Chug muted eighths, then lift your palm for the first beat of each new chord.',
    ex: { chords: ['E5', 'G5', 'A5', 'G5'], barsPerChord: 1, pattern: 'DDDDDDDD', palm: 'accent', bpm: 70, target: 120, repBars: 4 },
  },
  {
    id: 'm3-pent2', phase: 'm3', kind: 'notes', scale: 'am-pent-2', minutes: 6,
    title: 'A minor pentatonic, box 2',
    goal: 'Learn the next shape up the neck.',
    intro: 'Same five notes, starting where box 1 ends.',
    ex: { seq: pentUpDown(BOX2), bpm: 60, target: 100, repBars: 3 },
  },
  {
    id: 'm3-pent-connect', phase: 'm3', kind: 'notes', scale: 'am-pent-1', minutes: 6,
    title: 'Connect boxes 1 and 2',
    goal: 'Slide between positions instead of staying in one box.',
    intro: 'Play up box 1 on the three thick strings, then slide your ring finger up into box 2.',
    ex: { seq: ['6:5', '6:8', '5:5', '5:7', '4:5', '4:7', '4:10', '3:7', '3:9', '2:8', '2:10', '1:8', '1:10', '1:8', '2:10', '-'], bpm: 60, target: 90, repBars: 2 },
  },
  {
    id: 'm3-licks', phase: 'm3', kind: 'notes', scale: 'am-pent-1', minutes: 6,
    title: 'Build your own licks',
    goal: 'Turn the scale into short musical phrases.',
    steps: [
      'A lick is 3 to 6 notes with a clear ending. Ending on A, the root, sounds "finished".',
      'Play the example below, then invent three of your own: change one note at a time.',
    ],
    ex: { seq: ['3:7', '2:5', '2:8', '2:5', '3:7', '3:5', '4:7', '-', '1:5', '2:8', '2:5', '3:7', '3:5', '4:7', '4:5', '-'], bpm: 60, target: 90, repBars: 2 },
  },
  {
    id: 'm3-improv', phase: 'm3', kind: 'rhythm', minutes: 7,
    title: 'Call and response',
    goal: 'Improvise a little, in time.',
    intro: 'Strum two bars of Am, then answer with two bars of your own pentatonic phrase. No wrong notes in box 1. Just keep the pulse.',
    tips: ['Leave space. Three good notes beat twenty random ones.'],
    ex: { chords: ['Am', 'Am', null, null], barsPerChord: 1, pattern: 'D.DU.UDU', bpm: 70, target: 100, repBars: 4 },
  },
  {
    id: 'm3-memory', phase: 'm3', kind: 'rhythm', memory: true, minutes: 6,
    title: 'Play from memory',
    goal: 'Change chords from the name alone.',
    intro: 'No diagrams this time, just chord names. Use Peek if you get stuck, then try again without it.',
    ex: { chords: ['Em', 'C', 'G', 'D'], barsPerChord: 1, pattern: 'D.DU.UDU', bpm: 70, target: 100, repBars: 4 },
  },
  {
    id: 'm3-own-piece', phase: 'm3', kind: 'read', minutes: 10,
    title: 'Your own 8-bar piece',
    goal: 'Put it all together into something that’s yours.',
    steps: [
      'Pick four chords you like. Any order works. Try starting and ending on the same one.',
      'Pick a strumming pattern for bars 1–4 and a different one (or palm muting) for bars 5–8.',
      'Add a two-bar pentatonic lick as an ending.',
      'Play it from memory three times in a row, with the metronome.',
    ],
  },
  {
    id: 'm3-check', phase: 'm3', kind: 'check', minutes: 10,
    title: 'Day 90 check',
    goal: 'Look back at how far you’ve come.',
    intro: 'These are goals, not a test. Whatever you can do today, you couldn’t do on day 1.',
    tasks: [
      { text: 'Power-chord progression with palm muting at 100 BPM', link: '#/lesson/m3-palm-accent' },
      { text: 'Pentatonic boxes 1 and 2 connected', link: '#/lesson/m3-pent-connect' },
      { text: 'Improvise for one minute over a steady pulse', link: '#/lesson/m3-improv' },
      { text: 'Play your own 8-bar piece from memory', link: '#/lesson/m3-own-piece' },
    ],
  },
];

export const lessonById = Object.fromEntries(LESSONS.map((l) => [l.id, l]));
export const phaseById = Object.fromEntries(PHASES.map((p) => [p.id, p]));
export const lessonIndex = (id) => LESSONS.findIndex((l) => l.id === id);
export const formLessonForChord = Object.fromEntries(
  LESSONS.filter((l) => l.kind === 'form').map((l) => [l.chord, l.id]),
);

// Generic progressions for interleaved practice, by Roman numerals.
export const PROGRESSIONS = [
  { name: 'I–IV–V in A', chords: ['A', 'D', 'E', 'A'] },
  { name: 'i–III–IV in A minor', chords: ['Am', 'C', 'D', 'Am'] },
  { name: 'I–V–vi–IV in G', chords: ['G', 'D', 'Em', 'C'] },
  { name: 'I–V–vi–IV in C', chords: ['C', 'G', 'Am', 'F'] },
  { name: 'i–VII–VI in E minor (power chords)', chords: ['E5', 'D5', 'C5', 'D5'] },
];

// "Play something fun" ideas, unlocked as you go. `after` = lesson that unlocks it.
export const FUN = [
  { after: null, text: 'Strum Em any way you like for two minutes. Fast, slow, loud, soft. No rules.' },
  { after: 'w2-a-d', text: 'Make up a two-chord song with A and D. Hum a melody over it.' },
  { after: 'w4-prog-a', text: 'Play A–D–E–A as slowly as you can, letting every chord ring out.' },
  { after: 'm2-g-prog', text: 'Loop G–D–Em–C and try a different strumming pattern every four bars.' },
  { after: 'm2-riff1', text: 'Play the low string walk riff, then change two notes to make your own version.', link: '#/lesson/m2-riff1' },
  { after: 'm2-pent1', text: 'Noodle on pentatonic box 1 for two minutes. End every phrase on an A.', link: '#/lesson/m2-pent1' },
  { after: 'm3-power-move', text: 'Invent a power-chord riff using G5, C5 and D5 with palm muting.' },
  { after: 'm3-improv', text: 'Try the tempo ladder challenge and set a new personal record.', link: '#/challenges' },
];
