import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {FilmGrain, Vignette} from '../components/Look';
import {Bokeh, Dust, LightLeak} from '../components/Atmosphere';
import {Subtitles} from '../components/Subtitles';

const Bg: React.FC<{children?: React.ReactNode}> = ({children}) => {
  useCurrentFrame();
  return <AbsoluteFill style={{background: '#123'}}>{children}</AbsoluteFill>;
};
export const Baseline: React.FC = () => <Bg />;
export const PGrain: React.FC = () => <Bg><FilmGrain /></Bg>;
export const PVignette: React.FC = () => <Bg><Vignette /></Bg>;
export const PLeak: React.FC = () => <Bg><LightLeak /></Bg>;
export const PBokeh: React.FC = () => <Bg><Bokeh /></Bg>;
export const PDust: React.FC = () => <Bg><Dust /></Bg>;
export const PSubs: React.FC = () => <Bg><Subtitles cues={[{start: 0, end: 100, text: '多巴胺常被叫做「快乐分子」'}]} /></Bg>;
export const PRadial: React.FC = () => <AbsoluteFill style={{background: 'radial-gradient(ellipse 70% 70% at 50% 45%, #0e1322 0%, #06070d 55%, #020308 100%)'}} />;
export const PVignetteWC: React.FC = () => (
  <Bg>
    <AbsoluteFill style={{willChange: 'transform', background: 'radial-gradient(ellipse 75% 70% at 50% 50%, rgba(0,0,0,0) 48%, rgba(0,0,0,0.4) 78%, rgba(0,0,0,0.72) 100%)'}} />
  </Bg>
);
export const PRadialWC: React.FC = () => {
  useCurrentFrame();
  return <AbsoluteFill style={{willChange: 'transform', background: 'radial-gradient(ellipse 70% 70% at 50% 45%, #0e1322 0%, #06070d 55%, #020308 100%)'}} />;
};
export const PMove: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Bg>
      <AbsoluteFill style={{willChange: 'transform', transform: `translate3d(${f % 7}px, ${f % 5}px, 0)`, background: 'radial-gradient(ellipse 75% 70% at 50% 50%, rgba(255,200,100,0.3) 0%, rgba(0,0,0,0) 70%)'}} />
    </Bg>
  );
};
