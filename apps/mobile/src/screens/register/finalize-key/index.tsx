import React, { FunctionComponent, useEffect, useRef, useState } from "react";
import { observer } from "mobx-react-lite";
import { Box } from "../../../components/box";
import LottieView from "lottie-react-native";
import { useStore } from "../../../stores";
import { WalletStatus } from "@owallet/stores";
import {
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
// import {RootStackParamList, StackNavProp} from '../../../navigation';
import { InteractionManager, Text, View } from "react-native";
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useStyle } from "../../../styles";
import { defaultSpringConfig } from "../../../styles/spring";
import { ViewRegisterContainer } from "../components/view-register-container";
import { Buffer } from "buffer/";
import { FormattedMessage } from "react-intl";
import { RootStackParamList } from "@src/router/root";

const SimpleProgressBar: FunctionComponent<{
  progress: number;
}> = ({ progress }) => {
  const style = useStyle();

  const animProgress = useSharedValue(progress);

  useEffect(() => {
    animProgress.value = withSpring(progress, defaultSpringConfig);
  }, [animProgress, progress]);

  const barColor = style.get("color-blue-400").color;
  const animatedStyle = useAnimatedStyle(() => {
    return {
      height: 8,
      borderRadius: 9999,
      backgroundColor: barColor,
      width: `${animProgress.value * 100}%`,
    };
  });

  return (
    <View
      style={{
        height: 8,
        borderRadius: 9999,
        backgroundColor: style.get("color-gray-500").color,
      }}
    >
      <Reanimated.View style={animatedStyle} />
    </View>
  );
};

export const FinalizeKeyScreen: FunctionComponent = observer(() => {
  const { chainStore, accountStore, queriesStore, keyRingStore, priceStore } =
    useStore();
  const route =
    useRoute<RouteProp<RootStackParamList, "Register.FinalizeKey">>();
  const {
    mnemonic,
    privateKey,
    ledger,
    name,
    password,
    stepPrevious,
    stepTotal,
  } = route.params;
  const navigation = useNavigation();
  const style = useStyle();

  const [isScreenTransitionEnded, setIsScreenTransitionEnded] = useState(false);
  useFocusEffect(
    React.useCallback(() => {
      const task = InteractionManager.runAfterInteractions(() => {
        setIsScreenTransitionEnded(true);
      });

      return () => task.cancel();
    }, [])
  );

  // Effects depends on below state and these should be called once if length > 0.
  // Thus, you should set below state only once.
  const [candidateAddresses, setCandidateAddresses] = useState<
    {
      chainId: string;
      bech32Addresses: {
        coinType: number;
        address: string;
      }[];
    }[]
  >([]);
  const [vaultId, setVaultId] = useState("");

  const [queryRoughlyDone, setQueryRoughlyDone] = useState(false);
  const [queryProgress, setQueryProgress] = useState(0);
  const unmounted = useRef(false);
  useEffect(() => {
    return () => {
      unmounted.current = true;
    };
  }, []);

  useEffect(() => {
    if (!isScreenTransitionEnded) {
      return;
    }

    (async () => {
      // Chain store should be initialized before creating the key.
      await chainStore.waitUntilInitialized();

      // background에서의 체인 정보의 변경사항 (ochain-registry로부터의) 등을 sync 해야한다.
      // 사실 문제가 되는 부분은 유저가 install한 직후이다.
      // 유저가 install한 직후에 바로 register page를 열도록 background가 짜여져있기 때문에
      // 이 경우 background에서 chains service가 체인 정보를 업데이트하기 전에 register page가 열린다.
      // 그 결과 chain image가 제대로 표시되지 않는다.
      // 또한 background와 체인 정보가 맞지 않을 확률이 높기 때문에 잠재적으로도 문제가 될 수 있다.
      // 이 문제를 해결하기 위해서 밑의 한줄이 존재한다.
      await chainStore.updateChainInfosFromBackground();

      let vaultId: unknown;

      if (mnemonic) {
        vaultId = await keyRingStore.newMnemonicKey(
          mnemonic.value,
          mnemonic.bip44Path,
          name,
          password
        );
      } else if (privateKey) {
        vaultId = await keyRingStore.newPrivateKeyKey(
          Buffer.from(privateKey.hexValue, "hex"),
          privateKey.meta,
          name,
          password
        );
      } else if (ledger) {
        vaultId = await keyRingStore.newLedgerKey(
          ledger.pubKey,
          ledger.app,
          ledger.bip44Path,
          name,
          password
        );
      } else {
        throw new Error("Invalid props");
      }

      if (typeof vaultId !== "string") {
        throw new Error("Unknown error");
      }

      await chainStore.waitSyncedEnabledChains();

      let promises: Promise<unknown>[] = [];

      for (const chainInfo of chainStore.chainInfos) {
        // If mnemonic is fresh, there is no way that additional coin type account has value to select.
        if (mnemonic) {
          if (
            keyRingStore.needKeyCoinTypeFinalize(vaultId, chainInfo) &&
            mnemonic?.isFresh
          ) {
            promises.push(
              (async () => {
                await keyRingStore.finalizeKeyCoinType(
                  vaultId,
                  chainInfo.chainId,
                  chainInfo.bip44.coinType
                );
              })()
            );
          }
        }
      }

      await Promise.allSettled(promises);

      const candidateAddresses: {
        chainId: string;
        bech32Addresses: {
          coinType: number;
          address: string;
        }[];
      }[] = [];

      promises = [];
      for (const chainInfo of chainStore.chainInfos) {
        if (keyRingStore.needKeyCoinTypeFinalize(vaultId, chainInfo)) {
          promises.push(
            (async () => {
              const res = await keyRingStore.computeNotFinalizedKeyAddresses(
                vaultId,
                chainInfo.chainId
              );

              candidateAddresses.push({
                chainId: chainInfo.chainId,
                bech32Addresses: res.map((res) => {
                  return {
                    coinType: res.coinType,
                    address: res.bech32Address,
                  };
                }),
              });
            })()
          );
        } else {
          const account = accountStore.getAccount(chainInfo.chainId);
          promises.push(
            (async () => {
              if (account.walletStatus !== WalletStatus.Loaded) {
                await account.init();
              }

              if (account.bech32Address) {
                candidateAddresses.push({
                  chainId: chainInfo.chainId,
                  bech32Addresses: [
                    {
                      coinType: chainInfo.bip44.coinType,
                      address: account.bech32Address,
                    },
                  ],
                });
              }
            })()
          );
        }
      }

      await Promise.allSettled(promises);

      setVaultId(vaultId);
      setCandidateAddresses(candidateAddresses);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScreenTransitionEnded]);

  useEffect(() => {
    if (candidateAddresses.length > 0) {
      // Should call once.
      (async () => {
        const promises: Promise<unknown>[] = [];

        for (const candidateAddress of candidateAddresses) {
          const queries = queriesStore.get(candidateAddress.chainId);
          for (const bech32Address of candidateAddress.bech32Addresses) {
            // Prepare queries state to avoid UI flicker on next scene.
            promises.push(
              queries.cosmos.queryAccount
                .getQueryBech32Address(bech32Address.address)
                .waitFreshResponse()
            );
            promises.push(
              (async () => {
                const chainInfo = chainStore.getChain(candidateAddress.chainId);
                const bal = queries.queryBalances
                  .getQueryBech32Address(bech32Address.address)
                  .getBalance(
                    chainInfo.stakeCurrency || chainInfo.currencies[0]
                  );

                if (bal) {
                  await bal.waitFreshResponse();
                }
              })()
            );
            promises.push(
              queries.cosmos.queryDelegations
                .getQueryBech32Address(bech32Address.address)
                .waitFreshResponse()
            );
          }

          const chainInfo = chainStore.getChain(candidateAddress.chainId);
          const targetCurrency =
            chainInfo.stakeCurrency || chainInfo.currencies[0];
          if (targetCurrency.coinGeckoId) {
            // Push coingecko id to priceStore.
            priceStore.getPrice(targetCurrency.coinGeckoId);
          }
        }

        // Try to make sure that prices are fresh.
        promises.push(priceStore.waitFreshResponse());

        if (promises.length >= 10) {
          // RN에서 한번에 많은 쿼리를 처리하면 느리진다...
          // 이 문제를 해결할수가 없기 때문에 query가 처리된 비율에 따라 progress를 계산하고 0.8(80%) 이상의 쿼리가 처리되고
          // 그 후 3초를 더 기다리고 넘긴다...
          // (최대 기다리는 시간은 15초)
          let once = false;
          setTimeout(() => {
            if (!once) {
              once = true;
              if (!unmounted.current) {
                setQueryRoughlyDone(true);
              }
            }
          }, 15000);

          let len = promises.length;
          let i = 0;
          for (const p of promises) {
            p.then(() => {
              i++;
              const progress = i / len;
              setQueryProgress(progress);
              if (progress >= 0.8 && !once) {
                once = true;
                setTimeout(() => {
                  if (!unmounted.current) {
                    setQueryRoughlyDone(true);
                  }
                }, 3000);
              }
            });
          }
        } else {
          setTimeout(() => {
            if (!unmounted.current) {
              setQueryRoughlyDone(true);
            }
          }, 3000);
        }
      })();
    }
    // Make sure to this effect called once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateAddresses]);

  // XXX: sceneTransition은 method마다 ref이 변한다.
  //      onceRef이 없으면 무한루프에 빠진다.
  //      처음에 이걸 고려 안해서 이런 문제가 생겨버렸는데
  //      수정할 시간이 없으니 일단 대충 처리한다.
  const onceRef = useRef<boolean>(false);
  useEffect(() => {
    if (
      !onceRef.current &&
      candidateAddresses.length > 0 &&
      vaultId &&
      // RN에서 한번에 많은 쿼리를 처리하면 느리진다...
      // 이 문제를 해결할수가 없기 때문에 query가 처리된 비율에 따라 progress를 계산하고 0.8(80%) 이상의 쿼리가 처리되고
      // 그 후 3초를 더 기다리고 넘긴다...
      // (최대 기다리는 시간은 15초)
      queryRoughlyDone
    ) {
      onceRef.current = true;

      navigation.reset({
        routes: [
          {
            name: "Register.EnableChain",
            params: {
              vaultId,
              candidateAddresses,
              isFresh: mnemonic?.isFresh ?? false,
              stepPrevious: stepPrevious,
              stepTotal: stepTotal,
              password: password,
            },
          },
        ],
      });
    }
  }, [
    candidateAddresses,
    mnemonic?.isFresh,
    navigation,
    password,
    stepPrevious,
    stepTotal,
    vaultId,
    queryRoughlyDone,
  ]);

  return (
    <ViewRegisterContainer
      forceEnableTopSafeArea={true}
      contentContainerStyle={{
        flexGrow: 1,
        alignItems: "center",
      }}
    >
      <View style={{ flex: 1 }} />
      <LottieView
        source={require("@assets/animations/loading_owallet.json")}
        loop={true}
        autoPlay={true}
        style={{ width: "80%", aspectRatio: 1 }}
      />
      <View
        style={{
          flex: 2,
        }}
      />
      <Text style={style.flatten(["subtitle3", "color-text-low"])}>
        <FormattedMessage id="pages.register.finalize-key.loading.text" />
      </Text>
      <Box marginTop={21} marginBottom={12} paddingX={28} width="100%">
        <SimpleProgressBar progress={queryProgress} />
      </Box>
      <Text style={style.flatten(["body2", "color-text-low", "text-center"])}>
        ({(queryProgress * 100).toFixed(0)}%/ 100%)
      </Text>
      <View
        style={{
          flex: 1,
        }}
      />
    </ViewRegisterContainer>
  );
});
