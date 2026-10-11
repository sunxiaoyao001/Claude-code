'use strict';
// 输入：键盘 / 手柄 / 触屏，统一成动作

const ACTIONS = ['left', 'right', 'up', 'down', 'jump', 'ability', 'pause', 'back'];

const KEYMAP = {
  ArrowLeft: ['left'], KeyA: ['left'],
  ArrowRight: ['right'], KeyD: ['right'],
  ArrowUp: ['up', 'jump'], KeyW: ['up', 'jump'],
  ArrowDown: ['down'], KeyS: ['down'],
  Space: ['jump'], KeyZ: ['jump'], KeyK: ['jump'], KeyC: ['jump'],
  ShiftLeft: ['ability'], ShiftRight: ['ability'], KeyX: ['ability'], KeyJ: ['ability'], KeyL: ['ability'],
  Escape: ['pause', 'back'], KeyP: ['pause'],
};

const Input = {
  keys: new Set(),
  hits: {},
  down: {},
  pressed: {},
  prevDown: {},
  padPressed: {},
  prevPad: {},
  touch: {},
  device: 'keyboard', // keyboard | touch | pad
  gameCapture: false, // 游戏进行中时拦截按键默认行为

  init() {
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) this.device = 'touch';
    window.addEventListener('keydown', (e) => {
      const acts = KEYMAP[e.code];
      if (!acts) return;
      this.device = 'keyboard';
      if (this.gameCapture) e.preventDefault();
      if (!e.repeat) for (const a of acts) this.hits[a] = true;
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => {
      if (!KEYMAP[e.code]) return;
      this.keys.delete(e.code);
    });
    window.addEventListener('blur', () => this.clear());
  },

  clear() {
    this.keys.clear();
    this.hits = {};
    this.touch = {};
  },

  poll() {
    const d = {};
    for (const code of this.keys) for (const a of KEYMAP[code]) d[a] = true;
    for (const a in this.touch) if (this.touch[a]) d[a] = true;

    // 手柄
    const pd = {};
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p || !p.connected) continue;
      const b = (i) => p.buttons[i] && p.buttons[i].pressed;
      const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
      if (b(14) || ax < -0.45) pd.left = true;
      if (b(15) || ax > 0.45) pd.right = true;
      if (b(12) || ay < -0.6) pd.up = true;
      if (b(13) || ay > 0.6) pd.down = true;
      if (b(0) || b(3)) pd.jump = true;
      if (b(1) || b(2) || b(5) || b(7)) pd.ability = true;
      if (b(9)) pd.pause = true;
      if (b(1)) pd.back = true;
    }
    let anyPad = false;
    for (const a in pd) { d[a] = true; anyPad = true; }
    if (anyPad) this.device = 'pad';

    const p = {}, pp = {};
    for (const a of ACTIONS) {
      p[a] = !!this.hits[a] || (!!d[a] && !this.prevDown[a]);
      pp[a] = !!pd[a] && !this.prevPad[a];
    }
    this.prevDown = d;
    this.prevPad = pd;
    this.hits = {};
    this.down = d;
    this.pressed = p;
    this.padPressed = pp;
  },
};
