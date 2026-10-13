// =====================================================================
//  Materials — MeshStandardMaterial with procedural patterns injected
// =====================================================================
const U = { // shared uniforms
  uTime: { value: 0 },
  uNight: { value: 0 },     // 0 = day, 1 = full night (drives lit windows / lamps)
  uDusk: { value: 0 },
  uCrown: { value: new THREE.Color(1, 1, 1) },
  uWet: { value: 0 },
  uSunDir: { value: new THREE.Vector3(0, 1, 0) },
  uCamPos: { value: new THREE.Vector3() },
  uSigCycle: { value: 0 },
};

const GLSL_COMMON = /* glsl */`
uniform float uTime; uniform float uNight; uniform float uDusk; uniform vec3 uCrown; uniform float uWet;
uint pcg(uint v){ uint s=v*747796405u+2891336453u; uint w=((s>>((s>>28u)+4u))^s)*277803737u; return (w>>22u)^w; }
float hI(float a, float b, float c){ return float(pcg(uint(int(a)+4096)*73856093u ^ pcg(uint(int(b)+4096)*19349663u ^ pcg(uint(int(c)+4096))))) / 4294967295.0; }
float hF(vec2 p){ return hI(floor(p.x), floor(p.y), 7.0); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hI(i.x,i.y,1.),hI(i.x+1.,i.y,1.),f.x), mix(hI(i.x,i.y+1.,1.),hI(i.x+1.,i.y+1.,1.),f.x), f.y); }
float fbm3(vec2 p){ return .5*vn(p)+.25*vn(p*2.03+7.1)+.125*vn(p*4.1+3.7); }
vec3 s2l(vec3 c){ return pow(max(c,vec3(0.)), vec3(2.2)); }
float aaStep(float edge, float x){ float w=fwidth(x)*.75+1e-5; return smoothstep(edge-w, edge+w, x); }
`;

function patchVertex(shader, attrs, varyings, body) {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>\n${attrs}\n${varyings}\nvarying vec3 vWPos;`)
    .replace('#include <begin_vertex>', `#include <begin_vertex>\n${body}\nvWPos = (modelMatrix * vec4(transformed,1.0)).xyz;`);
}

// ---------------------------------------------------------------------
// Buildings
// attributes: aUV (along-wall m, height m)*10 int16, aWall (len, top)*10 uint16,
//             color uint8 (srgb), aMeta uint8 (style, seed, flags, houseW*10)
// flags: 1 roof, 2 fire escape, 4 storefront, 8 crown lights, 16 uplit, 32 no-windows
// ---------------------------------------------------------------------
function makeBuildingMaterial(envMap) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0.0, envMapIntensity: 0.8 });
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, U);
    patchVertex(shader,
      'attribute vec2 aUV; attribute vec2 aWall; attribute vec3 aCol; attribute vec4 aMeta;',
      'varying vec2 vUv2; varying vec2 vWall; varying vec3 vCol; varying vec4 vMeta;',
      'vUv2 = aUV*0.1; vWall = aWall*0.1; vCol = aCol; vMeta = aMeta;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${GLSL_COMMON}\nvarying vec2 vUv2; varying vec2 vWall; varying vec3 vCol; varying vec4 vMeta; varying vec3 vWPos;\n${BLD_GLSL}`)
      .replace('void main() {', 'void main() {\n vec3 bAlb; float bRgh; float bMet; vec3 bEmi; bld(bAlb,bRgh,bMet,bEmi);')
      .replace('#include <map_fragment>', 'diffuseColor.rgb = bAlb;')
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = bRgh;')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = bMet;')
      .replace('#include <emissivemap_fragment>', 'totalEmissiveRadiance = bEmi;');
  };
  m.customProgramCacheKey = () => 'bld1';
  return m;
}

const BLD_GLSL = /* glsl */`
void styleParams(float s, out float fh, out float cw, out float ww, out float wh, out float gh){
  if(s<0.5){fh=4.0;cw=1.55;ww=0.96;wh=0.78;gh=6.0;}        // 0 glass curtain wall
  else if(s<1.5){fh=3.5;cw=2.6;ww=0.46;wh=0.56;gh=4.6;}   // 1 pre-war masonry
  else if(s<2.5){fh=3.15;cw=2.3;ww=0.44;wh=0.56;gh=3.6;}  // 2 brownstone / tenement
  else if(s<3.5){fh=3.7;cw=2.1;ww=0.44;wh=0.64;gh=5.2;}   // 3 art deco
  else if(s<4.5){fh=2.85;cw=3.3;ww=0.62;wh=0.46;gh=4.2;}  // 4 post-war brick
  else if(s<5.5){fh=4.2;cw=3.0;ww=0.64;wh=0.7;gh=5.0;}    // 5 cast-iron loft
  else if(s<6.5){fh=3.0;cw=3.0;ww=0.0;wh=0.0;gh=0.0;}     // 6 plain / mechanical
  else if(s<7.5){fh=7.0;cw=5.2;ww=0.5;wh=0.66;gh=0.0;}    // 7 civic, arched
  else {fh=4.6;cw=4.6;ww=0.78;wh=0.78;gh=7.0;}            // 8 concrete grid
}
void bld(out vec3 alb, out float rgh, out float met, out vec3 emi){
  float style = floor(vMeta.x*255.+.5);
  float seed  = floor(vMeta.y*255.+.5);
  float flags = floor(vMeta.z*255.+.5);
  float houseW = vMeta.w*25.5;
  vec3 base = s2l(vCol);
  emi = vec3(0.); met = 0.; rgh = 0.85;
  bool isRoof = mod(flags,2.) > .5;
  bool fireEsc = mod(floor(flags/2.),2.) > .5;
  bool store = mod(floor(flags/4.),2.) > .5;
  bool crown = mod(floor(flags/8.),2.) > .5;
  bool uplit = mod(floor(flags/16.),2.) > .5;
  bool blank = mod(floor(flags/32.),2.) > .5;
  if (isRoof) {
    float rt = hI(seed, 3., 9.);
    vec3 rc = rt<.22 ? vec3(.5,.5,.49) : rt<.66 ? vec3(.17,.17,.18) : rt<.9 ? vec3(.32,.31,.3) : vec3(.68,.68,.66);
    if (style > 6.5) rc = base*0.9;
    float n = fbm3(vWPos.xz*.35);
    alb = s2l(rc) * (.82 + .3*n);
    float seam = 1.-aaStep(.04, abs(fract(vWPos.x*.25)-.5)*2.);
    alb *= 1. - .08*seam;
    rgh = .92;
    if (crown) emi = uCrown * uNight * 1.6;
    return;
  }
  float u = vUv2.x, y = vUv2.y;
  float L = max(vWall.x, .5), top = vWall.y;
  float fh, cw, ww, wh, gh; styleParams(style, fh, cw, ww, wh, gh);
  if (blank) { ww = 0.; wh = 0.; }
  // row-house subdivision: each house gets its own tint and bay count
  float hid = 0., hu = u, hL = L, hseed = seed;
  if (houseW > .5) {
    hid = floor(u/houseW); hu = u - hid*houseW; hL = max(min(houseW, L - hid*houseW), .6);
    hseed = seed + hid*31.;
    float hv = hI(hseed, 5., 2.);
    vec3 alt = hv < .18 ? vec3(.80,.76,.66) : hv < .30 ? vec3(.47,.49,.5) : hv < .42 ? vec3(.62,.36,.26) : base;
    base = mix(base, s2l(alt), hv < .42 ? 1. : 0.) * (.82 + .32*hI(hseed, 8., 1.));
    cw = hL / max(2., floor(hL/2.2+.5));
    gh = max(gh, 2.6 + 1.6*hI(hseed, 2., 4.));
  }
  float edge = min(hu, hL - hu);
  float topD = top - y;
  bool ground = y < gh;
  float nC = max(1., floor(hL/max(cw, .3) + .5)); float cwa = max(hL/nC, .3);
  float cx = hu/cwa; float ci = floor(cx); float fx = fract(cx);
  float fyr = (y-gh)/fh; float fi = ground ? 0. : floor(fyr)+1.; float fy = ground ? y/max(gh,.1) : fract(fyr);
  vec2 dd = fwidth(vec2(cx, fyr));
  float px = max(dd.x, dd.y);
  float lod = 1. - smoothstep(.12, .38, px);
  // window mask (antialiased) — arched for civic style
  float wx = 1. - smoothstep(ww*.5 - dd.x, ww*.5 + dd.x, abs(fx-.5));
  float wy = 1. - smoothstep(wh*.5 - dd.y, wh*.5 + dd.y, abs(fy-.52));
  float win = wx*wy;
  if (style > 6.5 && style < 7.5) {
    vec2 q = vec2((fx-.5)/(ww*.5), (fy-.45)/(wh*.5));
    float body = step(abs(q.x),1.)*step(-1.,q.y)*step(q.y,.35);
    float arch = step(length(vec2(q.x,(q.y-.35)*1.4)), 1.);
    win = max(body, arch);
  }
  float avgWin = ww*wh;
  // keep windows off cornices and house party walls
  float keep = step(1.1, topD) * step(.35, edge) * (ground ? 0. : 1.);
  if (style < .5) keep = step(.6, topD) * (ground ? 0. : 1.);
  win = mix(avgWin * keep, win * keep, lod);
  // facade weathering
  float n1 = fbm3(vec2(u*.18 + seed, y*.07));
  vec3 facade = base * (.86 + .28*n1);
  facade *= mix(.62, 1., smoothstep(0., 9., y));               // grime & ambient occlusion at street level
  // style details
  if (style > 1.5 && style < 2.5 || style > 3.5 && style < 4.5) {          // brick
    float by = y/.075; float bx = u/.21 + .5*mod(floor(by),2.);
    float mort = max(1.-aaStep(.12, fract(by)), 1.-aaStep(.06, fract(bx)));
    float bl = 1. - smoothstep(.15, .5, max(fwidth(by), fwidth(bx)));
    facade = mix(facade, facade*1.25 + .015, mort*bl*.55);
    facade *= 1. + (hI(floor(bx), floor(by), seed)-.5)*.16*bl;
  }
  if (style > 2.5 && style < 3.5) {                             // deco: dark spandrels form vertical stripes
    float sp = (1.-smoothstep(ww*.5-dd.x, ww*.5+dd.x, abs(fx-.5))) * (1.-win);
    facade = mix(facade, facade*.45, sp*lod*(ground?0.:1.));
  }
  if ((style > .5 && style < 2.5) || style > 4.5 && style < 5.5) {  // lintels and sills
    float band = (1.-smoothstep(ww*.5+.05-dd.x, ww*.5+.05+dd.x, abs(fx-.5)));
    float lin = band * (step(.52+wh*.5, fy)*step(fy, .52+wh*.5+.07) + step(.52-wh*.5-.05, fy)*step(fy, .52-wh*.5));
    facade = mix(facade, s2l(vec3(.78,.75,.68)), lin*lod*keep*.85);
  }
  // cornice band + shadow below it
  if (style > .5 && style < 6.5 && top > 9.) {
    float cb = 1.-step(1.1, topD);
    float sh = step(1.1, topD)*(1.-step(1.6, topD));
    vec3 cc = style > 1.5 && style < 2.5 ? s2l(vec3(.22,.2,.19)) : facade*1.18;
    facade = mix(facade, cc, cb);
    facade *= 1. - .45*sh;
  }
  if (style < .5) {                                              // curtain wall: mullions + spandrels
    facade = base * .55;
  }
  // window glass, interiors and lights
  float wseed = hI(ci + hid*13., fi, seed);
  float occ = .1 + .4*hI(seed, 11., 3.);
  float litT = uNight * occ;
  if (style < .5 || style > 7.5) litT = uNight * (.12 + .45*hI(seed, fi, 5.));      // office floors light up together
  float lit = step(wseed, litT);
  vec3 warm = mix(vec3(1.,.66,.36), vec3(1.,.83,.6), hI(ci, fi, seed+3.));
  vec3 cool = vec3(.82,.9,1.);
  vec3 lcol = (style < .5 || style > 7.5) ? mix(cool, warm, .35*hI(seed,fi,2.)) : warm;
  if (hI(ci, fi, seed+9.) > .985) lcol = vec3(.45,.6,1.) * (.7 + .3*sin(uTime*7. + ci*3.)); // a television
  float avgLit = litT * avgWin * keep;
  vec3 glassTint = style < .5 ? base : vec3(.05,.065,.075);
  vec3 interior = mix(vec3(.03,.032,.035), vec3(.24,.22,.19), step(.72, hI(ci, fi, seed+5.))); // curtains / blinds
  vec3 wincol = style < .5 ? glassTint*.6 : interior;
  alb = mix(facade, wincol, win);
  rgh = mix(.88, style < .5 ? .06 : .12, win);
  met = style < .5 ? win*.75 : win*.15;
  float wl = mix(avgLit, lit*win, lod);
  emi = lcol * mix(avgLit * .55, lit*win, lod) * 1.6;
  if (style < .5) {                                              // mullions & floor slabs on glass
    float mul = (1.-aaStep(.035, abs(fract(cx)-.0)*1.)) + (1.-aaStep(.035, abs(1.-fract(cx))));
    float slab = 1.-aaStep(.11, fy);
    float f = clamp(max(mul*.6, slab), 0., 1.) * lod;
    alb = mix(alb, base*.42 + .01, f*.9); rgh = mix(rgh, .4, f); met = mix(met, .3, f);
    emi *= 1. - f;
  }
  // fire escapes on tenements
  if (fireEsc && !ground && topD > 1.2 && style > 1.5 && style < 2.5) {
    float c0 = floor(nC*.5) - 1.;
    float X = (cx - c0)/2.;
    if (X > -.04 && X < 1.04 && nC >= 3.) {
      float t = fy;
      float plat = 1.-step(.06, t);
      float rail = step(.30, t)*(1.-step(.335, t));
      float post = (1.-step(.3, t)) * (1.-aaStep(.1, abs(fract(X*7.)-.5)*2.)) * step(.06,t);
      float lx = mod(fi,2.) < .5 ? .12 + .76*t : .88 - .76*t;
      float lad = (1.-aaStep(.025, abs(X-lx))) * step(.06, t);
      float fe = clamp(plat + rail + post*.7 + lad, 0., 1.) * lod;
      float shad = step(.88, t) * .35;
      alb = mix(alb*(1.-shad*lod), vec3(.018), fe);
      emi *= 1. - fe; rgh = mix(rgh, .6, fe); met = mix(met, .2, fe);
    }
  }
  // ground floor: storefronts or lobby / stoop level
  if (ground && style < 6.5) {
    float sw = 6.4; float si = floor(u/sw); float sfx = fract(u/sw);
    float shopH = hI(si, seed, 21.);
    if (store) {
      float glass = step(.07, sfx)*step(sfx, .93)*step(.25, y)*step(y, gh-1.25);
      float door = step(.70, sfx)*step(sfx, .86)*step(y, gh-1.25);
      float sgnB = step(gh-1.15, y)*step(y, gh-.25)*step(.03, sfx)*step(sfx,.97);
      vec3 signc = s2l(vec3(hI(si,seed,1.), hI(si,seed,2.), hI(si,seed,3.))*.8 + .1);
      if (shopH < .3) signc = s2l(vec3(.08,.08,.09));
      float txt = sgnB * step(.55, hI(floor(u*3.5), floor(y*4.), seed)) * step(.2, sfx) * step(sfx, .8) * step(gh-.95, y) * step(y, gh-.45);
      vec3 shopc = mix(vec3(.025,.027,.03), vec3(.12,.1,.08), hI(si, 7., seed)) * (.6 + .5*vn(vec2(u*1.3, y*2.)));
      alb = mix(facade*.75, shopc, glass);
      alb = mix(alb, vec3(.02), door*.8);
      alb = mix(alb, signc, sgnB);
      alb = mix(alb, vec3(.9), txt*.8);
      rgh = mix(rgh, .22, glass); met = mix(met, .05, glass);
      float open = step(.25, shopH);
      vec3 shopLight = mix(vec3(1.,.66,.36), vec3(.9,.86,.78), hI(si, 4., seed));
      float inside = (.3 + .7 * vn(vec2(u * 1.7 + si * 9., y * 3.1))) * (.55 + .45 * smoothstep(.2, gh - 1.4, y));
      emi = shopLight * glass * inside * mix(.02, .75, uNight) * open;
      emi += signc * sgnB * uNight * 1.4 * step(.5, shopH) + vec3(1.) * txt * uNight * 1.0;
    } else {
      float doorw = step(.4, abs(fract(hu/max(hL,1.)*1.)-.5)) ; // unused shaping
      float lw = (1.-smoothstep(.3-dd.x,.3+dd.x,abs(fx-.5))) * step(.6, y) * step(y, gh-.7);
      alb = mix(facade*.8, vec3(.05,.055,.06), lw*.9);
      rgh = mix(rgh, .15, lw);
      emi = warm * lw * lit * 1.2;
    }
  }
  if (crown) emi += uCrown * uNight * 1.4 * (.55 + .45*fy);
  if (uplit) emi += facade * uNight * 1.2 * smoothstep(top-60., top, y);
  // distant floors read as soft average
  alb = max(alb, vec3(0.));
}
`;

// ---------------------------------------------------------------------
// Ground: roads, sidewalks, grass, plazas.  attributes aUV (local m), aG (type, flags, W, Len)
// types: 0 plain asphalt, 1 road segment, 3 sidewalk, 4 grass, 5 park path, 6 pavers, 7 Times Sq plaza,
//        8 wood planks, 9 rock, 10 lot concrete, 11 water edge stone, 12 dirt/ballfield, 13 gravel
// road flags: 1 twoWay, 2 bus lane, 4 bike lane, 8 travel +v, 16 xwalk at v=0, 32 xwalk at v=Len, 64 median
// ---------------------------------------------------------------------
function makeGroundMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0, envMapIntensity: 0.55 });
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, U);
    patchVertex(shader, 'attribute vec2 aUV; attribute vec4 aG;', 'varying vec2 vUv2; varying vec4 vG;', 'vUv2 = aUV; vG = aG;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${GLSL_COMMON}\nvarying vec2 vUv2; varying vec4 vG; varying vec3 vWPos;\n${GROUND_GLSL}`)
      .replace('void main() {', 'void main() {\n vec3 gAlb; float gRgh; vec3 gEmi; gnd(gAlb,gRgh,gEmi);')
      .replace('#include <map_fragment>', 'diffuseColor.rgb = gAlb;')
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = gRgh;')
      .replace('#include <emissivemap_fragment>', 'totalEmissiveRadiance = gEmi;');
  };
  m.customProgramCacheKey = () => 'gnd1';
  m.polygonOffset = true; m.polygonOffsetFactor = -1; m.polygonOffsetUnits = -1;
  return m;
}

const GROUND_GLSL = /* glsl */`
float lampPool(float along, float across, float spacing){
  float a = along - (floor(along/spacing)+.5)*spacing;
  return exp(-(a*a)/(2.*7.*7.) - (across*across)/(2.*5.*5.));
}
vec3 asphalt(vec2 w){
  float n = fbm3(w*.08); float n2 = vn(w*1.7);
  vec3 c = vec3(.105,.105,.11) * (.8 + .35*n) * (.94 + .12*n2);
  float pch = step(.72, vn(floor(w/vec2(3.,7.))*1.37));
  c = mix(c, c*vec3(.72,.72,.74), pch*.6);
  return c;
}
void gnd(out vec3 alb, out float rgh, out vec3 emi){
  float type = floor(vG.x+.5); float flags = floor(vG.y+.5); float W = vG.z; float Ln = vG.w;
  vec2 w = vWPos.xz; vec2 uv = vUv2;
  emi = vec3(0.); rgh = .9;
  vec3 lampC = vec3(1.,.82,.6) * uNight;
  if (type < .5) { alb = asphalt(w); rgh = mix(.85, .25, uWet); }
  else if (type < 1.5) {
    alb = asphalt(w);
    float u = uv.x, v = uv.y;
    bool two = mod(flags,2.)>.5; bool bus = mod(floor(flags/2.),2.)>.5; bool bike = mod(floor(flags/4.),2.)>.5;
    bool pos = mod(floor(flags/8.),2.)>.5; bool xw0 = mod(floor(flags/16.),2.)>.5; bool xw1 = mod(floor(flags/32.),2.)>.5;
    bool median = mod(floor(flags/64.),2.)>.5;
    float paint = 0.; vec3 pc = vec3(.85,.85,.82); float yellow = 0.;
    float lanes = max(1., floor(W/3.4));
    float park = W > 20. ? 2.6 : 2.4;
    float inner = W - 2.*park;
    // tire wear in the travel lanes
    alb *= 1. - .12*smoothstep(.0,.6, 1.-abs(fract((u-park)/ (inner/max(1.,floor(inner/3.3))))*2.-1.));
    if (two) {
      float c = abs(u - W*.5);
      yellow = (1.-aaStep(.09, abs(c-.16)));
      if (median) { float m = 1.-aaStep(2.5, c); alb = mix(alb, s2l(vec3(.42,.5,.3)), m); }
    }
    float nl = max(1., floor(inner/3.3));
    for (float i=1.; i<8.; i++) { if (i >= nl) break;
      float lx = park + inner*i/nl;
      if (two && abs(lx - W*.5) < 1.) continue;
      float dash = step(fract(v/12.), .3);
      paint = max(paint, (1.-aaStep(.07, abs(u-lx)))*dash);
    }
    paint = max(paint, (1.-aaStep(.06, abs(u-park)))*step(fract(v/6.),.65)*.0);
    if (bus) { float b = step(W-park-3.4, u)*step(u, W-park); alb = mix(alb, s2l(vec3(.55,.16,.13)), b*.85);
      float txt = b*step(.55, hF(vec2(floor((u-W)*1.2), floor(v*1.4))))*step(fract(v/60.),.06); paint = max(paint, txt); }
    if (bike) { float b = step(park, u)*step(u, park+2.1); alb = mix(alb, s2l(vec3(.25,.52,.3)), b*.8);
      paint = max(paint, (1.-aaStep(.06, abs(u-park-2.2)))); }
    // crosswalks: high-visibility ladder bars
    float cw0 = xw0 ? step(.6, v)*step(v, 4.1) : 0.;
    float cw1 = xw1 ? step(Ln-4.1, v)*step(v, Ln-.6) : 0.;
    float bars = step(abs(fract(u/1.25)-.5), .27) * step(.4, u) * step(u, W-.4);
    paint = max(paint, (cw0+cw1)*bars);
    // stop bars on the approach
    float sb = pos ? step(Ln-5.0, v)*step(v, Ln-4.55) : step(4.55, v)*step(v, 5.0);
    if (two) sb = step(4.55, v)*step(v, 5.0)*step(W*.5, u) + step(Ln-5.0, v)*step(v, Ln-4.55)*step(u, W*.5);
    if (xw0 || xw1) paint = max(paint, sb*.95);
    // manholes
    vec2 mh = vec2(u - W*.5 + 1.7, mod(v, 37.) - 18.);
    float man = 1.-aaStep(.38, length(mh));
    alb = mix(alb, vec3(.03), man*.8);
    float wear = .75 + .25*vn(w*.9);
    alb = mix(alb, s2l(pc), paint*wear);
    alb = mix(alb, s2l(vec3(.85,.62,.12)), yellow*wear);
    rgh = mix(mix(.85,.22,uWet), .6, paint);
    emi += lampC * .055 * (lampPool(v, u+1., 28.) + lampPool(v+14., W+1.-u, 28.));
  }
  else if (type < 3.5) { // sidewalk
    vec2 p = w/1.52;
    float j = max(1.-aaStep(.025, abs(fract(p.x)-.5)*2.-.95+.025), 1.-aaStep(.025, abs(fract(p.y)-.5)*2.-.95+.025));
    j = max(1.-aaStep(.03, fract(p.x)), 1.-aaStep(.03, fract(p.y)));
    float slab = hI(floor(p.x), floor(p.y), 3.);
    vec3 c = vec3(.5,.5,.48) * (.86 + .2*slab) * (.9 + .15*fbm3(w*.3));
    float gum = step(.985, hF(w*3.)) * .5;
    c *= 1. - .35*j - gum*.4;
    // curb strip
    float de = W > 0. ? min(min(uv.x, W-uv.x), min(uv.y, Ln-uv.y)) : 9.;
    c = mix(s2l(vec3(.62,.6,.57)), c, aaStep(.35, de));
    alb = s2l(c*1.15);
    rgh = mix(.9, .45, uWet);
    float along = (min(uv.x, W-uv.x) < min(uv.y, Ln-uv.y)) ? uv.y : uv.x;
    emi += lampC * .09 * lampPool(along, de-.8, 28.) * step(-1., -de+6.);
  }
  else if (type < 4.5) { // grass
    float n = fbm3(w*.12); float n2 = vn(w*2.2);
    vec3 g = mix(vec3(.18,.27,.08), vec3(.3,.34,.12), n) * (.85+.3*n2);
    g = mix(g, vec3(.33,.3,.16), smoothstep(.62,.8, fbm3(w*.035+3.))*.6); // worn & autumn patches
    alb = g * .8; rgh = .95;
  }
  else if (type < 5.5) { // park path asphalt (lighter)
    vec3 c = vec3(.24,.24,.23) * (.85+.25*fbm3(w*.2));
    float hex = step(.94, max(abs(fract(w.x*.9)-.5), abs(fract(w.y*.9)-.5))*2.);
    alb = s2l(c*1.5) ; rgh = .85;
    emi += lampC * .06 * lampPool(w.x+w.y, 0., 30.);
  }
  else if (type < 6.5) { // granite pavers
    vec2 p = vec2(w.x/1.2 + .5*mod(floor(w.y/.6),2.), w.y/.6);
    float j = max(1.-aaStep(.04, fract(p.x)), 1.-aaStep(.06, fract(p.y)));
    float s = hI(floor(p.x), floor(p.y), 9.);
    vec3 c = mix(vec3(.47,.46,.44), vec3(.58,.55,.5), s) * (1.-.3*j);
    alb = s2l(c); rgh = mix(.8, .4, uWet);
    emi += lampC * .05;
  }
  else if (type < 7.5) { // Times Square plaza paint (dark with light discs)
    vec2 p = w/2.4;
    float disc = 1.-aaStep(.09, length(fract(p)-.5));
    vec2 q = vec2(w.x/1.2, w.y/.6);
    float j = max(1.-aaStep(.05, fract(q.x)), 1.-aaStep(.08, fract(q.y)));
    vec3 c = mix(vec3(.3,.3,.31), vec3(.36,.355,.35), hI(floor(q.x), floor(q.y), 4.)) * (1.-.25*j);
    c = mix(c, vec3(.62,.64,.66), disc);
    alb = s2l(c); rgh = mix(.75, .3, disc);
    emi += lampC * .08;
  }
  else if (type < 8.5) { // wooden boardwalk
    float pl = w.x*0. + uv.x/0.16;
    float j = 1.-aaStep(.08, fract(pl));
    float s = hI(floor(pl), floor(uv.y/3.1 + hI(floor(pl),1.,1.)), 2.);
    vec3 c = vec3(.4,.3,.2) * (.75 + .4*s) * (1. - .55*j);
    alb = s2l(c); rgh = .8;
    emi += lampC * .07 * lampPool(uv.y, 0., 24.);
  }
  else if (type < 9.5) { alb = s2l(vec3(.4,.39,.37)*(.7+.5*fbm3(w*.5))); rgh = .8; }
  else if (type < 10.5) { alb = s2l(vec3(.36,.35,.33)*(.8+.3*fbm3(w*.15))); rgh = .9; }
  else if (type < 11.5) { vec2 p = w/vec2(1.,.5); alb = s2l(vec3(.42,.4,.37)*(.8+.3*hF(p))); rgh = .85; }
  else if (type < 12.5) { alb = s2l(vec3(.48,.36,.25)*(.8+.3*fbm3(w*.3))); rgh = .95; }
  else { alb = s2l(vec3(.5,.47,.42)*(.8+.3*vn(w*3.))); rgh = .95; }
  if (uWet > 0.) alb *= mix(1., .55, uWet);
}
`;

// ---------------------------------------------------------------------
// Water with animated normals, reflects the environment
// ---------------------------------------------------------------------
function makeWaterMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: 0x1d2c31, roughness: 0.16, metalness: 0.0, envMapIntensity: 0.9 });
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, U);
    patchVertex(shader, '', '', '');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${GLSL_COMMON}\nvarying vec3 vWPos;`)
      .replace('#include <normal_fragment_maps>', `
        {
          vec2 p = vWPos.xz;
          float t = uTime;
          float e = .5;
          float h0 = vn(p*.09 + vec2(t*.05, t*.03)) + .5*vn(p*.31 - vec2(t*.11, -t*.07)) + .25*vn(p*1.1 + vec2(t*.3,t*.2));
          float hx = vn((p+vec2(e,0.))*.09 + vec2(t*.05, t*.03)) + .5*vn((p+vec2(e,0.))*.31 - vec2(t*.11, -t*.07)) + .25*vn((p+vec2(e,0.))*1.1 + vec2(t*.3,t*.2));
          float hz = vn((p+vec2(0.,e))*.09 + vec2(t*.05, t*.03)) + .5*vn((p+vec2(0.,e))*.31 - vec2(t*.11, -t*.07)) + .25*vn((p+vec2(0.,e))*1.1 + vec2(t*.3,t*.2));
          float fade = 1. - smoothstep(60., 900., length(vWPos - cameraPosition));
          float amp = mix(.06, .32, fade);
          vec3 nW = normalize(vec3(-(hx-h0)/e*amp, 1., -(hz-h0)/e*amp));
          normal = normalize((viewMatrix * vec4(nW, 0.)).xyz);
        }`)
      .replace('#include <emissivemap_fragment>', `totalEmissiveRadiance = vec3(.01,.012,.014) * uNight;`);
  };
  m.customProgramCacheKey = () => 'water1';
  return m;
}

// simple vertex-colored lit material
function makeVCMaterial(opts = {}) {
  return new THREE.MeshStandardMaterial(Object.assign({ vertexColors: true, roughness: 0.8, metalness: 0.05 }, opts));
}

// Emissive that tracks night (lamp heads, signals glow etc.)
function makeNightGlow(color, dayLevel = 0.05, nightLevel = 3) {
  const m = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: color, emissiveIntensity: dayLevel, roughness: 0.4 });
  m.userData.glow = [dayLevel, nightLevel];
  return m;
}
