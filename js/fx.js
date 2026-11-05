// Screen effects: a canvas particle layer plus CSS-driven flashes, shakes and glitches.

let canvas, c2d, dpr = 1;
let parts = [];
let running = false;
let reduced = false;

export function initFx() {
  canvas = document.getElementById('fx');
  c2d = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
}

export function setReduced(on) {
  reduced = on;
  document.body.classList.toggle('reduced-fx', on);
}
export function isReduced() { return reduced; }

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  canvas.style.width = innerWidth + 'px';
  canvas.style.height = innerHeight + 'px';
}

const COLOURS = {
  coin: ['#ffc23d', '#ffd76e', '#e8a21f'],
  confetti: ['#ff3d8b', '#3dd6ff', '#ffc23d', '#7dff6a', '#ffffff'],
  shard: ['#ff4545', '#ff8a5c', '#ffd2c2', '#ffffff'],
  ember: ['#ffb02e', '#ff6a2b', '#ffe27a'],
};

// type: coin | confetti | shard | ember
export function burst(x, y, count = 20, type = 'coin', power = 1) {
  if (reduced) count = Math.ceil(count / 4);
  const pal = COLOURS[type];
  for (let i = 0; i < count; i++) {
    const a = type === 'ember' ? -Math.PI / 2 + (Math.random() - 0.5) * 0.9 : Math.random() * Math.PI * 2;
    const sp = (type === 'shard' ? 6 + Math.random() * 9 : 3 + Math.random() * 7) * power;
    parts.push({
      type, x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - (type === 'coin' ? 5 * power : 0),
      g: type === 'ember' ? -0.05 : type === 'confetti' ? 0.18 : 0.38,
      life: 1,
      decay: type === 'ember' ? 0.02 + Math.random() * 0.02 : 0.008 + Math.random() * 0.01,
      size: type === 'shard' ? 6 + Math.random() * 10 : type === 'confetti' ? 5 + Math.random() * 5 : 6 + Math.random() * 6,
      rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4,
      col: pal[Math.floor(Math.random() * pal.length)],
    });
  }
  if (!running) { running = true; requestAnimationFrame(loop); }
}

export function burstFrom(el, count, type, power) {
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, count, type, power);
}

function loop() {
  c2d.setTransform(dpr, 0, 0, dpr, 0, 0);
  c2d.clearRect(0, 0, innerWidth, innerHeight);
  parts = parts.filter((p) => p.life > 0 && p.y < innerHeight + 60);
  for (const p of parts) {
    p.vx *= 0.985;
    p.vy += p.g;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;
    p.life -= p.decay;
    c2d.save();
    c2d.globalAlpha = Math.max(0, Math.min(1, p.life * 1.5));
    c2d.translate(p.x, p.y);
    c2d.rotate(p.rot);
    c2d.fillStyle = p.col;
    if (p.type === 'coin') {
      const squash = Math.abs(Math.cos(p.rot * 2));
      c2d.beginPath();
      c2d.ellipse(0, 0, p.size * (0.3 + 0.7 * squash), p.size, 0, 0, Math.PI * 2);
      c2d.fill();
      c2d.strokeStyle = 'rgba(122,70,0,.6)';
      c2d.lineWidth = 1.5;
      c2d.stroke();
    } else if (p.type === 'shard') {
      c2d.beginPath();
      c2d.moveTo(-p.size / 2, -p.size / 3);
      c2d.lineTo(p.size / 2, 0);
      c2d.lineTo(-p.size / 4, p.size / 2);
      c2d.closePath();
      c2d.fill();
    } else if (p.type === 'ember') {
      c2d.beginPath();
      c2d.arc(0, 0, Math.max(0.1, (p.size / 2) * p.life), 0, Math.PI * 2);
      c2d.fill();
    } else {
      c2d.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    }
    c2d.restore();
  }
  if (parts.length) requestAnimationFrame(loop);
  else { running = false; c2d.clearRect(0, 0, innerWidth, innerHeight); }
}

// ---------- CSS effects ----------
function restartClass(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

export function shake(el, strength = 'normal') {
  if (reduced) return;
  const cls = strength === 'big' ? 'shake-big' : 'shake';
  el.classList.remove('shake', 'shake-big');
  restartClass(el, cls);
  setTimeout(() => el.classList.remove(cls), 600);
}

export function flash(colour = '#fff', ms = 350) {
  const f = document.getElementById('flash');
  f.style.background = colour;
  f.style.transitionDuration = '0ms';
  f.style.opacity = reduced ? '0.35' : '0.85';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    f.style.transitionDuration = ms + 'ms';
    f.style.opacity = '0';
  }));
}

export function punch(el) {
  if (reduced) return;
  restartClass(el, 'punch');
  setTimeout(() => el.classList.remove('punch'), 700);
}

export function aberrate(el) {
  if (reduced) return;
  restartClass(el, 'aberrate');
  setTimeout(() => el.classList.remove('aberrate'), 500);
}

export function glitch(el, ms = 700) {
  if (reduced) return;
  restartClass(el, 'glitch');
  setTimeout(() => el.classList.remove('glitch'), ms);
}

// Big stamped text over the machine ("WRONG ANSWER!", "LANDLORD BEATEN").
export function stamp(text, colour = 'var(--gold)', ms = 1300) {
  const s = document.getElementById('stamp');
  s.textContent = text;
  s.style.color = colour;
  restartClass(s, 'show');
  return new Promise((r) => setTimeout(() => { s.classList.remove('show'); r(); }, ms));
}
