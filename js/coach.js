// Coach tips: a spotlight on part of the screen with a speech bubble from the barman.
// Each tip shows once. Tips can be switched off, or reset to replay the tutorial.

const KEY = 'tilt.tips.v1';
let state = load();

function load() {
  try { return { on: true, seen: {}, ...(JSON.parse(localStorage.getItem(KEY)) || {}) }; }
  catch { return { on: true, seen: {} }; }
}
function persist() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} }

export function tipsOn() { return state.on; }
export function setTips(on) { state.on = on; persist(); }
export function resetTips() { state = { on: true, seen: {} }; persist(); }
export function hasSeen(id) { return !!state.seen[id]; }

// target: an element (or null for a centred bubble). Resolves when dismissed.
export function tip(id, target, html, opts = {}) {
  if (!state.on || state.seen[id]) return Promise.resolve();
  state.seen[id] = true;
  persist();
  return new Promise((resolve) => {
    const root = document.getElementById('coach');
    const spot = root.querySelector('.coach-spot');
    const bubble = root.querySelector('.coach-bubble');
    bubble.querySelector('.coach-text').innerHTML = html;
    root.classList.remove('hidden');
    root.classList.toggle('no-target', !target);

    const place = () => {
      if (target) {
        const r = target.getBoundingClientRect();
        const pad = opts.pad ?? 8;
        Object.assign(spot.style, {
          left: r.left - pad + 'px', top: r.top - pad + 'px',
          width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px',
        });
        const below = opts.place ? opts.place === 'below' : r.top + r.height / 2 < innerHeight / 2;
        bubble.classList.toggle('below', below);
        bubble.classList.toggle('above', !below);
        bubble.style.top = below ? r.bottom + pad + 14 + 'px' : '';
        bubble.style.bottom = below ? '' : innerHeight - r.top + pad + 14 + 'px';
        const arrowX = Math.min(Math.max(r.left + r.width / 2, 40), innerWidth - 40);
        bubble.style.setProperty('--ax', arrowX - bubble.getBoundingClientRect().left + 'px');
      } else {
        bubble.classList.remove('below', 'above');
        bubble.style.top = '';
        bubble.style.bottom = '';
      }
    };
    place();
    requestAnimationFrame(place);
    bubble.classList.remove('pop');
    void bubble.offsetWidth;
    bubble.classList.add('pop');

    const done = () => {
      root.classList.add('hidden');
      root.querySelector('.coach-ok').onclick = null;
      root.querySelector('.coach-skip').onclick = null;
      window.removeEventListener('resize', place);
      resolve();
    };
    window.addEventListener('resize', place);
    root.querySelector('.coach-ok').onclick = done;
    root.querySelector('.coach-skip').onclick = () => { setTips(false); done(); };
  });
}
