import React, { FunctionComponent, useEffect, useRef, useState } from "react";

import { PasswordInput } from "../../components/form";

import { Button, Form } from "reactstrap";

import { observer } from "mobx-react-lite";
import { useStore } from "../../stores";
import { Banner } from "../../components/banner";
import useForm from "react-hook-form";

import { EmptyLayout } from "../../layouts/empty-layout";

import style from "./style.module.scss";

import { FormattedMessage, useIntl } from "react-intl";
import { useInteractionInfo } from "@keplr-wallet/hooks";
import { useHistory } from "react-router";
import delay from "delay";
import {
  KeyRingStatus,
  StartAutoLockMonitoringMsg,
} from "@keplr-wallet/background";
import { InExtensionMessageRequester } from "@keplr-wallet/router-extension";
import { BACKGROUND_PORT } from "@keplr-wallet/router";

import { ModalBody, Modal } from "reactstrap";
import { closePopupTab, isMobileStatus } from "@keplr-wallet/popup";

interface FormData {
  password: string;
}

export const LockPage: FunctionComponent = observer(() => {
  const intl = useIntl();
  const history = useHistory();

  const passwordRef = useRef<HTMLInputElement | null>();

  const { register, handleSubmit, setError, errors } = useForm<FormData>({
    defaultValues: {
      password: "",
    },
  });

  const { keyRingStore } = useStore();
  const [loading, setLoading] = useState(false);

  const interactionInfo = useInteractionInfo(() => {
    keyRingStore.rejectAll();
  });

  const [isOpen, setisOpen] = useState(false);

  useEffect(() => {
    if (passwordRef.current) {
      // Focus the password input on enter.
      passwordRef.current.focus();
    }
  }, []);

  const restore = () => {
    history.push("/register?type=restore");
  };

  return (
    <EmptyLayout style={{ backgroundColor: "white", height: "100%" }}>
      <Form
        className={style.formContainer}
        onSubmit={handleSubmit(async (data) => {
          setLoading(true);
          try {
            if (keyRingStore.status === KeyRingStatus.MIGRATOR) {
              await keyRingStore.migratorKeyRing(data.password);
            }
            await keyRingStore.unlock(data.password);

            const msg = new StartAutoLockMonitoringMsg();
            const requester = new InExtensionMessageRequester();
            // Make sure to notify that auto lock service to start check locking after duration.
            await requester.sendMessage(BACKGROUND_PORT, msg);

            if (interactionInfo.interaction) {
              if (!interactionInfo.interactionInternal) {
                await delay(100);
                if (window.location.href.includes("#/unlock")) {
                  isMobileStatus() ? closePopupTab() : window.close();
                }
              } else {
                history.replace("/");
              }
            }
          } catch (e: any) {
            console.log("Fail to decrypt: " + e.message);
            const message =
              e.message === "Unmatched mac"
                ? intl.formatMessage({
                    id: "lock.input.password.error.invalid",
                  })
                : e.message;

            setError("password", "invalid", message);
            setLoading(false);
          }
        })}
      >
        <Banner
          icon={require("../../public/assets/logo-256.png")}
          logo={require("../../public/assets/brand-text.png")}
          // subtitle="Wallet for the Interchain"
        />
        <PasswordInput
          label={intl.formatMessage({
            id: "lock.input.password",
          })}
          name="password"
          error={errors.password && errors.password.message}
          ref={(ref) => {
            passwordRef.current = ref;

            register({
              required: intl.formatMessage({
                id: "lock.input.password.error.required",
              }),
            })(ref);
          }}
        />
        <Button type="submit" color="primary" block data-loading={loading}>
          <FormattedMessage id="lock.button.unlock" />
        </Button>
        <p className={style.restoreTips}>
          <FormattedMessage id="lock.text.restore.tips" />
        </p>
        <p className={style.restore} onClick={() => setisOpen(true)}>
          <FormattedMessage id="lock.text.restore" />
        </p>
      </Form>
      <Modal isOpen={isOpen} centered>
        <ModalBody>
          <div className={style.info}>
            <img
              style={{
                width: "32px",
                height: "32px",
                marginRight: "12px",
              }}
              src={require("../../public/assets/svg/info-mark-danger.svg")}
              alt="info"
            />
          </div>
          <div className={style.title}>
            <FormattedMessage id="lock.modal.text.tips" />
          </div>
          <div className={style.content}>
            <FormattedMessage id="lock.modal.text.content" />
          </div>
          <div className={style.content}>
            <FormattedMessage id="lock.modal.text.content_second" />
          </div>
          <div className={style.buttons}>
            <Button
              type="button"
              color="danger"
              block
              onClick={restore}
              style={{ marginTop: "10px" }}
            >
              <FormattedMessage id="lock.modal.button.confirm" />
            </Button>
            <Button
              type="button"
              color="primary"
              block
              onClick={() => setisOpen(false)}
              style={{ marginTop: "10px" }}
            >
              <FormattedMessage id="lock.modal.button.cancel" />
            </Button>
          </div>
        </ModalBody>
      </Modal>
    </EmptyLayout>
  );
});
