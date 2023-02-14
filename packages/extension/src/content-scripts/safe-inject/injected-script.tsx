/* global chrome */
import React from "react";
import { render } from "react-dom";
import { Drawer } from "./Drawer";
import { proxyClient } from "./post-message";

const dictionary = {
  "0x095ea7b3": "approve",
  "0xa22cb465": "setApprovalForAll",
  "0x0752881a": "transfer",
  "0x42842e0e": "safeTransferFrom",
  "0xb88d4fde": "safeTransferFrom1",
};
type dictionaryKeys = keyof typeof dictionary;

const domainCheckStatus = {
  waitCheck: "waitCheck",
  pendingCheck: "pendingCheck",
  finshedCheck: "finshedCheck",
};

const domainSafeType = {
  whiteDomain: "white",
  blackDomain: "black",
  fuzzyDomain: "fuzzy",
};

const storageKey = {
  DomainIgnore: "domain_ignore_",
  ContractIgnore: "contract_ignore_",
};

const containerId = "mises-safe-container";

export class ContentScripts {
  container: HTMLElement | null;
  domainInfo: {
    domainSafeType: string;
    domain: string;
    hostname: string;
    type: string;
    suggestedDomain: string;
    checkStatus: string;
    isShowDomainAlert: boolean;
  };
  constructor() {
    this.container = null;
    this.domainInfo = {
      domainSafeType: "",
      domain: document.location.hostname.split(".").slice(-2).join("."),
      hostname: document.location.hostname,
      type: domainSafeType.whiteDomain,
      suggestedDomain: "",
      checkStatus: domainCheckStatus.waitCheck,
      isShowDomainAlert: false,
    };
    this.init();
  }
  init() {
    document.addEventListener("DOMContentLoaded", () => {
      this.initContainer();
      this.initWeb3Proxy();
    });
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

  showContainer() {
    const contentStyle =
      "position: fixed; top: 0; left: 0; display: block; width: 100%; height: 10%; z-index: 9999;";
    document.getElementById(containerId)?.setAttribute("style", contentStyle);
  }

  hideContainer() {
    const contentStyle =
      "position: fixed; top: 0; left: 0; display: none; width: 100%; height: 10%; z-index: 9999;";
    document.getElementById(containerId)?.setAttribute("style", contentStyle);
  }

  initWeb3Proxy() {
    // const that = this;
    // 初始化代理
    const handler = {
      apply: async (target: any, _: any, argumentsList: any) => {
        const constList = [...argumentsList][0];
        console.log("Transaction Method Data :>> ", constList);
        const isNotable = this.isNotableAction(constList).result;
        const actionName = this.isNotableAction(constList).action;
        const methodName = constList.method;

        //is should verifying domain
        if (this.isShouldVerifyDomain()) {
          await this.verifyDomain();
        }
        //is should show domain alert
        if (this.isShouldShowDomainAlert()) {
          const domainAlertType =
            methodName === "eth_requestAccounts"
              ? "domainAlert"
              : "domainHandler";

          this.showDomainAlert(domainAlertType);
          //if request eth_requestAccounts wait verify result
          const decisionData: any = await proxyClient.listenUserDecision();
          this.afterAlertDecision("domain", decisionData.value);

          if (decisionData.value === "continue") {
            //cache
            return target(...argumentsList);
          }
        }
        //is should verify contract address if domain not in white list to verifying contract address
        if (this.isShouldVerifyContract() && isNotable) {
          let contractAddress, assetValue;
          //TODO check
          if (methodName === "eth_signTypedData_v4") {
            const v4_sign_params = constList.params[1];
            const v4_sign_data = JSON.parse(v4_sign_params);
            contractAddress = v4_sign_data.domain.verifyingContract;
            assetValue = "Token";
          } else {
            contractAddress = constList.params[0].to;
            assetValue = "Token";
          }
          const verifyContractResult: any = await proxyClient.verifyContract(
            contractAddress
          );
          console.log("verifyContractResult :>>", verifyContractResult);
          //is should show contract address risking alert
          if (
            this.isShouldShowContractAlert(
              verifyContractResult,
              contractAddress
            )
          ) {
            const contractAddressTrustLevel = verifyContractResult.data.level;
            if (contractAddressTrustLevel === "danger") {
              this.showContractAlert({
                type: "contractAlert",
                contractAddress,
                actionName,
                assetValue,
              });
              // 监听用户选择
              //const decisionData = await proxyClient.listenMessage('user_decision');
              const decisionData: any = await proxyClient.listenUserDecision();
              if (decisionData.value === "continue") {
                //set cache
                sessionStorage.setItem(
                  this.getContractCacheKey(contractAddress),
                  "1"
                );
                return target(...argumentsList);
              }
              return null;
            }
          }
        }
        return target(...argumentsList);
      },
    };
    const proxyInterval = setInterval(() => proxyETH(), 1000);

    function proxyETH() {
      if (typeof window.ethereum !== "undefined") {
        const proxy1 = new Proxy(window.ethereum.request, handler);
        window.ethereum.request = proxy1;
        clearInterval(proxyInterval);
        console.log("proxy1");
      } else if (typeof window.web3 !== "undefined") {
        const proxy2 = new Proxy(window.web3.currentProvider, handler);
        window.web3.currentProvider = proxy2;
        clearInterval(proxyInterval);
        console.log("proxy2");
      } else {
        console.log("Did not find ethereum or web3");
      }
    }
    setTimeout(() => {
      clearInterval(proxyInterval);
    }, 10000);
  }

  afterAlertDecision(type: string, decision: string) {
    if (decision === "continue" && type === "domain") {
      const key = this.getDomainCacheKey();
      sessionStorage.setItem(key, "1");
    }
  }

  getDomainCacheKey() {
    return storageKey.DomainIgnore + this.domainInfo.hostname.replace(".", "-");
  }

  getContractCacheKey(contractAddress: string) {
    return storageKey.ContractIgnore + contractAddress.replace(".", "-");
  }

  //isNotableAction
  isNotableAction(constList: { method: string; params: string | any[] }) {
    // 检查是否为关注的交易
    try {
      // const notableActionList = ['approve', 'setApprovalForAll', 'transfer', 'safeTransferFrom', 'safeTransferFrom1'];
      if (typeof constList.method !== "undefined") {
        if (constList.method === "eth_sendTransaction") {
          let functionName;
          // 当 params 长度为 0 或 params[0].data 为 undefined 时
          if (constList.params.length === 0) {
            functionName = "transfer";
          } else if (constList.params[0].data === undefined) {
            functionName = "transfer";
          } else {
            const key: dictionaryKeys = constList.params[0].data.substring(
              0,
              10
            );
            functionName = dictionary[key];
          }
          return { result: true, action: functionName };
          /*  if (notableActionList.includes(functionName)) {
               return { result: true, action: functionName };
           } */
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

  //isShouldShowDomainAlert
  isShouldShowDomainAlert() {
    //ignore
    const key = this.getDomainCacheKey();
    console.log(key, "keykeykeykey");
    return true;
    const isIgnore = sessionStorage.getItem(key);
    return (
      !this.domainInfo.isShowDomainAlert &&
      this.domainInfo.domainSafeType !== domainSafeType.whiteDomain &&
      !isIgnore
    );
  }
  //isShouldShowContractAlert
  isShouldShowContractAlert(
    verifyContractResult: { code: number; data: any },
    contractAddress: string
  ) {
    //ignore
    const key = this.getContractCacheKey(contractAddress);
    const isIgnore = sessionStorage.getItem(key);
    console.log("Contract is ignore", isIgnore);
    return (
      typeof verifyContractResult.code !== "undefined" &&
      verifyContractResult.code === 0 &&
      typeof verifyContractResult.data !== "undefined" &&
      !isIgnore
    );
  }
  //isShouldVerifyDomain
  isShouldVerifyDomain() {
    return true;
    //ignore list
    return this.domainInfo.checkStatus === domainCheckStatus.waitCheck;
  }
  //verifyDomain
  async verifyDomain() {
    if (this.domainInfo.checkStatus !== domainCheckStatus.waitCheck) {
      return;
    }
    this.domainInfo.checkStatus = domainCheckStatus.pendingCheck;
    const checkResult: any = await proxyClient.verifyDomain(
      this.domainInfo.hostname
    );
    this.domainInfo.checkStatus = domainCheckStatus.finshedCheck;
    console.log("checkResult :>>", checkResult);
    //parse the check result
    if (typeof checkResult.code !== "undefined" && checkResult.code === 0) {
      this.domainInfo.domainSafeType = checkResult.data.type_string;
      this.domainInfo.suggestedDomain = checkResult.data.origin;
    }
  }

  //showContractAlert
  showContractAlert({
    type,
    contractAddress,
    actionName,
    assetValue,
  }: {
    type: string;
    contractAddress: string;
    actionName: string | undefined;
    assetValue: string;
  }) {
    this.renderDrawerAlert({ type, contractAddress, actionName, assetValue });
  }
  //showDomainAlert
  showDomainAlert(type: string) {
    this.domainInfo.isShowDomainAlert = true;
    this.renderDrawerAlert({
      type,
      domain: this.domainInfo.hostname,
      suggestedDomain: this.domainInfo.suggestedDomain,
    });
  }
  //renderDrawerAlert
  renderDrawerAlert({
    type,
    contractAddress,
    actionName,
    assetValue,
    domain,
    suggestedDomain,
  }: {
    type: string;
    actionName?: string;
    contractAddress?: string;
    domain?: string;
    suggestedDomain?: string;
    assetValue?: string;
  }) {
    console.log({
      type,
      contractAddress,
      actionName,
      assetValue,
      domain,
      suggestedDomain,
    });
    this.showContainer();
    render(
      <Drawer
        type={type}
        contractAddress={contractAddress}
        actionName={actionName}
        assetValue={assetValue}
        domain={domain}
        suggestedDomain={suggestedDomain}
        onClose={this.hideContainer}
      />,
      this.container
    );
  }
}
