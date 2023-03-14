import { WEBPAGE_PORT, Message, BACKGROUND_PORT } from "@keplr-wallet/router";
import {
  ContentScriptEnv,
  ContentScriptGuards,
  ExtensionRouter,
  InExtensionMessageRequester,
} from "@keplr-wallet/router-extension";
import { Keplr, InjectedKeplr } from "@keplr-wallet/provider";
import { initEvents } from "./events";

import manifest from "../manifest.json";

InjectedKeplr.startProxy(
  new Keplr(manifest.version, "core", new InExtensionMessageRequester())
);

const router = new ExtensionRouter(ContentScriptEnv.produceEnv);
router.addGuard(ContentScriptGuards.checkMessageIsInternal);
initEvents(router);
router.listen(WEBPAGE_PORT);

const container = document.head || document.documentElement;
const injectedScript = document.createElement("script");

injectedScript.src = chrome.runtime.getURL("injectedScript.bundle.js");
injectedScript.type = "text/javascript";
container.insertBefore(injectedScript, container.children[0]);
injectedScript.remove();
document.addEventListener("DOMContentLoaded", () => {
  initPostMsgClient();
  const body = document.body;
  const injectedMisesScript = document.createElement("script");
  injectedMisesScript.src = chrome.runtime.getURL(
    "safeInjectedScript.bundle.js"
  );
  injectedMisesScript.type = "text/javascript";
  body.appendChild(injectedMisesScript);
  injectedMisesScript.remove();
});

export class VerifyDomainMsg extends Message<any> {
  public static type() {
    return "verify-domain";
  }

  constructor(public readonly params: any) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  validateBasic(): void {
    // noop
  }

  approveExternal(): boolean {
    return true;
  }

  route(): string {
    return "mises-safe";
  }

  type(): string {
    return VerifyDomainMsg.type();
  }
}
// mises-safe

const postMsg = (id: any, res: unknown) => {
  const targetOrigin = window.location.origin;
  const contentToProxyMessage = {
    type: "mises-safe-proxy-request-response",
    id,
    result: { return: res },
  };
  window.postMessage(contentToProxyMessage, targetOrigin);
};

const initPostMsgClient = async () => {
  window.addEventListener("message", async (e) => {
    // 监听 message 事件
    if (e.origin !== window.location.origin) {
      // 验证消息来源地址
      return;
    }
    if (!e.data || e.data.type !== "mises-proxy-request") {
      return;
    }
    if (typeof e.data.method === "undefined") {
      return;
    }
    if (e.data.method === "consoleLog") {
      console.log("content consoleLog:>>", e.data);
      return;
    }
    const res = await new InExtensionMessageRequester().sendMessage(
      BACKGROUND_PORT,
      new VerifyDomainMsg(e.data)
    );
    //post msg back to proxyClient
    //this.postMsg(res);
    postMsg(e.data.id, res);
  });
};
