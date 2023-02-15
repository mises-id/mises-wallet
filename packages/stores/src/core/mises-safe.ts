import { MessageRequester } from "@keplr-wallet/router";
import { makeObservable, observable } from "mobx";

export class MisesSafeStore {
  @observable
  isShouldVerify: boolean = true;

  constructor(protected readonly requester: MessageRequester) {
    makeObservable(this);
  }
  getMisesSafeConfig() {
    //noop
  }
}
