/**
 * 0:37 排行榜：第一届大赛的原始成绩
 *  从第 15 名一路往上揭晓，前三名放慢，冠军“以牙还牙”金光砸下；
 *  最后用括号标出：前 8 名全是“善良”（从不先背叛）的程序
 */
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Kicker} from '../components/ui';
import {ease, envelope, prog} from '../lib/anim';
import {FIRST_TOURNAMENT} from '../math/ipd';
import {C, FONT} from '../theme';

const T0 = 1110;
const T1 = 1474;
const TOP = 452;
const ROW = 51;
const BAR_X = 492;
const BAR_W = 370; // 504.5 分对应的长度

/** 揭晓时刻：15 → 4 名快速，前三名放慢 */
const revealAt = (rank: number) => {
  if (rank >= 4) return 1118 + (15 - rank) * 5;
  return {3: 1170, 2: 1184, 1: 1198}[rank as 1 | 2 | 3];
};

export const BoardScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T0 || frame >= T1) return null;
  const o = envelope(frame, T0, T1, 10, 8);
  const bracket = prog(frame, 1366, 1384, ease.out);
  const champ = prog(frame, 1198, 1210, ease.back);
  const tag = prog(frame, 1283, 1295, ease.back);

  return (
    <AbsoluteFill style={{opacity: o}}>
      <Kicker en="FINAL STANDINGS · 1980" zh="第一届 · 排名" opacity={prog(frame, 1112, 1128)} y={272} color={C.hud} />
      {FIRST_TOURNAMENT.map((e) => {
        const at = revealAt(e.rank);
        const p = prog(frame, at, at + 10, ease.out);
        if (p <= 0) return null;
        const y = TOP + (e.rank - 1) * ROW;
        const isChamp = e.rank === 1;
        const w = (e.score / 504.5) * BAR_W * ease.out(prog(frame, at + 2, at + 16));
        const shown = (e.score * prog(frame, at + 2, at + 16)).toFixed(1);
        const dim = bracket > 0 && !e.nice ? 1 - 0.55 * bracket : 1;
        const color = isChamp ? C.gold : e.nice && bracket > 0 ? C.coop : C.hud;
        return (
          <div
            key={e.rank}
            style={{
              position: 'absolute',
              left: 70,
              right: 70,
              top: y,
              height: ROW - 8,
              display: 'flex',
              alignItems: 'center',
              opacity: p * dim,
              transform: `translateX(${(1 - p) * -40}px) scale(${isChamp ? interpolate(champ, [0, 1], [1.4, 1]) : 1})`,
              transformOrigin: 'left center',
              borderRadius: 10,
              background: isChamp ? `linear-gradient(90deg, ${C.gold}33, transparent 80%)` : 'transparent',
            }}
          >
            <div style={{width: 64, textAlign: 'right', fontFamily: FONT.num, fontWeight: 700, fontSize: 30, color: isChamp ? C.gold : C.inkDim}}>{e.rank}</div>
            <div style={{width: 18, height: 18, marginLeft: 18, borderRadius: 9, background: e.nice ? C.coop : 'transparent', border: `2px solid ${e.nice ? C.coop : C.red}`, opacity: bracket}} />
            <div
              style={{
                width: 312,
                paddingLeft: 14,
                fontFamily: e.zh ? FONT.sans : FONT.mono,
                fontWeight: isChamp ? 900 : 700,
                fontSize: isChamp ? 27 : 24,
                color: isChamp ? C.goldHot : C.ink,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
            >
              {e.zh ? `${e.zh} · ${e.name}` : e.name}
            </div>
            <div style={{position: 'absolute', left: BAR_X - 70, height: isChamp ? 30 : 22, width: w, borderRadius: 6, background: isChamp ? `linear-gradient(90deg, ${C.gold}, ${C.goldHot})` : color, opacity: isChamp ? 1 : 0.8, boxShadow: isChamp ? `0 0 30px ${C.gold}aa` : 'none'}} />
            <div
              style={{
                position: 'absolute',
                left: BAR_X - 70 + w + 14,
                fontFamily: FONT.num,
                fontWeight: 700,
                fontSize: isChamp ? 36 : 26,
                color: isChamp ? C.gold : C.inkDim,
              }}
            >
              {shown}
            </div>
          </div>
        );
      })}
      {/* 冠军标签：4 行代码 */}
      {tag > 0 ? (
        <div
          style={{
            position: 'absolute',
            right: 60,
            top: TOP - 56,
            transform: `scale(${tag}) rotate(-6deg)`,
            padding: '8px 20px',
            borderRadius: 12,
            border: `3px solid ${C.gold}`,
            background: 'rgba(20,14,6,0.92)',
            fontFamily: FONT.sans,
            fontWeight: 900,
            fontSize: 26,
            color: C.gold,
          }}
        >
          全场最短 · 4 行
        </div>
      ) : null}
      {/* 善良括号 */}
      {bracket > 0 ? (
        <>
          <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
            <path
              d={`M 1030 ${TOP + 4} h 14 v ${(ROW * 8 - 16) * bracket} h -14`}
              fill="none"
              stroke={C.coop}
              strokeWidth={4}
            />
            <path d={`M 1030 ${TOP + ROW * 8 + 4} h 14 v ${(ROW * 7 - 16) * bracket} h -14`} fill="none" stroke={C.red} strokeOpacity={0.7} strokeWidth={4} />
          </svg>
          <div
            style={{
              position: 'absolute',
              right: 56,
              top: TOP + ROW * 4 - 60,
              width: 40,
              fontFamily: FONT.sans,
              fontWeight: 900,
              fontSize: 30,
              lineHeight: 1.15,
              color: C.coop,
              textAlign: 'center',
              opacity: bracket,
            }}
          >
            从不先背叛
          </div>
          <div
            style={{
              position: 'absolute',
              right: 56,
              top: TOP + ROW * 11 - 50,
              width: 40,
              fontFamily: FONT.sans,
              fontWeight: 900,
              fontSize: 30,
              lineHeight: 1.15,
              color: C.red,
              textAlign: 'center',
              opacity: bracket * 0.8,
            }}
          >
            会先背叛
          </div>
        </>
      ) : null}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: TOP + ROW * 15 + 6,
          textAlign: 'center',
          fontFamily: FONT.mono,
          fontSize: 20,
          color: C.inkDim,
          letterSpacing: '0.06em',
          opacity: prog(frame, 1206, 1220),
        }}
      >
        每场 200 回合的平均得分 · Axelrod (1980)
      </div>
    </AbsoluteFill>
  );
};
