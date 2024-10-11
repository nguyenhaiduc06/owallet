import { Router } from "@owallet/router";
import {
  PingMsg,
  GetChainInfosWithCoreTypesMsg,
  SuggestChainInfoMsg,
  RemoveSuggestedChainInfoMsg,
  GetChainInfosWithoutEndpointsMsg,
  SetChainEndpointsMsg,
  ClearChainEndpointsMsg,
  GetChainOriginalEndpointsMsg,
  ClearAllSuggestedChainInfosMsg,
  ClearAllChainEndpointsMsg,
  GetChainInfoWithoutEndpointsMsg,
  NeedSuggestChainInfoInteractionMsg,
} from "./messages";
import { ROUTE } from "./constants";
import { getHandler } from "./handler";
import { ChainsService } from "./service";
import { PermissionService } from "../permission-v2";
import { PermissionInteractiveService } from "../permission-interactive";

export function init(
  router: Router,
  chainService: ChainsService,
  permissionService: PermissionService,
  permissionInteractiveService: PermissionInteractiveService
): void {
  router.registerMessage(PingMsg);
  router.registerMessage(GetChainInfosWithCoreTypesMsg);
  router.registerMessage(GetChainInfosWithoutEndpointsMsg);
  router.registerMessage(GetChainInfoWithoutEndpointsMsg);
  router.registerMessage(SuggestChainInfoMsg);
  router.registerMessage(NeedSuggestChainInfoInteractionMsg);
  router.registerMessage(RemoveSuggestedChainInfoMsg);
  router.registerMessage(SetChainEndpointsMsg);
  router.registerMessage(ClearChainEndpointsMsg);
  router.registerMessage(GetChainOriginalEndpointsMsg);
  router.registerMessage(ClearAllSuggestedChainInfosMsg);
  router.registerMessage(ClearAllChainEndpointsMsg);

  router.addHandler(
    ROUTE,
    getHandler(chainService, permissionService, permissionInteractiveService)
  );
}
