'use strict';
// 场景物件、敌人、粒子

// —— 粒子 ——
class Particles {
  constructor() { this.list = []; }
  burst(x, y, n, o = {}) {
    for (let i = 0; i < n; i++) {
      const ang = o.angle != null ? o.angle + (Math.random() - 0.5) * (o.spread != null ? o.spread : Math.PI * 2) : Math.random() * Math.PI * 2;
      const sp = (o.speed || 100) * (0.4 + Math.random() * 0.8);
      let vx = Math.cos(ang) * sp;
      if (o.mirror && i % 2) vx = -vx;
      const life = (o.life || 0.5) * (0.7 + Math.random() * 0.6);
      this.list.push({
        x, y, vx, vy: Math.sin(ang) * sp, life, max: life,
        size: (o.size || 4) * (0.7 + Math.random() * 0.6), color: o.color || '#FFFFFF',
        g: o.gravity != null ? o.gravity : 400, shape: o.shape || (Math.random() < 0.5 ? 'circle' : 'square'),
        alpha: o.alpha || 1, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 10,
      });
    }
  }
  ring(x, y, color, r = 26) {
    this.list.push({ x, y, ring: true, r, life: 0.3, max: 0.3, color, alpha: 0.9 });
  }
  text(x, y, str, color) {
    this.list.push({ x, y, text: str, life: 0.9, max: 0.9, color: color || '#FFFFFF', vy: -50, vx: 0, g: 0, alpha: 1 });
  }
  update(dt) {
    for (const p of this.list) {
      p.life -= dt;
      if (p.ring || p.text) { if (p.text) p.y += p.vy * dt; continue; }
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
    }
    this.list = this.list.filter((p) => p.life > 0);
  }
  draw(ctx) {
    for (const p of this.list) {
      const k = p.life / p.max;
      if (p.ring) {
        ctx.strokeStyle = rgba(p.color, k * p.alpha);
        ctx.lineWidth = 3 * k + 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (1.6 - k * 0.9), 0, Math.PI * 2);
        ctx.stroke();
        continue;
      }
      if (p.text) {
        ctx.globalAlpha = Math.min(1, k * 2);
        ctx.font = '600 14px ' + FONT_UI;
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(29,32,48,0.35)';
        ctx.fillText(p.text, p.x + 1, p.y + 1.5);
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, p.x, p.y);
        ctx.globalAlpha = 1;
        continue;
      }
      ctx.globalAlpha = Math.min(1, k * 1.5) * p.alpha;
      ctx.fillStyle = p.color;
      const s = p.size * (0.4 + k * 0.6);
      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, s / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-s / 2, -s / 2, s, s);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }
}

// —— 基础 ——
class Entity {
  constructor(run, x, y, w, h) {
    this.run = run;
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.vx = 0; this.vy = 0;
    this.dead = false;
    this.t = Math.random() * 10;
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  update() {}
  draw() {}
}

// —— 拾取物 ——
class Coin extends Entity {
  constructor(run, tx, ty) {
    super(run, tx * TILE + 8, ty * TILE + 8, 16, 16);
    this.homing = false;
  }
  update(dt) {
    this.t += dt;
    const p = this.run.player;
    if (!p || p.dead) return;
    const r = this.run.magnetR;
    const dx = p.cx - this.cx, dy = p.cy - this.cy;
    const d = Math.hypot(dx, dy);
    if (this.homing || (r > 0 && d < r)) {
      this.homing = true;
      const sp = 520 * dt;
      this.x += (dx / (d || 1)) * Math.min(sp, d);
      this.y += (dy / (d || 1)) * Math.min(sp, d);
    }
    if (overlaps(this, p)) {
      this.dead = true;
      this.run.addCoins(1, this.cx, this.cy);
    }
  }
  draw(ctx) {
    drawCoinIcon(ctx, this.cx, this.cy + Math.sin(this.t * 3) * 1.5, 7, this.t * 3);
  }
}

class Gem extends Entity {
  constructor(run, tx, ty, index) {
    super(run, tx * TILE + 6, ty * TILE + 4, 20, 24);
    this.index = index;
    this.ghost = run.gemOwned(index);
  }
  update(dt) {
    this.t += dt;
    const p = this.run.player;
    if (p && !p.dead && overlaps(this, p)) {
      this.dead = true;
      this.run.collectGem(this.index, this.cx, this.cy);
    }
  }
  draw(ctx) {
    const y = this.cy + Math.sin(this.t * 2.4) * 3;
    if (!this.ghost) {
      ctx.fillStyle = rgba('#3EC1F3', 0.18 + Math.sin(this.t * 4) * 0.06);
      ctx.beginPath();
      ctx.arc(this.cx, y, 18, 0, Math.PI * 2);
      ctx.fill();
    }
    drawGemIcon(ctx, this.cx, y, 24, true, this.ghost);
  }
}

class HeartPickup extends Entity {
  constructor(run, tx, ty) { super(run, tx * TILE + 6, ty * TILE + 6, 20, 20); }
  update(dt) {
    this.t += dt;
    const p = this.run.player;
    if (p && !p.dead && overlaps(this, p)) {
      this.dead = true;
      this.run.addHeart(this.cx, this.cy);
    }
  }
  draw(ctx) {
    const s = 20 + Math.sin(this.t * 5) * 1.5;
    heartPath(ctx, this.cx, this.cy + 2, s);
    ctx.fillStyle = '#FF5D73';
    ctx.fill();
  }
}

class Checkpoint extends Entity {
  constructor(run, tx, ty) {
    super(run, tx * TILE + 6, ty * TILE - 30, 20, 62);
    this.active = false;
    this.flagT = 0;
    this.respawn = { x: tx * TILE + (TILE - PHYS.bodyW) / 2, y: (ty + 1) * TILE - PHYS.bodyH };
  }
  update(dt) {
    this.t += dt;
    if (this.active) this.flagT = Math.min(1, this.flagT + dt * 3);
    const p = this.run.player;
    if (!this.active && p && !p.dead && overlaps(this, p)) this.run.setCheckpoint(this);
  }
  draw(ctx) {
    const px = this.x + 4, base = this.y + this.h;
    ctx.fillStyle = shade(this.run.world.pal.ink, 0.1);
    ctx.beginPath(); rrect(ctx, px, this.y + 6, 4, this.h - 6, 2); ctx.fill();
    ctx.beginPath(); rrect(ctx, px - 6, base - 5, 16, 5, 2); ctx.fill();
    const fy = lerp(base - 18, this.y + 6, easeOutCubic(this.flagT));
    const wave = Math.sin(this.t * 6) * 2;
    ctx.fillStyle = this.active ? this.run.char.color : '#B9BFCC';
    ctx.beginPath();
    ctx.moveTo(px + 4, fy);
    ctx.lineTo(px + 24, fy + 8 + wave);
    ctx.lineTo(px + 4, fy + 16);
    ctx.closePath();
    ctx.fill();
  }
}

class Goal extends Entity {
  constructor(run, tx, ty) {
    super(run, tx * TILE + 4, ty * TILE - 64, 24, 96);
    this.reached = false;
  }
  update(dt) {
    this.t += dt;
    const p = this.run.player;
    if (!this.reached && p && !p.dead && overlaps(this, p)) {
      this.reached = true;
      this.run.complete();
    }
  }
  draw(ctx) {
    const px = this.cx - 3, base = this.y + this.h;
    const ink = this.run.world.pal.ink;
    ctx.fillStyle = shade(ink, 0.1);
    ctx.beginPath(); rrect(ctx, px, this.y + 8, 6, this.h - 8, 3); ctx.fill();
    ctx.beginPath(); rrect(ctx, px - 10, base - 7, 26, 7, 3); ctx.fill();
    ctx.fillStyle = '#FFC93C';
    ctx.beginPath(); ctx.arc(px + 3, this.y + 6, 7, 0, Math.PI * 2); ctx.fill();
    const wave = Math.sin(this.t * 5);
    ctx.fillStyle = this.run.char.color;
    ctx.beginPath();
    ctx.moveTo(px + 6, this.y + 14);
    ctx.quadraticCurveTo(px + 24, this.y + 12 + wave * 4, px + 44, this.y + 22 + wave * 3);
    ctx.quadraticCurveTo(px + 24, this.y + 32 - wave * 3, px + 6, this.y + 38);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.arc(px + 20, this.y + 25 + wave, 4, 0, Math.PI * 2); ctx.fill();
  }
}

class Spring extends Entity {
  constructor(run, tx, ty) {
    super(run, tx * TILE + 3, ty * TILE + 16, 26, 16);
    this.squash = 0;
  }
  update(dt) {
    this.squash = Math.max(0, this.squash - dt * 4);
    const p = this.run.player;
    if (!p || p.dead || p.vy < 0) return;
    if (overlaps(this, p) && p.y + p.h <= this.y + this.h + 2) {
      p.y = this.y - p.h;
      p.bounce(PHYS.springV);
      p.jumping = false;
      this.squash = 1;
      Sound.play('spring');
      this.run.particles.burst(this.cx, this.y, 6, { color: '#FFFFFF', speed: 120, life: 0.35, size: 4, angle: -Math.PI / 2, spread: 1.6 });
    }
  }
  draw(ctx) {
    const k = this.squash;
    const top = this.y + 4 + Math.sin(k * Math.PI) * -6 + k * 6;
    const base = this.y + this.h;
    ctx.fillStyle = '#5A6275';
    ctx.beginPath(); rrect(ctx, this.x + 2, base - 5, this.w - 4, 5, 2); ctx.fill();
    ctx.strokeStyle = '#8A93A8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const n = 3;
    for (let i = 0; i <= n; i++) {
      const yy = lerp(base - 5, top + 5, i / n);
      ctx.lineTo(this.cx + (i % 2 ? 7 : -7), yy);
    }
    ctx.stroke();
    ctx.fillStyle = '#FF6B6B';
    ctx.beginPath(); rrect(ctx, this.x, top, this.w, 7, 3.5); ctx.fill();
  }
}

class Orb extends Entity {
  constructor(run, tx, ty) {
    super(run, tx * TILE + 4, ty * TILE + 4, 24, 24);
    this.cool = 0;
  }
  update(dt) {
    this.t += dt;
    this.cool = Math.max(0, this.cool - dt);
    const p = this.run.player;
    if (this.cool > 0 || !p || p.dead) return;
    const dx = p.cx - this.cx, dy = p.cy - this.cy;
    if (dx * dx + dy * dy < 22 * 22) {
      p.bounce(PHYS.orbV);
      p.jumping = false;
      this.cool = 1.4;
      Sound.play('orb');
      this.run.particles.ring(this.cx, this.cy, '#7CF0FF', 20);
      this.run.particles.burst(this.cx, this.cy, 10, { color: '#7CF0FF', speed: 160, life: 0.4, size: 4, gravity: 0 });
    }
  }
  draw(ctx) {
    const on = this.cool <= 0;
    const r = on ? 11 + Math.sin(this.t * 5) * 1.5 : 6 + (1 - this.cool / 1.4) * 4;
    ctx.fillStyle = on ? 'rgba(124,240,255,0.22)' : 'rgba(124,240,255,0.08)';
    ctx.beginPath(); ctx.arc(this.cx, this.cy, r + 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = on ? '#7CF0FF' : 'rgba(124,240,255,0.35)';
    ctx.beginPath(); ctx.arc(this.cx, this.cy, r, 0, Math.PI * 2); ctx.fill();
    if (on) {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(this.cx - 3, this.cy - 3, 3, 0, Math.PI * 2); ctx.fill();
    }
  }
}

class Sign extends Entity {
  constructor(run, tx, ty, index) {
    super(run, tx * TILE + 4, ty * TILE + 8, 24, 24);
    this.index = index;
  }
  update() {
    const p = this.run.player;
    if (p && Math.abs(p.cx - this.cx) < 70 && Math.abs(p.cy - this.cy) < 80) this.run.activeSign = this;
  }
  draw(ctx) {
    const ink = this.run.world.pal.ink;
    ctx.fillStyle = shade(ink, 0.15);
    ctx.fillRect(this.cx - 2, this.y + 10, 4, 14);
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); rrect(ctx, this.x - 2, this.y - 4, 28, 18, 4); ctx.fill();
    ctx.fillStyle = ink;
    ctx.font = '700 13px ' + FONT_UI;
    ctx.textAlign = 'center';
    ctx.fillText('!', this.cx, this.y + 10);
  }
}

class MovingPlatform extends Entity {
  constructor(run, tx, ty, axis) {
    super(run, tx * TILE, ty * TILE, TILE * 3, 14);
    this.axis = axis;
    this.speed = axis === 'x' ? 72 : 80;
    this.dir = axis === 'x' ? 1 : -1;
    this.dx = 0; this.dy = 0;
    this.oneWay = true;
  }
  update(dt) {
    const map = this.run.map;
    const step = this.speed * dt * this.dir;
    if (this.axis === 'x') {
      const lead = this.dir > 0 ? this.x + this.w + step : this.x + step;
      const tx = Math.floor((this.dir > 0 ? lead - 0.01 : lead) / TILE);
      const ty = Math.floor((this.y + 2) / TILE);
      if (map.blocksMover(tx, ty)) { this.dir *= -1; this.dx = 0; this.dy = 0; return; }
      this.x += step;
      this.dx = step; this.dy = 0;
    } else {
      const lead = this.dir > 0 ? this.y + this.h + step : this.y + step;
      const ty = Math.floor((this.dir > 0 ? lead - 0.01 : lead) / TILE);
      const tx0 = Math.floor(this.x / TILE);
      let block = false;
      for (let tx = tx0; tx < tx0 + 3; tx++) if (map.blocksMover(tx, ty)) block = true;
      if (block) { this.dir *= -1; this.dx = 0; this.dy = 0; return; }
      this.y += step;
      this.dx = 0; this.dy = step;
    }
  }
  draw(ctx) {
    const p = this.run.world.pal;
    ctx.fillStyle = shade(p.block, -0.25);
    ctx.beginPath(); rrect(ctx, this.x, this.y + 4, this.w, this.h, 6); ctx.fill();
    ctx.fillStyle = p.block;
    ctx.beginPath(); rrect(ctx, this.x, this.y, this.w, this.h - 2, 6); ctx.fill();
    ctx.fillStyle = p.blockHi;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.arc(this.x + 16 + i * 32, this.y + 6, 2.5, 0, Math.PI * 2); ctx.fill();
    }
  }
}

// —— 敌人 ——
class Enemy extends Entity {
  constructor(run, x, y, w, h) {
    super(run, x, y, w, h);
    this.stompable = true;
    this.harm = true;
    this.dashKill = true;
    this.spiky = false;
    this.dying = 0;
    this.facing = -1;
    this.grounded = false;
  }
  kill(how) {
    if (this.dying) return;
    this.dying = 0.35;
    this.harm = false;
    this.run.stats.enemies++;
    this.run.particles.burst(this.cx, this.cy, 10, { color: this.color || '#3B3F55', speed: 160, life: 0.45, size: 5 });
    if (how === 'dash' || how === 'pound') { this.vy = -300; this.vx = this.run.player.facing * 200; }
  }
  tickDying(dt) {
    if (!this.dying) return false;
    this.dying -= dt;
    if (this.vy) { this.vy += 1200 * dt; this.y += this.vy * dt; this.x += this.vx * dt; }
    if (this.dying <= 0) this.dead = true;
    return true;
  }
  // 简单重力与地形碰撞
  physics(dt, turnAtLedge) {
    const map = this.run.map;
    this.vy = Math.min(this.vy + 1800 * dt, 800);
    // 横向
    if (this.vx !== 0) {
      const nx = this.x + this.vx * dt;
      const lead = this.vx > 0 ? nx + this.w : nx;
      const tx = Math.floor((this.vx > 0 ? lead - 0.01 : lead) / TILE);
      const ty0 = Math.floor((this.y + 2) / TILE), ty1 = Math.floor((this.y + this.h - 2) / TILE);
      let blocked = false;
      for (let ty = ty0; ty <= ty1; ty++) if (map.solid(tx, ty)) blocked = true;
      if (!blocked && turnAtLedge && this.grounded) {
        const fy = Math.floor((this.y + this.h + 4) / TILE);
        if (!map.solid(tx, fy) && !map.oneway(tx, fy)) blocked = true;
        if (map.get(tx, ty1) === '^') blocked = true;
      }
      if (blocked) { this.vx = -this.vx; this.facing = Math.sign(this.vx); }
      else this.x = nx;
    }
    // 纵向
    this.y += this.vy * dt;
    this.grounded = false;
    const left = Math.floor((this.x + 1) / TILE), right = Math.floor((this.x + this.w - 1) / TILE);
    if (this.vy > 0) {
      const ty = Math.floor((this.y + this.h) / TILE);
      for (let tx = left; tx <= right; tx++) {
        if (map.solid(tx, ty) || (map.oneway(tx, ty) && this.y + this.h - this.vy * dt <= ty * TILE + 1)) {
          this.y = ty * TILE - this.h;
          this.vy = 0;
          this.grounded = true;
          break;
        }
      }
    } else if (this.vy < 0) {
      const ty = Math.floor(this.y / TILE);
      for (let tx = left; tx <= right; tx++) if (map.solid(tx, ty)) { this.y = (ty + 1) * TILE; this.vy = 0; break; }
    }
    if (this.y > map.ph + 200) this.dead = true;
  }
  drawEyes(ctx, cx, cy, s, angry) {
    const f = this.facing;
    for (const k of [-1, 1]) {
      const ex = cx + k * s * 0.9 + f * s * 0.3;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(ex, cy, s * 0.62, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1D2030';
      ctx.beginPath(); ctx.arc(ex + f * s * 0.2, cy + s * 0.1, s * 0.32, 0, Math.PI * 2); ctx.fill();
    }
    if (angry) {
      ctx.strokeStyle = '#1D2030';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - s * 1.5 + f * s * 0.3, cy - s * 0.95); ctx.lineTo(cx - s * 0.4 + f * s * 0.3, cy - s * 0.6);
      ctx.moveTo(cx + s * 1.5 + f * s * 0.3, cy - s * 0.95); ctx.lineTo(cx + s * 0.4 + f * s * 0.3, cy - s * 0.6);
      ctx.stroke();
    }
  }
  squashDraw(ctx, fn) {
    if (this.dying && !this.vy) {
      const k = this.dying / 0.35;
      ctx.save();
      ctx.translate(this.cx, this.y + this.h);
      ctx.scale(1 + (1 - k) * 0.5, k * 0.6);
      ctx.translate(-this.cx, -(this.y + this.h));
      ctx.globalAlpha = k;
      fn();
      ctx.restore();
      return;
    }
    if (this.dying && this.vy) {
      ctx.save();
      ctx.translate(this.cx, this.cy);
      ctx.rotate(this.dying * 20);
      ctx.translate(-this.cx, -this.cy);
      fn();
      ctx.restore();
      return;
    }
    fn();
  }
}

class Walker extends Enemy {
  constructor(run, tx, ty, spiky) {
    super(run, tx * TILE + 3, ty * TILE + 8, 26, 24);
    this.vx = -46;
    this.spiky = spiky;
    this.stompable = !spiky;
    this.color = spiky ? '#3D2E4F' : '#3B3F55';
  }
  update(dt) {
    this.t += dt;
    if (this.tickDying(dt)) return;
    const p = this.run.player;
    if (p && Math.abs(p.cx - this.cx) > 900) return;
    this.physics(dt, true);
    this.facing = Math.sign(this.vx) || this.facing;
  }
  draw(ctx) {
    this.squashDraw(ctx, () => {
      const bob = Math.abs(Math.sin(this.t * 8)) * 2;
      const cx = this.cx, base = this.y + this.h;
      if (this.spiky) {
        ctx.fillStyle = '#E4E1EE';
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = Math.PI + (i + 0.5) * (Math.PI / 5);
          const r1 = 13, r2 = 21;
          ctx.moveTo(cx + Math.cos(a - 0.22) * r1, base - 10 + Math.sin(a - 0.22) * r1 - bob);
          ctx.lineTo(cx + Math.cos(a) * r2, base - 10 + Math.sin(a) * r2 - bob);
          ctx.lineTo(cx + Math.cos(a + 0.22) * r1, base - 10 + Math.sin(a + 0.22) * r1 - bob);
        }
        ctx.fill();
      }
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.ellipse(cx, base - 11 - bob, 14, 13, 0, Math.PI, 0);
      ctx.lineTo(cx + 14, base - 4 - bob);
      ctx.quadraticCurveTo(cx, base + 1 - bob, cx - 14, base - 4 - bob);
      ctx.fill();
      ctx.fillStyle = shade(this.color, -0.2);
      const st = Math.sin(this.t * 8) * 3;
      ctx.beginPath(); rrect(ctx, cx - 10 + st, base - 5, 8, 5, 2.5); ctx.fill();
      ctx.beginPath(); rrect(ctx, cx + 2 - st, base - 5, 8, 5, 2.5); ctx.fill();
      this.drawEyes(ctx, cx, base - 14 - bob, 3.6, true);
    });
  }
}

class Hopper extends Enemy {
  constructor(run, tx, ty) {
    super(run, tx * TILE + 4, ty * TILE + 10, 24, 22);
    this.wait = 0.6 + Math.random();
    this.color = '#5B4B8A';
  }
  update(dt) {
    this.t += dt;
    if (this.tickDying(dt)) return;
    const p = this.run.player;
    if (!p || Math.abs(p.cx - this.cx) > 900) return;
    if (this.grounded) {
      this.vx = approach(this.vx, 0, 1200 * dt);
      this.wait -= dt;
      this.facing = Math.sign(p.cx - this.cx) || this.facing;
      if (this.wait <= 0 && Math.abs(p.cx - this.cx) < TILE * 9) {
        this.vy = -560;
        this.vx = this.facing * 110;
        this.wait = 1.1 + Math.random() * 0.5;
        this.grounded = false;
        if (Math.abs(p.cx - this.cx) < 400) Sound.play('enemyHop');
      }
    }
    this.physics(dt, false);
  }
  draw(ctx) {
    this.squashDraw(ctx, () => {
      const cx = this.cx, base = this.y + this.h;
      const air = !this.grounded;
      const crouch = this.grounded && this.wait < 0.25 ? 4 : 0;
      ctx.fillStyle = this.color;
      ctx.beginPath(); rrect(ctx, cx - 13, base - 22 + crouch + (air ? -2 : 0), 26, 22 - crouch, 9); ctx.fill();
      ctx.fillStyle = shade(this.color, -0.2);
      ctx.beginPath(); rrect(ctx, cx - 14, base - 6, 9, air ? 8 : 6, 3); ctx.fill();
      ctx.beginPath(); rrect(ctx, cx + 5, base - 6, 9, air ? 8 : 6, 3); ctx.fill();
      this.drawEyes(ctx, cx, base - 15 + crouch, 3.6, false);
    });
  }
}

class Flyer extends Enemy {
  constructor(run, tx, ty) {
    super(run, tx * TILE + 3, ty * TILE + 6, 26, 20);
    this.ox = this.x;
    this.oy = this.y;
    this.color = '#E86A92';
  }
  update(dt) {
    this.t += dt;
    if (this.tickDying(dt)) return;
    const nx = this.ox + Math.sin(this.t * 0.9) * TILE * 2.5;
    this.facing = nx > this.x ? 1 : -1;
    this.x = nx;
    this.y = this.oy + Math.sin(this.t * 2.2) * 18;
  }
  draw(ctx) {
    this.squashDraw(ctx, () => {
      const cx = this.cx, cy = this.cy;
      const flap = Math.sin(this.t * 18) * 6;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.ellipse(cx - 12, cy - 6 - flap * 0.5, 9, 5 + flap * 0.3, -0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx + 12, cy - 6 - flap * 0.5, 9, 5 + flap * 0.3, 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = this.color;
      ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2); ctx.fill();
      this.drawEyes(ctx, cx, cy - 1, 3.2, false);
    });
  }
}

class Turret extends Enemy {
  constructor(run, tx, ty) {
    super(run, tx * TILE + 2, ty * TILE + 6, 28, 26);
    this.cool = 1 + Math.random();
    this.color = '#4A5068';
  }
  update(dt) {
    this.t += dt;
    if (this.tickDying(dt)) return;
    const p = this.run.player;
    if (!p || p.dead) return;
    this.facing = p.cx < this.cx ? -1 : 1;
    const dx = Math.abs(p.cx - this.cx), dy = Math.abs(p.cy - this.cy);
    this.cool -= dt;
    if (this.cool <= 0 && dx < TILE * 13 && dy < TILE * 6) {
      this.cool = 2.1;
      this.run.addEnemy(new Bullet(this.run, this.cx + this.facing * 16, this.y + 10, this.facing * 190, 0));
      if (dx < 500) Sound.play('shoot');
      this.recoil = 0.15;
    }
    if (this.recoil) this.recoil = Math.max(0, this.recoil - dt);
  }
  draw(ctx) {
    this.squashDraw(ctx, () => {
      const base = this.y + this.h;
      const rc = (this.recoil || 0) * 20;
      ctx.fillStyle = shade(this.color, -0.2);
      ctx.beginPath(); rrect(ctx, this.cx - 4 + this.facing * (10 - rc), this.y + 5, 16, 10, 4); ctx.fill();
      ctx.fillStyle = this.color;
      ctx.beginPath(); rrect(ctx, this.x + 2, this.y + 2, this.w - 4, this.h - 2, [12, 12, 4, 4]); ctx.fill();
      ctx.fillStyle = shade(this.color, -0.25);
      ctx.fillRect(this.x, base - 6, this.w, 6);
      const warn = this.cool < 0.4 ? '#FF6B6B' : '#FFD166';
      ctx.fillStyle = warn;
      ctx.beginPath(); ctx.arc(this.cx + this.facing * 4, this.y + 11, 4, 0, Math.PI * 2); ctx.fill();
    });
  }
}

class Bullet extends Enemy {
  constructor(run, x, y, vx, vy, opts = {}) {
    super(run, x - 6, y - 6, 12, 12);
    this.vx = vx;
    this.vy = vy;
    this.stompable = false;
    this.life = opts.life || 5;
    this.color = opts.color || '#FF6B6B';
    this.grav = opts.gravity || 0;
    this.ghost = opts.ghost || false;
    this.isBullet = true;
  }
  update(dt) {
    this.t += dt;
    this.life -= dt;
    this.vy += this.grav * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.life <= 0) this.dead = true;
    if (!this.ghost && this.run.map.solid(Math.floor(this.cx / TILE), Math.floor(this.cy / TILE))) {
      this.dead = true;
      this.run.particles.burst(this.cx, this.cy, 4, { color: this.color, speed: 80, life: 0.25, size: 4 });
    }
  }
  kill() {
    this.dead = true;
    this.run.particles.burst(this.cx, this.cy, 5, { color: this.color, speed: 100, life: 0.3, size: 4 });
  }
  draw(ctx) {
    ctx.fillStyle = rgba(this.color, 0.3);
    ctx.beginPath(); ctx.arc(this.cx, this.cy, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.arc(this.cx, this.cy, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(this.cx - 2, this.cy - 2, 2, 0, Math.PI * 2); ctx.fill();
  }
}

class Bat extends Enemy {
  constructor(run, tx, ty) {
    super(run, tx * TILE + 4, ty * TILE + 4, 24, 18);
    this.awake = false;
    this.color = '#6A4C93';
    this.speed = 92;
  }
  update(dt) {
    this.t += dt;
    if (this.tickDying(dt)) return;
    const p = this.run.player;
    if (!p) return;
    const dx = p.cx - this.cx, dy = p.cy - this.cy;
    const d = Math.hypot(dx, dy);
    if (!this.awake) {
      if (d < TILE * 6.5 && !p.dead) this.awake = true;
      return;
    }
    if (p.dead) { this.y -= 30 * dt; return; }
    this.facing = dx < 0 ? -1 : 1;
    this.vx = damp(this.vx, (dx / (d || 1)) * this.speed, 2.5, dt);
    this.vy = damp(this.vy, (dy / (d || 1)) * this.speed, 2.5, dt);
    this.x += this.vx * dt;
    this.y += this.vy * dt + Math.sin(this.t * 6) * 0.6;
  }
  draw(ctx) {
    this.squashDraw(ctx, () => {
      const cx = this.cx, cy = this.cy;
      const flap = this.awake ? Math.sin(this.t * 16) : 0.6;
      ctx.fillStyle = shade(this.color, -0.15);
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy - 2); ctx.lineTo(cx - 22, cy - 8 - flap * 8); ctx.lineTo(cx - 16, cy + 4);
      ctx.moveTo(cx + 6, cy - 2); ctx.lineTo(cx + 22, cy - 8 - flap * 8); ctx.lineTo(cx + 16, cy + 4);
      ctx.fill();
      ctx.fillStyle = this.color;
      ctx.beginPath(); ctx.ellipse(cx, cy, 11, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy - 6); ctx.lineTo(cx - 6, cy - 14); ctx.lineTo(cx - 2, cy - 8);
      ctx.moveTo(cx + 8, cy - 6); ctx.lineTo(cx + 6, cy - 14); ctx.lineTo(cx + 2, cy - 8);
      ctx.fill();
      if (this.awake) this.drawEyes(ctx, cx, cy - 1, 3, true);
      else {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(cx - 6, cy - 1); ctx.lineTo(cx - 2, cy - 1);
        ctx.moveTo(cx + 2, cy - 1); ctx.lineTo(cx + 6, cy - 1);
        ctx.stroke();
      }
    });
  }
}

class Crusher extends Enemy {
  constructor(run, tx, ty) {
    super(run, tx * TILE, ty * TILE, TILE * 2, TILE * 2);
    this.oy = this.y;
    this.state = 'idle';
    this.timer = 0;
    this.stompable = false;
    this.dashKill = false;
    this.harm = false;
    this.oneWay = false;
    this.dx = 0; this.dy = 0;
    this.color = '#7A8199';
    run.platforms.push(this);
  }
  update(dt) {
    this.t += dt;
    const p = this.run.player;
    const map = this.run.map;
    const prevY = this.y;
    if (this.state === 'idle') {
      if (p && !p.dead && p.x + p.w > this.x - 6 && p.x < this.x + this.w + 6 && p.y > this.y + this.h - 4 && p.y - this.y < TILE * 12) {
        this.state = 'shake';
        this.timer = 0.28;
      }
    } else if (this.state === 'shake') {
      this.timer -= dt;
      if (this.timer <= 0) { this.state = 'fall'; this.vy = 0; }
    } else if (this.state === 'fall') {
      this.vy = Math.min(this.vy + 2600 * dt, 950);
      this.y += this.vy * dt;
      const ty = Math.floor((this.y + this.h) / TILE);
      const tx0 = Math.floor(this.x / TILE);
      if (map.solid(tx0, ty) || map.solid(tx0 + 1, ty) || map.oneway(tx0, ty) || map.oneway(tx0 + 1, ty) || this.y > map.ph) {
        this.y = Math.min(this.y, ty * TILE - this.h);
        this.state = 'wait';
        this.timer = 0.9;
        this.run.shake(5);
        if (p && Math.abs(p.cx - this.cx) < 600) Sound.play('crush');
        this.run.particles.burst(this.cx, this.y + this.h, 12, { color: this.run.world.pal.deco, speed: 140, life: 0.4, size: 5, angle: -Math.PI / 2, spread: Math.PI });
      }
    } else if (this.state === 'wait') {
      this.timer -= dt;
      if (this.timer <= 0) this.state = 'rise';
    } else if (this.state === 'rise') {
      this.y = Math.max(this.oy, this.y - 85 * dt);
      if (this.y <= this.oy) this.state = 'idle';
    }
    this.dx = 0;
    this.dy = this.y - prevY;
    // 与玩家的碰撞
    if (p && !p.dead && overlaps(this, p)) {
      const standing = p.platform === this;
      if (!standing) {
        if (this.state === 'fall' && p.cy > this.cy) {
          p.hurt(this.cx, true);
          // 把玩家推到两侧
          p.x = p.cx < this.cx ? this.x - p.w : this.x + this.w;
        } else if (p.prevBottom > this.y + 6) {
          if (p.cx < this.cx) p.x = this.x - p.w; else p.x = this.x + this.w;
          p.vx = 0;
        }
      }
    }
  }
  draw(ctx) {
    const sh = this.state === 'shake' ? (Math.random() - 0.5) * 4 : 0;
    const x = this.x + sh, y = this.y;
    ctx.fillStyle = shade(this.color, -0.22);
    ctx.beginPath(); rrect(ctx, x, y + 4, this.w, this.h - 4, 10); ctx.fill();
    ctx.fillStyle = this.color;
    ctx.beginPath(); rrect(ctx, x, y, this.w, this.h - 6, 10); ctx.fill();
    ctx.fillStyle = shade(this.color, 0.2);
    ctx.beginPath(); rrect(ctx, x + 8, y + 6, this.w - 16, 8, 4); ctx.fill();
    // 脸
    const angry = this.state !== 'idle' && this.state !== 'rise';
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); rrect(ctx, x + 14, y + 24, 12, angry ? 8 : 12, 3); ctx.fill();
    ctx.beginPath(); rrect(ctx, x + 38, y + 24, 12, angry ? 8 : 12, 3); ctx.fill();
    ctx.fillStyle = '#1D2030';
    ctx.beginPath(); rrect(ctx, x + 18, y + 26, 5, 5, 2); ctx.fill();
    ctx.beginPath(); rrect(ctx, x + 41, y + 26, 5, 5, 2); ctx.fill();
    ctx.fillStyle = shade(this.color, -0.35);
    ctx.beginPath(); rrect(ctx, x + 20, y + 42, 24, 5, 2.5); ctx.fill();
  }
}

class Saw extends Enemy {
  constructor(run, tx, ty, axis) {
    super(run, tx * TILE + 2, ty * TILE + 2, 28, 28);
    this.axis = axis;
    this.speed = axis === 'x' ? 95 : 90;
    this.dir = (tx + ty) % 2 === 0 ? 1 : -1;
    this.stompable = false;
    this.dashKill = false;
    this.spiky = true;
  }
  update(dt) {
    this.t += dt;
    const map = this.run.map;
    const step = this.speed * dt * this.dir;
    if (this.axis === 'x') {
      const lead = this.dir > 0 ? this.x + this.w + step - 0.01 : this.x + step;
      if (map.blocksMover(Math.floor(lead / TILE), Math.floor(this.cy / TILE))) this.dir *= -1;
      else this.x += step;
    } else {
      const lead = this.dir > 0 ? this.y + this.h + step - 0.01 : this.y + step;
      if (map.blocksMover(Math.floor(this.cx / TILE), Math.floor(lead / TILE))) this.dir *= -1;
      else this.y += step;
    }
  }
  draw(ctx) {
    const cx = this.cx, cy = this.cy;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.t * 8);
    ctx.fillStyle = '#C9CED9';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      ctx.lineTo(Math.cos(a) * 16, Math.sin(a) * 16);
      ctx.lineTo(Math.cos(a + 0.31) * 11, Math.sin(a + 0.31) * 11);
    }
    ctx.fill();
    ctx.fillStyle = '#8A91A3';
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5A6275';
    ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

class Icicle extends Enemy {
  constructor(run, tx, ty) {
    super(run, tx * TILE + 8, ty * TILE, 16, 26);
    this.state = 'hang';
    this.timer = 0;
    this.stompable = false;
    this.dashKill = true;
  }
  update(dt) {
    this.t += dt;
    if (this.tickDying(dt)) return;
    const p = this.run.player;
    if (this.state === 'hang') {
      if (p && !p.dead && Math.abs(p.cx - this.cx) < 46 && p.y > this.y && p.y - this.y < TILE * 9) {
        this.state = 'shake';
        this.timer = 0.32;
        Sound.play('ice');
      }
    } else if (this.state === 'shake') {
      this.timer -= dt;
      if (this.timer <= 0) this.state = 'fall';
    } else {
      this.vy = Math.min(this.vy + 2000 * dt, 900);
      this.y += this.vy * dt;
      const map = this.run.map;
      if (map.solid(Math.floor(this.cx / TILE), Math.floor((this.y + this.h) / TILE)) || this.y > map.ph) {
        this.dead = true;
        this.run.particles.burst(this.cx, this.y + this.h, 8, { color: '#CFEFFF', speed: 140, life: 0.4, size: 4, angle: -Math.PI / 2, spread: Math.PI });
      }
    }
  }
  kill() { this.dead = true; this.run.particles.burst(this.cx, this.cy, 8, { color: '#CFEFFF', speed: 140, life: 0.4, size: 4 }); }
  draw(ctx) {
    const sh = this.state === 'shake' ? (Math.random() - 0.5) * 3 : 0;
    ctx.fillStyle = '#BFE8FA';
    ctx.beginPath();
    ctx.moveTo(this.x + sh, this.y);
    ctx.lineTo(this.x + this.w + sh, this.y);
    ctx.lineTo(this.cx + sh, this.y + this.h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(this.x + 3 + sh, this.y);
    ctx.lineTo(this.x + 7 + sh, this.y);
    ctx.lineTo(this.cx - 1 + sh, this.y + this.h - 8);
    ctx.closePath();
    ctx.fill();
  }
}
