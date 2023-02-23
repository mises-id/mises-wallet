// /* global chrome */
import { proxyClient } from "./post-message";

// const dictionary = {
//   "0x095ea7b3": "approve",
//   "0xa22cb465": "setApprovalForAll",
//   "0x0752881a": "transfer",
//   "0x42842e0e": "safeTransferFrom",
//   "0xb88d4fde": "safeTransferFrom1",
// };
// type dictionaryKeys = keyof typeof dictionary;

const domainCheckStatus = {
  waitCheck: "waitCheck",
  pendingCheck: "pendingCheck",
  finshedCheck: "finshedCheck",
};

const domainSafeType = {
  whiteDomain: "white",
  blackDomain: "black",
  fuzzyDomain: "fuzzy",
  normalDomain: "normal",
};

const containerId = "mises-safe-container";

const parseOriginToHostname = (param: string): string => {
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
    throw new Error(`Invalid domain: ${param}`);
  }
  const i = split[split.length - 1].indexOf(":");
  if (i >= 0) {
    split[split.length - 1] = split[split.length - 1].slice(0, i);
  }
  return split.join(".");
};

export class ContentScripts {
  container: HTMLElement | null;
  domainInfo: {
    domainSafeType: string;
    hostname: string;
    type: string;
    suggestedDomain: string;
    checkStatus: string;
    isShowDomainAlert: boolean;
  };
  config: {
    maxRetryNum: number;
    retryCount: number;
  };
  constructor() {
    this.container = null;
    this.config = {
      maxRetryNum: 3,
      retryCount: 0,
    };
    this.domainInfo = {
      domainSafeType: "",
      hostname:
        window.location.ancestorOrigins.length > 0
          ? parseOriginToHostname(window.location.ancestorOrigins[0])
          : window.location.hostname,
      type: domainSafeType.normalDomain,
      suggestedDomain: "",
      checkStatus: domainCheckStatus.waitCheck,
      isShowDomainAlert: false,
    };
    this.init();
  }
  init() {
    this.initContainer();
    this.initWeb3Proxy();
  }
  // 初始化外层包裹元素
  initContainer() {
    const base = document.getElementById(containerId) as HTMLElement;

    if (base) {
      this.container = base;
      return;
    }

    this.container = document.createElement("div");
    this.container.setAttribute("id", containerId);
    this.container.setAttribute(
      "class",
      `chrome-extension-base-class${Math.floor(Math.random() * 10000)}`
    );
    document.body.appendChild(this.container);
  }

  initWeb3Proxy() {
    console.log("initWeb3Proxy");
    // const that = this;
    // 初始化代理
    const handler = {
      apply: async (target: any, _: any, argumentsList: any) => {
        const constList = [...argumentsList][0];
        console.log("Transaction Method Data :>> ", constList);
        const isNotable = this.isNotableAction(constList).result;
        const methodName =
          constList !== undefined ? constList.method : "unKonwn";
        //is should verifying domain
        if (this.isShouldVerifyDomain()) {
          this.verifyDomain();
        }
        if (this.isShouldVerifyContract() && isNotable) {
          let contractAddress;
          //TODO check
          if (methodName === "eth_signTypedData_v4") {
            const v4_sign_params = constList.params[1];
            const v4_sign_data = JSON.parse(v4_sign_params);
            contractAddress = v4_sign_data.domain.verifyingContract;
          } else {
            contractAddress = constList.params[0].to;
          }
          const verifyContractResult: any = proxyClient.verifyContract(
            contractAddress,
            this.domainInfo.hostname
          );
          console.log("verifyContractResult :>>", verifyContractResult);
          return target(...argumentsList);
          //is should show contract address risking alert
        }
        return target(...argumentsList);
      },
    };
    const proxyInterval = setInterval(() => proxyETH(), 1000);

    function proxyETH() {
      if (typeof window.ethereum !== "undefined") {
        const proxy1 = new Proxy(window.ethereum.request, handler);
        window.ethereum.request = proxy1;
        //window.ethereum.send = proxy1;
        //window.ethereum.sendAsync = proxy1;
        //window.ethereum.enable = proxy1;
        console.log("Find ethereum");
        clearInterval(proxyInterval);
      } else if (typeof window.web3 !== "undefined") {
        const proxy2 = new Proxy(window.web3.currentProvider, handler);
        window.web3.currentProvider = proxy2;
        console.log("Find web3");
        clearInterval(proxyInterval);
      } else {
        console.log("Did not find ethereum or web3");
      }
    }

    setTimeout(() => {
      clearInterval(proxyInterval);
    }, 10000);
  }

  //isNotableAction
  isNotableAction(constList: { method: string; params: string | any[] }) {
    // 检查是否为关注的交易
    try {
      // const notableActionList = ['approve', 'setApprovalForAll', 'transfer', 'safeTransferFrom', 'safeTransferFrom1'];
      if (typeof constList.method !== "undefined") {
        if (constList.method === "eth_sendTransaction") {
          let functionName = "transfer";
          // 当 params 长度为 0 或 params[0].data 为 undefined 时
          if (constList.params.length === 0) {
            functionName = "transfer";
          } else if (constList.params[0].data === undefined) {
            functionName = "transfer";
          } else {
          }
          return { result: true, action: functionName };
        }
        if (constList.method === "eth_signTypedData_v4") {
          return { result: true, action: "sign" };
        }
      }
      return { result: false };
    } catch (error) {
      return { result: false };
    }
  }

  //isShouldVerifyContract
  isShouldVerifyContract() {
    return this.domainInfo.domainSafeType !== domainSafeType.whiteDomain;
  }

  //isShouldVerifyDomain
  isShouldVerifyDomain() {
    return false;
    //ignore list
    return this.domainInfo.checkStatus !== domainCheckStatus.finshedCheck;
  }
  //verifyDomain
  async verifyDomain() {
    if (this.domainInfo.checkStatus === domainCheckStatus.finshedCheck) {
      return true;
    }
    /* if (this.domainInfo.checkStatus === domainCheckStatus.pendingCheck) {
      return false;
    } */
    this.domainInfo.checkStatus = domainCheckStatus.pendingCheck;
    const checkResult: any = await proxyClient.verifyDomain(
      this.domainInfo.hostname
    );
    this.domainInfo.checkStatus = domainCheckStatus.finshedCheck;
    console.log("checkResult :>>", checkResult);
    //parse the check result
    if (checkResult) {
      this.domainInfo.domainSafeType = checkResult.type_string;
      this.domainInfo.suggestedDomain = checkResult.origin;
    } else if (this.config.retryCount < this.config.maxRetryNum) {
      this.domainInfo.checkStatus = domainCheckStatus.waitCheck;
      this.config.retryCount++;
      console.log("verifyDomain retry ", this.config.retryCount);
    } else {
      this.domainInfo.checkStatus = domainCheckStatus.finshedCheck;
    }
  }
}
