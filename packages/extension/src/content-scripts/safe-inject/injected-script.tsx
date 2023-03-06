// /* global chrome */
import { proxyClient } from "./post-message";
//import { image_similar } from "./image-similar";

const domainCheckStatus = {
  waitCheck: "waitCheck",
  pendingCheck: "pendingCheck",
  finshedCheck: "finshedCheck",
};

const domainSafeLevel = {
  White: "white",
  Black: "black",
  Fuzzy: "fuzzy",
  Normal: "normal",
};

export type verifyDomainResult = {
  domain: string;
  level: string;
  suggested_url: string;
  html_body_fuzzy_hash?: string;
  logo_phash?: string;
  title_keyword?: string;
  tag?: string;
};

const containerId = "mises-safe-container";

const parseUrlToDomain = (param: string, type: string = "domain"): string => {
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
  if (type === "topdomain") {
    return split[split.length - 2] + "." + split[split.length - 1];
  }
  return split.join(".");
};

export class ContentScripts {
  container: HTMLElement | null;
  domainInfo: {
    domainSafeLevel: string;
    hostname: string;
    type: string;
    suggested_url: string;
    checkStatus: string;
    isFuzzyCheck: boolean;
    html_body_fuzzy_hash: string;
    logo_phash: string;
    title_keyword: string;
  };
  config: {
    maxRetryNum: number;
    retryCount: number;
  };
  constructor() {
    this.container = null;
    this.config = {
      maxRetryNum: 1,
      retryCount: 0,
    };
    this.domainInfo = {
      domainSafeLevel: "",
      hostname:
        window.location.ancestorOrigins.length > 0
          ? parseUrlToDomain(window.location.ancestorOrigins[0])
          : window.location.hostname,
      type: domainSafeLevel.Normal,
      suggested_url: "",
      checkStatus: domainCheckStatus.waitCheck,
      isFuzzyCheck: false,
      html_body_fuzzy_hash: "",
      logo_phash: "",
      title_keyword: "",
    };
    this.init();
  }
  init() {
    if (window.location.ancestorOrigins.length > 0) {
      return;
    }
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
    return this.domainInfo.domainSafeLevel !== domainSafeLevel.White;
  }

  //isShouldVerifyDomain
  isShouldVerifyDomain() {
    //ignore list
    return this.domainInfo.checkStatus !== domainCheckStatus.finshedCheck;
  }
  //verifyDomain
  async verifyDomain() {
    if (this.domainInfo.checkStatus === domainCheckStatus.finshedCheck) {
      return true;
    }
    if (this.config.retryCount >= this.config.maxRetryNum) {
      return;
    }
    this.config.retryCount++;
    console.log("verifyDomain count ", this.config.retryCount);
    this.domainInfo.checkStatus = domainCheckStatus.pendingCheck;
    const checkResult: any = await proxyClient.verifyDomain(
      this.domainInfo.hostname,
      this.getSiteLogo()
    );
    console.log("checkResult :>>", checkResult);
    //parse the check result
    if (
      checkResult &&
      checkResult.level &&
      this.domainInfo.checkStatus != domainCheckStatus.finshedCheck
    ) {
      this.domainInfo.checkStatus = domainCheckStatus.finshedCheck;
      this.domainInfo.domainSafeLevel = checkResult.level;
      this.domainInfo.suggested_url = checkResult.suggested_url;
      this.domainInfo.html_body_fuzzy_hash =
        checkResult.html_body_fuzzy_hash || "";
      this.domainInfo.logo_phash = checkResult.logo_phash || "";
      this.domainInfo.title_keyword = checkResult.title_keyword || "";
      //if domainSafeLevel == fuzzy to check
      if (this.domainInfo.domainSafeLevel == domainSafeLevel.Fuzzy) {
        this.doFuzzyCheck();
      }
    }
    if (this.config.retryCount >= this.config.maxRetryNum) {
      this.domainInfo.checkStatus = domainCheckStatus.finshedCheck;
      return;
    }
  }

  //doFuzzyCheck
  async doFuzzyCheck() {
    if (this.domainInfo.isFuzzyCheck) {
      return;
    }
    this.domainInfo.isFuzzyCheck = true;
    //check title
    if (this.fuzzyCheckTitle()) {
      return this.notifyFuzzyDomain("title");
    }
    //logo
    if (this.fuzzyCheckLogo()) {
      return this.notifyFuzzyDomain("logo");
    }
    //html
    if (await this.fuzzyCheckHtml()) {
      return this.notifyFuzzyDomain("html");
    }
  }

  fuzzyCheckTitle(): boolean {
    if (this.domainInfo.title_keyword != "") {
      const origin_title_keyword: string = this.domainInfo.title_keyword.toLowerCase();
      const title = document.title.toLowerCase();
      console.log("document: ", title);
      const title_arr = title.toLowerCase().replace(",", "").split(" ");
      if (
        title_arr.find((title) => {
          return title == origin_title_keyword;
        })
      ) {
        return true;
      }
    }
    return false;
  }

  fuzzyCheckLogo(): boolean {
    const suggested_url_domain = parseUrlToDomain(
      this.domainInfo.suggested_url,
      "topdomain"
    );
    if (suggested_url_domain == "") {
      return false;
    }
    const links = document.querySelectorAll("head > link");
    for (const link of links) {
      if (!link.hasAttribute("href")) {
        continue;
      }
      const href = link.getAttribute("href") || "";
      if (
        href.indexOf("http") != -1 &&
        suggested_url_domain === parseUrlToDomain(href)
      ) {
        return true;
      }
    }
    return false;
  }

  getSiteLogo(): string {
    const links = document.getElementsByTagName("link");
    let site_logo = "";
    if (links.length > 0) {
      for (let i = 0; i < links.length; i++) {
        if (i > 10) {
          break;
        }
        if (links[i].rel.indexOf("icon") > -1) {
          const logo = links[i].href;
          const sizes = links[i].sizes;
          if (site_logo == "") {
            site_logo = logo;
          }
          if (sizes && sizes.toString() == "32x32") {
            site_logo = logo;
            break;
          }
        }
      }
    }
    console.log("site_logo: ", site_logo);
    return site_logo;
  }

  async fuzzyCheckHtml(): Promise<boolean> {
    if (this.domainInfo.html_body_fuzzy_hash == "") {
      return false;
    }
    const body = document.body.outerHTML;
    const score = await proxyClient.calculateHtmlSimilarly(
      body,
      this.domainInfo.html_body_fuzzy_hash
    );
    console.log("score: ", score);
    if (score && score > 60) {
      return true;
    }
    return false;
  }

  async notifyFuzzyDomain(tag: string) {
    console.log("doFuzzyCheck notifyFuzzyDomain start tag ", tag);
    const result = await proxyClient.notifyFuzzyDomain(
      this.domainInfo.hostname,
      this.domainInfo.suggested_url
    );
    console.log("doFuzzyCheck result >>: ", result);
  }
}
