import Transport from "@ledgerhq/hw-transport";
import { CosmosApp, getAppInfo } from "@owallet/ledger-cosmos";
import TransportBLE from "@ledgerhq/react-native-hw-transport-ble";
import { AsyncKVStore } from "../../common";

export const getLastUsedLedgerDeviceId = async (): Promise<
  string | undefined
> => {
  const kvStore = new AsyncKVStore("__owallet_ledger_nano_x");
  return await kvStore.get<string>("last_device_id");
};

// export const setLastUsedLedgerDeviceId = async (
//   deviceId: string
// ): Promise<void> => {
//   const kvStore = new AsyncKVStore("__owallet_ledger_nano_x");
//   await kvStore.set<string>("last_device_id", deviceId);
// };

export const LedgerUtils = {
  tryAppOpen: async (transport: Transport, app: string): Promise<Transport> => {
    let isAppOpened = false;
    try {
      const appInfo = await getAppInfo(transport);
      if (appInfo.error_message === "No errors" && appInfo.app_name === app) {
        isAppOpened = true;
      }
    } catch (e) {
      // Ignore error
      console.log(e);
    }

    try {
      if (!isAppOpened) {
        await CosmosApp.openApp(transport, app);

        const maxRetry = 25;
        let i = 0;
        while (i < maxRetry) {
          // Reinstantiate the app with the new transport.
          // This is needed because the connection can be closed if app opened. (Maybe ledger's permission system handles dashboard, and each app differently.)
          if (transport instanceof TransportBLE) {
            transport = await TransportBLE.open(transport.id);
          }

          const appInfo = await getAppInfo(transport);
          if (
            appInfo.error_message === "No errors" &&
            appInfo.app_name === app
          ) {
            break;
          }

          i++;
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }
    } catch {
      // Ignore error
    }

    return transport;
  },
};
