// Shim ------------
require("setimmediate");
// Shim ------------

// Make sure that icon file will be included in bundle
require("./public/assets/orai_wallet_logo.png");
require("./public/assets/icon/icon-16.png");
require("./public/assets/icon/icon-48.png");
require("./public/assets/icon/icon-128.png");
require("./public/assets/logo-beta-256.png");
require("./public/assets/img/locked-keplr-logo-128.png");
require("./public/assets/icon-click-cursor.png");

import React, {
  FunctionComponent,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactDOM from "react-dom";
import { HashRouter, Route, Routes, useLocation } from "react-router-dom";
import { StoreProvider, useStore } from "./stores";
import {
  GlobalPopupStyle,
  GlobalSidePanelStyle,
  GlobalStyle,
  ScrollBarStyle,
} from "./styles";
import { configure } from "mobx";
import { observer } from "mobx-react-lite";
import { OWallet } from "@owallet/provider";
import { InExtensionMessageRequester } from "@owallet/router-extension";
import manifest from "./manifest.json";
import { WalletStatus } from "@owallet/stores";
import { UnlockPage } from "./pages/unlock";
import { MainPage } from "./pages/main";
import { SettingPage } from "./pages/setting";
import { SettingGeneralPage } from "./pages/setting/general";
import { SettingGeneralFiatPage } from "./pages/setting/general/fiat";
import { SettingGeneralThemePage } from "./pages/setting/general/theme";
import { SettingGeneralAuthZPage } from "./pages/setting/general/authz";
import { SettingGeneralAuthZRevokePage } from "./pages/setting/general/authz/revoke";
import { SettingGeneralDeleteSuggestChainPage } from "./pages/setting/general/delete-suggest-chain";
import { SettingAdvancedPage } from "./pages/setting/advanced";
import { SettingSecurityPage } from "./pages/setting/security";
import { ActivitiesPage } from "./pages/activities";
import { SettingSecurityPermissionPage } from "./pages/setting/security/permission";
import { PermissionPage } from "./pages/permission";
import { SignCosmosADR36Page, SignCosmosTxPage } from "./pages/sign/cosmos";
import { SettingTokenListPage } from "./pages/setting/token/manage";
import { SettingTokenAddPage } from "./pages/setting/token/add";
import { SettingGeneralLanguagePage } from "./pages/setting/general/language";
import { SettingAdvancedEndpointPage } from "./pages/setting/advanced/endpoint";
import { SettingGeneralLinkKeplrMobilePage } from "./pages/setting/general/link-keplr-mobile";
import { SettingContactsList } from "./pages/setting/contacts/list";
import { SettingContactsAdd } from "./pages/setting/contacts/add";
import { SendAmountPage } from "./pages/send/amount";
import { SendSelectAssetPage } from "./pages/send/select-asset";
import {
  WalletChangeNamePage,
  WalletDeletePage,
  WalletSelectPage,
  WalletShowSensitivePage,
} from "./pages/wallet";
import { SuggestChainPage } from "./pages/suggest-chain";
import { ModalRootProvider } from "./components/modal";
import { ConfirmProvider } from "./hooks/confirm";
import { ErrorBoundary } from "./error-boundary";
import { NotificationProvider } from "./hooks/notification";
import { SettingSecurityChangePasswordPage } from "./pages/setting/security/change-password";
import { AppIntlProvider } from "./languages";
import { SettingSecurityAutoLockPage } from "./pages/setting/security/auto-lock";
import { useLoadFonts } from "./use-load-fonts";
import { useAutoLockMonitoring } from "./use-auto-lock-monitoring";
import { Splash } from "./components/splash";
import { IBCTransferPage } from "./pages/ibc-transfer";
import { SignCosmosICNSPage } from "./pages/sign/cosmos/icns";
import { useMatchPopupSize } from "./popup-size";
import { SignEthereumTxPage } from "./pages/sign/ethereum";
import "simplebar-react/dist/simplebar.min.css";
import { AppThemeProvider } from "./theme";
import { useTheme } from "styled-components";
import { PageChangeScrollTop } from "./use-page-change-scroll-top";
import { isRunningInSidePanel } from "./helpers/side-panel";
import { useIntl } from "react-intl";
import {
  BottomTabActivityIcon,
  BottomTabHomeIcon,
  BottomTabSettingIcon,
  BottomTabsRouteProvider,
  BottomTabSwapIcon,
} from "./bottom-tabs";

configure({
  enforceActions: "always", // Make mobx to strict mode.
});

//@ts-ignore
window.owallet = new OWallet(
  manifest.version,
  "core",
  new InExtensionMessageRequester()
);

const RoutesAfterReady: FunctionComponent = observer(() => {
  const {
    chainStore,
    accountStore,
    keyRingStore,
    tokenFactoryRegistrar,
    erc20CurrencyRegistrar,
    ibcCurrencyRegistrar,
    lsmCurrencyRegistrar,
    ibcChannelStore,
    priceStore,
    price24HChangesStore,
    interactionStore,
    uiConfigStore,
  } = useStore();

  const { isLoaded: isFontLoaded } = useLoadFonts();

  useAutoLockMonitoring();

  const openRegisterOnce = useRef(false);
  const initAccountsOnce = useRef(false);

  const _isReady: boolean = useMemo(() => {
    if (keyRingStore.status === "not-loaded") {
      return false;
    }

    if (keyRingStore.status === "empty") {
      if (!openRegisterOnce.current) {
        openRegisterOnce.current = true;
        browser.tabs
          .create({
            url: "/register.html#",
          })
          .then(() => {
            window.close();
          });
      }

      return false;
    }

    if (!isFontLoaded) {
      return false;
    }

    if (chainStore.isInitializing) {
      return false;
    }

    if (keyRingStore.status === "unlocked") {
      if (!initAccountsOnce.current) {
        initAccountsOnce.current = true;
        // XXX: Below logic not observe state changes on account store and it's inner state.
        //      This is intended because this logic is only for the first time and avoid global re-rendering.
        // Start init for registered chains so that users can see account address more quickly.

        // old
        for (const modularChainInfo of chainStore.modularChainInfos) {
          const account = accountStore.getAccount(modularChainInfo.chainId);
          // Because {autoInit: true} is given as the option on account store,
          // initialization for the account starts at this time just by using getAccount().
          // However, run safe check on current status and init if status is not inited.
          if (account.walletStatus === WalletStatus.NotInit) {
            account.init();
          }
        }

        // for (const chainInfo of chainStore.chainInfos) {
        //   const account = accountStore.getAccount(chainInfo.chainId);
        //   // Because {autoInit: true} is given as the option on account store,
        //   // initialization for the account starts at this time just by using getAccount().
        //   // However, run safe check on current status and init if status is not inited.
        //   if (account.walletStatus === WalletStatus.NotInit) {
        //     account.init();
        //   }
        // }
      }
    }

    if (!tokenFactoryRegistrar.isInitialized) {
      return false;
    }

    if (!ibcCurrencyRegistrar.isInitialized) {
      return false;
    }

    if (!lsmCurrencyRegistrar.isInitialized) {
      return false;
    }

    if (!priceStore.isInitialized) {
      return false;
    }

    if (!price24HChangesStore.isInitialized) {
      return false;
    }

    if (!uiConfigStore.isInitialized) {
      return false;
    }

    if (uiConfigStore.isDeveloper) {
      if (!ibcChannelStore.isInitialized) {
        return false;
      }
    }

    if (!interactionStore.isInitialized) {
      return false;
    }

    if (!erc20CurrencyRegistrar.isInitialized) {
      return false;
    }

    return true;
  }, [
    keyRingStore.status,
    isFontLoaded,
    chainStore.isInitializing,
    chainStore.chainInfos,
    tokenFactoryRegistrar.isInitialized,
    erc20CurrencyRegistrar.isInitialized,
    ibcCurrencyRegistrar.isInitialized,
    lsmCurrencyRegistrar.isInitialized,
    priceStore.isInitialized,
    price24HChangesStore.isInitialized,
    uiConfigStore.isInitialized,
    uiConfigStore.isDeveloper,
    interactionStore.isInitialized,
    accountStore,
    ibcChannelStore.isInitialized,
  ]);

  const checkIsStartFromInteractionWithSidePanelEnabledOnce = useRef(false);
  const hasBeenReady = useRef(false);

  const isReady: boolean = (() => {
    if (hasBeenReady.current) {
      return true;
    }

    if (!_isReady) {
      return false;
    }

    if (!checkIsStartFromInteractionWithSidePanelEnabledOnce.current) {
      checkIsStartFromInteractionWithSidePanelEnabledOnce.current = true;

      if (isRunningInSidePanel() && interactionStore.data.length !== 0) {
        window.isStartFromInteractionWithSidePanelEnabled = true;
      }
    }

    if (keyRingStore.status === "unlocked") {
      const firstAccount = accountStore.getAccount(
        chainStore.chainInfos[0].chainId
      );
      if (
        firstAccount.walletStatus === WalletStatus.NotInit ||
        firstAccount.walletStatus === WalletStatus.Loading
      ) {
        return false;
      }
    }

    hasBeenReady.current = true;
    return true;
  })();

  const shouldUnlockPage = keyRingStore.status === "locked";

  const [mainPageIsNotReady, setMainPageIsNotReady] = useState(false);

  const intl = useIntl();

  // Enable new EVM chains by default for a specific version.
  useEffect(() => {
    const newEVMChainsEnabledLocalStorageKey = "new-evm-chain-enabled";
    const newEVMChainsEnabled = localStorage.getItem(
      newEVMChainsEnabledLocalStorageKey
    );
    if (
      isReady &&
      newEVMChainsEnabled !== "true" &&
      uiConfigStore.changelogConfig.showingInfo.some(
        (info) => info.version === "0.12.115"
      )
    ) {
      for (const keyInfo of keyRingStore.keyInfos) {
        chainStore.enableChainInfoInUIWithVaultId(
          keyInfo.id,
          ...chainStore.chainInfos
            .filter((chainInfo) => chainInfo.chainId.startsWith("eip155:"))
            .map((chainInfo) => chainInfo.chainId)
        );
      }
      localStorage.setItem(newEVMChainsEnabledLocalStorageKey, "true");
    }
  }, [
    chainStore,
    isReady,
    keyRingStore.keyInfos,
    uiConfigStore.changelogConfig.showingInfo,
    uiConfigStore.newChainSuggestionConfig.newSuggestionChains,
  ]);

  return (
    <HashRouter>
      <BottomTabsRouteProvider
        isNotReady={!isReady || mainPageIsNotReady}
        forceHideBottomTabs={shouldUnlockPage}
        tabs={[
          {
            pathname: "/",
            icon: <BottomTabHomeIcon width="1.75rem" height="1.75rem" />,
            text: intl.formatMessage({
              id: "bottom-tabs.home",
            }),
          },
          // {
          //   pathname: "/ibc-swap",
          //   icon: <BottomTabSwapIcon width="1.75rem" height="1.75rem" />,
          //   text: intl.formatMessage({
          //     id: "bottom-tabs.swap",
          //   }),
          // },
          {
            pathname: "/activities",
            icon: <BottomTabActivityIcon width="1.75rem" height="1.75rem" />,
            text: intl.formatMessage({
              id: "bottom-tabs.activity",
            }),
          },
          {
            pathname: "/setting",
            icon: <BottomTabSettingIcon width="1.75rem" height="1.75rem" />,
            text: intl.formatMessage({
              id: "bottom-tabs.settings",
            }),
          },
        ]}
      >
        <PageChangeScrollTop />
        {isReady ? (
          shouldUnlockPage ? (
            <UnlockPage />
          ) : (
            <Routes>
              <Route path="/unlock" element={<UnlockPage />} />
              <Route
                path="/"
                element={<MainPage setIsNotReady={setMainPageIsNotReady} />}
              />
              <Route path="/send" element={<SendAmountPage />} />
              <Route
                path="/send/select-asset"
                element={<SendSelectAssetPage />}
              />

              <Route path="/activities" element={<ActivitiesPage />} />
              <Route path="/setting" element={<SettingPage />} />
              <Route path="/setting/general" element={<SettingGeneralPage />} />
              <Route
                path="/setting/general/language"
                element={<SettingGeneralLanguagePage />}
              />
              <Route
                path="/setting/general/fiat"
                element={<SettingGeneralFiatPage />}
              />
              <Route
                path="/setting/general/theme"
                element={<SettingGeneralThemePage />}
              />
              <Route
                path="/setting/general/authz"
                element={<SettingGeneralAuthZPage />}
              />
              <Route
                path="/setting/general/authz/revoke"
                element={<SettingGeneralAuthZRevokePage />}
              />
              <Route
                path="/setting/general/link-keplr-mobile"
                element={<SettingGeneralLinkKeplrMobilePage />}
              />
              <Route
                path="setting/general/delete-suggest-chain"
                element={<SettingGeneralDeleteSuggestChainPage />}
              />
              <Route
                path="/setting/advanced"
                element={<SettingAdvancedPage />}
              />
              <Route
                path="/setting/advanced/endpoint"
                element={<SettingAdvancedEndpointPage />}
              />
              <Route
                path="/setting/security"
                element={<SettingSecurityPage />}
              />
              <Route
                path="/setting/security/permission"
                element={<SettingSecurityPermissionPage />}
              />
              <Route
                path="/setting/security/auto-lock"
                element={<SettingSecurityAutoLockPage />}
              />
              <Route
                path="/setting/security/change-password"
                element={<SettingSecurityChangePasswordPage />}
              />
              <Route
                path="/setting/token/list"
                element={<SettingTokenListPage />}
              />
              <Route
                path="/setting/token/add"
                element={<SettingTokenAddPage />}
              />
              <Route
                path="/setting/contacts/list"
                element={<SettingContactsList />}
              />
              <Route
                path="/setting/contacts/add"
                element={<SettingContactsAdd />}
              />
              <Route path="/permission" element={<PermissionPage />} />
              <Route path="/sign-cosmos" element={<SignCosmosTxPage />} />
              <Route
                path="/sign-cosmos-adr36"
                element={<SignCosmosADR36Page />}
              />
              <Route
                path="/sign-cosmos-icns"
                element={<SignCosmosICNSPage />}
              />
              <Route path="/sign-ethereum" element={<SignEthereumTxPage />} />

              <Route path="/wallet/select" element={<WalletSelectPage />} />
              <Route path="/wallet/delete" element={<WalletDeletePage />} />
              <Route
                path="/wallet/change-name"
                element={<WalletChangeNamePage />}
              />
              <Route
                path="/wallet/show-sensitive"
                element={<WalletShowSensitivePage />}
              />
              <Route path="/suggest-chain" element={<SuggestChainPage />} />
              <Route path="/ibc-transfer" element={<IBCTransferPage />} />
            </Routes>
          )
        ) : (
          <Splash />
        )}
        <LightModeBackground
          isReady={isReady}
          shouldUnlockPage={shouldUnlockPage}
        />
      </BottomTabsRouteProvider>
    </HashRouter>
  );
});

const LightModeBackground: FunctionComponent<{
  isReady: boolean;
  shouldUnlockPage: boolean;
}> = ({ isReady, shouldUnlockPage }) => {
  const theme = useTheme();
  const location = useLocation();

  useLayoutEffect(() => {
    if (isReady && !shouldUnlockPage) {
      if (
        location.pathname === "/setting" ||
        location.pathname.startsWith("/setting/") ||
        location.pathname === "/send" ||
        location.pathname.startsWith("/send/")
      ) {
        document.documentElement.setAttribute("data-white-background", "true");
        document.body.setAttribute("data-white-background", "true");

        return () => {
          document.documentElement.removeAttribute("data-white-background");
          document.body.removeAttribute("data-white-background");
        };
      }
    }
  }, [location.pathname, theme, isReady, shouldUnlockPage]);

  return null;
};

const App: FunctionComponent = () => {
  useMatchPopupSize();

  return (
    <StoreProvider>
      <AppThemeProvider>
        <AppIntlProvider>
          <ModalRootProvider>
            <ConfirmProvider>
              <NotificationProvider>
                <GlobalStyle />
                {isRunningInSidePanel() ? (
                  <GlobalSidePanelStyle />
                ) : (
                  <GlobalPopupStyle />
                )}
                <ScrollBarStyle />
                <ErrorBoundary>
                  <RoutesAfterReady />
                </ErrorBoundary>
              </NotificationProvider>
            </ConfirmProvider>
          </ModalRootProvider>
        </AppIntlProvider>
      </AppThemeProvider>
    </StoreProvider>
  );
};

ReactDOM.render(<App />, document.getElementById("app"));
