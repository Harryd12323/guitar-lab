import { CHORDS, SCALES, STRING_NAMES } from './chords.js';

const NS = 'http://www.w3.org/2000/svg';
const FRETS = 5;
const X0 = 36, DX = 26, Y0 = 46, DY = 34, R = 11.5;
const W = X0 * 2 + DX * 5;
const H = Y0 + DY * FRETS + 30;
const sx = (s) => X0 + s * DX;
const fy = (f) => Y0 + (f - 0.5) * DY; // f = 1..5 relative to the base fret
const FINGER_NAMES = ['', 'index', 'middle', 'ring', 'pinky'];
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function el(name, attrs, parent) {
  const n = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (parent) parent.appendChild(n);
  return n;
}

function baseFret(frets) {
  const pressed = frets.filter((f) => f > 0);
  return Math.max(...frets) > FRETS ? Math.min(...pressed) : 1;
}

function grid(svg) {
  for (let f = 0; f <= FRETS; f++) {
    const y = Y0 + f * DY;
    el('line', { x1: sx(0), x2: sx(5), y1: y, y2: y, class: f === 0 ? 'nut' : 'fret' }, svg);
  }
  for (let s = 0; s < 6; s++) {
    el('line', { x1: sx(s), x2: sx(s), y1: Y0, y2: Y0 + FRETS * DY, class: 'string', 'stroke-width': (2.4 - s * 0.3).toFixed(2) }, svg);
    el('text', { x: sx(s), y: Y0 + FRETS * DY + 20, class: 'string-label' }, svg).textContent = STRING_NAMES[s];
  }
  return el('text', { x: X0 - 22, y: fy(1), dy: '0.35em', class: 'base-label' }, svg);
}

function newSvg(extraClass) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', `fretboard ${extraClass}`);
  svg.setAttribute('aria-hidden', 'true');
  return svg;
}

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a, b, t) => a + (b - a) * t;

// Chord chart with four persistent finger elements. Changing chords animates
// each finger from where it was to where it goes (JS-driven, so it can be
// paused, slowed down and replayed). Barres are a stretched finger.
export function createChordDiagram() {
  const svg = newSvg('chord-diagram help-0');
  const baseLabel = grid(svg);
  const trails = el('g', { class: 'trails' }, svg);
  const markers = [];
  for (let s = 0; s < 6; s++) {
    const g = el('g', { class: 'marker' }, svg);
    el('circle', { cx: sx(s), cy: Y0 - 17, r: 6, class: 'open' }, g);
    el('path', { d: `M${sx(s) - 5} ${Y0 - 22} l10 10 m0 -10 l-10 10`, class: 'muted' }, g);
    markers.push(g);
  }
  const fingers = [1, 2, 3, 4].map((n) => {
    const g = el('g', { class: 'finger' }, svg);
    const rect = el('rect', { x: -R, y: -R, height: R * 2, width: R * 2, rx: R }, g);
    el('text', { dy: '0.36em' }, g).textContent = n;
    return { n, g, rect, cur: { x: sx(0), y: fy(1), w: R * 2, o: 0, k: 1 }, from: null, to: null, mode: 'hidden' };
  });
  const hiddenName = el('text', { x: W / 2, y: Y0 + DY * 2.4, class: 'hidden-name' }, svg);

  let key = null;
  let prevKey = null;
  let speed = 1;
  let raf = 0;
  let elapsed = 0;
  let lastFrame = 0;
  let paused = false;
  let duration = 0;
  const api = { svg, onLand: null, info: null };

  function targetsFor(k) {
    const c = CHORDS[k];
    const base = baseFret(c.frets);
    return {
      base,
      t: fingers.map(({ n }) => {
        const strs = c.fingers.map((f, s) => (f === n ? s : -1)).filter((s) => s >= 0);
        if (!strs.length) return null;
        const s1 = strs[0], s2 = strs[strs.length - 1];
        return { x: sx(s1), y: fy(c.frets[s1] - base + 1), w: R * 2 + (s2 - s1) * DX, string: s1, fret: c.frets[s1], span: s2 - s1 };
      }),
    };
  }

  function draw(f) {
    const { x, y, w, o, k } = f.cur;
    f.g.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${k.toFixed(3)})`);
    f.g.setAttribute('opacity', o.toFixed(3));
    f.rect.setAttribute('width', w.toFixed(2));
  }

  function frame(now) {
    if (paused) return;
    elapsed += now - lastFrame;
    lastFrame = now;
    const t = duration ? Math.min(1, elapsed / duration) : 1;
    const e = ease(t);
    for (const f of fingers) {
      if (!f.from) continue;
      const a = f.from, b = f.to;
      f.cur = { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e), w: lerp(a.w, b.w, e), o: lerp(a.o, b.o, e), k: lerp(a.k, b.k, e) };
      if (f.mode === 'move') f.cur.k = 1 + 0.18 * Math.sin(Math.PI * e); // lift, travel, press
      draw(f);
    }
    if (t < 1) {
      raf = requestAnimationFrame(frame);
    } else {
      raf = 0;
      trails.classList.add('fade');
      if (api.onLand) api.onLand(key);
    }
  }

  function run(fromKey, toKey, animate) {
    cancelAnimationFrame(raf);
    const prev = fromKey ? targetsFor(fromKey).t : [null, null, null, null];
    const { base, t: next } = targetsFor(toKey);
    const c = CHORDS[toKey];
    trails.replaceChildren();
    trails.classList.remove('fade');
    const info = { moved: [], anchors: [], guides: [], placed: [], lifted: [] };
    fingers.forEach((f, i) => {
      const a = prev[i], b = next[i];
      f.g.classList.remove('anchor', 'guide');
      if (a && b) {
        const same = a.x === b.x && a.y === b.y && a.w === b.w;
        f.mode = same ? 'stay' : 'move';
        f.from = { ...a, o: 1, k: 1 };
        f.to = { ...b, o: 1, k: 1 };
        if (same) { f.g.classList.add('anchor'); info.anchors.push(f.n); }
        else {
          info.moved.push(f.n);
          if (a.string === b.string) { f.g.classList.add('guide'); info.guides.push(f.n); }
          el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: 'trail' }, trails);
        }
      } else if (b) {
        f.mode = 'place';
        f.from = { ...b, o: 0, k: 1.35 };
        f.to = { ...b, o: 1, k: 1 };
        info.placed.push(f.n);
      } else if (a) {
        f.mode = 'lift';
        f.from = { ...a, o: 1, k: 1 };
        f.to = { ...a, o: 0, k: 1.35 };
        info.lifted.push(f.n);
      } else {
        f.mode = 'hidden';
        f.from = null;
        f.cur.o = 0;
        draw(f);
      }
    });
    markers.forEach((m, s) => {
      m.classList.toggle('is-open', c.frets[s] === 0);
      m.classList.toggle('is-muted', c.frets[s] === -1);
    });
    baseLabel.textContent = base > 1 ? `${base}fr` : '';
    svg.classList.toggle('up-neck', base > 1);
    hiddenName.textContent = toKey;
    api.info = info;
    svg.dataset.chord = toKey;

    duration = !animate || !fromKey || (reducedMotion() && speed === 1) ? 0 : 520 / speed;
    elapsed = 0;
    paused = false;
    lastFrame = performance.now();
    frame(lastFrame);
  }

  api.set = (k, { animate = true } = {}) => {
    prevKey = key;
    key = k;
    run(prevKey, key, animate);
  };
  api.replay = () => { if (prevKey && key) run(prevKey, key, true); };
  api.pause = () => { paused = true; cancelAnimationFrame(raf); };
  api.resume = () => {
    if (!paused) return;
    paused = false;
    lastFrame = performance.now();
    raf = requestAnimationFrame(frame);
  };
  api.isAnimating = () => raf !== 0 || paused;
  api.isPaused = () => paused;
  api.setSpeed = (s) => { speed = s; };
  api.setHelp = (level) => {
    svg.classList.remove('help-0', 'help-1', 'help-2');
    svg.classList.add(`help-${level}`);
  };
  api.key = () => key;
  api.prevKey = () => prevKey;
  return api;
}

// Plain-English summary of the last transition, e.g. for Am -> C.
export function describeTransition(info, from, to) {
  if (!info || !from || from === to) return '';
  const names = (ns) => ns.map((n) => FINGER_NAMES[n]).join(' and ');
  const parts = [];
  if (info.anchors.length) parts.push(`${names(info.anchors)} ${info.anchors.length > 1 ? 'stay' : 'stays'} put`);
  if (info.guides.length) parts.push(`${names(info.guides)} ${info.guides.length > 1 ? 'slide' : 'slides'} along ${info.guides.length > 1 ? 'their strings' : 'its string'}`);
  const travel = info.moved.filter((n) => !info.guides.includes(n));
  if (travel.length) parts.push(`${names(travel)} ${travel.length > 1 ? 'move' : 'moves'}`);
  if (info.placed.length) parts.push(`add ${names(info.placed)}`);
  if (info.lifted.length) parts.push(`lift ${names(info.lifted)}`);
  const s = parts.join(', ');
  return `${from} → ${to}: ${s.charAt(0).toUpperCase()}${s.slice(1)}.`;
}

// Static scale box: finger numbers, roots highlighted.
export function scaleDiagram(key) {
  const shape = SCALES[key];
  const svg = newSvg('scale-diagram');
  const baseLabel = grid(svg);
  const base = Math.min(...shape.notes.map((n) => n[1]));
  baseLabel.textContent = base > 1 ? `${base}fr` : '';
  svg.classList.toggle('up-neck', base > 1);
  for (const [s, fret, finger, root] of shape.notes) {
    const g = el('g', { class: `finger${root ? ' root' : ''}`, transform: `translate(${sx(s)} ${fy(fret - base + 1)})` }, svg);
    el('circle', { r: R }, g);
    el('text', { dy: '0.36em' }, g).textContent = finger;
  }
  svg.setAttribute('aria-hidden', 'false');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `${shape.name}. Starts at fret ${base}. Highlighted dots are the root note A.`);
  return svg;
}
