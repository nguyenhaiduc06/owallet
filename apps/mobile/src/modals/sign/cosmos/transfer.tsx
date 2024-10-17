import { IMessageRenderer } from "./types";
import { MsgTransfer } from "@owallet/proto-types/ibc/applications/transfer/v1/tx";
import { FormattedMessage, useIntl } from "react-intl";
import React, { FunctionComponent, useState } from "react";
import { observer } from "mobx-react-lite";
import { Coin, CoinPretty } from "@owallet/unit";
import { Bech32Address } from "@owallet/cosmos";
import { Image, StyleSheet, Text } from "react-native";
import { useStore } from "@src/stores";
import { useStyle } from "@src/styles";
import { Box } from "@components/box";
import { Gutter } from "@components/gutter";
import { XAxis } from "@components/axis";
import { Button } from "@components/button";
import images from "@assets/images";

export const TransferMessage: IMessageRenderer = {
  process(chainId: string, msg) {
    const d = (() => {
      if ("type" in msg && msg.type === "cosmos-sdk/MsgTransfer") {
        return {
          token: msg.value.token,
          receiver: msg.value.receiver,
          channelId: msg.value.source_channel,
          ibcMemo: msg.value.memo,
        };
      }

      if (
        "unpacked" in msg &&
        msg.typeUrl === "/ibc.applications.transfer.v1.MsgTransfer"
      ) {
        return {
          token: (msg.unpacked as MsgTransfer).token,
          receiver: (msg.unpacked as MsgTransfer).receiver,
          channelId: (msg.unpacked as MsgTransfer).sourceChannel,
          ibcMemo: (msg.unpacked as MsgTransfer).memo,
        };
      }
    })();

    if (d) {
      return {
        icon: (
          <Image
            style={{ width: 48, height: 48 }}
            source={images.carbon_notification}
          />
        ),
        title: (
          <FormattedMessage id="page.sign.components.messages.transfer.title" />
        ),
        content: (
          <TransferMessagePretty
            chainId={chainId}
            amount={d.token}
            receiver={d.receiver}
            channelId={d.channelId}
            ibcMemo={d.ibcMemo}
          />
        ),
      };
    }
  },
};

const TransferMessagePretty: FunctionComponent<{
  chainId: string;
  amount: Coin;
  receiver: string;
  channelId: string;
  ibcMemo?: string;
}> = observer(({ chainId, amount, receiver, channelId, ibcMemo }) => {
  const { chainStore } = useStore();

  const intl = useIntl();
  const style = useStyle();

  const [isOpen, setIsOpen] = useState(false);

  const currency = chainStore.getChain(chainId).forceFindCurrency(amount.denom);
  const coinPretty = new CoinPretty(currency, amount.amount);

  return (
    <React.Fragment>
      <Text style={style.flatten(["body3", "color-text-middle"])}>
        <FormattedMessage
          id="page.sign.components.messages.transfer.paragraph"
          values={{
            coin: coinPretty.trim(true).toString(),
            address: Bech32Address.shortenAddress(receiver, 20),
            channelId,
            b: (...chunks: any) => (
              <Text style={{ fontWeight: "bold" }}>{chunks}</Text>
            ),
          }}
        />
      </Text>

      {ibcMemo ? (
        <Box>
          <Gutter size={6} />

          {isOpen ? (
            <React.Fragment>
              <Text
                style={StyleSheet.flatten([
                  style.flatten(["body3", "color-text-middle"]),
                  { width: 240, margin: 0, marginBottom: 8 },
                ])}
              >
                {isOpen
                  ? (() => {
                      try {
                        return JSON.stringify(JSON.parse(ibcMemo), null, 2);
                      } catch {
                        return ibcMemo;
                      }
                    })()
                  : ""}
              </Text>
            </React.Fragment>
          ) : null}
          <XAxis>
            <Button
              size="extra-small"
              color="secondary"
              containerStyle={{
                backgroundColor: style.get("color-gray-400").color,
              }}
              text={
                isOpen
                  ? intl.formatMessage({
                      id: "page.sign.components.messages.wasm-message-view.close-button",
                    })
                  : intl.formatMessage({
                      id: "page.sign.components.messages.wasm-message-view.details-button",
                    })
              }
              onPress={() => {
                setIsOpen(!isOpen);
              }}
            />
          </XAxis>
        </Box>
      ) : null}
    </React.Fragment>
  );
});
