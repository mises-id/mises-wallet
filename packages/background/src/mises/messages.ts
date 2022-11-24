import { Message } from "@keplr-wallet/router";
import { ROUTE } from "./constants";

export class SetPersistentMemoryMsg1 extends Message<{ success: boolean }> {
  public static type() {
    return "set-persistent-memory1";
  }

  constructor(public readonly data: any) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  validateBasic(): void {}

  route(): string {
    return ROUTE;
  }

  type(): string {
    return SetPersistentMemoryMsg1.type();
  }
}

export class GetPersistentMemoryMsg1 extends Message<any> {
  public static type() {
    return "get-persistent-memory1";
  }

  constructor() {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  validateBasic(): void {}

  route(): string {
    return ROUTE;
  }

  type(): string {
    return GetPersistentMemoryMsg1.type();
  }
}
