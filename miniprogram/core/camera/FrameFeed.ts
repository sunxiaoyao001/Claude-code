// Wraps CameraContext.onCameraFrame: start/stop, per-frame timing and stats.
// The frame's ArrayBuffer is only used inside the callback (handed to the renderer, which copies it
// into a texture); nothing keeps a reference afterwards.
import { FrameStats } from './FrameStats';

export interface CameraFrame {
  width: number;
  height: number;
  data: ArrayBuffer;
}

/** Returns true when the frame was actually drawn. */
export type FrameHandler = (frame: CameraFrame) => boolean;

export class FrameFeed {
  readonly stats: FrameStats;
  private listener: WechatMiniprogram.CameraFrameListener | null = null;
  private running = false;
  // Millisecond clock: the mini program Performance object has no now() (unlike mini games).
  private readonly now = (): number => Date.now();

  constructor(private readonly handler: FrameHandler) {
    this.stats = new FrameStats(this.now);
  }

  get isRunning(): boolean {
    return this.running;
  }

  /** Call after the <camera> fires `initdone`; the camera must declare `frame-size`. */
  start(): void {
    if (this.running) return;
    if (!this.listener) {
      // onCameraFrame: base library >= 2.7.0, one <camera> per page so no id is needed.
      this.listener = wx.createCameraContext().onCameraFrame((frame) => this.onFrame(frame));
    }
    this.running = true;
    this.stats.reset();
    this.listener.start({
      fail: () => {
        this.running = false;
      },
    });
  }

  stop(): void {
    if (!this.running || !this.listener) return;
    this.running = false;
    this.listener.stop();
  }

  /** Drops the listener so the next start() binds to a freshly mounted <camera>. */
  detach(): void {
    this.stop();
    this.listener = null;
  }

  private onFrame(frame: CameraFrame): void {
    if (!this.running) return;
    this.stats.recordDelivered(frame.width, frame.height);
    const startedAt = this.now();
    if (this.handler(frame)) {
      this.stats.recordRendered(this.now() - startedAt);
    }
  }
}
