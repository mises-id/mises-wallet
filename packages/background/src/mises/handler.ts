import { Env, Handler, InternalHandler, Message } from "@keplr-wallet/router";
import { MUserInfo } from "mises-js-sdk/dist/types/muser";
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
  MisesAccountMsg,
  HasWalletAccountMsg,
  DisconnectMsg,
  ConnectMsg,
  UserFollowMsg,
  UserUnFollowMsg,
  SetUserInfoMsg,
  StakingMsg,
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
      case MisesAccountMsg:
        return handlerMisesAccount(service)(env, msg as MisesAccountMsg);
      case HasWalletAccountMsg:
        return handlerHasWalletAccount(service)(
          env,
          msg as HasWalletAccountMsg
        );
      case DisconnectMsg:
        return handlerDisconnect(service)(env, msg as DisconnectMsg);
      case ConnectMsg:
        return handlerConnect(service)(env, msg as ConnectMsg);
      case UserFollowMsg:
        return handlerUserFollow(service)(env, msg as UserFollowMsg);
      case UserUnFollowMsg:
        return handlerUserUnFollow(service)(env, msg as UserUnFollowMsg);
      case SetUserInfoMsg:
        return handlerSetUserInfo(service)(env, msg as SetUserInfoMsg);
      case StakingMsg:
        return handlerStaking(service)(env, msg as StakingMsg);
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
) => InternalHandler<MisesChainMsg> = () => (
  _: any,
  msg: { chainId: string }
) => {
  return msg.chainId === "mainnet";
};

const handlerRecentTransactionsMsg: (
  service: MisesService
) => InternalHandler<RecentTransactionsMsg> = (service: MisesService) => (
  _: any,
  msg: { height: number | undefined }
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
  _: any,
  msg: { address: string }
) => {
  return service.unbondingDelegations(msg.address);
};

const handlerDelegations: (
  service: MisesService
) => InternalHandler<DelegationsMsg> = (service: MisesService) => (
  _: any,
  msg: { address: string }
) => {
  return service.delegations(msg.address);
};

const handlerRewards: (service: MisesService) => InternalHandler<RewardsMsg> = (
  service: MisesService
) => (_: any, msg: { address: string }) => {
  return service.rewards(msg.address);
};

const handlerAuthaccounts: (
  service: MisesService
) => InternalHandler<AuthAccountsMsg> = (service: MisesService) => (
  _: any,
  msg: { address: string }
) => {
  return service.authAccounts(msg.address);
};

const handlerBroadcastTx: (
  service: MisesService
) => InternalHandler<BroadcastTxMsg> = (service: MisesService) => (
  _: any,
  msg: { tx: Uint8Array }
) => {
  return service.broadcastTx(msg.tx);
};

const handlerSimulate: (
  service: MisesService
) => InternalHandler<SimulateMsg> = (service: MisesService) => (
  _: any,
  msg: {
    messages: readonly any[];
    memo: string | undefined;
    signer: any;
    sequence: number;
  }
) => {
  return service.simulate(msg.messages, msg.memo, msg.signer, msg.sequence);
};

const handlerMisesAccount: (
  service: MisesService
) => InternalHandler<MisesAccountMsg> = (service: MisesService) => () => {
  return service.misesAccount();
};

const handlerHasWalletAccount: (
  service: MisesService
) => InternalHandler<HasWalletAccountMsg> = (service: MisesService) => () => {
  return service.hasWalletAccount();
};

const handlerDisconnect: (
  service: MisesService
) => InternalHandler<DisconnectMsg> = (service: MisesService) => (
  _: any,
  msg: { params: { appid: string; userid: string } }
) => {
  return service.disconnect(msg.params);
};

const handlerConnect: (service: MisesService) => InternalHandler<ConnectMsg> = (
  service: MisesService
) => (
  _: any,
  msg: {
    params: { appid: string; userid: string; domain: string } & {
      permissions: string[];
    };
  }
) => {
  return service.connect(msg.params);
};

const handlerUserFollow: (
  service: MisesService
) => InternalHandler<UserFollowMsg> = (service: MisesService) => (
  _: any,
  msg: { toUid: string }
) => {
  return service.setFollow(msg.toUid);
};

const handlerUserUnFollow: (
  service: MisesService
) => InternalHandler<UserUnFollowMsg> = (service: MisesService) => (
  _: any,
  msg: { toUid: string }
) => {
  return service.setUnFollow(msg.toUid);
};

const handlerSetUserInfo: (
  service: MisesService
) => InternalHandler<SetUserInfoMsg> = (service: MisesService) => (
  _: any,
  msg: { params: MUserInfo }
) => {
  return service.setUserInfo(msg.params);
};

const handlerStaking: (service: MisesService) => InternalHandler<StakingMsg> = (
  service: MisesService
) => (_: any, msg: { params: any }) => {
  return service.staking(msg.params);
};
