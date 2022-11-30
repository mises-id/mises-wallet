import { DenomHelper, KVStore, toGenerator } from "@keplr-wallet/common";
import { ChainGetter, QueryResponse } from "../../../common";
import { computed, makeObservable, override } from "mobx";
import { CoinPretty, Int } from "@keplr-wallet/unit";
import { StoreUtils } from "../../../common";
import { BalanceRegistry, ObservableQueryBalanceInner } from "../../balances";
import { ObservableChainQuery } from "../../chain-query";
import { Balances } from "./types";
import { MisesStore } from "../../../core";

export class ObservableQueryBalanceNative extends ObservableQueryBalanceInner {
  constructor(
    kvStore: KVStore,
    chainId: string,
    chainGetter: ChainGetter,
    denomHelper: DenomHelper,
    protected readonly nativeBalances: ObservableQueryCosmosBalances
  ) {
    super(
      kvStore,
      chainId,
      chainGetter,
      // No need to set the url
      "",
      denomHelper
    );

    makeObservable(this);
  }

  protected canFetch(): boolean {
    return false;
  }

  get isFetching(): boolean {
    return this.nativeBalances.isFetching;
  }

  get error() {
    return this.nativeBalances.error;
  }

  get response() {
    return this.nativeBalances.response;
  }

  @override
  *fetch() {
    yield this.nativeBalances.fetch();
  }

  @computed
  get balance(): CoinPretty {
    const currency = this.currency;

    if (!this.nativeBalances.response) {
      return new CoinPretty(currency, new Int(0)).ready(false);
    }

    return StoreUtils.getBalanceFromCurrency(
      currency,
      this.nativeBalances.response.data.balances
    );
  }
}

export class ObservableQueryCosmosBalances extends ObservableChainQuery<Balances> {
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
      `/cosmos/bank/v1beta1/balances/${bech32Address}?pagination.limit=1000`
    );

    this.bech32Address = bech32Address;

    this.misesStore = misesStore;

    makeObservable(this);
  }

  protected canFetch(): boolean {
    // If bech32 address is empty, it will always fail, so don't need to fetch it.
    return this.bech32Address.length > 0;
  }

  @override
  *fetch() {
    this.getMisesBalance().then((result) => {
      this.setResponse(result);
    });
  }

  async getMisesBalance() {
    const balance = await this.misesStore?.getBalanceUMIS();

    const result: QueryResponse<Balances> = {
      status: 200,
      data: {
        balances: [
          {
            denom: "umis",
            amount: `${balance?.low || 0}`,
          },
        ],
      },
      staled: true,
      timestamp: new Date().getTime(),
    };

    return result;
  }

  protected setResponse(response: Readonly<QueryResponse<Balances>>) {
    super.setResponse(response);

    const chainInfo = this.chainGetter.getChain(this.chainId);
    // 반환된 response 안의 denom을 등록하도록 시도한다.
    // 어차피 이미 등록되어 있으면 밑의 메소드가 아무 행동도 안하기 때문에 괜찮다.
    // computed를 줄이기 위해서 배열로 한번에 설정하는게 낫다.
    const denoms = response.data.balances.map((coin) => coin.denom);
    chainInfo.addUnknownCurrencies(...denoms);
  }
}

export class ObservableQueryCosmosBalanceRegistry implements BalanceRegistry {
  protected nativeBalances: Map<
    string,
    ObservableQueryCosmosBalances
  > = new Map();

  constructor(
    protected readonly kvStore: KVStore,
    protected readonly misesStore: MisesStore
  ) {}

  getBalanceInner(
    chainId: string,
    chainGetter: ChainGetter,
    bech32Address: string,
    minimalDenom: string
  ): ObservableQueryBalanceInner | undefined {
    const denomHelper = new DenomHelper(minimalDenom);
    if (denomHelper.type !== "native") {
      return;
    }

    const key = `${chainId}/${bech32Address}`;

    if (!this.nativeBalances.has(key)) {
      this.nativeBalances.set(
        key,
        new ObservableQueryCosmosBalances(
          this.kvStore,
          chainId,
          chainGetter,
          bech32Address,
          this.misesStore
        )
      );
    }

    return new ObservableQueryBalanceNative(
      this.kvStore,
      chainId,
      chainGetter,
      denomHelper,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.nativeBalances.get(key)!
    );
  }
}
