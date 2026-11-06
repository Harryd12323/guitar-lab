# Guitar Lab

A free daily guitar practice engine. Live at **https://harryd12323.github.io/guitar-lab/**

It doesn't just list lessons: every day it says what to practise, measures improvement, brings old skills back before you forget them, and slowly removes visual help.

## Features

- **Today:** an adaptive ~20-minute session: tune → one new skill → one weak spot → mixed chord changes → one spaced review → something fun. Built from your own progress data.
- **90-day path:** 51 short lessons, each training one movement. Chord order: Em, A, D, E, Am, C, G, simplified F, then power chords. Milestone checks are goals, not promises.
- **Skill levels:** Complete beginner, Novice, Intermediate, Advanced, Pro, plus an optional 2-minute placement check. Skipped lessons are marked *skipped*, never *done*, and stay open.
- **Chord change trainer:** 1-minute timed changes (tap or Space for each clean change), personal bests, daily history chart, suggested pairs.
- **Tempo ladder and loops:** any rhythm or note exercise loops; 3 clean reps offer +4 BPM; max clean tempo is saved per exercise.
- **Chord transition visualizer:** fingers travel from chord to chord, with anchor fingers highlighted. Pause, replay and slow motion, with the sound synced to the fingers landing. The strumming lane shows a pick that never stops moving, with ghost strokes drawn.
- **Assistance fading:** finger numbers → dots only → chord name only (with Peek), based on your ratings. Can be turned off in Settings.
- **Mic tuner:** hand-written YIN pitch detection, confidence threshold, several stable frames before the note changes. Advice only ("Sounds like D"), never blocking.
- **Pro challenges:** speed changes, random-pair roulette, tempo ladder, tap-along timing and keep-the-beat games, with latency calibration.
- **Light gamification:** forgiving streak (one freeze day per week), personal records, mastery levels from real performance. No XP, no leaderboards.
- **Backup:** export/import a progress code; iPhone "Add to Home Screen" tip.

## Principles

- Plain HTML, CSS and JavaScript (native ES modules). No build step, no dependencies, no external requests.
- No accounts, analytics, trackers or cookies. Progress is stored only in your browser (localStorage). The microphone is used only while the tuner is open and audio never leaves the device.
- Ratings are self-reported (the app can't hear you), except timing games and the tuner, which measure.

## Copyright

Guitar Lab contains **only original exercises, original riffs and patterns, generic chord progressions (I–IV–V, I–V–vi–IV and similar), scales and chord shapes**. It never includes copyrighted songs, lyrics or tabs. Please keep it that way in contributions.

## Run locally

ES modules need a local server:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Structure

```
index.html                 app shell, tab bar
css/style.css              design tokens, light/dark themes
js/app.js                  hash router
js/store.js                localStorage state, v1 migration, streak, backup codes
js/curriculum.js           90-day lessons, levels, progressions
js/skills.js               spaced review, mastery, fading, daily plan, tempo ladder
js/transport.js            metronome/loop engine (AudioContext clock + lookahead)
js/tick-worker.js          wakes the scheduler
js/audio.js                plucked-string synth, strums, clicks
js/pitch.js                YIN pitch detection
js/fretboard.js            animated chord diagrams, scale boxes
js/components/             chord viewer, exercise, lane, tab, drill, timing, chart, quiz, rating
js/views/                  today, path, trainer, tuner, metronome, settings, challenges
```

## TODO (not now)

- Chord recognition by microphone
- Backing tracks / improv mode
- Language learning section

MIT licensed.
