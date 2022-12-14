import React from "react";
import { Approve } from "./approve-icon.component";
import { Interaction } from "./interaction-icon.component";
import { Receive } from "./receive-icon.component";
import { Send } from "./send-icon.component";
import { Sign } from "./sign-icon.component";

const TRANSACTION_GROUP_CATEGORIES = {
  send: "send",
  receive: "receive",
  interaction: "interaction",
  approval: "approval",
  "signature-request": "signature-request",
  swap: "swap",
};

const ICON_MAP = {
  [TRANSACTION_GROUP_CATEGORIES.approval]: Approve,
  [TRANSACTION_GROUP_CATEGORIES.interaction]: Interaction,
  [TRANSACTION_GROUP_CATEGORIES.send]: Send,
  [TRANSACTION_GROUP_CATEGORIES["signature-request"]]: Sign,
  [TRANSACTION_GROUP_CATEGORIES.receive]: Receive,
};
export type categoryTypes = keyof typeof TRANSACTION_GROUP_CATEGORIES;
export const TransactionIcon = ({ category }: { category: categoryTypes }) => {
  const Icon = ICON_MAP[category];
  return <Icon color="#5e72e4" size={28} />;
};
