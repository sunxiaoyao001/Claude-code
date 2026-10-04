// Episode 02 · 你的大脑在骗你：认知偏差大赏
CONFIG.slug = 'cognitive-bias';
CONFIG.plainLabel = '说白了';
// drums drop out while #10 builds up, come back on the "你也中了" reveal
CONFIG.music = { chords: 'ep02', seed: 11, drop: 8.4, breaks: [[62.4, 64.8]], outro: 74.4 };

const SVGNS = 'http://www.w3.org/2000/svg';
function svg(parent, w, h, css = '') {
  const s = document.createElementNS(SVGNS, 'svg');
  s.setAttribute('width', w); s.setAttribute('height', h); s.setAttribute('viewBox', `0 0 ${w} ${h}`);
  s.style.cssText = 'position:absolute;left:0;top:0;overflow:visible;' + css;
  parent.appendChild(s);
  return s;
}
function sv(parent, tag, attrs) {
  const e = document.createElementNS(SVGNS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  parent.appendChild(e);
  return e;
}
const YEL = '#FFD84D', PINK = '#FF8FB8', GRAY = '#4A4658', DIM = '#8A8F9E';

// =====================================================================
// S01 · Hook: Müller-Lyer illusion (0 – 4.8)
// =====================================================================
scene(0, 4.8, (root, cue, sub, dur) => {
  const q = mk(root, 'left:0;right:0;top:300px;text-align:center;font-size:96px;font-weight:900;white-space:nowrap', '哪条线更长？');
  const head = mk(root, 'left:0;right:0;top:300px;text-align:center;font-size:92px;font-weight:900;white-space:nowrap',
    '你的大脑，<span style="color:var(--green)">也在骗你</span>');
  const box = mk(root, 'left:0;top:560px;width:1080px;height:720px');
  const s = svg(box, 1080, 720);
  const L = 240, R = 840, f = 80;
  const mkLine = (y, out) => {
    const g = sv(s, 'g', {});
    const d = out
      ? `M${L},${y} L${R},${y} M${L},${y} l${-f},${-f} M${L},${y} l${-f},${f} M${R},${y} l${f},${-f} M${R},${y} l${f},${f}`
      : `M${L},${y} L${R},${y} M${L},${y} l${f},${-f} M${L},${y} l${f},${f} M${R},${y} l${-f},${-f} M${R},${y} l${-f},${f}`;
    const p = sv(g, 'path', { d, stroke: '#F2F2F2', 'stroke-width': 14, 'stroke-linecap': 'round', fill: 'none' });
    const shaft = sv(g, 'line', { x1: L, y1: y, x2: R, y2: y, stroke: YEL, 'stroke-width': 14, 'stroke-linecap': 'round', opacity: 0 });
    return { g, p, shaft };
  };
  const A = mkLine(170, true), B = mkLine(470, false);
  const lab = (y, t) => mk(box, `left:40px;top:${y - 40}px;font:700 56px var(--mono);color:${DIM}`, t);
  const la = lab(170, 'A'), lb = lab(470, 'B');
  const guides = [L, R].map(x => sv(s, 'line', { x1: x, y1: 40, x2: x, y2: 600, stroke: YEL, 'stroke-width': 6, 'stroke-dasharray': '18 14', opacity: 0 }));
  const stamp = mk(box, 'left:380px;top:560px;color:var(--green);background:rgba(16,15,22,.85)', '一样长！', 'abs stamp');
  sub(.3, 2.4, '你的眼睛会骗你');
  sub(2.4, 4.6, '其实你的大脑也会');
  cue(.3, 'pop'); cue(.6, 'pop'); cue(2.2, 'drop'); cue(2.4, 'drop'); cue(3.0, 'stamp'); cue(3.6, 'whoosh');
  return lt => {
    const out = 1 - P(lt, 4.45, 4.8);
    const qp = pop(lt, .2, .45);
    T(q, { s: qp.s, o: qp.o * (1 - P(lt, 3.4, 3.6)) });
    const hp = pop(lt, 3.6, .5);
    T(head, { s: hp.s, o: hp.o * out });
    [A, B].forEach((X, k) => { const p = pop(lt, .3 + k * .3, .45); X.g.style.opacity = p.o * out; X.g.style.transform = `scale(${p.s})`; X.g.style.transformOrigin = '540px 320px'; });
    la.style.opacity = P(lt, .5, .8) * out; lb.style.opacity = P(lt, .8, 1.1) * out;
    guides.forEach((g, k) => {
      const d = eo(P(lt, 2.2 + k * .2, 2.6 + k * .2));
      g.setAttribute('y2', 40 + 560 * d);
      g.setAttribute('opacity', d > 0 ? out : 0);
    });
    [A, B].forEach(X => X.shaft.setAttribute('opacity', P(lt, 2.7, 2.9) * out));
    const sp = P(lt, 3.0, 3.25);
    T(stamp, { s: lerp(2, 1, eo(sp)), o: sp * out * (1 - P(lt, 4.2, 4.45)), r: -8 });
  };
});

// =====================================================================
// S02 · Title (4.8 – 8.4)
// =====================================================================
scene(4.8, 8.4, (root, cue, sub, dur) => {
  const en = mk(root, 'left:0;right:0;top:520px;text-align:center;font:700 88px/1 var(--mono);color:var(--green)');
  const zh = mk(root, 'left:0;right:0;top:640px;text-align:center;font-size:164px;font-weight:900;line-height:1.1;white-space:nowrap', '认知偏差大赏');
  const tag = mk(root, 'left:0;right:0;top:900px;text-align:center;font-size:56px;font-weight:700;color:var(--dim)',
    '这 <span style="color:var(--orange);font-weight:900">10</span> 个，你中了几个？');
  const boxes = [...Array(10)].map((_, k) => mk(root,
    `left:${90 + (k % 5) * 186}px;top:${1060 + Math.floor(k / 5) * 130}px;width:156px;height:104px;border-radius:18px;border:3px solid var(--green);font:700 44px/98px var(--mono);text-align:center;color:var(--green)`,
    String(k + 1).padStart(2, '0')));
  sub(.2, 1.8, '大脑为了省事，会偷偷走捷径');
  sub(1.8, 3.5, '10 个偏差，看看你中了几个');
  cue(.1, 'type', .6); cue(.7, 'boom');
  boxes.forEach((_, k) => cue(1.2 + k * .1, 'pop'));
  return lt => {
    const out = 1 - P(lt, 3.3, 3.6);
    typeInto(en, 'Cognitive Bias', lt, .1, 24, false);
    T(en, { o: out });
    const z = pop(lt, .7, .5);
    const g = glitch(zh, lt, lt > .7 && lt < 1.1 ? 1 - P(lt, .7, 1.1) : 0, 3);
    T(zh, { x: g.x, y: g.y, s: z.s * (1 + (1 - out) * .2), o: z.o * out });
    T(tag, { y: (1 - eo(P(lt, 2.2, 2.6))) * 30, o: P(lt, 2.2, 2.5) * out });
    boxes.forEach((b, k) => { const p = pop(lt, 1.2 + k * .1, .4); T(b, { s: p.s, o: p.o * out }); });
  };
});

// =====================================================================
// Cards
// =====================================================================

// #01 幸存者偏差 — Wald's returning bombers
card(0, {
  en: 'Survivorship Bias', zh: '幸存者偏差', short: '幸存者偏差',
  plain: '只看见了活下来的', roast: '成功学最爱用的滤镜',
  subs: ['二战时，返航飞机的弹孔多在机翼机身', '真正该加固的，是没弹孔的引擎'],
  vis: (v, cue) => {
    const tagA = mk(v, 'left:0;top:0;background:#2A2738;color:var(--text);font-size:30px', '返航飞机的弹孔分布', 'abs chip');
    const plane = mk(v, 'left:0;top:60px;width:960px;height:540px');
    const s = svg(plane, 960, 540);
    const body = { fill: '#3A3650', stroke: '#6B6680', 'stroke-width': 4 };
    sv(s, 'polygon', { points: '480,170 900,250 900,290 480,270 60,290 60,250', ...body });         // wings
    sv(s, 'polygon', { points: '480,430 640,470 640,492 480,480 320,492 320,470', ...body });         // tail
    sv(s, 'rect', { x: 446, y: 20, width: 68, height: 500, rx: 34, ...body });                        // fuselage
    const engines = [300, 660].map(x => sv(s, 'rect', { x: x - 26, y: 200, width: 52, height: 100, rx: 18, fill: '#4A4562', stroke: '#6B6680', 'stroke-width': 4 }));
    // bullet holes: wings, fuselage, tail — never on the engines
    const holes = [[120, 268], [170, 258], [215, 276], [380, 250], [410, 268], [560, 262], [590, 248], [740, 270], [790, 262], [850, 268],
      [470, 110], [492, 160], [468, 330], [490, 380], [478, 230], [370, 476], [410, 470], [560, 474], [600, 480], [150, 280], [810, 276], [455, 60]];
    const dots = holes.map(([x, y]) => sv(s, 'circle', { cx: x, cy: y, r: 9, fill: '#FF4D5E', opacity: 0 }));
    const warn = mk(v, 'left:150px;top:400px;background:var(--green);color:#111;font-size:32px', '⚠ 引擎没弹孔＝中弹的都没飞回来', 'abs chip');
    holes.forEach((_, k) => { if (k % 3 === 0) cue(.8 + k * .07, 'tick'); });
    cue(2.9, 'success');
    return lt => {
      tagA.style.opacity = P(lt, .4, .7);
      const pp = pop(lt, .3, .5);
      T(plane, { s: pp.s, o: pp.o });
      dots.forEach((d, k) => { const p = P(lt, .8 + k * .07, .9 + k * .07); d.setAttribute('opacity', p); d.setAttribute('r', 9 + 6 * (1 - p) * (p > 0)); });
      const hi = P(lt, 2.9, 3.2);
      const pulse = lt > 2.9 ? .5 + .5 * Math.sin(lt * 8) : 0;
      engines.forEach(e => { e.setAttribute('fill', hi > 0 ? YEL : '#4A4562'); e.setAttribute('stroke', hi > 0 ? '#fff' : '#6B6680'); e.style.filter = hi > 0 ? `drop-shadow(0 0 ${12 + 14 * pulse}px rgba(255,216,77,.9))` : ''; });
      const wp = pop(lt, 3.1, .4);
      T(warn, { s: wp.s, o: wp.o });
    };
  },
});

// #02 锚定效应 — the "original price" anchor
card(1, {
  en: 'Anchoring Effect', zh: '锚定效应', short: '锚定效应',
  plain: '第一个数字，定住了你的判断', roast: '“原价”就是写给你看的',
  subs: ['先看到 999，再看到 299', '你就觉得自己赚到了'],
  vis: (v, cue) => {
    const tag = mk(v, 'left:150px;top:150px;width:540px;height:430px;border-radius:30px;background:#F2F2F2;color:#111');
    mk(tag, 'left:40px;top:36px;width:34px;height:34px;border-radius:50%;background:var(--bg)');
    mk(tag, 'left:110px;top:30px;font-size:40px;font-weight:800;color:#666', '原价');
    const old = mk(tag, 'left:110px;top:80px;font:900 140px/1 var(--mono);color:#222', '¥999');
    const strike = mk(tag, 'left:100px;top:150px;width:400px;height:14px;background:#FF4D5E;border-radius:7px;transform-origin:0 50%');
    const now = mk(tag, 'left:110px;top:250px;font:900 150px/1 var(--mono);color:#E0A800', '¥299');
    const chain = mk(v, 'left:416px;top:-40px;width:8px;height:0;background:repeating-linear-gradient(#8A8F9E 0 14px,transparent 14px 22px)');
    const anchor = mk(v, 'left:360px;top:-20px;font-size:120px', '<span class="emo">⚓</span>');
    const think = mk(v, 'left:640px;top:40px;background:#fff;color:#111', '好便宜！<span class="emo">🤩</span>', 'abs bubble');
    cue(.9, 'drop'); cue(1.3, 'stamp'); cue(1.8, 'error'); cue(2.2, 'pop'); cue(2.9, 'success');
    return lt => {
      const tp = pop(lt, .3, .45);
      T(tag, { s: tp.s, o: tp.o, r: -3 });
      const fall = eo(P(lt, .8, 1.3));
      T(anchor, { y: fall * 50 - (1 - fall) * 200, o: P(lt, .8, .9) });
      chain.style.height = (fall * 70) + 'px';
      T(strike, { sx: eo(P(lt, 1.8, 2.05)), o: lt > 1.8 ? 1 : 0, r: -4 });
      T(old, { o: lt > 2.0 ? .45 : 1 });
      const np = pop(lt, 2.2, .45);
      T(now, { s: np.s, o: np.o });
      const bp = pop(lt, 2.9, .4);
      T(think, { s: bp.s, o: bp.o });
    };
  },
});

// #03 沉没成本 — sitting through a bad movie
card(2, {
  en: 'Sunk Cost Fallacy', zh: '沉没成本', short: '沉没成本',
  plain: '花掉的成本，不该绑架下一步', roast: '来都来了',
  subs: ['电影很难看，但票都买了', '于是又搭进去两个小时'],
  vis: (v, cue) => {
    const ticket = mk(v, 'left:20px;top:120px;width:360px;height:220px;border-radius:22px;background:var(--orange);color:#111;padding:26px 30px');
    ticket.innerHTML = '<div style="font-size:34px;font-weight:800">电影票</div><div style="font:900 96px/1.1 var(--mono)">¥60</div>' +
      '<div style="position:absolute;right:70px;top:0;bottom:0;border-left:5px dashed rgba(0,0,0,.35)"></div>';
    const screen = mk(v, 'left:430px;top:40px;width:520px;height:320px;border-radius:24px;background:#0B0A10;border:6px solid #2E2B3B;text-align:center');
    const face = mk(screen, 'left:0;right:0;top:40px;font-size:150px', '<span class="emo">😴</span>');
    mk(screen, 'left:0;right:0;top:230px;font-size:34px;font-weight:700;color:#777', '剧情：无聊');
    const clock = mk(v, 'left:430px;top:380px;width:520px;text-align:center;font:700 44px var(--mono);color:var(--text)');
    const sunk = mk(v, 'left:0;right:0;top:470px;text-align:center;font-size:52px;font-weight:900;color:var(--green)');
    cue(1.0, 'riser');
    return lt => {
      const a = pop(lt, .3, .4); T(ticket, { s: a.s, o: a.o, r: -6 });
      const b = pop(lt, .5, .4); T(screen, { s: b.s, o: b.o });
      T(face, { y: Math.sin(lt * 2.5) * 6 });
      const m = Math.round(30 + 90 * eio(P(lt, 1.0, 4.4)));
      clock.textContent = `已经坐了 ${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
      clock.style.opacity = P(lt, .8, 1.0);
      sunk.textContent = `已投入：¥60 + ${m} 分钟`;
      sunk.style.opacity = P(lt, 1.0, 1.2);
      T(sunk, { s: 1 + (lt > 1 && lt < 4.4 ? Math.sin(lt * 30) * .01 : 0), o: P(lt, 1.0, 1.2) });
    };
  },
});

// #04 确认偏误 — muting the results you don't like
card(3, {
  en: 'Confirmation Bias', zh: '确认偏误', short: '确认偏误',
  plain: '只找支持自己的证据', roast: '答案早就写在搜索框里了',
  subs: ['你先信了，再去找理由', '反对的声音，被自动静音'],
  vis: (v, cue) => {
    const box = mk(v, 'left:0;top:0;width:960px;height:100px;border-radius:50px;background:#F2F2F2;color:#111');
    mk(box, 'left:34px;top:20px;font-size:52px', '<span class="emo">🔍</span>');
    const q = mk(box, 'left:120px;top:22px;font-size:44px;font-weight:800');
    const R = [['喝咖啡的人更长寿？研究来了', 1], ['咖啡因摄入过量的风险', 0], ['每天三杯咖啡的五个好处', 1], ['咖啡和失眠的关系', 0], ['咖啡提神又抗氧化', 1]];
    const rows = R.map(([t, ok], k) => {
      const r = mk(v, `left:0;top:${140 + k * 92}px;width:960px;height:76px;border-radius:16px;background:#1D1B27;border:3px solid #2E2B3B;padding:14px 26px;font-size:36px;font-weight:700;white-space:nowrap`,
        `<span style="color:${ok ? YEL : PINK};margin-right:16px">${ok ? '✓' : '✗'}</span>${esc(t)}`);
      const mute = ok ? null : mk(r, 'right:24px;top:6px;font-size:44px', '<span class="emo">🔇</span>');
      return { r, ok, mute };
    });
    cue(.4, 'type', 1.0); R.forEach((_, k) => cue(1.5 + k * .15, 'tick')); cue(2.8, 'drop'); cue(3.0, 'success');
    return lt => {
      const bp = pop(lt, .2, .4); T(box, { s: bp.s, o: bp.o });
      typeInto(q, '咖啡 对身体好吗', lt, .4, 8, lt < 1.6);
      const k2 = eo(P(lt, 2.8, 3.2));
      rows.forEach((R, k) => {
        const p = pop(lt, 1.5 + k * .15, .35);
        if (R.ok) {
          T(R.r, { s: p.s * (1 + .04 * k2), o: p.o });
          R.r.style.borderColor = k2 > 0 ? 'var(--green)' : '';
        } else {
          T(R.r, { s: p.s * (1 - .05 * k2), o: p.o * (1 - .75 * k2) });
          R.r.style.filter = `blur(${k2 * 5}px)`;
          R.mute.style.filter = `blur(${-k2 * 5}px)`;
        }
      });
    };
  },
});

// #05 从众效应 — Asch's line experiment
card(4, {
  en: 'Conformity', zh: '从众效应', short: '从众效应',
  plain: '大家都这么选，你也跟着选', roast: '明明知道答案，还是举了手',
  subs: ['标准线和哪条一样长？明明是 C', '前面 5 个人都说 A，你也犹豫了'],
  vis: (v, cue) => {
    const base = 300;
    const line = (x, h, label, col = '#F2F2F2') => {
      const l = mk(v, `left:${x}px;top:${base - h}px;width:18px;height:${h}px;border-radius:9px;background:${col};transform-origin:50% 100%`);
      const t = mk(v, `left:${x - 30}px;top:${base + 14}px;width:78px;text-align:center;font:700 40px var(--mono);color:${DIM}`, label);
      return { l, t };
    };
    const ref = line(110, 200, '标准', YEL);
    ref.t.style.fontFamily = 'var(--sans)'; ref.t.style.fontSize = '32px'; ref.t.style.width = '120px'; ref.t.style.left = '58px';
    const div = mk(v, 'left:260px;top:60px;width:4px;height:280px;background:#2E2B3B');
    const opts = [line(420, 140, 'A'), line(600, 290, 'B'), line(780, 200, 'C')];
    const who = ['1', '2', '3', '4', '5', '你'];
    const avs = who.map((w, k) => mk(v, `left:${40 + k * 150}px;top:470px;width:110px;height:110px;border-radius:50%;background:${k === 5 ? 'var(--green)' : '#3A3650'};color:${k === 5 ? '#111' : 'var(--text)'};font:900 46px/110px var(--sans);text-align:center`, w));
    const says = who.map((w, k) => mk(v, `left:${40 + k * 150}px;top:370px;width:110px;text-align:center;background:#fff;color:#111;border-radius:22px;font:900 44px/76px var(--mono)`, k === 5 ? 'A…？' : 'A'));
    const ts = [1.3, 1.6, 1.9, 2.2, 2.5, 3.3];
    ts.forEach((t, k) => cue(t, k === 5 ? 'error' : 'pop'));
    return lt => {
      [ref, ...opts].forEach((o, k) => { const g = eo(P(lt, .3 + k * .1, .7 + k * .1)); T(o.l, { sy: g, o: g > 0 ? 1 : 0 }); o.t.style.opacity = g; });
      div.style.opacity = P(lt, .3, .6);
      const cHi = lt > .9 && lt < 1.3 ? 1 : 0;
      opts[2].l.style.boxShadow = cHi ? '0 0 26px rgba(255,216,77,.9)' : '';
      avs.forEach((a, k) => { const p = pop(lt, .6 + k * .06, .35); T(a, { s: p.s, o: p.o, x: k === 5 && lt > 2.8 && lt < 3.3 ? Math.sin(lt * 50) * 8 : 0 }); });
      says.forEach((s, k) => { const p = pop(lt, ts[k], .35); T(s, { s: p.s, o: p.o }); });
    };
  },
});

// #06 损失厌恶 — losing hurts about twice as much
card(5, {
  en: 'Loss Aversion', zh: '损失厌恶', short: '损失厌恶',
  plain: '失去的痛，比得到的爽更强', roast: '所以套牢的股票舍不得卖',
  subs: ['研究发现，损失带来的痛苦', '大约是同等收益快乐的两倍'],
  vis: (v, cue) => {
    const baseY = 470;
    mk(v, `left:80px;top:${baseY}px;width:800px;height:6px;border-radius:3px;background:#3A3650`);
    const bar = (x, col, h) => mk(v, `left:${x}px;top:${baseY - h}px;width:220px;height:${h}px;border-radius:20px 20px 0 0;background:${col};transform-origin:50% 100%`);
    const gain = bar(200, YEL, 150), loss = bar(540, PINK, 300);
    const gainL = mk(v, `left:150px;top:${baseY + 20}px;width:320px;text-align:center;font-size:40px;font-weight:800`, '得到 ¥100');
    const lossL = mk(v, `left:490px;top:${baseY + 20}px;width:320px;text-align:center;font-size:40px;font-weight:800`, '失去 ¥100');
    const gainE = mk(v, `left:255px;top:${baseY - 270}px;font-size:100px`, '<span class="emo">😊</span>');
    const lossE = mk(v, `left:595px;top:${baseY - 420}px;font-size:100px`, '<span class="emo">😫</span>');
    const x2 = mk(v, 'left:0;top:40px;background:var(--orange);color:#111;font-size:46px', '痛苦 ≈ 2 倍', 'abs chip');
    cue(.9, 'success'); cue(1.9, 'error'); cue(3.0, 'stamp');
    return lt => {
      const g = eo(P(lt, .9, 1.4)), l = eo(P(lt, 1.9, 2.6));
      T(gain, { sy: g, o: g > 0 ? 1 : 0 }); T(loss, { sy: l, o: l > 0 ? 1 : 0 });
      gainL.style.opacity = P(lt, .4, .7); lossL.style.opacity = P(lt, .5, .8);
      const ge = pop(lt, 1.3, .4), le = pop(lt, 2.5, .4);
      T(gainE, { s: ge.s, o: ge.o }); T(lossE, { s: le.s, o: le.o, x: lt > 2.6 ? Math.sin(lt * 30) * 4 : 0 });
      const xp = pop(lt, 3.0, .4); T(x2, { s: xp.s, o: xp.o, r: -4 });
    };
  },
});

// #07 峰终定律 — only the peak and the end are remembered
card(6, {
  en: 'Peak-End Rule', zh: '峰终定律', short: '峰终定律',
  plain: '只记住最高点和结尾', roast: '所以旅行的最后一天要安排好',
  subs: ['一段经历好不好，大脑不算平均分', '只看最爽的那一刻，和结尾'],
  vis: (v, cue) => {
    const W2 = 860, H2 = 380, X0 = 60, Y0 = 100;
    const pts = [[0, .45], [.1, .4], [.2, .55], [.3, .35], [.4, .95], [.5, .5], [.6, .3], [.7, .42], [.8, .25], [.9, .5], [1, .8]];
    const xy = ([t, val]) => [X0 + t * W2, Y0 + (1 - val) * H2];
    const s = svg(v, 960, 600);
    sv(s, 'line', { x1: X0, y1: Y0 + H2, x2: X0 + W2, y2: Y0 + H2, stroke: '#3A3650', 'stroke-width': 4 });
    sv(s, 'line', { x1: X0, y1: Y0 - 20, x2: X0, y2: Y0 + H2, stroke: '#3A3650', 'stroke-width': 4 });
    const d = pts.map((p, k) => { const [x, y] = xy(p); return (k ? 'L' : 'M') + x + ',' + y; }).join(' ');
    const path = sv(s, 'path', { d, fill: 'none', stroke: YEL, 'stroke-width': 10, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
    const len = path.getTotalLength();
    path.setAttribute('stroke-dasharray', len);
    const ax1 = mk(v, `left:${X0 + W2 - 160}px;top:${Y0 + H2 + 14}px;font-size:30px;color:${DIM}`, '时间 →');
    const ax2 = mk(v, `left:${X0 + 14}px;top:${Y0 - 50}px;font-size:30px;color:${DIM}`, '爽度');
    const star = (p, label) => {
      const [x, y] = xy(p);
      const e = mk(v, `left:${x - 40}px;top:${y - 40}px;width:80px;height:80px;border-radius:50%;background:${PINK};color:#111;font:900 40px/80px var(--sans);text-align:center`, label);
      return e;
    };
    const peak = star(pts[4], '峰'), end = star(pts[10], '终');
    const avg = mk(v, 'left:420px;top:0;font-size:40px;font-weight:800;color:var(--text)', '平均分？');
    const avgX = mk(v, 'left:410px;top:24px;width:190px;height:8px;background:#FF4D5E;border-radius:4px;transform-origin:0 50%');
    cue(.4, 'riser'); cue(2.2, 'pop'); cue(2.4, 'pop'); cue(3.0, 'error');
    return lt => {
      const dp = eio(P(lt, .4, 1.9));
      path.setAttribute('stroke-dashoffset', len * (1 - dp));
      const gray = P(lt, 2.2, 2.6);
      path.setAttribute('stroke', gray > 0 ? `rgba(255,216,77,${1 - gray * .75})` : YEL);
      ax1.style.opacity = ax2.style.opacity = P(lt, .3, .6);
      const a = pop(lt, 2.2, .4), b = pop(lt, 2.4, .4);
      T(peak, { s: a.s, o: a.o }); T(end, { s: b.s, o: b.o });
      avg.style.opacity = P(lt, 2.8, 3.0);
      T(avgX, { sx: eo(P(lt, 3.0, 3.25)), o: lt > 3.0 ? 1 : 0 });
    };
  },
});

// #08 聚光灯效应 — nobody is watching (they're on their phones)
card(7, {
  en: 'Spotlight Effect', zh: '聚光灯效应', short: '聚光灯效应',
  plain: '你以为全场都在看你', roast: '你的尴尬，别人三秒就忘',
  subs: ['穿尴尬 T 恤的人，以为一半人注意到了', '实际只有大约四分之一'],
  vis: (v, cue) => {
    const cone = mk(v, 'left:130px;top:-40px;width:340px;height:380px;background:linear-gradient(rgba(255,216,77,.55),rgba(255,216,77,.08));clip-path:polygon(40% 0,60% 0,100% 100%,0 100%)');
    const me = mk(v, 'left:205px;top:150px;font-size:170px', '<span class="emo">🧍</span>');
    const crowd = [...Array(5)].map((_, k) => mk(v, `left:${30 + k * 110}px;top:430px;font-size:80px`, '<span class="emo">👀</span>'));
    const bars = mk(v, 'left:560px;top:60px;width:400px;height:360px');
    const mkBar = (y, label, col) => {
      mk(bars, `left:0;top:${y}px;font-size:34px;font-weight:800`, label);
      const track = mk(bars, `left:0;top:${y + 52}px;width:400px;height:54px;border-radius:27px;background:#2A2738;overflow:hidden`);
      const fill = mk(track, `left:0;top:0;height:54px;background:${col};border-radius:27px`);
      const num = mk(bars, `left:0;top:${y + 52}px;width:390px;text-align:right;font:900 36px/54px var(--mono);color:#111`);
      return { fill, num };
    };
    const b1 = mkBar(0, '你以为被注意到', PINK), b2 = mkBar(170, '实际注意到的', YEL);
    cue(.3, 'whoosh'); cue(1.6, 'tick'); cue(2.2, 'pop'); cue(2.9, 'pop');
    return lt => {
      cone.style.opacity = P(lt, .2, .5) * (.85 + .15 * Math.sin(lt * 6));
      const mp = pop(lt, .4, .45); T(me, { s: mp.s, o: mp.o });
      crowd.forEach((c, k) => {
        const p = pop(lt, .8 + k * .08, .35);
        T(c, { s: p.s, o: p.o });
        c.innerHTML = lt < 1.6 + k * .08 ? '<span class="emo">👀</span>' : '<span class="emo">📱</span>';
      });
      bars.style.opacity = P(lt, 2.0, 2.2);
      const f1 = eo(P(lt, 2.2, 2.8)), f2 = eo(P(lt, 2.9, 3.5));
      b1.fill.style.width = (50 * f1) + '%'; b1.num.textContent = f1 > .05 ? `${Math.round(50 * f1)}%` : '';
      b2.fill.style.width = (25 * f2) + '%'; b2.num.textContent = f2 > .05 ? `≈${Math.round(25 * f2)}%` : '';
      b1.num.style.color = b2.num.style.color = 'var(--text)';
    };
  },
});

// #09 达克效应 — illustrative self-estimate vs actual by quartile
card(8, {
  en: 'Dunning–Kruger Effect', zh: '达克效应', short: '达克效应',
  plain: '越不懂，越容易高估自己', roast: '评论区最常见的效应',
  subs: ['能力排在后面的人', '却普遍以为自己高于平均'],
  vis: (v, cue) => {
    const baseY = 470, H3 = 380;
    const groups = [['倒数 25%', 12, 60], ['中下', 37, 63], ['中上', 63, 70], ['前 25%', 87, 76]];
    mk(v, `left:20px;top:${baseY}px;width:920px;height:5px;background:#3A3650;border-radius:3px`);
    const avgY = baseY - H3 * .5;
    const avgL = mk(v, `left:20px;top:${avgY}px;width:920px;height:0;border-top:4px dashed #6B6680`);
    const avgT = mk(v, `left:902px;top:${avgY - 18}px;font-size:28px;color:${DIM}`, '平均');
    const bars = groups.map(([name, real, self], k) => {
      const x = 50 + k * 225;
      const rb = mk(v, `left:${x}px;top:${baseY - H3 * real / 100}px;width:80px;height:${H3 * real / 100}px;background:#6B6680;border-radius:12px 12px 0 0;transform-origin:50% 100%`);
      const sb = mk(v, `left:${x + 90}px;top:${baseY - H3 * self / 100}px;width:80px;height:${H3 * self / 100}px;background:${YEL};border-radius:12px 12px 0 0;transform-origin:50% 100%`);
      const lb = mk(v, `left:${x - 20}px;top:${baseY + 16}px;width:210px;text-align:center;font-size:32px;font-weight:800`, name);
      return { rb, sb, lb };
    });
    const legend = mk(v, 'left:20px;top:0;font-size:30px;font-weight:700',
      `<span style="display:inline-block;width:26px;height:26px;border-radius:6px;background:#6B6680;vertical-align:-4px"></span> 实际水平　<span style="display:inline-block;width:26px;height:26px;border-radius:6px;background:${YEL};vertical-align:-4px"></span> 自我感觉　<span style="color:${DIM};font-size:24px">（示意）</span>`);
    const gap = mk(v, `left:30px;top:${baseY - H3 * .6 - 70}px;background:var(--orange);color:#111;font-size:32px`, '严重高估 ↑', 'abs chip');
    groups.forEach((_, k) => cue(.6 + k * .25, 'tick'));
    cue(2.6, 'stamp');
    return lt => {
      legend.style.opacity = P(lt, .3, .6);
      avgL.style.opacity = avgT.style.opacity = P(lt, 1.8, 2.1);
      bars.forEach((b, k) => {
        const r = eo(P(lt, .6 + k * .25, 1.0 + k * .25)), s = eo(P(lt, .75 + k * .25, 1.15 + k * .25));
        T(b.rb, { sy: r, o: r > 0 ? 1 : 0 }); T(b.sb, { sy: s, o: s > 0 ? (k === 0 || lt < 2.6 ? 1 : .45) : 0 });
        b.lb.style.opacity = P(lt, .5, .8);
        b.rb.style.opacity = r > 0 ? (k === 0 || lt < 2.6 ? 1 : .45) : 0;
      });
      const gp = pop(lt, 2.6, .4); T(gap, { s: gp.s, o: gp.o });
    };
  },
});

// #10 偏差盲点 — everyone else is biased, not me (music break until the reveal)
card(9, {
  en: 'Bias Blind Spot', zh: '偏差盲点', short: '偏差盲点', roastT: 3.7,
  plain: '只看得见别人的偏差', roast: '看到这觉得自己都没中？恭喜，中了',
  subs: ['大多数人都觉得', '自己比别人更不容易受偏差影响'],
  vis: (v, cue) => {
    const panel = (x, title) => {
      const p = mk(v, `left:${x}px;top:20px;width:440px;height:520px;border-radius:28px;background:#1A1824;border:3px solid #2E2B3B`);
      mk(p, 'left:0;right:0;top:24px;text-align:center;font-size:52px;font-weight:900', title);
      return p;
    };
    const L = panel(0, '别人'), R = panel(520, '我');
    const tags = ['幸存者偏差', '从众效应', '锚定效应', '沉没成本'];
    const lt_ = tags.map((t, k) => mk(L, `left:50%;top:${120 + k * 92}px;background:var(--orange);color:#111;font-size:34px`, `${t} ✓`, 'abs chip'));
    const cool = mk(R, 'left:50%;top:200px;background:#2A2738;color:var(--text);font-size:40px;border:3px solid var(--green)', '理性客观 <span class="emo">😎</span>', 'abs chip');
    const rt = [...tags, '偏差盲点'].map((t, k) => mk(R, `left:50%;top:${100 + k * 68}px;background:var(--orange);color:#111;font-size:32px`, `${t} ✓`, 'abs chip'));
    const stamp = mk(v, 'left:600px;top:500px;color:var(--orange);background:rgba(16,15,22,.88)', '你也中了', 'abs stamp');
    const flash = document.getElementById('flash');
    lt_.forEach((_, k) => cue(.5 + k * .25, 'tick'));
    cue(1.7, 'pop'); cue(2.4, 'glitch'); cue(2.4, 'boom'); rt.forEach((_, k) => cue(2.5 + k * .08, 'tick')); cue(3.2, 'stamp');
    const center = (e, s, o, extra = {}) => { e.style.transform = `translate(-50%,0) scale(${s}) rotate(${extra.r || 0}deg)`; e.style.opacity = o; };
    return lt => {
      const lp = pop(lt, .2, .4), rp = pop(lt, .35, .4);
      T(L, { s: lp.s, o: lp.o });
      const g = glitch(R, lt, lt > 2.4 && lt < 2.9 ? 1 - P(lt, 2.4, 2.9) : 0, 7);
      T(R, { x: g.x, y: g.y, s: rp.s, o: rp.o });
      lt_.forEach((e, k) => { const p = pop(lt, .5 + k * .25, .35); center(e, p.s, p.o); });
      const cp = pop(lt, 1.7, .4);
      center(cool, cp.s, cp.o * (1 - P(lt, 2.4, 2.5)));
      rt.forEach((e, k) => { const p = pop(lt, 2.5 + k * .08, .3); center(e, p.s, p.o); });
      const sp = P(lt, 3.2, 3.45);
      T(stamp, { s: lerp(2.2, 1, eo(sp)), o: sp, r: -10 });
      if (lt >= 2.4 && lt < 3.0) { flash.style.background = PINK; flash.style.opacity = .35 * (1 - P(lt, 2.4, 3.0)); }
    };
  },
});

// =====================================================================
// S13 · Wrap-up (68.4 – 74.4)
// =====================================================================
scene(68.4, 74.4, (root, cue, sub, dur) => {
  const chips = TERMS.map((s, k) => mk(root, `left:0;top:0;background:#1A1824;border:3px solid ${k % 2 ? 'var(--green)' : 'var(--orange)'};font-size:32px`, esc(s), 'abs chip'));
  const l1 = mk(root, 'left:0;right:0;top:760px;text-align:center;font-size:72px;font-weight:900;color:var(--dim)', '偏差不是笨');
  const l2 = mk(root, 'left:0;right:0;top:860px;text-align:center;font-size:72px;font-weight:900', '是大脑在省电');
  const l3 = mk(root, 'left:0;right:0;top:990px;text-align:center;font-size:76px;font-weight:900;color:var(--green);white-space:nowrap', '知道它，就能少踩坑');
  sub(.4, 2.6, '说到底');
  sub(3.0, 5.8, '做决定前，停一秒');
  chips.forEach((_, k) => cue(.2 + k * .07, 'tick'));
  cue(1.3, 'pop'); cue(2.0, 'pop'); cue(2.8, 'boom');
  return lt => {
    const out = 1 - P(lt, 5.7, 6);
    chips.forEach((c, k) => {
      const a = (k / chips.length) * Math.PI * 2 + lt * .18 - Math.PI / 2;
      const tx = 540 + Math.cos(a) * 445 - c.offsetWidth / 2, ty = 940 + Math.sin(a) * 600 - 30;
      const sx = 540 + (rnd(k * 9.1) - .5) * 2400, sy = 960 + (rnd(k * 4.3) - .5) * 3000;
      const f = eo(P(lt, .2 + k * .07, .9 + k * .07));
      T(c, { x: lerp(sx, tx, f), y: lerp(sy, ty, f), o: f * out * (lt > 2.8 ? .5 : 1), r: (1 - f) * 90 });
    });
    const p1 = pop(lt, 1.3, .45); T(l1, { s: p1.s, o: p1.o * out });
    const p2 = pop(lt, 2.0, .45); T(l2, { s: p2.s, o: p2.o * out });
    const p3 = pop(lt, 2.8, .55); T(l3, { s: p3.s, o: p3.o * out });
  };
});

// =====================================================================
// S14 · CTA (74.4 – 80)
// =====================================================================
scene(74.4, 80, (root, cue, sub, dur) => {
  const win = mk(root, 'left:60px;top:560px;width:960px;height:300px', '<div class="bar"><i></i><i></i><i></i></div>', 'abs win');
  const q = mk(win, 'left:36px;top:96px;width:890px;font-size:60px;font-weight:900;line-height:1.4');
  const s1 = mk(root, 'left:80px;top:930px;background:var(--green);color:#111;font-size:52px', '<span class="emo">⭐</span> 收藏 = 少踩坑', 'abs chip');
  const s2 = mk(root, 'left:600px;top:930px;background:var(--orange);color:#111;font-size:52px', '<span class="emo">💬</span> 评论区报数', 'abs chip');
  const ideas = ['全中了 😭', '7 个', '第 3 个太真实', '我一个没中（第 10 个）', '第 5 个天天中', '第 9 个说的是我同事'];
  const bubs = ideas.map((s, k) => mk(root, `left:${[100, 640, 260, 120, 600, 300][k]}px;top:1300px;background:#1A1824;border:2px solid var(--line);font-size:36px;color:var(--text)`, emo(esc(s)), 'abs chip'));
  sub(.3, 2.6, '收藏起来，下次停一秒');
  sub(2.6, 5.2, '你中了几个？评论区报个数');
  cue(.3, 'type', 1.4); cue(2.0, 'pop'); cue(2.4, 'pop');
  bubs.forEach((_, k) => cue(2.9 + k * .3, 'tick'));
  return lt => {
    const wp = pop(lt, 0, .4); T(win, { s: wp.s, o: wp.o });
    typeInto(q, '> 10 个里，你中了几个？', lt, .3, 9);
    const a = pop(lt, 2.0, .4); T(s1, { s: a.s, o: a.o, r: -4 });
    const b = pop(lt, 2.4, .4); T(s2, { s: b.s, o: b.o, r: 3 });
    bubs.forEach((e, k) => {
      const t0 = 2.9 + k * .3, f = P(lt, t0, t0 + 2.4);
      T(e, { y: -f * 260, o: lt < t0 ? 0 : clamp(Math.sin(f * Math.PI) * 2) });
    });
    document.getElementById('flash').style.background = '#000';
    document.getElementById('flash').style.opacity = P(lt, 4.9, 5.6);
  };
});

finalize();
