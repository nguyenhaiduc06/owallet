import {
  EmptyAddressError,
  IMemoConfig,
  IRecipientConfig,
  IRecipientConfigWithICNS,
} from "@owallet/hooks";
import React, { forwardRef, useState } from "react";
import { observer } from "mobx-react-lite";
// import {TextInput} from '../text-input/text-input';
// import {IconButton} from '../../icon-button';
// import {useStyle} from '../../../styles';
// import {UserIcon} from '../../icon/user';
import { useIntl } from "react-intl";
import { AddressBookModal } from "./address-book-modal";
import { TextInput as NativeTextInput } from "react-native";
import { AppCurrency } from "@owallet/types";
import { useStyle } from "@src/styles";
import { TextInput } from "@components/input";
import OWIcon from "@components/ow-icon/ow-icon";
import OWButtonIcon from "@components/button/ow-button-icon";

export interface RecipientInputWithAddressBookProps {
  historyType: string;
  recipientConfig: IRecipientConfig | IRecipientConfigWithICNS;
  memoConfig: IMemoConfig;
  currency: AppCurrency;

  permitAddressBookSelfKeyInfo?: boolean;
}

export interface RecipientInputWithoutAddressBookProps {
  recipientConfig: IRecipientConfig | IRecipientConfigWithICNS;
  memoConfig?: undefined;

  hideAddressBookButton: true;
}

export type RecipientInputProps = (
  | RecipientInputWithAddressBookProps
  | RecipientInputWithoutAddressBookProps
) & {
  bottom?: React.ReactNode;
};

function numOfCharacter(str: string, c: string): number {
  return str.split(c).length - 1;
}

export const RecipientInput = observer(
  forwardRef<NativeTextInput, RecipientInputProps>((props, ref) => {
    const { recipientConfig, memoConfig, bottom } = props;

    const intl = useIntl();
    const style = useStyle();
    const [isOpenAddressBookModal, setIsOpenAddressBookModal] = useState(false);

    const isICNSName: boolean = (() => {
      if ("isICNSName" in recipientConfig) {
        return recipientConfig.isICNSName;
      }
      return false;
    })();

    const isICNSFetching: boolean = (() => {
      if ("isICNSFetching" in recipientConfig) {
        return recipientConfig.isICNSFetching;
      }
      return false;
    })();

    return (
      <React.Fragment>
        <TextInput
          ref={ref}
          autoCapitalize="none"
          label={intl.formatMessage({
            id: "components.input.recipient-input.wallet-address-label",
          })}
          value={recipientConfig.value}
          autoComplete="off"
          onChangeText={(value) => {
            if (
              // If icns is possible and users enters ".", complete bech32 prefix automatically.
              "isICNSEnabled" in recipientConfig &&
              recipientConfig.isICNSEnabled &&
              value.length > 0 &&
              value[value.length - 1] === "." &&
              numOfCharacter(value, ".") === 1 &&
              numOfCharacter(recipientConfig.value, ".") === 0
            ) {
              value = value + recipientConfig.icnsExpectedBech32Prefix;
            }

            recipientConfig.setValue(value);
          }}
          right={
            memoConfig ? (
              <OWButtonIcon
                icon={
                  // <UserIcon
                  //   size={24}
                  //   color={style.get('color-gray-10').color}
                  // />
                  <OWIcon
                    name={"tdesignuser"}
                    size={24}
                    color={style.get("color-gray-10").color}
                  />
                }
                // rippleColor={style.get('color-gray-500').color}
                // underlayColor={style.get('color-gray-500').color}
                // containerStyle={style.flatten(['width-24', 'height-24'])}
                style={style.flatten(["padding-4", "border-radius-64"])}
                onPress={() => {
                  setIsOpenAddressBookModal(true);
                }}
              />
            ) : null
          }
          isLoading={isICNSFetching}
          paragraph={(() => {
            if (isICNSName && !recipientConfig.uiProperties.error) {
              return recipientConfig.recipient;
            }
          })()}
          bottom={bottom}
          error={(() => {
            const uiProperties = recipientConfig.uiProperties;

            const err = uiProperties.error || uiProperties.warning;

            if (err instanceof EmptyAddressError) {
              return;
            }

            if (err) {
              return err.message || err.toString();
            }
          })()}
        />

        {memoConfig ? (
          <AddressBookModal
            isOpen={isOpenAddressBookModal}
            setIsOpen={setIsOpenAddressBookModal}
            historyType={props.historyType}
            recipientConfig={recipientConfig}
            memoConfig={memoConfig}
            currency={props.currency}
            permitSelfKeyInfo={props.permitAddressBookSelfKeyInfo}
          />
        ) : null}
      </React.Fragment>
    );
  })
);
