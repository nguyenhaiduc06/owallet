import React, { FunctionComponent, useMemo, useRef, useState } from "react";
import { observer } from "mobx-react-lite";
import { useStore } from "../../../stores";
import { useInteractionInfo } from "../../../hooks";
import { HeaderLayout } from "../../../layouts/header";
import { BackButton } from "../../../layouts/header/components";
import { checkAndValidateADR36AminoSignDoc } from "@owallet/cosmos";
import { Box } from "../../../components/box";
import { XAxis, YAxis } from "../../../components/axis";
import { Gutter } from "../../../components/gutter";
import { Body2, Body3, H5, Subtitle3 } from "../../../components/typography";
import { ColorPalette } from "../../../styles";
import { ViewDataButton } from "../components/view-data-button";
import { handleCosmosPreSign } from "../utils/handle-cosmos-sign";
import { OWalletError } from "@owallet/router";
import { ErrModuleLedgerSign } from "../utils/ledger-types";
import { LedgerGuideBox } from "../components/ledger-guide-box";
import { GuideBox } from "../../../components/guide-box";
import { FormattedMessage, useIntl } from "react-intl";

import { useTheme } from "styled-components";
import { KeyRingService } from "@owallet/background";
import { handleExternalInteractionWithNoProceedNext } from "../../../utils";
import { MessageAdr36Icon } from "../../../components/icon";
import { ItemLogo } from "../../main/token-detail/msg-items/logo";
import { useNavigate } from "react-router";
import { ApproveIcon, CancelIcon } from "../../../components/button";

export const SignCosmosADR36Page: FunctionComponent = observer(() => {
  const { chainStore, signInteractionStore, uiConfigStore } = useStore();
  const intl = useIntl();
  const theme = useTheme();
  const navigate = useNavigate();

  const [isViewData, setIsViewData] = useState(false);

  const interactionInfo = useInteractionInfo({
    onWindowClose: () => {
      signInteractionStore.rejectAll();
    },
    onUnmount: async () => {
      if (signInteractionStore.waitingData) {
        signInteractionStore.rejectWithProceedNext(
          signInteractionStore.waitingData.id,
          () => {}
        );
      }
    },
  });

  if (
    signInteractionStore.waitingData &&
    !signInteractionStore.waitingData.data.signDocWrapper.isADR36SignDoc
  ) {
    throw new Error("Sign doc is not for adr36");
  }

  const signDocWrapper = signInteractionStore.waitingData?.data.signDocWrapper;
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

  const isLedgerAndDirect =
    signInteractionStore.waitingData?.data.keyType === "ledger" &&
    signInteractionStore.waitingData?.data.mode === "direct";

  const [isLedgerInteracting, setIsLedgerInteracting] = useState(false);
  const [ledgerInteractingError, setLedgerInteractingError] = useState<
    Error | undefined
  >(undefined);

  const isLoading = isLedgerInteracting;

  return (
    <HeaderLayout
      title={intl.formatMessage({ id: "page.sign.adr36.title" })}
      fixedHeight={true}
      left={
        <BackButton
          hidden={
            interactionInfo.interaction && !interactionInfo.interactionInternal
          }
        />
      }
      bottomButtons={[
        {
          textOverrideIcon: <CancelIcon color={ColorPalette["gray-200"]} />,
          size: "large",
          color: "secondary",
          style: {
            width: "3.25rem",
          },
          onClick: async () => {
            if (signInteractionStore.waitingData) {
              signInteractionStore.rejectWithProceedNext(
                signInteractionStore.waitingData.id,
                (proceedNext) => {
                  if (!proceedNext) {
                    if (
                      interactionInfo.interaction &&
                      !interactionInfo.interactionInternal
                    ) {
                      handleExternalInteractionWithNoProceedNext();
                    } else if (
                      interactionInfo.interaction &&
                      interactionInfo.interactionInternal
                    ) {
                      window.history.length > 1 ? navigate(-1) : navigate("/");
                    } else {
                      navigate("/", { replace: true });
                    }
                  }
                }
              );
            }
          },
        },
        {
          text: intl.formatMessage({ id: "button.approve" }),
          color: "primary",
          size: "large",
          left: !isLoading && <ApproveIcon />,
          disabled: signInteractionStore.waitingData == null,
          isLoading,
          onClick: async () => {
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

              let presignOptions;
              if (signInteractionStore.waitingData.data.keyType === "ledger") {
                setIsLedgerInteracting(true);
                setLedgerInteractingError(undefined);
                presignOptions = {
                  useWebHID: uiConfigStore.useWebHIDLedger,
                };
              }

              try {
                const signature = await handleCosmosPreSign(
                  signInteractionStore.waitingData,
                  signDocWrapper,
                  presignOptions
                );

                await signInteractionStore.approveWithProceedNext(
                  signInteractionStore.waitingData.id,
                  signDocWrapper,
                  signature,
                  (proceedNext) => {
                    if (!proceedNext) {
                      if (
                        interactionInfo.interaction &&
                        !interactionInfo.interactionInternal
                      ) {
                        handleExternalInteractionWithNoProceedNext();
                      }
                    }
                  }
                );
              } catch (e) {
                console.log(e);

                if (e instanceof OWalletError) {
                  if (e.module === ErrModuleLedgerSign) {
                    setLedgerInteractingError(e);
                  } else {
                    setLedgerInteractingError(undefined);
                  }
                } else {
                  setLedgerInteractingError(undefined);
                }
              } finally {
                setIsLedgerInteracting(false);
              }
            }
          },
        },
      ]}
    >
      <Box
        height="100%"
        padding="0.75rem"
        paddingTop="0.5rem"
        paddingBottom="0"
        style={{
          overflow: "auto",
        }}
      >
        <Box>
          <XAxis alignY="center">
            <div
              style={{
                flex: 1,
              }}
            />
            <ViewDataButton
              isViewData={isViewData}
              setIsViewData={setIsViewData}
            />
          </XAxis>
        </Box>

        <Gutter size="0.5rem" />

        <Box
          padding="1rem"
          backgroundColor={
            theme.mode === "light"
              ? ColorPalette.white
              : ColorPalette["gray-600"]
          }
          borderRadius="0.375rem"
          style={{
            boxShadow:
              theme.mode === "light"
                ? "0px 1px 4px 0px rgba(43, 39, 55, 0.10)"
                : "none",
          }}
        >
          <XAxis alignY="center">
            <ItemLogo
              width="2.5rem"
              height="2.5rem"
              center={<MessageAdr36Icon width="2.5rem" height="2.5rem" />}
            />
            <Gutter size="0.75rem" />
            <YAxis>
              <H5
                color={
                  theme.mode === "light"
                    ? ColorPalette["gray-500"]
                    : ColorPalette["gray-10"]
                }
              >
                <FormattedMessage id="Prove account ownership to" />
              </H5>
              <Gutter size="2px" />
              <Body3
                color={
                  theme.mode === "light"
                    ? ColorPalette["gray-300"]
                    : ColorPalette["gray-200"]
                }
              >
                {signInteractionStore.waitingData?.data.origin || ""}
              </Body3>
            </YAxis>
          </XAxis>
        </Box>

        <Gutter size="0.75rem" />

        <Box
          height="13rem"
          padding="1rem"
          backgroundColor={
            theme.mode === "light"
              ? ColorPalette.white
              : ColorPalette["gray-600"]
          }
          borderRadius="0.375rem"
          style={{
            overflow: "auto",
            boxShadow:
              theme.mode === "light"
                ? "0px 1px 4px 0px rgba(43, 39, 55, 0.10)"
                : "none",
          }}
        >
          <pre
            style={{
              color:
                theme.mode === "light"
                  ? ColorPalette["gray-400"]
                  : ColorPalette["gray-10"],
              // Remove normalized style of pre tag
              margin: 0,
              ...(!content.isJSON
                ? {
                    overflowWrap: "anywhere",
                    whiteSpace: "break-spaces",
                  }
                : {}),
            }}
          >
            {!isViewData
              ? content.value
              : JSON.stringify(
                  signInteractionStore.waitingData?.data.signDocWrapper
                    .aminoSignDoc,
                  null,
                  2
                )}
          </pre>
        </Box>

        <div style={{ flex: 1 }} />
        <Box
          padding="1rem"
          backgroundColor={
            theme.mode === "light"
              ? ColorPalette.white
              : ColorPalette["gray-600"]
          }
          borderRadius="0.375rem"
          style={{
            boxShadow:
              theme.mode === "light"
                ? "0px 1px 4px 0px rgba(43, 39, 55, 0.10)"
                : "none",
          }}
        >
          <XAxis alignY="center">
            <Body2
              color={
                theme.mode === "light"
                  ? ColorPalette["gray-300"]
                  : ColorPalette["gray-200"]
              }
            >
              <FormattedMessage id="page.sign.adr36.requested-network" />
            </Body2>
            <div style={{ flex: 1 }} />
            <Subtitle3
              color={
                theme.mode === "light"
                  ? ColorPalette["gray-400"]
                  : ColorPalette["gray-50"]
              }
            >
              {signInteractionStore.waitingData?.data.chainId
                ? chainStore.getChain(
                    signInteractionStore.waitingData?.data.chainId
                  ).chainName
                : ""}
            </Subtitle3>
          </XAxis>
        </Box>

        {isLedgerAndDirect ? (
          <React.Fragment>
            <Gutter size="0.75rem" />
            <GuideBox
              color="warning"
              title={intl.formatMessage({
                id: "page.sign.adr36.warning-title",
              })}
              paragraph={intl.formatMessage({
                id: "page.sign.adr36.warning-paragraph",
              })}
            />
          </React.Fragment>
        ) : null}

        {signInteractionStore.waitingData ? (
          <LedgerGuideBox
            data={{
              keyInsensitive:
                signInteractionStore.waitingData.data.keyInsensitive,
              isEthereum:
                "eip712" in signInteractionStore.waitingData.data &&
                signInteractionStore.waitingData.data.eip712 != null,
            }}
            isLedgerInteracting={isLedgerInteracting}
            ledgerInteractingError={ledgerInteractingError}
            isInternal={signInteractionStore.waitingData.isInternal}
          />
        ) : null}
      </Box>
    </HeaderLayout>
  );
});
