// The Bar: everything you can buy between rounds. Pure logic, no DOM.
import { makeRng } from './rng.js';
import { SYMBOLS, BASE_SYMBOLS, baseId, isGold } from './symbols.js';
import { REGULARS, REG_BY_ID, RARITY, MAX_REGULARS, priceOf, sellValue } from './regulars.js';

export const MAT_PRICE = 3;
export const SCRATCH_PRICE = 3;
export const PACKET_PRICE = 4;
export const MIN_STRIP = 6;
export const MAX_STRIP = 20;

// ---------- Beer Mats (level up a symbol) ----------
export const MATS = BASE_SYMBOLS.map((id) => ({
  id, name: `${SYMBOLS[id].name} Mat`, icon: SYMBOLS[id].icon,
  desc: `Level up ${SYMBOLS[id].name}: +5 Coins and +1 Multi.`,
}));

// ---------- Scratchcards (edit your reels) ----------
export const SCRATCHCARDS = [
  { id: 'gold', name: 'Gold Leaf', icon: '✨', desc: 'Gild a symbol on a reel. Gold symbols score double Coins, and glow through a Power Cut when everything else goes dark.', target: true },
  { id: 'copy', name: 'Photocopier', icon: '📠', desc: 'Copy a symbol on a reel, so it turns up more often.', target: true },
  { id: 'bin', name: 'Bin Bag', icon: '🗑️', desc: 'Throw a symbol off a reel to thin out the junk.', target: true },
  { id: 'wild', name: 'Wild Card', icon: '⭐', desc: 'Turn a symbol on a reel into a Wild. Wilds match anything.', target: true },
  { id: 'dip', name: 'Lucky Dip', icon: '🎲', desc: 'Something random happens to your reels. Or you win a tenner.', target: false },
];
export const SCRATCH_BY_ID = Object.fromEntries(SCRATCHCARDS.map((s) => [s.id, s]));

// ---------- Crisp packets (pick 1 of a few) ----------
export const PACKETS = [
  { id: 'ready', name: 'Ready Salted', icon: '🥔', desc: 'Pick 1 of 3 Beer Mats.', colour: '#e94545' },
  { id: 'vinegar', name: 'Salt & Vinegar', icon: '🧂', desc: 'Pick 1 of 3 Scratchcards.', colour: '#3d9bff' },
  { id: 'prawn', name: 'Prawn Cocktail', icon: '🦐', desc: 'Pick 1 of 2 Regulars. Might be a legend.', colour: '#ff6ad5' },
];
export const PACKET_BY_ID = Object.fromEntries(PACKETS.map((p) => [p.id, p]));

// ---------- Stock ----------
function rollRegular(rng, run, exclude = [], legendaryChance = 0) {
  const owned = new Set([...run.regulars.map((r) => r.id), ...exclude]);
  if (legendaryChance && rng.next() < legendaryChance) {
    const leg = REGULARS.filter((r) => r.rarity === 'legendary' && !owned.has(r.id));
    if (leg.length) return rng.pick(leg).id;
  }
  const pool = REGULARS.filter((r) => RARITY[r.rarity].weight > 0 && !owned.has(r.id));
  const total = pool.reduce((s, r) => s + RARITY[r.rarity].weight, 0);
  let x = rng.next() * total;
  for (const r of pool) { x -= RARITY[r.rarity].weight; if (x <= 0) return r.id; }
  return pool[0]?.id;
}

function stockItems(run, rng) {
  const items = [];
  const a = rollRegular(rng, run);
  const b = rollRegular(rng, run, [a]);
  for (const id of [a, b]) if (id) items.push({ type: 'regular', id, price: priceOf(id) });
  if (rng.next() < 0.6) items.push({ type: 'mat', id: rng.pick(BASE_SYMBOLS), price: MAT_PRICE });
  else items.push({ type: 'scratch', id: rng.pick(SCRATCHCARDS).id, price: SCRATCH_PRICE });
  return items;
}

export function openBar(run) {
  const rng = makeRng(`${run.seed}-bar-${run.round}`);
  run.bar = {
    rerolls: 0,
    rerollCost: 1,
    items: stockItems(run, rng),
    packets: rng.shuffle(PACKETS.map((p) => p.id)).slice(0, 2).map((id) => ({ type: 'packet', id, price: PACKET_PRICE })),
    pending: null,     // a packet being opened, or a scratchcard waiting for a target
  };
  return run.bar;
}

export function reroll(run) {
  const bar = run.bar;
  if (run.money < bar.rerollCost) return false;
  run.money -= bar.rerollCost;
  bar.rerolls++;
  bar.rerollCost++;
  const rng = makeRng(`${run.seed}-bar-${run.round}-r${bar.rerolls}`);
  bar.items = stockItems(run, rng);
  return true;
}

// ---------- Buying ----------
// Returns { ok, reason?, needsTarget?, packet? }
export function buy(run, kind, index) {
  const list = kind === 'packet' ? run.bar.packets : run.bar.items;
  const item = list[index];
  if (!item || item.sold) return { ok: false, reason: 'Sold out' };
  if (run.money < item.price) return { ok: false, reason: 'Not enough money' };
  if (item.type === 'regular' && run.regulars.length >= MAX_REGULARS) return { ok: false, reason: 'No room at the machine. Sell a Regular first.' };

  run.money -= item.price;
  item.sold = true;

  if (item.type === 'regular') { addRegular(run, item.id); return { ok: true }; }
  if (item.type === 'mat') { levelUp(run, item.id); return { ok: true }; }
  if (item.type === 'scratch') return useScratch(run, item.id);
  if (item.type === 'packet') {
    const rng = makeRng(`${run.seed}-pk-${run.round}-${index}-${run.bar.rerolls}`);
    run.bar.pending = { kind: 'packet', id: item.id, choices: packetChoices(run, item.id, rng) };
    return { ok: true, packet: run.bar.pending };
  }
  return { ok: false };
}

function packetChoices(run, id, rng) {
  if (id === 'ready') return rng.shuffle(BASE_SYMBOLS).slice(0, 3).map((s) => ({ type: 'mat', id: s }));
  if (id === 'vinegar') return rng.shuffle(SCRATCHCARDS.map((s) => s.id)).slice(0, 3).map((s) => ({ type: 'scratch', id: s }));
  const a = rollRegular(rng, run, [], 0.06);
  const b = rollRegular(rng, run, [a], 0.06);
  return [a, b].filter(Boolean).map((r) => ({ type: 'regular', id: r }));
}

export function pickFromPacket(run, choiceIndex) {
  const p = run.bar.pending;
  if (!p || p.kind !== 'packet') return { ok: false };
  if (choiceIndex == null) { run.bar.pending = null; return { ok: true, skipped: true }; }
  const c = p.choices[choiceIndex];
  if (c.type === 'regular' && run.regulars.length >= MAX_REGULARS) return { ok: false, reason: 'No room at the machine. Skip, or sell one first.' };
  run.bar.pending = null;
  if (c.type === 'regular') { addRegular(run, c.id); return { ok: true }; }
  if (c.type === 'mat') { levelUp(run, c.id); return { ok: true, mat: c.id }; }
  return useScratch(run, c.id);
}

export function addRegular(run, id) {
  run.regulars.push({ id, state: {} });
}

export function levelUp(run, id) {
  run.levels[id] = (run.levels[id] || 0) + 1;
}

// ---------- Scratchcards ----------
function useScratch(run, id) {
  if (id === 'dip') return { ok: true, dip: luckyDip(run) };
  run.bar.pending = { kind: 'scratch', id };
  return { ok: true, needsTarget: true, scratch: id };
}

// Can this scratchcard be applied to reel r, entry i?
export function canTarget(run, id, r, i) {
  const strip = run.reels[r];
  const e = strip[i];
  if (id === 'gold') return !isGold(e) && baseId(e) !== 'wild';
  if (id === 'copy') return strip.length < MAX_STRIP;
  if (id === 'bin') return strip.length > MIN_STRIP;
  if (id === 'wild') return baseId(e) !== 'wild';
  return false;
}

export function applyScratch(run, id, r, i) {
  if (!canTarget(run, id, r, i)) return false;
  const strip = run.reels[r];
  if (id === 'gold') strip[i] = baseId(strip[i]) + ':gold';
  if (id === 'copy') strip.splice(i + 1, 0, strip[i]);
  if (id === 'bin') strip.splice(i, 1);
  if (id === 'wild') strip[i] = 'wild';
  run.stops[r] = run.stops[r] % strip.length;
  if (run.bar?.pending?.kind === 'scratch') run.bar.pending = null;
  return true;
}

export function cancelScratch(run) {
  if (run.bar?.pending?.kind === 'scratch') run.bar.pending = null;
}

function luckyDip(run) {
  const rng = makeRng(`${run.seed}-dip-${run.round}-${run.money}-${run.regulars.length}`);
  if (rng.next() < 0.2) { run.money += 10; return { text: 'Lucky Dip: a crumpled tenner! +£10' }; }
  for (let tries = 0; tries < 20; tries++) {
    const id = rng.pick(['gold', 'gold', 'copy', 'bin', 'wild']);
    const r = rng.int(3);
    const i = rng.int(run.reels[r].length);
    const name = SYMBOLS[baseId(run.reels[r][i])].name;
    if (applyScratch(run, id, r, i)) {
      const verb = { gold: `gilded a ${name}`, copy: `copied a ${name}`, bin: `binned a ${name}`, wild: `turned a ${name} Wild` }[id];
      return { text: `Lucky Dip ${verb} on reel ${r + 1}.` };
    }
  }
  run.money += 5;
  return { text: 'Lucky Dip: a fiver down the back of the sofa. +£5' };
}

// ---------- Selling and ordering ----------
export function sell(run, slot) {
  const r = run.regulars[slot];
  if (!r) return 0;
  const v = sellValue(r);
  run.money += v;
  run.regulars.splice(slot, 1);
  return v;
}

export function move(run, slot, dir) {
  const j = slot + dir;
  if (j < 0 || j >= run.regulars.length) return false;
  [run.regulars[slot], run.regulars[j]] = [run.regulars[j], run.regulars[slot]];
  return true;
}

export function itemInfo(item) {
  if (item.type === 'regular') {
    const d = REG_BY_ID[item.id];
    return { icon: d.face, name: d.name, desc: d.desc, tag: RARITY[d.rarity].name, colour: RARITY[d.rarity].colour };
  }
  if (item.type === 'mat') {
    const m = MATS.find((x) => x.id === item.id);
    return { icon: m.icon, name: m.name, desc: m.desc, tag: 'Beer Mat', colour: '#e9a645' };
  }
  if (item.type === 'scratch') {
    const s = SCRATCH_BY_ID[item.id];
    return { icon: s.icon, name: s.name, desc: s.desc, tag: 'Scratchcard', colour: '#3dd6ff' };
  }
  const p = PACKET_BY_ID[item.id];
  return { icon: p.icon, name: p.name, desc: p.desc, tag: 'Crisps', colour: p.colour };
}
