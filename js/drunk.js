// Drunk effects: the more Pints you've had, the wobblier the pub gets.
//
// Rules this module sticks to:
//  - The reels, numbers and buttons never blur. Blur/sway hit the background, lights and decorations.
//  - Everything settles while you're deciding (nudge/collect), for a moment after any touch, and in the Bar.
//  - "Reduced effects", the phone's reduce-motion setting, or Drunk effects: Off turns it all off.

let mode = 'full';          // 'full' | 'light' | 'off'
let reduced = false;
let pint = 1;
let forced = null;          // ?drunk=0..4 for testing
let screen = 'title';
let lastTouch = 0;
let level = 0;              // smoothed intensity actually applied
let calmLevel = 1;          // 1 = full wobble, eases down when calm
let raf = 0;
let t0 = performance.now();
let nextHic = 0;
let hooks = {};
const sysReduced = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

const $ = (id) => document.getElementById(id);

// How drunk you are at each Pint (0 = sober). Endless keeps creeping up, then caps.
export function intensityFor(p) {
  if (p <= 2) return 0;
  const table = { 3: 0.25, 4: 0.35, 5: 0.5, 6: 0.6, 7: 0.8, 8: 0.9 };
  return table[p] ?? Math.min(1.3, 1 + (p - 9) * 0.06);
}
export function stageFor(d) {
  if (d <= 0) return 0;
  if (d < 0.45) return 1;   // Merry
  if (d < 0.75) return 2;   // Tipsy
  if (d <= 1) return 3;     // Hammered
  return 4;                 // Seeing double (endless)
}
export const STAGE_NAMES = ['Sober', 'Merry', 'Tipsy', 'Hammered', 'Seeing double'];

function enabled() { return mode !== 'off' && !reduced && !sysReduced.matches; }
function target() {
  if (!enabled() || screen !== 'game') return 0;
  const d = forced != null ? [0, 0.3, 0.6, 0.9, 1.2][forced] : intensityFor(pint);
  return mode === 'light' ? d * 0.5 : d;
}
export function stage() { return stageFor(target()); }

export function init(opts = {}) {
  hooks = opts;
  const q = new URLSearchParams(location.search).get('drunk');
  if (q != null && q !== '') forced = Math.max(0, Math.min(4, Number(q)));
  const touched = () => { lastTouch = performance.now(); };
  window.addEventListener('pointerdown', touched, true);
  window.addEventListener('touchstart', touched, { capture: true, passive: true });
  if (sysReduced.addEventListener) sysReduced.addEventListener('change', update);
}

export function setMode(m) { mode = m || 'full'; update(); }
export function setReduced(on) { reduced = !!on; update(); }
export function setPint(p) { pint = p || 1; update(); }
export function setScreen(s) { screen = s; update(); }

function update() {
  const d = target();
  document.body.dataset.drunk = String(stageFor(d));
  if (d > 0 && !raf) { t0 = performance.now(); nextHic = performance.now() + 15000 + Math.random() * 15000; raf = requestAnimationFrame(frame); }
}

// Calm while deciding (nudge phase), for a beat after any touch, and while busy pop-ups are open.
function isCalm(now) {
  const g = $('game-screen');
  if (g && g.dataset.phase === 'nudge') return true;
  if (now - lastTouch < 1400) return true;
  return false;
}

// Smooth wandering value in roughly -1..1 (sum of sines at odd speeds).
const wander = (t, a, b, c) => (Math.sin(t * a) * 0.55 + Math.sin(t * b + 1.7) * 0.3 + Math.sin(t * c + 4.1) * 0.15);

function frame(now) {
  raf = 0;
  const goal = target();
  level += (goal - level) * 0.03;
  calmLevel += ((isCalm(now) ? 0.12 : 1) - calmLevel) * 0.06;
  const d = level * calmLevel;
  const st = stageFor(goal);
  const t = (now - t0) / 1000;
  apply(d, st, t, now);
  if (goal > 0 || level > 0.003) raf = requestAnimationFrame(frame);
  else reset();
}

function apply(d, st, t, now) {
  const sc = $('scenery');
  const gs = $('game-screen');
  const vig = $('drunk-vignette');
  const mq = $('marquee-text');

  // Background: sway, slow blur waves (Tipsy+), colour drift.
  if (sc) {
    const x = wander(t, 0.37, 0.61, 1.13) * 16 * d;
    const y = wander(t, 0.29, 0.53, 0.97) * 7 * d;
    const r = wander(t, 0.23, 0.47, 0.83) * 1.3 * d;
    sc.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${r.toFixed(3)}deg) scale(${(1 + 0.07 * Math.min(d, 1)).toFixed(3)})`;
    const blur = st >= 2 ? Math.pow(Math.max(0, Math.sin(t * 0.9)), 4) * 3.5 * d : 0;
    const hue = st >= 2 ? wander(t, 0.17, 0.31, 0.71) * 12 * d : 0;
    sc.style.filter = blur > 0.05 || Math.abs(hue) > 0.5 ? `blur(${blur.toFixed(2)}px) hue-rotate(${hue.toFixed(1)}deg)` : '';
  }

  // Warm, gently breathing vignette.
  if (vig) vig.style.opacity = (Math.min(1, d) * (0.55 + 0.15 * Math.sin(t * 1.3))).toFixed(3);

  // Marquee: a faint double image drifting in and out.
  if (mq) {
    const g = Math.max(0, Math.sin(t * 0.8)) * (3 + 7 * d) * d;
    mq.style.textShadow = g > 0.3 ? `${g.toFixed(1)}px ${(g * 0.3).toFixed(1)}px 0 rgba(255,255,255,${(0.3 * Math.min(1, d)).toFixed(2)})` : '';
  }

  // Regulars sway a little (Tipsy+).
  const cards = document.querySelectorAll('#regulars .reg-card');
  cards.forEach((c, i) => {
    c.style.transform = st >= 2 ? `rotate(${(wander(t + i * 1.9, 0.9, 1.4, 2.3) * 3 * d).toFixed(2)}deg)` : '';
  });

  // The whole scene tilts (Hammered+, Full mode only). Settles when calm, so buttons stay put when you tap.
  if (gs) {
    if (st >= 3 && mode === 'full') {
      const r = wander(t, 0.21, 0.37, 0.59) * 1.4 * d;
      const x = wander(t, 0.27, 0.43, 0.77) * 4 * d;
      gs.style.transform = `translateX(${x.toFixed(2)}px) rotate(${r.toFixed(3)}deg)`;
    } else gs.style.transform = '';
  }

  // Hiccups (Hammered+, Full mode only, not while deciding).
  if (st >= 3 && mode === 'full' && now > nextHic && calmLevel > 0.9) {
    nextHic = now + 22000 + Math.random() * 20000;
    hiccup();
  }
}

function reset() {
  const sc = $('scenery');
  if (sc) { sc.style.transform = ''; sc.style.filter = ''; }
  const vig = $('drunk-vignette');
  if (vig) vig.style.opacity = '0';
  const mq = $('marquee-text');
  if (mq) mq.style.textShadow = '';
  const gs = $('game-screen');
  if (gs) gs.style.transform = '';
  document.querySelectorAll('#regulars .reg-card').forEach((c) => { c.style.transform = ''; });
}

function hiccup() {
  const gs = $('game-screen');
  if (!gs || screen !== 'game') return;
  gs.classList.remove('hic');
  void gs.offsetWidth;
  gs.classList.add('hic');
  setTimeout(() => gs.classList.remove('hic'), 500);
  const h = document.createElement('div');
  h.className = 'hic-text';
  h.textContent = 'hic!';
  h.style.left = 20 + Math.random() * 60 + '%';
  document.body.appendChild(h);
  setTimeout(() => h.remove(), 1400);
  if (hooks.onHiccup) hooks.onHiccup();
}

// Double vision: a ghost of the reels slides out and back after they land (Hammered+).
export function afterSpin(reelsEl) {
  const st = stageFor(target());
  if (st < 3 || !reelsEl) return;
  const ghost = reelsEl.cloneNode(true);
  ghost.removeAttribute('id');
  ghost.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
  ghost.classList.add('reels-ghost');
  ghost.setAttribute('aria-hidden', 'true');
  ghost.style.left = reelsEl.offsetLeft + 'px';
  ghost.style.top = reelsEl.offsetTop + 'px';
  ghost.style.setProperty('--gx', (st >= 4 ? 14 : 10) * (mode === 'light' ? 0.5 : 1) + 'px');
  reelsEl.parentElement.appendChild(ghost);
  setTimeout(() => ghost.remove(), 1500);
}

// Slurred speech for the Barman's messages (Hammered+).
export function slur(text) {
  const st = stageFor(target());
  if (st < 3 || !text) return text;
  let out = text.replace(/s(?=[aeiouh ])/gi, (m) => m + 'h').replace(/Showing/g, 'Shhowing');
  if (st >= 4) out = out.replace(/\. /g, '… ').replace(/!$/, '!! hic');
  return out;
}
