import React, { FunctionComponent, useMemo } from "react";
import { HeaderLayout } from "../../layouts";
import { useHistory } from "react-router";
import { PageButton } from "./page-button";
import style from "./style.module.scss";
// import { useLanguage } from "../../languages";
import { useIntl } from "react-intl";
import { observer } from "mobx-react-lite";
import { useStore } from "../../stores";

export const SettingPage: FunctionComponent = observer(() => {
  // const language = useLanguage();
  const history = useHistory();
  const intl = useIntl();

  // const paragraphFiat = !language.isFiatCurrencyAutomatic
  //   ? language.fiatCurrency.toUpperCase()
  //   : intl.formatMessage(
  //       {
  //         id: "setting.fiat.automatic-with-fiat",
  //       },
  //       {
  //         fiat: language.fiatCurrency.toUpperCase(),
  //       }
  //     );
  const { misesSafeStore } = useStore();
  return (
    <HeaderLayout
      showChainName={false}
      canChangeChainInfo={false}
      alternativeTitle={intl.formatMessage({
        id: "main.menu.settings",
      })}
      onBackButton={() => {
        history.goBack();
      }}
    >
      <div className={style.container}>
        {/* <PageButton
          title={intl.formatMessage({
            id: "setting.language",
          })}
          paragraph={paragraphLang}
          onClick={() => {
            history.push({
              pathname: "/setting/language",
            });
          }}
          icons={useMemo(
            () => [<i key="next" className="fas fa-chevron-right" />],
            []
          )}
        /> */}
        {/* <PageButton
          title={intl.formatMessage({
            id: "setting.fiat",
          })}
          paragraph={paragraphFiat}
          onClick={() => {
            history.push({
              pathname: "/setting/fiat",
            });
          }}
          icons={useMemo(
            () => [<i key="next" className="fas fa-chevron-right" />],
            []
          )}
        /> */}
        <PageButton
          title={intl.formatMessage({
            id: "setting.connections",
          })}
          paragraph={intl.formatMessage({
            id: "setting.connections.paragraph",
          })}
          onClick={() => {
            history.push({
              pathname: "/setting/connections",
            });
          }}
          icons={useMemo(
            () => [<i key="next" className="fas fa-chevron-right" />],
            []
          )}
        />
        <PageButton
          title={intl.formatMessage({
            id: "setting.export",
          })}
          onClick={() => {
            history.push({
              pathname: "/setting/export/-1",
            });
          }}
          icons={useMemo(
            () => [<i key="next" className="fas fa-chevron-right" />],
            []
          )}
        />
        <PageButton
          title={intl.formatMessage({
            id: "setting.autolock",
          })}
          onClick={() => {
            history.push({
              pathname: "/setting/autolock",
            });
          }}
          icons={useMemo(
            () => [<i key="next" className="fas fa-chevron-right" />],
            []
          )}
        />
        <PageButton
          title="Security"
          subParagraph="website & Contract security verification"
          onClick={() => {
            misesSafeStore.setMisesSafeConfig(!misesSafeStore.isShouldVerify);
          }}
          icons={[
            <label
              key="toggle"
              className="custom-toggle"
              style={{ marginBottom: 0 }}
            >
              <input
                type="checkbox"
                checked={misesSafeStore.isShouldVerify}
                onChange={() => {
                  misesSafeStore.setMisesSafeConfig(
                    !misesSafeStore.isShouldVerify
                  );
                }}
              />
              <span className="custom-toggle-slider rounded-circle" />
            </label>,
          ]}
        />
        {/* <PageButton
          title={intl.formatMessage({
            id: "setting.endpoints",
          })}
          paragraph={intl.formatMessage({
            id: "setting.endpoints.paragraph",
          })}
          onClick={() => {
            history.push({
              pathname: "/setting/endpoints",
            });
          }}
          icons={useMemo(
            () => [<i key="next" className="fas fa-chevron-right" />],
            []
          )}
        />
        <PageButton
          title={intl.formatMessage({
            id: "setting.credit",
          })}
          onClick={() => {
            history.push({
              pathname: "/setting/credit",
            });
          }}
          icons={useMemo(
            () => [<i key="next" className="fas fa-chevron-right" />],
            []
          )}
        /> */}
      </div>
    </HeaderLayout>
  );
});
