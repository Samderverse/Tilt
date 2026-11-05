// Tiny Web Audio sound effects. No files needed.
// iOS only allows audio after a tap, so call unlock() from the start button.

let ctx = null;

export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

function tone(freq, dur = 0.08, type = 'square', vol = 0.06, delay = 0) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export const sfx = {
  spin()      { tone(180, 0.12, 'sawtooth', 0.04); },
  tick()      { tone(900, 0.02, 'square', 0.02); },
  stop(i)     { tone(220 + i * 60, 0.07, 'triangle', 0.1); },
  win(step)   { tone(440 * Math.pow(1.122, step), 0.12, 'square', 0.06); },
  mult()      { tone(660, 0.09, 'sawtooth', 0.05); tone(990, 0.09, 'sawtooth', 0.04, 0.05); },
  blank()     { tone(110, 0.2, 'triangle', 0.08); },
  clear()     { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.15, 'square', 0.06, i * 0.09)); },
  lose()      { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.22, 'triangle', 0.09, i * 0.16)); },
};

export function buzz(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}
