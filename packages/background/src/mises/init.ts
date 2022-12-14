import { Router } from "@keplr-wallet/router";
import {
  BalanceUMISMsg,
  DelegationsMsg,
  GetChainIdMsg,
  MisesChainMsg,
  RecentTransactionsMsg,
  UnbondingDelegationsMsg,
  RewardsMsg,
  AuthAccountsMsg,
  BroadcastTxMsg,
  SimulateMsg,
  MisesAccountMsg,
  HasWalletAccountMsg,
  DisconnectMsg,
  ConnectMsg,
  UserFollowMsg,
  UserUnFollowMsg,
  SetUserInfoMsg,
  StakingMsg,
  ActiveUserMsg,
  PortForTxMsg,
} from "./messages";
import { ROUTE } from "./constants";
import { getHandler } from "./handler";
import { MisesService } from "./service";

export function init(router: Router, service: MisesService) {
  router.registerMessage(BalanceUMISMsg);
  router.registerMessage(MisesChainMsg);
  router.registerMessage(RecentTransactionsMsg);
  router.registerMessage(GetChainIdMsg);
  router.registerMessage(UnbondingDelegationsMsg);
  router.registerMessage(DelegationsMsg);
  router.registerMessage(RewardsMsg);
  router.registerMessage(AuthAccountsMsg);
  router.registerMessage(BroadcastTxMsg);
  router.registerMessage(SimulateMsg);
  router.registerMessage(MisesAccountMsg);
  router.registerMessage(HasWalletAccountMsg);
  router.registerMessage(DisconnectMsg);
  router.registerMessage(ConnectMsg);
  router.registerMessage(UserFollowMsg);
  router.registerMessage(UserUnFollowMsg);
  router.registerMessage(SetUserInfoMsg);
  router.registerMessage(StakingMsg);
  router.registerMessage(ActiveUserMsg);
  router.registerMessage(PortForTxMsg);

  router.addHandler(ROUTE, getHandler(service));
}
