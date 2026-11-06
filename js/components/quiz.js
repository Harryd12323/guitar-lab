// Ten-question quizzes for string names and fret numbers (scored automatically).
import { html, $ } from '../util.js';
import { note } from '../audio.js';

const NS = 'http://www.w3.org/2000/svg';
const NAMES = [['E', '6th'], ['A', '5th'], ['D', '4th'], ['G', '3rd'], ['B', '2nd'], ['e', '1st']];
const X0 = 36, DX = 26, Y0 = 30, DY = 34;

function board(target) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 202 230');
  svg.setAttribute('class', 'fretboard quiz-board');
  svg.setAttribute('aria-hidden', 'true');
  let inner = '';
  for (let f = 0; f <= 5; f++) inner += `<line x1="${X0}" x2="${X0 + 5 * DX}" y1="${Y0 + f * DY}" y2="${Y0 + f * DY}" class="${f ? 'fret' : 'nut'}"/>`;
  for (let f = 1; f <= 5; f++) inner += `<text x="${X0 - 18}" y="${Y0 + (f - 0.5) * DY}" dy="0.35em" class="base-label">${target.showFretNums ? f : ''}</text>`;
  for (let s = 0; s < 6; s++) {
    const on = target.string === s && target.fret == null;
    inner += `<line x1="${X0 + s * DX}" x2="${X0 + s * DX}" y1="${Y0}" y2="${Y0 + 5 * DY}" class="string${on ? ' hl' : ''}" stroke-width="${on ? 5 : (2.4 - s * 0.3).toFixed(2)}"/>`;
  }
  if (target.fret != null) {
    inner += `<g class="finger" transform="translate(${X0 + target.string * DX} ${Y0 + (target.fret - 0.5) * DY})"><circle r="11.5"/><text dy="0.36em">?</text></g>`;
  }
  svg.innerHTML = inner;
  return svg;
}

export function quiz(host, kind, { onDone }) {
  const isStrings = kind === 'quiz-strings';
  const root = html(`
    <div class="quiz card">
      <p class="quiz-progress small muted"></p>
      <div class="quiz-board-host"></div>
      <p class="quiz-q"></p>
      <div class="quiz-answers"></div>
      <p class="quiz-feedback" aria-live="polite"></p>
      <button class="btn primary wide quiz-again" type="button" hidden>Try again</button>
    </div>`);
  host.append(root);
  const answers = $('.quiz-answers', root);
  const feedback = $('.quiz-feedback', root);
  let qn = 0;
  let score = 0;
  let current = null;
  let last = null;

  answers.innerHTML = isStrings
    ? NAMES.map(([n, num], i) => `<button class="note-btn" type="button" data-a="${i}">${n}<small>${num}</small></button>`).join('')
    : [1, 2, 3, 4, 5].map((f) => `<button class="note-btn" type="button" data-a="${f}">${f}</button>`).join('');
  answers.classList.toggle('five', !isStrings);

  function ask() {
    feedback.textContent = '';
    if (qn >= 10) return end();
    let t;
    do {
      t = isStrings ? { string: Math.floor(Math.random() * 6) } : { string: Math.floor(Math.random() * 6), fret: 1 + Math.floor(Math.random() * 5) };
    } while (last && t.string === last.string && t.fret === last.fret);
    current = last = t;
    $('.quiz-progress', root).textContent = `Question ${qn + 1} of 10 · ${score} right`;
    $('.quiz-board-host', root).replaceChildren(board(t));
    $('.quiz-q', root).textContent = isStrings ? 'Which string is highlighted?' : 'Which fret is the dot on?';
    answers.querySelectorAll('button').forEach((b) => { b.disabled = false; b.classList.remove('right', 'wrong'); });
  }

  function end() {
    answers.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    $('.quiz-q', root).textContent = `${score} out of 10`;
    $('.quiz-progress', root).textContent = 'Done';
    feedback.textContent = score >= 9 ? 'Excellent. You’ve got this.' : score >= 7 ? 'Nearly there. One more round?' : 'Keep practising. These stick quickly with repetition.';
    $('.quiz-again', root).hidden = false;
    onDone(score);
  }

  answers.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || b.disabled || !current) return;
    const a = +b.dataset.a;
    const right = isStrings ? a === current.string : a === current.fret;
    if (right) score++;
    note(current.string, current.fret || 0, { length: 0.8 });
    b.classList.add(right ? 'right' : 'wrong');
    const correctName = isStrings ? `the ${NAMES[current.string][0]} string (${NAMES[current.string][1]})` : `fret ${current.fret}`;
    feedback.textContent = right ? 'Yes!' : `Not quite: that’s ${correctName}.`;
    answers.querySelectorAll('button').forEach((x) => { x.disabled = true; });
    qn++;
    setTimeout(ask, right ? 650 : 1400);
  });
  $('.quiz-again', root).addEventListener('click', () => {
    qn = 0; score = 0;
    $('.quiz-again', root).hidden = true;
    ask();
  });
  ask();
}
