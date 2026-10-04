// Episode 02 · 你的大脑在骗你：认知偏差大赏
// Picture-first: every bias is acted out by 3D illustrations (Fluent Emoji 3D, MIT); text is kept to title + one line.
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
const YEL = '#FFD84D', PINK = '#FF8FB8', DIM = '#8A8F9E';
const bob = (t, amp = 8, speed = 2.4, ph = 0) => Math.sin(t * speed + ph) * amp;
// pop-in for icons: returns T() props
const popT = (lt, t0, extra = {}) => { const p = pop(lt, t0, .45); return { s: p.s, o: p.o, ...extra }; };
// white thought/speech bubble
const bubble = (parent, x, y, w, h, css = '') => mk(parent, `left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:36px;background:#F7F5FA;box-shadow:0 14px 30px rgba(0,0,0,.35);${css}`);
// chips positioned by their centre
const chipC = (e, s, o, r = 0) => { e.style.transform = `translate(-50%,-50%) scale(${s}) rotate(${r}deg)`; e.style.opacity = o; };

// one icon per bias — used on the title orbit and the wrap-up ring
const BIAS_ICONS = ['2708-fe0f', '2693', '1f37f', '1f50d', '1f64b', '2696-fe0f', '1f3a2', '1f526', '1f423', '1fa9e'];

// =====================================================================
// S01 · Hook: Müller-Lyer illusion → "your brain lies too" (0 – 4.8)
// =====================================================================
scene(0, 4.8, (root, cue, sub, dur) => {
  const q = mk(root, 'left:0;right:0;top:250px;text-align:center;font-size:96px;font-weight:900;white-space:nowrap', '哪条线更长？');
  const head = mk(root, 'left:0;right:0;top:250px;text-align:center;font-size:92px;font-weight:900;white-space:nowrap',
    '你的大脑，<span style="color:var(--green)">也在骗你</span>');
  const eyes = ico(root, '1f440', 170, 540, 470);
  const box = mk(root, 'left:0;top:560px;width:1080px;height:720px');
  const s = svg(box, 1080, 720);
  const L = 240, R = 840, f = 80;
  const mkLine = (y, out) => {
    const g = sv(s, 'g', {});
    const d = out
      ? `M${L},${y} L${R},${y} M${L},${y} l${-f},${-f} M${L},${y} l${-f},${f} M${R},${y} l${f},${-f} M${R},${y} l${f},${f}`
      : `M${L},${y} L${R},${y} M${L},${y} l${f},${-f} M${L},${y} l${f},${f} M${R},${y} l${-f},${-f} M${R},${y} l${-f},${f}`;
    sv(g, 'path', { d, stroke: '#F2F2F2', 'stroke-width': 14, 'stroke-linecap': 'round', fill: 'none' });
    const shaft = sv(g, 'line', { x1: L, y1: y, x2: R, y2: y, stroke: YEL, 'stroke-width': 14, 'stroke-linecap': 'round', opacity: 0 });
    return { g, shaft };
  };
  const A = mkLine(170, true), B = mkLine(470, false);
  const guides = [L, R].map(x => sv(s, 'line', { x1: x, y1: 40, x2: x, y2: 600, stroke: YEL, 'stroke-width': 6, 'stroke-dasharray': '18 14', opacity: 0 }));
  const stamp = mk(box, 'left:380px;top:560px;color:var(--green);background:rgba(16,15,22,.85)', '一样长！', 'abs stamp');
  const brain = ico(root, '1f9e0', 340, 470, 900);
  const liar = ico(root, '1f925', 190, 760, 780);
  const spark = ico(root, '2728', 110, 260, 720);
  sub(.3, 2.4, '你的眼睛会骗你');
  sub(2.4, 4.6, '其实你的大脑也会');
  cue(.1, 'pop'); cue(.3, 'pop'); cue(.6, 'pop'); cue(2.2, 'drop'); cue(2.4, 'drop'); cue(3.0, 'stamp'); cue(3.6, 'boom'); cue(3.9, 'pop');
  return lt => {
    const out = 1 - P(lt, 4.45, 4.8);
    const linesOut = 1 - P(lt, 3.4, 3.7);
    const qp = pop(lt, .2, .45);
    T(q, { s: qp.s, o: qp.o * (1 - P(lt, 3.4, 3.6)) });
    const hp = pop(lt, 3.6, .5);
    T(head, { s: hp.s, o: hp.o * out });
    const ep = pop(lt, .1, .45);
    T(eyes, { s: ep.s, o: ep.o * linesOut, x: Math.sin(lt * 3) * 40 });
    [A, B].forEach((X, k) => { const p = pop(lt, .3 + k * .3, .45); X.g.style.opacity = p.o * linesOut; });
    guides.forEach((g, k) => {
      const d = eo(P(lt, 2.2 + k * .2, 2.6 + k * .2));
      g.setAttribute('y2', 40 + 560 * d);
      g.setAttribute('opacity', d > 0 ? linesOut : 0);
    });
    [A, B].forEach(X => X.shaft.setAttribute('opacity', P(lt, 2.7, 2.9) * linesOut));
    const sp = P(lt, 3.0, 3.25);
    T(stamp, { s: lerp(2, 1, eo(sp)), o: sp * linesOut, r: -8 });
    const bp = pop(lt, 3.6, .55);
    T(brain, { s: bp.s, o: bp.o * out, y: bob(lt, 10), r: bob(lt, 3, 2) });
    const lp = pop(lt, 3.9, .45);
    T(liar, { s: lp.s, o: lp.o * out, r: 10 + bob(lt, 5, 4) });
    const kp = pop(lt, 4.0, .45);
    T(spark, { s: kp.s, o: kp.o * out * (.6 + .4 * Math.sin(lt * 10)), r: lt * 60 });
  };
});

// =====================================================================
// S02 · Title: brain with the 10 biases orbiting (4.8 – 8.4)
// =====================================================================
scene(4.8, 8.4, (root, cue, sub, dur) => {
  const en = mk(root, 'left:0;right:0;top:250px;text-align:center;font:700 80px/1 var(--mono);color:var(--green)');
  const zh = mk(root, 'left:0;right:0;top:350px;text-align:center;font-size:156px;font-weight:900;line-height:1.1;white-space:nowrap', '认知偏差大赏');
  const glow = mk(root, 'left:240px;top:730px;width:600px;height:600px;border-radius:50%;background:radial-gradient(rgba(255,143,184,.35),transparent 65%)');
  const brain = ico(root, '1f9e0', 330, 540, 1030);
  const orbit = BIAS_ICONS.map(c => ico(root, c, 120, 0, 0));   // centred at (0,0); T() moves the centre
  sub(.2, 1.8, '大脑为了省事，会偷偷走捷径');
  sub(1.8, 3.5, '10 个偏差，看看你中了几个');
  cue(.1, 'type', .6); cue(.6, 'boom'); cue(.6, 'pop');
  orbit.forEach((_, k) => cue(1.0 + k * .12, 'tick'));
  return lt => {
    const out = 1 - P(lt, 3.3, 3.6);
    typeInto(en, 'Cognitive Bias', lt, .1, 24, false);
    T(en, { o: out });
    const z = pop(lt, .6, .5);
    const g = glitch(zh, lt, lt > .6 && lt < 1.0 ? 1 - P(lt, .6, 1.0) : 0, 3);
    T(zh, { x: g.x, y: g.y, s: z.s * (1 + (1 - out) * .2), o: z.o * out });
    glow.style.opacity = P(lt, .5, 1) * out;
    const bp = pop(lt, .6, .55);
    T(brain, { s: bp.s * (1 + .03 * Math.sin(lt * 5)), o: bp.o * out, y: bob(lt, 8) });
    orbit.forEach((e, k) => {
      const a = k / orbit.length * Math.PI * 2 + lt * .35 - Math.PI / 2;
      const p = pop(lt, 1.0 + k * .12, .4);
      T(e, { x: 540 + Math.cos(a) * 390, y: 1030 + Math.sin(a) * 300, s: p.s, o: p.o * out, r: bob(lt, 8, 3, k) });
    });
  };
});

// =====================================================================
// Cards  (visual area is 960 × 740)
// =====================================================================

// #01 幸存者偏差 — the fleet goes out, only some come back
card(0, {
  en: 'Survivorship Bias', zh: '幸存者偏差', short: '幸存者偏差',
  plain: '只看见了活下来的', roast: '成功学最爱用的滤镜',
  subs: ['二战时，返航飞机的弹孔多在机翼机身', '真正该加固的，是没弹孔的引擎'],
  vis: (v, cue) => {
    const ys = [110, 210, 300, 150, 250, 330], xo = [0, -130, -260, -390, -520, -650];
    const hit = new Set([1, 3, 4]);
    const fleet = ys.map(() => ico(v, '2708-fe0f', 130, 0, 0));
    const booms = ys.map(() => ico(v, '1f4a5', 160, 0, 0));
    const smokes = ys.map(() => ico(v, '1f4a8', 90, 0, 0));
    const xAt = (k, lt) => xo[k] + lerp(-150, 1250, P(lt, .3, 2.6));
    const hitT = k => .3 + 2.3 * ((480 + 150 - xo[k]) / 1400);
    // the survivors, studied up close (hole/engine positions are fractions of the plane image)
    const HOLES = [[.27, .18], [.38, .24], [.52, .30], [.70, .58], [.78, .70], [.84, .80], [.36, .58], [.50, .46], [.64, .34], [.16, .60], [.30, .80]];
    const ENGINES = [[.45, .13], [.87, .53]];
    const back_ = [170, 480, 790].map((cx, j) => {
      const w = mk(v, `left:${cx - 125}px;top:${500 - 125}px;width:250px;height:250px`);
      ico(w, '2708-fe0f', 250, 125, 125);
      const holes = HOLES.filter((_, i) => (i + j) % 4 !== 3).map(([fx, fy]) =>
        mk(w, `left:${fx * 250 - 11}px;top:${fy * 250 - 11}px;width:22px;height:22px;border-radius:50%;background:#E8253A;border:4px solid #fff`));
      const eng = ENGINES.map(([fx, fy]) => mk(w, `left:${fx * 250 - 30}px;top:${fy * 250 - 30}px;width:60px;height:60px;border-radius:50%;border:7px solid ${YEL}`));
      return { w, holes, eng };
    });
    const tagA = mk(v, 'left:50%;top:330px;background:#2A2738;color:var(--text);font-size:34px;border:3px solid var(--green)', '飞回来的飞机：弹孔都在机翼机身', 'abs chip');
    const tagB = mk(v, 'left:50%;top:690px;background:var(--green);color:#111;font-size:34px', '⚠ 引擎没弹孔＝中了就回不来', 'abs chip');
    [...hit].forEach(k => cue(hitT(k), 'boom'));
    cue(.3, 'whoosh'); cue(2.7, 'pop'); cue(2.85, 'pop'); cue(3.0, 'pop'); cue(3.3, 'tick'); cue(4.1, 'success');
    return lt => {
      fleet.forEach((pl, k) => {
        let x = xAt(k, lt), y = ys[k], r = 0, o = P(lt, .3, .4) * (1 - P(lt, 2.4, 2.7));
        const th = hitT(k);
        if (hit.has(k) && lt > th) {
          const d = lt - th;
          x = xAt(k, th) + d * 200; y += 700 * d * d; r = d * 160; o *= clamp(1 - d * 1.4);
          T(smokes[k], { x: x - 70, y: y - 20, s: .6 + d, o: clamp(1 - d * 1.6) * .8 });
        } else T(smokes[k], { o: 0 });
        T(pl, { x, y, r: 45 + r, o });
        const bk = hit.has(k) ? P(lt, th, th + .5) : 0;
        T(booms[k], { x: xAt(k, th), y: ys[k], s: .5 + bk, o: bk > 0 ? 1 - bk : 0 });
      });
      back_.forEach((b, j) => {
        const p = pop(lt, 2.7 + j * .15, .45);
        T(b.w, { s: p.s, o: p.o, y: bob(lt, 6, 2, j) });
        b.holes.forEach((h, i) => { const q = pop(lt, 3.0 + j * .1 + i * .03, .25); T(h, { s: q.s, o: q.o }); });
        const e = P(lt, 4.1, 4.3), pulse = 1 + .12 * Math.sin(lt * 9);
        b.eng.forEach(g => T(g, { s: e * pulse + .001, o: e }));
      });
      const ta = pop(lt, 3.3, .4); chipC(tagA, ta.s, ta.o);
      const tb = pop(lt, 4.1, .4); chipC(tagB, tb.s, tb.o);
    };
  },
});

// #02 锚定效应 — the "original price" anchor
card(1, {
  en: 'Anchoring Effect', zh: '锚定效应', short: '锚定效应',
  plain: '第一个数字，定住了你的判断', roast: '“原价”就是写给你看的',
  subs: ['先看到 999，再看到 299', '你就觉得自己赚到了'],
  vis: (v, cue) => {
    const tag = mk(v, 'left:40px;top:250px;width:470px;height:360px;border-radius:30px;background:#F2F2F2;color:#111;box-shadow:0 18px 30px rgba(0,0,0,.4)');
    mk(tag, 'left:40px;top:36px;width:34px;height:34px;border-radius:50%;background:var(--bg)');
    mk(tag, 'left:100px;top:28px;font-size:40px;font-weight:800;color:#666', '原价');
    const old = mk(tag, 'left:96px;top:78px;font:900 120px/1 var(--mono);color:#222', '¥999');
    const strike = mk(tag, 'left:86px;top:136px;width:330px;height:14px;background:#FF4D5E;border-radius:7px;transform-origin:0 50%');
    const now = mk(tag, 'left:96px;top:210px;font:900 130px/1 var(--mono);color:#E0A800', '¥299');
    const chain = mk(v, 'left:268px;top:-60px;width:9px;height:0;background:repeating-linear-gradient(#8A8F9E 0 14px,transparent 14px 22px)');
    const anchor = ico(v, '2693', 230, 272, 170);
    const cart = ico(v, '1f6d2', 250, 760, 570);
    const bag = ico(v, '1f6cd-fe0f', 130, 760, 470);
    const face = ico(v, '1f929', 210, 760, 230);
    const sp = [ico(v, '2728', 90, 880, 120), ico(v, '2728', 70, 640, 140)];
    cue(.8, 'drop'); cue(1.3, 'stamp'); cue(1.8, 'error'); cue(2.2, 'pop'); cue(2.8, 'success'); cue(3.3, 'drop');
    return lt => {
      const tp = pop(lt, .3, .45);
      T(tag, { s: tp.s, o: tp.o, r: -4 });
      const fall = eo(P(lt, .8, 1.3));
      const wob = lt > 1.3 ? Math.sin((lt - 1.3) * 10) * 6 * Math.exp(-(lt - 1.3) * 3) : 0;
      T(anchor, { y: -320 * (1 - fall) + wob, o: P(lt, .8, .9), r: (1 - fall) * -20 });
      chain.style.height = (fall * 130) + 'px';
      T(strike, { sx: eo(P(lt, 1.8, 2.05)), o: lt > 1.8 ? 1 : 0, r: -4 });
      T(old, { o: lt > 2.0 ? .45 : 1 });
      T(now, popT(lt, 2.2));
      const cp = pop(lt, .5, .45);
      T(cart, { s: cp.s * (1 + (lt > 2.2 ? .08 * Math.sin((lt - 2.2) * 14) * Math.exp(-(lt - 2.2) * 3) : 0)), o: cp.o });
      const bf = eo(P(lt, 3.3, 3.7));
      T(bag, { y: -400 * (1 - bf), o: P(lt, 3.3, 3.4), r: (1 - bf) * 30 });
      T(face, popT(lt, 2.8, { y: bob(lt, 6, 3) }));
      sp.forEach((e, k) => { const q = pop(lt, 3.0 + k * .15, .45); T(e, { s: q.s, o: q.o * (.5 + .5 * Math.sin(lt * 9 + k)), r: lt * 50 }); });
    };
  },
});

// #03 沉没成本 — sitting through a terrible movie
card(2, {
  en: 'Sunk Cost Fallacy', zh: '沉没成本', short: '沉没成本',
  plain: '花掉的成本，不该绑架下一步', roast: '来都来了',
  subs: ['电影很难看，但票都买了', '于是又搭进去两个小时'],
  vis: (v, cue) => {
    const screen = mk(v, 'left:40px;top:0;width:880px;height:290px;border-radius:24px;background:#07060B;border:6px solid #2E2B3B;box-shadow:inset 0 0 80px rgba(255,255,255,.06)');
    const onscreen = ico(screen, '1f971', 190, 440, 140);
    mk(screen, 'left:24px;top:20px;font:700 26px var(--mono);color:#555', 'NOW PLAYING · 剧情：无聊');
    const seat = ico(v, '1f4ba', 280, 470, 560);
    const viewer = ico(v, '1f634', 180, 455, 450);
    const zz = mk(v, 'left:540px;top:330px;font:900 44px var(--mono);color:#B9B4C9', 'z z z');
    const corn = ico(v, '1f37f', 150, 660, 610);
    const ticket = ico(v, '1f39f-fe0f', 190, 150, 430);
    const price = mk(v, 'left:105px;top:400px;font:900 48px var(--mono);color:#fff;text-shadow:0 3px 0 rgba(0,0,0,.35)', '¥60');
    const clock = ico(v, '23f0', 160, 830, 420);
    const clockT = mk(v, 'left:730px;top:510px;width:200px;text-align:center;font:700 36px var(--mono);color:var(--text)');
    const cash = [0, 1, 2].map(() => ico(v, '1f4b8', 110, 0, 0));
    const sunk = mk(v, 'left:50%;top:700px;background:var(--orange);color:#111;font-size:38px', '', 'abs chip');
    cue(.3, 'pop'); cue(.6, 'pop'); cue(1.2, 'riser');
    [1.4, 2.6, 3.8].forEach(t => cue(t, 'whoosh'));
    return lt => {
      const sp = pop(lt, .2, .45); T(screen, { s: sp.s, o: sp.o });
      T(onscreen, { y: bob(lt, 6, 2), r: bob(lt, 4, 1.5) });
      T(seat, popT(lt, .5)); T(viewer, popT(lt, .6, { y: bob(lt, 5, 1.8), r: bob(lt, 6, 1.2) }));
      T(zz, { y: -((lt * 30) % 30), o: P(lt, 1, 1.3) * (.5 + .5 * Math.sin(lt * 3)) });
      T(corn, popT(lt, .75));
      T(ticket, popT(lt, .4, { r: -14 })); T(price, popT(lt, .5, { r: -14 }));
      T(clock, popT(lt, .9, { r: lt > 1.2 ? Math.sin(lt * 40) * 8 : 0 }));
      const m = Math.round(30 + 90 * eio(P(lt, 1.2, 4.4)));
      clockT.textContent = `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
      clockT.style.opacity = P(lt, 1.0, 1.2);
      cash.forEach((c, k) => {
        const t0 = 1.4 + k * 1.2, f = P(lt, t0, t0 + 1.3);
        T(c, { x: 455 + f * (k % 2 ? 260 : -260), y: 420 - f * 380, s: .8 + f * .3, r: f * (k % 2 ? 25 : -25), o: f > 0 && f < 1 ? Math.sin(f * Math.PI) : 0 });
      });
      sunk.textContent = `已投入：¥60 + ${m} 分钟`;
      const kp = pop(lt, 1.2, .4); chipC(sunk, kp.s, kp.o);
    };
  },
});

// #04 确认偏误 — keep the papers that agree, look away from the rest
card(3, {
  en: 'Confirmation Bias', zh: '确认偏误', short: '确认偏误',
  plain: '只找支持自己的证据', roast: '答案早就写在搜索框里了',
  subs: ['你先信了，再去找理由', '反对的声音，被自动静音'],
  vis: (v, cue) => {
    const me = ico(v, '1f9d0', 230, 170, 300);
    const belief = bubble(v, 20, 20, 320, 100, 'text-align:center;font:900 40px/100px var(--sans);color:#111');
    belief.textContent = '咖啡有益健康';
    const spots = [[540, 130], [720, 130], [890, 130], [540, 340], [720, 340], [890, 340]];
    const good = [1, 0, 1, 0, 1, 0];
    const docs = spots.map(([x, y], k) => {
      const w = mk(v, `left:${x - 75}px;top:${y - 75}px;width:150px;height:150px`);
      ico(w, '1f4c4', 140, 75, 75);
      ico(w, good[k] ? '2705' : '274c', 64, 118, 30);
      return { w, x, y, k };
    });
    const lens = ico(v, '1f50d', 170, 0, 0);
    const monkey = ico(v, '1f648', 170, 720, 560);
    const ok = ico(v, '1f44d', 120, 330, 520);
    const say = bubble(v, 20, 640, 380, 90, 'text-align:center;font:900 40px/90px var(--sans);color:#111');
    say.textContent = '看吧，我就说！';
    const path = [[460, 120], [920, 120], [460, 330], [920, 330]];
    cue(.4, 'pop'); cue(.8, 'whoosh'); cue(2.6, 'success'); cue(2.8, 'drop'); cue(3.2, 'pop');
    return lt => {
      T(me, popT(lt, .3, { y: bob(lt, 5, 2) }));
      const bp = pop(lt, .5, .4); T(belief, { s: bp.s, o: bp.o });
      // the magnifier scans the papers row by row
      const sk = P(lt, .8, 2.4) * 3, seg = Math.min(2, Math.floor(sk)), f = eio(sk - seg);
      const [ax, ay] = path[seg], [bx, by] = path[seg + 1];
      T(lens, { x: lerp(ax, bx, f), y: lerp(ay, by, f), o: P(lt, .7, .9) * (1 - P(lt, 2.5, 2.7)), r: -15 });
      let gi = 0;
      const sorted = eio(P(lt, 2.6, 3.1));
      docs.forEach(D => {
        const p = pop(lt, .5 + D.k * .08, .35);
        if (good[D.k]) {
          const tx = 180 - D.x + (gi - 1) * 20, ty = 540 - D.y - gi * 26; gi++;
          T(D.w, { x: tx * sorted, y: ty * sorted, s: p.s * lerp(1, .8, sorted), o: p.o, r: sorted * (gi * 6 - 12) });
          D.w.style.filter = sorted > .5 ? 'drop-shadow(0 0 16px rgba(255,216,77,.8))' : '';
        } else {
          T(D.w, { s: p.s * lerp(1, .85, sorted), o: p.o * (1 - .7 * sorted) });
          D.w.style.filter = `blur(${sorted * 4}px) grayscale(${sorted})`;
        }
      });
      T(monkey, popT(lt, 2.8, { y: bob(lt, 6, 3) }));
      T(ok, popT(lt, 3.1, { r: bob(lt, 8, 5) }));
      const sp = pop(lt, 3.2, .4); T(say, { s: sp.s, o: sp.o });
    };
  },
});

// #05 从众效应 — Asch's line experiment, everyone raises a hand for A
card(4, {
  en: 'Conformity', zh: '从众效应', short: '从众效应',
  plain: '大家都这么选，你也跟着选', roast: '明明知道答案，还是举了手',
  subs: ['标准线和哪条一样长？明明是 C', '前面 5 个人都说 A，你也犹豫了'],
  vis: (v, cue) => {
    const board = mk(v, 'left:0;top:0;width:960px;height:330px;border-radius:28px;background:#F2F0F5;box-shadow:0 16px 30px rgba(0,0,0,.4)');
    const base = 250;
    const line = (x, h, label) => {
      const l = mk(board, `left:${x}px;top:${base - h}px;width:20px;height:${h}px;border-radius:10px;background:#1F1D27;transform-origin:50% 100%`);
      mk(board, `left:${x - 50}px;top:${base + 16}px;width:120px;text-align:center;font:900 40px var(--mono);color:#555`, label);
      return l;
    };
    const ref = line(130, 170, '标准');
    ref.style.background = '#E0A800';
    mk(board, 'left:300px;top:40px;width:4px;height:250px;background:#D6D2DE');
    const lines = [ref, line(470, 110, 'A'), line(650, 230, 'B'), line(830, 170, 'C')];
    const xs = [85, 240, 395, 550, 705, 870];
    const pals = ['1f64b-200d-2642-fe0f', '1f64b-200d-2640-fe0f', '1f64b', '1f64b-200d-2642-fe0f', '1f64b-200d-2640-fe0f'];
    const ts = [1.3, 1.6, 1.9, 2.2, 2.5, 3.3];
    const people = xs.map((x, k) => {
      const calm = ico(v, k === 5 ? '1f630' : '1f9d1', 150, x, 560);
      const up = ico(v, k === 5 ? '1f64b' : pals[k], 160, x, 555);
      const say = mk(v, `left:${x - 55}px;top:395px;width:110px;text-align:center;background:#fff;color:#111;border-radius:22px;font:900 44px/72px var(--mono)`, k === 5 ? 'A…' : 'A');
      return { calm, up, say };
    });
    const you = mk(v, `left:${xs[5]}px;top:690px;background:var(--green);color:#111;font-size:32px`, '你', 'abs chip');
    const sweat = ico(v, '1f4a6', 70, xs[5] + 70, 490);
    ts.forEach((t, k) => cue(t, k === 5 ? 'error' : 'pop'));
    return lt => {
      const bp = pop(lt, .2, .4); T(board, { s: bp.s, o: bp.o });
      lines.forEach((l, k) => { const g = eo(P(lt, .35 + k * .1, .75 + k * .1)); T(l, { sy: g + .001, o: g > 0 ? 1 : 0 }); });
      lines[3].style.boxShadow = lt > .9 && lt < 1.3 ? '0 0 26px rgba(224,168,0,.95)' : '';
      people.forEach((Pp, k) => {
        const p = pop(lt, .6 + k * .06, .35), raised = lt >= ts[k];
        const shake = k === 5 && lt > 2.7 && lt < 3.3 ? Math.sin(lt * 50) * 8 : 0;
        T(Pp.calm, { s: p.s, o: raised ? 0 : p.o, x: shake });
        T(Pp.up, { s: raised ? back(P(lt, ts[k], ts[k] + .3)) + .001 : .001, o: raised ? 1 : 0 });
        const q = pop(lt, ts[k] + .05, .3); T(Pp.say, { s: q.s, o: q.o });
      });
      const yp = pop(lt, .9, .3); chipC(you, yp.s, yp.o);
      T(sweat, { o: lt > 2.7 ? 1 - P(lt, 3.5, 3.8) : 0, y: Math.max(0, lt - 2.7) * 30 });
    };
  },
});

// #06 损失厌恶 — losing ¥100 hurts about twice as much
card(5, {
  en: 'Loss Aversion', zh: '损失厌恶', short: '损失厌恶',
  plain: '失去的痛，比得到的爽更强', roast: '所以套牢的股票舍不得卖',
  subs: ['研究发现，损失带来的痛苦', '大约是同等收益快乐的两倍'],
  vis: (v, cue) => {
    const scale = ico(v, '2696-fe0f', 300, 480, 160);
    const cashIn = ico(v, '1f4b5', 140, 230, 330);
    const cashOut = ico(v, '1f4b8', 140, 740, 330);
    const lIn = mk(v, 'left:130px;top:400px;width:200px;text-align:center;font:900 44px var(--mono);color:var(--green)', '+¥100');
    const lOut = mk(v, 'left:640px;top:330px;width:200px;text-align:center;font:900 44px var(--mono);color:var(--orange)', '−¥100');
    const happy = ico(v, '1f60a', 160, 230, 590);
    const cry = ico(v, '1f62d', 300, 740, 580);
    const x2 = mk(v, 'left:480px;top:600px;background:var(--orange);color:#111;font-size:46px', '≈ 2 倍', 'abs chip');
    cue(.8, 'success'); cue(1.8, 'whoosh'); cue(2.2, 'error'); cue(3.0, 'stamp');
    return lt => {
      T(scale, popT(lt, .3, { r: eo(P(lt, 2.2, 2.8)) * 12 }));
      const ci = eo(P(lt, .8, 1.2));
      T(cashIn, { y: -250 * (1 - ci), o: P(lt, .8, .9), r: (1 - ci) * -30 });
      lIn.style.opacity = P(lt, 1.1, 1.3);
      T(happy, popT(lt, 1.2, { y: bob(lt, 5, 3) }));
      const co = P(lt, 1.8, 2.6);
      T(cashOut, { x: co * 140, y: -co * 280, s: 1 - co * .3, o: pop(lt, 1.6).o * (1 - P(lt, 2.4, 2.7)), r: co * 30 });
      lOut.style.opacity = P(lt, 1.9, 2.1);
      const cp = pop(lt, 2.2, .5);
      T(cry, { s: cp.s, o: cp.o, x: lt > 2.6 ? Math.sin(lt * 34) * 5 : 0 });
      const xp = pop(lt, 3.0, .4); chipC(x2, xp.s, xp.o, -5);
    };
  },
});

// #07 峰终定律 — ride the curve, only the peak and the end stick
card(6, {
  en: 'Peak-End Rule', zh: '峰终定律', short: '峰终定律',
  plain: '只记住最高点和结尾', roast: '所以旅行的最后一天要安排好',
  subs: ['一段经历好不好，大脑不算平均分', '只看最爽的那一刻，和结尾'],
  vis: (v, cue) => {
    const W2 = 800, H2 = 400, X0 = 80, Y0 = 170;
    const pts = [[0, .45], [.1, .4], [.2, .55], [.3, .35], [.4, .95], [.5, .5], [.6, .3], [.7, .42], [.8, .25], [.9, .5], [1, .8]];
    const P2 = pts.map(([t, val]) => [X0 + t * W2, Y0 + (1 - val) * H2]);
    const s = svg(v, 960, 740);
    sv(s, 'line', { x1: X0, y1: Y0 + H2 + 20, x2: X0 + W2, y2: Y0 + H2 + 20, stroke: '#3A3650', 'stroke-width': 4 });
    let d = `M${P2[0][0]},${P2[0][1]}`;
    for (let i = 1; i < P2.length; i++) { const [x0, y0] = P2[i - 1], [x1, y1] = P2[i], mx = (x0 + x1) / 2; d += ` C${mx},${y0} ${mx},${y1} ${x1},${y1}`; }
    const path = sv(s, 'path', { d, fill: 'none', stroke: YEL, 'stroke-width': 12, 'stroke-linecap': 'round' });
    const len = path.getTotalLength();
    path.setAttribute('stroke-dasharray', len);
    const ax = mk(v, `left:${X0 + W2 - 150}px;top:${Y0 + H2 + 34}px;font-size:30px;color:${DIM}`, '时间 →');
    const coaster = ico(v, '1f3a2', 170, 110, 650);
    const faces = ['1f606', '1f929', '1f60b'].map(c => ico(v, c, 110, 0, 0));
    const peak = mk(v, `left:${P2[4][0]}px;top:${P2[4][1] - 120}px;background:${PINK};color:#111;font-size:36px`, '峰 ★', 'abs chip');
    const endC = mk(v, `left:${P2[10][0] - 30}px;top:${P2[10][1] - 120}px;background:${PINK};color:#111;font-size:36px`, '终 ★', 'abs chip');
    const cone = ico(v, '1f366', 150, P2[10][0] - 20, P2[10][1] + 120);
    const avg = mk(v, 'left:690px;top:30px;font-size:42px;font-weight:800;color:var(--text);white-space:nowrap', '平均分？大脑不算');
    const avgX = mk(v, 'left:520px;top:52px;width:340px;height:8px;background:#FF4D5E;border-radius:4px;transform-origin:0 50%');
    cue(.4, 'riser'); cue(1.1, 'success'); cue(2.6, 'pop'); cue(2.9, 'drop'); cue(3.3, 'error');
    return lt => {
      const dp = eio(P(lt, .4, 2.6));
      path.setAttribute('stroke-dashoffset', len * (1 - dp));
      path.setAttribute('stroke', `rgba(255,216,77,${1 - P(lt, 2.9, 3.3) * .72})`);
      ax.style.opacity = P(lt, .3, .6);
      T(coaster, popT(lt, .2));
      const pt = path.getPointAtLength(len * dp);
      const which = lt > 2.6 ? 2 : (dp > .33 && dp < .5 ? 1 : 0);
      faces.forEach((f, k) => T(f, { x: pt.x, y: pt.y - 50, o: k === which && lt > .35 ? 1 : 0, r: bob(lt, 10, 8) }));
      const a = pop(lt, 1.1, .4), b = pop(lt, 2.6, .4);
      chipC(peak, a.s, a.o); chipC(endC, b.s, b.o);
      T(cone, popT(lt, 2.9, { r: bob(lt, 6, 3) }));
      const av = pop(lt, 3.2, .35); chipC(avg, av.s, av.o);
      T(avgX, { sx: eo(P(lt, 3.4, 3.6)) + .001, o: lt > 3.4 ? 1 : 0 });
    };
  },
});

// #08 聚光灯效应 — you feel watched, everyone is on their phone
card(7, {
  en: 'Spotlight Effect', zh: '聚光灯效应', short: '聚光灯效应',
  plain: '你以为全场都在看你', roast: '你的尴尬，别人三秒就忘',
  subs: ['穿尴尬 T 恤的人，以为一半人注意到了', '实际只有大约四分之一'],
  vis: (v, cue) => {
    const lamp = ico(v, '1f526', 120, 300, 20);
    const cone = mk(v, 'left:120px;top:40px;width:360px;height:460px;background:linear-gradient(rgba(255,216,77,.55),rgba(255,216,77,.06));clip-path:polygon(42% 0,58% 0,100% 100%,0 100%)');
    const me = ico(v, '1f9cd', 300, 300, 330);
    const shirt = ico(v, '1f455', 110, 300, 300);
    const sweat = ico(v, '1f4a6', 70, 380, 200);
    const think = bubble(v, 470, 30, 240, 110);
    const watchers = [0, 1, 2].map(k => ico(think, '1f440', 64, 50 + k * 70, 55));
    const crowd = [0, 1, 2, 3, 4].map(k => ico(v, '1f9d1', 130, 80 + k * 125, 620));
    const eyes = crowd.map((_, k) => ico(v, '1f440', 60, 80 + k * 125, 545));
    const phones = crowd.map((_, k) => ico(v, '1f4f1', 72, 115 + k * 125, 660));
    const bars = mk(v, 'left:640px;top:200px;width:300px;height:300px');
    const mkBar = (y, label, col) => {
      mk(bars, `left:0;top:${y}px;font-size:32px;font-weight:800`, label);
      const track = mk(bars, `left:0;top:${y + 48}px;width:300px;height:50px;border-radius:25px;background:#2A2738;overflow:hidden`);
      const fill = mk(track, `left:0;top:0;height:50px;background:${col};border-radius:25px`);
      const num = mk(bars, `left:0;top:${y + 48}px;width:290px;text-align:right;font:900 34px/50px var(--mono);color:var(--text)`);
      return { fill, num };
    };
    const b1 = mkBar(0, '你以为被注意到', PINK), b2 = mkBar(150, '实际注意到的', YEL);
    cue(.2, 'whoosh'); cue(.9, 'pop'); cue(1.7, 'tick'); cue(2.3, 'pop'); cue(2.9, 'pop');
    return lt => {
      T(lamp, popT(lt, .1, { r: 180 }));
      cone.style.opacity = P(lt, .2, .5) * (.85 + .15 * Math.sin(lt * 6));
      T(me, popT(lt, .35)); T(shirt, popT(lt, .5, { r: bob(lt, 4, 3) }));
      T(sweat, { o: P(lt, .9, 1.1), y: bob(lt, 6, 4) });
      const tp = pop(lt, .9, .4); T(think, { s: tp.s, o: tp.o });
      watchers.forEach((w, k) => T(w, { x: bob(lt, 5, 4, k) }));
      crowd.forEach((c, k) => {
        const p = pop(lt, .6 + k * .08, .35);
        const down = lt > 1.7 + k * .08;
        T(c, { s: p.s, o: p.o, r: down ? 8 : 0 });
        T(eyes[k], { s: p.s, o: down ? 0 : p.o });
        T(phones[k], { s: down ? back(P(lt, 1.7 + k * .08, 2.0 + k * .08)) + .001 : .001, o: down ? 1 : 0 });
      });
      bars.style.opacity = P(lt, 2.1, 2.3);
      const f1 = eo(P(lt, 2.3, 2.9)), f2 = eo(P(lt, 2.9, 3.5));
      b1.fill.style.width = (50 * f1) + '%'; b1.num.textContent = f1 > .05 ? `${Math.round(50 * f1)}%` : '';
      b2.fill.style.width = (25 * f2) + '%'; b2.num.textContent = f2 > .05 ? `≈${Math.round(25 * f2)}%` : '';
    };
  },
});

// #09 达克效应 — the beginner dreams of being a lion, the expert feels small
card(8, {
  en: 'Dunning–Kruger Effect', zh: '达克效应', short: '达克效应',
  plain: '越不懂，越容易高估自己', roast: '评论区最常见的效应',
  subs: ['能力排在后面的人', '却普遍以为自己高于平均'],
  vis: (v, cue) => {
    const chick = ico(v, '1f423', 210, 220, 590);
    const cb = bubble(v, 30, 40, 400, 320);
    const dots1 = [mk(v, 'left:200px;top:390px;width:40px;height:40px;border-radius:50%;background:#F7F5FA'), mk(v, 'left:215px;top:445px;width:24px;height:24px;border-radius:50%;background:#F7F5FA')];
    const lion = ico(cb, '1f981', 220, 170, 160);
    const cup = ico(cb, '1f3c6', 120, 320, 220);
    const owl = ico(v, '1f989', 220, 740, 590);
    const ob = bubble(v, 600, 200, 300, 190);
    const dots2 = [mk(v, 'left:722px;top:415px;width:30px;height:30px;border-radius:50%;background:#F7F5FA')];
    const pinch = ico(ob, '1f90f', 100, 80, 95);
    const modest = mk(ob, 'left:140px;top:52px;font-size:36px;font-weight:900;color:#111;line-height:1.3', '还差<br>得远');
    const l1 = mk(v, 'left:220px;top:715px;background:#2A2738;color:var(--text);font-size:32px', '新手', 'abs chip');
    const l2 = mk(v, 'left:740px;top:715px;background:#2A2738;color:var(--text);font-size:32px', '高手', 'abs chip');
    cue(.4, 'pop'); cue(1.0, 'pop'); cue(1.2, 'riser'); cue(1.9, 'levelup'); cue(2.3, 'pop'); cue(2.7, 'pop');
    return lt => {
      T(chick, popT(lt, .4, { y: bob(lt, 6, 3) }));
      const bp = pop(lt, 1.0, .4); T(cb, { s: bp.s, o: bp.o });
      dots1.forEach((d, k) => d.style.opacity = P(lt, .9 - k * .1, 1.0 - k * .1));
      const g = eo(P(lt, 1.2, 1.9));
      T(lion, { s: lerp(.3, 1.08, g) + .03 * Math.sin(lt * 6), o: P(lt, 1.1, 1.2) });
      T(cup, popT(lt, 1.9, { r: bob(lt, 8, 4) }));
      T(owl, popT(lt, 2.3, { y: bob(lt, 5, 2) }));
      const op = pop(lt, 2.7, .4); T(ob, { s: op.s, o: op.o });
      dots2.forEach(d => d.style.opacity = P(lt, 2.6, 2.7));
      T(pinch, popT(lt, 2.9));
      modest.style.opacity = P(lt, 3.0, 3.2);
      const a = pop(lt, .6, .3), b = pop(lt, 2.4, .3);
      chipC(l1, a.s, a.o); chipC(l2, b.s, b.o);
    };
  },
});

// #10 偏差盲点 — everyone else is biased; then the mirror (music break until the reveal)
card(9, {
  en: 'Bias Blind Spot', zh: '偏差盲点', short: '偏差盲点', roastT: 3.7,
  plain: '只看得见别人的偏差', roast: '看到这觉得自己都没中？恭喜，中了',
  subs: ['大多数人都觉得', '自己比别人更不容易受偏差影响'],
  vis: (v, cue) => {
    const hdr1 = mk(v, 'left:150px;top:0;font-size:48px;font-weight:900', '别人');
    const others = [['1f914', '从众 ✓'], ['1f644', '锚定 ✓'], ['1f624', '沉没成本 ✓']].map(([c, t], k) => ({
      f: ico(v, c, 130, 100, 150 + k * 190),
      tag: mk(v, `left:300px;top:${150 + k * 190}px;background:var(--orange);color:#111;font-size:34px`, t, 'abs chip'),
    }));
    const hdr2 = mk(v, 'left:705px;top:0;font-size:48px;font-weight:900', '我');
    const mirror = ico(v, '1fa9e', 400, 730, 340);
    const refl = ico(v, '1f60e', 150, 730, 330);
    const scared = ico(v, '1f631', 150, 730, 330);
    const me = ico(v, '1f60e', 150, 420, 600);
    const MP = [[730, 120], [610, 530], [860, 530]];
    const mine = ['幸存者偏差 ✓', '从众 ✓', '偏差盲点 ✓'].map((t, k) => mk(v, `left:${MP[k][0]}px;top:${MP[k][1]}px;background:var(--orange);color:#111;font-size:32px`, t, 'abs chip'));
    const stamp = mk(v, 'left:560px;top:620px;color:var(--orange);background:rgba(16,15,22,.88)', '你也中了', 'abs stamp');
    const flash = document.getElementById('flash');
    others.forEach((_, k) => { cue(.4 + k * .3, 'pop'); cue(.6 + k * .3, 'tick'); });
    cue(1.5, 'pop'); cue(2.4, 'glitch'); cue(2.4, 'boom'); mine.forEach((_, k) => cue(2.6 + k * .12, 'tick')); cue(3.2, 'stamp');
    return lt => {
      hdr1.style.opacity = P(lt, .2, .4); hdr2.style.opacity = P(lt, 1.3, 1.5);
      others.forEach((O, k) => {
        T(O.f, popT(lt, .4 + k * .3, { y: bob(lt, 4, 2, k) }));
        const q = pop(lt, .6 + k * .3, .35); chipC(O.tag, q.s, q.o, -3);
      });
      const g = glitch(mirror, lt, lt > 2.4 && lt < 2.9 ? 1 - P(lt, 2.4, 2.9) : 0, 7);
      const mp = pop(lt, 1.3, .45);
      T(mirror, { x: g.x, y: g.y, s: mp.s, o: mp.o });
      const flip = lt >= 2.4;
      const rp = pop(lt, 1.5, .4);
      T(refl, { x: g.x, y: g.y, sx: -rp.s, sy: rp.s, o: flip ? 0 : rp.o * .9 });
      T(scared, { x: g.x, y: g.y, s: flip ? back(P(lt, 2.4, 2.75)) + .001 : .001, o: flip ? 1 : 0, r: flip ? bob(lt, 6, 20) * (1 - P(lt, 2.4, 3.2)) : 0 });
      T(me, popT(lt, 1.4, { r: lt > 2.4 ? bob(lt, 10, 25) * (1 - P(lt, 2.4, 3)) : 0 }));
      mine.forEach((e, k) => { const q = pop(lt, 2.6 + k * .12, .3); chipC(e, q.s, q.o, k % 2 ? 4 : -4); });
      const sp = P(lt, 3.2, 3.45);
      T(stamp, { s: lerp(2.2, 1, eo(sp)), o: sp, r: -10 });
      if (lt >= 2.4 && lt < 3.0) { flash.style.background = PINK; flash.style.opacity = .35 * (1 - P(lt, 2.4, 3.0)); }
    };
  },
});

// =====================================================================
// S13 · Wrap-up: the brain is saving power (68.4 – 74.4)
// =====================================================================
scene(68.4, 74.4, (root, cue, sub, dur) => {
  const l1 = mk(root, 'left:0;right:0;top:250px;text-align:center;font-size:72px;font-weight:900;color:var(--dim)', '偏差不是笨');
  const l2 = mk(root, 'left:0;right:0;top:350px;text-align:center;font-size:72px;font-weight:900', '是大脑在省电');
  const ring = BIAS_ICONS.map(c => ico(root, c, 104, 0, 0));
  const brain = ico(root, '1f9e0', 320, 540, 900);
  const battery = ico(root, '1faab', 150, 770, 760);
  const glow = mk(root, 'left:390px;top:490px;width:300px;height:300px;border-radius:50%;background:radial-gradient(rgba(255,216,77,.55),transparent 65%)');
  const bulb = ico(root, '1f4a1', 170, 540, 640);
  const l3 = mk(root, 'left:0;right:0;top:1290px;text-align:center;font-size:78px;font-weight:900;color:var(--green);white-space:nowrap', '知道它，就能少踩坑');
  sub(.4, 2.6, '说到底');
  sub(3.0, 5.8, '做决定前，停一秒');
  ring.forEach((_, k) => cue(.2 + k * .07, 'tick'));
  cue(.9, 'pop'); cue(1.4, 'drop'); cue(2.6, 'levelup'); cue(3.0, 'boom');
  return lt => {
    const out = 1 - P(lt, 5.7, 6);
    const p1 = pop(lt, .9, .45); T(l1, { s: p1.s, o: p1.o * out });
    const p2 = pop(lt, 1.4, .45); T(l2, { s: p2.s, o: p2.o * out });
    ring.forEach((c, k) => {
      const a = (k / ring.length) * Math.PI * 2 + lt * .25 - Math.PI / 2;
      const tx = 540 + Math.cos(a) * 410, ty = 900 + Math.sin(a) * 330;
      const sx = 540 + (rnd(k * 9.1) - .5) * 2400, sy = 960 + (rnd(k * 4.3) - .5) * 3000;
      const f = eo(P(lt, .2 + k * .07, .9 + k * .07));
      T(c, { x: lerp(sx, tx, f), y: lerp(sy, ty, f), o: f * out, r: (1 - f) * 90 + bob(lt, 6, 3, k) });
    });
    const bp = pop(lt, .3, .5); T(brain, { s: bp.s, o: bp.o * out, y: bob(lt, 8) });
    const bt = pop(lt, 1.4, .45); T(battery, { s: bt.s, o: bt.o * out * (1 - P(lt, 2.6, 2.9)), r: bob(lt, 6, 4) });
    const lb = pop(lt, 2.6, .5); T(bulb, { s: lb.s, o: lb.o * out, y: bob(lt, 6, 3) });
    glow.style.opacity = P(lt, 2.6, 3.0) * out * (.8 + .2 * Math.sin(lt * 6));
    const p3 = pop(lt, 3.0, .55); T(l3, { s: p3.s, o: p3.o * out });
  };
});

// =====================================================================
// S14 · CTA (74.4 – 80)
// =====================================================================
scene(74.4, 80, (root, cue, sub, dur) => {
  const win = mk(root, 'left:60px;top:560px;width:960px;height:300px', '<div class="bar"><i></i><i></i><i></i></div>', 'abs win');
  const asker = ico(root, '1f64b', 240, 870, 470);
  const q = mk(win, 'left:36px;top:96px;width:890px;font-size:60px;font-weight:900;line-height:1.4');
  const s1 = mk(root, 'left:80px;top:930px;background:var(--green);color:#111;font-size:52px', '<span class="emo">⭐</span> 收藏 = 少踩坑', 'abs chip');
  const s2 = mk(root, 'left:600px;top:930px;background:var(--orange);color:#111;font-size:52px', '<span class="emo">💬</span> 评论区报数', 'abs chip');
  const ideas = ['全中了 😭', '7 个', '第 3 个太真实', '我一个没中（第 10 个）', '第 5 个天天中', '第 9 个说的是我同事'];
  const bubs = ideas.map((s, k) => mk(root, `left:${[100, 640, 260, 120, 600, 300][k]}px;top:1300px;background:#1A1824;border:2px solid var(--line);font-size:36px;color:var(--text)`, emo(esc(s)), 'abs chip'));
  sub(.3, 2.6, '收藏起来，下次停一秒');
  sub(2.6, 5.2, '你中了几个？评论区报个数');
  cue(.1, 'pop'); cue(.3, 'type', 1.4); cue(2.0, 'pop'); cue(2.4, 'pop');
  bubs.forEach((_, k) => cue(2.9 + k * .3, 'tick'));
  return lt => {
    T(asker, popT(lt, .1, { r: bob(lt, 6, 5) }));
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
