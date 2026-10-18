'use strict';
// ============================================================================
//  Player: render API for the offline pipeline (?mode=render) and a live
//  player synced to the soundtrack for the HTML version.
// ============================================================================
const TRAILER = {
  isReady: false,
  async init() {
    this.canvas = document.getElementById('stage');
    this.ctx = this.canvas.getContext('2d');
    const faces = ['900 40px "Noto Serif SC"', '900 40px "Noto Sans SC"', '700 40px "Noto Sans SC"', '40px "Ma Shan Zheng"',
      '40px "ZCOOL QingKe HuangYou"', '40px Anton', '900 40px Orbitron', '700 40px Rajdhani'];
    await Promise.all(faces.map(f => document.fonts.load(f, '外卖之王AB12')));
    await document.fonts.ready;
    Post.init();
    emitInit(this.canvas);
    World.init();
    this.isReady = true;
  },
  renderFrame(t) { renderFrame(this.ctx, t); },
  frameDataURL(t, type = 'image/jpeg', q = 0.93) { this.renderFrame(t); return this.canvas.toDataURL(type, q); },
};
window.TRAILER = TRAILER;

const ICON = {
  play: '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>',
  full: '<svg viewBox="0 0 24 24"><path d="M4 9V4h5v2H6v3zm11-5h5v5h-2V6h-3zM4 15h2v3h3v2H4zm14 3v-3h2v5h-5v-2z"/></svg>',
  replay: '<svg viewBox="0 0 24 24"><path d="M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z"/></svg>',
};

function setupLive() {
  const frame = document.getElementById('frame');
  frame.insertAdjacentHTML('beforeend', `
    <div id="start" role="button" tabindex="0" aria-label="Play trailer">
      <div class="cast"><span class="y">美团</span><span class="x"> × </span><span class="b">饿了么</span><span class="x"> × </span><span class="o">？？？</span></div>
      <h1>外卖之王</h1>
      <div class="en">KING OF DELIVERY</div>
      <button id="play" type="button">${ICON.play}<span>播放预告 · PLAY TRAILER</span></button>
      <div class="note">SOUND ON · 1080P · 1:59 · FAN-MADE PARODY</div>
    </div>
    <div id="bar">
      <button id="pp" type="button" aria-label="Play/pause">${ICON.play}</button>
      <div id="seek" aria-label="Seek"><div class="track"></div><div class="fill"></div></div>
      <div id="time">00:00 / 01:59</div>
      <button id="rp" type="button" aria-label="Restart">${ICON.replay}</button>
      <button id="fs" type="button" aria-label="Fullscreen">${ICON.full}</button>
    </div>
    <div id="hint">SPACE 播放/暂停 · ←/→ 快退/快进 · F 全屏</div>`);
  const audio = new Audio();
  audio.preload = 'auto';
  if (window.AUDIO_SRC) audio.src = window.AUDIO_SRC;
  const $ = id => document.getElementById(id);
  // clock: follow the audio when it is actually running, otherwise a wall clock
  let playing = false, tPaused = 0, clockBase = 0, clockT0 = 0;
  const wall = () => clockBase + (performance.now() - clockT0) / 1000;
  const audioOK = () => window.AUDIO_SRC && !audio.paused && audio.currentTime > 0.05;
  const now = () => {
    if (!playing) return tPaused;
    const w = wall();
    return audioOK() && Math.abs(audio.currentTime - w) < 0.25 ? audio.currentTime : w;
  };
  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const ui = () => {
    const t = Math.min(DURATION, now());
    $('seek').querySelector('.fill').style.width = (t / DURATION * 100) + '%';
    $('time').textContent = `${fmt(t)} / ${fmt(DURATION)}`;
    $('pp').innerHTML = playing ? ICON.pause : ICON.play;
  };
  const play = () => {
    if (tPaused >= DURATION - 0.05) tPaused = 0;
    clockBase = tPaused; clockT0 = performance.now(); playing = true;
    if (window.AUDIO_SRC) { audio.currentTime = tPaused; audio.play().catch(() => {}); }
    $('start').classList.add('hidden'); ui();
  };
  const pause = () => { tPaused = now(); playing = false; audio.pause(); ui(); };
  const seek = (t) => { t = clamp(t, 0, DURATION - 0.01); tPaused = t; clockBase = t; clockT0 = performance.now(); if (window.AUDIO_SRC) audio.currentTime = t; TRAILER.renderFrame(t); ui(); };
  $('start').addEventListener('click', play);
  $('pp').addEventListener('click', () => (playing ? pause() : play()));
  $('rp').addEventListener('click', () => { seek(0); play(); });
  $('fs').addEventListener('click', () => (document.fullscreenElement ? document.exitFullscreen() : frame.requestFullscreen?.()));
  const seekFromEvent = e => { const r = $('seek').getBoundingClientRect(); seek((e.clientX - r.left) / r.width * DURATION); };
  let drag = false;
  $('seek').addEventListener('pointerdown', e => { drag = true; $('seek').setPointerCapture(e.pointerId); seekFromEvent(e); });
  $('seek').addEventListener('pointermove', e => { if (drag) seekFromEvent(e); });
  $('seek').addEventListener('pointerup', () => { drag = false; });
  window.addEventListener('keydown', e => {
    if (e.code === 'Space') { e.preventDefault(); playing ? pause() : play(); }
    else if (e.code === 'ArrowRight') seek(now() + 5);
    else if (e.code === 'ArrowLeft') seek(now() - 5);
    else if (e.key === 'f' || e.key === 'F') $('fs').click();
  });
  audio.addEventListener('ended', () => { playing = false; tPaused = DURATION; ui(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && playing) pause(); });
  let last = -1;
  const loop = () => {
    if (playing) {
      if (audioOK() && Math.abs(audio.currentTime - wall()) > 0.3) { clockBase = audio.currentTime; clockT0 = performance.now(); }
      const t = now();
      if (t >= DURATION) { playing = false; tPaused = DURATION; }
      const fr = Math.floor(t * FPS);
      if (fr !== last) { last = fr; TRAILER.renderFrame(Math.min(t, DURATION - 0.01)); ui(); }
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  TRAILER.renderFrame(16.4); // poster frame behind the start screen
}

const MODE = new URLSearchParams(location.search).get('mode');
if (MODE === 'render') document.body.classList.add('render');
TRAILER.init().then(() => { if (MODE !== 'render') setupLive(); }).catch(e => console.error('init failed', e));
