// Lesson content. All text and exercises are original.
// Interactive bits inside `body` are wired up in app.js:
//   [data-board="Em"]  a chord diagram (chips in the same lesson control it)
//   [data-chord="Em"]  chord chip     [data-note="40"]  play one string
//   [data-pattern]     strumming grid [data-action]     metronome / drill / strings
const chip = (k) => `<button class="chip" type="button" data-chord="${k}">${k}</button>`;
const pair = (a, b) => `<span class="pair">${chip(a)}<span aria-hidden="true">⇄</span>${chip(b)}</span>`;
const metroBtn = '<button class="btn" type="button" data-action="metronome">Start metronome</button>';

export const LESSONS = [
  {
    id: 'tuning',
    title: 'Tune your guitar',
    minutes: 5,
    body: `
      <p>Standard tuning, from the <strong>thickest</strong> string to the <strong>thinnest</strong>, is <strong>E A D G B E</strong>. One way to remember it: <em>Every Amateur Does Get Better Eventually.</em></p>
      <p>Tap a string below to hear its target note. Pluck the same string on your guitar and turn its tuning peg slowly until the two sound the same.</p>
      <div class="string-row">
        <button class="note-btn" type="button" data-note="40">E<small>6th</small></button>
        <button class="note-btn" type="button" data-note="45">A<small>5th</small></button>
        <button class="note-btn" type="button" data-note="50">D<small>4th</small></button>
        <button class="note-btn" type="button" data-note="55">G<small>3rd</small></button>
        <button class="note-btn" type="button" data-note="59">B<small>2nd</small></button>
        <button class="note-btn" type="button" data-note="64">e<small>1st</small></button>
      </div>
      <ul class="tips">
        <li>If a string is too high, loosen it a little <em>below</em> the note, then tighten up to it. Tuning upward holds better.</li>
        <li>Strings get detuned easily: check your tuning every time you pick up the guitar.</li>
        <li>A clip-on tuner or tuner app makes this faster while your ear develops.</li>
      </ul>`,
  },
  {
    id: 'pick',
    title: 'Posture and holding the pick',
    minutes: 5,
    body: `
      <ol class="steps">
        <li>Sit up straight with the guitar's body resting on your thigh, the neck angled slightly upward.</li>
        <li>Hold the pick between the pad of your thumb and the side of your index finger, near the top knuckle. About a fingernail's width of the tip should poke out.</li>
        <li>Grip firmly enough that the pick doesn't spin, loosely enough that it can flex a little. Squeezing hard tires your hand fast.</li>
        <li>Strum from the wrist, not the whole arm, like shaking water off your hand.</li>
        <li>On the fretting hand, keep your thumb behind the neck and press with your fingertips, just behind the metal fret, not on top of it.</li>
      </ol>
      <p class="exercise"><strong>Exercise:</strong> With no fingers on the neck, strum all six open strings slowly downward 8 times, then up 8 times. Listen for an even sound with no string much louder than the others.</p>`,
  },
  {
    id: 'em-am',
    title: 'First chords: E minor and A minor',
    minutes: 10,
    body: `
      <p>E minor is the friendliest chord on the guitar: two fingers, all six strings. A minor uses the same shape moved one string thinner, plus your index finger.</p>
      <div class="chip-row">${chip('Em')}${chip('Am')}</div>
      <div class="board-host" data-board="Em"></div>
      <ul class="tips">
        <li>Arch your fingers so each fingertip only touches its own string.</li>
        <li>For A minor, skip the thickest string (marked ×).</li>
      </ul>
      <p class="exercise"><strong>Exercise:</strong> Fret the chord, then pick each string one at a time from thick to thin. If a string buzzes or sounds dead, adjust that finger until all of them ring clearly.</p>`,
  },
  {
    id: 'c-g-d',
    title: 'C, G and D',
    minutes: 15,
    body: `
      <p>These three chords will take the most practice in this path. Expect them to feel awkward for a few days. That's normal.</p>
      <div class="chip-row">${chip('C')}${chip('G')}${chip('D')}</div>
      <div class="board-host" data-board="C"></div>
      <ul class="tips">
        <li><strong>C:</strong> your fingers make a diagonal staircase. Keep the ring finger tip upright so the open G string can ring.</li>
        <li><strong>G:</strong> stretch from the thickest string to the thinnest. Let your wrist drop a little behind the neck.</li>
        <li><strong>D:</strong> a small triangle on the three thin strings. Only strum the four thinnest strings.</li>
      </ul>
      <p class="exercise"><strong>Exercise:</strong> For each chord: place fingers, strum once, lift your hand off completely, repeat. Do 10 of each. You're training your hand to land the whole shape at once.</p>`,
  },
  {
    id: 'e-a',
    title: 'E major and A major',
    minutes: 10,
    body: `
      <p>E major is E minor plus one finger. A major packs three fingers side by side on the 2nd fret.</p>
      <div class="chip-row">${chip('Em')}${chip('E')}${chip('A')}</div>
      <div class="board-host" data-board="E"></div>
      <ul class="tips">
        <li>Switch between Em and E and watch the diagram: only your index finger moves.</li>
        <li>A feels crowded at first. Angle your fingers so they don't all try to sit right behind the fret.</li>
      </ul>
      <p class="exercise"><strong>Exercise:</strong> Alternate Em and E, 4 strums each, eight times through. Then do the same with A and the open strings.</p>`,
  },
  {
    id: 'switching',
    title: 'Switching between chords',
    minutes: 15,
    body: `
      <p>Clean, quick changes matter more than knowing many chords. Tap each pair back and forth and watch which fingers move and which stay put.</p>
      <div class="chip-row pairs">${pair('Am', 'C')}${pair('E', 'Am')}${pair('Em', 'G')}${pair('D', 'A')}${pair('G', 'C')}</div>
      <div class="board-host" data-board="Am"></div>
      <ul class="tips">
        <li><strong>Anchor fingers:</strong> going Am → C, fingers 1 and 2 don't move at all. Only the ring finger travels.</li>
        <li><strong>Same shape:</strong> E → Am is the exact same shape moved one string thinner.</li>
        <li>Move all fingers together as one shape, not one at a time.</li>
      </ul>
      <p class="exercise"><strong>One-minute changes:</strong> Pick a pair. Start the timer and switch between the two chords, strumming once each time, as many times as you can in 60 seconds. Count the clean changes. Write your number down and try to beat it tomorrow.</p>
      <p><button class="btn primary" type="button" data-action="drill">Start 1-minute timer</button></p>`,
  },
  {
    id: 'strumming',
    title: 'Basic strumming patterns',
    minutes: 15,
    body: `
      <p>Count <strong>“1 &amp; 2 &amp; 3 &amp; 4 &amp;”</strong> out loud. Your hand moves <strong>down on the numbers</strong> and <strong>up on the “&amp;”</strong>, all the time, even when you don't hit the strings. Start the metronome and the highlighted box shows where you are.</p>
      <p class="pattern-title">1. All downstrokes</p>
      <div class="strum" data-pattern="D.D.D.D."></div>
      <p class="pattern-title">2. Down-up eighths</p>
      <div class="strum" data-pattern="DUDUDUDU"></div>
      <p class="pattern-title">3. The everyday pattern: D · D U · U D U</p>
      <div class="strum" data-pattern="D.DU.UDU"></div>
      <p>${metroBtn}</p>
      <ul class="tips">
        <li>For the gaps in pattern 3, keep your hand moving and just miss the strings.</li>
        <li>Upstrokes are lighter and usually only catch the thinner strings. That's fine.</li>
        <li>Practise each pattern on one chord first (Em is easiest), then add a chord change every bar.</li>
      </ul>
      <p class="exercise"><strong>Exercise:</strong> At 60 BPM, play pattern 3 for four bars of G, four bars of C, then repeat. Speed up by 5 BPM only after two clean run-throughs.</p>`,
  },
];
