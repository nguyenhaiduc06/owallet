import { ChainGetter } from "@owallet/stores";
import { ObservableQueryBalances } from "@owallet/stores";
import { useFeeConfig } from "./fee";
import { AmountConfig } from "./amount";
import { useGasConfig } from "./gas";
import { useMemoConfig } from "./memo";
import { useRecipientConfig } from "./recipient";
import { AppCurrency } from "@owallet/types";
import { useState } from "react";

export class DelegateAmountConfig extends AmountConfig {
  get sendableCurrencies(): AppCurrency[] {
    return [this.chainInfo.stakeCurrency];
  }
}

export const useDelegateAmountConfig = (
  chainGetter: ChainGetter,
  chainId: string,
  sender: string,
  queryBalances: ObservableQueryBalances
) => {
  const [txConfig] = useState(
    () =>
      new DelegateAmountConfig(
        chainGetter,
        chainId,
        sender,
        undefined,
        queryBalances
      )
  );
  txConfig.setChain(chainId);
  txConfig.setQueryBalances(queryBalances);
  txConfig.setSender(sender);

  return txConfig;
};

export const useDelegateTxConfig = (
  chainGetter: ChainGetter,
  chainId: string,
  gas: number,
  sender: string,
  queryBalances: ObservableQueryBalances,
  ensEndpoint?: string
) => {
  const amountConfig = useDelegateAmountConfig(
    chainGetter,
    chainId,
    sender,
    queryBalances
  );

  const memoConfig = useMemoConfig(chainGetter, chainId);
  const gasConfig = useGasConfig(chainGetter, chainId, gas);
  gasConfig.setGas(gas);
  const feeConfig = useFeeConfig(
    chainGetter,
    chainId,
    sender,
    queryBalances,
    amountConfig,
    gasConfig
  );
  // Due to the circular references between the amount config and gas/fee configs,
  // set the fee config of the amount config after initing the gas/fee configs.
  amountConfig.setFeeConfig(feeConfig);

  const recipientConfig = useRecipientConfig(chainGetter, chainId, ensEndpoint);
  recipientConfig.setBech32Prefix(
    chainGetter.getChain(chainId).bech32Config.bech32PrefixValAddr
  );

  return {
    amountConfig,
    memoConfig,
    gasConfig,
    feeConfig,
    recipientConfig,
  };
};
