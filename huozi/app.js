(function () {
  'use strict';

  var DATA = window.HZ_DATA;
  var DAY = 864e5;
  var KEY = 'huozi.v1';
  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function announce(msg) { var el = $('#live'); el.textContent = ''; setTimeout(function () { el.textContent = msg; }, 30); }

  /* ================= 词库 ================= */

  var M = {};
  Object.keys(DATA.morphemes).forEach(function (id) {
    var a = DATA.morphemes[id];
    M[id] = { id: id, f: a[0], g: a[1], k: a[2], x: !!a[3] };
  });
  var FAMS = [], WORDS = [], W = {}, FAM_OF_ROOT = {};
  DATA.families.forEach(function (f) {
    var fam = { id: f.id, forms: f.forms, g: f.zh, origin: f.origin, words: [] };
    f.forms.forEach(function (id) { FAM_OF_ROOT[id] = fam; });
    f.words.forEach(function (a) {
      var w = { w: a[0], ipa: a[1], zh: a[2], parts: a[3].split('+'), lit: a[4], ex: a[5], exZh: a[6], fam: fam };
      fam.words.push(w); WORDS.push(w); W[w.w] = w;
    });
    FAMS.push(fam);
  });
  var FORMS = {};
  Object.keys(M).forEach(function (id) { var m = M[id]; (FORMS[m.f] = FORMS[m.f] || []).push(m); });

  function label(m) { return m.k === 'pre' ? m.f + '-' : m.k === 'suf' ? '-' + m.f : m.f; }
  function splitPos(zh) {
    var m = /^([a-z]+\.)\s*(.*)$/.exec(zh);
    return m ? { pos: m[1], text: m[2] } : { pos: '', text: zh };
  }

  /* 一块字模。o: { gloss, key, cls, attrs, tag, glossText } */
  function sortHTML(m, o) {
    o = o || {};
    var tag = o.tag || 'button';
    var hy = '<span class="hy" aria-hidden="true">-</span>';
    var face = (m.k === 'suf' ? hy : '') + esc(m.f) + (m.k === 'pre' ? hy : '');
    var gloss = o.glossText != null ? o.glossText : m.g;
    var aria = label(m) + (o.gloss ? '，' + gloss : '');
    return '<' + tag + (tag === 'button' ? ' type="button"' : '') +
      ' class="sort sort-' + m.k + (o.cls ? ' ' + o.cls : '') + (tag !== 'button' ? ' is-static' : '') + '"' +
      (o.attrs ? ' ' + o.attrs : '') + ' aria-label="' + esc(aria) + '">' +
      (o.key ? '<span class="key" aria-hidden="true">' + o.key + '</span>' : '') +
      '<span class="face" aria-hidden="true">' + face + '</span>' +
      (o.gloss ? '<span class="gl" aria-hidden="true">' + esc(gloss) + '</span>' : '') +
      '</' + tag + '>';
  }

  var SPEAKER = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  function speakBtn(word) {
    if (!canSpeak) return '';
    return '<button type="button" class="speak" data-say="' + esc(word) + '" aria-label="朗读 ' + esc(word) + '">' + SPEAKER + '</button>';
  }

  /* ================= 进度存储 ================= */

  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function freshState() {
    return { v: 1, cards: {}, found: [], day: today(), newDone: 0, newPerDay: 8, autoSpeak: true, updatedAt: 0 };
  }
  function normalize(s) {
    var n = freshState();
    if (s && typeof s === 'object') Object.keys(s).forEach(function (k) { n[k] = s[k]; });
    var cards = {};
    if (n.cards && typeof n.cards === 'object') {
      Object.keys(n.cards).forEach(function (k) {
        var c = n.cards[k];
        if (W[k] && c && +c.s > 0 && +c.last > 0) cards[k] = { s: +c.s, last: +c.last, reps: +c.reps || 1, lapses: +c.lapses || 0 };
      });
    }
    n.cards = cards;
    n.found = Array.isArray(n.found) ? n.found.filter(function (k) { return W[k]; }) : [];
    n.newPerDay = [5, 8, 12, 20].indexOf(+n.newPerDay) >= 0 ? +n.newPerDay : 8;
    n.newDone = +n.newDone || 0;
    n.autoSpeak = n.autoSpeak !== false;
    n.updatedAt = +n.updatedAt || 0;
    return n;
  }
  function loadLocal() {
    try { var raw = localStorage.getItem(KEY); if (raw) return normalize(JSON.parse(raw)); } catch (e) { /* 无痕模式等 */ }
    return freshState();
  }
  function writeLocal() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* 忽略 */ } }

  var S = loadLocal();
  function rollDay() { var t = today(); if (S.day !== t) { S.day = t; S.newDone = 0; } }
  function save() { S.updatedAt = Date.now(); writeLocal(); cloud.queue(); }

  /* 在 Claude 的页面里打开时，进度额外存进账号（每人私有）；其他地方只用浏览器存储。 */
  var cloud = {
    ref: null, timer: 0, writing: false, pending: false,
    connect: function () {
      var c = window.claude;
      if (!c || typeof c.use !== 'function') return;
      var self = this;
      Promise.all([c.use('db'), c.use('user')]).then(function (r) {
        var db = r[0], user = r[1];
        if (!db || !user) return null;
        return user.id().then(function (id) {
          if (!id) return null;
          var ref = db.doc('data/users/' + id + '/progress');
          return ref.get().then(function (snap) {
            self.ref = ref;
            var data = snap.exists ? snap.data() : null;
            var rs = data && data.state;
            if (rs && (+rs.updatedAt || 0) > S.updatedAt) {
              S = normalize(JSON.parse(JSON.stringify(rs)));
              writeLocal();
              onStateReplaced();
            } else if (S.updatedAt && (!rs || S.updatedAt > (+rs.updatedAt || 0))) {
              self.queue();
            }
            $('#sync-note').textContent = '学习进度跟随你的账号保存。';
          });
        });
      }).catch(function () { self.ref = null; });
    },
    queue: function (delay) {
      if (!this.ref) return;
      this.pending = true;
      clearTimeout(this.timer);
      var self = this;
      this.timer = setTimeout(function () { self.flush(); }, delay || 1200);
    },
    flush: function () {
      if (!this.ref || this.writing || !this.pending) return;
      var self = this;
      this.writing = true; this.pending = false;
      this.ref.set({ state: JSON.parse(JSON.stringify(S)) }).then(function () {
        self.writing = false;
        if (self.pending) self.queue();
      }, function (e) {
        self.writing = false;
        var code = e && e.code;
        if (code === 'unavailable' || code === 'resource_exhausted') self.queue(8000 + Math.random() * 4000);
        else { self.ref = null; $('#sync-note').textContent = '学习进度保存在这台设备的浏览器里。'; }
      });
    }
  };

  /* ================= 记忆模型 =================
   * 可提取率 R(t) = 1 / (1 + t / 9S)，t = 距上次排字的天数，S = 稳定度（天）。
   * t = S 时 R = 90%，此时到期重印。越晚复习、排得越顺，S 涨得越多。 */
  function retr(c, at) { return c ? 1 / (1 + Math.max(0, at - c.last) / (9 * c.s * DAY)) : 0; }
  function applyGrade(word, g, now) {
    var c = S.cards[word], n;
    if (!c) {
      n = { s: { good: 1.5, hard: 0.6, again: 0.2 }[g], last: now, reps: 1, lapses: g === 'again' ? 1 : 0 };
    } else {
      var r = retr(c, now), s;
      if (g === 'again') s = Math.max(0.2, c.s * 0.3);
      else {
        var inc = 18 * Math.pow(c.s, -0.2) * (Math.exp(1 - r) - 1) * (g === 'hard' ? 0.45 : 1);
        s = c.s * Math.min(6, 1 + inc);
      }
      n = { s: Math.min(s, 3650), last: now, reps: c.reps + 1, lapses: c.lapses + (g === 'again' ? 1 : 0) };
    }
    S.cards[word] = n;
    return n;
  }
  function dueAt(c) { return c.last + c.s * DAY; }
  function fmtWait(ms) {
    if (ms <= 0) return '现在';
    var h = ms / 36e5;
    if (h < 1) return '不到 1 小时后';
    if (h < 24) return '约 ' + Math.round(h) + ' 小时后';
    var d = h / 24;
    if (d < 45) return '约 ' + Math.round(d) + ' 天后';
    return '约 ' + Math.round(d / 30) + ' 个月后';
  }
  function inkOf(r) { return Math.pow(Math.min(1, Math.max(0, (r - 0.35) / 0.65)), 1.4); }
  function inkStyle(r) {
    var ink = inkOf(r);
    var wear = r >= 0.93 ? 1 : r >= 0.8 ? 2 : 3;
    return { pct: Math.round(26 + 74 * ink), wear: wear };
  }
  function dueList(now) {
    return Object.keys(S.cards)
      .map(function (w) { return { w: w, r: retr(S.cards[w], now) }; })
      .filter(function (x) { return x.r < 0.9; })
      .sort(function (a, b) { return a.r - b.r; });
  }
  function newLeft() {
    rollDay();
    var unlearned = WORDS.filter(function (w) { return !S.cards[w.w]; }).length;
    return Math.min(unlearned, Math.max(0, S.newPerDay - S.newDone));
  }

  /* ================= 朗读 ================= */

  var canSpeak = 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';
  var voice = null;
  function pickVoice() {
    var vs = [];
    try { vs = window.speechSynthesis.getVoices() || []; } catch (e) { return null; }
    function find(fn) { for (var i = 0; i < vs.length; i++) if (fn(vs[i])) return vs[i]; return null; }
    return find(function (v) { return /en[-_]US/i.test(v.lang) && /natural|google|samantha|aria|jenny|ava/i.test(v.name); }) ||
      find(function (v) { return /en[-_]US/i.test(v.lang); }) ||
      find(function (v) { return /^en/i.test(v.lang); });
  }
  if (canSpeak) {
    voice = pickVoice();
    try { window.speechSynthesis.addEventListener('voiceschanged', function () { voice = pickVoice(); }); } catch (e) { /* 旧浏览器 */ }
  }
  function speak(text) {
    if (!canSpeak) return;
    try {
      window.speechSynthesis.cancel();
      var u = new window.SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      if (voice) u.voice = voice;
      u.rate = 0.88;
      window.speechSynthesis.speak(u);
    } catch (e) { /* 不支持就不出声 */ }
  }

  /* ================= 视图切换 ================= */

  var VIEWS = ['compose', 'case', 'proof'];
  var view = 'compose';
  function show(v) {
    if (VIEWS.indexOf(v) < 0) v = 'compose';
    view = v;
    VIEWS.forEach(function (x) {
      $('#view-' + x).hidden = x !== v;
      var t = $('#tab-' + x);
      t.setAttribute('aria-selected', x === v ? 'true' : 'false');
      t.tabIndex = x === v ? 0 : -1;
    });
    if (v === 'compose') renderCompose();
    if (v === 'case') renderCase();
    if (v === 'proof') renderProof();
    try { history.replaceState(null, '', '#' + v); } catch (e) { /* 沙盒里可能不允许 */ }
    updateBadge();
  }
  function updateBadge() {
    var n = dueList(Date.now()).length + newLeft();
    $('#badge-compose').textContent = n ? String(n) : '';
    $('#tab-compose').setAttribute('aria-label', n ? '排字，待排 ' + n + ' 个' : '排字');
  }

  /* ================= 排字（学习 + 复习） ================= */

  var session = null;
  var item = null;

  function buildSession(mode, extraNew) {
    rollDay();
    var now = Date.now();
    var due = dueList(now).map(function (x) { return { w: x.w, isNew: false }; });
    var fresh = [];
    if (mode !== 'review') {
      var n = extraNew || newLeft();
      fresh = WORDS.filter(function (w) { return !S.cards[w.w]; }).slice(0, n).map(function (w) { return { w: w.w, isNew: true }; });
    }
    session = { mode: mode, queue: mode === 'extra' ? fresh : due.concat(fresh), i: 0, results: [], requeued: {} };
    item = null;
  }

  function makeTray(w, isNew) {
    var forms = {};
    w.parts.forEach(function (id) { forms[M[id].f] = 1; });
    var pool = Object.keys(M).map(function (id) { return M[id]; }).filter(function (m) { return !m.x && !forms[m.f]; });
    var picks = [];
    function take(m) { if (m && !forms[m.f]) { picks.push(m.id); forms[m.f] = 1; return true; } return false; }
    // 每个正确字模配一个“近亲”干扰项：优先同义（考的是词形而不是意思），否则同类
    w.parts.forEach(function (id) {
      var m = M[id];
      var same = shuffle(pool.filter(function (p) { return p.k === m.k && p.g === m.g && !forms[p.f]; }));
      var kin = shuffle(pool.filter(function (p) { return p.k === m.k && !forms[p.f]; }));
      // 新词只有字面线索可依，同义干扰项无从分辨，只在复习时出现
      if (!(!isNew && Math.random() < 0.65 && take(same[0]))) take(kin.filter(function (p) { return !isNew || p.g !== m.g; })[0]);
    });
    var want = Math.max(6, Math.min(8, w.parts.length * 2 + 2));
    var glosses = {};
    if (isNew) w.parts.forEach(function (id) { glosses[M[id].g] = 1; });
    var rest = shuffle(pool.filter(function (p) { return !forms[p.f] && !glosses[p.g]; }));
    for (var i = 0; picks.length + w.parts.length < want && i < rest.length; i++) take(rest[i]);
    return shuffle(w.parts.concat(picks));
  }

  function startItem() {
    var q = session.queue[session.i];
    if (!q) { item = null; return; }
    var w = W[q.w];
    item = { q: q, w: w, tray: makeTray(w, q.isNew), stick: [], mistakes: 0, hinted: false, done: false, grade: null, flags: null, note: '', noteCalm: false, card: null, fresh: false };
  }

  function pick(i) {
    if (!item || item.done || item.stick.indexOf(i) >= 0) return;
    item.stick.push(i); item.flags = null; item.note = '';
    renderCompose();
    focusTray(i);
  }
  function unpick(pos) {
    if (!item || item.done) return;
    var i = item.stick.splice(pos, 1)[0];
    item.flags = null; item.note = '';
    renderCompose();
    var el = $('#view-compose [data-tray="' + i + '"]');
    if (el) el.focus();
  }
  function unpickLast() { if (item && item.stick.length) unpick(item.stick.length - 1); }
  function clearStick() { if (!item || item.done) return; item.stick = []; item.flags = null; item.note = ''; renderCompose(); }
  function focusTray(after) {
    var btns = $$('#view-compose .tray-sorts button.sort:not([disabled])');
    if (!btns.length) { var p = $('#print'); if (p) p.focus(); return; }
    var next = btns.filter(function (b) { return +b.getAttribute('data-tray') > after; })[0] || btns[0];
    next.focus();
  }

  function printCompose() {
    if (!item || item.done) return;
    if (!item.stick.length) {
      item.note = '手托还是空的。先从下面的字盘里挑字模。'; item.noteCalm = true;
      renderCompose(); return;
    }
    var ids = item.stick.map(function (i) { return item.tray[i]; });
    var spelled = ids.map(function (id) { return M[id].f; }).join('');
    if (spelled === item.w.w) { finish(false); return; }
    item.mistakes++;
    var target = item.w.parts.map(function (id) { return M[id].f; });
    item.flags = ids.map(function (id, k) { return M[id].f !== target[k]; });
    var wrong = item.flags.filter(Boolean).length;
    if (!wrong && ids.length < target.length) item.note = '已排的都对，还少字模，接着往后排。';
    else if (!wrong) item.note = '多排了字模，把最后多出来的撤掉。';
    else item.note = '标红的 ' + wrong + ' 块字模不对，点它撤回，换一块再印。';
    item.noteCalm = !wrong;
    if (item.mistakes >= 3) item.note += '实在想不出来，可以点“看答案”。';
    announce(item.note);
    renderCompose();
  }

  function finish(gaveUp) {
    var now = Date.now();
    var g;
    if (gaveUp || item.mistakes >= 3) g = 'again';
    else if (item.mistakes === 0 && !item.hinted) g = 'good';
    else g = 'hard';
    if (gaveUp) {
      var used = {};
      item.stick = item.w.parts.map(function (id) {
        for (var i = 0; i < item.tray.length; i++) if (item.tray[i] === id && !used[i]) { used[i] = 1; return i; }
        return -1;
      });
    }
    item.done = true; item.grade = g; item.gaveUp = !!gaveUp; item.fresh = true;
    item.card = applyGrade(item.w.w, g, now);
    if (item.q.isNew) S.newDone++;
    session.results.push({ w: item.w.w, g: g, isNew: item.q.isNew });
    if (g === 'again' && !session.requeued[item.w.w]) {
      session.requeued[item.w.w] = 1;
      session.queue.splice(Math.min(session.queue.length, session.i + 4), 0, { w: item.w.w, isNew: false, again: true });
    }
    save();
    if (S.autoSpeak) speak(item.w.w);
    announce(item.w.w + '，' + item.w.zh);
    var stick = $('#stick');
    if (!reduceMotion && stick && !gaveUp) {
      stick.classList.add('is-pressing');
      setTimeout(function () { renderCompose(); focusNext(); }, 300);
    } else { renderCompose(); focusNext(); }
  }
  function focusNext() { var b = $('#next'); if (b) b.focus({ preventScroll: true }); }

  function next() {
    session.i++;
    startItem();
    renderCompose();
    updateBadge();
    var first = $('#view-compose .tray-sorts button.sort');
    if (first) first.focus({ preventScroll: true });
    var desk = $('#view-compose');
    if (desk.getBoundingClientRect().top < 0) desk.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }

  function galleyHTML() {
    var n = session.queue.length;
    var ticks = '';
    for (var i = 0; i < n; i++) ticks += '<i class="' + (i < session.i || (i === session.i && item && item.done) ? 'is-done' : i === session.i ? 'is-now' : '') + '"></i>';
    return '<div class="galley"><span>第 ' + Math.min(session.i + 1, n) + ' 块，共 ' + n + ' 块</span><span class="galley-ticks" aria-hidden="true">' + ticks + '</span></div>';
  }

  function clozeHTML(w) {
    var parts = w.ex.split(/\{[^}]+\}/);
    return esc(parts[0]) + '<span class="blank" aria-label="空格"></span>' + esc(parts.slice(1).join(''));
  }
  function exampleHTML(w) {
    return esc(w.ex).replace(/\{([^}]+)\}/, '<b>$1</b>');
  }

  function kinHTML(w) {
    var now = Date.now();
    var sibs = w.fam.words.filter(function (x) { return x.w !== w.w; });
    return '<div class="kin"><span class="kin-head">同一个词根还能排出（墨色的是学过的）</span>' +
      sibs.map(function (x) { return wordChip(x, now); }).join('') + '</div>';
  }
  function wordChip(x, at, tag) {
    var c = S.cards[x.w];
    tag = tag || 'span';
    var found = S.found.indexOf(x.w) >= 0 ? '<sup aria-hidden="true">†</sup>' : '';
    if (!c) return '<' + tag + ' class="w blind" data-w="' + x.w + '" title="' + esc(x.zh) + '" aria-label="' + x.w + '，还没学">' + x.w + '</' + tag + '>';
    var st = inkStyle(retr(c, at));
    return '<' + tag + ' class="w wear-' + st.wear + '" style="--pct:' + st.pct + '%" data-w="' + x.w + '" title="' + esc(x.zh) + '">' + x.w + found + '</' + tag + '>';
  }

  function renderCompose() {
    var root = $('#view-compose');
    if (!session) buildSession('daily');
    if (!item && session.i < session.queue.length) startItem();
    if (!item) { root.innerHTML = doneHTML(); return; }

    var w = item.w, q = item.q;
    var showGloss = q.isNew || item.hinted;
    var m = splitPos(w.zh);
    var kind = q.isNew ? '<b>新字模</b>：照字面线索排出这个词' :
      q.again ? '<b>再排一次</b>：刚才这个词没排顺' : '<b>重印</b>：这个词的墨色淡了，凭记忆把它排出来';

    var h = '<div class="desk">' + galleyHTML() +
      '<div class="prompt"><p class="kind">' + kind + '</p>' +
      '<h2 class="meaning">' + (m.pos ? '<span class="pos">' + esc(m.pos) + '</span>' : '') + esc(m.text) + '</h2>';
    if (q.isNew) h += '<p class="clue">字面线索：<b>' + esc(w.lit) + '</b></p>';
    else {
      h += '<p class="cloze" lang="en">' + clozeHTML(w) + '</p><p class="cloze-zh">' + esc(w.exZh) + '</p>';
      if (item.hinted) h += '<p class="clue">字面线索：<b>' + esc(w.lit) + '</b></p>';
    }
    h += '</div>';

    if (!item.done) {
      h += '<div class="stick-wrap"><div class="stick" id="stick" role="group" aria-label="排字手托，点字模可撤回">';
      if (!item.stick.length) h += '<span class="stick-empty">按顺序把字模排在这里</span>';
      item.stick.forEach(function (ti, pos) {
        var mm = M[item.tray[ti]];
        h += sortHTML(mm, { gloss: showGloss, cls: item.flags && item.flags[pos] ? 'is-wrong' : '', attrs: 'data-stick="' + pos + '"' });
      });
      if (item.stick.length) h += '<span class="slot" aria-hidden="true"></span>';
      h += '</div><p class="note' + (item.noteCalm ? ' is-calm' : '') + '" role="status">' + esc(item.note) + '</p></div>';

      h += '<div class="controls">' +
        '<button type="button" class="btn" id="undo"' + (item.stick.length ? '' : ' disabled') + '>撤回一块</button>' +
        '<button type="button" class="btn" id="clear"' + (item.stick.length ? '' : ' disabled') + '>清空手托</button>' +
        (!q.isNew && !item.hinted ? '<button type="button" class="btn" id="hint">给点提示</button>' : '') +
        '<button type="button" class="btn" id="giveup">看答案</button>' +
        '<span class="spacer"></span>' +
        '<button type="button" class="btn-press" id="print">印刷 <kbd>Enter</kbd></button></div>';

      h += '<div class="tray" role="group" aria-label="字盘"><p class="tray-head">字盘：点字模放进手托，也可以按数字键 1–' + item.tray.length + '</p><div class="tray-sorts">';
      item.tray.forEach(function (id, i) {
        var taken = item.stick.indexOf(i) >= 0;
        h += sortHTML(M[id], { gloss: showGloss, key: taken ? '' : String(i + 1), cls: taken ? 'is-taken' : '', attrs: 'data-tray="' + i + '"' + (taken ? ' disabled' : '') });
      });
      h += '</div></div>';
    } else {
      var c = item.card;
      var verdict = { good: '一次排对', hard: '排对了，中间有失误', again: item.gaveUp ? '这次看了答案' : '失误有点多' }[item.grade];
      var nextTxt = item.grade === 'again' && session.requeued[w.w] && !q.again ? '过几个词会让你再排一次。' : '下次重印：' + fmtWait(dueAt(c) - Date.now()) + '。';
      h += '<article class="proof-card" aria-label="印好的词">' +
        '<div><span class="printed' + (item.fresh && !reduceMotion ? ' is-fresh' : '') + '" lang="en">' + esc(w.w) + '</span></div>' +
        '<div class="say-row"><span class="ipa">/' + esc(w.ipa) + '/</span>' + speakBtn(w.w) + '</div>' +
        '<div class="formula">' + w.parts.map(function (id) { return sortHTML(M[id], { tag: 'span', gloss: true, cls: 'is-small' }); }).join('<span class="plus" aria-hidden="true">+</span>') + '</div>' +
        '<dl class="gloss"><dt>字面</dt><dd>' + esc(w.lit) + '</dd><dt>词义</dt><dd>' + esc(w.zh) + '</dd></dl>' +
        '<blockquote class="example"><p class="en" lang="en">' + exampleHTML(w) + '</p><p class="zh">' + esc(w.exZh) + '</p></blockquote>' +
        kinHTML(w) +
        '<div class="card-foot"><p class="verdict"><span class="tag' + (item.grade === 'again' ? ' is-again' : '') + '">' + verdict + '。</span>' + nextTxt + '</p>' +
        '<button type="button" class="btn-press" id="next">下一个 <kbd>Enter</kbd></button></div>' +
        '</article>';
      item.fresh = false;
    }
    h += '</div>';
    root.innerHTML = h;
  }

  function doneHTML() {
    var res = session.results;
    var now = Date.now();
    var pending = dueList(now).length;
    var unlearned = WORDS.filter(function (w) { return !S.cards[w.w]; }).length;
    var soonest = Object.keys(S.cards).map(function (k) { return dueAt(S.cards[k]); }).filter(function (t) { return t > now; }).sort(function (a, b) { return a - b; })[0];
    var h = '<div class="done">';
    if (!res.length) {
      h += '<h2>' + (pending ? '还有 ' + pending + ' 个词等着重印' : '现在没有要排的词') + '</h2>';
      if (!pending && soonest) h += '<p>下一个词' + fmtWait(soonest - now) + '开始褪色。</p>';
    } else {
      var fresh = res.filter(function (r) { return r.isNew; }).length;
      var again = res.filter(function (r) { return r.g === 'again'; }).map(function (r) { return r.w; });
      var uniq = {};
      res.forEach(function (r) { uniq[r.w] = r.g; });
      h += '<h2>这一版排完了</h2>' +
        '<p>排了 ' + Object.keys(uniq).length + ' 个词，其中新词 ' + fresh + ' 个。' +
        (again.length ? '有 ' + again.length + ' 次没排顺，这些词会更早回来。' : '全部排顺了。') + '</p>' +
        '<div class="mini-sheet">' + Object.keys(uniq).map(function (k) {
          return uniq[k] === 'again' ? '<span class="w is-again" style="--pct:100%">' + k + '</span>' : wordChip(W[k], now);
        }).join('') + '</div>';
      if (soonest) h += '<p>下一个词' + fmtWait(soonest - now) + '开始褪色，到时回来重印。</p>';
    }
    h += '<div class="controls">';
    if (pending) h += '<button type="button" class="btn-press" data-session="review">重印 ' + pending + ' 个词</button>';
    if (unlearned) h += '<button type="button" class="btn' + (pending ? '' : '-press') + '" data-session="extra">再学 5 个新词</button>';
    else h += '<p>词库里的 170 个词你都排过了。</p>';
    h += '<button type="button" class="btn" data-go="proof">去校样看墨色</button></div></div>';
    return h;
  }

  $('#view-compose').addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (!t || t.disabled) return;
    if (t.hasAttribute('data-tray')) return pick(+t.getAttribute('data-tray'));
    if (t.hasAttribute('data-stick')) return unpick(+t.getAttribute('data-stick'));
    if (t.hasAttribute('data-session')) {
      var mode = t.getAttribute('data-session');
      buildSession(mode, mode === 'extra' ? 5 : 0);
      renderCompose(); updateBadge();
      var first = $('#view-compose .tray-sorts button.sort'); if (first) first.focus();
      return;
    }
    switch (t.id) {
      case 'undo': return unpickLast();
      case 'clear': return clearStick();
      case 'print': return printCompose();
      case 'giveup': return finish(true);
      case 'next': return next();
      case 'hint':
        item.hinted = true; renderCompose();
        var tr = $('#view-compose .tray-sorts button.sort:not([disabled])'); if (tr) tr.focus();
        return;
    }
  });

  document.addEventListener('keydown', function (e) {
    if (view !== 'compose' || !item || e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if (t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
    if (item.done) {
      if (e.key === 'Enter' && (!t || t.tagName !== 'BUTTON' || t.id === 'next')) { e.preventDefault(); next(); }
      return;
    }
    if (/^[1-9]$/.test(e.key)) {
      var i = +e.key - 1;
      if (i < item.tray.length) { e.preventDefault(); pick(i); }
    } else if (e.key === 'Backspace') {
      e.preventDefault(); unpickLast();
    } else if (e.key === 'Enter') {
      // 焦点在字模上时 Enter 也是“印刷”（挑字模用数字键或空格）；只有功能按钮保留自己的 Enter
      if (t && t.tagName === 'BUTTON' && !t.classList.contains('sort') && t.id !== 'print') return;
      e.preventDefault(); printCompose();
    } else if (e.key === 'Escape') {
      clearStick();
    }
  });

  /* ================= 字盘：自由排字 + 拆生词 ================= */

  var forge = { stick: [], result: '', filter: '' };
  var caseBuilt = false;

  function renderCase() {
    var root = $('#view-case');
    if (!caseBuilt) {
      var count = Object.keys(M).filter(function (id) { return !M[id].x; }).length;
      root.innerHTML =
        '<div class="view-head"><h2>字盘</h2><p>' + count + ' 块字模都在这里。随便挑几块拼一个词：拼出词库里的词，它会直接印进你的校样。</p></div>' +
        '<div class="forge">' +
        '<div class="stick" id="forge-stick" role="group" aria-label="自由排字手托，点字模可撤回"></div>' +
        '<div class="controls">' +
        '<button type="button" class="btn" id="forge-undo">撤回一块</button>' +
        '<button type="button" class="btn" id="forge-clear">清空手托</button>' +
        '<span class="spacer"></span>' +
        '<button type="button" class="btn-press" id="forge-print">印刷</button></div>' +
        '<div class="forge-result" id="forge-result" role="status"></div>' +
        '</div>' +
        '<div class="case-tools"><label for="case-filter">找字模</label>' +
        '<input class="field" id="case-filter" type="search" autocomplete="off" placeholder="输入拼写或意思，比如 看、spect"></div>' +
        '<div class="case">' +
        ['pre', 'root', 'suf'].map(function (k) {
          return '<section class="drawer" aria-labelledby="drawer-' + k + '"><h3 id="drawer-' + k + '">' +
            { pre: '词首', root: '词根', suf: '词尾' }[k] + '<span id="drawer-n-' + k + '"></span></h3>' +
            '<div class="cells" id="cells-' + k + '"></div></section>';
        }).join('') +
        '</div>' +
        '<section class="split" aria-labelledby="split-h"><h3 id="split-h">拆一个生词</h3>' +
        '<p>遇到不认识的词，输入进来，按已知字模试着拆开，猜猜它的意思。</p>' +
        '<form id="split-form" autocomplete="off"><label class="sr-only" for="split-input">要拆的英文单词</label>' +
        '<input class="field" id="split-input" lang="en" spellcheck="false" placeholder="例如 retrospective">' +
        '<button type="submit" class="btn">拆开看看</button></form>' +
        '<div class="split-out" id="split-out" role="status"></div></section>';
      caseBuilt = true;
      renderCells();
    }
    renderForge();
  }

  function renderCells() {
    var f = forge.filter.trim().toLowerCase();
    ['pre', 'root', 'suf'].forEach(function (k) {
      var list = Object.keys(M).map(function (id) { return M[id]; }).filter(function (m) {
        return m.k === k && !m.x && (!f || m.f.indexOf(f) >= 0 || m.g.indexOf(f) >= 0);
      }).sort(function (a, b) { return a.f.localeCompare(b.f); });
      $('#cells-' + k).innerHTML = list.length
        ? list.map(function (m) { return sortHTML(m, { gloss: true, cls: 'is-small', attrs: 'data-forge="' + m.id + '"' }); }).join('')
        : '<p class="cells-empty">没有匹配的字模</p>';
      $('#drawer-n-' + k).textContent = list.length;
    });
  }

  function renderForge() {
    var st = $('#forge-stick');
    if (!st) return;
    st.innerHTML = forge.stick.length
      ? forge.stick.map(function (id, pos) { return sortHTML(M[id], { gloss: true, attrs: 'data-forge-pos="' + pos + '"' }); }).join('') + '<span class="slot" aria-hidden="true"></span>'
      : '<span class="stick-empty">从下面的字盘里挑字模，按顺序排在这里</span>';
    $('#forge-undo').disabled = !forge.stick.length;
    $('#forge-clear').disabled = !forge.stick.length;
    $('#forge-print').disabled = !forge.stick.length;
    $('#forge-result').innerHTML = forge.result || familyHint();
  }

  function familyHint() {
    var fam = null;
    for (var i = forge.stick.length - 1; i >= 0 && !fam; i--) fam = FAM_OF_ROOT[forge.stick[i]] || null;
    if (!fam) return '';
    var learned = fam.words.filter(function (x) { return S.cards[x.w]; }).length;
    return '<p class="miss">' + esc(fam.forms.join(' / ')) + '（' + esc(fam.g) + '，' + esc(fam.origin) + '）能排出 ' + fam.words.length + ' 个词库里的词，你学过 ' + learned + ' 个：</p>' +
      '<div class="kin">' + fam.words.map(function (x) { return wordChip(x, Date.now()); }).join('') + '</div>';
  }

  function forgePrint() {
    if (!forge.stick.length) return;
    var spelled = forge.stick.map(function (id) { return M[id].f; }).join('');
    var lit = forge.stick.map(function (id) { return M[id].g; }).join(' + ');
    var w = W[spelled];
    var h;
    if (w) {
      var had = !!S.cards[w.w];
      if (!had) {
        applyGrade(w.w, 'good', Date.now());
        if (S.found.indexOf(w.w) < 0) S.found.push(w.w);
        save(); updateBadge();
      }
      h = '<p class="hit">' + (had ? '这个词已经在你的校样上了。' : '拼出了新词，已经印进校样。') + '</p>' +
        '<div class="proof-card"><div><span class="printed' + (reduceMotion ? '' : ' is-fresh') + '" lang="en">' + esc(w.w) + '</span></div>' +
        '<div class="say-row"><span class="ipa">/' + esc(w.ipa) + '/</span>' + speakBtn(w.w) + '</div>' +
        '<dl class="gloss"><dt>字面</dt><dd>' + esc(w.lit) + '</dd><dt>词义</dt><dd>' + esc(w.zh) + '</dd></dl>' +
        '<blockquote class="example"><p class="en" lang="en">' + exampleHTML(w) + '</p><p class="zh">' + esc(w.exZh) + '</p></blockquote></div>';
      if (S.autoSpeak) speak(w.w);
      announce(w.w + '，' + w.zh);
    } else {
      var ids = {};
      forge.stick.forEach(function (id) { ids[id] = 1; });
      var sug = WORDS.map(function (x) {
        return { x: x, n: x.parts.filter(function (p) { return ids[p] || forge.stick.some(function (s) { return M[s].f === M[p].f; }); }).length };
      }).filter(function (o) { return o.n > 0; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 6);
      h = '<p class="miss">词库里没有 <b lang="en">' + esc(spelled) + '</b>。按字面直译是「' + esc(lit) + '」。' +
        (sug.length ? '用到这些字模的词有：' : '换几块字模再试试。') + '</p>' +
        (sug.length ? '<div class="suggest">' + sug.map(function (o) {
          return '<button type="button" class="btn" data-load="' + o.x.w + '" lang="en">' + (S.cards[o.x.w] ? o.x.w : '排出 ' + o.x.parts.map(function (p) { return M[p].f; }).join(' + ')) + '</button>';
        }).join('') + '</div>' : '');
      announce('词库里没有 ' + spelled);
    }
    forge.result = h;
    renderForge();
  }

  $('#view-case').addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (!t || t.disabled) return;
    if (t.hasAttribute('data-forge')) {
      if (forge.stick.length >= 6) { forge.result = '<p class="miss">手托最多放 6 块字模。</p>'; renderForge(); return; }
      forge.stick.push(t.getAttribute('data-forge')); forge.result = ''; renderForge(); return;
    }
    if (t.hasAttribute('data-forge-pos')) { forge.stick.splice(+t.getAttribute('data-forge-pos'), 1); forge.result = ''; renderForge(); return; }
    if (t.hasAttribute('data-load')) {
      var w = W[t.getAttribute('data-load')];
      forge.stick = w.parts.slice(); forge.result = ''; renderForge();
      $('#forge-print').focus();
      return;
    }
    if (t.id === 'forge-undo') { forge.stick.pop(); forge.result = ''; renderForge(); }
    if (t.id === 'forge-clear') { forge.stick = []; forge.result = ''; renderForge(); }
    if (t.id === 'forge-print') forgePrint();
  });
  $('#view-case').addEventListener('input', function (e) {
    if (e.target.id === 'case-filter') { forge.filter = e.target.value; renderCells(); }
  });
  $('#view-case').addEventListener('submit', function (e) {
    if (e.target.id !== 'split-form') return;
    e.preventDefault();
    $('#split-out').innerHTML = splitHTML($('#split-input').value);
  });

  /* 拆词：动态规划，尽量用已知字模覆盖整个词；词首放在前面、词尾放在后面更合理。 */
  function split(raw) {
    var word = String(raw || '').toLowerCase().replace(/[^a-z]/g, '');
    if (!word) return null;
    if (W[word]) return { word: word, known: W[word], segs: W[word].parts.map(function (id) { return { f: M[id].f, ms: [M[id]] }; }) };
    var n = word.length;
    var best = [{ cost: 0, segs: [] }];
    for (var i = 1; i <= n; i++) best[i] = null;
    function relax(i, j, cost, seg) {
      var c = best[i].cost + cost;
      if (!best[j] || c < best[j].cost) best[j] = { cost: c, segs: best[i].segs.concat([seg]) };
    }
    for (var i2 = 0; i2 < n; i2++) {
      if (!best[i2]) continue;
      relax(i2, i2 + 1, 3, { f: word[i2], ms: null });
      var onlyPre = best[i2].segs.every(function (s) { return s.ms && s.ms.every(function (m) { return m.k === 'pre'; }); });
      for (var j = i2 + 1; j <= Math.min(n, i2 + 8); j++) {
        var f = word.slice(i2, j), ms = FORMS[f];
        if (!ms) continue;
        var kinds = ms.map(function (m) { return m.k; });
        var cost = 1 + (f.length === 1 ? 1.5 : 0) - (kinds.indexOf('root') >= 0 ? 0.3 : 0);
        if (kinds.every(function (k) { return k === 'pre'; }) && !onlyPre) cost += 1.5;
        if (kinds.every(function (k) { return k === 'suf'; }) && i2 === 0) cost += 3;
        relax(i2, j, cost, { f: f, ms: ms });
      }
    }
    var segs = [];
    best[n].segs.forEach(function (s) {
      var last = segs[segs.length - 1];
      if (!s.ms && last && !last.ms) last.f += s.f; else segs.push({ f: s.f, ms: s.ms });
    });
    return { word: word, known: null, segs: segs };
  }

  function splitHTML(raw) {
    var r = split(raw);
    if (!r) return '<p class="miss">输入一个英文单词，只认 a–z 字母。</p>';
    var allUnknown = r.segs.every(function (s) { return !s.ms; });
    if (allUnknown) return '<p class="miss">字盘里没有能对上 <b lang="en">' + esc(r.word) + '</b> 的字模。</p>';
    var chips = r.segs.map(function (s) {
      if (!s.ms) return '<span class="sort sort-root is-static is-small is-unknown" aria-label="' + esc(s.f) + '，不认识"><span class="face">' + esc(s.f) + '</span><span class="gl">？</span></span>';
      var glosses = [];
      s.ms.forEach(function (m) { if (glosses.indexOf(m.g) < 0) glosses.push(m.g); });
      return sortHTML(s.ms[0], { tag: 'span', gloss: true, cls: 'is-small', glossText: glosses.join(' / ') });
    }).join('<span class="plus" aria-hidden="true">+</span>');
    var lit = r.segs.map(function (s) {
      if (!s.ms) return '？';
      var g = [];
      s.ms.forEach(function (m) { if (g.indexOf(m.g) < 0) g.push(m.g); });
      return g.join('/');
    }).join(' + ');
    var h = '<div class="formula">' + chips + '</div>';
    if (r.known) {
      h += '<p class="hit">词库里就有这个词：' + esc(r.known.zh) + '（字面：' + esc(r.known.lit) + '）</p>';
    } else {
      h += '<p class="miss">字面拼起来大致是「' + esc(lit) + '」。这是机械拆分，只能当猜词线索，最终意思以词典为准。</p>';
    }
    return h;
  }

  /* ================= 校样：墨色即记忆 ================= */

  var proofDays = 0;
  var proofPicked = null;

  function renderProof() {
    var root = $('#view-proof');
    root.innerHTML =
      '<div class="view-head"><h2>校样</h2><p>词库里的 170 个词按词根排在这张校样上。学过的词印着墨，墨色越淡，越可能已经忘了；没印墨的凹痕是还没学的词。</p></div>' +
      '<div class="proof-tools">' +
      '<div class="timeline"><label for="proof-days">把时间往后推，看看不复习的话墨色会褪成什么样</label>' +
      '<input type="range" id="proof-days" min="0" max="60" step="1" value="' + proofDays + '">' +
      '<output id="proof-days-out" for="proof-days"></output></div>' +
      '<dl class="proof-stats">' +
      '<div><dt>墨色清晰</dt><dd id="st-clear">0</dd></div>' +
      '<div><dt>开始褪色</dt><dd id="st-fading">0</dd></div>' +
      '<div><dt>快看不清</dt><dd id="st-faint">0</dd></div>' +
      '<div><dt>还没学</dt><dd id="st-blank">0</dd></div></dl>' +
      '<div class="proof-cta" id="proof-cta"></div>' +
      '</div>' +
      '<div class="sheet" id="sheet">' + FAMS.map(function (fam) {
        return '<div class="fam-row"><div class="fam-root"><b lang="en">' + esc(fam.forms.join(' / ')) + '</b><span>' + esc(fam.g) + '</span></div>' +
          '<div class="fam-words">' + fam.words.map(function (x) { return wordChip(x, Date.now(), 'button'); }).join('') + '</div></div>';
      }).join('') +
      '<div class="sheet-foot"><span>墨色按遗忘曲线计算：刚排完是满墨，掉到九成就该重印。</span>' +
      (S.found.length ? '<span>† 你在字盘里自己拼出来的词</span>' : '') + '</div></div>' +
      '<div class="detail" id="proof-detail" aria-live="polite"><span class="muted">点校样上的任何一个词，看它的墨色和下次重印时间。</span></div>';
    $$('#sheet button.w').forEach(function (b) { b.type = 'button'; });
    updateProof();
    if (proofPicked) showDetail(proofPicked);
  }

  function updateProof() {
    var at = Date.now() + proofDays * DAY;
    var counts = { clear: 0, fading: 0, faint: 0, blank: 0 };
    $$('#sheet .w').forEach(function (el) {
      var k = el.getAttribute('data-w');
      var c = S.cards[k];
      el.classList.remove('wear-1', 'wear-2', 'wear-3');
      if (!c) { counts.blank++; return; }
      var r = retr(c, at);
      var st = inkStyle(r);
      el.style.setProperty('--pct', st.pct + '%');
      el.classList.add('wear-' + st.wear);
      counts[r >= 0.9 ? 'clear' : r >= 0.7 ? 'fading' : 'faint']++;
    });
    Object.keys(counts).forEach(function (k) { $('#st-' + k).textContent = counts[k]; });
    $('#proof-days-out').textContent = proofDays === 0 ? '今天' : proofDays + ' 天后';
    var dueNow = dueList(Date.now()).length;
    $('#proof-cta').innerHTML = dueNow
      ? '<button type="button" class="btn-press" id="reprint">重印 ' + dueNow + ' 个褪色的词</button><p>重印就是凭记忆再排一遍，排顺了墨色会回到满墨，而且褪得更慢。</p>'
      : '<p>' + (Object.keys(S.cards).length ? '眼下没有需要重印的词。' : '还没印过任何词。去“排字”排第一个词，它就会出现在这里。') + '</p>';
    if (proofPicked) showDetail(proofPicked);
  }

  function showDetail(k) {
    proofPicked = k;
    var x = W[k], c = S.cards[k];
    var at = Date.now() + proofDays * DAY;
    $$('#sheet .w.is-picked').forEach(function (el) { el.classList.remove('is-picked'); });
    var el = $('#sheet .w[data-w="' + k + '"]');
    if (el) el.classList.add('is-picked');
    var h = '<b lang="en">' + esc(x.w) + '</b>' + speakBtn(x.w) + '<span>' + esc(x.zh) + '</span>';
    if (!c) h += '<span class="muted">还没学。字面：' + esc(x.lit) + '</span>';
    else {
      var r = retr(c, at);
      h += '<span class="muted">' + (proofDays ? proofDays + ' 天后' : '现在') + '墨色 ' + Math.round(r * 100) + '%，' +
        (r < 0.9 ? '该重印了' : '下次重印' + fmtWait(dueAt(c) - Date.now())) + '。已排 ' + c.reps + ' 次' +
        (c.lapses ? '，没排顺 ' + c.lapses + ' 次' : '') + '。</span>';
    }
    $('#proof-detail').innerHTML = h;
  }

  $('#view-proof').addEventListener('input', function (e) {
    if (e.target.id === 'proof-days') { proofDays = +e.target.value; updateProof(); }
  });
  $('#view-proof').addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (!t) return;
    if (t.hasAttribute('data-w')) return showDetail(t.getAttribute('data-w'));
    if (t.id === 'reprint') { buildSession('review'); show('compose'); var f = $('#view-compose .tray-sorts button.sort'); if (f) f.focus(); }
  });

  /* ================= 全局 ================= */

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-say],[data-go]');
    if (!t) return;
    if (t.hasAttribute('data-say')) speak(t.getAttribute('data-say'));
    if (t.hasAttribute('data-go')) show(t.getAttribute('data-go'));
  });

  $('.tabs').addEventListener('click', function (e) {
    var t = e.target.closest('.tab');
    if (t) show(t.id.replace('tab-', ''));
  });
  $('.tabs').addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    var i = VIEWS.indexOf(view) + (e.key === 'ArrowRight' ? 1 : -1);
    var v = VIEWS[(i + VIEWS.length) % VIEWS.length];
    show(v); $('#tab-' + v).focus();
  });

  function syncSettings() {
    $('#set-new').value = String(S.newPerDay);
    $('#set-speak').checked = S.autoSpeak;
    $('#set-speak').closest('label').hidden = !canSpeak;
  }
  $('#set-new').addEventListener('change', function (e) {
    S.newPerDay = +e.target.value; save();
    if (session && session.mode === 'daily' && (!item || !session.results.length)) { buildSession('daily'); if (view === 'compose') renderCompose(); }
    updateBadge();
  });
  $('#set-speak').addEventListener('change', function (e) { S.autoSpeak = e.target.checked; save(); });
  $('#reset').addEventListener('click', function () { $('#reset-confirm').hidden = false; $('#reset').hidden = true; $('#reset-yes').focus(); });
  $('#reset-no').addEventListener('click', function () { $('#reset-confirm').hidden = true; $('#reset').hidden = false; $('#reset').focus(); });
  $('#reset-yes').addEventListener('click', function () {
    var keep = { newPerDay: S.newPerDay, autoSpeak: S.autoSpeak };
    S = freshState(); S.newPerDay = keep.newPerDay; S.autoSpeak = keep.autoSpeak;
    save();
    $('#reset-confirm').hidden = true; $('#reset').hidden = false;
    onStateReplaced();
    announce('进度已清空');
  });

  function onStateReplaced() {
    session = null; item = null; proofPicked = null;
    syncSettings();
    show(view);
  }

  window.addEventListener('storage', function (e) {
    if (e.key === KEY && e.newValue) { try { S = normalize(JSON.parse(e.newValue)); onStateReplaced(); } catch (err) { /* 忽略 */ } }
  });

  syncSettings();
  var start = (location.hash || '').replace('#', '');
  show(VIEWS.indexOf(start) >= 0 ? start : 'compose');
  setInterval(function () { updateBadge(); if (view === 'proof') updateProof(); }, 60000);
  cloud.connect();
})();
