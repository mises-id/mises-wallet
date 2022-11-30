import { Env, Handler, InternalHandler, Message } from "@keplr-wallet/router";
import {
  BalanceUMISMsg,
  MisesChainMsg,
  RecentTransactionsMsg,
  GetChainIdMsg,
  UnbondingDelegationsMsg,
  DelegationsMsg,
  RewardsMsg,
  AuthAccountsMsg,
  BroadcastTxMsg,
  SimulateMsg,
} from "./messages";
import { MisesService } from "./service";

export const getHandler: (service: MisesService) => Handler = (service) => {
  return (env: Env, msg: Message<unknown>) => {
    switch (msg.constructor) {
      case BalanceUMISMsg:
        return handlerBalanceUMISMsg(service)(env, msg as BalanceUMISMsg);
      case MisesChainMsg:
        return handlerMisesChainMsg(service)(env, msg as MisesChainMsg);
      case RecentTransactionsMsg:
        return handlerRecentTransactionsMsg(service)(
          env,
          msg as RecentTransactionsMsg
        );
      case GetChainIdMsg:
        return handlerGetChainIdMsg(service)(env, msg as GetChainIdMsg);
      case UnbondingDelegationsMsg:
        return handlerUnbondingDelegations(service)(
          env,
          msg as UnbondingDelegationsMsg
        );
      case DelegationsMsg:
        return handlerDelegations(service)(env, msg as DelegationsMsg);
      case RewardsMsg:
        return handlerRewards(service)(env, msg as RewardsMsg);
      case AuthAccountsMsg:
        return handlerAuthaccounts(service)(env, msg as AuthAccountsMsg);
      case BroadcastTxMsg:
        return handlerBroadcastTx(service)(env, msg as BroadcastTxMsg);
      case SimulateMsg:
        return handlerSimulate(service)(env, msg as SimulateMsg);
      default:
        throw new Error("Unknown msg type");
    }
  };
};

const handlerBalanceUMISMsg: (
  service: MisesService
) => InternalHandler<BalanceUMISMsg> = (service: MisesService) => () => {
  return service.getBalanceUMIS();
};

const handlerMisesChainMsg: (
  service: MisesService
) => InternalHandler<MisesChainMsg> = () => (_, msg) => {
  return msg.chainId === "mainnet";
};

const handlerRecentTransactionsMsg: (
  service: MisesService
) => InternalHandler<RecentTransactionsMsg> = (service: MisesService) => (
  _,
  msg
) => {
  return service.recentTransactions(msg.height);
};

const handlerGetChainIdMsg: (
  service: MisesService
) => InternalHandler<GetChainIdMsg> = (service: MisesService) => () => {
  return service.getChainId();
};

const handlerUnbondingDelegations: (
  service: MisesService
) => InternalHandler<UnbondingDelegationsMsg> = (service: MisesService) => (
  _,
  msg
) => {
  return service.unbondingDelegations(msg.address);
};

const handlerDelegations: (
  service: MisesService
) => InternalHandler<DelegationsMsg> = (service: MisesService) => (_, msg) => {
  return service.delegations(msg.address);
};

const handlerRewards: (service: MisesService) => InternalHandler<RewardsMsg> = (
  service: MisesService
) => (_, msg) => {
  return service.rewards(msg.address);
};

const handlerAuthaccounts: (
  service: MisesService
) => InternalHandler<AuthAccountsMsg> = (service: MisesService) => (_, msg) => {
  return service.authAccounts(msg.address);
};

const handlerBroadcastTx: (
  service: MisesService
) => InternalHandler<BroadcastTxMsg> = (service: MisesService) => (_, msg) => {
  return service.broadcastTx(msg.tx, msg.mode);
};

const handlerSimulate: (
  service: MisesService
) => InternalHandler<SimulateMsg> = (service: MisesService) => (_, msg) => {
  return service.simulate(msg.messages, msg.memo, msg.signer, msg.sequence);
};
