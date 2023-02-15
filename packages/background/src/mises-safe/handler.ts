import { Env, Handler, InternalHandler, Message } from "@keplr-wallet/router";
import { InitSafeMsg, VerifyDomainMsg } from "./messages";
import { MisesSafeService } from "./service";

export const getHandler: (service: MisesSafeService) => Handler = (service) => {
  return (env: Env, msg: Message<unknown>) => {
    switch (msg.constructor) {
      case InitSafeMsg:
        return handlerInitSafeMsg(service)(env, msg as InitSafeMsg);
      case VerifyDomainMsg:
        return handlerVerifyDomainMsg(service)(env, msg as VerifyDomainMsg);
      // case GetIsShouldVerifyMsg:
      //   return handlerGetIsShouldVerifyMsg(service)(
      //     env,
      //     msg as GetIsShouldVerifyMsg
      //   );
      default:
        throw new Error("Unknown msg type");
    }
  };
};

const handlerInitSafeMsg: (
  service: MisesSafeService
) => InternalHandler<InitSafeMsg> = (service: MisesSafeService) => (_, msg) => {
  service.setIsShouldVerifyState(msg.state);
};

const handlerVerifyDomainMsg: (
  service: MisesSafeService
) => InternalHandler<VerifyDomainMsg> = (service: MisesSafeService) => (
  _,
  msg
) => {
  return service.initMessageClient(msg);
};

// const handlerGetIsShouldVerifyMsg: (
//   service: MisesSafeService
// ) => InternalHandler<GetIsShouldVerifyMsg> = (service: MisesSafeService) => (
//   _
// ) => {
//   return service.setIsShouldVerifyState;
// };
