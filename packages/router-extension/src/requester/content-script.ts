import {
  MessageRequester,
  Message,
  JSONUint8Array,
} from "@keplr-wallet/router";
import { getKeplrExtensionRouterId } from "../utils";

// The message requester to send the message to the content scripts.
// This will send message to the tab with the content script.
// And, this can't handle the result of the message sending.
// TODO: Research to improve this requester.
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
export class ContentScriptMessageRequester implements MessageRequester {
  async sendMessage<M extends Message<unknown>>(
    port: string,
    msg: M
  ): Promise<M extends Message<infer R> ? R : never> {
    msg.validateBasic();
    // Set message's origin.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    msg["origin"] =
      typeof window !== "undefined"
        ? window.location.origin
        : `chrome-extension://${chrome.runtime.id}`;
    msg.routerMeta = {
      ...msg.routerMeta,
      routerId: getKeplrExtensionRouterId(),
    };

    const wrappedMsg = JSONUint8Array.wrap(msg);

    const alltabs = await getAllTabs();

    const tabs = alltabs.filter((tab) => {
      if (tab.url) {
        return (
          (tab.url.indexOf(chrome.runtime.id) > -1 &&
            tab.url.indexOf("interaction=true&interactionInternal=false") >
              -1) ||
          tab.url.indexOf("mises.site") > -1 ||
          tab.url.indexOf("localhost") > -1
        );
      }
    });

    for (let i = 0; i < tabs.length; i++) {
      const tabId = tabs[i].id;
      if (tabId) {
        try {
          console.log(tabId);
          chrome.tabs.sendMessage(
            tabId,
            {
              port,
              type: msg.type(),
              msg: wrappedMsg,
            },
            (result) => {
              console.log(result, "chrome.tabs.sendMessage: success");
            }
          );
          console.log(tabId, "chrome.tabs.sendMessage");
          // Ignore the failure
        } catch (e) {
          console.log(e);
        }
      }
    }

    // This requester can't handle the result of the message.
    return undefined as any;
  }
}
