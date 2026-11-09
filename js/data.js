'use strict';
/* Singularität – Spieldaten & Hilfsfunktionen
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

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
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
  { at: 1e17, name: 'Kosmischer Abgrund',            hue: -176, sat: 60 },
  { at: 1e19, name: 'Weltenverschlinger',            hue: -180, sat: 18 },
  { at: 1e21, name: 'Universumsfresser',             hue: -62,  sat: 100 },
  { at: 1e23, name: 'Raumzeitriss',                  hue: -4,   sat: 100 },
  { at: 1e25, name: 'Multiversaler Schlund',         hue: 44,   sat: 100 },
  { at: 1e27, name: 'Zeitenfresser',                 hue: 46,   sat: 45 },
  { at: 1e30, name: 'Das Ende von allem',            hue: 40,   sat: 0 },
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
  { name: 'Paralleluniversum', ico: '🪞', spr: 'mirror', cost: 2.8e14, rate: 1e9,   hue: 265, desc: 'Nebenan gab es dich auch. Gab.' },
  { name: 'Multiversum',     ico: '🫧', spr: 'multi',   cost: 4.2e15, rate: 7.5e9, hue: 305, desc: 'Unendlich viele Welten – eine Vorspeise.' },
  { name: 'Raumzeit',        ico: '⏳', spr: 'grid',    cost: 6.5e16, rate: 5.5e10, hue: 215, desc: 'Du frisst nicht mehr nur, was ist – sondern wann.' },
  { name: 'Das Nichts',      ico: '⚫', spr: 'void',    cost: 1e18,   rate: 4e11,  hue: 280, desc: 'Selbst die Leere hat Masse, wenn man hungrig genug ist.' },
];

/* ---------- Upgrades ---------- */
const UPGRADES = [];
const TIERS = [
  [1, 'Engere Bahn', 8], [10, 'Gezeitenkraft', 40], [25, 'Roche-Grenze', 300], [50, 'Spaghettifizierung', 3e3],
  [100, 'Akkretion', 4e4], [150, 'Ereignishorizont', 6e5], [200, 'Kernkollaps', 1e7], [250, 'Ewigkeit', 2e8],
  [300, 'Zeitdilatation', 5e9], [350, 'Hawking-Strahlung', 1e11], [400, 'Feuerwall', 2e12],
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
misc('tap3', '👆', 'Gravitationsgriff', 'Jeder Tipp bringt +0,5 % deiner Masse/s', 5e4, { tapPct: 0.005 });
misc('tap4', '👆', 'Schwerkraftfaust', 'Tippen ×3', 1e6, { tapMult: 3 });
misc('tap5', '👆', 'Raumkrümmung', 'Jeder Tipp bringt +0,5 % deiner Masse/s', 5e7, { tapPct: 0.005 });
misc('tap6', '👆', 'Gezeitenhieb', 'Tippen ×3', 5e9, { tapMult: 3 });
misc('tap7', '👆', 'Lichtfalle', 'Jeder Tipp bringt +1 % deiner Masse/s', 5e11, { tapPct: 0.01 });
misc('tap8', '👆', 'Hand der Leere', 'Tippen ×5', 5e13, { tapMult: 5 });
misc('tap9', '👆', 'Urknall-Impuls', 'Jeder Tipp bringt +1 % deiner Masse/s', 5e15, { tapPct: 0.01 });
misc('tap10', '👆', 'Griff durch die Zeit', 'Jeder Tipp bringt +1 % deiner Masse/s', 5e19, { tapPct: 0.01 });
misc('tap11', '👆', 'Letzte Berührung', 'Jeder Tipp bringt +1 % deiner Masse/s', 5e23, { tapPct: 0.01 });
// Berühmte Schwarze Löcher als Vorbild (global)
[['Cygnus X-1', 1e5], ['Sagittarius A*', 1e7], ['M87*', 1e9], ['TON 618', 1e11], ['Phoenix A', 1e13], ['Holmberg 15A', 1e15], ['Gaia BH1', 1e17],
 ['NGC 1277', 1e19], ['OJ 287', 1e21], ['IC 1101', 1e23], ['Abell 1201', 1e25], ['S5 0014+81', 1e27]]
  .forEach(([n, c], k) => misc('sb' + k, '🔭', `Vorbild: ${n}`, 'Gesamtproduktion +20 %', c, { global: 1.2 }));
// Beute
misc('st1', '🎯', 'Köder', 'Beute erscheint 25 % öfter', 5e4, { preyFreq: 1.25 });
misc('st2', '🎯', 'Gravitationslinse', 'Beute fliegt 50 % langsamer', 5e5, { preyLife: 1.5 });
misc('st3', '🌠', 'Glückskomet', 'Effekte goldener Kometen halten doppelt so lang', 5e7, { buffDur: 2 });
misc('st4', '🎯', 'Beuteschwarm', 'Beute erscheint 25 % öfter', 5e9, { preyFreq: 1.25 });
misc('bv1', '🍽️', 'Feinschmecker', 'Beute bringt 50 % mehr', 3e4, { preyMult: 1.5 });
misc('bv2', '🍽️', 'Gourmet', 'Beute bringt 50 % mehr', 3e6, { preyMult: 1.5 });
misc('bv3', '🍽️', 'Großer Appetit', 'Beute bringt 50 % mehr', 3e8, { preyMult: 1.5 });
misc('bv4', '🍽️', 'Feinkost des Alls', 'Beute bringt 50 % mehr', 3e10, { preyMult: 1.5 });
// Kritische Treffer
misc('cr1', '💥', 'Präzision', 'Krit-Chance +3 %', 2e3, { critChance: 0.03 });
misc('cr2', '💥', 'Wucht', 'Kritische Treffer ×15 statt ×10', 5e4, { critSet: 15 });
misc('cr3', '💥', 'Scharfer Blick', 'Krit-Chance +4 %', 5e6, { critChance: 0.04 });
misc('cr4', '💥', 'Vernichtungsschlag', 'Kritische Treffer ×20 statt ×15', 5e8, { critSet: 20 });
misc('cr5', '💥', 'Gnadenlos', 'Krit-Chance +5 %', 5e10, { critChance: 0.05 });
// Fressrausch
misc('ra1', '🔥', 'Heißhunger', 'Fressrausch füllt sich 30 % schneller', 8e3, { rauschGain: 1.3 });
misc('ra2', '🔥', 'Gier', 'Fressrausch hält 3 s länger', 2e5, { rauschDur: 3 });
misc('ra3', '🔥', 'Unersättlich', 'Fressrausch füllt sich 30 % schneller', 2e7, { rauschGain: 1.3 });
misc('ra4', '🔥', 'Maßlos', 'Fressrausch hält 3 s länger', 2e9, { rauschDur: 3 });
misc('ra5', '🔥', 'Bodenlos', 'Fressrausch hält 2 s länger', 2e11, { rauschDur: 2 });
// Fähigkeiten (erscheinen erst, wenn die Fähigkeit freigeschaltet ist)
misc('ab1', '🌀', 'Tiefer Sog', 'Sog hält 5 s länger', 1e5, { sogDur: 5 }, 1);
misc('ab2', '⏱️', 'Schnelle Erholung', 'Fähigkeiten laden 25 % schneller', 1e7, { abCd: 0.75 }, 1);
misc('ab3', '⚡', 'Dauerfeuer', 'Jet hält 10 s länger', 1e8, { jetDur: 10 }, 2);
misc('ab4', '⏳', 'Gedehnte Zeit', 'Zeitdehnung bringt 1 Std. statt 30 Min.', 1e9, { zeitMult: 2 }, 3);
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
 [1e14, 'Unendliche Gier'], [1e16, 'Jenseits der Zahlen'], [1e18, 'Allesfresser'], [1e20, 'Letzter Bissen'],
 [1e22, 'Nachschlag'], [1e24, 'Kosmisches Festmahl'], [1e26, 'Bodenloser Magen'], [1e28, 'Alles und mehr']]
  .forEach(([v, n], k) => ach('e' + k, '🕳️', n, () => `Verschlinge insgesamt ${fmt(v)} Masse`, s => s.totalEarned >= v));

[[1, 'Tröpfeln'], [10, 'Rinnsal'], [100, 'Strömung'], [1e3, 'Sogwirkung'], [1e4, 'Strudel'],
 [1e5, 'Mahlstrom'], [1e6, 'Akkretionsflut'], [1e8, 'Gravitationssturm'], [1e10, 'Materiekaskade'], [1e12, 'Kosmischer Abfluss'], [1e14, 'Sternenstrom'], [1e16, 'Galaxienstrom'], [1e18, 'Weltenstrom']]
  .forEach(([v, n], k) => ach('r' + k, '⚡', n, () => `Verschlinge ${fmtR(v)} Masse pro Sekunde`, (s, r) => r >= v));

[[1, 'Erste Berührung'], [100, 'Neugierige Finger'], [1000, 'Fleißige Hände'], [5000, 'Tipp-Virtuose'], [25000, 'Unermüdlich'], [1e5, 'Legendärer Finger']]
  .forEach(([v, n], k) => ach('t' + k, '👆', n, () => `Tippe ${fmt(v)}× auf das Schwarze Loch`, s => s.taps >= v));

[[1, 'Glückstreffer'], [10, 'Kometenjäger'], [50, 'Goldrausch'], [150, 'Himmelsräuber']]
  .forEach(([v, n], k) => ach('s' + k, '🌠', n, one(v, 'Fange einen goldenen Kometen', x => `Fange ${x} goldene Kometen`), s => s.starsCaught >= v));

[[1, 'Erster Urknall'], [3, 'Wiedergeburt'], [10, 'Zyklus der Leere'], [25, 'Ewige Wiederkehr'], [50, 'Kreislauf des Alls']]
  .forEach(([v, n], k) => ach('n' + k, '💥', n, () => `Löse ${v}× einen Urknall aus`, s => s.novas >= v));

GENS.forEach((g, i) => [1, 25, 50, 100, 200, 300, 400].forEach((v, k) =>
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
[[3, 'Pflichtbewusst'], [15, 'Zielstrebig'], [50, 'Auftragsjäger'], [150, 'Unaufhaltsam']]
  .forEach(([v, n], k) => ach('q' + k, '🎯', n, () => `Erfülle ${v} Tagesziele`, s => s.questsDone >= v));
[[5, 'Laborratte'], [20, 'Forschergeist'], [50, 'Dunkle Künste'], [100, 'Meister der Leere']]
  .forEach(([v, n], k) => ach('l' + k, '⚛️', n, () => `Erforsche ${v} Stufen im Labor`, s => Object.values(s.lab).reduce((a, b) => a + b, 0) >= v));

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
  { cores: 60,   name: 'Beutemagnet',               desc: 'Beute erscheint 50 % öfter', eff: { preyFreq: 1.5 } },
  { cores: 150,  name: 'Eigenrotation',             desc: 'Das Loch zieht von selbst – 5 Tipps pro Sekunde', eff: { autoTap: 5 } },
  { cores: 400,  name: 'Kosmischer Rabatt',         desc: 'Orbit-Käufe 10 % günstiger', eff: { costMult: 0.9 } },
  { cores: 1000, name: 'Unsterblicher Kern',        desc: 'Gesamtproduktion ×2', eff: { global: 2 } },
  { cores: 2500, name: 'Unstillbar',                desc: 'Fressrausch ×6 statt ×5', eff: { rauschMult: 6 } },
  { cores: 5000, name: 'Dunkles Zeitalter',         desc: 'Gesamtproduktion ×2', eff: { global: 2 } },
  { cores: 2e4,  name: 'Vernichtende Präzision',    desc: 'Kritische Treffer ×30', eff: { critSet: 30 } },
  { cores: 1e5,  name: 'Herr der Leere',            desc: 'Gesamtproduktion ×3', eff: { global: 3 } },
];

/* ---------- Beute, die durchs Bild fliegt ----------
   tap/sec: Wert = max(Tippwert × tap, Produktion × sec) */
const PREY = {
  rock:  { name: 'Gesteinsbrocken', spr: 'rock',  w: 50, stage: 0, size: [17, 23], tap: 6,  sec: 1,  hue: 30 },
  ice:   { name: 'Eisbrocken',      spr: 'ice',   w: 26, stage: 0, size: [15, 20], tap: 6,  sec: 1,  hue: 195 },
  comet: { name: 'Komet',           spr: 'comet', w: 14, stage: 1, size: [11, 13], tap: 15, sec: 2.5, hue: 190, fast: 0.6, tail: 'rgba(150,215,255,1)' },
  sat:   { name: 'Satellit',        spr: 'sat',   w: 6,  stage: 2, size: [22, 24], tap: 25, sec: 4,  hue: 45 },
  moon:  { name: 'Mondsplitter',    spr: 'moon',  w: 7,  stage: 3, size: [22, 27], tap: 30, sec: 5,  hue: 55 },
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
  c: { name: 'Gewöhnliche Kapsel', adj: 'gewöhnliche', hue: 215, sat: 35,  n: 2, min: [1, 3],   v: 0 },
  r: { name: 'Seltene Kapsel',     adj: 'seltene',     hue: 195, sat: 95,  n: 3, min: [3, 8],   v: 1 },
  e: { name: 'Epische Kapsel',     adj: 'epische',     hue: 285, sat: 95,  n: 3, min: [10, 20], v: 2 },
  l: { name: 'Legendäre Kapsel',   adj: 'legendäre',   hue: 42,  sat: 100, n: 4, min: [30, 60], v: 3 },
};
const RAR_ORDER = ['l', 'e', 'r', 'c'];

/* ---------- Fähigkeiten ---------- */
const ABILITIES = [
  { id: 'sog',  name: 'Sog',         stage: 1, cd: 180,  dur: 10, hue: 190,
    desc: 'Saugt 10 s lang von selbst – 10 Tipps pro Sekunde, und jede Beute im Bild wird eingefangen.' },
  { id: 'jet',  name: 'Jet',         stage: 2, cd: 480,  dur: 15, hue: 300,
    desc: '15 s lang ist jeder Tipp ein kritischer Treffer.' },
  { id: 'zeit', name: 'Zeitdehnung', stage: 3, cd: 3600, dur: 0,  hue: 42,
    desc: 'Sofort 30 Minuten Produktion.' },
];

/* ---------- Tagesbeute (7-Tage-Kreis) ---------- */
const DAILY = [
  { min: 10 }, { min: 20 }, { cap: 'c' }, { min: 45 }, { cap: 'r' }, { min: 90 }, { cap: 'e', min: 120 },
];

/* ---------- Urknall: Dunkle Materie ----------
   Lebenslang erzeugte Dunkle Materie gibt +1 % Produktion je Einheit; dieselbe Menge ist im Labor ausgebbar. */
const DM_BASE = 1e10, DM_EXP = 0.27, CORE_BONUS = 0.01, KRAFT = 1.2, BEUTE = 0.1;
const coresFor = total => Math.floor(Math.pow(total / DM_BASE, DM_EXP));
const massFor = cores => DM_BASE * Math.pow(cores, 1 / DM_EXP);

/* ---------- Labor: dauerhafte Forschung für Dunkle Materie ---------- */
const LAB = [
  { id: 'kraft',   ico: '⚛️', hue: 280, name: 'Dunkle Energie',     max: 60, base: 2,  grow: 3,   desc: l => `Gesamtproduktion ×${fmtR(Math.pow(KRAFT, l))}`, step: `×${String(KRAFT).replace('.', ',')} je Stufe` },
  { id: 'start',   ico: '🌱', hue: 140, name: 'Urmasse',            max: 6,  base: 2,  grow: 4,   desc: l => l ? `Jedes Universum startet mit ${fmt(Math.pow(10, 1 + 2 * l))} Masse` : 'Jedes Universum startet mit etwas Masse', step: '×100 je Stufe' },
  { id: 'beute',   ico: '🎯', hue: 30,  name: 'Jagdinstinkt',       max: 10, base: 3,  grow: 2.5, desc: l => `Beute bringt +${Math.round(l * BEUTE * 100)} %`, step: `+${Math.round(BEUTE * 100)} % je Stufe` },
  { id: 'kauf',    ico: '🤖', hue: 200, name: 'Selbstorganisation', max: 2,  base: 20, grow: 15,  desc: l => l >= 2 ? 'Kauft Himmelskörper und Upgrades von selbst' : l ? 'Kauft Himmelskörper von selbst' : 'Automatischer Einkauf', step: 'Stufe 1: Orbit · Stufe 2: auch Upgrades' },
  { id: 'auto',    ico: '🦑', hue: 320, name: 'Fangarme',           max: 5,  base: 12, grow: 4,   desc: l => l ? `Fängt alle ${fmtR([0, 12, 9, 7, 5, 3.5][l])} s eine Beute von selbst` : 'Fängt Beute von selbst', step: 'schneller je Stufe' },
  { id: 'griff',   ico: '👆', hue: 195, name: 'Gezeitengriff',      max: 6,  base: 5,  grow: 4,   desc: l => `Jeder Tipp bringt +${fmtR(l * 0.5)} % deiner Masse/s`, step: '+0,5 % je Stufe' },
  { id: 'krit',    ico: '💥', hue: 8,   name: 'Dunkle Präzision',   max: 8,  base: 4,  grow: 3,   desc: l => `Krit-Chance +${l} %`, step: '+1 % je Stufe' },
  { id: 'rausch',  ico: '🔥', hue: 335, name: 'Dauerhunger',        max: 4,  base: 10, grow: 5,   desc: l => `Fressrausch hält +${l} s`, step: '+1 s je Stufe' },
  { id: 'offline', ico: '🌙', hue: 228, name: 'Stille Tiefe',       max: 6,  base: 3,  grow: 3,   desc: l => `Offline +${l * 4} Std. und +${l * 5} % Ertrag`, step: '+4 Std., +5 % je Stufe' },
  { id: 'gluck',   ico: '🍀', hue: 120, name: 'Glückssträhne',      max: 5,  base: 8,  grow: 3,   desc: l => `Kapseln sind ${l * 15} % öfter selten oder besser`, step: '+15 % je Stufe' },
  { id: 'tempo',   ico: '⏱️', hue: 175, name: 'Zeitkristall',       max: 5,  base: 6,  grow: 3,   desc: l => `Fähigkeiten laden ${Math.round((1 - Math.pow(0.9, l)) * 100)} % schneller`, step: '10 % je Stufe' },
];
const LAB_BY_ID = Object.fromEntries(LAB.map(x => [x.id, x]));
const labCost = (x, l) => Math.round(x.base * Math.pow(x.grow, l));
const AUTO_CATCH = [0, 12, 9, 7, 5, 3.5];

/* ---------- Tagesziele: drei pro Tag, steigende Belohnung ---------- */
const QUESTS = [
  { stat: 'taps',        n: [150, 400, 900], text: n => `Tippe ${n}× auf das Loch` },
  { stat: 'prey',        n: [15, 40, 90],    text: n => `Fange ${n} Beutestücke` },
  { stat: 'crits',       n: [8, 25, 60],     text: n => `Lande ${n} kritische Treffer` },
  { stat: 'frenzies',    n: [1, 3, 6],       text: n => n === 1 ? 'Gerate in einen Fressrausch' : `Gerate ${n}× in einen Fressrausch` },
  { stat: 'bought',      n: [15, 40, 100],   text: n => `Zieh ${n} Himmelskörper in den Orbit` },
  { stat: 'starsCaught', n: [1, 2, 3],       text: n => n === 1 ? 'Fange einen goldenen Kometen' : `Fange ${n} goldene Kometen` },
  { stat: 'capsOpened',  n: [1, 3, 5],       text: n => n === 1 ? 'Öffne eine Kapsel' : `Öffne ${n} Kapseln` },
  { stat: 'bosses',      n: [1, 2, 3],       stage: 1, text: n => n === 1 ? 'Verschlinge eine Großbeute' : `Verschlinge ${n} Großbeuten` },
  { stat: 'abUsed',      n: [1, 3, 6],       stage: 1, text: n => n === 1 ? 'Setze eine Fähigkeit ein' : `Setze ${n}× eine Fähigkeit ein` },
  { stat: 'rivals',      n: [1, 1, 2],       stage: 2, text: n => n === 1 ? 'Verschlinge einen Rivalen' : `Verschlinge ${n} Rivalen` },
];
const QUEST_REWARD = ['c', 'c', 'r']; // alle drei geschafft: zusätzlich eine epische Kapsel
