// The Regulars: Tilt's jokers. Up to 5 stand at your machine and trigger left to right.
//
// Hooks (all optional):
//   line(ctx)       -> effect, once per winning line, after the line scores
//   end(ctx)        -> effect, once per spin, after all lines
//   nudge(ctx)      -> called when you nudge (mutate ctx.state)
//   roundEnd(ctx)   -> { money } at the end of a cleared round
//   aliases         -> { from: to } symbol aliases while owned
//   extra           -> { spins, holds, nudges } added each round
//   status(state)   -> short live text for the info sheet
// An effect is { coins, mult, xmult, money, text } (any subset), or null.

export const RARITY = {
  common:    { name: 'Common',    price: 4,  weight: 64, colour: '#8fd3ff' },
  uncommon:  { name: 'Uncommon',  price: 6,  weight: 28, colour: '#7dff6a' },
  rare:      { name: 'Rare',      price: 8,  weight: 8,  colour: '#ff6ad5' },
  legendary: { name: 'Legendary', price: 12, weight: 0,  colour: '#ffc23d' },
};

const sym = (ctx, id) => ctx.win.symbol.id === id;

export const REGULARS = [
  // ---------- Common ----------
  {
    id: 'penny', name: 'Penny Pete', face: '🪙', rarity: 'common',
    desc: '+15 Coins for each Cherry in a winning line.',
    line: (ctx) => sym(ctx, 'cherry') && { coins: 15 * ctx.win.count },
  },
  {
    id: 'lil', name: 'Lemon Lil', face: '👵', rarity: 'common',
    desc: '+4 Mult when Lemons win a line.',
    line: (ctx) => sym(ctx, 'lemon') && { mult: 4 },
  },
  {
    id: 'gary', name: 'Grapevine Gary', face: '🗣️', rarity: 'common',
    desc: '+20 Coins and +3 Mult when Grapes win a line.',
    line: (ctx) => sym(ctx, 'grapes') && { coins: 20, mult: 3 },
  },
  {
    id: 'mel', name: 'Melon Mel', face: '🧔', rarity: 'common',
    desc: '+50 Coins when Melons win a line.',
    line: (ctx) => sym(ctx, 'melon') && { coins: 50 },
  },
  {
    id: 'kev', name: 'Karaoke Kev', face: '🎤', rarity: 'common',
    desc: '+5 Mult when Bells win a line.',
    line: (ctx) => sym(ctx, 'bell') && { mult: 5 },
  },
  {
    id: 'jen', name: 'Jukebox Jen', face: '📻', rarity: 'common',
    desc: '+1 Mult for every winning line.',
    line: () => ({ mult: 1 }),
  },
  {
    id: 'barry', name: 'Big Coat Barry', face: '🧥', rarity: 'common',
    desc: '+30 Coins on any spin that wins.',
    end: (ctx) => ctx.wins.length > 0 && { coins: 30 },
  },
  {
    id: 'reg', name: 'Old Reg', face: '👴', rarity: 'common',
    desc: '+4 Mult on any spin that wins.',
    end: (ctx) => ctx.wins.length > 0 && { mult: 4 },
  },
  {
    id: 'terry', name: 'Tight Terry', face: '🤏', rarity: 'common',
    desc: 'Earn £1 for every line of 2.',
    line: (ctx) => ctx.win.count === 2 && { money: 1 },
  },
  {
    id: 'tony', name: 'Two-Pint Tony', face: '🍻', rarity: 'common',
    desc: 'Lines of 2 also add their symbol\'s Mult, +1.',
    line: (ctx) => ctx.win.count === 2 && { mult: ctx.win.symbol.mult + 1 },
  },
  {
    id: 'carol', name: 'Crossword Carol', face: '✏️', rarity: 'common',
    desc: '+8 Mult if your last spin of the round wins.',
    end: (ctx) => ctx.wins.length > 0 && ctx.run.spinsLeft === 0 && { mult: 8 },
  },
  {
    id: 'brenda', name: 'Early Bird Brenda', face: '🐦', rarity: 'common',
    desc: '×1.5 Mult if your first spin of the round wins.',
    end: (ctx) => ctx.wins.length > 0 && ctx.run.spinsThisRound === 1 && { xmult: 1.5 },
  },
  {
    id: 'sid', name: 'Shifty Sid', face: '🕶️', rarity: 'common',
    desc: '+1 Nudge every round.',
    extra: { nudges: 1 },
  },
  {
    id: 'nephew', name: 'The Landlord\'s Nephew', face: '🧒', rarity: 'common',
    desc: 'Earn £2 at the end of every round.',
    roundEnd: () => ({ money: 2 }),
  },

  // ---------- Uncommon ----------
  {
    id: 'dave', name: 'Dodgy Dave', face: '🦹', rarity: 'uncommon',
    desc: 'Lemons count as Cherries. Nobody checks.',
    aliases: { lemon: 'cherry' },
  },
  {
    id: 'quentin', name: 'Quiz Machine Quentin', face: '🤓', rarity: 'uncommon',
    desc: 'Each losing spin banks +5 Mult. Your next win cashes it all in.',
    end: (ctx) => {
      if (!ctx.wins.length) { ctx.state.bank = (ctx.state.bank || 0) + 5; return { text: `Banked +${ctx.state.bank}` }; }
      const b = ctx.state.bank || 0;
      ctx.state.bank = 0;
      return b ? { mult: b } : null;
    },
    status: (s) => `Banked: +${s.bank || 0} Mult`,
  },
  {
    id: 'bore', name: 'The Pub Bore', face: '😴', rarity: 'uncommon',
    desc: 'Gains +1 Mult every time you nudge. Adds it to every winning spin.',
    nudge: (ctx) => { ctx.state.m = (ctx.state.m || 0) + 1; },
    end: (ctx) => ctx.wins.length > 0 && ctx.state.m > 0 && { mult: ctx.state.m },
    status: (s) => `Currently +${s.m || 0} Mult`,
  },
  {
    id: 'nan', name: 'Nan with the Tenpences', face: '👛', rarity: 'uncommon',
    desc: '+1 Spin every round.',
    extra: { spins: 1 },
  },
  {
    id: 'eddie', name: 'Steady Eddie', face: '🧘', rarity: 'uncommon',
    desc: '+1 Hold every round. +6 Mult when a held reel is part of a win.',
    extra: { holds: 1 },
    line: (ctx) => ctx.win.cells.some(([, c]) => ctx.heldMask[c]) && { mult: 6 },
  },
  {
    id: 'sue', name: 'Fruit Salad Sue', face: '🥗', rarity: 'uncommon',
    desc: '×2 Mult if two different symbols win on the same spin.',
    end: (ctx) => new Set(ctx.wins.map((w) => w.symbol.id)).size >= 2 && { xmult: 2 },
  },
  {
    id: 'kath', name: 'Cash Converter Kath', face: '💷', rarity: 'uncommon',
    desc: 'Her sell value goes up £2 every round.',
    roundEnd: (ctx) => { ctx.state.sell = (ctx.state.sell || 0) + 2; return { text: 'Worth more' }; },
    status: (s) => `Sell bonus: +£${s.sell || 0}`,
  },
  {
    id: 'willy', name: 'Wild Willy', face: '🤠', rarity: 'uncommon',
    desc: '+6 Mult for each Wild in a winning line.',
    line: (ctx) => ctx.win.wildCount > 0 && { mult: 6 * ctx.win.wildCount },
  },
  {
    id: 'mo', name: 'Mat Collector Mo', face: '🍺', rarity: 'uncommon',
    desc: '+1 Mult on winning spins for every Beer Mat level you own.',
    end: (ctx) => {
      const lv = Object.values(ctx.run.levels).reduce((a, b) => a + b, 0);
      return ctx.wins.length > 0 && lv > 0 && { mult: lv };
    },
  },

  // ---------- Rare ----------
  {
    id: 'darts', name: 'Darts Champion', face: '🎯', rarity: 'rare',
    desc: '×2 Mult when two or more lines win.',
    end: (ctx) => ctx.wins.length >= 2 && { xmult: 2 },
  },
  {
    id: 'barman', name: 'The Barman', face: '🤵', rarity: 'rare',
    desc: 'Copies whatever the Regular to his right does.',
    copies: true,
  },
  {
    id: 'lucy', name: 'Lucky Lucy', face: '🍀', rarity: 'rare',
    desc: '×3 Mult when Sevens win a line.',
    line: (ctx) => sym(ctx, 'seven') && { xmult: 3 },
  },
  {
    id: 'glenda', name: 'Gold Digger Glenda', face: '💍', rarity: 'rare',
    desc: '×1.5 Mult for each Gold symbol in a winning line.',
    line: (ctx) => ctx.win.goldCount > 0 && { xmult: Math.pow(1.5, ctx.win.goldCount) },
  },

  // ---------- Legendary (crisp packets only) ----------
  {
    id: 'guvnor', name: 'The Guv\'nor', face: '👑', rarity: 'legendary',
    desc: '×1.5 Mult on winning spins, +×0.5 for every Landlord beaten while he\'s here.',
    end: (ctx) => ctx.wins.length > 0 && { xmult: 1.5 + 0.5 * (ctx.state.b || 0) },
    roundEnd: (ctx) => { if (ctx.wasBoss) { ctx.state.b = (ctx.state.b || 0) + 1; return { text: 'Stronger' }; } return null; },
    status: (s) => `Currently ×${(1.5 + 0.5 * (s.b || 0)).toFixed(1)}`,
  },
];

export const REG_BY_ID = Object.fromEntries(REGULARS.map((r) => [r.id, r]));

export const MAX_REGULARS = 5;

export function priceOf(id) { return RARITY[REG_BY_ID[id].rarity].price; }

export function sellValue(owned) {
  return Math.floor(priceOf(owned.id) / 2) + (owned.state.sell || 0);
}

// Which definition actually acts for slot i (the Barman borrows his right-hand neighbour's).
function actingDef(regs, i) {
  const def = REG_BY_ID[regs[i].id];
  if (!def.copies) return { def, state: regs[i].state };
  const right = regs[i + 1];
  if (!right) return null;
  const rdef = REG_BY_ID[right.id];
  if (rdef.copies) return null;
  regs[i].state.copy = regs[i].state.copy || {};
  const st = (regs[i].state.copy[right.id] = regs[i].state.copy[right.id] || {});
  return { def: rdef, state: st };
}

// Run one hook across every Regular in slot order.
// Returns [{ slot, effect }] for those that did something.
export function runHook(regs, hook, base) {
  const out = [];
  for (let i = 0; i < regs.length; i++) {
    const a = actingDef(regs, i);
    if (!a || !a.def[hook]) continue;
    const eff = a.def[hook]({ ...base, state: a.state });
    if (eff) out.push({ slot: i, effect: eff });
  }
  return out;
}

export function aliasesFor(regs) {
  const out = {};
  regs.forEach((r, i) => {
    const a = actingDef(regs, i);
    if (a?.def.aliases) Object.assign(out, a.def.aliases);
  });
  return out;
}

export function extrasFor(regs) {
  const out = { spins: 0, holds: 0, nudges: 0 };
  regs.forEach((r, i) => {
    const a = actingDef(regs, i);
    if (a?.def.extra) for (const k in a.def.extra) out[k] += a.def.extra[k];
  });
  return out;
}

export function describeEffect(e) {
  if (e.text) return e.text;
  const parts = [];
  if (e.coins) parts.push(`+${e.coins}`);
  if (e.mult) parts.push(`+${e.mult} Mult`);
  if (e.xmult) parts.push(`×${+e.xmult.toFixed(2)} Mult`);
  if (e.money) parts.push(`+£${e.money}`);
  return parts.join(' ');
}
