// Pure game state and rules. No DOM in here, so it can be simulated and tested.
import { makeRng } from './rng.js';
import { makeReels, spin as spinStops, toGrid } from './reels.js';
import { findWins, BASE_MULT } from './scoring.js';
import { BOSSES, BOSS_BY_ID } from './bosses.js';
import { runHook, aliasesFor, extrasFor } from './regulars.js';
import { openBar, hasSpecial } from './shop.js';
import { MACHINE_BY_ID, machineOf, stripFor } from './machines.js';

export const CONFIG = {
  spins: 6,
  holds: 3,          // per round, each held reel uses one
  nudges: 2,         // per round
  pintsToWin: 8,
  startMoney: 4,
  interestPer: 5,    // £1 interest per £5 held
  interestCap: 3,    // +£2 with the Piggy Bank special
  spareCap: 3,       // £1 per unused spin, up to £3
  endlessGrowth: 1.75, // target growth per Pint after Pint 8
  bumpRisk: 0.1,     // tilt chance of the first bump each round...
  bumpRiskStep: 0.2, // ...plus this for every bump already made that round
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
  return Math.round(PINT_BASE[PINT_BASE.length - 1] * Math.pow(CONFIG.endlessGrowth, pint - PINT_BASE.length));
}

export function roundInfo(run, round = run.round) {
  const pint = Math.ceil(round / 3);
  const kind = ROUND_KINDS[(round - 1) % 3];
  const boss = kind.id === 'boss' ? BOSS_BY_ID[run.bossOrder[(pint - 1) % run.bossOrder.length]] : null;
  const tf = machineOf(run).targetFactor || 1;
  const target = Math.round((baseTarget(pint) * kind.factor * tf) / 5) * 5;
  const endless = pint > CONFIG.pintsToWin;
  return { round, pint, kind, boss, target, reward: kind.reward, endless,
    isFinal: pint === CONFIG.pintsToWin && kind.id === 'boss' && !run.endless };
}

// Landlord order: 4 early ones for Pints 1-4, 4 nasty ones for Pints 5-8,
// then the other 8 for endless Pints 9-16, then it cycles.
function bossOrderFor(rng) {
  const t1 = rng.shuffle(BOSSES.filter((b) => b.tier === 1).map((b) => b.id));
  const t2 = rng.shuffle(BOSSES.filter((b) => b.tier === 2).map((b) => b.id));
  return [...t1.slice(0, 4), ...t2.slice(0, 4), ...rng.shuffle([...t1.slice(4), ...t2.slice(4)])];
}

export function newRun(seed, machineId = 'local') {
  const rng = makeRng(seed + '-run');
  const m = MACHINE_BY_ID[machineId] || MACHINE_BY_ID.local;
  const reels = makeReels(makeRng(seed + '-reels'), stripFor(m));
  if (m.wild) reels.forEach((strip) => { const k = strip.indexOf('lemon'); strip[k >= 0 ? k : 0] = 'wild'; });
  const run = {
    v: 3,
    seed,
    machine: m.id,
    endless: false,
    reels,
    bossOrder: bossOrderFor(rng),
    round: 1,
    money: m.startMoney ?? CONFIG.startMoney,
    regulars: [],         // [{ id, state }]
    levels: {},           // Beer Mat levels per symbol
    specials: [],         // Landlord's Specials owned
    specialPint: 0,       // Pint a Special was last bought in (one per Pint)
    spinIndex: 0,
    stops: [0, 0, 0],
    bar: null,
    stats: { bestSpin: 0, totalSpins: 0, bossesBeaten: 0, binned: 0, tilts: 0 },
  };
  startRound(run);
  return run;
}

// Regulars that are allowed to act this round (Members Only bars the leftmost one).
export function activeRegs(run, regs = run.regulars) {
  const boss = roundInfo(run).boss;
  if (!boss?.barFirst || !regs.length) return regs;
  return [{ id: '__barred', state: {} }, ...regs.slice(1)];
}

export function startRound(run) {
  const info = roundInfo(run);
  const boss = info.boss;
  const m = machineOf(run);
  const ex = extrasFor(activeRegs(run));
  if (hasSpecial(run, 'pocket')) ex.holds++;
  if (hasSpecial(run, 'shoes')) ex.nudges++;
  if (hasSpecial(run, 'happy')) ex.spins++;
  run.score = 0;
  run.spinsLeft = Math.max(1, (boss?.spins ?? CONFIG.spins) + ex.spins + (m.spins || 0));
  run.holdsLeft = CONFIG.holds + ex.holds;
  run.nudgesLeft = boss?.nudges != null ? boss.nudges : CONFIG.nudges + ex.nudges;
  run.held = [false, false, false];
  run.lastHeld = [false, false, false];
  run.heldMask = [false, false, false];
  run.phase = 'ready';      // ready -> spinning -> nudge -> scoring -> ready / cleared / failed -> bar
  run.spinsThisRound = 0;
  run.bumpsThisRound = 0;
  run.bumpsThisSpin = 0;
  run.tilted = false;
  return info;
}

const jammedReel = (run) => roundInfo(run).boss?.jammed;

// ----- Holds -----
export function canHold(run, i) {
  if (run.phase !== 'ready' || run.spinsThisRound === 0) return false;
  if (jammedReel(run) === i) return false;
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
  run.bumpsThisSpin = 0;
  run.tilted = false;

  // Running a Tab: each spin costs money while you have it.
  const boss = roundInfo(run).boss;
  let paid = 0;
  if (boss?.spinCost && run.money > 0) { paid = Math.min(boss.spinCost, run.money); run.money -= paid; }

  let swap = null;
  if (roundInfo(run).boss?.swapReels) {
    const a = rng.int(3);
    const b = (a + 1 + rng.int(2)) % 3;
    swap = [a, b];
  }
  run.phase = 'spinning';
  return { prevStops, stops: run.stops.slice(), heldMask, swap, rng, paid };
}

export function landed(run, swap) {
  if (swap) {
    const [a, b] = swap;
    [run.reels[a], run.reels[b]] = [run.reels[b], run.reels[a]];
    [run.stops[a], run.stops[b]] = [run.stops[b], run.stops[a]];
    [run.lastHeld[a], run.lastHeld[b]] = [run.lastHeld[b], run.lastHeld[a]];
    [run.heldMask[a], run.heldMask[b]] = [run.heldMask[b], run.heldMask[a]];
  }
  run.phase = run.nudgesLeft > 0 || canBump(run, true) ? 'nudge' : 'scoring';
}

// ----- Bump (the Tilt mechanic) -----
export function canBump(run, ignorePhase = false) {
  if (!ignorePhase && run.phase !== 'nudge') return false;
  return !roundInfo(run).boss?.noBump;
}

// Chance that the NEXT bump tilts the machine.
export function tiltChance(run) {
  const safe = extrasFor(activeRegs(run)).tiltSafe;
  const c = CONFIG.bumpRisk + CONFIG.bumpRiskStep * (run.bumpsThisRound || 0) - safe;
  return Math.max(0, Math.min(0.95, Math.round(c * 100) / 100));
}

// Jolts every reel up, down or not at all (at least one moves). Might TILT, which voids the spin.
export function bump(run) {
  if (!canBump(run)) return null;
  const rng = makeRng(`${run.seed}-bump-${run.spinIndex}-${run.bumpsThisRound}`);
  const chance = tiltChance(run);
  run.bumpsThisRound++;
  run.bumpsThisSpin++;
  if (rng.next() < chance) {
    run.tilted = true;
    run.stats.tilts = (run.stats.tilts || 0) + 1;
    return { tilted: true, chance };
  }
  const jam = jammedReel(run);
  let moves;
  do { moves = [0, 1, 2].map((i) => (i === jam ? 0 : rng.int(3) - 1)); } while (moves.every((d) => d === 0));
  moves.forEach((d, i) => {
    const n = run.reels[i].length;
    run.stops[i] = (run.stops[i] - d + n) % n;
  });
  runHook(activeRegs(run), 'nudge', { run, bumped: true });
  return { tilted: false, moves, chance };
}

// ----- Nudge -----
// dir: +1 moves the reel down (the symbol above slides into view), -1 moves it up.
export function canNudge(run, i) {
  return run.phase === 'nudge' && run.nudgesLeft > 0 && jammedReel(run) !== i && !run.tilted;
}

export function nudge(run, i, dir) {
  if (!canNudge(run, i)) return false;
  const n = run.reels[i].length;
  run.stops[i] = (run.stops[i] - dir + n) % n;
  run.nudgesLeft--;
  runHook(activeRegs(run), 'nudge', { run });
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
  const own = commit ? run.regulars : run.regulars.map((r) => ({ id: r.id, state: JSON.parse(JSON.stringify(r.state)) }));
  const regs = activeRegs(run, own);
  const ctx = {
    ...(boss?.mods || {}),
    aliases: aliasesFor(regs),
    levels: run.levels,
  };
  const { wins, blocked } = findWins(grid(run), ctx);

  const voided = !!(boss?.voidFirstSpin && run.spinsThisRound === 1) || !!run.tilted;
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

  // Coins add up across lines; Multi only comes from the best line (so several lines don't snowball).
  let lineMult = 0;
  for (const win of scored) {
    coins += win.coins;
    if (win.mult > lineMult) { mult += win.mult - lineMult; lineMult = win.mult; }
    steps.push({ kind: 'line', win, coins, mult });
    for (const { slot, effect } of runHook(regs, 'line', { ...base, win })) apply(slot, effect);
  }
  for (const { slot, effect } of runHook(regs, 'end', base)) apply(slot, effect);

  // Watered Down: the Landlord halves the final Multi.
  if (boss?.multFactor && scored.length) {
    mult = Math.max(1, mult * boss.multFactor);
    steps.push({ kind: 'boss', text: `${boss.name}: Multi cut by a third`, coins, mult });
  }

  mult = Math.round(mult * 100) / 100;
  const total = scored.length ? Math.floor(coins * mult) : 0;
  return { wins: scored, blocked, voided, tilted: !!run.tilted, voidedWins: voided ? wins : [], steps, coins, mult, money, total };
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
export function interestCap(run) {
  if (machineOf(run).noInterest) return 0;
  return CONFIG.interestCap + (hasSpecial(run, 'piggy') ? 2 : 0);
}

export function payout(run) {
  const info = roundInfo(run);
  const spare = Math.min(CONFIG.spareCap, run.spinsLeft);
  const interest = Math.min(interestCap(run), Math.floor(run.money / CONFIG.interestPer));
  // Peek at Regulars' round-end money without changing their state.
  const copies = activeRegs(run, run.regulars.map((r) => ({ id: r.id, state: JSON.parse(JSON.stringify(r.state)) })));
  const regs = runHook(copies, 'roundEnd', { run, wasBoss: !!info.boss })
    .filter((x) => x.effect.money)
    .map((x) => ({ slot: x.slot, money: x.effect.money }));
  const regMoney = regs.reduce((s, x) => s + x.money, 0);
  return { reward: info.reward, spare, interest, regs, total: info.reward + spare + interest + regMoney };
}

export function advance(run) {
  const info = roundInfo(run);
  const pay = payout(run);
  runHook(activeRegs(run), 'roundEnd', { run, wasBoss: !!info.boss });
  run.money += pay.total;
  if (info.boss) run.stats.bossesBeaten++;
  if (info.isFinal) { run.phase = 'won'; return { pay, won: true }; }
  run.round++;
  startRound(run);
  openBar(run);
  run.phase = 'bar';
  return { pay, won: false };
}

// After beating the pub: keep everything and carry on into endless Pints.
export function goEndless(run) {
  run.endless = true;
  run.round++;
  startRound(run);
  openBar(run);
  run.phase = 'bar';
}

// Leaving the Bar re-applies round setup, since Regulars bought there can change spins/holds/nudges.
export function leaveBar(run) {
  run.bar = null;
  startRound(run);
}
