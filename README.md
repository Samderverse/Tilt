# Tilt

A chaotic pub fruit machine roguelike. Phase 1: the slot core.

## Play
Spin the reels, hit the round target within 5 spins, and the target climbs each round.

- 3 matching on a line: 3 × symbol coins, plus the symbol's mult
- 2 matching from the left: 1 × symbol coins
- Score = Coins × Mult

## Testing tips
- `?seed=ABC123` replays an exact run (the seed shows under the SPIN button)
- Space bar spins on desktop
- Runs save automatically, so closing the tab mid-run is fine

## Files
- `js/rng.js`: seeded random numbers
- `js/symbols.js`: symbol values and starting reel strips
- `js/reels.js`: reel strips and spinning
- `js/scoring.js`: win lines and scoring
- `js/audio.js`: sound effects and vibration
- `js/main.js`: game flow and animation

## Roadmap
1. Slot core ✅
2. Holds and nudges
3. Regulars (modifiers) and the hook engine
4. The Bar (shop)
5. Landlord's Rules (bosses) and the feature board
6. Juice
7. Balance and content
