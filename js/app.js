import * as store from './store.js';
import * as transport from './transport.js';
import { $, $$ } from './util.js';
import { pathView, lessonView, chordsView } from './views/path.js';
import { todayView, progressView } from './views/today.js';
import { trainerView } from './views/trainer.js';
import { tunerView } from './views/tuner.js';
import { metronomeView } from './views/metronome.js';
import { settingsView, welcomeView } from './views/settings.js';
import { challengesView, placementView } from './views/challenges.js';

store.load();

/* ---------- Theme toggle ---------- */
const root = document.documentElement;
$('#theme-toggle').addEventListener('click', () => {
  const current = root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const next = current === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  try { localStorage.setItem('guitar-lab:theme', next); } catch (e) { /* applied, not saved */ }
});

/* ---------- Router: #/name/param/param ---------- */
const ROUTES = {
  today: [todayView, 'today', 'Today'],
  progress: [progressView, 'today', 'Progress'],
  path: [pathView, 'path', 'Path'],
  lesson: [lessonView, 'path', 'Lesson'],
  chords: [chordsView, 'path', 'Chords'],
  trainer: [trainerView, 'trainer', 'Chord change trainer'],
  challenges: [challengesView, 'today', 'Challenges'],
  placement: [placementView, null, 'Placement check'],
  tuner: [tunerView, 'tuner', 'Tuner'],
  metronome: [metronomeView, 'metronome', 'Metronome'],
  settings: [settingsView, null, 'Settings'],
  welcome: [welcomeView, null, 'Welcome'],
};

let cleanup = null;

function render() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  let name = parts[0] || 'today';
  const st = store.get();
  if (!st.level && !['welcome', 'placement', 'settings'].includes(name)) {
    location.replace('#/welcome');
    return;
  }
  if (name === 'today' && st.level === 'pro') name = 'challenges';
  const [view, routeTab, title] = ROUTES[name] || ROUTES.today;
  const tab = name === 'challenges' && st.level !== 'pro' ? 'trainer' : routeTab;

  transport.stop();
  if (cleanup) cleanup();
  cleanup = null;
  const el = $('#view');
  el.replaceChildren();
  el.className = `view view-${name}`;
  cleanup = view(el, parts.slice(1)) || null;

  $$('.tabbar a').forEach((a) => a.toggleAttribute('aria-current', a.dataset.tab === tab));
  document.body.classList.toggle('no-tabs', !st.level);
  document.title = `${title} · Guitar Lab`;
  updateDay();
  window.scrollTo(0, 0);
}

function updateDay() {
  const st = store.get();
  $('#topbar-day').textContent = st.level && st.level !== 'pro' ? `Day ${store.dayNumber()}` : '';
}

store.subscribe(updateDay);
addEventListener('hashchange', render);
render();
