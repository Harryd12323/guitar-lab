// Simple tab view for our own exercises: one row of 8 eighth-note columns per
// bar, strings drawn thin (1, high e) at the top to thick (6, low E) at the bottom.
import { html } from '../util.js';

const LABELS = ['e', 'B', 'G', 'D', 'A', 'E'];

export function parseNote(tok) {
  if (!tok || tok === '-') return null;
  const [s, f] = tok.split(':').map(Number);
  return { string: 6 - s, guitarString: s, fret: f };
}

export function tabView(host, seq, { chordsLabel } = {}) {
  const bars = [];
  for (let i = 0; i < seq.length; i += 8) bars.push(seq.slice(i, i + 8));
  const root = html(`<div class="tab" role="img"></div>`);
  root.setAttribute('aria-label', `Tab, ${bars.length} bar${bars.length > 1 ? 's' : ''}. Numbers are frets; lines are strings, thin high e at the top.`);
  bars.forEach((bar, b) => {
    const rows = LABELS.map((label, r) => {
      const s = r + 1; // guitar string number
      const cells = bar.map((tok, i) => {
        const n = parseNote(tok);
        return `<span class="tab-cell" data-step="${b * 8 + i}">${n && n.guitarString === s ? n.fret : ''}</span>`;
      }).join('');
      return `<div class="tab-row"><span class="tab-label">${label}</span>${cells}</div>`;
    }).join('');
    const label = chordsLabel ? `<div class="tab-chord">${chordsLabel[b] || ''}</div>` : '';
    root.insertAdjacentHTML('beforeend', `<div class="tab-bar">${label}${rows}</div>`);
  });
  host.append(root);
  let last = -1;
  return {
    el: root,
    highlight(step) {
      if (step === last) return;
      root.querySelectorAll('.tab-cell.now').forEach((c) => c.classList.remove('now'));
      if (step >= 0) root.querySelectorAll(`[data-step="${step}"]`).forEach((c) => c.classList.add('now'));
      last = step;
    },
  };
}
