// =====================================================================
//  World assembly: chunk meshes, instanced props, landmark meshes
// =====================================================================
const QUALITY = { level: 2, shadows: true, bloom: true, peds: 420, cars: 230, propDist: 1, pr: 1.5, treeK: 1 };
const MATS = {};
const CHUNK_LIST = [];
const LATTICE_TEX = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); g.clearRect(0, 0, 128, 128); g.strokeStyle = '#fff'; g.lineWidth = 9;
  g.strokeRect(4, 4, 120, 120); g.lineWidth = 6; g.beginPath(); g.moveTo(0, 0); g.lineTo(128, 128); g.moveTo(128, 0); g.lineTo(0, 128); g.stroke();
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
})();

function makeMaterials() {
  MATS.bld = makeBuildingMaterial();
  MATS.ground = makeGroundMaterial();
  MATS.water = makeWaterMaterial();
  MATS.vc = makeVCMaterial();
  MATS.leaf = makeVCMaterial({ roughness: 0.92 });
  MATS.leaf.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLW;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvLW = (modelMatrix * instanceMatrix * vec4(transformed,1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vLW;\n${GLSL_COMMON.replace(/uniform[^;]*;/g, '')}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float lf = vn(vLW.xz*2.3 + vLW.y*1.7) * .6 + vn(vLW.xy*5.1 + vLW.z*3.3) * .4;
        diffuseColor.rgb *= .62 + .62 * lf;`);
  };
  MATS.leaf.customProgramCacheKey = () => 'leaf1';
  MATS.vcMetal = makeVCMaterial({ metalness: 0.75, roughness: 0.32 });
  MATS.vcCopper = makeVCMaterial({ metalness: 0.25, roughness: 0.55 });
  MATS.vcGold = makeVCMaterial({ metalness: 1.0, roughness: 0.28 });
  MATS.vcDark = makeVCMaterial({ roughness: 0.7, side: THREE.DoubleSide });
  MATS.glow = new THREE.MeshBasicMaterial({ vertexColors: true });
  MATS.seawall = new THREE.MeshStandardMaterial({ color: 0x5e5a52, roughness: 0.95 });
  MATS.lattice = new THREE.MeshStandardMaterial({ vertexColors: true, alphaMap: LATTICE_TEX, alphaTest: 0.5, side: THREE.DoubleSide, metalness: 0.5, roughness: 0.5 });
  MATS.lampGlow = makeNightGlow(0xfff0d0, 0.15, 5);
  MATS.kioskGlow = makeNightGlow(0x8fc4ff, 0.9, 2.2);
  MATS.subwayGlow = makeNightGlow(0x3cff8c, 0.6, 3);
  MATS.parkGlow = makeNightGlow(0xfff3d8, 0.1, 4);
  MATS.signal = makeSignalMaterial();
  MATS.tkts = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0xff1010, emissiveIntensity: 0.7, roughness: 0.25, transparent: true, opacity: 0.92 });
  MATS.cable = new THREE.MeshStandardMaterial({ color: 0x4a4744, roughness: 0.6, metalness: 0.4 });
  MATS.lines = new THREE.LineBasicMaterial({ color: 0x3a3836, transparent: true, opacity: 0.85 });
  MATS.chrysler = makeChryslerMaterial();
  MATS.signs = new THREE.MeshBasicMaterial({ color: 0xffffff });
  MATS.waterfall = makeWaterfallMaterial();
  MATS.flag = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide });
  MATS.glassRail = new THREE.MeshStandardMaterial({ color: 0x9fc0cc, transparent: true, opacity: 0.25, roughness: 0.05, metalness: 0.2, side: THREE.DoubleSide });
}
function makeChryslerMaterial() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 256, 128);
  g.fillStyle = '#fff';
  for (let i = 0; i < 9; i++) { // sunburst triangle windows along an arch
    const a = Math.PI * (0.12 + 0.76 * i / 8), r0 = 40, r1 = 95, cx = 128, cy = 128;
    const w = 0.07;
    g.beginPath(); g.moveTo(cx + Math.cos(a - w) * r0, cy - Math.sin(a - w) * r0); g.lineTo(cx + Math.cos(a) * r1, cy - Math.sin(a) * r1); g.lineTo(cx + Math.cos(a + w) * r0, cy - Math.sin(a + w) * r0); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.repeat.set(4, 1);
  const m = new THREE.MeshStandardMaterial({ color: 0xd9dee2, metalness: 1.0, roughness: 0.22, emissive: 0xfff4dc, emissiveMap: t, emissiveIntensity: 0, side: THREE.DoubleSide });
  m.userData.glow = [0, 3.2];
  return m;
}
function makeWaterfallMaterial() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const g = c.getContext('2d'); g.fillStyle = '#4a5560'; g.fillRect(0, 0, 64, 256);
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(235,242,248,${0.25 + Math.random() * 0.5})`; g.fillRect(Math.random() * 64, Math.random() * 256, 1 + Math.random() * 1.5, 10 + Math.random() * 40); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.3, metalness: 0.0, emissive: 0x223038, emissiveIntensity: 0.4 });
}

// ---------------------------------------------------------------------
//  Instanced prop definitions
// ---------------------------------------------------------------------
const PROPS = {};
function defineProps() {
  const P = (name, parts, dist, xf, opts = {}) => (PROPS[name] = Object.assign({ parts, dist, xf }, opts));
  const std = (r) => ({ x: r[0], y: 0.15, z: r[1], ry: r[2], s: [1, 1, 1] });
  P('lamp', [[lampModel(), MATS.vc], [lampHeadModel(), MATS.lampGlow]], 520, std);
  P('hydrant', [[hydrantModel(), MATS.vc]], 220, std);
  P('trash', [[trashModel(), MATS.vc]], 200, std);
  P('mailbox', [[mailboxModel(), MATS.vc]], 220, std);
  P('cart', [[cartModel(), MATS.vc]], 280, std);
  P('kiosk', [[kioskModel(), MATS.vc], [kioskScreen(), MATS.kioskGlow]], 300, std);
  P('busstop', [[busstopModel(), MATS.vc]], 300, std);
  P('stoop', [[stoopModel(), MATS.vc]], 260, (r) => ({ x: r[0], y: 0.15, z: r[1], ry: r[2], s: [1, 1, r[3]] }));
  P('shed', [[shedModel(), MATS.vc]], 320, (r) => ({ x: r[0], y: 0.15, z: r[1], ry: r[2], s: [r[3], 1, 1] }));
  P('signal', [[signalModel(), MATS.vc], [signalLamps(), MATS.signal]], 520, std);
  P('subway', [[subwayModel(), MATS.vc], [subwayGlobes(), MATS.subwayGlow]], 320, std);
  P('steam', [[steamModel(), MATS.vc]], 360, (r) => ({ x: r[0], y: 0, z: r[1], ry: 0, s: [1, 1, 1] }));
  P('watertower', [[waterTowerModel(), MATS.vc]], 1500, (r) => ({ x: r[0], y: r[2], z: r[1], ry: r[0] * 0.37, s: [r[3], r[3], r[3]] }));
  P('antenna', [[antennaModel(), MATS.vcMetal]], 4000, (r) => ({ x: r[0], y: r[2], z: r[1], ry: 0, s: [1, r[3], 1] }));
  P('spire', [[spireModel(), MATS.vcMetal]], 4000, (r) => ({ x: r[0], y: r[2], z: r[1], ry: 0, s: [r[4], r[3], r[4]] }));
  P('bench', [[benchModel(), MATS.vc]], 200, (r) => ({ x: r[0], y: r[3], z: r[1], ry: r[2], s: [1, 1, 1] }));
  P('parklamp', [[parkLampModel(), MATS.vc], [parkLampGlobe(), MATS.parkGlow]], 420, (r) => ({ x: r[0], y: r[3], z: r[1], ry: 0, s: [1, 1, 1] }));
  P('fence', [[fenceModel(), MATS.vc]], 220, (r) => ({ x: r[0], y: r[4], z: r[1], ry: r[2], s: [r[3], r[5] || 1, 1] }));
  P('rock', [[colorize(new THREE.DodecahedronGeometry(1, 0), 0x6f6c66), MATS.vc]], 700, (r) => ({ x: r[0], y: r[3], z: r[1], ry: r[2], s: [r[3] * 1.3, r[3] * 0.6, r[3]] }));
  P('flag', [[merge([part(CYL6, 0xd8d8d8, 0, 4.5, 0, 0, 0, 0, 0.05, 9, 0.05)]), MATS.vcMetal], [merge([part(BOX, 0xffffff, 0, 8.2, 0.8, 0, 0, 0, 0.02, 1.0, 1.5)]), MATS.flag]], 600,
    (r) => ({ x: r[0], y: 0.15, z: r[1], ry: Math.PI / 2, s: [1, 1, 1], color: [0x3c6fd8, 0xd83c3c, 0x3cb86f, 0xf2c641, 0xffffff, 0x2a2a2a, 0xe86f2a, 0x8a3cd8][Math.floor(r[3]) % 8] }), { colorPart: 1 });
  P('tree', null, 1600, null); // special
  P('pcar', null, 420, null);  // special
}

const _M = new THREE.Matrix4(), _Q = new THREE.Quaternion(), _P = new THREE.Vector3(), _S = new THREE.Vector3(), _E = new THREE.Euler(), _C = new THREE.Color();
const TREE_GEO = {};
const AUTUMN = [0x4f6e33, 0x587436, 0x5d7a3a, 0x4a6a30, 0x66803f, 0x6b8443, 0x50703a, 0x8a8a3a, 0xa8822e, 0xb0652a, 0x8a3f2a, 0x7a8a35];
function buildChunkProps(ch, scene) {
  for (const type in ch.props) {
    const recs = ch.props[type];
    const n = recs.length / 7;
    if (!n) continue;
    const def = PROPS[type];
    if (!def) continue;
    if (type === 'tree') { buildTrees(ch, recs, n, scene); continue; }
    if (type === 'pcar') { buildParkedCars(ch, recs, n, scene); continue; }
    const meshes = def.parts.map(([g, m]) => { const im = new THREE.InstancedMesh(g, m, n); im.matrixAutoUpdate = false; return im; });
    if (def.colorPart != null) meshes[def.colorPart].instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    const blades = [];
    for (let i = 0; i < n; i++) {
      const r = recs.slice(i * 7, i * 7 + 7);
      const t = def.xf(r);
      _Q.setFromEuler(_E.set(0, t.ry, 0));
      _M.compose(_P.set(t.x, t.y, t.z), _Q, _S.set(...t.s));
      for (const im of meshes) im.setMatrixAt(i, _M);
      if (def.colorPart != null) meshes[def.colorPart].setColorAt(i, _C.setHex(t.color));
      if (type === 'signal') blades.push(r);
    }
    for (const im of meshes) {
      im.computeBoundingSphere();
      im.castShadow = QUALITY.level >= 2 && (type === 'watertower' || type === 'lamp' || type === 'signal' || type === 'shed');
      im.receiveShadow = false;
      im.userData.dist = def.dist; im.userData.cx = (ch.cx + 0.5) * CHUNK; im.userData.cz = (ch.cz + 0.5) * CHUNK;
      scene.add(im); ch.propMeshes.push(im);
    }
    if (blades.length) buildSignBlades(ch, blades, scene);
  }
}
function buildTrees(ch, recs, n, scene) {
  if (!TREE_GEO.trunk) { TREE_GEO.trunk = treeTrunk(); TREE_GEO.crown = treeCrown(true); TREE_GEO.crownLo = treeCrown(false); }
  const trunk = new THREE.InstancedMesh(TREE_GEO.trunk, MATS.vc, n);
  const crown = new THREE.InstancedMesh(TREE_GEO.crown, MATS.leaf, n);
  const crownLo = new THREE.InstancedMesh(TREE_GEO.crownLo, MATS.leaf, n);
  crown.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
  crownLo.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
  for (let i = 0; i < n; i++) {
    const x = recs[i * 7], z = recs[i * 7 + 1], ry = recs[i * 7 + 2], s = recs[i * 7 + 3], y = recs[i * 7 + 4], street = recs[i * 7 + 5], seed = recs[i * 7 + 6];
    _Q.setFromEuler(_E.set(0, ry, 0));
    _M.compose(_P.set(x, y, z), _Q, _S.set(s, s * (street ? 0.95 : 1.05), s));
    trunk.setMatrixAt(i, _M); crown.setMatrixAt(i, _M); crownLo.setMatrixAt(i, _M);
    const h = hash2(seed, Math.floor(x));
    const col = h < 0.8 ? AUTUMN[Math.floor(h / 0.8 * 7)] : AUTUMN[7 + Math.floor((h - 0.8) / 0.2 * 5)];
    _C.setHex(col).multiplyScalar(0.85 + 0.3 * hash2(seed + 7, Math.floor(z)));
    crown.setColorAt(i, _C); crownLo.setColorAt(i, _C);
  }
  for (const [im, d, lo] of [[trunk, 700, ''], [crown, 460, 'near'], [crownLo, 2600, 'far']]) {
    im.computeBoundingSphere(); im.matrixAutoUpdate = false;
    im.castShadow = QUALITY.level >= 1 && lo !== 'far'; im.receiveShadow = false;
    im.userData.dist = d; im.userData.lod = lo; im.userData.minDist = 460;
    im.userData.cx = (ch.cx + 0.5) * CHUNK; im.userData.cz = (ch.cz + 0.5) * CHUNK;
    scene.add(im); ch.propMeshes.push(im);
  }
}
const PCAR_GEO = [];
function buildParkedCars(ch, recs, n, scene) {
  if (!PCAR_GEO.length) for (let t = 0; t < 5; t++) PCAR_GEO.push(carModel(t));
  const by = [[], [], [], [], []];
  for (let i = 0; i < n; i++) by[Math.min(4, recs[i * 7 + 3] | 0)].push(i);
  by.forEach((list, t) => {
    if (!list.length) return;
    const im = new THREE.InstancedMesh(PCAR_GEO[t], MATS.vc, list.length);
    im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(list.length * 3), 3);
    list.forEach((i, k) => {
      _Q.setFromEuler(_E.set(0, recs[i * 7 + 2], 0));
      _M.compose(_P.set(recs[i * 7], recs[i * 7 + 4] + 0.01, recs[i * 7 + 1]), _Q, _S.set(1, 1, 1));
      im.setMatrixAt(k, _M);
      im.setColorAt(k, _C.setHex(t === 1 ? 0xf2b70f : CAR_COLORS[Math.floor(hash2(recs[i * 7] | 0, recs[i * 7 + 1] | 0) * CAR_COLORS.length)]));
    });
    im.computeBoundingSphere(); im.matrixAutoUpdate = false;
    im.userData.dist = 380; im.userData.cx = (ch.cx + 0.5) * CHUNK; im.userData.cz = (ch.cz + 0.5) * CHUNK;
    im.castShadow = QUALITY.level >= 2;
    scene.add(im); ch.propMeshes.push(im);
  });
}

// street-name blades on signal poles
let BLADE_GEO = null;
function locateNames(x, z) {
  let street, ave;
  if (z <= 5) {
    const n = Math.max(0, Math.round(nOfZ(z)));
    street = n === 0 ? (x < 0 ? 'W Houston St' : 'E Houston St') : streetName(n, x);
    let best = 1e9;
    for (const Ln of AVES) { const s = lineAt(Ln, z - 20) || lineAt(Ln, z + 20); if (s && Math.abs(Ln.x - x) < best) { best = Math.abs(Ln.x - x); ave = s.name; } }
  } else {
    let best = 1e9, Z = null;
    for (const d of DOWN_Z) if (Math.abs(d.z - z) < best) { best = Math.abs(d.z - z); Z = d; }
    street = Z.east && x > 590 ? Z.east : Z.name;
    best = 1e9;
    for (const Ln of DOWN_X) { const s = lineAt(Ln, z - 20) || lineAt(Ln, z + 20); if (s && Math.abs(Ln.x - x) < best) { best = Math.abs(Ln.x - x); ave = s.name; } }
  }
  if (broadwayDist(x, z).d < 30) ave = 'Broadway';
  return { street, ave: ave || '' };
}
function buildSignBlades(ch, recs, scene) {
  if (!BLADE_GEO) BLADE_GEO = bladeModel();
  const n = recs.length * 2;
  const geo = BLADE_GEO.clone();
  const idx = new Float32Array(n);
  const im = new THREE.InstancedMesh(geo, MATS.signs, n);
  recs.forEach((r, i) => {
    const [x, z, rot] = r;
    const sgn = rot === 0 ? 1 : -1;
    const names = locateNames(x - sgn * 12, z - sgn * 12);
    // blade parallel to the street (shows the street name) and one parallel to the avenue
    _Q.setFromEuler(_E.set(0, 0, 0));
    _M.compose(_P.set(x + sgn * 0.9, 5.0, z), _Q, _S.set(1, 1, 1)); im.setMatrixAt(i * 2, _M); idx[i * 2] = signIndex(names.street);
    _Q.setFromEuler(_E.set(0, Math.PI / 2, 0));
    _M.compose(_P.set(x, 4.62, z + sgn * 0.9), _Q, _S.set(1, 1, 1)); im.setMatrixAt(i * 2 + 1, _M); idx[i * 2 + 1] = signIndex(names.ave || names.street);
  });
  geo.setAttribute('aIdx', new THREE.InstancedBufferAttribute(idx, 1));
  im.computeBoundingSphere(); im.matrixAutoUpdate = false;
  im.userData.dist = 240; im.userData.cx = (ch.cx + 0.5) * CHUNK; im.userData.cz = (ch.cz + 0.5) * CHUNK;
  scene.add(im); ch.propMeshes.push(im);
}
function patchSignMaterial(tex) {
  const m = MATS.signs;
  m.map = tex;
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>\nattribute float aIdx;`)
      .replace('#include <uv_vertex>', `#include <uv_vertex>\n{ float col = mod(aIdx, ${SIGN_ATLAS.cols}.0); float row = floor(aIdx / ${SIGN_ATLAS.cols}.0);
         vMapUv = vec2((col + uv.x) / ${SIGN_ATLAS.cols}.0, 1.0 - (row + 1.0 - uv.y) / ${SIGN_ATLAS.rows}.0); }`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.rgb *= 0.75;');
  };
  m.needsUpdate = true;
}

// ---------------------------------------------------------------------
//  Billboards (Times Square, Radio City, Apollo)
// ---------------------------------------------------------------------
function makeAdsAtlas() {
  const W = 2048, H = 1024, cw = 512, chh = 256;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const font = (w, s, f = 'Archivo') => `${w} ${s}px ${f}, "Helvetica Neue", Arial, sans-serif`;
  const ads = [
    ['BROADWAY', '#a3101a', '#ffd34d', 'NOW PLAYING'], ['NEW YORK', '#1846c8', '#ffffff', 'THE CITY NEVER SLEEPS'], ['LIVE TONIGHT', '#7b16c9', '#ffe14d', 'DOORS 7PM'],
    ['NOVA COLA', '#e0141e', '#ffffff', 'ICE COLD'], ['HALF-PRICE SHOWS', '#ffcc00', '#111111', 'TODAY ONLY'], ['24/7', '#00b3e6', '#ffffff', 'OPEN ALL NIGHT'],
    ['SKYLINE TV', '#0a0a0a', '#00e0ff', 'CHANNEL 7'], ['PREMIERE', '#e6007e', '#ffffff', 'FRIDAY'], ['LUMEN', '#101010', '#f5f5f5', 'THE NEW PHONE'],
    ['SALE 50%', '#ffffff', '#e0001b', 'EVERYTHING'], ['BREAKING', '#0d2a5c', '#ffffff', 'MARKETS UP 2.1%'], ['HELLO NYC', '#ff5a1f', '#ffffff', 'WELCOME'],
    ['THE MUSICAL', '#0f6b4f', '#f2dc8a', 'TONY AWARD WINNER'], ['$1 PIZZA', '#f5f0e0', '#c8102e', 'BY THE SLICE'], ['', '#000', '#fff', ''], ['TIMES SQUARE', '#e6007e', '#ffffff', 'CROSSROADS OF THE WORLD'],
  ];
  ads.forEach(([t, bg, fg, sub], i) => {
    const x = (i % 4) * cw, y = Math.floor(i / 4) * chh;
    const grd = g.createLinearGradient(x, y, x + cw, y + chh); grd.addColorStop(0, bg); grd.addColorStop(1, shade(bg, i % 3 === 0 ? 40 : -30));
    g.fillStyle = grd; g.fillRect(x, y, cw, chh);
    if (i === 14) { for (let k = 0; k < 9; k++) { g.fillStyle = `hsl(${k * 40},90%,55%)`; g.beginPath(); g.arc(x + 40 + k * 55, y + 128 + Math.sin(k) * 60, 50, 0, 7); g.fill(); } return; }
    if (i === 0) { g.fillStyle = '#f6c64a'; for (let k = 0; k < 24; k++) { g.beginPath(); g.arc(x + 12 + k * 21, y + 12, 5, 0, 7); g.arc(x + 12 + k * 21, y + chh - 12, 5, 0, 7); g.fill(); } }
    if (i === 10) { g.fillStyle = '#c8102e'; g.fillRect(x, y + 170, cw, 50); }
    if (i === 1) { g.fillStyle = 'rgba(255,255,255,0.18)'; for (let k = 0; k < 18; k++) { const bh = 30 + hash2(k, 3) * 90; g.fillRect(x + k * 28, y + chh - bh, 22, bh); } }
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    let s = 110; g.font = font(900, s); while (g.measureText(t).width > cw - 40) { s -= 4; g.font = font(900, s); }
    g.fillText(t, x + cw / 2, y + chh * 0.45);
    g.font = font(700, 28); g.globalAlpha = 0.85; g.fillText(sub, x + cw / 2, y + chh * 0.82); g.globalAlpha = 1;
  });
  // vertical marquee signs: RADIO CITY (16) and APOLLO (17) on a second strip
  const c2 = document.createElement('canvas'); c2.width = 256; c2.height = 1024;
  const g2 = c2.getContext('2d');
  const vert = (txt, x0, bg, fg) => {
    g2.fillStyle = bg; g2.fillRect(x0, 0, 128, 1024);
    g2.fillStyle = fg; g2.font = font(900, 92); g2.textAlign = 'center'; g2.textBaseline = 'middle';
    const letters = txt.split(''); letters.forEach((L, k) => g2.fillText(L, x0 + 64, 70 + k * (900 / letters.length)));
  };
  vert('RADIOCITY', 0, '#14151c', '#ff2a3a'); vert('APOLLO', 128, '#3a0a0a', '#ff3a2a');
  const t1 = new THREE.CanvasTexture(c); t1.colorSpace = THREE.SRGBColorSpace; t1.anisotropy = 4;
  const t2 = new THREE.CanvasTexture(c2); t2.colorSpace = THREE.SRGBColorSpace;
  return [t1, t2];
}
function shade(hex, amt) { const n = parseInt(hex.slice(1), 16); const r = clamp((n >> 16) + amt, 0, 255), g = clamp(((n >> 8) & 255) + amt, 0, 255), b = clamp((n & 255) + amt, 0, 255); return `rgb(${r},${g},${b})`; }

function timesSquareWalls() {
  // attach screens to walls that face the bowtie between 42nd and 47th
  const zA = zN(47.3), zB = zN(41.7);
  for (const ch of chunks.values()) {
    const cx = (ch.cx + 0.5) * CHUNK, cz = (ch.cz + 0.5) * CHUNK;
    if (Math.abs(cx + 520) > 600 || cz < zA - 400 || cz > zB + 400) continue;
    for (const s of ch.bld) {
      if (s.faces || (s.fl & 1) || s.y1 - s.y0 < 14 || s.y0 > 1) continue;
      const c = polyCentroid(s.p);
      if (c[1] < zA || c[1] > zB || c[0] < -700 || c[0] > -350) continue;
      const sg = polyArea(s.p) >= 0 ? 1 : -1;
      for (let i = 0; i < s.p.length; i++) {
        const a = s.p[i], b = s.p[(i + 1) % s.p.length];
        const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 9) continue;
        const nx = sg * (b[1] - a[1]) / L, nz = -sg * (b[0] - a[0]) / L;
        const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
        const qx = mx + nx * 22, qz = mz + nz * 22;
        const open = broadwayDist(qx, qz).d < 22 || Math.abs(qx + 524) < 20;
        if (!open) continue;
        let y = rr(6, 10);
        const top = Math.min(s.y1 - 2, 95);
        while (y < top - 6) {
          const h = Math.min(top - y, rr(7, 18)), w = Math.min(L - 1.5, rr(10, 26));
          BILLBOARDS.push({ x: mx + nx * 0.6, y: y + h / 2, z: mz + nz * 0.6, w, h, rot: Math.atan2(nx, nz), ad: ri(0, 15) });
          y += h + rr(1.5, 5);
          if (chance(0.25)) break;
        }
      }
    }
  }
}
function buildBillboards(scene) {
  const [t1, t2] = makeAdsAtlas();
  const mk = (list, tex, cols, rows) => {
    if (!list.length) return;
    const g = new THREE.PlaneGeometry(1, 1);
    const idx = new Float32Array(list.length), seed = new Float32Array(list.length);
    const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: true });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = U.uTime; sh.uniforms.uNight = U.uNight;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aIdx; attribute float aSeed; varying float vSeed;')
        .replace('#include <uv_vertex>', `#include <uv_vertex>\n vSeed = aSeed; { float c = mod(aIdx, ${cols}.0), r = floor(aIdx / ${cols}.0); vMapUv = vec2((c + uv.x) / ${cols}.0, 1.0 - (r + 1.0 - uv.y) / ${rows}.0); }`);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uTime; uniform float uNight; varying float vSeed;')
        .replace('#include <map_fragment>', `#include <map_fragment>
          float flick = 0.86 + 0.14 * sin(uTime * (1.5 + vSeed * 3.0) + vSeed * 40.0);
          float px = step(0.5, fract(gl_FragCoord.x * 0.5)) * 0.06;
          diffuseColor.rgb *= (1.25 + 0.35 * uNight) * flick * (1.0 - px);`);
    };
    const im = new THREE.InstancedMesh(g, mat, list.length);
    list.forEach((b, i) => {
      _Q.setFromEuler(_E.set(0, b.rot, 0));
      _M.compose(_P.set(b.x, b.y, b.z), _Q, _S.set(b.w, b.h, 1));
      im.setMatrixAt(i, _M); idx[i] = b.ad % (cols * rows); seed[i] = hash2(i, 5);
    });
    g.setAttribute('aIdx', new THREE.InstancedBufferAttribute(idx, 1)); g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 1));
    im.computeBoundingSphere();
    scene.add(im);
  };
  mk(BILLBOARDS.filter((b) => b.ad < 16), t1, 4, 4);
  mk(BILLBOARDS.filter((b) => b.ad >= 16).map((b) => Object.assign({}, b, { ad: b.ad - 16 })), t2, 2, 1);
}

// ---------------------------------------------------------------------
//  Build every chunk (yielding to keep the loading bar alive)
// ---------------------------------------------------------------------
async function buildWorldMeshes(scene, onProgress) {
  const list = [...chunks.values()];
  let done = 0, t0 = performance.now();
  for (const ch of list) {
    if (ch.bld.length) {
      const g = buildBuildingGeometry(ch.bld);
      if (g) { const m = new THREE.Mesh(g, MATS.bld); m.castShadow = true; m.receiveShadow = true; m.matrixAutoUpdate = false; m.userData.kind = 'bld'; scene.add(m); ch.meshes.push(m); }
    }
    if (ch.gnd.length) {
      const g = buildGroundGeometry(ch.gnd);
      if (g) { const m = new THREE.Mesh(g, MATS.ground); m.receiveShadow = true; m.matrixAutoUpdate = false; m.userData.kind = 'gnd'; scene.add(m); ch.meshes.push(m); }
    }
    buildChunkProps(ch, scene);
    CHUNK_LIST.push(ch);
    done++;
    if (performance.now() - t0 > 60) { onProgress(done / list.length); await sleepFrame(); t0 = performance.now(); }
  }
  // free generation data we no longer need (keep building specs for Times Square already used)
  for (const ch of list) { const a = ch.props && ch.props.steam; if (a) for (let i = 0; i < a.length; i += 7) STEAM.src.push([a[i], 4.2, a[i + 1]]); ch.gnd = null; ch.props = null; ch.bld = null; }
}
function buildExtras(scene) {
  for (const e of extraMeshes) {
    const mat = e.mat === 'ground' ? MATS.ground : e.mat === 'water' ? MATS.water : MATS.seawall;
    const m = new THREE.Mesh(e.geo, mat);
    if (e.mat === 'seawall' && e.double) m.material = MATS.seawall.clone(), m.material.side = THREE.DoubleSide;
    m.receiveShadow = e.shadow === 'receive';
    if (e.cull === false) m.frustumCulled = false;
    m.matrixAutoUpdate = false;
    if (e.isSea) { m.renderOrder = -1; }
    scene.add(m);
  }
  const add = (arr, mat, cast = true) => { if (!arr.length) return null; const g = mergeGeometries(arr); const m = new THREE.Mesh(g, mat); m.castShadow = cast; m.receiveShadow = true; m.matrixAutoUpdate = false; scene.add(m); return m; };
  add(VC.stone, MATS.vc); add(VC.metal, MATS.vcMetal); add(VC.dark, MATS.vcDark); add(VC.copper, MATS.vcCopper); add(VC.gold, MATS.vcGold); add(VC.glow, MATS.glow, false);
  add(TKTS, MATS.tkts, false);
  if (CHRYSLER.length) { const m = new THREE.Mesh(mergeGeometries(CHRYSLER), MATS.chrysler); m.castShadow = true; scene.add(m); }
  if (CABLES.length) { const m = new THREE.Mesh(mergeGeometries(CABLES), MATS.cable); m.castShadow = true; scene.add(m); }
  if (LATTICE.length) { const m = new THREE.Mesh(mergeGeometries(LATTICE), MATS.lattice); m.castShadow = true; scene.add(m); }
  if (BRIDGE_LINES.length) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(BRIDGE_LINES, 3)); scene.add(new THREE.LineSegments(g, MATS.lines)); }
  if (BRIDGE_LIGHTS.length) {
    const c = document.createElement('canvas'); c.width = c.height = 32; const g2 = c.getContext('2d');
    const grd = g2.createRadialGradient(16, 16, 0, 16, 16, 16); grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.3, 'rgba(255,240,210,0.8)'); grd.addColorStop(1, 'rgba(255,230,200,0)');
    g2.fillStyle = grd; g2.fillRect(0, 0, 32, 32);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(BRIDGE_LIGHTS, 3));
    const pm = new THREE.PointsMaterial({ size: 3.2, map: new THREE.CanvasTexture(c), color: 0xfff1d6, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
    pm.userData.nightOpacity = true;
    const pts = new THREE.Points(g, pm); pts.frustumCulled = false; scene.add(pts); MATS.necklace = pm;
  }
  // memorial waterfalls
  for (const p of WATERFALLS) {
    const [x0, z0, x1, z1] = p;
    for (const [ax, az, bx, bz] of [[x0, z0, x1, z0], [x1, z0, x1, z1], [x1, z1, x0, z1], [x0, z1, x0, z0]]) {
      const L = Math.hypot(bx - ax, bz - az);
      const g = new THREE.PlaneGeometry(L, 5.8, 1, 1);
      const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * L / 8, uv.getY(i) * 0.7);
      const m = new THREE.Mesh(g, MATS.waterfall);
      m.position.set((ax + bx) / 2, -2.7, (az + bz) / 2);
      m.rotation.y = Math.atan2(-(bz - az), bx - ax) + Math.PI;
      m.translateZ(0.05);
      scene.add(m);
    }
  }
  for (const r of GLASS_RAILS) {
    const pts = r.concat([r[0]]);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], L = Math.hypot(b[0] - a[0], b[2] - a[2]);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(L, 1.4), MATS.glassRail);
      m.position.set((a[0] + b[0]) / 2, a[1] + 0.7, (a[2] + b[2]) / 2); m.rotation.y = Math.atan2(-(b[2] - a[2]), b[0] - a[0]);
      scene.add(m);
    }
  }
  for (const [x, z] of VESSEL) {
    const pts = []; for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push(new THREE.Vector2(15 + 10 * Math.pow(t, 1.15), t * 46)); }
    const g = new THREE.LatheGeometry(pts, 40);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 14, uv.getY(i) * 7);
    const c = new THREE.Color(0xa86a3c), n = g.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.Mesh(g, MATS.lattice.clone()); m.material.metalness = 0.85; m.material.roughness = 0.35;
    m.position.set(x, 0.25, z); m.castShadow = true; scene.add(m);
  }
}

// visibility & LOD each frame
function updateChunkVisibility(cam, flying) {
  const far = flying ? 16000 : 6500;
  for (const ch of CHUNK_LIST) {
    const cx = (ch.cx + 0.5) * CHUNK, cz = (ch.cz + 0.5) * CHUNK;
    const d = Math.hypot(cx - cam.x, cz - cam.z, Math.max(0, cam.y - 2));
    for (const m of ch.meshes) m.visible = m.userData.kind === 'gnd' ? d < far * 0.7 : d < far;
    for (const m of ch.propMeshes) {
      const u = m.userData;
      if (u.lod === 'near') m.visible = d < u.dist * QUALITY.treeK;
      else if (u.lod === 'far') m.visible = d >= u.minDist * QUALITY.treeK && d < u.dist;
      else m.visible = d < u.dist * QUALITY.propDist + CHUNK * 0.75;
    }
  }
}
