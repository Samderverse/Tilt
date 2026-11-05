# Tilt

A chaotic pub fruit machine roguelike. Spin, hold, nudge and survive the Landlords.

## How it plays
- Each **Pint** is three rounds: Half Pint, Full Pint, then a **Landlord** (boss) with a nasty rule.
- Score the target within your spins. Score = Coins × Mult.
  - 3 matching on a line: 3 × symbol coins, plus the symbol's mult
  - 2 matching from the left: 1 × symbol coins
- **Hold** (3 per round): keep reels still on the next spin. A reel can't be held twice running.
- **Nudge** (2 per round): after a spin, move a reel up or down one symbol, then **Collect**.
- Earn £ each round: round reward + £1 per spare spin + interest (£1 per £5 held, max £5).
- Beat Pint 8's Landlord to win the run.

## Landlords
The Bouncer, Health Inspector, Last Orders, Power Cut, The Taxman, Drunk Uncle, The Quiz Master, Sticky Floors.

## Testing shortcuts
- `?seed=ABC123` replays an exact run (seed shown under the SPIN button)
- `?round=3&boss=uncle` jumps straight to a Landlord
  (ids: bouncer, inspector, lastorders, powercut, taxman, uncle, quiz, sticky)
- `?money=50` starts with extra cash
- Desktop keys: Space spins/collects, 1–3 hold, Q/A W/S E/D nudge reels up/down

## Audio
- `audio/main.mp3`, `audio/boss.mp3`: levelled to the same loudness, trimmed for looping
- `audio/ambience.mp3`: crossfaded into a seamless 18s loop, set well under the music
- Volumes are in Settings (⚙). Add track credits in `js/settings.js`.

## Files
- `js/game.js`: rules, rounds, money (no DOM, so it can be simulated)
- `js/bosses.js`: Landlord definitions
- `js/scoring.js`: win lines and scoring
- `js/reels.js`, `js/symbols.js`, `js/rng.js`: reels, symbols, seeded randomness
- `js/main.js`: UI flow and animation
- `js/audio.js`: music/ambience/sfx mixer
- `js/fx.js`: particles, flashes, shakes, glitches
- `js/settings.js`: settings and credits
- `icons/`, `manifest.json`: app icon and home-screen install

## Roadmap
- Drop A: holds, nudges, Pints, Landlords, effects, audio, icon ✅
- Drop B: The Bar (shop), Regulars, Beer Mats, Scratchcards, crisp packets
- Drop C: more polish, run summary extras, balance pass
