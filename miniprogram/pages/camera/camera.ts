// Camera page (resident). <camera> frames -> film pipeline on a WebGL canvas (the look is visible
// live), shutter -> full-resolution capture -> in-app album. The film strip switches camera packs with
// the §7.2 sequence (black frame -> new look -> frame lines fade in -> typed name); each camera keeps
// its own 36-exposure roll. Also: flash/lens switching, privacy + camera-permission flow, dev panel.
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
import { fitFrame, toCanvasViewport, type Rect } from '../../core/camera/frameLayout';
import { MANIFEST_URL } from '../../core/config';
import { detectTier, useFrostedGlass, type DeviceTier } from '../../core/device/DeviceTier';
import type { ExportCanvas } from '../../core/camera/exportImage';
import { GLRenderer, type LoadableImage, type Viewport, type WebGLCanvasNode } from '../../core/gl/GLRenderer';
import { Pipeline } from '../../core/gl/Pipeline';
import { newShotSeed } from '../../core/gl/shotRandom';
import type { GLTexture } from '../../core/gl/webgl1';
import { AssetCache, cacheBudget, wxCachePlatform } from '../../core/pack/AssetCache';
import type { ResolvedPack } from '../../core/pack/CameraPack';
import { parseAspect } from '../../core/pack/FilterParams';
import { fetchManifest, PackStore } from '../../core/pack/PackStore';
import { PrivacyGate, type PrivacyPresenter } from '../../core/privacy/PrivacyGate';
import { saveToAlbum } from '../../core/storage/albumSaver';
import { loadCurrentPack, saveCurrentPack } from '../../core/storage/cameraPrefs';
import { advanceRoll, formatCounter, loadRolls, rollOf, saveRolls, type RollTable } from '../../core/storage/RollCounter';
import { albumBytes, saveShot } from '../../core/storage/ShotStore';
import { typewrite } from '../../core/ui/typewriter';
import type { StripItem } from '../../components/film-roll-strip/film-roll-strip';
import { buildDevLines, formatCapture, type DevModel, type DevSettings } from './devModel';

type Stage = 'starting' | 'live' | 'privacy-declined' | 'camera-denied' | 'camera-error';

const DEFAULT_PACK = 'sunny-fun';
// Preview frames are ~480x640; a 2x backing store is already sharper than the source.
const MAX_PIXEL_RATIO = 2;
const DEV_REFRESH_MS = 500;
const GOVERNOR_TICK_MS = 1000;
// Grain stays put for a third of a second, like film flickering frame to frame (CLAUDE.md §3).
const GRAIN_HOLD_MS = 333;
// Matches --dur-mirror-flash: one dark frame like a mirror slapping up.
const MIRROR_FLASH_MS = 80;
// Gap between the frame and the status row / controls, matching --sp-1.
const FRAME_GAP_PX = 8;
// Matches --dur-swap-black: the viewfinder stays black at least this long while a camera loads.
const SWAP_BLACK_MS = 120;
const TYPE_STEP_MS = 35;
// Space between the format glyph and the capsule menu button, matching --sp-1.
const CAPSULE_GAP_PX = 8;
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
  statusRight: number;
  accent: string;
  packId: string;
  stripItems: StripItem[];
  stripSolid: boolean;
  frame: Rect;
  counter: string;
  title: string;
  format: string;
  swapBlack: boolean;
  linesHidden: boolean;
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
  store: PackStore;
  pack: ResolvedPack;
  /** Local path of the loaded pack's LUT; '' until it has loaded. */
  lutPath: string;
  rolls: RollTable;
  switching: boolean;
  pendingPackId: string;
  cancelTyping: () => void;
  windowWidth: number;
  controlsTop: number;
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
  measureControls(done?: () => void): void;
  layoutFrame(): void;
  stripItems(): StripItem[];
  loadLut(pack: ResolvedPack, renderer: GLRenderer): Promise<{ path: string; image: LoadableImage }>;
  applyLook(pack: ResolvedPack, path: string, image: LoadableImage | null): void;
  showPack(pack: ResolvedPack, typed: boolean): void;
  setStripProgress(id: string, progress: number): void;
  onSelectPack(event: WechatMiniprogram.CustomEvent<{ id: string }>): void;
  switchTo(id: string): void;
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
    statusRight: 0,
    accent: '',
    packId: '',
    stripItems: [],
    stripSolid: false,
    frame: { left: 0, top: 0, width: 0, height: 0 },
    counter: '',
    title: '',
    format: '3:4',
    swapBlack: false,
    linesHidden: false,
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
    const store = new PackStore(new AssetCache(wxCachePlatform(), () => cacheBudget(albumBytes())));
    const packs = store.list();
    const pack = store.get(loadCurrentPack()) ?? store.get(DEFAULT_PACK) ?? packs[0];
    if (!pack) throw new Error('no camera packs: ' + store.problems.join('; '));
    const window = wx.getWindowInfo();
    this.runtime = {
      feed: new FrameFeed((frame) => this.drawFrame(frame)),
      capture: new ShotCapture(),
      presenter: {
        showPrivacySheet: (contractName) => this.setData({ privacySheetVisible: true, privacyContractName: contractName }),
        hidePrivacySheet: () => this.setData({ privacySheetVisible: false }),
      },
      store,
      pack,
      lutPath: '',
      rolls: loadRolls(),
      switching: false,
      pendingPackId: '',
      cancelTyping: () => undefined,
      windowWidth: window.windowWidth,
      controlsTop: window.windowHeight,
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
      this.setData({ stripSolid: !useFrostedGlass(tier, wx.getDeviceInfo().platform) });
    });

    // Custom navigation: align the status row with the capsule menu button.
    const menu = wx.getMenuButtonBoundingClientRect();
    this.setData({
      statusTop: menu.top,
      statusHeight: menu.height,
      statusRight: window.windowWidth - menu.left + CAPSULE_GAP_PX,
      stripItems: this.stripItems(),
      devAvailable: wx.getAccountInfoSync().miniProgram.envVersion !== 'release',
    });
    this.showPack(pack, false);

    if (MANIFEST_URL) {
      // Remote packs join the strip when the CDN answers; offline, the built-in and cached ones remain.
      fetchManifest(MANIFEST_URL).then((manifest) => {
        const problems = store.addRemote(manifest);
        if (problems.length) this.pushResults(problems.map((p) => `清单：${p}`));
        this.setData({ stripItems: this.stripItems() });
      }, (error: unknown) => this.pushResults([`清单获取失败：${String(error)}`]));
    }

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
    this.runtime.cancelTyping();
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
        else this.setData({ stage: 'live', cameraMounted: true }, () => this.measureControls());
      },
      fail: () => this.setData({ stage: 'live', cameraMounted: true }, () => this.measureControls()),
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
      .select('#controls').boundingClientRect()
      .exec((results: Array<{ node?: unknown; width?: number; height?: number; top?: number } | null>) => {
        const [glInfo, exportInfo, controls] = results;
        const runtime = this.runtime;
        runtime.exportCanvas = (exportInfo?.node as ExportCanvas | undefined) ?? null;
        if (controls?.top) runtime.controlsTop = controls.top;
        if (glInfo?.node && glInfo.width && glInfo.height) {
          runtime.pixelRatio = Math.min(wx.getWindowInfo().pixelRatio, MAX_PIXEL_RATIO);
          runtime.canvasWidth = Math.round(glInfo.width * runtime.pixelRatio);
          runtime.canvasHeight = Math.round(glInfo.height * runtime.pixelRatio);
          runtime.renderer = GLRenderer.create(glInfo.node as WebGLCanvasNode, runtime.canvasWidth, runtime.canvasHeight);
        }
        this.layoutFrame();
        const renderer = runtime.renderer;
        if (!renderer) {
          // Without WebGL the canvas is removed and the native camera preview underneath stays usable.
          this.setData({ glFailed: true });
          done();
          return;
        }
        runtime.pipeline = new Pipeline(renderer);
        runtime.frameTexture = renderer.createTexture();
        // Until the LUT arrives the pipeline shows the raw frame.
        const pack = runtime.pack;
        this.loadLut(pack, renderer).then(({ path, image }) => {
          if (runtime.renderer !== renderer || runtime.pack !== pack) return;
          this.applyLook(pack, path, image);
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

  measureControls(done) {
    wx.createSelectorQuery().select('#controls').boundingClientRect().exec((results: Array<{ top?: number } | null>) => {
      const top = results[0]?.top;
      if (top) this.runtime.controlsTop = top;
      this.layoutFrame();
      done?.();
    });
  },

  // Frame between the status row and the controls, in the current pack's aspect ratio.
  layoutFrame() {
    const runtime = this.runtime;
    const top = this.data.statusTop + this.data.statusHeight + FRAME_GAP_PX;
    const area = { left: 0, top, width: runtime.windowWidth, height: Math.max(0, runtime.controlsTop - FRAME_GAP_PX - top) };
    const frame = fitFrame(area, parseAspect(runtime.pack.filter.frame.aspectRatio));
    if (runtime.canvasHeight) runtime.frameRect = toCanvasViewport(frame, runtime.pixelRatio, runtime.canvasHeight);
    this.setData({ frame });
  },

  stripItems() {
    const { store } = this.runtime;
    let series = '';
    return store.list().map((pack) => {
      const seriesStart = pack.series.id !== series;
      series = pack.series.id;
      // Entitlement (free tier, daily trial, unlocks) arrives in M5; until then the badge is display only.
      return { id: pack.id, name: pack.name, thumb: store.thumbSource(pack), locked: !pack.free, seriesStart, progress: -1 };
    });
  },

  loadLut(pack, renderer) {
    const keep = this.runtime.pack.assets.lut ? [this.runtime.pack.assets.lut.sha256] : [];
    const remote = !this.runtime.store.isReady(pack);
    return this.runtime.store
      .lutSource(pack, remote ? (progress) => this.setStripProgress(pack.id, progress) : undefined, keep)
      .then((path) => renderer.loadImage(path).then((image) => ({ path, image })))
      .finally(() => {
        if (remote) this.setStripProgress(pack.id, -1);
      });
  },

  applyLook(pack, path, image) {
    const runtime = this.runtime;
    const { renderer, pipeline } = runtime;
    if (renderer && pipeline && image) {
      runtime.lutTexture = runtime.lutTexture ?? renderer.createTexture();
      renderer.uploadImage(runtime.lutTexture, image);
      pipeline.setLook(pack.filter, runtime.lutTexture);
    }
    runtime.lutPath = path;
  },

  // Status row, accent and frame for `pack`; `typed` plays the typewriter on the name.
  showPack(pack, typed) {
    const runtime = this.runtime;
    runtime.cancelTyping();
    this.setData({
      packId: pack.id,
      accent: pack.ui.themeColor,
      counter: formatCounter(rollOf(runtime.rolls, pack.id)),
      format: pack.filter.frame.aspectRatio,
      title: typed ? '' : pack.latinName,
    });
    this.layoutFrame();
    if (typed) runtime.cancelTyping = typewrite(pack.latinName, TYPE_STEP_MS, (title) => this.setData({ title }));
  },

  setStripProgress(id, progress) {
    const index = this.data.stripItems.findIndex((item) => item.id === id);
    if (index >= 0) this.setData({ [`stripItems[${index}].progress`]: progress });
  },

  onSelectPack(event) {
    this.switchTo(event.detail.id);
  },

  // §7.2 swap: cut to black and fade the frame lines, load the LUT (at least SWAP_BLACK_MS), apply the
  // new look and frame, then fade back in while the name types out. Requests during a swap queue up.
  switchTo(id) {
    const runtime = this.runtime;
    if (runtime.switching) {
      runtime.pendingPackId = id;
      return;
    }
    const pack = runtime.store.get(id);
    if (!pack || pack.id === runtime.pack.id) return;
    const previous = runtime.pack;
    runtime.switching = true;
    wx.vibrateShort({ type: 'light' });
    this.setData({ packId: id, swapBlack: true, linesHidden: true });

    const renderer = runtime.renderer;
    const started = Date.now();
    const loaded = renderer
      ? this.loadLut(pack, renderer)
      : runtime.store.lutSource(pack).then((path) => ({ path, image: null }));
    loaded
      .then(({ path, image }) => new Promise<void>((resolve) => {
        setTimeout(() => {
          // A renderer rebuilt meanwhile (camera remount) loads the current pack's LUT itself.
          runtime.pack = pack;
          this.applyLook(pack, path, runtime.renderer === renderer ? image : null);
          saveCurrentPack(pack.id);
          this.showPack(pack, true);
          resolve();
        }, Math.max(0, SWAP_BLACK_MS - (Date.now() - started)));
      }))
      .catch((error: unknown) => {
        this.pushResults([`换机失败 ${pack.id}：${error instanceof Error ? error.message : String(error)}`]);
        this.setData({ packId: previous.id });
        wx.showToast({ title: '这卷没装上，点一下重试', icon: 'none' });
      })
      .finally(() => {
        runtime.switching = false;
        this.setData({ swapBlack: false, linesHidden: false });
        const next = runtime.pendingPackId;
        runtime.pendingPackId = '';
        if (next && next !== runtime.pack.id) this.switchTo(next);
      });
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
    if (this.data.capturing || runtime.capture.isBusy || runtime.switching || !runtime.exportCanvas || !runtime.lutPath) return;
    wx.vibrateShort({ type: 'heavy' });
    this.setData({ capturing: true, mirrorFlash: true });
    setTimeout(() => this.setData({ mirrorFlash: false }), MIRROR_FLASH_MS);

    // Wind on at the shutter, like a real camera; a failed shot gives the frame back.
    const pack = runtime.pack;
    const before = runtime.rolls;
    const advance = advanceRoll(before, pack.id);
    runtime.rolls = advance.table;
    saveRolls(advance.table);
    this.setData({ counter: formatCounter(rollOf(advance.table, pack.id)) });
    if (advance.finished) wx.showToast({ title: '这卷拍完了 · 已装上新卷', icon: 'none' });

    const seed = newShotSeed();
    runtime.capture.capture({ look: pack.filter, lutSrc: runtime.lutPath, tier: runtime.tier, exportCanvas: runtime.exportCanvas, seed, stampDate: new Date() })
      .then((result) => {
        this.pushResults(formatCapture(result));
        return saveShot(result.tempFilePath, { packId: pack.id, roll: advance.roll, frame: advance.frame, width: result.width, height: result.height, seed });
      })
      .then((record) => this.setData({ lastShotPath: record.path }))
      .catch((error: unknown) => {
        runtime.rolls = before;
        saveRolls(before);
        if (runtime.pack === pack) this.setData({ counter: formatCounter(rollOf(before, pack.id)) });
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
        if (authSetting['scope.camera']) this.setData({ stage: 'live', cameraMounted: true }, () => this.measureControls());
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
      packName: runtime.pack.name,
    }, settings);
    this.setData({ dev: { lines, settings, results: runtime.results } });
  },
});
