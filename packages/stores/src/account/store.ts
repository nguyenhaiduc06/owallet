//@ts-nocheck
import {
  ChainedFunctionifyTuple,
  HasMapStore,
  IObject,
  mergeStores,
} from "../common";
import { ChainGetter } from "../chain";
import { AccountSetBase, AccountSetBaseSuper, AccountSetOpts } from "./base";
import { UnionToIntersection } from "utility-types";
import { AccountSharedContext } from "./context";
import { OWallet } from "@owallet/types";

// eslint-disable-next-line @typescript-eslint/ban-types
export interface IAccountStore<T extends IObject = {}> {
  getAccount(chainId: string): AccountSetBase & T;
  hasAccount(chainId: string): boolean;
}

export interface IAccountStoreWithInjects<Injects extends Array<IObject>> {
  getAccount(
    chainId: string
  ): AccountSetBase & UnionToIntersection<Injects[number]>;
  hasAccount(chainId: string): boolean;
}

export class AccountStore<
  Injects extends Array<IObject>,
  AccountSetReturn = AccountSetBase & UnionToIntersection<Injects[number]>
> extends HasMapStore<AccountSetReturn> {
  protected accountSetCreators: ChainedFunctionifyTuple<
    AccountSetBaseSuper,
    // chainGetter: ChainGetter,
    // chainId: string,
    [ChainGetter, string],
    Injects
  >;

  constructor(
    protected readonly eventListener: {
      addEventListener: (type: string, fn: () => unknown) => void;
      removeEventListener: (type: string, fn: () => unknown) => void;
    },
    protected readonly chainGetter: ChainGetter,
    protected readonly getOWallet: () => Promise<OWallet | undefined>,
    protected readonly storeOptsCreator: (chainId: string) => AccountSetOpts,
    ...accountSetCreators: ChainedFunctionifyTuple<
      AccountSetBaseSuper,
      // chainGetter: ChainGetter,
      // chainId: string,
      [ChainGetter, string],
      Injects
    >
  ) {
    const sharedContext = new AccountSharedContext(getOWallet);

    super((chainId: string) => {
      const accountSetBase = new AccountSetBaseSuper(
        eventListener,
        chainGetter,
        chainId,
        sharedContext,
        storeOptsCreator(chainId)
      );

      return mergeStores(
        accountSetBase,
        [this.chainGetter, chainId],
        ...this.accountSetCreators
      );
    });

    this.accountSetCreators = accountSetCreators;
  }

  getAccount(chainId: string): AccountSetReturn {
    // Allow access through chain identifier by accessing via chainGetter.
    return this.get(this.chainGetter.getChain(chainId).chainId);
  }

  hasAccount(chainId: string): boolean {
    // Allow access through chain identifier by accessing via chainGetter.
    return this.has(this.chainGetter.getChain(chainId).chainId);
  }
}
