import React, { FunctionComponent, useEffect } from "react";
import ReactDOM from "react-dom";

import { AppIntlProvider } from "./languages";

import "./styles/global.scss";

import { HashRouter, Route } from "react-router-dom";

import { AccessPage, Secret20ViewingKeyAccessPage } from "./pages/access";
import { RegisterPage } from "./pages/register";
import { MainPage } from "./pages/main";
import { LockPage } from "./pages/lock";
import { SendPage } from "./pages/send";
import { SetKeyRingPage } from "./pages/setting/keyring";

import { Banner } from "./components/banner";

import {
  NotificationProvider,
  NotificationStoreProvider,
} from "./components/notification";
import { ConfirmProvider } from "./components/confirm";
import { LoadingIndicatorProvider } from "./components/loading-indicator";

import { configure } from "mobx";
import { observer } from "mobx-react-lite";

import { StoreProvider, useStore } from "./stores";
import {
  KeyRingStatus,
  StartAutoLockMonitoringMsg,
} from "@keplr-wallet/background";
import { SignPage } from "./pages/sign";
import { ChainSuggestedPage } from "./pages/chain/suggest";
import Modal from "react-modal";
import { SettingPage } from "./pages/setting";
import { SettingLanguagePage } from "./pages/setting/language";
import { SettingFiatPage } from "./pages/setting/fiat";
import {
  SettingConnectionsPage,
  SettingSecret20ViewingKeyConnectionsPage,
} from "./pages/setting/connections";
import { AddressBookPage } from "./pages/setting/address-book";
import { CreditPage } from "./pages/setting/credit";
import { ChangeNamePage } from "./pages/setting/keyring/change";
import { CreateNamePage } from "./pages/setting/keyring/createAccount";
import { ImportAccountPage } from "./pages/setting/keyring/importAccount";
import { ClearPage } from "./pages/setting/clear";
import { ExportPage } from "./pages/setting/export";
import { AddTokenPage } from "./pages/setting/token/add";
import { ManageTokenPage } from "./pages/setting/token/manage";

// import * as BackgroundTxResult from "../../background/tx/foreground";
import { AdditionalIntlMessages, LanguageToFiatCurrency } from "./config.ui";

import manifest from "./manifest.json";
import { Keplr } from "@keplr-wallet/provider";
import { InExtensionMessageRequester } from "@keplr-wallet/router-extension";
import { ExportToMobilePage } from "./pages/setting/export-to-mobile";
import { LogPageViewWrapper } from "./components/analytics";
import { SettingEndpointsPage } from "./pages/setting/endpoints";
import { SettingAutoLockPage } from "./pages/setting/autolock";
import { BACKGROUND_PORT } from "@keplr-wallet/router";
import { TransferPage } from "./pages/transfer";
import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";
// import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
// import { logEvent } from "firebase/analytics";

import IdleTimer from "react-idle-timer";

window.misesWallet = new Keplr(
  manifest.version,
  "core",
  new InExtensionMessageRequester()
);
// Make sure that icon file will be included in bundle
require("./public/assets/logo-256.png");
require("./public/assets/icon/icon-16.png");
require("./public/assets/icon/icon-48.png");
require("./public/assets/icon/icon-128.png");

configure({
  enforceActions: "always", // Make mobx to strict mode.
});

Modal.setAppElement("#app");
Modal.defaultStyles = {
  content: {
    ...Modal.defaultStyles.content,
    minWidth: "300px",
    maxWidth: "600px",
    minHeight: "250px",
    maxHeight: "500px",
    left: "50%",
    right: "auto",
    top: "50%",
    bottom: "auto",
    transform: "translate(-50%, -50%)",
  },
  overlay: {
    zIndex: 1000,
    ...Modal.defaultStyles.overlay,
  },
};

const StateRenderer: FunctionComponent = observer(() => {
  const { keyRingStore } = useStore();

  useEffect(() => {
    // Notify to auto lock service to start activation check whenever the keyring is unlocked.
    if (keyRingStore.status === KeyRingStatus.UNLOCKED) {
      const msg = new StartAutoLockMonitoringMsg();
      const requester = new InExtensionMessageRequester();
      requester.sendMessage(BACKGROUND_PORT, msg);
    }
  }, [keyRingStore.status]);

  if (keyRingStore.status === KeyRingStatus.UNLOCKED) {
    return <MainPage />;
  } else if (keyRingStore.status === KeyRingStatus.LOCKED) {
    return <LockPage />;
  } else if (keyRingStore.status === KeyRingStatus.MIGRATOR) {
    return <LockPage />;
  } else if (keyRingStore.status === KeyRingStatus.EMPTY) {
    return <RegisterPage />;
  } else if (keyRingStore.status === KeyRingStatus.NOTLOADED) {
    return (
      <div style={{ height: "100%" }}>
        <Banner
          icon={require("./public/assets/logo-256.png")}
          logo={require("./public/assets/brand-text.png")}
          // subtitle="Wallet for the Interchain"
        />
      </div>
    );
  } else {
    return <div>Unknown status</div>;
  }
});

const RenderRoutes = () => {
  const routes = (
    <LogPageViewWrapper>
      <Route exact path="/" component={StateRenderer} />
      <Route exact path="/unlock" component={LockPage} />
      <Route exact path="/access" component={AccessPage} />
      <Route
        exact
        path="/access/viewing-key"
        component={Secret20ViewingKeyAccessPage}
      />
      <Route exact path="/register" component={RegisterPage} />
      <Route exact path="/send" component={SendPage} />
      <Route exact path="/setting" component={SettingPage} />
      <Route exact path="/setting/language" component={SettingLanguagePage} />
      <Route exact path="/setting/fiat" component={SettingFiatPage} />
      <Route
        exact
        path="/setting/connections"
        component={SettingConnectionsPage}
      />
      <Route
        exact
        path="/setting/connections/viewing-key/:contractAddress"
        component={SettingSecret20ViewingKeyConnectionsPage}
      />
      <Route exact path="/setting/address-book" component={AddressBookPage} />
      <Route
        exact
        path="/setting/export-to-mobile"
        component={ExportToMobilePage}
      />
      <Route exact path="/setting/credit" component={CreditPage} />
      <Route exact path="/setting/set-keyring" component={SetKeyRingPage} />
      <Route exact path="/setting/export/:index" component={ExportPage} />
      <Route exact path="/setting/clear/:index" component={ClearPage} />
      <Route
        exact
        path="/setting/keyring/change/name/:index"
        component={ChangeNamePage}
      />
      <Route
        exact
        path="/setting/keyring/CreateNamePage"
        component={CreateNamePage}
      />
      <Route
        exact
        path="/setting/keyring/importAccount"
        component={ImportAccountPage}
      />
      <Route exact path="/setting/token/add" component={AddTokenPage} />
      <Route exact path="/setting/token/manage" component={ManageTokenPage} />
      <Route exact path="/setting/endpoints" component={SettingEndpointsPage} />
      <Route exact path="/setting/autolock" component={SettingAutoLockPage} />
      <Route path="/sign" component={SignPage} />
      <Route path="/suggest-chain" component={ChainSuggestedPage} />
      <Route path="/transfer" component={TransferPage} />
    </LogPageViewWrapper>
  );
  const { misesStore } = useStore();

  return (
    <IdleTimer
      onAction={misesStore.setLastActiveTime.bind(misesStore)}
      throttle={1000}
    >
      {routes}
    </IdleTimer>
  );
};
// const firebaseConfig = {
//   apiKey: "AIzaSyA15UjL8TFIHLWUk-S83KeuLRC_D7hvwUU",
//   authDomain: "mises-official-site.firebaseapp.com",
//   projectId: "mises-official-site",
//   storageBucket: "mises-official-site.appspot.com",
//   messagingSenderId: "235777024442",
//   appId: "1:235777024442:web:da94196c84a941fab07d83",
//   measurementId: "G-Y5Y02HDCC8",
// };
// const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);

Sentry.init({
  enabled: process.env.NODE_ENV === "production",
  dsn:
    "https://66dc9e60f6764bf4a127e9f11f702b9f@o1162849.ingest.sentry.io/4504417442791424",
  integrations: [new BrowserTracing()],
  release: manifest.version,
  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,
  beforeSend: (event, hint) => {
    if (hint.originalException) {
      console.log(event, hint.originalException.toString());
      const errorConnection =
        hint.originalException.toString().indexOf("connection reset by peer") >
        -1;
      const failedToFetch =
        hint.originalException.toString().indexOf("Failed to fetch") > -1 ||
        hint.originalException
          .toString()
          .indexOf("Cannot read properties of undefined (reading 'response')") >
          -1;
      const promiseNonError =
        hint.originalException
          .toString()
          .indexOf("Non-Error promise rejection captured with keys: message") >
        -1;
      if (promiseNonError || errorConnection || failedToFetch) {
        // logEvent(analytics, "misesWallet_error", {
        //   error_message: hint.originalException?.toString(),
        // });

        return null;
      }
    }

    return event;
  },
});
ReactDOM.render(
  <StoreProvider>
    <AppIntlProvider
      additionalMessages={AdditionalIntlMessages}
      languageToFiatCurrency={LanguageToFiatCurrency}
    >
      <LoadingIndicatorProvider>
        <NotificationStoreProvider>
          <NotificationProvider>
            <ConfirmProvider>
              <HashRouter>
                <RenderRoutes />
              </HashRouter>
            </ConfirmProvider>
          </NotificationProvider>
        </NotificationStoreProvider>
      </LoadingIndicatorProvider>
    </AppIntlProvider>
  </StoreProvider>,
  document.getElementById("app")
);
