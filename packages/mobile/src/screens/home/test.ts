import { Keplr } from "@keplr-wallet/provider";
import { RNMessageRequesterExternal } from "../../router";

export const initWallet = () => {
  const keplr = new Keplr(
    "0.10.10",
    "core",
    new RNMessageRequesterExternal(() => {
      return {
        url: "https://portal.mises.site",
        origin: "https://portal.mises.site",
      };
    })
  );
  return keplr;
};
