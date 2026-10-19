// Camera page (resident). M1: <camera> frames -> WebGL canvas (raw passthrough), flash and lens
// switching, the privacy + camera-permission flow, and a dev panel for the real-device test matrix.
import {
  defaultMirror, nextFlashMode,
  type CameraResolution, type DevicePosition, type FlashMode, type FrameSize,
} from '../../core/camera/cameraOptions';
import { FrameFeed, type CameraFrame } from '../../core/camera/FrameFeed';
import { formatProbe, runPhotoProbe, type PhotoQuality } from '../../core/camera/photoProbe';
import { computeViewTransform, nextRotation, type FrameRotation, type ViewTransform } from '../../core/camera/viewTransform';
import { GLRenderer, type WebGLCanvasNode } from '../../core/gl/GLRenderer';
import { PrivacyGate, type PrivacyPresenter } from '../../core/privacy/PrivacyGate';
import { buildDevLines, type DevModel, type DevSettings } from './devModel';

type Stage = 'starting' | 'live' | 'privacy-declined' | 'camera-denied' | 'camera-error';

// Preview frames are ~480x640; a 2x backing store is already sharper than the source.
const MAX_PIXEL_RATIO = 2;
const DEV_REFRESH_MS = 500;
const MAX_PHOTO_RESULTS = 6;

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
  privacySheetVisible: boolean;
  privacyContractName: string;
  devAvailable: boolean;
  devVisible: boolean;
  dev: DevModel;
}

interface CameraRuntime {
  feed: FrameFeed;
  presenter: PrivacyPresenter;
  renderer: GLRenderer | null;
  cameraReady: boolean;
  rotation: FrameRotation;
  mirror: boolean;
  grayscale: boolean;
  syncGpu: boolean;
  canvasWidth: number;
  canvasHeight: number;
  pixelRatio: number;
  transform: ViewTransform | null;
  transformKey: string;
  devTimer: number;
  photos: string[];
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
  drawFrame(frame: CameraFrame): boolean;
  transformFor(frame: CameraFrame): ViewTransform;
  devSettings(): DevSettings;
  refreshDev(): void;
  setDevTimer(on: boolean): void;
  onCameraInitDone(): void;
  onCameraError(event: WechatMiniprogram.CustomEvent<{ errMsg?: string }>): void;
  onCameraStop(): void;
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
    privacySheetVisible: false,
    privacyContractName: '',
    devAvailable: false,
    devVisible: false,
    dev: { lines: [], settings: { frameSize: 'medium', resolution: 'medium', rotation: 0, mirror: false, grayscale: false, syncGpu: false }, photos: [] },
  },

  // Assigned in onLoad; Page deep-copies custom fields at creation, so instances never share it.
  runtime: undefined as unknown as CameraRuntime,

  onLoad() {
    this.runtime = {
      feed: new FrameFeed((frame) => this.drawFrame(frame)),
      presenter: {
        showPrivacySheet: (contractName) => this.setData({ privacySheetVisible: true, privacyContractName: contractName }),
        hidePrivacySheet: () => this.setData({ privacySheetVisible: false }),
      },
      renderer: null,
      cameraReady: false,
      rotation: 0,
      mirror: defaultMirror('back'),
      grayscale: false,
      syncGpu: false,
      canvasWidth: 0,
      canvasHeight: 0,
      pixelRatio: 1,
      transform: null,
      transformKey: '',
      devTimer: 0,
      photos: [],
    };

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
    if (this.data.stage === 'live' && this.runtime.cameraReady) this.runtime.feed.start();
    if (this.data.devVisible) this.setDevTimer(true);
  },

  onHide() {
    this.runtime.feed.stop();
    this.setDevTimer(false);
    PrivacyGate.detach(this.runtime.presenter);
  },

  onUnload() {
    this.runtime.feed.detach();
    this.setDevTimer(false);
    this.runtime.renderer?.destroy();
    this.runtime.renderer = null;
    PrivacyGate.detach(this.runtime.presenter);
  },

  // Any non-live stage unmounts the camera and the WebGL canvas, so the renderer bound to that canvas
  // is released here; the next live stage builds a new one on the new canvas.
  leaveViewfinder(stage, errorMessage = '') {
    const runtime = this.runtime;
    runtime.feed.detach();
    runtime.cameraReady = false;
    runtime.renderer?.destroy();
    runtime.renderer = null;
    runtime.transform = null;
    runtime.transformKey = '';
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
      .select('#viewfinder-gl')
      .fields({ node: true, size: true })
      .exec((results: Array<{ node?: WebGLCanvasNode; width: number; height: number } | null>) => {
        const info = results[0];
        const runtime = this.runtime;
        if (info?.node) {
          runtime.pixelRatio = Math.min(wx.getWindowInfo().pixelRatio, MAX_PIXEL_RATIO);
          runtime.canvasWidth = Math.round(info.width * runtime.pixelRatio);
          runtime.canvasHeight = Math.round(info.height * runtime.pixelRatio);
          runtime.renderer = GLRenderer.create(info.node, runtime.canvasWidth, runtime.canvasHeight);
        }
        // Without WebGL the canvas is removed and the native camera preview underneath stays usable.
        if (!runtime.renderer) this.setData({ glFailed: true });
        done();
      });
  },

  drawFrame(frame) {
    const { renderer, grayscale, syncGpu } = this.runtime;
    if (!renderer || renderer.isContextLost) return false;
    renderer.uploadFrame(frame.width, frame.height, frame.data);
    renderer.drawFrame({ uvMatrix: this.transformFor(frame).matrix, grayscale });
    if (syncGpu) renderer.syncGpu();
    return true;
  },

  transformFor(frame) {
    const runtime = this.runtime;
    const key = `${frame.width}x${frame.height}|${runtime.rotation}|${runtime.mirror}|${runtime.canvasWidth}x${runtime.canvasHeight}`;
    if (!runtime.transform || runtime.transformKey !== key) {
      runtime.transform = computeViewTransform({
        frameWidth: frame.width,
        frameHeight: frame.height,
        viewWidth: runtime.canvasWidth,
        viewHeight: runtime.canvasHeight,
        rotation: runtime.rotation,
        mirror: runtime.mirror,
      });
      runtime.transformKey = key;
    }
    return runtime.transform;
  },

  onCameraInitDone() {
    const runtime = this.runtime;
    runtime.cameraReady = true;
    if (runtime.renderer || this.data.glFailed) runtime.feed.start();
    else this.initRenderer(() => runtime.feed.start());
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
    this.setData({ devVisible });
    this.setDevTimer(devVisible);
    if (devVisible) this.refreshDev();
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
      case 'photo':
        runPhotoProbe(value as PhotoQuality).then((result) => {
          runtime.photos = [formatProbe(result), ...runtime.photos].slice(0, MAX_PHOTO_RESULTS);
          this.refreshDev();
        });
        break;
      default:
        return;
    }
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
    };
  },

  refreshDev() {
    if (!this.data.devVisible) return;
    const runtime = this.runtime;
    const settings = this.devSettings();
    const base = wx.getAppBaseInfo();
    const device = wx.getDeviceInfo();
    const lines = buildDevLines(runtime.feed.stats.snapshot(), runtime.renderer?.caps ?? null, {
      sdkVersion: base.SDKVersion,
      platform: device.platform,
      model: device.model,
      canvasWidth: runtime.canvasWidth,
      canvasHeight: runtime.canvasHeight,
      pixelRatio: runtime.pixelRatio,
      glFailed: this.data.glFailed,
    }, settings);
    this.setData({ dev: { lines, settings, photos: runtime.photos } });
  },

  setDevTimer(on) {
    const runtime = this.runtime;
    if (runtime.devTimer) {
      clearInterval(runtime.devTimer);
      runtime.devTimer = 0;
    }
    if (on) runtime.devTimer = setInterval(() => this.refreshDev(), DEV_REFRESH_MS);
  },
});
