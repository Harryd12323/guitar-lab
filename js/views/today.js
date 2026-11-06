import * as store from '../store.js';
import { LESSONS, LEVELS, lessonById } from '../curriculum.js';
import { todayPlan, checkItem, mastery, MASTERY_LABELS, skill, phaseProgress, dailyBests, knownChords } from '../skills.js';
import { mixRounds } from './path.js';
import { lineChart } from '../components/chart.js';
import { html, $, esc, fmtDay, isIOS, isStandalone } from '../util.js';

function streakCard() {
  const s = store.streakInfo();
  const today = store.practicedToday();
  const frozenNote = s.frozen.length ? `A freeze covered ${fmtDay(s.frozen[0]).toLowerCase()}. ` : '';
  const freeze = s.freezeAvailable ? '❄ 1 freeze left this week' : '❄ Freeze used this week';
  return `
    <div class="card stats">
      <div class="stat"><span class="stat-num">${s.count}<span class="flame" aria-hidden="true">🔥</span></span><span class="stat-label">day streak</span></div>
      <div class="stat"><span class="stat-num">${store.get().sessions}</span><span class="stat-label">practice sessions</span></div>
      <p class="today-note small">${today ? 'You’ve practised today. ' : s.count ? 'Practise today to keep your streak. ' : ''}${frozenNote}<span class="muted">${freeze}. Missing one day a week won’t break your streak.</span></p>
    </div>`;
}

function itemHtml(item, checked) {
  let title = '';
  let detail = '';
  let link = item.link || null;
  if (item.lesson) {
    const l = lessonById[item.lesson];
    title = esc(l.title);
    link = `#/lesson/${l.id}/today/${item.key}`;
    const m = mastery(l.id);
    const sk = skill(l.id);
    if (item.key === 'weak') detail = sk.ratings.length ? `Recent ratings were low${sk.best && l.ex?.target ? ` · best ${sk.best}/${l.ex.target} BPM` : ''}` : 'Worth another look';
    if (item.key === 'review') detail = sk.last ? `Last practised ${fmtDay(sk.last).toLowerCase()} · ${MASTERY_LABELS[m]}` : 'From the lessons you skipped, a quick check you still have it';
    if (item.key === 'new') detail = l.goal;
  } else if (item.key === 'mix') {
    title = item.pairs.map((p) => p.length > 2 ? 'progression' : `${p[0]}↔${p[1]}`).join(', ');
    detail = 'Short rounds, a different pair each time';
    link = '#/today/mix';
  } else {
    title = esc(item.title);
  }
  return `
    <li class="plan-item${checked ? ' checked' : ''}">
      <input type="checkbox" id="pi-${item.key}" data-key="${item.key}"${checked ? ' checked' : ''} aria-label="Mark ${esc(item.block)} done">
      <div class="plan-text">
        <span class="plan-block">${esc(item.block)} · ${item.minutes} min</span>
        <label for="pi-${item.key}" class="plan-title">${title}</label>
        ${detail ? `<span class="plan-detail small muted">${detail}</span>` : ''}
      </div>
      ${link ? `<a class="btn small-btn" href="${link}">${checked ? 'Again' : 'Start'}</a>` : ''}
    </li>`;
}

export function todayView(el, [sub]) {
  const plan = todayPlan();
  if (sub === 'mix') {
    const item = plan.items.find((i) => i.key === 'mix');
    el.innerHTML = '<a class="back" href="#/today">← Today</a><h1>Mixed changes</h1><p class="muted">One pair per round. Count only clean changes. The diagram flips each time you tap.</p>';
    const cleanups = [];
    if (item) mixRounds(el, item.pairs, cleanups, { onFinish: () => checkItem('mix') });
    else el.insertAdjacentHTML('beforeend', '<p>No mixed round today: you need at least two chords first.</p>');
    return () => cleanups.forEach((f) => f());
  }

  const st = store.get();
  const done = plan.items.filter((i) => plan.checked[i.key]).length;
  const left = plan.items.filter((i) => !plan.checked[i.key]).reduce((a, i) => a + i.minutes, 0);
  const showTip = isIOS() && !isStandalone() && !st.settings.tipDismissed;
  el.innerHTML = `
    <section class="page-head">
      <p class="eyebrow">Day ${store.dayNumber()} · ${LEVELS[st.level].label}</p>
      <h1>${done === plan.items.length ? 'Session complete. Nice work!' : 'Today’s practice'}</h1>
      <p class="muted">${done === plan.items.length ? 'Come back tomorrow: the plan adapts to how today went.' : `About ${left} minutes. Work top to bottom: one new skill, one weak spot, one review.`}</p>
    </section>
    ${!store.storageOk ? '<p class="note-box">Your browser is blocking storage, so progress won’t be saved after you close this page.</p>' : ''}
    ${st.migratedFromV1 && !st.settings.migrationSeen ? '<p class="note-box dismissible" data-dismiss="migrationSeen">Welcome to the new Guitar Lab. Your finished lessons and streak days came with you. <button class="link-btn" type="button">OK</button></p>' : ''}
    ${showTip ? '<p class="note-box dismissible" data-dismiss="tipDismissed"><strong>Tip for iPhone:</strong> tap Share → <em>Add to Home Screen</em>. Safari can clear saved progress for websites you haven’t opened in a week; Home Screen apps keep it. You can also back up your progress in Settings. <button class="link-btn" type="button">Got it</button></p>' : ''}
    <ol class="plan card">${plan.items.map((i) => itemHtml(i, !!plan.checked[i.key])).join('')}</ol>
    <div class="progress-bar" role="progressbar" aria-label="Session progress" aria-valuemin="0" aria-valuemax="${plan.items.length}" aria-valuenow="${done}"><span></span></div>
    ${streakCard()}
    <a class="card link-card" href="#/progress"><span><strong>Progress and records</strong><br><span class="small muted">Personal bests, tempo ladders, chord change history</span></span><span aria-hidden="true">→</span></a>`;
  const bar = $('.progress-bar span', el);
  bar.style.width = `${(done / plan.items.length) * 100}%`;

  el.addEventListener('change', (e) => {
    const cb = e.target.closest('[data-key]');
    if (!cb) return;
    checkItem(cb.dataset.key, cb.checked);
    todayViewRefresh(el);
  });
  el.addEventListener('click', (e) => {
    const b = e.target.closest('.dismissible .link-btn');
    if (!b) return;
    const box = b.closest('[data-dismiss]');
    store.update((s) => { s.settings[box.dataset.dismiss] = true; });
    box.remove();
  });
  return null;
}

function todayViewRefresh(el) {
  const fresh = document.createElement('div');
  todayView(fresh, []);
  el.replaceChildren(...fresh.childNodes);
}

/* ---------- Progress & records ---------- */
export function progressView(el) {
  const st = store.get();
  const phases = phaseProgress();
  const pairs = Object.entries(st.changes).map(([k, hist]) => ({ k, hist, best: Math.max(...hist.map((x) => x.n)) }))
    .sort((a, b) => b.hist.length - a.hist.length);
  const tempos = LESSONS.filter((l) => l.ex?.target && skill(l.id).best).map((l) => ({ l, sk: skill(l.id) }));
  const rec = st.records;
  const recRows = [
    rec['timing:along'] && `Tap-along timing: spread ±${rec['timing:along'].v} ms (${fmtDay(rec['timing:along'].d)})`,
    rec['timing:gap'] && `Keep the beat: drift ${rec['timing:gap'].v} ms (${fmtDay(rec['timing:gap'].d)})`,
    rec['pulse:spread'] && `Quarter-note pulse: spread ±${rec['pulse:spread'].v} ms`,
    rec.roulette && `Random-pair roulette: ${rec.roulette.v} changes (${fmtDay(rec.roulette.d)})`,
    ...Object.entries(rec).filter(([k]) => k.startsWith('ladder:')).map(([k, v]) => `Tempo ladder, ${esc(k.slice(7))}: ${v.v} BPM`),
  ].filter(Boolean);

  el.innerHTML = `
    <a class="back" href="#/today">← Today</a>
    <section class="page-head"><h1>Progress and records</h1>
    <p class="muted">Measured from your own taps and ratings. No leaderboards: the only person to beat is yesterday’s you.</p></section>
    ${streakCard()}
    <section class="section"><h2>Path</h2><div class="card"><ul class="plain">${phases.map((p) => `<li><strong>${p.title}</strong> · ${p.done}/${p.total} done${p.skipped ? `, ${p.skipped} skipped` : ''}</li>`).join('')}</ul>
      <p class="small muted">Chords you know: ${knownChords().join(', ') || 'none yet'}</p></div></section>
    <section class="section"><h2>Chord changes (personal bests)</h2>
      ${pairs.length ? `<div class="card"><label class="field">Pair <select class="pair-select">${pairs.map((p) => `<option value="${p.k}">${p.k.replace('-', ' ↔ ')}: best ${p.best}</option>`).join('')}</select></label><div class="pair-chart"></div></div>` : '<p class="card muted">No timed changes yet. Try the <a href="#/trainer">Trainer</a>.</p>'}
    </section>
    <section class="section"><h2>Max clean tempo</h2>
      ${tempos.length ? `<div class="card"><ul class="tempo-list">${tempos.map(({ l, sk }) => `<li><a href="#/lesson/${l.id}">${esc(l.title)}</a><span class="tempo-bar"><span data-w="${Math.min(100, (sk.best / l.ex.target) * 100)}"></span></span><span class="small">${sk.best}/${l.ex.target}</span></li>`).join('')}</ul></div>` : '<p class="card muted">No tempo records yet. Loop any rhythm exercise and mark clean reps.</p>'}
    </section>
    <section class="section"><h2>Challenge records</h2>
      ${recRows.length ? `<ul class="card plain">${recRows.map((r) => `<li>${r}</li>`).join('')}</ul>` : '<p class="card muted">None yet. Try the <a href="#/challenges">challenges</a>.</p>'}
    </section>`;
  el.querySelectorAll('[data-w]').forEach((s) => { s.style.width = `${s.dataset.w}%`; });
  const sel = $('.pair-select', el);
  if (sel) {
    const draw = () => {
      const [a, b] = sel.value.split('-');
      const host = $('.pair-chart', el);
      host.replaceChildren();
      lineChart(host, dailyBests(a, b), { label: 'clean changes', caption: `Best clean ${a}↔${b} changes per day` });
    };
    sel.addEventListener('change', draw);
    draw();
  }
  return null;
}
