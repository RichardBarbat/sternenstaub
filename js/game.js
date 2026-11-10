'use strict';
/* Singularität – Spielstand, Wirtschaft, Oberfläche & Spielschleife */

const SAVE_KEY = 'sternenstaub-v3'; // Adresse & Schlüssel behalten den alten Projektnamen
const NAME = 'Singularität';
const VERSION = '3.6';
const $ = s => document.querySelector(s);
const el = {
  dust: $('#dust'), rate: $('#rate'), tapv: $('#tapv'), buffs: $('#buffs'), stage: $('#stage'), hint: $('#hint'),
  list: $('#list'), title: $('#ptitle'), seg: $('#seg'), tabs: $('#tabs'), dotUp: $('#dotUp'), dotNova: $('#dotNova'), dotAch: $('#dotAch'),
  toasts: $('#toasts'), modal: $('#modal'), sheet: $('#sheet'),
  hunger: $('#hunger'), hungerFill: $('#hungerFill'), hungerTxt: $('#hungerTxt'),
  abil: $('#abil'), capBtn: $('#capBtn'), capN: $('#capN'), capImg: $('#capImg'),
  event: $('#event'), eventTxt: $('#eventTxt'), eventBar: $('#eventBar'), gname: $('#gname'), gbar: $('#gbar'),
};
const STANDALONE = navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);

/* ======================= Spielstand ======================= */
function fresh() {
  const t = Date.now();
  return {
    v: 3, dust: 0, runEarned: 0, totalEarned: 0, taps: 0, tapEarned: 0,
    gens: GENS.map(() => 0), ups: {}, ach: {}, cores: 0, novas: 0, starsCaught: 0, buffs: [],
    prey: 0, crits: 0, frenzies: 0, bosses: 0, rivals: 0, swarms: 0, capsOpened: 0, bought: 0, abUsed: 0, questsDone: 0,
    dm: 0, lab: {}, quest: { day: -1, list: [], bonus: false },
    caps: { c: 0, r: 0, e: 0, l: 0 }, daily: { last: -1, streak: 0, total: 0 }, ab: {}, tips: {},
    stageRun: 0, stageBest: 0,
    last: t, created: t, runStart: t, played: 0, nextStar: t + 40000, buyAmt: 1,
    set: { sound: true, haptic: true, shake: true, sci: false, auto: true, gl: true },
  };
}
function migrate(o) {
  const f = fresh(), s = Object.assign(f, o);
  s.set = Object.assign(fresh().set, o.set || {});
  s.caps = Object.assign(fresh().caps, o.caps || {});
  s.daily = Object.assign(fresh().daily, o.daily || {});
  s.ab = o.ab || {}; s.tips = o.tips || {}; s.lab = o.lab || {};
  s.quest = Object.assign(fresh().quest, o.quest || {});
  s.gens = GENS.map((_, i) => (o.gens && +o.gens[i]) || 0);
  s.ups = o.ups || {}; s.ach = o.ach || {};
  s.buffs = Array.isArray(o.buffs) ? o.buffs : [];
  // Beim Laden nicht nachträglich „wachsen“ feiern
  s.stageRun = Math.max(+o.stageRun || 0, stageOf(s.runEarned));
  s.stageBest = Math.max(+o.stageBest || 0, s.stageRun);
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
  D.preyFreq = 1; D.preyLife = 1; D.buffDur = 1; D.offEff = 0.5; D.offCap = 4; D.costMult = 1; D.autoTap = 0;
  D.preyMult = 1; D.critChance = 0.05; D.critMult = 10; D.rauschGain = 1; D.rauschDur = 10; D.rauschMult = 5;
  D.sogDur = 0; D.jetDur = 0; D.abCd = 1; D.zeitMult = 1; D.eventFreq = 1; D.bossHp = 1;
  for (const u of UPGRADES) if (S.ups[u.id]) apply(u);
  for (const m of MILESTONES) if (S.cores >= m.cores) apply(m);
  D.achCount = Object.keys(S.ach).length;
  // Labor (dauerhafte Forschung)
  const L = k => S.lab[k] || 0;
  D.global *= Math.pow(KRAFT, L('kraft')) * (1 + CORE_BONUS * S.cores) * (1 + 0.01 * D.achCount);
  D.preyMult *= 1 + BEUTE * L('beute'); D.tapPct += 0.005 * L('griff'); D.critChance += 0.01 * L('krit'); D.rauschDur += L('rausch');
  D.offCap += 4 * L('offline'); D.offEff += 0.05 * L('offline'); D.abCd *= Math.pow(0.9, L('tempo'));
  D.autoCatch = AUTO_CATCH[L('auto')] || 0; D.luck = 0.15 * L('gluck'); D.autoBuy = L('kauf');
  D.offEff = Math.min(1, D.offEff);
}
function apply(u) {
  if (u.kind === 'gen') D.genMult[u.gen] *= 2;
  const e = u.eff; if (!e) return;
  if (e.tapMult) D.tapMult *= e.tapMult;
  if (e.tapPct) D.tapPct += e.tapPct;
  if (e.global) D.global *= e.global;
  if (e.preyFreq) D.preyFreq *= e.preyFreq;
  if (e.preyLife) D.preyLife *= e.preyLife;
  if (e.buffDur) D.buffDur *= e.buffDur;
  if (e.offEff) D.offEff += e.offEff;
  if (e.offCap) D.offCap = Math.max(D.offCap, e.offCap);
  if (e.costMult) D.costMult *= e.costMult;
  if (e.autoTap) D.autoTap += e.autoTap;
  if (e.preyMult) D.preyMult *= e.preyMult;
  if (e.critChance) D.critChance += e.critChance;
  if (e.critSet) D.critMult = Math.max(D.critMult, e.critSet);
  if (e.rauschGain) D.rauschGain *= e.rauschGain;
  if (e.rauschDur) D.rauschDur += e.rauschDur;
  if (e.rauschMult) D.rauschMult = Math.max(D.rauschMult, e.rauschMult);
  if (e.sogDur) D.sogDur += e.sogDur;
  if (e.jetDur) D.jetDur += e.jetDur;
  if (e.abCd) D.abCd *= e.abCd;
  if (e.zeitMult) D.zeitMult *= e.zeitMult;
  if (e.eventFreq) D.eventFreq *= e.eventFreq;
  if (e.bossHp) D.bossHp *= e.bossHp;
}

function buffMult(k) { const t = Date.now(); let m = 1; for (const b of S.buffs) if (b.until > t && b[k]) m *= b[k]; return m; }
function buffAdd(k) { const t = Date.now(); let a = 0; for (const b of S.buffs) if (b.until > t && b[k]) a += b[k]; return a; }
function addBuff(b, sec) {
  S.buffs = S.buffs.filter(x => x.id !== b.id);
  S.buffs.push(Object.assign({}, b, { until: Date.now() + sec * 1000 }));
  renderBuffs();
}
function genRate(i) { return GENS[i].rate * D.genMult[i] * D.global; }
function baseRate() { let r = 0; for (let i = 0; i < GENS.length; i++) if (S.gens[i]) r += S.gens[i] * genRate(i); return r; }
function rate() { return baseRate() * buffMult('prod') * ACT.rauschMult(); }
function tapBase() { return (D.tapMult + D.tapPct * baseRate() * buffMult('prod')) * buffMult('tap'); }
function tapValue() { return tapBase() * ACT.rauschMult(); }
function earn(x) { S.dust += x; S.runEarned += x; S.totalEarned += x; }
function canPay(c) { return S.dust >= c * (1 - 1e-9); }
function pay(c) { S.dust = Math.max(0, S.dust - c); }
function syncOrbit() { FX.setOrbit(S.gens, GENS.map((g, i) => S.gens[i] * genRate(i))); }

function unitCost(i) { return GENS[i].cost * D.costMult * Math.pow(1.15, S.gens[i]); }
// Kosten immer auf ganze Zahlen aufrunden (sonst zeigt 9,999… als „9“ an)
function costOf(i, n) {
  const c = n === 1 ? unitCost(i) : unitCost(i) * (Math.pow(1.15, n) - 1) / 0.15;
  return Math.ceil(c * (1 - 1e-12));
}
function maxAfford(i) { return Math.max(0, Math.floor(Math.log(S.dust * 0.15 / unitCost(i) + 1) / Math.log(1.15))); }
// Kaufmenge: feste Anzahl, so viele wie bezahlbar, oder „Rund“ = bis zur nächsten Zehnerzahl (23 → 30, 30 → 40)
function buyCount(i) {
  const a = S.buyAmt;
  if (a === 'max') return Math.max(1, maxAfford(i));
  if (a === 'r10') return 10 - S.gens[i] % 10;
  return a > 0 ? a : 1;
}

const coreTotal = coresFor;
const coreGain = () => Math.max(0, coreTotal(S.totalEarned) - S.cores);
const startMass = () => (S.lab.start ? Math.pow(10, 1 + 2 * S.lab.start) : 0);

/* ======================= Käufe ======================= */
function buyGen(i, row) {
  const n = buyCount(i), c = costOf(i, n);
  if (!canPay(c)) return nope(row);
  pay(c); S.gens[i] += n; S.bought += n;
  syncOrbit();
  SND.buy(); HAP.fire(true); flash(row); burstAt(row);
  if (!S.tips.orbit) { S.tips.orbit = 1; toast(`${GENS[i].ico} <b>${GENS[i].name} im Orbit!</b><small>Füttert dich ab jetzt von selbst</small>`); }
  renderList(); save();
}

function buyUp(id, row) {
  const u = UPS_BY_ID[id];
  if (!u || S.ups[id]) return;
  if (!canPay(u.cost)) return nope(row);
  pay(u.cost); S.ups[id] = 1;
  recalc(); syncOrbit();
  SND.up(); HAP.fire(true); burstAt(row);
  renderList(); save();
}

function buyLab(id, row) {
  const x = LAB_BY_ID[id], l = S.lab[id] || 0;
  if (!x || l >= x.max) return;
  const c = labCost(x, l);
  if (S.dm < c) return nope(row);
  S.dm -= c; S.lab[id] = l + 1;
  recalc(); syncOrbit();
  SND.up(); HAP.fire(true); burstAt(row);
  listKey = ''; renderList(); save();
}

// Labor „Selbstorganisation“: kauft das, was sich am schnellsten bezahlt macht
function autoBuy() {
  if (!D.autoBuy || !S.set.auto) return;
  if (D.autoBuy >= 2) for (const u of visibleUps()) { if (!canPay(u.cost)) break; pay(u.cost); S.ups[u.id] = 1; recalc(); }
  let best = -1, bp = Infinity;
  const n = revealed();
  for (let i = 0; i < n; i++) { const p = unitCost(i) / genRate(i); if (p < bp) { bp = p; best = i; } }
  if (best < 0) return;
  let k = 0;
  while (k < 25 && canPay(costOf(best, 1))) { pay(costOf(best, 1)); S.gens[best]++; S.bought++; k++; }
  if (k) syncOrbit();
}

function nope(row) {
  if (row && row.animate) row.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 220 });
}
function flash(row) { if (!row) return; row.classList.remove('flash'); void row.offsetWidth; row.classList.add('flash'); }
function burstAt(row) { if (!row) return; const r = row.getBoundingClientRect(); FX.burst(r.left + 35, r.top + r.height / 2, 16); }

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
    <p>Du warst <b>${fmtTime(sec)}</b> weg. Dein Orbit hat dich weiter gefüttert:</p>
    <div class="big">+${fmt(gain)} ✦</div>
    <p class="note">${Math.round(D.offEff * 100)} % Effizienz · max. ${D.offCap} Std.${sec > D.offCap * 3600 ? ' (Limit erreicht)' : ''}</p>
    <button class="btn" data-m="close">Verschlingen</button>`);
}

/* ---------- Urknall ---------- */
function confirmNova() {
  const g = coreGain();
  if (g < 1) return;
  modal(`<div class="em">💥</div><h3>Urknall auslösen?</h3>
    <p>Dein Universum stürzt in sich zusammen und beginnt neu. Masse, Orbit und Upgrades gehen verloren – dafür bekommst du</p>
    <div class="big">+${fmt(g)} 💠</div>
    <p>Danach: <b>+${fmt((S.cores + g) * CORE_BONUS * 100)} %</b> Produktion für immer – und ${fmt(S.dm + g)} zum Forschen im Labor.</p>
    <button class="btn" data-m="go">Ja, Urknall!</button>
    <button class="btn ghost" data-m="close">Noch nicht</button>`, k => { if (k === 'go') { closeModal(); doNova(); } });
}
function doNova() {
  const g = coreGain();
  if (g < 1) return;
  const keep = {
    totalEarned: S.totalEarned, taps: S.taps, tapEarned: S.tapEarned, ach: S.ach, cores: S.cores + g, novas: S.novas + 1,
    starsCaught: S.starsCaught, created: S.created, played: S.played, set: S.set, buyAmt: S.buyAmt,
    prey: S.prey, crits: S.crits, frenzies: S.frenzies, bosses: S.bosses, rivals: S.rivals, swarms: S.swarms, capsOpened: S.capsOpened,
    caps: S.caps, daily: S.daily, ab: S.ab, tips: S.tips, stageBest: S.stageBest,
    bought: S.bought, abUsed: S.abUsed, questsDone: S.questsDone, quest: S.quest, dm: S.dm + g, lab: S.lab,
  };
  S = Object.assign(fresh(), keep);
  S.dust = startMass();
  recalc();
  if (MILESTONES.some(m => m.start && S.cores >= m.cores)) { S.gens[0] = 10; S.gens[1] = 5; }
  ACT.reset();
  FX.bigBang(); syncOrbit(); FX.setStage(0); SND.nova(); HAP.burst(4, 90);
  listKey = ''; renderList(); renderBuffs(); save();
  setTimeout(() => toast(`💠 <b>Urknall!</b><small>${fmt(S.dm)} Dunkle Materie fürs Labor</small>`), 900);
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
  modal(`<div class="em">🗑️</div><h3>Alles zurücksetzen?</h3><p>Dein gesamter Fortschritt – inklusive Dunkler Materie, Kapseln und Erfolgen – wird <b>unwiderruflich</b> gelöscht.</p>
    <button class="btn danger" data-m="go">Ja, alles löschen</button><button class="btn ghost" data-m="close">Abbrechen</button>`, k => {
    if (k !== 'go') return;
    S = fresh();
    afterStateChange();
    FX.bigBang();
    el.hint.classList.remove('gone');
    closeModal(); toast('✨ <b>Neues Universum, neues Glück</b>');
  });
}
function afterStateChange() {
  ACT.reset();
  recalc(); applySettings(); syncOrbit();
  setAmt(S.buyAmt); listKey = ''; renderList(); renderBuffs(); ACT.renderCapBtn(); save();
}

function toggleSet(k) { S.set[k] = !S.set[k]; applySettings(); listKey = ''; renderList(); save(); }
function applySettings() {
  SND.setOn(S.set.sound); HAP.setOn(S.set.haptic); FX.setShake(S.set.shake); FX.setGL(S.set.gl !== false); NUM.sci = S.set.sci;
  hudCache.d = hudCache.r = hudCache.t = '';
}

/* ======================= Oberfläche ======================= */
function put(node, html) { if (node && node._h !== html) { node._h = html; node.innerHTML = html; } }

function toast(html) {
  const t = document.createElement('div');
  t.className = 'toast'; t.innerHTML = html;
  el.toasts.appendChild(t);
  while (el.toasts.children.length > 2) el.toasts.firstChild.remove();
  setTimeout(() => t.remove(), 3800);
}

// Dialoge kommen nacheinander (z. B. „Willkommen zurück“, dann Tagesbeute)
let modalCb = null;
const modalQ = [];
function modal(html, cb, replace) {
  if (!el.modal.hidden && !replace) { modalQ.push([html, cb]); return; }
  el.sheet.innerHTML = html; el.modal.hidden = false; modalCb = cb || null;
}
function closeModal() {
  el.modal.hidden = true; el.sheet.innerHTML = ''; modalCb = null;
  if (modalQ.length) { const [h, c] = modalQ.shift(); setTimeout(() => modal(h, c), 280); }
}
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
  const shown = S.buffs.slice(-3); // höchstens drei passen in eine Zeile
  const ids = shown.map(b => b.id).join();
  if (ids !== el.buffs._ids) {
    el.buffs._ids = ids;
    el.buffs.innerHTML = shown.map(b => `<span class="buff ${b.tap ? 'tap' : b.crit ? 'crit' : ''}"></span>`).join('');
  }
  shown.forEach((b, i) => {
    const txt = `${b.ico} ${b.short || b.name}  ${Math.ceil((b.until - t) / 1000)}s`;
    const n = el.buffs.children[i];
    if (n && n.textContent !== txt) n.textContent = txt;
  });
}

/* ---------- Listen ---------- */
let tab = 'gens', listKey = '';
const TITLES = { gens: 'Orbit', ups: 'Upgrades', ach: 'Ziele', nova: 'Urknall', more: 'Mehr' };
const BUILD = {}, UPDATE = {}, KEY = {};

function revealed() { let n = 1; GENS.forEach((g, i) => { if (S.gens[i] > 0 || S.runEarned >= g.cost * 0.3) n = i + 1; }); return n; }
function visibleUps() {
  return UPGRADES.filter(u => !S.ups[u.id] && (u.stage == null || S.stageBest >= u.stage)
    && (u.kind === 'gen' ? S.gens[u.gen] >= u.need : S.runEarned >= u.cost * 0.25))
    .sort((a, b) => a.cost - b.cost);
}

// Orbit (Himmelskörper, die das Loch füttern)
KEY.gens = () => revealed() + '|' + NUM.sci;
BUILD.gens = () => {
  const n = revealed();
  let h = '';
  for (let i = 0; i < Math.min(n + 1, GENS.length); i++) {
    const g = GENS[i];
    if (i < n) {
      // --h: Farbe des Körpers, wie seine Materieströme ums Loch
      h += `<div class="row act" data-act="gen" data-i="${i}" style="--h:${g.hue}"><div class="ico"><span>${g.ico}</span></div>
        <div class="info"><div class="nm">${g.name}</div><div class="ds"></div><div class="cost"></div></div>
        <div class="cnt"></div><div class="prog"></div></div>`;
    } else {
      h += `<div class="row locked no"><div class="ico"><span>❔</span></div><div class="info"><div class="nm">???</div>
        <div class="ds">Noch außer Reichweite</div><div class="cost">✦ ${fmt(g.cost * D.costMult)}</div></div></div>`;
    }
  }
  return h;
};
UPDATE.gens = () => {
  for (const r of el.list.querySelectorAll('.row[data-i]')) {
    const i = +r.dataset.i, n = buyCount(i), c = costOf(i, n), ok = canPay(c), own = S.gens[i];
    r.classList.toggle('ok', ok); r.classList.toggle('no', !ok);
    const x = S.buyAmt === 'r10' ? `für ${n} → ${fmt(own + n)}` : n > 1 ? `für ${n}` : '';
    put(r.querySelector('.cost'), `✦ ${fmt(c)}${x ? `<span class="x">${x}</span>` : ''}`);
    put(r.querySelector('.ds'), own ? `+${fmtR(genRate(i))}/s je · ${fmtR(genRate(i) * own)}/s gesamt` : GENS[i].desc);
    put(r.querySelector('.cnt'), own ? fmt(own) : '');
    const w = Math.min(100, S.dust / c * 100).toFixed(1) + '%';
    const p = r.querySelector('.prog');
    if (p.style.width !== w) p.style.width = w;
  }
};

// Upgrades – für Himmelskörper in deren Farbe, sonst nach Art
const UP_HUES = { ta: 195, sb: 275, st: 42, bv: 30, cr: 8, ra: 335, ab: 190, ev: 300, of: 228 };
const upHue = u => u.kind === 'gen' ? GENS[u.gen].hue : (UP_HUES[u.id.slice(0, 2)] ?? 260);
KEY.ups = () => visibleUps().map(u => u.id).join() + '|' + NUM.sci;
BUILD.ups = () => {
  const list = visibleUps(), bought = Object.keys(S.ups).length;
  let h = `<p class="note" style="padding:2px 4px">${bought} von ${UPGRADES.length} gekauft</p>`;
  if (!list.length) return h + `<div class="empty">🕳️ Gerade keine Upgrades verfügbar.<br>Verschlinge weiter Masse und erweitere deinen Orbit!</div>`;
  for (const u of list) {
    h += `<div class="row act" data-act="up" data-id="${u.id}" data-c="${u.cost}" style="--h:${upHue(u)}"><div class="ico"><span>${u.ico}</span></div>
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
KEY.ach = () => D.achCount + '|' + NUM.sci + '|' + ACT.questKey();
BUILD.ach = () => {
  const n = D.achCount;
  let h = ACT.questCard() + `<div class="card hero"><div class="big">🏆 ${n} / ${ACH.length}</div>
    <p>Jeder Erfolg erhöht deine Produktion dauerhaft um 1 % – aktuell <b>+${n} %</b>.</p></div>`;
  for (const a of ACH) {
    const d = !!S.ach[a.id];
    h += `<div class="row ${d ? 'done' : 'todo'}" style="--h:42"><div class="ico"><span>${a.ico}</span></div>
      <div class="info"><div class="nm">${a.name}</div><div class="ds wrap">${a.desc()}</div></div>${d ? '<div class="chk">✓</div>' : ''}</div>`;
  }
  return h;
};
UPDATE.ach = () => ACT.questUpdate();

// Urknall
KEY.nova = () => S.cores + '|' + S.novas + '|' + NUM.sci + '|' + S.dm + '|' + JSON.stringify(S.lab);
BUILD.nova = () => {
  let h = `<div class="card hero"><p style="margin:0">Ein Urknall bringt dir jetzt</p><div class="big" data-f="gain"></div>
    <button class="btn" data-act="nova" data-f="btn">💥 Urknall auslösen</button>
    <div class="bar"><i data-f="bar"></i></div><p data-f="next"></p></div>
    <div class="card"><h3>💠 Deine Dunkle Materie</h3>
      <div class="kv"><span>Insgesamt erzeugt</span><b>${fmt(S.cores)}</b></div>
      <div class="kv"><span>Bonus (${CORE_BONUS * 100} % je Einheit)</span><b>+${fmt(S.cores * CORE_BONUS * 100)} % Produktion</b></div>
      <div class="kv"><span>Fürs Labor verfügbar</span><b>💠 ${fmt(S.dm)}</b></div>
      <p class="note" style="margin-top:8px">Ein Urknall setzt Masse, Orbit und Upgrades zurück. Dunkle Materie, Labor, Erfolge, Kapseln und Statistik bleiben erhalten.</p></div>`;
  if (S.cores > 0 || S.novas > 0) {
    h += `<h3 class="sec">⚛️ Labor <small>dauerhafte Forschung</small></h3>`;
    for (const x of LAB) {
      const l = S.lab[x.id] || 0, full = l >= x.max, c = labCost(x, l);
      h += `<div class="row ${full ? 'done' : 'act'}" data-act="lab" data-id="${x.id}" data-c="${full ? '' : c}" style="--h:${x.hue}"><div class="ico"><span>${x.ico}</span></div>
        <div class="info"><div class="nm">${x.name}</div><div class="ds wrap">${x.desc(l)}${full ? '' : ` · <i>${x.step}</i>`}</div>
        ${full ? '' : `<div class="cost">💠 ${fmt(c)}</div>`}</div><div class="cnt">${full ? 'Max' : l || ''}</div></div>`;
    }
  }
  h += `<div class="card"><h3>Meilensteine</h3>`;
  MILESTONES.forEach((m, i) => {
    const got = S.cores >= m.cores;
    h += `<div class="ms ${got ? 'got' : ''} ${i ? '' : 'first'}"><div class="mi">${got ? '✓' : '💠'} ${fmt(m.cores)}</div>
      <div><b>${m.name}</b><div class="md">${m.desc}</div></div></div>`;
  });
  return h + '</div>';
};
UPDATE.nova = () => {
  const g = coreGain(), tot = coreTotal(S.totalEarned);
  const lo = massFor(tot), hi = massFor(tot + 1);
  const f = k => el.list.querySelector(`[data-f="${k}"]`);
  put(f('gain'), `+${fmt(g)} 💠`);
  put(f('next'), `Nächste Einheit bei insgesamt ${fmt(hi)} verschlungener Masse`);
  for (const r of el.list.querySelectorAll('.row[data-act="lab"]')) {
    if (!r.dataset.c) continue;
    const ok = S.dm >= +r.dataset.c;
    r.classList.toggle('ok', ok); r.classList.toggle('no', !ok);
  }
  const w = Math.max(0, Math.min(100, (S.totalEarned - lo) / (hi - lo) * 100)).toFixed(1) + '%';
  const bar = f('bar'); if (bar && bar.style.width !== w) bar.style.width = w;
  const btn = f('btn'); if (btn) btn.disabled = g < 1;
};

// Mehr
KEY.more = () => JSON.stringify(S.set) + D.autoBuy;
BUILD.more = () => {
  const tg = (k, label) => `<button class="tg ${S.set[k] ? 'on' : ''}" data-act="set" data-k="${k}"><span>${label}</span><span class="sw"></span></button>`;
  const kv = (k, label) => `<div class="kv"><span>${label}</span><b data-f="${k}"></b></div>`;
  return (STANDALONE ? '' : `<div class="card"><h3>📲 Als App installieren</h3><p class="note">Öffne diese Seite in <b>Safari</b>, tippe auf <b>Teilen</b> und dann auf <b>„Zum Home-Bildschirm“</b>. Danach startet ${NAME} wie eine App – auch ganz ohne Internet.</p></div>`)
    + `<div class="card"><h3>Einstellungen</h3>${tg('sound', '🔊 Töne')}${tg('haptic', '📳 Vibration')}${tg('shake', '💫 Bildschirm wackelt bei Treffern')}${tg('gl', '✨ Aufwendige Grafik')}${D.autoBuy ? tg('auto', '🤖 Automatischer Einkauf') : ''}${tg('sci', '🔢 Wissenschaftliche Zahlen')}</div>
    <div class="card"><h3>Statistik</h3>
      ${kv('total', 'Insgesamt verschlungen')}${kv('run', 'In diesem Universum')}${kv('rate', 'Produktion')}${kv('mult', 'Gesamt-Multiplikator')}
      ${kv('taps', 'Tipps')}${kv('crits', 'Kritische Treffer')}${kv('prey', 'Beute gefangen')}${kv('stars', 'Goldene Kometen')}
      ${kv('frenzies', 'Fressräusche')}${kv('bosses', 'Großbeute verschlungen')}${kv('rivals', 'Rivalen verschlungen')}${kv('caps', 'Kapseln geöffnet')}
      ${kv('daily', 'Tagesbeute in Folge')}${kv('quests', 'Tagesziele erfüllt')}${kv('novas', 'Urknalle')}${kv('off', 'Offline-Ertrag')}${kv('time', 'Aktive Spielzeit')}</div>
    <div class="card"><h3>Spielstand</h3><p class="note">Dein Fortschritt wird automatisch auf diesem Gerät gespeichert. Exportiere ihn ab und zu als Sicherung.</p>
      <button class="btn ghost" data-act="export">📤 Exportieren</button>
      <button class="btn ghost" data-act="import">📥 Importieren</button>
      <button class="btn danger" data-act="reset">Alles zurücksetzen</button></div>
    <p class="note" style="text-align:center;margin:14px 0 4px">${NAME} ${VERSION} · offline spielbar<br>
      <span style="font-size:11px;opacity:.55">Anzeige ${VIEW.h} · i${VIEW.inner} c${VIEW.client} v${VIEW.vh} s${VIEW.scr} · b${window.innerWidth}${window.visualViewport ? ' vv' + Math.round(visualViewport.height) + '/' + Math.round(visualViewport.offsetTop) : ''}${STANDALONE ? ' · App' : ''}</span></p>`;
};
UPDATE.more = () => {
  const f = (k, v) => put(el.list.querySelector(`[data-f="${k}"]`), v);
  f('total', fmt(S.totalEarned)); f('run', fmt(S.runEarned)); f('rate', fmtR(rate()) + '/s');
  f('mult', '×' + fmtR(D.global)); f('taps', fmt(S.taps)); f('crits', fmt(S.crits)); f('prey', fmt(S.prey));
  f('stars', fmt(S.starsCaught)); f('frenzies', fmt(S.frenzies)); f('bosses', fmt(S.bosses)); f('rivals', fmt(S.rivals));
  f('caps', fmt(S.capsOpened)); f('daily', `${S.daily.streak} ${S.daily.streak === 1 ? 'Tag' : 'Tage'}`); f('novas', fmt(S.novas)); f('quests', fmt(S.questsDone));
  f('off', `${Math.round(D.offEff * 100)} % · max. ${D.offCap} Std.`); f('time', fmtTime(S.played));
};

function renderList() {
  const key = KEY[tab]();
  if (key !== listKey) { listKey = key; el.list.innerHTML = BUILD[tab](); }
  UPDATE[tab]();
}

const TAB_ORDER = ['gens', 'ups', 'ach', 'nova', 'more'];
const AMT_ORDER = ['1', '10', '100', 'r10', 'max'];
// Menü ein-/ausblenden: Tipp auf den offenen Reiter oder den Griff am Panel
function setPanel(open) {
  document.body.classList.toggle('panel-off', !open);
  S.set.panel = open;
  if (!open && !S.tips.panel) { S.tips.panel = 1; toast('👇 <b>Menü ausgeblendet</b><small>Tippe unten einen Reiter an, um es zurückzuholen</small>'); }
}
function setTab(t, animate) {
  tab = t;
  for (const b of el.tabs.querySelectorAll('button')) b.classList.toggle('on', b.dataset.tab === t);
  $('.tab-pill').style.transform = `translateX(${TAB_ORDER.indexOf(t) * 100}%)`;
  el.title.textContent = TITLES[t];
  el.seg.hidden = t !== 'gens';
  listKey = ''; el.list.scrollTop = 0;
  renderList(); dots();
  if (animate) { el.list.classList.remove('enter'); void el.list.offsetWidth; el.list.classList.add('enter'); }
}
function setAmt(a) {
  if (!AMT_ORDER.includes(String(a))) a = 1;
  S.buyAmt = a;
  for (const b of el.seg.querySelectorAll('button')) b.classList.toggle('on', b.dataset.amt === String(a));
  $('.seg-thumb').style.transform = `translateX(${Math.max(0, AMT_ORDER.indexOf(String(a))) * 100}%)`;
  if (tab === 'gens') UPDATE.gens();
}

function dots() {
  el.dotUp.classList.toggle('show', tab !== 'ups' && visibleUps().some(u => canPay(u.cost)));
  const g = coreGain();
  el.dotNova.classList.toggle('show', tab !== 'nova' && g >= 1 && g >= Math.max(3, S.cores * 0.5));
  el.dotAch.classList.toggle('show', tab !== 'ach' && ACT.questClaimable());
}

/* ======================= Eingaben ======================= */
el.stage.addEventListener('pointerdown', e => {
  if (e.target.closest('button')) return; // Fähigkeiten & Kapseln haben eigene Knöpfe
  if (!e.target.closest('#hapPad')) e.preventDefault(); // der Vibrations-Schalter braucht den echten Tipp
  SND.unlock();
  ACT.stageTap(e.clientX, e.clientY);
}, { passive: false });

el.tabs.addEventListener('click', e => {
  const b = e.target.closest('button[data-tab]');
  if (!b) return;
  SND.unlock(); SND.tab(); HAP.fire(true);
  const off = document.body.classList.contains('panel-off');
  if (b.dataset.tab === tab) setPanel(off);           // offener Reiter: Menü aus/ein
  else { if (off) setPanel(true); setTab(b.dataset.tab, true); }
});
$('#grab').addEventListener('click', () => { SND.tab(); HAP.fire(true); setPanel(false); });
el.seg.addEventListener('click', e => {
  const b = e.target.closest('button[data-amt]');
  if (b) { HAP.fire(true); const a = b.dataset.amt; setAmt(/^\d+$/.test(a) ? +a : a); }
});

// Die Seite ist bildschirmhoch und könnte sich auf iOS ein Stück verschieben lassen:
// Wischen nur in scrollbaren Bereichen (Liste, Dialog) zulassen, sonst festhalten.
document.addEventListener('touchmove', e => {
  if (!e.target.closest('#list, .sheet')) e.preventDefault();
}, { passive: false });
window.addEventListener('scroll', () => { if (window.scrollY || window.scrollX) window.scrollTo(0, 0); });
if (window.visualViewport) visualViewport.addEventListener('scroll', () => { if (visualViewport.offsetTop || visualViewport.pageTop) window.scrollTo(0, 0); });
el.list.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  SND.unlock();
  const a = b.dataset.act;
  if (a === 'gen') buyGen(+b.dataset.i, b);
  else if (a === 'up') buyUp(b.dataset.id, b);
  else if (a === 'nova') confirmNova();
  else if (a === 'lab') buyLab(b.dataset.id, b);
  else if (a === 'quest') ACT.claimQuest(+b.dataset.i);
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
  // Nur im Hochformat nötig (Statusleiste). Im Querformat würde eine erzwungene Höhe die Seite
  // höher als den sichtbaren Bereich machen – dann treffen Tipps versetzt.
  if (STANDALONE && portrait) for (const c of [scr, vh]) if (c > h && c - h <= 80) h = c;
  Object.assign(VIEW, { inner, client, vh, scr, h });
  return h;
}

let fitKey = '';
function fitViewport() {
  const h = measureHeight();
  const key = window.innerWidth + 'x' + h;
  if (key !== fitKey) {
    fitKey = key;
    document.documentElement.style.setProperty('--app-h', h + 'px');
    FX.resize();
  }
  // Zielpunkt für die Masse, die in den Zähler fliegt
  const d = el.dust.getBoundingClientRect();
  FX.setCollect(d.left + d.width / 2, d.top + d.height / 2);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) save();
  else { fitViewport(); setTimeout(ACT.checkDaily, 700); }
});
window.addEventListener('pagehide', save);
window.addEventListener('resize', fitViewport);
window.addEventListener('orientationchange', () => setTimeout(fitViewport, 300));
if ('ResizeObserver' in window) new ResizeObserver(() => {
  FX.layout();
  const d = el.dust.getBoundingClientRect();
  FX.setCollect(d.left + d.width / 2, d.top + d.height / 2);
}).observe(el.stage);

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
      const step = 1 / D.autoTap, h = FX.hole;
      for (let k = 0; acc.auto >= step && k < 10; k++) {
        acc.auto -= step;
        ACT.hit(h.x + (Math.random() - 0.5) * h.R * 3, h.y + (Math.random() - 0.5) * h.R * 1.5, 'auto');
      }
      if (acc.auto > 1) acc.auto = 0;
    }
    ACT.update(dt, now);
  }
  // Wachstum: neue Stufe des Schwarzen Lochs
  const st = stageOf(S.runEarned);
  if (st > S.stageRun) { S.stageRun = st; if (st > S.stageBest) S.stageBest = st; ACT.stageUp(st); }
  hud();
  ACT.ui(now);
  if (acc.ui >= 0.2) { acc.ui = 0; renderList(); renderBuffs(); dots(); syncOrbit(); }
  if (acc.ach >= 0.5) { acc.ach = 0; checkAch(); autoBuy(); }
  if (acc.save >= 5) { acc.save = 0; save(); }
  FX.setStage(stageFloat(S.runEarned));
  FX.draw(ms / 1000);
  requestAnimationFrame(frame);
}

/* ======================= Start ======================= */
recalc();
applySettings();
fitViewport();
// iOS ändert die gemeldete Höhe kurz nach dem Start teils ohne resize-Ereignis
[300, 1000, 2500].forEach(ms => setTimeout(fitViewport, ms));
// Ein winziges Anscrollen bringt iOS dazu, die Viewport-Höhe neu zu berechnen (wird sofort zurückgesetzt)
setTimeout(() => { window.scrollTo(0, 1); requestAnimationFrame(() => { window.scrollTo(0, 0); fitViewport(); }); }, 150);
syncOrbit();
FX.setStage(stageFloat(S.runEarned));
ACT.init();
if (S.taps >= 5) el.hint.classList.add('gone');
setAmt(S.buyAmt);
setTab('gens');
if (S.set.panel === false) document.body.classList.add('panel-off');
renderBuffs();
if (!hadSave) {
  modal(`<div class="em">🕳️</div><h3>${NAME}</h3>
    <p>Du bist ein winziges Schwarzes Loch – und du hast Hunger. Tippe auf dich, um Materie anzusaugen, und schnapp dir alles, was vorbeifliegt.</p>
    <p style="margin-top:10px">Zieh Himmelskörper in deinen <b>Orbit</b>: Sie füttern dich weiter, sogar wenn die App geschlossen ist.</p>
    <button class="btn" data-m="close">Los geht's</button>`);
  save();
}
setTimeout(ACT.checkDaily, 700);
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
