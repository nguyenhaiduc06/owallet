import { CWStargate, fetchTaxRate, ChainIdEnum } from "@owallet/common";
import { oraichainNetwork } from "@oraichain/oraidex-common";
import { useEffect, useState } from "react";
import { AccountWithAll } from "@owallet/stores";

export const useTaxRate = (accountOrai: AccountWithAll) => {
  const [taxRate, setTaxRate] = useState("");

  const queryTaxRate = async () => {
    const cwClient = await CWStargate.init(
      accountOrai,
      ChainIdEnum.Oraichain,
      oraichainNetwork.rpc
    );
    const data = await fetchTaxRate(cwClient);
    setTaxRate(data?.rate);
  };

  useEffect(() => {
    queryTaxRate();
  }, []);

  return taxRate;
};
