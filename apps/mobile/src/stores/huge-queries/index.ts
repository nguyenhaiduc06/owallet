import { ChainStore } from '../chain';
import {
  CoinGeckoPriceStore,
  CosmosQueries,
  IAccountStore,
  IChainInfoImpl,
  IQueriesStore,
  QueryError
} from '@owallet/stores';
import { CoinPretty, Dec, PricePretty } from '@owallet/unit';
import { action, autorun, computed } from 'mobx';
import { ChainIdEnum, DenomHelper, getOasisAddress, MapChainIdToNetwork } from '@owallet/common';
import { computedFn } from 'mobx-utils';
import { BinarySortArray } from '@stores/huge-queries/sort';

export interface ViewToken {
  readonly chainInfo: IChainInfoImpl;
  readonly token: CoinPretty;
  readonly price: PricePretty | undefined;
  readonly isFetching: boolean;
  readonly error: QueryError<any> | undefined;
}

/**
 * 거대한 쿼리를 만든다.
 * 거대하기 때문에 로직을 분리하기 위해서 따로 만들었다.
 * 근데 이름그대로 거대한 쿼리를 만들기 때문에 꼭 필요할때만 써야한다.
 * 특정 밸런스가 필요하다고 여기서 balance를 다 가져와서 그 중에 한개만 찾아서 쓰고 그러면 안된다.
 * 꼭 필요할때만 쓰자
 */
export class HugeQueriesStore {
  protected static zeroDec = new Dec(0);

  protected balanceBinarySort: BinarySortArray<ViewToken>;
  protected delegationBinarySort: BinarySortArray<ViewToken>;
  protected unbondingBinarySort: BinarySortArray<{
    viewToken: ViewToken;
    completeTime: string;
  }>;
  protected claimableRewardsBinarySort: BinarySortArray<ViewToken>;

  constructor(
    protected readonly chainStore: ChainStore,
    protected readonly queriesStore: IQueriesStore<CosmosQueries>,
    protected readonly accountStore: IAccountStore,
    protected readonly priceStore: CoinGeckoPriceStore
  ) {
    let balanceDisposal: (() => void) | undefined;
    this.balanceBinarySort = new BinarySortArray<ViewToken>(
      this.sortByPrice,
      () => {
        balanceDisposal = autorun(() => {
          this.updateBalances();
        });
      },
      () => {
        if (balanceDisposal) {
          balanceDisposal();
        }
      }
    );
    let delegationDisposal: (() => void) | undefined;
    this.delegationBinarySort = new BinarySortArray<ViewToken>(
      this.sortByPrice,
      () => {
        delegationDisposal = autorun(() => {
          this.updateDelegations();
        });
      },
      () => {
        if (delegationDisposal) {
          delegationDisposal();
        }
      }
    );
    let unbondingDisposal: (() => void) | undefined;
    this.unbondingBinarySort = new BinarySortArray<{
      viewToken: ViewToken;
      completeTime: string;
    }>(
      (a, b) => {
        return this.sortByPrice(a.viewToken, b.viewToken);
      },
      () => {
        unbondingDisposal = autorun(() => {
          this.updateUnbondings();
        });
      },
      () => {
        if (unbondingDisposal) {
          unbondingDisposal();
        }
      }
    );
    let claimableRewardsDisposal: (() => void) | undefined;
    this.claimableRewardsBinarySort = new BinarySortArray<ViewToken>(
      this.sortByPrice,
      () => {
        claimableRewardsDisposal = autorun(() => {
          this.updateClaimableRewards();
        });
      },
      () => {
        if (claimableRewardsDisposal) {
          claimableRewardsDisposal();
        }
      }
    );
  }

  @action
  protected updateBalances() {
    const keysUsed = new Map<string, boolean>();
    const prevKeyMap = new Map(this.balanceBinarySort.indexForKeyMap());

    for (const chainInfo of this.chainStore.chainInfosInUI) {
      const account = this.accountStore.getAccount(chainInfo.chainId);

      console.log('chainInfo', chainInfo);

      if (account.bech32Address === '') {
        continue;
      }
      const queries = this.queriesStore.get(chainInfo.chainId);

      const currencies = [...chainInfo.currencies];
      if (chainInfo.stakeCurrency) {
        currencies.push(chainInfo.stakeCurrency);
      }
      for (const currency of currencies) {
        const denomHelper = new DenomHelper(currency.coinMinimalDenom);
        const queryBalance =
          this.chainStore.isEvmChain(chainInfo.chainId) && denomHelper.type === 'erc20'
            ? queries.queryBalances.getQueryEthereumHexAddress(account.ethereumHexAddress)
            : queries.queryBalances.getQueryBech32Address(account.bech32Address);

        console.log('queryBalance', queryBalance);

        const key = `${chainInfo.chainIdentifier}/${currency.coinMinimalDenom}`;
        if (!keysUsed.get(key)) {
          if (chainInfo.stakeCurrency?.coinMinimalDenom === currency.coinMinimalDenom) {
            const balance = queryBalance.stakable?.balance;
            if (!balance) {
              continue;
            }

            keysUsed.set(key, true);
            prevKeyMap.delete(key);
            this.balanceBinarySort.pushAndSort(key, {
              chainInfo,
              token: balance,
              price: currency.coinGeckoId ? this.priceStore.calculatePrice(balance) : undefined,
              isFetching: queryBalance.stakable.isFetching,
              error: queryBalance.stakable.error
            });
          } else {
            const balance = queryBalance.getBalance(currency);
            if (balance) {
              // If the balance is zero and currency is "native", don't show it.
              if (
                balance.balance.toDec().equals(HugeQueriesStore.zeroDec) &&
                new DenomHelper(currency.coinMinimalDenom).type === 'native'
              ) {
                continue;
              }

              keysUsed.set(key, true);
              prevKeyMap.delete(key);
              this.balanceBinarySort.pushAndSort(key, {
                chainInfo,
                token: balance.balance,
                price: currency.coinGeckoId ? this.priceStore.calculatePrice(balance.balance) : undefined,
                isFetching: balance.isFetching,
                error: balance.error
              });
            }
          }
        }
      }
    }

    for (const removedKey of prevKeyMap.keys()) {
      this.balanceBinarySort.remove(removedKey);
    }
  }

  @computed
  get allKnownBalances(): ReadonlyArray<ViewToken> {
    return this.balanceBinarySort.arr;
  }

  getAllBalances = computedFn((allowIBCToken: boolean): ReadonlyArray<ViewToken> => {
    const keys: Map<string, boolean> = new Map();
    for (const chainInfo of this.chainStore.chainInfosInUI) {
      for (const currency of chainInfo.currencies) {
        const denomHelper = new DenomHelper(currency.coinMinimalDenom);
        if (!allowIBCToken && denomHelper.type === 'native' && denomHelper.denom.startsWith('ibc/')) {
          continue;
        }

        const key = `${chainInfo.chainIdentifier}/${currency.coinMinimalDenom}`;
        keys.set(key, true);
      }
    }
    return this.balanceBinarySort.arr.filter(viewToken => {
      const key = viewToken[BinarySortArray.SymbolKey];
      return keys.get(key);
    });
  });

  filterLowBalanceTokens = computedFn((viewTokens: ReadonlyArray<ViewToken>): ViewToken[] => {
    return viewTokens.filter(viewToken => {
      // Hide the unknown ibc tokens.
      if ('paths' in viewToken.token.currency && !viewToken.token.currency.originCurrency) {
        return false;
      }

      // If currency has coinGeckoId, hide the low price tokens (under $1)
      if (viewToken.token.currency.coinGeckoId != null) {
        return this.priceStore.calculatePrice(viewToken.token, 'usd')?.toDec().gte(new Dec('1')) ?? false;
      }

      // Else, hide the low balance tokens (under 0.001)
      return viewToken.token.toDec().gte(new Dec('0.001'));
    });
  });

  @computed
  get stakables(): ViewToken[] {
    const keys: Map<string, boolean> = new Map();
    for (const chainInfo of this.chainStore.chainInfosInUI) {
      if (!chainInfo.stakeCurrency) {
        continue;
      }
      const key = `${chainInfo.chainIdentifier}/${chainInfo.stakeCurrency.coinMinimalDenom}`;
      keys.set(key, true);
    }
    return this.balanceBinarySort.arr.filter(viewToken => {
      const key = viewToken[BinarySortArray.SymbolKey];
      return keys.get(key);
    });
  }

  @computed
  get notStakbles(): ViewToken[] {
    const keys: Map<string, boolean> = new Map();
    for (const chainInfo of this.chainStore.chainInfosInUI) {
      for (const currency of chainInfo.currencies) {
        if (currency.coinMinimalDenom === chainInfo.stakeCurrency?.coinMinimalDenom) {
          continue;
        }
        const denomHelper = new DenomHelper(currency.coinMinimalDenom);
        if (denomHelper.type === 'native' && denomHelper.denom.startsWith('ibc/')) {
          continue;
        }

        const key = `${chainInfo.chainIdentifier}/${currency.coinMinimalDenom}`;
        keys.set(key, true);
      }
    }
    return this.balanceBinarySort.arr.filter(viewToken => {
      const key = viewToken[BinarySortArray.SymbolKey];
      return keys.get(key);
    });
  }
  @computed
  get getAllAddrByChain(): Record<string, string> {
    const data: Record<string, string> = {};
    for (const chainInfo of this.chainStore.chainInfosInUI) {
      const account = this.accountStore.getAccount(chainInfo.chainId);
      const address = account.addressDisplay;
      const mapChainNetwork = MapChainIdToNetwork[chainInfo.chainId];
      if (!mapChainNetwork) continue;
      data[mapChainNetwork] =
        chainInfo.chainId === ChainIdEnum.OasisSapphire || chainInfo.chainId === ChainIdEnum.OasisEmerald
          ? getOasisAddress(address)
          : address;
    }
    return data;
  }
  @computed
  get ibcTokens(): ViewToken[] {
    const keys: Map<string, boolean> = new Map();
    for (const chainInfo of this.chainStore.chainInfosInUI) {
      for (const currency of chainInfo.currencies) {
        const denomHelper = new DenomHelper(currency.coinMinimalDenom);
        if (denomHelper.type === 'native' && denomHelper.denom.startsWith('ibc/')) {
          const key = `${chainInfo.chainIdentifier}/${currency.coinMinimalDenom}`;
          keys.set(key, true);
        }
      }
    }
    return this.balanceBinarySort.arr.filter(viewToken => {
      const key = viewToken[BinarySortArray.SymbolKey];
      return keys.get(key);
    });
  }

  @action
  protected updateDelegations(): void {
    const prevKeyMap = new Map(this.delegationBinarySort.indexForKeyMap());

    for (const chainInfo of this.chainStore.chainInfosInUI) {
      const account = this.accountStore.getAccount(chainInfo.chainId);
      if (account.bech32Address === '') {
        continue;
      }
      const queries = this.queriesStore.get(chainInfo.chainId);
      const queryDelegation = queries.cosmos.queryDelegations.getQueryBech32Address(account.bech32Address);
      if (!queryDelegation.total) {
        continue;
      }

      const key = `${chainInfo.chainId}/${account.bech32Address}`;
      prevKeyMap.delete(key);
      this.delegationBinarySort.pushAndSort(key, {
        chainInfo,
        token: queryDelegation.total,
        price: this.priceStore.calculatePrice(queryDelegation.total),
        isFetching: queryDelegation.isFetching,
        error: queryDelegation.error
      });
    }

    for (const removedKey of prevKeyMap.keys()) {
      this.delegationBinarySort.remove(removedKey);
    }
  }

  @computed
  get delegations(): ReadonlyArray<ViewToken> {
    return this.delegationBinarySort.arr;
  }

  @action
  protected updateUnbondings(): void {
    const prevKeyMap = new Map(this.unbondingBinarySort.indexForKeyMap());

    for (const chainInfo of this.chainStore.chainInfosInUI) {
      const account = this.accountStore.getAccount(chainInfo.chainId);
      if (account.bech32Address === '') {
        continue;
      }
      const queries = this.queriesStore.get(chainInfo.chainId);
      const queryUnbonding = queries.cosmos.queryUnbondingDelegations.getQueryBech32Address(account.bech32Address);

      for (let i = 0; i < queryUnbonding.unbondings.length; i++) {
        const unbonding = queryUnbonding.unbondings[i];
        for (let j = 0; j < unbonding.entries.length; j++) {
          const entry = unbonding.entries[j];
          if (!chainInfo.stakeCurrency) {
            continue;
          }
          const balance = new CoinPretty(chainInfo.stakeCurrency, entry.balance);

          const key = `${chainInfo.chainId}/${account.bech32Address}/${i}/${j}`;
          prevKeyMap.delete(key);
          this.unbondingBinarySort.pushAndSort(key, {
            viewToken: {
              chainInfo,
              token: balance,
              price: this.priceStore.calculatePrice(balance),
              isFetching: queryUnbonding.isFetching,
              error: queryUnbonding.error
            },
            completeTime: entry.completion_time
          });
        }
      }
    }

    for (const removedKey of prevKeyMap.keys()) {
      this.unbondingBinarySort.remove(removedKey);
    }
  }

  @computed
  get unbondings(): ReadonlyArray<{
    viewToken: ViewToken;
    completeTime: string;
  }> {
    return this.unbondingBinarySort.arr;
  }

  @action
  protected updateClaimableRewards(): void {
    const prevKeyMap = new Map(this.claimableRewardsBinarySort.indexForKeyMap());

    for (const chainInfo of this.chainStore.chainInfosInUI) {
      const account = this.accountStore.getAccount(chainInfo.chainId);
      if (account.bech32Address === '') {
        continue;
      }
      const queries = this.queriesStore.get(chainInfo.chainId);
      const queryRewards = queries.cosmos.queryRewards.getQueryBech32Address(account.bech32Address);

      if (queryRewards.stakableReward && queryRewards.stakableReward.toDec().gt(new Dec(0))) {
        const key = `${chainInfo.chainId}/${account.bech32Address}`;
        prevKeyMap.delete(key);
        this.claimableRewardsBinarySort.pushAndSort(key, {
          chainInfo,
          token: queryRewards.stakableReward,
          price: this.priceStore.calculatePrice(queryRewards.stakableReward),
          isFetching: queryRewards.isFetching,
          error: queryRewards.error
        });
      }
    }

    for (const removedKey of prevKeyMap.keys()) {
      this.claimableRewardsBinarySort.remove(removedKey);
    }
  }

  @computed
  get claimableRewards(): ReadonlyArray<ViewToken> {
    return this.claimableRewardsBinarySort.arr;
  }

  protected sortByPrice(a: ViewToken, b: ViewToken): number {
    const aPrice = a.price?.toDec() ?? HugeQueriesStore.zeroDec;
    const bPrice = b.price?.toDec() ?? HugeQueriesStore.zeroDec;

    if (aPrice.equals(bPrice)) {
      return 0;
    } else if (aPrice.gt(bPrice)) {
      return -1;
    } else {
      return 1;
    }
  }
}
