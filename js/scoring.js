import { SYMBOLS } from './symbols.js';

// Win lines as [row, col] cells. Phase 1: the three horizontals.
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
export function evaluate(grid) {
  const wins = [];
  for (const line of LINES) {
    const ids = line.cells.map(([r, c]) => grid[r][c]);
    const sym = SYMBOLS[ids[0]];
    if (ids[0] === ids[1] && ids[1] === ids[2]) {
      wins.push({ line, symbol: sym, count: 3, coins: sym.coins * 3, mult: sym.mult, cells: line.cells });
    } else if (ids[0] === ids[1]) {
      wins.push({ line, symbol: sym, count: 2, coins: sym.coins, mult: 0, cells: line.cells.slice(0, 2) });
    }
  }
  const coins = wins.reduce((s, w) => s + w.coins, 0);
  const mult = BASE_MULT + wins.reduce((s, w) => s + w.mult, 0);
  return { wins, coins, mult, total: coins * mult };
}
