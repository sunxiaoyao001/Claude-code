// Privacy agreement flow (base library >= 2.32.3, CLAUDE.md §9-2).
//
// Two entry points share one sheet:
//  - ensure(): asked up front (e.g. before mounting <camera>), via wx.getPrivacySetting;
//  - the global wx.onNeedPrivacyAuthorization listener, for privacy APIs called later
//    (e.g. saveImageToPhotosAlbum), whose calls stay pending until resolve() is called.
// The visible page attaches a presenter that shows the sheet; its agree button must be
// <button open-type="agreePrivacyAuthorization" id={AGREE_BUTTON_ID}>.

export const AGREE_BUTTON_ID = 'privacy-agree';

export interface PrivacyPresenter {
  showPrivacySheet(contractName: string): void;
  hidePrivacySheet(): void;
}

type ResolveEvent =
  | { event: 'agree'; buttonId: string }
  | { event: 'disagree' }
  | { event: 'exposureAuthorization' };
type PrivacyResolve = (option: ResolveEvent) => void;
// miniprogram-api-typings declares the listener as (res) => void; the documented signature is
// (resolve, eventInfo), so the listener is typed here and cast once at registration.
type NeedAuthorizationListener = (resolve: PrivacyResolve, eventInfo: { referrer: string }) => void;

let presenter: PrivacyPresenter | null = null;
let contractName = '';
let sheetVisible = false;
let pendingResolves: PrivacyResolve[] = [];
let pendingEnsures: Array<(agreed: boolean) => void> = [];

function hasPending(): boolean {
  return pendingResolves.length > 0 || pendingEnsures.length > 0;
}

function present(): void {
  if (!presenter || sheetVisible) return;
  sheetVisible = true;
  presenter.showPrivacySheet(contractName);
  for (const resolve of pendingResolves) resolve({ event: 'exposureAuthorization' });
}

function settle(agreed: boolean, buttonId: string): void {
  const resolves = pendingResolves;
  const ensures = pendingEnsures;
  pendingResolves = [];
  pendingEnsures = [];
  sheetVisible = false;
  presenter?.hidePrivacySheet();
  for (const resolve of resolves) resolve(agreed ? { event: 'agree', buttonId } : { event: 'disagree' });
  for (const done of ensures) done(agreed);
}

export const PrivacyGate = {
  /** Registers the global listener once, from app.ts. */
  install(): void {
    const listener: NeedAuthorizationListener = (resolve) => {
      pendingResolves.push(resolve);
      if (sheetVisible) resolve({ event: 'exposureAuthorization' });
      else present();
    };
    wx.onNeedPrivacyAuthorization(listener as unknown as WechatMiniprogram.OnNeedPrivacyAuthorizationCallback);
  },

  /** The page that can show the sheet; call from onShow. Shows the sheet if a request is waiting. */
  attach(next: PrivacyPresenter): void {
    presenter = next;
    sheetVisible = false;
    if (hasPending()) present();
  },

  /** Call from onHide/onUnload. Pending requests wait for the next attached page. */
  detach(previous: PrivacyPresenter): void {
    if (presenter === previous) {
      presenter = null;
      sheetVisible = false;
    }
  },

  /** Resolves true when no agreement is needed or the user agrees, false when they decline. */
  ensure(): Promise<boolean> {
    return new Promise((done) => {
      wx.getPrivacySetting({
        success: (res) => {
          if (!res.needAuthorization) {
            done(true);
            return;
          }
          contractName = res.privacyContractName;
          pendingEnsures.push(done);
          present();
        },
        // Treat a failing query as "not required": the platform still guards each privacy API.
        fail: () => done(true),
      });
    });
  },

  /** Wire to the agree button's bindagreeprivacyauthorization event. */
  agree(): void {
    settle(true, AGREE_BUTTON_ID);
  },

  disagree(): void {
    settle(false, AGREE_BUTTON_ID);
  },

  openContract(): void {
    wx.openPrivacyContract({});
  },
};
