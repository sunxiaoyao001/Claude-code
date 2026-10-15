/* =============================================================================
 * 真实照片清单（Shot List）
 * -----------------------------------------------------------------------------
 * 全部来自 Google Open Images 数据集（原图在 Flickr），授权 CC BY 2.0：可商用，必须署名。
 * 完整署名见 assets/photos/CREDITS.md，发布时请贴到视频简介。
 *   focus  画面焦点（归一化 0~1）    face  人脸框（归一化 x, y, w, h），无人脸的照片为 null
 * ========================================================================== */
window.FX = window.FX || {};

FX.PHOTOS = {
  sleeperMan: {
    file: 's01-sleeper-man.jpg', shot: '枕头上熟睡的男人（开场）', query: 'man sleeping pillow',
    focus: { x: 0.52, y: 0.45 }, face: { x: 0.342, y: 0.154, w: 0.361, h: 0.592 }, min: 1000,
    credit: 'Travis Wise ·「Sleeping」· https://www.flickr.com/photos/photographingtravis/16567853763 · CC BY 2.0',
  },
  sleeperWoman: {
    file: 's02-sleeper-woman.jpg', shot: '埋在白色枕头里熟睡的女人（周末补觉）', query: 'woman asleep white pillow',
    focus: { x: 0.5, y: 0.52 }, face: { x: 0.328, y: 0.408, w: 0.342, h: 0.294 }, min: 1000,
    credit: 'Richard Riley ·「Lianne Asleep」· https://www.flickr.com/photos/rileyroxx/151984493 · CC BY 2.0',
  },
  commuter: {
    file: 's03-commuter.jpg', shot: '火车座位上闭眼打盹的乘客（竖构图）', query: 'woman asleep on train',
    focus: { x: 0.48, y: 0.45 }, face: { x: 0.342, y: 0.321, w: 0.273, h: 0.243 }, min: 1000,
    credit: 'Ken Mayer ·「Ivana Barbić in transit」· https://www.flickr.com/photos/ken_mayer/3746422256 · CC BY 2.0',
  },
  trainGroup: {
    file: 's04-train-group.jpg', shot: '靠着彼此睡着的乘客', query: 'people sleeping on bus',
    focus: { x: 0.45, y: 0.45 }, face: { x: 0.43, y: 0.16, w: 0.2, h: 0.42 }, min: 1000,
    credit: 'Unión Europea en Perú ·「DSC_8156」· https://www.flickr.com/photos/ueenperu/15658698430 · CC BY 2.0',
  },
  earbuds: {
    file: 's05-earbuds.jpg', shot: '戴着耳机趴着睡着的男人', query: 'man asleep earphones',
    focus: { x: 0.58, y: 0.45 }, face: null, min: 1000,
    credit: 'Paul Downey ·「WS-Addr 21:00-23:00 Mondays」· https://www.flickr.com/photos/psd/19187470 · CC BY 2.0',
  },
  yawn: {
    file: 's06-yawn.jpg', shot: '打哈欠的男人（特写）', query: 'man yawning close up',
    focus: { x: 0.42, y: 0.5 }, face: { x: 0.08, y: 0.05, w: 0.78, h: 0.95 }, min: 1000,
    credit: 'William Brawley ·「Day 302, Project 365 - 8.22.10」· https://www.flickr.com/photos/williambrawley/4924986163 · CC BY 2.0',
  },
  coffee: {
    file: 's07-coffee.jpg', shot: '黑白的拿铁咖啡（竖构图）', query: 'latte art black and white',
    focus: { x: 0.45, y: 0.42 }, face: null, min: 1000,
    credit: 'Irene_07 ·「Untitled」· https://www.flickr.com/photos/ire_/17575965765 · CC BY 2.0',
  },
  phoneNight: {
    file: 's08-phone-night.jpg', shot: '夜里被手机屏幕照亮的脸', query: 'face lit by phone at night',
    focus: { x: 0.42, y: 0.42 }, face: { x: 0.36, y: 0.12, w: 0.22, h: 0.42 }, min: 1000,
    credit: 'Timothy Vollmer ·「nina」· https://www.flickr.com/photos/sixteenmilesofstring/3549833049 · CC BY 2.0',
  },
  phoneWarm: {
    file: 's09-phone-warm.jpg', shot: '暗处看手机的人（背影）', query: 'person looking at phone dark',
    focus: { x: 0.45, y: 0.55 }, face: null, min: 1000,
    credit: 'Cision Global ·「Demand Success 2014 Conference」· https://www.flickr.com/photos/vocus/14257422739 · CC BY 2.0',
  },
  alarm: {
    file: 's10-alarm.jpg', shot: '复古闹钟（黑白）', query: 'vintage alarm clock dark',
    focus: { x: 0.42, y: 0.55 }, face: null, min: 1000,
    credit: 'Omer Unlu ·「Old Clock」· https://www.flickr.com/photos/55293400@N07/15564061004 · CC BY 2.0',
  },
  deskNap: {
    file: 's11-desk-nap.jpg', shot: '戴着"鸵鸟枕"趴在办公桌上午睡', query: 'office desk nap',
    focus: { x: 0.36, y: 0.58 }, face: null, min: 800,
    credit: 'Day Donaldson ·「Ostrich Pillow」· https://www.flickr.com/photos/thespeakernews/15266929048 · CC BY 2.0',
  },
  fogStreet: {
    file: 's12-fog-street.jpg', shot: '起雾的夜晚，月亮和一排路灯', query: 'foggy night street lights moon',
    focus: { x: 0.45, y: 0.42 }, face: null, min: 1000,
    credit: 'abdallahh ·「Brouillard à Montréal」· https://www.flickr.com/photos/husseinabdallah/16944151329 · CC BY 2.0',
  },
  nightTrain: {
    file: 's13-night-train.jpg', shot: '深夜的车厢', query: 'night train interior passengers',
    focus: { x: 0.6, y: 0.6 }, face: null, min: 1000,
    credit: 'JohnPickenPhoto ·「El reflections」· https://www.flickr.com/photos/picken/254572907 · CC BY 2.0',
  },
  dawn: {
    file: 's14-dawn.jpg', shot: '黎明的云层与日出光芒', query: 'sunrise clouds rays',
    focus: { x: 0.52, y: 0.5 }, face: null, min: 1000,
    credit: 'MangAndri Kasep ·「September ceria」· https://www.flickr.com/photos/andri_suprihadi/2869454344 · CC BY 2.0',
  },
  moon: {
    file: 's15-moon.jpg', shot: '夜空中的一弯新月', query: 'crescent moon night sky',
    focus: { x: 0.52, y: 0.5 }, face: null, min: 1000,
    credit: 'jeffrey montes ·「_DSC9075.jpg」· https://www.flickr.com/photos/jm-photography/14828951480/ · CC BY 2.0',
  },
};
