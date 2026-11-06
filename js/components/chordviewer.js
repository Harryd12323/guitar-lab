// Chord diagram + transition controls + assistance fading.
import { CHORDS, describeChord } from '../chords.js';
import { createChordDiagram, describeTransition } from '../fretboard.js';
import { strum } from '../audio.js';
import { helpLevel } from '../skills.js';
import { html, $ } from '../util.js';

const SPEEDS = [[1, '1×'], [0.5, '½×'], [0.25, '¼×']];

/**
 * opts: { chord, controls = true, help = 'auto' | 0 | 1 | 2, compact = false }
 * Tapping the diagram plays the chord. When a change animates, the chord
 * sounds as the fingers land, so sound and motion stay in sync.
 */
export function chordViewer(host, opts = {}) {
  const { controls = true, compact = false } = opts;
  let helpMode = opts.help ?? 'auto';
  const root = html(`
    <div class="viewer${compact ? ' compact' : ''}">
      <button class="board-btn" type="button"></button>
      <div class="viewer-row">
        <p class="board-caption"></p>
        <button class="chip small peek" type="button" hidden>Peek</button>
      </div>
      ${controls ? `
      <div class="viewer-controls" role="group" aria-label="Transition playback">
        <button class="icon-btn sm" type="button" data-v="replay" aria-label="Replay change" title="Replay">⟲</button>
        <button class="icon-btn sm" type="button" data-v="pause" aria-label="Pause" title="Pause">❚❚</button>
        <div class="seg" role="radiogroup" aria-label="Animation speed">
          ${SPEEDS.map(([v, l], i) => `<button type="button" role="radio" aria-checked="${i === 0}" data-speed="${v}">${l}</button>`).join('')}
        </div>
      </div>
      <p class="transition-note" aria-live="polite"></p>` : ''}
    </div>`);
  host.append(root);
  const board = createChordDiagram();
  const btn = $('.board-btn', root);
  btn.append(board.svg);
  const caption = $('.board-caption', root);
  const peekBtn = $('.peek', root);
  const note = $('.transition-note', root);
  const pauseBtn = $('[data-v="pause"]', root);

  let key = null;
  let soundOnLand = false;
  let peeking = false;

  const level = () => (peeking ? 0 : helpMode === 'auto' ? helpLevel(key) : helpMode);

  function applyHelp() {
    const lv = level();
    board.setHelp(lv);
    peekBtn.hidden = !(helpMode === 'auto' ? helpLevel(key) > 0 : helpMode > 0);
    peekBtn.textContent = peeking ? 'Hide help' : lv === 2 ? 'Peek' : 'Show fingers';
    peekBtn.setAttribute('aria-pressed', String(peeking));
    const name = CHORDS[key].name;
    caption.innerHTML = lv === 2 ? `<strong>${key}</strong> · from memory` : `<strong>${name}</strong> · tap to hear`;
    btn.setAttribute('aria-label', lv === 2 ? `${name}, diagram hidden. Play chord.` : `${describeChord(key)} Play chord.`);
  }

  board.onLand = (k) => {
    if (pauseBtn) pauseBtn.textContent = '❚❚';
    if (soundOnLand) { soundOnLand = false; strum(CHORDS[k]); }
  };

  const api = {
    el: root,
    board,
    get key() { return key; },
    show(k, { sound = false, animate = true } = {}) {
      if (!CHORDS[k]) return;
      const from = key;
      peeking = false;
      key = k;
      board.set(k, { animate });
      applyHelp();
      if (note) note.textContent = describeTransition(board.info, from, k);
      if (sound) {
        if (from && from !== k && animate && board.isAnimating()) soundOnLand = true;
        else strum(CHORDS[k]);
      }
    },
    setHelp(mode) { helpMode = mode; if (key) applyHelp(); },
    refreshHelp() { if (key) applyHelp(); },
  };

  btn.addEventListener('click', () => key && strum(CHORDS[key]));
  peekBtn.addEventListener('click', () => { peeking = !peeking; applyHelp(); });
  if (controls) {
    root.addEventListener('click', (e) => {
      const t = e.target.closest('button');
      if (!t) return;
      if (t.dataset.v === 'replay') {
        soundOnLand = true;
        board.replay();
        pauseBtn.textContent = '❚❚';
        if (!board.prevKey()) strum(CHORDS[key]);
      } else if (t.dataset.v === 'pause') {
        if (board.isPaused()) { board.resume(); pauseBtn.textContent = '❚❚'; pauseBtn.setAttribute('aria-label', 'Pause'); }
        else if (board.isAnimating()) { board.pause(); pauseBtn.textContent = '▶'; pauseBtn.setAttribute('aria-label', 'Resume'); }
      } else if (t.dataset.speed) {
        board.setSpeed(+t.dataset.speed);
        root.querySelectorAll('[data-speed]').forEach((b) => b.setAttribute('aria-checked', String(b === t)));
        soundOnLand = true;
        board.replay();
      }
    });
  }
  if (opts.chord) api.show(opts.chord, { animate: false });
  return api;
}
