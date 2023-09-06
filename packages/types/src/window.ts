import { Keplr } from "./wallet";
import { OfflineAminoSigner, OfflineDirectSigner } from "./cosmjs";
import { SecretUtils } from "./secretjs";

export interface Window {
  misesWallet?: Keplr;
  Keplr?: Keplr;
  misesModule: {
    getWindowInformation: () => void;
  };
  $misesShare?: any;
  getOfflineSigner?: (
    chainId: string
  ) => OfflineAminoSigner & OfflineDirectSigner;
  getOfflineSignerOnlyAmino?: (chainId: string) => OfflineAminoSigner;
  getOfflineSignerAuto?: (
    chainId: string
  ) => Promise<OfflineAminoSigner | OfflineDirectSigner>;
  getEnigmaUtils?: (chainId: string) => SecretUtils;
}
