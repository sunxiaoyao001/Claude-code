/* Shared effects for the Nobel page: a particle engine (explosions, sparks,
   shards, smoke, gem glints), an ink-blot mask generator, and synthesised
   sound. Exposed as window.NB. */
(function () {
  'use strict';
  var NB = window.NB = window.NB || {};
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  NB.reduce = reduce;
  NB.muted = false;

  /* ---------- sound ---------- */
  var actx = null;
  function ac() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; } } return actx; }
  function tone(a, f, t, d, type, v, slide) {
    var o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime + t;
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + d);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v || 0.1, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + d + 0.05);
  }
  function noise(a, t, d, from, to, v, type) {
    var len = Math.floor(a.sampleRate * d), buf = a.createBuffer(1, len, a.sampleRate), ch = buf.getChannelData(0);
    for (var i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    var s = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain(), t0 = a.currentTime + t;
    s.buffer = buf; fl.type = type || 'lowpass';
    fl.frequency.setValueAtTime(from, t0); fl.frequency.exponentialRampToValueAtTime(to, t0 + d);
    g.gain.value = v; s.connect(fl).connect(g).connect(a.destination); s.start(t0);
  }
  var SFX = {
    tap: function (a) { tone(a, 720, 0, 0.07, 'triangle', 0.04); },
    hover: function (a) { tone(a, 1400, 0, 0.04, 'sine', 0.015); },
    right: function (a) { [784, 988, 1175, 1568].forEach(function (f, i) { tone(a, f, i * 0.07, 0.6, 'sine', 0.08); }); },
    wrong: function (a) { tone(a, 220, 0, 0.2, 'square', 0.035, 160); tone(a, 150, 0.12, 0.28, 'square', 0.035, 110); },
    gem: function (a) { [1319, 1760, 2093, 2637].forEach(function (f, i) { tone(a, f, i * 0.06, 1.1, 'sine', 0.05); }); noise(a, 0, 0.6, 9000, 3000, 0.03, 'highpass'); },
    rise: function (a) { tone(a, 220, 0, 1.2, 'sine', 0.06, 880); noise(a, 0, 1.2, 400, 6000, 0.05); },
    boom: function (a) { noise(a, 0, 2.2, 3000, 40, 1.0); tone(a, 70, 0, 1.4, 'sine', 0.45, 28); noise(a, 0.05, 1.0, 8000, 600, 0.25, 'highpass'); },
    glass: function (a) { [2400, 3100, 2700, 3600].forEach(function (f, i) { tone(a, f, 0.02 + i * 0.03, 0.4, 'triangle', 0.02); }); },
    slosh: function (a) { noise(a, 0, 0.35, 900, 300, 0.12, 'bandpass'); },
    fire: function (a) { noise(a, 0, 2.2, 1200, 700, 0.08, 'bandpass'); },
    unlock: function (a) { tone(a, 440, 0, 0.12, 'triangle', 0.05); tone(a, 660, 0.1, 0.3, 'triangle', 0.05); noise(a, 0, 0.4, 300, 4000, 0.06); },
    whoosh: function (a) { noise(a, 0, 0.7, 200, 3000, 0.12, 'bandpass'); },
    paper: function (a) { noise(a, 0, 0.25, 6000, 1500, 0.05, 'highpass'); noise(a, 0.12, 0.2, 5000, 1200, 0.04, 'highpass'); },
    pen: function (a) { noise(a, 0, 0.18, 5000, 3000, 0.03, 'highpass'); },
    seal: function (a) { tone(a, 110, 0, 0.25, 'sine', 0.25, 60); noise(a, 0, 0.2, 1500, 200, 0.2); },
    type: function (a) { tone(a, 1800 + Math.random() * 400, 0, 0.02, 'square', 0.008); },
    drop: function (a) { tone(a, 1200, 0, 0.25, 'sine', 0.08, 300); }
  };
  NB.play = function (name) {
    if (NB.muted) return;
    var a = ac(); if (!a) return;
    if (a.state === 'suspended') a.resume();
    try { SFX[name](a); } catch (e) { /* ignore */ }
  };

  /* ---------- particles ---------- */
  function Engine(canvas) {
    var ctx = canvas.getContext('2d'), parts = [], running = false, last = 0, W = 0, H = 0;
    var dpr = Math.min(1.5, window.devicePixelRatio || 1);
    function size() { W = canvas.clientWidth || innerWidth; H = canvas.clientHeight || innerHeight; canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
    size();
    if (window.ResizeObserver) new ResizeObserver(size).observe(canvas); else addEventListener('resize', size);
    function add(p) {
      p.t = 0; p.delay = p.delay || 0; p.alpha = p.alpha == null ? 1 : p.alpha;
      parts.push(p);
      if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); }
    }
    function star(x, y, r, rot) {
      ctx.beginPath();
      for (var i = 0; i < 8; i++) {
        var a = rot + i * Math.PI / 4, rr = i % 2 ? r * 0.28 : r;
        ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      ctx.closePath();
    }
    function draw(p, k) {
      var a = p.alpha * (p.fade === false ? 1 : 1 - Math.pow(k, p.fadePow || 1.6));
      if (a <= 0.003) return;
      ctx.globalAlpha = a;
      ctx.globalCompositeOperation = p.add ? 'lighter' : 'source-over';
      var s = Math.max(0.05, p.size * (1 + (p.grow || 0) * k));
      if (p.type === 'spark') {
        ctx.strokeStyle = p.color; ctx.lineWidth = p.size; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * (p.trail || 0.035), p.y - p.vy * (p.trail || 0.035)); ctx.stroke();
      } else if (p.type === 'glow' || p.type === 'smoke') {
        var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, s);
        g.addColorStop(0, p.color); g.addColorStop(1, p.color2 || 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, Math.PI * 2); ctx.fill();
      } else if (p.type === 'ring') {
        ctx.strokeStyle = p.color; ctx.lineWidth = Math.max(0.5, p.width * (1 - k));
        ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, Math.PI * 2); ctx.stroke();
      } else if (p.type === 'shard') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color; ctx.strokeStyle = p.stroke || 'rgba(19,25,34,.6)'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(p.pts[0], p.pts[1]); for (var i = 2; i < p.pts.length; i += 2) ctx.lineTo(p.pts[i] * s / p.size, p.pts[i + 1] * s / p.size);
        ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
      } else if (p.type === 'star') {
        ctx.fillStyle = p.color; star(p.x, p.y, s * Math.sin(Math.PI * Math.min(1, k * 1.2)), p.rot); ctx.fill();
      } else if (p.type === 'dot') {
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, Math.PI * 2); ctx.fill();
      }
    }
    function loop(now) {
      var dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, W, H);
      for (var i = parts.length - 1; i >= 0; i--) {
        var p = parts[i];
        if (p.delay > 0) { p.delay -= dt; continue; }
        p.t += dt;
        if (p.t >= p.life) { parts.splice(i, 1); continue; }
        var drag = Math.pow(p.drag || 1, dt * 60);
        p.vx = p.vx * drag + (p.ax || 0) * dt; p.vy = p.vy * drag + (p.ay || 0) * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.vr) p.rot += p.vr * dt;
      }
      // smoke first, light on top
      try {
        for (var j = 0; j < parts.length; j++) if (!parts[j].add && parts[j].delay <= 0) draw(parts[j], Math.max(0, parts[j].t / parts[j].life));
        for (j = 0; j < parts.length; j++) if (parts[j].add && parts[j].delay <= 0) draw(parts[j], Math.max(0, parts[j].t / parts[j].life));
      } catch (err) { parts.length = 0; }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      if (parts.length) requestAnimationFrame(loop); else { running = false; ctx.clearRect(0, 0, W, H); }
    }
    function rnd(a, b) { return a + Math.random() * (b - a); }
    var api = {
      add: add,
      clear: function () { parts.length = 0; },
      ring: function (x, y, o) {
        o = o || {};
        add({ type: 'ring', x: x, y: y, vx: 0, vy: 0, size: o.r0 || 10, grow: (o.r1 || 300) / (o.r0 || 10), life: o.life || 0.8, width: o.width || 6, color: o.color || 'rgba(239,134,27,.9)', delay: o.delay, fadePow: 1 });
      },
      sparkle: function (x, y, o) {
        o = o || {};
        var n = o.n || 26, colors = o.colors || ['#fff7d6', '#ef861b', '#ffffff'];
        for (var i = 0; i < n; i++) {
          var a = Math.random() * Math.PI * 2, sp = rnd(o.min || 120, o.max || 420);
          add({ type: 'star', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, ay: o.g || 160, drag: 0.93, size: rnd(4, o.big || 11), life: rnd(0.6, 1.2), color: colors[i % colors.length], rot: Math.random() * 3, vr: rnd(-6, 6), add: true, delay: (o.spread || 0) * Math.random() });
        }
      },
      splash: function (x, y, o) {
        o = o || {};
        var color = o.color || '#ef861b';
        for (var i = 0; i < (o.n || 36); i++) {
          var a = -Math.PI / 2 + rnd(-1.4, 1.4), sp = rnd(160, 620);
          add({ type: 'dot', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, ay: 1400, drag: 0.985, size: rnd(1.5, 5.5), life: rnd(0.5, 1.1), color: color, fadePow: 3 });
        }
      },
      explode: function (x, y, o) {
        o = o || {};
        var k = o.scale || 1;
        add({ type: 'glow', x: x, y: y, vx: 0, vy: 0, size: 40 * k, grow: 14, life: 0.5, color: 'rgba(255,250,230,1)', add: true, fadePow: 0.8 });
        api.ring(x, y, { r0: 20 * k, r1: 900 * k, life: 0.9, width: 14, color: 'rgba(255,240,210,.85)' });
        api.ring(x, y, { r0: 10 * k, r1: 600 * k, life: 1.3, width: 4, color: 'rgba(239,134,27,.8)', delay: 0.08 });
        var fire = ['rgba(255,214,120,.9)', 'rgba(239,134,27,.85)', 'rgba(210,70,20,.8)'];
        for (var i = 0; i < 26; i++) {
          var a = Math.random() * Math.PI * 2, sp = rnd(40, 260) * k;
          add({ type: 'glow', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, ay: -60, drag: 0.9, size: rnd(30, 90) * k, grow: 1.6, life: rnd(0.6, 1.3), color: fire[i % 3], add: true, delay: rnd(0, 0.15) });
        }
        for (i = 0; i < 180; i++) {
          a = Math.random() * Math.PI * 2; sp = rnd(300, 1500) * k;
          add({ type: 'spark', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, ay: 900, drag: 0.94, size: rnd(1, 2.6), life: rnd(0.5, 1.6), color: i % 4 ? '#ffd68a' : '#ffffff', add: true, trail: 0.03 });
        }
        for (i = 0; i < 40; i++) {
          a = Math.random() * Math.PI * 2; sp = rnd(200, 900) * k;
          var pts = [], m = 3 + (i % 2);
          for (var j = 0; j < m; j++) { var b = (j / m) * Math.PI * 2 + rnd(-0.4, 0.4), r = rnd(4, 14); pts.push(Math.cos(b) * r, Math.sin(b) * r); }
          add({ type: 'shard', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 200, ay: 1600, drag: 0.98, size: 10, pts: pts, rot: Math.random() * 6, vr: rnd(-14, 14), life: rnd(1, 2), color: 'rgba(225,238,246,.85)' });
        }
        for (i = 0; i < 46; i++) {
          a = Math.random() * Math.PI * 2; sp = rnd(30, 220) * k;
          var gr = Math.round(rnd(40, 90));
          add({ type: 'smoke', x: x + rnd(-30, 30), y: y + rnd(-20, 20), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 50, ay: -30, drag: 0.96, size: rnd(50, 120) * k, grow: rnd(1.5, 3), life: rnd(2.2, 4), color: 'rgba(' + gr + ',' + gr + ',' + (gr + 6) + ',.75)', alpha: 0.85, delay: rnd(0.15, 0.6), fadePow: 1.2 });
        }
      },
      flame: function (x, y, w) {
        for (var i = 0; i < 3; i++) {
          add({ type: 'glow', x: x + rnd(-w, w), y: y, vx: rnd(-10, 10), vy: rnd(-160, -90), ay: -40, drag: 0.98, size: rnd(10, 22), grow: -0.6, life: rnd(0.35, 0.7), color: i ? 'rgba(239,134,27,.8)' : 'rgba(255,224,140,.95)', add: true });
        }
      },
      bubbles: function (x, y, w) {
        add({ type: 'dot', x: x + rnd(-w, w), y: y, vx: rnd(-6, 6), vy: rnd(-90, -50), ay: -40, size: rnd(1.5, 3.5), life: rnd(0.5, 0.9), color: 'rgba(255,255,255,.9)', fadePow: 4 });
      },
      trail: function (x, y, color) {
        add({ type: 'star', x: x, y: y, vx: rnd(-30, 30), vy: rnd(-30, 30), drag: 0.9, size: rnd(3, 7), life: rnd(0.4, 0.8), color: color || '#fff7d6', rot: Math.random() * 3, vr: 4, add: true });
      },
      count: function () { return parts.length; }
    };
    return api;
  }
  NB.Engine = Engine;

  /* ---------- ink blots for masks ---------- */
  NB.blot = function (seed, opts) {
    opts = opts || {};
    var S = opts.size || 512, c = document.createElement('canvas');
    c.width = c.height = S;
    var g = c.getContext('2d'), R = seed || 7;
    function rand() { R = (R * 16807) % 2147483647; return (R - 1) / 2147483646; }
    g.fillStyle = '#000';
    var cx = S / 2, cy = S / 2;
    // main body: many overlapping lobes
    for (var i = 0; i < 70; i++) {
      var a = rand() * Math.PI * 2, d = Math.pow(rand(), 1.6) * S * 0.2, r = S * (0.05 + rand() * 0.14);
      g.beginPath(); g.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, r, 0, Math.PI * 2); g.fill();
    }
    // tendrils and splatter
    for (i = 0; i < 26; i++) {
      a = rand() * Math.PI * 2;
      var len = S * (0.18 + rand() * 0.22), steps = 10;
      for (var j = 0; j < steps; j++) {
        var t = j / steps, rr = S * 0.035 * (1 - t) + 1;
        g.beginPath(); g.arc(cx + Math.cos(a + t * 0.3) * len * t, cy + Math.sin(a + t * 0.3) * len * t, rr, 0, Math.PI * 2); g.fill();
      }
      g.beginPath(); g.arc(cx + Math.cos(a) * len * (1.08 + rand() * 0.2), cy + Math.sin(a) * len * (1.08 + rand() * 0.2), S * 0.006 + rand() * S * 0.012, 0, Math.PI * 2); g.fill();
    }
    return c.toDataURL('image/png');
  };

  /* global overlay engine, created once the DOM is ready */
  NB.fxCanvas = function () {
    if (NB.fx) return NB.fx;
    var cv = document.createElement('canvas');
    cv.className = 'fx-layer'; cv.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cv);
    NB.fx = Engine(cv);
    return NB.fx;
  };
})();
