// Which sound effect plays for each moment in the game. Clips live in audio/sfx/<name>.mp3.
// 'synth' means the built-in beep for that moment.

export const CLIPS = [
  'reel-spin-a', 'reel-stop-a', 'chime-a', 'button-tick', 'button-click', 'ding', 'coin-ding',
  'thump-a', 'coin-cascade', 'win-bell-short', 'win-bell', 'glass-smash', 'game-over', 'blank-fart', 'tilt-glitch',
];

// gain: relative loudness of that moment; rate: playback speed (lower = deeper).
export const ROLES = [
  { id: 'spin',       def: 'reel-spin-a',    gain: 0.55 },  // reels spinning
  { id: 'reelStop',   def: 'reel-stop-a',    gain: 0.8 },   // each reel lands
  { id: 'lineWin',    def: 'chime-a',        gain: 0.6 },   // winning line (rises each line)
  { id: 'coin',       def: 'button-tick',    gain: 0.5 },   // coins added
  { id: 'multi',      def: 'ding',           gain: 0.5 },   // a Regular adds Multi
  { id: 'hold',       def: 'button-click',   gain: 0.7 },   // hold / un-hold
  { id: 'nudge',      def: 'button-tick',    gain: 0.8 },   // nudge
  { id: 'bump',       def: 'thump-a',        gain: 0.9 },   // bump the machine
  { id: 'tilt',       def: 'tilt-glitch',    gain: 0.75 },  // TILT!
  { id: 'bigWin',     def: 'coin-cascade',   gain: 0.6 },   // a spin that clears the round in one
  { id: 'roundClear', def: 'win-bell-short', gain: 0.45 },  // round cleared
  { id: 'shatter',    def: 'glass-smash',    gain: 0.75 },  // the Landlord's patience shatters
  { id: 'bossBeaten', def: 'win-bell',       gain: 0.45 },  // ...followed by the win bell
  { id: 'slam',       def: 'glass-smash',    gain: 0.6, rate: 0.85 }, // a Landlord walks in (deeper smash)
  { id: 'cash',       def: 'coin-ding',      gain: 0.6 },   // buying at the Bar
  { id: 'blank',      def: 'blank-fart',     gain: 0.7 },   // a spin that wins nothing
  { id: 'lose',       def: 'game-over',      gain: 0.6 },   // game over
  { id: 'lever',      def: 'synth',          gain: 0.6 },   // (unused for now)
];
export const ROLE_BY_ID = Object.fromEntries(ROLES.map((r) => [r.id, r]));
