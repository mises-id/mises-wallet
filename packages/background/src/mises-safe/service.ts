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

const userAction = {
  Ignore: "IGNOR",
  Block: "BLOCK",
};

const isShouldVerifyStateKey = "isShouldVerify";
const dangerVerifyContractLevel = "danger";

// const TypeBackgroundResponse = "mises-background-response";

export class MisesSafeService {
  isShouldVerify: boolean = true;
  domainWhiteListMap: Map<string, string> = new Map();

  constructor(protected readonly kvStore: KVStore) {
    console.log("MisesSafeService init");
    this.localShouldVerify();
    this.getDomainwhiteList();
  }
  // private misesSafe!: MisesSafe;

  getDomainwhiteList() {
    misesRequest({
      url: "https://web3.mises.site/website/whitesites.json",
    }).then((res) => {
      res.forEach((v: string) => this.domainWhiteListMap.set(v, "1"));
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
        return this.verifyContract(
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

  isDomainWhitelisted(domain: string) {
    return this.domainWhiteListMap.has(domain);
  }

  async verifyContract(contractAddress: string, domain: string) {
    //is ignore
    if (await this.isIgnoreContract(contractAddress)) {
      const verifyContractResult = {
        address: contractAddress,
        trust_percentage: 100,
        level: "safe",
        tag: "ignore",
      };
      return verifyContractResult;
    }
    const verifyContractResult = await this.apiVerifyContract(
      contractAddress,
      domain
    );
    //is should alert user
    if (
      verifyContractResult &&
      verifyContractResult.level === dangerVerifyContractLevel
    ) {
      const userDecision = await this.notifyPhishingDetected(contractAddress);
      console.log("notifyPhishingDetected result: ", userDecision);
      if (userDecision === userAction.Ignore) {
        this.setIgnoreContract(contractAddress);
      } else if (userDecision === userAction.Block) {
        //close the site
        chrome.tabs.query({ active: true }, function (tabs) {
          if (tabs.length > 0 && tabs[0].id) {
            const id = tabs[0].id;
            chrome.tabs.remove(id, function () {});
          }
        });
      }
    }
    return verifyContractResult;
  }

  setIgnoreContract(contractAddress: string) {
    this.kvStore.set(this.getContractCacheKey(contractAddress), "1");
  }

  async isIgnoreContract(contractAddress: string) {
    return await this.kvStore.get(contractAddress);
  }

  notifyPhishingDetected(address: string): Promise<string> {
    return new Promise((resolve) => {
      if (
        (browser as any).misesPrivate &&
        (browser as any).misesPrivate.notifyPhishingDetected
      ) {
        (browser as any).misesPrivate.notifyPhishingDetected(address, resolve);
        return;
      }
      resolve("mises");
    });
  }

  async apiVerifyContract(contractAddress: string, domain: string) {
    if (this.isDomainWhitelisted(domain)) {
      const safeVerifyContractResult = {
        address: contractAddress,
        trust_percentage: 100,
        level: "safe",
        tag: "white",
      };
      return safeVerifyContractResult;
    }
    //cache
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
