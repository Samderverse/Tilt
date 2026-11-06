// Per-machine scenery (the room behind the machine) and cabinet decorations.
// Everything is HTML/CSS/SVG, so it's light and needs no image files.

const gull = (cls) => `<svg class="gull ${cls}" viewBox="0 0 44 16" aria-hidden="true"><path d="M2 12 Q 11 1 22 11 Q 33 1 42 12" /></svg>`;
const wave = (cls) => `<svg class="wave ${cls}" viewBox="0 0 400 40" preserveAspectRatio="none" aria-hidden="true">
  <path d="M0 20 Q 25 5 50 20 T 100 20 T 150 20 T 200 20 T 250 20 T 300 20 T 350 20 T 400 20 V 40 H 0 Z"/></svg>`;

// Student Union gig posters: [text, colour, left%, top%, rotation, width%]
const POSTERS = [
  ['FOAM PARTY', '#ff3df0', 4, 6, -8, 30], ['£1 SHOTS', '#7dff4f', 62, 4, 6, 32], ['QUIZ TUES', '#ffe94a', 70, 30, -5, 26],
  ['DnB NIGHT', '#3dd6ff', 2, 34, 4, 28], ['KARAOKE', '#ff8a2b', 6, 64, -6, 30], ['SOCIETY FAIR', '#b14dff', 64, 60, 7, 32],
  ['LIVE BAND', '#ff4b6e', 34, 84, -3, 30], ['2-4-1', '#7dff4f', 72, 86, 9, 22], ['EXAMS??', '#ffffff', 0, 88, 5, 24],
];

const BUILD = {
  local: () => '',
  seaside: () => `
    <div class="sun"></div>
    ${gull('g1')}${gull('g2')}${gull('g3')}
    <div class="sea">${wave('w1')}${wave('w2')}${wave('w3')}</div>`,
  student: () => POSTERS.map(([txt, col, l, t, r, w]) =>
    `<div class="poster" style="left:${l}%;top:${t}%;width:${w}%;--pc:${col};transform:rotate(${r}deg)"><b>${txt}</b><i>Union Bar · 8pm</i></div>`).join(''),
  wmc: () => `<div class="lamp l1"></div><div class="lamp l2"></div>`,
  casino: () => `<div class="deco-fan"></div>` + Array.from({ length: 16 }, (_, i) =>
    `<span class="spark" style="left:${(i * 37) % 100}%;animation-delay:${(i * 0.73) % 6}s;animation-duration:${5 + (i % 4)}s"></span>`).join(''),
};

// Little things stuck to / fixed on the cabinet itself.
const DECO = {
  local: () => '',
  seaside: () => `<span class="deco shell s1">🐚</span><span class="deco shell s2">⭐</span><span class="deco plate">KISS ME QUICK</span>`,
  student: () => `<span class="deco sticker k1">🤘</span><span class="deco sticker k2">SU</span><span class="deco sticker k3">🍕</span><span class="deco sticker k4">⭐</span>`,
  wmc: () => `<span class="deco plate">EST. 1974</span>`,
  casino: () => `<span class="deco corner c1">◆</span><span class="deco corner c2">◆</span><span class="deco corner c3">◆</span><span class="deco corner c4">◆</span>`,
};

export function setScenery(id) {
  const s = document.getElementById('scenery');
  const d = document.getElementById('cab-deco');
  const key = id || '';
  if (s.dataset.m === key) return;
  s.dataset.m = key;
  s.innerHTML = key && BUILD[key] ? BUILD[key]() : '';
  if (d) d.innerHTML = key && DECO[key] ? DECO[key]() : '';
}

// Mini cabinet used in the machine picker.
export function miniCabinet(m, locked = false) {
  return `<span class="mini-cab${locked ? ' locked' : ''}" data-m="${m.id}" aria-hidden="true">
    <span class="mini-marquee">${locked ? '???' : m.short || m.name}</span>
    <span class="mini-reels"><i>🍒</i><i>7</i><i>🔔</i></span>
    <span class="mini-btn"></span>
  </span>`;
}
