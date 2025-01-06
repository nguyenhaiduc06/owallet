import React, { FunctionComponent } from "react";
import { observer } from "mobx-react-lite";
import { PermissionData } from "@owallet/background";
import { useStore } from "../../../stores";
import { useInteractionInfo } from "../../../hooks";
import { HeaderLayout } from "../../../layouts/header";
import { Box } from "../../../components/box";
import { Image } from "../../../components/image";
import { Body1, H2, Subtitle3 } from "../../../components/typography";
import { ColorPalette } from "../../../styles";
import { Gutter } from "../../../components/gutter";
import { FormattedMessage, useIntl } from "react-intl";
import { useTheme } from "styled-components";
import { handleExternalInteractionWithNoProceedNext } from "../../../utils";
import SimpleBar from "simplebar-react";
import { useNavigate } from "react-router";
import { ApproveIcon, CancelIcon } from "../../../components/button";

export const PermissionBasicAccessPage: FunctionComponent<{
  data: {
    ids: string[];
  } & PermissionData;
}> = observer(({ data }) => {
  const { chainStore, permissionStore } = useStore();
  const intl = useIntl();
  const theme = useTheme();
  const navigate = useNavigate();

  const interactionInfo = useInteractionInfo({
    onUnmount: async () => {
      await permissionStore.rejectPermissionWithProceedNext(data.ids, () => {});
    },
  });

  const isLoading = false;

  return (
    <HeaderLayout
      title=""
      fixedHeight={true}
      bottomButtons={[
        {
          left: <CancelIcon />,
          text: intl.formatMessage({ id: "button.reject" }),
          size: "large",
          color: "danger",
          onClick: async () => {
            await permissionStore.rejectPermissionWithProceedNext(
              data.ids,
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
          },
        },
        {
          text: intl.formatMessage({ id: "button.approve" }),
          color: "primary",
          size: "large",
          left: !isLoading && <ApproveIcon />,
          type: "submit",
          isLoading,
        },
      ]}
      onSubmit={async (e) => {
        e.preventDefault();

        await permissionStore.approvePermissionWithProceedNext(
          data.ids,
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
      }}
    >
      <Box height="100%" padding="0.75rem" paddingBottom="0">
        <Box alignX="center">
          <Image
            alt="OWallet Logo Image"
            src={require("../../../public/assets/orai_wallet_logo.png")}
            style={{ width: "4.625rem", height: "4.625rem" }}
          />

          <Gutter size="1.125rem" />

          <H2
            color={
              theme.mode === "light"
                ? ColorPalette["gray-600"]
                : ColorPalette["gray-10"]
            }
          >
            <FormattedMessage id="page.permission.requesting-connection-title" />
          </H2>

          <Gutter size="1rem" />

          <Body1
            color={
              theme.mode === "light"
                ? ColorPalette["gray-300"]
                : ColorPalette["gray-200"]
            }
          >
            {data.origins.join(", ")}
          </Body1>

          <Gutter size="1rem" />
        </Box>
        <SimpleBar
          autoHide={false}
          style={{
            display: "flex",
            flexDirection: "column",

            flex: 1,
            overflow: "auto",
            borderRadius: "0.5rem",
          }}
        >
          <Box>
            {data.chainIds.map((chainId, index) => {
              const chainInfo = (() => {
                try {
                  return chainStore.getChain(chainId);
                } catch (e) {
                  return chainStore.getModularChain(chainId);
                }
              })();

              const isLast = index === data.chainIds.length - 1;

              return (
                <Box
                  key={chainId}
                  backgroundColor={
                    theme.mode === "light"
                      ? ColorPalette.white
                      : ColorPalette["gray-600"]
                  }
                  style={{
                    overflow: "hidden",
                    borderBottomLeftRadius: isLast ? "0.5rem" : undefined,
                    borderBottomRightRadius: isLast ? "0.5rem" : undefined,
                  }}
                >
                  <Box alignY="center" paddingX="1.5rem" minHeight="4.25rem">
                    <Subtitle3
                      color={
                        theme.mode === "light"
                          ? ColorPalette["gray-400"]
                          : ColorPalette["gray-50"]
                      }
                    >
                      {chainInfo.chainName}
                    </Subtitle3>
                  </Box>

                  {isLast ? null : (
                    <Box
                      height="1px"
                      backgroundColor={
                        theme.mode === "light"
                          ? ColorPalette["gray-50"]
                          : ColorPalette["gray-500"]
                      }
                    />
                  )}
                </Box>
              );
            })}
          </Box>
        </SimpleBar>
      </Box>
    </HeaderLayout>
  );
});
