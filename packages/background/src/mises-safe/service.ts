/*
 * @Author: lmk
 * @Date: 2022-11-17 15:39:01
 * @LastEditTime: 2022-11-24 11:53:02
 * @LastEditors: lmk
 * @Description: mises controller
 */
// import { MisesSafe } from "./mises";
import { KVStore } from "@keplr-wallet/common";
import { misesRequest } from "../mises/mises-network.util";

const listenMethods = {
  mVerifyDomain: "verifyDomain",
  mVerifyContract: "verifyContract",
};

const storageKey = {
  ContractTrust: "v3_contract_trust_",
  DomainRisk: "v3_domain_risk_",
};

// const defaultVerifyDomainResult = {
//   domain_name: "",
//   type_string: "white",
//   origin: "",
// };

// const defaultVerifyContractResult = {
//   address: "",
//   trust_percentage: 100,
//   is_project_verified: false,
//   level: "safe",
// };

const isShouldVerifyStateKey = "isShouldVerify";

const TypeBackgroundResponse = "mises-background-response";

export class MisesSafeService {
  protected isShouldVerify: boolean = true;
  protected isInitClient: boolean = false;

  constructor(protected readonly kvStore: KVStore) {
    this.localShouldVerify();
  }
  // private misesSafe!: MisesSafe;

  init() {
    this.messageClient();
  }
  messageClient() {
    console.log("initMessageClient in background");
    // this.misesSafe = new MisesSafe();
    // !this.isInitClient && this.isShouldVerify && this.initMessageClient();
  }

  localShouldVerify() {
    this.kvStore.get(isShouldVerifyStateKey).then((res) => {
      this.isShouldVerify = !!res;
      this.messageClient();
    });
  }

  setIsShouldVerifyState(state: boolean) {
    this.isShouldVerify = state;
    if (state) {
      this.messageClient();
    }
    this.save();
  }

  save() {
    this.kvStore.set(isShouldVerifyStateKey, this.isShouldVerify);
  }

  initMessageClient(res: any) {
    this.isInitClient = true;
    // backgroundClient.listen("mises-content-request", (res: { params: { method: any; params: any; }; }, sendResponse: any) => {
    console.log("backgroud received message :>>", res);
    if (res?.params && typeof res.params.method === "undefined") {
      return;
    }
    switch (res.params.method) {
      case listenMethods.mVerifyDomain:
        return this.apiVerifyDomain(res.params.params.domain);
      case listenMethods.mVerifyContract:
        return this.apiVerifyContract(res.params.params.contractAddress);
    }
  }

  getDomainCacheKey(domain: string) {
    return storageKey.DomainRisk + domain.replace(".", "-");
  }
  getContractCacheKey(contractAddress: string) {
    return storageKey.ContractTrust + contractAddress.replace(".", "-");
  }
  async apiVerifyDomain(domain: string) {
    /*  const result = await this.kvStore.get(domain);
    if (result) {
      return result;
    } */
    const res = await misesRequest({
      url: "/phishing_site/check",
      data: {
        domain_name: domain,
      },
    });

    //this.kvStore.set(domain, res);
    return res;
  }

  async apiVerifyContract(contractAddress: string) {
    /*  const result = await this.kvStore.get(contractAddress);
    if (result) {
      return result;
    } */
    const res = await misesRequest({
      url: "/web3safe/verify_contract",
      data: {
        address: contractAddress,
      },
    });

    //this.kvStore.set(contractAddress, res);
    return res;
  }
}
