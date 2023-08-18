import { Bech32Address } from "@keplr-wallet/cosmos";
import { ChainInfo } from "@keplr-wallet/types";

export const EmbedChainInfos: ChainInfo[] = [
  {
    rpc: "http://127.0.0.1:26657",
    rest: "https://rest.gw.mises.site",
    chainId: "mainnet",
    chainName: "Mises Network",
    stakeCurrency: {
      coinDenom: "MIS",
      coinMinimalDenom: "umis",
      coinDecimals: 6,
      coinGeckoId: "mises",
    },
    walletUrl: "https://portal.mises.site/",
    walletUrlForStaking: "https://portal.mises.site/",
    bip44: {
      coinType: 60,
    },
    bech32Config: Bech32Address.defaultBech32Config("mises"),
    currencies: [
      {
        coinDenom: "MIS",
        coinMinimalDenom: "umis",
        coinDecimals: 6,
        coinGeckoId: "mises",
      },
    ],
    feeCurrencies: [
      {
        coinDenom: "MIS",
        coinMinimalDenom: "umis",
        coinDecimals: 6,
        coinGeckoId: "mises",
      },
    ],
    coinType: 60,
    features: ["ibc-transfer", "ibc-go"],
  },
];

// The origins that are able to pass any permission that external webpages can have.
export const PrivilegedOrigins: string[] = [];
export const CommunityChainInfoRepo = {};
