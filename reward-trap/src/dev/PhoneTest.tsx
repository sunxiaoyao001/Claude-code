import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {CLIPS, type ClipId} from '../components/phone/contents';
import {Phone} from '../components/phone/Phone';
import {Feed} from '../components/phone/FeedUI';
import {Thumb, thumbPoseAt, feedPositionAt} from '../components/phone/Thumb';

const ids = Object.keys(CLIPS) as ClipId[];

export const PhoneTest: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 100) {
    return (
      <AbsoluteFill style={{background: '#0b0d14'}}>
        {ids.map((id, i) => {
          const Clip = CLIPS[id];
          return (
            <div key={id} style={{position: 'absolute', left: 40 + i * 205, top: 200, transform: 'scale(0.44)', transformOrigin: 'top left'}}>
              <Phone>
                <Clip t={frame + 30} id={`t${id}`} />
              </Phone>
            </div>
          );
        })}
      </AbsoluteFill>
    );
  }
  const swipes = [{at: 110}, {at: 140}];
  const pos = feedPositionAt(frame, swipes);
  const th = thumbPoseAt(frame, swipes);
  return (
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, #141a2c, #04050b 70%)', justifyContent: 'center', alignItems: 'center'}}>
      <div style={{transform: 'scale(1.0)'}}>
        <Phone tint={[255, 160, 110]} glow={0.8}>
          <Feed items={['ad', 'ocean', 'cat', 'fireworks']} position={pos} t={frame} liked={{2: 0.5}} />
          <Thumb x={th.x} y={th.y} lift={th.lift} press={th.press} />
        </Phone>
      </div>
    </AbsoluteFill>
  );
};
