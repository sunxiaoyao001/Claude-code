import type { Vec2 } from '../../core/math';
import type { PathService } from '../nav/PathService';

export type SpeedMode = 'walk' | 'run' | 'sprint' | 'crouch';
export type LocoStatus = 'idle' | 'planning' | 'moving' | 'arrived' | 'failed';

/**
 * Path-following state for one agent. Plans through the time-sliced PathService,
 * follows waypoints, detects arrival and getting stuck (and re-plans).
 */
export class Locomotion {
  gx = 0;
  gy = 0;
  hasGoal = false;
  path: Vec2[] = [];
  idx = 0;
  mode: SpeedMode = 'run';
  arrive = 0.35;
  status: LocoStatus = 'idle';
  partial = false;
  private req = 0;
  private token = 0;
  private checkT = 0;
  private lastX = 0;
  private lastY = 0;
  private stuckCount = 0;
  private layer: 'inf' | 'tank' = 'inf';

  moveTo(paths: PathService, layer: 'inf' | 'tank', fx: number, fy: number, gx: number, gy: number, mode: SpeedMode, arrive = 0.35) {
    this.mode = mode;
    this.arrive = arrive;
    if (
      this.hasGoal &&
      Math.hypot(gx - this.gx, gy - this.gy) < 0.6 &&
      (this.status === 'moving' || this.status === 'planning' || this.status === 'arrived')
    ) {
      if (this.status === 'arrived' && Math.hypot(fx - gx, fy - gy) > arrive + 0.6) this.status = 'moving';
      return;
    }
    this.cancel(paths);
    this.layer = layer;
    this.gx = gx;
    this.gy = gy;
    this.hasGoal = true;
    this.stuckCount = 0;
    this.lastX = fx;
    this.lastY = fy;
    this.checkT = 0;
    this.plan(paths, fx, fy);
  }

  private plan(paths: PathService, fx: number, fy: number) {
    this.status = 'planning';
    const token = ++this.token;
    this.req = paths.request(this.layer, fx, fy, this.gx, this.gy, (res) => {
      if (token !== this.token) return;
      this.req = 0;
      if (!res || res.points.length === 0) {
        this.status = 'failed';
        this.path = [];
        return;
      }
      this.path = res.points;
      this.idx = 0;
      this.partial = !res.complete;
      this.status = 'moving';
    });
  }

  cancel(paths: PathService) {
    if (this.req) paths.cancel(this.req);
    this.req = 0;
    this.token++;
  }

  stop(paths: PathService) {
    this.cancel(paths);
    this.hasGoal = false;
    this.status = 'idle';
    this.path = [];
    this.idx = 0;
  }

  get moving() {
    return this.status === 'moving' || this.status === 'planning';
  }

  /**
   * Advance along the path; returns the point to steer at, or null when there is
   * nothing to do this tick. `dt` drives stuck detection.
   */
  follow(paths: PathService, x: number, y: number, dt: number, waypointRadius = 0.45): Vec2 | null {
    if (this.status !== 'moving') return null;
    let wp = this.path[this.idx];
    while (this.idx < this.path.length - 1 && Math.hypot(wp.x - x, wp.y - y) < waypointRadius) {
      this.idx++;
      wp = this.path[this.idx];
    }
    const last = this.idx === this.path.length - 1;
    if (last && Math.hypot(wp.x - x, wp.y - y) <= this.arrive) {
      if (this.partial && Math.hypot(this.gx - x, this.gy - y) > this.arrive + 0.5) {
        this.plan(paths, x, y);
        return null;
      }
      this.status = 'arrived';
      return null;
    }
    // stuck detection
    this.checkT += dt;
    if (this.checkT >= 1.4) {
      const moved = Math.hypot(x - this.lastX, y - this.lastY);
      this.checkT = 0;
      this.lastX = x;
      this.lastY = y;
      if (moved < 0.35) {
        this.stuckCount++;
        if (this.stuckCount > 3) {
          this.status = 'failed';
          return null;
        }
        this.plan(paths, x, y);
        return null;
      }
    }
    return wp;
  }

  /** Distance remaining to the goal along the path (approx.). */
  remaining(x: number, y: number) {
    if (!this.hasGoal) return 0;
    if (this.status !== 'moving') return Math.hypot(this.gx - x, this.gy - y);
    let d = 0;
    let cx = x;
    let cy = y;
    for (let i = this.idx; i < this.path.length; i++) {
      d += Math.hypot(this.path[i].x - cx, this.path[i].y - cy);
      cx = this.path[i].x;
      cy = this.path[i].y;
    }
    return d;
  }
}
