import { ChainsService } from "../chains";
import { PermissionService } from "../permission";
import { Notification } from "./types";

import { MisesService } from "../mises";

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
    chainId: string,
    tx: unknown,
    mode: "async" | "sync" | "block"
  ): Promise<Uint8Array> {
    // const chainInfo = await this.chainsService.getChainInfo(chainId);
    console.log(chainId);

    this.notification.create({
      iconRelativeUrl: "assets/logo-256.png",
      title: "Tx is pending...",
      message: "Wait a second",
    });

    try {
      const result = await this.misesService.broadcastTx(
        tx as Uint8Array,
        mode
      );

      if (result.code != null && result.code !== 0) {
        throw new Error(result.log);
      }

      const txHash = result.hash;

      const hash = this.misesService.toHex(txHash);

      this.misesService.getTx(hash).then((txResult) => {
        BackgroundTxService.processTxResultNotification(
          this.notification,
          txResult
        );
      });
      // const txTracer = new TendermintTxTracer(chainInfo.rpc, "/websocket");
      // txTracer.traceTx(txHash).then((tx) => {
      //   txTracer.close();
      //   BackgroundTxService.processTxResultNotification(this.notification, tx);
      // });
      // this.misesService.getTx()

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
          const log = result.log ?? (result as any)["raw_log"];
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
