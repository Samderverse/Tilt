// The Landlords. Every third round is one of these.
// Each rule is plain data the game and UI read from.

export const BOSSES = [
  {
    id: 'bouncer', name: 'The Bouncer', face: '😠',
    rule: 'Diagonals aren\'t getting in tonight. Straight lines only.',
    mods: { lines: ['top', 'middle', 'bottom'] },
  },
  {
    id: 'inspector', name: 'Health Inspector', face: '🧐',
    rule: 'Cherries are past their date. They score half Coins.',
    mods: { symbolCoins: (id, base) => (id === 'cherry' ? Math.floor(base / 2) : base) },
  },
  {
    id: 'lastorders', name: 'Last Orders', face: '🕰️',
    rule: 'Time at the bar. Only 4 spins.',
    spins: 4,
  },
  {
    id: 'powercut', name: 'Power Cut', face: '🔌',
    rule: 'Only the middle row is lit. Only gold shines in the dark.',
    darkRows: [0, 2],
  },
  {
    id: 'taxman', name: 'The Taxman', face: '💼',
    rule: 'Takes 25% of every win\'s coins.',
    mods: { coinFactor: 0.75 },
  },
  {
    id: 'uncle', name: 'Drunk Uncle', face: '🥴',
    rule: 'Bumps the machine. Two reels swap after every spin.',
    swapReels: true,
  },
  {
    id: 'quiz', name: 'The Quiz Master', face: '🤓',
    rule: 'Your first spin is a wrong answer. It never scores.',
    voidFirstSpin: true,
  },
  {
    id: 'sticky', name: 'Sticky Floors', face: '🪣',
    rule: 'Your feet are stuck. Just 1 nudge all round.',
    nudges: 1,
  },
];

export const BOSS_BY_ID = Object.fromEntries(BOSSES.map((b) => [b.id, b]));
