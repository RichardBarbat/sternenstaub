'use strict';
/* Sternenstaub – Grafik (Canvas), Töne & Vibration */

const FX = (() => {
  const cv = document.getElementById('sky');
  const ctx = cv.getContext('2d');
  const bg = document.createElement('canvas');
  const bctx = bg.getContext('2d');
  const TAU = Math.PI * 2, TILT = -0.22;
  const orb = { x: 0, y: 0, r: 60, ringMax: 160, squish: 0, hue: 48, hueT: 48, flash: 0 };
  let W = 0, H = 0, DPR = 1, stars = [], rings = [], lastT = 0;
  const parts = [], floats = [], trail = [];
  const hn = h => ((h % 360) + 360) % 360;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    // Pixelpuffer exakt an die tatsächliche CSS-Größe koppeln, sonst wird alles verzerrt gezeichnet
    const box = cv.getBoundingClientRect();
    W = Math.round(box.width) || window.innerWidth;
    H = Math.round(box.height) || window.innerHeight;
    cv.width = bg.width = Math.round(W * DPR);
    cv.height = bg.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    paintBg(); makeStars(); layout();
  }

  function layout() {
    const st = document.getElementById('stage').getBoundingClientRect();
    orb.x = st.left + st.width / 2;
    orb.y = st.top + st.height / 2;
    orb.r = Math.max(30, Math.min(st.height * 0.27, st.width * 0.19, 88));
    orb.ringMax = Math.max(orb.r * 1.6, Math.min(st.width / 2 - 12, orb.r * 3.4));
  }

  function paintBg() {
    const c = bctx;
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0a0624'); g.addColorStop(0.55, '#120a32'); g.addColorStop(1, '#05031a');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const blob = (x, y, r, col) => {
      const gg = c.createRadialGradient(x, y, 0, x, y, r);
      gg.addColorStop(0, col); gg.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = gg; c.fillRect(0, 0, W, H);
    };
    blob(W * 0.12, H * 0.16, Math.max(W, H) * 0.55, 'rgba(120,60,210,0.30)');
    blob(W * 0.95, H * 0.40, Math.max(W, H) * 0.45, 'rgba(230,80,170,0.16)');
    blob(W * 0.35, H * 0.88, Math.max(W, H) * 0.6, 'rgba(50,110,220,0.20)');
    for (let i = 0, n = W * H / 900; i < n; i++) {
      c.fillStyle = `rgba(255,255,255,${Math.random() * 0.2})`;
      c.fillRect(Math.random() * W, Math.random() * H, 1, 1);
    }
  }

  function makeStars() {
    stars = [];
    const n = Math.round(W * H / 2400);
    for (let i = 0; i < n; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, z: 0.3 + Math.random() * 0.7, ph: Math.random() * TAU, sp: 0.6 + Math.random() * 2.2 });
  }

  function drawOrb(t) {
    const h = hn(orb.hue), x = orb.x, y = orb.y;
    const sh = h > 120 && h < 300 ? 1 : -1; // Randfarbe immer weg von Grün verschieben
    const r = orb.r * (1 - 0.07 * orb.squish + 0.015 * Math.sin(t * 2.2));
    // Halo
    let g = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 2.9);
    g.addColorStop(0, `hsla(${h},100%,72%,.5)`);
    g.addColorStop(0.35, `hsla(${hn(h + sh * 25)},100%,62%,.16)`);
    g.addColorStop(1, 'hsla(0,0%,0%,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 2.9, 0, TAU); ctx.fill();
    // Strahlen
    ctx.save(); ctx.translate(x, y); ctx.globalCompositeOperation = 'lighter';
    const L = r * 2.2;
    const rg = ctx.createLinearGradient(0, 0, L, 0);
    rg.addColorStop(0, `hsla(${hn(h + 10)},100%,80%,.32)`); rg.addColorStop(1, 'hsla(0,0%,100%,0)');
    ctx.fillStyle = rg;
    for (let i = 0; i < 10; i++) {
      const len = 0.8 + 0.18 * Math.sin(t * 1.1 + i * 1.9);
      ctx.save(); ctx.rotate(t * 0.12 + i * TAU / 10); ctx.scale(len, 1);
      ctx.beginPath(); ctx.moveTo(0, -r * 0.16); ctx.lineTo(L, 0); ctx.lineTo(0, r * 0.16); ctx.fill();
      ctx.restore();
    }
    for (let i = 0; i < 6; i++) {
      const len = 0.6 + 0.2 * Math.sin(t * 0.7 + i * 2.3);
      ctx.save(); ctx.rotate(-t * 0.08 + i * TAU / 6 + 0.3); ctx.scale(len, 0.6);
      ctx.beginPath(); ctx.moveTo(0, -r * 0.1); ctx.lineTo(L, 0); ctx.lineTo(0, r * 0.1); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    // Kugel
    g = ctx.createRadialGradient(x - r * 0.32, y - r * 0.36, r * 0.05, x, y, r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.25, `hsl(${h},95%,87%)`);
    g.addColorStop(0.7, `hsl(${hn(h + sh * 12)},85%,66%)`);
    g.addColorStop(1, `hsl(${hn(h + sh * 38)},75%,50%)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    // Randlicht
    ctx.strokeStyle = `hsla(${hn(h - 20)},100%,85%,.35)`; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y, r - 0.75, 0, TAU); ctx.stroke();
  }

  function drawRings(t, front) {
    const n = GENS.length, r0 = orb.r * 1.3, span = orb.ringMax - r0;
    const cs = Math.cos(TILT), sn = Math.sin(TILT);
    for (let i = 0; i < n; i++) {
      const c = rings[i]; if (!c) continue;
      const rx = r0 + span * i / (n - 1), ry = rx * 0.28, hue = GENS[i].hue;
      if (!front) {
        ctx.globalAlpha = 0.16; ctx.strokeStyle = `hsl(${hue},90%,75%)`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(orb.x, orb.y, rx, ry, TILT, 0, TAU); ctx.stroke();
      }
      const k = Math.min(c, 12), sp = 0.55 / (1 + i * 0.3);
      for (let j = 0; j < k; j++) {
        const a = t * sp + j * TAU / k + i * 1.3;
        const ca = Math.cos(a), sa = Math.sin(a);
        if ((sa > 0) !== front) continue;
        const ex = ca * rx, ey = sa * ry;
        const px = orb.x + ex * cs - ey * sn, py = orb.y + ex * sn + ey * cs;
        const size = (1.8 + i * 0.22) * (0.75 + 0.35 * (sa + 1) / 2);
        ctx.globalAlpha = front ? 1 : 0.55;
        ctx.fillStyle = `hsla(${hue},100%,70%,.35)`;
        ctx.beginPath(); ctx.arc(px, py, size * 2.6, 0, TAU); ctx.fill();
        ctx.fillStyle = `hsl(${hue},100%,86%)`;
        ctx.beginPath(); ctx.arc(px, py, size, 0, TAU); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function draw(t) {
    const dt = Math.min(0.05, lastT ? Math.max(0, t - lastT) : 0.016);
    lastT = t;
    orb.hue += (orb.hueT - orb.hue) * Math.min(1, dt * 1.5);
    orb.squish = Math.max(0, orb.squish - dt * 6);

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.drawImage(bg, 0, 0, W, H);

    // Sterne
    ctx.fillStyle = '#fff';
    for (const s of stars) {
      s.y += s.z * 4 * dt;
      if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
      ctx.globalAlpha = s.z * (0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph)));
      const sz = s.z * 1.8;
      ctx.fillRect(s.x, s.y, sz, sz);
    }
    ctx.globalAlpha = 1;

    drawRings(t, false);
    drawOrb(t);
    drawRings(t, true);

    // Schweif der Sternschnuppe
    for (let i = trail.length - 1; i >= 0; i--) {
      const p = trail[i];
      p.life -= dt;
      if (p.life <= 0) { trail.splice(i, 1); continue; }
      const k = p.life / 0.9;
      ctx.globalAlpha = k * 0.7;
      ctx.fillStyle = `hsl(${p.h},100%,82%)`;
      ctx.beginPath(); ctx.arc(p.x, p.y, 1 + 6 * k, 0, TAU); ctx.fill();
    }

    // Partikel
    ctx.globalCompositeOperation = 'lighter';
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.vx *= 1 - 2.2 * dt; p.vy = p.vy * (1 - 2.2 * dt) + 50 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      const k = p.life / p.max;
      ctx.globalAlpha = k;
      ctx.fillStyle = `hsl(${hn(p.h)},100%,75%)`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.4 + 0.6 * k), 0, TAU); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    // Zahlen
    if (floats.length) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(255,190,110,.9)'; ctx.shadowBlur = 10;
      for (let i = floats.length - 1; i >= 0; i--) {
        const f = floats[i];
        f.life -= dt;
        if (f.life <= 0) { floats.splice(i, 1); continue; }
        f.y -= 70 * dt;
        ctx.globalAlpha = Math.min(1, f.life * 2.2);
        ctx.font = `800 ${f.big ? 26 : 21}px ui-rounded, -apple-system, system-ui, sans-serif`;
        ctx.fillStyle = f.big ? '#ffe39c' : '#ffffff';
        ctx.fillText(f.text, f.x, f.y);
      }
      ctx.shadowBlur = 0;
    }

    // Supernova-Blitz
    if (orb.flash > 0) {
      orb.flash -= dt * 0.7;
      ctx.globalAlpha = Math.max(0, Math.min(1, orb.flash));
      ctx.fillStyle = '#fff6e6'; ctx.fillRect(0, 0, W, H);
    }
    ctx.globalAlpha = 1;
  }

  function burst(x, y, n, hue, speed = 1) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, v = (60 + Math.random() * 170) * speed;
      const max = 0.5 + Math.random() * 0.7;
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: max, max, size: 1.5 + Math.random() * 2.8, h: (hue ?? orb.hue) + (Math.random() - 0.5) * 70 });
    }
    if (parts.length > 450) parts.splice(0, parts.length - 450);
  }

  function float(x, y, text, big) {
    floats.push({ x: x + (Math.random() - 0.5) * 24, y: y - 14, text, big, life: 1.1 });
    if (floats.length > 40) floats.shift();
  }

  return {
    orb, resize, layout, draw, burst, float,
    tap(x, y, text, manual) { if (manual) orb.squish = 1; float(x, y, text); burst(x, y, manual ? 7 : 3); },
    trail(x, y) { trail.push({ x, y, life: 0.9, h: 40 + Math.random() * 30 }); },
    nova() { orb.flash = 1.3; burst(orb.x, orb.y, 180, orb.hue, 2.4); },
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
