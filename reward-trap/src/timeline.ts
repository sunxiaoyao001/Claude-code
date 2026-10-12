import type {Cue} from './components/Subtitles';

export type TransitionKind = 'dissolve' | 'zoom' | 'flash' | 'swipe' | 'cut';
export type SceneId =
  | 'eye'
  | 'bedroom'
  | 'title'
  | 'stat'
  | 'feed'
  | 'brain'
  | 'synapse'
  | 'uncertainty'
  | 'slot'
  | 'algorithm'
  | 'noend'
  | 'brake'
  | 'breakfree'
  | 'outro';

export type SceneDef = {
  id: SceneId;
  dur: number;
  /** transition into the NEXT scene */
  next?: {kind: TransitionKind; dur: number};
  /** narration cues in scene-local frames: [start, end, text] */
  cues: [number, number, string][];
};

// Narration is the only text that carries the story; every line is short enough to read in one glance.
export const SCENES: SceneDef[] = [
  {id: 'eye', dur: 180, next: {kind: 'dissolve', dur: 16}, cues: [[78, 172, '你是不是也这样——']]},
  {
    id: 'bedroom',
    dur: 220,
    next: {kind: 'flash', dur: 14},
    cues: [
      [12, 96, '「再刷一个，就睡。」'],
      [104, 214, '然后，一个小时过去了。'],
    ],
  },
  {id: 'title', dur: 200, next: {kind: 'zoom', dur: 18}, cues: []},
  {
    id: 'stat',
    dur: 250,
    next: {kind: 'swipe', dur: 18},
    cues: [
      [16, 118, '中国短视频用户，人均每天刷 {151} 分钟'],
      [126, 244, '一年加起来，相当于整整 {38} 天'],
    ],
  },
  {
    id: 'feed',
    dur: 450,
    next: {kind: 'zoom', dur: 20},
    cues: [
      [24, 136, '每一次上滑，都是一次{未知}'],
      [146, 262, '可能很无聊，也可能是惊喜'],
      [272, 440, '正是这份「{不确定}」，让你停不下来'],
    ],
  },
  {
    id: 'brain',
    dur: 460,
    next: {kind: 'zoom', dur: 20},
    cues: [
      [22, 142, '答案，藏在大脑深处的{奖励系统}'],
      [152, 296, '期待奖励时，腹侧被盖区会释放{多巴胺}'],
      [306, 452, '沿着神经通路，涌向伏隔核和前额叶'],
    ],
  },
  {
    id: 'synapse',
    dur: 360,
    next: {kind: 'dissolve', dur: 18},
    cues: [
      [20, 146, '多巴胺常被叫做「快乐分子」'],
      [156, 352, '但它真正负责的，其实是「{想要}」'],
    ],
  },
  {
    id: 'uncertainty',
    dur: 470,
    next: {kind: 'flash', dur: 14},
    cues: [
      [14, 112, '神经科学家发现：'],
      [120, 250, '确定的奖励，多巴胺反应平平'],
      [262, 356, '而当奖励「可能有，可能没有」'],
      [362, 464, '多巴胺神经元会{持续兴奋}'],
    ],
  },
  {
    id: 'slot',
    dur: 420,
    next: {kind: 'zoom', dur: 18},
    cues: [
      [20, 150, '这正是老虎机的秘密：{可变奖励}'],
      [160, 290, '你永远不知道，下一次会不会中'],
      [300, 414, '而你的拇指，就是那根{拉杆}'],
    ],
  },
  {
    id: 'algorithm',
    dur: 660,
    next: {kind: 'dissolve', dur: 18},
    cues: [
      [20, 140, '你的每一次停留、重播、点赞、划走'],
      [146, 262, '都在被{算法}记录、计算'],
      [272, 410, '它从海量视频里，挑出最能留住你的那一个'],
      [420, 528, '你越刷，它越懂你'],
      [534, 652, '它越懂你，你越{停不下来}'],
    ],
  },
  {
    id: 'noend',
    dur: 420,
    next: {kind: 'zoom', dur: 18},
    cues: [
      [20, 140, '书有最后一页，剧有片尾'],
      [150, 270, '而短视频，永远有{下一个}'],
      [280, 412, '「无限下滑」的发明者，后来也坦言{后悔}'],
    ],
  },
  {
    id: 'brake',
    dur: 400,
    next: {kind: 'flash', dur: 14},
    cues: [
      [20, 146, '深夜，负责自控的{前额叶}最疲惫'],
      [156, 270, '而奖励系统，从不打烊'],
      [280, 392, '越刷越空虚，却越{停不下来}'],
    ],
  },
  {
    id: 'breakfree',
    dur: 430,
    next: {kind: 'dissolve', dur: 16},
    cues: [
      [14, 118, '好消息是：看清陷阱，就能走出陷阱'],
      [126, 218, '给自己设一个{停止时间}'],
      [224, 318, '睡前，让手机离开床头'],
      [324, 424, '打开{灰度模式}，让奖励褪色'],
    ],
  },
  // the closing question is set as typography inside the scene, so no subtitle here
  {id: 'outro', dur: 330, cues: []},
];

export const sceneStarts = () => {
  const starts: number[] = [];
  let t = 0;
  SCENES.forEach((s, i) => {
    starts.push(t);
    t += s.dur - (s.next && i < SCENES.length - 1 ? s.next.dur : 0);
  });
  return {starts, total: t};
};

export const allCues = (): Cue[] => {
  const {starts} = sceneStarts();
  return SCENES.flatMap((s, i) => s.cues.map(([a, b, text]) => ({start: starts[i] + a, end: starts[i] + b, text})));
};
