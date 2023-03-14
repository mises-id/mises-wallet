import { KVStore } from "@keplr-wallet/common";
import { KeyRingStatus } from "../keyring";

export class AutoLockAccountService {
  protected keyringService!: {
    lock: () => void;
    readonly keyRingStatus: KeyRingStatus;
  };

  // Unit: ms
  protected autoLockDuration: number = 15 * 60 * 1000;

  protected appStateCheckTimer: NodeJS.Timeout | null = null;

  protected autoLockTimer: NodeJS.Timeout | null = null;

  constructor(
    protected readonly kvStore: KVStore,
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

    chrome.idle.onStateChanged.addListener((idle) => {
      this.stateChangedHandler(idle);
    });

    await this.loadDuration();
  }

  private stateChangedHandler(newState: string) {
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
      await chrome.tabs.query(
        {
          discarded: false,
          status: "complete",
        },
        (tabs) => {
          tabs = tabs.filter(
            (val) => val.url && val.url.indexOf(chrome.runtime.id) > -1
          );
          for (const tab of tabs) {
            tab.id && chrome.tabs.reload(tab.id, {});
          }
        }
      );
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
}
