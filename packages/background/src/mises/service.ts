/*
 * @Author: lmk
 * @Date: 2022-11-17 15:39:01
 * @LastEditTime: 2022-11-24 11:53:02
 * @LastEditors: lmk
 * @Description: mises controller
 */
import { Mises } from "./mises";
import { KVStore } from "@keplr-wallet/common";
import { MUser, MUserInfo } from "mises-js-sdk/dist/types/muser";
import {
  misesRequest,
  MISES_TRUNCATED_ADDRESS_START_CHARS,
  shortenAddress,
} from "./mises-network.util";
import {
  AuthExtension,
  DistributionExtension,
  QueryClient,
  StakingExtension,
  TxExtension,
} from "@cosmjs/stargate";
import { Tendermint34Client } from "@cosmjs/tendermint-rpc";
import { Any } from "@keplr-wallet/proto-types/google/protobuf/any";
import { PubKey } from "@keplr-wallet/types";

type generateAuthParams = Record<"misesId" | "auth", string>;

type disconnectParams = Record<"appid" | "userid", string>;

type connectParmas = Record<"appid" | "userid" | "domain", string>;

type permissions = {
  permissions: string[];
};

type gasprice = {
  propose_gasprice: number;
};

type userInfo = {
  misesId: string;
  nickname: string;
  avatar: string | undefined;
  token: string;
  timestamp: number;
};

type getTokenParams = {
  provider: "mises";
  user_authz: { auth: string };
  referrer: string;
};

type broadcastTxRes = {
  code: number;
  log: string;
  hash: Uint8Array;
};

interface TxResponse {
  /** The block height */
  height: Long;
  /** The transaction hash. */
  txhash: string;
  /** Namespace for the Code */
  codespace: string;
  /** Response code. */
  code: number;
  /** Result bytes, if any. */
  data: string;
  /**
   * The output of the application's logger (raw string). May be
   * non-deterministic.
   */
  rawLog: string;
  /** The output of the application's logger (typed). May be non-deterministic. */
  logs: any[];
  /** Additional information. May be non-deterministic. */
  info: string;
  /** Amount of gas requested for transaction. */
  gasWanted: Long;
  /** Amount of gas consumed by transaction. */
  gasUsed: Long;
  /** The request transaction bytes. */
  tx?: Any;
  /**
   * Time of the previous block. For heights > 1, it's the weighted median of
   * the timestamps of the valid votes in the block.LastCommit. For height == 1,
   * it's genesis time.
   */
  timestamp: string;
}

const defaultUserInfo = {
  misesId: "",
  nickname: "",
  avatar: undefined,
  token: "",
  timestamp: 0,
};

export class MisesService {
  activeUser!: MUser;
  userInfo: userInfo = defaultUserInfo;
  constructor(protected readonly kvStore: KVStore) {}
  data: any = {};
  private mises!: Mises;

  queryClient!: QueryClient &
    StakingExtension &
    DistributionExtension &
    AuthExtension &
    TxExtension;
  tmClient!: Tendermint34Client;

  init() {
    this.mises = new Mises();

    this.mises.makeClient().then((clients) => {
      const [queryClient, tmClient] = clients;

      this.queryClient = queryClient;
      this.tmClient = tmClient;
      console.log("init");
    });

    this.gasPriceAndLimit();
  }

  async activateUser(priKey: string): Promise<void> {
    this.activeUser = await this.mises.misesUser.activateUser(
      priKey.replace("0x", "")
    );

    const userInfo = await this.misesUserInfo();

    this.storeUserInfo(userInfo);

    window.localStorage.setItem("setAccount", "true");
  }

  async misesUserInfo() {
    const userInfo =
      (await this.kvStore.get<userInfo>(this.activeUser.address())) ||
      defaultUserInfo; // init userInfo

    const nowTimeStamp = new Date().getTime();
    const expireTokenFlag =
      userInfo.token &&
      userInfo.timestamp &&
      nowTimeStamp - userInfo.timestamp > 604800000; // 6 days

    if (!userInfo.token || expireTokenFlag) {
      const referrer = await this.getinstallreferrer();
      const nonce = new Date().getTime().toString();
      const { auth } = await this.generateAuth(nonce);

      userInfo.token = await this.getServerToken({
        provider: "mises",
        user_authz: { auth },
        referrer,
      });
      userInfo.timestamp = new Date().getTime();
    }

    const isRegistered = await this.activeUser.isRegistered();

    if (isRegistered) {
      const misesInfo = await this.activeUser.info();
      userInfo.avatar = misesInfo.avatarUrl;
      userInfo.nickname = misesInfo.name || "";
    }

    const misesId = this.activeUser.address();

    userInfo.nickname =
      userInfo.nickname ||
      shortenAddress(misesId, MISES_TRUNCATED_ADDRESS_START_CHARS);
    userInfo.misesId = misesId;

    return userInfo;
  }

  lockAll(): void {
    this.resetUserInfo();

    this.mises.misesUser.lockAll();

    this.activeUser = undefined as any;
  }

  async generateAuth(nonce: string): Promise<generateAuthParams> {
    const auth = await this.activeUser.generateAuth(nonce);
    return {
      auth,
      misesId: this.userInfo.misesId,
    };
  }
  // set mises browser userinfo
  setToMisesPrivate(params: userInfo): Promise<void> {
    if (browser.misesPrivate) {
      browser.misesPrivate.setMisesId(JSON.stringify(params));
    }
    return Promise.resolve();
  }

  async setUnFollow(toUid: string): Promise<void> {
    try {
      this.activeUser.unfollow(toUid);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }

  setFollow(toUid: string): Promise<void> {
    try {
      this.activeUser.follow(toUid);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async getServerToken(query: getTokenParams): Promise<string> {
    try {
      const data = await misesRequest<getTokenParams, { token: string }>({
        url: "/signin",
        method: "POST",
        data: query,
      });
      return data.token;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async getGasPrices(): Promise<gasprice> {
    try {
      return misesRequest<null, gasprice>({
        url: "/mises/gasprices",
      });
    } catch (error) {
      return Promise.resolve({
        propose_gasprice: 0,
      });
    }
  }

  getinstallreferrer(): Promise<string> {
    return new Promise((resolve) => {
      if (browser.misesPrivate && browser.misesPrivate.getInstallReferrer) {
        browser.misesPrivate.getInstallReferrer(resolve);
        return;
      }
      resolve("");
    });
  }

  async setUserInfo(data: MUserInfo) {
    try {
      const activeUser = this.activeUser;
      const userinfo = await activeUser.info();
      const version = userinfo.version.add(1);
      const { misesId, token, timestamp } = this.userInfo;

      const info = await activeUser.setInfo({
        ...data,
        version,
      });

      const updateUserInfo = {
        nickname:
          data.name ||
          shortenAddress(misesId, MISES_TRUNCATED_ADDRESS_START_CHARS),
        avatar: data.avatarUrl,
        token,
        misesId,
        timestamp,
      };

      this.storeUserInfo(updateUserInfo);

      return info;
    } catch (error) {
      console.log(error, "error");
      return false;
    }
  }

  async connect({
    domain,
    appid,
    userid,
    permissions,
  }: connectParmas & permissions) {
    try {
      await this.mises.misesAppMgr.ensureApp(appid, domain);

      const connect = await this.mises.misesSdk.connect(
        domain,
        appid,
        userid,
        permissions
      );

      return connect;
    } catch (error) {
      return false;
    }
  }

  disconnect({ appid, userid }: disconnectParams) {
    return this.mises.misesSdk.disconnect(appid, userid);
  }

  async gasPriceAndLimit() {
    try {
      const gasPrices = await this.getGasPrices();

      const proposeGasprice =
        gasPrices.propose_gasprice || this.mises.config.gasPrice();

      this.mises.config.setGasPriceAndLimit(proposeGasprice, 200000);

      return proposeGasprice;
    } catch (error) {
      return Promise.resolve(this.mises.config.gasPrice());
    }
  }

  resetUserInfo() {
    this.userInfo = defaultUserInfo;

    this.kvStore.set<userInfo>(this.activeUser.address(), this.userInfo);
  }

  storeUserInfo(userInfo: userInfo) {
    this.userInfo = userInfo;

    this.kvStore.set<userInfo>(this.activeUser.address(), userInfo);

    userInfo.token && this.setToMisesPrivate(userInfo);
  }

  getBalanceUMIS() {
    return this.activeUser.getBalanceUMIS();
  }

  recentTransactions(formHeight: number | undefined) {
    return this.activeUser.recentTransactions(formHeight);
  }

  getChainId() {
    return this.mises.stargateClient.getChainId();
  }

  unbondingDelegations(address: string) {
    return this.queryClient.staking.delegatorUnbondingDelegations(address);
  }

  delegations(address: string) {
    return this.queryClient.staking.delegatorDelegations(address);
  }

  rewards(address: string) {
    return this.queryClient.distribution.delegationTotalRewards(address);
  }

  authAccounts(address: string) {
    return this.queryClient.auth.account(address);
  }

  broadcastTx(tx: Uint8Array, mode: string) {
    switch (mode) {
      case "async":
        return (this.tmClient.broadcastTxAsync({
          tx,
        }) as unknown) as broadcastTxRes;
      case "block":
        return (this.tmClient.broadcastTxCommit({
          tx,
        }) as unknown) as broadcastTxRes;
      case "sync":
        return (this.tmClient.broadcastTxSync({
          tx,
        }) as unknown) as broadcastTxRes;
      default:
        return (this.tmClient.broadcastTxCommit({
          tx,
        }) as unknown) as broadcastTxRes;
    }
  }

  async simulate(
    messages: readonly Any[],
    memo: string | undefined,
    signer: PubKey,
    sequence: number
  ) {
    // const proposeGasprice = await this.gasPriceAndLimit();

    const res = await this.queryClient.tx.simulate(
      messages,
      memo,
      signer,
      sequence
    );

    // const gasUsed = proposeGasprice * (res.gasInfo?.gasUsed.low || 67751);
    return {
      gasUsed: res.gasInfo?.gasUsed,
    };
  }

  toHex(data: Uint8Array) {
    let out = "";
    for (const byte of data) {
      out += ("0" + byte.toString(16)).slice(-2);
    }
    return out;
  }

  async getTx(hash: string): Promise<TxResponse> {
    await this.sleep();

    const { txResponse } = await this.queryClient.tx.getTx(hash);
    if (txResponse) {
      return txResponse;
    }

    return await this.getTx(hash);
  }

  sleep(ms = 3000) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
