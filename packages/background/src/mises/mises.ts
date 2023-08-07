import { MSdk as MisesSdk } from "mises-js-sdk/dist/lib/msdk";
import {
  MAppMgr,
  MUserMgr,
  MisesCoin,
  MisesConfig,
  MsgReader,
} from "mises-js-sdk";
// const MisesSdk = require("mises-js-sdk");
import { MISES_POINT } from "./mises-network.util";
import { Tendermint34Client } from "@cosmjs/tendermint-rpc";
import {
  AuthExtension,
  DistributionExtension,
  QueryClient,
  setupAuthExtension,
  setupDistributionExtension,
  setupStakingExtension,
  StakingExtension,
  StargateClient,
  TxExtension,
  setupTxExtension,
} from "@cosmjs/stargate";

import { QueryClient as QueryFetchClient } from "react-query";
import { fetchConfig } from "./service";
import { HttpClient } from "./http-client";
export class Mises {
  config: MisesConfig;

  coinDefine: MisesCoin;

  msgReader: MsgReader;

  misesSdk: MisesSdk;

  misesUser: MUserMgr;

  misesAppMgr: MAppMgr;

  stargateClient!: StargateClient;

  queryFetchClient: QueryFetchClient;

  constructor() {
    this.config = MisesSdk.newConfig();

    this.coinDefine = MisesSdk.newCoinDefine();

    this.msgReader = MisesSdk.newMsgReader();

    this.coinDefine.load();

    this.config.setLCDEndpoint(MISES_POINT);

    this.misesSdk = MisesSdk.newSdk(this.config);

    this.misesUser = this.misesSdk.userMgr();

    this.misesAppMgr = this.misesSdk.appMgr();

    this.queryFetchClient = new QueryFetchClient();
  }

  async queryFetchClientInit() {
    this.stargateClient = await this.queryFetchClient.fetchQuery(
      "StargateClient",
      () => StargateClient.connect(MISES_POINT),
      fetchConfig
    );
  }

  async makeClient(): Promise<
    [
      QueryClient &
        StakingExtension &
        DistributionExtension &
        AuthExtension &
        TxExtension,
      Tendermint34Client
    ]
  > {
    try {
      const tmClient = await Tendermint34Client.create(
        new HttpClient(MISES_POINT)
      );
      return [
        QueryClient.withExtensions<
          StakingExtension,
          DistributionExtension,
          AuthExtension,
          TxExtension
        >(
          tmClient,
          setupStakingExtension,
          setupDistributionExtension,
          setupAuthExtension,
          setupTxExtension
        ),
        tmClient,
      ];
    } catch (error) {
      console.log(error);
      return Promise.reject(error);
    }
  }
}
