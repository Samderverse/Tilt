// Starting machines: like Balatro's decks. Unlocked by how far you've ever got
// (rounds cleared in your best run).
import { STARTING_STRIP } from './symbols.js';

export const MACHINES = [
  {
    id: 'local', name: 'The Local', short: 'THE LOCAL', icon: '🍺', unlock: 0,
    desc: 'The classic machine. No tricks, no favours.',
  },
  {
    id: 'seaside', name: 'Seaside Arcade', short: 'SEASIDE', icon: '🎡', unlock: 6, unlockText: 'Clear Pint 2 to unlock',
    desc: 'Extra Bells and Bars on every reel, but only 5 spins a round.',
    strip: { cherry: 2, lemon: 2, grapes: 2, melon: 2, bell: 2, bar: 2, seven: 1 },
    spins: -1,
  },
  {
    id: 'student', name: 'Student Union', short: 'SU BAR', icon: '🎓', unlock: 12, unlockText: 'Clear Pint 4 to unlock',
    desc: 'Everything at the Bar is £1 cheaper, but there\'s no interest on savings.',
    discount: 1, noInterest: true,
  },
  {
    id: 'wmc', name: 'Working Men\'s Club', short: 'THE CLUB', icon: '🎱', unlock: 18, unlockText: 'Clear Pint 6 to unlock',
    desc: 'No Sevens on the reels, but Regulars are £2 cheaper and you start with £8.',
    strip: { cherry: 3, lemon: 3, grapes: 2, melon: 2, bell: 2, bar: 1 },
    regDiscount: 2, startMoney: 8,
  },
  {
    id: 'casino', name: 'High Roller', short: 'HIGH ROLLER', icon: '🎩', unlock: 24, unlockText: 'Beat the pub (all 8 Pints) to unlock',
    desc: 'Start with £15 and a Wild on every reel, but every target is 25% higher.',
    startMoney: 15, wild: true, targetFactor: 1.25,
  },
];
export const MACHINE_BY_ID = Object.fromEntries(MACHINES.map((m) => [m.id, m]));
export const machineOf = (run) => MACHINE_BY_ID[run.machine || 'local'];
export const stripFor = (m) => m.strip || STARTING_STRIP;
