'use strict';
// 玩家：移动手感、能力、碰撞

class Player {
  constructor(run, x, y, ch) {
    this.run = run;
    this.ch = ch;
    this.ab = ABILITY_SET[ch.ability];
    this.w = PHYS.bodyW;
    this.h = PHYS.bodyH;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.grounded = false;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.jumping = false;
    this.airJumps = 0;
    this.canDash = true;
    this.dashT = 0;
    this.dashDir = 1;
    this.dashCool = 0;
    this.pound = 0;
    this.poundT = 0;
    this.wallCoyote = 0;
    this.lastWallDir = 0;
    this.wallLock = 0;
    this.wallLockDir = 0;
    this.wallSliding = false;
    this.gliding = false;
    this.dropTimer = 0;
    this.invuln = 0;
    this.shield = false;
    this.platform = null;
    this.onIce = false;
    this.prevBottom = y + this.h;
    this.sx = 1;
    this.sy = 1;
    this.t = 0;
    this.blinkT = 2;
    this.stepT = 0;
    this.dead = false;
    this.deadT = 0;
    this.rot = 0;
    this.frozen = false;
    this.happy = false;
    this.trail = [];
  }

  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  get maxAirJumps() { return this.ab.double ? 1 : 0; }

  update(dt, inp) {
    const P = PHYS;
    const run = this.run;
    this.t += dt;
    this.blinkT -= dt;
    if (this.blinkT < -0.12) this.blinkT = 2 + Math.random() * 3;
    this.sx = damp(this.sx, 1, 14, dt);
    this.sy = damp(this.sy, 1, 14, dt);

    if (this.dead) {
      this.deadT += dt;
      this.vy = Math.min(this.vy + P.gravity * dt, 1100);
      this.y += this.vy * dt;
      this.rot += dt * 8 * this.facing;
      return;
    }
    if (this.frozen) {
      this.vx = approach(this.vx, 0, P.decelGround * dt);
      this.vy = Math.min(this.vy + P.gravity * dt, P.maxFall);
      this.prevBottom = this.y + this.h;
      this.moveX(this.vx * dt);
      this.moveY(this.vy * dt);
      return;
    }

    this.invuln = Math.max(0, this.invuln - dt);
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    this.coyote = Math.max(0, this.coyote - dt);
    this.wallCoyote = Math.max(0, this.wallCoyote - dt);
    this.wallLock = Math.max(0, this.wallLock - dt);
    this.dashCool = Math.max(0, this.dashCool - dt);
    this.dropTimer = Math.max(0, this.dropTimer - dt);

    // 跟随移动平台
    if (this.platform) {
      const pl = this.platform;
      const onTop = !pl.dead && this.x + this.w > pl.x && this.x < pl.x + pl.w && Math.abs(this.y + this.h - (pl.y - pl.dy)) < 3;
      if (onTop) {
        this.moveX(pl.dx);
        this.y = pl.y - this.h;
      } else this.platform = null;
    }
    this.prevBottom = this.y + this.h;

    let dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    if (inp.jumpPressed) this.jumpBuffer = P.buffer;

    // 从薄平台落下
    if (this.grounded && inp.down && this.jumpBuffer > 0 && this.onOneWay()) {
      this.dropTimer = 0.22;
      this.jumpBuffer = 0;
      this.grounded = false;
      this.platform = null;
      this.coyote = 0;
      this.y += 2;
    }

    // 下砸
    if (inp.downPressed && !this.grounded && this.pound === 0 && this.dashT <= 0 && !this.nearGround(36)) {
      this.pound = 1;
      this.poundT = 0.13;
      this.vx = 0;
      this.vy = 0;
      this.jumping = false;
      this.gliding = false;
      Sound.play('poundStart');
    }

    // 冲刺
    if (inp.abilityPressed && this.ab.dash && this.canDash && this.dashCool <= 0 && this.pound === 0) {
      this.dashT = P.dashTime;
      this.dashDir = dir || this.facing;
      this.facing = this.dashDir;
      this.canDash = false;
      this.dashCool = P.dashCool;
      this.vy = 0;
      this.jumping = false;
      this.sx = 1.4;
      this.sy = 0.7;
      Sound.play('dash');
      run.shake(2);
    }

    this.wallSliding = false;
    this.gliding = false;

    if (this.dashT > 0) {
      this.dashT -= dt;
      this.vx = this.dashDir * P.dashV;
      this.vy = 0;
      if (this.dashT <= 0) this.vx = this.dashDir * P.run;
      if (Math.random() < 0.6) run.particles.burst(this.cx - this.dashDir * 10, this.cy + rand(-8, 8), 1, { color: this.ch.color, speed: 40, life: 0.3, size: 5, shape: 'square', gravity: 0 });
      this.trail.push({ x: this.cx, y: this.y + this.h, t: 0.18 });
    } else if (this.pound > 0) {
      this.vx = 0;
      if (this.pound === 1) {
        this.vy = 0;
        this.poundT -= dt;
        this.rot += dt * 30;
        if (this.poundT <= 0) {
          this.pound = 2;
          this.rot = 0;
          this.vy = P.poundV;
        }
      } else {
        this.vy = P.poundV;
        this.sy = 1.25;
        this.sx = 0.8;
      }
    } else {
      if (this.wallLock > 0) dir = this.wallLockDir;
      const max = this.ch.speed || P.run;
      let accel, decel;
      if (this.grounded) {
        accel = this.onIce ? P.iceAccel : P.accelGround;
        decel = this.onIce ? P.iceDecel : P.decelGround;
      } else {
        accel = P.accelAir * (this.ab.glide ? 1.1 : 1);
        decel = P.decelAir;
      }
      if (dir !== 0) {
        if (Math.abs(this.vx) > max && Math.sign(this.vx) === dir) this.vx = approach(this.vx, dir * max, decel * 0.5 * dt);
        else {
          const turning = this.vx !== 0 && Math.sign(this.vx) === -dir;
          this.vx = approach(this.vx, dir * max, (turning ? Math.max(accel, decel) : accel) * dt);
        }
        this.facing = dir;
      } else {
        this.vx = approach(this.vx, 0, decel * dt);
      }

      let grav = P.gravity * (this.vy > 0 ? P.fallMul : 1);
      let maxFall = P.maxFall;
      if (this.ab.glide && !this.grounded && inp.jump && this.vy > 0) {
        this.gliding = true;
        maxFall = P.glideFall;
        grav *= 0.5;
      }
      if (this.ab.wall && !this.grounded) {
        const wd = this.touchingWall();
        if (wd !== 0) {
          this.wallCoyote = 0.1;
          this.lastWallDir = wd;
          if (dir === wd && this.vy > 0) {
            this.wallSliding = true;
            maxFall = P.wallSlide;
            if (Math.random() < 0.25) run.particles.burst(wd > 0 ? this.x + this.w : this.x, this.y + this.h - 4, 1, { color: '#FFFFFF', speed: 30, life: 0.3, size: 3 });
          }
        }
      }
      this.vy = Math.min(this.vy + grav * dt, maxFall);
      if (this.vy > maxFall) this.vy = maxFall;

      if (this.jumpBuffer > 0) {
        if (this.grounded || this.coyote > 0) this.doJump(P.jumpV, 'jump');
        else if (this.ab.wall && this.wallCoyote > 0) this.doWallJump();
        else if (this.airJumps > 0) {
          this.airJumps--;
          this.doJump(P.airJumpV, 'airjump');
          run.particles.ring(this.cx, this.y + this.h, this.ch.color);
        }
      }
      if (!inp.jump && this.jumping && this.vy < 0) {
        this.vy *= P.jumpCut;
        this.jumping = false;
      }
      if (this.vy >= 0) this.jumping = false;
    }

    // 风
    if (run.wind && this.dashT <= 0) this.moveX(run.wind * (this.grounded ? 0.35 : 1) * dt);

    const wasGrounded = this.grounded;
    const fallSpeed = this.vy;
    this.moveX(this.vx * dt);
    this.moveY(this.vy * dt);
    this.collidePlatforms();

    if (this.grounded) {
      this.coyote = P.coyote;
      this.airJumps = this.maxAirJumps;
      this.canDash = true;
      if (!wasGrounded) this.onLand(fallSpeed);
      // 跑步扬尘与脚步
      if (Math.abs(this.vx) > 60 && this.pound === 0) {
        this.stepT -= dt * Math.abs(this.vx) / 120;
        if (this.stepT <= 0) {
          this.stepT = 1;
          run.particles.burst(this.cx - this.facing * 8, this.y + this.h - 2, 1, { color: run.world.pal.deco, speed: 30, life: 0.35, size: 4, gravity: -40, alpha: 0.7 });
        }
      }
    }

    // 拖影
    for (const tr of this.trail) tr.t -= dt;
    while (this.trail.length && this.trail[0].t <= 0) this.trail.shift();
  }

  doJump(v, kind) {
    this.vy = -v;
    this.grounded = false;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.jumping = true;
    this.platform = null;
    this.sx = 0.72;
    this.sy = 1.3;
    Sound.play(kind);
    this.run.stats.jumps++;
    if (kind === 'jump') this.run.particles.burst(this.cx, this.y + this.h, 5, { color: this.run.world.pal.deco, speed: 70, life: 0.35, size: 4, gravity: 100, spread: Math.PI, angle: -Math.PI / 2, alpha: 0.8 });
  }

  doWallJump() {
    const P = PHYS;
    this.vx = -this.lastWallDir * P.wallJumpVX;
    this.vy = -P.wallJumpVY;
    this.wallLock = 0.14;
    this.wallLockDir = -this.lastWallDir;
    this.facing = -this.lastWallDir;
    this.jumping = true;
    this.wallCoyote = 0;
    this.jumpBuffer = 0;
    this.sx = 0.75;
    this.sy = 1.25;
    Sound.play('walljump');
    this.run.particles.burst(this.lastWallDir > 0 ? this.x + this.w : this.x, this.cy, 6, { color: '#FFFFFF', speed: 90, life: 0.3, size: 4 });
  }

  onLand(v) {
    const run = this.run;
    if (this.pound === 2) {
      this.pound = 0;
      this.sx = 1.5;
      this.sy = 0.6;
      run.shake(6);
      Sound.play('pound');
      run.particles.burst(this.cx, this.y + this.h, 14, { color: run.world.pal.deco, speed: 180, life: 0.45, size: 6, gravity: 300, spread: Math.PI, angle: -Math.PI / 2 });
      run.poundImpact(this);
      return;
    }
    if (v > 300) {
      this.sx = 1 + Math.min(0.35, v / 2400);
      this.sy = 1 - Math.min(0.3, v / 2800);
      Sound.play('land');
      run.particles.burst(this.cx, this.y + this.h, 4, { color: run.world.pal.deco, speed: 60, life: 0.3, size: 4, gravity: 0, spread: 0.6, angle: 0, mirror: true, alpha: 0.8 });
    }
  }

  moveX(dx) {
    if (dx === 0) return;
    const map = this.run.map;
    this.x += dx;
    const top = Math.floor(this.y / TILE), bot = Math.floor((this.y + this.h - 0.01) / TILE);
    if (dx > 0) {
      const tx = Math.floor((this.x + this.w - 0.01) / TILE);
      for (let ty = top; ty <= bot; ty++) {
        if (!map.solid(tx, ty)) continue;
        if (this.dashT > 0 && this.run.dashBreak(tx, ty)) continue;
        this.x = tx * TILE - this.w;
        if (this.dashT <= 0) this.vx = Math.min(this.vx, 0);
        return;
      }
    } else {
      const tx = Math.floor(this.x / TILE);
      for (let ty = top; ty <= bot; ty++) {
        if (!map.solid(tx, ty)) continue;
        if (this.dashT > 0 && this.run.dashBreak(tx, ty)) continue;
        this.x = (tx + 1) * TILE;
        if (this.dashT <= 0) this.vx = Math.max(this.vx, 0);
        return;
      }
    }
  }

  fits(x, y) {
    const map = this.run.map;
    const x0 = Math.floor(x / TILE), x1 = Math.floor((x + this.w - 0.01) / TILE);
    const y0 = Math.floor(y / TILE), y1 = Math.floor((y + this.h - 0.01) / TILE);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (map.solid(tx, ty)) return false;
    return true;
  }

  moveY(dy) {
    const map = this.run.map;
    this.y += dy;
    const left = Math.floor(this.x / TILE), right = Math.floor((this.x + this.w - 0.01) / TILE);
    this.grounded = false;
    if (dy > 0) {
      const ty = Math.floor((this.y + this.h - 0.01) / TILE);
      if (this.pound === 2) {
        let broke = false;
        for (let tx = left; tx <= right; tx++) if (map.get(tx, ty) === 'B') { this.run.breakBlock(tx, ty); broke = true; }
        if (broke) { this.run.shake(4); this.run.hitStop(0.04); }
      }
      let hit = false, ice = false;
      for (let tx = left; tx <= right; tx++) {
        const solid = map.solid(tx, ty);
        const one = !solid && map.oneway(tx, ty) && this.prevBottom <= ty * TILE + 0.5 && this.dropTimer <= 0;
        if (solid || one) {
          hit = true;
          if (map.get(tx, ty) === 'I') ice = true;
          if (map.get(tx, ty) === 'x') this.run.touchCrumble(tx, ty);
        }
      }
      if (hit) {
        this.y = ty * TILE - this.h;
        this.vy = 0;
        this.grounded = true;
        this.onIce = ice;
        this.platform = null;
      }
    } else if (dy < 0) {
      const ty = Math.floor(this.y / TILE);
      const hitL = map.solid(left, ty), hitR = left !== right && map.solid(right, ty);
      if (hitL || hitR) {
        // 擦角修正：只蹭到边角时把人推开
        if (hitL && !hitR) {
          const push = (left + 1) * TILE - this.x;
          if (push <= 8 && this.fits(this.x + push, this.y)) { this.x += push; return; }
        }
        if (hitR && !hitL) {
          const push = this.x + this.w - right * TILE;
          if (push <= 8 && this.fits(this.x - push, this.y)) { this.x -= push; return; }
        }
        this.y = (ty + 1) * TILE;
        this.vy = 0;
        this.jumping = false;
        let bx = left;
        if (hitL && hitR) bx = Math.floor(this.cx / TILE);
        else if (hitR) bx = right;
        this.run.bonk(bx, ty, this);
      }
    }
  }

  collidePlatforms() {
    if (this.vy < 0) return;
    for (const pl of this.run.platforms) {
      if (pl.dead || pl.passable) continue;
      if (this.dropTimer > 0 && pl.oneWay) continue;
      if (this.x + this.w <= pl.x || this.x >= pl.x + pl.w) continue;
      const prevTop = pl.y - pl.dy;
      if (this.prevBottom <= Math.max(prevTop, pl.y) + 1 && this.y + this.h >= pl.y && this.y + this.h <= pl.y + pl.h + 16) {
        this.y = pl.y - this.h;
        this.vy = 0;
        this.grounded = true;
        this.onIce = false;
        this.platform = pl;
        if (pl.onStand) pl.onStand(this);
        return;
      }
    }
  }

  onOneWay() {
    if (this.platform && this.platform.oneWay) return true;
    const map = this.run.map;
    const ty = Math.floor((this.y + this.h + 1) / TILE);
    const left = Math.floor(this.x / TILE), right = Math.floor((this.x + this.w - 0.01) / TILE);
    let any = false;
    for (let tx = left; tx <= right; tx++) {
      if (map.solid(tx, ty)) return false;
      if (map.oneway(tx, ty)) any = true;
    }
    return any;
  }

  nearGround(d) {
    const map = this.run.map;
    const ty = Math.floor((this.y + this.h + d) / TILE);
    const left = Math.floor(this.x / TILE), right = Math.floor((this.x + this.w - 0.01) / TILE);
    for (let tx = left; tx <= right; tx++) if (map.solid(tx, ty) || map.oneway(tx, ty)) return true;
    return false;
  }

  touchingWall() {
    const map = this.run.map;
    const y0 = Math.floor((this.y + 4) / TILE), y1 = Math.floor((this.y + this.h - 6) / TILE);
    const lx = Math.floor((this.x - 1.5) / TILE), rx = Math.floor((this.x + this.w + 1.5) / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      if (map.solid(rx, ty) && map.get(rx, ty) !== 'x') return 1;
      if (map.solid(lx, ty) && map.get(lx, ty) !== 'x') return -1;
    }
    return 0;
  }

  bounce(v) {
    this.vy = -v;
    this.grounded = false;
    this.jumping = false;
    this.pound = 0;
    this.rot = 0;
    this.airJumps = this.maxAirJumps;
    this.canDash = true;
    this.coyote = 0;
    this.platform = null;
    this.sx = 0.75;
    this.sy = 1.3;
  }

  hurt(fromX, ignoreDash) {
    if (this.dead || this.invuln > 0 || this.frozen) return false;
    if (this.dashT > 0 && !ignoreDash) return false;
    const run = this.run;
    const away = fromX == null ? -this.facing : Math.sign(this.cx - fromX) || -this.facing;
    if (this.shield) {
      this.shield = false;
      this.invuln = 1.0;
      Sound.play('shield');
      run.particles.burst(this.cx, this.cy, 16, { color: '#9FE6FF', speed: 200, life: 0.5, size: 5 });
      this.vx = away * 220;
      this.vy = -380;
      this.pound = 0;
      this.dashT = 0;
      run.shake(4);
      return true;
    }
    run.hearts--;
    this.invuln = 1.3;
    this.vx = away * 240;
    this.vy = -420;
    this.pound = 0;
    this.dashT = 0;
    this.jumping = false;
    this.platform = null;
    run.shake(7);
    run.hitStop(0.06);
    run.flash = 0.25;
    Sound.play('hurt');
    run.particles.burst(this.cx, this.cy, 10, { color: this.ch.color, speed: 180, life: 0.5, size: 5 });
    if (run.hearts <= 0) this.die();
    return true;
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    this.deadT = 0;
    this.vy = -680;
    this.vx = 0;
    this.pound = 0;
    this.dashT = 0;
    Sound.play('die');
    this.run.onPlayerDown();
  }

  draw(ctx) {
    const blinkOn = this.blinkT < 0;
    const flicker = this.invuln > 0 && !this.dead && Math.floor(this.t * 16) % 2 === 0;
    // 冲刺拖影
    for (const tr of this.trail) {
      drawCharacter(ctx, this.ch, tr.x, tr.y, { alpha: (tr.t / 0.18) * 0.35, facing: this.facing, sx: 1.1, sy: 0.9 });
    }
    let sx = this.sx, sy = this.sy;
    if (this.gliding) { sx *= 1.15; sy *= 0.88; }
    if (this.wallSliding) { sx *= 0.9; sy *= 1.05; }
    const lookY = clamp(this.vy / 700, -1, 1);
    const footY = this.y + this.h + 1;
    if (this.grounded && !this.dead) {
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.beginPath();
      ctx.ellipse(this.cx, footY - 1, 13 * sx, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (this.gliding) {
      // 滑翔时头顶的小伞
      ctx.fillStyle = rgba('#FFFFFF', 0.9);
      ctx.beginPath();
      ctx.ellipse(this.cx, this.y - 12, 22, 9, 0, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = rgba('#FFFFFF', 0.9);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(this.cx - 18, this.y - 12); ctx.lineTo(this.cx - 6, this.y + 2);
      ctx.moveTo(this.cx + 18, this.y - 12); ctx.lineTo(this.cx + 6, this.y + 2);
      ctx.stroke();
    }
    drawCharacter(ctx, this.ch, this.cx, footY, {
      sx, sy, facing: this.facing, lookY, blink: blinkOn, alpha: flicker ? 0.35 : 1,
      rot: this.dead || this.pound === 1 ? this.rot : 0, happy: this.happy,
    });
    if (this.shield) {
      const r = 22 + Math.sin(this.t * 5) * 1.5;
      ctx.fillStyle = 'rgba(159,230,255,0.18)';
      ctx.strokeStyle = 'rgba(159,230,255,0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.cx, this.cy - 1, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.ellipse(this.cx - 8, this.cy - 10, 5, 3, -0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
