// The Bar Bets chalkboard: bets, cosmetic rewards and career records. Also applies the cosmetics.
import { BETS, GROUPS, REWARDS, isWon, wonDate, wonCount, isUnlocked, isOn, setOn, nextReward, career } from './bets.js';
import { MACHINES } from './machines.js';
import { STAKE_BY_ID, bestStakeOn, unlockedStake } from './stakes.js';

const $ = (id) => document.getElementById(id);
let tab = 'bets';

const fmt = (n) => (n >= 1e9 ? (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B' : n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M' : n >= 1e4 ? Math.round(n / 1e3) + 'K' : n.toLocaleString('en-GB'));
const prettyDate = (iso) => { try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); } catch { return ''; } };

// Turn unlocked, switched-on cosmetics into body classes (cos-trim, cos-foil, ...).
export function applyCosmetics() {
  for (const r of REWARDS) document.body.classList.toggle(`cos-${r.id}`, isOn(r.id));
}

export function openBets(startTab = 'bets') {
  tab = startTab;
  render();
  $('bets').classList.remove('hidden');
}

function renderCount() {
  const n = wonCount();
  const next = nextReward();
  $('bets-count').innerHTML = `<b>${n} / ${BETS.length}</b> bets won${next ? ` · next reward at ${next.at}` : ' · every reward unlocked 🏅'}`;
}

function betsHTML() {
  return GROUPS.map((g) => {
    const list = BETS.filter((b) => b.group === g.id);
    const won = list.filter((b) => isWon(b.id)).length;
    return `<div class="bet-group"><h3>${g.icon} ${g.name} <span>${won}/${list.length}</span></h3>${list.map((b) => {
      const w = isWon(b.id);
      return `<div class="bet${w ? ' won' : ''}"><span class="bet-icon">${b.icon}</span>
        <span class="bet-text"><b>${b.name}</b><span>${b.desc}</span></span>
        <span class="bet-state">${w ? `✓<small>${prettyDate(wonDate(b.id))}</small>` : ''}</span></div>`;
    }).join('')}</div>`;
  }).join('');
}

function rewardsHTML() {
  const n = wonCount();
  return `<p class="bets-note">Win 5 bets to unlock each one. Switch them on and off whenever you like.</p>` + REWARDS.map((r) => {
    const open = isUnlocked(r.id);
    return `<div class="reward${open ? ' open' : ''}">
      <span class="bet-icon">${open ? r.icon : '🔒'}</span>
      <span class="bet-text"><b>${r.name}</b><span>${open ? r.desc : `Win ${r.at} bets (${Math.min(n, r.at)}/${r.at})`}</span>
      ${open ? '' : `<span class="reward-bar"><i style="width:${Math.min(100, (n / r.at) * 100)}%"></i></span>`}</span>
      ${open ? `<label class="switch"><input type="checkbox" data-reward="${r.id}" ${isOn(r.id) ? 'checked' : ''}><span></span></label>` : ''}
    </div>`;
  }).join('');
}

function recordsHTML() {
  const c = career();
  let cash = null;
  try { cash = JSON.parse(localStorage.getItem('tilt.cashout.v1')); } catch {}
  const rows = [
    ['🎰', 'Runs played', c.runs],
    ['🏆', 'Pubs beaten', c.pubs],
    ['😠', 'Landlords beaten', c.landlords],
    ['🍺', 'Rounds cleared', c.rounds],
    ['🔄', 'Spins', fmt(c.spins)],
    ['💥', 'Best spin', fmt(c.bestSpin)],
    ['🌙', 'Deepest Pint', c.bestPint || '—'],
    ['💷', 'Best cash-out', cash ? `£${cash.money} (Pint ${cash.pint})` : '—'],
    ['🫨', 'Tilts', c.tilts],
    ['🍻', 'Highest stake unlocked', `${STAKE_BY_ID[unlockedStake()].icon} ${STAKE_BY_ID[unlockedStake()].name}`],
  ];
  const machines = MACHINES.map((m) => {
    const s = bestStakeOn(m.id);
    return `<div class="kv"><span>${m.icon} ${m.name}</span><b>${s ? `${STAKE_BY_ID[s].icon} ${STAKE_BY_ID[s].name}` : '—'}</b></div>`;
  }).join('');
  return `<div class="records">${rows.map(([i, k, v]) => `<div class="kv"><span>${i} ${k}</span><b>${v}</b></div>`).join('')}</div>
    <h3 class="records-sub">Best stake beaten, by machine</h3><div class="records">${machines}</div>
    <p class="bets-note">Records start from v2.2, so anything before then isn't counted.</p>`;
}

function render() {
  document.querySelectorAll('#bets .tab').forEach((t) => t.classList.toggle('on', t.dataset.tab === tab));
  renderCount();
  const body = $('bets-body');
  body.innerHTML = tab === 'bets' ? betsHTML() : tab === 'rewards' ? rewardsHTML() : recordsHTML();
  body.scrollTop = 0;
  body.querySelectorAll('input[data-reward]').forEach((inp) => inp.addEventListener('change', () => {
    setOn(inp.dataset.reward, inp.checked);
    applyCosmetics();
  }));
}

export function bindBets() {
  $('bets-close').addEventListener('click', () => $('bets').classList.add('hidden'));
  document.querySelectorAll('#bets .tab').forEach((t) => t.addEventListener('click', () => { tab = t.dataset.tab; render(); }));
}
