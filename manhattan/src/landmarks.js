// =====================================================================
//  Landmarks
// =====================================================================
const TELEPORTS = []; // {name, group, x, z, y?, yaw, sub}
function tp(group, name, x, z, yaw = 0, y = null, sub = '') { TELEPORTS.push({ group, name, x, z, y, yaw, sub }); }
const lookYaw = (x, z, tx, tz) => Math.atan2(-(tx - x), -(tz - z));
const T = (x0, z0, x1, z1, y0, y1) => ({ poly: rectPoly(Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)), y0, y1 });
function L(tiers, style, col, flags = 0, seed = null) { return addBuilding(tiers, style, { col, flags, seed: seed == null ? ri(0, 255) : seed }); }
function custom(faces, style, col, flags = 0, base = 0, seed = 5) {
  const c = faces[0][0];
  getChunk(c[0], c[2]).bld.push({ faces, base, col, st: STYLE_ID[style] ?? style, sd: seed, fl: flags, hw: 0 });
}
function parapet(r, y, h = 1.3, col = 0x3a3d40) {
  const [x0, z0, x1, z1] = r, t = 0.35;
  for (const q of [[x0, z0, x1, z0 + t], [x0, z1 - t, x1, z1], [x0, z0, x0 + t, z1], [x1 - t, z0, x1, z1]]) {
    pushPiece(rectPoly(...q), y, y + h, y, col, 6, 3, 32); addSolid(rectPoly(...q), y, y + h);
  }
}
const LANDMARK_RESERVE = [
  ['Empire State Building', [-152, -2668, -18, -2619]],
  ['Chrysler Building', [388, -3386, 452, -3335]],
  ['Rockefeller Center', [-265, -4020, -15, -3783]],
  ["St. Patrick's Cathedral", [18, -4017, 112, -3962]],
  ['New York Public Library', [-140, -3299, -18, -3172]],
  ['One Times Square', [-512, -3392, -470, -3334]],
  ['Deutsche Bank Center', [-998, -4728, -812, -4588]],
  ['Central Park Tower', [-722, -4568, -676, -4522]],
  ['One57', [-472, -4570, -428, -4522]],
  ['220 Central Park South', [-632, -4642, -588, -4598]],
  ['111 West 57th', [-402, -4485, -380, -4436]],
  ['432 Park Avenue', [199, -4477, 232, -4444]],
  ['7 World Trade Center', [-622, 1478, -543, 1552]],
  ['NYSE', [-62, 2222, 50, 2293]],
  ['Federal Hall', [-52, 2127, 25, 2198]],
  ['Trinity Church', [-205, 2165, -158, 2245]],
  ['Guggenheim', [18, -7020, 112, -6963]],
  ['Dakota', [-1000, -5776, -800, -5700]],
];
function reserveLandmarks() {
  for (const [name, r] of LANDMARK_RESERVE) reserve(rectPoly(...r), name);
  for (const p of PARKS) reserve(rectPoly(p.x0, p.z0, p.x1, p.z1), p.name);
  for (const s of SUPER) reserve(rectPoly(s.x0, s.z0, s.x1, s.z1), s.name);
  // Flatiron triangle (between Fifth Avenue and Broadway, 22nd–23rd)
  const tri = flatironPoly(); if (tri) reserve(tri, 'Flatiron Building');
}
function flatironPoly() {
  const r = rectPoly(20.5, zN(23) + 15 + 4.6, 140, zN(22) - 9 - 4.6);
  const { seg: s } = broadwayDist(40, zN(22.5));
  const nx = -s.dz, nz = s.dx; // left normal of the south→north segment
  const off = BW_HALF + 4.6;
  // keep the side containing Fifth Avenue (x≈20)
  const test = (20 - s.ax) * nx + (zN(22.5) - s.az) * nz;
  const sg = test > 0 ? 1 : -1;
  const p = clipHalf(r, s.ax + nx * off * sg, s.az + nz * off * sg, nx * sg, nz * sg);
  return p.length >= 3 ? p : null;
}

function buildLandmarks() {
  // ---------------- Empire State Building ----------------
  const esb = [T(-150, -2666, -20.5, -2621, 0, 25), T(-145, -2663, -26, -2624, 25, 82), T(-133, -2661, -38, -2626, 82, 110), T(-124, -2660, -47, -2627, 110, 125),
    T(-118, -2659, -53, -2628, 125, 320), T(-110, -2655, -61, -2632, 320, 348), T(-102, -2652, -69, -2635, 348, 366), T(-96, -2649, -75, -2638, 366, 373)];
  L(esb.slice(0, 5), 'deco', 0xcbc2ad, 4, 10);
  L(esb.slice(5), 'deco', 0xcbc2ad, 8 | 16, 10);
  L([T(-92, -2647, -79, -2640, 373, 381)], 'deco', 0xd8d2c3, 8, 10);
  const ex = -85.5, ez = -2643.5;
  vc('metal', CYL12, 0xc9ccc8, ex, 388, ez, 0, 0, 0, 5.2, 14, 5.2);
  vc('metal', CYL12, 0xc9ccc8, ex, 401.5, ez, 0, 0, 0, 3.6, 13, 3.6);
  vc('metal', CYL12, 0xc0c3c0, ex, 413, ez, 0, 0, 0, 2.2, 10, 2.2);
  vc('dark', CYL8, 0x8a8c8a, ex, 430.5, ez, 0, 0, 0, 0.65, 25, 0.65);
  vc('glow', SPH, 0xff3020, ex, 443.4, ez, 0, 0, 0, 0.8, 0.8, 0.8);
  parapet([-118, -2659, -53, -2628], 320, 1.4);
  tp('Midtown', 'Empire State Building', -10, -2640, lookYaw(-10, -2640, -85, -2643), null, '5th Av & 34th St');
  tp('Up high', 'Empire State, 86th floor', -114, -2643.5, Math.PI / 2, 320.2, 'Open-air observatory, 320 m');

  // ---------------- Chrysler Building ----------------
  L([T(390.5, -3383, 450, -3338, 0, 62), T(394, -3380, 446, -3341, 62, 85)], 'deco', 0xc9c2b0, 4, 20);
  L([T(402, -3378, 438, -3343, 85, 200), T(405, -3375, 435, -3346, 200, 225), T(408, -3372, 432, -3349, 225, 242)], 'deco', 0xd2ccbd, 16, 20);
  const cx = 420, cz = -3360.5;
  const crown = [[11, 9.5, 242, 250], [9.5, 8, 250, 257], [8, 6.5, 257, 263], [6.5, 5, 263, 268], [5, 3.8, 268, 272], [3.8, 2.6, 272, 276], [2.6, 1.6, 276, 280]];
  for (const [a, b, y0, y1] of crown) {
    const g = new THREE.CylinderGeometry(b * Math.SQRT2, a * Math.SQRT2, y1 - y0, 4, 1, true);
    g.rotateY(Math.PI / 4); g.translate(cx, (y0 + y1) / 2, cz);
    CHRYSLER.push(g);
  }
  vc('metal', new THREE.ConeGeometry(1.4, 39, 8), 0xd9dde0, cx, 299.5, cz);
  for (const [dx, dz, r] of [[1, 1, Math.PI / 4], [-1, 1, -Math.PI / 4], [1, -1, 3 * Math.PI / 4], [-1, -1, -3 * Math.PI / 4]])
    vc('metal', BOX, 0xbfc4c7, cx + dx * 16.5, 186, cz + dz * 16.5, 0, r, 0, 1.2, 1.0, 4.5);
  tp('Midtown', 'Chrysler Building', 382, -3326, lookYaw(382, -3326, 420, -3360), null, 'Lexington Av & 42nd St');

  // ---------------- Grand Central, One Vanderbilt, MetLife, Helmsley ----------------
  const gctS = SUPER.find((s) => s.kind === 'gct');
  addGround(rectPoly(gctS.x0, gctS.z0, gctS.x1, gctS.z1), 6, 0.15, { side: 0.15 }); addSolid(rectPoly(gctS.x0, gctS.z0, gctS.x1, gctS.z1), -1, 0.15, 'p');
  L([T(205, -3450, 350, -3340, 0, 34)], 'civic', 0xd6cab0, 0, 30);
  L([T(240, -3362, 315, -3338, 0, 42)], 'civic', 0xdcd1b8, 16, 31);
  vc('stone', BOX, 0xc8bc9f, 277.5, 45.5, -3339, 0, 0, 0, 22, 7, 2.5);
  vc('gold', CYL12, 0xc9a24a, 277.5, 39, -3337.2, Math.PI / 2, 0, 0, 2.0, 0.4, 2.0);
  vc('copper', BOX, 0x5f8a78, 277.5, 34.6, -3395, 0, 0, 0, 130, 1.2, 100);
  L([T(149, -3383, 198, -3338, 0, 60), T(152, -3380, 195, -3341, 60, 250)], 'glass', 0x93a4aa, 4, 32);
  L([T(156, -3376, 191, -3345, 250, 330), T(161, -3371, 186, -3350, 330, 380), T(166, -3366, 181, -3355, 380, 398)], 'glass', 0x93a4aa, 16, 32);
  addProp('antenna', 173.5, -3360.5, 398, 29);
  const ml = [[205, -3525], [215, -3535], [290, -3535], [300, -3525], [300, -3490], [290, -3480], [215, -3480], [205, -3490]];
  L([{ poly: ml, y0: 0, y1: 246 }], 'postwar', 0x9d9a92, 0, 33);
  L([T(212, -3612, 288, -3568, 0, 140), T(222, -3604, 278, -3576, 140, 172)], 'masonry', 0xc9b28c, 16, 34);
  vc('copper', new THREE.ConeGeometry(20, 14, 4), 0x5f8a78, 250, 179, -3590, 0, Math.PI / 4, 0);
  vc('gold', CYL8, 0xc9a24a, 250, 190, -3590, 0, 0, 0, 1.5, 8, 1.5);
  tp('Midtown', 'Grand Central Terminal', 277, -3305, 0, null, 'Park Av & 42nd St');

  // ---------------- Rockefeller Center ----------------
  const rock = [T(-240, -3925, -112, -3896, 0, 64), T(-236, -3923, -120, -3898, 64, 150), T(-230, -3921, -128, -3900, 150, 205), T(-224, -3920, -136, -3901, 205, 240), T(-218, -3918, -142, -3903, 240, 259)];
  L(rock, 'deco', 0xc9c1ae, 16 | 4, 40);
  parapet([-218, -3918, -142, -3903], 259, 1.6, 0x6b7378);
  addGround(rectPoly(-108, -3936, -15, -3885), 6, 0.15, { side: 0.15 }); addSolid(rectPoly(-108, -3936, -15, -3885), -1, 0.15, 'p');
  L([T(-62, -3936, -20, -3925, 0, 28)], 'deco', 0xcfc7b4, 4, 41); L([T(-62, -3896, -20, -3885, 0, 28)], 'deco', 0xcfc7b4, 4, 42);
  addGround(rectPoly(-58, -3916, -24, -3905), 4, 0.5, { side: 0.35 });
  addGround(rectPoly(-102, -3922, -66, -3899), 13, 0.18, {});
  vc('stone', BOX, 0xd8dde0, -84, 0.2, -3910.5, 0, 0, 0, 34, 0.08, 21);
  vc('gold', SPH, 0xd4a83a, -102, 5.5, -3910.5, 0, 0, 0, 1.6, 2.2, 1.6);
  vc('gold', BOX, 0xd4a83a, -102, 4.0, -3910.5, 0, 0, 0.5, 4.5, 0.8, 1.2);
  vc('gold', SPH, 0xc49a3a, -102, 7.4, -3910.5, 0, 0, 0, 0.7, 0.8, 0.7);
  for (let i = 0; i < 18; i++) { const a = i / 17 * Math.PI; addProp('flag', -84 + Math.cos(a) * 21, -3910.5 + Math.sin(a) * 15 * (i % 2 ? 1 : -1), 0, i); }
  L([T(-259, -3936, -244, -3885, 0, 40)], 'deco', 0xc9c1ae, 4, 43);
  L([T(-259, -3857, -150, -3806, 0, 95)], 'deco', 0xc6bdaa, 4, 44); L([T(-145, -3857, -20, -3806, 0, 80)], 'deco', 0xd0c8b6, 4, 45);
  L([T(-259, -4015, -185, -3964, 0, 30)], 'deco', 0xb9ad98, 4, 46);
  L([T(-180, -4015, -20, -3964, 0, 40)], 'deco', 0xccc4b2, 4, 47);
  L([T(-140, -4005, -60, -3974, 40, 156)], 'deco', 0xccc4b2, 16, 47);
  BILLBOARDS.push({ x: -258.6, y: 16, z: -3995, w: 3.2, h: 22, rot: -Math.PI / 2, ad: 16 });
  tp('Midtown', 'Rockefeller Center', -40, -3910, Math.PI / 2, null, 'Channel Gardens');
  tp('Up high', 'Top of the Rock', -180, -3916.3, 0, 259.3, '30 Rockefeller Plaza, 259 m');

  // ---------------- St. Patrick's Cathedral ----------------
  const sp = 0xdcd6c9;
  L([T(38, -4003, 104, -3976, 0, 30)], 'civic', sp, 0, 50);
  L([T(78, -4014, 94, -3965, 0, 30)], 'civic', sp, 0, 51);
  L([T(22, -4013, 38, -3999, 0, 56)], 'civic', sp, 16, 52); L([T(22, -3980, 38, -3966, 0, 56)], 'civic', sp, 16, 52);
  L([T(22, -3999, 38, -3980, 0, 40)], 'civic', sp, 0, 53);
  gable('dark', 0x6f747a, 38, 104, -3989.5, 27, 30, 12, 'x');
  gable('dark', 0x6f747a, 78, 94, -3989.5, 49, 30, 12, 'z', 86);
  gable('stone', sp, 22, 38, -3989.5, 19, 40, 8, 'x');
  for (const tz of [-4006, -3973]) {
    vc('stone', new THREE.ConeGeometry(7.6, 46, 8), sp, 30, 79, tz);
    for (const [dx, dz] of [[-7, -6], [7, -6], [-7, 6], [7, 6]]) vc('stone', new THREE.ConeGeometry(1.0, 9, 6), sp, 30 + dx, 60, tz + dz);
  }
  tp('Midtown', "St. Patrick's Cathedral", -10, -3990, -Math.PI / 2, null, '5th Av & 50th St');

  // ---------------- New York Public Library ----------------
  L([T(-125, -3290, -28, -3182, 0, 24)], 'civic', 0xe3ddcf, 0, 55);
  L([T(-36, -3252, -26, -3220, 0, 30)], 'civic', 0xe8e2d4, 32, 56);
  for (let i = 0; i < 6; i++) vc('stone', CYL12, 0xece6d8, -24.5, 12, -3248 + i * 5.6, 0, 0, 0, 0.75, 22, 0.75);
  addGround(rectPoly(-28, -3270, -20.5, -3202), 6, 0.45, { side: 0.3 }); addSolid(rectPoly(-28, -3270, -20.5, -3202), -1, 0.45, 'p');
  for (const lz of [-3262, -3210]) { vc('stone', BOX, 0xd9d2c2, -22, 1.4, lz, 0, 0, 0, 2.6, 1.6, 1.4); vc('stone', BOX, 0xd9d2c2, -21, 2.6, lz, 0, 0, 0, 1.4, 1.2, 1.1); }
  tp('Midtown', 'Bryant Park & Library', -200, -3240, -Math.PI / 2, null, '5th Av & 42nd St');

  // ---------------- Flatiron Building ----------------
  const tri = flatironPoly();
  if (tri) {
    L([{ poly: tri, y0: 0, y1: 87 }], 'masonry', 0xdcc8a6, 4, 60);
    tp('Downtown', 'Flatiron Building', 25, -1835, Math.PI, null, '5th Av, Broadway & 23rd St');
  }

  // ---------------- Times Square ----------------
  const ots = oneTimesSquarePoly();
  if (ots) {
    L([{ poly: ots, y0: 0, y1: 111 }], 'plain', 0x4a4d50, 32, 70);
    const b = polyBounds(ots);
    for (let i = 0; i < ots.length; i++) {
      const a = ots[i], c = ots[(i + 1) % ots.length];
      const len = Math.hypot(c[0] - a[0], c[1] - a[1]); if (len < 6) continue;
      const nx = (c[1] - a[1]) / len, nz = -(c[0] - a[0]) / len;
      const sg = polyArea(ots) >= 0 ? 1 : -1;
      for (let y = 8; y < 100; y += rr(14, 20)) {
        const h = rr(9, 15);
        BILLBOARDS.push({ x: (a[0] + c[0]) / 2 + nx * sg * 0.5, y: y + h / 2, z: (a[1] + c[1]) / 2 + nz * sg * 0.5, w: len - 1, h, rot: Math.atan2(nx * sg, nz * sg), ad: ri(0, 15) });
      }
    }
  }
  const tk = { x: -537, z0: -3702, z1: -3672 };
  addGround(rectPoly(-552, -3715, -522, -3640), 7, 0.06, {});
  for (let i = 0; i < 12; i++) {
    const z0 = lerp(tk.z1, tk.z0, i / 12), z1 = lerp(tk.z1, tk.z0, (i + 1) / 12), h = (i + 1) * 0.42;
    TKTS.push(part(BOX, 0xd81e1e, tk.x, h / 2, (z0 + z1) / 2, 0, 0, 0, 16, h, Math.abs(z1 - z0)));
  }
  addSolid(rectPoly(tk.x - 8, tk.z0, tk.x + 8, tk.z1), 0, 5.1, 'terrain', (x, z) => 0.42 * Math.ceil(clamp((tk.z1 - z) / (tk.z1 - tk.z0), 0, 1) * 12));
  tp('Midtown', 'Times Square', -520, -3600, 0, null, 'Broadway & 7th Av');

  // ---------------- Columbus Circle & Billionaires' Row ----------------
  L([T(-995, -4641, -822, -4592, 0, 28)], 'glass', 0x5d6f7a, 4, 80);
  L([T(-990, -4636, -905, -4597, 28, 229)], 'glass', 0x6b8090, 0, 81);
  L([T(-995, -4725, -822, -4682, 0, 28)], 'glass', 0x5d6f7a, 4, 80);
  L([T(-990, -4722, -905, -4685, 28, 229)], 'glass', 0x6b8090, 0, 81);
  L([T(-720, -4566, -680, -4524, 0, 95), T(-718, -4564, -682, -4526, 95, 300), T(-716, -4562, -684, -4528, 300, 472)], 'glass', 0x7c8f99, 16, 82);
  L([T(-470, -4568, -430, -4524, 0, 250), T(-470, -4568, -436, -4530, 250, 285), T(-470, -4568, -442, -4536, 285, 306)], 'glass', 0x4e6c8c, 0, 83);
  L([T(-630, -4640, -590, -4600, 0, 200), T(-626, -4636, -594, -4604, 200, 260), T(-622, -4632, -598, -4608, 260, 290)], 'masonry', 0xd4c8ae, 16, 84);
  L([T(-400, -4483, -382, -4438, 0, 280), T(-400, -4483, -382, -4446, 280, 330), T(-400, -4483, -382, -4455, 330, 380), T(-400, -4483, -382, -4465, 380, 420), T(-400, -4483, -382, -4474, 420, 435)], 'deco', 0xb9906c, 16, 85);
  L([T(201, -4475, 229.5, -4446.5, 0, 426)], 'grid', 0xe6e3dc, 0, 86);
  tp('Midtown', 'Columbus Circle', -740, -4640, lookYaw(-740, -4640, -900, -4700), null, 'Broadway & 59th St');

  // ---------------- United Nations ----------------
  const un = SUPER.find((s) => s.kind === 'un');
  addGround(rectPoly(un.x0, un.z0, un.x1, un.z1), 6, 0.15, { side: 0.15 }); addSolid(rectPoly(un.x0, un.z0, un.x1, un.z1), -1, 0.15, 'p');
  addGround(rectPoly(un.x0 + 15, un.z0 + 10, un.x1 - 10, -3760), 4, 0.25, { side: 0.1 });
  L([T(1015, -3610, 1037, -3522, 0, 154)], 'glass', 0x4f7d78, 0, 90);
  L([T(1015, -3613, 1037, -3610, 0, 154)], 'civic', 0xe6e2d8, 32, 91); L([T(1015, -3522, 1037, -3519, 0, 154)], 'civic', 0xe6e2d8, 32, 91);
  L([T(960, -3745, 1060, -3650, 0, 26)], 'civic', 0xe3ddd0, 0, 92);
  vc('stone', new THREE.SphereGeometry(10, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0xd9d4c8, 1010, 26, -3697);
  L([T(1050, -3640, 1105, -3470, 0, 14)], 'glass', 0x3d4a50, 0, 93);
  for (let z = -3745; z < -3400; z += 4.6) addProp('flag', 906, z, 0, ri(0, 30));
  for (let i = 0; i < 40; i++) addTree(rr(925, 1105), rr(-3460, -3345), 0.15, 'park');
  tp('Midtown', 'United Nations', 880, -3560, -Math.PI / 2, null, '1st Av & 44th St');

  // ---------------- Hudson Yards & the Vessel ----------------
  const hy = SUPER.find((s) => s.kind === 'hy');
  addGround(rectPoly(hy.x0, hy.z0, hy.x1, hy.z1), 10, 0.15, { side: 0.15 }); addSolid(rectPoly(hy.x0, hy.z0, hy.x1, hy.z1), -1, 0.15, 'p');
  addGround(rectPoly(-1480, hy.z0 + 5, hy.x1, hy.z1 - 5), 6, 0.25, { side: 0.1 });
  L([T(-1340, -2665, -1282, -2610, 0, 40)], 'glass', 0x8ea4ad, 4, 100);
  L([T(-1336, -2660, -1286, -2614, 40, 300), T(-1333, -2656, -1289, -2618, 300, 387)], 'glass', 0x8ea4ad, 0, 100);
  const edge = [[-1336, -2652], [-1336, -2622], [-1362, -2637]];
  pushPiece(edge, 333.5, 335, 0, 0x5a6670, 6, 2, 32); pushPiece(edge, 335, 335, 0, 0x5a6670, 6, 2, 1);
  addSolid(edge, 333.5, 335);
  for (let i = 0; i < 3; i++) { const a = edge[i], b = edge[(i + 1) % 3]; if (i === 2) continue; const p = orientedRect((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (b[0] - a[0]) / Math.hypot(b[0] - a[0], b[1] - a[1]), (b[1] - a[1]) / Math.hypot(b[0] - a[0], b[1] - a[1]), Math.hypot(b[0] - a[0], b[1] - a[1]) / 2, 0.2); addSolid(p, 335, 336.4); }
  GLASS_RAILS.push(edge.map((p) => [p[0], 335, p[1]]));
  L([T(-1340, -2450, -1288, -2392, 0, 268)], 'glass', 0x99abb3, 0, 101);
  L([T(-1335, -2600, -1288, -2460, 0, 36)], 'glass', 0x7d8d94, 4, 102);
  L([T(-1470, -2665, -1420, -2625, 0, 308)], 'glass', 0xa9aea8, 0, 103);
  L([T(-1470, -2440, -1425, -2395, 0, 285)], 'glass', 0x8a9aa0, 0, 104);
  L([T(-1420, -2402, -1352, -2381, 0, 36)], 'plain', 0xdadcd8, 32, 105);
  VESSEL.push([-1395, -2545]);
  for (let i = 0; i < 26; i++) addTree(rr(-1475, -1345), rr(-2600, -2410), 0.25, 'street');
  tp('Midtown', 'Hudson Yards & the Vessel', -1395, -2500, 0, null, '11th Av & 33rd St');
  tp('Up high', 'Edge at Hudson Yards', -1350, -2637, -Math.PI / 2, 335.2, 'Glass-floored sky deck, 335 m');

  // ---------------- Madison Square Garden ----------------
  const msg = SUPER.find((s) => s.kind === 'msg');
  addGround(rectPoly(msg.x0, msg.z0, msg.x1, msg.z1), 6, 0.15, { side: 0.15 }); addSolid(rectPoly(msg.x0, msg.z0, msg.x1, msg.z1), -1, 0.15, 'p');
  L([{ poly: circlePoly(-670, -2528, 64, 32), y0: 0, y1: 46 }], 'postwar', 0xb3aea4, 32, 110);
  L([{ poly: circlePoly(-670, -2528, 66, 32), y0: 34, y1: 40 }], 'glass', 0x3a4650, 0, 111);
  L([T(-580, -2590, -546, -2466, 0, 130)], 'glass', 0x44525c, 4, 112);

  // ---------------- Lincoln Center ----------------
  const lc = SUPER.find((s) => s.kind === 'lincoln');
  addGround(rectPoly(lc.x0, lc.z0, lc.x1, lc.z1), 6, 0.15, { side: 0.15 }); addSolid(rectPoly(lc.x0, lc.z0, lc.x1, lc.z1), -1, 0.15, 'p');
  L([T(-1180, -5135, -1085, -5072, 0, 46)], 'civic', 0xe8e2d2, 0, 120);
  L([T(-1078, -5110, -1035, -4990, 0, 30)], 'civic', 0xddd7c8, 0, 121);
  L([T(-1236, -5110, -1188, -4990, 0, 30)], 'civic', 0xddd7c8, 0, 122);
  L([T(-1236, -5200, -1040, -5150, 0, 34)], 'masonry', 0x9c8f80, 4, 123);
  fountain(-1132, -5032, 12);
  tp('Uptown', 'Lincoln Center', -1132, -4980, 0, null, 'Columbus Av & 64th St');

  // ---------------- Stuyvesant Town ----------------
  const st = SUPER.find((s) => s.kind === 'stuytown');
  addGround(rectPoly(st.x0, st.z0, st.x1, st.z1), 4, 0.2, { side: 0.2 }); addSolid(rectPoly(st.x0, st.z0, st.x1, st.z1), -1, 0.2, 'p');
  for (let x = st.x0 + 40; x < st.x1 - 30; x += 78) for (let z = st.z0 + 40; z < st.z1 - 30; z += 82) {
    if (Math.hypot((x - 1150) / 1.4, z + 1350) < 70) continue;
    const H = 38 + ri(0, 1) * 3;
    L([T(x - 26, z - 6.5, x + 26, z + 6.5, 0, H)], 'brown', 0x8d4a38, 0, ri(0, 255));
    L([T(x - 6.5, z - 18, x + 6.5, z + 18, 0, H)], 'brown', 0x8d4a38, 0, ri(0, 255));
  }
  for (let i = 0; i < 220; i++) { const x = rr(st.x0 + 8, st.x1 - 8), z = rr(st.z0 + 8, st.z1 - 8); addTree(x, z, 0.2, 'park'); }
  fountain(1150, -1350, 10);

  // ---------------- World Trade Center ----------------
  wtc();

  // ---------------- Wall Street ----------------
  L([T(-60, 2225, 40, 2290, 0, 32)], 'civic', 0xe2dccd, 0, 130);
  for (let i = 0; i < 6; i++) vc('stone', CYL12, 0xece6d8, 43, 15, 2236 + i * 8.6, 0, 0, 0, 1.3, 26, 1.3);
  gable('stone', 0xe6e0d2, 41, 46, 2257.5, 56, 28, 5, 'z');
  L([T(-50, 2130, 20, 2195, 0, 22)], 'civic', 0xe0dacb, 0, 131);
  for (let i = 0; i < 6; i++) vc('stone', CYL12, 0xe9e3d5, -15 + i * 5.5, 10.5, 2197.5, 0, 0, 0, 0.9, 17, 0.9);
  vc('copper', BOX, 0x31503f, -1, 2.8, 2203, 0, 0, 0, 2, 3.5, 2);
  vc('copper', CYL8, 0x31503f, -1, 6.2, 2203, 0, 0, 0, 0.6, 3.4, 0.6);
  L([T(-195, 2185, -165, 2240, 0, 20)], 'civic', 0x5d524b, 0, 132);
  L([T(-190, 2170, -170, 2186, 0, 48)], 'civic', 0x5d524b, 0, 133);
  vc('dark', new THREE.ConeGeometry(8, 38, 8), 0x4f4640, -180, 67, 2178);
  gable('dark', 0x3d3a38, -195, -165, 2212.5, 30, 20, 8, 'z');
  for (let i = 0; i < 14; i++) addTree(rr(-205, -160), rr(2150, 2160) + (i % 2) * 90, 0.15, 'park');
  // Charging Bull at Bowling Green
  const bx = -206, bz = 2612;
  vc('copper', BOX, 0x5a4330, bx, 1.45, bz, 0, 0.3, 0, 1.4, 1.3, 4.0);
  vc('copper', BOX, 0x5a4330, bx + 0.6, 1.25, bz - 2.0, 0.5, 0.3, 0, 1.1, 1.0, 1.0);
  vc('copper', BOX, 0x4b3828, bx + 0.9, 1.9, bz - 2.6, 0, 0.3, 0.9, 1.8, 0.12, 0.14);
  for (const [dx, dz] of [[0.5, 1.5], [-0.5, 1.5], [0.5, -1.4], [-0.5, -1.4]]) vc('copper', BOX, 0x4b3828, bx + dx, 0.4, bz + dz, 0, 0.3, 0, 0.25, 0.8, 0.25);
  tp('Downtown', 'Wall Street', 30, 2200, lookYaw(30, 2200, -10, 2257), null, 'NYSE & Federal Hall');
  tp('Downtown', 'Charging Bull', -200, 2595, Math.PI, null, 'Bowling Green');

  // ---------------- Guggenheim ----------------
  const gx = 62, gz = -6992;
  L([T(25, -7015, 108, -6967, 0, 4)], 'plain', 0xefede6, 32, 140);
  for (let k = 0; k < 4; k++) {
    const y0 = 4 + k * 6.6, r = 20 + k * 2.4;
    L([{ poly: circlePoly(gx, gz, r - 1.4, 28), y0, y1: y0 + 1.1 }], 'plain', 0x2a2c2e, 32, 141);
    L([{ poly: circlePoly(gx, gz, r, 28), y0: y0 + 1.1, y1: y0 + 6.6 }], 'plain', 0xf1efe8, 32, 142);
  }
  L([T(84, -7015, 108, -6972, 0, 42)], 'masonry', 0xd8d4c8, 0, 143);
  tp('Uptown', 'Guggenheim Museum', -10, -6992, -Math.PI / 2, null, '5th Av & 89th St');

  // ---------------- Apollo Theater ----------------
  BILLBOARDS.push({ x: -650, y: 9, z: zN(125) - 15 - 4.6 + 0.4 - 1.2, w: 3, h: 11, rot: 0, ad: 17 });
  tp('Uptown', 'Apollo Theater', -650, zN(125) + 6, 0, null, '125th St, Harlem');

  // ---------------- The Dakota ----------------
  L([T(-995, -5771, -805, -5705, 0, 36)], 'masonry', 0xb59a6a, 4, 150);
  gable('dark', 0x4f5552, -995, -805, -5738, 66, 36, 9, 'x');
  for (const [dx, dz] of [[-995, -5771], [-805, -5771], [-995, -5705], [-805, -5705]]) vc('dark', new THREE.ConeGeometry(4, 10, 4), 0x4f5552, dx + Math.sign(-900 - dx) * 4, 41, dz + Math.sign(-5738 - dz) * 4, 0, Math.PI / 4, 0);

  // ---------------- Washington Heights / Morningside notes ----------------
  tp('Uptown', 'Central Park — Bethesda Terrace', -404, zN(71.2), 0, null, 'Mid-park at 72nd St');
  tp('Uptown', 'Central Park — the Reservoir', -375, zN(85.6), 0, null, 'Running track, 86th St');
  tp('Uptown', 'Central Park — Sheep Meadow', -530, zN(66.2), 0, null, 'Lawn at 66th St');
  tp('Uptown', 'Belvedere Castle', -340, zN(79.9), lookYaw(-340, zN(79.9), -382, zN(79.15)), null, 'Vista Rock, 79th St');
  tp('Uptown', 'Harlem — 125th Street', -280, zN(125) + 6, -Math.PI / 2, null, 'Lenox Av & 125th St');
  tp('Uptown', 'Washington Heights', -1000, zN(181), Math.PI, null, 'Broadway & 181st St');
  tp('Uptown', 'Inwood Hill Park', -1100, zN(212), Math.PI * 0.5, null, 'The last forest in Manhattan');
  tp('Downtown', 'Washington Square Park', -32, -425, 0, null, 'The Arch at the foot of 5th Av');
  tp('Downtown', 'Union Square', 190, zN(15.5), Math.PI, null, '14th St & Broadway');
  tp('Downtown', 'SoHo', -30, 240, Math.PI, null, 'Cast-iron lofts on Greene St');
  tp('Downtown', 'Chinatown', 420, 600, -Math.PI / 2, null, 'Mott St & Canal St');
  tp('Downtown', 'Greenwich Village', -560, -560, Math.PI, null, 'West Village brownstones');
  tp('Downtown', 'High Line', -1400, -1400, 0, 9.1, 'Elevated park, Chelsea');
  tp('Downtown', 'Battery Park', -520, 2900, lookYaw(-520, 2900, -890, 5335), null, 'Castle Clinton, harbor views');
  tp('Midtown', 'Herald Square', -300, -2700, 0, null, 'Broadway & 34th St');
}

function oneTimesSquarePoly() {
  const r = rectPoly(-504.4, zN(43) + 9 + 4.6, -400, zN(42) - 15 - 4.6);
  const { seg: s } = broadwayDist(-480, zN(42.5));
  const nx = -s.dz, nz = s.dx, off = BW_HALF + 4.6;
  const test = (-504 - s.ax) * nx + (zN(42.5) - s.az) * nz;
  const sg = test > 0 ? 1 : -1;
  const p = clipHalf(r, s.ax + nx * off * sg, s.az + nz * off * sg, nx * sg, nz * sg);
  return p.length >= 3 && Math.abs(polyArea(p)) > 60 ? p : null;
}

// triangular prism roof
function gable(kind, hex, a0, a1, c, w, y, h, axis, len) {
  const g = new THREE.BufferGeometry();
  let P;
  if (axis === 'x') P = [[a0, y, c - w / 2], [a1, y, c - w / 2], [a1, y + h, c], [a0, y + h, c], [a0, y, c + w / 2], [a1, y, c + w / 2]];
  else { const cc = (a0 + a1) / 2, ww = a1 - a0, l2 = (len || w) / 2; P = [[cc - ww / 2, y, c - l2], [cc - ww / 2, y, c + l2], [cc, y + h, c + l2], [cc, y + h, c - l2], [cc + ww / 2, y, c - l2], [cc + ww / 2, y, c + l2]]; }
  const tris = axis === 'x' ? [[0, 2, 1], [0, 3, 2], [4, 5, 2], [4, 2, 3], [0, 4, 3], [1, 2, 5]] : [[0, 2, 1], [0, 3, 2], [4, 5, 2], [4, 2, 3], [0, 3, 4], [1, 5, 2]];
  const pos = [];
  for (const t of tris) for (const i of t) pos.push(...P[i]);
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  // make it double-sided-safe by adding reversed copy
  const g2 = g.clone(); const p2 = g2.attributes.position.array;
  for (let i = 0; i < p2.length; i += 9) { for (let k = 0; k < 3; k++) { const t = p2[i + 3 + k]; p2[i + 3 + k] = p2[i + 6 + k]; p2[i + 6 + k] = t; } }
  g2.computeVertexNormals();
  VC[kind].push(colorize(mergeGeometries([g, g2]), hex));
}

const CHRYSLER = [], TKTS = [], VESSEL = [], GLASS_RAILS = [], BILLBOARDS = [], WATERFALLS = [];
function rectMinus(R, holes) {
  const xs = [R[0], R[2]], zs = [R[1], R[3]];
  for (const h of holes) { xs.push(h[0], h[2]); zs.push(h[1], h[3]); }
  xs.sort((a, b) => a - b); zs.sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < zs.length - 1; j++) {
    const x0 = xs[i], x1 = xs[i + 1], z0 = zs[j], z1 = zs[j + 1];
    if (x1 - x0 < 0.01 || z1 - z0 < 0.01) continue;
    const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
    if (holes.some((h) => mx > h[0] && mx < h[2] && mz > h[1] && mz < h[3])) continue;
    out.push([x0, z0, x1, z1]);
  }
  return out;
}
function wtc() {
  const S = SUPER.find((s) => s.kind === 'wtc');
  const pools = [[-589, 1671, -531, 1729], [-574, 1806, -516, 1864]];
  for (const r of rectMinus([S.x0, S.z0, S.x1, S.z1], pools)) { addGround(rectPoly(...r), 6, 0.2, { side: 0.2 }); addSolid(rectPoly(...r), -1, 0.2, 'p'); }
  for (const p of pools) {
    const [x0, z0, x1, z1] = p;
    // bronze parapets
    parapet([x0 - 0.8, z0 - 0.8, x1 + 0.8, z1 + 0.8], 0.2, 0.95, 0x2b2622);
    // waterfall walls and pool
    WATERFALLS.push(p);
    const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, -5.6, (z0 + z1) / 2);
    extraMeshes.push({ geo: g, mat: 'water' });
    vc('dark', BOX, 0x050505, (x0 + x1) / 2, -5.5, (z0 + z1) / 2, 0, 0, 0, 16, 0.1, 16);
    mapPoly(rectPoly(...p), '#2d3b44');
  }
  for (let x = S.x0 + 12; x < S.x1 - 8; x += 13) for (let z = S.z0 + 10; z < S.z1 - 8; z += 13) {
    if (pools.some((h) => x > h[0] - 6 && x < h[2] + 6 && z > h[1] - 6 && z < h[3] + 6)) continue;
    if (x < -600 && z < 1665) continue;
    if (x > -440) continue;
    addTree(x, z, 0.2, 'street');
  }
  // One World Trade Center
  const cx = -640, cz = 1625;
  L([T(cx - 30.5, cz - 30.5, cx + 30.5, cz + 30.5, 0, 57)], 'glass', 0x9fb3bd, 4, 160);
  const B = [], Tt = [];
  for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + i * Math.PI / 2; B.push([cx + Math.cos(a) * 43.13, 57, cz + Math.sin(a) * 43.13]); }
  for (let i = 0; i < 4; i++) { const a = Math.PI / 2 + i * Math.PI / 2; Tt.push([cx + Math.cos(a) * 30.4, 417, cz + Math.sin(a) * 30.4]); }
  const faces = [];
  const orient = (f) => {
    const [a, b, c] = f; const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy, nz = ux * vy - uy * vx;
    const mx = (a[0] + b[0] + c[0]) / 3 - cx, mz = (a[2] + b[2] + c[2]) / 3 - cz;
    return nx * mx + nz * mz > 0 ? f : [a, c, b];
  };
  for (let i = 0; i < 4; i++) {
    faces.push(orient([B[i], B[(i + 1) % 4], Tt[i]]));
    faces.push(orient([Tt[i], B[(i + 1) % 4], Tt[(i + 1) % 4]]));
  }
  custom(faces, 'glass', 0xa9bcc6, 0, 0, 161);
  pushPiece(Tt.map((p) => [p[0], p[2]]), 417, 417, 0, 0x9aa7ad, 0, 161, 1);
  pushPiece(Tt.map((p) => [p[0], p[2]]), 417, 421, 0, 0xc9cfd2, 6, 161, 32);
  addSolid([[cx - 30.5, cz - 30.5], [cx + 30.5, cz - 30.5], [cx + 30.5, cz + 30.5], [cx - 30.5, cz + 30.5]], 0, 417);
  vc('metal', CYL12, 0xd5d9dc, cx, 432, cz, 0, 0, 0, 3.2, 22, 3.2);
  vc('metal', CYL8, 0xd5d9dc, cx, 487, cz, 0, 0, 0, 1.0, 108, 1.0);
  for (let y = 450; y < 535; y += 12) vc('metal', CYL12, 0xc5c9cc, cx, y, cz, 0, 0, 0, 2.2, 0.6, 2.2);
  vc('glow', SPH, 0xffffff, cx, 541.5, cz, 0, 0, 0, 1.2, 1.2, 1.2);
  // the Oculus
  for (let i = 0; i <= 34; i++) {
    const t = i / 34, x = lerp(-412, -308, t);
    const hgt = 22 + 14 * Math.pow(Math.abs(t - 0.5) * 2, 1.6);
    for (const s of [-1, 1]) {
      const ang = Math.atan2(hgt - 4, 26);
      vc('stone', BOX, 0xf3f3ef, x, 4 + (hgt - 4) / 2, 1735 + s * 13, s * (Math.PI / 2 - ang), 0, 0, 0.55, Math.hypot(26, hgt - 4), 0.7);
    }
  }
  vc('stone', BOX, 0xf3f3ef, -360, 3.5, 1735, 0, 0, 0, 106, 1.2, 2.2);
  L([T(-330, 1785, -270, 1845, 0, 329)], 'glass', 0x50606a, 0, 162);
  L([T(-330, 1880, -265, 1945, 0, 298)], 'glass', 0xa2b6c2, 0, 163);
  L([T(-615, 1490, -550, 1548, 0, 226)], 'glass', 0x9fb3be, 4, 164);
  tp('Downtown', 'One World Trade Center', -640, 1690, 0, null, '9/11 Memorial plaza');
}

// =====================================================================
//  The High Line
// =====================================================================
function genHighLine() {
  const path = [[-1395, zN(12.4)], [-1395, zN(30)], [-1720, zN(30)], [-1720, zN(34)]];
  const y = 9.0, w = 11;
  for (let i = 0; i < path.length - 1; i++) {
    const [ax, az] = path[i], [bx, bz] = path[i + 1];
    const len = Math.hypot(bx - ax, bz - az), dx = (bx - ax) / len, dz = (bz - az) / len;
    const n = Math.ceil(len / 40);
    for (let k = 0; k < n; k++) {
      const s0 = k * len / n, s1 = (k + 1) * len / n;
      const mx = ax + dx * (s0 + s1) / 2, mz = az + dz * (s0 + s1) / 2;
      const poly = orientedRect(mx, mz, dx, dz, (s1 - s0) / 2 + (k === n - 1 ? w / 2 : 0), w / 2);
      pushPiece(poly, y - 1.6, y, y - 1.6, 0x2c3330, 6, 9, 32);
      addSolid(poly, y - 1.2, y, 'terrain', () => y);
      // planting beds and the concrete plank walk
      addGround(orientedRect(mx, mz, dx, dz, (s1 - s0) / 2, w / 2 - 0.3), 4, y + 0.02, {});
      addGround(orientedRect(mx - dz * 1.2 * Math.sin(s0 * 0.02), mz + dx * 1.2 * Math.sin(s0 * 0.02), dx, dz, (s1 - s0) / 2, 2.2), 11, y + 0.05, {});
      for (const sd of [-1, 1]) {
        const rp = orientedRect(mx + -dz * sd * (w / 2 - 0.1), mz + dx * sd * (w / 2 - 0.1), dx, dz, (s1 - s0) / 2, 0.1);
        pushPiece(rp, y, y + 1.1, y - 1.6, 0x1d2120, 6, 9, 32);
        addSolid(rp, y - 0.2, y + 1.1);
      }
      // steel columns down to the street
      for (const sd of [-1, 1]) {
        const cxp = mx + -dz * sd * (w / 2 - 1), czp = mz + dx * sd * (w / 2 - 1);
        const cp = rectPoly(cxp - 0.5, czp - 0.5, cxp + 0.5, czp + 0.5);
        pushPiece(cp, 0, y - 1.6, 0, 0x2c3330, 6, 9, 32); addSolid(cp, 0, y - 1.6);
      }
      for (let t = 0; t < 4; t++) { const s = lerp(s0, s1, rand()); const o = (rand() - 0.5) * (w - 3); const px = ax + dx * s - dz * o, pz = az + dz * s + dx * o; if (Math.abs(o) > 2.8) addTree(px, pz, y, 'street'); }
      for (let t = 0; t < 2; t++) { const s = lerp(s0, s1, t / 2); addProp('parklamp', ax + dx * s + dz * 3, az + dz * s - dx * 3, 0, y); }
    }
    mapLine(path[i], path[i + 1], '#6c8a55', 2.5);
    reserve(orientedRect((ax + bx) / 2, (az + bz) / 2, dx, dz, len / 2 + 6, w / 2 + 2), 'High Line');
  }
  // stairs up from the street at Gansevoort, 14th, 23rd, 30th
  for (const z of [zN(12.6), zN(14.4), zN(23.4), zN(29.6)]) {
    const x0 = -1395 + w / 2 + 0.1, len = 18;
    addSolid(rectPoly(x0, z - 1.4, x0 + len, z + 1.4), -1, y, 'terrain', (x) => clamp((x0 + len - x) / len, 0, 1) * y);
    for (let s = 0; s < 18; s++) { const h = (18 - s) / 18 * y; vc('stone', BOX, 0x6e6b66, x0 + s + 0.5, h / 2, z, 0, 0, 0, 1.0, h, 2.8); }
  }
}
function mapLine(a, b, col, w) {
  mctx.strokeStyle = col; mctx.lineWidth = w; mctx.beginPath();
  mctx.moveTo((a[0] - MAP.x0) * MAP.s, (a[1] - MAP.z0) * MAP.s); mctx.lineTo((b[0] - MAP.x0) * MAP.s, (b[1] - MAP.z0) * MAP.s); mctx.stroke();
}

// =====================================================================
//  Statue of Liberty
// =====================================================================
function genLiberty() {
  const I = ISLANDS[0];
  const c = [-890, 5335];
  const star = [];
  for (let i = 0; i < 22; i++) { const a = i / 22 * Math.PI * 2, r = i % 2 ? 36 : 50; star.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]); }
  // star-shaped Fort Wood (non convex: build as fan of triangles)
  for (let i = 0; i < 22; i++) {
    const p = [[c[0], c[1]], star[i], star[(i + 1) % 22]];
    pushPiece(p, 0, 9, 0, 0x9c9580, 6, 5, 32); pushPiece(p, 9, 9, 0, 0x8f8a7a, 6, 5, 1);
  }
  addSolid(circlePoly(c[0], c[1], 40, 22), 0, 9);
  L([T(c[0] - 14, c[1] - 14, c[0] + 14, c[1] + 14, 9, 22), T(c[0] - 12, c[1] - 12, c[0] + 12, c[1] + 12, 22, 40), T(c[0] - 10.5, c[1] - 10.5, c[0] + 10.5, c[1] + 10.5, 40, 47)], 'civic', 0xbcb19b, 0, 170);
  const y0 = 47, X = c[0], Z = c[1];
  const robe = new THREE.LatheGeometry([new THREE.Vector2(5.2, 0), new THREE.Vector2(5.0, 4), new THREE.Vector2(4.2, 12), new THREE.Vector2(3.9, 20), new THREE.Vector2(4.3, 26), new THREE.Vector2(3.2, 29), new THREE.Vector2(1.4, 30.5), new THREE.Vector2(0.9, 31.5)], 14);
  vc('copper', robe, 0x6fa592, X, y0, Z);
  vc('copper', SPH, 0x73aa96, X + 0.5, y0 + 33.4, Z, 0, 0, 0, 2.2, 2.6, 2.2);
  for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.42; vc('copper', new THREE.ConeGeometry(0.35, 3.2, 4), 0x73aa96, X + 0.5 + Math.cos(a) * 2.4, y0 + 35.6, Z + Math.sin(a) * 2.4 * 0, Math.sin(a) * 0, 0, -a - Math.PI / 2, 1, 1, 1); }
  vc('copper', CYL8, 0x6fa592, X + 0.6, y0 + 36.5, Z + 3.0, 0.15, 0, 0, 1.0, 13, 1.0);
  vc('copper', CYL8, 0x6fa592, X + 0.6, y0 + 43.5, Z + 3.9, 0, 0, 0, 0.75, 2.4, 0.75);
  vc('gold', new THREE.ConeGeometry(1.05, 2.0, 10), 0xd8a640, X + 0.6, y0 + 45.6, Z + 3.9, Math.PI, 0, 0);
  vc('glow', new THREE.ConeGeometry(0.75, 2.2, 8), 0xffc060, X + 0.6, y0 + 47.6, Z + 3.9);
  vc('copper', BOX, 0x6a9f8c, X + 1.0, y0 + 24, Z - 4.4, 0.25, 0, 0, 1.0, 6.5, 4.0);
  tp('Harbor', 'Statue of Liberty', -840, 5250, lookYaw(-840, 5250, -890, 5335), null, 'Liberty Island');
}
