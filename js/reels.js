import { STARTING_STRIP } from './symbols.js';

export const REEL_COUNT = 3;
export const ROWS = 3;

// Build three shuffled reel strips (arrays of symbol ids).
export function makeReels(rng) {
  const base = [];
  for (const [id, count] of Object.entries(STARTING_STRIP)) {
    for (let i = 0; i < count; i++) base.push(id);
  }
  return Array.from({ length: REEL_COUNT }, () => rng.shuffle(base));
}

// Pick a random stop position on each reel.
export function spin(reels, rng) {
  return reels.map((strip) => rng.int(strip.length));
}

// Symbols visible on a reel: the one above the stop, the stop, the one below.
export function visibleOnReel(strip, stop) {
  const n = strip.length;
  return [strip[(stop - 1 + n) % n], strip[stop], strip[(stop + 1) % n]];
}

// grid[row][col] of symbol ids.
export function toGrid(reels, stops) {
  const cols = reels.map((strip, i) => visibleOnReel(strip, stops[i]));
  return Array.from({ length: ROWS }, (_, r) => cols.map((col) => col[r]));
}
