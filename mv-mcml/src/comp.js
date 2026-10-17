// 纸面合成器（WebGL2）。改编自 lemo-opuscar styles/ink-wash/demo/comp.js（MIT），改成竖屏、
// 每套画面各自的纸色和墨色（暖纸 / 夜靛 / 黑白三种色调），并加了"蒙版转场"。
// 每套画面三张 2D 画布：wet（湿墨，会晕开、积边）、dry（干墨，纸纹咬边）、col（颜色层：朱砂、谱线金、光）。
// 两套画面 A/B 之间的转场：trans.w = 1 墨晕扩散；trans.w = 2 用蒙版画布（mask 的 alpha = 显出 B 的地方）。
const VS = `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p,0,1); }`;
// 预计算：纸纹和墨的噪声场（世界坐标，1 texel = 1 世界单位，REPEAT 平铺）。只在启动时画一次，之后每帧查表
const NOISE = 4096;
const FS_NOISE = `#version 300 es
precision highp float; layout(location=0) out vec4 o0; layout(location=1) out vec4 o1; layout(location=2) out vec4 o2;
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float a = 0., w = .5; for(int i=0;i<4;i++){ a += w*vn(p); p = p*2.03 + 17.1; w *= .5; } return a; }
float fiber(vec2 p, float ang){ float c = cos(ang), s = sin(ang); vec2 q = vec2(c*p.x + s*p.y, -s*p.x + c*p.y);
  return smoothstep(.78, .95, vn(vec2(q.x*.018, q.y*.9))); }
void main(){
  vec2 p = gl_FragCoord.xy;
  float cloud = fbm(p*.0028) - .5, cloud2 = fbm(p*.011 + 3.) - .5, grain = vn(p*.9) - .5;
  float fb = fiber(p, .35) + fiber(p + 91., 2.1) * .8 + fiber(p*1.7 + 13., 1.2) * .6;
  float spot = smoothstep(.65,.9, vn(p*.05 + 7.));
  float tooth = smoothstep(.62, .9, vn(p*.55 + 3.));
  o0 = vec4(clamp((cloud*.07 + cloud2*.03 + grain*.035) * 4. + .5, 0., 1.), clamp(fb / 2.4, 0., 1.), spot, tooth);
  o1 = vec4(fbm(p*.012), fbm(p*.012 + 31.), vn(p*.21), vn(p*.21 + 7.));
  o2 = vec4(vn(p*.35), fbm(p*.06), vn(p*.7), vn(p*.7 + 5.));
}`;
const FS = `#version 300 es
precision highp float; out vec4 o;
uniform sampler2D wA, dA, cA, wB, dB, cB, mT, N0, N1, N2;
uniform vec2 res;
uniform vec3 paperX, paperXB;          // 纸纹偏移(px) + 缩放（让纸纹跟着镜头走）
uniform vec3 paperA, paperB;           // 纸色
uniform vec3 inkLoA, inkHiA, inkLoB, inkHiB;   // 淡墨色 → 浓墨色
uniform vec2 bleed, rim;               // A/B 晕染半径 px、积边强度
uniform vec4 trans;                    // cx, cy, R, mode
uniform vec2 fib;                      // A/B 纸纹强度
uniform float vig, flash, fade;
uniform vec3 flashCol, fadeCol;
const float NS = ${NOISE}.;
uniform vec2 lod;                      // A/B 噪声贴图的 mip 级别（镜头拉远时用粗一点的）
vec4 nz(sampler2D T, vec2 p, float l){ return textureLod(T, p / NS, l); }
vec3 paper(vec2 fc, vec3 X, vec3 col, float k, out vec4 n0, float l){
  vec2 p = (fc + X.xy) / X.z;
  n0 = nz(N0, p, l);
  float lum = dot(col, vec3(.3,.5,.2));
  vec3 c = col * (1. + (n0.r - .5) / 4. * k);
  c += mix(vec3(.05,.05,.06), vec3(.018,.016,.012), smoothstep(.1,.5,lum)) * n0.g * 2.4 * clamp(X.z*1.2, 0., 1.) * k;
  c -= vec3(.012,.014,.018) * n0.b * k * smoothstep(.1,.5,lum);
  return c;
}
const vec2 PD[8] = vec2[](vec2(-.326,-.406), vec2(-.840,-.074), vec2(-.696,.457), vec2(-.203,.621), vec2(.962,-.195), vec2(.473,-.480),
  vec2(.519,.767), vec2(.185,-.893));
float inkD(sampler2D W, sampler2D D, vec2 fc, float R, float rimK, vec3 X, vec4 n0, float l){
  vec2 p = (fc + X.xy) / X.z;
  vec4 n2 = nz(N2, p, l);
  float dry = texture(D, (fc + (n2.zw - .5) * 1.6) / res).a;
  dry *= 1. - n0.a * .45 * (1. - dry*.5);
  float wet;
  if (R > .5) {
    vec4 n1 = nz(N1, p, l);
    vec2 q = fc + (n1.xy - .5) * R * 1.1 + (n1.zw - .5) * R * .35;
    float a = 0., b = 0.;
    for (int i = 0; i < 8; i++) { a += texture(W, (q + PD[i] * R * .5) / res).a; b += texture(W, (q + PD[i] * R * 1.35) / res).a; }
    a /= 8.; b /= 8.;
    float sq = texture(W, q / res).a;
    wet = mix(sq, a, .72) * (.86 + .22*n2.y) + max(0., a - b) * rimK * (.8 + .5*n2.x) + b * .10;
  } else wet = texture(W, fc / res).a;
  return clamp(1. - (1. - clamp(wet,0.,1.)) * (1. - clamp(dry,0.,1.)), 0., 1.);
}
vec3 shade(vec3 pc, vec3 base, float D, vec4 col, vec2 fc, vec3 X, vec3 lo, vec3 hi, float l){
  vec3 ink = mix(lo, hi, smoothstep(.0, .85, D));
  vec3 c = mix(pc, ink * (pc / base), clamp(D*1.05, 0., 1.));
  float sp = .92 + .08 * smoothstep(.2, .45, nz(N2, (fc + X.xy) / X.z * 1.143 + 11., l).z);   // 颜料吃纸不匀
  vec3 tx = 1. + (pc - base) / max(dot(base, vec3(.333)), .5) * .55;
  c = mix(c, col.rgb * tx, clamp(col.a * sp, 0., 1.));
  return c;
}
void main(){
  vec2 fc = gl_FragCoord.xy; fc.y = res.y - fc.y;
  vec4 n0;
  vec3 pa = paper(fc, paperX, paperA, fib.x, n0, lod.x);
  float DA = inkD(wA, dA, fc, bleed.x, rim.x, paperX, n0, lod.x);
  vec3 c = shade(pa, paperA, DA, texture(cA, fc / res), fc, paperX, inkLoA, inkHiA, lod.x);
  if (trans.w > .5) {
    vec4 nb;
    vec3 pb = paper(fc, paperXB, paperB, fib.y, nb, lod.y);
    float m;
    if (trans.w < 1.5) {
      float d = length(fc - trans.xy);
      float n = nz(N1, fc * .233 + 900., 0.).x * .7 + nz(N1, fc * .75 + 300., 0.).y * .2;
      float dn = d * (.72 + n);
      m = 1. - smoothstep(trans.z*.9, trans.z, dn);
      float band = exp(-pow((dn - trans.z*.95)/(trans.z*.05 + 14.), 2.)) * .6;
      if (m > .001) {
        float DB = inkD(wB, dB, fc, bleed.y, rim.y, paperXB, nb, lod.y);
        vec3 cb = shade(pb, paperB, DB, texture(cB, fc / res), fc, paperXB, inkLoB, inkHiB, lod.y);
        c = mix(c, cb, m);
      }
      c *= 1. - band * .38 * smoothstep(0., 40., trans.z) * (1. - smoothstep(res.y*1.1, res.y*1.6, trans.z));
    } else {
      m = texture(mT, fc / res).a;
      if (m > .001) {
        float DB = inkD(wB, dB, fc, bleed.y, rim.y, paperXB, nb, lod.y);
        vec3 cb = shade(pb, paperB, DB, texture(cB, fc / res), fc, paperXB, inkLoB, inkHiB, lod.y);
        c = mix(c, cb, m);
      }
    }
  }
  vec2 uv = gl_FragCoord.xy / res - .5;
  c *= 1. - vig * dot(uv*vec2(1.,.62), uv*vec2(1.,.62)) * 1.5;
  c = mix(c, flashCol, flash);
  c = mix(c, fadeCol, fade);
  o = vec4(clamp(c, 0., 1.), 1.);
}`;

export const W = 1080, H = 1920;

// 三种色调。纸色、淡墨色、浓墨色（0..1 RGB）
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
export const TONES = {
  warm:  { paper: hex('#EFE6D2'), inkLo: hex('#8C7A66'), inkHi: hex('#2E241C'), fib: 1 },     // 1982 的回忆：旧纸暖棕
  night: { paper: hex('#101828'), inkLo: hex('#0B111E'), inkHi: hex('#05080F'), fib: .55 },   // 夜靛
  mono:  { paper: hex('#131314'), inkLo: hex('#0C0C0D'), inkHi: hex('#050505'), fib: .45 },   // 黑白
};
export const mixTone = (a, b, k) => {
  const L = (x, y) => x.map((v, i) => v + (y[i] - v) * k);
  return { paper: L(a.paper, b.paper), inkLo: L(a.inkLo, b.inkLo), inkHi: L(a.inkHi, b.inkHi), fib: a.fib + (b.fib - a.fib) * k };
};

export function makeComp(canvas) {
  const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false });
  if (!gl) throw new Error('no webgl2');
  const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
  const prog = fs => { const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr)); return pr; };
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  // 噪声场：画一次到三张 4096² 的贴图（REPEAT + mipmap）
  const noiseTex = [0, 1, 2].map(() => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texStorage2D(gl.TEXTURE_2D, 13, gl.RGBA8, NOISE, NOISE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); return t; });
  {
    const pn = prog(FS_NOISE); gl.useProgram(pn);
    const l0 = gl.getAttribLocation(pn, 'p'); gl.enableVertexAttribArray(l0); gl.vertexAttribPointer(l0, 2, gl.FLOAT, false, 0, 0);
    const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    noiseTex.forEach((t, i) => gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, t, 0));
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2]);
    gl.viewport(0, 0, NOISE, NOISE); gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    noiseTex.forEach(t => { gl.bindTexture(gl.TEXTURE_2D, t); gl.generateMipmap(gl.TEXTURE_2D); });
  }
  const pr = prog(FS); gl.useProgram(pr);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = n => gl.getUniformLocation(pr, n);
  noiseTex.forEach((t, i) => { gl.activeTexture(gl.TEXTURE7 + i); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(U('N' + i), 7 + i); });
  const names = ['wA', 'dA', 'cA', 'wB', 'dB', 'cB', 'mT'];
  const tex = names.map((n, i) => {
    const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    gl.uniform1i(U(n), i); return t;
  });
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  const up = (i, cv) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, tex[i]); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv); };
  const setTone = (s, tone) => {
    gl.uniform3fv(U('paper' + s), tone.paper); gl.uniform3fv(U('inkLo' + s), tone.inkLo); gl.uniform3fv(U('inkHi' + s), tone.inkHi);
  };
  // A、B：layerSet；o：A 的参数 + 转场（o.trans, o.B = B 的参数, o.mask = 蒙版画布）
  return function composite(A, B, o = {}) {
    gl.viewport(0, 0, W, H);
    up(0, A.wet); up(1, A.dry); up(2, A.col);
    const tr = o.trans || [0, 0, 0, 0], ob = o.B || {};
    if (B && tr[3] > .5) { up(3, B.wet); up(4, B.dry); up(5, B.col); }
    if (tr[3] > 1.5 && o.mask) up(6, o.mask);
    gl.uniform2f(U('res'), W, H);
    const px = o.paperX || [0, 0, 1], pxb = ob.paperX || [0, 0, 1];
    gl.uniform3f(U('paperX'), px[0], px[1], px[2]); gl.uniform3f(U('paperXB'), pxb[0], pxb[1], pxb[2]);
    const ta = o.tone || TONES.warm, tb = ob.tone || ta;
    setTone('A', ta); setTone('B', tb);
    gl.uniform2f(U('fib'), ta.fib ?? 1, tb.fib ?? 1);
    gl.uniform2f(U('lod'), Math.max(0, Math.log2(1 / px[2])), Math.max(0, Math.log2(1 / pxb[2])));
    gl.uniform2f(U('bleed'), o.bleed ?? 5, ob.bleed ?? 5);
    gl.uniform2f(U('rim'), o.rim ?? .8, ob.rim ?? .8);
    gl.uniform4f(U('trans'), tr[0], tr[1], tr[2], tr[3]);
    gl.uniform1f(U('vig'), o.vig ?? .22);
    gl.uniform1f(U('flash'), o.flash ?? 0); gl.uniform3fv(U('flashCol'), o.flashCol || [1, 1, 1]);
    gl.uniform1f(U('fade'), o.fade ?? 0); gl.uniform3fv(U('fadeCol'), o.fadeCol || [0, 0, 0]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
}

// 一套三张画布。xf(z, tx, ty, rot) 同时设置三张画布的变换（世界 → 屏幕）
export function layerSet() {
  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const wet = mk(), dry = mk(), col = mk();
  const L = { wet, dry, col, W, H, cw: wet.getContext('2d'), cd: dry.getContext('2d'), cc: col.getContext('2d') };
  L.ink = { wet: L.cw, dry: L.cd, col: L.cc };
  L.all = [L.cw, L.cd, L.cc];
  L.clear = () => { for (const c of L.all) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.filter = 'none'; c.clearRect(0, 0, W, H); } };
  L.set = (a, b, c, d, e, f) => { for (const x of L.all) x.setTransform(a, b, c, d, e, f); };
  L.reset = () => L.set(1, 0, 0, 1, 0, 0);
  return L;
}
