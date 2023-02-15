import { KeplrError, Message } from "@keplr-wallet/router";
import { ROUTE } from "./constants";
export class InitSafeMsg extends Message<void> {
  public static type() {
    return "init-mises-safe";
  }

  constructor(public readonly state: boolean) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  validateBasic(): void {
    if (!this.state) {
      throw new KeplrError("state", 101, "state is empty");
    }
  }

  route(): string {
    return ROUTE;
  }

  type(): string {
    return InitSafeMsg.type();
  }
}
export class VerifyDomainMsg extends Message<any> {
  public static type() {
    return "verify-domain";
  }

  constructor(public readonly params: any) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  validateBasic(): void {
    // noop
  }

  route(): string {
    return ROUTE;
  }

  approveExternal(): boolean {
    return true;
  }

  type(): string {
    return VerifyDomainMsg.type();
  }
}
export class GetIsShouldVerifyMsg extends Message<boolean> {
  public static type() {
    return "get-is-should-verify";
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

  approveExternal(): boolean {
    return true;
  }

  type(): string {
    return GetIsShouldVerifyMsg.type();
  }
}
