import {
  ChainInfo,
  EthSignType,
  Keplr,
  Keplr as IKeplr,
  KeplrIntereactionOptions,
  KeplrMode,
  KeplrSignOptions,
  Key,
  BroadcastMode,
  AminoSignResponse,
  StdSignDoc,
  OfflineAminoSigner,
  StdSignature,
  StdTx,
  DirectSignResponse,
  OfflineDirectSigner,
  MisesAccountData,
  ICNSAdr36Signatures,
  ChainInfoWithoutEndpoints,
  SecretUtils,
} from "@keplr-wallet/types";
import { Result, JSONUint8Array } from "@keplr-wallet/router";
import { KeplrEnigmaUtils } from "./enigma";
import { CosmJSOfflineSigner, CosmJSOfflineSignerOnlyAmino } from "./cosmjs";
import deepmerge from "deepmerge";
import Long from "long";
import { MisesWeb3Client } from "./mises";
import { KeplrCoreTypes } from "./core-types";

export interface ProxyRequest {
  type: "mises-proxy-request";
  id: string;
  method: keyof (Keplr & KeplrCoreTypes);
  args: any[];
}

export interface ProxyRequestResponse {
  type: "mises-proxy-request-response";
  id: string;
  result: Result | undefined;
}

function defineUnwritablePropertyIfPossible(o: any, p: string, value: any) {
  const descriptor = Object.getOwnPropertyDescriptor(o, p);
  if (!descriptor || descriptor.writable) {
    if (!descriptor || descriptor.configurable) {
      Object.defineProperty(o, p, {
        value,
        writable: false,
      });
    } else {
      o[p] = value;
    }
  } else {
    console.warn(
      `Failed to inject ${p} from keplr. Probably, other wallet is trying to intercept Keplr`
    );
  }
}

const __getLargeImg = () => {
  let img;
  const nodeList = document.getElementsByTagName("img");
  for (let i = 0; i < nodeList.length; i++) {
    const node = nodeList[i];
    let h = node.naturalHeight;
    let w = node.naturalWidth;
    if (h === 0 || w === 0) {
      h = node.height;
      w = node.width;
    }
    if (h >= 200 && w >= 300) {
      img = nodeList[i];
      if (img && img.src && img.src.toLowerCase().startsWith("http")) {
        break;
      }
    }
  }
  return img && img.src;
};

const __getFavicon = () => {
  let favicon;
  const nodeList = document.getElementsByTagName("link");
  for (let i = 0; i < nodeList.length; i++) {
    const rel = nodeList[i].getAttribute("rel");
    if (
      rel === "icon" ||
      rel === "shortcut icon" ||
      rel === "icon shortcut" ||
      rel === "apple-touch-icon"
    ) {
      favicon = nodeList[i];
    }
  }
  return favicon && favicon.href;
};

export function injectKeplrToWindow(keplr: IKeplr): void {
  defineUnwritablePropertyIfPossible(window, "misesWallet", keplr);
  defineUnwritablePropertyIfPossible(window, "misesModule", {
    getWindowInformation() {
      // const config = window.$misesShare;
      const url = window.location.href;
      const icon = __getLargeImg() || __getFavicon();
      const { title } = window.document;

      console.log({ url, icon, title });
      return { url, icon, title };
    },
  });
  defineUnwritablePropertyIfPossible(
    window,
    "getOfflineSigner",
    keplr.getOfflineSigner
  );
  defineUnwritablePropertyIfPossible(
    window,
    "getOfflineSignerOnlyAmino",
    keplr.getOfflineSignerOnlyAmino
  );
  defineUnwritablePropertyIfPossible(
    window,
    "getOfflineSignerAuto",
    keplr.getOfflineSignerAuto
  );
  defineUnwritablePropertyIfPossible(
    window,
    "getEnigmaUtils",
    keplr.getEnigmaUtils
  );
  defineUnwritablePropertyIfPossible(
    window,
    "MisesWeb3Client",
    keplr.misesWeb3Client
  );
}

/**
 * InjectedKeplr would be injected to the webpage.
 * In the webpage, it can't request any messages to the extension because it doesn't have any API related to the extension.
 * So, to request some methods of the extension, this will proxy the request to the content script that is injected to webpage on the extension level.
 * This will use `window.postMessage` to interact with the content script.
 */
export class InjectedKeplr implements IKeplr, KeplrCoreTypes {
  static startProxy(
    keplr: IKeplr & KeplrCoreTypes,
    eventListener: {
      addMessageListener: (fn: (e: any) => void) => void;
      postMessage: (message: any) => void;
    } = {
      addMessageListener: (fn: (e: any) => void) =>
        window.addEventListener("message", fn),
      postMessage: (message) =>
        window.postMessage(message, window.location.origin),
    },
    parseMessage?: (message: any) => any
  ) {
    eventListener.addMessageListener(async (e: any) => {
      const message: ProxyRequest = parseMessage
        ? parseMessage(e.data)
        : e.data;
      if (!message || message.type !== "mises-proxy-request") {
        return;
      }
      try {
        if (!message.id) {
          throw new Error("Empty id");
        }

        if (message.method === "version") {
          throw new Error("Version is not function");
        }

        if (message.method === "mode") {
          throw new Error("Mode is not function");
        }

        if (message.method === "defaultOptions") {
          throw new Error("DefaultOptions is not function");
        }

        if (
          !keplr[message.method] ||
          typeof keplr[message.method] !== "function"
        ) {
          throw new Error(`Invalid method: ${message.method}`);
        }

        if (message.method === "getOfflineSigner") {
          throw new Error("GetOfflineSigner method can't be proxy request");
        }

        if (message.method === "getOfflineSignerOnlyAmino") {
          throw new Error(
            "GetOfflineSignerOnlyAmino method can't be proxy request"
          );
        }

        if (message.method === "getOfflineSignerAuto") {
          throw new Error("GetOfflineSignerAuto method can't be proxy request");
        }

        if (message.method === "getEnigmaUtils") {
          throw new Error("GetEnigmaUtils method can't be proxy request");
        }

        const result =
          message.method === "signDirect"
            ? await (async () => {
                const receivedSignDoc: {
                  bodyBytes?: Uint8Array | null;
                  authInfoBytes?: Uint8Array | null;
                  chainId?: string | null;
                  accountNumber?: string | null;
                } = message.args[2];

                const result = await keplr.signDirect(
                  message.args[0],
                  message.args[1],
                  {
                    bodyBytes: receivedSignDoc.bodyBytes,
                    authInfoBytes: receivedSignDoc.authInfoBytes,
                    chainId: receivedSignDoc.chainId,
                    accountNumber: receivedSignDoc.accountNumber
                      ? Long.fromString(receivedSignDoc.accountNumber)
                      : null,
                  },
                  message.args[3]
                );

                return {
                  signed: {
                    bodyBytes: result.signed.bodyBytes,
                    authInfoBytes: result.signed.authInfoBytes,
                    chainId: result.signed.chainId,
                    accountNumber: result.signed.accountNumber.toString(),
                  },
                  signature: result.signature,
                };
              })()
            : await keplr[message.method](
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                ...JSONUint8Array.unwrap(message.args)
              );

        const proxyResponse: ProxyRequestResponse = {
          type: "mises-proxy-request-response",
          id: message.id,
          result: {
            return: JSONUint8Array.wrap(result),
          },
        };

        eventListener.postMessage(proxyResponse);
      } catch (e: any) {
        const proxyResponse: ProxyRequestResponse = {
          type: "mises-proxy-request-response",
          id: message.id,
          result: {
            error: e.message || e.toString(),
          },
        };

        eventListener.postMessage(proxyResponse);
      }
    });
  }

  protected requestMethod<T = any>(
    method: keyof (IKeplr & KeplrCoreTypes),
    args: any[]
  ): Promise<T> {
    const bytes = new Uint8Array(8);
    const id: string = Array.from(crypto.getRandomValues(bytes))
      .map((value) => {
        return value.toString(16);
      })
      .join("");

    const proxyMessage: ProxyRequest = {
      type: "mises-proxy-request",
      id,
      method,
      args: JSONUint8Array.wrap(args),
    };

    return new Promise((resolve, reject) => {
      const receiveResponse = (e: any) => {
        const proxyResponse: ProxyRequestResponse = this.parseMessage
          ? this.parseMessage(e.data)
          : e.data;

        if (
          !proxyResponse ||
          proxyResponse.type !== "mises-proxy-request-response"
        ) {
          return;
        }

        if (proxyResponse.id !== id) {
          return;
        }

        this.eventListener.removeMessageListener(receiveResponse);
        const result = JSONUint8Array.unwrap(proxyResponse.result);

        if (!result) {
          reject(new Error("Result is null"));
          return;
        }

        if (result.error) {
          reject(new Error(result.error));
          return;
        }

        resolve(result.return);
      };

      this.eventListener.addMessageListener(receiveResponse);

      this.eventListener.postMessage(proxyMessage);
    });
  }

  protected enigmaUtils: Map<string, SecretUtils> = new Map();

  public defaultOptions: KeplrIntereactionOptions = {};

  constructor(
    public readonly version: string,
    public readonly mode: KeplrMode,
    protected readonly eventListener: {
      addMessageListener: (fn: (e: any) => void) => void;
      removeMessageListener: (fn: (e: any) => void) => void;
      postMessage: (message: any) => void;
    } = {
      addMessageListener: (fn: (e: any) => void) =>
        window.addEventListener("message", fn),
      removeMessageListener: (fn: (e: any) => void) =>
        window.removeEventListener("message", fn),
      postMessage: (message) =>
        window.postMessage(message, window.location.origin),
    },
    protected readonly parseMessage?: (message: any) => any
  ) {
    // Freeze fields/method except for "defaultOptions"
    // Intentionally, "defaultOptions" can be mutated to allow a webpage to change the options with cosmjs usage.
    // Freeze fields
    const fieldNames = Object.keys(this);
    for (const fieldName of fieldNames) {
      if (fieldName !== "defaultOptions") {
        Object.defineProperty(this, fieldName, {
          value: (this as any)[fieldName],
          writable: false,
        });
      }

      // If field is "eventListener", try to iterate one-level deep.
      if (fieldName === "eventListener") {
        const fieldNames = Object.keys(this.eventListener);
        for (const fieldName of fieldNames) {
          Object.defineProperty(this.eventListener, fieldName, {
            value: (this.eventListener as any)[fieldName],
            writable: false,
          });
        }
      }
    }
    // Freeze methods
    const methodNames = Object.getOwnPropertyNames(InjectedKeplr.prototype);
    for (const methodName of methodNames) {
      if (
        methodName !== "constructor" &&
        typeof (this as any)[methodName] === "function"
      ) {
        Object.defineProperty(this, methodName, {
          value: (this as any)[methodName].bind(this),
          writable: false,
        });
      }
    }
  }
  async isUnlocked(): Promise<boolean> {
    return await this.requestMethod("isUnlocked", []);
  }

  async enable(chainIds: string | string[]): Promise<void> {
    await this.requestMethod("enable", [chainIds]);
  }

  async disable(chainIds?: string | string[]): Promise<void> {
    await this.requestMethod("disable", [chainIds]);
  }

  async experimentalSuggestChain(chainInfo: ChainInfo): Promise<void> {
    if (
      chainInfo.features?.includes("stargate") ||
      chainInfo.features?.includes("no-legacy-stdTx")
    ) {
      console.warn(
        "“stargate”, “no-legacy-stdTx” feature has been deprecated. The launchpad is no longer supported, thus works without the two features. We would keep the aforementioned two feature for a while, but the upcoming update would potentially cause errors. Remove the two feature."
      );
    }

    await this.requestMethod("experimentalSuggestChain", [chainInfo]);
  }

  async getKey(chainId: string): Promise<Key> {
    return await this.requestMethod("getKey", [chainId]);
  }

  async sendTx(
    chainId: string,
    tx: StdTx | Uint8Array,
    mode: BroadcastMode
  ): Promise<Uint8Array> {
    if (!("length" in tx)) {
      console.warn(
        "Do not send legacy std tx via `sendTx` API. We now only support protobuf tx. The usage of legeacy std tx would throw an error in the near future."
      );
    }

    return await this.requestMethod("sendTx", [chainId, tx, mode]);
  }

  async signAmino(
    chainId: string,
    signer: string,
    signDoc: StdSignDoc,
    signOptions: KeplrSignOptions = {}
  ): Promise<AminoSignResponse> {
    return await this.requestMethod("signAmino", [
      chainId,
      signer,
      signDoc,
      deepmerge(this.defaultOptions.sign ?? {}, signOptions),
    ]);
  }

  async signDirect(
    chainId: string,
    signer: string,
    signDoc: {
      bodyBytes?: Uint8Array | null;
      authInfoBytes?: Uint8Array | null;
      chainId?: string | null;
      accountNumber?: Long | null;
    },
    signOptions: KeplrSignOptions = {}
  ): Promise<DirectSignResponse> {
    const result = await this.requestMethod("signDirect", [
      chainId,
      signer,
      // We can't send the `Long` with remaing the type.
      // Receiver should change the `string` to `Long`.
      {
        bodyBytes: signDoc.bodyBytes,
        authInfoBytes: signDoc.authInfoBytes,
        chainId: signDoc.chainId,
        accountNumber: signDoc.accountNumber
          ? signDoc.accountNumber.toString()
          : null,
      },
      deepmerge(this.defaultOptions.sign ?? {}, signOptions),
    ]);

    const signed: {
      bodyBytes: Uint8Array;
      authInfoBytes: Uint8Array;
      chainId: string;
      accountNumber: string;
    } = result.signed;

    return {
      signed: {
        bodyBytes: signed.bodyBytes,
        authInfoBytes: signed.authInfoBytes,
        chainId: signed.chainId,
        // We can't send the `Long` with remaing the type.
        // Sender should change the `Long` to `string`.
        accountNumber: Long.fromString(signed.accountNumber),
      },
      signature: result.signature,
    };
  }

  async signArbitrary(
    chainId: string,
    signer: string,
    data: string | Uint8Array
  ): Promise<StdSignature> {
    return await this.requestMethod("signArbitrary", [chainId, signer, data]);
  }

  signICNSAdr36(
    chainId: string,
    contractAddress: string,
    owner: string,
    username: string,
    addressChainIds: string[]
  ): Promise<ICNSAdr36Signatures> {
    return this.requestMethod("signICNSAdr36", [
      chainId,
      contractAddress,
      owner,
      username,
      addressChainIds,
    ]);
  }

  async verifyArbitrary(
    chainId: string,
    signer: string,
    data: string | Uint8Array,
    signature: StdSignature
  ): Promise<boolean> {
    return await this.requestMethod("verifyArbitrary", [
      chainId,
      signer,
      data,
      signature,
    ]);
  }

  async signEthereum(
    chainId: string,
    signer: string,
    data: string | Uint8Array,
    type: EthSignType
  ): Promise<Uint8Array> {
    return await this.requestMethod("signEthereum", [
      chainId,
      signer,
      data,
      type,
    ]);
  }

  getOfflineSigner(chainId: string): OfflineAminoSigner & OfflineDirectSigner {
    return new CosmJSOfflineSigner(chainId, this);
  }

  getOfflineSignerOnlyAmino(chainId: string): OfflineAminoSigner {
    return new CosmJSOfflineSignerOnlyAmino(chainId, this);
  }

  async getOfflineSignerAuto(
    chainId: string
  ): Promise<OfflineAminoSigner | OfflineDirectSigner> {
    const key = await this.getKey(chainId);
    if (key.isNanoLedger) {
      return new CosmJSOfflineSignerOnlyAmino(chainId, this);
    }
    return new CosmJSOfflineSigner(chainId, this);
  }

  async suggestToken(
    chainId: string,
    contractAddress: string,
    viewingKey?: string
  ): Promise<void> {
    return await this.requestMethod("suggestToken", [
      chainId,
      contractAddress,
      viewingKey,
    ]);
  }

  async getSecret20ViewingKey(
    chainId: string,
    contractAddress: string
  ): Promise<string> {
    return await this.requestMethod("getSecret20ViewingKey", [
      chainId,
      contractAddress,
    ]);
  }

  async getEnigmaPubKey(chainId: string): Promise<Uint8Array> {
    return await this.requestMethod("getEnigmaPubKey", [chainId]);
  }

  async getEnigmaTxEncryptionKey(
    chainId: string,
    nonce: Uint8Array
  ): Promise<Uint8Array> {
    return await this.requestMethod("getEnigmaTxEncryptionKey", [
      chainId,
      nonce,
    ]);
  }

  async enigmaEncrypt(
    chainId: string,
    contractCodeHash: string,
    // eslint-disable-next-line @typescript-eslint/ban-types
    msg: object
  ): Promise<Uint8Array> {
    return await this.requestMethod("enigmaEncrypt", [
      chainId,
      contractCodeHash,
      msg,
    ]);
  }

  async enigmaDecrypt(
    chainId: string,
    ciphertext: Uint8Array,
    nonce: Uint8Array
  ): Promise<Uint8Array> {
    return await this.requestMethod("enigmaDecrypt", [
      chainId,
      ciphertext,
      nonce,
    ]);
  }

  getEnigmaUtils(chainId: string): SecretUtils {
    if (this.enigmaUtils.has(chainId)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return this.enigmaUtils.get(chainId)!;
    }

    const enigmaUtils = new KeplrEnigmaUtils(chainId, this);
    this.enigmaUtils.set(chainId, enigmaUtils);
    return enigmaUtils;
  }

  async experimentalSignEIP712CosmosTx_v0(
    chainId: string,
    signer: string,
    eip712: {
      types: Record<string, { name: string; type: string }[] | undefined>;
      domain: Record<string, any>;
      primaryType: string;
    },
    signDoc: StdSignDoc,
    signOptions: KeplrSignOptions = {}
  ): Promise<AminoSignResponse> {
    return await this.requestMethod("experimentalSignEIP712CosmosTx_v0", [
      chainId,
      signer,
      eip712,
      signDoc,
      deepmerge(this.defaultOptions.sign ?? {}, signOptions),
    ]);
  }

  misesWeb3Client(): MisesWeb3Client {
    return new MisesWeb3Client(this);
  }

  misesAccount(): Promise<MisesAccountData> {
    return this.requestMethod<MisesAccountData>("misesAccount", []);
  }

  hasWalletAccount(): Promise<boolean> {
    return this.requestMethod<boolean>("hasWalletAccount", []);
  }

  openWallet(): Promise<void> {
    return this.requestMethod<void>("openWallet", []);
  }

  disconnect(params: { userid: string; appid: string }): Promise<boolean> {
    return this.requestMethod<boolean>("disconnect", [params]);
  }

  connect(params: {
    userid: string;
    appid: string;
    domain: string;
    permissions: string[];
  }): Promise<string | false> {
    return this.requestMethod<string | false>("connect", [params]);
  }

  userFollow(toUid: string): Promise<void> {
    return this.requestMethod<void>("userFollow", [toUid]);
  }

  userUnFollow(toUid: string): Promise<void> {
    return this.requestMethod<void>("userUnFollow", [toUid]);
  }

  setUserInfo(params: any): Promise<boolean> {
    return this.requestMethod<boolean>("setUserInfo", [params]);
  }

  staking(params: any): Promise<any> {
    return this.requestMethod<any>("staking", [params]);
  }

  verifyDomain(params: any): Promise<any> {
    console.log(params);
    return Promise.resolve();
    // return this.requestMethod<any>("verifyDomain", [params]);
  }

  async getChainInfosWithoutEndpoints(): Promise<ChainInfoWithoutEndpoints[]> {
    return await this.requestMethod("getChainInfosWithoutEndpoints", []);
  }

  __core__getAnalyticsId(): Promise<string> {
    return this.requestMethod("__core__getAnalyticsId", []);
  }

  async changeKeyRingName({
    defaultName,
    editable = true,
  }: {
    defaultName: string;
    editable?: boolean;
  }): Promise<string> {
    return await this.requestMethod("changeKeyRingName", [
      { defaultName, editable },
    ]);
  }
}
