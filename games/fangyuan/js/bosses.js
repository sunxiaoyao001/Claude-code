'use strict';
// 四位首领

class Boss {
  constructor(run, x, y, w, h) {
    this.run = run;
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.vx = 0; this.vy = 0;
    this.t = 0;
    this.timer = 0;
    this.state = 'intro';
    this.flashT = 0;
    this.invulnT = 0;
    this.showBar = true;
    this.facing = -1;
    this.gone = false;
    const map = run.map;
    this.minX = TILE;
    this.maxX = (map.w - 1) * TILE;
    // 找地面
    const col = Math.floor(map.w / 2);
    let fy = map.h - 1;
    for (let ty = 0; ty < map.h; ty++) if (map.solid(col, ty)) { fy = ty; break; }
    this.floorY = fy * TILE;
    this.ceilY = map.solid(col, 0) ? TILE : -TILE * 2;
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  get phase2() { return this.hp <= Math.ceil(this.maxHp / 2); }

  tick(dt) {
    this.t += dt;
    this.flashT = Math.max(0, this.flashT - dt);
    this.invulnT = Math.max(0, this.invulnT - dt);
    if (this.state === 'dying') { this.updateDying(dt); return true; }
    return false;
  }

  hit() {
    if (this.hp <= 0 || this.invulnT > 0) return false;
    const run = this.run;
    this.hp--;
    this.flashT = 0.3;
    this.invulnT = 0.7;
    Sound.play('bossHit');
    run.shake(9);
    run.hitStop(0.09);
    run.particles.burst(this.cx, this.cy, 18, { color: this.color, speed: 260, life: 0.6, size: 7 });
    run.particles.ring(this.cx, this.cy, '#FFFFFF', this.w * 0.6);
    if (this.hp <= 0) this.defeat();
    else this.onHit();
    return true;
  }

  defeat() {
    const run = this.run;
    this.state = 'dying';
    this.timer = 0;
    this.showBar = false;
    run.state = 'bossdead';
    Sound.play('bossDie');
    Music.stop();
    for (const e of run.enemies) if (!(e instanceof Crusher)) { e.dead = true; run.particles.burst(e.cx, e.cy, 6, { color: '#FFFFFF', speed: 120, life: 0.4, size: 4 }); }
  }

  updateDying(dt) {
    const run = this.run;
    this.timer += dt;
    this.vx = 0;
    if (this.timer < 2.2 && Math.floor(this.timer * 10) !== Math.floor((this.timer - dt) * 10)) {
      const x = this.x + Math.random() * this.w, y = this.y + Math.random() * this.h;
      run.particles.burst(x, y, 10, { color: pick([this.color, '#FFFFFF', '#FFC93C']), speed: 220, life: 0.5, size: 7 });
      run.shake(4);
      Sound.play('stomp');
    }
    if (this.timer > 2.2 && !this.gone) {
      this.gone = true;
      run.particles.burst(this.cx, this.cy, 50, { color: this.color, speed: 420, life: 1, size: 9, gravity: 300 });
      run.particles.ring(this.cx, this.cy, '#FFFFFF', this.w);
      run.shake(12);
      run.flash = 0;
      for (let i = 0; i < 12; i++) run.items.push(Object.assign(new Coin(run, 0, 0), { x: this.cx + rand(-60, 60), y: this.cy + rand(-40, 40), homing: true }));
    }
    if (this.timer > 3.4) run.complete();
  }

  // 返回 'hit' | 'bonk' | 'hurt' | null
  contact(p, box, vulnerable) {
    if (!overlaps(p, box) || this.state === 'dying') return null;
    const above = p.vy > 0 && p.prevBottom <= box.y + 20;
    if (above) {
      if (vulnerable && this.invulnT <= 0) {
        this.hit();
        p.bounce(PHYS.stompHoldV);
        p.vx = (p.cx < this.cx ? -1 : 1) * 160;
        return 'hit';
      }
      p.bounce(PHYS.stompV);
      Sound.play('bump');
      return 'bonk';
    }
    if (p.dashT > 0) {
      if (vulnerable && this.invulnT <= 0) {
        this.hit();
        p.dashT = 0;
        p.vx = (p.cx < this.cx ? -1 : 1) * 300;
        p.vy = -420;
        return 'hit';
      }
      return null;
    }
    if (!vulnerable || this.hurtsWhileVulnerable) { p.hurt(this.cx); return 'hurt'; }
    // 晕眩时侧面碰到：把玩家推开
    p.x = p.cx < this.cx ? box.x - p.w : box.x + box.w;
    return null;
  }

  drawFlash(ctx, path) {
    if (this.flashT > 0) {
      path();
      ctx.fillStyle = 'rgba(255,255,255,' + Math.min(1, this.flashT * 4) + ')';
      ctx.fill();
    }
  }

  drawDizzy(ctx, x, y, r) {
    for (let i = 0; i < 3; i++) {
      const a = this.t * 4 + (i * Math.PI * 2) / 3;
      const sx = x + Math.cos(a) * r, sy = y + Math.sin(a) * r * 0.35;
      ctx.fillStyle = '#FFE08A';
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const aa = -Math.PI / 2 + (k * Math.PI) / 5;
        const rr = k % 2 === 0 ? 7 : 3;
        ctx.lineTo(sx + Math.cos(aa) * rr, sy + Math.sin(aa) * rr);
      }
      ctx.fill();
    }
  }
}

// 地面冲击波
class Shockwave extends Enemy {
  constructor(run, x, floorY, dir, speed, minX, maxX) {
    super(run, x - 12, floorY - 24, 24, 24);
    this.vx = dir * speed;
    this.stompable = false;
    this.dashKill = false;
    this.minX = minX; this.maxX = maxX;
    this.life = 3;
  }
  update(dt) {
    this.t += dt;
    this.life -= dt;
    this.x += this.vx * dt;
    if (this.x < this.minX || this.x + this.w > this.maxX || this.life <= 0) this.dead = true;
    if (Math.random() < 0.5) this.run.particles.burst(this.cx, this.y + this.h, 1, { color: '#FFFFFF', speed: 60, life: 0.3, size: 4, angle: -Math.PI / 2, spread: 1 });
  }
  draw(ctx) {
    const d = Math.sign(this.vx);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.moveTo(this.cx - d * 14, this.y + this.h);
    ctx.quadraticCurveTo(this.cx - d * 4, this.y - 4, this.cx + d * 12, this.y + this.h);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.moveTo(this.cx - d * 30, this.y + this.h);
    ctx.quadraticCurveTo(this.cx - d * 20, this.y + 8, this.cx - d * 8, this.y + this.h);
    ctx.fill();
  }
}

class Laser extends Enemy {
  constructor(run, y, x0, x1, warn) {
    super(run, x0, y - 11, x1 - x0, 22);
    this.stompable = false;
    this.dashKill = false;
    this.harm = false;
    this.warn = warn;
    this.fire = 0.5;
    this.fired = false;
  }
  update(dt) {
    this.t += dt;
    if (this.warn > 0) {
      this.warn -= dt;
      if (Math.floor(this.t * 8) !== Math.floor((this.t - dt) * 8)) Sound.play('warn');
      if (this.warn <= 0) { this.harm = true; Sound.play('laser'); this.run.shake(5); }
      return;
    }
    this.fire -= dt;
    if (this.fire <= 0) this.dead = true;
  }
  draw(ctx) {
    if (this.warn > 0) {
      ctx.strokeStyle = 'rgba(255,92,122,' + (0.4 + 0.4 * Math.sin(this.t * 20)) + ')';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 8]);
      ctx.beginPath(); ctx.moveTo(this.x, this.cy); ctx.lineTo(this.x + this.w, this.cy); ctx.stroke();
      ctx.setLineDash([]);
      return;
    }
    const k = Math.min(1, this.fire * 6);
    ctx.fillStyle = 'rgba(255,92,122,' + 0.35 * k + ')';
    ctx.fillRect(this.x, this.y - 8, this.w, this.h + 16);
    ctx.fillStyle = 'rgba(255,92,122,' + k + ')';
    ctx.fillRect(this.x, this.y, this.w, this.h);
    ctx.fillStyle = 'rgba(255,255,255,' + k + ')';
    ctx.fillRect(this.x, this.cy - 3, this.w, 6);
  }
}

// —— 1 方块大王 ——
class KingBoss extends Boss {
  constructor(run, tx, ty) {
    super(run, tx * TILE + 16 - 48, (ty + 1) * TILE - 96, 96, 96);
    this.name = '方块大王';
    this.color = '#6C63B5';
    this.maxHp = this.hp = 5;
    this.timer = 1.8;
    this.combo = false;
    this.sq = 1;
  }
  physics(dt) {
    this.vy = Math.min(this.vy + 2200 * dt, 1200);
    this.x = clamp(this.x + this.vx * dt, this.minX, this.maxX - this.w);
    this.y += this.vy * dt;
    if (this.y + this.h >= this.floorY) {
      this.y = this.floorY - this.h;
      const landed = this.vy > 0 && this.airborne;
      this.vy = 0;
      this.vx = 0;
      this.airborne = false;
      return landed;
    }
    this.airborne = true;
    return false;
  }
  update(dt) {
    if (this.tick(dt)) { this.physics(dt); return; }
    const run = this.run, p = run.player;
    this.sq = damp(this.sq, 1, 10, dt);
    switch (this.state) {
      case 'intro':
        this.timer -= dt;
        if (this.timer < 1 && !this.roared) { this.roared = true; Sound.play('bossRoar'); run.shake(6); this.sq = 0.8; }
        if (this.timer <= 0) { this.state = 'idle'; this.timer = 0.5; }
        this.physics(dt);
        break;
      case 'idle':
        this.facing = p.cx < this.cx ? -1 : 1;
        this.timer -= dt;
        if (this.timer <= 0) { this.state = 'crouch'; this.timer = this.phase2 ? 0.24 : 0.34; }
        this.physics(dt);
        break;
      case 'crouch':
        this.sq = 0.75;
        this.timer -= dt;
        if (this.timer <= 0) {
          const target = clamp(p.cx + rand(-24, 24), this.minX + 48, this.maxX - 48);
          const air = 0.82;
          this.vy = -900;
          this.vx = clamp((target - this.cx) / air, -440, 440);
          this.state = 'air';
          this.airborne = true;
          this.sq = 1.25;
          Sound.play('jump');
        }
        this.physics(dt);
        break;
      case 'air':
        if (this.physics(dt)) this.land();
        break;
      case 'dazed':
        this.timer -= dt;
        if (this.timer <= 0) { this.state = 'idle'; this.timer = this.phase2 ? 0.3 : 0.55; }
        this.physics(dt);
        break;
      case 'hurt':
        this.timer -= dt;
        if (this.physics(dt) || (!this.airborne && this.timer <= 0)) { this.state = 'idle'; this.timer = 0.35; }
        break;
    }
  }
  land() {
    const run = this.run;
    this.sq = 0.7;
    run.shake(9);
    Sound.play('crush');
    const sp = this.phase2 ? 300 : 250;
    run.addEnemy(new Shockwave(run, this.x - 4, this.floorY, -1, sp, this.minX, this.maxX));
    run.addEnemy(new Shockwave(run, this.x + this.w + 4, this.floorY, 1, sp, this.minX, this.maxX));
    run.particles.burst(this.cx, this.floorY, 18, { color: '#FFFFFF', speed: 200, life: 0.5, size: 6, angle: -Math.PI / 2, spread: Math.PI });
    if (this.phase2 && !this.combo) {
      this.combo = true;
      this.state = 'crouch';
      this.timer = 0.18;
    } else {
      this.combo = false;
      this.state = 'dazed';
      this.timer = this.phase2 ? 1.05 : 1.45;
    }
  }
  onHit() {
    const run = this.run, p = run.player;
    this.state = 'hurt';
    this.vy = -620;
    this.vx = (this.cx < p.cx ? -1 : 1) * 260;
    this.airborne = true;
    this.timer = 0.4;
    if (this.hp === 3 || this.hp === 1) {
      for (const fx of [0.25, 0.75]) {
        const tx = Math.floor((this.minX + (this.maxX - this.minX) * fx) / TILE);
        const w = new Walker(run, tx, 2, false);
        run.addEnemy(w);
      }
      Sound.play('bossRoar');
    }
  }
  touchPlayer(p) {
    const box = { x: this.x + 4, y: this.y + 8, w: this.w - 8, h: this.h - 8 };
    this.contact(p, box, this.state === 'dazed');
  }
  onPlayerRespawn() { this.state = 'idle'; this.timer = 1.2; }
  draw(ctx) {
    if (this.gone) return;
    const sq = this.sq;
    const w = this.w * (2 - sq), h = this.h * sq;
    const x = this.cx - w / 2, y = this.y + this.h - h;
    const path = () => { ctx.beginPath(); rrect(ctx, x, y, w, h, 16); };
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath(); ctx.ellipse(this.cx, this.floorY, w * 0.5, 6, 0, 0, Math.PI * 2); ctx.fill();
    path();
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.save(); path(); ctx.clip();
    ctx.fillStyle = shade(this.color, -0.18);
    ctx.fillRect(x, y + h * 0.7, w, h);
    ctx.restore();
    this.drawFlash(ctx, path);
    // 王冠
    ctx.fillStyle = '#FFC93C';
    ctx.beginPath();
    const cy = y - 4;
    ctx.moveTo(this.cx - 30, cy);
    ctx.lineTo(this.cx - 30, cy - 18);
    ctx.lineTo(this.cx - 15, cy - 8);
    ctx.lineTo(this.cx, cy - 24);
    ctx.lineTo(this.cx + 15, cy - 8);
    ctx.lineTo(this.cx + 30, cy - 18);
    ctx.lineTo(this.cx + 30, cy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#F25F5C';
    ctx.beginPath(); ctx.arc(this.cx, cy - 8, 4, 0, Math.PI * 2); ctx.fill();
    // 脸
    const ey = y + h * 0.4, f = this.facing;
    const dazed = this.state === 'dazed';
    for (const k of [-1, 1]) {
      const ex = this.cx + k * 20 + f * 6;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); rrect(ctx, ex - 9, ey - 10, 18, dazed ? 6 : 18, 5); ctx.fill();
      if (!dazed) {
        ctx.fillStyle = '#1D2030';
        ctx.beginPath(); rrect(ctx, ex - 4 + f * 3, ey - 3, 8, 9, 3); ctx.fill();
      }
    }
    ctx.strokeStyle = '#1D2030';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    if (!dazed) {
      ctx.beginPath();
      ctx.moveTo(this.cx - 32 + f * 6, ey - 18); ctx.lineTo(this.cx - 10 + f * 6, ey - 12);
      ctx.moveTo(this.cx + 32 + f * 6, ey - 18); ctx.lineTo(this.cx + 10 + f * 6, ey - 12);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(this.cx - 14, ey + 26); ctx.lineTo(this.cx + 14, ey + 26);
    ctx.stroke();
    if (dazed) this.drawDizzy(ctx, this.cx, y - 34, 34);
  }
}

// —— 2 烈日 ——
class SunBoss extends Boss {
  constructor(run, tx, ty) {
    super(run, tx * TILE + 16 - 44, -140, 88, 88);
    this.name = '烈日';
    this.color = '#FF9F1C';
    this.maxHp = this.hp = 5;
    this.homeY = TILE * 2;
    this.timer = 1.8;
    this.pattern = ['float', 'burst', 'float', 'slam'];
    this.pi = 0;
    this.fireT = 0;
    this.rayK = 1;
    this.hurtsWhileVulnerable = false;
  }
  next() {
    const s = this.pattern[this.pi % this.pattern.length];
    this.pi++;
    this.state = s;
    if (s === 'float') { this.timer = 3.4; this.fireT = 0.4; }
    else if (s === 'burst') { this.timer = 0.6; this.shots = 2; }
    else if (s === 'slam') { this.timer = 0.9; this.side = this.run.player.cx < (this.minX + this.maxX) / 2 ? 1 : -1; this.slamX = this.side > 0 ? this.maxX - this.w - 8 : this.minX + 8; }
  }
  update(dt) {
    if (this.tick(dt)) return;
    const run = this.run, p = run.player;
    const midX = (this.minX + this.maxX) / 2;
    this.rayK = damp(this.rayK, this.state === 'dizzy' ? 0 : 1, 6, dt);
    switch (this.state) {
      case 'intro':
        this.timer -= dt;
        this.y = damp(this.y, this.homeY, 3, dt);
        if (this.timer < 0.8 && !this.roared) { this.roared = true; Sound.play('bossRoar'); run.shake(5); }
        if (this.timer <= 0) this.next();
        break;
      case 'float': {
        this.timer -= dt;
        const tx = midX + Math.sin(this.t * 0.9) * (this.maxX - this.minX) * 0.36 - this.w / 2;
        this.x = damp(this.x, tx, 3, dt);
        this.y = damp(this.y, this.homeY + Math.sin(this.t * 2) * 10, 3, dt);
        this.fireT -= dt;
        if (this.fireT <= 0) {
          this.fireT = this.phase2 ? 0.42 : 0.58;
          run.addEnemy(new Bullet(run, this.cx + rand(-20, 20), this.y + this.h, rand(-60, 60), 80, { gravity: 700, color: '#FF7B54', life: 3 }));
          Sound.play('shoot');
        }
        if (this.timer <= 0) this.next();
        break;
      }
      case 'burst':
        this.timer -= dt;
        if (this.timer <= 0) {
          const n = this.phase2 ? 14 : 10;
          const off = this.shots % 2 ? Math.PI / n : 0;
          for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2 + off;
            run.addEnemy(new Bullet(run, this.cx, this.cy, Math.cos(a) * 150, Math.sin(a) * 150, { color: '#FFBF69', life: 4, ghost: true }));
          }
          Sound.play('laser');
          run.particles.ring(this.cx, this.cy, '#FFBF69', 50);
          this.shots--;
          this.timer = 0.7;
          if (this.shots <= 0) this.next();
        }
        break;
      case 'slam':
        this.timer -= dt;
        this.x = damp(this.x, this.slamX, 5, dt);
        this.y = damp(this.y, this.homeY - 10, 5, dt);
        if (this.timer <= 0) { this.state = 'drop'; this.vy = 0; }
        break;
      case 'drop':
        this.vy = Math.min(this.vy + 2600 * dt, 1100);
        this.y += this.vy * dt;
        if (this.y + this.h >= this.floorY) {
          this.y = this.floorY - this.h;
          this.state = 'roll';
          this.vx = -this.side * (290 + (this.maxHp - this.hp) * 28);
          run.shake(8);
          Sound.play('crush');
          run.particles.burst(this.cx, this.floorY, 16, { color: '#FFFFFF', speed: 200, life: 0.5, size: 6, angle: -Math.PI / 2, spread: Math.PI });
        }
        break;
      case 'roll':
        this.x += this.vx * dt;
        if (Math.random() < 0.4) run.particles.burst(this.cx, this.floorY - 2, 1, { color: '#FFBF69', speed: 50, life: 0.3, size: 5, gravity: -100 });
        if (this.x <= this.minX || this.x + this.w >= this.maxX) {
          this.x = clamp(this.x, this.minX, this.maxX - this.w);
          this.state = 'dizzy';
          this.timer = this.phase2 ? 1.5 : 1.9;
          run.shake(7);
          Sound.play('crush');
        }
        break;
      case 'dizzy':
        this.timer -= dt;
        if (this.timer <= 0) this.state = 'rise';
        break;
      case 'rise':
        this.y = damp(this.y, this.homeY, 4, dt);
        this.x = damp(this.x, midX - this.w / 2, 2, dt);
        if (Math.abs(this.y - this.homeY) < 6) this.next();
        break;
    }
  }
  onHit() {
    this.state = 'rise';
    const run = this.run;
    const n = 8;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI * (i + 0.5) / n;
      run.addEnemy(new Bullet(run, this.cx, this.cy, Math.cos(a) * 170, Math.sin(a) * 170, { color: '#FFBF69', life: 3, ghost: true }));
    }
  }
  touchPlayer(p) {
    const box = { x: this.x + 8, y: this.y + 8, w: this.w - 16, h: this.h - 12 };
    this.contact(p, box, this.state === 'dizzy');
  }
  onPlayerRespawn() { if (this.state !== 'dizzy') { this.state = 'rise'; } }
  draw(ctx) {
    if (this.gone) return;
    const cx = this.cx, cy = this.cy, r = this.w / 2;
    const spin = this.state === 'roll' ? this.t * 14 * Math.sign(this.vx || 1) : this.t * 0.8;
    // 光芒
    if (this.rayK > 0.05) {
      ctx.fillStyle = '#FFBF69';
      ctx.beginPath();
      for (let i = 0; i < 12; i++) {
        const a = spin + (i / 12) * Math.PI * 2;
        const r1 = r + 2, r2 = r + (12 + Math.sin(this.t * 6 + i) * 4) * this.rayK;
        ctx.moveTo(cx + Math.cos(a - 0.14) * r1, cy + Math.sin(a - 0.14) * r1);
        ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
        ctx.lineTo(cx + Math.cos(a + 0.14) * r1, cy + Math.sin(a + 0.14) * r1);
      }
      ctx.fill();
    }
    const path = () => { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); };
    path();
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.save(); path(); ctx.clip();
    ctx.fillStyle = shade(this.color, -0.15);
    ctx.fillRect(cx - r, cy + r * 0.35, r * 2, r);
    ctx.restore();
    this.drawFlash(ctx, path);
    // 脸
    const dizzy = this.state === 'dizzy';
    const f = this.run.player.cx < cx ? -1 : 1;
    ctx.save();
    if (this.state === 'roll') { ctx.translate(cx, cy); ctx.rotate(spin * 0.5); ctx.translate(-cx, -cy); }
    for (const k of [-1, 1]) {
      const ex = cx + k * 16 + f * 4, ey = cy - 6;
      if (dizzy) {
        ctx.strokeStyle = '#7A3B00';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let a = 0; a < Math.PI * 4; a += 0.3) ctx.lineTo(ex + Math.cos(a + this.t * 8) * a * 0.9, ey + Math.sin(a + this.t * 8) * a * 0.9);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.ellipse(ex, ey, 8, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1D2030';
        ctx.beginPath(); ctx.arc(ex + f * 3, ey + 2, 4.5, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.strokeStyle = '#7A3B00';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (dizzy) ctx.arc(cx, cy + 22, 8, Math.PI * 1.15, Math.PI * 1.85);
    else ctx.arc(cx, cy + 14, 10, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
    ctx.restore();
    if (dizzy) this.drawDizzy(ctx, cx, this.y - 16, 30);
  }
}

// —— 3 霜棱 ——
class PrismBoss extends Boss {
  constructor(run, tx, ty) {
    super(run, tx * TILE + 16 - 42, ty * TILE - 30, 84, 76);
    this.name = '霜棱';
    this.color = '#6FC6F0';
    this.maxHp = this.hp = 6;
    this.homeY = TILE * 3;
    this.alpha = 0;
    this.timer = 1.8;
    this.queue = [];
    this.secondDive = false;
  }
  plan() {
    const acts = ['shards', 'rain', 'teleport'];
    for (let i = acts.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [acts[i], acts[j]] = [acts[j], acts[i]]; }
    this.queue = acts.slice(0, 2).concat(['dive']);
  }
  next() {
    if (!this.queue.length) this.plan();
    const s = this.queue.shift();
    this.state = s;
    if (s === 'shards') { this.volleys = this.phase2 ? 4 : 3; this.timer = 0.5; }
    else if (s === 'rain') { this.drops = this.phase2 ? 9 : 6; this.timer = 0.3; }
    else if (s === 'teleport') { this.timer = 0.35; this.tp = 0; }
    else if (s === 'dive') { this.timer = this.secondDive ? 0.55 : 1.0; }
  }
  update(dt) {
    if (this.tick(dt)) return;
    const run = this.run, p = run.player;
    const bob = Math.sin(this.t * 2.4) * 8;
    switch (this.state) {
      case 'intro':
        this.timer -= dt;
        this.alpha = Math.min(1, this.alpha + dt);
        if (this.timer < 0.8 && !this.roared) { this.roared = true; Sound.play('bossRoar'); run.shake(5); }
        if (this.timer <= 0) { this.state = 'hover'; this.timer = 0.8; }
        break;
      case 'hover':
        this.timer -= dt;
        this.x = damp(this.x, clamp(p.cx - this.w / 2, this.minX, this.maxX - this.w), 1.2, dt);
        this.y = damp(this.y, this.homeY + bob, 4, dt);
        if (this.timer <= 0) this.next();
        break;
      case 'shards':
        this.y = damp(this.y, this.homeY + bob, 4, dt);
        this.timer -= dt;
        if (this.timer <= 0) {
          const a = Math.atan2(p.cy - this.cy, p.cx - this.cx);
          for (const d of [-0.2, 0, 0.2]) run.addEnemy(new Bullet(run, this.cx, this.cy + 10, Math.cos(a + d) * 240, Math.sin(a + d) * 240, { color: '#BFE8FA', life: 4 }));
          Sound.play('ice');
          this.volleys--;
          this.timer = 0.5;
          if (this.volleys <= 0) { this.state = 'hover'; this.timer = 0.5; }
        }
        break;
      case 'rain':
        this.y = damp(this.y, this.homeY + bob, 4, dt);
        this.timer -= dt;
        if (this.timer <= 0) {
          const tx = Math.floor(rand(this.minX + 8, this.maxX - 24) / TILE);
          const ic = new Icicle(run, tx, 1);
          ic.state = 'shake';
          ic.timer = 0.65;
          run.addEnemy(ic);
          this.drops--;
          this.timer = 0.25;
          if (this.drops <= 0) { this.state = 'hover'; this.timer = 0.9; }
        }
        break;
      case 'teleport':
        this.timer -= dt;
        if (this.tp === 0) {
          this.alpha = Math.max(0, this.timer / 0.35);
          if (this.timer <= 0) {
            let nx;
            do { nx = rand(this.minX, this.maxX - this.w); } while (Math.abs(nx + this.w / 2 - p.cx) < 140);
            this.x = nx;
            this.y = this.homeY + rand(-20, 30);
            this.tp = 1;
            this.timer = 0.35;
            Sound.play('orb');
          }
        } else {
          this.alpha = Math.min(1, 1 - this.timer / 0.35);
          if (this.timer <= 0) { this.alpha = 1; this.state = 'hover'; this.timer = 0.4; }
        }
        break;
      case 'dive':
        this.timer -= dt;
        this.x = damp(this.x, clamp(p.cx - this.w / 2, this.minX, this.maxX - this.w), this.timer > 0.35 ? 5 : 0.5, dt);
        this.y = damp(this.y, this.homeY - 10, 5, dt);
        this.shakeX = this.timer < 0.35 ? (Math.random() - 0.5) * 6 : 0;
        if (this.timer <= 0) { this.state = 'diving'; this.vy = 200; this.shakeX = 0; Sound.play('dash'); }
        break;
      case 'diving':
        this.vy = Math.min(this.vy + 3000 * dt, 1100);
        this.y += this.vy * dt;
        if (this.y + this.h >= this.floorY + 22) {
          this.y = this.floorY + 22 - this.h;
          this.state = 'stuck';
          this.timer = this.phase2 ? 1.35 : 1.75;
          run.shake(10);
          Sound.play('crush');
          run.particles.burst(this.cx, this.floorY, 22, { color: '#DFF5FF', speed: 240, life: 0.6, size: 6, angle: -Math.PI / 2, spread: Math.PI });
          for (const d of [-1, 1]) run.addEnemy(new Shockwave(run, this.cx + d * 50, this.floorY, d, 230, this.minX, this.maxX));
        }
        break;
      case 'stuck':
        this.timer -= dt;
        this.shakeX = this.timer < 0.3 ? (Math.random() - 0.5) * 5 : 0;
        if (this.timer <= 0) { this.state = 'rise'; this.shakeX = 0; }
        break;
      case 'rise':
        this.y = damp(this.y, this.homeY, 4, dt);
        if (Math.abs(this.y - this.homeY) < 8) {
          if (this.phase2 && !this.secondDive) { this.secondDive = true; this.state = 'dive'; this.timer = 0.55; }
          else { this.secondDive = false; this.state = 'hover'; this.timer = 0.6; }
        }
        break;
    }
  }
  onHit() { this.state = 'rise'; this.secondDive = true; this.shakeX = 0; }
  touchPlayer(p) {
    if (this.alpha < 0.6) return;
    const stuck = this.state === 'stuck';
    const box = stuck ? { x: this.x + 6, y: this.y, w: this.w - 12, h: this.floorY - this.y } : { x: this.x + 16, y: this.y + 4, w: this.w - 32, h: this.h * 0.7 };
    this.contact(p, box, stuck);
  }
  onPlayerRespawn() { if (this.state !== 'stuck') { this.state = 'hover'; this.timer = 1.2; } }
  draw(ctx) {
    if (this.gone) return;
    const x = this.x + (this.shakeX || 0), y = this.y;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    const path = () => { ctx.beginPath(); polyRound(ctx, [[x, y], [x + this.w, y], [x + this.w / 2, y + this.h]], 6); };
    path();
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.save(); path(); ctx.clip();
    ctx.fillStyle = shade(this.color, 0.35);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + this.w * 0.5, y); ctx.lineTo(x + this.w / 2, y + this.h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = shade(this.color, -0.12);
    ctx.fillRect(x, y, this.w, 10);
    ctx.restore();
    this.drawFlash(ctx, path);
    const stuck = this.state === 'stuck';
    const f = this.run.player.cx < this.cx ? -1 : 1;
    for (const k of [-1, 1]) {
      const ex = this.cx + k * 14 + f * 4, ey = y + 26;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.ellipse(ex, ey, 7, stuck ? 2.5 : 8, 0, 0, Math.PI * 2); ctx.fill();
      if (!stuck) {
        ctx.fillStyle = '#1D2030';
        ctx.beginPath(); ctx.arc(ex + f * 2, ey + 2, 3.5, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (stuck) this.drawDizzy(ctx, this.cx, y - 14, 30);
    ctx.restore();
  }
}

// —— 4 星蚀 ——
class EclipseBoss extends Boss {
  constructor(run, tx, ty) {
    super(run, tx * TILE + 16 - 50, ty * TILE - 50, 100, 100);
    this.name = '星蚀';
    this.color = '#8B5CF6';
    this.maxHp = this.hp = 8;
    this.timer = 2.4;
    this.open = 0;
    this.pi = 0;
    this.sats = ['square', 'circle', 'triangle'].map((shape, i) => ({ shape, a: (i * Math.PI * 2) / 3, st: 'orbit', x: 0, y: 0, vx: 0, vy: 0, t: 0 }));
    this.alpha = 0;
    this.home = { x: this.x, y: TILE * 3 };
  }
  get phase() { return this.hp > 5 ? 1 : this.hp > 2 ? 2 : 3; }
  next() {
    const P = { 1: ['sats', 'ring', 'summon', 'expose'], 2: ['laser', 'sats', 'ring', 'expose'], 3: ['spiral', 'laser', 'sats', 'expose'] }[this.phase];
    const s = P[this.pi % P.length];
    this.pi++;
    this.state = 'drift';
    this.after = s;
    this.timer = this.phase === 3 ? 0.8 : 1.2;
    this.wp = { x: rand(this.minX + 40, this.maxX - this.w - 40), y: TILE * rand(2, 4.5) };
  }
  start(s) {
    this.state = s;
    if (s === 'sats') { this.timer = 0.3; this.launchI = 0; }
    else if (s === 'ring') { this.timer = 0.5; this.shots = this.phase === 1 ? 2 : 3; }
    else if (s === 'summon') { this.timer = 0.6; }
    else if (s === 'laser') { this.timer = 0.2; this.lasers = this.phase === 3 ? 3 : 2; }
    else if (s === 'spiral') { this.timer = 2.6; this.emitT = 0; }
    else if (s === 'expose') { this.timer = 0.9; this.descending = true; }
  }
  update(dt) {
    this.updateSats(dt);
    if (this.tick(dt)) return;
    const run = this.run, p = run.player;
    const midX = (this.minX + this.maxX) / 2;
    this.open = damp(this.open, this.state === 'exposed' ? 1 : 0, 8, dt);
    switch (this.state) {
      case 'intro':
        this.timer -= dt;
        this.alpha = Math.min(1, this.alpha + dt * 0.8);
        if (this.timer < 1 && !this.roared) { this.roared = true; Sound.play('bossRoar'); run.shake(8); run.particles.ring(this.cx, this.cy, '#8B5CF6', 80); }
        if (this.timer <= 0) this.next();
        break;
      case 'drift':
        this.timer -= dt;
        this.x = damp(this.x, this.wp.x, 2.5, dt);
        this.y = damp(this.y, this.wp.y + Math.sin(this.t * 2) * 8, 2.5, dt);
        if (this.timer <= 0) this.start(this.after);
        break;
      case 'sats':
        this.timer -= dt;
        if (this.timer <= 0 && this.launchI < 3) {
          const s = this.sats[this.launchI];
          const a = Math.atan2(p.cy - s.y, p.cx - s.x);
          const sp = this.phase === 3 ? 470 : 400;
          s.st = 'launch'; s.vx = Math.cos(a) * sp; s.vy = Math.sin(a) * sp; s.t = 0;
          Sound.play('dash');
          this.launchI++;
          this.timer = this.phase === 3 ? 0.35 : 0.5;
        }
        if (this.launchI >= 3 && this.sats.every((s) => s.st === 'orbit')) this.next();
        break;
      case 'ring':
        this.timer -= dt;
        if (this.timer <= 0) {
          const n = 12, off = this.shots % 2 ? Math.PI / n : 0;
          for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2 + off;
            run.addEnemy(new Bullet(run, this.cx, this.cy, Math.cos(a) * 160, Math.sin(a) * 160, { color: '#FF5C7A', life: 4, ghost: true }));
          }
          Sound.play('laser');
          run.particles.ring(this.cx, this.cy, '#FF5C7A', 50);
          this.shots--;
          this.timer = 0.6;
          if (this.shots <= 0) this.next();
        }
        break;
      case 'summon':
        this.timer -= dt;
        if (this.timer <= 0) {
          const bats = run.enemies.filter((e) => e instanceof Bat && !e.dying).length;
          for (const d of bats < 3 ? [-1, 1] : []) {
            const b = new Bat(run, 0, 0);
            b.x = this.cx + d * 60; b.y = this.cy; b.awake = true;
            run.addEnemy(b);
          }
          Sound.play('bossRoar');
          this.next();
        }
        break;
      case 'laser':
        this.timer -= dt;
        if (this.timer <= 0) {
          const y = this.lasers % 2 === 1 ? p.cy : this.floorY - 16;
          run.addEnemy(new Laser(run, clamp(y, TILE * 2, this.floorY - 16), this.minX, this.maxX, 0.85));
          this.lasers--;
          this.timer = 0.75;
          if (this.lasers <= 0) { this.state = 'drift'; this.after = 'pauseNext'; this.timer = 1.2; this.wp = { x: this.x, y: this.y }; }
        }
        break;
      case 'pauseNext':
        this.next();
        break;
      case 'spiral':
        this.timer -= dt;
        this.emitT -= dt;
        if (this.emitT <= 0) {
          this.emitT = 0.09;
          for (let k = 0; k < 2; k++) {
            const a = this.t * 2.6 + k * Math.PI;
            run.addEnemy(new Bullet(run, this.cx, this.cy, Math.cos(a) * 150, Math.sin(a) * 150, { color: '#FF5C7A', life: 4, ghost: true }));
          }
        }
        if (this.timer <= 0) this.next();
        break;
      case 'expose': {
        this.timer -= dt;
        const ty = this.floorY - this.h + 10;
        this.x = damp(this.x, midX - this.w / 2, 4, dt);
        this.y = damp(this.y, ty, 4, dt);
        if (this.timer <= 0 || Math.abs(this.y - ty) < 3) {
          this.state = 'exposed';
          this.timer = this.phase === 3 ? 1.7 : this.phase === 2 ? 2.0 : 2.3;
          run.shake(6);
          Sound.play('crush');
        }
        break;
      }
      case 'exposed':
        this.timer -= dt;
        if (this.timer <= 0) this.rise();
        break;
      case 'rise':
        this.y = damp(this.y, TILE * 3, 4, dt);
        if (Math.abs(this.y - TILE * 3) < 10) this.next();
        break;
    }
  }
  rise() {
    this.state = 'rise';
    const run = this.run;
    const n = 10;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI * (i + 0.5) / n;
      run.addEnemy(new Bullet(run, this.cx, this.cy, Math.cos(a) * 180, Math.sin(a) * 180, { color: '#FF5C7A', life: 3, ghost: true }));
    }
  }
  updateSats(dt) {
    const run = this.run;
    for (const s of this.sats) {
      s.a += dt * (this.phase === 3 ? 2.4 : 1.6);
      const ox = this.cx + Math.cos(s.a) * 92, oy = this.cy + Math.sin(s.a) * 92 * 0.8;
      if (s.st === 'orbit') { s.x = damp(s.x || ox, ox, 12, dt); s.y = damp(s.y || oy, oy, 12, dt); }
      else if (s.st === 'launch') {
        s.t += dt;
        s.x += s.vx * dt; s.y += s.vy * dt;
        if (s.x < this.minX || s.x > this.maxX || s.y > this.floorY - 10 || s.y < -100 || s.t > 1.4) { s.st = 'return'; s.t = 0; run.particles.burst(s.x, s.y, 6, { color: '#C4B5FD', speed: 120, life: 0.3, size: 4 }); }
      } else {
        s.x = damp(s.x, ox, 5, dt); s.y = damp(s.y, oy, 5, dt);
        s.t += dt;
        if (s.t > 0.8) s.st = 'orbit';
      }
    }
  }
  onHit() { this.rise(); }
  touchPlayer(p) {
    if (this.alpha < 0.8) return;
    const exposed = this.state === 'exposed';
    const box = { x: this.x + 14, y: this.y + 14, w: this.w - 28, h: this.h - 22 };
    this.contact(p, box, exposed);
    if (this.state !== 'dying') {
      for (const s of this.sats) {
        if (Math.abs(p.cx - s.x) < 22 && Math.abs(p.cy - s.y) < 22) p.hurt(s.x);
      }
    }
  }
  onPlayerRespawn() {
    for (const s of this.sats) s.st = 'return';
    if (this.state !== 'exposed') { this.state = 'rise'; }
  }
  draw(ctx) {
    if (this.gone) return;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    const cx = this.cx, cy = this.cy;
    // 卫星
    for (const s of this.sats) {
      drawCharacter(ctx, { shape: s.shape, color: '#3B2F63' }, s.x, s.y + 12, { size: 24, facing: 1, color: '#3B2F63' });
      ctx.strokeStyle = 'rgba(196,181,253,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(s.x, s.y, 16, 0, Math.PI * 2); ctx.stroke();
    }
    // 光环
    const glow = 0.25 + 0.1 * Math.sin(this.t * 3);
    ctx.fillStyle = 'rgba(139,92,246,' + glow + ')';
    ctx.beginPath(); ctx.arc(cx, cy, 64, 0, Math.PI * 2); ctx.fill();
    // 外环（张开时分成两半）
    const gap = this.open * 18;
    const path = () => { ctx.beginPath(); ctx.arc(cx, cy, 50, 0, Math.PI * 2); };
    ctx.fillStyle = '#2B2350';
    for (const d of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(cx + d * gap, cy, 50, d < 0 ? Math.PI / 2 : -Math.PI / 2, d < 0 ? Math.PI * 1.5 : Math.PI / 2);
      ctx.arc(cx + d * gap, cy, 30, d < 0 ? Math.PI * 1.5 : Math.PI / 2, d < 0 ? Math.PI / 2 : -Math.PI / 2, true);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = '#C4B5FD';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, 50 + gap, this.t, this.t + 1.2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 50 + gap, this.t + Math.PI, this.t + Math.PI + 1.2); ctx.stroke();
    // 核心
    const coreR = 18 + this.open * 8;
    ctx.fillStyle = this.state === 'exposed' ? '#FF5C7A' : '#8B5CF6';
    ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    const p = this.run.player;
    const a = Math.atan2(p.cy - cy, p.cx - cx);
    ctx.beginPath(); ctx.arc(cx + Math.cos(a) * coreR * 0.4, cy + Math.sin(a) * coreR * 0.4, coreR * 0.38, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1D2030';
    ctx.beginPath(); ctx.arc(cx + Math.cos(a) * coreR * 0.5, cy + Math.sin(a) * coreR * 0.5, coreR * 0.18, 0, Math.PI * 2); ctx.fill();
    this.drawFlash(ctx, path);
    if (this.state === 'exposed') this.drawDizzy(ctx, cx, this.y - 6, 34);
    ctx.restore();
  }
}

function createBoss(type, run, tx, ty) {
  if (type === 'king') return new KingBoss(run, tx, ty);
  if (type === 'sun') return new SunBoss(run, tx, ty);
  if (type === 'prism') return new PrismBoss(run, tx, ty);
  return new EclipseBoss(run, tx, ty);
}
