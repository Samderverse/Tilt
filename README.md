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

## Learning to play
- **How to Play**: a 7-page illustrated guide, on the title screen and in Settings.
- **Tutorial run**: starts a fresh run where the Barman coaches you through your first spins, the Bar and your first Landlord. Tips show once each; turn them back on any time in Settings ("Barman's tips").

## The Bar (between rounds)
- **Regulars** (up to 5): Tilt's jokers. They trigger left to right, so order matters. Tap one to sell or move it.
  28 so far, across Common, Uncommon, Rare and Legendary (Legendaries only come in Prawn Cocktail crisps).
- **Beer Mats**: level up a symbol (+5 Coins, +1 Mult per level).
- **Scratchcards**: edit your reels. Gold Leaf (double Coins), Photocopier, Bin Bag, Wild Card, Lucky Dip.
- **Crisps**: Ready Salted (pick 1 of 3 Beer Mats), Salt & Vinegar (1 of 3 Scratchcards), Prawn Cocktail (1 of 2 Regulars).
- **Restock** rerolls the stock: £1, going up £1 each time per visit.

## Install on your phone
Open the GitHub Pages link, then:

**iPhone (Safari, iOS 26)**
1. Tap the **⋯ / three lines** button at the left of the address bar.
2. Tap **Share**.
3. Tap **View More**.
4. Tap **Add to Home Screen**.
5. Leave **Open as Web App** switched on, then tap **Add**.
6. Open Tilt from the home screen for full screen.
- On older iOS versions the Share button sits in the toolbar instead: Share → Add to Home Screen → Add.
- If there's no sound, check the silent switch and media volume.
- Vibration isn't supported on iPhone web apps.

**Android (Chrome)**
1. Tap the **⋮** menu (top right).
2. Tap **Add to home screen** (some versions call it **Install app**).
3. If asked to choose, pick **Install** (not "Create shortcut"), then confirm with **Install** / **Add**.
4. Open Tilt from the home screen or app drawer for full screen.
- Chrome sometimes offers an "Install app" banner at the bottom of the page; that does the same thing.
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
- `?taps=1` shows a dot wherever your phone registers a tap, and outlines the button it hit
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
- `js/art.js`: Regular cards, Beer Mat coasters, scratchcards, crisp packets (all CSS/SVG)
- `js/howto.js`: How to Play guide
- `js/coach.js`: tutorial tips
- `js/audio.js`: music/ambience/sfx mixer
- `js/fx.js`: particles, flashes, shakes, glitches
- `js/settings.js`: settings and credits
- `icons/`, `manifest.json`: app icon and home-screen install

## Roadmap
- Drop A: holds, nudges, Pints, Landlords, effects, audio, icon ✅
- Drop B: The Bar (shop), Regulars, Beer Mats, Scratchcards, crisp packets ✅
- Rebalance: 5 lines, ×3 base Mult, best-line Mult, 6 spins ✅
- Drop C: art & identity pass, How to Play, tutorial ✅
