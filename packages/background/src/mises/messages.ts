import { Coin, DeliverTxResponse } from "@cosmjs/stargate";
import { KeplrError, Message } from "@keplr-wallet/router";
import { MisesAccountData } from "@keplr-wallet/types";
import { MUserInfo } from "mises-js-sdk/dist/types/muser";
import { PubKey } from "secretjs/types/types";
import { ROUTE } from "./constants";
import {
  IndexTx,
  userInfo,
  DeliverTxResponse as DeliverTxResponseMises,
} from "./service";

export class BalanceUMISMsg extends Message<Coin> {
  public static type() {
    return "balance-umis";
  }

  constructor(public readonly address?: string) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  validateBasic(): void {}

  route(): string {
    return ROUTE;
  }

  type(): string {
    return BalanceUMISMsg.type();
  }
}

export class MisesChainMsg extends Message<boolean> {
  public static type() {
    return "mises-chain";
  }

  constructor(public readonly chainId: string) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  validateBasic(): void {
    if (!this.chainId) {
      throw new KeplrError("mises", 274, "chainId not set");
    }
  }

  route(): string {
    return ROUTE;
  }

  type(): string {
    return MisesChainMsg.type();
  }
}

export class RecentTransactionsMsg extends Message<readonly IndexTx[]> {
  public static type() {
    return "recent-transaction";
  }

  constructor() {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  validateBasic(): void {
    // noop
  }

  route(): string {
    return ROUTE;
  }

  type(): string {
    return RecentTransactionsMsg.type();
  }
}
export class GetChainIdMsg extends Message<string> {
  public static type() {
    return "get-chain-id";
  }

  constructor() {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  validateBasic(): void {
    // noop
  }

  route(): string {
    return ROUTE;
  }

  type(): string {
    return GetChainIdMsg.type();
  }
}

export class UnbondingDelegationsMsg extends Message<any> {
  public static type() {
    return "unbonding-delegations";
  }

  constructor(public readonly address: string) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  validateBasic(): void {
    // noop
    if (!this.address) {
      throw new KeplrError("mises", 274, "address not set");
    }
  }

  route(): string {
    return ROUTE;
  }

  type(): string {
    return UnbondingDelegationsMsg.type();
  }
}

export class DelegationsMsg extends Message<any> {
  public static type() {
    return "delegations";
  }

  constructor(public readonly address: string) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  validateBasic(): void {
    // noop
    if (!this.address) {
      throw new KeplrError("mises", 274, "address not set");
    }
  }

  route(): string {
    return ROUTE;
  }

  type(): string {
    return DelegationsMsg.type();
  }
}

export class RewardsMsg extends Message<any> {
  public static type() {
    return "rewards";
  }

  constructor(public readonly address: string) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  validateBasic(): void {
    // noop
    if (!this.address) {
      throw new KeplrError("mises", 274, "address not set");
    }
  }

  route(): string {
    return ROUTE;
  }

  type(): string {
    return RewardsMsg.type();
  }
}

export class AuthAccountsMsg extends Message<any> {
  public static type() {
    return "auth-accounts";
  }

  constructor(public readonly address: string) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  validateBasic(): void {
    // noop
    if (!this.address) {
      throw new KeplrError("mises", 274, "address not set");
    }
  }

  route(): string {
    return ROUTE;
  }

  type(): string {
    return AuthAccountsMsg.type();
  }
}

export class BroadcastTxMsg extends Message<any> {
  public static type() {
    return "broadcast-tx-to-background";
  }

  constructor(public readonly tx: Uint8Array) {
    super();
  }

  validateBasic(): void {
    if (!this.tx) {
      throw new KeplrError("tx", 101, "tx is empty");
    }
  }

  approveExternal(): boolean {
    return true;
  }

  route(): string {
    return ROUTE;
  }

  type(): string {
    return BroadcastTxMsg.type();
  }
}

export class SimulateMsg extends Message<{
  gasUsed: any;
}> {
  public static type() {
    return "simulate";
  }

  constructor(
    public readonly messages: any[],
    public readonly memo: string | undefined,
    public readonly signer: PubKey,
    public readonly sequence: number
  ) {
    super();
  }

  validateBasic(): void {
    if (!this.messages) {
      throw new KeplrError("messages", 101, "messages is empty");
    }
    if (!this.signer) {
      throw new KeplrError("signer", 101, "signer is empty");
    }
    if (!this.sequence) {
      throw new KeplrError("sequence", 101, "sequence is empty");
    }
  }

  approveExternal(): boolean {
    return true;
  }

  route(): string {
    return ROUTE;
  }

  type(): string {
    return SimulateMsg.type();
  }
}
export class MisesAccountMsg extends Message<MisesAccountData> {
  public static type() {
    return "mises-account";
  }

  constructor() {
    super();
  }

  validateBasic(): void {
    //noop
  }

  approveExternal(): boolean {
    return true;
  }
  route(): string {
    return ROUTE;
  }

  type(): string {
    return MisesAccountMsg.type();
  }
}
export class HasWalletAccountMsg extends Message<boolean> {
  public static type() {
    return "has-wallet-account";
  }

  constructor() {
    super();
  }

  validateBasic(): void {
    //noop
  }

  approveExternal(): boolean {
    return true;
  }
  route(): string {
    return ROUTE;
  }

  type(): string {
    return HasWalletAccountMsg.type();
  }
}

export class DisconnectMsg extends Message<boolean> {
  public static type() {
    return "disconnect";
  }
  constructor(
    public readonly params: {
      readonly appid: string;
      readonly userid: string;
    }
  ) {
    super();
  }

  validateBasic(): void {
    if (!this.params.appid) {
      throw new KeplrError("appid", 101, "appid is empty");
    }
    if (!this.params.userid) {
      throw new KeplrError("userid", 101, "userid is empty");
    }
  }
  approveExternal(): boolean {
    return true;
  }
  route(): string {
    return ROUTE;
  }

  type(): string {
    return DisconnectMsg.type();
  }
}

export class ConnectMsg extends Message<string | false> {
  public static type() {
    return "connect";
  }
  constructor(
    public readonly params: {
      readonly appid: string;
      readonly userid: string;
      readonly domain: string;
      readonly permissions: string[];
    }
  ) {
    super();
  }

  validateBasic(): void {
    if (!this.params.appid) {
      throw new KeplrError("appid", 101, "appid is empty");
    }
    if (!this.params.userid) {
      throw new KeplrError("userid", 101, "userid is empty");
    }
    if (!this.params.domain) {
      throw new KeplrError("domain", 101, "domain is empty");
    }
    if (!this.params.permissions) {
      throw new KeplrError("permissions", 101, "permissions is empty");
    }
  }
  approveExternal(): boolean {
    return true;
  }
  route(): string {
    return ROUTE;
  }

  type(): string {
    return ConnectMsg.type();
  }
}

export class UserFollowMsg extends Message<void> {
  public static type() {
    return "userFollow";
  }
  constructor(public readonly toUid: string) {
    super();
  }

  validateBasic(): void {
    if (!this.toUid) {
      throw new KeplrError("toUid", 101, "toUid is empty");
    }
  }
  approveExternal(): boolean {
    return true;
  }
  route(): string {
    return ROUTE;
  }

  type(): string {
    return UserFollowMsg.type();
  }
}

export class UserUnFollowMsg extends Message<void> {
  public static type() {
    return "userUnFollow";
  }
  constructor(public readonly toUid: string) {
    super();
  }

  validateBasic(): void {
    if (!this.toUid) {
      throw new KeplrError("toUid", 101, "toUid is empty");
    }
  }
  approveExternal(): boolean {
    return true;
  }
  route(): string {
    return ROUTE;
  }

  type(): string {
    return UserUnFollowMsg.type();
  }
}

export class SetUserInfoMsg extends Message<boolean> {
  public static type() {
    return "set-user-info";
  }
  constructor(public readonly params: MUserInfo) {
    super();
  }

  validateBasic(): void {
    if (!this.params) {
      throw new KeplrError("params", 101, "params is empty");
    }
  }
  approveExternal(): boolean {
    return true;
  }
  route(): string {
    return ROUTE;
  }

  type(): string {
    return SetUserInfoMsg.type();
  }
}
export class StakingMsg extends Message<DeliverTxResponse> {
  public static type() {
    return "staking";
  }
  constructor(public readonly params: any) {
    super();
  }

  validateBasic(): void {
    if (!this.params) {
      throw new KeplrError("params", 101, "params is empty");
    }
  }
  approveExternal(): boolean {
    return true;
  }
  route(): string {
    return ROUTE;
  }

  type(): string {
    return StakingMsg.type();
  }
}

export class ActiveUserMsg extends Message<userInfo> {
  public static type() {
    return "active-user";
  }
  constructor() {
    super();
  }

  validateBasic(): void {
    // noop
  }
  approveExternal(): boolean {
    return true;
  }
  route(): string {
    return ROUTE;
  }

  type(): string {
    return ActiveUserMsg.type();
  }
}

export class PortForTxMsg extends Message<DeliverTxResponseMises> {
  public static type() {
    return "port-for-tx";
  }
  constructor(public readonly txId: string | Uint8Array) {
    super();
  }

  validateBasic(): void {
    if (!this.txId) {
      throw new KeplrError("txId", 101, "txId is empty");
    }
  }
  route(): string {
    return ROUTE;
  }

  type(): string {
    return PortForTxMsg.type();
  }
}
export class SaveTranstionsMsg extends Message<void> {
  public static type() {
    return "save-transtions";
  }
  constructor(public readonly transtions: IndexTx[]) {
    super();
  }

  validateBasic(): void {
    if (!this.transtions) {
      throw new KeplrError("transtions", 101, "transtions is empty");
    }
  }
  route(): string {
    return ROUTE;
  }

  type(): string {
    return SaveTranstionsMsg.type();
  }
}

export class OpenWalletMsg extends Message<void> {
  public static type() {
    return "open-wallet";
  }
  constructor() {
    super();
  }

  approveExternal(): boolean {
    return true;
  }

  validateBasic(): void {
    //noop
  }
  route(): string {
    return ROUTE;
  }

  type(): string {
    return OpenWalletMsg.type();
  }
}

export class GetLocalCacheMsg extends Message<userInfo> {
  public static type() {
    return "get-local-cache";
  }
  constructor(public readonly address?: string) {
    super();
  }

  validateBasic(): void {
    // noop
  }
  route(): string {
    return ROUTE;
  }

  type(): string {
    return GetLocalCacheMsg.type();
  }
}

export class SetLocalCacheMsg extends Message<void> {
  public static type() {
    return "set-local-cache";
  }
  constructor(public readonly params: { stakedSum: Coin }) {
    super();
  }

  validateBasic(): void {
    // noop
  }
  route(): string {
    return ROUTE;
  }

  type(): string {
    return SetLocalCacheMsg.type();
  }
}
