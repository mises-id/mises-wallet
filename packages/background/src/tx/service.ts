import { ChainsService } from "../chains";
import { PermissionService } from "../permission";
import { MisesService } from "../mises";
import { Notification } from "./types";

import { Buffer } from "buffer/";

interface CosmosSdkError {
  codespace: string;
  code: number;
  message: string;
}

interface ABCIMessageLog {
  msg_index: number;
  success: boolean;
  log: string;
  // Events StringEvents
}

export class BackgroundTxService {
  protected chainsService!: ChainsService;
  public permissionService!: PermissionService;

  constructor(
    protected readonly notification: Notification,
    protected readonly misesService: MisesService
  ) {}

  init(chainsService: ChainsService, permissionService: PermissionService) {
    this.chainsService = chainsService;
    this.permissionService = permissionService;
  }

  async sendTx(
    _chainId: string,
    tx: unknown,
    _mode: "async" | "sync" | "block"
  ): Promise<Uint8Array> {
    // const chainInfo = await this.chainsService.getChainInfo(chainId);
    // const restInstance = Axios.create({
    //   ...{
    //     baseURL: chainInfo.rest,
    //   },
    //   ...chainInfo.restConfig,
    // });
    console.log(_mode);
    this.notification.create({
      iconRelativeUrl: "assets/logo-256.png",
      title: "Tx is pending...",
      message: "Wait a second",
    });

    // const isProtoTx = Buffer.isBuffer(tx) || tx instanceof Uint8Array;

    // const params = isProtoTx
    //   ? {
    //       tx_bytes: Buffer.from(tx as any).toString("base64"),
    //       mode: (() => {
    //         switch (mode) {
    //           case "async":
    //             return "BROADCAST_MODE_ASYNC";
    //           case "block":
    //             return "BROADCAST_MODE_BLOCK";
    //           case "sync":
    //             return "BROADCAST_MODE_SYNC";
    //           default:
    //             return "BROADCAST_MODE_UNSPECIFIED";
    //         }
    //       })(),
    //     }
    //   : {
    //       tx,
    //       mode: mode,
    //     };

    try {
      // const result = await restInstance.post(
      //   isProtoTx ? "/cosmos/tx/v1beta1/txs" : "/txs",
      //   params
      // );
      const txResponse = await this.misesService.broadcastTx(tx as any);

      if (txResponse.code != null && txResponse.code !== 0) {
        throw new Error(txResponse["rawLog"]);
      }

      const txHash = Buffer.from(txResponse.transactionHash, "hex");

      BackgroundTxService.processTxResultNotification(
        this.notification,
        txResponse
      );

      return txHash;
    } catch (e: any) {
      console.log(e);
      BackgroundTxService.processTxErrorNotification(this.notification, e);
      throw e;
    }
  }

  private static processTxResultNotification(
    notification: Notification,
    result: any
  ): void {
    try {
      if (result.mode === "commit") {
        if (result.checkTx.code !== undefined && result.checkTx.code !== 0) {
          throw new Error(result.checkTx.log);
        }
        if (
          result.deliverTx.code !== undefined &&
          result.deliverTx.code !== 0
        ) {
          throw new Error(result.deliverTx.log);
        }
      } else {
        if (result.code != null && result.code !== 0) {
          // XXX: Hack of the support of the stargate.
          const log = result.log ?? (result as any)["rawLog"];
          throw new Error(log);
        }
      }

      notification.create({
        iconRelativeUrl: "assets/logo-256.png",
        title: "Tx succeeds",
        // TODO: Let users know the tx id?
        message: "Congratulations!",
      });
    } catch (e: any) {
      BackgroundTxService.processTxErrorNotification(notification, e);
    }
  }

  private static processTxErrorNotification(
    notification: Notification,
    e: Error
  ): void {
    console.log(e);
    let message = e.message;

    // Tendermint rpc error.
    const regResult = /code:\s*(-?\d+),\s*message:\s*(.+),\sdata:\s(.+)/g.exec(
      e.message
    );
    if (regResult && regResult.length === 4) {
      // If error is from tendermint
      message = regResult[3];
    }

    try {
      // Cosmos-sdk error in ante handler
      const sdkErr: CosmosSdkError = JSON.parse(e.message);
      if (sdkErr?.message) {
        message = sdkErr.message;
      }
    } catch {
      // noop
    }

    try {
      // Cosmos-sdk error in processing message
      const abciMessageLogs: ABCIMessageLog[] = JSON.parse(e.message);
      if (abciMessageLogs && abciMessageLogs.length > 0) {
        for (const abciMessageLog of abciMessageLogs) {
          if (!abciMessageLog.success) {
            const sdkErr: CosmosSdkError = JSON.parse(abciMessageLog.log);
            if (sdkErr?.message) {
              message = sdkErr.message;
              break;
            }
          }
        }
      }
    } catch {
      // noop
    }

    notification.create({
      iconRelativeUrl: "assets/logo-256.png",
      title: "Tx failed",
      message,
    });
  }
}
