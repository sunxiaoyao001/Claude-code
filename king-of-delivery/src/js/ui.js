'use strict';
// ============================================================================
//  Trailer typography & UI: title cards, location card, HUD panel, name cards,
//  speaker-tagged subtitles, attack names, countdown timer, phone & map UI.
// ============================================================================

// big centred title card (reference: "ONE QUESTION." + small translation flanked by rules)
function titleCard(ctx, lt, dur, main, sub, o = {}) {
  const a = env(lt, 0, dur, o.fi ?? 0.12, o.fo ?? 0.18);
  if (a <= 0) return;
  const k = 1 + 0.05 * (1 - Ease.outCubic(seg(lt, 0, 0.5)));
  const y = o.y ?? H / 2 - 20;
  ctx.save();
  ctx.translate(W / 2, y); ctx.scale(k, k); ctx.translate(-W / 2, -y);
  titleText(ctx, main, W / 2, y, o.size ?? 132, { font: o.font ?? FONT.serif, fill: ['#FFFFFF', '#E4E8FF'], glow: 'rgba(200,210,255,0.55)', glowR: 40, alpha: a, spacing: o.spacing ?? 10 });
  if (sub) {
    ctx.globalAlpha = a * 0.85;
    ctx.font = font(30, FONT.raj, '700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#C9CDF0';
    spacedText(ctx, sub, W / 2, y + 100, 10);
    const tw = ctx.measureText(sub).width + sub.length * 10;
    ctx.strokeStyle = 'rgba(201,205,240,0.55)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(W / 2 - tw / 2 - 120, y + 100); ctx.lineTo(W / 2 - tw / 2 - 30, y + 100);
    ctx.moveTo(W / 2 + tw / 2 + 30, y + 100); ctx.lineTo(W / 2 + tw / 2 + 120, y + 100); ctx.stroke();
  }
  ctx.restore();
}

// location card (vertical rule + CN serif + spaced EN)
function locationCard(ctx, lt, dur, cn, en, x = 150, y = 820) {
  const a = env(lt, 0, dur, 0.4, 0.4);
  if (a <= 0) return;
  const slide = (1 - Ease.outCubic(seg(lt, 0, 0.8))) * 30;
  ctx.save(); ctx.globalAlpha = a;
  const bg = ctx.createLinearGradient(x - 60, 0, x + 620, 0);
  bg.addColorStop(0, 'rgba(4,3,16,0.75)'); bg.addColorStop(1, 'rgba(4,3,16,0)');
  ctx.fillStyle = bg; ctx.fillRect(x - 60, y - 90, 680, 160);
  ctx.fillStyle = '#E6E8FF'; ctx.fillRect(x - 18, y - 56, 3, 104);
  ctx.font = font(54, FONT.serif, '900'); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#FFFFFF'; ctx.shadowColor = 'rgba(160,170,255,0.6)'; ctx.shadowBlur = 18;
  spacedText(ctx, typed(cn, lt - 0.1, 10), x + slide, y, 8);
  ctx.shadowBlur = 0;
  ctx.font = font(26, FONT.raj, '700'); ctx.fillStyle = '#C9CDF0';
  spacedText(ctx, en, x + slide * 0.5, y + 40, 12);
  ctx.restore();
}

// speaker-tagged subtitle (reference: small coloured label + white line)
function speakerSub(ctx, lt, dur, who, cn, en, o = {}) {
  const a = env(lt, 0, dur, 0.08, 0.15);
  if (a <= 0) return;
  const y = o.y ?? H - 210;
  const col = { Y: '#FFD100', B: '#2AA8FF', O: '#FF6A10' }[who] ?? '#ffffff';
  const name = { Y: '美团', B: '饿了么', O: '淘宝闪购' }[who] ?? who;
  const txt = typed(cn, lt, o.cps ?? 16);
  ctx.save(); ctx.globalAlpha = a;
  ctx.font = font(22, FONT.sans, '900');
  const tw = ctx.measureText(name).width + 28;
  ctx.fillStyle = col; ctx.fillRect(W / 2 - tw / 2, y - 64, tw, 32);
  ctx.fillStyle = who === 'Y' ? '#1A1505' : '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(name, W / 2, y - 47);
  ctx.font = font(50, FONT.sans, '900');
  ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(6,4,14,0.9)'; ctx.lineWidth = 9;
  spacedText(ctx, txt, W / 2, y, 3, 'stroke');
  ctx.fillStyle = '#FFFFFF'; spacedText(ctx, txt, W / 2, y, 3);
  if (en) {
    ctx.globalAlpha = a * clamp((lt - 0.25) / 0.3);
    ctx.font = font(28, FONT.raj, '700'); ctx.strokeStyle = 'rgba(6,4,14,0.9)'; ctx.lineWidth = 6;
    spacedText(ctx, en, W / 2, y + 46, 3, 'stroke');
    ctx.fillStyle = '#DADDF5'; spacedText(ctx, en, W / 2, y + 46, 3);
  }
  ctx.restore();
}

// fighting-game name card with slanted colour bar
function nameCard(ctx, lt, dur, who, o = {}) {
  const a = env(lt, 0, dur, 0.05, 0.2);
  if (a <= 0) return;
  const info = {
    Y: { cn: '美团', en: 'MEITUAN', epi: '黄金袋鼠 · THE GOLDEN KANGAROO', col: '#FFD100', txt: '#1A1505' },
    B: { cn: '饿了么', en: 'ELE.ME', epi: '苍蓝蜂鸟 · THE AZURE HUMMINGBIRD', col: '#1E8FFF', txt: '#ffffff' },
    O: { cn: '淘宝闪购', en: 'TAOBAO SHANGOU', epi: '橙色闪电 · THE ORANGE FLASH', col: '#FF5A0A', txt: '#ffffff' },
  }[who];
  const x = o.x ?? W - 120, y = o.y ?? 790, right = o.align !== 'left';
  const p = Ease.outExpo(seg(lt, 0, 0.45));
  ctx.save(); ctx.globalAlpha = a;
  ctx.translate(x + (1 - p) * (right ? 500 : -500), y);
  ctx.transform(1, 0, -0.18, 1, 0, 0);
  ctx.textAlign = right ? 'right' : 'left'; ctx.textBaseline = 'alphabetic';
  // bar
  const bw = o.bw ?? 640;
  ctx.fillStyle = info.col;
  ctx.fillRect(right ? -bw : -40, -78, bw + 40, 84);
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(right ? -bw : -40, -78, bw + 40, 5);
  // small EN above
  ctx.font = font(36, FONT.anton); ctx.fillStyle = info.col;
  spacedText(ctx, info.en, right ? -20 : 20, -150, 6);
  // big CN name
  ctx.font = font(info.cn.length > 3 ? 120 : 150, FONT.sans, '900');
  ctx.lineJoin = 'round'; ctx.lineWidth = 12; ctx.strokeStyle = '#0B0912';
  ctx.strokeText(info.cn, right ? -20 : 20, -10);
  const g = ctx.createLinearGradient(0, -150, 0, -10); g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, '#DCE0F5');
  ctx.fillStyle = g; ctx.fillText(info.cn, right ? -20 : 20, -10);
  // epithet
  ctx.font = font(26, FONT.raj, '700'); ctx.fillStyle = '#FFFFFF';
  spacedText(ctx, info.epi, right ? -20 : 20, 42, 6);
  ctx.restore();
}

// special attack name: glowing CN characters + rule + EN plate
function attackName(ctx, lt, dur, cn, en, col, o = {}) {
  const a = env(lt, 0, dur, 0.04, 0.2);
  if (a <= 0) return;
  const x = o.x ?? 120, y = o.y ?? 300;
  const sc = 1 + 0.4 * (1 - Ease.outBack(seg(lt, 0, 0.3)));
  ctx.save(); ctx.globalAlpha = a;
  ctx.translate(x, y); ctx.scale(sc, sc);
  titleText(ctx, cn, 0, 0, o.size ?? 120, { font: FONT.sans, align: 'left', fill: ['#FFFFFF', tint(col, 0.3)], stroke: shade(col, 0.6), sw: 14, glow: col, glowR: 30, spacing: 4 });
  ctx.fillStyle = col; ctx.fillRect(4, 64, 5, 52);
  ctx.font = font(40, FONT.anton); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  const tw = ctx.measureText(en).width + en.length * 4 + 30;
  ctx.fillStyle = 'rgba(8,6,16,0.75)'; ctx.fillRect(16, 66, tw, 48);
  ctx.fillStyle = '#FFFFFF'; spacedText(ctx, en, 30, 91, 4);
  ctx.restore();
}

// manga SFX (vertical or horizontal)
function mangaSFX(ctx, str, x, y, size, o = {}) {
  const chars = Array.from(str);
  ctx.save();
  ctx.translate(x, y); ctx.rotate(o.rot ?? 0);
  const sc = o.scale ?? 1; ctx.scale(sc, sc);
  ctx.globalAlpha = o.alpha ?? 1;
  const vert = o.vertical ?? false;
  chars.forEach((ch, i) => {
    const dx = vert ? 0 : i * size * 0.92, dy = vert ? i * size * 0.88 : 0;
    const jit = o.jitter ? (hash3(i, Math.floor((o.t ?? 0) * 12), 3) - 0.5) * size * 0.06 : 0;
    titleText(ctx, ch, dx + jit, dy + jit, size, {
      font: o.font ?? FONT.sans, weight: '900', fill: o.fill ?? ['#FFFFFF', '#E8E8F0'],
      stroke: o.stroke ?? '#0B0912', sw: size * 0.2, stroke2: o.stroke2, sw2: size * 0.08,
    });
  });
  ctx.restore();
}

// holographic HUD panel with ring (reference: FINAL BENCHMARK)
function hudPanel(ctx, lt, dur, o = {}) {
  const a = env(lt, 0, dur, 0.25, 0.25);
  if (a <= 0) return;
  const cx = o.x ?? W / 2, cy = o.y ?? 400, w = 560, h = 230;
  const open = Ease.outCubic(seg(lt, 0, 0.5));
  const col = '#7FD8FF';
  ctx.save(); ctx.globalAlpha = a;
  // ring
  ctx.save(); ctx.translate(cx, cy + 220); ctx.scale(1, 0.28);
  for (let k = 0; k < 2; k++) {
    ctx.strokeStyle = rgba(col, 0.6 - k * 0.25); ctx.lineWidth = 3 + k * 4;
    ctx.beginPath(); ctx.arc(0, 0, 420 * open + k * 40, 0, TAU); ctx.stroke();
  }
  ctx.setLineDash([20, 14]); ctx.lineDashOffset = -lt * 120;
  ctx.strokeStyle = rgba(col, 0.5); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 360 * open, 0, TAU); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
  // beam lines
  ctx.strokeStyle = rgba(col, 0.2); ctx.lineWidth = 1.5;
  for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(cx + k * 60, cy + 220); ctx.lineTo(cx + k * 140, cy + 420); ctx.stroke(); }
  // panel
  const ph = h * open;
  ctx.fillStyle = 'rgba(30,60,140,0.28)'; ctx.fillRect(cx - w / 2, cy - ph / 2, w, ph);
  ctx.strokeStyle = rgba(col, 0.9); ctx.lineWidth = 2; ctx.strokeRect(cx - w / 2, cy - ph / 2, w, ph);
  emitFill(ctx, rrectPath(cx - w / 2, cy - ph / 2, w, ph, 0), col, 0.12);
  // scanlines
  ctx.save(); ctx.beginPath(); ctx.rect(cx - w / 2, cy - ph / 2, w, ph); ctx.clip();
  ctx.fillStyle = rgba(col, 0.06);
  for (let y = cy - ph / 2; y < cy + ph / 2; y += 4) ctx.fillRect(cx - w / 2, y, w, 1);
  ctx.restore();
  if (open > 0.9) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = font(26, FONT.raj, '700'); ctx.fillStyle = '#CFF3FF'; spacedText(ctx, o.l1 ?? 'FINAL ORDER', cx, cy - 74, 12);
    ctx.font = font(40, FONT.serif, '900'); ctx.fillStyle = '#FFFFFF'; spacedText(ctx, o.l2 ?? '终极订单', cx, cy - 26, 10);
    ctx.font = font(64, FONT.anton); ctx.fillStyle = '#FFD84A';
    ctx.textAlign = 'right'; ctx.fillText(o.l3a ?? '#1', cx - 90, cy + 56);
    ctx.textAlign = 'left'; ctx.fillStyle = '#FFFFFF';
    const q = (lt * 10) % 1 < 0.5 ? '？？？' : '？ ？ ？';
    ctx.font = font(62, FONT.sans, '900'); ctx.fillText(o.l3b ?? q, cx - 50, cy + 56);
  }
  ctx.restore();
}

// "ORDER DROPS IN 00:00:03" style counter
function dropsIn(ctx, lt, dur, label, secs, x, y) {
  const a = env(lt, 0, dur, 0.2, 0.2);
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
  ctx.font = font(22, FONT.raj, '700'); ctx.fillStyle = '#DDE1FF'; spacedText(ctx, label, x, y - 44, 6);
  ctx.font = font(48, FONT.orb, '900');
  const s = Math.max(0, Math.ceil(secs));
  const str = `00:00:${String(s).padStart(2, '0')}`;
  ctx.fillStyle = s <= 1 ? '#FF4466' : '#FFFFFF';
  ctx.shadowColor = s <= 1 ? '#FF4466' : '#9FB2FF'; ctx.shadowBlur = 16;
  ctx.fillText(str, x, y);
  ctx.restore();
}

// delivery countdown HUD (MM:SS, or SS.cc in the final seconds)
function fmtTimer(sec) {
  sec = Math.max(0, sec);
  if (sec < 10) { const s = Math.floor(sec), cs = Math.floor((sec - s) * 100); return `00:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`; }
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
function timerHUD(ctx, sec, a = 1, o = {}) {
  if (a <= 0) return;
  const x = o.x ?? W - 90, y = o.y ?? 262, big = o.big ?? false;
  const red = sec < 60;
  const col = red ? '#FF3B5C' : '#FFFFFF';
  const pulse = red ? 0.5 + 0.5 * Math.cos(fract(sec) * TAU) : 1;
  ctx.save(); ctx.globalAlpha = a;
  ctx.textAlign = big ? 'center' : 'right'; ctx.textBaseline = 'alphabetic';
  const size = o.size ?? (big ? 260 : 64);
  if (!big) {
    ctx.fillStyle = 'rgba(6,4,18,0.55)';
    ctx.beginPath(); ctx.roundRect(x - 330, y - size * 1.25, 380, size * 1.5, 10); ctx.fill();
  }
  ctx.font = font(size * 0.3, FONT.sans, '900'); ctx.fillStyle = red ? '#FF8FA0' : '#C9CDF0';
  spacedText(ctx, o.label ?? '送达倒计时 · DELIVERY', x, y - size * 0.92, 4);
  ctx.font = font(size, FONT.orb, '900');
  const str = fmtTimer(sec);
  ctx.shadowColor = col; ctx.shadowBlur = 22 * pulse;
  ctx.fillStyle = col; ctx.fillText(str, x, y);
  ctx.shadowBlur = 0;
  // brackets
  if (!big) {
    ctx.strokeStyle = rgba(red ? '#FF3B5C' : '#9FB2FF', 0.8); ctx.lineWidth = 3;
    const w = ctx.measureText(str).width;
    ctx.beginPath();
    ctx.moveTo(x - w - 24, y - size * 0.75); ctx.lineTo(x - w - 34, y - size * 0.75); ctx.lineTo(x - w - 34, y + 12); ctx.lineTo(x - w - 24, y + 12);
    ctx.moveTo(x + 14, y - size * 0.75); ctx.lineTo(x + 24, y - size * 0.75); ctx.lineTo(x + 24, y + 12); ctx.lineTo(x + 14, y + 12);
    ctx.stroke();
  }
  ctx.restore();
}

// bokeh circles (portrait backgrounds)
function bokeh(ctx, t, col, o = {}) {
  ctx.save();
  for (let i = 0; i < (o.n ?? 26); i++) {
    const r = 20 + 70 * hash2(i, 71);
    const x = mod(hash2(i, 72) * W + t * (8 + 20 * hash2(i, 73)) * (o.dir ?? 1), W + 200) - 100;
    const y = hash2(i, 74) * H + Math.sin(t * 0.7 + i) * 10;
    const a = (o.a ?? 0.25) * (0.4 + 0.6 * hash2(i, 75));
    const g = ctx.createRadialGradient(x, y, r * 0.6, x, y, r);
    g.addColorStop(0, rgba(col, a * 0.6)); g.addColorStop(0.85, rgba(col, a)); g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba(tint(col, 0.5), a * 0.6); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, r * 0.9, 0, TAU); ctx.stroke();
  }
  ctx.restore();
}
