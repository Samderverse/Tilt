// Audio engine: three buses (music, ambience, sfx) through Web Audio.
// Web Audio gives gapless loops, crossfades, ducking and a low-pass "muffle".
// iOS only allows audio after a tap, so call unlock() from a tap handler.

import { CLIPS, ROLE_BY_ID, loadPicks } from './sfxmap.js';

const TRACKS = {
  main: 'audio/main.mp3',
  boss: 'audio/boss.mp3',
  ambience: 'audio/ambience.mp3',
};

let ctx = null;
let master, musicBus, musicFilter, musicDuck, ambBus, ambBoss, sfxBus;
const raw = {};       // fetched ArrayBuffers (before the context exists)
const buffers = {};   // decoded AudioBuffers
let current = null;   // { name, src, gain }
let ambSrc = null;
let wantedTrack = null;
let noiseBuf = null;
let vols = { music: 0.6, ambience: 0.3, sfx: 0.8 };
const clipRaw = {};    // fetched sound-effect clips
const clipBuf = {};    // decoded clips
let picks = loadPicks();
let spinSrc = null;

// Start downloading straight away so music is ready by the first tap.
export function preload() {
  for (const [name, url] of Object.entries(TRACKS)) {
    raw[name] = fetch(url).then((r) => (r.ok ? r.arrayBuffer() : null)).catch(() => null);
  }
  for (const name of CLIPS) {
    clipRaw[name] = fetch(`audio/sfx/${name}.mp3`).then((r) => (r.ok ? r.arrayBuffer() : null)).catch(() => null);
  }
}

async function decodeClips() {
  for (const name of CLIPS) {
    try {
      const ab = await clipRaw[name];
      if (ab) clipBuf[name] = await decode(ab);
    } catch (e) { console.warn('SFX decode failed', name); }
  }
}

export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    // Safari 16.4+: play even with the silent switch on, like a game should.
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch {}
    ctx = new AC();
    master = ctx.createGain();
    master.connect(ctx.destination);

    musicFilter = ctx.createBiquadFilter();
    musicFilter.type = 'lowpass';
    musicFilter.frequency.value = 20000;
    musicFilter.Q.value = 0.7;
    musicDuck = ctx.createGain();
    musicBus = ctx.createGain();
    musicFilter.connect(musicDuck).connect(musicBus).connect(master);

    ambBoss = ctx.createGain();
    ambBus = ctx.createGain();
    ambBoss.connect(ambBus).connect(master);

    sfxBus = ctx.createGain();
    sfxBus.connect(master);

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    applyVolumes();
    decodeClips();
    decodeAll();

    // Pause everything when the app goes to the background.
    document.addEventListener('visibilitychange', () => {
      if (!ctx) return;
      if (document.hidden) ctx.suspend(); else ctx.resume();
    });
  }
  if (ctx.state === 'suspended' && !document.hidden) ctx.resume();
}

async function decodeAll() {
  for (const name of Object.keys(TRACKS)) {
    try {
      const ab = await raw[name];
      if (!ab) continue;
      buffers[name] = await decode(ab);
      if (name === 'ambience') startAmbience();
      if (name === wantedTrack && (!current || current.name !== name)) playMusic(name);
    } catch (e) { console.warn('Audio decode failed', name, e); }
  }
}

function decode(ab) {
  return new Promise((resolve, reject) => {
    const p = ctx.decodeAudioData(ab, resolve, reject);
    if (p && p.then) p.then(resolve, reject);
  });
}

// Find where the sound actually starts and ends, so loops don't hiccup on
// the tiny silence MP3 encoders add.
function loopPoints(buf) {
  const d = buf.getChannelData(0);
  const th = 0.0008;
  let s = 0, e = d.length - 1;
  while (s < d.length && Math.abs(d[s]) < th) s++;
  while (e > s && Math.abs(d[e]) < th) e--;
  return [s / buf.sampleRate, e / buf.sampleRate];
}

function loopSource(buf, dest) {
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const [a, b] = loopPoints(buf);
  src.loopStart = a;
  src.loopEnd = b;
  src.connect(dest);
  src.start(0, a);
  return src;
}

function ramp(param, value, secs) {
  const t = ctx.currentTime;
  param.cancelScheduledValues(t);
  param.setValueAtTime(param.value, t);
  param.linearRampToValueAtTime(value, t + secs);
}

export function playMusic(name, fade = 1.6) {
  wantedTrack = name;
  if (!ctx || !buffers[name]) return;
  if (current && current.name === name) return;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(musicFilter);
  const src = loopSource(buffers[name], gain);
  ramp(gain.gain, 1, fade);
  if (current) {
    const old = current;
    ramp(old.gain.gain, 0, fade);
    setTimeout(() => { try { old.src.stop(); } catch {} old.gain.disconnect(); }, fade * 1000 + 100);
  }
  current = { name, src, gain };
}

function startAmbience() {
  if (ambSrc || !buffers.ambience) return;
  ambSrc = loopSource(buffers.ambience, ambBoss);
}

// Muffled = like the music is playing in the other room.
export function setMuffled(on) {
  if (!ctx) return;
  const f = musicFilter.frequency;
  const t = ctx.currentTime;
  f.cancelScheduledValues(t);
  f.setValueAtTime(f.value, t);
  f.exponentialRampToValueAtTime(on ? 650 : 20000, t + 0.6);
  ramp(ambBoss.gain, bossOn ? 0.25 : on ? 1.5 : 1, 0.6);
}

let bossOn = false;
export function setBossMode(on) {
  bossOn = on;
  playMusic(on ? 'boss' : 'main', on ? 0.8 : 2);
  if (ctx) ramp(ambBoss.gain, on ? 0.25 : 1, 1.2);
}

// Dip the music briefly so a jingle can cut through.
export function duck(amount = 0.35, secs = 1.2) {
  if (!ctx) return;
  const g = musicDuck.gain;
  const t = ctx.currentTime;
  g.cancelScheduledValues(t);
  g.setValueAtTime(g.value, t);
  g.linearRampToValueAtTime(amount, t + 0.08);
  g.linearRampToValueAtTime(1, t + secs);
}

export function setVolumes(v) {
  vols = { ...vols, ...v };
  applyVolumes();
}

function applyVolumes() {
  if (!ctx) return;
  // Squared for a more natural-feeling slider.
  musicBus.gain.value = vols.music * vols.music;
  ambBus.gain.value = vols.ambience * vols.ambience;
  sfxBus.gain.value = vols.sfx * vols.sfx;
}

// ---------- Synth sound effects ----------
function tone(freq, dur = 0.08, type = 'square', vol = 0.06, delay = 0, slideTo = null) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(sfxBus);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(dur = 0.2, vol = 0.1, freq = 1200, delay = 0, type = 'bandpass') {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const filt = ctx.createBiquadFilter();
  filt.type = type;
  filt.frequency.value = freq;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filt).connect(gain).connect(sfxBus);
  src.start(t);
  src.stop(t + dur + 0.02);
}

const synth = {
  spin()      { noise(0.35, 0.05, 600, 0, 'lowpass'); tone(160, 0.15, 'sawtooth', 0.03, 0, 90); },
  tick()      { tone(1100, 0.02, 'square', 0.015); },
  stop(i)     { tone(140 + i * 40, 0.09, 'triangle', 0.18); noise(0.05, 0.06, 2500); },
  hold()      { tone(300, 0.06, 'square', 0.07); tone(200, 0.08, 'square', 0.06, 0.05); },
  unhold()    { tone(200, 0.06, 'square', 0.05); },
  nudge()     { tone(500, 0.04, 'square', 0.06); noise(0.04, 0.05, 3000); },
  denied()    { tone(150, 0.12, 'sawtooth', 0.05); },
  win(step)   { tone(523 * Math.pow(1.122, step), 0.14, 'square', 0.06); },
  coin()      { tone(1500, 0.05, 'square', 0.03); tone(2100, 0.08, 'square', 0.025, 0.04); },
  mult()      { tone(660, 0.1, 'sawtooth', 0.05); tone(990, 0.12, 'sawtooth', 0.045, 0.06); },
  blank()     { tone(130, 0.25, 'triangle', 0.1, 0, 90); },
  blocked()   { tone(220, 0.08, 'sawtooth', 0.05); tone(180, 0.12, 'sawtooth', 0.05, 0.08); },
  fire()      { noise(0.8, 0.08, 900, 0, 'lowpass'); tone(200, 0.6, 'sawtooth', 0.04, 0, 600); },
  clear()     { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, 'square', 0.06, i * 0.09)); },
  lose()      { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.25, 'triangle', 0.1, i * 0.17)); },
  slam()      { tone(70, 0.6, 'sine', 0.5, 0, 35); noise(0.4, 0.25, 180, 0, 'lowpass'); },
  shatter()   { noise(0.5, 0.25, 4000); noise(0.7, 0.15, 1800, 0.05); tone(1800, 0.3, 'triangle', 0.05, 0, 600); },
  swap()      { noise(0.3, 0.12, 400, 0, 'lowpass'); tone(90, 0.3, 'sine', 0.3); },
  wrong()     { tone(110, 0.5, 'square', 0.08); tone(104, 0.5, 'square', 0.08); },
  cash()      { [1, 2, 3].forEach((n) => tone(1300 + n * 150, 0.06, 'square', 0.03, n * 0.06)); },
};

let vibrate = true;
export function setVibration(on) { vibrate = on; }
export function buzz(pattern) {
  if (vibrate && navigator.vibrate) navigator.vibrate(pattern);
}

// ---------- Sampled sound effects, with the synth as a fallback ----------
function playClip(name, { rate = 1, gain = 1, delay = 0 } = {}) {
  const buf = clipBuf[name];
  if (!ctx || !buf) return null;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(g).connect(sfxBus);
  src.start(ctx.currentTime + delay);
  src._gain = g;
  return src;
}

const clipFor = (roleId) => picks[roleId] ?? ROLE_BY_ID[roleId]?.def ?? 'synth';

// Play whatever is picked for a moment; fall back to the synth if it's 'synth' or not loaded yet.
function role(roleId, fallback, opts = {}) {
  const clip = clipFor(roleId);
  const gain = (ROLE_BY_ID[roleId]?.gain ?? 1) * (opts.gain ?? 1);
  if (clip !== 'synth') {
    const src = playClip(clip, { ...opts, gain });
    if (src) return src;
  }
  if (fallback) fallback();
  return null;
}

export function reloadPicks() { picks = loadPicks(); }

// What each moment sounds like with the synth, for the Sound test page.
const SYNTH_FOR = {
  spin: () => synth.spin(), reelStop: () => synth.stop(0), lineWin: () => [0, 1, 2].forEach((s) => setTimeout(() => synth.win(s), s * 260)),
  coin: () => synth.coin(), multi: () => synth.mult(), hold: () => synth.hold(), nudge: () => synth.nudge(), bump: () => synth.swap(),
  tilt: () => synth.wrong(), bigWin: () => synth.fire(), roundClear: () => synth.clear(), bossBeaten: () => synth.shatter(),
  cash: () => synth.cash(), blank: () => synth.blank(), lose: () => synth.lose(), slam: () => synth.slam(), lever: () => {},
};

// Sound test: hear a moment with a given clip (or the synth).
export function preview(roleId, clip) {
  unlock();
  const gain = ROLE_BY_ID[roleId]?.gain ?? 1;
  if (clip === 'synth') { SYNTH_FOR[roleId]?.(); return; }
  if (roleId === 'lineWin') { [0, 1, 2].forEach((s) => playClip(clip, { gain, rate: Math.pow(1.122, s), delay: s * 0.26 })); return; }
  if (roleId === 'reelStop') { [0, 1, 2].forEach((s) => playClip(clip, { gain, rate: [1, 0.96, 0.92][s], delay: s * 0.25 })); return; }
  playClip(clip, { gain });
}

export function clipsReady() { return Object.keys(clipBuf).length; }

export const sfx = {
  spin() {
    role('lever', null);
    if (spinSrc) { try { spinSrc.stop(); } catch {} }
    spinSrc = role('spin', synth.spin);
  },
  // Fade the spinning sound out once the last reel has landed.
  spinEnd() {
    if (!spinSrc || !ctx) return;
    const s = spinSrc; spinSrc = null;
    const g = s._gain.gain;
    g.setValueAtTime(g.value, ctx.currentTime);
    g.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
    try { s.stop(ctx.currentTime + 0.15); } catch {}
  },
  tick: () => synth.tick(),
  stop: (i) => role('reelStop', () => synth.stop(i), { rate: [1, 0.96, 0.92][i] || 1 }),
  hold: () => role('hold', synth.hold),
  unhold: () => role('hold', synth.unhold, { rate: 0.9 }),
  nudge: () => role('nudge', synth.nudge),
  denied: () => synth.denied(),
  win: (step) => role('lineWin', () => synth.win(step), { rate: Math.pow(1.122, Math.min(step, 6)) }),
  coin: () => role('coin', synth.coin),
  mult: () => role('multi', synth.mult),
  blank: () => role('blank', synth.blank),
  blocked: () => synth.blocked(),
  fire: () => role('bigWin', synth.fire),
  clear: () => role('roundClear', synth.clear),
  lose: () => role('lose', synth.lose),
  slam: () => role('slam', synth.slam),
  shatter() { synth.shatter(); role('bossBeaten', null); },
  swap: () => synth.swap(),
  bump: () => role('bump', synth.swap),
  tilt: () => role('tilt', synth.wrong),
  wrong: () => synth.wrong(),
  cash: () => role('cash', synth.cash),
};
