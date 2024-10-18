import React, { FunctionComponent, useEffect, useRef } from "react";
import {
  RouteProp,
  useIsFocused,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { observer } from "mobx-react-lite";
import { useStore } from "../../stores";
import { Text, View, StyleSheet } from "react-native";
import { useStyle } from "../../styles";
import { TendermintTxTracer } from "@owallet/cosmos";
import { Buffer } from "buffer/";
import LottieView from "lottie-react-native";
// import {SimpleGradient} from '../../components/svg';
// import {ArrowRightIcon} from '../../components/icon/arrow-right';
// import {StackNavProp} from '../../navigation';
import { Box } from "../../components/box";
// import {TextButton} from '../../components/text-button';
// import {useNotification} from '../../hooks/notification';
import { FormattedMessage, useIntl } from "react-intl";
// import {EthTxReceipt, EthTxStatus} from '@owallet/types';
import { simpleFetch } from "@owallet/simple-fetch";
import { retry } from "@owallet/common";
import { navigate, resetTo } from "@src/router/root";
import { SCREENS } from "@common/constants";
import { OWButton } from "@components/button";
import OWIcon from "@components/ow-icon/ow-icon";
import { EthTxReceipt, EthTxStatus } from "@owallet/types";
import { notification } from "@stores/notification";

export const TxPendingResultScreen: FunctionComponent = observer(() => {
  const { chainStore } = useStore();
  // const notification = useNotification();
  const intl = useIntl();

  const isPendingGoToResult = useRef(false);
  //NOTE home으로 갈 때 home이 다 렌더링이 안될 때 tx에 성공되면 tx tracer에 의해서 success로 이동됨
  //해서 해당 값을 통해서 home으로 갈 경우 success로 이동 안될 수 있게 함
  const isPendingGotoHome = useRef(false);

  const route = useRoute<
    RouteProp<
      Record<
        string,
        {
          chainId: string;
          txHash: string;
          isEvmTx?: boolean;
        }
      >,
      string
    >
  >();

  const chainId = route.params.chainId;

  const style = useStyle();
  const navigation = useNavigation();

  const isFocused = useIsFocused();

  // useEffect(() => {
  //   notification.disable(true);
  //   return () => {
  //     //NOTE 성공 또는 실패로 라우팅될때 해당 페이지가 렌더링된후 현재 pending페이지의 useEffect return 이 실행됨
  //     //그래서 성공페이지에서 disable(true)로 설정된후 이후 여기의 disable(false)가 실행됨
  //     //해서 홈으로 만 갈때만 disable을 false로 설정함
  //     if (!isPendingGoToResult.current) {
  //       notification.disable(false);
  //     }
  //   };
  // }, [notification]);

  useEffect(() => {
    if (isFocused) {
      const txHash = route.params.txHash;
      const isEvmTx = route.params.isEvmTx;
      const chainInfo = chainStore.getChain(chainId);

      if (isEvmTx) {
        retry(
          () => {
            return new Promise<void>(async (resolve, reject) => {
              if (chainInfo.evm === undefined) {
                return reject();
              }

              const txReceiptResponse = await simpleFetch<{
                result: EthTxReceipt | null;
                error?: Error;
              }>(chainInfo.evm.rpc, {
                method: "POST",
                headers: {
                  "content-type": "application/json",
                },
                body: JSON.stringify({
                  jsonrpc: "2.0",
                  method: "eth_getTransactionReceipt",
                  params: [txHash],
                  id: 1,
                }),
              });

              if (txReceiptResponse.data.error) {
                console.error(txReceiptResponse.data.error);
                resolve();
              }

              const txReceipt = txReceiptResponse.data.result;
              if (txReceipt) {
                if (isPendingGotoHome.current) {
                  return resolve();
                }

                if (txReceipt.status === EthTxStatus.Success) {
                  isPendingGoToResult.current = true;
                  navigate(SCREENS.TxSuccessResult, {
                    chainId,
                    txHash,
                    isEvmTx,
                  });
                } else {
                  isPendingGoToResult.current = true;
                  navigate(SCREENS.TxFailedResult, {
                    chainId,
                    txHash,
                    isEvmTx,
                  });
                }
                resolve();
              }

              reject();
            });
          },
          {
            maxRetries: 10,
            waitMsAfterError: 500,
            maxWaitMsAfterError: 4000,
          }
        );
      } else {
        const txTracer = new TendermintTxTracer(chainInfo.rpc, "/websocket");
        txTracer
          .traceTx(Buffer.from(txHash, "hex"))
          .then((tx) => {
            if (isPendingGotoHome.current) {
              return;
            }

            if (tx.code == null || tx.code === 0) {
              isPendingGoToResult.current = true;
              navigate(SCREENS.TxSuccessResult, { chainId, txHash, isEvmTx });
            } else {
              isPendingGoToResult.current = true;
              navigate(SCREENS.TxFailedResult, { chainId, txHash, isEvmTx });
            }
          })
          .catch((e) => {
            console.log(`Failed to trace the tx (${txHash})`, e);
          });

        return () => {
          txTracer.close();
        };
      }
    }
  }, [
    chainId,
    chainStore,
    isFocused,
    navigation,
    route.params.txHash,
    route.params.isEvmTx,
  ]);

  return (
    <Box style={style.flatten(["flex-grow-1", "items-center"])}>
      <View style={style.flatten(["absolute-fill"])}>
        {/*<SimpleGradient*/}
        {/*  degree={*/}
        {/*    style.get('tx-result-screen-pending-gradient-background').degree*/}
        {/*  }*/}
        {/*  stops={*/}
        {/*    style.get('tx-result-screen-pending-gradient-background').stops*/}
        {/*  }*/}
        {/*  fallbackAndroidImage={*/}
        {/*    style.get('tx-result-screen-pending-gradient-background')*/}
        {/*      .fallbackAndroidImage*/}
        {/*  }*/}
        {/*/>*/}
      </View>
      <View style={style.flatten(["flex-2"])} />
      <View
        style={style.flatten([
          "width-122",
          "height-122",
          "border-width-8",
          "border-color-blue-300",
          "border-radius-64",
        ])}
      >
        <Box
          alignX="center"
          alignY="center"
          style={{
            left: 0,
            right: 0,
            top: 0,
            bottom: 10,
            ...style.flatten(["absolute"]),
          }}
        >
          <LottieView
            source={require("@assets/animations/loading_owallet.json")}
            colorFilters={[
              {
                keypath: "#dot01",
                color: style.flatten(["color-blue-300"]).color,
              },
              {
                keypath: "#dot02",
                color: style.flatten(["color-blue-300"]).color,
              },
              {
                keypath: "#dot03",
                color: style.flatten(["color-blue-300"]).color,
              },
            ]}
            autoPlay
            loop
            style={{ width: 150, height: 150 }}
          />
        </Box>
      </View>

      <Text
        style={style.flatten([
          "mobile-h3",
          "color-text-high",
          "margin-top-82",
          "margin-bottom-32",
        ])}
      >
        <FormattedMessage id="page.tx-result-pending.title" />
      </Text>

      {/* To match the height of text with other tx result screens,
         set the explicit height to upper view*/}
      <View
        style={StyleSheet.flatten([
          style.flatten(["padding-x-66"]),
          {
            overflow: "visible",
          },
        ])}
      >
        <Text
          style={style.flatten([
            "subtitle2",
            "text-center",
            "color-text-middle",
          ])}
        >
          <FormattedMessage id="page.tx-result-pending.paragraph" />
        </Text>
      </View>

      <Box paddingX={48} height={116} marginTop={58} alignX="center">
        <OWButton
          type={"link"}
          style={style.flatten(["flex-1"])}
          size="large"
          label={intl.formatMessage({
            id: "page.tx-result-pending.go-to-home-button",
          })}
          iconRight={(color) => (
            <View style={style.flatten(["margin-left-8"])}>
              {/*<ArrowRightIcon color={color} size={18} />*/}
              <OWIcon name={"tdesignarrow-right"} size={18} color={color} />
            </View>
          )}
          onPress={() => {
            isPendingGotoHome.current = true;
            // navigate(SCREENS.Home);
            resetTo(SCREENS.STACK.MainTab);
          }}
        />
      </Box>

      <View style={style.flatten(["flex-2"])} />
    </Box>
  );
});
