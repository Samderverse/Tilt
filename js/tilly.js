// Tilly: the face of Tilt. A smug pint who hosts the title screen, propers up the Bar,
// reacts to the big moments and takes over the tutorial tips from the Barman.
// Presentation only: nothing here touches scoring, randomness or the run.

export const EXPRESSIONS = ['smug', 'blink', 'talk', 'point', 'nervous', 'tilt', 'defeated', 'jackpot'];
const SRC = (e) => `img/tilly/${e}.webp`;
const HEAD = (e) => `img/tilly/head-${e}.webp`;

// 'full': everything. 'quiet': big moments only (overlays, TILT, the Bar on arrival). 'off': hidden, except in the tutorial tips.
let mode = 'full';
export const setMode = (m) => { mode = m || 'full'; };
export const getMode = () => mode;
export const chatty = () => mode === 'full';
export const present = () => mode !== 'off';

// Load and unpack every sprite up front, and keep them in memory, so a reaction never appears as an empty gap.
const kept = [];
export function preload() {
  for (const e of EXPRESSIONS) {
    for (const url of [SRC(e), HEAD(e)]) {
      const im = new Image();
      im.src = url;
      if (im.decode) im.decode().catch(() => {});
      kept.push(im);
    }
  }
}

// ---------- Speaking ----------
// Text types out with a soft blip, and Smug flaps between its grin and closed-mouth frame while it does.
let blip = () => {};
let instant = false;
export const setBlip = (fn) => { blip = fn || (() => {}); };
export const setInstant = (on) => { instant = !!on; };
const escT = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Wait for an <img> to be ready (or give up after a moment) so the bubble never beats Tilly on screen.
function whenLoaded(im) {
  if (!im || (im.complete && im.naturalWidth)) return Promise.resolve();
  return new Promise((res) => {
    const done = () => { im.removeEventListener('load', done); im.removeEventListener('error', done); res(); };
    im.addEventListener('load', done); im.addEventListener('error', done);
    setTimeout(done, 1500);
  });
}

// Replay a CSS entrance/expression animation on an element.
export function animate(el, expr) {
  if (!el) return;
  el.classList.remove('tx-in', ...EXPRESSIONS.map((e) => `tx-${e}`));
  void el.offsetWidth;
  el.classList.add('tx-in', `tx-${expr}`);
}

const typing = new WeakMap();
// bubble: the speech element. im: Tilly's <img> (optional). Returns when the line has finished.
export async function speak(bubble, text, im = null, expr = 'smug') {
  if (!bubble) return;
  const prev = typing.get(bubble);
  if (prev) prev.cancel = true;
  const job = { cancel: false };
  typing.set(bubble, job);
  const box = bubble.parentElement;
  box?.classList.add('tilly-waiting');
  bubble.innerHTML = `<span class="typed"></span><span class="untyped">${escT(text)}</span>`;
  await whenLoaded(im);
  if (job.cancel) return;
  box?.classList.remove('tilly-waiting');
  bubble.classList.remove('pop'); void bubble.offsetWidth; bubble.classList.add('pop');
  const typed = bubble.querySelector('.typed'), untyped = bubble.querySelector('.untyped');
  if (instant || !text) { typed.textContent = text; untyped.textContent = ''; return; }
  const talks = im && expr === 'smug';
  if (im) im.dataset.talking = '1';
  await new Promise((r) => setTimeout(r, 180)); // let the bubble pop first
  let i = 0, frame = 0;
  while (i < text.length && !job.cancel) {
    const step = /[.,!?…]/.test(text[i]) ? 1 : 2;
    i = Math.min(text.length, i + step);
    typed.textContent = text.slice(0, i);
    untyped.textContent = text.slice(i);
    if (/[a-z0-9]/i.test(text[i - 1]) && i % 4 < 2) blip();
    if (talks) im.src = SRC(++frame % 2 ? 'talk' : 'smug');
    await new Promise((r) => setTimeout(r, /[.!?…]/.test(text[i - 1]) ? 160 : 45));
  }
  if (im) { delete im.dataset.talking; if (talks) im.src = SRC('smug'); }
  if (job.cancel) return;
  typed.textContent = text; untyped.textContent = '';
}

export const img = (expr, cls = '') => `<img class="tilly ${cls}" src="${SRC(expr)}" alt="Tilly" draggable="false">`;
export const head = (expr, cls = '') => `<img class="tilly-head ${cls}" src="${HEAD(expr)}" alt="" draggable="false">`;
export const src = SRC;
export const headSrc = HEAD;

// "Tilly says…" box used inside overlays.
export function aside(expr, line) {
  if (!present() || !line) return '';
  return `<div class="tilly-aside tilly-waiting" data-expr="${expr}">${img(expr, 'tilly-aside-img')}<p class="tilly-says" data-line="${escT(line)}">${escT(line)}</p></div>`;
}

// Bring any asides inside an element to life: Tilly bounces in, then the line types out.
export function liven(root) {
  if (!root) return;
  root.querySelectorAll('.tilly-aside').forEach((a) => {
    const im = a.querySelector('img'), b = a.querySelector('.tilly-says');
    const expr = a.dataset.expr || 'smug';
    animate(im, expr);
    speak(b, b.dataset.line || b.textContent, im, expr);
  });
}

// ---------- Lines ----------
// Each pool remembers what it said recently so it doesn't repeat itself.
export const LINES = {
  title: [
    'Go on then. One more won\'t hurt.',
    'Fancy your chances, do you?',
    'Same machine. Same mistakes.',
    'I\'m not saying it\'s rigged. I\'m just not saying it isn\'t.',
    'Pull up a stool. Mind the sticky bit.',
    'Back again? I\'ll get the usual in.',
    'It\'s always five to last orders somewhere.',
  ],
  runStart: ['Let\'s see how long you last.', 'Fresh pint, fresh start.', 'Right. Don\'t embarrass me.', 'Coin in. No regrets.'],
  bigSpin: ['Now we\'re talking!', 'Get in!', 'That\'s going on the pub wall.', 'Ring the bell!', 'Somebody call the papers.', 'Oh, you beauty.'],
  blank: [
    'I\'ve seen better in the drip tray.',
    'Nothing. Classic.',
    'The machine laughs at you.',
    'Not even a cherry.',
    'Have you tried hitting it?',
    'Blank. Lovely.',
    'Your pint\'s getting warm.',
    'Someone at the bar sniggers.',
  ],
  nudgeWin: ['Knew you had it in you.', 'Tickled it. Lovely.', 'Gentle hands. I like it.'],
  riskyBump: ['You sure about that?', 'Easy… easy…', 'Don\'t you dare.'],
  bumpSaved: ['Never in doubt!', 'Kept your nerve. Respect.', 'Lucky. Very lucky.'],
  tilt: ['OH, YOU\'VE DONE IT NOW!', 'NOT THE MACHINE!', 'WHAT DID I SAY?!'],
  cleared: ['Same again?', 'Lovely stuff.', 'Easy. Well, easy-ish.', 'Bar\'s this way.', 'Get the next one in.'],
  bossBeaten: ['Stick that on the tab!', 'And don\'t come back!', 'Who\'s laughing now, eh?', 'Barred! Ha!'],
  failed: ['Well, that went well.', 'Happens to the best of us. Mostly you, though.', 'I\'ll put the kettle on.', 'The machine sends its regards.'],
  won: ['Drinks are on you!', 'Legend. Absolute legend.', 'They\'ll be talking about this one for years.'],
  cashOut: ['Quitting while you\'re ahead? Who ARE you?', 'Pocket it before you change your mind.', 'Sensible. Disgustingly sensible.'],
  barHello: ['What are we having?', 'Spend it before the Taxman does.', 'Nothing in here\'s a bad idea. Probably.', 'Treat yourself. You\'ve earned it. Ish.'],
  buyRegular: ['Oh, I know that one. Trouble.', 'Good shout. They\'re a laugh.', 'Make room, make room.', 'Another one for the round.'],
  buyCrisps: ['Balanced diet, that.', 'Crisps. A meal in a bag.', 'Shake it first. Trust me.'],
  buyScratch: ['Go on. What\'s the worst that could happen?', 'Scratch it with a coin. Not your teeth.', 'Feeling lucky?'],
  buyMat: ['Coasters. Thrilling.', 'That\'ll level up nicely.', 'Every pint needs a mat.'],
  buySpecial: ['Ooh, fancy.', 'Look at you, splashing out.'],
  sell: ['Harsh. They\'ll get over it.', 'Cold. I respect it.', 'And they were just getting comfy.'],
  restock: ['Ding ding. Let\'s see what turns up.', 'Bell rung. New stock.'],
  broke: ['Bit short, are we?', 'Your card\'s been declined. By me.', 'Put it on the tab? No.'],
  leaveBar: ['Right then. Back to making bad decisions.', 'Off you pop.', 'Go on. Make me proud.'],
  stage: [
    'Looking sharp tonight.',
    'Is it warm in here or is it me?',
    'Is the floor moving, or is it just me?',
    'You ever notice there\'s three of everything?',
    'I love you, mate. I love this machine.',
  ],
};

// A Landlord walks in. Tilly gets nervous.
export const BOSS_LINES = {
  bouncer: 'Best behaviour. For once.',
  inspector: 'Don\'t touch the cherries. Trust me.',
  lastorders: 'Quick! Before they ring the bell!',
  powercut: 'Who turned the lights off? I can\'t see my pint.',
  taxman: 'Oh, brilliant. Him again.',
  uncle: 'Oh no. He\'s had a few. More than me, even.',
  quiz: 'Don\'t look at me. I haven\'t got a clue.',
  sticky: 'Mind your feet. And your nudges.',
  bolted: 'Someone\'s screwed it to the floor. Classic.',
  tab: 'He\'s charging for spins now? The cheek.',
  jammed: 'Give it a whack. No, not that one.',
  twofer: 'Half measures? In this economy?',
  darts: 'Duck.',
  fog: 'Can\'t see a thing. Spin and pray.',
  members: 'We\'re not on the list. Act natural.',
  watered: 'This pint tastes of tap water.',
};
export const bossLine = (id) => BOSS_LINES[id] || 'Oh, here we go…';

const recent = {};
export function line(pool, stage = 0) {
  if (pool === 'stage') return LINES.stage[Math.min(stage, LINES.stage.length - 1)];
  const list = LINES[pool] || [];
  if (!list.length) return '';
  const avoid = recent[pool] || [];
  const fresh = list.filter((l) => !avoid.includes(l));
  const pick = (fresh.length ? fresh : list)[Math.floor(Math.random() * (fresh.length || list.length))];
  recent[pool] = [pick, ...avoid].slice(0, Math.max(1, Math.floor(list.length / 2)));
  return pick;
}

// Chatter on the message line has a cooldown so Tilly doesn't talk over every spin.
let lastChat = 0;
export function canChat(force = false) {
  if (!chatty()) return false;
  if (force) return true;
  const now = Date.now();
  if (now - lastChat < 9000) return false;
  lastChat = now;
  return true;
}
