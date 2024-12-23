// import {registerCardModal} from '../../components/modal/card';
import { observer } from "mobx-react-lite";
import { Box } from "../../components/box";
import { XAxis } from "../../components/axis";
import { Button, OWButton } from "../../components/button";
import { Gutter } from "../../components/gutter";
import React, { useMemo, useState } from "react";
import { useStore } from "../../stores";
import { Image, Text } from "react-native";
import { useStyle } from "../../styles";
// import {BaseModalHeader} from '../../components/modal';
import { FormattedMessage, useIntl } from "react-intl";
// import * as ExpoImage from 'expo-image';
import { Column, Columns } from "../../components/column";
// import {ViewDataButton} from './sign-modal';
import { checkAndValidateADR36AminoSignDoc } from "@owallet/cosmos";
import { registerModal } from "@src/modals/base";
import { ScrollView } from "react-native-gesture-handler";
import images from "@assets/images";
import OWText from "@components/text/ow-text";
import { ViewDataButton } from "@src/modals/sign/index";
import WrapViewModal from "@src/modals/wrap/wrap-view-modal";
import { useTheme } from "@src/themes/theme-provider";
// import {ScrollView} from '../../components/scroll-view/common-scroll-view';

export const ADR36SignModal = registerModal(
  observer<{
    isOpen: boolean;
    // close: (isOpen: boolean) => void;
  }>(() => {
    const intl = useIntl();
    const style = useStyle();
    const { chainStore, signInteractionStore } = useStore();

    const [isViewData, setIsViewData] = useState(false);

    if (
      signInteractionStore.waitingData &&
      !signInteractionStore.waitingData.data.signDocWrapper.isADR36SignDoc
    ) {
      throw new Error("Sign doc is not for adr36");
    }

    const signDocWrapper =
      signInteractionStore.waitingData?.data.signDocWrapper;
    const isADR36WithString = (() => {
      if (
        signInteractionStore.waitingData?.data.signOptions &&
        "isADR36WithString" in signInteractionStore.waitingData.data.signOptions
      ) {
        return (
          signInteractionStore.waitingData.data.signOptions.isADR36WithString ||
          false
        );
      }
      return false;
    })();

    const content: {
      value: string;
      isJSON: boolean;
    } = useMemo(() => {
      if (!signDocWrapper) {
        return {
          value: "",
          isJSON: false,
        };
      }

      if (signDocWrapper.aminoSignDoc.msgs.length !== 1) {
        throw new Error("Sign doc is improper ADR-36");
      }

      const msg = signDocWrapper.aminoSignDoc.msgs[0];
      if (msg.type !== "sign/MsgSignData") {
        throw new Error("Sign doc is improper ADR-36");
      }

      if (isADR36WithString) {
        const str = Buffer.from(msg.value.data, "base64").toString();

        try {
          // In case of json, it is displayed more easily to read.
          return {
            value: JSON.stringify(JSON.parse(str), null, 2),
            isJSON: true,
          };
        } catch {
          return {
            value: str,
            isJSON: false,
          };
        }
      } else {
        return {
          value: msg.value.data as string,
          isJSON: false,
        };
      }
    }, [isADR36WithString, signDocWrapper]);
    const { colors } = useTheme();
    return (
      <WrapViewModal
        title={intl.formatMessage({ id: "page.sign.adr36.title" })}
      >
        <Box paddingX={12} paddingBottom={12} alignX="center" width="100%">
          {/*<BaseModalHeader*/}
          {/*  title={intl.formatMessage({id: 'page.sign.adr36.title'})}*/}
          {/*/>*/}
          <Gutter size={16} />

          <Columns sum={1}>
            <Column weight={1} />

            <ViewDataButton
              isViewData={isViewData}
              setIsViewData={setIsViewData}
            />
          </Columns>

          <Gutter size={8} />

          <Box
            width="100%"
            padding={16}
            backgroundColor={colors["neutral-surface-bg"]}
            borderRadius={6}
          >
            <XAxis alignY="center">
              <Gutter size={12} />

              <Box>
                <OWText style={style.flatten(["h5"])}>
                  <FormattedMessage id="page.sign.adr36.prove-account-ownership-to" />
                </OWText>
                <OWText style={style.flatten(["body2"])}>
                  {signInteractionStore.waitingData?.data.origin || ""}
                </OWText>
              </Box>
            </XAxis>
          </Box>

          <Gutter size={16} />

          <Box
            width="100%"
            maxHeight={160}
            backgroundColor={colors["neutral-surface-bg"]}
            padding={16}
            borderRadius={6}
          >
            <ScrollView>
              <OWText style={style.flatten(["body3"])}>
                {!isViewData
                  ? content.value
                  : JSON.stringify(
                      signInteractionStore.waitingData?.data.signDocWrapper
                        .aminoSignDoc,
                      null,
                      2
                    )}
              </OWText>
            </ScrollView>
          </Box>

          <Gutter size={16} />

          <Box
            width="100%"
            maxHeight={160}
            backgroundColor={colors["neutral-surface-bg"]}
            padding={16}
            borderRadius={6}
          >
            <XAxis alignY="center">
              <OWText style={style.flatten(["subtitle3", "flex-1"])}>
                <FormattedMessage id="page.sign.adr36.requested-network" />
              </OWText>

              <OWText style={style.flatten(["subtitle3"])}>
                {signInteractionStore.waitingData?.data.chainId
                  ? chainStore.getChain(
                      signInteractionStore.waitingData?.data.chainId
                    ).chainName
                  : ""}
              </OWText>
            </XAxis>
          </Box>

          <Gutter size={16} />
          <XAxis>
            <OWButton
              size="large"
              label={intl.formatMessage({ id: "button.reject" })}
              type="secondary"
              style={{ flex: 1, width: "100%" }}
              onPress={async () => {
                await signInteractionStore.rejectAll();
              }}
            />

            <Gutter size={16} />

            <OWButton
              type={"primary"}
              size="large"
              label={intl.formatMessage({ id: "button.approve" })}
              style={{ flex: 1, width: "100%" }}
              disabled={signInteractionStore.waitingData == null}
              loading={signInteractionStore.isObsoleteInteraction(
                signInteractionStore.waitingData?.id
              )}
              onPress={async () => {
                if (signInteractionStore.waitingData) {
                  const signDocWrapper =
                    signInteractionStore.waitingData.data.signDocWrapper;

                  if (
                    signDocWrapper.mode !== "amino" ||
                    !checkAndValidateADR36AminoSignDoc(
                      signDocWrapper.aminoSignDoc,
                      chainStore.getChain(
                        signInteractionStore.waitingData.data.chainId
                      ).bech32Config?.bech32PrefixAccAddr
                    )
                  ) {
                    throw new Error("Invalid sign doc for adr36");
                  }

                  try {
                    //Todo: Add Ledger Sign
                    await signInteractionStore.approveWithProceedNext(
                      signInteractionStore.waitingData.id,
                      signDocWrapper,
                      undefined,
                      () => {}
                    );
                  } catch (e) {
                    console.log(e);
                  }
                }
              }}
            />
          </XAxis>
        </Box>
      </WrapViewModal>
    );
  })
);
