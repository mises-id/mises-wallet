import { KVStore } from "@keplr-wallet/common";
import { KeyRingStatus } from "../keyring";
import { BACKGROUND_PORT, MessageRequester } from "@keplr-wallet/router";
import { KeepAliveMsg } from "./messages";

export class AutoLockAccountService {
  protected keyringService!: {
    lock: () => void;
    readonly keyRingStatus: KeyRingStatus;
  };

  // Unit: ms
  protected autoLockDuration: number = 15 * 60 * 1000;

  // Unit: ms
  protected keepAliveDuration: number = 15 * 1000;

  protected appStateCheckTimer: NodeJS.Timeout | null = null;

  protected autoLockTimer: NodeJS.Timeout | null = null;

  protected keepAliveTimer: NodeJS.Timeout | null = null;

  constructor(
    protected readonly kvStore: KVStore,
    protected readonly eventMsgRequester: MessageRequester,
    protected readonly opts: {
      readonly monitoringInterval: number;
    } = {
      monitoringInterval: 10000,
    }
  ) {}

  async init(keyringService: {
    lock: () => void;
    readonly keyRingStatus: KeyRingStatus;
  }) {
    this.keyringService = keyringService;
    if (typeof browser !== "undefined") {
      browser.idle.onStateChanged.addListener((idle) => {
        this.stateChangedHandler(idle);
      });
    }

    await this.loadDuration();
  }

  private stateChangedHandler(newState: any) {
    if (this.autoLockDuration > 0) {
      if ((newState as any) === "locked") {
        this.stopAppStateCheckTimer();
        this.stopAutoLockTimer();
        this.lock();
      }
    }
  }

  startAppStateCheckTimer() {
    if (this.autoLockDuration > 0 && this.keyRingIsUnlocked) {
      this.stopAutoLockTimer();
      this.startAutoLockTimer();
    }
  }

  private stopAppStateCheckTimer() {
    if (this.appStateCheckTimer != null) {
      clearTimeout(this.appStateCheckTimer);
      this.appStateCheckTimer = null;
    }
  }

  public checkAppIsActive(): boolean {
    // const background = browser.extension.getBackgroundPage();
    // const views = browser.extension.getViews();
    // if (background) {
    //   for (const view of views) {
    //     if (background.location.href !== view.location.href) {
    //       return true;
    //     }
    //   }
    // } else if (views.length > 0) {
    //   return true;
    // }
    return false;
  }

  private startAutoLockTimer() {
    if (!this.keyRingIsUnlocked) {
      throw new Error("Keyring is not unlocked");
    }

    if (this.autoLockDuration <= 0) {
      return;
    }

    this.autoLockTimer = setTimeout(() => {
      this.stopAppStateCheckTimer();
      this.stopAutoLockTimer();
      this.lock();
    }, this.autoLockDuration);
  }

  private stopAutoLockTimer() {
    if (this.autoLockTimer != null) {
      clearTimeout(this.autoLockTimer);
      this.autoLockTimer = null;
    }
  }

  public async lock() {
    if (this.keyRingIsUnlocked) {
      this.keyringService.lock();
      if (typeof browser !== "undefined") {
        let tabs = await browser.tabs.query({
          discarded: false,
          status: "complete",
        });
        tabs = tabs.filter(
          (val) => val.url && val.url.indexOf(browser.runtime.id) > -1
        );
        for (const tab of tabs) {
          browser.tabs.reload(tab.id);
        }
      }
    }
  }

  get keyRingIsUnlocked(): boolean {
    if (this.keyringService == null) {
      throw new Error("Keyring service is null");
    }

    return this.keyringService.keyRingStatus === KeyRingStatus.UNLOCKED;
  }

  public getAutoLockDuration(): number {
    return this.autoLockDuration;
  }

  public setDuration(duration: number): Promise<void> {
    this.autoLockDuration = duration;

    if (duration <= 0) {
      this.stopAppStateCheckTimer();
      this.stopAutoLockTimer();
    }

    return this.kvStore.set("autoLockDuration", duration);
  }

  private async loadDuration() {
    const duration = await this.kvStore.get<number>("autoLockDuration");

    if (duration == null) {
      this.autoLockDuration = 15 * 60 * 1000;
    } else {
      this.autoLockDuration = duration;
    }
  }

  public keepAlive() {
    this.clearKeepAliveTimer();
    if (this.keyRingIsUnlocked) {
      this.keepAliveTimer = setTimeout(() => {
        const msg = new KeepAliveMsg();
        this.eventMsgRequester.sendMessage(BACKGROUND_PORT, msg).finally(() => {
          console.log("keepAlive");
          this.keepAlive();
        });
      }, this.keepAliveDuration);
    }
  }

  private clearKeepAliveTimer() {
    if (this.keepAliveTimer) {
      clearTimeout(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }
}
