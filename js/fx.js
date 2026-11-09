'use strict';
/* Singularität – Grafik, Töne & Vibration
   #sky : Himmel mit Gravitationslinse, Schwarzes Loch mit Akkretionsscheibe, Orbit und Beute (Inhaltsebene)
   #fx  : Funken, Druckwellen, Zahlen, Blitze – liegt über Panel & Menü */

const FX = (() => {
  const mk = (w = 2, h = 2) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const cv = document.getElementById('sky'), ctx = cv.getContext('2d');
  const fxCv = document.getElementById('fx') || (() => {
    const c = mk(); c.id = 'fx';
    c.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:20;pointer-events:none';
    document.body.appendChild(c); return c;
  })();
  const tctx = fxCv.getContext('2d');
  const bg = mk(), bctx = bg.getContext('2d');
  const veil = mk(), vctx = veil.getContext('2d');
  const TAU = Math.PI * 2;
  const RM = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const hn = h => ((h % 360) + 360) % 360;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  let W = 0, H = 0, DPR = 1, stars = [], lastT = 0, clock = 0, shakeOn = true, sfCur = 0, glOn = true;

  // Kleiner, reproduzierbarer Zufall (gleiche Form für gleiche Variante)
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), a | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- Das Schwarze Loch ---------- */
  const hole = {
    x: 0, y: 0, R: 4, Rt: 24, Rmin: 18, Rmax: 56, orbitR: 180, top: 0, bottom: 0,
    hue: 14, hueT: 14, sat: 100, satT: 100, roll: -0.12, k: 0.23, kT: 0.23, spin: 0,
    feed: 0, gulp: 0, rausch: 0, rauschT: 0, jet: 0, jetT: 0, jetBase: 0, sog: 0, sogT: 0, warp: 0, shake: 0, shakeAmp: 0, shakeDur: 0.3,
  };

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
    hole.x = st.left + st.width / 2;
    hole.y = st.top + st.height * (0.5 - 0.05 * clamp((st.height - 360) / 240, 0, 1));
    hole.top = st.top; hole.bottom = st.bottom;
    // Scheibe (2,75 R) soll neben die Knöpfe am Rand passen, das Loch nicht zu hoch werden
    const tall = clamp((st.height - 360) / 240, 0, 1);
    hole.kT = 0.23 + 0.13 * tall;
    hole.Rmax = clamp(Math.min(st.height * 0.17, (st.width / 2 - (52 - 34 * tall)) / 2.75), 20, 60 + 22 * tall);
    hole.Rmin = Math.max(14, hole.Rmax * 0.55);
    hole.orbitR = Math.max(70, Math.min(st.width / 2 - 8, (st.height / 2 - 14) / 0.42));
    setStage(sfCur);
  }

  function setStage(sf) {
    sfCur = sf;
    const i = Math.min(STAGES.length - 1, Math.floor(sf)), j = Math.min(STAGES.length - 1, i + 1), f = sf - i;
    hole.hueT = STAGES[i].hue + (STAGES[j].hue - STAGES[i].hue) * f;
    hole.satT = STAGES[i].sat + (STAGES[j].sat - STAGES[i].sat) * f;
    hole.Rt = hole.Rmin + (hole.Rmax - hole.Rmin) * Math.pow(Math.min(1, sf / (STAGES.length - 1)), 0.7);
    hole.jetBase = sf >= 6 ? 0.4 : 0;
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
    g.addColorStop(0, '#09051f'); g.addColorStop(0.5, '#0e0829'); g.addColorStop(1, '#040214');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    blob(c, W * 0.1, H * 0.14, M * 0.55, 'rgba(110,55,205,0.26)');
    blob(c, W * 0.98, H * 0.36, M * 0.42, 'rgba(225,75,160,0.13)');
    blob(c, W * 0.3, H * 0.9, M * 0.6, 'rgba(45,100,215,0.18)');
    blob(c, W * 0.75, H * 0.08, M * 0.3, 'rgba(90,170,255,0.07)');
    // feiner Sternenstaub & Milchstraßen-Band
    c.save(); c.translate(W / 2, H * 0.42); c.rotate(-0.5);
    for (let i = 0, n = W * H / 260; i < n; i++) {
      const x = (Math.random() - 0.5) * M * 1.6, y = (Math.random() + Math.random() + Math.random() - 1.5) * M * 0.09;
      c.fillStyle = `rgba(${200 + Math.random() * 55 | 0},${190 + Math.random() * 50 | 0},255,${Math.random() * 0.2})`;
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
    const cols = ['rgba(160,90,255,0.2)', 'rgba(255,110,190,0.12)', 'rgba(80,160,255,0.15)', 'rgba(255,200,140,0.07)'];
    for (let i = 0; i < 9; i++) blob(c, Math.random() * w, Math.random() * h, (0.15 + Math.random() * 0.3) * Math.max(w, h), cols[i % cols.length]);
    // Ränder weich ausblenden, damit nie eine Kante als Streifen sichtbar wird
    c.globalCompositeOperation = 'destination-in';
    for (const [x1, y1] of [[w, 0], [0, h]]) {
      const g = c.createLinearGradient(0, 0, x1, y1);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.12, '#000'); g.addColorStop(0.88, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
    }
    c.globalCompositeOperation = 'source-over';
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

  /* ---------- Akkretionsscheibe ----------
     Zwei Graustufen-Texturen (innen dreht schneller als außen) werden pro Bild gedreht, eingefärbt
     und mit Doppler-Helligkeit versehen. Daraus entstehen hintere Scheibe, Lichtbogen (Linseneffekt)
     und vordere Scheibe. */
  const TEX = 512, texIn = mk(TEX, TEX), texOut = mk(TEX, TEX);
  const work = mk(440, 440), wctx = work.getContext('2d');
  const halo = mk(), hctx = halo.getContext('2d');
  const RI = 0.42; // Innenrand der Scheibe relativ zum Außenrand

  function lum(r) {
    if (r < RI) return 0;
    return Math.min(1, (r - RI) / 0.03) * Math.pow(1 - (r - RI) / (1 - RI), 1.45);
  }
  function paintTex(cnv, r0, r1, n, seed, mask) {
    const c = cnv.getContext('2d'), h = TEX / 2, rnd = rng(seed);
    c.clearRect(0, 0, TEX, TEX);
    c.save(); c.translate(h, h);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, h);
    for (let i = 0; i <= 24; i++) { const r = i / 24; g.addColorStop(r, `rgba(255,255,255,${(lum(r) * 0.8).toFixed(3)})`); }
    c.fillStyle = g; c.fillRect(-h, -h, TEX, TEX);
    // Schlieren, die sich leicht spiralförmig nach innen oder außen ziehen
    c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = '#fff';
    for (let i = 0; i < n; i++) {
      const r = r0 + (r1 - r0) * Math.pow(rnd(), 1.2);
      const a0 = rnd() * TAU, span = 0.25 + rnd() * (2.2 - r), dr = (0.01 + rnd() * 0.05) * (rnd() < 0.5 ? 1 : -1);
      c.globalAlpha = (0.12 + rnd() * 0.5) * (0.25 + lum(r));
      c.lineWidth = (1.2 + rnd() * 5) * (1.25 - r);
      c.beginPath();
      for (let s = 0; s <= 10; s++) {
        const a = a0 + span * s / 10, rr = (r + dr * s / 10) * h;
        if (s) c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else c.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      c.stroke();
    }
    // heiße Klumpen
    c.globalAlpha = 1;
    for (let i = 0; i < n * 0.06; i++) {
      const r = r0 + (r1 - r0) * rnd() * 0.75, a = rnd() * TAU, x = Math.cos(a) * r * h, y = Math.sin(a) * r * h, s = h * (0.02 + rnd() * 0.045);
      const gg = c.createRadialGradient(x, y, 0, x, y, s);
      gg.addColorStop(0, `rgba(255,255,255,${(0.55 * (0.3 + lum(r))).toFixed(3)})`); gg.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = gg; c.beginPath(); c.arc(x, y, s, 0, TAU); c.fill();
    }
    // dunkle Bahnen für Tiefe
    c.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < n * 0.14; i++) {
      const r = r0 + (r1 - r0) * rnd(), a = rnd() * TAU, span = 0.3 + rnd() * 1.4;
      c.globalAlpha = 0.12 + rnd() * 0.3; c.lineWidth = 1.5 + rnd() * 5;
      c.beginPath(); c.arc(0, 0, r * h, a, a + span); c.stroke();
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'destination-in';
    const m = c.createRadialGradient(0, 0, 0, 0, 0, h);
    mask.forEach(([p, a]) => m.addColorStop(p, `rgba(0,0,0,${a})`));
    c.fillStyle = m; c.fillRect(-h, -h, TEX, TEX);
    c.restore();
    c.globalCompositeOperation = 'source-over';
  }
  paintTex(texIn, RI, 0.68, 520, 11, [[0, 1], [0.6, 1], [0.68, 0], [1, 0]]);
  paintTex(texOut, 0.6, 1.0, 520, 23, [[0, 0], [0.6, 0], [0.68, 1], [0.88, 1], [1, 0]]);

  function composeDisk() {
    const w = work.width, h = w / 2, c = wctx, H0 = hole.hue, S0 = hole.sat, hot = hole.rausch;
    c.setTransform(1, 0, 0, 1, h, h);
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    c.clearRect(-h, -h, w, w);
    c.rotate(-hole.spin); c.drawImage(texIn, -h, -h, w, w);
    c.setTransform(1, 0, 0, 1, h, h);
    c.rotate(-hole.spin * 0.52 + 1.7); c.drawImage(texOut, -h, -h, w, w);
    c.setTransform(1, 0, 0, 1, h, h);
    // einfärben: innen fast weiß, außen tief gefärbt
    c.globalCompositeOperation = 'source-atop';
    const L = 60 + hot * 10;
    const g = c.createRadialGradient(0, 0, h * RI, 0, 0, h);
    g.addColorStop(0, `hsl(${hn(H0 + 28)},${S0}%,96%)`);
    g.addColorStop(0.1, `hsl(${hn(H0 + 16)},${S0}%,${80 + hot * 8}%)`);
    g.addColorStop(0.35, `hsl(${hn(H0)},${S0}%,${L}%)`);
    g.addColorStop(0.7, `hsl(${hn(H0 - 14)},${S0 * 0.95}%,${L - 16}%)`);
    g.addColorStop(1, `hsl(${hn(H0 - 28)},${S0 * 0.9}%,${L - 30}%)`);
    c.fillStyle = g; c.fillRect(-h, -h, w, w);
    // Doppler: links kommt die Scheibe auf uns zu (heller, weißer), rechts entfernt sie sich
    c.globalCompositeOperation = 'destination-out';
    const d = c.createLinearGradient(-h, 0, h, 0);
    d.addColorStop(0, 'rgba(0,0,0,0)'); d.addColorStop(0.5, 'rgba(0,0,0,.2)'); d.addColorStop(1, 'rgba(0,0,0,.62)');
    c.fillStyle = d; c.fillRect(-h, -h, w, w);
    c.globalCompositeOperation = 'source-atop';
    const l = c.createLinearGradient(-h, 0, h * 0.1, 0);
    l.addColorStop(0, 'rgba(255,252,245,.38)'); l.addColorStop(1, 'rgba(255,252,245,0)');
    c.fillStyle = l; c.fillRect(-h, -h, w, w);
    c.globalCompositeOperation = 'source-over';
  }

  function diskHalf(R, front, alpha) {
    const ro = R * 1.155 / RI, c = ctx;
    c.save();
    c.translate(hole.x, hole.y); c.rotate(hole.roll); c.scale(1, hole.k);
    c.beginPath();
    if (front) c.rect(-ro - 2, 0, ro * 2 + 4, ro + 2); else c.rect(-ro - 2, -ro - 2, ro * 2 + 4, ro + 2);
    c.clip();
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = alpha;
    c.drawImage(work, -ro, -ro, ro * 2, ro * 2);
    c.restore();
  }

  // Lichtbogen: das Bild der hinteren Scheibe, von der Schwerkraft um den Schatten gebogen
  function drawHalo(R, alpha) {
    const S = Math.max(4, Math.ceil(R * 3.7 * DPR));
    if (halo.width !== S) { halo.width = S; halo.height = S; }
    const c = hctx, h = S / 2, r = R * DPR, outer = r / RI;
    c.setTransform(1, 0, 0, 1, h, h);
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    c.clearRect(-h, -h, S, S);
    c.rotate(-0.25);
    c.drawImage(work, -outer, -outer, outer * 2, outer * 2);
    c.setTransform(1, 0, 0, 1, h, h);
    c.globalCompositeOperation = 'destination-in';
    const g = c.createRadialGradient(0, 0, r * 0.98, 0, 0, r * 1.8);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.3, 'rgba(0,0,0,.95)'); g.addColorStop(0.62, 'rgba(0,0,0,.42)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(-h, -h, S, S);
    // oben (Bild der hinteren Scheibe) kräftig, unten schwächer
    const v = c.createLinearGradient(0, -r * 1.8, 0, r * 1.8);
    v.addColorStop(0, 'rgba(0,0,0,1)'); v.addColorStop(0.5, 'rgba(0,0,0,.72)'); v.addColorStop(1, 'rgba(0,0,0,.36)');
    c.fillStyle = v; c.fillRect(-h, -h, S, S);
    c.globalCompositeOperation = 'source-over';
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = alpha;
    ctx.drawImage(halo, hole.x - h / DPR, hole.y - h / DPR, S / DPR, S / DPR);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }

  /* ---------- Aufwendige Grafik: Strahlengang im Shader ----------
     Für jeden Bildpunkt wird ein Lichtstrahl durch die gekrümmte Raumzeit verfolgt (Schwarzschild).
     So entstehen Schatten, Photonenring und der über das Loch gebogene Lichtbogen von selbst.
     Schlägt irgendetwas fehl, zeichnet das Spiel wie bisher mit der 2D-Scheibe. */
  const GLH = (() => {
    const cnv = mk(8, 8);
    let gl = null, prog = null, U = {}, ok = false;
    const FS = `precision highp float;
uniform vec2 uRes; uniform float uTilt, uRoll, uSpin, uBright, uView;
uniform vec3 uHot, uMid, uCool;
const float RIN = 3.0, ROUT = 7.15;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p, float per){
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  float y0 = mod(i.y, per), y1 = mod(i.y + 1.0, per);
  return mix(mix(hash(vec2(i.x, y0)), hash(vec2(i.x + 1.0, y0)), f.x), mix(hash(vec2(i.x, y1)), hash(vec2(i.x + 1.0, y1)), f.x), f.y);
}
void main(){
  vec2 uv = (gl_FragCoord.xy / uRes - 0.5) * 2.0 * uView;
  float cr = cos(uRoll), sr = sin(uRoll); uv = vec2(uv.x * cr - uv.y * sr, uv.x * sr + uv.y * cr);
  float ct = cos(uTilt), st = sin(uTilt);
  vec3 fwd = vec3(0.0, -st, -ct), up = vec3(0.0, ct, -st);
  vec3 p = -fwd * 24.0 + vec3(uv.x, 0.0, 0.0) + up * uv.y, v = fwd;
  vec3 hv = cross(p, v); float h2 = dot(hv, hv);
  vec3 col = vec3(0.0); float alpha = 0.0, shadow = 0.0, rmin = 99.0;
  for (int i = 0; i < 120; i++) {
    float r2 = dot(p, p);
    if (r2 < 1.0) { shadow = 1.0; break; }
    float r = sqrt(r2), dt = clamp(0.1 * r, 0.04, 2.0); rmin = min(rmin, r);
    v += -1.5 * h2 * p / (r2 * r2 * r) * dt;
    vec3 pn = p + v * dt;
    if (p.y * pn.y < 0.0) {
      vec3 q = mix(p, pn, p.y / (p.y - pn.y)); float rr = length(q.xz);
      if (rr > RIN && rr < ROUT) {
        float u = (rr - RIN) / (ROUT - RIN);
        float t = pow(1.0 - u, 1.6) * smoothstep(0.0, 0.05, u);
        float ph = (atan(q.z, q.x) + uSpin * pow(RIN / rr, 1.5)) / 6.2831853;
        float n = 0.6 * noise(vec2(rr * 1.3, ph * 5.0), 5.0) + 0.4 * noise(vec2(rr * 4.2, ph * 16.0), 16.0);
        float dop = 1.0 + 0.4 * dot(vec3(q.z, 0.0, -q.x) / rr, -v) * sqrt(RIN / rr); dop = dop * dop * dop;
        float I = t * (0.22 + 1.5 * n * n) * dop * uBright;
        vec3 c = mix(uCool, uMid, smoothstep(0.0, 0.45, t));
        c = mix(c, uHot, smoothstep(0.3, 1.0, t * min(dop, 1.7)));
        float a2 = clamp(I * 1.3, 0.0, 1.0) * smoothstep(1.0, 0.82, u);
        col += (1.0 - alpha) * c * min(I, 1.6) * 1.15; alpha += (1.0 - alpha) * a2;
      }
    }
    p = pn;
    if (r2 > 900.0 && dot(p, v) > 0.0) break;
  }
  col = min(col, vec3(1.0));
  shadow = max(shadow, 1.0 - smoothstep(1.5, 1.6, rmin)); // weicher Schattenrand
  gl_FragColor = vec4(col, max(shadow, max(col.r, max(col.g, col.b))));
}`;
    function init() {
      try {
        gl = cnv.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
        if (!gl) return;
        const sh = (type, src) => { const o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
        prog = gl.createProgram();
        gl.attachShader(prog, sh(gl.VERTEX_SHADER, 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }'));
        gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
        gl.useProgram(prog);
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        const loc = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        for (const k of ['uRes', 'uTilt', 'uRoll', 'uSpin', 'uBright', 'uView', 'uHot', 'uMid', 'uCool']) U[k] = gl.getUniformLocation(prog, k);
        cnv.addEventListener('webglcontextlost', e => { e.preventDefault(); ok = false; });
        cnv.addEventListener('webglcontextrestored', () => { ok = false; init(); });
        ok = true;
      } catch (e) { ok = false; if (window.console) console.warn('Shader nicht verfügbar – einfache Grafik', e); }
    }
    const hsl = (h, s, l) => { // → rgb 0..1
      h = hn(h) / 360; s /= 100; l /= 100;
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p2 = 2 * l - q;
      const f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p2 + (q - p2) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p2 + (q - p2) * (2 / 3 - t) * 6 : p2; };
      return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
    };
    init();
    return {
      get ok() { return ok; },
      // zeichnet das Loch; gibt die Kantenlänge des Bildes in CSS-Pixeln zurück
      render(R, bright) {
        const view = 7.15 * 1.1, S = 2 * view * R / 2.598;
        const N = Math.max(64, Math.min(560, Math.round(S * DPR)));
        if (cnv.width !== N) { cnv.width = N; cnv.height = N; }
        gl.viewport(0, 0, N, N);
        gl.uniform2f(U.uRes, N, N); gl.uniform1f(U.uView, view);
        gl.uniform1f(U.uTilt, Math.asin(clamp(hole.k, 0.05, 0.9))); gl.uniform1f(U.uRoll, hole.roll);
        gl.uniform1f(U.uSpin, hole.spin * 3); gl.uniform1f(U.uBright, bright);
        const H0 = hole.hue, S0 = hole.sat, hot = hole.rausch * 8;
        gl.uniform3fv(U.uHot, hsl(H0 + 28, S0, 95)); gl.uniform3fv(U.uMid, hsl(H0, S0, 56 + hot)); gl.uniform3fv(U.uCool, hsl(H0 - 26, S0 * 0.9, 30 + hot));
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        return S;
      },
      cnv,
    };
  })();

  function passes(f, total) { for (let k = 0; total > 0.02 && k < 4; k++, total -= 1) f(Math.min(1, total)); }
  // weicher Schein entlang der Scheibenebene – lässt das Gas leuchten
  function diskGlow(R, a) {
    const ro = R * 1.155 / RI * 1.2;
    ctx.save(); ctx.translate(hole.x, hole.y); ctx.rotate(hole.roll); ctx.scale(1, hole.k * 1.8);
    const g = ctx.createRadialGradient(0, 0, R * 0.8, 0, 0, ro);
    g.addColorStop(0, `hsla(${hn(hole.hue + 10)},${hole.sat}%,70%,${(0.32 * a).toFixed(3)})`);
    g.addColorStop(0.5, `hsla(${hn(hole.hue)},${hole.sat}%,55%,${(0.12 * a).toFixed(3)})`);
    g.addColorStop(1, 'hsla(0,0%,0%,0)');
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, ro, 0, TAU); ctx.fill();
    ctx.restore(); ctx.globalCompositeOperation = 'source-over';
  }
  function drawGlow(R) {
    const x = hole.x, y = hole.y, S0 = hole.sat;
    const a = 0.2 + 0.16 * hole.rausch + 0.22 * Math.min(1, hole.feed);
    const g = ctx.createRadialGradient(x, y, R * 0.9, x, y, R * 5);
    g.addColorStop(0, `hsla(${hn(hole.hue)},${S0}%,60%,${a})`);
    g.addColorStop(0.35, `hsla(${hn(hole.hue - 20)},${S0}%,50%,${a * 0.35})`);
    g.addColorStop(1, 'hsla(0,0%,0%,0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R * 5, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawShadow(R) {
    const x = hole.x, y = hole.y, f = Math.min(1, hole.feed), S0 = hole.sat;
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
    // Photonenring
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = Math.max(1, R * 0.03);
    ctx.strokeStyle = `hsla(${hn(hole.hue + 25)},${S0}%,90%,${0.6 + 0.35 * f})`;
    ctx.beginPath(); ctx.arc(x, y, R * 1.015, 0, TAU); ctx.stroke();
    ctx.lineWidth = R * 0.12;
    ctx.strokeStyle = `hsla(${hn(hole.hue)},${S0}%,70%,${0.1 + 0.2 * f})`;
    ctx.beginPath(); ctx.arc(x, y, R * 1.07, 0, TAU); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }

  // Relativistische Jets aus den Polen (Fähigkeit „Jet“, ab Stufe „Quasar“ dauerhaft schwach)
  function drawJets(R, a) {
    if (a < 0.02) return;
    ctx.save(); ctx.translate(hole.x, hole.y); ctx.rotate(hole.roll); ctx.globalCompositeOperation = 'lighter';
    for (const dir of [-1, 1]) {
      const room = dir < 0 ? hole.y - hole.top + 20 : hole.bottom - hole.y + 20;
      const L = Math.min(room, R * 6) * (0.88 + 0.12 * Math.sin(clock * 9 + dir * 2)), y0 = dir * R * 1.02;
      // weicher Strahl aus überlappenden Lichtflecken
      for (let k = 0; k < 12; k++) {
        const f = k / 11, y = y0 + dir * (L - R) * f, w = R * (0.3 - 0.2 * f);
        const g = ctx.createRadialGradient(0, y, 0, 0, y, w);
        g.addColorStop(0, `hsla(205,100%,85%,${(0.45 * a * (1 - f * 0.8)).toFixed(3)})`); g.addColorStop(1, 'hsla(220,100%,60%,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, y, w, 0, TAU); ctx.fill();
      }
      // heller Kern
      const g = ctx.createLinearGradient(0, y0, 0, dir * L);
      g.addColorStop(0, `rgba(255,255,255,${(0.95 * a).toFixed(3)})`); g.addColorStop(0.4, `hsla(200,100%,80%,${(0.55 * a).toFixed(3)})`); g.addColorStop(1, 'hsla(220,100%,70%,0)');
      ctx.strokeStyle = g; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(2, R * 0.085);
      ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(0, dir * L); ctx.stroke();
      // Knoten, die den Strahl entlangschießen
      for (let k = 0; k < 3; k++) {
        const p = (clock * 1.6 + k / 3) % 1, y = y0 + dir * (L - R) * p, s = R * 0.1 * (1 - p);
        ctx.globalAlpha = a * (1 - p) * 0.9;
        ctx.fillStyle = '#eaf6ff'; ctx.beginPath(); ctx.arc(0, y, s + 0.6, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  /* ---------- Sprites: Himmelskörper, Beute & Großbeute ---------- */
  const sprCache = new Map();
  const ball = (g, r, stops, lx = -0.35, ly = -0.4) => {
    const gr = g.createRadialGradient(r * lx, r * ly, r * 0.05, 0, 0, r);
    stops.forEach(([o, col]) => gr.addColorStop(o, col));
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
  };
  const glow = (g, r, col) => {
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
    gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
  };
  function blobPath(g, r, rnd, n = 9, j = 0.28) {
    const p = [];
    for (let i = 0; i < n; i++) { const a = i / n * TAU, rr = r * (1 - j + rnd() * j); p.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
    g.beginPath();
    const z = p[n - 1]; g.moveTo((z[0] + p[0][0]) / 2, (z[1] + p[0][1]) / 2);
    for (let i = 0; i < n; i++) { const a = p[i], b = p[(i + 1) % n]; g.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
    g.closePath();
  }
  function star4(c, x, y, s) {
    const q = s * 0.22;
    c.beginPath(); c.moveTo(x, y - s); c.lineTo(x + q, y - q); c.lineTo(x + s, y); c.lineTo(x + q, y + q);
    c.lineTo(x, y + s); c.lineTo(x - q, y + q); c.lineTo(x - s, y); c.lineTo(x - q, y - q); c.closePath(); c.fill();
  }
  function shade(g, B, a = 0.75) { // Nachtseite unten rechts
    const sh = g.createLinearGradient(-B * 0.7, -B * 0.7, B, B);
    sh.addColorStop(0.42, 'rgba(0,0,0,0)'); sh.addColorStop(1, `rgba(0,2,16,${a})`);
    g.fillStyle = sh; g.fillRect(-B, -B, B * 2, B * 2);
  }
  function rockLike(g, B, rnd, cols, warm) {
    blobPath(g, B, rnd, 9, 0.3);
    const gr = g.createRadialGradient(-B * 0.35, -B * 0.4, B * 0.1, 0, 0, B * 1.05);
    gr.addColorStop(0, cols[0]); gr.addColorStop(0.45, cols[1]); gr.addColorStop(1, cols[2]);
    g.fillStyle = gr; g.fill();
    g.save(); g.clip();
    for (let i = 0; i < 5; i++) {
      const x = (rnd() - 0.5) * B * 1.2, y = (rnd() - 0.5) * B * 1.2, r = B * (0.08 + rnd() * 0.16);
      g.fillStyle = 'rgba(30,24,22,.38)'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(255,245,230,.2)'; g.lineWidth = B * 0.035;
      g.beginPath(); g.arc(x - r * 0.15, y - r * 0.15, r, Math.PI * 0.9, Math.PI * 1.7); g.stroke();
    }
    // Licht der Scheibe von unten rechts
    const rl = g.createRadialGradient(B * 0.75, B * 0.75, 0, B * 0.75, B * 0.75, B * 1.3);
    rl.addColorStop(0, warm); rl.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalCompositeOperation = 'lighter'; g.fillStyle = rl; g.fillRect(-B * 1.3, -B * 1.3, B * 2.6, B * 2.6);
    g.restore();
  }
  function pill(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2);
    g.lineTo(x + r, y + h); g.arc(x + r, y + r, r, Math.PI / 2, Math.PI * 1.5); g.closePath();
  }
  const beams = (c, x, y, size, t, a, k = 1) => { // rotierende Leuchtkegel (Neutronenstern)
    const L = size * 2.4 * k;
    c.save(); c.translate(x, y); c.rotate(t * 3.2); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.55 * a;
    const gr = c.createLinearGradient(0, -L, 0, L);
    gr.addColorStop(0, 'rgba(160,230,255,0)'); gr.addColorStop(0.5, 'rgba(225,250,255,.95)'); gr.addColorStop(1, 'rgba(160,230,255,0)');
    c.fillStyle = gr;
    c.beginPath(); c.moveTo(-size * 0.14, 0); c.lineTo(-size * 0.05, -L); c.lineTo(size * 0.05, -L); c.lineTo(size * 0.14, 0);
    c.lineTo(size * 0.05, L); c.lineTo(-size * 0.05, L); c.closePath(); c.fill();
    c.restore();
  };

  const SPRITES = {
    rock: { pad: 1.15, spin: true, paint: (g, B, rnd) => rockLike(g, B, rnd, ['#d8c8b6', '#8a776a', '#352c27'], 'rgba(255,150,70,.42)') },
    ice: { pad: 1.15, spin: true, paint(g, B, rnd) {
      rockLike(g, B, rnd, ['#f4fcff', '#93c4e6', '#2f5a80'], 'rgba(255,170,110,.32)');
      g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(-B * 0.32, -B * 0.36, B * 0.1, 0, TAU); g.fill();
    } },
    gas: { pad: 1.5, paint(g, B, rnd) {
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 8; i++) {
        const x = (rnd() - 0.5) * B * 1.1, y = (rnd() - 0.5) * B * 0.8, r = B * (0.45 + rnd() * 0.45), h = 190 + rnd() * 45;
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, `hsla(${h},85%,80%,.4)`); gr.addColorStop(1, 'hsla(0,0%,0%,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      }
    } },
    comet: { pad: 2.4, spin: true, paint(g, B, rnd) {
      glow(g, B * 2.3, 'rgba(150,220,255,.5)');
      blobPath(g, B * 0.78, rnd, 8, 0.25);
      const gr = g.createRadialGradient(-B * 0.25, -B * 0.3, 0, 0, 0, B * 0.8);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.5, '#cdeeff'); gr.addColorStop(1, '#5f9cc0');
      g.fillStyle = gr; g.fill();
    } },
    moon: { pad: 1.1, spin: true, paint(g, B, rnd) {
      ball(g, B, [[0, '#f2efe6'], [0.55, '#b0aa9e'], [1, '#56514a']]);
      g.save(); g.beginPath(); g.arc(0, 0, B, 0, TAU); g.clip();
      for (let i = 0; i < 9; i++) {
        const a = rnd() * TAU, d = rnd() * B * 0.8, x = Math.cos(a) * d, y = Math.sin(a) * d, r = B * (0.07 + rnd() * 0.17);
        g.fillStyle = 'rgba(70,64,58,.35)'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.arc(x - r * 0.25, y - r * 0.25, r * 0.7, 0, TAU); g.fill();
      }
      shade(g, B, 0.72); g.restore();
    } },
    planet: { pad: 1.3, paint(g, B, rnd) {
      glow(g, B * 1.3, 'rgba(120,190,255,.45)');
      ball(g, B, [[0, '#a6dcff'], [0.5, '#2f7fd6'], [1, '#0d2a63']]);
      g.save(); g.beginPath(); g.arc(0, 0, B, 0, TAU); g.clip();
      for (let i = 0; i < 6; i++) {
        g.save(); g.translate((rnd() - 0.5) * B * 1.6, (rnd() - 0.5) * B * 1.4);
        g.fillStyle = rnd() < 0.6 ? 'rgba(88,168,96,.92)' : 'rgba(200,172,112,.88)';
        blobPath(g, B * (0.18 + rnd() * 0.25), rnd, 7, 0.45); g.fill(); g.restore();
      }
      g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        const y = (rnd() - 0.5) * B * 1.6, x = (rnd() - 0.5) * B;
        g.lineWidth = B * (0.05 + rnd() * 0.07);
        g.beginPath(); g.moveTo(x - B * 0.5, y); g.quadraticCurveTo(x, y - B * 0.12, x + B * 0.5, y + B * 0.05); g.stroke();
      }
      shade(g, B, 0.8); g.restore();
      g.strokeStyle = 'rgba(160,220,255,.6)'; g.lineWidth = B * 0.06;
      g.beginPath(); g.arc(0, 0, B * 0.98, Math.PI * 0.75, Math.PI * 1.75); g.stroke();
    } },
    giant: { pad: 1.9, paint(g, B, rnd) {
      const ring = front => {
        g.save(); g.rotate(-0.35); g.scale(1, 0.3);
        const rg = g.createRadialGradient(0, 0, B * 1.2, 0, 0, B * 1.85);
        rg.addColorStop(0, 'rgba(240,215,170,0)'); rg.addColorStop(0.2, 'rgba(240,215,170,.8)'); rg.addColorStop(0.65, 'rgba(200,165,125,.5)'); rg.addColorStop(1, 'rgba(200,165,125,0)');
        g.fillStyle = rg; g.beginPath();
        if (front) { g.arc(0, 0, B * 1.85, 0, Math.PI); g.arc(0, 0, B * 1.2, Math.PI, 0, true); }
        else { g.arc(0, 0, B * 1.85, Math.PI, TAU); g.arc(0, 0, B * 1.2, TAU, Math.PI, true); }
        g.closePath(); g.fill(); g.restore();
      };
      ring(false);
      ball(g, B, [[0, '#ffe2b5'], [0.6, '#cf8d50'], [1, '#62341a']]);
      g.save(); g.beginPath(); g.arc(0, 0, B, 0, TAU); g.clip(); g.rotate(-0.35);
      for (let i = -6; i <= 6; i++) {
        g.fillStyle = `rgba(${120 + rnd() * 100 | 0},${70 + rnd() * 60 | 0},${30 + rnd() * 30 | 0},${(0.22 + rnd() * 0.3).toFixed(2)})`;
        g.fillRect(-B * 1.3, i * B * 0.17, B * 2.6, B * (0.06 + rnd() * 0.08));
      }
      g.rotate(0.35); shade(g, B, 0.7); g.restore();
      ring(true);
    } },
    star: { pad: 2.6, paint(g, B) {
      glow(g, B * 2.6, 'rgba(255,195,90,.5)'); glow(g, B * 1.5, 'rgba(255,232,165,.8)');
      ball(g, B, [[0, '#ffffff'], [0.4, '#fff1b8'], [1, '#ffb347']], -0.2, -0.2);
    } },
    neutron: { pad: 3.2, paint(g, B) {
      glow(g, B * 3.2, 'rgba(110,200,255,.45)'); glow(g, B * 1.4, 'rgba(200,240,255,.9)');
      ball(g, B * 0.7, [[0, '#ffffff'], [1, '#9fe0ff']], 0, 0);
    }, post: (c, x, y, s, t, a) => beams(c, x, y, s, t, a) },
    nebula: { pad: 1.3, paint(g, B, rnd) {
      g.globalCompositeOperation = 'lighter';
      const hs = [300, 330, 262, 205];
      for (let i = 0; i < 9; i++) {
        const x = (rnd() - 0.5) * B * 1.3, y = (rnd() - 0.5) * B, r = B * (0.35 + rnd() * 0.5), h = hs[i % 4] + rnd() * 20;
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, `hsla(${h},90%,70%,.38)`); gr.addColorStop(1, 'hsla(0,0%,0%,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      }
      g.fillStyle = 'rgba(255,255,255,.85)';
      for (let i = 0; i < 12; i++) { g.beginPath(); g.arc((rnd() - 0.5) * B * 1.2, (rnd() - 0.5) * B * 0.9, B * (0.02 + rnd() * 0.03), 0, TAU); g.fill(); }
    } },
    cluster: { pad: 1.5, paint(g, B, rnd) {
      glow(g, B * 1.4, 'rgba(255,220,255,.3)');
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 26; i++) {
        const a = rnd() * TAU, d = Math.pow(rnd(), 1.6) * B, x = Math.cos(a) * d, y = Math.sin(a) * d, r = B * (0.04 + rnd() * 0.07);
        const col = rnd() < 0.3 ? '255,210,170' : rnd() < 0.5 ? '200,220,255' : '255,255,255';
        const gr = g.createRadialGradient(x, y, 0, x, y, r * 3);
        gr.addColorStop(0, `rgba(${col},1)`); gr.addColorStop(0.3, `rgba(${col},.6)`); gr.addColorStop(1, `rgba(${col},0)`);
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r * 3, 0, TAU); g.fill();
      }
    } },
    galaxy: { pad: 1.25, spin: true, paint(g, B, rnd) {
      g.save(); g.scale(1, 0.62); g.globalCompositeOperation = 'lighter';
      glow(g, B * 1.15, 'rgba(170,150,255,.32)');
      for (let arm = 0; arm < 2; arm++) for (let i = 0; i < 90; i++) {
        const f = i / 90, a = arm * Math.PI + f * 4.2, d = B * (0.12 + f * 0.95);
        const x = Math.cos(a) * d + (rnd() - 0.5) * B * 0.12, y = Math.sin(a) * d + (rnd() - 0.5) * B * 0.12, r = B * (0.05 + (1 - f) * 0.06);
        const gr = g.createRadialGradient(x, y, 0, x, y, r * 2);
        gr.addColorStop(0, `rgba(${200 + (1 - f) * 55 | 0},${200 + (1 - f) * 40 | 0},255,${(0.55 * (1 - f * 0.7)).toFixed(2)})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r * 2, 0, TAU); g.fill();
      }
      glow(g, B * 0.45, 'rgba(255,230,180,.95)');
      g.restore();
    } },
    web: { pad: 1.25, paint(g, B, rnd) {
      const nodes = [[0, 0]];
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + rnd() * 0.5, d = B * (0.3 + rnd() * 0.65); nodes.push([Math.cos(a) * d, Math.sin(a) * d]); }
      g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
      for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
        const [x1, y1] = nodes[i], [x2, y2] = nodes[j];
        if (Math.hypot(x2 - x1, y2 - y1) > B * 1.0) continue;
        g.strokeStyle = 'rgba(120,230,255,.35)'; g.lineWidth = B * 0.05;
        g.beginPath(); g.moveTo(x1, y1); g.quadraticCurveTo((x1 + x2) / 2 + (rnd() - 0.5) * B * 0.3, (y1 + y2) / 2 + (rnd() - 0.5) * B * 0.3, x2, y2); g.stroke();
      }
      for (const [x, y] of nodes) {
        const gr = g.createRadialGradient(x, y, 0, x, y, B * 0.22);
        gr.addColorStop(0, 'rgba(225,250,255,.95)'); gr.addColorStop(1, 'rgba(120,220,255,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, B * 0.22, 0, TAU); g.fill();
      }
    } },
    sat: { pad: 1.2, spin: true, paint(g, B) {
      const panel = x => {
        g.fillStyle = '#1b3f8f'; g.fillRect(x, -B * 0.28, B * 0.72, B * 0.56);
        g.strokeStyle = 'rgba(160,200,255,.75)'; g.lineWidth = B * 0.035;
        for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(x + i * B * 0.18, -B * 0.28); g.lineTo(x + i * B * 0.18, B * 0.28); g.stroke(); }
        g.strokeRect(x, -B * 0.28, B * 0.72, B * 0.56);
      };
      panel(-B); panel(B * 0.28);
      const gr = g.createLinearGradient(-B * 0.3, -B * 0.32, B * 0.3, B * 0.32);
      gr.addColorStop(0, '#ffe7a0'); gr.addColorStop(0.5, '#c99a3c'); gr.addColorStop(1, '#6e4c14');
      g.fillStyle = gr; g.fillRect(-B * 0.3, -B * 0.32, B * 0.6, B * 0.64);
      g.strokeStyle = '#e8e8e8'; g.lineWidth = B * 0.05;
      g.beginPath(); g.moveTo(0, -B * 0.32); g.lineTo(0, -B * 0.62); g.stroke();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(0, -B * 0.66, B * 0.08, 0, TAU); g.fill();
    } },
    capsule: { pad: 1.9, spin: true, paint(g, B, rnd, v) {
      const hue = [215, 195, 285, 42][v] ?? 215, sat = [35, 95, 95, 100][v] ?? 35;
      glow(g, B * 1.85, `hsla(${hue},${sat}%,62%,.65)`);
      g.save(); g.rotate(-0.45);
      const w = B * 1.15, h = B * 0.66;
      pill(g, -w, -h, w * 2, h * 2, h);
      const gr = g.createLinearGradient(0, -h, 0, h);
      gr.addColorStop(0, '#f7f8fc'); gr.addColorStop(0.45, '#a4acc0'); gr.addColorStop(1, '#3f465a');
      g.fillStyle = gr; g.fill();
      g.save(); g.clip();
      g.globalCompositeOperation = 'lighter';
      const band = g.createLinearGradient(-B * 0.3, 0, B * 0.3, 0);
      band.addColorStop(0, `hsla(${hue},${sat}%,60%,0)`); band.addColorStop(0.5, `hsla(${hue},${sat}%,72%,1)`); band.addColorStop(1, `hsla(${hue},${sat}%,60%,0)`);
      g.fillStyle = band; g.fillRect(-B * 0.3, -h, B * 0.6, h * 2);
      g.restore();
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = B * 0.06; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-w + h * 0.7, -h * 0.55); g.lineTo(w - h * 0.7, -h * 0.55); g.stroke();
      g.restore();
    } },
    gold: { pad: 2.6, paint(g, B) {
      glow(g, B * 2.6, 'rgba(255,195,80,.6)'); glow(g, B * 1.3, 'rgba(255,240,190,.95)');
      ball(g, B * 0.62, [[0, '#ffffff'], [1, '#ffd36b']], -0.2, -0.2);
      g.fillStyle = 'rgba(255,255,255,.9)'; star4(g, 0, 0, B * 1.9);
    } },
    bcomet: { pad: 1.7, spin: true, paint(g, B, rnd) {
      glow(g, B * 1.7, 'rgba(140,210,255,.42)');
      rockLike(g, B, rnd, ['#f6fdff', '#9ccbe8', '#2c5679'], 'rgba(255,170,110,.3)');
      g.strokeStyle = 'rgba(20,40,70,.45)'; g.lineWidth = B * 0.04;
      for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo((rnd() - 0.5) * B, (rnd() - 0.5) * B); g.lineTo((rnd() - 0.5) * B, (rnd() - 0.5) * B); g.stroke(); }
    } },
    bplanet: { pad: 1.4, spin: true, paint(g, B, rnd) {
      glow(g, B * 1.4, 'rgba(120,140,255,.35)');
      ball(g, B, [[0, '#a3b1dc'], [0.55, '#4a5a8f'], [1, '#121834']]);
      g.save(); g.beginPath(); g.arc(0, 0, B, 0, TAU); g.clip();
      g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(120,240,255,.75)'; g.lineCap = 'round';
      for (let i = 0; i < 7; i++) {
        let x = (rnd() - 0.5) * B * 1.4, y = (rnd() - 0.5) * B * 1.4;
        g.lineWidth = B * (0.03 + rnd() * 0.03); g.beginPath(); g.moveTo(x, y);
        for (let k = 0; k < 4; k++) { x += (rnd() - 0.5) * B * 0.5; y += (rnd() - 0.5) * B * 0.5; g.lineTo(x, y); }
        g.stroke();
      }
      g.globalCompositeOperation = 'source-over'; shade(g, B, 0.75); g.restore();
    } },
    bdwarf: { pad: 1.7, spin: true, paint(g, B, rnd) {
      glow(g, B * 1.7, 'rgba(255,90,60,.4)');
      ball(g, B, [[0, '#f0956a'], [0.6, '#8a3a2a'], [1, '#26090c']]);
      g.save(); g.beginPath(); g.arc(0, 0, B, 0, TAU); g.clip();
      for (let i = -6; i <= 6; i++) { g.fillStyle = `rgba(${90 + rnd() * 80 | 0},${20 + rnd() * 30 | 0},${15 + rnd() * 20 | 0},.35)`; g.fillRect(-B, i * B * 0.17, B * 2, B * (0.05 + rnd() * 0.07)); }
      shade(g, B, 0.6); g.restore();
    } },
    mirror: { pad: 1.35, paint(g, B, rnd) { // Paralleluniversum: Glaskugel mit einer Galaxie darin
      glow(g, B * 1.35, 'rgba(150,120,255,.4)');
      ball(g, B, [[0, 'rgba(120,100,220,.55)'], [0.7, 'rgba(40,24,110,.8)'], [1, 'rgba(14,8,48,.92)']]);
      g.save(); g.beginPath(); g.arc(0, 0, B * 0.96, 0, TAU); g.clip(); g.globalCompositeOperation = 'lighter';
      g.save(); g.rotate(0.5); g.scale(1, 0.55);
      for (let arm = 0; arm < 2; arm++) for (let i = 0; i < 50; i++) {
        const f = i / 50, a = arm * Math.PI + f * 4, d = B * (0.08 + f * 0.68), x = Math.cos(a) * d, y = Math.sin(a) * d, r = B * 0.11;
        const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(210,200,255,${(0.5 * (1 - f * 0.6)).toFixed(2)})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      }
      g.restore(); glow(g, B * 0.28, 'rgba(255,235,200,.95)'); g.restore();
      g.strokeStyle = 'rgba(220,210,255,.75)'; g.lineWidth = B * 0.05; g.beginPath(); g.arc(0, 0, B * 0.97, 0, TAU); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = B * 0.07; g.lineCap = 'round'; g.beginPath(); g.arc(0, 0, B * 0.78, Math.PI * 1.12, Math.PI * 1.42); g.stroke();
    } },
    multi: { pad: 1.3, paint(g, B, rnd) { // Multiversum: Schaum aus Blasen
      glow(g, B * 1.3, 'rgba(255,140,230,.28)');
      const bub = [[0, 0, 0.55], [-0.55, -0.3, 0.36], [0.5, -0.42, 0.33], [0.52, 0.38, 0.38], [-0.4, 0.52, 0.33], [-0.02, -0.72, 0.24], [0.05, 0.78, 0.2]];
      bub.forEach(([x, y, r], i) => {
        const h = 280 + i * 22;
        g.save(); g.translate(x * B, y * B);
        const gr = g.createRadialGradient(-r * B * 0.3, -r * B * 0.3, 0, 0, 0, r * B);
        gr.addColorStop(0, `hsla(${h},90%,80%,.5)`); gr.addColorStop(0.75, `hsla(${h},80%,45%,.3)`); gr.addColorStop(1, `hsla(${h},90%,75%,.75)`);
        g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r * B, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(-r * B * 0.35, -r * B * 0.38, r * B * 0.13, 0, TAU); g.fill();
        g.restore();
      });
    } },
    grid: { pad: 1.3, spin: true, paint(g, B) { // Raumzeit: zum Zentrum hin verzogenes Gitter
      glow(g, B * 1.3, 'rgba(90,170,255,.3)');
      g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
      const warp = (x, y) => { const d = Math.hypot(x, y) + 0.001, f = 1 - 0.42 * Math.exp(-d * d * 3.2); return [x * f * B, y * f * B]; };
      for (let k = -4; k <= 4; k++) for (const horiz of [0, 1]) {
        g.beginPath();
        for (let t = -20; t <= 20; t++) { const a = t / 20, b = k / 4, [x, y] = horiz ? warp(a, b) : warp(b, a); if (t === -20) g.moveTo(x, y); else g.lineTo(x, y); }
        g.strokeStyle = `rgba(140,205,255,${(0.75 - Math.abs(k) * 0.14).toFixed(2)})`; g.lineWidth = B * 0.035; g.stroke();
      }
      g.globalCompositeOperation = 'destination-in';
      const m = g.createRadialGradient(0, 0, B * 0.3, 0, 0, B * 1.05); m.addColorStop(0, '#000'); m.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = m; g.fillRect(-B * 1.3, -B * 1.3, B * 2.6, B * 2.6);
      g.globalCompositeOperation = 'source-over';
      glow(g, B * 0.2, 'rgba(255,255,255,.9)');
    } },
    void: { pad: 1.7, paint(g, B) { // Das Nichts: dunkler als der Himmel, mit kaltem Rand
      glow(g, B * 1.7, 'rgba(170,110,255,.38)');
      g.fillStyle = '#020108'; g.beginPath(); g.arc(0, 0, B, 0, TAU); g.fill();
      const gr = g.createRadialGradient(0, 0, B * 0.55, 0, 0, B); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(150,100,255,.4)');
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, B, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(215,190,255,.9)'; g.lineWidth = B * 0.05; g.beginPath(); g.arc(0, 0, B * 0.98, 0, TAU); g.stroke();
      g.strokeStyle = 'rgba(190,150,255,.35)'; g.lineWidth = B * 0.03; g.beginPath(); g.arc(0, 0, B * 0.62, 0, TAU); g.stroke();
    } },
    mini: { pad: 2.4, paint(g, B) { // kleines rivalisierendes Schwarzes Loch
      glow(g, B * 2.4, 'rgba(190,90,255,.45)');
      g.save(); g.rotate(0.3); g.scale(1, 0.3);
      const rg = g.createRadialGradient(0, 0, B * 1.1, 0, 0, B * 2.4);
      rg.addColorStop(0, 'rgba(255,225,255,.95)'); rg.addColorStop(0.3, 'rgba(230,110,255,.75)'); rg.addColorStop(1, 'rgba(120,40,200,0)');
      g.fillStyle = rg; g.beginPath(); g.arc(0, 0, B * 2.4, 0, TAU); g.arc(0, 0, B * 1.05, 0, TAU, true); g.fill();
      g.restore();
      g.fillStyle = '#000'; g.beginPath(); g.arc(0, 0, B, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(255,200,255,.85)'; g.lineWidth = B * 0.06; g.beginPath(); g.arc(0, 0, B * 1.03, 0, TAU); g.stroke();
    } },
    bneutron: { pad: 3, paint(g, B) {
      glow(g, B * 3, 'rgba(110,200,255,.5)'); glow(g, B * 1.5, 'rgba(210,245,255,.9)');
      ball(g, B * 0.75, [[0, '#ffffff'], [1, '#a6e4ff']], 0, 0);
    }, post: (c, x, y, s, t, a) => beams(c, x, y, s, t, a, 1.4) },
  };

  // B = Radius des Körpers in Bildpunkten der Vorlage (64 reicht im Spiel, größer für Dialoge)
  function sprite(kind, v = 0, B = 64) {
    const key = kind + ':' + v + ':' + B;
    let s = sprCache.get(key);
    if (!s) {
      const def = SPRITES[kind] || SPRITES.rock, size = Math.ceil(B * 2 * def.pad);
      const c = mk(size, size), g = c.getContext('2d');
      g.translate(size / 2, size / 2);
      def.paint(g, B, rng(v * 7919 + kind.length * 104729 + kind.charCodeAt(0) * 31 + 1), v);
      s = { cv: c, pad: def.pad, spin: !!def.spin, post: def.post || null };
      sprCache.set(key, s);
    }
    return s;
  }
  // size = Durchmesser des Körpers in CSS-Pixeln
  function drawSprite(c, kind, x, y, size, rot, v = 0, alpha = 1) {
    const s = sprite(kind, v), d = size * s.pad;
    c.globalAlpha = alpha;
    if (s.spin && rot) { c.save(); c.translate(x, y); c.rotate(rot); c.drawImage(s.cv, -d / 2, -d / 2, d, d); c.restore(); }
    else c.drawImage(s.cv, x - d / 2, y - d / 2, d, d);
    if (s.post) s.post(c, x, y, size, clock, alpha);
    c.globalAlpha = 1;
  }

  /* ---------- Orbit: gekaufte Himmelskörper kreisen auf verschieden geneigten Bahnen ---------- */
  const ORB = GENS.map((g, i) => ({
    tilt: [-0.30, 0.20, -0.12, 0.30, -0.22, 0.08, 0.26, -0.27, 0.13, -0.05, 0.22, -0.17, 0.28, -0.24, 0.1, -0.08][i] ?? 0,
    fl: [0.22, 0.30, 0.25, 0.34, 0.22, 0.30, 0.26, 0.36, 0.22, 0.32, 0.25, 0.30, 0.24, 0.33, 0.27, 0.35][i] ?? 0.28,
    rf: 0.6 + 0.4 * i / Math.max(1, GENS.length - 1),
    sp: 0.55 / (1 + i * 0.2),
    ph: i * 1.7,
    size: [12, 17, 10, 13, 15, 20, 14, 10, 23, 20, 22, 23, 19, 22, 22, 18][i] ?? 15,
  }));
  let counts = GENS.map(() => 0), prods = GENS.map(() => 0);
  const P = { x: 0, y: 0, z: 0 };
  // je mehr Arten kreisen, desto weniger Exemplare pro Art – sonst wird es ein Gewimmel
  let visCap = 6;
  const visN = c => c > 0 ? Math.min(visCap, 1 + Math.floor(Math.log2(c))) : 0;
  const flat = o => o.fl * hole.k / 0.23;
  function orbitPos(i, j, n) {
    const o = ORB[i], rx = hole.orbitR * o.rf, ry = rx * flat(o);
    const a = clock * o.sp + j * TAU / n + o.ph;
    const ex = Math.cos(a) * rx, ey = Math.sin(a) * ry, cs = Math.cos(o.tilt), sn = Math.sin(o.tilt);
    P.x = hole.x + ex * cs - ey * sn; P.y = hole.y + ex * sn + ey * cs; P.z = Math.sin(a);
    return P;
  }
  function drawOrbitLines() {
    ctx.lineWidth = 1;
    for (let i = 0; i < GENS.length; i++) {
      if (!counts[i]) continue;
      const o = ORB[i], rx = hole.orbitR * o.rf;
      ctx.strokeStyle = `hsla(${GENS[i].hue},80%,75%,.06)`;
      ctx.beginPath(); ctx.ellipse(hole.x, hole.y, rx, rx * flat(o), o.tilt, 0, TAU); ctx.stroke();
    }
  }
  function drawOrbit(front) {
    for (let i = 0; i < GENS.length; i++) {
      const n = visN(counts[i]); if (!n) continue;
      for (let j = 0; j < n; j++) {
        orbitPos(i, j, n);
        if ((P.z > 0) !== front) continue;
        const d = (P.z + 1) / 2;
        if (!RM) { // Leuchtspur entlang der Bahn
          const o = ORB[i], rx = hole.orbitR * o.rf, a = clock * o.sp + j * TAU / n + o.ph;
          ctx.globalAlpha = (front ? 0.3 : 0.14) * (0.5 + 0.5 * d); ctx.strokeStyle = `hsl(${GENS[i].hue},90%,78%)`; ctx.lineWidth = Math.max(1, o.size * 0.13); ctx.lineCap = 'round';
          ctx.beginPath(); ctx.ellipse(hole.x, hole.y, rx, rx * flat(o), o.tilt, a - 0.34, a); ctx.stroke();
        }
        drawSprite(ctx, GENS[i].spr, P.x, P.y, ORB[i].size * (0.7 + 0.4 * d), clock * 0.6 + j * 2 + i, j % 3, front ? 1 : 0.4 + 0.45 * d);
      }
    }
  }

  /* ---------- Materieströme: Teilchen spiralen in der Scheibenebene ins Loch ---------- */
  const spir = [];
  function addSpiral(x, y, hue, size, sp) {
    if (spir.length > 240) return;
    const dx = x - hole.x, dy = y - hole.y, cr = Math.cos(hole.roll), sr = Math.sin(hole.roll), fl = hole.k * 1.45;
    const u = dx * cr + dy * sr, v = (-dx * sr + dy * cr) / fl;
    spir.push({ r: Math.hypot(u, v), th: Math.atan2(v, u), hue: hn(hue), size, sp, x, y, px: x, py: y, age: 0, front: v > 0 });
  }
  function updateSpirals(dt) {
    const R = hole.R, cr = Math.cos(hole.roll), sr = Math.sin(hole.roll), fl = hole.k * 1.45;
    for (let i = spir.length - 1; i >= 0; i--) {
      const p = spir[i], q = R / Math.max(p.r, 1), q15 = q * Math.sqrt(q);
      p.age += dt;
      p.r -= dt * p.sp * (18 + 260 * q15);
      p.th -= dt * p.sp * (0.45 + 3.2 * q15);
      if (p.r <= R * 1.08) { spir.splice(i, 1); hole.feed = Math.min(1.5, hole.feed + 0.01); continue; }
      const u = Math.cos(p.th) * p.r, v = Math.sin(p.th) * p.r * fl;
      p.px = p.x; p.py = p.y;
      p.x = hole.x + u * cr - v * sr; p.y = hole.y + u * sr + v * cr;
      p.front = Math.sin(p.th) > 0;
    }
  }
  function drawSpirals(front) {
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (const p of spir) {
      if (p.front !== front) continue;
      const a = Math.min(1, p.age * 4), col = `hsl(${p.hue},100%,74%)`;
      ctx.strokeStyle = col;
      ctx.globalAlpha = a * 0.22; ctx.lineWidth = p.size * 3.2;
      ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.globalAlpha = a * 0.9; ctx.lineWidth = p.size;
      ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  function feedOrbit(dt) {
    if (RM) return;
    for (let i = 0; i < GENS.length; i++) {
      const n = visN(counts[i]); if (!n) continue;
      const perSec = Math.min(2.4, 0.18 + 0.16 * Math.log10(1 + prods[i])) * (1 + hole.rausch);
      if (Math.random() < perSec * dt) {
        orbitPos(i, Math.floor(Math.random() * n), n);
        addSpiral(P.x, P.y, GENS[i].hue, 1.2 + ORB[i].size * 0.08, 0.7 + Math.random() * 0.5);
      }
    }
  }

  /* ---------- Sog beim Tippen: Teilchen wirbeln vom Tippunkt ins Loch ---------- */
  const pulls = [];
  function pull(x, y, n, hue, spread = 26) {
    if (RM) n = Math.ceil(n / 2);
    for (let k = 0; k < n; k++) {
      const px = x + (Math.random() - 0.5) * spread * 2, py = y + (Math.random() - 0.5) * spread * 2;
      const dx = px - hole.x, dy = (py - hole.y) / 0.78;
      pulls.push({ r: Math.hypot(dx, dy), a: Math.atan2(dy, dx), hue: hn(hue ?? hole.hue + 20), size: 1.1 + Math.random() * 1.6, x: px, y: py, px, py, v: 30 + Math.random() * 60 });
    }
    if (pulls.length > 300) pulls.splice(0, pulls.length - 300);
  }
  function updatePulls(dt) {
    const R = hole.R;
    for (let i = pulls.length - 1; i >= 0; i--) {
      const p = pulls[i];
      p.v += dt * (500 + 2600 * R / Math.max(p.r, R));
      p.r -= p.v * dt;
      p.a -= dt * (1.2 + 6 * R / Math.max(p.r, R));
      if (p.r <= R * 1.04) { pulls.splice(i, 1); hole.feed = Math.min(1.5, hole.feed + 0.015); continue; }
      p.px = p.x; p.py = p.y;
      p.x = hole.x + Math.cos(p.a) * p.r; p.y = hole.y + Math.sin(p.a) * p.r * 0.78;
    }
  }
  function drawPulls() {
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (const p of pulls) {
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = `hsl(${p.hue},100%,78%)`; ctx.lineWidth = p.size;
      ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  /* ---------- Beute, Großbeute, Rivale & Verschlingen ---------- */
  let preyList = [], boss = null, rival = null;
  const eaten = [], steals = [];

  function drawTail(o, col) {
    const hs = o.hist; if (!hs || hs.length < 2) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.strokeStyle = col;
    for (let i = 1; i < hs.length; i++) {
      const a = hs[i - 1], b = hs[i], k = i / hs.length;
      ctx.globalAlpha = k * 0.6 * (o.alpha ?? 1);
      ctx.lineWidth = 1 + o.size * 0.5 * k;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.restore();
  }
  function drawPrey() {
    for (const p of preyList) {
      if (p.tail) drawTail(p, p.tail);
      const a = p.alpha ?? 1;
      // weicher Schein, damit Beute auf dem dunklen Himmel auffällt
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.22 * a;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 1.3);
      g.addColorStop(0, `hsla(${p.hue},100%,70%,1)`); g.addColorStop(1, 'hsla(0,0%,0%,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 1.3, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      drawSprite(ctx, p.spr, p.x, p.y, p.size, p.rot, p.v || 0, a);
    }
  }
  function drawBoss() {
    const b = boss; if (!b) return;
    const sh = b.shake || 0, sx = sh ? (Math.random() - 0.5) * 7 * sh : 0, sy = sh ? (Math.random() - 0.5) * 7 * sh : 0;
    const a = b.alpha ?? 1, pulse = 0.5 + 0.5 * Math.sin(clock * 5);
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a;
    ctx.strokeStyle = `hsla(${b.hue},100%,75%,${(0.3 + 0.25 * pulse).toFixed(2)})`; ctx.lineWidth = 2;
    ctx.setLineDash([6, 7]); ctx.lineDashOffset = -clock * 24;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.size * 0.62 + 12, 0, TAU); ctx.stroke();
    ctx.setLineDash([]); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    if (b.tail) drawTail(b, b.tail);
    drawSprite(ctx, b.spr, b.x + sx, b.y + sy, b.size * (0.72 + 0.28 * b.hp / b.max), b.rot, 0, a);
  }
  function drawRival() {
    const rv = rival; if (!rv || rv.vis <= 0) return;
    const r = rv.r * rv.vis, sh = rv.shake || 0, x = rv.x + (sh ? (Math.random() - 0.5) * 6 * sh : 0), y = rv.y;
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 4.5);
    g.addColorStop(0, 'hsla(285,95%,62%,.45)'); g.addColorStop(1, 'hsla(285,95%,40%,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 4.5, 0, TAU); ctx.fill();
    const ring = front => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(0.3); ctx.scale(1, 0.3);
      ctx.beginPath(); if (front) ctx.rect(-r * 4, 0, r * 8, r * 4); else ctx.rect(-r * 4, -r * 4, r * 8, r * 4); ctx.clip();
      const rg = ctx.createRadialGradient(0, 0, r * 1.15, 0, 0, r * 2.7);
      rg.addColorStop(0, 'rgba(255,225,255,.95)'); rg.addColorStop(0.3, `hsla(${300 + 20 * Math.sin(clock * 3)},100%,65%,.75)`); rg.addColorStop(1, 'hsla(270,100%,45%,0)');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, 0, r * 2.7, 0, TAU); ctx.arc(0, 0, r * 1.1, 0, TAU, true); ctx.fill();
      ctx.restore();
    };
    ring(false);
    ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,200,255,.85)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(x, y, r * 1.03, 0, TAU); ctx.stroke();
    ring(true);
    ctx.globalCompositeOperation = 'source-over';
  }
  // Der Rivale saugt Materie aus deiner Scheibe
  function updateSteals(dt) {
    if (rival && rival.stealing && rival.vis > 0.6 && !RM && Math.random() < dt * 22) {
      const dir = Math.sign(rival.x - hole.x) || 1, x0 = hole.x + dir * hole.R * (1.3 + Math.random() * 0.8), y0 = hole.y + (Math.random() - 0.5) * hole.R * 0.5;
      steals.push({ x0, y0, cx: (x0 + rival.x) / 2, cy: Math.min(y0, rival.y) - 30 - Math.random() * 30, t: 0, dur: 0.55 + Math.random() * 0.25, x: x0, y: y0, px: x0, py: y0, hue: hn(hole.hue + Math.random() * 30) });
    }
    for (let i = steals.length - 1; i >= 0; i--) {
      const s = steals[i]; s.t += dt;
      const k = s.t / s.dur;
      if (k >= 1 || !rival) { steals.splice(i, 1); continue; }
      const u = 1 - k;
      s.px = s.x; s.py = s.y;
      s.x = u * u * s.x0 + 2 * u * k * s.cx + k * k * rival.x; s.y = u * u * s.y0 + 2 * u * k * s.cy + k * k * rival.y;
    }
  }
  function drawSteals() {
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineWidth = 2;
    for (const s of steals) { ctx.strokeStyle = `hsla(${s.hue},100%,75%,.85)`; ctx.beginPath(); ctx.moveTo(s.px, s.py); ctx.lineTo(s.x, s.y); ctx.stroke(); }
    ctx.globalCompositeOperation = 'source-over';
  }

  // Verschlingen: Objekt wirbelt ins Loch und wird dabei in die Länge gezogen (Spaghettifizierung)
  function devour(o) {
    const dx = o.x - hole.x, dy = (o.y - hole.y) / 0.8, r = Math.hypot(dx, dy);
    eaten.push({ spr: o.spr, v: o.v || 0, size: o.size, hue: hn(o.hue ?? hole.hue), big: !!o.big, r0: r, r, a: Math.atan2(dy, dx), t: 0, dur: o.big ? 1.3 : 0.75, x: o.x, y: o.y, cb: o.cb });
  }
  function updateEaten(dt) {
    const R = hole.R;
    for (let i = eaten.length - 1; i >= 0; i--) {
      const e = eaten[i];
      e.t += dt;
      const k = Math.min(1, e.t / e.dur);
      e.r = R * 0.85 + (e.r0 - R * 0.85) * (1 - k * k);
      e.a -= dt * (0.8 + 5 * k);
      e.x = hole.x + Math.cos(e.a) * e.r; e.y = hole.y + Math.sin(e.a) * e.r * 0.8;
      if (Math.random() < (e.big ? 1 : 0.5)) pull(e.x, e.y, 1, e.hue, e.size * 0.3);
      if (k >= 1) {
        eaten.splice(i, 1);
        hole.feed = Math.min(1.6, hole.feed + (e.big ? 1.3 : 0.55)); hole.gulp = 1;
        const bx = hole.x + Math.cos(e.a) * R, by = hole.y + Math.sin(e.a) * R * 0.8;
        burst(bx, by, e.big ? 60 : 18, e.hue, e.big ? 1.6 : 0.9);
        wave(hole.x, hole.y, R * 1.05, R * (e.big ? 3.5 : 1.6), e.big ? 0.8 : 0.45, { h: e.hue, width: e.big ? 5 : 3, alpha: e.big ? 0.8 : 0.5 });
        if (e.big) shake(4, 0.5);
        if (e.cb) e.cb();
      }
    }
  }
  function drawEaten() {
    for (const e of eaten) {
      const k = Math.min(1, e.t / e.dur), s = sprite(e.spr, e.v), d = e.size * s.pad;
      const dir = Math.atan2(hole.y - e.y, hole.x - e.x);
      ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(dir);
      ctx.scale(1 + 2.8 * k * k, Math.max(0.12, 1 - 0.8 * k));
      ctx.globalAlpha = k > 0.8 ? (1 - k) / 0.2 : 1;
      ctx.drawImage(s.cv, -d / 2, -d / 2, d, d);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- Bild zeichnen ---------- */
  const timers = [];
  let sogAcc = 0;
  function draw(t) {
    const dtRaw = Math.min(0.05, lastT ? Math.max(0, t - lastT) : 0.016);
    lastT = t;
    // Zeitdehnung: alles läuft kurz in Zeitlupe
    hole.warp = Math.max(0, hole.warp - dtRaw * 0.8);
    const speed = 1 - 0.85 * Math.min(1, hole.warp / 0.35);
    const dt = dtRaw * speed;
    clock += dt;
    for (let i = timers.length - 1; i >= 0; i--) { timers[i].t -= dtRaw; if (timers[i].t <= 0) { const f = timers[i].f; timers.splice(i, 1); f(); } }

    const ease = Math.min(1, dtRaw * 4);
    hole.R += (hole.Rt - hole.R) * Math.min(1, dtRaw * 2.2);
    hole.k += (hole.kT - hole.k) * Math.min(1, dtRaw * 3);
    hole.hue += (hole.hueT - hole.hue) * Math.min(1, dtRaw * 1.2);
    hole.sat += (hole.satT - hole.sat) * Math.min(1, dtRaw * 1.2);
    hole.rausch += (hole.rauschT - hole.rausch) * ease;
    hole.jet += (Math.max(hole.jetT, hole.jetBase) - hole.jet) * ease;
    hole.sog += (hole.sogT - hole.sog) * ease;
    hole.gulp = Math.max(0, hole.gulp - dtRaw * 5);
    hole.feed = Math.max(0, hole.feed - dtRaw * 1.1);
    hole.spin += dt * (0.32 + 0.6 * hole.rausch + 0.25 * Math.min(1, hole.feed) + 0.3 * hole.sog) * (RM ? 0.4 : 1);
    const R = hole.R * (1 + 0.06 * hole.gulp);

    // Sog-Fähigkeit: Materie strömt von überall herein
    if (hole.sog > 0.05 && !RM) {
      sogAcc += dtRaw;
      if (Math.random() < dtRaw * 40 * hole.sog) {
        const a = Math.random() * TAU, d = hole.orbitR * (0.9 + Math.random() * 0.5);
        pull(hole.x + Math.cos(a) * d, hole.y + Math.sin(a) * d * 0.7, 1, hole.hue + 25, 6);
      }
      if (sogAcc > 0.45) { sogAcc = 0; wave(hole.x, hole.y, R * 4.2, -R * 3, 0.5, { width: 2.5, alpha: 0.45, h: hole.hue + 25 }); }
    }
    feedOrbit(dt);
    updateSpirals(dt); updatePulls(dtRaw); updateEaten(dtRaw); updateSteals(dtRaw);

    // Himmel (steht still, auch wenn das Bild wackelt)
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.drawImage(bg, 0, 0, W, H);
    if (!RM) {
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55;
      // Schleier ist größer als der Bildschirm und bleibt beim Ziehen immer ganz darüber
      ctx.drawImage(veil, -W * 0.15 + Math.sin(t * 0.021) * W * 0.1, -H * 0.1 + Math.cos(t * 0.017) * H * 0.06, W * 1.3, H * 1.2);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }
    drawStars(t, dtRaw, R);

    // Wackeln: beim Fressrausch leicht, bei Treffern kurz kräftiger
    let ox = 0, oy = 0;
    if (shakeOn && !RM) {
      hole.shake = Math.max(0, hole.shake - dtRaw / hole.shakeDur);
      const amp = Math.max(hole.shakeAmp * hole.shake, hole.rausch * 1.2);
      if (amp > 0.05) { ox = (Math.random() - 0.5) * 2 * amp; oy = (Math.random() - 0.5) * 2 * amp; }
    }
    ctx.save(); ctx.translate(ox, oy);
    const useGL = glOn && GLH.ok;
    if (!useGL) composeDisk();
    drawGlow(R);
    drawOrbitLines();
    drawOrbit(false);
    drawSpirals(false);
    // Helligkeit: Fressrausch & Füttern machen die Scheibe heißer
    const bright = 1.55 + 0.45 * hole.rausch + 0.4 * Math.min(1, hole.feed);
    diskGlow(R, 1 + 0.5 * hole.rausch + 0.4 * Math.min(1, hole.feed));
    if (useGL) {
      drawJets(R, hole.jet);
      const S = GLH.render(R, bright / 1.55);
      ctx.drawImage(GLH.cnv, hole.x - S / 2, hole.y - S / 2, S, S);
    } else {
      passes(a => diskHalf(R, false, a), bright);
      passes(a => drawHalo(R, a), bright * 0.85);
      drawShadow(R);
      drawJets(R, hole.jet);
      passes(a => diskHalf(R, true, a), bright);
    }
    drawOrbit(true);
    drawSpirals(true);
    drawPulls();
    drawSteals();
    drawRival();
    drawPrey();
    drawBoss();
    drawEaten();
    ctx.restore();
    drawTop(t, dtRaw);
  }

  // Sterne mit Gravitationslinse: nahe am Loch werden sie nach außen gebogen (Einsteinring)
  function drawStars(t, dt, R) {
    const hx = hole.x, hy = hole.y, E2 = 4 * (R * 1.5) * (R * 1.5), lim2 = (R * 9) * (R * 9);
    for (const s of stars) {
      if (!RM) { s.y += s.z * 4 * dt; if (s.y > H) { s.y = 0; s.x = Math.random() * W; } }
      let x = s.x, y = s.y;
      const dx = x - hx, dy = y - hy, d2 = dx * dx + dy * dy;
      if (d2 < lim2) { const d = Math.sqrt(d2) + 0.001, nd = (d + Math.sqrt(d2 + E2)) / 2; x = hx + dx / d * nd; y = hy + dy / d * nd; }
      const tw = 0.5 + 0.5 * Math.sin(t * s.sp + s.ph);
      ctx.globalAlpha = s.z * (0.3 + 0.7 * tw);
      ctx.fillStyle = s.col;
      const sz = s.z * 1.8;
      ctx.fillRect(x, y, sz, sz);
      if (s.glint && tw > 0.75) { ctx.globalAlpha = (tw - 0.75) * 2.4; star4(ctx, x + sz / 2, y + sz / 2, 5 + 4 * tw); }
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- Obere Ebene: Wellen, Funken, Zahlen, Blitze ---------- */
  const parts = [], floats = [], waves = [], dust = [];
  const target = { x: 0, y: 0 };
  let flashA = 0, flashCol = '#fff6e6', topDirty = true;
  const FONT = 'ui-rounded, -apple-system, system-ui, sans-serif';
  function drawTop(t, dt) {
    const c = tctx;
    const busy = parts.length || floats.length || waves.length || dust.length || flashA > 0;
    if (busy || topDirty) c.clearRect(0, 0, W, H);
    topDirty = busy;
    if (!busy) return;
    c.globalCompositeOperation = 'lighter';

    for (let i = waves.length - 1; i >= 0; i--) {
      const w = waves[i];
      if (w.delay > 0) { w.delay -= dt; continue; }
      w.life -= dt;
      if (w.life <= 0) { waves.splice(i, 1); continue; }
      const k = w.life / w.max, e = 1 - k * k, r = w.r0 + w.spread * e;
      if (r <= 0) continue;
      c.globalAlpha = (w.spread < 0 ? 1 - k * 0.6 : k) * w.alpha;
      c.strokeStyle = `hsl(${hn(w.h)},100%,82%)`; c.lineWidth = 0.6 + w.width * (w.spread < 0 ? 1 - k * 0.5 : k);
      c.beginPath(); c.arc(w.x, w.y, r, 0, TAU); c.stroke();
    }

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

    // Masse fliegt in den Zähler
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
      c.strokeStyle = d.col || 'hsl(42,100%,78%)'; c.lineWidth = 2.2; c.lineCap = 'round';
      c.beginPath(); c.moveTo(px, py); c.lineTo(d.x, d.y); c.stroke();
    }

    if (floats.length) {
      c.globalCompositeOperation = 'source-over';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      for (let i = floats.length - 1; i >= 0; i--) {
        const f = floats[i];
        f.life -= dt;
        if (f.life <= 0) { floats.splice(i, 1); continue; }
        f.y -= (f.style === 'loss' ? -26 : 64) * dt;
        const age = f.max - f.life, pop = f.style === 'crit' ? 1.25 : 1.05;
        const s = age < 0.14 ? 0.6 + age / 0.14 * (pop - 0.6) : Math.max(1, pop - (age - 0.14) * 0.4);
        c.globalAlpha = Math.min(1, f.life * 2.4);
        c.save(); c.translate(f.x, f.y); c.scale(s, s);
        const st = FSTYLE[f.style] || FSTYLE.tap;
        c.shadowColor = st.glow; c.shadowBlur = st.blur;
        c.font = `800 ${st.size}px ${FONT}`; c.fillStyle = st.col;
        c.fillText(f.text, 0, 0);
        if (st.label) { c.font = `850 10.5px ${FONT}`; c.fillStyle = st.labelCol; c.fillText(st.label, 0, -st.size * 0.82); }
        c.restore();
      }
      c.shadowBlur = 0;
    }

    if (flashA > 0) {
      flashA -= dt * 0.75;
      c.globalCompositeOperation = 'source-over';
      c.globalAlpha = clamp(flashA, 0, 1);
      c.fillStyle = flashCol; c.fillRect(0, 0, W, H);
    }
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
  }
  const FSTYLE = {
    tap:  { size: 21, col: '#ffffff', glow: 'rgba(255,170,90,.9)', blur: 12 },
    big:  { size: 26, col: '#ffe39c', glow: 'rgba(255,170,90,.95)', blur: 14 },
    crit: { size: 31, col: '#ffd060', glow: 'rgba(255,90,40,.95)', blur: 16, label: 'KRITISCH', labelCol: '#ffb4a0' },
    loss: { size: 17, col: '#ff8fa6', glow: 'rgba(255,40,90,.8)', blur: 10 },
    info: { size: 15, col: '#bdf0ff', glow: 'rgba(80,200,255,.8)', blur: 10 },
    mini: { size: 14, col: 'rgba(255,255,255,.85)', glow: 'rgba(255,170,90,.7)', blur: 8 },
    minigold: { size: 16, col: '#ffd060', glow: 'rgba(255,90,40,.8)', blur: 10 },
  };

  function burst(x, y, n, hue, speed = 1) {
    if (RM) n = Math.ceil(n / 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, v = (60 + Math.random() * 170) * speed, max = 0.5 + Math.random() * 0.7;
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: max, max, size: 1.4 + Math.random() * 2.6, h: (hue ?? hole.hue) + (Math.random() - 0.5) * 60, spark: Math.random() < 0.35 });
    }
    if (parts.length > 500) parts.splice(0, parts.length - 500);
  }
  // spread < 0: Welle zieht sich zum Loch hin zusammen
  function wave(x, y, r0, spread, life, opts = {}) {
    if (RM) return;
    waves.push({ x, y, r0, spread, life, max: life, h: opts.h ?? hole.hue, width: opts.width ?? 3, alpha: opts.alpha ?? 0.55, delay: opts.delay ?? 0 });
    if (waves.length > 30) waves.shift();
  }
  function float(x, y, text, style = 'tap') {
    const life = style === 'crit' ? 1.3 : style === 'loss' ? 1 : 1.1;
    floats.push({ x: x + (Math.random() - 0.5) * 24, y: y - 14, text, style, life, max: life });
    if (floats.length > 40) floats.shift();
  }
  function toCounter(x, y, n, col) {
    if (RM) return;
    for (let i = 0; i < n && dust.length < 60; i++) {
      const a = Math.random() * TAU, v = 200 + Math.random() * 120;
      dust.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, life: 1.4, col });
    }
  }
  function shake(amp, dur = 0.3) {
    if (amp >= hole.shakeAmp * hole.shake) { hole.shakeAmp = amp; hole.shake = 1; hole.shakeDur = dur; }
  }

  return {
    hole, resize, layout, draw, burst, float, wave, pull, devour, shake, sprite, setStage,
    tap(x, y, text, kind) {
      if (kind === 'auto' || kind === 'autocrit') { if (Math.random() < 0.3) float(x, y, text, kind === 'autocrit' ? 'minigold' : 'mini'); pull(x, y, 2, hole.hue + 20, 14); return; }
      float(x, y, text, kind === 'crit' ? 'crit' : 'tap');
      pull(x, y, kind === 'crit' ? 12 : 6, hole.hue + 20);
      hole.gulp = Math.max(hole.gulp, kind === 'crit' ? 1 : 0.6);
      wave(hole.x, hole.y, hole.R * 3.4, -hole.R * 2.3, 0.4, { width: 2.2, alpha: 0.38 });
      if (kind === 'crit') {
        burst(x, y, 26, 30, 1.3);
        wave(x, y, 6, 70, 0.5, { h: 35, width: 4, alpha: 0.8 });
        shake(3.2, 0.25);
      } else burst(x, y, 5);
      toCounter(x, y, kind === 'crit' ? 4 : 2);
    },
    toCounter,
    feed(a) { hole.feed = Math.min(1.6, hole.feed + a); hole.gulp = 1; },
    flash(a, col = '#fff6e6') { flashA = Math.max(flashA, a); flashCol = col; },
    setMode(k, v) { hole[k + 'T'] = v; },
    setOrbit(gens, pr) { counts = gens.slice(); if (pr) prods = pr.slice(); const m = counts.filter(c => c > 0).length; visCap = m > 12 ? 3 : m > 8 ? 4 : m > 5 ? 5 : 6; },
    setGL(on) { glOn = on; },
    setPrey(list) { preyList = list; },
    setBoss(b) { boss = b; },
    setRival(r) { rival = r; },
    setCollect(x, y) { target.x = x; target.y = y; },
    setShake(on) { shakeOn = on; },
    after(sec, f) { timers.push({ t: sec, f }); },
    stageUp() {
      hole.feed = 1.6; hole.gulp = 1;
      flashA = Math.max(flashA, 0.35); flashCol = `hsl(${hn(hole.hue)},100%,85%)`;
      burst(hole.x, hole.y, 90, hole.hue, 2);
      for (let i = 0; i < 3; i++) wave(hole.x, hole.y, hole.R, Math.max(W, H) * (0.35 + i * 0.15), 1.1 + i * 0.2, { width: 6 - i * 1.5, alpha: 0.8, delay: i * 0.15 });
      shake(5, 0.6);
    },
    bigBang() {
      flashA = 1.3; flashCol = '#fff6e6';
      burst(hole.x, hole.y, 200, hole.hue, 2.4);
      for (let i = 0; i < 3; i++) wave(hole.x, hole.y, hole.R, Math.max(W, H) * (0.5 + i * 0.2), 1.4 + i * 0.2, { width: 8 - i * 2, alpha: 0.8, delay: i * 0.18 });
      hole.R = 2; spir.length = 0; pulls.length = 0;
    },
    timeWarp(done) {
      hole.warp = 1.2;
      for (let i = 0; i < 4; i++) wave(hole.x, hole.y, Math.max(W, H) * 0.6, -Math.max(W, H) * 0.6 + hole.R, 0.9, { width: 5, alpha: 0.6, h: 45, delay: i * 0.12 });
      timers.push({ t: 0.95, f: () => { flashA = Math.max(flashA, 0.45); flashCol = '#fff2d0'; burst(hole.x, hole.y, 70, 45, 1.8); hole.feed = 1.6; shake(5, 0.5); if (done) done(); } });
    },
  };
})();

/* ---------- Töne (Web Audio, synthetisch – keine Dateien nötig) ---------- */
const SND = (() => {
  let ac = null, master = null, on = true, lastTap = 0, noiseBuf = null;
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
  const ready = () => on && ac && ac.state === 'running';

  function tone(freq, dur, type, vol, delay = 0, to) {
    if (!ready()) return;
    const t = ac.currentTime + delay;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  }
  // Rauschen durch einen wandernden Bandpass – „Wusch“
  function whoosh(dur, vol, f0, f1, delay = 0) {
    if (!ready()) return;
    if (!noiseBuf) {
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = ac.currentTime + delay, src = ac.createBufferSource(), bp = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = noiseBuf; bp.type = 'bandpass'; bp.Q.value = 0.9;
    bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp); bp.connect(g); g.connect(master);
    src.start(t); src.stop(t + dur + 0.05);
  }
  const seq = (notes, base, type, vol, gap, dur) => notes.forEach((s, i) => tone(f(s, base), dur, type, vol, i * gap));

  return {
    unlock,
    setOn(v) { on = v; },
    tap(hot) {
      const now = performance.now();
      if (now - lastTap < 35) return;
      lastTap = now;
      tone(150, 0.16, 'sine', 0.26, 0, 50);
      const s = SC[Math.floor(Math.random() * SC.length)];
      tone(f(s + (hot ? 12 : 0), 392), 0.18, 'sine', 0.09);
    },
    crit() { seq([12, 19, 24], 523.25, 'triangle', 0.11, 0.03, 0.4); tone(500, 0.14, 'sine', 0.08, 0, 1800); tone(120, 0.3, 'sine', 0.3, 0, 40); },
    devour(big) { tone(big ? 600 : 900, big ? 0.7 : 0.32, 'sine', big ? 0.24 : 0.17, 0, big ? 60 : 110); tone(1800, 0.25, 'triangle', 0.035, 0, 240); if (big) tone(70, 1.1, 'sine', 0.4, 0.2, 35); },
    buy() { seq([0, 4, 7], 392, 'triangle', 0.12, 0.045, 0.18); },
    up() { seq([0, 7, 12, 16], 440, 'sine', 0.15, 0.06, 0.25); },
    star() { seq([0, 4, 7, 11, 14, 19, 23, 26], 659, 'sine', 0.12, 0.045, 0.3); },
    ach() { seq([7, 12, 16, 19], 523.25, 'triangle', 0.12, 0.08, 0.35); },
    rausch() { tone(110, 0.7, 'sawtooth', 0.05, 0, 880); seq([0, 4, 7, 12, 16, 19], 261.6, 'triangle', 0.1, 0.06, 0.45); whoosh(0.8, 0.2, 300, 3000); },
    rauschEnd() { tone(440, 0.5, 'sine', 0.08, 0, 110); },
    alarm() { tone(73, 0.9, 'sawtooth', 0.045); tone(77.8, 0.9, 'sawtooth', 0.045); tone(146, 0.5, 'triangle', 0.05, 0.25, 98); },
    hit() { tone(240, 0.12, 'triangle', 0.13, 0, 70); },
    win() { seq([0, 4, 7, 12, 16, 19, 24], 392, 'triangle', 0.12, 0.06, 0.45); tone(70, 1.2, 'sine', 0.4, 0, 38); },
    lost() { seq([7, 3, 0], 293.7, 'sine', 0.09, 0.12, 0.35); },
    steal() { tone(320, 0.08, 'sine', 0.03, 0, 520); },
    ability() { whoosh(0.7, 0.3, 250, 2600); tone(220, 0.6, 'sine', 0.1, 0, 660); },
    warp() { tone(900, 1.0, 'sine', 0.16, 0, 55); whoosh(1.0, 0.2, 3000, 200); seq([0, 7, 12, 19, 24], 261.6, 'sine', 0.1, 0.08, 0.6); },
    chest(r) {
      const n = { c: [0, 4, 7], r: [0, 4, 7, 12], e: [0, 4, 7, 11, 14, 19], l: [0, 4, 7, 12, 16, 19, 24, 28] }[r] || [0, 4, 7];
      whoosh(0.4, 0.15, 400, 2400); seq(n, 523.25, 'sine', 0.12, 0.055, 0.4);
      if (r === 'l' || r === 'e') tone(65, 1.1, 'sine', 0.35, 0.05, 40);
    },
    stageUp() { seq([0, 7, 12, 16, 19, 24], 261.6, 'sine', 0.12, 0.09, 0.8); tone(60, 1.5, 'sine', 0.42, 0, 34); whoosh(1.2, 0.18, 200, 1800); },
    nova() { tone(55, 2.2, 'sine', 0.5); seq([0, 7, 12, 19, 24, 31], 261.6, 'sine', 0.1, 0.12, 1.2); },
    tab() { tone(f(12, 523.25), 0.06, 'sine', 0.05); },
  };
})();

/* ---------- Vibration (Android: vibrate, iOS 18+: Switch-Trick) ---------- */
const HAP = (() => {
  let on = true, last = 0;
  const lab = document.getElementById('hapLabel');
  function fire(force) {
    if (!on) return;
    const t = performance.now();
    if (!force && t - last < 45) return;
    last = t;
    if (navigator.vibrate) { try { navigator.vibrate(10); } catch (e) {} return; }
    if (lab) lab.click();
  }
  return {
    setOn(v) { on = v; },
    fire,
    burst(n, gap = 70) { for (let i = 0; i < n; i++) setTimeout(() => fire(true), i * gap); },
  };
})();
