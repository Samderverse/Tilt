// The Album: which Regulars you've seen and recruited, and which Landlords you've faced and beaten.
import { REGULARS, RARITY } from './regulars.js';
import { BOSSES } from './bosses.js';
import { regularCard } from './art.js';

const KEY = 'tilt.album.v1';
let data = load();
function load() {
  try { return { regs: {}, bosses: {}, ...(JSON.parse(localStorage.getItem(KEY)) || {}) }; }
  catch { return { regs: {}, bosses: {} }; }
}
function persist() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {} }
function mark(group, id, level) {
  if ((data[group][id] || 0) >= level) return false;
  data[group][id] = level;
  persist();
  return true;
}

// 1 = seen, 2 = owned / beaten
export const seeRegular = (id) => mark('regs', id, 1);
export const ownRegular = (id) => mark('regs', id, 2);
export const faceBoss = (id) => mark('bosses', id, 1);
export const beatBoss = (id) => mark('bosses', id, 2);

const ORDER = ['common', 'uncommon', 'rare', 'legendary'];
let tab = 'regs';

export function openAlbum() {
  tab = 'regs';
  render();
  document.getElementById('album').classList.remove('hidden');
}

function render() {
  document.querySelectorAll('#album .tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  const grid = document.getElementById('album-grid');
  const count = document.getElementById('album-count');
  const detail = document.getElementById('album-detail');
  detail.textContent = 'Tap something you\'ve found to read about it.';
  if (tab === 'regs') {
    const list = [...REGULARS].sort((a, b) => ORDER.indexOf(a.rarity) - ORDER.indexOf(b.rarity));
    const owned = list.filter((r) => data.regs[r.id] === 2).length;
    const seen = list.filter((r) => data.regs[r.id]).length;
    count.textContent = `${owned} of ${list.length} recruited · ${seen} seen`;
    grid.className = 'album-grid regs';
    grid.innerHTML = list.map((r) => {
      const lvl = data.regs[r.id] || 0;
      if (!lvl) {
        return `<div class="album-cell"><div class="rc rc-md unknown" style="--rc-col:${RARITY[r.rarity].colour}">
          <span class="rc-portrait"><span class="rc-face">?</span></span><span class="rc-name">???</span>
          <span class="rc-rarity">${RARITY[r.rarity].name}</span></div></div>`;
      }
      return `<button class="album-cell${lvl === 1 ? ' seen' : ''}" data-id="${r.id}">${regularCard(r.id, 'md')}
        ${lvl === 1 ? '<span class="album-tag">Seen</span>' : ''}</button>`;
    }).join('');
    grid.querySelectorAll('button[data-id]').forEach((b) => b.addEventListener('click', () => {
      const r = REGULARS.find((x) => x.id === b.dataset.id);
      detail.innerHTML = `<b>${r.face} ${r.name}</b> (${RARITY[r.rarity].name})<br>${r.desc}`;
    }));
  } else {
    const beaten = BOSSES.filter((b) => data.bosses[b.id] === 2).length;
    const faced = BOSSES.filter((b) => data.bosses[b.id]).length;
    count.textContent = `${beaten} of ${BOSSES.length} beaten · ${faced} faced`;
    grid.className = 'album-grid bosses';
    grid.innerHTML = BOSSES.map((b) => {
      const lvl = data.bosses[b.id] || 0;
      if (!lvl) return `<div class="album-boss unknown"><span class="ab-face">?</span><span class="ab-name">???</span><span class="ab-tag">${b.tier === 1 ? 'Early Pints' : 'Late Pints'}</span></div>`;
      return `<button class="album-boss${lvl === 2 ? ' beaten' : ''}" data-id="${b.id}"><span class="ab-face">${b.face}</span>
        <span class="ab-name">${b.name}</span><span class="ab-tag">${lvl === 2 ? 'Beaten' : 'Faced'}</span></button>`;
    }).join('');
    grid.querySelectorAll('button[data-id]').forEach((el) => el.addEventListener('click', () => {
      const b = BOSSES.find((x) => x.id === el.dataset.id);
      detail.innerHTML = `<b>${b.face} ${b.name}</b><br>${b.rule}`;
    }));
  }
}

export function bindAlbum() {
  document.querySelectorAll('#album .tab').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; render(); }));
  document.getElementById('album-close').addEventListener('click', () => document.getElementById('album').classList.add('hidden'));
}
