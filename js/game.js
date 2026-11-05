// Pure game state and rules. No DOM in here, so it can be simulated and tested.
import { makeRng } from './rng.js';
import { makeReels, spin as spinStops, toGrid } from './reels.js';
import { findWins, BASE_MULT } from './scoring.js';
import { BOSSES, BOSS_BY_ID } from './bosses.js';
import { runHook, aliasesFor, extrasFor } from './regulars.js';
import { openBar } from './shop.js';

export const CONFIG = {
  spins: 6,
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
const PINT_BASE = [450, 1050, 2050, 3700, 6100, 9500, 14000, 20000];

export function baseTarget(pint) {
  if (pint <= PINT_BASE.length) return PINT_BASE[pint - 1];
  return Math.round(PINT_BASE[PINT_BASE.length - 1] * Math.pow(1.8, pint - PINT_BASE.length));
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
    v: 3,
    seed,
    reels: makeReels(makeRng(seed + '-reels')),
    bossOrder: rng.shuffle(BOSSES.map((b) => b.id)),
    round: 1,
    money: CONFIG.startMoney,
    regulars: [],         // [{ id, state }]
    levels: {},           // Beer Mat levels per symbol
    spinIndex: 0,
    stops: [0, 0, 0],
    bar: null,
    stats: { bestSpin: 0, totalSpins: 0, bossesBeaten: 0 },
  };
  startRound(run);
  return run;
}

export function startRound(run) {
  const info = roundInfo(run);
  const boss = info.boss;
  const ex = extrasFor(run.regulars);
  run.score = 0;
  run.spinsLeft = (boss?.spins ?? CONFIG.spins) + ex.spins;
  run.holdsLeft = CONFIG.holds + ex.holds;
  run.nudgesLeft = boss?.nudges != null ? boss.nudges : CONFIG.nudges + ex.nudges;
  run.held = [false, false, false];
  run.lastHeld = [false, false, false];
  run.heldMask = [false, false, false];
  run.phase = 'ready';      // ready -> spinning -> nudge -> scoring -> ready / cleared / failed -> bar
  run.spinsThisRound = 0;
  return info;
}

// ----- Holds -----
export function canHold(run, i) {
  if (run.phase !== 'ready' || run.spinsThisRound === 0) return false;
  if (run.held[i]) return true;
  if (run.lastHeld[i]) return false;
  if (run.holdsLeft <= 0) return false;
  return run.held.filter(Boolean).length < 2;
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
  run.heldMask = heldMask;
  run.lastHeld = run.held.slice();
  run.held = [false, false, false];

  let swap = null;
  if (roundInfo(run).boss?.swapReels) {
    const a = rng.int(3);
    const b = (a + 1 + rng.int(2)) % 3;
    swap = [a, b];
  }
  run.phase = 'spinning';
  return { prevStops, stops: run.stops.slice(), heldMask, swap, rng };
}

export function landed(run, swap) {
  if (swap) {
    const [a, b] = swap;
    [run.reels[a], run.reels[b]] = [run.reels[b], run.reels[a]];
    [run.stops[a], run.stops[b]] = [run.stops[b], run.stops[a]];
    [run.lastHeld[a], run.lastHeld[b]] = [run.lastHeld[b], run.lastHeld[a]];
    [run.heldMask[a], run.heldMask[b]] = [run.heldMask[b], run.heldMask[a]];
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
  runHook(run.regulars, 'nudge', { run });
  return true;
}

export function grid(run) {
  return toGrid(run.reels, run.stops);
}

// ----- Scoring pipeline -----
// Builds the ordered list of steps the UI animates:
//   { kind: 'line', win, coins, mult }
//   { kind: 'reg', slot, effect }
// commit=false works on copies of Regular state, so previews have no side effects.
export function compute(run, commit) {
  const info = roundInfo(run);
  const boss = info.boss;
  const regs = commit ? run.regulars : run.regulars.map((r) => ({ id: r.id, state: JSON.parse(JSON.stringify(r.state)) }));
  const ctx = {
    ...(boss?.mods || {}),
    aliases: aliasesFor(regs),
    levels: run.levels,
  };
  const { wins, blocked } = findWins(grid(run), ctx);

  const voided = !!(boss?.voidFirstSpin && run.spinsThisRound === 1);
  const scored = voided ? [] : wins;
  const steps = [];
  let coins = 0;
  let mult = BASE_MULT;
  let money = 0;
  const apply = (slot, effect) => {
    if (effect.coins) coins += effect.coins;
    if (effect.mult) mult += effect.mult;
    if (effect.xmult) mult *= effect.xmult;
    if (effect.money) money += effect.money;
    steps.push({ kind: 'reg', slot, effect, coins, mult });
  };
  const base = { run, info, wins: scored, heldMask: run.heldMask || [false, false, false] };

  // Coins add up across lines; Mult only comes from the best line (so several lines don't snowball).
  let lineMult = 0;
  for (const win of scored) {
    coins += win.coins;
    if (win.mult > lineMult) { mult += win.mult - lineMult; lineMult = win.mult; }
    steps.push({ kind: 'line', win, coins, mult });
    for (const { slot, effect } of runHook(regs, 'line', { ...base, win })) apply(slot, effect);
  }
  for (const { slot, effect } of runHook(regs, 'end', base)) apply(slot, effect);

  mult = Math.round(mult * 100) / 100;
  const total = scored.length ? Math.floor(coins * mult) : 0;
  return { wins: scored, blocked, voided, voidedWins: voided ? wins : [], steps, coins, mult, money, total };
}

export function preview(run) {
  return compute(run, false);
}

export function collect(run) {
  const info = roundInfo(run);
  const result = compute(run, true);
  run.money += result.money;
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
  // Peek at Regulars' round-end money without changing their state.
  const copies = run.regulars.map((r) => ({ id: r.id, state: JSON.parse(JSON.stringify(r.state)) }));
  const regs = runHook(copies, 'roundEnd', { run, wasBoss: !!info.boss })
    .filter((x) => x.effect.money)
    .map((x) => ({ slot: x.slot, money: x.effect.money }));
  const regMoney = regs.reduce((s, x) => s + x.money, 0);
  return { reward: info.reward, spare, interest, regs, total: info.reward + spare + interest + regMoney };
}

export function advance(run) {
  const info = roundInfo(run);
  const pay = payout(run);
  runHook(run.regulars, 'roundEnd', { run, wasBoss: !!info.boss });
  run.money += pay.total;
  if (info.boss) run.stats.bossesBeaten++;
  if (info.isFinal) { run.phase = 'won'; return { pay, won: true }; }
  run.round++;
  startRound(run);
  openBar(run);
  run.phase = 'bar';
  return { pay, won: false };
}

// Leaving the Bar re-applies round setup, since Regulars bought there can change spins/holds/nudges.
export function leaveBar(run) {
  run.bar = null;
  startRound(run);
}
