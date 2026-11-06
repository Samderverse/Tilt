# Tilt

A chaotic pub fruit machine roguelike by Samderverse. Spin, hold, nudge and survive the Landlords.

## How it plays
- Each **Pint** is three rounds: Half Pint, Full Pint, then a **Landlord** (boss) with a nasty rule.
- Score the target within 6 spins. Score = Coins × Multi.
  - 5 win lines: top, middle, bottom and both diagonals
  - 3 matching on a line: each symbol's Coins added up, and the line's Multi is the symbol's Multi
  - 2 matching from the left: 2 × symbol Coins
  - Every spin starts at ×3 Multi. Only the best line's Multi counts (extra lines add Coins), then Regulars add their bonuses
- **Hold** (3 per round): keep reels still on the next spin. A reel can't be held twice running.
- **Nudge** (2 per round): after a spin, move a reel up or down one symbol, then **Collect**.
- **Bump**: after a spin, jolt every reel up or down at random. Free, but each bump raises the round's **tilt** risk (10%, 30%, 50%...). Tilt and that spin scores nothing. Can also shake the phone (Settings).
- Earn £ each round: round reward + £1 per spare spin (max £3) + interest (£1 per £5 held, max £3).
- Beat Pint 8's Landlord to win the run, then keep everything and carry on in **Endless** mode (targets grow ×1.75 per Pint).

## Learning to play
- **How to Play**: a 7-page illustrated guide, on the title screen and in Settings.
- **Tutorial run**: starts a fresh run where the Barman coaches you through your first spins, the Bar and your first Landlord. Tips show once each; turn them back on any time in Settings ("Barman's tips").

## The Bar (between rounds)
Prices scale with power:

| Item | Price |
|---|---|
| Regulars | £5 Common, £7 Uncommon, £10 Rare (Legendaries only from Prawn Cocktail) |
| Beer Mats | £3, +£1 for each level that symbol already has |
| Scratchcards | Bin Bag £2, Lucky Dip £2, Photocopier £3, Gold Leaf £4, Wild Card £5 |
| Crisps | Ready Salted £4 (1 of 3 Beer Mats), Salt & Vinegar £5 (1 of 3 Scratchcards), Prawn Cocktail £7 (1 of 2 Regulars) |
| Restock | £2, then +£1 each time per visit |

- **Regulars** (up to 5): Tilt's jokers. They trigger left to right, so order matters. Tap one to sell or move it.
- **Landlord's Specials**: one big permanent upgrade offered per Pint.
  Extra Pocket (+1 Hold, £10), Loose Shoes (+1 Nudge, £12), Happy Hour (+1 Spin, £15),
  Bigger Bar (+1 item in stock, £8), Piggy Bank (interest cap +£2, £8), Lock-In (6th Regular slot, £16).

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
16 in total. Each run gets 4 from the early pool for Pints 1–4 and 4 from the late pool for Pints 5–8; endless brings in the rest.
- Early: The Bouncer, Health Inspector, Last Orders, The Quiz Master, Sticky Floors, Bolted Down, Running a Tab, Jammed Reel
- Late: Power Cut, The Taxman, Drunk Uncle, Half Measures, Darts Night, Smoke Machine, Members Only, Watered Down

## Starting machines
Unlocked by your best run. Each has its own look (scenery, cabinet, marquee sign, lights and lettering);
the reels and buttons stay identical, and Landlord rounds still turn everything red.

| Machine | Unlock | Look |
|---|---|---|
| 🍺 The Local | always | Burgundy wood, brass plate, warm pub glow |
| 🎡 Seaside Arcade | clear Pint 2 | Candy stripes, fairground bulbs, sunset over the sea, seagulls |
| 🎓 Student Union | clear Pint 4 | Navy cabinet covered in stickers, UV neon, gig posters |
| 🎱 Working Men's Club | clear Pint 6 | 70s wood veneer, mustard trim, swirly pub carpet |
| 🎩 High Roller | beat the pub | Art deco black and gold, green baize, falling sparkles |

## Extras
- **Album**: every Regular you've seen or recruited, and every Landlord you've faced or beaten.
- **Run summary**: your line-up and stats at the end of a run, with a Share button.
- **Game speed**: 1× / 2× / 4× in Settings.
- **Updates & offline**: players get a "new version" banner, and the game works offline once loaded.

## Publishing an update
Change the version number in **both** `js/version.js` and `version.json` (e.g. 1.5.0 → 1.5.1) every time you upload.
That's what makes the "new version available" banner appear for everyone.

## Testing shortcuts
- `?seed=ABC123` replays an exact run (seed shown under the SPIN button)
- `?round=3&boss=uncle` jumps straight to a Landlord
  (ids: bouncer, inspector, lastorders, powercut, taxman, uncle, quiz, sticky)
- `?money=50` starts with extra cash
- `?regs=jen,barman,darts` starts with those Regulars (ids in `js/regulars.js`)
- `?bar=1` opens the Bar straight away
- `?specials=lockin,piggy` starts with those Landlord's Specials
- `?machine=casino` starts on that machine; `?round=25` jumps into endless
- Desktop key B bumps
- `?taps=1` shows a dot wherever your phone registers a tap, and outlines the button it hit
- Desktop keys: Space spins/collects, 1–3 hold, Q/A W/S E/D nudge reels up/down

## Sound effects
- `audio/sfx/`: 23 clips cut from the slot machine sound effects file (by sonidosKMD), trimmed, faded and levelled.
- `js/sfxmap.js`: which clip plays for each game moment (★ = suggested default). Set a moment to `'synth'` to use the built-in beep.
- **Sound test** (Settings → 🔊 Sound test, or `?sounds=1`): hear each moment, swap clips from a dropdown, then "Copy my picks"
  to send the choices back. Picks are saved in that browser and used in-game straight away.

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
- `js/machines.js`: starting machines
- `js/scenery.js`: machine scenery, cabinet decorations and picker previews
- `js/sfxmap.js`, `js/soundtest.js`: sound effect mapping and the Sound test page
- `js/album.js`: the Album
- `js/version.js`, `version.json`, `sw.js`: update notice and offline play
- `icons/`, `manifest.json`: app icon and home-screen install

## Roadmap
- Drop A: holds, nudges, Pints, Landlords, effects, audio, icon ✅
- Drop B: The Bar (shop), Regulars, Beer Mats, Scratchcards, crisp packets ✅
- Rebalance: 5 lines, ×3 base Multi, best-line Multi, 6 spins ✅
- Drop C: art & identity pass, How to Play, tutorial ✅
- Economy rework, Landlord's Specials ✅
- Drop D: endless, bump & tilt, 8 Landlords, 6 Regulars, machines, album, speed, updates ✅
- v1.6: machine themes ✅
