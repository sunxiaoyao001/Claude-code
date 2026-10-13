// =====================================================================
//  Sky, sun, moon, fog and time of day — Tuesday, October 13, 2026
// =====================================================================
const ENV = { minutes: 17 * 60 + 35, flow: 1, sunDir: new THREE.Vector3(), elev: 0, night: 0, lastEnv: -1e9, lastEnvDir: new THREE.Vector3(0, -1, 0) };
const LAT = 40.71 * Math.PI / 180, DECL = -8.84 * Math.PI / 180, GRID_ROT = 29 * Math.PI / 180;

function solar(minutes) {
  const T = minutes / 60 - 0.7;                // solar time (EDT, longitude & equation of time)
  const H = (T - 12) * 15 * Math.PI / 180;
  const sinAlt = Math.sin(LAT) * Math.sin(DECL) + Math.cos(LAT) * Math.cos(DECL) * Math.cos(H);
  const alt = Math.asin(sinAlt);
  const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(LAT) - Math.tan(DECL) * Math.cos(LAT)); // from south, +west
  const bearing = az + Math.PI;                 // from true north, clockwise
  const b = bearing - GRID_ROT;                 // relative to grid north (uptown)
  const c = Math.cos(alt);
  return { alt, dir: new THREE.Vector3(Math.sin(b) * c, Math.sin(alt), -Math.cos(b) * c) };
}

let sky, skyEnv, envScene, pmrem, envRT = null, stars, glowDome;
let sun, hemi, moonLight;

function setupSky(scene, renderer) {
  sky = new Sky(); sky.scale.setScalar(12000);
  sky.material.depthWrite = false; sky.material.depthTest = false; sky.renderOrder = -10; sky.frustumCulled = false;
  scene.add(sky);
  envScene = new THREE.Scene();
  skyEnv = new Sky(); skyEnv.scale.setScalar(1000); envScene.add(skyEnv);
  pmrem = new THREE.PMREMGenerator(renderer);
  // light-pollution dome: warm glow low on the horizon at night
  const dg = new THREE.SphereGeometry(11000, 32, 16);
  const cols = new Float32Array(dg.attributes.position.count * 3);
  for (let i = 0; i < dg.attributes.position.count; i++) {
    const y = dg.attributes.position.getY(i) / 11000;
    const k = Math.exp(-Math.max(0, y) * 9) * (y > -0.05 ? 1 : 0.4);
    cols[i * 3] = 0.34 * k; cols[i * 3 + 1] = 0.22 * k; cols[i * 3 + 2] = 0.16 * k;
  }
  dg.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  glowDome = new THREE.Mesh(dg, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true, fog: false }));
  glowDome.renderOrder = -9; glowDome.frustumCulled = false; scene.add(glowDome);
  envScene.add(glowDome.clone());
  // a few stars punch through the city glow
  const sp = [];
  const R = mulberry32(99);
  for (let i = 0; i < 700; i++) {
    const u = R() * 2 - 1, a = R() * Math.PI * 2, y = Math.abs(u) * 0.95 + 0.05;
    const r = Math.sqrt(1 - y * y);
    sp.push(Math.cos(a) * r * 10500, y * 10500, Math.sin(a) * r * 10500);
  }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xdfe6ff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, depthTest: true, fog: false }));
  stars.renderOrder = -8; stars.frustumCulled = false; scene.add(stars);
  sun = new THREE.DirectionalLight(0xffffff, 3);
  sun.castShadow = true;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.6;
  scene.add(sun); scene.add(sun.target);
  hemi = new THREE.HemisphereLight(0xbcd2e8, 0x4a4238, 1.0); scene.add(hemi);
  moonLight = new THREE.DirectionalLight(0x8aa0d0, 0.0); scene.add(moonLight); scene.add(moonLight.target);
  scene.fog = new THREE.FogExp2(0xb8c4cf, 0.00022);
}

const _c1 = new THREE.Color(), _c2 = new THREE.Color();
function updateSky(dt, camera, renderer, scene, flying) {
  ENV.minutes = (ENV.minutes + dt * ENV.flow / 60 + 1440) % 1440;
  const s = solar(ENV.minutes);
  ENV.sunDir.copy(s.dir);
  const e = s.alt * 180 / Math.PI;
  ENV.elev = e;
  const night = 1 - smoothstep(-7, 5, e);
  ENV.night = night;
  U.uNight.value = night;
  U.uDusk.value = smoothstep(-6, 2, e) * (1 - smoothstep(4, 16, e));
  U.uSunDir.value.copy(s.dir);
  for (const sk of [sky, skyEnv]) {
    const u = sk.material.uniforms;
    u.sunPosition.value.copy(s.dir);
    u.turbidity.value = lerp(9, 3.5, smoothstep(0, 30, e));
    u.rayleigh.value = lerp(3.2, 1.2, smoothstep(0, 25, e));
    u.mieCoefficient.value = 0.0045;
    u.mieDirectionalG.value = 0.86;
  }
  sky.position.copy(camera.position); glowDome.position.copy(camera.position); stars.position.copy(camera.position);
  const shell = camera.far * 0.85 / 11000;            // keep the sky shells inside the far plane
  glowDome.scale.setScalar(shell); stars.scale.setScalar(shell);
  glowDome.material.opacity = 0.25 + 0.75 * night;
  stars.material.opacity = smoothstep(0.7, 1, night) * 0.85;
  // lights
  const sunUp = smoothstep(-3, 10, e);
  _c1.setRGB(1.0, 0.52, 0.28); _c2.setRGB(1.0, 0.96, 0.9);
  sun.color.copy(_c1).lerp(_c2, smoothstep(2, 28, e));
  sun.intensity = 3.1 * sunUp;
  sun.castShadow = QUALITY.shadows;
  hemi.intensity = lerp(0.14, 0.62, smoothstep(-8, 15, e));
  hemi.color.setRGB(lerp(0.16, 0.62, sunUp), lerp(0.18, 0.72, sunUp), lerp(0.28, 0.88, sunUp));
  hemi.groundColor.setRGB(lerp(0.12, 0.3, sunUp), lerp(0.09, 0.26, sunUp), lerp(0.07, 0.22, sunUp));
  moonLight.intensity = 0.32 * night;
  moonLight.position.copy(camera.position).addScaledVector(new THREE.Vector3(0.3, 0.8, 0.2), 500);
  moonLight.target.position.copy(camera.position);
  // fog color follows the horizon
  const day = new THREE.Color(0.66, 0.74, 0.84), dusk = new THREE.Color(0.86, 0.6, 0.45), blue = new THREE.Color(0.2, 0.22, 0.32), nite = new THREE.Color(0.07, 0.065, 0.08);
  const f = new THREE.Color();
  if (e > 12) f.copy(day);
  else if (e > 0) f.copy(dusk).lerp(day, e / 12);
  else if (e > -6) f.copy(blue).lerp(dusk, (e + 6) / 6);
  else f.copy(nite).lerp(blue, clamp((e + 12) / 6, 0, 1));
  scene.fog.color.copy(f);
  const alt = camera.position.y;
  scene.fog.density = (flying ? 0.00011 : 0.00021) * lerp(1, 0.55, smoothstep(50, 600, alt)) * (night > 0.5 ? 1.15 : 1);
  renderer.toneMappingExposure = lerp(0.66, 0.85, night);
  // crown lights cycle on the Empire State at night
  const cycle = Math.floor(ENV.minutes / 20) % 4;
  U.uCrown.value.setRGB(...[[1, 1, 1], [1, 0.82, 0.3], [0.25, 0.55, 1], [1, 0.3, 0.25]][cycle]);
  // environment map refresh (reflections in glass and water)
  const now = performance.now();
  const jump = ENV.lastEnvDir.distanceTo(s.dir);
  if ((now - ENV.lastEnv > 2500 && jump > 0.012) || jump > 0.12 || ENV.lastEnv < 0) {
    ENV.lastEnv = now; ENV.lastEnvDir.copy(s.dir);
    envScene.children[1].material.opacity = glowDome.material.opacity;
    const rt = pmrem.fromScene(envScene, 0.02, 1, 3000);
    if (envRT) envRT.dispose();
    envRT = rt; scene.environment = rt.texture;
  }
}
