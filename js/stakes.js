// Stakes: difficulty tiers, like Balatro's. Each stake keeps every rule from the ones below it.
// Beat the pub (Pint 8's Landlord) on a stake to unlock the next. Pure data, no DOM.

export const STAKES = [
  { id: 1, name: 'Shandy',  icon: '🍋', rule: 'The pub as you know it.' },
  { id: 2, name: 'Session', icon: '🍺', rule: 'Spare spins pay nothing.', noSpare: true },
  { id: 3, name: 'Bitter',  icon: '🍂', rule: 'Everything at the Bar costs £1 more.', barPlus: 1 },
  { id: 4, name: 'Best',    icon: '🏅', rule: 'Only 4 Regulars fit at the machine.', slotsMinus: 1 },
  { id: 5, name: 'Strong',  icon: '💪', rule: 'Every target is 20% higher.', targetFactor: 1.2 },
  { id: 6, name: 'Export',  icon: '🚢', rule: '5 spins a round, not 6.', spinsMinus: 1 },
];
export const STAKE_BY_ID = Object.fromEntries(STAKES.map((s) => [s.id, s]));
export const MAX_STAKE = STAKES.length;

export const stakeOf = (run) => STAKE_BY_ID[run?.stake || 1] || STAKES[0];

// Everything this stake and the ones below it add up to.
export function stakeMods(run) {
  const level = run?.stake || 1;
  const mods = { noSpare: false, barPlus: 0, slotsMinus: 0, targetFactor: 1, spinsMinus: 0, rules: [] };
  for (const s of STAKES) {
    if (s.id > level) break;
    if (s.noSpare) mods.noSpare = true;
    mods.barPlus += s.barPlus || 0;
    mods.slotsMinus += s.slotsMinus || 0;
    mods.targetFactor *= s.targetFactor || 1;
    mods.spinsMinus += s.spinsMinus || 0;
    if (s.id > 1) mods.rules.push(s.rule);
  }
  return mods;
}

// ---------- Progress, saved separately from runs ----------
const KEY = 'tilt.stakes.v1';
function load() {
  try { return { unlocked: 1, beaten: {}, ...(JSON.parse(localStorage.getItem(KEY)) || {}) }; }
  catch { return { unlocked: 1, beaten: {} }; }
}
function persist(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch {} }

export function unlockedStake() { return Math.min(MAX_STAKE, load().unlocked || 1); }
export function bestStakeOn(machineId) { return load().beaten[machineId] || 0; }

// Called when the pub is beaten. Returns the newly unlocked stake, if any.
export function recordWin(machineId, stake) {
  const d = load();
  d.beaten[machineId] = Math.max(d.beaten[machineId] || 0, stake);
  let fresh = null;
  if (stake >= d.unlocked && stake < MAX_STAKE) { d.unlocked = stake + 1; fresh = STAKE_BY_ID[d.unlocked]; }
  persist(d);
  return fresh;
}
