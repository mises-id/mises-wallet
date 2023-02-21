import { Router } from "@keplr-wallet/router";
import {
  CreateMnemonicKeyMsg,
  CreatePrivateKeyMsg,
  GetKeyMsg,
  UnlockKeyRingMsg,
  RequestSignAminoMsg,
  RequestSignDirectMsg,
  LockKeyRingMsg,
  DeleteKeyRingMsg,
  UpdateNameKeyRingMsg,
  ShowKeyRingMsg,
  AddMnemonicKeyMsg,
  AddPrivateKeyMsg,
  GetMultiKeyStoreInfoMsg,
  ChangeKeyRingMsg,
  GetIsKeyStoreCoinTypeSetMsg,
  SetKeyStoreCoinTypeMsg,
  RestoreKeyRingMsg,
  CheckPasswordMsg,
  ExportKeyRingDatasMsg,
  RequestVerifyADR36AminoSignDoc,
  RequestSignEIP712CosmosTxMsg_v0,
  IsUnlockMsg,
  AddAccountMsg,
  MigratorKeyRingMsg,
  RestoreKeyStoreMsg,
} from "./messages";
import { ROUTE } from "./constants";
import { getHandler } from "./handler";
import { KeyRingService } from "./service";

export function init(router: Router, service: KeyRingService): void {
  router.registerMessage(RestoreKeyRingMsg);
  router.registerMessage(DeleteKeyRingMsg);
  router.registerMessage(UpdateNameKeyRingMsg);
  router.registerMessage(ShowKeyRingMsg);
  router.registerMessage(CreateMnemonicKeyMsg);
  router.registerMessage(AddMnemonicKeyMsg);
  router.registerMessage(CreatePrivateKeyMsg);
  router.registerMessage(AddPrivateKeyMsg);
  router.registerMessage(LockKeyRingMsg);
  router.registerMessage(UnlockKeyRingMsg);
  router.registerMessage(IsUnlockMsg);
  router.registerMessage(GetKeyMsg);
  router.registerMessage(RequestSignAminoMsg);
  router.registerMessage(RequestVerifyADR36AminoSignDoc);
  router.registerMessage(RequestSignDirectMsg);
  router.registerMessage(GetMultiKeyStoreInfoMsg);
  router.registerMessage(ChangeKeyRingMsg);
  router.registerMessage(GetIsKeyStoreCoinTypeSetMsg);
  router.registerMessage(SetKeyStoreCoinTypeMsg);
  router.registerMessage(CheckPasswordMsg);
  router.registerMessage(ExportKeyRingDatasMsg);
  router.registerMessage(RequestSignEIP712CosmosTxMsg_v0);
  router.registerMessage(AddAccountMsg);
  router.registerMessage(MigratorKeyRingMsg);
  router.registerMessage(RestoreKeyStoreMsg);

  router.addHandler(ROUTE, getHandler(service));
}
