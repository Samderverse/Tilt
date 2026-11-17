// What's new, shown once to each player when they open a newer version.
// Newest first. Keep the lines short and written for players, not for the repo.

export const CHANGELOG = [
  {
    version: '2.1.0',
    title: 'Better crisps & Cash Out',
    notes: [
      '🦐 <b>Fixed the Regular odds.</b> Rares were turning up 3% of the time instead of 8%, in the Bar and in crisps. Thanks Luke for spotting it!',
      '🦐 Prawn Cocktail is now proper premium: no Commons, a good chance of a Rare, and a shot at a Legendary.',
      '😠 In Endless, the Bouncer lets one diagonal in, so he no longer guts builds that rely on winning lines.',
      '💷 <b>Cash Out.</b> In Endless, hold £100 and you can bank your pot from the Bar. Your best cash-out goes on the title screen.',
    ],
  },
  {
    version: '2.0.0',
    title: 'Stakes',
    notes: [
      '🍺 <b>Stakes.</b> Beaten the pub? Pick a higher stake from the machine picker. Each one adds a permanent rule: Session (spare spins pay nothing), Bitter (dearer Bar), Best (4 Regular slots), Strong (targets ×1.2), Export (5 spins). Beat the pub on a stake to unlock the next.',
      '😠 The Landlord you\'re building up to now stays in view at the top of the Bar, rule and all.',
      '🧑‍🤝‍🧑 Drag your Regulars along the row to reorder them. Tapping still opens their card.',
      '🛒 A Regular\'s shop card now shows your current line-up underneath.',
      '🎯 The target box says how much you need per spin while you\'re short.',
      '⏸ The hold button reads WAIT (not COOL) on a reel you held last spin.',
      '📰 This screen: what\'s new, once per update. It\'s in Settings too.',
    ],
  },
  {
    version: '1.10.0',
    title: 'Long-Haul Luke',
    notes: [
      '🦐 Prawn Cocktail with a full machine lets you swap a Regular out instead of losing the pick.',
      '🧳 New Rare: Long-Haul Luke, +2 Multi for every Landlord beaten this run.',
      '▶ SKIP button while a spin is scoring.',
      '🐞 "Copy bug report" in Settings.',
      '📚 The Album keeps a win/loss record per Landlord and marks your nemesis.',
      '🔊 Eleven new sounds: crisps, scratchcards, cheers, the till, the bell, a jackpot and more.',
    ],
  },
];

export const LATEST = CHANGELOG[0];
