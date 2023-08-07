import React, { FunctionComponent } from "react";
import { observer } from "mobx-react-lite";
import { Card, CardHeaderFullButton } from "../../components/card";
import { ViewStyle } from "react-native";
import { useSmartNavigation } from "../../navigation";

export const TransactionListCard: FunctionComponent<{
  containerStyle?: ViewStyle;
}> = observer(({ containerStyle }) => {
  const smartNavigation = useSmartNavigation();

  return (
    <Card style={containerStyle}>
      <CardHeaderFullButton
        title="Transaction"
        onPress={() => {
          smartNavigation.navigateSmart("Transaction.Dashboard", {});
        }}
      />
    </Card>
  );
});
