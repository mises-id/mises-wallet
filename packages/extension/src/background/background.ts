importScripts("browser-polyfill.js");
import { BACKGROUND_PORT } from "@keplr-wallet/router";
import {
  ExtensionRouter,
  ExtensionGuards,
  ExtensionEnv,
} from "@keplr-wallet/router-extension";
// import { ExtensionKVStore } from "@keplr-wallet/common";
import { ScryptParams } from "@keplr-wallet/background";
// import scrypt from "scrypt-js";
// import { Buffer } from "buffer/";

import { EmbedChainInfos, PrivilegedOrigins } from "../config";

browser.runtime.onInstalled.addListener(() => {
  console.log("mises wallet installed");
});

const router = new ExtensionRouter(ExtensionEnv.produceEnv);
router.addGuard(ExtensionGuards.checkOriginIsValid);
router.addGuard(ExtensionGuards.checkMessageIsInternal);
router.listen(BACKGROUND_PORT);

const initBackground = async () => {
  // eslint-disable-next-line
  const { ExtensionKVStore } = require("@keplr-wallet/common");
  // eslint-disable-next-line
  const { init } = require("@keplr-wallet/background");
  // eslint-disable-next-line
  const scrypt = require("scrypt-js");
  // eslint-disable-next-line
  const { Buffer } = require("buffer/");
  const {
    ContentScriptMessageRequester,
    // eslint-disable-next-line
  } = require("@keplr-wallet/router-extension");

  init(
    router,
    (prefix: string) => new ExtensionKVStore(prefix),
    new ContentScriptMessageRequester(),
    EmbedChainInfos,
    PrivilegedOrigins,
    {
      rng: (array: any) => {
        return Promise.resolve(crypto.getRandomValues(array));
      },
      scrypt: async (text: string, params: ScryptParams) => {
        return await scrypt.scrypt(
          Buffer.from(text),
          Buffer.from(params.salt, "hex"),
          params.n,
          params.r,
          params.p,
          params.dklen
        );
      },
    },
    {
      create: (params: {
        iconRelativeUrl?: string;
        title: string;
        message: string;
      }) => {
        browser.notifications.create({
          type: "basic",
          iconUrl: params.iconRelativeUrl
            ? browser.runtime.getURL(params.iconRelativeUrl)
            : undefined,
          title: params.title,
          message: params.message,
        });
      },
    }
  );
};

try {
  initBackground();
} catch (e) {
  console.log(e);
}
