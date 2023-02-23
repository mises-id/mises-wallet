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

const contractLevel = {
  Safe: "safe",
  Danger: "danger",
};
const userAction = {
  Ignore: "IGNOR",
  Block: "BLOCK",
};

const isShouldVerifyStateKey = "isShouldVerify";

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
      if (res) {
        res.forEach((v: string) => {
          const domain = this.parseDomainUntilSecondLevel(v);
          if (v != "") {
            this.domainWhiteListMap.set(domain, "1");
          }
        });
      }
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

  parseDomainUntilSecondLevel(param: string): string {
    let domain = param;

    if (domain.match(/^[a-zA-Z0-9-]+:\/\/.+$/)) {
      domain = domain.replace(/^[a-zA-Z0-9-]+:\/\//, "");
    }
    const slash = domain.indexOf("/");
    if (slash >= 0) {
      domain = domain.slice(0, slash);
    }
    const qMark = domain.indexOf("?");
    if (qMark >= 0) {
      domain = domain.slice(0, qMark);
    }
    const split = domain
      .split(".")
      .map((str) => str.trim())
      .filter((str) => str.length > 0);

    if (split.length < 2) {
      return "";
    }
    const i = split[split.length - 1].indexOf(":");
    if (i >= 0) {
      split[split.length - 1] = split[split.length - 1].slice(0, i);
    }

    return split[split.length - 2] + "." + split[split.length - 1];
  }

  save() {
    this.kvStore.set(isShouldVerifyStateKey, this.isShouldVerify);
  }

  async initMessageClient(res: any) {
    if (!this.isShouldVerify) {
      console.log("disable Verify");
      return false;
    }
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
    domain = this.parseDomainUntilSecondLevel(domain);
    return domain !== "" && this.domainWhiteListMap.has(domain);
  }

  async verifyContract(contractAddress: string, domain: string) {
    //is ignore
    const isIgnore = await this.isIgnoreDomain(domain);
    console.log("verifyContract ignore <<:", isIgnore);
    if (isIgnore) {
      const verifyContractResult = {
        address: contractAddress,
        trust_percentage: 100,
        level: contractLevel.Safe,
        tag: "ignore",
      };
      return verifyContractResult;
    }
    const verifyContractResult = await this.apiVerifyContract(
      contractAddress,
      domain
    );
    console.log("verifyContractResult: ", verifyContractResult);
    //is should alert user
    if (
      verifyContractResult &&
      verifyContractResult.level === contractLevel.Danger
    ) {
      console.log("notifyPhishingDetected start: ", contractAddress);
      const userDecision = await this.notifyPhishingDetected(contractAddress);
      console.log("notifyPhishingDetected result: ", userDecision);
      if (userDecision === userAction.Ignore) {
        console.log("notifyPhishingDetected set: ", userDecision);
        this.setIgnorDomain(domain);
      }
    }
    return verifyContractResult;
  }

  setIgnoreContract(contractAddress: string) {
    this.kvStore.set(this.getContractCacheKey(contractAddress), "1");
  }

  async isIgnoreContract(contractAddress: string) {
    return await this.kvStore.get(this.getContractCacheKey(contractAddress));
  }

  setIgnorDomain(domain: string) {
    this.kvStore.set(this.getDomainCacheKey(domain), "1");
  }

  async isIgnoreDomain(domain: string) {
    return await this.kvStore.get(this.getDomainCacheKey(domain));
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
        level: contractLevel.Safe,
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
    if (res && res.level !== contractLevel.Danger) {
      this.kvStore.set(contractAddress, res);
    }
    return res;
  }
}
