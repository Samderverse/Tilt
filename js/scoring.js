import { SYMBOLS, baseId, isGold, LEVEL_COINS, LEVEL_MULT } from './symbols.js';

// Win lines as [row, col] cells.
export const LINES = [
  { id: 'top',    name: 'Top line',    cells: [[0, 0], [0, 1], [0, 2]] },
  { id: 'middle', name: 'Middle line', cells: [[1, 0], [1, 1], [1, 2]] },
  { id: 'bottom', name: 'Bottom line', cells: [[2, 0], [2, 1], [2, 2]] },
  { id: 'diag-down', name: 'Diagonal', cells: [[0, 0], [1, 1], [2, 2]] },
  { id: 'diag-up', name: 'Diagonal', cells: [[2, 0], [1, 1], [0, 2]] },
];

// Every spin starts at x3, like a Balatro hand having a base Mult.
export const BASE_MULT = 3;

// Work out which lines win on a grid of strip entries.
// ctx:
//   aliases:     { lemon: 'cherry' } (from Regulars like Dodgy Dave)
//   levels:      Beer Mat levels per symbol id
//   lines:       allowed line ids (boss)
//   symbolCoins: (id, coins) => coins (boss)
//   coinFactor:  multiplier on each win's coins (boss)
//
// Rules:
//   3 matching on a line -> each cell's coins added up; line Mult = symbol mult (+ level)
//   2 matching from the left (pub-machine style) -> 2 x symbol coins, no Mult
//   A spin's Mult only takes its BEST line's Mult (not the sum), so extra lines add Coins.
//   Wilds match anything. Gold cells are worth double coins.
export function findWins(grid, ctx = {}) {
  const alias = (id) => (ctx.aliases && ctx.aliases[id]) || id;
  const levels = ctx.levels || {};
  const wins = [];
  const blocked = [];

  for (const line of LINES) {
    const entries = line.cells.map(([r, c]) => grid[r][c]);
    const ids = entries.map((e) => alias(baseId(e)));
    const symId = ids.find((id) => id !== 'wild') || 'wild';
    let count = 0;
    while (count < 3 && (ids[count] === symId || ids[count] === 'wild')) count++;
    if (count < 2) continue;

    const sym = SYMBOLS[symId];
    const lvl = levels[symId] || 0;
    let unit = sym.coins + lvl * LEVEL_COINS;
    if (ctx.symbolCoins) unit = ctx.symbolCoins(symId, unit);
    const cells = line.cells.slice(0, count);
    const cellEntries = entries.slice(0, count);
    const goldCount = cellEntries.filter(isGold).length;
    const wildCount = cellEntries.filter((e) => baseId(e) === 'wild').length;

    let coins;
    let mult;
    if (count === 3) {
      coins = cellEntries.reduce((s, e) => s + unit * (isGold(e) ? 2 : 1), 0);
      mult = sym.mult + lvl * LEVEL_MULT;
    } else {
      coins = unit * 2 * (goldCount ? 2 : 1);
      mult = 0;
    }

    const win = { line, symbol: sym, count, coins, rawCoins: coins, mult, cells, entries: cellEntries, goldCount, wildCount, level: lvl };
    if (ctx.lines && !ctx.lines.includes(line.id)) { blocked.push(win); continue; }
    if (ctx.coinFactor != null) win.coins = Math.floor(win.coins * ctx.coinFactor);
    wins.push(win);
  }
  return { wins, blocked };
}
