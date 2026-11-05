// Symbol definitions. Coins = base chips, mult = the line's Mult when the symbol wins a line of 3.
// Reel strip entries are strings: 'cherry', or 'cherry:gold' for a gold-leafed one.

export const SYMBOLS = {
  cherry: { id: 'cherry', icon: '🍒', name: 'Cherry', coins: 10,  mult: 1 },
  lemon:  { id: 'lemon',  icon: '🍋', name: 'Lemon',  coins: 12,  mult: 1 },
  grapes: { id: 'grapes', icon: '🍇', name: 'Grapes', coins: 15,  mult: 1 },
  melon:  { id: 'melon',  icon: '🍉', name: 'Melon',  coins: 20,  mult: 1 },
  bell:   { id: 'bell',   icon: '🔔', name: 'Bell',   coins: 30,  mult: 2 },
  bar:    { id: 'bar',    icon: 'BAR', name: 'Bar',   coins: 40,  mult: 2, text: true },
  seven:  { id: 'seven',  icon: '7',   name: 'Seven', coins: 60, mult: 3, text: true },
  wild:   { id: 'wild',   icon: '⭐',  name: 'Wild',  coins: 25,  mult: 2 },
};

// Symbols that appear naturally (wilds only come from Scratchcards).
export const BASE_SYMBOLS = ['cherry', 'lemon', 'grapes', 'melon', 'bell', 'bar', 'seven'];

// Each Beer Mat level adds this much to the symbol.
export const LEVEL_COINS = 5;
export const LEVEL_MULT = 1;

// How many of each symbol sit on a starting reel strip.
export const STARTING_STRIP = {
  cherry: 3,
  lemon: 3,
  grapes: 2,
  melon: 2,
  bell: 1,
  bar: 1,
  seven: 1,
};

export const baseId = (entry) => entry.split(':')[0];
export const isGold = (entry) => entry.endsWith(':gold');
export const symbolOf = (entry) => SYMBOLS[baseId(entry)];
