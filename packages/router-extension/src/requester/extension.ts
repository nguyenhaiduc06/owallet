import {
  MessageRequester,
  Message,
  OWalletError,
  JSONUint8Array,
  EthereumProviderRpcError,
} from "@owallet/router";
import { getOWalletExtensionRouterId } from "../utils";

export class InExtensionMessageRequester implements MessageRequester {
  async sendMessage<M extends Message<unknown>>(
    port: string,
    msg: M
  ): Promise<M extends Message<infer R> ? R : never> {
    msg.validateBasic();
    // console.log("msg InExtensionMessageRequester", msg);

    // Set message's origin.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    msg["origin"] = globalThis.location.origin;
    msg.routerMeta = {
      ...msg.routerMeta,
      routerId: getOWalletExtensionRouterId(),
    };

    const result = JSONUint8Array.unwrap(
      await browser.runtime.sendMessage({
        port,
        type: msg.type(),
        msg: JSONUint8Array.wrap(msg),
      })
    );

    // console.log("result", result, msg);

    if (!result) {
      throw new Error("Null result");
    }

    if (result.error) {
      if (typeof result.error === "string") {
        throw new Error(result.error);
      } else {
        if (typeof result.error.module === "string") {
          throw new OWalletError(
            result.error.module,
            result.error.code,
            result.error.message
          );
        } else {
          throw new EthereumProviderRpcError(
            result.error.code,
            result.error.message,
            result.error.data
          );
        }
      }
    }

    return result.return;
  }

  static async sendMessageToTab<M extends Message<unknown>>(
    tabId: number,
    port: string,
    msg: M
  ): Promise<M extends Message<infer R> ? R : never> {
    msg.validateBasic();

    // Set message's origin.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    msg["origin"] = globalThis.location.origin;
    msg.routerMeta = {
      ...msg.routerMeta,
      routerId: getOWalletExtensionRouterId(),
    };

    const result = JSONUint8Array.unwrap(
      await browser.tabs.sendMessage(tabId, {
        port,
        type: msg.type(),
        msg: JSONUint8Array.wrap(msg),
      })
    );

    if (!result) {
      throw new Error("Null result");
    }

    if (result.error) {
      if (typeof result.error === "string") {
        throw new Error(result.error);
      } else {
        if (typeof result.error.module === "string") {
          throw new OWalletError(
            result.error.module,
            result.error.code,
            result.error.message
          );
        } else {
          throw new EthereumProviderRpcError(
            result.error.code,
            result.error.message,
            result.error.data
          );
        }
      }
    }

    return result.return;
  }
}
