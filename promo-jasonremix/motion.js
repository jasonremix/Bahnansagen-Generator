/* Motion-Engine für das jasonremix.de-Video.
 * Alles wird aus der Zeit t berechnet (kein Zustand zwischen Frames),
 * deshalb kann der Renderer jeden Frame einzeln und in beliebiger Reihenfolge abrufen.
 * window.setup() einmal nach dem Laden der Schriften, danach window.seek(t).
 */
(() => {
const TL = window.TL, W = 1920, H = 1080, BEAT = 60 / TL.bpm;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------- Mathe & Easing ---------- */
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, p) => a + (b - a) * p;
const prog = (t, t0, d) => clamp((t - t0) / d);
const outExpo = p => p >= 1 ? 1 : 1 - Math.pow(2, -10 * p);
const outCubic = p => 1 - Math.pow(1 - p, 3);
const inCubic = p => p * p * p;
const inOutCubic = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
const outBack = (p, s = 1.7) => 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2);
const spring = p => p >= 1 ? 1 : 1 - Math.exp(-6.5 * p) * Math.cos(11 * p);   // gedämpfte Feder
const hash = (...n) => { let h = 2166136261; for (const v of n) { h ^= Math.floor(v * 1000) | 0; h = Math.imul(h, 16777619); h ^= h >>> 13; } return ((h >>> 0) % 100000) / 100000; };
const GLYPHS = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789#%&@$/<>*+=';

/* ---------- Text zerlegen ---------- */
function splitChars(el) {
  const chars = [];
  const walk = node => {
    [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          const w = document.createElement('span'); w.className = 'word';
          [...part].forEach(c => {
            const s = document.createElement('span'); s.className = 'ch'; s.textContent = c; s.dataset.c = c;
            w.appendChild(s); chars.push(s);
          });
          frag.appendChild(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== 'BR' && n.tagName !== 'svg') walk(n);
    });
  };
  walk(el);
  return chars;
}
function splitWords(el) {
  const masks = [];
  const walk = node => {
    [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          const m = document.createElement('span'); m.className = 'mask';
          const i = document.createElement('span'); i.textContent = part; m.appendChild(i);
          frag.appendChild(m); masks.push(m);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
    });
  };
  walk(el);
  return masks;
}
// Zeichenbreiten einfrieren, damit Glitch-Glyphen das Layout nicht verschieben
const freeze = chars => chars.forEach(c => { c.style.width = c.getBoundingClientRect().width + 'px'; c.style.textAlign = 'center'; });
function fit(el, maxW) {
  let fs = parseFloat(getComputedStyle(el).fontSize);
  el.style.whiteSpace = 'nowrap'; el.style.display = 'inline-block';
  while (el.scrollWidth > maxW && fs > 20) { fs -= 2; el.style.fontSize = fs + 'px'; }
}

/* ---------- Textanimationen ---------- */
// kind: rise | slam | decode | flip | drop
function chars(list, t, o) {
  const st0 = o.t0, stg = o.stagger ?? .03, dur = o.dur ?? .6;
  list.forEach((c, i) => {
    let op = 1, x = 0, y = 0, s = 1, b = 0, rx = 0, rz = 0, glyph = null;
    const st = st0 + i * stg, p = prog(t, st, dur);
    if (t < st) op = 0;
    else {
      const e = outExpo(p);
      switch (o.kind) {
        case 'rise': op = clamp(p * 2.4); y = (1 - e) * (o.y ?? 60); b = (1 - e) * (o.blur ?? 14); rx = (1 - e) * -75; break;
        case 'slam': op = clamp(p * 3.2); s = lerp(o.scale ?? 2.6, 1, e); b = (1 - e) * (o.blur ?? 28); y = (1 - e) * -20; break;
        case 'decode': op = clamp(p * 5); y = (1 - e) * 10; b = (1 - e) * 5;
          if (p < .62 && c.dataset.c.trim()) glyph = GLYPHS[Math.floor(hash(i, Math.floor(t * 30), 7) * GLYPHS.length)]; break;
        case 'flip': op = clamp(p * 3); rx = (1 - spring(p)) * 100; y = (1 - e) * 20; break;
        case 'drop': op = clamp(p * 3); y = (1 - spring(p)) * -90; rz = (1 - e) * (hash(i, 3) - .5) * 40; b = (1 - e) * 8; break;
      }
    }
    if (o.out != null) {
      const q = prog(t, o.out + i * (o.outStagger ?? .012), o.outDur ?? .32), e = inCubic(q);
      op *= 1 - q; y -= e * (o.outY ?? 50); b += e * 14; s *= 1 + e * .2;
    }
    c.style.opacity = op;
    c.style.transform = `perspective(700px) translate(${x}px,${y}px) scale(${s}) rotateX(${rx}deg) rotate(${rz}deg)`;
    c.style.filter = b > .15 ? `blur(${b.toFixed(2)}px)` : 'none';
    const txt = glyph ?? c.dataset.c;
    if (c.textContent !== txt) c.textContent = txt;
    c.style.color = glyph ? '#ff3a3a' : '';
  });
}
function words(masks, t, t0, o = {}) {
  const stg = o.stagger ?? .07, dur = o.dur ?? .75;
  masks.forEach((m, i) => {
    const p = prog(t, t0 + i * stg, dur), e = outExpo(p), inner = m.firstChild;
    inner.style.transform = `translateY(${(1 - e) * 115}%) rotate(${(1 - e) * 7}deg)`;
    inner.style.opacity = p > 0 ? 1 : 0;
    m.style.clipPath = p >= 1 ? 'none' : 'inset(-2em -1em 0 -1em)';
    if (o.out != null) { const q = prog(t, o.out + i * .02, .3); m.style.opacity = 1 - q; m.style.filter = q > 0 ? `blur(${q * 10}px)` : 'none'; }
  });
}
function scramble(el, t, t0, dur = .7) {
  const full = el.dataset.full ?? (el.dataset.full = el.textContent);
  if (t < t0) { el.style.opacity = 0; return; }
  el.style.opacity = 1;
  const p = prog(t, t0, dur), n = full.length, done = Math.floor(p * n);
  let s = '';
  for (let i = 0; i < n; i++) {
    if (i < done || full[i] === ' ') s += full[i];
    else if (i < done + 6) s += GLYPHS[Math.floor(hash(i, Math.floor(t * 30)) * GLYPHS.length)];
  }
  el.textContent = s;
}
function pop(el, t, t0, o = {}) {
  const p = prog(t, t0, o.dur ?? .7), e = outExpo(p), sp = outBack(clamp(p * 1.25), 1.4);
  el.style.opacity = t < t0 ? 0 : clamp(p * 2.5);
  el.style.transform = `perspective(1200px) translate(${(1 - e) * (o.x ?? 0)}px,${(1 - e) * (o.y ?? 70)}px) scale(${lerp(o.s ?? .9, 1, sp)}) rotateX(${(1 - e) * (o.rx ?? 18)}deg)` + (o.extra ?? '');
  el.style.filter = p < 1 ? `blur(${(1 - e) * (o.blur ?? 12)}px)` : 'none';
  return p;
}
function trace(el, t, t0, dur = 1.1) {
  const r = el.querySelector('.trace rect'); if (!r) return;
  const p = outCubic(prog(t, t0, dur));
  r.style.strokeDasharray = '1000'; r.style.strokeDashoffset = 1000 * (1 - p);
  r.style.opacity = lerp(1, .35, prog(t, t0 + dur, .8));
}
function addTrace(el, rx = 26) {
  const w = el.offsetWidth, h = el.offsetHeight;
  el.insertAdjacentHTML('beforeend', `<svg class="trace" width="${w}" height="${h}" style="left:0;top:0"><rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="${rx}" pathLength="1000"/></svg>`);
}

/* ---------- Szenen-Hilfen ---------- */
const S = {}; TL.scenes.forEach((s, i) => { s.idx = i; S[s.id] = s; });
const L = (id, i) => S[id].lines[i].t - S[id].t;                // Satzanfang, lokal
const LE = (id, i) => L(id, i) + S[id].lines[i].d;              // Satzende, lokal
function cue(id, i, sub, off = 0) {                             // Zeitpunkt eines Worts im Satz
  const ln = S[id].lines[i], k = ln.text.indexOf(sub);
  return ln.t - S[id].t + ln.d * (k < 0 ? 0 : k / ln.text.length) + off;
}
let kickEnv = 0, gT = 0;
function kickAt(t) {
  const k = TL.kicks; let lo = 0, hi = k.length - 1, last = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (k[m] <= t) { last = m; lo = m + 1; } else hi = m - 1; }
  return last < 0 ? 0 : Math.exp(-(t - k[last]) * 9);
}
const ICONS = {
  mic: '<svg viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8"/></svg>',
  wave: '<svg viewBox="0 0 24 24"><path d="M2 12h2M6 8v8M10 4v16M14 7v10M18 10v4M22 12h0"/></svg>',
  bolt: '<svg viewBox="0 0 24 24"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
  cal: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>',
  disc: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/></svg>',
  ball: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c3 3 3 13 0 16M12 4c-3 3-3 13 0 16"/></svg>',
  case: '<svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/></svg>',
  sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/></svg>',
  party: '<svg viewBox="0 0 24 24"><path d="M3 21 8 8l8 8z"/><path d="M14 4l1 2M19 9l2-1M18 4l-1 3"/></svg>',
  note: '<svg viewBox="0 0 24 24"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>',
  crown: '<svg viewBox="0 0 24 24"><path d="m3 8 4 4 5-7 5 7 4-4-2 11H5z"/></svg>',
};

/* ---------- Hintergrund ---------- */
const cv = $('#bg'), g = cv.getContext('2d');
const EMBERS = Array.from({ length: 110 }, (_, i) => ({ x: hash(i, 1) * W, sp: 30 + hash(i, 2) * 90, off: hash(i, 3) * 2000, r: .8 + hash(i, 4) * 2.4, sw: hash(i, 5) * 6.28, a: .25 + hash(i, 6) * .6 }));
function drawBG(t, env, amp) {
  g.globalCompositeOperation = 'source-over'; g.fillStyle = '#050505'; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'lighter';
  [[.18, .25, 820, .14], [.84, .62, 900, .12], [.5, 1.0, 1000, .17]].forEach(([bx, by, r, a], i) => {
    const x = W * (bx + .07 * Math.sin(t * .23 + i * 2.1)), y = H * (by + .05 * Math.cos(t * .19 + i));
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(255,${i === 1 ? 30 : 0},0,${a * (.75 + .55 * env) * amp.blob})`); gr.addColorStop(1, 'rgba(255,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  });
  // Bühnenlicht von oben
  for (let i = 0; i < 4; i++) {
    const ox = W * (.12 + .25 * i), ang = Math.sin(t * .45 + i * 1.9) * .42 + (i < 2 ? .12 : -.12), len = 1500, hw = .07;
    const gr = g.createLinearGradient(ox, -40, ox + Math.sin(ang) * len, Math.cos(ang) * len);
    gr.addColorStop(0, `rgba(255,60,60,${.11 * (.55 + env) * amp.beam})`); gr.addColorStop(1, 'rgba(255,0,0,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(ox, -40);
    g.lineTo(ox + Math.sin(ang - hw) * len, Math.cos(ang - hw) * len); g.lineTo(ox + Math.sin(ang + hw) * len, Math.cos(ang + hw) * len); g.fill();
  }
  // Perspektivisches Gitter, eine Linie pro Beat
  if (amp.grid > 0) {
    const hz = H * .64, vx = W / 2, ph = (t / BEAT) % 1;
    g.lineWidth = 1.4;
    for (let k = -22; k <= 22; k++) {
      g.strokeStyle = `rgba(255,40,40,${.16 * amp.grid})`;
      g.beginPath(); g.moveTo(vx + k * 10, hz); g.lineTo(vx + k * 240, H + 20); g.stroke();
    }
    for (let j = 0; j < 16; j++) {
      const d = j + 1 - ph, y = hz + 430 / d;
      if (y > H + 10) continue;
      const a = Math.min(.5, .55 / Math.sqrt(d)) * amp.grid * (.7 + .5 * env);
      g.strokeStyle = `rgba(255,50,50,${a})`; g.lineWidth = 1.6; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
      g.strokeStyle = `rgba(255,0,0,${a * .25})`; g.lineWidth = 7; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
    }
    g.globalCompositeOperation = 'source-over';
    const fade = g.createLinearGradient(0, hz - 2, 0, hz + 260);
    fade.addColorStop(0, 'rgba(5,5,5,1)'); fade.addColorStop(1, 'rgba(5,5,5,0)');
    g.fillStyle = fade; g.fillRect(0, hz - 2, W, 262);
    g.fillStyle = '#050505'; g.fillRect(0, 0, W, hz - 1);
    g.globalCompositeOperation = 'lighter';
    const hg = g.createLinearGradient(0, 0, W, 0);
    hg.addColorStop(0, 'rgba(255,0,0,0)'); hg.addColorStop(.5, `rgba(255,40,40,${.55 * amp.grid * (.6 + .6 * env)})`); hg.addColorStop(1, 'rgba(255,0,0,0)');
    g.fillStyle = hg; g.fillRect(0, hz - 1, W, 2);
    g.fillStyle = hg; g.globalAlpha = .25; g.fillRect(0, hz - 14, W, 28); g.globalAlpha = 1;
    // Blobs nach dem Abdunkeln noch einmal schwach darüber, damit der Himmel nicht tot wirkt
    const gr = g.createRadialGradient(W / 2, hz, 0, W / 2, hz, 900);
    gr.addColorStop(0, `rgba(255,0,0,${.16 * amp.blob * (.7 + .5 * env)})`); gr.addColorStop(1, 'rgba(255,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }
  // Glut-Partikel
  EMBERS.forEach((e, i) => {
    const y = H + 40 - ((t * e.sp + e.off) % (H + 80)), x = e.x + Math.sin(t * .8 + e.sw) * 30;
    const a = e.a * amp.ember * (.6 + .4 * Math.sin(t * 3 + i));
    g.fillStyle = `rgba(255,${80 + (i % 3) * 30},40,${a * .25})`; g.beginPath(); g.arc(x, y, e.r * 4, 0, 6.283); g.fill();
    g.fillStyle = `rgba(255,${120 + (i % 3) * 40},90,${a})`; g.beginPath(); g.arc(x, y, e.r, 0, 6.283); g.fill();
  });
  g.globalCompositeOperation = 'source-over';
}

/* ---------- Prozedurale Cover ---------- */
function drawArt(c, seed, t) {
  const x = c.getContext('2d'), w = c.width, h = c.height, cx = w / 2, cy = h / 2;
  x.fillStyle = '#0a0a0a'; x.fillRect(0, 0, w, h);
  x.globalCompositeOperation = 'lighter';
  const gr = x.createRadialGradient(cx * (.6 + hash(seed, 1) * .8), cy * (.6 + hash(seed, 2) * .8), 0, cx, cy, w * .8);
  gr.addColorStop(0, `rgba(255,${Math.floor(hash(seed, 3) * 60)},0,.75)`); gr.addColorStop(1, 'rgba(60,0,0,0)');
  x.fillStyle = gr; x.fillRect(0, 0, w, h);
  const rings = 5 + Math.floor(hash(seed, 4) * 8);
  for (let i = 0; i < rings; i++) {
    x.strokeStyle = `rgba(255,${60 + i * 12},${40 + i * 10},${.12 + .5 * hash(seed, i + 9)})`; x.lineWidth = 1 + hash(seed, i + 20) * 4;
    const a0 = t * (.3 + hash(seed, i) * .6) * (i % 2 ? 1 : -1) + hash(seed, i + 30) * 6;
    x.beginPath(); x.arc(cx, cy, w * (.12 + i * .045), a0, a0 + 1.5 + hash(seed, i + 40) * 3.5); x.stroke();
  }
  // Wellenform
  x.strokeStyle = 'rgba(255,255,255,.85)'; x.lineWidth = 2; x.beginPath();
  for (let i = 0; i <= 60; i++) {
    const px = w * .15 + i * (w * .7 / 60), amp = Math.sin(i / 60 * Math.PI) * h * .12 * (.4 + hash(seed, i, Math.floor(t * 10)) * .8);
    x.lineTo(px, cy + (i % 2 ? amp : -amp));
  }
  x.stroke(); x.globalCompositeOperation = 'source-over';
}

/* ---------- Szenen ---------- */
const scenes = {};
const sc = id => $('#s-' + id);

scenes.intro = {
  init() { this.roles = splitChars($('#roles')); },
  update(lt, env) {
    const drop = TL.drop, d = prog(lt, drop, .9), e = outExpo(d);
    const fl = $('#flare'), pre = prog(lt, .1, drop - .1);
    fl.style.transform = `scaleX(${lt < drop ? inCubic(pre) : 1 + e * .6}) scaleY(${lt < drop ? 1 : 1 + e * 6})`;
    fl.style.opacity = lt < drop ? pre : 1 - prog(lt, drop, .5);
    const logo = $('#logoWrap');
    logo.style.opacity = lt < drop ? 0 : clamp(d * 3);
    logo.style.transform = `translateY(${Math.sin(lt * 1.3) * 6}px) scale(${lerp(1.35, 1, e) * (1 + env * .012)})`;
    logo.style.filter = d < 1 ? `blur(${(1 - e) * 26}px) brightness(${1 + (1 - e) * 2})` : `drop-shadow(0 0 ${18 * (.6 + env)}px rgba(255,0,0,.55))`;
    const sw = $('#logoSweep'), s1 = prog(lt, drop + .5, 1.1), s2 = prog(lt, L('intro', 1) + 1.2, 1.1);
    const sp = s1 < 1 ? s1 : s2;
    sw.style.backgroundPosition = `${lerp(130, -30, inOutCubic(sp))}% 0`;
    sw.style.opacity = (s1 > 0 && s1 < 1) || (s2 > 0 && s2 < 1) ? .9 : 0;
    const r = $('#rays');
    r.style.opacity = lt < drop ? pre * .3 : lerp(1.4, .55, outCubic(prog(lt, drop, 1.6))) * (.8 + env * .5);
    r.style.transform = `rotate(${lt * 7}deg) scale(${1 + env * .03})`;
    chars(this.roles, lt, { kind: 'decode', t0: L('intro', 1), stagger: .028, dur: .4 });
  }
};

scenes.tagline = {
  init() {
    this.g = [0, 1, 2].map(i => {
      const el = $('#tg' + i), big = $('.big', el); fit(big, 1700);
      return { el, small: splitChars($('.small', el)), big: splitChars(big) };
    });
    freeze(this.g.flatMap(x => x.small));
  },
  update(lt, env) {
    this.g.forEach((gp, i) => {
      const t0 = L('tagline', i) - .12, t1 = i < 2 ? L('tagline', i + 1) - .3 : null;
      gp.el.style.display = lt >= t0 - .05 && (t1 == null || lt < t1 + .5) ? '' : 'none';
      chars(gp.small, lt, { kind: 'decode', t0, stagger: .025, dur: .35, out: t1 });
      chars(gp.big, lt, { kind: 'slam', t0: t0 + .14, stagger: .035, dur: .55, out: t1 != null ? t1 + .04 : null, outStagger: .008 });
      const sh = Math.exp(-Math.max(0, lt - t0 - .2) * 12) * (lt > t0 + .2 ? 1 : 0);
      gp.el.style.transform = `translate(${(hash(i, Math.floor(lt * 60)) - .5) * 16 * sh}px,${(hash(i, 9, Math.floor(lt * 60)) - .5) * 12 * sh}px)`;
    });
    const m = $('#marq'); m.style.transform = `translateX(${-200 - lt * 160}px)`;
    m.style.opacity = .3 + env * .25;
  }
};

scenes.about = {
  init() {
    this.cap = splitChars($('#portrait .cap b'));
    this.h = splitWords($('#s-about .h2'));
    this.loc = splitChars($('#loc span'));
  },
  update(lt, env) {
    const P = $('#portrait'), rp = outExpo(prog(lt, .15, 1.1));
    P.style.clipPath = `inset(${(1 - rp) * 100}% 0 0 0 round 30px)`;
    P.style.transform = `translateY(${(1 - rp) * 60}px)`;
    $('#portrait img').style.transform = `translate(-50%,-50%) scale(${lerp(1.3, 1.06, outCubic(prog(lt, 0, S.about.d)))})`;
    $('#portrait .scan').style.top = `${((lt * 260) % 1000) - 160}px`;
    trace(P, lt, .4, 1.6);
    chars(this.cap, lt, { kind: 'rise', t0: 1.0, stagger: .03, dur: .6 });
    scramble($('#s-about .eyebrow'), lt, .2);
    words(this.h, lt, .45);
    const lc = cue('about', 0, 'Brandenburg', -.25);
    pop($('#loc svg'), lt, lc, { y: -40, s: .3, rx: 0, dur: .6 });
    chars(this.loc, lt, { kind: 'rise', t0: lc + .1, stagger: .025, dur: .55 });
    const a = L('about', 1), b = L('about', 2);
    pop($('#st12'), lt, a - .1); trace($('#st12'), lt, a, 1.2);
    pop($('#st23'), lt, b - .1); trace($('#st23'), lt, b, 1.2);
    const n12 = $('#st12 .num'); n12.textContent = Math.round(12 * outCubic(prog(lt, a, 1.0)));
    // Ziffern rollen wie ein Zählwerk ein
    const n23 = $('#st23 .num'), rp2 = prog(lt, b, 1.3);
    n23.textContent = [...'2023'].map((dg, i) => {
      const q = prog(rp2, i * .12, .55);
      return q >= 1 ? dg : String(Math.floor(hash(i, Math.floor(lt * 24)) * 10));
    }).join('');
    $$('#s-about .num').forEach(n => n.style.transform = `scale(${1 + env * .03})`);
  }
};

scenes.why = {
  data: [['mic', 'Professionelle Live-Auftritte', 'Energiegeladene DJ-Sets für Festivals, Clubs und Events'],
         ['wave', 'Eigene Musik&shy;produktionen', 'Original-Tracks und emotionale Remixe'],
         ['bolt', 'Moderner Hardtechno-Sound', 'Hardtechno, Techno und elektronische Musik'],
         ['cal', 'Buchbar für jedes Event', 'Festival, Club, Firmenfeier oder private Party']],
  init() {
    const box = $('#whyCards');
    box.innerHTML = this.data.map(([ic, h, p], i) => `<div class="panel card"><div class="icon">${ICONS[ic]}</div><span class="idx">0${i + 1}</span><h3>${h}</h3><p>${p}</p></div>`).join('');
    this.cards = $$('.card', box); this.cards.forEach(c => addTrace(c));
    this.hs = this.cards.map(c => splitChars($('h3', c)));
    this.h = splitWords($('#s-why .h1'));
    this.cues = [cue('why', 1, 'Professionelle', -.15), cue('why', 1, 'Eigene', -.15), cue('why', 1, 'Moderner', -.15), L('why', 2) - .1];
  },
  update(lt, env) {
    scramble($('#s-why .eyebrow'), lt, .2);
    words(this.h, lt, .4, { stagger: .06 });
    let act = -1; this.cues.forEach((c, i) => { if (lt >= c) act = i; });
    this.cards.forEach((c, i) => {
      const p = pop(c, lt, this.cues[i], { y: 110, rx: 35, s: .86, dur: .8,
        extra: ` translateY(${i === act ? -14 : 0}px)` });
      trace(c, lt, this.cues[i] + .1, 1.0);
      const ic = $('.icon', c), q = outBack(prog(lt, this.cues[i] + .15, .5), 2.2);
      ic.style.transform = `scale(${q}) rotate(${(1 - q) * -40}deg)`;
      chars(this.hs[i], lt, { kind: 'rise', t0: this.cues[i] + .2, stagger: .018, dur: .5, y: 30 });
      $('p', c).style.opacity = prog(lt, this.cues[i] + .5, .5);
      c.style.boxShadow = i === act ? `0 0 ${40 + 40 * env}px rgba(255,0,0,.35),0 30px 80px rgba(0,0,0,.55)` : '';
      c.style.borderColor = i === act ? 'rgba(255,60,60,.5)' : '';
    });
  }
};

scenes.music = {
  plats: ['Spotify', 'Apple Music', 'YouTube', 'SoundCloud', 'TikTok', 'Amazon Music'],
  tracks: [['Wolke 7', 'Single'], ['Distanz', 'Single'], ['Monster', 'Single'], ['Papa Pinguin', 'Single'], ['Sound of Silence', 'Remix']],
  init() {
    $('#plat').innerHTML = this.plats.map(p => `<div class="chip"><i></i>${p}</div>`).join('');
    $('#rows').innerHTML = this.tracks.map(([n, s], i) => `<div class="row"><span class="n">0${i + 1}</span><span class="tt">${n}<small>Jason Remix · ${s}</small></span><span class="bars">${'<span></span>'.repeat(14)}</span></div>`).join('');
    $('#peq').innerHTML = '<span></span>'.repeat(6);
    this.h = splitWords($('#s-music .h1'));
    this.pc = this.plats.map(p => cue('music', 0, p.split(' ')[0], -.1));
    this.tc = this.tracks.map(([n]) => cue('music', 1, n.split(' ')[0], -.1));
  },
  update(lt, env, t) {
    scramble($('#s-music .eyebrow'), lt, .2);
    words(this.h, lt, .4);
    $$('#plat .chip').forEach((c, i) => pop(c, lt, this.pc[i], { y: 50, s: .6, rx: 0, dur: .6 }));
    const pl = $('#player'), pp = pop(pl, lt, .55, { x: 180, y: 0, rx: 0, s: .96, dur: 1 });
    pl.style.transform += ` perspective(1600px) rotateY(${(1 - outExpo(pp)) * -18 - 4}deg)`;
    let act = -1; this.tc.forEach((c, i) => { if (lt >= c) act = i; });
    $$('#rows .row').forEach((r, i) => {
      pop(r, lt, .9 + i * .09, { y: 30, s: 1, rx: 0, dur: .6 });
      r.classList.toggle('on', i === act);
      $$('.bars span', r).forEach((b, j) => {
        const live = i === act ? (.25 + .75 * hash(i, j, Math.floor(t * 15)) * (.45 + .8 * env)) : .2 + .3 * hash(i, j);
        b.style.height = (6 + 28 * live) + 'px';
      });
    });
    $$('#peq span').forEach((b, j) => b.style.height = (4 + 18 * (.3 + .7 * hash(j, Math.floor(t * 15)) * (.4 + env))) + 'px');
    $('#pbar').style.width = (100 * prog(lt, .6, S.music.d - .8)) + '%';
    drawArt($('#cov'), 11, t);
  }
};

scenes.preview = {
  data: [['Upcoming Release', 'Märchenland'], ['Studio Version', 'Liebe'], ['Remastered', 'Herzschlag von mir'], ['Exclusive Preview', 'Backseat'], ['Remastered Version', '3 Tage Wach']],
  init() {
    $('#pvTrack').innerHTML = this.data.map(([tg, n]) => `<div class="panel pv"><div class="art"><canvas width="304" height="304"></canvas></div><span class="tag">${tg}</span><h3>${n}</h3><p>Unveröffentlicht · Jason Remix</p></div>`).join('');
    this.cards = $$('#pvTrack .pv'); this.cards.forEach(c => addTrace(c, 26));
    this.hs = this.cards.map(c => splitChars($('h3', c)));
    this.h = splitWords($('#s-preview .h1'));
    this.cues = this.data.map(([, n]) => cue('preview', 1, n.split(' ')[0] === '3' ? 'Und 3' : n.split(' ')[0], -.12));
  },
  update(lt, env, t) {
    scramble($('#s-preview .eyebrow'), lt, .2);
    words(this.h, lt, .35);
    $('#pvTrack').style.transform = `translateX(${lerp(30, -20, inOutCubic(prog(lt, 1, S.preview.d - 1)))}px)`;
    this.cards.forEach((c, i) => {
      pop(c, lt, this.cues[i], { y: 140, rx: 0, s: .8, dur: .9, extra: ` rotate(${(1 - outExpo(prog(lt, this.cues[i], .9))) * (i % 2 ? 6 : -6)}deg)` });
      trace(c, lt, this.cues[i] + .1, 1);
      chars(this.hs[i], lt, { kind: 'flip', t0: this.cues[i] + .15, stagger: .03, dur: .7 });
      drawArt($('canvas', c), i * 7 + 3, t);
    });
    const ty = $('#typed'), full = 'Mehr Musik ist bereits in Arbeit', a = L('preview', 2);
    ty.textContent = lt < a ? '' : full.slice(0, Math.round(full.length * prog(lt, a, S.preview.lines[2].d * .9)));
    $('#typing .caret').style.opacity = lt < a - .4 ? 0 : (Math.floor(lt * 2.5) % 2 ? .15 : 1);
    $('#typing').style.textShadow = `0 0 ${12 + 16 * env}px rgba(255,0,0,.6)`;
  }
};

scenes.booking = {
  data: [['ball', 'Festivals'], ['disc', 'Clubs'], ['star', 'Diskotheken'], ['case', 'Firmenevents'], ['sun', 'Open-Air Events'], ['party', 'Private Feiern'], ['note', 'Musikveranstaltungen'], ['crown', 'Exklusive Events']],
  init() {
    $('#evGrid').innerHTML = this.data.map(([ic, n]) => `<div class="panel ev"><div class="icon">${ICONS[ic]}</div><span>${n}</span></div>`).join('');
    this.tiles = $$('#evGrid .ev'); this.tiles.forEach(c => addTrace(c, 26));
    this.hs = this.tiles.map(c => splitChars($('span', c)));
    this.h = splitWords($('#s-booking .h1'));
    const k = ['Festivals', 'Clubs', 'Diskotheken', 'Firmenevents', 'Open-Air', 'private', 'exklusive', 'exklusive'];
    this.cues = k.map((w, i) => cue('booking', 1, w, i === 6 ? -.35 : -.12));
    this.eu = [...splitChars($('#europe .h2')), ...splitChars($('#europe .lead'))];
  },
  update(lt, env) {
    scramble($('#s-booking .eyebrow'), lt, .15);
    words(this.h, lt, L('booking', 0) - .1, { stagger: .08 });
    this.tiles.forEach((c, i) => {
      pop(c, lt, this.cues[i], { y: 0, s: .4, rx: 0, dur: .7 });
      trace(c, lt, this.cues[i] + .05, .9);
      const ic = $('.icon', c), q = outBack(prog(lt, this.cues[i] + .1, .5), 2.4);
      ic.style.transform = `scale(${q})`;
      chars(this.hs[i], lt, { kind: 'decode', t0: this.cues[i] + .1, stagger: .02, dur: .3 });
    });
    const e0 = L('booking', 2) - .15;
    $('#europe').style.opacity = lt < e0 ? 0 : 1;
    chars(this.eu, lt, { kind: 'rise', t0: e0, stagger: .012, dur: .5, y: 30 });
    $$('#europe .pulse i').forEach((r, i) => {
      const ph = ((lt - e0) / (BEAT * 2) + i / 3) % 1, s = 18 + ph * 110;
      r.style.width = r.style.height = s + 'px'; r.style.margin = `${-s / 2}px 0 0 ${-s / 2}px`;
      r.style.opacity = lt < e0 ? 0 : (1 - ph) * .9;
    });
    $('#europe .pulse b').style.opacity = lt < e0 ? 0 : 1;
  }
};

scenes.coop = {
  a: ['Marken', 'Musiklabels', 'Festivalveranstalter', 'Clubs', 'Eventagenturen'],
  b: ['Content Creator', 'Influencer', 'Musikproduzenten', 'Unternehmen', 'Internationale Partner'],
  init() {
    const row = arr => (arr.map(w => `<span>${w}</span><span class="s">✦</span>`).join('')).repeat(3);
    $('#mq1').innerHTML = row(this.a); $('#mq2').innerHTML = row(this.b);
    fit($('#s-coop .h1'), 1680); this.h = splitWords($('#s-coop .h1'));
    this.nv = splitChars($('#partner .v'));
  },
  update(lt, env) {
    scramble($('#s-coop .eyebrow'), lt, .2);
    words(this.h, lt, L('coop', 0) - .1);
    const m0 = L('coop', 1) - .3, mp = outExpo(prog(lt, m0, 1.2));
    const m1 = $('#mq1'), m2 = $('#mq2');
    m1.style.transform = `translateX(${-lt * 190 + (1 - mp) * 900}px) skewX(${(1 - mp) * -25}deg)`;
    m2.style.transform = `translateX(${-2600 + lt * 170 - (1 - mp) * 900}px) skewX(${(1 - mp) * 25}deg)`;
    m1.style.opacity = m2.style.opacity = mp;
    m1.style.textShadow = `0 0 ${20 + 30 * env}px rgba(255,255,255,.18)`;
    m2.style.webkitTextStroke = `2px rgba(255,40,40,${.5 + .4 * env})`;
    const p0 = L('coop', 2) - .1, pt = $('#partner');
    const p = prog(lt, p0, .8), e = outExpo(p);
    pt.style.opacity = lt < p0 ? 0 : clamp(p * 2.5);
    pt.style.transform = `translateX(-50%) translateY(${(1 - e) * 60}px) scale(${lerp(.8, 1, outBack(clamp(p * 1.2)))})`;
    pt.style.boxShadow = `0 0 ${30 + 40 * env}px rgba(255,0,0,${.25 * e}),0 30px 80px rgba(0,0,0,.55)`;
    chars(this.nv, lt, { kind: 'decode', t0: p0 + .2, stagger: .05, dur: .4 });
  }
};

scenes.community = {
  data: [['100%', 'Leidenschaft'], ['24/7', 'Support'], ['∞', 'Kreativität'], ['1', 'Community']],
  init() {
    $('#stats').innerHTML = this.data.map(([n, l]) => `<div class="panel stat"><div class="num glow">${n}</div><div class="lbl">${l}</div></div>`).join('');
    this.cards = $$('#stats .stat'); this.cards.forEach(c => addTrace(c));
    fit($('#s-community .h1'), 1680); this.h = splitWords($('#s-community .h1'));
    const a = cue('community', 1, '100', -.1);
    this.cues = [a, a + .55, cue('community', 1, 'Unendliche', -.1), cue('community', 1, 'Eine', -.1)];
  },
  update(lt, env) {
    scramble($('#s-community .eyebrow'), lt, .2);
    words(this.h, lt, L('community', 0) - .1);
    this.cards.forEach((c, i) => {
      pop(c, lt, this.cues[i], { y: 90, s: .85, rx: 30, dur: .8 });
      trace(c, lt, this.cues[i] + .1, 1);
      const n = $('.num', c), p = outCubic(prog(lt, this.cues[i] + .05, .9));
      if (i === 0) n.textContent = Math.round(100 * p) + '%';
      if (i === 1) n.textContent = Math.round(24 * p) + '/' + Math.round(7 * p);
      const sl = outBack(prog(lt, this.cues[i] + .05, .6), 2);
      if (i >= 2) n.style.transform = `scale(${lerp(2.2, 1, sl) * (1 + env * .04)})`;
      else n.style.transform = `scale(${1 + env * .04})`;
      n.style.opacity = prog(lt, this.cues[i], .2);
    });
  }
};

scenes.cta = {
  init() {
    this.h = splitWords($('#s-cta .h2'));
    const u = $('#url'); fit(u, 1640);
    this.url = splitChars(u);
    const b = $('#btn').getBoundingClientRect();
    this.btn = { x: b.left + b.width * .62, y: b.top + b.height * .62 };
    this.chips = $$('#contact .chip');
    this.outroLogo = $('#outro img');
  },
  update(lt, env) {
    const D = S.cta.d, end = TL.kickEnd - S.cta.t;
    scramble($('#s-cta .eyebrow'), lt, .2);
    words(this.h, lt, L('cta', 0) - .1, { stagger: .06 });
    // Neonröhre zündet Buchstabe für Buchstabe
    const u0 = cue('cta', 1, 'jasonremix', -.35);
    this.url.forEach((c, i) => {
      const st = u0 + i * .045, p = prog(lt, st, .5);
      let on = lt < st ? 0 : p >= 1 ? 1 : (hash(i, Math.floor(lt * 40)) < p * 1.1 ? 1 : .12);
      c.style.opacity = on;
      c.style.color = p >= 1 ? '#fff' : '#ff3a3a';
      c.style.textShadow = on > .5 ? `0 0 ${10 * (.7 + env)}px #ff3030,0 0 ${40 * (.7 + env)}px #ff0000,0 0 ${110 * (.7 + env)}px rgba(255,0,0,.6)` : 'none';
    });
    const b0 = L('cta', 1) - .1, bw = $('#btnWrap');
    pop(bw, lt, b0, { y: 40, s: .6, rx: 0, dur: .7 });
    // Cursor fährt auf den Button und klickt
    const cs = $('#cursor'), c0 = L('cta', 1) + .5, c1 = L('cta', 2) - .1, cp = inOutCubic(prog(lt, c0, c1 - c0));
    const cx = lerp(1700, this.btn.x, cp) + Math.sin(cp * Math.PI) * -80, cy = lerp(1040, this.btn.y, cp);
    const click = prog(lt, c1 + .05, .35), press = click > 0 && click < 1 ? Math.sin(click * Math.PI) : 0;
    cs.style.opacity = lt < c0 ? 0 : 1;
    cs.style.transform = `translate(${cx}px,${cy}px) scale(${1 - press * .15})`;
    $('#btn').style.transform = `scale(${1 - press * .06})`;
    $('#btn').style.filter = click > 0 ? `brightness(${1 + (1 - click) * .5})` : 'none';
    this.chips.forEach((c, i) => pop(c, lt, L('cta', 2) + .15 + i * .14, { y: 40, s: .8, rx: 0, dur: .6 }));
    // Outro: Logo
    const o = prog(lt, end - .1, .6), main = $('#ctaMain');
    main.style.opacity = 1 - o; main.style.filter = o > 0 ? `blur(${o * 16}px)` : 'none';
    main.style.transform = `scale(${1 + o * .08})`;
    const ol = $('#outro'), op = prog(lt, end + .15, 1.0), oe = outExpo(op);
    ol.style.opacity = lt < end + .15 ? 0 : clamp(op * 2) * (1 - prog(lt, D - .7, .6));
    this.outroLogo.style.transform = `scale(${lerp(1.3, 1, oe)})`;
    this.outroLogo.style.filter = `blur(${(1 - oe) * 20}px) drop-shadow(0 0 ${24 * (.5 + env)}px rgba(255,0,0,.6))`;
  }
};

/* ---------- Globale Ebenen ---------- */
const grainURLs = [];
function makeGrain() {
  for (let k = 0; k < 8; k++) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d'), im = x.createImageData(256, 256);
    for (let i = 0; i < im.data.length; i += 4) { const v = hash(k, i) * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    x.putImageData(im, 0, 0); grainURLs.push(`url(${c.toDataURL()})`);
  }
}
let lastSec = -1;
function hud(t, env) {
  const h = $('#hud'), start = S.tagline.t - .4, end = TL.kickEnd;
  h.style.opacity = prog(t, start, .7) * (1 - prog(t, end, .5));
  const cur = TL.scenes.find(s => t >= s.t && t < s.t + s.d) ?? TL.scenes[TL.scenes.length - 1];
  const no = $('#secNo'), nm = $('#secName');
  no.textContent = String(cur.idx + 1).padStart(2, '0') + ' / ' + String(TL.scenes.length).padStart(2, '0');
  nm.dataset.full = cur.label.toUpperCase(); scramble(nm, t - cur.t, 0, .5);
  $('#progress b').style.width = (100 * t / TL.duration) + '%';
  const pr = $('#progress');
  if (!pr.dataset.ticks) { pr.dataset.ticks = 1; TL.scenes.forEach(s => { const i = document.createElement('i'); i.style.left = (100 * s.t / TL.duration) + '%'; pr.appendChild(i); }); }
  const eq = $('#heq'); if (!eq.children.length) eq.innerHTML = '<span></span>'.repeat(5);
  [...eq.children].forEach((b, j) => b.style.height = (3 + 19 * clamp((.25 + .75 * hash(j, Math.floor(t * 15))) * (.35 + env))) + 'px');
  $('.live').style.opacity = .5 + .5 * env;
}
function overlays(t, env) {
  // Lichtstreifen + Blitz an jedem Szenenwechsel
  const wipe = $('#wipe'); let flash = 0, html = '';
  TL.scenes.forEach((s, i) => {
    const T = i === 0 ? TL.drop : s.t, big = i === 0 || s.id === 'booking';
    if (t >= T) flash = Math.max(flash, Math.exp(-(t - T) * (big ? 7 : 12)) * (big ? .9 : .45));
    if (i === 0) return;
    const p = prog(t, T - .24, .5);
    if (p > 0 && p < 1) {
      const x = lerp(-700, 2700, inOutCubic(p));
      html += `<i style="left:${x - 260}px;width:520px;background:linear-gradient(90deg,transparent,rgba(255,0,0,.45),transparent)"></i>`
        + `<i style="left:${x - 7}px;width:14px;background:#fff;box-shadow:0 0 30px 10px #ff2a2a,0 0 120px 40px rgba(255,0,0,.6)"></i>`
        + `<i style="left:${x - 140}px;width:4px;background:rgba(255,80,80,.9);box-shadow:0 0 20px 4px #f00"></i>`;
    }
  });
  // Tagline-Slams blitzen kurz
  S.tagline.lines.forEach(l => { const T = l.t + .05; if (t >= T) flash = Math.max(flash, Math.exp(-(t - T) * 14) * .35); });
  wipe.innerHTML = html;
  $('#flash').style.opacity = flash;
  $('#grain').style.backgroundImage = grainURLs[Math.floor(t * 24) % grainURLs.length];
}

function bgAmp(t) {
  const d = TL.drop, [b0, b1] = TL.breakdown;
  const inBreak = t >= b0 && t < b1 ? 1 - prog(t, b1 - .4, .4) : 0;
  const grid = prog(t, d, 1.2) * (1 - .6 * inBreak) * (1 - prog(t, TL.kickEnd, 1));
  return { grid, blob: lerp(.5, 1, prog(t, d, .8)), beam: prog(t, d, 1.5) * (1 - .5 * inBreak), ember: lerp(.4, 1, prog(t, d, 1)) };
}

window.setup = () => {
  makeGrain();
  // Szenen zum Messen kurz sichtbar machen
  TL.scenes.forEach(s => { sc(s.id).style.visibility = 'visible'; });
  Object.entries(scenes).forEach(([, o]) => o.init());
  TL.scenes.forEach(s => { sc(s.id).style.visibility = 'hidden'; });
};

window.seek = t => {
  gT = t;
  const env = kickAt(t); kickEnv = env;
  document.documentElement.style.setProperty('--glow', (.7 + .65 * env).toFixed(3));
  drawBG(t, env, bgAmp(t));
  TL.scenes.forEach((s, i) => {
    const el = sc(s.id), lt = t - s.t, vis = lt >= 0 && lt < s.d;
    el.style.visibility = vis ? 'visible' : 'hidden';
    if (!vis) return;
    // Kamera: langsamer Push-in, Kick-Bump, Ein- und Ausblendung
    const enter = i === 0 ? 1 : outExpo(prog(lt, 0, .45)), exit = i === TL.scenes.length - 1 ? 0 : inCubic(prog(lt, s.d - .32, .32));
    const shakeAmp = (s.id === 'booking' ? Math.exp(-lt * 5) * 14 : 0) + (i === 0 ? Math.exp(-Math.max(0, lt - TL.drop) * 6) * (lt > TL.drop ? 12 : 0) : 0);
    const sx = (hash(i, Math.floor(t * 60)) - .5) * shakeAmp, sy = (hash(i, 5, Math.floor(t * 60)) - .5) * shakeAmp;
    const sc_ = lerp(.93, 1, enter) * (1 + .025 * lt / s.d) * (1 + env * .005) * (1 + exit * .07);
    el.style.transform = `translate(${sx}px,${sy}px) scale(${sc_})`;
    const blur = (1 - enter) * 12 + exit * 14;
    el.style.filter = blur > .2 ? `blur(${blur.toFixed(2)}px)` : 'none';
    el.style.opacity = 1 - exit;
    scenes[s.id].update(lt, env, t);
  });
  hud(t, env);
  overlays(t, env);
  // Ganz am Ende sanft auf Schwarz
  $('#stage').style.opacity = 1 - prog(t, TL.duration - .5, .5);
};
})();
