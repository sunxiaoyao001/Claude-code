/* =============================================================================
 * WebGL2 后期合成管线（电影感的来源）
 * -----------------------------------------------------------------------------
 * 2D 画布（场景）每帧作为纹理上传，然后经过：
 *   Pass 1  COMP   镜头（缩放 / 旋转 / 震屏 / 桶形畸变）+ 故障块位移 + 像素化
 *                  + 径向色散 + 径向缩放模糊 / 方向运动模糊
 *   Pass 2  BRIGHT 提取高光 → 1/4 分辨率
 *   Pass 3  BLUR   1/4 分辨率高斯模糊（H/V）→ 再降到 1/8 模糊（大范围辉光）
 *   Pass 4  FINAL  辉光叠加 + 调色 + 扫描线 + 暗角 + 胶片颗粒 + 闪白/闪红 + 淡入淡出
 * 所有参数由场景在每帧通过 P（post params）对象驱动。
 * 不支持 WebGL2 时自动回退为直接输出 2D 画面。
 * ========================================================================== */
(function () {
  const VS = `#version 300 es
  in vec2 p; out vec2 uv;
  void main(){ uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

  const HEAD = `#version 300 es
  precision highp float;
  in vec2 uv; out vec4 o;
  float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  `;

  /* ---------- Pass 1：镜头 + 故障 + 色散 + 模糊 ---------- */
  const FS_COMP = HEAD + `
  uniform sampler2D uSrc;
  uniform vec2 uRes;
  uniform float uZoom, uRot, uBarrel, uChroma, uGlitch, uSeed, uPixel, uZoomBlur;
  uniform vec2 uShake, uDirBlur, uZoomCenter;

  vec2 cam(vec2 q){
    float asp = uRes.x / uRes.y;
    vec2 c = q - 0.5; c.x *= asp;
    float s = sin(uRot), co = cos(uRot);
    c = mat2(co, -s, s, co) * c;
    c /= uZoom; c.x /= asp;
    c += 0.5 + uShake;
    vec2 d = c - 0.5; float r2 = dot(d, d);
    return 0.5 + d * (1.0 + uBarrel * r2);
  }
  vec3 tap(vec2 q, vec2 cd){
    if (q.x < 0.0 || q.x > 1.0 || q.y < 0.0 || q.y > 1.0) return vec3(0.0);
    float r = texture(uSrc, q + cd).r;
    float g = texture(uSrc, q).g;
    float b = texture(uSrc, q - cd).b;
    return vec3(r, g, b);
  }
  void main(){
    vec2 q = cam(uv);
    // 故障：横向撕裂条 + 块状位移
    if (uGlitch > 0.001){
      float rows = 42.0;
      float row = floor(q.y * rows);
      float n = h21(vec2(row, uSeed));
      if (n < uGlitch * 0.55) q.x += (h21(vec2(row, uSeed + 3.1)) - 0.5) * 0.22 * uGlitch;
      vec2 blk = floor(q * vec2(9.0, 26.0));
      float b = h21(blk + uSeed * 1.7);
      if (b < uGlitch * 0.16) q += (vec2(h21(blk + 1.3), h21(blk + 2.9)) - 0.5) * 0.09;
    }
    // 像素化（马赛克转场）
    if (uPixel > 1.0){ vec2 px = uPixel / uRes; q = (floor(q / px) + 0.5) * px; }
    vec2 dir = (q - 0.5);
    vec2 cd = dir * uChroma * 0.06 + vec2(uGlitch * 0.012, 0.0);
    vec3 col;
    if (uZoomBlur > 0.001 || length(uDirBlur) > 0.0001){
      col = vec3(0.0); float wsum = 0.0;
      for (int i = 0; i < 14; i++){
        float f = float(i) / 13.0;
        vec2 off = (q - uZoomCenter) * (-uZoomBlur * f) + uDirBlur * (f - 0.5);
        float w = 1.0 - f * 0.55;
        col += tap(q + off, cd) * w; wsum += w;
      }
      col /= wsum;
    } else {
      col = tap(q, cd);
    }
    // 故障时偶发通道错位色块
    if (uGlitch > 0.2){
      float g2 = h21(floor(uv * vec2(6.0, 40.0)) + uSeed * 2.3);
      if (g2 < uGlitch * 0.06) col = col.brg * 1.4;
    }
    o = vec4(col, 1.0);
  }`;

  /* ---------- Pass 2：提取高光并降采样 ---------- */
  const FS_BRIGHT = HEAD + `
  uniform sampler2D uSrc; uniform vec2 uTexel; uniform float uThresh;
  void main(){
    vec3 c = texture(uSrc, uv + uTexel * vec2(-1.0,-1.0)).rgb + texture(uSrc, uv + uTexel * vec2(1.0,-1.0)).rgb
           + texture(uSrc, uv + uTexel * vec2(-1.0, 1.0)).rgb + texture(uSrc, uv + uTexel * vec2(1.0, 1.0)).rgb;
    c *= 0.25;
    float l = max(c.r, max(c.g, c.b));
    float k = smoothstep(uThresh, uThresh + 0.35, l);
    o = vec4(c * k, 1.0);
  }`;

  /* ---------- Pass 3：可分离高斯模糊 ---------- */
  const FS_BLUR = HEAD + `
  uniform sampler2D uSrc; uniform vec2 uDir;
  void main(){
    vec3 c = texture(uSrc, uv).rgb * 0.227027;
    c += texture(uSrc, uv + uDir * 1.3846).rgb * 0.316216;
    c += texture(uSrc, uv - uDir * 1.3846).rgb * 0.316216;
    c += texture(uSrc, uv + uDir * 3.2308).rgb * 0.070270;
    c += texture(uSrc, uv - uDir * 3.2308).rgb * 0.070270;
    o = vec4(c, 1.0);
  }`;

  /* ---------- Pass 4：最终合成 ---------- */
  const FS_FINAL = HEAD + `
  uniform sampler2D uComp, uB1, uB2;
  uniform vec2 uRes;
  uniform float uBloom, uScan, uVig, uGrain, uTime, uFlash, uFade, uSat, uContrast, uExposure;
  uniform vec3 uFlashColor, uTint;
  void main(){
    vec3 c = texture(uComp, uv).rgb;
    vec3 b = texture(uB1, uv).rgb * 0.9 + texture(uB2, uv).rgb * 1.1;
    c += b * uBloom;
    c *= uExposure;
    // 调色：饱和度 + 对比度 + 色调偏移
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c = mix(vec3(l), c, uSat);
    c = (c - 0.5) * uContrast + 0.5;
    c *= uTint;
    // CRT 扫描线（4px 周期，避免平台二次压缩出摩尔纹）
    float sl = 0.5 + 0.5 * sin(uv.y * uRes.y * 3.14159 * 0.5);
    c *= 1.0 - uScan * sl;
    // 暗角
    vec2 d = (uv - 0.5) * vec2(1.0, 1.25);
    c *= mix(1.0, smoothstep(0.95, 0.25, length(d)), uVig);
    // 胶片颗粒
    c += (h21(uv * uRes + fract(uTime * 7.31) * 100.0) - 0.5) * uGrain;
    // 闪白 / 闪红
    c = mix(c, uFlashColor, clamp(uFlash, 0.0, 1.0));
    c *= uFade;
    o = vec4(clamp(c, 0.0, 1.0), 1.0);
  }`;

  /** 默认后期参数（每帧由引擎复制一份交给场景修改） */
  FX.defaultPost = () => ({
    zoom: 1, rot: 0, shakeX: 0, shakeY: 0, barrel: 0.06,
    chroma: 0.12, glitch: 0, pixel: 0,
    zoomBlur: 0, zoomCX: 0.5, zoomCY: 0.5, dirBlurX: 0, dirBlurY: 0,
    bloom: 0.85, thresh: 0.55,
    scan: 0.07, vig: 0.75, grain: 0.05,
    flash: 0, flashColor: [1, 1, 1],
    fade: 1, sat: 1.05, contrast: 1.06, exposure: 1, tint: [1, 1, 1],
  });

  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function program(gl, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VS));
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'p');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(p, i);
      u[info.name] = gl.getUniformLocation(p, info.name);
    }
    return { p, u };
  }
  function target(gl, w, h) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { tex, fb, w, h };
  }

  /**
   * 创建后期管线
   * @param out  输出画布（显示用）
   * @param w,h  像素尺寸
   */
  FX.createPost = function (out, w, h) {
    const gl = out.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false, alpha: false });
    if (!gl) {
      // 回退：直接把 2D 画面拷贝到输出画布
      const ctx = out.getContext('2d');
      return { webgl: false, render(src) { ctx.drawImage(src, 0, 0, out.width, out.height); } };
    }
    const progs = {
      comp: program(gl, FS_COMP),
      bright: program(gl, FS_BRIGHT),
      blur: program(gl, FS_BLUR),
      final: program(gl, FS_FINAL),
    };
    // 全屏三角形
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const srcTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, srcTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const q4w = Math.max(1, Math.round(w / 4)), q4h = Math.max(1, Math.round(h / 4));
    const q8w = Math.max(1, Math.round(w / 8)), q8h = Math.max(1, Math.round(h / 8));
    const T = {
      comp: target(gl, w, h),
      b4a: target(gl, q4w, q4h), b4b: target(gl, q4w, q4h),
      b8a: target(gl, q8w, q8h), b8b: target(gl, q8w, q8h),
    };

    function pass(prog, tgt, setup) {
      gl.useProgram(prog.p);
      if (tgt) { gl.bindFramebuffer(gl.FRAMEBUFFER, tgt.fb); gl.viewport(0, 0, tgt.w, tgt.h); }
      else { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, w, h); }
      setup(prog.u);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    function bind(unit, tex, loc) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(loc, unit);
    }

    return {
      webgl: true,
      render(src, P, time) {
        // 上传场景画面（翻转 Y，让纹理坐标和画面方向一致）
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, srcTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);

        pass(progs.comp, T.comp, (u) => {
          bind(0, srcTex, u.uSrc);
          gl.uniform2f(u.uRes, w, h);
          gl.uniform1f(u.uZoom, P.zoom);
          gl.uniform1f(u.uRot, P.rot);
          gl.uniform1f(u.uBarrel, P.barrel);
          gl.uniform1f(u.uChroma, P.chroma);
          gl.uniform1f(u.uGlitch, P.glitch);
          gl.uniform1f(u.uSeed, Math.floor(time * 30) % 997);
          gl.uniform1f(u.uPixel, P.pixel * (w / 1080));
          gl.uniform1f(u.uZoomBlur, P.zoomBlur);
          gl.uniform2f(u.uZoomCenter, P.zoomCX, 1 - P.zoomCY);
          gl.uniform2f(u.uShake, P.shakeX, -P.shakeY);
          gl.uniform2f(u.uDirBlur, P.dirBlurX, -P.dirBlurY);
        });
        pass(progs.bright, T.b4a, (u) => {
          bind(0, T.comp.tex, u.uSrc);
          gl.uniform2f(u.uTexel, 1 / w, 1 / h);
          gl.uniform1f(u.uThresh, P.thresh);
        });
        pass(progs.blur, T.b4b, (u) => { bind(0, T.b4a.tex, u.uSrc); gl.uniform2f(u.uDir, 1 / q4w, 0); });
        pass(progs.blur, T.b4a, (u) => { bind(0, T.b4b.tex, u.uSrc); gl.uniform2f(u.uDir, 0, 1 / q4h); });
        pass(progs.blur, T.b8a, (u) => { bind(0, T.b4a.tex, u.uSrc); gl.uniform2f(u.uDir, 1 / q4w, 0); });
        pass(progs.blur, T.b8b, (u) => { bind(0, T.b8a.tex, u.uSrc); gl.uniform2f(u.uDir, 0, 1 / q8h); });
        pass(progs.blur, T.b8a, (u) => { bind(0, T.b8b.tex, u.uSrc); gl.uniform2f(u.uDir, 2 / q8w, 0); });
        pass(progs.blur, T.b8b, (u) => { bind(0, T.b8a.tex, u.uSrc); gl.uniform2f(u.uDir, 0, 2 / q8h); });
        pass(progs.final, null, (u) => {
          bind(0, T.comp.tex, u.uComp);
          bind(1, T.b4a.tex, u.uB1);
          bind(2, T.b8b.tex, u.uB2);
          gl.uniform2f(u.uRes, w, h);
          gl.uniform1f(u.uBloom, P.bloom);
          gl.uniform1f(u.uScan, P.scan);
          gl.uniform1f(u.uVig, P.vig);
          gl.uniform1f(u.uGrain, P.grain);
          gl.uniform1f(u.uTime, time);
          gl.uniform1f(u.uFlash, P.flash);
          gl.uniform3f(u.uFlashColor, P.flashColor[0], P.flashColor[1], P.flashColor[2]);
          gl.uniform1f(u.uFade, P.fade);
          gl.uniform1f(u.uSat, P.sat);
          gl.uniform1f(u.uContrast, P.contrast);
          gl.uniform1f(u.uExposure, P.exposure);
          gl.uniform3f(u.uTint, P.tint[0], P.tint[1], P.tint[2]);
        });
      },
    };
  };
})();
