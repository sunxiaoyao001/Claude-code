/* Quests and gems. The text is always readable; what a gem unlocks is the
   next quest. Each correct answer plays a gem ceremony and the gem flies
   into the tray. Progress is kept in localStorage for this viewer only. */
(function () {
  'use strict';
  var NB = window.NB || {};
  var reduce = !!NB.reduce;
  var fine = matchMedia('(pointer: fine)').matches;
  var KEY = 'nobel-quest-v2';
  var state = { solved: [], sound: true, open: false };
  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && Array.isArray(saved.solved)) { state.solved = saved.solved; state.sound = saved.sound !== false; state.open = !!saved.open; }
  } catch (e) { /* storage unavailable: play without saving */ }
  NB.muted = !state.sound;
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } }
  function solved(n) { return state.solved.indexOf(n) !== -1; }
  function play(n) { if (NB.play) NB.play(n); }
  var G = function () { return window.gsap || null; };
  var FX = function () { return NB.fxCanvas ? NB.fxCanvas() : null; };

  /* ---------- gems ---------- */
  var GEMS = [
    { name: '黑玉', cut: 'round', c: ['#5a5e69', '#25272e', '#0c0d11'], glow: '#c9cfdb', note: '维多利亚时代，人们用黑玉做哀悼首饰。' },
    { name: '黄水晶', cut: 'pear', c: ['#fbe49a', '#e9b949', '#b5821a'], glow: '#ffe08a', note: '淡黄色，像一滴硝化甘油。' },
    { name: '蛋白石', cut: 'oval', c: ['#e6f3fc', '#f5d3ea', '#c9ead2'], glow: '#f3d9ff', note: '和硅藻的外壳一样，主要成分是含水的二氧化硅。' },
    { name: '赤铁矿', cut: 'cushion', c: ['#a3a9b1', '#5b6068', '#2a2d32'], glow: '#dfe4ea', note: '一种铁矿石。博福斯最早是一座铁工厂。' },
    { name: '钻石', cut: 'brilliant', c: ['#ffffff', '#d9ebf7', '#9fc0d8'], glow: '#e9f6ff', note: '最清澈的一颗，留给那份不分国籍的遗嘱。' },
    { name: '紫水晶', cut: 'marquise', c: ['#cfa9ee', '#8b5fbf', '#4f2c7b'], glow: '#d9b8ff', note: '夜色一样的紫，配他写给自己的那段简介。' },
    { name: '红宝石', cut: 'princess', c: ['#f3808d', '#c4243b', '#760d1e'], glow: '#ff9aa6', note: '最后一颗，献给 1901 年的第一届颁奖。' }
  ];
  function roundCut() {
    var f = '', i, a, t = [];
    for (i = 0; i < 8; i++) { a = (i / 8) * Math.PI * 2 - Math.PI / 2; t.push([20 + Math.cos(a) * 8, 20 + Math.sin(a) * 8]); }
    f += 'M' + t.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join('L') + 'Z';
    for (i = 0; i < 8; i++) {
      a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      [a - Math.PI / 8, a + Math.PI / 8].forEach(function (b) { f += 'M' + t[i][0].toFixed(1) + ' ' + t[i][1].toFixed(1) + 'L' + (20 + Math.cos(b) * 16).toFixed(1) + ' ' + (20 + Math.sin(b) * 16).toFixed(1); });
    }
    return { o: 'M20 4A16 16 0 1 1 19.99 4Z', f: f, h: 'M12 12L17 9L15 15Z' };
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
  NB.gemSVG = gemSVG;

  /* ---------- shell ---------- */
  var hud = document.querySelector('.hud');
  var socks = hud.querySelector('.hud__gems');
  var countEl = hud.querySelector('.hud__count');
  GEMS.forEach(function (g, i) { var s = document.createElement('span'); s.className = 'sock'; s.title = g.name; socks.appendChild(s); });
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
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2800);
  }
  NB.toast = toast;
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
    panel.querySelector('[data-act="open"]').setAttribute('aria-pressed', String(state.open));
  }
  function openPanel() { lastFocus = document.activeElement; paintPanel(); panel.hidden = false; requestAnimationFrame(function () { panel.classList.add('is-open'); }); panel.querySelector('.panel__close').focus(); }
  function closePanel() { panel.classList.remove('is-open'); setTimeout(function () { panel.hidden = true; }, 300); if (lastFocus) lastFocus.focus(); }
  hud.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.act === 'sound') { state.sound = !state.sound; NB.muted = !state.sound; save(); paintHud(); play('tap'); toast(state.sound ? '音效已打开' : '音效已关闭'); }
    if (b.dataset.act === 'panel') { play('tap'); openPanel(); }
  });
  panel.addEventListener('click', function (e) {
    if (e.target === panel || e.target.closest('.panel__close')) { closePanel(); return; }
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.act === 'open') {
      state.open = !state.open; save(); paintPanel(); paintVeils(true);
      toast(state.open ? '演示模式：七关都可以直接作答' : '演示模式已关闭');
    }
    if (b.dataset.act === 'reset') {
      state.solved = []; state.open = false; save();
      try { localStorage.removeItem('nobel-scenes'); } catch (e2) { /* ignore */ }
      toast('进度已清空，从第一关重新开始'); closePanel();
      setTimeout(function () { location.hash = ''; location.reload(); }, 700);
    }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) closePanel(); });
  function goTo(el) {
    var n = window.__nobel && window.__nobel.lenis;
    if (n) n.scrollTo(el, { duration: 1.6, offset: -40 }); else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }

  /* ---------- quests ---------- */
  var QUESTS = {
    1: { type: 'single', q: '1888 年那份讣告登出时，真正去世的是谁？', opts: ['阿尔弗雷德·诺贝尔', '他的哥哥路德维希', '他的弟弟埃米尔', '他的父亲伊曼纽尔'], a: 1,
      hint: '再看看开头那张椭圆形的肖像。', why: '1888 年 4 月死在戛纳的是哥哥路德维希。弟弟埃米尔死于 1864 年海勒内堡的爆炸。' },
    2: { type: 'eq', q: '把爆炸方程式补完整：二氧化碳前面应该是几？', opts: ['6', '9', '12', '15'], a: 2,
      hint: '数一数：4 个分子里一共有多少个碳原子？', why: '每个硝化甘油分子有 3 个碳，4 个分子就是 12 个碳，每个二氧化碳用掉 1 个，所以是 12。' },
    3: { type: 'drag', q: '1867 年，诺贝尔用什么吸住了硝化甘油？把它拖进烧杯，也可以直接点。', opts: ['铁屑', '硅藻土', '食盐', '砂糖'], a: 1,
      hint: '它由远古的微小生物的外壳堆积而成。', why: '硅藻土布满微孔。大约三份硝化甘油配一份硅藻土，就成了可以揉捏的膏体：炸药。' },
    4: { type: 'order', q: '按时间先后，依次点出这四件事。', items: [['买下博福斯工厂', 1894], ['索布雷罗合成硝化甘油', 1847], ['炸药在瑞典取得专利', 1867], ['诺贝尔为雷管申请专利', 1864]],
      hint: '最早的那件事，诺贝尔还没有参与。', why: '1847 硝化甘油，1864 雷管，1867 炸药，1894 博福斯。' },
    5: { type: 'multi', q: '遗嘱里设了哪五个奖？选出五个，再提交。', opts: ['物理学', '化学', '数学', '生理学或医学', '文学', '经济学', '和平'], a: [0, 1, 3, 4, 6],
      hint: '有一个奖是 1968 年才加上的，还有一个从来没有设过。', why: '遗嘱里没有数学奖。经济学奖是 1968 年瑞典中央银行出资设立的，不在遗嘱里。' },
    6: { type: 'single', q: '在给自己写的简介里，他“唯一的愿望”是什么？', opts: ['得到一枚勋章', '不要被活埋', '回到瑞典定居', '再发明一种炸药'], a: 1,
      hint: '这个愿望，他在遗嘱的最后一条里又写了一次。', why: '所以遗嘱的最后一条，是请医生在他死后切开动脉，确认死亡后再火化。' },
    7: { type: 'single', q: '第一届诺贝尔奖为什么在 12 月 10 日颁发？', opts: ['那天是诺贝尔的生日', '那天是诺贝尔的忌日', '那天他签下了遗嘱', '那天是瑞典国庆日'], a: 1,
      hint: '往上翻一点，看看大标题下面那行小字。', why: '诺贝尔 1896 年 12 月 10 日在圣雷莫去世。从 1901 年起，颁奖典礼都在他的忌日举行。他的生日是 10 月 21 日，遗嘱签于 11 月 27 日。' }
  };
  var LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  var LOCK = '<svg class="lock" viewBox="0 0 40 48" aria-hidden="true"><path class="lock__shackle" d="M11 22 V14 a9 9 0 0 1 18 0 V22" fill="none" stroke="currentColor" stroke-width="3"/><rect x="5" y="22" width="30" height="22" rx="3" fill="currentColor"/><circle cx="20" cy="31" r="3" fill="var(--paper-2)"/><path d="M20 33 v5" stroke="var(--paper-2)" stroke-width="2.4"/></svg>';
  var quests = {};

  function buildQuest(sec) {
    var k = +sec.dataset.quest, Q = QUESTS[k], gi = k - 1;
    var card = document.createElement('div');
    card.className = 'quest__card tilt';
    card.innerHTML =
      '<div class="quest__gem"><div class="gemshow"><span class="gemshow__glow"></span>' + gemSVG(gi, false) + '<span class="gemshow__q">?</span></div>' +
      '<p class="quest__gemname">第 ' + k + ' 颗宝石</p><p class="quest__gemnote">答对后揭晓</p></div>' +
      '<div class="quest__main"><p class="label"><span class="latin">Quest ' + ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][gi] + '</span>　第 ' + k + ' 关</p>' +
      '<h3 class="quest__q" id="q' + k + '-t">' + Q.q + '</h3>' +
      (Q.type === 'eq' ? '<p class="quest__eq latin">4 C<sub>3</sub>H<sub>5</sub>N<sub>3</sub>O<sub>9</sub> → <span class="blank">?</span> CO<sub>2</sub> + 10 H<sub>2</sub>O + 6 N<sub>2</sub> + O<sub>2</sub></p>' : '') +
      '<div class="quest__play"></div><p class="quest__fb" aria-live="polite"></p>' +
      '<div class="quest__why" hidden><p>' + Q.why + '</p>' + (k < 7 ? '<button type="button" class="btn quest__next">去下一章 ↓</button>' : '') + '</div></div>' +
      '<div class="quest__veil">' + LOCK + '<p class="quest__veil-t">先拿到上一颗宝石，这一关才会打开</p><button type="button" class="btn btn--ghost quest__back">回到第 ' + (k - 1) + ' 关 ↑</button></div>';
    sec.appendChild(card);
    var stage = card.querySelector('.quest__play');
    var api = { k: k, Q: Q, card: card, sec: sec, done: false };
    quests[k] = api;
    if (Q.type === 'single' || Q.type === 'eq') buildChoice(api, stage);
    if (Q.type === 'drag') buildDrag(api, stage);
    if (Q.type === 'order') buildOrder(api, stage);
    if (Q.type === 'multi') buildMulti(api, stage);
    var next = card.querySelector('.quest__next');
    if (next) next.addEventListener('click', function () {
      play('tap');
      var target = sec.nextElementSibling;
      while (target && (target.hidden || target.offsetHeight === 0)) target = target.nextElementSibling;
      if (target) goTo(target);
    });
    card.querySelector('.quest__back').addEventListener('click', function () { play('tap'); var prev = quests[k - 1]; if (prev) goTo(prev.sec); });
    if (solved(k)) win(api, true);
  }
  function paintVeils(animate) {
    Object.keys(quests).forEach(function (key) {
      var api = quests[key], open = state.open || api.k === 1 || solved(api.k - 1) || solved(api.k);
      var veil = api.card.querySelector('.quest__veil');
      if (open && !api.card.classList.contains('is-open')) {
        api.card.classList.add('is-open');
        var g = G();
        if (animate && g && !reduce) {
          g.timeline({ onComplete: function () { veil.hidden = true; } })
            .to(veil.querySelector('.lock__shackle'), { y: -8, rotation: 25, svgOrigin: '29 22', duration: 0.5, ease: 'back.out(3)' })
            .to(veil, { opacity: 0, backdropFilter: 'blur(0px)', duration: 0.6, ease: 'power2.out' }, 0.35);
        } else veil.hidden = true;
      }
      api.card.setAttribute('aria-disabled', String(!open));
      api.card.querySelectorAll('.quest__play button').forEach(function (b) { if (!api.done) b.disabled = !open; });
    });
  }
  function fb(api, msg, bad) { var el = api.card.querySelector('.quest__fb'); el.textContent = msg; el.classList.toggle('is-bad', !!bad); }
  function wrong(api, el) {
    play('wrong');
    fb(api, '不对。提示：' + api.Q.hint, true);
    var g = G();
    if (g && !reduce) {
      if (el) g.fromTo(el, { x: 0 }, { keyframes: { x: [-10, 9, -6, 4, 0] }, duration: 0.42, ease: 'none' });
      g.fromTo(api.card, { boxShadow: '0 0 0 1px oklch(0.58 0.16 50), 0 50px 80px -60px rgba(0,0,0,.5)' }, { boxShadow: '0 0 0 1px oklch(0.80 0.01 260), 0 50px 80px -60px rgba(0,0,0,.5)', duration: 0.9 });
      var r = (el || api.card).getBoundingClientRect(), fx = FX();
      if (fx) fx.splash(r.left + r.width / 2, r.top + r.height / 2, { color: 'rgba(194,86,0,.8)', n: 14 });
    }
  }
  function win(api, silent) {
    if (api.done) return;
    api.done = true;
    var k = api.k, gi = k - 1, gem = GEMS[gi];
    if (!solved(k)) { state.solved.push(k); save(); }
    api.card.classList.add('is-won');
    var show = api.card.querySelector('.gemshow');
    show.innerHTML = '<span class="gemshow__glow"></span>' + gemSVG(gi, true);
    show.style.setProperty('--glow', gem.glow);
    api.card.querySelector('.quest__gemname').textContent = gem.name;
    api.card.querySelector('.quest__gemnote').textContent = gem.note;
    api.card.querySelectorAll('.quest__play button').forEach(function (b) { b.disabled = true; });
    var eqBlank = api.card.querySelector('.blank'); if (eqBlank) eqBlank.textContent = '12';
    fb(api, (silent ? '已答对，' : '答对了！') + '获得宝石：' + gem.name, false);
    var why = api.card.querySelector('.quest__why'); why.hidden = false;
    if (silent) { paintHud(); paintVeils(false); return; }
    play('right');
    ceremony(gi, function () {
      paintVeils(true);
      if (k < 7) toast('第 ' + (k + 1) + ' 关已经打开');
      if (state.solved.length === 7) { toast('七颗宝石集齐！终章已打开'); paintFinale(true); }
    });
    var g = G();
    if (g && !reduce) g.from(why, { opacity: 0, y: 14, duration: 0.7, delay: 0.4, ease: 'power3.out' });
  }

  /* the gem ceremony: rays, a spinning gem, sparks, then a flight into the tray */
  var cer = document.querySelector('.ceremony');
  function ceremony(gi, done) {
    var g = G(), fx = FX(), gem = GEMS[gi], sock = socks.children[gi];
    if (!g || reduce || !cer) { paintHud(); done(); return; }
    var spin = cer.querySelector('.ce__gem'), nameEl = cer.querySelector('.ce__name'), noteEl = cer.querySelector('.ce__note');
    spin.innerHTML = gemSVG(gi, true);
    cer.style.setProperty('--glow', gem.glow);
    nameEl.textContent = gem.name; noteEl.textContent = gem.note;
    cer.hidden = false;
    var skipped = false;
    function finish() {
      if (skipped) return; skipped = true;
      tl.kill();
      var a = spin.getBoundingClientRect(), b = sock.getBoundingClientRect();
      var flyer = document.createElement('div');
      flyer.className = 'flyer'; flyer.innerHTML = gemSVG(gi, true);
      flyer.style.cssText = 'left:' + a.left + 'px;top:' + a.top + 'px;width:' + a.width + 'px;height:' + a.height + 'px';
      document.body.appendChild(flyer);
      g.to(cer, { opacity: 0, duration: 0.5, onComplete: function () { cer.hidden = true; cer.style.opacity = ''; } });
      var dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
      play('whoosh');
      g.timeline({ onComplete: function () {
        flyer.remove(); paintHud(); play('gem');
        if (fx) { fx.sparkle(b.left + b.width / 2, b.top + b.height / 2, { n: 18, min: 60, max: 200, big: 7 }); fx.ring(b.left + b.width / 2, b.top + b.height / 2, { r0: 6, r1: 60, width: 3, life: 0.6 }); }
        g.fromTo(sock, { scale: 2.2 }, { scale: 1, duration: 0.7, ease: 'elastic.out(1, 0.35)' });
        done();
      } })
        .to(flyer, { x: dx, duration: 1.05, ease: 'power3.inOut', onUpdate: function () { var r = flyer.getBoundingClientRect(); if (fx && Math.random() < 0.7) fx.trail(r.left + r.width / 2, r.top + r.height / 2, gem.glow); } }, 0)
        .to(flyer, { y: dy, duration: 1.05, ease: 'back.in(1.6)' }, 0)
        .to(flyer, { scale: b.width / a.width, rotation: 540, duration: 1.05, ease: 'power2.in' }, 0);
    }
    cer.onclick = finish;
    var cx = innerWidth / 2, cy = innerHeight / 2;
    var tl = g.timeline({ onComplete: finish });
    tl.fromTo(cer, { opacity: 0 }, { opacity: 1, duration: 0.35 })
      .add(function () { play('rise'); }, 0)
      .fromTo('.ce__rays', { scale: 0.3, opacity: 0, rotation: 0 }, { scale: 1, opacity: 1, rotation: 60, duration: 2.2, ease: 'power2.out' }, 0)
      .fromTo(spin, { scale: 0.1, rotationY: -720, opacity: 0 }, { scale: 1, rotationY: 0, opacity: 1, duration: 1.4, ease: 'expo.out' }, 0.1)
      .add(function () { play('gem'); if (fx) { fx.sparkle(cx, cy, { n: 60, colors: [gem.glow, '#ffffff', '#ef861b'], max: 620, big: 14 }); fx.ring(cx, cy, { r0: 30, r1: 520, width: 6, life: 1, color: 'rgba(255,255,255,.7)' }); } }, 0.55)
      .fromTo('.ce__shine', { xPercent: -160 }, { xPercent: 160, duration: 0.9, ease: 'power2.inOut' }, 0.9)
      .fromTo([nameEl, noteEl, '.ce__k'], { y: 20, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.12, duration: 0.7, ease: 'expo.out' }, 0.8)
      .to({}, { duration: 1.1 });
  }

  function buildChoice(api, box) {
    var grid = document.createElement('div');
    grid.className = 'quest__opts'; grid.setAttribute('role', 'group'); grid.setAttribute('aria-labelledby', 'q' + api.k + '-t');
    api.Q.opts.forEach(function (o, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'opt';
      b.innerHTML = '<span class="k">' + LETTERS[i] + '</span><span>' + o + '</span>';
      b.addEventListener('pointerenter', function () { if (!b.disabled) play('hover'); });
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
      '<div class="lab__beaker"><svg viewBox="0 0 120 140" aria-hidden="true">' +
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
      b.addEventListener('pointerdown', function (e) { if (api.done || b.disabled) return; pid = e.pointerId; sx = e.clientX; sy = e.clientY; dragging = false; b.setPointerCapture(pid); });
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
      var r = beaker.getBoundingClientRect(), fx = FX();
      if (i === api.Q.a) {
        b.classList.add('is-right'); beaker.classList.add('is-calm');
        var g = G(); if (g && !reduce) g.fromTo(beaker, { rotation: -6 }, { rotation: 0, duration: 0.9, ease: 'elastic.out(1, 0.35)' });
        if (fx && !reduce) fx.splash(r.left + r.width / 2, r.top + r.height * 0.45, { color: 'rgba(221,224,227,.95)', n: 26 });
        win(api);
      } else {
        b.classList.add('is-wrong'); wrong(api, beaker);
        if (fx && !reduce) fx.splash(r.left + r.width / 2, r.top + r.height * 0.4, { color: '#f7edaf', n: 22 });
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
        var g = G(); if (g && !reduce) g.fromTo(b.querySelector('.n'), { scale: 2.2 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
        if (picked.length === api.Q.items.length) {
          var years = picked.map(function (p) { return api.Q.items[p][1]; });
          var ok = years.every(function (y, j) { return j === 0 || y > years[j - 1]; });
          if (ok) {
            Array.prototype.forEach.call(grid.children, function (c, j) { c.classList.add('is-right'); c.querySelector('.yr').textContent = api.Q.items[j][1]; });
            win(api);
          } else {
            wrong(api, grid);
            setTimeout(function () { picked = []; Array.prototype.forEach.call(grid.children, function (c) { c.classList.remove('is-picked'); c.querySelector('.n').textContent = '·'; }); }, 900);
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
      if (right) { api.Q.a.forEach(function (x) { grid.children[x].classList.add('is-right'); }); win(api); }
      else {
        sel.forEach(function (x) { if (api.Q.a.indexOf(x) === -1) grid.children[x].classList.add('is-wrong'); });
        wrong(api, grid);
        setTimeout(function () { Array.prototype.forEach.call(grid.children, function (c) { c.classList.remove('is-wrong'); }); }, 1400);
      }
    });
    box.appendChild(grid); box.appendChild(submit);
    if (solved(api.k)) api.Q.a.forEach(function (x) { grid.children[x].classList.add('is-right'); });
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
        var s = document.createElement('span'), a = (i / GEMS.length) * Math.PI * 2 - Math.PI / 2;
        s.className = 'finale__gem'; s.innerHTML = gemSVG(i, true);
        s.style.left = (50 + Math.cos(a) * 44) + '%'; s.style.top = (50 + Math.sin(a) * 44) + '%';
        ring.appendChild(s);
      });
      ring.dataset.built = '1';
    }
    if (window.ScrollTrigger) requestAnimationFrame(function () { window.ScrollTrigger.refresh(); });
    var g = G();
    if (animate && g && !reduce) g.from(finale.querySelectorAll('.finale__gem'), { scale: 0, rotation: -180, opacity: 0, stagger: 0.12, duration: 0.9, ease: 'back.out(2)', delay: 0.3 });
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
      var g = G(), fx = FX();
      if (g && !reduce) g.fromTo(card, { rotationX: -70, opacity: 0, transformPerspective: 900 }, { rotationX: 0, opacity: 1, duration: 1.1, ease: 'expo.out', onComplete: function () { var r = card.getBoundingClientRect(); if (fx) fx.sparkle(r.left + r.width / 2, r.top + 30, { n: 50, colors: GEMS.map(function (x) { return x.glow; }) }); } });
    });
  }

  /* ---------- loupe on the engraved plates ---------- */
  if (fine && !reduce) {
    var lp = document.querySelector('.loupe'), cur = document.querySelector('.cursor');
    var Z = 2.6, R = 95, pending = null, active = null;
    var paint = function () {
      var e = pending; pending = null; if (!e || !active) return;
      var r = active.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      lp.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)';
      lp.style.backgroundSize = (r.width * Z) + 'px ' + (r.height * Z) + 'px';
      lp.style.backgroundPosition = (R - x * Z) + 'px ' + (R - y * Z) + 'px';
    };
    document.querySelectorAll('.young img, .gallery img, .peace img, .will__portrait img, .self__img img, .medal img').forEach(function (im) {
      im.addEventListener('pointerenter', function () { active = im; lp.style.backgroundImage = 'url("' + (im.currentSrc || im.src) + '")'; lp.classList.add('is-on'); if (cur) cur.style.visibility = 'hidden'; });
      im.addEventListener('pointerleave', function () { active = null; lp.classList.remove('is-on'); if (cur) cur.style.visibility = ''; });
      im.addEventListener('pointermove', function (e) { if (!pending) requestAnimationFrame(paint); pending = e; });
    });
  }

  /* ---------- 3D tilt and magnetic pull ---------- */
  if (fine && !reduce) {
    var tiltPending = null;
    document.addEventListener('pointermove', function (e) {
      if (!tiltPending) requestAnimationFrame(function () {
        var ev = tiltPending; tiltPending = null;
        document.querySelectorAll('.tilt').forEach(function (c) {
          var r = c.getBoundingClientRect();
          var inside = ev.clientX > r.left - 40 && ev.clientX < r.right + 40 && ev.clientY > r.top - 40 && ev.clientY < r.bottom + 40;
          var px = inside ? (ev.clientX - r.left) / r.width - 0.5 : 0, py = inside ? (ev.clientY - r.top) / r.height - 0.5 : 0;
          c.style.setProperty('--rx', (-py * 5).toFixed(2) + 'deg');
          c.style.setProperty('--ry', (px * 7).toFixed(2) + 'deg');
          c.style.setProperty('--gx', ((px + 0.5) * 100).toFixed(1) + '%');
          c.style.setProperty('--gy', ((py + 0.5) * 100).toFixed(1) + '%');
        });
      });
      tiltPending = e;
    }, { passive: true });
  }

  /* ---------- boot ---------- */
  paintHud();
  document.querySelectorAll('.quest').forEach(buildQuest);
  paintVeils(false);
  paintFinale(false);
})();
