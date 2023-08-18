import React, { FunctionComponent, useEffect, useMemo } from "react";
import {
  AddressInput,
  CoinInput,
  FeeButtons,
  MemoInput,
} from "../../components/form";
import { useStore } from "../../stores";

import { HeaderLayout } from "../../layouts";

import { observer } from "mobx-react-lite";

import style from "./style.module.scss";
import { useNotification } from "../../components/notification";

import { useIntl } from "react-intl";
import { Button } from "reactstrap";

import { useHistory, useLocation } from "react-router";
import queryString from "querystring";

import { useGasSimulator, useSendTxConfig } from "@keplr-wallet/hooks";
import {
  closePopupTab,
  fitPopupWindow,
  isMobileStatus,
} from "@keplr-wallet/popup";
import { DenomHelper, ExtensionKVStore } from "@keplr-wallet/common";

export const SendPage: FunctionComponent = observer(() => {
  const history = useHistory();
  let search = useLocation().search;
  if (search.startsWith("?")) {
    search = search.slice(1);
  }
  const query = queryString.parse(search) as {
    defaultDenom: string | undefined;
    defaultRecipient: string | undefined;
    defaultAmount: string | undefined;
    defaultMemo: string | undefined;
    detached: string | undefined;
  };

  useEffect(() => {
    // Scroll to top on page mounted.
    if (window.scrollTo) {
      window.scrollTo(0, 0);
    }
  }, []);

  const intl = useIntl();

  const notification = useNotification();

  const {
    chainStore,
    accountStore,
    queriesStore,
    analyticsStore,
    priceStore,
    uiConfigStore,
  } = useStore();
  const current = chainStore.current;

  const accountInfo = accountStore.getAccount(current.chainId);

  const sendConfigs = useSendTxConfig(
    chainStore,
    queriesStore,
    accountStore,
    current.chainId,
    accountInfo.bech32Address,
    {
      allowHexAddressOnEthermint: !chainStore.current.chainId.startsWith(
        "injective"
      ),
      icns: uiConfigStore.icnsInfo,
      computeTerraClassicTax: true,
    }
  );

  const gasSimulatorKey = useMemo(() => {
    if (sendConfigs.amountConfig.sendCurrency) {
      const denomHelper = new DenomHelper(
        sendConfigs.amountConfig.sendCurrency.coinMinimalDenom
      );

      if (denomHelper.type !== "native") {
        if (denomHelper.type === "cw20") {
          // Probably, the gas can be different per cw20 according to how the contract implemented.
          return `${denomHelper.type}/${denomHelper.contractAddress}`;
        }

        return denomHelper.type;
      }
    }

    return "native";
  }, [sendConfigs.amountConfig.sendCurrency]);

  const gasSimulator = useGasSimulator(
    new ExtensionKVStore("gas-simulator.main.send"),
    chainStore,
    current.chainId,
    sendConfigs.gasConfig,
    sendConfigs.feeConfig,
    gasSimulatorKey,
    () => {
      if (!sendConfigs.amountConfig.sendCurrency) {
        throw new Error("Send currency not set");
      }

      // Prefer not to use the gas config or fee config,
      // because gas simulator can change the gas config and fee config from the result of reaction,
      // and it can make repeated reaction.
      if (
        sendConfigs.amountConfig.error != null ||
        sendConfigs.recipientConfig.error != null
      ) {
        throw new Error("Not ready to simulate tx");
      }

      const denomHelper = new DenomHelper(
        sendConfigs.amountConfig.sendCurrency.coinMinimalDenom
      );
      // I don't know why, but simulation does not work for secret20
      if (denomHelper.type === "secret20") {
        throw new Error("Simulating secret wasm not supported");
      }

      return accountInfo.makeSendTokenTx(
        sendConfigs.amountConfig.amount,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        sendConfigs.amountConfig.sendCurrency!,
        sendConfigs.recipientConfig.recipient
      );
    }
  );

  useEffect(() => {
    // To simulate secretwasm, we need to include the signature in the tx.
    // With the current structure, this approach is not possible.
    if (
      sendConfigs.amountConfig.sendCurrency &&
      new DenomHelper(sendConfigs.amountConfig.sendCurrency.coinMinimalDenom)
        .type === "secret20"
    ) {
      gasSimulator.forceDisable(
        new Error("Simulating secret20 is not supported")
      );
      sendConfigs.gasConfig.setGas(
        accountInfo.secret.msgOpts.send.secret20.gas
      );
    } else {
      gasSimulator.forceDisable(false);
      gasSimulator.setEnabled(true);
    }
  }, [
    accountInfo.secret.msgOpts.send.secret20.gas,
    gasSimulator,
    sendConfigs.amountConfig.sendCurrency,
    sendConfigs.gasConfig,
  ]);

  useEffect(() => {
    if (
      sendConfigs.feeConfig.chainInfo.features &&
      sendConfigs.feeConfig.chainInfo.features.includes("terra-classic-fee")
    ) {
      // When considering stability tax for terra classic.
      // Simulation itself doesn't consider the stability tax send.
      // Thus, it always returns fairly lower gas.
      // To adjust this, for terra classic, increase the default gas adjustment
      gasSimulator.setGasAdjustment(1.6);
    }
  }, [gasSimulator, sendConfigs.feeConfig.chainInfo]);

  useEffect(() => {
    if (query.defaultDenom) {
      const currency = current.currencies.find(
        (cur) => cur.coinMinimalDenom === query.defaultDenom
      );

      if (currency) {
        sendConfigs.amountConfig.setSendCurrency(currency);
      }
    }
  }, [current.currencies, query.defaultDenom, sendConfigs.amountConfig]);

  const isDetachedPage = query.detached === "true";

  useEffect(() => {
    if (isDetachedPage) {
      fitPopupWindow();
    }
  }, [isDetachedPage]);

  useEffect(() => {
    if (query.defaultRecipient) {
      sendConfigs.recipientConfig.setRawRecipient(query.defaultRecipient);
    }
    if (query.defaultAmount) {
      sendConfigs.amountConfig.setAmount(query.defaultAmount);
    }
    if (query.defaultMemo) {
      sendConfigs.memoConfig.setMemo(query.defaultMemo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.defaultAmount, query.defaultMemo, query.defaultRecipient]);

  const sendConfigError =
    sendConfigs.recipientConfig.error ??
    sendConfigs.amountConfig.error ??
    sendConfigs.memoConfig.error ??
    sendConfigs.gasConfig.error ??
    sendConfigs.feeConfig.error;
  const txStateIsValid = sendConfigError == null;

  return (
    <HeaderLayout
      showChainName
      canChangeChainInfo={false}
      style={{ height: "auto", minHeight: "100%" }}
      onBackButton={
        isDetachedPage
          ? undefined
          : () => {
              history.goBack();
            }
      }
    >
      <form
        className={style.formContainer}
        onSubmit={async (e) => {
          e.preventDefault();

          if (accountInfo.isReadyToSendMsgs && txStateIsValid) {
            try {
              const stdFee = sendConfigs.feeConfig.toStdFee();
              const tx = accountInfo.makeSendTokenTx(
                sendConfigs.amountConfig.amount,
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                sendConfigs.amountConfig.sendCurrency!,
                sendConfigs.recipientConfig.recipient
              );

              await tx.send(
                stdFee,
                sendConfigs.memoConfig.memo,
                {
                  preferNoSetFee: true,
                  preferNoSetMemo: true,
                },
                {
                  onBroadcasted: () => {
                    analyticsStore.logEvent("Send token tx broadcasted", {
                      chainId: chainStore.current.chainId,
                      chainName: chainStore.current.chainName,
                      feeType: sendConfigs.feeConfig.feeType,
                    });
                  },
                }
              );

              if (!isDetachedPage) {
                history.replace("/");
              }
            } catch (e: any) {
              if (!isDetachedPage) {
                history.replace("/");
              }
              notification.push({
                type: "warning",
                placement: "top-center",
                duration: 5,
                content: `Fail to send token: ${e.message}`,
                canDelete: true,
                transition: {
                  duration: 0.25,
                },
              });
            } finally {
              // XXX: If the page is in detached state,
              // close the window without waiting for tx to commit. analytics won't work.
              if (isDetachedPage) {
                isMobileStatus() ? closePopupTab() : window.close();
              }
            }
          }
        }}
      >
        <div className={style.formInnerContainer}>
          <div>
            <AddressInput
              recipientConfig={sendConfigs.recipientConfig}
              memoConfig={sendConfigs.memoConfig}
              label={intl.formatMessage({ id: "send.input.recipient" })}
            />
            <CoinInput
              amountConfig={sendConfigs.amountConfig}
              label={intl.formatMessage({ id: "send.input.amount" })}
              balanceText={intl.formatMessage({
                id: "send.input-button.balance",
              })}
              disableAllBalance={(() => {
                if (
                  // In the case of terra classic, tax is applied in proportion to the amount.
                  // However, in this case, the tax itself changes the fee,
                  // so if you use the max function, it will fall into infinite repetition.
                  // We currently disable if chain is terra classic because we can't handle it properly.
                  sendConfigs.feeConfig.chainInfo.features &&
                  sendConfigs.feeConfig.chainInfo.features.includes(
                    "terra-classic-fee"
                  )
                ) {
                  return true;
                }
                return false;
              })()}
              overrideSelectableCurrencies={(() => {
                if (
                  chainStore.current.features &&
                  chainStore.current.features.includes("terra-classic-fee")
                ) {
                  // At present, can't handle stability tax well if it is not registered native token.
                  // So, for terra classic, disable other tokens.
                  const currencies =
                    sendConfigs.amountConfig.sendableCurrencies;
                  return currencies.filter((cur) => {
                    const denom = new DenomHelper(cur.coinMinimalDenom);
                    if (
                      denom.type !== "native" ||
                      denom.denom.startsWith("ibc/")
                    ) {
                      return false;
                    }

                    return true;
                  });
                }

                return undefined;
              })()}
            />
            <MemoInput
              memoConfig={sendConfigs.memoConfig}
              label={intl.formatMessage({ id: "send.input.memo" })}
            />
            <FeeButtons
              feeConfig={sendConfigs.feeConfig}
              gasConfig={sendConfigs.gasConfig}
              priceStore={priceStore}
              label={intl.formatMessage({ id: "send.input.fee" })}
              feeSelectLabels={{
                low: intl.formatMessage({ id: "fee-buttons.select.low" }),
                average: intl.formatMessage({
                  id: "fee-buttons.select.average",
                }),
                high: intl.formatMessage({ id: "fee-buttons.select.high" }),
              }}
              gasLabel={intl.formatMessage({ id: "send.input.gas" })}
              gasSimulator={gasSimulator}
            />
          </div>
          <div style={{ flex: 1 }} />
          <Button
            type="submit"
            color="primary"
            block
            data-loading={accountInfo.txTypeInProgress === "send"}
            disabled={!accountInfo.isReadyToSendTx || !txStateIsValid}
            style={{
              marginTop: "12px",
            }}
          >
            {intl.formatMessage({
              id: "send.button.send",
            })}
          </Button>
        </div>
      </form>
    </HeaderLayout>
  );
});
