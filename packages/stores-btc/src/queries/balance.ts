import { DenomHelper } from "@owallet/common";
import {
  BalanceRegistry,
  ChainGetter,
  IObservableQueryBalanceImpl,
  ObservableQuery,
  QuerySharedContext,
} from "@owallet/stores";
import { AppCurrency, ChainInfo } from "@owallet/types";
import { CoinPretty, Int } from "@owallet/unit";
import { computed, makeObservable } from "mobx";
import { BtcBalances } from "./types";

export class ObservableQueryBtcAccountBalanceImpl
  extends ObservableQuery<BtcBalances>
  implements IObservableQueryBalanceImpl
{
  constructor(
    sharedContext: QuerySharedContext,
    protected readonly chainId: string,
    protected readonly chainGetter: ChainGetter,
    protected readonly denomHelper: DenomHelper,
    protected readonly btcAddress: string
  ) {
    // const chainInfo =this.chainGetter.getChain(chainId);
    super(
      sharedContext,
      chainGetter.getChain(chainId).rest,
      `/address/${btcAddress}/utxo`
    );
    makeObservable(this);
  }

  protected override canFetch(): boolean {
    // If ethereum hex address is empty, it will always fail, so don't need to fetch it.
    return this.btcAddress.length > 0;
  }

  @computed
  get balance(): CoinPretty {
    const denom = this.denomHelper.denom;
    const chainInfo = this.chainGetter.getChain(this.chainId);
    const currency = chainInfo.currencies.find(
      (cur) => cur.coinMinimalDenom === denom
    );
    if (!currency) {
      throw new Error(`Unknown currency: ${denom}`);
    }
    if (!this.response || !this.response.data) {
      return new CoinPretty(currency, new Int(0)).ready(false);
    }
    const totalBtc = this.response.data.reduce(
      (acc, curr) => acc + curr.value,
      0
    );

    if (!totalBtc) return new CoinPretty(currency, new Int(0)).ready(false);
    return new CoinPretty(currency, new Int(totalBtc)).ready(false);
  }

  @computed
  get currency(): AppCurrency {
    const denom = this.denomHelper.denom;

    const chainInfo = this.chainGetter.getChain(this.chainId);
    return chainInfo.forceFindCurrency(denom);
  }

  // protected override async fetchResponse(
  //   abortController: AbortController
  // ): Promise<{ headers: any; data: any }> {
  //   const { data, headers } = await super.fetchResponse(abortController);
  //   console.log(data,this.btcAddress, "data");
  //   return {
  //     headers,
  //     data: "1",
  //   };
  // }
}

export class ObservableQueryBtcAccountBalanceRegistry
  implements BalanceRegistry
{
  constructor(protected readonly sharedContext: QuerySharedContext) {}

  getBalanceImpl(
    chainId: string,
    chainGetter: ChainGetter<ChainInfo>,
    address: string,
    minimalDenom: string
  ): IObservableQueryBalanceImpl | undefined {
    const denomHelper = new DenomHelper(minimalDenom);
    const chainInfo = chainGetter.getChain(chainId);
    if (
      !chainInfo.features.includes("btc") ||
      (denomHelper.type !== "legacy" && denomHelper.type !== "segwit")
    )
      return;
    return new ObservableQueryBtcAccountBalanceImpl(
      this.sharedContext,
      chainId,
      chainGetter,
      denomHelper,
      address
    );
  }
}
