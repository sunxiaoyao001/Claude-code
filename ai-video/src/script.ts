// 口播文案 + 时间轴。改文案只需改这里，画面节拍（cue）会自动跟着走。
// 本文件不依赖任何其他模块，scripts/export-srt.ts 也直接引用它。

export const FPS = 30;

// 科普口播常见语速约 260 字/分钟。录完配音如果整体偏快/偏慢，先调这个数；
// 个别句子对不上，就给那一句填 sec（实际秒数）。
export const CHARS_PER_SECOND = 4.4;

export type Line = {
	text: string; // 口播 & 字幕
	cue?: string; // 画面节拍名：场景里用 cues.xxx 取这句开始的帧
	sec?: number; // 手动指定这句时长（秒）
	pause?: number; // 这句之后额外停顿（秒）
};

export type SceneScript = {
	id: string;
	chapter?: {no: string; title: string};
	lead?: number; // 第一句之前的留白（秒）
	tail?: number; // 最后一句之后的留白（秒）
	lines: Line[];
};

export type TimedLine = Line & {from: number; duration: number};

export type TimedScene = Omit<SceneScript, 'lines'> & {
	lines: TimedLine[];
	durationInFrames: number;
	cues: Record<string, number>;
};

const spokenUnits = (text: string) => {
	const cjk = (text.match(/[一-鿿]/g) ?? []).length;
	const latinWords = (text.match(/[A-Za-z]+/g) ?? []).length;
	const digits = (text.match(/[0-9]/g) ?? []).length;
	return cjk + latinWords * 2 + digits;
};

const punctuationPause = (text: string) => {
	if (/——」?$/.test(text)) return 0.3;
	if (/[？。！]」?$/.test(text)) return 0.2;
	return 0;
};

export const lineSeconds = (line: Line) =>
	line.sec ?? Math.max(1.1, spokenUnits(line.text) / CHARS_PER_SECOND + 0.3);

const timeScene = (scene: SceneScript): TimedScene => {
	let t = scene.lead ?? 0.3;
	const cues: Record<string, number> = {};
	const lines = scene.lines.map((line) => {
		const from = Math.round(t * FPS);
		const seconds = lineSeconds(line);
		const duration = Math.round((t + seconds) * FPS) - from;
		if (line.cue) {
			if (line.cue in cues) throw new Error(`${scene.id}: cue「${line.cue}」重复`);
			cues[line.cue] = from;
		}
		t += seconds + punctuationPause(line.text) + (line.pause ?? 0);
		return {...line, from, duration};
	});
	t += scene.tail ?? 0.6;
	return {...scene, lines, cues, durationInFrames: Math.round(t * FPS)};
};

const SCRIPT: SceneScript[] = [
	{
		id: 'hook',
		lead: 0.4,
		tail: 0.8,
		lines: [
			{text: '你问 AI 一个问题'},
			{text: '它能写诗、写代码、讲道理'},
			{text: '说得头头是道'},
			{text: '但如果我告诉你', cue: 'freeze'},
			{text: '它从头到尾其实只会做一件事'},
			{text: '猜下一个字', cue: 'reveal', pause: 0.4},
			{text: '你信吗？', cue: 'ask'},
		],
	},
	{
		id: 'game',
		chapter: {no: '01', title: '猜字游戏'},
		tail: 0.6,
		lines: [
			{text: '我们来玩个游戏'},
			{text: '床前明月——', cue: 'poem', pause: 0.5},
			{text: '你肯定会脱口而出：光', cue: 'guang'},
			{text: 'AI 也一样', cue: 'bars'},
			{text: '它会给每一个可能的字打个分'},
			{text: '「光」几乎是满分', cue: 'top'},
			{text: '再来一个', cue: 'next'},
			{text: '今天天气真——', cue: 'weather', pause: 0.4},
			{text: '这回就难了'},
			{text: '「好」「热」「冷」都有可能', cue: 'wbars'},
			{text: '分数也差不多'},
			{text: 'AI 做的，就是这样一道道填空题', cue: 'summary'},
			{text: '严格来说，它猜的单位叫 token', cue: 'token'},
			{text: '可能是一个字，也可能是半个词', cue: 'split'},
			{text: '为了好懂，咱们就叫它「字」', cue: 'callit'},
		],
	},
	{
		id: 'loop',
		chapter: {no: '02', title: '一个字接一个字'},
		tail: 0.6,
		lines: [
			{text: '那一整段回答是怎么来的？', cue: 'q'},
			{text: '其实很简单'},
			{text: '先猜第一个字', cue: 'first'},
			{text: '把它接到句子后面', cue: 'append'},
			{text: '再看着这句更长的话', cue: 'reread'},
			{text: '猜第二个字', cue: 'second'},
			{text: '就这样，一个一个往外蹦', cue: 'loop'},
			{text: '所以 AI 的回答'},
			{text: '是一个字一个字「打」出来的'},
			{text: '那不是特效', cue: 'notfx'},
			{text: '它是真的在一个字一个字地猜'},
		],
	},
	{
		id: 'train',
		chapter: {no: '03', title: '它是怎么学会的'},
		tail: 0.6,
		lines: [
			{text: '它凭什么猜得准？'},
			{text: '靠刷题', cue: 'feed'},
			{text: '工程师把海量的文字喂给它'},
			{text: '多到一个人不吃不睡', cue: 'years'},
			{text: '读上几万年也读不完'},
			{text: '每读一句', cue: 'quiz'},
			{text: '就把下一个字遮住，让它猜'},
			{text: '猜错了', cue: 'wrong'},
			{text: '就把它脑子里的「旋钮」拧一点点', cue: 'twist'},
			{text: '这样的旋钮，动辄几千亿个', cue: 'knobs'},
			{text: '这样的题，要刷上万亿道', cue: 'count'},
			{text: '它就越猜越准'},
			{text: '最后，再给它上一门课', cue: 'assistant'},
			{text: '怎么当好一个助手'},
			{text: '它才学会回答你的问题', cue: 'after'},
			{text: '而不是自顾自地接龙', cue: 'chain'},
		],
	},
	{
		id: 'detective',
		chapter: {no: '04', title: '猜字凭什么变聪明'},
		tail: 0.8,
		lines: [
			{text: '可「猜字」听起来这么简单'},
			{text: '凭什么能写论文、解数学题？'},
			{text: '有个经典的比方', cue: 'book'},
			{text: '一本侦探小说，最后一句是：'},
			{text: '「凶手就是——」', cue: 'lastline', pause: 0.4},
			{text: '想猜对这个名字', cue: 'clues'},
			{text: '你得读懂前面所有的线索'},
			{text: '人物和动机'},
			{text: '同样', cue: 'same'},
			{text: '要把下一个字猜得足够准'},
			{text: '它就不得不去掌握语法、常识', cue: 'skills'},
			{text: '甚至推理', cue: 'reason'},
			{text: '猜字只是表面', cue: 'surface'},
			{text: '被逼出来的'},
			{text: '是对语言背后那个世界的某种「理解」', cue: 'understand'},
		],
	},
	{
		id: 'sample',
		chapter: {no: '05', title: '为什么每次回答不一样'},
		tail: 0.8,
		lines: [
			{text: '你可能发现了'},
			{text: '同一个问题问两遍，回答不一样', cue: 'three'},
			{text: '因为它不总是挑分最高的那个字', cue: 'bars'},
			{text: '而是按分数「抽签」', cue: 'spin'},
			{text: '高分的字容易抽中'},
			{text: '低分的偶尔也会中'},
			{text: '这个随机程度还能调', cue: 'temp'},
			{text: '叫做「温度」'},
			{text: '温度低，回答稳重', cue: 'low'},
			{text: '温度高，更有创意', cue: 'high'},
			{text: '也更容易跑偏', cue: 'weird'},
		],
	},
	{
		id: 'hallucinate',
		chapter: {no: '06', title: '一本正经地胡说八道'},
		tail: 0.6,
		lines: [
			{text: '这也解释了'},
			{text: 'AI 为什么会一本正经地胡说八道', cue: 'ask'},
			{text: '它学的是：什么样的话听起来像对的', cue: 'like'},
			{text: '而不是去数据库里查答案', cue: 'db'},
			{text: '所以就算它不知道', cue: 'answer'},
			{text: '也能猜出一句非常通顺、非常像真的话'},
			{text: '这就是「AI 幻觉」', cue: 'stamp'},
			{text: '现在很多 AI 会先联网搜索再回答', cue: 'search'},
			{text: '就是为了减少这种情况'},
			{text: '不过重要的信息', cue: 'verify'},
			{text: '最好还是自己再核实一下'},
		],
	},
	{
		id: 'outro',
		tail: 2.2,
		lines: [
			{text: '所以下次看到 AI 一个字一个字往外蹦'},
			{text: '你就知道'},
			{text: '每个字背后，都是一次「猜字」', cue: 'zoom'},
			{text: '有几千亿个旋钮一起参与', cue: 'field'},
			{text: '最后留个问题', cue: 'question'},
			{text: '一个只会猜下一个字的东西'},
			{text: '到底算不算真的「懂」？', cue: 'dong'},
			{text: '评论区聊聊你的看法', cue: 'end'},
		],
	},
];

export const SCENES: TimedScene[] = SCRIPT.map(timeScene);

export const scene = (id: string): TimedScene => {
	const found = SCENES.find((s) => s.id === id);
	if (!found) throw new Error(`找不到场景 ${id}`);
	return found;
};

export const TOTAL_FRAMES = SCENES.reduce((sum, s) => sum + s.durationInFrames, 0);
