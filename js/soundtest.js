// Sound test: hear every game moment and choose which clip plays for it.
// Picks save in this browser straight away, and "Copy my picks" makes a message to send back.
import { CLIPS, ROLES, loadPicks, savePicks, clearPicks } from './sfxmap.js';
import * as A from './audio.js';

const nice = (c) => (c === 'synth' ? 'Built-in beep' : c.replace(/-/g, ' '));

function render() {
  const picks = loadPicks();
  const list = document.getElementById('st-list');
  list.innerHTML = ROLES.map((r) => {
    const cur = picks[r.id] ?? r.def;
    const opts = ['synth', ...CLIPS].map((c) =>
      `<option value="${c}" ${c === cur ? 'selected' : ''}>${nice(c)}${c === r.def ? ' ★' : ''}</option>`).join('');
    const changed = picks[r.id] != null && picks[r.id] !== r.def;
    return `<div class="st-row${changed ? ' changed' : ''}" data-role="${r.id}">
      <button class="st-play" aria-label="Play ${r.label}">▶</button>
      <div class="st-main"><span class="st-label">${r.label}</span><select aria-label="Sound for ${r.label}">${opts}</select></div>
    </div>`;
  }).join('');
  list.querySelectorAll('.st-row').forEach((row) => {
    const id = row.dataset.role;
    const sel = row.querySelector('select');
    row.querySelector('.st-play').addEventListener('click', () => A.preview(id, sel.value));
    sel.addEventListener('change', () => {
      const p = loadPicks();
      const def = ROLES.find((r) => r.id === id).def;
      if (sel.value === def) delete p[id]; else p[id] = sel.value;
      savePicks(p);
      A.reloadPicks();
      A.preview(id, sel.value);
      row.classList.toggle('changed', sel.value !== def);
    });
  });
  document.getElementById('st-clips').innerHTML = CLIPS.map((c) => `<button class="st-clip" data-c="${c}">▶ ${nice(c)}</button>`).join('');
  document.querySelectorAll('.st-clip').forEach((b) => b.addEventListener('click', () => A.preview('cash', b.dataset.c)));
}

async function copyPicks() {
  const picks = loadPicks();
  const lines = ROLES.map((r) => `${r.label}: ${nice(picks[r.id] ?? r.def)}${picks[r.id] != null && picks[r.id] !== r.def ? ' (changed)' : ''}`);
  const text = `Tilt sound picks\n${lines.join('\n')}`;
  const btn = document.getElementById('st-copy');
  try { await navigator.clipboard.writeText(text); btn.textContent = '✅ Copied'; }
  catch { btn.textContent = 'Couldn\'t copy'; }
  setTimeout(() => { btn.textContent = '📋 Copy my picks'; }, 1800);
}

export function openSoundTest() {
  A.unlock();
  render();
  document.getElementById('soundtest').classList.remove('hidden');
}

export function bindSoundTest() {
  document.getElementById('st-close').addEventListener('click', () => document.getElementById('soundtest').classList.add('hidden'));
  document.getElementById('st-copy').addEventListener('click', copyPicks);
  document.getElementById('st-reset').addEventListener('click', () => { clearPicks(); A.reloadPicks(); render(); });
}
