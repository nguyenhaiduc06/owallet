import { ChainsService } from "../chains";
import { simpleFetch } from "@owallet/simple-fetch";
import { Notification } from "../tx/types";
import { EthTxReceipt } from "@owallet/types";
import { retry } from "@owallet/common";

export class BackgroundTxEthereumService {
  constructor(
    protected readonly chainsService: ChainsService,
    protected readonly notification: Notification
  ) {}

  async init(): Promise<void> {
    // noop
  }

  async sendEthereumTx(
    origin: string,
    chainId: string,
    tx: Uint8Array,
    options: {
      silent?: boolean;
      onFulfill?: (txReceipt: EthTxReceipt) => void;
    }
  ): Promise<string> {
    if (!options.silent) {
      this.notification.create({
        iconRelativeUrl: "assets/orai_wallet_logo.png",
        title: "Tx is pending...",
        message: "Wait a second",
      });
    }

    try {
      const chainInfo = this.chainsService.getChainInfoOrThrow(chainId);
      const evmInfo = ChainsService.getEVMInfo(chainInfo);
      if (!evmInfo) {
        throw new Error("No EVM info provided");
      }

      console.log("tx", chainId, [`0x${Buffer.from(tx).toString("hex")}`]);

      const sendRawTransactionResponse = await simpleFetch<{
        result?: string;
        error?: Error;
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      }>(evmInfo.rpc, "", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "request-source": origin,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_sendRawTransaction",
          params: [`0x${Buffer.from(tx).toString("hex")}`],
          id: 1,
        }),
      });

      const txHash = sendRawTransactionResponse.data.result;
      if (sendRawTransactionResponse.data.error || !txHash) {
        throw (
          sendRawTransactionResponse.data.error ??
          new Error("No tx hash responded")
        );
      }

      retry(
        () => {
          return new Promise<void>(async (resolve, reject) => {
            const txReceiptResponse = await simpleFetch<{
              result: EthTxReceipt | null;
              error?: Error;
            }>(evmInfo.rpc, {
              method: "POST",
              headers: {
                "content-type": "application/json",
                "request-source": origin,
              },
              body: JSON.stringify({
                jsonrpc: "2.0",
                method: "eth_getTransactionReceipt",
                params: [txHash],
                id: 1,
              }),
            });

            if (txReceiptResponse.data.error) {
              console.error(txReceiptResponse.data.error);
              resolve();
            }

            const txReceipt = txReceiptResponse.data.result;
            if (txReceipt) {
              options?.onFulfill?.(txReceipt);
              BackgroundTxEthereumService.processTxResultNotification(
                this.notification
              );
              resolve();
            }

            reject();
          });
        },
        {
          maxRetries: 10,
          waitMsAfterError: 500,
          maxWaitMsAfterError: 4000,
        }
      );

      return txHash;
    } catch (e) {
      console.error(e);
      if (!options.silent) {
        BackgroundTxEthereumService.processTxErrorNotification(
          this.notification,
          e
        );
      }
      throw e;
    }
  }

  private static processTxResultNotification(notification: Notification): void {
    try {
      notification.create({
        iconRelativeUrl: "assets/orai_wallet_logo.png",
        title: "Tx succeeds",
        // TODO: Let users know the tx id?
        message: "Congratulations!",
      });
    } catch (e) {
      BackgroundTxEthereumService.processTxErrorNotification(notification, e);
    }
  }

  private static processTxErrorNotification(
    notification: Notification,
    e: Error
  ): void {
    const message = e.message;

    notification.create({
      iconRelativeUrl: "assets/orai_wallet_logo.png",
      title: "Tx failed",
      message,
    });
  }
}
