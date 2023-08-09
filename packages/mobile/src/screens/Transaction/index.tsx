import React, { FunctionComponent, useEffect, useMemo, useState } from "react";
import { PageWithScrollView } from "../../components/page";
import { Text, View } from "react-native";
import { useStyle } from "../../styles";
import { useStore } from "../../stores";
import { IndexTx, shortenAddress } from "@keplr-wallet/background";
import { ReceiveSymbol } from "../../components/transaction/receive-icon";
import { SendSymbol } from "../../components/transaction/send-icon";
import { InteractionSymbol } from "../../components/transaction/interaction-icon";

export const TransactionDashboardScreen: FunctionComponent = () => {
  const style = useStyle();
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
    // const query = new QueryClient();
    misesStore
      .recentTransactions()
      .then(async (list: any) => {
        const userinfo = await misesStore.activeUser();
        settranstions([...list, ...userinfo.transtions]);
        setloadingStatus("success");

        misesStore.saveTranstions([...list, ...userinfo.transtions]);
      })
      .catch((error: any) => {
        console.log(error);
        setloadingStatus("error");
      })
      .finally(() => {
        setTimeout(() => {
          setloadingStatus("default");
        }, 1500);
      });
    // eslint-disable-next-line
  }, []);

  const getLoadingStatusText = useMemo(() => {
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
    return loadingStatus === "default" ? (
      <Text />
    ) : (
      <View
        style={style.flatten([
          "flex-row",
          "justify-center",
          "items-center",
          "padding-10",
        ])}
      >
        <Text>{getLoadingStatusText}</Text>
      </View>
    );
  };

  const TranstionIcon = ({
    category,
    size,
  }: {
    category: string;
    size: number;
  }) => {
    if (category === "receive") {
      return (
        <ReceiveSymbol size={size} color={style.get("color-blue-400").color} />
      );
    }
    if (category === "send") {
      return (
        <SendSymbol size={size} color={style.get("color-blue-400").color} />
      );
    }
    return (
      <InteractionSymbol
        size={size}
        color={style.get("color-blue-400").color}
      />
    );
  };

  const Transtion = (props: IndexTx) => {
    const misesIn = props.transactionGroupType === "misesIn";
    return (
      <View
        style={style.flatten([
          "flex-row",
          "items-center",
          "justify-between",
          "margin-bottom-8",
          "background-color-white",
          "padding-x-10",
          "padding-y-14",
        ])}
      >
        <View
          style={style.flatten(["flex-row", "items-center", "justify-between"])}
        >
          {/* <StakedTokenSymbol size={44} /> */}
          <TranstionIcon size={44} category={props.category} />
          <View style={style.flatten(["margin-left-12"])}>
            <Text style={style.flatten(["h5", "color-text-high"])}>
              {props.title || props.category}
            </Text>
            <Text
              style={style.flatten([
                "subtitle3",
                "color-text-low",
                "dark:color-platinum-200",
                "margin-bottom-4",
                "margin-top-6",
              ])}
            >
              {props.date}·{misesIn ? "From" : "To"} :{" "}
              {shortenAddress(
                misesIn ? props.senderAddress : props.recipientAddress
              )}
            </Text>
          </View>
        </View>
        {/* <View style={style.flatten(["flex-1"])} /> */}
        <Text>{props.primaryCurrency}</Text>
      </View>
    );
  };

  return (
    <PageWithScrollView backgroundMode="gradient">
      <LoadingStatus />
      {transtions.map((val, index) => (
        <Transtion {...val} key={index} />
      ))}
      <View style={style.get("height-16")} />
    </PageWithScrollView>
  );
};
