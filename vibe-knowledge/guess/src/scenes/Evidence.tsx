/**
 * 实验两幕
 *  0:41 纳格尔 1995：67 个点落到数轴上（示意），平均 36.7，没有人选 0，扎堆在 33（第 1 层）和 22（第 2 层）
 *  0:54 报纸大赛：1997《金融时报》平均 18.91、赢家 13；2005 丹麦《政治报》19196 人、正确答案 21.6；
 *       正确答案从来不是 0 →“选 0 全输”
 */
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Newspaper} from '../components/Newspaper';
import {Axis, Marker, ax, stackDots} from '../components/NumberLine';
import {Cross} from '../components/Props';
import {Stamp} from '../components/Token';
import {Kicker} from '../components/ui';
import {ease, envelope, hash, prog} from '../lib/anim';
import {FT_1997, NAGEL_1995, NAGEL_SAMPLE, P, POLITIKEN_2005} from '../math/guess';
import {C, FONT} from '../theme';

/* ============================================================
 * 纳格尔 1995
 * ========================================================== */
const LAB_Y = 960;
const ROW = 21;
/** 打乱落下的顺序（确定性） */
const ORDER = NAGEL_SAMPLE.map((v, i) => ({v, k: hash(i * 7.7)})).sort((a, b) => a.k - b.k);
const DOTS = stackDots(
  ORDER.map((d) => d.v),
  2,
);

export const LabScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 1230 || frame >= 1620) return null;
  const o = envelope(frame, 1230, 1620, 12, 10);
  const meanP = prog(frame, 1322, 1334, ease.out);
  const zeroP = prog(frame, 1330, 1342, ease.back);
  const spike = prog(frame, 1480, 1494, ease.out);
  const pulse = frame >= 1560 ? 0.5 + 0.5 * Math.sin((frame - 1560) * 0.3) : 1;
  return (
    <AbsoluteFill style={{opacity: o}}>
      <Kicker en="NAGEL · 1995" zh="第一次真人实验" opacity={prog(frame, 1234, 1248)} y={268} color={C.coop} />
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <Axis y={LAB_Y} p={prog(frame, 1240, 1258, ease.out)} />
        {DOTS.map((d, i) => {
          const at = 1262 + i * 0.6;
          const fall = prog(frame, at, at + 10, ease.in);
          if (fall <= 0) return null;
          const yEnd = LAB_Y - 22 - d.row * ROW;
          const y = interpolate(fall, [0, 1], [440, yEnd]);
          const lvl1 = d.v >= 33 && d.v <= 34;
          const lvl2 = d.v >= 21 && d.v <= 22;
          const hot = (lvl1 || lvl2) && spike > 0;
          return <circle key={i} cx={ax(d.v)} cy={y} r={9} fill={hot ? C.gold : C.blue} opacity={hot ? 1 : 0.85 - 0.35 * spike} style={hot ? {filter: `drop-shadow(0 0 8px ${C.gold})`} : undefined} />;
        })}
        <Marker v={NAGEL_1995.mean} y={LAB_Y} h={360} color={C.ink} label={`平均 ${NAGEL_1995.mean}`} p={meanP} labelSize={38} width={3} />
        {/* 没有人选 0 */}
        {zeroP > 0 ? (
          <g opacity={Math.min(1, zeroP)}>
            <circle cx={ax(0)} cy={LAB_Y} r={22 * zeroP} fill="none" stroke={C.red} strokeWidth={4} strokeDasharray="6 5" />
            <text x={ax(0) - 6} y={LAB_Y - 52} style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 32}} fill={C.red}>
              选 0：0 人
            </text>
          </g>
        ) : null}
        {/* 两个尖峰 */}
        {spike > 0 ? (
          <g opacity={spike * pulse}>
            {[
              {v: 33.3, rows: 10, t: '第 1 层', n: '33'},
              {v: 22.2, rows: 6, t: '第 2 层', n: '22'},
            ].map((s) => (
              <g key={s.n}>
                <text x={ax(s.v) - 24} y={LAB_Y - 22 - s.rows * ROW + 20} textAnchor="end" style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 54}} fill={C.gold}>
                  {s.n}
                </text>
                <text x={ax(s.v) - 24} y={LAB_Y - 22 - s.rows * ROW - 38} textAnchor="end" style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 28}} fill={C.goldHot}>
                  {s.t}
                </text>
              </g>
            ))}
          </g>
        ) : null}
        <text x={540} y={LAB_Y + 110} textAnchor="middle" style={{fontFamily: FONT.mono, fontWeight: 700, fontSize: 20}} fill={C.inkDim} opacity={prog(frame, 1300, 1312)}>
          示意 · 依据 NAGEL (1995) 第一轮：{NAGEL_1995.n} 人，平均 {NAGEL_1995.mean}，中位数 {NAGEL_1995.median}
        </text>
      </svg>
    </AbsoluteFill>
  );
};

/* ============================================================
 * 报纸大赛
 * ========================================================== */
const PAPER_Y = 860;

export const PapersScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 1620 || frame >= 2040) return null;
  const o = envelope(frame, 1620, 2040, 12, 10);
  const cards = 1 - prog(frame, 1862, 1874);
  const ft = prog(frame, 1700, 1716, ease.out);
  const pol = prog(frame, 1784, 1800, ease.out);
  const line = prog(frame, 1868, 1884, ease.out);
  const zeroP = prog(frame, 1900, 1912, ease.back);
  return (
    <AbsoluteFill style={{opacity: o}}>
      <Kicker en="NEWSPAPER CONTESTS" zh="报纸上的读者大赛" opacity={prog(frame, 1624, 1640)} y={268} color={C.paper} />
      {/* 开场：一叠报纸 */}
      {frame < 1710 ? (
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: prog(frame, 1630, 1646) * (1 - prog(frame, 1700, 1710))}}>
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i} transform={`translate(${540 + (i - 2) * 26}, ${720 - i * 14}) rotate(${(i - 2) * 5})`}>
              <rect x={-230} y={-150} width={460} height={300} rx={10} fill={i % 2 ? '#e6dcc4' : '#efe6d2'} stroke="#cbbf9f" />
              {[0, 1, 2, 3, 4, 5].map((k) => (
                <rect key={k} x={-190} y={-100 + k * 38} width={k === 0 ? 380 : 380 - (k % 3) * 60} height={k === 0 ? 22 : 10} rx={3} fill="#1d1813" opacity={k === 0 ? 0.85 : 0.35} />
              ))}
            </g>
          ))}
        </svg>
      ) : null}
      {cards > 0 ? (
        <div style={{opacity: cards}}>
          <div style={{position: 'absolute', left: 110, top: 380}}>
            <Newspaper
              masthead="FINANCIAL TIMES"
              place="英国 · 伦敦"
              year="1997"
              title="猜平均数的 2/3"
              stats={[
                {label: '平均数', value: String(FT_1997.mean)},
                {label: '× 2/3', value: (FT_1997.mean * P).toFixed(1)},
                {label: '赢家选的', value: String(FT_1997.winner), hot: true},
              ]}
              p={ft}
              focus={pol > 0 ? 1 - 0.6 * pol : 1}
            />
          </div>
          <div style={{position: 'absolute', left: 110, top: 776}}>
            <Newspaper
              masthead="POLITIKEN"
              place="丹麦 · 哥本哈根"
              year="2005"
              title="19196 位读者参加"
              stats={[
                {label: '参加人数', value: '19196'},
                {label: '正确答案', value: String(POLITIKEN_2005.answer), hot: true},
              ]}
              p={pol}
            />
          </div>
        </div>
      ) : null}
      {/* 数轴：正确答案都不是 0 */}
      {line > 0 ? (
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: line}}>
          <Axis y={PAPER_Y} p={line} />
          <Marker v={FT_1997.winner} y={PAPER_Y} h={150} color={C.gold} label="13" sub="金融时报" p={prog(frame, 1876, 1888, ease.out)} labelSize={46} />
          <Marker v={POLITIKEN_2005.answer} y={PAPER_Y} h={290} color={C.gold} label="21.6" sub="政治报" p={prog(frame, 1884, 1896, ease.out)} labelSize={46} />
          {zeroP > 0 ? (
            <g transform={`translate(${ax(0)}, ${PAPER_Y}) scale(${zeroP})`}>
              <circle r={34} fill="rgba(236,74,60,0.15)" stroke={C.red} strokeWidth={4} />
              <text y={18} textAnchor="middle" style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 48}} fill={C.red}>
                0
              </text>
            </g>
          ) : null}
        </svg>
      ) : null}
      {zeroP > 0 ? (
        <div style={{position: 'absolute', left: ax(0) - 24, top: PAPER_Y - 120, opacity: Math.min(1, zeroP)}}>
          <Cross color={C.red} size={48} />
        </div>
      ) : null}
      <div style={{position: 'absolute', left: 0, right: 0, top: 980, display: 'flex', justifyContent: 'center'}}>
        <Stamp text="选 0 全输" sub="ZERO NEVER WINS" color={C.red} p={prog(frame, 1950, 1958, ease.out)} rotate={-6} size={1.1} />
      </div>
    </AbsoluteFill>
  );
};
