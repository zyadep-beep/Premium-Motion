/* Calm animated backgrounds. Choose in Settings > Background, or add ?bg=aurora|silk|stars|bokeh|grid|off to the address. */
(function () {
  'use strict';
  const html = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  const MODES = ['aurora', 'silk', 'stars', 'bokeh', 'grid', 'off'];
  const CANVAS_MODES = ['silk', 'stars', 'bokeh'];
  const L = { aurora: ['Aurora', 'شفق'], silk: ['Silk', 'حرير'], stars: ['Stars', 'نجوم'], bokeh: ['Bokeh', 'ضوء ناعم'], grid: ['Grid', 'شبكة'], off: ['Off', 'بدون'], title: ['Background', 'الخلفية'] };
  const isAr = () => html.dir === 'rtl';
  const cv = $('#bgCv'); const ctx = cv && cv.getContext('2d');
  if (!cv || !ctx) return;
  const reduce = matchMedia('(prefers-reduced-motion:reduce)');
  let mode = 'aurora', W = 0, H = 0, S = 1, raf = 0, last = 0, T = 0, items = [], lw = innerWidth, lh = innerHeight;
  let AC = [207, 174, 106], AC2 = [236, 215, 164], GL = [120, 86, 34];
  window.__bgStats = { frames: 0, mode: '' };
  const num = v => getComputedStyle(html).getPropertyValue(v).split(',').map(s => parseFloat(s));
  function colors() {
    const a = num('--ac-rgb'), b = num('--ac2-rgb'), g = num('--glow-rgb');
    if (a.length === 3 && !a.some(isNaN)) AC = a; if (b.length === 3 && !b.some(isNaN)) AC2 = b; if (g.length === 3 && !g.some(isNaN)) GL = g;
  }
  const rgba = (c, a) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  const R = (a, b) => a + Math.random() * (b - a);
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
    }
  }
  function size() {
    const dpr = W0() < 760 ? 1 : Math.min(devicePixelRatio || 1, 1.5);
    W = innerWidth; H = innerHeight; S = (mode === 'bokeh' ? 0.5 : 1) * dpr;
    cv.width = Math.max(2, Math.round(W * S)); cv.height = Math.max(2, Math.round(H * S)); seed();
  }
  function W0() { return innerWidth; }
  function draw(dt) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.scale(S, S);
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
    }
  }
  function loop(ts) {
    raf = requestAnimationFrame(loop);
    if (document.hidden || ts - last < 33) return;
    const dt = Math.min(0.1, (ts - last) / 1000 || 0.033); last = ts; T += dt;
    draw(dt); window.__bgStats.frames++;
  }
  function stop() { cancelAnimationFrame(raf); raf = 0; }
  const canvasOn = () => CANVAS_MODES.includes(mode) && html.dataset.quality !== 'light';
  function apply() {
    stop(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    window.__bgStats.mode = mode;
    if (!canvasOn()) return;
    colors(); size();
    if (reduce.matches) { draw(0); return; }
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
      if (r.attributeName === 'data-palette' || r.attributeName === 'data-quality') { colors(); if (CANVAS_MODES.includes(mode)) apply(); }
    }
  }).observe(html, { attributes: true });
  addEventListener('resize', () => {
    if (innerWidth === lw && Math.abs(innerHeight - lh) < 160) return;
    lw = innerWidth; lh = innerHeight;
    if (canvasOn()) { size(); if (reduce.matches) draw(0); }
  });
  if (reduce.addEventListener) reduce.addEventListener('change', apply);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) last = performance.now(); });
  const qp = new URLSearchParams(location.search).get('bg'), saved = store.get('ap-bg');
  labels(); setMode(MODES.includes(qp) ? qp : (MODES.includes(saved) ? saved : 'aurora'));
})();
