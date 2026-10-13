// =====================================================================
//  Main
// =====================================================================
let RENDERER, SCENE, CAMERA, COMPOSER, BLOOM;
const canvas = document.getElementById('c');

function applyQuality(level) {
  QUALITY.level = level;
  QUALITY.shadows = level >= 1;
  QUALITY.bloom = level >= 1;
  QUALITY.peds = [140, 300, 460][level];
  QUALITY.cars = [90, 180, 260][level];
  QUALITY.propDist = [0.6, 0.85, 1.1][level];
  QUALITY.treeK = [0.45, 0.7, 0.9][level];
  QUALITY.pr = Math.min(devicePixelRatio, [1, 1.25, 1.6][level]);
  if (!RENDERER) return;
  RENDERER.setPixelRatio(QUALITY.pr);
  RENDERER.shadowMap.enabled = QUALITY.shadows;
  sun.shadow.mapSize.set(level >= 2 ? 2048 : 1024, level >= 2 ? 2048 : 1024);
  if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  const ext = level >= 2 ? 260 : 170;
  Object.assign(sun.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 1, far: 2400 });
  sun.shadow.camera.updateProjectionMatrix();
  for (const m of SCENE.children) if (m.material && m.material.needsUpdate !== undefined && m.isMesh) m.material.needsUpdate = true;
  onResize();
  try { localStorage.setItem('mh-quality', String(level)); } catch (e) { /* storage unavailable */ }
}
function onResize() {
  const w = innerWidth, h = innerHeight;
  RENDERER.setSize(w, h, false);
  CAMERA.aspect = w / h; CAMERA.updateProjectionMatrix();
  if (COMPOSER) { COMPOSER.setPixelRatio(RENDERER.getPixelRatio()); COMPOSER.setSize(w, h); }
}

async function boot() {
  const prog = document.querySelector('#prog i'), progt = $('progt');
  const step = async (frac, msg) => { prog.style.transform = `scaleX(${frac})`; progt.textContent = msg; await sleepFrame(); await sleepFrame(); };
  let q = matchMedia('(pointer: coarse)').matches ? 0 : 2;
  try { const s = localStorage.getItem('mh-quality'); if (s !== null) q = +s; } catch (e) { /* storage unavailable */ }
  QUALITY.level = q; applyQuality(q);

  RENDERER = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', stencil: false });
  RENDERER.setPixelRatio(QUALITY.pr);
  RENDERER.toneMapping = THREE.ACESFilmicToneMapping;
  RENDERER.toneMappingExposure = 0.65;
  RENDERER.shadowMap.enabled = QUALITY.shadows;
  RENDERER.shadowMap.type = THREE.PCFSoftShadowMap;
  SCENE = new THREE.Scene();
  SCENE.background = new THREE.Color(0x8fa4b8);
  CAMERA = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.3, 7000);
  CAMERA.rotation.order = 'YXZ';
  setupSky(SCENE, RENDERER);
  makeMaterials();
  defineProps();
  applyQuality(QUALITY.level);
  addEventListener('resize', onResize);

  await step(0.04, 'Laying out the street grid…');
  RNG = mulberry32(19110628);
  { const pts = []; for (let z = Z_MIN; z <= Z_MAX; z += 20) pts.push([shoreW(z), z]); for (let z = Z_MAX; z >= Z_MIN; z -= 20) pts.push([shoreE(z), z]); mapPoly(pts, '#6d6c67'); }
  reserveLandmarks();
  await step(0.08, 'Reserving parks, landmarks and bridges…');
  genBridges();
  genHighLine();
  await step(0.14, 'Building 2,000 blocks of Manhattan…');
  genGrid();
  await step(0.34, 'Planting Central Park…');
  genCentralPark();
  genSquares();
  await step(0.44, 'Raising the skyline…');
  buildLandmarks();
  genLiberty();
  await step(0.5, 'Across the rivers: New Jersey, Brooklyn, Queens, the Bronx…');
  genManhattanBase();
  genShoreRoads();
  landStrip(-1); landStrip(1);
  genIslands();
  genBoroughs();
  genWater();
  timesSquareWalls();
  await step(0.58, 'Lighting Times Square…');
  $('stats').innerHTML = `<span><b>${STATS.buildings.toLocaleString()}</b>buildings</span><span><b>${STATS.blocks.toLocaleString()}</b>blocks</span><span><b>${STATS.trees.toLocaleString()}</b>trees</span><span><b>${STATS.lamps.toLocaleString()}</b>street lamps</span>`;
  await buildWorldMeshes(SCENE, (f) => { prog.style.transform = `scaleX(${0.6 + f * 0.33})`; progt.textContent = `Building meshes… ${Math.round(f * 100)}%`; });
  buildExtras(SCENE);
  buildBillboards(SCENE);
  await document.fonts.ready.catch(() => {});
  patchSignMaterial(drawSignAtlas());
  initTraffic(SCENE, MATS.vc);
  initPeds(SCENE, MATS.vc);
  initBoats(SCENE, MATS.vc);
  initSteam(SCENE);
  setupPost();
  await step(0.97, 'Compiling shaders…');
  teleport(START);
  updateSky(0, CAMERA, RENDERER, SCENE, false);
  syncCamera();
  try { RENDERER.compile(SCENE, CAMERA); } catch (e) { /* compile lazily */ }
  await step(1, 'Ready. The city is waiting.');
  const go = $('go');
  go.disabled = false; go.innerHTML = `Enter at ${START.name} <span aria-hidden="true">→</span>`;
  go.onclick = enter;
  requestAnimationFrame(loop);
  setupInput(canvas, () => HUD.toggleMap());
  HUD.init();
}

let START = null;
function setupStarts() {
  const choices = [
    { name: 'Times Square', x: -520, z: zN(44.2), yaw: 0 },
    { name: 'Central Park', x: -404, z: zN(71.0), yaw: 0 },
    { name: 'the Brooklyn Bridge', x: 250 + 0.96 * 420, z: 1450 + 0.28 * 420, yaw: Math.atan2(-0.96, -0.28) },
    { name: 'Top of the Rock', x: -180, z: -3916.3, yaw: 0, y: 259.3 },
    { name: 'Wall Street', x: 30, z: 2200, yaw: Math.atan2(40, -57) },
  ];
  START = choices[0];
  const box = $('starts');
  choices.forEach((c, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = c.name.replace(/^the /, 'The ');
    b.setAttribute('aria-pressed', String(i === 0));
    b.onclick = () => { START = c; for (const x of box.children) x.setAttribute('aria-pressed', String(x === b)); const go = $('go'); if (!go.disabled) go.innerHTML = `Enter at ${c.name} <span aria-hidden="true">→</span>`; teleport(c); };
    box.appendChild(b);
  });
}

function enter() {
  $('title').hidden = true;
  HUD.show();
  teleport(START);
  AUDIO.start();
  if (!matchMedia('(pointer: coarse)').matches) { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* drag to look */ } }
  canvas.focus();
  HUD.toast('Welcome to Manhattan — press M for the map');
}

function setupPost() {
  const rt = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: 4 });
  COMPOSER = new EffectComposer(RENDERER, rt);
  COMPOSER.addPass(new RenderPass(SCENE, CAMERA));
  BLOOM = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.3, 0.35, 1.1);
  COMPOSER.addPass(BLOOM);
  COMPOSER.addPass(new OutputPass());
  onResize();
}

function syncCamera() {
  CAMERA.position.set(PL.x, PL.camY + PL.bob, PL.z);
  CAMERA.rotation.set(PL.pitch, PL.yaw, 0);
  const fly = PL.mode === 'fly';
  const h = Math.max(0, PL.feet);
  const near = fly ? clamp(h / 300, 0.3, 4) : 0.25;
  const far = fly ? clamp(9000 + h * 12, 9000, 26000) : 7000;
  if (Math.abs(CAMERA.near - near) > 0.05 || Math.abs(CAMERA.far - far) > 200) { CAMERA.near = near; CAMERA.far = far; CAMERA.updateProjectionMatrix(); }
}

let lastT = performance.now(), fpsAvg = 60, simTime = 0, lowFrames = 0;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
  if (window.__pause) return;
  frame(dt);
}
let NODRAW = false;
window.__render = (n = 1, dt = 1 / 30, noDraw = false) => { NODRAW = noDraw; for (let i = 0; i < n; i++) frame(dt); NODRAW = false; };
function frame(dt) {
  fpsAvg = lerp(fpsAvg, 1 / Math.max(dt, 1e-4), 0.05);
  simTime += dt;
  U.uTime.value = simTime;
  const playing = $('title').hidden && !HUD.mapOpen;
  if (playing) updatePlayer(dt);
  else if (!$('title').hidden) { PL.yaw += dt * 0.04; }
  syncCamera();
  updateSky(dt, CAMERA, RENDERER, SCENE, PL.mode === 'fly');
  // sun follows the player, snapped to texels to keep shadows steady
  const ext = sun.shadow.camera.right, tex = (ext * 2) / sun.shadow.mapSize.x;
  const cx = Math.round(PL.x / tex) * tex, cz = Math.round(PL.z / tex) * tex;
  const lightDir = ENV.sunDir.y > 0.02 ? ENV.sunDir : new THREE.Vector3(0.3, 0.8, 0.2);
  sun.target.position.set(cx, PL.feet > 100 ? PL.feet * 0.5 : 0, cz);
  sun.position.copy(sun.target.position).addScaledVector(lightDir, 1200);
  // night glows
  for (const k of ['lampGlow', 'kioskGlow', 'subwayGlow', 'parkGlow', 'chrysler']) { const m = MATS[k]; const [a, b] = m.userData.glow; m.emissiveIntensity = lerp(a, b, ENV.night); }
  if (MATS.necklace) MATS.necklace.opacity = ENV.night;
  MATS.tkts.emissiveIntensity = lerp(0.6, 2.2, ENV.night);
  if (MATS.waterfall.map) MATS.waterfall.map.offset.y = -simTime * 0.9;
  updateChunkVisibility(CAMERA.position, PL.mode === 'fly');
  const fly = PL.mode === 'fly';
  const low = PL.feet < 200;
  if ($('title').hidden || true) {
    updateTraffic(dt, PL.x, PL.z, simTime, low ? QUALITY.cars : Math.floor(QUALITY.cars * 0.5));
    updatePeds(dt, PL.x, PL.z, low && !fly ? QUALITY.peds : fly && PL.feet < 80 ? Math.floor(QUALITY.peds * 0.5) : 0);
  }
  updateBoats(dt);
  updateSteam(dt, PL.x, PL.z);
  AUDIO.update(dt);
  if ($('title').hidden) HUD.update(dt, fpsAvg);
  // keep the frame rate playable: drop resolution if we fall behind
  if (fpsAvg < 28) lowFrames++; else lowFrames = Math.max(0, lowFrames - 2);
  if (lowFrames > 240 && RENDERER.getPixelRatio() > 0.75) { RENDERER.setPixelRatio(Math.max(0.75, RENDERER.getPixelRatio() * 0.85)); onResize(); lowFrames = 0; }
  if (NODRAW) return;
  if (QUALITY.bloom && COMPOSER) {
    BLOOM.strength = lerp(0.22, 0.5, ENV.night);
    BLOOM.threshold = lerp(1.15, 0.95, ENV.night);
    COMPOSER.render();
  } else RENDERER.render(SCENE, CAMERA);
}

setupStarts();
boot().catch((err) => {
  console.error(err);
  $('progt').textContent = 'Something went wrong while building the city: ' + (err && err.message ? err.message : err) + '. Reload to try again.';
});

// scripted camera for automated screenshots
window.__shot = (s) => {
  if (s.t != null) ENV.minutes = s.t;
  teleport({ x: s.x, z: s.z, y: s.y ?? null, yaw: s.yaw || 0 });
  if (s.fly) { PL.mode = 'fly'; PL.feet = s.y; PL.camY = s.y + EYE; }
  PL.pitch = s.pitch || 0;
  ENV.flow = 0; HUD.last = 1; HUD.toggleHelp(false); document.getElementById("toast").classList.remove("on");
};
window.__keys = KEYS;
window.__pl = () => ({ x: +PL.x.toFixed(2), z: +PL.z.toFixed(2), feet: +PL.feet.toFixed(2), g: PL.grounded, mode: PL.mode, loc: describe(PL.x, PL.z, PL.feet).a });
window.__fly = () => toggleFly();
window.__life = () => ({ cars: TRAFFIC.cars.filter((c) => c.active).length, peds: PEDS.list.filter((p) => p.active).length, used: TRAFFIC.used.join(',') });
window.HUDX = HUD;
window.__dbg = () => ({ calls: (RENDERER.render(SCENE, CAMERA), RENDERER.info.render.calls), tris: RENDERER.info.render.triangles, progs: RENDERER.info.programs.length, geos: RENDERER.info.memory.geometries, shadow: RENDERER.shadowMap.enabled, cast: sun.castShadow, int: sun.intensity, cam: [sun.shadow.camera.left, sun.shadow.camera.far], map: sun.shadow.mapSize.x, elev: ENV.elev });
