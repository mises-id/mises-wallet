import {
  Env,
  FnRequestInteraction,
  MessageSender,
  APP_PORT,
} from "@keplr-wallet/router";
import {
  openPopupWindow as openPopupWindowInner,
  openPopupTab,
  isMobileStatus,
} from "@keplr-wallet/popup";
import { InExtensionMessageRequester } from "../requester";
const getAllTabs = () => {
  return new Promise<chrome.tabs.Tab[]>((resolve) => {
    chrome.tabs.query(
      {
        discarded: false,
        status: "complete",
      },
      resolve
    );
  });
};

const getTab = (id: number) => {
  return new Promise<chrome.tabs.Tab>((resolve) => {
    chrome.tabs.get(id, resolve);
  });
};

const getWindow = (id: number) => {
  return new Promise<chrome.windows.Window>((resolve) => {
    chrome.windows.get(id, resolve);
  });
};

class PromiseQueue {
  protected workingOnPromise: boolean = false;
  protected queue: {
    fn: () => Promise<unknown>;
    resolve: (result: any) => void;
    reject: (e: any) => void;
  }[] = [];

  enqueue<R>(fn: () => Promise<R>): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      this.queue.push({
        fn,
        resolve,
        reject,
      });

      this.dequeue();
    });
  }

  protected dequeue() {
    if (this.workingOnPromise) {
      return;
    }
    const item = this.queue.shift();
    if (!item) {
      return;
    }

    this.workingOnPromise = true;
    item
      .fn()
      .then((result) => {
        item.resolve(result);
      })
      .catch((e) => {
        item.reject(e);
      })
      .finally(() => {
        this.workingOnPromise = false;
        this.dequeue();
      });
  }
}

const openPopupQueue = new PromiseQueue();

// To handle the opening popup more easily,
// just open the popup one by one.
async function openPopupWindow(
  url: string,
  channel: string = "default"
): Promise<number> {
  return await openPopupQueue.enqueue(() => {
    return isMobileStatus()
      ? openPopupTab(url, channel)
      : openPopupWindowInner(url, channel);
  });
}

export class ExtensionEnv {
  static readonly produceEnv = (
    sender: MessageSender,
    routerMeta: Record<string, any>
  ): Env => {
    const isInternalMsg = ExtensionEnv.checkIsInternalMessage(
      sender,
      chrome.runtime.id,
      chrome.runtime.getURL("/")
    );

    // Add additional query string for letting the extension know it is for interaction.
    const queryString = `interaction=true&interactionInternal=${isInternalMsg}`;

    const openAndSendMsg: FnRequestInteraction = async (url, msg, options) => {
      if (url.startsWith("/")) {
        url = url.slice(1);
      }

      url = chrome.runtime.getURL("/popup.html#/" + url);

      url += `${url.includes("?") ? "&" : "?"}${queryString}`;

      let tabId: number;
      const windowId = await openPopupWindow(url, options?.channel);

      if (!isMobileStatus()) {
        const window = await getWindow(windowId);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        tabId = window.tabs![0].id!;
      } else {
        tabId = windowId;
      }

      // Wait until that tab is loaded
      await (async () => {
        const tab = await getTab(tabId);
        if (tab.status === "complete") {
          console.log("openAndSendMsg-complete");
          return;
        }

        return new Promise<void>((resolve) => {
          chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
            if (tabId === _tabId && changeInfo.status === "complete") {
              console.log("openAndSendMsg");
              resolve();
            }
          });
        });
      })();

      return await InExtensionMessageRequester.sendMessageToTab(
        tabId,
        APP_PORT,
        msg
      );
    };

    if (!isInternalMsg) {
      // If msg is from external (probably from webpage), it opens the popup for extension and send the msg back to the tab opened.
      return {
        isInternalMsg,
        requestInteraction: openAndSendMsg,
      };
    } else {
      // If msg is from the extension itself, it can send the msg back to the extension itself.
      // In this case, this expects that there is only one extension popup have been opened.
      const requestInteraction: FnRequestInteraction = async (
        url,
        msg,
        options
      ) => {
        if (options?.forceOpenWindow) {
          return await openAndSendMsg(url, msg, options);
        }

        if (url.startsWith("/")) {
          url = url.slice(1);
        }

        url = chrome.runtime.getURL("/popup.html#/" + url);

        if (url.includes("?")) {
          url += "&" + queryString;
        } else {
          url += "?" + queryString;
        }
        if (sender.tab?.id) {
          let tabs = await getAllTabs();

          tabs = tabs.filter(
            (val) => val.url && val.url.indexOf(chrome.runtime.id) > -1
          );

          if (tabs.length > 0) {
            for (const tab of tabs) {
              if (tab.id) {
                chrome.tabs.update(tab.id, {
                  url,
                });
              }
            }
          }
        }

        msg.routerMeta = {
          ...msg.routerMeta,
          receiverRouterId: routerMeta.routerId,
        };

        return await new InExtensionMessageRequester().sendMessage(
          APP_PORT,
          msg
        );
      };

      return {
        isInternalMsg,
        requestInteraction,
      };
    }
  };

  public static readonly checkIsInternalMessage = (
    sender: MessageSender,
    extensionId: string,
    extensionUrl: string
  ): boolean => {
    if (!sender.url) {
      throw new Error("Empty sender url");
    }
    const url = new URL(sender.url);
    if (!url.origin || url.origin === "null") {
      throw new Error("Invalid sender url");
    }

    const browserURL = new URL(extensionUrl);
    if (!browserURL.origin || browserURL.origin === "null") {
      throw new Error("Invalid browser url");
    }

    if (url.origin !== browserURL.origin) {
      return false;
    }

    return sender.id === extensionId;
  };
}
