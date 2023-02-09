import {
  ChainInfo,
  EthSignType,
  Keplr as IKeplr,
  KeplrIntereactionOptions,
  KeplrMode,
  KeplrSignOptions,
  Key,
  BroadcastMode,
  AminoSignResponse,
  StdSignDoc,
  StdTx,
  OfflineAminoSigner,
  StdSignature,
  DirectSignResponse,
  OfflineDirectSigner,
} from "@keplr-wallet/types";
import { BACKGROUND_PORT, MessageRequester } from "@keplr-wallet/router";
import {
  EnableAccessMsg,
  SuggestChainInfoMsg,
  GetKeyMsg,
  SuggestTokenMsg,
  SendTxMsg,
  GetSecret20ViewingKey,
  RequestSignAminoMsg,
  RequestSignDirectMsg,
  GetPubkeyMsg,
  ReqeustEncryptMsg,
  RequestDecryptMsg,
  GetTxEncryptionKeyMsg,
  RequestVerifyADR36AminoSignDoc,
  RequestSignEIP712CosmosTxMsg_v0,
  IsUnlockMsg,
  MisesAccountMsg,
  HasWalletAccountMsg,
  DisconnectMsg,
  ConnectMsg,
  UserFollowMsg,
  UserUnFollowMsg,
  SetUserInfoMsg,
  StakingMsg,
  OpenWalletMsg,
} from "./types";
import { SecretUtils } from "secretjs/types/enigmautils";

import { KeplrEnigmaUtils } from "./enigma";

import { CosmJSOfflineSigner, CosmJSOfflineSignerOnlyAmino } from "./cosmjs";
import deepmerge from "deepmerge";
import Long from "long";
import { Buffer } from "buffer/";
import { MisesWeb3Client } from "./mises";

export class Keplr implements IKeplr {
  protected enigmaUtils: Map<string, SecretUtils> = new Map();

  public defaultOptions: KeplrIntereactionOptions = {};

  constructor(
    public readonly version: string,
    public readonly mode: KeplrMode,
    protected readonly requester: MessageRequester
  ) {}
  async isUnlocked(): Promise<boolean> {
    // return true;
    return await this.requester.sendMessage(BACKGROUND_PORT, new IsUnlockMsg());
  }

  async enable(chainIds: string | string[]): Promise<void> {
    if (typeof chainIds === "string") {
      chainIds = [chainIds];
    }

    await this.requester.sendMessage(
      BACKGROUND_PORT,
      new EnableAccessMsg(chainIds)
    );
  }

  async experimentalSuggestChain(
    chainInfo: ChainInfo & {
      // Legacy
      gasPriceStep?: {
        readonly low: number;
        readonly average: number;
        readonly high: number;
      };
    }
  ): Promise<void> {
    if (chainInfo.gasPriceStep) {
      // Gas price step in ChainInfo is legacy format.
      // Try to change the recent format for backward-compatibility.
      const gasPriceStep = { ...chainInfo.gasPriceStep };
      for (const feeCurrency of chainInfo.feeCurrencies) {
        if (!feeCurrency.gasPriceStep) {
          (feeCurrency as {
            gasPriceStep?: {
              readonly low: number;
              readonly average: number;
              readonly high: number;
            };
          }).gasPriceStep = gasPriceStep;
        }
      }
      delete chainInfo.gasPriceStep;

      console.warn(
        "The `gasPriceStep` field of the `ChainInfo` has been moved under `feeCurrencies`. This is automatically handled as of right now, but the upcoming update would potentially cause errors."
      );
    }

    const msg = new SuggestChainInfoMsg(chainInfo);
    await this.requester.sendMessage(BACKGROUND_PORT, msg);
  }

  async getKey(chainId: string): Promise<Key> {
    const msg = new GetKeyMsg(chainId);
    return await this.requester.sendMessage(BACKGROUND_PORT, msg);
  }

  async sendTx(
    chainId: string,
    tx: StdTx | Uint8Array,
    mode: BroadcastMode
  ): Promise<Uint8Array> {
    const msg = new SendTxMsg(chainId, tx, mode);
    return await this.requester.sendMessage(BACKGROUND_PORT, msg);
  }

  async signAmino(
    chainId: string,
    signer: string,
    signDoc: StdSignDoc,
    signOptions: KeplrSignOptions = {}
  ): Promise<AminoSignResponse> {
    const msg = new RequestSignAminoMsg(
      chainId,
      signer,
      signDoc,
      deepmerge(this.defaultOptions.sign ?? {}, signOptions)
    );

    return await this.requester.sendMessage(BACKGROUND_PORT, msg);
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
    const msg = new RequestSignDirectMsg(
      chainId,
      signer,
      {
        bodyBytes: signDoc.bodyBytes,
        authInfoBytes: signDoc.authInfoBytes,
        chainId: signDoc.chainId,
        accountNumber: signDoc.accountNumber
          ? signDoc.accountNumber.toString()
          : null,
      },
      deepmerge(this.defaultOptions.sign ?? {}, signOptions)
    );
    const response = await this.requester.sendMessage(BACKGROUND_PORT, msg);

    return {
      signed: {
        bodyBytes: response.signed.bodyBytes,
        authInfoBytes: response.signed.authInfoBytes,
        chainId: response.signed.chainId,
        accountNumber: Long.fromString(response.signed.accountNumber),
      },
      signature: response.signature,
    };
  }

  async signArbitrary(
    chainId: string,
    signer: string,
    data: string | Uint8Array
  ): Promise<StdSignature> {
    let isADR36WithString: boolean;
    [data, isADR36WithString] = this.getDataForADR36(data);
    const signDoc = this.getADR36SignDoc(signer, data);

    const msg = new RequestSignAminoMsg(chainId, signer, signDoc, {
      isADR36WithString,
    });
    return (await this.requester.sendMessage(BACKGROUND_PORT, msg)).signature;
  }

  async verifyArbitrary(
    chainId: string,
    signer: string,
    data: string | Uint8Array,
    signature: StdSignature
  ): Promise<boolean> {
    if (typeof data === "string") {
      data = Buffer.from(data);
    }

    return await this.requester.sendMessage(
      BACKGROUND_PORT,
      new RequestVerifyADR36AminoSignDoc(chainId, signer, data, signature)
    );
  }

  async signEthereum(
    chainId: string,
    signer: string,
    data: string | Uint8Array,
    type: EthSignType
  ): Promise<Uint8Array> {
    let isADR36WithString: boolean;
    [data, isADR36WithString] = this.getDataForADR36(data);
    const signDoc = this.getADR36SignDoc(signer, data);

    if (data === "") {
      throw new Error("Signing empty data is not supported.");
    }

    const msg = new RequestSignAminoMsg(chainId, signer, signDoc, {
      isADR36WithString,
      ethSignType: type,
    });
    const signature = (await this.requester.sendMessage(BACKGROUND_PORT, msg))
      .signature;
    return Buffer.from(signature.signature, "base64");
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
    const msg = new SuggestTokenMsg(chainId, contractAddress, viewingKey);
    await this.requester.sendMessage(BACKGROUND_PORT, msg);
  }

  async getSecret20ViewingKey(
    chainId: string,
    contractAddress: string
  ): Promise<string> {
    const msg = new GetSecret20ViewingKey(chainId, contractAddress);
    return await this.requester.sendMessage(BACKGROUND_PORT, msg);
  }

  async getEnigmaPubKey(chainId: string): Promise<Uint8Array> {
    return await this.requester.sendMessage(
      BACKGROUND_PORT,
      new GetPubkeyMsg(chainId)
    );
  }

  async getEnigmaTxEncryptionKey(
    chainId: string,
    nonce: Uint8Array
  ): Promise<Uint8Array> {
    return await this.requester.sendMessage(
      BACKGROUND_PORT,
      new GetTxEncryptionKeyMsg(chainId, nonce)
    );
  }

  async enigmaEncrypt(
    chainId: string,
    contractCodeHash: string,
    // eslint-disable-next-line @typescript-eslint/ban-types
    msg: object
  ): Promise<Uint8Array> {
    return await this.requester.sendMessage(
      BACKGROUND_PORT,
      new ReqeustEncryptMsg(chainId, contractCodeHash, msg)
    );
  }

  async enigmaDecrypt(
    chainId: string,
    ciphertext: Uint8Array,
    nonce: Uint8Array
  ): Promise<Uint8Array> {
    if (!ciphertext || ciphertext.length === 0) {
      return new Uint8Array();
    }

    return await this.requester.sendMessage(
      BACKGROUND_PORT,
      new RequestDecryptMsg(chainId, ciphertext, nonce)
    );
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
    const msg = new RequestSignEIP712CosmosTxMsg_v0(
      chainId,
      signer,
      eip712,
      signDoc,
      deepmerge(this.defaultOptions.sign ?? {}, signOptions)
    );
    return await this.requester.sendMessage(BACKGROUND_PORT, msg);
  }

  protected getDataForADR36(data: string | Uint8Array): [string, boolean] {
    let isADR36WithString = false;
    if (typeof data === "string") {
      data = Buffer.from(data).toString("base64");
      isADR36WithString = true;
    } else {
      data = Buffer.from(data).toString("base64");
    }
    return [data, isADR36WithString];
  }

  protected getADR36SignDoc(signer: string, data: string): StdSignDoc {
    return {
      chain_id: "",
      account_number: "0",
      sequence: "0",
      fee: {
        gas: "0",
        amount: [],
      },
      msgs: [
        {
          type: "sign/MsgSignData",
          value: {
            signer,
            data,
          },
        },
      ],
      memo: "",
    };
  }

  misesWeb3Client(): MisesWeb3Client {
    return new MisesWeb3Client(this);
  }

  misesAccount() {
    return this.requester.sendMessage(BACKGROUND_PORT, new MisesAccountMsg());
  }

  hasWalletAccount() {
    return this.requester.sendMessage(
      BACKGROUND_PORT,
      new HasWalletAccountMsg()
    );
  }

  openWallet() {
    return this.requester.sendMessage(BACKGROUND_PORT, new OpenWalletMsg());
  }

  disconnect(params: { userid: string; appid: string }) {
    return this.requester.sendMessage(
      BACKGROUND_PORT,
      new DisconnectMsg(params)
    );
  }

  connect(params: {
    userid: string;
    appid: string;
    domain: string;
    permissions: string[];
  }) {
    return this.requester.sendMessage(BACKGROUND_PORT, new ConnectMsg(params));
  }

  userFollow(toUid: string) {
    return this.requester.sendMessage(
      BACKGROUND_PORT,
      new UserFollowMsg(toUid)
    );
  }

  userUnFollow(toUid: string) {
    return this.requester.sendMessage(
      BACKGROUND_PORT,
      new UserUnFollowMsg(toUid)
    );
  }

  setUserInfo(params: any) {
    return this.requester.sendMessage(
      BACKGROUND_PORT,
      new SetUserInfoMsg(params)
    );
  }

  staking(params: any) {
    return this.requester.sendMessage(BACKGROUND_PORT, new StakingMsg(params));
  }
}
