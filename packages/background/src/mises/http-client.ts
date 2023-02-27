import {
  isJsonRpcErrorResponse,
  JsonRpcRequest,
  JsonRpcSuccessResponse,
  // eslint-disable-next-line import/no-extraneous-dependencies
} from "@cosmjs/json-rpc";
import { RpcClient } from "@cosmjs/tendermint-rpc/build/rpcclients";
import { hasProtocol } from "@cosmjs/tendermint-rpc/build/rpcclients/rpcclient";
import { misesRequest } from "./mises-network.util";

export interface HttpEndpoint {
  /**
   * The URL of the HTTP endpoint.
   *
   * For POST APIs like Tendermint RPC in CosmJS,
   * this is without the method specific paths (e.g. https://cosmoshub-4--rpc--full.datahub.figment.io/)
   */
  readonly url: string;
  /**
   * HTTP headers that are sent with every request, such as authorization information.
   */
  readonly headers: Record<string, string>;
}

export class HttpClient implements RpcClient {
  protected readonly url: string;
  protected readonly headers: Record<string, string> | undefined;

  public constructor(endpoint: string | HttpEndpoint) {
    if (typeof endpoint === "string") {
      // accept host.name:port and assume http protocol
      this.url = hasProtocol(endpoint) ? endpoint : "http://" + endpoint;
    } else {
      this.url = endpoint.url;
      this.headers = endpoint.headers;
    }
  }

  public disconnect(): void {
    // nothing to be done
  }

  public async execute(
    request: JsonRpcRequest
  ): Promise<JsonRpcSuccessResponse> {
    const response = await misesRequest({
      url: this.url,
      method: "POST",
      data: request ? JSON.stringify(request) : undefined,
      headers: {
        "Content-Type": "application/json",
        ...this.headers,
      },
      timeout: 5000,
      isCustomRequest: true,
    });
    if (isJsonRpcErrorResponse(response)) {
      throw new Error(JSON.stringify(response.error));
    }
    return response;
  }
}
