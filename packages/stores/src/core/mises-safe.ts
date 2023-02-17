// import {
//   GetIsShouldVerifyMsg,
//   SetIsShouldVerifyMsg,
// } from "@keplr-wallet/background";
import { MessageRequester } from "@keplr-wallet/router";
import { makeObservable, observable } from "mobx";

export class MisesSafeStore {
  @observable
  isShouldVerify: boolean = true;

  constructor(protected readonly requester: MessageRequester) {
    makeObservable(this);
    // this.initSafeConfig();
  }

  // initSafeConfig() {
  //   this.getMisesSafeConfig().then((res) => (this.isShouldVerify = res));
  // }

  // async getMisesSafeConfig() {
  //   return await this.requester.sendMessage(
  //     BACKGROUND_PORT,
  //     new GetIsShouldVerifyMsg()
  //   );
  // }
  // setMisesSafeConfig(state: boolean) {
  //   console.log(!!state, "setMisesSafeConfig");
  //   this.isShouldVerify = !!state;
  //   this.requester.sendMessage(
  //     BACKGROUND_PORT,
  //     new SetIsShouldVerifyMsg(state)
  //   );
  // }
}
