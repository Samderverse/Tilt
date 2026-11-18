// The Landlords. Every third round is one of these.
// Each rule is plain data the game and UI read from.
// tier 1 = early Pints (1-4), tier 2 = nastier, for Pints 5-8. Endless mode uses them all.

export const BOSSES = [
  {
    id: 'bouncer', tier: 1, name: 'The Bouncer', face: '😠',
    rule: 'Diagonals aren\'t getting in tonight. Straight lines only.',
    mods: { lines: ['top', 'middle', 'bottom'] },
  },
  {
    id: 'inspector', tier: 1, name: 'Health Inspector', face: '🧐',
    rule: 'Cherries are past their date. They score half Coins.',
    mods: { symbolCoins: (id, base) => (id === 'cherry' ? Math.floor(base / 2) : base) },
  },
  {
    id: 'lastorders', tier: 1, name: 'Last Orders', face: '🕰️',
    rule: 'Time at the bar. Only 4 spins.',
    spins: 4,
  },
  {
    id: 'powercut', tier: 2, name: 'Power Cut', face: '🔌',
    rule: 'Only the middle row is lit. Only gold shines in the dark.',
    darkRows: [0, 2],
  },
  {
    id: 'taxman', tier: 2, name: 'The Taxman', face: '💼',
    rule: 'Takes 25% of every win\'s coins.',
    mods: { coinFactor: 0.75 },
  },
  {
    id: 'uncle', tier: 2, name: 'Drunk Uncle', face: '🥴',
    rule: 'Bumps the machine. Two reels swap after every spin.',
    swapReels: true,
  },
  {
    id: 'quiz', tier: 1, name: 'The Quiz Master', face: '🤓',
    rule: 'Your first spin is a wrong answer. It never scores.',
    voidFirstSpin: true,
  },
  {
    id: 'sticky', tier: 1, name: 'Sticky Floors', face: '🪣',
    rule: 'Your feet are stuck. Just 1 nudge all round.',
    nudges: 1,
  },

  // ---------- Drop D: new Landlords ----------
  {
    id: 'bolted', tier: 1, name: 'Bolted Down', face: '🔩',
    rule: 'The machine\'s bolted to the floor. No bumping.',
    noBump: true,
  },
  {
    id: 'tab', tier: 1, name: 'Running a Tab', face: '🧾',
    rule: 'Every spin costs £1 while you\'ve got it.',
    spinCost: 1,
  },
  {
    id: 'jammed', tier: 1, name: 'Jammed Reel', face: '🔧',
    rule: 'The middle reel is stuck: no holding, nudging or bumping it.',
    jammed: 1,
  },
  {
    id: 'twofer', tier: 2, name: 'Half Measures', face: '🥃',
    rule: 'Pairs only pay half Coins. Go for 3 in a row.',
    mods: { pairFactor: 0.5 },
  },
  {
    id: 'darts', tier: 2, name: 'Darts Night', face: '🎯',
    rule: 'The oche is in the way. The middle line doesn\'t count.',
    mods: { lines: ['top', 'bottom', 'diag-down', 'diag-up'] },
  },
  {
    id: 'fog', tier: 2, name: 'Smoke Machine', face: '🌫️',
    rule: 'The right reel is lost in the smoke until you collect.',
    darkCols: [2],
  },
  {
    id: 'members', tier: 2, name: 'Members Only', face: '🎩',
    rule: 'Your leftmost Regular isn\'t a member. They sit this one out.',
    barFirst: true,
  },
  {
    id: 'watered', tier: 2, name: 'Watered Down', face: '💧',
    rule: 'The drinks are watered down. Every spin\'s Multi is cut by a third.',
    multFactor: 0.67,
  },
];

export const BOSS_BY_ID = Object.fromEntries(BOSSES.map((b) => [b.id, b]));
