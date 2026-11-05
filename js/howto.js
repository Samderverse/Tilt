// How to Play: a short illustrated, paged guide.
import { regularCard, beerMat, scratchCard, crispPacket } from './art.js';

const grid = (lines = [], cells = {}) => {
  const icons = [['🍋', '🍒', '🔔'], ['🍒', '🍒', '🍒'], ['🍉', '🍒', '🍋']];
  const coords = { top: '0,50 300,50', middle: '0,150 300,150', bottom: '0,250 300,250', 'diag-down': '20,20 280,280', 'diag-up': '20,280 280,20' };
  return `<div class="mini-grid">
    ${icons.flat().map((ic, i) => `<span class="mini-cell${cells[i] ? ' hit' : ''}">${ic}</span>`).join('')}
    <svg viewBox="0 0 300 300" preserveAspectRatio="none">${lines.map((l) => `<polyline points="${coords[l]}"/>`).join('')}</svg>
  </div>`;
};

export const PAGES = [
  {
    title: 'Beat the machine',
    art: `<div class="ht-bar"><span style="width:68%"></span><b>310 / 450</b></div>`,
    body: 'Each round has a <b>target</b>. Score it within <b>6 spins</b> and you move on. Run out of spins and the machine wins.',
  },
  {
    title: 'Five ways to win',
    art: grid(['top', 'middle', 'bottom', 'diag-down', 'diag-up']),
    body: 'There are <b>5 win lines</b>: three across and two diagonals. <b>3 in a row</b> pays big. <b>2 matching from the left</b> pays a little.',
  },
  {
    title: 'Coins × Multi',
    art: `<div class="ht-calc"><span class="chips">60</span><span class="times">×</span><span class="mult">4</span><span class="eq">= 240</span></div>`,
    body: 'Every spin scores <b>Coins × Multi</b>. Multi starts at <b>×3</b>. Your <b>best line</b> sets the bonus Multi, and every other winning line adds its Coins.',
  },
  {
    title: 'Hold & Nudge',
    art: `<div class="ht-btns"><span class="hb on">HELD</span><span class="hb">HOLD</span><span class="nb">▲</span><span class="nb">▼</span></div>`,
    body: '<b>Nudge</b> after a spin to move a reel one step, then <b>Collect</b>. <b>Hold</b> reels before a spin to keep them. You get a few of each per round, so use them wisely.',
  },
  {
    title: 'Pints & Landlords',
    art: `<div class="ht-pints"><span>Half<br>Pint</span><span>Full<br>Pint</span><span class="boss">😠<br>Landlord</span></div>`,
    body: 'Rounds come in <b>Pints</b> of three. The third is a <b>Landlord</b> with a nasty rule. You\'ll hear who\'s coming before you get there. Beat 8 Landlords to win.',
  },
  {
    title: 'The Bar',
    art: `<div class="ht-shop">${regularCard('kev', 'sm')}${beerMat('cherry')}${scratchCard('gold')}${crispPacket('prawn')}</div>`,
    body: 'Between rounds, spend your winnings. <b>Regulars</b> boost every spin (left to right, so order matters). <b>Beer Mats</b> level up symbols. <b>Scratchcards</b> edit your reels (gold symbols even glow in a power cut). <b>Crisps</b> let you pick 1 of a few.',
  },
  {
    title: 'Money talks',
    art: `<div class="ht-money">£<b>12</b><small>+£2 interest</small></div>`,
    body: 'You earn £ for each round, plus £1 per spin you didn\'t need, plus <b>interest</b>: £1 for every £5 you\'re holding (up to £5). Saving up can pay.',
  },
];

let page = 0;
let onClose = null;

export function openHowTo(done) {
  page = 0;
  onClose = done || null;
  render();
  document.getElementById('howto').classList.remove('hidden');
}

function close() {
  document.getElementById('howto').classList.add('hidden');
  if (onClose) onClose();
}

function render() {
  const p = PAGES[page];
  document.getElementById('ht-art').innerHTML = p.art;
  document.getElementById('ht-title').textContent = p.title;
  document.getElementById('ht-body').innerHTML = p.body;
  document.getElementById('ht-dots').innerHTML = PAGES.map((_, i) => `<span class="${i === page ? 'on' : ''}"></span>`).join('');
  document.getElementById('ht-back').disabled = page === 0;
  document.getElementById('ht-next').textContent = page === PAGES.length - 1 ? 'Let\'s play' : 'Next';
  const card = document.getElementById('ht-card');
  card.classList.remove('flip');
  void card.offsetWidth;
  card.classList.add('flip');
}

export function bindHowTo() {
  document.getElementById('ht-back').addEventListener('click', () => { if (page > 0) { page--; render(); } });
  document.getElementById('ht-next').addEventListener('click', () => { if (page < PAGES.length - 1) { page++; render(); } else close(); });
  document.getElementById('ht-close').addEventListener('click', close);
  // Swipe left/right to change page.
  let x0 = null;
  const card = document.getElementById('ht-card');
  card.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  card.addEventListener('touchend', (e) => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (dx < -40 && page < PAGES.length - 1) { page++; render(); }
    if (dx > 40 && page > 0) { page--; render(); }
    x0 = null;
  });
}
