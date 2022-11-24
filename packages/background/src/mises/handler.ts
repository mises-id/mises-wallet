import { Env, Handler, InternalHandler, Message } from "@keplr-wallet/router";
import { SetPersistentMemoryMsg1, GetPersistentMemoryMsg1 } from "./messages";
import { MisesService } from "./service";

export const getHandler: (service: MisesService) => Handler = (service) => {
  return (env: Env, msg: Message<unknown>) => {
    switch (msg.constructor) {
      case SetPersistentMemoryMsg1:
        return handleSetPersistentMemoryMsg(service)(
          env,
          msg as SetPersistentMemoryMsg1
        );
      case GetPersistentMemoryMsg1:
      // return service.get();
      default:
        throw new Error("Unknown msg type");
    }
  };
};

const handleSetPersistentMemoryMsg: (
  service: MisesService
) => InternalHandler<SetPersistentMemoryMsg1> = (service: MisesService) => (
  _,
  msg
) => {
  // service.set(msg.data);
  return {
    success: true,
  };
};
