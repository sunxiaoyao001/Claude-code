import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import map from './europe.json';
import {C, KAI, LATIN, SERIF} from './theme';

/* Nobel's life as a route across Europe, after nobelprize.org's timeline. */

type City = keyof typeof map.cities;
const NAMES: Record<City, string> = {
  stockholm: '斯德哥尔摩',
  stpetersburg: '圣彼得堡',
  paris: '巴黎',
  krummel: '克吕梅尔',
  ardeer: '阿迪尔',
  sanremo: '圣雷莫',
  bofors: '博福斯',
};
// label offset and anchor
const LABEL: Record<City, [number, number, 'start' | 'end']> = {
  stockholm: [16, 26, 'start'],
  stpetersburg: [16, 6, 'start'],
  paris: [-16, 6, 'end'],
  krummel: [16, 6, 'start'],
  ardeer: [-16, 6, 'end'],
  sanremo: [16, 6, 'start'],
  bofors: [-16, -12, 'end'],
};
const STOPS: {city: City; year: number; text: string}[] = [
  {city: 'stockholm', year: 1833, text: '出生'},
  {city: 'stpetersburg', year: 1842, text: '全家在俄国团聚，他在这里长大'},
  {city: 'paris', year: 1850, text: '在佩卢兹的实验室工作一年'},
  {city: 'stockholm', year: 1863, text: '回到瑞典，取得硝化甘油专利'},
  {city: 'krummel', year: 1865, text: '在汉堡附近建起德国工厂'},
  {city: 'ardeer', year: 1871, text: '在苏格兰创办英国炸药公司'},
  {city: 'paris', year: 1873, text: '定居巴黎'},
  {city: 'sanremo', year: 1891, text: '与法国政府争执后，迁居意大利'},
  {city: 'bofors', year: 1894, text: '买下瑞典的博福斯工厂'},
  {city: 'paris', year: 1895, text: '在瑞典－挪威俱乐部签署遗嘱'},
  {city: 'sanremo', year: 1896, text: '在家中去世'},
];
const T0 = 50, STEP = 30, DRAW = 22;
const arrive = (k: number) => T0 + k * STEP;

const P = (c: City) => ({x: map.cities[c][0], y: map.cities[c][1]});
const arc = (a: {x: number; y: number}, b: {x: number; y: number}, k: number) => {
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y;
  const bend = (k % 2 ? 1 : -1) * 0.22;
  return `M${a.x} ${a.y} Q${mx - dy * bend} ${my + dx * bend} ${b.x} ${b.y}`;
};
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const Journey: React.FC = () => {
  const f = useCurrentFrame();
  const grat = interpolate(f, [0, 40], [0, 1], {...clamp, easing: Easing.out(Easing.quad)});
  const landIn = interpolate(f, [6, 46], [0, 1], clamp);
  const zoom = interpolate(f, [0, 400], [1.0, 1.05]);
  const current = Math.max(0, Math.min(STOPS.length - 1, Math.floor((f - T0 + 6) / STEP)));
  const visited = new Map<City, number[]>();
  STOPS.forEach((s, k) => {
    if (f >= arrive(k) - 4) visited.set(s.city, [...(visited.get(s.city) || []), s.year]);
  });
  const cap = STOPS[current];
  const capIn = interpolate(f - arrive(current), [-6, 6], [0, 1], clamp);

  return (
    <AbsoluteFill style={{background: C.paper}}>
      <svg width={1280} height={800} viewBox="0 0 1280 800" style={{transform: `scale(${zoom})`, transformOrigin: '46% 50%'}}>
        <g opacity={0.55}>
          {map.grat.map((d, i) => (
            <path key={i} d={d} fill="none" stroke={C.rule} strokeWidth={0.8} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - grat} />
          ))}
        </g>
        {/* engraved sea: fine parallel ruling, then waterlines around every coast */}
        <g opacity={landIn}>
          {Array.from({length: 200}, (_, i) => (
            <line key={i} x1={0} x2={1280} y1={i * 4 + 1} y2={i * 4 + 1} stroke={C.ink} strokeOpacity={0.13} strokeWidth={0.7} />
          ))}
          {[7, 6, 5, 4, 3, 2, 1].map((k) => (
            <g key={k}>
              <path d={map.land} fill="none" stroke={C.ink} strokeOpacity={0.12 + (7 - k) * 0.06} strokeWidth={k * 6.4 + 1.1} strokeLinejoin="round" />
              <path d={map.land} fill="none" stroke={C.paper} strokeWidth={k * 6.4} strokeLinejoin="round" />
            </g>
          ))}
          <path d={map.land} fill={C.paper} stroke={C.ink} strokeWidth={1.1} strokeLinejoin="round" />
          <path d={map.lakes} fill={C.kiesel} stroke={C.ink} strokeWidth={0.6} />
          {map.rivers.map((d, i) => (
            <path key={i} d={d} fill="none" stroke={C.ink} strokeOpacity={0.45} strokeWidth={0.7} />
          ))}
        </g>

        {/* the route */}
        {STOPS.slice(1).map((s, j) => {
          const k = j + 1;
          const p = interpolate(f, [arrive(k) - DRAW, arrive(k)], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
          if (p <= 0) return null;
          const past = f > arrive(k) + STEP;
          return (
            <path key={k} d={arc(P(STOPS[k - 1].city), P(s.city), k)} fill="none" stroke={past ? C.ink : C.hazard} strokeOpacity={past ? 0.55 : 1}
              strokeWidth={past ? 1.4 : 2.6} strokeLinecap="round" pathLength={1} strokeDasharray={past ? '0.012 0.012' : 1} strokeDashoffset={past ? 0 : 1 - p} />
          );
        })}

        {/* cities */}
        {[...visited.entries()].map(([city, years]) => {
          const {x, y} = P(city);
          const [dx, dy, anchor] = LABEL[city];
          const isNow = cap.city === city;
          const pulse = isNow ? interpolate((f - arrive(current)) % 40, [0, 40], [0, 1]) : 1;
          return (
            <g key={city}>
              {isNow && <circle cx={x} cy={y} r={6 + pulse * 22} fill="none" stroke={C.hazard} strokeWidth={1.5} opacity={1 - pulse} />}
              <circle cx={x} cy={y} r={isNow ? 7 : 5} fill={isNow ? C.hazard : C.ink} stroke={C.paper} strokeWidth={2} />
              <text x={x + dx} y={y + dy} textAnchor={anchor} fontFamily={SERIF} fontSize={20} fill={C.ink} stroke={C.paper} strokeWidth={5} paintOrder="stroke" strokeLinejoin="round">
                {NAMES[city]}
              </text>
              <text x={x + dx} y={y + dy + 22} textAnchor={anchor} fontFamily={LATIN} fontStyle="italic" fontSize={19} fill={C.soft} stroke={C.paper} strokeWidth={5} paintOrder="stroke" strokeLinejoin="round" style={{fontVariantNumeric: 'lining-nums'}}>
                {years.join(' · ')}
              </text>
            </g>
          );
        })}
      </svg>

      <div style={{position: 'absolute', top: 36, left: 40, padding: '14px 20px 16px', background: C.paper, boxShadow: `0 0 0 1px ${C.rule}`, color: C.ink}}>
        <div style={{fontFamily: SERIF, fontSize: 30, letterSpacing: '0.06em'}}>他一生走过的地方</div>
        <div style={{fontFamily: LATIN, fontStyle: 'italic', fontSize: 22, color: C.soft, marginTop: 6, fontVariantNumeric: 'lining-nums'}}>1833 – 1896</div>
      </div>

      <div style={{position: 'absolute', right: 40, bottom: 36, width: 380, padding: '18px 20px 20px', background: C.paper, boxShadow: `0 0 0 1px ${C.rule}`, color: C.ink, opacity: capIn, transform: `translateY(${(1 - capIn) * 10}px)`}}>
        <div style={{fontFamily: LATIN, fontWeight: 500, fontSize: 96, lineHeight: 1, color: C.hazard, fontVariantNumeric: 'lining-nums'}}>{cap.year}</div>
        <div style={{fontFamily: SERIF, fontSize: 26, marginTop: 10}}>{NAMES[cap.city]}</div>
        <div style={{fontFamily: KAI, fontSize: 24, color: C.soft, marginTop: 6, lineHeight: 1.5}}>{cap.text}</div>
      </div>
    </AbsoluteFill>
  );
};
