/**
 * 小道具：打勾、叉
 */
import React from 'react';

/** 打勾（p 控制描线进度） */
export const Check: React.FC<{color: string; size?: number; p?: number}> = ({color, size = 48, p = 1}) => (
  <svg width={size} height={size} viewBox="0 0 48 48">
    <path d="M 8 26 L 20 37 L 41 12" fill="none" stroke={color} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${p} 1`} />
  </svg>
);

/** 叉 */
export const Cross: React.FC<{color: string; size?: number}> = ({color, size = 48}) => (
  <svg width={size} height={size} viewBox="0 0 48 48">
    <path d="M 12 12 L 36 36 M 36 12 L 12 36" fill="none" stroke={color} strokeWidth={7} strokeLinecap="round" />
  </svg>
);
