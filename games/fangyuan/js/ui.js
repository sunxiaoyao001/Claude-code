'use strict';
// 菜单与界面（DOM 叠加层）

const svg = (inner, vb = '0 0 24 24') => `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
const ICONS = {
  back: svg('<path d="M15 5l-7 7 7 7"/>'),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  lock: svg('<rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  pause: svg('<path d="M9 5v14M15 5v14"/>'),
  left: svg('<path d="M15 5l-7 7 7 7"/>'),
  right: svg('<path d="M9 5l7 7-7 7"/>'),
  down: svg('<path d="M5 9l7 7 7-7"/>'),
  up: svg('<path d="M5 15l7-7 7 7"/>'),
  heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#FF5D73" d="M12 20.5C6 16.4 2.5 13 2.5 8.8 2.5 6 4.7 4 7.3 4c1.9 0 3.6 1 4.7 2.6C13.1 5 14.8 4 16.7 4c2.6 0 4.8 2 4.8 4.8 0 4.2-3.5 7.6-9.5 11.7z"/></svg>',
  magnet: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#F25F5C" d="M4 4h5v8a3 3 0 0 0 6 0V4h5v8a8 8 0 0 1-16 0z"/><path fill="#F3F5FA" d="M4 4h5v3H4zM15 4h5v3h-5z"/></svg>',
  shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="rgba(159,230,255,0.35)" stroke="#9FE6FF" stroke-width="2"/><ellipse cx="9" cy="8.5" rx="2.6" ry="1.6" fill="#FFFFFF" transform="rotate(-30 9 8.5)"/></svg>',
  coin: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8.5" fill="#E9A21B"/><circle cx="12" cy="11.5" r="8.5" fill="#FFC93C"/><circle cx="12" cy="11.5" r="4" fill="#FFE59A"/></svg>',
  umbrella: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#21B8A8" d="M2.5 12a9.5 9.5 0 0 1 19 0z"/><path d="M12 12v6.5a2 2 0 0 1-4 0" stroke="#F3F5FA" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>',
  crown: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#F7C948" d="M3 18V8l5 4 4-7 4 7 5-4v10z"/></svg>',
};

const UI = {
  root: null,
  current: null,
  data: {},
  from: 'title',
  mapWorld: 0,
  touchActive: false,
  resetArmed: false,

  init() {
    this.root = document.getElementById('ui');
    this.root.addEventListener('click', (e) => {
      const el = e.target.closest('[data-act]');
      if (!el || el.disabled) return;
      Sound.init();
      this.handle(el.dataset.act, el);
    });
    this.root.addEventListener('input', (e) => {
      const el = e.target;
      if (el.id === 'set-music') { Save.data.settings.music = el.value / 100; this.applyAudio(); }
      if (el.id === 'set-sfx') { Save.data.settings.sfx = el.value / 100; this.applyAudio(); }
    });
    this.root.addEventListener('change', () => Save.save());
    window.addEventListener('keydown', (e) => {
      if (!this.current) return;
      const dirs = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
      if (dirs[e.code]) {
        const t = e.target;
        if (t && t.tagName === 'INPUT' && t.type === 'range' && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) return;
        e.preventDefault();
        this.navigate(dirs[e.code]);
      } else if (e.code === 'Escape') {
        e.preventDefault();
        this.back();
      }
    });
    this.initTouch();
  },

  applyAudio() {
    const s = Save.data.settings;
    Sound.setVolumes(s.music, s.sfx);
  },

  show(name, data) {
    this.current = name;
    this.data = data || {};
    this.resetArmed = false;
    const fn = this['tpl_' + name];
    const cls = { title: 'scrim title-screen', pause: 'solid', results: 'scrim', ending: 'solid' }[name] || 'solid';
    this.root.innerHTML = `<section class="screen ${cls}" data-screen="${name}">${fn.call(this, this.data)}</section>`;
    this.paintChars();
    this.updateTouch();
    const auto = this.root.querySelector('[data-autofocus]') || this.root.querySelector('button:not([disabled])');
    if (auto && Input.device !== 'touch') auto.focus({ preventScroll: true });
  },

  hide() {
    this.current = null;
    this.root.innerHTML = '';
    this.updateTouch();
  },

  refresh() { if (this.current) { const f = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.key : null; this.show(this.current, this.data); if (f) { const el = this.root.querySelector(`[data-key="${f}"]`); if (el) el.focus({ preventScroll: true }); } } },

  back() {
    const c = this.current;
    Sound.play('ui');
    if (c === 'pause') Game.resume();
    else if (c === 'settings' && this.from === 'pause') this.show('pause');
    else if (c === 'chars' && this.from === 'map') this.show('map');
    else if (c === 'results') Game.quitToMap();
    else if (c === 'map' || c === 'chars' || c === 'shop' || c === 'records' || c === 'settings') this.show('title');
  },

  navigate(dir) {
    const items = [...this.root.querySelectorAll('button:not([disabled]), input, [data-nav]')].filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const cur = document.activeElement;
    if (!items.includes(cur)) { items[0].focus(); return; }
    const r0 = cur.getBoundingClientRect();
    const c0 = { x: r0.left + r0.width / 2, y: r0.top + r0.height / 2 };
    let best = null, bestScore = Infinity;
    for (const el of items) {
      if (el === cur) continue;
      const r = el.getBoundingClientRect();
      const c = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      const dx = c.x - c0.x, dy = c.y - c0.y;
      let main, side;
      if (dir === 'up') { main = -dy; side = Math.abs(dx); }
      else if (dir === 'down') { main = dy; side = Math.abs(dx); }
      else if (dir === 'left') { main = -dx; side = Math.abs(dy); }
      else { main = dx; side = Math.abs(dy); }
      if (main <= 4) continue;
      const score = main + side * 2.2;
      if (score < bestScore) { bestScore = score; best = el; }
    }
    if (best) {
      best.focus();
      best.scrollIntoView({ block: 'nearest' });
      Sound.play('uiMove');
    }
  },

  pollPad() {
    if (!this.current) return;
    const p = Input.padPressed;
    if (p.up) this.navigate('up');
    if (p.down) this.navigate('down');
    if (p.left) this.navigate('left');
    if (p.right) this.navigate('right');
    if (p.jump && document.activeElement && this.root.contains(document.activeElement)) document.activeElement.click();
    if (p.back) this.back();
    if (p.pause && this.current === 'pause') Game.resume();
  },

  wallet() {
    return `<div class="wallet"><span class="chip"><i class="dot-coin"></i>${Save.data.coins}</span><span class="chip"><i class="dot-gem"></i>${Save.gemCount()}</span></div>`;
  },
  topbar(title, backAct = 'back') {
    return `<div class="topbar"><button class="btn icon" data-act="${backAct}" aria-label="返回">${ICONS.back}</button><h2>${title}</h2>${this.wallet()}</div>`;
  },

  // —— 模板 ——
  tpl_title() {
    const ch = CHAR_BY_ID[Save.data.char];
    const started = Save.doneCount() > 0;
    const kb = Input.device === 'keyboard';
    return `<div class="title-col">
      <div class="logo">
        <div class="shapes"><i class="s1"></i><i class="s2"></i><i class="s3"></i><i class="s4"></i></div>
        <h1>方圆</h1>
        <p>四个形状的跳跃冒险</p>
      </div>
      <div class="menu">
        <button class="btn primary" data-act="play" data-autofocus>${started ? '继续冒险' : '开始冒险'}${kb ? '<span class="kbd">Enter</span>' : ''}</button>
        <button class="btn" data-act="chars">角色<span class="kbd">${ch.name}</span></button>
        <button class="btn" data-act="shop">商店<span class="kbd">${Save.data.coins} 金币</span></button>
        <button class="btn" data-act="records">记录</button>
        <button class="btn" data-act="settings">设置</button>
      </div>
      <div class="title-meta">${this.wallet()}<span class="chip">已通关 ${Save.doneCount()} / ${LEVELS.length}</span></div>
    </div>`;
  },

  tpl_map(d) {
    if (d.world != null) this.mapWorld = d.world;
    const w = this.mapWorld;
    const ch = CHAR_BY_ID[Save.data.char];
    const tabs = WORLDS.map((W, i) => {
      const open = Save.worldUnlocked(i);
      const lvls = LEVELS.filter((l) => l.world === i);
      const done = lvls.filter((l) => Save.isDone(l.id)).length;
      return `<button class="tab ${open ? '' : 'locked'}" role="tab" aria-selected="${i === w}" data-act="tab" data-w="${i}" data-key="tab${i}" ${open ? '' : 'disabled'}>${open ? '' : ICONS.lock.replace('<svg', '<svg width="16" height="16"')}${i + 1}. ${W.name}<span class="num">${done}/${lvls.length}</span></button>`;
    }).join('');
    const cards = LEVELS.filter((l) => l.world === w).map((L) => {
      const open = Save.isUnlocked(L.id);
      const lv = Save.data.levels[L.id];
      const gems = L.gems ? `<span class="gems">${[0, 1, 2].slice(0, L.gems).map((i) => `<i class="${lv && lv.gems[i] ? 'on' : ''}"></i>`).join('')}</span>` : `<span class="gems">${ICONS.crown.replace('<svg', '<svg width="20" height="20"')}</span>`;
      const best = lv && lv.best != null ? fmtTime(lv.best) : '--:--';
      return `<button class="card ${L.boss ? 'boss' : ''} ${open ? '' : 'locked'}" data-act="level" data-id="${L.id}" data-key="lv${L.id}" ${open ? '' : 'aria-disabled="true"'}>
        ${lv && lv.done ? `<span class="done">${ICONS.check}</span>` : ''}
        <span class="lv">${L.id}</span>
        <span class="nm">${L.name}</span>
        <span class="meta">${open ? gems + `<span>${best}</span>` : `<span class="lock">完成上一关后解锁</span>`}</span>
      </button>`;
    }).join('');
    return `<div class="wrap">
      ${this.topbar('选择关卡')}
      <div class="tabs" role="tablist">${tabs}</div>
      <div class="world-head"><h3>${WORLDS[w].name}</h3><span>${WORLDS[w].en}</span></div>
      <div class="levels">${cards}</div>
      <div class="topbar">
        <button class="char-chip" data-act="chars" data-from="map"><canvas data-char="${ch.id}" data-size="36"></canvas><span>${ch.name}<br><small>${ch.abilityName} · 点击换人</small></span></button>
      </div>
    </div>`;
  },

  tpl_chars() {
    const cards = CHARACTERS.map((ch) => {
      const st = Save.charState(ch);
      const cur = Save.data.char === ch.id;
      let btn;
      if (st.owned) btn = cur ? `<button class="btn" disabled>使用中</button>` : `<button class="btn primary" data-act="select" data-id="${ch.id}" data-key="c${ch.id}">选择</button>`;
      else if (st.locked) btn = `<button class="btn" disabled>${ICONS.lock.replace('<svg', '<svg width="18" height="18"')} 未解锁</button>`;
      else btn = `<button class="btn ${st.affordable ? 'primary' : ''}" data-act="buy" data-id="${ch.id}" data-key="c${ch.id}" ${st.affordable ? '' : 'disabled'}><i class="dot-coin"></i>${st.cost} 解锁</button>`;
      const req = st.owned ? '' : `<div class="req">${st.locked ? st.reason : st.affordable ? '金币足够，可以解锁' : `还差 ${st.cost - Save.data.coins} 金币`}</div>`;
      const tint = mixColor(ch.color, '#262B44', 0.78);
      return `<div class="char-card ${cur ? 'current' : ''} ${st.owned || !st.locked ? '' : 'locked'}">
        <div class="stage" style="background:${tint}"><canvas data-char="${ch.id}" data-size="96"></canvas></div>
        <h3>${ch.name}<small style="background:${ch.color}">${ch.abilityName}</small></h3>
        <p>${ch.desc}</p>
        ${req}
        ${btn}
      </div>`;
    }).join('');
    return `<div class="wrap">${this.topbar('角色')}<div class="chars">${cards}</div></div>`;
  },

  tpl_shop() {
    const rows = UPGRADES.map((u) => {
      const lvl = Save.data.upg[u.id] || 0;
      const max = u.costs.length;
      const maxed = lvl >= max;
      const cost = maxed ? 0 : u.costs[lvl];
      const can = !maxed && Save.data.coins >= cost;
      const pips = `<span class="pips">${u.costs.map((_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('')}</span>`;
      return `<div class="upg">
        <div class="ic">${ICONS[u.icon]}</div>
        <div><h3>${u.name} ${pips}</h3><p>${u.desc(lvl)}</p></div>
        <button class="btn ${can ? 'primary' : ''}" data-act="upgrade" data-id="${u.id}" data-key="u${u.id}" ${can ? '' : 'disabled'}>${maxed ? '已满级' : `<i class="dot-coin"></i>${cost}`}</button>
      </div>`;
    }).join('');
    return `<div class="wrap">${this.topbar('商店')}<div class="shop">${rows}</div><p class="hint">金币在通关时结算。倒下会丢掉一部分本关捡到的金币，「保险」可以减少损失。</p></div>`;
  },

  tpl_records() {
    const s = Save.data.stats;
    const totalGems = LEVELS.reduce((a, l) => a + (l.gems || 0), 0);
    const h = Math.floor(s.playTime / 3600), m = Math.floor((s.playTime % 3600) / 60);
    const stat = (k, v) => `<div class="row"><span class="k">${k}</span><span class="v">${v}</span></div>`;
    const lvRows = LEVELS.map((L) => {
      const lv = Save.data.levels[L.id];
      const g = L.gems ? `${lv ? lv.gems.filter(Boolean).length : 0} / ${L.gems}` : '首领';
      return `<div class="row"><span class="k">${L.id} ${L.name}</span><span class="v">${lv && lv.best != null ? fmtTime(lv.best) : '--:--'} · ${g}</span></div>`;
    }).join('');
    return `<div class="wrap">${this.topbar('记录')}
      <div class="panel">
        ${stat('通关关卡', `${Save.doneCount()} / ${LEVELS.length}`)}
        ${stat('收集宝石', `${Save.gemCount()} / ${totalGems}`)}
        ${stat('累计赚到金币', s.coinsEarned)}
        ${stat('消灭敌人', s.enemies)}
        ${stat('跳跃次数', s.jumps)}
        ${stat('倒下次数', s.deaths)}
        ${stat('游戏时间', h ? `${h} 小时 ${m} 分` : `${m} 分钟`)}
      </div>
      <div class="panel">${lvRows}</div>
    </div>`;
  },

  tpl_settings() {
    const s = Save.data.settings;
    const seg = ['auto', 'on', 'off'].map((v) => `<button data-act="touchmode" data-v="${v}" aria-pressed="${s.touch === v}">${{ auto: '自动', on: '显示', off: '隐藏' }[v]}</button>`).join('');
    return `<div class="wrap">${this.topbar('设置')}
      <div class="panel">
        <div class="row"><label for="set-music">音乐</label><input id="set-music" type="range" min="0" max="100" value="${Math.round(s.music * 100)}"></div>
        <div class="row"><label for="set-sfx">音效</label><input id="set-sfx" type="range" min="0" max="100" value="${Math.round(s.sfx * 100)}"></div>
        <div class="row"><span class="k" id="lbl-shake">屏幕震动</span><button class="toggle" role="switch" aria-labelledby="lbl-shake" aria-checked="${s.shake}" data-act="toggle" data-k="shake" data-key="tshake"></button></div>
        <div class="row"><span class="k" id="lbl-timer">显示计时</span><button class="toggle" role="switch" aria-labelledby="lbl-timer" aria-checked="${s.timer}" data-act="toggle" data-k="timer" data-key="ttimer"></button></div>
        <div class="row"><span class="k">触屏按键</span><span class="seg">${seg}</span></div>
      </div>
      <div class="panel">
        <div class="row" style="align-items:flex-start"><span class="k">操作</span>
          <div class="keys">
            <b>← → / A D</b><span>移动</span>
            <b>空格 / Z / ↑</b><span>跳跃（按住跳更高）</span>
            <b>↓ / S</b><span>空中下砸；站在薄平台上按 ↓ + 跳 落下</span>
            <b>Shift / X</b><span>冲刺（尖尖、星星）</span>
            <b>Esc / P</b><span>暂停</span>
            <b>手柄</b><span>A 跳跃，B 冲刺，Start 暂停</span>
          </div>
        </div>
      </div>
      ${this.from === 'pause' ? '' : `<div class="panel"><div class="row"><span class="k">清除存档</span><div class="danger-zone" id="reset-zone">${this.resetArmed ? `<span class="hint">所有进度都会消失，确定吗？</span><button class="btn small danger" data-act="resetConfirm">清除</button><button class="btn small" data-act="resetCancel">取消</button>` : `<button class="btn small" data-act="reset">清除存档…</button>`}</div></div></div>`}
    </div>`;
  },

  tpl_pause() {
    const run = Game.run;
    const hasCp = run && run.checkpoint;
    return `<div class="center"><div class="dialog">
      <h2>暂停</h2>
      <p class="sub">${run.def.id} ${run.def.name} · ${fmtTime(run.time)}</p>
      <div class="stack">
        <button class="btn primary" data-act="resume" data-autofocus>继续</button>
        ${hasCp ? '<button class="btn" data-act="checkpoint">回到检查点（扣 1 颗心）</button>' : ''}
        <button class="btn" data-act="restart">重新开始本关</button>
        <button class="btn" data-act="settings" data-from="pause">设置</button>
        <button class="btn ghost" data-act="quit">返回地图</button>
      </div>
    </div></div>`;
  },

  tpl_results(r) {
    const gems = r.gemTotal ? `<div class="result-gems">${r.gems.map((g) => `<i class="${g.on ? 'on' : ''} ${g.isNew ? 'new' : ''}"></i>`).join('')}</div>` : '';
    const row = (k, v, cls = '') => `<div class="row ${cls}"><span class="k">${k}</span><span class="v">${v}</span></div>`;
    return `<div class="center"><div class="dialog">
      <h2>${r.boss ? '击败首领！' : '过关！'}</h2>
      <p class="sub">${r.id} ${r.name}</p>
      ${r.newRecord ? '<span class="badge">新纪录</span>' : ''}
      ${gems}
      <div class="tally">
        ${row('用时', fmtTime(r.time) + (r.best != null && !r.newRecord ? `<small style="color:var(--muted);font-weight:500"> / 最佳 ${fmtTime(r.best)}</small>` : ''))}
        ${row('倒下', r.deaths + ' 次')}
        ${row('捡到金币', r.coins + (r.greed > 0 ? ` × ${(1 + r.greed).toFixed(1)}` : ''))}
        ${r.bonus ? row('首次通关奖励', '+' + r.bonus) : ''}
        ${row('获得金币', '+' + r.total, 'total')}
      </div>
      ${r.notes.length ? `<div class="unlock-note">${r.notes.join('<br>')}</div>` : ''}
      <div class="stack">
        ${r.nextId ? `<button class="btn primary" data-act="next" data-id="${r.nextId}" data-autofocus>下一关 ${r.nextId}</button>` : ''}
        <button class="btn" data-act="retry">再玩一次</button>
        <button class="btn ghost" data-act="map">返回地图</button>
      </div>
    </div></div>`;
  },

  tpl_ending(r) {
    return `<div class="ending">
      <h2>星光回来了</h2>
      <p>星蚀散去，夜空重新亮起。小方、阿圆、尖尖和小菱站在山巅，看见远处有一颗小星星朝他们跑来。</p>
      <p>从今天起，<b style="color:var(--gold)">星星</b>也加入了队伍。它会二段跳，也会冲刺，去角色界面就能选它。</p>
      <div class="credits">
        <b>最终战用时</b><span>${fmtTime(r.time)}</span>
        <b>获得金币</b><span>+${r.total}</span>
        <b>收集宝石</b><span>${Save.gemCount()} / ${LEVELS.reduce((a, l) => a + (l.gems || 0), 0)}</span>
        <b>倒下次数</b><span>${Save.data.stats.deaths}</span>
      </div>
      <p class="hint">还没拿齐的宝石，可以回到各个关卡慢慢找。</p>
      <div class="confirm-row">
        <button class="btn primary" data-act="endingDone" data-autofocus>继续</button>
      </div>
    </div>`;
  },

  // —— 行为 ——
  handle(act, el) {
    const d = el.dataset;
    if (act !== 'level' || Save.isUnlocked(d.id)) Sound.play('ui');
    switch (act) {
      case 'play': {
        let w = 0;
        for (let i = 0; i < WORLDS.length; i++) if (Save.worldUnlocked(i)) w = i;
        this.show('map', { world: w });
        break;
      }
      case 'back': this.back(); break;
      case 'chars': this.from = d.from || 'title'; this.show('chars'); break;
      case 'shop': this.show('shop'); break;
      case 'records': this.show('records'); break;
      case 'settings': this.from = d.from || 'title'; this.show('settings'); break;
      case 'tab': this.mapWorld = +d.w; this.show('map'); this.root.querySelector(`[data-key="tab${d.w}"]`).focus({ preventScroll: true }); break;
      case 'level':
        if (!Save.isUnlocked(d.id)) { Sound.play('deny'); return; }
        Game.startLevel(d.id);
        break;
      case 'select':
        Save.data.char = d.id;
        Save.save();
        this.show('chars');
        break;
      case 'buy': {
        const ch = CHAR_BY_ID[d.id];
        const st = Save.charState(ch);
        if (st.owned || st.locked || !st.affordable) { Sound.play('deny'); return; }
        Save.data.coins -= st.cost;
        Save.data.owned[ch.id] = true;
        Save.data.char = ch.id;
        Save.save();
        Sound.play('buy');
        this.show('chars');
        break;
      }
      case 'upgrade': {
        const u = UPG_BY_ID[d.id];
        const lvl = Save.data.upg[u.id] || 0;
        if (lvl >= u.costs.length || Save.data.coins < u.costs[lvl]) { Sound.play('deny'); return; }
        Save.data.coins -= u.costs[lvl];
        Save.data.upg[u.id] = lvl + 1;
        Save.save();
        Sound.play('buy');
        this.refresh();
        break;
      }
      case 'toggle':
        Save.data.settings[d.k] = !Save.data.settings[d.k];
        Save.save();
        el.setAttribute('aria-checked', Save.data.settings[d.k]);
        break;
      case 'touchmode':
        Save.data.settings.touch = d.v;
        Save.save();
        this.refresh();
        break;
      case 'reset': this.resetArmed = true; this.rerenderReset(); break;
      case 'resetCancel': this.resetArmed = false; this.rerenderReset(); break;
      case 'resetConfirm':
        Save.reset();
        this.applyAudio();
        Game.title.reset();
        this.show('title');
        break;
      case 'resume': Game.resume(); break;
      case 'restart': Game.startLevel(Game.run.def.id); break;
      case 'checkpoint': Game.toCheckpoint(); break;
      case 'quit': Game.quitToMap(); break;
      case 'next': Game.startLevel(d.id); break;
      case 'retry': Game.startLevel(Game.run.def.id); break;
      case 'map': Game.quitToMap(); break;
      case 'endingDone': Game.quitToMap(); break;
    }
  },

  rerenderReset() {
    const z = this.root.querySelector('#reset-zone');
    if (!z) return;
    z.innerHTML = this.resetArmed
      ? `<span class="hint">所有进度都会消失，确定吗？</span><button class="btn small danger" data-act="resetConfirm">清除</button><button class="btn small" data-act="resetCancel">取消</button>`
      : `<button class="btn small" data-act="reset">清除存档…</button>`;
    const b = z.querySelector('button');
    if (b) b.focus();
  },

  paintChars() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (const cv of this.root.querySelectorAll('canvas[data-char]')) {
      const ch = CHAR_BY_ID[cv.dataset.char];
      const size = +cv.dataset.size;
      cv.width = size * dpr;
      cv.height = size * dpr;
      const c = cv.getContext('2d');
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawCharacter(c, ch, size / 2, size * 0.9, { size: size * 0.72, facing: 1, happy: size > 50 });
    }
  },

  // —— 触屏 ——
  initTouch() {
    const t = document.getElementById('touch');
    t.innerHTML = `
      <div class="tbtn t-left" data-t="left">${ICONS.left}</div>
      <div class="tbtn t-right" data-t="right">${ICONS.right}</div>
      <div class="tbtn t-down" data-t="down">${ICONS.down}</div>
      <div class="tbtn t-jump" data-t="jump">${ICONS.up}</div>
      <div class="tbtn t-ability" data-t="ability">冲刺</div>
      <button class="tbtn t-pause" aria-label="暂停">${ICONS.pause}</button>
      <div class="rotate-hint" hidden>横过来玩更舒服</div>`;
    this.touchEl = t;
    this.tbtns = [...t.querySelectorAll('[data-t]')];
    t.querySelector('.t-pause').addEventListener('click', () => { if (Game.mode === 'play') Game.pause(); });
    const pointers = new Map();
    const canvas = document.getElementById('game');
    const recompute = () => {
      const st = {};
      const rects = this.tbtns.map((b) => ({ b, r: b.getBoundingClientRect(), k: b.dataset.t }));
      for (const p of pointers.values()) {
        let hit = null, bestD = Infinity;
        for (const o of rects) {
          if (o.b.hidden) continue;
          const pad = 18;
          if (p.x >= o.r.left - pad && p.x <= o.r.right + pad && p.y >= o.r.top - pad && p.y <= o.r.bottom + pad) {
            const d = Math.hypot(p.x - (o.r.left + o.r.width / 2), p.y - (o.r.top + o.r.height / 2));
            if (d < bestD) { bestD = d; hit = o.k; }
          }
        }
        if (hit) st[hit] = true;
      }
      Input.touch = st;
      for (const o of rects) o.b.classList.toggle('on', !!st[o.k]);
    };
    const down = (e) => {
      Sound.init();
      Music.resumeIfNeeded();
      if (e.pointerType === 'touch') {
        Input.device = 'touch';
        if (!this.touchActive && Game.mode === 'play') this.updateTouch();
      }
      if (Game.mode !== 'play' || !this.touchActive) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      recompute();
      e.preventDefault();
    };
    const move = (e) => { if (!pointers.has(e.pointerId)) return; pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); recompute(); };
    const up = (e) => { if (!pointers.has(e.pointerId)) return; pointers.delete(e.pointerId); recompute(); };
    canvas.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    window.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') Input.device = 'touch'; }, true);
    this.clearTouch = () => { pointers.clear(); recompute(); };
  },

  updateTouch() {
    if (!this.touchEl) return;
    const mode = Save.data.settings.touch;
    const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    const want = mode === 'on' || (mode === 'auto' && (Input.device === 'touch' || coarse));
    this.touchActive = want && Game.mode === 'play' && !this.current;
    this.touchEl.style.display = this.touchActive ? '' : 'none';
    if (this.touchActive) {
      const ab = Game.run && Game.run.char.ability;
      this.touchEl.querySelector('.t-ability').hidden = !(ab === 'dash' || ab === 'star');
      this.touchEl.querySelector('.rotate-hint').hidden = window.innerWidth > window.innerHeight;
    } else if (this.clearTouch) {
      this.clearTouch();
    }
  },
};
