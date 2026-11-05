import { randomSeed } from './rng.js';
import { SYMBOLS, baseId, isGold } from './symbols.js';
import { visibleOnReel, ROWS } from './reels.js';
import * as G from './game.js';
import * as S from './shop.js';
import { REG_BY_ID, RARITY, MAX_REGULARS, sellValue, describeEffect } from './regulars.js';
import * as A from './audio.js';
import * as FX from './fx.js';
import { loadSettings, saveSettings, CREDITS } from './settings.js';
import { regularCard, itemArt, crispPacket, hueOf } from './art.js';
import { openHowTo, bindHowTo } from './howto.js';
import { tip, tipsOn, setTips, resetTips } from './coach.js';

const SAVE_KEY = 'tilt.run.v3';
const BEST_KEY = 'tilt.best.v2';

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const el = {
  title: $('title-screen'), game: $('game-screen'), barScreen: $('bar-screen'),
  start: $('start-btn'), newRun: $('new-run-btn'), best: $('best-line'),
  pint: $('pint-label'), kind: $('kind-label'), money: $('money'),
  targetLabel: $('target-label'), target: $('hud-target'), spins: $('hud-spins'),
  holds: $('hud-holds'), nudges: $('hud-nudges'),
  bossStrip: $('boss-strip'), bossFace: $('boss-strip-face'), bossName: $('boss-strip-name'), bossRule: $('boss-strip-rule'),
  bar: $('score-bar'), fill: $('score-fill'), barText: $('score-text'),
  regs: $('regulars'),
  machine: $('machine'), reelsWrap: $('reels'),
  reels: [...document.querySelectorAll('.reel')],
  paylines: [...document.querySelectorAll('.paylines line')],
  ctrls: [...document.querySelectorAll('.ctrl')],
  calc: $('calc'), coins: $('calc-coins'), mult: $('calc-mult'),
  message: $('message'), spinBtn: $('spin-btn'), seed: $('seed-line'),
  overlay: $('overlay'), panel: $('panel'), oFace: $('overlay-face'), oKicker: $('overlay-kicker'),
  oTitle: $('overlay-title'), oBody: $('overlay-body'), oBtn: $('overlay-btn'), oFoot: $('overlay-foot'),
  settings: $('settings'), settingsBtn: $('settings-btn'), barSettingsBtn: $('bar-settings-btn'), settingsClose: $('settings-close'),
  volMusic: $('vol-music'), volAmb: $('vol-ambience'), volSfx: $('vol-sfx'),
  optReduced: $('opt-reduced'), optVibe: $('opt-vibration'), abandon: $('abandon-btn'),
  credits: $('credits-list'),
  howtoBtn: $('howto-btn'), tutorialBtn: $('tutorial-btn'), settingsHowto: $('settings-howto'), optTips: $('opt-tips'),
  // Bar
  barNext: $('bar-next'), barMoney: $('bar-money'), barRegs: $('bar-regulars'), barRegCount: $('bar-reg-count'),
  stock: $('stock'), packets: $('packets'), restock: $('restock-btn'), levels: $('levels'),
  viewReels: $('view-reels-btn'), leaveBar: $('leave-bar-btn'),
  sheet: $('sheet'), sheetFace: $('sheet-face'), sheetTag: $('sheet-tag'), sheetName: $('sheet-name'),
  sheetDesc: $('sheet-desc'), sheetStatus: $('sheet-status'), sheetActions: $('sheet-actions'),
  picker: $('picker'), pickerPanel: document.querySelector('.picker-panel'), pickerKicker: $('picker-kicker'),
  pickerTitle: $('picker-title'), pickerSub: $('picker-sub'), pickerReels: $('picker-reels'), pickerCancel: $('picker-cancel'),
  packet: $('packet'), packetBag: $('packet-bag'), packetTitle: $('packet-title'), packetChoices: $('packet-choices'), packetSkip: $('packet-skip'),
};

let run = null;
let busy = false;
let settings = loadSettings();

// ---------- Persistence ----------
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(run)); } catch {} }
function load() {
  try {
    const r = JSON.parse(localStorage.getItem(SAVE_KEY));
    return r && r.v === 3 ? r : null;
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
const fmtMult = (m) => (Number.isInteger(m) ? String(m) : m.toFixed(1));

function bump(node) { node.classList.remove('bump'); void node.offsetWidth; node.classList.add('bump'); }

function say(text, big = false) {
  el.message.textContent = text;
  el.message.classList.toggle('big', big);
  if (big) bump(el.message);
}

function setCalc(coins, mult, preview = false) {
  el.coins.textContent = coins;
  el.mult.textContent = fmtMult(mult);
  el.calc.classList.toggle('preview', preview);
}

function toast(text, ms = 2200) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = text;
  t.classList.remove('show');
  void t.offsetWidth;
  t.classList.add('show');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('show'), ms);
}

function cellHTML(entry) {
  const id = baseId(entry);
  const s = SYMBOLS[id];
  const cls = ['cell'];
  if (s.text) cls.push('text', id);
  if (isGold(entry)) cls.push('gold');
  if (id === 'wild') cls.push('wild');
  const inner = id === 'bar' ? `<span class="glyph">BAR</span>` : s.icon;
  const lvl = run && run.levels[id] ? `<span class="lvl">+${run.levels[id]}</span>` : '';
  return `<div class="${cls.join(' ')}" data-sym="${id}">${inner}${lvl}</div>`;
}

const lineEl = (id) => el.paylines.find((l) => l.dataset.line === id);

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

function renderMoney() {
  el.money.textContent = `£${run.money}`;
  el.barMoney.textContent = `£${run.money}`;
}

function renderHUD() {
  const i = info();
  el.pint.textContent = `Pint ${i.pint}`;
  el.kind.textContent = i.boss ? `Landlord · Round ${i.round}` : `${i.kind.name} · Round ${i.round}`;
  renderMoney();
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

  const bossChanged = el.bossStrip.classList.contains('hidden') === !!i.boss;
  el.bossStrip.classList.toggle('hidden', !i.boss);
  if (bossChanged) requestAnimationFrame(fitLayout);
  if (i.boss) {
    el.bossFace.textContent = i.boss.face;
    el.bossName.textContent = i.boss.name;
    el.bossRule.textContent = i.boss.rule;
  }
  el.seed.textContent = `Seed ${run.seed}`;
}

function regBadge(r) {
  const s = r.state;
  if (r.id === 'quentin' && s.bank) return `+${s.bank}`;
  if (r.id === 'bore' && s.m) return `+${s.m}`;
  if (r.id === 'guvnor') return `×${(1.5 + 0.5 * (s.b || 0)).toFixed(1)}`;
  if (r.id === 'kath' && s.sell) return `£${sellValue(r)}`;
  return '';
}

function renderRegulars(container, where) {
  const cards = [];
  for (let i = 0; i < MAX_REGULARS; i++) {
    const r = run.regulars[i];
    if (!r) { cards.push(`<div class="reg-card empty"></div>`); continue; }
    const d = REG_BY_ID[r.id];
    const b = regBadge(r);
    cards.push(`<button class="reg-card r-${d.rarity}" data-slot="${i}" style="--h:${hueOf(r.id)}">
      <span class="rc-portrait"><span class="face">${d.face}</span></span><span class="nm">${d.name}</span>${b ? `<span class="badge">${b}</span>` : ''}</button>`);
  }
  container.innerHTML = cards.join('');
  container.querySelectorAll('.reg-card[data-slot]').forEach((c) =>
    c.addEventListener('click', () => openRegularSheet(Number(c.dataset.slot), where)));
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
  renderRegulars(el.regs, 'game');
  renderReelsStatic();
  renderControls();
  fitLayout();
}

// Shrink the reels until the whole game screen fits the phone, so nothing ever scrolls.
function fitLayout() {
  if (!el.game.classList.contains('active')) return;
  const root = document.documentElement;
  let cell = Math.min(92, Math.floor(innerWidth * 0.2));
  root.style.setProperty('--cell', cell + 'px');
  el.game.scrollTop = 0;
  // The SPIN button is pinned to the bottom, so a screen that fits reads as exactly full;
  // only a true overflow (scrollHeight > clientHeight) means it's too tall.
  const over = () => el.game.scrollHeight > el.game.clientHeight;
  while (over() && cell > 58) {
    cell -= 3;
    root.style.setProperty('--cell', cell + 'px');
  }
  // One extra step of headroom so a wrapping hint line can't tip it over later.
  if (cell < Math.min(92, Math.floor(innerWidth * 0.2)) && cell > 58) {
    cell -= 3;
    root.style.setProperty('--cell', cell + 'px');
  }
  if (run) renderReelsStatic();
}

function showScreen(name) {
  for (const s of [el.title, el.game, el.barScreen]) s.classList.remove('active');
  ({ title: el.title, game: el.game, bar: el.barScreen })[name].classList.add('active');
  document.body.classList.toggle('in-bar', name === 'bar');
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
  const oldStop = (run.stops[i] + dir + n) % n;
  const oldVis = visibleOnReel(strip, oldStop);
  node.style.transition = 'none';
  if (dir > 0) {
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
  renderRegulars(el.regs, 'game');   // the Pub Bore grows
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
    await tip('nudge', document.querySelector('.controls'), `The reels have landed. Use <b>▲ ▼</b> to <b>nudge</b> a reel one step and line up matches. You get a couple per round.`, { place: 'below' });
    await tip('preview', el.calc, `This shows what the spin is worth right now: <b>Coins × Mult</b>. It updates as you nudge.`);
    await tip('collect', el.spinBtn, `Happy with it? Tap <b>COLLECT</b> to bank the score.`);
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
  renderRegulars(el.regs, 'game');
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
    if (result.wins.length) {
      await tip('lines', el.reelsWrap, `There are <b>5 win lines</b>: three across and two diagonals. <b>3 in a row</b> pays big, and <b>2 matching from the left</b> pays a little.`);
    }
    if (run.spinsThisRound >= 1 && run.holdsLeft > 0) {
      await tip('hold', document.querySelector('.controls'), `Like what's on a reel? Tap <b>HOLD</b> before you spin and it stays put. You can't hold the same reel twice in a row.`, { place: 'below' });
    }
  }
}

// ---------- Scoring animation ----------
function clearHighlights() {
  el.reels.forEach((r) => r.querySelectorAll('.cell').forEach((c) => c.classList.remove('dim', 'win')));
  el.paylines.forEach((p) => p.classList.remove('on', 'blocked'));
}

function popRegular(slot, effect) {
  const card = el.regs.querySelector(`.reg-card[data-slot="${slot}"]`);
  if (!card) return;
  card.classList.remove('trigger');
  void card.offsetWidth;
  card.classList.add('trigger');
  const pop = document.createElement('span');
  const kind = effect.text ? 'note' : effect.xmult ? 'xmult' : effect.mult ? 'mult' : effect.money ? 'money' : 'coins';
  pop.className = 'reg-pop ' + kind;
  pop.textContent = describeEffect(effect);
  card.appendChild(pop);
  setTimeout(() => pop.remove(), 1000);
}

async function playResult(result) {
  const i = info();
  setCalc(0, 1);
  if (i.boss?.darkRows) { applyDark(true); FX.flash('#fff6c8', 250); await sleep(300); }

  if (result.blocked.length) {
    for (const w of result.blocked) lineEl(w.line.id).classList.add('blocked');
    A.sfx.blocked();
    say(`${i.boss.name}: "Not tonight."`);
    await sleep(700);
    el.paylines.forEach((p) => p.classList.remove('blocked'));
  }

  if (result.voided && result.voidedWins.length) {
    A.sfx.wrong();
    FX.shake(el.machine);
    A.buzz([60, 40, 60]);
    say('The Quiz Master buzzes you off.');
    await FX.stamp('WRONG ANSWER!', '#ff4b3a', 1200);
  }

  if (!result.wins.length) {
    // Regulars can still react to a losing spin (Quentin banks Mult).
    for (const st of result.steps) { popRegular(st.slot, st.effect); A.sfx.tick(); await sleep(450); }
    if (!result.voided) { A.sfx.blank(); say(pick(BLANK_LINES)); }
    return;
  }

  el.reels.forEach((r) => r.querySelectorAll('.cell').forEach((c) => c.classList.add('dim')));
  let lineNo = 0;
  let prevMult = 1;
  for (const st of result.steps) {
    if (st.kind === 'line') {
      const w = st.win;
      el.paylines.forEach((p) => p.classList.remove('on'));
      lineEl(w.line.id).classList.add('on');
      for (const [r, c] of w.cells) {
        const node = cellAt(r, c);
        node.classList.remove('dim');
        node.classList.add('win');
        FX.burstFrom(node, w.count === 3 ? 8 : 3, 'coin', 0.8);
      }
      const taxed = w.rawCoins > w.coins ? ` (Taxman took ${w.rawCoins - w.coins})` : '';
      const gold = w.goldCount ? ' ✨' : '';
      say(`${w.count}× ${w.symbol.name}${gold}, ${w.line.name}${taxed}`);
      setCalc(st.coins, st.mult);
      bump(el.coins);
      if (st.mult !== prevMult) bump(el.mult);
      A.sfx.win(lineNo++);
      A.sfx.coin();
      await sleep(420);
    } else {
      popRegular(st.slot, st.effect);
      setCalc(st.coins, st.mult);
      const e = st.effect;
      if (e.xmult) { el.mult.classList.remove('xm'); void el.mult.offsetWidth; el.mult.classList.add('xm'); A.sfx.mult(); A.sfx.mult(); FX.shake(el.calc); }
      else if (e.mult) { bump(el.mult); A.sfx.mult(); }
      else if (e.coins) { bump(el.coins); A.sfx.coin(); }
      else if (e.money) { A.sfx.cash(); }
      else A.sfx.tick();
      await sleep(e.xmult ? 520 : 380);
    }
    prevMult = st.mult;
  }
  el.paylines.forEach((p) => p.classList.remove('on'));

  const total = result.total;
  say(`+${total}`, true);
  const big = result.mult >= 8 || result.wins.length >= 3 || total >= i.target * 0.5;

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
  const start = run.score - amount;
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

// ---------- Overlays ----------
function showOverlay({ face = null, kicker = '', title, body, btn, slam = false, titleClass = '', foot = '' }) {
  return new Promise((resolve) => {
    el.oFace.classList.toggle('hidden', !face);
    el.oFace.textContent = face || '';
    el.oKicker.textContent = kicker;
    el.oTitle.textContent = title;
    el.oTitle.className = titleClass;
    el.oBody.innerHTML = body;
    el.oFoot.innerHTML = foot;
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
  showScreen('game');
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
    const b = bossRound.boss;
    await showOverlay({
      kicker: `Pint ${i.pint} · Round ${i.round}`,
      title: i.kind.name,
      body: `<p>Score <b>${i.target}</b> in <b>${run.spinsLeft}</b> spins.</p>${tip}`,
      btn: i.round === 1 ? 'Insert coin' : 'Spin up',
      foot: `<div class="rumour"><span class="boss-face">${b.face}</span>
        <span>Word at the bar: the Landlord in <b>Round ${bossRound.round}</b> is <b>${b.name}</b>. ${b.rule}</span></div>`,
    });
  }
  busy = false;
  say('Press SPIN');
  renderControls();
  if (i.boss) {
    await tip('boss', el.bossStrip, `This is a <b>Landlord</b>. His rule lasts all round, and the bar shows his <b>patience</b> draining as you score. Tap his name any time to re-read the rule.`);
  } else if (i.round === 1) {
    await tip('target', el.bar, `Score this <b>target</b> within your <b>6 spins</b> to clear the round. Each spin adds to it.`);
    await tip('spin', el.spinBtn, `Right, pull the lever. Tap <b>SPIN</b>!`);
  }
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
  const regRows = pay.regs.map((x) => `<tr><td>${REG_BY_ID[run.regulars[x.slot].id].name}</td><td>£${x.money}</td></tr>`).join('');
  await showOverlay({
    kicker: `Pint ${i.pint} · Round ${i.round}`,
    title: i.boss ? 'Landlord beaten!' : 'Round cleared!',
    body: `<p>Scored <b>${run.score}</b> / ${i.target}</p>
      <table class="pay-table">
        <tr><td>${i.kind.name} reward</td><td>£${pay.reward}</td></tr>
        <tr><td>Spare spins (${pay.spare})</td><td>£${pay.spare}</td></tr>
        <tr><td>Interest (£1 per £5, max £5)</td><td>£${pay.interest}</td></tr>
        ${regRows}
        <tr class="total"><td>Total</td><td>£${pay.total}</td></tr>
      </table>`,
    btn: i.isFinal ? 'Last orders' : 'To the Bar',
  });
  A.sfx.cash();
  const res = G.advance(run);
  if (res.won) return victory();
  save();
  el.bar.classList.remove('on-fire');
  enterBar();
}

function statsHTML() {
  const s = run.stats;
  return `<div class="stats">
    <div><b>${info().pint}</b>Pint reached</div>
    <div><b>${s.bossesBeaten}</b>Landlords beaten</div>
    <div><b>${s.bestSpin}</b>Best spin</div>
    <div><b>${run.regulars.length}</b>Regulars</div>
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

// ---------- The Bar ----------
function enterBar() {
  document.body.classList.remove('boss');
  [...document.body.classList].filter((c) => c.startsWith('rule-')).forEach((c) => document.body.classList.remove(c));
  A.setBossMode(false);
  A.setMuffled(true);
  showScreen('bar');
  renderBar();
  el.barScreen.querySelector('.bar-scroll').scrollTop = 0;
  const p = run.bar.pending;
  if (p?.kind === 'packet') openPacket(p);
  if (p?.kind === 'scratch') openPicker(p.id, (r, k) => S.applyScratch(run, p.id, r, k), () => S.cancelScratch(run));
  if (!p) barTips();
}

async function barTips() {
  await tip('bar', null, `Welcome to <b>the Bar</b>. Spend your winnings here between rounds. Leftover money earns <b>interest</b>: £1 for every £5 you hold, up to £5.`);
  await tip('stock', document.querySelector('.chalkboard'), `<b>Regulars</b> stand at your machine and boost every spin. <b>Beer Mats</b> level up a symbol. <b>Scratchcards</b> change your reels. Tap anything for details.`);
  await tip('crisps', el.packets, `<b>Crisps</b> are a lucky dip: open a packet and pick 1 of the goodies inside.`);
  await tip('leave', el.leaveBar, `When you're done, head <b>back to the machine</b>. Good luck!`);
}

function itemCardHTML(item, idx, kind) {
  const inf = S.itemInfo(item);
  const cant = !item.sold && run.money < item.price;
  const label = item.type === 'mat' ? `<span class="nm">${inf.name}</span>` : '';
  return `<button class="item item-${item.type}${item.sold ? ' sold' : ''}${cant ? ' cant' : ''}" data-kind="${kind}" data-idx="${idx}" style="--ic:${inf.colour}" aria-label="${inf.name}, £${item.price}">
    ${itemArt(item)}
    ${label}
    <span class="price-tag">£${item.price}</span>
  </button>`;
}

function renderBar() {
  const nx = info();
  el.barNext.textContent = nx.boss ? `Next: the Landlord (${nx.boss.name})` : `Next: ${nx.kind.name}, target ${nx.target}`;
  renderMoney();
  renderRegulars(el.barRegs, 'bar');
  el.barRegCount.textContent = `${run.regulars.length} / ${MAX_REGULARS}`;
  el.stock.innerHTML = run.bar.items.map((it, i) => itemCardHTML(it, i, 'item')).join('');
  el.packets.innerHTML = run.bar.packets.map((it, i) => itemCardHTML(it, i, 'packet')).join('');
  [...el.stock.children, ...el.packets.children].forEach((b) =>
    b.addEventListener('click', () => openItemSheet(b.dataset.kind, Number(b.dataset.idx))));
  el.restock.textContent = `🔔 Restock £${run.bar.rerollCost}`;
  el.restock.disabled = run.money < run.bar.rerollCost;

  const lv = Object.entries(run.levels).filter(([, n]) => n > 0);
  el.levels.innerHTML = lv.length
    ? lv.map(([id, n]) => `<span class="level-chip">${SYMBOLS[id].text ? SYMBOLS[id].name : SYMBOLS[id].icon} <b>Lv ${n + 1}</b></span>`).join('')
    : `<p class="hint">No Beer Mats yet. Each one levels up a symbol.</p>`;
}

function openSheet({ face = '', art = '', faceText = false, tag, tagColour, name, desc, status = '', actions }) {
  if (art) el.sheetFace.innerHTML = art; else el.sheetFace.textContent = face;
  el.sheetFace.classList.toggle('art', !!art);
  el.sheetFace.classList.toggle('text', faceText);
  el.sheetTag.textContent = tag;
  el.sheetTag.style.color = tagColour || '';
  el.sheetName.textContent = name;
  el.sheetDesc.textContent = desc;
  el.sheetStatus.textContent = status;
  el.sheetActions.innerHTML = '';
  for (const a of actions) {
    const b = document.createElement('button');
    b.className = a.cls || 'small-btn';
    b.textContent = a.label;
    b.disabled = !!a.disabled;
    b.addEventListener('click', () => a.onClick(b));
    el.sheetActions.appendChild(b);
  }
  el.sheet.classList.remove('hidden');
}
function closeSheet() { el.sheet.classList.add('hidden'); }

function regStatus(slot) {
  const r = run.regulars[slot];
  const d = REG_BY_ID[r.id];
  if (d.copies) {
    const right = run.regulars[slot + 1];
    if (!right) return 'Copying: nobody (put someone to his right)';
    const rd = REG_BY_ID[right.id];
    return rd.copies ? 'Copying: another Barman, which does nothing' : `Copying: ${rd.name}`;
  }
  return d.status ? d.status(r.state) : '';
}

function openRegularSheet(slot, where) {
  const r = run.regulars[slot];
  if (!r) return;
  const d = REG_BY_ID[r.id];
  const rar = RARITY[d.rarity];
  const actions = [];
  if (where === 'bar') {
    actions.push({ label: '◀', disabled: slot === 0, onClick: () => { S.move(run, slot, -1); A.sfx.nudge(); save(); renderBar(); openRegularSheet(slot - 1, where); } });
    actions.push({ label: '▶', disabled: slot >= run.regulars.length - 1, onClick: () => { S.move(run, slot, 1); A.sfx.nudge(); save(); renderBar(); openRegularSheet(slot + 1, where); } });
    actions.push({
      label: `Sell £${sellValue(r)}`, cls: 'small-btn sell',
      onClick: (btn) => {
        if (!btn.dataset.armed) { btn.dataset.armed = '1'; btn.textContent = 'Tap again to sell'; return; }
        const v = S.sell(run, slot);
        A.sfx.cash();
        toast(`${d.name} left the pub. +£${v}`);
        save(); closeSheet(); renderBar();
      },
    });
  }
  actions.push({ label: 'Close', cls: 'big-btn', onClick: closeSheet });
  openSheet({
    art: regularCard(r.id, 'lg', regBadge(r)), tag: `${rar.name} Regular · slot ${slot + 1}`, tagColour: rar.colour, name: d.name, desc: d.desc,
    status: regStatus(slot) || (where === 'game' ? 'Rearrange your Regulars at the Bar.' : ''),
    actions,
  });
}

function openItemSheet(kind, idx) {
  const item = (kind === 'packet' ? run.bar.packets : run.bar.items)[idx];
  if (!item || item.sold) return;
  const inf = S.itemInfo(item);
  let reason = '';
  if (run.money < item.price) reason = `You need £${item.price - run.money} more.`;
  else if (item.type === 'regular' && run.regulars.length >= MAX_REGULARS) reason = 'No room at the machine. Sell a Regular first.';
  let status = reason;
  if (item.type === 'mat') status = status || `${SYMBOLS[item.id].name} is level ${(run.levels[item.id] || 0) + 1} now.`;
  openSheet({
    art: itemArt(item, 'lg'),
    tag: inf.tag, tagColour: inf.colour, name: inf.name, desc: inf.desc, status,
    actions: [
      { label: 'Not now', onClick: closeSheet },
      { label: `Buy £${item.price}`, cls: 'big-btn', disabled: !!reason, onClick: () => { closeSheet(); buyItem(kind, idx); } },
    ],
  });
}

function bought(text) {
  A.sfx.cash();
  A.buzz(15);
  bump(el.barMoney);
  if (text) toast(text);
  save();
  renderBar();
}

function buyItem(kind, idx) {
  const item = (kind === 'packet' ? run.bar.packets : run.bar.items)[idx];
  if (item.type === 'scratch' && S.SCRATCH_BY_ID[item.id].target) {
    // Choose the target first; only pay once it's applied.
    openPicker(item.id, (r, k) => {
      const res = S.buy(run, kind, idx);
      if (!res.ok) return false;
      return S.applyScratch(run, item.id, r, k);
    });
    return;
  }
  const res = S.buy(run, kind, idx);
  if (!res.ok) { A.sfx.denied(); toast(res.reason); return; }
  if (res.packet) { bought(); openPacket(res.packet); return; }
  if (res.dip) { bought(res.dip.text); return; }
  if (item.type === 'mat') {
    FX.burstFrom(el.levels, 20, 'coin', 0.8);
    bought(`${SYMBOLS[item.id].name} levelled up!`);
    return;
  }
  FX.burstFrom(el.barRegs, 18, 'confetti', 0.8);
  bought(`${REG_BY_ID[item.id].name} joins you at the machine.`);
}

// ---------- Reel picker ----------
let pickerDone = null;
function chipHTML(entry, r, k, enabled) {
  const id = baseId(entry);
  const s = SYMBOLS[id];
  const cls = ['chip'];
  if (s.text) cls.push('text', id);
  if (isGold(entry)) cls.push('gold');
  if (id === 'wild') cls.push('wild');
  const label = id === 'bar' ? 'BAR' : s.icon;
  return `<button class="${cls.join(' ')}" data-r="${r}" data-k="${k}" ${enabled ? '' : 'disabled'} aria-label="${s.name}">${label}</button>`;
}

function openPicker(scratchId, onApply, onCancel = null) {
  const view = !scratchId;
  const card = scratchId ? S.SCRATCH_BY_ID[scratchId] : null;
  el.pickerPanel.classList.toggle('view', view);
  el.pickerKicker.textContent = view ? 'Your machine' : `Scratchcard · ${card.icon} ${card.name}`;
  el.pickerTitle.textContent = view ? 'Your reels' : 'Pick a symbol';
  el.pickerSub.textContent = view ? 'Every symbol on each reel strip. More copies means it lands more often.' : card.desc;
  el.pickerReels.innerHTML = run.reels.map((strip, r) =>
    `<div class="picker-row"><div class="lbl">Reel ${r + 1} · ${strip.length} symbols</div><div class="chips">${
      strip.map((e, k) => chipHTML(e, r, k, view || S.canTarget(run, scratchId, r, k))).join('')}</div></div>`).join('');
  el.pickerCancel.textContent = view ? 'Close' : 'Cancel';
  pickerDone = onCancel;
  if (!view) {
    el.pickerReels.querySelectorAll('.chip:not(:disabled)').forEach((c) => c.addEventListener('click', () => {
      const r = Number(c.dataset.r), k = Number(c.dataset.k);
      const name = SYMBOLS[baseId(run.reels[r][k])].name;
      if (onApply(r, k) === false) { A.sfx.denied(); toast('Couldn\'t do that.'); return; }
      el.picker.classList.add('hidden');
      pickerDone = null;
      FX.flash('#ffe9a6', 300);
      A.sfx.coin();
      const verb = { gold: `Gilded a ${name}`, copy: `Copied a ${name}`, bin: `Binned a ${name}`, wild: `${name} turned Wild` }[scratchId];
      bought(`${verb} on reel ${r + 1}.`);
    }));
  }
  el.picker.classList.remove('hidden');
}

// ---------- Crisp packets ----------
function openPacket(pending) {
  const pk = S.PACKET_BY_ID[pending.id];
  el.packetBag.innerHTML = crispPacket(pending.id, true);
  el.packetBag.classList.remove('open');
  el.packetTitle.textContent = pk.name;
  A.sfx.spin();
  el.packetChoices.innerHTML = '';
  el.packet.classList.remove('hidden');
  setTimeout(() => {
    el.packetBag.classList.add('open');
    A.sfx.shatter();
    FX.burstFrom(el.packetBag, 24, 'confetti', 0.9);
    el.packetChoices.innerHTML = pending.choices.map((c, i) => {
      const inf = S.itemInfo(c);
      return `<button class="item choice item-${c.type}" data-i="${i}" style="--ic:${inf.colour}">
        ${itemArt(c)}
        ${c.type === 'mat' ? `<span class="nm">${inf.name}</span>` : ''}<span class="desc">${inf.desc}</span></button>`;
    }).join('');
    el.packetChoices.querySelectorAll('.item').forEach((b) => b.addEventListener('click', () => choosePacket(pending, Number(b.dataset.i))));
  }, 1400);
}

function choosePacket(pending, ci) {
  const c = pending.choices[ci];
  if (c.type === 'regular' && run.regulars.length >= MAX_REGULARS) {
    A.sfx.denied();
    toast('No room at the machine. Skip, or sell one first.');
    return;
  }
  if (c.type === 'scratch' && S.SCRATCH_BY_ID[c.id].target) {
    el.packet.classList.add('hidden');
    openPicker(c.id, (r, k) => {
      const res = S.pickFromPacket(run, ci);
      if (!res.ok) return false;
      return S.applyScratch(run, c.id, r, k);
    }, () => el.packet.classList.remove('hidden'));
    return;
  }
  const res = S.pickFromPacket(run, ci);
  if (!res.ok) { A.sfx.denied(); toast(res.reason); return; }
  el.packet.classList.add('hidden');
  if (res.dip) return bought(res.dip.text);
  if (c.type === 'mat') return bought(`${SYMBOLS[c.id].name} levelled up!`);
  bought(`${REG_BY_ID[c.id].name} joins you at the machine.`);
}

function leaveBar() {
  if (el.sheet.classList.contains('hidden') === false) closeSheet();
  G.leaveBar(run);
  save();
  A.setMuffled(false);
  applyTheme();
  clearHighlights();
  setCalc(0, 1);
  roundIntro();
}

// ---------- Start / resume ----------
async function startRun(r, resumed = false) {
  run = r;
  busy = false;
  applyTheme();
  clearHighlights();
  setCalc(0, 1);
  el.bar.classList.remove('on-fire');
  save();
  if (!resumed) return roundIntro();

  if (run.phase === 'bar') return enterBar();
  showScreen('game');
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
  el.optTips.checked = tipsOn();
  el.settings.classList.remove('hidden');
  A.setMuffled(true);
}
function closeSettings() {
  el.settings.classList.add('hidden');
  const inBar = el.barScreen.classList.contains('active');
  if (el.overlay.classList.contains('hidden') && !inBar) A.setMuffled(false);
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
  el.optTips.addEventListener('change', () => { if (el.optTips.checked) resetTips(); else setTips(false); });
  el.settingsBtn.addEventListener('click', () => { A.unlock(); openSettings(); });
  el.barSettingsBtn.addEventListener('click', () => { A.unlock(); openSettings(); });
  el.settingsClose.addEventListener('click', closeSettings);
  el.abandon.addEventListener('click', () => {
    if (!confirm('Abandon this run? It can\'t be undone.')) return;
    clearSave();
    closeSettings();
    [el.overlay, el.sheet, el.picker, el.packet, $('coach')].forEach((o) => o.classList.add('hidden'));
    document.body.className = settings.reducedFx ? 'reduced-fx' : '';
    A.setBossMode(false);
    A.setMuffled(false);
    showScreen('title');
    el.start.textContent = 'Tap to Play';
    el.newRun.classList.add('hidden');
    el.best.textContent = bestText();
  });
  el.credits.innerHTML = CREDITS.map((c) => `<li><b>${c.what}:</b> ${c.who}</li>`).join('') +
    '<li><b>Game:</b> Tilt by Samderverse</li>';
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

  // Test shortcuts: ?round=3, ?boss=uncle, ?money=50, ?regs=penny,jen, ?bar=1 (open the Bar first)
  const debugRun = () => {
    const r = G.newRun((forcedSeed || randomSeed()).toUpperCase());
    const boss = params.get('boss');
    if (boss) r.bossOrder = [boss, ...r.bossOrder.filter((b) => b !== boss)];
    const round = Number(params.get('round'));
    if (round > 1) {
      r.round = round;
      const pint = Math.ceil(round / 3);
      if (boss) r.bossOrder = Array(pint - 1).fill(r.bossOrder[1]).concat(r.bossOrder);
    }
    if (params.get('money')) r.money = Number(params.get('money'));
    if (params.get('regs')) params.get('regs').split(',').filter((id) => REG_BY_ID[id]).slice(0, MAX_REGULARS).forEach((id) => S.addRegular(r, id));
    G.startRound(r);
    if (params.get('bar')) { S.openBar(r); r.phase = 'bar'; }
    return r;
  };
  const isDebug = ['seed', 'round', 'boss', 'money', 'regs', 'bar'].some((k) => params.has(k));

  el.start.addEventListener('click', () => {
    A.unlock();
    A.playMusic('main');
    if (isDebug) { const r = debugRun(); startRun(r, r.phase === 'bar'); }
    else if (saved) startRun(saved, true);
    else startRun(G.newRun(randomSeed()));
  });
  bindHowTo();
  el.howtoBtn.addEventListener('click', () => { A.unlock(); openHowTo(); });
  el.settingsHowto.addEventListener('click', () => { closeSettings(); openHowTo(); });
  el.tutorialBtn.addEventListener('click', () => {
    A.unlock();
    if (saved && !confirm('Start a fresh tutorial run? Your current run will be lost.')) return;
    resetTips();
    clearSave();
    A.playMusic('main');
    startRun(G.newRun(randomSeed()));
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

  // Bar controls
  el.restock.addEventListener('click', () => {
    if (!S.reroll(run)) { A.sfx.denied(); return; }
    A.sfx.spin();
    save();
    renderBar();
    el.stock.querySelectorAll('.item').forEach((n) => { n.style.animation = 'deal .4s cubic-bezier(.2,1.3,.4,1) both'; });
  });
  el.viewReels.addEventListener('click', () => openPicker(null, null));
  el.pickerCancel.addEventListener('click', () => {
    el.picker.classList.add('hidden');
    const cb = pickerDone;
    pickerDone = null;
    if (cb) cb();
  });
  el.packetSkip.addEventListener('click', () => {
    S.pickFromPacket(run, null);
    el.packet.classList.add('hidden');
    save();
    renderBar();
  });
  el.leaveBar.addEventListener('click', () => { A.unlock(); leaveBar(); });
  el.sheet.addEventListener('click', (e) => { if (e.target === el.sheet) closeSheet(); });

  // Desktop testing: Space spins/collects, 1-3 hold, Q/A W/S E/D nudge.
  window.addEventListener('keydown', (e) => {
    if (!el.game.classList.contains('active') || !el.overlay.classList.contains('hidden')) return;
    if (e.code === 'Space') { e.preventDefault(); onSpinButton(); }
    const hk = { Digit1: 0, Digit2: 1, Digit3: 2 }[e.code];
    if (hk !== undefined) onHold(hk);
    const nk = { KeyQ: [0, -1], KeyA: [0, 1], KeyW: [1, -1], KeyS: [1, 1], KeyE: [2, -1], KeyD: [2, 1] }[e.code];
    if (nk) onNudge(...nk);
  });

  window.addEventListener('resize', () => { window.scrollTo(0, 0); if (run && !busy) fitLayout(); });
  // Belt and braces: if anything ever scrolls the page itself, put it straight back.
  window.addEventListener('scroll', () => { if (window.scrollY || window.scrollX) window.scrollTo(0, 0); });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', () => window.scrollTo(0, 0));

  // ?taps=1 shows where each tap lands and which button it hit (for testing on a phone).
  if (params.has('taps')) {
    document.addEventListener('pointerdown', (e) => {
      const d = document.createElement('div');
      d.className = 'tap-dot';
      d.style.left = e.clientX + 'px';
      d.style.top = e.clientY + 'px';
      document.body.appendChild(d);
      setTimeout(() => d.remove(), 900);
      const b = e.target.closest('button');
      if (b) { b.classList.add('tap-hit'); setTimeout(() => b.classList.remove('tap-hit'), 600); }
    }, true);
  }
}

boot();
