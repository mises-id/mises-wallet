/*
 * @Author: lmk
 * @Date: 2022-11-17 15:39:01
 * @LastEditTime: 2022-11-24 11:53:02
 * @LastEditors: lmk
 * @Description: mises controller
 */
import { Mises } from "./mises";
import { KVStore } from "@keplr-wallet/common";
import { MUser, MUserInfo } from "mises-js-sdk";
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
  TimeoutError,
  TxExtension,
} from "@cosmjs/stargate";
import { Tendermint34Client } from "@cosmjs/tendermint-rpc";
import { PubKey } from "@keplr-wallet/types";
import Long from "long";
import { TxSearchParam, TxSearchResp } from "mises-js-sdk/dist/types/lcd";

type generateAuthParams = Record<"misesId" | "auth", string>;

type disconnectParams = Record<"appid" | "userid", string>;

type connectParmas = Record<"appid" | "userid" | "domain", string>;

type permissions = {
  permissions: string[];
};

type gasprice = {
  propose_gasprice: number;
};

export type userInfo = {
  misesId: string;
  nickname: string;
  avatar: string | undefined;
  token: string;
  timestamp: number;
  transtions: IndexTx[];
};

type getTokenParams = {
  provider: "mises";
  user_authz: { auth: string };
  referrer: string;
};

export type DeliverTxResponse = {
  code: number;
  height: number;
  rawLog: string;
  hash: string;
  gasUsed: number;
  gasWanted: number;
};

const defaultUserInfo = {
  misesId: "",
  nickname: "",
  avatar: undefined,
  token: "",
  timestamp: 0,
  transtions: [],
};

export const fetchConfig = {
  // To handle sequence mismatch
  retry: 3,
  retryDelay: 1000,
};

export type IndexTx = {
  category: string;
  date: string;
  height: number;
  initialTransaction: {
    hash: string;
    id: string;
  };
  primaryCurrency: string;
  recipientAddress: string;
  secondaryCurrency: string;
  senderAddress: string;
  title: string;
  transactionGroupType: string;
  resultLength: number;
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
  }

  async initQueryClient() {
    if (this.queryClient) {
      return this.queryClient;
    }

    this.mises.queryFetchClient.fetchQuery(
      "gasPriceAndLimit",
      () => this.gasPriceAndLimit(),
      fetchConfig
    );

    try {
      const clients = await this.mises.queryFetchClient.fetchQuery(
        "makeClient",
        () => this.mises.makeClient(),
        fetchConfig
      );

      const [queryClient, tmClient] = clients;
      this.queryClient = queryClient;
      this.tmClient = tmClient;

      console.log("init");

      return queryClient;
    } catch (error) {}
  }

  async activateUser(priKey: string): Promise<void> {
    this.activeUser = await this.mises.misesUser.activateUser(
      priKey.replace("0x", "")
    );

    const userInfo = await this.misesUserInfo();

    this.storeUserInfo(userInfo);

    browser.storage.local.set({
      setAccount: true,
    });

    console.log("activateUser", this.activeUser);
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

      const token = await this.mises.queryFetchClient.fetchQuery(
        "getServerToken",
        () => {
          return this.getServerToken({
            provider: "mises",
            user_authz: { auth },
            referrer,
          });
        },
        fetchConfig
      );
      userInfo.token = token;

      userInfo.timestamp = new Date().getTime();
    }

    const isRegistered = await this.activeUser.isRegistered();

    if (isRegistered) {
      const misesInfo = await this.activeUser?.info();
      userInfo.avatar = misesInfo?.avatarUrl;
      userInfo.nickname = misesInfo?.name || "";
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

    // this.setToMisesPrivate(defaultUserInfo);
  }

  async generateAuth(nonce: string): Promise<generateAuthParams> {
    if (!this.activeUser) {
      throw new Error("Unknown activeUser");
    }
    const auth = await this.activeUser.generateAuth(nonce);
    return {
      auth,
      misesId: this.userInfo.misesId,
    };
  }
  // set mises browser userinfo
  setToMisesPrivate(params: userInfo): Promise<void> {
    if ((browser as any).misesPrivate) {
      (browser as any).misesPrivate.setMisesId(JSON.stringify(params));
    }
    return Promise.resolve();
  }

  async setUnFollow(toUid: string): Promise<void> {
    console.log(toUid);
    try {
      this.activeUser.unfollow(toUid);

      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }

  setFollow(toUid: string): Promise<void> {
    console.log(toUid);
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
      if (
        (browser as any).misesPrivate &&
        (browser as any).misesPrivate.getInstallReferrer
      ) {
        (browser as any).misesPrivate.getInstallReferrer(resolve);
        return;
      }
      resolve("");
    });
  }

  async setUserInfo(data: MUserInfo) {
    console.log(data);
    try {
      const activeUser = this.activeUser;
      const userinfo = await activeUser.info();
      const version = userinfo.version.add(1);
      const { misesId, token, timestamp } = this.userInfo;

      await activeUser.setInfo({
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
        transtions: this.userInfo.transtions,
      };

      this.storeUserInfo(updateUserInfo);

      return true;
    } catch (error) {
      console.log(error, "error");
      return Promise.reject(error);
    }
  }

  async connect({
    domain,
    appid,
    userid,
    permissions,
  }: connectParmas & permissions) {
    try {
      console.log({
        domain,
        appid,
        userid,
        permissions,
      });
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

    this.save();
  }

  storeUserInfo(userInfo: userInfo) {
    this.userInfo = userInfo;

    this.save();
    userInfo.token && this.setToMisesPrivate(userInfo);
  }

  save() {
    return this.kvStore.set<userInfo>(this.activeUser.address(), this.userInfo);
  }

  async getBalanceUMIS() {
    const balance = await this.activeUser?.getBalanceUMIS();
    return this.mises.coinDefine.toCoinUMIS(balance || Long.ZERO);
  }

  getChainId() {
    return this.mises.stargateClient.getChainId();
  }

  async unbondingDelegations(address: string) {
    const queryClient = await this.initQueryClient();

    return queryClient?.staking.delegatorUnbondingDelegations(address);
  }

  async delegations(address: string) {
    const queryClient = await this.initQueryClient();
    const delegatorDelegationsResponse = await queryClient?.staking.delegatorDelegations(
      address
    );
    const total =
      delegatorDelegationsResponse?.pagination?.total?.toNumber() || 0;

    if (total > 100 && delegatorDelegationsResponse?.delegationResponses) {
      const nextRes = await queryClient?.staking.delegatorDelegations(
        address,
        delegatorDelegationsResponse?.pagination?.nextKey
      );
      if (nextRes?.delegationResponses) {
        return {
          delegationResponses: [
            ...delegatorDelegationsResponse.delegationResponses,
            ...nextRes?.delegationResponses,
          ],
        };
      }
    }

    return delegatorDelegationsResponse;
  }

  async rewards(address: string) {
    const queryClient = await this.initQueryClient();

    return queryClient?.distribution.delegationTotalRewards(address);
  }

  async authAccounts(address: string) {
    const queryClient = await this.initQueryClient();

    return queryClient?.auth.account(address);
  }

  public async pollForTx(
    txId: string | Uint8Array,
    timeoutMs: number = 3000 * 15,
    pollIntervalMs: number = 3000
  ): Promise<DeliverTxResponse> {
    let timedOut = false;

    const txPollTimeout = setTimeout(() => {
      timedOut = true;
    }, timeoutMs);
    if (typeof txId !== "string") {
      txId = this.toHex(txId);
    }
    try {
      if (timedOut) {
        throw new TimeoutError(
          `Transaction with ID ${txId} was submitted but was not yet found on the chain. You might want to check later.`,
          txId
        );
      }

      await this.sleep(pollIntervalMs);
      console.log(txId);
      const result = await this.getTx(txId);

      clearTimeout(txPollTimeout);

      return result || this.pollForTx(txId);
    } catch (error) {
      clearTimeout(txPollTimeout);
      return Promise.reject(error);
    }
  }

  public async broadcastTx(tx: Uint8Array): Promise<string> {
    try {
      const broadcasted = await this.tmClient.broadcastTxSync({ tx });
      if (broadcasted.code) {
        throw new Error(
          `Broadcasting transaction failed with code ${broadcasted.code} (codespace: ${broadcasted.codeSpace}). Log: ${broadcasted.log}`
        );
      }
      const transactionId = this.toHex(broadcasted.hash).toUpperCase();
      return transactionId;
    } catch (error) {
      return Promise.reject(error);
    }
  }
  async simulate(
    messages: readonly any[],
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

  async getTx(hash: string): Promise<DeliverTxResponse | undefined> {
    const results = await this.txsQuery(`tx.hash='${hash}'`, {
      minHeight: 0,
      maxHeight: undefined,
      page: 1,
    });
    if (results.totalCount === 0 || !results.txs) {
      return undefined;
    }
    const result = results.txs[0];
    return {
      code: result.code,
      height: result.height,
      rawLog: result.rawLog,
      hash: result.hash,
      gasUsed: result.gasUsed,
      gasWanted: result.gasWanted,
    };
  }

  public async txsQuery(
    query: string,
    param: TxSearchParam
  ): Promise<TxSearchResp> {
    const minHeight = param.minHeight || 0;
    const maxHeight = param.maxHeight || Number.MAX_SAFE_INTEGER;
    const page = param.page || 1;
    function withFilters(originalQuery: string): string {
      return `${originalQuery} AND tx.height>=${minHeight} AND tx.height<=${maxHeight}`;
    }
    let results;
    try {
      results = await this.tmClient.txSearch({
        query: withFilters(query),
        page,
      });
    } catch (_err) {
      results = {
        totalCount: 0,
        txs: [],
      };
    }
    this.tmClient.disconnect();
    return {
      totalCount: results.totalCount,
      txs: results.txs.map((tx) => {
        return {
          height: tx.height,
          hash: this.toHex(tx.hash).toUpperCase(),
          code: tx.result.code,
          rawLog: tx.result.log || "",
          tx: tx.tx,
          gasUsed: tx.result.gasUsed,
          gasWanted: tx.result.gasWanted,
        };
      }),
    };
  }

  sleep(ms = 3000) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async misesAccount() {
    try {
      const nonce = new Date().getTime().toString();
      const { auth } = await this.generateAuth(nonce);

      return {
        auth,
        address: this.activeUser.address(),
      };
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  async hasWalletAccount() {
    const { setAccount } = await browser.storage.local.get("setAccount");
    return !!setAccount;
  }

  async staking(params: any) {
    try {
      console.log(params, "postTx:getParmas======");
      const activeUser = this.activeUser;
      const data = await activeUser.postTx(
        params.msgs,
        "",
        params.gasFee,
        params.gasLimit
      );
      if (data.code !== 0) {
        return Promise.reject(data.rawLog);
      }
      return data;
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  parseAmountItem(item: { value: string }) {
    if (item.value) {
      const amount = item.value?.replace("umis", "|umis").split("|");
      const currency = this.mises.coinDefine.fromCoin({
        amount: amount[0],
        denom: amount[1],
      });
      const coin = this.mises.coinDefine.toCoinMIS(currency);
      return {
        amount: coin.amount,
        denom: coin.denom.toUpperCase(),
      };
    } else {
      return {
        amount: "0",
        denom: "MIS",
      };
    }
  }

  parseTxEvents(
    activeUserAddr: any,
    tx: { raw: any; height: any; hash: any }
  ): IndexTx[] {
    const events = tx.raw;
    return events.reduce(
      (result: IndexTx[], event: { type: any; attributes: any[] }) => {
        let amount = { amount: "", denom: "" };
        let recipient = { value: "" };
        let sender = { value: "" };
        let category = "";
        let title = "";
        let transactionGroupType = "misesIn";
        switch (event.type) {
          case "transfer": {
            const amountItem = event.attributes.find(
              (item: { key: string }) => item.key === "amount"
            );
            if (amountItem) {
              amount = this.parseAmountItem(amountItem);
            }
            recipient = event.attributes.find(
              (item: { key: string }) => item.key === "recipient"
            );
            sender = event.attributes.find(
              (item: { key: string }) => item.key === "sender"
            );
            category =
              recipient && recipient.value === activeUserAddr
                ? "receive"
                : "send";

            title =
              recipient && recipient.value === activeUserAddr
                ? "Receive"
                : "Send";

            transactionGroupType =
              recipient && recipient.value === activeUserAddr
                ? "misesIn"
                : "misesOut";
            break;
          }

          case "withdraw_rewards": {
            const amountItem = event.attributes.find(
              (item: { key: string }) => item.key === "amount"
            );
            if (amountItem) {
              amount = this.parseAmountItem(amountItem);
            }

            sender = event.attributes.find(
              (item: { key: string }) => item.key === "validator"
            );
            recipient = { value: activeUserAddr };

            category = "interaction";
            title = "Withdraw Rewards";
            transactionGroupType = "misesIn";
            break;
          }
          case "delegate": {
            const amountItem = event.attributes.find(
              (item: { key: string }) => item.key === "amount"
            );
            if (amountItem) {
              amount = this.parseAmountItem(amountItem);
            }
            sender = { value: activeUserAddr };
            recipient = event.attributes.find(
              (item: { key: string }) => item.key === "validator"
            );
            category = "interaction";
            title = "Delegate";
            transactionGroupType = "misesOut";
            break;
          }
          case "redelegate": {
            const amountItem = event.attributes.find(
              (item: { key: string }) => item.key === "amount"
            );
            if (amountItem) {
              amount = this.parseAmountItem(amountItem);
            }
            sender = { value: activeUserAddr };
            recipient = event.attributes.find(
              (item: { key: string }) => item.key === "destination_validator"
            );
            category = "interaction";
            title = "Redelegate";
            transactionGroupType = "misesOut";
            break;
          }
          case "unbond": {
            const amountItem = event.attributes.find(
              (item: { key: string }) => item.key === "amount"
            );
            if (amountItem) {
              amount = this.parseAmountItem(amountItem);
            }
            sender = event.attributes.find(
              (item: { key: string }) => item.key === "validator"
            );
            recipient = { value: activeUserAddr };
            category = "interaction";
            title = "Undelegate";
            transactionGroupType = "misesIn";
            break;
          }
          default:
            return result;
        }

        return result.concat({
          category,
          date:
            result.length === 0
              ? `${tx.height}`
              : `${tx.height}:${result.length}`,

          height: tx.height,
          initialTransaction: { id: "0x0", hash: tx.hash },
          primaryCurrency: `${amount.amount} ${amount.denom}`,
          recipientAddress: recipient.value ?? "",
          secondaryCurrency: `${amount.amount} ${amount.denom}`,
          senderAddress: sender.value ?? "",
          title,
          transactionGroupType,
          resultLength: result.length,
        });
      },
      []
    );
  }

  async recentTransactions() {
    try {
      const activeUser = this.activeUser;
      const height = this.userInfo.transtions[0]
        ? this.userInfo.transtions[0].height + 1
        : 0;
      let list = await activeUser?.recentTransactions(height);
      if (Array.isArray(list)) {
        list = list.reduce(
          (
            result: IndexTx[],
            val: { raw: any; rawLog: string; height: any; hash: any }
          ) => {
            val.raw = [];
            JSON.parse(val.rawLog).forEach((item: { events: any }) => {
              val.raw = [...val.raw, ...item.events];
            });
            return [
              ...result,
              ...this.parseTxEvents(activeUser.address(), val),
            ];
          },
          []
        );
        const sortList = ([...list] as unknown) as IndexTx[];
        sortList.sort((a, b) =>
          a.height === b.height
            ? a.resultLength - b.resultLength
            : b.height - a.height
        );
        return sortList;
      }
      return [];
    } catch (error) {
      console.log(error);
      return Promise.reject(error);
    }
  }
  saveTranstions(list: IndexTx[]) {
    this.userInfo.transtions = list;
    this.save();
  }
}
