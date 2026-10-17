// poses.js — one verb per item. Each act(b, th) takes the local beat b and the chapter theme and returns
// { spec, f, props, env, envFront, stage, others }. Hand/foot targets are in unit body space (hip origin,
// feet on y = GROUND). Key actions (release, contact, landing) land on integer beats.
'use strict';
const E = require('./engine');
const { G, toScreen, keyPose, resolve, css, mix, expOut, expInOut, clamp, lerp, CREAM } = E;
const GROUND = 0.485;
const T = (v, p) => toScreen(v, p, null);
const TAU = Math.PI * 2;

// ---------- locomotion ----------
// One foot contact per beat (rate = steps per beat). Near foot strikes on even steps.
function gait(b, { stride = 0.24, lift = 0.07, rate = 1, ground = GROUND, x = 0 } = {}) {
  const foot = (ph) => {
    const p = ((ph % 1) + 1) % 1;
    if (p < 0.5) return [x + stride / 2 - (p / 0.5) * stride, ground];
    const s = (p - 0.5) / 0.5;
    return [x - stride / 2 + expInOut(s) * stride, ground - lift * Math.sin(Math.PI * s)];
  };
  const ph = b * rate / 2;
  return { fn: foot(ph), ff: foot(ph + 0.5), bob: -0.018 * Math.abs(Math.sin(Math.PI * b * rate)), swing: Math.cos(Math.PI * b * rate) };
}
function walkSpec(b, o = {}) {
  const g = gait(b, o);
  return { y: (o.y || 0) + g.bob, x: o.x || 0, tor: o.tor ?? 4, fn: g.fn, ff: g.ff, an: [22 * g.swing, 18], af: [-22 * g.swing, 18] };
}
function runSpec(b, o = {}) {
  const g = gait(b, { stride: 0.42, lift: 0.16, rate: o.rate || 2, ground: GROUND - 0.02, x: o.x || 0 });
  return { x: o.x || 0, y: g.bob * 2 - 0.03, tor: 16, fn: g.fn, ff: g.ff, kn: -1, kf: -1, an: [55 * g.swing, 95], af: [-55 * g.swing, 95] };
}

// ---------- prop helpers ----------
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
// Side-view camera: body + prism + optional lens capsule pointing along ang.
function camSide(ctx, p, s, ang, c, lens = 0.34, hood = 0) {
  ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(ang); ctx.fillStyle = c;
  ctx.beginPath(); ctx.roundRect(-s * 0.5, -s * 0.34, s, s * 0.68, s * 0.12); ctx.fill();
  ctx.beginPath(); ctx.roundRect(-s * 0.2, -s * 0.52, s * 0.4, s * 0.24, s * 0.06); ctx.fill();
  if (lens > 0) {
    ctx.beginPath(); ctx.roundRect(s * 0.4, -s * 0.24, s * lens, s * 0.48, s * 0.08); ctx.fill();
    if (hood) { ctx.beginPath(); ctx.roundRect(s * (0.38 + lens), -s * 0.32, s * hood, s * 0.64, s * 0.08); ctx.fill(); }
  }
  ctx.restore();
}
function burst(ctx, p, r, w, c, t) { // expanding ring, t in [0,1]
  if (t <= 0 || t >= 1) return;
  G.ring(ctx, p, r * expOut(t), w * (1 - t), c);
}
function sparkle(ctx, p, s, c, t) { // four-point star that pops and shrinks
  if (t <= 0 || t >= 1) return;
  const k = Math.sin(Math.PI * t) * s;
  ctx.fillStyle = c; ctx.beginPath();
  ctx.moveTo(p[0], p[1] - k); ctx.quadraticCurveTo(p[0], p[1], p[0] + k, p[1]); ctx.quadraticCurveTo(p[0], p[1], p[0], p[1] + k);
  ctx.quadraticCurveTo(p[0], p[1], p[0] - k, p[1]); ctx.quadraticCurveTo(p[0], p[1], p[0], p[1] - k); ctx.fill();
}
const beatT = (b, k, len = 0.6) => (b - k) / len; // progress of an event that fires on beat k

// ---------- acts ----------
const ACTS = {
  // 1917 — polishing a lens blank on a stand.
  polish(b, th) {
    const c = [0.36, -0.1], a = TAU * b, r = 0.05;
    const spec = resolve({ x: -0.04, y: 0.008 * Math.sin(a), tor: 16, hd: 8,
      hn: [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)], hf: [c[0] - 0.03 + r * Math.cos(a + Math.PI), c[1] + r * Math.sin(a + Math.PI)],
      fn: [0.1, GROUND], ff: [-0.16, GROUND] });
    return { spec, env(ctx, v) {
      const U = v.U, col = css(th.fig), soft = css(mix(th.fig, th.disc, 0.55));
      G.line(ctx, T(v, [c[0], c[1] + 0.1]), T(v, [c[0], GROUND]), 0.035 * U, col);
      G.capsule(ctx, T(v, [c[0] - 0.12, GROUND]), T(v, [c[0] + 0.12, GROUND]), 0.04 * U, col);
      G.disc(ctx, T(v, c), 0.135 * U, soft);
      G.ring(ctx, T(v, c), 0.135 * U, 0.022 * U, col);
      for (let k = 1; k <= 3; k++) sparkle(ctx, T(v, [c[0] + 0.11, c[1] - 0.12]), 0.07 * U, col, beatT(b, k, 0.5));
    } };
  },
  // 1932 — raising a lens to the eye; light passes through on beat 2.
  raise(b, th) {
    const spec = resolve(keyPose([
      [0, { tor: 2, hd: 0, hn: [0.17, -0.06], hf: [-0.04, -0.01], bf: -1, fn: [0.08, GROUND], ff: [-0.08, GROUND] }],
      [1, { tor: 2, hd: 0, hn: [0.17, -0.07], hf: [-0.04, -0.01], bf: -1, fn: [0.08, GROUND], ff: [-0.08, GROUND] }],
      [2, { tor: -4, hd: -6, hn: [0.2, -0.43], hf: [-0.04, -0.01], bf: -1, fn: [0.08, GROUND], ff: [-0.08, GROUND] }, expOut],
      [4, { tor: -5, hd: -7, hn: [0.21, -0.44], hf: [-0.04, -0.01], bf: -1, fn: [0.08, GROUND], ff: [-0.08, GROUND] }],
    ], b));
    return { spec, props: { front(ctx, S, J, col, v) {
      const U = v.U, L = [S.hn[0] + 0.035 * U * v.f, S.hn[1] - 0.04 * U];
      const pr = clamp((b - 2) / 0.5);
      if (pr > 0) {
        ctx.save(); ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineWidth = 0.016 * U;
        const fx = S.head[0] + 0.02 * U * v.f, fy = S.head[1];
        for (const dy of [-0.06, 0, 0.06]) {
          const sx = L[0] + 0.62 * U * v.f, y = L[1] + dy * U;
          ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(lerp(sx, L[0], expOut(pr)), y); ctx.stroke();
          const p2 = clamp((b - 2.35) / 0.4);
          if (p2 > 0) { ctx.beginPath(); ctx.moveTo(L[0], y); ctx.lineTo(lerp(L[0], fx + 0.06 * U * v.f, expOut(p2)), lerp(y, fy, expOut(p2))); ctx.stroke(); }
        }
        ctx.restore();
      }
      G.disc(ctx, L, 0.09 * U, css(mix(th.fig, th.disc, 0.5)));
      G.ring(ctx, L, 0.09 * U, 0.026 * U, col);
      sparkle(ctx, [L[0] + 0.1 * U * v.f, L[1] - 0.1 * U], 0.06 * U, col, beatT(b, 3, 0.5));
    } } };
  },
  // 1948 — camera to the eye, shutter on beat 2.
  shoot(b, th) {
    const dip = b > 2 && b < 2.5 ? 0.012 * Math.sin(Math.PI * (b - 2) / 0.5) : 0;
    const spec = resolve(keyPose([
      [0, { tor: 3, hd: 0, hn: [0.2, -0.06], hf: [0.14, -0.08], fn: [0.1, GROUND], ff: [-0.1, GROUND] }],
      [1, { tor: 5, hd: 10, hn: [0.21, -0.35], hf: [0.13, -0.37], fn: [0.1, GROUND], ff: [-0.1, GROUND] }, expOut],
      [4, { tor: 6, hd: 10, hn: [0.21, -0.35], hf: [0.13, -0.37], fn: [0.1, GROUND], ff: [-0.1, GROUND] }],
    ], b));
    spec.y += dip;
    return { spec, props: { front(ctx, S, J, col, v) {
      const U = v.U, m = mid(S.hn, S.hf);
      camSide(ctx, [m[0] + 0.02 * U * v.f, m[1] - 0.02 * U], 0.15 * U, 0, col, 0.3);
      const lensTip = [m[0] + 0.12 * U * v.f, m[1] - 0.02 * U];
      burst(ctx, lensTip, 0.32 * U, 0.03 * U, col, beatT(b, 2, 0.7));
      sparkle(ctx, [lensTip[0] + 0.05 * U * v.f, lensTip[1] - 0.12 * U], 0.08 * U, col, beatT(b, 2, 0.45));
    } } };
  },
  // 1959 — the lens meets the mount on beat 2, then a twist.
  mount(b, th) {
    const lx = b < 2 ? lerp(0.5, 0.26, expOut(clamp(b / 2) * 1.2)) : 0.26;
    const lift = expInOut(clamp((b - 3) / 0.8)) * -0.14;
    const spec = resolve({ tor: 6, hd: 12, hf: [0.12, -0.06 + lift], hn: [lx + 0.02, -0.04 + lift], fn: [0.09, GROUND], ff: [-0.1, GROUND] });
    return { spec, props: { front(ctx, S, J, col, v) {
      const U = v.U, body = T(v, [0, 0]);
      const bp = S.hf, lp = S.hn;
      camSide(ctx, [bp[0] - 0.02 * U * v.f, bp[1] - 0.03 * U], 0.2 * U, 0, col, 0);
      const x0 = lp[0] - 0.06 * U * v.f;
      ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(Math.min(x0, x0 + 0.17 * U * v.f), lp[1] - 0.07 * U, 0.17 * U, 0.14 * U, 0.025 * U); ctx.fill();
      // twist mark slides across the barrel after contact
      const tw = clamp((b - 2.1) / 0.7);
      ctx.fillStyle = css(th.disc); ctx.fillRect(x0 + (0.03 + 0.1 * expInOut(tw)) * U * v.f, lp[1] - 0.07 * U, 0.02 * U, 0.14 * U);
      burst(ctx, [x0, lp[1]], 0.2 * U, 0.025 * U, col, beatT(b, 2, 0.6));
      void body;
    } } };
  },
  // 1971 — weightless in orbit, turning slowly, camera at the chest.
  float(b, th) {
    const spec = resolve({ x: 0, y: -0.03 - 0.03 * Math.sin(Math.PI * b / 2), rot: lerp(-20, 24, expInOut(b / 4)), tor: 0, hd: -4,
      hn: [0.2, -0.1], hf: [-0.22, -0.02], bf: -1, fn: [0.14, 0.32], ff: [-0.04, 0.4] });
    return { spec, stage: { disc: 'moon' },
      env(ctx, v) {
        const U = v.U;
        ctx.fillStyle = css(mix(th.fig, th.disc, 0.7));
        for (const [x, y, r] of [[-0.42, 0.34, 0.07], [0.3, 0.42, 0.05], [0.46, -0.2, 0.04], [-0.3, -0.5, 0.035]]) { ctx.beginPath(); ctx.arc(T(v, [x, y])[0], T(v, [x, y])[1], r * U, 0, 7); ctx.fill(); }
        for (let k = 0; k < 9; k++) { const a = k * 2.3 + 0.4, rr = 0.82 + (k % 3) * 0.06; const p = T(v, [Math.cos(a) * rr, Math.sin(a) * rr * 0.9]); sparkle(ctx, p, 0.035 * U, css(th.fig), ((b * 0.9 + k * 0.37) % 1)); }
      },
      props: {
        back(ctx, S, J, col, v) {
          const U = v.U, a = Math.atan2(S.neck[1] - S.hip[1], S.neck[0] - S.hip[0]);
          ctx.save(); ctx.translate(...mid(S.hip, S.neck)); ctx.rotate(a); ctx.fillStyle = col;
          ctx.beginPath(); ctx.roundRect(-0.12 * U, (v.f > 0 ? 0.03 : -0.13) * U, 0.24 * U, 0.1 * U, 0.03 * U); ctx.fill(); ctx.restore();
        },
        front(ctx, S, J, col, v) {
          const U = v.U;
          G.ring(ctx, S.head, 0.135 * U, 0.024 * U, col);
          const m = S.hn; camSide(ctx, [m[0] + 0.01 * U * v.f, m[1] - 0.03 * U], 0.13 * U, (E.lerp(-20, 24, expInOut(b / 4))) * E.D2R * v.f, col, 0.26);
          burst(ctx, [m[0] + 0.1 * U * v.f, m[1] - 0.03 * U], 0.26 * U, 0.025 * U, col, beatT(b, 2, 0.7));
        },
      } };
  },
  // 1980 — a lever drops on beat 2; light patterns a wafer, die by die.
  litho(b, th) {
    const ang = lerp(-52, 30, expOut(clamp((b - 1.2) / 0.8)));
    const piv = [0.06, -0.12], tip = [piv[0] + 0.15 * Math.cos(ang * E.D2R), piv[1] + 0.15 * Math.sin(ang * E.D2R)];
    const spec = resolve({ x: -0.3, tor: 10, hd: 6, hn: tip, hf: [-0.28, 0.02], fn: [-0.2, GROUND], ff: [-0.4, GROUND] });
    return { spec, env(ctx, v) {
      const U = v.U, col = css(th.fig), soft = css(mix(th.fig, th.disc, 0.55));
      const P = (x, y) => T(v, [x, y]);
      // frame: lamp head, two legs, stage bar
      const [ax, ay] = P(0.1, -0.66), [bx, by] = P(0.48, -0.48);
      G.rrect(ctx, Math.min(ax, bx), ay, Math.abs(bx - ax), by - ay, 0.03 * U, col);
      G.line(ctx, P(0.13, -0.5), P(0.13, GROUND), 0.04 * U, col);
      G.line(ctx, P(0.45, -0.5), P(0.45, GROUND), 0.04 * U, col);
      G.line(ctx, P(0.13, 0.26), P(0.45, 0.26), 0.035 * U, col);
      const lit = clamp((b - 2) / 0.25);
      if (lit > 0 && b < 3.6) {
        ctx.fillStyle = css(th.fig, 0.28 * (1 - clamp((b - 3.2) / 0.4)));
        ctx.beginPath(); const [l0x, l0y] = P(0.26, -0.48), [l1x] = P(0.32, -0.48); ctx.moveTo(l0x, l0y); ctx.lineTo(l1x, l0y); ctx.lineTo(P(0.43, 0.12)[0], P(0.43, 0.12)[1]); ctx.lineTo(P(0.15, 0.12)[0], P(0.15, 0.12)[1]); ctx.closePath(); ctx.fill();
      }
      // wafer: a disc split into dies that light up one by one after the lever lands
      const wc = P(0.29, 0.16), wr = 0.12 * U;
      G.disc(ctx, wc, wr, soft);
      ctx.save(); ctx.beginPath(); ctx.arc(wc[0], wc[1], wr, 0, 7); ctx.clip();
      const n = 5, g = (2 * wr) / n; let k = 0;
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++, k++) {
        const on = b - 2.05 - k * 0.07;
        if (on > 0) { ctx.fillStyle = col; const s = g * 0.8 * expOut(on / 0.25); ctx.fillRect(wc[0] - wr + i * g + (g - s) / 2, wc[1] - wr + j * g + (g - s) / 2, s, s); }
      }
      ctx.restore();
      G.ring(ctx, wc, wr, 0.016 * U, col);
      G.disc(ctx, P(...piv), 0.03 * U, col);
      G.capsule(ctx, P(...piv), P(...tip), 0.03 * U, col);
    } };
  },
  // 1988 — a banner swings up to vertical on beat 2 and unfurls.
  flag(b, th) {
    const phi = lerp(62, 0, expOut(clamp((b - 0.6) / 1.4)));
    const L = [0.15, -0.02], d = [Math.sin(phi * E.D2R), -Math.cos(phi * E.D2R)];
    const up = [L[0] + d[0] * 0.24, L[1] + d[1] * 0.24];
    const spec = resolve({ tor: -2, hd: -8, hn: up, hf: L, fn: [0.12, GROUND], ff: [-0.1, GROUND] });
    return { spec, props: { mid(ctx, S, J, col, v) {
      const U = v.U, P = (p) => T(v, p);
      const base = [L[0] - d[0] * 0.3, L[1] - d[1] * 0.3], top = [L[0] + d[0] * 0.78, L[1] + d[1] * 0.78];
      G.capsule(ctx, P(base), P(top), 0.03 * U, col);
      const un = expOut(clamp((b - 1.9) / 0.6));
      if (un > 0) {
        const n = 6, fw = 0.42 * un, fh = 0.26;
        for (let i = 0; i < n; i++) {
          const x0 = top[0] + (i / n) * fw, w = fw / n + 0.002, wav = 0.02 * Math.sin(TAU * (b * 0.8 - i / n)) * un;
          const [sx, sy] = P([x0, top[1] + wav]);
          ctx.fillStyle = i % 2 ? col : css(mix(th.fig, th.disc, 0.35));
          ctx.fillRect(Math.min(sx, sx + w * U * v.f), sy, w * U, fh * U);
        }
      }
    } } };
  },
  // 1999 — shooting; pixel squares pop out on beats 1, 2, 3.
  digital(b, th) {
    const rec = (k) => (b > k && b < k + 0.3 ? 0.012 * Math.sin(Math.PI * (b - k) / 0.3) : 0);
    const spec = resolve({ x: -0.12, y: rec(1) + rec(2) + rec(3), tor: 6, hd: 10, hn: [0.09, -0.35], hf: [0.01, -0.37], fn: [-0.02, GROUND], ff: [-0.22, GROUND] });
    return { spec, props: { front(ctx, S, J, col, v) {
      const U = v.U, m = mid(S.hn, S.hf);
      camSide(ctx, [m[0] + 0.02 * U * v.f, m[1] - 0.02 * U], 0.15 * U, 0, col, 0.3);
      const o = [m[0] + 0.14 * U * v.f, m[1] - 0.02 * U];
      for (let k = 1; k <= 3; k++) {
        const t = (b - k) / 0.9; if (t <= 0 || t >= 1) continue;
        const e = expOut(t);
        for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
          const s = 0.06 * U * (1 - t * 0.7), gx = o[0] + (0.06 + e * (0.12 + i * 0.08)) * U * v.f, gy = o[1] + ((j - 1) * 0.08 * e + 0.05 * (k - 2) * e) * U;
          ctx.fillStyle = (i + j + k) % 2 ? col : css(mix(th.fig, th.disc, 0.4)); ctx.fillRect(gx - s / 2, gy - s / 2, s, s);
        }
      }
    } } };
  },
  // 2007 — kneeling with a long lens; a full-frame rectangle flies out on beat 2.
  kneel(b, th) {
    const spec = resolve({ x: -0.1, y: 0.2, tor: 12, hd: 14, hn: [0.2, -0.17], hf: [0.08, -0.2], fn: [-0.36, GROUND], kn: -1, ff: [0.1, GROUND], kf: -1 });
    spec.y += b > 2 && b < 2.4 ? 0.01 * Math.sin(Math.PI * (b - 2) / 0.4) : 0;
    return { spec, props: { front(ctx, S, J, col, v) {
      const U = v.U, m = S.hf;
      camSide(ctx, [m[0] + 0.03 * U * v.f, m[1] - 0.04 * U], 0.15 * U, 0, col, 1.05, 0.25);
      const tip = [m[0] + 0.3 * U * v.f, m[1] - 0.04 * U];
      const t = beatT(b, 2, 0.9);
      if (t > 0 && t < 1) {
        const e = expOut(t), w = (0.1 + 0.32 * e) * U, h = w * 2 / 3;
        ctx.strokeStyle = col; ctx.lineWidth = 0.02 * U * (1 - t * 0.6);
        ctx.strokeRect(tip[0] + (0.08 + 0.18 * e) * U * v.f - w / 2, tip[1] - h / 2, w, h);
      }
    } } };
  },
  // 2008 — walking while filming; the REC dot blinks on every beat.
  pan(b, th) {
    const w = walkSpec(b, { stride: 0.16, x: -0.06, tor: 6 });
    const spec = resolve(Object.assign(w, { hd: 10, hn: [0.13 + w.x, -0.34 + w.y], hf: [0.05 + w.x, -0.36 + w.y], an: undefined, af: undefined }));
    return { spec, props: { front(ctx, S, J, col, v) {
      const U = v.U, m = mid(S.hn, S.hf);
      camSide(ctx, [m[0] + 0.02 * U * v.f, m[1] - 0.02 * U], 0.15 * U, 0, col, 0.3);
      if ((b % 1) < 0.5) G.disc(ctx, [m[0] + 0.1 * U * v.f, m[1] - 0.085 * U], 0.022 * U, css(E.hex('#E5432F')));
      ctx.strokeStyle = col; ctx.lineWidth = 0.016 * U;
      for (let k = 0; k < 3; k++) {
        const ph = (b + k / 3) % 1, x = m[0] + (0.26 + ph * 0.42) * U * v.f, w = 0.1 * U * (1 - ph * 0.5), h = w * 0.66;
        ctx.strokeRect(x - w / 2, m[1] - 0.02 * U - h / 2, w, h);
      }
    } } };
  },
  // 2018 — run-up, leap through the mount ring (beats 2→4), land on beat 4, arms up on beat 6.
  leap(b, th) {
    let spec;
    const air = clamp((b - 2) / 2);
    if (b < 2) spec = runSpec(b, { x: -0.6 });
    else if (b < 4) {
      const x = lerp(-0.6, 0.55, air), y = -0.3 * Math.sin(Math.PI * air) - 0.02;
      spec = { x, y, tor: 14, hd: 6, fn: [x + 0.32, y + 0.24], ff: [x - 0.3, y + 0.28], kf: -1, an: [150, 20], af: [120, 30] };
    } else {
      const land = expOut(clamp((b - 4) / 0.5)), up = expOut(clamp((b - 6) / 0.5));
      const y = 0.08 * (1 - land) + 0.06 * Math.max(0, 1 - Math.abs(b - 4.15) / 0.3);
      spec = { x: 0.55, y, tor: 10 * (1 - up), hd: -12 * up, fn: [0.66, GROUND], ff: [0.42, GROUND], an: [lerp(40, 165, up), 10], af: [lerp(-30, 150, up), 10] };
    }
    spec = resolve(spec);
    const C = [0.0, -0.06], rx = 0.11, ry = 0.66;
    const arc = (ctx, v, a0, a1, col) => { const U = v.U, p = T(v, C); ctx.strokeStyle = col; ctx.lineWidth = 0.075 * U; ctx.lineCap = 'round'; ctx.beginPath(); ctx.ellipse(p[0], p[1], rx * U, ry * U, 0, a0, a1); ctx.stroke(); };
    return { spec,
      env(ctx, v) { arc(ctx, v, Math.PI / 2, Math.PI * 1.5, css(mix(th.fig, th.disc, 0.4))); },
      envFront(ctx, v) { arc(ctx, v, -Math.PI / 2, Math.PI / 2, css(th.fig)); burst(ctx, T(v, [0.55, GROUND]), 0.4 * v.U, 0.03 * v.U, css(th.fig), beatT(b, 4, 0.6)); } };
  },
  // 2021 — a sprinter; burst frames flash on each beat. A second runner sits behind.
  sprint(b, th) {
    const spec = resolve(runSpec(b, { rate: 2 }));
    const back = resolve(runSpec(b + 0.5, { rate: 2, x: -0.05 }));
    return { spec, others: [{ spec: back, dx: -0.34, dy: -0.02, mixAmt: 0.6 }],
      env(ctx, v) {
        const U = v.U;
        for (let k = 0; k < 5; k++) { const ph = ((b * 1.6 + k * 0.29) % 1), y = (-0.4 + k * 0.17); G.capsule(ctx, T(v, [0.7 - ph * 1.7, y]), T(v, [0.7 - ph * 1.7 + 0.22, y]), 0.025 * U, css(mix(th.fig, th.disc, 0.6))); }
      },
      envFront(ctx, v) {
        const U = v.U, fr = b % 1;
        if (fr < 0.22) {
          const c = T(v, [0.04, -0.03]), w = 0.62 * U, h = 1.18 * U, l = 0.1 * U;
          ctx.strokeStyle = css(th.fig); ctx.lineWidth = 0.022 * U; ctx.lineCap = 'butt';
          for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const x = c[0] + sx * w / 2, y = c[1] + sy * h / 2; ctx.beginPath(); ctx.moveTo(x - sx * l, y); ctx.lineTo(x, y); ctx.lineTo(x, y - sy * l); ctx.stroke(); }
        }
      } };
  },
  // 2024 — walking with a shoulder-mounted cinema camera.
  rig(b, th) {
    const w = walkSpec(b, { stride: 0.2, tor: 3 });
    const spec = resolve(Object.assign(w, { hd: 6, hn: [0.3, -0.24 + w.y], hf: [0.2, -0.3 + w.y], an: undefined, af: undefined }));
    return { spec, props: { mid(ctx, S, J, col, v) {
      const U = v.U, s = S.sh;
      ctx.save(); ctx.translate(s[0] + 0.03 * U * v.f, s[1] - 0.09 * U); ctx.fillStyle = col;
      ctx.scale(v.f, 1);
      ctx.beginPath(); ctx.roundRect(-0.12 * U, 0.0, 0.2 * U, 0.06 * U, 0.03 * U); ctx.fill();
      ctx.beginPath(); ctx.roundRect(0.08 * U, -0.11 * U, 0.26 * U, 0.16 * U, 0.03 * U); ctx.fill();
      ctx.beginPath(); ctx.roundRect(0.33 * U, -0.085 * U, 0.17 * U, 0.11 * U, 0.025 * U); ctx.fill();
      ctx.beginPath(); ctx.roundRect(0.12 * U, -0.17 * U, 0.12 * U, 0.05 * U, 0.02 * U); ctx.fill();
      if ((b % 1) < 0.5) G.disc(ctx, [0.3 * U, -0.145 * U], 0.022 * U, css(E.hex('#E5432F')));
      ctx.restore();
    } } };
  },
  // 2025 — low-mode gimbal, crouch-walking.
  gimbal(b, th) {
    const w = walkSpec(b, { stride: 0.2, y: 0.07, tor: 20, x: -0.06 });
    w.fn[1] = GROUND; w.ff[1] = Math.min(w.ff[1], GROUND);
    const spec = resolve(Object.assign(w, { hd: 18, hn: [0.2 + w.x, -0.04 + w.y], hf: [0.14 + w.x, -0.05 + w.y], an: undefined, af: undefined }));
    return { spec, props: { front(ctx, S, J, col, v) {
      const U = v.U, h = mid(S.hn, S.hf);
      G.capsule(ctx, [h[0] - 0.08 * U * v.f, h[1]], [h[0] + 0.14 * U * v.f, h[1]], 0.03 * U, col);
      const sway = 0.02 * Math.sin(TAU * b / 2);
      const cam = [h[0] + (0.14 + sway) * U * v.f, h[1] + 0.2 * U];
      G.line(ctx, [h[0] + 0.14 * U * v.f, h[1]], [cam[0], cam[1] - 0.06 * U], 0.02 * U, col);
      camSide(ctx, cam, 0.16 * U, 0, col, 0.28);
    } } };
  },

  // ----- chapter 5: focal lengths (2-beat cards) -----
  stars(b, th) {
    const spec = resolve({ x: 0, y: 0.18, rot: -90, tor: 0, hd: 0, hn: [0.34, -0.18], hf: [0.3, -0.24], fn: [0.2, 0.3], ff: [0.24, 0.38], kn: 1, kf: 1 });
    return { spec, stage: { dx: 50, figDy: 0.18 }, env(ctx, v) {
      const U = v.U;
      for (let k = 0; k < 14; k++) { const a = Math.PI * (1.05 + k * 0.065), p = T(v, [0.2 + Math.cos(a) * 0.9, 0.55 + Math.sin(a) * 0.9]); G.disc(ctx, p, (k % 3 ? 0.012 : 0.02) * U, css(th.fig)); }
      for (let k = 0; k < 4; k++) sparkle(ctx, T(v, [-0.3 + k * 0.24, -0.62 + (k % 2) * 0.14]), 0.06 * U, css(th.fig), ((b + k * 0.25) % 1));
    }, props: { front(ctx, S, J, col, v) { const m = mid(S.hn, S.hf); camSide(ctx, m, 0.13 * v.U, -Math.PI / 2, col, 0.24); } } };
  },
  summit(b, th) {
    const spec = resolve(keyPose([
      [0, { tor: 0, hn: [0.1, 0.02], hf: [-0.1, 0.02], fn: [0.08, GROUND], ff: [-0.08, GROUND] }],
      [1, { tor: -4, hd: -10, hn: [0.26, -0.62], hf: [-0.2, -0.62], fn: [0.08, GROUND], ff: [-0.08, GROUND] }, expOut],
      [2, { tor: -4, hd: -10, hn: [0.27, -0.63], hf: [-0.2, -0.63], fn: [0.08, GROUND], ff: [-0.08, GROUND] }],
    ], b));
    return { spec, stage: { figDy: -0.26 }, env(ctx, v) {
      const P = (x, y) => T(v, [x, y]);
      ctx.save(); ctx.beginPath(); ctx.arc(v.disc.cx, v.disc.cy, v.disc.R, 0, 7); ctx.clip();
      ctx.fillStyle = css(mix(th.fig, th.disc, 0.45)); ctx.beginPath(); ctx.moveTo(...P(-0.9, 1.2)); ctx.lineTo(...P(0, GROUND)); ctx.lineTo(...P(0.9, 1.2)); ctx.fill();
      ctx.fillStyle = css(th.fig); ctx.beginPath(); ctx.moveTo(...P(-0.16, GROUND + 0.2)); ctx.lineTo(...P(0, GROUND)); ctx.lineTo(...P(0.16, GROUND + 0.2)); ctx.fill();
      ctx.restore();
    } };
  },
  street(b, th) {
    const spec = resolve(walkSpec(b * 1, { stride: 0.26, x: -0.1 }));
    return { spec, env(ctx, v) {
      const U = v.U, col = css(th.fig);
      G.line(ctx, T(v, [0.42, GROUND]), T(v, [0.42, -0.7]), 0.03 * U, col);
      G.capsule(ctx, T(v, [0.42, -0.7]), T(v, [0.3, -0.7]), 0.03 * U, col);
      G.disc(ctx, T(v, [0.29, -0.65]), 0.045 * U, col);
      G.capsule(ctx, T(v, [-0.8, GROUND + 0.03]), T(v, [0.8, GROUND + 0.03]), 0.02 * U, css(mix(th.fig, th.disc, 0.5)));
    } };
  },
  cup(b, th) {
    const sip = expOut(clamp(b / 1)) - expInOut(clamp((b - 1.5) / 0.5)) * 0.4;
    const spec = resolve({ y: 0.17, tor: -2, hd: lerp(0, -10, sip), hn: [lerp(0.18, 0.1, sip), lerp(0.08, -0.38, sip)], hf: [0.16, 0.12], fn: [0.28, GROUND], ff: [0.22, GROUND] });
    return { spec, env(ctx, v) {
      const U = v.U, col = css(th.fig);
      G.capsule(ctx, T(v, [-0.12, 0.2]), T(v, [0.12, 0.2]), 0.05 * U, col);
      G.line(ctx, T(v, [0, 0.22]), T(v, [0, GROUND]), 0.035 * U, col);
      G.capsule(ctx, T(v, [-0.1, GROUND]), T(v, [0.1, GROUND]), 0.035 * U, col);
    }, props: { front(ctx, S, J, col, v) { const U = v.U, h = S.hn; G.rrect(ctx, h[0] - 0.035 * U, h[1] - 0.075 * U, 0.07 * U, 0.08 * U, 0.015 * U, col); G.ring(ctx, [h[0] + 0.045 * U * v.f, h[1] - 0.04 * U], 0.022 * U, 0.012 * U, col); } } };
  },
  portrait(b, th) {
    const spec = resolve(keyPose([
      [0, { x: 0.02, tor: -3, hd: 0, hn: [0.1, 0.04], hf: [-0.05, -0.02], bf: -1, fn: [0.1, GROUND], ff: [-0.02, GROUND] }],
      [1, { x: 0.03, tor: -6, hd: -16, hn: [0.06, -0.47], bn: -1, hf: [-0.05, -0.02], bf: -1, fn: [0.12, GROUND], ff: [-0.02, GROUND] }, expOut],
      [2, { x: 0.03, tor: -6, hd: -16, hn: [0.06, -0.47], bn: -1, hf: [-0.05, -0.02], bf: -1, fn: [0.12, GROUND], ff: [-0.02, GROUND] }],
    ], b));
    return { spec };
  },
  macro(b, th) {
    const spec = resolve({ x: -0.18, y: 0.24, tor: 38, hd: 22, hn: [0.06, 0.1], hf: [0.0, 0.12], fn: [0.0, GROUND], ff: [-0.12, GROUND], kn: -1, kf: -1 });
    return { spec, env(ctx, v) {
      const U = v.U, col = css(th.fig), c = [0.32, 0.18];
      G.line(ctx, T(v, [c[0], GROUND]), T(v, c), 0.02 * U, col);
      G.capsule(ctx, T(v, [c[0], 0.38]), T(v, [c[0] + 0.08, 0.32]), 0.03 * U, col);
      const open = expOut(clamp(b / 0.8));
      for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + b * 0.2; G.disc(ctx, T(v, [c[0] + Math.cos(a) * 0.06 * open, c[1] + Math.sin(a) * 0.06 * open]), 0.045 * U, css(mix(th.fig, th.disc, 0.35))); }
      G.disc(ctx, T(v, c), 0.035 * U, col);
      const d = clamp((b - 1) / 0.4); if (d > 0) G.disc(ctx, T(v, [c[0] - 0.07, c[1] - 0.09 + 0.02 * expInOut(clamp((b - 1.4) / 0.6))]), 0.022 * U * expOut(d), col);
    } };
  },
  hoops(b, th) {
    const up = Math.sin(Math.PI * clamp((b - 0.4) / 1.2));
    const spec = resolve(keyPose([
      [0, { y: 0.06, tor: 8, hn: [0.14, -0.2], hf: [0.08, -0.22], fn: [0.06, GROUND], ff: [-0.08, GROUND] }],
      [1, { y: -0.16, tor: -2, hd: -12, hn: [0.14, -0.66], hf: [0.06, -0.62], fn: [0.04, GROUND - 0.18], ff: [-0.06, GROUND - 0.14] }, expOut],
      [2, { y: 0, tor: 0, hd: -12, hn: [0.16, -0.6], hf: [0.06, -0.58], fn: [0.06, GROUND], ff: [-0.08, GROUND] }, expInOut],
    ], b));
    void up;
    return { spec, env(ctx, v) {
      const U = v.U, col = css(th.fig), hoop = [0.6, -0.72];
      G.line(ctx, T(v, [0.78, -0.95]), T(v, [0.78, -0.52]), 0.03 * U, col);
      G.capsule(ctx, T(v, [hoop[0] - 0.1, hoop[1]]), T(v, [hoop[0] + 0.1, hoop[1]]), 0.025 * U, col);
    }, props: { front(ctx, S, J, col, v) {
      const U = v.U, h = mid(S.hn, S.hf), r = clamp((b - 1) / 0.9);
      const p = r <= 0 ? [h[0], h[1] - 0.05 * U] : [lerp(h[0], T(v, [0.6, -0.8])[0], r), lerp(h[1] - 0.05 * U, T(v, [0.6, -0.8])[1], r) - Math.sin(Math.PI * r) * 0.25 * U];
      G.disc(ctx, p, 0.06 * U, col);
    } } };
  },
  hurdle(b, th) {
    const a = clamp(b / 2), x = lerp(-0.45, 0.45, a), y = -0.2 * Math.sin(Math.PI * a);
    const spec = resolve({ x, y, tor: 30, hd: -6, fn: [x + 0.44, y + 0.12], ff: [x - 0.2, y + 0.16], kf: -1, an: [40, 20], af: [140, 10] });
    return { spec, env(ctx, v) {
      const U = v.U, col = css(th.fig);
      G.capsule(ctx, T(v, [-0.12, 0.2]), T(v, [0.12, 0.2]), 0.04 * U, col);
      G.line(ctx, T(v, [-0.1, 0.2]), T(v, [-0.1, GROUND]), 0.025 * U, col);
      G.line(ctx, T(v, [0.1, 0.2]), T(v, [0.1, GROUND]), 0.025 * U, col);
    } };
  },
  bird(b, th) {
    const rise = expInOut(clamp((b - 0.5) / 1.3)), flap = Math.sin(TAU * b * 2 - Math.PI / 2);
    return { spec: null, stage: { noFigure: true }, env(ctx, v) {
      const U = v.U, col = css(th.fig), soft = css(mix(th.fig, th.disc, 0.4)), P = (x, y) => T(v, [x, y]);
      G.capsule(ctx, P(-0.7, 0.36), P(0.25, 0.44), 0.035 * U, soft);
      const c = [lerp(-0.08, 0.22, rise), lerp(0.2, -0.32, rise)], tilt = -0.35 * rise;
      ctx.save(); ctx.translate(...P(c[0], c[1])); ctx.rotate(tilt);
      const wingA = (lerp(20, 75, Math.max(rise, 0.15)) * flap) * E.D2R;
      const wing = (lag, r) => [-0.02 * U - Math.cos(Math.PI / 2 + wingA * lag) * r * 0.45 * U, -Math.sin(Math.PI / 2 + wingA * lag) * r * U];
      const W1 = wing(0.8, 0.36); G.capsule(ctx, [0, -0.02 * U], W1, 0.075 * U, soft);
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-0.2 * U, -0.01 * U); ctx.lineTo(-0.34 * U, -0.07 * U); ctx.lineTo(-0.32 * U, 0.05 * U); ctx.fill();
      G.capsule(ctx, [-0.18 * U, 0.0], [0.12 * U, -0.03 * U], 0.14 * U, col);
      G.disc(ctx, [0.18 * U, -0.09 * U], 0.07 * U, col);
      ctx.beginPath(); ctx.moveTo(0.23 * U, -0.12 * U); ctx.lineTo(0.34 * U, -0.08 * U); ctx.lineTo(0.23 * U, -0.06 * U); ctx.fill();
      const W2 = wing(1, 0.4); G.capsule(ctx, [0, -0.02 * U], W2, 0.08 * U, col);
      if (rise < 0.25) { G.line(ctx, [-0.02 * U, 0.06 * U], [-0.04 * U, 0.17 * U], 0.02 * U, col); G.line(ctx, [0.04 * U, 0.06 * U], [0.04 * U, 0.17 * U], 0.02 * U, col); }
      ctx.restore();
    } };
  },
  moon(b, th) {
    const spec = resolve({ tor: 4, hd: -14, hn: [0.14, -0.33], hf: [0.06, -0.36], fn: [0.08, GROUND], ff: [-0.1, GROUND] });
    return { spec, stage: { disc: 'moon', figScale: 0.42, figDy: 0.36, figDx: -0.34 }, env(ctx, v) {
      const U = v.U, col = css(th.fig);
      for (const [x, y, r] of [[0.2, -0.6, 0.12], [0.5, -0.2, 0.08], [0.1, 0.0, 0.06], [0.6, -0.9, 0.05]]) G.disc(ctx, T(v, [x, y]), r * U, css(mix(th.fig, th.disc, 0.72)));
      burst(ctx, T(v, [0.2, -0.6]), 0.3 * U, 0.03 * U, col, beatT(b, 1, 0.7));
    }, props: { front(ctx, S, J, col, v) {
      const U = v.U, m = mid(S.hn, S.hf);
      camSide(ctx, [m[0] + 0.04 * U * v.f, m[1] - 0.03 * U], 0.16 * U, -0.55 * v.f, col, 1.3, 0.28);
      G.line(ctx, [m[0] + 0.1 * U * v.f, m[1] + 0.04 * U], [m[0] + 0.0 * U, m[1] + 0.86 * U], 0.03 * U, col);
      G.line(ctx, [m[0] + 0.1 * U * v.f, m[1] + 0.04 * U], [m[0] + 0.26 * U * v.f, m[1] + 0.86 * U], 0.03 * U, col);
    } } };
  },
};

module.exports = { ACTS, GROUND, camSide, burst, sparkle };
