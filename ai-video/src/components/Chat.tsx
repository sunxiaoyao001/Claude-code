import {blink} from '../anim';
import {C, F} from '../theme';
import {useCurrentFrame} from 'remotion';

export const ChatWindow: React.FC<{width?: number; height?: number; style?: React.CSSProperties; children: React.ReactNode}> = ({
	width = 1180,
	height = 640,
	style,
	children,
}) => (
	<div
		style={{
			width,
			height,
			borderRadius: 28,
			background: 'linear-gradient(180deg, rgba(29,32,40,0.96), rgba(20,22,28,0.96))',
			border: `1px solid ${C.line}`,
			boxShadow: '0 40px 120px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)',
			overflow: 'hidden',
			display: 'flex',
			flexDirection: 'column',
			...style,
		}}
	>
		<div style={{height: 70, display: 'flex', alignItems: 'center', gap: 14, padding: '0 34px', borderBottom: `1px solid ${C.line}`}}>
			<div style={{width: 14, height: 14, borderRadius: 7, background: C.amber, boxShadow: `0 0 16px ${C.amber}`}} />
			<div style={{fontFamily: F.sans, fontSize: 24, fontWeight: 500, color: C.muted, letterSpacing: 2}}>AI 助手</div>
		</div>
		<div style={{flex: 1, padding: '38px 46px', display: 'flex', flexDirection: 'column', gap: 30}}>{children}</div>
	</div>
);

export const UserBubble: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
	<div style={{alignSelf: 'flex-end', ...style}}>
		<div
			style={{
				fontFamily: F.sans,
				fontSize: 34,
				color: C.text,
				background: 'rgba(255,255,255,0.08)',
				padding: '18px 28px',
				borderRadius: '22px 22px 6px 22px',
			}}
		>
			{children}
		</div>
	</div>
);

export const Caret: React.FC<{height?: number; on?: boolean}> = ({height = 40, on = true}) => {
	const frame = useCurrentFrame();
	return (
		<span
			style={{
				display: 'inline-block',
				width: height * 0.45,
				height,
				marginLeft: 4,
				verticalAlign: 'text-bottom',
				background: C.amber,
				borderRadius: 3,
				opacity: on ? blink(frame, 30) : 0,
				boxShadow: `0 0 18px rgba(255,178,63,0.6)`,
			}}
		/>
	);
};
