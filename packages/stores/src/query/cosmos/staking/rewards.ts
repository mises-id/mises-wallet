import { Rewards } from "./types";
import { KVStore } from "@keplr-wallet/common";
import {
  ObservableChainQuery,
  ObservableChainQueryMap,
} from "../../chain-query";
import { ChainGetter } from "../../../common";
import { computed, makeObservable, override } from "mobx";
import { CoinPretty, Dec, Int } from "@keplr-wallet/unit";
import { Currency } from "@keplr-wallet/types";
import { StoreUtils } from "../../../common";
import { computedFn } from "mobx-utils";
import { MisesStore } from "../../../core";
import { QueryClient } from "react-query";

export class ObservableQueryRewardsInner extends ObservableChainQuery<Rewards> {
  protected bech32Address: string;
  duplicatedFetchCheck: boolean = true;
  misesStore: MisesStore;
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
      `/cosmos/distribution/v1beta1/delegators/${bech32Address}/rewards`
    );

    this.QueryClient = new QueryClient();

    makeObservable(this);

    this.bech32Address = bech32Address;

    this.misesStore = misesStore;
  }

  protected canFetch(): boolean {
    // If bech32 address is empty, it will always fail, so don't need to fetch it.
    return this.bech32Address.length > 0;
  }

  @computed
  get rewards(): CoinPretty[] {
    const chainInfo = this.chainGetter.getChain(this.chainId);

    const currenciesMap = chainInfo.currencies.reduce<{
      [denom: string]: Currency;
    }>((obj, currency) => {
      // TODO: Handle the contract tokens.
      if (!("type" in currency)) {
        obj[currency.coinMinimalDenom] = currency;
      }
      return obj;
    }, {});

    return StoreUtils.getBalancesFromCurrencies(
      currenciesMap,
      this.response?.data.total ?? []
    );
  }

  readonly getRewardsOf = computedFn(
    (validatorAddress: string): CoinPretty[] => {
      const chainInfo = this.chainGetter.getChain(this.chainId);

      const currenciesMap = chainInfo.currencies.reduce<{
        [denom: string]: Currency;
      }>((obj, currency) => {
        // TODO: Handle the contract tokens.
        if (!("type" in currency)) {
          obj[currency.coinMinimalDenom] = currency;
        }
        return obj;
      }, {});

      const reward = this.response?.data.rewards?.find((r) => {
        return r.validatorAddress === validatorAddress;
      });

      return StoreUtils.getBalancesFromCurrencies(
        currenciesMap,
        reward?.reward ?? []
      );
    }
  );

  @computed
  get stakableReward(): CoinPretty {
    const chainInfo = this.chainGetter.getChain(this.chainId);

    return StoreUtils.getBalanceFromCurrency(
      chainInfo.stakeCurrency,
      this.response?.data.total ?? []
    );
  }

  readonly getStakableRewardOf = computedFn(
    (validatorAddress: string): CoinPretty => {
      const chainInfo = this.chainGetter.getChain(this.chainId);

      const reward = this.response?.data.rewards?.find((r) => {
        return r.validatorAddress === validatorAddress;
      });

      return StoreUtils.getBalanceFromCurrency(
        chainInfo.stakeCurrency,
        reward?.reward ?? []
      );
    }
  );

  @computed
  get unstakableRewards(): CoinPretty[] {
    const chainInfo = this.chainGetter.getChain(this.chainId);

    const currenciesMap = chainInfo.currencies.reduce<{
      [denom: string]: Currency;
    }>((obj, currency) => {
      // TODO: Handle the contract tokens.
      if (
        !("type" in currency) &&
        currency.coinMinimalDenom !== chainInfo.stakeCurrency.coinMinimalDenom
      ) {
        obj[currency.coinMinimalDenom] = currency;
      }
      return obj;
    }, {});

    return StoreUtils.getBalancesFromCurrencies(
      currenciesMap,
      this.response?.data.total ?? []
    );
  }

  readonly getUnstakableRewardsOf = computedFn(
    (validatorAddress: string): CoinPretty[] => {
      const chainInfo = this.chainGetter.getChain(this.chainId);

      const currenciesMap = chainInfo.currencies.reduce<{
        [denom: string]: Currency;
      }>((obj, currency) => {
        // TODO: Handle the contract tokens.
        if (
          !("type" in currency) &&
          currency.coinMinimalDenom !== chainInfo.stakeCurrency.coinMinimalDenom
        ) {
          obj[currency.coinMinimalDenom] = currency;
        }
        return obj;
      }, {});

      const reward = this.response?.data.rewards?.find((r) => {
        return r.validatorAddress === validatorAddress;
      });
      return StoreUtils.getBalancesFromCurrencies(
        currenciesMap,
        reward?.reward ?? []
      );
    }
  );

  @computed
  get pendingRewardValidatorAddresses(): string[] {
    if (!this.response) {
      return [];
    }

    const result: string[] = [];

    for (const reward of this.response.data.rewards ?? []) {
      if (reward.reward) {
        for (const r of reward.reward) {
          const dec = new Dec(r.amount);
          if (dec.truncate().gt(new Int(0))) {
            result.push(reward.validatorAddress);
            break;
          }
        }
      }
    }

    return result;
  }

  /**
   * getDescendingPendingRewardValidatorAddresses returns the validator addresses in descending order by stakable asset.
   */
  // ComputeFn doesn't support the default argument.
  readonly getDescendingPendingRewardValidatorAddresses = computedFn(
    (maxValiadtors: number): string[] => {
      if (!this.response) {
        return [];
      }

      const chainInfo = this.chainGetter.getChain(this.chainId);

      const rewards = this.response.data.rewards?.slice() ?? [];
      rewards.sort((reward1, reward2) => {
        const amount1 = StoreUtils.getBalanceFromCurrency(
          chainInfo.stakeCurrency,
          reward1.reward ?? []
        );

        const amount2 = StoreUtils.getBalanceFromCurrency(
          chainInfo.stakeCurrency,
          reward2.reward ?? []
        );

        if (amount1.toDec().gt(amount2.toDec())) {
          return -1;
        } else {
          return 1;
        }
      });

      return rewards
        .filter((reward) => {
          if (reward.reward) {
            for (const r of reward.reward) {
              const dec = new Dec(r.amount);
              if (dec.truncate().gt(new Int(0))) {
                return true;
              }
            }
          }

          return false;
        })
        .slice(0, maxValiadtors)
        .map((r) => r.validatorAddress);
    }
  );

  @override
  *fetch() {
    if (!this.bech32Address) {
      return;
    }
    this.QueryClient?.fetchQuery(
      "rewards",
      async () => {
        const res = await this.misesStore.rewards(this.bech32Address);
        if (res && res.total[0])
          res.total[0].amount = Number(res.total[0].amount) / Math.pow(10, 18);
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

export class ObservableQueryRewards extends ObservableChainQueryMap<Rewards> {
  constructor(
    protected readonly kvStore: KVStore,
    protected readonly chainId: string,
    protected readonly chainGetter: ChainGetter,
    protected readonly misesStore: MisesStore
  ) {
    super(kvStore, chainId, chainGetter, (bech32Address: string) => {
      return new ObservableQueryRewardsInner(
        this.kvStore,
        this.chainId,
        this.chainGetter,
        bech32Address,
        misesStore
      );
    });
  }

  getQueryBech32Address(bech32Address: string): ObservableQueryRewardsInner {
    return this.get(bech32Address) as ObservableQueryRewardsInner;
  }
}
