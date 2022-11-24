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

  init() {
    this.mises = new Mises();
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
    console.log("Ready to call setmisesid", params);

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
        url: "/gasprices",
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
}
