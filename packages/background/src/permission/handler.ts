import {
  AddPermissionOrigin,
  EnableAccessMsg,
  GetOriginPermittedChainsMsg,
  GetPermissionOriginsMsg,
  RemovePermissionOrigin,
  RemovePermissionsOrigin,
} from "./messages";
import {
  Env,
  Handler,
  InternalHandler,
  KeplrError,
  Message,
} from "@keplr-wallet/router";
import { PermissionService } from "./service";

export const getHandler: (service: PermissionService) => Handler = (
  service
) => {
  return (env: Env, msg: Message<unknown>) => {
    switch (msg.constructor) {
      case EnableAccessMsg:
        return handleEnableAccessMsg(service)(env, msg as EnableAccessMsg);
      case GetPermissionOriginsMsg:
        return handleGetPermissionOriginsMsg(service)(
          env,
          msg as GetPermissionOriginsMsg
        );
      case GetOriginPermittedChainsMsg:
        return handleGetOriginPermittedChainsMsg(service)(
          env,
          msg as GetOriginPermittedChainsMsg
        );
      case AddPermissionOrigin:
        return handleAddPermissionOrigin(service)(
          env,
          msg as RemovePermissionOrigin
        );
      case RemovePermissionOrigin:
        return handleRemovePermissionOrigin(service)(
          env,
          msg as RemovePermissionOrigin
        );
      case RemovePermissionsOrigin:
        return handleremoveAllPermissionsOrigin(service)(
          env,
          msg as RemovePermissionsOrigin
        );
      default:
        throw new KeplrError("permission", 120, "Unknown msg type");
    }
  };
};

const handleEnableAccessMsg: (
  service: PermissionService
) => InternalHandler<EnableAccessMsg> = (service) => {
  return async (env, msg) => {
    return await service.checkOrGrantBasicAccessPermission(
      env,
      msg.chainIds,
      msg.origin
    );
  };
};

const handleGetPermissionOriginsMsg: (
  service: PermissionService
) => InternalHandler<GetPermissionOriginsMsg> = (service) => {
  return (_, msg) => {
    return service.getPermissionOrigins(msg.chainId, msg.permissionType);
  };
};

const handleGetOriginPermittedChainsMsg: (
  service: PermissionService
) => InternalHandler<GetOriginPermittedChainsMsg> = (service) => {
  return (_, msg) => {
    return service.getOriginPermittedChains(
      msg.permissionOrigin,
      msg.permissionType
    );
  };
};

const handleAddPermissionOrigin: (
  service: PermissionService
) => InternalHandler<AddPermissionOrigin> = (service) => {
  return async (_, msg) => {
    await service.addPermission([msg.chainId], msg.permissionType, [
      msg.permissionOrigin,
    ]);
  };
};

const handleRemovePermissionOrigin: (
  service: PermissionService
) => InternalHandler<RemovePermissionOrigin> = (service) => {
  return async (_, msg) => {
    await service.removePermission(msg.chainId, msg.permissionType, [
      msg.permissionOrigin,
    ]);
  };
};

const handleremoveAllPermissionsOrigin: (
  service: PermissionService
) => InternalHandler<RemovePermissionsOrigin> = (service) => {
  return async (_, msg) => {
    await service.removeAllPermissions(msg.chainId);
  };
};
