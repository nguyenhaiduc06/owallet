import { MsgSend } from "@owallet/proto-types/cosmos/bank/v1beta1/tx";
import React, { FunctionComponent } from "react";
import { Coin } from "@owallet/types";
import { observer } from "mobx-react-lite";
import { CoinPretty } from "@owallet/unit";
import { Bech32Address } from "@owallet/cosmos";
import { IMessageRenderer } from "./types";
import { FormattedMessage } from "react-intl";

import { Image, Text } from "react-native";
import { useStore } from "@src/stores";
import { useStyle } from "@src/styles";
import images from "@assets/images";
import OWText from "@components/text/ow-text";
import { useTheme } from "@src/themes/theme-provider";

export const SendMessage: IMessageRenderer = {
  process(chainId: string, msg) {
    const d = (() => {
      if ("type" in msg && msg.type === "cosmos-sdk/MsgSend") {
        return {
          amount: msg.value.amount,
          fromAddress: msg.value.from_address,
          toAddress: msg.value.to_address,
        };
      }

      if ("unpacked" in msg && msg.typeUrl === "/cosmos.bank.v1beta1.MsgSend") {
        return {
          amount: (msg.unpacked as MsgSend).amount,
          fromAddress: (msg.unpacked as MsgSend).fromAddress,
          toAddress: (msg.unpacked as MsgSend).toAddress,
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
          <FormattedMessage id="page.sign.components.messages.send.title" />
        ),
        content: (
          <SendMessagePretty
            chainId={chainId}
            amount={d.amount}
            toAddress={d.toAddress}
          />
        ),
      };
    }
  },
};

const SendMessagePretty: FunctionComponent<{
  chainId: string;
  amount: Coin[];
  toAddress: string;
}> = observer(({ chainId, amount, toAddress }) => {
  const { chainStore } = useStore();
  const style = useStyle();
  const coins = amount.map((coin) => {
    const currency = chainStore.getChain(chainId).forceFindCurrency(coin.denom);

    return new CoinPretty(currency, coin.amount);
  });
  const { colors } = useTheme();
  return (
    <OWText
      style={{
        ...style.flatten(["body3"]),
        color: colors["neutral-text-body"],
      }}
    >
      <FormattedMessage
        id="page.sign.components.messages.send.paragraph"
        values={{
          address: Bech32Address.shortenAddress(toAddress, 20),
          amount: coins
            .map((coinPretty) => {
              return coinPretty.trim(true).toString();
            })
            .join(", "),
          b: (...chunks: any) => (
            <OWText style={{ fontWeight: "bold" }}>{chunks}</OWText>
          ),
          br: "\n",
        }}
      />
    </OWText>
  );
});
