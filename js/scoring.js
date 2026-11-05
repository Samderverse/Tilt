import { SYMBOLS } from './symbols.js';

// Win lines as [row, col] cells. Diagonals etc. can be unlocked later.
export const LINES = [
  { id: 'top',    name: 'Top line',    cells: [[0, 0], [0, 1], [0, 2]] },
  { id: 'middle', name: 'Middle line', cells: [[1, 0], [1, 1], [1, 2]] },
  { id: 'bottom', name: 'Bottom line', cells: [[2, 0], [2, 1], [2, 2]] },
];

export const BASE_MULT = 1;

// Score one grid. Returns a step-by-step breakdown so the UI can animate it.
// Rules:
//   3 matching on a line  -> 3 x symbol coins, + symbol mult
//   2 matching from the left (pub-machine style) -> 1 x symbol coins, no mult
// mods (from boss rules, later regulars):
//   lines:       array of allowed line ids
//   symbolCoins: (id, base) => coins
//   coinFactor:  multiplier applied to each win's coins
export function evaluate(grid, mods = {}) {
  const wins = [];
  const blocked = [];
  const coinsOf = (sym) => (mods.symbolCoins ? mods.symbolCoins(sym.id, sym.coins) : sym.coins);
  const factor = mods.coinFactor ?? 1;

  for (const line of LINES) {
    const ids = line.cells.map(([r, c]) => grid[r][c]);
    const sym = SYMBOLS[ids[0]];
    let win = null;
    if (ids[0] === ids[1] && ids[1] === ids[2]) {
      win = { line, symbol: sym, count: 3, coins: coinsOf(sym) * 3, mult: sym.mult, cells: line.cells };
    } else if (ids[0] === ids[1]) {
      win = { line, symbol: sym, count: 2, coins: coinsOf(sym), mult: 0, cells: line.cells.slice(0, 2) };
    }
    if (!win) continue;
    if (mods.lines && !mods.lines.includes(line.id)) { blocked.push(win); continue; }
    win.rawCoins = win.coins;
    win.coins = Math.floor(win.coins * factor);
    wins.push(win);
  }
  const coins = wins.reduce((s, w) => s + w.coins, 0);
  const mult = BASE_MULT + wins.reduce((s, w) => s + w.mult, 0);
  return { wins, blocked, coins, mult, total: wins.length ? coins * mult : 0 };
}
