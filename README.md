# Tilt

A chaotic pub fruit machine roguelike by Samderverse. Spin, hold, nudge and survive the Landlords.

## How it plays
- Each **Pint** is three rounds: Half Pint, Full Pint, then a **Landlord** (boss) with a nasty rule.
- Score the target within 6 spins. Score = Coins × Mult.
  - 5 win lines: top, middle, bottom and both diagonals
  - 3 matching on a line: each symbol's Coins added up, and the line's Mult is the symbol's Mult
  - 2 matching from the left: 2 × symbol Coins
  - Every spin starts at ×3 Mult. Only the best line's Mult counts (extra lines add Coins), then Regulars add their bonuses
- **Hold** (3 per round): keep reels still on the next spin. A reel can't be held twice running.
- **Nudge** (2 per round): after a spin, move a reel up or down one symbol, then **Collect**.
- Earn £ each round: round reward + £1 per spare spin + interest (£1 per £5 held, max £5).
- Beat Pint 8's Landlord to win the run.

## The Bar (between rounds)
- **Regulars** (up to 5): Tilt's jokers. They trigger left to right, so order matters. Tap one to sell or move it.
  28 so far, across Common, Uncommon, Rare and Legendary (Legendaries only come in Prawn Cocktail crisps).
- **Beer Mats**: level up a symbol (+5 Coins, +1 Mult per level).
- **Scratchcards**: edit your reels. Gold Leaf (double Coins), Photocopier, Bin Bag, Wild Card, Lucky Dip.
- **Crisps**: Ready Salted (pick 1 of 3 Beer Mats), Salt & Vinegar (1 of 3 Scratchcards), Prawn Cocktail (1 of 2 Regulars).
- **Restock** rerolls the stock: £1, going up £1 each time per visit.

## Install on your phone
Open the GitHub Pages link, then:

**iPhone (Safari)**
1. Tap the Share button.
2. Tap **Add to Home Screen**, then **Add**.
3. Open Tilt from the home screen for full screen.
- If there's no sound, check the silent switch and media volume.
- Vibration isn't supported on iPhone web apps.

**Android (Chrome)**
1. Tap the ⋮ menu.
2. Tap **Install app** (or **Add to Home screen** on older versions).
3. Open Tilt from the home screen or app drawer for full screen.
- Vibration works on Android, and can be turned off in Settings (⚙).

**Updating the icon:** phones cache home-screen icons. After an icon change, remove Tilt from the home screen and add it again.

**Seeing the latest version:** GitHub Pages can take a minute or two to update after a push. If the old version still shows, close the app fully and reopen it.

## Landlords
The Bouncer, Health Inspector, Last Orders, Power Cut, The Taxman, Drunk Uncle, The Quiz Master, Sticky Floors.

## Testing shortcuts
- `?seed=ABC123` replays an exact run (seed shown under the SPIN button)
- `?round=3&boss=uncle` jumps straight to a Landlord
  (ids: bouncer, inspector, lastorders, powercut, taxman, uncle, quiz, sticky)
- `?money=50` starts with extra cash
- `?regs=jen,barman,darts` starts with those Regulars (ids in `js/regulars.js`)
- `?bar=1` opens the Bar straight away
- Desktop keys: Space spins/collects, 1–3 hold, Q/A W/S E/D nudge reels up/down

## Audio
- `audio/main.mp3`, `audio/boss.mp3`: levelled to the same loudness, trimmed for looping
- `audio/ambience.mp3`: crossfaded into a seamless 18s loop, set well under the music
- Volumes are in Settings (⚙). Add track credits in `js/settings.js`.

## Files
- `js/game.js`: rules, rounds, money, scoring pipeline (no DOM, so it can be simulated)
- `js/regulars.js`: every Regular and the hook engine
- `js/shop.js`: the Bar, Beer Mats, Scratchcards, crisp packets
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
- Drop B: The Bar (shop), Regulars, Beer Mats, Scratchcards, crisp packets ✅
- Drop C: more polish, run summary extras, balance pass
