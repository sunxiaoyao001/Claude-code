'use strict';
// 主循环与流程控制

class TitleScene {
  constructor() { this.reset(); }
  reset() {
    this.t = 0;
    this.camX = 0;
    this.actors = [];
    this.spawnT = 0;
    let w = 0;
    for (let i = 0; i < WORLDS.length; i++) if (Save.worldUnlocked(i)) w = i;
    this.world = WORLDS[w];
  }
  update(dt, vw) {
    this.t += dt;
    this.camX += 24 * dt;
    this.spawnT -= dt;
    const owned = CHARACTERS.filter((c) => Save.data.owned[c.id]);
    if (this.spawnT <= 0 && this.actors.length < 4) {
      this.spawnT = 2.2 + Math.random() * 1.5;
      const ch = owned[Math.floor(Math.random() * owned.length)];
      this.actors.push({ ch, x: -40, y: 0, vy: 0, vx: 70 + Math.random() * 50, hopT: Math.random() * 1.5, sx: 1, sy: 1 });
    }
    for (const a of this.actors) {
      a.x += a.vx * dt;
      a.hopT -= dt;
      if (a.y >= 0 && a.hopT <= 0) { a.vy = -420 - Math.random() * 200; a.hopT = 0.8 + Math.random() * 1.6; a.sx = 0.8; a.sy = 1.2; }
      a.vy += 1400 * dt;
      a.y += a.vy * dt;
      if (a.y > 0) { if (a.vy > 200) { a.sx = 1.2; a.sy = 0.82; } a.y = 0; a.vy = 0; }
      a.sx = damp(a.sx, 1, 10, dt);
      a.sy = damp(a.sy, 1, 10, dt);
    }
    this.actors = this.actors.filter((a) => a.x < vw + 60);
  }
  render(ctx, vw, vh, k) {
    ctx.setTransform(k, 0, 0, k, 0, 0);
    const W = this.world;
    drawBackground(ctx, W, this.camX, 0, vw, vh, this.t, vh + 40);
    const gy = vh - 56;
    ctx.fillStyle = W.pal.ground;
    ctx.fillRect(0, gy, vw, vh - gy);
    ctx.fillStyle = W.pal.top;
    ctx.fillRect(0, gy, vw, 9);
    for (const a of this.actors) drawCharacter(ctx, a.ch, a.x, gy + a.y, { sx: a.sx, sy: a.sy, facing: 1, lookY: clamp(a.vy / 700, -1, 1) });
  }
}

const Game = {
  mode: 'menu',
  run: null,
  acc: 0,
  last: 0,

  init(hot) {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    Save.load(hot && hot.save);
    Input.init();
    UI.init();
    UI.applyAudio();
    this.title = new TitleScene();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 200));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.mode === 'play') this.pause();
        Save.save();
        Sound.suspend();
      } else Sound.resume();
    });
    const wake = () => { Sound.init(); Music.resumeIfNeeded(); };
    window.addEventListener('pointerdown', wake);
    window.addEventListener('keydown', (e) => {
      wake();
      if (this.mode === 'menu' && UI.current === 'title' && e.code === 'Enter' && document.activeElement === document.body) UI.handle('play', document.body);
    });
    Music.play('title');
    UI.show('title');
    requestAnimationFrame((t) => this.loop(t));
  },

  resize() {
    const cw = window.innerWidth, ch = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = dpr;
    this.cssW = cw;
    this.cssH = ch;
    this.canvas.width = Math.round(cw * dpr);
    this.canvas.height = Math.round(ch * dpr);
    const small = Math.min(cw, ch) < 520;
    const minW = small ? 19 : 24, minH = small ? 11 : 14;
    this.scale = Math.min(cw / (minW * TILE), ch / (minH * TILE));
    this.viewW = cw / this.scale;
    this.viewH = ch / this.scale;
    if (this.run) {
      this.run.view = { w: this.viewW, h: this.viewH };
      this.run.updateCamera(0, true);
    }
    UI.updateTouch();
  },

  loop(ts) {
    const dt = Math.min(0.05, (ts - (this.last || ts)) / 1000);
    this.last = ts;
    Input.poll();
    const ctx = this.ctx;
    const k = this.scale * this.dpr;
    if (this.mode === 'play' && this.run) {
      if (Input.pressed.pause) {
        this.pause();
      } else {
        this.acc += dt;
        let first = true;
        let steps = 0;
        while (this.acc >= STEP && steps < 8) {
          const inp = {
            left: !!Input.down.left, right: !!Input.down.right, down: !!Input.down.down,
            jump: !!Input.down.jump, ability: !!Input.down.ability,
            jumpPressed: first && !!Input.pressed.jump,
            downPressed: first && !!Input.pressed.down,
            abilityPressed: first && !!Input.pressed.ability,
          };
          this.run.update(STEP, inp);
          first = false;
          this.acc -= STEP;
          steps++;
        }
        if (steps >= 8) this.acc = 0;
        Save.data.stats.playTime += dt;
      }
      this.run.render(ctx, this.viewW, this.viewH, this.scale, this.dpr);
    } else if (this.mode === 'results' && this.run) {
      this.acc += dt;
      while (this.acc >= STEP) { this.run.update(STEP, {}); this.acc -= STEP; }
      this.run.render(ctx, this.viewW, this.viewH, this.scale, this.dpr);
      UI.pollPad();
    } else if (this.mode === 'paused' && this.run) {
      this.run.render(ctx, this.viewW, this.viewH, this.scale, this.dpr);
      UI.pollPad();
    } else {
      this.title.update(dt, this.viewW);
      this.title.render(ctx, this.viewW, this.viewH, k);
      UI.pollPad();
    }
    requestAnimationFrame((t) => this.loop(t));
  },

  startLevel(id) {
    const def = LEVEL_BY_ID[id];
    const ch = CHAR_BY_ID[Save.data.char];
    this.run = new LevelRun(def, ch, {
      onDone: (r) => this.levelDone(r),
      onDown: () => { Save.data.stats.deaths++; },
    });
    this.run.view = { w: this.viewW, h: this.viewH };
    this.run.updateCamera(0, true);
    this.mode = 'play';
    this.acc = 0;
    Input.gameCapture = true;
    Input.hits = {};
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    UI.hide();
    Music.play(def.boss ? (def.id === '4-B' ? 'final' : 'boss') : WORLDS[def.world].music);
  },

  pause() {
    if (this.mode !== 'play') return;
    this.mode = 'paused';
    Input.gameCapture = false;
    Save.save();
    Sound.play('pause');
    UI.show('pause');
  },

  resume() {
    if (!this.run) return;
    this.mode = 'play';
    this.acc = 0;
    Input.gameCapture = true;
    Input.hits = {};
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    UI.hide();
  },

  toCheckpoint() {
    const run = this.run;
    if (!run || !run.checkpoint) return;
    if (run.hearts > 1) {
      run.hearts--;
      run.state = 'pit';
      run.stateT = 0.45;
      run.respawnFromPit();
    } else {
      run.player.die();
    }
    this.resume();
  },

  quitToMap() {
    const w = this.run ? this.run.def.world : UI.mapWorld;
    this.run = null;
    this.mode = 'menu';
    Input.gameCapture = false;
    this.title.reset();
    Music.play('title');
    Save.save();
    UI.show('map', { world: w });
  },

  levelDone(run) {
    const def = run.def;
    const lv = Save.lvl(def.id);
    const firstClear = !lv.done;
    const greed = 0.2 * (Save.data.upg.greed || 0);
    const gained = Math.round(run.coins * (1 + greed));
    const bonus = firstClear ? (def.boss ? 200 + 60 * def.world : 50 + 15 * def.world) : 0;
    const prevGems = lv.gems.slice();
    const gems = [0, 1, 2].slice(0, def.gems).map((i) => ({ on: prevGems[i] || run.gems[i], isNew: run.gems[i] && !prevGems[i] }));
    const gemsBefore = Save.gemCount();
    for (let i = 0; i < 3; i++) if (run.gems[i]) lv.gems[i] = true;
    const prevBest = lv.best;
    const newRecord = prevBest == null || run.time < prevBest;
    if (newRecord) lv.best = run.time;
    lv.done = true;
    lv.deaths = (lv.deaths || 0) + run.stats.deaths;
    const st = Save.data.stats;
    st.coinsEarned += gained + bonus;
    st.enemies += run.stats.enemies;
    st.jumps += run.stats.jumps;
    st.clears++;
    Save.data.coins += gained + bonus;

    const notes = [];
    const idx = LEVELS.findIndex((l) => l.id === def.id);
    const next = LEVELS[idx + 1];
    if (firstClear && next) {
      if (next.world !== def.world) notes.push(`新世界开放：${WORLDS[next.world].name}`);
    }
    if (def.id === '4-B' && !Save.data.owned.star) {
      Save.data.owned.star = true;
      Save.data.cleared = true;
      notes.push('星星加入了队伍！');
    }
    const gemsAfter = Save.gemCount();
    for (const ch of CHARACTERS) {
      const u = ch.unlock;
      if (!u || !u.gems || Save.data.owned[ch.id]) continue;
      if (gemsBefore < u.gems && gemsAfter >= u.gems) notes.push(`${ch.name} 可以在角色界面解锁了`);
    }
    Save.save();

    const res = {
      id: def.id, name: def.name, boss: !!def.boss, time: run.time, best: prevBest, newRecord: newRecord && prevBest != null,
      deaths: run.stats.deaths, coins: run.coins, greed, bonus, total: gained + bonus,
      gems, gemTotal: def.gems, notes, nextId: next && Save.isUnlocked(next.id) ? next.id : null,
    };
    this.mode = 'results';
    Input.gameCapture = false;
    if (def.id === '4-B' && !Save.data.seenEnding) {
      Save.data.seenEnding = true;
      Save.save();
      Music.play('ending');
      UI.show('ending', res);
    } else {
      UI.show('results', res);
    }
  },
};

function boot(data) { Game.init(data || {}); }
if (window.claude && window.claude.hot && window.claude.hot.snapshot) {
  try { window.claude.hot.snapshot(() => ({ save: Save.data })); } catch (e) { /* 忽略 */ }
}
if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(boot);
else boot((window.claude && window.claude.hot && window.claude.hot.data) || {});
