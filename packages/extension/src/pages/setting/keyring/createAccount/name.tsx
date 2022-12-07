import React, { FunctionComponent, useState } from "react";
import { HeaderLayout } from "../../../../layouts";

import { useHistory } from "react-router";
import { FormattedMessage, useIntl } from "react-intl";
import { Input } from "../../../../components/form";
import { Button, Form } from "reactstrap";
import useForm from "react-hook-form";
import { useStore } from "../../../../stores";
import { observer } from "mobx-react-lite";

import styleName from "./name.module.scss";
import { useBIP44Option } from "../../../register/advanced-bip44";

interface FormData {
  name: string;
}

export const CreateNamePage: FunctionComponent = observer(() => {
  const history = useHistory();

  const intl = useIntl();

  const [loading, setLoading] = useState(false);

  const { keyRingStore } = useStore();
  const { register, handleSubmit, errors, setError } = useForm<FormData>({
    defaultValues: {
      name: "",
    },
  });
  const bip44Option = useBIP44Option(60);
  return (
    <HeaderLayout
      showChainName={false}
      canChangeChainInfo={false}
      alternativeTitle={intl.formatMessage({
        id: "setting.keyring.create.name",
      })}
      onBackButton={() => {
        history.goBack();
      }}
    >
      <Form
        className={styleName.container}
        onSubmit={handleSubmit(async (data) => {
          setLoading(true);
          try {
            const mnemonicKeyringInfo = keyRingStore.multiKeyStoreInfo.filter(
              (val) => val.type === "mnemonic"
            );

            bip44Option.setIndex(mnemonicKeyringInfo.length);

            await keyRingStore.addAccount(data.name, bip44Option.bip44HDPath);

            setLoading(false);
            history.push("/");
          } catch (e: any) {
            console.log("Fail to decrypt: " + e.message);
            setError(
              "name",
              "invalid",
              intl.formatMessage({
                id: "setting.keyring.create.input.name.error.invalid",
              })
            );
            setLoading(false);
          }
        })}
      >
        <Input
          type="text"
          label={intl.formatMessage({
            id: "setting.keyring.create.input.name",
          })}
          name="name"
          error={errors.name && errors.name.message}
          ref={register({
            required: intl.formatMessage({
              id: "setting.keyring.create.input.name.error.required",
            }),
          })}
        />
        <div style={{ flex: 1 }} />
        <Button type="submit" color="primary" block data-loading={loading}>
          <FormattedMessage id="setting.keyring.create.name.button.save" />
        </Button>
      </Form>
    </HeaderLayout>
  );
});
