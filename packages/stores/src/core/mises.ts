import { BACKGROUND_PORT, MessageRequester } from "@keplr-wallet/router";
import { makeObservable, observable } from "mobx";
import {
  BalanceUMISMsg,
  GetChainIdMsg,
  MisesChainMsg,
  RecentTransactionsMsg,
  UnbondingDelegationsMsg,
  DelegationsMsg,
  RewardsMsg,
  AuthAccountsMsg,
  BroadcastTxMsg,
  SimulateMsg,
} from "@keplr-wallet/background";
import { PubKey } from "@keplr-wallet/types";
import { Any } from "@keplr-wallet/proto-types/google/protobuf/any";
export class MisesStore {
  @observable
  isInitializing: boolean = false;

  constructor(protected readonly requester: MessageRequester) {
    makeObservable(this);
  }

  async getBalanceUMIS() {
    return await this.requester.sendMessage(
      BACKGROUND_PORT,
      new BalanceUMISMsg()
    );
  }

  async isMisesChain(chainId: string) {
    return await this.requester.sendMessage(
      BACKGROUND_PORT,
      new MisesChainMsg(chainId)
    );
  }

  async recentTransactions(height: number | undefined) {
    return await this.requester.sendMessage(
      BACKGROUND_PORT,
      new RecentTransactionsMsg(height)
    );
  }

  async getChainId() {
    return await this.requester.sendMessage(
      BACKGROUND_PORT,
      new GetChainIdMsg()
    );
  }

  async unbondingDelegations(address: string) {
    return await this.requester.sendMessage(
      BACKGROUND_PORT,
      new UnbondingDelegationsMsg(address)
    );
  }

  async delegations(address: string) {
    return await this.requester.sendMessage(
      BACKGROUND_PORT,
      new DelegationsMsg(address)
    );
  }

  async rewards(address: string) {
    return await this.requester.sendMessage(
      BACKGROUND_PORT,
      new RewardsMsg(address)
    );
  }

  async authAccounts(address: string) {
    return await this.requester.sendMessage(
      BACKGROUND_PORT,
      new AuthAccountsMsg(address)
    );
  }

  async broadcastTx(tx: Uint8Array, mode: string) {
    return await this.requester.sendMessage(
      BACKGROUND_PORT,
      new BroadcastTxMsg(tx, mode)
    );
  }

  async simulate(
    messages: Any[],
    memo: string | undefined,
    signer: PubKey,
    sequence: number
  ) {
    return await this.requester.sendMessage(
      BACKGROUND_PORT,
      new SimulateMsg(messages, memo, signer, sequence)
    );
  }
}
