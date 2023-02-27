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
  ActiveUserMsg,
  PortForTxMsg,
  GetAutoLockAccountDurationMsg,
  StartAutoLockMonitoringMsg,
  LockMsg,
  SaveTranstionsMsg,
  IndexTx,
  GetLocalCacheMsg,
  SetLocalCacheMsg,
} from "@keplr-wallet/background";
import { PubKey } from "@keplr-wallet/types";
import { Coin } from "@cosmjs/proto-signing";
export class MisesStore {
  @observable
  isInitializing: boolean = false;

  @observable
  autoLockAccountDuration: number = 0;

  constructor(protected readonly requester: MessageRequester) {
    makeObservable(this);
    this.initAutoLockAccountDuration();
  }

  async getBalanceUMIS(isCache?: boolean) {
    return await this.requester.sendMessage(
      BACKGROUND_PORT,
      new BalanceUMISMsg(isCache)
    );
  }

  async isMisesChain(chainId: string) {
    return await this.requester.sendMessage(
      BACKGROUND_PORT,
      new MisesChainMsg(chainId)
    );
  }

  async getChainId() {
    return await this.requester.sendMessage(
      BACKGROUND_PORT,
      new GetChainIdMsg()
    );
  }

  async unbondingDelegations(address: string, isCache?: boolean) {
    return await this.requester.sendMessage(
      BACKGROUND_PORT,
      new UnbondingDelegationsMsg(address, isCache)
    );
  }

  async delegations(address: string, isCache?: boolean) {
    return await this.requester.sendMessage(
      BACKGROUND_PORT,
      new DelegationsMsg(address, isCache)
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

  async broadcastTx(tx: Uint8Array) {
    return await this.requester.sendMessage(
      BACKGROUND_PORT,
      new BroadcastTxMsg(tx)
    );
  }

  async simulate(
    messages: any[],
    memo: string | undefined,
    signer: PubKey,
    sequence: number
  ) {
    return await this.requester.sendMessage(
      BACKGROUND_PORT,
      new SimulateMsg(messages, memo, signer, sequence)
    );
  }

  async recentTransactions() {
    return await this.requester.sendMessage(
      BACKGROUND_PORT,
      new RecentTransactionsMsg()
    );
  }

  async activeUser() {
    return await this.requester.sendMessage(
      BACKGROUND_PORT,
      new ActiveUserMsg()
    );
  }

  async portForTx(txId: string | Uint8Array) {
    return await this.requester.sendMessage(
      BACKGROUND_PORT,
      new PortForTxMsg(txId)
    );
  }

  async getAutoLockAccountDuration() {
    return await this.requester.sendMessage(
      BACKGROUND_PORT,
      new GetAutoLockAccountDurationMsg()
    );
  }

  initAutoLockAccountDuration() {
    this.getAutoLockAccountDuration().then(
      (res) => (this.autoLockAccountDuration = res)
    );
  }

  setLastActiveTime() {
    this.requester.sendMessage(
      BACKGROUND_PORT,
      new StartAutoLockMonitoringMsg()
    );
  }

  setLock() {
    this.requester.sendMessage(BACKGROUND_PORT, new LockMsg());
  }

  saveTranstions(transactions: IndexTx[]) {
    this.requester.sendMessage(
      BACKGROUND_PORT,
      new SaveTranstionsMsg(transactions)
    );
  }

  getLocalCache() {
    return this.requester.sendMessage(BACKGROUND_PORT, new GetLocalCacheMsg());
  }

  setLocalCache(params: { stakedSum: Coin }) {
    this.requester.sendMessage(BACKGROUND_PORT, new SetLocalCacheMsg(params));
  }
}
