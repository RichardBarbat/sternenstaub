'use strict';
/* Sternenstaub – Spieldaten & Hilfsfunktionen */

/* ---------- Zahlen & Zeit ---------- */
const NUM = { sci: false };
const SUFFIX = ['', '', ' Mio.', ' Mrd.', ' Bio.', ' Brd.', ' Trio.', ' Trd.', ' Quad.', ' Quadrd.', ' Quint.', ' Quintrd.', ' Sext.', ' Sextrd.', ' Sept.', ' Septrd.'];

function fmt(n) {
  if (!isFinite(n)) return '∞';
  if (n < 0) return '−' + fmt(-n);
  if (n < 1e6) return Math.floor(n).toLocaleString('de-DE');
  let e3 = Math.floor(Math.log10(n) / 3);
  let v = n / Math.pow(10, e3 * 3);
  if (v >= 999.5) { e3++; v /= 1000; }
  if (NUM.sci || e3 >= SUFFIX.length) return n.toExponential(2).replace('.', ',').replace('e+', 'e');
  return v.toFixed(v < 10 ? 2 : v < 100 ? 1 : 0).replace('.', ',') + SUFFIX[e3];
}

// Raten & kleine Werte mit einer Nachkommastelle
function fmtR(n) {
  if (n >= 100) return fmt(n);
  const s = (Math.round(n * 10) / 10).toFixed(1);
  return s.endsWith('.0') ? s.slice(0, -2) : s.replace('.', ',');
}

function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec));
  const d = Math.floor(sec / 86400), h = Math.floor(sec % 86400 / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
  if (d) return `${d} T. ${h} Std.`;
  if (h) return `${h} Std. ${m} Min.`;
  if (m) return `${m} Min. ${s} s`;
  return `${s} s`;
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

/* ---------- Erzeuger ---------- */
const GENS = [
  { name: 'Funke',          ico: '✨', cost: 10,     rate: 0.1,   hue: 48,  desc: 'Ein winziges Glimmen im Dunkeln.' },
  { name: 'Staubwolke',     ico: '☁️', cost: 120,    rate: 1,     hue: 200, desc: 'Wirbelt losen Sternenstaub zusammen.' },
  { name: 'Komet',          ico: '☄️', cost: 1500,   rate: 8,     hue: 18,  desc: 'Zieht einen glitzernden Schweif hinter sich her.' },
  { name: 'Mond',           ico: '🌙', cost: 1.8e4,  rate: 50,    hue: 55,  desc: 'Spiegelt fremdes Licht – und sammelt es.' },
  { name: 'Planet',         ico: '🪐', cost: 2.2e5,  rate: 300,   hue: 30,  desc: 'Ringe voller Staub, Schicht um Schicht.' },
  { name: 'Sonne',          ico: '☀️', cost: 2.8e6,  rate: 1800,  hue: 42,  desc: 'Brennt seit Milliarden Jahren für dich.' },
  { name: 'Nebel',          ico: '🌌', cost: 3.6e7,  rate: 1.1e4, hue: 285, desc: 'Eine Wiege, in der neue Sterne schlummern.' },
  { name: 'Pulsar',         ico: '💫', cost: 4.8e8,  rate: 7e4,   hue: 190, desc: 'Tickt wie eine kosmische Uhr.' },
  { name: 'Galaxie',        ico: '🌀', cost: 6.5e9,  rate: 4.5e5, hue: 250, desc: 'Hundert Milliarden Lichter in einer Spirale.' },
  { name: 'Quasar',         ico: '🌟', cost: 9e10,   rate: 3e6,   hue: 320, desc: 'Heller als tausend Galaxien zusammen.' },
  { name: 'Schwarzes Loch', ico: '🕳️', cost: 1.3e12, rate: 2e7,   hue: 265, desc: 'Verschlingt Licht – und spuckt Staub aus.' },
  { name: 'Multiversum',    ico: '🫧', cost: 1.9e13, rate: 1.4e8, hue: 170, desc: 'Unendlich viele Himmel, alle für dich.' },
];

/* ---------- Upgrades ---------- */
const UPGRADES = [];
const TIERS = [
  [1, 'Feinschliff', 8], [10, 'Resonanz', 40], [25, 'Verdichtung', 300], [50, 'Kristallisation', 3e3],
  [100, 'Harmonie', 4e4], [150, 'Singularität', 6e5], [200, 'Ewigkeit', 1e7], [250, 'Transzendenz', 2e8],
];
GENS.forEach((g, i) => TIERS.forEach(([need, label, f], k) => UPGRADES.push({
  id: `g${i}t${k}`, kind: 'gen', gen: i, need, ico: g.ico,
  name: `${g.name}: ${label}`, desc: `${g.name}-Produktion ×2`, cost: g.cost * f,
})));

const misc = (id, ico, name, desc, cost, eff) => UPGRADES.push({ id, kind: 'misc', ico, name, desc, cost, eff });
// Tippen
misc('tap1', '👆', 'Fingerspitzengefühl', 'Tippen ×2', 100, { tapMult: 2 });
misc('tap2', '👆', 'Sternenhand', 'Tippen ×2', 2500, { tapMult: 2 });
misc('tap3', '👆', 'Gravitationsgriff', 'Jeder Tipp bringt +1 % deiner Staub/s', 5e4, { tapPct: 0.01 });
misc('tap4', '👆', 'Kometenfinger', 'Tippen ×3', 1e6, { tapMult: 3 });
misc('tap5', '👆', 'Lichtpuls', 'Jeder Tipp bringt +2 % deiner Staub/s', 5e7, { tapPct: 0.02 });
misc('tap6', '👆', 'Nova-Berührung', 'Tippen ×3', 5e9, { tapMult: 3 });
misc('tap7', '👆', 'Ereignishorizont', 'Jeder Tipp bringt +3 % deiner Staub/s', 5e11, { tapPct: 0.03 });
misc('tap8', '👆', 'Hand des Kosmos', 'Tippen ×5', 5e13, { tapMult: 5 });
misc('tap9', '👆', 'Urknall-Impuls', 'Jeder Tipp bringt +5 % deiner Staub/s', 5e15, { tapPct: 0.05 });
// Sternbilder (global)
[['Kleiner Wagen', 1e5], ['Orion', 1e7], ['Kassiopeia', 1e9], ['Andromeda', 1e11], ['Pegasus', 1e13], ['Leier', 1e15], ['Drache', 1e17]]
  .forEach(([n, c], k) => misc('sb' + k, '🔭', `Sternbild: ${n}`, 'Gesamtproduktion +20 %', c, { global: 1.2 }));
// Sternschnuppen
misc('st1', '🌠', 'Wunschzettel', 'Sternschnuppen erscheinen 25 % öfter', 5e4, { starFreq: 1.25 });
misc('st2', '🌠', 'Langer Schweif', 'Sternschnuppen fliegen 50 % langsamer', 5e5, { starLife: 1.5 });
misc('st3', '🌠', 'Glückskind', 'Sternschnuppen-Effekte halten doppelt so lang', 5e7, { buffDur: 2 });
misc('st4', '🌠', 'Sternenregen', 'Sternschnuppen erscheinen 25 % öfter', 5e9, { starFreq: 1.25 });
// Offline
misc('of1', '🌙', 'Traumfänger', 'Offline-Ertrag +25 %', 2e5, { offEff: 0.25 });
misc('of2', '⏳', 'Zeitkristall', 'Offline bis zu 12 Std. sammeln', 2e7, { offCap: 12 });
misc('of3', '🌙', 'Schlafende Sterne', 'Offline-Ertrag +25 %', 2e9, { offEff: 0.25 });
misc('of4', '⏳', 'Ewige Nacht', 'Offline bis zu 24 Std. sammeln', 2e11, { offCap: 24 });

const UPS_BY_ID = Object.fromEntries(UPGRADES.map(u => [u.id, u]));

/* ---------- Erfolge (+1 % Produktion je Erfolg) ---------- */
const ACH = [];
const ach = (id, ico, name, desc, test) => ACH.push({ id, ico, name, desc, test });

[[1e2, 'Staubkorn'], [1e3, 'Häufchen'], [1e4, 'Säckchen'], [1e5, 'Schatztruhe'], [1e6, 'Schatzkammer'],
 [1e7, 'Sternenmeer'], [1e8, 'Lichtozean'], [1e9, 'Himmelshort'], [1e10, 'Galaktischer Hort'], [1e12, 'Kosmischer Reichtum'],
 [1e14, 'Unendliche Weiten'], [1e16, 'Jenseits der Zahlen'], [1e18, 'Allumfassend'], [1e20, 'Ewiges Leuchten']]
  .forEach(([v, n], k) => ach('e' + k, '✦', n, () => `Sammle insgesamt ${fmt(v)} Sternenstaub`, s => s.totalEarned >= v));

[[1, 'Glimmen'], [10, 'Rinnsal'], [100, 'Bächlein'], [1e3, 'Lichtstrom'], [1e4, 'Sternenfluss'],
 [1e5, 'Flutwelle'], [1e6, 'Sturzbach'], [1e8, 'Mahlstrom'], [1e10, 'Lichtkaskade'], [1e12, 'Urknall-Echo']]
  .forEach(([v, n], k) => ach('r' + k, '⚡', n, () => `Erreiche ${fmtR(v)} Sternenstaub pro Sekunde`, (s, r) => r >= v));

[[1, 'Erste Berührung'], [100, 'Neugierige Finger'], [1000, 'Fleißige Hände'], [5000, 'Tipp-Virtuose'], [25000, 'Unermüdlich'], [1e5, 'Legendärer Finger']]
  .forEach(([v, n], k) => ach('t' + k, '👆', n, () => `Tippe ${fmt(v)}× auf den Stern`, s => s.taps >= v));

[[1, 'Wünsch dir was'], [10, 'Sternschnuppenjäger'], [50, 'Wunscherfüller'], [150, 'Himmelsfänger']]
  .forEach(([v, n], k) => ach('s' + k, '🌠', n, () => `Fange ${v} Sternschnuppe${v > 1 ? 'n' : ''}`, s => s.starsCaught >= v));

[[1, 'Erste Supernova'], [3, 'Wiedergeburt'], [10, 'Sternenzyklus'], [25, 'Ewige Wiederkehr']]
  .forEach(([v, n], k) => ach('n' + k, '💥', n, () => `Löse ${v}× eine Supernova aus`, s => s.novas >= v));

GENS.forEach((g, i) => [1, 25, 50, 100, 200].forEach((v, k) =>
  ach(`g${i}a${k}`, g.ico, `${g.name} ${ROMAN[k]}`, () => `Besitze ${v} × ${g.name}`, s => s.gens[i] >= v)));

/* ---------- Sternschnuppen-Effekte ---------- */
const STAR_EFFECTS = [
  { id: 'flut',  w: 45, ico: '🌊', name: 'Lichtflut',   desc: 'Produktion ×7', dur: 30, prod: 7 },
  { id: 'fund',  w: 35, ico: '💎', name: 'Sternenfund' },
  { id: 'sturm', w: 20, ico: '⚡', name: 'Funkensturm', desc: 'Tippen ×25',    dur: 15, tap: 25 },
];

/* ---------- Supernova-Meilensteine ---------- */
const MILESTONES = [
  { cores: 3,    name: 'Kernfunken',         desc: 'Tippen dauerhaft ×3', eff: { tapMult: 3 } },
  { cores: 10,   name: 'Sternensaat',        desc: 'Jede Runde startet mit 10 Funken & 5 Staubwolken', start: true },
  { cores: 25,   name: 'Traumwandler',       desc: 'Offline bis zu 48 Std. sammeln', eff: { offCap: 48 } },
  { cores: 60,   name: 'Sternenmagnet',      desc: 'Sternschnuppen erscheinen doppelt so oft', eff: { starFreq: 2 } },
  { cores: 150,  name: 'Pulsschlag',         desc: 'Der Stern tippt sich selbst – 5× pro Sekunde', eff: { autoTap: 5 } },
  { cores: 400,  name: 'Kosmischer Rabatt',  desc: 'Alle Erzeuger 10 % günstiger', eff: { costMult: 0.9 } },
  { cores: 1000, name: 'Unsterblicher Kern', desc: 'Gesamtproduktion ×2', eff: { global: 2 } },
];
