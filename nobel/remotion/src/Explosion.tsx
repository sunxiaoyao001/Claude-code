import {AbsoluteFill, Easing, interpolate, random, useCurrentFrame} from 'remotion';
import {C, KAI, LATIN, SERIF} from './theme';

/*
 * 4 C3H5N3O9 -> 12 CO2 + 10 H2O + 6 N2 + O2
 * Every atom on screen is accounted for: the 80 atoms of the four
 * nitroglycerin molecules travel into the 29 gas molecules.
 */

type El = 'C' | 'H' | 'N' | 'O';
type Atom = {el: El; x: number; y: number};

const K = 1.62;
// one nitroglycerin molecule: glycerol backbone, three nitrate ester groups
const NG: [El, number, number][] = [
  ['C', -50, 0], ['C', 0, -16], ['C', 50, 0],
  ['H', -74, -14], ['H', -54, -36], ['H', 0, -46], ['H', 54, -36], ['H', 74, -14],
  ['O', -50, 32], ['O', 0, 16], ['O', 50, 32],
  ['N', -50, 64], ['N', 0, 48], ['N', 50, 64],
  ['O', -76, 86], ['O', -32, 94], ['O', -17, 76], ['O', 17, 76], ['O', 32, 94], ['O', 76, 86],
];
const NG_BONDS: [number, number, number][] = [
  [0, 1, 1], [1, 2, 1], [0, 3, 1], [0, 4, 1], [1, 5, 1], [2, 6, 1], [2, 7, 1],
  [0, 8, 1], [1, 9, 1], [2, 10, 1], [8, 11, 1], [9, 12, 1], [10, 13, 1],
  [11, 14, 2], [11, 15, 1], [12, 16, 2], [12, 17, 1], [13, 18, 1], [13, 19, 2],
];

const CENTERS = [-1.5, -0.5, 0.5, 1.5].map((k, i) => ({x: 640 + k * 300, y: 392 + (i % 2 ? 16 : -12), rot: (i % 2 ? 1 : -1) * 0.08 + (i - 1.5) * 0.04}));

const start: Atom[] = [];
const startBonds: [number, number, number][] = [];
CENTERS.forEach((c, m) => {
  const base = start.length;
  NG.forEach(([el, x, y]) => {
    const cs = Math.cos(c.rot), sn = Math.sin(c.rot);
    start.push({el, x: c.x + (x * cs - y * sn) * K, y: c.y + (x * sn + y * cs) * K - 50});
  });
  NG_BONDS.forEach(([a, b, o]) => startBonds.push([base + a, base + b, o]));
});

// products: positions sampled inside an ellipse, deterministic
type Kind = 'CO2' | 'H2O' | 'N2' | 'O2';
const KINDS: Kind[] = [
  ...Array(12).fill('CO2'), ...Array(10).fill('H2O'), ...Array(6).fill('N2'), 'O2',
] as Kind[];
const GEOM: Record<Kind, {atoms: [El, number, number][]; bonds: [number, number, number][]}> = {
  CO2: {atoms: [['O', -38, 0], ['C', 0, 0], ['O', 38, 0]], bonds: [[0, 1, 2], [1, 2, 2]]},
  H2O: {atoms: [['O', 0, -8], ['H', -29, 15], ['H', 29, 15]], bonds: [[0, 1, 1], [0, 2, 1]]},
  N2: {atoms: [['N', -18, 0], ['N', 18, 0]], bonds: [[0, 1, 3]]},
  O2: {atoms: [['O', -18, 0], ['O', 18, 0]], bonds: [[0, 1, 2]]},
};
const slots: {x: number; y: number; rot: number}[] = [];
// largest spacing that still fits all 29 molecules
for (let dmin = 132; dmin >= 70 && slots.length < KINDS.length; dmin -= 4) {
  slots.length = 0;
  for (let n = 0; n < 6000 && slots.length < KINDS.length; n++) {
    const a = random(`a${dmin}-${n}`) * Math.PI * 2, r = Math.sqrt(random(`r${dmin}-${n}`));
    const x = 640 + Math.cos(a) * r * 600, y = 386 + Math.sin(a) * r * 200;
    if (slots.every((q) => Math.hypot(q.x - x, q.y - y) > dmin)) slots.push({x, y, rot: random(`o${dmin}-${n}`) * Math.PI * 2});
  }
}
slots.sort((p, q) => p.x - q.x);
if (slots.length < KINDS.length) throw new Error('not enough product slots: ' + slots.length);

// assign reactant atoms to product atoms, element by element, left to right
const pools: Record<El, number[]> = {C: [], H: [], N: [], O: []};
start.map((a, i) => ({a, i})).sort((p, q) => p.a.x - q.a.x).forEach(({a, i}) => pools[a.el].push(i));
const target: {x: number; y: number}[] = Array(start.length);
const endBonds: [number, number, number][] = [];
const kindOrder = KINDS.map((k, i) => ({k, i})).sort((p, q) => (p.k === 'CO2' ? 0 : p.k === 'H2O' ? 1 : 2) - (q.k === 'CO2' ? 0 : q.k === 'H2O' ? 1 : 2));
// spread kinds across the cloud rather than clustering them
const slotFor = KINDS.map((_, i) => slots[(i * 11) % KINDS.length]);
kindOrder.forEach(({k, i}) => {
  const s = slotFor[i];
  const ids = GEOM[k].atoms.map(([el, x, y]) => {
    const id = pools[el].shift()!;
    const cs = Math.cos(s.rot), sn = Math.sin(s.rot);
    target[id] = {x: s.x + x * cs - y * sn, y: s.y + x * sn + y * cs};
    return id;
  });
  GEOM[k].bonds.forEach(([a, b, o]) => endBonds.push([ids[a], ids[b], o]));
});

const R: Record<El, number> = {C: 17, O: 16, N: 16, H: 10};
const FILL: Record<El, string> = {C: C.ink, O: C.hazard, N: C.paper, H: C.paper};
const TEXT: Record<El, string> = {C: C.paper, O: C.ink, N: C.ink, H: C.ink};

const BREAK = 100;

const Bond: React.FC<{a: {x: number; y: number}; b: {x: number; y: number}; order: number; opacity: number}> = ({a, b, order, opacity}) => {
  if (opacity <= 0.01) return null;
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  const offs = order === 1 ? [0] : order === 2 ? [-4, 4] : [-6, 0, 6];
  return (
    <g opacity={opacity}>
      {offs.map((o) => (
        <line key={o} x1={a.x + nx * o} y1={a.y + ny * o} x2={b.x + nx * o} y2={b.y + ny * o} stroke={C.ink} strokeWidth={2} strokeLinecap="round" />
      ))}
    </g>
  );
};

export const Explosion: React.FC = () => {
  const f = useCurrentFrame();
  const shake = interpolate(f, [40, BREAK], [0, 7], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.quad)});
  const pos = start.map((a, i) => {
    if (f < BREAK) {
      const t = f / 30;
      const jx = (random(`x${i}-${f}`) - 0.5) * shake * 2, jy = (random(`y${i}-${f}`) - 0.5) * shake * 2;
      return {x: a.x + jx + Math.sin(t * 1.3 + i * 0.1) * 1.5, y: a.y + jy + Math.cos(t * 1.1 + i * 0.13) * 1.5};
    }
    const d = random('d' + i) * 18;
    const e = interpolate(f, [BREAK + 2 + d, BREAK + 62 + d], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
    const tg = target[i];
    const ox = a.x - 640, oy = a.y - 360, ol = Math.hypot(ox, oy) || 1;
    const burst = Math.sin(Math.PI * e) * (70 + random('b' + i) * 90);
    const drift = f > 175 ? (f - 175) * 0.06 : 0;
    return {x: a.x + (tg.x - a.x) * e + (ox / ol) * burst + Math.sin(i) * drift, y: a.y + (tg.y - a.y) * e + (oy / ol) * burst + Math.cos(i) * drift};
  });
  const oldBonds = interpolate(f, [BREAK - 6, BREAK], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const flash = interpolate(f, [BREAK - 2, BREAK + 2, BREAK + 26], [0, 0.92, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const ring = interpolate(f, [BREAK, BREAK + 40], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad)});
  const prodText = interpolate(f, [150, 172], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const reactText = interpolate(f, [0, 14], [0, 1], {extrapolateRight: 'clamp'});
  const n4 = interpolate(f, [BREAK, BREAK + 12], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const n29 = interpolate(f, [158, 176], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill style={{background: C.paper}}>
      <svg width={1280} height={720} viewBox="0 0 1280 720">
        {/* fine ruled ground, like a lab notebook */}
        {Array.from({length: 24}, (_, i) => (
          <line key={i} x1={0} x2={1280} y1={30 + i * 30} y2={30 + i * 30} stroke={C.rule} strokeWidth={0.6} opacity={0.35} />
        ))}
        {f >= BREAK && ring < 1 && (
          <g opacity={1 - ring}>
            <circle cx={640} cy={360} r={40 + ring * 820} fill="none" stroke={C.hazard} strokeWidth={10 * (1 - ring) + 1} />
            <circle cx={640} cy={360} r={20 + ring * 620} fill="none" stroke={C.ink} strokeWidth={1.2} />
          </g>
        )}
        {startBonds.map(([a, b, o], k) => (
          <Bond key={'s' + k} a={pos[a]} b={pos[b]} order={o} opacity={oldBonds} />
        ))}
        {endBonds.map(([a, b, o], k) => {
          const d = Math.max(random('d' + a), random('d' + b)) * 18;
          const op = interpolate(f, [BREAK + 58 + d, BREAK + 72 + d], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          return <Bond key={'e' + k} a={pos[a]} b={pos[b]} order={o} opacity={op} />;
        })}
        {start.map((a, i) => (
          <g key={i} transform={`translate(${pos[i].x} ${pos[i].y})`}>
            <circle r={R[a.el]} fill={FILL[a.el]} stroke={C.ink} strokeWidth={a.el === 'C' ? 0 : 1.3} />
            {a.el !== 'H' && (
              <text textAnchor="middle" dominantBaseline="central" fontFamily={LATIN} fontWeight={600} fontSize={19} fill={TEXT[a.el]}>
                {a.el}
              </text>
            )}
          </g>
        ))}
      </svg>

      {/* the equation */}
      <div style={{position: 'absolute', top: 54, left: 0, right: 0, textAlign: 'center', fontFamily: LATIN, fontSize: 52, color: C.ink, letterSpacing: '0.01em', fontVariantNumeric: 'lining-nums'}}>
        <span style={{opacity: reactText}}>
          4 C<sub style={{fontSize: '0.6em'}}>3</sub>H<sub style={{fontSize: '0.6em'}}>5</sub>N<sub style={{fontSize: '0.6em'}}>3</sub>O<sub style={{fontSize: '0.6em'}}>9</sub>
        </span>
        <span style={{opacity: prodText}}>
          {'  →  '}12 CO<sub style={{fontSize: '0.6em'}}>2</sub> + 10 H<sub style={{fontSize: '0.6em'}}>2</sub>O + 6 N<sub style={{fontSize: '0.6em'}}>2</sub> + O<sub style={{fontSize: '0.6em'}}>2</sub>
        </span>
      </div>

      {/* counter */}
      <div style={{position: 'absolute', left: 64, bottom: 40, display: 'flex', alignItems: 'baseline', gap: 18, color: C.ink}}>
        <div style={{position: 'relative', width: 140, height: 110, fontFamily: LATIN, fontWeight: 500, fontSize: 120, lineHeight: 1, fontVariantNumeric: 'lining-nums'}}>
          <span style={{position: 'absolute', left: 0, bottom: 0, opacity: n4}}>4</span>
          <span style={{position: 'absolute', left: 0, bottom: 0, opacity: n29, color: C.hazard}}>29</span>
        </div>
        <div style={{position: 'relative', height: 40, width: 420, fontFamily: SERIF, fontSize: 30}}>
          <span style={{position: 'absolute', left: 0, bottom: 0, opacity: n4}}>个硝化甘油分子</span>
          <span style={{position: 'absolute', left: 0, bottom: 0, opacity: n29}}>个气体分子</span>
        </div>
      </div>
      <div style={{position: 'absolute', right: 64, bottom: 52, fontFamily: KAI, fontSize: 24, color: C.soft, textAlign: 'right', lineHeight: 1.6, opacity: n29}}>
        原子一个不少，体积却在瞬间膨胀
      </div>

      <AbsoluteFill style={{background: '#ffffff', opacity: flash, mixBlendMode: 'screen'}} />
    </AbsoluteFill>
  );
};
