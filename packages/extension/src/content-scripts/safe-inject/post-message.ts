// proxy scripts 发送和监听消息

class ProxyClient {
  eventListener: {
    addMessageListener: (fn: any) => void;
    removeMessageListener: (fn: any) => void;
    postMessage: (message: any) => void;
  };
  parseMessage: any;

  constructor() {
    this.eventListener = {
      addMessageListener: (fn) => window.addEventListener("message", fn),
      removeMessageListener: (fn) => window.removeEventListener("message", fn),
      postMessage: (message) =>
        window.postMessage(message, window.location.origin),
    };
  }
  requestMethod(
    method: string,
    params: { domain?: any; contractAddress?: any }
  ) {
    const bytes = new Uint8Array(8);
    const id = Array.from(crypto.getRandomValues(bytes))
      .map((value) => {
        return value.toString(16);
      })
      .join("");

    const proxyMessage = {
      type: "mises-proxy-request",
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      const receiveResponse = (e: { data: any }) => {
        const proxyResponse = this.parseMessage
          ? this.parseMessage(e.data)
          : e.data;
        if (
          !proxyResponse ||
          proxyResponse.type !== "mises-safe-proxy-request-response"
        ) {
          return;
        }

        if (proxyResponse.id !== id) {
          return;
        }
        this.eventListener.removeMessageListener(receiveResponse);
        const result = proxyResponse.result;

        if (!result) {
          reject(new Error("Result is null"));
          return;
        }
        if (result.error) {
          reject(new Error(result.error));
          return;
        }
        resolve(result.return);
      };

      this.eventListener.addMessageListener(receiveResponse);

      this.eventListener.postMessage(proxyMessage);
    });
  }
  async verifyDomain(domain: any) {
    return await this.requestMethod("verifyDomain", { domain });
  }
  async verifyContract(contractAddress: any) {
    return await this.requestMethod("verifyContract", { contractAddress });
  }

  //CurrentPage
  listenCurrentPage(method: string) {
    return new Promise((resolve, reject) => {
      const receiveResponse = (e: { data: any }) => {
        const proxyResponse = e.data;
        if (
          !proxyResponse ||
          proxyResponse.type !== "mises-proxy-listen-current-page"
        ) {
          return;
        }
        if (proxyResponse.method !== method) {
          return;
        }
        this.eventListener.removeMessageListener(receiveResponse);
        const result = proxyResponse.data;
        if (!result) {
          reject(new Error("Result is null"));
          return;
        }
        resolve(result);
      };
      this.eventListener.addMessageListener(receiveResponse);
    });
  }
  postUserDecision(decision: any) {
    const bytes = new Uint8Array(8);
    const id = Array.from(crypto.getRandomValues(bytes))
      .map((value) => {
        return value.toString(16);
      })
      .join("");
    const proxyMessage = {
      type: "mises-proxy-listen-current-page",
      id,
      method: "userDecision",
      data: { value: decision },
    };
    this.eventListener.postMessage(proxyMessage);
  }
  async listenUserDecision() {
    console.log("listenUserDecision");
    return await this.listenCurrentPage("userDecision");
  }
}

const proxyClient = new ProxyClient();

export { proxyClient };
