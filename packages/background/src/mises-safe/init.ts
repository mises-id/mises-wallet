import { Router } from "@keplr-wallet/router";
import { InitSafeMsg, VerifyDomainMsg } from "./messages";
import { ROUTE } from "./constants";
import { getHandler } from "./handler";
import { MisesSafeService } from "./service";

export function init(router: Router, service: MisesSafeService) {
  router.registerMessage(InitSafeMsg);
  router.registerMessage(VerifyDomainMsg);

  router.addHandler(ROUTE, getHandler(service));
}
