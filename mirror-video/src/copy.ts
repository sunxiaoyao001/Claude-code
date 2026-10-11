// All on-screen copy lives here so fonts can be preloaded for exactly these glyphs.

/** scene boundaries (global frames @30fps) */
export const T = {
  hook: [0, 175],
  title: [165, 340],
  flip: [330, 1110],
  tunnel: [1100, 1520],
  brain: [1510, 2440],
  beauty: [2430, 3190],
  camera: [3180, 4110],
  end: [4100, 4620],
} as const;

export const TOTAL = 4620;

export type Cue = {from: number; to: number; text: string; cite?: string};

// 「」marks the highlighted phrase in a cue
export const CUES: Cue[] = [
  // 03 flip
  {from: 352, to: 486, text: '镜子给你的，是一张「左右颠倒」的脸'},
  {from: 496, to: 640, text: '镜子里这颗痣在右边，照片里它却「跑到了左边」'},
  {from: 654, to: 806, text: '可人脸，从来都「不是完全对称」的'},
  {from: 818, to: 966, text: '左脸拼左脸、右脸拼右脸——几乎是两个人'},
  {from: 978, to: 1100, text: '翻转之后的脸，和真实的你「并不一样」'},
  // 04 tunnel
  {from: 1112, to: 1262, text: '而你每天看得最多的，恰恰是镜子里那张「反脸」'},
  {from: 1272, to: 1392, text: '一年下来，少说几千次'},
  {from: 1402, to: 1512, text: '大脑把它存成了「我」的标准模板'},
  // 05 brain
  {from: 1530, to: 1670, text: '光进入眼睛，在视网膜上投下一个「倒立」的像'},
  {from: 1680, to: 1826, text: '视神经把信号送往大脑后方的「视觉皮层」'},
  {from: 1836, to: 1980, text: '再一路传到专门认脸的「梭状回面孔区」'},
  {from: 1990, to: 2110, text: '照片里的脸，和模板对不上——「这不像我」'},
  {from: 2120, to: 2226, text: '镜像版却严丝合缝——「这才是我」'},
  {from: 2236, to: 2346, text: '你偏爱镜像版，朋友却偏爱照片版', cite: 'Mita, Dermer & Knight · 1977'},
  {from: 2352, to: 2436, text: '这叫「曝光效应」：越熟悉，越顺眼'},
  // 06 beauty
  {from: 2446, to: 2590, text: '更神奇的是，大脑还会悄悄给你「美颜」'},
  {from: 2600, to: 2730, text: '更对称一点，更光滑一点，气色更好一点'},
  {from: 2742, to: 2900, text: '实验中，人们更容易把「美化版」认成真实的自己', cite: 'Epley & Whitchurch · 2008'},
  {from: 2910, to: 3046, text: '镜子里的你，是被大脑「精修」过的你'},
  {from: 3056, to: 3186, text: '而相机，没有这层滤镜'},
  // 07 camera
  {from: 3200, to: 3346, text: '相机只有一只眼，冷冰冰地「定格」一瞬间'},
  {from: 3356, to: 3500, text: '自拍时，镜头离脸只有 30 厘米左右'},
  {from: 3510, to: 3650, text: '近距离透视，会把鼻子拉宽约「30%」', cite: 'Ward et al. · JAMA Facial Plast Surg · 2018'},
  {from: 3660, to: 3820, text: '镜中的像远在「两倍距离」外，双眼还在立体地看'},
  {from: 3830, to: 3966, text: '镜子是连续的画面，你会本能地摆出最好看的角度'},
  {from: 3976, to: 4106, text: '照片，只是随机抽中的「那一帧」'},
  // 08 end
  {from: 4120, to: 4250, text: '所以，镜子和照片，都不是完整的你'},
  {from: 4260, to: 4396, text: '别人眼中的你，是「动态的、立体的、鲜活的」'},
  {from: 4406, to: 4486, text: '小技巧：自拍后「水平翻转」一下，立刻顺眼'},
];

export const LABELS = {
  hookMirror: '镜子里的你',
  hookPhoto: '照片里的你',
  hookQ1: '同一张脸',
  hookQ2: '为什么镜子里的更好看？',
  title1: '为什么镜子里的你',
  title2: '比照片里好看10倍？',
  titleSub: '大脑的「内置美颜」',
  ch: ['左右翻转', '熟悉的反脸', '大脑在认脸', '内置美颜', '相机的真相', '真正的你'],
  real: '真实的你',
  mirrored: '镜像的你',
  leftLeft: '左脸 × 2',
  rightRight: '右脸 × 2',
  original: '原本的脸',
  counterUnit: '次',
  perDay: '每天照镜子',
  perYear: '一年',
  v1: 'V1 初级视觉皮层',
  ffa: 'FFA 梭状回面孔区',
  lgn: '外侧膝状体',
  chiasm: '视交叉',
  retina: '视网膜',
  template: '记忆模板',
  match: '吻合',
  mismatch: '不吻合',
  you: '你自己的选择',
  friend: '朋友的选择',
  mirrorVer: '镜像版',
  trueVer: '照片版',
  exposure: '曝光效应',
  passEdge: '轮廓',
  passSym: '对称',
  passSmooth: '平滑',
  passGlow: '光感',
  pickSelf: '「这是我」',
  real0: '原图',
  dist30: '30 cm',
  dist150: '150 cm',
  nose: '鼻宽 +30%',
  virtualImg: '镜中像',
  doubleDist: '2 × 距离',
  twoEyes: '双眼',
  oneLens: '单镜头',
  frameRandom: '随机一帧',
  inMirror: '镜子里的你',
  inPhoto: '照片里的你',
  inOthers: '别人眼中的你',
  ctaQ: '你更喜欢镜子里的自己，\n还是照片里的自己？',
  ctaA: 'A  镜子里的我',
  ctaB: 'B  照片里的我',
  ctaHint: '评论区告诉我',
  credit: 'Head scan: Lee Perry-Smith / Infinite-Realities (CC BY 3.0)',
};

export const ALL_TEXT = [
  ...CUES.map((c) => c.text + (c.cite ?? '')),
  ...Object.values(LABELS).flat(),
].join('');
