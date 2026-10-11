'use strict';
// 绘制：形状、角色、背景、瓦片、HUD

const FONT_UI = '"Fredoka", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif';
const FONT_DISPLAY = '"ZCOOL QingKe HuangYou", "PingFang SC", "Microsoft YaHei", sans-serif';

function rrect(ctx, x, y, w, h, r) {
  // r 可以是数字或 [tl, tr, br, bl]
  let tl, tr, br, bl;
  if (Array.isArray(r)) [tl, tr, br, bl] = r;
  else tl = tr = br = bl = r;
  const m = Math.min(w, h) / 2;
  tl = Math.min(tl, m); tr = Math.min(tr, m); br = Math.min(br, m); bl = Math.min(bl, m);
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  if (tr) ctx.arcTo(x + w, y, x + w, y + tr, tr); else ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h - br);
  if (br) ctx.arcTo(x + w, y + h, x + w - br, y + h, br); else ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + bl, y + h);
  if (bl) ctx.arcTo(x, y + h, x, y + h - bl, bl); else ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + tl);
  if (tl) ctx.arcTo(x, y, x + tl, y, tl); else ctx.lineTo(x, y);
  ctx.closePath();
}

function polyRound(ctx, pts, r) {
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
    const mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2;
    if (i === 0) ctx.moveTo(mx, my);
    ctx.arcTo(p1[0], p1[1], (p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, r);
  }
  ctx.closePath();
}

function shapePath(ctx, shape, cx, cy, w, h) {
  ctx.beginPath();
  if (shape === 'square') rrect(ctx, cx - w / 2, cy - h / 2, w, h, w * 0.2);
  else if (shape === 'circle') ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
  else if (shape === 'triangle') polyRound(ctx, [[cx, cy - h / 2 - 2], [cx + w / 2 + 2, cy + h / 2], [cx - w / 2 - 2, cy + h / 2]], 4);
  else if (shape === 'diamond') polyRound(ctx, [[cx, cy - h / 2 - 2], [cx + w / 2 + 1, cy], [cx, cy + h / 2], [cx - w / 2 - 1, cy]], 3.5);
  else if (shape === 'star') {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 === 0 ? 1 : 0.48;
      pts.push([cx + Math.cos(a) * (w / 2 + 2) * r, cy + 2 + Math.sin(a) * (h / 2 + 2) * r]);
    }
    polyRound(ctx, pts, 2.5);
  }
}

function heartPath(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.42);
  ctx.bezierCurveTo(cx - s * 0.62, cy - s * 0.02, cx - s * 0.42, cy - s * 0.58, cx, cy - s * 0.26);
  ctx.bezierCurveTo(cx + s * 0.42, cy - s * 0.58, cx + s * 0.62, cy - s * 0.02, cx, cy + s * 0.42);
  ctx.closePath();
}

function gemPath(ctx, cx, cy, s) {
  ctx.beginPath();
  polyRound(ctx, [[cx, cy - s * 0.55], [cx + s * 0.45, cy - s * 0.08], [cx, cy + s * 0.55], [cx - s * 0.45, cy - s * 0.08]], 2);
}

// 角色：x,y 为脚底中心
function drawCharacter(ctx, ch, x, y, o = {}) {
  const sx = o.sx || 1, sy = o.sy || 1;
  const size = (o.size || 28);
  const w = size * sx, h = size * sy;
  const cx = x, cy = y - h / 2;
  const color = o.color || ch.color;
  ctx.save();
  if (o.alpha != null) ctx.globalAlpha = o.alpha;
  if (o.rot) {
    ctx.translate(cx, cy);
    ctx.rotate(o.rot);
    ctx.translate(-cx, -cy);
  }
  shapePath(ctx, ch.shape, cx, cy, w, h);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = shade(color, -0.14);
  ctx.fillRect(cx - w, cy + h * 0.18, w * 2, h);
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.beginPath();
  ctx.ellipse(cx - w * 0.2, cy - h * 0.28, w * 0.22, h * 0.1, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (o.flash) {
    shapePath(ctx, ch.shape, cx, cy, w, h);
    ctx.fillStyle = 'rgba(255,255,255,' + o.flash + ')';
    ctx.fill();
  }
  // 眼睛
  const face = o.facing || 1;
  let ey = cy - h * 0.04;
  if (ch.shape === 'triangle') ey = cy + h * 0.14;
  if (ch.shape === 'star') ey = cy + h * 0.06;
  const spread = w * (ch.shape === 'triangle' ? 0.16 : 0.2);
  const ex = cx + face * w * 0.08;
  const lookX = (o.lookX || 0) + face * 0.6;
  const lookY = o.lookY || 0;
  const blink = o.blink ? 0.15 : 1;
  const er = Math.max(2.6, size * 0.12);
  for (const s of [-1, 1]) {
    const px = ex + s * spread;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(px, ey, er * 0.92, er * 1.15 * blink, 0, 0, Math.PI * 2);
    ctx.fill();
    if (blink === 1) {
      ctx.fillStyle = '#1D2030';
      ctx.beginPath();
      ctx.ellipse(px + lookX * er * 0.38, ey + lookY * er * 0.4, er * 0.5, er * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (o.happy) {
    ctx.strokeStyle = '#1D2030';
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(ex, ey + er * 1.6, er * 0.7, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }
  ctx.restore();
}

// —— 背景 ——
const BG_CACHE = {};
function bgLayer(kind, layer) {
  const key = kind + layer;
  if (BG_CACHE[key]) return BG_CACHE[key];
  const rng = mulberry32(kind.length * 131 + layer * 977 + 5);
  const items = [];
  const period = 1800;
  let x = 0;
  while (x < period) {
    const s = 0.6 + rng() * 0.8;
    items.push({ x, s, r: rng(), r2: rng() });
    x += (kind === 'night' ? 70 : 150 + layer * 40) * (0.6 + rng() * 0.9);
  }
  BG_CACHE[key] = { items, period };
  return BG_CACHE[key];
}

function drawBackground(ctx, world, camX, camY, vw, vh, t, mapH) {
  const p = world.pal;
  const g = ctx.createLinearGradient(0, 0, 0, vh);
  g.addColorStop(0, p.sky);
  g.addColorStop(1, p.sky2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, vw, vh);
  const kind = world.bg;
  // 视差基线：地图底部附近
  const base = (mapH != null ? mapH - camY : vh) ;
  const horizon = Math.min(vh * 1.05, Math.max(vh * 0.55, base - 120));

  if (kind === 'night') {
    // 星星
    const st = bgLayer('night', 0);
    ctx.fillStyle = p.deco;
    for (const it of st.items) {
      const px = ((it.x - camX * 0.05) % st.period + st.period) % st.period;
      for (let k = 0; px + k * st.period < vw + 10; k++) {
        const xx = px + k * st.period;
        const yy = (it.r * vh * 0.8 - camY * 0.03 + vh) % vh;
        const tw = 0.5 + 0.5 * Math.sin(t * (1 + it.r2 * 2) + it.r * 10);
        ctx.globalAlpha = 0.35 + tw * 0.6;
        const s = 1 + it.s * 1.2;
        ctx.fillRect(xx - s / 2, yy - s / 2, s, s);
      }
    }
    ctx.globalAlpha = 1;
    // 月亮
    const mx = vw * 0.78 - camX * 0.01, my = vh * 0.2;
    ctx.fillStyle = '#FFF3C4';
    ctx.beginPath();
    ctx.arc(mx, my, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.sky;
    ctx.beginPath();
    ctx.arc(mx + 14, my - 8, 30, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // 太阳/光晕与云
    const sunX = vw * 0.8 - camX * 0.02, sunY = vh * 0.18;
    ctx.fillStyle = rgba('#FFFFFF', 0.5);
    ctx.beginPath();
    ctx.arc(sunX, sunY, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = kind === 'mesas' ? '#FFE3B8' : '#FFFFFF';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 30, 0, Math.PI * 2);
    ctx.fill();
    const cl = bgLayer(kind + 'cloud', 9);
    ctx.fillStyle = rgba('#FFFFFF', 0.75);
    for (const it of cl.items) {
      if (it.r > 0.45) continue;
      const span = cl.period;
      const px = ((it.x - camX * 0.08 - t * 6) % span + span) % span - 100;
      for (let k = 0; px + k * span < vw + 120; k++) {
        const xx = px + k * span;
        const yy = 30 + it.r2 * vh * 0.32 - camY * 0.04;
        const w = 60 + it.s * 50;
        ctx.beginPath();
        rrect(ctx, xx, yy, w, 18, 9);
        rrect(ctx, xx + w * 0.2, yy - 10, w * 0.45, 20, 10);
        ctx.fill();
      }
    }
  }

  const layers = [
    { c: p.far, par: 0.12, h: 0.42 },
    { c: p.mid, par: 0.24, h: 0.3 },
    { c: p.near, par: 0.4, h: 0.2 },
  ];
  layers.forEach((L, li) => {
    const data = bgLayer(kind, li + 1);
    ctx.fillStyle = L.c;
    const yb = horizon + li * 26 - camY * L.par * 0.25;
    ctx.beginPath();
    for (const it of data.items) {
      const span = data.period;
      const px = ((it.x - camX * L.par) % span + span) % span - 200;
      for (let k = 0; px + k * span < vw + 260; k++) {
        const xx = px + k * span;
        const s = it.s;
        const hh = vh * L.h * s;
        if (kind === 'hills') {
          const r = 90 + 80 * s;
          ctx.moveTo(xx + r, yb);
          ctx.arc(xx, yb, r, 0, Math.PI, true);
        } else if (kind === 'mesas') {
          const w = 110 + 120 * s;
          rrect(ctx, xx - w / 2, yb - hh, w, hh + 4, [10, 10, 0, 0]);
          if (it.r > 0.5) rrect(ctx, xx - w * 0.2, yb - hh - 26, w * 0.4, 30, [8, 8, 0, 0]);
        } else if (kind === 'peaks') {
          const w = 150 + 140 * s;
          ctx.moveTo(xx - w / 2, yb);
          ctx.lineTo(xx, yb - hh * 1.3);
          ctx.lineTo(xx + w / 2, yb);
        } else {
          const w = 46 + 40 * s;
          const yy = yb - hh * 0.9 + Math.sin(t * 0.6 + it.r * 6) * 6;
          if (li === 0) {
            ctx.moveTo(xx, yy - w / 2);
            ctx.lineTo(xx + w / 3, yy);
            ctx.lineTo(xx, yy + w / 2);
            ctx.lineTo(xx - w / 3, yy);
            ctx.closePath();
          } else {
            const r = 100 + 70 * s;
            ctx.moveTo(xx + r, yb);
            ctx.arc(xx, yb, r, 0, Math.PI, true);
          }
        }
      }
    }
    ctx.fill();
    if (kind === 'peaks') {
      // 雪顶
      ctx.fillStyle = rgba('#FFFFFF', 0.85 - li * 0.15);
      ctx.beginPath();
      for (const it of data.items) {
        const span = data.period;
        const px = ((it.x - camX * L.par) % span + span) % span - 200;
        for (let k = 0; px + k * span < vw + 260; k++) {
          const xx = px + k * span;
          const hh = vh * L.h * it.s * 1.3;
          const w = 150 + 140 * it.s;
          const f = 0.28;
          ctx.moveTo(xx, yb - hh);
          ctx.lineTo(xx + (w / 2) * f, yb - hh * (1 - f));
          ctx.lineTo(xx, yb - hh * (1 - f * 0.7));
          ctx.lineTo(xx - (w / 2) * f, yb - hh * (1 - f));
          ctx.closePath();
        }
      }
      ctx.fill();
    }
    ctx.fillStyle = L.c;
    ctx.fillRect(0, yb - 1, vw, vh - yb + 400);
  });
}

// —— 瓦片 ——
function tileHash(x, y) {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function drawTiles(ctx, map, world, x0, y0, x1, y1, t, fx) {
  const p = world.pal;
  const T = TILE;
  const ov = 0.6;
  const isG = (x, y) => { const c = map.get(x, y); return c === '#' ; };
  const sol = (x, y) => map.solid(x, y);
  // 地面主体
  ctx.fillStyle = p.ground;
  ctx.beginPath();
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (!isG(x, y)) continue;
      const up = sol(x, y - 1), dn = sol(x, y + 1), lf = sol(x - 1, y), rt = sol(x + 1, y);
      const r = 9;
      rrect(ctx, x * T, y * T, T + ov, T + ov, [!up && !lf ? r : 0, !up && !rt ? r : 0, !dn && !rt ? r : 0, !dn && !lf ? r : 0]);
    }
  }
  ctx.fill();
  // 纹理点
  ctx.fillStyle = shade(p.ground, world.bg === 'night' ? 0.08 : -0.1);
  ctx.beginPath();
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (!isG(x, y) || !sol(x, y - 1)) continue;
      const h = tileHash(x, y);
      if (h < 0.45) {
        const px = x * T + 6 + h * 40 % 20, py = y * T + 8 + (h * 97 % 16);
        ctx.moveTo(px + 2.5, py);
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      }
    }
  }
  ctx.fill();
  // 顶面（草/沙/雪/光）
  ctx.fillStyle = p.top;
  ctx.beginPath();
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (!isG(x, y) || sol(x, y - 1)) continue;
      const lf = sol(x - 1, y), rt = sol(x + 1, y);
      const capH = world.bg === 'peaks' ? 10 : 8;
      rrect(ctx, x * T - (lf ? 0 : 0), y * T, T + ov, capH, [lf ? 0 : 8, rt ? 0 : 8, 3, 3]);
      const h = tileHash(x, y);
      if (world.bg === 'peaks' && h < 0.5) {
        const dx = x * T + 6 + h * 36;
        ctx.moveTo(dx + 4, y * T + capH);
        ctx.arc(dx, y * T + capH - 1, 4, 0, Math.PI);
      } else if (world.bg === 'hills' && h < 0.25) {
        const dx = x * T + 8 + h * 50;
        ctx.moveTo(dx - 4, y * T + 1);
        ctx.arc(dx, y * T + 1, 4, Math.PI, 0);
      }
    }
  }
  ctx.fill();

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const c = map.get(x, y);
      if (c === '.' || c === '#') continue;
      const px = x * T, py = y * T;
      if (c === '=') {
        ctx.fillStyle = p.block;
        ctx.beginPath(); rrect(ctx, px + 1, py + 1, T - 2, T - 2, 6); ctx.fill();
        ctx.fillStyle = p.blockHi;
        ctx.beginPath(); rrect(ctx, px + 7, py + 6, T - 14, T - 16, 4); ctx.fill();
      } else if (c === 'I') {
        ctx.fillStyle = '#A9DDF3';
        ctx.beginPath(); rrect(ctx, px, py, T + ov, T + ov, [sol(x, y - 1) || sol(x - 1, y) ? 0 : 6, sol(x, y - 1) || sol(x + 1, y) ? 0 : 6, 0, 0]); ctx.fill();
        if (!sol(x, y - 1)) {
          ctx.fillStyle = '#E8F7FE';
          ctx.fillRect(px, py, T + ov, 6);
        }
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        if (tileHash(x, y) < 0.6) {
          ctx.beginPath();
          ctx.moveTo(px + 8, py + 26); ctx.lineTo(px + 14, py + 26); ctx.lineTo(px + 24, py + 10); ctx.lineTo(px + 18, py + 10);
          ctx.fill();
        }
      } else if (c === '-') {
        ctx.fillStyle = shade(p.plank, -0.22);
        ctx.beginPath(); rrect(ctx, px, py + 3, T + ov, 10, 4); ctx.fill();
        ctx.fillStyle = p.plank;
        ctx.beginPath(); rrect(ctx, px, py, T + ov, 9, 4); ctx.fill();
      } else if (c === '^' || c === 'v') {
        ctx.fillStyle = p.spike;
        ctx.beginPath();
        for (let k = 0; k < 3; k++) {
          const bx = px + 2 + k * 9.4;
          if (c === '^') { ctx.moveTo(bx, py + T); ctx.lineTo(bx + 4.7, py + T - 15); ctx.lineTo(bx + 9.4, py + T); }
          else { ctx.moveTo(bx, py); ctx.lineTo(bx + 4.7, py + 15); ctx.lineTo(bx + 9.4, py); }
        }
        ctx.fill();
      } else if (c === 'x') {
        const st = fx && fx.crumble.get(x + ',' + y);
        const sh = st ? (Math.random() - 0.5) * 3 : 0;
        ctx.fillStyle = shade(p.plank, -0.12);
        ctx.beginPath(); rrect(ctx, px + 1 + sh, py + 1, T - 2, T - 2, 5); ctx.fill();
        ctx.strokeStyle = shade(p.plank, -0.4);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px + 9 + sh, py + 4); ctx.lineTo(px + 15 + sh, py + 15); ctx.lineTo(px + 11 + sh, py + 27);
        ctx.moveTo(px + 15 + sh, py + 15); ctx.lineTo(px + 25 + sh, py + 19);
        ctx.stroke();
      } else if (c === 'B') {
        ctx.fillStyle = p.block;
        ctx.beginPath(); rrect(ctx, px + 1, py + 1, T - 2, T - 2, 5); ctx.fill();
        ctx.strokeStyle = shade(p.block, -0.35);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px + 6, py + 8); ctx.lineTo(px + 14, py + 14); ctx.lineTo(px + 12, py + 24);
        ctx.moveTo(px + 14, py + 14); ctx.lineTo(px + 26, py + 10);
        ctx.moveTo(px + 20, py + 26); ctx.lineTo(px + 24, py + 20);
        ctx.stroke();
      } else if (c === '?' || c === 'U') {
        const bump = fx && fx.bump.get(x + ',' + y);
        const off = bump ? -Math.sin((1 - bump / 0.18) * Math.PI) * 8 : 0;
        ctx.fillStyle = c === '?' ? '#F6B93B' : shade(p.block, -0.2);
        ctx.beginPath(); rrect(ctx, px + 1, py + 1 + off, T - 2, T - 2, 6); ctx.fill();
        if (c === '?') {
          ctx.fillStyle = '#FFE08A';
          ctx.beginPath(); ctx.arc(px + T / 2, py + T / 2 + off, 7 + Math.sin(t * 4 + x) * 1, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#F6B93B';
          ctx.beginPath(); ctx.arc(px + T / 2, py + T / 2 + off, 3, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
  }
}

// —— HUD 小图标 ——
function drawCoinIcon(ctx, x, y, r, spin) {
  const sx = spin == null ? 1 : Math.max(0.15, Math.abs(Math.cos(spin)));
  ctx.fillStyle = '#E9A21B';
  ctx.beginPath(); ctx.ellipse(x, y + 1.5, r * sx, r, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FFC93C';
  ctx.beginPath(); ctx.ellipse(x, y, r * sx, r, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FFE59A';
  ctx.beginPath(); ctx.ellipse(x, y, r * 0.5 * sx, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
}

function drawGemIcon(ctx, x, y, s, filled, ghost) {
  gemPath(ctx, x, y, s);
  if (filled) {
    ctx.fillStyle = ghost ? 'rgba(62,193,243,0.35)' : '#3EC1F3';
    ctx.fill();
    if (!ghost) {
      ctx.fillStyle = '#B9ECFF';
      ctx.beginPath();
      ctx.moveTo(x - s * 0.18, y - s * 0.25); ctx.lineTo(x, y - s * 0.42); ctx.lineTo(x + s * 0.06, y - s * 0.1);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = 'rgba(29,32,48,0.18)';
    ctx.fill();
  }
}

if (typeof module !== 'undefined') module.exports = {};
