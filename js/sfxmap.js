// Which sound plays for each moment in the game.
// Clips live in audio/sfx/<name>.mp3. 'synth' means the built-in beep for that moment.
// Players can try other clips on the Sound test page (Settings, or ?sounds=1);
// their picks are saved in this browser and can be copied to send back.

export const CLIPS = [
  'reel-spin-a', 'reel-spin-b', 'reel-spin-c',
  'reel-stop-a', 'reel-stop-b', 'reel-stop-c', 'reel-stop-d',
  'chime-a', 'chime-b', 'chime-c', 'ding', 'coin-ding',
  'win-bell', 'win-bell-short', 'coin-cascade', 'coin-cascade-long',
  'thump-a', 'thump-b', 'button-click', 'button-tick', 'button-tick-b', 'lever', 'rattle',
];

// label: what players see on the test page; gain: relative loudness of that moment.
export const ROLES = [
  { id: 'spin',       label: 'Reels spinning',              def: 'reel-spin-a',   gain: 0.55 },
  { id: 'reelStop',   label: 'Reel lands',                  def: 'reel-stop-a',   gain: 0.8 },
  { id: 'lineWin',    label: 'Winning line (rises each line)', def: 'chime-a',    gain: 0.6 },
  { id: 'coin',       label: 'Coins added',                 def: 'button-tick',   gain: 0.5 },
  { id: 'multi',      label: 'Regular adds Multi',          def: 'ding',          gain: 0.5 },
  { id: 'hold',       label: 'Hold / un-hold',              def: 'button-click',  gain: 0.7 },
  { id: 'nudge',      label: 'Nudge',                       def: 'button-tick',   gain: 0.8 },
  { id: 'bump',       label: 'Bump the machine',            def: 'thump-a',       gain: 0.9 },
  { id: 'tilt',       label: 'TILT!',                       def: 'synth',         gain: 0.8 },
  { id: 'bigWin',     label: 'Huge spin (on fire)',         def: 'coin-cascade',  gain: 0.6 },
  { id: 'roundClear', label: 'Round cleared',               def: 'win-bell-short', gain: 0.45 },
  { id: 'bossBeaten', label: 'Landlord beaten',             def: 'win-bell',      gain: 0.5 },
  { id: 'cash',       label: 'Buying at the Bar',           def: 'coin-ding',     gain: 0.6 },
  { id: 'blank',      label: 'Spin wins nothing',           def: 'synth',         gain: 0.6 },
  { id: 'lose',       label: 'Game over',                   def: 'synth',         gain: 0.6 },
  { id: 'slam',       label: 'Landlord arrives',            def: 'synth',         gain: 0.8 },
  { id: 'lever',      label: 'Pull to spin',                def: 'synth',         gain: 0.6 },
];
export const ROLE_BY_ID = Object.fromEntries(ROLES.map((r) => [r.id, r]));

const KEY = 'tilt.sfxmap.v1';
export function loadPicks() {
  try { return { ...(JSON.parse(localStorage.getItem(KEY)) || {}) }; } catch { return {}; }
}
export function savePicks(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {} }
export function clearPicks() { try { localStorage.removeItem(KEY); } catch {} }
