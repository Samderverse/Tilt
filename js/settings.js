// Player settings, saved separately from the run.

const KEY = 'tilt.settings.v1';

export const DEFAULTS = {
  music: 0.6,
  ambience: 0.3,   // deliberately well under the music: audible, never in the way
  sfx: 0.8,
  reducedFx: false,
  vibration: true,
  speed: 1,        // scoring animation speed: 1, 2 or 4
  shake: false,    // shake the phone to bump
};

export function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    return { ...DEFAULTS, ...(s || {}) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

// Fill these in with where each track came from.
export const CREDITS = [
  { what: 'Main track', who: 'Add artist / source here' },
  { what: 'Boss track', who: 'Add artist / source here' },
  { what: 'Pub ambience', who: 'Add artist / source here' },
];
