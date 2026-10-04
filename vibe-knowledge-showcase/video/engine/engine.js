// Shared animation engine: deterministic, seekable timeline for 1080x1920 vertical videos.
// Episodes call scene()/card() to register content, then finalize().
// ---------- timing ----------
const W = 1080, H = 1920, FPS = 30, DUR = 80;
const CARD0 = 8.4, CARD_LEN = 6;

// ---------- helpers ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const P = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, x) => a + (b - a) * x;
const eo = x => 1 - Math.pow(1 - x, 3);
const eio = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const back = x => { const c1 = 2.2, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const rnd = n => { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const emo = s => s.replace(/(\p{Extended_Pictographic}️?)/gu, '<span class="emo">$1</span>');

function mk(parent, css = '', html = '', cls = 'abs') {
  const e = document.createElement('div');
  e.className = cls;
  if (css) e.style.cssText = css;
  if (html) e.innerHTML = html;
  parent.appendChild(e);
  return e;
}
// 3D illustration from Fluent Emoji 3D (MIT). `code` is the asset file name (codepoints, e.g. '1f9e0').
// (cx, cy) is the centre in the parent's coordinates; size is the rendered width/height in px.
const ICON_DIR = 'node_modules/@lobehub/fluent-emoji-3d/assets/';
function ico(parent, code, size, cx, cy, css = '') {
  const e = document.createElement('img');
  e.className = 'abs ico';
  e.src = `${ICON_DIR}${code}.webp`;
  e.style.cssText = `left:${cx - size / 2}px;top:${cy - size / 2}px;width:${size}px;height:${size}px;` + css;
  parent.appendChild(e);
  return e;
}
// transform/opacity setter
function T(e, { x = 0, y = 0, s = 1, sx, sy, r = 0, o = 1 } = {}) {
  const scale = sx !== undefined || sy !== undefined ? `scale(${sx ?? s},${sy ?? s})` : `scale(${s})`;
  e.style.transform = `translate(${x}px,${y}px) ${scale} rotate(${r}deg)`;
  e.style.opacity = o;
}
// spring pop-in: returns {s,o}
const pop = (t, t0, d = .45) => { const k = P(t, t0, t0 + d); return { s: k <= 0 ? .001 : back(k), o: clamp(k * 3) }; };
// typewriter into element; returns progress
function typeInto(e, str, t, t0, cps, caret = true, html = false) {
  const n = Math.floor(clamp((t - t0) * cps, 0, str.length));
  const blink = n >= str.length ? Math.floor(t * 2.5) % 2 === 0 : true;
  const sub = str.slice(0, n);
  e.innerHTML = (html ? emo(esc(sub)) : esc(sub)) + (caret && t >= t0 - .3 && blink ? '<span class="caret"></span>' : '');
  return n / str.length;
}
function glitch(e, t, amt, seed = 1) {
  if (amt <= 0) { e.style.filter = ''; e.style.textShadow = ''; return { x: 0, y: 0 }; }
  const f = Math.floor(t * FPS);
  const dx = (rnd(f * 3.1 + seed) - .5) * 40 * amt, dy = (rnd(f * 7.7 + seed) - .5) * 14 * amt;
  e.style.textShadow = `${6 * amt}px 0 rgba(255,0,80,.8), ${-6 * amt}px 0 rgba(0,220,255,.8)`;
  return { x: dx, y: dy };
}

// ---------- per-episode config (episodes may override before defining scenes) ----------
const CONFIG = { plainLabel: '人话', slug: 'video', music: {} };

// ---------- registry ----------
const stage = document.getElementById('stage');
const scenes = [];
const SUBS = [];
const CUES = [];
let curTime = 0;
function scene(start, end, build) {
  const root = mk(stage, '', '', 'scene');
  const cue = (lt, type, dur = 0) => CUES.push({ t: +(start + lt).toFixed(3), type, dur });
  const sub = (a, b, text) => SUBS.push({ s: start + a, e: start + b, text });
  const update = build(root, cue, sub, end - start);
  scenes.push({ start, end, root, update });
  cue(0, 'whoosh');
}

// ---------- card template ----------
const TERMS = [];
function card(i, d) {
  const start = CARD0 + i * CARD_LEN, end = start + CARD_LEN;
  TERMS.push(d.short);
  scene(start, end, (root, cue, sub, dur) => {
    const wrap = mk(root, 'inset:0');
    const en = mk(wrap, '', '', 'abs en');
    const zh = mk(wrap, '', esc(d.zh), 'abs zh');
    const vis = mk(wrap, '', '', 'abs vis');
    const plain = mk(wrap, '', `<span style="position:relative;display:inline-block"><b>${CONFIG.plainLabel}</b>${esc(d.plain)}<i class="mark"></i></span>`, 'abs plain');
    const mark = plain.querySelector('.mark');
    const roast = mk(wrap, '', emo(esc(d.roast)), 'abs roast');
    const visUpdate = d.vis(vis, cue);
    const enText = `> ${d.en}`;
    const roastT = d.roastT ?? 3.6;
    cue(.15, 'type', enText.length / 24);
    cue(.3, 'pop');
    cue(1.2, 'tick');
    cue(roastT, 'stamp');
    sub(.5, 2.9, d.subs[0]);
    sub(2.9, 5.75, d.subs[1]);
    return lt => {
      // enter / exit
      const ein = eo(P(lt, 0, .35)), eout = eio(P(lt, dur - .28, dur));
      T(wrap, { x: (1 - ein) * 420 - eout * 520, o: ein * (1 - eout) });
      typeInto(en, enText, lt, .15, 24, lt < 1.6);
      const z = pop(lt, .3, .5);
      T(zh, { s: z.s, o: z.o });
      const pk = P(lt, 1.2, 1.55);
      T(plain, { y: (1 - eo(pk)) * 30, o: eo(pk) });
      mark.style.width = (eio(P(lt, 1.45, 2.0)) * 100) + '%';
      const rk = P(lt, roastT, roastT + .35);
      const rs = rk <= 0 ? 1.8 : lerp(1.8, 1, eo(rk));
      roast.style.transform = `translate(-50%,0) scale(${rs}) rotate(${-3 - (1 - rk) * 8}deg)`;
      roast.style.opacity = clamp(rk * 4);
      visUpdate(lt);
    };
  });
}

// ---------- chrome & subs ----------
const segs = document.getElementById('segs');
const segFills = [...Array(10)].map(() => { const s = mk(segs, '', '<i></i>', 'seg'); return s.firstChild; });
const pill = document.getElementById('pill');
const chrome = document.getElementById('chrome');
const subEl = document.querySelector('#sub span');
const subWrap = document.getElementById('sub');

// grain (seeded noise texture, shifted every frame)
const gc = document.getElementById('grain'), gx = gc.getContext('2d');
const gimg = gx.createImageData(270, 480);
for (let i = 0; i < gimg.data.length; i += 4) { const v = rnd(i * .37) * 255; gimg.data[i] = gimg.data[i + 1] = gimg.data[i + 2] = v; gimg.data[i + 3] = 255; }
gx.putImageData(gimg, 0, 0);
gc.style.width = '1080px'; gc.style.height = '1920px'; gc.style.imageRendering = 'pixelated';

function seek(t) {
  curTime = t;
  const flash = document.getElementById('flash');
  flash.style.opacity = 0;
  stage.style.filter = '';
  for (const s of scenes) {
    const on = t >= s.start && t < s.end;
    s.root.style.display = on ? 'block' : 'none';
    if (on) s.update(t - s.start);
  }
  // chrome only on cards
  const ci = Math.floor((t - CARD0) / CARD_LEN);
  const inCards = t >= CARD0 && t < CARD0 + 10 * CARD_LEN;
  const cin = P(t, CARD0, CARD0 + .4) * (1 - P(t, CARD0 + 10 * CARD_LEN - .3, CARD0 + 10 * CARD_LEN));
  chrome.style.opacity = cin;
  if (inCards) {
    pill.textContent = `#${String(ci + 1).padStart(2, '0')} / 10`;
    segFills.forEach((f, k) => f.style.width = (k < ci ? 100 : k > ci ? 0 : P(t, CARD0 + ci * CARD_LEN, CARD0 + (ci + 1) * CARD_LEN) * 100) + '%');
  }
  // subtitles
  const s = SUBS.find(s => t >= s.s && t < s.e);
  if (s) {
    subEl.innerHTML = emo(esc(s.text));
    const k = P(t, s.s, s.s + .15), ko = P(t, s.e - .12, s.e);
    subWrap.style.opacity = k * (1 - ko);
    subWrap.style.transform = `translateY(${(1 - eo(k)) * 16}px)`;
  } else subWrap.style.opacity = 0;
  // grain jitter
  const f = Math.floor(t * FPS);
  gc.style.transform = `translate(${Math.floor(rnd(f) * 8 - 4)}px,${Math.floor(rnd(f + 99) * 8 - 4)}px)`;
}
// Call once at the end of an episode script, after all scenes are defined.
function finalize() {
  window.seek = seek;
  window.CUES = CUES.sort((a, b) => a.t - b.t);
  window.SUBS = SUBS;
  window.DUR = DUR; window.FPS = FPS;
  window.CONFIG = CONFIG;
  startPreview();
}

// ---------- preview mode (real time playback, ?t=start) ----------
function startPreview() {
  if (!navigator.webdriver) {
    const fit = () => { const k = Math.min(innerWidth / W, innerHeight / H); stage.style.transform = `scale(${k})`; };
    addEventListener('resize', fit); fit();
    const t0 = +(new URLSearchParams(location.search).get('t') || 0);
    const begin = performance.now();
    const loop = () => { seek((t0 + (performance.now() - begin) / 1000) % DUR); requestAnimationFrame(loop); };
    document.fonts.ready.then(loop);
  } else seek(0);
}
