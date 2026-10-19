import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Resolve = (option: Record<string, unknown>) => void;
type Listener = (resolve: Resolve, info: { referrer: string }) => void;

let needAuthorization = true;
let listener: Listener | null = null;

beforeEach(() => {
  vi.resetModules();
  needAuthorization = true;
  listener = null;
  vi.stubGlobal('wx', {
    onNeedPrivacyAuthorization: (fn: Listener) => { listener = fn; },
    getPrivacySetting: ({ success }: { success: (res: { needAuthorization: boolean; privacyContractName: string }) => void }) =>
      success({ needAuthorization, privacyContractName: '《测试隐私保护指引》' }),
    openPrivacyContract: vi.fn(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function loadGate() {
  const module = await import('../miniprogram/core/privacy/PrivacyGate');
  const presenter = { showPrivacySheet: vi.fn(), hidePrivacySheet: vi.fn() };
  module.PrivacyGate.install();
  return { ...module, presenter };
}

describe('PrivacyGate', () => {
  it('resolves ensure() immediately when no agreement is needed', async () => {
    needAuthorization = false;
    const { PrivacyGate, presenter } = await loadGate();
    PrivacyGate.attach(presenter);
    await expect(PrivacyGate.ensure()).resolves.toBe(true);
    expect(presenter.showPrivacySheet).not.toHaveBeenCalled();
  });

  it('shows the sheet with the contract name and resolves true on agree', async () => {
    const { PrivacyGate, presenter } = await loadGate();
    PrivacyGate.attach(presenter);
    const pending = PrivacyGate.ensure();
    expect(presenter.showPrivacySheet).toHaveBeenCalledWith('《测试隐私保护指引》');
    PrivacyGate.agree();
    await expect(pending).resolves.toBe(true);
    expect(presenter.hidePrivacySheet).toHaveBeenCalled();
  });

  it('resolves false on disagree', async () => {
    const { PrivacyGate, presenter } = await loadGate();
    PrivacyGate.attach(presenter);
    const pending = PrivacyGate.ensure();
    PrivacyGate.disagree();
    await expect(pending).resolves.toBe(false);
  });

  it('answers platform requests: exposure when shown, then agree with the button id', async () => {
    const { PrivacyGate, presenter, AGREE_BUTTON_ID } = await loadGate();
    PrivacyGate.attach(presenter);
    const resolve = vi.fn();
    listener?.(resolve, { referrer: 'saveImageToPhotosAlbum' });
    expect(presenter.showPrivacySheet).toHaveBeenCalledTimes(1);
    expect(resolve).toHaveBeenCalledWith({ event: 'exposureAuthorization' });
    PrivacyGate.agree();
    expect(resolve).toHaveBeenLastCalledWith({ event: 'agree', buttonId: AGREE_BUTTON_ID });
  });

  it('holds requests until a page attaches, and settles all of them together', async () => {
    const { PrivacyGate, presenter } = await loadGate();
    const first = vi.fn();
    const second = vi.fn();
    listener?.(first, { referrer: 'camera' });
    listener?.(second, { referrer: 'saveImageToPhotosAlbum' });
    expect(presenter.showPrivacySheet).not.toHaveBeenCalled();
    PrivacyGate.attach(presenter);
    expect(presenter.showPrivacySheet).toHaveBeenCalledTimes(1);
    PrivacyGate.disagree();
    expect(first).toHaveBeenLastCalledWith({ event: 'disagree' });
    expect(second).toHaveBeenLastCalledWith({ event: 'disagree' });
  });
});
