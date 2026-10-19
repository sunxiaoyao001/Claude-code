// Camera page (resident). <camera> frames -> film pipeline on a WebGL canvas (the look is visible
// live), shutter -> full-resolution capture -> in-app album, plus flash/lens switching, the privacy +
// camera-permission flow and a dev panel for real-device checks.
import {
  defaultMirror, nextFlashMode,
  type CameraResolution, type DevicePosition, type FlashMode, type FrameSize,
} from '../../core/camera/cameraOptions';
import { runExportSelfCheck } from '../../core/camera/exportSelfCheck';
import { FrameFeed, type CameraFrame } from '../../core/camera/FrameFeed';
import { formatProbe, runPhotoProbe, type PhotoQuality } from '../../core/camera/photoProbe';
import { PreviewGovernor } from '../../core/camera/PreviewGovernor';
import { ShotCapture } from '../../core/camera/ShotCapture';
import { computeViewTransform, nextRotation, type FrameRotation, type ViewTransform } from '../../core/camera/viewTransform';
import { detectTier, type DeviceTier } from '../../core/device/DeviceTier';
import type { ExportCanvas } from '../../core/camera/exportImage';
import { GLRenderer, type Viewport, type WebGLCanvasNode } from '../../core/gl/GLRenderer';
import { Pipeline } from '../../core/gl/Pipeline';
import { newShotSeed } from '../../core/gl/shotRandom';
import type { GLTexture } from '../../core/gl/webgl1';
import { parseAspect, SUNNY_FUN } from '../../core/pack/FilterParams';
import { PrivacyGate, type PrivacyPresenter } from '../../core/privacy/PrivacyGate';
import { saveToAlbum } from '../../core/storage/albumSaver';
import { saveShot } from '../../core/storage/ShotStore';
import { buildDevLines, formatCapture, type DevModel, type DevSettings } from './devModel';

type Stage = 'starting' | 'live' | 'privacy-declined' | 'camera-denied' | 'camera-error';

const LOOK = SUNNY_FUN;
const LUT_SRC = `/assets/luts/${LOOK.lut.id}.png`;
// Preview frames are ~480x640; a 2x backing store is already sharper than the source.
const MAX_PIXEL_RATIO = 2;
const DEV_REFRESH_MS = 500;
const GOVERNOR_TICK_MS = 1000;
// Grain stays put for a third of a second, like film flickering frame to frame (CLAUDE.md §3).
const GRAIN_HOLD_MS = 333;
// Matches --dur-mirror-flash: one dark frame like a mirror slapping up.
const MIRROR_FLASH_MS = 80;
// Gap between the status row and the frame, matching --sp-1.
const FRAME_TOP_GAP_PX = 8;
const MAX_RESULTS = 12;

interface CameraPageData {
  stage: Stage;
  cameraMounted: boolean;
  devicePosition: DevicePosition;
  flash: FlashMode;
  frameSize: FrameSize;
  resolution: CameraResolution;
  glFailed: boolean;
  errorMessage: string;
  statusTop: number;
  statusHeight: number;
  capturing: boolean;
  mirrorFlash: boolean;
  lastShotPath: string;
  viewerVisible: boolean;
  privacySheetVisible: boolean;
  privacyContractName: string;
  devAvailable: boolean;
  devVisible: boolean;
  dev: DevModel;
}

interface CameraRuntime {
  feed: FrameFeed;
  capture: ShotCapture;
  presenter: PrivacyPresenter;
  renderer: GLRenderer | null;
  pipeline: Pipeline | null;
  frameTexture: GLTexture | null;
  lutTexture: GLTexture | null;
  exportCanvas: ExportCanvas | null;
  tier: DeviceTier;
  governor: PreviewGovernor;
  cameraReady: boolean;
  frameRect: Viewport;
  rotation: FrameRotation;
  mirror: boolean;
  grayscale: boolean;
  syncGpu: boolean;
  raw: boolean;
  grainSeed: number;
  grainSeedAt: number;
  canvasWidth: number;
  canvasHeight: number;
  pixelRatio: number;
  transform: ViewTransform | null;
  transformKey: string;
  devTimer: number;
  governorTimer: number;
  results: string[];
}

interface DevActionDetail {
  type: string;
  value?: string;
}

interface CameraPageCustom {
  runtime: CameraRuntime;
  leaveViewfinder(stage: Exclude<Stage, 'live'>, errorMessage?: string): void;
  startCameraFlow(): void;
  checkCameraPermission(): void;
  remountCamera(): void;
  initRenderer(done: () => void): void;
  releaseRenderer(): void;
  drawFrame(frame: CameraFrame): boolean;
  transformFor(frame: CameraFrame): ViewTransform;
  setTimers(on: boolean): void;
  pushResults(lines: string[]): void;
  devSettings(): DevSettings;
  refreshDev(): void;
  onCameraInitDone(): void;
  onCameraError(event: WechatMiniprogram.CustomEvent<{ errMsg?: string }>): void;
  onCameraStop(): void;
  onShutter(): void;
  onOpenViewer(): void;
  onCloseViewer(): void;
  onSaveToAlbum(): void;
  onToggleFlash(): void;
  onFlip(): void;
  onOpenSetting(): void;
  onRetryPrivacy(): void;
  onRetryCamera(): void;
  onPrivacyAgree(): void;
  onPrivacyDisagree(): void;
  onOpenPrivacyContract(): void;
  onToggleDevPanel(): void;
  onDevAction(event: WechatMiniprogram.CustomEvent<DevActionDetail>): void;
}

/** The look's frame rect inside the canvas, just below the status row (GL origin bottom-left). */
function frameRectFor(canvasWidth: number, canvasHeight: number, topPx: number, aspect: number): Viewport {
  let width = canvasWidth;
  let height = Math.round(width / aspect);
  if (topPx + height > canvasHeight) {
    height = canvasHeight - topPx;
    width = Math.round(height * aspect);
  }
  return { x: Math.round((canvasWidth - width) / 2), y: canvasHeight - topPx - height, width, height };
}

Page<CameraPageData, CameraPageCustom>({
  data: {
    stage: 'starting',
    cameraMounted: false,
    devicePosition: 'back',
    flash: 'off',
    frameSize: 'medium',
    resolution: 'medium',
    glFailed: false,
    errorMessage: '',
    statusTop: 0,
    statusHeight: 0,
    capturing: false,
    mirrorFlash: false,
    lastShotPath: '',
    viewerVisible: false,
    privacySheetVisible: false,
    privacyContractName: '',
    devAvailable: false,
    devVisible: false,
    dev: {
      lines: [],
      settings: { frameSize: 'medium', resolution: 'medium', rotation: 0, mirror: false, grayscale: false, syncGpu: false, raw: false },
      results: [],
    },
  },

  // Assigned in onLoad; Page deep-copies custom fields at creation, so instances never share it.
  runtime: undefined as unknown as CameraRuntime,

  onLoad() {
    this.runtime = {
      feed: new FrameFeed((frame) => this.drawFrame(frame)),
      capture: new ShotCapture(),
      presenter: {
        showPrivacySheet: (contractName) => this.setData({ privacySheetVisible: true, privacyContractName: contractName }),
        hidePrivacySheet: () => this.setData({ privacySheetVisible: false }),
      },
      renderer: null,
      pipeline: null,
      frameTexture: null,
      lutTexture: null,
      exportCanvas: null,
      tier: 'mid',
      governor: new PreviewGovernor(true),
      cameraReady: false,
      frameRect: { x: 0, y: 0, width: 0, height: 0 },
      rotation: 0,
      mirror: defaultMirror('back'),
      grayscale: false,
      syncGpu: false,
      raw: false,
      grainSeed: 0,
      grainSeedAt: 0,
      canvasWidth: 0,
      canvasHeight: 0,
      pixelRatio: 1,
      transform: null,
      transformKey: '',
      devTimer: 0,
      governorTimer: 0,
      results: [],
    };

    detectTier().then((tier) => {
      this.runtime.tier = tier;
      // Low-end devices start without preview halation; capture always renders it.
      this.runtime.governor = new PreviewGovernor(tier !== 'low');
    });

    // Custom navigation: align the status row with the capsule menu button.
    const menu = wx.getMenuButtonBoundingClientRect();
    this.setData({
      statusTop: menu.top,
      statusHeight: menu.height,
      devAvailable: wx.getAccountInfoSync().miniProgram.envVersion !== 'release',
    });

    PrivacyGate.attach(this.runtime.presenter);
    this.startCameraFlow();
  },

  onShow() {
    PrivacyGate.attach(this.runtime.presenter);
    if (this.data.stage === 'camera-denied') this.checkCameraPermission();
    if (this.data.stage === 'live' && this.runtime.cameraReady) {
      this.runtime.feed.start();
      this.setTimers(true);
    }
  },

  onHide() {
    this.runtime.feed.stop();
    this.setTimers(false);
    PrivacyGate.detach(this.runtime.presenter);
  },

  onUnload() {
    this.runtime.feed.detach();
    this.setTimers(false);
    this.releaseRenderer();
    this.runtime.capture.destroy();
    PrivacyGate.detach(this.runtime.presenter);
  },

  // Any non-live stage unmounts the camera and the WebGL canvas, so the renderer bound to that canvas
  // is released here; the next live stage builds a new one on the new canvas.
  leaveViewfinder(stage, errorMessage = '') {
    this.runtime.feed.detach();
    this.runtime.cameraReady = false;
    this.setTimers(false);
    this.releaseRenderer();
    this.setData({ stage, cameraMounted: false, glFailed: false, errorMessage });
  },

  startCameraFlow() {
    this.leaveViewfinder('starting');
    PrivacyGate.ensure().then((agreed) => {
      if (agreed) this.checkCameraPermission();
      else this.leaveViewfinder('privacy-declined');
    });
  },

  checkCameraPermission() {
    wx.getSetting({
      success: ({ authSetting }) => {
        // false = denied earlier; the <camera> will not ask again, only Settings can re-enable it.
        if (authSetting['scope.camera'] === false) this.leaveViewfinder('camera-denied');
        else this.setData({ stage: 'live', cameraMounted: true });
      },
      fail: () => this.setData({ stage: 'live', cameraMounted: true }),
    });
  },

  remountCamera() {
    this.runtime.feed.detach();
    this.runtime.cameraReady = false;
    this.setData({ cameraMounted: false }, () => this.setData({ stage: 'live', cameraMounted: true }));
  },

  initRenderer(done) {
    wx.createSelectorQuery()
      .select('#viewfinder-gl').fields({ node: true, size: true })
      .select('#export-2d').fields({ node: true })
      .exec((results: Array<{ node?: unknown; width?: number; height?: number } | null>) => {
        const [glInfo, exportInfo] = results;
        const runtime = this.runtime;
        runtime.exportCanvas = (exportInfo?.node as ExportCanvas | undefined) ?? null;
        if (glInfo?.node && glInfo.width && glInfo.height) {
          runtime.pixelRatio = Math.min(wx.getWindowInfo().pixelRatio, MAX_PIXEL_RATIO);
          runtime.canvasWidth = Math.round(glInfo.width * runtime.pixelRatio);
          runtime.canvasHeight = Math.round(glInfo.height * runtime.pixelRatio);
          runtime.renderer = GLRenderer.create(glInfo.node as WebGLCanvasNode, runtime.canvasWidth, runtime.canvasHeight);
        }
        const renderer = runtime.renderer;
        if (!renderer) {
          // Without WebGL the canvas is removed and the native camera preview underneath stays usable.
          this.setData({ glFailed: true });
          done();
          return;
        }
        const topPx = (this.data.statusTop + this.data.statusHeight + FRAME_TOP_GAP_PX) * runtime.pixelRatio;
        runtime.frameRect = frameRectFor(runtime.canvasWidth, runtime.canvasHeight, Math.round(topPx), parseAspect(LOOK.frame.aspectRatio));
        runtime.pipeline = new Pipeline(renderer);
        runtime.frameTexture = renderer.createTexture();
        // Until the LUT arrives the pipeline shows the raw frame.
        renderer.loadImage(LUT_SRC).then((image) => {
          if (runtime.renderer !== renderer || !runtime.pipeline) return;
          runtime.lutTexture = renderer.createTexture();
          renderer.uploadImage(runtime.lutTexture, image);
          runtime.pipeline.setLook(LOOK, runtime.lutTexture);
        }, (error: unknown) => this.pushResults([`LUT 加载失败：${String(error)}`]));
        done();
      });
  },

  releaseRenderer() {
    const runtime = this.runtime;
    runtime.pipeline?.destroy();
    if (runtime.renderer) {
      runtime.renderer.deleteTexture(runtime.frameTexture);
      runtime.renderer.deleteTexture(runtime.lutTexture);
      runtime.renderer.destroy();
    }
    runtime.renderer = null;
    runtime.pipeline = null;
    runtime.frameTexture = null;
    runtime.lutTexture = null;
    runtime.transform = null;
    runtime.transformKey = '';
  },

  drawFrame(frame) {
    const runtime = this.runtime;
    const { renderer, pipeline, frameTexture } = runtime;
    if (!renderer || !pipeline || !frameTexture || renderer.isContextLost) return false;
    const now = Date.now();
    if (now - runtime.grainSeedAt >= GRAIN_HOLD_MS) {
      runtime.grainSeed = Math.random() * 100;
      runtime.grainSeedAt = now;
    }
    renderer.uploadRGBA(frameTexture, frame.width, frame.height, frame.data);
    pipeline.renderPreview({ texture: frameTexture, width: frame.width, height: frame.height }, {
      frameRect: runtime.frameRect,
      uvMatrix: this.transformFor(frame).matrix,
      halation: runtime.governor.halation,
      grainSeed: runtime.grainSeed,
      raw: runtime.raw,
      grayscale: runtime.grayscale,
    });
    if (runtime.syncGpu) renderer.syncGpu();
    return true;
  },

  transformFor(frame) {
    const runtime = this.runtime;
    const { width, height } = runtime.frameRect;
    const key = `${frame.width}x${frame.height}|${runtime.rotation}|${runtime.mirror}|${width}x${height}`;
    if (!runtime.transform || runtime.transformKey !== key) {
      runtime.transform = computeViewTransform({
        frameWidth: frame.width,
        frameHeight: frame.height,
        viewWidth: width,
        viewHeight: height,
        rotation: runtime.rotation,
        mirror: runtime.mirror,
      });
      runtime.transformKey = key;
    }
    return runtime.transform;
  },

  setTimers(on) {
    const runtime = this.runtime;
    clearInterval(runtime.governorTimer);
    clearInterval(runtime.devTimer);
    runtime.governorTimer = 0;
    runtime.devTimer = 0;
    if (!on) return;
    runtime.governorTimer = setInterval(() => runtime.governor.update(runtime.feed.stats.snapshot()), GOVERNOR_TICK_MS);
    if (this.data.devVisible) runtime.devTimer = setInterval(() => this.refreshDev(), DEV_REFRESH_MS);
  },

  onCameraInitDone() {
    const runtime = this.runtime;
    runtime.cameraReady = true;
    const start = () => {
      runtime.feed.start();
      this.setTimers(true);
    };
    if (runtime.renderer || this.data.glFailed) start();
    else this.initRenderer(start);
  },

  onCameraError(event) {
    this.runtime.feed.detach();
    this.runtime.cameraReady = false;
    const errorMessage = event.detail.errMsg ?? '';
    wx.getSetting({
      success: ({ authSetting }) => {
        if (authSetting['scope.camera'] === false) this.leaveViewfinder('camera-denied');
        else this.leaveViewfinder('camera-error', errorMessage);
      },
      fail: () => this.leaveViewfinder('camera-error', errorMessage),
    });
  },

  onCameraStop() {
    // Abnormal stop (e.g. app sent to background); onShow restarts the frame listener.
    this.runtime.feed.stop();
  },

  onShutter() {
    const runtime = this.runtime;
    if (this.data.capturing || runtime.capture.isBusy || !runtime.exportCanvas) return;
    wx.vibrateShort({ type: 'heavy' });
    this.setData({ capturing: true, mirrorFlash: true });
    setTimeout(() => this.setData({ mirrorFlash: false }), MIRROR_FLASH_MS);

    const seed = newShotSeed();
    runtime.capture.capture({ look: LOOK, lutSrc: LUT_SRC, tier: runtime.tier, exportCanvas: runtime.exportCanvas, seed, stampDate: new Date() })
      .then((result) => {
        this.pushResults(formatCapture(result));
        return saveShot(result.tempFilePath, { packId: LOOK.lut.id, width: result.width, height: result.height, seed });
      })
      .then((record) => this.setData({ lastShotPath: record.path }))
      .catch((error: unknown) => {
        this.pushResults([`出片失败：${error instanceof Error ? error.message : String(error)}`]);
        wx.showToast({ title: '这张没洗出来，再试一次', icon: 'none' });
      })
      .finally(() => this.setData({ capturing: false }));
  },

  onOpenViewer() {
    if (this.data.lastShotPath) this.setData({ viewerVisible: true });
  },

  onCloseViewer() {
    this.setData({ viewerVisible: false });
  },

  onSaveToAlbum() {
    saveToAlbum(this.data.lastShotPath).then((result) => {
      if (result === 'saved') {
        wx.vibrateShort({ type: 'medium' });
        wx.showToast({ title: '已存到手机相册', icon: 'none' });
      } else if (result === 'failed') {
        wx.showToast({ title: '保存失败，请稍后再试', icon: 'none' });
      }
    });
  },

  onToggleFlash() {
    if (this.data.devicePosition === 'front') return;
    this.setData({ flash: nextFlashMode(this.data.flash) });
  },

  onFlip() {
    const next: DevicePosition = this.data.devicePosition === 'back' ? 'front' : 'back';
    this.runtime.mirror = defaultMirror(next);
    this.setData({ devicePosition: next });
    this.refreshDev();
  },

  onOpenSetting() {
    wx.openSetting({
      success: ({ authSetting }) => {
        if (authSetting['scope.camera']) this.setData({ stage: 'live', cameraMounted: true });
      },
    });
  },

  onRetryPrivacy() {
    this.startCameraFlow();
  },

  onRetryCamera() {
    this.remountCamera();
  },

  onPrivacyAgree() {
    PrivacyGate.agree();
  },

  onPrivacyDisagree() {
    PrivacyGate.disagree();
  },

  onOpenPrivacyContract() {
    PrivacyGate.openContract();
  },

  onToggleDevPanel() {
    if (!this.data.devAvailable) return;
    const devVisible = !this.data.devVisible;
    this.setData({ devVisible }, () => {
      if (this.data.stage === 'live' && this.runtime.cameraReady) this.setTimers(true);
      if (devVisible) this.refreshDev();
    });
  },

  onDevAction(event) {
    const { type, value } = event.detail;
    const runtime = this.runtime;
    switch (type) {
      case 'close':
        this.onToggleDevPanel();
        return;
      case 'frameSize':
        this.setData({ frameSize: value as FrameSize });
        this.remountCamera();
        break;
      case 'resolution':
        this.setData({ resolution: value as CameraResolution });
        this.remountCamera();
        break;
      case 'rotate':
        runtime.rotation = nextRotation(runtime.rotation);
        break;
      case 'mirror':
        runtime.mirror = !runtime.mirror;
        break;
      case 'grayscale':
        runtime.grayscale = !runtime.grayscale;
        break;
      case 'syncGpu':
        runtime.syncGpu = !runtime.syncGpu;
        break;
      case 'raw':
        runtime.raw = !runtime.raw;
        break;
      case 'photo':
        runPhotoProbe(value as PhotoQuality).then((result) => this.pushResults([formatProbe(result)]));
        break;
      case 'selfCheck':
        if (!runtime.exportCanvas) {
          this.pushResults(['导出自检：页面 2D canvas 未就绪']);
          break;
        }
        this.pushResults(['导出自检运行中…']);
        runExportSelfCheck(runtime.exportCanvas, runtime.tier).then((lines) => this.pushResults(lines));
        break;
      default:
        return;
    }
    this.refreshDev();
  },

  pushResults(lines) {
    this.runtime.results = [...lines, ...this.runtime.results].slice(0, MAX_RESULTS);
    this.refreshDev();
  },

  devSettings() {
    const runtime = this.runtime;
    return {
      frameSize: this.data.frameSize,
      resolution: this.data.resolution,
      rotation: runtime.rotation,
      mirror: runtime.mirror,
      grayscale: runtime.grayscale,
      syncGpu: runtime.syncGpu,
      raw: runtime.raw,
    };
  },

  refreshDev() {
    if (!this.data.devVisible) return;
    const runtime = this.runtime;
    const settings = this.devSettings();
    const base = wx.getAppBaseInfo();
    const device = wx.getDeviceInfo();
    const governor = runtime.governor;
    const lines = buildDevLines(runtime.feed.stats.snapshot(), runtime.renderer?.caps ?? null, {
      sdkVersion: base.SDKVersion,
      platform: device.platform,
      model: device.model,
      canvasWidth: runtime.canvasWidth,
      canvasHeight: runtime.canvasHeight,
      pixelRatio: runtime.pixelRatio,
      glFailed: this.data.glFailed,
      tier: runtime.tier,
      halation: governor.halation ? 'on' : governor.lockedOff ? 'locked off' : 'off',
      lookReady: runtime.pipeline?.ready ?? false,
    }, settings);
    this.setData({ dev: { lines, settings, results: runtime.results } });
  },
});
