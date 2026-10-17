// 时间线：唯一的时间来源。镜头、字幕、跟随音符的事件都从这里取时间。
// 现在是按曲子结构预排的占位时间；拿到音频后由 tools/analyze.py 生成 cues.json，load() 用真实起音点覆盖。
export let DUR = 92.4;

// 段落边界（秒）
export const T = {
  hook: 0,      // 钩子：琴键 + 五线谱
  inv: 7.6,     // 第一幕 邀约：俯视剧本
  read: 13.6,   //           侧影读剧本
  cond: 21.5,   // 第二幕 条件
  seal: 26.6,   //           「请」字印落下
  isle: 28.7,   // 第三幕 小岛（印章变落日）
  pan: 35.1,    //           横移到铁丝网后的人
  night: 42.0,  // 第四幕 作曲之夜
  fly: 47.6,    //           音符飞出窗外变成雪
  cell: 54.0,   // 第五幕 1946 牢房
  climax: 60.4, //           高潮第一个重和弦
  years: 67.2,  // 第六幕 四十年
  nhk: 72.8,    //           2022 NHK 509
  end: 80.4,    // 第七幕 尾声
};

// 字幕（旁白）。t = [入, 出]
export const CAPS = {
  c1: { text: '这首曲子，是一个条件换来的', t: [0.6, 6.9] },
  c2: { text: '导演大岛渚，请他演一部战争片', t: [7.8, 13.4] },
  c3: { text: '他从没演过戏，只提了一个条件', t: [14.2, 20.0] },
  c4: { text: '「让我来写配乐。」', t: [21.9, 26.4] },
  c5: { text: '南太平洋的小岛上，他穿上了军装', t: [29.4, 35.0] },
  c6: { text: '和大卫·鲍伊，演一对互相吸引的敌人', t: [35.4, 41.6] },
  c7: { text: '这是他写的第一部电影配乐', t: [42.6, 47.6] },
  c8: { text: '大岛渚说：把自己当成世野井来写', t: [47.8, 53.6] },
  c9: { text: '1946年，即将被处决的原军曹笑着说', t: [54.4, 60.3] },
  c10: { text: 'Merry Christmas, Mr. Lawrence.', t: [60.4, 66.9] },
  c11: { text: '这首曲子，他弹了将近四十年', t: [67.6, 72.7] },
  c12: { text: '2022年，病中的他录下最后一场演奏', t: [73.4, 79.6] },
};

// 音符起音点。占位：开场动机按八分音符，主旋律按四分音符（拿到音频后由真实起音点替换）
export const CUE = {
  motif: [],     // 开场动机每个音
  melody: [],    // 主旋律每个音
  chords: [],    // 重和弦（高潮）
};
(function placeholder() {
  for (let t = 0.05; t < 7.6; t += 0.36) CUE.motif.push(+t.toFixed(3));
  for (let t = 7.6; t < 80.4; t += 0.72) CUE.melody.push(+t.toFixed(3));
  for (let t = 60.4; t < 67; t += 1.44) CUE.chords.push(+t.toFixed(3));
})();

// cues.json（tools/analyze.py 的输出）存在就用它
export async function load() {
  try {
    const r = await fetch('cues.json');
    if (!r.ok) return;
    const j = await r.json();
    if (j.dur) DUR = j.dur;
    for (const k of Object.keys(T)) if (j.T && j.T[k] != null) T[k] = j.T[k];
    for (const k of Object.keys(CUE)) if (j.cue && j.cue[k]) CUE[k] = j.cue[k];
    for (const k of Object.keys(CAPS)) if (j.caps && j.caps[k]) CAPS[k].t = j.caps[k];
  } catch {}
}

// 某段时间里的音符
export const notesIn = (arr, a, b) => arr.filter(x => x >= a && x < b);
// 最近一个已经发生的音符：返回 [序号, 距今秒数]
export function lastNote(arr, t) {
  let i = -1; for (let k = 0; k < arr.length; k++) { if (arr[k] <= t) i = k; else break; }
  return i < 0 ? [-1, 1e9] : [i, t - arr[i]];
}
