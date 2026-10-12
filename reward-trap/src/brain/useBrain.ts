import {useEffect, useState} from 'react';
import {continueRender, delayRender, staticFile} from 'remotion';
import {buildBrain, type BrainParts} from './buildBrain';

let parts: BrainParts | null = null;
let pending: Promise<BrainParts> | null = null;

const load = () => {
  if (!pending) {
    pending = fetch(staticFile('brain/folds.bin'))
      .then((r) => r.arrayBuffer())
      .then((buf) => {
        parts = buildBrain(new Uint8Array(buf));
        return parts;
      });
  }
  return pending;
};

/** Brain geometry is generated once per render tab and shared by every scene. */
export const useBrainParts = () => {
  const [p, setP] = useState<BrainParts | null>(parts);
  const [handle] = useState(() => (parts ? null : delayRender('Building brain geometry', {timeoutInMilliseconds: 120000})));
  useEffect(() => {
    if (p) return;
    load().then((res) => {
      setP(res);
      if (handle !== null) continueRender(handle);
    });
  }, [p, handle]);
  return p;
};
