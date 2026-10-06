import Phaser from 'phaser';
import { lerp } from '../core/math';
import { Rng } from '../core/rng';
import type { Simulation } from '../sim/Simulation';
import type { SimEvent } from '../sim/events';
import { Mat } from '../sim/map/GameMap';
import type { GroundLayer } from './GroundLayer';
import { isoX, isoY, ISO_W, ISO_H, screenAngle, screenLen } from './iso';
import { BIOMES, matColor, toInt } from './palette';

export type Quality = 'low' | 'medium' | 'high';

interface Tracer {
  img: Phaser.GameObjects.Image;
  x0: number;
  y0: number;
  z0: number;
  x1: number;
  y1: number;
  z1: number;
  t: number;
  len: number;
  speed: number;
  streak: number;
}

interface Timed {
  img: Phaser.GameObjects.Image;
  t: number;
  dur: number;
  s0: number;
  s1: number;
  a0: number;
}

interface CloudFx {
  emitter: Phaser.GameObjects.Particles.ParticleEmitter;
  zone: Phaser.Geom.Ellipse;
  dead: number;
}

interface FireFx {
  flames: Phaser.GameObjects.Particles.ParticleEmitter;
  smoke: Phaser.GameObjects.Particles.ParticleEmitter;
  dead: number;
}

const IMPACT_TINT: Record<string, number> = {
  dust: 0xcbb38b,
  stone: 0xb7b2a8,
  wood: 0x9a7650,
  snow: 0xf2f6f8,
  spark: 0xffd27a,
  blood: 0x8a1410,
};

export class FxSystem {
  private rng = new Rng(77);
  private dust: Phaser.GameObjects.Particles.ParticleEmitter;
  private spark: Phaser.GameObjects.Particles.ParticleEmitter;
  private blood: Phaser.GameObjects.Particles.ParticleEmitter;
  private chunk: Phaser.GameObjects.Particles.ParticleEmitter;
  private fire: Phaser.GameObjects.Particles.ParticleEmitter;
  private smoke: Phaser.GameObjects.Particles.ParticleEmitter;
  private trail: Phaser.GameObjects.Particles.ParticleEmitter;
  private weather: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private tracers: Tracer[] = [];
  private tracerPool: Phaser.GameObjects.Image[] = [];
  private timed: Timed[] = [];
  private timedPool: Map<string, Phaser.GameObjects.Image[]> = new Map();
  private clouds = new Map<number, CloudFx>();
  private fires = new Map<number, FireFx>();
  private grenades = new Map<number, { img: Phaser.GameObjects.Image; shadow: Phaser.GameObjects.Image }>();
  private projs = new Map<number, Phaser.GameObjects.Image>();
  private debris = new Map<number, Phaser.GameObjects.Image>();
  private mult: number;
  showBlood = true;
  shake = true;

  constructor(
    private scene: Phaser.Scene,
    private fx: Phaser.GameObjects.Layer,
    private decal: Phaser.GameObjects.Layer,
    private ground: GroundLayer,
    private sim: Simulation,
    quality: Quality,
  ) {
    this.mult = quality === 'low' ? 0.45 : quality === 'medium' ? 0.75 : 1;
    const add = (tex: string, cfg: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig) => {
      const e = scene.add.particles(0, 0, tex, { emitting: false, ...cfg });
      fx.add(e);
      return e;
    };
    this.dust = add('fx_soft', { lifespan: { min: 350, max: 750 }, speed: { min: 8, max: 34 }, scale: { start: 0.12, end: 0.42 }, alpha: { start: 0.55, end: 0 }, angle: { min: 180, max: 360 } });
    this.spark = add('fx_spark', { lifespan: { min: 120, max: 280 }, speed: { min: 60, max: 170 }, scale: { start: 0.6, end: 0.2 }, alpha: { start: 1, end: 0 }, gravityY: 260, blendMode: Phaser.BlendModes.ADD, rotate: { onEmit: () => this.rng.range(0, 360) } });
    this.blood = add('fx_dot', { lifespan: { min: 250, max: 520 }, speed: { min: 16, max: 60 }, scale: { start: 0.9, end: 0.5 }, alpha: { start: 0.95, end: 0 }, gravityY: 220, tint: 0x8a1410 });
    this.chunk = add('fx_chunk', { lifespan: { min: 500, max: 1100 }, speed: { min: 60, max: 210 }, angle: { min: 200, max: 340 }, scale: { min: 0.35, max: 0.9 }, alpha: { start: 1, end: 0.2 }, gravityY: 430, rotate: { min: 0, max: 360 } });
    this.fire = add('fx_flame', { lifespan: { min: 260, max: 620 }, speed: { min: 18, max: 90 }, scale: { start: 0.35, end: 0.9 }, alpha: { start: 1, end: 0 }, blendMode: Phaser.BlendModes.ADD, tint: [0xfff0b0, 0xffb040, 0xff6020] as unknown as number });
    this.smoke = add('fx_puff', { lifespan: { min: 1800, max: 3800 }, speed: { min: 8, max: 34 }, angle: { min: 200, max: 340 }, scale: { start: 0.45, end: 1.9 }, alpha: { start: 0.62, end: 0 }, gravityY: -10, rotate: { min: 0, max: 360 } });
    this.trail = add('fx_puff', { lifespan: { min: 600, max: 1100 }, speed: { min: 2, max: 8 }, scale: { start: 0.12, end: 0.5 }, alpha: { start: 0.5, end: 0 }, tint: 0xd6d2c8 });
    this.setupWeather();
  }

  private setupWeather() {
    const biome = this.sim.map.biome;
    const cam = this.scene.cameras.main;
    const w = cam.width;
    if (biome === 'snow') {
      this.weather = this.scene.add.particles(0, 0, 'fx_dot', {
        x: { min: -100, max: w + 100 },
        y: -20,
        lifespan: 9000,
        speedY: { min: 30, max: 70 },
        speedX: { min: -25, max: -5 },
        scale: { min: 0.3, max: 0.9 },
        alpha: { min: 0.5, max: 0.95 },
        quantity: 1,
        frequency: 45 / this.mult,
      });
    } else if (biome === 'desert') {
      this.weather = this.scene.add.particles(0, 0, 'fx_soft', {
        x: -40,
        y: { min: 0, max: cam.height },
        lifespan: 9000,
        speedX: { min: 60, max: 140 },
        speedY: { min: -6, max: 6 },
        scale: { min: 0.04, max: 0.12 },
        alpha: { start: 0.35, end: 0 },
        tint: 0xf3dcae,
        frequency: 120 / this.mult,
      });
    } else {
      this.weather = this.scene.add.particles(0, 0, 'fx_dot', {
        x: { min: 0, max: w },
        y: -10,
        lifespan: 12000,
        speedY: { min: 8, max: 22 },
        speedX: { min: -12, max: 12 },
        scale: { min: 0.3, max: 0.6 },
        alpha: { min: 0.25, max: 0.5 },
        tint: 0x9a948a,
        frequency: 220 / this.mult,
      });
    }
    this.weather.setScrollFactor(0);
    this.weather.setDepth(1e6);
  }

  resize(width: number, height: number) {
    if (!this.weather) return;
    this.weather.destroy();
    this.weather = null;
    void width;
    void height;
    this.setupWeather();
  }

  private n(k: number) {
    return Math.max(1, Math.round(k * this.mult));
  }

  private pooled(key: string, blend = Phaser.BlendModes.ADD): Phaser.GameObjects.Image {
    const pool = this.timedPool.get(key) ?? [];
    this.timedPool.set(key, pool);
    const img = pool.pop() ?? this.scene.add.image(0, 0, key);
    if (!img.parentContainer && !this.fx.exists(img)) this.fx.add(img);
    img.setVisible(true).setBlendMode(blend).setAlpha(1).setRotation(0).setTint(0xffffff);
    return img;
  }

  private flash(key: string, sx: number, sy: number, dur: number, s0: number, s1: number, tint = 0xffffff, blend = Phaser.BlendModes.ADD, a0 = 1, rot = 0) {
    const img = this.pooled(key, blend);
    img.setPosition(sx, sy).setScale(s0).setTint(tint).setRotation(rot);
    this.timed.push({ img, t: 0, dur, s0, s1, a0 });
  }

  // ---------------------------------------------------------------------------

  handle(e: SimEvent, onScreen: (x: number, y: number, margin?: number) => boolean) {
    switch (e.type) {
      case 'shot': {
        if (!onScreen((e.x0 + e.x1) / 2, (e.y0 + e.y1) / 2, 30)) return;
        const heavy = e.weapon === 'lmg' || e.weapon === 'coax' || e.weapon === 'sniper';
        // muzzle flash for every round
        this.flash('fx_flash', isoX(e.x0, e.y0), isoY(e.x0, e.y0, e.z0), 0.05, heavy ? 0.34 : 0.24, heavy ? 0.42 : 0.3, 0xffffff, Phaser.BlendModes.ADD, 1, this.rng.range(0, 6.28));
        // only some rounds are tracers
        const p = e.weapon === 'sniper' ? 1 : heavy ? 0.5 : 0.38;
        if (this.rng.next() > p * this.mult + 0.05) return;
        const len = Math.hypot(e.x1 - e.x0, e.y1 - e.y0);
        const img = this.tracerPool.pop() ?? this.scene.add.image(0, 0, 'fx_tracer');
        if (!this.fx.exists(img)) this.fx.add(img);
        img.setVisible(true).setBlendMode(Phaser.BlendModes.ADD).setOrigin(1, 0.5);
        img.setTint(e.team === 0 ? 0xbfe0ff : 0xffd8a8);
        this.tracers.push({ img, x0: e.x0, y0: e.y0, z0: e.z0, x1: e.x1, y1: e.y1, z1: e.z1, t: 0, len, speed: heavy ? 300 : 360, streak: heavy ? 2.2 : 1.6 });
        return;
      }
      case 'impact': {
        if (!onScreen(e.x, e.y)) return;
        const sx = isoX(e.x, e.y);
        const sy = isoY(e.x, e.y, e.z);
        if (e.kind === 'spark') {
          this.spark.explode(this.n(5), sx, sy);
        } else if (e.kind === 'blood') {
          if (this.showBlood) this.blood.explode(this.n(6), sx, sy);
        } else {
          const tint = e.kind === 'dust' ? toInt(BIOMES[this.sim.map.biome].ground[0] ?? [200, 180, 140]) : IMPACT_TINT[e.kind];
          this.dust.setParticleTint(tint);
          this.dust.explode(this.n(e.kind === 'dust' ? 3 : 4), sx, sy);
          if (e.kind === 'wood' || e.kind === 'stone') {
            this.chunk.setParticleTint(tint);
            this.chunk.setParticleScale(0.35);
            this.chunk.explode(this.n(2), sx, sy);
          }
        }
        return;
      }
      case 'explosion':
        this.explosion(e.x, e.y, e.r, e.kind, onScreen(e.x, e.y, 120));
        return;
      case 'cellDestroyed': {
        if (!onScreen(e.x + 0.5, e.y + 0.5, 60)) return;
        const sx = isoX(e.x + 0.5, e.y + 0.5);
        const sy = isoY(e.x + 0.5, e.y + 0.5, 1.2);
        const tint = toInt(matColor(e.mat, this.sim.map.biome));
        this.dust.setParticleTint(e.mat === Mat.Wood || e.mat === Mat.Crate ? 0xa08060 : 0xbab4a8);
        this.dust.explode(this.n(10), sx, sy);
        this.chunk.setParticleTint(tint);
        this.chunk.setParticleScale(0.6);
        this.chunk.explode(this.n(8), sx, sy);
        this.smoke.setParticleTint(0xc8c0b0);
        this.smoke.explode(this.n(3), sx, sy - 6);
        return;
      }
      case 'collapse': {
        const sx = isoX(e.x, e.y);
        const sy = isoY(e.x, e.y, 2);
        this.smoke.setParticleTint(0xbdb4a4);
        for (let k = 0; k < this.n(14); k++) this.smoke.explode(1, sx + this.rng.range(-60, 60), sy + this.rng.range(-25, 25));
        if (this.shake) this.scene.cameras.main.shake(250, 0.004);
        return;
      }
      case 'launch': {
        if (!onScreen(e.x, e.y, 80)) return;
        const sx = isoX(e.x, e.y);
        if (e.kind === 'shell') {
          const sy = isoY(e.x, e.y, 2);
          this.flash('fx_flash', sx, sy, 0.1, 0.9, 1.4, 0xffffff, Phaser.BlendModes.ADD, 1, this.rng.range(0, 6.28));
          this.smoke.setParticleTint(0xd4cfc4);
          this.smoke.explode(this.n(5), sx, sy);
          this.dust.setParticleTint(0xc9b896);
          this.dust.explode(this.n(8), sx, isoY(e.x, e.y, 0));
        } else {
          const sy = isoY(e.x, e.y, 1.4);
          this.flash('fx_flash', sx, sy, 0.08, 0.5, 0.8);
          // backblast
          const bx = e.x - Math.cos(e.angle) * 1.2;
          const by = e.y - Math.sin(e.angle) * 1.2;
          this.smoke.setParticleTint(0xe2ddd2);
          this.smoke.explode(this.n(6), isoX(bx, by), isoY(bx, by, 1.2));
        }
        return;
      }
      case 'downed':
      case 'killed': {
        const a = this.sim.get(e.id);
        if (!a || a.kind !== 'soldier' || !this.showBlood) return;
        this.ground.stamp('fx_blood', a.x + this.rng.range(-0.2, 0.2), a.y + this.rng.range(-0.2, 0.2), { alpha: e.type === 'killed' ? 0.6 : 0.42, scale: e.type === 'killed' ? 0.42 : 0.3, angle: this.rng.range(-20, 20) });
        return;
      }
      default:
        return;
    }
  }

  private explosion(x: number, y: number, r: number, kind: string, visible: boolean) {
    const big = kind === 'tank' || kind === 'shell';
    // decals are permanent: always stamp them, even off-screen
    const craterScale = kind === 'tank' ? 1.1 : kind === 'shell' ? 0.55 : kind === 'rocket' ? 0.45 : kind === 'barrel' ? 0.4 : 0.32;
    const biome = this.sim.map.biome;
    const craterTint = biome === 'desert' ? 0x8a6a48 : biome === 'snow' ? 0x707a84 : 0xffffff;
    this.ground.stamp('fx_crater', x, y, { scale: craterScale, alpha: (kind === 'grenade' ? 0.5 : 0.65) * (biome === 'urban' ? 1 : 0.9), angle: this.rng.range(-8, 8), tint: craterTint });
    if (!visible) return;
    const sx = isoX(x, y);
    const sy = isoY(x, y, 0.4);
    const pxR = r * ISO_W * Math.SQRT2;
    this.flash('fx_soft', sx, sy, 0.22, pxR / 64, (pxR / 32) * 1.4, 0xffe6a8);
    this.flash('fx_ring', sx, isoY(x, y), 0.45, 0.05, (pxR * 1.15) / 120, 0xfff4dc, Phaser.BlendModes.NORMAL, 0.7);
    this.fire.explode(this.n(big ? 22 : 12), sx, sy);
    this.smoke.setParticleTint(kind === 'tank' ? 0x2a2622 : 0x4a4540);
    this.smoke.explode(this.n(big ? 16 : 9), sx, sy - 4);
    this.chunk.setParticleTint(toInt(BIOMES[this.sim.map.biome].ground[0] ?? [150, 130, 100]));
    this.chunk.setParticleScale(0.7);
    this.chunk.explode(this.n(big ? 18 : 10), sx, sy);
    this.dust.setParticleTint(0xcabda4);
    this.dust.explode(this.n(10), sx, isoY(x, y));
    if (this.shake) {
      const cam = this.scene.cameras.main;
      const cx = cam.worldView.centerX;
      const cy = cam.worldView.centerY;
      const dpx = Math.hypot(cx - sx, cy - sy);
      const k = Math.max(0, 1 - dpx / 900) * (big ? 1 : 0.55);
      if (k > 0.05) cam.shake(big ? 260 : 160, 0.0045 * k);
    }
  }

  // ---------------------------------------------------------------------------

  update(dt: number, alpha: number, onScreen: (x: number, y: number, margin?: number) => boolean) {
    const sim = this.sim;
    // tracers
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const tr = this.tracers[i];
      tr.t += dt;
      const head = Math.min(tr.len, tr.t * tr.speed);
      const tail = Math.max(0, head - tr.streak);
      if (tail >= tr.len - 0.01) {
        tr.img.setVisible(false);
        this.tracerPool.push(tr.img);
        this.tracers.splice(i, 1);
        continue;
      }
      const f = (d: number) => (tr.len > 0 ? d / tr.len : 1);
      const hx = lerp(tr.x0, tr.x1, f(head));
      const hy = lerp(tr.y0, tr.y1, f(head));
      const hz = lerp(tr.z0, tr.z1, f(head));
      const tx = lerp(tr.x0, tr.x1, f(tail));
      const ty = lerp(tr.y0, tr.y1, f(tail));
      const tz = lerp(tr.z0, tr.z1, f(tail));
      const l = screenLen(hx - tx, hy - ty, hz - tz);
      tr.img.setPosition(isoX(hx, hy), isoY(hx, hy, hz));
      tr.img.setRotation(screenAngle(hx - tx, hy - ty, hz - tz));
      tr.img.setScale(Math.max(0.05, l / 64), 0.6);
      tr.img.setAlpha(0.8);
    }
    // timed flashes / rings
    for (let i = this.timed.length - 1; i >= 0; i--) {
      const t = this.timed[i];
      t.t += dt;
      const k = t.t / t.dur;
      if (k >= 1) {
        t.img.setVisible(false);
        const key = t.img.texture.key;
        this.timedPool.get(key)?.push(t.img);
        this.timed.splice(i, 1);
        continue;
      }
      t.img.setScale(lerp(t.s0, t.s1, Math.sqrt(k)));
      t.img.setAlpha(t.a0 * (1 - k));
    }
    // grenades
    const seen = new Set<number>();
    for (const g of sim.grenades) {
      seen.add(g.id);
      let v = this.grenades.get(g.id);
      if (!v) {
        const img = this.scene.add.image(0, 0, g.kind === 'frag' ? 'fx_grenade' : 'fx_smokegren').setScale(0.8);
        const shadow = this.scene.add.image(0, 0, 'fx_shadow').setScale(0.12).setAlpha(0.7);
        this.fx.add(img);
        this.decal.add(shadow);
        v = { img, shadow };
        this.grenades.set(g.id, v);
      }
      const x = lerp(g.px, g.x, alpha);
      const y = lerp(g.py, g.y, alpha);
      const z = lerp(g.pz, g.z, alpha);
      v.img.setPosition(isoX(x, y), isoY(x, y, z + 0.08));
      v.img.rotation += g.landed ? 0 : g.spin * dt;
      v.shadow.setPosition(isoX(x, y), isoY(x, y));
      // blinking warning ring on live frags on the ground
      v.img.setTint(g.kind === 'frag' && g.landed && Math.floor(g.fuse * 6) % 2 === 0 ? 0xff8866 : 0xffffff);
      if (g.kind === 'smoke' && !g.landed && Math.random() < 0.5) this.trail.emitParticleAt(isoX(x, y), isoY(x, y, z));
    }
    for (const [id, v] of this.grenades) {
      if (seen.has(id)) continue;
      v.img.destroy();
      v.shadow.destroy();
      this.grenades.delete(id);
    }
    // rockets & shells
    seen.clear();
    for (const p of sim.projectiles) {
      seen.add(p.id);
      let img = this.projs.get(p.id);
      if (!img) {
        img = this.scene.add.image(0, 0, p.kind === 'rocket' ? 'fx_rocket' : 'fx_shell').setBlendMode(p.kind === 'shell' ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL);
        this.fx.add(img);
        this.projs.set(p.id, img);
      }
      const x = lerp(p.px, p.x, alpha);
      const y = lerp(p.py, p.y, alpha);
      const z = lerp(p.pz, p.z, alpha);
      img.setPosition(isoX(x, y), isoY(x, y, z));
      img.setRotation(screenAngle(p.dx, p.dy, p.slope));
      img.setScale(p.kind === 'shell' ? 1.6 : 0.9);
      if (p.kind === 'rocket' && onScreen(x, y)) {
        this.trail.setParticleTint(0xdcd6cc);
        this.trail.emitParticleAt(isoX(x, y), isoY(x, y, z), 2);
      }
    }
    for (const [id, img] of this.projs) {
      if (seen.has(id)) continue;
      img.destroy();
      this.projs.delete(id);
    }
    // debris chunks
    seen.clear();
    for (const d of sim.debris) {
      seen.add(d.id);
      let img = this.debris.get(d.id);
      if (!img) {
        img = this.scene.add.image(0, 0, 'fx_chunk').setTint(toInt(matColor(d.mat as Mat, sim.map.biome)));
        img.setScale(Math.max(0.6, d.size * 6));
        this.fx.add(img);
        this.debris.set(d.id, img);
      }
      img.setPosition(isoX(d.x, d.y), isoY(d.x, d.y, d.z + 0.05));
      img.setRotation(d.angle);
      img.setAlpha(Math.min(1, d.life / 3));
    }
    for (const [id, img] of this.debris) {
      if (seen.has(id)) continue;
      img.destroy();
      this.debris.delete(id);
    }
    this.updateClouds(dt);
    this.updateFires();
  }

  private updateClouds(dt: number) {
    const sim = this.sim;
    const live = new Set<number>();
    for (const c of sim.smokes) {
      live.add(c.id);
      let fx = this.clouds.get(c.id);
      if (!fx) {
        const zone = new Phaser.Geom.Ellipse(0, 0, 10, 5);
        const emitter = this.scene.add.particles(isoX(c.x, c.y), isoY(c.x, c.y, 0.6), 'fx_puff', {
          lifespan: { min: 2600, max: 4600 },
          speedX: { min: -7, max: 7 },
          speedY: { min: -14, max: -3 },
          scale: { start: 0.6, end: 1.8 },
          alpha: { start: 0.34, end: 0, ease: 'Quad.easeIn' },
          rotate: { min: 0, max: 360 },
          tint: [0xe9ebec, 0xd3d6d8, 0xbfc3c6, 0xf2f2f0] as unknown as number,
          frequency: 42 / this.mult,
          emitZone: { type: 'random', source: zone as unknown as Phaser.Types.GameObjects.Particles.RandomZoneSource },
        });
        this.fx.add(emitter);
        fx = { emitter, zone, dead: 0 };
        this.clouds.set(c.id, fx);
      }
      fx.zone.width = c.r * ISO_W * Math.SQRT2 * 1.7;
      fx.zone.height = c.r * ISO_H * Math.SQRT2 * 1.7;
      fx.emitter.setAlpha(Math.min(1, c.density / 0.3));
    }
    for (const [id, fx] of this.clouds) {
      if (live.has(id)) continue;
      if (fx.dead === 0) fx.emitter.stop();
      fx.dead += dt;
      if (fx.dead > 4.5) {
        fx.emitter.destroy();
        this.clouds.delete(id);
      }
    }
  }

  private updateFires() {
    const sim = this.sim;
    const live = new Set<number>();
    for (const f of sim.fires) {
      live.add(f.id);
      let fx = this.fires.get(f.id);
      const sx = isoX(f.x, f.y);
      const sy = isoY(f.x, f.y, 1.3);
      if (!fx) {
        const flames = this.scene.add.particles(sx, sy, 'fx_flame', {
          lifespan: { min: 380, max: 820 },
          speedY: { min: -60, max: -25 },
          speedX: { min: -10, max: 10 },
          scale: { start: 0.45, end: 0.12 },
          alpha: { start: 0.95, end: 0 },
          blendMode: Phaser.BlendModes.ADD,
          frequency: 45 / this.mult,
          x: { min: -18, max: 18 },
        });
        const smoke = this.scene.add.particles(sx, sy - 10, 'fx_puff', {
          lifespan: { min: 3500, max: 6000 },
          speedY: { min: -40, max: -18 },
          speedX: { min: 4, max: 18 },
          scale: { start: 0.5, end: 2.6 },
          alpha: { start: 0.55, end: 0 },
          tint: 0x2c2926,
          frequency: 140 / this.mult,
          rotate: { min: 0, max: 360 },
        });
        this.fx.add(smoke);
        this.fx.add(flames);
        fx = { flames, smoke, dead: 0 };
        this.fires.set(f.id, fx);
      }
      const k = Math.min(1, f.life / 15);
      fx.flames.setAlpha(k);
      fx.smoke.setAlpha(0.4 + 0.6 * k);
    }
    for (const [id, fx] of this.fires) {
      if (live.has(id)) continue;
      fx.flames.stop();
      fx.smoke.stop();
      fx.dead++;
      if (fx.dead > 400) {
        fx.flames.destroy();
        fx.smoke.destroy();
        this.fires.delete(id);
      }
    }
  }

  /** Light exhaust puffs from moving tanks. */
  exhaust(x: number, y: number, angle: number) {
    const bx = x - Math.cos(angle) * 2.9;
    const by = y - Math.sin(angle) * 2.9;
    this.trail.setParticleTint(0x9a968e);
    this.trail.emitParticleAt(isoX(bx, by), isoY(bx, by, 1.2), 1);
  }

  destroy() {
    for (const e of [this.dust, this.spark, this.blood, this.chunk, this.fire, this.smoke, this.trail]) e.destroy();
    this.weather?.destroy();
    for (const t of this.tracers) t.img.destroy();
    for (const img of this.tracerPool) img.destroy();
    for (const t of this.timed) t.img.destroy();
    for (const pool of this.timedPool.values()) for (const img of pool) img.destroy();
    for (const c of this.clouds.values()) c.emitter.destroy();
    for (const f of this.fires.values()) {
      f.flames.destroy();
      f.smoke.destroy();
    }
    for (const g of this.grenades.values()) {
      g.img.destroy();
      g.shadow.destroy();
    }
    for (const p of this.projs.values()) p.destroy();
    for (const d of this.debris.values()) d.destroy();
  }
}
