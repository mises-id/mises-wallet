import React, { FunctionComponent } from "react";

import { Button } from "reactstrap";

import { useStore } from "../../stores";

import { observer } from "mobx-react-lite";

import styleStake from "./stake.module.scss";
import classnames from "classnames";
import { Dec } from "@keplr-wallet/unit";

import { FormattedMessage } from "react-intl";

export const StakeView: FunctionComponent = observer(() => {
  const { chainStore, accountStore, queriesStore, analyticsStore } = useStore();
  const accountInfo = accountStore.getAccount(chainStore.current.chainId);
  const queries = queriesStore.get(chainStore.current.chainId);

  const inflation = queries.cosmos.queryInflation;
  const rewards = queries.cosmos.queryRewards.getQueryBech32Address(
    accountInfo.bech32Address
  );
  const stakableReward = rewards.stakableReward;

  const isRewardExist = rewards.rewards.length > 0;

  return (
    <div>
      {isRewardExist ? (
        <React.Fragment>
          <div
            className={classnames(styleStake.containerInner, styleStake.reward)}
          >
            <div className={styleStake.vertical}>
              <p
                className={classnames(
                  "h4",
                  "my-0",
                  "font-weight-normal",
                  styleStake.paragraphSub
                )}
              >
                <FormattedMessage id="main.stake.message.pending-staking-reward" />
              </p>
              <p
                className={classnames(
                  "h2",
                  "my-0",
                  "font-weight-normal",
                  styleStake.paragraphMain
                )}
              >
                {stakableReward.shrink(true).maxDecimals(6).toString()}
                {rewards.isFetching ? (
                  <span>
                    <i className="fas fa-spinner fa-spin" />
                  </span>
                ) : null}
              </p>
            </div>
            <div style={{ flex: 1 }} />
            {
              // <Button
              //   className={styleStake.button}
              //   color="primary"
              //   size="sm"
              //   disabled={!accountInfo.isReadyToSendMsgs}
              //   onClick={withdrawAllRewards}
              //   data-loading={
              //     accountInfo.isSendingMsg === "withdrawRewards" ||
              //     isWithdrawingRewards
              //   }
              // >
              //   <FormattedMessage id="main.stake.button.claim-rewards" />
              // </Button>
            }
          </div>
          <hr className={styleStake.hr} />
        </React.Fragment>
      ) : null}

      <div className={classnames(styleStake.containerInner, styleStake.stake)}>
        <div className={styleStake.vertical}>
          <p
            className={classnames(
              "h2",
              "my-0",
              "font-weight-normal",
              styleStake.paragraphMain
            )}
          >
            <FormattedMessage id="main.stake.message.stake" />
          </p>
          {inflation.inflation.toDec().equals(new Dec(0)) ? null : (
            <p
              className={classnames(
                "h4",
                "my-0",
                "font-weight-normal",
                styleStake.paragraphSub
              )}
            >
              <FormattedMessage
                id="main.stake.message.earning"
                values={{
                  apr: (
                    <React.Fragment>
                      {inflation.inflation.trim(true).maxDecimals(2).toString()}
                      {inflation.isFetching ? (
                        <span>
                          <i className="fas fa-spinner fa-spin" />
                        </span>
                      ) : null}
                    </React.Fragment>
                  ),
                }}
              />
            </p>
          )}
        </div>
        <div style={{ flex: 1 }} />
        <a
          href={chainStore.current.walletUrlForStaking}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            analyticsStore.logEvent("Stake button clicked", {
              chainId: chainStore.current.chainId,
              chainName: chainStore.current.chainName,
            });
          }}
        >
          <Button
            className={styleStake.button}
            color="primary"
            size="sm"
            outline={isRewardExist}
          >
            <FormattedMessage id="main.stake.button.stake" />
          </Button>
        </a>
      </div>
    </div>
  );
});
