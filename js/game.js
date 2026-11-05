// Pure game state and rules. No DOM in here, so it can be simulated and tested.
import { makeRng } from './rng.js';
import { makeReels, spin as spinStops, toGrid } from './reels.js';
import { evaluate } from './scoring.js';
import { BOSSES, BOSS_BY_ID } from './bosses.js';

export const CONFIG = {
  spins: 5,
  holds: 3,          // per round, each held reel uses one
  nudges: 2,         // per round
  pintsToWin: 8,
  startMoney: 4,
  interestPer: 5,    // £1 interest per £5 held
  interestCap: 5,
};

export const ROUND_KINDS = [
  { id: 'half', name: 'Half Pint', factor: 1.0, reward: 3 },
  { id: 'full', name: 'Full Pint', factor: 1.5, reward: 4 },
  { id: 'boss', name: 'Landlord',  factor: 2.0, reward: 5 },
];

// Base target for each Pint. Tuned by simulation (see README).
const PINT_BASE = [55, 95, 150, 230, 350, 520, 760, 1100];

export function baseTarget(pint) {
  if (pint <= PINT_BASE.length) return PINT_BASE[pint - 1];
  return Math.round(PINT_BASE[PINT_BASE.length - 1] * Math.pow(1.5, pint - PINT_BASE.length));
}

export function roundInfo(run, round = run.round) {
  const pint = Math.ceil(round / 3);
  const kind = ROUND_KINDS[(round - 1) % 3];
  const boss = kind.id === 'boss' ? BOSS_BY_ID[run.bossOrder[(pint - 1) % run.bossOrder.length]] : null;
  const target = Math.round((baseTarget(pint) * kind.factor) / 5) * 5;
  return { round, pint, kind, boss, target, reward: kind.reward, isFinal: pint === CONFIG.pintsToWin && kind.id === 'boss' };
}

export function newRun(seed) {
  const rng = makeRng(seed + '-run');
  const run = {
    v: 2,
    seed,
    reels: makeReels(makeRng(seed + '-reels')),
    bossOrder: rng.shuffle(BOSSES.map((b) => b.id)),
    round: 1,
    money: CONFIG.startMoney,
    spinIndex: 0,
    stops: [0, 0, 0],
    stats: { bestSpin: 0, totalSpins: 0, bossesBeaten: 0 },
  };
  startRound(run);
  return run;
}

export function startRound(run) {
  const info = roundInfo(run);
  const boss = info.boss;
  run.score = 0;
  run.spinsLeft = boss?.spins ?? CONFIG.spins;
  run.holdsLeft = CONFIG.holds;
  run.nudgesLeft = boss?.nudges ?? CONFIG.nudges;
  run.held = [false, false, false];
  run.lastHeld = [false, false, false];
  run.phase = 'ready';      // ready -> spinning -> nudge -> scoring -> ready / cleared / failed
  run.spinsThisRound = 0;
  return info;
}

// ----- Holds -----
export function canHold(run, i) {
  if (run.phase !== 'ready' || run.spinsThisRound === 0) return false;   // nothing to hold on the first spin
  if (run.held[i]) return true;                                          // can always un-hold
  if (run.lastHeld[i]) return false;                                     // no holding twice running
  if (run.holdsLeft <= 0) return false;
  const heldCount = run.held.filter(Boolean).length;
  return heldCount < 2;                                                  // must spin at least one reel
}

export function toggleHold(run, i) {
  if (!canHold(run, i)) return false;
  run.held[i] = !run.held[i];
  run.holdsLeft += run.held[i] ? -1 : 1;
  return true;
}

// ----- Spin -----
export function spin(run) {
  if (run.phase !== 'ready' || run.spinsLeft <= 0) return null;
  const rng = makeRng(`${run.seed}-spin-${run.spinIndex}`);
  run.spinIndex++;
  run.spinsLeft--;
  run.spinsThisRound++;
  run.stats.totalSpins++;

  const prevStops = run.stops.slice();
  const fresh = spinStops(run.reels, rng);
  run.stops = run.stops.map((s, i) => (run.held[i] ? s : fresh[i]));
  const heldMask = run.held.slice();
  run.lastHeld = run.held.slice();
  run.held = [false, false, false];

  // Drunk Uncle: swap two reels after they land.
  let swap = null;
  const boss = roundInfo(run).boss;
  if (boss?.swapReels) {
    const a = rng.int(3);
    const b = (a + 1 + rng.int(2)) % 3;
    swap = [a, b];
  }

  run.phase = 'spinning';
  return { prevStops, stops: run.stops.slice(), heldMask, swap, rng };
}

// Called by the UI once reels have visually landed.
export function landed(run, swap) {
  if (swap) {
    const [a, b] = swap;
    [run.reels[a], run.reels[b]] = [run.reels[b], run.reels[a]];
    [run.stops[a], run.stops[b]] = [run.stops[b], run.stops[a]];
    [run.lastHeld[a], run.lastHeld[b]] = [run.lastHeld[b], run.lastHeld[a]];
  }
  run.phase = run.nudgesLeft > 0 ? 'nudge' : 'scoring';
}

// ----- Nudge -----
// dir: +1 moves the reel down (the symbol above slides into view), -1 moves it up.
export function nudge(run, i, dir) {
  if (run.phase !== 'nudge' || run.nudgesLeft <= 0) return false;
  const n = run.reels[i].length;
  run.stops[i] = (run.stops[i] - dir + n) % n;
  run.nudgesLeft--;
  return true;
}

export function grid(run) {
  return toGrid(run.reels, run.stops);
}

export function preview(run) {
  return evaluate(grid(run), roundInfo(run).boss?.mods ?? {});
}

// ----- Score -----
export function collect(run) {
  const info = roundInfo(run);
  const boss = info.boss;
  const result = evaluate(grid(run), boss?.mods ?? {});
  result.voided = false;
  if (boss?.voidFirstSpin && run.spinsThisRound === 1) {
    result.voided = result.total > 0;
    result.total = 0;
  }
  run.score += result.total;
  run.stats.bestSpin = Math.max(run.stats.bestSpin, result.total);

  if (run.score >= info.target) run.phase = 'cleared';
  else if (run.spinsLeft <= 0) run.phase = 'failed';
  else run.phase = 'ready';
  result.onFire = result.total >= info.target;
  return result;
}

// ----- Round end -----
export function payout(run) {
  const info = roundInfo(run);
  const spare = run.spinsLeft;
  const interest = Math.min(CONFIG.interestCap, Math.floor(run.money / CONFIG.interestPer));
  const total = info.reward + spare + interest;
  return { reward: info.reward, spare, interest, total };
}

export function advance(run) {
  const info = roundInfo(run);
  const pay = payout(run);
  run.money += pay.total;
  if (info.boss) run.stats.bossesBeaten++;
  if (info.isFinal) { run.phase = 'won'; return { pay, won: true }; }
  run.round++;
  startRound(run);
  return { pay, won: false };
}
