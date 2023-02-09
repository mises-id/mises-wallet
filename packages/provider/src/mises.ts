import { Keplr } from "@keplr-wallet/types";

export class MisesWeb3Client {
  constructor(protected readonly keplr: Keplr) {}

  async misesAccount() {
    return await this.keplr.misesAccount();
  }

  async hasWalletAccount() {
    return await this.keplr.hasWalletAccount();
  }

  async openWallet() {
    return await this.keplr.openWallet();
  }

  async disconnect(params: { userid: string; appid: string }) {
    return await this.keplr.disconnect(params);
  }

  async connect(params: {
    userid: string;
    appid: string;
    domain: string;
    permissions: string[];
  }) {
    return await this.keplr.connect(params);
  }

  async userFollow(toUid: string) {
    return await this.keplr.userFollow(toUid);
  }

  async userUnFollow(toUid: string) {
    return await this.keplr.userUnFollow(toUid);
  }

  async setUserInfo(params: any) {
    return await this.keplr.setUserInfo(params);
  }
}
