import { html } from '../util.js';

// Self-rating row. The app can't hear you, so it says so.
export function ratingRow(host, { onRate, suggested = null, prompt = 'How did it go?' } = {}) {
  const root = html(`
    <div class="rating">
      <p class="rating-q">${prompt}</p>
      <div class="rating-btns" role="group" aria-label="Rate yourself">
        <button class="btn" type="button" data-r="0">Struggled</button>
        <button class="btn" type="button" data-r="1">Mostly</button>
        <button class="btn" type="button" data-r="2">Clean</button>
      </div>
      <p class="small muted">Self-rated: be honest, the app can’t hear you. Your rating decides when this comes back for review.</p>
    </div>`);
  host.append(root);
  const btns = [...root.querySelectorAll('[data-r]')];
  const mark = (r) => btns.forEach((b) => b.classList.toggle('suggested', r != null && +b.dataset.r === r));
  mark(suggested);
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-r]');
    if (!b) return;
    btns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    onRate(+b.dataset.r);
  });
  return { suggest: mark };
}
