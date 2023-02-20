import React, { FunctionComponent, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { useStore } from "../../stores";
import { SignModal } from "../../modals/sign";
import { WalletConnectApprovalModal } from "../../modals/wallet-connect-approval";
import { WCMessageRequester } from "../../stores/wallet-connect/msg-requester";
import { WCGoBackToBrowserModal } from "../../modals/wc-go-back-to-browser";
import { BackHandler, Platform } from "react-native";
import { LoadingScreenModal } from "../loading-screen/modal";
import { KeyRingStatus } from "@keplr-wallet/background";

export const InteractionModalsProivder: FunctionComponent = observer(
  ({ children }) => {
    const {
      keyRingStore,
      permissionStore,
      signInteractionStore,
      walletConnectStore,
    } = useStore();

    useEffect(() => {
      if (walletConnectStore.needGoBackToBrowser && Platform.OS === "android") {
        BackHandler.exitApp();
      }
    }, [walletConnectStore.needGoBackToBrowser]);

    useEffect(() => {
      for (const data of permissionStore.waitingDatas) {
        // Currently, there is no modal to permit the permission of external apps.
        // All apps should be embeded explicitly.
        // If such apps needs the permissions, add these origins to the privileged origins.
        if (
          data.data.origins.length !== 1 ||
          !WCMessageRequester.isVirtualSessionURL(data.data.origins[0])
        ) {
          permissionStore.reject(data.id);
        }
      }
    }, [permissionStore, permissionStore.waitingDatas]);

    return (
      <React.Fragment>
        {/*
         When the wallet connect client from the deep link is creating, show the loading indicator.
         The user should be able to type password to unlock or create the account if there is no account.
         So, we shouldn't show the loading indicator if the keyring is not unlocked.
         */}
        {keyRingStore.status === KeyRingStatus.UNLOCKED &&
        walletConnectStore.isPendingClientFromDeepLink ? (
          <LoadingScreenModal
            isOpen={true}
            close={() => {
              // noop
            }}
          />
        ) : null}
        {walletConnectStore.needGoBackToBrowser && Platform.OS === "ios" ? (
          <WCGoBackToBrowserModal
            isOpen={walletConnectStore.needGoBackToBrowser}
            close={() => {
              walletConnectStore.clearNeedGoBackToBrowser();
            }}
          />
        ) : null}
        {/*unlockInteractionExists ? (
          <UnlockModal
            isOpen={true}
            close={() => {
              // noop
              // Can't close without unlocking.
            }}
          />
        ) : null*/}
        {permissionStore.waitingDatas.map((data) => {
          if (data.data.origins.length === 1) {
            if (
              WCMessageRequester.isVirtualSessionURL(data.data.origins[0]) &&
              walletConnectStore.getSession(
                WCMessageRequester.getSessionIdFromVirtualURL(
                  data.data.origins[0]
                )
              )
            ) {
              return (
                <WalletConnectApprovalModal
                  key={data.id}
                  isOpen={true}
                  close={() => permissionStore.reject(data.id)}
                  id={data.id}
                  data={data.data}
                />
              );
            }
          }

          return null;
        })}
        {signInteractionStore.waitingData ? (
          <SignModal
            isOpen={true}
            close={() => signInteractionStore.rejectAll()}
          />
        ) : null}
        {children}
      </React.Fragment>
    );
  }
);
