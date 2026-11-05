// Symbol definitions. Coins = base chips, mult = mult added when the symbol wins a line.

export const SYMBOLS = {
  cherry: { id: 'cherry', icon: '🍒', name: 'Cherry', coins: 10,  mult: 1 },
  lemon:  { id: 'lemon',  icon: '🍋', name: 'Lemon',  coins: 15,  mult: 1 },
  grapes: { id: 'grapes', icon: '🍇', name: 'Grapes', coins: 20,  mult: 1 },
  melon:  { id: 'melon',  icon: '🍉', name: 'Melon',  coins: 30,  mult: 2 },
  bell:   { id: 'bell',   icon: '🔔', name: 'Bell',   coins: 50,  mult: 2 },
  bar:    { id: 'bar',    icon: 'BAR', name: 'Bar',   coins: 80,  mult: 3, text: true },
  seven:  { id: 'seven',  icon: '7',   name: 'Seven', coins: 150, mult: 5, text: true },
};

// How many of each symbol sit on a starting reel strip.
// Later phases let the player add, remove and upgrade these.
export const STARTING_STRIP = {
  cherry: 3,
  lemon: 3,
  grapes: 2,
  melon: 2,
  bell: 1,
  bar: 1,
  seven: 1,
};
