# Guitar Lab

A small, free guitar course for absolute beginners. Live at **https://harryd12323.github.io/guitar-lab/**

- Beginner path: tuning, holding the pick, first chords (Em, Am, C, G, D, E, A), switching chords, strumming patterns
- Interactive chord diagrams with finger numbers and open/muted strings. Fingers slide from one chord to the next
- Tap any chord or string to hear it (synthesized with Web Audio, no sound files)
- Metronome with tap tempo, synced to the strumming grids
- Progress and a daily practice streak, saved only in your browser (localStorage)
- Light and dark mode, built for phones

## Principles

- Plain HTML, CSS and JavaScript. No build step, no dependencies, no external requests
- No accounts, analytics, trackers or cookies
- Only chords, scales and original exercises, never copyrighted songs or tabs

## Run locally

ES modules need a local server (opening the file directly won't work):

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

## Structure

```
index.html
css/style.css
js/app.js         wiring and UI
js/chords.js      chord shapes
js/fretboard.js   SVG chord diagram + animation
js/audio.js       plucked-string synth and metronome click
js/metronome.js   audio-clock scheduler
js/progress.js    localStorage progress and streak
js/lessons.js     lesson content
js/theme.js       applies saved theme before first paint
```

## Ideas for later

- A tuner using the microphone
- A language learning section

MIT licensed.
