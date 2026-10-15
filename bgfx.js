/* Calm animated backgrounds. Choose in Settings > Background, or add ?bg=aurora|flow|halo|drape|rays|silk|stars|bokeh|grid|off to the address. */
(function () {
  'use strict';
  const html = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  const MODES = ['aurora', 'flow', 'halo', 'drape', 'rays', 'silk', 'stars', 'bokeh', 'grid', 'off'];
  const CANVAS_MODES = ['silk', 'stars', 'bokeh', 'halo', 'drape', 'rays'];
  const L = { aurora: ['Aurora', 'شفق'], flow: ['Flow', 'انسياب'], halo: ['Halo', 'هالة'], drape: ['Drape', 'ستارة'], rays: ['Rays', 'أشعة'], silk: ['Silk', 'حرير'], stars: ['Stars', 'نجوم'], bokeh: ['Bokeh', 'ضوء ناعم'], grid: ['Grid', 'شبكة'], off: ['Off', 'بدون'], title: ['Background', 'الخلفية'] };
  const isAr = () => html.dir === 'rtl';
  const cv = $('#bgCv'); const ctx = cv && cv.getContext('2d');
  if (!cv || !ctx) return;
  const reduce = matchMedia('(prefers-reduced-motion:reduce)');
  let mode = 'aurora', W = 0, H = 0, S = 1, raf = 0, last = 0, T = 0, items = [], lw = innerWidth, lh = innerHeight;
  let AC = [207, 174, 106], AC2 = [236, 215, 164], GL = [120, 86, 34];
  let PX = 0, PY = 0, MX = 0, MY = 0;
  window.__bgStats = { frames: 0, mode: '' };
  addEventListener('pointermove', e => { PX = (e.clientX / innerWidth - 0.5) * 2; PY = (e.clientY / innerHeight - 0.5) * 2; }, { passive: true });
  const num = v => getComputedStyle(html).getPropertyValue(v).split(',').map(s => parseFloat(s));
  function colors() {
    const a = num('--ac-rgb'), b = num('--ac2-rgb'), g = num('--glow-rgb');
    if (a.length === 3 && !a.some(isNaN)) AC = a; if (b.length === 3 && !b.some(isNaN)) AC2 = b; if (g.length === 3 && !g.some(isNaN)) GL = g;
  }
  const rgba = (c, a) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  const R = (a, b) => a + Math.random() * (b - a);

  /* ---------- WebGL "flow" (soft domain-warped colour, very low contrast) ---------- */
  const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const FS = `precision mediump float;
uniform vec2 uRes;uniform float uT;uniform vec3 uA;uniform vec3 uB;uniform vec3 uG;uniform vec2 uM;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.02+vec2(1.7,9.2);a*=.5;}return v;}
void main(){
  vec2 p=(gl_FragCoord.xy-.5*uRes)/min(uRes.x,uRes.y);
  p+=uM*.035;
  float t=uT*.045;
  vec2 q=vec2(fbm(p*1.3+t),fbm(p*1.3+vec2(5.2,1.3)-t));
  vec2 r=vec2(fbm(p*1.6+2.*q+vec2(1.7,9.2)+t*1.2),fbm(p*1.6+2.*q+vec2(8.3,2.8)-t));
  float f=fbm(p*1.4+2.2*r);
  float band=smoothstep(.34,.95,f);
  vec3 col=mix(uG,uA,band)*band*.55+uB*pow(band,3.)*.35;
  float vig=smoothstep(1.3,.15,length(p*vec2(.85,1.1)));
  col*=vig*.5;
  gl_FragColor=vec4(col,clamp(max(col.r,max(col.g,col.b)),0.,1.));
}`;
  let gl = null, glcv = null, prog = null, U = {}, glFail = false;
  function sh(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; }
  function initGL() {
    if (gl) return true; if (glFail) return false;
    const c = document.createElement('canvas'); c.id = 'bgGl';
    const g = c.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'low-power' });
    if (!g) { glFail = true; return false; }
    gl = g; glcv = c;
    const v = sh(gl.VERTEX_SHADER, VS), f = sh(gl.FRAGMENT_SHADER, FS);
    if (!v || !f) { glFail = true; gl = null; glcv = null; return false; }
    prog = gl.createProgram(); gl.attachShader(prog, v); gl.attachShader(prog, f); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { glFail = true; gl = null; glcv = null; return false; }
    gl.useProgram(prog);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    U = { res: gl.getUniformLocation(prog, 'uRes'), t: gl.getUniformLocation(prog, 'uT'), a: gl.getUniformLocation(prog, 'uA'), b: gl.getUniformLocation(prog, 'uB'), g: gl.getUniformLocation(prog, 'uG'), m: gl.getUniformLocation(prog, 'uM') };
    cv.parentNode.insertBefore(glcv, cv.nextSibling);
    return true;
  }
  function sizeGL() {
    const f = innerWidth < 760 ? 0.35 : 0.5;
    glcv.width = Math.max(2, Math.round(innerWidth * f)); glcv.height = Math.max(2, Math.round(innerHeight * f));
    gl.viewport(0, 0, glcv.width, glcv.height);
  }
  function drawGL() {
    gl.useProgram(prog);
    gl.uniform2f(U.res, glcv.width, glcv.height); gl.uniform1f(U.t, T);
    gl.uniform3f(U.a, AC[0] / 255, AC[1] / 255, AC[2] / 255); gl.uniform3f(U.b, AC2[0] / 255, AC2[1] / 255, AC2[2] / 255); gl.uniform3f(U.g, GL[0] / 255, GL[1] / 255, GL[2] / 255);
    gl.uniform2f(U.m, MX, -MY);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /* ---------- 2D backgrounds ---------- */
  function seed() {
    const mobile = W < 760; items = [];
    if (mode === 'silk') {
      const n = mobile ? 4 : 6;
      for (let i = 0; i < n; i++) items.push({ y: H * (0.18 + 0.68 * (i + Math.random() * 0.4) / n), a: H * R(0.05, 0.11), l: W * R(0.9, 1.6), s: R(0.05, 0.11) * (i % 2 ? -1 : 1), p: R(0, 6.28), al: R(0.07, 0.15), c: i % 3 === 0 ? AC2 : AC });
    } else if (mode === 'stars') {
      const n = mobile ? 14 : 30;
      for (let i = 0; i < n; i++) items.push({ x: R(0, W), y: R(0, H), vx: R(-7, 7), vy: R(-5, 5), r: R(1, 1.9), p: R(0, 6.28), ts: R(0.4, 1) });
    } else if (mode === 'bokeh') {
      const n = mobile ? 7 : 13;
      for (let i = 0; i < n; i++) items.push({ x: R(0, W), x0: 0, y: R(0, H), r: R(40, 120), vy: -R(5, 13), sw: R(10, 30), p: R(0, 6.28), al: R(0.05, 0.11), c: i % 2 ? AC : GL });
      items.forEach(o => { o.x0 = o.x; });
    } else if (mode === 'halo') {
      const n = mobile ? 5 : 8, rings = [], glints = [];
      for (let i = 0; i < n; i++) rings.push({ r: 0.15 + i * 0.075, dash: [R(40, 150), R(30, 120)], sp: (i % 2 ? -1 : 1) * R(0.02, 0.055), p: R(0, 6.28), al: R(0.06, 0.12) * (1 - i / (n * 1.5)), w: i % 3 === 0 ? 1.4 : 0.8, c: i % 3 === 1 ? AC2 : AC });
      for (let i = 0; i < (mobile ? 3 : 5); i++) glints.push({ ring: Math.floor(R(1, n)), a: R(0, 6.28), sp: (i % 2 ? -1 : 1) * R(0.05, 0.14) });
      items = { rings, glints };
    } else if (mode === 'drape') {
      const n = mobile ? 3 : 4;
      for (let i = 0; i < n; i++) items.push({ y: H * (0.26 + i * 0.17), a: H * R(0.05, 0.085), l: W * R(0.9, 1.5), s: R(0.035, 0.07) * (i % 2 ? -1 : 1), p: R(0, 6.28), al: R(0.035, 0.06), c: i % 2 ? AC : GL, h: H * R(0.3, 0.42) });
    } else if (mode === 'rays') {
      const beams = [], motes = [], n = mobile ? 2 : 3;
      for (let i = 0; i < n; i++) beams.push({ th: 0.42 + i * 0.30 + R(-0.05, 0.05), w: R(0.09, 0.15), s: R(0.05, 0.1) * (i % 2 ? -1 : 1), p: R(0, 6.28), al: R(0.05, 0.075) });
      for (let i = 0; i < (mobile ? 14 : 30); i++) motes.push({ x: R(0, W), y: R(0, H), vx: R(-4, 4), vy: R(-6, -1), r: R(0.7, 1.5), d: R(0.3, 1), p: R(0, 6.28) });
      items = { beams, motes };
    }
  }
  function size() {
    const dpr = W0() < 760 ? 1 : Math.min(devicePixelRatio || 1, 1.5);
    W = innerWidth; H = innerHeight; S = (mode === 'bokeh' ? 0.5 : 1) * dpr;
    cv.width = Math.max(2, Math.round(W * S)); cv.height = Math.max(2, Math.round(H * S)); seed();
  }
  function W0() { return innerWidth; }
  function draw(dt) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.scale(S, S); ctx.translate(MX * 10, MY * 7);
    ctx.setLineDash([]); ctx.globalCompositeOperation = 'source-over';
    if (mode === 'silk') {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const r of items) {
        const path = () => {
          ctx.beginPath();
          for (let x = -20; x <= W + 20; x += 14) {
            const y = r.y + r.a * Math.sin(x / r.l * 6.283 + r.p + T * r.s) + r.a * 0.4 * Math.sin(x / (r.l * 0.43) * 6.283 - r.p * 1.7 + T * r.s * 1.3);
            if (x === -20) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
        };
        path(); ctx.strokeStyle = rgba(r.c, r.al * 0.35); ctx.lineWidth = 5; ctx.stroke();
        path(); ctx.strokeStyle = rgba(r.c, r.al); ctx.lineWidth = 1.1; ctx.stroke();
      }
    } else if (mode === 'stars') {
      for (const o of items) { o.x += o.vx * dt; o.y += o.vy * dt; if (o.x < -10) o.x = W + 10; if (o.x > W + 10) o.x = -10; if (o.y < -10) o.y = H + 10; if (o.y > H + 10) o.y = -10; }
      const D = 170;
      for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
        const a = items[i], b = items[j], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < D) { ctx.strokeStyle = rgba(AC, 0.08 * (1 - d / D)); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      }
      for (const o of items) { const tw = 0.55 + 0.45 * Math.sin(T * o.ts + o.p); ctx.fillStyle = rgba(AC2, 0.22 + 0.3 * tw); ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, 6.283); ctx.fill(); }
    } else if (mode === 'bokeh') {
      for (const o of items) {
        o.y += o.vy * dt; if (o.y < -o.r) o.y = H + o.r;
        const x = o.x0 + o.sw * Math.sin(T * 0.15 + o.p);
        const g = ctx.createRadialGradient(x, o.y, 0, x, o.y, o.r);
        g.addColorStop(0, rgba(o.c, o.al)); g.addColorStop(0.6, rgba(o.c, o.al * 0.45)); g.addColorStop(1, rgba(o.c, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, o.y, o.r, 0, 6.283); ctx.fill();
      }
    } else if (mode === 'halo') {
      const mob = W < 760, unit = Math.min(W, H) * (mob ? 1.15 : 1.2);
      const cx = W * (mob ? 0.5 : 0.72) + MX * 16, cy = H * (mob ? 0.34 : 0.44) + MY * 11 - Math.min(H * 0.25, (window.scrollY || 0) * 0.04);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, unit * 0.55);
      g.addColorStop(0, rgba(GL, 0.12)); g.addColorStop(1, rgba(GL, 0)); ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, H + 40);
      const rr = items.rings;
      for (let i = 0; i < rr.length; i++) {
        const o = rr[i], rad = unit * o.r * (1 + 0.012 * Math.sin(T * 0.25 + i));
        ctx.setLineDash(o.dash); ctx.lineDashOffset = -(T * o.sp * 120 + o.p * 40);
        ctx.strokeStyle = rgba(o.c, o.al); ctx.lineWidth = o.w; ctx.beginPath(); ctx.arc(cx, cy, rad, 0, 6.283); ctx.stroke();
      }
      ctx.setLineDash([]);
      for (const gt of items.glints) {
        const o = rr[Math.min(gt.ring, rr.length - 1)], rad = unit * o.r * (1 + 0.012 * Math.sin(T * 0.25 + gt.ring)), a = gt.a + T * gt.sp;
        const x = cx + rad * Math.cos(a), y = cy + rad * Math.sin(a);
        const gg = ctx.createRadialGradient(x, y, 0, x, y, 14);
        gg.addColorStop(0, rgba(AC2, 0.55)); gg.addColorStop(1, rgba(AC2, 0));
        ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x, y, 14, 0, 6.283); ctx.fill();
      }
    } else if (mode === 'drape') {
      const sy = (window.scrollY || 0) * 0.03;
      for (const r of items) {
        const pts = []; let minY = 1e9;
        for (let x = -20; x <= W + 20; x += 16) {
          const y = r.y - sy + r.a * Math.sin(x / r.l * 6.283 + r.p + T * r.s) + r.a * 0.45 * Math.sin(x / (r.l * 0.5) * 6.283 - r.p * 1.3 + T * r.s * 1.4);
          pts.push([x, y]); if (y < minY) minY = y;
        }
        const bottom = minY + r.h + r.a * 3;
        const g = ctx.createLinearGradient(0, minY, 0, minY + r.h + r.a * 2);
        g.addColorStop(0, rgba(r.c, r.al)); g.addColorStop(1, rgba(r.c, 0));
        ctx.beginPath(); ctx.moveTo(-20, bottom); for (const p of pts) ctx.lineTo(p[0], p[1]); ctx.lineTo(W + 20, bottom); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
        ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
        ctx.strokeStyle = rgba(AC2, r.al * 1.6); ctx.lineWidth = 1; ctx.stroke();
      }
    } else if (mode === 'rays') {
      const ox = W * (W < 760 ? 0.92 : 0.88) + MX * 14, oy = -H * 0.12, Ln = Math.hypot(W, H) * 1.15;
      ctx.globalCompositeOperation = 'lighter';
      for (const b of items.beams) {
        const th = b.th + 0.05 * Math.sin(T * b.s + b.p) + MX * 0.02, w = b.w * (1 + 0.15 * Math.sin(T * b.s * 1.7 + b.p));
        const dx = -Math.sin(th), dy = Math.cos(th);
        const p1x = ox - Ln * Math.sin(th - w / 2), p1y = oy + Ln * Math.cos(th - w / 2), p2x = ox - Ln * Math.sin(th + w / 2), p2y = oy + Ln * Math.cos(th + w / 2);
        const g = ctx.createLinearGradient(ox, oy, ox + Ln * dx, oy + Ln * dy), al = b.al * (0.8 + 0.2 * Math.sin(T * 0.3 + b.p));
        g.addColorStop(0, rgba(AC2, al)); g.addColorStop(0.55, rgba(AC, al * 0.35)); g.addColorStop(1, rgba(AC, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(p1x, p1y); ctx.lineTo(p2x, p2y); ctx.closePath(); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      for (const m of items.motes) {
        m.x += m.vx * dt; m.y += m.vy * dt; if (m.y < -6) { m.y = H + 6; m.x = R(0, W); } if (m.x < -6) m.x = W + 6; if (m.x > W + 6) m.x = -6;
        const tw = 0.5 + 0.5 * Math.sin(T * 0.8 + m.p);
        ctx.fillStyle = rgba(AC2, 0.14 + 0.3 * tw * m.d); ctx.beginPath(); ctx.arc(m.x + MX * 14 * m.d, m.y + MY * 9 * m.d, m.r, 0, 6.283); ctx.fill();
      }
    }
  }
  function loop(ts) {
    raf = requestAnimationFrame(loop);
    if (document.hidden || ts - last < 33) return;
    const dt = Math.min(0.1, (ts - last) / 1000 || 0.033); last = ts; T += dt;
    const k = Math.min(1, dt * 2.2); MX += (PX - MX) * k; MY += (PY - MY) * k;
    if (mode === 'flow') drawGL(); else draw(dt);
    window.__bgStats.frames++;
  }
  function stop() { cancelAnimationFrame(raf); raf = 0; }
  const canvasOn = () => (CANVAS_MODES.includes(mode) || mode === 'flow') && html.dataset.quality !== 'light';
  function apply() {
    stop(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    window.__bgStats.mode = mode;
    if (gl) { gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); }
    if (!canvasOn()) return;
    colors();
    if (mode === 'flow') { if (!initGL()) { setMode('aurora'); return; } sizeGL(); } else size();
    if (reduce.matches) { if (mode === 'flow') drawGL(); else draw(0); return; }
    last = performance.now(); raf = requestAnimationFrame(loop);
  }
  function labels() {
    $$('#bgOpts button').forEach(b => { b.textContent = L[b.dataset.bg][isAr() ? 1 : 0]; });
    const t = $('#bgTitle'); if (t) t.textContent = L.title[isAr() ? 1 : 0];
  }
  function setMode(m, user) {
    if (!MODES.includes(m)) m = 'aurora';
    mode = m; html.dataset.bg = m; if (user) store.set('ap-bg', m);
    $$('#bgOpts button').forEach(b => { const on = b.dataset.bg === m; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    apply();
  }
  $$('#bgOpts button').forEach(b => b.addEventListener('click', () => setMode(b.dataset.bg, true)));
  document.addEventListener('langchange', labels);
  new MutationObserver(ms => {
    for (const r of ms) {
      if (r.attributeName === 'dir' || r.attributeName === 'lang') labels();
      if (r.attributeName === 'data-palette' || r.attributeName === 'data-quality') { colors(); if (CANVAS_MODES.includes(mode) || mode === 'flow') apply(); }
    }
  }).observe(html, { attributes: true });
  addEventListener('resize', () => {
    if (innerWidth === lw && Math.abs(innerHeight - lh) < 160) return;
    lw = innerWidth; lh = innerHeight;
    if (canvasOn()) { if (mode === 'flow') { sizeGL(); if (reduce.matches) drawGL(); } else { size(); if (reduce.matches) draw(0); } }
  });
  if (reduce.addEventListener) reduce.addEventListener('change', apply);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) last = performance.now(); });
  const qp = new URLSearchParams(location.search).get('bg'), saved = store.get('ap-bg');
  labels(); setMode(MODES.includes(qp) ? qp : (MODES.includes(saved) ? saved : 'aurora'));
})();
