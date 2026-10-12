import React from 'react';
import {CLIPS, SH, SW, type ClipId} from './contents';
import {F} from '../../theme';

export type ClipMeta = {user: string; caption: string; music: string; likes: string; comments: string; saves: string; shares: string};

export const META: Record<ClipId, ClipMeta> = {
  ad: {user: '@好物精选', caption: '冬天必备！热水保温24小时 #好物推荐', music: '推广音乐 - 好物精选', likes: '326', comments: '18', saves: '9', shares: '4'},
  ocean: {user: '@旅行的意义', caption: '这片海，值得你飞三千公里 #日落 #治愈', music: '原声 - 旅行的意义', likes: '28.6w', comments: '1.2w', saves: '3.4w', shares: '8761'},
  rain: {user: '@下雨天', caption: '雨夜，适合发呆 #氛围感', music: '雨声白噪音', likes: '1.2w', comments: '362', saves: '2101', shares: '98'},
  cat: {user: '@橘座大人', caption: '主子今天也很可爱 #猫咪 #萌宠', music: '原声 - 橘座大人', likes: '86.4w', comments: '4.7w', saves: '9.1w', shares: '5.6w'},
  fireworks: {user: '@城市夜景', caption: '跨年烟花，美到窒息 #烟花 #跨年', music: '热门BGM - 城市夜景', likes: '45.1w', comments: '2.3w', saves: '6.2w', shares: '3.1w'},
  aurora: {user: '@追光的人', caption: '零下30度，终于等来了极光 #极光', music: '原声 - 追光的人', likes: '62.3w', comments: '3.8w', saves: '12w', shares: '4.4w'},
  neon: {user: '@深夜食堂', caption: '凌晨两点的街，只有拉面店还亮着', music: '原声 - 深夜食堂', likes: '9.8w', comments: '5621', saves: '1.1w', shares: '2310'},
  galaxy: {user: '@宇宙有多大', caption: '你知道土星有多大吗？#宇宙 #科普', music: '原声 - 宇宙有多大', likes: '17.9w', comments: '8834', saves: '4.2w', shares: '1.9w'},
  paint: {user: '@解压小馆', caption: '看完这个，焦虑全没了 #解压 #治愈', music: '原声 - 解压小馆', likes: '33.7w', comments: '1.6w', saves: '5.5w', shares: '2.8w'},
};

const shadow = 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))';

export const HeartIcon: React.FC<{size?: number; fill?: string}> = ({size = 40, fill = '#fff'}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{filter: shadow}}>
    <path d="M12 21.3s-7.6-4.7-10-9.4C.4 8.6 2.2 4.6 5.9 4.2c2.3-.2 4.1 1 5.3 2.8 1.2-1.8 3-3 5.3-2.8 3.7.4 5.5 4.4 3.9 7.7-2.4 4.7-10.4 9.4-10.4 9.4z" fill={fill} />
  </svg>
);
export const CommentIcon: React.FC<{size?: number}> = ({size = 40}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{filter: shadow}}>
    <path d="M12 3C6.5 3 2 6.7 2 11.3c0 2.6 1.4 4.9 3.7 6.4L5 21.4l4.2-2.2c.9.2 1.8.3 2.8.3 5.5 0 10-3.7 10-8.2S17.5 3 12 3z" fill="#fff" />
    <circle cx="7.6" cy="11.3" r="1.25" fill="#333" />
    <circle cx="12" cy="11.3" r="1.25" fill="#333" />
    <circle cx="16.4" cy="11.3" r="1.25" fill="#333" />
  </svg>
);
const StarIcon: React.FC<{size?: number}> = ({size = 40}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{filter: shadow}}>
    <path d="M12 2.6l2.9 6 6.6.8-4.9 4.6 1.3 6.5L12 17.3l-5.9 3.2 1.3-6.5L2.5 9.4l6.6-.8z" fill="#fff" />
  </svg>
);
const ShareIcon: React.FC<{size?: number}> = ({size = 40}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{filter: shadow}}>
    <path d="M13.5 3.5 22 11l-8.5 7.5v-4.3c-5.2 0-8.8 1.7-11.5 5.6 1-5.4 4.3-10.6 11.5-11.6z" fill="#fff" />
  </svg>
);

const Counter: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div style={{fontFamily: F.ui, fontWeight: 600, fontSize: 13, color: '#fff', marginTop: 2, textShadow: '0 1px 2px rgba(0,0,0,0.6)'}}>{children}</div>
);

/** Per-video overlay that scrolls with the clip: action rail, author, caption, music line, progress. */
export const ClipOverlay: React.FC<{clip: ClipId; t: number; liked?: number; progress?: number; avatarHue?: number}> = ({
  clip,
  t,
  liked = 0,
  progress = 0,
  avatarHue = 200,
}) => {
  const m = META[clip];
  const pop = liked > 0 ? 1 + Math.sin(Math.min(1, liked) * Math.PI) * 0.35 : 1;
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 330, background: 'linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0))'}} />
      <div style={{position: 'absolute', right: 10, bottom: 150, width: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16}}>
        <div style={{position: 'relative', width: 50, height: 50, marginBottom: 8}}>
          <div style={{width: 50, height: 50, borderRadius: 25, border: '2px solid #fff', background: `linear-gradient(135deg, hsl(${avatarHue},70%,62%), hsl(${avatarHue + 50},70%,40%))`}} />
          <div style={{position: 'absolute', left: 16, top: 40, width: 18, height: 18, borderRadius: 9, background: '#ff2d55', color: '#fff', fontSize: 15, lineHeight: '17px', textAlign: 'center', fontFamily: F.ui, fontWeight: 700}}>+</div>
        </div>
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `scale(${pop})`}}>
          <HeartIcon fill={liked > 0 ? '#ff2d55' : '#fff'} />
          <Counter>{m.likes}</Counter>
        </div>
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
          <CommentIcon />
          <Counter>{m.comments}</Counter>
        </div>
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
          <StarIcon />
          <Counter>{m.saves}</Counter>
        </div>
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
          <ShareIcon />
          <Counter>{m.shares}</Counter>
        </div>
        <div
          style={{
            marginTop: 8,
            width: 46,
            height: 46,
            borderRadius: 23,
            background: 'radial-gradient(circle, #555 0 22%, #111 24% 100%)',
            border: '8px solid #222',
            transform: `rotate(${t * 4}deg)`,
          }}
        />
      </div>
      <div style={{position: 'absolute', left: 16, right: 86, bottom: 112, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.6)'}}>
        <div style={{fontFamily: F.sans, fontWeight: 700, fontSize: 18, marginBottom: 8}}>{m.user}</div>
        <div style={{fontFamily: F.sans, fontWeight: 400, fontSize: 15, lineHeight: 1.45, opacity: 0.95}}>{m.caption}</div>
        <div style={{display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontFamily: F.sans, fontSize: 14, overflow: 'hidden', whiteSpace: 'nowrap', width: 200}}>
          <span>♪</span>
          <span style={{display: 'inline-block', transform: `translateX(${-((t * 0.8) % 160)}px)`}}>
            {m.music}　　{m.music}
          </span>
        </div>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 84, height: 2, background: 'rgba(255,255,255,0.2)'}}>
        <div style={{width: `${Math.min(100, progress * 100)}%`, height: 2, background: 'rgba(255,255,255,0.85)'}} />
      </div>
    </div>
  );
};

/** Fixed app chrome: status bar, top tabs, bottom navigation. */
export const AppChrome: React.FC<{time?: string; battery?: number}> = ({time = '02:47', battery = 0.23}) => (
  <div style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
    <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 120, background: 'linear-gradient(to bottom, rgba(0,0,0,0.42), rgba(0,0,0,0))'}} />
    <div style={{position: 'absolute', left: 34, top: 18, fontFamily: F.ui, fontWeight: 600, fontSize: 16, color: '#fff'}}>{time}</div>
    <div style={{position: 'absolute', right: 26, top: 20, display: 'flex', gap: 6, alignItems: 'center'}}>
      <svg width="18" height="12" viewBox="0 0 18 12">
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={i * 4.6} y={9 - i * 2.8} width={3.2} height={3 + i * 2.8} rx={0.8} fill="#fff" />
        ))}
      </svg>
      <svg width="16" height="12" viewBox="0 0 16 12">
        <path d="M8 11.5 5.6 9a3.4 3.4 0 0 1 4.8 0zM3.4 6.9a6.5 6.5 0 0 1 9.2 0l-1.4 1.4a4.5 4.5 0 0 0-6.4 0zM1 4.5a9.9 9.9 0 0 1 14 0l-1.4 1.4a7.9 7.9 0 0 0-11.2 0z" fill="#fff" />
      </svg>
      <div style={{width: 25, height: 12, borderRadius: 3.5, border: '1.4px solid rgba(255,255,255,0.7)', padding: 1.4, boxSizing: 'border-box'}}>
        <div style={{width: `${battery * 100}%`, height: '100%', borderRadius: 1.5, background: battery < 0.25 ? '#ff453a' : '#fff'}} />
      </div>
    </div>
    <div style={{position: 'absolute', left: 0, right: 0, top: 58, display: 'flex', justifyContent: 'center', gap: 28, fontFamily: F.sans, fontSize: 18, color: 'rgba(255,255,255,0.7)', textShadow: '0 1px 3px rgba(0,0,0,0.5)'}}>
      <span>关注</span>
      <span style={{color: '#fff', fontWeight: 700, position: 'relative'}}>
        推荐
        <span style={{position: 'absolute', left: 8, right: 8, bottom: -7, height: 3, borderRadius: 2, background: '#fff'}} />
      </span>
    </div>
    <svg style={{position: 'absolute', right: 22, top: 58}} width="24" height="24" viewBox="0 0 24 24">
      <circle cx="10.5" cy="10.5" r="6.5" stroke="#fff" strokeWidth="2.2" fill="none" />
      <path d="M15.5 15.5 21 21" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 84, background: '#000', display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start', paddingTop: 16, boxSizing: 'border-box', fontFamily: F.sans, fontSize: 16, color: 'rgba(255,255,255,0.65)'}}>
      <span style={{color: '#fff', fontWeight: 700}}>首页</span>
      <span>朋友</span>
      <span style={{width: 46, height: 30, borderRadius: 9, background: '#fff', color: '#000', fontWeight: 800, fontSize: 22, lineHeight: '29px', textAlign: 'center', marginTop: -3}}>+</span>
      <span>消息</span>
      <span>我</span>
    </div>
  </div>
);

/** Vertical feed: `position` is a fractional index into `items` (1.0 = one full swipe). */
export const Feed: React.FC<{
  items: ClipId[];
  position: number;
  t: number;
  liked?: Record<number, number>;
  time?: string;
  chrome?: boolean;
  uid?: string;
}> = ({items, position, t, liked = {}, time, chrome = true, uid = 'feed'}) => {
  const base = Math.floor(position);
  const frac = position - base;
  const visible = [base - 1, base, base + 1].filter((i) => i >= 0 && i < items.length);
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: '#000'}}>
      {visible.map((i) => {
        const Clip = CLIPS[items[i]];
        const y = (i - base - frac) * SH;
        return (
          <div key={i} style={{position: 'absolute', left: 0, top: 0, width: SW, height: SH, transform: `translateY(${y}px)`}}>
            <Clip t={t + i * 37} id={`${uid}${i}${items[i]}`} />
            <ClipOverlay clip={items[i]} t={t} liked={liked[i] ?? 0} progress={((t + i * 50) % 300) / 300} avatarHue={(i * 67) % 360} />
          </div>
        );
      })}
      {chrome ? <AppChrome time={time} /> : null}
    </div>
  );
};
