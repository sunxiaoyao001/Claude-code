import type Phaser from 'phaser';
import { Rng } from '../../core/rng';

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, ctx: c.getContext('2d')! };
}

function add(textures: Phaser.Textures.TextureManager, key: string, c: HTMLCanvasElement) {
  if (textures.exists(key)) textures.remove(key);
  textures.addCanvas(key, c);
}

/** Particle, decal and marker textures shared by every battle. */
export function buildFxTextures(textures: Phaser.Textures.TextureManager) {
  const rng = new Rng(1234);
  {
    const { c, ctx } = canvas(64, 64);
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.6)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    add(textures, 'fx_soft', c);
  }
  {
    const { c, ctx } = canvas(128, 128);
    for (let i = 0; i < 14; i++) {
      const x = 64 + rng.range(-26, 26);
      const y = 64 + rng.range(-20, 20);
      const r = rng.range(18, 34);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const a = rng.range(0.25, 0.45);
      g.addColorStop(0, `rgba(255,255,255,${a})`);
      g.addColorStop(0.6, `rgba(245,245,245,${a * 0.6})`);
      g.addColorStop(1, 'rgba(240,240,240,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    add(textures, 'fx_puff', c);
  }
  {
    const { c, ctx } = canvas(32, 8);
    const g = ctx.createLinearGradient(0, 0, 32, 0);
    g.addColorStop(0, 'rgba(255,220,140,0)');
    g.addColorStop(0.7, 'rgba(255,240,200,1)');
    g.addColorStop(1, 'rgba(255,255,255,1)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(16, 4, 16, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    add(textures, 'fx_spark', c);
  }
  {
    const { c, ctx } = canvas(64, 80);
    const g = ctx.createRadialGradient(32, 50, 2, 32, 46, 30);
    g.addColorStop(0, 'rgba(255,255,230,1)');
    g.addColorStop(0.3, 'rgba(255,220,120,0.9)');
    g.addColorStop(0.65, 'rgba(255,140,40,0.5)');
    g.addColorStop(1, 'rgba(255,80,20,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(32, 2);
    ctx.quadraticCurveTo(60, 40, 52, 62);
    ctx.quadraticCurveTo(32, 80, 12, 62);
    ctx.quadraticCurveTo(4, 40, 32, 2);
    ctx.fill();
    add(textures, 'fx_flame', c);
  }
  {
    const { c, ctx } = canvas(8, 8);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(1, 2);
    ctx.lineTo(6, 0);
    ctx.lineTo(8, 5);
    ctx.lineTo(3, 8);
    ctx.closePath();
    ctx.fill();
    add(textures, 'fx_chunk', c);
  }
  {
    const { c, ctx } = canvas(256, 128);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(128, 64, 120, 58, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 14;
    ctx.stroke();
    add(textures, 'fx_ring', c);
  }
  {
    const { c, ctx } = canvas(64, 4);
    const g = ctx.createLinearGradient(0, 0, 64, 0);
    g.addColorStop(0, 'rgba(255,200,120,0)');
    g.addColorStop(0.6, 'rgba(255,230,170,0.85)');
    g.addColorStop(1, 'rgba(255,255,235,1)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 1, 64, 2);
    add(textures, 'fx_tracer', c);
  }
  {
    const { c, ctx } = canvas(64, 64);
    ctx.translate(32, 32);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 30);
    g.addColorStop(0, 'rgba(255,255,230,1)');
    g.addColorStop(0.25, 'rgba(255,220,120,0.95)');
    g.addColorStop(1, 'rgba(255,140,40,0)');
    ctx.fillStyle = g;
    for (let i = 0; i < 6; i++) {
      ctx.rotate(Math.PI / 3);
      ctx.beginPath();
      ctx.moveTo(0, -4);
      ctx.lineTo(30, 0);
      ctx.lineTo(0, 4);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    add(textures, 'fx_flash', c);
  }
  {
    const { c, ctx } = canvas(64, 32);
    const g = ctx.createRadialGradient(32, 16, 0, 32, 16, 30);
    g.addColorStop(0, 'rgba(0,0,0,0.55)');
    g.addColorStop(0.6, 'rgba(0,0,0,0.3)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.save();
    ctx.scale(1, 0.5);
    ctx.beginPath();
    ctx.arc(32, 32, 30, 0, Math.PI * 2);
    ctx.restore();
    ctx.fill();
    add(textures, 'fx_shadow', c);
  }
  {
    const { c, ctx } = canvas(64, 32);
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(32, 16, 27, 13, 0, 0, Math.PI * 2);
    ctx.stroke();
    add(textures, 'fx_teamring', c);
  }
  {
    const { c, ctx } = canvas(128, 64);
    ctx.strokeStyle = 'rgba(255,255,255,1)';
    ctx.lineWidth = 4;
    ctx.setLineDash([14, 8]);
    ctx.beginPath();
    ctx.ellipse(64, 32, 58, 28, 0, 0, Math.PI * 2);
    ctx.stroke();
    add(textures, 'fx_select', c);
  }
  {
    const { c, ctx } = canvas(128, 64);
    const g = ctx.createRadialGradient(64, 32, 4, 64, 32, 60);
    g.addColorStop(0, 'rgba(26,20,15,0.7)');
    g.addColorStop(0.35, 'rgba(40,32,24,0.45)');
    g.addColorStop(0.7, 'rgba(60,48,36,0.16)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.scale(1, 0.5);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(64, 64, 60, 0, Math.PI * 2);
    ctx.restore();
    ctx.fill();
    for (let i = 0; i < 26; i++) {
      const a = rng.range(0, Math.PI * 2);
      const r = rng.range(20, 50);
      ctx.fillStyle = `rgba(30,24,18,${rng.range(0.2, 0.5)})`;
      ctx.beginPath();
      ctx.ellipse(64 + Math.cos(a) * r, 32 + Math.sin(a) * r * 0.5, rng.range(1.5, 4), rng.range(1, 2.5), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    add(textures, 'fx_crater', c);
  }
  {
    const { c, ctx } = canvas(48, 24);
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = `rgba(${86 + rng.int(-14, 14)},18,14,${rng.range(0.45, 0.75)})`;
      ctx.beginPath();
      ctx.ellipse(24 + rng.range(-12, 12), 12 + rng.range(-5, 5), rng.range(3, 9), rng.range(2, 5), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    add(textures, 'fx_blood', c);
  }
  {
    const { c, ctx } = canvas(12, 12);
    const g = ctx.createRadialGradient(4, 4, 1, 6, 6, 6);
    g.addColorStop(0, '#7b8a5a');
    g.addColorStop(1, '#232a18');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(6, 6, 5, 0, Math.PI * 2);
    ctx.fill();
    add(textures, 'fx_grenade', c);
  }
  {
    const { c, ctx } = canvas(10, 14);
    ctx.fillStyle = '#9aa0a3';
    ctx.fillRect(1, 2, 8, 11);
    ctx.fillStyle = '#d0d4d6';
    ctx.fillRect(1, 2, 8, 3);
    add(textures, 'fx_smokegren', c);
  }
  {
    const { c, ctx } = canvas(28, 8);
    ctx.fillStyle = '#4f5a3c';
    ctx.fillRect(4, 2, 18, 4);
    ctx.fillStyle = '#6d7350';
    ctx.beginPath();
    ctx.moveTo(22, 1);
    ctx.lineTo(28, 4);
    ctx.lineTo(22, 7);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,200,100,0.95)';
    ctx.fillRect(0, 3, 4, 2);
    add(textures, 'fx_rocket', c);
  }
  {
    const { c, ctx } = canvas(20, 6);
    const g = ctx.createLinearGradient(0, 0, 20, 0);
    g.addColorStop(0, 'rgba(255,180,80,0)');
    g.addColorStop(1, 'rgba(255,250,220,1)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(10, 3, 10, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    add(textures, 'fx_shell', c);
  }
  {
    const { c, ctx } = canvas(6, 6);
    const g = ctx.createRadialGradient(3, 3, 0, 3, 3, 3);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 6, 6);
    add(textures, 'fx_dot', c);
  }
  {
    // medic cross marker for downed soldiers
    const { c, ctx } = canvas(28, 28);
    ctx.fillStyle = 'rgba(15,15,15,0.75)';
    ctx.beginPath();
    ctx.arc(14, 14, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff4b3e';
    ctx.fillRect(11, 5, 6, 18);
    ctx.fillRect(5, 11, 18, 6);
    add(textures, 'fx_cross', c);
  }
  {
    // control point flag pole + cloth (white cloth is tinted)
    const { c, ctx } = canvas(40, 90);
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(4, 6, 3, 84);
    ctx.fillStyle = '#d8d8d8';
    ctx.beginPath();
    ctx.arc(5.5, 6, 3, 0, Math.PI * 2);
    ctx.fill();
    add(textures, 'fx_pole', c);
    const cl = canvas(36, 24);
    cl.ctx.fillStyle = '#ffffff';
    cl.ctx.beginPath();
    cl.ctx.moveTo(0, 0);
    cl.ctx.quadraticCurveTo(18, 4, 36, 2);
    cl.ctx.lineTo(34, 22);
    cl.ctx.quadraticCurveTo(18, 20, 0, 22);
    cl.ctx.closePath();
    cl.ctx.fill();
    cl.ctx.fillStyle = 'rgba(0,0,0,0.12)';
    cl.ctx.fillRect(0, 11, 36, 11);
    add(textures, 'fx_cloth', cl.c);
  }
}
