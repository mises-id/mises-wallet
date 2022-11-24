import { Router } from "@keplr-wallet/router";
import { GetPersistentMemoryMsg1, SetPersistentMemoryMsg1 } from "./messages";
import { ROUTE } from "./constants";
import { getHandler } from "./handler";
import { MisesService } from "./service";

export function init(router: Router, service: MisesService) {
  router.registerMessage(SetPersistentMemoryMsg1);
  router.registerMessage(GetPersistentMemoryMsg1);

  router.addHandler(ROUTE, getHandler(service));
}
