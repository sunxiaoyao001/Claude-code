import {random} from 'remotion';

// Procedural macro iris: radial stroma fibres, collarette, crypts, contraction furrows, limbal ring.
let cached: string | null = null;

export const irisTexture = () => {
  if (cached) return cached;
  const S = 1024;
  const cx = S / 2;
  const R = 500;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  let k = 0;
  const rnd = () => random(`iris${k++}`);

  const base = g.createRadialGradient(cx, cx, 0, cx, cx, R);
  base.addColorStop(0, '#1a0d05');
  base.addColorStop(0.2, '#4a2a12');
  base.addColorStop(0.32, '#8a5626');
  base.addColorStop(0.45, '#7a4c22');
  base.addColorStop(0.7, '#4f3017');
  base.addColorStop(0.88, '#2e1b0c');
  base.addColorStop(0.96, '#140b05');
  base.addColorStop(1, 'rgba(10,6,3,0)');
  g.fillStyle = base;
  g.beginPath();
  g.arc(cx, cx, R, 0, Math.PI * 2);
  g.fill();

  // stroma fibres: thousands of slightly bent radial strands
  for (let i = 0; i < 5200; i++) {
    const a = rnd() * Math.PI * 2;
    const r0 = R * (0.19 + rnd() * 0.16);
    const r1 = R * (0.5 + rnd() * 0.46);
    const bend = (rnd() - 0.5) * 0.14;
    const am = a + bend;
    const rm = (r0 + r1) / 2;
    const a1 = a + bend * 0.35;
    const light = rnd();
    const alpha = 0.06 + rnd() * 0.22;
    g.strokeStyle =
      light > 0.55
        ? `rgba(${205 + rnd() * 45},${145 + rnd() * 50},${70 + rnd() * 40},${alpha})`
        : `rgba(${25 + rnd() * 30},${12 + rnd() * 12},${4},${alpha + 0.08})`;
    g.lineWidth = 0.5 + rnd() * 2;
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * r0, cx + Math.sin(a) * r0);
    g.quadraticCurveTo(cx + Math.cos(am) * rm, cx + Math.sin(am) * rm, cx + Math.cos(a1) * r1, cx + Math.sin(a1) * r1);
    g.stroke();
  }
  // a few green-gold flecks near the collarette
  for (let i = 0; i < 260; i++) {
    const a = rnd() * Math.PI * 2;
    const r = R * (0.3 + rnd() * 0.18);
    g.fillStyle = `rgba(${150 + rnd() * 60},${140 + rnd() * 50},${60 + rnd() * 30},${0.08 + rnd() * 0.12})`;
    g.beginPath();
    g.ellipse(cx + Math.cos(a) * r, cx + Math.sin(a) * r, 3 + rnd() * 6, 1 + rnd() * 2, a, 0, Math.PI * 2);
    g.fill();
  }
  // collarette: a raised wavy ring
  g.lineWidth = 5;
  g.strokeStyle = 'rgba(214,160,96,0.35)';
  g.beginPath();
  for (let i = 0; i <= 360; i++) {
    const a = (i / 360) * Math.PI * 2;
    const r = R * (0.4 + 0.025 * Math.sin(a * 23) + 0.015 * Math.sin(a * 57 + 1));
    const x = cx + Math.cos(a) * r;
    const y = cx + Math.sin(a) * r;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.stroke();
  // crypts: dark lacunae between fibres
  for (let i = 0; i < 90; i++) {
    const a = rnd() * Math.PI * 2;
    const r = R * (0.42 + rnd() * 0.3);
    g.fillStyle = `rgba(14,7,3,${0.35 + rnd() * 0.35})`;
    g.beginPath();
    g.ellipse(cx + Math.cos(a) * r, cx + Math.sin(a) * r, 6 + rnd() * 16, 2 + rnd() * 5, a, 0, Math.PI * 2);
    g.fill();
  }
  // contraction furrows
  for (const fr of [0.66, 0.76, 0.84]) {
    g.strokeStyle = 'rgba(15,8,3,0.35)';
    g.lineWidth = 2;
    g.beginPath();
    for (let i = 0; i <= 360; i++) {
      const a = (i / 360) * Math.PI * 2;
      const r = R * (fr + 0.008 * Math.sin(a * 41 + fr * 10));
      const x = cx + Math.cos(a) * r;
      const y = cx + Math.sin(a) * r;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }
  // limbal ring
  const limb = g.createRadialGradient(cx, cx, R * 0.8, cx, cx, R);
  limb.addColorStop(0, 'rgba(8,4,2,0)');
  limb.addColorStop(0.75, 'rgba(8,4,2,0.55)');
  limb.addColorStop(1, 'rgba(8,4,2,0.95)');
  g.fillStyle = limb;
  g.beginPath();
  g.arc(cx, cx, R, 0, Math.PI * 2);
  g.fill();
  cached = c.toDataURL('image/png');
  return cached;
};
