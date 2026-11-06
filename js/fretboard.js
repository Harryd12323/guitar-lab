import { CHORDS, STRING_NAMES } from './chords.js';

const NS = 'http://www.w3.org/2000/svg';
const FRETS = 5;
const X0 = 34, DX = 26, Y0 = 46, DY = 34;
const W = X0 * 2 + DX * 5;
const H = Y0 + DY * FRETS + 30;
const sx = (s) => X0 + s * DX;
const fy = (f) => Y0 + (f - 0.5) * DY;

function el(name, attrs, parent) {
  const n = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  parent.appendChild(n);
  return n;
}

// Vertical chord chart. The four finger dots are persistent elements, so
// changing chords slides each finger to its new spot via CSS transitions.
export function createFretboard() {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'fretboard');
  svg.setAttribute('aria-hidden', 'true');

  for (let f = 0; f <= FRETS; f++) {
    const y = Y0 + f * DY;
    el('line', { x1: sx(0), x2: sx(5), y1: y, y2: y, class: f === 0 ? 'nut' : 'fret' }, svg);
  }
  const markers = [];
  for (let s = 0; s < 6; s++) {
    el('line', { x1: sx(s), x2: sx(s), y1: Y0, y2: Y0 + FRETS * DY, class: 'string', 'stroke-width': (2.4 - s * 0.3).toFixed(2) }, svg);
    const label = el('text', { x: sx(s), y: Y0 + FRETS * DY + 20, class: 'string-label' }, svg);
    label.textContent = STRING_NAMES[s];
    const g = el('g', { class: 'marker' }, svg);
    el('circle', { cx: sx(s), cy: Y0 - 17, r: 6, class: 'open' }, g);
    el('path', { d: `M${sx(s) - 5} ${Y0 - 22} l10 10 m0 -10 l-10 10`, class: 'muted' }, g);
    markers.push(g);
  }

  const dots = [1, 2, 3, 4].map((n) => {
    const g = el('g', { class: 'dot is-hidden' }, svg);
    el('circle', { r: 11.5 }, g);
    const t = el('text', { dy: '0.36em' }, g);
    t.textContent = n;
    return { g, shown: false };
  });

  function set(key) {
    const c = CHORDS[key];
    dots.forEach((d, i) => {
      const s = c.fingers.indexOf(i + 1);
      if (s === -1) {
        d.g.classList.add('is-hidden');
        d.shown = false;
        return;
      }
      const transform = `translate(${sx(s)}px, ${fy(c.frets[s])}px)`;
      if (!d.shown) {
        // Appearing finger: jump into place, then fade in (don't slide from a stale spot).
        d.g.classList.add('no-anim');
        d.g.style.transform = transform;
        d.g.getBoundingClientRect();
        d.g.classList.remove('no-anim');
      } else {
        d.g.style.transform = transform;
      }
      d.g.classList.remove('is-hidden');
      d.shown = true;
    });
    markers.forEach((m, s) => {
      m.classList.toggle('is-open', c.frets[s] === 0);
      m.classList.toggle('is-muted', c.frets[s] === -1);
    });
  }

  return { svg, set };
}
