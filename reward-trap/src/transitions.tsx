import React from 'react';
import {AbsoluteFill, interpolate} from 'remotion';
import type {TransitionPresentation, TransitionPresentationComponentProps} from '@remotion/transitions';
import {ease} from './theme';

type ZoomProps = {scaleOut?: number; scaleIn?: number; blur?: number};

const Zoom: React.FC<TransitionPresentationComponentProps<ZoomProps>> = ({
  children,
  presentationDirection,
  presentationProgress: p,
  passedProps,
}) => {
  const {scaleOut = 1.7, scaleIn = 0.82, blur = 18} = passedProps;
  if (presentationDirection === 'exiting') {
    const e = ease.in(p);
    return (
      <AbsoluteFill
        style={{
          transform: `scale(${1 + (scaleOut - 1) * e})`,
          opacity: interpolate(p, [0.35, 1], [1, 0], {extrapolateLeft: 'clamp'}),
          filter: `blur(${e * blur}px)`,
        }}
      >
        {children}
      </AbsoluteFill>
    );
  }
  const e = ease.out(p);
  return (
    <AbsoluteFill
      style={{
        transform: `scale(${scaleIn + (1 - scaleIn) * e})`,
        opacity: interpolate(p, [0, 0.55], [0, 1], {extrapolateRight: 'clamp'}),
        filter: p < 0.98 ? `blur(${(1 - e) * blur * 0.6}px)` : undefined,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
export const zoomThrough = (props: ZoomProps = {}): TransitionPresentation<ZoomProps> => ({component: Zoom, props});

type DissolveProps = {blur?: number};
const Dissolve: React.FC<TransitionPresentationComponentProps<DissolveProps>> = ({
  children,
  presentationDirection,
  presentationProgress: p,
  passedProps,
}) => {
  const {blur = 6} = passedProps;
  const t = ease.inOut(p);
  const o = presentationDirection === 'entering' ? t : 1;
  const b = presentationDirection === 'entering' ? (1 - t) * blur : t * blur;
  return <AbsoluteFill style={{opacity: o, filter: b > 0.05 ? `blur(${b}px)` : undefined}}>{children}</AbsoluteFill>;
};
export const dissolve = (props: DissolveProps = {}): TransitionPresentation<DissolveProps> => ({component: Dissolve, props});

type FlashProps = {color?: string};
const Flash: React.FC<TransitionPresentationComponentProps<FlashProps>> = ({
  children,
  presentationDirection,
  presentationProgress: p,
  passedProps,
}) => {
  const {color = '255,226,180'} = passedProps;
  const flash = interpolate(p, [0, 0.45, 0.55, 1], [0, 0.72, 0.72, 0]);
  const show = presentationDirection === 'entering' ? p >= 0.5 : p < 0.5;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{opacity: show ? 1 : 0}}>{children}</AbsoluteFill>
      {presentationDirection === 'entering' ? (
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse 60% 55% at 50% 50%, rgba(${color},1) 0%, rgba(${color},0.55) 45%, rgba(${color},0.12) 100%)`,
            opacity: flash,
            mixBlendMode: 'screen',
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
export const flash = (props: FlashProps = {}): TransitionPresentation<FlashProps> => ({component: Flash, props});

/** Feed-style swipe: the old scene flicks up and away, the new one rides in from below. */
type SwipeProps = {distance?: number};
const Swipe: React.FC<TransitionPresentationComponentProps<SwipeProps>> = ({
  children,
  presentationDirection,
  presentationProgress: p,
  passedProps,
}) => {
  const {distance = 1080} = passedProps;
  const e = ease.inOut(p);
  if (presentationDirection === 'exiting') {
    return (
      <AbsoluteFill
        style={{
          transform: `translateY(${-e * distance}px) scale(${1 - e * 0.08})`,
          filter: `brightness(${1 - e * 0.6})`,
        }}
      >
        {children}
      </AbsoluteFill>
    );
  }
  return <AbsoluteFill style={{transform: `translateY(${(1 - e) * distance}px)`}}>{children}</AbsoluteFill>;
};
export const swipeUp = (props: SwipeProps = {}): TransitionPresentation<SwipeProps> => ({component: Swipe, props});
