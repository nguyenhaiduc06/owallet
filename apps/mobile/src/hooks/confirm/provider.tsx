import React, {
  FunctionComponent,
  PropsWithChildren,
  useMemo,
  useRef,
  useState,
} from "react";
import { ConfirmContext } from "./internal";
import { YAxis } from "../../components/axis";
import { Box } from "../../components/box";
import { Text } from "react-native";
import { useIntl } from "react-intl";
import { Button } from "../../components/button";
import { Gutter } from "../../components/gutter";
import { useStyle } from "../../styles";
import { useSharedValue, withTiming } from "react-native-reanimated";
import { Columns } from "../../components/column";
import { registerModal } from "@src/modals/base";
// import {registerConfirmModal} from '../../components/modal/confirm';

interface ConfirmData {
  id: string;
  detached: boolean;
  title: string;
  paragraph: string | React.ReactNode;
  options: {
    forceYes?: boolean;
    yesText?: string;
  };
  resolver: (value: boolean) => void;
}

export const ConfirmProvider: FunctionComponent<PropsWithChildren> = ({
  children,
}) => {
  const [confirm, setConfirm] = useState<ConfirmData>();
  const seqRef = useRef(0);
  const backgroundColor = useSharedValue(0);
  const [isOpen, setIsOpen] = useState(false);

  const confirmFn: (
    title: string,
    paragraph: string | React.ReactNode,
    options?: {
      forceYes?: boolean;
    }
  ) => Promise<boolean> = (title, paragraph, options = {}) => {
    return new Promise<boolean>((resolve) => {
      seqRef.current = seqRef.current + 1;
      setTimeout(() => {
        setIsOpen(true);
        backgroundColor.value = withTiming(1);
      }, 300);

      setConfirm({
        id: seqRef.current.toString(),
        detached: false,
        title,
        paragraph,
        options,
        resolver: resolve,
      });
    });
  };

  const confirmFnRef = useRef(confirmFn);
  confirmFnRef.current = confirmFn;
  return (
    <ConfirmContext.Provider
      value={useMemo(() => {
        return {
          confirm: confirmFnRef.current,
        };
      }, [])}
    >
      {children}
      <ConfirmModal
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        confirm={confirm}
        onClose={() => {
          confirm?.resolver(false);
          setIsOpen(false);
        }}
        onConfirm={() => {
          confirm?.resolver(true);
          setIsOpen(false);
        }}
      />
    </ConfirmContext.Provider>
  );
};

const ConfirmModal = registerModal(
  ({
    onClose,
    onConfirm,
    confirm,
  }: {
    onClose: () => void;
    onConfirm: () => void;
    confirm?: ConfirmData;
  }) => {
    const style = useStyle();
    const intl = useIntl();
    return (
      <Box
        backgroundColor={style.get("background-color-gray-600").backgroundColor}
        paddingX={20}
        paddingY={24}
        marginX={4}
        borderRadius={8}
      >
        <YAxis>
          {confirm?.title ? (
            <React.Fragment>
              <Text style={style.flatten(["h4", "color-text-high"])}>
                {confirm.title}
              </Text>
              <Gutter size={8} />
            </React.Fragment>
          ) : null}

          <Text style={style.flatten(["body1", "color-text-middle"])}>
            {confirm?.paragraph}
          </Text>

          <Gutter size={18} />
          <Columns sum={1}>
            {!confirm?.options.forceYes ? (
              <React.Fragment>
                <Button
                  size="large"
                  text={intl.formatMessage({
                    id: "hooks.confirm.cancel-button",
                  })}
                  containerStyle={style.flatten(["flex-1"])}
                  onPress={() => {
                    onClose();
                  }}
                  color="secondary"
                />
                <Gutter size={12} />
              </React.Fragment>
            ) : null}

            <Button
              size="large"
              text={
                confirm?.options.yesText ||
                intl.formatMessage({
                  id: "hooks.confirm.yes-button",
                })
              }
              containerStyle={style.flatten(["flex-1"])}
              onPress={() => {
                onConfirm();
              }}
            />
          </Columns>
        </YAxis>
      </Box>
    );
  }
);
