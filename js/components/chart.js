// Single-series line chart (daily bests over time). Plain SVG, no library.
// One series, so no legend: the caption names it. Hover/tap shows a tooltip;
// a visually hidden table carries every value for screen readers.
import { html, esc, fmtDay } from '../util.js';

const NS = 'http://www.w3.org/2000/svg';
const W = 320, H = 150, PL = 30, PR = 34, PT = 14, PB = 24;

function el(name, attrs, parent) {
  const n = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (parent) parent.appendChild(n);
  return n;
}

function niceMax(v) {
  if (v <= 10) return 10;
  const step = v <= 50 ? 10 : v <= 100 ? 20 : 50;
  return Math.ceil(v / step) * step;
}

/** points: [{ d: 'YYYY-MM-DD', n }], label: e.g. 'clean changes' */
export function lineChart(host, points, { label = 'value', caption = '' } = {}) {
  const root = html(`<figure class="chart"><figcaption class="chart-title">${esc(caption)}</figcaption><div class="chart-plot"></div><div class="chart-tip" hidden></div></figure>`);
  host.append(root);
  const plot = root.querySelector('.chart-plot');
  const tip = root.querySelector('.chart-tip');
  if (points.length < 2) {
    plot.innerHTML = `<p class="small muted chart-empty">${points.length ? 'One result so far. Do another round on a different day to see your trend.' : 'No results yet.'}</p>`;
    return root;
  }
  const pts = points.slice(-14);
  const max = niceMax(Math.max(...pts.map((p) => p.n)));
  const x = (i) => PL + (i * (W - PL - PR)) / (pts.length - 1);
  const y = (v) => PT + (1 - v / max) * (H - PT - PB);
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart-svg', 'aria-hidden': 'true' }, plot);
  [0, max / 2, max].forEach((v) => {
    el('line', { x1: PL, x2: W - PR, y1: y(v), y2: y(v), class: 'chart-grid' }, svg);
    el('text', { x: PL - 6, y: y(v), dy: '0.35em', class: 'chart-axis', 'text-anchor': 'end' }, svg).textContent = v;
  });
  el('text', { x: x(0), y: H - 6, class: 'chart-axis', 'text-anchor': 'start' }, svg).textContent = fmtDay(pts[0].d);
  el('text', { x: x(pts.length - 1), y: H - 6, class: 'chart-axis', 'text-anchor': 'end' }, svg).textContent = fmtDay(pts[pts.length - 1].d);
  el('path', { d: `M${pts.map((p, i) => `${x(i).toFixed(1)} ${y(p.n).toFixed(1)}`).join(' L')} L${x(pts.length - 1)} ${y(0)} L${x(0)} ${y(0)} Z`, class: 'chart-area' }, svg);
  el('path', { d: `M${pts.map((p, i) => `${x(i).toFixed(1)} ${y(p.n).toFixed(1)}`).join(' L')}`, class: 'chart-line' }, svg);

  // Direct labels only on the latest value and the best one.
  const last = pts.length - 1;
  const bestI = pts.reduce((bi, p, i) => (p.n > pts[bi].n ? i : bi), 0);
  const dots = pts.map((p, i) => el('circle', { cx: x(i), cy: y(p.n), r: 4.5, class: 'chart-dot' }, svg));
  el('text', { x: x(last) + 8, y: y(pts[last].n), dy: '0.35em', class: 'chart-label' }, svg).textContent = pts[last].n;
  if (bestI !== last) el('text', { x: x(bestI), y: y(pts[bestI].n) - 10, class: 'chart-label', 'text-anchor': 'middle' }, svg).textContent = `best ${pts[bestI].n}`;
  const cross = el('line', { y1: PT, y2: H - PB, class: 'chart-cross', visibility: 'hidden' }, svg);

  function show(i) {
    cross.setAttribute('x1', x(i));
    cross.setAttribute('x2', x(i));
    cross.setAttribute('visibility', 'visible');
    dots.forEach((d, j) => d.classList.toggle('on', j === i));
    tip.hidden = false;
    tip.textContent = `${fmtDay(pts[i].d)}: ${pts[i].n} ${label}`;
    tip.style.left = `${(x(i) / W) * 100}%`;
  }
  function hide() {
    cross.setAttribute('visibility', 'hidden');
    dots.forEach((d) => d.classList.remove('on'));
    tip.hidden = true;
  }
  const nearest = (evt) => {
    const r = svg.getBoundingClientRect();
    const px = ((evt.clientX - r.left) / r.width) * W;
    let bi = 0;
    pts.forEach((_, i) => { if (Math.abs(x(i) - px) < Math.abs(x(bi) - px)) bi = i; });
    return bi;
  };
  svg.addEventListener('pointermove', (e) => show(nearest(e)));
  svg.addEventListener('pointerdown', (e) => show(nearest(e)));
  svg.addEventListener('pointerleave', hide);

  root.insertAdjacentHTML('beforeend', `<table class="sr-only"><caption>${esc(caption)}</caption><tr><th>Day</th><th>${esc(label)}</th></tr>${pts.map((p) => `<tr><td>${fmtDay(p.d)}</td><td>${p.n}</td></tr>`).join('')}</table>`);
  return root;
}
