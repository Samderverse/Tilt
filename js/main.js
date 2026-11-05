import { makeRng, randomSeed } from './rng.js';
import { SYMBOLS } from './symbols.js';
import { makeReels, spin as spinReels, toGrid, visibleOnReel, ROWS } from './reels.js';
import { evaluate } from './scoring.js';
import { unlock, sfx, buzz } from './audio.js';

// ---------- Config ----------
const SPINS_PER_ROUND = 5;
const SAVE_KEY = 'tilt.run.v1';
const BEST_KEY = 'tilt.best.v1';

// Round 1 is passable most of the time on pure luck; it ramps from there.
export function targetFor(round) {
  return Math.round((40 * Math.pow(1.45, round - 1)) / 5) * 5;
}

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const el = {
  title: $('title-screen'), game: $('game-screen'),
  start: $('start-btn'), best: $('best-line'),
  round: $('hud-round'), target: $('hud-target'), target2: $('hud-target-2'),
  spins: $('hud-spins'), score: $('hud-score'), fill: $('score-fill'),
  reels: [...document.querySelectorAll('.reel')],
  paylines: [...document.querySelectorAll('.payline')],
  coins: $('calc-coins'), mult: $('calc-mult'),
  message: $('message'), spinBtn: $('spin-btn'), seed: $('seed-line'),
  machine: document.querySelector('.machine'),
  overlay: $('overlay'), oTitle: $('overlay-title'), oBody: $('overlay-body'), oBtn: $('overlay-btn'),
};

// ---------- State ----------
let run = null;      // { seed, reels, round, score, spinsLeft, spinIndex, stops }
let busy = false;

function newRun(seed = randomSeed()) {
  const reels = makeReels(makeRng(seed + '-reels'));
  return {
    seed, reels,
    round: 1, score: 0,
    spinsLeft: SPINS_PER_ROUND,
    spinIndex: 0,
    stops: reels.map(() => 0),
  };
}

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(run)); } catch {}
}
function load() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch { return null; }
}
function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch {}
}
function getBest() {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; }
}
function setBest(round) {
  try { if (round > getBest()) localStorage.setItem(BEST_KEY, String(round)); } catch {}
}

// ---------- Rendering ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function cellHTML(id) {
  const s = SYMBOLS[id];
  return `<div class="cell${s.text ? ' text ' + id : ''}" data-sym="${id}">${s.icon}</div>`;
}

function cellSize() {
  return el.reels[0].clientHeight / ROWS;
}

function renderReelsStatic() {
  run.reels.forEach((strip, i) => {
    const s = el.reels[i].querySelector('.strip');
    s.style.transition = 'none';
    s.style.transform = 'translateY(0)';
    s.innerHTML = visibleOnReel(strip, run.stops[i]).map(cellHTML).join('');
  });
}

function renderHUD() {
  const target = targetFor(run.round);
  el.round.textContent = run.round;
  el.target.textContent = target;
  el.target2.textContent = target;
  el.spins.textContent = run.spinsLeft;
  el.score.textContent = run.score;
  el.fill.style.width = Math.min(100, (run.score / target) * 100) + '%';
  el.seed.textContent = `Seed ${run.seed}`;
}

function setCalc(coins, mult) {
  el.coins.textContent = coins;
  el.mult.textContent = mult;
}
function bump(node) {
  node.classList.remove('bump');
  void node.offsetWidth;
  node.classList.add('bump');
}

function say(text, big = false) {
  el.message.textContent = text;
  el.message.classList.toggle('big', big);
  if (big) { el.message.style.animation = 'none'; void el.message.offsetWidth; el.message.style.animation = ''; }
}

function shake() {
  el.machine.classList.remove('shake');
  void el.machine.offsetWidth;
  el.machine.classList.add('shake');
}

// ---------- Spin animation ----------
async function animateSpin(newStops, rng) {
  const size = cellSize();
  const durations = [900, 1150, 1400];
  const filler = 14;

  const done = el.reels.map((reelEl, i) => {
    const strip = run.reels[i];
    const from = visibleOnReel(strip, run.stops[i]);
    const to = visibleOnReel(strip, newStops[i]);
    const extra = Array.from({ length: filler + i * 3 }, () => rng.pick(strip));
    const all = [...to, ...extra, ...from];      // land at top, start at bottom
    const s = reelEl.querySelector('.strip');
    const startY = -(all.length - 3) * size;

    s.style.transition = 'none';
    s.innerHTML = all.map(cellHTML).join('');
    s.style.transform = `translateY(${startY}px)`;
    void s.offsetWidth;
    reelEl.classList.add('spinning');
    s.style.transition = `transform ${durations[i]}ms cubic-bezier(.15,.6,.25,1.08)`;
    s.style.transform = 'translateY(0)';

    return new Promise((resolve) => {
      setTimeout(() => {
        reelEl.classList.remove('spinning');
        s.style.transition = 'none';
        s.innerHTML = to.map(cellHTML).join('');
        s.style.transform = 'translateY(0)';
        sfx.stop(i);
        buzz(10);
        resolve();
      }, durations[i]);
    });
  });

  await Promise.all(done);
  run.stops = newStops;
}

function cellAt(row, col) {
  return el.reels[col].querySelectorAll('.cell')[row];
}

// ---------- Scoring animation ----------
async function playResult(result) {
  setCalc(0, 1);
  if (!result.wins.length) {
    sfx.blank();
    say(pickLine(BLANK_LINES));
    return 0;
  }

  // Dim everything, then light up winners line by line.
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
    }
    say(`${w.count}× ${w.symbol.name}  ${w.line.name}`);

    coins += w.coins;
    setCalc(coins, mult);
    bump(el.coins);
    sfx.win(step++);
    await sleep(380);

    if (w.mult) {
      mult += w.mult;
      setCalc(coins, mult);
      bump(el.mult);
      sfx.mult();
      await sleep(320);
    }
    el.paylines[row].classList.remove('on');
  }

  const total = coins * mult;
  say(`+${total}`, true);
  if (mult >= 4 || result.wins.length >= 2) {
    shake();
    buzz([30, 40, 60]);
    el.machine.classList.add('hot');
    setTimeout(() => el.machine.classList.remove('hot'), 1200);
  } else {
    buzz(25);
  }
  await tickScore(total);
  return total;
}

async function tickScore(amount) {
  const start = run.score;
  const end = start + amount;
  const steps = Math.min(20, amount);
  for (let i = 1; i <= steps; i++) {
    run.score = Math.round(start + (amount * i) / steps);
    renderHUD();
    if (i % 2) sfx.tick();
    await sleep(22);
  }
  run.score = end;
  renderHUD();
}

function clearHighlights() {
  el.reels.forEach((r) => r.querySelectorAll('.cell').forEach((c) => c.classList.remove('dim', 'win')));
  el.paylines.forEach((p) => p.classList.remove('on'));
}

// ---------- Flow ----------
async function doSpin() {
  if (busy || run.spinsLeft <= 0) return;
  busy = true;
  el.spinBtn.disabled = true;
  clearHighlights();
  say('');
  setCalc(0, 1);

  // A fresh RNG per spin, seeded from the run, keeps saves resumable and runs replayable.
  const rng = makeRng(`${run.seed}-spin-${run.spinIndex}`);
  run.spinIndex++;
  run.spinsLeft--;
  renderHUD();
  sfx.spin();

  const stops = spinReels(run.reels, rng);
  await animateSpin(stops, rng);
  const result = evaluate(toGrid(run.reels, run.stops));
  await playResult(result);
  save();

  const target = targetFor(run.round);
  if (run.score >= target) {
    await sleep(500);
    roundCleared();
  } else if (run.spinsLeft <= 0) {
    await sleep(600);
    gameOver();
  } else {
    busy = false;
    el.spinBtn.disabled = false;
  }
}

function showOverlay(title, body, btnText, onClick) {
  el.oTitle.textContent = title;
  el.oBody.textContent = body;
  el.oBtn.textContent = btnText;
  el.oBtn.onclick = () => {
    el.overlay.classList.add('hidden');
    onClick();
  };
  el.overlay.classList.remove('hidden');
}

function roundCleared() {
  sfx.clear();
  buzz([40, 50, 40, 50, 80]);
  const spare = run.spinsLeft;
  setBest(run.round);
  showOverlay(
    'Round cleared!',
    `Scored ${run.score} / ${targetFor(run.round)}\n${spare} spin${spare === 1 ? '' : 's'} to spare.\n\nNext target: ${targetFor(run.round + 1)}`,
    'Next Round',
    () => {
      run.round++;
      run.score = 0;
      run.spinsLeft = SPINS_PER_ROUND;
      save();
      clearHighlights();
      renderHUD();
      setCalc(0, 1);
      say('Press SPIN');
      busy = false;
      el.spinBtn.disabled = false;
    }
  );
}

function gameOver() {
  sfx.lose();
  buzz([80, 60, 200]);
  setBest(run.round - 1);
  clearSave();
  const reached = run.round;
  showOverlay(
    'TILT!',
    `The machine wins.\nYou reached round ${reached} with ${run.score} / ${targetFor(reached)}.\n\nBest: round ${getBest()} cleared`,
    'Play Again',
    () => startRun(newRun())
  );
}

function startRun(r) {
  run = r;
  busy = false;
  el.title.classList.remove('active');
  el.game.classList.add('active');
  renderReelsStatic();
  clearHighlights();
  renderHUD();
  setCalc(0, 1);
  say(run.spinIndex ? 'Welcome back' : 'Press SPIN');
  el.spinBtn.disabled = run.spinsLeft <= 0;
  save();
  // Resumed a save that had already hit its target: finish the round properly.
  if (run.score >= targetFor(run.round)) { busy = true; el.spinBtn.disabled = true; roundCleared(); }
}

const BLANK_LINES = [
  'Nothing. Classic.',
  'The machine laughs.',
  'Not even a cherry.',
  'Have you tried hitting it?',
  'Blank. Lovely.',
  'Pint\'s getting warm.',
];
function pickLine(lines) {
  return lines[Math.floor(Math.random() * lines.length)];
}

// ---------- Boot ----------
function boot() {
  const best = getBest();
  el.best.textContent = best ? `Best: round ${best} cleared` : '';

  const params = new URLSearchParams(location.search);
  const forcedSeed = params.get('seed');
  const saved = load();
  if (saved && !forcedSeed) el.start.textContent = 'Continue';

  el.start.addEventListener('click', () => {
    unlock();
    if (forcedSeed) startRun(newRun(forcedSeed.toUpperCase()));
    else if (saved && saved.spinsLeft > 0) startRun(saved);
    else startRun(newRun());
  });
  el.spinBtn.addEventListener('click', () => { unlock(); doSpin(); });

  // Desktop testing: space bar spins.
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && el.game.classList.contains('active')) { e.preventDefault(); doSpin(); }
  });

  // Keep cell sizes right after rotation/resize.
  window.addEventListener('resize', () => { if (run && !busy) renderReelsStatic(); });
}

boot();
