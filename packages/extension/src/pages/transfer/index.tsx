import React, {
  FunctionComponent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { HeaderLayout } from "../../layouts";
import { useHistory } from "react-router";
import { useIntl } from "react-intl";
import { observer } from "mobx-react-lite";
import { useStore } from "../../stores";
import { IndexTx } from "@keplr-wallet/background/src/mises";
import style from "./style.module.scss";
import { shortenAddress } from "@keplr-wallet/background/src/mises/mises-network.util";
import { categoryTypes, TransactionIcon } from "./icon/transaction-icon";
import { QueryClient } from "react-query";
import { fetchConfig } from "@keplr-wallet/background";

export const TransferPage: FunctionComponent = observer(() => {
  const history = useHistory();
  const intl = useIntl();

  const { misesStore } = useStore();

  const [transtions, settranstions] = useState<IndexTx[]>([]);

  const [loadingStatus, setloadingStatus] = useState<
    "default" | "loading" | "error" | "success"
  >("default");

  useEffect(() => {
    misesStore.activeUser().then((res) => {
      settranstions(res.transtions);
    });

    setloadingStatus("loading");
    const query = new QueryClient();
    query
      .fetchQuery(
        "recentTransactions",
        () => misesStore.recentTransactions(),
        fetchConfig
      )
      .then((res) => {
        settranstions([...res]);
        setloadingStatus("success");
      })
      .catch(() => {
        setloadingStatus("error");
      })
      .finally(() => {
        setTimeout(() => {
          setloadingStatus("default");
        }, 1500);
      });
  }, []);

  const Transtion = (props: IndexTx) => {
    return (
      <div className={style.transtionItem}>
        <div>
          <TransactionIcon category={props.category as categoryTypes} />
        </div>
        <div className={style.transtionContent}>
          <p className={style.category}>{props.title || props.category}</p>
          <p className={style.itemDesc}>
            <span className={style.height}>{props.date}</span>
            <span>Form: {shortenAddress(props.senderAddress)}</span>
          </p>
        </div>
        <div className={style.primaryCurrency}>{props.primaryCurrency}</div>
      </div>
    );
  };

  const getLoadingStatusText = useCallback(() => {
    switch (loadingStatus) {
      case "success":
        return "Success";
      case "default":
        return "default";
      case "loading":
        return "Refresh Data...";
      case "error":
        return "Error";
    }
  }, [loadingStatus]);

  const LoadingStatus = () => {
    return loadingStatus === "default" ? null : (
      <div className={style.loadingStatus}>{getLoadingStatusText()}</div>
    );
  };

  return (
    <HeaderLayout
      showChainName={false}
      canChangeChainInfo={false}
      alternativeTitle={intl.formatMessage({
        id: "transfer.title",
      })}
      innerStyle={{ overflowY: "auto" }}
      onBackButton={() => {
        history.goBack();
      }}
    >
      <LoadingStatus />

      {transtions.map((val, index) => (
        <Transtion {...val} key={index} />
      ))}
    </HeaderLayout>
  );
});
