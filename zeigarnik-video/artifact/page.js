// 导演手册页面：监视器播放器 + 由引擎数据生成的旁白表、字幕表、分镜卡、卡点表、提示词
(function () {
  const $ = (id) => document.getElementById(id);
  const D = ZG.META.DURATION, DOC = window.DOC;
  const fmt = (t) => t.toFixed(2).padStart(5, '0');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const shotOf = (t) => ZG.SHOTS[ZG.shotAt(t)];
  const hlHTML = (text, hl) => {
    let out = esc(text);
    (hl || []).forEach((w) => { out = out.split(esc(w)).join(`<span class="hl">${esc(w)}</span>`); });
    return out;
  };

  // ---------- 文本素材 ----------
  const voText = () => ZG.LINES.map((l) => `[${l.t0.toFixed(1)}s] ${l.text.replace(/TA/g, '他')}`).join('\n');
  const srtTime = (t) => { const ms = Math.round(t * 1000); const p = (n, k = 2) => String(n).padStart(k, '0');
    return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`; };
  const srtText = () => ZG.LINES.map((l, i) => `${i + 1}\n${srtTime(l.t0)} --> ${srtTime(l.t1)}\n${l.text}\n`).join('\n');
  const expand = (s) => Object.entries(DOC.CHAR).reduce((acc, [k, v]) => acc.split(k).join(v), s);
  const imgFull = (id) => `${expand(DOC.SHOTS[id].img)}, ${DOC.STYLE} ${DOC.MJ}`;
  const tokHTML = (s) => esc(s).replace(/\[(女主|TA|服务员|站台男生)\]/g, '<span class="tok">[$1]</span>');

  // ---------- 生成各章节 ----------
  $('vo-body').innerHTML = ZG.LINES.map((l) => `<tr><td class="tc">${fmt(l.t0)}</td><td class="vo-line">${esc(l.text.replace(/TA/g, '他'))}</td><td class="tc">${shotOf(l.t0).id}</td></tr>`).join('');
  $('sub-body').innerHTML = ZG.LINES.map((l) => `<tr><td class="tc">${fmt(l.t0)}</td><td class="tc">${fmt(l.t1)}</td><td class="vo-line">${hlHTML(l.text, l.hl)}${l.big ? ' <span class="pill">定格金句</span>' : ''}${l.hideSub ? ' <span class="pill">由标题画面承担</span>' : ''}</td></tr>`).join('');

  $('strip').innerHTML = ZG.SHOTS.map((s) => `<button type="button" class="${s.plate ? '' : 'code'}" style="flex-basis:${((s.t1 - s.t0) / D * 100).toFixed(3)}%" data-seek="${s.t0}" title="${s.id} ${esc(s.name)}">${s.id.slice(2)}</button>`).join('');

  $('shots').innerHTML = ZG.SHOTS.map((s) => {
    const d = DOC.SHOTS[s.id], lines = ZG.LINES.filter((l) => l.t0 >= s.t0 - 0.01 && l.t0 < s.t1);
    const src = /AI/.test(d.src) ? (/程序/.test(d.src) ? 'AI + 程序' : 'AI 素材') : '纯程序';
    return `<article class="card shot">
      <div class="shot-top"><span class="shot-id">${s.id}</span><h3>${esc(s.name)}</h3><span class="tc lens">${fmt(s.t0)} – ${fmt(s.t1)}</span><span class="pill ${src === '纯程序' ? 'code' : 'ai'}">${src}</span></div>
      <div class="lens">${esc(d.lens)}</div>
      ${lines.length ? `<div class="vo">${lines.map((l) => hlHTML(l.text, l.hl)).join('<br>')}</div>` : ''}
      <div class="kv"><div><span class="l">画面</span><span>${esc(d.visual)}</span></div><div><span class="l">动效</span><span>${esc(d.motion)}</span></div><div><span class="l">声音</span><span>${esc(d.sfx)}</span></div></div>
      <button class="btn seek" type="button" data-seek="${s.t0}">在监视器里看 ${s.id}</button>
    </article>`;
  }).join('');

  $('cue-body').innerHTML = ZG.CUES.slice().sort((a, b) => a.t - b.t).map((c) => `<tr class="${c.hit ? 'hit' : ''}"><td class="tc">${fmt(c.t)}</td><td>${esc(c.label)}</td><td class="tc">${shotOf(c.t).id}</td><td>${c.hit ? '<span class="pill hit">强卡点</span>' : '<span class="pill">音效</span>'}</td></tr>`).join('');

  $('style-prompt').textContent = `${DOC.STYLE} ${DOC.MJ}`;
  $('neg-prompt').textContent = DOC.NEG;
  $('char-list').innerHTML = Object.entries(DOC.CHAR).map(([k, v]) => `<div><span class="l tok" style="color:var(--cold)">${esc(k)}</span><span>${esc(v)}</span></div>`).join('');
  $('prompts').innerHTML = ZG.SHOTS.filter((s) => DOC.SHOTS[s.id].img).map((s) => {
    const d = DOC.SHOTS[s.id];
    return `<article class="card prompt">
      <div class="shot-top"><span class="shot-id">${s.id}</span><h3>${esc(s.name)}</h3><span class="tc lens">${(s.t1 - s.t0).toFixed(1)}s</span></div>
      <div class="lbl"><span>生图提示词（首帧）</span><button class="btn copy" type="button" data-copy="img:${s.id}">复制完整版</button></div><pre>${tokHTML(d.img)}</pre>
      ${d.vid ? `<div class="lbl"><span>图生视频 · 运动提示词</span><button class="btn copy" type="button" data-copy="vid:${s.id}">复制</button></div><pre>${esc(d.vid)}</pre>` : ''}
    </article>`;
  }).join('');

  // ---------- 复制 ----------
  const toast = (msg) => { const el = $('toast'); el.textContent = msg; el.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove('on'), 1600); };
  function getCopy(key) {
    if (key === 'vo') return voText();
    if (key === 'srt') return srtText();
    if (key === 'music') return $('music-prompt').textContent;
    if (key === 'style') return `${DOC.STYLE} ${DOC.MJ}`;
    if (key === 'neg') return DOC.NEG;
    const [kind, id] = key.split(':');
    return kind === 'img' ? imgFull(id) : DOC.SHOTS[id].vid;
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-copy]');
    if (b) {
      const text = getCopy(b.dataset.copy);
      const fallback = () => { const pre = b.closest('.prompt, section').querySelector('pre, tbody'); if (pre) { const r = document.createRange(); r.selectNodeContents(pre); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); } toast('已选中文本，请手动复制'); };
      try { navigator.clipboard.writeText(text).then(() => toast('已复制'), fallback); } catch (err) { fallback(); }
      return;
    }
    const s = e.target.closest('[data-seek]');
    if (s) { player.seek(+s.dataset.seek + 0.02); if (innerWidth < 1080) document.querySelector('.monitor').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); }
  });

  // ---------- 监视器 ----------
  const cv = $('cv');
  if (innerWidth >= 1080 && devicePixelRatio >= 1.5) { cv.width = 720; cv.height = 1280; }
  const r = ZG.createRenderer(cv), seekEl = $('seek'), btn = $('play');
  $('ticks').innerHTML = ZG.SHOTS.map((s) => `<span style="left:${s.t0 / D * 100}%"></span>`).join('') + ZG.CUES.filter((c) => c.hit).map((c) => `<i style="left:${c.t / D * 100}%"></i>`).join('');
  let t = 0, playing = false, ac = null, src = null, t0 = 0, off = 0, raf = 0;
  const now = () => (ac ? ac.currentTime : performance.now() / 1000);
  function draw() {
    r.render(t); seekEl.value = t;
    const s = shotOf(t); $('now').innerHTML = `<span class="tc">${fmt(t)}</span>${s.id} · ${esc(s.name)}`;
    document.querySelectorAll('#strip button').forEach((b) => b.classList.toggle('on', +b.dataset.seek === s.t0));
  }
  async function play() {
    btn.textContent = '生成音轨…';
    try { ac = ac || new AudioContext(); await ac.resume(); } catch (e) { ac = null; }
    let buf = null; try { buf = ac ? await ZG.Audio.buffer() : null; } catch (e) { buf = null; }
    off = t >= D - 0.05 ? 0 : t; t0 = now();
    if (buf && ac) { src = ac.createBufferSource(); src.buffer = buf; src.connect(ac.destination); src.start(0, off); }
    playing = true; btn.textContent = '暂停';
    const loop = () => { if (!playing) return; t = off + now() - t0; if (t >= D) { stop(); t = D - 0.001; } draw(); raf = requestAnimationFrame(loop); };
    loop();
  }
  function stop() { playing = false; cancelAnimationFrame(raf); if (src) { try { src.stop(); } catch (e) { /* 已停止 */ } src = null; } btn.textContent = '播放预演'; }
  const player = { seek(x) { const was = playing; stop(); t = Math.min(D - 0.001, Math.max(0, x)); draw(); if (was) play(); } };
  btn.onclick = () => (playing ? stop() : play());
  seekEl.oninput = () => player.seek(+seekEl.value);

  ZG.ready('assets/').then(() => { $('loading').hidden = true; t = 3.5; draw(); });
})();
