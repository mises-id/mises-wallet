import React, { FunctionComponent } from "react";

import styleWelcome from "./welcome.module.scss";
import { Button } from "reactstrap";

import { useIntl } from "react-intl";
import { useStore } from "../../stores";
import { closePopupTab, isMobileStatus } from "@keplr-wallet/popup";

export const WelcomePage: FunctionComponent = () => {
  const intl = useIntl();

  const { keyRingStore } = useStore();

  return (
    <div style={{ padding: "20px" }}>
      <div className={styleWelcome.title}>
        {intl.formatMessage({
          id: "register.welcome.title",
        })}
      </div>
      <div className={styleWelcome.content}>
        {intl.formatMessage({
          id: "register.welcome.content",
        })}
      </div>
      <Button
        color="primary"
        type="submit"
        size="lg"
        onClick={async () => {
          keyRingStore.changeKeyRing(keyRingStore.multiKeyStoreInfo.length - 1);

          if (typeof browser !== "undefined") {
            const tab = await browser.tabs.getCurrent();
            if (tab.id) {
              browser.tabs.remove(tab.id);
            } else {
              isMobileStatus() ? closePopupTab() : window.close();
            }
          } else {
            window.close();
          }
        }}
        block
        style={{
          marginTop: "60px",
        }}
      >
        {intl.formatMessage({
          id: "register.welcome.button.done",
        })}
      </Button>
    </div>
  );
};
