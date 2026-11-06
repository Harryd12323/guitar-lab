import * as store from '../store.js';
import { LEVELS } from '../curriculum.js';
import { applyLevel, startIndex } from '../skills.js';
import { CHORDS } from '../chords.js';
import { strum } from '../audio.js';
import { tapGame } from '../components/timing.js';
import { $, toast, isIOS, isStandalone } from '../util.js';

function levelCards(current) {
  return Object.entries(LEVELS).map(([k, l]) => `
    <label class="level-card${current === k ? ' selected' : ''}">
      <input type="radio" name="level" value="${k}"${current === k ? ' checked' : ''}>
      <span class="level-name">${l.label}</span>
      <span class="level-desc small muted">${l.desc}</span>
    </label>`).join('');
}

/* ---------- First launch ---------- */
export function welcomeView(el) {
  const st = store.get();
  el.innerHTML = `
    <section class="page-head welcome">
      <h1>Welcome to Guitar Lab</h1>
      <p class="lead">A daily practice coach for guitar. Every day it tells you what to practise, tracks how you improve, and brings old skills back before you forget them.</p>
      ${st.migratedFromV1 ? '<p class="note-box">Your progress from the old version is safe. Pick a level to continue.</p>' : ''}
    </section>
    <h2>Where are you starting from?</h2>
    <form class="levels">${levelCards(null)}</form>
    <p class="center"><a class="btn" href="#/placement">Not sure? Take the 2-minute placement check</a></p>
    <p class="small muted center">You can change your level any time in Settings. Lessons you skip stay open to you.</p>`;
  $('.levels', el).addEventListener('change', (e) => {
    applyLevel(e.target.value);
    location.hash = '#/today';
  });
  return null;
}

/* ---------- Settings ---------- */
export function settingsView(el) {
  const st = store.get();
  const showHome = isIOS() && !isStandalone();
  el.innerHTML = `
    <a class="back" href="#/today">← Today</a>
    <section class="page-head"><h1>Settings</h1></section>

    <section class="section"><h2>Skill level</h2>
      <form class="levels">${levelCards(st.level)}</form>
      <p class="small muted">Moving up marks earlier lessons as <em>skipped</em> (not done). Moving down reopens them. Finished lessons stay finished.</p>
      <a class="btn" href="#/placement">Take the placement check</a>
    </section>

    <section class="section"><h2>Chord diagram help</h2>
      <div class="card">
        <label class="check-row"><input type="checkbox" class="help-always"${st.settings.help === 'always' ? ' checked' : ''}> <span>Always show finger numbers</span></label>
        <p class="small muted">Normally help fades as you master a chord: finger numbers, then dots only, then just the name (with a Peek button).</p>
      </div>
    </section>

    <section class="section"><h2>Sound</h2>
      <div class="card">
        <button class="btn sound-test" type="button">Play a test chord</button>
        ${isIOS() ? '<p class="small muted">No sound on iPhone? Check the volume. On some iOS versions the silent switch also mutes websites, so try switching it off.</p>' : ''}
      </div>
    </section>

    <section class="section"><h2>Tap latency calibration</h2>
      <div class="card">
        <p class="small">Headphones (especially Bluetooth) add delay between the click and when you hear it. Tap along with 16 clicks so timing scores can account for it. Use the same headphones or speaker you practise with.</p>
        <p class="small latency-now">${st.settings.latency == null ? 'Not calibrated yet.' : `Current offset: ${st.settings.latency} ms.`}</p>
        <div class="calib"></div>
        <button class="link-btn latency-reset" type="button"${st.settings.latency == null ? ' hidden' : ''}>Clear calibration</button>
      </div>
    </section>

    <section class="section"><h2>Back up your progress</h2>
      <div class="card">
        <p class="small">Your progress lives only on this device. Copy this code somewhere safe (Notes works), or paste it into Guitar Lab on a new phone.</p>
        <button class="btn export" type="button">Copy backup code</button>
        <textarea class="code-box" rows="3" readonly hidden aria-label="Backup code"></textarea>
        <label class="field">Restore from a code <textarea class="import-box" rows="3" placeholder="Paste a GL2-… code here"></textarea></label>
        <button class="btn import" type="button">Restore</button>
      </div>
      ${showHome ? '<p class="note-box"><strong>iPhone:</strong> tap Share → <em>Add to Home Screen</em>. Safari may delete data from websites you haven’t opened for 7 days; Home Screen apps are exempt.</p>' : ''}
    </section>

    <section class="section"><h2>Privacy</h2>
      <div class="card small">
        <p>No accounts, no analytics, no cookies, no tracking. Nothing you do here is sent anywhere. The tuner listens to your microphone only while it’s open, and the sound never leaves your device.</p>
        <button class="btn danger reset" type="button">Reset all progress</button>
      </div>
    </section>`;

  $('.levels', el).addEventListener('change', (e) => {
    const lvl = e.target.value;
    applyLevel(lvl);
    el.querySelectorAll('.level-card').forEach((c) => c.classList.toggle('selected', c.querySelector('input').checked));
    toast(lvl === 'pro' ? 'Level: Pro. Today now shows challenges.' : `Level: ${LEVELS[lvl].label}. Starting at lesson ${startIndex(lvl) + 1}.`);
  });
  $('.help-always', el).addEventListener('change', (e) => {
    store.update((s) => { s.settings.help = e.target.checked ? 'always' : 'auto'; });
  });
  $('.sound-test', el).addEventListener('click', () => strum(CHORDS.G));

  const calib = tapGame($('.calib', el), {
    bpm: 90, bars: 4, label: 'Calibrate: tap along with 16 clicks',
    onDone: (r) => {
      if (r.hits < 10) { toast('Not enough taps matched. Try again.'); return; }
      const total = Math.round(r.median + (store.get().settings.latency || 0));
      store.update((s) => { s.settings.latency = total; });
      $('.latency-now', el).textContent = `Current offset: ${total} ms.`;
      $('.latency-reset', el).hidden = false;
      toast(`Calibrated: ${total} ms`);
    },
  });
  $('.latency-reset', el).addEventListener('click', (e) => {
    store.update((s) => { s.settings.latency = null; });
    $('.latency-now', el).textContent = 'Not calibrated yet.';
    e.target.hidden = true;
  });

  $('.export', el).addEventListener('click', async () => {
    const code = store.exportCode();
    const box = $('.code-box', el);
    box.hidden = false;
    box.value = code;
    box.select();
    try { await navigator.clipboard.writeText(code); toast('Backup code copied'); } catch (e) { toast('Select the code and copy it'); }
  });
  $('.import', el).addEventListener('click', () => {
    const code = $('.import-box', el).value;
    if (!code.trim()) return;
    if (!confirm('Replace the progress on this device with the backup?')) return;
    try {
      store.importCode(code);
      toast('Progress restored');
      location.hash = '#/today';
    } catch (err) {
      toast(err.message || 'That code didn’t work.');
    }
  });
  $('.reset', el).addEventListener('click', () => {
    if (!confirm('Reset all lessons, ratings, records and your streak? This can’t be undone.')) return;
    store.resetAll();
    location.hash = '#/welcome';
  });
  return calib.destroy;
}
