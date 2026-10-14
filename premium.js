/* ===== One Arise — Premium layer: settings, palettes, quiet sound, hover FX ===== */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const html = document.documentElement;
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const isAr = () => html.lang === 'ar';
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

  const P = {
    ldOn: ['Enter with sound', 'ادخل مع الصوت'], ldOff: ['Enter silent', 'ادخل بصمت'], ldHint: ['Best with headphones', 'الأفضل مع سماعات الرأس'], ldStatus: ['Preparing the experience', 'جارٍ تجهيز التجربة'],
    setT: ['Settings', 'الإعدادات'], setSound: ['Sound', 'الصوت'], setQual: ['Quality', 'الجودة'], qHigh: ['High', 'عالية'], qLight: ['Light', 'خفيفة'], setPal: ['Palette', 'الألوان']
  };
  const PALS = {
    obsidian: ['Obsidian & Champagne', 'أوبسيديان وشمبانيا'], emerald: ['Emerald & Gold', 'زمرد وذهب'], oxblood: ['Oxblood & Rose Gold', 'عنابي وذهب وردي'],
    graphite: ['Graphite & Violet', 'جرافيت وبنفسجي'], titanium: ['Titanium', 'تيتانيوم']
  };
  function updatePalName() { const n = $('#palName'); if (n) n.textContent = PALS[html.dataset.palette][isAr() ? 1 : 0]; }
  function applyP() {
    $$('[data-p]').forEach(el => { const v = P[el.dataset.p]; if (v) el.textContent = v[isAr() ? 1 : 0]; });
    const sb = $('#setBtn'); if (sb) { sb.title = P.setT[isAr() ? 1 : 0]; sb.setAttribute('aria-label', P.setT[isAr() ? 1 : 0]); }
    $$('#pals button').forEach(b => { b.title = PALS[b.dataset.pal][isAr() ? 1 : 0]; });
    updatePalName();
  }

  /* ================= SOUND (synthesised, no files) ================= */
  const Sound = (() => {
    let ctx = null, master = null, dry = null, send = null, on = false, amb = null, last = 0;
    const PENT = [392, 440, 523.25, 587.33, 659.25, 783.99];
    const ready = () => on && ctx && ctx.state === 'running';
    function build() {
      if (ctx) return true;
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
      dry = ctx.createGain(); dry.gain.value = 1; dry.connect(master);
      const len = Math.floor(ctx.sampleRate * 2.4), buf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
      const conv = ctx.createConvolver(); conv.buffer = buf;
      const wet = ctx.createGain(); wet.gain.value = 0.55; conv.connect(wet); wet.connect(master); send = conv;
      return true;
    }
    const route = n => { n.connect(dry); n.connect(send); };
    function startAmbient() {
      if (amb) return; const t = ctx.currentTime;
      const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 4);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 650; lp.Q.value = 0.4;
      const oscs = [[110, 'sine', 0, 0.5], [164.81, 'triangle', 5, 0.3], [220, 'sine', -4, 0.22], [329.63, 'sine', 3, 0.08]].map(([f, ty, dt, vol]) => {
        const o = ctx.createOscillator(); o.type = ty; o.frequency.value = f; o.detune.value = dt;
        const og = ctx.createGain(); og.gain.value = vol; o.connect(og); og.connect(lp); o.start(); return o;
      });
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.05; const lg = ctx.createGain(); lg.gain.value = 220; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
      const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.037; const lg2 = ctx.createGain(); lg2.gain.value = 0.012; lfo2.connect(lg2); lg2.connect(g.gain); lfo2.start();
      const nb = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      const ns = ctx.createBufferSource(); ns.buffer = nb; ns.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 0.6;
      const ng = ctx.createGain(); ng.gain.value = 0.006; ns.connect(bp); bp.connect(ng); ng.connect(g); ns.start();
      lp.connect(g); route(g); amb = { g, nodes: [...oscs, lfo, lfo2, ns] };
    }
    function syncUI() { const sw = $('#swSound'); if (sw) sw.setAttribute('aria-checked', String(on)); }
    function setOn(v) {
      on = v; store.set('ap-sound', v ? '1' : '0'); syncUI();
      if (v) {
        if (!build()) { on = false; syncUI(); return; }
        ctx.resume(); startAmbient();
        master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(0.9, ctx.currentTime, 0.5);
      } else if (ctx) { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(0, ctx.currentTime, 0.2); }
    }
    function note(freq, dur, vol, type = 'sine', when = 0) {
      const t = ctx.currentTime + when, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); route(g); o.start(t); o.stop(t + dur + 0.05);
    }
    function tick() { if (!ready()) return; const n = performance.now(); if (n - last < 90) return; last = n; note(PENT[(Math.random() * PENT.length) | 0] * (Math.random() < 0.3 ? 0.5 : 1), 0.35, 0.011); }
    function click() { if (!ready()) return; note(523.25, 0.28, 0.022, 'triangle'); note(783.99, 0.4, 0.014, 'sine', 0.07); }
    function pop(me) { if (!ready()) return; note(me ? 659.25 : 880, 0.22, 0.014); }
    function whoosh() {
      if (!ready()) return; const t = ctx.currentTime, d = 0.9;
      const nb = ctx.createBuffer(1, Math.floor(ctx.sampleRate * d), ctx.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      const s = ctx.createBufferSource(); s.buffer = nb;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.1; bp.frequency.setValueAtTime(260, t); bp.frequency.exponentialRampToValueAtTime(1500, t + d * 0.8);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.02, t + d * 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      s.connect(bp); bp.connect(g); route(g); s.start(t);
    }
    function swell() {
      if (!ready()) return; const t = ctx.currentTime;
      [220, 329.63, 493.88].forEach((f, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.03 - i * 0.005, t + 0.9); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
        o.connect(g); route(g); o.start(t); o.stop(t + 3.4);
      });
    }
    function enter(withSound) { if (withSound) { setOn(true); if (ctx) ctx.resume().then(swell); } else setOn(false); }
    function toggle() { if (on) setOn(false); else { setOn(true); if (ctx) ctx.resume().then(click); } }
    document.addEventListener('visibilitychange', () => { if (!ctx || !on) return; master.gain.setTargetAtTime(document.hidden ? 0 : 0.9, ctx.currentTime, 0.3); });
    return { enter, toggle, tick, click, pop, whoosh, state: () => ({ on, ctx: ctx ? ctx.state : null }) };
  })();
  window.PremiumSound = Sound;

  /* hover ticks, clicks, chat pops, section whoosh */
  let lastEl = null;
  if (fine) document.addEventListener('pointerover', e => { const t = e.target.closest('a,button,.chip,.st-row,.hz-card,.tab'); if (t && t !== lastEl) { lastEl = t; Sound.tick(); } else if (!t) lastEl = null; });
  document.addEventListener('click', e => { if (e.target.closest('a,button,.chip,.tab')) Sound.click(); }, true);
  const chat = $('#chat');
  if (chat) new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
    if (n.nodeType !== 1 || n.classList.contains('typing') || n.querySelector('.typing')) return;
    Sound.pop(n.classList.contains('me') || n.classList.contains('user'));
  }))).observe(chat, { childList: true });
  const t0 = performance.now(); let lastW = 0;
  const io = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; const n = performance.now(); if (n - t0 > 3500 && n - lastW > 1800) { lastW = n; Sound.whoosh(); } }), { threshold: 0.45 });
  $$('main > section').forEach(s => io.observe(s));

  /* ================= HOVER FX (raw WebGL, no library) ================= */
  const fxs = [];
  function createFX(box, img) {
    const cv = document.createElement('canvas'); cv.className = 'fx'; cv.setAttribute('aria-hidden', 'true');
    const gl = cv.getContext('webgl2', { alpha: false, antialias: false }) || cv.getContext('webgl', { alpha: false, antialias: false }); if (!gl) return null;
    const isGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
    const VS = 'attribute vec2 p;varying vec2 v;void main(){v=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}';
    const FS = [
      '#ifdef GL_FRAGMENT_PRECISION_HIGH', 'precision highp float;', '#else', 'precision mediump float;', '#endif',
      'varying vec2 v;uniform sampler2D t;uniform vec2 res,isz,m;uniform float time,h,vel,sc,oy;',
      'vec2 cover(vec2 uv){float rs=res.x/res.y,ri=isz.x/isz.y;vec2 s=rs<ri?vec2(rs/ri,1.):vec2(1.,ri/rs);return (uv-.5)*s+.5;}',
      'void main(){',
      ' vec2 uv=(v-.5)/sc+.5; uv.y-=oy;',
      ' vec2 asp=vec2(res.x/res.y,1.);',
      ' float d=distance(uv*asp,m*asp);',
      ' float inf=smoothstep(.6,0.,d)*h;',
      ' vec2 dir=normalize((uv-m)*asp+vec2(1e-4));',
      ' float w=sin(d*26.-time*2.6)*.5+.5;',
      ' vec2 disp=dir*inf*(.0045+vel*.02)*(.4+w*.6)+vec2(sin(uv.y*8.+time*1.2),cos(uv.x*8.+time))*.0008*h;',
      ' vec2 o=1.15/res;',
      ' vec3 c0=texture2D(t,cover(uv+disp)).rgb;',
      ' vec3 bl=(texture2D(t,cover(uv+disp+vec2(o.x,0.))).rgb+texture2D(t,cover(uv+disp-vec2(o.x,0.))).rgb+texture2D(t,cover(uv+disp+vec2(0.,o.y))).rgb+texture2D(t,cover(uv+disp-vec2(0.,o.y))).rgb)*.25;',
      ' vec3 c=clamp(c0+(c0-bl)*.6,0.,1.);',
      ' c+=inf*.04;',
      ' gl_FragColor=vec4(c,1.);}'
    ].join('\n');
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; } return s; };
    const vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS); if (!vs || !fs) return null;
    const pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null; gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = {}; ['t', 'res', 'isz', 'm', 'time', 'h', 'vel', 'sc', 'oy'].forEach(n => U[n] = gl.getUniformLocation(pr, n));
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    let ready = false, isz = [1, 1];
    const im = new Image(); im.onload = () => { gl.bindTexture(gl.TEXTURE_2D, tex); let srcTex = im;
      if (!isGL2) { const pot = n => { let p = 1; while (p < n) p <<= 1; return p; }; const c2 = document.createElement('canvas'); c2.width = Math.min(2048, pot(im.naturalWidth)); c2.height = Math.min(2048, pot(im.naturalHeight)); const x2 = c2.getContext('2d'); x2.imageSmoothingEnabled = true; x2.imageSmoothingQuality = 'high'; x2.drawImage(im, 0, 0, c2.width, c2.height); srcTex = c2; }
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, srcTex);
      gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      const ax = gl.getExtension('EXT_texture_filter_anisotropic'); if (ax) gl.texParameterf(gl.TEXTURE_2D, ax.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(ax.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
      isz = [im.naturalWidth, im.naturalHeight]; ready = true; }; im.src = img.currentSrc || img.src;
    box.appendChild(cv);
    let target = 0, h = 0, mx = 0.5, my = 0.5, tx = 0.5, ty = 0.5, vel = 0, raf = 0, running = false;
    function size() { const r = box.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2); cv.width = Math.max(2, Math.round(r.width * d)); cv.height = Math.max(2, Math.round(r.height * d)); gl.viewport(0, 0, cv.width, cv.height); }
    function pos(e) { const r = box.getBoundingClientRect(), nx = (e.clientX - r.left) / r.width, ny = (e.clientY - r.top) / r.height; vel = Math.min(1, vel + Math.hypot(nx - tx, ny - ty) * 3); tx = nx; ty = ny; }
    function frame() {
      h += (target - h) * 0.09; mx += (tx - mx) * 0.14; my += (ty - my) * 0.14; vel *= 0.9;
      if (ready) {
        const sc = (window.gsap ? +gsap.getProperty(img, 'scale') : 1) || 1, oy = (window.gsap ? +gsap.getProperty(img, 'yPercent') : 0) / 100 || 0;
        gl.uniform1i(U.t, 0); gl.uniform2f(U.res, cv.width, cv.height); gl.uniform2f(U.isz, isz[0], isz[1]); gl.uniform2f(U.m, mx, my);
        gl.uniform1f(U.time, performance.now() / 1000); gl.uniform1f(U.h, h); gl.uniform1f(U.vel, vel); gl.uniform1f(U.sc, sc); gl.uniform1f(U.oy, oy);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); if (target > 0) cv.classList.add('on');
      }
      if (target === 0 && h < 0.003) { cv.classList.remove('on'); running = false; return; }
      raf = requestAnimationFrame(frame);
    }
    const go = () => { if (!running) { running = true; raf = requestAnimationFrame(frame); } };
    return {
      cv, enter(e) { size(); tx = mx = (e.clientX - box.getBoundingClientRect().left) / box.getBoundingClientRect().width; ty = my = (e.clientY - box.getBoundingClientRect().top) / box.getBoundingClientRect().height; target = 1; go(); },
      move: pos, leave() { target = 0; go(); },
      dispose() { cancelAnimationFrame(raf); cv.remove(); const x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); }
    };
  }
  function disposeFX() { fxs.splice(0).forEach(f => f.dispose()); $$('.hz-pic, .cta-img').forEach(b => { b._fx = null; }); }
  function initFX() {
    if (!fine) return;
    $$('.hz-pic, .cta-img').forEach(box => {
      const img = $('img', box); if (!img) return;
      box.addEventListener('pointerenter', e => {
        if (html.dataset.quality !== 'high') return;
        if (!box._fx) { box._fx = createFX(box, img); if (!box._fx) return; fxs.push(box._fx); }
        box._fx.enter(e);
      });
      box.addEventListener('pointermove', e => box._fx && box._fx.move(e));
      box.addEventListener('pointerleave', () => box._fx && box._fx.leave());
    });
  }

  /* ================= settings, palette, quality ================= */
  function setPalette(p, user) {
    if (!PALS[p]) p = 'obsidian';
    html.dataset.palette = p; store.set('ap-palette', p);
    $$('#pals button').forEach(b => b.classList.toggle('on', b.dataset.pal === p));
    $$('img[data-img]').forEach(img => { const s = './assets/' + p + '/' + img.dataset.img + '?v=hd2'; if (img.getAttribute('src') !== s) img.setAttribute('src', s); });
    disposeFX(); updatePalName();
    try { const m = $('meta[name="theme-color"]'); const c = getComputedStyle(html).getPropertyValue('--bg').trim(); if (m && c) m.content = c; } catch (e) {}
  }
  function setQuality(q, user) {
    html.dataset.quality = q; if (user) store.set('ap-quality', q);
    $$('#segQual button').forEach(b => b.classList.toggle('on', b.dataset.q === q));
    if (q !== 'high') disposeFX();
  }
  const btn = $('#setBtn'), panel = $('#setPanel');
  const closePanel = () => { if (panel && !panel.hidden) { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); } };
  if (btn && panel) {
    btn.addEventListener('click', e => { e.stopPropagation(); const open = panel.hidden; panel.hidden = !open; btn.setAttribute('aria-expanded', String(open)); });
    document.addEventListener('click', e => { if (!e.target.closest('.set-wrap')) closePanel(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closePanel(); });
    $('#swSound').addEventListener('click', () => Sound.toggle());
    $$('#segQual button').forEach(b => b.addEventListener('click', () => setQuality(b.dataset.q, true)));
    $$('#pals button').forEach(b => b.addEventListener('click', () => setPalette(b.dataset.pal, true)));
  }
  setPalette(html.dataset.palette || 'obsidian'); setQuality(html.dataset.quality || 'high');
  applyP(); initFX();
  document.addEventListener('langchange', applyP);
  window.PremiumDebug = { fx: () => fxs.length };
})();


/* ================= cards: reveal, tilt and spotlight ================= */
(function () {
  const html = document.documentElement;
  html.classList.add('cards-js');
  let io = null;
  function initCards() {
    if (io) io.disconnect();
    io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      const c = e.target; io.unobserve(c); c.classList.add('in');
      const d = (parseFloat(getComputedStyle(c).getPropertyValue('--i')) || 0) * 90;
      setTimeout(() => c.classList.add('done'), 1300 + d);
    }), { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
    document.querySelectorAll('.acard, .scard').forEach(c => { if (!c.classList.contains('in')) io.observe(c); });
  }
  initCards();
  document.addEventListener('langchange', () => setTimeout(initCards, 80));
  if (!matchMedia('(hover:hover) and (pointer:fine)').matches || matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  let cur = null;
  const reset = c => { c.classList.remove('tilt'); c.style.transform = ''; };
  document.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const c = e.target.closest ? e.target.closest('.acard, .scard') : null;
    if (cur && cur !== c) { reset(cur); cur = null; }
    if (!c) return;
    cur = c;
    const r = c.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    c.style.setProperty('--mx', x + 'px'); c.style.setProperty('--my', y + 'px');
    if (html.dataset.quality === 'low' || !c.classList.contains('done')) return;
    c.classList.add('tilt');
    c.style.transform = 'perspective(900px) rotateX(' + ((0.5 - y / r.height) * 8).toFixed(2) + 'deg) rotateY(' + ((x / r.width - 0.5) * 10).toFixed(2) + 'deg) translateY(-4px)';
  });
  document.addEventListener('pointerout', e => { if (!e.relatedTarget && cur) { reset(cur); cur = null; } });
})();
