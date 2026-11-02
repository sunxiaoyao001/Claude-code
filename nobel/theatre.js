/* Scene theatre: short dramatised episodes the reader chooses to enter.
   Each opens from its card into a full-screen stage with letterbox bars,
   a title card, an illustrated set, props that animate, Nobel's portrait,
   subtitles and choices. Lines are dramatisations, labelled as such. */
(function () {
  'use strict';
  var NB = window.NB || {};
  var reduce = !!NB.reduce;
  var G = function () { return window.gsap || null; };
  var play = function (n) { if (NB.play) NB.play(n); };
  var NS = 'http://www.w3.org/2000/svg';

  var el = document.createElement('div');
  el.className = 'theatre';
  el.hidden = true;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', '情景剧场');
  el.innerHTML =
    '<div class="th__stage">' +
      '<div class="th__set"><img class="th__plate" src="assets/factory-hall.webp" alt=""><div class="th__smoke"></div></div>' +
      '<div class="th__props"></div>' +
      '<figure class="th__actor"><img src="assets/alfred-profile.webp" alt=""></figure>' +
      '<canvas class="th__fx" aria-hidden="true"></canvas>' +
      '<div class="th__flash"></div>' +
      '<div class="th__vignette"></div>' +
    '</div>' +
    '<div class="th__bars"><i class="th__bar th__bar--t"></i><i class="th__bar th__bar--b"></i></div>' +
    '<div class="th__title" aria-hidden="true"><p class="th__place"></p><p class="th__time"></p><span class="th__rule"></span></div>' +
    '<p class="th__cap" aria-live="polite"></p>' +
    '<div class="th__box" aria-live="polite"><p class="th__name"></p><p class="th__line"></p><span class="th__more" aria-hidden="true"></span></div>' +
    '<div class="th__choices"></div>' +
    '<div class="th__top"><span class="th__chip">情景重构 · 台词根据史料改写</span><span class="th__hint">点击画面或按空格继续</span><button type="button" class="th__close">回到正文</button></div>';
  document.body.appendChild(el);
  var $ = function (s) { return el.querySelector(s); };
  var stageEl = $('.th__stage'), plate = $('.th__plate'), smoke = $('.th__smoke'), props = $('.th__props');
  var actor = $('.th__actor'), actorImg = actor.querySelector('img'), flashEl = $('.th__flash');
  var cap = $('.th__cap'), box = $('.th__box'), nameEl = $('.th__name'), lineEl = $('.th__line'), more = $('.th__more');
  var choicesEl = $('.th__choices'), titleEl = $('.th__title');
  var fx = NB.Engine ? NB.Engine($('.th__fx')) : null;

  /* ---------- small helpers ---------- */
  var token = 0;
  function alive(t) { return t === token; }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, reduce ? Math.min(ms, 60) : ms); }); }
  var clickResolver = null, skipTyping = null;
  function onAdvance(e) {
    if (e.target.closest('button')) return;
    if (skipTyping) { skipTyping(); return; }
    if (clickResolver) { var r = clickResolver; clickResolver = null; r(); }
  }
  el.addEventListener('click', onAdvance);
  function waitClick() { return new Promise(function (r) { clickResolver = r; more.classList.add('is-on'); }).then(function () { more.classList.remove('is-on'); play('tap'); }); }
  function typeInto(node, text, t) {
    return new Promise(function (res) {
      var chars = Array.from(text), i = 0, timer = 0;
      function done() { clearTimeout(timer); node.textContent = text; skipTyping = null; res(); }
      if (reduce) { done(); return; }
      skipTyping = done;
      (function step() {
        if (!alive(t)) { done(); return; }
        i++; node.textContent = chars.slice(0, i).join('');
        if (i % 3 === 0) play('type');
        if (i >= chars.length) { skipTyping = null; res(); } else timer = setTimeout(step, chars[i - 1] === '，' || chars[i - 1] === '。' ? 160 : 38);
      })();
    });
  }
  function rectIn(node) {
    var a = node.getBoundingClientRect(), b = stageEl.getBoundingClientRect();
    return { x: a.left - b.left + a.width / 2, y: a.top - b.top + a.height / 2, w: a.width, h: a.height };
  }
  function shake(power, dur) {
    var g = G(); if (!g || reduce) return;
    var p = power || 16, n = [];
    for (var i = 0; i < 9; i++) n.push((i % 2 ? 1 : -1) * p * (1 - i / 9));
    g.fromTo(stageEl, { x: 0, y: 0 }, { keyframes: { x: n, y: n.map(function (v) { return v * 0.5; }) }, duration: dur || 0.6, ease: 'none', clearProps: 'transform' });
  }
  function flash(peak) {
    var g = G(); if (!g) return;
    g.fromTo(flashEl, { opacity: peak || 1 }, { opacity: 0, duration: reduce ? 0.2 : 1.2, ease: 'power2.out' });
  }
  function svg(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  /* ---------- the scenes ---------- */
  var killers = [];
  function every(fn) { var g = G(); if (!g) return; g.ticker.add(fn); killers.push(function () { g.ticker.remove(fn); }); }

  var SCENES = {};

  /* 1. the obituary at breakfast */
  SCENES.obit = {
    place: '巴黎', time: '1888 年 4 月　一个清晨', actor: 'assets/alfred-profile.webp', tone: 'dawn',
    setup: function () {
      props.innerHTML =
        '<div class="np"><div class="np__page">' +
        '<p class="np__mast">PARIS · AVRIL 1888</p><span class="np__rule"></span>' +
        '<p class="np__kicker">NÉCROLOGIE</p>' +
        '<h3 class="np__head">Le marchand de la mort<br><span class="np__struck">est mort.<svg viewBox="0 0 300 60" preserveAspectRatio="none"><path pathLength="1" d="M4 40 C 80 31, 160 27, 296 21"/></svg></span></h3>' +
        '<div class="np__body"><figure class="np__fig"><img src="assets/ludvig.webp" alt=""><figcaption>L. NOBEL</figcaption></figure><div class="np__cols"><i></i><i></i><i></i></div></div>' +
        '<p class="np__orn" aria-hidden="true">❧</p></div></div><div class="beams" aria-hidden="true"><i></i><i></i><i></i></div>';
    },
    fx: {
      paper: function () {
        var g = G(), np = props.querySelector('.np');
        play('paper');
        if (!g) return wait(10);
        return new Promise(function (r) {
          g.fromTo(np, { rotationX: 72, rotationZ: -14, y: -260, z: 260, opacity: 0 }, { rotationX: 14, rotationZ: -4, y: 0, z: 0, opacity: 1, duration: reduce ? 0.01 : 1.3, ease: 'power3.out', onComplete: function () {
            var c = rectIn(np); if (fx && !reduce) fx.splash(c.x, c.y + c.h * 0.45, { color: 'rgba(120,120,128,.6)', n: 24 }); r();
          } });
        });
      },
      zoom: function () {
        var g = G(), np = props.querySelector('.np');
        if (!g) return wait(10);
        return new Promise(function (r) { g.to(np, { rotationX: 0, rotationZ: -2, scale: 1.18, y: -30, duration: reduce ? 0.01 : 1.6, ease: 'power2.inOut', onComplete: r }); });
      },
      strike: function () {
        var g = G(), path = props.querySelector('.np__struck path');
        play('pen');
        if (!g) { path.style.strokeDashoffset = '0'; return wait(10); }
        return new Promise(function (r) {
          g.fromTo(path, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: reduce ? 0.01 : 0.7, ease: 'power2.inOut', onComplete: function () {
            var c = rectIn(path); if (fx && !reduce) fx.splash(c.x + c.w / 2, c.y, { color: '#ef861b', n: 30 }); r();
          } });
        });
      }
    },
    start: 'a',
    nodes: {
      a: { steps: [['cap', '一个四月的清晨。报纸送到了他的早餐桌上。'], ['fx', 'paper'], ['cap', '讣告栏的标题印得很大。'], ['fx', 'zoom'], ['actor', 'in'], ['say', '……“死亡商人已死。”'], ['say', '死的是我哥哥路德维希，几天前在戛纳。他们把名字弄错了。']],
        choices: [['“那就让他们登一则更正吧。”', 'b'], ['“可这几句评语，说的是您。”', 'c']] },
      b: { steps: [['you', '那就让他们登一则更正吧。'], ['say', '更正只能改掉一个名字。'], ['say', '“靠发明更快杀人的方法致富”，这句话是改不掉的。']], next: 'd' },
      c: { steps: [['you', '可这几句评语，说的是您。'], ['say', '是啊。一个人很少有机会，在活着的时候读到自己的讣告。']], next: 'd' },
      d: { steps: [['say', '如果明天真的轮到我，我想被怎样记住？'], ['fx', 'strike'], ['cap', '没有人知道那天早上他想了些什么。七年后，他写下了一份遗嘱。']], end: true }
    }
  };

  /* 2. the lab bench, set with glassware engraved by Marie-Anne Paulze Lavoisier (1789) */
  var flaskState = { amp: 1.5, phase: 0, tilt: 0 };
  function bulbCenter() {
    var f = props.querySelector('.lp--flask'), r = f.getBoundingClientRect(), b = stageEl.getBoundingClientRect();
    return { x: r.left - b.left + r.width * 148 / 321, y: r.top - b.top + r.height * 552 / 700, w: r.width };
  }
  SCENES.lab = {
    place: '斯德哥尔摩　海勒内堡', time: '1864 年 夏', plate: 'assets/lab-plate.webp', actor: 'assets/alfred-young.webp', tone: 'lab',
    setup: function () {
      flaskState.amp = 1.5; flaskState.phase = 0; flaskState.tilt = 0;
      props.innerHTML =
        '<div class="labset">' +
        '<svg class="labset__table" viewBox="0 0 1100 90" preserveAspectRatio="none" aria-hidden="true"><defs><pattern id="grain" width="40" height="6" patternUnits="userSpaceOnUse"><path d="M0 3 Q10 1 20 3 T40 3" fill="none" stroke="#131922" stroke-width=".8" opacity=".5"/></pattern></defs>' +
        '<rect x="0" y="4" width="1100" height="26" fill="url(#grain)" stroke="#131922" stroke-width="1.6"/><path d="M60 30 V90 M1040 30 V90 M120 30 V70 M980 30 V70" stroke="#131922" stroke-width="2.4"/></svg>' +
        '<img class="lp lp--retort" src="assets/lab-retort.webp" alt="">' +
        '<img class="lp lp--alembic" src="assets/lab-alembic.webp" alt="">' +
        '<div class="lp lp--flask"><svg class="flask__liq" viewBox="0 0 321 700" aria-hidden="true"><defs><clipPath id="fbulb"><circle cx="148" cy="553" r="125"/></clipPath></defs><path class="flask__wave" clip-path="url(#fbulb)"/></svg><img src="assets/lab-flask.webp" alt=""></div>' +
        '<img class="lp lp--vase" src="assets/lab-vase.webp" alt="">' +
        '<div class="lp lp--furnace"><span class="furnace__glow"></span><img src="assets/lab-furnace.webp" alt=""></div>' +
        '</div><p class="labset__credit">器物图出自拉瓦锡《化学基础论》（1789）图版三，玛丽－安妮·拉瓦锡刻</p>';
      var wave = props.querySelector('.flask__wave');
      every(function () {
        flaskState.phase += 0.06 + flaskState.amp * 0.01;
        var lvl = 562, d = 'M10 ' + lvl;
        for (var x = 10; x <= 300; x += 10) d += ' L' + x + ' ' + (lvl + Math.sin(flaskState.phase + x * 0.04) * flaskState.amp + (x - 148) * flaskState.tilt).toFixed(1);
        wave.setAttribute('d', d + ' L300 700 L10 700 Z');
      });
    },
    fx: {
      enter: function () {
        var g = G(); if (!g) return wait(10);
        var items = props.querySelectorAll('.lp');
        return new Promise(function (r) {
          g.timeline({ onComplete: r })
            .from(props.querySelector('.labset__table'), { scaleX: 0, transformOrigin: '50% 50%', duration: 0.9, ease: 'expo.out' })
            .from(items, { y: -80, opacity: 0, duration: 0.9, stagger: 0.12, ease: 'bounce.out' }, 0.25)
            .from('.labset__credit', { opacity: 0, duration: 0.6 }, 1);
        });
      },
      lift: function () {
        var g = G(), f = props.querySelector('.lp--flask'); play('slosh');
        if (!g) return wait(10);
        return new Promise(function (r) {
          g.timeline({ onComplete: r })
            .to(f, { y: -90, rotation: -6, transformOrigin: '46% 79%', duration: 1.1, ease: 'power2.out' })
            .to(flaskState, { amp: 7, tilt: 0.1, duration: 0.6 }, 0)
            .to(flaskState, { amp: 1.5, tilt: 0, duration: 1.2 }, 0.8)
            .to(f, { y: 0, rotation: 0, duration: 1, ease: 'power2.inOut' }, 1.4);
        });
      },
      warn: function () {
        var g = G(), f = props.querySelector('.lp--flask');
        if (!g) return wait(10);
        return new Promise(function (r) {
          g.timeline({ onComplete: r })
            .to(f, { filter: 'drop-shadow(0 0 22px rgba(239,134,27,.95))', duration: 0.4, yoyo: true, repeat: 3 })
            .set(f, { filter: 'none' });
        });
      },
      shake: function () {
        var g = G(), f = props.querySelector('.lp--flask');
        if (!g) return wait(10);
        var kf = [];
        for (var i = 0; i < 18; i++) kf.push((i % 2 ? 1 : -1) * (3 + i * 1.5));
        var timer = setInterval(function () { play('slosh'); }, 280);
        return new Promise(function (r) {
          g.timeline({ onComplete: function () { clearInterval(timer); r(); } })
            .to(f, { y: -40, duration: 0.4, ease: 'power2.out' }, 0)
            .to(f, { keyframes: { x: kf, rotation: kf.map(function (v) { return v * 0.6; }) }, transformOrigin: '46% 79%', duration: 2, ease: 'power1.in' }, 0.3)
            .to(flaskState, { amp: 30, tilt: 0, duration: 2, ease: 'power2.in' }, 0.3)
            .to(f, { filter: 'drop-shadow(0 0 30px rgba(239,134,27,1))', duration: 0.25, yoyo: true, repeat: 6 }, 0.6)
            .add(function () { shake(5, 0.6); }, 1.5);
        });
      },
      heat: function () {
        var g = G(), f = props.querySelector('.lp--flask'), fur = props.querySelector('.lp--furnace'), glow = props.querySelector('.furnace__glow');
        if (!g) return wait(10);
        var a = f.getBoundingClientRect(), b = fur.getBoundingClientRect();
        var dx = b.left + b.width * 0.52 - (a.left + a.width * 148 / 321), dy = b.top + b.height * 0.07 - a.bottom;
        var on = false, t0 = 0;
        every(function () {
          if (!on || !fx) return;
          var r = fur.getBoundingClientRect(), s = stageEl.getBoundingClientRect();
          fx.flame(r.left - s.left + r.width * 0.5, r.top - s.top + r.height * 0.46, r.width * 0.16);
          if (performance.now() - t0 > 1200) { var c = bulbCenter(); fx.bubbles(c.x, c.y + c.w * 0.25, c.w * 0.25); }
        });
        var temp = { v: 18 };
        cap.classList.add('is-on');
        return new Promise(function (r) {
          g.timeline({ onComplete: function () { on = false; r(); } })
            .to(f, { x: dx, y: dy - 30, duration: 0.9, ease: 'power2.inOut' })
            .to(f, { y: dy, duration: 0.35, ease: 'bounce.out' })
            .add(function () { on = true; t0 = performance.now(); play('fire'); })
            .to(glow, { opacity: 1, duration: 0.6 }, '<')
            .to(glow, { opacity: 0.6, duration: 0.12, yoyo: true, repeat: 15, ease: 'none' }, '>')
            .to(flaskState, { amp: 14, duration: 2.6, ease: 'power2.in' }, '<-1.8')
            .to(temp, { v: 140, duration: 2.6, ease: 'power2.in', onUpdate: function () { cap.textContent = Math.round(temp.v) + ' °C'; } }, '<')
            .to(f, { filter: 'drop-shadow(0 0 26px rgba(239,134,27,1))', duration: 0.22, yoyo: true, repeat: 5 }, '<1.2');
        });
      },
      boom: function () {
        var g = G(), f = props.querySelector('.lp--flask'), c = bulbCenter();
        cap.classList.remove('is-on'); cap.textContent = '';
        play('boom'); play('glass');
        flash(1);
        if (fx && !reduce) fx.explode(c.x, c.y, { scale: Math.max(0.9, stageEl.clientWidth / 1300) });
        shake(30, 1.1);
        if (!g) { f.style.opacity = 0; return wait(10); }
        g.set(f, { opacity: 0 });
        props.querySelectorAll('.lp:not(.lp--flask)').forEach(function (p, i) {
          var r = p.getBoundingClientRect(), s = stageEl.getBoundingClientRect(), dir = (r.left - s.left + r.width / 2) < c.x ? -1 : 1;
          g.to(p, { x: dir * (260 + i * 60), y: -120 - i * 30, rotation: dir * (40 + i * 25), opacity: 0, duration: 1.1, ease: 'power3.out' });
        });
        g.to(props.querySelector('.labset__table'), { y: 40, rotation: 5, duration: 0.7, ease: 'power3.out' });
        g.to(props.querySelector('.labset__credit'), { opacity: 0, duration: 0.3 });
        g.to(plate, { scale: 1.16, rotation: -2, duration: 0.7, ease: 'power3.out' });
        g.to(smoke, { opacity: 0.94, duration: 1.4, delay: 0.3, ease: 'power2.out' });
        actor.classList.remove('is-in');
        g.to(actor, { opacity: 0, duration: 0.3 });
        return wait(2700);
      },
      ruins: function () {
        var g = G();
        props.querySelector('.labset').style.opacity = '0';
        plate.src = 'assets/heleneborg.webp';
        plate.classList.add('is-photo');
        if (!g) { smoke.style.opacity = 0; return wait(10); }
        return new Promise(function (r) {
          g.timeline({ onComplete: r })
            .fromTo(plate, { scale: 1.3, rotation: 0, filter: 'blur(8px)' }, { scale: 1.05, filter: 'blur(0px)', duration: 3.2, ease: 'power2.out' }, 0)
            .to(smoke, { opacity: 0, duration: 2.8, ease: 'power1.inOut' }, 0.2);
        });
      }
    },
    start: 'a',
    nodes: {
      a: { steps: [['cap', '海勒内堡，诺贝尔家准备硝化甘油的工棚。'], ['fx', 'enter'], ['cap', '桌上有一瓶淡黄色的油。它看起来很安静。'], ['actor', 'in'], ['say', '小心。它不喜欢被打扰。']],
        choices: [['轻轻拿起来看看', 'lift'], ['摇一摇，看它会怎样', 'shake'], ['放到炉子上加热', 'heat']] },
      lift: { steps: [['you', '我轻轻把它拿了起来。'], ['fx', 'lift'], ['say', '很好，就这样。'], ['say', '可工厂、码头、马车上，没人能保证一路都这么轻。'], ['fx', 'warn'], ['cap', '这种液体会渗漏。搬运时的一次磕碰，就可能引爆。']],
        choices: [['摇一摇，看它会怎样', 'shake'], ['放到炉子上加热', 'heat'], ['离开实验台', 'end']] },
      shake: { steps: [['you', '我拿起瓶子，用力摇了摇。'], ['fx', 'shake'], ['fx', 'boom'], ['cap', '撞击和加热都可能引爆硝化甘油。'], ['fx', 'ruins'], ['cap', '1864 年 9 月 3 日，海勒内堡的工棚在一次爆炸中被毁。五人遇难，其中有他二十岁的弟弟埃米尔。'], ['actor', 'in'], ['say', '我得让它安静下来。']], next: 'end' },
      heat: { steps: [['you', '我把瓶子放到了炉子上。'], ['fx', 'heat'], ['fx', 'boom'], ['cap', '撞击和加热都可能引爆硝化甘油。'], ['fx', 'ruins'], ['cap', '1864 年 9 月 3 日，海勒内堡的工棚在一次爆炸中被毁。五人遇难，其中有他二十岁的弟弟埃米尔。'], ['actor', 'in'], ['say', '我得让它安静下来。']], next: 'end' },
      end: { steps: [['cap', '两年后，他在易北河的一只木筏上，找到了让它安静下来的办法。']], end: true }
    }
  };

  /* 3. Bern, 1892 */
  SCENES.bern = {
    place: '伯尔尼', time: '1892 年 8 月　国际和平大会', plate: 'assets/map-plate.webp', actor: 'assets/alfred-seated.webp', tone: 'map', actorSide: 'left',
    setup: function () {
      props.innerHTML = '<figure class="bern__book"><img src="assets/waffen-nieder.webp" alt=""></figure><div class="bern__letters"></div>';
    },
    fx: {
      letters: function () {
        var g = G(), lay = props.querySelector('.bern__letters');
        if (!g || reduce) return wait(10);
        for (var i = 0; i < 5; i++) {
          var env = document.createElement('i');
          env.className = 'env';
          env.innerHTML = '<svg viewBox="0 0 60 40" aria-hidden="true"><rect x="1" y="1" width="58" height="38" fill="#fbfbfc" stroke="#131922"/><path d="M1 1 L30 22 L59 1" fill="none" stroke="#131922"/><circle cx="48" cy="11" r="5" fill="#ef861b"/></svg>';
          lay.appendChild(env);
          var dir = i % 2 ? 1 : -1;
          var tl = g.timeline({ repeat: -1, delay: i * 1.1 });
          tl.fromTo(env, { xPercent: dir > 0 ? -60 : 60, left: dir > 0 ? '22%' : '70%', top: (30 + i * 9) + '%', rotation: -dir * 20, opacity: 0, scale: 0.7 },
            { left: dir > 0 ? '68%' : '24%', top: (22 + i * 8) + '%', rotation: dir * 14, opacity: 1, scale: 1, duration: 3.4, ease: 'sine.inOut' })
            .to(env, { opacity: 0, duration: 0.6 }, 2.8);
          killers.push(function (t) { return function () { t.kill(); }; }(tl));
        }
        play('whoosh');
        return wait(600);
      },
      stamp: function () {
        var g = G();
        var s = document.createElement('div');
        s.className = 'bern__stamp'; s.innerHTML = '<span>1905</span><small>和平奖</small>';
        props.appendChild(s);
        play('seal');
        if (!g) return wait(10);
        return new Promise(function (r) {
          g.fromTo(s, { scale: 3.2, rotation: -40, opacity: 0 }, { scale: 1, rotation: -12, opacity: 1, duration: reduce ? 0.01 : 0.55, ease: 'power4.in', onComplete: function () {
            var c = rectIn(s); shake(10, 0.4);
            if (fx && !reduce) { fx.ring(c.x, c.y, { r0: c.w * 0.4, r1: c.w * 1.6, life: 0.7, width: 5 }); fx.sparkle(c.x, c.y, { n: 30 }); }
            r();
          } });
        });
      }
    },
    start: 'a',
    nodes: {
      a: { steps: [['cap', '1892 年夏，伯尔尼正在开国际和平大会。'], ['cap', '这一段里，你是贝尔塔·冯·苏特纳。十六年前，你给他做过几天秘书，从那以后一直和他通信。'], ['fx', 'letters'], ['actor', 'in'], ['say', '贝尔塔，你的信我都读了。'], ['say', '可你真的相信，开几次会，就能让各国放下武器？']],
        choices: [['“请您支持我们的和平大会。”', 'b'], ['“您的炸药，会不会让战争更可怕？”', 'c']] },
      b: { steps: [['you', '请您支持我们的和平大会。'], ['say', '我会捐一笔钱。'], ['say', '不过我还是觉得，我的工厂也许会比你们的大会更早终结战争。']], next: 'd' },
      c: { steps: [['you', '您的炸药，会不会让战争更可怕？'], ['say', '也许正相反。'], ['say', '我的工厂，也许会比你们的大会更早终结战争。']], next: 'd' },
      d: { steps: [['say', '等到两支军队能在一秒钟内同归于尽，各国都会害怕，自己解散军队。']],
        choices: [['“武器只会越造越多。”', 'e'], ['“但愿您是对的。”', 'f']] },
      e: { steps: [['you', '武器只会越造越多。'], ['say', '……也许你说得对。让我再想想。']], next: 'g' },
      f: { steps: [['you', '但愿您是对的。'], ['say', '我也但愿如此。']], next: 'g' },
      g: { steps: [['cap', '三年后，他在遗嘱里给“和平”留了一份奖金。'], ['fx', 'stamp'], ['cap', '1905 年，这份奖颁给了你：贝尔塔·冯·苏特纳，第一位获得和平奖的女性。'], ['cap', '1914 年，第一次世界大战爆发。他关于工厂的那个预言，没有实现。']], end: true }
    }
  };

  /* 4. signing the will */
  SCENES.will = {
    place: '巴黎　瑞典－挪威俱乐部', time: '1895 年 11 月 27 日', actor: 'assets/alfred-profile.webp', tone: 'desk',
    setup: function () {
      props.innerHTML = '<div class="desk"><div class="desk__sheet"><svg class="desk__hand" viewBox="0 0 520 600" aria-hidden="true"></svg>' +
        '<div class="desk__sig"><svg viewBox="0 0 440 80" aria-hidden="true"><text x="6" y="56">Alfred Bernhard Nobel</text></svg></div>' +
        '<svg class="desk__wit" viewBox="0 0 520 80" aria-hidden="true"></svg></div>' +
        '<svg class="desk__quill" viewBox="0 0 120 220" aria-hidden="true"><path d="M8 212 C 30 150, 60 70, 112 6 C 96 60, 70 120, 22 200 Z" fill="#fbfbfc" stroke="#131922" stroke-width="2"/><path d="M8 212 L 70 100" stroke="#131922" stroke-width="1.4"/><path d="M40 150 l18 -8 M50 128 l18 -8 M60 106 l16 -8 M70 84 l14 -7" stroke="#131922" stroke-width="1"/></svg>' +
        '<svg class="desk__ink" viewBox="0 0 90 80" aria-hidden="true"><defs><pattern id="inkh" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><line x1="0" y1="0" x2="0" y2="4" stroke="#131922" stroke-width="1.2"/></pattern></defs><path d="M10 74 Q6 36 22 32 H68 Q84 36 80 74 Z" fill="url(#inkh)" stroke="#131922" stroke-width="2"/><rect x="31" y="16" width="28" height="17" rx="3" fill="#f7f8fa" stroke="#131922" stroke-width="2"/><ellipse cx="45" cy="16" rx="14" ry="4" fill="#131922"/><path d="M22 44 Q20 60 26 70" stroke="#fff" stroke-width="3" fill="none" opacity=".8"/></svg>' +
        '<div class="candle"><span class="candle__glow"></span><svg viewBox="0 0 80 220" aria-hidden="true"><defs><pattern id="ch" width="5" height="5" patternUnits="userSpaceOnUse"><line x1="0" y1="0" x2="0" y2="5" stroke="#131922" stroke-width=".9" opacity=".6"/></pattern></defs><path d="M26 62 Q24 52 31 48 Q36 54 40 50 Q46 56 54 50 V196 H26 Z" fill="#fbfbfc" stroke="#131922" stroke-width="2"/><path d="M44 62 V196 H54 V50" fill="url(#ch)"/><path d="M40 50 V38" stroke="#131922" stroke-width="2"/><path d="M6 196 H74 L68 212 H12 Z" fill="url(#ch)" stroke="#131922" stroke-width="2"/></svg></div></div>';
      var hand = props.querySelector('.desk__hand');
      var cdl = props.querySelector('.candle'), glowEl = props.querySelector('.candle__glow');
      every(function () {
        if (!fx || reduce) return;
        var r = cdl.getBoundingClientRect(), s0 = stageEl.getBoundingClientRect();
        if (Math.random() < 0.6) fx.flame(r.left - s0.left + r.width * 0.5, r.top - s0.top + r.height * 0.17, 2);
        glowEl.style.opacity = (0.75 + Math.random() * 0.25).toFixed(2);
      });
      var seed = 1895;
      function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
      for (var l = 0; l < 11; l++) {
        var y = 70 + l * 40, x = 40 + (l === 0 ? 30 : 0), end = l === 10 ? 300 : 480;
        svg('line', { x1: 20, x2: 500, y1: y + 6, y2: y + 6, stroke: '#babec4', 'stroke-width': 0.8 }, hand);
        while (x < end - 24) {
          var len = Math.min(24 + rnd() * 80, end - x), loops = Math.max(2, Math.round(len / 8.5)), k = len / (loops * Math.PI * 2), d = '';
          for (var t = 0; t <= loops * Math.PI * 2; t += 0.35) {
            var tall = (Math.floor(t / 6.283) * 7 + l * 3) % 9 === 0 ? 2.4 : 1, rr = (3.4 + Math.sin(t * 0.7 + l)) * tall;
            d += (d ? 'L' : 'M') + (x + t * k - Math.sin(t) * rr * 0.55).toFixed(1) + ' ' + (y - rr * (1 - Math.cos(t))).toFixed(1);
          }
          svg('path', { d: d, class: 'hw', pathLength: 1 }, hand);
          x += len + 9 + rnd() * 8;
        }
      }
    },
    fx: {
      write: function () {
        var g = G(), words = props.querySelectorAll('.desk__hand .hw'), quill = props.querySelector('.desk__quill');
        if (!g || reduce) { words.forEach(function (w) { w.style.strokeDashoffset = 0; }); return wait(10); }
        g.from(props.querySelector('.desk__sheet'), { y: 80, rotation: -6, opacity: 0, duration: 1, ease: 'power3.out' });
        g.from([quill, props.querySelector('.desk__ink')], { x: 120, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.1 });
        return new Promise(function (r) {
          var tl = g.timeline({ delay: 0.6, onComplete: r });
          words.forEach(function (w, i) {
            tl.fromTo(w, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.05, ease: 'none', onStart: function () {
              var c = rectIn(w), q = rectIn(quill);
              g.to(quill, { x: '+=' + (c.x + c.w / 2 - (q.x - q.w / 2)), y: '+=' + (c.y - (q.y + q.h / 2)), duration: 0.05, ease: 'none' });
              if (i % 4 === 0) play('pen');
            } });
          });
          tl.to(quill, { x: 0, y: 0, duration: 0.6, ease: 'power2.inOut' });
        });
      },
      sign: function () {
        var g = G();
        var sig = props.querySelector('.desk__sig svg'), quill = props.querySelector('.desk__quill');
        choicesEl.innerHTML = '<button type="button" class="th__hold"><span class="th__hold-fill"></span><span class="th__hold-t">按住，签下名字</span></button>';
        var btn = choicesEl.querySelector('.th__hold'), fill = btn.querySelector('.th__hold-fill');
        if (g && !reduce) g.from(btn, { y: 20, opacity: 0, duration: 0.5, ease: 'power3.out' });
        function reveal(p) {
          sig.style.clipPath = 'inset(0 ' + (100 - p * 100).toFixed(1) + '% 0 0)';
          fill.style.transform = 'scaleX(' + p + ')';
          var s = sig.getBoundingClientRect(), b = stageEl.getBoundingClientRect(), q = quill.getBoundingClientRect();
          var tx = s.left - b.left + s.width * p, ty = s.top - b.top + s.height * 0.62 + Math.sin(p * 44) * 6;
          var qx = q.left - b.left, qy = q.top - b.top + q.height;
          if (g) g.set(quill, { x: '+=' + (tx - qx), y: '+=' + (ty - qy) });
          if (fx && p > 0 && p < 1 && Math.random() < 0.35) fx.add({ type: 'dot', x: tx, y: ty, vx: 0, vy: 20, ay: 200, size: 1.2 + Math.random() * 1.6, life: 0.6, color: 'rgba(66,40,22,.9)', fadePow: 3 });
        }
        reveal(0);
        return new Promise(function (res) {
          var t0 = 0, raf = 0, done = false, HOLD = reduce ? 1 : 1800, penT = 0;
          function tick(now) {
            var p = Math.min(1, (now - t0) / HOLD);
            reveal(p);
            if (now - penT > 140) { play('pen'); penT = now; }
            if (p >= 1) { finish(); return; }
            raf = requestAnimationFrame(tick);
          }
          function start(e) { if (done) return; e.preventDefault(); t0 = performance.now(); raf = requestAnimationFrame(tick); btn.classList.add('is-down'); }
          function stop() { if (done) return; cancelAnimationFrame(raf); btn.classList.remove('is-down'); reveal(0); }
          function finish() {
            done = true; btn.disabled = true; btn.querySelector('.th__hold-t').textContent = '已签名';
            play('right');
            if (g) g.to(quill, { x: '+=160', y: '-=60', rotation: 20, opacity: 0, duration: 0.8, ease: 'power2.in' });
            setTimeout(function () { choicesEl.innerHTML = ''; res(); }, 700);
          }
          btn.addEventListener('pointerdown', start);
          ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (n) { btn.addEventListener(n, stop); });
          btn.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && !done) { e.preventDefault(); reveal(1); finish(); } });
          btn.focus();
        });
      },
      seal: function () {
        var g = G(), sheet = props.querySelector('.desk__sheet');
        var s = document.createElement('div');
        s.className = 'desk__seal'; s.innerHTML = '<span>AN</span>';
        sheet.appendChild(s);
        play('seal');
        if (!g) return wait(10);
        return new Promise(function (r) {
          g.timeline({ onComplete: r })
            .fromTo(s, { scale: 2.6, y: -160, opacity: 0, rotation: -30 }, { scale: 1.12, y: 0, opacity: 1, rotation: -8, duration: reduce ? 0.01 : 0.45, ease: 'power4.in' })
            .add(function () { var c = rectIn(s); shake(8, 0.35); if (fx && !reduce) { fx.ring(c.x, c.y, { r0: c.w * 0.5, r1: c.w * 2, width: 4, life: 0.6 }); fx.splash(c.x, c.y, { color: '#b5401a', n: 22 }); } })
            .to(s, { scale: 1, duration: 0.4, ease: 'elastic.out(1, 0.4)' });
        });
      },
      witness: function () {
        var g = G(), w = props.querySelector('.desk__wit');
        for (var i = 0; i < 4; i++) {
          var x0 = 20 + i * 125, d = 'M' + x0 + ' 50';
          for (var t = 0; t < 14; t++) d += ' Q' + (x0 + t * 7 + 3) + ' ' + (36 + (t % 3) * 8) + ' ' + (x0 + t * 7 + 7) + ' ' + (50 - (t % 2) * 6);
          svg('path', { d: d, class: 'hw', pathLength: 1 }, w);
        }
        if (!g || reduce) { w.querySelectorAll('path').forEach(function (p) { p.style.strokeDashoffset = 0; }); return wait(10); }
        return new Promise(function (r) { g.fromTo(w.querySelectorAll('path'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.6, stagger: 0.35, ease: 'power1.inOut', onComplete: r, onStart: function () { play('pen'); } }); });
      }
    },
    start: 'a',
    nodes: {
      a: { steps: [['cap', '巴黎，瑞典－挪威俱乐部。他坐在桌前，把一份遗嘱写满了整整四页。'], ['fx', 'write'], ['actor', 'in'], ['say', '我没有妻子，也没有孩子。'], ['say', '换作是你，会把这么多钱留给谁？']],
        choices: [['“留给家人。”', 'b'], ['“留给瑞典。”', 'c'], ['“留给为人类贡献最大的人，不论国籍。”', 'd']] },
      b: { steps: [['you', '留给家人。'], ['say', '侄子侄女会得到一些。但绝大部分，我另有打算。']], next: 'e' },
      c: { steps: [['you', '留给瑞典。'], ['say', '我是瑞典人。可我不想让这些奖只属于瑞典。']], next: 'e' },
      d: { steps: [['you', '留给为人类贡献最大的人，不论国籍。'], ['say', '我们想的一样。']], next: 'e' },
      e: { steps: [['say', '利息分成五份：物理、化学、生理学或医学、文学，还有和平。'], ['say', '那就签吧。'], ['fx', 'sign'], ['fx', 'seal'], ['fx', 'witness'], ['cap', '四位证人在场签名。一年后他去世，亲属对遗嘱提出异议，执行人索尔曼花了几年才让它生效。']], end: true }
    }
  };

  /* ---------- runner ---------- */
  var current = null, fromCard = null;
  function showCap(text, t) {
    box.classList.remove('is-on');
    cap.classList.add('is-on');
    return typeInto(cap, text, t).then(function () { return waitClick(); }).then(function () { cap.classList.remove('is-on'); return wait(180); });
  }
  function showSay(who, text, t, typed) {
    cap.classList.remove('is-on');
    nameEl.textContent = who;
    box.classList.toggle('is-you', who === '你');
    box.classList.add('is-on');
    if (!typed) { lineEl.textContent = text; return wait(650); }
    return typeInto(lineEl, text, t).then(waitClick);
  }
  function actorIn() {
    if (actor.classList.contains('is-in')) return wait(10);
    actor.classList.add('is-in');
    var g = G(); if (g && !reduce) g.fromTo(actor, { xPercent: current.actorSide === 'left' ? -18 : 18, opacity: 0, filter: 'blur(8px)' }, { xPercent: 0, opacity: 1, filter: 'blur(0px)', duration: 1.2, ease: 'expo.out' });
    else actor.style.opacity = 1;
    return wait(500);
  }
  function step(s, t) {
    if (!alive(t)) return Promise.resolve();
    var kind = s[0];
    if (kind === 'cap') return showCap(s[1], t);
    if (kind === 'say') return showSay('阿尔弗雷德·诺贝尔', s[1], t, true);
    if (kind === 'you') return showSay('你', s[1], t, false);
    if (kind === 'actor') return actorIn();
    if (kind === 'fx') { box.classList.remove('is-on'); return current.fx[s[1]](); }
    return Promise.resolve();
  }
  function choose(list, t) {
    box.classList.remove('is-on');
    return new Promise(function (res) {
      choicesEl.innerHTML = '';
      list.forEach(function (c, i) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'th__choice';
        b.innerHTML = '<span class="n">' + ['I', 'II', 'III'][i] + '</span><span>' + c[0] + '</span>';
        b.addEventListener('pointerenter', function () { play('hover'); });
        b.addEventListener('click', function () {
          if (!alive(t)) return;
          play('tap');
          var g = G(), all = Array.prototype.slice.call(choicesEl.children);
          all.forEach(function (x) { x.disabled = true; });
          if (g && !reduce) {
            g.to(all.filter(function (x) { return x !== b; }), { opacity: 0, x: -20, duration: 0.3, stagger: 0.05 });
            g.to(b, { scale: 1.04, duration: 0.2, yoyo: true, repeat: 1, onComplete: function () { choicesEl.innerHTML = ''; res(c); } });
          } else { choicesEl.innerHTML = ''; res(c); }
        });
        choicesEl.appendChild(b);
      });
      var g = G();
      if (g && !reduce) g.from(choicesEl.children, { y: 24, opacity: 0, duration: 0.6, stagger: 0.09, ease: 'expo.out' });
      choicesEl.firstElementChild.focus({ preventScroll: true });
    });
  }
  function run(id, t) {
    var node = current.nodes[id];
    var p = node.steps.reduce(function (acc, s) { return acc.then(function () { return step(s, t); }); }, Promise.resolve());
    return p.then(function () {
      if (!alive(t)) return;
      if (node.choices) return choose(node.choices, t).then(function (c) { return run(c[1], t); });
      if (node.next) return run(node.next, t);
      if (node.end) return ending(t);
    });
  }
  function ending(t) {
    if (!alive(t)) return;
    box.classList.remove('is-on');
    choicesEl.innerHTML = '<button type="button" class="th__choice th__choice--end"><span class="n">↺</span><span>换个选择，再来一次</span></button><button type="button" class="th__choice th__choice--end"><span class="n">→</span><span>回到正文</span></button>';
    var b = choicesEl.querySelectorAll('button');
    b[0].addEventListener('click', function () { play('tap'); restart(); });
    b[1].addEventListener('click', function () { play('tap'); close(); });
    var g = G(); if (g && !reduce) g.from(b, { y: 20, opacity: 0, stagger: 0.1, duration: 0.6, ease: 'expo.out' });
    b[1].focus({ preventScroll: true });
    if (fromCard) fromCard.classList.add('is-done');
    try { var k = JSON.parse(localStorage.getItem('nobel-scenes') || '[]'); if (k.indexOf(current.id) === -1) k.push(current.id); localStorage.setItem('nobel-scenes', JSON.stringify(k)); } catch (e) { /* ignore */ }
  }
  function resetStage() {
    killers.forEach(function (k) { k(); }); killers = [];
    if (fx) fx.clear();
    var g = G();
    [stageEl, plate, smoke, props, actor, flashEl].forEach(function (n) { if (g) g.killTweensOf(n); n.removeAttribute('style'); });
    props.innerHTML = ''; choicesEl.innerHTML = ''; cap.textContent = ''; lineEl.textContent = '';
    cap.classList.remove('is-on'); box.classList.remove('is-on'); actor.classList.remove('is-in');
    clickResolver = null; skipTyping = null;
  }
  function prepare(sc) {
    resetStage();
    el.dataset.tone = sc.tone || 'paper';
    el.dataset.side = sc.actorSide || 'right';
    plate.classList.remove('is-photo');
    plate.hidden = !sc.plate;
    if (sc.plate) plate.src = sc.plate;
    if (sc.actor) actorImg.src = sc.actor;
    $('.th__place').textContent = sc.place;
    $('.th__time').textContent = sc.time;
    sc.setup();
    ambient();
  }
  function titleCard(t) {
    var g = G();
    titleEl.classList.add('is-on');
    if (!g || reduce) return wait(900).then(function () { titleEl.classList.remove('is-on'); });
    play('whoosh');
    return new Promise(function (r) {
      g.timeline({ onComplete: function () { titleEl.classList.remove('is-on'); r(); } })
        .fromTo('.th__place', { yPercent: 60, opacity: 0, letterSpacing: '0.5em' }, { yPercent: 0, opacity: 1, letterSpacing: '0.12em', duration: 1.2, ease: 'expo.out' })
        .fromTo('.th__rule', { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: 'expo.inOut' }, 0.2)
        .fromTo('.th__time', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 0.5)
        .to(titleEl, { opacity: 0, duration: 0.6, delay: 1.1 })
        .set(titleEl, { opacity: 1 });
    });
  }
  function ambient() {
    every(function () {
      if (!fx || reduce || Math.random() > 0.08) return;
      var W = stageEl.clientWidth, H = stageEl.clientHeight;
      fx.add({ type: 'dot', x: Math.random() * W, y: H * (0.2 + Math.random() * 0.6), vx: 6 + Math.random() * 10, vy: -4 - Math.random() * 8, size: 0.8 + Math.random() * 1.6, life: 5 + Math.random() * 4, color: 'rgba(255,248,225,.85)', alpha: 0.7, fadePow: 1 });
    });
  }
  var px = 0, py = 0;
  el.addEventListener('pointermove', function (e) {
    px = e.clientX / innerWidth - 0.5; py = e.clientY / innerHeight - 0.5;
    var g = G(); if (!g || reduce) return;
    g.to('.th__set', { x: -px * 18, y: -py * 12, duration: 1.2, ease: 'power3.out', overwrite: 'auto' });
    g.to('.th__props', { x: -px * 34, y: -py * 20, duration: 1.2, ease: 'power3.out', overwrite: 'auto' });
  });
  function restart() {
    var t = ++token;
    prepare(current);
    run(current.start, t);
  }
  function lenis() { return window.__nobel && window.__nobel.lenis; }
  function open(id, card) {
    var sc = SCENES[id]; if (!sc) return;
    sc.id = id; current = sc; fromCard = card || null;
    var t = ++token;
    prepare(sc);
    el.hidden = false;
    document.documentElement.classList.add('th-open');
    if (lenis()) lenis().stop();
    var g = G();
    play('rise');
    var startRun = function () { titleCard(t).then(function () { if (alive(t)) run(sc.start, t); }); };
    if (g && !reduce && card) {
      var r = card.getBoundingClientRect(), W = innerWidth, H = innerHeight;
      var from = 'inset(' + r.top + 'px ' + (W - r.right) + 'px ' + (H - r.bottom) + 'px ' + r.left + 'px round 18px)';
      g.timeline({ onComplete: startRun })
        .fromTo(el, { clipPath: from }, { clipPath: 'inset(0px 0px 0px 0px round 0px)', duration: 1.1, ease: 'expo.inOut' })
        .fromTo('.th__bar', { scaleY: 0 }, { scaleY: 1, duration: 0.8, ease: 'expo.inOut' }, 0.5)
        .fromTo(plate, { scale: 1.3 }, { scale: 1.06, duration: 2.4, ease: 'power2.out' }, 0)
        .fromTo('.th__top', { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.6 }, 0.9);
    } else { el.style.clipPath = 'none'; startRun(); }
    el.focus({ preventScroll: true });
  }
  function close() {
    var t = ++token;
    var g = G();
    var done = function () {
      resetStage();
      el.hidden = true; el.removeAttribute('style');
      document.documentElement.classList.remove('th-open');
      if (lenis()) lenis().start();
      if (fromCard) fromCard.querySelector('button').focus({ preventScroll: true });
    };
    if (g && !reduce && fromCard) {
      var r = fromCard.getBoundingClientRect(), W = innerWidth, H = innerHeight;
      g.timeline({ onComplete: done })
        .to('.th__bar', { scaleY: 0, duration: 0.5, ease: 'expo.in' })
        .to(el, { clipPath: 'inset(' + r.top + 'px ' + (W - r.right) + 'px ' + (H - r.bottom) + 'px ' + r.left + 'px round 18px)', duration: 0.9, ease: 'expo.inOut' }, 0.2);
    } else done();
    return t;
  }
  el.querySelector('.th__close').addEventListener('click', function () { play('tap'); close(); });
  document.addEventListener('keydown', function (e) {
    if (el.hidden) return;
    if (e.key === 'Escape') { close(); return; }
    if ((e.key === ' ' || e.key === 'Enter') && !e.target.closest('button')) { e.preventDefault(); onAdvance({ target: el }); }
  });
  el.tabIndex = -1;

  /* scene cards in the page */
  var seen = [];
  try { seen = JSON.parse(localStorage.getItem('nobel-scenes') || '[]'); } catch (e) { seen = []; }
  document.querySelectorAll('.scene-card').forEach(function (card) {
    var id = card.dataset.scene;
    if (seen.indexOf(id) !== -1) card.classList.add('is-done');
    card.querySelector('button').addEventListener('click', function () { play('tap'); open(id, card); });
  });
  NB.theatre = { open: open, close: close };
})();
