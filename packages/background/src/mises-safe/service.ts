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

// const TypeBackgroundResponse = "mises-background-response";

export class MisesSafeService {
  isShouldVerify: boolean = true;
  domainWhiteList: string[] = [];

  constructor(protected readonly kvStore: KVStore) {
    this.localShouldVerify();
    this.getDomainwhiteList();
  }
  // private misesSafe!: MisesSafe;

  getDomainwhiteList() {
    misesRequest({
      url: "https://web3.mises.site/website/whitesites.json",
    }).then((res) => {
      this.domainWhiteList = res;
    });
  }

  init() {
    this.messageClient();
  }
  messageClient() {
    // this.misesSafe = new MisesSafe();
    // !this.isInitClient && this.isShouldVerify && this.initMessageClient();
  }

  localShouldVerify() {
    this.kvStore.get(isShouldVerifyStateKey).then((res) => {
      this.isShouldVerify = res ? !!res : true;
    });
  }

  setIsShouldVerifyState(state: boolean) {
    this.isShouldVerify = state;
    this.save();
  }

  save() {
    this.kvStore.set(isShouldVerifyStateKey, this.isShouldVerify);
  }

  async initMessageClient(res: any) {
    if (!this.isShouldVerify) {
      console.log("disable Verify");
      return false;
    }
    // backgroundClient.listen("mises-content-request", (res: { params: { method: any; params: any; }; }, sendResponse: any) => {
    // console.log("backgroud received message :>>", res);
    if (res?.params && typeof res.params.method === "undefined") {
      return;
    }
    switch (res.params.method) {
      case listenMethods.mVerifyDomain:
        return this.apiVerifyDomain(res.params.params.domain);
      case listenMethods.mVerifyContract:
        return this.apiVerifyContract(
          res.params.params.contractAddress,
          res.params.params.domain
        );
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

  async apiVerifyContract(contractAddress: string, domain: string) {
    if (
      this.domainWhiteList.length > 0 &&
      this.domainWhiteList.includes(domain)
    ) {
      console.log("white list domain", domain);
      const safVerifyContractResult = {
        address: contractAddress,
        trust_percentage: 100,
        level: "safe",
      };
      return safVerifyContractResult;
    }
    const result = await this.kvStore.get(contractAddress);
    if (result) {
      return result;
    }
    const res = await misesRequest({
      url: "/web3safe/verify_contract",
      data: {
        address: contractAddress,
        domain: domain,
      },
    });

    this.kvStore.set(contractAddress, res);
    return res;
  }
}
