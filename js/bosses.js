// The Landlords. Every third round is one of these.
// Each rule is plain data the game and UI read from.

export const BOSSES = [
  {
    id: 'bouncer', name: 'The Bouncer', face: '😠',
    rule: 'Only the middle line gets in.',
    mods: { lines: ['middle'] },
  },
  {
    id: 'inspector', name: 'Health Inspector', face: '🧐',
    rule: 'Cherries are condemned. They score nothing.',
    mods: { symbolCoins: (id, base) => (id === 'cherry' ? 0 : base) },
  },
  {
    id: 'lastorders', name: 'Last Orders', face: '🕰️',
    rule: 'Time at the bar. Only 3 spins.',
    spins: 3,
  },
  {
    id: 'powercut', name: 'Power Cut', face: '🔌',
    rule: 'Only the middle row is lit. Good luck.',
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
    rule: 'Your feet are stuck. No nudges.',
    nudges: 0,
  },
];

export const BOSS_BY_ID = Object.fromEntries(BOSSES.map((b) => [b.id, b]));
