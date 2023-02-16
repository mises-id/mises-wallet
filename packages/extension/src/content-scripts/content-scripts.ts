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

injectedScript.src = browser.runtime.getURL("injectedScript.bundle.js");
injectedScript.type = "text/javascript";
container.insertBefore(injectedScript, container.children[0]);
injectedScript.remove();

document.addEventListener("DOMContentLoaded", () => {
  initPostMsgClient();
  const body = document.body;
  const injectedMisesScript = document.createElement("script");
  injectedMisesScript.src = browser.runtime.getURL(
    "safeInjectedScript.bundle.js"
  );
  injectedMisesScript.type = "text/javascript";
  body.appendChild(injectedMisesScript);
  injectedMisesScript.remove();
});

// export class CheckURLIsPhishingMsg extends Message<boolean> {
//   public static type() {
//     return "check-url-is-phishing";
//   }

//   constructor() {
//     super();
//   }

//   validateBasic(): void {
//     // Will be checked in background process
//   }

//   approveExternal(): boolean {
//     return true;
//   }

//   route(): string {
//     return "phishing-list";
//   }

//   type(): string {
//     return CheckURLIsPhishingMsg.type();
//   }
// }

// export class CheckBadTwitterIdMsg extends Message<boolean> {
//   public static type() {
//     return "check-bad-twitter-id";
//   }

//   constructor(public readonly id: string) {
//     super();
//   }

//   validateBasic(): void {
//     // noop
//   }

//   approveExternal(): boolean {
//     return true;
//   }

//   route(): string {
//     return "phishing-list";
//   }

//   type(): string {
//     return CheckBadTwitterIdMsg.type();
//   }
// }

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
// const url = new URL(window.location.href);
// // If host is localhost, no need to check validity of domain.
// if (url.hostname !== "localhost") {
//   new InExtensionMessageRequester()
//     .sendMessage(BACKGROUND_PORT, new CheckURLIsPhishingMsg())
//     .then((r) => {
//       if (r) {
//         const origin = window.location.href;
//         window.location.replace(
//           browser.runtime.getURL(`/blocklist.html?origin=${origin}`)
//         );
//       }
//     })
//     .catch((e) => {
//       console.log("Failed to check domain's reliability", e);
//     });
// }

// if (url.hostname === "twitter.com") {
//   if (typeof MutationObserver !== "undefined") {
//     let previousUrl: string = "";
//     const observer = new MutationObserver(() => {
//       if (window.location.href !== previousUrl) {
//         previousUrl = window.location.href;

//         const url = new URL(window.location.href);
//         const paths = url.pathname
//           .split("/")
//           .map((path) => path.trim())
//           .filter((path) => path.length > 0);

//         if (paths.length > 0) {
//           let id = paths[0];
//           if (id.startsWith("@")) {
//             id = id.slice(1);
//           }

//           new InExtensionMessageRequester()
//             .sendMessage(BACKGROUND_PORT, new CheckBadTwitterIdMsg(id))
//             .then((r) => {
//               if (r) {
//                 alert(`Phishing Alert
// @${id} is detected as Mises's phishing account.
// This twitter account has malicious intent so recommend you not to interact with it.`);
//               }
//             })
//             .catch((e) => {
//               console.log("Failed to check twitter id's reliability", e);
//             });
//         }
//       }
//     });
//     observer.observe(document, { subtree: true, childList: true });

//     window.addEventListener("beforeunload", () => {
//       observer.disconnect();
//     });
//   }
// }

// mises-safe

const postMsg = (id: any, res: unknown) => {
  const targetOrigin = window.location.origin;
  // const resp = JSON.parse(JSON.stringify(res));
  // const resultData = res as any;
  const contentToProxyMessage = {
    type: "mises-safe-proxy-request-response",
    id,
    result: { return: res },
  };
  console.log(
    "content post background message to proxy :>>",
    contentToProxyMessage,
    targetOrigin
  );
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
    console.log("content start sending message to background :>>", e.data);
    const res = await new InExtensionMessageRequester().sendMessage(
      BACKGROUND_PORT,
      new VerifyDomainMsg(e.data)
    );
    // // const res = await contentClient.sendMessage(new ChromeMessageRequest('mises-content-request', e.data));
    // // post msg back to proxyClient
    console.log("background start sending message to :>>", res);
    // //this.postMsg(res);
    postMsg(e.data.id, res);
  });
};
