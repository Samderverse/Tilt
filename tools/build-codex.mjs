// Builds tilt-codex.html: a single self-contained page listing everything in Tilt.
// Run from the project root:  node tools/build-codex.mjs  [output path]
// Nothing here is used by the game itself; it only reads the game's own modules,
// so the codex can never drift from what's actually in Tilt.
import { readFileSync, writeFileSync, statSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv[2] ? resolve(process.argv[2]) : join(ROOT, '..', 'tilt-codex.html');

const { REGULARS, RARITY, MAX_REGULARS } = await import(join(ROOT, 'js/regulars.js'));
const { BOSSES } = await import(join(ROOT, 'js/bosses.js'));
const { SYMBOLS, BASE_SYMBOLS, STARTING_STRIP, LEVEL_COINS, LEVEL_MULT } = await import(join(ROOT, 'js/symbols.js'));
const { MACHINES, stripFor } = await import(join(ROOT, 'js/machines.js'));
const S = await import(join(ROOT, 'js/shop.js'));
const G = await import(join(ROOT, 'js/game.js'));
const { LINES, BASE_MULT } = await import(join(ROOT, 'js/scoring.js'));
const { CLIPS, ROLES } = await import(join(ROOT, 'js/sfxmap.js'));
const { VERSION } = await import(join(ROOT, 'js/version.js'));
const { CREDITS, DEFAULTS } = await import(join(ROOT, 'js/settings.js'));
const { PAGES } = await import(join(ROOT, 'js/howto.js'));
const { STAKES, stakeMods } = await import(join(ROOT, 'js/stakes.js'));
const { CHANGELOG } = await import(join(ROOT, 'js/changelog.js'));
const { BETS, GROUPS, REWARDS } = await import(join(ROOT, 'js/bets.js'));
const { MAX_WILDS } = await import(join(ROOT, 'js/shop.js'));
const Tilly = await import(join(ROOT, 'js/tilly.js'));
const tillyImg = (e) => 'data:image/webp;base64,' + readFileSync(join(ROOT, `img/tilly/${e}.webp`)).toString('base64');

// One line per file, so the Code tab says what each part of the game is for.
const FILE_NOTES = {
  'index.html': 'Every screen and overlay in the game',
  'style.css': 'All the styling, including machine themes and mobile fitting',
  'sw.js': 'Service worker: offline play and cache versioning',
  'manifest.json': 'Home-screen install details',
  'version.json': 'The version players check against for the update banner',
  'js/main.js': 'The UI controller: screens, animation, input, saves',
  'js/game.js': 'Rules, rounds, money and the scoring pipeline (no DOM, so it can be simulated)',
  'js/regulars.js': 'Every Regular and the hook engine',
  'js/bosses.js': 'Landlord definitions and their rules',
  'js/shop.js': 'The Bar: stock, Beer Mats, Scratchcards, crisps, Specials',
  'js/scoring.js': 'Win lines and how a spin is scored',
  'js/symbols.js': 'Symbol values, gold and the starting reel strips',
  'js/reels.js': 'Reel strips and spinning',
  'js/rng.js': 'Seeded randomness, so a seed replays exactly',
  'js/machines.js': 'The five starting machines',
  'js/scenery.js': 'Per-machine scenery, cabinet decoration and picker previews',
  'js/art.js': 'Regular cards, Beer Mats, scratchcards and crisp packets, all CSS/SVG',
  'js/fx.js': 'Particles, flashes, shakes and glitches',
  'js/drunk.js': 'The drunk effects engine',
  'js/audio.js': 'Music, ambience and sound effect mixer',
  'js/sfxmap.js': 'Which clip plays at each moment, and how loud',
  'js/howto.js': 'The How to Play guide',
  'js/coach.js': 'Tutorial tips',
  'js/album.js': 'The Album of Regulars and Landlords',
  'js/settings.js': 'Settings, defaults and credits',
  'js/version.js': 'The version the game reports',
  'js/stakes.js': 'Stakes: difficulty tiers and their unlock progress',
  'js/changelog.js': 'What\'s new notes, shown once per version',
  'js/bets.js': 'Bar Bets: the bets, run tracking, career records and reward tiers',
  'js/betsboard.js': 'The Bar Bets chalkboard screen and the cosmetic rewards',
  'js/tilly.js': 'Tilly the mascot: expressions, every line of dialogue, chat modes',
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const money = (n) => `£${n}`;

// Same hue-per-id the game uses, so a Regular's portrait colour matches in-game.
function hueOf(id) {
  let h = 7;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

// ---------- Which hooks a Regular uses, in plain words ----------
function triggerOf(r) {
  if (r.copies) return 'Copies its neighbour';
  const t = [];
  if (r.line) t.push('per winning line');
  if (r.end) t.push('end of spin');
  if (r.roundEnd) t.push('end of round');
  if (r.nudge) t.push('on nudge');
  if (r.extra) t.push('passive');
  return t.join(' · ') || 'passive';
}

// ---------- Balance tables ----------
const fakeRun = (machine) => ({ round: 1, machine, endless: false, bossOrder: BOSSES.map((b) => b.id) });
function targetTable(machineId) {
  const run = fakeRun(machineId);
  const rows = [];
  for (let round = 1; round <= 36; round++) {
    run.round = round;
    run.endless = round > G.CONFIG.pintsToWin * 3;
    const i = G.roundInfo(run);
    rows.push({ round, pint: i.pint, kind: i.kind.name, target: i.target, reward: i.reward, endless: i.endless });
  }
  return rows;
}

const fmtNum = (n) => n.toLocaleString('en-GB');

// ---------- Source files ----------
function sourceFiles() {
  const out = [];
  for (const dir of ['', 'js']) {
    const d = join(ROOT, dir);
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      const st = statSync(p);
      if (!st.isFile()) continue;
      if (!/\.(js|html|css|json)$/.test(name)) continue;
      const text = readFileSync(p, 'utf8');
      out.push({ path: dir ? `${dir}/${name}` : name, bytes: st.size, lines: text.split('\n').length });
    }
  }
  return out.sort((a, b) => b.lines - a.lines);
}

// ---------- Audio, embedded so clips play straight from the file ----------
function audioClips() {
  const dir = join(ROOT, 'audio/sfx');
  const out = {};
  for (const name of CLIPS) {
    const p = join(dir, `${name}.mp3`);
    try {
      const buf = readFileSync(p);
      out[name] = { data: buf.toString('base64'), bytes: buf.length };
    } catch { out[name] = null; }
  }
  return out;
}

const clips = audioClips();
const rolesByClip = {};
for (const r of ROLES) (rolesByClip[r.def] ||= []).push(r);

// ================= HTML =================
const regularCard = (r) => `
  <article class="card rc r-${r.rarity}" style="--h:${hueOf(r.id)}" data-search="${esc((r.name + ' ' + r.desc + ' ' + r.rarity + ' ' + r.id).toLowerCase())}" data-rarity="${r.rarity}">
    <span class="rc-shine"></span>
    <div class="rc-top">
      <span class="rc-portrait"><span class="rc-face">${r.face}</span></span>
      <span class="rc-name">${esc(r.name)}</span>
      <span class="rc-rarity">${RARITY[r.rarity].name}</span>
    </div>
    <p class="rc-desc">${esc(r.desc)}</p>
    <div class="rc-meta">
      <span>${money(RARITY[r.rarity].price)}</span>
      <span>sell ${money(Math.floor(RARITY[r.rarity].price / 2))}</span>
      <span class="rc-trigger">${triggerOf(r)}</span>
    </div>
    <code class="rc-id">${r.id}</code>
  </article>`;

const bossCard = (b) => {
  const mods = [];
  if (b.mods?.lines) mods.push(`lines: ${b.mods.lines.join(', ')}`);
  if (b.mods?.minCount) mods.push(`min ${b.mods.minCount} in a row`);
  if (b.mods?.pairFactor != null) mods.push(`pairs ×${b.mods.pairFactor}`);
  if (b.mods?.half) mods.push(`half coins: ${b.mods.half}`);
  if (b.spins) mods.push(`spins ${b.spins > 0 ? '+' : ''}${b.spins}`);
  if (b.nudges) mods.push(`nudges ${b.nudges > 0 ? '+' : ''}${b.nudges}`);
  if (b.darkRows) mods.push(`dark rows: ${b.darkRows.join(', ')}`);
  if (b.darkCols) mods.push(`dark reels: ${b.darkCols.join(', ')}`);
  if (b.swapReels) mods.push('reels swap');
  if (b.voidFirstSpin) mods.push('first spin voided');
  if (b.noBump) mods.push('no bumping');
  if (b.spinCost) mods.push(`£${b.spinCost} per spin`);
  if (b.jammed != null) mods.push(`reel ${b.jammed + 1} jammed`);
  if (b.barFirst) mods.push('bar visit first');
  if (b.multFactor) mods.push(`multi ×${b.multFactor}`);
  if (b.endless?.mods?.lines) mods.push(`Endless: lines ${b.endless.mods.lines.join(', ')}`);
  return `
  <article class="card boss t${b.tier}" data-search="${esc((b.name + ' ' + b.rule + ' ' + b.id).toLowerCase())}" data-tier="${b.tier}">
    <div class="boss-head"><span class="boss-face">${b.face}</span>
      <div><h3>${esc(b.name)}</h3><span class="tag">${b.tier === 1 ? 'Early pool' : 'Late pool'}</span></div>
    </div>
    <p class="rule">“${esc(b.rule)}”</p>
    ${mods.length ? `<ul class="mods">${mods.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>` : ''}
    <code class="rc-id">${b.id}</code>
  </article>`;
};

const symbolRows = Object.values(SYMBOLS).map((s) => `
  <tr data-search="${esc((s.name + ' ' + s.id).toLowerCase())}">
    <td class="sym"><span class="sym-chip${s.text ? ' text' : ''}">${s.icon}</span> ${esc(s.name)}</td>
    <td>${s.coins}</td><td>×${s.mult}</td>
    <td>${s.coins + LEVEL_COINS} / ×${s.mult + LEVEL_MULT}</td>
    <td>${STARTING_STRIP[s.id] ?? '—'}</td>
    <td><code>${s.id}</code></td>
  </tr>`).join('');

const shopCard = (item, kind, price, extra = '') => `
  <article class="card shop ${kind}" data-search="${esc((item.name + ' ' + item.desc + ' ' + item.id).toLowerCase())}">
    <div class="shop-head"><span class="shop-icon">${item.icon}</span>
      <div><h3>${esc(item.name)}</h3><span class="price">${money(price)}</span></div></div>
    <p>${esc(item.desc)}</p>${extra}
    <code class="rc-id">${item.id}</code>
  </article>`;

const machineCard = (m) => {
  const strip = stripFor(m);
  const total = Object.values(strip).reduce((a, b) => a + b, 0);
  const traits = [];
  if (m.spins) traits.push(`${m.spins > 0 ? '+' : ''}${m.spins} spin`);
  if (m.discount) traits.push(`everything ${money(m.discount)} cheaper`);
  if (m.regDiscount) traits.push(`Regulars ${money(m.regDiscount)} cheaper`);
  if (m.noInterest) traits.push('no interest');
  if (m.startMoney) traits.push(`starts with ${money(m.startMoney)}`);
  if (m.wild) traits.push('a Wild on every reel');
  if (m.targetFactor) traits.push(`targets ×${m.targetFactor}`);
  return `
  <article class="card machine" data-search="${esc((m.name + ' ' + m.desc + ' ' + m.id).toLowerCase())}">
    <div class="shop-head"><span class="shop-icon">${m.icon}</span>
      <div><h3>${esc(m.name)}</h3><span class="tag">${m.unlock === 0 ? 'Always available' : esc(m.unlockText || `${m.unlock} rounds cleared`)}</span></div></div>
    <p>${esc(m.desc)}</p>
    ${traits.length ? `<ul class="mods">${traits.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
    <div class="strip">${BASE_SYMBOLS.concat(m.wild ? ['wild'] : []).map((id) => {
      const n = id === 'wild' ? 1 : (strip[id] || 0);
      return n ? `<span class="strip-sym"><span class="sym-chip${SYMBOLS[id].text ? ' text' : ''}">${SYMBOLS[id].icon}</span>×${n}</span>` : '';
    }).join('')}</div>
    <p class="muted">${total} symbols per reel at the start${m.wild ? ', one swapped for a Wild' : ''}</p>
    <code class="rc-id">${m.id}</code>
  </article>`;
};

const soundRow = (name) => {
  const c = clips[name];
  const uses = rolesByClip[name] || [];
  return `
  <tr data-search="${esc((name + ' ' + uses.map((u) => u.id).join(' ')).toLowerCase())}">
    <td><button class="play" data-clip="${name}" ${c ? '' : 'disabled'}>▶</button></td>
    <td><code>${name}</code></td>
    <td>${uses.length ? uses.map((u) => `<span class="pill">${u.id}</span>`).join(' ') : '<span class="muted">unused</span>'}</td>
    <td>${uses.map((u) => `gain ${u.gain}${u.rate ? ` · rate ${u.rate}` : ''}`).join('<br>') || '—'}</td>
    <td>${c ? (c.bytes / 1024).toFixed(0) + ' KB' : '<span class="muted">missing</span>'}</td>
  </tr>`;
};

const targets = targetTable('local');
const targetRows = targets.map((t) => `
  <tr class="${t.kind === 'Landlord' ? 'boss-row' : ''}${t.endless ? ' endless-row' : ''}">
    <td>${t.round}</td><td>${t.pint}</td><td>${t.kind}</td>
    <td class="num">${fmtNum(t.target)}</td>
    <td class="num">${fmtNum(Math.ceil(t.target / G.CONFIG.spins))}</td>
    <td>${money(t.reward)}</td>
    <td>${t.endless ? 'Endless' : t.pint === G.CONFIG.pintsToWin && t.kind === 'Landlord' ? 'Final' : ''}</td>
  </tr>`).join('');

const files = sourceFiles();
const totalLines = files.reduce((a, f) => a + f.lines, 0);

const counts = {
  regulars: REGULARS.length,
  bosses: BOSSES.length,
  symbols: Object.keys(SYMBOLS).length,
  machines: MACHINES.length,
  shop: S.SCRATCHCARDS.length + S.PACKETS.length + S.SPECIALS.length + BASE_SYMBOLS.length,
  sounds: CLIPS.length,
  lines: totalLines,
};

const byRarity = Object.keys(RARITY).map((k) => ({ k, n: REGULARS.filter((r) => r.rarity === k).length }));

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Tilt Codex</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bungee&family=Rye&family=Permanent+Marker&family=Rubik:wght@400;500;700&display=swap" rel="stylesheet">
<style>
:root{
  --bg:#140510; --bg2:#200816; --panel:#2a0c1c; --panel2:#35102339;
  --wood:#4a1a22; --gold:#ffc23d; --gold-dim:#b8862a; --cream:#fff3dc;
  --neon:#ff3d8b; --chips:#3d9bff; --mult:#ff4545; --green:#7dff6a;
  --line:#ffffff1f; --muted:#ffffff8a;
  --display:'Bungee',system-ui,sans-serif; --body:'Rubik',system-ui,sans-serif;
  --sign:'Rye',Georgia,serif; --chalk:'Permanent Marker',cursive;
}
*{box-sizing:border-box}
body{
  margin:0; background:
    radial-gradient(1200px 600px at 50% -10%, #45102b 0%, transparent 60%),
    repeating-linear-gradient(90deg, #ffffff06 0 2px, transparent 2px 7px),
    linear-gradient(#1b0612,#140510);
  color:var(--cream); font-family:var(--body); font-size:15px; line-height:1.5;
  -webkit-text-size-adjust:100%;
}
a{color:var(--gold)}
h1,h2,h3{font-family:var(--display);font-weight:400;letter-spacing:.01em;margin:0}
h1{font-size:clamp(26px,7vw,44px); color:var(--gold); text-shadow:0 2px 0 #7a4f06,0 0 26px #ffc23d55}
h2{font-size:clamp(17px,4.5vw,22px); color:var(--gold)}
h3{font-size:15px}
code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px}
.muted{color:var(--muted)}
.wrap{max-width:1180px;margin:0 auto;padding:0 16px 72px}

header.top{
  position:sticky;top:0;z-index:20;
  background:linear-gradient(#2c0c1bfa,#20081ef2); backdrop-filter:blur(8px);
  border-bottom:2px solid var(--gold-dim); box-shadow:0 6px 20px #0008;
}
.top-in{max-width:1180px;margin:0 auto;padding:10px 16px}
.brand{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.brand .ver{font-family:var(--display);font-size:12px;color:#140510;background:var(--gold);padding:3px 8px;border-radius:999px}
.sub{color:var(--muted);font-size:13px;margin:2px 0 0}
.search{
  width:100%;margin-top:10px;padding:11px 14px;border-radius:12px;
  border:2px solid var(--line); background:#14051099; color:var(--cream);
  font-family:var(--body);font-size:16px;
}
.search:focus{outline:none;border-color:var(--gold)}
nav.tabs{display:flex;gap:6px;overflow-x:auto;margin-top:10px;padding-bottom:2px;scrollbar-width:none}
nav.tabs::-webkit-scrollbar{display:none}
.tab{
  flex:0 0 auto;border:2px solid var(--line);background:#ffffff0d;color:var(--cream);
  font-family:var(--display);font-size:12px;padding:8px 13px;border-radius:999px;cursor:pointer;
  white-space:nowrap;transition:.15s;
}
.tab:hover{border-color:var(--gold-dim)}
.tab.on{background:var(--gold);color:#2a0c1c;border-color:var(--gold)}

section.panel{display:none;padding-top:22px}
section.panel.on{display:block}
.section-head{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.count{font-family:var(--display);font-size:12px;color:var(--muted)}

.filters{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}
.chip{
  border:2px solid var(--line);background:#ffffff0d;color:var(--cream);
  font-size:12px;font-weight:500;padding:6px 11px;border-radius:999px;cursor:pointer;
}
.chip.on{background:var(--c,var(--gold));color:#1a0710;border-color:var(--c,var(--gold))}

.grid{display:grid;gap:12px}
.grid.regs{grid-template-columns:repeat(auto-fill,minmax(176px,1fr))}
@media (max-width:560px){
  .grid.regs{grid-template-columns:repeat(2,1fr);gap:9px}
  .rc{padding:10px 8px 22px}
  .rc-portrait{width:48px;height:48px}
  .rc-face{font-size:24px}
  .rc-name{font-size:12.5px}
  .rc-desc{font-size:11.5px}
  .rc-meta{font-size:9.5px;gap:4px}
  .wrap{padding:0 12px 60px}
  h1{font-size:28px}
}
.grid.wide{grid-template-columns:repeat(auto-fill,minmax(270px,1fr))}
.card{
  position:relative;border-radius:14px;padding:12px;border:2px solid var(--line);
  background:linear-gradient(#ffffff0f,#ffffff05);
}
.card.hide,tr.hide{display:none}
.rc-id{position:absolute;right:9px;bottom:7px;opacity:.4;font-size:10px}

/* Regular cards, matching the in-game look */
.rc{overflow:hidden;display:flex;flex-direction:column;gap:8px;padding-bottom:22px}
.rc-top{display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center}
.rc-portrait{
  width:60px;height:60px;border-radius:50%;display:grid;place-items:center;
  background:radial-gradient(circle at 35% 30%,hsl(var(--h) 85% 72%),hsl(var(--h) 60% 32%));
  box-shadow:inset 0 -5px 0 #00000040,0 3px 8px #00000073;
}
.rc-face{font-size:30px;line-height:1}
.rc-name{font-size:14px;line-height:1.15;font-weight:700}
.rc-rarity{font-size:8px;text-transform:uppercase;letter-spacing:.14em;opacity:.75}
.rc-desc{margin:0;font-size:12.5px;line-height:1.35}
.rc-meta{display:flex;gap:6px;flex-wrap:wrap;font-size:10.5px;margin-top:auto}
.rc-meta span{background:#00000038;border-radius:999px;padding:2px 7px}
.rc-trigger{opacity:.8}
.rc-shine{position:absolute;inset:0;pointer-events:none}
.rc.r-common{background:radial-gradient(circle at 30% 10%,#ffffff8c,transparent 55%),repeating-radial-gradient(circle at 50% 50%,#efe1c0 0 2px,#e6d4ac 2px 4px);border-color:#a8864e;color:#4a2a10}
.rc.r-common .rc-name{font-family:var(--sign);font-weight:400}
.rc.r-common .rc-meta span{background:#4a2a1024}
.rc.r-uncommon{background:repeating-linear-gradient(45deg,#ffffff09 0 2px,transparent 2px 4px),radial-gradient(circle at 50% 20%,#3a9a62,#123f23);border-color:#d7b45a;color:#fffbe6}
.rc.r-uncommon .rc-name{font-family:var(--chalk);font-weight:400}
.rc.r-rare{background:radial-gradient(circle at 50% 0%,#4a0d40,#0e030c 70%);border-color:#ff4fd8;color:#ffd6f7;box-shadow:0 0 14px #ff4fd899,inset 0 0 12px #ff4fd859}
.rc.r-rare .rc-name{font-family:var(--display);font-weight:400;font-size:12px;text-shadow:0 0 5px #ff4fd8,0 0 10px #ff4fd8}
.rc.r-legendary{background:linear-gradient(115deg,#b8861a,#ffe58a 30%,#fff6c9 45%,#e0a62a 60%,#ffd75e 80%,#a8740f);background-size:250% 100%;animation:foil 3s linear infinite;border-color:#fff3b0;color:#3a2600;box-shadow:0 0 18px #ffd65e99}
.rc.r-legendary .rc-name{font-family:var(--sign);font-weight:400}
.rc.r-legendary .rc-meta span{background:#3a260024}
.rc.r-rare .rc-shine,.rc.r-legendary .rc-shine{background:linear-gradient(115deg,transparent 35%,#ffffff73 48%,transparent 60%);background-size:300% 100%;animation:shine 3.4s ease-in-out infinite}
@keyframes foil{to{background-position:250% 0}}
@keyframes shine{0%,70%{background-position:140% 0}100%{background-position:-40% 0}}
@media (prefers-reduced-motion:reduce){.rc.r-legendary,.rc-shine{animation:none!important}}

/* Landlords */
.boss{border-color:#ff4b3a55;background:linear-gradient(#ff4b3a12,#ffffff05)}
.boss.t2{border-color:#ff4b3a99;box-shadow:inset 0 0 22px #ff4b3a1f}
.boss-head{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.boss-face{font-size:34px;line-height:1}
.rule{font-family:var(--chalk);font-size:15px;color:#ffd9d4;margin:0 0 8px}
.mods{list-style:none;margin:0;padding:0;display:flex;gap:5px;flex-wrap:wrap}
.mods li{font-size:11px;background:#00000040;border:1px solid var(--line);border-radius:6px;padding:2px 7px}
.tag{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:var(--muted)}

/* Shop + machines */
.shop-head{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.shop-icon{font-size:30px;line-height:1}
.price{font-family:var(--display);font-size:13px;color:var(--green)}
.card.shop p,.card.machine p{margin:0 0 8px;font-size:13px}
.strip{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}
.strip-sym{display:flex;align-items:center;gap:3px;font-size:12px;background:#00000038;border-radius:8px;padding:3px 7px}
.sym-chip{
  display:inline-grid;place-items:center;min-width:24px;height:24px;padding:0 5px;border-radius:6px;
  background:#fff8ea;color:#2a0c1c;font-size:15px;line-height:1;
}
.sym-chip.text{font-family:var(--display);font-size:11px;color:#c41f2b}

/* Tables */
.table-wrap{overflow-x:auto;border:2px solid var(--line);border-radius:14px;background:#00000030}
table{border-collapse:collapse;width:100%;min-width:520px;font-size:13.5px}
th,td{padding:9px 12px;text-align:left;border-bottom:1px solid var(--line);white-space:nowrap}
th{font-family:var(--display);font-size:11px;color:var(--gold);position:sticky;top:0;background:#2a0c1cf2;letter-spacing:.04em}
tbody tr:hover{background:#ffffff08}
td.num{font-variant-numeric:tabular-nums;text-align:right}
tr.boss-row{background:#ff4b3a14}
tr.boss-row td:first-child{box-shadow:inset 3px 0 0 #ff4b3a}
tr.endless-row td{color:#ffd7a8}
.pill{display:inline-block;font-size:11px;background:#00000045;border:1px solid var(--line);border-radius:999px;padding:1px 8px;margin:1px 0}
.play{
  width:34px;height:34px;border-radius:9px;border:2px solid var(--gold-dim);
  background:#ffc23d1f;color:var(--gold);font-size:13px;cursor:pointer;
}
.play:hover:not(:disabled){background:var(--gold);color:#2a0c1c}
.play:disabled{opacity:.3;cursor:default}
.play.playing{background:var(--gold);color:#2a0c1c}

/* Overview */
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:18px}
.stat{background:#00000038;border:2px solid var(--line);border-radius:14px;padding:12px;text-align:center}
.stat b{display:block;font-family:var(--display);font-weight:400;font-size:26px;color:var(--gold)}
.stat span{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)}
.two{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:14px}
.box{background:#00000030;border:2px solid var(--line);border-radius:14px;padding:14px}
.box h3{color:var(--gold);margin-bottom:8px}
.kv{display:flex;justify-content:space-between;gap:12px;padding:4px 0;border-bottom:1px dashed var(--line);font-size:13px}
.kv:last-child{border:0}
.kv b{font-weight:500;color:var(--gold)}
.noresult{text-align:center;color:var(--muted);padding:36px 0;display:none}
.noresult.on{display:block}
.whatsnew{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.whatsnew li{font-size:13px;line-height:1.4;background:#00000030;border-radius:8px;padding:7px 9px}
.whatsnew li b{color:var(--gold);font-weight:500}
footer{text-align:center;color:var(--muted);font-size:12px;padding:30px 16px}
</style>
</head>
<body>
<header class="top">
  <div class="top-in">
    <div class="brand">
      <h1>Tilt Codex</h1><span class="ver">v${VERSION}</span>
    </div>
    <p class="sub">Everything in the game, generated from the source on ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}. Offline, private, not part of the game.</p>
    <input class="search" id="q" type="search" placeholder="Search Regulars, Landlords, symbols, sounds…" autocomplete="off">
    <nav class="tabs" id="tabs">
      <button class="tab on" data-tab="overview">Overview</button>
      <button class="tab" data-tab="regulars">Regulars ${counts.regulars}</button>
      <button class="tab" data-tab="landlords">Landlords ${counts.bosses}</button>
      <button class="tab" data-tab="symbols">Symbols &amp; reels</button>
      <button class="tab" data-tab="bar">The Bar</button>
      <button class="tab" data-tab="machines">Machines ${counts.machines}</button>
      <button class="tab" data-tab="sounds">Sound ${counts.sounds}</button>
      <button class="tab" data-tab="stakes">Stakes ${STAKES.length}</button>
      <button class="tab" data-tab="tillyTab">Tilly</button>
      <button class="tab" data-tab="betsTab">Bar Bets ${BETS.length}</button>
      <button class="tab" data-tab="balance">Balance</button>
      <button class="tab" data-tab="changelog">What's new</button>
      <button class="tab" data-tab="code">Code</button>
    </nav>
  </div>
</header>

<div class="wrap">
<p class="noresult" id="noresult">Nothing matches that.</p>

<!-- OVERVIEW -->
<section class="panel on" id="overview">
  <div class="stats">
    <div class="stat"><b>${counts.regulars}</b><span>Regulars</span></div>
    <div class="stat"><b>${counts.bosses}</b><span>Landlords</span></div>
    <div class="stat"><b>${counts.symbols}</b><span>Symbols</span></div>
    <div class="stat"><b>${counts.machines}</b><span>Machines</span></div>
    <div class="stat"><b>${counts.sounds}</b><span>Sound clips</span></div>
    <div class="stat"><b>${fmtNum(counts.lines)}</b><span>Lines of code</span></div>
  </div>
  <div class="two">
    <div class="box">
      <h3>A round</h3>
      ${[['Spins', G.CONFIG.spins], ['Holds', G.CONFIG.holds], ['Nudges', G.CONFIG.nudges],
         ['Base Multi', '×' + BASE_MULT], ['Win lines', LINES.length],
         ['Regular slots', MAX_REGULARS + ' (6 with Lock-In)']]
        .map(([k, v]) => `<div class="kv"><span>${k}</span><b>${v}</b></div>`).join('')}
    </div>
    <div class="box">
      <h3>Money</h3>
      ${[['Starting cash', money(G.CONFIG.startMoney)], ['Interest', `£1 per ${money(G.CONFIG.interestPer)} held`],
         ['Interest cap', `${money(G.CONFIG.interestCap)} (${money(G.CONFIG.interestCap + 2)} with Piggy Bank)`],
         ['Spare spins', `£1 each, max ${money(G.CONFIG.spareCap)}`],
         ['Round rewards', 'Half £3 · Full £4 · Landlord £5'], ['Restock', `${money(S.RESTOCK_START)}, +£1 each time`]]
        .map(([k, v]) => `<div class="kv"><span>${k}</span><b>${v}</b></div>`).join('')}
    </div>
    <div class="box">
      <h3>A run</h3>
      ${[['Pints to win', G.CONFIG.pintsToWin], ['Rounds to win', G.CONFIG.pintsToWin * 3],
         ['Endless growth', '×' + G.CONFIG.endlessGrowth + ' per Pint'],
         ['Bump risk', `${G.CONFIG.bumpRisk * 100}%, +${G.CONFIG.bumpRiskStep * 100}% each bump`],
         ['Reel strip', `${S.MIN_STRIP}–${S.MAX_STRIP} symbols`],
         ['Landlord pools', '8 early, 8 late'], ['Cash Out', 'Endless only, from £100']]
        .map(([k, v]) => `<div class="kv"><span>${k}</span><b>${v}</b></div>`).join('')}
    </div>
    <div class="box">
      <h3>Regulars by rarity</h3>
      ${byRarity.map((r) => `<div class="kv"><span style="color:${RARITY[r.k].colour}">${RARITY[r.k].name}</span><b>${r.n} · ${money(RARITY[r.k].price)} · weight ${RARITY[r.k].weight}</b></div>`).join('')}
      <p class="muted" style="font-size:12px;margin:8px 0 0">Rarity is rolled by tier, then a Regular within it. Bar stock: Common 64% · Uncommon 28% · Rare 8%. Prawn Cocktail: Uncommon 60% · Rare 32% · Legendary 8%.</p>
    </div>
    <div class="box">
      <h3>Win lines</h3>
      ${LINES.map((l) => `<div class="kv"><span>${l.name}</span><b><code>${l.id}</code></b></div>`).join('')}
    </div>
    <div class="box">
      <h3>Credits</h3>
      ${CREDITS.map((c) => `<div class="kv"><span>${esc(c.what)}</span><b>${esc(c.who)}</b></div>`).join('')}
    </div>
  </div>
</section>

<!-- REGULARS -->
<section class="panel" id="regulars">
  <div class="section-head"><h2>Regulars</h2><span class="count">${counts.regulars} total · they trigger left to right</span></div>
  <div class="filters" id="rarity-filters">
    <button class="chip on" data-rarity="all">All</button>
    ${Object.entries(RARITY).map(([k, v]) => `<button class="chip" data-rarity="${k}" style="--c:${v.colour}">${v.name} ${REGULARS.filter((r) => r.rarity === k).length}</button>`).join('')}
  </div>
  <div class="grid regs" id="regs-grid">${REGULARS.map(regularCard).join('')}</div>
</section>

<!-- LANDLORDS -->
<section class="panel" id="landlords">
  <div class="section-head"><h2>Landlords</h2><span class="count">${counts.bosses} total · 4 early + 4 late per run, the rest in Endless</span></div>
  <div class="filters" id="tier-filters">
    <button class="chip on" data-tier="all">All</button>
    <button class="chip" data-tier="1">Early pool ${BOSSES.filter((b) => b.tier === 1).length}</button>
    <button class="chip" data-tier="2">Late pool ${BOSSES.filter((b) => b.tier === 2).length}</button>
  </div>
  <div class="grid wide" id="boss-grid">${BOSSES.map(bossCard).join('')}</div>
</section>

<!-- SYMBOLS -->
<section class="panel" id="symbols">
  <div class="section-head"><h2>Symbols &amp; reels</h2><span class="count">Each Beer Mat level adds +${LEVEL_COINS} Coins and +${LEVEL_MULT} Multi</span></div>
  <div class="table-wrap"><table>
    <thead><tr><th>Symbol</th><th>Coins</th><th>Multi</th><th>At level 2</th><th>On a starting reel</th><th>id</th></tr></thead>
    <tbody>${symbolRows}</tbody>
  </table></div>
  <div class="two" style="margin-top:14px">
    <div class="box"><h3>How a spin scores</h3>
      <p style="font-size:13.5px;margin:0">Every spin starts at <b>×${BASE_MULT} Multi</b>. Each of the ${LINES.length} lines is checked: <b>3 in a row</b> pays the symbols' Coins added up and sets that line's Multi; <b>2 matching from the left</b> pays 2× the symbol's Coins. Only the <b>best line's Multi</b> counts; every other winning line still adds its Coins. Then Regulars fire left to right, and the total is Coins × Multi.</p>
    </div>
    <div class="box"><h3>Gold &amp; Wilds</h3>
      <p style="font-size:13.5px;margin:0">Gold symbols (Gold Leaf scratchcard) score <b>double Coins</b> and stay lit in a Power Cut. Wilds (Wild Card scratchcard, or the High Roller machine) match anything and are worth ${SYMBOLS.wild.coins} Coins / ×${SYMBOLS.wild.mult}, with at most ${MAX_WILDS} per reel. A reel strip holds ${S.MIN_STRIP}–${S.MAX_STRIP} symbols.</p>
    </div>
  </div>
</section>

<!-- BAR -->
<section class="panel" id="bar">
  <div class="section-head"><h2>The Bar</h2><span class="count">Between every round</span></div>
  <h3 style="margin:6px 0 10px;color:var(--gold)">Scratchcards</h3>
  <div class="grid wide">${S.SCRATCHCARDS.map((c) => shopCard(c, 'scratch', c.price)).join('')}</div>
  <h3 style="margin:22px 0 10px;color:var(--gold)">Crisps</h3>
  <div class="grid wide">${S.PACKETS.map((p) => shopCard(p, 'packet', p.price)).join('')}</div>
  <h3 style="margin:22px 0 10px;color:var(--gold)">Landlord's Specials <span class="count">one per Pint</span></h3>
  <div class="grid wide">${S.SPECIALS.map((p) => shopCard(p, 'special', p.price)).join('')}</div>
  <h3 style="margin:22px 0 10px;color:var(--gold)">Beer Mats</h3>
  <div class="table-wrap"><table>
    <thead><tr><th>Mat</th><th>Level 1</th><th>Level 2</th><th>Level 3</th><th>Level 4</th></tr></thead>
    <tbody>${BASE_SYMBOLS.map((id) => `<tr data-search="${id} beer mat">
      <td class="sym"><span class="sym-chip${SYMBOLS[id].text ? ' text' : ''}">${SYMBOLS[id].icon}</span> ${SYMBOLS[id].name} Mat</td>
      ${[0, 1, 2, 3].map((lv) => `<td>${money(S.MAT_BASE_PRICE + lv)}</td>`).join('')}
    </tr>`).join('')}</tbody>
  </table></div>
  <p class="muted" style="font-size:12.5px">A Mat costs £${S.MAT_BASE_PRICE} plus £1 for each level that symbol already has. Student Union knocks £1 off everything; Working Men's Club knocks £2 off Regulars.</p>
</section>

<!-- MACHINES -->
<section class="panel" id="machines">
  <div class="section-head"><h2>Machines</h2><span class="count">Unlocked by your best run</span></div>
  <div class="grid wide">${MACHINES.map(machineCard).join('')}</div>
</section>

<!-- SOUNDS -->
<section class="panel" id="sounds">
  <div class="section-head"><h2>Sound</h2><span class="count">${counts.sounds} clips, playable right here</span></div>
  <div class="table-wrap"><table>
    <thead><tr><th></th><th>Clip</th><th>Used for</th><th>Mix</th><th>Size</th></tr></thead>
    <tbody>${CLIPS.map(soundRow).join('')}</tbody>
  </table></div>
  <div class="two" style="margin-top:14px">
    <div class="box"><h3>Music</h3>
      ${[['Main theme', 'audio/main.mp3'], ['Landlord theme', 'audio/boss.mp3'], ['Pub ambience', 'audio/ambience.mp3']]
        .map(([k, v]) => `<div class="kv"><span>${k}</span><b><code>${v}</code></b></div>`).join('')}
      <p class="muted" style="font-size:12px;margin:8px 0 0">Music isn't embedded here (it's several MB). Default volumes: music ${DEFAULTS.music}, ambience ${DEFAULTS.ambience}, sfx ${DEFAULTS.sfx}.</p>
    </div>
    <div class="box"><h3>Roles with no clip</h3>
      ${ROLES.filter((r) => r.def === 'synth').map((r) => `<div class="kv"><span><code>${r.id}</code></span><b>built-in synth</b></div>`).join('') || '<p class="muted" style="margin:0;font-size:13px">Every role has a real clip.</p>'}
    </div>
  </div>
</section>

<!-- STAKES -->
<section class="panel" id="stakes">
  <div class="section-head"><h2>Stakes</h2><span class="count">Each stake keeps every rule below it · beat the pub to unlock the next</span></div>
  <div class="table-wrap"><table>
    <thead><tr><th>Stake</th><th>Adds</th><th>Spare pay</th><th>Bar prices</th><th>Slots</th><th>Targets</th><th>Spins</th><th>Round 1 target</th></tr></thead>
    <tbody>${STAKES.map((st) => {
      const m = stakeMods({ stake: st.id });
      const run = fakeRun('local'); run.stake = st.id; run.round = 1;
      const t = G.roundInfo(run).target;
      return `<tr data-search="${esc((st.name + ' stake ' + st.rule).toLowerCase())}">
        <td>${st.icon} <b>${esc(st.name)}</b></td><td>${esc(st.rule)}</td>
        <td>${m.noSpare ? 'none' : 'up to £' + G.CONFIG.spareCap}</td><td>${m.barPlus ? '+£' + m.barPlus : '—'}</td>
        <td>${MAX_REGULARS - m.slotsMinus}</td><td>×${m.targetFactor.toFixed(2).replace(/\.?0+$/, '')}</td>
        <td>${G.CONFIG.spins - m.spinsMinus}</td><td class="num">${fmtNum(t)}</td></tr>`;
    }).join('')}</tbody>
  </table></div>
  <p class="muted" style="font-size:12.5px">Progress is saved per phone in <code>tilt.stakes.v1</code>: the highest stake unlocked, and the best stake beaten on each machine.</p>
</section>

<!-- TILLY -->
<section class="panel" id="tillyTab">
  <div class="section-head"><h2>Tilly</h2><span class="count">${Tilly.EXPRESSIONS.length} expressions · every line in js/tilly.js</span></div>
  <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(120px,1fr))">${Tilly.EXPRESSIONS.map((e) => `<div class="card" style="text-align:center" data-search="tilly ${e}"><img src="${tillyImg(e)}" alt="${e}" style="height:150px;width:auto"><br><code>${e}</code></div>`).join('')}</div>
  <div class="two" style="margin-top:14px">${Object.entries(Tilly.LINES).map(([k, list]) => `<div class="box" data-search="${esc((k + ' ' + list.join(' ')).toLowerCase())}"><h3><code>${k}</code></h3>${list.map((l) => `<div class="kv"><span>“${esc(l)}”</span></div>`).join('')}</div>`).join('')}
    <div class="box" data-search="landlord ${esc(Object.values(Tilly.BOSS_LINES).join(' ').toLowerCase())}"><h3>Landlord intros</h3>${BOSSES.map((b) => `<div class="kv"><span>${b.face} ${esc(b.name)}</span><b style="font-weight:400;color:var(--cream)">“${esc(Tilly.bossLine(b.id))}”</b></div>`).join('')}</div>
  </div>
</section>

<!-- BAR BETS -->
<section class="panel" id="betsTab">
  <div class="section-head"><h2>Bar Bets</h2><span class="count">${BETS.length} bets · a cosmetic reward every 5</span></div>
  <div class="two">${GROUPS.map((g) => `<div class="box"><h3>${g.icon} ${esc(g.name)}</h3>${BETS.filter((b) => b.group === g.id).map((b) => `<div class="kv" data-search="${esc((b.name + ' ' + b.desc + ' ' + b.id).toLowerCase())}"><span>${b.icon} <b style="color:var(--cream)">${esc(b.name)}</b><br><span class="muted" style="font-size:12px">${esc(b.desc)}</span></span><b><code>${b.on}</code></b></div>`).join('')}</div>`).join('')}
    <div class="box"><h3>🎁 Rewards</h3>${REWARDS.map((r) => `<div class="kv" data-search="${esc((r.name + ' ' + r.desc).toLowerCase())}"><span>${r.icon} ${esc(r.name)}<br><span class="muted" style="font-size:12px">${esc(r.desc)}</span></span><b>${r.at} bets</b></div>`).join('')}</div>
  </div>
  <p class="muted" style="font-size:12.5px">The code column says when each bet is checked: after a scoring spin, when a round is cleared, on entering the Bar, on beating the pub, or on cashing out. Stored in <code>tilt.bets.v1</code>; career records in <code>tilt.career.v1</code>.</p>
</section>

<!-- CHANGELOG -->
<section class="panel" id="changelog">
  <div class="section-head"><h2>What's new</h2><span class="count">as players see it, from js/changelog.js</span></div>
  <div class="two">${CHANGELOG.map((c) => `<div class="box" data-search="${esc(('v' + c.version + ' ' + c.title + ' ' + c.notes.join(' ')).toLowerCase())}">
    <h3>v${c.version} · ${esc(c.title)}</h3>
    <ul class="whatsnew">${c.notes.map((n) => `<li>${n}</li>`).join('')}</ul></div>`).join('')}</div>
</section>

<!-- BALANCE -->
<section class="panel" id="balance">
  <div class="section-head"><h2>Balance</h2><span class="count">The Local · other machines scale from this</span></div>
  <div class="table-wrap"><table>
    <thead><tr><th>Round</th><th>Pint</th><th>Kind</th><th>Target</th><th>Per spin</th><th>Reward</th><th></th></tr></thead>
    <tbody>${targetRows}</tbody>
  </table></div>
  <p class="muted" style="font-size:12.5px">"Per spin" is the target divided by ${G.CONFIG.spins} spins: what an average spin needs to score to clear the round without holds or nudges. High Roller multiplies every target by ×1.25.</p>
</section>

<!-- CODE -->
<section class="panel" id="code">
  <div class="section-head"><h2>Code</h2><span class="count">${files.length} files · ${fmtNum(totalLines)} lines</span></div>
  <div class="table-wrap"><table>
    <thead><tr><th>File</th><th>Lines</th><th>Size</th><th>What it does</th></tr></thead>
    <tbody>${files.map((f) => `<tr data-search="${esc(f.path.toLowerCase())}">
      <td><code>${f.path}</code></td><td class="num">${fmtNum(f.lines)}</td><td class="num">${(f.bytes / 1024).toFixed(1)} KB</td>
      <td class="muted">${esc(FILE_NOTES[f.path] || '')}</td></tr>`).join('')}</tbody>
  </table></div>
</section>
</div>

<footer>Tilt by Samderverse · codex generated from the source, v${VERSION}</footer>

<script>
const CLIP_DATA = ${JSON.stringify(Object.fromEntries(Object.entries(clips).map(([k, v]) => [k, v ? v.data : null])))};

// Tabs
const tabs = document.getElementById('tabs');
const panels = [...document.querySelectorAll('.panel')];
tabs.addEventListener('click', (e) => {
  const b = e.target.closest('.tab');
  if (!b) return;
  tabs.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t === b));
  panels.forEach((p) => p.classList.toggle('on', p.id === b.dataset.tab));
  window.scrollTo({ top: 0 });
  applyFilters();
});

// Search across everything with a data-search attribute
const q = document.getElementById('q');
const noresult = document.getElementById('noresult');
let rarity = 'all', tier = 'all';

function applyFilters() {
  const term = q.value.trim().toLowerCase();
  const panel = document.querySelector('.panel.on');
  let shown = 0, total = 0;
  panels.forEach((p) => {
    p.querySelectorAll('[data-search]').forEach((n) => {
      const hitText = !term || n.dataset.search.includes(term);
      const hitRarity = !n.dataset.rarity || rarity === 'all' || n.dataset.rarity === rarity;
      const hitTier = !n.dataset.tier || tier === 'all' || n.dataset.tier === tier;
      const ok = hitText && hitRarity && hitTier;
      n.classList.toggle('hide', !ok);
      if (p === panel) { total++; if (ok) shown++; }
    });
  });
  noresult.classList.toggle('on', total > 0 && shown === 0);
}
q.addEventListener('input', applyFilters);

document.getElementById('rarity-filters').addEventListener('click', (e) => {
  const b = e.target.closest('.chip'); if (!b) return;
  rarity = b.dataset.rarity;
  e.currentTarget.querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c === b));
  applyFilters();
});
document.getElementById('tier-filters').addEventListener('click', (e) => {
  const b = e.target.closest('.chip'); if (!b) return;
  tier = b.dataset.tier;
  e.currentTarget.querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c === b));
  applyFilters();
});

// Sound preview, straight from the embedded base64
let current = null;
document.addEventListener('click', (e) => {
  const b = e.target.closest('.play'); if (!b) return;
  const data = CLIP_DATA[b.dataset.clip]; if (!data) return;
  if (current) { current.el.pause(); current.btn.classList.remove('playing'); }
  const a = new Audio('data:audio/mpeg;base64,' + data);
  b.classList.add('playing');
  current = { el: a, btn: b };
  a.addEventListener('ended', () => b.classList.remove('playing'));
  a.play().catch(() => b.classList.remove('playing'));
});
</script>
</body>
</html>`;

writeFileSync(OUT, html);
const kb = (statSync(OUT).size / 1024).toFixed(0);
console.log(`Wrote ${OUT} (${kb} KB)`);
console.log(`${counts.regulars} Regulars · ${counts.bosses} Landlords · ${counts.sounds} clips · ${files.length} files`);
