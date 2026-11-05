import { randomSeed } from './rng.js';
import { SYMBOLS } from './symbols.js';
import { visibleOnReel, ROWS } from './reels.js';
import * as G from './game.js';
import * as A from './audio.js';
import * as FX from './fx.js';
import { loadSettings, saveSettings, CREDITS } from './settings.js';

const SAVE_KEY = 'tilt.run.v2';
const BEST_KEY = 'tilt.best.v2';

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const el = {
  title: $('title-screen'), game: $('game-screen'),
  start: $('start-btn'), newRun: $('new-run-btn'), best: $('best-line'),
  pint: $('pint-label'), kind: $('kind-label'), money: $('money'),
  targetLabel: $('target-label'), target: $('hud-target'), spins: $('hud-spins'),
  holds: $('hud-holds'), nudges: $('hud-nudges'),
  bossStrip: $('boss-strip'), bossFace: $('boss-strip-face'), bossName: $('boss-strip-name'), bossRule: $('boss-strip-rule'),
  bar: $('score-bar'), fill: $('score-fill'), barText: $('score-text'),
  machine: $('machine'), reelsWrap: $('reels'),
  reels: [...document.querySelectorAll('.reel')],
  paylines: [...document.querySelectorAll('.payline')],
  ctrls: [...document.querySelectorAll('.ctrl')],
  calc: $('calc'), coins: $('calc-coins'), mult: $('calc-mult'),
  message: $('message'), spinBtn: $('spin-btn'), seed: $('seed-line'),
  overlay: $('overlay'), panel: $('panel'), oFace: $('overlay-face'), oKicker: $('overlay-kicker'),
  oTitle: $('overlay-title'), oBody: $('overlay-body'), oBtn: $('overlay-btn'),
  settings: $('settings'), settingsBtn: $('settings-btn'), settingsClose: $('settings-close'),
  volMusic: $('vol-music'), volAmb: $('vol-ambience'), volSfx: $('vol-sfx'),
  optReduced: $('opt-reduced'), optVibe: $('opt-vibration'), abandon: $('abandon-btn'),
  credits: $('credits-list'),
};

let run = null;
let busy = false;
let settings = loadSettings();

// ---------- Persistence ----------
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(run)); } catch {} }
function load() {
  try {
    const r = JSON.parse(localStorage.getItem(SAVE_KEY));
    return r && r.v === 2 ? r : null;
  } catch { return null; }
}
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch {} }
function getBest() { try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; } }
function setBest(roundsCleared) {
  try { if (roundsCleared > getBest()) localStorage.setItem(BEST_KEY, String(roundsCleared)); } catch {}
}
function bestText() {
  const b = getBest();
  if (!b) return '';
  return `Best: ${b} round${b === 1 ? '' : 's'} cleared (Pint ${Math.min(G.CONFIG.pintsToWin, Math.floor(b / 3) + 1)})`;
}

// ---------- Helpers ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const info = () => G.roundInfo(run);

function bump(node) { node.classList.remove('bump'); void node.offsetWidth; node.classList.add('bump'); }

function say(text, big = false) {
  el.message.textContent = text;
  el.message.classList.toggle('big', big);
  if (big) bump(el.message);
}

function setCalc(coins, mult, preview = false) {
  el.coins.textContent = coins;
  el.mult.textContent = mult;
  el.calc.classList.toggle('preview', preview);
}

function cellHTML(id) {
  const s = SYMBOLS[id];
  const inner = id === 'bar' ? `<span class="glyph">BAR</span>` : s.icon;
  return `<div class="cell${s.text ? ' text ' + id : ''}" data-sym="${id}">${inner}</div>`;
}

function cellSize() { return el.reels[0].clientHeight / ROWS; }
function cellAt(row, col) { return el.reels[col].querySelectorAll('.cell')[row]; }

// ---------- Rendering ----------
function renderReel(i) {
  const s = el.reels[i].querySelector('.strip');
  s.style.transition = 'none';
  s.style.transform = 'translateY(0)';
  s.innerHTML = visibleOnReel(run.reels[i], run.stops[i]).map(cellHTML).join('');
}

function renderReelsStatic() {
  for (let i = 0; i < 3; i++) renderReel(i);
  applyDark();
}

function applyDark(reveal = false) {
  const rows = info().boss?.darkRows || [];
  for (let c = 0; c < 3; c++) {
    for (let r = 0; r < 3; r++) cellAt(r, c)?.classList.toggle('dark', !reveal && rows.includes(r));
  }
}

function renderHUD() {
  const i = info();
  el.pint.textContent = `Pint ${i.pint}`;
  el.kind.textContent = i.boss ? `Landlord · Round ${i.round}` : `${i.kind.name} · Round ${i.round}`;
  el.money.textContent = `£${run.money}`;
  el.target.textContent = i.target;
  el.spins.textContent = run.spinsLeft;
  el.holds.textContent = run.holdsLeft;
  el.nudges.textContent = run.nudgesLeft;
  el.holds.parentElement.classList.toggle('empty', run.holdsLeft <= 0);
  el.nudges.parentElement.classList.toggle('empty', run.nudgesLeft <= 0);

  const pct = Math.min(100, (run.score / i.target) * 100);
  if (i.boss) {
    el.targetLabel.textContent = 'Patience';
    el.fill.style.width = (100 - pct) + '%';
    const left = Math.max(0, i.target - run.score);
    el.barText.textContent = left ? `Patience ${left}` : 'SNAPPED';
    const pulse = run.spinsLeft <= 1 ? '.55s' : run.spinsLeft <= 2 ? '1s' : '2.4s';
    document.documentElement.style.setProperty('--pulse', pulse);
  } else {
    el.targetLabel.textContent = 'Target';
    el.fill.style.width = pct + '%';
    el.barText.textContent = `${run.score} / ${i.target}`;
  }

  el.bossStrip.classList.toggle('hidden', !i.boss);
  if (i.boss) {
    el.bossFace.textContent = i.boss.face;
    el.bossName.textContent = i.boss.name;
    el.bossRule.textContent = i.boss.rule;
  }
  el.seed.textContent = `Seed ${run.seed}`;
}

function renderControls() {
  const phase = busy ? 'busy' : run.phase === 'nudge' ? 'nudge' : 'ready';
  el.game.dataset.phase = phase;
  el.ctrls.forEach((ctrl, i) => {
    const hold = ctrl.querySelector('.hold-btn');
    hold.classList.toggle('on', run.held[i]);
    hold.disabled = !G.canHold(run, i);
    hold.textContent = run.held[i] ? 'HELD' : run.lastHeld[i] && run.spinsThisRound > 0 ? 'COOL' : 'HOLD';
    ctrl.querySelectorAll('.nudge-btn').forEach((b) => (b.disabled = run.nudgesLeft <= 0 || phase !== 'nudge'));
    el.reels[i].classList.toggle('held', run.held[i]);
  });
  const collecting = run.phase === 'nudge';
  el.spinBtn.textContent = collecting ? 'COLLECT' : 'SPIN';
  el.spinBtn.classList.toggle('collect', collecting);
  el.spinBtn.disabled = busy || !(run.phase === 'ready' || run.phase === 'nudge');
}

function applyTheme() {
  const b = info().boss;
  document.body.classList.toggle('boss', !!b);
  [...document.body.classList].filter((c) => c.startsWith('rule-')).forEach((c) => document.body.classList.remove(c));
  if (b) document.body.classList.add('rule-' + b.id);
  A.setBossMode(!!b);
}

function renderAll() {
  renderHUD();
  renderReelsStatic();
  renderControls();
}

// ---------- Spin animation ----------
async function animateSpin(s) {
  const size = cellSize();
  const durations = [850, 1100, 1350];
  const dark = !!info().boss?.darkRows;
  const jobs = el.reels.map((reelEl, i) => {
    if (s.heldMask[i]) return Promise.resolve();
    const strip = run.reels[i];
    const from = visibleOnReel(strip, s.prevStops[i]);
    const to = visibleOnReel(strip, s.stops[i]);
    const extra = Array.from({ length: 14 + i * 3 }, () => s.rng.pick(strip));
    const all = [...to, ...extra, ...from];
    const node = reelEl.querySelector('.strip');
    node.style.transition = 'none';
    node.innerHTML = all.map(cellHTML).join('');
    if (dark) node.querySelectorAll('.cell').forEach((c) => c.classList.add('dark'));
    node.style.transform = `translateY(${-(all.length - 3) * size}px)`;
    void node.offsetWidth;
    reelEl.classList.add('spinning');
    node.style.transition = `transform ${durations[i]}ms cubic-bezier(.15,.6,.25,1.08)`;
    node.style.transform = 'translateY(0)';
    return new Promise((resolve) => setTimeout(() => {
      reelEl.classList.remove('spinning');
      renderReel(i);
      applyDark();
      A.sfx.stop(i);
      A.buzz(10);
      resolve();
    }, durations[i]));
  });
  await Promise.all(jobs);
}

async function animateSwap([a, b]) {
  const ra = el.reels[a], rb = el.reels[b];
  const dx = rb.offsetLeft - ra.offsetLeft;
  say('Uncle bumps the machine!');
  A.sfx.swap();
  FX.shake(el.machine);
  A.buzz([20, 30, 20]);
  [ra, rb].forEach((r) => { r.style.transition = 'transform 450ms cubic-bezier(.5,-0.4,.5,1.4)'; r.style.zIndex = 5; });
  ra.style.transform = `translate(${dx}px, -12px) rotate(4deg)`;
  rb.style.transform = `translate(${-dx}px, 12px) rotate(-4deg)`;
  await sleep(480);
  [ra, rb].forEach((r) => { r.style.transition = 'none'; r.style.transform = ''; r.style.zIndex = ''; });
}

async function animateNudge(i, dir) {
  const size = cellSize();
  const node = el.reels[i].querySelector('.strip');
  const strip = run.reels[i];
  const n = strip.length;
  const oldStop = (run.stops[i] + dir + n) % n;   // state already moved
  const oldVis = visibleOnReel(strip, oldStop);
  node.style.transition = 'none';
  if (dir > 0) {
    // Reel moves down: a new symbol comes in at the top.
    const incoming = strip[(run.stops[i] - 1 + n) % n];
    node.innerHTML = [incoming, ...oldVis].map(cellHTML).join('');
    node.style.transform = `translateY(${-size}px)`;
    void node.offsetWidth;
    node.style.transition = 'transform 180ms cubic-bezier(.3,1.4,.6,1)';
    node.style.transform = 'translateY(0)';
  } else {
    const incoming = strip[(run.stops[i] + 1) % n];
    node.innerHTML = [...oldVis, incoming].map(cellHTML).join('');
    node.style.transform = 'translateY(0)';
    void node.offsetWidth;
    node.style.transition = 'transform 180ms cubic-bezier(.3,1.4,.6,1)';
    node.style.transform = `translateY(${-size}px)`;
  }
  await sleep(190);
  renderReel(i);
  applyDark();
}

// ---------- Player actions ----------
function onHold(i) {
  if (busy) return;
  if (G.toggleHold(run, i)) {
    run.held[i] ? A.sfx.hold() : A.sfx.unhold();
    A.buzz(8);
  } else {
    A.sfx.denied();
    if (run.spinsThisRound === 0) say('Spin first, then hold what you like.');
    else if (run.lastHeld[i]) say('That reel was just held. It needs a spin.');
    else if (run.holdsLeft <= 0) say('No holds left this round.');
    else say('You have to spin at least one reel.');
  }
  renderHUD();
  renderControls();
}

async function onNudge(i, dir) {
  if (busy || run.phase !== 'nudge') return;
  if (!G.nudge(run, i, dir)) { A.sfx.denied(); return; }
  busy = true;
  renderControls();
  A.sfx.nudge();
  A.buzz(8);
  renderHUD();
  await animateNudge(i, dir);
  busy = false;
  save();
  showPreview();
  if (run.nudgesLeft <= 0) {
    renderControls();
    await sleep(250);
    await doCollect();
  } else {
    renderControls();
  }
}

function showPreview() {
  const p = G.preview(run);
  setCalc(p.coins, p.mult, true);
  const extra = run.nudgesLeft === 1 ? '1 nudge' : `${run.nudgesLeft} nudges`;
  say(p.total ? `Showing +${p.total}. Nudge (${extra}) or COLLECT.` : `Nothing yet. Nudge (${extra}) or COLLECT.`);
}

async function onSpinButton() {
  A.unlock();
  if (busy) return;
  if (run.phase === 'ready') await doSpin();
  else if (run.phase === 'nudge') await doCollect();
}

async function doSpin() {
  clearHighlights();
  el.bar.classList.remove('on-fire');
  const s = G.spin(run);
  if (!s) return;
  busy = true;
  say('');
  setCalc(0, 1);
  renderHUD();
  renderControls();
  A.sfx.spin();
  await animateSpin(s);
  if (s.swap) await animateSwap(s.swap);
  G.landed(run, s.swap);
  renderReelsStatic();
  busy = false;
  save();
  if (run.phase === 'nudge') {
    renderControls();
    showPreview();
  } else {
    await doCollect();
  }
}

async function doCollect() {
  busy = true;
  run.phase = 'scoring';
  renderControls();
  const result = G.collect(run);
  await playResult(result);
  save();

  if (run.phase === 'cleared') {
    await sleep(450);
    if (info().boss) await bossDefeated();
    await roundCleared();
  } else if (run.phase === 'failed') {
    await sleep(600);
    gameOver();
  } else {
    busy = false;
    renderControls();
  }
}

// ---------- Scoring animation ----------
function clearHighlights() {
  el.reels.forEach((r) => r.querySelectorAll('.cell').forEach((c) => c.classList.remove('dim', 'win')));
  el.paylines.forEach((p) => p.classList.remove('on', 'blocked'));
}

async function playResult(result) {
  const i = info();
  setCalc(0, 1);
  if (i.boss?.darkRows) { applyDark(true); FX.flash('#fff6c8', 250); await sleep(300); }

  if (result.blocked.length) {
    for (const w of result.blocked) el.paylines[w.line.cells[0][0]].classList.add('blocked');
    A.sfx.blocked();
    say(`${i.boss.name}: "Not tonight."`);
    await sleep(700);
    el.paylines.forEach((p) => p.classList.remove('blocked'));
  }

  if (result.voided) {
    A.sfx.wrong();
    FX.shake(el.machine);
    A.buzz([60, 40, 60]);
    say('The Quiz Master buzzes you off.');
    await FX.stamp('WRONG ANSWER!', '#ff4b3a', 1200);
    return;
  }

  if (!result.wins.length) {
    A.sfx.blank();
    say(pick(BLANK_LINES));
    return;
  }

  el.reels.forEach((r) => r.querySelectorAll('.cell').forEach((c) => c.classList.add('dim')));
  let coins = 0;
  let mult = 1;
  let step = 0;
  for (const w of result.wins) {
    const row = w.line.cells[0][0];
    el.paylines[row].classList.add('on');
    for (const [r, c] of w.cells) {
      const node = cellAt(r, c);
      node.classList.remove('dim');
      node.classList.add('win');
      FX.burstFrom(node, w.count === 3 ? 8 : 3, 'coin', 0.8);
    }
    const taxed = w.rawCoins > w.coins ? ` (Taxman took ${w.rawCoins - w.coins})` : '';
    say(`${w.count}× ${w.symbol.name}, ${w.line.name}${taxed}`);
    coins += w.coins;
    setCalc(coins, mult);
    bump(el.coins);
    A.sfx.win(step++);
    A.sfx.coin();
    await sleep(380);
    if (w.mult) {
      mult += w.mult;
      setCalc(coins, mult);
      bump(el.mult);
      A.sfx.mult();
      await sleep(320);
    }
    el.paylines[row].classList.remove('on');
  }

  const total = result.total;
  say(`+${total}`, true);
  const big = mult >= 4 || result.wins.length >= 2 || total >= i.target * 0.5;

  if (result.onFire) {
    el.bar.classList.add('on-fire');
    A.duck(0.3, 1.6);
    A.sfx.fire();
    FX.flash('#ff8a2b', 450);
    FX.aberrate(el.machine);
    FX.punch(el.machine);
    FX.shake(el.game, 'big');
    FX.burstFrom(el.bar, 40, 'ember', 1.2);
    FX.burstFrom(el.reelsWrap, 50, 'confetti', 1.4);
    A.buzz([40, 30, 80, 30, 120]);
    hot();
  } else if (big) {
    A.duck(0.45, 1);
    FX.shake(el.machine);
    FX.burstFrom(el.reelsWrap, 30, 'confetti', 1);
    A.buzz([30, 40, 60]);
    hot();
  } else {
    A.buzz(25);
  }
  await tickScore(total);
}

function hot() {
  el.machine.classList.add('hot');
  setTimeout(() => el.machine.classList.remove('hot'), 1300);
}

async function tickScore(amount) {
  const start = run.score - amount;   // collect() already added it
  const steps = Math.min(20, amount);
  for (let k = 1; k <= steps; k++) {
    const shown = Math.round(start + (amount * k) / steps);
    const real = run.score;
    run.score = shown;
    renderHUD();
    run.score = real;
    if (k % 2) A.sfx.tick();
    await sleep(22);
  }
  renderHUD();
}

// ---------- Round flow ----------
function showOverlay({ face = null, kicker = '', title, body, btn, slam = false, titleClass = '' }) {
  return new Promise((resolve) => {
    el.oFace.classList.toggle('hidden', !face);
    el.oFace.textContent = face || '';
    el.oKicker.textContent = kicker;
    el.oTitle.textContent = title;
    el.oTitle.className = titleClass;
    el.oBody.innerHTML = body;
    el.oBtn.textContent = btn;
    el.panel.classList.remove('slam');
    void el.panel.offsetWidth;
    if (slam) el.panel.classList.add('slam');
    el.overlay.classList.remove('hidden');
    A.setMuffled(true);
    el.oBtn.onclick = () => {
      A.unlock();
      el.overlay.classList.add('hidden');
      A.setMuffled(false);
      resolve();
    };
  });
}

function bossPreviewHTML(boss, label) {
  return `<div class="next-boss"><span class="boss-face">${boss.face}</span>
    <span class="boss-text"><strong>${label}: ${boss.name}</strong><span>${boss.rule}</span></span></div>`;
}

async function roundIntro() {
  const i = info();
  busy = true;
  renderAll();
  if (i.boss) {
    A.sfx.slam();
    FX.flash('#ff2a2a', 500);
    FX.shake(el.game, 'big');
    A.buzz([80, 40, 120]);
    await showOverlay({
      face: i.boss.face,
      kicker: `Pint ${i.pint} · The Landlord`,
      title: i.boss.name,
      body: `<p class="rule-box">${i.boss.rule}</p>
             <p>Wear down <b>${i.target}</b> patience in <b>${run.spinsLeft}</b> spins.</p>`,
      btn: 'Bring it on',
      slam: true,
    });
  } else {
    const bossRound = G.roundInfo(run, (i.pint - 1) * 3 + 3);
    const tip = i.round === 1
      ? `<p class="muted">After a spin, NUDGE reels up or down, then COLLECT. Before a spin, HOLD reels to keep them.</p>`
      : '';
    await showOverlay({
      kicker: `Pint ${i.pint} · Round ${i.round}`,
      title: i.kind.name,
      body: `<p>Score <b>${i.target}</b> in <b>${run.spinsLeft}</b> spins.</p>${tip}
             ${bossPreviewHTML(bossRound.boss, 'Landlord this Pint')}`,
      btn: i.round === 1 ? 'Insert coin' : 'Spin up',
    });
  }
  busy = false;
  say('Press SPIN');
  renderControls();
}

async function bossDefeated() {
  A.sfx.shatter();
  A.duck(0.3, 2);
  FX.flash('#ffffff', 600);
  FX.shake(el.game, 'big');
  FX.burstFrom(el.bar, 60, 'shard', 1.3);
  FX.burstFrom(el.reelsWrap, 70, 'confetti', 1.6);
  A.buzz([60, 40, 60, 40, 200]);
  el.bar.classList.remove('on-fire');
  await FX.stamp('LANDLORD BEATEN', 'var(--gold)', 1500);
}

async function roundCleared() {
  const i = info();
  A.sfx.clear();
  const pay = G.payout(run);
  setBest(run.round);
  const next = G.roundInfo(run, run.round + 1);
  let nextHTML = '';
  if (!i.isFinal) {
    nextHTML = next.boss
      ? bossPreviewHTML(next.boss, 'Up next, the Landlord')
      : `<p class="muted">Next: ${next.kind.name}, Pint ${next.pint}. Target ${next.target}.</p>`;
  }
  await showOverlay({
    kicker: `Pint ${i.pint} · Round ${i.round}`,
    title: i.boss ? 'Landlord beaten!' : 'Round cleared!',
    body: `<p>Scored <b>${run.score}</b> / ${i.target}</p>
      <table class="pay-table">
        <tr><td>${i.kind.name} reward</td><td>£${pay.reward}</td></tr>
        <tr><td>Spare spins (${pay.spare})</td><td>£${pay.spare}</td></tr>
        <tr><td>Interest</td><td>£${pay.interest}</td></tr>
        <tr class="total"><td>Total</td><td>£${pay.total}</td></tr>
      </table>
      <p class="muted">The Bar opens in the next update, so hang on to your money.</p>
      ${nextHTML}`,
    btn: i.isFinal ? 'Last orders' : 'Next round',
  });
  A.sfx.cash();
  const res = G.advance(run);
  bump(el.money);
  if (res.won) return victory();
  save();
  el.bar.classList.remove('on-fire');
  applyTheme();
  clearHighlights();
  setCalc(0, 1);
  await roundIntro();
}

function statsHTML() {
  const s = run.stats;
  return `<div class="stats">
    <div><b>${info().pint}</b>Pint reached</div>
    <div><b>${s.bossesBeaten}</b>Landlords beaten</div>
    <div><b>${s.bestSpin}</b>Best spin</div>
    <div><b>${s.totalSpins}</b>Spins</div>
  </div><p class="muted">Seed ${run.seed}</p>`;
}

async function gameOver() {
  A.sfx.lose();
  A.buzz([80, 60, 200]);
  FX.glitch(el.game, 900);
  FX.flash('#ff2a2a', 700);
  setBest(run.round - 1);
  clearSave();
  const i = info();
  await showOverlay({
    face: i.boss ? i.boss.face : null,
    kicker: i.boss ? `${i.boss.name} wins` : `Round ${i.round}`,
    title: 'TILT!',
    titleClass: 'tilt-title glitch',
    body: `<p>${run.score} / ${i.target}. The machine takes your last coin.</p>${statsHTML()}`,
    btn: 'Play again',
  });
  document.body.classList.remove('boss');
  startRun(G.newRun(randomSeed()));
}

async function victory() {
  clearSave();
  setBest(run.round);
  document.body.classList.remove('boss');
  A.setBossMode(false);
  FX.burst(innerWidth / 2, innerHeight / 2, 120, 'confetti', 2);
  FX.flash('#ffc23d', 800);
  A.sfx.clear();
  await showOverlay({
    face: '🏆',
    kicker: 'Last orders',
    title: 'You beat the pub!',
    body: `<p>Every Landlord down. The machine is yours.</p>${statsHTML()}`,
    btn: 'New run',
  });
  startRun(G.newRun(randomSeed()));
}

// ---------- Start / resume ----------
async function startRun(r, resumed = false) {
  run = r;
  busy = false;
  el.title.classList.remove('active');
  el.game.classList.add('active');
  applyTheme();
  clearHighlights();
  setCalc(0, 1);
  el.bar.classList.remove('on-fire');
  save();
  if (!resumed) return roundIntro();

  // Resuming: pick up exactly where they left off.
  if (run.phase === 'spinning') run.phase = run.nudgesLeft > 0 ? 'nudge' : 'scoring';
  renderAll();
  if (run.phase === 'cleared') { busy = true; renderControls(); return roundCleared(); }
  if (run.phase === 'scoring') return doCollect();
  if (run.phase === 'nudge') { showPreview(); return; }
  if (run.spinsThisRound === 0) return roundIntro();
  say('Welcome back.');
}

const BLANK_LINES = [
  'Nothing. Classic.',
  'The machine laughs at you.',
  'Not even a cherry.',
  'Have you tried hitting it?',
  'Blank. Lovely.',
  'Your pint\'s getting warm.',
  'Someone at the bar sniggers.',
];
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

// ---------- Settings ----------
function applySettings() {
  A.setVolumes({ music: settings.music, ambience: settings.ambience, sfx: settings.sfx });
  A.setVibration(settings.vibration);
  FX.setReduced(settings.reducedFx);
}

function openSettings() {
  el.volMusic.value = settings.music;
  el.volAmb.value = settings.ambience;
  el.volSfx.value = settings.sfx;
  el.optReduced.checked = settings.reducedFx;
  el.optVibe.checked = settings.vibration;
  el.settings.classList.remove('hidden');
  A.setMuffled(true);
}
function closeSettings() {
  el.settings.classList.add('hidden');
  if (el.overlay.classList.contains('hidden')) A.setMuffled(false);
}

function bindSettings() {
  const onChange = () => {
    settings = {
      music: Number(el.volMusic.value),
      ambience: Number(el.volAmb.value),
      sfx: Number(el.volSfx.value),
      reducedFx: el.optReduced.checked,
      vibration: el.optVibe.checked,
    };
    saveSettings(settings);
    applySettings();
  };
  [el.volMusic, el.volAmb, el.volSfx, el.optReduced, el.optVibe].forEach((n) => n.addEventListener('input', onChange));
  el.volSfx.addEventListener('change', () => A.sfx.coin());
  el.settingsBtn.addEventListener('click', () => { A.unlock(); openSettings(); });
  el.settingsClose.addEventListener('click', closeSettings);
  el.abandon.addEventListener('click', () => {
    if (!confirm('Abandon this run? It can\'t be undone.')) return;
    clearSave();
    closeSettings();
    el.overlay.classList.add('hidden');
    document.body.className = settings.reducedFx ? 'reduced-fx' : '';
    A.setBossMode(false);
    el.game.classList.remove('active');
    el.title.classList.add('active');
    el.start.textContent = 'Tap to Play';
    el.newRun.classList.add('hidden');
    el.best.textContent = bestText();
  });
  el.credits.innerHTML = CREDITS.map((c) => `<li><b>${c.what}:</b> ${c.who}</li>`).join('') +
    '<li><b>Game:</b> Tilt by Sam Elstone</li>';
}

// ---------- Boot ----------
function boot() {
  FX.initFx();
  A.preload();
  applySettings();
  bindSettings();
  el.best.textContent = bestText();

  const params = new URLSearchParams(location.search);
  const forcedSeed = params.get('seed');
  const saved = load();
  if (saved && !location.search) {
    el.start.textContent = 'Continue';
    el.newRun.classList.remove('hidden');
  }

  // Test shortcuts: ?round=3 starts at that round, ?boss=uncle forces that Landlord, ?money=50
  const debugRun = () => {
    const r = G.newRun((forcedSeed || randomSeed()).toUpperCase());
    const boss = params.get('boss');
    if (boss) r.bossOrder = [boss, ...r.bossOrder.filter((b) => b !== boss)];
    const round = Number(params.get('round'));
    if (round > 1) {
      r.round = round;
      const pint = Math.ceil(round / 3);
      if (boss) r.bossOrder = Array(pint - 1).fill(r.bossOrder[1]).concat(r.bossOrder);
      G.startRound(r);
    }
    if (params.get('money')) r.money = Number(params.get('money'));
    return r;
  };
  const isDebug = forcedSeed || params.get('round') || params.get('boss');

  el.start.addEventListener('click', () => {
    A.unlock();
    A.playMusic('main');
    if (isDebug) startRun(debugRun());
    else if (saved) startRun(saved, true);
    else startRun(G.newRun(randomSeed()));
  });
  el.newRun.addEventListener('click', () => {
    A.unlock();
    A.playMusic('main');
    clearSave();
    startRun(G.newRun(randomSeed()));
  });

  el.spinBtn.addEventListener('click', onSpinButton);
  el.ctrls.forEach((ctrl, i) => {
    ctrl.querySelector('.hold-btn').addEventListener('click', () => { A.unlock(); onHold(i); });
    ctrl.querySelectorAll('.nudge-btn').forEach((b) => b.addEventListener('click', () => { A.unlock(); onNudge(i, Number(b.dataset.dir)); }));
  });
  el.bossStrip.addEventListener('click', () => {
    const b = info().boss;
    if (b) { say(`${b.name}: ${b.rule}`); FX.shake(el.bossStrip); }
  });

  // Desktop testing: Space spins/collects, 1-3 hold, Q/A W/S E/D nudge.
  window.addEventListener('keydown', (e) => {
    if (!el.game.classList.contains('active') || !el.overlay.classList.contains('hidden')) return;
    if (e.code === 'Space') { e.preventDefault(); onSpinButton(); }
    const hk = { Digit1: 0, Digit2: 1, Digit3: 2 }[e.code];
    if (hk !== undefined) onHold(hk);
    const nk = { KeyQ: [0, -1], KeyA: [0, 1], KeyW: [1, -1], KeyS: [1, 1], KeyE: [2, -1], KeyD: [2, 1] }[e.code];
    if (nk) onNudge(...nk);
  });

  window.addEventListener('resize', () => { if (run && !busy && el.game.classList.contains('active')) renderReelsStatic(); });
}

boot();
