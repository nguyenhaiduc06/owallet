import { ChainGetter, ObservableQueryDelegations } from "@owallet/stores";
import { ObservableQueryBalances } from "@owallet/stores";
import { useFeeConfig } from "./fee";
import { useGasConfig } from "./gas";
import { useMemoConfig } from "./memo";
import { useRecipientConfig } from "./recipient";
import { useStakedAmountConfig } from "./staked-amount";

export const useRedelegateTxConfig = (
  chainGetter: ChainGetter,
  chainId: string,
  gas: number,
  sender: string,
  queryBalances: ObservableQueryBalances,
  queryDelegations: ObservableQueryDelegations,
  srcValidatorAddress: string
) => {
  const amountConfig = useStakedAmountConfig(
    chainGetter,
    chainId,
    sender,
    queryDelegations,
    srcValidatorAddress
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
    gasConfig,
    false
  );

  const recipientConfig = useRecipientConfig(chainGetter, chainId);
  recipientConfig.setBech32Prefix(
    chainGetter.getChain(chainId).bech32Config.bech32PrefixValAddr
  );

  return {
    amountConfig,
    memoConfig,
    gasConfig,
    feeConfig,
    recipientConfig,
    srcValidatorAddress,
    dstValidatorAddress: recipientConfig.recipient,
  };
};
