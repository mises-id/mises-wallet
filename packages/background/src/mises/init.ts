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

  router.addHandler(ROUTE, getHandler(service));
}
