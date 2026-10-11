'use strict';
// 游戏数据：物理参数、角色、升级、存档

const PHYS = {
  gravity: 2200,
  fallMul: 1.12,
  maxFall: 860,
  run: 255,
  accelGround: 2600,
  decelGround: 3200,
  accelAir: 1800,
  decelAir: 1000,
  iceAccel: 620,
  iceDecel: 200,
  jumpV: 800,
  airJumpV: 700,
  jumpCut: 0.45,
  coyote: 0.1,
  buffer: 0.12,
  springV: 1180,
  orbV: 900,
  stompV: 560,
  stompHoldV: 820,
  dashV: 760,
  dashTime: 0.16,
  dashCool: 0.3,
  glideFall: 115,
  wallSlide: 150,
  wallJumpVX: 330,
  wallJumpVY: 760,
  poundV: 1150,
  bodyW: 22,
  bodyH: 26,
};

const CHARACTERS = [
  {
    id: 'square', name: '小方', shape: 'square', color: '#F25F5C',
    ability: 'double', abilityName: '二段跳',
    desc: '在空中再按一次跳跃，可以再跳一次。稳重可靠的老朋友。',
    unlock: null,
  },
  {
    id: 'circle', name: '阿圆', shape: 'circle', color: '#21B8A8',
    ability: 'glide', abilityName: '滑翔', speed: 285,
    desc: '下落时按住跳跃键，就能慢慢飘落。跑得也比别人快一点。',
    unlock: { coins: 200 },
  },
  {
    id: 'triangle', name: '尖尖', shape: 'triangle', color: '#9B5DE5',
    ability: 'dash', abilityName: '冲刺',
    desc: '按冲刺键向前猛冲，能撞碎裂纹砖、撞飞敌人，连带刺的也不怕。',
    unlock: { coins: 400, gems: 6 },
  },
  {
    id: 'diamond', name: '小菱', shape: 'diamond', color: '#EE5DAF',
    ability: 'wall', abilityName: '蹬墙跳',
    desc: '贴着墙会慢慢滑下来，这时按跳跃可以蹬墙跳起。',
    unlock: { coins: 600, gems: 15 },
  },
  {
    id: 'star', name: '星星', shape: 'star', color: '#F7C948',
    ability: 'star', abilityName: '全能',
    desc: '二段跳加冲刺，什么都会。是夜空里最亮的那一颗。',
    unlock: { boss: '4-B' },
  },
];
const CHAR_BY_ID = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));

const ABILITY_SET = {
  double: { double: true },
  glide: { glide: true },
  dash: { dash: true },
  wall: { wall: true },
  star: { double: true, dash: true },
};

const UPGRADES = [
  { id: 'heart', name: '生命上限', icon: 'heart', costs: [150, 400], desc: (l) => `生命上限 +1。当前 ${3 + l} 颗心。` },
  { id: 'magnet', name: '金币磁铁', icon: 'magnet', costs: [100, 250, 500], desc: (l) => (l ? `自动吸附 ${[0, 2, 3, 5][l]} 格内的金币。` : '自动吸附身边的金币，等级越高范围越大。') },
  { id: 'shield', name: '泡泡护盾', icon: 'shield', costs: [350], desc: () => '每次出发和复活时自带一层护盾，能挡住一次伤害。' },
  { id: 'greed', name: '招财', icon: 'coin', costs: [200, 450, 800], desc: (l) => (l ? `通关时金币收益 +${l * 20}%。` : '通关时金币收益提高，每级 +20%。') },
  { id: 'insure', name: '保险', icon: 'umbrella', costs: [150, 350], desc: (l) => `倒下时丢失的金币：${[30, 15, 0][l]}%。` },
];
const UPG_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));

const Save = {
  KEY: 'fangyuan.save.v1',
  data: null,

  defaults() {
    return {
      v: 1,
      coins: 0,
      char: 'square',
      owned: { square: true },
      upg: { heart: 0, magnet: 0, shield: 0, greed: 0, insure: 0 },
      levels: {},
      settings: { music: 0.6, sfx: 0.8, shake: true, timer: true, touch: 'auto' },
      stats: { deaths: 0, coinsEarned: 0, enemies: 0, playTime: 0, jumps: 0, clears: 0 },
      cleared: false,
      seenEnding: false,
    };
  },

  load(fromHot) {
    const base = this.defaults();
    let raw = fromHot || null;
    if (!raw) {
      const s = Store.get(this.KEY);
      if (s) { try { raw = JSON.parse(s); } catch (e) { raw = null; } }
    }
    if (raw && typeof raw === 'object') {
      for (const k of Object.keys(base)) {
        if (raw[k] === undefined) continue;
        if (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) base[k] = Object.assign(base[k], raw[k]);
        else base[k] = raw[k];
      }
    }
    if (!CHAR_BY_ID[base.char] || !base.owned[base.char]) base.char = 'square';
    this.data = base;
    return base;
  },

  save() {
    try { Store.set(this.KEY, JSON.stringify(this.data)); } catch (e) { /* 忽略 */ }
  },

  reset() {
    this.data = this.defaults();
    this.save();
  },

  lvl(id) {
    let l = this.data.levels[id];
    if (!l) l = this.data.levels[id] = { done: false, gems: [false, false, false], best: null, deaths: 0 };
    return l;
  },

  gemCount() {
    let n = 0;
    for (const id in this.data.levels) for (const g of this.data.levels[id].gems || []) if (g) n++;
    return n;
  },

  doneCount() {
    let n = 0;
    for (const L of LEVELS) if (this.data.levels[L.id] && this.data.levels[L.id].done) n++;
    return n;
  },

  isDone(id) {
    return !!(this.data.levels[id] && this.data.levels[id].done);
  },

  isUnlocked(id) {
    const i = LEVELS.findIndex((l) => l.id === id);
    if (i <= 0) return true;
    return this.isDone(LEVELS[i - 1].id);
  },

  worldUnlocked(wi) {
    const first = LEVELS.find((l) => l.world === wi);
    return first ? this.isUnlocked(first.id) : false;
  },

  charState(ch) {
    if (this.data.owned[ch.id]) return { owned: true };
    const u = ch.unlock || {};
    const gems = this.gemCount();
    if (u.boss && !this.isDone(u.boss)) return { owned: false, locked: true, reason: '击败最终首领后加入' };
    if (u.gems && gems < u.gems) return { owned: false, locked: true, reason: `需要 ${u.gems} 颗宝石（现有 ${gems}）` };
    if (u.coins) return { owned: false, cost: u.coins, affordable: this.data.coins >= u.coins };
    return { owned: false, cost: 0, affordable: true };
  },

  maxHearts() {
    return 3 + (this.data.upg.heart || 0);
  },
};

if (typeof module !== 'undefined') module.exports = { PHYS, CHARACTERS, ABILITY_SET };
