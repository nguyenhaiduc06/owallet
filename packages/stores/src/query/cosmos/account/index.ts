import {
  ObservableChainQuery,
  ObservableChainQueryMap,
} from "../../chain-query";
import { ChainGetter } from "../../../chain";
import { AuthAccount } from "./types";
import { computed, makeObservable } from "mobx";
import { BaseAccount } from "@owallet/cosmos";
import { QuerySharedContext } from "../../../common";

export class ObservableQueryAccountInner extends ObservableChainQuery<AuthAccount> {
  constructor(
    sharedContext: QuerySharedContext,
    chainId: string,
    chainGetter: ChainGetter,
    protected readonly bech32Address: string
  ) {
    super(
      sharedContext,
      chainId,
      chainGetter,
      `/cosmos/auth/v1beta1/accounts/${bech32Address}`
    );

    makeObservable(this);
  }

  protected override canFetch(): boolean {
    // If bech32 address is empty, it will always fail, so don't need to fetch it.
    return this.bech32Address.length > 0;
  }

  @computed
  get sequence(): string {
    if (!this.response) {
      return "0";
    }

    // XXX: In launchpad, the status was 200 even if the account not exist.
    //      However, from stargate, the status becomes 404 if the account not exist.
    //      This case has not been dealt with yet.
    //      However, in the case of 404, it will be treated as an error, and in this case the sequence should be 0.

    try {
      const account = BaseAccount.fromProtoJSON(
        this.response.data,
        this.bech32Address
      );
      return account.getSequence().toString();
    } catch {
      return "0";
    }
  }

  @computed
  get isVestingAccount(): boolean {
    if (!this.response) {
      return false;
    }

    return !!this.response.data?.account.base_vesting_account;
  }
}

export class ObservableQueryAccount extends ObservableChainQueryMap<AuthAccount> {
  constructor(
    sharedContext: QuerySharedContext,
    chainId: string,
    chainGetter: ChainGetter
  ) {
    super(sharedContext, chainId, chainGetter, (bech32Address) => {
      return new ObservableQueryAccountInner(
        this.sharedContext,
        this.chainId,
        this.chainGetter,
        bech32Address
      );
    });
  }

  getQueryBech32Address(bech32Address: string): ObservableQueryAccountInner {
    return this.get(bech32Address) as ObservableQueryAccountInner;
  }
}
