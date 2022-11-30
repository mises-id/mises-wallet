import {
  ObservableChainQuery,
  ObservableChainQueryMap,
} from "../../chain-query";
import { Delegation, Delegations } from "./types";
import { KVStore } from "@keplr-wallet/common";
import { ChainGetter } from "../../../common";
import { CoinPretty, Int } from "@keplr-wallet/unit";
import { computed, makeObservable, override } from "mobx";
import { computedFn } from "mobx-utils";
import { MisesStore } from "../../../core";

export class ObservableQueryDelegationsInner extends ObservableChainQuery<Delegations> {
  protected bech32Address: string;

  protected duplicatedFetchCheck: boolean = true;

  protected misesStore: MisesStore;

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
      `/cosmos/staking/v1beta1/delegations/${bech32Address}?pagination.limit=1000`
    );
    makeObservable(this);

    this.bech32Address = bech32Address;

    this.misesStore = misesStore;
  }

  protected canFetch(): boolean {
    // If bech32 address is empty, it will always fail, so don't need to fetch it.
    return this.bech32Address.length > 0;
  }

  @computed
  get total(): CoinPretty {
    const stakeCurrency = this.chainGetter.getChain(this.chainId).stakeCurrency;

    if (!this.response) {
      return new CoinPretty(stakeCurrency, new Int(0)).ready(false);
    }

    let totalBalance = new Int(0);
    for (const delegation of this.delegations) {
      totalBalance = totalBalance.add(new Int(delegation.balance.amount));
    }

    return new CoinPretty(stakeCurrency, totalBalance);
  }

  @computed
  get delegationBalances(): {
    validatorAddress: string;
    balance: CoinPretty;
  }[] {
    if (!this.response) {
      return [];
    }

    const stakeCurrency = this.chainGetter.getChain(this.chainId).stakeCurrency;

    const result = [];
    if (this.delegations) {
      for (const delegation of this.delegations) {
        result.push({
          validatorAddress: delegation.delegation.validatorAddress,
          balance: new CoinPretty(
            stakeCurrency,
            new Int(delegation.balance.amount)
          ),
        });
      }
    }

    return result;
  }

  @computed
  get delegations(): Delegation[] {
    if (!this.response) {
      return [];
    }

    return this.response.data.delegationResponses;
  }

  readonly getDelegationTo = computedFn(
    (validatorAddress: string): CoinPretty => {
      const delegations = this.delegations;

      const stakeCurrency = this.chainGetter.getChain(this.chainId)
        .stakeCurrency;

      if (!this.response) {
        return new CoinPretty(stakeCurrency, new Int(0)).ready(false);
      }

      for (const delegation of delegations) {
        if (delegation.delegation.validatorAddress === validatorAddress) {
          return new CoinPretty(
            stakeCurrency,
            new Int(delegation.balance.amount)
          );
        }
      }

      return new CoinPretty(stakeCurrency, new Int(0));
    }
  );

  @override
  *fetch() {
    if (!this.bech32Address) {
      return;
    }
    this.misesStore.delegations(this.bech32Address).then((res) => {
      this.setResponse({
        data: res,
        status: 200,
        staled: true,
        timestamp: new Date().getTime(),
      });
    });
  }
}

export class ObservableQueryDelegations extends ObservableChainQueryMap<Delegations> {
  constructor(
    protected readonly kvStore: KVStore,
    protected readonly chainId: string,
    protected readonly chainGetter: ChainGetter,
    protected readonly misesStore: MisesStore
  ) {
    super(kvStore, chainId, chainGetter, (bech32Address: string) => {
      return new ObservableQueryDelegationsInner(
        this.kvStore,
        this.chainId,
        this.chainGetter,
        bech32Address,
        this.misesStore
      );
    });
  }

  getQueryBech32Address(
    bech32Address: string
  ): ObservableQueryDelegationsInner {
    return this.get(bech32Address) as ObservableQueryDelegationsInner;
  }
}
