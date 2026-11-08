'use strict';
/* Sternenstaub – Spiellogik & Oberfläche */

const SAVE_KEY = 'sternenstaub-v1';
const VERSION = '1.2';
const $ = s => document.querySelector(s);
const el = {
  dust: $('#dust'), rate: $('#rate'), tapv: $('#tapv'), buffs: $('#buffs'), stage: $('#stage'), hint: $('#hint'),
  list: $('#list'), title: $('#ptitle'), seg: $('#seg'), tabs: $('#tabs'), dotUp: $('#dotUp'), dotNova: $('#dotNova'),
  shoot: $('#shoot'), toasts: $('#toasts'), modal: $('#modal'), sheet: $('#sheet'),
};
const STANDALONE = navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);

/* ======================= Spielstand ======================= */
function fresh() {
  const t = Date.now();
  return {
    v: 1, dust: 0, runEarned: 0, totalEarned: 0, taps: 0, tapEarned: 0,
    gens: GENS.map(() => 0), ups: {}, ach: {}, cores: 0, novas: 0, starsCaught: 0, buffs: [],
    last: t, created: t, runStart: t, played: 0, nextStar: t + 30000, buyAmt: 1,
    set: { sound: true, haptic: true, sci: false },
  };
}
function migrate(o) {
  const s = Object.assign(fresh(), o);
  s.set = Object.assign(fresh().set, o.set || {});
  s.gens = GENS.map((_, i) => (o.gens && +o.gens[i]) || 0);
  s.ups = o.ups || {}; s.ach = o.ach || {};
  s.buffs = Array.isArray(o.buffs) ? o.buffs : [];
  return s;
}
function load() { try { const raw = localStorage.getItem(SAVE_KEY); return raw ? migrate(JSON.parse(raw)) : null; } catch (e) { return null; } }
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }
const hadSave = (() => { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } })();
let S = load() || fresh();

/* ======================= Werte ======================= */
const D = {};
function recalc() {
  D.genMult = GENS.map(() => 1); D.global = 1; D.tapMult = 1; D.tapPct = 0;
  D.starFreq = 1; D.starLife = 1; D.buffDur = 1; D.offEff = 0.5; D.offCap = 4; D.costMult = 1; D.autoTap = 0;
  for (const u of UPGRADES) if (S.ups[u.id]) apply(u);
  for (const m of MILESTONES) if (S.cores >= m.cores) apply(m);
  D.achCount = Object.keys(S.ach).length;
  D.global *= (1 + 0.02 * S.cores) * (1 + 0.01 * D.achCount);
  D.offEff = Math.min(1, D.offEff);
}
function apply(u) {
  if (u.kind === 'gen') D.genMult[u.gen] *= 2;
  const e = u.eff; if (!e) return;
  if (e.tapMult) D.tapMult *= e.tapMult;
  if (e.tapPct) D.tapPct += e.tapPct;
  if (e.global) D.global *= e.global;
  if (e.starFreq) D.starFreq *= e.starFreq;
  if (e.starLife) D.starLife *= e.starLife;
  if (e.buffDur) D.buffDur *= e.buffDur;
  if (e.offEff) D.offEff += e.offEff;
  if (e.offCap) D.offCap = Math.max(D.offCap, e.offCap);
  if (e.costMult) D.costMult *= e.costMult;
  if (e.autoTap) D.autoTap += e.autoTap;
}

function buffMult(k) { const t = Date.now(); let m = 1; for (const b of S.buffs) if (b.until > t && b[k]) m *= b[k]; return m; }
function genRate(i) { return GENS[i].rate * D.genMult[i] * D.global; }
function baseRate() { let r = 0; for (let i = 0; i < GENS.length; i++) if (S.gens[i]) r += S.gens[i] * genRate(i); return r; }
function rate() { return baseRate() * buffMult('prod'); }
function tapValue() { return (D.tapMult + D.tapPct * rate()) * buffMult('tap'); }
function earn(x) { S.dust += x; S.runEarned += x; S.totalEarned += x; }
function canPay(c) { return S.dust >= c * (1 - 1e-9); }
function pay(c) { S.dust = Math.max(0, S.dust - c); }

function unitCost(i) { return GENS[i].cost * D.costMult * Math.pow(1.15, S.gens[i]); }
// Kosten immer auf ganze Zahlen aufrunden (sonst zeigt 9,999… als „9“ an)
function costOf(i, n) {
  const c = n === 1 ? unitCost(i) : unitCost(i) * (Math.pow(1.15, n) - 1) / 0.15;
  return Math.ceil(c * (1 - 1e-12));
}
function maxAfford(i) { return Math.max(0, Math.floor(Math.log(S.dust * 0.15 / unitCost(i) + 1) / Math.log(1.15))); }
function buyCount(i) { return S.buyAmt === 'max' ? Math.max(1, maxAfford(i)) : S.buyAmt; }

// Sternfarbe je nach Fortschritt: Gold → Orange → Rosa → Magenta → Violett → Blau → Cyan und zurück (ohne Grün)
const ORB_HUES = [48, 22, -20, -60, -95, -135, -165];
function orbHue(earned) {
  const n = ORB_HUES.length - 1, p = (Math.log10(earned + 1) / 2) % (2 * n);
  const q = p <= n ? p : 2 * n - p, i = Math.min(n - 1, Math.floor(q));
  return ORB_HUES[i] + (ORB_HUES[i + 1] - ORB_HUES[i]) * (q - i);
}

const coreTotal = e => Math.floor(Math.sqrt(e / 1e8));
const coreGain = () => Math.max(0, coreTotal(S.totalEarned) - S.cores);

/* ======================= Aktionen ======================= */
function tapAt(x, y, manual) {
  const v = tapValue();
  earn(v);
  if (manual) {
    S.taps++; S.tapEarned += v;
    SND.tap(); HAP.fire();
    if (S.taps >= 5) el.hint.classList.add('gone');
  }
  FX.tap(x, y, '+' + fmtR(v), manual);
}

function buyGen(i, row) {
  const n = buyCount(i), c = costOf(i, n);
  if (!canPay(c)) return nope(row);
  pay(c); S.gens[i] += n;
  FX.setRings(S.gens);
  SND.buy(); HAP.fire(true); flash(row); burstAt(row);
  renderList(); save();
}

function buyUp(id, row) {
  const u = UPS_BY_ID[id];
  if (!u || S.ups[id]) return;
  if (!canPay(u.cost)) return nope(row);
  pay(u.cost); S.ups[id] = 1;
  recalc();
  SND.up(); HAP.fire(true); burstAt(row);
  renderList(); save();
}

function nope(row) {
  if (row && row.animate) row.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 220 });
}
function flash(row) { if (!row) return; row.classList.remove('flash'); void row.offsetWidth; row.classList.add('flash'); }
function burstAt(row) { if (!row) return; const r = row.getBoundingClientRect(); FX.burst(r.left + 35, r.top + r.height / 2, 16); }

/* ---------- Sternschnuppen ---------- */
let star = null;
function scheduleStar() { S.nextStar = Date.now() + (55 + Math.random() * 80) * 1000 / D.starFreq; }
function spawnStar() {
  // Nur im Himmel fliegen – zwischen Anzeige oben und Panel unten, nie über die Liste
  const W = innerWidth, st = el.stage.getBoundingClientRect(), fromLeft = Math.random() < 0.5;
  // 56px Abstand: das gedrehte 76px-Tippfeld ist diagonal bis zu ~54px „halb breit“
  const minY = st.top + 24, maxY = Math.max(minY + 40, st.bottom - 56);
  const y0 = minY + Math.random() * (maxY - minY) * 0.6;
  star = {
    x0: fromLeft ? -40 : W + 40, x1: fromLeft ? W + 40 : -40, y0, y1: y0 + Math.random() * (maxY - y0), minY, maxY,
    t0: performance.now(), dur: (8000 + Math.random() * 3000) * D.starLife, x: -100, y: -100,
  };
  el.shoot.hidden = false;
}
function updateStar() {
  if (!star) {
    if (Date.now() >= S.nextStar && el.modal.hidden) spawnStar();
    return;
  }
  const p = (performance.now() - star.t0) / star.dur;
  if (p >= 1) { star = null; el.shoot.hidden = true; scheduleStar(); return; }
  star.x = star.x0 + (star.x1 - star.x0) * p;
  star.y = Math.min(star.maxY, Math.max(star.minY, star.y0 + (star.y1 - star.y0) * p + Math.sin(p * Math.PI * 3) * 18));
  el.shoot.style.transform = `translate(${star.x - 38}px, ${star.y - 38}px) rotate(${p * 540}deg)`;
  FX.trail(star.x, star.y);
}
function pick(list) { let r = Math.random() * list.reduce((a, b) => a + b.w, 0); for (const e of list) if ((r -= e.w) < 0) return e; return list[0]; }
function catchStar() {
  if (!star) return;
  const { x, y } = star;
  star = null; el.shoot.hidden = true; scheduleStar();
  S.starsCaught++;
  FX.burst(x, y, 60, 45, 1.6); SND.star(); HAP.fire(true);
  const e = pick(STAR_EFFECTS);
  if (e.id === 'fund') {
    const g = Math.max(rate() * 600, tapValue() * 40, 25);
    earn(g); FX.float(x, y + 30, '+' + fmt(g), true);
    toast(`🌠 <b>Sternenfund!</b><small>+${fmt(g)} Sternenstaub</small>`);
  } else {
    const dur = e.dur * D.buffDur;
    S.buffs = S.buffs.filter(b => b.id !== e.id);
    S.buffs.push({ id: e.id, ico: e.ico, name: e.name, prod: e.prod || 0, tap: e.tap || 0, until: Date.now() + dur * 1000 });
    toast(`🌠 <b>${e.name}!</b><small>${e.desc} für ${Math.round(dur)} Sekunden</small>`);
  }
  renderBuffs(); checkAch(); save();
}

/* ---------- Erfolge ---------- */
function checkAch() {
  const r = baseRate(), got = [];
  for (const a of ACH) if (!S.ach[a.id] && a.test(S, r)) { S.ach[a.id] = Date.now(); got.push(a); }
  if (!got.length) return;
  recalc();
  got.slice(0, 2).forEach(a => toast(`🏆 <b>${a.name}</b><small>+1 % Produktion</small>`));
  if (got.length > 2) toast(`🏆 <b>+${got.length - 2} weitere Erfolge</b>`);
  SND.ach(); save();
}

/* ---------- Offline ---------- */
function offline(sec) {
  const used = Math.min(sec, D.offCap * 3600);
  const gain = baseRate() * used * D.offEff;
  if (gain <= 0) return;
  earn(gain);
  if (sec < 60) return;
  modal(`<div class="em">🌙</div><h3>Willkommen zurück!</h3>
    <p>Du warst <b>${fmtTime(sec)}</b> weg. Deine Erzeuger haben weitergesammelt:</p>
    <div class="big">+${fmt(gain)} ✦</div>
    <p class="note">${Math.round(D.offEff * 100)} % Effizienz · max. ${D.offCap} Std.${sec > D.offCap * 3600 ? ' (Limit erreicht)' : ''}</p>
    <button class="btn" data-m="close">Einsammeln ✨</button>`);
}

/* ---------- Supernova ---------- */
function confirmNova() {
  const g = coreGain();
  if (g < 1) return;
  modal(`<div class="em">💥</div><h3>Supernova auslösen?</h3>
    <p>Dein Stern explodiert und wird neu geboren. Sternenstaub, Erzeuger und Upgrades gehen verloren – dafür bekommst du</p>
    <div class="big">+${fmt(g)} 💠</div>
    <p>Danach: <b>+${fmt((S.cores + g) * 2)} %</b> Produktion für immer.</p>
    <button class="btn" data-m="go">Ja, explodieren!</button>
    <button class="btn ghost" data-m="close">Noch nicht</button>`, k => { if (k === 'go') { closeModal(); doNova(); } });
}
function doNova() {
  const g = coreGain();
  if (g < 1) return;
  const keep = {
    totalEarned: S.totalEarned, taps: S.taps, tapEarned: S.tapEarned, ach: S.ach, cores: S.cores + g, novas: S.novas + 1,
    starsCaught: S.starsCaught, created: S.created, played: S.played, set: S.set, buyAmt: S.buyAmt,
  };
  S = Object.assign(fresh(), keep);
  recalc();
  if (MILESTONES.some(m => m.start && S.cores >= m.cores)) { S.gens[0] = 10; S.gens[1] = 5; }
  scheduleStar();
  FX.nova(); FX.setRings(S.gens); SND.nova(); HAP.fire(true);
  listKey = ''; renderList(); renderBuffs(); save();
  setTimeout(() => toast(`💠 <b>Supernova!</b><small>Du besitzt jetzt ${fmt(S.cores)} Sternkerne.</small>`), 900);
  checkAch();
}

/* ---------- Spielstand sichern ---------- */
function encode() { return btoa(unescape(encodeURIComponent(JSON.stringify(S)))); }
function decode(str) { return JSON.parse(decodeURIComponent(escape(atob(str.trim())))); }
function exportSave() {
  const code = encode();
  const show = () => modal(`<div class="em">📤</div><h3>Spielstand</h3><p>Kopiere diesen Code und bewahre ihn gut auf (z. B. in Notizen):</p>
    <textarea readonly>${code}</textarea><button class="btn" data-m="close">Fertig</button>`);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code).then(() => toast('📋 <b>Spielstand kopiert</b><small>Füge ihn z. B. in Notizen ein.</small>'), show);
  } else show();
}
function importSave() {
  modal(`<div class="em">📥</div><h3>Spielstand laden</h3><p>Füge deinen exportierten Code ein. Der aktuelle Spielstand wird ersetzt.</p>
    <textarea id="imp" placeholder="Code hier einfügen"></textarea>
    <button class="btn" data-m="load">Laden</button><button class="btn ghost" data-m="close">Abbrechen</button>`, k => {
    if (k !== 'load') return;
    try {
      const o = decode($('#imp').value);
      if (!o || !Array.isArray(o.gens)) throw new Error('ungültig');
      S = migrate(o); S.last = Date.now();
      afterStateChange();
      closeModal(); toast('✅ <b>Spielstand geladen</b>');
    } catch (e) { toast('⚠️ <b>Der Code ist ungültig</b>'); }
  });
}
function confirmReset() {
  modal(`<div class="em">🗑️</div><h3>Alles zurücksetzen?</h3><p>Dein gesamter Fortschritt – inklusive Sternkernen und Erfolgen – wird <b>unwiderruflich</b> gelöscht.</p>
    <button class="btn danger" data-m="go">Ja, alles löschen</button><button class="btn ghost" data-m="close">Abbrechen</button>`, k => {
    if (k !== 'go') return;
    S = fresh();
    afterStateChange();
    el.hint.classList.remove('gone');
    closeModal(); toast('✨ <b>Neuer Himmel, neues Glück</b>');
  });
}
function afterStateChange() {
  star = null; el.shoot.hidden = true;
  recalc(); applySettings(); FX.setRings(S.gens);
  setAmt(S.buyAmt); listKey = ''; renderList(); renderBuffs(); save();
}

function toggleSet(k) { S.set[k] = !S.set[k]; applySettings(); listKey = ''; renderList(); save(); }
function applySettings() { SND.setOn(S.set.sound); HAP.setOn(S.set.haptic); NUM.sci = S.set.sci; hudCache.d = hudCache.r = hudCache.t = ''; }

/* ======================= Oberfläche ======================= */
function put(node, html) { if (node && node._h !== html) { node._h = html; node.innerHTML = html; } }

function toast(html) {
  const t = document.createElement('div');
  t.className = 'toast'; t.innerHTML = html;
  el.toasts.appendChild(t);
  while (el.toasts.children.length > 3) el.toasts.firstChild.remove();
  setTimeout(() => t.remove(), 3800);
}

let modalCb = null;
function modal(html, cb) { el.sheet.innerHTML = html; el.modal.hidden = false; modalCb = cb || null; }
function closeModal() { el.modal.hidden = true; el.sheet.innerHTML = ''; modalCb = null; }
el.modal.addEventListener('click', e => {
  const b = e.target.closest('[data-m]');
  if (!b) return;
  SND.unlock();
  if (b.dataset.m === 'close') closeModal(); else if (modalCb) modalCb(b.dataset.m);
});

const hudCache = { d: '', r: '', t: '' };
function hud() {
  const d = fmt(S.dust), r = fmtR(rate()), t = fmtR(tapValue());
  if (d !== hudCache.d) { hudCache.d = d; el.dust.textContent = d; }
  if (r !== hudCache.r) { hudCache.r = r; el.rate.textContent = r; }
  if (t !== hudCache.t) { hudCache.t = t; el.tapv.textContent = t; }
}

function renderBuffs() {
  const t = Date.now();
  S.buffs = S.buffs.filter(b => b.until > t);
  const ids = S.buffs.map(b => b.id).join();
  if (ids !== el.buffs._ids) {
    el.buffs._ids = ids;
    el.buffs.innerHTML = S.buffs.map(b => `<span class="buff ${b.tap ? 'tap' : ''}"></span>`).join('');
  }
  S.buffs.forEach((b, i) => {
    const txt = `${b.ico} ${b.name} · ${Math.ceil((b.until - t) / 1000)} s`;
    const n = el.buffs.children[i];
    if (n && n.textContent !== txt) n.textContent = txt;
  });
}

/* ---------- Listen ---------- */
let tab = 'gens', listKey = '';
const TITLES = { gens: 'Erzeuger', ups: 'Upgrades', ach: 'Erfolge', nova: 'Supernova', more: 'Mehr' };
const BUILD = {}, UPDATE = {}, KEY = {};

function revealed() { let n = 1; GENS.forEach((g, i) => { if (S.gens[i] > 0 || S.runEarned >= g.cost * 0.3) n = i + 1; }); return n; }
function visibleUps() {
  return UPGRADES.filter(u => !S.ups[u.id] && (u.kind === 'gen' ? S.gens[u.gen] >= u.need : S.runEarned >= u.cost * 0.25))
    .sort((a, b) => a.cost - b.cost);
}

// Erzeuger
KEY.gens = () => revealed() + '|' + NUM.sci;
BUILD.gens = () => {
  const n = revealed();
  let h = '';
  for (let i = 0; i < Math.min(n + 1, GENS.length); i++) {
    const g = GENS[i];
    if (i < n) {
      h += `<div class="row act" data-act="gen" data-i="${i}"><div class="ico">${g.ico}</div>
        <div class="info"><div class="nm">${g.name}</div><div class="ds"></div><div class="cost"></div></div>
        <div class="cnt"></div><div class="prog"></div></div>`;
    } else {
      h += `<div class="row locked no"><div class="ico">❔</div><div class="info"><div class="nm">???</div>
        <div class="ds">Noch unentdeckt</div><div class="cost">✦ ${fmt(g.cost * D.costMult)}</div></div></div>`;
    }
  }
  return h;
};
UPDATE.gens = () => {
  for (const r of el.list.querySelectorAll('.row[data-i]')) {
    const i = +r.dataset.i, n = buyCount(i), c = costOf(i, n), ok = canPay(c), own = S.gens[i];
    r.classList.toggle('ok', ok); r.classList.toggle('no', !ok);
    put(r.querySelector('.cost'), `✦ ${fmt(c)}${n > 1 ? `<span class="x">für ${n}</span>` : ''}`);
    put(r.querySelector('.ds'), own ? `+${fmtR(genRate(i))}/s je · ${fmtR(genRate(i) * own)}/s gesamt` : GENS[i].desc);
    put(r.querySelector('.cnt'), own ? fmt(own) : '');
    const w = Math.min(100, S.dust / c * 100).toFixed(1) + '%';
    const p = r.querySelector('.prog');
    if (p.style.width !== w) p.style.width = w;
  }
};

// Upgrades
KEY.ups = () => visibleUps().map(u => u.id).join() + '|' + NUM.sci;
BUILD.ups = () => {
  const list = visibleUps(), bought = Object.keys(S.ups).length;
  let h = `<p class="note" style="padding:2px 4px">${bought} von ${UPGRADES.length} gekauft</p>`;
  if (!list.length) return h + `<div class="empty">✨ Gerade keine Upgrades verfügbar.<br>Sammle weiter Sternenstaub und kaufe Erzeuger!</div>`;
  for (const u of list) {
    h += `<div class="row act" data-act="up" data-id="${u.id}" data-c="${u.cost}"><div class="ico">${u.ico}</div>
      <div class="info"><div class="nm">${u.name}</div><div class="ds">${u.desc}</div><div class="cost">✦ ${fmt(u.cost)}</div></div></div>`;
  }
  return h;
};
UPDATE.ups = () => {
  for (const r of el.list.querySelectorAll('.row[data-c]')) {
    const ok = canPay(+r.dataset.c);
    r.classList.toggle('ok', ok); r.classList.toggle('no', !ok);
  }
};

// Erfolge
KEY.ach = () => D.achCount + '|' + NUM.sci;
BUILD.ach = () => {
  const n = D.achCount;
  let h = `<div class="card hero"><div class="big">🏆 ${n} / ${ACH.length}</div>
    <p>Jeder Erfolg erhöht deine Produktion dauerhaft um 1 % – aktuell <b>+${n} %</b>.</p></div>`;
  for (const a of ACH) {
    const d = !!S.ach[a.id];
    h += `<div class="row ${d ? 'done' : 'todo'}"><div class="ico">${a.ico}</div>
      <div class="info"><div class="nm">${a.name}</div><div class="ds wrap">${a.desc()}</div></div>${d ? '<div class="chk">✓</div>' : ''}</div>`;
  }
  return h;
};
UPDATE.ach = () => {};

// Supernova
KEY.nova = () => S.cores + '|' + S.novas + '|' + NUM.sci;
BUILD.nova = () => {
  let h = `<div class="card hero"><p style="margin:0">Eine Supernova bringt dir jetzt</p><div class="big" data-f="gain"></div>
    <button class="btn" data-act="nova" data-f="btn">💥 Supernova auslösen</button>
    <div class="bar"><i data-f="bar"></i></div><p data-f="next"></p></div>
    <div class="card"><h3>💠 Deine Sternkerne</h3>
      <div class="kv"><span>Sternkerne</span><b>${fmt(S.cores)}</b></div>
      <div class="kv"><span>Bonus (2 % je Kern)</span><b>+${fmt(S.cores * 2)} % Produktion</b></div>
      <p class="note" style="margin-top:8px">Eine Supernova setzt Sternenstaub, Erzeuger und Upgrades zurück. Erfolge, Sternkerne und Statistik bleiben erhalten.</p></div>
    <div class="card"><h3>Meilensteine</h3>`;
  MILESTONES.forEach((m, i) => {
    const got = S.cores >= m.cores;
    h += `<div class="ms ${got ? 'got' : ''} ${i ? '' : 'first'}"><div class="mi">${got ? '✓' : '💠'} ${fmt(m.cores)}</div>
      <div><b>${m.name}</b><div class="md">${m.desc}</div></div></div>`;
  });
  return h + '</div>';
};
UPDATE.nova = () => {
  const g = coreGain(), tot = coreTotal(S.totalEarned);
  const lo = tot * tot * 1e8, hi = (tot + 1) * (tot + 1) * 1e8;
  const f = k => el.list.querySelector(`[data-f="${k}"]`);
  put(f('gain'), `+${fmt(g)} 💠`);
  put(f('next'), `Nächster Kern bei insgesamt ${fmt(hi)} gesammeltem Sternenstaub`);
  const w = Math.max(0, Math.min(100, (S.totalEarned - lo) / (hi - lo) * 100)).toFixed(1) + '%';
  const bar = f('bar'); if (bar && bar.style.width !== w) bar.style.width = w;
  const btn = f('btn'); if (btn) btn.disabled = g < 1;
};

// Mehr
KEY.more = () => JSON.stringify(S.set);
BUILD.more = () => {
  const tg = (k, label) => `<button class="tg ${S.set[k] ? 'on' : ''}" data-act="set" data-k="${k}"><span>${label}</span><span class="sw"></span></button>`;
  const kv = (k, label) => `<div class="kv"><span>${label}</span><b data-f="${k}"></b></div>`;
  return (STANDALONE ? '' : `<div class="card"><h3>📲 Als App installieren</h3><p class="note">Öffne diese Seite in <b>Safari</b>, tippe auf <b>Teilen</b> und dann auf <b>„Zum Home-Bildschirm“</b>. Danach startet Sternenstaub wie eine App – auch ganz ohne Internet.</p></div>`)
    + `<div class="card"><h3>Einstellungen</h3>${tg('sound', '🔊 Töne')}${tg('haptic', '📳 Vibration')}${tg('sci', '🔢 Wissenschaftliche Zahlen')}</div>
    <div class="card"><h3>Statistik</h3>
      ${kv('total', 'Insgesamt gesammelt')}${kv('run', 'In dieser Runde')}${kv('rate', 'Produktion')}${kv('mult', 'Gesamt-Multiplikator')}
      ${kv('taps', 'Tipps')}${kv('tapE', 'Durch Tippen gesammelt')}${kv('stars', 'Sternschnuppen gefangen')}${kv('novas', 'Supernovas')}
      ${kv('off', 'Offline-Ertrag')}${kv('time', 'Aktive Spielzeit')}</div>
    <div class="card"><h3>Spielstand</h3><p class="note">Dein Fortschritt wird automatisch auf diesem Gerät gespeichert. Exportiere ihn ab und zu als Sicherung.</p>
      <button class="btn ghost" data-act="export">📤 Exportieren</button>
      <button class="btn ghost" data-act="import">📥 Importieren</button>
      <button class="btn danger" data-act="reset">Alles zurücksetzen</button></div>
    <p class="note" style="text-align:center;margin:14px 0 4px">Sternenstaub ${VERSION} · offline spielbar<br>
      <span style="font-size:11px;opacity:.55">Anzeige ${VIEW.h} · i${VIEW.inner} c${VIEW.client} v${VIEW.vh} s${VIEW.scr}${STANDALONE ? ' · App' : ''}</span></p>`;
};
UPDATE.more = () => {
  const f = (k, v) => put(el.list.querySelector(`[data-f="${k}"]`), v);
  f('total', fmt(S.totalEarned)); f('run', fmt(S.runEarned)); f('rate', fmtR(rate()) + '/s');
  f('mult', '×' + fmtR(D.global)); f('taps', fmt(S.taps)); f('tapE', fmt(S.tapEarned));
  f('stars', fmt(S.starsCaught)); f('novas', fmt(S.novas));
  f('off', `${Math.round(D.offEff * 100)} % · max. ${D.offCap} Std.`); f('time', fmtTime(S.played));
};

function renderList() {
  const key = KEY[tab]();
  if (key !== listKey) { listKey = key; el.list.innerHTML = BUILD[tab](); }
  UPDATE[tab]();
}

function setTab(t) {
  tab = t;
  for (const b of el.tabs.querySelectorAll('button')) b.classList.toggle('on', b.dataset.tab === t);
  el.title.textContent = TITLES[t];
  el.seg.hidden = t !== 'gens';
  listKey = ''; el.list.scrollTop = 0;
  renderList(); dots();
}
function setAmt(a) {
  S.buyAmt = a;
  for (const b of el.seg.querySelectorAll('button')) b.classList.toggle('on', b.dataset.amt === String(a));
  if (tab === 'gens') UPDATE.gens();
}

function dots() {
  el.dotUp.classList.toggle('show', tab !== 'ups' && visibleUps().some(u => canPay(u.cost)));
  const g = coreGain();
  el.dotNova.classList.toggle('show', tab !== 'nova' && g >= 1 && g >= Math.max(3, S.cores * 0.5));
}

/* ======================= Eingaben ======================= */
el.stage.addEventListener('pointerdown', e => {
  e.preventDefault();
  SND.unlock();
  tapAt(e.clientX, e.clientY, true);
}, { passive: false });

el.shoot.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); SND.unlock(); catchStar(); }, { passive: false });

el.tabs.addEventListener('click', e => {
  const b = e.target.closest('button[data-tab]');
  if (b && b.dataset.tab !== tab) { SND.unlock(); setTab(b.dataset.tab); }
});
el.seg.addEventListener('click', e => {
  const b = e.target.closest('button[data-amt]');
  if (b) setAmt(b.dataset.amt === 'max' ? 'max' : +b.dataset.amt);
});
el.list.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  SND.unlock();
  const a = b.dataset.act;
  if (a === 'gen') buyGen(+b.dataset.i, b);
  else if (a === 'up') buyUp(b.dataset.id, b);
  else if (a === 'nova') confirmNova();
  else if (a === 'set') toggleSet(b.dataset.k);
  else if (a === 'export') exportSave();
  else if (a === 'import') importSave();
  else if (a === 'reset') confirmReset();
});

// Ton auf iOS erst nach einer Berührung freischalten
['touchend', 'click'].forEach(ev => document.addEventListener(ev, () => SND.unlock(), { passive: true }));
// Zoom-Gesten und Doppeltipp-Zoom verhindern
['gesturestart', 'gesturechange', 'dblclick'].forEach(ev => document.addEventListener(ev, e => e.preventDefault(), { passive: false }));

// iOS-Home-Bildschirm-Apps (Statusleiste „black-translucent“) zeichnen ab der Bildschirmoberkante,
// melden aber eine um die Statusleiste zu kurze Layout-Höhe – innerHeight schrumpft kurz nach dem
// Start ebenfalls mit. Verlässlich sind dort Bildschirmhöhe bzw. 100vh. Nur übernehmen, wenn die
// Abweichung wie eine Statusleiste aussieht (≤ 80px), damit z. B. iPad-Split-View nicht überläuft.
const vhProbe = document.createElement('div');
vhProbe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100vh;visibility:hidden;pointer-events:none';
document.body.appendChild(vhProbe);
const VIEW = {};
function measureHeight() {
  const inner = window.innerHeight, client = document.documentElement.clientHeight;
  const vh = Math.round(vhProbe.getBoundingClientRect().height);
  const portrait = window.innerWidth <= Math.max(inner, client);
  const scr = portrait ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height);
  let h = Math.max(inner, client);
  if (STANDALONE) for (const c of [scr, vh]) if (c > h && c - h <= 80) h = c;
  Object.assign(VIEW, { inner, client, vh, scr, h });
  return h;
}

let fitKey = '';
function fitViewport() {
  const h = measureHeight();
  const key = window.innerWidth + 'x' + h;
  if (key === fitKey) return;
  fitKey = key;
  document.documentElement.style.setProperty('--app-h', h + 'px');
  FX.resize();
}

document.addEventListener('visibilitychange', () => { if (document.hidden) save(); else fitViewport(); });
window.addEventListener('pagehide', save);
window.addEventListener('resize', fitViewport);
window.addEventListener('orientationchange', () => setTimeout(fitViewport, 300));
if ('ResizeObserver' in window) new ResizeObserver(() => FX.layout()).observe(el.stage);

/* ======================= Spielschleife ======================= */
let acc = { ui: 0, ach: 0, save: 0, auto: 0 };
function frame(ms) {
  const now = Date.now(), dt = (now - S.last) / 1000;
  S.last = now;
  if (dt > 10) offline(dt);
  else if (dt > 0) {
    earn(rate() * dt);
    S.played += dt;
    acc.ui += dt; acc.ach += dt; acc.save += dt;
    if (D.autoTap) {
      acc.auto += dt;
      const step = 1 / D.autoTap;
      for (let k = 0; acc.auto >= step && k < 10; k++) {
        acc.auto -= step;
        tapAt(FX.orb.x + (Math.random() - 0.5) * FX.orb.r, FX.orb.y + (Math.random() - 0.5) * FX.orb.r, false);
      }
      if (acc.auto > 1) acc.auto = 0;
    }
  }
  updateStar();
  hud();
  if (acc.ui >= 0.2) { acc.ui = 0; renderList(); renderBuffs(); dots(); }
  if (acc.ach >= 0.5) { acc.ach = 0; checkAch(); }
  if (acc.save >= 5) { acc.save = 0; save(); }
  FX.setHue(orbHue(S.runEarned));
  FX.draw(ms / 1000);
  requestAnimationFrame(frame);
}

/* ======================= Start ======================= */
recalc();
applySettings();
fitViewport();
// iOS ändert die gemeldete Höhe kurz nach dem Start teils ohne resize-Ereignis
[300, 1000, 2500].forEach(ms => setTimeout(fitViewport, ms));
FX.setRings(S.gens);
FX.orb.hue = FX.orb.hueT = orbHue(S.runEarned);
if (S.taps >= 5) el.hint.classList.add('gone');
setAmt(S.buyAmt);
setTab('gens');
renderBuffs();
if (!hadSave) {
  modal(`<div class="em">✨</div><h3>Sternenstaub</h3>
    <p>Tippe auf den Stern, um Sternenstaub zu sammeln. Kaufe Erzeuger, die für dich weitersammeln – sogar, wenn die App geschlossen ist.</p>
    <p style="margin-top:10px">Und halte Ausschau nach <b>Sternschnuppen</b> 🌠</p>
    <button class="btn" data-m="close">Los geht's</button>`);
  save();
}
requestAnimationFrame(frame);

/* ---------- Updates ----------
   1. Service Worker ohne HTTP-Zwischenspeicher prüfen (updateViaCache: 'none') – beim Start und
      jedes Mal, wenn die App wieder in den Vordergrund kommt (iOS startet sie oft nicht neu).
   2. Wechselt der Service Worker, speichern und einmal neu laden.
   3. Rückfallebene: version.json vergleichen. Ist online eine neuere Version, Spielstand sichern,
      Service Worker + Speicher leeren und neu laden. Pro Version nur ein Versuch → keine Schleife. */
const UPD_KEY = 'sternenstaub-update-try';
let swReg = null, lastCheck = 0, updating = false;

async function hardUpdate(version) {
  if (updating) return;
  updating = true;
  try { localStorage.setItem(UPD_KEY, version + '|' + Date.now()); } catch (e) {}
  save();
  toast(`✨ <b>Neue Version ${version}</b><small>wird geladen…</small>`);
  try {
    const regs = navigator.serviceWorker ? await navigator.serviceWorker.getRegistrations() : [];
    await Promise.all(regs.map(r => r.unregister()));
    const keys = window.caches ? await caches.keys() : [];
    await Promise.all(keys.map(k => caches.delete(k)));
  } catch (e) {}
  setTimeout(() => location.reload(), 900);
}

async function checkForUpdate() {
  const now = Date.now();
  if (now - lastCheck < 30000 || !navigator.onLine || !location.protocol.startsWith('http')) return;
  lastCheck = now;
  if (swReg) swReg.update().catch(() => {});
  try {
    const r = await fetch('version.json?t=' + now, { cache: 'no-store' });
    if (!r.ok) return;
    const { version } = await r.json();
    let tried = ''; try { tried = localStorage.getItem(UPD_KEY) || ''; } catch (e) {}
    const [tv, tt] = tried.split('|');
    const recentlyTried = tv === version && now - (+tt || 0) < 15 * 60 * 1000;
    if (version && version !== VERSION && !recentlyTried) hardUpdate(version);
  } catch (e) {}
}

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || updating) return;
    updating = true; save(); location.reload();
  });
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(r => { swReg = r; }).catch(() => {});
}
setTimeout(checkForUpdate, 1500);
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkForUpdate(); });
window.addEventListener('online', checkForUpdate);
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
