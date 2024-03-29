import { init, ScryptParams } from "@keplr-wallet/background";
import {
  RNEnv,
  RNMessageRequesterInternalToUI,
  RNRouterBackground,
} from "../router";
import { AsyncKVStore } from "../common";
import scrypt from "react-native-scrypt";
import { Buffer } from "buffer/";
import { getRandomBytesAsync } from "../common";
import { BACKGROUND_PORT } from "@keplr-wallet/router";

import { CommunityChainInfoRepo, EmbedChainInfos } from "../config";

const router = new RNRouterBackground(RNEnv.produceEnv);

init(
  router,
  (prefix: string) => new AsyncKVStore(prefix),
  new RNMessageRequesterInternalToUI(),
  EmbedChainInfos,
  [
    "https://app.osmosis.zone",
    "https://www.stargaze.zone",
    "https://app.umee.cc",
    "https://junoswap.com",
    "https://frontier.osmosis.zone",
  ],
  [],
  CommunityChainInfoRepo,
  {
    rng: getRandomBytesAsync,
    scrypt: async (text: string, params: ScryptParams) => {
      return Buffer.from(
        await scrypt(
          Buffer.from(text).toString("hex"),
          // Salt is expected to be encoded as Hex
          params.salt,
          params.n,
          params.r,
          params.p,
          params.dklen,
          "hex"
        ),
        "hex"
      );
    },
  },
  {
    create: (params: {
      iconRelativeUrl?: string;
      title: string;
      message: string;
    }) => {
      console.log(`Notification: ${params.title}, ${params.message}`);
    },
  },
  {
    suggestChain: {
      useMemoryKVStore: true,
    },
  }
);

router.listen(BACKGROUND_PORT);
