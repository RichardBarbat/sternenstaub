'use strict';
/* Sternenstaub – Grafik (zwei Canvas-Ebenen), Töne & Vibration
   #sky  : Himmel, Nebel, Sterne, Stern mit Umlaufbahnen (Inhaltsebene)
   #fx   : Funken, Druckwellen, Zahlen, Sternschnuppe – liegt über Panel & Menü */

const FX = (() => {
  const cv = document.getElementById('sky');
  const ctx = cv.getContext('2d');
  // Falls eine ältere index.html ohne Effekt-Ebene geladen wurde: Ebene selbst anlegen
  const fxCv = document.getElementById('fx') || (() => {
    const c = document.createElement('canvas'); c.id = 'fx';
    c.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:20;pointer-events:none';
    document.body.appendChild(c); return c;
  })();
  const tctx = fxCv.getContext('2d');
  const bg = document.createElement('canvas'), bctx = bg.getContext('2d');
  const veil = document.createElement('canvas'), vctx = veil.getContext('2d');
  const TAU = Math.PI * 2, TILT = -0.22;
  const RM = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const orb = { x: 0, y: 0, r: 60, ringMax: 160, squish: 0, hue: 48, hueT: 48, flash: 0, pulseF: 1.6 };
  let W = 0, H = 0, DPR = 1, stars = [], rings = [], lastT = 0, head = null;
  const parts = [], floats = [], trail = [], waves = [], dust = [];
  const target = { x: 0, y: 0 };
  const hn = h => ((h % 360) + 360) % 360;

  /* ---------- Aufbau ---------- */
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    const box = cv.getBoundingClientRect();
    W = Math.round(box.width) || window.innerWidth;
    H = Math.round(box.height) || window.innerHeight;
    cv.width = bg.width = fxCv.width = Math.round(W * DPR);
    cv.height = bg.height = fxCv.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    tctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    paintBg(); paintVeil(); makeStars(); layout();
  }

  function layout() {
    const st = document.getElementById('stage').getBoundingClientRect();
    orb.x = st.left + st.width / 2;
    orb.y = st.top + st.height / 2;
    orb.r = Math.max(30, Math.min(st.height * 0.27, st.width * 0.19, 88));
    orb.ringMax = Math.max(orb.r * 1.6, Math.min(st.width / 2 - 12, orb.r * 3.4));
  }

  function blob(c, x, y, r, col) {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  }

  function paintBg() {
    const c = bctx, M = Math.max(W, H);
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0b0628'); g.addColorStop(0.5, '#120a34'); g.addColorStop(1, '#05031a');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    blob(c, W * 0.1, H * 0.14, M * 0.55, 'rgba(120,60,215,0.30)');
    blob(c, W * 0.98, H * 0.36, M * 0.42, 'rgba(235,80,170,0.15)');
    blob(c, W * 0.3, H * 0.9, M * 0.6, 'rgba(45,110,225,0.20)');
    blob(c, W * 0.75, H * 0.08, M * 0.3, 'rgba(90,170,255,0.08)');
    // feiner Sternenstaub & Milchstraßen-Band
    c.save(); c.translate(W / 2, H * 0.42); c.rotate(-0.5);
    for (let i = 0, n = W * H / 260; i < n; i++) {
      const x = (Math.random() - 0.5) * M * 1.6, y = (Math.random() + Math.random() + Math.random() - 1.5) * M * 0.09;
      c.fillStyle = `rgba(${200 + Math.random() * 55 | 0},${190 + Math.random() * 50 | 0},255,${Math.random() * 0.22})`;
      c.fillRect(x, y, 1, 1);
    }
    c.restore();
    for (let i = 0, n = W * H / 800; i < n; i++) {
      c.fillStyle = `rgba(255,255,255,${Math.random() * 0.2})`;
      c.fillRect(Math.random() * W, Math.random() * H, 1, 1);
    }
  }

  // Ziehende Nebelschleier (halbe Auflösung reicht – sie sind weich)
  function paintVeil() {
    veil.width = Math.max(1, Math.round(W * 0.6)); veil.height = Math.max(1, Math.round(H * 0.6));
    const c = vctx, w = veil.width, h = veil.height;
    c.clearRect(0, 0, w, h);
    const cols = ['rgba(160,90,255,0.22)', 'rgba(255,110,190,0.14)', 'rgba(80,160,255,0.16)', 'rgba(255,200,140,0.08)'];
    for (let i = 0; i < 9; i++) blob(c, Math.random() * w, Math.random() * h, (0.15 + Math.random() * 0.3) * Math.max(w, h), cols[i % cols.length]);
  }

  function makeStars() {
    stars = [];
    const n = Math.round(W * H / 2300);
    for (let i = 0; i < n; i++) {
      const z = 0.25 + Math.random() * 0.75;
      stars.push({ x: Math.random() * W, y: Math.random() * H, z, ph: Math.random() * TAU, sp: 0.5 + Math.random() * 2.4,
        col: Math.random() < 0.18 ? '#cfe2ff' : Math.random() < 0.12 ? '#ffe2b8' : '#ffffff', glint: z > 0.93 });
    }
  }

  /* ---------- Stern ---------- */
  function drawOrb(t) {
    const h = hn(orb.hue), x = orb.x, y = orb.y;
    const sh = h > 120 && h < 300 ? 1 : -1; // Farbverschiebung immer weg von Grün
    const pulse = RM ? 0 : Math.sin(t * orb.pulseF);
    const r = orb.r * (1 - 0.07 * orb.squish + 0.014 * pulse);

    // Halo
    let g = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 3.2);
    g.addColorStop(0, `hsla(${h},100%,72%,${0.46 + 0.06 * pulse})`);
    g.addColorStop(0.32, `hsla(${hn(h + sh * 25)},100%,62%,.15)`);
    g.addColorStop(1, 'hsla(0,0%,0%,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 3.2, 0, TAU); ctx.fill();

    ctx.save(); ctx.translate(x, y); ctx.globalCompositeOperation = 'lighter';
    // lange Strahlen
    const L = r * 2.3;
    const rg = ctx.createLinearGradient(0, 0, L, 0);
    rg.addColorStop(0, `hsla(${hn(h + 10)},100%,82%,.30)`); rg.addColorStop(1, 'hsla(0,0%,100%,0)');
    ctx.fillStyle = rg;
    for (let i = 0; i < 12; i++) {
      const len = 0.62 + 0.3 * Math.abs(Math.sin(i * 2.39 + t * 0.35)) + 0.1 * Math.sin(t * 1.3 + i);
      ctx.save(); ctx.rotate(t * 0.07 + i * TAU / 12 + (i % 2) * 0.12); ctx.scale(len, i % 2 ? 0.55 : 1);
      ctx.beginPath(); ctx.moveTo(0, -r * 0.13); ctx.lineTo(L, 0); ctx.lineTo(0, r * 0.13); ctx.fill();
      ctx.restore();
    }
    // flackernde Korona aus feinen Fäden
    ctx.strokeStyle = `hsla(${hn(h + 15)},100%,82%,.22)`; ctx.lineWidth = 1.1;
    ctx.beginPath();
    const N = 64;
    for (let i = 0; i < N; i++) {
      const a = i / N * TAU + t * 0.03;
      const n = 0.5 + 0.5 * Math.sin(i * 7.31 + t * (RM ? 0 : 1.9) + Math.sin(i * 3.7 + t * 0.8));
      const r1 = r * 0.96, r2 = r * (1.06 + 0.42 * n * n);
      ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
    }
    ctx.stroke();
    ctx.restore();

    // Kugel
    g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.34, r * 0.05, x, y, r);
    g.addColorStop(0, '#fff6ea');
    g.addColorStop(0.24, `hsl(${h},95%,82%)`);
    g.addColorStop(0.72, `hsl(${hn(h + sh * 12)},85%,64%)`);
    g.addColorStop(1, `hsl(${hn(h + sh * 38)},75%,48%)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();

    // brodelnde Oberfläche (weiche Plasmazellen, auf die Kugel begrenzt)
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
    ctx.globalCompositeOperation = 'soft-light';
    for (let k = 0; k < 7; k++) {
      const a = t * (0.11 + k * 0.023) + k * 1.9;
      const bx = x + Math.cos(a) * r * 0.5, by = y + Math.sin(a * 1.27 + k) * r * 0.45;
      const br = r * (0.32 + 0.12 * Math.sin(t * 0.7 + k * 2.1));
      const light = k % 2 ? 82 : 28;
      const gg = ctx.createRadialGradient(bx, by, 0, bx, by, br);
      gg.addColorStop(0, `hsla(${hn(h + sh * (k % 3) * 10)},100%,${light}%,.7)`); gg.addColorStop(1, 'hsla(0,0%,50%,0)');
      ctx.fillStyle = gg; ctx.fillRect(bx - br, by - br, br * 2, br * 2);
    }
    // Randverdunkelung
    ctx.globalCompositeOperation = 'source-over';
    g = ctx.createRadialGradient(x, y, r * 0.55, x, y, r);
    g.addColorStop(0, 'hsla(0,0%,0%,0)'); g.addColorStop(1, `hsla(${hn(h + sh * 45)},80%,22%,.5)`);
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    // Glanzlicht
    ctx.globalCompositeOperation = 'lighter';
    g = ctx.createRadialGradient(x - r * 0.36, y - r * 0.42, 0, x - r * 0.36, y - r * 0.42, r * 0.55);
    g.addColorStop(0, 'rgba(255,255,255,.3)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();

    // Randlicht
    ctx.strokeStyle = `hsla(${hn(h - sh * 20)},100%,88%,.45)`; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y, r - 0.75, 0, TAU); ctx.stroke();
  }

  /* ---------- Umlaufbahnen ---------- */
  function drawRings(t, front) {
    const n = GENS.length, r0 = orb.r * 1.3, span = orb.ringMax - r0;
    const cs = Math.cos(TILT), sn = Math.sin(TILT);
    for (let i = 0; i < n; i++) {
      const c = rings[i]; if (!c) continue;
      const rx = r0 + span * i / (n - 1), ry = rx * 0.28, hue = GENS[i].hue;
      // Bahnlinie: hintere Hälfte schwach, vordere etwas heller
      ctx.globalAlpha = front ? 0.24 : 0.1; ctx.strokeStyle = `hsl(${hue},90%,78%)`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(orb.x, orb.y, rx, ry, TILT, front ? 0 : Math.PI, front ? Math.PI : TAU); ctx.stroke();
      const k = Math.min(c, 12), sp = (RM ? 0.15 : 0.55) / (1 + i * 0.3);
      const size0 = 1.7 + i * 0.22 + Math.min(1.2, Math.log10(c) * 0.5);
      for (let j = 0; j < k; j++) {
        const a = t * sp + j * TAU / k + i * 1.3;
        if ((Math.sin(a) > 0) !== front) continue;
        const depth = 0.75 + 0.35 * (Math.sin(a) + 1) / 2;
        for (let tr = 2; tr >= 0; tr--) { // kurzer Schweif hinter jedem Körper
          const aa = a - tr * 0.05, ex = Math.cos(aa) * rx, ey = Math.sin(aa) * ry;
          const px = orb.x + ex * cs - ey * sn, py = orb.y + ex * sn + ey * cs;
          const s = size0 * depth * (1 - tr * 0.25);
          ctx.globalAlpha = (front ? 1 : 0.5) * (tr ? 0.18 / tr : 1);
          if (!tr) { ctx.fillStyle = `hsla(${hue},100%,70%,.35)`; ctx.beginPath(); ctx.arc(px, py, s * 2.7, 0, TAU); ctx.fill(); }
          ctx.fillStyle = `hsl(${hue},100%,${tr ? 75 : 88}%)`;
          ctx.beginPath(); ctx.arc(px, py, s, 0, TAU); ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  function star4(c, x, y, s) { // vierzackiger Funkel
    const q = s * 0.22;
    c.beginPath(); c.moveTo(x, y - s); c.lineTo(x + q, y - q); c.lineTo(x + s, y); c.lineTo(x + q, y + q);
    c.lineTo(x, y + s); c.lineTo(x - q, y + q); c.lineTo(x - s, y); c.lineTo(x - q, y - q); c.closePath(); c.fill();
  }

  /* ---------- Bild zeichnen ---------- */
  function draw(t) {
    const dt = Math.min(0.05, lastT ? Math.max(0, t - lastT) : 0.016);
    lastT = t;
    orb.hue += (orb.hueT - orb.hue) * Math.min(1, dt * 1.5);
    orb.squish = Math.max(0, orb.squish - dt * 6);

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.drawImage(bg, 0, 0, W, H);
    // Nebelschleier ziehen langsam
    if (!RM) {
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55;
      ctx.drawImage(veil, Math.sin(t * 0.021) * W * 0.08 - W * 0.05, Math.cos(t * 0.017) * H * 0.05 - H * 0.03, W * 1.1, H * 1.1);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }

    // Sterne
    for (const s of stars) {
      if (!RM) { s.y += s.z * 4 * dt; if (s.y > H) { s.y = 0; s.x = Math.random() * W; } }
      const tw = 0.5 + 0.5 * Math.sin(t * s.sp + s.ph);
      ctx.globalAlpha = s.z * (0.3 + 0.7 * tw);
      ctx.fillStyle = s.col;
      const sz = s.z * 1.8;
      ctx.fillRect(s.x, s.y, sz, sz);
      if (s.glint && tw > 0.75) { // helle Sterne funkeln mit einem Kreuz
        ctx.globalAlpha = (tw - 0.75) * 2.4;
        star4(ctx, s.x + sz / 2, s.y + sz / 2, 5 + 4 * tw);
      }
    }
    ctx.globalAlpha = 1;

    drawRings(t, false);
    drawOrb(t);
    drawRings(t, true);
    ctx.globalAlpha = 1;
    drawTop(t, dt);
  }

  // Obere Ebene: nur neu zeichnen, wenn etwas zu sehen ist
  let topDirty = true;
  function drawTop(t, dt) {
    const c = tctx;
    const busy = trail.length || parts.length || floats.length || waves.length || dust.length || head || orb.flash > 0;
    if (busy || topDirty) c.clearRect(0, 0, W, H);
    topDirty = busy;
    if (!busy) return;
    c.globalCompositeOperation = 'lighter';

    // Druckwellen
    for (let i = waves.length - 1; i >= 0; i--) {
      const w = waves[i];
      if (w.delay > 0) { w.delay -= dt; continue; }
      w.life -= dt;
      if (w.life <= 0) { waves.splice(i, 1); continue; }
      const k = w.life / w.max, e = 1 - k * k;
      c.globalAlpha = k * w.alpha;
      c.strokeStyle = `hsl(${hn(w.h)},100%,82%)`; c.lineWidth = 0.6 + w.width * k;
      c.beginPath(); c.arc(w.x, w.y, w.r0 + w.spread * e, 0, TAU); c.stroke();
    }

    // Schweif der Sternschnuppe – sich verjüngendes Lichtband
    for (let i = trail.length - 1; i >= 0; i--) { trail[i].life -= dt; if (trail[i].life <= 0) trail.splice(i, 1); }
    if (trail.length > 1) {
      c.lineCap = 'round';
      for (let i = 1; i < trail.length; i++) {
        const a = trail[i - 1], b = trail[i], k = b.life / 0.7;
        c.globalAlpha = k * 0.75;
        c.strokeStyle = `hsl(${40 + (1 - k) * 280},100%,${78 + k * 10}%)`;
        c.lineWidth = 1 + 9 * k;
        c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
      }
    }

    // Kopf der Sternschnuppe
    if (head) {
      const { x, y } = head, rot = t * 2.2;
      c.globalAlpha = 1;
      let g = c.createRadialGradient(x, y, 0, x, y, 34);
      g.addColorStop(0, 'rgba(255,240,200,.95)'); g.addColorStop(0.25, 'rgba(255,200,110,.45)'); g.addColorStop(1, 'rgba(255,150,200,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, 34, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,.9)';
      c.save(); c.translate(x, y); c.rotate(rot); star4(c, 0, 0, 22); c.rotate(Math.PI / 4); c.globalAlpha = 0.6; star4(c, 0, 0, 12); c.restore();
      c.globalAlpha = 1; c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, 4.5, 0, TAU); c.fill();
      if (Math.random() < 0.35) parts.push({ x, y, vx: (Math.random() - 0.5) * 40, vy: 10 + Math.random() * 30, life: 0.7, max: 0.7, size: 1 + Math.random() * 1.5, h: 40 + Math.random() * 20, spark: Math.random() < 0.5, g: 20 });
    }

    // Funken
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.vx *= 1 - 2.2 * dt; p.vy = p.vy * (1 - 2.2 * dt) + (p.g ?? 50) * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      const k = p.life / p.max;
      c.globalAlpha = k;
      c.fillStyle = `hsl(${hn(p.h)},100%,${70 + 15 * k}%)`;
      if (p.spark) star4(c, p.x, p.y, p.size * 2.4 * (0.5 + 0.5 * k));
      else { c.beginPath(); c.arc(p.x, p.y, p.size * (0.4 + 0.6 * k), 0, TAU); c.fill(); }
    }

    // Staub fliegt in den Zähler
    for (let i = dust.length - 1; i >= 0; i--) {
      const d = dust[i];
      d.life -= dt;
      const dx = target.x - d.x, dy = target.y - d.y, dist = Math.hypot(dx, dy);
      if (d.life <= 0 || dist < 14) { dust.splice(i, 1); continue; }
      d.vx += dx / dist * 1900 * dt; d.vy += dy / dist * 1900 * dt;
      d.vx *= 1 - 3.2 * dt; d.vy *= 1 - 3.2 * dt;
      const px = d.x, py = d.y;
      d.x += d.vx * dt; d.y += d.vy * dt;
      c.globalAlpha = Math.min(1, d.life * 3) * 0.9;
      c.strokeStyle = 'hsl(42,100%,78%)'; c.lineWidth = 2.2; c.lineCap = 'round';
      c.beginPath(); c.moveTo(px, py); c.lineTo(d.x, d.y); c.stroke();
    }

    // Zahlen
    if (floats.length) {
      c.globalCompositeOperation = 'source-over';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.shadowColor = 'rgba(255,180,100,.9)'; c.shadowBlur = 12;
      for (let i = floats.length - 1; i >= 0; i--) {
        const f = floats[i];
        f.life -= dt;
        if (f.life <= 0) { floats.splice(i, 1); continue; }
        f.y -= 64 * dt;
        const age = f.max - f.life, s = age < 0.14 ? 0.6 + age / 0.14 * 0.45 : Math.max(1, 1.05 - (age - 0.14) * 0.3);
        c.globalAlpha = Math.min(1, f.life * 2.4);
        c.save(); c.translate(f.x, f.y); c.scale(s, s);
        c.font = `800 ${f.big ? 26 : 21}px ui-rounded, -apple-system, system-ui, sans-serif`;
        c.fillStyle = f.big ? '#ffe39c' : '#ffffff';
        c.fillText(f.text, 0, 0);
        c.restore();
      }
      c.shadowBlur = 0;
    }

    // Supernova-Blitz
    if (orb.flash > 0) {
      orb.flash -= dt * 0.7;
      c.globalCompositeOperation = 'source-over';
      c.globalAlpha = Math.max(0, Math.min(1, orb.flash));
      c.fillStyle = '#fff6e6'; c.fillRect(0, 0, W, H);
    }
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
  }

  function burst(x, y, n, hue, speed = 1) {
    if (RM) n = Math.ceil(n / 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, v = (60 + Math.random() * 170) * speed, max = 0.5 + Math.random() * 0.7;
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: max, max, size: 1.4 + Math.random() * 2.6, h: (hue ?? orb.hue) + (Math.random() - 0.5) * 70, spark: Math.random() < 0.35 });
    }
    if (parts.length > 500) parts.splice(0, parts.length - 500);
  }

  function wave(x, y, r0, spread, life, opts = {}) {
    if (RM) return;
    waves.push({ x, y, r0, spread, life, max: life, h: opts.h ?? orb.hue, width: opts.width ?? 3, alpha: opts.alpha ?? 0.55, delay: opts.delay ?? 0 });
    if (waves.length > 24) waves.shift();
  }

  function float(x, y, text, big) {
    floats.push({ x: x + (Math.random() - 0.5) * 24, y: y - 14, text, big, life: 1.1, max: 1.1 });
    if (floats.length > 40) floats.shift();
  }

  return {
    orb, resize, layout, draw, burst, float, wave,
    tap(x, y, text, manual) {
      float(x, y, text);
      burst(x, y, manual ? 7 : 3);
      if (!manual) return;
      if (!RM) orb.squish = 1;
      wave(orb.x, orb.y, orb.r * 0.98, orb.r * 0.45, 0.42, { width: 2.5, alpha: 0.45 });
      if (!RM && dust.length < 50) for (let i = 0; i < 2; i++) {
        const a = Math.random() * TAU;
        dust.push({ x, y, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260 - 120, life: 1.4 });
      }
    },
    trail(x, y) { trail.push({ x, y, life: 0.7 }); if (trail.length > 60) trail.shift(); },
    setStar(s) { head = s; },
    setCollect(x, y) { target.x = x; target.y = y; },
    setRate(r) { orb.pulseF = 1.4 + Math.min(4, Math.log10(r + 1) * 0.45); },
    nova() {
      orb.flash = 1.3; burst(orb.x, orb.y, 200, orb.hue, 2.4);
      for (let i = 0; i < 3; i++) wave(orb.x, orb.y, orb.r, Math.max(W, H) * (0.5 + i * 0.2), 1.4 + i * 0.2, { width: 8 - i * 2, alpha: 0.8, delay: i * 0.18 });
    },
    setRings(a) { rings = a; },
    setHue(h) { orb.hueT = h; },
  };
})();

/* ---------- Töne (Web Audio, synthetisch – keine Dateien nötig) ---------- */
const SND = (() => {
  let ac = null, master = null, on = true, lastTap = 0;
  const SC = [0, 2, 4, 7, 9, 12, 14];
  const f = (semi, base = 523.25) => base * Math.pow(2, semi / 12);

  function unlock() {
    if (!ac) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      try { ac = new C(); master = ac.createGain(); master.gain.value = 0.25; master.connect(ac.destination); }
      catch (e) { ac = null; return; }
    }
    if (ac.state !== 'running') ac.resume().catch(() => {});
  }

  function tone(freq, dur, type, vol, delay = 0) {
    if (!on || !ac || ac.state !== 'running') return;
    const t = ac.currentTime + delay;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  }
  const seq = (notes, base, type, vol, gap, dur) => notes.forEach((s, i) => tone(f(s, base), dur, type, vol, i * gap));

  return {
    unlock,
    setOn(v) { on = v; },
    tap() {
      const now = performance.now();
      if (now - lastTap < 35) return;
      lastTap = now;
      const s = SC[Math.floor(Math.random() * SC.length)];
      tone(f(s), 0.22, 'sine', 0.22);
      tone(f(s + 12), 0.12, 'triangle', 0.04);
    },
    buy() { seq([0, 4, 7], 392, 'triangle', 0.12, 0.045, 0.18); },
    up() { seq([0, 7, 12, 16], 440, 'sine', 0.15, 0.06, 0.25); },
    star() { seq([0, 4, 7, 11, 14, 19, 23, 26], 659, 'sine', 0.12, 0.045, 0.3); },
    ach() { seq([7, 12, 16, 19], 523.25, 'triangle', 0.12, 0.08, 0.35); },
    nova() { tone(55, 2.2, 'sine', 0.5); seq([0, 7, 12, 19, 24, 31], 261.6, 'sine', 0.1, 0.12, 1.2); },
    tab() { tone(f(12, 523.25), 0.06, 'sine', 0.05); },
  };
})();

/* ---------- Vibration (Android: vibrate, iOS 18+: Switch-Trick) ---------- */
const HAP = (() => {
  let on = true, last = 0;
  const lab = document.getElementById('hapLabel');
  return {
    setOn(v) { on = v; },
    fire(force) {
      if (!on) return;
      const t = performance.now();
      if (!force && t - last < 45) return;
      last = t;
      if (navigator.vibrate) { try { navigator.vibrate(10); } catch (e) {} return; }
      if (lab) lab.click();
    },
  };
})();
