'use strict';
// 一次关卡游玩：实体管理、相机、HUD

const KEY_LABELS = {
  keyboard: { move: '← →', jump: '空格', down: '↓', ability: 'Shift' },
  touch: { move: '左右按钮', jump: '跳跃按钮', down: '下按钮', ability: '冲刺按钮' },
  pad: { move: '摇杆', jump: 'A 键', down: '下', ability: 'B 键' },
};

const ABILITY_HINT = {
  double: '{name}会二段跳：在空中再按一次 {jump}。',
  glide: '{name}会滑翔：下落时按住 {jump}，慢慢飘下来。',
  dash: '{name}会冲刺：按 {ability} 向前猛冲，还能撞碎裂纹砖。',
  wall: '{name}会蹬墙跳：贴着墙按 {jump} 就能往上蹬。',
  star: '{name}什么都会：二段跳，再加上 {ability} 冲刺。',
};

class LevelRun {
  constructor(def, ch, opts = {}) {
    this.def = def;
    this.world = WORLDS[def.world];
    this.char = ch;
    const parsed = parseLevel(def);
    this.map = parsed.map;
    this.enemies = [];
    this.items = [];
    this.back = [];
    this.platforms = [];
    this.particles = new Particles();
    this.crumble = new Map();
    this.crumbleGone = [];
    this.bump = new Map();
    this.fx = { crumble: this.crumble, bump: this.bump };
    this.stats = { jumps: 0, enemies: 0, deaths: 0 };
    this.time = 0;
    this.t = 0;
    this.coins = 0;
    this.gems = [false, false, false];
    this.maxHearts = Save.maxHearts();
    this.hearts = this.maxHearts;
    this.magnetR = [0, 2, 3, 5][Save.data.upg.magnet || 0] * TILE;
    this.state = 'play';
    this.stateT = 0;
    this.shakeT = 0;
    this.shakeMag = 0;
    this.hitStopT = 0;
    this.flash = 0;
    this.fade = 1;
    this.fadeTarget = 0;
    this.activeSign = null;
    this.boss = null;
    this.checkpoint = null;
    this.windT = 0;
    this.wind = 0;
    this.snow = [];
    this.banner = 2.6;
    this.onDone = opts.onDone || (() => {});
    this.onDown = opts.onDown || (() => {});

    const st = parsed.start;
    this.startPos = { x: st.tx * TILE + (TILE - PHYS.bodyW) / 2, y: (st.ty + 1) * TILE - PHYS.bodyH };
    this.player = new Player(this, this.startPos.x, this.startPos.y, ch);
    this.player.shield = (Save.data.upg.shield || 0) > 0;

    for (const s of parsed.spawns) this.spawn(s);
    this.cam = { x: 0, y: 0 };
    this.camTY = 0;
    this.lookX = 0;
    this.view = { w: 800, h: 450 };
  }

  spawn(s) {
    const { c, tx, ty } = s;
    switch (c) {
      case 'o': this.items.push(new Coin(this, tx, ty)); break;
      case '*': this.items.push(new Gem(this, tx, ty, s.index)); break;
      case '+': this.items.push(new HeartPickup(this, tx, ty)); break;
      case 'C': this.back.push(new Checkpoint(this, tx, ty)); break;
      case 'G': this.back.push(new Goal(this, tx, ty)); break;
      case '!': this.back.push(new Sign(this, tx, ty, s.index)); break;
      case 'S': this.back.push(new Spring(this, tx, ty)); break;
      case '@': this.items.push(new Orb(this, tx, ty)); break;
      case 'M': this.platforms.push(new MovingPlatform(this, tx, ty, 'x')); break;
      case 'N': this.platforms.push(new MovingPlatform(this, tx, ty, 'y')); break;
      case 'w': this.enemies.push(new Walker(this, tx, ty, false)); break;
      case 'k': this.enemies.push(new Walker(this, tx, ty, true)); break;
      case 'h': this.enemies.push(new Hopper(this, tx, ty)); break;
      case 'f': this.enemies.push(new Flyer(this, tx, ty)); break;
      case 't': this.enemies.push(new Turret(this, tx, ty)); break;
      case 'b': this.enemies.push(new Bat(this, tx, ty)); break;
      case 'T': this.enemies.push(new Crusher(this, tx, ty)); break;
      case 's': this.enemies.push(new Saw(this, tx, ty, 'x')); break;
      case 'z': this.enemies.push(new Saw(this, tx, ty, 'y')); break;
      case 'i': this.enemies.push(new Icicle(this, tx, ty)); break;
      case 'K': this.boss = createBoss(this.def.boss, this, tx, ty); break;
    }
  }

  addEnemy(e) { this.enemies.push(e); }

  // —— 供实体调用 ——
  shake(m) {
    if (!Save.data.settings.shake) return;
    this.shakeMag = Math.max(this.shakeMag, m);
    this.shakeT = 0.25;
  }
  hitStop(t) { this.hitStopT = Math.max(this.hitStopT, t); }

  addCoins(n, x, y) {
    this.coins += n;
    Sound.play('coin');
    this.particles.burst(x, y, 4, { color: '#FFE08A', speed: 80, life: 0.3, size: 3, gravity: 0 });
  }
  addHeart(x, y) {
    if (this.hearts < this.maxHearts) {
      this.hearts++;
      this.particles.text(x, y - 10, '+1 ♥', '#FF5D73');
    } else {
      this.coins += 5;
      this.particles.text(x, y - 10, '+5', '#FFC93C');
    }
    Sound.play('heart');
  }
  gemOwned(i) {
    const l = Save.data.levels[this.def.id];
    return !!(l && l.gems && l.gems[i]);
  }
  collectGem(i, x, y) {
    this.gems[i] = true;
    Sound.play('gem');
    this.hitStop(0.05);
    this.particles.ring(x, y, '#3EC1F3', 30);
    this.particles.burst(x, y, 16, { color: '#3EC1F3', speed: 200, life: 0.6, size: 5, gravity: 120 });
    this.gemFlash = 1.2;
  }
  setCheckpoint(cp) {
    for (const b of this.back) if (b instanceof Checkpoint && b !== cp) b.active = false;
    cp.active = true;
    cp.flagT = 0;
    this.checkpoint = cp;
    if (this.hearts < this.maxHearts) this.hearts++;
    Sound.play('checkpoint');
    this.particles.burst(cp.cx, cp.y + 10, 12, { color: this.char.color, speed: 160, life: 0.5, size: 5 });
  }
  bonk(tx, ty, p) {
    const c = this.map.get(tx, ty);
    if (c === '?') {
      this.map.set(tx, ty, 'U');
      this.bump.set(tx + ',' + ty, 0.18);
      this.coins += 1;
      Sound.play('coin');
      this.particles.text(tx * TILE + 16, ty * TILE - 8, '+1', '#FFC93C');
      this.particles.burst(tx * TILE + 16, ty * TILE, 6, { color: '#FFC93C', speed: 140, life: 0.4, size: 4, angle: -Math.PI / 2, spread: 1.2 });
      this.bonkEnemiesAbove(tx, ty);
    } else if (c === 'B') {
      this.breakBlock(tx, ty);
      this.bonkEnemiesAbove(tx, ty);
    } else {
      Sound.play('bump');
    }
  }
  bonkEnemiesAbove(tx, ty) {
    for (const e of this.enemies) {
      if (e.dying || e.dead || !e.stompable) continue;
      if (Math.abs(e.y + e.h - ty * TILE) < 6 && e.x + e.w > tx * TILE && e.x < (tx + 1) * TILE) e.kill('pound');
    }
  }
  breakBlock(tx, ty) {
    this.map.set(tx, ty, '.');
    Sound.play('break');
    this.shake(3);
    const col = this.world.pal.block;
    for (let i = 0; i < 4; i++) {
      this.particles.list.push({
        x: tx * TILE + 8 + (i % 2) * 16, y: ty * TILE + 8 + Math.floor(i / 2) * 16,
        vx: (i % 2 ? 1 : -1) * rand(60, 140), vy: rand(-380, -200), life: 0.8, max: 0.8, size: 12,
        color: col, g: 1400, shape: 'square', alpha: 1, rot: 0, vr: rand(-10, 10),
      });
    }
  }
  dashBreak(tx, ty) {
    if (this.map.get(tx, ty) === 'B') { this.breakBlock(tx, ty); return true; }
    return false;
  }
  touchCrumble(tx, ty) {
    const k = tx + ',' + ty;
    if (this.crumble.has(k)) return;
    this.crumble.set(k, 0.42);
    Sound.play('crumble');
  }
  poundImpact(p) {
    for (const e of this.enemies) {
      if (e.dying || e.dead || !e.stompable) continue;
      if (Math.abs(e.y + e.h - (p.y + p.h)) < 10 && Math.abs(e.cx - p.cx) < 56) e.kill('pound');
    }
    if (this.boss && this.boss.onPound) this.boss.onPound(p);
  }

  onPlayerDown() {
    this.state = 'down';
    this.stateT = 0;
    this.stats.deaths++;
    const lossPct = [0.3, 0.15, 0][Save.data.upg.insure || 0];
    const loss = Math.floor(this.coins * lossPct);
    this.coins -= loss;
    this.lastLoss = loss;
    this.onDown();
  }

  respawn() {
    const p = this.player;
    const pos = this.checkpoint ? this.checkpoint.respawn : this.startPos;
    const np = new Player(this, pos.x, pos.y, this.char);
    np.shield = (Save.data.upg.shield || 0) > 0;
    np.invuln = 1.2;
    np.facing = p.facing;
    this.player = np;
    this.hearts = this.maxHearts;
    this.state = 'play';
    this.updateCamera(0, true);
    this.fade = 1;
    this.fadeTarget = 0;
    if (this.boss && this.boss.onPlayerRespawn) this.boss.onPlayerRespawn();
    // 离得太近的子弹清掉，给玩家喘息
    for (const e of this.enemies) if (e.isBullet) e.dead = true;
  }

  complete() {
    if (this.state === 'complete') return;
    this.state = 'complete';
    this.stateT = 0;
    const p = this.player;
    p.frozen = true;
    p.happy = true;
    p.invuln = 0;
    Sound.play('win');
    Music.stop();
    for (let i = 0; i < 40; i++) {
      const colors = ['#F25F5C', '#21B8A8', '#9B5DE5', '#EE5DAF', '#F7C948', '#3EC1F3'];
      this.particles.burst(p.cx + rand(-60, 60), p.y - rand(20, 80), 1, { color: pick(colors), speed: 260, life: 1.4, size: 7, gravity: 380, angle: -Math.PI / 2, spread: 2.2, shape: 'square' });
    }
  }

  // —— 主循环 ——
  update(dt, inp) {
    this.t += dt;
    this.fade = damp(this.fade, this.fadeTarget, 6, dt);
    this.banner = Math.max(0, this.banner - dt);
    this.flash = Math.max(0, this.flash - dt);
    if (this.gemFlash) this.gemFlash = Math.max(0, this.gemFlash - dt);
    if (this.shakeT > 0) { this.shakeT -= dt; if (this.shakeT <= 0) this.shakeMag = 0; }
    if (this.hitStopT > 0) { this.hitStopT -= dt; return; }
    if (this.state === 'play' || this.state === 'bossdead') this.time += dt;
    this.stateT += dt;

    // 风
    if (this.def.wind) {
      this.windT += dt;
      const cyc = this.windT % 6;
      const k = cyc < 3 ? 0 : cyc < 3.5 ? (cyc - 3) / 0.5 : cyc < 5.5 ? 1 : (6 - cyc) / 0.5;
      this.wind = -50 * k;
    }

    for (const [k, v] of this.bump) { const nv = v - dt; if (nv <= 0) this.bump.delete(k); else this.bump.set(k, nv); }
    for (const [k, v] of this.crumble) {
      const nv = v - dt;
      if (nv <= 0) {
        this.crumble.delete(k);
        const [tx, ty] = k.split(',').map(Number);
        this.map.set(tx, ty, '.');
        this.crumbleGone.push({ tx, ty, t: 3 });
        this.particles.list.push({ x: tx * TILE + 16, y: ty * TILE + 16, vx: 0, vy: 60, life: 0.6, max: 0.6, size: 26, color: shade(this.world.pal.plank, -0.12), g: 1200, shape: 'square', alpha: 1, rot: 0, vr: rand(-2, 2) });
      } else this.crumble.set(k, nv);
    }
    for (const c of this.crumbleGone) {
      c.t -= dt;
      if (c.t <= 0) {
        const p = this.player;
        const box = { x: c.tx * TILE, y: c.ty * TILE, w: TILE, h: TILE };
        if (!overlaps(box, p)) { this.map.set(c.tx, c.ty, 'x'); c.done = true; }
        else c.t = 0.3;
      }
    }
    this.crumbleGone = this.crumbleGone.filter((c) => !c.done);

    for (const pl of this.platforms) if (!(pl instanceof Crusher)) pl.update(dt);

    const p = this.player;
    const pin = this.state === 'play' || this.state === 'bossdead' ? inp : { left: false, right: false, jump: false, down: false };
    p.update(dt, pin);

    this.activeSign = null;
    for (const b of this.back) b.update(dt);
    for (const it of this.items) it.update(dt);
    this.items = this.items.filter((i) => !i.dead);

    for (const e of this.enemies) {
      if (e.dead) continue;
      e.update(dt);
      if (e.dead || e.dying || p.dead || this.state !== 'play') continue;
      if (overlaps(p, e)) this.touchEnemy(e);
    }
    this.enemies = this.enemies.filter((e) => !e.dead);
    this.platforms = this.platforms.filter((e) => !e.dead);
    if (this.boss) {
      this.boss.update(dt);
      if (!p.dead && this.state === 'play') this.boss.touchPlayer(p);
    }

    if (!p.dead && this.state === 'play') {
      this.checkSpikes(p);
      if (p.y > this.map.ph + 60) this.fellInPit();
    }

    if (this.state === 'down' && p.dead) {
      if (this.stateT > 1.1) this.fadeTarget = 1;
      if (this.stateT > 1.5) this.respawn();
    } else if (this.state === 'pit') {
      if (this.stateT > 0.45) this.respawnFromPit();
    } else if (this.state === 'complete') {
      if (this.stateT > 2.0 && !this.doneSent) { this.doneSent = true; this.onDone(this); }
    }

    this.particles.update(dt);
    this.updateSnow(dt);
    this.updateCamera(dt, false);
  }

  touchEnemy(e) {
    const p = this.player;
    if (p.dashT > 0 && e.dashKill) {
      e.kill('dash');
      Sound.play('stomp');
      this.hitStop(0.04);
      this.shake(3);
      return;
    }
    const above = p.vy > 0 && p.prevBottom <= e.y + Math.max(10, e.h * 0.55);
    if (above && e.stompable) {
      e.kill(p.pound === 2 ? 'pound' : 'stomp');
      if (p.pound === 2) { p.vy = 0; p.bounce(420); }
      else p.bounce(Input.down.jump ? PHYS.stompHoldV : PHYS.stompV);
      Sound.play('stomp');
      this.hitStop(0.05);
      this.particles.ring(e.cx, e.y, '#FFFFFF', 18);
      return;
    }
    if (e.harm !== false) {
      if (p.hurt(e.cx, false) && above) p.vy = -460;
    }
  }

  checkSpikes(p) {
    const map = this.map;
    const x0 = Math.floor(p.x / TILE), x1 = Math.floor((p.x + p.w - 0.01) / TILE);
    const y0 = Math.floor(p.y / TILE), y1 = Math.floor((p.y + p.h - 0.01) / TILE);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const c = map.get(tx, ty);
      if (c !== '^' && c !== 'v') continue;
      const hb = c === '^' ? { x: tx * TILE + 5, y: ty * TILE + 16, w: 22, h: 16 } : { x: tx * TILE + 5, y: ty * TILE, w: 22, h: 15 };
      if (overlaps(p, hb)) {
        if (p.hurt(tx * TILE + 16, true)) p.vy = c === '^' ? -520 : 200;
        return;
      }
    }
  }

  fellInPit() {
    const p = this.player;
    if (this.hearts > 1) {
      this.hearts--;
      Sound.play('hurt');
      this.state = 'pit';
      this.stateT = 0;
      this.fadeTarget = 1;
      p.frozen = true;
    } else {
      this.hearts = 0;
      p.dead = true;
      p.vy = 0;
      Sound.play('die');
      this.onPlayerDown();
      this.stateT = 0.8;
    }
  }

  respawnFromPit() {
    const pos = this.checkpoint ? this.checkpoint.respawn : this.startPos;
    const old = this.player;
    const np = new Player(this, pos.x, pos.y, this.char);
    np.shield = old.shield;
    np.invuln = 1.2;
    np.facing = old.facing;
    this.player = np;
    this.state = 'play';
    this.fadeTarget = 0;
    this.updateCamera(0, true);
    for (const e of this.enemies) if (e.isBullet) e.dead = true;
  }

  updateSnow(dt) {
    if (this.world.bg !== 'peaks') return;
    const vw = this.view.w, vh = this.view.h;
    const want = this.def.wind ? 90 : 40;
    while (this.snow.length < want) this.snow.push({ x: Math.random() * vw, y: Math.random() * vh, s: rand(1.5, 3.5), v: rand(30, 70) });
    for (const f of this.snow) {
      f.x += (this.wind * 4 - 12 + Math.sin(this.t + f.s) * 10) * dt;
      f.y += f.v * dt;
      if (f.y > vh) { f.y = -5; f.x = Math.random() * vw; }
      if (f.x < -10) f.x = vw + 5;
      if (f.x > vw + 10) f.x = -5;
    }
  }

  updateCamera(dt, snap) {
    const p = this.player;
    const vw = this.view.w, vh = this.view.h;
    const mw = this.map.pw, mh = this.map.ph;
    if (!p.dead) {
      this.lookX = snap ? p.facing * 40 : damp(this.lookX, p.facing * 46 + p.vx * 0.12, 2.5, dt);
      if (p.grounded || snap) this.camTY = p.cy - vh * (UI.touchActive ? 0.5 : 0.6);
      this.camTY = clamp(this.camTY, p.cy - vh * 0.74, p.cy - vh * 0.3);
    }
    let tx = p.cx + this.lookX - vw / 2;
    let ty = this.camTY;
    if (this.boss && this.boss.camFocus) { tx = mw / 2 - vw / 2; }
    tx = mw <= vw ? (mw - vw) / 2 : clamp(tx, 0, mw - vw);
    const minY = Math.min(0, p.cy - vh * 0.3);
    ty = mh <= vh ? mh - vh : clamp(ty, minY, mh - vh);
    if (snap) { this.cam.x = tx; this.cam.y = ty; }
    else {
      this.cam.x = damp(this.cam.x, tx, 7, dt);
      this.cam.y = damp(this.cam.y, ty, p.grounded ? 5 : 3.5, dt);
      // 玩家快出屏时直接跟上
      const sy = p.cy - this.cam.y;
      if (sy > vh * 0.86 && mh > vh) this.cam.y = Math.min(p.cy - vh * 0.86, mh - vh);
      if (sy < vh * 0.12) this.cam.y = p.cy - vh * 0.12;
    }
  }

  signText(i) {
    const raw = (this.def.signs || [])[i] || '';
    const lab = KEY_LABELS[Input.device] || KEY_LABELS.keyboard;
    let s = raw.replace('{ability}', ABILITY_HINT[this.char.ability]);
    return s.replace(/\{name\}/g, this.char.name).replace(/\{(\w+)\}/g, (m, k) => lab[k] || m);
  }

  // —— 绘制 ——
  render(ctx, W, H, scale, dpr) {
    const vw = this.view.w, vh = this.view.h;
    let sx = 0, sy = 0;
    if (this.shakeT > 0) { sx = (Math.random() - 0.5) * this.shakeMag * 2; sy = (Math.random() - 0.5) * this.shakeMag * 2; }
    const camX = this.cam.x + sx, camY = this.cam.y + sy;
    const k = scale * dpr;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    drawBackground(ctx, this.world, camX, camY, vw, vh, this.t, this.map.ph);
    ctx.setTransform(k, 0, 0, k, -Math.round(camX * k), -Math.round(camY * k));
    const x0 = Math.floor(camX / TILE) - 1, x1 = Math.floor((camX + vw) / TILE) + 1;
    const y0 = Math.floor(camY / TILE) - 1, y1 = Math.floor((camY + vh) / TILE) + 1;
    const inView = (e) => e.x + e.w > camX - 64 && e.x < camX + vw + 64 && e.y + e.h > camY - 64 && e.y < camY + vh + 64;
    for (const b of this.back) if (inView(b)) b.draw(ctx);
    drawTiles(ctx, this.map, this.world, x0, y0, x1, y1, this.t, this.fx);
    for (const pl of this.platforms) if (!(pl instanceof Crusher) && inView(pl)) pl.draw(ctx);
    for (const it of this.items) if (inView(it)) it.draw(ctx);
    for (const e of this.enemies) if (inView(e)) e.draw(ctx);
    if (this.boss) this.boss.draw(ctx);
    this.player.draw(ctx);
    this.particles.draw(ctx);
    if (this.boss && this.boss.drawFront) this.boss.drawFront(ctx);

    ctx.setTransform(k, 0, 0, k, 0, 0);
    // 雪
    if (this.snow.length) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (const f of this.snow) { ctx.beginPath(); ctx.arc(f.x, f.y, f.s, 0, Math.PI * 2); ctx.fill(); }
    }
    if (this.def.wind && this.wind < -5) {
      ctx.strokeStyle = 'rgba(255,255,255,' + (Math.abs(this.wind) / 50) * 0.5 + ')';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      for (let i = 0; i < 14; i++) {
        const yy = ((i * 97 + this.t * 40) % vh);
        const xx = (vw - ((this.t * 900 + i * 230) % (vw + 300))) ;
        ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx + 60, yy); ctx.stroke();
      }
    }
    this.drawHUD(ctx, vw, vh);
    if (this.flash > 0) {
      ctx.fillStyle = 'rgba(255,90,90,' + this.flash * 0.6 + ')';
      ctx.fillRect(0, 0, vw, vh);
    }
    if (this.fade > 0.01) {
      ctx.fillStyle = 'rgba(29,32,48,' + this.fade + ')';
      ctx.fillRect(0, 0, vw, vh);
    }
  }

  drawHUD(ctx, vw, vh) {
    const pad = 14;
    ctx.save();
    // 生命
    let x = pad + 12;
    const y = pad + 12;
    for (let i = 0; i < this.maxHearts; i++) {
      heartPath(ctx, x + 1, y + 2, 24);
      ctx.fillStyle = 'rgba(29,32,48,0.25)';
      ctx.fill();
      heartPath(ctx, x, y, 24);
      ctx.fillStyle = i < this.hearts ? '#FF5D73' : 'rgba(255,255,255,0.55)';
      ctx.fill();
      x += 26;
    }
    if (this.player.shield) {
      ctx.strokeStyle = '#9FE6FF';
      ctx.fillStyle = 'rgba(159,230,255,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x + 2, y, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      x += 26;
    }
    // 金币
    x += 8;
    drawCoinIcon(ctx, x + 8, y, 9);
    ctx.font = '600 20px ' + FONT_UI;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    this.hudText(ctx, String(this.coins), x + 22, y + 1);
    // 宝石
    if (!this.def.boss) {
      let gx = x + 22 + ctx.measureText(String(this.coins)).width + 22;
      const gemTotal = this.def.gems || 0;
      for (let i = 0; i < gemTotal; i++) {
        const pulse = this.gemFlash && this.gems[i] ? 1 + Math.sin(this.gemFlash * 12) * 0.12 : 1;
        drawGemIcon(ctx, gx + 9, y, 22 * pulse, this.gems[i] || this.gemOwned(i), !this.gems[i] && this.gemOwned(i));
        gx += 22;
      }
    }
    // 计时
    if (Save.data.settings.timer) {
      ctx.textAlign = 'right';
      ctx.font = '500 18px ' + FONT_UI;
      this.hudText(ctx, fmtTime(this.time), vw - pad - (UI.touchActive ? 56 : 0), y + 1);
    }
    // 关卡名横幅
    if (this.banner > 0) {
      const a = Math.min(1, this.banner * 2, (2.6 - this.banner) * 3);
      ctx.globalAlpha = a;
      ctx.textAlign = 'center';
      const ink = this.world.pal.ink;
      ctx.fillStyle = ink;
      ctx.font = '600 16px ' + FONT_UI;
      ctx.fillText(this.def.id + '  ·  ' + this.world.name, vw / 2, vh * 0.2 - 24);
      ctx.font = '44px ' + FONT_DISPLAY;
      ctx.fillText(this.def.name, vw / 2, vh * 0.2 + 14);
      ctx.globalAlpha = 1;
    }
    // 首领血条
    if (this.boss && this.boss.showBar) this.drawBossBar(ctx, vw);
    // 提示牌
    if (this.activeSign && this.state === 'play') this.drawSignBubble(ctx, vw, vh, this.signText(this.activeSign.index));
    // 风向提示
    if (this.def.wind && this.wind < -10) {
      ctx.textAlign = 'center';
      ctx.font = '600 15px ' + FONT_UI;
      ctx.globalAlpha = Math.min(1, Math.abs(this.wind) / 30);
      this.hudText(ctx, '← 强风', vw / 2, y + 30);
      ctx.globalAlpha = 1;
    }
    // 倒下提示
    if (this.state === 'down' && this.lastLoss) {
      ctx.textAlign = 'center';
      ctx.font = '600 18px ' + FONT_UI;
      this.hudText(ctx, '丢了 ' + this.lastLoss + ' 枚金币', vw / 2, vh * 0.4);
    }
    ctx.restore();
  }

  hudText(ctx, s, x, y) {
    ctx.fillStyle = 'rgba(29,32,48,0.5)';
    ctx.fillText(s, x + 1, y + 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(s, x, y);
  }

  drawBossBar(ctx, vw) {
    const b = this.boss;
    const w = Math.min(360, vw * 0.5), h = 12;
    const x = (vw - w) / 2, y = 54;
    ctx.textAlign = 'center';
    ctx.font = '20px ' + FONT_DISPLAY;
    this.hudText(ctx, b.name, vw / 2, y - 14);
    ctx.fillStyle = 'rgba(29,32,48,0.45)';
    ctx.beginPath(); rrect(ctx, x - 3, y - 3, w + 6, h + 6, 9); ctx.fill();
    const k = Math.max(0, b.hp / b.maxHp);
    b.barK = b.barK == null ? k : damp(b.barK, k, 6, 1 / 60);
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); rrect(ctx, x, y, w * b.barK, h, 6); ctx.fill();
    ctx.fillStyle = b.color;
    ctx.beginPath(); rrect(ctx, x, y, w * k, h, 6); ctx.fill();
    ctx.fillStyle = 'rgba(29,32,48,0.35)';
    for (let i = 1; i < b.maxHp; i++) ctx.fillRect(x + (w * i) / b.maxHp - 1, y, 2, h);
  }

  drawSignBubble(ctx, vw, vh, text) {
    ctx.font = '500 17px ' + FONT_UI;
    const maxW = Math.min(520, vw - 48);
    const lines = wrapText(ctx, text, maxW - 36);
    const lh = 25;
    const w = Math.min(maxW, Math.max(...lines.map((l) => ctx.measureText(l).width)) + 36);
    const h = lines.length * lh + 22;
    const x = (vw - w) / 2, y = vh - h - (UI.touchActive ? 150 : 28);
    ctx.fillStyle = 'rgba(29,32,48,0.88)';
    ctx.beginPath(); rrect(ctx, x, y, w, h, 12); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    lines.forEach((l, i) => ctx.fillText(l, vw / 2, y + 11 + lh / 2 + i * lh));
  }
}

function wrapText(ctx, text, maxW) {
  const out = [];
  let cur = '';
  for (const ch of text) {
    const t = cur + ch;
    if (ctx.measureText(t).width > maxW && cur) { out.push(cur); cur = ch; }
    else cur = t;
  }
  if (cur) out.push(cur);
  return out;
}
