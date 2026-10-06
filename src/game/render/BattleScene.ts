import Phaser from 'phaser';
import { game } from '../GameController';
import type { Simulation } from '../sim/Simulation';
import { useGame } from '@/store/gameStore';
import { translate } from '@/i18n';
import { CameraController } from './CameraController';
import { FxSystem } from './FxSystem';
import { GroundLayer } from './GroundLayer';
import { isoX, isoY, screenToWorld } from './iso';
import { OverlayLayer } from './OverlayLayer';
import { BIOMES } from './palette';
import { StructureLayer } from './StructureLayer';
import { buildStructureAtlas, type UnitAtlases } from './textures/spriteFactory';
import { SoldierView, TankView, type Layers } from './UnitViews';

/**
 * Renders a Simulation in isometric 2.5D. All state lives in the sim; this scene
 * interpolates between fixed ticks and turns sim events into effects.
 */
export class BattleScene extends Phaser.Scene {
  private sim: Simulation | null = null;
  private atlases!: UnitAtlases;
  private layers!: Layers & { ground: Phaser.GameObjects.Layer; shadow: Phaser.GameObjects.Layer; fx: Phaser.GameObjects.Layer };
  private groundLayer: GroundLayer | null = null;
  private structures: StructureLayer | null = null;
  private fx: FxSystem | null = null;
  private overlay: OverlayLayer | null = null;
  private camCtl: CameraController | null = null;
  private soldiers = new Map<number, SoldierView>();
  private tanks = new Map<number, TankView>();
  private hovered = -1;
  private followId = -1;
  private fpsAvg = 60;
  private colorFx: Phaser.FX.ColorMatrix | null = null;
  private exhaustT = 0;

  constructor() {
    super({ key: 'battle' });
  }

  get fps() {
    return this.fpsAvg;
  }

  init(data: { atlases: UnitAtlases }) {
    this.atlases = data.atlases;
  }

  create() {
    const mk = () => this.add.layer();
    this.layers = { ground: mk(), shadow: mk(), decal: mk(), world: mk(), fx: mk(), overlay: mk() };
    this.layers.ground.setDepth(0);
    this.layers.shadow.setDepth(1);
    this.layers.decal.setDepth(2);
    this.layers.world.setDepth(3);
    this.layers.fx.setDepth(4);
    this.layers.overlay.setDepth(5);
    this.scale.on('resize', (size: Phaser.Structs.Size) => {
      this.cameras.main.setSize(size.width, size.height);
      this.fx?.resize(size.width, size.height);
    });
    const scene = this;
    game.attach({
      load: (sim, cinematic) => scene.loadBattle(sim, cinematic),
      focusWorld: (x, y, follow) => scene.focusWorld(x, y, follow),
      setFollow: (id) => {
        scene.followId = id;
        if (scene.camCtl) scene.camCtl.follow = id >= 0 ? () => scene.followTarget() : null;
      },
      get fps() {
        return scene.fpsAvg;
      },
    });
    this.events.on('shutdown', () => this.teardown());
    const phase = useGame.getState().phase;
    if (phase === 'menu' || phase === 'boot' || phase === 'setup' || phase === 'settings') void game.startAttract();
  }

  private teardown() {
    for (const v of this.soldiers.values()) v.destroy();
    for (const v of this.tanks.values()) v.destroy();
    this.soldiers.clear();
    this.tanks.clear();
    this.fx?.destroy();
    this.overlay?.destroy();
    this.structures?.destroy();
    this.groundLayer?.destroy();
    this.camCtl?.destroy();
    this.fx = null;
    this.overlay = null;
    this.structures = null;
    this.groundLayer = null;
    this.camCtl = null;
    this.sim = null;
  }

  async loadBattle(sim: Simulation, cinematic: boolean) {
    const st = useGame.getState();
    this.teardown();
    st.setLoading(0.35, 'loading.structures');
    const atlas = await buildStructureAtlas(this.textures, sim.map.biome);
    st.setLoading(0.6, 'loading.terrain');
    await new Promise((r) => setTimeout(r, 0));
    this.sim = sim;
    const settings = st.settings;
    const look = BIOMES[sim.map.biome];
    this.cameras.main.setBackgroundColor(look.clear);
    this.groundLayer = new GroundLayer(this, sim.map, this.layers.ground, this.layers.shadow);
    st.setLoading(0.8, 'loading.units');
    this.structures = new StructureLayer(this, sim.map, atlas, this.layers.world);
    for (const s of sim.soldiers) this.soldiers.set(s.id, new SoldierView(this, s, this.atlases, this.layers));
    for (const t of sim.tanks) this.tanks.set(t.id, new TankView(this, t, this.atlases, this.layers));
    this.fx = new FxSystem(this, this.layers.fx, this.layers.decal, this.groundLayer, sim, settings.quality);
    this.fx.showBlood = settings.blood;
    this.fx.shake = settings.shake;
    this.overlay = new OverlayLayer(this, sim, this.layers.decal, this.layers.overlay, this.layers.world);
    // camera
    const N = sim.map.w;
    const bounds = { minX: isoX(0, N) + 120, maxX: isoX(N, 0) - 120, minY: 60, maxY: isoY(N, N) - 60 };
    this.camCtl = new CameraController(this, bounds);
    this.camCtl.edgeScroll = settings.edgeScroll;
    this.camCtl.onClick = (wx, wy, dbl) => this.pick(wx, wy, dbl);
    this.camCtl.onHover = (wx, wy) => {
      this.hovered = this.unitAt(wx, wy);
      this.game.canvas.style.cursor = this.hovered >= 0 ? 'pointer' : 'default';
    };
    const fitZoom = Math.min(this.scale.width / (N * 32), this.scale.height / (N * 16));
    this.camCtl.minZoom = Math.max(0.2, fitZoom * 0.9);
    if (cinematic) {
      this.camCtl.setZoom(1.25);
      const c = sim.map.points[1];
      this.camCtl.centerOn(isoX(c.x, c.y), isoY(c.x, c.y));
      this.camCtl.cinematic = () => {
        const h = sim.hotspot();
        const p = h ?? sim.map.points[Math.floor(Math.random() * 3)];
        return { x: isoX(p.x, p.y), y: isoY(p.x, p.y) };
      };
    } else {
      this.camCtl.setZoom(Math.max(fitZoom * 1.15, 0.55));
      this.camCtl.centerOn(isoX(N / 2, N / 2), isoY(N / 2, N / 2));
      this.camCtl.cinematic = null;
    }
    this.followId = -1;
    this.applyGrade(sim, settings.quality);
    st.setLoading(1, 'loading.ready');
  }

  private applyGrade(sim: Simulation, quality: string) {
    const cam = this.cameras.main;
    cam.postFX.clear();
    this.colorFx = null;
    if (quality === 'low') return;
    const g = BIOMES[sim.map.biome].grade;
    this.colorFx = cam.postFX.addColorMatrix();
    this.colorFx.saturate(g.saturation, true);
    this.colorFx.contrast(g.contrast, true);
    this.colorFx.brightness(g.brightness, true);
    cam.postFX.addVignette(0.5, 0.5, 1.05, 0.14);
  }

  private followTarget() {
    const v = this.soldiers.get(this.followId) ?? this.tanks.get(this.followId);
    return v ? { x: v.pos.sx, y: v.pos.sy } : null;
  }

  focusWorld(x: number, y: number, follow: boolean) {
    if (!this.camCtl) return;
    this.camCtl.cinematic = null;
    if (!follow) this.camCtl.follow = null;
    this.camCtl.panTo(isoX(x, y), isoY(x, y));
    if (this.camCtl.zoom < 1.1) this.camCtl.zoomAt(1.4, this.scale.width / 2, this.scale.height / 2);
  }

  /** Frontmost unit whose sprite covers the world point (sx, sy). */
  private unitAt(wx: number, wy: number): number {
    let best = -1;
    let bestDepth = -Infinity;
    for (const v of this.soldiers.values()) {
      if (v.s.state === 'dead') continue;
      const dx = wx - v.pos.sx;
      const dy = wy - v.pos.sy;
      const h = v.s.state === 'downed' || v.s.stance === 'prone' ? 14 : 40;
      if (Math.abs(dx) < 11 && dy < 6 && dy > -h && v.pos.x + v.pos.y > bestDepth) {
        bestDepth = v.pos.x + v.pos.y;
        best = v.s.id;
      }
    }
    if (best >= 0) return best;
    for (const v of this.tanks.values()) {
      const dx = wx - v.pos.sx;
      const dy = wy - v.pos.sy;
      if (Math.abs(dx) < 56 && dy < 30 && dy > -60) return v.t.id;
    }
    return -1;
  }

  private pick(wx: number, wy: number, dbl: boolean) {
    const id = this.unitAt(wx, wy);
    if (id >= 0) {
      if (dbl) game.focusUnit(id, true);
      else game.select(id);
      if (this.camCtl) this.camCtl.cinematic = null;
    } else {
      game.select(-1);
      this.followId = -1;
      if (this.camCtl) this.camCtl.follow = null;
    }
  }

  private onScreen = (x: number, y: number, margin = 40) => {
    const v = this.cameras.main.worldView;
    const sx = isoX(x, y);
    const sy = isoY(x, y);
    return sx > v.x - margin && sx < v.right + margin && sy > v.y - margin - 60 && sy < v.bottom + margin;
  };

  update(_time: number, delta: number) {
    const dt = Math.min(0.1, delta / 1000);
    if (delta > 0) this.fpsAvg = this.fpsAvg * 0.95 + (1000 / delta) * 0.05;
    const alpha = game.tick(delta);
    const sim = this.sim;
    if (!sim || !this.fx || !this.structures || !this.overlay || !this.camCtl || !this.groundLayer) return;
    const st = useGame.getState();
    const settings = st.settings;
    this.camCtl.edgeScroll = settings.edgeScroll && st.phase === 'battle';
    this.fx.showBlood = settings.blood;
    this.fx.shake = settings.shake;

    // world changes
    const events = sim.drainEvents();
    for (const e of events) this.fx.handle(e, this.onScreen);
    if (sim.map.changed.length) {
      this.structures.sync(sim.map.changed);
      sim.map.changed.length = 0;
      this.groundLayer.invalidateShadows();
    }
    this.groundLayer.update(this.time.now);

    // units
    const now = sim.time;
    for (const v of this.soldiers.values()) v.update(alpha, now, sim.map, true);
    this.exhaustT += dt;
    const puff = this.exhaustT > 0.12;
    if (puff) this.exhaustT = 0;
    for (const v of this.tanks.values()) {
      v.update(alpha, now);
      if (puff && v.t.alive && Math.abs(v.t.speed) > 0.4 && this.onScreen(v.pos.x, v.pos.y)) this.fx.exhaust(v.pos.x, v.pos.y, v.pos.facing);
    }

    // roofs: fade the one with the selected unit inside or under the cursor
    const selId = game.selected;
    const sel = this.soldiers.get(selId);
    let focusB = sel && sel.s.indoor >= 0 ? sel.s.indoor : -1;
    if (focusB < 0 && this.hovered < 0) {
      const p = this.input.activePointer;
      const w = this.camCtl.toWorld(p.x, p.y);
      const g = screenToWorld(w.x - 0, w.y + 2.7 * 18);
      focusB = sim.map.isIndoor(g.x, g.y);
    }
    this.structures.updateRoofs(dt, focusB, settings.roofs);
    this.structures.fadeOccluders(sel ? sel.pos.x : 0, sel ? sel.pos.y : 0, !!sel && sel.s.alive);

    this.fx.update(dt, alpha, this.onScreen);
    this.overlay.update(dt, this.camCtl.zoom, this.soldiers, this.tanks, selId, this.hovered, {
      healthBars: settings.healthBars,
      callouts: settings.callouts,
      aiDebug: settings.aiDebug,
      translate: (k) => translate(settings.language, k),
    });
    this.camCtl.update(dt);
  }
}
