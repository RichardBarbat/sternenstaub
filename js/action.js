'use strict';
/* Singularität – Action: Beute, kritische Treffer, Fressrausch, Ereignisse, Fähigkeiten, Kapseln & Tagesbeute
   Nutzt Spielstand (S, D) und Hilfen (earn, rate, toast, modal …) aus game.js – aufgerufen wird erst nach dem Laden. */

const ACT = (() => {
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const prey = [];
  let boss = null, rival = null, ev = null;
  let nextPrey = 0, nextEvent = 0, nextCap = 0, lastTap = 0, pendingRausch = false, dailyShown = -1, cracking = false;
  const RZ = { m: 0, until: 0, lock: 0, dur: 10 };
  const active = { sog: 0, jet: 0 };
  const acc = { sog: 0, cat: 0, arm: 0 };
  const AB = Object.fromEntries(ABILITIES.map(a => [a.id, a]));
  const AB_ICO = { sog: '🌀', jet: '⚡', zeit: '⏳' };
  const GOLD = { spr: 'gold', size: [15, 17], hue: 45, tail: 'rgba(255,200,100,1)', fast: 1.15 };
  const CAP = { spr: 'capsule', size: [21, 23], hue: 210, fast: 1.3 };

  const stage = () => stageOf(S.runEarned);
  function setScale(n, f) { const v = 'scaleX(' + clamp(f, 0, 1).toFixed(3) + ')'; if (n._s !== v) { n._s = v; n.style.transform = v; } }
  function fmtClock(sec) {
    sec = Math.max(0, Math.ceil(sec));
    if (sec < 60) return sec + 's';
    if (sec < 600) return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
    return Math.ceil(sec / 60) + 'm';
  }
  function tip(k, html, delay = 0) { if (S.tips[k]) return; S.tips[k] = 1; setTimeout(() => toast(html), delay); }

  // Symbole der Fähigkeiten (Linien wie die Tab-Leiste)
  const SVG = inner => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  const spiral = (() => { let d = ''; for (let i = 0; i <= 64; i++) { const t = i / 64 * Math.PI * 3.4, r = 1 + t * 0.95; d += (i ? 'L' : 'M') + (12 + Math.cos(t) * r).toFixed(2) + ' ' + (12 + Math.sin(t) * r).toFixed(2); } return d; })();
  const ICON = {
    sog: SVG(`<path d="${spiral}"/>`),
    jet: SVG('<ellipse cx="12" cy="12" rx="9.5" ry="2.8"/><circle cx="12" cy="12" r="2.6" fill="currentColor"/><path d="M12 1.5v6M12 16.5v6"/>'),
    zeit: SVG('<path d="M6.5 2.5h11M6.5 21.5h11M7.5 2.5c0 5 9 5.5 9 9.5s-9 4.5-9 9.5M16.5 2.5c0 5-9 5.5-9 9.5s9 4.5 9 9.5"/>'),
  };
  const capCache = {};
  function capImg(r, B = 72) { const k = r + B; return capCache[k] || (capCache[k] = FX.sprite('capsule', RARITY[r].v, B).cv.toDataURL()); }

  /* ======================= Tippen, Krits & Fressrausch ======================= */
  function rauschOn(t = Date.now()) { return t < RZ.until; }
  function rauschMult() { return Date.now() < RZ.until ? D.rauschMult : 1; }
  function critChance() { return Date.now() < active.jet ? 1 : Math.min(1, D.critChance + buffAdd('crit')); }

  // kind: 'tap' (Finger), 'sog' (Fähigkeit), 'auto' (Meilenstein „Eigenrotation“)
  function hit(x, y, kind = 'tap') {
    const crit = kind !== 'auto' && Math.random() < critChance();
    const v = tapValue() * (crit ? D.critMult : 1);
    earn(v);
    if (crit) S.crits++;
    // automatische Tipps (Sog, Eigenrotation) nur mit kleinen Zahlen – sonst wird es zu voll
    FX.tap(x, y, '+' + fmtR(v), kind === 'tap' ? (crit ? 'crit' : 'tap') : (crit ? 'autocrit' : 'auto'));
    if (kind === 'tap') {
      S.taps++; S.tapEarned += v;
      SND.tap(rauschOn());
      if (crit) { SND.crit(); HAP.burst(2, 60); } else HAP.fire();
      addMeter((0.045 + (crit ? 0.05 : 0)) * D.rauschGain);
      if (S.taps >= 5) el.hint.classList.add('gone');
      if (S.taps >= 15) tip('rausch', '🔥 <b>Tippe schnell hintereinander</b><small>dann gerätst du in einen Fressrausch</small>');
    } else if (crit) SND.crit();
    return crit;
  }

  function addMeter(a) {
    const now = Date.now();
    if (now < RZ.until || now < RZ.lock) return;
    RZ.m = Math.min(1, RZ.m + a);
    if (RZ.m >= 1) startRausch(now);
  }
  function startRausch(now) {
    RZ.dur = D.rauschDur; RZ.until = now + RZ.dur * 1000; RZ.m = 0; S.frenzies++;
    FX.setMode('rausch', 1); FX.flash(0.22, 'hsl(330,100%,72%)'); FX.shake(5, 0.5);
    SND.rausch(); HAP.burst(3, 80);
    document.body.classList.add('rausch');
    toast(`🔥 <b>Fressrausch!</b><small>Alles ×${D.rauschMult} für ${RZ.dur} Sekunden</small>`);
    nextPrey = Math.min(nextPrey, now + 400);
    checkAch();
  }
  function endRausch(now) {
    RZ.until = 0; RZ.lock = now + 6000; // erst verdauen
    FX.setMode('rausch', 0); document.body.classList.remove('rausch'); SND.rauschEnd();
  }

  function stageTap(x, y) {
    lastTap = Date.now();
    if (rival && !rival.leaving && rival.vis > 0.5 && Math.hypot(x - rival.x, y - rival.y) < rival.r * 2.2 + 26) return hitRival(x, y);
    if (boss && Math.hypot(x - boss.x, y - boss.y) < boss.size * 0.55 + 30) return hitBoss(x, y);
    const p = findPrey(x, y);
    if (p) return catchPrey(p, false);
    hit(x, y, 'tap');
  }

  /* ======================= Beute ======================= */
  const Q = { x: 0, y: 0 };
  function bez(p, t) { const u = 1 - t; Q.x = u * u * p.x0 + 2 * u * t * p.cx + t * t * p.x1; Q.y = u * u * p.y0 + 2 * u * t * p.cy + t * t * p.y1; return Q; }
  // Flugbereich: unter den Meldungen oben, über der Wachstumsanzeige (bzw. dem Ereignis-Banner) unten
  function band(bottomPad = 46) { const st = el.stage.getBoundingClientRect(); return { top: st.top + 56, bottom: st.bottom - bottomPad, w: innerWidth }; }
  function pathClear(p, clearR, b) {
    const h = FX.hole;
    for (let i = 0; i <= 24; i++) {
      bez(p, i / 24);
      if (Math.hypot(Q.x - h.x, Q.y - h.y) < clearR || Q.y < b.top - 8 || Q.y > b.bottom + 8) return false;
    }
    return true;
  }
  // Flugbahn quer durchs Bild, vom Loch leicht angezogen, aber nie hinein
  function makePath(fromLeft) {
    const b = band(), h = FX.hole, W = b.w, clearR = h.R * 2.3 + 14;
    const x0 = fromLeft ? -30 : W + 30, x1 = fromLeft ? W + 30 : -30;
    for (let tries = 0; tries < 10; tries++) {
      const above = Math.random() < 0.5;
      let lo = above ? b.top : h.y + clearR, hi = above ? h.y - clearR : b.bottom;
      if (hi - lo < 14) { lo = b.top; hi = b.bottom; }
      const y0 = rand(lo, hi), y1 = rand(lo, hi), mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
      const p = { x0, y0, cx: mx + rand(-40, 40), cy: my + (h.y - my) * rand(0.1, 0.45), x1, y1 };
      if (pathClear(p, clearR, b)) return p;
    }
    const y = b.top + 4;
    return { x0, y0: y, cx: W / 2, cy: y, x1, y1: y };
  }
  function spawnPrey(kind, o = {}) {
    const d = kind === 'gold' ? GOLD : kind === 'cap' ? CAP : PREY[kind];
    const path = makePath(o.fromLeft ?? Math.random() < 0.5);
    const p = {
      kind, spr: d.spr, v: kind === 'cap' ? RARITY[o.cap].v : Math.floor(Math.random() * 4),
      hue: kind === 'cap' ? RARITY[o.cap].hue : d.hue, size: rand(d.size[0], d.size[1]),
      rot: Math.random() * 6, spin: rand(-1.4, 1.4), path, t: 0,
      dur: rand(5.5, 8) * D.preyLife * (d.fast || 1) * (o.fast || 1), x: path.x0, y: path.y0, alpha: 0,
      swarm: !!o.swarm, tail: d.tail || null, hist: d.tail ? [] : null, cap: o.cap,
    };
    prey.push(p);
    return p;
  }
  function randomKind() {
    const st = stage();
    return pick(Object.entries(PREY).filter(([, d]) => st >= d.stage).map(([k, d]) => ({ k, w: d.w }))).k;
  }
  // Labor „Glückssträhne“ verschiebt die Chancen nach oben
  function rollRarity() { const r = Math.random() / (1 + (D.luck || 0)); return r < 0.01 ? 'l' : r < 0.1 ? 'e' : r < 0.38 ? 'r' : 'c'; }
  function schedPrey(now) { nextPrey = now + rand(3.5, 7) * 1000 / D.preyFreq / (rauschOn(now) ? 3 : 1); }

  function updatePrey(dt) {
    for (let i = prey.length - 1; i >= 0; i--) {
      const p = prey[i];
      p.t += dt;
      const k = p.t / p.dur;
      if (k >= 1) { prey.splice(i, 1); continue; }
      bez(p.path, k); p.x = Q.x; p.y = Q.y;
      p.rot += p.spin * dt;
      p.alpha = Math.min(1, p.t * 3);
      if (p.hist) { p.hist.push({ x: p.x, y: p.y }); if (p.hist.length > 16) p.hist.shift(); }
    }
  }
  function findPrey(x, y) {
    let best = null, bd = 1e9;
    for (const p of prey) {
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < Math.max(30, p.size * 0.6 + 22) && d < bd) { bd = d; best = p; }
    }
    return best;
  }
  function preyValue(d) {
    return Math.max(tapBase() * d.tap, baseRate() * buffMult('prod') * d.sec, 3) * D.preyMult * rauschMult();
  }
  function catchPrey(p, auto) {
    const i = prey.indexOf(p); if (i < 0) return;
    prey.splice(i, 1);
    if (!auto) addMeter(0.12 * D.rauschGain);
    if (p.kind === 'gold') return catchGold(p);
    if (p.kind === 'cap') {
      FX.devour({ spr: 'capsule', v: p.v, x: p.x, y: p.y, size: p.size, hue: p.hue });
      give(p.cap, 1); SND.chest('c'); HAP.burst(2);
      toast(`🎁 <b>Kapsel geschnappt!</b><small>+1 ${RARITY[p.cap].adj} Kapsel</small>`);
      save(); return;
    }
    const v = preyValue(PREY[p.kind]) * (p.swarm ? 1.5 : 1);
    earn(v); S.prey++;
    if (p.swarm && ev && ev.kind === 'swarm') ev.caught++;
    FX.devour({ spr: p.spr, v: p.v, x: p.x, y: p.y, size: p.size, hue: p.hue });
    FX.float(p.x, p.y, '+' + fmt(v), 'big'); FX.toCounter(p.x, p.y, 4);
    SND.devour(); HAP.fire(true);
  }
  function catchGold(p) {
    S.starsCaught++;
    FX.devour({ spr: 'gold', x: p.x, y: p.y, size: p.size, hue: 45 });
    FX.burst(p.x, p.y, 60, 45, 1.6); FX.wave(p.x, p.y, 6, 70, 0.6, { h: 45, width: 4, alpha: 0.8 });
    SND.star(); HAP.burst(2);
    const e = pick(STAR_EFFECTS);
    if (e.id === 'fund') {
      const g = Math.max(baseRate() * buffMult('prod') * 600, tapBase() * 40, 25);
      earn(g); FX.float(p.x, p.y + 30, '+' + fmt(g), 'big');
      toast(`🌠 <b>Goldfund!</b><small>+${fmt(g)} Masse</small>`);
    } else {
      const dur = e.dur * D.buffDur;
      addBuff({ id: e.id, ico: e.ico, name: e.name, short: e.short, prod: e.prod || 0, tap: e.tap || 0 }, dur);
      toast(`🌠 <b>${e.name}!</b><small>${e.desc} für ${Math.round(dur)} Sekunden</small>`);
    }
    checkAch(); save();
  }

  /* ======================= Ereignisse ======================= */
  function schedEvent(now) { nextEvent = now + rand(75, 140) * 1000 / D.eventFreq; }
  function startEvent(kind) {
    const st = stage();
    if (!kind) kind = pick([{ k: 'swarm', w: 45 }, ...(st >= 1 ? [{ k: 'boss', w: 35 }] : []), ...(st >= 2 ? [{ k: 'rival', w: 25 }] : [])]).k;
    if (kind === 'swarm') startSwarm(); else if (kind === 'boss') startBoss(); else startRival();
  }
  function updateEvent(dt, now) {
    if (ev.kind === 'swarm') {
      if (ev.spawned < ev.n && now >= ev.next) {
        spawnPrey(Math.random() < 0.7 ? 'rock' : 'ice', { swarm: true, fromLeft: ev.fromLeft, fast: 0.72 });
        ev.spawned++; ev.next = now + rand(280, 520);
      }
      if (ev.spawned >= ev.n && !prey.some(p => p.swarm)) endSwarm(now);
    } else if (ev.kind === 'boss' && boss) updateBoss(dt);
    else if (ev.kind === 'rival' && rival) updateRival(dt);
  }

  // Asteroidenschwarm
  function startSwarm() {
    const n = 10 + Math.min(10, stage() * 2);
    ev = { kind: 'swarm', n, spawned: 0, caught: 0, next: 0, fromLeft: Math.random() < 0.5 };
    SND.alarm(); HAP.burst(2, 90);
    toast('☄️ <b>Asteroidenschwarm!</b><small>Schnapp dir so viele wie möglich</small>');
  }
  function endSwarm(now) {
    if (ev.caught >= ev.n) {
      S.swarms++; give('c', 1); SND.win(); HAP.burst(3);
      toast('☄️ <b>Ganzer Schwarm verschlungen!</b><small>+1 gewöhnliche Kapsel</small>');
    } else toast(`☄️ <b>Schwarm vorbei</b><small>${ev.caught} von ${ev.n} erwischt</small>`);
    ev = null; schedEvent(now); checkAch(); save();
  }

  // Großbeute: muss rechtzeitig zerrissen werden
  function startBoss() {
    const st = stage(), B = BOSSES.filter(b => st >= b.stage).pop(), h = FX.hole, b = band(72), W = b.w;
    const hp = Math.max(8, Math.round((18 + 4 * Math.min(st, 8)) * D.bossHp));
    const size = clamp(h.R * 0.9 + 12, 34, 54), fromLeft = Math.random() < 0.5, above = Math.random() < 0.5;
    let y = above ? h.y - h.R * 2 - size * 0.5 : h.y + h.R * 2 + size * 0.5;
    y = clamp(y, b.top + size * 0.4, b.bottom - size * 0.5);
    const path = { x0: fromLeft ? -size : W + size, y0: y + rand(-8, 8), cx: W / 2, cy: y + (above ? -12 : 12), x1: fromLeft ? W + size : -size, y1: y + rand(-8, 8) };
    boss = Object.assign({}, B, { hp, max: hp, size, path, t: 0, dur: 14, x: path.x0, y: path.y0, rot: 0, shake: 0, alpha: 1,
      tail: B.spr === 'bcomet' ? 'rgba(150,215,255,1)' : null, hist: B.spr === 'bcomet' ? [] : null });
    ev = { kind: 'boss' };
    FX.setBoss(boss); SND.alarm(); HAP.burst(2, 90);
    toast(`${B.ico} <b>${B.name}!</b><small>${hp}× antippen, bevor er entkommt</small>`);
  }
  function updateBoss(dt) {
    boss.t += dt;
    const k = boss.t / boss.dur;
    if (k >= 1) return bossEscape();
    bez(boss.path, k + 0.08 * Math.sin(TAU * k)); // in der Mitte, nah am Loch, langsamer
    boss.x = Q.x; boss.y = Q.y;
    boss.rot += dt * 0.4; boss.shake = Math.max(0, boss.shake - dt * 4);
    if (boss.hist) { boss.hist.push({ x: boss.x, y: boss.y }); if (boss.hist.length > 22) boss.hist.shift(); }
  }
  function hitBoss(x, y) {
    const crit = hit(x, y, 'tap');
    boss.hp -= crit ? 3 : 1; boss.shake = 1;
    FX.pull(boss.x, boss.y, 6, boss.hue, boss.size * 0.3); FX.burst(x, y, 6, boss.hue); FX.shake(1.5, 0.15);
    SND.hit();
    if (boss.hp <= 0) bossDown();
  }
  function bossDown() {
    const b = boss, st = stage(), g = Math.max(baseRate() * buffMult('prod') * 60, tapBase() * 80) * (1 + 0.1 * st) * rauschMult();
    boss = null; FX.setBoss(null); ev = null; S.bosses++;
    earn(g);
    FX.devour({ spr: b.spr, x: b.x, y: b.y, size: b.size, hue: b.hue, big: true,
      cb: () => { FX.float(FX.hole.x, FX.hole.y - FX.hole.R * 2.2, '+' + fmt(g), 'big'); FX.toCounter(FX.hole.x, FX.hole.y, 8); } });
    const r = rollRarity();
    give(r, 1); SND.devour(true); SND.win(); HAP.burst(4, 80);
    toast(`${b.ico} <b>${b.name} verschlungen!</b><small>+${fmt(g)} Masse · +1 ${RARITY[r].adj} Kapsel</small>`);
    schedEvent(Date.now()); checkAch(); save();
  }
  function bossEscape() {
    toast(`${boss.ico} <b>${boss.name} ist entkommen</b><small>Beim nächsten Mal schneller tippen!</small>`);
    SND.lost(); boss = null; FX.setBoss(null); ev = null; schedEvent(Date.now());
  }

  // Rivale: ein fremdes Schwarzes Loch saugt deine Masse ab
  function startRival() {
    const h = FX.hole, b = band(72), side = Math.random() < 0.5 ? -1 : 1, r = Math.max(11, h.R * 0.42);
    // nicht unter die Knöpfe am Rand (Kapseln links, Fähigkeiten rechts)
    const x = clamp(h.x + side * Math.min(innerWidth * 0.32, h.orbitR * 0.78), 66 + r * 2.7, innerWidth - 72 - r * 2.7);
    const y = clamp(h.y + rand(-h.R * 1.2, h.R * 0.6), b.top + r * 2, b.bottom - r * 2);
    const hp = Math.max(6, Math.round(12 * D.bossHp));
    rival = { x, y, r, hp, max: hp, t: 0, dur: 15, stolen: 0, acc: 0, vis: 0, shake: 0, stealing: false, leaving: false };
    ev = { kind: 'rival' };
    FX.setRival(rival); SND.alarm(); HAP.burst(3, 90);
    toast('⚫ <b>Ein Rivale!</b><small>Er saugt deine Masse ab – tippe ihn an!</small>');
  }
  function updateRival(dt) {
    rival.t += dt; rival.vis = Math.min(1, rival.vis + dt * 2); rival.shake = Math.max(0, rival.shake - dt * 4);
    if (rival.vis >= 1) {
      rival.stealing = true; rival.acc += dt;
      if (rival.acc >= 1) {
        rival.acc -= 1;
        const amt = S.dust * 0.015;
        if (amt >= 1) {
          S.dust -= amt; rival.stolen += amt; SND.steal();
          const d = el.dust.getBoundingClientRect();
          FX.float(d.left + d.width / 2, d.bottom + 18, '−' + fmt(amt), 'loss');
        }
      }
    }
    if (rival.t >= rival.dur) {
      toast(`⚫ <b>Der Rivale ist entkommen</b><small>mit ${fmt(rival.stolen)} deiner Masse</small>`);
      SND.lost(); rival.leaving = true; rival.stealing = false; ev = null; schedEvent(Date.now());
    }
  }
  function hitRival(x, y) {
    const crit = hit(x, y, 'tap');
    rival.hp -= crit ? 3 : 1; rival.shake = 1;
    FX.wave(rival.x, rival.y, rival.r, rival.r * 1.6, 0.3, { h: 290, width: 3, alpha: 0.7 }); SND.hit();
    if (rival.hp <= 0) rivalDown();
  }
  function rivalDown() {
    const rv = rival, g = rv.stolen * 2 + Math.max(baseRate() * buffMult('prod') * 45, tapBase() * 50) * rauschMult();
    rival = null; FX.setRival(null); ev = null; S.rivals++;
    earn(g);
    FX.devour({ spr: 'mini', x: rv.x, y: rv.y, size: rv.r * 2, hue: 290, big: true,
      cb: () => { FX.float(FX.hole.x, FX.hole.y - FX.hole.R * 2.2, '+' + fmt(g), 'big'); FX.toCounter(FX.hole.x, FX.hole.y, 8); FX.flash(0.3, 'hsl(290,100%,82%)'); } });
    const r = rollRarity();
    give(r, 1); SND.devour(true); SND.win(); HAP.burst(4, 80);
    toast(`⚫ <b>Rivale verschlungen!</b><small>+${fmt(g)} Masse · +1 ${RARITY[r].adj} Kapsel</small>`);
    schedEvent(Date.now()); checkAch(); save();
  }

  /* ======================= Fähigkeiten ======================= */
  function useAbility(id) {
    const a = AB[id], now = Date.now();
    if (!a || S.stageBest < a.stage) return;
    const readyAt = S.ab[id] || 0;
    if (now < readyAt) { toast(`${AB_ICO[id]} <b>${a.name}</b><small>lädt noch · ${fmtClock((readyAt - now) / 1000)}</small>`); HAP.fire(true); return; }
    S.ab[id] = now + a.cd * D.abCd * 1000; S.abUsed++;
    SND.ability(); HAP.burst(2, 70);
    if (id === 'sog') {
      active.sog = now + (a.dur + D.sogDur) * 1000; acc.sog = 0; acc.cat = 0; FX.setMode('sog', 1);
      toast('🌀 <b>Sog!</b><small>Alles in der Nähe wird eingesaugt</small>');
    } else if (id === 'jet') {
      active.jet = now + (a.dur + D.jetDur) * 1000; FX.setMode('jet', 1); FX.flash(0.2, 'hsl(205,100%,85%)');
      toast('⚡ <b>Jet!</b><small>Jeder Tipp ist jetzt kritisch</small>');
    } else if (id === 'zeit') {
      const g = Math.max(baseRate() * buffMult('prod') * 1800, tapBase() * 300) * D.zeitMult;
      SND.warp();
      FX.timeWarp(() => { earn(g); FX.float(FX.hole.x, FX.hole.y - FX.hole.R * 2.2, '+' + fmt(g), 'big'); FX.toCounter(FX.hole.x, FX.hole.y, 10); save(); });
      toast(`⏳ <b>Zeitdehnung</b><small>${D.zeitMult > 1 ? 'Eine Stunde vergeht' : '30 Minuten vergehen'} in einem Augenblick</small>`);
    }
    save();
  }
  function renderAbil(now) {
    for (const b of el.abil.children) {
      const a = AB[b.dataset.ab], open = S.stageBest >= a.stage;
      if (b.hidden === open) b.hidden = !open;
      if (!open) continue;
      const until = active[a.id] || 0, on = until > now, readyAt = S.ab[a.id] || 0, ready = now >= readyAt;
      const p = on || ready ? 0 : clamp((readyAt - now) / (a.cd * D.abCd * 1000) * 100, 0, 100);
      const cls = 'ab' + (on ? ' act' : ready ? ' ready' : ' cool');
      if (b.className !== cls) b.className = cls;
      const ps = p.toFixed(1); if (b._p !== ps) { b._p = ps; b.style.setProperty('--p', ps); }
      put(b.querySelector('.t'), on ? String(Math.ceil((until - now) / 1000)) : ready ? '' : fmtClock((readyAt - now) / 1000));
    }
  }

  /* ======================= Kapseln ======================= */
  const capsTotal = () => RAR_ORDER.reduce((a, k) => a + (S.caps[k] || 0), 0);
  function give(r, n = 1) {
    S.caps[r] = (S.caps[r] || 0) + n;
    renderCapBtn(true);
    tip('caps', '🎁 <b>Kapsel erhalten!</b><small>Links antippen zum Öffnen</small>', 1500);
  }
  function renderCapBtn(pulse) {
    const n = capsTotal(), best = RAR_ORDER.find(k => S.caps[k] > 0);
    el.capBtn.hidden = !n;
    if (!n) return;
    el.capN.textContent = n;
    if (el.capImg._r !== best) { el.capImg._r = best; el.capImg.src = capImg(best, 48); }
    el.capBtn.style.setProperty('--h', RARITY[best].hue);
    if (pulse) { el.capBtn.classList.remove('new'); void el.capBtn.offsetWidth; el.capBtn.classList.add('new'); }
  }
  function openCaps() {
    const r = RAR_ORDER.find(k => S.caps[k] > 0);
    if (!r) return;
    const R0 = RARITY[r];
    modal(`<div class="capwrap" style="--h:${R0.hue};--s:${R0.sat}%"><button class="capsule" data-m="crack" aria-label="Kapsel öffnen"><img src="${capImg(r, 128)}" alt=""></button></div>
      <h3>${R0.name}</h3><p>Tippe auf die Kapsel, um sie zu öffnen.</p>`,
      k => { if (k === 'crack') crack(r); else if (k === 'next') openCaps(); }, !el.modal.hidden);
  }
  function crack(r) {
    if (cracking || !(S.caps[r] > 0)) return;
    cracking = true;
    const btn = el.sheet.querySelector('.capsule');
    if (btn) btn.classList.add('shake');
    HAP.burst(3, 110); SND.ability();
    setTimeout(() => {
      cracking = false;
      if (el.modal.hidden) return;
      S.caps[r]--; S.capsOpened++;
      const items = rollLoot(r);
      items.forEach(it => it.apply());
      recalc(); syncOrbit(); listKey = ''; renderList(); renderBuffs(); renderCapBtn(); save();
      SND.chest(r); HAP.burst(r === 'l' ? 4 : 2, 80);
      FX.flash(0.22, `hsl(${RARITY[r].hue},100%,82%)`);
      const R0 = RARITY[r], left = capsTotal();
      el.sheet.innerHTML = `<div class="capwrap open" style="--h:${R0.hue};--s:${R0.sat}%"><div class="rays"></div></div>
        <h3>${R0.name}</h3>
        <div class="loot">${items.map((it, i) => `<div class="li" style="--d:${i * 120 + 150}ms;--h:${it.hue}"><span class="lic">${it.ico}</span><span class="lt"><b>${it.title}</b><small>${it.sub}</small></span></div>`).join('')}</div>
        ${left ? `<button class="btn" data-m="next">Nächste öffnen (${left})</button><button class="btn ghost" data-m="close">Später</button>` : '<button class="btn" data-m="close">Super!</button>'}`;
      checkAch();
    }, 700);
  }
  function lootMass(r) {
    const R0 = RARITY[r], m = Math.round(rand(R0.min[0], R0.min[1]));
    const g = Math.max(baseRate() * buffMult('prod') * m * 60, tapBase() * m * 25, 40 * m);
    return { ico: '✦', hue: 42, title: `+${fmt(g)} Masse`, sub: `${m} Min. Produktion`, apply: () => earn(g) };
  }
  const DUR = { prod: { c: 60, r: 120, e: 180, l: 300 }, tap: { c: 30, r: 60, e: 90, l: 120 }, crit: { c: 45, r: 60, e: 90, l: 120 } };
  const mins = s => s >= 60 ? `${s / 60} Min. lang` : `${s} Sekunden lang`;
  function makeLoot(id, r) {
    if (id === 'mass') return lootMass(r);
    if (id === 'prod') { const d = DUR.prod[r]; return { ico: '⚡', hue: 45, title: 'Produktion ×3', sub: mins(d), apply: () => addBuff({ id: 'kprod', ico: '⚡', name: 'Kapselschub', short: 'Prod. ×3', prod: 3 }, d) }; }
    if (id === 'tap') { const d = DUR.tap[r]; return { ico: '👆', hue: 195, title: 'Tippen ×10', sub: mins(d), apply: () => addBuff({ id: 'ktap', ico: '👆', name: 'Kapselgriff', short: 'Tipp ×10', tap: 10 }, d) }; }
    if (id === 'crit') { const d = DUR.crit[r]; return { ico: '💥', hue: 10, title: 'Krit-Chance +30 %', sub: mins(d), apply: () => addBuff({ id: 'kcrit', ico: '💥', name: 'Krit-Fieber', short: 'Krit +30 %', crit: 0.3 }, d) }; }
    if (id === 'gens') {
      const owned = GENS.map((_, i) => i).filter(i => S.gens[i] > 0);
      if (!owned.length) return null;
      const top = owned[owned.length - 1], cand = owned.filter(i => i >= top - 2), i = cand[Math.floor(Math.random() * cand.length)];
      const [a, b] = { r: [2, 4], e: [5, 9], l: [10, 20] }[r] || [1, 2], n = Math.round(rand(a, b));
      return { ico: GENS[i].ico, hue: GENS[i].hue, title: `+${n} × ${GENS[i].name}`, sub: 'kreisen jetzt in deinem Orbit', apply: () => { S.gens[i] += n; } };
    }
    if (id === 'rausch') return { ico: '🔥', hue: 330, title: 'Fressrausch', sub: 'startet gleich nach dem Öffnen', apply: () => { pendingRausch = true; } };
    if (id === 'charge') return { ico: '⏱️', hue: 190, title: 'Fähigkeiten aufgeladen', sub: 'sofort wieder einsatzbereit', apply: () => { S.ab = {}; } };
    if (id === 'dm') { const n = r === 'l' ? 2 : 1; return { ico: '💠', hue: 280, title: `+${n} Dunkle Materie`, sub: `+${n} % Produktion für immer, auch fürs Labor`, apply: () => { S.cores += n; S.dm += n; } }; }
    return null;
  }
  function rollLoot(r) {
    const items = [lootMass(r)];
    const pool = [{ id: 'prod', w: 16 }, { id: 'tap', w: 13 }, { id: 'crit', w: 11 }];
    if (r !== 'c') pool.push({ id: 'gens', w: 14 }, { id: 'rausch', w: 8 });
    if (r === 'e' || r === 'l') pool.push({ id: 'charge', w: 6 }, { id: 'dm', w: 5 });
    while (items.length < RARITY[r].n && pool.length) {
      const it = pick(pool); pool.splice(pool.indexOf(it), 1);
      const made = makeLoot(it.id, r); if (made) items.push(made);
    }
    return items;
  }

  /* ======================= Tagesbeute ======================= */
  function dayNum(ts = Date.now()) { return Math.floor((ts - new Date(ts).getTimezoneOffset() * 60000) / 864e5); }
  function checkDaily() {
    const today = dayNum(), d = S.daily;
    if (d.last === today || dailyShown === today) return;
    dailyShown = today;
    const streak = d.last === today - 1 ? d.streak + 1 : 1, idx = (streak - 1) % 7;
    const tiles = DAILY.map((x, i) => {
      const st = i < idx ? 'done' : i === idx ? 'today' : '';
      const ico = x.cap ? `<img src="${capImg(x.cap, 48)}" alt="">` : '<span class="dm">✦</span>';
      const lab = x.cap ? (x.min ? 'Kapsel+' : 'Kapsel') : `${x.min} Min.`;
      return `<div class="day ${st}"><small>Tag ${i + 1}</small>${ico}<b>${lab}</b></div>`;
    }).join('');
    modal(`<div class="em">🎁</div><h3>Tagesbeute</h3>
      <p>${streak > 1 ? `Tag ${streak} in Folge – stark!` : 'Schön, dass du da bist!'} Komm morgen wieder, die Beute wird jeden Tag besser.</p>
      <div class="days">${tiles}</div><button class="btn" data-m="claim">Abholen</button>`, k => {
      if (k !== 'claim' || S.daily.last === today) return;
      S.daily = { last: today, streak, total: (d.total || 0) + 1 };
      const x = DAILY[idx], txt = [];
      if (x.min) { const g = Math.max(baseRate() * buffMult('prod') * x.min * 60, tapBase() * x.min * 20, 30 * x.min); earn(g); txt.push('+' + fmt(g) + ' Masse'); }
      if (x.cap) { give(x.cap, 1); txt.push('+1 ' + RARITY[x.cap].adj + ' Kapsel'); }
      closeModal(); SND.chest(x.cap || 'r'); HAP.burst(2);
      toast(`🎁 <b>Tagesbeute</b><small>${txt.join(' · ')}</small>`);
      checkAch(); save();
    });
  }

  /* ======================= Tagesziele ======================= */
  function ensureQuests() {
    const today = dayNum();
    if (S.quest.day === today && S.quest.list.length === 3) return;
    const pool = QUESTS.filter(q => q.stage == null || S.stageBest >= q.stage).sort(() => Math.random() - 0.5).slice(0, 3);
    S.quest = { day: today, bonus: false, list: pool.map((q, i) => ({ stat: q.stat, need: q.n[i], base: S[q.stat] || 0, got: false })) };
  }
  const qDef = q => QUESTS.find(d => d.stat === q.stat);
  const qProg = q => Math.min(q.need, Math.max(0, (S[q.stat] || 0) - q.base));
  function questClaimable() { ensureQuests(); return S.quest.list.some(q => !q.got && qProg(q) >= q.need); }
  function questKey() { ensureQuests(); return S.quest.day + S.quest.list.map(q => (q.got ? 'x' : qProg(q) >= q.need ? 'r' : 'o')).join('') + S.quest.bonus; }
  function questCard() {
    ensureQuests();
    const rows = S.quest.list.map((q, i) => {
      const ready = qProg(q) >= q.need, r = RARITY[QUEST_REWARD[i]];
      return `<div class="quest ${q.got ? 'got' : ready ? 'ready' : ''}" data-q="${i}"><div class="qi"><b>${qDef(q).text(q.need)}</b>
        <div class="bar"><i></i></div><small></small></div>
        ${q.got ? '<div class="chk">✓</div>' : `<button class="qb" data-act="quest" data-i="${i}" ${ready ? '' : 'disabled'}><img src="${capImg(QUEST_REWARD[i], 48)}" alt="${r.name}"></button>`}</div>`;
    }).join('');
    const all = S.quest.list.every(q => q.got);
    return `<div class="card"><h3>🎯 Tagesziele <small class="hs">neu um Mitternacht</small></h3>${rows}
      <p class="note" style="margin-top:8px">${all ? 'Alle geschafft – morgen gibt es neue Ziele.' : 'Schaffst du alle drei, gibt es zusätzlich eine <b>epische Kapsel</b>.'}</p></div>`;
  }
  function questUpdate() {
    for (const n of el.list.querySelectorAll('.quest')) {
      const q = S.quest.list[+n.dataset.q]; if (!q) continue;
      const p = q.got ? q.need : qProg(q);
      setScale(n.querySelector('.bar i'), p / q.need);
      put(n.querySelector('small'), `${fmt(p)} / ${fmt(q.need)}`);
    }
  }
  function claimQuest(i) {
    const q = S.quest.list[i];
    if (!q || q.got || qProg(q) < q.need) return;
    q.got = true; S.questsDone++;
    const r = QUEST_REWARD[i]; give(r, 1);
    let txt = `+1 ${RARITY[r].adj} Kapsel`;
    if (!S.quest.bonus && S.quest.list.every(x => x.got)) { S.quest.bonus = true; give('e', 1); txt += ' · +1 epische Kapsel für alle drei'; }
    SND.chest(r); HAP.burst(2);
    toast(`🎯 <b>Tagesziel geschafft</b><small>${txt}</small>`);
    listKey = ''; renderList(); checkAch(); save();
  }

  /* ======================= Wachstum ======================= */
  function stageUp(st) {
    FX.stageUp(); SND.stageUp(); HAP.burst(4, 90);
    const r = st <= 2 ? 'c' : st <= 4 ? 'r' : st <= 6 ? 'e' : 'l';
    give(r, 1);
    toast(`🕳️ <b>${STAGES[st].name}</b><small>gewachsen · +1 Kapsel</small>`);
    const neu = ABILITIES.filter(a => a.stage <= st && !S.tips['ab_' + a.id]);
    if (neu.length) {
      neu.forEach(a => { S.tips['ab_' + a.id] = 1; });
      setTimeout(() => toast(`${AB_ICO[neu[0].id]} <b>Neue Fähigkeit${neu.length > 1 ? 'en' : ''}: ${neu.map(a => a.name).join(' & ')}</b><small>Rechts am Rand antippen</small>`), 1600);
    }
    checkAch(); save();
  }

  /* ======================= Schleife & Anzeige ======================= */
  function update(dt, now) {
    if (RZ.until && now >= RZ.until) endRausch(now);
    if (now >= RZ.until) { const idle = (now - lastTap) / 1000; RZ.m = Math.max(0, RZ.m - dt * (0.05 + (idle > 1.2 ? 0.22 : 0))); }
    if (pendingRausch && el.modal.hidden) { pendingRausch = false; startRausch(now); }

    if (active.sog) {
      if (now >= active.sog) { active.sog = 0; FX.setMode('sog', 0); }
      else {
        acc.sog += dt;
        for (let k = 0; acc.sog >= 0.1 && k < 5; k++) {
          acc.sog -= 0.1;
          const h = FX.hole, a = Math.random() * TAU, d = h.R * (1.6 + Math.random() * 1.6);
          hit(h.x + Math.cos(a) * d, h.y + Math.sin(a) * d * 0.6, 'sog');
        }
        acc.cat += dt;
        if (acc.cat >= 0.3) { acc.cat = 0; if (prey.length) catchPrey(prey[0], true); }
      }
    }
    if (active.jet && now >= active.jet) { active.jet = 0; FX.setMode('jet', 0); }
    // Labor „Fangarme“: fängt Beute von selbst
    if (D.autoCatch) { acc.arm += dt; if (acc.arm >= D.autoCatch) { const p = prey.find(q => q.x > 20 && q.x < innerWidth - 20); if (p) { acc.arm = 0; catchPrey(p, true); } } }

    const free = el.modal.hidden && !document.hidden;
    if (free && now >= nextPrey) {
      if (prey.filter(p => !p.swarm).length < (rauschOn(now) ? 6 : 4)) {
        spawnPrey(randomKind());
        tip('prey', '🎯 <b>Beute im Anflug!</b><small>Tippe sie an, um sie zu verschlingen</small>');
      }
      schedPrey(now);
    }
    if (free && now >= S.nextStar) { spawnPrey('gold'); S.nextStar = now + rand(55, 135) * 1000 / D.preyFreq; }
    if (free && now >= nextCap) { spawnPrey('cap', { cap: rollRarity() }); nextCap = now + rand(240, 420) * 1000; }
    updatePrey(dt);

    if (!ev && now >= nextEvent) {
      if (free && now - lastTap < 25000) startEvent(); else nextEvent = now + 5000;
    }
    if (ev) updateEvent(dt, now);
    if (rival && rival.leaving) { rival.vis -= dt * 2.5; if (rival.vis <= 0) { rival = null; FX.setRival(null); } }
  }

  function renderEvent() {
    let kind = '', html = '', frac = 0;
    if (ev && ev.kind === 'swarm') { kind = 'swarm'; frac = ev.caught / ev.n; html = `<span class="ei">☄️</span><span class="et">Asteroidenschwarm</span><span class="es">${ev.caught}/${ev.n}</span>`; }
    else if (boss) { kind = 'boss'; frac = boss.hp / boss.max; html = `<span class="ei">${boss.ico}</span><span class="et">${boss.name}</span><span class="es">${Math.max(0, Math.ceil(boss.dur - boss.t))} s</span>`; }
    else if (rival && !rival.leaving) { kind = 'rival'; frac = rival.hp / rival.max; html = `<span class="ei">⚫</span><span class="et">Rivale</span><span class="es">${Math.max(0, Math.ceil(rival.dur - rival.t))} s</span>`; }
    const show = !!kind;
    if (el.event.hidden === show) { el.event.hidden = !show; el.stage.classList.toggle('ev', show); }
    if (!show) return;
    if (el.event.dataset.k !== kind) el.event.dataset.k = kind;
    put(el.eventTxt, html);
    setScale(el.eventBar, frac);
  }

  function ui(now) {
    const on = now < RZ.until;
    setScale(el.hungerFill, on ? (RZ.until - now) / (RZ.dur * 1000) : RZ.m);
    const cls = on ? 'on' : RZ.m > 0.72 ? 'hot' : RZ.m > 0.02 ? 'fill' : '';
    if (el.hunger.className !== cls) el.hunger.className = cls;
    put(el.hungerTxt, on ? `Fressrausch ×${D.rauschMult} · ${Math.ceil((RZ.until - now) / 1000)} s` : 'Fressrausch');
    renderEvent();
    renderAbil(now);
    const sf = stageFloat(S.runEarned), st = Math.floor(sf);
    put(el.gname, STAGES[st].name);
    setScale(el.gbar, st >= STAGES.length - 1 ? 1 : sf - st);
  }

  function init() {
    FX.setPrey(prey);
    el.abil.innerHTML = ABILITIES.map(a => `<button class="ab" data-ab="${a.id}" style="--h:${a.hue}" aria-label="${a.name}: ${a.desc}" hidden>${ICON[a.id]}<b class="t"></b><span class="an">${a.id === 'zeit' ? 'Zeit' : a.name}</span></button>`).join('');
    el.abil.addEventListener('click', e => { const b = e.target.closest('[data-ab]'); if (b) { SND.unlock(); useAbility(b.dataset.ab); } });
    el.capBtn.addEventListener('click', () => { SND.unlock(); HAP.fire(true); openCaps(); });
    const t = Date.now();
    nextPrey = t + 5000; nextEvent = t + rand(55, 85) * 1000; nextCap = t + rand(180, 320) * 1000;
    renderCapBtn();
  }

  function reset() {
    prey.length = 0; boss = null; rival = null; ev = null;
    FX.setBoss(null); FX.setRival(null);
    RZ.m = 0; RZ.until = 0; RZ.lock = 0; active.sog = 0; active.jet = 0; pendingRausch = false;
    FX.setMode('rausch', 0); FX.setMode('sog', 0); FX.setMode('jet', 0);
    document.body.classList.remove('rausch');
    const t = Date.now(); nextPrey = t + 4000; nextEvent = t + rand(55, 85) * 1000;
    renderCapBtn();
  }

  return {
    init, reset, update, ui, stageTap, hit, rauschMult, critChance, stageUp, checkDaily, give, openCaps, renderCapBtn, capImg,
    questCard, questUpdate, questKey, questClaimable, claimQuest,
    // für Tests & Fehlersuche
    _dbg: { prey, spawnPrey, startEvent, startRausch: () => startRausch(Date.now()), useAbility, get boss() { return boss; }, get rival() { return rival; }, get ev() { return ev; }, RZ, active },
  };
})();
