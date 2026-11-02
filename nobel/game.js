/* Quests, gems and conversations layered over the Nobel monograph.
   Chapters after an unanswered quest stay hidden; each correct answer
   earns a gem and opens the next chapter. Progress is kept in
   localStorage for this viewer only. */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(pointer: fine)').matches;
  var KEY = 'nobel-quest-v1';
  var state = { solved: [], sound: true, demo: false };
  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && Array.isArray(saved.solved)) { state.solved = saved.solved; state.sound = saved.sound !== false; state.demo = !!saved.demo; }
  } catch (e) { /* storage unavailable: play without saving */ }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } }
  function solved(n) { return state.solved.indexOf(n) !== -1; }
  function streak() { var n = 0; while (solved(n + 1)) n++; return n; }
  var G = function () { return window.gsap || null; };

  /* ---------- gems ---------- */
  var GEMS = [
    { name: '黑玉', cut: 'round', c: ['#5a5e69', '#25272e', '#0c0d11'], note: '维多利亚时代，人们用黑玉做哀悼首饰。' },
    { name: '黄水晶', cut: 'pear', c: ['#fbe49a', '#e9b949', '#b5821a'], note: '淡黄色，像一滴硝化甘油。' },
    { name: '蛋白石', cut: 'oval', c: ['#e6f3fc', '#f5d3ea', '#c9ead2'], note: '和硅藻的外壳一样，主要成分是含水的二氧化硅。' },
    { name: '赤铁矿', cut: 'cushion', c: ['#a3a9b1', '#5b6068', '#2a2d32'], note: '一种铁矿石。博福斯最早是一座铁工厂。' },
    { name: '钻石', cut: 'brilliant', c: ['#ffffff', '#d9ebf7', '#9fc0d8'], note: '最清澈的一颗，留给那份不分国籍的遗嘱。' },
    { name: '紫水晶', cut: 'marquise', c: ['#cfa9ee', '#8b5fbf', '#4f2c7b'], note: '夜色一样的紫，配他写给自己的那段简介。' },
    { name: '红宝石', cut: 'princess', c: ['#f3808d', '#c4243b', '#760d1e'], note: '最后一颗，献给 1901 年的第一届颁奖。' }
  ];
  function roundCut() {
    var o = 'M20 4A16 16 0 1 1 19.99 4Z', f = '', i, a, t = [];
    for (i = 0; i < 8; i++) { a = (i / 8) * Math.PI * 2 - Math.PI / 2; t.push([20 + Math.cos(a) * 8, 20 + Math.sin(a) * 8]); }
    f += 'M' + t.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join('L') + 'Z';
    for (i = 0; i < 8; i++) {
      a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      var b1 = a - Math.PI / 8, b2 = a + Math.PI / 8;
      f += 'M' + t[i][0].toFixed(1) + ' ' + t[i][1].toFixed(1) + 'L' + (20 + Math.cos(b1) * 16).toFixed(1) + ' ' + (20 + Math.sin(b1) * 16).toFixed(1);
      f += 'M' + t[i][0].toFixed(1) + ' ' + t[i][1].toFixed(1) + 'L' + (20 + Math.cos(b2) * 16).toFixed(1) + ' ' + (20 + Math.sin(b2) * 16).toFixed(1);
    }
    return { o: o, f: f, h: 'M12 12L17 9L15 15Z' };
  }
  var CUTS = {
    round: roundCut(),
    pear: { o: 'M20 3C26 10 33 18 33 25A13 13 0 0 1 7 25C7 18 14 10 20 3Z', f: 'M20 13C23 17 26 21 26 25A6 6 0 0 1 14 25C14 21 17 17 20 13ZM20 3L20 13M7 25L14 25M33 25L26 25M20 38L20 31M11 15L16 19M29 15L24 19M10 34L16 29M30 34L24 29', h: 'M14 21L17 16L18 20Z' },
    oval: { o: 'M20 3A13 17 0 1 1 19.99 3Z', f: 'M20 11A6 9 0 1 1 19.99 11ZM20 3L20 11M20 37L20 29M7 20L14 20M33 20L26 20M11 8L16 13M29 8L24 13M11 32L16 27M29 32L24 27', h: 'M13 15L16 10L17 15Z' },
    cushion: { o: 'M10 5H30L35 10V30L30 35H10L5 30V10Z', f: 'M13 10H27L30 13V27L27 30H13L10 27V13ZM10 5L13 10M30 5L27 10M35 30L30 27M5 30L10 27M5 10L10 13M35 10L30 13M10 35L13 30M30 35L27 30M16 15H24V25H16Z', h: 'M14 8H22L20 10H14Z' },
    brilliant: { o: 'M6 15L13 6H27L34 15L20 35Z', f: 'M6 15H34M13 6L17 15L20 6L23 15L27 6M17 15L20 35L23 15M10 15L20 35L30 15', h: 'M13 8L16 7L15 13Z' },
    marquise: { o: 'M20 3Q36 20 20 37Q4 20 20 3Z', f: 'M20 10Q28 20 20 30Q12 20 20 10ZM20 3L20 10M20 37L20 30M9 20L15 20M31 20L25 20M13 11L17 15M27 11L23 15M13 29L17 25M27 29L23 25', h: 'M15 15L19 9L18 16Z' },
    princess: { o: 'M6 6H34V34H6Z', f: 'M6 6L34 34M34 6L6 34M12 12H28V28H12ZM20 6L20 12M20 34L20 28M6 20L12 20M34 20L28 20', h: 'M8 8L16 8L8 16Z' }
  };
  var uid = 0;
  function gemSVG(i, filled) {
    var g = GEMS[i], s = CUTS[g.cut], id = 'gg' + (uid++);
    if (!filled) return '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="' + s.o + '" fill="none" stroke="currentColor" stroke-width="1.1" stroke-dasharray="2.4 2.2"/></svg>';
    return '<svg viewBox="0 0 40 40" aria-hidden="true"><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + g.c[0] + '"/><stop offset=".55" stop-color="' + g.c[1] + '"/><stop offset="1" stop-color="' + g.c[2] + '"/></linearGradient></defs>' +
      '<path d="' + s.o + '" fill="url(#' + id + ')" stroke="#131922" stroke-width="1"/>' +
      '<path d="' + s.f + '" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width=".7"/>' +
      '<path d="' + s.h + '" fill="#fff" fill-opacity=".7"/></svg>';
  }

  /* ---------- sound (synthesised, only after a click) ---------- */
  var actx = null;
  function ac() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; } } return actx; }
  function tone(a, f, t, d, type, v) {
    var o = a.createOscillator(), g = a.createGain();
    o.type = type || 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, a.currentTime + t);
    g.gain.exponentialRampToValueAtTime(v || 0.12, a.currentTime + t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + t + d);
    o.connect(g).connect(a.destination); o.start(a.currentTime + t); o.stop(a.currentTime + t + d + 0.05);
  }
  function noise(a, d, from, to, v) {
    var len = Math.floor(a.sampleRate * d), buf = a.createBuffer(1, len, a.sampleRate), ch = buf.getChannelData(0);
    for (var i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
    var s = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain();
    s.buffer = buf; fl.type = 'lowpass'; fl.frequency.setValueAtTime(from, a.currentTime); fl.frequency.exponentialRampToValueAtTime(to, a.currentTime + d);
    g.gain.value = v; s.connect(fl).connect(g).connect(a.destination); s.start();
  }
  var SFX = {
    tap: function (a) { tone(a, 660, 0, 0.08, 'triangle', 0.05); },
    right: function (a) { [784, 988, 1175, 1568].forEach(function (f, i) { tone(a, f, i * 0.07, 0.6, 'sine', 0.09); }); },
    wrong: function (a) { tone(a, 196, 0, 0.18, 'square', 0.04); tone(a, 147, 0.12, 0.26, 'square', 0.04); },
    gem: function (a) { [1319, 1760, 2093].forEach(function (f, i) { tone(a, f, i * 0.05, 0.9, 'sine', 0.06); }); },
    boom: function (a) { noise(a, 1.4, 2400, 60, 0.9); tone(a, 55, 0, 0.8, 'sine', 0.3); },
    unlock: function (a) { noise(a, 0.5, 300, 4000, 0.12); tone(a, 523, 0.18, 0.4, 'sine', 0.06); },
    sign: function (a) { noise(a, 0.35, 5000, 2000, 0.05); }
  };
  function play(n) {
    if (!state.sound) return;
    var a = ac(); if (!a) return;
    if (a.state === 'suspended') a.resume();
    try { SFX[n](a); } catch (e) { /* ignore */ }
  }

  /* ---------- shell: HUD, toast, panel, flash ---------- */
  var hud = document.querySelector('.hud');
  var socks = hud.querySelector('.hud__gems');
  var countEl = hud.querySelector('.hud__count');
  GEMS.forEach(function (g, i) {
    var s = document.createElement('span');
    s.className = 'sock'; s.dataset.i = i; s.title = g.name;
    socks.appendChild(s);
  });
  function paintHud() {
    Array.prototype.forEach.call(socks.children, function (s, i) {
      var on = solved(i + 1);
      if (s.dataset.on !== String(on)) { s.innerHTML = gemSVG(i, on); s.dataset.on = String(on); }
    });
    countEl.textContent = state.solved.length + ' / 7';
    hud.querySelector('[data-act="sound"]').setAttribute('aria-pressed', String(state.sound));
  }
  var toastEl = document.querySelector('.toast'), toastT = 0;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('is-on');
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2600);
  }
  var flash = document.querySelector('.flash');
  function boom() {
    play('boom');
    var g = G();
    if (!g || reduce) { toast('砰！'); return; }
    g.fromTo(flash, { opacity: 0.95 }, { opacity: 0, duration: 1.1, ease: 'power2.out' });
    g.fromTo('main', { x: 0 }, { keyframes: { x: [-14, 12, -9, 7, -4, 2, 0] }, duration: 0.55, ease: 'none', clearProps: 'transform' });
  }

  var panel = document.querySelector('.panel'), lastFocus = null;
  function paintPanel() {
    var list = panel.querySelector('.panel__list');
    list.innerHTML = '';
    GEMS.forEach(function (g, i) {
      var on = solved(i + 1), li = document.createElement('li');
      li.className = on ? 'is-on' : '';
      li.innerHTML = '<span class="panel__gem">' + gemSVG(i, on) + '</span><span><b>' + (on ? g.name : '第 ' + (i + 1) + ' 颗') + '</b><small>' + (on ? g.note : '答对第 ' + (i + 1) + ' 关后获得') + '</small></span>';
      list.appendChild(li);
    });
    panel.querySelector('[data-act="demo"]').setAttribute('aria-pressed', String(state.demo));
  }
  function openPanel() { lastFocus = document.activeElement; paintPanel(); panel.hidden = false; requestAnimationFrame(function () { panel.classList.add('is-open'); }); panel.querySelector('.panel__close').focus(); }
  function closePanel() { panel.classList.remove('is-open'); setTimeout(function () { panel.hidden = true; }, 260); if (lastFocus) lastFocus.focus(); }
  hud.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.act === 'sound') { state.sound = !state.sound; save(); paintHud(); if (state.sound) play('tap'); toast(state.sound ? '音效已打开' : '音效已关闭'); }
    if (b.dataset.act === 'panel') { play('tap'); openPanel(); }
  });
  panel.addEventListener('click', function (e) {
    if (e.target === panel || e.target.closest('.panel__close')) { closePanel(); return; }
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.act === 'demo') { state.demo = !state.demo; save(); applyLocks(); paintPanel(); toast(state.demo ? '演示模式：全部章节已解锁' : '演示模式已关闭'); }
    if (b.dataset.act === 'reset') {
      state.solved = []; state.demo = false; save();
      toast('进度已清空，从第一关重新开始'); closePanel();
      setTimeout(function () { location.hash = ''; location.reload(); }, 600);
    }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) closePanel(); });

  /* ---------- chapter locks ---------- */
  var locks = Array.prototype.slice.call(document.querySelectorAll('.chap-lock'));
  function refresh() { if (window.ScrollTrigger) requestAnimationFrame(function () { window.ScrollTrigger.refresh(); }); }
  function applyLocks(initial) {
    var n = state.demo ? 99 : streak(), changed = false;
    locks.forEach(function (el) {
      var open = n >= +el.dataset.lock - 1;
      if (el.hidden === open) { el.hidden = !open; changed = true; }
    });
    document.querySelectorAll('.quest').forEach(function (q) {
      var k = +q.dataset.quest, lock = q.querySelector('.quest__lock');
      if (lock) lock.classList.toggle('is-open', n >= k);
    });
    document.querySelectorAll('.rail a').forEach(function (a) {
      var t = document.querySelector(a.getAttribute('href'));
      var locked = !!(t && t.closest('[hidden]'));
      a.classList.toggle('is-locked', locked);
      a.setAttribute('aria-disabled', String(locked));
    });
    if (changed && !initial) refresh();
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]'); if (!a) return;
    var t = document.querySelector(a.getAttribute('href'));
    if (t && t.closest('[hidden]')) {
      e.preventDefault(); e.stopImmediatePropagation();
      toast('这一章还锁着：先答对前面的题目，拿到宝石');
      play('wrong');
    }
  }, true);
  function goTo(el) {
    var n = window.__nobel && window.__nobel.lenis;
    if (n) n.scrollTo(el, { duration: 1.6, offset: -10 }); else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }

  /* ---------- quests ---------- */
  var QUESTS = {
    1: { type: 'single', q: '1888 年那份讣告登出时，真正去世的是谁？', opts: ['阿尔弗雷德·诺贝尔', '他的哥哥路德维希', '他的弟弟埃米尔', '他的父亲伊曼纽尔'], a: 1,
      hint: '再看看开头那张椭圆形的肖像。', why: '1888 年 4 月死在戛纳的是哥哥路德维希。弟弟埃米尔死于 1864 年海勒内堡的爆炸。', next: '第二章　一滴油' },
    2: { type: 'eq', q: '把爆炸方程式补完整：二氧化碳前面应该是几？', opts: ['6', '9', '12', '15'], a: 2,
      hint: '数一数：4 个分子里一共有多少个碳原子？', why: '每个硝化甘油分子有 3 个碳，4 个分子就是 12 个碳，每个二氧化碳用掉 1 个，所以是 12。', next: '第三章　一把土' },
    3: { type: 'drag', q: '1867 年，诺贝尔用什么吸住了硝化甘油？把它拖进烧杯，也可以直接点。', opts: ['铁屑', '硅藻土', '食盐', '砂糖'], a: 1,
      hint: '它由远古的微小生物的外壳堆积而成。', why: '硅藻土布满微孔。大约三份硝化甘油配一份硅藻土，就成了可以揉捏的膏体：炸药。', next: '第四章　工厂与和平' },
    4: { type: 'order', q: '按时间先后，依次点出这四件事。', items: [['买下博福斯工厂', 1894], ['索布雷罗合成硝化甘油', 1847], ['炸药在瑞典取得专利', 1867], ['诺贝尔为雷管申请专利', 1864]],
      hint: '最早的那件事，诺贝尔还没有参与。', why: '1847 硝化甘油，1864 雷管，1867 炸药，1894 博福斯。', next: '第五章　遗嘱' },
    5: { type: 'multi', q: '遗嘱里设了哪五个奖？选出五个，再提交。', opts: ['物理学', '化学', '数学', '生理学或医学', '文学', '经济学', '和平'], a: [0, 1, 3, 4, 6],
      hint: '有一个奖是 1968 年才加上的，还有一个从来没有设过。', why: '遗嘱里没有数学奖。经济学奖是 1968 年瑞典中央银行出资设立的，不在遗嘱里。', next: '第六章　自画像' },
    6: { type: 'single', q: '在给自己写的简介里，他“唯一的愿望”是什么？', opts: ['得到一枚勋章', '不要被活埋', '回到瑞典定居', '再发明一种炸药'], a: 1,
      hint: '这个愿望，他在遗嘱的最后一条里又写了一次。', why: '所以遗嘱的最后一条，是请医生在他死后切开动脉，确认死亡后再火化。', next: '第七章　1901' },
    7: { type: 'single', q: '第一届诺贝尔物理学奖，颁给了谁？', opts: ['玛丽·居里', '阿尔伯特·爱因斯坦', '威廉·伦琴', '欧内斯特·卢瑟福'], a: 2,
      hint: '他发现了一种能穿透人体的射线。', why: '1901 年，伦琴因发现 X 射线获奖。居里夫妇 1903 年获物理学奖，爱因斯坦是 1921 年度，卢瑟福得的是 1908 年化学奖。', next: '终章' }
  };
  var LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  var LOCK_ICON = '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="4" y="9" width="12" height="9" rx="1" fill="none" stroke="currentColor"/><path d="M7 9V6a3 3 0 0 1 6 0v3" fill="none" stroke="currentColor"/></svg>';

  function buildQuest(sec) {
    var k = +sec.dataset.quest, Q = QUESTS[k], gi = k - 1;
    var card = document.createElement('div');
    card.className = 'quest__card';
    card.innerHTML =
      '<div class="quest__gem"><div class="gemshow">' + gemSVG(gi, false) + '<span class="gemshow__q">?</span></div>' +
      '<p class="quest__gemname">第 ' + k + ' 颗宝石</p><p class="quest__gemnote">答对后揭晓</p></div>' +
      '<div class="quest__main"><p class="label">第 ' + k + ' 关　答对得到一颗宝石，解锁下一章</p>' +
      '<h3 class="quest__q" id="q' + k + '-t">' + Q.q + '</h3>' +
      (Q.type === 'eq' ? '<p class="quest__eq latin">4 C<sub>3</sub>H<sub>5</sub>N<sub>3</sub>O<sub>9</sub> → <span class="blank">?</span> CO<sub>2</sub> + 10 H<sub>2</sub>O + 6 N<sub>2</sub> + O<sub>2</sub></p>' : '') +
      '<div class="quest__play"></div><p class="quest__fb" aria-live="polite"></p>' +
      '<div class="quest__why" hidden><p>' + Q.why + '</p><button type="button" class="btn quest__next">继续：' + Q.next + ' ↓</button></div></div>';
    sec.appendChild(card);
    var lock = document.createElement('p');
    lock.className = 'quest__lock';
    lock.innerHTML = LOCK_ICON + '<span class="quest__lock-t">下一章「' + Q.next + '」已锁住。答对上面的题目即可解锁。</span>';
    if (k < 8) sec.appendChild(lock);
    var stage = card.querySelector('.quest__play');
    var api = { k: k, Q: Q, card: card, sec: sec, done: false };
    if (Q.type === 'single' || Q.type === 'eq') buildChoice(api, stage);
    if (Q.type === 'drag') buildDrag(api, stage);
    if (Q.type === 'order') buildOrder(api, stage);
    if (Q.type === 'multi') buildMulti(api, stage);
    card.querySelector('.quest__next').addEventListener('click', function () {
      play('tap');
      var nextLock = locks.filter(function (l) { return +l.dataset.lock === k + 1; })[0];
      var target = nextLock && nextLock.firstElementChild;
      if (target && !nextLock.hidden) goTo(target);
    });
    if (solved(k)) win(api, true);
    return api;
  }
  function fb(api, msg, bad) {
    var el = api.card.querySelector('.quest__fb');
    el.textContent = msg; el.classList.toggle('is-bad', !!bad);
  }
  function wrong(api, el) {
    play('wrong');
    fb(api, '不对。提示：' + api.Q.hint, true);
    var g = G();
    if (g && el && !reduce) g.fromTo(el, { x: 0 }, { keyframes: { x: [-8, 7, -5, 3, 0] }, duration: 0.4, ease: 'none' });
  }
  function win(api, silent) {
    if (api.done) return;
    api.done = true;
    var k = api.k, gi = k - 1, gem = GEMS[gi];
    if (!solved(k)) { state.solved.push(k); save(); }
    api.card.classList.add('is-won');
    var show = api.card.querySelector('.gemshow');
    show.innerHTML = gemSVG(gi, true) + '<span class="gemshow__burst" aria-hidden="true"></span>';
    api.card.querySelector('.quest__gemname').textContent = gem.name;
    api.card.querySelector('.quest__gemnote').textContent = gem.note;
    api.card.querySelectorAll('.quest__play button').forEach(function (b) { b.disabled = true; });
    var eqBlank = api.card.querySelector('.blank'); if (eqBlank) eqBlank.textContent = '12';
    fb(api, silent ? '已答对，获得宝石：' + gem.name : '答对了！获得宝石：' + gem.name, false);
    var why = api.card.querySelector('.quest__why'); why.hidden = false;
    var g = G();
    if (!silent) {
      play('right');
      if (g && !reduce) {
        g.fromTo(show.querySelector('svg'), { scale: 0.4, rotation: -40, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: 0.9, ease: 'back.out(2.2)' });
        g.fromTo(show.querySelector('.gemshow__burst'), { scale: 0.3, opacity: 1 }, { scale: 1.8, opacity: 0, duration: 1, ease: 'power2.out' });
        g.from(why, { opacity: 0, y: 14, duration: 0.7, delay: 0.3, ease: 'power3.out' });
        setTimeout(function () { fly(show, gi); }, 650);
      } else { paintHud(); }
      setTimeout(function () {
        applyLocks();
        if (k < 7) { play('unlock'); toast('获得「' + gem.name + '」，下一章已解锁'); }
        if (state.solved.length === 7) { toast('七颗宝石集齐！终章已打开'); paintFinale(true); }
      }, 1300);
    } else { paintHud(); }
  }
  function fly(fromEl, gi) {
    var g = G(), sock = socks.children[gi];
    if (!g || !sock) { paintHud(); return; }
    var a = fromEl.getBoundingClientRect(), b = sock.getBoundingClientRect();
    var f = document.createElement('div');
    f.className = 'flyer'; f.innerHTML = gemSVG(gi, true);
    f.style.left = a.left + 'px'; f.style.top = a.top + 'px'; f.style.width = a.width + 'px'; f.style.height = a.height + 'px';
    document.body.appendChild(f);
    var dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
    g.timeline({ onComplete: function () { f.remove(); paintHud(); play('gem'); g.fromTo(sock, { scale: 1.9 }, { scale: 1, duration: 0.6, ease: 'back.out(3)' }); } })
      .to(f, { x: dx, duration: 1, ease: 'power2.inOut' }, 0)
      .to(f, { y: dy, duration: 1, ease: 'back.in(1.3)' }, 0)
      .to(f, { scale: b.width / a.width, rotation: 360, duration: 1, ease: 'power2.in' }, 0);
  }
  function buildChoice(api, box) {
    var grid = document.createElement('div');
    grid.className = 'quest__opts'; grid.setAttribute('role', 'group'); grid.setAttribute('aria-labelledby', 'q' + api.k + '-t');
    api.Q.opts.forEach(function (o, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'opt';
      b.innerHTML = '<span class="k">' + LETTERS[i] + '</span><span>' + o + '</span>';
      b.addEventListener('click', function () {
        if (api.done) return;
        if (i === api.Q.a) { b.classList.add('is-right'); win(api); }
        else { b.classList.add('is-wrong'); wrong(api, b); }
      });
      grid.appendChild(b);
    });
    box.appendChild(grid);
    if (solved(api.k)) grid.children[api.Q.a].classList.add('is-right');
  }
  function buildDrag(api, box) {
    box.innerHTML =
      '<div class="lab"><div class="lab__tiles" role="group" aria-label="可选材料"></div>' +
      '<div class="lab__beaker" aria-label="烧杯"><svg viewBox="0 0 120 140" aria-hidden="true">' +
      '<path class="lab__liquid" d="M22 70 H98 V118 Q98 128 88 128 H32 Q22 128 22 118 Z"/>' +
      '<path d="M16 14 H104 M22 14 V118 Q22 128 32 128 H88 Q98 128 98 118 V14" fill="none" stroke="currentColor" stroke-width="2"/>' +
      '<path d="M30 40 H40 M30 60 H44 M30 80 H40 M30 100 H44" stroke="currentColor" stroke-width="1"/></svg>' +
      '<span class="lab__cap">硝化甘油</span></div></div>';
    var tiles = box.querySelector('.lab__tiles'), beaker = box.querySelector('.lab__beaker');
    api.Q.opts.forEach(function (o, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'opt tile'; b.innerHTML = '<span class="k">' + LETTERS[i] + '</span><span>' + o + '</span>';
      tiles.appendChild(b);
      var sx = 0, sy = 0, dragging = false, pid = null;
      function over(e) { var r = beaker.getBoundingClientRect(); return e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom; }
      b.addEventListener('pointerdown', function (e) { if (api.done) return; pid = e.pointerId; sx = e.clientX; sy = e.clientY; dragging = false; b.setPointerCapture(pid); });
      b.addEventListener('pointermove', function (e) {
        if (pid !== e.pointerId) return;
        var dx = e.clientX - sx, dy = e.clientY - sy;
        if (!dragging && Math.hypot(dx, dy) > 6) { dragging = true; b.classList.add('is-drag'); }
        if (dragging) { b.style.transform = 'translate(' + dx + 'px,' + dy + 'px) rotate(' + (dx * 0.03) + 'deg)'; beaker.classList.toggle('is-hot', over(e)); }
      });
      b.addEventListener('pointerup', function (e) {
        if (pid !== e.pointerId) return;
        pid = null; beaker.classList.remove('is-hot'); b.classList.remove('is-drag');
        if (dragging) { var hit = over(e); b.style.transform = ''; if (hit) drop(i, b); }
      });
      b.addEventListener('click', function () { if (!dragging) drop(i, b); dragging = false; });
    });
    function drop(i, b) {
      if (api.done) return;
      if (i === api.Q.a) {
        b.classList.add('is-right'); beaker.classList.add('is-calm');
        var g = G(); if (g && !reduce) g.fromTo(beaker, { rotation: -4 }, { rotation: 0, duration: 0.8, ease: 'elastic.out(1, 0.4)' });
        win(api);
      } else {
        b.classList.add('is-wrong'); wrong(api, beaker);
        api.card.querySelector('.quest__fb').textContent = '「' + api.Q.opts[i] + '」吸不住这滴油。提示：' + api.Q.hint;
      }
    }
    if (solved(api.k)) { beaker.classList.add('is-calm'); tiles.children[api.Q.a].classList.add('is-right'); }
  }
  function buildOrder(api, box) {
    var grid = document.createElement('div');
    grid.className = 'quest__opts quest__opts--order';
    var picked = [];
    api.Q.items.forEach(function (it, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'opt';
      b.innerHTML = '<span class="k n">·</span><span>' + it[0] + '</span><span class="yr latin"></span>';
      b.addEventListener('click', function () {
        if (api.done || picked.indexOf(i) !== -1) return;
        play('tap');
        picked.push(i); b.classList.add('is-picked'); b.querySelector('.n').textContent = picked.length;
        if (picked.length === api.Q.items.length) {
          var years = picked.map(function (p) { return api.Q.items[p][1]; });
          var ok = years.every(function (y, j) { return j === 0 || y > years[j - 1]; });
          if (ok) {
            Array.prototype.forEach.call(grid.children, function (c, j) { c.classList.add('is-right'); c.querySelector('.yr').textContent = api.Q.items[j][1]; });
            win(api);
          } else {
            wrong(api, grid);
            setTimeout(function () {
              picked = [];
              Array.prototype.forEach.call(grid.children, function (c) { c.classList.remove('is-picked'); c.querySelector('.n').textContent = '·'; });
            }, 900);
          }
        }
      });
      grid.appendChild(b);
    });
    box.appendChild(grid);
    if (solved(api.k)) Array.prototype.forEach.call(grid.children, function (c, j) { c.classList.add('is-right'); c.querySelector('.yr').textContent = api.Q.items[j][1]; });
  }
  function buildMulti(api, box) {
    var grid = document.createElement('div');
    grid.className = 'quest__opts quest__opts--multi';
    var sel = [];
    api.Q.opts.forEach(function (o, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'opt'; b.setAttribute('aria-pressed', 'false');
      b.innerHTML = '<span class="k">' + LETTERS[i] + '</span><span>' + o + '</span>';
      b.addEventListener('click', function () {
        if (api.done) return;
        play('tap');
        var j = sel.indexOf(i);
        if (j === -1) sel.push(i); else sel.splice(j, 1);
        b.setAttribute('aria-pressed', String(j === -1));
        submit.textContent = '提交答案（已选 ' + sel.length + ' 个）';
      });
      grid.appendChild(b);
    });
    var submit = document.createElement('button');
    submit.type = 'button'; submit.className = 'btn quest__submit'; submit.textContent = '提交答案（已选 0 个）';
    submit.addEventListener('click', function () {
      if (api.done) return;
      var right = sel.length === api.Q.a.length && api.Q.a.every(function (x) { return sel.indexOf(x) !== -1; });
      if (right) {
        api.Q.a.forEach(function (x) { grid.children[x].classList.add('is-right'); });
        win(api);
      } else {
        sel.forEach(function (x) { if (api.Q.a.indexOf(x) === -1) grid.children[x].classList.add('is-wrong'); });
        wrong(api, grid);
        setTimeout(function () { Array.prototype.forEach.call(grid.children, function (c) { c.classList.remove('is-wrong'); }); }, 1400);
      }
    });
    box.appendChild(grid); box.appendChild(submit);
    if (solved(api.k)) api.Q.a.forEach(function (x) { grid.children[x].classList.add('is-right'); });
  }

  /* ---------- conversations ---------- */
  var TALKS = {
    obit: { who: '阿尔弗雷德·诺贝尔', where: '巴黎，1888 年 4 月', start: 'a', nodes: {
      a: { n: ['早上好。你手里拿的，是今天的报纸？'], c: [['把讣告递给他', 'b'], ['先把报纸收起来', 'c']] },
      b: { n: ['“死亡商人已死。”……', '死的是我哥哥路德维希。他们弄错了人。', '可那几句评语，写的是我。'], c: [['报纸乱写罢了', 'd'], ['您希望被人怎样记住？', 'e']] },
      c: { n: ['不必收。路德维希在戛纳走了，我已经知道。', '倒是报上写我的那几句，让我想了很久。'], c: [['报纸乱写罢了', 'd'], ['您希望被人怎样记住？', 'e']] },
      d: { n: ['也许。可一个人很少有机会，在活着的时候读到自己的讣告。'], next: 'f' },
      e: { n: ['这个问题，我得想很久。'], next: 'f' },
      f: { s: '七年后，他写下了一份遗嘱。', end: true } } },
    lab: { who: '实验台', where: '斯德哥尔摩，1864 年', avatar: 'drop', start: 'a', nodes: {
      a: { s: '桌上有一小瓶淡黄色的油：硝化甘油。你打算怎么做？', c: [['轻轻拿起来', 'b'], ['摇一摇，看看会怎样', 'c', 'boom'], ['放到火上加热', 'c', 'boom']] },
      b: { s: '你很小心，它没有反应。可运输路上的颠簸和磕碰，谁也控制不了。', next: 'd' },
      c: { s: '砰！撞击和加热都可能让它爆炸。1864 年 9 月 3 日，海勒内堡的工棚就是这样炸毁的，五人遇难。', next: 'd' },
      d: { n: ['我得让它安静下来。'], who: '诺贝尔', end: true } } },
    bertha: { who: '阿尔弗雷德·诺贝尔', where: '伯尔尼，1892 年', start: 'a', intro: '这一段里，你扮演贝尔塔·冯·苏特纳。', nodes: {
      a: { n: ['贝尔塔，又在为和平大会奔走？'], c: [['请您资助我们的和平大会', 'b'], ['您的炸药会让战争更可怕吗？', 'c']] },
      b: { n: ['我可以捐一些钱。可光靠开会，就能让各国放下武器吗？'], next: 'c' },
      c: { n: ['我倒觉得，也许我的工厂会比你们的大会更早终结战争。', '等到两支军队能在一秒钟内同归于尽，各国都会害怕，解散军队。'], c: [['武器只会越造越多', 'd'], ['也许您说得对', 'e']] },
      d: { n: ['……也许你是对的。我会再想想。'], next: 'f' },
      e: { n: ['但愿如此。'], next: 'f' },
      f: { s: '三年后，他在遗嘱里给“和平”留了一份奖金。1905 年，这份奖颁给了你：贝尔塔·冯·苏特纳。', end: true } } },
    will: { who: '阿尔弗雷德·诺贝尔', where: '巴黎，1895 年 11 月', start: 'a', nodes: {
      a: { n: ['如果你有一大笔钱，会把它留给谁？'], c: [['留给家人', 'b'], ['留给自己的国家', 'c'], ['留给为人类贡献最大的人，不论国籍', 'd']] },
      b: { n: ['我的侄子侄女会得到一些。但绝大部分，我另有打算。'], next: 'e' },
      c: { n: ['我是瑞典人。可我不希望这些奖只属于瑞典。'], next: 'e' },
      d: { n: ['我们想的一样。'], next: 'e' },
      e: { n: ['那就签吧。'], action: 'sign', next: 'f' },
      f: { s: '1895 年 11 月 27 日，巴黎瑞典－挪威俱乐部。证人在场，遗嘱签署完毕。', end: true } } }
  };
  var DROP_AVA = '<svg viewBox="0 0 200 250" aria-hidden="true"><path d="M100 8 C 96 40, 28 112, 28 164 A 72 72 0 0 0 172 164 C 172 112, 104 40, 100 8 Z" fill="#f7edaf" stroke="#131922" stroke-width="6"/></svg>';

  function wait(ms) { return new Promise(function (r) { setTimeout(r, reduce ? 0 : ms); }); }
  function buildTalk(sec) {
    var T = TALKS[sec.dataset.talk];
    sec.innerHTML =
      '<div class="talk"><div class="talk__head"><span class="talk__ava">' +
      (T.avatar === 'drop' ? DROP_AVA : '<img src="assets/alfred-profile.webp" alt="">') +
      '</span><span><span class="talk__who">' + T.who + '</span><span class="talk__where">' + T.where + '</span></span><span class="talk__tag">情景对话</span></div>' +
      (T.intro ? '<p class="talk__intro">' + T.intro + '</p>' : '') +
      '<div class="talk__log" aria-live="polite"></div><div class="talk__choices"></div></div>' +
      '<p class="talk__note">根据史料改写的情景，台词不是原话；诺贝尔对苏特纳说的那段话，见于她的回忆录。</p>';
    var log = sec.querySelector('.talk__log'), box = sec.querySelector('.talk__choices'), skip = null;
    log.addEventListener('click', function () { if (skip) skip(); });
    function bubble(cls, text, typed) {
      var b = document.createElement('p');
      b.className = 'bub ' + cls; log.appendChild(b);
      var g = G();
      if (g && !reduce) g.from(b, { opacity: 0, y: 10, duration: 0.4, ease: 'power3.out' });
      if (!typed || reduce) { b.textContent = text; return Promise.resolve(); }
      return new Promise(function (res) {
        var i = 0, chars = Array.from(text), t = 0;
        function finish() { clearTimeout(t); b.textContent = text; skip = null; res(); }
        skip = finish;
        (function step() { i++; b.textContent = chars.slice(0, i).join(''); if (i >= chars.length) { skip = null; res(); } else t = setTimeout(step, 34); })();
      });
    }
    function typing() {
      var d = document.createElement('p'); d.className = 'bub bub--n bub--typing'; d.innerHTML = '<i></i><i></i><i></i>';
      log.appendChild(d); return wait(520).then(function () { d.remove(); });
    }
    function lines(arr) {
      return arr.reduce(function (p, line) { return p.then(typing).then(function () { return bubble('bub--n', line, true); }).then(function () { return wait(260); }); }, Promise.resolve());
    }
    function choices(list) {
      box.innerHTML = '';
      list.forEach(function (c) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'choice'; b.textContent = c[0];
        b.addEventListener('click', function () {
          play('tap'); box.innerHTML = '';
          bubble('bub--y', c[0], false).then(function () {
            if (c[2] === 'boom') boom();
            return wait(c[2] === 'boom' ? 900 : 380);
          }).then(function () { run(c[1]); });
        });
        box.appendChild(b);
      });
      var g = G(); if (g && !reduce) g.from(box.children, { opacity: 0, y: 8, stagger: 0.08, duration: 0.35, ease: 'power3.out' });
    }
    function sign() {
      return new Promise(function (res) {
        box.innerHTML = '<div class="sign"><svg class="sign__svg" viewBox="0 0 420 70" aria-hidden="true"><text x="10" y="52">Alfred Bernhard Nobel</text></svg>' +
          '<button type="button" class="btn sign__btn"><span class="sign__fill"></span><span class="sign__t">按住签名</span></button></div>';
        var btn = box.querySelector('.sign__btn'), fill = box.querySelector('.sign__fill'), svgEl = box.querySelector('.sign__svg'), txt = svgEl.querySelector('text');
        function reveal(p) { svgEl.style.clipPath = 'inset(0 ' + (100 - p * 100).toFixed(1) + '% 0 0)'; }
        reveal(0);
        var t0 = 0, raf = 0, done = false, HOLD = reduce ? 1 : 1400;
        function tick(now) {
          var p = Math.min(1, (now - t0) / HOLD);
          fill.style.transform = 'scaleX(' + p + ')';
          reveal(p);
          if (p >= 1) { done = true; complete(); return; }
          raf = requestAnimationFrame(tick);
        }
        function start(e) { if (done) return; e.preventDefault(); play('sign'); t0 = performance.now(); raf = requestAnimationFrame(tick); }
        function stop() { if (done) return; cancelAnimationFrame(raf); fill.style.transform = 'scaleX(0)'; reveal(0); }
        function complete() {
          txt.classList.add('is-signed'); btn.disabled = true; box.querySelector('.sign__t').textContent = '已签名';
          play('right'); setTimeout(res, 700);
        }
        btn.addEventListener('pointerdown', start);
        btn.addEventListener('pointerup', stop); btn.addEventListener('pointerleave', stop); btn.addEventListener('pointercancel', stop);
        btn.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && !done) { e.preventDefault(); done = true; reveal(1); fill.style.transform = 'scaleX(1)'; complete(); } });
      });
    }
    function run(id) {
      var node = T.nodes[id], p = Promise.resolve();
      if (node.n) p = p.then(function () { return lines(node.n); });
      if (node.s) p = p.then(function () { return wait(200); }).then(function () { return bubble('bub--s', node.s, true); });
      p.then(function () {
        if (node.action === 'sign') return sign().then(function () { box.innerHTML = ''; run(node.next); });
        if (node.c) return choices(node.c);
        if (node.next) return run(node.next);
        if (node.end) {
          box.innerHTML = '';
          var again = document.createElement('button');
          again.type = 'button'; again.className = 'choice choice--ghost'; again.textContent = '换个回答，再来一次';
          again.addEventListener('click', function () { play('tap'); log.innerHTML = ''; box.innerHTML = ''; run(T.start); });
          box.appendChild(again);
        }
      });
    }
    var started = false;
    function begin() { if (started) return; started = true; run(T.start); }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); setTimeout(begin, 300); } }); }, { threshold: 0.35 });
      io.observe(sec);
    } else begin();
  }

  /* ---------- finale ---------- */
  var finale = document.querySelector('.finale');
  function paintFinale(animate) {
    if (!finale) return;
    var all = state.solved.length === 7;
    finale.hidden = !all;
    if (!all) return;
    var ring = finale.querySelector('.finale__ring');
    if (!ring.dataset.built) {
      GEMS.forEach(function (g, i) {
        var s = document.createElement('span');
        var a = (i / GEMS.length) * Math.PI * 2 - Math.PI / 2;
        s.className = 'finale__gem'; s.innerHTML = gemSVG(i, true);
        s.style.left = (50 + Math.cos(a) * 44) + '%'; s.style.top = (50 + Math.sin(a) * 44) + '%';
        ring.appendChild(s);
      });
      ring.dataset.built = '1';
    }
    var g = G();
    if (animate && g && !reduce) {
      refresh();
      g.from(finale.querySelectorAll('.finale__gem'), { scale: 0, rotation: -180, opacity: 0, stagger: 0.12, duration: 0.9, ease: 'back.out(2)', delay: 0.3 });
    }
  }
  if (finale) {
    var form = finale.querySelector('form');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.querySelector('input').value.trim() || '无名读者';
      var card = finale.querySelector('.cert');
      card.querySelector('.cert__name').textContent = name;
      var d = new Date();
      card.querySelector('.cert__date').textContent = d.getFullYear() + ' 年 ' + (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日';
      card.querySelector('.cert__gems').innerHTML = GEMS.map(function (_, i) { return gemSVG(i, true); }).join('');
      card.hidden = false;
      play('gem');
      var g = G(); if (g && !reduce) g.fromTo(card, { rotationX: -70, opacity: 0, transformPerspective: 900 }, { rotationX: 0, opacity: 1, duration: 1.1, ease: 'expo.out' });
    });
  }

  /* ---------- loupe on the engraved plates ---------- */
  if (fine && !reduce) {
    var lp = document.querySelector('.loupe'), cur = document.querySelector('.cursor');
    var Z = 2.6, R = 95, pending = null, active = null;
    function paint() {
      var e = pending; pending = null; if (!e || !active) return;
      var r = active.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      lp.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)';
      lp.style.backgroundSize = (r.width * Z) + 'px ' + (r.height * Z) + 'px';
      lp.style.backgroundPosition = (R - x * Z) + 'px ' + (R - y * Z) + 'px';
    }
    document.querySelectorAll('.young img, .gallery img, .peace img, .will__portrait img, .self__img img, .medal img').forEach(function (im) {
      im.addEventListener('pointerenter', function () {
        active = im; lp.style.backgroundImage = 'url("' + (im.currentSrc || im.src) + '")';
        lp.classList.add('is-on'); if (cur) cur.style.visibility = 'hidden';
      });
      im.addEventListener('pointerleave', function () { active = null; lp.classList.remove('is-on'); if (cur) cur.style.visibility = ''; });
      im.addEventListener('pointermove', function (e) { if (!pending) requestAnimationFrame(paint); pending = e; });
    });
  }

  /* ---------- boot ---------- */
  applyLocks(true);
  paintHud();
  document.querySelectorAll('.quest').forEach(buildQuest);
  document.querySelectorAll('[data-talk]').forEach(buildTalk);
  paintFinale(false);
  root.classList.add('game-on');
})();
