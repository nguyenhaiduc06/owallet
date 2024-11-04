import { Router } from '@owallet/router';
import { KeyRingService } from './service';
import {
  GetIsLockedMsg,
  GetKeyRingStatusMsg,
  GetKeyRingStatusOnlyMsg,
  FinalizeKeyCoinTypeMsg,
  NewMnemonicKeyMsg,
  NewLedgerKeyMsg,
  NewPrivateKeyKeyMsg,
  AppendLedgerKeyAppMsg,
  LockKeyRingMsg,
  UnlockKeyRingMsg,
  SelectKeyRingMsg,
  ChangeKeyRingNameMsg,
  DeleteKeyRingMsg,
  ShowSensitiveKeyRingDataMsg,
  ChangeUserPasswordMsg,
  ChangeKeyRingNameInteractiveMsg,
  ExportKeyRingDataMsg,
  CheckLegacyKeyRingPasswordMsg,
  NewKeystoneKeyMsg,
  CheckPasswordMsg,
  GetLegacyKeyRingInfosMsg,
  ShowSensitiveLegacyKeyRingDataMsg,
  ExportKeyRingVaultsMsg,
  SearchKeyRingsMsg,
  SimulateSignTronMsg
} from './messages';
import { ROUTE } from './constants';
import { getHandler } from './handler';

export function init(router: Router, service: KeyRingService): void {
  router.registerMessage(GetIsLockedMsg);
  router.registerMessage(GetKeyRingStatusMsg);
  router.registerMessage(GetKeyRingStatusOnlyMsg);
  router.registerMessage(SelectKeyRingMsg);
  router.registerMessage(FinalizeKeyCoinTypeMsg);
  router.registerMessage(NewMnemonicKeyMsg);
  router.registerMessage(NewLedgerKeyMsg);
  router.registerMessage(NewKeystoneKeyMsg);
  router.registerMessage(NewPrivateKeyKeyMsg);
  router.registerMessage(AppendLedgerKeyAppMsg);
  router.registerMessage(LockKeyRingMsg);
  router.registerMessage(UnlockKeyRingMsg);
  router.registerMessage(ChangeKeyRingNameMsg);
  router.registerMessage(DeleteKeyRingMsg);
  router.registerMessage(ShowSensitiveKeyRingDataMsg);
  router.registerMessage(ChangeUserPasswordMsg);
  router.registerMessage(ChangeKeyRingNameInteractiveMsg);
  router.registerMessage(ExportKeyRingDataMsg);
  router.registerMessage(CheckLegacyKeyRingPasswordMsg);
  router.registerMessage(CheckPasswordMsg);
  router.registerMessage(GetLegacyKeyRingInfosMsg);
  router.registerMessage(ShowSensitiveLegacyKeyRingDataMsg);
  router.registerMessage(ExportKeyRingVaultsMsg);
  router.registerMessage(SearchKeyRingsMsg);
  router.registerMessage(SimulateSignTronMsg);

  router.addHandler(ROUTE, getHandler(service));
}
