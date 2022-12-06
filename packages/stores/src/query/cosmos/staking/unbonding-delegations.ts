import {
  ObservableChainQuery,
  ObservableChainQueryMap,
} from "../../chain-query";
import { UnbondingDelegation, UnbondingDelegations } from "./types";
import { KVStore } from "@keplr-wallet/common";
import { ChainGetter } from "../../../common";
import { CoinPretty, Int } from "@keplr-wallet/unit";
import { computed, makeObservable, override } from "mobx";
import { MisesStore } from "../../../core";
import { QueryClient } from "react-query";

export class ObservableQueryUnbondingDelegationsInner extends ObservableChainQuery<UnbondingDelegations> {
  protected bech32Address: string;
  misesStore: MisesStore;
  duplicatedFetchCheck: boolean = true;
  QueryClient: QueryClient;

  constructor(
    kvStore: KVStore,
    chainId: string,
    chainGetter: ChainGetter,
    bech32Address: string,
    misesStore: MisesStore
  ) {
    super(
      kvStore,
      chainId,
      chainGetter,
      `/cosmos/staking/v1beta1/delegators/${bech32Address}/unbonding_delegations?pagination.limit=1000`
    );

    this.QueryClient = new QueryClient();

    makeObservable(this);

    this.bech32Address = bech32Address;

    this.misesStore = misesStore;
  }

  protected canFetch(): boolean {
    // If bech32 address is empty, it will always fail, so don't need to fetch it.
    return this.bech32Address?.length > 0;
  }

  @computed
  get total(): CoinPretty {
    const stakeCurrency = this.chainGetter.getChain(this.chainId).stakeCurrency;

    if (!this.response) {
      return new CoinPretty(stakeCurrency, new Int(0)).ready(false);
    }

    let totalBalance = new Int(0);
    for (const unbondingDelegation of this.unbondings) {
      for (const entry of unbondingDelegation.entries) {
        totalBalance = totalBalance.add(new Int(entry.balance));
      }
    }

    return new CoinPretty(stakeCurrency, totalBalance);
  }

  @computed
  get unbondingBalances(): {
    validatorAddress: string;
    entries: {
      creationHeight: Int;
      completionTime: string;
      balance: CoinPretty;
    }[];
  }[] {
    const unbondings = this.unbondings;

    const stakeCurrency = this.chainGetter.getChain(this.chainId).stakeCurrency;

    const result = [];
    for (const unbonding of unbondings) {
      const entries = [];
      for (const entry of unbonding.entries) {
        entries.push({
          creationHeight: new Int(entry.creationHeight),
          completionTime: entry.completionTime,
          balance: new CoinPretty(stakeCurrency, new Int(entry.balance)),
        });
      }

      result.push({
        validatorAddress: unbonding.validatorAddress,
        entries,
      });
    }

    return result;
  }

  @computed
  get unbondings(): UnbondingDelegation[] {
    if (!this.response) {
      return [];
    }

    return this.response.data.unbondingResponses;
  }

  @override
  *fetch() {
    if (!this.bech32Address) {
      return;
    }
    this.QueryClient?.fetchQuery(
      "unbondingDelegations",
      async () => {
        const res = await this.misesStore.unbondingDelegations(
          this.bech32Address
        );
        this.setResponse({
          data: res,
          status: 200,
          staled: true,
          timestamp: new Date().getTime(),
        });
      },
      this.fetchConfig
    );
  }
}

export class ObservableQueryUnbondingDelegations extends ObservableChainQueryMap<UnbondingDelegations> {
  constructor(
    protected readonly kvStore: KVStore,
    protected readonly chainId: string,
    protected readonly chainGetter: ChainGetter,
    protected readonly misesStore: MisesStore
  ) {
    super(kvStore, chainId, chainGetter, (bech32Address: string) => {
      return new ObservableQueryUnbondingDelegationsInner(
        this.kvStore,
        this.chainId,
        this.chainGetter,
        bech32Address,
        misesStore
      );
    });
  }

  getQueryBech32Address(
    bech32Address: string
  ): ObservableQueryUnbondingDelegationsInner {
    return this.get(bech32Address) as ObservableQueryUnbondingDelegationsInner;
  }
}
