/**
 * 最后通牒博弈：理性解 + 实验数据
 * ------------------------------------------------------------
 *  理性解（子博弈完美均衡）：回应者接受任何正数 → 提议者只给最小单位 1 元。
 *  实验数据均来自公开文献，示意图（直方图、拒绝率曲线）在画面上标注“示意”。
 *  scripts/verify-math.ts 会打印校验。
 */

export const POT = 100;
export const UNIT = 1;

/** 回应者的理性选择：接受（得到 offer）还是拒绝（得到 0） */
export const responderAccepts = (offer: number) => offer > 0;

/** 逆向归纳：提议者给出能被接受的最小金额 */
export const rationalOffer = () => {
  for (let x = 0; x <= POT; x += UNIT) if (responderAccepts(x)) return x;
  return POT;
};

/* ---------------- 文献数据 ---------------- */

/** Güth, Schmittberger & Schwarze (1982)：最常见 50%，新手平均 37% */
export const GUTH_1982 = {modal: 50, meanInexperienced: 37};

/** 多项实验的典型结果：出价多在 30%～50%；低于约 20% 的出价，约一半被拒（Camerer 2003 等综述、Knight 2012 复现） */
export const TYPICAL = {offerLow: 30, offerHigh: 50, rejectBelow: 20, rejectShare: 0.5};

/** Henrich 等（2001 / 2005），15 个小规模社会 */
export const HENRICH = {
  machiguenga: {low: 15, high: 25}, // 秘鲁亚马逊，通常只给 15%～25%，几乎都被接受
  lamalera: {mean: 58, equalSplit: 63}, // 印尼捕鲸人，平均 58%，63% 的人五五开
};

/** Engel (2011) 独裁者博弈元分析：100 多篇论文中的 616 组实验、20,813 名“独裁者” */
export const ENGEL_2011 = {treatments: 616, dictators: 20813, mean: 28.3, giveNothing: 36, equalSplit: 17};

/* ---------------- 示意分布（画面标注“示意”） ---------------- */

/** 出价分布（各区间占提议者的百分比），形状依据上面的典型结果：众数 50%，平均约三四成 */
export const OFFER_BINS = [
  {label: '0~10', mid: 5, share: 3, reject: 0.65},
  {label: '10~20', mid: 15, share: 7, reject: 0.5},
  {label: '20~30', mid: 25, share: 12, reject: 0.3},
  {label: '30~40', mid: 35, share: 23, reject: 0.12},
  {label: '40~50', mid: 45, share: 15, reject: 0.05},
  {label: '50', mid: 50, share: 35, reject: 0.01},
  {label: '>50', mid: 55, share: 5, reject: 0.03},
];

export const binMean = () => OFFER_BINS.reduce((a, b) => a + (b.mid * b.share) / 100, 0);
export const binTotal = () => OFFER_BINS.reduce((a, b) => a + b.share, 0);
