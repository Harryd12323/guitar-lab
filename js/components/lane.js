// Strumming lane: 8 eighth-note slots with a pick that never stops moving.
// Real strokes are solid; ghost strokes (hand moves, misses the strings) are
// drawn faintly so the motion is visible even when nothing is hit.
const NS = 'http://www.w3.org/2000/svg';
const COUNTS = ['1', '&', '2', '&', '3', '&', '4', '&'];
const CW = 38, X0 = 8, W = X0 * 2 + CW * 8, H = 132, MID = 62, AMP = 30;
const cx = (i) => X0 + CW * i + CW / 2;

function el(name, attrs, parent) {
  const n = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (parent) parent.appendChild(n);
  return n;
}

const ARROW_DOWN = 'M0 -16 V12 M-8 4 L0 13 L8 4';
const ARROW_UP = 'M0 16 V-12 M-8 -4 L0 -13 L8 -4';

export function strumLane(host, pattern) {
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'lane', role: 'img' });
  const cells = [];
  const strings = el('g', { class: 'lane-strings' }, svg);
  for (let i = 0; i < 3; i++) el('line', { x1: X0, x2: W - X0, y1: MID - 8 + i * 8, y2: MID - 8 + i * 8 }, strings);
  for (let i = 0; i < 8; i++) {
    const g = el('g', { class: 'lane-cell' }, svg);
    el('rect', { x: X0 + CW * i + 2, y: 18, width: CW - 4, height: 88, rx: 9 }, g);
    const mark = el('g', { transform: `translate(${cx(i)} ${MID})`, class: 'lane-mark' }, g);
    el('path', { d: '' }, mark);
    el('text', { x: cx(i), y: 124, class: 'lane-count' }, g).textContent = COUNTS[i];
    cells.push({ g, mark, path: mark.firstChild });
  }
  const pick = el('path', { d: 'M-9 -7 Q0 -12 9 -7 Q6 4 0 11 Q-6 4 -9 -7 Z', class: 'lane-pick' }, svg);
  host.append(svg);

  let tokens = [];
  function setPattern(p) {
    tokens = [...p];
    const spoken = [];
    cells.forEach((c, i) => {
      const t = tokens[i] || '.';
      const ghost = t === '.';
      const down = i % 2 === 0;
      c.g.classList.toggle('ghost', ghost);
      c.g.classList.toggle('muted', t === 'X' || t === 'x');
      c.path.setAttribute('d', down ? ARROW_DOWN : ARROW_UP);
      if (t === 'X' || t === 'x') c.path.setAttribute('d', 'M-8 -8 L8 8 M8 -8 L-8 8');
      if (!ghost) spoken.push(`${COUNTS[i]} ${t === 'X' || t === 'x' ? 'muted' : down ? 'down' : 'up'}`);
    });
    svg.setAttribute('aria-label', `Strum pattern: ${spoken.join(', ')}. Faint arrows are ghost strokes: keep the hand moving without hitting the strings.`);
    update(null);
  }

  // pos = continuous step within the bar (0..8), or null when stopped.
  function update(pos) {
    const running = pos != null;
    const p = running ? pos % 8 : 0;
    const x = Math.min(W - X0, cx(0) + p * CW);
    const y = running ? MID + AMP * Math.sin(Math.PI * p) : MID - AMP;
    pick.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    const now = running ? Math.floor(p + 0.15) % 8 : -1;
    cells.forEach((c, i) => c.g.classList.toggle('now', i === now));
    pick.classList.toggle('is-ghost', now >= 0 && (tokens[now] || '.') === '.');
  }

  setPattern(pattern);
  return { el: svg, setPattern, update };
}
