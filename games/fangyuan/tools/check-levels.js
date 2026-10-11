#!/usr/bin/env node
// 关卡可达性检查：用与游戏相同的物理参数模拟跳跃，确认终点与宝石都能用基础动作拿到。
// 用法：node tools/check-levels.js [关卡ID...]
'use strict';
global.TILE = 32;
const path = require('path');
const { PHYS } = require(path.join(__dirname, '../js/data.js'));
const { LEVELS } = require(path.join(__dirname, '../js/levels.js'));
const { parseLevel } = require(path.join(__dirname, '../js/tilemap.js'));

const T = 32, BW = PHYS.bodyW, BH = PHYS.bodyH, DT = 1 / 120;
const approach = (v, t, d) => (v < t ? Math.min(v + d, t) : Math.max(v - d, t));

function analyze(L, opts = {}) {
  const { map, spawns, start } = parseLevel(L);
  const W = map.w, H = map.h;
  const key = (x, y) => x + ',' + y;
  const plat = new Set();
  const links = []; // 纵向路径上相邻两行
  const springs = [], orbs = [], gems = [], cps = [];
  let goal = null;
  const broken = new Set();
  const solid = (tx, ty) => map.solid(tx, ty) && !broken.has(key(tx, ty));
  const oneway = (tx, ty) => map.oneway(tx, ty) || plat.has(key(tx, ty));
  const blocks = (tx, ty) => map.blocksMover(tx, ty);
  const issues = [];

  for (const s of spawns) {
    const { c, tx, ty } = s;
    if (c === 'M') {
      let l = tx - 1, r = tx + 3;
      while (l > 0 && !blocks(l, ty)) l--;
      while (r < W - 1 && !blocks(r, ty)) r++;
      if (r - l > 60) issues.push(`横向平台 (${tx},${ty}) 没有折返标记`);
      for (let x = l + 1; x < r; x++) plat.add(key(x, ty));
    } else if (c === 'N' || c === 'T') {
      const wdt = c === 'N' ? 3 : 2;
      let u = ty - 1, d = ty + (c === 'T' ? 2 : 1);
      if (c === 'N') while (u > -2 && ![0, 1, 2].some((k) => blocks(tx + k, u))) u--;
      else u = ty - 1;
      const stop = (y) => [...Array(wdt).keys()].some((k) => (c === 'N' ? blocks(tx + k, y) : map.solid(tx + k, y) || map.oneway(tx + k, y)));
      while (d < H + 1 && !stop(d)) d++;
      // 平台顶面可能停留的行
      const rows = [];
      const top0 = c === 'N' ? u + 1 : ty;
      const top1 = c === 'N' ? d - 1 : d - 2;
      if (d >= H + 1) issues.push(`${c === 'N' ? '纵向平台' : '压石'} (${tx},${ty}) 下方没有停止点`);
      for (let y = top0; y <= top1; y++) { rows.push(y); for (let k = 0; k < wdt; k++) plat.add(key(tx + k, y)); }
      for (let i = 0; i + 1 < rows.length; i++) links.push([tx, rows[i], tx, rows[i + 1]]);
    } else if (c === 'S') springs.push({ x: tx * T + 3, y: ty * T + 16, w: 26, h: 16 });
    else if (c === '@') orbs.push({ x: tx * T + 16, y: ty * T + 16 });
    else if (c === '*') gems.push({ x: tx * T + 6, y: ty * T + 4, w: 20, h: 24, i: s.index, tx, ty });
    else if (c === 'G') goal = { x: tx * T + 4, y: ty * T - 64, w: 24, h: 96 };
    else if (c === 'C') cps.push({ x: tx * T + 6, y: ty * T - 30, w: 20, h: 62, tx, ty });
    else if (c === 's' || c === 'z') {
      let n = 0;
      for (let k = 1; k < 40; k++) { const ok = c === 's' ? blocks(tx + k, ty) : blocks(tx, ty + k); if (ok) { n++; break; } }
      for (let k = 1; k < 40; k++) { const ok = c === 's' ? blocks(tx - k, ty) : blocks(tx, ty - k); if (ok) { n++; break; } }
      if (n < 2) issues.push(`锯片 (${tx},${ty}) 缺少折返点`);
    }
  }
  if (!goal && !L.boss) issues.push('没有终点 G');

  const ov = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  function spikeHit(x, y) {
    const x0 = Math.floor(x / T), x1 = Math.floor((x + BW - 0.01) / T);
    const y0 = Math.floor(y / T), y1 = Math.floor((y + BH - 0.01) / T);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const c = map.get(tx, ty);
      if (c === '^' && ov({ x, y, w: BW, h: BH }, { x: tx * T + 5, y: ty * T + 16, w: 22, h: 16 })) return true;
      if (c === 'v' && ov({ x, y, w: BW, h: BH }, { x: tx * T + 5, y: ty * T, w: 22, h: 15 })) return true;
    }
    return false;
  }

  // —— 站立段 ——
  const segOf = new Map();
  const segs = [];
  const segAt = (x, feetY) => {
    const ty = Math.round(feetY / T);
    const x0 = Math.floor(x / T), x1 = Math.floor((x + BW - 0.01) / T);
    for (let tx = x0; tx <= x1; tx++) { const s = segOf.get(key(tx, ty)); if (s != null) return s; }
    return null;
  };

  function sim(sx, sy, svx, plan, dbl, fromOrb) {
    let x = sx, y = sy, vx = svx, vy = 0;
    let grounded = true, jumping = false, air = false;
    let airJumps = dbl ? 1 : 0;
    const usedOrb = new Set();
    const out = { land: null, orb: null, gems: new Set(), goal: false, cps: new Set(), breaks: [] };
    if (plan.pound) { vy = PHYS.poundV; grounded = false; air = true; }
    if (fromOrb != null) { usedOrb.add(fromOrb); vy = -PHYS.orbV; grounded = false; air = true; plan = Object.assign({}, plan, { js: 0 }); }
    for (let step = 0; step < 420; step++) {
      let dir = 0;
      if (step >= plan.ds && step < plan.ds + plan.dn) dir = plan.dir;
      if (step === 0 && plan.js > 0) { vy = -PHYS.jumpV * 0.985; jumping = true; grounded = false; air = true; }
      let held = step < plan.js;
      if (dbl && plan.aj === step && airJumps > 0 && !grounded) { airJumps--; vy = -PHYS.airJumpV * 0.985; jumping = true; plan = Object.assign({}, plan, { js: step + 999 }); held = true; }
      if (!plan.pound) {
        const acc = grounded ? PHYS.accelGround : PHYS.accelAir, dec = grounded ? PHYS.decelGround : PHYS.decelAir;
        vx = dir ? approach(vx, dir * PHYS.run, acc * DT) : approach(vx, 0, dec * DT);
        vy = Math.min(vy + PHYS.gravity * (vy > 0 ? PHYS.fallMul : 1) * DT, PHYS.maxFall);
        if (!held && jumping && vy < 0) { vy *= PHYS.jumpCut; jumping = false; }
        if (vy >= 0) jumping = false;
      }
      // X
      x += vx * DT;
      {
        const top = Math.floor(y / T), bot = Math.floor((y + BH - 0.01) / T);
        if (vx > 0) { const tx = Math.floor((x + BW - 0.01) / T); for (let ty = top; ty <= bot; ty++) if (solid(tx, ty)) { x = tx * T - BW; vx = 0; break; } }
        else if (vx < 0) { const tx = Math.floor(x / T); for (let ty = top; ty <= bot; ty++) if (solid(tx, ty)) { x = (tx + 1) * T; vx = 0; break; } }
      }
      // Y
      const prevBottom = y + BH;
      y += vy * DT;
      const left = Math.floor(x / T), right = Math.floor((x + BW - 0.01) / T);
      grounded = false;
      if (vy > 0) {
        const ty = Math.floor((y + BH - 0.01) / T);
        if (plan.pound) for (let tx = left; tx <= right; tx++) if (map.get(tx, ty) === 'B' && !broken.has(key(tx, ty))) { broken.add(key(tx, ty)); out.breaks.push(key(tx, ty)); }
        for (let tx = left; tx <= right; tx++) {
          if (solid(tx, ty) || (oneway(tx, ty) && prevBottom <= ty * T + 0.5)) { y = ty * T - BH; vy = 0; grounded = true; break; }
        }
      } else if (vy < 0) {
        const ty = Math.floor(y / T);
        const hl = solid(left, ty), hr = left !== right && solid(right, ty);
        if (hl || hr) {
          if (hl && !hr && (left + 1) * T - x <= 8) x = (left + 1) * T;
          else if (hr && !hl && x + BW - right * T <= 8) x = right * T - BW;
          else {
            const bx = hl && hr ? Math.floor((x + BW / 2) / T) : hl ? left : right;
            if (map.get(bx, ty) === 'B') out.breaks.push(key(bx, ty));
            y = (ty + 1) * T; vy = 0; jumping = false;
          }
        }
      }
      const box = { x, y, w: BW, h: BH };
      for (const s of springs) if (vy >= 0 && ov(box, s) && y + BH <= s.y + s.h + 2) { vy = -PHYS.springV; grounded = false; jumping = false; airJumps = dbl ? 1 : 0; air = true; plan = Object.assign({}, plan, { pound: false }); }
      for (let i = 0; i < orbs.length; i++) {
        const o = orbs[i];
        if (usedOrb.has(i)) continue;
        const dx = x + BW / 2 - o.x, dy = y + BH / 2 - o.y;
        if (dx * dx + dy * dy < 21 * 21) { out.orb = i; return out; }
      }
      if (spikeHit(x, y)) { out.dead = true; return out; }
      for (const g of gems) if (ov(box, g)) out.gems.add(g.i);
      if (goal && ov(box, goal)) out.goal = true;
      for (const c of cps) if (ov(box, c)) out.cps.add(key(c.tx, c.ty));
      if (!grounded) air = true;
      if (grounded && air) { out.land = { x, y }; return out; }
      if (y > H * T + 40) return out;
      if (grounded && step > 90) return out;
    }
    return out;
  }

  function plansFor(dbl) {
    const P = [];
    const js = [6, 14, 999];
    for (const dir of [-1, 1]) {
      for (const j of js) for (const dn of [999, 12, 30]) P.push({ dir, js: j, dn, ds: 0, vx: 1 });
      for (const j of js) for (const dn of [999, 16]) for (const ds of [15, 35]) P.push({ dir, js: j, dn, ds, vx: 0 });
      for (const dn of [999, 10, 24]) P.push({ dir, js: 0, dn, ds: 0, vx: 1, walk: true });
      P.push({ dir, js: 0, dn: 999, ds: 0, vx: 1, stroll: true });
    }
    for (const j of [6, 999]) P.push({ dir: 0, js: j, dn: 0, ds: 0, vx: 0 });
    if (dbl) {
      const extra = [];
      for (const p of P) if (p.js === 999) for (const aj of [24, 44, 62]) extra.push(Object.assign({}, p, { aj }));
      return P.concat(extra);
    }
    return P;
  }

  const ORB0 = 1e6;
  function bfs(dbl) {
    const plans = plansFor(dbl);
    const sx = start.tx * T + (T - BW) / 2, sy = (start.ty + 1) * T - BH;
    let s0 = segAt(sx, sy + BH);
    if (s0 == null) { // 起点悬空时往下找
      for (let yy = start.ty + 1; yy < H; yy++) { s0 = segAt(sx, yy * T); if (s0 != null) break; }
    }
    const res = { reach: new Set(), gems: new Set(), goal: false, cps: new Set(), edges: new Map() };
    if (s0 == null) return res;
    const q = [s0];
    res.reach.add(s0);
    const addEdge = (a, b) => { if (!res.edges.has(a)) res.edges.set(a, new Set()); res.edges.get(a).add(b); };
    const visit = (a, b) => { addEdge(a, b); if (!res.reach.has(b)) { res.reach.add(b); q.push(b); } };
    while (q.length) {
      const id = q.shift();
      if (id >= ORB0) {
        const oi = id - ORB0, o = orbs[oi];
        for (const p of plans) {
          if (p.walk || p.stroll || p.js === 6) continue;
          for (const vx0 of [0, p.dir * PHYS.run]) {
            const r = sim(o.x - BW / 2, o.y - BH / 2, vx0, p, dbl, oi);
            for (const g of r.gems) res.gems.add(g);
            for (const c of r.cps) res.cps.add(c);
            if (r.goal) res.goal = true;
            if (r.land) { const t = segAt(r.land.x, r.land.y + BH); if (t != null) visit(id, t); }
            if (r.orb != null) visit(id, ORB0 + r.orb);
          }
        }
        continue;
      }
      const sg = segs[id];
      const fy = sg.ty * T - BH;
      // 纵向平台连接
      for (const [ax, ay, bx, by] of links) {
        const sa = segOf.get(key(ax, ay)), sb = segOf.get(key(bx, by));
        if (sa === id && sb != null) visit(id, sb);
        if (sb === id && sa != null) visit(id, sa);
      }
      const xs = new Set();
      for (let tx = sg.x0; tx <= sg.x1; tx++) { xs.add(tx * T + 1); xs.add(tx * T + T - BW - 1); }
      const edgeL = sg.x0 * T - BW + 4, edgeR = (sg.x1 + 1) * T - 4;
      xs.add(edgeL); xs.add(edgeR);
      for (const x of xs) {
        // 检查能否站在这里
        const x0 = Math.floor(x / T), x1 = Math.floor((x + BW - 0.01) / T);
        let fits = true;
        for (let tx = x0; tx <= x1; tx++) if (solid(tx, sg.ty - 1)) fits = false;
        if (!fits || spikeHit(x, fy)) continue;
        for (const p of plans) {
          if (p.walk && x !== edgeL && x !== edgeR) continue;
          if (p.walk && ((p.dir < 0 && x !== edgeL) || (p.dir > 0 && x !== edgeR))) continue;
          const o = sim(x, fy, p.vx ? p.dir * PHYS.run : 0, p, dbl);
          for (const g of o.gems) res.gems.add(g);
          for (const c of o.cps) res.cps.add(c);
          if (o.goal) res.goal = true;
          for (const b of o.breaks) broken.add(b);
          if (o.land) {
            const t = segAt(o.land.x, o.land.y + BH);
            if (t != null) visit(id, t);
          }
          if (o.orb != null) visit(id, ORB0 + o.orb);
        }
        // 下砸：脚下有裂纹砖
        const under = [Math.floor(x / T), Math.floor((x + BW - 0.01) / T)].some((tx) => map.get(tx, sg.ty) === 'B' && !broken.has(key(tx, sg.ty)));
        if (under) {
          const o = sim(x, fy - 40, 0, { dir: 0, js: 0, dn: 0, ds: 0, pound: true }, dbl);
          for (const b of o.breaks) broken.add(b);
          for (const g of o.gems) res.gems.add(g);
          if (o.land) { const t = segAt(o.land.x, o.land.y + BH); if (t != null) visit(id, t); }
        }
      }
    }
    return res;
  }

  // 打碎砖块会改变地形，反复搜索直到稳定
  let base, prevBroken = -1;
  for (let i = 0; i < 4 && broken.size !== prevBroken; i++) {
    prevBroken = broken.size;
    rebuildSegs();
    base = bfs(false);
  }
  function rebuildSegs() {
    segOf.clear();
    segs.length = 0;
    for (let ty = 0; ty < H; ty++) {
      let cur = null;
      for (let tx = 0; tx < W; tx++) {
        const can = (solid(tx, ty) || oneway(tx, ty)) && !solid(tx, ty - 1) && map.get(tx, ty - 1) !== '^' && map.get(tx, ty - 1) !== 'v';
        if (can) {
          if (!cur) { cur = { id: segs.length, ty, x0: tx, x1: tx }; segs.push(cur); }
          cur.x1 = tx;
          segOf.set(key(tx, ty), cur.id);
        } else cur = null;
      }
    }
  }

  if (process.env.DEBUG_SEG) {
    const rows = {};
    for (const id of base.reach) { const sg = segs[id]; if (!sg) continue; (rows[sg.ty] = rows[sg.ty] || []).push(sg.x0 + '-' + sg.x1); }
    for (const ty of Object.keys(rows).sort((a, b) => a - b)) console.log('  row', ty, rows[ty].join(' '));
  }
  let dbl = null;
  const missingGems = gems.filter((g) => !base.gems.has(g.i));
  if (!base.goal || missingGems.length || opts.double) dbl = bfs(true);

  // 软锁：能到达但回不到终点的段
  const soft = [];
  if (base.goal) {
    const canGoal = new Set();
    // 反向：从直接碰到终点的段出发
    const rev = new Map();
    for (const [a, bs] of base.edges) for (const b of bs) { if (!rev.has(b)) rev.set(b, new Set()); rev.get(b).add(a); }
    const goalSegs = [];
    for (const id of base.reach) {
      const sg = segs[id];
      if (!goal || !sg) continue;
      if (sg.ty * T > goal.y && sg.ty * T <= goal.y + goal.h + 4 && (sg.x0 * T < goal.x + goal.w + 200) && ((sg.x1 + 1) * T > goal.x - 200)) goalSegs.push(id);
    }
    const q = goalSegs.slice();
    for (const g of q) canGoal.add(g);
    while (q.length) { const id = q.shift(); for (const a of rev.get(id) || []) if (!canGoal.has(a)) { canGoal.add(a); q.push(a); } }
    for (const id of base.reach) if (!canGoal.has(id) && segs[id]) { const sg = segs[id]; if (sg.ty < H) soft.push(`(${sg.x0}-${sg.x1},${sg.ty})`); }
  }

  return {
    id: L.id, issues, goal: base.goal || !!L.boss, goalDbl: dbl ? dbl.goal : null,
    gems: gems.map((g) => ({ i: g.i, tx: g.tx, ty: g.ty, base: base.gems.has(g.i), dbl: dbl ? dbl.gems.has(g.i) : null })),
    cps: cps.map((c) => ({ tx: c.tx, ty: c.ty, ok: base.cps.has(key(c.tx, c.ty)) })),
    soft, w: W, h: H,
  };
}

function checkRows(L) {
  const out = [];
  if (!L.segs) return out;
  L.segs.forEach((s, i) => {
    const w = s[0].length;
    s.forEach((r, j) => { if (r.length !== w) out.push(`第 ${i + 1} 段第 ${j + 1} 行长度 ${r.length}，应为 ${w}`); });
    if (s.length > L.h) out.push(`第 ${i + 1} 段有 ${s.length} 行，超过关卡高度 ${L.h}`);
  });
  return out;
}

const only = process.argv.slice(2);
let bad = 0;
for (const L of LEVELS) {
  if (only.length && !only.includes(L.id)) continue;
  const t0 = Date.now();
  const rowIssues = checkRows(L);
  const r = analyze(L);
  const ms = Date.now() - t0;
  const lines = [];
  for (const s of rowIssues) lines.push('  ✗ ' + s);
  for (const s of r.issues) lines.push('  ✗ ' + s);
  if (!r.goal) lines.push(`  ✗ 终点不可达${r.goalDbl ? '（二段跳可达）' : ''}`);
  for (const g of r.gems) if (!g.base) lines.push(`  ${g.dbl ? '△' : '✗'} 宝石${g.i + 1} (${g.tx},${g.ty}) 基础动作拿不到${g.dbl ? '，二段跳可以' : ''}`);
  for (const c of r.cps) if (!c.ok) lines.push(`  ✗ 检查点 (${c.tx},${c.ty}) 碰不到`);
  if (r.soft.length) lines.push(`  △ 可能卡住的落点 ${r.soft.length} 处：${r.soft.slice(0, 6).join(' ')}`);
  const okAll = !lines.some((l) => l.includes('✗'));
  if (!okAll) bad++;
  console.log(`${okAll ? '✓' : '✗'} ${L.id} ${L.name}  ${r.w}×${r.h}  宝石 ${r.gems.filter((g) => g.base).length}/${r.gems.length}  (${ms}ms)`);
  for (const l of lines) console.log(l);
}
process.exit(bad ? 1 : 0);
