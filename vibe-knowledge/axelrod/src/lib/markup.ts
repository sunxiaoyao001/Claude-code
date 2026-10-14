/**
 * 极简富文本：'<g>金</g> <r>红</r> <b>蓝</b> <c>青</c> <w>白</w>'，'\n' 换行
 * 解析为 行 → 片段，供字幕和大标题逐字动画使用
 */
import {C} from '../theme';

export type Seg = {text: string; color: string | null; strong: boolean};
export type Line = Seg[];

const COLORS: Record<string, string> = {g: C.gold, r: C.red, b: C.blue, c: C.coop, w: C.ink};

export const parseMarkup = (src: string): Line[] =>
  src.split('\n').map((line) => {
    const segs: Seg[] = [];
    const re = /<([grbcw])>(.*?)<\/\1>/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line))) {
      if (m.index > last) segs.push({text: line.slice(last, m.index), color: null, strong: false});
      segs.push({text: m[2], color: COLORS[m[1]], strong: true});
      last = m.index + m[0].length;
    }
    if (last < line.length) segs.push({text: line.slice(last), color: null, strong: false});
    return segs;
  });

/** 一行的“视觉字宽”：全角按 1，半角按 0.55 */
export const lineWidthEm = (line: Line) =>
  line.reduce((w, s) => w + [...s.text].reduce((a, ch) => a + (ch.charCodeAt(0) < 0x2e80 ? 0.55 : 1), 0), 0);
