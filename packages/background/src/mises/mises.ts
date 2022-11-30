import MisesSdk from "mises-js-sdk";
import { MAppMgr } from "mises-js-sdk/dist/types/mapp";
import {
  MisesCoin,
  MisesConfig,
  MsgReader,
} from "mises-js-sdk/dist/types/mises";
import { MUserMgr } from "mises-js-sdk/dist/types/muser";
import { MISES_POINT } from "./mises-network.util";
import { Tendermint34Client } from "@cosmjs/tendermint-rpc";
import {
  QueryClient,
  setupStakingExtension,
  StakingExtension,
  StargateClient,
} from "@cosmjs/stargate";
export class Mises {
  config: MisesConfig;

  coinDefine: MisesCoin;

  msgReader: MsgReader;

  misesSdk: MisesSdk;

  misesUser: MUserMgr;

  misesAppMgr: MAppMgr;

  stargateClient!: StargateClient;

  constructor() {
    this.config = MisesSdk.newConfig();

    this.coinDefine = MisesSdk.newCoinDefine();

    this.msgReader = MisesSdk.newMsgReader();

    this.coinDefine.load();

    this.config.setLCDEndpoint(MISES_POINT);

    this.misesSdk = MisesSdk.newSdk(this.config);

    this.misesUser = this.misesSdk.userMgr();

    this.misesAppMgr = this.misesSdk.appMgr();
    StargateClient.connect(MISES_POINT).then((res) => {
      this.stargateClient = res;
    });
  }

  async makeClient(): Promise<
    [QueryClient & StakingExtension, Tendermint34Client]
  > {
    const tmClient = await Tendermint34Client.connect(MISES_POINT);
    return [
      QueryClient.withExtensions<StakingExtension>(
        tmClient,
        setupStakingExtension
      ),
      tmClient,
    ];
  }
}
