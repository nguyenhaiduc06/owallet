import React, {
  FunctionComponent,
  useCallback,
  useLayoutEffect,
  useState,
} from "react";
import { observer } from "mobx-react-lite";
import { ModalState, ModalStates } from "./state";
import { ModalBaseContext, useModalBase } from "./provider";
import {
  BackHandler,
  Dimensions,
  Platform,
  ScaledSize,
  View,
} from "react-native";
// import {useStyle} from '../../../styles';
import Reanimated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import Color from "color";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useStyle } from "@src/styles";
import { defaultSpringConfig } from "@src/styles/spring";

export const ModalRoot: FunctionComponent<{
  modalStates: ModalStates;
}> = observer(({ modalStates }) => {
  return (
    <React.Fragment>
      {modalStates.modals.map((modalState, i) => {
        return (
          <ModalRender
            key={modalState.id}
            modalStates={modalStates}
            modalState={modalState}
            index={i}
          />
        );
      })}
    </React.Fragment>
  );
});

const ModalRender: FunctionComponent<{
  modalStates: ModalStates;
  modalState: ModalState;

  index: number;
}> = observer(({ modalStates, modalState, index }) => {
  // 생성되면 그 자체로 open의 시작임
  const duringModalTransition = useSharedValue<"not" | "open" | "close">(
    "open"
  );
  const translateY = useSharedValue<number | null>(null);
  const layoutHeightShared = useSharedValue<number | null>(null);

  const [closingTransitionDelegated, setClosingTransitionDelegated] =
    useState(false);

  const detachModal = useCallback(() => {
    modalStates.detachModal(modalState.id);
  }, [modalStates, modalState.id]);

  useLayoutEffect(() => {
    // 안드로이드를 위해서 모달에서 뒤로가기 버튼을 다뤄야함...
    const listener = BackHandler.addEventListener("hardwareBackPress", () => {
      const lastModal = modalStates.modals
        .reverse()
        .find((modal) => !modal.isClosing);
      if (lastModal) {
        lastModal.props.setIsOpen(false);
        return true;
      }
      return false;
    });

    return () => {
      listener.remove();
    };
  }, [modalStates.modals]);

  return (
    <ModalBaseContext.Provider
      value={{
        isOpen: modalState.props.isOpen,
        setIsOpen: modalState.props.setIsOpen,
        isClosing: modalState.isClosing,
        duringModalTransition,
        translateY,
        layoutHeightShared,
        closeModalWithTransitionDelegate: () => {
          setClosingTransitionDelegated(true);

          modalState.props.setIsOpen(false);
        },
        detachModal,
      }}
      key={modalState.id}
    >
      <ModalRenderImpl
        modalStates={modalStates}
        modalState={modalState}
        index={index}
        closingTransitionDelegated={closingTransitionDelegated}
        setClosingTransitionDelegated={setClosingTransitionDelegated}
      />
    </ModalBaseContext.Provider>
  );
});

const ModalRenderImpl: FunctionComponent<{
  modalStates: ModalStates;
  modalState: ModalState;

  index: number;

  closingTransitionDelegated: boolean;
  setClosingTransitionDelegated: (closingTransitionDelegated: boolean) => void;
}> = observer(
  ({
    modalState,
    closingTransitionDelegated,
    setClosingTransitionDelegated,
    index,
  }) => {
    const style = useStyle();

    const align = modalState.options.align || "bottom";

    const [layoutHeight, setLayoutHeight] = useState(-1);
    const {
      translateY,
      duringModalTransition,
      detachModal,
      layoutHeightShared,
      setIsOpen,
    } = useModalBase();
    const backgroundColorAlpha = useSharedValue(index === 0 ? 0.8 : 0.4);
    useLayoutEffect(() => {
      backgroundColorAlpha.value = withSpring(
        index === 0 ? 0.8 : 0.4,
        defaultSpringConfig
      );
    }, [backgroundColorAlpha, index]);

    useLayoutEffect(() => {
      if (modalState.props.isOpen) {
        setClosingTransitionDelegated(false);
      }
    }, [modalState.props.isOpen, setClosingTransitionDelegated]);

    const [deviceSize, setDeviceSize] = useState<{
      width: number;
      height: number;
    }>(() => {
      const window = Dimensions.get("window");
      return {
        width: window.width,
        height: window.height,
      };
    });

    useLayoutEffect(() => {
      const fn = ({ window }: { window: ScaledSize }) => {
        setDeviceSize({
          width: window.width,
          height: window.height,
        });
      };

      const listener = Dimensions.addEventListener("change", fn);
      return () => {
        listener.remove();
      };
    }, []);

    useLayoutEffect(() => {
      if (layoutHeight >= 0) {
        if (!modalState.isClosing) {
          duringModalTransition.value = "open";
          switch (align) {
            case "top":
              if (translateY.value == null) {
                translateY.value = -layoutHeight;
              }
              translateY.value = modalState.options?.openImmediately
                ? 0
                : withSpring(0, defaultSpringConfig, (finished) => {
                    if (finished) {
                      duringModalTransition.value = "not";
                    }
                  });
              break;
            case "center":
              if (translateY.value == null) {
                translateY.value = deviceSize.height / 2 + layoutHeight / 2;
              }
              translateY.value = modalState.options?.openImmediately
                ? 0
                : withSpring(0, defaultSpringConfig, (finished) => {
                    if (finished) {
                      duringModalTransition.value = "not";
                    }
                  });
              break;
            default:
              if (translateY.value == null) {
                translateY.value = layoutHeight;
              }
              translateY.value = modalState.options?.openImmediately
                ? 0
                : withSpring(0, defaultSpringConfig, (finished) => {
                    if (finished) {
                      duringModalTransition.value = "not";
                    }
                  });
          }
        }
      }
    }, [
      align,
      deviceSize.height,
      duringModalTransition,
      layoutHeight,
      modalState.isClosing,
      modalState.options.openImmediately,
      translateY,
    ]);

    useLayoutEffect(() => {
      if (modalState.isClosing) {
        if (!closingTransitionDelegated) {
          duringModalTransition.value = "close";
          switch (align) {
            case "top":
              if (translateY.value == null) {
                translateY.value = 0;
              }
              translateY.value = withSpring(
                -layoutHeight,
                defaultSpringConfig,
                (finished) => {
                  if (finished) {
                    duringModalTransition.value = "not";
                    runOnJS(detachModal)();
                  }
                }
              );
              break;
            case "center":
              if (translateY.value == null) {
                translateY.value = 0;
              }
              translateY.value = withSpring(
                Platform.OS === "android"
                  ? deviceSize.height / 2 + layoutHeight / 2 + 17
                  : deviceSize.height / 2 + layoutHeight / 2,
                defaultSpringConfig,
                (finished) => {
                  if (finished) {
                    duringModalTransition.value = "not";
                    runOnJS(detachModal)();
                  }
                }
              );
              break;
            default:
              if (translateY.value == null) {
                translateY.value = 0;
              }
              translateY.value = withSpring(
                layoutHeight,
                defaultSpringConfig,
                (finished) => {
                  if (finished) {
                    duringModalTransition.value = "not";
                    runOnJS(detachModal)();
                  }
                }
              );
          }
        }
      }
    }, [
      align,
      closingTransitionDelegated,
      detachModal,
      deviceSize.height,
      duringModalTransition,
      layoutHeight,
      modalState.isClosing,
      translateY,
    ]);

    const viewStyle = useAnimatedStyle(() => {
      return {
        opacity: translateY.value == null ? 0 : 1,
        transform: [
          {
            translateY: translateY.value == null ? 0 : translateY.value,
          },
        ],

        flex: 1,
        overflow: "visible",
        justifyContent: (() => {
          switch (align) {
            case "top":
              return "flex-start";
            case "center":
              return "center";
            default:
              return "flex-end";
          }
        })(),
      };
    });

    const backdropBackgroundColorWithoutAlpha = Color(
      style.get("color-gray-700").color
    ).hex();
    const backdropStyle = useAnimatedStyle(() => {
      let opacity = 0;
      if (layoutHeightShared.value != null && translateY.value != null) {
        opacity = interpolate(
          translateY.value,
          (() => {
            switch (align) {
              case "top":
                return [-layoutHeightShared.value, 0];
              case "center":
                return [
                  deviceSize.height / 2 + layoutHeightShared.value / 2,
                  0,
                ];
              default:
                return [layoutHeightShared.value, 0];
            }
          })(),
          [0, 1]
        );
      }

      let alphaHex = Math.floor(backgroundColorAlpha.value * opacity * 255)
        .toString(16)
        .toUpperCase();
      if (alphaHex.length === 1) {
        alphaHex = "0" + alphaHex;
      }
      const backdropBackgroundColor =
        backdropBackgroundColorWithoutAlpha + alphaHex;

      return {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: backdropBackgroundColor,
      };
    });

    const backdropTap = Gesture.Tap();
    backdropTap.onStart(() => {
      setIsOpen(false);
    });

    const el = React.createElement(modalState.element, modalState.props);

    return (
      <View
        style={style.flatten(["absolute-fill", "overflow-visible"])}
        pointerEvents="box-none"
      >
        <GestureDetector gesture={backdropTap}>
          <Reanimated.View style={backdropStyle} />
        </GestureDetector>
        <Reanimated.View style={viewStyle} pointerEvents="box-none">
          <View
            onLayout={(e) => {
              setLayoutHeight(e.nativeEvent.layout.height);
              layoutHeightShared.value = e.nativeEvent.layout.height;
            }}
          >
            {modalState.options.container
              ? React.createElement(
                  modalState.options.container,
                  modalState.options.containerProps,
                  el
                )
              : el}
          </View>
        </Reanimated.View>
      </View>
    );
  }
);
