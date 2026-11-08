'use strict';
/* Sternenstaub – Spieldaten & Hilfsfunktionen
   Thema: Du bist ein Schwarzes Loch und verschlingst das Universum. */

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
const rand = (a, b) => a + Math.random() * (b - a);
function pick(list) { let r = Math.random() * list.reduce((a, b) => a + b.w, 0); for (const e of list) if ((r -= e.w) < 0) return e; return list[0]; }

/* ---------- Wachstum: Stufen des Schwarzen Lochs (nach verschlungener Masse dieser Runde) ----------
   hue/sat färben die Akkretionsscheibe. Die Farbtöne laufen ohne Grün durch. */
const STAGES = [
  { at: 0,    name: 'Winziges Schwarzes Loch',       hue: 14,   sat: 100 },
  { at: 1e3,  name: 'Kleines Schwarzes Loch',        hue: 28,   sat: 100 },
  { at: 1e5,  name: 'Stellares Schwarzes Loch',      hue: 40,   sat: 100 },
  { at: 1e7,  name: 'Mittelschweres Schwarzes Loch', hue: -10,  sat: 100 },
  { at: 1e9,  name: 'Supermassives Schwarzes Loch',  hue: -42,  sat: 100 },
  { at: 1e11, name: 'Ultramassives Schwarzes Loch',  hue: -78,  sat: 100 },
  { at: 1e13, name: 'Quasar',                        hue: -128, sat: 100 },
  { at: 1e15, name: 'Galaktischer Schlund',          hue: -160, sat: 100 },
  { at: 1e18, name: 'Kosmischer Abgrund',            hue: -176, sat: 60 },
  { at: 1e21, name: 'Das Ende von allem',            hue: -180, sat: 18 },
];
function stageOf(m) { let i = 0; while (i + 1 < STAGES.length && m >= STAGES[i + 1].at) i++; return i; }
// Stufe als Kommazahl (2,4 = 40 % auf dem Weg zu Stufe 3) – für weiche Übergänge
function stageFloat(m) {
  const i = stageOf(m);
  if (i + 1 >= STAGES.length) return i;
  const a = Math.log10(Math.max(1, STAGES[i].at)), b = Math.log10(STAGES[i + 1].at);
  return i + Math.max(0, Math.min(1, (Math.log10(Math.max(1, m)) - a) / (b - a)));
}

/* ---------- Orbit: Himmelskörper, die das Loch füttern ---------- */
const GENS = [
  { name: 'Gesteinsbrocken', ico: '🪨', spr: 'rock',    cost: 10,     rate: 0.1,   hue: 28,  desc: 'Kam dir zu nahe. Selbst schuld.' },
  { name: 'Gaswolke',        ico: '☁️', spr: 'gas',     cost: 120,    rate: 1,     hue: 200, desc: 'Wird in feinen Fäden zu dir gezogen.' },
  { name: 'Komet',           ico: '☄️', spr: 'comet',   cost: 1500,   rate: 8,     hue: 190, desc: 'Schmilzt mit jeder Runde ein bisschen mehr.' },
  { name: 'Mond',            ico: '🌙', spr: 'moon',    cost: 1.8e4,  rate: 50,    hue: 55,  desc: 'Hat seinen Planeten gegen dich getauscht.' },
  { name: 'Planet',          ico: '🌍', spr: 'planet',  cost: 2.2e5,  rate: 300,   hue: 210, desc: 'Ozeane, Berge, Wolken – alles nur Futter.' },
  { name: 'Gasriese',        ico: '🪐', spr: 'giant',   cost: 2.8e6,  rate: 1800,  hue: 32,  desc: 'Zerfasert langsam zu langen Streifen.' },
  { name: 'Stern',           ico: '☀️', spr: 'star',    cost: 3.6e7,  rate: 1.1e4, hue: 45,  desc: 'Brennt sich in Spiralen zu dir hinab.' },
  { name: 'Neutronenstern',  ico: '💫', spr: 'neutron', cost: 4.8e8,  rate: 7e4,   hue: 195, desc: 'Ein Teelöffel davon wiegt Milliarden Tonnen.' },
  { name: 'Nebel',           ico: '🌌', spr: 'nebula',  cost: 6.5e9,  rate: 4.5e5, hue: 285, desc: 'Eine ganze Sternenwiege im Sog.' },
  { name: 'Sternhaufen',     ico: '✨', spr: 'cluster', cost: 9e10,   rate: 3e6,   hue: 320, desc: 'Tausende Sonnen, dicht an dicht.' },
  { name: 'Galaxie',         ico: '🌀', spr: 'galaxy',  cost: 1.3e12, rate: 2e7,   hue: 250, desc: 'Hundert Milliarden Sterne in einer Spirale.' },
  { name: 'Kosmisches Netz', ico: '🕸️', spr: 'web',     cost: 1.9e13, rate: 1.4e8, hue: 188, desc: 'Die Fäden des Universums – du ziehst an allen.' },
];

/* ---------- Upgrades ---------- */
const UPGRADES = [];
const TIERS = [
  [1, 'Engere Bahn', 8], [10, 'Gezeitenkraft', 40], [25, 'Roche-Grenze', 300], [50, 'Spaghettifizierung', 3e3],
  [100, 'Akkretion', 4e4], [150, 'Ereignishorizont', 6e5], [200, 'Singularität', 1e7], [250, 'Ewigkeit', 2e8],
];
GENS.forEach((g, i) => TIERS.forEach(([need, label, f], k) => UPGRADES.push({
  id: `g${i}t${k}`, kind: 'gen', gen: i, need, ico: g.ico,
  name: `${g.name}: ${label}`, desc: `${g.name} bringt doppelt so viel`, cost: g.cost * f,
})));

// stage: erscheint erst ab dieser Wachstumsstufe (für Fähigkeiten)
const misc = (id, ico, name, desc, cost, eff, stage) => UPGRADES.push({ id, kind: 'misc', ico, name, desc, cost, eff, stage });
// Tippen (Gravitationspuls)
misc('tap1', '👆', 'Erster Puls', 'Tippen ×2', 100, { tapMult: 2 });
misc('tap2', '👆', 'Starker Sog', 'Tippen ×2', 2500, { tapMult: 2 });
misc('tap3', '👆', 'Gravitationsgriff', 'Jeder Tipp bringt +1 % deiner Masse/s', 5e4, { tapPct: 0.01 });
misc('tap4', '👆', 'Schwerkraftfaust', 'Tippen ×3', 1e6, { tapMult: 3 });
misc('tap5', '👆', 'Raumkrümmung', 'Jeder Tipp bringt +2 % deiner Masse/s', 5e7, { tapPct: 0.02 });
misc('tap6', '👆', 'Gezeitenhieb', 'Tippen ×3', 5e9, { tapMult: 3 });
misc('tap7', '👆', 'Lichtfalle', 'Jeder Tipp bringt +3 % deiner Masse/s', 5e11, { tapPct: 0.03 });
misc('tap8', '👆', 'Hand der Leere', 'Tippen ×5', 5e13, { tapMult: 5 });
misc('tap9', '👆', 'Urknall-Impuls', 'Jeder Tipp bringt +5 % deiner Masse/s', 5e15, { tapPct: 0.05 });
// Berühmte Schwarze Löcher als Vorbild (global)
[['Cygnus X-1', 1e5], ['Sagittarius A*', 1e7], ['M87*', 1e9], ['TON 618', 1e11], ['Phoenix A', 1e13], ['Holmberg 15A', 1e15], ['Gaia BH1', 1e17]]
  .forEach(([n, c], k) => misc('sb' + k, '🔭', `Vorbild: ${n}`, 'Gesamtproduktion +20 %', c, { global: 1.2 }));
// Beute
misc('st1', '🎯', 'Köder', 'Beute erscheint 25 % öfter', 5e4, { preyFreq: 1.25 });
misc('st2', '🎯', 'Gravitationslinse', 'Beute fliegt 50 % langsamer', 5e5, { preyLife: 1.5 });
misc('st3', '🌠', 'Glückskomet', 'Effekte goldener Kometen halten doppelt so lang', 5e7, { buffDur: 2 });
misc('st4', '🎯', 'Beuteschwarm', 'Beute erscheint 25 % öfter', 5e9, { preyFreq: 1.25 });
misc('bv1', '🍽️', 'Feinschmecker', 'Beute bringt doppelt so viel', 3e4, { preyMult: 2 });
misc('bv2', '🍽️', 'Gourmet', 'Beute bringt doppelt so viel', 3e6, { preyMult: 2 });
misc('bv3', '🍽️', 'Großer Appetit', 'Beute bringt dreimal so viel', 3e8, { preyMult: 3 });
misc('bv4', '🍽️', 'Feinkost des Alls', 'Beute bringt dreimal so viel', 3e10, { preyMult: 3 });
// Kritische Treffer
misc('cr1', '💥', 'Präzision', 'Krit-Chance +3 %', 2e3, { critChance: 0.03 });
misc('cr2', '💥', 'Wucht', 'Kritische Treffer doppelt so stark', 5e4, { critMult: 2 });
misc('cr3', '💥', 'Scharfer Blick', 'Krit-Chance +4 %', 5e6, { critChance: 0.04 });
misc('cr4', '💥', 'Vernichtungsschlag', 'Kritische Treffer doppelt so stark', 5e8, { critMult: 2 });
misc('cr5', '💥', 'Gnadenlos', 'Krit-Chance +5 %', 5e10, { critChance: 0.05 });
// Fressrausch
misc('ra1', '🔥', 'Heißhunger', 'Fressrausch füllt sich 30 % schneller', 8e3, { rauschGain: 1.3 });
misc('ra2', '🔥', 'Gier', 'Fressrausch hält 5 s länger', 2e5, { rauschDur: 5 });
misc('ra3', '🔥', 'Unersättlich', 'Fressrausch ×8 statt ×5', 2e7, { rauschMult: 8 });
misc('ra4', '🔥', 'Maßlos', 'Fressrausch hält 5 s länger', 2e9, { rauschDur: 5 });
misc('ra5', '🔥', 'Bodenlos', 'Fressrausch ×12', 2e11, { rauschMult: 12 });
// Fähigkeiten (erscheinen erst, wenn die Fähigkeit freigeschaltet ist)
misc('ab1', '🌀', 'Tiefer Sog', 'Sog hält 5 s länger', 1e5, { sogDur: 5 }, 1);
misc('ab2', '⏱️', 'Schnelle Erholung', 'Fähigkeiten laden 25 % schneller', 1e7, { abCd: 0.75 }, 1);
misc('ab3', '⚡', 'Dauerfeuer', 'Jet hält 10 s länger', 1e8, { jetDur: 10 }, 2);
misc('ab4', '⏳', 'Gedehnte Zeit', 'Zeitdehnung bringt 2 Std. statt 1', 1e9, { zeitMult: 2 }, 3);
misc('ab5', '⏱️', 'Ewiger Kreislauf', 'Fähigkeiten laden 25 % schneller', 1e12, { abCd: 0.75 }, 1);
// Ereignisse
misc('ev1', '📡', 'Leuchtfeuer', 'Ereignisse kommen 30 % öfter', 5e5, { eventFreq: 1.3 });
misc('ev2', '🗡️', 'Großwildjagd', 'Großbeute und Rivalen halten 25 % weniger aus', 5e7, { bossHp: 0.75 });
misc('ev3', '📡', 'Signalfeuer', 'Ereignisse kommen 30 % öfter', 5e9, { eventFreq: 1.3 });
// Offline
misc('of1', '🌙', 'Stilles Wachstum', 'Offline-Ertrag +25 %', 2e5, { offEff: 0.25 });
misc('of2', '⏳', 'Zeitkapsel', 'Offline bis zu 12 Std. sammeln', 2e7, { offCap: 12 });
misc('of3', '🌙', 'Schlafender Riese', 'Offline-Ertrag +25 %', 2e9, { offEff: 0.25 });
misc('of4', '⏳', 'Ewige Nacht', 'Offline bis zu 24 Std. sammeln', 2e11, { offCap: 24 });

const UPS_BY_ID = Object.fromEntries(UPGRADES.map(u => [u.id, u]));

/* ---------- Erfolge (+1 % Produktion je Erfolg) ---------- */
const ACH = [];
const ach = (id, ico, name, desc, test) => ACH.push({ id, ico, name, desc, test });
const one = (v, single, many) => () => v === 1 ? single : many(fmt(v));

[[1e2, 'Erster Bissen'], [1e3, 'Appetit'], [1e4, 'Nimmersatt'], [1e5, 'Vielfraß'], [1e6, 'Schlund'],
 [1e7, 'Abgrund'], [1e8, 'Lichtfresser'], [1e9, 'Sternenfresser'], [1e10, 'Galaxienfresser'], [1e12, 'Kosmischer Hunger'],
 [1e14, 'Unendliche Gier'], [1e16, 'Jenseits der Zahlen'], [1e18, 'Allesfresser'], [1e20, 'Letzter Bissen']]
  .forEach(([v, n], k) => ach('e' + k, '🕳️', n, () => `Verschlinge insgesamt ${fmt(v)} Masse`, s => s.totalEarned >= v));

[[1, 'Tröpfeln'], [10, 'Rinnsal'], [100, 'Strömung'], [1e3, 'Sogwirkung'], [1e4, 'Strudel'],
 [1e5, 'Mahlstrom'], [1e6, 'Akkretionsflut'], [1e8, 'Gravitationssturm'], [1e10, 'Materiekaskade'], [1e12, 'Kosmischer Abfluss']]
  .forEach(([v, n], k) => ach('r' + k, '⚡', n, () => `Verschlinge ${fmtR(v)} Masse pro Sekunde`, (s, r) => r >= v));

[[1, 'Erste Berührung'], [100, 'Neugierige Finger'], [1000, 'Fleißige Hände'], [5000, 'Tipp-Virtuose'], [25000, 'Unermüdlich'], [1e5, 'Legendärer Finger']]
  .forEach(([v, n], k) => ach('t' + k, '👆', n, () => `Tippe ${fmt(v)}× auf das Schwarze Loch`, s => s.taps >= v));

[[1, 'Glückstreffer'], [10, 'Kometenjäger'], [50, 'Goldrausch'], [150, 'Himmelsräuber']]
  .forEach(([v, n], k) => ach('s' + k, '🌠', n, one(v, 'Fange einen goldenen Kometen', x => `Fange ${x} goldene Kometen`), s => s.starsCaught >= v));

[[1, 'Erster Urknall'], [3, 'Wiedergeburt'], [10, 'Zyklus der Leere'], [25, 'Ewige Wiederkehr']]
  .forEach(([v, n], k) => ach('n' + k, '💥', n, () => `Löse ${v}× einen Urknall aus`, s => s.novas >= v));

GENS.forEach((g, i) => [1, 25, 50, 100, 200].forEach((v, k) =>
  ach(`g${i}a${k}`, g.ico, `${g.name} ${ROMAN[k]}`, () => `Halte ${v} × ${g.name} im Orbit`, s => s.gens[i] >= v)));

[[1, 'Happen'], [25, 'Jäger'], [100, 'Raubtier'], [500, 'Plage'], [2000, 'Spitzenräuber'], [1e4, 'Weltenfresser']]
  .forEach(([v, n], k) => ach('p' + k, '🎯', n, one(v, 'Fange deine erste Beute', x => `Fange ${x} Beutestücke`), s => s.prey >= v));

[[1, 'Volltreffer'], [50, 'Treffsicher'], [500, 'Scharfschütze'], [5000, 'Kritische Masse'], [5e4, 'Vernichter']]
  .forEach(([v, n], k) => ach('c' + k, '💥', n, one(v, 'Lande einen kritischen Treffer', x => `Lande ${x} kritische Treffer`), s => s.crits >= v));

[[1, 'Erster Rausch'], [10, 'Fressattacke'], [50, 'Gelage'], [200, 'Völlerei']]
  .forEach(([v, n], k) => ach('f' + k, '🔥', n, one(v, 'Gerate in einen Fressrausch', x => `Gerate ${x}× in einen Fressrausch`), s => s.frenzies >= v));

[[1, 'Großwildjäger'], [5, 'Riesentöter'], [25, 'Titanenfresser'], [100, 'Schrecken des Alls']]
  .forEach(([v, n], k) => ach('b' + k, '🗡️', n, one(v, 'Verschlinge eine Großbeute', x => `Verschlinge ${x} Großbeuten`), s => s.bosses >= v));

[[1, 'Revierkampf'], [5, 'Platzhirsch'], [25, 'Herrscher der Leere']]
  .forEach(([v, n], k) => ach('v' + k, '⚫', n, one(v, 'Verschlinge ein rivalisierendes Schwarzes Loch', x => `Verschlinge ${x} rivalisierende Schwarze Löcher`), s => s.rivals >= v));

[[1, 'Schwarmfresser'], [10, 'Schwarmplage']]
  .forEach(([v, n], k) => ach('w' + k, '☄️', n, one(v, 'Verschlinge einen ganzen Asteroidenschwarm', x => `Verschlinge ${x} ganze Asteroidenschwärme`), s => s.swarms >= v));

[[1, 'Neugier'], [10, 'Sammler'], [50, 'Schatzsucher'], [200, 'Hortmeister']]
  .forEach(([v, n], k) => ach('k' + k, '🎁', n, one(v, 'Öffne deine erste Kapsel', x => `Öffne ${x} Kapseln`), s => s.capsOpened >= v));

ach('d0', '📅', 'Gewohnheitstier', () => 'Hol dir 3 Tage in Folge die Tagesbeute', s => s.daily.streak >= 3);
ach('d1', '📅', 'Eine Woche Hunger', () => 'Hol dir 7 Tage in Folge die Tagesbeute', s => s.daily.streak >= 7);
ach('d2', '📅', 'Treue Seele', () => 'Hol dir an 30 Tagen die Tagesbeute', s => s.daily.total >= 30);

STAGES.slice(1).forEach((st, k) => ach('h' + k, '🕳️', st.name, () => `Erreiche die Stufe „${st.name}“`, s => s.stageBest >= k + 1));

/* ---------- Goldene Kometen (seltene Beute mit Effekt) ---------- */
const STAR_EFFECTS = [
  { id: 'flut',  w: 45, ico: '🌊', name: 'Materieflut',   desc: 'Produktion ×7', short: 'Prod. ×7',  dur: 30, prod: 7 },
  { id: 'fund',  w: 35, ico: '💎', name: 'Goldfund' },
  { id: 'sturm', w: 20, ico: '⚡', name: 'Gezeitensturm', desc: 'Tippen ×25',    short: 'Tipp ×25', dur: 15, tap: 25 },
];

/* ---------- Urknall-Meilensteine (nach Dunkler Materie) ---------- */
const MILESTONES = [
  { cores: 3,    name: 'Dunkler Funke',             desc: 'Tippen dauerhaft ×3', eff: { tapMult: 3 } },
  { cores: 10,   name: 'Startkapital',              desc: 'Jede Runde startet mit 10 Gesteinsbrocken & 5 Gaswolken', start: true },
  { cores: 25,   name: 'Zeitlose Leere',            desc: 'Offline bis zu 48 Std. sammeln', eff: { offCap: 48 } },
  { cores: 60,   name: 'Beutemagnet',               desc: 'Beute erscheint doppelt so oft', eff: { preyFreq: 2 } },
  { cores: 150,  name: 'Eigenrotation',             desc: 'Das Loch zieht von selbst – 5 Tipps pro Sekunde', eff: { autoTap: 5 } },
  { cores: 400,  name: 'Kosmischer Rabatt',         desc: 'Orbit-Käufe 10 % günstiger', eff: { costMult: 0.9 } },
  { cores: 1000, name: 'Unsterbliche Singularität', desc: 'Gesamtproduktion ×2', eff: { global: 2 } },
];

/* ---------- Beute, die durchs Bild fliegt ----------
   tap/sec: Wert = max(Tippwert × tap, Produktion × sec) */
const PREY = {
  rock:  { name: 'Gesteinsbrocken', spr: 'rock',  w: 50, stage: 0, size: [17, 23], tap: 6,  sec: 2,  hue: 30 },
  ice:   { name: 'Eisbrocken',      spr: 'ice',   w: 26, stage: 0, size: [15, 20], tap: 6,  sec: 2,  hue: 195 },
  comet: { name: 'Komet',           spr: 'comet', w: 14, stage: 1, size: [11, 13], tap: 15, sec: 5,  hue: 190, fast: 0.6, tail: 'rgba(150,215,255,1)' },
  sat:   { name: 'Satellit',        spr: 'sat',   w: 6,  stage: 2, size: [22, 24], tap: 25, sec: 8,  hue: 45 },
  moon:  { name: 'Mondsplitter',    spr: 'moon',  w: 7,  stage: 3, size: [22, 27], tap: 30, sec: 10, hue: 55 },
};

/* ---------- Großbeute (Ereignis) – je nach Wachstumsstufe ---------- */
const BOSSES = [
  { stage: 0, name: 'Riesenkomet',    spr: 'bcomet',   ico: '☄️', hue: 195 },
  { stage: 2, name: 'Wanderplanet',   spr: 'bplanet',  ico: '🪐', hue: 220 },
  { stage: 4, name: 'Brauner Zwerg',  spr: 'bdwarf',   ico: '🟤', hue: 15 },
  { stage: 6, name: 'Neutronenstern', spr: 'bneutron', ico: '💫', hue: 195 },
];

/* ---------- Kapseln ---------- */
const RARITY = {
  c: { name: 'Gewöhnliche Kapsel', adj: 'gewöhnliche', hue: 215, sat: 35,  n: 2, min: [3, 10],   v: 0 },
  r: { name: 'Seltene Kapsel',     adj: 'seltene',     hue: 195, sat: 95,  n: 3, min: [10, 30],  v: 1 },
  e: { name: 'Epische Kapsel',     adj: 'epische',     hue: 285, sat: 95,  n: 3, min: [30, 90],  v: 2 },
  l: { name: 'Legendäre Kapsel',   adj: 'legendäre',   hue: 42,  sat: 100, n: 4, min: [90, 240], v: 3 },
};
const RAR_ORDER = ['l', 'e', 'r', 'c'];

/* ---------- Fähigkeiten ---------- */
const ABILITIES = [
  { id: 'sog',  name: 'Sog',         stage: 1, cd: 180,  dur: 10, hue: 190,
    desc: 'Saugt 10 s lang von selbst – 10 Tipps pro Sekunde, und jede Beute im Bild wird eingefangen.' },
  { id: 'jet',  name: 'Jet',         stage: 2, cd: 480,  dur: 15, hue: 300,
    desc: '15 s lang ist jeder Tipp ein kritischer Treffer.' },
  { id: 'zeit', name: 'Zeitdehnung', stage: 3, cd: 3600, dur: 0,  hue: 42,
    desc: 'Sofort eine ganze Stunde Produktion.' },
];

/* ---------- Tagesbeute (7-Tage-Kreis) ---------- */
const DAILY = [
  { min: 10 }, { min: 20 }, { cap: 'c' }, { min: 45 }, { cap: 'r' }, { min: 90 }, { cap: 'e', min: 120 },
];
