import {
  Env,
  Handler,
  InternalHandler,
  KeplrError,
  Message,
} from "@keplr-wallet/router";
import {
  GetAutoLockAccountDurationMsg,
  UpdateAutoLockAccountDurationMsg,
  StartAutoLockMonitoringMsg,
  LockMsg,
  KeepAliveMsg,
} from "./messages";
import { AutoLockAccountService } from "./service";

export const getHandler: (service: AutoLockAccountService) => Handler = (
  service: AutoLockAccountService
) => {
  return (env: Env, msg: Message<unknown>) => {
    switch (msg.constructor) {
      case GetAutoLockAccountDurationMsg:
        return handleGetAutoLockAccountDurationMsg(service)(
          env,
          msg as GetAutoLockAccountDurationMsg
        );
      case UpdateAutoLockAccountDurationMsg:
        return handleUpdateAutoLockAccountDurationMsg(service)(
          env,
          msg as UpdateAutoLockAccountDurationMsg
        );
      case StartAutoLockMonitoringMsg:
        return handleStartAutoLockMonitoringMsg(service)(
          env,
          msg as StartAutoLockMonitoringMsg
        );
      case LockMsg:
        return handleLockMsg(service)(env, msg as LockMsg);
      case KeepAliveMsg:
        return handleKeepAliveMsg(service)(env, msg as KeepAliveMsg);
      default:
        throw new KeplrError("auto-lock-account", 100, "Unknown msg type");
    }
  };
};

const handleGetAutoLockAccountDurationMsg: (
  service: AutoLockAccountService
) => InternalHandler<GetAutoLockAccountDurationMsg> = (service) => {
  return () => {
    return service.getAutoLockDuration();
  };
};

const handleUpdateAutoLockAccountDurationMsg: (
  service: AutoLockAccountService
) => InternalHandler<UpdateAutoLockAccountDurationMsg> = (service) => {
  return (_, msg) => {
    if (!service.keyRingIsUnlocked) {
      throw new Error("Keyring is not unlocked");
    }

    return service.setDuration(msg.duration);
  };
};

const handleStartAutoLockMonitoringMsg: (
  service: AutoLockAccountService
) => InternalHandler<StartAutoLockMonitoringMsg> = (service) => {
  return () => {
    return service.startAppStateCheckTimer();
  };
};

const handleLockMsg: (
  service: AutoLockAccountService
) => InternalHandler<LockMsg> = (service) => {
  return () => {
    return service.lock();
  };
};

const handleKeepAliveMsg: (
  service: AutoLockAccountService
) => InternalHandler<KeepAliveMsg> = (service) => {
  return () => {
    console.log("keepAlive start");
    return service.keepAlive();
  };
};
