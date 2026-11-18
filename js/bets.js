// Bar Bets: career-long objectives ("bet you can't..."), career records and the cosmetic rewards they unlock.
// No DOM here. main.js reports events with check(type, ev) and shows whatever comes back.
import { baseId, isGold } from './symbols.js';
import { BOSSES } from './bosses.js';
import { MACHINES } from './machines.js';
import { bestStakeOn } from './stakes.js';

// ---------- Per-run tracking (for the "without..." bets) ----------
// Old saves have no record of what happened earlier in the run, so they count as having done everything.
const FRESH_TRACK = () => ({ nudged: false, held: false, bumped: false, mat: false, regular: false });
export const newTrack = FRESH_TRACK;
export function mark(run, key) {
  if (!key || !run) return;
  if (!run.track) run.track = { nudged: true, held: true, bumped: true, mat: true, regular: true };
  run.track[key] = true;
}
const clean = (run, key) => !!run.track && !run.track[key];

// ---------- The bets ----------
const all9 = (grid, ok) => !!grid && grid.flat().length === 9 && grid.flat().every(ok);
const nineOf = (sym) => (ev) => all9(ev.grid, (e) => baseId(e) === sym);

export const GROUPS = [
  { id: 'reels', name: 'The Reels', icon: '🎰' },
  { id: 'hands', name: 'Hands Tied', icon: '🙌' },
  { id: 'landlords', name: 'Landlords', icon: '😠' },
  { id: 'nights', name: 'Long Nights', icon: '🌙' },
  { id: 'pubs', name: 'Pub Crawl', icon: '🏆' },
  { id: 'regs', name: 'Regulars', icon: '🧑‍🤝‍🧑' },
];

export const BETS = [
  // The reels: what's showing when a spin scores
  { id: 'full-house', group: 'reels', icon: '⭐', name: 'Full House', desc: 'Land nine Wilds.', on: 'spin', test: (ev) => all9(ev.grid, (e) => baseId(e) === 'wild') },
  { id: 'jackpot', group: 'reels', icon: '7️⃣', name: 'Jackpot', desc: 'Land nine 7s. Wilds don\'t count.', on: 'spin', test: nineOf('seven') },
  { id: 'gold-rush', group: 'reels', icon: '✨', name: 'Going for Gold', desc: 'Land nine gold symbols.', on: 'spin', test: (ev) => all9(ev.grid, (e) => isGold(e)) },
  { id: 'cherries', group: 'reels', icon: '🍒', name: 'Cherry Picker', desc: 'Land nine Cherries.', on: 'spin', test: nineOf('cherry') },
  { id: 'lemons', group: 'reels', icon: '🍋', name: 'Bitter Lemon', desc: 'Land nine Lemons.', on: 'spin', test: nineOf('lemon') },
  { id: 'grapes', group: 'reels', icon: '🍇', name: 'Grape Expectations', desc: 'Land nine Grapes.', on: 'spin', test: nineOf('grapes') },
  { id: 'melons', group: 'reels', icon: '🍉', name: 'One in a Melon', desc: 'Land nine Melons.', on: 'spin', test: nineOf('melon') },
  { id: 'bells', group: 'reels', icon: '🔔', name: 'Ding Dong', desc: 'Land nine Bells.', on: 'spin', test: nineOf('bell') },
  { id: 'bars', group: 'reels', icon: '🍫', name: 'Raising the Bar', desc: 'Land nine BARs.', on: 'spin', test: nineOf('bar') },

  // Hands tied: beat the pub (Pint 8's Landlord) without...
  { id: 'steady', group: 'hands', icon: '🤲', name: 'Steady Hands', desc: 'Beat the pub without nudging.', on: 'pub', test: (ev) => clean(ev.run, 'nudged') },
  { id: 'ride', group: 'hands', icon: '🎢', name: 'Let It Ride', desc: 'Beat the pub without holding a reel.', on: 'pub', test: (ev) => clean(ev.run, 'held') },
  { id: 'hands-off', group: 'hands', icon: '🙅', name: 'Hands Off', desc: 'Beat the pub without bumping.', on: 'pub', test: (ev) => clean(ev.run, 'bumped') },
  { id: 'coasters', group: 'hands', icon: '🍺', name: 'No Coasters', desc: 'Beat the pub without a Beer Mat.', on: 'pub', test: (ev) => clean(ev.run, 'mat') },
  { id: 'billy', group: 'hands', icon: '🧍', name: 'Billy No-Mates', desc: 'Beat the pub without ever having a Regular.', on: 'pub', test: (ev) => clean(ev.run, 'regular') },

  // Landlords: checked whenever a round is cleared, before the payout
  { id: 'barred', group: 'landlords', icon: '🚪', name: 'Barred From Nowhere', desc: `Beat all ${BOSSES.length} Landlords at least once.`, on: 'clear', test: (ev) => BOSSES.every((b) => (ev.wins?.[b.id] || 0) > 0) },
  { id: 'skint', group: 'landlords', icon: '🪙', name: 'Skint', desc: 'Beat a Landlord with £0 in your pocket.', on: 'clear', test: (ev) => !!ev.info.boss && ev.run.money === 0 },
  { id: 'last-gasp', group: 'landlords', icon: '😮‍💨', name: 'Last Gasp', desc: 'Clear a round on your very last spin.', on: 'clear', test: (ev) => ev.run.spinsLeft === 0 },
  { id: 'grudge', group: 'landlords', icon: '🥊', name: 'Grudge Match', desc: 'Beat a Landlord who\'s beaten you before.', on: 'clear', test: (ev) => !!ev.info.boss && (ev.losses?.[ev.info.boss.id] || 0) > 0 },
  { id: 'tilt-proof', group: 'landlords', icon: '🫨', name: 'Tilt-Proof', desc: 'Tilt 3 times in one round and still clear it.', on: 'clear', test: (ev) => (ev.run.tiltsThisRound || 0) >= 3 },

  // Long nights
  { id: 'owl', group: 'nights', icon: '🦉', name: 'Night Owl', desc: 'Reach Pint 16.', on: 'bar', test: (ev) => ev.pint >= 16 },
  { id: 'standing', group: 'nights', icon: '🍻', name: 'Still Standing', desc: 'Reach Pint 24.', on: 'bar', test: (ev) => ev.pint >= 24 },
  { id: 'sunrise', group: 'nights', icon: '🌅', name: 'Sunrise', desc: 'Reach Pint 32.', on: 'bar', test: (ev) => ev.pint >= 32 },
  { id: 'nest', group: 'nights', icon: '🐷', name: 'Nest Egg', desc: 'Cash out £100 or more.', on: 'cashout', test: (ev) => ev.pot >= 100 },
  { id: 'rainy', group: 'nights', icon: '☔', name: 'Rainy Day Fund', desc: 'Cash out £250 or more.', on: 'cashout', test: (ev) => ev.pot >= 250 },
  { id: 'retire', group: 'nights', icon: '🏖️', name: 'Retirement Plan', desc: 'Cash out £500 or more.', on: 'cashout', test: (ev) => ev.pot >= 500 },
  { id: 'million', group: 'nights', icon: '💥', name: 'Seven Figures', desc: 'Score 1 million in one spin.', on: 'spin', test: (ev) => ev.total >= 1e6 },
  { id: 'billion', group: 'nights', icon: '💰', name: 'Billionaire\'s Row', desc: 'Score 1 billion in one spin.', on: 'spin', test: (ev) => ev.total >= 1e9 },

  // Pub crawl
  { id: 'first-pub', group: 'pubs', icon: '🏆', name: 'Last Orders', desc: 'Beat the pub.', on: 'pub', test: () => true },
  { id: 'crawl', group: 'pubs', icon: '🗺️', name: 'Pub Crawl', desc: `Beat the pub on all ${MACHINES.length} machines.`, on: 'pub', test: () => MACHINES.every((m) => bestStakeOn(m.id) >= 1) },
  { id: 'bitter', group: 'pubs', icon: '🍂', name: 'Bitter End', desc: 'Beat the pub on Bitter stake or higher.', on: 'pub', test: (ev) => (ev.run.stake || 1) >= 3 },
  { id: 'export', group: 'pubs', icon: '🚢', name: 'Export Strength', desc: 'Beat the pub on Export stake.', on: 'pub', test: (ev) => (ev.run.stake || 1) >= 6 },
  { id: 'hic', group: 'pubs', icon: '🥴', name: 'Hic!', desc: 'Beat a Landlord while Hammered (Pint 7 or later).', on: 'clear', test: (ev) => !!ev.info.boss && ev.info.pint >= 7 },

  // Regulars
  { id: 'legend', group: 'regs', icon: '👑', name: 'Living Legend', desc: 'Have a Legendary at your machine.', on: 'bar', test: (ev) => ev.run.regulars.some((r) => ev.rarityOf(r.id) === 'legendary') },
  { id: 'locked-in', group: 'regs', icon: '🔒', name: 'Locked In', desc: 'Have 6 Regulars at your machine at once.', on: 'bar', test: (ev) => ev.run.regulars.length >= 6 },
  { id: 'faces', group: 'regs', icon: '📚', name: 'Familiar Faces', desc: 'Recruit 20 different Regulars over your career.', on: 'bar', test: (ev) => (ev.owned || 0) >= 20 },
];
export const BET_BY_ID = Object.fromEntries(BETS.map((b) => [b.id, b]));

// ---------- Cosmetic rewards, one per 5 bets won ----------
export const REWARDS = [
  { at: 5, id: 'trim', icon: '🥇', name: 'Brass Trim', desc: 'Polished brass edging round your machine.' },
  { at: 10, id: 'foil', icon: '✨', name: 'Foil Regulars', desc: 'Your Regulars catch the light like rare cards.' },
  { at: 15, id: 'neon', icon: '🌈', name: 'Neon Sign', desc: 'Your machine\'s sign cycles through neon colours.' },
  { at: 20, id: 'goldreels', icon: '🟨', name: 'Golden Reels', desc: 'Gold-leaf frame round the reels.' },
  { at: 25, id: 'champagne', icon: '🍾', name: 'Champagne Moment', desc: 'A shower of gold every time you clear a round.' },
  { at: 30, id: 'crown', icon: '👑', name: 'Hall of Fame', desc: 'A crown on the title screen, and your Bar Bets count on shared runs.' },
  { at: BETS.length, id: 'legend', icon: '🏅', name: 'Landlord of the Year', desc: 'Win every bet and the TILT sign turns to solid gold.' },
];

// ---------- Storage ----------
const KEY = 'tilt.bets.v1';
const CAREER_KEY = 'tilt.career.v1';
function load() {
  try { return { won: {}, off: [], ...(JSON.parse(localStorage.getItem(KEY)) || {}) }; }
  catch { return { won: {}, off: [] }; }
}
let data = load();
function persist() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {} }

export const isWon = (id) => !!data.won[id];
export const wonCount = () => BETS.filter((b) => data.won[b.id]).length;
export const wonDate = (id) => data.won[id] || null;
export const isUnlocked = (rewardId) => wonCount() >= (REWARDS.find((r) => r.id === rewardId)?.at ?? Infinity);
export const isOn = (rewardId) => isUnlocked(rewardId) && !data.off.includes(rewardId);
export function setOn(rewardId, on) {
  data.off = data.off.filter((x) => x !== rewardId);
  if (!on) data.off.push(rewardId);
  persist();
}
export const nextReward = () => REWARDS.find((r) => wonCount() < r.at) || null;

// Report an event. Returns { bets: [newly won], rewards: [newly unlocked] }.
export function check(type, ev) {
  const before = wonCount();
  const fresh = [];
  for (const b of BETS) {
    if (b.on !== type || data.won[b.id]) continue;
    let ok = false;
    try { ok = !!b.test(ev); } catch { ok = false; }
    if (ok) { data.won[b.id] = new Date().toISOString().slice(0, 10); fresh.push(b); }
  }
  if (!fresh.length) return { bets: [], rewards: [] };
  persist();
  const after = wonCount();
  return { bets: fresh, rewards: REWARDS.filter((r) => r.at > before && r.at <= after) };
}

// ---------- Career records ----------
const CAREER0 = { runs: 0, pubs: 0, landlords: 0, rounds: 0, spins: 0, tilts: 0, bestSpin: 0, bestPint: 0, cashouts: 0 };
export function career() {
  try { return { ...CAREER0, ...(JSON.parse(localStorage.getItem(CAREER_KEY)) || {}) }; }
  catch { return { ...CAREER0 }; }
}
export function bump(field, by = 1) {
  const c = career();
  c[field] = (c[field] || 0) + by;
  try { localStorage.setItem(CAREER_KEY, JSON.stringify(c)); } catch {}
}
export function best(field, value) {
  const c = career();
  if (value > (c[field] || 0)) {
    c[field] = value;
    try { localStorage.setItem(CAREER_KEY, JSON.stringify(c)); } catch {}
  }
}
