import Phaser from 'phaser';
import { SOLDIER } from '../sim/config';
import type { Soldier, Tank } from '../sim/entities';
import type { Simulation } from '../sim/Simulation';
import { isoX, isoY, ISO_W, ISO_H } from './iso';
import { TEAM } from './palette';
import type { SoldierView, TankView } from './UnitViews';

export interface OverlayOptions {
  healthBars: 'damaged' | 'always' | 'off';
  callouts: boolean;
  aiDebug: boolean;
  translate: (key: string) => string;
}

const NEUTRAL = 0xb9b4aa;

/**
 * World-space overlays: control point zones & flags, health bars, callout bubbles,
 * downed markers, and the selected unit's AI debug drawing (path, target, cover, vision).
 */
export class OverlayLayer {
  private ground: Phaser.GameObjects.Graphics;
  private top: Phaser.GameObjects.Graphics;
  private flags: { pole: Phaser.GameObjects.Image; cloth: Phaser.GameObjects.Image; label: Phaser.GameObjects.Text }[] = [];
  private texts: Phaser.GameObjects.Text[] = [];
  private crosses: Phaser.GameObjects.Image[] = [];
  private select: Phaser.GameObjects.Image;
  private hover: Phaser.GameObjects.Image;
  private t = 0;

  constructor(
    private scene: Phaser.Scene,
    private sim: Simulation,
    decal: Phaser.GameObjects.Layer,
    private overlay: Phaser.GameObjects.Layer,
    world: Phaser.GameObjects.Layer,
  ) {
    this.ground = scene.add.graphics();
    decal.add(this.ground);
    this.top = scene.add.graphics();
    overlay.add(this.top);
    this.select = scene.add.image(0, 0, 'fx_select').setVisible(false).setTint(0xffe28a);
    this.hover = scene.add.image(0, 0, 'fx_teamring').setVisible(false).setAlpha(0.6);
    decal.add([this.select, this.hover]);
    for (const p of sim.points) {
      const sx = isoX(p.x, p.y);
      const sy = isoY(p.x, p.y);
      const pole = scene.add.image(sx, sy, 'fx_pole').setOrigin(0.14, 1).setDepth(p.x + p.y + 0.4);
      const cloth = scene.add.image(sx + 2, sy - 82, 'fx_cloth').setOrigin(0, 0).setDepth(p.x + p.y + 0.41);
      const label = scene.add
        .text(sx + 4, sy - 100, p.label, { fontFamily: 'Chakra Petch, Rajdhani, system-ui, sans-serif', fontSize: '20px', fontStyle: '700', color: '#ffffff', stroke: '#0b0d0c', strokeThickness: 5 })
        .setOrigin(0.5, 1)
        .setResolution(2);
      world.add([pole, cloth]);
      overlay.add(label);
      this.flags.push({ pole, cloth, label });
    }
  }

  private text(i: number) {
    let t = this.texts[i];
    if (!t) {
      t = this.scene.add
        .text(0, 0, '', { fontFamily: 'Chakra Petch, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif', fontSize: '12px', fontStyle: '600', color: '#f4f1ea', backgroundColor: 'rgba(12,14,13,0.72)', padding: { x: 5, y: 2 } })
        .setOrigin(0.5, 1)
        .setResolution(2);
      this.overlay.add(t);
      this.texts[i] = t;
    }
    return t;
  }

  update(
    dt: number,
    zoom: number,
    soldiers: Map<number, SoldierView>,
    tanks: Map<number, TankView>,
    selected: number,
    hovered: number,
    opts: OverlayOptions,
  ) {
    this.t += dt;
    const sim = this.sim;
    const g = this.ground;
    const top = this.top;
    g.clear();
    top.clear();
    const inv = Phaser.Math.Clamp(1 / zoom, 0.55, 1.8);

    // control points
    sim.points.forEach((p, i) => {
      const owner = p.owner;
      const col = owner === -1 ? NEUTRAL : TEAM[owner].accentInt;
      const leading = p.capture > 0 ? 0 : p.capture < 0 ? 1 : -1;
      const prog = Math.abs(p.capture);
      const rx = p.r * ISO_W * Math.SQRT2;
      const ry = p.r * ISO_H * Math.SQRT2;
      const sx = isoX(p.x, p.y);
      const sy = isoY(p.x, p.y);
      g.fillStyle(col, owner === -1 ? 0.07 : 0.12);
      g.fillEllipse(sx, sy, rx * 2, ry * 2, 48);
      g.lineStyle(2, col, 0.55 + (p.contested ? Math.sin(this.t * 8) * 0.3 : 0));
      g.strokeEllipse(sx, sy, rx * 2, ry * 2, 48);
      if (leading !== -1 && prog < 0.999) {
        // capture progress arc
        g.lineStyle(4, TEAM[leading as 0 | 1].accentInt, 0.95);
        g.beginPath();
        const steps = Math.max(2, Math.floor(48 * prog));
        for (let k = 0; k <= steps; k++) {
          const a = -Math.PI / 2 + (k / 48) * Math.PI * 2;
          const px = sx + Math.cos(a) * rx * 0.86;
          const py = sy + Math.sin(a) * ry * 0.86;
          if (k === 0) g.moveTo(px, py);
          else g.lineTo(px, py);
        }
        g.strokePath();
      }
      const f = this.flags[i];
      f.cloth.setTint(col);
      f.cloth.setScale(1 + Math.sin(this.t * 3 + i) * 0.06, 1);
      f.label.setColor(owner === -1 ? '#e8e4dc' : TEAM[owner].ui);
      f.label.setScale(inv);
    });

    // selection & hover rings
    const selView = soldiers.get(selected) ?? tanks.get(selected);
    if (selView) {
      const big = tanks.has(selected);
      this.select.setVisible(true).setPosition(selView.pos.sx, selView.pos.sy).setScale(big ? 1.5 : 0.42).setRotation(0);
      this.select.setAlpha(0.75 + Math.sin(this.t * 5) * 0.2);
    } else this.select.setVisible(false);
    const hovView = hovered !== selected ? (soldiers.get(hovered) ?? tanks.get(hovered)) : undefined;
    if (hovView) this.hover.setVisible(true).setPosition(hovView.pos.sx, hovView.pos.sy).setScale(tanks.has(hovered) ? 1.9 : 0.45);
    else this.hover.setVisible(false);

    // selected soldier AI debug
    if (opts.aiDebug && selView) {
      const a = sim.get(selected);
      if (a && a.alive) this.drawDebug(a, selView.pos.x, selView.pos.y);
    }

    // health bars, callouts, downed markers
    let ti = 0;
    let ci = 0;
    const now = sim.time;
    for (const v of soldiers.values()) {
      const s = v.s;
      if (s.state === 'dead') continue;
      const sx = v.pos.sx;
      const sy = v.pos.sy;
      if (s.state === 'downed') {
        const cross = this.crosses[ci] ?? this.overlay.add(this.scene.add.image(0, 0, 'fx_cross')) as Phaser.GameObjects.Image;
        this.crosses[ci++] = cross;
        const pulse = 0.75 + Math.sin(this.t * 6 + s.id) * 0.25;
        cross.setVisible(true).setPosition(sx, sy - 24).setScale(0.55 * inv).setAlpha(pulse);
        // bleed-out ring
        const frac = Math.max(0, s.bleed / SOLDIER.bleedout);
        top.lineStyle(2.5 * inv, 0xff5a47, 0.9);
        top.beginPath();
        top.arc(sx, sy - 24, 9 * inv, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
        top.strokePath();
        continue;
      }
      const show = opts.healthBars === 'always' || (opts.healthBars === 'damaged' && (s.hp < s.maxHp - 0.5 || s.id === selected));
      if (show) this.bar(top, sx, sy - (s.stance === 'stand' ? 46 : 34), s.hp / s.maxHp, s.team, inv, s.suppression);
      if (opts.callouts && s.callout && s.calloutUntil > now) {
        const t = this.text(ti++);
        this.setLabel(t, opts.translate(`call.${s.callout}`), s.team === 0 ? 'rgba(14,30,52,0.82)' : 'rgba(52,18,14,0.82)');
        t.setPosition(sx, sy - (s.stance === 'stand' ? 52 : 40)).setScale(inv).setVisible(true);
        t.setAlpha(Math.min(1, (s.calloutUntil - now) * 3));
      }
    }
    for (const v of tanks.values()) {
      const t = v.t;
      if (!t.alive) continue;
      if (opts.healthBars !== 'off') this.bar(top, v.pos.sx, v.pos.sy - 66, t.hp / t.maxHp, t.team, inv * 1.6, 0);
      if (opts.callouts && t.callout && t.calloutUntil > now) {
        const tx = this.text(ti++);
        this.setLabel(tx, opts.translate(`call.${t.callout}`), t.team === 0 ? 'rgba(14,30,52,0.82)' : 'rgba(52,18,14,0.82)');
        tx.setPosition(v.pos.sx, v.pos.sy - 74).setScale(inv).setVisible(true).setAlpha(1);
      }
    }
    for (let k = ti; k < this.texts.length; k++) this.texts[k].setVisible(false);
    for (let k = ci; k < this.crosses.length; k++) this.crosses[k].setVisible(false);
  }

  /** Text/background changes re-render the label texture, so only apply real changes. */
  private setLabel(t: Phaser.GameObjects.Text, text: string, bg: string) {
    if (t.getData('bg') !== bg) {
      t.setData('bg', bg);
      t.setBackgroundColor(bg);
    }
    if (t.text !== text) t.setText(text);
  }

  private bar(gr: Phaser.GameObjects.Graphics, x: number, y: number, frac: number, team: 0 | 1, s: number, supp: number) {
    const w = 22 * s;
    const h = 3.2 * s;
    gr.fillStyle(0x0b0d0c, 0.8);
    gr.fillRect(x - w / 2 - 1, y - 1, w + 2, h + 2);
    const col = frac > 0.55 ? TEAM[team].accentInt : frac > 0.3 ? 0xf0c14b : 0xff4b3e;
    gr.fillStyle(col, 1);
    gr.fillRect(x - w / 2, y, w * Math.max(0, frac), h);
    if (supp > 0.15) {
      gr.fillStyle(0xf5d06b, 0.85);
      gr.fillRect(x - w / 2, y + h + 1, w * supp, 1.6 * s);
    }
  }

  private drawDebug(a: Soldier | Tank, x: number, y: number) {
    const g = this.ground;
    const top = this.top;
    const sim = this.sim;
    const loco = a.loco;
    // path
    if (loco.status === 'moving' && loco.path.length) {
      g.lineStyle(2, 0xffffff, 0.7);
      g.beginPath();
      g.moveTo(isoX(x, y), isoY(x, y));
      for (let i = loco.idx; i < loco.path.length; i++) g.lineTo(isoX(loco.path[i].x, loco.path[i].y), isoY(loco.path[i].x, loco.path[i].y));
      g.strokePath();
      const last = loco.path[loco.path.length - 1];
      g.fillStyle(0xffffff, 0.85);
      g.fillCircle(isoX(last.x, last.y), isoY(last.x, last.y), 3);
    }
    if (a.kind === 'soldier') {
      // vision cone
      const r = a.vision;
      const half = SOLDIER.fov / 2;
      g.fillStyle(TEAM[a.team].accentInt, 0.06);
      g.beginPath();
      g.moveTo(isoX(x, y), isoY(x, y));
      for (let k = 0; k <= 20; k++) {
        const ang = a.facing - half + (k / 20) * half * 2;
        g.lineTo(isoX(x + Math.cos(ang) * r, y + Math.sin(ang) * r), isoY(x + Math.cos(ang) * r, y + Math.sin(ang) * r));
      }
      g.closePath();
      g.fillPath();
      // cover cell
      if (a.bb.cover >= 0) {
        const cx = (a.bb.cover % sim.map.w) + 0.5;
        const cy = Math.floor(a.bb.cover / sim.map.w) + 0.5;
        g.lineStyle(2, 0x7dffb0, 0.9);
        g.strokeEllipse(isoX(cx, cy), isoY(cx, cy), 20, 10, 16);
      }
      // known contacts
      for (const c of a.contacts.values()) {
        const col = c.visible ? 0xff5a47 : 0xf0c14b;
        g.lineStyle(1.5, col, c.visible ? 0.9 : 0.6);
        g.strokeEllipse(isoX(c.x, c.y), isoY(c.x, c.y), 16, 8, 12);
      }
    }
    // target line
    const tgt = a.bb.target >= 0 ? sim.get(a.bb.target) : undefined;
    if (tgt && tgt.alive) {
      top.lineStyle(1.5, 0xff5a47, 0.85);
      top.beginPath();
      top.moveTo(isoX(x, y), isoY(x, y, 1.2));
      top.lineTo(isoX(tgt.x, tgt.y), isoY(tgt.x, tgt.y, 1.2));
      top.strokePath();
    }
  }

  destroy() {
    this.ground.destroy();
    this.top.destroy();
    this.select.destroy();
    this.hover.destroy();
    for (const f of this.flags) {
      f.pole.destroy();
      f.cloth.destroy();
      f.label.destroy();
    }
    for (const t of this.texts) t.destroy();
    for (const c of this.crosses) c.destroy();
  }
}
