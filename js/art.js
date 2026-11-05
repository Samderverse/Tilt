// Visual "art" for everything you can own or buy: Regular cards, Beer Mat coasters,
// scratchcard tickets and crisp packets. Pure HTML/CSS/SVG, no image files.
import { SYMBOLS } from './symbols.js';
import { REG_BY_ID, RARITY } from './regulars.js';
import { SCRATCH_BY_ID, PACKET_BY_ID, SPECIAL_BY_ID } from './shop.js';

// A stable colour per character, so every Regular has their own look.
export function hueOf(id) {
  let h = 7;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

// ---------- Regulars ----------
// size: 'sm' (machine row), 'md' (shop/packet), 'lg' (info sheet)
export function regularCard(id, size = 'md', badge = '') {
  const d = REG_BY_ID[id];
  return `<div class="rc rc-${size} r-${d.rarity}" style="--h:${hueOf(id)}">
    <span class="rc-shine"></span>
    <span class="rc-portrait"><span class="rc-face">${d.face}</span></span>
    <span class="rc-name">${d.name}</span>
    ${size !== 'sm' ? `<span class="rc-rarity">${RARITY[d.rarity].name}</span>` : ''}
    ${badge ? `<span class="badge">${badge}</span>` : ''}
  </div>`;
}

// ---------- Beer Mats ----------
export const BEERS = {
  cherry: 'Cherry Bitter', lemon: 'Lemon Shandy', grapes: 'Grape Escape', melon: 'Melon Collie',
  bell: 'Ding Dong Ale', bar: 'Brawl Stout', seven: 'Lucky 7 Lager',
};
const MAT_COLOUR = {
  cherry: '#b3121f', lemon: '#c99a0a', grapes: '#6a2c91', melon: '#2f8f4e',
  bell: '#b8741a', bar: '#2b2b2b', seven: '#c41f2b',
};
let matUid = 0;
export function beerMat(id) {
  const s = SYMBOLS[id];
  const name = BEERS[id].toUpperCase();
  const uid = `matpath${matUid++}`;
  const icon = id === 'bar' ? '<span class="glyph">BAR</span>' : s.icon;
  return `<div class="mat" style="--mc:${MAT_COLOUR[id]}">
    <svg class="mat-svg" viewBox="0 0 100 100" aria-hidden="true">
      <defs><path id="${uid}" d="M50,50 m-37,0 a37,37 0 1,1 74,0 a37,37 0 1,1 -74,0"/></defs>
      <circle cx="50" cy="50" r="49" class="mat-edge"/>
      <circle cx="50" cy="50" r="45" class="mat-face"/>
      <circle cx="50" cy="50" r="29" class="mat-inner"/>
      <text class="mat-text"><textPath href="#${uid}">${name} ★ ${name} ★</textPath></text>
    </svg>
    <span class="mat-icon${s.text ? ' text ' + id : ''}">${icon}</span>
  </div>`;
}

// ---------- Scratchcards ----------
export function scratchCard(id) {
  const s = SCRATCH_BY_ID[id];
  return `<div class="scratch sc-${id}">
    <div class="sc-head">SCRATCH <i>&amp;</i> WIN</div>
    <div class="sc-panel"><span class="sc-icon">${s.icon}</span></div>
    <div class="sc-name">${s.name}</div>
  </div>`;
}

// ---------- Crisp packets ----------
export const CRISP_BRAND = 'CRUNCHERS';
export function crispPacket(id, big = false) {
  const p = PACKET_BY_ID[id];
  return `<div class="crisp ck-${id}${big ? ' big' : ''}">
    <div class="ck-crimp top"></div>
    <div class="ck-body">
      <div class="ck-brand">${CRISP_BRAND}</div>
      <div class="ck-window"><span>${p.icon}</span></div>
      <div class="ck-flavour">${p.name}</div>
    </div>
    <div class="ck-crimp bottom"></div>
  </div>`;
}

// ---------- Landlord's Specials: a brass plaque ----------
export function specialPlaque(id, size = 'md') {
  const s = SPECIAL_BY_ID[id];
  return `<div class="plaque plaque-${size}">
    <i class="screw tl"></i><i class="screw tr"></i><i class="screw bl"></i><i class="screw br"></i>
    <span class="pl-kicker">Landlord's Special</span>
    <span class="pl-icon">${s.icon}</span>
    <span class="pl-name">${s.name}</span>
    ${size === 'md' ? `<span class="pl-desc">${s.desc}</span>` : ''}
  </div>`;
}

// Any shop item.
export function itemArt(item, size = 'md') {
  if (item.type === 'special') return specialPlaque(item.id, size === 'lg' ? 'lg' : 'md');
  if (item.type === 'regular') return regularCard(item.id, size);
  if (item.type === 'mat') return beerMat(item.id);
  if (item.type === 'scratch') return scratchCard(item.id);
  return crispPacket(item.id, size === 'lg');
}
